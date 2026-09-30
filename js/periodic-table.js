// periodic-table.js
// Tableau périodique compact (18 colonnes) réutilisé partout :
// - cliquable (sélection d'un atome) : tableau sur grand écran, sinon liste défilante ;
// - non cliquable (consultation dans les exercices) : "image" que l'on peut faire défiler.
window.PeriodicTable = (function () {
  'use strict';

  var NOBLE = { He: 1, Ne: 1, Ar: 1 };

  // Tableau compact : on supprime le "vide" entre les deux blocs (8 colonnes au lieu de 18).
  // z -> [ligne, colonne]
  function pos(z) {
    if (z === 1) return [1, 1];
    if (z === 2) return [1, 8];
    if (z <= 10) return [2, z - 2];
    if (z <= 18) return [3, z - 10];
    return [4, z - 18];                 // K, Ca : 4e ligne
  }

  function tableHTML(maxZ, clickable, row4) {
    var html = '<div class="pt-grid">';
    window.Units.getAll().forEach(function (el) {
      if (maxZ && el.z > maxZ) return;
      if (el.z > 18 && !row4) return;
      var p = pos(el.z);
      html += '<div class="pt-cell' + (clickable ? ' pt-cell--click' : '') +
        (NOBLE[el.symbol] ? ' pt-cell--noble' : '') + '"' +
        ' style="grid-row:' + p[0] + ';grid-column:' + p[1] + '"' +
        (clickable ? ' data-z="' + el.z + '"' : '') + ' title="' + el.name + '">' +
        '<span class="pt-mass">' + el.mass + '</span>' +
        '<span class="pt-z">' + el.z + '</span>' +
        '<span class="pt-sym">' + el.symbol + '</span></div>';
    });
    return html + '</div>';
  }

  function bindClicks(gridEl, onPick) {
    gridEl.querySelectorAll('[data-z]').forEach(function (c) {
      c.addEventListener('click', function () { onPick(parseInt(c.getAttribute('data-z'), 10)); });
    });
  }

  // Sélecteur cliquable : même tableau compact, cases cliquables.
  function renderPicker(gridEl, onPick, maxZ, opts) {
    gridEl.className = 'pt-scroll';
    gridEl.innerHTML = tableHTML(maxZ, true, !!(opts && opts.row4));
    bindClicks(gridEl, onPick);
  }

  // Tableau de consultation (non cliquable), jusqu'à l'argon.
  function renderView(containerEl, maxZ) {
    containerEl.className = 'pt-scroll';
    containerEl.innerHTML = tableHTML(maxZ || 18, false, false);
  }

  // Un clic en dehors du panneau ferme la fenêtre.
  function wireOverlay(overlayEl) {
    if (!overlayEl) return;
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) overlayEl.style.display = 'none';
    });
  }

  return { renderPicker: renderPicker, renderView: renderView, wireOverlay: wireOverlay };
})();
