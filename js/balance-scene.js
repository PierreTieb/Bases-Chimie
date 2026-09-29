// balance-scene.js
// Espace "schéma" réutilisable (mode Expert) : une zone par substance, séparées par les "+"
// nécessaires et la flèche. Une zone peut être vide ; on y pose une molécule (comptage d'atomes)
// répétée n fois. Chaque molécule est mesurée (boîte englobante) puis réduite pour tenir dans
// sa zone ; la largeur des zones est répartie selon la taille des molécules.
window.BalanceScene = (function () {
  'use strict';

  var PAD = 3;          // marge autour d'une molécule mesurée (px)
  var EMPTY_W = 60;     // "poids" d'une zone vide

  function sigOf(counts) {
    return Object.keys(counts).filter(function (k) { return counts[k] > 0; }).sort()
      .map(function (k) { return k + ':' + counts[k]; }).join(',');
  }

  function expand(counts) {
    var out = [];
    Object.keys(counts).forEach(function (s) { for (var i = 0; i < counts[s]; i++) out.push(s); });
    return out;
  }

  function create(rowEl) {
    var groups = [];      // { el, cells: [], sig, counts }
    var boxCache = {};    // signature -> boîte englobante

    // types : ['reactif', 'reactif', 'produit', ...] -> zones vides + signes
    function setSlots(types) {
      rowEl.innerHTML = '';
      groups = [];
      types.forEach(function (t, i) {
        if (i > 0) {
          var s = document.createElement('span');
          s.className = 'bal-sign';
          s.textContent = t !== types[i - 1] ? '\u2192' : '+';
          rowEl.appendChild(s);
        }
        var g = document.createElement('div');
        g.className = 'bal-group';
        rowEl.appendChild(g);
        groups.push({ el: g, cells: [], sig: null, counts: null });
      });
      layout();
    }

    function clear(g) {
      while (g.cells.length) g.el.removeChild(g.cells.pop());
      g.sig = null;
      g.counts = null;
    }

    function makeCell(g) {
      var cell = document.createElement('div');
      cell.className = 'bal-cell bal-pop';
      var mol = document.createElement('div');
      mol.className = 'bal-free';
      cell.appendChild(mol);
      g.el.appendChild(cell);                       // dans le DOM avant de construire (le builder mesure la zone)
      var b = window.MoleculeBuilder.create(mol);
      expand(g.counts).forEach(function (sym) { b.addSymbol(sym); });

      if (!boxCache[g.sig]) {
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        b.getPlacedAtoms().forEach(function (a) {
          x0 = Math.min(x0, a.x - a.radius); y0 = Math.min(y0, a.y - a.radius);
          x1 = Math.max(x1, a.x + a.radius); y1 = Math.max(y1, a.y + a.radius);
        });
        boxCache[g.sig] = { x: x0 - PAD, y: y0 - PAD, w: (x1 - x0) + 2 * PAD, h: (y1 - y0) + 2 * PAD };
      }
      cell.addEventListener('animationend', function () { cell.classList.remove('bal-pop'); });
      return cell;
    }

    // Pose (ou remplace) la molécule de la zone i, n fois. counts = null ou n < 1 : zone vidée.
    function setSlot(i, counts, n) {
      var g = groups[i];
      if (!g) return;
      if (!counts || !(n >= 1)) {
        clear(g);
      } else {
        var sig = sigOf(counts);
        if (sig !== g.sig) { clear(g); g.sig = sig; g.counts = counts; }
        n = Math.min(n, 9);
        while (g.cells.length > n) g.el.removeChild(g.cells.pop());
        while (g.cells.length < n) g.cells.push(makeCell(g));
      }
      layout();
    }

    function layoutGroup(g) {
      var box = g.sig && boxCache[g.sig], n = g.cells.length;
      if (!box || !n) return;
      var W = g.el.clientWidth, H = g.el.clientHeight;
      var best = { s: 0, c: 1 };
      for (var c = 1; c <= n; c++) {
        var r = Math.ceil(n / c);
        var s = Math.min(1, W / (c * box.w), H / (r * box.h));
        if (s > best.s) best = { s: s, c: c };
      }
      var cw = box.w * best.s, ch = box.h * best.s;
      g.el.style.gridTemplateColumns = 'repeat(' + best.c + ', ' + cw + 'px)';
      g.el.style.gridAutoRows = ch + 'px';
      g.cells.forEach(function (cell) {
        cell.style.width = cw + 'px';
        cell.style.height = ch + 'px';
        cell.firstChild.style.transform =
          'scale(' + best.s + ') translate(' + (-box.x) + 'px,' + (-box.y) + 'px)';
      });
    }

    function layout() {
      groups.forEach(function (g) {                 // largeur de zone proportionnelle à son contenu
        var box = g.sig && boxCache[g.sig];
        g.el.style.flex = Math.max(box ? box.w : EMPTY_W, 40) + ' 1 0';
      });
      groups.forEach(layoutGroup);
    }

    return { setSlots: setSlots, setSlot: setSlot, layout: layout };
  }

  return { create: create };
})();
