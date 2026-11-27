import {Detector, RATE} from './detector.mjs';
import {TemplateDetector} from './spectral.mjs';
import {TemplateVerifier} from './template-verifier.mjs';
import {frontEnd} from './review.mjs';

class LatchCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    if (sampleRate !== RATE) throw Error('Capture requires a 16 kHz audio context');
    const {model,method='verifier'}=options.processorOptions;
    const family=frontEnd(method);
    if(family==='energy') this.detector=new Detector(model);
    else if(method.endsWith('Verified')) this.detector=new TemplateVerifier(model.templates,family,model);
    else this.detector=new TemplateDetector(model.templates,family);
    this.at = 0; this.peak = 0; this.counter = 0;

    this.stopped = false;
    this.port.onmessage = ({data}) => {
      if (this.stopped || !['start','end','stop'].includes(data?.mark)) return;
      if (data.mark === 'stop') this.stopped = true;
      this.port.postMessage({mark:data.mark, time:this.at / RATE});
    };
  }
  process(inputs) {
    if (this.stopped) return false;
    const x = inputs[0]?.[0];
    if (!x) return true;
    this.detector.push(x, event => this.port.postMessage({event}));
    for (const v of x) this.peak = Math.max(this.peak, Math.abs(v));
    this.at += x.length; this.counter += x.length;
    if (this.counter >= RATE / 25) {
      this.port.postMessage({time: this.at / RATE, peak: this.peak});
      this.counter = 0; this.peak = 0;
    }
    return true;
  }
}
registerProcessor('latch-capture', LatchCapture);
