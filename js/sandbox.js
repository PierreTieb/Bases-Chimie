window.Sandbox = (function () {
  'use strict';

  var atomsPanelEl = null;
  var dropZoneEl = null;
  var clearBtnEl = null;
  var formulaEl = null;
  var nameEl = null;
  var placedAtoms = [];

  var BOND_CANDIDATE_ANGLES = [270, 90, 0, 180, 315, 135, 45, 225];
  var BOND_ANGLE_TOLERANCE = 25;

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
      cells[j].addEventListener('pointerdown', onCellPointerDown);
    }
  }

  function onCellPointerDown(evt) {
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

  // Cherche l'atome déjà posé le plus proche du point de dépôt, en préférant
  // un atome qui a encore de la "place" côté valence ; sinon le plus proche tout court.
  function findAnchor(x, y) {
    var withCapacity = null, withCapacityDist = Infinity;
    var any = null, anyDist = Infinity;

    for (var i = 0; i < placedAtoms.length; i++) {
      var a = placedAtoms[i];
      var dx = a.x - x, dy = a.y - y;
      var d = dx * dx + dy * dy;
      if (d < anyDist) { anyDist = d; any = a; }
      if (a.bonds.length < a.valence && d < withCapacityDist) {
        withCapacityDist = d; withCapacity = a;
      }
    }
    return withCapacity || any;
  }

  function angleIsFree(anchor, angleDeg) {
    for (var i = 0; i < anchor.usedAngles.length; i++) {
      if (Math.abs(normalizeAngleDiff(anchor.usedAngles[i] - angleDeg)) < BOND_ANGLE_TOLERANCE) {
        return false;
      }
    }
    return true;
  }

  function pickAngle(anchor) {
    for (var i = 0; i < BOND_CANDIDATE_ANGLES.length; i++) {
      if (angleIsFree(anchor, BOND_CANDIDATE_ANGLES[i])) return BOND_CANDIDATE_ANGLES[i];
    }
    // Repli : l'angle le plus éloigné de tous les angles déjà utilisés.
    var best = 0, bestScore = -1;
    for (var a = 0; a < 360; a += 10) {
      var minDiff = 360;
      for (var j = 0; j < anchor.usedAngles.length; j++) {
        var diff = Math.abs(normalizeAngleDiff(anchor.usedAngles[j] - a));
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
  }

  function bondAtoms(anchor, atom, angleDeg) {
    anchor.bonds.push(atom);
    atom.bonds.push(anchor);
    anchor.usedAngles.push(angleDeg);
    atom.usedAngles.push((angleDeg + 180) % 360);
    createBondLine(anchor, atom);
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
      bonds: [], usedAngles: []
    };

    if (anchor) {
      bondAtoms(anchor, atom, bondAngle);
    }

    placedAtoms.push(atom);
    updateFormulaDisplay();
    return atom;
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

    renderPanel();
    clearBtnEl.addEventListener('click', clearAll);
    updateFormulaDisplay();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    clearAll: clearAll,
    placeAtom: placeAtom,
    getPlacedAtoms: getPlacedAtoms
  };
})();
