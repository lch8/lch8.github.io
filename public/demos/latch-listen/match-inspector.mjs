import {RATE} from './detector.mjs';
import {magnitudePatch} from './spectral.mjs';
import {frontEnd,thresholdFor} from './review.mjs';

function draw(canvas,x,anchor,family) {
  const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const left=37,top=12,width=w-left-12,height=h-top-25;
  g.fillStyle='#142f2c';g.fillRect(0,0,w,h);
  g.font='13px monospace';g.fillStyle='#d4e3d7';
  if (family==='coherent') {
    const clip=x.subarray(anchor-64,anchor+96),mid=top+height/2;
    const max=clip.reduce((v,s)=>Math.max(v,Math.abs(s)),1e-12);
    g.strokeStyle='#527064';g.beginPath();g.moveTo(left,mid);g.lineTo(left+width,mid);
    g.moveTo(left+width*64/159,top);g.lineTo(left+width*64/159,top+height);g.stroke();
    g.strokeStyle='#a3e3bf';g.beginPath();
    clip.forEach((v,i)=>{const px=left+i*width/159,py=mid-v/max*height*.48;
      if(i===0)g.moveTo(px,py);else g.lineTo(px,py);});
    g.stroke();g.fillText('−4 ms',left,h-5);g.fillText('0',left+width*64/159-3,h-5);
    g.textAlign='right';g.fillText('+6 ms',left+width,h-5);g.textAlign='left';
    return;
  }
  const patch=magnitudePatch(x,anchor);
  const max=Math.max(1e-12,...patch);
  for(let t=0;t<5;t++) for(let band=0;band<16;band++) {
    const db=20*Math.log10(Math.max(1e-12,patch[t*16+band]/max));
    const u=Math.max(0,Math.min(1,(db+35)/35));
    g.fillStyle='rgb('+Math.round(18+201*u)+','+Math.round(49+168*u)+','+Math.round(43+85*u)+')';
    g.fillRect(left+t*width/5,top+(15-band)*height/16,width/5+.3,height/16+.3);
  }
  g.fillStyle='#d4e3d7';g.textAlign='left';
  g.fillText('8k',4,top+8);g.fillText('4k',4,top+height/2+4);g.fillText('0',12,top+height);
  g.textAlign='center';
  [-5,0,5,10,15].forEach((ms,i)=>g.fillText(ms+' ms',left+(i+.5)*width/5,h-5));
  g.textAlign='left';
}

export function makeInspector(play) {
  const el=id=>document.getElementById(id), panel=el('matchInspector'), select=el('matchTime');
  let state=null;
  function paint() {
    if(!state || !panel.open)return;
    const {method,events,model,signal,operating}=state, e=events[Number(select.value)];
    if(!e)return;
    const bank=model.templates,take=bank.takes.find(t=>t.source===e.templateId);
    if(!take)return;
    const family=frontEnd(method), verified=method.endsWith('Verified');
    const cut=verified?bank.thresholds[family].budget:thresholdFor(model,method,operating);
    const score=verified?e.proposalScore:e.score;
    el('matchScore').textContent='Template score '+score.toFixed(3)+' / cutoff '+cut.toFixed(3)+
      (verified?' · verifier '+e.score.toFixed(3)+' / cutoff '+thresholdFor(model,method,operating).toFixed(3):'');
    el('enrolledTake').textContent='Enrolled take '+take.source;
    el('matchCaption').textContent=family==='coherent'?
      '10 ms waveforms, each scaled to its peak. The detector searches sample delays and weights frequencies by the noise spectrum.':
      'Five successive magnitude spectra, 0–8 kHz. Brightness spans −35 to 0 dB relative to each patch’s peak. The detector noise-weights each band.';
    draw(el('referencePatch'),Float32Array.from(take.pcm,v=>v/32768),bank.anchor,family);
    draw(el('observedPatch'),signal,Math.round(e.time*RATE),family);
  }
  select.addEventListener('change',paint);panel.addEventListener('toggle',paint);
  el('hearMatch').addEventListener('click',()=>{if(state){const t=state.events[Number(select.value)].time;play(Math.max(0,t-.22),t+.30);}});
  return (method,events,model,buffer,reference,pairs,operating)=>{
    panel.hidden=!buffer || !events.length || frontEnd(method)==='energy';
    if(panel.hidden){state=null;return;}
    const last=state?.events[Number(select.value)]?.time;
    state={method,events,model,signal:buffer.getChannelData(0),operating};
    const matched=new Set(pairs.map(pair=>pair[1]));
    select.replaceChildren(...events.map((e,i)=>{
      const opt=document.createElement('option');opt.value=i;
      opt.textContent=e.time.toFixed(3)+' s'+(reference?(matched.has(i)?' · buckle found':' · false call'):'');
      return opt;
    }));
    const previous=events.findIndex(e=>e.time===last);
    const isolated=reference && pairs.find(([i])=>reference.clutter.every(t=>Math.abs(t.time-reference.targets[i].time)>.32));
    select.value=String(previous>=0?previous:isolated?isolated[1]:0);paint();
  };
}
