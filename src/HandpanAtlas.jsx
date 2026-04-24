import { useState, useMemo, useCallback, useEffect } from "react";

// ── VIEWPORT + FONTS ──────────────────────────────────────────────
if (typeof document !== "undefined") {
  let m = document.querySelector('meta[name="viewport"]');
  if (!m) { m = document.createElement("meta"); m.name = "viewport"; document.head.appendChild(m); }
  m.content = "width=device-width, initial-scale=1, maximum-scale=1";
  if (!document.querySelector("#hp-font")) {
    const l = document.createElement("link");
    l.id = "hp-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
  }
}
const FONT = "'Outfit', 'Space Grotesk', system-ui, sans-serif";

// ═══════════════════════════════════════════════════════════════════
// HANDPAN DEFINITION
// ═══════════════════════════════════════════════════════════════════
const HANDPAN = {
  notes: [
    { name:"C3",  midi:48 }, { name:"C4",  midi:60 }, { name:"D4",  midi:62 },
    { name:"Eb4", midi:63 }, { name:"F4",  midi:65 }, { name:"G4",  midi:67 },
    { name:"Ab4", midi:68 }, { name:"C5",  midi:72 }, { name:"D5",  midi:74 },
  ],
  freq: {
    "C3":130.81,"C4":261.63,"D4":293.66,"Eb4":311.13,
    "F4":349.23,"G4":392.00,"Ab4":415.30,"C5":523.25,"D5":587.33,
  },
};

// ═══════════════════════════════════════════════════════════════════
// CHORD TEMPLATES — category = chord quality name, not voice count
// ═══════════════════════════════════════════════════════════════════
const CHORD_TEMPLATES = [
  // Intervals (2 unique pitch classes)
  { name:"Minor 2nd",    cat:"Intervals", intervals:[1]  },
  { name:"Major 2nd",    cat:"Intervals", intervals:[2]  },
  { name:"Minor 3rd",    cat:"Intervals", intervals:[3]  },
  { name:"Major 3rd",    cat:"Intervals", intervals:[4]  },
  { name:"Perfect 4th",  cat:"Intervals", intervals:[5]  },
  { name:"Tritone",      cat:"Intervals", intervals:[6]  },
  { name:"Perfect 5th",  cat:"Intervals", intervals:[7]  },
  { name:"Minor 6th",    cat:"Intervals", intervals:[8]  },
  { name:"Major 6th",    cat:"Intervals", intervals:[9]  },
  { name:"Minor 7th",    cat:"Intervals", intervals:[10] },
  { name:"Major 7th",    cat:"Intervals", intervals:[11] },
  { name:"Octave",       cat:"Intervals", intervals:[0], octave:true },

  // Major family
  { name:"Major",        cat:"Major",    intervals:[4,7]      },
  { name:"Major 7th",    cat:"Major",    intervals:[4,7,11]   },
  { name:"Dominant 7th", cat:"Major",    intervals:[4,7,10]   },
  { name:"Major 6th",    cat:"Major",    intervals:[4,7,9]    },
  { name:"Major 9th",    cat:"Major",    intervals:[2,4,7,11] },
  { name:"Dominant 9th", cat:"Major",    intervals:[2,4,7,10] },
  { name:"Major 6/9",    cat:"Major",    intervals:[2,4,7,9]  },
  { name:"Aug Maj 7th",  cat:"Major",    intervals:[4,8,11]   },
  { name:"Aug 7th",      cat:"Major",    intervals:[4,8,10]   },
  { name:"Augmented",    cat:"Major",    intervals:[4,8]      },

  // Minor family
  { name:"Minor",        cat:"Minor",    intervals:[3,7]      },
  { name:"Minor 7th",    cat:"Minor",    intervals:[3,7,10]   },
  { name:"Min/Maj 7th",  cat:"Minor",    intervals:[3,7,11]   },
  { name:"Minor 6th",    cat:"Minor",    intervals:[3,7,9]    },
  { name:"Minor 9th",    cat:"Minor",    intervals:[2,3,7,10] },
  { name:"Minor 6/9",    cat:"Minor",    intervals:[2,3,7,9]  },
  { name:"Minor 11th",   cat:"Minor",    intervals:[2,3,5,7,10] },

  // Diminished family
  { name:"Diminished",   cat:"Diminished", intervals:[3,6]      },
  { name:"Half-Dim 7th", cat:"Diminished", intervals:[3,6,10]   },
  { name:"Dim 7th",      cat:"Diminished", intervals:[3,6,9]    },

  // Suspended / Modal
  { name:"Sus2",         cat:"Suspended", intervals:[2,7]      },
  { name:"Sus4",         cat:"Suspended", intervals:[5,7]      },
  { name:"Dom 7th Sus4", cat:"Suspended", intervals:[5,7,10]   },

  // Quartal / Quintal
  { name:"Quartal",        cat:"Quartal/Quintal", intervals:[5,10]    },
  { name:"Quartal 4-voice",cat:"Quartal/Quintal", intervals:[3,5,10]  },
  { name:"Quartal 5-voice",cat:"Quartal/Quintal", intervals:[3,5,8,10]},
  { name:"Pentatonic",     cat:"Quartal/Quintal", intervals:[2,5,7,10]},
];

const CAT_ORDER = ["Intervals","Major","Minor","Diminished","Suspended","Quartal/Quintal"];

const CAT_STYLE = {
  "Intervals":      { accent:"#c9a84c", label:"Intervals"       },
  "Major":          { accent:"#6ec87a", label:"Major"           },
  "Minor":          { accent:"#7aace8", label:"Minor"           },
  "Diminished":     { accent:"#d47070", label:"Diminished"      },
  "Suspended":      { accent:"#c0a0e0", label:"Suspended"       },
  "Quartal/Quintal":{ accent:"#f0b870", label:"Quartal / Quintal"},
};

// ═══════════════════════════════════════════════════════════════════
// CHORD DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════════
function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [h, ...t] = arr;
  return [...combinations(t, k-1).map(c=>[h,...c]), ...combinations(t, k)];
}

function detectChords(noteList) {
  const results = [];

  for (let size = 2; size <= Math.min(5, noteList.length); size++) {
    for (const combo of combinations(noteList, size)) {

      // Octave dyad — same pitch class, different octave
      if (size === 2) {
        const [a, b] = combo;
        if ((a.midi % 12) === (b.midi % 12) && a.midi !== b.midi) {
          const lo = a.midi < b.midi ? a : b;
          results.push({
            root: lo.name, name:"Octave", cat:"Intervals", noteCount:2,
            notes: combo.map(n=>n.name),
            key: combo.map(n=>n.name).sort().join("|")+"|Octave|"+lo.name,
          });
        }
      }

      // Reduce to unique pitch classes for template matching
      // C3+C4+Eb4+G4 → {C,Eb,G} → matches Minor
      const uniqueByPC = [];
      const seenPCs = new Set();
      for (const n of combo) {
        const pc = n.midi % 12;
        if (!seenPCs.has(pc)) { seenPCs.add(pc); uniqueByPC.push(n); }
      }

      for (const rootNote of uniqueByPC) {
        const others = uniqueByPC.filter(n => n !== rootNote);
        if (others.length === 0) continue;
        const semitones = others
          .map(n => ((n.midi - rootNote.midi) % 12 + 12) % 12)
          .sort((a,b)=>a-b);

        for (const tmpl of CHORD_TEMPLATES) {
          if (tmpl.octave) continue;
          if (tmpl.intervals.length !== semitones.length) continue;
          const tSorted = tmpl.intervals.slice().sort((a,b)=>a-b);
          if (JSON.stringify(tSorted) !== JSON.stringify(semitones)) continue;
          const key = combo.map(n=>n.name).sort().join("|")+"|"+tmpl.name+"|"+rootNote.name;
          results.push({
            root: rootNote.name, name: tmpl.name, cat: tmpl.cat,
            noteCount: size, notes: combo.map(n=>n.name), key,
          });
        }
      }
    }
  }

  // Deduplicate by key
  const seen = new Set();
  return results.filter(c => { if (seen.has(c.key)) return false; seen.add(c.key); return true; });
}

// After detecting all chords, merge those with identical pitch-class sets + same name + same root
// into a single card that lists all voicings (note combos)
function mergeChords(chords) {
  // Canonical key: sorted pitch classes + chord name + root pitch class
  const groups = new Map();
  for (const c of chords) {
    const pcs = [...new Set(c.notes.map(n => {
      const note = HANDPAN.notes.find(x => x.name === n);
      return note ? note.midi % 12 : 0;
    }))].sort((a,b)=>a-b).join(",");
    const mergeKey = pcs + "|" + c.name + "|" + (HANDPAN.notes.find(x=>x.name===c.root)?.midi%12 ?? 0);
    if (!groups.has(mergeKey)) {
      groups.set(mergeKey, { ...c, voicings: [c.notes], mergeKey });
    } else {
      const existing = groups.get(mergeKey);
      // Add this voicing if not already present
      const voicingStr = c.notes.slice().sort().join(",");
      if (!existing.voicings.some(v => v.slice().sort().join(",") === voicingStr)) {
        existing.voicings.push(c.notes);
      }
    }
  }
  // Return merged array; notes = union of all notes across voicings (sorted by midi)
  return Array.from(groups.values()).map(g => {
    const allNoteNames = [...new Set(g.voicings.flat())];
    const sorted = allNoteNames.sort((a,b) => {
      const ma = HANDPAN.notes.find(x=>x.name===a)?.midi ?? 0;
      const mb = HANDPAN.notes.find(x=>x.name===b)?.midi ?? 0;
      return ma - mb;
    });
    return {
      ...g,
      notes: sorted,          // all notes that appear in any voicing
      voicings: g.voicings,   // list of specific note combinations
      key: g.mergeKey,
    };
  });
}

const RAW_CHORDS   = detectChords(HANDPAN.notes);
const ALL_CHORDS   = mergeChords(RAW_CHORDS);
const ALL_CHORD_NAMES = [...new Set(ALL_CHORDS.map(c=>c.name))].sort();

// ── NOTE POSITIONS ────────────────────────────────────────────────
const CX=150, CY=150, RING_R=90;
function polar(deg, r=RING_R) {
  const rad=((deg-90)*Math.PI)/180;
  return { x:+(CX+r*Math.cos(rad)).toFixed(2), y:+(CY+r*Math.sin(rad)).toFixed(2) };
}
const NOTE_POS = {
  "C3": {x:CX,y:CY,r:36,isDing:true},
  "C5": {...polar(22.5), r:24}, "G4": {...polar(67.5), r:24},
  "Eb4":{...polar(112.5),r:24}, "C4": {...polar(157.5),r:24},
  "D4": {...polar(202.5),r:24}, "F4": {...polar(247.5),r:24},
  "Ab4":{...polar(292.5),r:24}, "D5": {...polar(337.5),r:24},
};
const RING_ORDER=["C5","G4","Eb4","C4","D4","F4","Ab4","D5"];

// ── COLOURS ───────────────────────────────────────────────────────
const NOTE_COLOR={
  "C3":"#e8c97a","C4":"#e8c97a","D4":"#7ec8a0",
  "Eb4":"#88aaee","F4":"#e88888","G4":"#c0a0e0",
  "Ab4":"#f0b870","C5":"#e8d4a0","D5":"#8ecfa8",
};

// ═══════════════════════════════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════════
let _audioCtx = null;
function getCtx() {
  if (!_audioCtx||_audioCtx.state==="closed") _audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if (_audioCtx.state==="suspended") _audioCtx.resume();
  return _audioCtx;
}
function synthNote(freq,t,ctx,vol=0.42) {
  const out=ctx.createGain(); out.gain.setValueAtTime(vol,t); out.connect(ctx.destination);
  [[1,.70,5.2],[2,.52,4.8],[3,.14,2.8],[4,.06,2.0],[4.97,.04,1.4],[6.02,.02,.9]].forEach(([r,a,d])=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type="sine"; o.frequency.setValueAtTime(freq*r,t);
    if(r===2){const lfo=ctx.createOscillator(),lm=ctx.createGain();lfo.frequency.value=4.8;lm.gain.value=0.5;lfo.connect(lm);lm.connect(o.frequency);lfo.start(t);lfo.stop(t+d);}
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.006);
    g.gain.setValueAtTime(a,t+.014);g.gain.exponentialRampToValueAtTime(a*.55,t+.22);
    g.gain.exponentialRampToValueAtTime(a*.25,t+.65);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+d+.05);
  });
  [[freq*2.8,25,.055,.055],[freq*5.5,12,.03,.035]].forEach(([bf,Q,a,dur])=>{
    const sz=Math.floor(ctx.sampleRate*(dur+.02)),buf=ctx.createBuffer(1,sz,ctx.sampleRate);
    const d=buf.getChannelData(0);for(let i=0;i<sz;i++)d[i]=(Math.random()*2-1);
    const ns=ctx.createBufferSource();ns.buffer=buf;
    const bp=ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=bf;bp.Q.value=Q;
    const ng=ctx.createGain();ng.gain.setValueAtTime(a,t);ng.gain.exponentialRampToValueAtTime(.0001,t+dur);
    ns.connect(bp);bp.connect(ng);ng.connect(out);ns.start(t);ns.stop(t+dur+.01);
  });
}
function playNote(name){const f=HANDPAN.freq[name];if(!f)return;const ctx=getCtx();synthNote(f,ctx.currentTime,ctx,.44);}
function playChord(notes,stagger=.07){const ctx=getCtx(),now=ctx.currentTime;notes.forEach((n,i)=>{const f=HANDPAN.freq[n];if(f)synthNote(f,now+i*stagger,ctx,.36);});}

// ═══════════════════════════════════════════════════════════════════
// HANDPAN SVG DIAGRAM
// ═══════════════════════════════════════════════════════════════════
function HandpanDiagram({ activeNotes, onNoteToggle }) {
  return (
    <svg width="100%" viewBox="0 0 300 300" style={{display:"block",maxWidth:260,margin:"0 auto",touchAction:"none"}}>
      <defs>
        <radialGradient id="hpBody" cx="50%" cy="50%" r="55%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#5c4e28"/>
          <stop offset="28%"  stopColor="#3a3018"/>
          <stop offset="60%"  stopColor="#1e1a0c"/>
          <stop offset="100%" stopColor="#080705"/>
        </radialGradient>
        <radialGradient id="hpSheen" cx="38%" cy="32%" r="48%">
          <stop offset="0%"  stopColor="rgba(255,230,140,0.22)"/>
          <stop offset="60%" stopColor="rgba(255,210,100,0.06)"/>
          <stop offset="100%"stopColor="rgba(255,200,80,0.00)"/>
        </radialGradient>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Rim layers */}
      <circle cx={CX} cy={CY} r={146} fill="rgba(0,0,0,0.55)"/>
      <circle cx={CX} cy={CY} r={143} fill="none" stroke="rgba(160,120,40,0.30)" strokeWidth={1.5}/>
      <circle cx={CX} cy={CY} r={141} fill="url(#hpBody)" stroke="rgba(200,155,55,0.50)" strokeWidth={2}/>
      <circle cx={CX} cy={CY} r={138} fill="none" stroke="rgba(240,195,80,0.18)" strokeWidth={1}/>
      <circle cx={CX} cy={CY} r={141} fill="url(#hpSheen)"/>
      <circle cx={CX} cy={CY} r={115} fill="none" stroke="rgba(205,163,83,0.10)" strokeWidth={1} strokeDasharray="4 8"/>
      <circle cx={CX} cy={CY} r={50}  fill="none" stroke="rgba(205,163,83,0.08)" strokeWidth={1}/>

      {/* Spokes */}
      {RING_ORDER.map(n=>{
        const p=NOTE_POS[n],lit=activeNotes.includes(n);
        return <line key={n} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke={lit?NOTE_COLOR[n]+"66":"rgba(205,163,83,0.06)"}
          strokeWidth={lit?1.5:.8} style={{transition:"stroke .25s"}}/>;
      })}

      {/* Tone fields — ding last */}
      {[...RING_ORDER,"C3"].map(n=>{
        const {x,y,r,isDing}=NOTE_POS[n];
        const lit=activeNotes.includes(n),col=NOTE_COLOR[n];
        const lbl=n.replace("b","♭").replace(/\d/,"");
        const oct=n.match(/\d/)?.[0]||"";
        return (
          <g key={n} onClick={()=>onNoteToggle(n)} style={{cursor:"pointer"}}>
            {lit&&<circle cx={x} cy={y} r={r+13} fill={col+"18"} filter="url(#glow)"/>}
            <circle cx={x} cy={y} r={r+2} fill="none"
              stroke={lit?col+"55":"rgba(180,140,55,0.15)"}
              strokeWidth={lit?1.5:1} style={{transition:"stroke .2s"}}/>
            <circle cx={x} cy={y} r={r}
              fill={lit?col+"38":isDing?"rgba(205,163,83,0.12)":"rgba(20,17,8,0.88)"}
              stroke={lit?col:isDing?"rgba(205,163,83,0.60)":"rgba(140,110,45,0.25)"}
              strokeWidth={lit?2.5:1.5} style={{transition:"all .2s"}}/>
            <circle cx={x} cy={y} r={r-6} fill="none"
              stroke={lit?col+"44":"rgba(205,163,83,0.06)"}
              strokeWidth={.8} style={{transition:"stroke .2s"}}/>

            {/* Note name */}
            <text x={x} y={isDing?y-6:y+1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={isDing?14:11} fontFamily={FONT} fontWeight="600"
              fill={lit?col:isDing?"#d4a830":"#9a8a60"}
              style={{userSelect:"none",pointerEvents:"none",transition:"fill .2s"}}>{lbl}</text>

            {/* Octave / ding label — larger, always visible */}
            {isDing&&(
              <text x={x} y={y+9} textAnchor="middle"
                fontSize={9.5} fontFamily={FONT} fontWeight="500"
                fill={lit?col+"ee":"#8a7040"}
                style={{userSelect:"none",pointerEvents:"none"}}>ding</text>
            )}
            {!isDing&&oct&&(
              <text x={x} y={y+13} textAnchor="middle"
                fontSize={8.5} fontFamily={FONT} fontWeight="600"
                fill={lit?col+"cc":"#7a6840"}
                style={{userSelect:"none",pointerEvents:"none"}}>{oct}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FILTER MODAL
// ═══════════════════════════════════════════════════════════════════
const NOTE_LIST = HANDPAN.notes.map(n=>n.name);

function FilterModal({open,onClose,filters,onChange}) {
  const [visible,setVisible]=useState(false);
  const [animIn, setAnimIn] =useState(false);
  useEffect(()=>{
    if(open){setVisible(true);requestAnimationFrame(()=>requestAnimationFrame(()=>setAnimIn(true)));}
    else{setAnimIn(false);const t=setTimeout(()=>setVisible(false),320);return()=>clearTimeout(t);}
  },[open]);
  if(!visible) return null;

  const {noteCount,cat,note,chordName}=filters;
  const set=(k,v)=>onChange({...filters,[k]:v});

  const Chip=({active,color,onClick,children})=>(
    <button onClick={onClick} style={{
      background:active?(color?color+"28":"rgba(205,163,83,0.20)"):"rgba(255,255,255,0.04)",
      border:`1px solid ${active?(color||"rgba(205,163,83,0.60)"):"rgba(255,255,255,0.08)"}`,
      color:active?(color||"#e8d4a0"):"#6a5840",
      borderRadius:6,padding:"5px 11px",cursor:"pointer",
      fontSize:11,fontFamily:FONT,fontWeight:"400",
      transition:"all .13s",whiteSpace:"nowrap",
    }}>{children}</button>
  );
  const Label=({children})=>(
    <div style={{fontSize:9,letterSpacing:3,color:"#7a6030",textTransform:"uppercase",
      marginBottom:7,fontFamily:FONT,fontWeight:"600"}}>{children}</div>
  );

  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.55)",
        backdropFilter:"blur(3px)",opacity:animIn?1:0,transition:"opacity .3s ease",
      }}/>
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:201,
        background:"#181208",borderTop:"1px solid rgba(205,163,83,0.22)",
        borderRadius:"18px 18px 0 0",padding:"20px 18px 36px",
        maxHeight:"82vh",overflowY:"auto",fontFamily:FONT,
        transform:animIn?"translateY(0)":"translateY(100%)",
        transition:"transform .32s cubic-bezier(.32,.72,.00,1.00)",
        boxShadow:"0 -12px 48px rgba(0,0,0,0.6)",
      }}>
        <div style={{width:40,height:4,background:"rgba(205,163,83,0.20)",borderRadius:2,margin:"0 auto 18px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontSize:16,color:"#d4c090",letterSpacing:.5,fontFamily:FONT,fontWeight:"700"}}>Filters</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6a5830",fontSize:18,cursor:"pointer",lineHeight:1,padding:"4px 8px"}}>✕</button>
        </div>

        <Label>Note count</Label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
          {["all","2","3","4","5"].map(n=>(
            <Chip key={n} active={noteCount===n} onClick={()=>set("noteCount",n)}>
              {n==="all"?"All":`${n} notes`}
            </Chip>
          ))}
        </div>

        <Label>Category</Label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
          {["all",...CAT_ORDER].map(c=>(
            <Chip key={c} active={cat===c} color={c!=="all"?CAT_STYLE[c]?.accent:undefined} onClick={()=>set("cat",c)}>
              {c==="all"?"All":CAT_STYLE[c]?.label??c}
            </Chip>
          ))}
        </div>

        <Label>Chord type</Label>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:18}}>
          <Chip active={chordName==="all"} onClick={()=>set("chordName","all")}>All</Chip>
          {ALL_CHORD_NAMES.map(nm=>(
            <Chip key={nm} active={chordName===nm} onClick={()=>set("chordName",nm)}>{nm}</Chip>
          ))}
        </div>

        <Label>Contains note</Label>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:20}}>
          <Chip active={note==="all"} onClick={()=>set("note","all")}>All</Chip>
          {NOTE_LIST.map(n=>(
            <Chip key={n} active={note===n} color={NOTE_COLOR[n]} onClick={()=>set("note",n)}>
              {n.replace("b","♭")}
            </Chip>
          ))}
        </div>

        <button onClick={()=>onChange({noteCount:"all",cat:"all",note:"all",chordName:"all"})}
          style={{background:"rgba(150,50,50,0.15)",border:"1px solid rgba(150,50,50,0.30)",
            color:"#b06060",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:12,fontFamily:FONT,width:"100%"}}>
          Clear all filters
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CHORD CARD — merged voicings
// ═══════════════════════════════════════════════════════════════════
function ChordCard({chord, isSelected, isRelated, dimmed, onClick}) {
  const acc = CAT_STYLE[chord.cat]?.accent || "#c9a84c";
  const bg = isSelected
    ? "rgba(205,163,83,0.17)"
    : isRelated
      ? `${acc}18`
      : "rgba(255,255,255,0.03)";
  const border = isSelected ? "rgba(205,163,83,0.72)"
    : isRelated ? acc+"88"
    : "rgba(255,255,255,0.07)";

  return (
    <div onClick={onClick} style={{
      background:bg, border:`1px solid ${border}`,
      borderRadius:8, padding:"8px 11px", cursor:"pointer",
      transition:"all .15s",
      transform:isSelected?"scale(1.015)":"scale(1)",
      boxShadow:isSelected?"0 0 18px rgba(205,163,83,0.13)":isRelated?`0 0 8px ${acc}28`:"none",
      opacity:dimmed?0.35:1,
    }}>
      {/* Root + name */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
        <div style={{display:"flex",alignItems:"baseline",gap:5}}>
          <span style={{color:isSelected?"#ecd898":acc,fontSize:13,fontFamily:FONT,fontWeight:"700",letterSpacing:.3}}>
            {chord.root.replace("b","♭")}
          </span>
          <span style={{color:isSelected?"#b8a060":"#806850",fontSize:10,fontFamily:FONT,fontWeight:"500"}}>
            {chord.name}
          </span>
        </div>
        <span style={{fontSize:8,color:acc+(isSelected?"cc":"66"),border:`1px solid ${acc}25`,
          borderRadius:3,padding:"1px 4px",flexShrink:0,fontFamily:FONT,letterSpacing:.5,marginLeft:4}}>
          {chord.voicings.length>1?`${chord.voicings.length}×`:`${chord.noteCount}♩`}
        </span>
      </div>

      {/* Notes */}
      <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
        {chord.notes.map(n=>(
          <span key={n} style={{
            background:NOTE_COLOR[n]+"14",border:`1px solid ${NOTE_COLOR[n]}45`,
            color:NOTE_COLOR[n],borderRadius:3,padding:"0px 4px",
            fontSize:8.5,fontFamily:"monospace",lineHeight:"1.6",
          }}>{n.replace("b","♭")}</span>
        ))}
      </div>

      {/* Voicing count hint */}
      {chord.voicings.length>1&&(
        <div style={{fontSize:8,color:acc+"55",marginTop:4,fontFamily:FONT}}>
          {chord.voicings.length} voicings
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════
export default function HandpanAtlas() {
  const [activeNotes,  setActiveNotes]  = useState([]); // lit on handpan (display)
  const [panNotes,     setPanNotes]     = useState([]); // drives list filter when panFiltering=true
  const [panFiltering, setPanFiltering] = useState(false);
  const [selectedKey,  setSelectedKey]  = useState(null);

  const [filters,    setFilters]    = useState({noteCount:"all",cat:"all",note:"all",chordName:"all"});
  const [search,     setSearch]     = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const panMode = panFiltering && panNotes.length > 0;

  // Cards that contain ALL pan-lit notes (related highlight)
  const relatedKeys = useMemo(() => {
    if (activeNotes.length === 0) return new Set();
    return new Set(
      ALL_CHORDS.filter(c => activeNotes.every(n => c.notes.includes(n))).map(c => c.key)
    );
  }, [activeNotes]);

  // ── note toggle ───────────────────────────────────────────────
  const handleNoteToggle = useCallback((noteName) => {
    setPanFiltering(true);
    setSelectedKey(null);
    setActiveNotes(prev => {
      const was = prev.includes(noteName);
      if (!was) playNote(noteName);
      const next = was ? prev.filter(n=>n!==noteName) : [...prev, noteName];
      setPanNotes(next);
      if (next.length === 0) setPanFiltering(false);
      return next;
    });
  }, []);

  // ── chord card click: highlight + sound, never touch the list ──
  const handleChordClick = (chord) => {
    if (selectedKey === chord.key) {
      setSelectedKey(null);
      setActiveNotes(panMode ? panNotes : []);
      return;
    }
    setSelectedKey(chord.key);
    setActiveNotes(chord.notes); // light up handpan
    // panFiltering and panNotes untouched → list stays the same
    playChord(chord.notes);
  };

  const showAll  = () => { setPanFiltering(false); setPanNotes([]); setActiveNotes([]); setSelectedKey(null); };
  const clearAll = () => { setActiveNotes([]); setPanNotes([]); setPanFiltering(false); setSelectedKey(null); };
  const clearFilters = () => setFilters({noteCount:"all",cat:"all",note:"all",chordName:"all"});

  // ── filtered + grouped list ───────────────────────────────────
  const filtered = useMemo(() => {
    let list = ALL_CHORDS;
    if (panMode) {
      list = list.filter(c => panNotes.every(n => c.notes.includes(n)));
    } else {
      const {noteCount,cat,note,chordName} = filters;
      if (noteCount!=="all") list=list.filter(c=>c.noteCount===parseInt(noteCount));
      if (cat!=="all")       list=list.filter(c=>c.cat===cat);
      if (note!=="all")      list=list.filter(c=>c.notes.includes(note));
      if (chordName!=="all") list=list.filter(c=>c.name===chordName);
    }
    if (search.trim()) {
      const q=search.toLowerCase();
      list=list.filter(c=>c.name.toLowerCase().includes(q)||c.root.toLowerCase().includes(q));
    }
    return list;
  }, [panMode, panNotes, filters, search]);

  const grouped = useMemo(() => {
    const g={};
    CAT_ORDER.forEach(cat=>{g[cat]={};});
    filtered.forEach(c=>{
      if(!g[c.cat]) g[c.cat]={};
      if(!g[c.cat][c.name]) g[c.cat][c.name]=[];
      g[c.cat][c.name].push(c);
    });
    return g;
  }, [filtered]);

  const activeFilterCount = Object.values(filters).filter(v=>v!=="all").length;

  return (
    <div style={{minHeight:"100vh",background:"#0a0906",color:"#d4c8a8",fontFamily:FONT,WebkitTextSizeAdjust:"100%"}}>

      {/* ── HEADER ── */}
      <div style={{
        background:"linear-gradient(180deg,#1a1508 0%,#0e0c07 100%)",
        borderBottom:"1px solid rgba(205,163,83,0.13)",
        padding:"22px 16px 16px",textAlign:"center",
      }}>
        <div style={{fontSize:9,letterSpacing:5,color:"#7a6a3a",textTransform:"uppercase",marginBottom:8,fontFamily:FONT}}>
          Handpan · C Minor · 9 Tones
        </div>
        <h1 style={{
          fontSize:"clamp(28px,6vw,42px)",fontWeight:700,
          color:"#e8d4a0",margin:"0 0 6px",letterSpacing:-1,
          fontFamily:FONT,lineHeight:1.0,
          textShadow:"0 0 30px rgba(205,163,83,0.25)",
        }}>
          Chord Atlas
        </h1>
        <div style={{fontSize:11,color:"#5a5030",letterSpacing:1,fontFamily:FONT}}>
          C3 · C4 · D4 · E♭4 · F4 · G4 · A♭4 · C5 · D5
        </div>
      </div>

      {/* ── STICKY HANDPAN ── */}
      <div style={{
        position:"sticky",top:0,zIndex:100,
        background:"rgba(8,7,4,0.97)",
        borderBottom:"1px solid rgba(205,163,83,0.15)",
        backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",
        padding:"8px 12px 6px",
      }}>
        <div style={{maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
          <div style={{width:"100%",maxWidth:255}}>
            <HandpanDiagram activeNotes={activeNotes} onNoteToggle={handleNoteToggle}/>
          </div>
          {activeNotes.length>0?(
            <div style={{width:"100%",maxWidth:440,textAlign:"center"}}>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:8,color:"#5a4a28",letterSpacing:3,textTransform:"uppercase",fontFamily:FONT}}>
                  {panMode?"Playing":"Chord"}
                </span>
                {activeNotes.map(n=>(
                  <span key={n} onClick={()=>{ if(panMode) handleNoteToggle(n); else { setActiveNotes(prev=>prev.filter(x=>x!==n)); } }} style={{
                    background:NOTE_COLOR[n]+"20",border:`1px solid ${NOTE_COLOR[n]}66`,
                    color:NOTE_COLOR[n],borderRadius:4,padding:"1px 7px",
                    fontSize:10,fontFamily:"monospace",cursor:"pointer",
                  }}>{n.replace("b","♭")}{panMode?" ✕":""}</span>
                ))}
                <button onClick={clearAll} style={{
                  background:"rgba(140,45,45,0.15)",border:"1px solid rgba(140,45,45,0.30)",
                  color:"#a85858",borderRadius:5,padding:"2px 8px",cursor:"pointer",
                  fontSize:9,fontFamily:FONT,
                }}>Clear</button>
              </div>
              <div style={{fontSize:9.5,color:"#5a4a28",fontStyle:"italic",fontFamily:FONT}}>
                  {panMode
                  ?(filtered.length>0?`${filtered.length} chord${filtered.length!==1?"s":""} found`:"No matching chords")
                  :`${relatedKeys.size} chord${relatedKeys.size!==1?"s":""} contain these notes`}
              </div>
            </div>
          ):(
            <div style={{fontSize:9.5,color:"#2e2610",letterSpacing:.5,textAlign:"center",fontFamily:FONT}}>
              Tap notes to build a chord · or browse below
            </div>
          )}
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div style={{padding:"10px 14px 0",maxWidth:880,margin:"0 auto",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={()=>setFilterOpen(true)} style={{
          display:"flex",alignItems:"center",gap:6,
          background:activeFilterCount>0?"rgba(205,163,83,0.16)":"rgba(255,255,255,0.05)",
          border:`1px solid ${activeFilterCount>0?"rgba(205,163,83,0.50)":"rgba(255,255,255,0.09)"}`,
          color:activeFilterCount>0?"#ddc870":"#7a6a50",
          borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:FONT,transition:"all .15s",
        }}>
          <span>⚙ Filters</span>
          {activeFilterCount>0&&(
            <span style={{background:"rgba(205,163,83,0.32)",borderRadius:10,padding:"0 6px",fontSize:10,color:"#ddc870"}}>
              {activeFilterCount}
            </span>
          )}
        </button>

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chords…" style={{
          flex:1,minWidth:110,maxWidth:210,
          background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",
          borderRadius:8,padding:"7px 12px",color:"#d4c8a8",fontSize:12,fontFamily:FONT,outline:"none",
        }}/>

        {panMode&&(
          <button onClick={showAll} style={{
            background:"rgba(205,163,83,0.12)",border:"1px solid rgba(205,163,83,0.35)",
            color:"#c9a84c",borderRadius:8,padding:"7px 13px",cursor:"pointer",fontSize:11,fontFamily:FONT,
          }}>Show all</button>
        )}
        {(activeFilterCount>0||search)&&!panMode&&(
          <button onClick={()=>{clearFilters();setSearch("");}} style={{
            background:"rgba(140,45,45,0.14)",border:"1px solid rgba(140,45,45,0.28)",
            color:"#a85858",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontFamily:FONT,
          }}>✕ Clear</button>
        )}
        <span style={{fontSize:10,color:"#352c10",letterSpacing:.5,marginLeft:"auto",fontFamily:FONT}}>
          {filtered.length} chord{filtered.length!==1?"s":""}
        </span>
      </div>

      {/* ── GROUPED CHORD LIST ── */}
      <div style={{padding:"10px 12px 72px",maxWidth:880,margin:"0 auto"}}>
        {CAT_ORDER.map(cat=>{
          const nameMap=grouped[cat];
          if(!nameMap||Object.keys(nameMap).length===0) return null;
          const s=CAT_STYLE[cat];
          const sortedNames=Object.keys(nameMap).sort();
          return (
            <div key={cat} style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,
                paddingBottom:7,borderBottom:`1px solid ${s.accent}22`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:s.accent,flexShrink:0}}/>
                <span style={{fontSize:11,color:s.accent,letterSpacing:3,textTransform:"uppercase",fontFamily:FONT,fontWeight:"600"}}>
                  {s.label}
                </span>
                <span style={{fontSize:10,color:s.accent+"55",fontFamily:FONT}}>
                  ({filtered.filter(c=>c.cat===cat).length})
                </span>
              </div>

              {sortedNames.map(chordName=>{
                const cards=nameMap[chordName];
                return (
                  <div key={chordName} style={{marginBottom:12}}>
                    <div style={{fontSize:9.5,color:s.accent+"88",letterSpacing:2,textTransform:"uppercase",
                      fontFamily:FONT,fontWeight:"600",marginBottom:5,paddingLeft:2}}>{chordName}</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(175px,100%),1fr))",gap:5}}>
                      {cards.map(chord=>{
                        const isSel=selectedKey===chord.key;
                        const isRel=!isSel&&relatedKeys.has(chord.key)&&activeNotes.length>0;
                        const isDimmed=activeNotes.length>0&&!panMode&&!isSel&&!isRel;
                        return (
                          <ChordCard key={chord.key} chord={chord}
                            isSelected={isSel} isRelated={isRel} dimmed={isDimmed}
                            onClick={()=>handleChordClick(chord)}/>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px",color:"#3a2c0e",fontSize:13,fontStyle:"italic",fontFamily:FONT}}>
            {panMode
              ?<><span>No chord found for this combination.</span><br/><span style={{fontSize:11}}>Try removing a note.</span></>
              :"No chords match these filters."}
          </div>
        )}
      </div>

      <FilterModal open={filterOpen} onClose={()=>setFilterOpen(false)} filters={filters} onChange={setFilters}/>
    </div>
  );
}