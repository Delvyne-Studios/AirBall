/* ============================================================
   AIRBALL — arena / court / hoop / ball art
   All artwork is hand-built with canvas vectors.
   ============================================================ */
(function(){
  const AB = window.AB = window.AB || {};
  const U = AB.U, C = AB.C;
  const W = C.W, H = C.H;

  const Art = AB.Art = {
    arena: null,
    court: null,
    seats: [],
    theme: null,

    defaultTheme(){
      const a = AB.byId('curry'), b = AB.byId('jordan');
      return {
        a: { primary:a.colors.primary, secondary:a.colors.secondary, jersey:a.colors.jersey, trim:a.colors.trim },
        b: { primary:b.colors.primary, secondary:b.colors.secondary, jersey:b.colors.jersey, trim:b.colors.trim },
        p1: a, p2: b, label1: 'CURRY', label2: 'JORDAN'
      };
    },

    init(theme){
      if (!theme) theme = this.defaultTheme();
      this.theme = theme;
      this.buildArena(theme);
      this.buildCourt(theme);
    },

    /* ============================================================
       ARENA
       ============================================================ */
    buildArena(theme){
      const cv = U.mkCanvas(W, H);
      const g = cv.getContext('2d');
      const rand = U.rng(9137);
      this.seats = [];

      /* ---- base ceiling / room ---- */
      let grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#04060b');
      grd.addColorStop(.26, '#070b13');
      grd.addColorStop(.62, '#0a1019');
      grd.addColorStop(1, '#05080e');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);

      /* ---- roof trusses ---- */
      g.strokeStyle = 'rgba(120,145,180,.07)';
      g.lineWidth = 2;
      for (let i = 0; i < 3; i++){
        const y = 26 + i * 26;
        g.beginPath();
        g.moveTo(0, y + 12); g.lineTo(W, y - 6);
        g.stroke();
      }
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(120,145,180,.045)';
      for (let x = -40; x < W + 80; x += 92){
        g.beginPath();
        g.moveTo(x, 8); g.lineTo(x + 52, 84);
        g.moveTo(x + 52, 84); g.lineTo(x + 104, 8);
        g.stroke();
      }
      // lamps in the rafters
      for (let i = 0; i < 8; i++){
        const x = 90 + i * 205, y = 62;
        U.glow(g, x, y, 46, '#9fc7ff', .16);
        g.fillStyle = 'rgba(210,230,255,.55)';
        g.fillRect(x - 8, y - 2, 16, 4);
      }

      /* ---- upper deck crowd ---- */
      this.crowdTier(g, rand, 104, 292, 7, 10, 0.86, [40, 300, 560, 820, 1080, 1340, 1560]);
      // walkway / balcony
      g.fillStyle = '#05080e'; g.fillRect(0, 292, W, 34);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 292, W, 1.5);
      g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, 324, W, 1.5);
      for (let x = 0; x < W; x += 74){
        g.fillStyle = 'rgba(140,165,200,.05)';
        g.fillRect(x, 296, 1, 28);
      }
      // luxury box strip
      for (let i = 0; i < 10; i++){
        const x = 24 + i * 158;
        g.fillStyle = 'rgba(130,150,185,.05)';
        g.fillRect(x, 304, 118, 14);
        g.fillStyle = 'rgba(200,225,255,.07)';
        g.fillRect(x, 304, 118, 1);
        U.glow(g, x + 59, 311, 30, '#ffd28a', .05);
      }

      /* ---- lower bowl crowd ---- */
      this.crowdTier(g, rand, 330, 500, 8, 11, 1, [40, 250, 470, 700, 930, 1160, 1390, 1560]);

      // tunnels
      this.tunnel(g, 300, 356, 62, 144, theme.a.primary);
      this.tunnel(g, 1300, 356, 62, 144, theme.b.primary);

      // lower railing
      g.fillStyle = '#04070c'; g.fillRect(0, 500, W, 16);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 500, W, 1.5);

      /* ---- banners hanging in the rafters ---- */
      const banners = [
        { x: 402, c: '#CE1141', c2:'#1a0409', n:'6' },
        { x: 486, c: '#1D428A', c2:'#0a0f24', n:'3' },
        { x: 1114, c: '#552583', c2:'#140a24', n:'17' },
        { x: 1198, c: '#0E2240', c2:'#060c16', n:'1' }
      ];
      for (const b of banners) this.banner(g, b.x, 76, 44, 156, b.c, b.c2, b.n);

      /* ---- courtside concourse wall ---- */
      grd = g.createLinearGradient(0, 516, 0, 706);
      grd.addColorStop(0, '#070b12');
      grd.addColorStop(.55, '#0a0f18');
      grd.addColorStop(1, '#05080d');
      g.fillStyle = grd; g.fillRect(0, 516, W, 190);

      // huge ghost wordmark on the wall
      g.save();
      g.globalAlpha = .055;
      g.font = '700 120px "Bahnschrift","Arial Narrow",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#dfe9ff';
      g.fillText('AIRBALL', 800, 606);
      g.restore();

      // wall panel seams + subtle uplights in team colours
      for (let x = 0; x < W; x += 160){
        g.fillStyle = 'rgba(255,255,255,.022)';
        g.fillRect(x, 516, 1, 190);
      }
      for (let i = 0; i < 8; i++){
        const x = 100 + i * 200;
        const col = i % 2 ? theme.b.primary : theme.a.primary;
        U.glow(g, x, 690, 90, col, .07);
      }

      // courtside spectators silhouettes
      this.courtside(g, rand, theme);

      // baseline LED strip
      g.fillStyle = '#020407';
      g.fillRect(0, 690, W, 18);
      g.fillStyle = 'rgba(255,255,255,.05)';
      g.fillRect(0, 690, W, 1);
      g.fillStyle = 'rgba(0,0,0,.4)';
      g.fillRect(0, 705, W, 4);

      // global dim / vignette baked into arena
      grd = g.createRadialGradient(800, 430, 180, 800, 470, 1000);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(.55, 'rgba(0,0,0,.16)');
      grd.addColorStop(1, 'rgba(0,0,0,.62)');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);

      // atmosphere haze
      const hz = g.createLinearGradient(0, 240, 0, 620);
      hz.addColorStop(0, 'rgba(70,110,190,.055)');
      hz.addColorStop(.5, 'rgba(40,70,130,.03)');
      hz.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hz; g.fillRect(0, 240, W, 380);

      this.arena = cv;
    },

    crowdTier(g, rand, y0, y1, rows, rowH, bright, aisles){
      const cols = ['#1b2537','#232c3c','#2b2a33','#1d3341','#33262b','#26343a','#3a2f30','#1a2430','#2f3a48','#262130'];
      const skins = ['#6b4a34','#8a6246','#a67a58','#5b3c2a','#c0916d'];
      const accents = ['#8b1f2c','#946b1e','#1f4d6b','#2b5c33','#5a2a63','#8a4520'];
      for (let r = 0; r < rows; r++){
        const y = y0 + r * rowH;
        const dim = 0.35 + 0.5 * (r / rows);
        const cells = 210;
        for (let i = 0; i < cells; i++){
          const x = 4 + i * (W / cells) + rand() * 5;
          let skip = false;
          for (const a of aisles){
            if (Math.abs(x - a) < 17) { skip = true; break; }
          }
          if (skip) continue;
          const roll = rand();
          let col;
          if (roll < 0.055) col = skins[(rand() * skins.length) | 0];
          else if (roll < 0.085) col = accents[(rand() * accents.length) | 0];
          else col = cols[(rand() * cols.length) | 0];
          g.globalAlpha = dim * (0.55 + rand() * 0.45) * bright;
          g.fillStyle = col;
          const hh = 3 + rand() * 2.4;
          g.fillRect(x, y + rand() * 3, 2.6 + rand() * 1.6, hh);
          // tiny head
          if (rand() < .5){
            g.fillStyle = rand() < .5 ? '#c89a72' : '#6b4a34';
            g.globalAlpha = dim * .5;
            g.fillRect(x + .4, y + (rand() * 2), 3.2, 2.4);
          }
          if (rand() < .012){
            this.seats.push({ x, y: y + 2 });
          }
        }
      }
      g.globalAlpha = 1;
      // tier shadow gradient
      const sh = g.createLinearGradient(0, y0 - 8, 0, y1 + 6);
      sh.addColorStop(0, 'rgba(2,4,8,.72)');
      sh.addColorStop(.35, 'rgba(2,4,8,.06)');
      sh.addColorStop(1, 'rgba(2,4,8,.55)');
      g.fillStyle = sh;
      g.fillRect(0, y0 - 8, W, y1 - y0 + 14);
    },

    tunnel(g, x, y, w, h, col){
      const grd = g.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, '#010204');
      grd.addColorStop(1, '#070b12');
      g.fillStyle = grd;
      U.roundRect(g, x - w / 2, y, w, h, 26);
      g.fill();
      g.strokeStyle = 'rgba(210,230,255,.09)';
      g.lineWidth = 2; g.stroke();
      const gl = g.createLinearGradient(x, y, x, y + h);
      gl.addColorStop(0, U.rgba(col, .12));
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl;
      U.roundRect(g, x - w / 2 + 4, y + 4, w - 8, h - 8, 22);
      g.fill();
      U.glow(g, x, y + h - 10, 70, col, .16);
    },

    banner(g, x, y, w, h, col, dark, num){
      g.save();
      g.strokeStyle = 'rgba(180,200,230,.12)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + w / 2, 0); g.lineTo(x + w / 2, y); g.stroke();
      const grd = g.createLinearGradient(x, y, x + w, y + h);
      grd.addColorStop(0, U.darken(col, .18));
      grd.addColorStop(.5, col);
      grd.addColorStop(1, U.darken(col, .38));
      g.fillStyle = grd;
      U.poly(g, [[x, y], [x + w, y], [x + w, y + h - 16], [x + w / 2, y + h], [x, y + h - 16]]);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 1.4; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.22)';
      g.strokeRect(x + 5, y + 6, w - 10, h - 26);
      g.fillStyle = 'rgba(255,255,255,.82)';
      g.font = '700 18px "Bahnschrift","Arial Narrow",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(num, x + w / 2, y + 34);
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.font = '600 6px "Segoe UI",sans-serif';
      g.fillText('AIRBALL', x + w / 2, y + h - 38);
      g.restore();
    },

    courtside(g, rand, theme){
      // seated silhouettes with rim light
      for (let i = 0; i < 46; i++){
        const x = 10 + rand() * (W - 20);
        if (x > 690 && x < 910) continue;
        const s = .8 + rand() * .55;
        const y = 690 - 20 * s;
        const col = i % 5 === 0 ? U.mixA('#05080d', theme.a.primary, .18) : [6, 8, 13];
        g.fillStyle = U.rgbStr(col);
        // shoulders
        g.beginPath();
        g.ellipse(x, y + 10 * s, 15 * s, 11 * s, 0, Math.PI, U.TAU);
        g.fill();
        // head
        g.beginPath();
        g.arc(x, y - 4 * s, 6.4 * s, 0, U.TAU);
        g.fill();
        // rim light
        g.strokeStyle = 'rgba(190,215,255,.14)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y - 4 * s, 6.4 * s, -2.5, -1.1);
        g.stroke();
      }
      // photographers kneeling at the baseline
      for (const x of [420, 760, 1010, 1240]){
        g.fillStyle = '#03050a';
        g.beginPath();
        g.ellipse(x, 694, 17, 9, 0, Math.PI, U.TAU);
        g.fill();
        g.beginPath(); g.arc(x + 9, 683, 5.4, 0, U.TAU); g.fill();
        g.fillStyle = 'rgba(160,190,230,.18)';
        g.fillRect(x + 12, 680, 7, 5);
      }
    },

    /* ============================================================
       COURT
       ============================================================ */
    buildCourt(theme){
      const cv = U.mkCanvas(W, H);
      const g = cv.getContext('2d');
      const rand = U.rng(4412);
      const top = 706, bot = 900;
      const A = theme.a, B = theme.b;

      // hardwood base
      let grd = g.createLinearGradient(0, top, 0, bot);
      grd.addColorStop(0, '#a9703a');
      grd.addColorStop(.3, '#c88a4c');
      grd.addColorStop(.72, '#dba15e');
      grd.addColorStop(1, '#c2864a');
      g.fillStyle = grd;
      g.fillRect(0, top, W, bot - top);

      // planks (horizontal bands with perspective)
      let y = top;
      let row = 0;
      while (y < bot){
        const hgt = 15 + (y - top) * 0.028;
        const tone = 0.02 + (row % 4) * 0.012 + rand() * .03;
        g.fillStyle = row % 2 ? `rgba(255,225,180,${tone})` : `rgba(70,35,10,${tone})`;
        g.fillRect(0, y, W, hgt);
        g.fillStyle = 'rgba(60,30,8,.13)';
        g.fillRect(0, y + hgt - 1, W, 1);
        // grain
        for (let i = 0; i < 26; i++){
          const gx = rand() * W, gw = 30 + rand() * 200;
          g.fillStyle = `rgba(80,42,12,${.02 + rand() * .035})`;
          g.fillRect(gx, y + 3 + rand() * (hgt - 5), gw, .8);
        }
        y += hgt; row++;
      }
      // plank joints
      for (let x = -40; x < W + 40; x += 84){
        g.fillStyle = 'rgba(60,30,8,.1)';
        g.fillRect(x + rand() * 30, top, 1, bot - top);
      }

      // lane paint (dunk zone)
      this.paintLane(g, theme.a, true);
      this.paintLane(g, theme.b, false);

      // centre court + logo
      g.save();
      g.globalAlpha = .9;
      g.strokeStyle = 'rgba(255,240,215,.62)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(800, 818, 168, 66, 0, 0, U.TAU);
      g.stroke();
      g.lineWidth = 1.5;
      g.globalAlpha = .38;
      g.beginPath();
      g.ellipse(800, 818, 138, 52, 0, 0, U.TAU);
      g.stroke();
      g.restore();

      // centre wordmark on the floor
      g.save();
      g.translate(800, 820);
      g.scale(1, .4);
      g.globalAlpha = .33;
      g.fillStyle = '#fff3dd';
      g.font = '700 58px "Bahnschrift","Arial Narrow",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('AIRBALL', 0, -22);
      g.font = '600 18px "Bahnschrift","Arial Narrow",sans-serif';
      g.globalAlpha = .26;
      g.fillText('A R E N A', 0, 32);
      g.restore();

      // half court line
      g.strokeStyle = 'rgba(255,240,215,.42)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(800, top + 4);
      g.lineTo(800, bot);
      g.stroke();

      // 3pt arcs
      this.threeLine(g, C.RIM_L, 1);
      this.threeLine(g, C.RIM_R, -1);

      // sidelines
      g.strokeStyle = 'rgba(255,240,215,.34)';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, top + 2.5); g.lineTo(W, top + 2.5); g.stroke();
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, bot - 2); g.lineTo(W, bot - 2); g.stroke();

      // baseline edge glow
      const bl = g.createLinearGradient(0, top, 0, top + 22);
      bl.addColorStop(0, 'rgba(255,220,150,.16)');
      bl.addColorStop(1, 'rgba(255,220,150,0)');
      g.fillStyle = bl; g.fillRect(0, top, W, 22);

      // glossy sheen
      grd = g.createLinearGradient(0, top, 0, bot);
      grd.addColorStop(0, 'rgba(255,255,255,.09)');
      grd.addColorStop(.24, 'rgba(255,255,255,.015)');
      grd.addColorStop(.55, 'rgba(255,255,255,.05)');
      grd.addColorStop(1, 'rgba(255,255,255,.0)');
      g.fillStyle = grd; g.fillRect(0, top, W, bot - top);

      // long soft reflection bands
      g.save();
      g.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++){
        const bx = 120 + i * 330 + rand() * 80;
        const bg = g.createLinearGradient(bx, top, bx + 120, bot);
        bg.addColorStop(0, 'rgba(255,235,200,.045)');
        bg.addColorStop(1, 'rgba(255,235,200,0)');
        g.fillStyle = bg;
        g.fillRect(bx, top, 130, bot - top);
      }
      g.restore();

      // front edge darkening
      grd = g.createLinearGradient(0, bot - 70, 0, bot);
      grd.addColorStop(0, 'rgba(20,10,4,0)');
      grd.addColorStop(1, 'rgba(10,5,2,.55)');
      g.fillStyle = grd; g.fillRect(0, bot - 70, W, 70);

      // baseline text
      g.save();
      g.globalAlpha = .22;
      g.fillStyle = '#fff1d8';
      g.font = '700 13px "Bahnschrift","Arial Narrow",sans-serif';
      g.textAlign = 'center';
      g.fillText('A I R B A L L   A R E N A', 800, 888);
      g.restore();

      this.court = cv;
    },

    paintLane(g, team, left){
      const top = 706, bot = 892;
      const rim = left ? C.RIM_L : C.RIM_R;
      const depth = C.DUNK_DIST;
      const x0 = left ? C.BOARD_L_X : C.BOARD_R_X;
      const x1 = left ? x0 + depth + 46 : x0 - depth - 46;
      const skew = left ? -34 : 34;
      g.save();
      const grd = g.createLinearGradient(0, top, 0, bot);
      grd.addColorStop(0, U.rgba(team.primary, .30));
      grd.addColorStop(.55, U.rgba(team.primary, .22));
      grd.addColorStop(1, U.rgba(team.primary, .32));
      g.fillStyle = grd;
      U.poly(g, [[x0, top], [x1, top], [x1 + skew, bot], [x0 + skew, bot]]);
      g.fill();
      // paint glow at the outer edge
      g.strokeStyle = U.rgba(team.secondary, .5);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x1, top); g.lineTo(x1 + skew, bot);
      g.stroke();
      g.strokeStyle = 'rgba(255,240,215,.5)';
      g.lineWidth = 2;
      U.poly(g, [[x0, top], [x1, top], [x1 + skew, bot], [x0 + skew, bot]]);
      g.stroke();
      // free throw arc
      g.beginPath();
      g.ellipse(left ? x1 + 8 : x1 - 8, 806, 44, 22, 0, 0, U.TAU);
      g.stroke();
      // lane text
      g.save();
      g.translate((x0 + x1) / 2 + 14, 826);
      g.scale(1, .44);
      g.globalAlpha = .34;
      g.fillStyle = team.secondary;
      g.font = '700 22px "Bahnschrift","Arial Narrow",sans-serif';
      g.textAlign = 'center';
      g.fillText('DUNK ZONE', 0, 0);
      g.restore();
      g.restore();
    },

    threeLine(g, rim, dir){
      const top = 706, bot = 890;
      const base = rim + dir * C.THREE_DIST;
      g.save();
      g.strokeStyle = 'rgba(255,240,215,.55)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(base, top);
      g.bezierCurveTo(base + dir * 10, 760, base + dir * 34, 848, base + dir * 26, bot);
      g.stroke();
      // 3 marker
      g.globalAlpha = .4;
      g.fillStyle = '#fff2da';
      g.font = '700 22px "Bahnschrift","Arial Narrow",sans-serif';
      g.textAlign = 'center';
      g.fillText('3', base + dir * 38, 806);
      g.restore();
    },

    /* ============================================================
       dynamic backdrop
       ============================================================ */
    drawBackdrop(ctx, t, theme, opts = {}){
      ctx.drawImage(this.arena, 0, 0);

      /* spotlight beams */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beams = [
        { x: 150, a: 0.22 + Math.sin(t * .17) * .07, w: 260 },
        { x: 560, a: 0.16 + Math.sin(t * .13 + 2) * .05, w: 300 },
        { x: 1040, a: 0.17 + Math.sin(t * .15 + 4) * .06, w: 290 },
        { x: 1450, a: 0.21 + Math.sin(t * .11 + 1) * .07, w: 260 }
      ];
      for (const b of beams){
        const topX = b.x, topY = 50;
        const baseX = 800 + (b.x - 800) * .35 + Math.sin(t * .2 + b.x) * 90;
        const spread = b.w;
        const grd = ctx.createLinearGradient(topX, topY, baseX, 780);
        grd.addColorStop(0, 'rgba(180,210,255,.16)');
        grd.addColorStop(.45, 'rgba(150,190,255,.055)');
        grd.addColorStop(1, 'rgba(120,170,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(topX - 5, topY);
        ctx.lineTo(topX + 5, topY);
        ctx.lineTo(baseX + spread, 800);
        ctx.lineTo(baseX - spread, 800);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      /* crowd camera flashes */
      const flashRand = Math.sin(t * 999) * 10000;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const n = 10;
      for (let i = 0; i < n; i++){
        const idx = Math.floor(Math.abs(Math.sin((t * .7 + i * 1.37) * 3.1)) * this.seats.length);
        const s = this.seats[idx % this.seats.length];
        if (!s) continue;
        const pulse = Math.pow(Math.max(0, Math.sin(t * (2 + (i % 3)) + i * 2.1)), 22);
        if (pulse < .05) continue;
        ctx.globalAlpha = pulse * .9;
        U.glow(ctx, s.x, s.y, 22, '#cfe6ff', .8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(s.x - 1, s.y - 1, 2.4, 2.4);
      }
      ctx.restore();

      /* LED ribbon */
      this.ribbon(ctx, t, 512, 44, theme, opts);
    },

    ribbon(ctx, t, y, h, theme, opts){
      // panel
      const grd = ctx.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, '#060a11');
      grd.addColorStop(.5, '#0c1420');
      grd.addColorStop(1, '#04070c');
      ctx.fillStyle = grd;
      ctx.fillRect(0, y, W, h);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fillRect(0, y, W, 1);
      ctx.fillRect(0, y + h - 1, W, 1);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y + 2, W, h - 4);
      ctx.clip();

      const text = opts.ribbonText || `AIRBALL ARENA   ✦   ${theme.label1 || 'P1'}  VS  ${theme.label2 || 'P2'}   ✦   2 PLAYER SHOWDOWN   ✦   `;
      const speed = 62;
      const offset = (t * speed) % 1400;
      ctx.font = '700 19px "Bahnschrift","Arial Narrow",sans-serif';
      const tw = ctx.measureText(text).width;
      const col = theme.a.secondary || '#ffc247';
      for (let k = -1; k < 4; k++){
        const x = -offset + k * tw;
        ctx.save();
        ctx.translate(x, y + h / 2 + 1);
        ctx.globalAlpha = .8;
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
      // colour bleed
      ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createLinearGradient(0, y, 0, y + h);
      bg.addColorStop(0, 'rgba(255,160,40,.05)');
      bg.addColorStop(.5, 'rgba(255,160,40,.12)');
      bg.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, y, W, h);
      // scanlines
      for (let sy = y + 3; sy < y + h; sy += 3){
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.fillRect(0, sy, W, 1);
      }
      ctx.restore();
    },

    drawLightPools(ctx, t){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++){
        const x = 210 + i * 400 + Math.sin(t * .2 + i * 1.9) * 80;
        const g = ctx.createRadialGradient(x, 806, 0, x, 806, 290);
        g.addColorStop(0, 'rgba(190,215,255,.055)');
        g.addColorStop(1, 'rgba(190,215,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 300, 706, 600, 194);
      }
      ctx.restore();
    },

    /* ============================================================
       HOOP
       ============================================================ */
    drawHoop(ctx, left, t, st = {}){
      const rimX = left ? C.RIM_L : C.RIM_R;
      const bx = left ? C.BOARD_L_X : C.BOARD_R_X;
      const dir = left ? 1 : -1;
      const team = left ? (this.theme.a) : (this.theme.b);
      const acc = team.secondary || '#ffc247';

      ctx.save();

      /* --- stanchion --- */
      const baseX = bx - dir * 62;
      let g = ctx.createLinearGradient(baseX - 40, 0, baseX + 40, 0);
      g.addColorStop(0, '#0a0e15');
      g.addColorStop(.45, '#1a2230');
      g.addColorStop(1, '#080b11');
      ctx.fillStyle = g;
      U.poly(ctx, [[baseX - dir * 44, 792], [baseX + dir * 56, 792], [baseX + dir * 40, 842], [baseX - dir * 58, 842]]);
      ctx.fill();
      ctx.fillStyle = U.rgba(acc, .7);
      ctx.fillRect(baseX - dir * 40, 794, dir * 92, 3);
      // padded bumper
      g = ctx.createLinearGradient(0, 760, 0, 800);
      g.addColorStop(0, '#141b26');
      g.addColorStop(1, '#05080d');
      ctx.fillStyle = g;
      U.roundRect(ctx, Math.min(baseX - 34, baseX + 30), 762, 72, 40, 8);
      ctx.fill();

      /* --- upright + arm --- */
      ctx.strokeStyle = '#161d28';
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, 790);
      ctx.lineTo(baseX, 340);
      ctx.stroke();
      ctx.strokeStyle = '#2a3446';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(baseX - 4, 786);
      ctx.lineTo(baseX - 4, 344);
      ctx.stroke();
      ctx.strokeStyle = '#10161f';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(baseX, 352);
      ctx.lineTo(bx + dir * 8, 318);
      ctx.stroke();
      // diagonal brace
      ctx.strokeStyle = '#131a24';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(baseX, 560);
      ctx.lineTo(bx + dir * 20, 380);
      ctx.stroke();

      /* --- backboard --- */
      const boardW = 14;
      const bTop = C.BOARD_TOP, bBot = C.BOARD_BOT;
      const bX = left ? bx : bx - boardW;
      const innerX = left ? bx + boardW : bx - boardW;

      // frame
      ctx.fillStyle = '#0c1119';
      ctx.fillRect(bX - 3, bTop - 6, boardW + 6, bBot - bTop + 12);
      // glass
      g = ctx.createLinearGradient(bX, bTop, bX + (left ? boardW : -boardW), bBot);
      g.addColorStop(0, 'rgba(150,190,230,.20)');
      g.addColorStop(.35, 'rgba(80,120,165,.12)');
      g.addColorStop(.65, 'rgba(170,205,240,.18)');
      g.addColorStop(1, 'rgba(40,70,100,.10)');
      ctx.fillStyle = g;
      ctx.fillRect(bX, bTop, boardW, bBot - bTop);
      // diagonal reflection streaks
      ctx.save();
      ctx.beginPath();
      ctx.rect(bX, bTop, boardW, bBot - bTop);
      ctx.clip();
      ctx.strokeStyle = 'rgba(220,240,255,.25)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++){
        ctx.beginPath();
        ctx.moveTo(bX - 30 + i * 26, bBot);
        ctx.lineTo(bX + 40 + i * 26, bTop);
        ctx.stroke();
      }
      ctx.restore();
      // white border
      ctx.strokeStyle = 'rgba(240,248,255,.75)';
      ctx.lineWidth = 3;
      ctx.strokeRect(bX + 2, bTop - 4, boardW - 4, bBot - bTop + 8);
      // shooting square (seen edge-on as a bright inner strip)
      ctx.fillStyle = 'rgba(245,250,255,.5)';
      ctx.fillRect(bX + 5, 366, 2, 62);
      // padding at bottom
      ctx.fillStyle = U.rgba(team.primary, .85);
      ctx.fillRect(bX - 2, bBot - 2, boardW + 4, 10);
      ctx.fillStyle = U.rgba(acc, .9);
      ctx.fillRect(bX + 3, bBot - 2, 2, 10);

      // LED shot-clock box above board
      const scx = left ? bx + 8 : bx - 8;
      ctx.fillStyle = '#05080d';
      U.roundRect(ctx, scx - 19, 204, 38, 30, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
      const sclock = st.shotClock != null ? Math.ceil(st.shotClock) : 14;
      ctx.save();
      ctx.font = '700 20px "Bahnschrift","Arial Narrow",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = sclock <= 5 ? '#ff5a3c' : '#ffb03a';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14;
      ctx.fillText(String(sclock), scx, 220);
      ctx.restore();
      // board glow strip
      g = ctx.createLinearGradient(bX, 0, bX + 40 * dir, 0);
      g.addColorStop(0, U.rgba(acc, .24));
      g.addColorStop(1, U.rgba(acc, 0));
      ctx.fillStyle = g;
      ctx.fillRect(bX, bTop, 40 * dir, bBot - bTop);

      /* --- rim --- */
      const rimY = C.RIM_Y, half = C.RIM_HALF;
      // support bracket
      ctx.strokeStyle = '#d9611a';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(innerX, rimY + 2);
      ctx.lineTo(rimX - dir * half + dir * 5, rimY);
      ctx.stroke();
      // rim ellipse (front/back)
      ctx.save();
      ctx.translate(rimX, rimY);
      // back arc shadow
      ctx.strokeStyle = '#7c2f07';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(0, 0, half, 10, 0, Math.PI, U.TAU);
      ctx.stroke();
      // main ring
      g = ctx.createLinearGradient(0, -12, 0, 12);
      g.addColorStop(0, '#ffb15a');
      g.addColorStop(.45, '#ff7a1a');
      g.addColorStop(1, '#b83f05');
      ctx.strokeStyle = g;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(0, 0, half, 10, 0, 0, U.TAU);
      ctx.stroke();
      // bright front edge
      ctx.strokeStyle = 'rgba(255,200,130,.95)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 1, half - 2, 8, 0, .15, Math.PI - .15);
      ctx.stroke();
      // attachment nubs
      ctx.fillStyle = '#c9530f';
      ctx.beginPath(); ctx.arc(-half, 0, 4.5, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(half, 0, 4.5, 0, U.TAU); ctx.fill();
      ctx.restore();

      /* --- net --- */
      this.net(ctx, rimX, rimY, half, t, st.netKick || 0, st.netSide || 0);

      ctx.restore();
    },

    net(ctx, rimX, rimY, half, t, kick, side){
      const strands = 11;
      const depth = 82 + kick * 24;
      const bottomHalf = half * .56;
      const pts = [];
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < strands; i++){
        const f = i / (strands - 1);
        const topX = rimX - half + 3 + f * (half * 2 - 6);
        const botX = rimX - bottomHalf + f * bottomHalf * 2;
        const wob = Math.sin(t * 5.2 + i * .9) * (1.6 + kick * 5);
        const sway = side * 6 + Math.sin(t * 3.1 + i * .4) * 1.4;
        const yb = rimY + depth + Math.cos(f * Math.PI) * 5 + wob + kick * Math.sin(i * 1.7 + t * 18) * 8;
        const cx = (topX + botX) / 2 + sway;
        const cy = rimY + depth * .52;
        pts.push([topX, rimY + 4, cx, cy + wob * .5, botX + sway, yb]);
        ctx.strokeStyle = `rgba(235,244,255,${.52 + (i % 3) * .1})`;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(topX, rimY + 4);
        ctx.quadraticCurveTo(cx, cy + wob * .4, botX + sway, yb);
        ctx.stroke();
      }
      // cross strands
      for (let row = 1; row <= 3; row++){
        const k = row / 4;
        ctx.beginPath();
        for (let i = 0; i < strands; i++){
          const p = pts[i];
          const x = U.lerp(p[0], p[4], k) + Math.sin(t * 3 + i) * (1 + kick * 2);
          const y = U.lerp(p[1], p[5], k) + Math.sin(k * Math.PI) * 6;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(225,238,255,${.4 - row * .05})`;
        ctx.lineWidth = 1.05;
        ctx.stroke();
      }
      // bottom ring
      ctx.strokeStyle = 'rgba(255,245,235,.85)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(rimX + side * 6, rimY + depth + 5, bottomHalf, 7, 0, 0, U.TAU);
      ctx.stroke();
      ctx.restore();
    },

    /* ============================================================
       BALL
       ============================================================ */
    drawBall(ctx, x, y, r, rot, opts = {}){
      ctx.save();
      // glow when hot
      if (opts.glow){
        U.glow(ctx, x, y, r * 4.2, opts.glow, .55);
      }
      ctx.translate(x, y);
      ctx.rotate(rot);
      // base sphere
      const g = ctx.createRadialGradient(-r * .38, -r * .42, r * .08, 0, 0, r * 1.06);
      g.addColorStop(0, '#ffcf85');
      g.addColorStop(.32, '#ffa03d');
      g.addColorStop(.7, '#e9701a');
      g.addColorStop(1, '#9c3d05');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); ctx.fill();

      // seams
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, r - .6, 0, U.TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(70,26,4,.82)';
      ctx.lineWidth = Math.max(1.4, r * .085);
      ctx.lineCap = 'round';
      // vertical seam
      ctx.beginPath();
      ctx.ellipse(0, 0, r * .42, r, 0, 0, U.TAU);
      ctx.stroke();
      // horizontal seam
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * .52, 0, 0, U.TAU);
      ctx.stroke();
      // curved side seams
      ctx.beginPath();
      ctx.arc(-r * .95, 0, r * .78, -.85, .85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * .95, 0, r * .78, Math.PI - .85, Math.PI + .85);
      ctx.stroke();
      ctx.restore();

      // rim light
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, U.TAU);
      ctx.strokeStyle = 'rgba(255,190,120,.5)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // specular
      ctx.beginPath();
      ctx.ellipse(-r * .35, -r * .42, r * .26, r * .17, -.7, 0, U.TAU);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * .28, r * .3, r * .3, r * .16, .7, 0, U.TAU);
      ctx.fillStyle = 'rgba(255,180,90,.2)';
      ctx.fill();

      ctx.restore();
    },

    /* shadow under an airborne object */
    shadow(ctx, x, y, rx, ry, alpha = .34){
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, `rgba(0,0,0,${alpha})`);
      g.addColorStop(.55, `rgba(0,0,0,${alpha * .55})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, U.TAU); ctx.fill();
      ctx.restore();
    },

    /* dunk-zone / possession floor marker */
    floorRing(ctx, x, y, rx, ry, color, alpha, t, dash = false){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba(color, alpha);
      ctx.lineWidth = 3;
      if (dash) ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, U.TAU);
      ctx.stroke();
      ctx.restore();
    }
  };
})();
