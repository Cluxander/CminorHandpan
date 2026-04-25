import { RING_RADII } from "../constants/handpan.js";

export function midiToFreq(midi, a4 = 440) {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function getSnapAngles(count, rotation = 0) {
  return Array.from({ length: count }, (_, i) => ((360 / count) * i + rotation + 360) % 360);
}

export function snapToSlot(angle, slots) {
  return slots.reduce((best, a) => {
    const d  = Math.abs(((angle - a + 540) % 360) - 180);
    const bd = Math.abs(((angle - best + 540) % 360) - 180);
    return d < bd ? a : best;
  }, slots[0] ?? 0);
}

// Parse legacy position string "angle:ringIdx" or "ding"
export function parsePos(posStr) {
  if (!posStr) return { isDing: true };
  const parts = String(posStr).split(":");
  if (parts[0] === "ding" || parts[0] === "big-ding" || parts[0] === "small-ding")
    return { isDing: true };
  return { isDing: false, angle: parseFloat(parts[0]) || 0, ringIdx: parseInt(parts[1] || 0) };
}

// Parse new position format "angle:ringIdx:side" | "ding:0:upper"
export function parsePosV2(posStr, fallbackSide = "upper") {
  if (!posStr) return { isDing: true, side: fallbackSide };
  const parts = String(posStr).split(":");
  if (parts[0] === "ding" || parts[0] === "big-ding" || parts[0] === "small-ding")
    return { isDing: true, side: parts[2] || fallbackSide };
  return {
    isDing:  false,
    angle:   parseFloat(parts[0]) || 0,
    ringIdx: parseInt(parts[1] || 0),
    side:    parts[2] || fallbackSide,
  };
}

// Build positions map from build notes array
export function buildPosMap(buildNotes) {
  const m = {};
  buildNotes.forEach(n => {
    const atCenter = (n.pos === "ding" || n.ringIdx == null || n.ringIdx === -1) && n.angle == null;
    m[n.name] = atCenter
      ? `ding:0:${n.side || "upper"}`
      : `${n.angle ?? 0}:${n.ringIdx ?? 0}:${n.side || "upper"}`;
  });
  return m;
}

export { RING_RADII };
