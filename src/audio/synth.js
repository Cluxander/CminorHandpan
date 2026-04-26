import { SAMPLE_DEFS, HP_SLAP } from "./samples.js";
import { HANDPAN } from "../constants/handpan.js";

export const BPM      = 80;
export const BEAT_SEC = 0.5; // half a second per beat

let _audioCtx = null;
let _limiter  = null;
let _outGain  = null;
let _buffers  = {};
let _loadingPromises = {};

export function getCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _limiter = _audioCtx.createDynamicsCompressor();
    _limiter.threshold.value = -8;
    _limiter.knee.value      = 3;
    _limiter.ratio.value     = 14;
    _limiter.attack.value    = 0.001;
    _limiter.release.value   = 0.12;
    _outGain = _audioCtx.createGain();
    _outGain.gain.value = 0.78;
    _outGain.connect(_limiter);
    _limiter.connect(_audioCtx.destination);
    Object.keys(SAMPLE_DEFS).forEach(loadBuffer);
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

function b64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

export function loadBuffer(key) {
  if (_buffers[key]) return Promise.resolve(_buffers[key]);
  if (_loadingPromises[key]) return _loadingPromises[key];
  const ctx = _audioCtx;
  _loadingPromises[key] = ctx.decodeAudioData(b64ToArrayBuffer(SAMPLE_DEFS[key].b64))
    .then(buf => { _buffers[key] = buf; return buf; })
    .catch(err => { console.warn("Sample load failed:", key, err); return null; });
  return _loadingPromises[key];
}

export function closestSample(freq) {
  const keys = Object.keys(SAMPLE_DEFS);
  let best = keys[0], bestDist = Infinity;
  for (const k of keys) {
    const d = Math.abs(Math.log2(freq / SAMPLE_DEFS[k].freq));
    if (d < bestDist) { bestDist = d; best = k; }
  }
  return best;
}

// Play one note using the real sample + AM tremolo layer
export async function playNoteAsync(freq, t, ctx, vol) {
  const sampleKey = closestSample(freq);
  const buf = _buffers[sampleKey] || await loadBuffer(sampleKey);
  if (!buf) return;

  const freqNorm = Math.log2(freq / 130); // 0 at C3 → ~2.17 at D5

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = freq / SAMPLE_DEFS[sampleKey].freq;

  const sampGain = ctx.createGain();
  sampGain.gain.setValueAtTime(vol * 0.92, t);

  src.connect(sampGain);
  sampGain.connect(_outGain);
  src.start(t);
  src.stop(t + 6);

  // Beat/wave tremolo — recreates the natural octave-partial beating
  // Beat rate: ~0.4 Hz at G3 rising to ~8 Hz at C5
  const beatHz  = Math.min(0.5 + freqNorm * 3.0, 7.5);
  const depth   = Math.max(0.25, 0.82 - freqNorm * 0.25);
  const minLevel = 1 - depth;

  const amLFO = ctx.createOscillator();
  const amMix = ctx.createGain();
  const amDC  = ctx.createConstantSource();
  const amOut = ctx.createGain();

  amLFO.type = "sine";
  amLFO.frequency.value = beatHz;
  amMix.gain.value  = (1 - minLevel) / 2;
  amDC.offset.value = (1 + minLevel) / 2;
  amOut.gain.value  = 1;

  amLFO.connect(amMix); amMix.connect(amOut);
  amDC.connect(amOut);

  const tremoloGain = ctx.createGain();
  tremoloGain.gain.setValueAtTime(0, t);
  sampGain.disconnect(_outGain);
  sampGain.connect(tremoloGain);
  amOut.connect(tremoloGain.gain);
  tremoloGain.connect(_outGain);

  const dur = 5.5;
  amLFO.start(t); amLFO.stop(t + dur);
  amDC.start(t);  amDC.stop(t + dur);
}

export function synthNote(freq, t, ctx, vol) {
  const sampleKey = closestSample(freq);
  if (_buffers[sampleKey]) {
    playNoteAsync(freq, t, ctx, vol);
  } else {
    loadBuffer(sampleKey).then(() => {
      if (ctx.state !== "closed") playNoteAsync(freq, ctx.currentTime + 0.01, ctx, vol);
    });
  }
}

export function playNote(name) {
  const f = HANDPAN.freq[name]; if (!f) return;
  const ctx = getCtx(); synthNote(f, ctx.currentTime, ctx, 0.80);
}

export function playChord(notes, strum = true, freqMap) {
  const stagger = strum ? 0.26 : 0;
  const ctx = getCtx(), now = ctx.currentTime;
  const noteVol = Math.max(0.45, 0.80 - notes.length * 0.06);
  notes.forEach((n, i) => {
    const f = (freqMap || HANDPAN.freq)[n];
    if (f) synthNote(f, now + i * stagger, ctx, noteVol);
  });
}

// Helper to ensure the slap is loaded into the _buffers cache
export async function loadSlapBuffer() {
  const key = "SLAP_CUSTOM";
  if (_buffers[key]) return _buffers[key];

  const ctx = getCtx();
  try {
    // We reuse your existing b64ToArrayBuffer helper
    const arrayBuf = b64ToArrayBuffer(HP_SLAP);
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    _buffers[key] = audioBuf;
    return audioBuf;
  } catch (err) {
    console.warn("Failed to load HP_SLAP:", err);
    return null;
  }
}

export async function playSlap(t, ctx, vol = 0.6) {
  const key = "SLAP_CUSTOM";
  
  // Ensure the buffer exists using our new loader
  const buf = _buffers[key] || await loadSlapBuffer();
  if (!buf) return;

  const src = ctx.createBufferSource();
  const env = ctx.createGain();

  src.buffer = buf;

  // The Signal Chain: Source -> Gain (Volume) -> Destination
  src.connect(env);
  env.connect(_outGain);

  // Apply Volume
  env.gain.cancelScheduledValues(t);
  env.gain.setValueAtTime(vol, t);
  
  // Quick fade to prevent clipping/pops
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.4); 

  src.start(t);
  src.stop(t + 0.5);
}