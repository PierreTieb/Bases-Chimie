// piston-app.js — Module 3, mode « Propriétés de la matière » (labo à piston).
// Cylindre fermé + piston vertical. Solide / liquide / gaz, sans nom de substance.
// - Chauffer / refroidir : curseur vertical (vitesse proportionnelle à l'écart, retour au centre au relâchement,
//   la température reste). Le thermomètre n'est pas gradué : une seule variable normalisée « tau » (0..1).
// - Piston : seul le gaz se comprime / s'étend. Relâché, il revient (mouvement amorti rapide) à la position
//   d'équilibre de la température atteinte. Un repère fixe marque le niveau initial.
// - Pas de changement d'état, sauf la liquéfaction du gaz (comprimé ou refroidi) : il devient alors liquide.
window.PistonLab = (function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var N = 96, B = 184, FLOOR = 179, XL = 97, XR = 203;
  var T0 = .3, RATE = .14, DEAD = .12, AMB_RATE = .45;
  var H = { solid: 60.5, liquid: 45, gas: 88, none: 88 };       // hauteur (unités du schéma) à température ambiante
  var HMIN = 28, HMAX = 140, SW = 15, SZ = .75;                  // course du gaz ; ressort amorti du piston
  var MSG_START = 'Choisis solide, liquide ou gaz pour remplir le cylindre.';

  var els = {}, P = [], SLOTS = [], S = {}, raf = null, lastT = 0, micro = false, built = false;

  (function () {                                                 // réseau du solide : 12 x 8, triangles haut / bas
    var s = 8.3, h = s * .866, px = s / 2 + .3, py = h + .4;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 12; c++) {
      var up = (r + c) % 2 === 0;
      SLOTS.push({ x: 150 + (c - 5.5) * px, y: B - .2 - h - r * py + (up ? 2 * h / 3 : h / 3), a: up ? 0 : 180 });
    }
  })();
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function shortest(d) { return ((d + 180) % 360 + 360) % 360 - 180; }

  // ---------- Physique simplifiée (unités arbitraires) ----------
  function agit() { return .15 + 1.85 * Math.pow(S.tau, 1.3); }   // 0,15 (froid) ; ~0,5 (ambiante) ; 2 (chaud)
  function heq() {                                               // hauteur d'équilibre à la température atteinte
    var d = S.tau - T0;
    if (S.sub === 'solid') return H.solid * (1 + .011 * d);      // dilatation imperceptible
    if (S.sub === 'liquid') return H.liquid * (1 + .12 * d);     // très légère, mais perceptible
    if (S.sub === 'gas') return H.gas * clamp(1 + 1.403 * d - .881 * d * d, .45, 1.6);   // très visible
    return H.none;
  }
  function hc() { return 55 - 22 * clamp((S.tau - .07) / .93, 0, 1); }   // hauteur sous laquelle le gaz se liquéfie

  // ---------- Scène SVG ----------
  function sceneHTML() {
    var fl = '', i;
    for (i = 0; i < 10; i++) fl += '<path class="tp-fz" style="animation-delay:-' + (i * .37).toFixed(2) + 's" transform="translate(' + (124 + i * 5.8) + ' ' + (236 + (i % 3) * 5) + ')" d="M-2.2 0H2.2M0-2.2V2.2M-1.5-1.5L1.5 1.5M-1.5 1.5L1.5-1.5" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>';
    var blobs = [[120, 60, 22, 1], [178, 78, 24, 2], [132, 110, 22, 3], [182, 134, 20, 4], [116, 160, 22, 5], [166, 168, 20, 6], [150, 40, 20, 3]]
      .map(function (c) { return '<circle class="st-g g' + c[3] + '" cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="url(#pi-gg)"/>'; }).join('');
    return '<svg viewBox="0 0 300 300" class="st-svg" id="pi-svg" role="img" aria-label="Cylindre fermé avec un piston, sur une plaque chauffante et refroidissante">' +
      '<defs><clipPath id="pi-clip"><rect x="94" y="34" width="112" height="150"/></clipPath>' +
      '<clipPath id="pi-gclip"><rect id="pi-gcr" x="94" y="60" width="112" height="124"/></clipPath>' +
      '<radialGradient id="pi-gg"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="pi-fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF9F1C"/><stop offset="1" stop-color="#FFE066"/></linearGradient>' +
      '<filter id="pi-blur"><feGaussianBlur stdDeviation="2.5"/></filter></defs>' +
      '<path d="M126 262h48l8 18h-64z" fill="#6B7886"/><rect x="142" y="250" width="16" height="14" fill="#8996A3"/>' +
      '<rect id="pi-head" x="122" y="240" width="56" height="11" rx="5" fill="#59656F" stroke="none" stroke-width="2"/>' +
      '<g id="pi-frost" style="opacity:0">' + fl + '</g>' +
      '<path d="M100 190h100M106 190l-6 52M194 190l6 52" stroke="#7A8794" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<g id="pi-flame" style="opacity:0"><g id="pi-flg">' +
      '<path class="st-f f1" d="M132 240c-8-8-7-18 0-30 7 12 8 22 0 30z" fill="url(#pi-fg)"/><path class="st-f f2" d="M150 240c-10-10-9-24 0-42 9 18 10 32 0 42z" fill="url(#pi-fg)"/>' +
      '<path class="st-f f3" d="M168 240c-8-8-7-18 0-30 7 12 8 22 0 30z" fill="url(#pi-fg)"/><path class="st-f f4" d="M141 240c-4-5-3-10 0-17 3 7 4 12 0 17z" fill="#FFF3B0"/><path class="st-f f5" d="M159 240c-4-5-3-10 0-17 3 7 4 12 0 17z" fill="#FFF3B0"/></g></g>' +
      '<rect x="94" y="34" width="112" height="150" fill="rgba(215,235,247,.35)"/>' +
      '<g id="pi-mac" class="pi-macro" clip-path="url(#pi-clip)">' +
      '<rect id="pi-solid" x="121" y="124" width="58" height="60" rx="8" fill="#D4F0FF" stroke="#8CC7E6" stroke-width="2.5"/>' +
      '<rect id="pi-liq" x="94" y="139" width="112" height="45" fill="#6FC0EC" opacity=".9"/>' +
      '<g id="pi-gas" clip-path="url(#pi-gclip)"><rect id="pi-fog" x="94" y="34" width="112" height="150" fill="#9FB4C4" opacity=".2"/>' +
      '<g filter="url(#pi-blur)">' + blobs + '</g></g></g>' +
      '<g id="pi-micro"></g>' +
      '<g id="pi-piston"><rect x="94" y="-6" width="112" height="6" rx="2" fill="#6B7886" stroke="#4A5663" stroke-width="1.2"/>' +
      '<rect x="147" y="-36" width="6" height="30" fill="#8996A3"/>' +
      '<g id="pi-handle"><rect x="128" y="-45" width="44" height="10" rx="5" fill="#E0463B" stroke="#8A2A20" stroke-width="1.5"/></g>' +
      '<rect id="pi-hit" x="112" y="-58" width="76" height="62" fill="transparent"/></g>' +
      '<path d="M92 34V176q0 8 8 8h100q8 0 8-8V34" fill="none" stroke="#7F9DB3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M88 32h54M158 32h54" stroke="#7F9DB3" stroke-width="5" stroke-linecap="round"/>' +
      '<g id="pi-ref"><path d="M94 0H206" stroke="#E0463B" stroke-width="1.4" stroke-dasharray="5 4" opacity=".85"/>' +
      '<polygon points="74,-5 88,0 74,5" fill="#E0463B"/><polygon points="226,-5 212,0 226,5" fill="#E0463B"/></g>' +
      '<rect x="44" y="72" width="12" height="104" rx="6" fill="rgba(255,255,255,.88)" stroke="#7F9DB3" stroke-width="1.5"/>' +
      '<rect id="pi-fl" x="47.6" y="100" width="4.8" height="75" fill="#E0463B"/>' +
      '<circle cx="50" cy="180" r="11" fill="#E0463B" stroke="#7F9DB3" stroke-width="1.5"/></svg>';
  }

  // ---------- État ----------
  function fresh(keepPiston) {
    var ph = keepPiston ? S.ph : H.none, pv = keepPiston ? S.pv : 0;
    S = { sub: null, tau: T0, k: 0, amb: false, ph: ph, pv: pv, pdown: 0, drag: null, ref: H.none, ap: 1, armed: false, t: 0 };
  }

  function msg(t, cls) { els.msg.textContent = t; els.msg.className = 'ex-feedback' + (cls ? ' ' + cls : ''); }

  function setThumb(pos, dragging) {
    els.thumb.style.top = (pos * 100) + '%';
    els.slider.classList.toggle('pi-dragging', !!dragging);
  }

  function markButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('#screen-piston [data-pisub]'), function (b) {
      b.classList.toggle('pi-on', b.getAttribute('data-pisub') === S.chosen);
    });
  }

  function setMode(m) {                                          // vitesses initiales selon l'état
    P.forEach(function (p) {
      var an = Math.random() * 6.283, sp = m === 'gas' ? 55 * agit() * p.sf : (m === 'liquid' ? 8 : 0);
      p.vx = Math.cos(an) * sp; p.vy = Math.sin(an) * sp;
      p.va = (Math.random() < .5 ? -1 : 1) * (m === 'gas' ? 120 + Math.random() * 200 : 20 + Math.random() * 40);
    });
  }

  function select(sub) {
    fresh(true);
    S.sub = sub; S.chosen = sub; S.ap = 0; S.ref = H[sub];
    var top = B - H[sub] + 6;
    P.forEach(function (p) { p.x = 100 + Math.random() * 100; p.y = top + Math.random() * (FLOOR - top); p.a = Math.random() * 360; });
    setMode(sub);
    setThumb(.5);
    msg('', '');
    markButtons();
    els.svg.classList.toggle('pi-locked', sub !== 'gas');
  }

  function clearAll() {
    fresh(true);
    setThumb(.5);
    msg(MSG_START, 'reveal');
    markButtons();
    els.svg.classList.add('pi-locked');
  }

  function liquefy() {
    var byDrag = !!S.drag;
    S.drag = null; S.sub = 'liquid';
    setMode('liquid');
    els.svg.classList.add('pi-locked');
    msg(byDrag ? 'À force de comprimer le gaz, ses molécules se sont rapprochées : il est devenu liquide.'
      : 'En refroidissant le gaz, ses molécules ralentissent et se rapprochent : il est devenu liquide.', 'success');
  }

  // ---------- Simulation ----------
  function stepTemp(dt) {
    if (!S.sub) return;
    if (S.k !== 0) { S.amb = false; S.tau += S.k * RATE * dt; }
    else if (S.amb) {
      var d = T0 - S.tau, st = AMB_RATE * dt;
      if (Math.abs(d) <= st) { S.tau = T0; S.amb = false; } else S.tau += d > 0 ? st : -st;
    }
    S.tau = clamp(S.tau, 0, 1);
  }

  function stepPiston(dt) {
    var prev = S.ph;
    if (S.drag) { S.ph = S.drag.h; S.pv = 0; }
    else {
      var a = SW * SW * (heq() - S.ph) - 2 * SZ * SW * S.pv;     // retour amorti mais rapide
      S.pv += a * dt; S.ph += S.pv * dt;
    }
    S.ph = clamp(S.ph, 20, 146);
    S.pdown = (prev - S.ph) / dt;
    if (S.sub === 'gas') {
      var lim = hc();
      if (S.ph > lim + 4) S.armed = true;
      else if (S.armed && S.ph <= lim) liquefy();
    }
  }

  function stepMicro(dt) {
    var m = S.sub, i, j, p, q;
    if (!m) return;
    var ag = agit(), y0 = B - S.ph + 5, y1 = FLOOR;
    S.t += dt;
    if (m === 'solid') {                                         // réseau qui vibre
      var f = Math.exp(-16 * dt), A = .25 + .9 * ag;
      for (i = 0; i < N; i++) {
        p = P[i]; var s = SLOTS[p.slot], w = S.t * (7 + p.sf * 4);
        var tx = s.x + A * Math.sin(w + p.ph1), ty = s.y + A * Math.cos(w * 1.3 + p.ph2);
        p.vx = (p.vx + (tx - p.x) * 200 * dt) * f; p.vy = (p.vy + (ty - p.y) * 200 * dt) * f;
        p.a += shortest(s.a + A * 5 * Math.sin(w * .8 + p.ph1) - p.a) * Math.min(1, 7 * dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      return;
    }
    var gas = m === 'gas', v0 = (gas ? 55 : 13) * ag, acc = gas ? 90 : 70;
    for (i = 0; i < N; i++) {
      p = P[i];
      p.vx += (Math.random() - .5) * acc * dt; p.vy += (Math.random() - .5) * acc * dt;
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || .001, ns = sp + (v0 * p.sf - sp) * Math.min(1, 3 * dt);
      p.vx *= ns / sp; p.vy *= ns / sp;
      p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * ag * dt;
      if (p.x < XL) { p.x = XL; p.vx = Math.abs(p.vx); } else if (p.x > XR) { p.x = XR; p.vx = -Math.abs(p.vx); }
      if (p.y < y0) { p.y = y0; p.vy = Math.abs(p.vy) + Math.max(0, S.pdown) * .7; }        // rebond sur le piston
      else if (p.y > y1) { p.y = y1; p.vy = -Math.abs(p.vy); }
    }
    var dm = gas ? 5.8 : 7.6, its = gas ? 1 : 2, k = gas ? .15 : .3;
    for (var it = 0; it < its; it++) for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) {
      p = P[i]; q = P[j];
      var dx = q.x - p.x, dy = q.y - p.y, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < dm && dd > .01) { var mm = (dm - dd) * k / dd; p.x -= dx * mm; p.y -= dy * mm; q.x += dx * mm; q.y += dy * mm; }
    }
    for (i = 0; i < N; i++) { p = P[i]; p.x = clamp(p.x, XL, XR); p.y = clamp(p.y, y0, y1); }
  }

  // ---------- Rendu ----------
  function render(dt) {
    var yPB = B - S.ph, on = !!S.sub, k = on ? S.k : 0;
    $('pi-piston').setAttribute('transform', 'translate(0 ' + yPB.toFixed(2) + ')');
    els.ref.style.display = on ? '' : 'none';
    els.ref.setAttribute('transform', 'translate(0 ' + (B - S.ref).toFixed(2) + ')');
    if (on) S.ap = Math.min(1, S.ap + dt * 2);
    els.mac.style.display = on ? '' : 'none';
    els.mac.style.opacity = S.ap;
    els.solid.style.display = S.sub === 'solid' ? '' : 'none';
    els.liq.style.display = S.sub === 'liquid' ? '' : 'none';
    els.gas.style.display = S.sub === 'gas' ? '' : 'none';
    if (S.sub === 'solid') { els.solid.setAttribute('y', yPB.toFixed(2)); els.solid.setAttribute('height', (S.ph + 2).toFixed(2)); }
    else if (S.sub === 'liquid') { els.liq.setAttribute('y', yPB.toFixed(2)); els.liq.setAttribute('height', (S.ph + 1).toFixed(2)); }
    else if (S.sub === 'gas') {
      els.gcr.setAttribute('y', yPB.toFixed(2)); els.gcr.setAttribute('height', S.ph.toFixed(2));
      els.fog.setAttribute('opacity', clamp(18 / S.ph, .12, .5).toFixed(3));
    }
    var hfl = 14 + 80 * S.tau;                                   // thermomètre non gradué
    els.fl.setAttribute('y', (175 - hfl).toFixed(1)); els.fl.setAttribute('height', (hfl + 4).toFixed(1));
    var heat = Math.max(0, k), cool = Math.max(0, -k);
    $('pi-flame').style.opacity = Math.min(1, heat * 2.2);
    $('pi-flg').setAttribute('transform', 'translate(0 240) scale(1 ' + (.45 + .55 * heat) + ') translate(0 -240)');
    $('pi-frost').style.opacity = Math.min(1, cool * 2);
    var hd = $('pi-head'); hd.setAttribute('fill', cool > 0 ? '#CDEFFF' : (heat > 0 ? '#D9602B' : '#59656F')); hd.setAttribute('stroke', cool > 0 ? '#8CC7E6' : 'none');
    if (micro && on) P.forEach(function (p) {
      p.tri.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + p.a.toFixed(0) + ')');
    });
    els.tri.style.display = on ? '' : 'none';
  }

  function frame(t) {
    var dt = Math.min(.05, (t - lastT) / 1000 || .016); lastT = t;
    stepTemp(dt); stepPiston(dt); stepMicro(dt); render(dt);
    raf = requestAnimationFrame(frame);
  }

  function setMicro(on) {
    micro = on; els.svg.classList.toggle('is-micro', on);
    $('pi-ico-lens').style.display = on ? 'none' : ''; $('pi-ico-eye').style.display = on ? '' : 'none';
    els.legend.style.display = on ? '' : 'none';
    els.microBtn.textContent = on ? 'Mode Macroscopique' : 'Mode Microscopique';
  }

  // ---------- Commandes ----------
  function svgY(e) {
    var pt = els.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(els.svg.getScreenCTM().inverse()).y;
  }

  function lockedMsg() {
    var h = $('pi-handle');
    h.classList.remove('pi-shake'); void h.getBoundingClientRect(); h.classList.add('pi-shake');
    if (!S.sub) msg(MSG_START, 'reveal');
    else msg('Le piston ne bouge pas : ' + (S.sub === 'solid' ? 'un solide' : 'un liquide') + ' ne se comprime pas et ne s\'étend pas.', 'reveal');
  }

  function sliderMove(e) {
    var r = els.slider.getBoundingClientRect(), pos = clamp((e.clientY - r.top) / r.height, 0, 1);
    var d = .5 - pos, a = Math.abs(d) * 2;
    S.k = a < DEAD ? 0 : (d > 0 ? 1 : -1) * (a - DEAD) / (1 - DEAD);
    S.amb = false;
    setThumb(pos, true);
  }

  function fitSlider() {                                         // le curseur couvre la hauteur du cylindre
    if (!els.svg) return;
    var h = els.svg.getBoundingClientRect().height;
    if (!h) return;
    els.slider.style.marginTop = (h * 34 / 300) + 'px';
    els.slider.style.height = (h * 150 / 300) + 'px';
  }

  // ---------- Fenêtre « À retenir » ----------
  function illu(kind) {
    var h = kind === 'solid' ? H.solid : (kind === 'liquid' ? H.liquid : 100), yPB = B - h, out = '', seed = 7, i;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function tri(x, y, a) { return '<polygon class="st-tri" points="0,-4.79 -4.15,2.4 4.15,2.4" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + a.toFixed(0) + ')"/>'; }
    if (kind === 'solid') SLOTS.forEach(function (s) { out += tri(s.x, s.y, s.a); });
    else if (kind === 'liquid') SLOTS.forEach(function (s) { out += tri(150 + (s.x - 150) * 1.95 + (rnd() - .5) * 3, B - 2 - (B - s.y) * .56 + (rnd() - .5) * 3, rnd() * 360); });
    else for (i = 0; i < N; i++) out += tri(100 + rnd() * 100, yPB + 8 + rnd() * (FLOOR - yPB - 8), rnd() * 360);
    return '<svg class="st-illu pi-illu" viewBox="80 24 140 164" aria-hidden="true">' +
      '<rect x="94" y="34" width="112" height="150" fill="rgba(215,235,247,.35)"/>' + out +
      '<rect x="94" y="' + (yPB - 6) + '" width="112" height="6" rx="2" fill="#6B7886"/><rect x="147" y="' + (yPB - 36) + '" width="6" height="30" fill="#8996A3"/>' +
      '<rect x="128" y="' + (yPB - 45) + '" width="44" height="10" rx="5" fill="#E0463B"/>' +
      '<path d="M92 34V176q0 8 8 8h100q8 0 8-8V34" fill="none" stroke="#7F9DB3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function buildMemo() {
    var rows = [
      ['solid', 'Solide', 'Les particules sont <b>serrées et rangées</b>. Un solide n\'est <b>ni compressible ni extensible</b>, et il se dilate à peine quand on le chauffe.'],
      ['liquid', 'Liquide', 'Les particules sont <b>serrées mais désordonnées</b> : elles glissent les unes sur les autres. Un liquide n\'est <b>ni compressible ni extensible</b> ; chauffé, il se dilate très légèrement.'],
      ['gas', 'Gaz', 'Les particules sont <b>éloignées et très agitées</b>. Un gaz est <b>compressible et extensible</b> : il occupe tout le volume disponible, se dilate beaucoup quand on le chauffe et se contracte quand on le refroidit.']
    ];
    $('pi-memo-body').innerHTML =
      '<p class="st-memo__note pi-intro">Plus on <b>chauffe</b>, plus les particules s\'agitent ; plus on <b>refroidit</b>, moins elles bougent.</p>' +
      rows.map(function (r) {
        return '<div class="st-memo"><h3 class="st-memo__h">' + r[1] + '</h3><div class="st-micro-row">' + illu(r[0]) + '<p>' + r[2] + '</p></div></div>';
      }).join('') +
      '<div class="st-memo pi-liq"><h3 class="st-memo__h">Liquéfier un gaz</h3>' +
      '<p>Pour qu\'un gaz devienne liquide, il faut <b>rapprocher ses particules</b> : soit en le <b>comprimant</b> (on réduit le volume qu\'il occupe), soit en le <b>refroidissant</b> (les particules s\'agitent moins et se rapprochent).</p>' +
      '<p>C\'est ce qui se passe avec l\'<b>azote</b> : gaz dans l\'air, il devient <b>liquide vers −196 °C</b>. Voilà pourquoi l\'azote liquide est glacé !</p></div>';
  }

  // ---------- Cycle de vie ----------
  function start() {
    stop();
    fresh(false);
    if (!built) return;
    setMicro(false); setThumb(.5);
    markButtons();
    els.svg.classList.add('pi-locked');
    msg(MSG_START, 'reveal');
    $('pi-memo').style.display = 'none';
    fitSlider();
    lastT = performance.now(); raf = requestAnimationFrame(frame);
  }

  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; if (S) S.k = 0; }

  function init() {
    els.stage = $('pi-stage'); if (!els.stage) return;
    els.stage.innerHTML = sceneHTML();
    els.svg = $('pi-svg'); els.msg = $('pi-msg'); els.slider = $('pi-slider'); els.thumb = $('pi-thumb');
    els.mac = $('pi-mac'); els.solid = $('pi-solid'); els.liq = $('pi-liq'); els.gas = $('pi-gas'); els.gcr = $('pi-gcr'); els.fog = $('pi-fog');
    els.fl = $('pi-fl'); els.ref = $('pi-ref'); els.tri = $('pi-micro');
    els.legend = $('pi-legend'); els.microBtn = $('btn-pi-micro');
    fresh(false);
    var order = SLOTS.map(function (s, i) { return i; }).sort(function () { return Math.random() - .5; });
    order.forEach(function (slot) {
      var tri = document.createElementNS(NS, 'polygon');
      tri.setAttribute('points', '0,-4.79 -4.15,2.4 4.15,2.4'); tri.setAttribute('class', 'st-tri');
      els.tri.appendChild(tri);
      P.push({ tri: tri, slot: slot, x: 150, y: 150, vx: 0, vy: 0, a: 0, va: 0, sf: .6 + Math.random() * .8, ph1: Math.random() * 6.28, ph2: Math.random() * 6.28 });
    });

    Array.prototype.forEach.call(document.querySelectorAll('#screen-piston [data-pisub]'), function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-pisub')); });
    });
    $('btn-pi-clear').addEventListener('click', clearAll);
    $('btn-pi-amb').addEventListener('click', function () { if (S.sub) S.amb = true; });
    els.microBtn.addEventListener('click', function () { setMicro(!micro); });

    // Curseur chaud / froid : vertical, revient au centre au relâchement, la température reste
    var sl = els.slider;
    sl.addEventListener('pointerdown', function (e) { sl.setPointerCapture(e.pointerId); sliderMove(e); });
    sl.addEventListener('pointermove', function (e) { if (sl.hasPointerCapture(e.pointerId)) sliderMove(e); });
    function sliderEnd() { S.k = 0; setThumb(.5, false); }
    sl.addEventListener('pointerup', sliderEnd); sl.addEventListener('pointercancel', sliderEnd);
    sl.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });

    // Piston : on tire ou on pousse la poignée
    var hit = $('pi-hit');
    hit.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    hit.addEventListener('pointerdown', function (e) {
      if (S.sub !== 'gas') { lockedMsg(); return; }
      hit.setPointerCapture(e.pointerId);
      S.drag = { y0: svgY(e), h0: S.ph, h: S.ph };
      els.svg.classList.add('pi-grab');
    });
    hit.addEventListener('pointermove', function (e) {
      if (!S.drag || !hit.hasPointerCapture(e.pointerId)) return;
      S.drag.h = clamp(S.drag.h0 - (svgY(e) - S.drag.y0), HMIN, HMAX);
    });
    function dragEnd() { S.drag = null; els.svg.classList.remove('pi-grab'); }
    hit.addEventListener('pointerup', dragEnd); hit.addEventListener('pointercancel', dragEnd);

    buildMemo();
    var memo = $('pi-memo');
    $('btn-pi-retenir').addEventListener('click', function () { memo.style.display = 'flex'; });
    $('btn-pi-memo-close').addEventListener('click', function () { memo.style.display = 'none'; });
    memo.addEventListener('click', function (e) { if (e.target === memo) memo.style.display = 'none'; });
    window.addEventListener('resize', fitSlider);
    built = true;
  }

  document.addEventListener('DOMContentLoaded', init);
  return { start: start, stop: stop };
})();
