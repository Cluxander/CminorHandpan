import { useState, useMemo, useCallback, useRef } from "react";
import "./styles/handpan.css";

import { NOTE_COLOR } from "./constants/colors.js";
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

let ChordTimers = []

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

  function saveChord(notes) {
    if (!notes || notes.length === 0) return;
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

  const handleChordClick = (chord, orderedNotes = null) => {
    const notes = orderedNotes || chord.notes;
    const strumMs = strum ? 260 : 0;

    // Cancel every pending timer from the previous interaction
    ChordTimers.forEach(clearTimeout);
    ChordTimers = [];
    setSelectedKey(null);
    setCardHighlightNotes([]);
    setSelectedKey(chord.key);

    // ── Appear: each note plays + lights up at the same moment ──
    const ctx = getCtx();
    const now = ctx.currentTime;
    const noteVol = Math.max(0.45, 0.80 - notes.length * 0.06);

    notes.forEach((n, i) => {
      const f = currentPan.freq?.[n];
      if (f) synthNote(f, now + i * (strumMs / 1000), ctx, noteVol);
      ChordTimers.push(setTimeout(() => {
        setCardHighlightNotes(prev => [...prev, n]);
      }, i * strumMs));
    });

    // ── Hold for 1s after the last note appears ──
    const totalAppearMs = (notes.length - 1) * strumMs;
    const holdMs = 1000;

    // Deselect card when fade-out begins
    ChordTimers.push(setTimeout(() => {
      setSelectedKey(null);
    }, totalAppearMs + holdMs));

    // ── Fade-out: remove notes one by one in the same order they appeared ──
    notes.forEach((n, i) => {
      ChordTimers.push(setTimeout(() => {
        setCardHighlightNotes(prev => prev.filter(note => note !== n));
      }, totalAppearMs + holdMs + i * strumMs));
    });

    // Final cleanup after the last CSS fade (1s) completes
    ChordTimers.push(setTimeout(() => {
      setCardHighlightNotes([]);
    }, totalAppearMs + holdMs + (notes.length - 1) * strumMs + 1100));
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
        // Include noteCount so "C Minor 3♩" and "C Minor 4♩" are never collapsed
        const groupKey = c.root + "|" + c.name + "|" + c.noteCount;
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
  const hasActiveChord = activeNotes.length > 0 || cardHighlightNotes.length > 0;

  return (
    <div className="hp-app">

      {/* ── LEFT PANEL (header + handpan) ── */}
      <div className="hp-left-panel">

      <StickyHeader onHeight={h => {
        if (stickyPanRef.current) {
          const isLandscape = window.innerHeight <= 600 && window.innerWidth > window.innerHeight;
          // In landscape the pan strip lives in a flex column — no top offset needed
          stickyPanRef.current.style.top = isLandscape ? "" : h + "px";
        }
      }}/>

      {/* Sticky handpan */}
      <div ref={stickyPanRef} className="hp-pan-strip">
        <div className="hp-pan-strip__inner">
          {/* Top row */}
          <div className="hp-pan-strip__top-row">
            <button onClick={() => setBuilderOpen(true)} title="Open Handpan Workshop"
              className="hp-pan-name-btn">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="hp-pan-name-btn__svg">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1"/>
                <circle cx="7" cy="2.5" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="10.7" cy="4.8" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="10.7" cy="9.2" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="7" cy="11.5" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="3.3" cy="9.2" r="1.2" fill="currentColor" opacity=".7"/>
                <circle cx="3.3" cy="4.8" r="1.2" fill="currentColor" opacity=".7"/>
              </svg>
              <span className="hp-pan-name-btn__label">{currentPan.name || "C Minor"}</span>
            </button>

            <div className="hp-chord-badge-center">
              {activeNotes.length >= 2 && (() => {
                const best = panChords.find(c => activeNotes.every(n => c.notes.includes(n)) && c.notes.length === activeNotes.length)
                  || panChords.find(c => activeNotes.every(n => c.notes.includes(n)));
                if (!best) return null;
                const acc = CAT_STYLE[best.cat]?.accent || "#c9a84c";
                return (
                  <div className="hp-chord-badge" style={{ "--accent": acc }}>
                    <span className="hp-chord-badge__root">{best.root.replace("b","♭")}</span>
                    <span className="hp-chord-badge__name">{best.name}</span>
                    <span className="hp-chord-badge__count">{best.noteCount}♩</span>
                  </div>
                );
              })()}
            </div>

            <div className="hp-pan-name-spacer">
              <span>{currentPan.name || "C Minor"}</span>
            </div>
          </div>

          {/* Diagrams row */}
          {(() => {
            const diagramActiveNotes = progHighlightNotes.length > 0
              ? progHighlightNotes
              : cardHighlightNotes.length > 0 ? cardHighlightNotes : activeNotes;
            return (
              <div className="hp-diagrams-row">
                <div className="hp-diagram-col">
                  {currentPan.sided === "double" && <div className="hp-diagram-side-label">Upper</div>}
                  <HandpanDiagram uniqueId="upper"
                    activeNotes={diagramActiveNotes} onNoteToggle={handleNoteToggle}
                    notePositions={currentPan.positions}
                    panNotes={(currentPan.notes||[]).filter(n => n.side !== "bottom")}/>
                </div>
                {currentPan.sided === "double" && (
                  <div className="hp-diagram-col">
                    <div className="hp-diagram-side-label">Bottom</div>
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
          <div className="hp-info-row">
            {activeNotes.length > 0 ? (
              <>
                <div className="hp-active-notes-row">
                  <span className="hp-active-notes-label">{panMode ? "Playing" : "Chord"}</span>
                  {activeNotes.map(n => (
                    <span key={n} onClick={() => { if (panMode) handleNoteToggle(n); else setActiveNotes(prev => prev.filter(x => x !== n)); }}
                      className="hp-note-chip" style={{ "--note-color": NOTE_COLOR(n) }}>
                      {n.replace("b","♭")}{panMode?" ✕":""}
                    </span>
                  ))}
                  <button onClick={clearAll} className="hp-btn-clear-sm">Clear</button>
                </div>
                <div className="hp-info-status">
                  {panMode
                    ? (filtered.length > 0 ? `${filtered.length} chord${filtered.length!==1?"s":""} found` : "No matching chords")
                    : `${relatedKeys.size} chord${relatedKeys.size!==1?"s":""} contain these notes`}
                </div>
              </>
            ) : (
              <div className="hp-info-hint">Tap notes to build a chord · or browse below</div>
            )}
          </div>
        </div>

        {/* Support link — bottom-right corner */}
        <a href="#" className="hp-support-link">
          {/* <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg> */}
          <span>Support me ❤️</span>
        </a>
      </div>
      </div>{/* end hp-left-panel */}

      {/* ── RIGHT PANEL (content + footer) ── */}
      <div className="hp-right-panel">

      {/* Content wrapper */}
      <div className="hp-content">

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
        <div className="hp-filter-bar">
          <button onClick={() => setFilterOpen(true)}
            className={`hp-btn-filter ${activeFilterCount > 0 ? "hp-btn-filter--active" : "hp-btn-filter--inactive"}`}>
            <span>⚙ Filters</span>
            {activeFilterCount > 0 && <span className="hp-filter-badge">{activeFilterCount}</span>}
          </button>

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chords…"
            className="hp-search-input"/>

          {panMode && <button onClick={showAll} className="hp-btn-show-all">Show all</button>}
          {(activeFilterCount > 0 || search) && !panMode && (
            <button onClick={() => { clearFilters(); setSearch(""); }} className="hp-btn-clear-filters">✕ Clear</button>
          )}

          <span className="hp-filter-spacer"/>

          <div className="hp-filter-actions">
            <button onClick={() => setStrum(s => !s)}
              className={`hp-btn-strum ${strum ? "hp-btn-strum--on" : "hp-btn-strum--off"}`}>
              <span className="hp-btn-strum__icon">{strum?"〜":"‖"}</span>
              <span>{strum?"Strum":"Together"}</span>
            </button>

            <button
              onClick={() => { const n = activeNotes.length>0?activeNotes:cardHighlightNotes; if (n.length>0) playChord(n,strum,currentPan.freq); }}
              disabled={!hasActiveChord}
              className={`hp-btn-play ${hasActiveChord ? "hp-btn-play--enabled" : "hp-btn-play--disabled"}`}>
              <span className="hp-btn-play__icon">▶</span>
              <span className="hp-btn-play__label">Play</span>
            </button>

          </div>
        </div>

        {/* Chord list */}
        <div className="hp-chord-list">
          {activeNotes.length > 0 ? (
            <div className="hp-chord-grid">
              {filtered.map(chord => {
                const isSel = selectedKey === chord.key;
                const isRel = !isSel && relatedKeys.has(chord.key);
                const isDimmed = activeNotes.length > 0 && !isSel && !isRel;
                return <ChordCard key={chord.key} chord={chord} isSelected={isSel} isRelated={isRel} dimmed={isDimmed} onClick={handleChordClick} onSave={saveChord}/>;
              })}
              {filtered.length === 0 && (
                <div className="hp-chord-empty">
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
                  <div key={cat} className="hp-cat-section">
                    <div className="hp-cat-header" style={{ "--accent": s.accent }}>
                      <div className="hp-cat-dot"/>
                      <span className="hp-cat-label">{s.label}</span>
                      <span className="hp-cat-count">({filtered.filter(c => c.cat===cat).length})</span>
                    </div>
                    <div className="hp-cat-section-body">
                    {sortedNames.map(chordName => {
                      const cards = nameMap[chordName];
                      return (
                        <div key={chordName} className="hp-chord-type-section">
                          <div className="hp-chord-type-name" style={{ "--accent": s.accent }}>&bull; {chordName}</div>
                          <div className="hp-chord-grid">
                            {cards.map(chord => {
                              const isSel = selectedKey === chord.key;
                              const isRel = !isSel && relatedKeys.has(chord.key) && activeNotes.length > 0;
                              const isDimmed = activeNotes.length > 0 && !panMode && !isSel && !isRel;
                              return <ChordCard key={chord.key} chord={chord} isSelected={isSel} isRelated={isRel} dimmed={isDimmed} onClick={handleChordClick} onSave={saveChord}/>;
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="hp-chord-empty--full">No chords match these filters.</div>
              )}
            </>
          )}
        </div>

      </div>

      <AppFooter/>
      </div>{/* end hp-right-panel */}

      <FilterModal open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} onChange={setFilters}
        availableCats={panAvailableCats} availableChordNames={panChordNames} noteList={currentPan.notes.map(n => n.name)}/>
      <HandpanBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} onApply={applyHandpan}/>
    </div>
  );
}
