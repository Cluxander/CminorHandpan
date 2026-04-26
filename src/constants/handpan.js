// ── Default C Minor handpan definition ───────────────────────────
export const HANDPAN = {
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

// ── Standard preset handpans ──────────────────────────────────────
// Each pan: id, name, a4, notes, positions, rings, sided
export const STANDARD_PANS = [
  {
    "notes":[
      {"name":"C3","midi":48,"size":"big-ding","pos":"ding","angle":null,"ringIdx":null,"side":"upper"},
      {"name":"C4","midi":60,"size":"big","pos":"ring","angle":157,"ringIdx":0,"side":"upper"},
      {"name":"D4","midi":62,"size":"big","pos":"ring","angle":202,"ringIdx":0,"side":"upper"},
      {"name":"Eb4","midi":63,"size":"medium","pos":"ring","angle":112,"ringIdx":0,"side":"upper"},
      {"name":"F4","midi":65,"size":"medium","pos":"ring","angle":247,"ringIdx":0,"side":"upper"},
      {"name":"G4","midi":67,"size":"medium","pos":"ring","angle":67,"ringIdx":0,"side":"upper"},
      {"name":"Ab4","midi":68,"size":"medium","pos":"ring","angle":292,"ringIdx":0,"side":"upper"},
      {"name":"C5","midi":72,"pos":"ring","angle":22,"ringIdx":0,"size":"small","side":"upper"},
      {"name":"D5","midi":74,"size":"small","pos":"ring","angle":337,"ringIdx":0,"side":"upper"}],
    "freq":{"C3":130.8127826502993,"C4":261.6255653005986,"D4":293.6647679174076,"Eb4":311.12698372208087,"F4":349.2282314330039,"G4":391.99543598174927,"Ab4":415.3046975799451,"C5":523.2511306011972,"D5":587.3295358348151},
    "positions":{
      "C3":"ding:0:upper","C4":"157:0:upper","D4":"202:0:upper","Eb4":"112:0:upper",
      "F4":"247:0:upper","G4":"67:0:upper","Ab4":"292:0:upper","D5":"337:0:upper",
      "C5":"22:0:upper"},
    "rings":{"upper":[{"count":8,"rotation":-23}],"bottom":[{"count":6,"rotation":0}]},
    "sided":"single",
    "name":"C Minor · 440Hz",
    "a4":440,
    "id":"c_minor"},
  {
    "id":"d_kurd","name":"D kurd · 440Hz",
    "notes":[
      {"name":"D3","midi":50,"pos":"ding","angle":null,"ringIdx":null,"size":"big-ding","side":"upper"},
      {"name":"A3","midi":57,"pos":"ring","angle":158,"ringIdx":0,"size":"big","side":"upper"},
      {"name":"Bb3","midi":58,"pos":"ring","angle":203,"ringIdx":0,"size":"big","side":"upper"},
      {"name":"C4","midi":60,"pos":"ring","angle":113,"ringIdx":0,"size":"medium","side":"upper"},
      {"name":"D4","midi":62,"pos":"ring","angle":248,"ringIdx":0,"size":"medium","side":"upper"},
      {"name":"E4","midi":64,"pos":"ring","angle":68,"ringIdx":0,"size":"medium","side":"upper"},
      {"name":"F4","midi":65,"pos":"ring","angle":293,"ringIdx":0,"size":"medium","side":"upper"},
      {"name":"G4","midi":67,"pos":"ring","angle":23,"ringIdx":0,"size":"small","side":"upper"},
      {"name":"A4","midi":69,"pos":"ring","angle":338,"ringIdx":0,"size":"small","side":"upper"}],
    "freq":{"D3":146.8323839587038,"A3":220,"Bb3":233.08188075904496,"C4":261.6255653005986,"D4":293.6647679174076,
      "E4":329.6275569128699,"F4":349.2282314330039,"G4":391.99543598174927,"A4":440},
    "positions":{
      "D3":"ding:0:upper","A3":"158:0:upper","Bb3":"203:0:upper","C4":"113:0:upper","D4":"248:0:upper",
      "E4":"68:0:upper","F4":"293:0:upper","G4":"23:0:upper","A4":"338:0:upper"},
    "rings":{
      "upper":[{"count":8,"rotation":23}],
      "bottom":[{"count":6,"rotation":0}]},
      "sided":"single","a4":440
    }

  // Add more standard pans here:
  // { id:"d_minor", name:"D Minor · 440Hz", a4:440, notes:[...], positions:{...}, rings:{...}, sided:"single" },
];

// ── All 12 chromatic note names ───────────────────────────────────
export const CHROMATIC = ["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B"];

// Canonical per semitone (0–11): sharps for naturals, flats for black keys
export const SEMITONE_NAMES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

export const MIDI_TO_NAME = {};
export const ALL_NOTE_NAMES = []; // { name, midi, letter, octave, display }
for (let oct = 1; oct <= 7; oct++) {
  for (let semi = 0; semi < 12; semi++) {
    const midi = 12 + oct * 12 + semi;
    const letter = SEMITONE_NAMES[semi];
    const name = letter + oct;
    MIDI_TO_NAME[midi] = name;
    ALL_NOTE_NAMES.push({ name, midi, letter, octave: oct,
      display: name.replace("b","♭").replace("#","♯") });
  }
}

export const UNIQUE_LETTERS = SEMITONE_NAMES;

// ── Note size definitions ─────────────────────────────────────────
export const NOTE_SIZES = {
  "big-ding":   { label:"Big Ding",    r:38, isDing:true,  fontSize:14, subFontSize:9.5 },
  "small-ding": { label:"Small Ding",  r:28, isDing:true,  fontSize:11, subFontSize:8   },
  "big":        { label:"Big",         r:26, isDing:false, fontSize:11, subFontSize:7.5 },
  "medium":     { label:"Medium",      r:22, isDing:false, fontSize:10, subFontSize:7   },
  "small":      { label:"Small",       r:16, isDing:false, fontSize:8,  subFontSize:6   },
};

// ── Ring radii (outer → inner) ────────────────────────────────────
export const RING_RADII = [90, 62, 40];

// ── localStorage key for custom pans ─────────────────────────────
export const STORAGE_KEY = "hp_custom_pans_v2";
