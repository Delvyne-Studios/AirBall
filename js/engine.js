/* ============================================================
   AIRBALL — engine: state, input, simulation
   ============================================================ */
(function(){
  const AB = window.AB = window.AB || {};
  const U = AB.U, C = AB.C, Art = AB.Art;

  const GAME_KEYS = new Set(['KeyA','KeyD','KeyW','KeyF','KeyL','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Escape']);

  const Engine = AB.Engine = {
    canvas: null, ctx: null,
    t: 0, last: 0, raf: null,
    mode: 'attract',
    paused: false,
    phase: 'attract',
    players: [],
    ball: null,
    theme: null,
    score: [0, 0],
    quarter: 1,
    clock: C.QUARTER_TIME,
    shotClock: C.SHOT_CLOCK,
    countdownT: 0,
    deadT: 0,
    deadNext: null,
    breakT: 0,
    awaitShot: false,
    awaitT: 0,
    particles: [],
    popups: [],
    shake: 0,
    flash: 0,
    slow: 0,
    crowdLevel: 0,
    stats: null,
    keys: {}, pressed: {}, released: {},
    hoops: null,
    attractT: 0,
    attractShotT: 4,
    beat: 0,
    ended: false,

    /* ============================================================
       init
       ============================================================ */
    init(){
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = true;
      this.hoops = [
        { netKick: 0, netSide: 0, rimFlash: 0 },
        { netKick: 0, netSide: 0, rimFlash: 0 }
      ];
      Art.init(Art.defaultTheme());
      this.setupAttract();

      window.addEventListener('keydown', e => this.onKeyDown(e));
      window.addEventListener('keyup', e => this.onKeyUp(e));
      window.addEventListener('blur', () => {
        this.keys = {}; this.pressed = {}; this.released = {};
        if (this.mode === 'match' && this.phase === 'live' && !this.paused) this.pause();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.mode === 'match' && this.phase === 'live' && !this.paused) this.pause();
      });

      this.last = performance.now();
      const loop = (now) => {
        this.raf = requestAnimationFrame(loop);
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (!(dt > 0)) dt = 0.016;
        dt = Math.min(dt, 0.05);
        this.update(dt);
        this.render();
        this.pressed = {}; this.released = {};
      };
      this.raf = requestAnimationFrame(loop);
    },

    /* ============================================================
       input
       ============================================================ */
    onKeyDown(e){
      const c = e.code;
      if (GAME_KEYS.has(c)) e.preventDefault();
      if (c === 'Escape'){
        if (this.mode === 'match' && this.phase !== 'over') this.togglePause();
        return;
      }
      if (e.repeat) return;
      if (this.mode !== 'match' || this.phase === 'over' || this.paused) return;
      if (!this.keys[c]) this.pressed[c] = true;
      this.keys[c] = true;
      AB.Audio.unlock();
    },

    onKeyUp(e){
      const c = e.code;
      if (GAME_KEYS.has(c)) e.preventDefault();
      if (this.keys[c]) this.released[c] = true;
      this.keys[c] = false;
    },

    down(c){ return !!this.keys[c]; },
    hit(c){ return !!this.pressed[c]; },
    up(c){ return !!this.released[c]; },

    /* ============================================================
       setups
       ============================================================ */
    makePlayer(data, idx){
      const attackDir = idx === 0 ? 1 : -1;
      return {
        idx, data, attackDir,
        jersey: idx,
        x: idx === 0 ? 620 : 980,
        vx: 0, z: 0, vz: 0,
        facing: attackDir,
        grounded: true,
        state: 'idle', stateT: 0,
        runPhase: 0, moveAmt: 0,
        onFire: false, fireT: 0, streak: 0,
        hasBall: false,
        charging: false, chargeT: 0, chargePower: 0, shotDist: 0,
        stealCd: 0, blockT: 0, stumbleT: 0, landT: 0,
        pickupLock: 0, graceT: 0,
        dribblePhase: 0, ballAnim: { x: 0, y: 0 },
        dunk: null, celebrate: 0,
        mouth: 0, runDust: 0,
        stats: { pts: 0, fga: 0, fgm: 0, dunks: 0, steals: 0, blocks: 0, bestStreak: 0 },
        pose: null
      };
    },

    setupAttract(){
      this.mode = 'attract';
      this.phase = 'attract';
      this.paused = false;
      this.ended = false;
      this.theme = Art.defaultTheme();
      Art.init(this.theme);
      this.players = [this.makePlayer(AB.byId('curry'), 0), this.makePlayer(AB.byId('jordan'), 1)];
      this.players[0].x = 592;
      this.players[1].x = 1042;
      this.players[1].facing = -1;
      this.players[0].hasBall = true;
      this.ball = this.makeBall(592 + 40, C.FLOOR_Y - 100, 'held', 0);
      this.ball.owner = this.players[0];
      this.players[0].dribblePhase = 0.2;
      this.attractT = 0;
      this.attractShotT = 3.6;
      this.score = [0, 0];
      this.quarter = 1;
      this.clock = C.QUARTER_TIME;
      this.shotClock = C.SHOT_CLOCK;
      this.particles = [];
      this.popups = [];
      this.stats = null;
    },

    makeBall(x, y, state, ownerIdx){
      return {
        x, y,
        vx: 0, vy: 0,
        r: C.BALL_R,
        rot: 0, spin: 0,
        state, owner: null,
        shooter: null,
        points: 2,
        catchable: true,
        scoreable: false,
        trail: [],
        lastBounce: 0,
        life: 0,
        hitRim: false,
        blocked: false,
        prevY: y,
        flash: 0
      };
    },

    themeFrom(d1, d2){
      return {
        a: { ...d1.colors, name: d1.short },
        b: { ...d2.colors, name: d2.short },
        p1: d1, p2: d2,
        label1: d1.short, label2: d2.short
      };
    },

    startMatch(d1, d2){
      AB.Audio.unlock();
      if (!d1) d1 = AB.byId(AB.DEFAULT_P1);
      if (!d2) d2 = AB.byId(AB.DEFAULT_P2);
      this.theme = this.themeFrom(d1, d2);
      Art.init(this.theme);
      this.players = [this.makePlayer(d1, 0), this.makePlayer(d2, 1)];
      this.score = [0, 0];
      this.quarter = 1;
      this.clock = C.QUARTER_TIME;
      this.shotClock = C.SHOT_CLOCK;
      this.particles = [];
      this.popups = [];
      this.flash = 0; this.shake = 0; this.slow = 0;
      this.crowdLevel = .35;
      this.ended = false;
      this.awaitShot = false;
      this.hoops.forEach(h => { h.netKick = 0; h.rimFlash = 0; });
      this.mode = 'match';
      this.paused = false;
      this.stats = [this.players[0].stats, this.players[1].stats];
      this.placeTipoff();
      this.phase = 'countdown';
      this.countdownT = 3.6;
      this.deadT = 0;
      AB.Audio.crowd(.45);
      if (AB.UI) AB.UI.enterMatch(this);
    },

    placeTipoff(){
      const [p1, p2] = this.players;
      p1.x = 592; p2.x = 1008;
      for (const p of this.players){
        p.z = 0; p.vx = 0; p.vz = 0; p.grounded = true; p.state = 'idle';
        p.hasBall = false; p.charging = false; p.dunk = null; p.stateT = 0;
        p.facing = p.attackDir;
        p.pickupLock = 0; p.graceT = 0; p.stumbleT = 0;
        p.dribblePhase = 0;
      }
      this.ball = this.makeBall(800, 246, 'loose', -1);
      this.ball.vy = 0;
      this.ball.catchable = true;
      this.ball.scoreable = false;
      this.shotClock = C.SHOT_CLOCK;
    },

    placePossession(offIdx){
      const off = this.players[offIdx], def = this.players[1 - offIdx];
      off.x = 800 - off.attackDir * 28;
      def.x = 800 + off.attackDir * 310;
      for (const p of this.players){
        p.z = 0; p.vx = 0; p.vz = 0; p.grounded = true; p.state = 'idle';
        p.charging = false; p.hasBall = false; p.dunk = null;
        p.stumbleT = 0; p.landT = 0; p.pickupLock = 0; p.graceT = 0; p.stateT = 0;
      }
      off.facing = off.attackDir;
      def.facing = -off.attackDir;
      off.hasBall = true;
      this.ball = this.makeBall(off.x + off.facing * 40, C.FLOOR_Y - 90, 'held', offIdx);
      this.ball.owner = off;
      off.dribblePhase = 0;
      this.shotClock = C.SHOT_CLOCK;
      this.phase = 'live';
      this.deadT = 0;
      this.deadNext = null;
      this.awaitShot = false;
    },

    restart(){
      const d1 = this.players[0] ? this.players[0].data : AB.byId(AB.DEFAULT_P1);
      const d2 = this.players[1] ? this.players[1].data : AB.byId(AB.DEFAULT_P2);
      this.startMatch(d1, d2);
    },

    quitToHome(){
      if (AB.UI) AB.UI.leaveMatch();
      this.setupAttract();
    },

    pause(){
      if (this.mode !== 'match' || this.phase === 'over') return;
      this.paused = true;
      this.keys = {}; this.pressed = {}; this.released = {};
      this.players.forEach(p => { if (p.charging) this.cancelCharge(p); });
      if (AB.UI) AB.UI.showPause(this);
      AB.Audio.uiBack();
    },

    resume(){
      if (!this.paused) return;
      this.paused = false;
      if (AB.UI) AB.UI.hideOverlay();
      AB.Audio.ui();
    },

    togglePause(){
      if (this.paused) this.resume(); else this.pause();
    },

    /* ============================================================
       helpers
       ============================================================ */
    rimXFor(p){ return p.attackDir > 0 ? C.RIM_R : C.RIM_L; },
    ownRim(p){ return p.attackDir > 0 ? C.RIM_R : C.RIM_L; },
    distToRim(p){ return Math.abs(p.x - this.ownRim(p)); },
    opponent(p){ return this.players[1 - p.idx]; },
    playerH(p){ return C.PLAYER_H * p.data.body.h; },

    addShake(v){ this.shake = Math.min(34, this.shake + v); },
    doFlash(v){ this.flash = Math.max(this.flash, v); },

    popup(text, x, y, color, size = 34, life = 1.5){
      this.popups.push({ text, x, y, color, size, life, t: 0, vy: -34 });
    },

    burst(x, y, color, n, kind = 'spark', spread = 260){
      for (let i = 0; i < n; i++){
        const a = Math.random() * U.TAU;
        const sp = U.rand(spread, spread * .2);
        this.particles.push({
          kind, x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - (kind === 'spark' ? 120 : 0),
          life: kind === 'confetti' ? U.rand(2.6, 1.6) : U.rand(1, .4),
          t: 0,
          color,
          size: kind === 'confetti' ? U.rand(8, 4) : U.rand(4.5, 1.5),
          rot: Math.random() * U.TAU,
          spin: U.rand(9, -9),
          grav: kind === 'confetti' ? 620 : (kind === 'dust' ? 80 : 1000)
        });
      }
    },

    /* ============================================================
       update
       ============================================================ */
    update(dt){
      this.t += dt;
      this.beat += dt;
      this.shake = Math.max(0, this.shake - dt * 60);
      this.flash = Math.max(0, this.flash - dt * 2.6);
      this.slow = Math.max(0, this.slow - dt);
      this.crowdLevel = Math.max(0, this.crowdLevel - dt * .18);
      this.updateParticles(dt);
      this.updatePopups(dt);

      if (this.mode === 'attract'){
        this.updateAttract(dt);
        return;
      }
      if (this.paused) return;

      if (this.phase === 'countdown'){
        this.countdownT -= dt;
        this.updatePlayers(dt, false);
        this.updateHoopAnim(dt);
        if (this.countdownT <= 0){
          this.phase = 'live';
          this.countdownT = 0;
          this.ball.vy = 40;
          this.popup('BALL!', 800, 300, '#ffd166', 46, .7);
          AB.Audio.roar(.5);
          this.shakeIt(2);
        }
        return;
      }

      if (this.phase === 'over'){
        this.updatePlayers(dt, false);
        this.updateHoopAnim(dt);
        return;
      }

      if (this.phase === 'break'){
        this.breakT -= dt;
        this.updatePlayers(dt, false);
        this.updateHoopAnim(dt);
        if (this.breakT <= 0) this.afterBreak();
        return;
      }

      if (this.phase === 'dead'){
        this.deadT -= dt;
        this.updatePlayers(dt, false);
        this.updateBall(dt, false);
        this.updateHoopAnim(dt);
        if (this.deadT <= 0 && this.deadNext){
          const fn = this.deadNext;
          this.deadNext = null;
          fn();
        }
        return;
      }

      if (this.phase === 'live'){
        this.clock = Math.max(0, this.clock - dt);
        this.shotClock -= dt;
        if (this.shotClock <= 0){
          this.shotClock = 0;
          this.violation();
          return;
        }
        this.updatePlayers(dt, true);
        this.updateBall(dt, true);
        this.updateHoopAnim(dt);

        if (this.awaitShot){
          this.awaitT -= dt;
          if (this.awaitT <= 0) this.endQuarter();
        } else if (this.clock <= 0){
          if (this.ball.state === 'shot' && this.ball.shooter){
            this.awaitShot = true;
            this.awaitT = 1.7;
          } else {
            this.endQuarter();
          }
        }
      }
    },

    shakeIt(v){ this.addShake(v); },

    updateAttract(dt){
      this.attractT += dt;
      const p1 = this.players[0], p2 = this.players[1];
      p1.state = 'idle'; p2.state = 'idle';
      p1.facing = p1.attackDir;
      p2.facing = -1;
      // slow sway / warmup
      p2.x = 1042 + Math.sin(this.attractT * .5) * 14;
      p1.x = 592 + Math.cos(this.attractT * .4) * 10;
      p1.hasBall = true;
      this.ball.state = 'held';
      this.ball.owner = p1;
      p1.dribblePhase = (p1.dribblePhase + dt * 1.7) % 1;
      const k = Math.abs(Math.sin(p1.dribblePhase * Math.PI));
      this.ball.x = p1.x + 40;
      this.ball.y = C.FLOOR_Y - 28 - k * 84;
      p1.ballAnim = { x: this.ball.x, y: this.ball.y };
      this.ball.rot += dt * 2;
      for (const p of this.players){
        p.stateT += dt;
        p.moveAmt = 0;
        p.z = 0;
      }
      this.updateHoopAnim(dt);
    },

    updateHoopAnim(dt){
      for (const h of this.hoops){
        h.netKick = Math.max(0, h.netKick - dt * 2.2);
        h.rimFlash = Math.max(0, h.rimFlash - dt * 2.5);
        h.netSide *= (1 - dt * 2);
      }
    },

    updatePlayers(dt, allowInput){
      for (const p of this.players){
        p.stateT += dt;
        p.stealCd = Math.max(0, p.stealCd - dt);
        p.blockT = Math.max(0, p.blockT - dt);
        p.stumbleT = Math.max(0, p.stumbleT - dt);
        p.landT = Math.max(0, p.landT - dt);
        p.celebrate = Math.max(0, p.celebrate - dt);
        p.pickupLock = Math.max(0, p.pickupLock - dt);
        p.graceT = Math.max(0, p.graceT - dt);
        p.fireT = Math.max(0, p.fireT - dt);
        if (p.fireT <= 0) p.onFire = false;

        const canAct = allowInput && !p.stumbleT && !p.landT && !p.dunk;

        // input
        const L = p.idx === 0;
        const kLeft = L ? 'KeyA' : 'ArrowLeft';
        const kRight = L ? 'KeyD' : 'ArrowRight';
        const kJump = L ? 'KeyW' : 'ArrowUp';
        const kAct = L ? 'KeyF' : 'KeyL';
        let dir = 0;
        if (canAct && this.mode === 'match'){
          if (this.down(kLeft)) dir -= 1;
          if (this.down(kRight)) dir += 1;
        }

        if (allowInput){
          if (this.hit(kJump) && p.grounded && canAct) this.jump(p);
          if (this.hit(kAct) && canAct) this.action(p);
        }

        // movement: SPEED stat drives court velocity with massive impact
        const maxSpd = (260 + p.data.attrs.spd * 1.55) * (p.hasBall ? 0.95 : 1) * (p.onFire ? 1.05 : 1);
        const accel = p.grounded ? 2450 : 1200;
        if (p.dunk){
          this.updateDunk(p, dt);
        } else {
          if (dir !== 0) p.vx += dir * accel * dt;
          else p.vx *= Math.exp(-(p.grounded ? 11 : 2.2) * dt);
          p.vx = U.clamp(p.vx, -maxSpd, maxSpd);
          if (Math.abs(p.vx) > maxSpd && dir === 0) p.vx = U.sign(p.vx) * maxSpd;
          p.x += p.vx * dt;
          p.x = U.clamp(p.x, C.COURT_L + 36, C.COURT_R - 36);

          // jump physics: POWER stat drives vertical elevation
          if (!p.grounded){
            p.z += p.vz * dt;
            p.vz += C.GRAVITY * dt;
            if (p.z <= 0){
              p.z = 0; p.vz = 0; p.grounded = true;
              p.landT = .12;
              AB.Audio.land(this.pan(p.x), .8);
              this.burst(p.x, C.FLOOR_Y - 2, '#caa173', 5, 'dust', 90);
              if (p.hasBall) p.state = 'idle';
            }
          }
        }

        // facing
        if (p.dunk && p.dunk.t > 0){
          p.facing = p.attackDir;
        } else if (p.hasBall && Math.abs(p.vx) < 45){
          p.facing = p.attackDir;
        } else if (Math.abs(p.vx) > 40){
          p.facing = U.sign(p.vx);
        } else if (!p.hasBall && this.ball && this.ball.state !== 'held'){
          p.facing = this.ball.x >= p.x ? 1 : -1;
        }

        // run animation
        p.moveAmt = U.clamp(Math.abs(p.vx) / 330, 0, 1);
        if (p.grounded && Math.abs(p.vx) > 26){
          p.runPhase += dt * (7.4 + p.moveAmt * 6.4) * U.sign(p.vx || 1);
          p.runDust += dt * (7 + p.moveAmt * 6);
          if (p.runDust > 1){
            p.runDust = 0;
            if (p.moveAmt > .5) this.particles.push({
              kind: 'dust', x: p.x - U.sign(p.vx) * 14, y: C.FLOOR_Y - 2,
              vx: U.rand(-30, -90) * U.sign(p.vx || 1), vy: U.rand(-10, -40),
              life: .5, t: 0, color: '#b98a58', size: U.rand(5, 2), rot: 0, spin: 0, grav: 40
            });
          }
        }

        // state
        if (p.dunk) {
          // handled by updateDunk
        } else if (p.state === 'winner_celebrate') {
          // winner celebration pose
        } else if (p.state === 'loser_crying') {
          // loser crying pose: emit tear particles
          if (Math.random() < dt * 9) {
            this.particles.push({
              kind: 'tear',
              x: p.x + (Math.random() < 0.5 ? -8 : 8),
              y: C.FLOOR_Y - p.z - this.playerH(p) * 0.76,
              vx: U.rand(-12, 12),
              vy: U.rand(30, 90),
              life: 0.7,
              t: 0,
              color: '#5cd5f8',
              size: U.rand(3.5, 2),
              rot: 0,
              spin: 0,
              grav: 190
            });
          }
        } else if (p.celebrate > 0) {
          p.state = 'celebrate';
        } else if (p.stumbleT > 0) {
          p.state = 'stumble';
          if (Math.random() < dt * 6) {
            const ang = Math.random() * Math.PI * 2;
            this.particles.push({
              kind: 'stun_star',
              x: p.x + Math.cos(ang) * 18,
              y: C.FLOOR_Y - p.z - this.playerH(p) - 10 + Math.sin(ang) * 6,
              vx: Math.cos(ang) * 20,
              vy: -15,
              rot: ang,
              spin: 5,
              life: 0.6,
              t: 0,
              color: '#ffd166',
              size: 5,
              grav: 0
            });
          }
        } else if (!p.grounded) {
          p.state = (p.state === 'block') ? 'block' : 'jump';
        } else if (p.state === 'steal' && p.stateT < .26) {
          p.state = 'steal';
        } else if (p.state === 'release' && p.stateT < .22) {
          p.state = 'release';
        } else if (p.landT > 0) {
          p.state = 'land';
        } else if (Math.abs(p.vx) > 26) {
          p.state = 'run';
        } else {
          p.state = 'idle';
        }

        // fire particles
        if (p.onFire && Math.random() < dt * 16){
          this.particles.push({ kind:'fire', x: p.x + U.rand(-18,18), y: C.FLOOR_Y - p.z - U.rand(10, 90), vx: U.rand(-10,10), vy: -U.rand(40,110), life: .55, t: 0, color: Math.random() < .5 ? '#ff8a2a' : '#ffc247', size: U.rand(7,3), rot: 0, spin: 0, grav: -50 });
        }
      }

      // NOTE: Physical body-blocking collision removed so players glide smoothly past each other!

      // dribble sound
      for (const p of this.players){
        if (p.hasBall && p.state !== 'dunk' && p.state !== 'release'){
          const prev = p.dribblePhase;
          p.dribblePhase = (p.dribblePhase + dt * (1.65 + p.moveAmt * 1.5)) % 1;
          if (p.dribblePhase < prev){
            AB.Audio.dribble(p.moveAmt > .5 ? 1 : .6, this.pan(p.x));
          }
        } else if (p.hasBall) {
          p.dribblePhase = (p.dribblePhase + dt * .8) % 1;
        }
      }
    },

    pan(x){ return U.clamp((x / C.W - .5) * 1.5, -.85, .85); },

    jump(p){
      const jh = (105 + p.data.attrs.pwr * 0.62) * (p.onFire ? 1.05 : 1);
      p.vz = -Math.sqrt(2 * C.GRAVITY * jh);
      p.z = Math.max(1, p.z);
      p.grounded = false;
      p.landT = 0;
      AB.Audio.jump(this.pan(p.x));
      if (!p.hasBall && !p.dunk) p.state = 'block';
      p.blockT = 0.42;
      this.burst(p.x, C.FLOOR_Y - 1, '#c9a274', 5, 'dust', 70);
    },

    dunkDist(p){
      return C.DUNK_DIST * (0.8 + (p.data.attrs.dnk / 100) * 0.45);
    },

    action(p){
      if (p.stumbleT > 0 || p.landT > 0) return;
      if (p.hasBall){
        if (p.dunk) return;
        // Check dunk range: if grounded and near rim
        if (p.grounded && this.distToRim(p) < this.dunkDist(p)){
          this.startDunk(p);
        } else {
          // Direct shot! (in mid-air gives jump shot boost)
          this.directShoot(p, !p.grounded);
        }
        return;
      }

      // Defender action without ball:
      if (!p.grounded){
        // In mid-air: block attempt
        p.blockT = 0.45;
        p.state = 'block';
        AB.Audio.jump(this.pan(p.x));
        return;
      }
      // On ground: steal attempt (with 1-second anti-spam stun if whiffed/missed)
      this.trySteal(p);
    },

    cancelCharge(p){
      p.charging = false;
      if (p.state === 'charge') p.state = 'idle';
    },

    /* Direct shooting mechanism — no timing hold! */
    directShoot(p, isJumpShot){
      if (!p.hasBall) return;
      const rimX = this.ownRim(p);
      const dist = Math.abs(p.x - rimX);
      const three = dist > C.THREE_DIST;
      const a = p.data.attrs;

      // Accuracy directly derived from player SHT stat
      const base = (a.sht / 100) * 0.94;
      const rangeK = three ? U.clamp(1.0 - (dist - C.THREE_DIST) / 850 * 0.16, 0.82, 1.0) : 1.0;
      let contest = this.contestFactor(p);
      if (isJumpShot){
        // Mid-air jump shot clears defender contest significantly
        contest = 1 - (1 - contest) * 0.4;
      }
      const jumpBonus = isJumpShot ? 0.10 : 0.0;
      const fire = p.onFire ? 0.08 : 0;
      const clutch = ((this.quarter >= 4) && this.clock < 20) ? ((a.pwr / 100) * 0.06) : 0;
      let acc = U.clamp(base * rangeK * contest + jumpBonus + fire + clutch, 0.16, 0.99);

      p.state = 'release';
      p.stateT = 0;
      p.stumbleT = 0.18;
      p.stats.fga++;
      const points = three ? 3 : 2;

      const isMake = Math.random() < acc;
      let ex = 0;
      if (isMake){
        ex = (Math.random() - 0.5) * 8; // gentle swish inside the rim
      } else {
        ex = (Math.random() < 0.5 ? -1 : 1) * U.rand(28, 55); // iron miss
      }
      const et = (Math.random() - 0.5) * 0.05;

      const handX = p.x + p.facing * 24;
      const handY = C.FLOOR_Y - p.z - 1.22 * this.playerH(p);
      const tx = rimX + ex * p.attackDir;
      const ty = C.RIM_Y - 5;
      const flight = U.clamp(0.74 + dist / 1550, 0.78, 1.16) + et;

      const b = this.ball;
      b.state = 'shot';
      b.owner = null;
      p.hasBall = false;
      b.shooter = p;
      b.points = points;
      b.scoreable = true;
      b.catchable = false;
      b.blocked = false;
      b.hitRim = false;
      b.trail = [];
      b.x = handX; b.y = handY;

      const dragK = (1 - Math.exp(-.16 * flight)) / .16;
      b.vx = (tx - handX) / dragK;
      b.vy = (ty - handY - .5 * C.GRAVITY * flight * flight) / flight;
      b.spin = -U.sign(b.vx) * 9;
      b.life = 0;
      b.flash = isJumpShot ? 2 : 1;

      if (isJumpShot){
        this.popup('JUMP SHOT! +10% ACC', p.x, C.FLOOR_Y - p.z - 220, '#7be8ff', 24, 0.95);
      }
      if (p.onFire){
        this.popup('HEAT CHECK!', p.x, C.FLOOR_Y - p.z - 250, '#ff9a3c', 26, 1.1);
      }
      AB.Audio.jump(this.pan(p.x));
      this.burst(handX, handY, '#ffcf85', isJumpShot ? 10 : 6, 'spark', 150);
    },

    contestFactor(shooter){
      const d = this.opponent(shooter);
      const dx = Math.abs(d.x - shooter.x);
      if (dx > 140) return 1;
      let c = 1 - (1 - U.clamp(dx / 140, 0, 1)) * 0.28;
      if (dx < 90) c -= 0.14;
      if (d.z > 20) c -= 0.10 * U.clamp(d.z / 140, 0.25, 1);
      if (d.blockT > 0) c -= 0.08;
      c -= (d.data.attrs.def / 100) * 0.10;
      return U.clamp(c, 0.50, 1.0);
    },

    /* ---------------- steal with 1-second anti-spam stun ---------------- */
    trySteal(def){
      if (def.stealCd > 0 || def.stumbleT > 0) return;
      def.stealCd = 0.5;
      const off = this.players.find(p => p.hasBall);

      // If no opponent has ball or too far: WHIFF with 1-second stun penalty!
      if (!off || off === def){
        def.stumbleT = 1.0;
        def.vx = 0;
        def.state = 'stumble';
        def.stateT = 0;
        this.popup('WHIFF! (1s STUN)', def.x, C.FLOOR_Y - def.z - 200, '#ff9668', 22, 1.0);
        this.spawnStunBurst(def);
        AB.Audio.land(this.pan(def.x), 0.5);
        return;
      }

      const dx = off.x - def.x;
      const near = Math.abs(dx) < 110 && Math.abs(off.z - def.z) < 70;
      if (!near){
        def.stumbleT = 1.0;
        def.vx = 0;
        def.state = 'stumble';
        def.stateT = 0;
        this.popup('WHIFF! (1s STUN)', def.x, C.FLOOR_Y - def.z - 200, '#ff9668', 22, 1.0);
        this.spawnStunBurst(def);
        AB.Audio.land(this.pan(def.x), 0.5);
        return;
      }

      if (off.graceT > 0 || off.state === 'dunk'){
        def.stumbleT = 1.0;
        def.vx = 0;
        def.state = 'stumble';
        def.stateT = 0;
        this.popup('STUNNED! (1s)', def.x, C.FLOOR_Y - def.z - 200, '#ff6e59', 24, 1.0);
        this.spawnStunBurst(def);
        return;
      }

      // Steal success based on DEF stat vs handler
      const stealChance = U.clamp(0.28 + (def.data.attrs.def - 50) / 120, 0.15, 0.70);
      if (Math.random() < stealChance){
        // Knock ball loose!
        const b = this.ball;
        b.state = 'loose';
        b.owner = null;
        off.hasBall = false;
        off.stumbleT = 0.35;
        off.state = 'stumble';
        off.stateT = 0;
        b.catchable = true;
        b.scoreable = false;
        b.shooter = null;
        const away = U.sign(off.x - def.x) || def.facing;
        b.x = off.x + away * 26;
        b.y = C.FLOOR_Y - 92;
        b.vx = away * U.rand(300, 190) + def.vx * 0.2;
        b.vy = U.rand(-520, -360);
        b.spin = away * 12;
        off.pickupLock = 0.46;
        def.pickupLock = 0.12;
        AB.Audio.steal(this.pan(def.x));
        this.popup('STRIPPED!', off.x, C.FLOOR_Y - 190, '#9fe8ff', 28, 1.1);
        this.addShake(5);
        this.crowdLevel = Math.min(1, this.crowdLevel + 0.3);
        AB.Audio.roar(0.35);
        def.stats.steals++;
        this.burst(b.x, b.y, '#ffffff', 8, 'spark', 200);
      } else {
        // Failed steal attempt -> 1-second STUN!
        def.stumbleT = 1.0;
        def.vx = 0;
        def.state = 'stumble';
        def.stateT = 0;
        this.popup('MISSED! (1s STUN)', def.x, C.FLOOR_Y - def.z - 200, '#ff6e59', 24, 1.0);
        this.spawnStunBurst(def);
        AB.Audio.land(this.pan(def.x), 0.6);
      }
    },

    spawnStunBurst(p){
      for (let i = 0; i < 6; i++){
        const ang = (i / 6) * Math.PI * 2;
        this.particles.push({
          kind: 'stun_star',
          x: p.x + Math.cos(ang) * 20,
          y: C.FLOOR_Y - p.z - this.playerH(p) - 12 + Math.sin(ang) * 6,
          vx: Math.cos(ang + 0.5) * 30,
          vy: Math.sin(ang + 0.5) * 15,
          rot: ang,
          spin: 6,
          life: 0.9,
          t: 0,
          color: '#ffd166',
          size: 6,
          grav: 0
        });
      }
    },

    /* ---------------- epic upgraded dunk ---------------- */
    startDunk(p){
      if (!p.hasBall) return;
      const rimX = this.ownRim(p);
      p.stats.fga++;
      const dnk = p.data.attrs.dnk;
      const pwr = p.data.attrs.pwr;
      const peak = 210 + (dnk / 100) * 45;
      p.dunk = {
        t: 0,
        dur: 1.15,
        sx: p.x, sz: p.z,
        tx: U.clamp(rimX - p.attackDir * 64, C.COURT_L + 50, C.COURT_R - 50),
        peak: peak,
        scored: false,
        blocked: false,
        slam: false,
        style: dnk > 95 ? (pwr > 95 ? 'power_shatter' : 'tomahawk') : (dnk > 85 ? 'one_hand_slam' : 'layup_dunk')
      };
      p.state = 'dunk';
      p.stateT = 0;
      p.graceT = 2.0;
      const b = this.ball;
      b.state = 'dunk';
      b.owner = p;
      b.shooter = p;
      b.points = 2;
      b.catchable = false;
      b.scoreable = false;
      b.blocked = false;
      AB.Audio.jump(this.pan(p.x));
      this.crowdLevel = Math.min(1, this.crowdLevel + 0.35);
      this.popup('DUNK TAKE OFF!', p.x, C.FLOOR_Y - 240, p.idx === 0 ? C.P1_COLOR : C.P2_COLOR, 32, 1.0);
      this.burst(p.x, C.FLOOR_Y - 4, '#c9a274', 10, 'dust', 140);
    },

    updateDunk(p, dt){
      const d = p.dunk;
      d.t += dt;
      const k = U.clamp(d.t / d.dur, 0, 1);
      // Enhanced 5-phase trajectory:
      // 0 to 0.18: explosive crouch & launch
      // 0.18 to 0.60: soaring apex flight toward rim with ball cocked back
      // 0.60 to 0.74: thunderous slam down through the net
      // 0.74 to 0.88: rim hang with leg swing momentum
      // 0.88 to 1.0: drop and landing absorption
      let z = 0;
      if (k < .18){
        z = U.easeInCubic(k / .18) * 25;
      } else if (k < .60){
        z = 25 + U.easeOutCubic((k - .18) / .42) * (d.peak - 25);
      } else if (k < .74){
        z = d.peak - U.easeInCubic((k - .60) / .14) * 28;
      } else if (k < .88){
        z = d.peak - 28 + Math.sin((k - .74) / .14 * Math.PI) * 5;
      } else {
        z = U.lerp(d.peak - 28, 0, U.easeInCubic((k - .88) / .12));
      }
      p.z = Math.max(0, z);

      const xk = U.clamp((k - .10) / .52, 0, 1);
      p.x = U.lerp(d.sx, d.tx, U.easeOutCubic(xk));
      p.grounded = p.z <= 0 && k > .95;
      p.vz = 0;

      // Ball tracking during dunk
      const b = this.ball;
      b.state = 'dunk';
      b.owner = p;
      const H = this.playerH(p);
      if (k < .60){
        // cocked back over head
        b.x = p.x - p.attackDir * 18 + (k > .3 ? p.attackDir * 32 * ((k - .3) / .3) : 0);
        b.y = C.FLOOR_Y - p.z - 1.25 * H;
      } else if (k < .74){
        // slammed through the net
        b.x = p.x + p.attackDir * 34;
        b.y = C.RIM_Y + 18 + (k - .60) / .14 * 24;
      } else {
        if (b.owner === p){
          b.owner = null;
          b.state = 'loose';
          b.catchable = true;
          b.vx = p.attackDir * 40;
          b.vy = 180;
        }
      }

      // Block window
      if (!d.blocked && k > .18 && k < .58){
        const def = this.opponent(p);
        if (def.blockT > 0 && def.z > 35 && Math.abs(def.x - p.x) < 150){
          const blockChance = (def.data.attrs.def - p.data.attrs.dnk * 0.5) / 100;
          if (Math.random() < Math.max(0.1, blockChance)){
            d.blocked = true;
            p.dunk = null;
            p.state = 'stumble'; p.stateT = 0;
            p.stumbleT = .6;
            p.z = Math.max(p.z, 60);
            p.vz = -80;
            b.state = 'loose';
            b.owner = null;
            b.catchable = true;
            b.scoreable = false;
            b.shooter = null;
            b.x = p.x - p.attackDir * 20;
            b.y = C.FLOOR_Y - p.z - 140;
            b.vx = -p.attackDir * 260;
            b.vy = -260;
            p.hasBall = false;
            def.stats.blocks++;
            this.addShake(18);
            this.doFlash(.5);
            this.popup('STUFFED!', p.x, C.FLOOR_Y - 300, '#ff6b4a', 42, 1.4);
            AB.Audio.block(this.pan(def.x));
            AB.Audio.roar(.95);
            this.crowdLevel = 1;
            this.burst(b.x, b.y, '#ffd27a', 26, 'spark', 420);
            return;
          }
        }
      }

      // Slam moment
      if (!d.blocked && k >= .60 && !d.slam){
        d.slam = true;
        const rimIdx = p.attackDir > 0 ? 1 : 0;
        this.hoops[rimIdx].netKick = 2.2;
        this.hoops[rimIdx].netSide = p.attackDir * 1.5;
        this.hoops[rimIdx].rimFlash = 1.2;
        this.addShake(22);
        this.doFlash(.6);
        AB.Audio.swish(this.pan(p.x));
        AB.Audio.dribble(1.5, this.pan(p.x));
        AB.Audio.roar(1.0, this.pan(p.x));
        this.scoreBasket(p, 2, true, rimIdx);
      }

      if (k >= 1){
        p.dunk = null;
        p.state = 'land';
        p.stateT = 0;
        p.z = 0; p.grounded = true; p.vz = 0;
        p.landT = .2;
        p.hasBall = false;
        AB.Audio.land(this.pan(p.x), 1.4);
        this.burst(p.x, C.FLOOR_Y - 2, '#c9a274', 8, 'dust', 100);
      }
    },

    /* ---------------- scoring with celebration ---------------- */
    scoreBasket(p, points, isDunk, rimIdx){
      const team = rimIdx === 0 ? 1 : 0;   // left rim -> P2, right rim -> P1
      const scorer = this.players[team];
      const shooter = p || scorer;
      this.score[team] += points;
      scorer.streak = (shooter === scorer) ? scorer.streak + 1 : 1;
      scorer.stats.pts += points;
      if (shooter === scorer){
        scorer.stats.fgm++;
        if (isDunk) scorer.stats.dunks++;
      }
      scorer.stats.bestStreak = Math.max(scorer.stats.bestStreak, scorer.streak);
      if (scorer.streak >= 3 && !scorer.onFire){
        scorer.onFire = true;
        scorer.fireT = 18;
        AB.Audio.fire();
        this.popup('ON FIRE!', scorer.x, C.FLOOR_Y - 260, '#ffb03a', 36, 1.5);
        this.burst(scorer.x, C.FLOOR_Y - 120, '#ff8a2a', 24, 'spark', 260);
      } else if (scorer.onFire){
        scorer.fireT = Math.max(scorer.fireT, 12);
      }

      const rimX = rimIdx === 0 ? C.RIM_L : C.RIM_R;
      const col = team === 0 ? C.P1_COLOR : C.P2_COLOR;
      this.doFlash(isDunk ? .6 : .25);
      this.addShake(isDunk ? 20 : 6);
      this.popup(`+${points}`, rimX, C.RIM_Y - 60, col, isDunk ? 54 : 42, 1.3);
      const words = isDunk ? ['MONSTER SLAM!', 'POSTERIZED!', 'SHATTERED!'] : (points === 3 ? ['SPLASH!', 'LIMITLESS!', 'FROM DOWNTOWN!'] : ['BUCKET!', 'TOO EASY!', 'AND ONE!']);
      this.popup(words[(Math.random() * words.length) | 0], rimX, C.RIM_Y - 115, '#ffffff', 24, 1.4);
      this.burst(rimX, C.RIM_Y + 20, '#ffd27a', isDunk ? 32 : 16, 'spark', 380);
      AB.Audio.swish(this.pan(rimX));
      AB.Audio.roar(isDunk ? 1 : .65, this.pan(rimX));
      this.crowdLevel = Math.min(1, this.crowdLevel + (isDunk ? .7 : .4));
      this.slow = isDunk ? .4 : 0;

      // Small score celebration for scorer!
      scorer.celebrate = 1.8;
      scorer.state = 'celebrate';
      scorer.stateT = 0;

      this.phase = 'dead';
      this.deadT = isDunk ? 2.2 : 1.6;
      this.deadNext = () => this.placePossession(1 - team);
      this.ballFanfare(rimX);
    },

    ballFanfare(rimX){
      // little confetti from the rim
      for (let i = 0; i < 18; i++){
        this.particles.push({
          kind: 'confetti',
          x: rimX + U.rand(-40, 40), y: C.RIM_Y + 30,
          vx: U.rand(-180, 180), vy: U.rand(-460, -160),
          life: U.rand(2.2, 1.2), t: 0,
          color: U.pick(['#ffd166', '#ff7a1a', '#37d9ff', '#ffffff', '#ff4d7e']),
          size: U.rand(8, 4), rot: Math.random() * 6, spin: U.rand(10, -10), grav: 520
        });
      }
    },

    /* ---------------- ball ---------------- */
    updateBall(dt, live){
      const b = this.ball;
      b.prevY = b.y;
      b.rot += b.spin * dt;

      if (b.state === 'held' || b.state === 'dunk'){
        const p = this.players.find(x => x.hasBall) || b.owner;
        if (!p) { b.state = 'loose'; b.catchable = true; return; }
        if (b.state === 'held' && p.charging){
          const ch = U.clamp(p.chargePower, 0, 1.15);
          const H = this.playerH(p);
          b.x = p.x + p.facing * .16 * H;
          b.y = C.FLOOR_Y - p.z - (.72 + .41 * U.clamp(ch, 0, 1)) * H;
          p.ballAnim = { x: b.x, y: b.y };
          b.vx = 0; b.vy = 0;
        } else if (b.state === 'held'){
          const k = Math.abs(Math.sin(p.dribblePhase * Math.PI));
          b.x = p.x + p.facing * 40;
          b.y = C.FLOOR_Y - p.z - 28 - k * (86 - U.clamp(Math.abs(p.vx) * .05, 0, 14));
          p.ballAnim = { x: b.x, y: b.y };
          b.vx = 0; b.vy = 0;
        }
        if (b.trail.length) b.trail.length = 0;
        return;
      }

      // physics
      b.vy += C.GRAVITY * dt;
      b.vx *= Math.exp(-.16 * dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life += dt;

      if (b.state === 'shot'){
        // block check
        if (b.life < .34){
          for (const d of this.players){
            if (d === b.shooter || d.blockT <= 0) continue;
            if (!d.data) continue;
            const hh = this.playerH(d);
            const hx = d.x + d.facing * 20;
            const hy = C.FLOOR_Y - d.z - (1.0 + (d.z > 20 ? .1 : 0)) * hh;
            if (U.dist(b.x, b.y, hx, hy) < 62 || U.dist(b.x, b.y, hx, hy - 30) < 56){
              this.blockShot(d, b);
              break;
            }
          }
        }
      }

      // rim collisions
      for (let s = 0; s < 2; s++){
        const rimX = s === 0 ? C.RIM_L : C.RIM_R;
        for (const side of [-1, 1]){
          const cx = rimX + side * (C.RIM_HALF - 3);
          const cy = C.RIM_Y;
          const dx = b.x - cx, dy = b.y - cy;
          const dist = Math.hypot(dx, dy);
          const rr = b.r + C.RIM_RADIUS;
          if (dist < rr && dist > .01){
            const nx = dx / dist, ny = dy / dist;
            b.x = cx + nx * rr;
            b.y = cy + ny * rr;
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0){
              b.vx -= 1.5 * vn * nx;
              b.vy -= 1.5 * vn * ny;
              b.vx *= .82; b.vy *= .82;
              b.vx += U.rand(-40, 40);
              b.spin += U.rand(-6, 6);
              b.hitRim = true;
              b.catchable = true;
              if (b.state === 'shot') b.scoreable = true;
              const hi = s === 0 ? 0 : 1;
              this.hoops[hi].rimFlash = 1;
              this.hoops[hi].netKick = Math.max(this.hoops[hi].netKick, .35);
              AB.Audio.rim(this.pan(cx));
              this.addShake(2.2);
              this.burst(cx, cy, '#ffb15a', 4, 'spark', 150);
            }
          }
        }
      }

      // backboard
      const boardInner = b.x > 800 ? C.BOARD_R_X - C.BOARD_W : C.BOARD_L_X + C.BOARD_W;
      const nearBoard = Math.abs(b.x - boardInner) < b.r + 4;
      if (nearBoard && b.y > C.BOARD_TOP && b.y < C.BOARD_BOT){
        const away = b.x > 800 ? -1 : 1;
        if (U.sign(b.vx) === -away || Math.abs(b.vx) < 1){
          b.x = boardInner + away * (b.r + 5);
          b.vx = away * Math.abs(b.vx) * .62 + away * 30;
          b.vy *= .9;
          b.spin *= .7;
          b.catchable = true;
          if (b.state === 'shot') b.scoreable = true;
          AB.Audio.glass(this.pan(b.x));
          this.addShake(3.5);
          this.burst(b.x, b.y, '#cfe8ff', 5, 'spark', 130);
        }
      }

      // score detection
      if (b.state === 'shot' && b.scoreable && b.vy > 0){
        for (let s = 0; s < 2; s++){
          const rimX = s === 0 ? C.RIM_L : C.RIM_R;
          if (b.prevY < C.RIM_Y - 2 && b.y >= C.RIM_Y - 2 && b.y < C.RIM_Y + 36 &&
              Math.abs(b.x - rimX) < 33){
            this.hoops[s].netKick = 1;
            this.hoops[s].netSide = U.sign(b.vx);
            const shooter = b.shooter || this.players[0];
            this.scoreBasket(shooter, b.points, false, s);
            b.scoreable = false;
            b.catchable = false;
            b.vx *= .25;
            b.vy = Math.max(b.vy, 200);
            return;
          }
        }
      }

      // floor
      if (b.y + b.r > C.FLOOR_Y){
        b.y = C.FLOOR_Y - b.r;
        if (Math.abs(b.vy) > 60){
          b.vy = -Math.abs(b.vy) * .66;
          b.vx *= .9;
          b.spin = b.vx * .02;
          b.catchable = true;
          if (b.state === 'shot') b.scoreable = true;
          AB.Audio.bounce(U.clamp(Math.abs(b.vy) / 480, .3, 1), this.pan(b.x));
          this.burst(b.x, C.FLOOR_Y, '#d6a56b', 4, 'dust', 70);
        } else {
          b.vy = 0;
          b.vx *= Math.exp(-5 * dt);
          b.catchable = true;
          if (b.state === 'shot'){
            // shot is over
            if (b.shooter) b.shooter.streak = 0;
            b.state = 'loose';
            b.shooter = null;
            b.scoreable = false;
            this.missResolved(b.x);
          }
        }
      }

      // screen edges
      if (b.x < 30 && b.vx < 0){ b.x = 30; b.vx = Math.abs(b.vx) * .5; }
      if (b.x > C.W - 30 && b.vx > 0){ b.x = C.W - 30; b.vx = -Math.abs(b.vx) * .5; }
      if (b.y < 40 && b.vy < 0){ b.y = 40; b.vy = Math.abs(b.vy) * .4; }

      // trail
      if (b.state === 'shot' || b.state === 'loose'){
        if (b.state === 'shot' || Math.abs(b.vy) > 300){
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 12) b.trail.shift();
        }
      }

      // pickups
      if (live && b.state !== 'dunk' && b.catchable){
        this.checkPickup();
      }

    },

    blockShot(def, b){
      b.blocked = true;
      b.state = 'loose';
      b.scoreable = false;
      b.catchable = true;
      if (b.shooter) b.shooter.streak = 0;
      b.shooter = null;
      b.vx = -b.vx * .35 + def.facing * 240;
      b.vy = 200;
      b.spin = 8;
      b.trail.length = 0;
      def.stats.blocks++;
      this.popup('BLOCKED!', b.x, b.y - 45, '#ff6b4a', 34, 1.2);
      this.addShake(12);
      this.doFlash(.32);
      this.slow = .3;
      AB.Audio.block(this.pan(def.x));
      AB.Audio.roar(.8);
      this.crowdLevel = 1;
      this.burst(b.x, b.y, '#ffffff', 16, 'spark', 320);
    },

    missResolved(x){
      this.crowdLevel = Math.max(.1, this.crowdLevel - .1);
    },

    checkPickup(){
      const b = this.ball;
      if (b.state === 'held') return;
      let best = null, bestD = 1e9;
      for (const p of this.players){
        if (p.pickupLock > 0) continue;
        if (p.state === 'dunk') continue;
        const h = this.playerH(p);
        const top = C.FLOOR_Y - p.z - (0.98 + (p.z > 20 ? .14 : 0)) * h;
        const bottom = C.FLOOR_Y - p.z - 8;
        const cx = p.x + p.facing * 10;
        const cy = U.clamp(b.y, top, bottom);
        const d = U.dist(b.x, b.y, cx, cy);
        if (d < 52 && d < bestD){ bestD = d; best = p; }
      }
      if (best){
        this.giveBall(best);
      }
    },

    giveBall(p){
      const b = this.ball;
      if (b.state === 'shot'){
        // missed shot / rebound
        if (b.shooter) b.shooter.streak = 0;
        b.shooter = null;
      }
      b.state = 'held';
      b.owner = p;
      b.lastTouch = p;
      b.catchable = false;
      b.scoreable = false;
      b.trail.length = 0;
      b.shooter = null;
      p.hasBall = true;
      p.charging = false;
      p.chargeT = 0;
      p.pickupLock = 0;
      p.graceT = .34;
      p.stumbleT = 0;
      p.dribblePhase = 0;
      p.state = 'idle';
      // new possession -> reset shot clock if the other team had it
      this.shotClock = C.SHOT_CLOCK;
      AB.Audio.grab(this.pan(p.x));
      this.burst(b.x, b.y, '#ffd9a3', 6, 'spark', 150);
      this.popup(p.idx === 0 ? 'P1 BALL' : 'P2 BALL', p.x, C.FLOOR_Y - 250, p.idx === 0 ? C.P1_COLOR : C.P2_COLOR, 16, .7);
    },

    /* ---------------- rules ---------------- */
    violation(){
      if (this.phase !== 'live') return;
      AB.Audio.whistle();
      this.popup('SHOT CLOCK', 800, 250, '#ffb03a', 36, 1.6);
      const holder = this.players.find(p => p.hasBall);
      const next = holder ? this.players[1 - holder.idx] : this.players[0];
      if (holder){ holder.hasBall = false; holder.charging = false; }
      this.phase = 'dead';
      this.deadT = 1.5;
      this.deadNext = () => this.placePossession(next.idx);
      this.ball.state = 'loose';
      this.ball.catchable = false;
      this.crowdLevel = .5;
    },

    endQuarter(){
      if (this.phase === 'break' || this.phase === 'over') return;
      this.phase = 'break';
      this.breakT = 4.2;
      this.clock = 0;
      this.awaitShot = false;
      this.players.forEach(p => { p.charging = false; p.hasBall = false; p.state = 'idle'; });
      this.ball.state = 'loose';
      this.ball.catchable = false;
      AB.Audio.buzzer();
      AB.Audio.crowd(.6);
    },

    afterBreak(){
      const tied = this.score[0] === this.score[1];
      if (this.quarter >= 4){
        if (!tied){ this.gameOver(); return; }
        this.quarter++;
        this.clock = C.OVERTIME_TIME;
        this.placeTipoff();
        this.phase = 'countdown';
        this.countdownT = 3.4;
        this.popup(this.quarter === 5 ? 'OVERTIME' : 'DOUBLE OT', 800, 280, '#ffd166', 46, 2);
        AB.Audio.roar(.7);
        return;
      }
      this.quarter++;
      this.clock = C.QUARTER_TIME;
      this.placeTipoff();
      this.phase = 'countdown';
      this.countdownT = 3.2;
      AB.Audio.beep();
    },

    gameOver(){
      this.phase = 'over';
      this.clock = 0;
      this.players.forEach(p => {
        p.charging = false; p.hasBall = false;
        p.dunk = null; p.stateT = 0;
      });
      const winner = this.score[0] === this.score[1] ? -1 : (this.score[0] > this.score[1] ? 0 : 1);
      this.players.forEach(p => {
        if (winner === -1){
          p.state = 'celebrate';
          p.celebrate = 999;
        } else if (winner === p.idx){
          p.state = 'winner_celebrate';
          p.celebrate = 999;
        } else {
          p.state = 'loser_crying';
          p.celebrate = 0;
        }
        p.stateT = 0;
      });
      AB.Audio.buzzer();
      AB.Audio.roar(1);
      this.crowdLevel = 1;
      for (let i = 0; i < 90; i++){
        this.particles.push({
          kind: 'confetti',
          x: U.rand(100, 1500), y: U.rand(-100, 200),
          vx: U.rand(-120, 120), vy: U.rand(80, 280),
          life: U.rand(5, 3), t: 0,
          color: U.pick(['#ffd166', '#ff7a1a', '#37d9ff', '#ffffff', '#ff4d7e', '#7bffca']),
          size: U.rand(10, 5), rot: Math.random() * 6, spin: U.rand(8, -8), grav: 240
        });
      }
      if (AB.UI) AB.UI.showResults(this);
    },

    /* ---------------- particles / popups ---------------- */
    updateParticles(dt){
      const parts = this.particles;
      for (let i = parts.length - 1; i >= 0; i--){
        const p = parts[i];
        p.t += dt;
        if (p.t >= p.life){ parts.splice(i, 1); continue; }
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        if (p.kind === 'confetti' && p.y + p.size > C.FLOOR_Y){
          p.y = C.FLOOR_Y - p.size;
          p.vy *= -.25;
          p.vx *= .6;
        }
      }
    },

    updatePopups(dt){
      for (let i = this.popups.length - 1; i >= 0; i--){
        const p = this.popups[i];
        p.t += dt;
        p.y += p.vy * dt;
        p.vy *= (1 - dt * 1.4);
        if (p.t >= p.life) this.popups.splice(i, 1);
      }
    },

    getSnapshot(){
      return {
        score: this.score.slice(),
        quarter: this.quarter,
        clock: this.clock,
        shotClock: this.shotClock,
        players: this.players.map(p => ({
          name: p.data.name, short: p.data.short, num: p.data.num,
          team: p.data.abbr, score: this.score[p.idx],
          onFire: p.onFire, fireT: p.fireT, stats: p.stats, colors: p.data.colors
        })),
        mode: this.mode, phase: this.phase
      };
    }
  };
})();
