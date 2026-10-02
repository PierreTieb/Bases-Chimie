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
  var NUCLEUS_CLICK_RADIUS = 68; // au-delà : zone des électrons
  // Ordre des paires d'électrons sur un cercle (angles en degrés) : une paire
  // opposée, puis la paire perpendiculaire, puis les diagonales, etc.
  var PAIR_ANGLES = [0, 90, 45, 135, 22.5, 112.5, 67.5, 157.5];

  function expectedNeutrons(protonCount) {
    var el = window.Units.getByZ(protonCount);
    return el ? (el.mass - el.z) : null;
  }

  // Charge en exposant : "+", "2\u2212"... (rouge si positive, bleu fonce si negative)
  function chargeSup(charge) {
    if (!charge) return '';
    var n = Math.abs(charge);
    return '<sup class="ion-charge ' + (charge > 0 ? 'ion-pos' : 'ion-neg') + '">' +
      (n > 1 ? n : '') + (charge > 0 ? '+' : '\u2212') + '</sup>';
  }

  function cellHTML(el, charge) {
    return '<span class="element-mass">' + el.mass + '</span>' +
      '<span class="element-number">' + el.z + '</span>' +
      '<span class="element-symbol">' + el.symbol + chargeSup(charge) + '</span>' +
      '<span class="element-name">' + el.name + '</span>';
  }

  function renderPickerGrid(gridEl, onPick, maxZ) {
    window.PeriodicTable.renderPicker(gridEl, onPick, maxZ, { row4: !maxZ });
  }

  // ---------- Noyau : protons et neutrons ----------
  // Les nucléons sont répartis en "tournesol" dans la zone nucléaire. Tant
  // qu'il y a de la place, ils se touchent à peine ; au-delà, le rayon reste
  // plafonné à la zone : le chevauchement augmente avec le nombre de nucléons.
  function nucleonPositions(total) {
    if (total === 0) return [];
    if (total === 1) return [{ x: 0, y: 0 }];
    if (total === 2) return [{ x: -NUCLEON_SIZE / 2, y: 0 }, { x: NUCLEON_SIZE / 2, y: 0 }];
    var needed = NUCLEON_SIZE * 0.5 * Math.sqrt(total);
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
      // Plus un nucléon est proche du centre, plus il passe au-dessus : effet de sphère.
      node.style.zIndex = String(200 - Math.round(Math.sqrt(pos[i].x * pos[i].x + pos[i].y * pos[i].y)));
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

    var nextRemoveProton = true;
    var neutralVisible = true;

    // "Instable" = ne correspond à aucun atome du tableau (Z, A) : le noyau tremble.
    function isUnstable() {
      if (protons + neutrons === 0) return false;
      if (protons < 1 || protons > 20) return true;
      return neutrons !== expectedNeutrons(protons);
    }

    function updateButtons() {
      if (config.protonBtn) config.protonBtn.textContent = '+ Proton (' + protons + ')';
      if (config.neutronBtn) config.neutronBtn.textContent = '+ Neutron (' + neutrons + ')';
      if (config.electronBtn) config.electronBtn.textContent = '+ Électron (' + electrons + ')';
    }

    function renderNeutralMsg() {
      var msg = config.neutralMsgEl;
      if (!msg) return;
      msg.classList.remove('atom-neutral-msg--pos', 'atom-neutral-msg--neg', 'atom-neutral-msg--ok');
      if (!neutralVisible) { msg.textContent = ''; return; }
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
      }
      if (config.numberEl) config.numberEl.textContent = protons > 0 ? String(protons) : '';

      if (showHelpers && config.protonMsgEl) {
        config.protonMsgEl.textContent = protons > 20
          ? "Le nombre de protons ne correspond à aucun atome du tableau (1 à 20)."
          : '';
      }
      renderNeutralMsg();
      updateButtons();

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

    function setCounts(p, n, e) { protons = p; neutrons = n; electrons = e; render(); }
    function setNeutralVisible(v) { neutralVisible = !!v; render(); }
    function setShake(v) { showHelpers = !!v; render(); }

    function removeNucleon() {
      if (protons + neutrons === 0) return;
      var t = nextRemoveProton ? 'p' : 'n';
      if (t === 'p' && protons === 0) t = 'n';
      else if (t === 'n' && neutrons === 0) t = 'p';
      if (t === 'p') protons--; else neutrons--;
      nextRemoveProton = (t === 'n');
      render();
    }

    function removeElectron() {
      if (electrons === 0) return;
      electrons--;
      render();
    }

    // Deux zones tactiles : le noyau (retire un proton puis un neutron,
    // alternativement) et tout le reste du schéma (retire un électron).
    var schemaEl = config.nucleusEl.closest ? config.nucleusEl.closest('.atom-schema') : null;
    if (schemaEl) {
      schemaEl.addEventListener('click', function (evt) {
        if (evt.target.closest && evt.target.closest('button')) return;
        var r = schemaEl.getBoundingClientRect();
        var u = r.width / 290;
        var dx = evt.clientX - (r.left + r.width / 2);
        var dy = evt.clientY - (r.top + r.height / 2);
        var d = Math.sqrt(dx * dx + dy * dy) / u;
        if (d <= NUCLEUS_CLICK_RADIUS) removeNucleon(); else removeElectron();
      });
    }

    render();

    return {
      add: add,
      reset: reset,
      setFromElement: setFromElement,
      setCounts: setCounts,
      setNeutralVisible: setNeutralVisible,
      setShake: setShake,
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
        protonBtn: document.getElementById('btn-add-proton'),
        neutronBtn: document.getElementById('btn-add-neutron'),
        electronBtn: document.getElementById('btn-add-electron'),
        neutralMsgEl: document.getElementById('atom-neutral-msg'),
        limitMsgEl: document.getElementById('atom-limit-msg'),
        showHelpers: true
      });

      document.getElementById('btn-add-proton').addEventListener('click', function () { atomCtrl.add('proton'); });
      document.getElementById('btn-add-neutron').addEventListener('click', function () { atomCtrl.add('neutron'); });
      document.getElementById('btn-add-electron').addEventListener('click', function () { atomCtrl.add('electron'); });
      document.getElementById('btn-atom-clear').addEventListener('click', function () { atomCtrl.reset(); });

      var overlay = document.getElementById('atom-picker-overlay');
      window.PeriodicTable.wireOverlay(overlay);
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

  // Briques partagees avec le mode Ions (ions-app.js)
  window.AtomKit = {
    createAtomController: createAtomController,
    renderNucleus: renderNucleus,
    renderElectrons: renderElectrons,
    cellHTML: cellHTML,
    chargeSup: chargeSup
  };
})();
