import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {forward, correlation, NFFT} from '../fft256.mjs';
import {CLIP_LENGTH, Detector, features, HOP, RATE, MAX_DECISION_SECONDS, verify} from '../detector.mjs';
import {TemplateDetector} from '../spectral.mjs';
import {TemplateVerifier} from '../template-verifier.mjs';

test('flat PSD gives the signed time-domain correlation at each valid sample lag',()=>{
  const x=Float64Array.from({length:NFFT},(_,i)=>Math.sin(i*.074)+.1*Math.cos(i*.357));
  const h=Float64Array.from({length:NFFT},(_,i)=>i<60?Math.cos(.51*i)*Math.exp(-i/20):0);
  const alloc=()=>new Float64Array(NFFT);
  const xr=alloc(), xi=alloc(), hr=alloc(), hi=alloc(), out=alloc();
  forward(x,0,xr,xi,null);forward(h,0,hr,hi,null);
  const norm=correlation(xr,xi,hr,hi,alloc().fill(1),out,alloc());
  assert.ok(Math.abs(norm-Math.sqrt(NFFT*h.reduce((s,v)=>s+v*v,0)))<1e-8);
  for (let t=0;t<=NFFT-60;t++) {
    const direct=h.subarray(0,60).reduce((sum,v,i)=>sum+x[t+i]*v,0);
    assert.ok(Math.abs(out[t]/NFFT-direct)<1e-9);
  }
});

const pcm=Array.from({length:640},(_,i)=>{
  const j=i-240;
  return j<0?0:Math.round(22000*Math.exp(-j/34)*Math.cos(1.4*j+.003*j*j));
});
const bank={rate:RATE,anchor:240,takes:[{source:'fixture',pcm}]};
const clickAt=.401;
const x=new Float32Array(RATE);
for(let j=0;j<pcm.length;j++) x[Math.round(clickAt*RATE)-240+j]=pcm[j]/32768*.0001;
function collect(method,chunks,signal=x) {
  const d=new TemplateDetector(bank,method),events=[];
  for(let i=0,j=0;i<signal.length;j++) {
    const stop=Math.min(signal.length,i+chunks[j%chunks.length]);
    d.push(signal.subarray(i,stop),e=>{
      assert.ok(e.decision<=stop/RATE && e.time<=e.decision);
      assert.ok(e.decision-e.time<=MAX_DECISION_SECONDS+1e-10);
      events.push(e);
    });
    i=stop;
  }
  return events;
}
for(const method of ['coherent','spectral']) {
  test(method+' scans below the legacy energy gate and preserves timestamps across chunks',()=>{
    const legacy=[];new Detector().push(x,e=>legacy.push(e));assert.equal(legacy.length,0);
    const calls=collect(method,[128]);
    assert.deepEqual(calls,collect(method,[3,471,24,158]));
    const peak=calls.reduce((a,b)=>a.score>b.score?a:b);
    assert.ok(Math.abs(peak.time-clickAt)<.008,JSON.stringify(peak));
    assert.deepEqual(collect(method,[111],x.subarray(0,Math.round(peak.decision*RATE)-1)),calls.filter(e=>e.decision<peak.decision));
    assert.deepEqual(collect(method,[256],new Float32Array(RATE)),[]);
  });
  test(method+' passes the original hop-aligned crop to the frozen head',()=>{
    const model=JSON.parse(fs.readFileSync(new URL('../results/station/model.json',import.meta.url)));
    const input={...bank,thresholds:{[method]:{budget:0}}};
    const run=chunks=>{
      const calls=[],d=new TemplateVerifier(input,method,model,{emitProposals:true});
      for(let i=0,j=0;i<x.length;j++){
        const stop=Math.min(x.length,i+chunks[j%chunks.length]);
        d.push(x.subarray(i,stop),e=>calls.push(e));i=stop;
      }
      return calls;
    };
    const all=run([111,3,512]), raw=all.filter(e=>e.method===method), scored=all.filter(e=>e.method!==method);
    assert.deepEqual(all,run([1,128]));
    assert.deepEqual(raw,collect(method,[80]));
    assert.equal(raw.length,scored.length);
    for (const [i,e] of scored.entries()) {
      const start=(Math.floor(Math.round(e.time*RATE)/HOP)-1)*HOP;
      assert.equal(e.score,verify(features(x.subarray(start,start+CLIP_LENGTH)),model));
      assert.equal(e.decision,Math.max(raw[i].decision,(start+CLIP_LENGTH)/RATE));
      assert.equal(e.proposalScore,raw[i].score);
      assert.equal(e.templateId,'fixture');
    }
  });
}

test('downweighting one noisy bin pair changes the correlation by its analytic contribution',()=>{
  const alloc=()=>new Float64Array(NFFT), a=9,b=48, lag=3;
  const at=(k,n)=>Math.cos(2*Math.PI*k*n/NFFT);
  const x=Float64Array.from({length:NFFT},(_,n)=>at(a,n)+at(b,n));
  const re=alloc(),im=alloc(),out=alloc(),w=alloc().fill(1);
  forward(x,0,re,im,null);w[a]=w[NFFT-a]=.01;
  correlation(re,im,re,im,w,out,alloc());
  assert.ok(Math.abs(out[lag]/NFFT-NFFT/2*(.01*at(a,lag)+at(b,lag)))<1e-8);
});
