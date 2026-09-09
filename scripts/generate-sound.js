const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, '../public/sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Generate a simple PCM WAV file with a pleasant 2-note chime (E5 -> A5)
function generateChimeWav() {
  const sampleRate = 44100;
  const duration = 0.8; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Note 1: E5 (659.25 Hz) for first 0.3s, Note 2: A5 (880 Hz) for rest
    const freq = t < 0.3 ? 659.25 : 880.0;
    const envelope = Math.exp(-t * 4); // exponential decay
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
    const intSample = Math.floor(sample * 32767);
    data.writeInt16LE(intSample, i * 2);
  }

  // Create WAV header
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // subchunk1 size
  header.writeUInt16LE(1, 20);  // PCM
  header.writeUInt16LE(1, 22);  // Mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32);  // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  const wavBuffer = Buffer.concat([header, data]);
  fs.writeFileSync(path.join(soundsDir, 'notification.wav'), wavBuffer);
  fs.writeFileSync(path.join(soundsDir, 'notification.mp3'), wavBuffer);
  console.log('Chime sound generated successfully in public/sounds/notification.mp3');
}

generateChimeWav();

