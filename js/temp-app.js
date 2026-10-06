// temp-app.js — Module 3, mode "Température de changement d'état" (labo expérimental).
// Valeurs réelles (pression normale). Corps pur : palier. Mélange : la température dérive pendant le changement d'état.
window.TempLab = (function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg', N = 96, TMIN = -100, TMAX = 200, TR_TIME = 5;
  // tr[0] = fusion/solidification, tr[1] = vaporisation/liquéfaction : [T début, T fin] (palier si égaux), null = hors plage
  var FAM = [
    { t: 'Corps purs', l: [
      { n: 'Eau', ph: 1, tr: [[0, 0], [100, 100]], liq: '#6FC0EC', sol: '#D4F0FF' },
      { n: 'Acétone', ph: 1, tr: [[-95, -95], [56, 56]], liq: '#CFE6F2', sol: '#E6F4FB' },
      { n: 'Éthanol', ph: 1, tr: [null, [78, 78]], liq: '#D3E8F2', sol: '#E6F4FB' },
      { n: 'Cyclohexane', ph: 1, tr: [[6.5, 6.5], [81, 81]], liq: '#DCEAEE', sol: '#F4FAFB' },
      { n: 'Acide éthanoïque pur', ph: 1, tr: [[16.6, 16.6], [118, 118]], liq: '#E6F0DF', sol: '#F5FAF2' },
      { n: 'Mercure', ph: 1, tr: [[-39, -39], null], liq: '#A9B2BA', sol: '#C9D0D6', atom: 1 },
      { n: 'Gallium', ph: 0, tr: [[30, 30], null], liq: '#B4BEC6', sol: '#D2D8DD', atom: 1 },
      { n: 'Acide stéarique', ph: 0, tr: [[69, 69], null], liq: '#F2E3A8', sol: '#FBF7EC' }] },
    { t: 'Mélanges', l: [
      { n: 'Eau de mer', ph: 1, mix: .08, tr: [[-5, -2], [100.6, 103]], liq: '#4F9FCF', sol: '#CFE6F2' },
      { n: 'Eau salée (20 %)', ph: 1, mix: .2, tr: [[-19, -16], [108, 111]], liq: '#6FAFCB', sol: '#DDEEF5' },
      { n: 'Éthanol-eau (40 %)', ph: 1, mix: .35, tr: [[-35, -27], [82, 95]], liq: '#CFE6F2', sol: '#E6F4FB' },
      { n: 'Liquide de refroidissement', ph: 1, mix: .4, tr: [[-45, -37], [107, 125]], liq: '#6FD9A8', sol: '#D5F3E4' },
      { n: 'Cire de bougie (paraffine)', ph: 0, mix: .3, tr: [[50, 60], null], liq: '#F5E7B5', sol: '#F7F2E4' }] }
  ];
  var S = {}, P = [], SLOTS = [], els = {}, raf = null, lastT = 0, micro = false, ax = { x: 10, y0: 0, y1: 50 };

  (function () {                                       // bloc de 96 : pavage haut/bas, comme dans le mode précédent
    var s = 8.3, h = s * .866, px = s / 2 + .3, py = h + .4;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 12; c++) {
      var up = (r + c) % 2 === 0;
      SLOTS.push({ x: 150 + (c - 5.5) * px, y: 184 - .2 - h - r * py + (up ? 2 * h / 3 : h / 3), a: up ? 0 : 180 });
    }
  })();
  function shortest(d) { return ((d + 180) % 360 + 360) % 360 - 180; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }

  // ---------- Scène SVG ----------
  function sceneHTML() {
    var fl = '', i;
    for (i = 0; i < 10; i++) fl += '<path class="tp-fz" style="animation-delay:-' + (i * .37).toFixed(2) + 's" transform="translate(' + (124 + i * 5.8) + ' ' + (236 + (i % 3) * 5) + ')" d="M-2.2 0H2.2M0-2.2V2.2M-1.5-1.5L1.5 1.5M-1.5 1.5L1.5-1.5" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>';
    var tk = '';
    for (var T = TMIN; T <= TMAX; T += 20) {
      var y = -5 - (T - TMIN) / 300 * 145, big = T % 100 === 0;
      tk += '<path d="M4 ' + y + 'h' + (big ? 6 : 3.5) + '" stroke="#5B6B79" stroke-width=".8"/>' + (big ? '<text x="11" y="' + (y + 2) + '" font-size="6" fill="#3B4652">' + T + '</text>' : '');
    }
    return '<svg viewBox="0 0 300 300" class="st-svg" id="tp-svg" role="img" aria-label="Bécher sur une plaque chauffante et refroidissante">' +
      '<defs><clipPath id="tp-clip"><rect x="92" y="38" width="116" height="146"/></clipPath>' +
      '<radialGradient id="tp-gg"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="tp-fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF9F1C"/><stop offset="1" stop-color="#FFE066"/></linearGradient>' +
      '<filter id="tp-blur"><feGaussianBlur stdDeviation="2.5"/></filter></defs>' +
      '<path d="M126 262h48l8 18h-64z" fill="#6B7886"/><rect x="142" y="250" width="16" height="14" fill="#8996A3"/>' +
      '<rect id="tp-head" x="122" y="240" width="56" height="11" rx="5" fill="#59656F" stroke="none" stroke-width="2"/>' +
      '<g id="tp-frost" style="opacity:0">' + fl + '</g>' +
      '<path d="M100 190h100M106 190l-6 52M194 190l6 52" stroke="#7A8794" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<g id="tp-flame" style="opacity:0"><g id="tp-flg">' +
      '<path class="st-f f1" d="M132 240c-8-8-7-18 0-30 7 12 8 22 0 30z" fill="url(#tp-fg)"/><path class="st-f f2" d="M150 240c-10-10-9-24 0-42 9 18 10 32 0 42z" fill="url(#tp-fg)"/>' +
      '<path class="st-f f3" d="M168 240c-8-8-7-18 0-30 7 12 8 22 0 30z" fill="url(#tp-fg)"/><path class="st-f f4" d="M141 240c-4-5-3-10 0-17 3 7 4 12 0 17z" fill="#FFF3B0"/><path class="st-f f5" d="M159 240c-4-5-3-10 0-17 3 7 4 12 0 17z" fill="#FFF3B0"/></g></g>' +
      '<path d="M178 272H226" stroke="#59656F" stroke-width="4" stroke-linecap="round"/>' +
      '<g id="tp-knob" transform="translate(252 258)" style="cursor:grab;touch-action:none"><circle r="28" fill="#F4F5F7" stroke="#98A4B0" stroke-width="3"/>' +
      '<path d="M0-20A20 20 0 0 1 0 20" fill="none" stroke="#E4574C" stroke-width="7"/><path d="M0-20A20 20 0 0 0 0 20" fill="none" stroke="#3F78D8" stroke-width="7"/>' +
      '<g id="tp-needle"><path d="M-3.5 3h7L0-23z" fill="#2E3A46"/></g><circle r="5" fill="#2E3A46"/></g>' +
      '<rect x="92" y="38" width="116" height="146" fill="rgba(215,235,247,.35)"/>' +
      '<g clip-path="url(#tp-clip)"><g id="tp-water" class="tp-macro"><path d="M92 139q14-8 29 0t29 0 29 0 29 0V184H92z" id="tp-wp" opacity=".9"/><path d="M92 139q14-8 29 0t29 0 29 0 29 0" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/></g>' +
      '<g id="tp-gas" class="tp-macro" filter="url(#tp-blur)">' + [[125,150,22,1],[170,130,26,2],[140,95,22,3],[180,168,18,4],[115,68,16,5],[165,70,20,6]].map(function (c) { return '<circle class="st-g g' + c[3] + '" cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="url(#tp-gg)"/>'; }).join('') + '</g></g>' +
      '<g id="tp-ice" class="tp-macro"><rect id="tp-icer" x="121" y="122" width="58" height="62" rx="9" stroke="#8CC7E6" stroke-width="2.5"/><path d="M130 133h14M130 133v16" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/></g>' +
      '<g id="tp-micro"></g>' +
      '<g transform="translate(140 182) rotate(-15)"><rect x="-4" y="-158" width="8" height="152" rx="4" fill="rgba(255,255,255,.88)" stroke="#7F9DB3" stroke-width="1.2"/><circle cy="-3" r="7" fill="#E0463B" stroke="#7F9DB3" stroke-width="1.2"/>' +
      '<rect id="tp-fl" x="-1.8" width="3.6" fill="#E0463B"/>' + tk + '</g>' +
      '<path d="M86 38h10M204 38h10M92 38V176q0 8 8 8h100q8 0 8-8V38" fill="none" stroke="#7F9DB3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M188 80h16M194 105h10M188 130h16M194 155h10" stroke="#7F9DB3" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>';
  }

  // ---------- Expérience ----------
  function reset() {
    S = { sub: null, T: 20, ph: 1, inTr: -1, p: 0, entry: 0, idx: 0, k: 0, appr: null, t: 0, pts: [{ t: 0, T: 20 }], labs: [], ap: 1, minT: 20, maxT: 20 };
    setKnob(0);
    ax = { x: 10, y0: 0, y1: 50 };
    if (els.svg) { $('tp-water').style.display = $('tp-gas').style.display = $('tp-ice').style.display = $('tp-micro').style.display = 'none'; }
    els.read.textContent = 'Aucune substance dans le bécher';
    els.legend.firstChild && (els.legendTxt.textContent = '');
  }

  function select(sub) {
    reset();
    S.sub = sub; S.ph = sub.ph; S.ap = 0;
    $('tp-icer').setAttribute('fill', sub.sol); $('tp-wp').setAttribute('fill', sub.liq);
    $('tp-micro').style.display = '';
    var nb = Math.round((sub.mix || 0) * N), ids = P.map(function (p, i) { return i; }).sort(function () { return Math.random() - .5; });
    P.forEach(function (p) { p.b = 0; });
    for (var i = 0; i < nb; i++) P[ids[i]].b = 1;
    P.forEach(function (p) {
      p.tri.style.display = p.b ? 'none' : ''; p.cir.style.display = p.b ? '' : 'none';
      p.x = 120 + Math.random() * 60; p.y = -10 - Math.random() * 130; p.vx = p.vy = 0; p.a = Math.random() * 360; p.m = -1;
    });
    els.legendTxt.textContent = sub.mix ? 'Triangles et ronds : deux sortes d\'entités' : (sub.atom ? 'Un triangle : un atome' : 'Un triangle : une molécule');
  }

  function fracs() {
    if (S.inTr >= 0) return S.inTr === 0 ? [1 - S.p, S.p, 0] : [0, 1 - S.p, S.p];
    return S.ph === 0 ? [1, 0, 0] : (S.ph === 1 ? [0, 1, 0] : [0, 0, 1]);
  }

  function finish(i, up) {
    var tr = S.sub.tr[i];
    if (up !== !!S.entry) {                            // transition réellement menée à son terme : on note son nom
      S.labs.push({ name: up ? (i ? 'Vaporisation' : 'Fusion') : (i ? 'Liquéfaction' : 'Solidification'), c: up ? '#D9382B' : '#2F6FD0', i0: S.idx, i1: S.pts.length });
    }
    S.ph = up ? i + 1 : i; S.T = up ? tr[1] : tr[0]; S.inTr = -1; S.appr = null;
  }

  function step(dt) {
    var k = S.k, sub = S.sub;
    if (!sub || Math.abs(k) < .001) return;
    S.t += dt;
    var heat = k > 0, a = Math.abs(k);
    if (S.inTr >= 0) {
      var tr = sub.tr[S.inTr];
      S.p += k * dt / TR_TIME;
      if (S.p >= 1) finish(S.inTr, true);
      else if (S.p <= 0) finish(S.inTr, false);
      else S.T = tr[0] + S.p * (tr[1] - tr[0]);
    } else {
      var B = heat ? (sub.tr[S.ph] ? sub.tr[S.ph][0] : TMAX) : (S.ph > 0 && sub.tr[S.ph - 1] ? sub.tr[S.ph - 1][1] : TMIN);
      var ap = S.appr;
      if (!ap || ap.B !== B || ap.dir !== (heat ? 1 : -1)) ap = S.appr = { T0: S.T, B: B, s: 0, dir: heat ? 1 : -1, D: 3.2 + Math.abs(B - S.T) / 100 };
      var reached = Math.abs(B - ap.T0) < .05;
      if (!reached) {                                  // approche amortie : vitesse maximale au départ, nulle à l'arrivée
        ap.s = Math.min(1, ap.s + a * dt / ap.D);
        S.T = ap.T0 + (B - ap.T0) * (1 - Math.pow(1 - ap.s, 2));
        reached = ap.s >= 1;
      }
      if (reached) {
        S.T = B;
        if (heat && sub.tr[S.ph]) { S.inTr = S.ph; S.p = 0; S.entry = 0; S.idx = S.pts.length - 1; }
        else if (!heat && S.ph > 0 && sub.tr[S.ph - 1]) { S.inTr = S.ph - 1; S.p = 1; S.entry = 1; S.idx = S.pts.length - 1; }
      }
    }
    S.T = clamp(S.T, TMIN, TMAX);
    S.minT = Math.min(S.minT, S.T); S.maxT = Math.max(S.maxT, S.T);
    S.pts.push({ t: S.t, T: S.T });
  }

  // ---------- Molette ----------
  function setKnob(k) {
    S.k = k;
    if (els.needle) els.needle.setAttribute('transform', 'rotate(' + (k * 75) + ')');
  }
  function knobDrag(e) {
    var r = $('tp-knob').getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
    if (Math.abs(ang) > 100) ang = ang > 0 ? 75 : -75;
    ang = clamp(ang, -75, 75);
    setKnob(Math.abs(ang) < 7 ? 0 : Math.round(ang / 75 * 100) / 100);
  }

  // ---------- Rendu macro / micro ----------
  function renderMacro() {
    var f = fracs(), ap = S.ap, sub = S.sub, fs = f[0], fl = f[1], fg = f[2], drop = -(1 - ap) * 170;
    $('tp-ice').style.display = fs > .01 ? '' : 'none';
    $('tp-ice').setAttribute('transform', 'translate(0 ' + drop + ') translate(0 184) scale(1 ' + fs + ') translate(0 -184)');
    $('tp-water').style.display = fl > .01 ? '' : 'none';
    $('tp-water').style.opacity = ap;
    $('tp-water').setAttribute('transform', 'translate(0 ' + (-62 * fs) + ') translate(0 184) scale(1 ' + fl + ') translate(0 -184)');
    $('tp-gas').style.display = fg > .01 ? '' : 'none';
    $('tp-gas').style.opacity = fg * ap;
    return f;
  }

  function stepMicro(dt, f) {
    var fs = f[0], fl = f[1], ag = .6 + .9 * (S.T - TMIN) / 300;
    var y1 = 179 - 62 * fs, y0 = y1 - Math.max(10, 36 * fl), i, j, p, q;
    P.forEach(function (p) {
      var m = p.rank < fs ? 0 : (p.rank < fs + fl ? 1 : 2);
      if (m !== p.m) { p.m = m; p.va = (Math.random() < .5 ? -1 : 1) * (m === 2 ? 120 + Math.random() * 200 : 20 + Math.random() * 40); if (m === 2) { var an = Math.random() * 6.28; p.vx = Math.cos(an) * 70; p.vy = Math.sin(an) * 70; } }
      if (m === 0) {
        var s = SLOTS[p.slot], fz = Math.exp(-10 * dt);
        p.vx = (p.vx + (s.x - p.x) * 30 * dt) * fz; p.vy = (p.vy + (s.y - p.y) * 30 * dt) * fz;
        p.a += shortest(s.a - p.a) * Math.min(1, 7 * dt); p.x += p.vx * dt; p.y += p.vy * dt; p.R = null; return;
      }
      var R = p.R = m === 1 ? { y0: y0, y1: y1 } : { y0: 44, y1: 179 }, v0 = (m === 2 ? 70 : 14) * ag, A = m === 2 ? 500 : 100;
      p.vx += (Math.random() - .5) * A * dt; p.vy += (Math.random() - .5) * A * dt;
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > v0 * 1.5) { var d = Math.exp(-4 * dt); p.vx *= d; p.vy *= d; } else if (sp < v0 * .5) { p.vx += (Math.random() - .5) * v0 * 6 * dt; p.vy += (Math.random() - .5) * v0 * 6 * dt; }
      var out = false;
      if (p.x < 97) { p.vx += (97 - p.x) * 150 * dt; out = true; } else if (p.x > 203) { p.vx += (203 - p.x) * 150 * dt; out = true; }
      if (p.y < R.y0) { p.vy += (R.y0 - p.y) * 150 * dt; out = true; } else if (p.y > R.y1) { p.vy += (R.y1 - p.y) * 150 * dt; out = true; }
      if (out) { var o = Math.exp(-24 * dt); p.vx *= o; p.vy *= o; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * ag * dt;
    });
    var L = P.filter(function (p) { return p.m === 1; });
    for (var it = 0; it < 2; it++) for (i = 0; i < L.length; i++) for (j = i + 1; j < L.length; j++) {
      p = L[i]; q = L[j];
      var dx = q.x - p.x, dy = q.y - p.y, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < 8.2 && dd > .01) { var mm = (8.2 - dd) * .3 / dd; p.x -= dx * mm; p.y -= dy * mm; q.x += dx * mm; q.y += dy * mm; }
    }
    P.forEach(function (p) {
      if (p.R) { p.x = clamp(p.x, 97, 203); if (p.y > p.R.y1) p.y = p.R.y1; }
      var e = p.b ? p.cir : p.tri;
      e.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + p.a.toFixed(0) + ')');
    });
  }

  function renderLab(dt) {
    var f = S.sub ? renderMacro() : null, T = S.T;
    var fr = clamp((T - TMIN) / 300, 0, 1) * 145;
    $('tp-fl').setAttribute('y', -5 - fr); $('tp-fl').setAttribute('height', fr + 3);
    var heat = Math.max(0, S.k), cool = Math.max(0, -S.k), on = !!S.sub;
    $('tp-flame').style.opacity = on ? Math.min(1, heat * 2.2) : 0;
    $('tp-flg').setAttribute('transform', 'translate(0 240) scale(1 ' + (.45 + .55 * heat) + ') translate(0 -240)');
    $('tp-frost').style.opacity = Math.min(1, cool * 2);
    var hd = $('tp-head'); hd.setAttribute('fill', cool > 0 ? '#CDEFFF' : (heat > 0 ? '#D9602B' : '#59656F')); hd.setAttribute('stroke', cool > 0 ? '#8CC7E6' : 'none');
    if (S.sub) {
      S.ap = Math.min(1, S.ap + dt);
      stepMicro(dt, f);
      els.read.textContent = S.sub.n + ' : ' + fmt(T) + ' °C';
    }
  }

  // ---------- Graphique ----------
  function niceX(v) { var a = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 420, 600]; for (var i = 0; i < a.length; i++) if (a[i] >= v) return a[i]; return Math.ceil(v / 300) * 300; }
  function stepOf(range, list) { for (var i = 0; i < list.length; i++) if (range / list[i] <= 7) return list[i]; return list[list.length - 1]; }

  function drawGraph(dt) {
    var cv = els.cv, W = cv.clientWidth, H = cv.clientHeight, dpr = window.devicePixelRatio || 1;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var tx = niceX(Math.max(S.t * 1.1, 1)), ty1 = Math.min(250, Math.max(50, Math.ceil((S.maxT + 1) / 50) * 50)), ty0 = Math.min(0, Math.floor((S.minT - 10) / 25) * 25), k = Math.min(1, dt * 4);
    ax.x += (tx - ax.x) * k; ax.y1 += (ty1 - ax.y1) * k; ax.y0 += (ty0 - ax.y0) * k;
    var ml = 44, mr = 12, mt = 14, mb = 28, pw = W - ml - mr, ph = H - mt - mb;
    var X = function (t) { return ml + t / ax.x * pw; }, Y = function (v) { return mt + (1 - (v - ax.y0) / (ax.y1 - ax.y0)) * ph; };
    c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(ml, mt, pw, ph);
    c.font = '600 11px Nunito, sans-serif'; c.fillStyle = '#3B4652'; c.strokeStyle = 'rgba(40,60,90,.2)'; c.lineWidth = 1;
    var sy = stepOf(ax.y1 - ax.y0, [5, 10, 20, 25, 50, 100]), sx = stepOf(ax.x, [2, 5, 10, 15, 20, 30, 60, 120]), v, t;
    c.textAlign = 'right';
    for (v = Math.ceil(ax.y0 / sy) * sy; v <= ax.y1 + .01; v += sy) { c.beginPath(); c.moveTo(ml, Y(v)); c.lineTo(ml + pw, Y(v)); c.stroke(); c.fillText(v, ml - 5, Y(v) + 4); }
    c.textAlign = 'center';
    for (t = 0; t <= ax.x + .01; t += sx) { c.beginPath(); c.moveTo(X(t), mt); c.lineTo(X(t), mt + ph); c.stroke(); c.fillText(t, X(t), mt + ph + 14); }
    c.strokeStyle = '#3B4652'; c.lineWidth = 1.5; c.strokeRect(ml, mt, pw, ph);
    c.textAlign = 'left'; c.fillText('T (°C)', 4, 11); c.textAlign = 'right'; c.fillText('Temps (s)', W - 4, H - 3);
    c.save(); c.beginPath(); c.rect(ml, mt, pw, ph); c.clip();
    c.strokeStyle = '#1F2E48'; c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath();
    S.pts.forEach(function (p, i) { if (i) c.lineTo(X(p.t), Y(p.T)); else c.moveTo(X(p.t), Y(p.T)); });
    c.stroke();
    var l = S.pts[S.pts.length - 1]; c.fillStyle = '#1F2E48'; c.beginPath(); c.arc(X(l.t), Y(l.T), 4, 0, 6.29); c.fill();
    S.labs.forEach(function (lb) {
      var a = S.pts[lb.i0], b = S.pts[Math.min(lb.i1, S.pts.length - 1)];
      var ang = Math.atan2(Y(b.T) - Y(a.T), X(b.t) - X(a.t));
      c.save(); c.translate((X(a.t) + X(b.t)) / 2, (Y(a.T) + Y(b.T)) / 2); c.rotate(ang);
      c.font = '700 15px Fredoka, sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(lb.name, 0, -9); c.fillStyle = lb.c; c.fillText(lb.name, 0, -9); c.restore();
    });
    c.restore();
  }

  function frame(t) {
    var dt = Math.min(.05, (t - lastT) / 1000 || .016); lastT = t;
    step(dt); renderLab(dt); drawGraph(dt);
    raf = requestAnimationFrame(frame);
  }

  function setMicro(on) {
    micro = on; els.svg.classList.toggle('is-micro', on);
    $('tp-ico-lens').style.display = on ? 'none' : ''; $('tp-ico-eye').style.display = on ? '' : 'none';
    els.legend.style.display = on ? '' : 'none';
    els.microBtn.textContent = on ? 'Mode Macroscopique' : 'Mode Microscopique';
  }

  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function start() {
    stop(); reset(); setMicro(false);
    ['tp-pick', 'tp-memo'].forEach(function (id) { $(id).style.display = 'none'; });
    lastT = performance.now(); raf = requestAnimationFrame(frame);
  }

  function init() {
    els.stage = $('tp-stage'); if (!els.stage) return;
    els.stage.innerHTML = sceneHTML();
    els.svg = $('tp-svg'); els.needle = $('tp-needle'); els.read = $('tp-read'); els.cv = $('tp-graph');
    els.legend = $('tp-legend'); els.legendTxt = $('tp-legend-txt'); els.microBtn = $('btn-tp-micro');
    var layer = $('tp-micro'), order = SLOTS.map(function (s, i) { return i; });
    var byY = order.slice().sort(function (a, b) { return SLOTS[b].y - SLOTS[a].y; }), rk = {};
    byY.forEach(function (s, i) { rk[s] = i / N; });
    order.sort(function () { return Math.random() - .5; });
    order.forEach(function (slot) {
      var tri = document.createElementNS(NS, 'polygon'), cir = document.createElementNS(NS, 'circle');
      tri.setAttribute('points', '0,-4.79 -4.15,2.4 4.15,2.4'); tri.setAttribute('class', 'st-tri');
      cir.setAttribute('r', '3.9'); cir.setAttribute('class', 'tp-b');
      layer.appendChild(tri); layer.appendChild(cir);
      P.push({ tri: tri, cir: cir, slot: slot, rank: rk[slot], b: 0, m: -1, x: 150, y: -30, vx: 0, vy: 0, a: 0, va: 0 });
    });
    var kn = $('tp-knob');
    kn.addEventListener('pointerdown', function (e) { if (!S.sub) return; kn.setPointerCapture(e.pointerId); kn.style.cursor = 'grabbing'; knobDrag(e); });
    kn.addEventListener('pointermove', function (e) { if (kn.hasPointerCapture && kn.hasPointerCapture(e.pointerId)) knobDrag(e); });
    kn.addEventListener('pointerup', function () { kn.style.cursor = 'grab'; });
    // Fenêtre de choix des substances
    var html = '';
    FAM.forEach(function (f, fi) {
      html += '<h3 class="st-memo__h">' + f.t + '</h3><div class="tp-list">';
      f.l.forEach(function (s, si) { html += '<button type="button" class="tp-item" data-f="' + fi + '" data-s="' + si + '">' + s.n + '</button>'; });
      html += '</div>';
    });
    $('tp-pick-list').innerHTML = html;
    Array.prototype.forEach.call($('tp-pick-list').querySelectorAll('.tp-item'), function (b) {
      b.addEventListener('click', function () { select(FAM[+b.getAttribute('data-f')].l[+b.getAttribute('data-s')]); $('tp-pick').style.display = 'none'; });
    });
    function bindOverlay(id, openBtn, closeBtn) {
      var o = $(id); $(openBtn).addEventListener('click', function () { o.style.display = 'flex'; });
      $(closeBtn).addEventListener('click', function () { o.style.display = 'none'; });
      o.addEventListener('click', function (e) { if (e.target === o) o.style.display = 'none'; });
    }
    bindOverlay('tp-pick', 'btn-tp-choose', 'btn-tp-pick-close'); bindOverlay('tp-memo', 'btn-tp-retenir', 'btn-tp-memo-close');
    $('btn-tp-reset').addEventListener('click', function () { reset(); });
    els.microBtn.addEventListener('click', function () { setMicro(!micro); });
    reset();
  }

  document.addEventListener('DOMContentLoaded', init);
  return { start: start, stop: stop };
})();
