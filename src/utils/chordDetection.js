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
      const midis = combo.map(n => n.midi);
      const sorted = [...midis].sort((a,b)=>a-b);

      for (let rootIdx = 0; rootIdx < combo.length; rootIdx++) {
        const rootMidi = sorted[rootIdx];
        const intervals = sorted
          .filter((_,i) => i !== rootIdx)
          .map(m => ((m - rootMidi) % 12 + 12) % 12)
          .sort((a,b)=>a-b);

        const match = TEMPLATES_FINAL.find(t => {
          if (t.octave) {
            return combo.length === 2 && ((sorted[1]-sorted[0]) % 12 === 0);
          }
          return t.intervals.length === intervals.length &&
            t.intervals.every((v,i) => v === intervals[i]);
        });

        if (match) {
          const rootNote = combo.find(n => n.midi === rootMidi);
          results.push({
            name:      match.name,
            cat:       match.cat,
            root:      rootNote?.name ?? "",
            notes:     combo.map(n=>n.name),
            noteCount: combo.length,
            key:       combo.map(n=>n.name).sort().join("|") + "::" + rootNote?.name + "::" + match.name,
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
