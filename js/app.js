window.App = (function () {
  'use strict';

  var SCREEN_THEMES = {
    'screen-home': 'home',
    'screen-mode1': 'home',
    'screen-mode2': 'home',
    'screen-mode1-1': 'pink',
    'screen-exercise1-2': 'pink',
    'screen-equations-cours': 'purple',
    'screen-equations-exercice': 'purple',
    'screen-atom-cours': 'green',
    'screen-atom-exercice': 'green'
  };

  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    var target = document.getElementById(id);
    if (target) target.classList.add('active');
    document.body.setAttribute('data-theme', SCREEN_THEMES[id] || 'home');
  }

  function wireNav(btnId, targetScreenId) {
    var btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', function () { showScreen(targetScreenId); });
  }

  function init() {
    wireNav('btn-mode1', 'screen-mode1');
    wireNav('btn-mode2', 'screen-mode2');
    wireNav('btn-back-to-home', 'screen-home');
    wireNav('btn-back-to-home-2', 'screen-home');

    wireNav('btn-mode1-1', 'screen-mode1-1');
    wireNav('btn-back-to-mode1', 'screen-mode1');
    wireNav('btn-mode1-2', 'screen-exercise1-2');
    wireNav('btn-back-to-mode1-ex', 'screen-mode1');

    wireNav('btn-eq-cours', 'screen-equations-cours');
    wireNav('btn-back-to-mode1-eqc', 'screen-mode1');
    wireNav('btn-eq-exercice', 'screen-equations-exercice');
    wireNav('btn-back-to-mode1-eqx', 'screen-mode1');

    wireNav('btn-atom-cours-nav', 'screen-atom-cours');
    wireNav('btn-back-to-mode2', 'screen-mode2');
    wireNav('btn-atom-exercice-nav', 'screen-atom-exercice');
    wireNav('btn-back-to-mode2-ex', 'screen-mode2');

    // Bac à sable du Mode 1-1-Cours (celui du Mode 1-1-Exercice est
    // initialisé par exercise.js, qui gère aussi son propre écran).
    window.Sandbox.create({
      panelEl: document.getElementById('atoms-panel'),
      dropZoneEl: document.getElementById('drop-zone'),
      clearBtnEl: document.getElementById('btn-clear'),
      formulaEl: document.getElementById('formula-brute'),
      nameEl: document.getElementById('formula-name')
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { showScreen: showScreen };
})();
