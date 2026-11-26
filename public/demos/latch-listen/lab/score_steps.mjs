import fs from 'node:fs';
import {assessStep, COLLAR, pairEvents, qualifies} from '../review.mjs';

const profile = process.argv[2];
if (!['station','unseen'].includes(profile)) throw Error('Choose station or unseen');
const model = JSON.parse(fs.readFileSync(new URL('../results/'+profile+'/model.json', import.meta.url)));
const rows = JSON.parse(fs.readFileSync(0, 'utf8'));
const tally = () => ({correctTime:0, wrongTime:0, falseOnEmpty:0, reviewOccupied:0, reviewEmpty:0});
const result = {scenes:rows.length, steps:0, occupied:0, empty:0, outsideTargets:0,
  firstCall:tally(), singleCall:tally(), eventCheck:{tp:0,fp:0,fn:0}};

function record(counts, candidate, targets) {
  if (!candidate) counts[targets.length ? 'reviewOccupied':'reviewEmpty']++;
  else if (!targets.length) counts.falseOnEmpty++;
  else if (targets.some(t => Math.abs(candidate.time-t.time) <= COLLAR)) counts.correctTime++;
  else counts.wrongTime++;
}

for (const row of rows) {
  const calls = row.events.filter(e=>qualifies(e,model,'verifier','sensitive'));
  const hits = pairEvents(row.targets,calls).length;
  result.eventCheck.tp+=hits; result.eventCheck.fp+=calls.length-hits; result.eventCheck.fn+=row.targets.length-hits;
  result.outsideTargets+=row.targets.filter(t=>!row.windows.some(([a,b])=>a<=t.time&&t.time<b)).length;
  for (const [a,b] of row.windows) {
    const truth = row.targets.filter(t=>a<=t.time&&t.time<b);
    const step = assessStep(a,b,calls,row.duration);
    result.steps++; result[truth.length?'occupied':'empty']++;
    record(result.firstCall, calls.find(e=>a<=e.time&&e.time<b), truth);
    record(result.singleCall, step.event, truth);
  }
}
console.log(JSON.stringify(result));
