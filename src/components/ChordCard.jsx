import { FONT, NOTE_COLOR } from "../constants/colors.js";
import { CAT_STYLE } from "../constants/chords.js";

export default function ChordCard({ chord, isSelected, isRelated, dimmed, onClick }) {
  const acc = CAT_STYLE[chord.cat]?.accent || "#c9a84c";
  const bg = isSelected
    ? "rgba(205,163,83,0.17)"
    : isRelated
      ? `${acc}18`
      : "rgba(255,255,255,0.03)";
  const border = isSelected ? "rgba(205,163,83,0.72)"
    : isRelated ? acc+"88"
    : "rgba(255,255,255,0.07)";

  return (
    <div onClick={onClick} style={{
      background:bg, border:`1px solid ${border}`,
      borderRadius:8, padding:"8px 11px", cursor:"pointer",
      transition:"all .15s",
      transform:isSelected ? "scale(1.015)" : "scale(1)",
      boxShadow:isSelected ? "0 0 18px rgba(205,163,83,0.13)" : isRelated ? `0 0 8px ${acc}28` : "none",
      opacity:dimmed ? 0.35 : 1,
    }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5 }}>
        <div style={{ display:"flex",alignItems:"baseline",gap:5 }}>
          <span style={{ color:isSelected?"#ecd898":acc,fontSize:13,fontFamily:FONT,fontWeight:"700",letterSpacing:.3 }}>
            {chord.root.replace("b","♭")}
          </span>
          <span style={{ color:isSelected?"#b8a060":"#806850",fontSize:10,fontFamily:FONT,fontWeight:"500" }}>
            {chord.name}
          </span>
        </div>
        <span style={{ fontSize:8,color:acc+(isSelected?"cc":"66"),border:`1px solid ${acc}25`,
          borderRadius:3,padding:"1px 4px",flexShrink:0,fontFamily:FONT,letterSpacing:.5,marginLeft:4 }}>
          {chord.noteCount}♩
        </span>
      </div>

      <div style={{ display:"flex",gap:2,flexWrap:"wrap" }}>
        {chord.notes.map(n => (
          <span key={n} style={{
            background:NOTE_COLOR(n)+"14", border:`1px solid ${NOTE_COLOR(n)}45`,
            color:NOTE_COLOR(n), borderRadius:3, padding:"0px 4px",
            fontSize:8.5, fontFamily:"monospace", lineHeight:"1.6",
          }}>{n.replace("b","♭")}</span>
        ))}
      </div>
    </div>
  );
}
