/**
 * Sons synthétisés (Web Audio, aucun fichier), repris de Taupe Tycoon. Rien ne sonne avant la première interaction
 * (`unlock()`), tout est muet quand `enabled` est faux.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
export let enabled = true;
const volume = 0.6;

export const setEnabled = (v: boolean) => { enabled = v; if (master && ctx) master.gain.setTargetAtTime(v ? volume * volume : 0, ctx.currentTime, 0.02); };

/** À appeler depuis un geste (clic, touche) : crée le contexte audio, jamais avant. */
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended' && !document.hidden) void ctx.resume(); return; }
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = enabled ? volume * volume : 0;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    const n = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, n, n);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    void ctx.resume();
  } catch { ctx = null; }
}
export function onVisibility(hidden: boolean) {
  if (!ctx) return;
  if (hidden) void ctx.suspend(); else if (enabled) void ctx.resume();
}

function ac(): AudioContext | null {
  if (!enabled || !ctx || !master || ctx.state !== 'running') return null;
  return ctx;
}
const jitter = (spread: number) => 1 + (Math.random() * 2 - 1) * spread; // variation aléatoire de hauteur

function tone(a: AudioContext, freq: number, end: number, dur: number, type: OscillatorType, vol: number, delay = 0, bus?: GainNode) {
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus ?? sfxBus!);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
/** Souffle de bruit filtré (gravier, vent, craquement). */
function noise(a: AudioContext, type: BiquadFilterType, freq: number, endFreq: number, dur: number, vol: number, delay = 0, q = 1, bus?: GainNode) {
  const t0 = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus ?? sfxBus!);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

let lastDig = 0;
/**
 * Coup de pelle : trois sons au hasard (choc sourd, grattement, tintement de pierre), hauteur variable, plus aiguë
 * quand les coups s'enchaînent (combo) ; de temps en temps une pierre précieuse tinte.
 */
export function dig(step = 0) {
  const a = ac(); if (!a) return;
  const now = performance.now();
  if (now - lastDig < 40) return;
  lastDig = now;
  const f = (130 + Math.min(step, 12) * 11) * jitter(0.15);
  const r = Math.random();
  if (r < 0.4) {
    tone(a, f * 1.9, f * 0.55, 0.12, 'triangle', 0.3);
    noise(a, 'bandpass', 1800 * jitter(0.25), 500, 0.09, 0.22, 0, 1.2);
  } else if (r < 0.75) {
    noise(a, 'highpass', 900 * jitter(0.2), 3200, 0.11, 0.2, 0, 0.8);
    tone(a, f * 1.4, f * 0.7, 0.09, 'triangle', 0.18);
  } else {
    tone(a, f * 1.6, f * 0.6, 0.08, 'triangle', 0.22);
    tone(a, 1500 * jitter(0.2), 1200, 0.16, 'sine', 0.09, 0.01);
    noise(a, 'bandpass', 3000, 1800, 0.05, 0.1, 0, 2);
  }
  if (step > 0 && step % 5 === 0) tone(a, 700 * jitter(0.05), 1100, 0.08, 'sine', 0.06, 0.03);
  if (Math.random() < 0.1) tone(a, 2093 * jitter(0.04), 2093, 0.2, 'sine', 0.07, 0.04);
}
const PENTA = [0, 2, 4, 7, 9];
/** Trésor : gamme montante selon la série. */
export function pickup(i = 0) {
  const a = ac(); if (!a) return;
  const n = Math.min(i, 14);
  const fr = 659 * Math.pow(2, (PENTA[n % 5]! + 12 * Math.floor(n / 5)) / 12);
  tone(a, fr, fr, 0.14, 'triangle', 0.14);
  tone(a, fr * 2, fr * 2, 0.1, 'sine', 0.04);
}
/** Gemme : petit arpège brillant. */
export function gem() {
  const a = ac(); if (!a) return;
  [1175, 1568, 2093].forEach((f, i) => tone(a, f, f, 0.18, 'triangle', 0.12, i * 0.06));
}
/** Manche réussie. */
export function fanfare() {
  const a = ac(); if (!a) return;
  [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32], [784, 0.46], [1047, 0.56], [1319, 0.68]].forEach(([f, t], i, all) => {
    const long = i === all.length - 1 ? 0.5 : 0.16;
    tone(a, f!, f!, long, 'sawtooth', 0.07, t);
    tone(a, f! * 2, f! * 2, long * 0.7, 'sine', 0.04, t);
  });
}
/** Palier de série. */
export function comboTier(tier: number) {
  const a = ac(); if (!a) return;
  const base = 440 * Math.pow(2, Math.min(tier, 4) * 2 / 12);
  [0, 4, 7, 12].slice(0, 2 + Math.min(tier, 2)).forEach((s, i) => tone(a, base * Math.pow(2, s / 12), base * Math.pow(2, s / 12), 0.2, 'triangle', 0.13, i * 0.05));
}
/** Bombe : grondement + éclat. */
export function boom() {
  const a = ac(); if (!a) return;
  noise(a, 'lowpass', 1800, 90, 0.5, 0.45, 0, 0.8);
  tone(a, 160, 40, 0.45, 'sine', 0.35);
}
/** Piège à ours : claquement métallique. */
export function snap() {
  const a = ac(); if (!a) return;
  noise(a, 'highpass', 2500, 6000, 0.08, 0.3, 0, 1.5);
  tone(a, 900, 300, 0.12, 'square', 0.1);
  tone(a, 140, 90, 0.2, 'square', 0.1, 0.06);
}
/** Flaque : plouf. */
export function splash() {
  const a = ac(); if (!a) return;
  tone(a, 300, 900, 0.18, 'sine', 0.2);
  noise(a, 'bandpass', 1200, 400, 0.3, 0.2, 0.05, 1);
}
/** Flair de la taupe : deux reniflements. */
export function sniff() {
  const a = ac(); if (!a) return;
  [0, 0.14].forEach((d) => noise(a, 'bandpass', 2400, 3600, 0.1, 0.16, d, 3));
  tone(a, 520, 780, 0.2, 'triangle', 0.1, 0.3);
}
/** Game over : trois notes qui descendent. */
export function gameOver() {
  const a = ac(); if (!a) return;
  [392, 311, 233].forEach((f, i) => tone(a, f, f * 0.95, 0.3, 'triangle', 0.16, i * 0.2));
}
export function deny() {
  const a = ac(); if (!a) return;
  tone(a, 190 * jitter(0.05), 150, 0.09, 'square', 0.08);
}
export function tab() {
  const a = ac(); if (!a) return;
  tone(a, 440 * jitter(0.03), 520, 0.06, 'triangle', 0.08);
}
