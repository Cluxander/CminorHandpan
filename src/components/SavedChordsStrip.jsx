import { useState, useRef, useEffect } from "react";
import { FONT } from "../constants/colors.js";
import { getCtx, synthNote, playChord, BPM, BEAT_SEC } from "../audio/synth.js";

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

  function cycleTimeSig() { setTimeSigIdx(i => (i + 1) % TIME_SIGS.length); }

  const loopIdRef = useRef(0);
  const allTimers = useRef([]);

  function cancelAll() { allTimers.current.forEach(id => clearTimeout(id)); allTimers.current = []; }
  function sched(fn, delayMs) { const id = setTimeout(fn, delayMs); allTimers.current.push(id); return id; }

  function playProgression() {
    if (playingProg) {
      loopIdRef.current++;
      cancelAll();
      setPlayingProg(false);
      onProgHighlight && onProgHighlight(null);
      return;
    }
    cancelAll();
    loopIdRef.current++;
    const myId = loopIdRef.current;
    setPlayingProg(true);

    function playLoop() {
      if (loopIdRef.current !== myId) return;
      let beatOffset = 0;
      chords.forEach(c => {
        const notesInChord = c.notes.length;
        if (strum) {
          c.notes.forEach((note, ni) => {
            sched(() => {
              if (loopIdRef.current !== myId) return;
              const f = freqMap[note];
              if (f) { const ctx = getCtx(); synthNote(f, ctx.currentTime, ctx, 0.55); }
              onProgHighlight && onProgHighlight([note]);
            }, Math.round((beatOffset + ni) * BEAT_SEC * 1000));
          });
        } else {
          sched(() => {
            if (loopIdRef.current !== myId) return;
            playChord(c.notes, false, freqMap);
            onProgHighlight && onProgHighlight(c.notes);
          }, Math.round(beatOffset * BEAT_SEC * 1000));
        }
        beatOffset += Math.ceil(notesInChord / beatsPerBar) * beatsPerBar;
      });
      sched(() => { if (loopIdRef.current === myId) playLoop(); }, Math.round(beatOffset * BEAT_SEC * 1000));
    }

    playLoop();
  }

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

    function onPointerUp(e) {
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
    <div ref={containerRef} style={{ padding:"8px 0 0",userSelect:"none",WebkitUserSelect:"none",touchAction:"none" }}>
      <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
        <span style={{ fontSize:8,color:"#5a4a28",letterSpacing:3,textTransform:"uppercase",flexShrink:0 }}>Saved</span>

        {chords.map((c, i) => (
          <div key={c.key}
            data-chord-idx={i}
            onPointerDown={e => onPointerDown(e, i)}
            style={{
              display:"flex",gap:3,alignItems:"center",
              background:dragging===i?"rgba(160,120,200,0.35)":dragOver===i?"rgba(160,120,200,0.28)":"rgba(160,120,200,0.12)",
              border:`1px solid ${dragging===i?"rgba(160,120,200,0.80)":dragOver===i?"rgba(160,120,200,0.60)":"rgba(160,120,200,0.30)"}`,
              color:"#c0a0e0",borderRadius:7,padding:"4px 9px",cursor:"grab",
              fontSize:10,fontFamily:"monospace",touchAction:"none",
              opacity:dragging===i?0.45:1,
              transform:dragOver===i&&dragging!==i?"scale(1.06)":"none",
              transition:"transform .1s, opacity .1s",
            }}>
            <span style={{ fontSize:9,opacity:.35,marginRight:1 }}>⠿</span>
            {c.notes.map(n => n.replace("b","♭")).join(" ")}
          </div>
        ))}

        {dragging != null && (
          <div data-delete-zone="1" style={{ padding:"4px 10px",borderRadius:6,fontSize:9,fontFamily:FONT,background:overDelete?"rgba(200,60,60,0.35)":"rgba(140,45,45,0.10)",border:`1px dashed ${overDelete?"rgba(240,80,80,0.9)":"rgba(160,55,55,0.40)"}`,color:overDelete?"#ff9090":"#a85858",transition:"all .15s" }}>🗑 Drop to delete</div>
        )}

        {chords.length >= 2 && dragging == null && (
          <>
            <button onClick={cycleTimeSig} title="Change time signature" style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.14)",color:"#a09070",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:FONT,flexShrink:0,touchAction:"manipulation",fontVariantNumeric:"tabular-nums",letterSpacing:.5 }}>{TIME_SIGS[timeSigIdx]}/4</button>
            <button onClick={playProgression} style={{ background:playingProg?"rgba(205,163,83,0.30)":"rgba(205,163,83,0.12)",border:`1px solid rgba(205,163,83,${playingProg?".70":".35"})`,color:playingProg?"#f0d078":"#c9a84c",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontSize:9,fontFamily:FONT,flexShrink:0,touchAction:"manipulation" }}>{playingProg?"◼ Stop":"▶▶ Play all"}</button>
          </>
        )}

        <button onClick={() => {
          cancelAll(); setPlayingProg(false);
          onChords([]);
          try { localStorage.removeItem("hp_saved_chords"); } catch(e){}
        }} style={{ background:"rgba(140,45,45,0.12)",border:"1px solid rgba(140,45,45,0.25)",color:"#a85858",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:9,fontFamily:FONT,touchAction:"manipulation" }}>↺ Clear</button>
      </div>

      {dragging != null && ghostPos && (
        <div style={{ position:"fixed",pointerEvents:"none",zIndex:9999,left:ghostPos.x+10,top:ghostPos.y-14,background:"rgba(160,120,200,0.90)",borderRadius:7,padding:"4px 9px",fontSize:10,fontFamily:"monospace",color:"#fff",boxShadow:"0 4px 16px rgba(0,0,0,0.5)" }}>
          {chords[dragging]?.notes.map(n => n.replace("b","♭")).join(" ")}
        </div>
      )}
    </div>
  );
}
