// Two continuously scanned, causal template detectors. Training imports only enrolled takes.
import {RATE, HOP, WARMUP_SECONDS} from './detector.mjs';
import {forward, correlation, NFFT, WINDOW} from './fft256.mjs';

const BINS = NFFT/2+1;
const BANDS = 16;                       // 500 Hz per band, DC excluded
const FRAMES = 5;
const HALF_PEAK = 4;                    // 20 ms on each side
const KERNEL = 160, ONSET = 64;          // 4 ms before and 6 ms after the anchor
const PATCH_TAIL = NFFT/2+3*HOP;        // frame centres at -5, 0, 5, 10, 15 ms
const HANN_TO_RECT = NFFT/WINDOW.reduce((sum,w)=>sum+w*w,0);
const METHODS = new Set(['coherent','spectral']);
const vector = () => new Float64Array(NFFT);
const bandOf = k => (k-1) >>> 3;

function bandMagnitudes(re, im, dest, offset=0) {
  dest.fill(0,offset,offset+BANDS);
  for (let k=1; k<BINS; k++) dest[offset+bandOf(k)] += re[k]*re[k]+im[k]*im[k];
  for (let b=0; b<BANDS; b++) dest[offset+b]=Math.sqrt(dest[offset+b]);
}

function prepare(take, anchor, method) {
  const x=Float32Array.from(take.pcm,v=>v/32768);
  if (anchor < NFFT/2+HOP || anchor+PATCH_TAIL>x.length) throw Error('Incomplete enrolled template');
  if (method==='coherent') {
    const h=vector(),re=vector(),im=vector();
    h.set(x.subarray(anchor-ONSET,anchor-ONSET+KERNEL));
    // Smooth the crop edges; preserve the waveform and relative phase.
    for (let i=0; i<8; i++) { h[i]*=i/8; h[KERNEL-1-i]*=i/8; }
    forward(h,0,re,im,null);
    return {re,im};
  }
  return magnitudePatch(x,anchor);
}

// Five frames of 16 unwhitened band magnitudes, reused by the replay inspector.
export function magnitudePatch(x,anchor) {
  const re=vector(),im=vector();
  const patch=new Float64Array(FRAMES*BANDS);
  for (let t=0; t<FRAMES; t++) {
    forward(x,anchor+(t-1)*HOP-NFFT/2,re,im);
    bandMagnitudes(re,im,patch,t*BANDS);
  }
  return patch;
}

export class TemplateDetector {
  constructor(bank, method) {
    if (!METHODS.has(method) || bank?.rate!==RATE || !bank.takes?.length)
      throw Error('Expected enrolled templates at 16 kHz');
    this.method=method;
    this.bank=bank.takes.map(t=>prepare(t,bank.anchor,method));
    this.sources=bank.takes.map(t=>t.source);
    this.frame=vector();this.hop=new Float32Array(HOP);
    this.re=vector();this.im=vector();this.outRe=vector();this.outIm=vector();
    this.weights=vector();this.noise=new Float64Array(BINS);this.power=new Float64Array(BINS);
    this.bandNoise=new Float64Array(BANDS);this.patch=new Float64Array(FRAMES*BANDS);
    this.observed=new Float64Array(FRAMES*BANDS);
    this.head=0;this.fill=0;this.samples=0;this.frames=0;this.peaks=[];
  }
  push(samples, emit) {
    for (let i=0; i<samples.length;) {
      const count=Math.min(HOP-this.fill,samples.length-i);
      this.hop.set(samples.subarray(i,i+count),this.fill);
      this.fill+=count;i+=count;
      if (this.fill!==HOP) continue;
      this.frame.copyWithin(0,HOP);this.frame.set(this.hop,NFFT-HOP);
      this.fill=0;this.samples+=HOP;
      if (this.samples>=NFFT) this.processFrame(emit);
    }
  }
  processFrame(emit) {
    forward(this.frame,0,this.re,this.im);
    let noiseSum=0;
    for (let k=1; k<BINS; k++) {
      this.power[k]=this.re[k]*this.re[k]+this.im[k]*this.im[k];
      noiseSum+=this.noise[k];
    }
    const floor=Math.max(1e-10,.02*noiseSum/(BINS-1));
    if (this.method==='spectral') {
      bandMagnitudes(this.re,this.im,this.patch,this.head*BANDS);
      this.head=(this.head+1)%FRAMES;
    }
    if (this.samples/RATE>WARMUP_SECONDS) {
      const point=this.method==='coherent'?this.waveformScore(floor):this.magnitudeScore(floor);
      if (point.time>=WARMUP_SECONDS) this.pickPeak(point,emit);
    }
    this.frames++;
    const calibrating=this.samples/RATE<=WARMUP_SECONDS;
    for (let k=1; k<BINS; k++) {
      const p=this.noise[k], observation=this.power[k];
      this.noise[k]=calibrating?p+(observation-p)/this.frames:
        p+.02*(Math.min(observation,3*Math.max(p,floor))-p);
    }
  }
  waveformScore(floor) {
    const weight=this.weights;
    for (let k=1; k<BINS; k++)
      weight[k]=weight[NFFT-k]=1/(HANN_TO_RECT*Math.max(floor,this.noise[k]));
    forward(this.frame,0,this.re,this.im,null);
    let best=0, start=0, winner=0;
    // The newest HOP fully supported template starts. Adjacent blocks tile all sample lags.
    for (let j=0;j<this.bank.length;j++) {
      const h=this.bank[j];
      const norm=correlation(this.re,this.im,h.re,h.im,weight,this.outRe,this.outIm);
      if (norm===0) continue;
      for (let t=NFFT-KERNEL-HOP+1; t<=NFFT-KERNEL; t++) {
        const score=Math.abs(this.outRe[t])/norm;
        if (score>best) { best=score;start=t;winner=j; }
      }
    }
    return {time:(this.samples-NFFT+start+ONSET)/RATE,score:best,templateId:this.sources[winner]};
  }
  magnitudeScore(floor) {
    const inv=this.bandNoise;inv.fill(0);
    for (let k=1; k<BINS; k++) inv[bandOf(k)]+=Math.max(floor,this.noise[k]);
    for (let b=0; b<BANDS; b++) inv[b]=1/Math.sqrt(inv[b]);
    let energy=0;
    for (let t=0; t<FRAMES; t++) {
      const row=((this.head+t)%FRAMES)*BANDS;
      for (let b=0; b<BANDS; b++) {
        const x=Math.max(0,this.patch[row+b]*inv[b]-1);
        this.observed[t*BANDS+b]=x;energy+=x*x;
      }
    }
    let best=0, winner=0;
    for (let j=0;j<this.bank.length;j++) {
      const h=this.bank[j];
      let cross=0, norm=0;
      for (let i=0; i<h.length; i++) {
        const v=h[i]*inv[i%BANDS];
        cross+=this.observed[i]*v;norm+=v*v;
      }
      if (norm>0) {
        const score=cross/Math.sqrt(norm*(energy+h.length));
        if(score>best){best=score;winner=j;}
      }
    }
    return {time:(this.samples-PATCH_TAIL)/RATE,score:best,templateId:this.sources[winner]};
  }
  pickPeak(point, emit) {
    this.peaks.push(point);
    if (this.peaks.length<2*HALF_PEAK+1) return;
    const centre=this.peaks[HALF_PEAK];
    // A tie goes to the earliest block. Unfinished peak windows never emit.
    if (centre.score>0 && this.peaks.every((p,i)=>i<HALF_PEAK?p.score<centre.score:p.score<=centre.score))
      emit({...centre,method:this.method,decision:this.samples/RATE});
    this.peaks.shift();
  }
}
