import {TemplateVerifier} from './template-verifier.mjs';

// A replay caches both displays for the requested template family. The microphone
// instantiates only the chosen detector and never sends audio to this worker.
self.onmessage=({data:{samples,bank,family,model}})=>{
  try {
    const events=[],verified=[];
    const detector=new TemplateVerifier(bank,family,model,{emitProposals:true});
    detector.push(samples,e=>(e.method===family?events:verified).push(e));
    self.postMessage({events,verified});
  } catch (error) { self.postMessage({error:String(error.message??error)}); }
};
