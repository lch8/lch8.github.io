// Usage: ffmpeg ... -f s16le - | node lab/template_field.mjs station
import fs from 'node:fs';
import {Detector, RATE} from '../detector.mjs';
import {TemplateVerifier} from '../template-verifier.mjs';
import {qualifies} from '../review.mjs';

const profile=process.argv[2];
if (!['station','unseen'].includes(profile)) throw Error('Choose station or unseen.');
const read=name=>JSON.parse(fs.readFileSync(new URL('../results/'+name,import.meta.url)));
const model={...read(profile+'/model.json'),templates:read(profile+'-templates.json')};
const base=new Detector(model);
const scanners=['coherent','spectral'].map(family=>new TemplateVerifier(model.templates,family,model,{emitProposals:true}));
const activations=Object.fromEntries(['gate','verifier','coherent','coherentVerified','spectral','spectralVerified'].map(m=>[m,{sensitive:0,quiet:0}]));
function tally(e,method) {
  for(const op of ['sensitive','quiet']) if(qualifies(e,model,method,op)) activations[method][op]++;
}
let count=0,tail=Buffer.alloc(0);
for await (const piece of process.stdin) {
  const bytes=tail.length?Buffer.concat([tail,piece]):piece;
  const even=bytes.length-bytes.length%2;
  const x=new Float32Array(even/2);
  for(let i=0;i<x.length;i++) x[i]=bytes.readInt16LE(i*2)/32768;
  tail=bytes.subarray(even);
  base.push(x,e=>{tally(e,'gate');tally(e,'verifier');});
  for(const s of scanners) s.push(x,e=>tally(e,e.method));
  count+=x.length;
}
if(tail.length) throw Error('Incomplete int16 sample.');
console.log(JSON.stringify({profile,seconds:count/RATE,activations},null,2));
