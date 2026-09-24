window.App = (function () {
  'use strict';

  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    var target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
    }
  }

  function init() {
    var btnMode1 = document.getElementById('btn-mode1');
    var btnBackHome = document.getElementById('btn-back-to-home');
    var btnMode1_1 = document.getElementById('btn-mode1-1');
    var btnBackMode1 = document.getElementById('btn-back-to-mode1');
    var btnMode1_2 = document.getElementById('btn-mode1-2');
    var btnBackMode1FromEx = document.getElementById('btn-back-to-mode1-ex');

    if (btnMode1) {
      btnMode1.addEventListener('click', function () {
        showScreen('screen-mode1');
      });
    }

    if (btnBackHome) {
      btnBackHome.addEventListener('click', function () {
        showScreen('screen-home');
      });
    }

    if (btnMode1_1) {
      btnMode1_1.addEventListener('click', function () {
        showScreen('screen-mode1-1');
      });
    }

    if (btnBackMode1) {
      btnBackMode1.addEventListener('click', function () {
        showScreen('screen-mode1');
      });
    }

    if (btnMode1_2) {
      btnMode1_2.addEventListener('click', function () {
        showScreen('screen-exercise1-2');
      });
    }

    if (btnBackMode1FromEx) {
      btnBackMode1FromEx.addEventListener('click', function () {
        showScreen('screen-mode1');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    showScreen: showScreen
  };
})();
