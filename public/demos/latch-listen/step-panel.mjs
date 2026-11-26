import {addCandidate, assessStep, parseWindows, qualifies, resolveStep, stepLabel} from './review.mjs';
import {MAX_DECISION_SECONDS, RATE} from './detector.mjs';

const el=id=>document.getElementById(id);
const modes=['gate','verifier'].flatMap(m=>['sensitive','quiet'].map(o=>[m,o]));
const blankCounts=()=>Object.fromEntries(modes.map(([m,o])=>[m+'/'+o,{count:0,best:null}]));

export class StepPanel {
  constructor({state,play,mark,changed}) {
    this.state=state;this.play=play;this.mark=mark;this.changed=changed;
    this.reset();
    el('addStep').addEventListener('submit',e=>{
      e.preventDefault();
      try {
        const interval=[el('from').valueAsNumber,el('to').valueAsNumber];
        const pairs=this.rows.map(r=>[r.start,r.end]).concat([interval]).sort((l,r)=>l[0]-r[0]);
        this.setWindows(parseWindows({windows:pairs},this.state().through),this.origin && this.origin!=='manual'?'edited':'manual');
        el('from').value='';el('to').value='';
      }catch(err){el('stepMessage').textContent=err.message;}
    });
    el('windowFile').addEventListener('change',async e=>{
      const file=e.target.files[0], session=this.state().session;e.target.value='';if(!file)return;
      try {
        if(file.size>512000)throw Error('Choose a timing JSON smaller than 500 KB.');
        let data;try{data=JSON.parse(await file.text());}catch{throw Error('The timing file must contain valid JSON.');}
        if(session===this.state().session)this.setWindows(parseWindows(data,this.state().through),'imported');
      }catch(err){if(session===this.state().session)el('stepMessage').textContent=err.message;}
    });
    el('mark').addEventListener('click',()=>{
      if(this.markPending||!this.state().live)return;
      this.markPending=true;el('mark').disabled=true;
      this.mark(this.rows.at(-1)?.end===null?'end':'start');
    });
    el('rule').addEventListener('change',()=>this.render());
    el('export').addEventListener('click',()=>this.download());
  }
  reset(windows=null) {
    this.rows=(windows??[]).map(([start,end])=>({start,end}));
    this.origin=windows?'simulated':null;this.dropped=0;this.markPending=false;this.deadline=null;
    el('stepMessage').textContent='';el('from').value='';el('to').value='';
  }
  setWindows(pairs,source) {
    this.rows=pairs.map(([start,end])=>({start,end}));this.origin=source;
    el('stepMessage').textContent='';this.changed();
  }
  contains(t){return this.rows.some(r=>r.start<=t && (r.end===null||t<r.end));}
  markAt(mark,t) {
    this.markPending=false;
    if(mark==='start'&&this.rows.at(-1)?.end!==null){
      if(this.rows.length===100){this.rows.shift();this.dropped++;}
      this.rows.push({start:t,end:null,counts:blankCounts()});this.origin='microphone marker';
    }else if(mark==='end'&&this.rows.at(-1)?.end===null){
      this.rows.at(-1).end=t;this.deadline=t+MAX_DECISION_SECONDS;
    }
    this.changed();
  }
  collect(event,model) {
    for(const r of this.rows){
      if(!r.counts||event.time<r.start||(r.end!==null&&event.time>=r.end))continue;
      for(const [method,op] of modes)if(qualifies(event,model,method,op)){
        addCandidate(r.counts[method+'/'+op],event,method);
      }
    }
  }
  tick(t){if(this.deadline!==null&&t>=this.deadline){this.deadline=null;this.render();}}
  decisions() {
    const s=this.state(), calls=s.model?s.raw.filter(e=>qualifies(e,s.model,s.method,s.operating)):[];
    const options={finished:!s.live,rule:el('rule').value,method:s.method};
    return this.rows.map(r=>r.counts?resolveStep(r.start,r.end,r.counts[s.method+'/'+s.operating],s.through,options)
      :assessStep(r.start,r.end,calls,s.through,options));
  }
  render() {
    const s=this.state(),isFile=s.kind==='file',isMic=s.kind==='mic';
    el('rule').disabled=!s.ready;el('fileControls').hidden=!isFile||!s.ready;el('mark').hidden=!s.live;el('export').disabled=!s.ready;
    el('mark').disabled=this.markPending;el('mark').textContent=this.rows.at(-1)?.end===null?'End step':'Start step';
    const intro=el('stepIntro');
    if(!s.ready)intro.textContent='';
    else if(isFile)intro.textContent='Mark the time span of an assembly attempt or import controller times. Each step expects one click.';
    else if(isMic)intro.textContent=s.live?'Mark the start and end of an attempt on the microphone clock.':'Capture stopped. Your marked steps and the last 15 seconds of calls are available for export.';
    else intro.textContent='These simulated controller intervals each expect one buckle. Compare the flagged time with the labeled buckle, or listen to the whole step.';
    const list=el('stepRows');list.replaceChildren();
    const results=this.decisions().map((r,i)=>[r,i]);if(isMic)results.reverse();
    for(const [r,i] of results){
      const row=document.createElement('div');row.className='stepRow';
      const timing=document.createElement('span');timing.className='stepTime';
      timing.textContent='Step '+(this.dropped+i+1)+' · '+r.start.toFixed(2)+'–'+(r.end===null?'…':r.end.toFixed(2))+' s';
      const verdict=document.createElement('strong');verdict.className=r.event?'one':'review';verdict.textContent=stepLabel[r.reason];
      const info=document.createElement('small');
      if(r.event && !isMic) {
        const flag=document.createElement('button');
        flag.className='hearFlag';flag.textContent='Flag at '+r.event.time.toFixed(2)+' s';
        flag.setAttribute('aria-label','Hear flagged sound for step '+(i+1));
        flag.onclick=()=>this.play(Math.max(0,r.event.time-.22),Math.min(s.through,r.event.time+.30));
        if(r.count>1)info.append(r.count+' calls · ');
        info.append(flag);
      } else if(r.event) {
        info.textContent='Flag at '+r.event.time.toFixed(2)+' s';
      } else {
        info.textContent=r.count+' call'+(r.count===1?'':'s');
      }
      if(s.reference) {
        const truth=s.reference.targets.filter(t=>r.start<=t.time&&t.time<r.end);
        info.append(' · '+(truth.length?'Label at '+truth.map(t=>t.time.toFixed(2)+' s').join(', '):'No labeled buckle'));
      }
      row.append(timing,verdict,info);
      if(!isMic){
        const button=document.createElement('button');button.className='light compact';button.textContent='Hear step';
        button.setAttribute('aria-label','Hear step '+(i+1));button.onclick=()=>this.play(r.start,r.end);row.append(button);
      }
      if(isFile){
        const del=document.createElement('button');del.className='plain';del.textContent='Remove';
        del.setAttribute('aria-label','Remove step '+(i+1));del.onclick=()=>{this.rows.splice(i,1);this.origin='edited';this.changed();};row.append(del);
      }
      list.append(row);
    }
  }
  download() {
    const s=this.state();if(!s.ready||!s.model)return;
    const quiet=s.operating==='quiet',m=s.model;
    const report={schema:1,recording:s.label,input:s.kind,profile:s.profile,sampleRate:RATE,timeUnit:'seconds from first audio sample',
      audioThrough:s.through,eventHistoryFrom:s.kind==='mic'?s.viewStart:0,olderStepsDiscarded:this.dropped,
      method:s.method,operatingPoint:s.operating,threshold:s.method==='gate'?(quiet?m.quietGateThresholdDb:m.gateThresholdDb):(quiet?m.quietScoreThreshold:m.scoreThreshold),
      displayLimitedToSteps:s.onlyInside,stepSource:this.origin,rule:el('rule').value,tailWaitSeconds:MAX_DECISION_SECONDS,
      events:s.raw.map(e=>({...e,aboveThreshold:qualifies(e,m,s.method,s.operating),inMarkedStep:this.contains(e.time)})),
      steps:this.decisions(),referenceTargets:s.reference?.targets??null};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='latch-listen-review.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
}
