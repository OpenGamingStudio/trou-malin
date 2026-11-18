/**
 * Assets de Trou Malin, repris de la direction artistique de Taupe Tycoon : tout est dessiné ici en SVG,
 * aplats, contour encre #2b1d14 (3 px sur une grille de 48), une seule ombre par aplat, reflet blanc en petit trait.
 * Aucun dégradé. Palette = thème Tailwind (src/style.css) + quelques teintes d'ombre propres au dessin.
 */
export const C = {
  ink: '#2b1d14', fur: '#7b563c', furDark: '#5c3f2b', cream: '#f6dcb4', creamDark: '#dcb98a',
  pink: '#ff7aa8', gold: '#ffc21a', goldDark: '#d98f12', steel: '#c3cfd6', steelDark: '#8a9aa6',
  wood: '#c98a45', woodDark: '#8a5a2b', gem: '#20c5c0', gemDark: '#12908d', gemLight: '#8ff0ea',
  grass: '#4cc15a', grassDark: '#2f8f3c', denim: '#3b6fb6', denimDark: '#2a4f86', red: '#e8503a', white: '#ffffff',
  soil: '#8a5a2b', cave: '#3a2618',
};

const k = C.ink;
/** Contour standard d'une icône 48 : épaisseur w. */
const st = (w = 3) => `stroke="${k}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const shine = (d: string) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/>`;


/** Icônes 48×48. */
export const ICONS: Record<string, string> = {
  coin: `<circle cx="24" cy="24" r="17" fill="${C.gold}" ${st()}/><circle cx="24" cy="24" r="10.500" fill="${C.goldDark}" ${st(2.4)}/><path d="M24 17v14M20 20.500h6.500a2.500 2.500 0 010 5H21a2.500 2.500 0 000 5h7" fill="none" stroke="${C.gold}" stroke-width="2.600" stroke-linecap="round"/>${shine('M12 18c1.500-3 4-5 7-6')}`,
  gem: `<path d="M14 7h20l9 11-19 23L5 18z" fill="${C.gem}" ${st()}/><path d="M5 18h38M18 7l-4 11 10 23M30 7l4 11-10 23" fill="none" stroke="${C.gemDark}" stroke-width="2.600" stroke-linejoin="round" stroke-linecap="round"/>${shine('M12 17l4-7')}`,
  bomb: `<path d="M30 12l5-5M35 7l3-1M35 7l1 3" fill="none" ${st(3)}/><path d="M38 3v4M43 6l-3 2M33 4l2 3" stroke="${C.red}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="22" cy="28" r="16" fill="${C.ink}" ${st()}/><circle cx="22" cy="28" r="16" fill="#4a3a35"/><circle cx="22" cy="28" r="16" fill="none" ${st()}/><rect x="17" y="9" width="10" height="7" rx="2" fill="${C.steelDark}" ${st(2.600)}/>${shine('M12 25c1-4 4-7 8-8')}`,
  bear: `<path d="M4 34h40v6H4z" fill="${C.steelDark}" ${st()}/><path d="M6 34l3-14 4 11 4-14 4 14 4-14 4 14 4-11 3 14z" fill="${C.steel}" ${st(2.600)}/><circle cx="24" cy="38" r="2.400" fill="${C.red}" ${st(2)}/>${shine('M9 36h6')}`,
  water: `<path d="M24 5C16 16 10 22 10 30a14 14 0 0028 0c0-8-6-14-14-25z" fill="${C.denim}" ${st()}/><path d="M17 31c0 4 3 7 7 7" fill="none" stroke="${C.denimDark}" stroke-width="3" stroke-linecap="round"/>${shine('M16 24c1.500-3 3-5 5-7')}`,
  heart: `<path d="M24 41C8 30 5 21 7 15c2-6 11-7 17 0 6-7 15-6 17 0 2 6-1 15-17 26z" fill="${C.red}" ${st()}/>${shine('M12 16c1-2 3-3 5-3')}`,
  heartoff: `<path d="M24 41C8 30 5 21 7 15c2-6 11-7 17 0 6-7 15-6 17 0 2 6-1 15-17 26z" fill="#e2d6bd" ${st()}/>`,
  flag: `<path d="M13 43V6" ${st(8)} fill="none"/><path d="M13 43V6" stroke="${C.wood}" stroke-width="3.6" stroke-linecap="round"/><path d="M15 8l26 8-26 9z" fill="${C.red}" ${st()}/>${shine('M19 13l12 3.500')}`,
  nose: `<ellipse cx="24" cy="26" rx="17" ry="13" fill="${C.pink}" ${st()}/><circle cx="18" cy="26" r="3" fill="${k}"/><circle cx="30" cy="26" r="3" fill="${k}"/>${shine('M13 20c2-3 5-4 8-4')}<path d="M6 10l6 5M42 10l-6 5M24 4v7" fill="none" ${st(3)}/>`,
  sound: `<path d="M6 19h8l10-9v28l-10-9H6z" fill="${C.gold}" ${st()}/><path d="M31 17c4 4 4 10 0 14M36 12c7 7 7 17 0 24" fill="none" ${st()}/>`,
  mute: `<path d="M6 19h8l10-9v28l-10-9H6z" fill="#e2d6bd" ${st()}/><path d="M31 18l11 12M42 18L31 30" fill="none" ${st()}/>`,
  star: `<path d="M24 4l6 13 14 2-10 10 3 14-13-7-13 7 3-14L4 19l14-2z" fill="${C.gold}" ${st()}/>`,
};
export const icon = (id: string, cls = 'h-9 w-9 shrink-0') =>
  `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ICONS[id] ?? ''}</svg>`;

/** Monticule de terre (case fermée), viewBox 48. */
export const MOUND = `<path d="M3 42C5 28 13 20 24 20s19 8 21 22z" fill="${C.wood}" ${st()}/><path d="M3 42c1-6 3-10 7-14-3 5-4 9-3 14z" fill="${C.woodDark}"/><path d="M14 26c3-2 6-3 9-3" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.400" stroke-linecap="round"/><circle cx="35" cy="30" r="2.200" fill="${C.woodDark}" ${st(1.800)}/><circle cx="12" cy="36" r="1.800" fill="${C.woodDark}"/>`;
/** Trou creusé (case ouverte), viewBox 48. */
export const HOLE = `<ellipse cx="24" cy="30" rx="19" ry="11" fill="${C.woodDark}" ${st()}/><ellipse cx="24" cy="31" rx="14" ry="7.500" fill="${C.cave}"/>`;

/** Particules d'éclats de terre (viewBox 24). */
export const CHIPS = [
  `<path d="M3 15l4-9 8-3 6 8-3 9-9 3z" fill="${C.wood}" ${st(2.4)}/>`,
  `<path d="M2 12c0-6 5-9 10-9s9 4 9 9-4 9-9 9-10-3-10-9z" fill="${C.woodDark}" ${st(2.4)}/>`,
];

/** Taupe à lunettes et casque (viewBox 240), identique à Taupe Tycoon. */
export const MOLE = `
<g class="m-shadow"><ellipse cx="120" cy="218" rx="98" ry="17" fill="${C.cave}" stroke="${k}" stroke-width="5"/>
  <ellipse cx="120" cy="210" rx="82" ry="11" fill="${C.woodDark}"/><path d="M46 208c10 6 26 8 40 8M170 216c14-1 28-4 38-9" stroke="${C.wood}" stroke-width="4" stroke-linecap="round" fill="none"/></g>
<g class="m-body">
  <path d="M50 210c-6-62 20-102 70-102s76 40 70 102z" fill="${C.fur}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M84 210c-2-36 8-56 36-56s38 20 36 56z" fill="${C.cream}"/>
  <path d="M84 210v-48c0-8 6-12 12-12h48c6 0 12 4 12 12v48z" fill="${C.denim}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M92 166h56" stroke="${C.denimDark}" stroke-width="5" stroke-linecap="round"/>
  <path d="M96 150l-10-34M144 150l10-34" stroke="${k}" stroke-width="14" stroke-linecap="round"/><path d="M96 150l-10-34M144 150l10-34" stroke="${C.denim}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="98" cy="158" r="6" fill="${C.gold}" stroke="${k}" stroke-width="4"/><circle cx="142" cy="158" r="6" fill="${C.gold}" stroke="${k}" stroke-width="4"/>
  <rect x="104" y="176" width="32" height="20" rx="6" fill="${C.denimDark}" stroke="${k}" stroke-width="4"/>
  <!-- bras droit (côté droit de l'écran) posé sur la salopette -->
  <ellipse cx="182" cy="176" rx="15" ry="27" transform="rotate(-8 182 176)" fill="${C.fur}" stroke="${k}" stroke-width="5"/>
  <g fill="${C.cream}" stroke="${k}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M170 198l-1 11 6-6zM180 201l1 11 6-8zM190 197l3 10 3-8z"/></g>
</g>
<g class="m-head">
  <circle cx="76" cy="96" r="15" fill="${C.fur}" stroke="${k}" stroke-width="5"/><circle cx="76" cy="97" r="7" fill="${C.pink}"/>
  <circle cx="164" cy="96" r="15" fill="${C.fur}" stroke="${k}" stroke-width="5"/><circle cx="164" cy="97" r="7" fill="${C.pink}"/>
  <ellipse cx="120" cy="110" rx="52" ry="46" fill="${C.fur}" stroke="${k}" stroke-width="5"/>
  <ellipse cx="120" cy="132" rx="30" ry="21" fill="${C.cream}"/>
  <!-- casque de mineur -->
  <g class="m-hat">
    <path d="M72 84c-2-30 20-48 48-48s50 18 48 48z" fill="${C.gold}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M120 38v42M96 44v36M144 44v36" stroke="${C.goldDark}" stroke-width="5" stroke-linecap="round" fill="none"/>
    <rect x="62" y="80" width="116" height="14" rx="7" fill="${C.gold}" stroke="${k}" stroke-width="5"/>
    <path d="M70 90h100" stroke="${C.goldDark}" stroke-width="4" stroke-linecap="round"/>
    <path d="M86 52c4-6 10-10 18-11" stroke="#fff" stroke-opacity=".8" stroke-width="5" stroke-linecap="round" fill="none"/>
    <g class="m-lamp"><circle cx="120" cy="54" r="13" fill="#fff6c9" stroke="${k}" stroke-width="5"/><circle cx="120" cy="54" r="5" fill="${C.gold}"/></g>
  </g>
  <!-- lunettes rondes -->
  <circle cx="96" cy="112" r="19" fill="#fff" stroke="${k}" stroke-width="5.5"/>
  <circle cx="144" cy="112" r="19" fill="#fff" stroke="${k}" stroke-width="5.5"/>
  <path d="M114 110h12" stroke="${k}" stroke-width="5.5" stroke-linecap="round"/><path d="M77 108L66 104M163 108l11-4" stroke="${k}" stroke-width="5" stroke-linecap="round"/>
  <g class="m-eyes-open"><circle cx="98" cy="114" r="7" fill="${k}"/><circle cx="142" cy="114" r="7" fill="${k}"/><circle cx="101" cy="111" r="2.600" fill="#fff"/><circle cx="145" cy="111" r="2.600" fill="#fff"/></g>
  <g class="m-eyes-happy" fill="none" stroke="${k}" stroke-width="5.5" stroke-linecap="round"><path d="M86 116q10-14 20 0"/><path d="M134 116q10-14 20 0"/></g>
  <path d="M82 102c3-5 7-7 12-8" stroke="#8fd0ff" stroke-opacity=".9" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M130 102c3-5 7-7 12-8" stroke="#8fd0ff" stroke-opacity=".9" stroke-width="4" stroke-linecap="round" fill="none"/>
  <!-- museau -->
  <ellipse cx="120" cy="131" rx="14" ry="10" fill="${C.pink}" stroke="${k}" stroke-width="4.5"/><path d="M113 128c2-2 5-3 8-2" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round" fill="none"/>
  <g class="m-mouth-smile"><path d="M104 144q16 12 32 0" fill="none" stroke="${k}" stroke-width="4.5" stroke-linecap="round"/><rect x="113" y="148" width="6.500" height="9" rx="2" fill="#fff" stroke="${k}" stroke-width="3"/><rect x="121" y="148" width="6.500" height="9" rx="2" fill="#fff" stroke="${k}" stroke-width="3"/></g>
  <g class="m-mouth-open"><path d="M106 143q14 22 28 0z" fill="${C.cave}" stroke="${k}" stroke-width="4.5" stroke-linejoin="round"/><path d="M114 154q6 6 12 0" fill="${C.pink}"/></g>
  <g class="m-mouth-big"><path d="M100 142q20 26 40 0z" fill="${C.cave}" stroke="${k}" stroke-width="4.5" stroke-linejoin="round"/><path d="M110 156q10 8 20 0" fill="${C.pink}"/><rect x="108" y="143" width="9" height="7" rx="2" fill="#fff"/><rect x="123" y="143" width="9" height="7" rx="2" fill="#fff"/></g>
</g>
<!-- pelle tenue dans la MAIN GAUCHE (à gauche de l'écran) ; le bras fait partie du groupe pour suivre la pelle -->
<g class="m-shovel">
  <path d="M40 222L64 116" stroke="${k}" stroke-width="14" stroke-linecap="round"/><path d="M40 222L64 116" stroke="${C.wood}" stroke-width="7" stroke-linecap="round"/>
  <path d="M56 108h20" stroke="${k}" stroke-width="14" stroke-linecap="round"/><path d="M56 108h20" stroke="${C.woodDark}" stroke-width="7" stroke-linecap="round"/>
  <path d="M42 214c-18-3-26-14-22-28l38 8c4 12-4 22-16 20z" fill="${C.steel}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M30 196l22 5" stroke="${C.steelDark}" stroke-width="5" stroke-linecap="round"/><path d="M26 192c3-3 6-4 10-4" stroke="#fff" stroke-opacity=".8" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M42 196l10 6" stroke="${C.steelDark}" stroke-width="0"/>
  <ellipse cx="62" cy="146" rx="16" ry="19" transform="rotate(8 62 146)" fill="${C.fur}" stroke="${k}" stroke-width="5"/>
  <g fill="none" stroke="${k}" stroke-width="3.5" stroke-linecap="round"><path d="M70 136l-10 2M72 146l-11 1M70 156l-10-2"/></g>
  <g fill="${C.cream}" stroke="${k}" stroke-width="3" stroke-linejoin="round"><circle cx="50" cy="138" r="3.4"/><circle cx="48" cy="147" r="3.4"/><circle cx="50" cy="156" r="3.4"/></g>
</g>`;
