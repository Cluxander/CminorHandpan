import { useState, useRef } from "react";
import { FONT, NOTE_COLOR } from "../../constants/colors.js";
import { NOTE_SIZES, RING_RADII } from "../../constants/handpan.js";
import { getSnapAngles, snapToSlot } from "../../utils/geometry.js";

const CX = 150, CY = 150;

export default function BuilderCanvas({ notes, rings, onMove, onNoteClick, selectedNote, side = "upper" }) {
  const svgRef    = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [hover,    setHover]    = useState(null);
  const didMove    = useRef(false);
  const startPos   = useRef(null);
  const DRAG_THRESH = 8;

  function svgPt(cx, cy) {
    const svg = svgRef.current; if (!svg) return { x:0, y:0 };
    const r = svg.getBoundingClientRect();
    return { x:(cx-r.left)*(300/r.width), y:(cy-r.top)*(300/r.height) };
  }
  function toAngle(x, y) { return ((Math.atan2(y-CY, x-CX)*180/Math.PI)+90+360)%360; }
  function toRingIdx(x, y) {
    const d = Math.sqrt((x-CX)**2 + (y-CY)**2);
    if (d < RING_RADII[rings.length-1]*0.45) return -1;
    let best = 0, bd = Infinity;
    rings.forEach((_, i) => { const dd = Math.abs(d-RING_RADII[i]); if (dd < bd) { bd = dd; best = i; } });
    return best;
  }
  function notePos(n) {
    const sizeDef = NOTE_SIZES[n.size || "medium"] || NOTE_SIZES.medium;
    const isAtCenter = (n.pos === "ding" || n.ringIdx === -1 || n.ringIdx == null) && n.angle == null;
    if (isAtCenter) return { x:CX, y:CY, r:sizeDef.r, isDing:true, sizeDef };
    const ri = Math.min(Math.max(n.ringIdx ?? 0, 0), RING_RADII.length-1, rings.length-1);
    const rr = RING_RADII[ri];
    const rad = (((n.angle ?? 0) - 90) * Math.PI) / 180;
    return { x:+(CX+rr*Math.cos(rad)).toFixed(1), y:+(CY+rr*Math.sin(rad)).toFixed(1), r:sizeDef.r, isDing:false, sizeDef };
  }

  function onPD(e, name) {
    const n = notes.find(x => x.name === name); if (!n) return;
    e.stopPropagation();
    didMove.current = false;
    startPos.current = { cx:e.clientX, cy:e.clientY };
    const isAtCenter = (n.pos === "ding" || n.ringIdx === -1 || n.ringIdx == null) && n.angle == null;
    setDragging({ name, la:n.angle||0, lri:isAtCenter ? -1 : (n.ringIdx ?? 0), active:false });
    svgRef.current?.setPointerCapture(e.pointerId);
  }
  function onPM(e) {
    if (!dragging) return;
    if (!dragging.active) {
      const dx = e.clientX - (startPos.current?.cx || 0);
      const dy = e.clientY - (startPos.current?.cy || 0);
      if (Math.sqrt(dx*dx + dy*dy) < DRAG_THRESH) return;
    }
    didMove.current = true;
    const { x, y } = svgPt(e.clientX, e.clientY);
    const ri = toRingIdx(x, y);
    setDragging(d => ({ ...d, la:toAngle(x,y), lri:(side === "bottom" && ri === -1) ? 0 : ri, active:true }));
  }
  function onPU(e) {
    if (!dragging) return;
    if (didMove.current) {
      const { x, y } = svgPt(e.clientX, e.clientY);
      const ri = toRingIdx(x, y);
      if (ri === -1) {
        if (side !== "bottom") onMove(dragging.name, null, -1);
      } else {
        const ring = rings[ri] || rings[0];
        const slots = getSnapAngles(ring.count || 8, ring.rotation || 0);
        const snapped = snapToSlot(toAngle(x, y), slots);
        const halfSlot = 360 / ring.count / 2;
        const conflict = notes.find(n =>
          n.name !== dragging.name && (n.ringIdx ?? 0) === ri &&
          !NOTE_SIZES[n.size || "medium"]?.isDing &&
          Math.abs((((n.angle || 0) - snapped + 540) % 360) - 180) < halfSlot
        );
        if (!conflict) onMove(dragging.name, snapped, ri);
      }
    } else {
      onNoteClick && onNoteClick(notes.find(n => n.name === dragging.name));
    }
    setDragging(null);
  }

  const renderNotes = notes.map(n => {
    if (dragging?.active && dragging.name === n.name) {
      return dragging.lri === -1
        ? { ...n, pos:"ding", ringIdx:-1 }
        : { ...n, angle:dragging.la, ringIdx:dragging.lri, pos:"ring" };
    }
    return n;
  });

  const gid = `bc${side}`;

  return (
    <svg ref={svgRef} width="100%" viewBox="0 0 300 300"
      style={{ display:"block", maxWidth:260, margin:"0 auto", touchAction:"none", userSelect:"none", WebkitUserSelect:"none", WebkitTapHighlightColor:"transparent" }}
      onPointerMove={onPM} onPointerUp={onPU}>
      <defs>
        <radialGradient id={`${gid}Bg`} cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="#5c4e28"/>
          <stop offset="35%"  stopColor="#3a3018"/>
          <stop offset="70%"  stopColor="#1e1a0c"/>
          <stop offset="100%" stopColor="#080705"/>
        </radialGradient>
        <radialGradient id={`${gid}Sh`} cx="38%" cy="32%" r="48%">
          <stop offset="0%"   stopColor="rgba(255,230,140,0.18)"/>
          <stop offset="100%" stopColor="rgba(255,200,80,0.00)"/>
        </radialGradient>
        <filter id={`${gid}Gl`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={CX} cy={CY} r={146} fill="rgba(0,0,0,0.5)"/>
      <circle cx={CX} cy={CY} r={143} fill="none" stroke="rgba(160,120,40,0.25)" strokeWidth={1.5}/>
      <circle cx={CX} cy={CY} r={141} fill={`url(#${gid}Bg)`} stroke="rgba(200,155,55,0.42)" strokeWidth={2}/>
      <circle cx={CX} cy={CY} r={138} fill="none" stroke="rgba(240,195,80,0.12)" strokeWidth={1}/>
      <circle cx={CX} cy={CY} r={141} fill={`url(#${gid}Sh)`}/>

      {rings.map((ring, ri) => {
        const rr = RING_RADII[ri];
        const slots = getSnapAngles(ring.count || 8, ring.rotation || 0);
        return (
          <g key={ri}>
            <circle cx={CX} cy={CY} r={rr} fill="none"
              stroke="rgba(205,163,83,0.10)" strokeWidth={1} strokeDasharray="3 8"/>
            {slots.map(a => {
              const rad = ((a-90)*Math.PI)/180;
              const sx = +(CX+rr*Math.cos(rad)).toFixed(1);
              const sy = +(CY+rr*Math.sin(rad)).toFixed(1);
              const taken = renderNotes.some(n =>
                (n.ringIdx ?? 0) === ri && !NOTE_SIZES[n.size || "medium"]?.isDing &&
                Math.abs(((n.angle || 0) - a + 360) % 360) < (360/ring.count/2));
              return !taken && <circle key={a} cx={sx} cy={sy} r={3}
                fill="none" stroke="rgba(205,163,83,0.22)" strokeWidth={1}/>;
            })}
          </g>
        );
      })}

      {side === "bottom" && (
        <>
          <circle cx={CX} cy={CY} r={36} fill="rgba(0,0,0,0.80)"
            stroke="rgba(140,110,45,0.35)" strokeWidth={1.5}/>
          <circle cx={CX} cy={CY} r={28} fill="none"
            stroke="rgba(100,80,30,0.20)" strokeWidth={1} strokeDasharray="2 4"/>
        </>
      )}

      {renderNotes.map(n => {
        const { x, y, r, isDing, sizeDef } = notePos(n);
        const lbl = n.name.replace("b","♭").replace(/\d/,"");
        const oct = n.name.match(/\d/)?.[0] || "";
        const drag = dragging?.active && dragging.name === n.name;
        const sel  = selectedNote === n.name;
        const hov  = hover === n.name;
        return (
          <g key={n.name}
            onPointerDown={e => onPD(e, n.name)}
            onMouseEnter={() => setHover(n.name)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: drag ? "grabbing" : "grab" }}>
            {(sel || drag) && <circle cx={x} cy={y} r={r+9} fill={sel ? "rgba(205,163,83,0.10)" : "none"}
              filter={`url(#${gid}Gl)`}/>}
            <circle cx={x} cy={y} r={r+2} fill="none"
              stroke={sel ? "rgba(205,163,83,0.65)" : drag || hov ? "rgba(205,163,83,0.30)" : "none"}
              strokeWidth={sel ? 1.5 : 1} strokeDasharray={sel ? "none" : "3 3"}/>
            <circle cx={x} cy={y} r={r}
              fill={drag ? "rgba(205,163,83,0.28)" : sel ? "rgba(205,163,83,0.14)" : "rgba(20, 17, 8, 0.75)"}
              stroke={sel || drag ? "rgba(205,163,83,0.85)" : isDing ? "rgba(205,163,83,0.55)" : "rgba(140, 110, 45, 0.4)"}
              strokeWidth={sel ? 2 : 1.5}/>
            <circle cx={x} cy={y} r={r-r/3} fill="none"
              stroke="rgba(205, 162, 83, 0.28)" strokeWidth={.8}/>
            <text x={x-sizeDef.fontSize/3} y={y+sizeDef.fontSize/10}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={sizeDef.fontSize} fontFamily={FONT} fontWeight="600"
              fill={sel ? "#e8c97a" : isDing ? "#cda353" : "#9a8a60"}
              style={{ userSelect:"none", pointerEvents:"none" }}>{lbl}</text>
            {oct && <text x={x+sizeDef.fontSize/2} y={y+sizeDef.fontSize/3}
              textAnchor="middle" fontSize={sizeDef.fontSize} fontFamily={FONT} fontWeight="600"
              fill={sel ? "#c8a050" : isDing ? "#7a6030" : "#6a5838"}
              style={{ userSelect:"none", pointerEvents:"none" }}>{oct}</text>}
            {isDing && <text x={x} y={y+(oct?r*0.75:r*0.5)-r/3}
              textAnchor="middle" fontSize={sizeDef.subFontSize-1} fontFamily={FONT} fontWeight="500"
              fill={sel ? "#b09040" : "#6a5838"}
              style={{ userSelect:"none", pointerEvents:"none" }}>ding</text>}
          </g>
        );
      })}
    </svg>
  );
}
