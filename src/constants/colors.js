import { SEMITONE_NAMES } from "./handpan.js";

export const FONT = "'Outfit', 'Space Grotesk', system-ui, sans-serif";

// ── Per-note colours for the C Minor handpan ─────────────────────
export const NOTE_COLOR_MAP = {
  "C3":"#e8c97a","C4":"#e8c97a","D4":"#7ec8a0",
  "Eb4":"#88aaee","F4":"#e88888","G4":"#c0a0e0",
  "Ab4":"#f0b870","C5":"#e8d4a0","D5":"#8ecfa8",
};

// Palette by semitone — guarantees a colour for any note name
export const SEMITONE_PALETTE = [
  "#e8c97a","#d4a8d0","#7ec8a0","#88aaee","#e8a870","#e88888",
  "#c8e870","#c0a0e0","#f0b870","#70c8c8","#aad4a8","#d0c0e0",
];

export function NOTE_COLOR(name) {
  if (NOTE_COLOR_MAP[name]) return NOTE_COLOR_MAP[name];
  const semi = SEMITONE_NAMES.indexOf(name.replace(/\d/,""));
  return SEMITONE_PALETTE[semi >= 0 ? semi : 0];
}

// ── Static C Minor note positions (for HandpanDiagram fallback) ──
export const CX = 150, CY = 150, RING_R = 90;

export function polar(deg, r = RING_R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: +(CX + r * Math.cos(rad)).toFixed(2), y: +(CY + r * Math.sin(rad)).toFixed(2) };
}

export const NOTE_POS = {
  "C3":  { x:CX, y:CY, r:36, isDing:true },
  "C5":  { ...polar(22.5),  r:24 },
  "G4":  { ...polar(67.5),  r:24 },
  "Eb4": { ...polar(112.5), r:24 },
  "C4":  { ...polar(157.5), r:24 },
  "D4":  { ...polar(202.5), r:24 },
  "F4":  { ...polar(247.5), r:24 },
  "Ab4": { ...polar(292.5), r:24 },
  "D5":  { ...polar(337.5), r:24 },
};

export const RING_ORDER = ["C5","G4","Eb4","C4","D4","F4","Ab4","D5"];
