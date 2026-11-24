/* ============================================================
   AIRBALL — utils: math, colour, canvas helpers
   ============================================================ */
(function(){
  const AB = window.AB = window.AB || {};
  const U = AB.U = {};

  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (v - a) / (b - a || 1);
  U.sat = v => v < 0 ? 0 : v > 1 ? 1 : v;
  U.smoothstep = t => { t = U.sat(t); return t * t * (3 - 2 * t); };
  U.smootherstep = t => { t = U.sat(t); return t * t * t * (t * (t * 6 - 15) + 10); };
  U.damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  U.rand = (a = 1, b = 0) => b + Math.random() * (a - b);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.chance = p => Math.random() < p;
  U.sign = v => v < 0 ? -1 : 1;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.wrap = (v, n) => ((v % n) + n) % n;
  U.deg = d => d * Math.PI / 180;
  U.easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  U.easeInCubic = t => t * t * t;
  U.easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  U.easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  U.easeOutBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  U.easeOutElastic = t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - .75) * (U.TAU / 3)) + 1;
  U.approach = (cur, target, step) => {
    if (cur < target) return Math.min(cur + step, target);
    return Math.max(cur - step, target);
  };

  U.formatClock = s => {
    s = Math.max(0, s);
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    if (s < 10 && s > 0) return '0:0' + s.toFixed(1).replace('.', ':').slice(0, 3);
    return m + ':' + String(ss).padStart(2, '0');
  };
  U.formatClockShort = s => {
    const m = Math.floor(Math.max(0, s) / 60);
    const ss = Math.ceil(Math.max(0, s) % 60);
    return m > 0 ? m + ':' + String(Math.min(59, ss)).padStart(2, '0') : '0:' + String(Math.max(0, ss)).padStart(2, '0');
  };

  /* ---------------- seeded rng ---------------- */
  U.rng = function(seed){
    let a = seed >>> 0;
    return function(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------------- colour ---------------- */
  U.hex2rgb = function(hex){
    if (Array.isArray(hex)) return hex;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgba = function(hex, a){
    const c = U.hex2rgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };
  U.mix = function(a, b, t){
    const A = U.hex2rgb(a), B = U.hex2rgb(b);
    return `rgb(${Math.round(U.lerp(A[0],B[0],t))},${Math.round(U.lerp(A[1],B[1],t))},${Math.round(U.lerp(A[2],B[2],t))})`;
  };
  U.mixA = function(a, b, t){
    const A = U.hex2rgb(a), B = U.hex2rgb(b);
    return [Math.round(U.lerp(A[0],B[0],t)), Math.round(U.lerp(A[1],B[1],t)), Math.round(U.lerp(A[2],B[2],t))];
  };
  U.shade = function(hex, amt){ // amt -1..1
    const c = U.hex2rgb(hex);
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    return `rgb(${Math.round(U.lerp(c[0],t,p))},${Math.round(U.lerp(c[1],t,p))},${Math.round(U.lerp(c[2],t,p))})`;
  };
  U.lighten = (hex, p) => U.shade(hex, p);
  U.darken = (hex, p) => U.shade(hex, -p);
  U.lum = function(hex){
    const c = U.hex2rgb(hex);
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  };
  U.rgbStr = c => `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;

  /* ---------------- canvas ---------------- */
  U.mkCanvas = function(w, h){
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  U.roundRect = function(ctx, x, y, w, h, r){
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    return ctx;
  };

  U.capsule = function(ctx, x1, y1, x2, y2, r1, r2){
    const dx = x2 - x1, dy = y2 - y1;
    const d = Math.hypot(dx, dy) || 0.001;
    const ang = Math.atan2(dy, dx);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    ctx.beginPath();
    ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
    ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
    ctx.arc(x2, y2, r2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
    ctx.arc(x1, y1, r1, ang - Math.PI / 2, ang + Math.PI / 2, true);
    ctx.closePath();
  };

  U.ellipse = function(ctx, x, y, rx, ry){
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, U.TAU);
  };

  U.poly = function(ctx, pts, close = true){
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
  };

  U.linGrad = function(ctx, x0, y0, x1, y1, stops){
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) g.addColorStop(s[0], s[1]);
    return g;
  };
  U.radGrad = function(ctx, x0, y0, r0, x1, y1, r1, stops){
    const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    for (const s of stops) g.addColorStop(s[0], s[1]);
    return g;
  };

  U.glow = function(ctx, x, y, r, color, alpha = 1){
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, U.rgba(color, 0.55 * alpha));
    g.addColorStop(0.4, U.rgba(color, 0.2 * alpha));
    g.addColorStop(1, U.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  U.text = function(ctx, str, x, y, opt = {}){
    ctx.save();
    const size = opt.size || 16;
    const weight = opt.weight || 600;
    const fam = opt.font || '"Bahnschrift","Arial Narrow",sans-serif';
    ctx.font = `${opt.style || ''} ${weight} ${size}px ${fam}`.trim();
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = opt.baseline || 'middle';
    if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    if (opt.shadow) { ctx.shadowColor = opt.shadow; ctx.shadowBlur = opt.blur || 12; ctx.shadowOffsetY = opt.shadowY || 0; }
    if (opt.spacing != null && 'letterSpacing' in ctx) ctx.letterSpacing = opt.spacing + 'px';
    ctx.fillStyle = opt.color || '#fff';
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  U.measureSpaced = function(ctx, str, spacing){
    let w = 0;
    for (const ch of str) w += ctx.measureText(ch).width + spacing;
    return w - spacing;
  };

  U.drawSpaced = function(ctx, str, x, y, spacing, opt = {}){
    const align = opt.align || 'center';
    ctx.save();
    ctx.font = `${opt.weight || 600} ${opt.size || 16}px ${opt.font || '"Bahnschrift","Arial Narrow",sans-serif'}`;
    ctx.textBaseline = opt.baseline || 'middle';
    ctx.fillStyle = opt.color || '#fff';
    if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    if (opt.shadow) { ctx.shadowColor = opt.shadow; ctx.shadowBlur = opt.blur || 10; }
    const total = U.measureSpaced(ctx, str, spacing);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    for (const ch of str) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + spacing;
    }
    ctx.restore();
  };

  U.star = function(ctx, x, y, r1, r2, points, rot = 0){
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? r2 : r1;
      const a = rot + i * Math.PI / points - Math.PI / 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  };

  U.lerpAngle = function(a, b, t){
    let d = ((b - a + Math.PI) % U.TAU) - Math.PI;
    if (d < -Math.PI) d += U.TAU;
    return a + d * t;
  };

  U.shuffle = function(arr){
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
})();
