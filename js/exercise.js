window.Exercise = (function () {
  'use strict';

  var els = {};
  var previewBuilder = null;
  var buildSandbox = null;
  var current = null;
  var solved = false;
  var revealing = false;
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

  function expandCountsByValenceDesc(counts) {
    var symbols = Object.keys(counts);
    symbols.sort(function (a, b) { return window.Units.getValence(b) - window.Units.getValence(a); });
    var flat = [];
    symbols.forEach(function (s) { for (var i = 0; i < counts[s]; i++) flat.push(s); });
    return flat;
  }

  function renderIdentifyPreview(counts) {
    previewBuilder.clearAll();
    expandCountsByValenceDesc(counts).forEach(function (sym) {
      previewBuilder.addSymbol(sym);
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

  function setButtonsEnabled(enabled) {
    els.validateBtn.disabled = !enabled;
    els.skipBtn.disabled = !enabled;
  }

  function showQuestion() {
    solved = false;
    revealing = false;
    current = pickQuestion();
    resetFeedback();
    setButtonsEnabled(true);
    els.skipBtn.textContent = 'Molécule suivante';

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
    } catch (e) { /* purement décoratif */ }
  }

  function currentAnswerCounts() {
    if (current.type === 'identify') {
      return window.Molecules.parseFormulaInput(els.formulaInput.value);
    }
    return buildSandbox.getCounts();
  }

  function onValidate() {
    if (!current || solved || revealing) return;

    var answer = currentAnswerCounts();
    var correct = !!answer && countsEqual(answer, current.counts);

    if (correct) {
      solved = true;
      score.correct++;
      score.total++;
      updateScoreDisplay();
      els.feedback.textContent = 'Bravo, bonne réponse !';
      els.feedback.className = 'ex-feedback success';
      triggerConfetti();
      els.validateBtn.disabled = true;
      if (current.type === 'identify') els.formulaInput.disabled = true;
      els.skipBtn.textContent = 'Molécule suivante';
    } else {
      // Pas de réponse révélée, pas de blocage : on peut réessayer librement.
      els.feedback.textContent = "Ce n'est pas la bonne formule, réessaie.";
      els.feedback.className = 'ex-feedback error';
    }
  }

  function onSkip() {
    if (!current || revealing) return;

    if (solved) {
      showQuestion();
      return;
    }

    // On "passe" sans avoir trouvé : la réponse est révélée quelques secondes,
    // puis la question suivante démarre automatiquement.
    revealing = true;
    score.total++;
    updateScoreDisplay();
    setButtonsEnabled(false);
    if (current.type === 'identify') els.formulaInput.disabled = true;
    els.feedback.textContent = 'La formule était : ' + current.formula;
    els.feedback.className = 'ex-feedback reveal';

    setTimeout(function () { showQuestion(); }, 2500);
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
    els.skipBtn = document.getElementById('btn-ex-skip');
    els.confettiCanvas = document.getElementById('confetti-canvas');

    if (!els.identifyPanel || !els.buildPanel || !els.previewZone) return;

    previewBuilder = window.MoleculeBuilder.create(els.previewZone);
    buildSandbox = window.Sandbox.create({
      panelEl: document.getElementById('atoms-panel-ex'),
      dropZoneEl: document.getElementById('drop-zone-ex'),
      clearBtnEl: document.getElementById('btn-clear-ex'),
      formulaEl: null,
      nameEl: null
    });

    els.formulaInput.addEventListener('input', onFormulaInput);
    els.validateBtn.addEventListener('click', onValidate);
    els.skipBtn.addEventListener('click', onSkip);

    updateScoreDisplay();
    showQuestion();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    showQuestion: showQuestion,
    getScore: function () { return { correct: score.correct, total: score.total }; }
  };
})();
