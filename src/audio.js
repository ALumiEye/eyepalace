'use strict';
// ===== Âm thanh tổng hợp bằng WebAudio (không cần file) =====

const Sound = {
  ctx: null, _muted: false, last: {}, sfxVol: 1, musicVol: 1,
  get muted() { return this._muted; },
  set muted(v) {
    this._muted = !!v;
    if (this.ctx && this.masterGain) this.masterGain.gain.setTargetAtTime(v ? 0 : 0.9, this.ctx.currentTime, 0.015);
  },
  setVolume(kind, v) {
    v = Math.max(0, Math.min(1, Number(v) || 0));
    this[kind + 'Vol'] = v;
    const g = this[kind + 'Gain']; if (g) g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015);
  },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; return; }
    // Nén chung để trống, bass và hiệu ứng đông quái vẫn còn khoảng trống âm lượng.
    const c = this.ctx, limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -8; limiter.knee.value = 6; limiter.ratio.value = 12;
    limiter.attack.value = 0.003; limiter.release.value = 0.18;
    this.masterGain = c.createGain(); this.masterGain.gain.value = this.muted ? 0 : 0.9;
    limiter.connect(this.masterGain).connect(c.destination);
    this.sfxGain = c.createGain(); this.sfxGain.gain.value = this.sfxVol; this.sfxGain.connect(limiter);
    this.musicGain = c.createGain(); this.musicGain.gain.value = this.musicVol; this.musicGain.connect(limiter);
  },
  // Giới hạn tần suất mỗi loại âm để không bị ồn khi có nhiều tháp
  play(name) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const minGap = { arrow: 0.06, zap: 0.08, frost: 0.15, boom: 0.08, die: 0.04, snipe: 0.1 }[name] || 0.05;
    if (this.last[name] && now - this.last[name] < minGap) return;
    this.last[name] = now;
    const S = {
      arrow:   () => this.tone(900, 500, 0.06, 'triangle', 0.05),
      cannon:  () => this.noise(0.18, 0.12, 400),
      boom:    () => this.noise(0.3, 0.16, 250),
      frost:   () => this.tone(1400, 900, 0.2, 'sine', 0.04),
      zap:     () => { this.noise(0.08, 0.06, 3000); this.tone(1800, 300, 0.08, 'sawtooth', 0.03); },
      snipe:   () => this.tone(1600, 200, 0.12, 'square', 0.04),
      die:     () => this.tone(500, 180, 0.1, 'square', 0.035),
      bossdie: () => { this.noise(0.8, 0.25, 180); this.tone(300, 40, 0.8, 'sawtooth', 0.08); },
      build:   () => { this.tone(400, 600, 0.08, 'square', 0.05); },
      upgrade: () => { this.tone(500, 500, 0.07, 'square', 0.05); setTimeout(() => this.tone(750, 750, 0.1, 'square', 0.05), 70); },
      sell:    () => this.tone(700, 350, 0.12, 'triangle', 0.06),
      leak:    () => this.tone(200, 80, 0.3, 'sawtooth', 0.08),
      wave:    () => { this.tone(330, 330, 0.12, 'square', 0.05); setTimeout(() => this.tone(440, 440, 0.18, 'square', 0.05), 120); },
      lose:    () => { this.tone(300, 60, 1.2, 'sawtooth', 0.09); },
      win:     () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.2, 'square', 0.06), i * 140)); },
      bossin:  () => { [110, 98, 82].forEach((f, i) => setTimeout(() => this.tone(f, f * 0.9, 0.5, 'sawtooth', 0.08), i * 260)); this.noise(1.0, 0.12, 150); },
      alarm:   () => { [0, 220, 440].forEach(t => setTimeout(() => this.tone(880, 660, 0.18, 'square', 0.06), t)); },
      roar:    () => { this.noise(0.5, 0.18, 300); this.tone(140, 60, 0.6, 'sawtooth', 0.07); },
      meteor:  () => this.tone(1200, 150, 0.7, 'sawtooth', 0.04),
      click:   () => this.tone(800, 800, 0.03, 'square', 0.03),
    };
    if (S[name]) S[name]();
  },
  tone(f1, f2, dur, type, vol) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain || c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq) {
    const c = this.ctx, t = c.currentTime;
    if (!this._nbuf) {
      this._nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this._nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource(); s.buffer = this._nbuf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxGain || c.destination); s.start(t); s.stop(t + dur);
  },
};

// ===== Combat điện tử: breakbeat nhanh, bass nảy, build-up và drop tám ô nhịp =====
const Music = {
  on: false, timer: null, step: 0, next: 0, level: 0, bus: null,
  sources: new Set(), prog: [45, 41, 38, 40], // La thứ → Fa → Rê → Mi
  update(game, paused, danger = 0) {
    if (!game || paused || game.isOver || game.state !== 'wave') { this.level = 0; return; }
    this.level = danger > 0 ? 3 : game.enemies.some(e => e.alive && e.d.boss) ? 2 : 1;
  },
  start() {
    Sound.init(); if (!Sound.ctx || this.timer) return;
    // Tăng riêng phối nhạc 60%; không khuếch đại SFX hay tiếng môi trường.
    this.bus = Sound.ctx.createGain(); this.bus.gain.value = 1.6;
    this.bus.connect(Sound.musicGain);
    this.on = true; this.step = 0; this.next = Sound.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.schedule(), 60);
    this.schedule();
  },
  stop() {
    this.on = false; clearInterval(this.timer); this.timer = null;
    // Dừng cả các nốt đã hẹn, không để nhạc cũ chồng lên khi bật lại nhanh.
    for (const s of this.sources) { try { s.stop(); } catch (e) { /* đã kết thúc */ } }
    this.sources.clear();
    if (this.bus) this.bus.disconnect(); this.bus = null;
  },
  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },
  voice(src, nodes, t, dur, vol, attack = 0.008, hold = 0.55) {
    const c = Sound.ctx, g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(attack, dur * 0.2));
    g.gain.setValueAtTime(vol * 0.75, t + dur * hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let chain = src;
    for (const node of nodes) { chain.connect(node); chain = node; }
    chain.connect(g).connect(this.bus);
    this.sources.add(src);
    src.onended = () => { this.sources.delete(src); src.disconnect(); for (const n of nodes) n.disconnect(); g.disconnect(); };
    src.start(t); src.stop(t + dur + 0.015);
  },
  note(f, t, dur, type, vol, cutoff = 1600, attack = 0.008, detune = 0) {
    const c = Sound.ctx, o = c.createOscillator(), filter = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    filter.type = 'lowpass'; filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, cutoff * 0.35), t + dur);
    this.voice(o, [filter], t, dur, vol, attack);
  },
  drum(kind, t, power = 1) {
    const c = Sound.ctx;
    if (kind === 'kick' || kind === 'tom') {
      const o = c.createOscillator(), kick = kind === 'kick', dur = kick ? 0.32 : 0.21;
      o.frequency.setValueAtTime(kick ? 145 : 210, t);
      o.frequency.exponentialRampToValueAtTime(kick ? 43 : 75, t + dur);
      this.voice(o, [], t, dur, (kick ? 0.32 : 0.19) * power, 0.003, 0.08);
      return;
    }
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== c.sampleRate) {
      this.noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter();
    const snare = kind === 'snare', crash = kind === 'crash', rise = kind === 'rise';
    const dur = rise ? 0.65 : crash ? 0.48 : snare ? 0.16 : 0.045;
    s.buffer = this.noiseBuffer; f.type = snare ? 'bandpass' : 'highpass';
    f.frequency.setValueAtTime(rise ? 450 : crash ? 3800 : snare ? 1800 : 7000, t); f.Q.value = 0.65;
    if (rise) f.frequency.exponentialRampToValueAtTime(8500, t + dur);
    this.voice(s, [f], t, dur, (rise ? 0.06 : crash ? 0.12 : snare ? 0.23 : 0.055) * power, rise ? 0.12 : 0.002, rise ? 0.9 : 0.08);
    // Thân tiếng snare giữ lực đánh ngay cả trên loa nhỏ.
    if (snare) this.note(185, t, 0.1, 'triangle', 0.09 * power, 900);
  },
  stepDuration() { return 60 / [120, 168, 180, 192][this.level] / 4; },
  renderStep(t, d) {
    const level = this.level, k = this.step % 16;
    const phrase = Math.floor(this.step / 16) % 8, bar = phrase % 4, root = this.prog[bar];
    const build = level > 0 && phrase === 7, gap = build && k >= 14;
    const drop = level > 0 && (phrase === 0 || phrase === 4);
    // Chu kỳ tám ô nhịp: tăng dần, ngắt nửa phách rồi bung trống/bass trở lại.
    const pattern = [0, 12, 7, 15, 12, 7, 3, 10, 0, 12, 19, 15, 12, 10, 7, 1];
    if (!gap && (level || k % 2 === 0)) {
      const pitch = root + 12 + pattern[(k + (phrase >= 4 ? 4 : 0)) % 16];
      const cutoff = level ? 2300 + level * 450 + (build ? k * 160 : 0) : 1300;
      this.note(this.midi(pitch), t, d * 0.85, 'sawtooth', level ? 0.072 : 0.05, cutoff);
      if (level >= 2 && k % 2 === 0)
        this.note(this.midi(pitch), t, d * 0.8, 'sawtooth', 0.027, cutoff, 0.008, 9);
    }
    // Bass offbeat: chừa đầu phách cho kick, sub + saw cho loa nhỏ vẫn có lực.
    if (!gap && (level ? k % 4 !== 0 : k % 4 === 0) && !(build && k >= 8)) {
      const bass = root - 12 + (k === 11 ? 7 : k === 15 ? 12 : 0);
      this.note(this.midi(bass), t, d * (level ? 0.85 : 3), 'sine', level ? 0.18 : 0.12, 400);
      this.note(this.midi(bass + 12), t, d * 0.75, 'sawtooth', level ? 0.105 : 0.035, level >= 2 ? 1600 : 950);
    }
    if (k === 0) {
      for (const interval of [0, bar === 3 ? 4 : 3, 7])
        this.note(this.midi(root + interval), t, d * (level ? 5 : 14), 'sawtooth', level ? 0.032 : 0.025, 1050, 0.04);
      if (drop) { this.drum('crash', t); this.drum('tom', t, 0.8); }
    }
    if (!gap && !build) {
      const kick = level >= 2 ? [0, 3, 6, 8, 10, 14].includes(k) : k % 4 === 0;
      if (kick) this.drum('kick', t, level ? 1.1 : 0.55);
      if (level && k % 8 === 4) this.drum('snare', t, 1.1);
      if (level && k % 2 === 1) this.drum('hat', t, k % 4 === 3 ? 0.9 : 0.6);
      if (level >= 2 && k % 4 === 2) this.drum('hat', t, 0.45);
      // Hi-hat kép cho nhịp boss/nguy cấp, không tăng tốc theo x4 game.
      if (level === 3 && k % 4 === 3) this.drum('hat', t + d * 0.5, 0.4);
      if (level >= 2 && phrase % 2 === 1 && k >= 13) this.drum('snare', t, 0.35 + (k - 13) * 0.1);
    } else if (build && !gap) {
      if (k < 8 && k % 4 === 0) this.drum('kick', t);
      if (k % (k < 8 ? 2 : 1) === 0) this.drum('snare', t, 0.35 + k * 0.045);
      if (k >= 10) this.drum('snare', t + d * 0.5, 0.3);
      if (k === 6) this.drum('rise', t, 0.8);
    }
    if (!gap && level && (k === 0 || k === 6 || k === 10) && phrase >= 4) {
      const accent = root + (k === 6 ? 22 : 19);
      this.note(this.midi(accent), t, d * 2.3, 'sawtooth', 0.048, 2400, 0.005, -7);
      this.note(this.midi(accent + 12), t, d * 1.8, 'triangle', 0.035, 3300);
    }
    this.step++;
  },
  schedule() {
    const c = Sound.ctx; if (!this.on || !c) return;
    if (Sound.muted || c.state === 'suspended') { this.next = c.currentTime + 0.06; return; }
    // Tab ngủ lâu: bỏ các nhịp đã lỡ, tuyệt đối không phát bù hàng nghìn nốt.
    if (this.next < c.currentTime) this.next = c.currentTime + 0.025;
    while (this.next < c.currentTime + 0.16) {
      const d = this.stepDuration(); this.renderStep(this.next, d); this.next += d;
    }
  },
};

// ===== Âm thanh môi trường theo bản đồ: tiếng ồn lọc + dao động chậm (gió, dung nham, lá, nước) =====
const Ambience = {
  node: null, kind: null,
  presets: {
    wind:   { type: 'bandpass', f: 500, q: 0.7, vol: 0.05, lfo: 0.15, depth: 350 },
    lava:   { type: 'lowpass',  f: 160, q: 1.2, vol: 0.09, lfo: 0.4,  depth: 60 },
    leaves: { type: 'highpass', f: 2500, q: 0.5, vol: 0.02, lfo: 0.25, depth: 800 },
    water:  { type: 'bandpass', f: 900, q: 2.5, vol: 0.03, lfo: 0.6,  depth: 300 },
  },
  kindFor(map) {
    const d = map.theme.deco;
    return d === 'lava' ? 'lava' : (d === 'rock' || d === 'crystal') ? 'wind' : d === 'reed' ? 'water' : 'leaves';
  },
  start(map) {
    Sound.init(); const c = Sound.ctx; if (!c) return;
    const kind = this.kindFor(map);
    if (this.kind === kind && this.node) return;
    this.stop();
    const P = this.presets[kind];
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = kind === 'leaves' ? Math.random() * 2 - 1 : last * 8; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = P.type; f.frequency.value = P.f; f.Q.value = P.q;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = P.lfo; lg.gain.value = P.depth; lfo.connect(lg).connect(f.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(P.vol, c.currentTime + 2);
    src.connect(f).connect(g).connect(Sound.musicGain || c.destination);
    src.start(); lfo.start();
    this.node = { src, lfo, g }; this.kind = kind;
  },
  stop() {
    if (!this.node) return;
    const c = Sound.ctx, n = this.node; this.node = null; this.kind = null;
    try { n.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); setTimeout(() => { try { n.src.stop(); n.lfo.stop(); } catch (e) { /* đã dừng */ } }, 1200); } catch (e) { /* bỏ qua */ }
  },
};
