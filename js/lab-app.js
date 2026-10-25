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
      ? '<path d="M6.2 33Q6.2 41.5 12 41.5T17.8 33Q15 30.5 12 31.5T6.2 33Z" fill="' + PREC_COLOR[color] + '" stroke="#8C98A4" stroke-width=".7"/>' : '';
    return '<svg viewBox="0 0 24 46" width="24" height="44" aria-hidden="true">' +
      '<path d="M6 5V35A6 6 0 0 0 18 35V5" fill="rgba(170,215,238,.5)" stroke="#8FA3B3" stroke-width="1.4"/>' + blob +
      '<rect x="4.5" y="2.5" width="15" height="3.2" rx="1.6" fill="#DCE6EE" stroke="#8FA3B3" stroke-width="1"/>' +
      '<path d="M8.6 9V30" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/></svg>';
  }
  function flameIcon(color) {
    return '<svg viewBox="-12 0 24 36" width="24" height="36" aria-hidden="true">' +
      '<path d="M0 34C-10 31-10 16-1.5 3-1 9 4 11 5 17 8 22 8 31 0 34Z" fill="' + color + '" fill-opacity=".9"/>' +
      '<path d="M0 34C-4.5 32.5-5 25-.5 18 .5 22 3.5 24 3.5 28 3.5 31.5 2 33.4 0 34Z" fill="#5C93FF" fill-opacity=".85"/></svg>';
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
  // Flacon de réactif, dessiné bouchon en haut (0,0) : il pivote autour du bouchon pour verser
  function flaskSVG(id, formula, l1, l2, glass, liquid, cap, band) {
    return '<g class="lab-flask" id="' + id + '" role="button" aria-label="Flacon ' + formula + '">' +
      '<rect x="-30" y="-2" width="60" height="96" fill="transparent"/>' +
      '<rect x="-7.5" y="0" width="15" height="12" rx="3" fill="' + cap + '"/>' +
      '<path d="M-4.5 3v7M-1.5 3v7M1.5 3v7M4.5 3v7" stroke="#fff" stroke-width="1" opacity=".22"/>' +
      '<path d="M-5.5 11.5h11V19c0 4 19 5 19 15v48c0 5-4 8-9 8h-31c-5 0-9-3-9-8V34c0-10 19-11 19-15z" fill="' + glass + '" stroke="#6F8597" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M-22.5 52h45v30c0 4-3 6.5-7 6.5h-31c-4 0-7-2.5-7-6.5z" fill="' + liquid + '"/>' +
      '<rect x="-20" y="40" width="40" height="38" rx="5" fill="#fff" fill-opacity=".96"/>' +
      '<path d="M-20 45a5 5 0 0 1 5-5h30a5 5 0 0 1 5 5v1h-40z" fill="' + band + '"/>' +
      '<text x="0" y="58" text-anchor="middle" font-size="10.5" font-weight="800" fill="#1F2A36">' + formula + '</text>' +
      '<text x="0" y="68" text-anchor="middle" font-size="7.5" font-weight="700" fill="#3C4A58">' + l1 + '</text>' +
      (l2 ? '<text x="0" y="76" text-anchor="middle" font-size="7.5" font-weight="700" fill="#3C4A58">' + l2 + '</text>' : '') +
      '<path d="M-19.5 36c2-4 6-6 10-7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".75"/>' +
      '<path d="M22 50v28" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".45"/>' +
      '</g>';
  }
  function sceneSVG(p) {
    var f = window.Molecules.formatSubscripts;
    return '<svg class="lab-svg" viewBox="0 0 360 270" role="img" aria-label="Laboratoire">' +
      '<defs><clipPath id="' + p + '-clip"><path d="M-13 0 V108 A13 13 0 0 0 13 108 V0 Z"/></clipPath>' +
        '<radialGradient id="' + p + '-glow"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".75"/><stop offset=".55" stop-color="#FFC566" stop-opacity=".25"/><stop offset="1" stop-color="#FFB040" stop-opacity="0"/></radialGradient></defs>' +
      '<rect x="0" y="250" width="360" height="20" class="lab-table-top"/>' +
      '<path d="M0 250h360" stroke="#B9A584" stroke-width="2"/>' +
      // portoir en bois du tube
      '<path d="M176 250v-16q0-5 5-5h48q5 0 5 5v16z" fill="#D2A876"/>' +
      '<path d="M176 236h58" stroke="#B88A57" stroke-width="1.5"/>' +
      '<ellipse cx="205" cy="230.5" rx="16" ry="3" fill="#9C7243"/>' +
      '<path d="M182 241h10M218 241h10" stroke="#E6C496" stroke-width="2" stroke-linecap="round"/>' +
      // bec électrique (bec benzène)
      '<g id="' + p + '-burner" class="lab-burner" role="button" aria-label="Bec benzène">' +
        '<rect x="272" y="120" width="66" height="130" fill="transparent"/>' +
        '<path d="M330 244h18q6 0 8 6" fill="none" stroke="#E06A3B" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M282 250v-5q0-7 8-7h30q8 0 8 7v5z" fill="#55616D"/>' +
        '<path d="M287 241q2-2 6-2h24" stroke="#7D8995" stroke-width="2" stroke-linecap="round" fill="none"/>' +
        '<rect x="297" y="188" width="16" height="52" rx="2.5" fill="#97A3AF"/>' +
        '<path d="M300.5 192v44" stroke="#C9D2DA" stroke-width="2.4" stroke-linecap="round"/>' +
        '<rect x="293" y="214" width="24" height="10" rx="3.5" fill="#66727E"/>' +
        '<circle cx="305" cy="219" r="2.6" fill="#2F3740"/>' +
        '<rect x="296" y="182" width="18" height="8" rx="2.5" fill="#55616D"/>' +
      '</g>' +
      '<g class="lab-flame" id="' + p + '-flame" style="opacity:0">' +
        '<g transform="translate(305,185)">' +
          '<ellipse cx="0" cy="-26" rx="30" ry="40" fill="url(#' + p + '-glow)"/>' +
          '<path id="' + p + '-fout" d="M0 0C-16-6-17-30-3-64-1-50 9-43 11-30 15-19 12-5 0 0Z" fill="' + FLAME_NORMAL + '" fill-opacity=".5"/>' +
          '<path d="M0 0C-10-4-11-20-2-42-1-33 6-27 7-19 9-11 7-3 0 0Z" fill="#FFD27A" fill-opacity=".45"/>' +
          '<path d="M0 0C-6-3-7-12-1-24 0-18 4-15 4.5-10 5.5-5 4-1.5 0 0Z" fill="#3D7BFF" fill-opacity=".85"/>' +
        '</g></g>' +
      // flacons
      flaskSVG(p + '-fl-naoh', 'NaOH', 'Soude', '', 'rgba(214,236,248,.9)', 'rgba(170,214,238,.75)', '#2B3A67', '#5B8BD6') +
      flaskSVG(p + '-fl-ag', f('AgNO3'), 'Nitrate', 'd\'argent', 'rgba(176,110,40,.9)', 'rgba(120,70,20,.55)', '#2B2B2B', '#9AA6B4') +
      // tube à essais
      '<g class="lab-tube" id="' + p + '-tube" style="opacity:0">' +
        '<path d="M-14 0V108A14 14 0 0 0 14 108V0" fill="rgba(235,245,252,.45)"/>' +
        '<g clip-path="url(#' + p + '-clip)">' +
          '<rect x="-14" y="34" width="28" height="100" fill="rgba(160,210,235,.6)"/>' +
          '<ellipse cx="0" cy="34" rx="13" ry="2.4" fill="rgba(200,232,248,.95)"/>' +
          '<rect id="' + p + '-cloud" x="-14" y="34" width="28" height="100" fill="#fff" style="opacity:0;transition:opacity .8s"/>' +
          '<g id="' + p + '-blob" style="opacity:0;transition:opacity .9s">' +
            '<path d="M-13 110Q-13 123 0 123T13 110Q8 103 0 105T-13 110Z" class="lab-blob"/><ellipse cx="-3" cy="104" rx="8" ry="4.5" class="lab-blob"/>' +
          '</g>' +
        '</g>' +
        '<path d="M-14 0V108A14 14 0 0 0 14 108V0" fill="none" stroke="#7F98AC" stroke-width="2.2" stroke-linecap="round"/>' +
        '<rect x="-17.5" y="-3" width="35" height="6.5" rx="3.2" fill="#DCE6EE" stroke="#7F98AC" stroke-width="1.6"/>' +
        '<path d="M-8 9V100" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>' +
        '<rect x="-12.5" y="48" width="25" height="22" rx="5" fill="#fff" fill-opacity=".96" stroke="#D3DCE4"/>' +
        '<text id="' + p + '-label" x="0" y="63" text-anchor="middle" font-size="10" font-weight="800" fill="#1F2A36"></text>' +
      '</g>' +
      '<circle id="' + p + '-drop" r="4" cx="0" cy="0" style="opacity:0"/>' +
    '</svg>';
  }

  // ============================================================
  function createLab(cfg) {
    var p = cfg.prefix, free = cfg.mode === 'free';
    var root = null, els = {};
    var ion = null, precip = null, busy = false, lit = false;
    var history = [];               // tests réalisés : { ion, test: 'naoh' | 'ag' | 'flame', result } (lu par la leçon)
    var timers = [], flameTimer = null;
    var unknown = null, lastUnknown = null, chosen = null, found = false, failed = false;
    var mys = false;                // labo libre : ion mystère imposé par une leçon
    function testing() { return !free || mys; }

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
        ? '<div class="ex-actions" id="' + p + '-mys" style="display:none"><button type="button" class="btn-secondary" id="' + p + '-choose">Quel ion est dans le tube ?</button>' +
          '<button type="button" class="btn-primary" id="' + p + '-validate" disabled>Valider</button></div>' +
          '<div class="ex-actions"><button type="button" class="btn-primary" id="' + p + '-totest">Faire des tests</button></div>'
        : '<div class="ex-actions"><button type="button" class="btn-secondary" id="' + p + '-choose">Quel ion est dans le tube ?</button>' +
          '<button type="button" class="btn-primary" id="' + p + '-validate" disabled>Valider</button>' +
          (cfg.expert ? '<button type="button" class="btn-primary btn-primary--alt" id="' + p + '-other" style="display:none">Autre échantillon</button>' : '') + '</div>' +
          (cfg.expert ? '' : '<div class="ex-actions"><button type="button" class="btn-secondary lab-mini" id="' + p + '-tolab">Retourner au labo</button></div>');
      var grid = IONS.map(function (i) {
        return '<button type="button" class="lab-ion-btn" data-k="' + i.key + '">' + ionHTML(i) + '</button>';
      }).join('');
      return '<button type="button" class="btn-back" id="' + p + '-back">← Retour</button>' +
        '<h1 class="app-title app-title--small">' + cfg.title + '</h1>' +
        (cfg.expert ? '<p class="exp-progress" id="' + p + '-progress"></p>' : '') +
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
      els.label.innerHTML = testing() ? '?' : labelSVG(i);
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
      if (!testing()) {
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
          history.push({ ion: ion.key, test: which, result: color || null });
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
          history.push({ ion: ion.key, test: 'flame', result: f ? f.name : null });
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
      if (!testing()) {
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
      chosen = null; found = false; failed = false;
      if (els.other) els.other.style.display = 'none';
      els.choose.innerHTML = 'Quel ion est dans le tube ?';
      els.validate.textContent = 'Valider';
      els.validate.disabled = true;
      showTube(unknown);
      say('', '');
    }
    // Al3+ et Zn2+ donnent exactement les mêmes résultats : les deux réponses sont acceptées.
    function isAZ(i) { return i.key === 'Al3+' || i.key === 'Zn2+'; }
    function onValidate() {
      if (found) {
        if (cfg.expert) { if (cfg.expert.onNext) cfg.expert.onNext(); } else if (!free) newUnknown();
        return;
      }
      if (!chosen || busy) return;
      var ok = chosen.key === unknown.key || (isAZ(chosen) && isAZ(unknown));
      if (ok) {
        found = true;
        if (isAZ(unknown)) {
          say('Bravo ! Avec ces tests, ' + ionHTML(byKey('Al3+')) + ' et ' + ionHTML(byKey('Zn2+')) +
            " sont impossibles à distinguer. Ici, c'était " + ionHTML(unknown) + '.', 'success');
        } else {
          say("Bravo, c'est bien l'ion " + ionHTML(unknown) + ' qui est dans le tube !', 'success');
        }
        confetti(els.validate);
        els.validate.textContent = free ? 'Trouvé !' : 'Ion suivant';
        if (free) els.validate.disabled = true;
        if (cfg.expert) {
          els.validate.textContent = cfg.expert.nextLabel || 'Voir mon score';
          if (els.other) els.other.style.display = 'none';
          if (cfg.expert.onSolved) cfg.expert.onSolved(!failed);
        }
      } else {
        failed = true;
        if (els.other) els.other.style.display = '';
        if (cfg.expert && cfg.expert.onFail) cfg.expert.onFail();
        say("Ce n'est pas cet ion qui est dans le tube, refais des tests avec cet échantillon et compare au tableau de données.", 'error');
      }
    }

    // ---------- Labo libre : ion mystère (leçon) ----------
    function setMystery(on) {
      mys = on;
      els.mys.style.display = on ? '' : 'none';
      els.select.style.display = on ? 'none' : '';
    }
    function mystery(key) {
      if (!root || !free) return;
      start();
      setMystery(true);
      unknown = byKey(key);
      chosen = null; found = false; failed = false;
      els.choose.innerHTML = 'Quel ion est dans le tube ?';
      els.validate.textContent = 'Valider';
      els.validate.disabled = true;
      showTube(unknown);
      say('Un ion inconnu est dans le tube : fais des tests pour l\'identifier.', '');
    }

    // ---------- Démarrage ----------
    function start() {
      if (!root) return;
      clearTimers();
      busy = false;
      lit = false;
      history = [];
      els.flame.style.opacity = 0;
      els.off.style.display = 'none';
      move(els.flNaoh, FL_REST.naoh[0], FL_REST.naoh[1]);
      move(els.flAg, FL_REST.ag[0], FL_REST.ag[1]);
      els.drop.style.opacity = 0;
      els.pick.style.display = 'none';
      els.dataov.style.display = 'none';
      if (free) {
        setMystery(false);
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
        select: g('select'), choose: g('choose'), validate: g('validate'), other: g('other'), progress: g('progress'), mys: g('mys')
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
        els.choose.addEventListener('click', openPick);
        els.validate.addEventListener('click', onValidate);
        g('totest').addEventListener('click', function () { clearTimers(); window.App.showScreen('screen-lab-test'); window.Lab.test.start(); });
      } else {
        els.choose.addEventListener('click', openPick);
        els.validate.addEventListener('click', onValidate);
        if (els.other) els.other.addEventListener('click', function () { if (!busy) newUnknown(); });
        if (g('tolab')) g('tolab').addEventListener('click', function () { clearTimers(); window.App.showScreen('screen-lab'); window.Lab.free.start(); });
      }
      g('back').addEventListener('click', function () { clearTimers(); window.App.showScreen(cfg.backTo || 'screen-mode2'); });
      hideTube();
      move(els.flNaoh, FL_REST.naoh[0], FL_REST.naoh[1]);
      move(els.flAg, FL_REST.ag[0], FL_REST.ag[1]);
    }

    document.addEventListener('DOMContentLoaded', init);
    return {
      start: start,
      setProgress: function (t) { if (els.progress) els.progress.textContent = t; },
      state: function () { return { ion: ion && ion.key, precip: precip, busy: busy, history: history.slice(), found: mys && found }; },
      mystery: mystery,
      hooks: cfg.expert || null
    };
  }

  var free = createLab({
    sectionId: 'screen-lab', prefix: 'lab', mode: 'free', title: 'Identifier les ions',
    intro: "Dans ce laboratoire, teste le comportement de certains ions en contact de soude, de nitrate d'argent ou d'une flamme."
  });
  var test = createLab({
    sectionId: 'screen-lab-test', prefix: 'lt', mode: 'test', title: 'Faire des tests',
    intro: "Un ion inconnu se trouve dans le tube : fais des tests pour l'identifier."
  });
  // Question « ion mystère » du Challenge
  var expert = createLab({
    sectionId: 'screen-atom-expert-lab', prefix: 'axl', mode: 'test', title: 'Ion mystère', expert: {},
    intro: "Un ion inconnu se trouve dans le tube : fais des tests pour l'identifier."
  });
  // data : résultats des tests, repris par les questions à choix et la leçon
  window.Lab = { free: free, test: test, expert: expert, data: { ions: IONS, tests: DATA }, ionHTML: ionHTML, dataHTML: dataHTML };
})();
