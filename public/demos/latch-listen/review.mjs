import {MAX_DECISION_SECONDS, WARMUP_SECONDS} from './detector.mjs';

export const COLLAR = 0.050;

export const methodNames = {
  verifier:'Energy + acoustic verifier', gate:'Energy gate',
  coherent:'Whitened waveform match', coherentVerified:'Waveform match + verifier',
  spectral:'STFT magnitude template', spectralVerified:'STFT template + verifier'
};

export function frontEnd(method) {
  if (method==='gate' || method==='verifier') return 'energy';
  return method.replace(/Verified$/,'');
}

export function thresholdFor(model,method,operating) {
  const quiet=operating==='quiet';
  if (method==='gate') return quiet ? model.quietGateThresholdDb : model.gateThresholdDb;
  if (method==='verifier') return quiet ? model.quietScoreThreshold : model.scoreThreshold;
  return model.templates.thresholds[method][operating];
}

export function qualifies(e, model, method, operating) {
  if (frontEnd(method)==='energy' ? e.method!=null : e.method!==method) return false;
  return (method==='gate'?e.gateDb:e.score) >= thresholdFor(model,method,operating);
}
// Reference labels enter only the evaluation and audition functions.
export function pairEvents(truth, calls) {
  let i = 0, j = 0;
  const pairs = [];
  while (i < truth.length && j < calls.length) {
    const delta = calls[j].time - truth[i].time;
    if (delta < -COLLAR) j++;
    else if (delta > COLLAR) i++;
    else { pairs.push([i++, j++]); }
  }
  return pairs;
}

export function parseWindows(document, duration) {
  if (!Array.isArray(document?.windows)) throw Error('Use a JSON object containing a windows array.');
  let previousEnd = 0;
  return document.windows.map((pair, i) => {
    const start = pair?.[0], end = pair?.[1];
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !Number.isFinite(start) || !Number.isFinite(end) ||
        start < previousEnd || start < 0 || start >= end || end > duration) {
      throw Error('Check step '+(i+1)+'. Use ordered, non-overlapping [start, end] seconds inside the recording.');
    }
    previousEnd = end;
    return [start, end];
  });
}

export function addCandidate(summary, event, method = 'verifier') {
  const value = method === 'gate' ? 'gateDb' : 'score';
  if (summary.count === 0 || event[value] > summary.best[value]) summary.best = event;
  summary.count++;
}

// Half-open intervals assign each candidate to at most one step. Near its
// end a candidate can take 45 ms to produce a score from its full clip.
export function assessStep(start, end, calls, audioThrough, options = {}) {
  const summary = {count:0, best:null};
  for (const e of calls) {
    if (e.time >= start && (end === null || e.time < end) && e.decision <= audioThrough)
      addCandidate(summary,e,options.method);
  }
  return resolveStep(start,end,summary,audioThrough,options);
}

export function resolveStep(start, end, summary, audioThrough, {finished = true, rule = 'single', method='verifier'} = {}) {
  const result = {start, end, count:summary.count, event:null, availableAt:null};
  if (end === null) return {...result, reason:finished ? 'unclosed' : 'open'};
  if (audioThrough + 1e-10 < end + MAX_DECISION_SECONDS) {
    return {...result, reason:finished ? 'incomplete' : 'waiting'};
  }
  result.availableAt = end + MAX_DECISION_SECONDS;
  // Four past score frames and hop alignment are needed for the first template peak.
  const startup=frontEnd(method)==='energy'?WARMUP_SECONDS:WARMUP_SECONDS+.025;
  if (start < startup) return {...result, reason:'warmup'};
  if (summary.count === 0) return {...result, reason:'none'};
  if (summary.count === 1) return {...result, reason:'single', event:summary.best};
  if (rule === 'strongest') return {...result, reason:'strongest', event:summary.best};
  return {...result, reason:'multiple'};
}
export const stepLabel = {
  single:'One click flagged', strongest:'Highest score flagged', none:'Review · no click detected', multiple:'Review · multiple calls',
  open:'Listening to this step', waiting:'Finishing the last audio frame',
  incomplete:'Review · recording ended early', unclosed:'Review · step left open',
  warmup:'Review · startup noise estimate'
};

export function listeningCues(reference, calls, pairs) {
  const distance = (t, events) => events.reduce((d, e) => Math.min(d, Math.abs(t-e.time)), Infinity);
  // Prefer a buckle whose audition contains no labeled tool. Break ties by time.
  const target = reference.targets.find(e => distance(e.time, reference.clutter) > .32)
    ?? reference.targets[0];
  const cues = [];
  if (target) cues.push({time:target.time, label:distance(target.time,reference.clutter) > .32
    ? 'Hear a buckle' : 'Hear a buckle in the mix', kind:'buckle'});
  const hit = new Set(pairs.map(p => p[1]));
  let falseCue;
  for (let j=0; j<calls.length; j++) {
    const e=calls[j];
    if (hit.has(j) || distance(e.time,reference.targets) <= .32) continue;
    const tool = reference.clutter.find(t => Math.abs(t.time-e.time) <= COLLAR);
    if (tool) { falseCue = {time:e.time, label:'Hear a false alarm', kind:tool.kind}; break; }
  }
  if (falseCue) cues.push(falseCue);
  else {
    const tool = reference.clutter.find(e => distance(e.time,reference.targets) > .32);
    if (tool) cues.push({time:tool.time, label:'Hear a tool', kind:tool.kind});
  }
  return cues;
}
