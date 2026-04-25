import { useState, useEffect, useRef } from "react";
import { FONT } from "../../constants/colors.js";
import { NOTE_SIZES, SEMITONE_NAMES, STANDARD_PANS, MIDI_TO_NAME } from "../../constants/handpan.js";
import { getCtx, synthNote } from "../../audio/synth.js";
import { midiToFreq, getSnapAngles, parsePosV2, buildPosMap } from "../../utils/geometry.js";
import { savePans, loadPans } from "../../utils/storage.js";
import Dropdown from "./Dropdown.jsx";
import Slider from "./Slider.jsx";
import PreviewPan from "./PreviewPan.jsx";
import BuilderCanvas from "./BuilderCanvas.jsx";
import PanIcon from "./PanIcon.jsx";

const EMPTY_BUILD = () => ({
  panName:"",
  editingId: null,
  sided:"single",
  activeSide:"upper",
  a4: 440,
  rings:{ upper:[{count:8,rotation:0}], bottom:[{count:6,rotation:0}] },
  buildNotes:[],
  selectedNote:null,
  showAddNote:false,
  editRingIdx:0,
  newLetter:"C",
  newOctave:4,
  newNoteSize:"big-ding",
  newNoteRing:0,
});

export default function HandpanBuilder({ open, onClose, onApply }) {
  const [tab, setTab]   = useState("preset");
  const [selectedPreset, setSelectedPreset] = useState(STANDARD_PANS[0].id);
  const [customPans,     setCustomPans]     = useState(() => loadPans());
  const [selectedCustom, setSelectedCustom] = useState(null);
  const [build,   setBuild]   = useState(EMPTY_BUILD());
  const setB = (key, val) => setBuild(b => ({ ...b, [key]:val }));
  const [previewNote,  setPreviewNote]  = useState(null);
  const [visible,      setVisible]      = useState(false);
  const [animIn,       setAnimIn]       = useState(false);
  const previewTimer = useRef(null);
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener("resize",h); return () => window.removeEventListener("resize",h); }, []);

  useEffect(() => {
    if (open) { setCustomPans(loadPans()); setVisible(true); requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true))); }
    else { setAnimIn(false); const t = setTimeout(() => setVisible(false), 380); return () => clearTimeout(t); }
  }, [open]);
  if (!visible) return null;

  const { panName,editingId,sided,activeSide,a4,rings,buildNotes,selectedNote,newLetter,newOctave,newNoteSize,newNoteRing } = build;
  const presetPan = STANDARD_PANS.find(p => p.id === selectedPreset) || STANDARD_PANS[0];

  function previewTap(n, overrideA4) {
    if (!n?.midi) return;
    const useA4 = overrideA4 ?? a4;
    const ctx = getCtx(); synthNote(midiToFreq(n.midi, useA4), ctx.currentTime, ctx, 0.44);
    setPreviewNote(n.name); clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreviewNote(null), 600);
  }

  const sideRings   = rings[activeSide] || [{count:8,rotation:0}];
  const upperNotes  = buildNotes.filter(n => n.side !== "bottom");
  const bottomNotes = buildNotes.filter(n => n.side === "bottom");

  function moveNote(name, angle, ringIdx) {
    setB("buildNotes", buildNotes.map(n => {
      if (n.name !== name) return n;
      if (ringIdx === -1) return { ...n, pos:"ding", angle:null, ringIdx:-1 };
      return { ...n, pos:"ring", angle, ringIdx };
    }));
  }

  function addNote() {
    const midi = 12 + newOctave*12 + SEMITONE_NAMES.indexOf(newLetter);
    if (midi < 12 || midi > 120) return;
    const name = newLetter + newOctave;
    if (buildNotes.find(n => n.name === name)) { alert(`${name.replace("b","♭")} is already on this handpan.`); return; }
    const isDingSize = NOTE_SIZES[newNoteSize]?.isDing;
    const targetSide = sided === "double" ? activeSide : "upper";
    const centerOccupied = buildNotes.some(n =>
      n.side === targetSide && (n.pos === "ding" || n.ringIdx == null || n.ringIdx === -1) && n.angle == null
    );
    const forceToRing = (activeSide === "bottom" && isDingSize) || (isDingSize && centerOccupied);
    let angle = null, ringIdx = null;
    if (!isDingSize || forceToRing) {
      const sRings = rings[targetSide] || [{count:8,rotation:0}];
      const ri = Math.min(newNoteRing, sRings.length-1);
      const ring = sRings[ri];
      const slots = getSnapAngles(ring.count||8, ring.rotation||0);
      const sideNotesOnRing = buildNotes.filter(n => n.side === targetSide && (n.ringIdx??0) === ri && n.angle != null);
      const usedAngles = sideNotesOnRing.map(n => n.angle||0);
      const halfSlot = 360/ring.count/2;
      const byDist = [...slots].sort((a,b) => {
        const da = Math.abs(((a-180+360)%360)-180);
        const db = Math.abs(((b-180+360)%360)-180);
        return db - da;
      });
      const leftSlots  = byDist.filter(a => a > 180 && a < 360);
      const rightSlots = byDist.filter(a => a > 0   && a < 180);
      const orderedSlots = [];
      const maxLen = Math.max(leftSlots.length, rightSlots.length);
      for (let k = 0; k < maxLen; k++) {
        if (k < leftSlots.length)  orderedSlots.push(leftSlots[k]);
        if (k < rightSlots.length) orderedSlots.push(rightSlots[k]);
      }
      if (byDist.includes(180)) orderedSlots.unshift(180);
      if (byDist.includes(0))   orderedSlots.push(0);
      const freeSlot = orderedSlots.find(a => !usedAngles.some(ua => Math.abs(((ua-a+540)%360)-180) < halfSlot));
      if (freeSlot === undefined) { alert(`Ring ${ri+1} is full. Remove a note or add another ring.`); return; }
      angle = freeSlot; ringIdx = ri;
    }
    MIDI_TO_NAME[midi] = name;
    setBuild(b => ({ ...b,
      buildNotes:[...b.buildNotes, { name, midi, pos:(isDingSize&&!forceToRing)?"ding":"ring", angle, ringIdx, size:newNoteSize, side:targetSide }],
      selectedNote:name, showAddNote:false,
    }));
  }

  function updateNote(key, val) {
    setB("buildNotes", buildNotes.map(n => n.name === selectedNote ? { ...n, [key]:val } : n));
  }
  function removeNote(name) {
    setBuild(b => ({ ...b, buildNotes:b.buildNotes.filter(n => n.name !== name), selectedNote:b.selectedNote === name ? null : b.selectedNote }));
  }
  const selNote = buildNotes.find(n => n.name === selectedNote);

  function applyPreset() {
    const pan = STANDARD_PANS.find(p => p.id === selectedPreset); if (!pan) return;
    const panA4 = pan.a4 || 440;
    const freq = {}; pan.notes.forEach(n => { freq[n.name] = midiToFreq(n.midi, panA4); });
    onApply({ notes:pan.notes, freq, positions:pan.positions, rings:pan.rings||{upper:[{count:8,rotation:0}],bottom:[{count:6,rotation:0}]}, sided:pan.sided||"single", name:pan.name, a4:panA4 });
    onClose();
  }
  function applyCustom() {
    const pan = customPans.find(p => p.id === selectedCustom); if (!pan) return;
    const panA4 = pan.a4 || 440;
    const freq = {}; pan.notes.forEach(n => { freq[n.name] = midiToFreq(n.midi, panA4); });
    const panRings = pan.rings && !Array.isArray(pan.rings) ? pan.rings : { upper:Array.isArray(pan.rings)?pan.rings:[{count:8,rotation:0}], bottom:[{count:6,rotation:0}] };
    onApply({ notes:pan.notes, freq, positions:pan.positions, rings:panRings, sided:pan.sided||"single", name:pan.name, a4:panA4 });
    onClose();
  }

  function editCustom(pan) {
    const panRings = pan.rings && !Array.isArray(pan.rings) ? pan.rings : { upper:Array.isArray(pan.rings)?pan.rings:[{count:8,rotation:0}], bottom:[{count:6,rotation:0}] };
    const notes = pan.notes.map(n => {
      const posStr = pan.positions?.[n.name];
      const p = parsePosV2(posStr, n.side || "upper");
      const size = n.size || "medium";
      return { ...n, size, pos:p.isDing?"ding":"ring", angle:p.isDing?null:p.angle, ringIdx:p.isDing?null:p.ringIdx, side:n.side||"upper" };
    });
    setBuild({ ...EMPTY_BUILD(), editingId:pan.id, panName:pan.name.replace(/\s*·\s*(A4=)?\d+(Hz)?$/,""), a4:pan.a4||440, sided:pan.sided||"single", rings:panRings, buildNotes:notes });
    setTab("build");
  }

  function saveAndApply() {
    const realNotes = buildNotes.filter(n => n.name !== "_ph" && n.name !== "placeholder");
    if (!panName.trim() || realNotes.length < 1) return;
    const notesSorted = [...realNotes].sort((a,b) => a.midi - b.midi);
    const freq = {}; notesSorted.forEach(n => { freq[n.name] = midiToFreq(n.midi, a4); });
    const positions = buildPosMap(buildNotes);
    const effectiveSided = realNotes.some(n => n.side === "bottom") ? "double" : "single";
    const displayName = `${panName.trim()} · ${a4}Hz`;
    const existing = loadPans();
    let updated;
    if (editingId) {
      updated = existing.map(p => p.id === editingId ? { ...p, name:displayName, notes:notesSorted, freq, positions, rings, sided:effectiveSided, a4 } : p);
    } else {
      const newPan = { id:"custom_"+Date.now(), name:displayName, notes:notesSorted, freq, positions, rings, sided:effectiveSided, a4 };
      updated = [...existing, newPan];
    }
    savePans(updated); setCustomPans(updated);
    onApply({ notes:notesSorted, freq, positions, rings, sided:effectiveSided, name:displayName, a4 });
    setBuild(EMPTY_BUILD()); onClose();
  }

  function saveAsNew() {
    const realNotes = buildNotes.filter(n => n.name !== "_ph" && n.name !== "placeholder");
    if (!panName.trim() || realNotes.length < 1) return;
    const notesSorted = [...realNotes].sort((a,b) => a.midi - b.midi);
    const freq = {}; notesSorted.forEach(n => { freq[n.name] = midiToFreq(n.midi, a4); });
    const positions = buildPosMap(buildNotes);
    const effectiveSided = realNotes.some(n => n.side === "bottom") ? "double" : "single";
    const displayName = `${panName.trim()} · ${a4}Hz`;
    const newPan = { id:"custom_"+Date.now(), name:displayName, notes:notesSorted, freq, positions, rings, sided:effectiveSided, a4 };
    const existing = loadPans();
    const updated = [...existing, newPan];
    savePans(updated); setCustomPans(updated);
    onApply({ notes:notesSorted, freq, positions, rings, sided:effectiveSided, name:displayName, a4 });
    setBuild(EMPTY_BUILD()); onClose();
  }

  const BtnT = ({ active, onClick, children, color }) => (
    <button onClick={onClick} style={{
      background: active ? (color ? "rgba(100,200,130,0.18)" : "rgba(205,163,83,0.18)") : "rgba(255,255,255,0.04)",
      border:`1px solid ${active ? (color||"rgba(205,163,83,0.55)") : "rgba(255,255,255,0.08)"}`,
      color: active ? (color||"#ddc870") : "#7a6a50",
      borderRadius:7, padding:"5px 12px", cursor:"pointer", fontSize:11, fontFamily:FONT,
      transition:"all .14s", whiteSpace:"nowrap",
    }}>{children}</button>
  );

  const letterOpts = SEMITONE_NAMES.map(l => ({ value:l, label:l.replace("b","♭").replace("#","♯") }));
  const octaveOpts = [1,2,3,4,5,6,7].map(o => ({ value:o, label:`Octave ${o}` }));
  const sizeOpts   = Object.entries(NOTE_SIZES).map(([k,s]) => ({ value:k, label:s.label }));
  const ringOpts   = (rings[activeSide]||[]).map((_,i) => ({ value:i, label:`Ring ${i+1}` }));
  const isWide     = winW >= 560;
  const showDouble = sided === "double";

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(4px)",opacity:animIn?1:0,transition:"opacity .35s ease" }}/>
      <div style={{ position:"fixed",inset:0,zIndex:301,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",padding:"16px" }}>
        <div style={{ background:"#141108",border:"1px solid rgba(205,163,83,0.22)",borderRadius:16,width:"100%",maxWidth:880,maxHeight:"92vh",overflowY:"auto",fontFamily:FONT,pointerEvents:"all",
          opacity:animIn?1:0,transform:animIn?"scale(1) translateY(0)":"scale(.96) translateY(16px)",
          transition:"opacity .35s ease, transform .35s cubic-bezier(.32,.72,0,1)",boxShadow:"0 24px 80px rgba(0,0,0,0.75)" }}>

          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px 14px",borderBottom:"1px solid rgba(205,163,83,0.12)" }}>
            <div>
              <div style={{ fontSize:17,color:"#e8d098",fontWeight:700 }}>Handpan Workshop</div>
              <div style={{ fontSize:9,color:"#5a4a28",letterSpacing:3,textTransform:"uppercase",marginTop:2 }}>Select or build your instrument</div>
            </div>
            <button onClick={onClose} style={{ background:"none",border:"none",color:"#6a5830",fontSize:20,cursor:"pointer",padding:"4px 8px",lineHeight:1 }}>✕</button>
          </div>

          <div style={{ padding:"16px 22px 28px" }}>
            <div style={{ display:"flex",gap:6,marginBottom:20,flexWrap:"wrap" }}>
              <BtnT active={tab==="preset"} onClick={() => setTab("preset")}>🎵 Standard</BtnT>
              <BtnT active={tab==="custom"} color="#80d090"
                onClick={() => { const f=loadPans(); setCustomPans(f); setTab("custom"); if(!selectedCustom&&f.length) setSelectedCustom(f[0].id); }}>
                📦 My Pans{customPans.length > 0 ? ` (${customPans.length})` : ""}
              </BtnT>
              <BtnT active={tab==="build"} color="#a0b0e0" onClick={() => setTab("build")}>⚒ Build</BtnT>
            </div>

            {/* ── PRESET ── */}
            {tab === "preset" && (
              <div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:16 }}>
                  {STANDARD_PANS.map(p => (
                    <div key={p.id} style={{ display:"inline-flex",alignItems:"stretch",
                      border:`1px solid ${selectedPreset===p.id?"rgba(205,163,83,0.55)":"rgba(255,255,255,0.08)"}`,
                      borderRadius:7,overflow:"hidden",
                      background:selectedPreset===p.id?"rgba(205,163,83,0.10)":"rgba(255,255,255,0.03)",
                      transition:"all .15s",cursor:"pointer" }}
                      onClick={() => setSelectedPreset(p.id)}>
                      <div style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",
                        fontSize:11,fontFamily:FONT,color:selectedPreset===p.id?"#ddc870":"#7a6a50" }}>
                        <PanIcon size={12}/>
                        {p.sided === "double" && <PanIcon size={12}/>}
                        <span>{p.name}</span>
                      </div>
                      <button onClick={e => {
                        e.stopPropagation();
                        const panRings = p.rings && !Array.isArray(p.rings) ? p.rings : { upper:Array.isArray(p.rings)?p.rings:[{count:8,rotation:0}], bottom:[{count:6,rotation:0}] };
                        const notes = p.notes.map(n => {
                          const posStr = p.positions?.[n.name];
                          const parsed = parsePosV2(posStr, n.side||"upper");
                          return { ...n, size:n.size||"medium", pos:parsed.isDing?"ding":"ring", angle:parsed.isDing?null:parsed.angle, ringIdx:parsed.isDing?null:parsed.ringIdx, side:n.side||"upper" };
                        });
                        setBuild({ ...EMPTY_BUILD(), panName:p.name.replace(/\s*·\s*(A4=)?\d+(Hz)?$/,"")+" (copy)", a4:p.a4||440, sided:p.sided||"single", rings:panRings, buildNotes:notes });
                        setTab("build");
                      }} style={{ background:"rgba(160,160,220,0.10)",borderLeft:"1px solid rgba(255,255,255,0.07)",border:"none",color:"#a0b0e0",cursor:"pointer",padding:"0 10px",fontSize:10,fontFamily:FONT }}>Edit</button>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex",justifyContent:"center",marginBottom:10 }}>
                  <PreviewPan notes={presetPan.notes} positions={presetPan.positions}
                    ringsUpper={presetPan.rings?.upper||presetPan.rings||[{count:8,rotation:0}]}
                    ringsBottom={presetPan.rings?.bottom||[{count:6,rotation:0}]}
                    activeNote={previewNote} onNote={n => previewTap(n, presetPan.a4||440)} size={260} sid="preset"/>
                </div>
                <div style={{ fontSize:9,color:"#4a3a18",textAlign:"center",marginBottom:14,fontStyle:"italic" }}>Tap a note to preview its sound</div>
                <button onClick={applyPreset} style={{ width:"100%",padding:"11px",background:"rgba(205,163,83,0.20)",border:"1px solid rgba(205,163,83,0.50)",color:"#e8d098",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:FONT,fontWeight:600 }}>Use this handpan →</button>
              </div>
            )}

            {/* ── MY PANS ── */}
            {tab === "custom" && (
              <div>
                {customPans.length === 0 ? (
                  <div style={{ textAlign:"center",padding:"32px 0",color:"#4a3a18",fontStyle:"italic",fontSize:13 }}>No custom pans yet. Use the Build tab to create one.</div>
                ) : (
                  <>
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:18 }}>
                      {customPans.map(p => (
                        <div key={p.id} onClick={() => setSelectedCustom(p.id)} style={{
                          display:"inline-flex",alignItems:"stretch",
                          border:`1px solid ${selectedCustom===p.id?"rgba(100,200,130,0.55)":"rgba(255,255,255,0.08)"}`,
                          borderRadius:8,overflow:"hidden",cursor:"pointer",
                          background:selectedCustom===p.id?"rgba(100,200,130,0.10)":"rgba(255,255,255,0.03)",
                          transition:"all .15s",
                        }}>
                          <div style={{ display:"flex",alignItems:"center",gap:4,padding:"7px 10px",fontSize:12,color:selectedCustom===p.id?"#80d090":"#9a8a60",fontFamily:FONT,fontWeight:500 }}>
                            <PanIcon size={11}/>
                            {p.sided === "double" && <PanIcon size={11}/>}
                            <span>{p.name}</span>
                          </div>
                          <button onClick={e => { e.stopPropagation(); editCustom(p); }} style={{ background:"rgba(160,160,220,0.10)",borderLeft:"1px solid rgba(255,255,255,0.07)",border:"none",color:"#a0b0e0",cursor:"pointer",padding:"0 10px",fontSize:10,fontFamily:FONT }}>Edit</button>
                          <button onClick={e => {
                            e.stopPropagation();
                            if (!window.confirm(`Delete "${p.name}"?`)) return;
                            const u = customPans.filter(x => x.id !== p.id);
                            setCustomPans(u); savePans(u);
                            if (selectedCustom === p.id) setSelectedCustom(u[0]?.id || null);
                          }} style={{ background:"rgba(140,45,45,0.12)",borderLeft:"1px solid rgba(255,255,255,0.07)",border:"none",color:"#a85858",cursor:"pointer",padding:"0 10px",fontSize:12,fontFamily:FONT }}>✕</button>
                        </div>
                      ))}
                    </div>
                    {selectedCustom && (() => {
                      const pan = customPans.find(p => p.id === selectedCustom); if (!pan) return null;
                      const upper  = pan.notes.filter(n => n.side !== "bottom");
                      const bottom = pan.notes.filter(n => n.side === "bottom");
                      const isDouble = pan.sided === "double" && bottom.length > 0;
                      const panRingsUpper  = pan.rings?.upper  ? pan.rings.upper  : Array.isArray(pan.rings) ? pan.rings : [{count:8,rotation:0}];
                      const panRingsBottom = pan.rings?.bottom ? pan.rings.bottom : [{count:6,rotation:0}];
                      return (
                        <>
                          <div style={{ display:"flex",gap:4,justifyContent:"center",marginBottom:12,alignItems:"flex-start",width:"100%",overflow:"hidden" }}>
                            <div style={{ flex:isDouble?"1 1 0":"0 0 auto",minWidth:0,textAlign:"center",maxWidth:"270px" }}>
                              {isDouble && <div style={{ fontSize:8,color:"#5a4a28",letterSpacing:2,textTransform:"uppercase",marginBottom:4 }}>Upper</div>}
                              <PreviewPan notes={upper} positions={pan.positions||{}}
                                ringsUpper={panRingsUpper} ringsBottom={panRingsBottom}
                                activeNote={previewNote} onNote={n => previewTap(n, pan.a4||440)} size={260} sid="myU"/>
                            </div>
                            {isDouble && (
                              <div style={{ flex:"1 1 0",minWidth:0,textAlign:"center",maxWidth:"270px"}}>
                                <div style={{ fontSize:8,color:"#5a4a28",letterSpacing:2,textTransform:"uppercase",marginBottom:4 }}>Bottom</div>
                                <PreviewPan notes={bottom} positions={pan.positions||{}}
                                  ringsUpper={panRingsUpper} ringsBottom={panRingsBottom}
                                  activeNote={previewNote} onNote={n => previewTap(n, pan.a4||440)} size={260} sid="myB"/>
                              </div>
                            )}
                          </div>
                          <button onClick={applyCustom} style={{ width:"100%",padding:"11px",background:"rgba(100,200,130,0.18)",border:"1px solid rgba(100,200,130,0.45)",color:"#80d090",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:FONT,fontWeight:600 }}>Use this handpan →</button>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* ── BUILD ── */}
            {tab === "build" && (
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>

                <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                  <div style={{ fontSize:9,color:"#6a5a30",letterSpacing:2,textTransform:"uppercase" }}>Type</div>
                  <BtnT active={sided==="single"} onClick={() => setB("sided","single")}>○ Single</BtnT>
                  <BtnT active={sided==="double"} onClick={() => setB("sided","double")}>◎ Double</BtnT>
                  {showDouble && <>
                    <div style={{ width:1,height:18,background:"rgba(255,255,255,0.10)",margin:"0 4px" }}/>
                    <BtnT active={activeSide==="upper"}  onClick={() => setB("activeSide","upper")}>Upper</BtnT>
                    <BtnT active={activeSide==="bottom"} onClick={() => setB("activeSide","bottom")}>Bottom</BtnT>
                  </>}
                  <div style={{ marginLeft:"auto" }}>
                    <button onClick={() => { if (window.confirm("Reset the build and start fresh?")) setBuild(EMPTY_BUILD()); }} style={{ background:"rgba(140,45,45,0.12)",border:"1px solid rgba(140,45,45,0.25)",color:"#a85858",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:FONT }}>↺ Reset</button>
                  </div>
                </div>

                {/* Rings editor */}
                <div style={{ background:"rgba(205,163,83,0.05)",border:"1px solid rgba(205,163,83,0.18)",borderRadius:10,padding:"10px 14px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap" }}>
                    <div style={{ fontSize:9,color:"#c8a860",letterSpacing:2,textTransform:"uppercase",fontWeight:600 }}>Rings — {activeSide}</div>
                    <Dropdown value={sideRings.length}
                      onChange={v => {
                        const cur = rings[activeSide] || [{count:8,rotation:0}];
                        let next = [...cur];
                        while (next.length < v) next.push({count:6,rotation:0});
                        while (next.length > v) next.pop();
                        setB("rings", { ...rings, [activeSide]:next });
                      }}
                      options={[1,2,3].map(n => ({ value:n, label:`${n} ring${n>1?"s":""}` }))}
                      style={{ width:100 }}/>
                    <div style={{ fontSize:9,color:"#5a4a28" }}>Editing ring:</div>
                    {sideRings.map((_,ri) => (
                      <BtnT key={ri} active={build.editRingIdx===ri} onClick={() => setB("editRingIdx",ri)}>Ring {ri+1}</BtnT>
                    ))}
                  </div>
                  {sideRings.length > 0 && (() => {
                    const ri   = build.editRingIdx ?? 0;
                    const ring = sideRings[ri] || sideRings[0];
                    if (!ring) return null;
                    const maxRot = Math.round(180/ring.count);
                    function updateRing(key, val) {
                      const cur = rings[activeSide] || [];
                      const updated = cur.map((r, i) => {
                        if (i !== ri) return r;
                        if (key === "rotation") {
                          const delta = val - (r.rotation||0);
                          setB("buildNotes", buildNotes.map(n => {
                            if (n.side !== activeSide || (n.ringIdx??0) !== ri || n.angle == null) return n;
                            return { ...n, angle:((n.angle+delta)+360)%360 };
                          }));
                        }
                        if (key === "count") return { ...r, [key]:val, rotation:0 };
                        return { ...r, [key]:val };
                      });
                      setB("rings", { ...rings, [activeSide]:updated });
                    }
                    return (
                      <div style={{ display:"flex",gap:12,alignItems:"center",flexWrap:"wrap" }}>
                        <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                          <span style={{ fontSize:9,color:"#6a5a30" }}>Slots</span>
                          <Dropdown value={ring.count} onChange={v => updateRing("count",v)}
                            options={[4,5,6,7,8,9,10,11,12].map(n => ({ value:n, label:`${n}` }))} style={{ width:72 }}/>
                        </div>
                        <div style={{ display:"flex",gap:6,alignItems:"center",flex:1,minWidth:150 }}>
                          <span style={{ fontSize:9,color:"#6a5a30",whiteSpace:"nowrap" }}>Rotate</span>
                          <Slider min={-maxRot} max={maxRot} value={ring.rotation||0}
                            onChange={v => updateRing("rotation",v)} label={`${ring.rotation||0}°`}/>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Canvas area */}
                <div>
                  <div style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:isWide?"nowrap":"wrap" }}>
                    <div style={{ flex:"1 1 220px",maxWidth:270,display:showDouble&&!isWide&&activeSide==="bottom"?"none":"block" }}>
                      {showDouble && <div style={{ fontSize:9,color:"#6a5a30",textAlign:"center",letterSpacing:2,textTransform:"uppercase",marginBottom:4 }}>Upper</div>}
                      <BuilderCanvas notes={upperNotes} rings={rings.upper||[{count:8,rotation:0}]}
                        onMove={moveNote}
                        onNoteClick={n => {
                          previewTap(n);
                          const letter = n.name.replace(/\d/,"");
                          const octave = parseInt(n.name.match(/\d/)?.[0]||4);
                          setBuild(b => ({ ...b, selectedNote:b.selectedNote===n.name?null:n.name, newLetter:letter, newOctave:octave, newNoteSize:n.size||"medium", newNoteRing:Math.max(0,n.ringIdx??0) }));
                        }}
                        selectedNote={selectedNote} side="upper"/>
                    </div>
                    {showDouble && (
                      <div style={{ flex:"1 1 220px",maxWidth:270,display:!isWide&&activeSide==="upper"?"none":"block" }}>
                        <div style={{ fontSize:9,color:"#6a5a30",textAlign:"center",letterSpacing:2,textTransform:"uppercase",marginBottom:4 }}>Bottom</div>
                        <BuilderCanvas notes={bottomNotes} rings={rings.bottom||[{count:6,rotation:0}]}
                          onMove={moveNote}
                          onNoteClick={n => {
                            previewTap(n);
                            const letter = n.name.replace(/\d/,"");
                            const octave = parseInt(n.name.match(/\d/)?.[0]||4);
                            setBuild(b => ({ ...b, selectedNote:b.selectedNote===n.name?null:n.name, newLetter:letter, newOctave:octave, newNoteSize:n.size||"medium", newNoteRing:Math.max(0,n.ringIdx??0) }));
                          }}
                          selectedNote={selectedNote} side="bottom"/>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:9,color:"#2e2610",textAlign:"center",marginTop:6,fontStyle:"italic" }}>Drag notes to snap · click to select &amp; edit</div>
                </div>

                {/* Note editor */}
                <div style={{ background:"rgba(205,163,83,0.06)",border:"1px solid rgba(205,163,83,0.18)",borderRadius:10,padding:"12px 14px" }}>
                  <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:10 }}>
                    <div style={{ flex:"1 1 170px" }}>
                      <div style={{ fontSize:8,color:"#6a5a30",letterSpacing:2,textTransform:"uppercase",marginBottom:4 }}>Pitch</div>
                      <div style={{ display:"flex",gap:5,alignItems:"center" }}>
                        <Dropdown value={newLetter} onChange={l => setB("newLetter",l)} options={letterOpts} style={{ flex:1 }}/>
                        <Dropdown value={newOctave} onChange={o => setB("newOctave",o)} options={octaveOpts} style={{ width:88 }}/>
                        <button onClick={() => { const midi=12+newOctave*12+SEMITONE_NAMES.indexOf(newLetter); const ctx=getCtx(); synthNote(midiToFreq(midi,a4),ctx.currentTime,ctx,.44); }}
                          style={{ background:"rgba(205,163,83,0.12)",border:"1px solid rgba(205,163,83,0.30)",color:"#c9a84c",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:12 }}>▶</button>
                      </div>
                    </div>
                    <div style={{ flex:"1 1 130px" }}>
                      <div style={{ fontSize:8,color:"#6a5a30",letterSpacing:2,textTransform:"uppercase",marginBottom:4 }}>Size / Role</div>
                      <Dropdown value={newNoteSize} onChange={s => setB("newNoteSize",s)} options={sizeOpts}/>
                    </div>
                  </div>

                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    <button onClick={addNote} style={{ flex:1,padding:"7px 12px",background:"rgba(100,200,130,0.15)",border:"1px solid rgba(100,200,130,0.40)",color:"#80d090",borderRadius:7,cursor:"pointer",fontSize:11,fontFamily:FONT,fontWeight:600 }}>
                      + Add to {sided==="double"?activeSide:"upper"}
                    </button>

                    {selNote && (
                      <>
                        <button onClick={() => {
                          const midi = 12+newOctave*12+SEMITONE_NAMES.indexOf(newLetter);
                          const name = newLetter+newOctave;
                          const isDingSize = NOTE_SIZES[newNoteSize]?.isDing;
                          const forceToRing = selNote.side === "bottom" && isDingSize;
                          let updates = { size:newNoteSize };
                          if (isDingSize && !forceToRing) {
                            updates = { ...updates, pos:"ding", angle:null, ringIdx:null };
                          } else if (forceToRing && selNote.angle == null) {
                            const sRings = rings[selNote.side||"upper"] || [{count:8,rotation:0}];
                            const ri = Math.min(newNoteRing, sRings.length-1);
                            const ring = sRings[ri];
                            const slots = getSnapAngles(ring.count||8, ring.rotation||0);
                            const used = buildNotes.filter(n => n.name !== selNote.name && n.side === selNote.side && (n.ringIdx??0) === ri && n.angle != null).map(n => n.angle||0);
                            const hs = 360/ring.count/2;
                            const free = slots.find(a => !used.some(ua => Math.abs(((ua-a+540)%360)-180) < hs)) || slots[0];
                            updates = { ...updates, pos:"ring", angle:free, ringIdx:ri };
                          }
                          if (name !== selNote.name) {
                            if (buildNotes.find(n => n.name === name && n.name !== selNote.name)) { alert(`${name.replace("b","♭")} is already on this handpan.`); return; }
                            updates = { ...updates, name, midi };
                            MIDI_TO_NAME[midi] = name;
                          }
                          setBuild(b => ({ ...b,
                            buildNotes:b.buildNotes.map(n => n.name === selectedNote ? { ...n, ...updates } : n),
                            selectedNote:updates.name || selectedNote,
                          }));
                        }} style={{ flex:1,padding:"7px 12px",background:"rgba(205,163,83,0.15)",border:"1px solid rgba(205,163,83,0.40)",color:"#ddc870",borderRadius:7,cursor:"pointer",fontSize:11,fontFamily:FONT,fontWeight:600 }}>
                          ↻ Update {selNote.name.replace("b","♭")}
                        </button>
                        <button onClick={() => removeNote(selectedNote)} style={{ padding:"7px 12px",background:"rgba(140,45,45,0.12)",border:"1px solid rgba(140,45,45,0.28)",color:"#a85858",borderRadius:7,cursor:"pointer",fontSize:11,fontFamily:FONT }}>Remove</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Note list */}
                <div>
                  <div style={{ fontSize:9,color:"#6a5a30",letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>Notes ({buildNotes.length}) — click to select</div>
                  <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                    {buildNotes.map(n => (
                      <button key={n.name} onClick={() => {
                        previewTap(n);
                        const letter = n.name.replace(/\d/,"");
                        const octave = parseInt(n.name.match(/\d/)?.[0]||4);
                        setBuild(b => ({ ...b, selectedNote:b.selectedNote===n.name?null:n.name, newLetter:letter, newOctave:octave, newNoteSize:n.size||"medium", newNoteRing:n.ringIdx??0 }));
                      }} style={{ background:selectedNote===n.name?"rgba(205,163,83,0.20)":"rgba(255,255,255,0.04)",border:`1px solid ${selectedNote===n.name?"rgba(205,163,83,0.55)":"rgba(255,255,255,0.08)"}`,color:selectedNote===n.name?"#ddc870":"#8a7850",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontSize:10,fontFamily:FONT }}>
                        {n.name.replace("b","♭")}
                        <span style={{ fontSize:8,color:"#5a4a28",marginLeft:3 }}>{NOTE_SIZES[n.size||"medium"]?.label}</span>
                        {n.side === "bottom" && <span style={{ fontSize:7,color:"#4a5a28",marginLeft:2 }}>(bot)</span>}
                      </button>
                    ))}
                    {buildNotes.length === 0 && <span style={{ fontSize:10,color:"#3a2c10",fontStyle:"italic" }}>No notes yet — use the fields above to add</span>}
                  </div>
                </div>

                {/* Save */}
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:14 }}>
                  <div style={{ fontSize:9,color:"#6a5a30",letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>{editingId ? "Save changes" : "Save & use"}</div>
                  <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,padding:"8px 12px" }}>
                    <span style={{ fontSize:9,color:"#6a5a30",letterSpacing:1,whiteSpace:"nowrap" }}>A4 tuning</span>
                    <Slider min={400} max={499} step={1} value={a4} onChange={v => setB("a4",v)} label={`${a4} Hz`}/>
                    <button onClick={() => setB("a4",440)} style={{ background:"rgba(205,163,83,0.10)",border:"1px solid rgba(205,163,83,0.25)",color:"#c9a84c",borderRadius:5,padding:"2px 8px",cursor:"pointer",fontSize:9,fontFamily:FONT,flexShrink:0 }}>Reset</button>
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                    <input value={panName} onChange={e => setB("panName",e.target.value)} placeholder="Name your handpan…"
                      style={{ flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",borderRadius:7,padding:"7px 12px",color:"#d4c8a8",fontSize:12,fontFamily:FONT,outline:"none" }}/>
                    <button onClick={saveAndApply} disabled={!panName.trim()||buildNotes.length<1} style={{ background:panName.trim()?"rgba(100,200,130,0.18)":"rgba(255,255,255,0.03)",border:`1px solid ${panName.trim()?"rgba(100,200,130,0.45)":"rgba(255,255,255,0.07)"}`,color:panName.trim()?"#80d090":"#3a3a30",borderRadius:7,padding:"8px 14px",cursor:panName.trim()?"pointer":"default",fontSize:12,fontFamily:FONT,fontWeight:600,whiteSpace:"nowrap" }}>{editingId ? "Save changes →" : "Save & use →"}</button>
                    {editingId && (
                      <button onClick={saveAsNew} disabled={!panName.trim()||buildNotes.length<1} style={{ background:"rgba(160,160,220,0.15)",border:"1px solid rgba(160,160,220,0.40)",color:"#a0b0e0",borderRadius:7,padding:"8px 14px",cursor:"pointer",fontSize:12,fontFamily:FONT,fontWeight:600,whiteSpace:"nowrap" }}>Save as new →</button>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
