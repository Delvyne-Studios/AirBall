/* ============================================================
   AIRBALL — procedural audio (no samples)
   ============================================================ */
(function(){
  const AB = window.AB = window.AB || {};

  const Audio = AB.Audio = {
    ctx: null,
    master: null,
    sfxBus: null,
    crowdBus: null,
    noiseBuf: null,
    started: false,
    muted: false,
    volume: 0.8,
    crowdLevel: 0,
    _crowdNodes: null,

    unlock(){
      if (this.started) {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = this.ctx = new AC();
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(ctx.destination);

        this.sfxBus = ctx.createGain();
        this.sfxBus.gain.value = 0.9;
        this.sfxBus.connect(this.master);

        this.crowdBus = ctx.createGain();
        this.crowdBus.gain.value = 0.55;
        this.crowdBus.connect(this.master);

        // noise buffer
        const len = Math.floor(ctx.sampleRate * 2.2);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++){
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          d[i] = last * 3.2 + white * 0.25;
        }
        this.noiseBuf = buf;
        this.started = true;
        this._crowd();
      } catch (e) { /* audio is a luxury */ }
    },

    setMuted(m){
      this.muted = !!m;
      if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    },

    _now(){ return this.ctx ? this.ctx.currentTime : 0; },

    _noise(opt){
      if (!this.started || this.muted) return;
      const ctx = this.ctx, t = this._now() + (opt.delay || 0);
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.playbackRate.value = opt.rate || 1;
      const f = ctx.createBiquadFilter();
      f.type = opt.filter || 'bandpass';
      f.frequency.setValueAtTime(opt.freq || 1000, t);
      if (opt.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, opt.to), t + (opt.dur || 0.3));
      f.Q.value = opt.q != null ? opt.q : 1;
      const g = ctx.createGain();
      const vol = (opt.gain != null ? opt.gain : 0.2);
      const atk = opt.attack || 0.004;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (opt.dur || 0.3));
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) pan.pan.value = AB.U.clamp(opt.pan || 0, -1, 1);
      src.connect(f); f.connect(g);
      if (pan) { g.connect(pan); pan.connect(opt.bus || this.sfxBus); }
      else g.connect(opt.bus || this.sfxBus);
      src.start(t);
      src.stop(t + (opt.dur || 0.3) + 0.05);
    },

    _tone(opt){
      if (!this.started || this.muted) return;
      const ctx = this.ctx, t = this._now() + (opt.delay || 0);
      const o = ctx.createOscillator();
      o.type = opt.type || 'sine';
      o.frequency.setValueAtTime(opt.freq, t);
      if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), t + (opt.dur || .3));
      const g = ctx.createGain();
      const vol = opt.gain != null ? opt.gain : 0.15;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0003, vol), t + (opt.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (opt.dur || .3));
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) pan.pan.value = AB.U.clamp(opt.pan || 0, -1, 1);
      o.connect(g);
      if (pan) { g.connect(pan); pan.connect(this.sfxBus); }
      else g.connect(this.sfxBus);
      o.start(t); o.stop(t + (opt.dur || .3) + 0.05);
    },

    /* ---------------- ambience ---------------- */
    _crowd(){
      if (!this.started) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.55;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'lowpass'; f2.frequency.value = 2100;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      src.connect(f); f.connect(f2); f2.connect(g); g.connect(this.crowdBus);
      src.start();
      this._crowdNodes = { src, g, f };
      this._ambientTimer = setInterval(() => {
        if (!this.ctx || this.muted) return;
        const lvl = 0.04 + this.crowdLevel * 0.1;
        g.gain.setTargetAtTime(lvl, this.ctx.currentTime, 1.2);
      }, 1400);
    },

    crowd(level){
      this.crowdLevel = AB.U.clamp(level, 0, 1);
      if (this._crowdNodes && this.ctx && !this.muted){
        this._crowdNodes.g.gain.setTargetAtTime(0.038 + this.crowdLevel * 0.11, this.ctx.currentTime, 0.6);
      }
    },

    roar(intensity = 0.6, pan = 0){
      if (!this.started || this.muted) return;
      const i = AB.U.clamp(intensity, 0, 1);
      this._noise({ dur: 1.5, gain: 0.12 + i * 0.22, freq: 300, to: 700, q: 0.5, attack: 0.09, filter:'bandpass', pan });
      this._noise({ dur: 1.15, gain: 0.05 + i * 0.15, freq: 1600, to: 900, q: 0.7, attack: 0.06, filter:'bandpass', pan });
      this._noise({ dur: 0.7, gain: 0.1 + i * 0.18, freq: 2400, to: 1400, q: 0.9, attack: 0.03, pan });
    },

    /* ---------------- sfx ---------------- */
    dribble(power = 1, pan = 0){
      this._tone({ freq: 128, to: 56, type: 'sine', dur: 0.13, gain: 0.06 + power * 0.07, pan });
      this._noise({ dur: 0.05, freq: 320, to: 140, gain: 0.03 * power, filter: 'lowpass', pan });
    },

    bounce(power = 1, pan = 0){
      this._tone({ freq: 96, to: 48, type: 'sine', dur: 0.18, gain: 0.09 * power, pan });
      this._noise({ dur: 0.07, freq: 260, to: 120, gain: 0.05 * power, filter: 'lowpass', pan });
    },

    grab(pan = 0){
      this._noise({ dur: 0.06, freq: 900, to: 380, gain: 0.07, q: 1.4, pan });
      this._tone({ freq: 180, to: 120, type: 'sine', dur: 0.07, gain: 0.05, pan });
    },

    swish(pan = 0){
      this._noise({ dur: 0.32, freq: 1500, to: 5200, gain: 0.11, q: 1.4, attack: 0.02, filter: 'bandpass', pan });
      this._noise({ dur: 0.2, freq: 600, to: 1500, gain: 0.05, q: 0.8, attack: 0.005, pan });
      this._tone({ freq: 2300, to: 1500, type: 'sine', dur: 0.1, gain: 0.025, pan });
    },

    rim(pan = 0){
      this._tone({ freq: 780, to: 620, type: 'triangle', dur: 0.28, gain: 0.08, pan });
      this._tone({ freq: 1420, to: 1200, type: 'sine', dur: 0.2, gain: 0.045, pan });
      this._noise({ dur: 0.09, freq: 2400, to: 1200, gain: 0.04, q: 2.2, pan });
    },

    glass(pan = 0){
      this._tone({ freq: 190, to: 110, type: 'sine', dur: 0.16, gain: 0.08, pan });
      this._noise({ dur: 0.12, freq: 1200, to: 400, gain: 0.05, q: 1.1, pan });
    },

    jump(pan = 0){
      this._noise({ dur: 0.14, freq: 700, to: 1700, gain: 0.03, q: 0.9, attack: 0.01, pan });
    },

    land(pan = 0, power = 1){
      this._tone({ freq: 110, to: 52, type: 'sine', dur: 0.16, gain: 0.07 * power, pan });
      this._noise({ dur: 0.1, freq: 500, to: 180, gain: 0.04 * power, filter:'lowpass', pan });
    },

    steal(pan = 0){
      this._noise({ dur: 0.11, freq: 2100, to: 700, gain: 0.1, q: 1.2, pan });
      this._tone({ freq: 320, to: 160, type: 'square', dur: 0.07, gain: 0.035, pan });
    },

    block(pan = 0){
      this._noise({ dur: 0.16, freq: 1400, to: 260, gain: 0.14, q: 0.9, pan });
      this._tone({ freq: 200, to: 70, type: 'sine', dur: 0.22, gain: 0.12, pan });
    },

    dunk(pan = 0){
      this._tone({ freq: 90, to: 32, type: 'sine', dur: 0.5, gain: 0.3, pan });
      this._noise({ dur: 0.4, freq: 500, to: 90, gain: 0.2, filter: 'lowpass', q: 0.7, pan });
      this._tone({ freq: 1400, to: 700, type: 'triangle', dur: 0.3, gain: 0.07, pan, delay: 0.02 });
      this.roar(0.95, pan);
    },

    whistle(){
      this._tone({ freq: 2400, to: 2500, type: 'sine', dur: 0.28, gain: 0.06 });
      this._tone({ freq: 3150, to: 3050, type: 'sine', dur: 0.26, gain: 0.04, delay: 0.02 });
    },

    buzzer(){
      this._tone({ freq: 220, to: 210, type: 'square', dur: 0.85, gain: 0.06 });
      this._tone({ freq: 110, to: 108, type: 'sawtooth', dur: 0.9, gain: 0.035 });
      this._noise({ dur: 0.6, freq: 1200, to: 600, gain: 0.04, filter:'bandpass', q: 1.4 });
    },

    beep(high = false){
      this._tone({ freq: high ? 1180 : 760, type: 'sine', dur: 0.16, gain: 0.075 });
      this._tone({ freq: high ? 590 : 380, type: 'triangle', dur: 0.14, gain: 0.03 });
    },

    tick(){
      this._tone({ freq: 1600, type: 'sine', dur: 0.045, gain: 0.022 });
    },

    ui(){
      this._tone({ freq: 640, to: 880, type: 'sine', dur: 0.08, gain: 0.045 });
      this._noise({ dur: 0.03, freq: 2600, to: 1800, gain: 0.012, q: 2 });
    },

    uiBack(){
      this._tone({ freq: 520, to: 300, type: 'sine', dur: 0.1, gain: 0.04 });
    },

    lock(){
      this._tone({ freq: 420, to: 840, type: 'triangle', dur: 0.18, gain: 0.07 });
      this._tone({ freq: 1260, type: 'sine', dur: 0.16, gain: 0.04, delay: 0.07 });
    },

    fire(){
      this._noise({ dur: 0.9, freq: 300, to: 1500, gain: 0.07, q: 0.8, attack: 0.1 });
      this._tone({ freq: 130, to: 260, type: 'sawtooth', dur: 0.7, gain: 0.03 });
      this.roar(0.7);
    }
  };
})();
