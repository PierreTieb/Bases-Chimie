// states-app.js
// Module 3 : "Changements d'états" (laboratoire : l'eau).
// Un clic sur Chauffer / Refroidir = un seul passage d'état. 4 s d'animation de température
// (feu ou vent froid) ; à 2 s le changement d'état commence et dure 2 s ; à 4 s tout s'arrête
// et le nom de la transformation apparaît au-dessus du bécher.
window.States = (function () {
  'use strict';

  var DURATION = 4000, SWAP_AT = 2000;
  // [état suivant, nom, couleur]
  var STEPS = {
    heat: { solid: ['liquid', 'Fusion', 'red'], liquid: ['gas', 'Vaporisation', 'red'] },
    cool: { gas: ['liquid', 'Liquéfaction', 'blue'], liquid: ['solid', 'Solidification', 'blue'] }
  };

  var $ = function (id) { return document.getElementById(id); };
  var els = {}, items = {}, timers = [], cur = null, busy = false;

  // ---------- Représentation microscopique : triangles équilatéraux (côté 10) ----------
  var REG = { liquid: { x0: 97, x1: 203, y0: 143, y1: 179 }, gas: { x0: 97, x1: 203, y0: 44, y1: 179 } };
  var SLOTS = [], P = [], mmode = null, agit = 1, agitT = 1, micro = false, raf = null, lastT = 0;
  (function () {                                      // pavage serré : triangles pointe en haut / en bas en alternance (8 rangées x 12)
    var S = 8.3, H = S * .866, PX = S / 2 + .3, PY = H + .4;
    for (var r = 0; r < 8; r++) {
      var top = 184 - .2 - H - r * PY;
      for (var c = 0; c < 12; c++) {
        var up = (r + c) % 2 === 0;
        SLOTS.push({ x: 150 + (c - 5.5) * PX, y: top + (up ? 2 * H / 3 : H / 3), a: up ? 0 : 180 });
      }
    }
  })();
  function shortest(d) { return ((d + 180) % 360 + 360) % 360 - 180; }

  function setMicroMode(m) {
    mmode = m;
    P.forEach(function (p) {
      var sp = m === 'gas' ? 70 : 14, ang = Math.random() * 6.283;
      if (m === 'gas') { p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp; }
      p.va = (Math.random() < .5 ? -1 : 1) * (m === 'gas' ? 120 + Math.random() * 200 : 20 + Math.random() * 40);
    });
  }

  function spawnMicro() {                             // les triangles tombent du dessus du bécher
    P.forEach(function (p) { p.x = 120 + Math.random() * 60; p.y = -10 - Math.random() * 130; p.vx = p.vy = 0; p.a = Math.random() * 360; });
  }

  function stepMicro(dt) {
    agit += (agitT - agit) * Math.min(1, dt * 2);
    var k, c, i, j, p, q, sp, v0, A, R;
    if (mmode === 'solid') {
      var f = Math.exp(-10 * dt);
      P.forEach(function (p) {
        var s = SLOTS[p.slot];
        p.vx = (p.vx + (s.x - p.x) * 30 * dt) * f; p.vy = (p.vy + (s.y - p.y) * 30 * dt) * f;
        p.a += shortest(s.a - p.a) * Math.min(1, 7 * dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
      });
      return;
    }
    if (mmode !== 'liquid' && mmode !== 'gas') {      // pas encore d'état : chute libre
      return;
    }
    R = REG[mmode]; v0 = (mmode === 'gas' ? 70 : 14) * agit; A = mmode === 'gas' ? 500 : 100;
    for (i = 0; i < P.length; i++) {
      p = P[i];
      p.vx += (Math.random() - .5) * A * dt; p.vy += (Math.random() - .5) * A * dt;
      sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > v0 * 1.5) { var d = Math.exp(-4 * dt); p.vx *= d; p.vy *= d; }
      else if (sp < v0 * .5) { p.vx += (Math.random() - .5) * v0 * 6 * dt; p.vy += (Math.random() - .5) * v0 * 6 * dt; }
      var out = false;
      if (p.x < R.x0) { p.vx += (R.x0 - p.x) * 150 * dt; out = true; } else if (p.x > R.x1) { p.vx += (R.x1 - p.x) * 150 * dt; out = true; }
      if (p.y < R.y0) { p.vy += (R.y0 - p.y) * 150 * dt; out = true; } else if (p.y > R.y1) { p.vy += (R.y1 - p.y) * 150 * dt; out = true; }
      if (out) { var o = Math.exp(-24 * dt); p.vx *= o; p.vy *= o; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.a += p.va * agit * dt;
    }
    if (mmode === 'liquid') {                         // les triangles restent très serrés, sans se chevaucher
      for (var it = 0; it < 2; it++) for (i = 0; i < P.length; i++) for (j = i + 1; j < P.length; j++) {
        p = P[i]; q = P[j];
        var dx = q.x - p.x, dy = q.y - p.y, dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < 8.2 && dd > .01) { var m = (8.2 - dd) * .3 / dd; p.x -= dx * m; p.y -= dy * m; q.x += dx * m; q.y += dy * m; }
      }
    }
    for (i = 0; i < P.length; i++) {                  // parois rigides : rien ne déborde du bécher (le haut reste libre pour la chute)
      p = P[i];
      if (p.x < R.x0) p.x = R.x0; else if (p.x > R.x1) p.x = R.x1;
      if (p.y > R.y1) p.y = R.y1;
    }
  }

  function frame(t) {
    var dt = Math.min(.05, (t - lastT) / 1000 || .016); lastT = t;
    stepMicro(dt);
    P.forEach(function (p) {
      p.el.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + p.a.toFixed(0) + ')');
    });
    raf = requestAnimationFrame(frame);
  }

  function setMicro(on) {
    micro = on;
    els.svg.classList.toggle('is-micro', on);
    $('st-ico-lens').style.display = on ? 'none' : '';
    $('st-ico-eye').style.display = on ? '' : 'none';
    $('st-legend').style.display = on ? '' : 'none';
    els.microBtn.textContent = on ? 'Représentation macroscopique' : 'Représentation microscopique';
  }

  function setAnim(el, cls) {
    el.classList.remove('a-drop', 'a-in', 'a-out');
    void el.getBoundingClientRect();                 // relance l'animation
    if (cls) el.classList.add(cls);
  }

  function enter(state, mode) {
    var el = items[state];
    el.style.display = '';
    setAnim(el, mode);
    if (state === 'liquid' && mode === 'a-drop') {   // le filet d'eau qui tombe
      els.stream.style.display = '';
      els.stream.classList.remove('go');
      void els.stream.getBoundingClientRect();
      els.stream.classList.add('go');
      timers.push(setTimeout(function () { els.stream.style.display = 'none'; }, 1250));
    }
  }

  function leave(state) {
    var el = items[state];
    setAnim(el, 'a-out');
    timers.push(setTimeout(function () { el.style.display = 'none'; setAnim(el, null); }, SWAP_AT));
  }

  function setCold(on) {
    els.cold.classList.toggle('on', on);
    els.tint.classList.toggle('on', on);
  }

  function updateButtons() {
    els.heat.disabled = busy || !STEPS.heat[cur];
    els.cool.disabled = busy || !STEPS.cool[cur];
  }

  function showName(text, color) {
    els.name.textContent = text;
    els.name.className = 'st-name st-' + (color === 'red' ? 'red' : 'blue');
    void els.name.offsetWidth;
    els.name.classList.add('show');
  }

  function go(dir) {
    var step = STEPS[dir][cur];
    if (busy || !step) return;
    busy = true;
    els.name.textContent = '';
    els.name.className = 'st-name';
    updateButtons();
    agitT = dir === 'heat' ? 1.8 : .5;
    if (dir === 'heat') { els.flame.classList.add('on'); els.head.classList.add('on'); }
    else setCold(true);

    timers.push(setTimeout(function () {
      leave(cur);
      enter(step[0], 'a-in');
      setMicroMode(step[0]);
    }, SWAP_AT));

    timers.push(setTimeout(function () {
      els.flame.classList.remove('on');
      els.head.classList.remove('on');
      setCold(false);
      cur = step[0];
      busy = false;
      agitT = 1;
      showName(step[1], step[2]);
      updateButtons();
    }, DURATION));
  }

  function pick(state) {
    cur = state;
    els.picks.style.display = 'none';
    els.prompt.style.display = 'none';
    els.actions.style.display = '';
    els.retenirWrap.style.display = '';
    enter(state, 'a-drop');
    els.side.style.visibility = '';
    spawnMicro();
    setMicroMode(state);
    updateButtons();
  }

  // Coupe tout : minuteurs, flamme, ambiance froide.
  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    busy = false;
    agitT = 1;
    if (!els.flame) return;
    els.flame.classList.remove('on');
    els.head.classList.remove('on');
    setCold(false);
    els.overlay.style.display = 'none';
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  // Appelé à chaque entrée dans l'écran : remise à zéro complète.
  function start() {
    stop();
    cur = null;
    mmode = null; agit = agitT = 1;
    setMicro(false);
    els.side.style.visibility = 'hidden';
    spawnMicro();
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
    Object.keys(items).forEach(function (k) { items[k].style.display = 'none'; setAnim(items[k], null); });
    els.stream.style.display = 'none';
    els.name.textContent = '';
    els.name.className = 'st-name';
    els.picks.style.display = '';
    els.prompt.style.display = '';
    els.actions.style.display = 'none';
    els.retenirWrap.style.display = 'none';
  }

  function buildCold() {
    var i, d, html = '';
    for (i = 0; i < 40; i++) {
      var s = 3 + Math.random() * 4;
      html += '<span class="st-flake" style="left:' + (-30 + Math.random() * 120) + '%;width:' + s + 'px;height:' + s +
        'px;animation-duration:' + (3 + Math.random() * 3.5) + 's;animation-delay:-' + (Math.random() * 6) + 's"></span>';
    }
    for (i = 0; i < 8; i++) {
      html += '<span class="st-wind" style="top:' + (6 + Math.random() * 88) + '%;width:' + (90 + Math.random() * 120) +
        'px;animation-duration:' + (1.4 + Math.random() * 1.2) + 's;animation-delay:-' + (Math.random() * 2) + 's"></span>';
    }
    els.cold.innerHTML = html;
  }

  function init() {
    els.name = $('st-name'); els.stream = $('st-stream'); els.flame = $('st-flame'); els.head = $('st-head');
    els.picks = $('st-picks'); els.prompt = $('st-prompt'); els.actions = $('st-actions');
    els.retenirWrap = $('st-retenir-wrap'); els.overlay = $('st-overlay');
    els.heat = $('btn-st-heat'); els.cool = $('btn-st-cool');
    els.cold = $('st-cold'); els.tint = $('st-cold-tint');
    if (!els.name || !els.picks) return;
    items.solid = $('st-ice'); items.liquid = $('st-water'); items.gas = $('st-gas');

    els.svg = $('st-svg'); els.side = $('st-side'); els.microBtn = $('btn-st-micro');
    var layer = $('st-micro'), NS = 'http://www.w3.org/2000/svg', idx = SLOTS.map(function (s, i) { return i; });
    idx.sort(function () { return Math.random() - .5; });
    idx.forEach(function (slot) {
      var el = document.createElementNS(NS, 'polygon');
      el.setAttribute('points', '0,-4.79 -4.15,2.4 4.15,2.4');
      el.setAttribute('class', 'st-tri');
      layer.appendChild(el);
      P.push({ el: el, slot: slot, x: 150, y: -30, vx: 0, vy: 0, a: 0, va: 0 });
    });
    els.microBtn.addEventListener('click', function () { setMicro(!micro); });
    buildCold();
    Array.prototype.forEach.call(els.picks.querySelectorAll('[data-state]'), function (b) {
      b.addEventListener('click', function () { pick(b.getAttribute('data-state')); });
    });
    els.heat.addEventListener('click', function () { go('heat'); });
    els.cool.addEventListener('click', function () { go('cool'); });
    $('btn-st-retenir').addEventListener('click', function () { els.overlay.style.display = 'flex'; });
    $('btn-st-close').addEventListener('click', function () { els.overlay.style.display = 'none'; });
    els.overlay.addEventListener('click', function (e) { if (e.target === els.overlay) els.overlay.style.display = 'none'; });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { start: start, stop: stop };
})();
