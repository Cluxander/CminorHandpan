import { useState, useRef, useEffect } from "react";
import { getCtx, synthNote, playChord, playSlap, BEAT_SEC } from "../audio/synth.js";

const TIME_SIGS = [2, 3, 4, 5];

export default function SavedChordsStrip({ chords, onChords, strum, freqMap, onPlay, onProgHighlight }) {
  const [dragging,    setDragging]    = useState(null);
  const [dragOver,    setDragOver]    = useState(null);
  const [overDelete,  setOverDelete]  = useState(false);
  const [playingProg, setPlayingProg] = useState(false);
  const [timeSigIdx,  setTimeSigIdx]  = useState(2); // default = 4/4
  const containerRef = useRef(null);
  const pointerItem  = useRef(null);
  const [ghostPos,   setGhostPos]    = useState(null);

  const beatsPerBar = TIME_SIGS[timeSigIdx];

  const [BMP, setBMP] = useState(60);
  // Inside your playProgression component
  const [metronomeActive, setMetronomeActive] = useState(false);
  const metronomeRef = useRef(false);

// Keep ref in sync
useEffect(() => { metronomeRef.current = metronomeActive; }, [metronomeActive]);
  
  const handleBpmChange = (e) => {
      // 1. Get the value from the input
      let value = parseInt(e.target.value);
  
      // 2. Handle empty input (if user deletes everything to type a new number)
      if (isNaN(value)) {
          setBMP(""); // Allow the input to be empty while typing
          return;
      }
  
      if (value > 180) value = 180;
      if (value < 40) value = 40;
  
      setBMP(value);
  };
  
  const handleBlur = () => {
      if (BMP < 40 || BMP === "") {
          setBMP(40);
      }
  };

  function cycleTimeSig() { setTimeSigIdx(i => (i + 1) % TIME_SIGS.length); }



  function cancelAll() { allTimers.current.forEach(id => clearTimeout(id)); allTimers.current = []; }
  function sched(fn, delayMs) { const id = setTimeout(fn, delayMs); allTimers.current.push(id); return id; }




  const bpmRef = useRef(BMP);
const loopIdRef = useRef(0);
const allTimers = useRef([]);

function playProgression() {
  // STOP LOGIC
  if (playingProg) {
    loopIdRef.current++; // Change ID so any pending playLoop dies
    cancelAll();
    setPlayingProg(false);
    onProgHighlight && onProgHighlight(null);
    return;
  }

  // START LOGIC
  cancelAll();
  loopIdRef.current++;
  const myId = loopIdRef.current;
  setPlayingProg(true);

  function playLoop(index) {
    if (loopIdRef.current !== myId) return;
  
    const c = chords[index];
    const safeBPM = bpmRef.current > 0 ? bpmRef.current : 60;
    const currentBpmMs = 60000 / safeBPM;
    
    const notesInChord = c.notes.length;
    const allocatedBeats = Math.ceil(notesInChord / beatsPerBar) * beatsPerBar;
  
    // 1. Play the chord as usual
    if (strum) {
      c.notes.forEach((note, ni) => {
        const strumDelay = Math.round(ni * BEAT_SEC * currentBpmMs);
        sched(() => {
          if (loopIdRef.current !== myId) return;
          const f = freqMap[note];
          if (f) { 
            const ctx = getCtx(); 
            synthNote(f, ctx.currentTime, ctx, 0.55); 
          }
          onProgHighlight && onProgHighlight([note]);
        }, strumDelay);
      });
    } else {
      playChord(c.notes, false, freqMap);
      onProgHighlight && onProgHighlight(c.notes);
    }
  
    // 2. METRONOME/SLAP LOGIC
    // If metronome is on, play slaps on the empty beats of this segment
    if (metronomeRef.current) {
      // Start slaps AFTER the notes are done
      for (let b = notesInChord; b < allocatedBeats; b++) {
        const slapDelay = Math.round(b * BEAT_SEC * currentBpmMs);
        sched(() => {
          if (loopIdRef.current !== myId) return;
          const ctx = getCtx();
          playSlap(ctx.currentTime, ctx, 0.1);
        }, slapDelay);
      }
    }
  
    const msUntilNextChord = Math.round(allocatedBeats * BEAT_SEC * currentBpmMs);
    sched(() => {
      if (loopIdRef.current === myId) playLoop((index + 1) % chords.length);
    }, msUntilNextChord);
  }

  // Start the first iteration
  playLoop(0);
}

// Sync the ref with state
useEffect(() => {
  bpmRef.current = BMP;
}, [BMP]);

  // function playProgression() {
  //   if (playingProg) {
  //     loopIdRef.current++;
  //     cancelAll();
  //     setPlayingProg(false);
  //     onProgHighlight && onProgHighlight(null);
  //     return;
  //   }
  //   cancelAll();
  //   loopIdRef.current++;
  //   const myId = loopIdRef.current;
  //   setPlayingProg(true);

  //   function playLoop() {
  //     if (loopIdRef.current !== myId) return;
  //     let beatOffset = 0;
  //     chords.forEach(c => {
  //       const notesInChord = c.notes.length;
  //       if (strum) {
  //         c.notes.forEach((note, ni) => {
  //           sched(() => {
  //             if (loopIdRef.current !== myId) return;
  //             const f = freqMap[note];
  //             if (f) { const ctx = getCtx(); synthNote(f, ctx.currentTime, ctx, 0.55); }
  //             onProgHighlight && onProgHighlight([note]);
  //           }, Math.round((beatOffset + ni) * BEAT_SEC * BPM_time));
  //         });
  //       } else {
  //         sched(() => {
  //           if (loopIdRef.current !== myId) return;
  //           playChord(c.notes, false, freqMap);
  //           onProgHighlight && onProgHighlight(c.notes);
  //         }, Math.round(beatOffset * BEAT_SEC * BPM_time));
  //       }
  //       beatOffset += Math.ceil(notesInChord / beatsPerBar) * beatsPerBar;
  //     });
  //     sched(() => { if (loopIdRef.current === myId) playLoop(); }, Math.round(beatOffset * BEAT_SEC * BPM_time));
  //   }

  //   playLoop();
  // }
////////////
  function onPointerDown(e, i) {
    e.preventDefault();
    pointerItem.current = { index:i, startX:e.clientX, startY:e.clientY, moved:false };
    setDragging(i);
    document.body.style.overflow = "hidden";
    setGhostPos({ x:e.clientX, y:e.clientY });
  }

  useEffect(() => {
    function onPointerMove(e) {
      if (pointerItem.current == null) return;
      const dx = e.clientX - pointerItem.current.startX;
      const dy = e.clientY - pointerItem.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pointerItem.current.moved = true;
      setGhostPos({ x:e.clientX, y:e.clientY });
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const chip = el?.closest("[data-chord-idx]");
      if (chip) {
        const idx = parseInt(chip.getAttribute("data-chord-idx"));
        if (!isNaN(idx) && idx !== pointerItem.current.index) { setDragOver(idx); setOverDelete(false); }
      }
      const delZone = el?.closest("[data-delete-zone]");
      if (delZone) { setOverDelete(true); setDragOver(null); }
      else if (!chip) { setOverDelete(false); }
    }

    function onPointerUp(_e) {
      if (pointerItem.current == null) return;
      document.body.style.overflow = "";
      if (!pointerItem.current.moved) {
        const idx = pointerItem.current.index;
        if (chords[idx]) onPlay(chords[idx].notes);
      } else if (overDelete) {
        const updated = chords.filter((_,i) => i !== pointerItem.current.index);
        onChords(updated);
        try { localStorage.setItem("hp_saved_chords", JSON.stringify(updated)); } catch(err){}
      } else if (dragOver != null && dragOver !== pointerItem.current.index) {
        const arr = [...chords];
        const [removed] = arr.splice(pointerItem.current.index, 1);
        arr.splice(dragOver, 0, removed);
        onChords(arr);
        try { localStorage.setItem("hp_saved_chords", JSON.stringify(arr)); } catch(err){}
      }
      pointerItem.current = null;
      setDragging(null); setDragOver(null); setOverDelete(false); setGhostPos(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup",   onPointerUp);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); };
  }, [chords, dragOver, overDelete, onChords, onPlay]);

  return (
    <div ref={containerRef} className="hp-saved-strip">
      <div className="hp-saved-strip__row">
        <span className="hp-saved-strip__label">Saved</span>

        {chords.map((c, i) => {
          let chipClass = "hp-saved-chip";
          if (dragging === i) chipClass += " hp-saved-chip--dragging";
          else if (dragOver === i) chipClass += " hp-saved-chip--dragover";
          else chipClass += " hp-saved-chip--default";
          return (
            <div key={c.key}
              data-chord-idx={i}
              onPointerDown={e => onPointerDown(e, i)}
              className={chipClass}>
              <span className="hp-saved-chip__handle">⠿</span>
              {c.notes.map(n => n.replace("b","♭")).join(" ")}
            </div>
          );
        })}

        {dragging != null && (
          <div data-delete-zone="1"
            className={`hp-saved-delete-zone ${overDelete ? "hp-saved-delete-zone--over" : "hp-saved-delete-zone--idle"}`}>
            🗑 Drop to delete
          </div>
        )}

        {chords.length >= 2 && dragging == null && (
          <>
            <button onClick={cycleTimeSig} title="Change time signature"
              className="hp-btn-time-sig">
              {TIME_SIGS[timeSigIdx]}/4
            </button>
            {/* ----------------------------------------------------------------- ADDED AL */}
            <div className="hp-bpm-wrapper">
              <span className="hp-bpm-label">BPM</span>
              <input 
                type="number" 
                value={BMP} 
                onChange={handleBpmChange}
                onBlur={handleBlur}
                className="hp-bpm-input"
                placeholder="--"
              />
            </div>
            <button 
              onClick={() => setMetronomeActive(!metronomeActive)}
              className={`hp-metronome-btn ${metronomeActive ? 'active' : ''}`}
              title="Toggle Metronome Slap"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3 7h-6l3-7zM12 9v13M5 22h14" />
              </svg>
            </button>
                        {/* ----------------------------------------------------------------- ADDED AL */}
            <button onClick={playProgression}
              className={`hp-btn-play-prog ${playingProg ? "hp-btn-play-prog--playing" : "hp-btn-play-prog--idle"}`}>
              {playingProg?"◼ Stop":"▶▶ Play all"}
            </button>
          </>
        )}


        <button onClick={() => {
          cancelAll(); setPlayingProg(false);
          onChords([]);
          try { localStorage.removeItem("hp_saved_chords"); } catch(e){}
        }} className="hp-btn-clear-saved">↺ Clear</button>
      </div>

      {dragging != null && ghostPos && (
        <div className="hp-drag-ghost" style={{ left: ghostPos.x + 10, top: ghostPos.y - 14 }}>
          {chords[dragging]?.notes.map(n => n.replace("b","♭")).join(" ")}
        </div>
      )}
    </div>
  );
}
