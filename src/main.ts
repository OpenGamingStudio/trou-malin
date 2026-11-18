import './style.css';
import { MOLE, MOUND, CHIPS, icon } from './art';
import * as game from './game';
import * as snd from './sound';
import { fmt } from './format';
import { VERSION } from './version';
import { loadBest, saveBest, loadOpts, saveOpts, mergeBest, type Best } from './save';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const rng = Math.random;

let st = game.newGame();
let best: Best = loadBest();
let opts = loadOpts();
let flagMode = false;
let busy = false;
let playing = false;
let lastTier = 0;

const boardEl = $('board'), fxEl = $('fx'), overlay = $('overlay'), moleBox = $('mole-box');
const TRAP_NAME: Record<string, string> = { bomb: 'Bombe', bear: 'Piège à ours', water: 'Flaque' };
const TRAP_SOUND: Record<string, () => void> = { bomb: snd.boom, bear: snd.snap, water: snd.splash };

$('mole-svg').innerHTML = MOLE;
snd.setEnabled(opts.sound);

function setHint(t: string) { $('hint').textContent = t; }
function mood(m: string, ms = 700) {
  moleBox.dataset.mood = m;
  window.setTimeout(() => { if (moleBox.dataset.mood === m) moleBox.dataset.mood = 'idle'; }, ms);
}

function cellLabel(i: number): string {
  const c = st.board.cells[i]!;
  const x = (i % st.board.cols) + 1, y = Math.floor(i / st.board.cols) + 1;
  const pos = `ligne ${y}, colonne ${x}`;
  if (!c.open) return `${pos} : ${c.flag ? 'drapeau posé' : 'monticule'}`;
  if (game.isTrap(c.kind)) return `${pos} : ${TRAP_NAME[c.kind]}`;
  const loot = c.kind === 'coin' ? ', pièce' : c.kind === 'gem' ? ', gemme' : '';
  return `${pos} : ${c.n} piège${c.n > 1 ? 's' : ''} voisin${c.n > 1 ? 's' : ''}${loot}`;
}

function paintCell(i: number, el: HTMLButtonElement) {
  const c = st.board.cells[i]!;
  el.className = 'cell' + (c.open ? ' open ' + (game.isTrap(c.kind) ? 'trap' : 'safe') + (c.kind === 'coin' || c.kind === 'gem' ? ' has-loot' : '') : '');
  el.setAttribute('aria-label', cellLabel(i));
  el.setAttribute('role', 'gridcell');
  let h = '';
  if (!c.open) {
    h = `<svg class="art" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${MOUND}</svg>`;
    if (c.flag) h += `<span class="flag">${icon('flag', '')}</span>`;
  } else if (game.isTrap(c.kind)) {
    h = icon(c.kind, 'art');
  } else {
    if (c.kind !== 'empty') h += icon(c.kind, 'loot');
    h += `<span class="num n${c.n}">${c.n > 0 ? c.n : ''}</span>`;
  }
  el.innerHTML = h;
}

function buildBoard() {
  const b = st.board;
  boardEl.textContent = '';
  boardEl.style.gridTemplateColumns = `repeat(${b.cols}, minmax(0, 1fr))`;
  boardEl.style.gridTemplateRows = `repeat(${b.rows}, minmax(0, 1fr))`;
  b.cells.forEach((_, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.dataset.i = String(i);
    paintCell(i, el);
    boardEl.appendChild(el);
  });
}
const cellEl = (i: number) => boardEl.children[i] as HTMLButtonElement;
const repaint = (i: number) => paintCell(i, cellEl(i));

function hud() {
  $('score').textContent = fmt(st.score);
  $('lvl').textContent = `Manche ${st.lvl}`;
  $('hearts').innerHTML = Array.from({ length: Math.max(game.START_LIVES, st.lives) }, (_, i) => icon(i < st.lives ? 'heart' : 'heartoff', 'heart')).join('');
  $('hearts').setAttribute('aria-label', `${st.lives} vie${st.lives > 1 ? 's' : ''}`);
  const left = game.safeLeft(st.board);
  const tc = fmt(st.board.trapCount);
  $('left').innerHTML = `<span class="sr-only">${st.board.placed ? `${left} cases à creuser, ` : ''}${tc} pièges</span><span aria-hidden="true" class="flex items-center gap-1">${st.board.placed ? `${fmt(left)} <span class="font-normal">·</span> ` : ''}${icon('bomb', 'h-5 w-5')}${tc}</span>`;
  const sn = $('sniff');
  sn.innerHTML = `${icon('nose', 'h-7 w-7')}<span>Flair ${st.sniffs}</span>`;
  sn.setAttribute('aria-disabled', String(st.sniffs <= 0 || !st.board.placed));
  const fm = $('flagmode');
  fm.innerHTML = `${icon('flag', 'h-7 w-7')}<span>Drapeau</span>`;
  fm.setAttribute('aria-pressed', String(flagMode));
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

function endGame() {
  playing = false;
  const m = mergeBest(best, st.score, st.lvl, st.bestCombo);
  best = m.best;
  saveBest(best);
  snd.gameOver();
  overlay.hidden = false;
  overlay.innerHTML = `<div class="panel"><h2 id="ov-title" class="logo text-4xl">Fin de partie</h2>
    <div class="mt-3 grid gap-2"><p class="stat"><span>Score</span><span>${fmt(st.score)}</span></p>
    <p class="stat"><span>Manche atteinte</span><span>${fmt(st.lvl)}</span></p>
    <p class="stat"><span>Meilleure série</span><span>${fmt(st.bestCombo)}</span></p>
    <p class="stat"><span>Record</span><span>${fmt(best.score)}</span></p></div>
    ${m.record ? '<p class="note mt-3 text-lg font-bold">Nouveau record !</p>' : ''}
    <button id="again" type="button" class="btn btn-big mt-3 w-full">Rejouer</button></div>`;
  $('again').addEventListener('click', start);
  ($('again') as HTMLButtonElement).focus();
}

function levelDone() {
  busy = true;
  snd.fanfare();
  mood('happy', 1200);
  const before = st.lives;
  const bonus = game.nextLevel(st);
  const finished = st.lvl - 1;
  window.setTimeout(() => {
    overlay.hidden = false;
    overlay.innerHTML = `<div class="panel"><h2 id="ov-title" class="logo text-4xl">Manche ${finished} réussie !</h2>
      <p class="mt-2 flex justify-center">${icon('star', 'h-16 w-16')}</p>
      <p class="stat mt-3"><span>Bonus</span><span>+${fmt(bonus)}</span></p>
      ${st.lives > before ? `<p class="note mt-2 text-lg font-bold">Une vie de plus !</p>` : ''}
      <button id="next" type="button" class="btn btn-big mt-3 w-full">Manche suivante</button></div>`;
    $('next').addEventListener('click', () => { overlay.hidden = true; busy = false; newRound(); });
    ($('next') as HTMLButtonElement).focus();
    saveBestLive();
  }, 900);
}

function saveBestLive() {
  const m = mergeBest(best, st.score, st.lvl, st.bestCombo);
  best = m.best;
  saveBest(best);
}

function newRound() {
  lastTier = 0;
  $('combo').hidden = true;
  buildBoard();
  hud();
  setHint(st.lvl === 1 ? 'Creuse un monticule : les chiffres comptent les pièges voisins.' : 'Creuse malin !');
}

function onDig(i: number) {
  if (busy || !playing) return;
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
    if (r.over) { busy = true; window.setTimeout(() => { busy = false; endGame(); }, 900); }
    return;
  }
  if (r.kind === 'gem') snd.gem(); else if (r.kind === 'coin') snd.pickup(st.combo); else snd.dig(st.combo);
  floatText(i, `+${fmt(r.gained)}`);
  setHint(r.kind === 'gem' ? 'Une gemme !' : r.kind === 'coin' ? 'Une pièce !' : cascadeHint(r.cascade.length));
  comboBadge();
  hud();
  if (r.cleared) levelDone();
}
const cascadeHint = (n: number) => (n > 0 ? 'Terrain dégagé !' : 'Bien creusé !');

function onFlag(i: number) {
  if (busy || !playing) return;
  if (game.toggleFlag(st, i)) { snd.tab(); repaint(i); }
}

function start() {
  snd.unlock();
  st = game.newGame();
  overlay.hidden = true;
  busy = false;
  playing = true;
  newRound();
}

function home() {
  overlay.hidden = false;
  overlay.innerHTML = `<div class="panel"><div class="mx-auto h-28 w-28"><svg viewBox="0 0 240 240" class="h-full w-full" aria-hidden="true" focusable="false">${MOLE}</svg></div>
    <h1 id="ov-title" class="logo text-5xl">Trou Malin</h1>
    <p class="mt-2 text-lg">Creuse au bon endroit : trésors à trouver, pièges à éviter. Le chiffre d'une case compte les pièges voisins.</p>
    <p class="mt-3 flex justify-center gap-4 text-lg font-bold"><span class="flex items-center gap-1">${icon('bomb', 'h-8 w-8')}${icon('bear', 'h-8 w-8')}${icon('water', 'h-8 w-8')}</span><span class="flex items-center gap-1">${icon('coin', 'h-8 w-8')}${icon('gem', 'h-8 w-8')}</span></p>
    ${best.score > 0 ? `<p class="stat mt-3"><span>Record</span><span>${fmt(best.score)}</span></p>` : ''}
    <button id="play" type="button" class="btn btn-big mt-3 w-full">Jouer</button>
    <p class="mt-3 text-sm font-bold">Version ${VERSION}</p></div>`;
  $('play').addEventListener('click', start);
  ($('play') as HTMLButtonElement).focus();
}

// --- interactions : tap = creuser (ou drapeau en mode drapeau), appui long ou clic droit = drapeau ---
let pressTimer = 0, longDone = false;
const idx = (t: EventTarget | null): number => { const b = (t as HTMLElement | null)?.closest<HTMLElement>('.cell'); return b ? Number(b.dataset.i) : -1; };
boardEl.addEventListener('pointerdown', (e) => {
  const i = idx(e.target); if (i < 0) return;
  snd.unlock();
  longDone = false;
  window.clearTimeout(pressTimer);
  pressTimer = window.setTimeout(() => { longDone = true; onFlag(i); }, 450);
});
const cancelPress = () => window.clearTimeout(pressTimer);
boardEl.addEventListener('pointerup', cancelPress);
boardEl.addEventListener('pointerleave', cancelPress);
boardEl.addEventListener('pointercancel', cancelPress);
boardEl.addEventListener('contextmenu', (e) => e.preventDefault());
boardEl.addEventListener('click', (e) => {
  const i = idx(e.target); if (i < 0) return;
  if (longDone) { longDone = false; return; }
  if (flagMode) onFlag(i); else onDig(i);
});

$('flagmode').addEventListener('click', () => { flagMode = !flagMode; snd.unlock(); snd.tab(); hud(); setHint(flagMode ? 'Mode drapeau : touche un monticule suspect.' : 'Mode pelle : creuse !'); });
$('sniff').addEventListener('click', () => {
  if (busy || !playing) return;
  snd.unlock();
  const i = game.sniff(st, rng);
  if (i < 0) { snd.deny(); setHint(st.sniffs <= 0 ? 'Plus de flair !' : 'Creuse d\'abord une case.'); return; }
  snd.sniff();
  repaint(i);
  cellEl(i).classList.add('sniffed');
  mood('happy', 600);
  setHint('La taupe flaire un piège !');
  hud();
});
$('snd').addEventListener('click', () => { opts = { sound: !opts.sound }; saveOpts(opts); snd.unlock(); snd.setEnabled(opts.sound); hud(); });
document.addEventListener('visibilitychange', () => snd.onVisibility(document.hidden));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

newRound();
home();
