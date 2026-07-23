import fs from "node:fs";
import path from "node:path";

const sampleRate = 22050;
const duration = 24;
const samples = new Float64Array(sampleRate * duration);
const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 64]];
const melody = [0, 2, 1, 3, 2, 1, 0, 2];
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
let seed = 24681357;
const random = () => ((seed = seed * 1664525 + 1013904223 >>> 0) / 2 ** 32) * 2 - 1;

function addTone(start, length, hz, gain, decay, harmonic = .16) {
  const first = Math.max(0, Math.floor(start * sampleRate));
  const last = Math.min(samples.length, Math.floor((start + length) * sampleRate));
  for (let i = first; i < last; i += 1) {
    const t = i / sampleRate - start;
    const attack = Math.min(1, t / .025);
    const envelope = attack * Math.exp(-t * decay);
    samples[i] += gain * envelope * (Math.sin(2 * Math.PI * hz * t) + harmonic * Math.sin(4 * Math.PI * hz * t));
  }
}

for (let bar = 0; bar < 4; bar += 1) {
  const chord = chords[bar];
  const start = bar * 6;
  for (const note of chord) addTone(start, 6.1, frequency(note), .026, .08, .08);
  for (let beat = 0; beat < 8; beat += 1) {
    addTone(start + beat * .75, 1.2, frequency(chord[melody[beat]] + 12), .085, 3.2, .2);
    if (beat % 2 === 0) addTone(start + beat * .75, 1.4, frequency(chord[0] - 12), .09, 2.4, .08);
  }
}

for (let step = 0; step < duration / .375; step += 1) {
  const start = step * .375;
  const first = Math.floor(start * sampleRate);
  const last = Math.min(samples.length, first + Math.floor(.055 * sampleRate));
  for (let i = first; i < last; i += 1) {
    const t = (i - first) / sampleRate;
    samples[i] += random() * .018 * Math.exp(-t * 48);
  }
}

const fade = Math.floor(sampleRate * .35);
let peak = 0;
for (let i = 0; i < samples.length; i += 1) {
  const edge = Math.min(1, i / fade, (samples.length - 1 - i) / fade);
  samples[i] *= edge;
  peak = Math.max(peak, Math.abs(samples[i]));
}

const dataSize = samples.length * 2;
const wav = Buffer.alloc(44 + dataSize);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + dataSize, 4); wav.write("WAVE", 8);
wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(dataSize, 40);
for (let i = 0; i < samples.length; i += 1) wav.writeInt16LE(Math.round(samples[i] / Math.max(peak, 1) * 25000), 44 + i * 2);

const output = path.resolve("public/assets/audio/bgm-table.wav");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, wav);
console.log(output);
