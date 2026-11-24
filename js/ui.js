/* ============================================================
   AIRBALL — UI: screens, roster, player select, HUD, overlays
   ============================================================ */
(function(){
  const AB = window.AB;
  if (!AB) return;
  const U = AB.U;
  const ROSTER = AB.ROSTER;
  const $ = id => document.getElementById(id);

  const STAT_ROWS = [
    ['spd', 'SPEED', '⚡'],
    ['sht', 'SHOOTING', '🎯'],
    ['dnk', 'DUNK', '💥'],
    ['def', 'DEFENSE', '🛡️'],
    ['pwr', 'POWER', '💪']
  ];

  const S = {
    built: false,
    screen: 'home',
    step: 1, // 1 = P1 selecting, 2 = P2 selecting, 3 = match ready
    pick: [0, 2],
    locked: [false, false],
    active: 0,
    readyTimer: null,
    startPending: false,
    hudOn: false,
    portraitKeys: ['', ''],
    scoreTimers: [null, null],
    stripTimer: null,
    howFrom: 'home',
    cards: null
  };

  const cache = new Map();
  const KINDS = {
    card:   { w: 440, h: 520, opt: { bg: false } },
    roster: { w: 240, h: 400, opt: { bg: false, R: 62, cy: 118 } },
    hr:     { w: 200, h: 250, opt: { bg: true, R: 47, cy: 100 } },
    mini:   { w: 150, h: 176, opt: { bg: true, R: 31, cy: 74 } }
  };

  /* ------------------------------------------------------------
     portraits
     ------------------------------------------------------------ */
  function portrait(d, kind){
    const key = kind + ':' + d.id;
    if (cache.has(key)) return cache.get(key);
    const k = KINDS[kind];
    const cv = AB.Players.makePortrait(d, k.w, k.h, k.opt);
    cache.set(key, cv);
    return cv;
  }

  function paint(cv, d, kind){
    const src = portrait(d, kind);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(src, 0, 0, cv.width, cv.height);
  }

  /* ------------------------------------------------------------
     build
     ------------------------------------------------------------ */
  function ensureBuilt(){
    if (S.built) return;
    S.pick[0] = Math.max(0, ROSTER.findIndex(d => d.id === AB.DEFAULT_P1));
    S.pick[1] = Math.max(0, ROSTER.findIndex(d => d.id === AB.DEFAULT_P2));
    buildHomeRoster();
    buildRosterGrid();
    S.built = true;
    syncSound();
  }

  function buildHomeRoster(){
    const wrap = $('home-roster');
    wrap.innerHTML = '';
    const track = document.createElement('div');
    track.className = 'hr-track';
    for (let pass = 0; pass < 2; pass++){
      ROSTER.forEach((d, i) => {
        const card = document.createElement('div');
        card.className = 'hr-card';
        card.title = d.name + ' · OVR ' + d.ovr;
        const cv = document.createElement('canvas');
        cv.width = 200; cv.height = 250;
        paint(cv, d, 'hr');
        const label = document.createElement('span');
        label.textContent = d.short;
        card.appendChild(cv);
        card.appendChild(label);
        card.addEventListener('click', () => {
          if (S.screen !== 'home') return;
          S.pick[0] = i;
          S.active = 0;
          AB.Audio.ui();
          showSelect();
        });
        track.appendChild(card);
      });
    }
    wrap.appendChild(track);
  }

  function buildRosterGrid(){
    const grid = $('roster-grid');
    grid.innerHTML = '';
    S.cards = [];
    ROSTER.forEach((d, i) => {
      const card = document.createElement('div');
      card.className = 'roster-card';
      card.dataset.idx = i;
      card.style.background =
        'radial-gradient(115% 62% at 50% 16%, ' + U.rgba(d.colors.secondary, .22) + ', transparent 62%),' +
        'linear-gradient(170deg, ' + U.darken(d.colors.primary, .44) + ' 0%, #0a111c 70%, #070b12 100%)';

      const cv = document.createElement('canvas');
      cv.width = 240; cv.height = 400;
      paint(cv, d, 'roster');

      const fade = document.createElement('div');
      fade.className = 'rc-fade';

      const num = document.createElement('div');
      num.className = 'rc-num';
      num.textContent = '#' + d.num;

      const badges = document.createElement('div');
      badges.className = 'rc-badges';
      const b1 = document.createElement('span');
      b1.className = 'rc-badge b1';
      b1.textContent = 'P1';
      const b2 = document.createElement('span');
      b2.className = 'rc-badge b2';
      b2.textContent = 'P2';
      badges.appendChild(b1); badges.appendChild(b2);

      const info = document.createElement('div');
      info.className = 'rc-info';
      const name = document.createElement('div');
      name.className = 'rc-name';
      name.textContent = d.short;
      const sub = document.createElement('div');
      sub.className = 'rc-sub';
      const abbr = document.createElement('span');
      abbr.textContent = d.abbr;
      const ovr = document.createElement('b');
      ovr.className = 'rc-ovr';
      ovr.textContent = d.ovr;
      sub.appendChild(abbr); sub.appendChild(ovr);
      info.appendChild(name); info.appendChild(sub);

      card.appendChild(cv);
      card.appendChild(fade);
      card.appendChild(num);
      card.appendChild(badges);
      card.appendChild(info);

      card.addEventListener('click', () => onCardClick(i));
      grid.appendChild(card);
      S.cards.push(card);
    });
  }

  /* ------------------------------------------------------------
     select state
     ------------------------------------------------------------ */
  function selKeys(side){
    return side === 0 ? 'A / D · W / S · F' : '← ↑ ↓ → · L';
  }

  function buildStats(n, d){
    const wrap = $('fc' + n + '-stats');
    wrap.innerHTML = STAT_ROWS.map(([k, label, icon]) => {
      const v = d.attrs[k] || 0;
      return `<div class="stat-row"><span class="stat-lbl"><i class="st-ico">${icon}</i> ${label}</span>` +
        `<div class="stat-bar"><i style="width:${v}%"></i></div>` +
        `<b class="stat-val">${v}</b></div>`;
    }).join('');
  }

  function confirmP1(){
    if (S.step !== 1) return;
    S.locked[0] = true;
    S.step = 2;
    S.active = 1;
    AB.Audio.lock();
    refreshSelect();
  }

  function confirmP2(){
    if (S.step !== 2) return;
    S.locked[1] = true;
    S.step = 3;
    AB.Audio.lock();
    refreshSelect();
  }

  function unlockP1(){
    if (S.startPending) return;
    S.locked[0] = false;
    S.locked[1] = false;
    S.step = 1;
    S.active = 0;
    AB.Audio.uiBack();
    refreshSelect();
  }

  function refreshSelect(){
    if (!S.built) return;

    // Update Turn Indicator Banner
    const tText = $('turn-text');
    if (tText){
      if (S.step === 1) tText.textContent = 'STEP 1: PLAYER 1 — PREVIEW & CONFIRM (F)';
      else if (S.step === 2) tText.textContent = 'STEP 2: PLAYER 2 — PREVIEW & CONFIRM (L)';
      else tText.textContent = 'MATCH READY! GET READY TO BALL…';
    }

    // Update Buttons
    const btn1 = $('confirm-p1');
    if (btn1){
      if (S.step === 1){
        btn1.disabled = false;
        btn1.classList.remove('locked');
        btn1.innerHTML = '<span class="btn-pulse"></span>CONFIRM PLAYER 1 <b>(F)</b>';
      } else {
        btn1.disabled = false;
        btn1.classList.add('locked');
        btn1.innerHTML = '<span>P1 CONFIRMED ✓</span> <small>(CLICK TO RE-PICK)</small>';
      }
    }

    const btn2 = $('confirm-p2');
    if (btn2){
      if (S.step === 1){
        btn2.disabled = true;
        btn2.classList.remove('locked');
        btn2.innerHTML = 'WAITING FOR PLAYER 1…';
      } else if (S.step === 2){
        btn2.disabled = false;
        btn2.classList.remove('locked');
        btn2.innerHTML = '<span class="btn-pulse"></span>CONFIRM PLAYER 2 <b>(L)</b>';
      } else {
        btn2.disabled = true;
        btn2.classList.add('locked');
        btn2.innerHTML = '<span>P2 CONFIRMED ✓</span>';
      }
    }

    for (let side = 0; side < 2; side++){
      const n = side + 1;
      const d = ROSTER[S.pick[side]];
      const card = $('card-p' + n);
      const name = $('fc' + n + '-name');
      name.textContent = d.name.toUpperCase();
      name.classList.toggle('long', d.name.length > 15);
      $('fc' + n + '-meta').textContent = d.team.toUpperCase() + ' · #' + d.num;
      $('fc' + n + '-nick').textContent = d.nick;
      card.style.setProperty('--fc-tint', U.rgba(d.colors.primary, .5));
      card.style.setProperty('--fc-accent', d.colors.secondary);
      buildStats(n, d);

      const portraitBox = card.querySelector('.fc-portrait');
      let ovr = portraitBox.querySelector('.fc-ovr');
      if (!ovr){
        ovr = document.createElement('div');
        ovr.className = 'fc-ovr';
        portraitBox.appendChild(ovr);
      }
      ovr.innerHTML = '<span>OVR</span><b>' + d.ovr + '</b>';

      const info = card.querySelector('.fc-info');
      let sig = info.querySelector('.fc-sig');
      if (!sig){
        sig = document.createElement('div');
        sig.className = 'fc-sig';
        const nick = info.querySelector('.fc-nick');
        info.insertBefore(sig, nick.nextSibling);
      }
      sig.textContent = d.sig;

      card.classList.toggle('locked', S.locked[side]);
      card.classList.toggle('turn-active', (side === 0 && S.step === 1) || (side === 1 && S.step === 2));

      $('lock-p' + n).textContent = S.locked[side]
        ? 'LOCKED IN ✓'
        : (side === 0 ? 'P1 SELECTING' : (S.step === 1 ? 'WAITING' : 'P2 SELECTING'));

      const pill = $('pill-p' + n);
      pill.classList.toggle('locked', S.locked[side]);
      $('pill-p' + n + '-name').textContent = d.short + (S.locked[side] ? ' [LOCKED]' : '');

      if (S.portraitKeys[side] !== d.id){
        const cv = card.querySelector('.fc-portrait canvas');
        paint(cv, d, 'card');
        S.portraitKeys[side] = d.id;
        card.classList.remove('bump');
        void card.offsetWidth;
        card.classList.add('bump');
        setTimeout(() => card.classList.remove('bump'), 380);
      }
    }

    S.cards.forEach((card, i) => {
      card.classList.toggle('cur1', S.pick[0] === i);
      card.classList.toggle('cur2', S.pick[1] === i);
      card.classList.toggle('locked1', S.locked[0] && S.pick[0] === i);
      card.classList.toggle('locked2', S.locked[1] && S.pick[1] === i);
      const isSelecting = (S.step === 1 && S.pick[0] === i) || (S.step === 2 && S.pick[1] === i);
      card.classList.toggle('active', isSelecting);
      card.querySelector('.b1').classList.toggle('show', S.pick[0] === i);
      card.querySelector('.b2').classList.toggle('show', S.pick[1] === i);
    });

    syncStart();
  }

  function syncStart(){
    const both = S.locked[0] && S.locked[1];
    if (!both){
      if (S.readyTimer){
        clearTimeout(S.readyTimer);
        S.readyTimer = null;
      }
      S.startPending = false;
      return;
    }
    if (S.readyTimer) return;
    S.startPending = true;
    S.readyTimer = setTimeout(() => {
      S.readyTimer = null;
      S.startPending = false;
      const d1 = ROSTER[S.pick[0]], d2 = ROSTER[S.pick[1]];
      AB.Audio.roar(.65);
      AB.Engine.startMatch(d1, d2);
    }, 750);
  }

  function movePick(side, dx, dy){
    if (S.locked[side]) return;
    // Only allow moving pick if it's that player's turn!
    if (side === 0 && S.step !== 1) return;
    if (side === 1 && S.step !== 2) return;

    let i = S.pick[side];
    const before = i;
    if (dx){
      const row = Math.floor(i / 5), col = i % 5;
      i = row * 5 + ((col + dx + 5) % 5);
    }
    if (dy) i = (i + dy * 5 + 10) % 10;
    if (i !== before){
      S.pick[side] = i;
      S.active = side;
      AB.Audio.tick();
      refreshSelect();
    }
  }

  function deny(side){
    const card = $('card-p' + (side + 1));
    card.classList.remove('deny');
    void card.offsetWidth;
    card.classList.add('deny');
    setTimeout(() => card.classList.remove('deny'), 420);
  }

  function onCardClick(i){
    if (S.screen !== 'select' || S.startPending) return;
    const currentSide = (S.step === 1) ? 0 : 1;
    // Update preview for current selecting player without locking!
    S.pick[currentSide] = i;
    S.active = currentSide;
    AB.Audio.tick();
    refreshSelect();
  }

  /* ------------------------------------------------------------
     screens
     ------------------------------------------------------------ */
  function closeOverlay(){
    $('overlay').classList.add('is-hidden');
  }

  function showHome(){
    ensureBuilt();
    S.screen = 'home';
    S.hudOn = false;
    closeOverlay();
    $('screen-select').classList.add('is-hidden');
    $('screen-home').classList.remove('is-hidden');
    $('hud').classList.add('is-hidden');
  }

  function showSelect(){
    ensureBuilt();
    if (S.readyTimer){
      clearTimeout(S.readyTimer);
      S.readyTimer = null;
    }
    S.startPending = false;
    S.screen = 'select';
    S.step = 1;
    S.locked[0] = false;
    S.locked[1] = false;
    S.active = 0;
    S.portraitKeys = ['', ''];
    AB.Audio.crowd(.3);
    closeOverlay();
    $('screen-home').classList.add('is-hidden');
    $('screen-select').classList.remove('is-hidden');
    $('hud').classList.add('is-hidden');
    S.hudOn = false;
    refreshSelect();
  }

  function enterMatch(E){
    ensureBuilt();
    S.screen = 'match';
    S.hudOn = true;
    S.locked[0] = false;
    S.locked[1] = false;
    S.startPending = false;
    S.portraitKeys = ['', ''];
    S.lastScore = [-1, -1];
    closeOverlay();
    $('screen-home').classList.add('is-hidden');
    $('screen-select').classList.add('is-hidden');
    $('hud').classList.remove('is-hidden');

    for (let i = 0; i < 2; i++){
      const p = E.players[i];
      const n = i + 1;
      const d = p.data;
      $('sb' + n + '-name').textContent = d.short;
      $('sb' + n + '-num').textContent = d.num;
      $('sb' + n + '-team').textContent = d.abbr;
      $('sb' + n + '-color').style.background = d.colors.jersey;
      $('sb' + n + '-color').style.boxShadow = '0 0 18px ' + d.colors.jersey;
      $('bh' + n + '-name').textContent = d.name.toUpperCase();
      $('bh' + n + '-sub').textContent = d.team.toUpperCase() + ' · #' + d.num;
      const bench = $('bench' + n).querySelector('.bh-portrait canvas');
      if (bench) paint(bench, d, 'mini');
    }

    const strip = $('control-strip');
    strip.classList.remove('fade');
    clearTimeout(S.stripTimer);
    S.stripTimer = setTimeout(() => strip.classList.add('fade'), 9500);

    updateHUD(E);
  }

  function leaveMatch(){
    showHome();
  }

  /* ------------------------------------------------------------
     HUD
     ------------------------------------------------------------ */
  function setText(el, txt){
    if (el && el.textContent !== txt) el.textContent = txt;
  }

  function clockText(s){
    if (!(s > 0)) return '0:00';
    if (s < 9.95) return '0:0' + (Math.max(.1, Math.round(s * 10) / 10)).toFixed(1);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  function quarterLabel(q){
    if (q <= 4) return 'Q' + q;
    return q === 5 ? 'OT' : (q - 4) + 'OT';
  }

  function popScore(i, v){
    const el = i === 0 ? $('sb1-score') : $('sb2-score');
    if (el.textContent === String(v)) return;
    el.textContent = v;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    clearTimeout(S.scoreTimers[i]);
    S.scoreTimers[i] = setTimeout(() => el.classList.remove('pop'), 190);
  }

  function updateHUD(E){
    if (!E || !E.players || E.players.length < 2) return;

    popScore(0, E.score[0]);
    popScore(1, E.score[1]);

    const clk = $('sb-clock');
    setText(clk, clockText(E.clock));
    clk.classList.toggle('low', E.phase === 'live' && E.clock <= 10);

    const shot = $('sb-shot');
    const sv = Math.max(0, Math.ceil(E.shotClock));
    setText(shot, String(sv));
    shot.classList.toggle('low', sv <= 5);

    setText($('sb-q'), quarterLabel(E.quarter));

    const dots = $('sb-quarters').children;
    for (let i = 0; i < dots.length; i++){
      const done = E.quarter > i + 1 || E.quarter > 4;
      dots[i].classList.toggle('done', done);
      dots[i].classList.toggle('cur', E.quarter === i + 1);
    }

    for (let i = 0; i < 2; i++){
      const p = E.players[i];
      const n = i + 1;
      const side = $('hud').querySelector('.sb-p' + n);
      side.classList.toggle('on-fire', !!p.onFire);
    }
  }

  function tick(){
    if (!S.hudOn) return;
    const E = AB.Engine;
    if (E && E.mode === 'match') updateHUD(E);
  }

  /* ------------------------------------------------------------
     overlays
     ------------------------------------------------------------ */
  function openOverlay(html){
    $('modal').innerHTML = html;
    $('overlay').classList.remove('is-hidden');
  }

  function scoreBlock(p, n){
    return `<div class="fs-side fs-p${n}"><div class="fs-num">${p.score}</div>` +
      `<div class="fs-name">${p.data.short} · P${n}</div></div>`;
  }

  function showPause(E){
    ensureBuilt();
    S.screen = 'pause';
    const [a, b] = E.players;
    const pa = { score: E.score[0], data: a.data };
    const pb = { score: E.score[1], data: b.data };
    openOverlay(`
      <div class="modal-kicker">GAME PAUSED</div>
      <h3>TAKE A <b>BREATH</b></h3>
      <div class="final-score pause-score">${scoreBlock(pa, 1)}<div class="fs-mid">—</div>${scoreBlock(pb, 2)}</div>
      <p class="modal-sub">${quarterLabel(E.quarter)} · ${clockText(E.clock)} left · shot clock ${Math.max(0, Math.ceil(E.shotClock))}</p>
      <div class="pause-list">
        <button class="btn-solid" data-act="resume">RESUME</button>
        <button class="btn-line" data-act="how">HOW TO PLAY</button>
        <button class="btn-line" data-act="restart">RESTART MATCH</button>
        <button class="btn-line" data-act="quit">QUIT TO MENU</button>
      </div>
    `);
  }

  function showResults(E){
    ensureBuilt();
    S.screen = 'results';
    const [a, b] = E.players;
    const s0 = E.score[0], s1 = E.score[1];
    const win = s0 === s1 ? -1 : (s0 > s1 ? 0 : 1);
    const winner = win >= 0 ? E.players[win].data : null;
    const title = winner ? `<b>${winner.short}</b> WINS` : 'DEAD <b>HEAT</b>';
    const sub = winner
      ? `${winner.name} leaves with the bragging rights. Run it back?`
      : 'Nothing separates them. One more run decides it.';

    openOverlay(`
      <div class="modal-kicker">FINAL · ${quarterLabel(E.quarter)}</div>
      <h3>${title}</h3>
      <p class="modal-sub">${sub}</p>
      <div class="final-score">
        <div class="fs-side fs-p1"><div class="fs-num">${s0}</div><div class="fs-name">${a.data.short} · P1</div></div>
        <div class="fs-mid">FINAL</div>
        <div class="fs-side fs-p2"><div class="fs-num">${s1}</div><div class="fs-name">${b.data.short} · P2</div></div>
      </div>
      ${winner ? `<div class="winner-banner"><svg><use href="#i-trophy"/></svg><span>${winner.short} TAKES THE CROWN</span></div>` : ''}
      <div class="result-stats">
        ${resultBlock(a, 0)}
        ${resultBlock(b, 1)}
      </div>
      <div class="modal-actions">
        <button class="btn-solid" data-act="rematch">REMATCH</button>
        <button class="btn-line" data-act="change">CHANGE LEGENDS</button>
        <button class="btn-line" data-act="home">MAIN MENU</button>
      </div>
    `);
  }

  function resultBlock(p, side){
    const s = p.stats;
    const cell = (label, value) => `<div class="qb-cell"><span>${label}</span><b>${value}</b></div>`;
    return `<div class="result-team p${side + 1}">
      <h4><span>${p.data.short}</span><em>P${side + 1}</em></h4>
      <div class="qb-breakdown">
        ${cell('PTS', s.pts)}
        ${cell('FG', s.fgm + '/' + s.fga)}
        ${cell('DUNK', s.dunks)}
        ${cell('STL', s.steals)}
        ${cell('BLK', s.blocks)}
        ${cell('BEST RUN', s.bestStreak)}
      </div>
    </div>`;
  }

  function howItems(){
    return [
      { k: ['A', 'D', '←', '→'], full: false, t: '<b>MOVE.</b> P1 uses A / D, P2 uses Arrow keys. Players pass cleanly through each other with zero body collisions.' },
      { k: ['W', '↑'], t: '<b>JUMP & JUMP SHOT.</b> Jump with W / ↑. Shoot while in mid-air to trigger a Jump Shot with a <b>+10% accuracy bonus</b>!' },
      { k: ['F', 'L'], hot: 0, t: '<b>INSTANT SHOT.</b> Press action to release immediately — no timing meter! Accuracy is determined by your legend\'s SHT stat.' },
      { k: ['F', 'L'], hot: 0, t: '<b>SLAM DUNK.</b> Drive inside the paint and press action to unleash a high-flying 5-phase rim-rocking jam!' },
      { k: ['F', 'L'], hot: 0, t: '<b>STEAL (ANTI-SPAM).</b> Time your steal carefully. Whiffing or spamming action causes a <b>1-second dizzy stun</b> penalty!' },
      { k: ['F', 'L'], hot: 0, t: '<b>BLOCK.</b> Jump high as the shooter rises and press action near the release point to swat the ball away.' },
      { k: ['3', '2'], full: true, t: '<b>SCORING & CELEBRATION.</b> 3 for deep treys, 2 inside. Score to trigger hype celebrations; end of game triggers winner joy & loser tears!' },
      { k: ['🔥'], full: true, t: '<b>ON FIRE.</b> Three straight buckets and your legend catches fire: elevated stats, burning aura, and electric crowd hype.' }
    ].map(it => `
      <div class="how-item${it.full ? ' full' : ''}">
        <div class="k">${it.k.map((x, i) => `<b class="${it.hot === i ? 'hot' : ''}">${x}</b>`).join('')}</div>
        <p>${it.t}</p>
      </div>`).join('');
  }

  function showHow(from){
    ensureBuilt();
    S.screen = 'how';
    S.howFrom = from || 'home';
    openOverlay(`
      <div class="modal-kicker">HOW TO PLAY</div>
      <h3>OWN THE <b>COURT</b></h3>
      <p class="modal-sub">Two players, one screen, no fouls. Everything runs through a single action key.</p>
      <div class="how-grid">${howItems()}</div>
      <div class="modal-actions">
        <button class="btn-solid" data-act="how-close">GOT IT</button>
      </div>
    `);
  }

  function showRoster(){
    ensureBuilt();
    S.screen = 'roster';
    const rows = ROSTER.map((d, i) => `
      <div class="how-item roster-row">
        <div class="rr-port"><canvas width="150" height="176" data-p="${i}"></canvas></div>
        <p><b>${d.name.toUpperCase()}</b><br><span>${d.abbr} · OVR ${d.ovr}</span></p>
        <div class="rr-ovr">${d.ovr}</div>
      </div>`).join('');

    openOverlay(`
      <div class="modal-kicker">THE ROSTER</div>
      <h3>TEN <b>LEGENDS</b></h3>
      <p class="modal-sub">Ten all-time greats, ten different ways to break a defender.</p>
      <div class="how-grid roster-modal">${rows}</div>
      <div class="modal-actions">
        <button class="btn-solid" data-act="roster-select">CHOOSE LEGENDS</button>
        <button class="btn-line" data-act="home">BACK</button>
      </div>
    `);

    $('modal').querySelectorAll('.rr-port canvas').forEach(cv => {
      const d = ROSTER[+cv.dataset.p];
      if (d) paint(cv, d, 'mini');
    });
  }

  function hideOverlay(){
    $('overlay').classList.add('is-hidden');
    if (S.screen === 'pause' || S.screen === 'how' || S.screen === 'roster' || S.screen === 'results'){
      const E = AB.Engine;
      if (E && E.mode === 'match' && E.phase !== 'over') S.screen = 'match';
      else if (E && E.mode === 'attract') S.screen = 'home';
    }
  }

  function onAction(act){
    const E = AB.Engine;
    switch (act){
      case 'resume':
        if (E) E.resume();
        break;
      case 'restart':
        closeOverlay();
        if (E) E.restart();
        break;
      case 'quit':
        closeOverlay();
        if (E) E.quitToHome();
        break;
      case 'home':
        closeOverlay();
        if (E && E.mode === 'match') E.quitToHome();
        else showHome();
        break;
      case 'how':
        showHow('pause');
        break;
      case 'how-close':
        if (S.howFrom === 'pause' && E && E.mode === 'match'){
          showPause(E);
        } else {
          closeOverlay();
          showHome();
        }
        break;
      case 'rematch':
        closeOverlay();
        if (E) E.restart();
        break;
      case 'change': {
        const ids = E.players.map(p => p.data.id);
        closeOverlay();
        E.quitToHome();
        S.pick[0] = Math.max(0, ROSTER.findIndex(d => d.id === ids[0]));
        S.pick[1] = Math.max(0, ROSTER.findIndex(d => d.id === ids[1]));
        if (S.pick[1] === S.pick[0]) S.pick[1] = (S.pick[0] + 1) % ROSTER.length;
        showSelect();
        break;
      }
      case 'roster-select':
        showSelect();
        break;
    }
  }

  /* ------------------------------------------------------------
     sound / fullscreen
     ------------------------------------------------------------ */
  function syncSound(){
    const on = !AB.Audio.muted;
    document.querySelectorAll('#home-sound use, #btn-sound use').forEach(u => {
      u.setAttribute('href', on ? '#i-sound-on' : '#i-sound-off');
    });
    const hs = $('home-sound'), bs = $('btn-sound');
    if (hs) hs.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
    if (bs) bs.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
  }

  function toggleSound(){
    AB.Audio.unlock();
    AB.Audio.setMuted(!AB.Audio.muted);
    syncSound();
    if (!AB.Audio.muted) AB.Audio.ui();
  }

  function toggleFullscreen(){
    const d = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement){
      (d.requestFullscreen || d.webkitRequestFullscreen || function(){}).call(d);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document);
    }
  }

  /* ------------------------------------------------------------
     input
     ------------------------------------------------------------ */
  function onSelectKey(e){
    if (e.repeat) return;

    if (e.code === 'Escape'){
      if (S.startPending || S.step > 1){
        unlockP1();
      } else {
        AB.Audio.uiBack();
        showHome();
      }
      return;
    }

    if (e.code === 'KeyF'){
      if (S.step === 1) confirmP1();
      else if (S.step === 2) unlockP1();
      return;
    }

    if (e.code === 'KeyL'){
      if (S.step === 2) confirmP2();
      return;
    }

    let side = -1;
    if (['KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code) && S.step === 1) side = 0;
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code) && S.step === 2) side = 1;
    if (side < 0) return;

    const nav = {
      KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1],
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
    }[e.code];

    if (nav) movePick(side, nav[0], nav[1]);
  }

  function onKeyDown(e){
    AB.Audio.unlock();
    if (S.screen === 'select'){
      onSelectKey(e);
    } else if (S.screen === 'home'){
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space'){
        e.preventDefault();
        AB.Audio.ui();
        showSelect();
      } else if (e.code === 'KeyH'){
        showHow('home');
      } else if (e.code === 'KeyR'){
        showRoster();
      }
    } else if (S.screen === 'results'){
      if (e.code === 'Enter' || e.code === 'NumpadEnter'){
        e.preventDefault();
        onAction('rematch');
      } else if (e.code === 'Escape'){
        onAction('home');
      }
    }
  }

  /* ------------------------------------------------------------
     init
     ------------------------------------------------------------ */
  function init(){
    ensureBuilt();

    $('btn-play').addEventListener('click', showSelect);
    $('confirm-p1').addEventListener('click', () => {
      AB.Audio.unlock();
      if (S.step === 1) confirmP1();
      else if (S.step === 2) unlockP1();
    });
    $('confirm-p2').addEventListener('click', () => {
      AB.Audio.unlock();
      if (S.step === 2) confirmP2();
    });
    $('btn-how').addEventListener('click', () => showHow('home'));
    $('btn-roster').addEventListener('click', showRoster);
    $('sel-back').addEventListener('click', () => { AB.Audio.uiBack(); showHome(); });
    $('home-sound').addEventListener('click', toggleSound);
    $('btn-sound').addEventListener('click', toggleSound);
    $('home-full').addEventListener('click', toggleFullscreen);
    $('btn-pause').addEventListener('click', () => {
      const E = AB.Engine;
      if (E && E.mode === 'match' && E.phase !== 'over' && !E.paused) E.pause();
    });

    $('modal').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      AB.Audio.unlock();
      if (btn.dataset.act === 'how-close' || btn.dataset.act === 'home') AB.Audio.uiBack();
      else AB.Audio.ui();
      onAction(btn.dataset.act);
    });

    window.addEventListener('keydown', onKeyDown);

    // Keep the marquee seamless when the layout re-measures.
    showHome();
    refreshSelect();
  }

  AB.UI = {
    init,
    tick,
    showHome,
    showSelect,
    enterMatch,
    leaveMatch,
    showPause,
    showResults,
    showHow,
    showRoster,
    hideOverlay,
    updateHUD,
    setPicks(ids){
      ensureBuilt();
      ids.forEach((id, side) => {
        const i = ROSTER.findIndex(d => d.id === id);
        if (i >= 0) S.pick[side] = i;
      });
      if (S.screen === 'select') refreshSelect();
    }
  };
})();
