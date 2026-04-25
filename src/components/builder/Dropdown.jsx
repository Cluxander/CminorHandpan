import { useState, useEffect, useRef } from "react";
import { FONT } from "../../constants/colors.js";

export default function Dropdown({ value, onChange, options, placeholder = "Select…", style: extraStyle = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const sel = options.find(o => (o.value ?? o) === value);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", ...extraStyle }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", background:"rgba(255,255,255,0.06)",
        border:"1px solid rgba(255,255,255,0.14)",
        color:"#d4c8a8", borderRadius:7, padding:"6px 10px",
        cursor:"pointer", fontSize:11, fontFamily:FONT,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        gap:6, textAlign:"left",
      }}>
        <span>{sel ? (sel.label ?? sel) : placeholder}</span>
        <span style={{ opacity:.5, fontSize:9 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 3px)", left:0, right:0, zIndex:500,
          background:"#1c1810", border:"1px solid rgba(205,163,83,0.30)",
          borderRadius:8, overflow:"auto", maxHeight:200,
          boxShadow:"0 8px 32px rgba(0,0,0,0.7)",
        }}>
          {options.map(o => {
            const v = o.value ?? o; const l = o.label ?? o;
            const active = v === value;
            return (
              <button key={v} onClick={() => { onChange(v); setOpen(false); }} style={{
                width:"100%", background:active ? "rgba(205,163,83,0.15)" : "transparent",
                border:"none", color:active ? "#e8d098" : "#b0a080",
                padding:"7px 10px", cursor:"pointer", fontSize:11, fontFamily:FONT,
                textAlign:"left", borderBottom:"1px solid rgba(255,255,255,0.04)",
              }}>{l}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}
