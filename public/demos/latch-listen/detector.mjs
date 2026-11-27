import {forward, NFFT} from './fft256.mjs';
// Shared by the browser, command-line benchmark and feature extractor.
export const RATE = 16000;
export const HOP = 80;                 // 5 ms
const LOOKAHEAD_HOPS = 8;
const WARMUP_HOPS = 30;
export const WARMUP_SECONDS = WARMUP_HOPS * HOP / RATE;
export const MAX_DECISION_SECONDS = (LOOKAHEAD_HOPS + 1) * HOP / RATE;
export const CLIP_LENGTH = HOP * (2 + LOOKAHEAD_HOPS);
const REFRACTORY_HOPS = 16;
const EPS = 1e-12;
const BANDS = [0, 500, 1000, 2000, 3500, 5500, 8001];
function bandEnergy(x, offset, re, im) {
  forward(x, offset, re, im);
  const sums = Array(BANDS.length - 1).fill(0);
  let band = 0;
  for (let i = 1; i <= NFFT / 2; i++) {
    if (i * RATE / NFFT >= BANDS[band + 1]) band++;
    sums[band] += re[i] ** 2 + im[i] ** 2;
  }
  return sums;
}

function relativeLog(energy, total) {
  return Math.log(Math.max(1e-6, energy / Math.max(EPS, total)));
}

export function features(x) {
  const envelope = Array(10).fill(0);
  let peak = 0, total = 0;
  for (let i = 0; i < x.length; i++) {
    const power = x[i] * x[i];
    peak = Math.max(peak, power);
    envelope[Math.floor(i / HOP)] += power;
    total += power;
  }
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  const early = bandEnergy(x, 0, re, im);
  const middle = bandEnergy(x, HOP, re, im);
  const late = bandEnergy(x, 3 * HOP, re, im);
  const merged = early.map((b, i) => b + middle[i] + late[i]);
  const sum = merged.reduce((a, b) => a + b, 0);
  const lateSum = late.reduce((a, b) => a + b, 0);
  return [
    ...merged.map(e => relativeLog(e, sum)),
    ...late.map(e => relativeLog(e, lateSum)),
    ...envelope.map(e => relativeLog(e, total)),
    Math.log(Math.max(1, x.length * peak / Math.max(EPS, total)))
  ];
}

export function verify(f, model) {
  if (model.hiddenWeights) {
    let z = model.bias;
    for (let j = 0; j < model.hiddenWeights.length; j++) {
      const w = model.hiddenWeights[j];
      let h = model.hiddenBias[j];
      for (let k = 0; k < f.length; k++) h += w[k] * f[k];
      z += Math.max(0, h) * model.weights[j];
    }
    return 1 / (1 + Math.exp(-z));
  }
  if (f.length !== model.weights.length) throw new Error('Incompatible acoustic model');
  let z = model.bias;
  for (let i = 0; i < f.length; i++) z += f[i] * model.weights[i];
  return 1 / (1 + Math.exp(-z));
}

export class Detector {
  // An incomplete final decision window is discarded when the stream ends.
  constructor(model = null, keepFeatures = false) {
    this.model = model;
    this.keepFeatures = keepFeatures;
    this.hop = new Float32Array(HOP);
    this.previous = new Float32Array(HOP);
    this.clip = new Float32Array(CLIP_LENGTH);
    this.fill = 0; this.blocks = 0; this.lastX = 0; this.floor = 0;
    this.nextAllowed = 0; this.pending = null; this.candidates = 0;
  }
  push(samples, onCandidate) {
    for (let i = 0; i < samples.length;) {
      const n = Math.min(HOP - this.fill, samples.length - i);
      this.hop.set(samples.subarray(i, i + n), this.fill);
      i += n; this.fill += n;
      if (this.fill === HOP) {
        this.finishHop(onCandidate);
        this.fill = 0;
      }
    }
  }
  finishHop(onCandidate) {
    let p = 0, peak = 0, at = 0;
    for (let i = 0; i < HOP; i++) {
      const sample = this.hop[i];
      const d = sample - this.lastX;
      this.lastX = sample;
      const e = d * d;
      p += e;
      if (e > peak) { peak = e; at = i; }
    }
    p /= HOP;
    const b = this.blocks++;
    const ratio = p / Math.max(1e-9, this.floor);
    if (this.pending) {
      const item = this.pending;
      this.clip.set(this.hop, (b - item.block + 1) * HOP);
      if (b <= item.block + 2) item.gateDb = Math.max(item.gateDb, 10 * Math.log10(Math.max(ratio, EPS)));
      if (b === item.block + LOOKAHEAD_HOPS) {
        const f = features(this.clip);
        const result = {time: item.time, decision: this.blocks * HOP / RATE, gateDb: item.gateDb};
        if (this.model) result.score = verify(f, this.model);
        if (this.keepFeatures) result.features = f;
        this.pending = null;
        this.candidates++;
        onCandidate(result);
      }
    } else if (b >= WARMUP_HOPS && b >= this.nextAllowed && ratio >= 3.2 && p > 2e-8) {
      this.clip.set(this.previous); this.clip.set(this.hop, HOP);
      this.pending = {block: b, time: (b * HOP + at) / RATE, gateDb: 10 * Math.log10(ratio)};
      this.nextAllowed = b + REFRACTORY_HOPS;
    }
    if (b < WARMUP_HOPS) this.floor += (p - this.floor) / (b + 1);
    else {
      const reference = Math.max(this.floor, 1e-9);
      this.floor += 0.035 * (Math.min(p, 3 * reference) - this.floor);
    }
    this.previous.set(this.hop);
  }
}

export function detect(samples, model, keepFeatures = false) {
  const out = [], stream = new Detector(model, keepFeatures);
  for (let i = 0; i < samples.length; i += 256)
    stream.push(samples.subarray(i, i + 256), e => out.push(e));
  return out;
}
