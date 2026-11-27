import {CLIP_LENGTH, features, HOP, RATE, verify} from './detector.mjs';
import {TemplateDetector} from './spectral.mjs';

// Score the same 50 ms, hop-aligned crop used to train the energy-triggered head.
// A template peak can arrive before or after that crop has finished.
export class TemplateVerifier {
  constructor(bank, family, model, {emitProposals=false}={}) {
    this.scan=new TemplateDetector(bank,family);
    this.family=family; this.model=model; this.emitProposals=emitProposals;
    this.cutoff=bank.thresholds[family].budget;
    this.history=new Float32Array(CLIP_LENGTH+2*HOP);
    this.clip=new Float32Array(CLIP_LENGTH);
    this.seen=0; this.pending=[];
  }
  push(samples,emit) {
    for (let i=0; i<samples.length;) {
      const n=Math.min(HOP-this.seen%HOP,samples.length-i);
      const block=samples.subarray(i,i+n);
      this.history.set(block,this.seen%this.history.length);
      this.seen+=n; i+=n;
      this.scan.push(block,peak=>{
        if (this.emitProposals) emit(peak);
        if (peak.score<this.cutoff) return;
        const anchorHop=Math.floor(Math.round(peak.time*RATE)/HOP);
        const start=(anchorHop-1)*HOP;
        this.pending.push({peak,start,end:start+CLIP_LENGTH});
      });
      while (this.pending.length && this.pending[0].end<=this.seen) {
        const {peak,start}=this.pending.shift();
        const first=start%this.history.length;
        const n1=Math.min(CLIP_LENGTH,this.history.length-first);
        this.clip.set(this.history.subarray(first,first+n1));
        if (n1<CLIP_LENGTH) this.clip.set(this.history.subarray(0,CLIP_LENGTH-n1),n1);
        emit({method:this.family+'Verified',time:peak.time,decision:this.seen/RATE,
          score:verify(features(this.clip),this.model),proposalScore:peak.score,proposalDecision:peak.decision,templateId:peak.templateId});
      }
    }
  }
}
