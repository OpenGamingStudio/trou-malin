import './style.css';
import { MOLE, MOUND, CHIPS, icon, shapeSvg } from './art';
import * as game from './game';
import * as snd from './sound';
import { fmt } from './format';
import { VERSION } from './version';
import { RULE } from './rules';
import { STEPS, tutoAction } from './tuto';
import { loadProgress, saveProgress, loadOpts, saveOpts, mergeLevel, unlocked, totalStars } from './save';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const rng = Math.random;

let st = game.newLevel(1);
let prog = loadProgress();
let opts = loadOpts();
let mode: 'level' | 'tuto' = 'level';
let tutoI = 0;
let flagMode = false;
let busy = false;
let playing = false;
let lastTier = 0;

const boardEl = $('board'), fxEl = $('fx'), overlay = $('overlay'), moleBox = $('mole-box');
const VIEWS = { home: $('home'), map: $('map'), game: $('app') };
const TRAP_NAME: Record<string, string> = { bomb: 'Bombe', bear: 'Piège à ours', water: 'Flaque' };
const TRAP_SOUND: Record<string, () => void> = { bomb: snd.boom, bear: snd.snap, water: snd.splash };
/** La CSP interdit les attributs style dans le HTML : on écrit `data-s="prop:val;..."` puis on applique via le CSSOM. */
function applyStyles(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-s]').forEach((el) => {
    for (const d of el.dataset.s!.split(';')) { const k = d.indexOf(':'); if (k > 0) el.style.setProperty(d.slice(0, k), d.slice(k + 1)); }
    el.removeAttribute('data-s');
  });
}
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;

$('mole-svg').innerHTML = MOLE;
snd.setEnabled(opts.sound);

function setHint(t: string) { $('hint').textContent = t; }
function mood(m: string, ms = 700) {
  moleBox.dataset.mood = m;
  window.setTimeout(() => { if (moleBox.dataset.mood === m) moleBox.dataset.mood = 'idle'; }, ms);
}
let toastTimer = 0;
function toast(t: string) {
  const el = $('toast');
  el.textContent = t; el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.hidden = true; }, 1800);
}

// --- écrans et fenêtres ---
type View = keyof typeof VIEWS;
let view: View = 'home';
function show(v: View) {
  view = v;
  (Object.keys(VIEWS) as View[]).forEach((k) => {
    const el = VIEWS[k], on = k === v;
    el.hidden = !on;
    if (on) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
  });
  $('sky').hidden = v === 'map';
  overlay.hidden = true;
}
function modal(html: string, scroll = false) {
  overlay.hidden = false;
  overlay.innerHTML = `<div class="panel${scroll ? ' scroll' : ''}">${html}</div>`;
  applyStyles(overlay);
  const f = overlay.querySelector<HTMLElement>('[data-focus]') ?? overlay.querySelector<HTMLElement>('button');
  f?.focus();
}
const closeModal = () => { overlay.hidden = true; };
const on = (sel: string, fn: () => void) => overlay.querySelector(sel)?.addEventListener('click', fn);
const modalOpen = () => !overlay.hidden;
const starRow = (n: number, anim = false) => `<p class="sheet-stars" role="img" aria-label="${plural(n, 'étoile')} sur 3">${[0, 1, 2].map((i) => icon(i < n ? 'star' : 'staroff', anim && i < n ? 'pop-in' : '').replace('<svg class="pop-in"', `<svg class="pop-in" data-s="animation-delay:${0.25 * i + 0.2}s"`)).join('')}</p>`;

// --- plateau ---
function cellLabel(i: number): string {
  const c = st.board.cells[i]!;
  const x = (i % st.board.cols) + 1, y = Math.floor(i / st.board.cols) + 1;
  const pos = `ligne ${y}, colonne ${x}`;
  if (!c.open) return `${pos} : ${c.flag ? 'drapeau posé' : 'monticule'}`;
  if (game.isTrap(c.kind)) return `${pos} : ${TRAP_NAME[c.kind]}`;
  const loot = c.kind === 'coin' ? ', pièce' : c.kind === 'gem' ? ', gemme' : '';
  return `${pos} : ${plural(c.n, 'piège')} voisin${c.n > 1 ? 's' : ''}${loot}`;
}

const isTarget = (i: number) => mode === 'tuto' && STEPS[tutoI]?.cell === i && STEPS[tutoI]!.act !== 'free';

function paintCell(i: number, el: HTMLButtonElement) {
  const c = st.board.cells[i]!;
  el.className = 'cell' + (c.open ? ' open ' + (game.isTrap(c.kind) ? 'trap' : 'safe') + (c.kind === 'coin' ? ' has-coin' : c.kind === 'gem' ? ' has-gem' : '') : '') + (isTarget(i) ? ' target' : '');
  el.setAttribute('aria-label', cellLabel(i));
  el.setAttribute('role', 'gridcell');
  let h = '';
  if (!c.open) {
    h = `<svg class="art" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${MOUND}</svg>`;
    if (c.flag) h += `<span class="flag">${icon('flag', '')}</span>`;
  } else if (game.isTrap(c.kind)) {
    h = icon(c.kind, 'art');
  } else {
    // le chiffre est toujours le même élément, au même endroit ; le trésor n'est qu'un badge de coin
    h += `<span class="num n${c.n}">${c.n > 0 ? c.n : ''}</span>`;
    if (c.kind !== 'empty') h += icon(c.kind, 'loot');
  }
  el.innerHTML = h;
}

function buildBoard() {
  const b = st.board;
  boardEl.textContent = '';
  boardEl.style.setProperty('--cols', String(b.cols));
  boardEl.style.setProperty('--rows', String(b.rows));
  boardEl.style.gridTemplateColumns = `repeat(${b.cols}, minmax(0, 1fr))`;
  boardEl.style.gridTemplateRows = `repeat(${b.rows}, minmax(0, 1fr))`;
  boardEl.setAttribute('aria-label', `Plateau en forme de ${b.shape.name.toLowerCase()}`);
  b.cells.forEach((c, i) => {
    if (c.gone) {
      const v = document.createElement('span');
      v.className = 'void';
      v.setAttribute('aria-hidden', 'true');
      boardEl.appendChild(v);
      return;
    }
    const el = document.createElement('button');
    el.type = 'button';
    el.dataset.i = String(i);
    el.style.setProperty('--k', String(Math.min(i, 36)));
    paintCell(i, el);
    boardEl.appendChild(el);
  });
  boardEl.classList.add('fresh');
  window.setTimeout(() => boardEl.classList.remove('fresh'), 900);
}
const cellEl = (i: number) => boardEl.children[i] as HTMLButtonElement;
const repaint = (i: number) => paintCell(i, cellEl(i));

function goalHtml() {
  const b = st.board;
  const pct = b.ideal > 0 ? Math.min(100, Math.floor((st.score * 100) / b.ideal)) : 0;
  const t = game.starTargets(b);
  const got = (x: number) => b.placed && st.score >= x;
  const two = icon(got(t.two) ? 'star' : 'staroff', ''), three = icon(got(t.three) ? 'star' : 'staroff', '');
  const txt = b.placed
    ? `<span>${icon('star', '')}${icon('star', '')}${fmt(t.two)}</span><span>${icon('star', '')}${icon('star', '')}${icon('star', '')}${fmt(t.three)}</span>`
    : '<span>Objectifs : ?</span>';
  return `<div class="bar" role="img" aria-label="${b.placed ? `Objectifs : 2 étoiles à ${fmt(t.two)} points, 3 étoiles à ${fmt(t.three)} points` : 'Objectifs d\'étoiles connus après le premier coup'}"><i data-s="width:${pct}%"></i><b data-s="left:${Math.round(game.STAR2 * 100)}%">${two}</b><b data-s="left:${Math.round(game.STAR3 * 100)}%">${three}</b></div><p class="tgt" aria-hidden="true">${txt}</p>`;
}

function hud() {
  $('score').textContent = fmt(st.score);
  $('lvl').textContent = mode === 'tuto' ? 'Tuto' : `Niveau ${st.lvl}`;
  $('hearts').innerHTML = Array.from({ length: game.START_LIVES }, (_, i) => icon(i < st.lives ? 'heart' : 'heartoff', 'heart')).join('');
  $('hearts').setAttribute('aria-label', plural(st.lives, 'vie'));
  const left = game.safeLeft(st.board);
  const tc = fmt(st.board.trapCount);
  $('left').innerHTML = `<span class="sr-only">${st.board.placed ? `${left} cases à creuser, ` : ''}${tc} pièges</span><span aria-hidden="true" class="flex items-center gap-1">${st.board.placed ? `${fmt(left)} <span class="font-normal">·</span> ` : ''}${icon('bomb', 'h-5 w-5')}${tc}</span>`;
  $('goal').innerHTML = mode === 'tuto' ? '' : goalHtml();
  applyStyles($('goal'));
  $('goal').hidden = mode === 'tuto';
  const sn = $('sniff');
  sn.innerHTML = `${icon('nose', 'h-7 w-7')}<span>Flair ${st.sniffs}</span>`;
  sn.setAttribute('aria-disabled', String(st.sniffs <= 0 || !st.board.placed));
  const fm = $('flagmode');
  fm.innerHTML = `${icon('flag', 'h-7 w-7')}<span>Drapeau</span>`;
  fm.setAttribute('aria-pressed', String(flagMode));
  $('menu').innerHTML = `${icon('menu', 'h-7 w-7')}<span>Menu</span>`;
  const s = $('snd');
  s.innerHTML = icon(opts.sound ? 'sound' : 'mute', 'h-7 w-7');
  s.setAttribute('aria-pressed', String(opts.sound));
  s.setAttribute('aria-label', opts.sound ? 'Couper le son' : 'Activer le son');
}

function pos(i: number): { x: number; y: number } {
  const r = cellEl(i).getBoundingClientRect(), f = fxEl.getBoundingClientRect();
  return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
}
function floatText(i: number, text: string, color = '#ffc21a') {
  const { x, y } = pos(i);
  const el = document.createElement('span');
  el.className = 'float';
  el.textContent = text;
  el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.color = color;
  fxEl.appendChild(el);
  window.setTimeout(() => el.remove(), 950);
}
function shards(i: number, n = 6) {
  const { x, y } = pos(i);
  for (let k = 0; k < n; k++) {
    const el = document.createElement('span');
    el.className = 'shard';
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${CHIPS[k % CHIPS.length]}</svg>`;
    const a = (k / n) * Math.PI * 2 + Math.random(), d = 30 + Math.random() * 30;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    el.style.setProperty('--dy', `${Math.sin(a) * d - 10}px`);
    el.style.setProperty('--rot', `${Math.random() * 300 - 150}deg`);
    fxEl.appendChild(el);
    window.setTimeout(() => el.remove(), 650);
  }
}
function comboBadge() {
  const el = $('combo');
  if (st.combo < 2) { el.hidden = true; return; }
  el.hidden = false;
  const mult = game.multiplier(st.combo);
  el.textContent = mult > 1 ? `Série ${st.combo} · ×${mult}` : `Série ${st.combo}`;
  el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  const tier = game.multiplier(st.combo) - 1;
  if (tier > lastTier) snd.comboTier(tier);
  lastTier = tier;
}

// --- tuto ---
function coachUi() {
  const el = $('coach');
  const row = $('hint').parentElement!;
  if (mode !== 'tuto') { el.hidden = true; row.hidden = false; return; }
  row.hidden = true;
  const s = STEPS[tutoI]!;
  el.hidden = false;
  el.innerHTML = `<svg viewBox="0 0 240 240" class="h-11 w-11" aria-hidden="true" focusable="false">${MOLE}</svg><p aria-live="polite"><span class="step">Tuto ${tutoI + 1}/${STEPS.length}</span><br>${s.text}</p>
    <div class="acts">${s.act === 'ok' ? '<button id="coach-ok" type="button" class="btn btn-sm bg-grass">Compris</button>' : ''}<button id="coach-skip" type="button" class="btn btn-sm btn-ghost">Passer</button></div>`;
  $('coach-ok')?.addEventListener('click', () => { snd.tab(); tutoNext('ok'); });
  $('coach-skip').addEventListener('click', () => { snd.tab(); tutoEnd(false); });
}
function tutoNext(act: 'dig' | 'flag' | 'ok') {
  if (mode !== 'tuto' || STEPS[tutoI]?.act !== act) return;
  const old = STEPS[tutoI]!.cell;
  tutoI = Math.min(STEPS.length - 1, tutoI + 1);
  if (old !== undefined) repaint(old);
  const nw = STEPS[tutoI]!.cell;
  if (nw !== undefined && nw !== old) repaint(nw);
  coachUi();
}
function gate(i: number, act: 'dig' | 'flag'): boolean {
  if (mode !== 'tuto') return true;
  const s = STEPS[tutoI]!;
  if (s.act === 'free' || (s.act === act && s.cell === i)) return true;
  snd.deny();
  const el = $('coach');
  el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
  return false;
}
function tutoEnd(finished: boolean) {
  const first = !prog.tuto;
  prog.tuto = true;
  saveProgress(prog);
  mode = 'level';
  playing = false;
  if (!finished) { openMap(); return; }
  snd.fanfare();
  mood('happy', 1200);
  modal(`<h2 id="ov-title" class="logo text-4xl">Tuto réussi !</h2>
    <p class="mt-2 flex justify-center">${icon('star', 'h-16 w-16')}</p>
    <p class="mt-2 text-lg font-bold">${first ? 'Tu sais tout. Le niveau 1 t\'attend.' : 'Bien joué, la taupe est fière de toi.'}</p>
    <button id="go1" type="button" class="btn btn-big mt-3 w-full" data-focus>${first ? 'Niveau 1' : 'Carte'}</button>
    ${first ? '<button id="tomap" type="button" class="btn btn-ghost mt-2 w-full">Carte</button>' : ''}`);
  on('#go1', () => { if (first) startLevel(1); else openMap(); });
  on('#tomap', openMap);
}

// --- fin de niveau ---
function loseLevel() {
  playing = false;
  snd.gameOver();
  modal(`<h2 id="ov-title" class="logo text-4xl">Plus de vies !</h2>
    <p class="mt-2 text-lg font-bold">La taupe a besoin d'un nouvel essai.</p>
    <div class="mt-3 grid gap-2"><p class="stat"><span>Score</span><span>${fmt(st.score)}</span></p>
    <p class="stat"><span>Meilleure série</span><span>${fmt(st.bestCombo)}</span></p></div>
    <button id="retry" type="button" class="btn btn-big mt-3 w-full" data-focus>${icon('retry', 'h-7 w-7')}Réessayer</button>
    <button id="tomap" type="button" class="btn btn-ghost mt-2 w-full">Carte</button>`);
  on('#retry', () => (mode === 'tuto' ? startTuto() : startLevel(st.lvl)));
  on('#tomap', openMap);
}

function winLevel() {
  if (mode === 'tuto') { busy = true; window.setTimeout(() => { busy = false; tutoEnd(true); }, 700); return; }
  busy = true;
  snd.fanfare();
  mood('happy', 1200);
  const stars = game.starsFor(st.score, st.board);
  const rec = mergeLevel(prog, st.lvl, stars, st.score);
  saveProgress(prog);
  const t = game.starTargets(st.board);
  window.setTimeout(() => {
    busy = false;
    playing = false;
    modal(`<h2 id="ov-title" class="logo text-4xl">Niveau ${st.lvl} réussi !</h2>
      <div class="mt-2">${starRow(stars, true)}</div>
      <div class="mt-3 grid gap-2"><p class="stat"><span>Score</span><span>${fmt(st.score)}</span></p>
      <p class="stat"><span>Meilleure série</span><span>${fmt(st.bestCombo)}</span></p></div>
      <p class="mt-2 text-sm font-bold">${stars < 3 ? `${stars < 2 ? '2 étoiles' : '3 étoiles'} dès ${fmt(stars < 2 ? t.two : t.three)} points` : 'Score parfait !'}</p>
      ${rec.better && !rec.first ? '<p class="note mt-2 text-lg font-bold">Plus d\'étoiles qu\'avant !</p>' : ''}
      ${st.lvl < game.MAX_LEVEL ? '<button id="next" type="button" class="btn btn-big mt-3 w-full" data-focus>Niveau suivant</button>' : ''}
      <div class="mt-2 grid grid-cols-2 gap-2"><button id="again" type="button" class="btn btn-ghost">${icon('retry', 'h-6 w-6')}Rejouer</button><button id="tomap" type="button" class="btn btn-ghost">Carte</button></div>`);
    on('#next', () => startLevel(st.lvl + 1));
    on('#again', () => startLevel(st.lvl));
    on('#tomap', openMap);
  }, 900);
}

function begin() {
  closeModal();
  busy = false;
  playing = true;
  flagMode = false;
  lastTier = 0;
  $('combo').hidden = true;
  show('game');
  buildBoard();
  hud();
  coachUi();
  setHint(st.lvl === 1 ? 'Creuse un monticule : les chiffres comptent les pièges voisins.' : 'Creuse malin !');
  snd.unlock();
}
function startLevel(l: number) {
  if (l === 1 && !prog.tuto) { startTuto(); return; }
  mode = 'level';
  st = game.newLevel(l);
  begin();
}
function startTuto() {
  mode = 'tuto';
  tutoI = 0;
  st = game.newTuto();
  begin();
}

function onDig(i: number) {
  if (busy || !playing || modalOpen() || !gate(i, 'dig')) return;
  const r = game.dig(st, i, rng);
  if (r.type === 'ignored') { snd.deny(); return; }
  snd.unlock();
  mood('dig', 300);
  repaint(i);
  r.cascade.forEach(repaint);
  shards(i);
  if (r.type === 'trap') {
    TRAP_SOUND[r.kind]?.();
    mood('ouch', 700);
    boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake');
    floatText(i, '-1 vie', '#ff7aa8');
    setHint(`Aïe ! ${TRAP_NAME[r.kind]} !`);
    $('combo').hidden = true; lastTier = 0;
    if (navigator.vibrate) navigator.vibrate(120);
    hud();
    if (r.over) { busy = true; window.setTimeout(() => { busy = false; loseLevel(); }, 900); }
    return;
  }
  if (r.kind === 'gem') snd.gem(); else if (r.kind === 'coin') snd.pickup(st.combo); else snd.dig(st.combo);
  floatText(i, `+${fmt(r.gained)}`);
  setHint(r.kind === 'gem' ? `Une gemme ! +${game.POINTS.gem} points de base` : r.kind === 'coin' ? `Une pièce ! +${game.POINTS.coin} points de base` : cascadeHint(r.cascade.length));
  comboBadge();
  hud();
  tutoNext('dig');
  if (r.cleared) winLevel();
}
const cascadeHint = (n: number) => (n > 0 ? 'Terrain dégagé !' : 'Bien creusé !');

function onFlag(i: number) {
  if (busy || !playing || modalOpen() || !gate(i, 'flag')) return;
  if (game.toggleFlag(st, i)) { snd.tab(); repaint(i); tutoNext('flag'); if (mode === 'tuto' && flagMode) { flagMode = false; hud(); } }
}

// --- accueil, carte, aide ---
function renderHome() {
  const cur = unlocked(prog), stars = totalStars(prog);
  $('home').innerHTML = `<div class="panel"><div class="mx-auto h-28 w-28"><svg viewBox="0 0 240 240" class="h-full w-full" aria-hidden="true" focusable="false">${MOLE}</svg></div>
    <h1 id="ov-title" class="logo logo-big">Trou Malin</h1>
    <p class="mt-2 text-lg">Creuse au bon endroit : trésors à trouver, pièges à éviter !</p>
    <p class="mt-3 flex justify-center gap-4"><span class="flex items-center gap-1">${icon('bomb', 'h-8 w-8')}${icon('bear', 'h-8 w-8')}${icon('water', 'h-8 w-8')}</span><span class="flex items-center gap-1">${icon('coin', 'h-8 w-8')}${icon('gem', 'h-8 w-8')}</span></p>
    ${stars > 0 ? `<p class="stat mt-3"><span class="flex items-center gap-1">${icon('star', 'h-6 w-6')}Étoiles</span><span>${fmt(stars)}</span></p>` : ''}
    <button id="play" type="button" class="btn btn-big mt-3 w-full">${icon('play', 'h-7 w-7')}${cur > 1 ? `Niveau ${cur}` : 'Jouer'}</button>
    <div class="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"><button id="maps" type="button" class="btn btn-ghost">Niveaux</button><button id="howto" type="button" class="btn btn-ghost" aria-label="Comment jouer">${icon('help', 'h-7 w-7')}</button><button id="snd2" type="button" class="btn btn-ghost" aria-pressed="${opts.sound}" aria-label="${opts.sound ? 'Couper le son' : 'Activer le son'}">${icon(opts.sound ? 'sound' : 'mute', 'h-7 w-7')}</button></div>
    <p class="mt-3 text-sm font-bold">Version ${VERSION}</p></div>`;
  $('play').addEventListener('click', () => { snd.unlock(); startLevel(cur); });
  $('maps').addEventListener('click', () => { snd.unlock(); openMap(); });
  $('howto').addEventListener('click', () => { snd.unlock(); helpModal(); });
  $('snd2').addEventListener('click', toggleSound);
  ($('play') as HTMLButtonElement).focus();
}
function openHome() { playing = false; renderHome(); show('home'); }

const ROW = 96, PAD = 84, WG = 70;
const xOf = (l: number) => 50 + 28 * Math.sin((l - 1) * 0.95);
function renderMap() {
  const cur = unlocked(prog);
  const count = game.MAX_LEVEL;
  const H = count * ROW + PAD * 2 + (game.WORLDS.length - 1) * WG + 30;
  const yOf = (l: number) => H - PAD - (l - 1) * ROW - game.worldOf(l) * WG;
  const seg = (l: number) => { const h = (yOf(l) - yOf(l + 1)) / 2; return `C ${xOf(l).toFixed(1)} ${yOf(l) - h} ${xOf(l + 1).toFixed(1)} ${yOf(l + 1) + h} ${xOf(l + 1).toFixed(1)} ${yOf(l + 1)}`; };
  const path = (to: number) => { let d = `M ${xOf(1).toFixed(1)} ${yOf(1)}`; for (let l = 1; l < to; l++) d += ' ' + seg(l); return d; };
  let nodes = '', deco = '';
  for (let l = 1; l <= count; l++) {
    const rec = prog.levels[l];
    const state = rec ? 'done' : l === cur ? 'cur' : 'lock';
    const label = rec ? `Niveau ${l}, ${plural(rec.stars, 'étoile')}` : l === cur ? `Niveau ${l}, à jouer` : `Niveau ${l}, verrouillé`;
    const inner = state === 'done'
      ? `${l}<span class="stars">${[0, 1, 2].map((k) => icon(k < rec!.stars ? 'star' : 'staroff', '')).join('')}</span>`
      : state === 'cur' ? `${l}<svg class="you" viewBox="0 0 240 240" aria-hidden="true" focusable="false">${MOLE}</svg>`
      : `${l}<span class="lk">${icon('lock', '')}</span>`;
    nodes += `<button type="button" class="node ${state}" data-l="${l}" data-s="left:${xOf(l).toFixed(1)}%;top:${yOf(l)}px" aria-label="${label}"${state === 'lock' ? ' aria-disabled="true"' : ''}>${inner}</button>`;
    if (l % game.WORLD_SIZE === 1) {
      const w = game.worldOf(l), got = Object.entries(prog.levels).filter(([k]) => game.worldOf(Number(k)) === w).reduce((a, [, r]) => a + r.stars, 0);
      const open = l <= cur;
      nodes += `<div class="world-banner${open ? '' : ' off'}" data-w="${w}" data-s="top:${yOf(l) + ROW / 2 + WG / 2 - 8}px"><span class="wn">Monde ${w + 1}</span><span class="wt">${game.WORLDS[w]}</span><span class="wc">${open ? icon('star', '') + got + '/' + game.WORLD_SIZE * 3 : icon('lock', '')}</span></div>`;
    }
    if (l % 2 === 0) deco += `<svg class="deco" viewBox="0 0 48 48" data-s="left:${xOf(l) > 50 ? 12 : 88}%;top:${yOf(l) + ROW / 2}px" aria-hidden="true" focusable="false">${MOUND}</svg>`;
  }
  $('map').innerHTML = `<div class="map-bar"><button id="map-back" type="button" class="btn btn-icon" aria-label="Accueil">${icon('back', 'h-7 w-7')}</button>
    <button id="w-prev" type="button" class="btn btn-icon" aria-label="Monde précédent"><svg class="h-7 w-7" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <h2 class="logo" id="w-name" aria-live="polite">Monde 1</h2>
    <button id="w-next" type="button" class="btn btn-icon" aria-label="Monde suivant"><span class="flip"><svg class="h-7 w-7" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button><span class="chip">${icon('star', '')}${fmt(totalStars(prog))}</span></div>
    <div class="map-world" data-s="height:${H}px">${deco}<svg class="trail" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${path(count)}" stroke="#2b1d14" stroke-width="22"/><path d="${path(count)}" stroke="#fff0c4" stroke-width="14"/><path d="${path(Math.min(count, cur))}" stroke="#ffc21a" stroke-width="14"/></svg>${nodes}</div>`;
  applyStyles($('map'));
  $('map-back').addEventListener('click', () => { snd.tab(); openHome(); });
  $('map').querySelectorAll<HTMLElement>('.node').forEach((n) => n.addEventListener('click', () => {
    snd.unlock();
    const l = Number(n.dataset.l);
    if (l > unlocked(prog)) { snd.deny(); toast(`Termine d'abord le niveau ${unlocked(prog)}`); n.classList.remove('nope'); void n.offsetWidth; n.classList.add('nope'); return; }
    snd.tab();
    levelSheet(l);
  }));
  const m = $('map');
  const firstY = (w: number) => yOf(w * game.WORLD_SIZE + 1);
  const worldNow = () => {
    const mid = m.scrollTop + m.clientHeight / 2 + 40;
    let best = 0;
    for (let w = 0; w < game.WORLDS.length; w++) if (firstY(w) + WG >= mid) best = w;
    return best;
  };
  const label = () => { const w = worldNow(); $('w-name').textContent = `Monde ${w + 1}`; };
  const jump = (dir: number) => {
    snd.tab();
    const w = Math.max(0, Math.min(game.WORLDS.length - 1, worldNow() + dir));
    m.scrollTo({ top: Math.max(0, firstY(w) - m.clientHeight / 2 - ROW / 2 + 60), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  $('w-prev').addEventListener('click', () => jump(-1));
  $('w-next').addEventListener('click', () => jump(1));
  m.onscroll = label;
  return yOf(cur);
}
function openMap() {
  playing = false;
  const y = renderMap();
  show('map');
  const m = $('map');
  m.scrollTop = Math.max(0, y - m.clientHeight / 2);
  m.dispatchEvent(new Event('scroll'));
}

function levelSheet(l: number) {
  const s = game.levelSpec(l), rec = prog.levels[l];
  modal(`<h2 id="ov-title" class="logo text-4xl">Niveau ${l}</h2>
    <p class="mt-1 text-sm font-bold">Monde ${game.worldOf(l) + 1} · ${game.WORLDS[game.worldOf(l)]}</p>
    <p class="text-xl font-bold">${s.shape.name}</p>
    <div class="mt-2 flex justify-center">${shapeSvg(s.shape.rows)}</div>
    <div class="mt-2">${starRow(rec?.stars ?? 0)}</div>
    <p class="mt-2 text-base font-bold">${plural(s.cells, 'case')} · ${plural(s.traps, 'piège')} · ${plural(game.START_LIVES, 'vie')}</p>
    ${rec ? `<p class="text-sm font-bold">Meilleur score : ${fmt(rec.score)}</p>` : ''}
    ${s.intro ? `<p class="note mt-2 text-base font-bold">Nouveau : ${s.intro.toLowerCase()} !</p>` : ''}
    ${l === 1 && !prog.tuto ? '<p class="note mt-2 text-base font-bold">Un mini tuto t\'attend.</p>' : ''}
    <button id="go" type="button" class="btn btn-big mt-3 w-full" data-focus>${icon('play', 'h-7 w-7')}Jouer</button>
    <button id="close" type="button" class="btn btn-ghost mt-2 w-full">Fermer</button>`);
  on('#go', () => startLevel(l));
  on('#close', closeModal);
}

function helpModal() {
  const demo = (n: number) => `<span class="demo n${n}">${n}</span>`;
  const li = (ic: string, t: string) => `<li>${ic}<span>${t}</span></li>`;
  modal(`<h2 id="ov-title" class="logo text-4xl">Comment jouer</h2>
    <ul class="legend mt-3">
      ${li(`<svg viewBox="0 0 48 48" aria-hidden="true">${MOUND}</svg>`, RULE.dig)}
      ${li(demo(2), RULE.number)}
      ${li(icon('flag', ''), RULE.flag)}
      ${li(`${icon('bomb', '')}`, RULE.traps)}
      ${li(icon('coin', ''), RULE.points)}
      ${li(icon('gem', ''), RULE.loot)}
      ${li(icon('star', ''), RULE.stars)}
      ${li(icon('nose', ''), RULE.flair)}
      ${li(icon('heart', ''), RULE.series)}
    </ul>
    <button id="close" type="button" class="btn btn-big mt-3 w-full" data-focus>${view === 'game' ? 'Reprendre' : 'Compris'}</button>
    <button id="tuto" type="button" class="btn btn-ghost mt-2 w-full">Refaire le tuto</button>`, true);
  on('#close', closeModal);
  on('#tuto', startTuto);
}

function pauseModal() {
  modal(`<h2 id="ov-title" class="logo text-4xl">Pause</h2>
    <button id="resume" type="button" class="btn btn-big mt-3 w-full" data-focus>${icon('play', 'h-7 w-7')}Reprendre</button>
    <div class="mt-2 grid gap-2"><button id="restart" type="button" class="btn btn-ghost">${icon('retry', 'h-6 w-6')}Recommencer</button>
    <button id="help" type="button" class="btn btn-ghost">${icon('help', 'h-6 w-6')}Comment jouer</button>
    <button id="tomap" type="button" class="btn btn-ghost">${mode === 'tuto' ? 'Quitter le tuto' : 'Carte des niveaux'}</button></div>`);
  on('#resume', closeModal);
  on('#restart', () => (mode === 'tuto' ? startTuto() : startLevel(st.lvl)));
  on('#help', helpModal);
  on('#tomap', () => (mode === 'tuto' ? tutoEnd(false) : openMap()));
}

function toggleSound() {
  opts = { sound: !opts.sound };
  saveOpts(opts); snd.unlock(); snd.setEnabled(opts.sound);
  hud();
  if (view === 'home') renderHome();
}

// --- interactions : tap = creuser (ou drapeau en mode drapeau), appui long ou clic droit = drapeau ---
let pressTimer = 0, longDone = false;
const idx = (t: EventTarget | null): number => { const b = (t as HTMLElement | null)?.closest<HTMLElement>('.cell'); return b ? Number(b.dataset.i) : -1; };
boardEl.addEventListener('pointerdown', (e) => {
  const i = idx(e.target); if (i < 0) return;
  snd.unlock();
  longDone = false;
  window.clearTimeout(pressTimer);
  pressTimer = window.setTimeout(() => { longDone = true; act(i, true); }, 450);
});
const act = (i: number, long: boolean) => {
  const a = tutoAction(mode === 'tuto' ? STEPS[tutoI] : undefined, i, flagMode, long);
  if (a === 'flag') onFlag(i); else onDig(i);
};
const cancelPress = () => window.clearTimeout(pressTimer);
boardEl.addEventListener('pointerup', cancelPress);
boardEl.addEventListener('pointerleave', cancelPress);
boardEl.addEventListener('pointercancel', cancelPress);
boardEl.addEventListener('contextmenu', (e) => e.preventDefault());
boardEl.addEventListener('click', (e) => {
  const i = idx(e.target); if (i < 0) return;
  if (longDone) { longDone = false; return; }
  act(i, false);
});

$('flagmode').addEventListener('click', () => { flagMode = !flagMode; snd.unlock(); snd.tab(); hud(); setHint(flagMode ? 'Mode drapeau : touche un monticule suspect.' : 'Mode pelle : creuse !'); });
$('sniff').addEventListener('click', () => {
  if (busy || !playing || modalOpen()) return;
  snd.unlock();
  if (mode === 'tuto' && STEPS[tutoI]!.act !== 'free') { gate(-1, 'dig'); return; }
  const i = game.sniff(st, rng);
  if (i < 0) { snd.deny(); setHint(st.sniffs <= 0 ? 'Plus de flair !' : 'Creuse d\'abord une case.'); return; }
  snd.sniff();
  repaint(i);
  cellEl(i).classList.add('sniffed');
  mood('happy', 600);
  setHint('La taupe flaire un piège !');
  hud();
});
$('menu').addEventListener('click', () => { if (busy || !playing) return; snd.unlock(); snd.tab(); pauseModal(); });
$('snd').addEventListener('click', toggleSound);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalOpen()) { overlay.querySelector<HTMLElement>('#close, #resume')?.click(); return; }
  if (view === 'game' && playing) pauseModal();
});
document.addEventListener('visibilitychange', () => snd.onVisibility(document.hidden));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

openHome();
