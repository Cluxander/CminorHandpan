import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ── VIEWPORT META (mobile) ────────────────────────────────────────
// Injected once so the artifact renders at device width on phones
if (typeof document !== "undefined") {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }
  meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
}

// ── FREQUENCIES ───────────────────────────────────────────────────
const NOTE_FREQ = {
  "C3": 130.81, "C4": 261.63, "D4": 293.66,
  "Eb4": 311.13, "F4": 349.23, "G4": 392.00,
  "Ab4": 415.30, "C5": 523.25, "D5": 587.33,
};

// ── NOTE POSITIONS ────────────────────────────────────────────────
// 8 ring notes at 45° steps, symmetric (no top/bottom slot).
// After all user swaps the final ring clockwise from ~1 o'clock:
//   C5  → 22.5°   (up-right)
//   G4  → 67.5°   (obliq-D-right, upper)
//   Eb4 → 112.5°  (obliq-D-right, lower)
//   C4  → 157.5°  (down-right)
//   D4  → 202.5°  (down-left)
//   F4  → 247.5°  (obliq-D-left)
//   Ab4 → 292.5°  (up-left)
//   D5  → 337.5°  (obliq-U-left)

const CX = 150, CY = 150, RING_R = 90;

function polar(deg, r = RING_R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: +(CX + r * Math.cos(rad)).toFixed(2), y: +(CY + r * Math.sin(rad)).toFixed(2) };
}

const NOTE_POS = {
  "C3":  { x: CX, y: CY, r: 36, isDing: true },
  "C5":  { ...polar(22.5),  r: 24 },
  "G4":  { ...polar(67.5),  r: 24 },
  "Eb4": { ...polar(112.5), r: 24 },
  "C4":  { ...polar(157.5), r: 24 },
  "D4":  { ...polar(202.5), r: 24 },
  "F4":  { ...polar(247.5), r: 24 },
  "Ab4": { ...polar(292.5), r: 24 },
  "D5":  { ...polar(337.5), r: 24 },
};

const ALL_NOTES = ["C3","C5","G4","Eb4","C4","D4","F4","Ab4","D5"];

// ── CHORD DATA ────────────────────────────────────────────────────
const ALL_CHORDS = [
  { root:"C3",  type:"Octave",       noteCount:2, notes:["C3","C4"] },
  { root:"C3",  type:"Major 2nd",    noteCount:2, notes:["C3","D4"] },
  { root:"D4",  type:"Minor 7th",    noteCount:2, notes:["C3","D4"] },
  { root:"C3",  type:"Minor 3rd",    noteCount:2, notes:["C3","Eb4"] },
  { root:"Eb4", type:"Major 6th",    noteCount:2, notes:["C3","Eb4"] },
  { root:"C3",  type:"Perfect 4th",  noteCount:2, notes:["C3","F4"] },
  { root:"F4",  type:"Perfect 5th",  noteCount:2, notes:["C3","F4"] },
  { root:"C3",  type:"Perfect 5th",  noteCount:2, notes:["C3","G4"] },
  { root:"G4",  type:"Perfect 4th",  noteCount:2, notes:["C3","G4"] },
  { root:"C3",  type:"Minor 6th",    noteCount:2, notes:["C3","Ab4"] },
  { root:"Ab4", type:"Major 3rd",    noteCount:2, notes:["C3","Ab4"] },
  { root:"C3",  type:"Major 2nd",    noteCount:2, notes:["C3","D5"] },
  { root:"D5",  type:"Minor 7th",    noteCount:2, notes:["C3","D5"] },
  { root:"C4",  type:"Major 2nd",    noteCount:2, notes:["C4","D4"] },
  { root:"D4",  type:"Minor 7th",    noteCount:2, notes:["C4","D4"] },
  { root:"C4",  type:"Minor 3rd",    noteCount:2, notes:["C4","Eb4"] },
  { root:"Eb4", type:"Major 6th",    noteCount:2, notes:["C4","Eb4"] },
  { root:"C4",  type:"Perfect 4th",  noteCount:2, notes:["C4","F4"] },
  { root:"F4",  type:"Perfect 5th",  noteCount:2, notes:["C4","F4"] },
  { root:"C4",  type:"Perfect 5th",  noteCount:2, notes:["C4","G4"] },
  { root:"G4",  type:"Perfect 4th",  noteCount:2, notes:["C4","G4"] },
  { root:"C4",  type:"Minor 6th",    noteCount:2, notes:["C4","Ab4"] },
  { root:"Ab4", type:"Major 3rd",    noteCount:2, notes:["C4","Ab4"] },
  { root:"C4",  type:"Octave",       noteCount:2, notes:["C4","C5"] },
  { root:"C4",  type:"Major 2nd",    noteCount:2, notes:["C4","D5"] },
  { root:"D5",  type:"Minor 7th",    noteCount:2, notes:["C4","D5"] },
  { root:"D4",  type:"Minor 2nd",    noteCount:2, notes:["D4","Eb4"] },
  { root:"Eb4", type:"Major 7th",    noteCount:2, notes:["D4","Eb4"] },
  { root:"D4",  type:"Minor 3rd",    noteCount:2, notes:["D4","F4"] },
  { root:"F4",  type:"Major 6th",    noteCount:2, notes:["D4","F4"] },
  { root:"D4",  type:"Perfect 4th",  noteCount:2, notes:["D4","G4"] },
  { root:"G4",  type:"Perfect 5th",  noteCount:2, notes:["D4","G4"] },
  { root:"D4",  type:"Tritone",      noteCount:2, notes:["D4","Ab4"] },
  { root:"Ab4", type:"Tritone",      noteCount:2, notes:["D4","Ab4"] },
  { root:"D4",  type:"Minor 7th",    noteCount:2, notes:["D4","C5"] },
  { root:"C5",  type:"Major 2nd",    noteCount:2, notes:["D4","C5"] },
  { root:"D4",  type:"Octave",       noteCount:2, notes:["D4","D5"] },
  { root:"Eb4", type:"Major 2nd",    noteCount:2, notes:["Eb4","F4"] },
  { root:"F4",  type:"Minor 7th",    noteCount:2, notes:["Eb4","F4"] },
  { root:"Eb4", type:"Major 3rd",    noteCount:2, notes:["Eb4","G4"] },
  { root:"G4",  type:"Minor 6th",    noteCount:2, notes:["Eb4","G4"] },
  { root:"Eb4", type:"Perfect 4th",  noteCount:2, notes:["Eb4","Ab4"] },
  { root:"Ab4", type:"Perfect 5th",  noteCount:2, notes:["Eb4","Ab4"] },
  { root:"Eb4", type:"Major 6th",    noteCount:2, notes:["Eb4","C5"] },
  { root:"C5",  type:"Minor 3rd",    noteCount:2, notes:["Eb4","C5"] },
  { root:"Eb4", type:"Major 7th",    noteCount:2, notes:["Eb4","D5"] },
  { root:"D5",  type:"Minor 2nd",    noteCount:2, notes:["Eb4","D5"] },
  { root:"F4",  type:"Major 2nd",    noteCount:2, notes:["F4","G4"] },
  { root:"G4",  type:"Minor 7th",    noteCount:2, notes:["F4","G4"] },
  { root:"F4",  type:"Minor 3rd",    noteCount:2, notes:["F4","Ab4"] },
  { root:"Ab4", type:"Major 6th",    noteCount:2, notes:["F4","Ab4"] },
  { root:"F4",  type:"Perfect 5th",  noteCount:2, notes:["F4","C5"] },
  { root:"C5",  type:"Perfect 4th",  noteCount:2, notes:["F4","C5"] },
  { root:"F4",  type:"Major 6th",    noteCount:2, notes:["F4","D5"] },
  { root:"D5",  type:"Minor 3rd",    noteCount:2, notes:["F4","D5"] },
  { root:"G4",  type:"Minor 2nd",    noteCount:2, notes:["G4","Ab4"] },
  { root:"Ab4", type:"Major 7th",    noteCount:2, notes:["G4","Ab4"] },
  { root:"G4",  type:"Perfect 4th",  noteCount:2, notes:["G4","C5"] },
  { root:"C5",  type:"Perfect 5th",  noteCount:2, notes:["G4","C5"] },
  { root:"G4",  type:"Perfect 5th",  noteCount:2, notes:["G4","D5"] },
  { root:"D5",  type:"Perfect 4th",  noteCount:2, notes:["G4","D5"] },
  { root:"Ab4", type:"Major 3rd",    noteCount:2, notes:["Ab4","C5"] },
  { root:"C5",  type:"Minor 6th",    noteCount:2, notes:["Ab4","C5"] },
  { root:"Ab4", type:"Tritone",      noteCount:2, notes:["Ab4","D5"] },
  { root:"D5",  type:"Tritone",      noteCount:2, notes:["Ab4","D5"] },
  { root:"C5",  type:"Major 2nd",    noteCount:2, notes:["C5","D5"] },
  { root:"D5",  type:"Minor 7th",    noteCount:2, notes:["C5","D5"] },
  { root:"C3",  type:"Sus2",         noteCount:3, notes:["C3","D4","G4"] },
  { root:"D4",  type:"Quartal",      noteCount:3, notes:["C3","D4","G4"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["C3","D4","G4"] },
  { root:"C3",  type:"Minor",        noteCount:3, notes:["C3","Eb4","G4"] },
  { root:"Ab4", type:"Major",        noteCount:3, notes:["C3","Eb4","Ab4"] },
  { root:"C3",  type:"Sus4",         noteCount:3, notes:["C3","F4","G4"] },
  { root:"F4",  type:"Sus2",         noteCount:3, notes:["C3","F4","G4"] },
  { root:"G4",  type:"Quartal",      noteCount:3, notes:["C3","F4","G4"] },
  { root:"F4",  type:"Minor",        noteCount:3, notes:["C3","F4","Ab4"] },
  { root:"C3",  type:"Sus2",         noteCount:3, notes:["C3","G4","D5"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["C3","G4","D5"] },
  { root:"D5",  type:"Quartal",      noteCount:3, notes:["C3","G4","D5"] },
  { root:"C4",  type:"Sus2",         noteCount:3, notes:["C4","D4","G4"] },
  { root:"D4",  type:"Quartal",      noteCount:3, notes:["C4","D4","G4"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["C4","D4","G4"] },
  { root:"C4",  type:"Minor",        noteCount:3, notes:["C4","Eb4","G4"] },
  { root:"Ab4", type:"Major",        noteCount:3, notes:["C4","Eb4","Ab4"] },
  { root:"C4",  type:"Minor Add9",   noteCount:3, notes:["C4","Eb4","D5"] },
  { root:"C4",  type:"Sus4",         noteCount:3, notes:["C4","F4","G4"] },
  { root:"F4",  type:"Sus2",         noteCount:3, notes:["C4","F4","G4"] },
  { root:"G4",  type:"Quartal",      noteCount:3, notes:["C4","F4","G4"] },
  { root:"F4",  type:"Minor",        noteCount:3, notes:["C4","F4","Ab4"] },
  { root:"C4",  type:"Sus2",         noteCount:3, notes:["C4","G4","D5"] },
  { root:"C4",  type:"Quintal",      noteCount:3, notes:["C4","G4","D5"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["C4","G4","D5"] },
  { root:"D5",  type:"Quartal",      noteCount:3, notes:["C4","G4","D5"] },
  { root:"D4",  type:"Diminished",   noteCount:3, notes:["D4","F4","Ab4"] },
  { root:"D4",  type:"Quartal",      noteCount:3, notes:["D4","G4","C5"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["D4","G4","C5"] },
  { root:"C5",  type:"Sus2",         noteCount:3, notes:["D4","G4","C5"] },
  { root:"C5",  type:"Minor",        noteCount:3, notes:["Eb4","G4","C5"] },
  { root:"Ab4", type:"Major",        noteCount:3, notes:["Eb4","Ab4","C5"] },
  { root:"F4",  type:"Sus2",         noteCount:3, notes:["F4","G4","C5"] },
  { root:"G4",  type:"Quartal",      noteCount:3, notes:["F4","G4","C5"] },
  { root:"C5",  type:"Sus4",         noteCount:3, notes:["F4","G4","C5"] },
  { root:"F4",  type:"Minor",        noteCount:3, notes:["F4","Ab4","C5"] },
  { root:"D5",  type:"Diminished",   noteCount:3, notes:["F4","Ab4","D5"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["G4","C5","D5"] },
  { root:"C5",  type:"Sus2",         noteCount:3, notes:["G4","C5","D5"] },
  { root:"D5",  type:"Quartal",      noteCount:3, notes:["G4","C5","D5"] },
  { root:"G4",  type:"Dom7 Sus4",    noteCount:4, notes:["C3","D4","F4","G4"] },
  { root:"D4",  type:"Half-Dim 7th", noteCount:4, notes:["C3","D4","F4","Ab4"] },
  { root:"F4",  type:"Minor 6th",    noteCount:4, notes:["C3","D4","F4","Ab4"] },
  { root:"F4",  type:"Minor 7th",    noteCount:4, notes:["C3","Eb4","F4","Ab4"] },
  { root:"Ab4", type:"Major 6th",    noteCount:4, notes:["C3","Eb4","F4","Ab4"] },
  { root:"Ab4", type:"Major 7th",    noteCount:4, notes:["C3","Eb4","G4","Ab4"] },
  { root:"G4",  type:"Dom7 Sus4",    noteCount:4, notes:["C3","F4","G4","D5"] },
  { root:"F4",  type:"Minor 6th",    noteCount:4, notes:["C3","F4","Ab4","D5"] },
  { root:"D5",  type:"Half-Dim 7th", noteCount:4, notes:["C3","F4","Ab4","D5"] },
  { root:"G4",  type:"Dom7 Sus4",    noteCount:4, notes:["C4","D4","F4","G4"] },
  { root:"D4",  type:"Half-Dim 7th", noteCount:4, notes:["C4","D4","F4","Ab4"] },
  { root:"F4",  type:"Minor 6th",    noteCount:4, notes:["C4","D4","F4","Ab4"] },
  { root:"F4",  type:"Minor 7th",    noteCount:4, notes:["C4","Eb4","F4","Ab4"] },
  { root:"Ab4", type:"Major 6th",    noteCount:4, notes:["C4","Eb4","F4","Ab4"] },
  { root:"Ab4", type:"Major 7th",    noteCount:4, notes:["C4","Eb4","G4","Ab4"] },
  { root:"G4",  type:"Dom7 Sus4",    noteCount:4, notes:["C4","F4","G4","D5"] },
  { root:"F4",  type:"Minor 6th",    noteCount:4, notes:["C4","F4","Ab4","D5"] },
  { root:"D5",  type:"Half-Dim 7th", noteCount:4, notes:["C4","F4","Ab4","D5"] },
  { root:"G4",  type:"Dom7 Sus4",    noteCount:4, notes:["D4","F4","G4","C5"] },
  { root:"D4",  type:"Half-Dim 7th", noteCount:4, notes:["D4","F4","Ab4","C5"] },
  { root:"F4",  type:"Minor 6th",    noteCount:4, notes:["D4","F4","Ab4","C5"] },
  { root:"F4",  type:"Minor 7th",    noteCount:4, notes:["Eb4","F4","Ab4","C5"] },
  { root:"Ab4", type:"Major 6th",    noteCount:4, notes:["Eb4","F4","Ab4","C5"] },
  { root:"Ab4", type:"Major 7th",    noteCount:4, notes:["Eb4","G4","Ab4","C5"] },
  { root:"G4",  type:"Dom7 Sus4",    noteCount:4, notes:["F4","G4","C5","D5"] },
  { root:"F4",  type:"Minor 6th",    noteCount:4, notes:["F4","Ab4","C5","D5"] },
  { root:"D5",  type:"Half-Dim 7th", noteCount:4, notes:["F4","Ab4","C5","D5"] },
];

// ── COLOURS ───────────────────────────────────────────────────────
const NOTE_COLOR = {
  "C3":"#e8c97a","C4":"#e8c97a","D4":"#7ec8a0",
  "Eb4":"#88aaee","F4":"#e88888","G4":"#c0a0e0",
  "Ab4":"#f0b870","C5":"#e8c97a","D5":"#7ec8a0",
};

const CAT_STYLE = {
  "Interval":  { bg:"rgba(139,90,43,0.13)",  border:"rgba(205,133,63,0.38)",  accent:"#cda353" },
  "Triad":     { bg:"rgba(40,90,60,0.13)",   border:"rgba(72,160,100,0.38)", accent:"#72c98e" },
  "7th Chord": { bg:"rgba(60,50,110,0.13)",  border:"rgba(130,100,200,0.38)",accent:"#b09de0" },
};

function getCategory(type) {
  if (["7th","6th","Add9"].some(k => type.includes(k)))                     return "7th Chord";
  if (["Major","Minor","Diminished","Augmented","Sus","Quartal","Quintal"].some(k => type.includes(k))) return "Triad";
  return "Interval";
}

// ── AUDIO ENGINE ──────────────────────────────────────────────────
function useHandpanAudio() {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === "closed")
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const playNote = useCallback((freq, t, ctx) => {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.45, t);
    master.connect(ctx.destination);
    [{ r:1,a:.65 },{ r:2,a:.30 },{ r:3,a:.07 },{ r:4.97,a:.03 }].forEach(({ r, a }) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(freq * r, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + .007);
      g.gain.exponentialRampToValueAtTime(a * .45, t + .25);
      g.gain.exponentialRampToValueAtTime(.0001, t + 3.8);
      osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 4);
    });
    const sz = Math.floor(ctx.sampleRate * .04), buf = ctx.createBuffer(1, sz, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i=0;i<sz;i++) d[i]=Math.random()*2-1;
    const ns=ctx.createBufferSource(); ns.buffer=buf;
    const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=freq*2; bp.Q.value=18;
    const ng=ctx.createGain(); ng.gain.setValueAtTime(.05,t); ng.gain.exponentialRampToValueAtTime(.0001,t+.06);
    ns.connect(bp); bp.connect(ng); ng.connect(master); ns.start(t); ns.stop(t+.07);
  }, []);

  const playChord = useCallback((notes, stagger=0.07) => {
    const ctx = getCtx(), now = ctx.currentTime;
    notes.forEach((n, i) => { if (NOTE_FREQ[n]) playNote(NOTE_FREQ[n], now + i * stagger, ctx); });
  }, [playNote]);

  return { playChord };
}

// ── HANDPAN SVG ───────────────────────────────────────────────────
const RING_ORDER = ["C5","G4","Eb4","C4","D4","F4","Ab4","D5"];

function HandpanDiagram({ activeNotes, onNoteToggle }) {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 300 300"
      style={{ display:"block", maxWidth:280, margin:"0 auto", touchAction:"none" }}
    >
      <defs>
        <radialGradient id="panBg" cx="50%" cy="38%" r="60%">
          <stop offset="0%"   stopColor="#26200f"/>
          <stop offset="100%" stopColor="#0c0b08"/>
        </radialGradient>
        <filter id="softglow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r={143} fill="none" stroke="rgba(205,163,83,0.10)" strokeWidth={2}/>
      <circle cx={CX} cy={CY} r={139} fill="url(#panBg)" stroke="rgba(205,163,83,0.22)" strokeWidth={1.5}/>
      <circle cx={CX} cy={CY} r={114} fill="none" stroke="rgba(205,163,83,0.06)" strokeWidth={1} strokeDasharray="3 8"/>

      {/* Spokes */}
      {RING_ORDER.map(n => {
        const p = NOTE_POS[n], lit = activeNotes.includes(n);
        return <line key={n} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke={lit ? NOTE_COLOR[n]+"55" : "rgba(205,163,83,0.05)"}
          strokeWidth={lit ? 1.5 : 1}
          style={{ transition:"stroke .3s" }}
        />;
      })}

      {/* Nodes — ding last so it renders on top */}
      {[...RING_ORDER, "C3"].map(n => {
        const { x, y, r, isDing } = NOTE_POS[n];
        const lit  = activeNotes.includes(n);
        const col  = NOTE_COLOR[n];
        const lbl  = n.replace("b","♭").replace(/\d/,"");
        const oct  = n.match(/\d/)?.[0] || "";

        return (
          <g key={n}
            onClick={() => onNoteToggle(n)}
            style={{ cursor:"pointer" }}
          >
            {lit && (
              <circle cx={x} cy={y} r={r+12} fill={col+"18"} filter="url(#softglow)"/>
            )}
            <circle cx={x} cy={y} r={r}
              fill={lit ? col+"38" : isDing ? "rgba(205,163,83,0.09)" : "rgba(28,23,12,0.92)"}
              stroke={lit ? col : isDing ? "rgba(205,163,83,0.55)" : "rgba(160,130,60,0.22)"}
              strokeWidth={lit ? 2.5 : 1.5}
              style={{ transition:"all .22s" }}
            />
            <circle cx={x} cy={y} r={r-6} fill="none"
              stroke={lit ? col+"55" : "rgba(205,163,83,0.05)"}
              strokeWidth={1} style={{ transition:"stroke .22s" }}
            />
            <text x={x} y={isDing ? y-4 : y+1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={isDing ? 13 : 10}
              fontFamily="Georgia,'Times New Roman',serif"
              fill={lit ? col : isDing ? "#cda353" : "#8a7a58"}
              style={{ userSelect:"none", pointerEvents:"none", transition:"fill .22s" }}
            >{lbl}</text>
            {isDing && (
              <text x={x} y={y+9} textAnchor="middle" fontSize={8}
                fontFamily="Georgia,serif" fill={lit ? col+"bb" : "#6b5a30"}
                style={{ userSelect:"none", pointerEvents:"none" }}
              >ding</text>
            )}
            {!isDing && oct && (
              <text x={x} y={y+13} textAnchor="middle" fontSize={7}
                fontFamily="Georgia,serif" fill={lit ? col+"88" : "#5a4a28"}
                style={{ userSelect:"none", pointerEvents:"none" }}
              >{oct}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── CHORD CARD ────────────────────────────────────────────────────
function ChordCard({ chord, isSelected, onClick }) {
  const s = CAT_STYLE[getCategory(chord.type)] || CAT_STYLE["Interval"];
  return (
    <div onClick={onClick} style={{
      background: isSelected ? "rgba(205,163,83,0.14)" : s.bg,
      border: `1px solid ${isSelected ? "rgba(205,163,83,0.70)" : s.border}`,
      borderRadius:10, padding:"11px 13px", cursor:"pointer",
      transition:"all .18s",
      transform: isSelected ? "scale(1.02)" : "scale(1)",
      boxShadow: isSelected ? "0 0 20px rgba(205,163,83,0.13)" : "none",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:7 }}>
        <div style={{ lineHeight:1.3 }}>
          <span style={{ color:s.accent, fontSize:14, fontFamily:"Georgia,serif" }}>
            {chord.root.replace("b","♭")}
          </span>{" "}
          <span style={{ color:"#a09070", fontSize:12, fontFamily:"Georgia,serif" }}>
            {chord.type}
          </span>
        </div>
        <span style={{
          fontSize:9, color:s.accent+"bb", border:`1px solid ${s.accent}33`,
          borderRadius:4, padding:"2px 6px", letterSpacing:1,
          flexShrink:0, marginLeft:6, fontFamily:"Georgia,serif",
        }}>{chord.noteCount}♩</span>
      </div>
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {chord.notes.map(n => (
          <span key={n} style={{
            background:NOTE_COLOR[n]+"18", border:`1px solid ${NOTE_COLOR[n]}55`,
            color:NOTE_COLOR[n], borderRadius:4, padding:"2px 7px",
            fontSize:10, fontFamily:"monospace",
          }}>{n.replace("b","♭")}</span>
        ))}
      </div>
    </div>
  );
}

// ── SMALL BUTTON ─────────────────────────────────────────────────
const Btn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    background: active ? "rgba(205,163,83,0.20)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${active ? "rgba(205,163,83,0.58)" : "rgba(255,255,255,0.08)"}`,
    color: active ? "#e8d4a0" : "#7a6a50",
    borderRadius:6, padding:"5px 12px", cursor:"pointer",
    fontSize:11, fontFamily:"Georgia,serif", transition:"all .15s", whiteSpace:"nowrap",
  }}>{children}</button>
);

// ── APP ───────────────────────────────────────────────────────────
const NOTE_LIST = ["C3","C4","D4","Eb4","F4","G4","Ab4","C5","D5"];

// Shared single AudioContext for note taps
let _sharedCtx = null;
function getSharedCtx() {
  if (!_sharedCtx || _sharedCtx.state === "closed")
    _sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_sharedCtx.state === "suspended") _sharedCtx.resume();
  return _sharedCtx;
}

function playSingleNote(note) {
  if (!NOTE_FREQ[note]) return;
  const ctx = getSharedCtx();
  const t = ctx.currentTime;
  const master = ctx.createGain(); master.gain.value = 0.4; master.connect(ctx.destination);
  [{ r:1,a:.65 },{ r:2,a:.30 },{ r:3,a:.07 }].forEach(({ r, a }) => {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = NOTE_FREQ[note] * r;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t+.007);
    g.gain.exponentialRampToValueAtTime(a*.4, t+.25); g.gain.exponentialRampToValueAtTime(.0001, t+3.5);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t+4);
  });
}

export default function HandpanAtlas() {
  // activeNotes = notes lit on the handpan (from pan taps OR chord click)
  const [activeNotes, setActiveNotes] = useState([]);
  // source: "pan" = user tapped notes | "chord" = user clicked a chord card | null = browse
  const [activeSource, setActiveSource] = useState(null);

  // List-browse filters (used only in browse mode)
  const [filterCount, setFilterCount] = useState("all");
  const [filterCat,   setFilterCat]   = useState("all");
  const [filterNote,  setFilterNote]  = useState("all");
  const [search,      setSearch]      = useState("");

  // Selected chord card index
  const [selectedIdx, setSelectedIdx] = useState(null);

  const { playChord } = useHandpanAudio();

  // ── tap a note on the pan ──────────────────────────────────────
  const handleNoteToggle = useCallback((note) => {
    setActiveSource("pan");
    setSelectedIdx(null);
    setActiveNotes(prev => {
      const wasActive = prev.includes(note);
      if (!wasActive) playSingleNote(note);
      return wasActive ? prev.filter(n => n !== note) : [...prev, note];
    });
  }, []);

  // ── chord card click ──────────────────────────────────────────
  const handleChordClick = (chord, idx) => {
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      setActiveNotes([]);
      setActiveSource(null);
      return;
    }
    setSelectedIdx(idx);
    setActiveNotes(chord.notes);
    setActiveSource("chord");
    playChord(chord.notes);
  };

  // ── derived state ─────────────────────────────────────────────
  const panMode   = activeSource === "pan"   && activeNotes.length > 0;
  const chordMode = activeSource === "chord" && activeNotes.length > 0;

  const filtered = useMemo(() => {
    if (panMode || chordMode) {
      // show chords that contain ALL the active notes
      return ALL_CHORDS.filter(c => activeNotes.every(n => c.notes.includes(n)));
    }
    return ALL_CHORDS.filter(c => {
      if (filterCount !== "all" && c.noteCount !== parseInt(filterCount)) return false;
      if (filterCat   !== "all" && getCategory(c.type) !== filterCat)    return false;
      if (filterNote  !== "all" && !c.notes.includes(filterNote))        return false;
      if (search && !c.type.toLowerCase().includes(search.toLowerCase()) &&
                    !c.root.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [panMode, chordMode, activeNotes, filterCount, filterCat, filterNote, search]);

  // ── clear handlers ────────────────────────────────────────────
  const clearActive = () => { setActiveNotes([]); setActiveSource(null); setSelectedIdx(null); };

  const clearFilters = () => {
    setSearch(""); setFilterCount("all"); setFilterCat("all");
    setFilterNote("all"); setSelectedIdx(null);
  };

  const stats = {
    total: ALL_CHORDS.length,
    two:   ALL_CHORDS.filter(c=>c.noteCount===2).length,
    three: ALL_CHORDS.filter(c=>c.noteCount===3).length,
    four:  ALL_CHORDS.filter(c=>c.noteCount===4).length,
  };

  const matchedNames = filtered.map(c => `${c.root.replace("b","♭")} ${c.type}`);

  return (
    <div style={{
      minHeight:"100vh",
      background:"#0c0b09",
      color:"#d4c8a8",
      fontFamily:"Georgia,'Times New Roman',serif",
      WebkitTextSizeAdjust:"100%",
    }}>

      {/* ── STATIC HEADER ── */}
      <div style={{
        background:"linear-gradient(180deg,#191408 0%,#0f0d08 100%)",
        borderBottom:"1px solid rgba(205,163,83,0.14)",
        padding:"20px 16px 16px",
        textAlign:"center",
      }}>
        <div style={{ fontSize:9, letterSpacing:5, color:"#7a6a3a", textTransform:"uppercase", marginBottom:4 }}>
          Handpan · C Minor · 9 Tones
        </div>
        <h1 style={{ fontSize:"clamp(20px,5vw,30px)", fontWeight:"normal", color:"#e8d4a0", margin:"0 0 6px", letterSpacing:3 }}>
          Chord Atlas
        </h1>
        <div style={{ fontSize:11, color:"#5a5030", letterSpacing:1 }}>
          C3 · C4 · D4 · E♭4 · F4 · G4 · A♭4 · C5 · D5
        </div>
        {/* stats */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginTop:14 }}>
          {[["Total",stats.total],["2♩",stats.two],["3♩",stats.three],["4♩",stats.four]].map(([l,v]) => (
            <div key={l} style={{
              background:"rgba(205,163,83,0.07)", border:"1px solid rgba(205,163,83,0.13)",
              borderRadius:8, padding:"4px 12px", textAlign:"center",
            }}>
              <div style={{ fontSize:17, color:"#cda353" }}>{v}</div>
              <div style={{ fontSize:8, color:"#6a5a2a", letterSpacing:2, textTransform:"uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STICKY HANDPAN ── */}
      <div style={{
        position:"sticky",
        top:0,
        zIndex:100,
        background:"rgba(10,9,6,0.96)",
        borderBottom:"1px solid rgba(205,163,83,0.18)",
        backdropFilter:"blur(10px)",
        WebkitBackdropFilter:"blur(10px)",
        padding:"10px 12px 8px",
      }}>
        <div style={{
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          gap:8,
          maxWidth:500,
          margin:"0 auto",
        }}>
          {/* Pan diagram */}
          <div style={{ width:"100%", maxWidth:260 }}>
            <HandpanDiagram activeNotes={activeNotes} onNoteToggle={handleNoteToggle} />
          </div>

          {/* Active notes + chord names */}
          {activeNotes.length > 0 ? (
            <div style={{ width:"100%", maxWidth:440 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:5 }}>
                <span style={{ fontSize:9, color:"#7a6a3a", letterSpacing:3, textTransform:"uppercase" }}>
                  {chordMode ? "Chord" : "Playing"}
                </span>
                {activeNotes.map(n => (
                  <span key={n}
                    onClick={() => panMode ? handleNoteToggle(n) : clearActive()}
                    style={{
                      background:NOTE_COLOR[n]+"22", border:`1px solid ${NOTE_COLOR[n]}77`,
                      color:NOTE_COLOR[n], borderRadius:4, padding:"2px 8px",
                      fontSize:11, fontFamily:"monospace", cursor:"pointer",
                    }}>{n.replace("b","♭")}{panMode ? " ✕" : ""}</span>
                ))}
                <button onClick={clearActive} style={{
                  background:"rgba(160,60,60,0.15)", border:"1px solid rgba(160,60,60,0.30)",
                  color:"#c07070", borderRadius:6, padding:"2px 10px",
                  cursor:"pointer", fontSize:10, fontFamily:"Georgia,serif",
                }}>Clear</button>
              </div>
              {filtered.length > 0 ? (
                <div style={{ textAlign:"center", fontSize:11, color:"#8a7a50", fontStyle:"italic" }}>
                  {filtered.length} chord{filtered.length!==1?"s":""}: {matchedNames.slice(0,4).join(" · ")}{filtered.length>4?" …":""}
                </div>
              ) : (
                <div style={{ textAlign:"center", fontSize:11, color:"#5a4a28", fontStyle:"italic" }}>
                  No chord found for this combination
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize:10, color:"#4a3a18", letterSpacing:1, textAlign:"center" }}>
              Tap notes to build a chord · or browse below
            </div>
          )}
        </div>
      </div>

      {/* ── BROWSE FILTERS (hidden in pan or chord mode) ── */}
      {!panMode && !chordMode && (
        <div style={{ padding:"14px 14px 0", maxWidth:880, margin:"0 auto", display:"flex", flexDirection:"column", gap:9 }}>

          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:10, color:"#5a4a22", letterSpacing:3, textTransform:"uppercase", minWidth:36 }}>Notes</span>
            {["all","2","3","4"].map(n => (
              <Btn key={n} active={filterCount===n} onClick={() => setFilterCount(n)}>
                {n==="all" ? "All" : `${n}-note`}
              </Btn>
            ))}
          </div>

          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:10, color:"#5a4a22", letterSpacing:3, textTransform:"uppercase", minWidth:36 }}>Type</span>
            {["all","Interval","Triad","7th Chord"].map(c => (
              <Btn key={c} active={filterCat===c} onClick={() => setFilterCat(c)}>
                {c==="all" ? "All Types" : c}
              </Btn>
            ))}
          </div>

          <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:10, color:"#5a4a22", letterSpacing:3, textTransform:"uppercase", minWidth:36 }}>Note</span>
            {["all",...NOTE_LIST].map(n => (
              <button key={n} onClick={() => setFilterNote(n)} style={{
                background: filterNote===n ? (n==="all" ? "rgba(205,163,83,0.20)" : NOTE_COLOR[n]+"22") : "rgba(255,255,255,0.04)",
                border: `1px solid ${filterNote===n ? (n==="all" ? "rgba(205,163,83,0.58)" : NOTE_COLOR[n]) : "rgba(255,255,255,0.08)"}`,
                color: filterNote===n ? (n==="all" ? "#e8d4a0" : NOTE_COLOR[n]) : "#7a6a50",
                borderRadius:6, padding:"4px 9px", cursor:"pointer",
                fontSize:10, fontFamily:"Georgia,serif", transition:"all .15s",
              }}>
                {n==="all" ? "All" : n.replace("b","♭")}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:10, color:"#5a4a22", letterSpacing:3, textTransform:"uppercase", minWidth:36 }}>Find</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="minor, sus, dim…"
              style={{
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.10)",
                borderRadius:6, padding:"5px 12px", color:"#d4c8a8",
                fontSize:11, fontFamily:"Georgia,serif", outline:"none",
                width:"min(180px, 55vw)",
              }}
            />
            {(search || filterCount!=="all" || filterCat!=="all" || filterNote!=="all") && (
              <button onClick={clearFilters} style={{
                background:"rgba(160,60,60,0.15)", border:"1px solid rgba(160,60,60,0.30)",
                color:"#c07070", borderRadius:6, padding:"4px 10px",
                cursor:"pointer", fontSize:10, fontFamily:"Georgia,serif",
              }}>Clear</button>
            )}
          </div>

          <div style={{ fontSize:10, color:"#4a3a18", letterSpacing:1, paddingBottom:4 }}>
            {filtered.length} chord{filtered.length!==1?"s":""} — click a card to hear it ♪
          </div>
        </div>
      )}

      {/* active-mode label for list */}
      {(panMode || chordMode) && filtered.length > 0 && (
        <div style={{ padding:"10px 14px 2px", maxWidth:880, margin:"0 auto" }}>
          <div style={{ fontSize:10, color:"#4a3a18", letterSpacing:1 }}>
            {filtered.length} chord{filtered.length!==1?"s":""} containing {activeNotes.map(n=>n.replace("b","♭")).join(" + ")} — click to hear ♪
          </div>
        </div>
      )}

      {/* ── CHORD GRID ── */}
      <div style={{
        padding:"8px 12px 72px",
        maxWidth:880, margin:"0 auto",
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(min(200px, 100%), 1fr))",
        gap:8,
      }}>
        {filtered.map((chord, i) => (
          <ChordCard
            key={`${chord.root}${chord.type}${chord.notes.join("")}${i}`}
            chord={chord}
            isSelected={selectedIdx === i}
            onClick={() => handleChordClick(chord, i)}
          />
        ))}
        {filtered.length === 0 && (panMode || chordMode) && (
          <div style={{
            gridColumn:"1/-1", textAlign:"center", padding:"40px 20px",
            color:"#4a3a18", fontSize:13, fontStyle:"italic",
          }}>
            No chord found for this note combination.<br/>
            <span style={{ fontSize:11 }}>Try removing one of the active notes.</span>
          </div>
        )}
      </div>
    </div>
  );
}