(function () {
  'use strict';

  var MAX_PARTICLES = 30;

  function expectedNeutrons(protonCount) {
    var el = window.Units.getByZ(protonCount);
    return el ? (el.mass - el.z) : null;
  }

  function renderPickerGrid(gridEl, onPick) {
    var html = '';
    window.Units.getAll().forEach(function (el) {
      html +=
        '<div class="element-cell" data-z="' + el.z + '">' +
          '<span class="element-mass">' + el.mass + '</span>' +
          '<span class="element-number">' + el.z + '</span>' +
          '<span class="element-symbol">' + el.symbol + '</span>' +
          '<span class="element-name">' + el.name + '</span>' +
        '</div>';
    });
    gridEl.innerHTML = html;
    gridEl.querySelectorAll('.element-cell').forEach(function (cell) {
      cell.addEventListener('click', function () {
        onPick(parseInt(cell.getAttribute('data-z'), 10));
      });
    });
  }

  // Nuage de positions "en boule" pour les nucléons (déterministe par index).
  function nucleonOffset(index, total) {
    var angle = index * 137.5 * Math.PI / 180; // angle d'or : répartition dense mais non alignée
    var radius = 3 + Math.sqrt(index) * 6;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  }

  function renderNucleus(wrapEl, protonCount, neutronCount, size) {
    wrapEl.innerHTML = '';
    var total = protonCount + neutronCount;
    var seq = [];
    for (var i = 0; i < protonCount; i++) seq.push('p');
    for (var j = 0; j < neutronCount; j++) seq.push('n');
    // Alterne p/n pour un mélange visuel plus naturel plutôt que 2 paquets séparés
    seq.sort(function (a, b) { return (a === b) ? 0 : (Math.random() - 0.5); });

    seq.forEach(function (type, idx) {
      var off = nucleonOffset(idx, total);
      var node = document.createElement('div');
      node.className = 'nucleon nucleon--' + (type === 'p' ? 'proton' : 'neutron');
      node.style.transform = 'translate(' + off.x + 'px,' + off.y + 'px)';
      node.textContent = type === 'p' ? '+' : '';
      wrapEl.appendChild(node);
    });
  }

  function renderElectrons(wrapEl, electronCount) {
    wrapEl.innerHTML = '';
    for (var i = 0; i < electronCount; i++) {
      var angle = (360 / Math.max(electronCount, 1)) * i;
      var node = document.createElement('div');
      node.className = 'electron-orbit';
      node.style.transform = 'rotateY(' + angle + 'deg)';
      var dot = document.createElement('div');
      dot.className = 'electron-dot';
      dot.textContent = '-';
      node.appendChild(dot);
      wrapEl.appendChild(node);
    }
  }

  function flashLimitMessage(el) {
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
        config.protonMsgEl.textContent = (protons < 1 || protons > 20)
          ? "Le nombre de protons ne correspond à aucun atome du tableau (1 à 20)."
          : '';
      }

      if (showHelpers && config.neutralMsgEl) {
        var diff = electrons - protons;
        var msg = config.neutralMsgEl;
        msg.classList.remove('atom-neutral-msg--pos', 'atom-neutral-msg--neg');
        if (protons === 0 && electrons === 0) {
          msg.textContent = '';
        } else if (diff === 0) {
          msg.textContent = "L'atome est neutre.";
          msg.style.fontSize = '';
        } else {
          var amount = Math.abs(diff);
          var scale = Math.min(1 + amount * 0.08, 1.6);
          msg.style.fontSize = scale + 'em';
          if (diff < 0) {
            msg.textContent = "L'atome n'est pas neutre : il manque " + amount + " électron" + (amount > 1 ? 's' : '') + '.';
            msg.classList.add('atom-neutral-msg--neg');
          } else {
            msg.textContent = "L'atome n'est pas neutre : il y a " + amount + ' électron' + (amount > 1 ? 's' : '') + ' en trop.';
            msg.classList.add('atom-neutral-msg--pos');
          }
        }
      }

      if (config.onChange) config.onChange({ protons: protons, neutrons: neutrons, electrons: electrons });
    }

    function add(type) {
      var count = type === 'proton' ? protons : (type === 'neutron' ? neutrons : electrons);
      if (count >= MAX_PARTICLES) { flashLimitMessage(config.limitMsgEl); return; }
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

    // Retrait au clic sur une particule (délégation, survit au ré-affichage complet)
    config.nucleusEl.addEventListener('click', function (evt) {
      var target = evt.target.closest ? evt.target.closest('.nucleon') : null;
      if (!target) return;
      if (target.classList.contains('nucleon--proton') && protons > 0) protons--;
      else if (target.classList.contains('nucleon--neutron') && neutrons > 0) neutrons--;
      render();
    });
    config.electronsEl.addEventListener('click', function (evt) {
      var target = evt.target.closest ? evt.target.closest('.electron-orbit') : null;
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
      els.skipBtn.textContent = 'Suivant';
      els.pickerOverlay.style.display = 'none';

      var el = window.Units.getByZ(z);

      if (type === 'construct') {
        els.instruction.textContent = 'Construis l\'atome suivant :';
        els.targetCell.style.display = '';
        els.targetCell.innerHTML =
          '<span class="element-mass">' + el.mass + '</span>' +
          '<span class="element-number">' + el.z + '</span>' +
          '<span class="element-symbol">' + el.symbol + '</span>' +
          '<span class="element-name">' + el.name + '</span>';
        els.buildZone.style.display = '';
        els.identifyZone.style.display = 'none';
        atomCtrl.reset();
      } else {
        els.instruction.textContent = 'Quel est cet atome ? Sélectionne-le dans le tableau périodique.';
        els.targetCell.style.display = 'none';
        els.buildZone.style.display = 'none';
        els.identifyZone.style.display = '';
        renderNucleus(els.identifyNucleus, el.z, el.mass - el.z);
        els.identifyPicked.textContent = '';
        els.identifyPicked.dataset.z = '';
      }
    }

    function onValidate() {
      if (answered || !current) return;
      var correct = false;

      if (current.type === 'construct') {
        var counts = atomCtrl.getCounts();
        correct = counts.protons === current.z &&
          counts.neutrons === (window.Units.getByZ(current.z).mass - current.z) &&
          counts.electrons === current.z;
      } else {
        var pickedZ = parseInt(els.identifyPicked.dataset.z || '0', 10);
        correct = pickedZ === current.z;
      }

      answered = true;
      score.total++;
      if (correct) {
        score.correct++;
        els.feedback.textContent = 'Bravo, bonne réponse !';
        els.feedback.className = 'ex-feedback success';
        try {
          var rect = els.validateBtn.getBoundingClientRect();
          window.Confetti.burst(document.getElementById('confetti-canvas'), rect.left + rect.width / 2, rect.top + rect.height / 2);
        } catch (e) { /* décoratif */ }
      } else {
        els.feedback.textContent = "Ce n'est pas la bonne réponse.";
        els.feedback.className = 'ex-feedback error';
      }
      updateScore();
      els.validateBtn.disabled = true;
    }

    function onSkip() { showQuestion(); }

    function init() {
      els.instruction = document.getElementById('atx-instruction');
      els.targetCell = document.getElementById('atx-target-cell');
      els.buildZone = document.getElementById('atx-build-zone');
      els.identifyZone = document.getElementById('atx-identify-zone');
      els.identifyNucleus = document.getElementById('atx-identify-nucleus');
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
          var el = window.Units.getByZ(z);
          els.identifyPicked.innerHTML =
            '<span class="element-mass">' + el.mass + '</span>' +
            '<span class="element-number">' + el.z + '</span>' +
            '<span class="element-symbol">' + el.symbol + '</span>' +
            '<span class="element-name">' + el.name + '</span>';
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
