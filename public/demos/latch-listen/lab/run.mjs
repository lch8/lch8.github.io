// Input for each record is mono, little-endian int16 PCM at 16 kHz.
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {Detector, RATE} from '../detector.mjs';

const [manifest, modelFile, mode = 'scores'] = process.argv.slice(2);
if (!manifest || !modelFile) throw Error('Usage: node lab/run.mjs manifest.json model.json|- [features|scores]');
const model = modelFile === '-' ? null : JSON.parse(fs.readFileSync(modelFile, 'utf8'));
for (const row of JSON.parse(fs.readFileSync(manifest, 'utf8'))) {
  const raw = fs.readFileSync(row.path);
  const samples = Float32Array.from(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), n => n / 32768);
  const stream = new Detector(model, mode === 'features'), events = [];
  const start = performance.now();
  for (let i = 0; i < samples.length; i += 256)
    stream.push(samples.subarray(i, i + 256), e => events.push(e));
  const computeMs = performance.now() - start;
  process.stdout.write(JSON.stringify({id: row.id, duration: samples.length / RATE, computeMs, events}) + '\n');
}
