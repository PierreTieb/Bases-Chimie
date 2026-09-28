(function () {
  'use strict';

  var MAX_PROTONS = 30;
  var MAX_NEUTRONS = 30;
  var MAX_ELECTRONS = 20;

  // Géométrie du schéma, en "unités" (le schéma fait 290 unités de large et
  // se met à l'échelle via le CSS). La zone nucléaire n'est jamais dessinée.
  var NUCLEON_SIZE = 18;
  var NUCLEUS_ZONE_RADIUS = 58;
  var RING_RADII = [80, 112];
  var RING_CAPACITY = [8, 12];
  // Ordre des paires d'électrons sur un cercle (angles en degrés) : une paire
  // opposée, puis la paire perpendiculaire, puis les diagonales, etc.
  var PAIR_ANGLES = [0, 90, 45, 135, 22.5, 112.5, 67.5, 157.5];

  function expectedNeutrons(protonCount) {
    var el = window.Units.getByZ(protonCount);
    return el ? (el.mass - el.z) : null;
  }

  function cellHTML(el) {
    return '<span class="element-mass">' + el.mass + '</span>' +
      '<span class="element-number">' + el.z + '</span>' +
      '<span class="element-symbol">' + el.symbol + '</span>' +
      '<span class="element-name">' + el.name + '</span>';
  }

  function renderPickerGrid(gridEl, onPick) {
    var html = '';
    window.Units.getAll().forEach(function (el) {
      html += '<div class="element-cell" data-z="' + el.z + '">' + cellHTML(el) + '</div>';
    });
    gridEl.innerHTML = html;
    gridEl.querySelectorAll('.element-cell').forEach(function (cell) {
      cell.addEventListener('click', function () {
        onPick(parseInt(cell.getAttribute('data-z'), 10));
      });
    });
  }

  // ---------- Noyau : protons et neutrons ----------
  // Les nucléons sont répartis en "tournesol" dans la zone nucléaire. Tant
  // qu'il y a de la place, ils se touchent à peine ; au-delà, le rayon reste
  // plafonné à la zone : le chevauchement augmente avec le nombre de nucléons.
  function nucleonPositions(total) {
    if (total === 0) return [];
    if (total === 1) return [{ x: 0, y: 0 }];
    if (total === 2) return [{ x: -NUCLEON_SIZE / 2, y: 0 }, { x: NUCLEON_SIZE / 2, y: 0 }];
    var needed = NUCLEON_SIZE * 0.62 * Math.sqrt(total);
    var rMax = Math.min(needed, NUCLEUS_ZONE_RADIUS - NUCLEON_SIZE / 2);
    var golden = 137.508 * Math.PI / 180;
    var out = [];
    for (var i = 0; i < total; i++) {
      var r = rMax * Math.sqrt(i / (total - 1));
      out.push({ x: Math.cos(i * golden) * r, y: Math.sin(i * golden) * r });
    }
    return out;
  }

  // Alternance régulière protons / neutrons (pas de hasard : le noyau ne
  // "saute" pas à chaque ajout).
  function nucleonSequence(p, n) {
    var seq = [], pi = 0, ni = 0;
    while (pi < p || ni < n) {
      var takeProton = pi < p && (ni >= n || pi * n <= ni * p);
      if (takeProton) { seq.push('p'); pi++; } else { seq.push('n'); ni++; }
    }
    return seq;
  }

  function renderNucleus(wrapEl, protonCount, neutronCount) {
    wrapEl.innerHTML = '';
    var seq = nucleonSequence(protonCount, neutronCount);
    var pos = nucleonPositions(seq.length);
    seq.forEach(function (type, i) {
      var node = document.createElement('div');
      node.className = 'nucleon nucleon--' + (type === 'p' ? 'proton' : 'neutron');
      node.style.setProperty('--x', pos[i].x.toFixed(1));
      node.style.setProperty('--y', pos[i].y.toFixed(1));
      node.textContent = type === 'p' ? '+' : '';
      wrapEl.appendChild(node);
    });
  }

  // ---------- Électrons : deux cercles, remplis par paires opposées ----------
  // 1re paire sur le cercle 1, 2e paire sur le cercle 2 (perpendiculaire),
  // 3e paire de nouveau sur le cercle 1, etc. Le cercle 1 est plein à 8
  // électrons : ensuite, seul le cercle 2 se remplit.
  function electronPlacements(count) {
    var used = [0, 0];
    var out = [];
    var pairs = Math.ceil(count / 2);
    for (var p = 0; p < pairs; p++) {
      var ring = p % 2;
      if (used[0] >= RING_CAPACITY[0] / 2) ring = 1;
      else if (used[1] >= RING_CAPACITY[1] / 2) ring = 0;
      var angle = PAIR_ANGLES[used[ring]] + (ring === 1 ? 90 : 0);
      used[ring]++;
      out.push({ ring: ring, angle: angle });
      if (2 * p + 1 < count) out.push({ ring: ring, angle: angle + 180 });
    }
    return out;
  }

  function renderElectrons(wrapEl, electronCount) {
    wrapEl.innerHTML = '';
    if (electronCount <= 0) return;
    RING_RADII.forEach(function (r) {
      var ring = document.createElement('div');
      ring.className = 'atom-ring';
      ring.style.setProperty('--r', r);
      wrapEl.appendChild(ring);
    });
    electronPlacements(electronCount).forEach(function (pl) {
      var rad = pl.angle * Math.PI / 180;
      var r = RING_RADII[pl.ring];
      var node = document.createElement('div');
      node.className = 'electron-dot';
      node.style.setProperty('--x', (Math.cos(rad) * r).toFixed(1));
      node.style.setProperty('--y', (Math.sin(rad) * r).toFixed(1));
      node.textContent = '-';
      wrapEl.appendChild(node);
    });
  }

  function flashLimitMessage(el) {
    if (!el) return;
    el.textContent = 'Ça fait beaucoup là non ?';
    el.classList.add('atom-limit-msg--show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () {
      el.classList.remove('atom-limit-msg--show');
    }, 1800);
  }

  // ============================================================
  // Constructeur d'atome réutilisable (cours + exercice)
  // ============================================================
  function createAtomController(config) {
    var protons = 0, neutrons = 0, electrons = 0;
    var showHelpers = config.showHelpers !== false;

    function isUnstable() {
      if (protons < 1 || protons > 20) return true;
      var exp = expectedNeutrons(protons);
      return exp === null || neutrons !== exp;
    }

    function renderNeutralMsg() {
      var msg = config.neutralMsgEl;
      if (!msg) return;
      msg.classList.remove('atom-neutral-msg--pos', 'atom-neutral-msg--neg', 'atom-neutral-msg--ok');
      var diff = electrons - protons;
      if (protons === 0 && electrons === 0) {
        msg.textContent = '';
      } else if (diff === 0) {
        msg.textContent = "L'atome est neutre.";
        msg.classList.add('atom-neutral-msg--ok');
      } else {
        // Plus de protons que d'électrons : charge positive (rouge).
        // Plus d'électrons que de protons : charge négative (bleu).
        msg.textContent = "L'atome n'est pas neutre.";
        msg.classList.add(diff < 0 ? 'atom-neutral-msg--pos' : 'atom-neutral-msg--neg');
      }
    }

    function render() {
      renderNucleus(config.nucleusEl, protons, neutrons);
      renderElectrons(config.electronsEl, electrons);

      config.nucleusEl.classList.toggle('atom-nucleus--unstable', showHelpers && isUnstable());

      var el = window.Units.getByZ(protons);
      if (config.symbolEl) config.symbolEl.textContent = el ? el.symbol : '?';
      if (config.nameEl) config.nameEl.textContent = el ? el.name : '';
      if (config.massEl) {
        config.massEl.textContent = protons > 0 ? String(neutrons + protons) : '';
        config.massEl.classList.toggle('atom-value--unstable', showHelpers && isUnstable() && protons >= 1 && protons <= 20);
      }
      if (config.numberEl) config.numberEl.textContent = protons > 0 ? String(protons) : '';

      if (showHelpers && config.protonMsgEl) {
        config.protonMsgEl.textContent = protons > 20
          ? "Le nombre de protons ne correspond à aucun atome du tableau (1 à 20)."
          : '';
      }
      renderNeutralMsg();

      if (config.onChange) config.onChange({ protons: protons, neutrons: neutrons, electrons: electrons });
    }

    function add(type) {
      var count = type === 'proton' ? protons : (type === 'neutron' ? neutrons : electrons);
      var max = type === 'proton' ? MAX_PROTONS : (type === 'neutron' ? MAX_NEUTRONS : MAX_ELECTRONS);
      if (count >= max) { flashLimitMessage(config.limitMsgEl); return; }
      if (type === 'proton') protons++;
      else if (type === 'neutron') neutrons++;
      else electrons++;
      render();
    }

    function reset() { protons = 0; neutrons = 0; electrons = 0; render(); }

    function setFromElement(z) {
      var el = window.Units.getByZ(z);
      if (!el) return;
      protons = el.z;
      neutrons = el.mass - el.z;
      electrons = el.z;
      render();
    }

    // Retrait au clic sur une particule (délégation : survit au ré-affichage)
    config.nucleusEl.addEventListener('click', function (evt) {
      var target = evt.target.closest ? evt.target.closest('.nucleon') : null;
      if (!target) return;
      if (target.classList.contains('nucleon--proton') && protons > 0) protons--;
      else if (target.classList.contains('nucleon--neutron') && neutrons > 0) neutrons--;
      render();
    });
    config.electronsEl.addEventListener('click', function (evt) {
      var target = evt.target.closest ? evt.target.closest('.electron-dot') : null;
      if (target && electrons > 0) { electrons--; render(); }
    });

    render();

    return {
      add: add,
      reset: reset,
      setFromElement: setFromElement,
      getCounts: function () { return { protons: protons, neutrons: neutrons, electrons: electrons }; }
    };
  }

  // ============================================================
  // Mode Cours : "Construis ton atome"
  // ============================================================
  window.AtomCours = (function () {
    var atomCtrl = null;

    function init() {
      var nucleusEl = document.getElementById('atom-nucleus-wrap');
      if (!nucleusEl) return;

      atomCtrl = createAtomController({
        nucleusEl: nucleusEl,
        electronsEl: document.getElementById('atom-electrons-wrap'),
        symbolEl: document.getElementById('atom-info-symbol'),
        nameEl: document.getElementById('atom-info-name'),
        massEl: document.getElementById('atom-info-mass'),
        numberEl: document.getElementById('atom-info-number'),
        protonMsgEl: document.getElementById('atom-proton-msg'),
        neutralMsgEl: document.getElementById('atom-neutral-msg'),
        limitMsgEl: document.getElementById('atom-limit-msg'),
        showHelpers: true
      });

      document.getElementById('btn-add-proton').addEventListener('click', function () { atomCtrl.add('proton'); });
      document.getElementById('btn-add-neutron').addEventListener('click', function () { atomCtrl.add('neutron'); });
      document.getElementById('btn-add-electron').addEventListener('click', function () { atomCtrl.add('electron'); });
      document.getElementById('btn-atom-clear').addEventListener('click', function () { atomCtrl.reset(); });

      var overlay = document.getElementById('atom-picker-overlay');
      var grid = document.getElementById('atom-picker-grid');
      document.getElementById('btn-atom-select').addEventListener('click', function () {
        renderPickerGrid(grid, function (z) {
          atomCtrl.setFromElement(z);
          overlay.style.display = 'none';
        });
        overlay.style.display = 'flex';
      });
      document.getElementById('btn-atom-picker-close').addEventListener('click', function () {
        overlay.style.display = 'none';
      });
    }

    document.addEventListener('DOMContentLoaded', init);
    return {};
  })();

  // ============================================================
  // Mode Exercice : construction / identification alternées
  // ============================================================
  window.AtomExercice = (function () {
    var els = {};
    var atomCtrl = null;
    var current = null; // { type, z }
    var score = { correct: 0, total: 0 };
    var answered = false;

    function updateScore() { els.score.textContent = 'Score : ' + score.correct + ' / ' + score.total; }

    function showQuestion() {
      answered = false;
      var z = 1 + Math.floor(Math.random() * 20);
      var type = Math.random() < 0.5 ? 'construct' : 'identify';
      current = { type: type, z: z };

      els.feedback.textContent = '';
      els.feedback.className = 'ex-feedback';
      els.validateBtn.disabled = false;
      els.skipBtn.style.display = 'none';
      els.skipBtn.textContent = 'Suivant';
      els.pickerOverlay.style.display = 'none';

      var el = window.Units.getByZ(z);

      if (type === 'construct') {
        els.instruction.textContent = "Construis l'atome suivant :";
        els.targetCell.style.display = '';
        els.targetCell.innerHTML = cellHTML(el);
        els.buildZone.style.display = '';
        els.identifyZone.style.display = 'none';
        atomCtrl.reset();
      } else {
        els.instruction.textContent = 'Quel est cet atome ? Sélectionne-le dans le tableau périodique.';
        els.targetCell.style.display = 'none';
        els.buildZone.style.display = 'none';
        els.identifyZone.style.display = '';
        renderNucleus(els.identifyNucleus, el.z, el.mass - el.z);
        renderElectrons(els.identifyElectrons, el.z);
        els.identifyPicked.textContent = '';
        els.identifyPicked.dataset.z = '';
      }
    }

    function onValidate() {
      if (!current) return;
      var correct = false;

      if (current.type === 'construct') {
        var counts = atomCtrl.getCounts();
        var target = window.Units.getByZ(current.z);
        correct = counts.protons === current.z &&
          counts.neutrons === (target.mass - current.z) &&
          counts.electrons === current.z;
      } else {
        var pickedZ = parseInt(els.identifyPicked.dataset.z || '0', 10);
        correct = pickedZ === current.z;
      }

      if (correct) {
        if (!answered) { score.total++; }
        answered = true;
        score.correct++;
        els.feedback.textContent = 'Bravo, bonne réponse !';
        els.feedback.className = 'ex-feedback success';
        try {
          var rect = els.validateBtn.getBoundingClientRect();
          window.Confetti.burst(document.getElementById('confetti-canvas'), rect.left + rect.width / 2, rect.top + rect.height / 2);
        } catch (e) { /* décoratif */ }
        els.validateBtn.disabled = true;
        els.skipBtn.style.display = 'inline-block';
        els.skipBtn.textContent = 'Suivant';
      } else {
        if (!answered) { score.total++; answered = true; }
        els.feedback.textContent = "Ce n'est pas la bonne réponse, réessaie.";
        els.feedback.className = 'ex-feedback error';
        els.skipBtn.style.display = 'inline-block';
      }
      updateScore();
    }

    function onSkip() { showQuestion(); }

    function init() {
      els.instruction = document.getElementById('atx-instruction');
      els.targetCell = document.getElementById('atx-target-cell');
      els.buildZone = document.getElementById('atx-build-zone');
      els.identifyZone = document.getElementById('atx-identify-zone');
      els.identifyNucleus = document.getElementById('atx-identify-nucleus');
      els.identifyElectrons = document.getElementById('atx-identify-electrons');
      els.identifyPicked = document.getElementById('atx-identify-picked');
      els.feedback = document.getElementById('atx-feedback');
      els.score = document.getElementById('atx-score');
      els.validateBtn = document.getElementById('btn-atx-validate');
      els.skipBtn = document.getElementById('btn-atx-skip');
      els.pickerOverlay = document.getElementById('atx-picker-overlay');
      if (!els.instruction) return;

      atomCtrl = createAtomController({
        nucleusEl: document.getElementById('atx-nucleus-wrap'),
        electronsEl: document.getElementById('atx-electrons-wrap'),
        neutralMsgEl: document.getElementById('atx-neutral-msg'),
        limitMsgEl: document.getElementById('atx-limit-msg'),
        showHelpers: false
      });

      document.getElementById('btn-atx-add-proton').addEventListener('click', function () { atomCtrl.add('proton'); });
      document.getElementById('btn-atx-add-neutron').addEventListener('click', function () { atomCtrl.add('neutron'); });
      document.getElementById('btn-atx-add-electron').addEventListener('click', function () { atomCtrl.add('electron'); });
      document.getElementById('btn-atx-clear').addEventListener('click', function () { atomCtrl.reset(); });

      document.getElementById('btn-atx-open-picker').addEventListener('click', function () {
        renderPickerGrid(document.getElementById('atx-picker-grid'), function (z) {
          els.identifyPicked.dataset.z = String(z);
          els.identifyPicked.innerHTML = cellHTML(window.Units.getByZ(z));
          els.pickerOverlay.style.display = 'none';
        });
        els.pickerOverlay.style.display = 'flex';
      });
      document.getElementById('btn-atx-picker-close').addEventListener('click', function () {
        els.pickerOverlay.style.display = 'none';
      });

      els.validateBtn.addEventListener('click', onValidate);
      els.skipBtn.addEventListener('click', onSkip);

      updateScore();
      showQuestion();
    }

    document.addEventListener('DOMContentLoaded', init);
    return { getScore: function () { return { correct: score.correct, total: score.total }; } };
  })();
})();
