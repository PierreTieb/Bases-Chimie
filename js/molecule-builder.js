// Moteur pur de placement/accrochage d'atomes dans un conteneur donné.
// Ne connaît rien du panneau des 20 atomes ni du mode d'interaction (souris,
// tactile...) : c'est la brique de base réutilisée par Sandbox (bac à sable
// interactif) et par l'aperçu statique des questions "identifier" du Mode 1-2.
window.MoleculeBuilder = (function () {
  'use strict';

  var BOND_CANDIDATE_ANGLES = [270, 90, 0, 180, 315, 135, 45, 225];
  var BOND_ANGLE_TOLERANCE = 25;

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function normalizeAngleDiff(d) {
    return ((d + 180) % 360 + 360) % 360 - 180;
  }

  function create(dropZoneEl, options) {
    options = options || {};
    var onChange = typeof options.onChange === 'function' ? options.onChange : null;
    var placedAtoms = [];

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

    // Cherche l'atome déjà posé le plus adapté pour accrocher le nouvel atome :
    // priorité à l'atome "central" de plus grande valence disponible (ex: le
    // carbone), et seulement à centralité égale on prend le plus proche du
    // point visé.
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

    // Angles "zigzag" relatifs à la dernière liaison de l'ancre : évite que des
    // chaînes d'atomes divalents (O-S-O, O-Ca-O...) ne s'alignent parfaitement
    // à la verticale (candidats fixes = 270°/90° en premier) et se chevauchent.
    var ZIGZAG_OFFSETS = [150, -150, 120, -120, 90, -90, 60, -60, 30, -30, 0, 180];

    function pickAngle(anchor) {
      var candidates;
      if (anchor.bonds.length > 0) {
        var inAngle = anchor.bonds[anchor.bonds.length - 1].angle;
        candidates = ZIGZAG_OFFSETS.map(function (off) { return (inAngle + off + 360) % 360; })
          .concat(BOND_CANDIDATE_ANGLES);
      } else {
        candidates = BOND_CANDIDATE_ANGLES;
      }
      for (var i = 0; i < candidates.length; i++) {
        if (angleIsFree(anchor, candidates[i])) return candidates[i];
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

    // Filet de sécurité : si un atome tombe trop près d'un atome déjà posé
    // (chevauchement quasi total, notamment quand le conteneur est petit et
    // qu'une chaîne se fait repousser contre un bord), on l'écarte légèrement.
    // Objectif : ne jamais rendre un atome invisible derrière un autre.
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
      return line;
    }

    function bondAtoms(anchor, atom, angleDeg) {
      var line = createBondLine(anchor, atom);
      anchor.bonds.push({ atom: atom, angle: angleDeg, line: line });
      atom.bonds.push({ atom: anchor, angle: (angleDeg + 180) % 360, line: line });
    }

    function notifyChange() {
      if (onChange) onChange(getCounts());
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

      resolveOverlap(pos, radius);

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

      if (anchor) bondAtoms(anchor, atom, bondAngle);

      placedAtoms.push(atom);
      notifyChange();
      return atom;
    }

    // Place l'atome au centre du conteneur (utilisé pour le "tap to add" mobile
    // et pour générer un aperçu statique sans point de dépôt précis).
    function placeAtomAuto(el) {
      var zoneW = dropZoneEl.clientWidth || 300;
      var zoneH = dropZoneEl.clientHeight || 200;
      return placeAtom(el, zoneW / 2, zoneH / 2);
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
      notifyChange();
    }

    function clearAll() {
      dropZoneEl.innerHTML = '';
      placedAtoms = [];
      notifyChange();
    }

    function getPlacedAtoms() {
      return placedAtoms.slice();
    }

    function getCounts() {
      var counts = {};
      for (var i = 0; i < placedAtoms.length; i++) {
        var s = placedAtoms[i].symbol;
        counts[s] = (counts[s] || 0) + 1;
      }
      return counts;
    }

    return {
      placeAtom: placeAtom,
      placeAtomAuto: placeAtomAuto,
      removeAtom: removeAtom,
      clearAll: clearAll,
      getPlacedAtoms: getPlacedAtoms,
      getCounts: getCounts
    };
  }

  return { create: create };
})();
