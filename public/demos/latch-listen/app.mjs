import {detect, RATE} from './detector.mjs';
import {frontEnd, listeningCues, methodNames, pairEvents, qualifies} from './review.mjs';
import {StepPanel} from './step-panel.mjs';
import {makeInspector} from './match-inspector.mjs';

const el = id => document.getElementById(id);
const controls = ['scene','method','operating','context','play','seek','mic','upload','filter','more'];
const ui = Object.fromEntries(controls.map(id => [id, el(id)]));
const titles = {mixed:'Buckle and tools', tools:'Tools only', unseen:'Unseen buckles and tools'};
const modelCache = new Map();
let generation = 0, requestId = 0, playRequest = 0;
let kind = 'example', activeName = 'mixed', label = titles.mixed, ready = false;
let model, profile = 'station', benchmark, reference, stepResults, workshop, frontendResults;
let activeMethod='verifier', legacyReplay=[], replayNotice='', scanWorker=null;
const replayScores=new Map();
let audioBuffer, playbackContext, source, playbackStart = 0, offset = 0;
let raw = [], selected = [], pairs = [], envelope = [], inputEnd = 0, micSession;
let duration = 15, animation, viewStart = 0, eventLimit = 12;
const canvas = el('wave');
const inspectMatch=makeInspector(play);

const panel = new StepPanel({
  state: () => ({session:generation, kind, ready, label, profile, model, raw, reference, viewStart,
    through:kind === 'mic' ? inputEnd : duration, live:Boolean(micSession),
    method:activeMethod, operating:ui.operating.value, onlyInside:ui.context.checked}),
  play, mark:action => micSession?.node.port.postMessage({mark:action}), changed:refresh
});

async function json(path) {
  const r = await fetch(path);
  if (!r.ok) throw Error('Could not load ' + path);
  return r.json();
}
async function loadProfile(name) {
  if (!modelCache.has(name)) {
    const request = Promise.all([json('./results/'+name+'/model.json'),json('./results/'+name+'/benchmark.json'),
      json('./results/'+name+'-templates.json')]).then(([m,b,templates])=>[{...m,templates},b]);
    modelCache.set(name, request);
    request.catch(() => modelCache.delete(name));
  }
  return modelCache.get(name);
}
function say(message) { el('notice').textContent = message; }
function stopPlayback(reset = false) {
  playRequest++;
  if (source) {
    offset = Math.min(duration, Math.max(0, playbackContext.currentTime - playbackStart));
    source.onended = null;
    source.stop(); source.disconnect(); source = null;
  }
  cancelAnimationFrame(animation);
  if (reset) offset = 0;
  ui.play.textContent = 'Play recording';
  if (ready && kind !== 'mic') el('state').textContent = 'Ready';
}
function stopMicrophone() {
  if (micSession) {
    const {stream, node, input, ctx, stopTimer} = micSession;
    micSession = null;
    clearTimeout(stopTimer);
    node.port.onmessage = null;
    stream.getTracks().forEach(t => t.stop());
    node.disconnect(); input.disconnect(); ctx.close().catch(() => {});
  }
  ui.mic.disabled = false; ui.mic.textContent = 'Use microphone';
}
function beginInput(nextKind, name, title) {
  ++generation;
  cancelScan();replayScores.clear();legacyReplay=[];activeMethod='verifier';
  ui.method.disabled=false;el('methodLabel').textContent='Show calls from';
  stopPlayback(true); stopMicrophone();
  kind = nextKind; activeName = name; label = title; ready = false;
  raw = []; selected = []; pairs = []; envelope = []; audioBuffer = null; reference = null;
  viewStart = 0; inputEnd = 0; duration = 15; ui.context.checked = false;
  ui.play.disabled = true; ui.seek.disabled = true; ui.seek.value = 0;
  ui.filter.value = 'all'; eventLimit = 12; panel.reset();
  setSourceLine(name,title); el('monitorTitle').textContent = title;
  return generation;
}
function setSourceLine(value, title) {
  let custom = ui.scene.querySelector('option[data-local]');
  if (titles[value]) { custom?.remove(); ui.scene.value = value; return; }
  if (!custom) { custom = document.createElement('option'); custom.dataset.local = 'true'; ui.scene.append(custom); }
  custom.value = value; custom.textContent = title; ui.scene.value = value;
}
function inputFailed(error, request) {
  if (request !== requestId) return;
  setSourceLine(activeName,label);
  ui.mic.disabled = false;
  if (!ready) el('state').textContent = 'Unavailable';
  say(error.name === 'NotAllowedError' ? 'Microphone access was declined. You can play a recording or open an audio file.'
    : error.name === 'EncodingError' ? 'This audio format could not be decoded. Try a WAV or FLAC recording.' : error.message);
}
async function decode(bytes) {
  const offline = new OfflineAudioContext(1, 1, RATE);
  const decoded = await offline.decodeAudioData(bytes);
  const mono = new Float32Array(decoded.length);
  for (let k = 0; k < decoded.numberOfChannels; k++) {
    const ch = decoded.getChannelData(k);
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / decoded.numberOfChannels;
  }
  const player = offline.createBuffer(1, mono.length, RATE);
  player.copyToChannel(mono, 0);
  return [mono, player];
}
function peaks(x) {
  const points = [];
  const perBin = Math.max(1, Math.ceil(x.length/1100));
  for (let base = 0; base < x.length; base += perBin) {
    let peak = 0;
    for (let i = base; i < Math.min(x.length, base+perBin); i++) peak = Math.max(peak, Math.abs(x[i]));
    points.push(peak);
  }
  return points;
}
async function loadAudio(name, file = null) {
  const request = ++requestId;
  const localTitle = file ? file.name : titles[name];
  say('Opening the recording…');
  try {
    if (file && file.size > 32*1024*1024) throw Error('Choose an audio file under 32 MB.');
    const which = name === 'unseen' ? 'unseen' : 'station';
    const data = file ? file.arrayBuffer() : fetch('./audio/'+name+'.flac').then(r => {
      if (!r.ok) throw Error('The recording is unavailable.'); return r.arrayBuffer();
    });
    const [[m,b],ref,[samples,buffer]] = await Promise.all([
      loadProfile(which), file ? null : json('./audio/'+name+'.json'), data.then(decode)]);
    if (request !== requestId) return;
    if (samples.length > RATE*120) throw Error('Choose a file of up to two minutes for this replay.');
    const events = detect(samples,m);
    beginInput(file ? 'file' : 'example', file ? 'file' : name, localTitle);
    model = m; benchmark = b; profile = which; audioBuffer = buffer; reference = ref;
    duration = samples.length / RATE; raw = events; envelope = peaks(samples);
    panel.reset(ref?.windows); ready = true;
    ui.play.disabled = false; ui.seek.disabled = false; ui.seek.max = duration;
    el('state').textContent = 'Ready';
    legacyReplay=events;
    replayNotice=file ? 'Local recording · station model. Add work-step times below to review an attempt.' :
      'The replay mixes separately recorded sounds at known times.';
    refresh();selectReplayMethod();paintBench();
  } catch (error) { inputFailed(error,request); }
}
function cancelScan() {
  scanWorker?.terminate();
  scanWorker=null;
}
function eventsFor(method) {
  const family=frontEnd(method);
  if (kind==='mic') {
    return method===activeMethod || (family==='energy' && frontEnd(activeMethod)==='energy') ? raw : null;
  }
  return family==='energy' ? legacyReplay : replayScores.get(method)??null;
}
function selectReplayMethod() {
  cancelScan();
  if (!ready) return;
  const method=ui.method.value, family=frontEnd(method);
  if (kind==='mic') {
    if (!micSession && method!==activeMethod) say('Next capture will use '+methodNames[method]+'. This report uses '+methodNames[activeMethod]+'.');
    return;
  }
  const cached=eventsFor(method);
  if (cached!==null) {
    activeMethod=method;raw=cached;refresh();say(replayNotice);return;
  }
  const token=generation;
  const fail=message=>{
    if(token!==generation) return;
    cancelScan();ui.method.value=activeMethod;say('Template scan interrupted. '+message);
  };
  say('Scanning the recording with '+methodNames[family]+'. Showing '+methodNames[activeMethod]+' until it finishes.');
  try {
    const worker=new Worker('./replay-worker.mjs',{type:'module'});
    scanWorker=worker;
    worker.onerror=()=>{if(scanWorker===worker)fail('Try selecting the method again.');};
    worker.onmessage=({data})=>{
      if(token!==generation || scanWorker!==worker) return;
      if(data.error){fail(data.error);return;}
      replayScores.set(family,data.events);replayScores.set(family+'Verified',data.verified);
      cancelScan();activeMethod=method;raw=replayScores.get(method);refresh();say(replayNotice);
    };
    const samples=audioBuffer.getChannelData(0).slice();
    worker.postMessage({samples,bank:model.templates,family,model},[samples.buffer]);
  } catch(error) {fail(error.message);}
}
function scored(method) {
  if (!model) return [];
  return (eventsFor(method)??[]).filter(e => qualifies(e,model,method,ui.operating.value) &&
    (!ui.context.checked || panel.contains(e.time)));
}
function refresh() {
  ui.context.disabled = panel.rows.length === 0;
  if (ui.context.disabled) ui.context.checked = false;
  selected = scored(activeMethod);
  el('activeMethod').textContent=methodNames[activeMethod];
  pairs = reference ? pairEvents(reference.targets,selected) : [];
  el('refLegend').hidden = !reference;
  el('windowLegend').hidden = !ui.context.checked;
  paintCalls(); panel.render(); paintSignal();
  inspectMatch(activeMethod,selected,model,audioBuffer,reference,pairs,ui.operating.value);
}
const names = {drop:'dropped hammer', hammer:'hammer', ratchet:'ratchet', pen:'pen button'};
const soundName = name => names[name] ?? name;
function make(tag, contents, className) {
  const node = document.createElement(tag); node.textContent = contents;
  if (className) node.className = className;
  return node;
}
function audition(t) {
  if (!el('matchInspector').hidden) {
    let index=-1,nearest=.050;
    selected.forEach((e,i)=>{const distance=Math.abs(e.time-t);if(distance<=nearest){nearest=distance;index=i;}});
    if(index>=0){el('matchTime').value=String(index);el('matchTime').dispatchEvent(new Event('change'));}
  }
  return play(Math.max(0,t-.22),Math.min(duration,t+.30));
}
function paintCalls() {
  const anchors = el('anchors'); anchors.replaceChildren();
  if (reference) for (const cue of listeningCues(reference,selected,pairs)) {
    const button = make('button', '', cue.kind==='buckle'?'audition buckle':'audition');
    button.append(make('strong',cue.label),make('small',(cue.kind === 'buckle' ? '' : soundName(cue.kind)+' · ')+cue.time.toFixed(2)+' s'));
    button.addEventListener('click',() => audition(cue.time)); anchors.append(button);
  }
  const summary = el('replaySummary'), comparison = el('clipComparison');
  comparison.replaceChildren();
  if (reference) {
    const falseCount = selected.length-pairs.length;
    const labels=reference.targets.length ? pairs.length+' of '+reference.targets.length+' labeled buckles found' : 'No buckles in this recording';
    summary.textContent = labels+' · '+falseCount+' false call'+(falseCount===1?'':'s');
    for (const [key,name] of Object.entries(methodNames).filter(([key])=>eventsFor(key)!==null)) {
      const calls = scored(key), found = pairEvents(reference.targets,calls).length;
      const p = make('p','');
      p.append(make('strong',name),document.createTextNode(' · '+(reference.targets.length?found+'/'+reference.targets.length+' buckles found · ':'')+(calls.length-found)+' false calls'));
      comparison.append(p);
    }
  } else {
    const countLabel = n => n+' call'+(n===1?'':'s');
    summary.textContent = (kind==='mic'?'Last 15 seconds · ':'')+countLabel(selected.length)+' · no reference labels';
    for (const [key,name] of Object.entries(methodNames).filter(([key])=>eventsFor(key)!==null))
      comparison.append(make('p',name+' · '+countLabel(scored(key).length)));
  }
  ui.filter.disabled = !reference;
  paintEvents();
}
function paintEvents() {
  const hit = new Set(pairs.map(p=>p[1])), matchedTargets = new Set(pairs.map(p=>p[0]));
  const filter = ui.filter.value, list = el('events');
  const entries = [];
  if (filter !== 'miss') for (let j=0;j<selected.length;j++) {
    const e=selected[j], good=hit.has(j);
    if (filter === 'false' && good) continue;
    const tool=reference && !good ? reference.clutter.find(c=>Math.abs(c.time-e.time)<=.050) : null;
    const tag=reference ? (good?'Buckle found':'False call'+(tool?' · '+soundName(tool.kind):'')) : 'Detector call';
    entries.push({time:e.time,tag,style:reference?(good?'true':'false'):null});
  }
  if (reference && filter !== 'false') for (let i=0;i<reference.targets.length;i++) {
    if (!matchedTargets.has(i)) entries.push({time:reference.targets[i].time,tag:'Missed buckle',style:'missed'});
  }
  entries.sort((a,b)=>kind==='mic' ? b.time-a.time : a.time-b.time);
  list.replaceChildren();
  el('logNote').textContent = kind==='mic' ? 'Times from microphone start. Audio is discarded.' :
    reference ? 'Select a time to hear the surrounding audio.' : 'Labels are unavailable for uploaded recordings.';
  for (const entry of entries.slice(0,eventLimit)) {
    const item = make(kind==='mic'?'span':'button', entry.time.toFixed(2)+' s · '+entry.tag, entry.style);
    if (kind!=='mic') item.addEventListener('click',()=>audition(entry.time));
    list.append(item);
  }
  if (!entries.length) list.append(make('span',filter==='miss'?'No missed buckles at this setting.':
    filter==='false'?'No false calls at this setting.':'No events at this setting.'));
  ui.more.hidden=entries.length<=eventLimit;
}
function position() { return source ? Math.min(duration, Math.max(0, playbackContext.currentTime-playbackStart)) : offset; }
function paintSignal() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect(), w = Math.max(1, rect.width), h = Math.max(1, rect.height);
  if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
    canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h);
  const pad = 10, plot = Math.max(1,w-2*pad), cy = h*.47;
  const tX = t => pad+(t-viewStart)/duration*plot;
  if (ui.context.checked) for (const {start:a,end} of panel.rows) {
    const b=end??inputEnd;
    g.fillStyle = '#365348'; g.fillRect(tX(a),0,tX(b)-tX(a),h);
  }
  g.strokeStyle = '#35534c'; g.lineWidth=1;
  const axis = duration > 32 ? 6 : 5;
  for (let i=0;i<=axis;i++) {
    const x = pad+i*plot/axis; g.beginPath();g.moveTo(x,0);g.lineTo(x,h-18);g.stroke();
    g.font='10px monospace';g.fillStyle='#afc6b9';g.textAlign=i===0?'left':i===axis?'right':'center';
    g.fillText((viewStart+i*duration/axis).toFixed(duration<8?1:0)+'s',x,h-4);
  }
  const scale = Math.max(.06,envelope.reduce((m,x)=>Math.max(m,typeof x==='number'?x:x.peak),0));
  g.strokeStyle='#96d8c1';g.beginPath();g.moveTo(pad,cy);g.lineTo(w-pad,cy);g.stroke();
  g.strokeStyle='#89c6b1';g.lineWidth=Math.max(1,plot/Math.max(envelope.length,1)*.8);g.beginPath();
  for (let i=0;i<envelope.length;i++) {
    const v = envelope[i], live=typeof v!=='number';
    const x = live?tX(v.time):pad+i/Math.max(1,envelope.length-1)*plot;
    const a=Math.sqrt((live?v.peak:v)/scale)*h*.32;
    g.moveTo(x,cy-a);g.lineTo(x,cy+a);
  }
  g.stroke();
  for (const e of selected) {
    const x=tX(e.time); g.fillStyle='#ffb375';g.beginPath();g.moveTo(x,4);g.lineTo(x+4,8);g.lineTo(x,12);g.lineTo(x-4,8);g.closePath();g.fill();
  }
  if(reference) for(const e of reference.targets) {g.beginPath();g.fillStyle='#98edc7';g.arc(tX(e.time),h-24,3.5,0,2*Math.PI);g.fill();}
  const pos = kind==='mic'?inputEnd:position();
  if(pos>0) {g.strokeStyle='#ffffff';g.lineWidth=1.2;g.beginPath();g.moveTo(tX(pos),0);g.lineTo(tX(pos),h-18);g.stroke();}
  ui.seek.value = pos;
  el('clock').textContent = kind==='mic'?pos.toFixed(1)+(micSession?' s live':' s'):pos.toFixed(1)+' / '+duration.toFixed(1)+' s';
}
async function play(start = position(), stop = duration) {
  if (!audioBuffer) return;
  stopPlayback();
  const token = generation, pending = playRequest;
  try {
    playbackContext ??= new AudioContext();
    await playbackContext.resume();
    if (token!==generation || pending!==playRequest || !audioBuffer) return;
    if(start>=duration) start=0;
    const end = Math.min(duration,stop);
    if(end<=start) return;
    const node=playbackContext.createBufferSource();node.buffer=audioBuffer;
    node.connect(playbackContext.destination);source=node;offset=start;
    playbackStart=playbackContext.currentTime-start;
    node.onended=()=>{ if(source!==node)return; node.disconnect();source=null;offset=end>=duration-.015?0:end;
      cancelAnimationFrame(animation);ui.play.textContent='Play recording';el('state').textContent='Ready';paintSignal();};
    node.start(0,start,end-start);
    ui.play.textContent='Pause';el('state').textContent='Playing';
    function tick(){paintSignal();if(source===node)animation=requestAnimationFrame(tick);}
    tick();
  } catch(e) {say(e.message);}
}
function freezeCapture(time) {
  if (!micSession) return;
  inputEnd = Math.max(inputEnd,time);
  viewStart = Math.max(0,inputEnd-duration);
  stopMicrophone(); panel.markPending=false;ui.method.disabled=false;el('methodLabel').textContent='Use for next capture';
  ui.mic.textContent='New capture'; el('state').textContent='Stopped';
  say('Microphone stopped. Download the report to keep this capture.');
  refresh();
}
async function mic() {
  if (micSession) {
    ++requestId;
    const session=micSession;
    ui.mic.disabled=true; session.node.port.postMessage({mark:'stop'});
    session.stopTimer=setTimeout(()=>{if(micSession===session)freezeCapture(inputEnd);},600);
    return;
  }
  const request=++requestId;
  ui.mic.disabled=true; say('Waiting for microphone access…');
  let ctx,stream;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Error('Live capture requires HTTPS and microphone access.');
    const [m,b]=await loadProfile('station');
    if (request!==requestId) return;
    ctx=new AudioContext({sampleRate:RATE}); await ctx.resume();
    if (ctx.sampleRate!==RATE) throw Error('This browser cannot capture at 16 kHz. Open an audio file to use the detector.');
    stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    await ctx.audioWorklet.addModule('./mic-worklet.mjs');
    if (request!==requestId) {stream.getTracks().forEach(t=>t.stop());await ctx.close();return;}
    const captureMethod=ui.method.value;
    const node=new AudioWorkletNode(ctx,'latch-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],processorOptions:{model:m,method:captureMethod}});
    const input=ctx.createMediaStreamSource(stream);
    const session=beginInput('mic','mic','Live microphone');
    model=m;benchmark=b;profile='station';ready=true;activeMethod=captureMethod;ui.method.disabled=true;
    micSession={input,node,ctx,stream};
    node.port.onmessage=({data})=>{
      if (session!==generation||!micSession) return;
      if (data.mark) {
        inputEnd=Math.max(inputEnd,data.time);
        if (data.mark==='stop') freezeCapture(data.time); else panel.markAt(data.mark,data.time);
        return;
      }
      if (data.event) {
        inputEnd=Math.max(inputEnd,data.event.decision);
        raw.push(data.event);panel.collect(data.event,model);refresh();
      } else {
        inputEnd=Math.max(inputEnd,data.time);viewStart=Math.max(0,inputEnd-duration);envelope.push(data);
        while (envelope.length && envelope[0].time<viewStart) envelope.shift();
        const before=raw.length;while (raw.length && raw[0].time<viewStart)raw.shift();
        panel.tick(inputEnd);
        if (raw.length!==before) refresh();else paintSignal();
      }
    };
    for (const track of stream.getTracks()) track.addEventListener('ended',()=>{
      if (session===generation && micSession) freezeCapture(inputEnd);
    },{once:true});
    node.onprocessorerror=()=>{if(session===generation&&micSession){freezeCapture(inputEnd);say('Capture interrupted. The report contains the audio processed so far.');}};
    input.connect(node);node.connect(ctx.destination); // The worklet emits silence.
    ui.mic.textContent='Stop microphone';el('state').textContent='Listening';
    say('Station model · microphone audio is processed and discarded on this device.');
    refresh();paintBench();
  } catch(error) {
    stream?.getTracks().forEach(t=>t.stop());
    if(ctx && ctx.state!=='closed')await ctx.close().catch(()=>{});
    inputFailed(error,request);
  }
}
function addRow(body,values) {
  const row=document.createElement('tr');
  for (const value of values) row.append(make('td',value));
  body.append(row);
}
function paintBench() {
  if (!benchmark) return;
  const test=benchmark.metrics.test, front=frontendResults?.profiles[profile].test;
  const body=el('bench');body.replaceChildren();
  const rows=[
    ['Energy gate',test.gate,null],['Energy + acoustic verifier',test.verifier,front?.legacyRtf],
    ...Object.entries(methodNames).filter(([method])=>front && frontEnd(method)!=='energy')
      .map(([method,name])=>[name,front[method].sensitive,front[method].rtf])
  ];
  for (const [name,m,rtf] of rows) {
    addRow(body,[name,m.tp+' / '+(m.tp+m.fn),m.fp,(100*m.precision).toFixed(1)+'%',
      m.p95DelayMs==null?'—':m.p95DelayMs.toFixed(1)+' ms',rtf==null?'—':(1000*rtf).toFixed(2)+' ms']);
  }
  const ranked=el('ranking');ranked.replaceChildren();
  if(front) for(const key of ['verifier','coherentVerified','spectralVerified']) {
    const row=front.equalRecall[key];
    const count=point=>point?String(point.fp):'Unreachable';
    addRow(ranked,[methodNames[key],count(row['80']),count(row['90'])]);
  }
  el('benchCaption').textContent=(profile==='station'?'Station profile · a separate take of the enrolled buckle.':
    'Unseen profile · held-out buckle recordists and tools.')+' Each row uses its development-set recall setting on the same 60 test mixtures. The three verifier rows use identical classifier weights.';
  if(front){
    const base=front.energyProposals, wave=front.coherent.budget, spectral=front.spectral.budget;
    el('proposalNote').textContent='Before classification, thresholds were set to match the energy gate’s development proposal count. On test audio the energy gate covered '+base.tp+' targets in '+(base.tp+base.fp)+' proposals, the waveform match '+wave.tp+' in '+(wave.tp+wave.fp)+', and the STFT template '+spectral.tp+' in '+(spectral.tp+spectral.fp)+'. CPU time is per second of audio on the benchmark host. Delay uses the audio sample clock.';
  }
  const stepBody=el('stepBench');stepBody.replaceChildren();
  if (stepResults) {
    const s=stepResults.profiles[profile].test;
    for (const [title,k] of [['Flag the first call','firstCall'],['Flag the highest score','highestScore'],['Flag only a single call','singleCall']]) {
      const v=s[k];
      addRow(stepBody,[title,v.correctTime+' / '+s.occupied,v.wrongTime+' / '+s.occupied,v.falseOnEmpty+' / '+s.empty,
        (v.reviewOccupied+v.reviewEmpty)+' / '+s.steps]);
    }
    el('stepBenchNote').textContent='An occupied step contains a labeled buckle. A correct flag falls within 50 ms of that sound. '+
      s.outsideTargets+' labeled buckles fell outside every simulated step. All rules here use the energy gate and acoustic verifier.';
  }
  if (workshop) {
    const w=workshop.profiles[profile];
    el('fieldCheck').textContent='On a separate 52-minute workshop recording, the energy, waveform and STFT front ends plus the same verifier produced '+
      w.verifierAlarms+', '+w.templateActivations.coherentVerified.sensitive+' and '+w.templateActivations.spectralVerified.sensitive+
      ' activations respectively. Counts include all calls. The recording has no event labels.';

  }
}
ui.scene.addEventListener('change',()=>{if(titles[ui.scene.value])loadAudio(ui.scene.value);});
ui.method.addEventListener('change',selectReplayMethod);
for(const c of [ui.operating,ui.context])c.addEventListener('change',refresh);
ui.upload.addEventListener('change',()=>{const f=ui.upload.files[0];if(f)loadAudio('file',f);ui.upload.value='';});
ui.mic.addEventListener('click',mic);
ui.filter.addEventListener('change',()=>{eventLimit=12;paintEvents();});
ui.more.addEventListener('click',()=>{eventLimit+=12;paintEvents();});
ui.play.addEventListener('click',()=>{if(source){stopPlayback();paintSignal();}else play();});
function seekTo(t) {
  t=Math.max(0,Math.min(duration,t));if(source)play(t);else {offset=t;paintSignal();}
}
ui.seek.addEventListener('input',()=>seekTo(Number(ui.seek.value)));
canvas.addEventListener('click',e=>{if(!audioBuffer)return;const r=canvas.getBoundingClientRect();seekTo((e.clientX-r.left-10)/Math.max(1,r.width-20)*duration);});
new ResizeObserver(paintSignal).observe(canvas);
window.addEventListener('pagehide',()=>{requestId++;generation++;cancelScan();stopPlayback();stopMicrophone();});
Promise.all([json('./results/steps.json'),json('./results/workshop.json'),json('./results/frontends.json')]).then(([s,w,f])=>{
  stepResults=s;workshop=w;frontendResults=f;paintBench();
}).catch(()=>{el('stepBenchNote').textContent='The evaluation files could not be loaded.';});
const preset=new URLSearchParams(location.search).get('method');
if(Object.hasOwn(methodNames,preset)){ui.method.value=preset;el('method').closest('details').open=true;}
loadAudio('mixed');
