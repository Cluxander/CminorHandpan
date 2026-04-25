import { FONT } from "../../constants/colors.js";
import { NOTE_COLOR } from "../../constants/colors.js";
import { NOTE_SIZES, RING_RADII } from "../../constants/handpan.js";
import { parsePosV2 } from "../../utils/geometry.js";

const CX = 150, CY = 150;

export default function PreviewPan({ notes, positions, ringsUpper, ringsBottom, activeNote, onNote, size = 260, sid = "pp" }) {
  function notePos(n) {
    const posStr = positions?.[n.name];
    const p = parsePosV2(posStr, n.side || "upper");
    const sizeDef = NOTE_SIZES[n.size || "medium"] || NOTE_SIZES.medium;

    if (p.isDing) return { x:CX, y:CY, r:sizeDef.r, isDing:true, sizeDef };

    const sideRings = p.side === "bottom" ? (ringsBottom || [{count:6,rotation:0}]) : (ringsUpper || [{count:8,rotation:0}]);
    const safeRingsLen = Array.isArray(sideRings) ? sideRings.length : 1;
    const ri = Math.min(Math.max(p.ringIdx ?? 0, 0), RING_RADII.length - 1, safeRingsLen - 1);
    const rr = RING_RADII[ri];
    const rad = ((p.angle - 90) * Math.PI) / 180;
    return {
      x: +(CX + rr * Math.cos(rad)).toFixed(2),
      y: +(CY + rr * Math.sin(rad)).toFixed(2),
      r: sizeDef.r, isDing:false, sizeDef
    };
  }

  const colFn = n => NOTE_COLOR(n.name);
  const isBottomNotes = notes.length > 0 && notes.every(n => (n.side || "upper") === "bottom");
  const ringListArr = Array.isArray(isBottomNotes ? ringsBottom : ringsUpper)
    ? (isBottomNotes ? ringsBottom : ringsUpper)
    : [{count:8,rotation:0}];

  return (
    <svg width="100%" height={typeof size === "number" ? size : undefined} viewBox="0 0 300 300"
      style={{ display:"block", maxWidth:typeof size === "number" ? size : "100%", touchAction:"none", userSelect:"none", WebkitTapHighlightColor:"transparent" }}>
      <defs>
        <radialGradient id={`ppBg_${sid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="#5c4e28"/>
          <stop offset="28%"  stopColor="#3a3018"/>
          <stop offset="60%"  stopColor="#1e1a0c"/>
          <stop offset="100%" stopColor="#080705"/>
        </radialGradient>
        <radialGradient id={`ppSh_${sid}`} cx="38%" cy="32%" r="48%">
          <stop offset="0%"   stopColor="rgba(255,230,140,0.20)"/>
          <stop offset="100%" stopColor="rgba(255,200,80,0.00)"/>
        </radialGradient>
        <filter id={`ppGl_${sid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={CX} cy={CY} r={146} fill="rgba(0,0,0,0.55)"/>
      <circle cx={CX} cy={CY} r={143} fill="none" stroke="rgba(160,120,40,0.30)" strokeWidth={1.5}/>
      <circle cx={CX} cy={CY} r={141} fill={`url(#ppBg_${sid})`} stroke="rgba(200,155,55,0.50)" strokeWidth={2}/>
      <circle cx={CX} cy={CY} r={138} fill="none" stroke="rgba(240,195,80,0.18)" strokeWidth={1}/>
      <circle cx={CX} cy={CY} r={141} fill={`url(#ppSh_${sid})`}/>
      {ringListArr.map((_, ri) => (
        <circle key={ri} cx={CX} cy={CY} r={RING_RADII[ri]} fill="none"
          stroke="rgba(205,163,83,0.08)" strokeWidth={1} strokeDasharray="3 8"/>
      ))}
      {isBottomNotes && (
        <circle cx={CX} cy={CY} r={32} fill="rgba(0,0,0,0.70)"
          stroke="rgba(140,110,45,0.30)" strokeWidth={1.5}/>
      )}

      {/* {notes.filter(n => !notePos(n).isDing).map(n => {
        const { x, y } = notePos(n); const lit = activeNote === n.name;
        return <line key={n.name} x1={CX} y1={CY} x2={x} y2={y}
          stroke={lit ? colFn(n) + "55" : "rgba(205,163,83,0.05)"} strokeWidth={lit ? 1.5 : .8}/>;
      })} */}

      {[...notes.filter(n => !notePos(n).isDing), ...notes.filter(n => notePos(n).isDing)].map(n => {
        const { x, y, r, isDing, sizeDef } = notePos(n);
        const lbl = n.name.replace("b","♭").replace(/\d/,"");
        const oct = n.name.match(/\d/)?.[0] || "";
        const lit = activeNote === n.name;
        const c = colFn(n);
        return (
          <g key={n.name} onClick={() => onNote && onNote(n)} style={{ cursor:"pointer" }}>
            {lit && <circle cx={x} cy={y} r={r+12} fill={c+"18"} filter={`url(#ppGl_${sid})`}/>}
            <circle cx={x} cy={y} r={r+2} fill="none"
              stroke={lit ? c+"55" : "rgba(180,140,55,0.12)"} strokeWidth={lit ? 1.5 : 1}/>
            <circle cx={x} cy={y} r={r}
              fill={lit ? c+"35" : "rgba(20, 17, 8, 0.75)"}
              stroke={lit ? c : isDing ? "rgba(205,163,83,0.60)" : "rgba(140, 110, 45, 0.4)"}
              strokeWidth={lit ? 2.5 : 1.5}/>
            <circle cx={x} cy={y} r={r-r/3} fill="none"
              stroke={lit ? c+"44" : "rgba(205, 162, 83, 0.28)"} strokeWidth={.8}/>
            <text x={x-sizeDef.fontSize/3} y={y+sizeDef.fontSize/10}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={sizeDef.fontSize} fontFamily={FONT} fontWeight="600"
              fill={lit ? c : isDing ? "#cda353" : "#9a8a60"}
              style={{ userSelect:"none", pointerEvents:"none" }}>{lbl}</text>
            {oct && <text x={x+sizeDef.fontSize/2} y={y+sizeDef.fontSize/3}
              textAnchor="middle" fontSize={sizeDef.fontSize} fontFamily={FONT} fontWeight="600"
              fill={lit ? c+(isDing?"cc":"99") : isDing ? "#d7a342" : "#7a6840"}
              style={{ userSelect:"none", pointerEvents:"none" }}>{oct}</text>}
            {isDing && <text x={x} y={y+(oct?r*0.75:r*0.5)-r/3}
              textAnchor="middle" fontSize={sizeDef.subFontSize-1} fontFamily={FONT} fontWeight="500"
              fill={lit ? c+"cc" : "#d7a342"}
              style={{ userSelect:"none", pointerEvents:"none" }}>ding</text>}
          </g>
        );
      })}
    </svg>
  );
}
