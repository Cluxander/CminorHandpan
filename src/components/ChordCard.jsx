import { useState, useMemo } from "react";
import { NOTE_COLOR } from "../constants/colors.js";
import { CAT_STYLE } from "../constants/chords.js";

function permutations(arr) {
  if (arr.length <= 1) return [[...arr]];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

export default function ChordCard({ chord, isSelected, isRelated, dimmed, onClick, onSave }) {
  const [permIdx, setPermIdx] = useState(0);
  const acc = CAT_STYLE[chord.cat]?.accent || "#c9a84c";

  const allPerms = useMemo(() => permutations(chord.notes), [chord.key]);
  const displayedNotes = allPerms[permIdx % allPerms.length];
  const total = allPerms.length;

  let cardClass = "hp-chord-card";
  if (isSelected) cardClass += " hp-chord-card--selected";
  else if (isRelated) cardClass += " hp-chord-card--related";
  else cardClass += " hp-chord-card--default";
  if (dimmed) cardClass += " hp-chord-card--dimmed";

  return (
    <div onClick={() => onClick(chord, displayedNotes)} className={cardClass}
      style={isRelated && !isSelected ? { "--accent": acc } : undefined}>

      {/* LEFT: save / heart button */}
      <button
        className={`hp-chord-card__save ${isSelected ? "hp-chord-card__save--selected" : "hp-chord-card__save--default"}`}
        style={{ "--accent": acc }}
        onClick={e => { e.stopPropagation(); onSave && onSave(displayedNotes); }}
        title="Save chord">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </button>

      {/* CENTER: root, name, note chips */}
      <div className="hp-chord-card__content">
        <div className="hp-chord-card__top">
          <span className={`hp-chord-card__root ${isSelected ? "hp-chord-card__root--selected" : "hp-chord-card__root--default"}`}
            style={!isSelected ? { "--accent": acc } : undefined}>
            {chord.root.replace("b","♭")}
          </span>
          <span className={`hp-chord-card__name ${isSelected ? "hp-chord-card__name--selected" : "hp-chord-card__name--default"}`}>
            {chord.name}
          </span>
        </div>
        <div className="hp-chord-card__notes">
          {displayedNotes.map(note => (
            <span key={note} className="hp-chord-note-chip" style={{ "--note-color": NOTE_COLOR(note) }}>
              {note.replace("b","♭")}
            </span>
          ))}
        </div>
      </div>

      {/* RIGHT: cycle / permutation button */}
      <button
        className={`hp-chord-card__cycle ${isSelected ? "hp-chord-card__cycle--selected" : "hp-chord-card__cycle--default"}`}
        style={{ "--accent": acc }}
        onClick={e => { e.stopPropagation(); setPermIdx(i => (i + 1) % total); }}
        title={`Order ${(permIdx % total) + 1} of ${total}`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"/>
          <path d="M3 11V9a4 4 0 014-4h14"/>
          <polyline points="7 23 3 19 7 15"/>
          <path d="M21 13v2a4 4 0 01-4 4H3"/>
        </svg>
      </button>
    </div>
  );
}
