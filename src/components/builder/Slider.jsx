import { FONT } from "../../constants/colors.js";

export default function Slider({ min, max, step = 1, value, onChange, label }) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center", flex:1 }}>
      <div style={{ flex:1, position:"relative", height:20, display:"flex", alignItems:"center" }}>
        <div style={{ position:"absolute", left:0, right:0, height:3, background:"rgba(255,255,255,0.08)", borderRadius:2 }}/>
        <div style={{ position:"absolute", left:0, width:`${pct}%`, height:3, background:"rgba(205,163,83,0.60)", borderRadius:2 }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          style={{ position:"absolute", left:0, right:0, width:"100%", opacity:0, height:20, cursor:"pointer", margin:0, padding:0 }}/>
        <div style={{
          position:"absolute", left:`calc(${pct}% - 7px)`,
          width:14, height:14, borderRadius:"50%",
          background:"#c9a84c", border:"2px solid #1a1408",
          pointerEvents:"none", boxShadow:"0 0 6px rgba(205,163,83,0.40)",
        }}/>
      </div>
      {label !== undefined && (
        <span style={{ fontSize:9, color:"#6a5a30", minWidth:28, textAlign:"right", flexShrink:0 }}>{label}</span>
      )}
    </div>
  );
}
