window.App = (function () {
  'use strict';

  var SCREEN_THEMES = {
    'screen-home': 'home',
    'screen-mode1': 'home',
    'screen-mode2': 'home',
    'screen-mode1-1': 'b1',
    'screen-exercise1-2': 'b2',
    'screen-equations-cours': 'b3',
    'screen-eq-practice': 'home',
    'screen-equations-exercice': 'yellow',
    'screen-balance-exercice': 'orange',
    'screen-expert': 'red',
    'screen-balance': 'b4',
    'screen-atom-cours': 'g1',
    'screen-atom-exercice': 'g2',
    'screen-ion-cours': 'g3',
    'screen-ion-exercice': 'g4',
    'screen-atom-challenge': 'home',
    'screen-atom-ch1': 'yellow',
    'screen-atom-ch2': 'orange'
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
    wireNav('btn-eq-exercice', 'screen-eq-practice');
    wireNav('btn-back-to-mode1-practice', 'screen-mode1');
    wireNav('btn-eq-lvl1', 'screen-equations-exercice');
    wireNav('btn-back-to-mode1-eqx', 'screen-eq-practice');
    var btnLvl2 = document.getElementById('btn-eq-lvl2');
    if (btnLvl2) btnLvl2.addEventListener('click', function () {
      showScreen('screen-balance-exercice');
      if (window.BalanceExercise) window.BalanceExercise.start(); // écran visible : tailles mesurables
    });
    wireNav('btn-back-to-practice-bx', 'screen-eq-practice');
    var btnLvl3 = document.getElementById('btn-eq-lvl3');
    if (btnLvl3) btnLvl3.addEventListener('click', function () {
      showScreen('screen-expert');
      if (window.Expert) window.Expert.start(); // écran visible : tailles mesurables
    });
    wireNav('btn-back-to-practice-exp', 'screen-eq-practice');

    var btnBalance = document.getElementById('btn-balance');
    if (btnBalance) btnBalance.addEventListener('click', function () {
      showScreen('screen-balance');
      if (window.Balance) window.Balance.start(); // après l'affichage : les tailles doivent être mesurables
    });
    wireNav('btn-back-to-mode1-bal', 'screen-mode1');

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
