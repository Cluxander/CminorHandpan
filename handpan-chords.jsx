import { useState, useMemo, useRef, useCallback } from "react";

// ── FREQUENCIES ───────────────────────────────────────────────────
const NOTE_FREQ = {
  "C3": 130.81, "C4": 261.63, "D4": 293.66,
  "Eb4": 311.13, "F4": 349.23, "G4": 392.00,
  "Ab4": 415.30, "C5": 523.25, "D5": 587.33,
};

// ── NOTE POSITIONS on the handpan ────────────────────────────────
// Clock-face convention (0° = 12 o'clock, clockwise positive)
// C3  = ding (centre)
// C4  = down-right   → 4 o'clock  = 120°
// D4  = down-left    → 8 o'clock  = 240°
// Eb4 = oblique down-right → 3 o'clock = 90°   (between right & down-right)
// F4  = oblique down-left  → 9 o'clock = 270°
// G4  = oblique up-right   → 1 o'clock = 30°
// Ab4 = oblique up-left    → 11 o'clock = 330°
// C5  = up-right     → 2 o'clock  = 60°
// D5  = up-left      → 10 o'clock = 300°

const CX = 150, CY = 150, RING_R = 90;

function polar(angleDeg, r = RING_R) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

const NOTE_POS = {
  "C3":  { x: CX, y: CY, r: 36, isDing: true },
  "C4":  { ...polar(157.5), r: 24 },   // down-right
  "D4":  { ...polar(202.5), r: 24 },   // down-left
  "Eb4": { ...polar(112.5),  r: 24 },   // obliq down-right (3 o'clock)
  "F4":  { ...polar(247.5), r: 24 },   // obliq down-left  (9 o'clock)
  "G4":  { ...polar(67.5),  r: 24 },   // obliq up-right   (1 o'clock)
  "Ab4": { ...polar(292.5), r: 24 },   // obliq up-left    (11 o'clock)
  "C5":  { ...polar(22.5),  r: 24 },   // up-right         (2 o'clock)
  "D5":  { ...polar(337.5), r: 24 },   // up-left          (10 o'clock)
};

// ── CHORD DATA ────────────────────────────────────────────────────
const ALL_CHORDS = [
  // 2-note intervals
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
  // 3-note
  { root:"C3",  type:"Sus2",         noteCount:3, notes:["C3","D4","G4"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["C3","D4","G4"] },
  { root:"C3",  type:"Minor",        noteCount:3, notes:["C3","Eb4","G4"] },
  { root:"Ab4", type:"Major",        noteCount:3, notes:["C3","Eb4","Ab4"] },
  { root:"C3",  type:"Sus4",         noteCount:3, notes:["C3","F4","G4"] },
  { root:"F4",  type:"Sus2",         noteCount:3, notes:["C3","F4","G4"] },
  { root:"F4",  type:"Minor",        noteCount:3, notes:["C3","F4","Ab4"] },
  { root:"C3",  type:"Sus2",         noteCount:3, notes:["C3","G4","D5"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["C3","G4","D5"] },
  { root:"C4",  type:"Sus2",         noteCount:3, notes:["C4","D4","G4"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["C4","D4","G4"] },
  { root:"C4",  type:"Minor",        noteCount:3, notes:["C4","Eb4","G4"] },
  { root:"Ab4", type:"Major",        noteCount:3, notes:["C4","Eb4","Ab4"] },
  { root:"C4",  type:"Minor Add9",   noteCount:3, notes:["C4","Eb4","D5"] },
  { root:"C4",  type:"Sus4",         noteCount:3, notes:["C4","F4","G4"] },
  { root:"F4",  type:"Sus2",         noteCount:3, notes:["C4","F4","G4"] },
  { root:"F4",  type:"Minor",        noteCount:3, notes:["C4","F4","Ab4"] },
  { root:"C4",  type:"Sus2",         noteCount:3, notes:["C4","G4","D5"] },
  { root:"C4",  type:"Quintal",      noteCount:3, notes:["C4","G4","D5"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["C4","G4","D5"] },
  { root:"D4",  type:"Diminished",   noteCount:3, notes:["D4","F4","Ab4"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["D4","G4","C5"] },
  { root:"C5",  type:"Sus2",         noteCount:3, notes:["D4","G4","C5"] },
  { root:"C5",  type:"Minor",        noteCount:3, notes:["Eb4","G4","C5"] },
  { root:"Ab4", type:"Major",        noteCount:3, notes:["Eb4","Ab4","C5"] },
  { root:"F4",  type:"Sus2",         noteCount:3, notes:["F4","G4","C5"] },
  { root:"C5",  type:"Sus4",         noteCount:3, notes:["F4","G4","C5"] },
  { root:"F4",  type:"Minor",        noteCount:3, notes:["F4","Ab4","C5"] },
  { root:"D5",  type:"Diminished",   noteCount:3, notes:["F4","Ab4","D5"] },
  { root:"G4",  type:"Sus4",         noteCount:3, notes:["G4","C5","D5"] },
  { root:"C5",  type:"Sus2",         noteCount:3, notes:["G4","C5","D5"] },
  // 4-note
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
  "Interval":   {bg:"rgba(139,90,43,0.13)",  border:"rgba(205,133,63,0.38)", accent:"#cda353"},
  "Triad":      {bg:"rgba(40,90,60,0.13)",   border:"rgba(72,160,100,0.38)",accent:"#72c98e"},
  "7th Chord":  {bg:"rgba(60,50,110,0.13)",  border:"rgba(130,100,200,0.38)",accent:"#b09de0"},
};

const TRIAD_KEYWORDS  = ["Major","Minor","Diminished","Augmented","Sus2","Sus4","Quartal","Quintal","Add9"];
const SEVENTH_KEYWORDS = ["7th","6th","Add9"];

function getCategory(type) {
  if (SEVENTH_KEYWORDS.some(k => type.includes(k))) return "7th Chord";
  if (TRIAD_KEYWORDS.some(k => type.includes(k)))  return "Triad";
  return "Interval";
}

// ── AUDIO ENGINE ──────────────────────────────────────────────────
function useHandpanAudio() {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const playNote = useCallback((freq, startTime, ctx) => {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.55, startTime);
    master.connect(ctx.destination);

    // Handpan: fundamental + strong octave partial + soft upper harmonics
    [
      { ratio: 1,    amp: 0.65 },
      { ratio: 2,    amp: 0.30 },
      { ratio: 3,    amp: 0.07 },
      { ratio: 4.97, amp: 0.03 }, // slight inharmonicity
    ].forEach(({ ratio, amp }) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * ratio, startTime);
      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(amp, startTime + 0.007);
      g.gain.exponentialRampToValueAtTime(amp * 0.45, startTime + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, startTime + 3.8);
      osc.connect(g); g.connect(master);
      osc.start(startTime); osc.stop(startTime + 4);
    });

    // Metallic attack burst
    const bufSize = Math.floor(ctx.sampleRate * 0.04);
    const buf  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const ns  = ctx.createBufferSource();
    ns.buffer  = buf;
    const bp   = ctx.createBiquadFilter();
    bp.type    = "bandpass"; bp.frequency.value = freq * 2; bp.Q.value = 18;
    const ng   = ctx.createGain();
    ng.gain.setValueAtTime(0.05, startTime);
    ng.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.06);
    ns.connect(bp); bp.connect(ng); ng.connect(master);
    ns.start(startTime); ns.stop(startTime + 0.07);
  }, []);

  const playChord = useCallback((notes) => {
    const ctx  = getCtx();
    const now  = ctx.currentTime;
    notes.forEach((n, i) => {
      if (NOTE_FREQ[n]) playNote(NOTE_FREQ[n], now + i * 0.07, ctx);
    });
  }, [playNote]);

  return { playChord };
}

// ── HANDPAN SVG ───────────────────────────────────────────────────
function HandpanDiagram({ highlighted }) {
  const [hov, setHov] = useState(null);
  const NOTE_ORDER = ["C3","C4","D4","Eb4","F4","G4","Ab4","C5","D5"];

  return (
    <svg width={300} height={300} viewBox="0 0 300 300" style={{display:"block",overflow:"visible"}}>
      <defs>
        <radialGradient id="panBg" cx="50%" cy="38%" r="60%">
          <stop offset="0%"   stopColor="#26200f"/>
          <stop offset="100%" stopColor="#0c0b08"/>
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softglow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Shell */}
      <circle cx={CX} cy={CY} r={144} fill="none" stroke="rgba(205,163,83,0.10)" strokeWidth={2}/>
      <circle cx={CX} cy={CY} r={140} fill="url(#panBg)" stroke="rgba(205,163,83,0.20)" strokeWidth={1.5}/>
      <circle cx={CX} cy={CY} r={115} fill="none" stroke="rgba(205,163,83,0.06)" strokeWidth={1} strokeDasharray="3 7"/>

      {/* Spokes */}
      {NOTE_ORDER.filter(n=>n!=="C3").map(n => {
        const p = NOTE_POS[n];
        const lit = highlighted.includes(n);
        return (
          <line key={n} x1={CX} y1={CY} x2={p.x} y2={p.y}
            stroke={lit ? NOTE_COLOR[n]+"66" : "rgba(205,163,83,0.05)"}
            strokeWidth={lit ? 1.5 : 1}
            style={{transition:"all 0.3s"}}
          />
        );
      })}

      {/* Tone fields */}
      {NOTE_ORDER.map(n => {
        const {x, y, r, isDing} = NOTE_POS[n];
        const lit = highlighted.includes(n);
        const isHov = hov === n;
        const col = NOTE_COLOR[n];
        const label = n.replace("b","♭").replace(/\d/,"");
        const oct   = n.match(/\d/)?.[0] || "";

        return (
          <g key={n}
            onMouseEnter={()=>setHov(n)}
            onMouseLeave={()=>setHov(null)}
            style={{cursor:"default"}}
          >
            {(lit||isHov) && (
              <circle cx={x} cy={y} r={r+10}
                fill={col+"1a"} filter="url(#softglow)"
                style={{transition:"all 0.3s"}}
              />
            )}
            <circle cx={x} cy={y} r={r}
              fill={lit ? col+"2a" : isDing ? "rgba(205,163,83,0.09)" : "rgba(28,23,12,0.9)"}
              stroke={lit ? col : isHov ? col+"99" : isDing ? "rgba(205,163,83,0.55)" : "rgba(160,130,60,0.22)"}
              strokeWidth={lit ? 2 : 1.5}
              style={{transition:"all 0.25s"}}
            />
            <circle cx={x} cy={y} r={r-6}
              fill="none"
              stroke={lit ? col+"44" : "rgba(205,163,83,0.05)"}
              strokeWidth={1}
              style={{transition:"all 0.25s"}}
            />
            {/* Note label */}
            <text x={x} y={isDing ? y-5 : y+1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={isDing ? 13 : 10}
              fontFamily="Georgia,'Times New Roman',serif"
              fill={lit ? col : isHov ? col+"cc" : isDing ? "#cda353" : "#8a7a58"}
              style={{transition:"all 0.25s", userSelect:"none", pointerEvents:"none"}}
            >{label}</text>
            {isDing && (
              <text x={x} y={y+9} textAnchor="middle"
                fontSize={8} fontFamily="Georgia,serif"
                fill={lit ? col+"bb" : "#6b5a30"}
                style={{userSelect:"none",pointerEvents:"none"}}
              >ding</text>
            )}
            {!isDing && oct && (
              <text x={x} y={y+12} textAnchor="middle"
                fontSize={7} fontFamily="Georgia,serif"
                fill={lit ? col+"88" : "#5a4a28"}
                style={{userSelect:"none",pointerEvents:"none"}}
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
  const cat = getCategory(chord.type);
  const s   = CAT_STYLE[cat] || CAT_STYLE["Interval"];

  return (
    <div onClick={onClick} style={{
      background: isSelected ? "rgba(205,163,83,0.13)" : s.bg,
      border: `1px solid ${isSelected ? "rgba(205,163,83,0.65)" : s.border}`,
      borderRadius: 10, padding: "11px 13px",
      cursor: "pointer", transition: "all 0.18s",
      transform: isSelected ? "scale(1.022)" : "scale(1)",
      boxShadow: isSelected ? "0 0 18px rgba(205,163,83,0.13)" : "none",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
        <div style={{lineHeight:1.3}}>
          <span style={{color:s.accent, fontSize:14, fontFamily:"Georgia,serif"}}>
            {chord.root.replace("b","♭")}
          </span>
          {" "}
          <span style={{color:"#a09070", fontSize:12, fontFamily:"Georgia,serif"}}>
            {chord.type}
          </span>
        </div>
        <span style={{
          fontSize:9, color:s.accent+"bb", border:`1px solid ${s.accent}33`,
          borderRadius:4, padding:"2px 6px", letterSpacing:1,
          flexShrink:0, marginLeft:6, fontFamily:"Georgia,serif",
        }}>{chord.noteCount}♩</span>
      </div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {chord.notes.map(n=>(
          <span key={n} style={{
            background:NOTE_COLOR[n]+"18",
            border:`1px solid ${NOTE_COLOR[n]}55`,
            color:NOTE_COLOR[n], borderRadius:4,
            padding:"2px 7px", fontSize:10, fontFamily:"monospace",
          }}>{n.replace("b","♭")}</span>
        ))}
      </div>
    </div>
  );
}

// ── FILTER BUTTON ─────────────────────────────────────────────────
const Btn = ({active, onClick, children}) => (
  <button onClick={onClick} style={{
    background: active ? "rgba(205,163,83,0.20)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${active ? "rgba(205,163,83,0.58)" : "rgba(255,255,255,0.08)"}`,
    color: active ? "#e8d4a0" : "#7a6a50",
    borderRadius:6, padding:"5px 13px", cursor:"pointer",
    fontSize:11, fontFamily:"Georgia,serif", transition:"all 0.15s", whiteSpace:"nowrap",
  }}>{children}</button>
);

// ── APP ───────────────────────────────────────────────────────────
const NOTE_ORDER = ["C3","C4","D4","Eb4","F4","G4","Ab4","C5","D5"];

export default function HandpanAtlas() {
  const [filterCount, setFilterCount] = useState("all");
  const [filterCat,   setFilterCat]   = useState("all");
  const [filterNote,  setFilterNote]  = useState("all");
  const [search,      setSearch]      = useState("");
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [highlighted, setHighlighted] = useState([]);
  const { playChord } = useHandpanAudio();

  const filtered = useMemo(() => ALL_CHORDS.filter(c => {
    if (filterCount !== "all" && c.noteCount !== parseInt(filterCount)) return false;
    if (filterCat   !== "all" && getCategory(c.type) !== filterCat)     return false;
    if (filterNote  !== "all" && !c.notes.includes(filterNote))         return false;
    if (search && !c.type.toLowerCase().includes(search.toLowerCase()) &&
                  !c.root.toLowerCase().includes(search.toLowerCase()))  return false;
    return true;
  }), [filterCount, filterCat, filterNote, search]);

  const handleChordClick = (chord, idx) => {
    if (selectedIdx === idx) { setSelectedIdx(null); setHighlighted([]); return; }
    setSelectedIdx(idx);
    setHighlighted(chord.notes);
    playChord(chord.notes);
  };

  const clearAll = () => {
    setSearch(""); setFilterCount("all"); setFilterCat("all");
    setFilterNote("all"); setSelectedIdx(null); setHighlighted([]);
  };

  const stats = {
    total: ALL_CHORDS.length,
    two:   ALL_CHORDS.filter(c=>c.noteCount===2).length,
    three: ALL_CHORDS.filter(c=>c.noteCount===3).length,
    four:  ALL_CHORDS.filter(c=>c.noteCount===4).length,
  };

  const isDirty = search || filterCount!=="all" || filterCat!=="all" || filterNote!=="all";

  return (
    <div style={{minHeight:"100vh", background:"#0c0b09", color:"#d4c8a8", fontFamily:"Georgia,'Times New Roman',serif"}}>

      {/* ── HEADER ── */}
      <div style={{
        background:"linear-gradient(180deg,#191408 0%,#0c0b09 100%)",
        borderBottom:"1px solid rgba(205,163,83,0.16)",
        padding:"28px 20px 20px", textAlign:"center",
      }}>
        <div style={{fontSize:10,letterSpacing:6,color:"#7a6a3a",textTransform:"uppercase",marginBottom:6}}>
          Handpan · C Minor · 9 Tones
        </div>
        <h1 style={{fontSize:"clamp(22px,5vw,34px)",fontWeight:"normal",color:"#e8d4a0",margin:"0 0 4px",letterSpacing:3}}>
          Chord Atlas
        </h1>
        <div style={{fontSize:12,color:"#5a5030",letterSpacing:1,marginBottom:18}}>
          C3 · C4 · D4 · E♭4 · F4 · G4 · A♭4 · C5 · D5
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
          {[["Total",stats.total],["2-note",stats.two],["3-note",stats.three],["4-note",stats.four]].map(([l,v])=>(
            <div key={l} style={{
              background:"rgba(205,163,83,0.07)",border:"1px solid rgba(205,163,83,0.14)",
              borderRadius:8,padding:"6px 16px",textAlign:"center",minWidth:60,
            }}>
              <div style={{fontSize:20,color:"#cda353"}}>{v}</div>
              <div style={{fontSize:9,color:"#6a5a2a",letterSpacing:2,textTransform:"uppercase"}}>{l}</div>
            </div>
          ))}
        </div>

        
      </div>
      {/* Handpan */}
      <div style={{display:"flex",position:"sticky",top:0,background:"rgb(12, 11, 9)",zIndex:99,justifyContent:"center"}}>
          <HandpanDiagram highlighted={highlighted} />
        </div>
      {/* ── FILTERS ── */}
      <div style={{padding:"16px 16px 0",maxWidth:880,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:"#5a4a22",letterSpacing:3,textTransform:"uppercase",width:36}}>Notes</span>
          {["all","2","3","4"].map(n=>(
            <Btn key={n} active={filterCount===n} onClick={()=>setFilterCount(n)}>
              {n==="all"?"All":`${n}-note`}
            </Btn>
          ))}
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:"#5a4a22",letterSpacing:3,textTransform:"uppercase",width:36}}>Type</span>
          {["all","Interval","Triad","7th Chord"].map(c=>(
            <Btn key={c} active={filterCat===c} onClick={()=>setFilterCat(c)}>
              {c==="all"?"All Types":c}
            </Btn>
          ))}
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:"#5a4a22",letterSpacing:3,textTransform:"uppercase",width:36}}>Note</span>
          {["all",...NOTE_ORDER].map(n=>(
            <button key={n} onClick={()=>setFilterNote(n)} style={{
              background: filterNote===n ? (n==="all"?"rgba(205,163,83,0.20)":NOTE_COLOR[n]+"22") : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterNote===n ? (n==="all"?"rgba(205,163,83,0.58)":NOTE_COLOR[n]) : "rgba(255,255,255,0.08)"}`,
              color: filterNote===n ? (n==="all"?"#e8d4a0":NOTE_COLOR[n]) : "#7a6a50",
              borderRadius:6, padding:"4px 11px", cursor:"pointer",
              fontSize:10, fontFamily:"Georgia,serif", transition:"all 0.15s",
            }}>
              {n==="all"?"All":n.replace("b","♭")}
            </button>
          ))}
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:"#5a4a22",letterSpacing:3,textTransform:"uppercase",width:36}}>Find</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="minor, sus, dim, quartal…"
            style={{
              background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.10)",
              borderRadius:6,padding:"5px 13px",color:"#d4c8a8",
              fontSize:11,fontFamily:"Georgia,serif",outline:"none",width:190,
            }}
          />
          {isDirty && (
            <button onClick={clearAll} style={{
              background:"rgba(160,60,60,0.15)",border:"1px solid rgba(160,60,60,0.30)",
              color:"#c07070",borderRadius:6,padding:"4px 11px",cursor:"pointer",
              fontSize:10,fontFamily:"Georgia,serif",
            }}>Clear</button>
          )}
        </div>

        <div style={{fontSize:10,color:"#4a3a18",letterSpacing:1,paddingBottom:4}}>
          {filtered.length} chord{filtered.length!==1?"s":""} — click a card to hear it ♪
        </div>
      </div>

      {/* ── CHORD GRID ── */}
      <div style={{
        padding:"8px 14px 64px",
        maxWidth:880, margin:"0 auto",
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",
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
      </div>
    </div>
  );
}
