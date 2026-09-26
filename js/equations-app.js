(function () {
  'use strict';

  function countsEqual(a, b) {
    if (!a || !b) return false;
    var ak = Object.keys(a).filter(function (k) { return a[k] > 0; });
    var bk = Object.keys(b).filter(function (k) { return b[k] > 0; });
    if (ak.length !== bk.length) return false;
    for (var i = 0; i < ak.length; i++) {
      if (a[ak[i]] !== b[ak[i]]) return false;
    }
    return true;
  }

  function triggerConfettiFromButton(btn) {
    var canvas = document.getElementById('confetti-canvas');
    if (!window.Confetti || !canvas || !btn) return;
    try {
      var rect = btn.getBoundingClientRect();
      window.Confetti.burst(canvas, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } catch (e) { /* purement décoratif */ }
  }

  // Rend la phrase d'une réaction, avec des segments cliquables (mode "cours")
  // ou du texte simple (mode "exercice").
  function renderPhrase(containerEl, reaction, state) {
    var html = reaction.template.replace(/\{(\d+)\}/g, function (_, idxStr) {
      var idx = parseInt(idxStr, 10);
      var sub = reaction.substances[idx];
      var classes = ['eq-token'];
      var clickable = false;

      if (state.interactive) {
        if (state.selected.reactif.has(idx)) {
          classes.push('eq-token--selected-reactif');
        } else if (state.selected.produit.has(idx)) {
          classes.push('eq-token--selected-produit');
        } else if (state.currentType && sub.type === state.currentType) {
          classes.push('eq-token--clickable');
          clickable = true;
        } else if (state.currentType) {
          classes.push('eq-token--dim');
        }
      }
      return '<span class="' + classes.join(' ') + '" data-idx="' + idx + '">' + sub.label + '</span>';
    });
    containerEl.innerHTML = html;

    if (state.interactive && state.onClick) {
      var spans = containerEl.querySelectorAll('.eq-token--clickable');
      for (var i = 0; i < spans.length; i++) {
        spans[i].addEventListener('click', (function (span) {
          return function () { state.onClick(parseInt(span.getAttribute('data-idx'), 10)); };
        })(spans[i]));
      }
    }
  }

  function buildEquationHTML(substances) {
    function side(type) {
      var group = [];
      substances.forEach(function (s, i) { if (s.type === type) group.push(i); });
      return group.map(function (idx, k) {
        var plus = k > 0 ? '<span class="eq-plus">+</span>' : '';
        return plus + '<input type="text" class="eq-blank" data-idx="' + idx + '" autocomplete="off" ' +
          'autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="formule">';
      }).join('');
    }
    return '<div class="eq-side">' + side('reactif') + '</div>' +
      '<span class="eq-arrow">&rarr;</span>' +
      '<div class="eq-side">' + side('produit') + '</div>';
  }

  function setupCatalog(prefix) {
    var openBtn = document.getElementById('btn-' + prefix + '-catalog');
    var overlay = document.getElementById(prefix + '-catalog-overlay');
    var closeBtn = document.getElementById('btn-' + prefix + '-catalog-close');
    var searchInput = document.getElementById(prefix + '-catalog-search');
    var listEl = document.getElementById(prefix + '-catalog-list');
    if (!openBtn || !overlay) return;

    function renderList(filter) {
      var f = (filter || '').toLowerCase();
      var items = window.Equations.getCatalog().filter(function (c) {
        return !f || c.name.toLowerCase().indexOf(f) !== -1 || c.formula.toLowerCase().indexOf(f) !== -1;
      }).sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); });

      listEl.innerHTML = items.map(function (c) {
        return '<div class="eq-catalog-item"><span class="eq-catalog-name">' + c.name + '</span>' +
          '<span class="eq-catalog-formula">' + window.Molecules.formatSubscripts(c.formula) + '</span></div>';
      }).join('') || '<p class="eq-catalog-empty">Aucun résultat.</p>';
    }

    openBtn.addEventListener('click', function () {
      overlay.style.display = 'flex';
      searchInput.value = '';
      renderList('');
    });
    closeBtn.addEventListener('click', function () { overlay.style.display = 'none'; });
    searchInput.addEventListener('input', function () { renderList(searchInput.value); });
  }

  // ============================================================
  // Mode "Cours" : Décrire une transformation chimique
  // ============================================================
  window.EquationsCours = (function () {
    var els = {};
    var reaction = null;
    var step = 1; // 1 = réactifs, 2 = produits, 3 = formules
    var selected = null;

    function typeCount(type) {
      return reaction.substances.filter(function (s) { return s.type === type; }).length;
    }

    function render() {
      if (step === 1) {
        els.instruction.textContent = "Les réactifs sont les substances qui seront mélangées pour réaliser la transformation. Clique sur le ou les réactifs dans le texte.";
      } else if (step === 2) {
        els.instruction.textContent = "Les produits sont les substances obtenues à la fin de la transformation. Clique sur le ou les produits dans le texte.";
      } else {
        els.instruction.textContent = "Écris la formule brute de chaque composé sélectionné : les réactifs avant la flèche, les produits après.";
      }
      renderPhrase(els.phrase, reaction, {
        interactive: true,
        currentType: step === 1 ? 'reactif' : (step === 2 ? 'produit' : null),
        selected: selected,
        onClick: onTokenClick
      });
    }

    function onTokenClick(idx) {
      var type = step === 1 ? 'reactif' : 'produit';
      if (reaction.substances[idx].type !== type) return;
      selected[type].add(idx);
      render();
      if (selected[type].size === typeCount(type)) {
        els.nextStepBtn.style.display = 'inline-block';
      }
    }

    function onNextStep() {
      els.nextStepBtn.style.display = 'none';
      if (step === 1) {
        step = 2;
        render();
      } else if (step === 2) {
        step = 3;
        render();
        els.equation.style.display = '';
        els.equation.innerHTML = buildEquationHTML(reaction.substances);
        els.validateBtn.style.display = 'inline-block';
      }
    }

    function onValidateFormulas() {
      var inputs = els.equation.querySelectorAll('.eq-blank');
      var allOk = true;
      inputs.forEach(function (inp) {
        var idx = parseInt(inp.getAttribute('data-idx'), 10);
        var expected = window.Molecules.parseFormulaInput(reaction.substances[idx].formula);
        var got = window.Molecules.parseFormulaInput(inp.value);
        var ok = countsEqual(got, expected);
        inp.classList.remove('eq-blank--ok', 'eq-blank--bad');
        inp.classList.add(ok ? 'eq-blank--ok' : 'eq-blank--bad');
        if (!ok) allOk = false;
      });
      if (allOk) {
        els.feedback.textContent = "Bravo, l'équation est complète !";
        els.feedback.className = 'ex-feedback success';
        triggerConfettiFromButton(els.validateBtn);
        els.newBtn.style.display = 'inline-block';
      } else {
        els.feedback.textContent = "Certaines formules ne sont pas correctes.";
        els.feedback.className = 'ex-feedback error';
      }
    }

    function startNewReaction() {
      reaction = window.Equations.getRandomReaction();
      step = 1;
      selected = { reactif: new Set(), produit: new Set() };
      els.equation.style.display = 'none';
      els.equation.innerHTML = '';
      els.validateBtn.style.display = 'none';
      els.newBtn.style.display = 'none';
      els.nextStepBtn.style.display = 'none';
      els.feedback.textContent = '';
      els.feedback.className = 'ex-feedback';
      render();
    }

    function init() {
      els.instruction = document.getElementById('eqc-instruction');
      els.phrase = document.getElementById('eqc-phrase');
      els.equation = document.getElementById('eqc-equation');
      els.feedback = document.getElementById('eqc-feedback');
      els.nextStepBtn = document.getElementById('btn-eqc-next-step');
      els.validateBtn = document.getElementById('btn-eqc-validate');
      els.newBtn = document.getElementById('btn-eqc-new');
      if (!els.phrase) return;

      els.nextStepBtn.addEventListener('click', onNextStep);
      els.validateBtn.addEventListener('click', onValidateFormulas);
      els.newBtn.addEventListener('click', startNewReaction);
      setupCatalog('eqc');
      startNewReaction();
    }

    document.addEventListener('DOMContentLoaded', init);
    return { startNewReaction: function () { startNewReaction(); } };
  })();

  // ============================================================
  // Mode "Exercice" : équations à compléter
  // ============================================================
  window.EquationsExercice = (function () {
    var els = {};
    var reaction = null;
    var score = { correct: 0, total: 0 };
    var solved = false;
    var revealing = false;

    function updateScore() { els.score.textContent = 'Score : ' + score.correct + ' / ' + score.total; }

    function pickNew() {
      reaction = window.Equations.getRandomReaction();
      solved = false;
      revealing = false;
      els.feedback.textContent = '';
      els.feedback.className = 'ex-feedback';
      renderPhrase(els.phrase, reaction, { interactive: false });
      els.equation.innerHTML = buildEquationHTML(reaction.substances);
      els.validateBtn.disabled = false;
      els.skipBtn.disabled = false;
      els.skipBtn.textContent = 'Résoudre et passer';
    }

    function checkAnswers(reveal) {
      var inputs = Array.prototype.slice.call(els.equation.querySelectorAll('.eq-blank'));
      ['reactif', 'produit'].forEach(function (type) {
        var group = inputs.filter(function (inp) {
          return reaction.substances[parseInt(inp.getAttribute('data-idx'), 10)].type === type;
        });
        var expected = group.map(function (inp) {
          var idx = parseInt(inp.getAttribute('data-idx'), 10);
          return window.Molecules.parseFormulaInput(reaction.substances[idx].formula);
        });
        var claimed = expected.map(function () { return false; });

        group.forEach(function (inp) {
          var idx = parseInt(inp.getAttribute('data-idx'), 10);
          if (reveal) {
            inp.value = reaction.substances[idx].formula;
            inp.classList.remove('eq-blank--bad');
            inp.classList.add('eq-blank--ok');
            inp.disabled = true;
            return;
          }
          var got = window.Molecules.parseFormulaInput(inp.value);
          var matchAt = -1;
          if (got) {
            for (var i = 0; i < expected.length; i++) {
              if (!claimed[i] && countsEqual(got, expected[i])) { matchAt = i; break; }
            }
          }
          inp.classList.remove('eq-blank--ok', 'eq-blank--bad');
          if (matchAt !== -1) { claimed[matchAt] = true; inp.classList.add('eq-blank--ok'); }
          else { inp.classList.add('eq-blank--bad'); }
        });
      });
    }

    function allCorrect() {
      var inputs = els.equation.querySelectorAll('.eq-blank');
      for (var i = 0; i < inputs.length; i++) {
        if (!inputs[i].classList.contains('eq-blank--ok')) return false;
      }
      return inputs.length > 0;
    }

    function onValidate() {
      if (solved || revealing) return;
      checkAnswers(false);
      if (allCorrect()) {
        solved = true;
        score.correct++; score.total++;
        updateScore();
        els.feedback.textContent = "Bravo, l'équation est correcte !";
        els.feedback.className = 'ex-feedback success';
        triggerConfettiFromButton(els.validateBtn);
        els.validateBtn.disabled = true;
        els.skipBtn.textContent = 'Transformation suivante';
      } else {
        els.feedback.textContent = "Certaines cases sont en rouge : corrige-les et revalide, ou passe à une autre transformation.";
        els.feedback.className = 'ex-feedback error';
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
      checkAnswers(true);
      els.feedback.textContent = 'Voici la bonne équation.';
      els.feedback.className = 'ex-feedback reveal';

      setTimeout(function () { pickNew(); }, 3000);
    }

    function init() {
      els.phrase = document.getElementById('eqx-phrase');
      els.equation = document.getElementById('eqx-equation');
      els.feedback = document.getElementById('eqx-feedback');
      els.score = document.getElementById('eqx-score');
      els.validateBtn = document.getElementById('btn-eqx-validate');
      els.skipBtn = document.getElementById('btn-eqx-skip');
      if (!els.phrase) return;

      els.validateBtn.addEventListener('click', onValidate);
      els.skipBtn.addEventListener('click', onSkip);
      setupCatalog('eqx');
      updateScore();
      pickNew();
    }

    document.addEventListener('DOMContentLoaded', init);
    return { getScore: function () { return { correct: score.correct, total: score.total }; } };
  })();
})();
