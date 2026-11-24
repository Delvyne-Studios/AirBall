/* ============================================================
   AIRBALL — boot + stage scaling
   ============================================================ */
(function(){
  const AB = window.AB;
  if (!AB) return;

  const stage = document.getElementById('stage');
  let scale = 1;

  function fit(){
    const vw = document.documentElement.clientWidth || window.innerWidth || 1600;
    const vh = document.documentElement.clientHeight || window.innerHeight || 900;
    scale = Math.min(vw / AB.C.W, vh / AB.C.H);
    // anchor the scaled stage exactly in the middle of the viewport
    const x = (vw - AB.C.W * scale) / 2;
    const y = (vh - AB.C.H * scale) / 2;
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
  }

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  fit();

  // unlock audio on the very first real gesture
  function unlock(){
    AB.Audio.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  AB.UI.init();
  AB.Engine.init();

  /* deep links / QA hooks: ?screen=select|game|pause|results&p1=curry&p2=jordan */
  (function queryBoot(){
    const q = new URLSearchParams(location.search);
    const screen = q.get('screen');
    const p1 = q.get('p1'), p2 = q.get('p2');
    if (!screen && !p1 && !p2) return;
    AB.UI.setPicks([p1 || AB.DEFAULT_P1, p2 || AB.DEFAULT_P2]);
    if (screen === 'select'){
      AB.UI.showSelect();
      return;
    }
    if (!screen) return;
    const d1 = AB.byId(p1 || AB.DEFAULT_P1);
    const d2 = AB.byId(p2 || AB.DEFAULT_P2);
    setTimeout(() => {
      AB.Engine.startMatch(d1, d2);
      if (q.get('live') === '1') AB.Engine.countdownT = 0.05;
      if (screen === 'pause'){
        setTimeout(() => AB.Engine.pause(), 1300);
      }
      if (screen === 'results'){
        setTimeout(() => {
          const E = AB.Engine;
          E.score = [28, 24];
          E.quarter = 4;
          const st = [
            { pts: 28, fga: 19, fgm: 12, dunks: 3, steals: 2, blocks: 1, bestStreak: 5 },
            { pts: 24, fga: 21, fgm: 10, dunks: 1, steals: 3, blocks: 2, bestStreak: 3 }
          ];
          E.players.forEach((p, i) => { p.stats = st[i]; });
          E.stats = [E.players[0].stats, E.players[1].stats];
          E.gameOver();
        }, 1400);
      }
    }, 220);
  })();

  // HUD / DOM sync (engine has its own canvas loop)
  function tick(){
    AB.UI.tick();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // boot screen
  const boot = document.getElementById('boot');
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (!boot) return;
      boot.classList.add('done');
      setTimeout(() => { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 700);
    }, 420);
  });

  // handy for debugging from the console
  window.AIRBALL = {
    engine: AB.Engine,
    ui: AB.UI,
    get scale(){ return scale; }
  };
})();
