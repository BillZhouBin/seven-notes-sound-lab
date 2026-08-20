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

function parseScore(source) {
  let measure = 0;
  const events = [];
  source.trim().split(/\s+/).forEach((token) => {
    if (token === '|') {
      measure += 1;
      return;
    }
    const match = token.match(/^([0-7])([+-]?)(?:\/([\d.]+))?$/);
    if (!match) return;
    const degree = Number(match[1]);
    events.push({
      note: degree === 0 ? null : degree - 1,
      degree,
      octave: match[2] === '+' ? 1 : match[2] === '-' ? -1 : 0,
      beats: Number(match[3] || 1),
      measure,
    });
  });
  return events.map((event, index) => ({
    ...event,
    measureEnd: index === events.length - 1 || events[index + 1].measure !== event.measure,
  }));
}

function parseUserScore(source) {
  const tokens = source.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) throw new Error('请至少写一个音符。');
  let noteCount = 0;
  tokens.forEach((token) => {
    if (token === '|') return;
    const match = token.match(/^([0-7])([+-]?)(?:\/([\d.]+))?$/);
    if (!match) throw new Error(`“${token}”看不懂，请检查简谱格式。`);
    const beats = Number(match[3] || 1);
    if (!Number.isFinite(beats) || beats <= 0 || beats > 8) throw new Error(`“${token}”的拍数需要在 0 到 8 之间。`);
    noteCount += 1;
  });
  if (!noteCount) throw new Error('小节线“|”之间还需要有音符。');
  if (noteCount > 180) throw new Error('一首曲目最多支持 180 个音符。');
  return parseScore(source);
}

const CUSTOM_SONGS_KEY = 'seven-notes-custom-songs-v1';
const CUSTOM_SONG_COLORS = ['#ff7548', '#f6cb57', '#78d889', '#5de0d3', '#7299f7', '#ed74a9', '#dfff54'];

function loadCustomSongs() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_SONGS_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.map((song, index) => {
      if (!song || typeof song.title !== 'string' || typeof song.scoreSource !== 'string') return null;
      const title = song.title.trim().slice(0, 30);
      if (!title) return null;
      return {
        id: typeof song.id === 'string' ? song.id : `custom-${Date.now()}-${index}`,
        title,
        subtitle: '我的原创曲目',
        meter: ['2/4', '3/4', '4/4'].includes(song.meter) ? song.meter : '4/4',
        bpm: Math.max(60, Math.min(160, Number(song.bpm) || 100)),
        color: CUSTOM_SONG_COLORS[index % CUSTOM_SONG_COLORS.length],
        scoreSource: song.scoreSource.trim(),
        score: parseUserScore(song.scoreSource),
        custom: true,
      };
    }).filter(Boolean);
  } catch (error) {
    console.warn('无法读取已保存的自定义曲目', error);
    return [];
  }
}

function saveCustomSongs() {
  const customSongs = SONGS.filter((song) => song.custom).map(({ id, title, meter, bpm, scoreSource }) => ({ id, title, meter, bpm, scoreSource }));
  localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(customSongs));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

const BUILT_IN_SONGS = [
  {
    id: 'painter',
    title: '粉刷匠',
    subtitle: '轻快劳动歌',
    meter: '2/4',
    bpm: 118,
    color: '#ff7548',
    score: parseScore(`
      5/.5 3/.5 5/.5 3/.5 | 5/.5 3/.5 1/1 | 2/.5 4/.5 3/.5 2/.5 | 5/2 |
      5/.5 3/.5 5/.5 3/.5 | 5/.5 3/.5 1/1 | 2/.5 4/.5 3/.5 2/.5 | 1/2 |
      2/.5 2/.5 4/.5 4/.5 | 3/.5 1/.5 5/1 | 2/.5 4/.5 3/.5 2/.5 | 5/2 |
      5/.5 3/.5 5/.5 3/.5 | 5/.5 3/.5 1/1 | 2/.5 4/.5 3/.5 2/.5 | 1/2
    `),
  },
  {
    id: 'twinkle',
    title: '小星星',
    subtitle: '经典启蒙旋律',
    meter: '4/4',
    bpm: 92,
    color: '#f6cb57',
    score: parseScore(`
      1 1 5 5 | 6 6 5/2 | 4 4 3 3 | 2 2 1/2 |
      5 5 4 4 | 3 3 2/2 | 5 5 4 4 | 3 3 2/2 |
      1 1 5 5 | 6 6 5/2 | 4 4 3 3 | 2 2 1/2
    `),
  },
  {
    id: 'tigers',
    title: '两只老虎',
    subtitle: '轮唱练习曲',
    meter: '4/4',
    bpm: 112,
    color: '#78d889',
    score: parseScore(`
      1 2 3 1 | 1 2 3 1 | 3 4 5/2 | 3 4 5/2 |
      5/.5 6/.5 5/.5 4/.5 3 1 | 5/.5 6/.5 5/.5 4/.5 3 1 |
      1 5- 1/2 | 1 5- 1/2
    `),
  },
  {
    id: 'mary',
    title: '玛丽的小羊羔',
    subtitle: '三音入门曲',
    meter: '4/4',
    bpm: 104,
    color: '#5de0d3',
    score: parseScore(`
      3 2 1 2 | 3 3 3/2 | 2 2 2/2 | 3 5 5/2 |
      3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1/4 |
      3 2 1 2 | 3 3 3/2 | 2 2 2/2 | 3 5 5/2 |
      3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1/4
    `),
  },
  {
    id: 'joy',
    title: '欢乐颂',
    subtitle: '启蒙名曲主题',
    meter: '4/4',
    bpm: 108,
    color: '#7299f7',
    score: parseScore(`
      3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3/1.5 2/.5 2/2 |
      3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2/1.5 1/.5 1/2 |
      2 2 3 1 | 2 3/.5 4/.5 3 1 | 2 3/.5 4/.5 3 2 | 1 2 5-/2 |
      3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2/1.5 1/.5 1/2
    `),
  },
  {
    id: 'bee',
    title: '小蜜蜂',
    subtitle: '三音到五音进阶',
    meter: '4/4',
    bpm: 116,
    color: '#dfff54',
    score: parseScore(`
      5 3 3 4 | 2 2 1 2 | 3 4 5 5 | 5/2 0/2 |
      5 3 3 4 | 2 2 1 3 | 5 5 3 3 | 1/4
    `),
  },
  {
    id: 'new-year',
    title: '新年好',
    subtitle: '节日祝福旋律',
    meter: '4/4',
    bpm: 108,
    color: '#ff7548',
    score: parseScore(`
      5 5 5 3 | 5 5 5 3 | 5 3 1 2 | 3/1.5 2/.5 1/2 |
      4 4 4 2 | 4 4 4 2 | 4 2 1 2 | 5/1.5 4/.5 3/2
    `),
  },
  {
    id: 'birthday',
    title: '生日快乐',
    subtitle: '高音跳跃练习',
    meter: '3/4',
    bpm: 94,
    color: '#ed74a9',
    score: parseScore(`
      5/.5 5/.5 6 5 | 1+ 7/2 | 5/.5 5/.5 6 5 | 2+ 1+/2 |
      5/.5 5/.5 5+ 3+ | 1+ 7 6/2 | 4+/.5 4+/.5 3+ 1+ | 2+ 1+/2
    `),
  },
  {
    id: 'boat',
    title: '划小船',
    subtitle: '连贯节奏练习',
    meter: '4/4',
    bpm: 100,
    color: '#5de0d3',
    score: parseScore(`
      1 1 1 2 | 3/2 2 3 | 4 5/4 |
      5 6 5 4 | 3 1 3 2 | 1/4
    `),
  },
  {
    id: 'cuckoo',
    title: '布谷鸟',
    subtitle: '听辨音高练习',
    meter: '4/4',
    bpm: 104,
    color: '#7299f7',
    score: parseScore(`
      5 3 5 3 | 5 3 2/2 | 4 2 4 2 | 4 2 1/2 |
      5 3 5 3 | 5 3 2/2 | 4 2 4 2 | 1/4
    `),
  },
];

let SONGS = [...BUILT_IN_SONGS, ...loadCustomSongs()];

let audioContext;
let masterGain;
let analyser;
let isPlaying = false;
let currentStep = -1;
let timerId = null;
let nextNoteTime = 0;
let visualizerStarted = false;
let activeSongIndex = 0;
let songIsPlaying = false;
let songTimerId = null;
let songEndTimerId = null;
let songNextTime = 0;
let songScheduleIndex = 0;
let songVisualIndex = -1;
let songRunId = 0;
let practiceMode = false;
let practiceIndex = 0;

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
const songLibrary = document.querySelector('#songLibrary');
const songNotation = document.querySelector('#songNotation');
const songTitle = document.querySelector('#songTitle');
const songMeta = document.querySelector('#songMeta');
const songProgressText = document.querySelector('#songProgressText');
const songProgressBar = document.querySelector('#songProgressBar');
const songModeText = document.querySelector('#songModeText');
const songPlayButton = document.querySelector('#songPlayButton');
const songPlayLabel = document.querySelector('#songPlayLabel');
const practiceButton = document.querySelector('#practiceButton');
const practiceLabel = document.querySelector('#practiceLabel');
const practiceHint = document.querySelector('#practiceHint');
const songTempo = document.querySelector('#songTempo');
const songTempoValue = document.querySelector('#songTempoValue');
const addSongButton = document.querySelector('#addSongButton');
const deleteSongButton = document.querySelector('#deleteSongButton');
const songEditor = document.querySelector('#songEditor');
const songEditorForm = document.querySelector('#songEditorForm');
const editorTitleInput = document.querySelector('#editorTitle');
const editorMeterInput = document.querySelector('#editorMeter');
const editorBpmInput = document.querySelector('#editorBpm');
const editorScoreInput = document.querySelector('#editorScore');
const editorError = document.querySelector('#editorError');
const editorCancelButton = document.querySelector('#editorCancelButton');
const practiceScreen = document.querySelector('#practiceScreen');
const practiceExitButton = document.querySelector('#practiceExitButton');
const practiceScreenMeta = document.querySelector('#practiceScreenMeta');
const practiceScreenTitle = document.querySelector('#practiceScreenTitle');
const practiceScreenProgress = document.querySelector('#practiceScreenProgress');
const practiceTarget = document.querySelector('#practiceTarget');
const practiceTargetDegree = document.querySelector('#practiceTargetDegree');
const practiceTargetName = document.querySelector('#practiceTargetName');
const practiceTargetOctave = document.querySelector('#practiceTargetOctave');
const practiceTargetRhythm = document.querySelector('#practiceTargetRhythm');
const practiceScreenHint = document.querySelector('#practiceScreenHint');
const practicePreviousButton = document.querySelector('#practicePreviousButton');
const practiceListenButton = document.querySelector('#practiceListenButton');
const practiceRestartButton = document.querySelector('#practiceRestartButton');

function noteFrequency(noteIndex, octaveOffset = 0, octave = Number(octaveSelect.value)) {
  octave += octaveOffset;
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

function scheduleBasicTone(noteIndex, startTime, duration, destination, context, octaveOffset) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const attack = 0.012;
  const release = Math.min(0.22, duration * 0.55);

  oscillator.type = waveformSelect.value;
  oscillator.frequency.setValueAtTime(noteFrequency(noteIndex, octaveOffset), startTime);
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

function schedulePianoTone(noteIndex, startTime, duration, destination, context, octaveOffset) {
  const frequency = noteFrequency(noteIndex, octaveOffset);
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

function scheduleElectricPianoTone(noteIndex, startTime, duration, destination, context, octaveOffset) {
  const frequency = noteFrequency(noteIndex, octaveOffset);
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

function scheduleTone(noteIndex, startTime, duration = 0.38, destination = masterGain, context = audioContext, octaveOffset = 0) {
  if (waveformSelect.value === 'piano') {
    schedulePianoTone(noteIndex, startTime, duration, destination, context, octaveOffset);
    return;
  }
  if (waveformSelect.value === 'epiano') {
    scheduleElectricPianoTone(noteIndex, startTime, duration, destination, context, octaveOffset);
    return;
  }
  scheduleBasicTone(noteIndex, startTime, duration, destination, context, octaveOffset);
}

function playNote(noteIndex, duration = 0.4) {
  ensureAudio();
  scheduleTone(noteIndex, audioContext.currentTime, duration);
  animateKey(noteIndex);
}

function animateKey(noteIndex, delay = 0) {
  window.setTimeout(() => {
    const keys = document.querySelectorAll(`.note-key[data-index="${noteIndex}"], .practice-key[data-index="${noteIndex}"]`);
    keys.forEach((key) => key.classList.add('active'));
    soundOrb.classList.add('playing');
    window.setTimeout(() => {
      keys.forEach((key) => key.classList.remove('active'));
      soundOrb.classList.remove('playing');
    }, 180);
  }, delay);
}

function currentSong() {
  return SONGS[activeSongIndex];
}

function rhythmName(beats) {
  if (beats === 0.5) return '八分音符';
  if (beats === 1) return '四分音符';
  if (beats === 1.5) return '附点四分音符';
  if (beats === 2) return '二分音符';
  if (beats === 4) return '全音符';
  return `${beats} 拍`;
}

function noteSpokenName(event) {
  if (!event || event.note === null) return '休止';
  const octaveName = event.octave > 0 ? '高音' : event.octave < 0 ? '低音' : '';
  return `${octaveName}${NOTES[event.note].name}（${event.degree}）`;
}

function renderSongLibrary() {
  songLibrary.innerHTML = '';
  SONGS.forEach((song, index) => {
    const button = document.createElement('button');
    button.className = `song-card${index === activeSongIndex ? ' active' : ''}`;
    button.type = 'button';
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-pressed', String(index === activeSongIndex));
    button.style.setProperty('--song-color', song.color);
    button.innerHTML = `
      <span class="song-card-index">曲目 ${String(index + 1).padStart(2, '0')}</span>
      <strong>${escapeHtml(song.title)}</strong>
      <small>${song.custom ? '我的曲目 · ' : ''}${escapeHtml(song.subtitle)} · ${song.meter}</small>
    `;
    if (song.custom) button.classList.add('custom');
    button.addEventListener('click', () => selectSong(index));
    songLibrary.append(button);
  });
  document.querySelector('#songCount').textContent = SONGS.length;
}

function renderSongNotation() {
  const song = currentSong();
  songNotation.innerHTML = '';
  song.score.forEach((event, index) => {
    const note = document.createElement('div');
    note.className = `score-note${event.measureEnd ? ' measure-end' : ''}`;
    note.dataset.event = index;
    note.style.setProperty('--note-color', event.note === null ? '#aaa99f' : NOTES[event.note].color);
    note.setAttribute('aria-label', `${noteSpokenName(event)}，${rhythmName(event.beats)}`);
    const octaveDots = event.octave === 0 ? '' : '•'.repeat(Math.abs(event.octave));
    note.innerHTML = `
      ${octaveDots ? `<span class="octave-mark${event.octave < 0 ? ' low' : ''}">${octaveDots}</span>` : ''}
      <strong>${event.degree}</strong>
      <small>${event.beats} 拍</small>
    `;
    songNotation.append(note);
  });
}

function setSongProgress(index, state = 'ready') {
  const song = currentSong();
  const total = song.score.length;
  const completed = state === 'complete';
  const count = completed ? total : Math.max(0, Math.min(total, index + 1));
  songProgressText.textContent = `${count} / ${total}`;
  songProgressBar.style.width = `${completed ? 100 : total ? (count / total) * 100 : 0}%`;
  document.querySelectorAll('.score-note').forEach((note, noteIndex) => {
    note.classList.toggle('passed', completed || (index >= 0 && noteIndex < index));
    note.classList.toggle('current', !completed && state === 'playing' && noteIndex === index);
    note.classList.toggle('next', !completed && state === 'practice' && noteIndex === index);
  });
  if (index >= 0 && !completed) {
    const activeNote = document.querySelector(`.score-note[data-event="${index}"]`);
    activeNote?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  } else if (index < 0) {
    document.querySelector('#notationWrap').scrollLeft = 0;
  }
}

function selectSong(index) {
  if (isPlaying) stopPlayback();
  stopSongPlayback(true);
  stopPractice(true);
  activeSongIndex = index;
  const song = currentSong();
  songTitle.textContent = song.title;
  songMeta.textContent = `C 大调 · ${song.meter} · ${song.subtitle}`;
  songTempo.value = song.bpm;
  songTempoValue.value = song.bpm;
  deleteSongButton.hidden = !song.custom;
  songVisualIndex = -1;
  songScheduleIndex = 0;
  renderSongLibrary();
  renderSongNotation();
  setSongProgress(-1);
  songModeText.textContent = '准备就绪';
  practiceHint.textContent = '选择“整曲播放”自动演奏，或选择“跟弹练习”后按上方彩色琴键。';
}

function openSongEditor() {
  editorError.textContent = '';
  songEditor.hidden = false;
  document.body.classList.add('editor-open');
  window.setTimeout(() => editorTitleInput.focus(), 0);
}

function closeSongEditor() {
  songEditor.hidden = true;
  document.body.classList.remove('editor-open');
}

function addCustomSong(event) {
  event.preventDefault();
  const title = editorTitleInput.value.trim().slice(0, 30);
  const meter = editorMeterInput.value;
  const bpm = Number(editorBpmInput.value);
  const scoreSource = editorScoreInput.value.trim();

  if (!title) {
    editorError.textContent = '先给这首曲子起个名字。';
    editorTitleInput.focus();
    return;
  }
  if (!Number.isFinite(bpm) || bpm < 60 || bpm > 160) {
    editorError.textContent = '速度请填写 60 到 160 之间的数字。';
    editorBpmInput.focus();
    return;
  }

  try {
    const score = parseUserScore(scoreSource);
    const customSong = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      subtitle: '我的原创曲目',
      meter,
      bpm,
      color: CUSTOM_SONG_COLORS[SONGS.filter((song) => song.custom).length % CUSTOM_SONG_COLORS.length],
      scoreSource,
      score,
      custom: true,
    };
    SONGS.push(customSong);
    saveCustomSongs();
    songEditorForm.reset();
    editorMeterInput.value = '4/4';
    editorBpmInput.value = '100';
    closeSongEditor();
    selectSong(SONGS.length - 1);
    showToast(`《${title}》已加入曲目库`);
  } catch (error) {
    editorError.textContent = error.message || '这段简谱暂时无法保存。';
  }
}

function deleteCurrentCustomSong() {
  const song = currentSong();
  if (!song?.custom) return;
  if (!window.confirm(`删除《${song.title}》？此操作只会删除这台设备上的保存内容。`)) return;
  const nextIndex = Math.max(0, activeSongIndex - 1);
  SONGS.splice(activeSongIndex, 1);
  saveCustomSongs();
  selectSong(nextIndex);
  showToast('自定义曲目已删除');
}

function secondsPerSongBeat() {
  return 60 / Number(songTempo.value);
}

function updateSongVisual(eventIndex, runId) {
  if (!songIsPlaying || runId !== songRunId) return;
  songVisualIndex = eventIndex;
  const event = currentSong().score[eventIndex];
  setSongProgress(eventIndex, 'playing');
  if (event.note !== null) animateKey(event.note);
  practiceHint.innerHTML = `正在演奏：<strong>${noteSpokenName(event)}</strong> · ${rhythmName(event.beats)}`;
}

function completeSongPlayback(runId) {
  if (!songIsPlaying || runId !== songRunId) return;
  songIsPlaying = false;
  window.clearInterval(songTimerId);
  songTimerId = null;
  songVisualIndex = currentSong().score.length;
  setSongProgress(songVisualIndex, 'complete');
  songPlayButton.classList.remove('is-playing');
  songPlayLabel.textContent = '再听一遍';
  songModeText.textContent = '整曲完成';
  audioStatus.textContent = '整曲演奏完成';
  practiceHint.textContent = `${currentSong().title}演奏完成，可以再听一遍或开启跟弹练习。`;
}

function songScheduler() {
  const song = currentSong();
  const runId = songRunId;
  while (songScheduleIndex < song.score.length && songNextTime < audioContext.currentTime + 0.1) {
    const eventIndex = songScheduleIndex;
    const event = song.score[eventIndex];
    const duration = event.beats * secondsPerSongBeat();
    const delay = Math.max(0, songNextTime - audioContext.currentTime);
    if (event.note !== null) {
      scheduleTone(event.note, songNextTime, Math.max(0.12, duration * 0.82), masterGain, audioContext, event.octave);
    }
    window.setTimeout(() => updateSongVisual(eventIndex, runId), delay * 1000);
    songNextTime += duration;
    songScheduleIndex += 1;
  }
  if (songScheduleIndex >= song.score.length && !songEndTimerId) {
    const remaining = Math.max(0, songNextTime - audioContext.currentTime);
    songEndTimerId = window.setTimeout(() => completeSongPlayback(runId), remaining * 1000);
  }
}

function startSongPlayback() {
  if (isPlaying) stopPlayback();
  stopPractice(true);
  ensureAudio();
  if (songVisualIndex >= currentSong().score.length - 1) {
    songScheduleIndex = 0;
    songVisualIndex = -1;
  } else {
    songScheduleIndex = Math.max(0, songVisualIndex + 1);
  }
  songRunId += 1;
  songIsPlaying = true;
  songEndTimerId = null;
  songNextTime = audioContext.currentTime + 0.06;
  songScheduler();
  songTimerId = window.setInterval(songScheduler, 25);
  songPlayButton.classList.add('is-playing');
  songPlayLabel.textContent = '暂停';
  songModeText.textContent = '自动演奏';
  audioStatus.textContent = `正在演奏《${currentSong().title}》`;
}

function stopSongPlayback(reset = false) {
  if (!songIsPlaying && !reset) return;
  songRunId += 1;
  songIsPlaying = false;
  window.clearInterval(songTimerId);
  window.clearTimeout(songEndTimerId);
  songTimerId = null;
  songEndTimerId = null;
  songPlayButton.classList.remove('is-playing');
  songPlayLabel.textContent = reset ? '整曲播放' : '继续播放';
  songModeText.textContent = reset ? '准备就绪' : '已暂停';
  if (reset) {
    songVisualIndex = -1;
    songScheduleIndex = 0;
    setSongProgress(-1);
    practiceHint.textContent = '选择“整曲播放”自动演奏，或选择“跟弹练习”后按上方彩色琴键。';
  }
  if (audioContext) audioStatus.textContent = '声音已就绪';
}

function toggleSongPlayback() {
  if (songIsPlaying) stopSongPlayback(); else startSongPlayback();
}

function nextPracticeEvent() {
  const score = currentSong().score;
  while (practiceIndex < score.length && score[practiceIndex].note === null) practiceIndex += 1;
  return score[practiceIndex];
}

function openPracticeScreen() {
  practiceScreen.hidden = false;
  document.body.classList.add('practice-open');
  window.setTimeout(() => practiceExitButton.focus(), 0);
}

function closePracticeScreen() {
  practiceScreen.hidden = true;
  document.body.classList.remove('practice-open');
}

function updatePracticeScreen(target, complete = false) {
  const song = currentSong();
  const total = song.score.length;
  practiceScreenTitle.textContent = song.title;
  practiceScreenMeta.textContent = complete ? '整首跟弹完成' : `${song.meter} · ${song.subtitle}`;
  practiceScreenProgress.textContent = complete ? `${total} / ${total}` : `${Math.min(total, practiceIndex + 1)} / ${total}`;
  practiceTarget.classList.toggle('is-complete', complete);

  if (complete) {
    practiceTarget.style.setProperty('--practice-color', 'var(--acid)');
    practiceTargetDegree.textContent = '✓';
    practiceTargetName.textContent = '完成';
    practiceTargetOctave.textContent = '太棒了';
    practiceTargetRhythm.textContent = `你已弹完《${song.title}》`;
    practiceScreenHint.textContent = '可以从头再练一次，或退出回到曲目页。';
    document.querySelectorAll('.practice-key').forEach((key) => key.classList.remove('is-target'));
    return;
  }

  const octaveName = target.octave > 0 ? '高音' : target.octave < 0 ? '低音' : '中音';
  practiceTarget.style.setProperty('--practice-color', NOTES[target.note].color);
  practiceTargetDegree.textContent = target.degree;
  practiceTargetName.textContent = NOTES[target.note].name;
  practiceTargetOctave.textContent = octaveName;
  practiceTargetRhythm.textContent = `${rhythmName(target.beats)} · 保持 ${target.beats} 拍`;
  practiceScreenHint.textContent = `请按下方 ${noteSpokenName(target)} 琴键`;
  document.querySelectorAll('.practice-key').forEach((key) => {
    key.classList.toggle('is-target', Number(key.dataset.index) === target.note);
  });
}

function flashPracticeFeedback(className) {
  practiceScreen.classList.remove('is-correct', 'is-wrong');
  practiceScreen.classList.add(className);
  window.setTimeout(() => practiceScreen.classList.remove(className), 260);
}

function showPracticeTarget() {
  const target = nextPracticeEvent();
  if (!target) {
    practiceMode = false;
    practiceButton.classList.remove('active');
    practiceLabel.textContent = '再练一次';
    songModeText.textContent = '跟弹完成';
    setSongProgress(currentSong().score.length, 'complete');
    practiceHint.textContent = `太棒了！你已经完整弹完《${currentSong().title}》。`;
    updatePracticeScreen(null, true);
    return;
  }
  setSongProgress(practiceIndex, 'practice');
  practiceHint.innerHTML = `请按上方琴键：<strong>${noteSpokenName(target)}</strong> · 保持 ${target.beats} 拍`;
  updatePracticeScreen(target);
}

function startPractice() {
  if (isPlaying) stopPlayback();
  stopSongPlayback(true);
  practiceMode = true;
  practiceIndex = 0;
  practiceButton.classList.add('active');
  practiceLabel.textContent = '退出跟弹';
  songModeText.textContent = '等待你弹';
  openPracticeScreen();
  showPracticeTarget();
}

function stopPractice(reset = false) {
  if (!practiceMode && !reset) return;
  practiceMode = false;
  closePracticeScreen();
  practiceButton.classList.remove('active');
  practiceLabel.textContent = '跟弹练习';
  if (!reset) {
    songModeText.textContent = '准备就绪';
    setSongProgress(-1);
    practiceHint.textContent = '跟弹已退出，可以选择整曲播放。';
  }
}

function togglePractice() {
  if (practiceMode) stopPractice(); else startPractice();
}

function restartPractice() {
  if (isPlaying) stopPlayback();
  stopSongPlayback(true);
  practiceMode = true;
  practiceIndex = 0;
  practiceButton.classList.add('active');
  practiceLabel.textContent = '退出跟弹';
  songModeText.textContent = '等待你弹';
  showPracticeTarget();
}

function previousPracticeNote() {
  if (practiceIndex <= 0) {
    practiceScreenHint.textContent = '已经是第一个音了。';
    return;
  }
  practiceMode = true;
  practiceButton.classList.add('active');
  practiceLabel.textContent = '退出跟弹';
  practiceIndex -= 1;
  while (practiceIndex > 0 && currentSong().score[practiceIndex].note === null) practiceIndex -= 1;
  songModeText.textContent = '等待你弹';
  showPracticeTarget();
}

function playPracticeHint() {
  const target = nextPracticeEvent();
  if (!target) return;
  ensureAudio();
  scheduleTone(target.note, audioContext.currentTime, Math.max(0.22, target.beats * secondsPerSongBeat() * 0.78), masterGain, audioContext, target.octave);
  animateKey(target.note);
  practiceScreenHint.textContent = `听一听：${noteSpokenName(target)}`;
}

function handleManualNote(noteIndex) {
  if (!practiceMode) {
    playNote(noteIndex);
    return;
  }
  const target = nextPracticeEvent();
  if (!target) return;
  if (target.note !== noteIndex) {
    playNote(noteIndex, 0.18);
    practiceHint.innerHTML = `再试一次，下一个是 <strong>${noteSpokenName(target)}</strong>`;
    practiceScreenHint.textContent = `再试一次，下一个是 ${noteSpokenName(target)}`;
    flashPracticeFeedback('is-wrong');
    return;
  }
  ensureAudio();
  const duration = Math.max(0.18, target.beats * secondsPerSongBeat() * 0.78);
  scheduleTone(target.note, audioContext.currentTime, duration, masterGain, audioContext, target.octave);
  animateKey(target.note);
  if (navigator.vibrate) navigator.vibrate(18);
  flashPracticeFeedback('is-correct');
  practiceIndex += 1;
  showPracticeTarget();
}

document.querySelectorAll('.note-key, .practice-key').forEach((key) => {
  key.addEventListener('pointerdown', () => handleManualNote(Number(key.dataset.index)));
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && practiceMode) {
    stopPractice();
    return;
  }
  if (event.key === 'Escape' && !songEditor.hidden) {
    closeSongEditor();
    return;
  }
  if (event.repeat || event.target.matches('input, select, button')) return;
  const noteIndex = keyboardMap[event.key.toLowerCase()];
  if (noteIndex !== undefined) handleManualNote(noteIndex);
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlayback();
  }
});

songPlayButton.addEventListener('click', toggleSongPlayback);
practiceButton.addEventListener('click', togglePractice);
addSongButton.addEventListener('click', openSongEditor);
deleteSongButton.addEventListener('click', deleteCurrentCustomSong);
songEditorForm.addEventListener('submit', addCustomSong);
editorCancelButton.addEventListener('click', closeSongEditor);
practiceExitButton.addEventListener('click', () => stopPractice());
practicePreviousButton.addEventListener('click', previousPracticeNote);
practiceListenButton.addEventListener('click', playPracticeHint);
practiceRestartButton.addEventListener('click', restartPractice);
document.querySelector('#songResetButton').addEventListener('click', () => {
  stopSongPlayback(true);
  stopPractice(true);
  setSongProgress(-1);
  practiceHint.textContent = '已经回到开头，选择播放或跟弹练习。';
});
songTempo.addEventListener('input', () => { songTempoValue.value = songTempo.value; });

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
  stopSongPlayback(true);
  stopPractice(true);
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
selectSong(0);
