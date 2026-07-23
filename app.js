const NOTES = [
  { name: 'Do', pitch: 'C', semitone: 0, color: '#ff7548' },
  { name: 'Re', pitch: 'D', semitone: 2, color: '#f6cb57' },
  { name: 'Mi', pitch: 'E', semitone: 4, color: '#78d889' },
  { name: 'Fa', pitch: 'F', semitone: 5, color: '#5de0d3' },
  { name: 'Sol', pitch: 'G', semitone: 7, color: '#7299f7' },
  { name: 'La', pitch: 'A', semitone: 9, color: '#ed74a9' },
  { name: 'Si', pitch: 'B', semitone: 11, color: '#dfff54' },
];

const STEPS = 16;
const keyboardMap = { a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6 };
const sequence = Array.from({ length: NOTES.length }, () => Array(STEPS).fill(false));

let audioContext;
let masterGain;
let analyser;
let isPlaying = false;
let currentStep = -1;
let timerId = null;
let nextNoteTime = 0;
let visualizerStarted = false;

const waveformSelect = document.querySelector('#waveform');
const octaveSelect = document.querySelector('#octave');
const tempoInput = document.querySelector('#tempo');
const tempoValue = document.querySelector('#tempoValue');
const playButton = document.querySelector('#playButton');
const playLabel = document.querySelector('#playLabel');
const sequencer = document.querySelector('#sequencer');
const status = document.querySelector('.status');
const audioStatus = document.querySelector('#audioStatus');
const soundOrb = document.querySelector('#soundOrb');
const toast = document.querySelector('#toast');

function noteFrequency(noteIndex, octave = Number(octaveSelect.value)) {
  const midi = 12 * (octave + 1) + NOTES[noteIndex].semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    masterGain.gain.value = 0.68;
    masterGain.connect(analyser);
    analyser.connect(audioContext.destination);
    startVisualizer();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  status.classList.add('awake');
  audioStatus.textContent = '声音已就绪';
}

function scheduleBasicTone(noteIndex, startTime, duration, destination, context) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const attack = 0.012;
  const release = Math.min(0.22, duration * 0.55);

  oscillator.type = waveformSelect.value;
  oscillator.frequency.setValueAtTime(noteFrequency(noteIndex), startTime);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(waveformSelect.value === 'sawtooth' ? 2200 : 3200, startTime);
  filter.Q.value = 1.2;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.32, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + release);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + release + 0.03);
  return oscillator;
}

function schedulePianoTone(noteIndex, startTime, duration, destination, context) {
  const frequency = noteFrequency(noteIndex);
  const tail = Math.max(1.25, duration + 0.9);
  const filter = context.createBiquadFilter();
  const body = context.createGain();
  const partials = [
    { ratio: 1, level: 0.34 },
    { ratio: 2.003, level: 0.13 },
    { ratio: 3.01, level: 0.065 },
    { ratio: 4.04, level: 0.032 },
    { ratio: 5.08, level: 0.015 },
  ];

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(9000, 3600 + frequency * 7), startTime);
  filter.Q.value = 0.7;
  body.gain.value = 0.9;
  filter.connect(body);
  body.connect(destination);

  partials.forEach(({ ratio, level }, partialIndex) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const partialTail = tail / (1 + partialIndex * 0.18);

    oscillator.type = partialIndex === 0 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency * ratio, startTime);
    oscillator.detune.value = partialIndex % 2 === 0 ? -1.5 : 1.5;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(level, startTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(level * 0.38, startTime + 0.11);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + partialTail);
    oscillator.connect(gain);
    gain.connect(filter);
    oscillator.start(startTime);
    oscillator.stop(startTime + partialTail + 0.04);
  });

  // A short filtered noise burst supplies the felt-hammer attack.
  const noiseLength = Math.max(1, Math.floor(context.sampleRate * 0.035));
  const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseLength; index += 1) noiseData[index] = Math.random() * 2 - 1;
  const hammer = context.createBufferSource();
  const hammerFilter = context.createBiquadFilter();
  const hammerGain = context.createGain();
  hammer.buffer = noiseBuffer;
  hammerFilter.type = 'bandpass';
  hammerFilter.frequency.value = Math.min(6200, Math.max(1400, frequency * 9));
  hammerFilter.Q.value = 0.9;
  hammerGain.gain.setValueAtTime(0.0001, startTime);
  hammerGain.gain.exponentialRampToValueAtTime(0.026, startTime + 0.002);
  hammerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);
  hammer.connect(hammerFilter);
  hammerFilter.connect(hammerGain);
  hammerGain.connect(destination);
  hammer.start(startTime);
  hammer.stop(startTime + 0.04);
}

function scheduleElectricPianoTone(noteIndex, startTime, duration, destination, context) {
  const frequency = noteFrequency(noteIndex);
  const tail = Math.max(1.05, duration + 0.7);
  const carrier = context.createOscillator();
  const modulator = context.createOscillator();
  const modulation = context.createGain();
  const carrierGain = context.createGain();
  const bell = context.createOscillator();
  const bellGain = context.createGain();
  const filter = context.createBiquadFilter();

  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(frequency, startTime);
  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(frequency * 2, startTime);
  modulation.gain.setValueAtTime(frequency * 2.1, startTime);
  modulation.gain.exponentialRampToValueAtTime(frequency * 0.12, startTime + 0.28);
  modulation.gain.exponentialRampToValueAtTime(0.01, startTime + tail);
  modulator.connect(modulation);
  modulation.connect(carrier.frequency);

  carrierGain.gain.setValueAtTime(0.0001, startTime);
  carrierGain.gain.exponentialRampToValueAtTime(0.36, startTime + 0.006);
  carrierGain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.22);
  carrierGain.gain.exponentialRampToValueAtTime(0.0001, startTime + tail);
  carrier.connect(carrierGain);
  carrierGain.connect(filter);

  bell.type = 'sine';
  bell.frequency.setValueAtTime(frequency * 4.01, startTime);
  bellGain.gain.setValueAtTime(0.0001, startTime);
  bellGain.gain.exponentialRampToValueAtTime(0.055, startTime + 0.003);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38);
  bell.connect(bellGain);
  bellGain.connect(filter);

  filter.type = 'lowpass';
  filter.frequency.value = 5200;
  filter.Q.value = 0.6;
  filter.connect(destination);
  [carrier, modulator, bell].forEach((oscillator) => oscillator.start(startTime));
  carrier.stop(startTime + tail + 0.04);
  modulator.stop(startTime + tail + 0.04);
  bell.stop(startTime + 0.42);
}

function scheduleTone(noteIndex, startTime, duration = 0.38, destination = masterGain, context = audioContext) {
  if (waveformSelect.value === 'piano') {
    schedulePianoTone(noteIndex, startTime, duration, destination, context);
    return;
  }
  if (waveformSelect.value === 'epiano') {
    scheduleElectricPianoTone(noteIndex, startTime, duration, destination, context);
    return;
  }
  scheduleBasicTone(noteIndex, startTime, duration, destination, context);
}

function playNote(noteIndex, duration = 0.4) {
  ensureAudio();
  scheduleTone(noteIndex, audioContext.currentTime, duration);
  animateKey(noteIndex);
}

function animateKey(noteIndex, delay = 0) {
  window.setTimeout(() => {
    const key = document.querySelector(`.note-key[data-index="${noteIndex}"]`);
    key.classList.add('active');
    soundOrb.classList.add('playing');
    window.setTimeout(() => {
      key.classList.remove('active');
      soundOrb.classList.remove('playing');
    }, 180);
  }, delay);
}

document.querySelectorAll('.note-key').forEach((key) => {
  key.addEventListener('pointerdown', () => playNote(Number(key.dataset.index)));
});

window.addEventListener('keydown', (event) => {
  if (event.repeat || event.target.matches('input, select, button')) return;
  const noteIndex = keyboardMap[event.key.toLowerCase()];
  if (noteIndex !== undefined) playNote(noteIndex);
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlayback();
  }
});

function renderSequencer() {
  sequencer.innerHTML = '';
  for (let noteIndex = NOTES.length - 1; noteIndex >= 0; noteIndex -= 1) {
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = NOTES[noteIndex].name;
    label.style.color = NOTES[noteIndex].color;
    sequencer.append(label);

    for (let stepIndex = 0; stepIndex < STEPS; stepIndex += 1) {
      const button = document.createElement('button');
      button.className = 'step';
      button.type = 'button';
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${NOTES[noteIndex].name}，第 ${stepIndex + 1} 拍`);
      button.setAttribute('aria-pressed', String(sequence[noteIndex][stepIndex]));
      button.dataset.note = noteIndex;
      button.dataset.step = stepIndex;
      button.style.setProperty('--note-color', NOTES[noteIndex].color);
      if (sequence[noteIndex][stepIndex]) button.classList.add('active');
      if (stepIndex === currentStep) button.classList.add('current');
      button.addEventListener('click', () => {
        sequence[noteIndex][stepIndex] = !sequence[noteIndex][stepIndex];
        button.classList.toggle('active');
        button.setAttribute('aria-pressed', String(sequence[noteIndex][stepIndex]));
        if (sequence[noteIndex][stepIndex]) playNote(noteIndex, 0.22);
      });
      sequencer.append(button);
    }
  }
}

function secondsPerStep() {
  return 60 / Number(tempoInput.value) / 2;
}

function scheduler() {
  while (nextNoteTime < audioContext.currentTime + 0.1) {
    currentStep = (currentStep + 1) % STEPS;
    const scheduledStep = currentStep;
    const visualDelay = Math.max(0, (nextNoteTime - audioContext.currentTime) * 1000);

    NOTES.forEach((_, noteIndex) => {
      if (sequence[noteIndex][scheduledStep]) {
        scheduleTone(noteIndex, nextNoteTime, Math.max(0.12, secondsPerStep() * 0.72));
        animateKey(noteIndex, visualDelay);
      }
    });

    window.setTimeout(() => highlightStep(scheduledStep), visualDelay);
    nextNoteTime += secondsPerStep();
  }
}

function highlightStep(stepIndex) {
  if (!isPlaying && stepIndex !== -1) return;
  document.querySelectorAll('.step.current').forEach((step) => step.classList.remove('current'));
  if (stepIndex >= 0) document.querySelectorAll(`.step[data-step="${stepIndex}"]`).forEach((step) => step.classList.add('current'));
}

function startPlayback() {
  ensureAudio();
  isPlaying = true;
  currentStep = -1;
  nextNoteTime = audioContext.currentTime + 0.06;
  scheduler();
  timerId = window.setInterval(scheduler, 25);
  playButton.classList.add('is-playing');
  playLabel.textContent = '停止';
  audioStatus.textContent = '正在循环播放';
}

function stopPlayback() {
  isPlaying = false;
  window.clearInterval(timerId);
  timerId = null;
  currentStep = -1;
  highlightStep(-1);
  playButton.classList.remove('is-playing');
  playLabel.textContent = '播放';
  audioStatus.textContent = '声音已就绪';
}

function togglePlayback() {
  if (isPlaying) stopPlayback(); else startPlayback();
}

playButton.addEventListener('click', togglePlayback);
tempoInput.addEventListener('input', () => { tempoValue.value = tempoInput.value; });

const demoPattern = [
  [0, 4, 8, 12],
  [2, 10],
  [6, 14],
  [5, 13],
  [1, 3, 9, 11],
  [7],
  [15],
];

function clearSequence(render = true) {
  sequence.forEach((row) => row.fill(false));
  if (render) renderSequencer();
}

document.querySelector('#demoButton').addEventListener('click', () => {
  clearSequence(false);
  demoPattern.forEach((steps, noteIndex) => steps.forEach((step) => { sequence[noteIndex][step] = true; }));
  renderSequencer();
  showToast('示例旋律已装入');
});

document.querySelector('#randomButton').addEventListener('click', () => {
  clearSequence(false);
  for (let step = 0; step < STEPS; step += 1) {
    if (Math.random() > 0.22) sequence[Math.floor(Math.random() * NOTES.length)][step] = true;
    if (Math.random() > 0.82) sequence[Math.floor(Math.random() * NOTES.length)][step] = true;
  }
  renderSequencer();
  showToast('新灵感已生成');
});

document.querySelector('#clearButton').addEventListener('click', () => {
  clearSequence();
  showToast('旋律已清空');
});

function startVisualizer() {
  if (visualizerStarted) return;
  visualizerStarted = true;
  const canvas = document.querySelector('#visualizer');
  const context = canvas.getContext('2d');
  const data = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    const scale = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    if (canvas.width !== size * scale) {
      canvas.width = size * scale;
      canvas.height = size * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
    }
    analyser.getByteTimeDomainData(data);
    context.clearRect(0, 0, size, size);
    context.beginPath();
    context.strokeStyle = '#dfff54';
    context.lineWidth = 1.5;
    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * size;
      const y = size / 2 + ((value - 128) / 128) * 48;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.stroke();
    requestAnimationFrame(draw);
  }
  draw();
}

function encodeWav(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;
  const buffer = new ArrayBuffer(44 + samples * channels * 2);
  const view = new DataView(buffer);
  const writeString = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * channels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * channels * 2, true);

  let offset = 44;
  for (let sample = 0; sample < samples; sample += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const value = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[sample]));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function exportWav() {
  const exportButton = document.querySelector('#exportButton');
  const activeNotes = sequence.flat().filter(Boolean).length;
  if (!activeNotes) {
    showToast('先点亮几个音符吧');
    return;
  }

  exportButton.disabled = true;
  exportButton.querySelector('span').textContent = '正在生成…';
  try {
    const stepDuration = secondsPerStep();
    const instrumentTail = waveformSelect.value === 'piano' ? 1.6 : waveformSelect.value === 'epiano' ? 1.25 : 0.6;
    const totalDuration = stepDuration * STEPS + instrumentTail;
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
    const destination = offline.createGain();
    destination.gain.value = 0.72;
    destination.connect(offline.destination);

    for (let step = 0; step < STEPS; step += 1) {
      for (let note = 0; note < NOTES.length; note += 1) {
        if (sequence[note][step]) scheduleTone(note, step * stepDuration, stepDuration * 0.72, destination, offline);
      }
    }

    const rendered = await offline.startRendering();
    const url = URL.createObjectURL(encodeWav(rendered));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `七音旋律-${new Date().toISOString().slice(0, 10)}.wav`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('WAV 已导出');
  } catch (error) {
    console.error(error);
    showToast('导出失败，请再试一次');
  } finally {
    exportButton.disabled = false;
    exportButton.querySelector('span').textContent = '导出 WAV';
  }
}

document.querySelector('#exportButton').addEventListener('click', exportWav);

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1900);
}

renderSequencer();
