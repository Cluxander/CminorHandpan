// ── Chord templates — complete music theory reference ──────────────
// intervals = semitones from root, mod 12, sorted ascending
export const CHORD_TEMPLATES = [
  // ── INTERVALS (dyads) ────────────────────────────────────────
  { name:"Minor 2nd",         cat:"Intervals",        intervals:[1]              },
  { name:"Major 2nd",         cat:"Intervals",        intervals:[2]              },
  { name:"Minor 3rd",         cat:"Intervals",        intervals:[3]              },
  { name:"Major 3rd",         cat:"Intervals",        intervals:[4]              },
  { name:"Perfect 4th",       cat:"Intervals",        intervals:[5]              },
  { name:"Tritone",           cat:"Intervals",        intervals:[6]              },
  { name:"Perfect 5th",       cat:"Intervals",        intervals:[7]              },
  { name:"Minor 6th",         cat:"Intervals",        intervals:[8]              },
  { name:"Major 6th",         cat:"Intervals",        intervals:[9]              },
  { name:"Minor 7th",         cat:"Intervals",        intervals:[10]             },
  { name:"Major 7th",         cat:"Intervals",        intervals:[11]             },
  { name:"Octave",            cat:"Intervals",        intervals:[0], octave:true },

  // ── MAJOR family ─────────────────────────────────────────────
  { name:"Major",             cat:"Major",            intervals:[4,7]            },
  { name:"Major Add9",        cat:"Major",            intervals:[2,4,7]          },
  { name:"Major Add4",        cat:"Major",            intervals:[4,5,7]          },
  { name:"Major 6th",         cat:"Major",            intervals:[4,7,9]          },
  { name:"Major 7th",         cat:"Major",            intervals:[4,7,11]         },
  { name:"Dominant 7th",      cat:"Major",            intervals:[4,7,10]         },
  { name:"Major 9th",         cat:"Major",            intervals:[2,4,7,11]       },
  { name:"Dominant 9th",      cat:"Major",            intervals:[2,4,7,10]       },
  { name:"Major 6/9",         cat:"Major",            intervals:[2,4,7,9]        },
  { name:"Dominant 11th",     cat:"Major",            intervals:[2,4,5,7,10]     },
  { name:"Major 13th",        cat:"Major",            intervals:[2,4,7,9,11]     },
  { name:"Dominant 13th",     cat:"Major",            intervals:[2,4,7,9,10]     },
  { name:"Augmented",         cat:"Major",            intervals:[4,8]            },
  { name:"Aug Maj 7th",       cat:"Major",            intervals:[4,8,11]         },
  { name:"Aug 7th",           cat:"Major",            intervals:[4,8,10]         },
  { name:"Italian 6th",       cat:"Major",            intervals:[4,10]           },
  { name:"French 6th",        cat:"Major",            intervals:[2,4,10]         },

  // ── MINOR family ─────────────────────────────────────────────
  { name:"Minor",             cat:"Minor",            intervals:[3,7]            },
  { name:"Minor Add9",        cat:"Minor",            intervals:[2,3,7]          },
  { name:"Minor Add4",        cat:"Minor",            intervals:[3,5,7]          },
  { name:"Minor b6",          cat:"Minor",            intervals:[3,7,8]          },
  { name:"Minor 6th",         cat:"Minor",            intervals:[3,7,9]          },
  { name:"Minor 7th",         cat:"Minor",            intervals:[3,7,10]         },
  { name:"Min/Maj 7th",       cat:"Minor",            intervals:[3,7,11]         },
  { name:"Minor 9th",         cat:"Minor",            intervals:[2,3,7,10]       },
  { name:"Minor Add9 b6",     cat:"Minor",            intervals:[2,3,7,8]        },
  { name:"Minor 6/9",         cat:"Minor",            intervals:[2,3,7,9]        },
  { name:"Minor 11th",        cat:"Minor",            intervals:[2,3,5,7,10]     },
  { name:"Minor 13th",        cat:"Minor",            intervals:[2,3,7,9,10]     },
  { name:"Min/Maj 9th",       cat:"Minor",            intervals:[2,3,7,11]       },
  { name:"Minor 7th b6",      cat:"Minor",            intervals:[3,7,8,10]       },
  { name:"Minor 7th Add11",   cat:"Minor",            intervals:[3,5,7,10]       },
  { name:"Minor Maj 9th b6",  cat:"Minor",            intervals:[2,3,7,8,11]     },

  // ── DIMINISHED family ────────────────────────────────────────
  { name:"Diminished",        cat:"Diminished",       intervals:[3,6]            },
  { name:"Half-Dim 7th",      cat:"Diminished",       intervals:[3,6,10]         },
  { name:"Dim 7th",           cat:"Diminished",       intervals:[3,6,9]          },
  { name:"Dim Add9",          cat:"Diminished",       intervals:[2,3,6]          },
  { name:"Dim Maj 7th",       cat:"Diminished",       intervals:[3,6,11]         },
  { name:"Half-Dim 9th",      cat:"Diminished",       intervals:[2,3,6,10]       },
  { name:"Dim 9th",           cat:"Diminished",       intervals:[2,3,6,9]        },

  // ── SUSPENDED / MODAL ────────────────────────────────────────
  { name:"Sus2",              cat:"Suspended",        intervals:[2,7]            },
  { name:"Sus4",              cat:"Suspended",        intervals:[5,7]            },
  { name:"Sus4 Add9",         cat:"Suspended",        intervals:[2,5,7]          },
  { name:"Sus2 Add7",         cat:"Suspended",        intervals:[2,7,10]         },
  { name:"Sus4 Add7",         cat:"Suspended",        intervals:[5,7,10]         },
  { name:"Dom 7th Sus4",      cat:"Suspended",        intervals:[5,7,10]         },
  { name:"Sus2 Maj7",         cat:"Suspended",        intervals:[2,7,11]         },
  { name:"Sus4 Maj7",         cat:"Suspended",        intervals:[5,7,11]         },
  { name:"Sus2 Add6",         cat:"Suspended",        intervals:[2,7,9]          },
  { name:"Sus4 Add6",         cat:"Suspended",        intervals:[5,7,9]          },
  { name:"Phrygian",          cat:"Suspended",        intervals:[1,5,7]          },
  { name:"Lydian",            cat:"Suspended",        intervals:[4,6,7]          },
  { name:"Mixolydian",        cat:"Suspended",        intervals:[2,4,7,10]       },
  { name:"Dorian",            cat:"Suspended",        intervals:[2,3,7,9]        },
  { name:"Aeolian",           cat:"Suspended",        intervals:[2,3,7,8,10]     },

  // ── QUARTAL / QUINTAL / CLUSTERS ─────────────────────────────
  { name:"Quartal",           cat:"Quartal/Quintal",  intervals:[5,10]           },
  { name:"Quintal",           cat:"Quartal/Quintal",  intervals:[7,2]            },
  { name:"Quartal 4-voice",   cat:"Quartal/Quintal",  intervals:[3,5,10]         },
  { name:"Quartal 5-voice",   cat:"Quartal/Quintal",  intervals:[3,5,8,10]       },
  { name:"Quintal 4-voice",   cat:"Quartal/Quintal",  intervals:[2,7,9]          },
  { name:"Quintal 5-voice",   cat:"Quartal/Quintal",  intervals:[2,5,7,9]        },
  { name:"Tone Cluster",      cat:"Quartal/Quintal",  intervals:[1,2]            },
  { name:"Pentatonic",        cat:"Quartal/Quintal",  intervals:[2,5,7,10]       },
  { name:"Major Pentatonic",  cat:"Quartal/Quintal",  intervals:[2,4,7,9]        },

  // ── POWER / OPEN ─────────────────────────────────────────────
  { name:"Power Chord",       cat:"Suspended",        intervals:[7]              },
  { name:"Open 5th Add2",     cat:"Suspended",        intervals:[2,7]            },
  { name:"Power Add b7",      cat:"Suspended",        intervals:[7,10]           },

  // ── JAZZ / EXTENDED HARMONY ──────────────────────────────────
  { name:"Maj 7th b5",        cat:"Major",            intervals:[4,6,11]         },
  { name:"Dom 7th b5",        cat:"Major",            intervals:[4,6,10]         },
  { name:"Dom 7th #5",        cat:"Major",            intervals:[4,8,10]         },
  { name:"Dom 7th b9",        cat:"Major",            intervals:[1,4,7,10]       },
  { name:"Dom 7th #9",        cat:"Major",            intervals:[3,4,7,10]       },
  { name:"Dom 7th #11",       cat:"Major",            intervals:[4,6,7,10]       },
  { name:"Dominant 11th",     cat:"Major",            intervals:[4,5,7,10]       },
  { name:"Minor b5",          cat:"Minor",            intervals:[3,6]            },
  { name:"Minor 7th b5",      cat:"Diminished",       intervals:[3,6,10]         },
  { name:"Add9",              cat:"Major",            intervals:[2,7]            },
  { name:"Add11",             cat:"Major",            intervals:[5,7]            },
  { name:"Maj 9th no 5th",    cat:"Major",            intervals:[2,4,11]         },
  { name:"Dominant 9th no 5th",cat:"Major",           intervals:[2,4,10]         },
];

// Deduplicate templates that share identical interval sets (keep first occurrence)
const _seenIntervalSigs = new Set();
export const TEMPLATES_FINAL = CHORD_TEMPLATES.filter(t => {
  if (t.octave) return true;
  const sig = t.intervals.slice().sort((a,b)=>a-b).join(",");
  if (_seenIntervalSigs.has(sig)) return false;
  _seenIntervalSigs.add(sig);
  return true;
});

export const CAT_ORDER = ["Intervals","Major","Minor","Diminished","Suspended","Quartal/Quintal"];

export const CAT_STYLE = {
  "Intervals":      { accent:"#c9a84c", label:"Intervals"        },
  "Major":          { accent:"#6ec87a", label:"Major"            },
  "Minor":          { accent:"#7aace8", label:"Minor"            },
  "Diminished":     { accent:"#d47070", label:"Diminished"       },
  "Suspended":      { accent:"#c0a0e0", label:"Suspended"        },
  "Quartal/Quintal":{ accent:"#f0b870", label:"Quartal / Quintal"},
};
