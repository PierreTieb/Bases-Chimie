// Moteur de construction de molécule : à chaque ajout ou retrait d'atome, TOUTE
// la structure est recalculée depuis zéro (pas d'ajout incrémental "figé"). Ça
// permet à l'atome le plus pertinent (valence, puis masse en repli, puis un
// éventuel indice de centre défini dans Molecules) de se retrouver au centre
// même s'il a été posé en dernier (ex: H,H,H,H,C -> C se replace au milieu).
window.MoleculeBuilder = (function () {
  'use strict';

  var BOND_CANDIDATE_ANGLES = [270, 90, 0, 180, 315, 135, 45, 225];
  var ZIGZAG_OFFSETS = [150, -150, 120, -120, 90, -90, 60, -60, 30, -30, 0, 180];
  var BOND_ANGLE_TOLERANCE = 25;

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
  function normalizeAngleDiff(d) { return ((d + 180) % 360 + 360) % 360 - 180; }

  function tally(list) {
    var c = {};
    list.forEach(function (s) { c[s] = (c[s] || 0) + 1; });
    return c;
  }

  // Ordre de placement : indice de centre explicite (Molecules) en premier,
  // puis valence décroissante, puis masse décroissante en repli. Purement
  // interne au calcul : jamais montré à l'utilisateur.
  function orderForLayout(symbols) {
    var counts = tally(symbols);
    var centerHint = (window.Molecules && window.Molecules.getCenterHint)
      ? window.Molecules.getCenterHint(counts) : null;

    var arr = symbols.slice();
    arr.sort(function (a, b) {
      if (centerHint) {
        var aIs = a === centerHint, bIs = b === centerHint;
        if (aIs && !bIs) return -1;
        if (bIs && !aIs) return 1;
      }
      var va = window.Units.getValence(a), vb = window.Units.getValence(b);
      if (vb !== va) return vb - va;
      var ma = window.Units.getBySymbol(a).mass, mb = window.Units.getBySymbol(b).mass;
      return mb - ma;
    });
    return arr;
  }

  function create(dropZoneEl, options) {
    options = options || {};
    var onChange = typeof options.onChange === 'function' ? options.onChange : null;
    var removable = !!options.removable;

    var sequence = [];   // symboles dans l'ordre d'ajout par l'utilisateur
    var placedAtoms = []; // reconstruit intégralement à chaque reflow()

    function bestByValenceThenDistance(atoms, x, y) {
      if (atoms.length === 0) return null;
      var maxValence = -Infinity;
      for (var i = 0; i < atoms.length; i++) if (atoms[i].valence > maxValence) maxValence = atoms[i].valence;
      var topTier = atoms.filter(function (a) { return a.valence === maxValence; });
      var best = null, bestDist = Infinity;
      for (var j = 0; j < topTier.length; j++) {
        var a = topTier[j];
        var d = (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y);
        if (d < bestDist) { bestDist = d; best = a; }
      }
      return best;
    }

    function findAnchor(x, y) {
      var withCapacity = placedAtoms.filter(function (a) { return a.bonds.length < a.valence; });
      return bestByValenceThenDistance(withCapacity, x, y) || bestByValenceThenDistance(placedAtoms, x, y);
    }

    function angleIsFree(anchor, angleDeg) {
      for (var i = 0; i < anchor.bonds.length; i++) {
        if (Math.abs(normalizeAngleDiff(anchor.bonds[i].angle - angleDeg)) < BOND_ANGLE_TOLERANCE) return false;
      }
      return true;
    }

    function pickAngle(anchor) {
      var candidates;
      if (anchor.bonds.length > 0) {
        var inAngle = anchor.bonds[anchor.bonds.length - 1].angle;
        candidates = ZIGZAG_OFFSETS.map(function (off) { return (inAngle + off + 360) % 360; }).concat(BOND_CANDIDATE_ANGLES);
      } else {
        candidates = BOND_CANDIDATE_ANGLES;
      }
      for (var i = 0; i < candidates.length; i++) if (angleIsFree(anchor, candidates[i])) return candidates[i];
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

    function resolveOverlap(pos, radius) {
      for (var iter = 0; iter < 8; iter++) {
        var moved = false;
        for (var i = 0; i < placedAtoms.length; i++) {
          var other = placedAtoms[i];
          var dx = pos.x - other.x, dy = pos.y - other.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var minDist = (radius + other.radius) * 0.55;
          if (dist < minDist) {
            var angle = (dist < 0.01) ? (Math.random() * Math.PI * 2) : Math.atan2(dy, dx);
            var push = (minDist - dist) + 1;
            pos.x += Math.cos(angle) * push;
            pos.y += Math.sin(angle) * push;
            moved = true;
          }
        }
        if (!moved) break;
      }
      return pos;
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
      createBondLine(anchor, atom);
      anchor.bonds.push({ atom: atom, angle: angleDeg });
      atom.bonds.push({ atom: anchor, angle: (angleDeg + 180) % 360 });
    }

    function placeOne(el) {
      var radius = window.Units.radiusFor(el.z);
      var zoneW = dropZoneEl.clientWidth || 300;
      var zoneH = dropZoneEl.clientHeight || 200;
      var cx = zoneW / 2, cy = zoneH / 2;
      var pos = { x: cx, y: cy };
      var anchor = null, bondAngle = null;

      if (placedAtoms.length > 0) {
        anchor = findAnchor(cx, cy);
        if (anchor) {
          bondAngle = pickAngle(anchor);
          var bondLength = (anchor.radius + radius) * 0.85;
          var rad = bondAngle * Math.PI / 180;
          pos.x = anchor.x + Math.cos(rad) * bondLength;
          pos.y = anchor.y + Math.sin(rad) * bondLength;
        }
      }

      resolveOverlap(pos, radius);
      pos.x = clamp(pos.x, radius, Math.max(zoneW - radius, radius));
      pos.y = clamp(pos.y, radius, Math.max(zoneH - radius, radius));

      var node = document.createElement('div');
      node.className = 'placed-atom';
      node.dataset.symbol = el.symbol;
      node.style.width = node.style.height = (radius * 2) + 'px';
      node.style.left = (pos.x - radius) + 'px';
      node.style.top = (pos.y - radius) + 'px';
      node.style.background = el.color;
      node.textContent = el.symbol;
      if (removable) node.style.pointerEvents = 'auto';
      dropZoneEl.appendChild(node);

      var atom = {
        symbol: el.symbol, z: el.z, radius: radius, x: pos.x, y: pos.y, node: node,
        valence: window.Units.getValence(el.symbol), bonds: []
      };
      if (anchor) bondAtoms(anchor, atom, bondAngle);
      placedAtoms.push(atom);
    }

    function reflow() {
      dropZoneEl.innerHTML = '';
      placedAtoms = [];
      orderForLayout(sequence).forEach(function (sym) {
        var el = window.Units.getBySymbol(sym);
        if (el) placeOne(el);
      });
      if (onChange) onChange(tally(sequence));
    }

    function addSymbol(symbol) { sequence.push(symbol); reflow(); }
    function removeOneOf(symbol) {
      var idx = sequence.lastIndexOf(symbol);
      if (idx === -1) return;
      sequence.splice(idx, 1);
      reflow();
    }
    function clearAll() { sequence = []; reflow(); }
    function getCounts() { return tally(sequence); }
    function getSequence() { return sequence.slice(); }

    if (removable) {
      dropZoneEl.addEventListener('click', function (evt) {
        var target = evt.target.closest ? evt.target.closest('.placed-atom') : null;
        if (target && target.dataset.symbol) removeOneOf(target.dataset.symbol);
      });
    }

    return {
      addSymbol: addSymbol,
      removeOneOf: removeOneOf,
      clearAll: clearAll,
      getCounts: getCounts,
      getSequence: getSequence,
      // Compatibilité avec les appelants existants (sandbox.js) :
      placeAtom: function (el) { addSymbol(el.symbol); },
      placeAtomAuto: function (el) { addSymbol(el.symbol); },
      getPlacedAtoms: function () { return placedAtoms.slice(); }
    };
  }

  return { create: create };
})();
