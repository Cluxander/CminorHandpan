import { NOTE_COLOR } from "../constants/colors.js";
import { CAT_STYLE } from "../constants/chords.js";

export default function ChordCard({ chord, isSelected, isRelated, dimmed, onClick }) {
  const acc = CAT_STYLE[chord.cat]?.accent || "#c9a84c";

  let cardClass = "hp-chord-card";
  if (isSelected) cardClass += " hp-chord-card--selected";
  else if (isRelated) cardClass += " hp-chord-card--related";
  else cardClass += " hp-chord-card--default";
  if (dimmed) cardClass += " hp-chord-card--dimmed";

  return (
    <div onClick={onClick} className={cardClass} style={isRelated && !isSelected ? { "--accent": acc } : undefined}>
      <div className="hp-chord-card__top">
        <div className="hp-chord-card__title">
          <span className={`hp-chord-card__root ${isSelected ? "hp-chord-card__root--selected" : "hp-chord-card__root--default"}`}
            style={!isSelected ? { "--accent": acc } : undefined}>
            {chord.root.replace("b","♭")}
          </span>
          <span className={`hp-chord-card__name ${isSelected ? "hp-chord-card__name--selected" : "hp-chord-card__name--default"}`}>
            {chord.name}
          </span>
        </div>
        <span className={`hp-chord-card__count-badge ${isSelected ? "hp-chord-card__count-badge--selected" : "hp-chord-card__count-badge--default"}`}
          style={{ "--accent": acc }}>
          {chord.noteCount}♩
        </span>
      </div>

      <div className="hp-chord-card__notes">
        {chord.notes.map(n => (
          <span key={n} className="hp-chord-note-chip" style={{ "--note-color": NOTE_COLOR(n) }}>
            {n.replace("b","♭")}
          </span>
        ))}
      </div>
    </div>
  );
}
