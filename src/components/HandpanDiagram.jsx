import { FONT, NOTE_COLOR, NOTE_POS } from "../constants/colors.js";
import { NOTE_SIZES } from "../constants/handpan.js";
import { HANDPAN } from "../constants/handpan.js";

const CX = 150, CY = 150, RING_R = 90;

export default function HandpanDiagram({ activeNotes, onNoteToggle, notePositions, panNotes, uniqueId = "hp" }) {
  const noteList = panNotes || HANDPAN.notes;

  function getNotePos(noteName) {
    if (notePositions && notePositions[noteName] !== undefined) {
      const pos = notePositions[noteName];
      if (pos === "ding" || pos === "big-ding" || pos === "small-ding")
        return { x:CX, y:CY, r:36, isDing:true };
      const parts = String(pos).split(":");
      if (parts[0] === "ding") return { x:CX, y:CY, r:36, isDing:true };
      const deg = parseFloat(parts[0]) || 0;
      const ri  = parseInt(parts[1] || 0);
      const rr  = [RING_R, RING_R*0.69, RING_R*0.44][Math.min(ri,2)];
      const rad = ((deg-90)*Math.PI)/180;
      return { x:+(CX+rr*Math.cos(rad)).toFixed(2), y:+(CY+rr*Math.sin(rad)).toFixed(2), r:24, isDing:false };
    }
    return NOTE_POS[noteName] || null;
  }

  const renderList = [
    ...noteList.filter(n => !getNotePos(n.name)?.isDing),
    ...noteList.filter(n =>  getNotePos(n.name)?.isDing),
  ];

  return (
    <svg width="100%" viewBox="0 0 300 300" style={{ display:"block",maxWidth:260,margin:"0 auto",touchAction:"none",userSelect:"none",WebkitUserSelect:"none",WebkitTapHighlightColor:"transparent" }}>
      <defs>
        <radialGradient id={`hpBody_${uniqueId}`} cx="50%" cy="50%" r="55%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#5c4e28"/>
          <stop offset="28%"  stopColor="#3a3018"/>
          <stop offset="60%"  stopColor="#1e1a0c"/>
          <stop offset="100%" stopColor="#080705"/>
        </radialGradient>
        <radialGradient id={`hpSheen_${uniqueId}`} cx="38%" cy="32%" r="48%">
          <stop offset="0%"  stopColor="rgba(255,230,140,0.22)"/>
          <stop offset="60%" stopColor="rgba(255,210,100,0.06)"/>
          <stop offset="100%"stopColor="rgba(255,200,80,0.00)"/>
        </radialGradient>
        <filter id={`hpGlow_${uniqueId}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r={146} fill="rgba(0,0,0,0.55)"/>
      <circle cx={CX} cy={CY} r={143} fill="none" stroke="rgba(160,120,40,0.30)" strokeWidth={1.5}/>
      <circle cx={CX} cy={CY} r={141} fill={`url(#hpBody_${uniqueId})`} stroke="rgba(200,155,55,0.50)" strokeWidth={2}/>
      <circle cx={CX} cy={CY} r={138} fill="none" stroke="rgba(240,195,80,0.18)" strokeWidth={1}/>
      <circle cx={CX} cy={CY} r={141} fill={`url(#hpSheen_${uniqueId})`}/>
      <circle cx={CX} cy={CY} r={115} fill="none" stroke="rgba(205,163,83,0.10)" strokeWidth={1} strokeDasharray="4 8"/>
      <circle cx={CX} cy={CY} r={50}  fill="none" stroke="rgba(205,163,83,0.08)" strokeWidth={1}/>

      {panNotes && panNotes.length > 0 && panNotes.every(n => n.side === "bottom") && (
        <circle cx={CX} cy={CY} r={36} fill="rgba(0,0,0,0.75)" stroke="rgba(140,110,45,0.30)" strokeWidth={1.5}/>
      )}

      {renderList.filter(n => !getNotePos(n.name)?.isDing).map(n => {
        const p = getNotePos(n.name); if (!p) return null;
        const lit = activeNotes.includes(n.name);
        return <line key={n.name} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke={lit ? NOTE_COLOR(n.name)+"66" : "rgba(205,163,83,0.06)"}
          strokeWidth={lit ? 1.5 : .8} style={{ transition:"stroke .25s" }}/>;
      })}

      {renderList.map(n => {
        const pos = getNotePos(n.name); if (!pos) return null;
        const { x, y, isDing } = pos;
        const sizeDef = NOTE_SIZES[n.size||"medium"] || (isDing ? NOTE_SIZES["big-ding"] : NOTE_SIZES["medium"]);
        const r = sizeDef.r;
        const lit = activeNotes.includes(n.name), col = NOTE_COLOR(n.name);
        const lbl = n.name.replace("b","♭").replace(/\d/,"");
        const oct = n.name.match(/\d/)?.[0] || "";
        return (
          <g key={n.name} onClick={() => onNoteToggle(n.name)} style={{ cursor:"pointer" }}>
            {lit && <circle cx={x} cy={y} r={r+13} fill={col+"18"} filter={`url(#hpGlow_${uniqueId})`}/>}
            <circle cx={x} cy={y} r={r+2} fill="none"
              stroke={lit ? col+"55" : "rgba(180,140,55,0.15)"}
              strokeWidth={lit?1.5:1} style={{ transition:"stroke .2s" }}/>
            <circle cx={x} cy={y} r={r}
              fill={lit ? col+"38" : isDing ? "rgba(205,163,83,0.12)" : "rgba(20,17,8,0.88)"}
              stroke={lit ? col : isDing ? "rgba(205,163,83,0.60)" : "rgba(140,110,45,0.25)"}
              strokeWidth={lit?2.5:1.5} style={{ transition:"all .2s" }}/>
            <circle cx={x} cy={y} r={Math.max(r-6,4)} fill="none"
              stroke={lit ? col+"44" : "rgba(205,163,83,0.06)"}
              strokeWidth={.8} style={{ transition:"stroke .2s" }}/>
            <text x={x} y={isDing ? y-(r>30?5:4) : y+1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={sizeDef.fontSize} fontFamily={FONT} fontWeight="600"
              fill={lit ? col : isDing ? "#d4a830" : "#9a8a60"}
              style={{ userSelect:"none", pointerEvents:"none", transition:"fill .2s" }}>{lbl}</text>
            {oct && <text x={x} y={isDing ? y+(r>30?9:7) : y+r*0.55}
              textAnchor="middle" fontSize={sizeDef.subFontSize} fontFamily={FONT} fontWeight="600"
              fill={lit ? col+(isDing?"cc":"99") : isDing ? "#8a7040" : "#7a6840"}
              style={{ userSelect:"none", pointerEvents:"none" }}>{oct}</text>}
            {isDing && <text x={x} y={y+(oct?r*0.75:r*0.5)}
              textAnchor="middle" fontSize={sizeDef.subFontSize-1} fontFamily={FONT} fontWeight="500"
              fill={lit ? col+"ee" : "#8a7040"}
              style={{ userSelect:"none", pointerEvents:"none" }}>ding</text>}
          </g>
        );
      })}
    </svg>
  );
}
