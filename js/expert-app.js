// expert-app.js
// Mode Expert (niveau 3) : 3 questions enchaînées, puis un récapitulatif (note /100 + chrono).
//   Q1 : écrire l'équation qui décrit la transformation (formules)
//   Q2 : équilibrer une équation donnée (coefficients)
//   Q3 : écrire l'équation ET l'équilibrer (formules + coefficients)
// Pas de "résoudre et passer" : après un échec on peut seulement demander une NOUVELLE
// transformation du même type. Il faut réussir les 3 questions pour voir le score.
//
// Note : X = nombre de cases à remplir dans les 3 transformations finalement réussies.
//   note = 100 - 50 * (cases rouges apparues) / X, arrondie à l'entier supérieur, bornée à [0, 100].
window.Expert = (function () {
  'use strict';

  var PENALTY = 50;   // points retirés pour une case rouge = PENALTY / X

  var QUESTIONS = [
    { key: 'write',   instruction: "Écrire l'équation qui décrit cette transformation",
      phrase: true,  scene: false, formulas: true,  coefs: false, success: "Bravo, l'équation est correcte !" },
    { key: 'balance', instruction: "Équilibre correctement cette équation chimique",
      phrase: false, scene: true,  formulas: false, coefs: true,  success: "Bravo, l'équation est équilibrée !" },
    { key: 'mix',     instruction: "Écris l'équation chimique de cette transformation ET équilibre-la correctement.",
      phrase: true,  scene: true,  formulas: true,  coefs: true,  success: "Bravo, l'équation est écrite et équilibrée !" }
  ];

  var MESSAGES = [
    { min: 100, text: "Excellent, tu maîtrises les équations chimiques !", color: '#7B3FE4', trophy: true },
    { min: 80,  text: "C'est un très bon score, réessaye et bats ton record !", color: '#1F7A3D' },
    { min: 50,  text: "C'est bien, vérifie bien tes propositions, compte bien les atomes de chaque côté la prochaine fois !", color: '#6BAA2A' },
    { min: 25,  text: "C'est pas mal, continue de t'entraîner pour améliorer ce score.", color: '#E9822B' },
    { min: 0,   text: "Tu es arrivé(e) au bout, réessaye une fois pour progresser, ou retourne voir le tuto pour comprendre tes erreurs.", color: '#E8766D', tuto: true }
  ];

  var els = {};
  var scene = null;
  var run = null;      // { q, t0, t1, X, reds, sigs }
  var cur = null;      // { reaction, subs, solved, failed }
  var coefInputs = [];
  var formulaInputs = [];

  // ---------- Outils ----------
  function parse(f) { return f ? window.Molecules.parseFormulaInput(f) : null; }
  function cfg() { return QUESTIONS[run.q]; }
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
    var E = window.Equations, key = cfg().key, r;
    if (key === 'write') r = E.getRandomReaction('expert-1', run.sigs);
    else if (key === 'balance') r = E.getRandomBalance('expert-2', run.sigs);
    else r = E.getRandomSolvedReaction('expert-3', run.sigs);
    cur = {
      reaction: r,
      solved: false,
      failed: false,
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
    els.progress.textContent = 'Question ' + (run.q + 1) + ' / ' + QUESTIONS.length;
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

    // Le catalogue : sous l'équation (Q1), dans le coin de la scène (Q3), absent en Q2.
    if (c.key === 'write') { els.catQ1.appendChild(els.catBtn); els.catBtn.style.display = ''; }
    else if (c.key === 'mix') { els.sceneFoot.appendChild(els.catBtn); els.catBtn.style.display = ''; }
    else { els.catBtn.style.display = 'none'; }
    els.catQ1.style.display = c.key === 'write' ? '' : 'none';

    els.validateBtn.style.display = '';
    els.validateBtn.disabled = false;
    els.newBtn.style.display = 'none';
    els.nextBtn.style.display = 'none';

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
    if (!t.classList || cur.solved) return;
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
    if (cur.solved) return;
    var c = cfg();
    var match = c.formulas ? matchFormulas() : null;
    var reds = 0, allGreen = true, formulasOk = true;

    cur.subs.forEach(function (s, i) {
      if (c.formulas) {
        var okF = match[i] !== -1;
        formulaInputs[i].classList.remove('eq-blank--ok', 'eq-blank--bad');
        formulaInputs[i].classList.add(okF ? 'eq-blank--ok' : 'eq-blank--bad');
        if (!okF) { reds++; allGreen = false; formulasOk = false; }
      }
      if (c.coefs) {
        // Coefficient attendu : celui de la substance reconnue (Q3) ou de la zone (Q2).
        // Formule non reconnue : le coefficient ne peut pas être jugé, il reste neutre.
        var expected = c.formulas ? (match[i] !== -1 ? cur.subs[match[i]].coef : null) : s.coef;
        coefInputs[i].classList.remove('eq-coef--ok', 'eq-coef--bad');
        if (expected === null) {
          allGreen = false;
        } else {
          var okC = coefValue(i) === expected;
          coefInputs[i].classList.add(okC ? 'eq-coef--ok' : 'eq-coef--bad');
          if (!okC) { reds++; allGreen = false; }
        }
      }
    });
    run.reds += reds;

    if (allGreen) {
      onSolved();
      return;
    }
    cur.failed = true;
    els.newBtn.style.display = 'inline-block';
    var balanced = c.coefs && formulasOk && isBalanced(function (i) {
      return c.formulas ? cur.subs[match[i]].counts : cur.subs[i].counts;
    });
    if (balanced) {
      setFeedback("Les atomes sont bien équilibrés, mais utilise les plus petits coefficients possibles.", 'error');
    } else {
      setFeedback("Certaines cases sont en rouge : corrige-les et revalide, ou demande une nouvelle transformation.", 'error');
    }
  }

  function onSolved() {
    var c = cfg();
    cur.solved = true;
    run.X += cur.subs.length * ((c.formulas ? 1 : 0) + (c.coefs ? 1 : 0));
    run.sigs.push(window.Equations.sigOf(cur.reaction.substances));
    els.equation.querySelectorAll('input').forEach(function (inp) { inp.readOnly = true; });
    setFeedback(c.success, 'success');
    window.EqUI.confetti(els.validateBtn);
    els.validateBtn.style.display = 'none';
    els.newBtn.style.display = 'none';
    var last = run.q === QUESTIONS.length - 1;
    if (last) run.t1 = Date.now();                  // le chrono s'arrête à la dernière bonne réponse
    els.nextBtn.textContent = last ? 'Voir mon score' : 'Question suivante';
    els.nextBtn.style.display = 'inline-block';
  }

  function onNew() {
    if (cur.solved) return;
    pickReaction();
    buildQuestion();
  }

  function onNext() {
    if (!cur.solved) return;
    if (run.q < QUESTIONS.length - 1) {
      run.q++;
      pickReaction();
      buildQuestion();
    } else {
      showRecap();
    }
  }

  // ---------- Récapitulatif ----------
  function formatTime(ms) {
    var secs = Math.round(ms / 1000), m = Math.floor(secs / 60), s = secs % 60;
    return m > 0 ? m + ' min ' + (s < 10 ? '0' : '') + s + ' s' : s + ' s';
  }

  function computeScore() {
    var raw = 100 - PENALTY * run.reds / run.X;
    return Math.max(0, Math.min(100, Math.ceil(raw - 1e-9)));   // toujours à l'entier supérieur
  }

  function showRecap() {
    var score = computeScore();
    var msg = MESSAGES.filter(function (m) { return score >= m.min; })[0];

    els.run.style.display = 'none';
    els.progress.style.display = 'none';
    els.instruction.style.display = 'none';
    els.recap.style.display = '';

    els.trophy.style.display = msg.trophy ? '' : 'none';
    els.final.textContent = score + ' / 100';
    els.time.textContent = '\u23F1 ' + formatTime(run.t1 - run.t0);
    els.message.textContent = msg.text;
    els.message.style.color = msg.color;
    els.tutoBtn.style.display = msg.tuto ? '' : 'none';
    if (msg.trophy) window.EqUI.confetti(els.final);
  }

  // ---------- Démarrage ----------
  // Appelé à chaque entrée dans l'écran (il est alors visible, donc mesurable).
  function start() {
    run = { q: 0, t0: Date.now(), t1: null, X: 0, reds: 0, sigs: [] };
    els.recap.style.display = 'none';
    els.run.style.display = '';
    els.progress.style.display = '';
    els.instruction.style.display = '';
    pickReaction();
    buildQuestion();
  }

  function init() {
    var $ = function (id) { return document.getElementById(id); };
    els.progress = $('exp-progress');
    els.instruction = $('exp-instruction');
    els.run = $('exp-run');
    els.phrase = $('exp-phrase');
    els.scene = $('exp-scene');
    els.sceneFoot = $('exp-scene-foot');
    els.equation = $('exp-equation');
    els.catQ1 = $('exp-cat-q1');
    els.catBtn = $('btn-exp-catalog');
    els.feedback = $('exp-feedback');
    els.validateBtn = $('btn-exp-validate');
    els.newBtn = $('btn-exp-new');
    els.nextBtn = $('btn-exp-next');
    els.recap = $('exp-recap');
    els.trophy = $('exp-trophy');
    els.final = $('exp-final');
    els.time = $('exp-time');
    els.message = $('exp-message');
    els.tutoBtn = $('btn-exp-tuto');
    if (!els.run || !els.equation) return;

    scene = window.BalanceScene.create($('exp-row'));
    window.EqUI.setupEquation(els.equation);        // indices automatiques + une seule ligne
    els.equation.addEventListener('input', onInput); // après setupEquation : les indices sont déjà posés
    window.EqUI.setupCatalog('exp');

    els.validateBtn.addEventListener('click', onValidate);
    els.newBtn.addEventListener('click', onNew);
    els.nextBtn.addEventListener('click', onNext);
    $('btn-exp-replay').addEventListener('click', start);
    $('btn-exp-menu').addEventListener('click', function () { window.App.showScreen('screen-eq-practice'); });
    els.tutoBtn.addEventListener('click', function () {
      window.App.showScreen('screen-balance');
      if (window.Balance) window.Balance.start();
    });
    window.addEventListener('resize', function () {
      if (!run || !cur) return;
      window.EqUI.fitEquation(els.equation);
      if (scene) scene.layout();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { start: start };
})();
