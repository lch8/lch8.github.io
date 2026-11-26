import test from 'node:test';
import assert from 'node:assert/strict';
import {assessStep, parseWindows, listeningCues, pairEvents} from '../review.mjs';

const call=t=>({time:t,decision:t+.044,score:.8,gateDb:11});
test('adjacent process steps cannot share a call; a late score is awaited',()=>{
  const events=[call(.999),call(1)];
  assert.equal(assessStep(.2,1,events,1.03,{finished:false}).reason,'waiting');
  assert.equal(assessStep(.2,1,events,1.045).event.time,.999);
  assert.equal(assessStep(1,1.5,events,2).event.time,1);
});
test('empty, competing, warmup and truncated intervals go to review',()=>{
  assert.equal(assessStep(.3,.7,[],1).reason,'none');
  assert.equal(assessStep(.3,.7,[call(.35),call(.52)],1).reason,'multiple');
  assert.equal(assessStep(0,.7,[call(.35)],1).reason,'warmup');
  assert.equal(assessStep(.2,.98,[],1).reason,'incomplete');
  assert.equal(assessStep(.2,null,[],1).reason,'unclosed');
  assert.equal(assessStep(.2,null,[],1,{finished:false}).reason,'open');
});
test('external control windows are finite, ordered, disjoint and bounded',()=>{
  assert.deepEqual(parseWindows({windows:[[0,.5],[.5,.75]]},1),[[0,.5],[.5,.75]]);
  for(const bad of [{}, {windows:[[.3,.6],[.5,.8]]}, {windows:[[.3,2]]}, {windows:[['0',.5]]}])
    assert.throws(()=>parseWindows(bad,1));
});
test('the audition picks a separated buckle and a scored false alarm',()=>{
  const ref={targets:[{time:1},{time:2}],clutter:[{time:1.006,kind:'hammer'},{time:3.01,kind:'pen'}]};
  const calls=[call(1),call(2),call(3)], paired=pairEvents(ref.targets,calls);
  const cues=listeningCues(ref,calls,paired);
  assert.deepEqual(cues.map(c=>c.time),[2,3]);assert.equal(cues[1].kind,'pen');
  assert.equal(listeningCues(ref,[],[])[1].label,'Hear a tool');
});

test('the strongest call uses the displayed detector and keeps the earliest tie',()=>{
  const events=[{...call(.4),score:.55,gateDb:18},{...call(.55),score:.89,gateDb:11},{...call(.7),score:.89,gateDb:10}];
  const chosen=assessStep(.2,.85,events,1,{rule:'strongest'});
  assert.equal(chosen.reason,'strongest');assert.equal(chosen.count,3);assert.equal(chosen.event.time,.55);
  assert.equal(assessStep(.2,.85,events,1,{rule:'strongest',method:'gate'}).event.time,.4);
  assert.equal(assessStep(.2,.85,events,.87,{finished:false,rule:'strongest'}).reason,'waiting');
});
