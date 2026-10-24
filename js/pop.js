// pop.js
// Fenêtre partagée par les leçons, le Challenge et les questions à choix.
// Pop.open(html, onAction, opts) : les boutons [data-pop="…"] appellent onAction(action, bouton) ;
// data-pop="close" ferme la fenêtre. opts.wide : fenêtre large ; opts.lock : un clic sur le fond ne ferme pas.
window.Pop = (function () {
  'use strict';

  var ov = null, card = null, handler = null, locked = false;

  // La fenêtre prend les couleurs d'accent de l'écran affiché (elle est hors des écrans)
  function tint() {
    var scr = document.querySelector('.screen.active'), cs = scr ? window.getComputedStyle(scr) : null;
    ['--acc-light', '--acc-mid', '--acc-dark', '--acc-text'].forEach(function (v) {
      var val = cs ? cs.getPropertyValue(v).trim() : '';
      if (val) card.style.setProperty(v, val); else card.style.removeProperty(v);
    });
  }

  function open(html, onAction, opts) {
    opts = opts || {};
    tint();
    card.innerHTML = html;
    card.classList.toggle('pop-card--wide', !!opts.wide);
    card.scrollTop = 0;
    handler = onAction || null;
    locked = !!opts.lock;
    ov.style.display = 'flex';
  }
  function close() { ov.style.display = 'none'; handler = null; }
  function isOpen() { return ov && ov.style.display === 'flex'; }

  document.addEventListener('DOMContentLoaded', function () {
    ov = document.getElementById('pop-overlay');
    card = document.getElementById('pop-card');
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pop]');
      if (b) {
        var a = b.getAttribute('data-pop'), h = handler;
        if (a === 'close') close();
        if (h) h(a, b);
        return;
      }
      if (e.target === ov && !locked) close();
    });
  });

  return { open: open, close: close, isOpen: isOpen };
})();
