import {detect, RATE} from './detector.mjs';

const el = id => document.getElementById(id);
const controls = ['scene','method','operating','context','play','seek','mic','upload'];
const ui = Object.fromEntries(controls.map(id => [id, el(id)]));
const titles = {mixed:'Enrolled buckle + tools', tools:'Tools only', unseen:'Unseen buckle + tools'};
const modelCache = new Map();
let generation = 0, kind = 'example', model, profile = 'station', benchmark, reference;
let pcm, audioBuffer, playbackContext, source, playbackStart = 0, offset = 0;
let raw = [], selected = [], envelope = [], timestamps = [], inputEnd = 0, micSession;
let duration = 15, animation, viewStart = 0;
const canvas = el('wave');

async function json(path) {
  const r = await fetch(path);
  if (!r.ok) throw Error('Could not load ' + path);
  return r.json();
}
async function loadProfile(name) {
  if (!modelCache.has(name)) {
    const request = Promise.all([json('./results/'+name+'/model.json'), json('./results/'+name+'/benchmark.json')]);
    modelCache.set(name, request);
    request.catch(() => modelCache.delete(name));
  }
  return modelCache.get(name);
}
function say(text) { el('notice').textContent = text; }
function stopPlayback(reset = false) {
  if (source) {
    offset = Math.min(duration, Math.max(0, playbackContext.currentTime-playbackStart));
    source.onended = null;
    source.stop(); source.disconnect(); source = null;
  }
  cancelAnimationFrame(animation);
  if (reset) offset = 0;
  ui.play.textContent = '▶ Play';
  if (kind !== 'mic') el('state').textContent = 'Ready';
}
function stopMicrophone() {
  if (micSession) {
    micSession.stream?.getTracks().forEach(t => t.stop());
    micSession.node?.disconnect();
    micSession.input?.disconnect();
    micSession.ctx?.close().catch(() => {});
    micSession = null;
  }
  ui.mic.textContent = 'Use microphone';
}
function beginInput(nextKind) {
  ++generation;
  stopPlayback(true); stopMicrophone();
  kind = nextKind; raw = []; selected = []; envelope = []; timestamps = []; pcm = null;
  audioBuffer = null; reference = null; viewStart = 0; inputEnd = 0;
  duration = 15; ui.context.checked = false; ui.context.disabled = nextKind !== 'example';
  ui.play.disabled = true; ui.seek.disabled = true; ui.seek.value = 0;
  el('state').textContent = 'Loading'; el('refLegend').hidden = nextKind !== 'example';
  el('windowLegend').hidden = true;
  paintCalls(); paintSignal(); return generation;
}
function setSourceLine(value, title) {
  let custom = ui.scene.querySelector('option[data-local]');
  if (titles[value]) { custom?.remove(); ui.scene.value = value; return; }
  if (!custom) { custom = document.createElement('option'); custom.dataset.local = 'true'; ui.scene.append(custom); }
  custom.value = value; custom.textContent = title; ui.scene.value = value;
}
function formatError(error, token) {
  if (token !== generation) return;
  stopMicrophone();
  el('state').textContent = 'Unavailable';
  say(error.name === 'NotAllowedError' ? 'Microphone access was declined. You can use a recording or a local file.' : error.message);
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
  const token = beginInput(file ? 'file' : 'example');
  const localTitle = file ? file.name : titles[name];
  setSourceLine(file ? 'file' : name, localTitle);
  el('monitorTitle').textContent = localTitle;
  say('Decoding audio and running the detector locally…');
  try {
    if (file && file.size > 32*1024*1024) throw Error('Choose an audio file under 32 MB.');
    const which = name === 'unseen' ? 'unseen' : 'station';
    const data = file ? file.arrayBuffer() : fetch('./audio/'+name+'.flac').then(r => {
      if (!r.ok) throw Error('The recording is unavailable.'); return r.arrayBuffer();
    });
    const [[m, b], ref, [x, buf]] = await Promise.all([
      loadProfile(which), file ? null : json('./audio/'+name+'.json'), data.then(decode)]);
    if (token !== generation) return;
    if (x.length > RATE*120) throw Error('Choose a file of up to two minutes for this replay.');
    model = m; benchmark = b; profile = which; pcm = x; audioBuffer = buf; reference = ref;
    duration = pcm.length / RATE;
    raw = detect(pcm, model); envelope = peaks(pcm);
    ui.play.disabled = false; ui.seek.disabled = false; ui.seek.max = duration; ui.seek.value = 0;
    el('state').textContent = 'Ready';
    say(file ? 'Local file · station model. Ground-truth labels are unavailable.' :
        'Recorded buckle, tools and machinery mixed at known times. Each clip is scored in this browser.');
    refresh(); paintBench();
  } catch (e) { formatError(e, token); }
}
function liveText() { return kind === 'mic' && micSession ? 'Listening' : 'Ready'; }
function accept(e) {
  const quiet = ui.operating.value === 'quiet';
  const pass = ui.method.value === 'gate'
    ? e.gateDb >= (quiet ? model.quietGateThresholdDb : model.gateThresholdDb)
    : e.score >= (quiet ? model.quietScoreThreshold : model.scoreThreshold);
  return pass && (!reference || !ui.context.checked || reference.windows.some(([a,b]) => a <= e.time && e.time <= b));
}
function refresh() {
  selected = model ? raw.filter(accept) : [];
  const truth = reference?.targets ?? [];
  let i = 0, j = 0;
  timestamps = [];
  while (i < truth.length && j < selected.length) {
    const d = selected[j].time-truth[i].time;
    if (d < -.050) j++;
    else if (d > .050) i++;
    else { timestamps.push(j); i++; j++; }
  }
  el('windowLegend').hidden = !reference || !ui.context.checked;
  paintCalls(); paintSignal();
}
function paintCalls() {
  el('calls').textContent = String(selected.length);
  el('hits').textContent = reference ? timestamps.length+' / '+reference.targets.length : '—';
  el('extra').textContent = reference ? String(selected.length - timestamps.length) : '—';
  el('hitsLabel').textContent = 'Buckle clicks found';
  el('extraLabel').textContent = 'False alarms';
  const eventList = el('events');
  eventList.replaceChildren();
  const anchors = el('anchors'); anchors.replaceChildren();
  if (reference) {
    const exampleTool = reference.clutter.find(e => e.kind === 'ratchet') ?? reference.clutter[0];
    for (const e of [reference.targets[0], exampleTool].filter(Boolean)) {
      const button = document.createElement('button');
      button.textContent = '▶ Hear labeled '+e.kind+' · '+e.time.toFixed(2)+' s';
      button.addEventListener('click', () => play(Math.max(0, e.time-.22), Math.min(duration, e.time+.38)));
      anchors.append(button);
    }
  }
  el('inspectorHint').textContent = kind === 'mic' ? 'Showing the last 15 seconds. Microphone audio is discarded.' : 'Select a call to hear its surroundings.';
  if (!selected.length) {
    const msg = document.createElement('span'); msg.textContent = 'No detector calls at this operating point.'; eventList.append(msg);
  }
  const shown = selected.slice(-18);
  for (let k = 0; k < shown.length; k++) {
    const e = shown[k], index = selected.length - shown.length + k;
    const nearby = reference?.clutter.find(item => Math.abs(item.time-e.time) <= .050);
    let tag = reference ? (timestamps.includes(index) ? 'Buckle' : 'False alarm') : 'Call';
    if (tag === 'False alarm' && nearby) tag += ' · '+nearby.kind;
    const item = document.createElement(kind === 'mic' ? 'span' : 'button');
    item.textContent = (kind === 'mic' ? '' : '▷ ') + e.time.toFixed(2)+' s · '+tag;
    if (reference) item.className = timestamps.includes(index) ? 'true' : 'false';
    if (kind !== 'mic') item.addEventListener('click', () => play(Math.max(0, e.time-.30), Math.min(duration, e.time+.50)));
    eventList.append(item);
  }
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
  if (reference && ui.context.checked) for (const [a,b] of reference.windows) {
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
  el('clock').textContent = kind==='mic'?pos.toFixed(1)+' s live':pos.toFixed(1)+' / '+duration.toFixed(1)+' s';
}
async function play(start = position(), stop = duration) {
  if (!audioBuffer) return;
  const token = generation;
  stopPlayback();
  try {
    playbackContext ??= new AudioContext();
    await playbackContext.resume();
    if (token!==generation || !audioBuffer) return;
    stopPlayback();
    if(start>=duration-.015) start=0;
    const end = Math.min(duration,stop);
    if(end<=start) return;
    const node=playbackContext.createBufferSource();node.buffer=audioBuffer;
    node.connect(playbackContext.destination);source=node;offset=start;
    playbackStart=playbackContext.currentTime-start;
    node.onended=()=>{ if(source!==node)return; node.disconnect();source=null;offset=end>=duration-.015?0:end;
      cancelAnimationFrame(animation);ui.play.textContent='▶ Play';el('state').textContent=liveText();paintSignal();};
    node.start(0,start,end-start);
    ui.play.textContent='Ⅱ Pause';el('state').textContent='Playing';
    function tick(){paintSignal();if(source===node)animation=requestAnimationFrame(tick);}
    tick();
  } catch(e) {say(e.message);}
}
async function mic() {
  if(kind==='mic' && micSession) {loadAudio('mixed');return;}
  const token=beginInput('mic');setSourceLine('mic','Live microphone');
  el('monitorTitle').textContent='Live microphone';
  say('Waiting for microphone access…');
  let ctx,stream;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Error('Live capture requires HTTPS and microphone access.');
    const [m,b] = await loadProfile('station');
    if(token!==generation)return;
    ctx=new AudioContext({sampleRate:RATE});
    await ctx.resume();
    if(ctx.sampleRate!==RATE)throw Error('This browser cannot open a 16 kHz microphone context. Open a local audio file instead.');
    stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    await ctx.audioWorklet.addModule('./mic-worklet.mjs');
    if(token!==generation){stream.getTracks().forEach(t=>t.stop());await ctx.close();return;}
    model=m;benchmark=b;profile='station';
    const node=new AudioWorkletNode(ctx,'latch-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],processorOptions:{model}});
    const input=ctx.createMediaStreamSource(stream);
    input.connect(node);node.connect(ctx.destination); // Worklet outputs silence.
    micSession={input,node,ctx,stream};
    node.port.onmessage=({data})=>{
      if(token!==generation)return;
      let expired = false;
      if(data.event) raw.push(data.event);
      else {inputEnd=data.time;viewStart=Math.max(0,inputEnd-15);envelope.push(data);
        while(envelope.length && envelope[0].time<viewStart)envelope.shift();
        while(raw.length && raw[0].time<viewStart){raw.shift();expired=true;}}
      if(data.event || expired) refresh(); else paintSignal();
    };
    ui.mic.textContent='Stop microphone';el('state').textContent='Listening';say('Station model · rolling 15-second view. Live input stays on this device.');
    refresh();paintBench();
  } catch(e) {
    stream?.getTracks().forEach(t=>t.stop());
    if(ctx && ctx.state!=='closed')await ctx.close().catch(()=>{});
    formatError(e,token);
  }
}
function paintBench() {
  if(!benchmark)return;
  const test=benchmark.metrics.test, rows=[['Gate only','gate'],['Acoustic verifier','verifier'],['Verifier + simulated steps','withStepWindows'],['Verifier · limit false alarms','strictVerifier']];
  const body=el('bench');body.replaceChildren();
  for(const [name,k] of rows) {
    const m=test[k], tr=document.createElement('tr');
    for(const value of [name,m.tp+' / '+(m.tp+m.fn),m.fp,(100*m.precision).toFixed(1)+'%',m.p95DelayMs==null?'—':m.p95DelayMs.toFixed(1)+' ms']) {
      const cell=document.createElement('td');cell.textContent=value;tr.append(cell);
    }
    body.append(tr);
  }
  el('benchCaption').textContent=(profile==='station'?'Station profile · separate takes of the same published buckle series.':'Unseen-buckle profile · test recordists are held out.')+
    ' Delay is measured on the audio sample clock. The strict setting allows at most one false alarm on the validation split.';
  el('fieldCheck').textContent='On a separate 52-minute workshop recording, the gate and verifier produced '+
    (profile==='station'?'414 and 231':'387 and 474')+' calls, respectively. The recording has no annotated buckle events.';
}
ui.scene.addEventListener('change',()=>{if(titles[ui.scene.value])loadAudio(ui.scene.value);});
for(const c of [ui.method,ui.operating,ui.context])c.addEventListener('change',refresh);
ui.upload.addEventListener('change',()=>{const f=ui.upload.files[0];if(f)loadAudio('file',f);ui.upload.value='';});
ui.mic.addEventListener('click',mic);
ui.play.addEventListener('click',()=>{if(source){stopPlayback();paintSignal();}else play();});
function seekTo(t) {
  t=Math.max(0,Math.min(duration,t));if(source)play(t);else {offset=t;paintSignal();}
}
ui.seek.addEventListener('input',()=>seekTo(Number(ui.seek.value)));
canvas.addEventListener('click',e=>{if(!audioBuffer)return;const r=canvas.getBoundingClientRect();seekTo((e.clientX-r.left-10)/Math.max(1,r.width-20)*duration);});
new ResizeObserver(paintSignal).observe(canvas);
window.addEventListener('pagehide',()=>{generation++;stopPlayback();stopMicrophone();});
loadAudio('mixed');
