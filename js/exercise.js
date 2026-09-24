window.Exercise = (function () {
  'use strict';

  var formulaEl = null;
  var optionsEl = null;
  var feedbackEl = null;
  var scoreEl = null;
  var nextBtnEl = null;

  var pool = [];
  var current = null;
  var score = { correct: 0, total: 0 };

  function updateScoreDisplay() {
    scoreEl.textContent = 'Score : ' + score.correct + ' / ' + score.total;
  }

  function renderQuestion() {
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('quiz-feedback--success', 'quiz-feedback--error');
    nextBtnEl.style.display = 'none';

    current = window.Generator.generateQuestion(pool, 4);
    formulaEl.textContent = current.formula;

    optionsEl.innerHTML = '';
    current.options.forEach(function (name) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = name;
      btn.addEventListener('click', function () { onAnswer(name, btn); });
      optionsEl.appendChild(btn);
    });
  }

  function onAnswer(chosenName, chosenBtn) {
    var buttons = optionsEl.querySelectorAll('.quiz-option');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      if (buttons[i].textContent === current.correctName) {
        buttons[i].classList.add('quiz-option--correct');
      }
    }

    score.total++;
    if (chosenName === current.correctName) {
      score.correct++;
      feedbackEl.textContent = 'Bravo, bonne réponse !';
      feedbackEl.classList.add('quiz-feedback--success');
    } else {
      chosenBtn.classList.add('quiz-option--wrong');
      feedbackEl.textContent = 'Pas tout à fait : c\'était "' + current.correctName + '".';
      feedbackEl.classList.add('quiz-feedback--error');
    }

    updateScoreDisplay();
    nextBtnEl.style.display = 'inline-block';
  }

  function resetScore() {
    score = { correct: 0, total: 0 };
    updateScoreDisplay();
  }

  function init() {
    formulaEl = document.getElementById('quiz-formula');
    optionsEl = document.getElementById('quiz-options');
    feedbackEl = document.getElementById('quiz-feedback');
    scoreEl = document.getElementById('quiz-score');
    nextBtnEl = document.getElementById('btn-quiz-next');
    if (!formulaEl || !optionsEl || !feedbackEl || !scoreEl || !nextBtnEl) return;

    pool = window.Molecules.getAllKnown();
    updateScoreDisplay();
    nextBtnEl.addEventListener('click', renderQuestion);
    renderQuestion();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    renderQuestion: renderQuestion,
    resetScore: resetScore,
    getScore: function () { return { correct: score.correct, total: score.total }; }
  };
})();
