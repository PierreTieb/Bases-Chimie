// Contrôleur d'un bac à sable : panneau des 20 atomes + zone de dépôt.
// Sandbox.create(config) permet d'avoir plusieurs instances indépendantes
// (Mode 1-1, et l'exercice "construire" du Mode 1-2).
window.Sandbox = (function () {
  'use strict';

  function detectCoarsePointer() {
    try {
      return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    } catch (e) {
      return false;
    }
  }

  function create(config) {
    var panelEl = config.panelEl;
    var dropZoneEl = config.dropZoneEl;
    var clearBtnEl = config.clearBtnEl;
    var formulaEl = config.formulaEl || null;
    var nameEl = config.nameEl || null;

    if (!panelEl || !dropZoneEl) return null;

    var isCoarsePointer = detectCoarsePointer();
    if (isCoarsePointer) document.body.classList.add('touch-mode');

    function updateDisplay(counts) {
      if (formulaEl) formulaEl.textContent = window.Molecules.buildFormula(counts);
      if (nameEl) {
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
    }

    var builder = window.MoleculeBuilder.create(dropZoneEl, { onChange: updateDisplay });

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
      panelEl.innerHTML = html;

      var cells = panelEl.querySelectorAll('.element-cell');
      for (var j = 0; j < cells.length; j++) {
        if (isCoarsePointer) {
          cells[j].addEventListener('click', onCellTapMobile);
        } else {
          cells[j].addEventListener('pointerdown', onCellPointerDownDesktop);
        }
      }
    }

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
          builder.placeAtom(el, x - rect.left, y - rect.top);
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

    function onCellTapMobile(evt) {
      var symbol = evt.currentTarget.getAttribute('data-symbol');
      var el = window.Units.getBySymbol(symbol);
      if (!el) return;
      builder.placeAtomAuto(el);
      var atoms = builder.getPlacedAtoms();
      var last = atoms[atoms.length - 1];
      if (last) {
        last.node.style.pointerEvents = 'auto';
        last.node.addEventListener('click', function () { builder.removeAtom(last); });
      }
    }

    if (clearBtnEl) clearBtnEl.addEventListener('click', builder.clearAll);

    renderPanel();
    updateDisplay(builder.getCounts());

    return {
      clearAll: builder.clearAll,
      placeAtom: builder.placeAtom,
      placeAtomAuto: builder.placeAtomAuto,
      removeAtom: builder.removeAtom,
      getPlacedAtoms: builder.getPlacedAtoms,
      getCounts: builder.getCounts,
      isTouchMode: function () { return isCoarsePointer; }
    };
  }

  return { create: create };
})();
