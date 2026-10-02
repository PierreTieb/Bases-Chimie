// atom-expert.js
// Challenge Atomes et Ions, niveau 3 : mode Expert. 5 questions enchaînées :
//   1. construire un atome   2. identifier un atome   3. construire un ion
//   4. identifier un ion     5. identifier un ion mystère dans le labo
// Un point par question réussie du premier coup (sans validation erronée avant la réussite).
// Après une erreur : corriger et revalider (le point est perdu), ou demander une autre
// question du même type (plus de temps, mais le point peut être regagné).
// Il faut réussir les 5 questions pour voir la note /5 et le chrono.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var TOTAL = 5;

  var MESSAGES = [
    { score: 5, text: "Félicitations, les atomes et les ions n'ont pas de secret pour toi !", color: '#7B3FE4', trophy: true },
    { score: 4, text: "C'est super, essaye de battre ton record maintenant.", color: '#1F7A3D' },
    { score: 3, text: "C'est bien, essaye de comprendre tes erreurs et d'améliorer ton score en retentant ta chance !", color: '#6BAA2A' },
    { score: 2, text: "C'est un bon début, entraîne-toi avec les tutos et les exercices pour améliorer ton score.", color: '#E9822B', train: true },
    { score: 1, text: "C'est un bon début, entraîne-toi avec les tutos et les exercices pour améliorer ton score.", color: '#E9822B', train: true },
    { score: 0, text: "Je te conseille de t'entraîner avec les tutos pour comprendre les principes des atomes et des ions.", color: '#D9463B', train: true }
  ];

  var run = null;     // { q, t0, t1, points }

  function specs() {
    var P = window.Ions.pools;
    return [
      { type: 'construct', ions: false, pool: P.atoms, shake: true },    // 1 : construire un atome (comme S'exercer, sans indices)
      { type: 'identify',  ions: false, pool: P.atoms, shake: false },   // 2 : identifier un atome
      { type: 'construct', ions: true,  pool: P.ions,  shake: false },   // 3 : construire un ion
      { type: 'identify',  ions: true,  pool: P.ions,  shake: false }    // 4 : identifier un ion
    ];                                                                   // 5 : ion mystère (labo)
  }

  function formatTime(ms) {
    var secs = Math.round(ms / 1000), m = Math.floor(secs / 60), s = secs % 60;
    return m > 0 ? m + ' min ' + (s < 10 ? '0' : '') + s + ' s' : s + ' s';
  }

  function showQuestion() {
    var label = 'Question ' + (run.q + 1) + ' / ' + TOTAL;
    if (run.q < 4) {
      window.App.showScreen('screen-atom-expert-q');
      window.Ions.expert.startExpert(specs()[run.q]);
      window.Ions.expert.setTop(label);
    } else {
      window.App.showScreen('screen-atom-expert-lab');
      window.Lab.expert.start();
      window.Lab.expert.setProgress(label);
    }
    window.scrollTo(0, 0);
  }

  function onSolved(firstTry) {
    if (firstTry) run.points++;
    if (run.q === TOTAL - 1) run.t1 = Date.now();      // le chrono s'arrête à la dernière bonne réponse
  }

  function onNext() {
    if (run.q < TOTAL - 1) { run.q++; showQuestion(); }
    else showRecap();
  }

  function showRecap() {
    var msg = MESSAGES.filter(function (m) { return m.score === run.points; })[0];
    window.App.showScreen('screen-atom-expert-recap');
    $('aer-trophy').style.display = msg.trophy ? '' : 'none';
    $('aer-final').textContent = run.points + ' / ' + TOTAL;
    $('aer-time').textContent = '\u23F1 ' + formatTime(run.t1 - run.t0);
    var m = $('aer-message');
    m.textContent = msg.text;
    m.style.color = msg.color;
    $('aer-train').style.display = msg.train ? '' : 'none';
    if (msg.trophy && window.Confetti && $('confetti-canvas')) {
      try {
        var r = $('aer-final').getBoundingClientRect();
        window.Confetti.burst($('confetti-canvas'), r.left + r.width / 2, r.top + r.height / 2);
      } catch (e) { /* décoratif */ }
    }
  }

  function start() {
    run = { q: 0, t0: Date.now(), t1: null, points: 0 };
    showQuestion();
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.Ions.expert.hooks.onSolved = onSolved;
    window.Ions.expert.hooks.onNext = onNext;
    window.Lab.expert.hooks.onSolved = onSolved;
    window.Lab.expert.hooks.onNext = onNext;
    window.Lab.expert.hooks.nextLabel = 'Voir mon score';

    var b = $('btn-ach-lvl3');
    if (b) b.addEventListener('click', start);
    $('aer-replay').addEventListener('click', start);
    $('aer-train').addEventListener('click', function () { window.App.showScreen('screen-mode2'); });
  });

  window.AtomExpert = { start: start };
})();
