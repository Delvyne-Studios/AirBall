/* ============================================================
   AIRBALL — engine render pass
   ============================================================ */
(function(){
  const AB = window.AB = window.AB || {};
  const U = AB.U, C = AB.C, Art = AB.Art, Players = AB.Players;
  const Engine = AB.Engine;

  Engine.render = function(){
    const ctx = this.ctx;
    const t = this.t;
    const att = this.mode === 'attract';
    const theme = this.theme || Art.theme;

    ctx.save();
    ctx.clearRect(0, 0, C.W, C.H);

    // ---- camera ----
    let sx = 0, sy = 0;
    if (this.shake > .2){
      sx = (Math.random() - .5) * this.shake;
      sy = (Math.random() - .5) * this.shake;
    }
    let zoom = 1;
    if (att){
      const p = t * .07;
      sx += Math.sin(p) * 16;
      sy += Math.cos(p * .7) * 5;
      zoom = 1.028 + Math.sin(t * .11) * .006;
    }
    if (this.slow > 0) zoom += this.slow * .012;
    ctx.translate(C.W / 2, C.H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-C.W / 2 + sx, -C.H / 2 + sy);

    // ---- backdrop ----
    Art.drawBackdrop(ctx, t, theme, {
      ribbonText: `AIRBALL ARENA   ✦   ${theme.label1 || 'PLAYER 1'}  VS  ${theme.label2 || 'PLAYER 2'}   ✦   SEASON 01   ✦   `
    });
    Art.drawLightPools(ctx, t);
    if (Art.court) ctx.drawImage(Art.court, 0, 0);

    // ---- floor deco ----
    this.drawFloorMarks(ctx, t);

    // ---- reflections ----
    this.drawReflections(ctx, t);

    // ---- hoops ----
    const sc = (this.phase === 'live' || this.phase === 'dead' || this.phase === 'countdown') ? Math.ceil(this.shotClock) : 14;
    Art.drawHoop(ctx, true, t, {
      shotClock: sc,
      netKick: this.hoops[0].netKick,
      netSide: this.hoops[0].netSide,
      rimFlash: this.hoops[0].rimFlash
    });
    Art.drawHoop(ctx, false, t, {
      shotClock: sc,
      netKick: this.hoops[1].netKick,
      netSide: this.hoops[1].netSide,
      rimFlash: this.hoops[1].rimFlash
    });

    // ---- shadows ----
    for (const p of this.players){
      const H = this.playerH(p);
      const shrink = U.clamp(1 - p.z / 700, .45, 1);
      Art.shadow(ctx, p.x + 4, C.FLOOR_Y + 2, 40 * p.data.body.build * shrink, 10 * shrink, .42 * shrink);
    }
    this.drawBallShadow(ctx);

    // ---- players ----
    const order = this.players.slice().sort((a, b) => (a.hasBall ? 1 : 0) - (b.hasBall ? 1 : 0));
    for (const p of order) Players.draw(ctx, p, t, att ? 0.016 : 0.016);

    // ---- ball ----
    this.drawBallScene(ctx, t);

    // ---- player markers ----
    if (!att) this.drawMarkers(ctx, t);

    // ---- particles ----
    this.drawParticles(ctx, t);
    this.drawPopups(ctx, t);

    // ---- on-court UI ----
    if (!att) this.drawCourtUI(ctx, t);

    // ---- countdown / quarter banner ----
    if (!att) this.drawPhaseOverlay(ctx, t);

    // ---- flashes / vignette ----
    if (this.flash > 0){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,240,215,${this.flash * .3})`;
      ctx.fillRect(-40, -40, C.W + 80, C.H + 80);
      ctx.restore();
    }
    if (this.slow > 0){
      const vg = ctx.createRadialGradient(C.W / 2, C.H / 2, 200, C.W / 2, C.H / 2, 800);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${this.slow * .5})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, C.W, C.H);
    }

    ctx.restore();
  };

  /* ------------------------------------------------------------
     floor marks
     ------------------------------------------------------------ */
  Engine.drawFloorMarks = function(ctx, t){
    const att = this.mode === 'attract';
    for (const p of this.players){
      const col = p.idx === 0 ? C.P1_COLOR : C.P2_COLOR;
      const has = p.hasBall;
      const pulse = .5 + .5 * Math.sin(t * 3.2 + p.idx * 2);
      ctx.save();
      ctx.globalAlpha = has ? .55 + pulse * .2 : .16;
      ctx.strokeStyle = col;
      ctx.lineWidth = has ? 3 : 2;
      ctx.shadowColor = col;
      ctx.shadowBlur = has ? 16 : 0;
      ctx.beginPath();
      ctx.ellipse(p.x, C.FLOOR_Y + 3, 44, 12, 0, 0, U.TAU);
      ctx.stroke();
      ctx.restore();
    }

    // dunk zone glow when a player is inside it with the ball
    if (!att){
      for (const p of this.players){
        if (!p.hasBall) continue;
        const d = this.distToRim(p);
        const maxDunk = this.dunkDist ? this.dunkDist(p) : C.DUNK_DIST;
        if (d < maxDunk + 10){
          const k = 1 - U.clamp(d / (maxDunk + 10), 0, 1);
          const rim = this.ownRim(p);
          const col = p.idx === 0 ? C.P1_COLOR : C.P2_COLOR;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(rim, C.FLOOR_Y, 20, rim, C.FLOOR_Y, maxDunk + 90);
          g.addColorStop(0, U.rgba(col, .07 + k * .1));
          g.addColorStop(1, U.rgba(col, 0));
          ctx.fillStyle = g;
          ctx.fillRect(rim - 380, 700, 760, 200);
          ctx.restore();
        }
      }
    }
  };

  /* ------------------------------------------------------------
     reflections
     ------------------------------------------------------------ */
  Engine.drawReflections = function(ctx, t){
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 706, C.W, 194);
    ctx.clip();
    ctx.translate(0, C.FLOOR_Y + 10);
    ctx.scale(1, -0.5);
    ctx.translate(0, -C.FLOOR_Y);
    ctx.globalAlpha = .13;
    const order = this.players.slice().sort((a, b) => (a.hasBall ? 1 : 0) - (b.hasBall ? 1 : 0));
    for (const p of order){
      ctx.save();
      Players.draw(ctx, p, t, 0);
      ctx.restore();
    }
    // ball reflection
    const b = this.ball;
    if (b){
      ctx.globalAlpha = .1;
      Art.drawBall(ctx, b.x, b.y, b.r * .92, b.rot, {});
    }
    ctx.restore();

    // fade the reflection into the wood
    const g = ctx.createLinearGradient(0, C.FLOOR_Y, 0, 900);
    g.addColorStop(0, 'rgba(120,75,35,0)');
    g.addColorStop(.55, 'rgba(110,68,30,.28)');
    g.addColorStop(1, 'rgba(60,35,14,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, C.FLOOR_Y, C.W, 86);
  };

  /* ------------------------------------------------------------
     ball
     ------------------------------------------------------------ */
  Engine.drawBallShadow = function(ctx){
    const b = this.ball;
    if (!b) return;
    const h = U.clamp((C.FLOOR_Y - b.y) / 500, 0, 1);
    const rx = (b.r * 1.25) + h * 34;
    Art.shadow(ctx, b.x, C.FLOOR_Y + 1, rx, rx * .28, .36 * (1 - h * .62));
  };

  Engine.drawBallScene = function(ctx, t){
    const b = this.ball;
    if (!b) return;
    // trail
    if (b.trail.length > 1){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < b.trail.length; i++){
        const p = b.trail[i];
        const f = i / b.trail.length;
        ctx.globalAlpha = f * .22;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, b.r * (1.4 + f));
        g.addColorStop(0, 'rgba(255,190,100,.8)');
        g.addColorStop(1, 'rgba(255,120,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, b.r * (1.4 + f), 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    // on-fire ball
    const holder = this.players.find(p => p.hasBall);
    let glow = null;
    if (holder && holder.onFire) glow = '#ff9a2e';
    if (b.state === 'shot') glow = 'rgba(255,180,80,.5)';
    Art.drawBall(ctx, b.x, b.y, b.r, b.rot, { glow });
    if (holder && holder.onFire){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .5 + Math.sin(t * 12) * .2;
      ctx.strokeStyle = '#ffb03a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 5, 0, U.TAU);
      ctx.stroke();
      ctx.restore();
    }
  };

  /* ------------------------------------------------------------
     markers above players
     ------------------------------------------------------------ */
  Engine.drawMarkers = function(ctx, t){
    for (const p of this.players){
      const H = this.playerH(p);
      const top = C.FLOOR_Y - p.z - H * 1.02;
      const col = p.idx === 0 ? C.P1_COLOR : C.P2_COLOR;
      const bob = Math.sin(t * 3 + p.idx) * 3;

      // possession chevron
      if (p.hasBall){
        const yy = top - 34 + bob;
        ctx.save();
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(p.x, yy + 12);
        ctx.lineTo(p.x - 10, yy);
        ctx.lineTo(p.x + 10, yy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // name tag
      const ty = top - 16;
      ctx.save();
      ctx.globalAlpha = .92;
      U.roundRect(ctx, p.x - 33, ty - 11, 66, 20, 6);
      ctx.fillStyle = 'rgba(6,10,17,.62)';
      ctx.fill();
      ctx.strokeStyle = U.rgba(col, .45);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x - 23, ty - 1, 3, 0, U.TAU);
      ctx.fill();
      U.drawSpaced(ctx, p.idx === 0 ? 'P1' : 'P2', p.x + 1, ty - 1, 1.5, { size: 10, weight: 700, color: '#e9f2ff' });
      ctx.restore();

      // on fire halo
      if (p.onFire){
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const yy = C.FLOOR_Y - p.z - H * .72;
        const g = ctx.createRadialGradient(p.x, yy, 6, p.x, yy, H * .55);
        g.addColorStop(0, `rgba(255,150,40,${.16 + Math.sin(t * 9) * .05})`);
        g.addColorStop(1, 'rgba(255,90,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - H, yy - H, H * 2, H * 2);
        ctx.restore();
      }
    }
  };

  /* ------------------------------------------------------------
     on-court UI: shot meter, prompts
     ------------------------------------------------------------ */
  Engine.drawCourtUI = function(ctx, t){
    for (const p of this.players){
      const H = this.playerH(p);
      const key = p.idx === 0 ? 'F' : 'L';
      const jumpKey = p.idx === 0 ? 'W' : '↑';
      const col = p.idx === 0 ? C.P1_COLOR : C.P2_COLOR;

      // Stun visual indicator (stars halo & timer)
      if (p.stumbleT > 0){
        const cx = p.x;
        const cy = C.FLOOR_Y - p.z - H - 38;
        ctx.save();
        ctx.translate(cx, cy);
        const orbitT = t * 6.5;
        for (let i = 0; i < 4; i++){
          const ang = orbitT + i * (Math.PI / 2);
          const sx = Math.cos(ang) * 26;
          const sy = Math.sin(ang) * 8;
          ctx.fillStyle = '#ffd166';
          ctx.shadowColor = '#ffb703';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(sx, sy, 4.5, 0, U.TAU);
          ctx.fill();
        }
        const stunLabel = `STUNNED! ${(p.stumbleT).toFixed(1)}s`;
        ctx.font = '700 12px "Bahnschrift","Arial Narrow",sans-serif';
        const stw = ctx.measureText(stunLabel).width + 18;
        U.roundRect(ctx, -stw / 2, -26, stw, 22, 6);
        ctx.fillStyle = 'rgba(230,57,70,.92)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        U.text(ctx, stunLabel, 0, -15, { size: 12, weight: 800, color: '#fff' });
        ctx.restore();
      }

      // Ball handler prompts
      if (p.hasBall && !p.dunk && p.stumbleT <= 0){
        const inDunkRange = p.grounded && (this.distToRim(p) < this.dunkDist(p));
        const pulse = .5 + .5 * Math.sin(t * 7);
        const yy = C.FLOOR_Y - p.z - H - 76;
        ctx.save();

        if (inDunkRange){
          // Dunk prompt
          ctx.globalAlpha = .90 + pulse * .10;
          const label = `${key}  SLAM DUNK`;
          ctx.font = '700 15px "Bahnschrift","Arial Narrow",sans-serif';
          const tw = ctx.measureText(label).width + 28;
          U.roundRect(ctx, p.x - tw / 2, yy - 15, tw, 30, 8);
          ctx.fillStyle = 'rgba(6,10,17,.85)';
          ctx.fill();
          ctx.strokeStyle = '#ff7a1a';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ff7a1a';
          ctx.shadowBlur = 14;
          ctx.stroke();
          U.text(ctx, label, p.x, yy + 1, { size: 15, weight: 800, color: '#ffb347', shadow: '#ff7a1a', blur: 10 });
        } else if (!p.grounded){
          // Mid-air Jump Shot prompt (boosted!)
          ctx.globalAlpha = .95;
          const label = `${key}  JUMP SHOT (+10% ACC)`;
          ctx.font = '700 14px "Bahnschrift","Arial Narrow",sans-serif';
          const tw = ctx.measureText(label).width + 26;
          U.roundRect(ctx, p.x - tw / 2, yy - 14, tw, 28, 8);
          ctx.fillStyle = 'rgba(6,14,24,.88)';
          ctx.fill();
          ctx.strokeStyle = '#37d9ff';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#37d9ff';
          ctx.shadowBlur = 12;
          ctx.stroke();
          U.text(ctx, label, p.x, yy, { size: 14, weight: 800, color: '#9fe8ff', shadow: '#37d9ff', blur: 8 });
        } else {
          // Grounded prompt: Shoot direct or jump with W/Up
          ctx.globalAlpha = .82;
          const label = `${key} SHOOT  ·  ${jumpKey} JUMP`;
          ctx.font = '700 13px "Bahnschrift","Arial Narrow",sans-serif';
          const tw = ctx.measureText(label).width + 22;
          U.roundRect(ctx, p.x - tw / 2, yy - 13, tw, 26, 7);
          ctx.fillStyle = 'rgba(6,10,17,.80)';
          ctx.fill();
          ctx.strokeStyle = U.rgba(col, .7);
          ctx.lineWidth = 1.3;
          ctx.stroke();
          U.text(ctx, label, p.x, yy, { size: 13, weight: 700, color: '#ffffff', shadow: col, blur: 6 });
        }
        ctx.restore();
      }

      // Steal prompt for defender (with whiff warning)
      if (!p.hasBall && this.players.some(q => q.hasBall) && !p.dunk && p.stumbleT <= 0){
        const holder = this.opponent(p);
        if (holder && holder.hasBall && Math.abs(holder.x - p.x) < 110 && Math.abs(holder.z - p.z) < 70){
          const yy = C.FLOOR_Y - p.z - H - 70;
          ctx.save();
          ctx.globalAlpha = .85;
          const label = `${key} STEAL (TIME IT!)`;
          U.text(ctx, label, p.x, yy, { size: 13, weight: 800, color: '#ffd9a3', shadow: 'rgba(0,0,0,.9)', blur: 6 });
          ctx.restore();
        }
      }
    }
  };

  /* ------------------------------------------------------------
     particles
     ------------------------------------------------------------ */
  Engine.drawParticles = function(ctx, t){
    for (const p of this.particles){
      const k = p.t / p.life;
      const a = 1 - k;
      if (p.kind === 'spark'){
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * .9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * .6;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * .016, p.y - p.vy * .016);
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === 'dust'){
        ctx.save();
        ctx.globalAlpha = a * .35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + k * 1.6), 0, U.TAU);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'confetti'){
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.kind === 'fire'){
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * .55;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, U.TAU);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'stun_star'){
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(0, 0, p.size, 0);
        ctx.quadraticCurveTo(0, 0, 0, p.size);
        ctx.quadraticCurveTo(0, 0, -p.size, 0);
        ctx.quadraticCurveTo(0, 0, 0, -p.size);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'tear'){
        ctx.save();
        ctx.globalAlpha = a * 0.95;
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.8, p.size * 1.3, 0, 0, U.TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  };

  Engine.drawPopups = function(ctx, t){
    for (const p of this.popups){
      const k = p.t / p.life;
      const scale = k < .16 ? U.easeOutBack(k / .16) : 1;
      const alpha = k > .7 ? 1 - (k - .7) / .3 : 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${p.size}px "Bahnschrift","Arial Narrow",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, p.size * .16);
      ctx.strokeStyle = 'rgba(4,7,12,.55)';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * .5;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
  };

  /* ------------------------------------------------------------
     countdown + quarter banner
     ------------------------------------------------------------ */
  Engine.drawPhaseOverlay = function(ctx, t){
    if (this.phase === 'countdown' && this.countdownT > 0){
      const n = Math.ceil(this.countdownT - .55);
      if (n > 0){
        const frac = 1 - ((this.countdownT - .55) % 1);
        const scale = .82 + U.easeOutCubic(U.clamp(frac * 1.6, 0, 1)) * .3;
        const alpha = U.clamp((this.countdownT - .4) * 2, 0, 1);
        const isGo = false;
        ctx.save();
        const g = ctx.createRadialGradient(C.W / 2, 430, 60, C.W / 2, 430, 620);
        g.addColorStop(0, 'rgba(3,6,11,.55)');
        g.addColorStop(1, 'rgba(3,6,11,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, C.W, C.H);
        ctx.globalAlpha = alpha;
        ctx.translate(C.W / 2, 415);
        ctx.scale(scale, scale);
        ctx.font = '700 210px "Bahnschrift","Arial Narrow",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 12;
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.strokeText(String(n), 0, 8);
        const tg = ctx.createLinearGradient(0, -110, 0, 110);
        tg.addColorStop(0, '#ffffff');
        tg.addColorStop(.55, '#ffe3a6');
        tg.addColorStop(1, '#ff9124');
        ctx.fillStyle = tg;
        ctx.shadowColor = 'rgba(255,150,40,.55)';
        ctx.shadowBlur = 60;
        ctx.fillText(String(n), 0, 0);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = alpha * .9;
        U.drawSpaced(ctx, this.quarter === 5 ? 'OVERTIME' : 'TIP OFF', C.W / 2, 565, 6, { size: 18, weight: 700, color: '#c9d8ea' });
        ctx.restore();
      }
    }

    if (this.phase === 'break'){
      const k = 1 - U.clamp(this.breakT / 4.2, 0, 1);
      const inA = U.clamp(k * 4, 0, 1);
      const outA = U.clamp(this.breakT / .7, 0, 1);
      const a = Math.min(inA, outA);
      const qLabel = this.quarter <= 4 ? 'END OF Q' + this.quarter : 'END OF OVERTIME';
      ctx.save();
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(C.W / 2, 400, 100, C.W / 2, 450, 760);
      g.addColorStop(0, 'rgba(3,6,11,.72)');
      g.addColorStop(1, 'rgba(3,6,11,.2)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, C.W, C.H);

      ctx.translate(C.W / 2, 360);
      U.drawSpaced(ctx, qLabel, 0, 0, 8, { size: 18, weight: 700, color: '#ffc857', shadow: 'rgba(255,180,60,.5)', blur: 16 });
      ctx.font = '700 82px "Bahnschrift","Arial Narrow",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tg = ctx.createLinearGradient(0, -50, 0, 50);
      tg.addColorStop(0, '#ffffff');
      tg.addColorStop(1, '#a9c8e8');
      ctx.fillStyle = tg;
      ctx.fillText(qLabel, 0, 46);
      ctx.restore();

      // score line
      ctx.save();
      ctx.globalAlpha = a;
      const y = 470;
      ctx.font = '700 76px "Bahnschrift","Arial Narrow",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.P1_COLOR;
      ctx.fillText(String(this.score[0]), C.W / 2 - 150, y);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.font = '600 26px "Bahnschrift","Arial Narrow",sans-serif';
      ctx.fillText('—', C.W / 2, y);
      ctx.font = '700 76px "Bahnschrift","Arial Narrow",sans-serif';
      ctx.fillStyle = C.P2_COLOR;
      ctx.fillText(String(this.score[1]), C.W / 2 + 150, y);

      ctx.globalAlpha = a * .75;
      U.drawSpaced(ctx, this.quarter >= 4 ? 'FINAL' : (this.quarter === 3 ? 'FINAL QUARTER NEXT' : 'NEXT QUARTER IN ' + Math.max(1, Math.ceil(this.breakT))), C.W / 2, 540, 3, { size: 12, weight: 700, color: '#9fb3c9' });
      U.drawSpaced(ctx, 'PRESS  F  OR  L  TO CONTINUE', C.W / 2, 585, 2.5, { size: 10, weight: 600, color: '#66788e' });
      ctx.restore();
    }
  };
})();
