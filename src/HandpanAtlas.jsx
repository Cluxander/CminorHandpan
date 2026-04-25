import { useState, useMemo, useCallback, useRef } from "react";
import "./styles/handpan.css";

import { FONT, NOTE_COLOR } from "./constants/colors.js";
import { CAT_ORDER, CAT_STYLE } from "./constants/chords.js";
import { STANDARD_PANS } from "./constants/handpan.js";

import { detectChords, mergeChords } from "./utils/chordDetection.js";
import { midiToFreq } from "./utils/geometry.js";

import { getCtx, synthNote, playChord, BEAT_SEC } from "./audio/synth.js";

import HandpanDiagram    from "./components/HandpanDiagram.jsx";
import FilterModal       from "./components/FilterModal.jsx";
import ChordCard         from "./components/ChordCard.jsx";
import SavedChordsStrip  from "./components/SavedChordsStrip.jsx";
import StickyHeader      from "./components/StickyHeader.jsx";
import AppFooter         from "./components/AppFooter.jsx";
import HandpanBuilder    from "./components/builder/HandpanBuilder.jsx";

// Add Google Fonts if not already present
if (typeof document !== "undefined" && !document.querySelector("#hp-font")) {
  const l = document.createElement("link");
  l.id = "hp-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

export default function HandpanAtlas() {
  const [activeNotes,  setActiveNotes]  = useState([]);
  const [panNotes,     setPanNotes]     = useState([]);
  const [panFiltering, setPanFiltering] = useState(false);
  const [selectedKey,  setSelectedKey]  = useState(null);

  const [builderOpen,  setBuilderOpen]  = useState(false);
  const stickyPanRef = useRef(null);

  const [savedChords, setSavedChords] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hp_saved_chords") || "[]"); } catch(e) { return []; }
  });

  function saveChord() {
    const notes = activeNotes.length > 0 ? activeNotes : cardHighlightNotes;
    if (notes.length === 0) return;
    const key = [...notes].sort().join("|");
    if (savedChords.some(c => c.key === key)) return;
    const newChords = [...savedChords, { key, notes:[...notes] }];
    setSavedChords(newChords);
    try { localStorage.setItem("hp_saved_chords", JSON.stringify(newChords)); } catch(e){}
  }

  const [currentPan, setCurrentPan] = useState(() => {
    try {
      const saved = localStorage.getItem("hp_last_pan");
      if (saved) { const p = JSON.parse(saved); if (p?.notes?.length) return p; }
    } catch(e){}
    const p = STANDARD_PANS[0];
    const freq = {}; p.notes.forEach(n => { freq[n.name] = midiToFreq(n.midi); });
    return { notes:p.notes, freq, positions:p.positions, rings:p.rings, sided:p.sided, name:p.name };
  });

  const applyHandpan = useCallback(pan => {
    let rings = pan.rings;
    if (!rings) rings = { upper:[{count:8,rotation:0}], bottom:[{count:6,rotation:0}] };
    else if (Array.isArray(rings)) rings = { upper:rings, bottom:[{count:6,rotation:0}] };
    const newPan = { notes:pan.notes, freq:pan.freq, positions:pan.positions, rings, sided:pan.sided||"single", name:pan.name, a4:pan.a4||440 };
    setCurrentPan(newPan);
    try { localStorage.setItem("hp_last_pan", JSON.stringify(newPan)); } catch(e){}
    setActiveNotes([]); setPanNotes([]); setPanFiltering(false); setSelectedKey(null);
  }, []);

  const [filters,    setFilters]    = useState({ noteCounts:[3,4], cats:["Major","Minor","Diminished","Suspended"], notes:[], chordNames:[], hideDuplicates:true });
  const [search,     setSearch]     = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [strum,      setStrum]      = useState(true);

  const panMode = panFiltering && panNotes.length > 0;

  const panChords       = useMemo(() => mergeChords(detectChords(currentPan.notes)), [currentPan]);
  const panChordNames   = useMemo(() => [...new Set(panChords.map(c => c.name))].sort(), [panChords]);
  const panAvailableCats = useMemo(() => CAT_ORDER.filter(cat => panChords.some(c => c.cat === cat)), [panChords]);

  const relatedKeys = useMemo(() => {
    if (activeNotes.length === 0 && !selectedKey) return new Set();
    if (selectedKey) {
      const card = panChords.find(c => c.key === selectedKey);
      if (!card) return new Set();
      return new Set(panChords.filter(c => card.notes.every(n => c.notes.includes(n))).map(c => c.key));
    }
    return new Set(panChords.filter(c => activeNotes.every(n => c.notes.includes(n))).map(c => c.key));
  }, [activeNotes, selectedKey, panChords]);

  const [progHighlightNotes, setProgHighlightNotes] = useState([]);
  const progPlayingRef = useRef(false);

  const handleNoteToggle = useCallback(noteName => {
    const freq = currentPan.freq?.[noteName] ||
      (() => { const n = currentPan.notes?.find(x => x.name === noteName); return n ? midiToFreq(n.midi, currentPan.a4||440) : null; })();
    if (freq) { const ctx = getCtx(); synthNote(freq, ctx.currentTime, ctx, 0.44); }

    if (progPlayingRef.current) {
      setProgHighlightNotes([noteName]);
      setTimeout(() => {}, Math.round(BEAT_SEC * 1000));
      return;
    }

    setPanFiltering(true);
    setSelectedKey(null);
    setCardHighlightNotes([]);
    setActiveNotes(prev => {
      const was  = prev.includes(noteName);
      const next = was ? prev.filter(n => n !== noteName) : [...prev, noteName];
      setPanNotes(next);
      if (next.length === 0) setPanFiltering(false);
      return next;
    });
  }, [currentPan]);

  const [cardHighlightNotes, setCardHighlightNotes] = useState([]);

  const handleChordClick = chord => {
    playChord(chord.notes, strum, currentPan.freq);
    if (selectedKey === chord.key) { setSelectedKey(null); setCardHighlightNotes([]); return; }
    setSelectedKey(chord.key);
    setCardHighlightNotes(chord.notes);
  };

  const showAll    = () => { setPanFiltering(false); setSelectedKey(null); setCardHighlightNotes([]); };
  const clearAll   = () => { setActiveNotes([]); setPanNotes([]); setPanFiltering(false); setSelectedKey(null); setCardHighlightNotes([]); };
  const clearFilters = () => setFilters({ noteCounts:[], cats:[], notes:[], chordNames:[], hideDuplicates:false });

  const filtered = useMemo(() => {
    let list = panChords;

    if (panMode) {
      list = list.filter(c => panNotes.every(n => c.notes.includes(n)));
    } else {
      const { noteCounts, cats, notes, chordNames } = filters;
      if (noteCounts.length > 0) list = list.filter(c => noteCounts.includes(c.noteCount));
      if (cats.length > 0)       list = list.filter(c => cats.includes(c.cat));
      if (notes.length > 0)      list = list.filter(c => notes.some(n => c.notes.includes(n)));
      if (chordNames.length > 0) list = list.filter(c => chordNames.includes(c.name));
    }

    if (search.trim()) {
      const q = search.toLowerCase().replace("♭","b").replace("♯","#").trim();
      const tokens = q.split(/\s+/);
      list = list.filter(c => {
        const rootL = c.root.toLowerCase(), nameL = c.name.toLowerCase(), catL = c.cat.toLowerCase();
        return tokens.every(tok =>
          rootL.includes(tok) || nameL.includes(tok) || catL.includes(tok) ||
          c.notes.some(n => n.toLowerCase().includes(tok)) ||
          rootL.replace(/\d/,"").includes(tok)
        );
      });
    }

    if (filters.hideDuplicates) {
      const groups = new Map();
      for (const c of list) {
        const groupKey = c.root + "|" + c.name;
        const avgMidi = c.notes.reduce((sum, n) => {
          const note = currentPan.notes.find(x => x.name === n);
          return sum + (note ? note.midi : 0);
        }, 0) / c.notes.length;
        if (!groups.has(groupKey) || avgMidi < groups.get(groupKey).avgMidi)
          groups.set(groupKey, { chord:c, avgMidi });
      }
      list = Array.from(groups.values()).map(g => g.chord);
    }

    if (activeNotes.length > 0) {
      const activeSet = new Set(activeNotes);
      list = [...list].sort((a, b) => {
        const aAll = activeNotes.every(n => a.notes.includes(n));
        const bAll = activeNotes.every(n => b.notes.includes(n));
        const aEx  = aAll && a.notes.length === activeNotes.length;
        const bEx  = bAll && b.notes.length === activeNotes.length;
        if (aEx && !bEx) return -1;
        if (bEx && !aEx) return 1;
        if (aAll && !bAll) return -1;
        if (bAll && !aAll) return 1;
        const aM = a.notes.filter(n => activeSet.has(n)).length;
        const bM = b.notes.filter(n => activeSet.has(n)).length;
        return bM - aM;
      });
    }

    return list;
  }, [panMode, panNotes, activeNotes, filters, search, panChords, currentPan]);

  const grouped = useMemo(() => {
    const g = {};
    panAvailableCats.forEach(cat => { g[cat] = {}; });
    filtered.forEach(c => {
      if (!g[c.cat]) g[c.cat] = {};
      if (!g[c.cat][c.name]) g[c.cat][c.name] = [];
      g[c.cat][c.name].push(c);
    });
    return g;
  }, [filtered]);

  const activeFilterCount = filters.noteCounts.length + filters.cats.length + filters.notes.length + filters.chordNames.length;

  return (
    <div style={{ minHeight:"100vh",background:"#0a0906",color:"#d4c8a8",fontFamily:FONT,WebkitTextSizeAdjust:"100%" }}>

      <StickyHeader onHeight={h => { if (stickyPanRef.current) stickyPanRef.current.style.top = h + "px"; }}/>

      {/* Sticky handpan */}
      <div ref={stickyPanRef} style={{ position:"sticky",top:0,zIndex:99,background:"rgba(8,7,4,0.97)",borderBottom:"1px solid rgba(205,163,83,0.15)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",padding:"10px 12px 10px",userSelect:"none",WebkitUserSelect:"none" }}>
        <div style={{ maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
          {/* Top row */}
          <div style={{ width:"100%",display:"flex",alignItems:"stretch",gap:8,height:30 }}>
            <button onClick={() => setBuilderOpen(true)} title="Open Handpan Workshop"
              style={{ background:"rgba(205,163,83,0.10)",border:"1px solid rgba(205,163,83,0.25)",borderRadius:7,padding:"0 10px",cursor:"pointer",flexShrink:0,fontSize:10,color:"#c9a84c",fontFamily:FONT,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",overflow:"hidden",maxWidth:"45%" }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1"/>
                <circle cx="7" cy="2.5" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="10.7" cy="4.8" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="10.7" cy="9.2" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="7" cy="11.5" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="3.3" cy="9.2" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="3.3" cy="4.8" r="1.2" fill="currentColor" opacity=".7"/>
              </svg>
              <span style={{ fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{currentPan.name || "C Minor"}</span>
            </button>

            <div style={{ flex:1,display:"flex",justifyContent:"center",alignItems:"center" }}>
              {activeNotes.length >= 2 && (() => {
                const best = panChords.find(c => activeNotes.every(n => c.notes.includes(n)) && c.notes.length === activeNotes.length)
                  || panChords.find(c => activeNotes.every(n => c.notes.includes(n)));
                if (!best) return null;
                const acc = CAT_STYLE[best.cat]?.accent || "#c9a84c";
                return (
                  <div style={{ display:"flex",alignItems:"center",gap:6,height:"100%",background:`${acc}12`,border:`1px solid ${acc}33`,borderRadius:7,padding:"0 12px",fontSize:11,fontFamily:FONT,whiteSpace:"nowrap",overflow:"hidden" }}>
                    <span style={{ color:acc,fontWeight:700,fontSize:13,flexShrink:0 }}>{best.root.replace("b","♭")}</span>
                    <span style={{ color:`${acc}cc`,overflow:"hidden",textOverflow:"ellipsis" }}>{best.name}</span>
                    <span style={{ fontSize:8,color:`${acc}66`,flexShrink:0 }}>{best.noteCount}♩</span>
                  </div>
                );
              })()}
            </div>

            <div style={{ visibility:"hidden",padding:"0 10px",fontSize:13,fontWeight:700,maxWidth:"45%",flexShrink:0,whiteSpace:"nowrap",display:"flex",alignItems:"center" }}>
              <span>{currentPan.name || "C Minor"}</span>
            </div>
          </div>

          {/* Diagrams row */}
          {(() => {
            const diagramActiveNotes = progHighlightNotes.length > 0
              ? progHighlightNotes
              : cardHighlightNotes.length > 0 ? cardHighlightNotes : activeNotes;
            return (
              <div style={{ display:"flex",gap:4,justifyContent:"center",alignItems:"flex-start",width:"100%",maxWidth:"100%",overflow:"hidden" }}>
                <div style={{ flex:"1 1 0",minWidth:0,maxWidth:260 }}>
                  {currentPan.sided === "double" && <div style={{ fontSize:7,color:"#5a4a28",textAlign:"center",letterSpacing:2,textTransform:"uppercase",marginBottom:2 }}>Upper</div>}
                  <HandpanDiagram uniqueId="upper"
                    activeNotes={diagramActiveNotes} onNoteToggle={handleNoteToggle}
                    notePositions={currentPan.positions}
                    panNotes={(currentPan.notes||[]).filter(n => n.side !== "bottom")}/>
                </div>
                {currentPan.sided === "double" && (
                  <div style={{ flex:"1 1 0",minWidth:0,maxWidth:260 }}>
                    <div style={{ fontSize:7,color:"#5a4a28",textAlign:"center",letterSpacing:2,textTransform:"uppercase",marginBottom:2 }}>Bottom</div>
                    <HandpanDiagram uniqueId="bottom"
                      activeNotes={diagramActiveNotes} onNoteToggle={handleNoteToggle}
                      notePositions={currentPan.positions}
                      panNotes={(currentPan.notes||[]).filter(n => n.side === "bottom")}/>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Info row */}
          <div style={{ width:"100%",maxWidth:440,textAlign:"center",height:38,display:"flex",flexDirection:"column",justifyContent:"center" }}>
            {activeNotes.length > 0 ? (
              <>
                <div style={{ display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",alignItems:"center",marginBottom:3 }}>
                  <span style={{ fontSize:8,color:"#5a4a28",letterSpacing:3,textTransform:"uppercase",fontFamily:FONT }}>{panMode ? "Playing" : "Chord"}</span>
                  {activeNotes.map(n => (
                    <span key={n} onClick={() => { if (panMode) handleNoteToggle(n); else setActiveNotes(prev => prev.filter(x => x !== n)); }} style={{ background:NOTE_COLOR(n)+"20",border:`1px solid ${NOTE_COLOR(n)}66`,color:NOTE_COLOR(n),borderRadius:4,padding:"1px 7px",fontSize:10,fontFamily:"monospace",cursor:"pointer" }}>{n.replace("b","♭")}{panMode?" ✕":""}</span>
                  ))}
                  <button onClick={clearAll} style={{ background:"rgba(140,45,45,0.15)",border:"1px solid rgba(140,45,45,0.30)",color:"#a85858",borderRadius:5,padding:"2px 8px",cursor:"pointer",fontSize:9,fontFamily:FONT }}>Clear</button>
                </div>
                <div style={{ fontSize:9.5,color:"#5a4a28",fontStyle:"italic",fontFamily:FONT }}>
                  {panMode
                    ? (filtered.length > 0 ? `${filtered.length} chord${filtered.length!==1?"s":""} found` : "No matching chords")
                    : `${relatedKeys.size} chord${relatedKeys.size!==1?"s":""} contain these notes`}
                </div>
              </>
            ) : (
              <div style={{ fontSize:9.5,color:"rgb(85, 79, 60)",letterSpacing:.5,fontFamily:FONT }}>Tap notes to build a chord · or browse below</div>
            )}
          </div>
        </div>
      </div>

      {/* Content wrapper */}
      <div style={{ maxWidth:880,margin:"0 auto",padding:"0 12px" }}>

        {savedChords.length > 0 && (
          <SavedChordsStrip
            chords={savedChords}
            onChords={setSavedChords}
            strum={strum}
            freqMap={currentPan.freq}
            onProgHighlight={notes => {
              if (notes === null) { progPlayingRef.current = false; setProgHighlightNotes([]); }
              else { progPlayingRef.current = true; setProgHighlightNotes(notes); }
            }}
            onPlay={notes => {
              setActiveNotes(notes); setPanNotes(notes); setPanFiltering(true);
              playChord(notes, strum, currentPan.freq); setSelectedKey(null);
            }}
          />
        )}

        {/* Filter bar */}
        <div style={{ padding:"10px 0 0",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
          <button onClick={() => setFilterOpen(true)} style={{ display:"flex",alignItems:"center",gap:6,background:activeFilterCount>0?"rgba(205,163,83,0.16)":"rgba(255,255,255,0.05)",border:`1px solid ${activeFilterCount>0?"rgba(205,163,83,0.50)":"rgba(255,255,255,0.09)"}`,color:activeFilterCount>0?"#ddc870":"#7a6a50",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:FONT,transition:"all .15s" }}>
            <span>⚙ Filters</span>
            {activeFilterCount > 0 && <span style={{ background:"rgba(205,163,83,0.32)",borderRadius:10,padding:"0 6px",fontSize:10,color:"#ddc870" }}>{activeFilterCount}</span>}
          </button>

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chords…" style={{ flex:1,minWidth:110,maxWidth:210,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:8,padding:"7px 12px",color:"#d4c8a8",fontSize:12,fontFamily:FONT,outline:"none" }}/>

          {panMode && <button onClick={showAll} style={{ background:"rgba(205,163,83,0.12)",border:"1px solid rgba(205,163,83,0.35)",color:"#c9a84c",borderRadius:8,padding:"7px 13px",cursor:"pointer",fontSize:11,fontFamily:FONT }}>Show all</button>}
          {(activeFilterCount > 0 || search) && !panMode && <button onClick={() => { clearFilters(); setSearch(""); }} style={{ background:"rgba(140,45,45,0.14)",border:"1px solid rgba(140,45,45,0.28)",color:"#a85858",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontFamily:FONT }}>✕ Clear</button>}

          <span style={{ flex:1 }}/>

          <div style={{ display:"flex",gap:6,alignItems:"center",flexShrink:0 }}>
            <button onClick={() => setStrum(s => !s)} style={{ display:"flex",alignItems:"center",gap:5,background:strum?"rgba(205,163,83,0.14)":"rgba(255,255,255,0.04)",border:`1px solid ${strum?"rgba(205,163,83,0.40)":"rgba(255,255,255,0.09)"}`,color:strum?"#ddc870":"#7a6a50",borderRadius:8,padding:"6px 11px",cursor:"pointer",fontSize:11,fontFamily:FONT,transition:"all .15s",whiteSpace:"nowrap" }}>
              <span style={{ fontSize:12,lineHeight:1 }}>{strum?"〜":"‖"}</span>
              <span>{strum?"Strum":"Together"}</span>
            </button>

            <button
              onClick={() => { const n = activeNotes.length>0?activeNotes:cardHighlightNotes; if (n.length>0) playChord(n,strum,currentPan.freq); }}
              disabled={activeNotes.length===0 && cardHighlightNotes.length===0}
              style={{ display:"flex",alignItems:"center",gap:5,background:(activeNotes.length>0||cardHighlightNotes.length>0)?"rgba(100,180,120,0.18)":"rgba(255,255,255,0.03)",border:`1px solid ${(activeNotes.length>0||cardHighlightNotes.length>0)?"rgba(100,200,130,0.40)":"rgba(255,255,255,0.07)"}`,color:(activeNotes.length>0||cardHighlightNotes.length>0)?"#80d090":"#3a3a30",borderRadius:8,padding:"6px 13px",cursor:(activeNotes.length>0||cardHighlightNotes.length>0)?"pointer":"default",fontSize:12,fontFamily:FONT,transition:"all .15s",whiteSpace:"nowrap" }}>
              <span style={{ fontSize:14,lineHeight:1 }}>▶</span>
              <span style={{ fontSize:11 }}>Play</span>
            </button>

            <button
              onClick={saveChord}
              disabled={activeNotes.length===0 && cardHighlightNotes.length===0}
              style={{ display:"flex",alignItems:"center",gap:5,background:(activeNotes.length>0||cardHighlightNotes.length>0)?"rgba(160,120,200,0.18)":"rgba(255,255,255,0.03)",border:`1px solid ${(activeNotes.length>0||cardHighlightNotes.length>0)?"rgba(160,120,200,0.40)":"rgba(255,255,255,0.07)"}`,color:(activeNotes.length>0||cardHighlightNotes.length>0)?"#c0a0e0":"#3a3a30",borderRadius:8,padding:"6px 11px",cursor:activeNotes.length>0?"pointer":"default",fontSize:11,fontFamily:FONT,whiteSpace:"nowrap" }}>
              <span>♡ Save</span>
            </button>
          </div>
        </div>

        {/* Chord list */}
        <div style={{ padding:"10px 0 72px" }}>
          {activeNotes.length > 0 ? (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(175px,100%),1fr))",gap:5 }}>
              {filtered.map(chord => {
                const isSel = selectedKey === chord.key;
                const isRel = !isSel && relatedKeys.has(chord.key);
                const isDimmed = activeNotes.length > 0 && !isSel && !isRel;
                return <ChordCard key={chord.key} chord={chord} isSelected={isSel} isRelated={isRel} dimmed={isDimmed} onClick={() => handleChordClick(chord)}/>;
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn:"1/-1",textAlign:"center",padding:"48px 20px",color:"#3a2c0e",fontSize:13,fontStyle:"italic",fontFamily:FONT }}>
                  No chord found for this combination. Try removing a note.
                </div>
              )}
            </div>
          ) : (
            <>
              {panAvailableCats.map(cat => {
                const nameMap = grouped[cat];
                if (!nameMap || Object.keys(nameMap).length === 0) return null;
                const s = CAT_STYLE[cat];
                const sortedNames = Object.keys(nameMap).sort();
                return (
                  <div key={cat} style={{ marginBottom:28 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:7,borderBottom:`1px solid ${s.accent}22` }}>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:s.accent,flexShrink:0 }}/>
                      <span style={{ fontSize:11,color:s.accent,letterSpacing:3,textTransform:"uppercase",fontFamily:FONT,fontWeight:"600" }}>{s.label}</span>
                      <span style={{ fontSize:10,color:s.accent+"55",fontFamily:FONT }}>({filtered.filter(c => c.cat===cat).length})</span>
                    </div>
                    {sortedNames.map(chordName => {
                      const cards = nameMap[chordName];
                      return (
                        <div key={chordName} style={{ marginBottom:12 }}>
                          <div style={{ fontSize:9.5,color:s.accent+"88",letterSpacing:2,textTransform:"uppercase",fontFamily:FONT,fontWeight:"600",marginBottom:5,paddingLeft:2 }}>{chordName}</div>
                          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(175px,100%),1fr))",gap:5 }}>
                            {cards.map(chord => {
                              const isSel = selectedKey === chord.key;
                              const isRel = !isSel && relatedKeys.has(chord.key) && activeNotes.length > 0;
                              const isDimmed = activeNotes.length > 0 && !panMode && !isSel && !isRel;
                              return <ChordCard key={chord.key} chord={chord} isSelected={isSel} isRelated={isRel} dimmed={isDimmed} onClick={() => handleChordClick(chord)}/>;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ textAlign:"center",padding:"48px 20px",color:"#3a2c0e",fontSize:13,fontStyle:"italic",fontFamily:FONT }}>No chords match these filters.</div>
              )}
            </>
          )}
        </div>

      </div>

      <AppFooter/>

      <FilterModal open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} onChange={setFilters}
        availableCats={panAvailableCats} availableChordNames={panChordNames} noteList={currentPan.notes.map(n => n.name)}/>
      <HandpanBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} onApply={applyHandpan}/>
    </div>
  );
}
