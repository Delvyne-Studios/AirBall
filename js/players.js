/* ============================================================
   AIRBALL — character renderer (procedural vector athletes)
   ============================================================ */
(function(){
  const AB = window.AB = window.AB || {};
  const U = AB.U, C = AB.C;
  const TAU = U.TAU;

  const Players = AB.Players = {};

  /* ------------------------------------------------------------
     IK helper
     ------------------------------------------------------------ */
  function ik2(sx, sy, tx, ty, l1, l2, preferDown){
    let dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy);
    const min = Math.abs(l1 - l2) + .001;
    const max = l1 + l2 - .001;
    if (d < min) d = min;
    if (d > max) d = max;
    const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const mx = sx + ux * a, my = sy + uy * a;
    const e1x = mx - uy * h, e1y = my + ux * h;
    const e2x = mx + uy * h, e2y = my - ux * h;
    let ex, ey;
    if (preferDown ? (e1y > e2y) : (e1y < e2y)) { ex = e1x; ey = e1y; }
    else { ex = e2x; ey = e2y; }
    return { ex, ey, hx: sx + ux * d, hy: sy + uy * d, d };
  }

  /* ------------------------------------------------------------
     limb + hand + shoe primitives
     ------------------------------------------------------------ */
  function limb(ctx, x1, y1, x2, y2, r1, r2, col, shade, hi){
    U.capsule(ctx, x1, y1, x2, y2, r1, r2);
    ctx.fillStyle = col;
    ctx.fill();
    // shadow edge
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    U.capsule(ctx, x1, y1, x2, y2, r1 * .98, r2 * .98);
    ctx.clip();
    ctx.globalAlpha = .5;
    ctx.strokeStyle = shade;
    ctx.lineWidth = Math.max(1.2, r1 * .42);
    ctx.beginPath();
    ctx.moveTo(x1 - Math.sin(ang) * r1 * .72, y1 + Math.cos(ang) * r1 * .72);
    ctx.lineTo(x2 - Math.sin(ang) * r2 * .72, y2 + Math.cos(ang) * r2 * .72);
    ctx.stroke();
    if (hi){
      ctx.globalAlpha = .34;
      ctx.strokeStyle = hi;
      ctx.lineWidth = Math.max(1, r1 * .2);
      ctx.beginPath();
      ctx.moveTo(x1 + Math.sin(ang) * r1 * .58, y1 - Math.cos(ang) * r1 * .58);
      ctx.lineTo(x2 + Math.sin(ang) * r2 * .58, y2 - Math.cos(ang) * r2 * .58);
      ctx.stroke();
    }
    ctx.restore();
  }

  function hand(ctx, x, y, r, skin, shade, band){
    ctx.save();
    U.ellipse(ctx, x, y, r * 1.02, r * .9);
    ctx.fillStyle = skin; ctx.fill();
    ctx.strokeStyle = shade; ctx.lineWidth = 1; ctx.globalAlpha = .55; ctx.stroke();
    if (band){
      ctx.globalAlpha = 1;
      ctx.fillStyle = band;
      U.roundRect(ctx, x - r * .95, y - r * .16, r * 1.9, r * .62, r * .18);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(x - r * .9, y - r * .1, r * 1.8, r * .1);
    }
    ctx.restore();
  }

  function shoe(ctx, x, y, ang, d, s, dark){
    const c1 = d.colors.jersey, c2 = d.colors.trim;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const L = .112 * s, Ht = .034 * s;
    // sole
    ctx.beginPath();
    ctx.moveTo(-.05 * s, -Ht * .3);
    ctx.lineTo(L * .82, -Ht * .3);
    ctx.quadraticCurveTo(L * 1.03, -Ht * .1, L, Ht * .55);
    ctx.lineTo(-.035 * s, Ht * .55);
    ctx.quadraticCurveTo(-.062 * s, Ht * .2, -.05 * s, -Ht * .3);
    ctx.closePath();
    ctx.fillStyle = '#e9eef4'; ctx.fill();
    ctx.strokeStyle = 'rgba(20,28,40,.45)'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(-.03 * s, Ht * .36, L * .92, Ht * .16);
    // upper
    ctx.beginPath();
    ctx.moveTo(-.045 * s, -Ht * .35);
    ctx.quadraticCurveTo(.01 * s, -Ht * 1.15, .052 * s, -Ht * .72);
    ctx.lineTo(.068 * s, -Ht * .25);
    ctx.quadraticCurveTo(.09 * s, -Ht * .1, L * .9, -Ht * .22);
    ctx.lineTo(L * .94, Ht * .2);
    ctx.quadraticCurveTo(L * .6, Ht * .42, .0, Ht * .34);
    ctx.lineTo(-.045 * s, -Ht * .35);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -Ht, L, Ht);
    g.addColorStop(0, U.lighten(c1, .08));
    g.addColorStop(1, U.darken(c1, .34));
    ctx.fillStyle = g; ctx.fill();
    // accent streak
    ctx.beginPath();
    ctx.moveTo(.0, -Ht * .1);
    ctx.quadraticCurveTo(.05 * s, Ht * .2, L * .62, Ht * .12);
    ctx.strokeStyle = c2; ctx.lineWidth = Ht * .24; ctx.lineCap = 'round';
    ctx.globalAlpha = .95; ctx.stroke();
    // laces
    ctx.globalAlpha = .55;
    ctx.strokeStyle = '#f4f7fb'; ctx.lineWidth = .9;
    for (let i = 0; i < 3; i++){
      ctx.beginPath();
      ctx.moveTo(.005 * s + i * .012 * s, -Ht * .55);
      ctx.lineTo(.025 * s + i * .012 * s, -Ht * .25);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------
     HEAD — side profile
     ------------------------------------------------------------ */
  function sideHead(ctx, hx, hy, H, d, opt = {}){
    const rx = .068 * H, ry = .086 * H;
    const skin = d.skin, shade = d.skinShade, light = d.skinLight;
    const tilt = opt.tilt || 0;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(tilt);

    // neck
    limb(ctx, -.004 * H, .62 * ry, .008 * H, 1.5 * ry, .034 * H, .042 * H, skin, shade, light);

    // skull + jaw silhouette
    ctx.beginPath();
    ctx.moveTo(-rx * .72, -ry * .78);
    ctx.bezierCurveTo(-rx * .25, -ry * 1.08, rx * .62, -ry * 1.02, rx * .86, -ry * .46);
    ctx.bezierCurveTo(rx * 1.0, -ry * .18, rx * .9, -ry * .04, rx * 1.02, ry * .1);   // nose bridge / tip
    ctx.bezierCurveTo(rx * .94, ry * .2, rx * .98, ry * .24, rx * .88, ry * .3);
    ctx.bezierCurveTo(rx * .98, ry * .42, rx * .86, ry * .5, rx * .8, ry * .52);       // lips
    ctx.bezierCurveTo(rx * .78, ry * .74, rx * .48, ry * .96, rx * .06, ry * 1.0);     // chin
    ctx.bezierCurveTo(-rx * .44, ry * .98, -rx * .78, ry * .74, -rx * .88, ry * .4);
    ctx.bezierCurveTo(-rx * 1.0, ry * .08, -rx * .98, -ry * .5, -rx * .72, -ry * .78);
    ctx.closePath();
    const hg = ctx.createLinearGradient(-rx, -ry, rx * .8, ry);
    hg.addColorStop(0, shade);
    hg.addColorStop(.42, skin);
    hg.addColorStop(1, light);
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,16,8,.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ear
    ctx.beginPath();
    ctx.ellipse(-rx * .52, ry * .12, rx * .18, ry * .24, -.2, 0, TAU);
    ctx.fillStyle = U.darken(skin, .06); ctx.fill();
    ctx.strokeStyle = shade; ctx.lineWidth = .9; ctx.globalAlpha = .7; ctx.stroke();
    ctx.globalAlpha = 1;

    // jaw shading
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(-rx * .15, ry * .48, rx * .55, ry * .42, .1, 0, TAU);
    ctx.fillStyle = U.rgba(shade, .25);
    ctx.fill();
    ctx.restore();

    // beard / stubble
    if (d.facial !== 'none'){
      ctx.save();
      const bAlpha = d.facial === 'stubble' ? .28 : .92;
      ctx.globalAlpha = bAlpha;
      ctx.fillStyle = d.beard || '#1c1410';
      if (d.facial === 'mj_mustache'){
        // Jordan's iconic 90s trim mustache
        ctx.beginPath();
        ctx.ellipse(rx * .52, ry * .40, rx * .28, ry * .08, .12, 0, TAU);
        ctx.fill();
      } else if (d.facial === 'full_beard'){
        // LeBron's thick king beard
        ctx.beginPath();
        ctx.moveTo(-rx * .84, ry * .15);
        ctx.bezierCurveTo(-rx * .94, ry * .65, -rx * .58, ry * 1.02, 0, ry * 1.04);
        ctx.bezierCurveTo(rx * .55, ry * 1.02, rx * .82, ry * .84, rx * .84, ry * .50);
        ctx.bezierCurveTo(rx * .60, ry * .66, rx * .2, ry * .7, rx * .05, ry * .58);
        ctx.bezierCurveTo(-rx * .2, ry * .50, -rx * .5, ry * .50, -rx * .84, ry * .15);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(rx * .52, ry * .40, rx * .32, ry * .11, .1, 0, TAU); ctx.fill();
      } else if (d.facial === 'short_beard' || d.facial === 'beard' || d.facial === 'stubble'){
        ctx.beginPath();
        ctx.moveTo(-rx * .82, ry * .2);
        ctx.bezierCurveTo(-rx * .9, ry * .66, -rx * .55, ry * .98, 0, ry * 1.0);
        ctx.bezierCurveTo(rx * .5, ry * .98, rx * .78, ry * .8, rx * .8, ry * .52);
        ctx.bezierCurveTo(rx * .55, ry * .66, rx * .2, ry * .7, rx * .05, ry * .6);
        ctx.bezierCurveTo(-rx * .2, ry * .52, -rx * .5, ry * .52, -rx * .82, ry * .2);
        ctx.closePath();
        ctx.fill();
      }
      if (d.facial === 'goatee' || d.facial === 'short_beard'){
        // moustache
        ctx.beginPath();
        ctx.ellipse(rx * .5, ry * .42, rx * .3, ry * .1, .1, 0, TAU);
        ctx.fill();
        // chin patch
        ctx.beginPath();
        ctx.ellipse(rx * .3, ry * .76, rx * .38, ry * .2, .05, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // hair
    sideHair(ctx, rx, ry, d, opt.hairKick || 0);

    // eye
    const ex = rx * .44, ey = -ry * .12;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx * .17, ry * .1, -.08, 0, TAU);
    ctx.fillStyle = '#f4ede4'; ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + rx * .04, ey + .2, rx * .085, 0, TAU);
    ctx.fillStyle = d.eyes || '#2a1a10'; ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + rx * .055, ey + .1, rx * .03, 0, TAU);
    ctx.fillStyle = '#0b0806'; ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + rx * .075, ey - .02, rx * .016, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
    // lid
    ctx.beginPath();
    ctx.moveTo(ex - rx * .18, ey - ry * .02);
    ctx.quadraticCurveTo(ex, ey - ry * .13, ex + rx * .19, ey - ry * .02);
    ctx.strokeStyle = 'rgba(35,20,10,.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();

    // brow
    ctx.beginPath();
    ctx.moveTo(rx * .26, ey - ry * .22);
    ctx.quadraticCurveTo(rx * .44, ey - ry * .32, rx * .68, ey - ry * .2);
    ctx.strokeStyle = d.brows || '#181210';
    ctx.lineWidth = Math.max(1.6, rx * .12);
    ctx.lineCap = 'round';
    ctx.stroke();

    // nose shadow
    ctx.beginPath();
    ctx.moveTo(rx * .84, ry * .02);
    ctx.quadraticCurveTo(rx * .7, ry * .2, rx * .8, ry * .26);
    ctx.strokeStyle = U.rgba(shade, .6);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // mouth
    ctx.beginPath();
    ctx.moveTo(rx * .46, ry * .56);
    ctx.quadraticCurveTo(rx * .64, ry * .62, rx * .78, ry * .54);
    ctx.strokeStyle = 'rgba(70,32,22,.7)';
    ctx.lineWidth = Math.max(1, rx * .07);
    ctx.stroke();

    // headband
    if (d.headband){
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -ry * .35, rx * .99, ry * .12, -.03, 0, TAU);
      ctx.fillStyle = d.headband; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = .8; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function sideHair(ctx, rx, ry, d, kick){
    const style = d.hair.style;
    const col = d.hair.color, hi = d.hair.light;
    if (style === 'bald'){
      // Jordan / Shaq smooth polished bald sheen
      ctx.beginPath();
      ctx.ellipse(-rx * .25, -ry * .8, rx * .42, ry * .16, -.5, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,.24)';
      ctx.fill();
      return;
    }
    ctx.save();
    const cap = (topOffset = 0) => {
      ctx.beginPath();
      ctx.moveTo(-rx * .92, -ry * .1);
      ctx.bezierCurveTo(-rx * 1.05, -ry * .8, -rx * .55, -ry * 1.16 - topOffset, 0, -ry * 1.12 - topOffset);
      ctx.bezierCurveTo(rx * .55, -ry * 1.08 - topOffset, rx * .95, -ry * .74, rx * .86, -ry * .3);
      ctx.bezierCurveTo(rx * .62, -ry * .58, rx * .2, -ry * .66, -rx * .1, -ry * .62);
      ctx.bezierCurveTo(-rx * .45, -ry * .58, -rx * .72, -ry * .38, -rx * .92, -ry * .1);
      ctx.closePath();
    };

    if (style === 'curly_fade' || style === 'curly'){
      // Curry's textured curly fade
      cap(ry * .08);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.fillStyle = hi;
      for (let i = 0; i < 14; i++){
        const a = Math.PI * (1.02 + i * .072);
        const rr = rx * (.76 + (i % 3) * .09);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr + rx * .04, Math.sin(a) * ry * 1.08 - ry * .24, rx * .12, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    if (style === 'cornrows' || style === 'braids'){
      // Iverson's iconic flowing braided cornrows
      cap();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = hi;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 6; i++){
        ctx.beginPath();
        ctx.moveTo(rx * (.28 - i * .16), -ry * .54);
        ctx.quadraticCurveTo(rx * (.15 - i * .18), -ry * .94, rx * (-.45 - i * .10), -ry * .78);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (style === 'wavy'){
      // Luka's stylish wavy hair
      cap(ry * .06);
      const wg = ctx.createLinearGradient(0, -ry * 1.15, 0, -ry * .1);
      wg.addColorStop(0, hi); wg.addColorStop(.5, col); wg.addColorStop(1, U.darken(col, .2));
      ctx.fillStyle = wg; ctx.fill();
      ctx.strokeStyle = U.rgba(hi, .6);
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 4; i++){
        ctx.beginPath();
        ctx.moveTo(rx * (.2 - i * .2), -ry * .65);
        ctx.quadraticCurveTo(rx * (.1 - i * .15), -ry * .98, -rx * (.3 + i * .12), -ry * .85);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    cap();
    const g = ctx.createLinearGradient(0, -ry * 1.1, 0, -ry * .1);
    g.addColorStop(0, hi); g.addColorStop(.5, col); g.addColorStop(1, U.darken(col, .2));
    ctx.fillStyle = g;
    ctx.fill();

    if (style === 'fade' || style === 'buzz' || style === 'buzz_taper'){
      ctx.globalAlpha = .35;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath();
      ctx.ellipse(-rx * .1, -ry * .12, rx * .95, ry * .2, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------
     PLAYER — in game
     ------------------------------------------------------------ */
  const basePose = () => ({
    crouch: .012, lean: .02, headTilt: 0, rot: 0,
    fh: [.16, -.44], bh: [-.005, -.42],
    ff: [.07, -.03], bf: [-.08, -.03],
    mouth: 0, armBend: 1
  });

  function targetPose(p, t){
    const P = basePose();
    const st = p.state;
    const spd = p.moveAmt || 0;

    if (st === 'run'){
      const ph = p.runPhase;
      P.lean = .17 + spd * .08;
      P.crouch = .02 + Math.abs(Math.sin(ph)) * .014;
      const stride = (.11 + spd * .10);
      P.ff = [-Math.cos(ph) * stride, -.03 - Math.max(0, Math.sin(ph)) * .12];
      P.bf = [Math.cos(ph) * stride, -.03 - Math.max(0, Math.sin(ph + Math.PI)) * .12];
      P.fh = [-.05 + Math.sin(ph) * .28, -.5 + Math.sin(ph) * .05];
      P.bh = [-.05 - Math.sin(ph) * .28, -.5 - Math.sin(ph) * .05];
      P.headTilt = .03;
    } else if (st === 'jump'){
      P.crouch = .0;
      P.ff = [.12, -.38];
      P.bf = [-.14, -.32];
      P.fh = [.14, -1.02];
      P.bh = [-.04, -.96];
      P.lean = .06;
      P.headTilt = -.08;
    } else if (st === 'release'){
      // High-arching professional jump-shot release form with wrist snap
      const k = U.clamp(p.stateT / .22, 0, 1);
      P.crouch = .0;
      P.lean = .02;
      P.ff = [.08, p.grounded ? -.03 : -.26];
      P.bf = [-.07, p.grounded ? -.03 : -.24];
      P.fh = [.18, -1.18 - Math.sin(k * Math.PI) * .06]; // extended release arm
      P.bh = [.02, -1.0]; // guide hand
      P.headTilt = -.16;
      P.mouth = .35;
    } else if (st === 'dunk'){
      // Multi-phase authentic NBA rim-shattering slam
      const k = p.dunk ? U.clamp(p.dunk.t / p.dunk.dur, 0, 1) : 0;
      if (k < .18){
        // Phase 1: explosive crouch & gather
        const f = k / .18;
        P.crouch = .08 * (1 - f);
        P.lean = .22;
        P.ff = [.12, -.04];
        P.bf = [-.16, -.04];
        P.fh = [.06, -.52];
        P.bh = [-.14, -.48];
        P.headTilt = -.05;
      } else if (k < .60){
        // Phase 2: soaring flight with ball cocked way back behind head
        const f = (k - .18) / .42;
        P.crouch = 0;
        P.lean = -.12 + f * .32;
        P.rot = -.10 + f * .20;
        P.ff = [.22 - f * .08, -.38 - Math.sin(f * Math.PI) * .12];
        P.bf = [-.26 + f * .12, -.26 - Math.sin(f * Math.PI) * .08];
        P.fh = [-.16 + f * .36, -1.22 + Math.sin(f * Math.PI) * .14]; // ball cocked back!
        P.bh = [.08, -.82 - f * .18];
        P.headTilt = -.18;
        P.mouth = .7;
      } else if (k < .74){
        // Phase 3: vicious rim-rocking slam
        const f = (k - .60) / .14;
        P.lean = .28;
        P.rot = .16;
        P.fh = [.24, -1.06 + f * .14];
        P.bh = [.12, -1.02 + f * .10];
        P.ff = [.18, -.32];
        P.bf = [-.18, -.26];
        P.mouth = .85;
        P.headTilt = .12;
      } else if (k < .88){
        // Phase 4: rim hang with swinging legs
        const f = (k - .74) / .14;
        const swing = Math.sin(f * Math.PI);
        P.lean = .32 * swing;
        P.rot = .16 * swing;
        P.fh = [.20, -1.14];
        P.bh = [.10, -1.12];
        P.ff = [.28 * swing, -.46 - swing * .08];
        P.bf = [.14 * swing, -.42 - swing * .08];
        P.mouth = .6;
        P.headTilt = -.04;
      } else {
        // Phase 5: landing absorption
        const f = (k - .88) / .12;
        P.crouch = .09 * (1 - f * .5);
        P.lean = .10;
        P.ff = [.12, -.04];
        P.bf = [-.14, -.04];
        P.fh = [.14, -.42];
        P.bh = [-.08, -.44];
        P.headTilt = .04;
      }
    } else if (st === 'steal'){
      const k = U.clamp(p.stateT / .18, 0, 1);
      P.lean = .32;
      P.crouch = .07;
      P.ff = [.20, -.03];
      P.bf = [-.22, -.03];
      P.fh = [.32 * k + .12, -.58];
      P.bh = [-.06, -.45];
      P.headTilt = -.08;
    } else if (st === 'block'){
      P.lean = -.04;
      P.crouch = 0;
      P.ff = [.10, -.30];
      P.bf = [-.12, -.26];
      P.fh = [.14, -1.12];
      P.bh = [-.06, -1.06];
      P.headTilt = -.06;
    } else if (st === 'stumble'){
      // 1-second dizzy stun wobble
      const wobble = Math.sin(p.stateT * 9) * .14;
      P.lean = -.26 + wobble;
      P.crouch = .06;
      P.ff = [.18, -.03];
      P.bf = [-.20, -.03];
      P.fh = [.22 + wobble * .6, -.65];
      P.bh = [-.24 - wobble * .6, -.60];
      P.headTilt = .24 + wobble * .4;
      P.mouth = .5;
    } else if (st === 'celebrate'){
      // Point score celebration: hype chest pound & flex
      const b = Math.abs(Math.sin(p.stateT * 6));
      P.crouch = b * .03;
      P.lean = -.06;
      P.fh = [.14 + Math.sin(p.stateT * 5) * .05, -1.08];
      P.bh = [-.10, -.65];
      P.ff = [.09, -.03];
      P.bf = [-.10, -.03];
      P.mouth = .7;
      P.headTilt = -.14;
    } else if (st === 'winner_celebrate'){
      // Match winner celebration: jumping with both arms raised in triumph!
      const jumpCycle = Math.abs(Math.sin(p.stateT * 5));
      P.crouch = jumpCycle * .04;
      P.lean = -.06;
      P.fh = [.18, -1.24];
      P.bh = [-.16, -1.22];
      P.ff = [.10, -.03 - jumpCycle * .12];
      P.bf = [-.10, -.03 - jumpCycle * .10];
      P.mouth = .9;
      P.headTilt = -.24;
    } else if (st === 'loser_crying'){
      // Match loser crying: slumped over, knees bent, hands covering face in grief!
      const sob = Math.sin(p.stateT * 7) * .02;
      P.crouch = .08 + sob;
      P.lean = .28;
      P.fh = [.06, -.82 + sob];
      P.bh = [-.02, -.80 + sob];
      P.ff = [.10, -.03];
      P.bf = [-.14, -.03];
      P.mouth = -.5;
      P.headTilt = .34;
    } else if (st === 'land'){
      P.crouch = .08;
      P.lean = .12;
      P.fh = [.18, -.36];
      P.bh = [-.08, -.38];
    } else {
      // idle athletic stance
      const b = Math.sin(t * 2.1 + p.idx * 2) * .006;
      P.crouch = .014 + b;
      P.lean = .02 + Math.sin(t * 1.3 + p.idx) * .012;
      P.fh = [.16, -.44 + b * .5];
      P.bh = [-.005, -.42 - b * .4];
      P.ff = [.07, -.03];
      P.bf = [-.08, -.03];
      P.headTilt = Math.sin(t * 1.1 + p.idx) * .015;
    }

    // dribbling arm follows ball
    if (p.hasBall && (st === 'idle' || st === 'run' || st === 'land') && p.ballAnim){
      const H = C.PLAYER_H * p.data.body.h;
      const bx = ((p.ballAnim.x - p.x) * p.facing) / H;
      const by = (p.ballAnim.y - (C.FLOOR_Y - p.z)) / H;
      P.fh = [U.clamp(bx, -.02, .32), U.clamp(by, -.66, -.26)];
      P.bh = [.02, -.42];
      if (st === 'run'){
        P.fh[1] = U.clamp(by, -.72, -.3);
      }
    }
    return P;
  }

  function easePose(cur, tgt, dt){
    const r = 20;
    for (const k in tgt){
      const tv = tgt[k];
      if (typeof tv === 'number'){
        cur[k] = cur[k] == null ? tv : U.damp(cur[k], tv, r, dt);
      } else {
        if (!cur[k]) cur[k] = tv.slice();
        cur[k][0] = U.damp(cur[k][0], tv[0], r, dt);
        cur[k][1] = U.damp(cur[k][1], tv[1], r, dt);
      }
    }
  }

  Players.draw = function(ctx, p, t, dt){
    const d = p.data;
    const H = C.PLAYER_H * d.body.h;
    const s = H; // shorthand for local units
    if (!p.pose) p.pose = basePose();
    const tgt = targetPose(p, t);
    easePose(p.pose, tgt, Math.min(dt, .05));
    const po = p.pose;

    const px = p.x;
    const py = C.FLOOR_Y - (p.z || 0);
    const face = p.facing >= 0 ? 1 : -1;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(face, 1);

    if (p.onFire){
      const grd = ctx.createRadialGradient(0, -H * .5, 10, 0, -H * .5, H * .8);
      grd.addColorStop(0, 'rgba(255,150,40,.22)');
      grd.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(-H * .8, -H * 1.5, H * 1.6, H * 1.5);
    }

    ctx.rotate(po.rot);

    const pelvisY = -.49 * H + po.crouch * H;
    const lean = po.lean;
    const hipF = [ .042 * H, pelvisY ];
    const hipB = [-.042 * H, pelvisY ];

    // shoulders (leaning around pelvis)
    const chestY = pelvisY - .285 * H;
    const shX = Math.sin(lean) * .285 * H;
    const shY = pelvisY - Math.cos(lean) * .285 * H;
    const shoulderF = [shX + .082 * H * d.body.shoulders, shY + .002 * H];
    const shoulderB = [shX - .086 * H * d.body.shoulders, shY + .004 * H];

    const thigh = .245 * H, shin = .215 * H;
    const armU = .19 * H, armF = .18 * H;

    // legs
    const footF = [po.ff[0] * H, po.ff[1] * H];
    const footB = [po.bf[0] * H, po.bf[1] * H];
    const legF = ik2(hipF[0], hipF[1], footF[0], footF[1], thigh, shin, false);
    const legB = ik2(hipB[0], hipB[1], footB[0], footB[1], thigh, shin, false);
    // force knee forward
    if (legF.ex < hipF[0] && legF.ey > hipF[1]) legF.ex = hipF[0] + (hipF[0] - legF.ex) * .2;
    if (legB.ex < hipB[0] && legB.ey > hipB[1]) legB.ex = hipB[0] + (hipB[0] - legB.ex) * .2;

    // arms targets (pose coordinates are relative to the feet)
    const armFrontT = [po.fh[0] * H, po.fh[1] * H];
    const armBackT = [po.bh[0] * H, po.bh[1] * H];
    const armFik = ik2(shoulderF[0], shoulderF[1], armFrontT[0], armFrontT[1], armU, armF, true);
    const armBik = ik2(shoulderB[0], shoulderB[1], armBackT[0], armBackT[1], armU, armF, true);

    const skin = d.skin, shade = d.skinShade, light = d.skinLight;

    /* ---- back arm ---- */
    limb(ctx, shoulderB[0], shoulderB[1], armBik.ex, armBik.ey, .038 * H, .032 * H, U.darken(skin, .1), shade, light);
    if (d.sleeve){
      limb(ctx, shoulderB[0], shoulderB[1], armBik.ex, armBik.ey, .039 * H, .033 * H, d.sleeve, U.darken(d.sleeve, .25), null);
    }
    limb(ctx, armBik.ex, armBik.ey, armBik.hx, armBik.hy, .031 * H, .025 * H, U.darken(skin, .06), shade, light);
    hand(ctx, armBik.hx, armBik.hy, .028 * H, U.darken(skin, .04), shade, null);

    /* ---- back leg ---- */
    limb(ctx, hipB[0], hipB[1], legB.ex, legB.ey, .06 * H, .042 * H, U.darken(skin, .12), shade, light);
    limb(ctx, legB.ex, legB.ey, legB.hx, legB.hy, .041 * H, .027 * H, U.darken(skin, .08), shade, light);
    shoe(ctx, legB.hx, legB.hy, Math.atan2(legB.hx - legB.ex, legB.hy - legB.ey) * .55, d, s, true);

    /* ---- torso ---- */
    ctx.save();
    ctx.translate(0, pelvisY);
    ctx.rotate(lean);
    const torsoTop = -.285 * H;
    const jc = d.colors;

    // body skin (torso)
    ctx.beginPath();
    ctx.moveTo(-.085 * H, .07 * H);
    ctx.bezierCurveTo(-.115 * H, -.09 * H, -.115 * H, -.21 * H, -.10 * H, torsoTop + .02 * H);
    ctx.bezierCurveTo(-.06 * H, torsoTop - .015 * H, .055 * H, torsoTop - .015 * H, .10 * H, torsoTop + .02 * H);
    ctx.bezierCurveTo(.12 * H, -.21 * H, .115 * H, -.09 * H, .085 * H, .07 * H);
    ctx.closePath();
    const torsoG = ctx.createLinearGradient(-.1 * H, 0, .1 * H, 0);
    torsoG.addColorStop(0, shade); torsoG.addColorStop(.55, skin); torsoG.addColorStop(1, light);
    ctx.fillStyle = torsoG; ctx.fill();

    // jersey
    ctx.beginPath();
    ctx.moveTo(-.095 * H, .05 * H);
    ctx.lineTo(-.105 * H, -.20 * H);
    ctx.bezierCurveTo(-.11 * H, torsoTop + .01 * H, -.085 * H, torsoTop - .01 * H, -.046 * H, torsoTop - .005 * H);
    ctx.quadraticCurveTo(-.02 * H, torsoTop + .045 * H, .015 * H, torsoTop + .04 * H);
    ctx.quadraticCurveTo(.055 * H, torsoTop + .035 * H, .075 * H, torsoTop - .002 * H);
    ctx.bezierCurveTo(.10 * H, torsoTop + .02 * H, .108 * H, -.19 * H, .098 * H, .05 * H);
    ctx.quadraticCurveTo(0, .075 * H, -.095 * H, .05 * H);
    ctx.closePath();
    const jg = ctx.createLinearGradient(-.1 * H, 0, .1 * H, 0);
    jg.addColorStop(0, U.darken(jc.jersey, .3));
    jg.addColorStop(.5, jc.jersey);
    jg.addColorStop(1, U.lighten(jc.jersey, .12));
    ctx.fillStyle = jg; ctx.fill();

    // jersey trim (side + neck)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-.095 * H, .05 * H);
    ctx.lineTo(-.105 * H, -.20 * H);
    ctx.bezierCurveTo(-.11 * H, torsoTop + .01 * H, -.085 * H, torsoTop - .01 * H, -.046 * H, torsoTop - .005 * H);
    ctx.quadraticCurveTo(-.02 * H, torsoTop + .045 * H, .015 * H, torsoTop + .04 * H);
    ctx.quadraticCurveTo(.055 * H, torsoTop + .035 * H, .075 * H, torsoTop - .002 * H);
    ctx.bezierCurveTo(.10 * H, torsoTop + .02 * H, .108 * H, -.19 * H, .098 * H, .05 * H);
    ctx.quadraticCurveTo(0, .075 * H, -.095 * H, .05 * H);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = jc.trim;
    ctx.globalAlpha = .9;
    ctx.fillRect(.062 * H, -.26 * H, .014 * H, .3 * H);
    ctx.globalAlpha = .55;
    ctx.fillRect(-.02 * H, torsoTop + .028 * H, .04 * H, .012 * H);
    // shading
    ctx.globalAlpha = .25;
    ctx.fillStyle = '#000';
    ctx.fillRect(-.105 * H, -.26 * H, .028 * H, .32 * H);
    ctx.restore();

    // number
    ctx.save();
    ctx.translate(.008 * H, -.115 * H);
    ctx.scale(face, 1);
    ctx.font = `700 ${.125 * H}px "Bahnschrift","Arial Narrow",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.fillText(d.num, 1.5, 1.5);
    ctx.fillStyle = jc.text;
    ctx.fillText(d.num, 0, 0);
    ctx.restore();

    // shorts
    ctx.beginPath();
    ctx.moveTo(-.098 * H, .045 * H);
    ctx.lineTo(-.112 * H, .16 * H);
    ctx.quadraticCurveTo(-.10 * H, .20 * H, -.065 * H, .2 * H);
    ctx.lineTo(-.02 * H, .19 * H);
    ctx.lineTo(0, .125 * H);
    ctx.lineTo(.02 * H, .19 * H);
    ctx.lineTo(.068 * H, .2 * H);
    ctx.quadraticCurveTo(.108 * H, .20 * H, .115 * H, .16 * H);
    ctx.lineTo(.098 * H, .045 * H);
    ctx.closePath();
    const sg = ctx.createLinearGradient(-.11 * H, 0, .11 * H, 0);
    sg.addColorStop(0, U.darken(jc.jersey, .34));
    sg.addColorStop(.55, jc.jersey);
    sg.addColorStop(1, U.lighten(jc.jersey, .08));
    ctx.fillStyle = sg; ctx.fill();
    // short trim
    ctx.strokeStyle = jc.trim;
    ctx.lineWidth = .012 * H;
    ctx.globalAlpha = .9;
    ctx.beginPath();
    ctx.moveTo(.07 * H, .055 * H);
    ctx.lineTo(.085 * H, .185 * H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-.075 * H, .058 * H);
    ctx.lineTo(-.09 * H, .185 * H);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // waistband
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(-.098 * H, .04 * H, .196 * H, .022 * H);
    ctx.restore();

    /* ---- front leg ---- */
    limb(ctx, hipF[0], hipF[1], legF.ex, legF.ey, .062 * H, .044 * H, skin, shade, light);
    // knee pad hint / leg shading
    limb(ctx, legF.ex, legF.ey, legF.hx, legF.hy, .042 * H, .028 * H, skin, shade, light);
    if (d.body.build > 1.05){
      // muscular calf highlight
      ctx.save();
      ctx.globalAlpha = .18;
      U.ellipse(ctx, (legF.ex + legF.hx) / 2 - .012 * H, (legF.ey + legF.hy) / 2, .022 * H, .05 * H);
      ctx.fillStyle = light; ctx.fill();
      ctx.restore();
    }
    shoe(ctx, legF.hx, legF.hy, Math.atan2(legF.hx - legF.ex, legF.hy - legF.ey) * .55, d, s, false);

    /* ---- head + neck ---- */
    const neckX = shX + .012 * H;
    const neckY = shY - .012 * H;
    const headCx = shX + .018 * H + Math.sin(po.headTilt) * .02 * H;
    const headCy = shY - .085 * H;
    sideHead(ctx, headCx, headCy, H, d, { tilt: po.headTilt + lean * .3, hairKick: p.moveAmt || 0 });

    /* ---- front arm ---- */
    limb(ctx, shoulderF[0], shoulderF[1], armFik.ex, armFik.ey, .042 * H, .034 * H, skin, shade, light);
    if (d.sleeve){
      limb(ctx, shoulderF[0], shoulderF[1], armFik.ex, armFik.ey, .043 * H, .035 * H, d.sleeve, U.darken(d.sleeve, .22), null);
    }
    limb(ctx, armFik.ex, armFik.ey, armFik.hx, armFik.hy, .033 * H, .026 * H, skin, shade, light);
    // shooting hand: wristband
    hand(ctx, armFik.hx, armFik.hy, .029 * H, skin, shade, d.wrist);

    ctx.restore();
  };

  /* ------------------------------------------------------------
     HEAD — front (portraits)
     ------------------------------------------------------------ */
  function skullPath(ctx, rx, ry){
    ctx.beginPath();
    ctx.moveTo(0, -ry * 1.02);
    ctx.bezierCurveTo(rx * .62, -ry * 1.02, rx * 1.0, -ry * .64, rx * 1.0, -ry * .1);
    ctx.bezierCurveTo(rx * 1.0, ry * .3, rx * .86, ry * .52, rx * .62, ry * .72);
    ctx.bezierCurveTo(rx * .42, ry * .92, rx * .2, ry * 1.0, 0, ry * 1.0);
    ctx.bezierCurveTo(-rx * .3, ry * 1.0, -rx * .66, ry * .86, -rx * .84, ry * .58);
    ctx.bezierCurveTo(-rx * 1.0, ry * .3, -rx * 1.0, -ry * .15, -rx * .99, -ry * .2);
    ctx.bezierCurveTo(-rx * .97, -ry * .8, -rx * .55, -ry * 1.02, 0, -ry * 1.02);
    ctx.closePath();
  }

  function frontHead(ctx, cx, cy, R, d, opt = {}){
    const skin = d.skin, shade = d.skinShade, light = d.skinLight;
    const rx = R, ry = R * 1.24;
    ctx.save();
    ctx.translate(cx, cy);

    // ears
    for (const s of [-1, 1]){
      ctx.beginPath();
      ctx.ellipse(s * rx * .96, ry * .12, rx * .19, ry * .27, s * .1, 0, TAU);
      ctx.fillStyle = U.darken(skin, .04); ctx.fill();
      ctx.strokeStyle = U.rgba(shade, .5); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s * rx * .97, ry * .12, rx * .1, ry * .16, s * .1, 0, TAU);
      ctx.strokeStyle = U.rgba(shade, .5); ctx.lineWidth = 1.1; ctx.stroke();
    }

    // skull
    skullPath(ctx, rx, ry);
    const hg = ctx.createRadialGradient(-rx * .3, -ry * .35, rx * .1, 0, 0, rx * 1.5);
    hg.addColorStop(0, light);
    hg.addColorStop(.45, skin);
    hg.addColorStop(1, shade);
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,16,8,.22)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // cheek / jaw shading
    ctx.save();
    ctx.globalAlpha = .22;
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(-rx * .55, ry * .35, rx * .3, ry * .45, .2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rx * .55, ry * .38, rx * .26, ry * .4, -.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    // ears inner
    // eyes
    const eyeY = -ry * .12, eyeX = rx * .4;
    for (const s of [-1, 1]){
      ctx.save();
      // sclera
      ctx.beginPath();
      ctx.ellipse(s * eyeX, eyeY, rx * .23, ry * .13, s * .04, 0, TAU);
      ctx.fillStyle = '#f6efe6'; ctx.fill();
      ctx.strokeStyle = 'rgba(40,24,12,.5)'; ctx.lineWidth = 1; ctx.stroke();
      // iris
      ctx.beginPath();
      ctx.arc(s * eyeX + s * rx * .02, eyeY + ry * .01, rx * .115, 0, TAU);
      ctx.fillStyle = d.eyes || '#2a1a10'; ctx.fill();
      ctx.beginPath();
      ctx.arc(s * eyeX + s * rx * .02, eyeY + ry * .01, rx * .055, 0, TAU);
      ctx.fillStyle = '#0a0705'; ctx.fill();
      ctx.beginPath();
      ctx.arc(s * eyeX + s * rx * .05, eyeY - ry * .025, rx * .028, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
      // upper lid
      ctx.beginPath();
      ctx.moveTo(s * eyeX - rx * .24, eyeY - ry * .03);
      ctx.quadraticCurveTo(s * eyeX, eyeY - ry * .16, s * eyeX + rx * .24, eyeY - ry * .03);
      ctx.strokeStyle = 'rgba(35,20,10,.8)'; ctx.lineWidth = 2.2; ctx.stroke();
      // brows
      ctx.beginPath();
      const by = eyeY - ry * .27;
      ctx.moveTo(s * eyeX - rx * .24, by + (s < 0 ? ry * .02 : 0));
      ctx.quadraticCurveTo(s * eyeX, by - ry * .11, s * eyeX + rx * .26, by + (s > 0 ? ry * .02 : 0));
      ctx.strokeStyle = d.brows || '#181210';
      ctx.lineWidth = rx * .11;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // nose
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.strokeStyle = shade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx * .04, eyeY + ry * .12);
    ctx.quadraticCurveTo(-rx * .06, ry * .28, -rx * .11, ry * .31);
    ctx.stroke();
    ctx.globalAlpha = .9;
    ctx.fillStyle = U.rgba(shade, .85);
    ctx.beginPath(); ctx.ellipse(-rx * .1, ry * .32, rx * .045, ry * .022, .1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rx * .1, ry * .32, rx * .045, ry * .022, -.1, 0, TAU); ctx.fill();
    // highlight nose bridge
    ctx.globalAlpha = .35;
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(rx * .01, ry * .08, rx * .055, ry * .17, .05, 0, TAU); ctx.fill();
    ctx.restore();

    // mouth
    const my = ry * .55;
    ctx.beginPath();
    ctx.moveTo(-rx * .22, my);
    ctx.quadraticCurveTo(0, my + (opt.mouth || 0) * ry * .09 - ry * .015, rx * .22, my);
    ctx.quadraticCurveTo(0, my + ry * .085, -rx * .22, my);
    ctx.fillStyle = U.darken(skin, .22); ctx.fill();
    ctx.strokeStyle = 'rgba(60,28,18,.65)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-rx * .22, my);
    ctx.quadraticCurveTo(0, my + .012 * ry, rx * .22, my);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-rx * .15, my - ry * .03);
    ctx.quadraticCurveTo(0, my - ry * .05, rx * .15, my - ry * .03);
    ctx.strokeStyle = U.rgba(light, .35); ctx.lineWidth = 1.2; ctx.stroke();

    // beard
    if (d.facial !== 'none'){
      const bc = d.beard || '#1c1410';
      ctx.save();
      if (d.facial === 'mj_mustache'){
        // Jordan's iconic trim mustache
        ctx.globalAlpha = .95;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.ellipse(0, my - ry * .05, rx * .24, ry * .035, 0, 0, TAU);
        ctx.fill();
      } else if (d.facial === 'full_beard'){
        // LeBron's sculpted king beard
        ctx.globalAlpha = .98;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.moveTo(-rx * .94, ry * .04);
        ctx.bezierCurveTo(-rx * .96, ry * .65, -rx * .72, ry * 1.05, 0, ry * 1.06);
        ctx.bezierCurveTo(rx * .72, ry * 1.05, rx * .96, ry * .65, rx * .94, ry * .04);
        ctx.bezierCurveTo(rx * .76, ry * .38, rx * .44, ry * .48, 0, ry * .48);
        ctx.bezierCurveTo(-rx * .44, ry * .48, -rx * .76, ry * .38, -rx * .94, ry * .04);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, my - ry * .04, rx * .28, ry * .055, 0, 0, TAU);
        ctx.fill();
      } else if (d.facial === 'short_beard'){
        // Giannis trim beard
        ctx.globalAlpha = .92;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.moveTo(-rx * .86, ry * .24);
        ctx.bezierCurveTo(-rx * .88, ry * .72, -rx * .58, ry * 1.02, 0, ry * 1.03);
        ctx.bezierCurveTo(rx * .58, ry * 1.02, rx * .88, ry * .72, rx * .86, ry * .24);
        ctx.bezierCurveTo(rx * .68, ry * .55, rx * .38, ry * .62, 0, ry * .62);
        ctx.bezierCurveTo(-rx * .38, ry * .62, -rx * .68, ry * .55, -rx * .86, ry * .24);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, my - ry * .03, rx * .24, ry * .04, 0, 0, TAU);
        ctx.fill();
      } else if (d.facial === 'stubble'){
        ctx.globalAlpha = .28;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.moveTo(-rx * .86, ry * .2);
        ctx.bezierCurveTo(-rx * .9, ry * .8, -rx * .5, ry * 1.0, 0, ry * 1.0);
        ctx.bezierCurveTo(rx * .5, ry * 1.0, rx * .9, ry * .8, rx * .86, ry * .2);
        ctx.bezierCurveTo(rx * .7, ry * .6, rx * .4, ry * .68, 0, ry * .68);
        ctx.bezierCurveTo(-rx * .4, ry * .68, -rx * .7, ry * .6, -rx * .86, ry * .2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = bc;
        ctx.beginPath(); ctx.ellipse(0, my + ry * .03, rx * .28, ry * .05, 0, 0, TAU); ctx.fill();
      } else if (d.facial === 'goatee'){
        ctx.globalAlpha = .94;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.ellipse(0, ry * .78, rx * .34, ry * .2, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, my + ry * .01, rx * .26, ry * .055, 0, 0, TAU);
        ctx.fill();
        // jaw line stubble
        ctx.globalAlpha = .3;
        ctx.beginPath();
        ctx.moveTo(-rx * .8, ry * .32);
        ctx.quadraticCurveTo(0, ry * .92, rx * .8, ry * .32);
        ctx.lineTo(rx * .72, ry * .24);
        ctx.quadraticCurveTo(0, ry * .78, -rx * .72, ry * .24);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.globalAlpha = .95;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.moveTo(-rx * .9, ry * .06);
        ctx.bezierCurveTo(-rx * .93, ry * .62, -rx * .7, ry * .96, 0, ry * 1.0);
        ctx.bezierCurveTo(rx * .7, ry * .96, rx * .93, ry * .62, rx * .9, ry * .06);
        ctx.bezierCurveTo(rx * .72, ry * .42, rx * .42, ry * .5, 0, ry * .5);
        ctx.bezierCurveTo(-rx * .42, ry * .5, -rx * .72, ry * .42, -rx * .9, ry * .06);
        ctx.closePath(); ctx.fill();
        // mouth hole
        ctx.globalAlpha = .92;
        ctx.fillStyle = U.darken(skin, .28);
        ctx.beginPath(); ctx.ellipse(0, my, rx * .24, ry * .055, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.ellipse(0, my - ry * .045, rx * .25, ry * .05, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // hair
    frontHair(ctx, rx, ry, d);

    // headband
    if (d.headband){
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-rx * .99, -ry * .38);
      ctx.quadraticCurveTo(0, -ry * .52, rx * .99, -ry * .38);
      ctx.lineTo(rx * .98, -ry * .22);
      ctx.quadraticCurveTo(0, -ry * .34, -rx * .98, -ry * .22);
      ctx.closePath();
      ctx.fillStyle = d.headband;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-rx * .97, -ry * .34);
      ctx.quadraticCurveTo(0, -ry * .47, rx * .97, -ry * .34);
      ctx.stroke();
      ctx.restore();
    }

    // rim light along the silhouette edge (clipped so it never washes the face)
    ctx.save();
    skullPath(ctx, rx, ry);
    ctx.clip();
    ctx.globalCompositeOperation = 'screen';
    const rl = ctx.createLinearGradient(-rx * 1.02, 0, -rx * .58, 0);
    rl.addColorStop(0, 'rgba(140,195,255,.34)');
    rl.addColorStop(.5, 'rgba(140,195,255,.1)');
    rl.addColorStop(1, 'rgba(140,195,255,0)');
    ctx.fillStyle = rl;
    ctx.fillRect(-rx * 1.1, -ry * 1.1, rx * .58, ry * 2.2);
    ctx.restore();

    // forehead shine
    ctx.save();
    ctx.globalAlpha = .13;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-rx * .3, -ry * .5, rx * .26, ry * .13, -.3, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function frontHair(ctx, rx, ry, d){
    const st = d.hair.style, col = d.hair.color, hi = d.hair.light;
    if (st === 'bald'){
      ctx.save();
      ctx.globalAlpha = .28;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-rx * .3, -ry * .82, rx * .32, ry * .12, -.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    const capPath = (line) => {
      ctx.beginPath();
      ctx.moveTo(-rx * 1.0, -ry * .22);
      ctx.bezierCurveTo(-rx * 1.0, -ry * .92, -rx * .58, -ry * 1.07, 0, -ry * 1.07);
      ctx.bezierCurveTo(rx * .6, -ry * 1.07, rx * 1.0, -ry * .9, rx * 1.0, -ry * .2);
      ctx.bezierCurveTo(rx * .8, -ry * .34, rx * .55, line, 0, line);
      ctx.bezierCurveTo(-rx * .55, line, -rx * .8, -ry * .36, -rx * 1.0, -ry * .22);
      ctx.closePath();
    };

    if (st === 'curly_fade' || st === 'curly'){
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, -ry * .76, rx * 1.08, ry * .50, 0, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 22; i++){
        const a = Math.PI + i * (Math.PI / 21);
        const rr = rx * (.88 + (i % 3) * .07);
        ctx.fillStyle = i % 2 ? hi : col;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, -ry * .52 + Math.sin(a) * ry * .38, rx * .12, 0, TAU);
        ctx.fill();
      }
      // crisp edge-up fade
      ctx.fillStyle = U.darken(col, .4);
      ctx.globalAlpha = .65;
      ctx.beginPath();
      ctx.moveTo(-rx, -ry * .2); ctx.lineTo(-rx * .82, -ry * .55); ctx.lineTo(-rx * .92, -ry * .16);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rx, -ry * .2); ctx.lineTo(rx * .82, -ry * .55); ctx.lineTo(rx * .92, -ry * .16);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    if (st === 'cornrows' || st === 'braids'){
      capPath(-ry * .36);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = hi;
      ctx.lineWidth = 2.2;
      for (let i = -4; i <= 4; i++){
        ctx.beginPath();
        ctx.moveTo(i * rx * .20, -ry * 1.04);
        ctx.quadraticCurveTo(i * rx * .24, -ry * .72, i * rx * .18, -ry * .42);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (st === 'wavy'){
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-rx * 1.02, -ry * .2);
      ctx.bezierCurveTo(-rx * 1.05, -ry * .95, -rx * .5, -ry * 1.15, 0, -ry * 1.12);
      ctx.bezierCurveTo(rx * .6, -ry * 1.12, rx * 1.05, -ry * .95, rx * 1.02, -ry * .2);
      ctx.bezierCurveTo(rx * .8, -ry * .36, rx * .45, -ry * .44, 0, -ry * .42);
      ctx.bezierCurveTo(-rx * .45, -ry * .44, -rx * .8, -ry * .36, -rx * 1.02, -ry * .2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hi;
      ctx.lineWidth = 2.0;
      for (let i = -3; i <= 3; i++){
        ctx.beginPath();
        ctx.moveTo(i * rx * .24 - rx * .1, -ry * .95);
        ctx.quadraticCurveTo(i * rx * .26, -ry * .7, i * rx * .22 + rx * .05, -ry * .45);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    capPath(-ry * .36);
    const g = ctx.createLinearGradient(0, -ry * 1.05, 0, -ry * .2);
    g.addColorStop(0, hi); g.addColorStop(.45, col); g.addColorStop(1, U.darken(col, .25));
    ctx.fillStyle = g;
    ctx.fill();

    if (st === 'buzz' || st === 'fade' || st === 'buzz_taper'){
      ctx.fillStyle = U.darken(col, .4);
      ctx.globalAlpha = .7;
      ctx.beginPath();
      ctx.moveTo(-rx, -ry * .2); ctx.lineTo(-rx * .82, -ry * .55); ctx.lineTo(-rx * .9, -ry * .18);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rx, -ry * .2); ctx.lineTo(rx * .82, -ry * .55); ctx.lineTo(rx * .9, -ry * .18);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------
     PORTRAIT (cards)
     ------------------------------------------------------------ */
  Players.drawPortrait = function(ctx, d, W, H, opt = {}){
    const bg = opt.bg !== false;
    const R = opt.R || W * .195;
    const cx = opt.cx != null ? opt.cx : W / 2;
    const cy = opt.cy != null ? opt.cy : H * .42;
    const bottom = H + 8;
    const jc = d.colors;
    ctx.clearRect(0, 0, W, H);

    if (bg){
      // card background
      const bgG = ctx.createLinearGradient(0, 0, W, H);
      bgG.addColorStop(0, U.darken(jc.primary, .62));
      bgG.addColorStop(.45, U.darken(jc.primary, .35));
      bgG.addColorStop(1, '#05070c');
      ctx.fillStyle = bgG;
      ctx.fillRect(0, 0, W, H);

      // team colour beams
      ctx.save();
      ctx.globalAlpha = .5;
      ctx.translate(cx, cy);
      ctx.rotate(-.3);
      for (let i = -2; i <= 2; i++){
        const g = ctx.createLinearGradient(i * W * .2, -H, i * W * .2, H);
        g.addColorStop(0, U.rgba(jc.secondary, .14));
        g.addColorStop(1, U.rgba(jc.secondary, 0));
        ctx.fillStyle = g;
        ctx.fillRect(i * W * .2 - W * .04, -H, W * .08, H * 2);
      }
      ctx.restore();

      // spotlight behind head
      const sp = ctx.createRadialGradient(cx, cy - R * .25, R * .1, cx, cy, R * 3.2);
      sp.addColorStop(0, U.rgba(jc.secondary, .26));
      sp.addColorStop(.5, U.rgba(jc.primary, .16));
      sp.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sp;
      ctx.fillRect(0, 0, W, H);

      // halo ring
      ctx.save();
      ctx.globalAlpha = .18;
      ctx.strokeStyle = jc.secondary;
      ctx.lineWidth = Math.max(1, W * .0035);
      ctx.beginPath(); ctx.arc(cx, cy - R * .1, R * 1.75, 0, TAU); ctx.stroke();
      ctx.globalAlpha = .09;
      ctx.beginPath(); ctx.arc(cx, cy - R * .1, R * 2.15, 0, TAU); ctx.stroke();
      ctx.restore();

      // ghost number
      ctx.save();
      ctx.globalAlpha = .1;
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${H * .55}px "Bahnschrift","Arial Narrow",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.num, W * .84, H * .36);
      ctx.restore();

      // grid / texture
      ctx.save();
      ctx.globalAlpha = .16;
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += W * .07){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      ctx.restore();
    }

    /* body / shoulders */
    const shY = cy + R * 1.42;
    const shW = R * 2.15;
    const skin = d.skin, shade = d.skinShade, light = d.skinLight;

    // neck
    const neckW = R * .56;
    ctx.beginPath();
    ctx.moveTo(cx - neckW * .5, cy + R * .78);
    ctx.bezierCurveTo(cx - neckW * .48, shY - R * .2, cx - neckW * .6, shY - R * .05, cx - neckW * .7, shY + R * .12);
    ctx.lineTo(cx + neckW * .7, shY + R * .12);
    ctx.bezierCurveTo(cx + neckW * .6, shY - R * .05, cx + neckW * .48, shY - R * .2, cx + neckW * .5, cy + R * .78);
    ctx.closePath();
    ctx.fillStyle = skin;
    ctx.fill();
    // neck shadow
    ctx.save();
    ctx.globalAlpha = .35;
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(cx, cy + R * 1.05, neckW * .56, R * .22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // jersey body
    ctx.beginPath();
    ctx.moveTo(cx - shW * .92, bottom);
    ctx.lineTo(cx - shW * .98, shY + R * .28);
    ctx.bezierCurveTo(cx - shW * .96, shY - R * .1, cx - shW * .68, shY - R * .22, cx - neckW * .8, shY - R * .08);
    ctx.quadraticCurveTo(cx, shY + R * .24, cx + neckW * .8, shY - R * .08);
    ctx.bezierCurveTo(cx + shW * .68, shY - R * .22, cx + shW * .96, shY - R * .1, cx + shW * .98, shY + R * .28);
    ctx.lineTo(cx + shW * .92, bottom);
    ctx.closePath();
    const jg = ctx.createLinearGradient(cx - shW, 0, cx + shW, 0);
    jg.addColorStop(0, U.darken(jc.jersey, .35));
    jg.addColorStop(.35, jc.jersey);
    jg.addColorStop(.62, U.lighten(jc.jersey, .06));
    jg.addColorStop(1, U.darken(jc.jersey, .4));
    ctx.fillStyle = jg;
    ctx.fill();

    // jersey shoulder shading + rim light
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - shW * .92, bottom);
    ctx.lineTo(cx - shW * .98, shY + R * .28);
    ctx.bezierCurveTo(cx - shW * .96, shY - R * .1, cx - shW * .68, shY - R * .22, cx - neckW * .8, shY - R * .08);
    ctx.quadraticCurveTo(cx, shY + R * .24, cx + neckW * .8, shY - R * .08);
    ctx.bezierCurveTo(cx + shW * .68, shY - R * .22, cx + shW * .96, shY - R * .1, cx + shW * .98, shY + R * .28);
    ctx.lineTo(cx + shW * .92, bottom);
    ctx.closePath();
    ctx.clip();
    // armhole shadows
    ctx.globalAlpha = .4;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx - shW * .84, shY + R * .35, R * .34, R * .8, .25, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + shW * .84, shY + R * .35, R * .34, R * .8, -.25, 0, TAU); ctx.fill();
    // sheen
    ctx.globalAlpha = .12;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - shW * .35, shY + R * .55, R * .5, R * 1.1, .25, 0, TAU);
    ctx.fill();
    ctx.restore();

    // neckline trim
    ctx.beginPath();
    ctx.moveTo(cx - neckW * .86, shY - R * .06);
    ctx.quadraticCurveTo(cx, shY + R * .3, cx + neckW * .86, shY - R * .06);
    ctx.strokeStyle = jc.trim;
    ctx.lineWidth = Math.max(3, R * .09);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = Math.max(1, R * .02);
    ctx.stroke();

    // armhole trim
    for (const s of [-1, 1]){
      ctx.beginPath();
      ctx.moveTo(cx + s * shW * .82, shY - R * .02);
      ctx.quadraticCurveTo(cx + s * shW * .98, shY + R * .4, cx + s * shW * .86, shY + R * .9);
      ctx.strokeStyle = jc.trim;
      ctx.lineWidth = Math.max(2.6, R * .075);
      ctx.stroke();
    }

    // chest number
    ctx.save();
    ctx.font = `700 ${R * 1.22}px "Bahnschrift","Arial Narrow",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillText(d.num, cx + 2, shY + R * 1.32 + 2);
    ctx.fillStyle = jc.text;
    ctx.fillText(d.num, cx, shY + R * 1.3);
    ctx.restore();

    // small team wordmark
    ctx.save();
    ctx.globalAlpha = .85;
    ctx.font = `700 ${R * .22}px "Bahnschrift","Arial Narrow",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = jc.trim;
    ctx.fillText(d.abbr, cx, shY + R * 1.95);
    ctx.restore();

    // head
    frontHead(ctx, cx, cy, R, d, { mouth: .25 });

    // vignette
    if (bg){
      const vg = ctx.createRadialGradient(W * .5, H * .45, W * .2, W * .5, H * .5, W * .78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      const bot = ctx.createLinearGradient(0, H * .7, 0, H);
      bot.addColorStop(0, 'rgba(3,6,11,0)');
      bot.addColorStop(1, 'rgba(3,6,11,.92)');
      ctx.fillStyle = bot;
      ctx.fillRect(0, H * .7, W, H * .3);
    }
  };

  /* ------------------------------------------------------------
     small helpers used by UI
     ------------------------------------------------------------ */
  Players.makePortrait = function(d, W = 440, H = 520, opt = {}){
    const cv = U.mkCanvas(W, H);
    const ctx = cv.getContext('2d');
    Players.drawPortrait(ctx, d, W, H, opt);
    return cv;
  };
})();
