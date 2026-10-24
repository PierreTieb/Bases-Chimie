// expert-app.js
// Question d'équation du Challenge (une à la fois) :
//   'write'   : écrire l'équation qui décrit la transformation (formules)
//   'balance' : équilibrer une équation donnée (coefficients)
//   'mix'     : écrire l'équation ET l'équilibrer (formules + coefficients)
// Le Challenge reçoit les résultats par ses crochets : onFail() à chaque validation fausse,
// onSolved() quand toutes les cases sont vertes.
window.Expert = (function () {
  'use strict';

  var QUESTIONS = {
    write:   { instruction: "Écris l'équation qui décrit cette transformation",
      phrase: true,  scene: false, formulas: true,  coefs: false, success: "Bravo, l'équation est correcte !" },
    balance: { instruction: "Équilibre correctement cette équation chimique",
      phrase: false, scene: true,  formulas: false, coefs: true,  success: "Bravo, l'équation est équilibrée !" },
    mix:     { instruction: "Écris l'équation chimique de cette transformation ET équilibre-la correctement.",
      phrase: true,  scene: true,  formulas: true,  coefs: true,  success: "Bravo, l'équation est écrite et équilibrée !" }
  };

  var els = {};
  var scene = null;
  var run = null;      // { key, hooks, sigs }
  var cur = null;      // { reaction, subs, solved }
  var coefInputs = [];
  var formulaInputs = [];

  // ---------- Outils ----------
  function parse(f) { return f ? window.Molecules.parseFormulaInput(f) : null; }
  function cfg() { return QUESTIONS[run.key]; }
  function coefValue(i) {
    var inp = coefInputs[i];
    return (!inp || inp.value === '') ? 1 : parseInt(inp.value, 10);
  }
  function setFeedback(text, cls) {
    els.feedback.textContent = text;
    els.feedback.className = 'ex-feedback' + (cls ? ' ' + cls : '');
  }

  // ---------- Tirage de la transformation ----------
  function pickReaction() {
    var E = window.Equations, key = run.key, r;
    if (key === 'write') r = E.getRandomReaction('expert-1', run.sigs);
    else if (key === 'balance') r = E.getRandomBalance('expert-2', run.sigs);
    else r = E.getRandomSolvedReaction('expert-3', run.sigs);
    run.sigs.push(window.Equations.sigOf(r.substances));
    cur = {
      reaction: r,
      solved: false,
      subs: r.substances.map(function (s) {
        return { formula: s.formula, type: s.type, coef: s.coef || 1, counts: parse(s.formula) };
      })
    };
  }

  // ---------- Construction de l'écran d'une question ----------
  function equationHTML(c) {
    function term(i) {
      var s = cur.subs[i];
      var coef = c.coefs
        ? '<input type="text" class="eq-coef" data-idx="' + i + '" inputmode="numeric" autocomplete="off" aria-label="Coefficient">' : '';
      var body = c.formulas
        ? '<input type="text" class="eq-blank" data-idx="' + i + '" autocomplete="off" autocapitalize="off" ' +
          'autocorrect="off" spellcheck="false" aria-label="Formule">'
        : '<span class="eq-static">' + window.Molecules.formatSubscripts(s.formula) + '</span>';
      return '<span class="eq-term">' + coef + body + '</span>';
    }
    function side(type) {
      var idx = [];
      cur.subs.forEach(function (s, i) { if (s.type === type) idx.push(i); });
      return idx.map(function (i, k) { return (k > 0 ? '<span class="eq-plus">+</span>' : '') + term(i); }).join('');
    }
    return '<div class="eq-inner"><div class="eq-side">' + side('reactif') + '</div>' +
      '<span class="eq-arrow">&rarr;</span><div class="eq-side">' + side('produit') + '</div></div>';
  }

  function buildQuestion() {
    var c = cfg();
    els.instruction.textContent = c.instruction;
    setFeedback('', '');

    els.phrase.style.display = c.phrase ? '' : 'none';
    if (c.phrase) window.EqUI.renderPhrase(els.phrase, cur.reaction, { interactive: false });

    els.scene.style.display = c.scene ? '' : 'none';
    els.equation.innerHTML = equationHTML(c);
    coefInputs = [];
    formulaInputs = [];
    cur.subs.forEach(function (s, i) {
      coefInputs[i] = els.equation.querySelector('.eq-coef[data-idx="' + i + '"]');
      formulaInputs[i] = els.equation.querySelector('.eq-blank[data-idx="' + i + '"]');
    });

    if (c.scene) {                                  // l'écran est visible : la scène peut se mesurer
      scene.setSlots(cur.subs.map(function (s) { return s.type; }));
      cur.subs.forEach(function (s, i) { updateSlot(i); });
    }

    // Le catalogue : sous l'équation pour écrire, dans le coin de la scène pour écrire et équilibrer.
    if (run.key === 'write') { els.catQ1.appendChild(els.catBtn); els.catBtn.style.display = ''; }
    else if (run.key === 'mix') { els.sceneFoot.appendChild(els.catBtn); els.catBtn.style.display = ''; }
    else { els.catBtn.style.display = 'none'; }
    els.catQ1.style.display = run.key === 'write' ? '' : 'none';

    els.validateBtn.style.display = '';
    els.validateBtn.disabled = false;

    window.EqUI.fitEquation(els.equation);
    if (c.scene) scene.layout();
  }

  // Met à jour la zone i du schéma d'après ce qui est écrit dans l'équation.
  function updateSlot(i) {
    var c = cfg();
    if (!c.scene) return;
    var counts;
    if (c.formulas) {
      counts = parse(formulaInputs[i].value);
      // Pas dans la banque du bac à sable : rien n'apparaît.
      if (counts && window.Molecules.lookupName(counts) === undefined) counts = null;
    } else {
      counts = cur.subs[i].counts;
    }
    scene.setSlot(i, counts, coefValue(i));
  }

  // ---------- Saisie ----------
  function onInput(e) {
    var t = e.target;
    if (!t.classList || !cur || cur.solved) return;
    var i = parseInt(t.getAttribute('data-idx'), 10);
    if (isNaN(i)) return;
    if (t.classList.contains('eq-coef')) {
      t.value = t.value.replace(/[^1-9]/g, '').slice(-1);       // un chiffre de 1 à 9 (0 refusé), vide = 1
      t.classList.remove('eq-coef--ok', 'eq-coef--bad');
      updateSlot(i);
    } else if (t.classList.contains('eq-blank')) {
      t.classList.remove('eq-blank--ok', 'eq-blank--bad');
      updateSlot(i);
    }
  }

  // ---------- Validation ----------
  // Pour chaque zone de formule : l'indice de la substance attendue qu'elle décrit (dans le même
  // camp, ordre libre), ou -1.
  function matchFormulas() {
    var match = {};
    ['reactif', 'produit'].forEach(function (type) {
      var claimed = {};
      cur.subs.forEach(function (s, i) {
        if (s.type !== type) return;
        var got = parse(formulaInputs[i].value), m = -1;
        if (got) {
          cur.subs.forEach(function (e, j) {
            if (m === -1 && e.type === type && !claimed[j] && window.EqUI.countsEqual(got, e.counts)) m = j;
          });
        }
        if (m !== -1) claimed[m] = true;
        match[i] = m;
      });
    });
    return match;
  }

  function isBalanced(countsOf) {
    var left = {}, right = {}, order = [];
    for (var i = 0; i < cur.subs.length; i++) {
      var cn = countsOf(i);
      if (!cn) return false;
      var side = cur.subs[i].type === 'reactif' ? left : right;
      Object.keys(cn).forEach(function (k) {
        if (order.indexOf(k) < 0) order.push(k);
        side[k] = (side[k] || 0) + cn[k] * coefValue(i);
      });
    }
    return order.every(function (k) { return (left[k] || 0) === (right[k] || 0); });
  }

  function onValidate() {
    if (!cur || cur.solved) return;
    var c = cfg();
    var match = c.formulas ? matchFormulas() : null;
    var allGreen = true, formulasOk = true;

    cur.subs.forEach(function (s, i) {
      if (c.formulas) {
        var okF = match[i] !== -1;
        formulaInputs[i].classList.remove('eq-blank--ok', 'eq-blank--bad');
        formulaInputs[i].classList.add(okF ? 'eq-blank--ok' : 'eq-blank--bad');
        if (!okF) { allGreen = false; formulasOk = false; }
      }
      if (c.coefs) {
        // Coefficient attendu : celui de la substance reconnue (écrire et équilibrer) ou de la zone (équilibrer).
        // Formule non reconnue : le coefficient ne peut pas être jugé, il reste neutre.
        var expected = c.formulas ? (match[i] !== -1 ? cur.subs[match[i]].coef : null) : s.coef;
        coefInputs[i].classList.remove('eq-coef--ok', 'eq-coef--bad');
        if (expected === null) {
          allGreen = false;
        } else {
          var okC = coefValue(i) === expected;
          coefInputs[i].classList.add(okC ? 'eq-coef--ok' : 'eq-coef--bad');
          if (!okC) allGreen = false;
        }
      }
    });

    if (allGreen) {
      onSolved();
      return;
    }
    var balanced = c.coefs && formulasOk && isBalanced(function (i) {
      return c.formulas ? cur.subs[match[i]].counts : cur.subs[i].counts;
    });
    if (balanced) {
      setFeedback("Les atomes sont bien équilibrés, mais utilise les plus petits coefficients possibles.", 'error');
    } else {
      setFeedback("Certaines cases sont en rouge : corrige-les et revalide.", 'error');
    }
    if (run.hooks.onFail) run.hooks.onFail();
  }

  function onSolved() {
    cur.solved = true;
    els.equation.querySelectorAll('input').forEach(function (inp) { inp.readOnly = true; });
    setFeedback(cfg().success, 'success');
    window.EqUI.confetti(els.validateBtn);
    els.validateBtn.style.display = 'none';
    if (run.hooks.onSolved) run.hooks.onSolved();
  }

  // ---------- Démarrage ----------
  // Appelé une fois l'écran visible (la scène doit pouvoir se mesurer).
  // sigs : équations déjà tirées pendant la partie, pour éviter les répétitions.
  function startOne(key, hooks, sigs) {
    run = { key: key, hooks: hooks || {}, sigs: sigs || [] };
    document.getElementById('exp-catalog-overlay').style.display = 'none';   // resté ouvert à la question précédente
    pickReaction();
    buildQuestion();
  }

  function init() {
    var $ = function (id) { return document.getElementById(id); };
    els.instruction = $('exp-instruction');
    els.phrase = $('exp-phrase');
    els.scene = $('exp-scene');
    els.sceneFoot = $('exp-scene-foot');
    els.equation = $('exp-equation');
    els.catQ1 = $('exp-cat-q1');
    els.catBtn = $('btn-exp-catalog');
    els.feedback = $('exp-feedback');
    els.validateBtn = $('btn-exp-validate');
    if (!els.equation) return;

    scene = window.BalanceScene.create($('exp-row'));
    window.EqUI.setupEquation(els.equation);        // indices automatiques + une seule ligne
    els.equation.addEventListener('input', onInput); // après setupEquation : les indices sont déjà posés
    window.EqUI.setupCatalog('exp');

    els.validateBtn.addEventListener('click', onValidate);
    window.addEventListener('resize', function () {
      if (!run || !cur) return;
      window.EqUI.fitEquation(els.equation);
      if (cfg().scene) scene.layout();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { startOne: startOne };
})();
