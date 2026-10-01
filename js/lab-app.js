// lab-app.js
// Mode "Identifier les ions" : mini-labo.
//  - Labo libre : on choisit un ion, on teste soude / nitrate d'argent / flamme.
//  - Faire des tests : un ion inconnu est dans le tube, il faut l'identifier.
// Règle des tests : un précipité bloque tout nouveau test (il faut vider) ;
// un test sans effet n'empêche pas les suivants.
(function () {
  'use strict';

  var K = window.AtomKit;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Données ----------
  var IONS = [
    { key: 'Cu2+', sym: 'Cu', charge: 2 }, { key: 'Cl-', sym: 'Cl', charge: -1 },
    { key: 'Al3+', sym: 'Al', charge: 3 }, { key: 'Zn2+', sym: 'Zn', charge: 2 },
    { key: 'Li+', sym: 'Li', charge: 1 },  { key: 'Na+', sym: 'Na', charge: 1 },
    { key: 'Fe2+', sym: 'Fe', charge: 2 }, { key: 'Fe3+', sym: 'Fe', charge: 3 },
    { key: 'Ca2+', sym: 'Ca', charge: 2 }
  ];
  var PREC_COLOR = { bleu: '#3E86E0', vert: '#6FA862', rouille: '#B4531F', blanc: '#FFFFFF' };
  var DATA = {
    naoh: { 'Cu2+': 'bleu', 'Fe2+': 'vert', 'Fe3+': 'rouille', 'Zn2+': 'blanc', 'Al3+': 'blanc' },
    ag:   { 'Cl-': 'blanc' },
    flame: {
      'Na+':  { name: 'jaune',         color: '#FFD91A' },
      'Cu2+': { name: 'vert bleuté',   color: '#2FD3B0' },
      'Li+':  { name: 'rouge fuchsia', color: '#E0207F' },
      'Ca2+': { name: 'jaune orangé',  color: '#FF9A1F' }
    }
  };
  var FLAME_NORMAL = '#FFAA3C';
  var REACTIFS = {
    naoh: { label: 'la soude' },
    ag: { label: "le nitrate d'argent" }
  };

  // ---------- Géométrie de la scène (viewBox 360 x 270) ----------
  var FL_REST = { naoh: [42, 160], ag: [112, 160] };
  var TUBE = [205, 110];          // embouchure du tube au repos
  var BURN = [305, 185];          // sommet du bec
  var TUBE_FLAME = [300, 100];    // embouchure du tube quand il est incliné au-dessus de la flamme

  function ionHTML(i) { return i.sym + K.chargeSup(i.charge); }
  function pos(t) { return '<span class="ion-pos">' + t + '</span>'; }
  function chargeTxt(c) { var n = Math.abs(c); return (n > 1 ? n : '') + (c > 0 ? '+' : '\u2212'); }
  function byKey(k) { return IONS.filter(function (i) { return i.key === k; })[0]; }
  function move(el, x, y, rot) {
    el.style.transform = 'translate(' + x + 'px,' + y + 'px)' + (rot ? ' rotate(' + rot + 'deg)' : '');
  }
  function confetti(anchor) {
    var canvas = $('confetti-canvas');
    if (!window.Confetti || !canvas) return;
    try {
      var r = anchor.getBoundingClientRect();
      window.Confetti.burst(canvas, r.left + r.width / 2, r.top + r.height / 2);
    } catch (e) { /* décoratif */ }
  }

  // ---------- Icônes pour le tableau de données ----------
  function tubeIcon(color) {
    var blob = color
      ? '<ellipse cx="12" cy="38" rx="6.5" ry="4.5" fill="' + PREC_COLOR[color] + '" stroke="#8C98A4" stroke-width=".8"/>' +
        '<ellipse cx="10" cy="34" rx="4" ry="2.6" fill="' + PREC_COLOR[color] + '" stroke="#8C98A4" stroke-width=".6"/>'
      : '';
    return '<svg viewBox="0 0 24 46" width="24" height="44" aria-hidden="true">' +
      '<path d="M5 3 V35 A7 7 0 0 0 19 35 V3" fill="rgba(180,220,240,.45)" stroke="#8FA3B3" stroke-width="1.6"/>' + blob + '</svg>';
  }
  function flameIcon(color) {
    return '<svg viewBox="-12 0 24 36" width="24" height="36" aria-hidden="true">' +
      '<path d="M0 34 C-10 30 -10 14 0 2 C10 14 10 30 0 34 Z" fill="' + color + '" fill-opacity=".85"/>' +
      '<path d="M0 34 C-5 32 -5 24 0 17 C5 24 5 32 0 34 Z" fill="#4A8CFF" fill-opacity=".8"/></svg>';
  }
  function dataHTML() {
    var order1 = ['Cl-', 'Cu2+', 'Fe2+', 'Fe3+', 'Zn2+', 'Al3+'];
    function cell(color, what) {
      return '<td>' + tubeIcon(color) + '<span class="lab-cap">' + (color ? 'précipité ' + color : 'rien') + '</span></td>';
    }
    var t1 = '<table class="lab-table"><thead><tr><th>Ion</th><th>Soude<br><small>NaOH</small></th>' +
      '<th>Nitrate d\'argent<br><small>AgNO\u2083</small></th></tr></thead><tbody>';
    order1.forEach(function (k) {
      t1 += '<tr><th class="lab-ion-cell">' + ionHTML(byKey(k)) + '</th>' + cell(DATA.naoh[k]) + cell(DATA.ag[k]) + '</tr>';
    });
    t1 += '</tbody></table>';
    var t2 = '<table class="lab-table"><thead><tr><th>Ion</th><th>Flamme</th></tr></thead><tbody>';
    ['Na+', 'Cu2+', 'Li+', 'Ca2+'].forEach(function (k) {
      var f = DATA.flame[k];
      t2 += '<tr><th class="lab-ion-cell">' + ionHTML(byKey(k)) + '</th><td>' + flameIcon(f.color) +
        '<span class="lab-cap">' + f.name + '</span></td></tr>';
    });
    t2 += '</tbody></table>';
    return '<p class="lab-table-title">Tests chimiques</p>' + t1 + '<p class="lab-table-title">Test à la flamme</p>' + t2;
  }

  // ---------- Scène SVG ----------
  function flaskSVG(id, formula, l1, l2, body, cap) {
    return '<g class="lab-flask" id="' + id + '" role="button" aria-label="Flacon ' + formula + '">' +
      '<rect x="-5" y="0" width="10" height="13" rx="2" fill="' + cap + '"/>' +
      '<path d="M-5 12 L5 12 L26 28 L-26 28 Z" fill="' + body + '" stroke="#7E95A6" stroke-width="1.5"/>' +
      '<rect x="-28" y="26" width="56" height="64" rx="11" fill="' + body + '" stroke="#7E95A6" stroke-width="1.5"/>' +
      '<rect x="-22" y="38" width="44" height="43" rx="4" fill="#fff" fill-opacity=".95"/>' +
      '<text x="0" y="53" text-anchor="middle" font-size="11" font-weight="800" fill="#1F2A36">' + formula + '</text>' +
      '<text x="0" y="65" text-anchor="middle" font-size="8" fill="#3C4A58">' + l1 + '</text>' +
      (l2 ? '<text x="0" y="74" text-anchor="middle" font-size="8" fill="#3C4A58">' + l2 + '</text>' : '') +
      '</g>';
  }
  function sceneSVG(p) {
    var f = window.Molecules.formatSubscripts;
    return '<svg class="lab-svg" viewBox="0 0 360 270" role="img" aria-label="Laboratoire">' +
      '<defs><clipPath id="' + p + '-clip"><path d="M-13 0 V108 A13 13 0 0 0 13 108 V0 Z"/></clipPath></defs>' +
      '<rect x="0" y="250" width="360" height="20" class="lab-table-top"/>' +
      '<rect x="178" y="232" width="54" height="18" rx="6" fill="#C79A6B"/>' +
      // bec
      '<g id="' + p + '-burner" class="lab-burner" role="button" aria-label="Bec benzène">' +
        '<rect x="276" y="120" width="58" height="130" fill="transparent"/>' +
        '<rect x="283" y="240" width="44" height="10" rx="4" fill="#5B6773"/>' +
        '<rect x="297" y="190" width="16" height="52" fill="#8693A0"/>' +
        '<rect x="293" y="212" width="24" height="9" rx="3" fill="#5B6773"/>' +
        '<rect x="298" y="183" width="14" height="9" rx="2" fill="#5B6773"/>' +
      '</g>' +
      '<g class="lab-flame" id="' + p + '-flame" style="opacity:0">' +
        '<g transform="translate(305,185)">' +
          '<path id="' + p + '-fout" d="M0 0 C-17 -8 -15 -36 0 -62 C15 -36 17 -8 0 0 Z" fill="' + FLAME_NORMAL + '" fill-opacity=".45"/>' +
          '<path d="M0 0 C-8 -4 -8 -17 0 -28 C8 -17 8 -4 0 0 Z" fill="#3D7BFF" fill-opacity=".85"/>' +
        '</g></g>' +
      // flacons
      flaskSVG(p + '-fl-naoh', 'NaOH', 'Soude', '', 'rgba(190,225,240,.85)', '#2B3A67') +
      flaskSVG(p + '-fl-ag', f('AgNO3'), 'Nitrate', "d'argent", 'rgba(201,139,58,.9)', '#2B2B2B') +
      // tube
      '<g class="lab-tube" id="' + p + '-tube" style="opacity:0">' +
        '<g clip-path="url(#' + p + '-clip)">' +
          '<rect x="-14" y="34" width="28" height="100" fill="rgba(160,210,235,.55)"/>' +
          '<rect id="' + p + '-cloud" x="-14" y="34" width="28" height="100" fill="#fff" style="opacity:0;transition:opacity .8s"/>' +
          '<g id="' + p + '-blob" style="opacity:0;transition:opacity .9s">' +
            '<ellipse cx="0" cy="113" rx="13" ry="9" class="lab-blob"/><ellipse cx="-3" cy="104" rx="9" ry="5" class="lab-blob"/>' +
          '</g>' +
        '</g>' +
        '<path d="M-14 0 V108 A14 14 0 0 0 14 108 V0" fill="rgba(255,255,255,.18)" stroke="#8FA3B3" stroke-width="2.2" stroke-linecap="round"/>' +
        '<rect x="-17" y="-2" width="34" height="5" rx="2.5" fill="#8FA3B3"/>' +
        '<rect x="-13" y="50" width="26" height="22" rx="4" fill="#fff" fill-opacity=".95"/>' +
        '<text id="' + p + '-label" x="0" y="65" text-anchor="middle" font-size="10" font-weight="800" fill="#1F2A36"></text>' +
      '</g>' +
      '<circle id="' + p + '-drop" r="4" cx="0" cy="0" style="opacity:0"/>' +
    '</svg>';
  }

  // ============================================================
  function createLab(cfg) {
    var p = cfg.prefix, free = cfg.mode === 'free';
    var root = null, els = {};
    var ion = null, precip = null, busy = false, lit = false;
    var timers = [], flameTimer = null;
    var unknown = null, lastUnknown = null, chosen = null, found = false;

    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; clearTimeout(flameTimer); }
    function say(html, cls) {
      els.feedback.innerHTML = html;
      els.feedback.className = 'ex-feedback' + (cls ? ' ' + cls : '');
    }

    function tpl() {
      var tools = '<div class="lab-tools">' +
        '<button type="button" class="btn-secondary lab-mini" id="' + p + '-empty">Vider</button>' +
        '<button type="button" class="btn-secondary lab-mini" id="' + p + '-off" style="display:none">Éteindre le bec</button>' +
        '<button type="button" class="btn-secondary lab-mini" id="' + p + '-data">Tableau de données</button></div>';
      var bottom = free
        ? '<div class="ex-actions"><button type="button" class="btn-primary" id="' + p + '-totest">Faire des tests</button></div>'
        : '<div class="ex-actions"><button type="button" class="btn-secondary" id="' + p + '-choose">Quel ion est dans le tube ?</button>' +
          '<button type="button" class="btn-primary" id="' + p + '-validate" disabled>Valider</button></div>' +
          '<div class="ex-actions"><button type="button" class="btn-secondary lab-mini" id="' + p + '-tolab">Retourner au labo</button></div>';
      var grid = IONS.map(function (i) {
        return '<button type="button" class="lab-ion-btn" data-k="' + i.key + '">' + ionHTML(i) + '</button>';
      }).join('');
      return '<button type="button" class="btn-back" id="' + p + '-back">← Retour</button>' +
        '<h1 class="app-title app-title--small">' + cfg.title + '</h1>' +
        '<p class="app-subtitle lab-intro">' + cfg.intro + '</p>' +
        (free ? '<div class="ex-actions"><button type="button" class="btn-secondary" id="' + p + '-select">Sélectionner un ion</button></div>' : '') +
        '<div class="lab-board"><div class="lab-scene">' + sceneSVG(p) + '</div></div>' +
        '<p class="ex-feedback" id="' + p + '-feedback"></p>' + tools + bottom +
        '<div class="eq-catalog-overlay" id="' + p + '-pick"><div class="eq-catalog-panel">' +
          '<h2 class="eq-catalog-title">' + (free ? 'Sélectionner un ion' : 'Quel ion est dans le tube ?') + '</h2>' +
          '<div class="lab-ion-grid">' + grid + '</div>' +
          '<button type="button" class="btn-primary" id="' + p + '-pickclose">Fermer</button></div></div>' +
        '<div class="eq-catalog-overlay" id="' + p + '-dataov"><div class="eq-catalog-panel lab-data-panel">' +
          '<h2 class="eq-catalog-title">Tableau de données</h2><div>' + dataHTML() + '</div>' +
          '<button type="button" class="btn-primary" id="' + p + '-dataclose">Fermer</button></div></div>';
    }

    // ---------- Tube ----------
    function labelSVG(i) {
      return i ? i.sym + '<tspan dy="-4" font-size="7" fill="' + (i.charge > 0 ? '#D9463B' : '#1F3FA8') + '">' + chargeTxt(i.charge) + '</tspan>' : '?';
    }
    function resetPrecip() {
      precip = null;
      els.cloud.style.opacity = 0;
      els.blob.style.opacity = 0;
    }
    function showTube(i) {
      ion = i;
      resetPrecip();
      els.label.innerHTML = free ? labelSVG(i) : '?';
      move(els.tube, TUBE[0], TUBE[1]);
      els.tube.style.opacity = 1;
      els.empty.disabled = false;
    }
    function hideTube() {
      ion = null;
      resetPrecip();
      els.tube.style.opacity = 0;
      els.empty.disabled = true;
    }
    function emptyTube() {
      if (busy) return;
      if (free) {
        hideTube();
        els.select.innerHTML = 'Sélectionner un ion';
        say('Le tube est vide. Sélectionne un ion pour recommencer.', '');
      } else {
        // Même échantillon, tube remis à zéro
        els.tube.style.opacity = 0;
        busy = true;
        later(350, function () { resetPrecip(); els.tube.style.opacity = 1; busy = false; });
        say('Le tube est rempli à nouveau avec le même échantillon.', '');
      }
    }

    // ---------- Contrôles avant un test ----------
    function canTest() {
      if (busy) return false;
      if (!ion) { say("Sélectionne d'abord un ion : un tube apparaîtra dans le labo.", 'error'); return false; }
      if (precip) { say("Un précipité s'est formé dans le tube : vide-le pour faire un nouveau test.", 'error'); return false; }
      return true;
    }

    // ---------- Une goutte tombe ----------
    function dropFall(x, y0, y1, color, done) {
      var d = els.drop;
      d.style.transition = 'none';
      d.setAttribute('fill', color);
      d.style.transform = 'translate(' + x + 'px,' + y0 + 'px)';
      d.style.opacity = 1;
      void d.getBoundingClientRect();
      d.style.transition = 'transform .4s ease-in';
      d.style.transform = 'translate(' + x + 'px,' + y1 + 'px)';
      later(410, function () { d.style.opacity = 0; done(); });
    }

    // ---------- Test chimique : le flacon vient verser une goutte ----------
    function pour(which) {
      if (!canTest()) return;
      busy = true;
      var fl = which === 'naoh' ? els.flNaoh : els.flAg;
      var r = FL_REST[which], tx = TUBE[0], ty = TUBE[1] - 14;
      var dropColor = which === 'naoh' ? 'rgba(160,210,235,.9)' : 'rgba(255,255,255,.95)';
      say('', '');
      move(fl, tx, ty);
      later(620, function () { move(fl, tx, ty, 180); });
      later(1220, function () {
        dropFall(tx, ty + 2, TUBE[1] + 34, dropColor, function () {
          var color = DATA[which][ion.key];
          if (color) {
            precip = color;
            els.blob.querySelectorAll('.lab-blob').forEach(function (b) { b.style.fill = PREC_COLOR[color]; });
            els.cloud.style.fill = PREC_COLOR[color];
            els.cloud.style.opacity = 0.55;
            later(850, function () { els.cloud.style.opacity = 0.12; els.blob.style.opacity = 1; });
            say('Avec ' + REACTIFS[which].label + ', un précipité ' + color + ' se forme. Pour refaire un test, il faut vider le tube.', 'success');
          } else {
            say('Avec ' + REACTIFS[which].label + ', il ne se passe rien.', '');
          }
        });
      });
      later(2100, function () { move(fl, tx, ty, 0); });
      later(2700, function () { move(fl, r[0], r[1]); });
      later(3300, function () { busy = false; });
    }

    // ---------- Flamme ----------
    function setFlame(color, opacity) {
      els.fout.style.fill = color;
      els.fout.style.fillOpacity = opacity;
    }
    function light() {
      lit = true;
      els.flame.style.opacity = 1;
      els.off.style.display = '';
      setFlame(FLAME_NORMAL, 0.45);
    }
    function extinguish() {
      if (busy) return;
      lit = false;
      els.flame.style.opacity = 0;
      els.off.style.display = 'none';
    }
    function onBurner() {
      if (busy) return;
      if (!lit) {
        light();
        say('Le bec est allumé. Clique à nouveau dessus pour tester ton échantillon à la flamme.', '');
        return;
      }
      if (!canTest()) return;
      busy = true;
      say('', '');
      move(els.tube, TUBE_FLAME[0], TUBE_FLAME[1], 125);
      later(800, function () {
        dropFall(TUBE_FLAME[0], TUBE_FLAME[1] + 4, BURN[1] - 32, 'rgba(160,210,235,.9)', function () {
          var f = DATA.flame[ion.key];
          if (f) {
            setFlame(f.color, 0.85);
            say('La flamme devient ' + f.name + '.', '');
            clearTimeout(flameTimer);
            flameTimer = setTimeout(function () { setFlame(FLAME_NORMAL, 0.45); }, 3200);
          } else {
            say('La flamme ne change pas de couleur.', '');
          }
        });
      });
      later(2300, function () { move(els.tube, TUBE[0], TUBE[1], 0); });
      later(3100, function () { busy = false; });
    }

    // ---------- Sélection d'un ion ----------
    function openPick() { els.pick.style.display = 'flex'; }
    function closePick() { els.pick.style.display = 'none'; }
    function onPickIon(key) {
      closePick();
      var i = byKey(key);
      if (free) {
        if (busy) return;
        showTube(i);
        els.select.innerHTML = 'Ion sélectionné : ' + ionHTML(i);
        say('Le tube est prêt. Clique sur un flacon ou sur le bec pour tester.', '');
      } else {
        chosen = i;
        els.choose.innerHTML = 'Ton choix : ' + ionHTML(i);
        els.validate.disabled = found;
      }
    }

    // ---------- Mode test : ion inconnu ----------
    function newUnknown() {
      var pool = IONS.filter(function (i) { return i.key !== lastUnknown; });
      unknown = pool[Math.floor(Math.random() * pool.length)];
      lastUnknown = unknown.key;
      chosen = null; found = false;
      els.choose.innerHTML = 'Quel ion est dans le tube ?';
      els.validate.textContent = 'Valider';
      els.validate.disabled = true;
      showTube(unknown);
      say('', '');
    }
    function onValidate() {
      if (found) { newUnknown(); return; }
      if (!chosen || busy) return;
      if (chosen.key === unknown.key) {
        found = true;
        say("Bravo, c'est bien l'ion " + ionHTML(unknown) + ' qui est dans le tube !', 'success');
        confetti(els.validate);
        els.validate.textContent = 'Ion suivant';
      } else {
        say("Ce n'est pas cet ion qui est dans le tube, refais des tests avec cet échantillon et compare au tableau de données.", 'error');
      }
    }

    // ---------- Démarrage ----------
    function start() {
      if (!root) return;
      clearTimers();
      busy = false;
      lit = false;
      els.flame.style.opacity = 0;
      els.off.style.display = 'none';
      move(els.flNaoh, FL_REST.naoh[0], FL_REST.naoh[1]);
      move(els.flAg, FL_REST.ag[0], FL_REST.ag[1]);
      els.drop.style.opacity = 0;
      els.pick.style.display = 'none';
      els.dataov.style.display = 'none';
      if (free) {
        hideTube();
        els.select.innerHTML = 'Sélectionner un ion';
        say('', '');
      } else {
        newUnknown();
      }
    }

    function init() {
      root = $(cfg.sectionId);
      if (!root) return;
      root.innerHTML = tpl();
      var g = function (s) { return $(p + '-' + s); };
      els = {
        feedback: g('feedback'), tube: g('tube'), label: g('label'), cloud: g('cloud'), blob: g('blob'),
        flNaoh: g('fl-naoh'), flAg: g('fl-ag'), flame: g('flame'), fout: g('fout'), drop: g('drop'),
        empty: g('empty'), off: g('off'), pick: g('pick'), dataov: g('dataov'),
        select: g('select'), choose: g('choose'), validate: g('validate')
      };
      g('fl-naoh').addEventListener('click', function () { pour('naoh'); });
      g('fl-ag').addEventListener('click', function () { pour('ag'); });
      g('burner').addEventListener('click', onBurner);
      els.flame.style.pointerEvents = 'none';
      els.empty.addEventListener('click', emptyTube);
      els.off.addEventListener('click', extinguish);
      g('data').addEventListener('click', function () { els.dataov.style.display = 'flex'; });
      g('dataclose').addEventListener('click', function () { els.dataov.style.display = 'none'; });
      g('pickclose').addEventListener('click', closePick);
      window.PeriodicTable.wireOverlay(els.pick);
      window.PeriodicTable.wireOverlay(els.dataov);
      els.pick.querySelectorAll('.lab-ion-btn').forEach(function (b) {
        b.addEventListener('click', function () { onPickIon(b.getAttribute('data-k')); });
      });
      if (free) {
        els.select.addEventListener('click', openPick);
        g('totest').addEventListener('click', function () { clearTimers(); window.App.showScreen('screen-lab-test'); window.Lab.test.start(); });
      } else {
        els.choose.addEventListener('click', openPick);
        els.validate.addEventListener('click', onValidate);
        g('tolab').addEventListener('click', function () { clearTimers(); window.App.showScreen('screen-lab'); window.Lab.free.start(); });
      }
      g('back').addEventListener('click', function () { clearTimers(); window.App.showScreen('screen-mode2'); });
      hideTube();
      move(els.flNaoh, FL_REST.naoh[0], FL_REST.naoh[1]);
      move(els.flAg, FL_REST.ag[0], FL_REST.ag[1]);
    }

    document.addEventListener('DOMContentLoaded', init);
    return { start: start };
  }

  var free = createLab({
    sectionId: 'screen-lab', prefix: 'lab', mode: 'free', title: 'Identifier les ions',
    intro: "Dans ce laboratoire, teste le comportement de certains ions en contact de soude, de nitrate d'argent ou d'une flamme."
  });
  var test = createLab({
    sectionId: 'screen-lab-test', prefix: 'lt', mode: 'test', title: 'Faire des tests',
    intro: "Un ion inconnu se trouve dans le tube : fais des tests pour l'identifier."
  });
  window.Lab = { free: free, test: test };

  document.addEventListener('DOMContentLoaded', function () {
    var b = $('btn-lab-nav');
    if (b) b.addEventListener('click', function () { window.App.showScreen('screen-lab'); free.start(); });
  });
})();
