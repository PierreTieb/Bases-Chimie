window.App = (function () {
  'use strict';

  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    var target = document.getElementById(id);
    if (target) target.classList.add('active');
  }

  function wireNav(btnId, targetScreenId) {
    var btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', function () {
        showScreen(targetScreenId);
      });
    }
  }

  function init() {
    wireNav('btn-mode1', 'screen-mode1');
    wireNav('btn-back-to-home', 'screen-home');
    wireNav('btn-mode1-1', 'screen-mode1-1');
    wireNav('btn-back-to-mode1', 'screen-mode1');
    wireNav('btn-mode1-2', 'screen-exercise1-2');
    wireNav('btn-back-to-mode1-ex', 'screen-mode1');

    // Bac à sable du Mode 1-1 (celui de l'exercice Mode 1-2 est initialisé
    // par exercise.js, qui gère aussi son propre écran).
    window.Sandbox.create({
      panelEl: document.getElementById('atoms-panel'),
      dropZoneEl: document.getElementById('drop-zone'),
      clearBtnEl: document.getElementById('btn-clear'),
      formulaEl: document.getElementById('formula-brute'),
      nameEl: document.getElementById('formula-name')
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    showScreen: showScreen
  };
})();
