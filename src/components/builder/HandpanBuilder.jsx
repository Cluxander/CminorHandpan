import { useState, useEffect, useRef } from "react";
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

  // Tab button helper
  const BtnT = ({ active, onClick, children, color }) => {
    let cls = "hp-builder-tab";
    if (active) {
      if (color === "#80d090") cls += " hp-builder-tab--active-green";
      else if (color === "#a0b0e0") cls += " hp-builder-tab--active-blue";
      else cls += " hp-builder-tab--active";
    } else {
      cls += " hp-builder-tab--inactive";
    }
    return <button onClick={onClick} className={cls}>{children}</button>;
  };

  const letterOpts = SEMITONE_NAMES.map(l => ({ value:l, label:l.replace("b","♭").replace("#","♯") }));
  const octaveOpts = [1,2,3,4,5,6,7].map(o => ({ value:o, label:`Octave ${o}` }));
  const sizeOpts   = Object.entries(NOTE_SIZES).map(([k,s]) => ({ value:k, label:s.label }));
  const ringOpts   = (rings[activeSide]||[]).map((_,i) => ({ value:i, label:`Ring ${i+1}` }));
  const isWide     = winW >= 560;
  const showDouble = sided === "double";

  return (
    <>
      <div onClick={onClose} className="hp-builder-backdrop"
        style={{ opacity: animIn ? 1 : 0 }}/>
      <div className="hp-builder-outer">
        <div className="hp-builder-panel"
          style={{
            opacity: animIn ? 1 : 0,
            transform: animIn ? "scale(1) translateY(0)" : "scale(.96) translateY(16px)",
          }}>

          <div className="hp-builder-header">
            <div>
              <div className="hp-builder-header__title">Handpan Workshop</div>
              <div className="hp-builder-header__sub">Select or build your instrument</div>
            </div>
            <button onClick={onClose} className="hp-builder-header__close">✕</button>
          </div>

          <div className="hp-builder-body">
            <div className="hp-builder-tabs">
              <BtnT active={tab==="preset"} onClick={() => setTab("preset")}>🎵 Standard</BtnT>
              <BtnT active={tab==="custom"} color="#80d090"
                onClick={() => { const f=loadPans(); setCustomPans(f); setTab("custom"); if(!selectedCustom&&f.length) setSelectedCustom(f[0].id); }}>
                📦 My Pans{customPans.length > 0 ? ` (${customPans.length})` : ""}
              </BtnT>
              <BtnT active={tab==="build"} color="#a0b0e0" onClick={() => setTab("build")}>⚒ Build</BtnT>
            </div>

            {/* ── PRESET ── */}
            {tab === "preset" && (
              <div className="hp-builder-tab-layout">
                {/* LEFT: handpan preview */}
                <div className="hp-builder-tab-left">
                  <div className="hp-preview-center">
                    <PreviewPan notes={presetPan.notes} positions={presetPan.positions}
                      ringsUpper={presetPan.rings?.upper||presetPan.rings||[{count:8,rotation:0}]}
                      ringsBottom={presetPan.rings?.bottom||[{count:6,rotation:0}]}
                      activeNote={previewNote} onNote={n => previewTap(n, presetPan.a4||440)} size={260} sid="preset"/>
                  </div>
                  <div className="hp-preset-hint">Tap a note to preview its sound</div>
                </div>
                {/* RIGHT: preset list + action */}
                <div className="hp-builder-tab-right">
                  <div className="hp-preset-list">
                    {STANDARD_PANS.map(p => (
                      <div key={p.id}
                        className={`hp-preset-item ${selectedPreset===p.id ? "hp-preset-item--selected" : "hp-preset-item--default"}`}
                        onClick={() => setSelectedPreset(p.id)}>
                        <div className={`hp-preset-item__label ${selectedPreset===p.id ? "hp-preset-item__label--selected" : "hp-preset-item__label--default"}`}>
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
                        }} className="hp-preset-item__edit-btn">Edit</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={applyPreset} className="hp-btn-use-preset">Use this handpan →</button>
                </div>
              </div>
            )}

            {/* ── MY PANS ── */}
            {tab === "custom" && (
              <div className="hp-builder-tab-layout">
                {/* LEFT: handpan preview */}
                <div className="hp-builder-tab-left">
                  {customPans.length === 0 ? (
                    <div className="hp-builder-tab-empty">No custom pans yet.</div>
                  ) : selectedCustom ? (() => {
                    const pan = customPans.find(p => p.id === selectedCustom); if (!pan) return null;
                    const upper  = pan.notes.filter(n => n.side !== "bottom");
                    const bottom = pan.notes.filter(n => n.side === "bottom");
                    const isDouble = pan.sided === "double" && bottom.length > 0;
                    const panRingsUpper  = pan.rings?.upper  ? pan.rings.upper  : Array.isArray(pan.rings) ? pan.rings : [{count:8,rotation:0}];
                    const panRingsBottom = pan.rings?.bottom ? pan.rings.bottom : [{count:6,rotation:0}];
                    return (
                      <div className="hp-custom-preview-row">
                        <div className={`hp-custom-preview-col ${isDouble ? "hp-custom-preview-col--double" : "hp-custom-preview-col--single"}`}>
                          {isDouble && <div className="hp-custom-side-label">Upper</div>}
                          <PreviewPan notes={upper} positions={pan.positions||{}}
                            ringsUpper={panRingsUpper} ringsBottom={panRingsBottom}
                            activeNote={previewNote} onNote={n => previewTap(n, pan.a4||440)} size={260} sid="myU"/>
                        </div>
                        {isDouble && (
                          <div className="hp-custom-preview-col hp-custom-preview-col--double">
                            <div className="hp-custom-side-label">Bottom</div>
                            <PreviewPan notes={bottom} positions={pan.positions||{}}
                              ringsUpper={panRingsUpper} ringsBottom={panRingsBottom}
                              activeNote={previewNote} onNote={n => previewTap(n, pan.a4||440)} size={260} sid="myB"/>
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="hp-builder-tab-empty">← Select a pan to preview</div>
                  )}
                </div>
                {/* RIGHT: pan list + action */}
                <div className="hp-builder-tab-right">
                  {customPans.length === 0 ? (
                    <div className="hp-custom-empty">No custom pans yet. Use the Build tab to create one.</div>
                  ) : (
                    <>
                      <div className="hp-custom-list">
                        {customPans.map(p => (
                          <div key={p.id} onClick={() => setSelectedCustom(p.id)}
                            className={`hp-custom-item ${selectedCustom===p.id ? "hp-custom-item--selected" : "hp-custom-item--default"}`}>
                            <div className={`hp-custom-item__label ${selectedCustom===p.id ? "hp-custom-item__label--selected" : "hp-custom-item__label--default"}`}>
                              <PanIcon size={11}/>
                              {p.sided === "double" && <PanIcon size={11}/>}
                              <span>{p.name}</span>
                            </div>
                            <button onClick={e => { e.stopPropagation(); editCustom(p); }}
                              className="hp-custom-item__edit-btn">Edit</button>
                            <button onClick={e => {
                              e.stopPropagation();
                              if (!window.confirm(`Delete "${p.name}"?`)) return;
                              const u = customPans.filter(x => x.id !== p.id);
                              setCustomPans(u); savePans(u);
                              if (selectedCustom === p.id) setSelectedCustom(u[0]?.id || null);
                            }} className="hp-custom-item__delete-btn">✕</button>
                          </div>
                        ))}
                      </div>
                      {selectedCustom && (
                        <button onClick={applyCustom} className="hp-btn-use-custom">Use this handpan →</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── BUILD ── */}
            {tab === "build" && (
              <div className="hp-build-body hp-builder-tab-layout">

                {/* LEFT: interactive canvas */}
                <div className="hp-builder-tab-left">

                {/* Canvas area */}
                <div className="hp-canvas-area">
                  <div className={`hp-canvas-row ${isWide ? "hp-canvas-row--wide" : ""}`}>
                    <div className="hp-canvas-col"
                      style={{ display: showDouble && !isWide && activeSide === "bottom" ? "none" : "block" }}>
                      {showDouble && <div className="hp-canvas-side-label">Upper</div>}
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
                      <div className="hp-canvas-col"
                        style={{ display: !isWide && activeSide === "upper" ? "none" : "block" }}>
                        <div className="hp-canvas-side-label">Bottom</div>
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
                  <div className="hp-canvas-hint">Drag notes to snap · click to select &amp; edit</div>
                </div>

                </div>{/* end hp-builder-tab-left */}

                {/* RIGHT: all controls */}
                <div className="hp-builder-tab-right">

                <div className="hp-build-type-row">
                  <div className="hp-build-type-label">Type</div>
                  <BtnT active={sided==="single"} onClick={() => setB("sided","single")}>○ Single</BtnT>
                  <BtnT active={sided==="double"} onClick={() => setB("sided","double")}>◎ Double</BtnT>
                  {showDouble && <>
                    <div className="hp-build-divider"/>
                    <BtnT active={activeSide==="upper"}  onClick={() => setB("activeSide","upper")}>Upper</BtnT>
                    <BtnT active={activeSide==="bottom"} onClick={() => setB("activeSide","bottom")}>Bottom</BtnT>
                  </>}
                  <div className="hp-build-reset-btn-wrap">
                    <button onClick={() => { if (window.confirm("Reset the build and start fresh?")) setBuild(EMPTY_BUILD()); }}
                      className="hp-btn-reset-build">↺ Reset</button>
                  </div>
                </div>

                {/* Rings editor */}
                <div className="hp-rings-editor">
                  <div className="hp-rings-editor__header">
                    <div className="hp-rings-editor__title">Rings — {activeSide}</div>
                    <Dropdown value={sideRings.length}
                      onChange={v => {
                        const cur = rings[activeSide] || [{count:8,rotation:0}];
                        let next = [...cur];
                        while (next.length < v) next.push({count:6,rotation:0});
                        while (next.length > v) next.pop();
                        setB("rings", { ...rings, [activeSide]:next });
                      }}
                      options={[1,2,3].map(n => ({ value:n, label:`${n} ring${n>1?"s":""}` }))}
                      className="hp-dropdown--w100"/>
                    <div className="hp-rings-editor__sub">Editing ring:</div>
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
                      <div className="hp-rings-editor__slots-row">
                        <div className="hp-rings-editor__slots-item">
                          <span className="hp-rings-editor__slots-label">Slots</span>
                          <Dropdown value={ring.count} onChange={v => updateRing("count",v)}
                            options={[4,5,6,7,8,9,10,11,12].map(n => ({ value:n, label:`${n}` }))} className="hp-dropdown--w72"/>
                        </div>
                        <div className="hp-rings-editor__rotate-item">
                          <span className="hp-rings-editor__rotate-label">Rotate</span>
                          <Slider min={-maxRot} max={maxRot} value={ring.rotation||0}
                            onChange={v => updateRing("rotation",v)} label={`${ring.rotation||0}°`}/>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Note editor */}
                <div className="hp-note-editor">
                  <div className="hp-note-editor__row">
                    <div className="hp-note-editor__pitch-col">
                      <div className="hp-note-editor__sub-label">Pitch</div>
                      <div className="hp-note-editor__pitch-row">
                        <Dropdown value={newLetter} onChange={l => setB("newLetter",l)} options={letterOpts} className="hp-dropdown--flex"/>
                        <Dropdown value={newOctave} onChange={o => setB("newOctave",o)} options={octaveOpts} className="hp-dropdown--w88"/>
                        <button onClick={() => { const midi=12+newOctave*12+SEMITONE_NAMES.indexOf(newLetter); const ctx=getCtx(); synthNote(midiToFreq(midi,a4),ctx.currentTime,ctx,.44); }}
                          className="hp-btn-preview-note">▶</button>
                      </div>
                    </div>
                    <div className="hp-note-editor__size-col">
                      <div className="hp-note-editor__sub-label">Size / Role</div>
                      <Dropdown value={newNoteSize} onChange={s => setB("newNoteSize",s)} options={sizeOpts}/>
                    </div>
                  </div>

                  <div className="hp-note-editor__btn-row">
                    <button onClick={addNote} className="hp-btn-add-note">
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
                        }} className="hp-btn-update-note">
                          ↻ Update {selNote.name.replace("b","♭")}
                        </button>
                        <button onClick={() => removeNote(selectedNote)} className="hp-btn-remove-note">Remove</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Note list */}
                <div className="hp-note-list-section">
                  <div className="hp-note-list__title">Notes ({buildNotes.length}) — click to select</div>
                  <div className="hp-note-list__chips">
                    {buildNotes.map(n => (
                      <button key={n.name} onClick={() => {
                        previewTap(n);
                        const letter = n.name.replace(/\d/,"");
                        const octave = parseInt(n.name.match(/\d/)?.[0]||4);
                        setBuild(b => ({ ...b, selectedNote:b.selectedNote===n.name?null:n.name, newLetter:letter, newOctave:octave, newNoteSize:n.size||"medium", newNoteRing:n.ringIdx??0 }));
                      }} className={`hp-note-list-btn ${selectedNote===n.name ? "hp-note-list-btn--selected" : "hp-note-list-btn--default"}`}>
                        {n.name.replace("b","♭")}
                        <span className="hp-note-list-btn__size">{NOTE_SIZES[n.size||"medium"]?.label}</span>
                        {n.side === "bottom" && <span className="hp-note-list-btn__side">(bot)</span>}
                      </button>
                    ))}
                    {buildNotes.length === 0 && <span className="hp-note-list__empty">No notes yet — use the fields above to add</span>}
                  </div>
                </div>

                {/* Save */}
                <div className="hp-save-section">
                  <div className="hp-save-section__label">{editingId ? "Save changes" : "Save & use"}</div>
                  <div className="hp-a4-row">
                    <span className="hp-a4-row__label">A4 tuning</span>
                    <Slider min={400} max={499} step={1} value={a4} onChange={v => setB("a4",v)} label={`${a4} Hz`}/>
                    <button onClick={() => setB("a4",440)} className="hp-btn-reset-a4">Reset</button>
                  </div>
                  <div className="hp-save-row">
                    <input value={panName} onChange={e => setB("panName",e.target.value)} placeholder="Name your handpan…"
                      className="hp-pan-name-input"/>
                    <button onClick={saveAndApply} disabled={!panName.trim()||buildNotes.length<1}
                      className={`hp-btn-save-apply ${panName.trim() ? "hp-btn-save-apply--enabled" : "hp-btn-save-apply--disabled"}`}>
                      {editingId ? "Save changes →" : "Save & use →"}
                    </button>
                    {editingId && (
                      <button onClick={saveAsNew} disabled={!panName.trim()||buildNotes.length<1}
                        className="hp-btn-save-as-new">Save as new →</button>
                    )}
                  </div>
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
