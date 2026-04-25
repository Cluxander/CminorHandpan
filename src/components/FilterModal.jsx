import { useState, useRef, useEffect } from "react";
import { FONT, NOTE_COLOR } from "../constants/colors.js";
import { CAT_ORDER, CAT_STYLE } from "../constants/chords.js";
import { ALL_CHORD_NAMES } from "../utils/chordDetection.js";
import { HANDPAN } from "../constants/handpan.js";

const NOTE_LIST = HANDPAN.notes.map(n => n.name);

export default function FilterModal({ open, onClose, filters, onChange, availableCats, availableChordNames, noteList }) {
  const [dragY,   setDragY]   = useState(0);
  const [visible, setVisible] = useState(false);
  const [animIn,  setAnimIn]  = useState(false);
  const dragging  = useRef(false);
  const dragStart = useRef(null);
  const panelRef  = useRef(null);

  useEffect(() => {
    if (open) {
      setDragY(0); setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)));
    } else {
      setAnimIn(false);
      const t = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!visible) return null;

  const DISMISS_THRESHOLD = 90;

  const startDrag = y => {
    if (panelRef.current && panelRef.current.scrollTop > 2) return;
    dragStart.current = y; dragging.current = true;
  };
  const moveDrag = y => {
    if (!dragging.current || dragStart.current === null) return;
    setDragY(Math.max(0, y - dragStart.current));
  };
  const endDrag = y => {
    if (!dragging.current) return;
    dragging.current = false;
    const dy = Math.max(0, y - (dragStart.current ?? y));
    dragStart.current = null;
    if (dy >= DISMISS_THRESHOLD) { setDragY(0); onClose(); }
    else setDragY(0);
  };

  const { noteCounts, cats, notes, chordNames } = filters;

  const toggle = (key, val) => {
    const arr = filters[key];
    const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
    onChange({ ...filters, [key]: next });
  };

  const Chip = ({ active, color, onClick, children }) => (
    <button onClick={onClick} style={{
      background: active ? (color ? color+"28" : "rgba(205,163,83,0.20)") : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? (color||"rgba(205,163,83,0.60)") : "rgba(255,255,255,0.08)"}`,
      color: active ? (color||"#e8d4a0") : "#6a5840",
      borderRadius:6, padding:"5px 11px", cursor:"pointer",
      fontSize:11, fontFamily:FONT, fontWeight:"400",
      transition:"all .13s", whiteSpace:"nowrap",
    }}>{children}</button>
  );
  const Label = ({ children }) => (
    <div style={{ fontSize:9,letterSpacing:3,color:"#7a6030",textTransform:"uppercase",marginBottom:7,fontFamily:FONT,fontWeight:"600" }}>{children}</div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(3px)",opacity:animIn?1:0,transition:"opacity .3s ease" }}/>
      <div
        ref={panelRef}
        onMouseDown={e => startDrag(e.clientY)}
        onMouseMove={e => moveDrag(e.clientY)}
        onMouseUp={e => endDrag(e.clientY)}
        onMouseLeave={e => endDrag(e.clientY)}
        onTouchStart={e => startDrag(e.touches[0].clientY)}
        onTouchMove={e => {
          if (panelRef.current && panelRef.current.scrollTop > 2) { dragging.current=false; dragStart.current=null; setDragY(0); return; }
          if (dragging.current) {
            const dy = e.touches[0].clientY - (dragStart.current||0);
            if (dy > 0) { e.preventDefault(); moveDrag(e.touches[0].clientY); }
            else { dragging.current=false; dragStart.current=null; setDragY(0); }
          }
        }}
        onTouchEnd={e => endDrag(e.changedTouches[0].clientY)}
        style={{
          position:"fixed",bottom:0,left:0,right:0,zIndex:201,
          background:"#181208",borderTop:"1px solid rgba(205,163,83,0.22)",
          borderRadius:"18px 18px 0 0",maxHeight:"85vh",overflowY:"auto",
          WebkitOverflowScrolling:"touch",fontFamily:FONT,
          transform: dragY > 0
            ? `translateY(${dragY}px)`
            : animIn ? "translateY(0)" : "translateY(100%)",
          transition: dragY > 0 ? "none" : "transform .32s cubic-bezier(.32,.72,.00,1.00)",
          boxShadow:"0 -12px 48px rgba(0,0,0,0.6)",userSelect:"none",
        }}>
        <div style={{ maxWidth:880,margin:"0 auto",padding:"20px 18px 36px" }}>
          <div style={{ width:40,height:4,background:"rgba(205,163,83,0.20)",borderRadius:2,margin:"0 auto 18px" }}/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
            <div style={{ fontSize:16,color:"#d4c090",letterSpacing:.5,fontFamily:FONT,fontWeight:"700" }}>Filters</div>
            <button onClick={onClose} style={{ background:"none",border:"none",color:"#6a5830",fontSize:18,cursor:"pointer",lineHeight:1,padding:"4px 8px" }}>✕</button>
          </div>

          <Label>Note count</Label>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:18 }}>
            {["all","2","3","4","5"].map(n => (
              <Chip key={n}
                active={n==="all" ? noteCounts.length===0 : noteCounts.includes(parseInt(n))}
                onClick={() => n==="all" ? onChange({...filters,noteCounts:[]}) : toggle("noteCounts",parseInt(n))}>
                {n==="all"?"All":`${n} notes`}
              </Chip>
            ))}
          </div>

          <Label>Category</Label>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:18 }}>
            {["all",...(availableCats||CAT_ORDER)].map(c => (
              <Chip key={c}
                active={c==="all" ? cats.length===0 : cats.includes(c)}
                color={c!=="all" ? CAT_STYLE[c]?.accent : undefined}
                onClick={() => c==="all" ? onChange({...filters,cats:[]}) : toggle("cats",c)}>
                {c==="all"?"All":CAT_STYLE[c]?.label??c}
              </Chip>
            ))}
          </div>

          <Label>Chord type</Label>
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:18 }}>
            <Chip active={chordNames.length===0} onClick={() => onChange({...filters,chordNames:[]})}>All</Chip>
            {(availableChordNames||ALL_CHORD_NAMES).map(nm => (
              <Chip key={nm} active={chordNames.includes(nm)} onClick={() => toggle("chordNames",nm)}>{nm}</Chip>
            ))}
          </div>

          <Label>Contains note</Label>
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:20 }}>
            <Chip active={notes.length===0} onClick={() => onChange({...filters,notes:[]})}>All</Chip>
            {(noteList||NOTE_LIST).map(n => (
              <Chip key={n} active={notes.includes(n)} color={NOTE_COLOR(n)}
                onClick={() => toggle("notes",n)}>
                {n.replace("b","♭")}
              </Chip>
            ))}
          </div>

          <Label>Display</Label>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 14px",marginBottom:20,cursor:"pointer" }}
            onClick={() => onChange({...filters,hideDuplicates:!filters.hideDuplicates})}>
            <div>
              <div style={{ fontSize:12,color:"#c8b880",fontFamily:FONT,fontWeight:"500",marginBottom:2 }}>Hide duplicates</div>
              <div style={{ fontSize:10,color:"#6a5830",fontFamily:FONT }}>Show only the lowest-pitch voicing per chord</div>
            </div>
            <div style={{ width:44,height:24,borderRadius:12,flexShrink:0,marginLeft:12,background:filters.hideDuplicates?"rgba(200,184,120,0.30)":"rgba(255,255,255,0.07)",border:`1px solid ${filters.hideDuplicates?"rgba(205,163,83,0.60)":"rgba(255,255,255,0.10)"}`,position:"relative",transition:"all .2s" }}>
              <div style={{ position:"absolute",top:3,left:filters.hideDuplicates?21:3,width:16,height:16,borderRadius:"50%",background:filters.hideDuplicates?"#cda353":"#4a3a18",transition:"left .2s",boxShadow:filters.hideDuplicates?"0 0 6px rgba(205,163,83,0.5)":"none" }}/>
            </div>
          </div>

          <button onClick={() => onChange({noteCounts:[],cats:[],notes:[],chordNames:[],hideDuplicates:false})}
            style={{ background:"rgba(150,50,50,0.15)",border:"1px solid rgba(150,50,50,0.30)",color:"#b06060",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:12,fontFamily:FONT,width:"100%" }}>
            Clear all filters
          </button>
        </div>
      </div>
    </>
  );
}
