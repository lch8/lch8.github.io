import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Detector, RATE, detect, verify} from '../detector.mjs';

const model = JSON.parse(fs.readFileSync(new URL('../results/station/model.json', import.meta.url)));
function signal() {
  const x = new Float32Array(RATE);
  for (const t of [.25,.55,.81]) {
    for (let i=0; i<260; i++) x[Math.round(t*RATE)+i] =
      .65*Math.exp(-i/34)*Math.sin(2*Math.PI*2900*i/RATE);
  }
  return x;
}
function stream(x, chunks) {
  const detector = new Detector(model), items = [];
  let at=0, j=0;
  while (at<x.length) {
    const stop=Math.min(x.length,at+chunks[j++%chunks.length]);
    detector.push(x.subarray(at,stop), e=>{
      assert.ok(e.decision<=stop/RATE);
      assert.ok(e.decision>=e.time);
      items.push(e);
    });
    at=stop;
  }
  return items;
}
test('arbitrary chunks give identical event and decision clocks',()=>{
  const x=signal(), expected=detect(x,model);
  assert.equal(expected.length,3);
  assert.deepEqual(stream(x,[1,7,129,3,511,80]),expected);
  assert.deepEqual(stream(x,[x.length]),expected);
});
test('a pending candidate needs real future samples to finish',()=>{
  const x=signal(), first=detect(x,model)[0];
  const cut=Math.round(first.decision*RATE);
  assert.equal(stream(x.subarray(0,cut-1),[128]).length,0);
  assert.equal(stream(x.subarray(0,cut),[128]).length,1);
});
test('silence is quiet and exported heads produce finite bounded scores',()=>{
  assert.deepEqual(detect(new Float32Array(4*RATE),model),[]);
  for (const p of ['station','unseen']) {
    const m=JSON.parse(fs.readFileSync(new URL('../results/'+p+'/model.json',import.meta.url)));
    const score=verify(new Array(23).fill(0),m);
    assert.ok(score>=0 && score<=1);
  }
});
