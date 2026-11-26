// Consume raw mono s16le PCM at 16 kHz from stdin, including partial byte chunks.
import fs from 'node:fs';
import {Detector, RATE} from '../detector.mjs';
const [path, mode] = process.argv.slice(2);
if (!path) throw Error('Usage: node lab/monitor.mjs model.json [--summary] < audio.s16le');
const model = JSON.parse(fs.readFileSync(path));
const detector = new Detector(model);
let count = 0, accepted = 0, strict = 0, baseline = 0, carry = null;
for await (const piece of process.stdin) {
  const bytes = carry === null ? piece : Buffer.concat([carry, piece]);
  const size = bytes.length - bytes.length % 2;
  carry = size === bytes.length ? null : bytes.subarray(size);
  const samples = new Float32Array(size / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = bytes.readInt16LE(2*i) / 32768;
  count += samples.length;
  detector.push(samples, e => {
    if (e.gateDb >= model.gateThresholdDb) baseline++;
    if (e.score >= model.quietScoreThreshold) strict++;
    if (e.score >= model.scoreThreshold) {
      accepted++;
      if (mode !== '--summary') process.stdout.write(JSON.stringify(e)+'\n');
    }
  });
}
if (carry !== null) throw Error('Incomplete int16 PCM sample');
const seconds = count/RATE;
if (mode === '--summary') console.log(JSON.stringify({seconds, proposals:detector.candidates,
  gateAlarms:baseline, verifierAlarms:accepted, strictAlarms:strict,
  verifierAlarmsPerHour:seconds ? accepted*3600/seconds : null}, null, 2));
