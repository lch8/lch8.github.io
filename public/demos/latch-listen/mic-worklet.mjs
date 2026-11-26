import {Detector, RATE} from './detector.mjs';

class LatchCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    if (sampleRate !== RATE) throw Error('Capture requires a 16 kHz audio context');
    this.detector = new Detector(options.processorOptions.model);
    this.at = 0; this.peak = 0; this.counter = 0;
  }
  process(inputs) {
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
