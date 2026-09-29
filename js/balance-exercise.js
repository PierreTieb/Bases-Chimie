// balance-exercise.js
// Niveau 2 : "Équilibrer une équation". Une équation aléatoire de la banque
// (Equations.getRandomBalance), une case de coefficient devant CHAQUE substance.
// - Case vide = 1 (et "1" est accepté pour 1).
// - Validation : cases justes en vert, fausses en rouge ; on peut corriger et revalider.
// - "Résoudre et passer" apparaît après le premier échec.
// - Toute l'équation reste sur UNE ligne : la taille de police (et donc des cases) est
//   recalculée pour que l'ensemble tienne dans l'encadré.
// - La représentation moléculaire mesure chaque molécule (boîte englobante), répartit
//   la largeur entre les zones, et réduit les molécules pour qu'elles tiennent dans leur zone.
window.BalanceExercise = (function () {
  'use strict';

  var SHOW_CHIPS = true;       // compteur d'atomes "H : 4 → 4 ✓" sous la représentation
  var BASE_FONT = 28;          // taille de départ (px) de l'équation avant ajustement
  var MIN_FONT = 10;
  var PAD = 3;                 // marge autour d'une molécule mesurée (px)

  var els = {};
  var reaction = null;
  var subs = [];               // { formula, type, coef, counts, symbols, box }
  var groups = [];             // { el, cells: [] }
  var inputs = [];
  var raw = [];
  var score = { correct: 0, total: 0 };
  var solved = false, revealing = false, failed = false;

  function expandSymbols(counts) {
    var out = [];
    Object.keys(counts).forEach(function (s) { for (var i = 0; i < counts[s]; i++) out.push(s); });
    return out;
  }

  function coefOf(i) { return raw[i] === '' ? 1 : parseInt(raw[i], 10); }

  function updateScore() { els.score.textContent = 'Score : ' + score.correct + ' / ' + score.total; }

  // ---------- Construction d'une nouvelle équation ----------
  function buildEquation() {
    els.row.innerHTML = '';
    els.eqInner.innerHTML = '';
    groups = [];
    inputs = [];

    subs.forEach(function (s, i) {
      if (i > 0) {
        var glyph = s.type !== subs[i - 1].type ? '\u2192' : '+';
        var rs = document.createElement('span');
        rs.className = 'bal-sign';
        rs.textContent = glyph;
        els.row.appendChild(rs);
        var es = document.createElement('span');
        es.className = 'bal-eqsign';
        es.textContent = glyph;
        els.eqInner.appendChild(es);
      }

      var g = document.createElement('div');
      g.className = 'bal-group';
      els.row.appendChild(g);
      groups.push({ el: g, cells: [] });

      var term = document.createElement('span');
      term.className = 'bal-term';
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'bal-coef';
      inp.setAttribute('inputmode', 'numeric');
      inp.setAttribute('autocomplete', 'off');
      inp.setAttribute('aria-label', 'Coefficient devant ' + s.formula);
      inp.addEventListener('focus', function () { inp.select(); });
      inp.addEventListener('input', (function (idx, input) {
        return function () { onCoefInput(idx, input); };
      })(i, inp));
      term.appendChild(inp);
      inputs.push(inp);
      var f = document.createElement('span');
      f.className = 'bal-formula';
      f.textContent = window.Molecules.formatSubscripts(s.formula);
      term.appendChild(f);
      els.eqInner.appendChild(term);
    });
  }

  function onCoefInput(i, input) {
    if (solved || revealing) { input.value = raw[i]; return; }
    var digits = input.value.replace(/[^1-9]/g, '');   // 1 à 9 uniquement, 0 refusé
    raw[i] = digits.slice(-1);
    input.value = raw[i];
    input.classList.remove('bal-coef--ok', 'bal-coef--bad');
    renderScene();
  }

  // ---------- Une ligne : ajustement de la taille ----------
  function fitEquation() {
    var outer = els.equation, inner = els.eqInner;
    if (!outer.clientWidth) return;
    var cs = window.getComputedStyle(outer);
    var avail = outer.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var size = BASE_FONT;
    for (var k = 0; k < 3; k++) {
      outer.style.fontSize = size + 'px';
      var w = inner.getBoundingClientRect().width;
      if (!w || w <= avail) return;
      size = Math.max(MIN_FONT, size * (avail / w) * 0.985);
    }
  }

  // ---------- Représentation ----------
  function makeCell(i, animate) {
    var cell = document.createElement('div');
    cell.className = 'bal-cell' + (animate ? ' bal-pop' : '');
    var mol = document.createElement('div');
    mol.className = 'bal-free';
    cell.appendChild(mol);
    groups[i].el.appendChild(cell);               // dans le DOM avant de construire (le builder mesure la zone)
    var b = window.MoleculeBuilder.create(mol);
    subs[i].symbols.forEach(function (sym) { b.addSymbol(sym); });

    if (!subs[i].box) {                           // mesure de la molécule, une seule fois
      var atoms = b.getPlacedAtoms();
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      atoms.forEach(function (a) {
        x0 = Math.min(x0, a.x - a.radius); y0 = Math.min(y0, a.y - a.radius);
        x1 = Math.max(x1, a.x + a.radius); y1 = Math.max(y1, a.y + a.radius);
      });
      subs[i].box = { x: x0 - PAD, y: y0 - PAD, w: (x1 - x0) + 2 * PAD, h: (y1 - y0) + 2 * PAD };
    }
    cell.addEventListener('animationend', function () { cell.classList.remove('bal-pop'); });
    return cell;
  }

  function layoutGroup(i) {
    var g = groups[i], n = g.cells.length, box = subs[i].box;
    if (!n || !box) return;
    var W = g.el.clientWidth, H = g.el.clientHeight;
    var best = { s: 0, c: 1 };
    for (var c = 1; c <= n; c++) {
      var r = Math.ceil(n / c);
      var s = Math.min(1, W / (c * box.w), H / (r * box.h));
      if (s > best.s) best = { s: s, c: c };
    }
    var cw = box.w * best.s, ch = box.h * best.s;
    g.el.style.gridTemplateColumns = 'repeat(' + best.c + ', ' + cw + 'px)';
    g.el.style.gridAutoRows = ch + 'px';
    g.cells.forEach(function (cell) {
      cell.style.width = cw + 'px';
      cell.style.height = ch + 'px';
      cell.firstChild.style.transform =
        'scale(' + best.s + ') translate(' + (-box.x) + 'px,' + (-box.y) + 'px)';
    });
  }

  function layoutAll() {
    if (!groups.length) return;
    groups.forEach(function (g, i) {                 // largeur de zone proportionnelle à la molécule
      if (subs[i].box) g.el.style.flex = Math.max(subs[i].box.w, 40) + ' 1 0';
    });
    groups.forEach(function (g, i) { layoutGroup(i); });
  }

  function renderScene() {
    subs.forEach(function (s, i) {
      var g = groups[i], n = coefOf(i);
      while (g.cells.length > n) g.el.removeChild(g.cells.pop());
      while (g.cells.length < n) g.cells.push(makeCell(i, true));
    });
    layoutAll();
    renderChips();
  }

  function totals() {
    var left = {}, right = {}, order = [];
    subs.forEach(function (s, i) {
      var side = s.type === 'reactif' ? left : right;
      Object.keys(s.counts).forEach(function (sym) {
        if (order.indexOf(sym) === -1) order.push(sym);
        side[sym] = (side[sym] || 0) + s.counts[sym] * coefOf(i);
      });
    });
    return { left: left, right: right, order: order };
  }

  function renderChips() {
    if (!SHOW_CHIPS) { els.chips.innerHTML = ''; return; }
    var t = totals();
    els.chips.innerHTML = t.order.map(function (sym) {
      var l = t.left[sym] || 0, r = t.right[sym] || 0, ok = l === r;
      return '<span class="bal-chip bal-chip--' + (ok ? 'ok' : 'bad') + '">' +
        sym + ' : ' + l + ' \u2192 ' + r + ' ' + (ok ? '\u2713' : '\u2717') + '</span>';
    }).join('');
  }

  function isBalanced() {
    var t = totals();
    return t.order.every(function (sym) { return (t.left[sym] || 0) === (t.right[sym] || 0); });
  }

  // ---------- Flux de l'exercice ----------
  function setFeedback(text, cls) {
    els.feedback.textContent = text;
    els.feedback.className = 'ex-feedback' + (cls ? ' ' + cls : '');
  }

  function pickNew() {
    reaction = window.Equations.getRandomBalance();
    subs = reaction.substances.map(function (s) {
      var counts = window.Molecules.parseFormulaInput(s.formula);
      return { formula: s.formula, type: s.type, coef: s.coef, counts: counts, symbols: expandSymbols(counts), box: null };
    });
    raw = subs.map(function () { return ''; });
    solved = false; revealing = false; failed = false;
    setFeedback('', '');
    els.validateBtn.disabled = false;
    els.skipBtn.disabled = false;
    els.skipBtn.style.display = 'none';
    els.skipBtn.textContent = 'Résoudre et passer';
    buildEquation();
    renderScene();
    fitEquation();
    layoutAll();     // les tailles de police modifient peu la scène, mais on remesure une fois de plus
  }

  function confetti() {
    var canvas = document.getElementById('confetti-canvas');
    if (!window.Confetti || !canvas) return;
    try {
      var r = els.validateBtn.getBoundingClientRect();
      window.Confetti.burst(canvas, r.left + r.width / 2, r.top + r.height / 2);
    } catch (e) { /* purement décoratif */ }
  }

  function onValidate() {
    if (solved || revealing) return;
    var allOk = true;
    inputs.forEach(function (inp, i) {
      var ok = coefOf(i) === subs[i].coef;
      inp.classList.remove('bal-coef--ok', 'bal-coef--bad');
      inp.classList.add(ok ? 'bal-coef--ok' : 'bal-coef--bad');
      if (!ok) allOk = false;
    });

    if (allOk) {
      solved = true;
      score.correct++; score.total++;
      updateScore();
      setFeedback("Bravo, l'équation est équilibrée !", 'success');
      confetti();
      inputs.forEach(function (inp) { inp.readOnly = true; });
      els.validateBtn.disabled = true;
      els.skipBtn.style.display = 'inline-block';
      els.skipBtn.textContent = 'Équation suivante';
    } else {
      failed = true;
      if (isBalanced()) {
        setFeedback("Les atomes sont bien équilibrés, mais utilise les plus petits coefficients possibles.", 'error');
      } else {
        setFeedback("Certaines cases sont en rouge : corrige-les et revalide, ou passe à une autre équation.", 'error');
      }
      els.skipBtn.style.display = 'inline-block';
    }
  }

  function onSkip() {
    if (revealing) return;
    if (solved) { pickNew(); return; }

    revealing = true;
    score.total++;
    updateScore();
    els.validateBtn.disabled = true;
    els.skipBtn.disabled = true;
    subs.forEach(function (s, i) {
      inputs[i].value = s.coef === 1 ? '' : String(s.coef);
      raw[i] = s.coef === 1 ? '' : String(s.coef);
      inputs[i].readOnly = true;
      inputs[i].classList.remove('bal-coef--bad');
      inputs[i].classList.add('bal-coef--ok');
    });
    renderScene();
    setFeedback('Voici la bonne équation.', 'reveal');
    setTimeout(function () { pickNew(); }, 3000);
  }

  // Appelé à chaque entrée dans l'écran (il est alors visible, donc mesurable).
  function start() { pickNew(); }

  function init() {
    els.row = document.getElementById('bx-row');
    els.chips = document.getElementById('bx-chips');
    els.equation = document.getElementById('bx-equation');
    els.feedback = document.getElementById('bx-feedback');
    els.score = document.getElementById('bx-score');
    els.validateBtn = document.getElementById('btn-bx-validate');
    els.skipBtn = document.getElementById('btn-bx-skip');
    if (!els.row || !els.equation) return;

    els.eqInner = document.createElement('div');
    els.eqInner.className = 'bal-eq-inner';
    els.equation.appendChild(els.eqInner);

    els.validateBtn.addEventListener('click', onValidate);
    els.skipBtn.addEventListener('click', onSkip);
    window.addEventListener('resize', function () {
      if (!groups.length) return;
      fitEquation();
      layoutAll();
    });
    updateScore();
  }

  document.addEventListener('DOMContentLoaded', init);
  return { start: start, getScore: function () { return { correct: score.correct, total: score.total }; } };
})();
