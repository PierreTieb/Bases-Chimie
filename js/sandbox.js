window.Sandbox = (function () {
  'use strict';

  var atomsPanelEl = null;
  var dropZoneEl = null;
  var clearBtnEl = null;
  var formulaEl = null;
  var nameEl = null;
  var placedAtoms = [];
  var isCoarsePointer = false;

  var BOND_CANDIDATE_ANGLES = [270, 90, 0, 180, 315, 135, 45, 225];
  var BOND_ANGLE_TOLERANCE = 25;

  function detectCoarsePointer() {
    try {
      return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    } catch (e) {
      return false;
    }
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function normalizeAngleDiff(d) {
    return ((d + 180) % 360 + 360) % 360 - 180;
  }

  function renderPanel() {
    var elements = window.Units.getAll();
    var html = '';
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      html +=
        '<div class="element-cell" data-symbol="' + el.symbol + '">' +
          '<span class="element-mass">' + el.mass + '</span>' +
          '<span class="element-number">' + el.z + '</span>' +
          '<span class="element-symbol">' + el.symbol + '</span>' +
          '<span class="element-name">' + el.name + '</span>' +
        '</div>';
    }
    atomsPanelEl.innerHTML = html;

    var cells = atomsPanelEl.querySelectorAll('.element-cell');
    for (var j = 0; j < cells.length; j++) {
      if (isCoarsePointer) {
        cells[j].addEventListener('click', onCellTapMobile);
      } else {
        cells[j].addEventListener('pointerdown', onCellPointerDownDesktop);
      }
    }
  }

  // ---------- Interaction PC : glisser-déposer (Pointer Events) ----------
  function onCellPointerDownDesktop(evt) {
    evt.preventDefault();
    var symbol = evt.currentTarget.getAttribute('data-symbol');
    var el = window.Units.getBySymbol(symbol);
    if (!el) return;

    var radius = window.Units.radiusFor(el.z);
    var ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.width = (radius * 2) + 'px';
    ghost.style.height = (radius * 2) + 'px';
    ghost.style.background = el.color;
    ghost.textContent = el.symbol;
    document.body.appendChild(ghost);
    moveGhost(ghost, evt.clientX, evt.clientY);

    function onMove(moveEvt) {
      moveGhost(ghost, moveEvt.clientX, moveEvt.clientY);
    }

    function onUp(upEvt) {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);

      var rect = dropZoneEl.getBoundingClientRect();
      var x = upEvt.clientX;
      var y = upEvt.clientY;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        placeAtom(el, x - rect.left, y - rect.top);
      }
      ghost.remove();
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  function moveGhost(ghost, x, y) {
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
  }

  // ---------- Interaction mobile : tap pour ajouter / tap pour retirer ----------
  function onCellTapMobile(evt) {
    var symbol = evt.currentTarget.getAttribute('data-symbol');
    var el = window.Units.getBySymbol(symbol);
    if (!el) return;
    var zoneW = dropZoneEl.clientWidth || 300;
    var zoneH = dropZoneEl.clientHeight || 200;
    placeAtom(el, zoneW / 2, zoneH / 2);
  }

  // Choisit l'atome déjà posé auquel accrocher le nouvel atome : on privilégie
  // l'atome "central" de plus grande valence disponible (ex: le carbone), et
  // seulement à distance égale de "centralité" on prend le plus proche du point visé.
  function bestByValenceThenDistance(atoms, x, y) {
    if (atoms.length === 0) return null;
    var maxValence = -Infinity;
    for (var i = 0; i < atoms.length; i++) {
      if (atoms[i].valence > maxValence) maxValence = atoms[i].valence;
    }
    var topTier = atoms.filter(function (a) { return a.valence === maxValence; });
    var best = null, bestDist = Infinity;
    for (var j = 0; j < topTier.length; j++) {
      var a = topTier[j];
      var dx = a.x - x, dy = a.y - y;
      var d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = a; }
    }
    return best;
  }

  function findAnchor(x, y) {
    var withCapacity = placedAtoms.filter(function (a) { return a.bonds.length < a.valence; });
    var chosen = bestByValenceThenDistance(withCapacity, x, y);
    if (chosen) return chosen;
    return bestByValenceThenDistance(placedAtoms, x, y);
  }

  function angleIsFree(anchor, angleDeg) {
    for (var i = 0; i < anchor.bonds.length; i++) {
      if (Math.abs(normalizeAngleDiff(anchor.bonds[i].angle - angleDeg)) < BOND_ANGLE_TOLERANCE) {
        return false;
      }
    }
    return true;
  }

  function pickAngle(anchor) {
    for (var i = 0; i < BOND_CANDIDATE_ANGLES.length; i++) {
      if (angleIsFree(anchor, BOND_CANDIDATE_ANGLES[i])) return BOND_CANDIDATE_ANGLES[i];
    }
    var best = 0, bestScore = -1;
    for (var a = 0; a < 360; a += 10) {
      var minDiff = 360;
      for (var j = 0; j < anchor.bonds.length; j++) {
        var diff = Math.abs(normalizeAngleDiff(anchor.bonds[j].angle - a));
        if (diff < minDiff) minDiff = diff;
      }
      if (minDiff > bestScore) { bestScore = minDiff; best = a; }
    }
    return best;
  }

  function createBondLine(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var length = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    var line = document.createElement('div');
    line.className = 'bond-line';
    line.style.width = length + 'px';
    line.style.left = a.x + 'px';
    line.style.top = a.y + 'px';
    line.style.transform = 'rotate(' + angle + 'deg)';
    dropZoneEl.insertBefore(line, dropZoneEl.firstChild);
    return line;
  }

  function bondAtoms(anchor, atom, angleDeg) {
    var line = createBondLine(anchor, atom);
    anchor.bonds.push({ atom: atom, angle: angleDeg, line: line });
    atom.bonds.push({ atom: anchor, angle: (angleDeg + 180) % 360, line: line });
  }

  function placeAtom(el, dropX, dropY) {
    var radius = window.Units.radiusFor(el.z);
    var pos = { x: dropX, y: dropY };
    var anchor = null;
    var bondAngle = null;

    if (placedAtoms.length > 0) {
      anchor = findAnchor(dropX, dropY);
      if (anchor) {
        bondAngle = pickAngle(anchor);
        var bondLength = (anchor.radius + radius) * 0.85;
        var rad = bondAngle * Math.PI / 180;
        pos.x = anchor.x + Math.cos(rad) * bondLength;
        pos.y = anchor.y + Math.sin(rad) * bondLength;
      }
    }

    var zoneW = dropZoneEl.clientWidth || 300;
    var zoneH = dropZoneEl.clientHeight || 200;
    pos.x = clamp(pos.x, radius, Math.max(zoneW - radius, radius));
    pos.y = clamp(pos.y, radius, Math.max(zoneH - radius, radius));

    var node = document.createElement('div');
    node.className = 'placed-atom';
    node.style.width = node.style.height = (radius * 2) + 'px';
    node.style.left = (pos.x - radius) + 'px';
    node.style.top = (pos.y - radius) + 'px';
    node.style.background = el.color;
    node.textContent = el.symbol;
    dropZoneEl.appendChild(node);

    var atom = {
      symbol: el.symbol, z: el.z, radius: radius,
      x: pos.x, y: pos.y, node: node,
      valence: window.Units.getValence(el.symbol),
      bonds: []
    };

    if (anchor) {
      bondAtoms(anchor, atom, bondAngle);
    }

    placedAtoms.push(atom);

    // Sur mobile : re-taper sur la bulle la retire (elle "revient" dans la liste).
    if (isCoarsePointer) {
      node.style.pointerEvents = 'auto';
      node.addEventListener('click', function () { removeAtom(atom); });
    }

    updateFormulaDisplay();
    return atom;
  }

  function removeAtom(target) {
    target.node.remove();
    for (var i = 0; i < target.bonds.length; i++) {
      var b = target.bonds[i];
      b.line.remove();
      var other = b.atom;
      other.bonds = other.bonds.filter(function (ob) { return ob.atom !== target; });
    }
    placedAtoms = placedAtoms.filter(function (a) { return a !== target; });
    updateFormulaDisplay();
  }

  function computeCounts() {
    var counts = {};
    for (var i = 0; i < placedAtoms.length; i++) {
      var s = placedAtoms[i].symbol;
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }

  function updateFormulaDisplay() {
    if (!formulaEl || !nameEl) return;
    var counts = computeCounts();

    formulaEl.textContent = window.Molecules.buildFormula(counts);

    var name = window.Molecules.lookupName(counts);
    nameEl.classList.remove('formula-name--error');
    if (name === null) {
      nameEl.textContent = '';
    } else if (name === undefined) {
      nameEl.textContent = "Cette molécule n'existe pas";
      nameEl.classList.add('formula-name--error');
    } else {
      nameEl.textContent = name;
    }
  }

  function clearAll() {
    dropZoneEl.innerHTML = '';
    placedAtoms = [];
    updateFormulaDisplay();
  }

  function getPlacedAtoms() {
    return placedAtoms.slice();
  }

  function init() {
    atomsPanelEl = document.getElementById('atoms-panel');
    dropZoneEl = document.getElementById('drop-zone');
    clearBtnEl = document.getElementById('btn-clear');
    formulaEl = document.getElementById('formula-brute');
    nameEl = document.getElementById('formula-name');
    if (!atomsPanelEl || !dropZoneEl || !clearBtnEl) return;

    isCoarsePointer = detectCoarsePointer();
    if (isCoarsePointer) {
      document.body.classList.add('touch-mode');
    }

    renderPanel();
    clearBtnEl.addEventListener('click', clearAll);
    updateFormulaDisplay();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    clearAll: clearAll,
    placeAtom: placeAtom,
    removeAtom: removeAtom,
    getPlacedAtoms: getPlacedAtoms,
    isTouchMode: function () { return isCoarsePointer; }
  };
})();
