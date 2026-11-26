import test from 'node:test';
import assert from 'node:assert/strict';
import {forward, correlation, NFFT} from '../fft256.mjs';
import {Detector, RATE, MAX_DECISION_SECONDS} from '../detector.mjs';
import {TemplateDetector} from '../spectral.mjs';

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
}
