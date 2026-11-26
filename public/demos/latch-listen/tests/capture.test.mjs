import test from 'node:test';
import assert from 'node:assert/strict';

test('live markers use processed samples; stopping freezes the capture', async t => {
  let Capture;
  const messages = [];
  globalThis.sampleRate = 16000;
  globalThis.AudioWorkletProcessor = class {
    constructor() { this.port = {postMessage:message => messages.push(message)}; }
  };
  globalThis.registerProcessor = (_name, cls) => { Capture = cls; };
  t.after(() => {
    delete globalThis.sampleRate;
    delete globalThis.AudioWorkletProcessor;
    delete globalThis.registerProcessor;
  });
  await import('../mic-worklet.mjs');
  const worklet = new Capture({processorOptions:{model:null}});
  const block = [[new Float32Array(128)]];
  const mark = name => worklet.port.onmessage({data:{mark:name}});
  assert.equal(worklet.process([]),true);
  worklet.process(block);
  mark('start');
  for (let i=0; i<5; i++) worklet.process(block);
  mark('end');
  mark('stop');
  assert.equal(worklet.process(block),false);
  mark('start');
  assert.deepEqual(messages.filter(m=>m.mark),[
    {mark:'start',time:128/16000}, {mark:'end',time:768/16000}, {mark:'stop',time:768/16000}
  ]);
  assert.equal(messages.filter(m=>'peak' in m).length,1);
});
