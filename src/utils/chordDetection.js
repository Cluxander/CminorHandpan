import { TEMPLATES_FINAL, CAT_ORDER } from "../constants/chords.js";
import { HANDPAN } from "../constants/handpan.js";

export function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [h, ...t] = arr;
  return [...combinations(t, k-1).map(c=>[h,...c]), ...combinations(t, k)];
}

export function detectChords(noteList) {
  const results = [];

  for (let size = 2; size <= Math.min(5, noteList.length); size++) {
    for (const combo of combinations(noteList, size)) {
      const sorted = [...combo].sort((a, b) => a.midi - b.midi);

      // Unique pitch classes present in this combination (0–11, sorted).
      // Using pitch classes instead of raw MIDI values means octave doublings
      // are transparent to template matching: C3+Eb4+G4+C5 → {0,3,7} → Minor,
      // just like C3+Eb4+G4 → {0,3,7} → Minor, but with noteCount = 4.
      const uniquePCs = [...new Set(sorted.map(n => ((n.midi % 12) + 12) % 12))]
        .sort((a, b) => a - b);

      if (uniquePCs.length < 2) {
        // All notes are the same pitch class (e.g. C3+C4+C5) → Octave chord
        const octMatch = TEMPLATES_FINAL.find(t => t.octave);
        if (octMatch) {
          const rootNote = sorted[0];
          const rootPitch = rootNote.name.replace(/\d+/g, "");
          results.push({
            name:      octMatch.name,
            cat:       octMatch.cat,
            root:      rootPitch,
            notes:     combo.map(n => n.name),
            noteCount: combo.length,
            key:       combo.map(n => n.name).sort().join("|") + "::" + rootPitch + "::" + octMatch.name,
          });
        }
        continue;
      }

      // Try each unique pitch class as a potential root
      for (const rootPC of uniquePCs) {
        // Representative root note = lowest note with this pitch class
        const rootNote = sorted.find(n => ((n.midi % 12) + 12) % 12 === rootPC);

        // Intervals from root pitch class to every other unique pitch class
        const intervals = uniquePCs
          .filter(pc => pc !== rootPC)
          .map(pc => ((pc - rootPC) % 12 + 12) % 12)
          .sort((a, b) => a - b);

        const match = TEMPLATES_FINAL.find(t => {
          if (t.octave) return false;
          return t.intervals.length === intervals.length &&
            t.intervals.every((v, i) => v === intervals[i]);
        });

        if (match) {
          const rootPitch = rootNote.name.replace(/\d+/g, "");
          results.push({
            name:      match.name,
            cat:       match.cat,
            root:      rootPitch,
            notes:     combo.map(n => n.name),
            noteCount: combo.length,
            key:       combo.map(n => n.name).sort().join("|") + "::" + rootPitch + "::" + match.name,
          });
        }
      }
    }
  }

  return results;
}

export function mergeChords(chords) {
  const seen = new Set();
  return chords.filter(c => {
    if (seen.has(c.key)) return false;
    seen.add(c.key);
    return true;
  });
}

// Static values derived from the default C Minor handpan
export const RAW_CHORDS    = detectChords(HANDPAN.notes);
export const ALL_CHORDS    = mergeChords(RAW_CHORDS);
export const ALL_CHORD_NAMES = [...new Set(ALL_CHORDS.map(c=>c.name))].sort();
export const AVAILABLE_CATS  = CAT_ORDER.filter(cat => ALL_CHORDS.some(c => c.cat === cat));
