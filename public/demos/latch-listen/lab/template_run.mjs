import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {Detector} from '../detector.mjs';
import {TemplateDetector} from '../spectral.mjs';
import {TemplateVerifier} from '../template-verifier.mjs';

const [manifest, modelPath, bankPath, method] = process.argv.slice(2);
const rows=JSON.parse(fs.readFileSync(manifest));
const model=JSON.parse(fs.readFileSync(modelPath)), bank=JSON.parse(fs.readFileSync(bankPath));
function run(samples) {
  let detector;
  if (method==='legacy') detector=new Detector(model);
  else if (method.endsWith('Verified')) detector=new TemplateVerifier(bank,method.slice(0,-8),model);
  else detector=new TemplateDetector(bank,method);
  const events=[];
  const start=performance.now();
  for (let i=0;i<samples.length;i+=256)
    detector.push(samples.subarray(i,i+256),e=>events.push(e));
  return {events,computeMs:performance.now()-start};
}
for (let i=0;i<rows.length;i++) {
  const bytes=fs.readFileSync(rows[i].path);
  const x=Float32Array.from(new Int16Array(bytes.buffer,bytes.byteOffset,bytes.length/2),n=>n/32768);
  if (i===0) run(x);
  console.log(JSON.stringify(run(x)));
}
