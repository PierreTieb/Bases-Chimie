// balance-app.js
// Mode "Équilibrer une transformation" : tuto pas à pas sur H2 + O2 -> H2O.
// - Représentation : chaque substance a sa zone ; les molécules se multiplient
//   en temps réel avec le coefficient saisi (max 9) et rétrécissent pour rester
//   dans leur zone. Une petite bande de puces "H : 2 → 2 ✓" sert de compteur d'atomes.
// - Les exercices (autres équations) viendront plus tard : SUBS/TEXTS sont isolés
//   en haut du fichier pour pouvoir être remplacés par une banque d'équations.
window.Balance = (function () {
  'use strict';

  var NAT = 76; // taille naturelle (px) d'une molécule, réduite ensuite par transform: scale

  // boxStep : à partir de quelle étape la case de coefficient apparaît (null = jamais, reste à 1)
  // expected : coefficient attendu
  var SUBS = [
    { formula: 'H2',  type: 'reactif', boxStep: 3,    expected: 2 },
    { formula: 'O2',  type: 'reactif', boxStep: null, expected: 1 },
    { formula: 'H2O', type: 'produit', boxStep: 2,    expected: 2 }
  ];

  var TEXTS = {
    1: "Voici une transformation chimique écrite sous forme d'équation, mais elle n'est pas complète. " +
       "On ne retrouve pas les mêmes atomes au début et à la fin de la transformation. Équilibrons tout ça !",
    2: "Au départ, il y a 2 atomes d'oxygène (O₂). À l'arrivée, il n'y en a qu'un seul (H₂O). " +
       "Or les atomes ne peuvent ni disparaître ni apparaître : il faut donc former 2 molécules d'eau. " +
       "<strong>Ajoute un coefficient « 2 » devant la molécule d'eau.</strong>",
    3: "On voit maintenant que 2 molécules d'eau sont créées : il faut donc apporter 4 atomes d'hydrogène, " +
       "ce qui n'est pas encore le cas. " +
       "<strong>Ajoute le bon coefficient devant la molécule de dihydrogène pour compléter l'équation.</strong>"
  };
  var HINT = "Pas encore équilibré : compte les atomes de chaque côté.";
  var SUCCESS = "On trouve bien les mêmes atomes au début et à la fin de l'équation, tout est donc bien équilibré !";

  var els = {};
  var groups = [];   // { el, cells: [] } par substance
  var inputs = [];   // input de coefficient par substance (ou null)
  var step = 1;
  var done = false;
  var raw = ['', '', ''];
  var built = false;

  function expandSymbols(counts) {
    var out = [];
    Object.keys(counts).forEach(function (s) { for (var i = 0; i < counts[s]; i++) out.push(s); });
    return out;
  }

  // Coefficient effectif utilisé pour la représentation : 1 tant que la case n'est pas
  // apparue ; case vide = 1 ; sinon le chiffre saisi.
  function coefOf(i) {
    var s = SUBS[i];
    if (!s.boxStep || step < s.boxStep) return 1;
    return raw[i] === '' ? 1 : parseInt(raw[i], 10);
  }

  function canAdvance() {
    if (step === 1) return true;
    if (step === 2) return raw[2] === '2';
    return raw[0] === '2' && raw[2] === '2';
  }

  // ---------- Construction du DOM (une seule fois) ----------
  function build() {
    SUBS.forEach(function (s) {
      s.counts = window.Molecules.parseFormulaInput(s.formula);
      s.symbols = expandSymbols(s.counts);
    });

    var row = els.row, eq = els.equation;
    row.innerHTML = '';
    eq.innerHTML = '';
    groups = [];
    inputs = [];

    SUBS.forEach(function (s, i) {
      if (i > 0) {
        var sign = SUBS[i].type !== SUBS[i - 1].type ? '\u2192' : '+';
        var rs = document.createElement('span');
        rs.className = 'bal-sign';
        rs.textContent = sign;
        row.appendChild(rs);
        var es = document.createElement('span');
        es.className = 'bal-eqsign';
        es.textContent = sign;
        eq.appendChild(es);
      }

      var g = document.createElement('div');
      g.className = 'bal-group';
      row.appendChild(g);
      groups.push({ el: g, cells: [] });

      var term = document.createElement('span');
      term.className = 'bal-term';
      var inp = null;
      if (s.boxStep) {
        inp = document.createElement('input');
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
      }
      inputs.push(inp);
      var f = document.createElement('span');
      f.className = 'bal-formula';
      f.textContent = window.Molecules.formatSubscripts(s.formula);
      term.appendChild(f);
      eq.appendChild(term);
    });
    built = true;
  }

  function onCoefInput(i, input) {
    // Un seul chiffre de 1 à 9 : 0 et tout le reste sont refusés ; le dernier chiffre tapé remplace l'ancien.
    var digits = input.value.replace(/[^1-9]/g, '');
    raw[i] = digits.slice(-1);
    input.value = raw[i];
    render();
  }

  // ---------- Représentation moléculaire ----------
  function makeCell(i, animate) {
    var cell = document.createElement('div');
    cell.className = 'bal-cell' + (animate ? ' bal-pop' : '');
    var mol = document.createElement('div');
    mol.className = 'bal-mol';
    cell.appendChild(mol);
    groups[i].el.appendChild(cell);            // dans le DOM avant de construire (le builder mesure la zone)
    var b = window.MoleculeBuilder.create(mol);
    SUBS[i].symbols.forEach(function (sym) { b.addSymbol(sym); });
    cell.addEventListener('animationend', function () { cell.classList.remove('bal-pop'); });
    return cell;
  }

  function layoutGroup(i) {
    var g = groups[i], n = g.cells.length;
    if (!n) return;
    var W = g.el.clientWidth, H = g.el.clientHeight;
    var best = { s: 0, c: 1 };
    for (var c = 1; c <= n; c++) {
      var r = Math.ceil(n / c);
      var s = Math.min(1, W / (c * NAT), H / (r * NAT));
      if (s > best.s) best = { s: s, c: c };
    }
    var size = NAT * best.s;
    g.el.style.gridTemplateColumns = 'repeat(' + best.c + ', ' + size + 'px)';
    g.el.style.gridAutoRows = size + 'px';
    g.cells.forEach(function (cell) {
      cell.style.width = size + 'px';
      cell.style.height = size + 'px';
      cell.firstChild.style.transform = 'scale(' + best.s + ')';
    });
  }

  function syncMolecules() {
    SUBS.forEach(function (s, i) {
      var g = groups[i], n = coefOf(i);
      while (g.cells.length > n) g.el.removeChild(g.cells.pop());
      while (g.cells.length < n) g.cells.push(makeCell(i, true));
      layoutGroup(i);
    });
  }

  function layoutAll() {
    if (!built) return;
    SUBS.forEach(function (s, i) { layoutGroup(i); });
  }

  // ---------- Compteur d'atomes (puces) ----------
  function renderChips() {
    var order = [], left = {}, right = {};
    SUBS.forEach(function (s, i) {
      var side = s.type === 'reactif' ? left : right;
      Object.keys(s.counts).forEach(function (sym) {
        if (order.indexOf(sym) === -1) order.push(sym);
        side[sym] = (side[sym] || 0) + s.counts[sym] * coefOf(i);
      });
    });
    els.chips.innerHTML = order.map(function (sym) {
      var l = left[sym] || 0, r = right[sym] || 0, ok = l === r;
      return '<span class="bal-chip bal-chip--' + (ok ? 'ok' : 'bad') + '">' +
        sym + ' : ' + l + ' \u2192 ' + r + ' ' + (ok ? '\u2713' : '\u2717') + '</span>';
    }).join('');
  }

  // ---------- Rendu global ----------
  function render() {
    els.text.innerHTML = TEXTS[step];

    var anyBad = false;
    SUBS.forEach(function (s, i) {
      var inp = inputs[i];
      if (!inp) return;
      var visible = step >= s.boxStep;
      inp.style.display = visible ? '' : 'none';
      if (!visible) return;
      if (inp.value !== raw[i]) inp.value = raw[i];
      var locked = done || step > s.boxStep;
      var bad = !locked && raw[i] !== '' && parseInt(raw[i], 10) !== s.expected;
      if (bad) anyBad = true;
      inp.readOnly = locked;
      inp.classList.toggle('bal-coef--ok', locked);
      inp.classList.toggle('bal-coef--bad', bad);
    });

    syncMolecules();
    renderChips();

    els.prev.style.display = (!done && step > 1) ? '' : 'none';
    els.next.style.display = done ? 'none' : '';
    els.next.textContent = step === 3 ? 'Valider' : 'Suivant';
    els.next.disabled = !canAdvance();
    els.redo.style.display = done ? '' : 'none';
    els.menu.style.display = done ? '' : 'none';

    if (done) {
      els.feedback.textContent = SUCCESS;
      els.feedback.className = 'ex-feedback success';
    } else if (anyBad) {
      els.feedback.textContent = HINT;
      els.feedback.className = 'ex-feedback error';
    } else {
      els.feedback.textContent = '';
      els.feedback.className = 'ex-feedback';
    }
  }

  function confetti() {
    var canvas = document.getElementById('confetti-canvas');
    if (!window.Confetti || !canvas) return;
    try {
      var r = els.next.getBoundingClientRect();
      window.Confetti.burst(canvas, r.left + r.width / 2, r.top + r.height / 2);
    } catch (e) { /* purement décoratif */ }
  }

  function onNext() {
    if (!canAdvance()) return;
    if (step < 3) {
      step++;
    } else {
      done = true;
      confetti();
    }
    render();
  }

  function onPrev() {
    if (step > 1 && !done) { step--; render(); }
  }

  // Appelé à chaque entrée dans l'écran (il est alors visible, donc mesurable).
  function start() {
    if (!built) build();
    step = 1;
    done = false;
    raw = ['', '', ''];
    render();
  }

  function init() {
    els.text = document.getElementById('bal-text');
    els.row = document.getElementById('bal-row');
    els.chips = document.getElementById('bal-chips');
    els.equation = document.getElementById('bal-equation');
    els.feedback = document.getElementById('bal-feedback');
    els.prev = document.getElementById('btn-bal-prev');
    els.next = document.getElementById('btn-bal-next');
    els.redo = document.getElementById('btn-bal-redo');
    els.menu = document.getElementById('btn-bal-menu');
    if (!els.text || !els.row) return;

    els.next.addEventListener('click', onNext);
    els.prev.addEventListener('click', onPrev);
    els.redo.addEventListener('click', start);
    els.menu.addEventListener('click', function () { window.App.showScreen('screen-mode1'); });
    window.addEventListener('resize', layoutAll);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { start: start };
})();
