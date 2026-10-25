window.App = (function () {
  'use strict';

  var SCREEN_THEMES = {
    'screen-home': 'home',
    'screen-lessons': 'home',
    'screen-labo': 'home',
    'screen-challenge': 'yellow',
    'screen-ch-results': 'yellow',
    'screen-ch-qcm': 'yellow',
    'screen-qcm': 'home',
    'screen-ph': 'k4',
    'screen-phlab': 'k4',
    'screen-phlab-test': 'k4',
    'screen-phlab-ch': 'k4',
    'screen-mode1-1': 'b1',
    'screen-exercise1-2': 'b2',
    'screen-equations-cours': 'b3',
    'screen-equations-exercice': 'yellow',
    'screen-balance-exercice': 'orange',
    'screen-expert': 'red',
    'screen-balance': 'b4',
    'screen-atom-cours': 'g1',
    'screen-atom-exercice': 'g2',
    'screen-ion-cours': 'g3',
    'screen-ion-exercice': 'g4',
    'screen-atom-expert-q': 'g2',
    'screen-atom-expert-lab': 'g5',
    'screen-lab': 'g5',
    'screen-lab-test': 'g5',
    'screen-states': 'r1',
    'screen-temp': 'r2',
    'screen-piston': 'r4'
  };

  // Anciens menus (supprimés) : les modules y renvoient encore en quittant un écran,
  // on redirige alors vers le menu d'où l'élève est venu (Leçons, Laboratoire…).
  var LEGACY_MENUS = ['screen-mode1', 'screen-mode2', 'screen-mode3', 'screen-eq-practice', 'screen-atom-challenge'];
  // Arrêt des animations des labos quand on quitte leur écran
  var STOPPERS = {
    'screen-states': function () { if (window.States) window.States.stop(); },
    'screen-temp': function () { if (window.TempLab) window.TempLab.stop(); },
    'screen-piston': function () { if (window.PistonLab) window.PistonLab.stop(); }
  };

  var current = 'screen-home', returnTo = 'screen-home', listeners = [];

  function showScreen(id) {
    if (LEGACY_MENUS.indexOf(id) >= 0) id = returnTo;
    if (id !== current && STOPPERS[current]) STOPPERS[current]();
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    var target = document.getElementById(id);
    if (target) target.classList.add('active');
    document.body.setAttribute('data-theme', SCREEN_THEMES[id] || 'home');
    current = id;
    window.scrollTo(0, 0);
    listeners.forEach(function (fn) { fn(id); });
  }

  // Ouvre un écran en retenant le menu auquel ses boutons « Retour » doivent ramener
  function open(id, from, startFn) {
    returnTo = from || current;
    showScreen(id);
    if (startFn) startFn();
  }
  function back() { showScreen(returnTo); }

  function wire(id, fn) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', fn);
  }

  // Boutons « Retour » des écrans d'activité : retour au menu d'origine
  var BACK_BUTTONS = [
    'btn-back-to-mode1', 'btn-back-to-mode1-ex', 'btn-back-to-mode1-eqc', 'btn-back-to-mode1-eqx', 'btn-back-to-mode1-bal',
    'btn-back-to-practice-bx', 'btn-back-to-mode2', 'btn-back-to-mode2-ion', 'btn-back-to-mode3', 'btn-back-to-mode3-tp',
    'btn-back-to-mode3-pi', 'btn-back-ph', 'btn-back-qcm'
  ];

  // Paillasses du laboratoire : [titre, sous-titre, couleur, écran, démarrage]
  var BENCHES = [
    ['Changements d\'état', 'Chauffe et refroidis l\'eau, observe-la au microscope', 'r1', 'screen-states', function () { window.States.start(); }],
    ['Températures', 'Suis la température de différentes substances qui changent d\'état', 'r2', 'screen-temp', function () { window.TempLab.start('free'); }],
    ['Piston', 'Comprime, étire, chauffe et refroidis solides, liquides et gaz', 'r3', 'screen-piston', function () { window.PistonLab.start(); }],
    ['Molécules', 'Assemble des atomes et découvre la formule de tes molécules', 'b2', 'screen-mode1-1', function () { if (sandbox) sandbox.clearAll(); }],
    ['Atomes', 'Ajoute protons, neutrons et électrons pour construire un atome', 'k1', 'screen-atom-cours', function () { window.AtomCours.reset(); }],
    ['Tests d\'ions', 'Soude, nitrate d\'argent et flamme', 'k3', 'screen-lab', function () { window.Lab.free.start(); }],
    ['Mesurer le pH', 'Mesure le pH de différentes solutions avec du papier pH', 'k4', 'screen-phlab', function () { window.PhLab.bench.start(); }]
  ];
  var sandbox = null;

  function buildLabo() {
    var list = document.getElementById('labo-list');
    list.innerHTML = BENCHES.map(function (b, i) {
      return '<button type="button" class="mode-btn mode-btn--' + b[2] + '" data-i="' + i + '">' +
        '<span class="mode-btn__title">' + b[0] + '</span><span class="mode-btn__subtitle">' + b[1] + '</span></button>';
    }).join('');
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-i]');
      if (!btn) return;
      var b = BENCHES[+btn.getAttribute('data-i')];
      open(b[3], 'screen-labo', b[4]);
    });
  }

  function init() {
    wire('btn-lessons', function () { window.Lessons.openMenu(); });
    wire('btn-labo', function () { showScreen('screen-labo'); });
    wire('btn-challenge', function () { window.Challenge.openPage(); });
    wire('btn-back-lessons', function () { showScreen('screen-home'); });
    wire('btn-back-labo', function () { showScreen('screen-home'); });
    BACK_BUTTONS.forEach(function (id) { wire(id, back); });
    buildLabo();

    // Bac à sable de la paillasse Molécules (celui de « Teste-toi » est
    // initialisé par exercise.js, qui gère aussi son propre écran).
    sandbox = window.Sandbox.create({
      panelEl: document.getElementById('atoms-panel'),
      dropZoneEl: document.getElementById('drop-zone'),
      clearBtnEl: document.getElementById('btn-clear'),
      formulaEl: document.getElementById('formula-brute'),
      nameEl: document.getElementById('formula-name')
    });
  }

  // Pas de zoom par double clic / double tap, dans toute l'appli.
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('DOMContentLoaded', init);

  return {
    showScreen: showScreen,
    open: open,
    back: back,
    current: function () { return current; },
    onShow: function (fn) { listeners.push(fn); },
    sandbox: function () { return sandbox; }
  };
})();
