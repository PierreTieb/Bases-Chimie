window.Exercise = (function () {
  'use strict';

  var els = {};
  var previewBuilder = null;
  var buildSandbox = null;
  var current = null;
  var answered = false;
  var score = { correct: 0, total: 0 };

  function countsEqual(a, b) {
    var ak = Object.keys(a).filter(function (k) { return a[k] > 0; });
    var bk = Object.keys(b).filter(function (k) { return b[k] > 0; });
    if (ak.length !== bk.length) return false;
    for (var i = 0; i < ak.length; i++) {
      var k = ak[i];
      if (a[k] !== b[k]) return false;
    }
    return true;
  }

  // Place les atomes en commençant par les plus "centraux" (grande valence),
  // pour un aperçu visuel cohérent (ex: les H s'agglomèrent autour du C).
  function expandCountsByValenceDesc(counts) {
    var symbols = Object.keys(counts);
    symbols.sort(function (a, b) {
      return window.Units.getValence(b) - window.Units.getValence(a);
    });
    var flat = [];
    symbols.forEach(function (s) {
      for (var i = 0; i < counts[s]; i++) flat.push(s);
    });
    return flat;
  }

  function renderIdentifyPreview(counts) {
    previewBuilder.clearAll();
    expandCountsByValenceDesc(counts).forEach(function (sym) {
      previewBuilder.placeAtomAuto(window.Units.getBySymbol(sym));
    });
  }

  function pickQuestion() {
    var pool = window.Molecules.getAllKnown();
    var entry = window.Generator.pickRandom(pool);
    var type = window.Generator.pickRandom(['identify', 'build']);
    return { type: type, name: entry.name, counts: entry.counts, formula: entry.formula };
  }

  function resetFeedback() {
    els.feedback.textContent = '';
    els.feedback.className = 'ex-feedback';
  }

  function showQuestion() {
    answered = false;
    current = pickQuestion();
    resetFeedback();
    els.nextBtn.style.display = 'none';
    els.validateBtn.style.display = 'inline-block';
    els.validateBtn.disabled = false;

    if (current.type === 'identify') {
      els.identifyPanel.style.display = '';
      els.buildPanel.style.display = 'none';
      renderIdentifyPreview(current.counts);
      els.formulaInput.value = '';
      els.formulaPreview.textContent = '';
      els.formulaInput.disabled = false;
    } else {
      els.identifyPanel.style.display = 'none';
      els.buildPanel.style.display = '';
      els.targetFormula.textContent = current.formula;
      buildSandbox.clearAll();
    }
  }

  function updateScoreDisplay() {
    els.score.textContent = 'Score : ' + score.correct + ' / ' + score.total;
  }

  function triggerConfetti() {
    if (!window.Confetti || !els.confettiCanvas) return;
    try {
      var rect = els.validateBtn.getBoundingClientRect();
      window.Confetti.burst(els.confettiCanvas, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } catch (e) {
      // Purement décoratif : une erreur ici ne doit jamais bloquer l'exercice.
    }
  }

  function onValidate() {
    if (answered || !current) return;
    answered = true;

    var correct;
    if (current.type === 'identify') {
      var parsed = window.Molecules.parseFormulaInput(els.formulaInput.value);
      correct = !!parsed && countsEqual(parsed, current.counts);
      els.formulaInput.disabled = true;
    } else {
      correct = countsEqual(buildSandbox.getCounts(), current.counts);
    }

    score.total++;
    els.validateBtn.disabled = true;

    if (correct) {
      score.correct++;
      els.feedback.textContent = 'Bravo, bonne réponse !';
      els.feedback.className = 'ex-feedback success';
      triggerConfetti();
    } else {
      els.feedback.textContent = "Ce n'est pas la bonne formule (réponse : " + current.formula + ').';
      els.feedback.className = 'ex-feedback error';
    }

    updateScoreDisplay();
    els.nextBtn.style.display = 'inline-block';
  }

  function onFormulaInput() {
    els.formulaPreview.textContent = window.Molecules.formatSubscripts(els.formulaInput.value);
  }

  function init() {
    els.identifyPanel = document.getElementById('ex-identify-panel');
    els.buildPanel = document.getElementById('ex-build-panel');
    els.previewZone = document.getElementById('ex-preview-zone');
    els.formulaInput = document.getElementById('ex-formula-input');
    els.formulaPreview = document.getElementById('ex-formula-preview');
    els.targetFormula = document.getElementById('ex-target-formula');
    els.feedback = document.getElementById('ex-feedback');
    els.score = document.getElementById('ex-score');
    els.validateBtn = document.getElementById('btn-ex-validate');
    els.nextBtn = document.getElementById('btn-ex-next');
    els.confettiCanvas = document.getElementById('confetti-canvas');

    if (!els.identifyPanel || !els.buildPanel || !els.previewZone) return;

    previewBuilder = window.MoleculeBuilder.create(els.previewZone);
    buildSandbox = window.Sandbox.create({
      panelEl: document.getElementById('atoms-panel-ex'),
      dropZoneEl: document.getElementById('drop-zone-ex'),
      clearBtnEl: document.getElementById('btn-clear-ex'),
      formulaEl: document.getElementById('formula-brute-ex'),
      nameEl: null
    });

    els.formulaInput.addEventListener('input', onFormulaInput);
    els.validateBtn.addEventListener('click', onValidate);
    els.nextBtn.addEventListener('click', showQuestion);

    updateScoreDisplay();
    showQuestion();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    showQuestion: showQuestion,
    getScore: function () { return { correct: score.correct, total: score.total }; }
  };
})();
