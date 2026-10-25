// ph-lab.js
// Le pH : labo du papier pH et bécher des ions H⁺ / HO⁻.
//  - Labo (createPhLab) : une bandelette de papier pH attend sur le papier essuie-tout. On fait glisser la pipette
//    dans le bécher (elle se remplit au contact du liquide), puis au-dessus de la bandelette (un cône invisible
//    au-dessus d'elle déclenche la goutte). 1,5 s plus tard, la boîte s'ouvre : on fait glisser la bandelette sur
//    le cercle des couleurs et on touche la couleur qui correspond.
//      mode 'free'   : flacons nommés, pH entiers (une couleur exacte de la boîte) — paillasse du labo, leçon
//      mode 'test'   : solution inconnue, pH parfois à demi-unité ; « mesure le pH » et « quelle est cette substance ? »
//      mode 'expert' : une question du Challenge à la fois, résultats transmis par des crochets
//  - Bécher des ions (Ions) : la proportion d'ions H⁺ et HO⁻ suit un curseur de pH.
window.PhLab = (function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';

  // ---------- Données ----------
  // ph : valeur des solutions inconnues (entraînement, Challenge) ; ip : valeur entière des flacons nommés
  // liq : couleur du liquide dans le bécher (les solutions inconnues sont toutes incolores)
  var SUBS = [
    { n: 'Acide chlorhydrique', ph: 1, ip: 1, liq: 'rgba(214,236,248,.65)' },
    { n: 'Jus de citron', ph: 2, ip: 2, liq: 'rgba(248,238,160,.85)' },
    { n: 'Soda', ph: 2.5, ip: 3, liq: 'rgba(120,64,34,.8)' },
    { n: 'Vinaigre', ph: 3, ip: 3, liq: 'rgba(236,222,186,.8)' },
    { n: 'Jus d\'orange', ph: 3.5, ip: 4, liq: 'rgba(255,168,56,.88)' },
    { n: 'Lait', ph: 6.5, ip: 6, liq: 'rgba(253,252,246,.97)' },
    { n: 'Eau pure', ph: 7, ip: 7, liq: 'rgba(200,230,250,.55)' },
    { n: 'Eau minérale', ph: 7.5, ip: 8, liq: 'rgba(200,230,250,.6)' },
    { n: 'Bicarbonate de soude dissous', ph: 8.5, ip: 9, liq: 'rgba(232,240,246,.8)' },
    { n: 'Eau savonneuse', ph: 10, ip: 10, liq: 'rgba(234,240,252,.9)' },
    { n: 'Eau de Javel diluée', ph: 11.5, ip: 12, liq: 'rgba(232,244,212,.75)' },
    { n: 'Soude', ph: 13, ip: 13, liq: 'rgba(214,236,248,.65)' }
  ];
  var UNKNOWN_LIQ = 'rgba(200,230,250,.6)';
  // Gamme de la boîte de papier pH universel, de 0 à 14
  var COLORS = ['#C8202F', '#DE2F2C', '#EC5A2A', '#F38A2B', '#F7B52E', '#F2DC33', '#C6D93A', '#8CC43F',
    '#4DB34B', '#2A9F86', '#2D86C2', '#3563AF', '#4A4CA0', '#5D3A96', '#6B2C82'];
  var STRIP_BLANK = '#F3E9C6';

  function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  // Couleur de la bandelette pour un pH quelconque (entre deux couleurs si le pH n'est pas entier)
  function colorAt(ph) {
    var a = Math.max(0, Math.min(14, ph)), i = Math.floor(a), t = a - i;
    if (i >= 14) return COLORS[14];
    var c0 = hex(COLORS[i]), c1 = hex(COLORS[i + 1]);
    return 'rgb(' + c0.map(function (v, k) { return Math.round(v + (c1[k] - v) * t); }).join(',') + ')';
  }
  function phTxt(ph) { return String(ph).replace('.', ','); }
  function kindOf(ph) { return ph < 7 ? 'acide' : (ph === 7 ? 'neutre' : 'basique'); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // Lecture juste : la valeur exacte, ou l'une des deux valeurs voisines si la bandelette est entre deux couleurs
  function readOk(chosen, ph) { return chosen === ph || (ph % 1 !== 0 && (chosen === Math.floor(ph) || chosen === Math.ceil(ph))); }
  // 8 solutions dont les pH sont espacés d'au moins 1 (une seule correspond à la mesure)
  function candidates(target) {
    var best = [target];
    for (var t = 0; t < 40 && best.length < 8; t++) {
      var set = [target];
      shuffle(SUBS).forEach(function (s) {
        if (set.length < 8 && set.every(function (x) { return Math.abs(x.ph - s.ph) >= 1; })) set.push(s);
      });
      if (set.length > best.length) best = set;
    }
    return shuffle(best);
  }
  function confetti(anchor) {
    var canvas = $('confetti-canvas');
    if (!window.Confetti || !canvas || !anchor) return;
    try { var r = anchor.getBoundingClientRect(); window.Confetti.burst(canvas, r.left + r.width / 2, r.top + r.height / 2); } catch (e) { /* décoratif */ }
  }
  // Étiquette du bécher sur deux lignes si elle est longue
  function labelLines(t) {
    if (t.length <= 14) return [t];
    var mid = t.length / 2, cut = -1;
    for (var i = 0; i < t.length; i++) if (t[i] === ' ' && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
    return cut < 0 ? [t] : [t.slice(0, cut), t.slice(cut + 1)];
  }

  // ---------- Dessins réutilisés (labo, gros plan, leçon, questions à choix) ----------
  // Cercle de la boîte : 16 parts égales, 15 couleurs (0 à 14) et une part blanche en haut qui sépare le 0 du 14
  function wheelSVG(o) {
    o = o || {};
    var c = 150, R = 146, r = o.mini ? 0 : 56, out = '';
    function pt(rad, a) { return (c + rad * Math.cos(a)).toFixed(2) + ' ' + (c + rad * Math.sin(a)).toFixed(2); }
    function sector(k) {
      var a0 = (-90 - 11.25 + 22.5 * k) * Math.PI / 180, a1 = a0 + 22.5 * Math.PI / 180;
      return 'M' + pt(R, a0) + 'A' + R + ' ' + R + ' 0 0 1 ' + pt(R, a1) +
        (r ? 'L' + pt(r, a1) + 'A' + r + ' ' + r + ' 0 0 0 ' + pt(r, a0) : 'L' + c + ' ' + c) + 'Z';
    }
    out += '<path d="' + sector(0) + '" fill="#fff" stroke="#D5DCE3" stroke-width="2"/>';
    COLORS.forEach(function (col, i) {
      out += '<path class="phl-sec" data-ph="' + i + '" d="' + sector(i + 1) + '" fill="' + col + '" stroke="#fff" stroke-width="' + (o.mini ? 4 : 2.5) + '"/>';
      if (!o.mini) {
        var a = (-90 + 22.5 * (i + 1)) * Math.PI / 180;
        out += '<text x="' + (c + 101 * Math.cos(a)).toFixed(1) + '" y="' + (c + 101 * Math.sin(a) + 7).toFixed(1) + '" class="phl-num">' + i + '</text>';
      }
    });
    if (!o.mini) out += '<text x="150" y="160" class="phl-wheel-ph">pH</text>';
    return '<svg class="' + (o.cls || 'phl-wheel') + '" viewBox="0 0 300 300" aria-hidden="true">' + out + '</svg>';
  }
  // Pipette dessinée pointe en (0,0)
  function pipetteSVG(id) {
    return '<path d="M-7.5-66C-10-79-6.5-93 0-93S10-79 7.5-66Z" fill="#E0463B"/>' +
      '<path d="M-5.5-88C-4-91-1.5-92 1-92" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
      '<rect x="-5.5" y="-69" width="11" height="6" rx="2.5" fill="#B4362C"/>' +
      '<path d="M-3.6-63V-24C-3.6-15-1.3-9-1 0H1C1.3-9 3.6-15 3.6-24V-63Z" fill="rgba(228,243,251,.9)" stroke="#8FA3B3" stroke-width="1.1" stroke-linejoin="round"/>' +
      '<path' + (id ? ' id="' + id + '"' : '') + ' d="M-2.5-34V-24C-2.5-16-.8-10-.6-2H.6C.8-10 2.5-16 2.5-24V-34Z" fill="transparent"/>' +
      '<path d="M-1.8-58V-30" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>';
  }
  // Papier essuie-tout et bandelette
  function paperSVG(x, y, stripFill, stripId) {
    return '<rect x="' + x + '" y="' + y + '" width="126" height="13" rx="2.5" fill="#fff" stroke="#DCE3E8"/>' +
      '<path d="M' + (x + 8) + ' ' + (y + 6.5) + 'h110" stroke="#EEF2F5" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<rect' + (stripId ? ' id="' + stripId + '"' : '') + ' x="' + (x + 46) + '" y="' + (y + 1) + '" width="34" height="8" rx="1.8" fill="' + stripFill + '" stroke="#C9B98A" stroke-width=".8"/>';
  }

  // ---------- Scène ----------
  var PIP_REST = [240, 156], STRIP_X = 285, STRIP_TOP = 213;
  var LIQ = { x0: 48, x1: 132, y0: 142, y1: 212 };
  function sceneSVG(p) {
    return '<svg class="lab-svg phl-svg" id="' + p + '-svg" viewBox="0 56 360 194" role="img" aria-label="Paillasse : bécher, pipette, papier pH et boîte de papier pH">' +
      '<defs><clipPath id="' + p + '-clip"><path d="M44 92V206q0 10 10 10h72q10 0 10-10V92z"/></clipPath></defs>' +
      '<rect x="0" y="226" width="360" height="24" class="lab-table-top"/>' +
      // bécher
      '<rect x="44" y="92" width="92" height="124" fill="rgba(215,235,247,.3)"/>' +
      '<g clip-path="url(#' + p + '-clip)"><rect id="' + p + '-liq" x="40" y="140" width="100" height="80" fill="transparent"/>' +
      '<path id="' + p + '-surf" d="M40 140h100" stroke="#fff" stroke-width="2" opacity="0"/></g>' +
      '<path d="M38 92h8M134 92h8M44 92V206q0 10 10 10h72q10 0 10-10V92" fill="none" stroke="#7F9DB3" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M128 104v90" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>' +
      '<g id="' + p + '-tag" style="display:none"><rect x="54" y="160" width="72" height="30" rx="5" fill="#fff" fill-opacity=".94" stroke="#C9D3DC"/>' +
      '<text id="' + p + '-label" x="90" y="174" text-anchor="middle" font-size="8.5" font-weight="800" fill="#1F2A36"></text></g>' +
      // boîte de papier pH : couvercle avec le cercle des couleurs
      '<g id="' + p + '-box" class="phl-hit" role="button" aria-label="Boîte de papier pH">' +
        '<rect x="150" y="176" width="66" height="50" fill="transparent"/>' +
        '<rect x="154" y="190" width="58" height="32" rx="5" fill="#EFE3C8" stroke="#B9A57E" stroke-width="1.5"/>' +
        '<path d="M154 200h58" stroke="#D9C9A4" stroke-width="1"/>' +
        '<rect x="151" y="182" width="64" height="12" rx="5" fill="#F8F0DD" stroke="#B9A57E" stroke-width="1.5"/>' +
        '<g transform="translate(159 194.5) scale(.09)">' + wheelSVG({ mini: true }).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</g>' +
        '<text x="199" y="211" text-anchor="middle" font-size="10" font-weight="800" fill="#6B5A35">pH</text></g>' +
      '<text x="183" y="241" text-anchor="middle" class="phl-cap">boîte de papier pH</text>' +
      // papier essuie-tout et bandelette
      paperSVG(222, 212, STRIP_BLANK, p + '-strip') +
      '<text x="' + STRIP_X + '" y="241" text-anchor="middle" class="phl-cap">bandelette de papier pH</text>' +
      // pipette (glissable)
      '<g id="' + p + '-pip" class="phl-pip" role="button" aria-label="Pipette : fais-la glisser">' +
        '<rect x="-14" y="-96" width="28" height="100" fill="transparent"/>' + pipetteSVG(p + '-pipliq') + '</g>' +
      '<circle id="' + p + '-drop" r="2.6" cx="0" cy="0" style="opacity:0"/>' +
      '</svg>';
  }

  // ============================================================
  function createPhLab(cfg) {
    var p = cfg.prefix, free = cfg.mode === 'free', root = null, els = {};
    var sub = null, strip = 'blank', filled = false, busy = false, timers = [], history = [], tip = PIP_REST.slice(), drag = null;
    var kind = 'measure', solved = false, chosenPh = null, cands = [], chosenCand = null, last = null;
    var hooks = cfg.mode === 'expert' ? {} : null;

    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; busy = false; }
    function say(html, cls) { els.msg.innerHTML = html; els.msg.className = 'ex-feedback' + (cls ? ' ' + cls : ''); }
    function val() { return free ? sub.ip : sub.ph; }          // pH de la solution dans ce mode
    function liquid() { return free ? sub.liq : UNKNOWN_LIQ; }

    function tpl() {
      var head = cfg.embedded ? '' :
        '<button type="button" class="btn-back" id="' + p + '-back">← Retour</button>' +
        '<h1 class="app-title app-title--small">' + cfg.title + '</h1>';
      var subs = SUBS.map(function (s, i) {
        return '<button type="button" class="phl-sub" data-i="' + i + '"><span class="phl-sw" style="background:' + s.liq + '"></span>' + s.n + '</button>';
      }).join('');
      return head +
        '<p class="app-subtitle lab-intro" id="' + p + '-q">' + (cfg.intro || '') + '</p>' +
        (free ? '<div class="ex-actions phl-top"><button type="button" class="btn-secondary" id="' + p + '-select">Choisir un flacon</button></div>' : '') +
        '<div class="lab-board"><div class="lab-scene">' + sceneSVG(p) + '</div></div>' +
        '<p class="ex-feedback" id="' + p + '-msg"></p>' +
        (free ? '' : '<div class="ex-actions"><button type="button" class="btn-primary" id="' + p + '-ident" style="display:none">Quelle est cette substance ?</button>' +
          '<button type="button" class="btn-primary" id="' + p + '-next" style="display:none">Solution suivante</button></div>') +
        // gros plan sur la boîte
        '<div class="eq-catalog-overlay" id="' + p + '-cmp"><div class="eq-catalog-panel phl-cmp-panel">' +
          '<h2 class="eq-catalog-title">Compare les couleurs</h2>' +
          '<p class="phl-help" id="' + p + '-help"></p>' +
          '<div class="phl-area" id="' + p + '-area">' + wheelSVG() +
          '<div class="phl-dstrip" id="' + p + '-dstrip" aria-label="Bandelette de papier pH"></div></div>' +
          '<p class="ex-feedback phl-cmsg" id="' + p + '-cmsg"></p>' +
          '<div class="ex-actions"><button type="button" class="btn-secondary" id="' + p + '-cclose">Fermer</button>' +
          '<button type="button" class="btn-primary" id="' + p + '-cok">Valider</button></div></div></div>' +
        // choix d'un flacon (labo libre)
        (free ? '<div class="eq-catalog-overlay" id="' + p + '-pick"><div class="eq-catalog-panel"><h2 class="eq-catalog-title">Choisir un flacon</h2>' +
          '<div class="phl-subs">' + subs + '</div><button type="button" class="btn-primary" id="' + p + '-pickclose">Fermer</button></div></div>' : '') +
        // identification de la substance
        (free ? '' : '<div class="eq-catalog-overlay" id="' + p + '-idov"><div class="eq-catalog-panel"><h2 class="eq-catalog-title">Quelle est cette substance ?</h2>' +
          '<p class="phl-help">Compare le pH que tu as mesuré avec le tableau, puis touche la bonne substance.</p>' +
          '<table class="phl-table"><thead><tr><th>Substance</th><th>pH</th></tr></thead><tbody id="' + p + '-idrows"></tbody></table>' +
          '<p class="ex-feedback" id="' + p + '-idmsg"></p>' +
          '<div class="ex-actions"><button type="button" class="btn-secondary" id="' + p + '-idclose">Fermer</button>' +
          '<button type="button" class="btn-primary" id="' + p + '-idok">Valider</button></div></div></div>');
    }

    // ---------- Bécher, bandelette, pipette ----------
    function fill(s) {
      sub = s;
      els.liq.setAttribute('fill', liquid());
      els.surf.setAttribute('opacity', '.6');
      els.tag.style.display = '';
      var lines = labelLines(free ? s.n : 'Solution inconnue');
      els.label.innerHTML = lines.map(function (l, i) { return '<tspan x="90" dy="' + (i ? 10 : (lines.length > 1 ? -1 : 4)) + '">' + l + '</tspan>'; }).join('');
      setFilled(false);
      setStrip('blank');
    }
    function setStrip(st) {
      strip = st;
      els.strip.setAttribute('fill', st === 'colored' ? colorAt(val()) : STRIP_BLANK);
    }
    function setFilled(v) {
      filled = v;
      els.pipliq.setAttribute('fill', v && sub ? liquid() : 'transparent');
    }
    function placePip(x, y, smooth) {
      tip = [x, y];
      els.pip.classList.toggle('phl-pip--smooth', !!smooth);
      els.pip.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
    function guide() {
      if (!sub) say('Choisis un flacon pour remplir le bécher.', '');
      else if (strip === 'colored') say('Touche la boîte de papier pH pour comparer les couleurs.', '');
      else if (!filled) say('Fais glisser la pipette dans le bécher pour prélever la solution.', '');
      else say('Approche la pipette au-dessus de la bandelette pour y déposer une goutte.', '');
    }

    // Glisser la pipette : coordonnées du pointeur dans le repère du dessin
    function svgPoint(e) {
      var pt = els.svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(els.svg.getScreenCTM().inverse());
    }
    function inLiquid(x, y) { return x > LIQ.x0 && x < LIQ.x1 && y > LIQ.y0 && y < LIQ.y1; }
    // Cône invisible au-dessus de la bandelette : la goutte tombe si la pointe y entre
    function inCone(x, y) { var dy = STRIP_TOP - y; return dy > 2 && dy < 78 && Math.abs(x - STRIP_X) <= dy * .45 + 10; }
    function onDown(e) {
      if (busy) return;
      if (!sub) { say('Remplis d\'abord le bécher : choisis un flacon.', 'error'); return; }
      var q = svgPoint(e);
      drag = { dx: tip[0] - q.x, dy: tip[1] - q.y, id: e.pointerId };
      els.pip.classList.add('phl-pip--drag');
      e.preventDefault();
    }
    function onMove(e) {
      if (!drag) return;
      var q = svgPoint(e), x = Math.max(16, Math.min(350, q.x + drag.dx)), y = Math.max(70, Math.min(222, q.y + drag.dy));
      placePip(x, y, false);
      if (!filled && inLiquid(x, y)) {
        if (strip === 'colored') setStrip('blank');         // nouvelle bandelette pour une nouvelle mesure
        setFilled(true);
        guide();
      } else if (filled && strip === 'blank' && inCone(x, y)) {
        endDrag();
        dropOnStrip();
      }
    }
    function endDrag() {
      if (!drag) return;
      drag = null;
      els.pip.classList.remove('phl-pip--drag');
      if (!busy) later(250, function () { if (!drag && !busy) placePip(PIP_REST[0], PIP_REST[1], true); });
    }
    function dropOnStrip() {
      busy = true;
      var d = els.drop, x = tip[0], y = tip[1];
      d.setAttribute('fill', liquid());
      d.style.transition = 'none';
      d.style.transform = 'translate(' + x + 'px,' + (y + 3) + 'px)';
      d.style.opacity = 1;
      void d.getBoundingClientRect();
      d.style.transition = 'transform .32s ease-in';
      d.style.transform = 'translate(' + STRIP_X + 'px,' + (STRIP_TOP + 3) + 'px)';
      setFilled(false);
      later(340, function () { d.style.opacity = 0; setStrip('colored'); say('La goutte colore la bandelette…', ''); });
      later(700, function () { placePip(PIP_REST[0], PIP_REST[1], true); });
      later(1840, function () { busy = false; openCmp(); guide(); });
    }

    // ---------- Gros plan sur la boîte ----------
    function answering() { return free || (kind === 'measure' && !solved); }
    function openCmp() {
      if (strip !== 'colored') { say('Dépose d\'abord une goutte de solution sur la bandelette de papier pH.', 'error'); return; }
      var ans = answering();
      els.help.textContent = ans ? 'Fais glisser la bandelette sur le cercle, puis touche la couleur qui correspond.'
        : 'Fais glisser la bandelette sur le cercle pour trouver le pH de la solution.';
      els.cok.style.display = ans ? '' : 'none';
      els.cmsg.textContent = ''; els.cmsg.className = 'ex-feedback phl-cmsg';
      chosenPh = null;
      els.wheel.classList.toggle('phl-wheel--pick', ans);
      els.wheel.querySelectorAll('.phl-sec').forEach(function (s) { s.classList.remove('on'); });
      els.dstrip.style.background = colorAt(val());
      els.cmp.style.display = 'flex';
      // bandelette posée à côté du cercle, prête à être glissée
      els.dstrip.style.left = Math.max(0, els.area.clientWidth - els.dstrip.offsetWidth - 4) + 'px';
      els.dstrip.style.top = '4px';
    }
    function closeCmp() { els.cmp.style.display = 'none'; }
    function onSector(s) {
      if (!answering()) return;
      chosenPh = +s.getAttribute('data-ph');
      els.wheel.querySelectorAll('.phl-sec').forEach(function (x) { x.classList.toggle('on', x === s); });
      if (s.parentNode.lastChild !== s) s.parentNode.insertBefore(s, els.wheel.querySelector('.phl-num'));   // contour sélectionné au premier plan
    }
    function onAnswer() {
      if (chosenPh === null) { els.cmsg.textContent = 'Touche d\'abord une couleur du cercle.'; els.cmsg.className = 'ex-feedback phl-cmsg error'; return; }
      var ok = readOk(chosenPh, val());
      if (free) history.push({ n: sub.n, ok: ok });
      if (ok) {
        els.cmsg.innerHTML = free ? 'Bien lu ! Le pH ' + deLe(sub.n) + ' est de ' + phTxt(val()) + ' : la solution est ' + kindOf(val()) + '.'
          : 'Bien lu ! Le pH de cette solution est de ' + phTxt(val()) + '.';
        els.cmsg.className = 'ex-feedback phl-cmsg success';
        els.cok.style.display = 'none';
        confetti(els.cmsg);
        if (!free) win();
      } else {
        els.cmsg.textContent = free ? 'Pas tout à fait : compare encore la couleur de la bandelette avec le cercle.'
          : 'Ce n\'est pas la bonne valeur : compare encore les couleurs.';
        els.cmsg.className = 'ex-feedback phl-cmsg error';
        if (hooks && hooks.onFail) hooks.onFail();
      }
    }
    function deLe(n) {
      var l = n.charAt(0).toLowerCase() + n.slice(1);
      if (/^(eau|acide)/.test(l)) return 'de l\'' + l;
      if (/^(jus|lait|vinaigre|soda|bicarbonate)/.test(l)) return 'du ' + l;
      return 'de la ' + l;
    }

    // Glisser la bandelette au-dessus du cercle
    function dragStrip() {
      var d = els.dstrip, start = null;
      d.addEventListener('pointerdown', function (e) {
        try { d.setPointerCapture(e.pointerId); } catch (x) { /* pointeur simulé */ }
        start = { x: e.clientX, y: e.clientY, l: d.offsetLeft, t: d.offsetTop };
        d.classList.add('drag');
        e.preventDefault();
      });
      d.addEventListener('pointermove', function (e) {
        if (!start) return;
        var a = els.area;
        d.style.left = Math.max(0, Math.min(a.clientWidth - d.offsetWidth, start.l + e.clientX - start.x)) + 'px';
        d.style.top = Math.max(0, Math.min(a.clientHeight - d.offsetHeight, start.t + e.clientY - start.y)) + 'px';
      });
      function end() { start = null; d.classList.remove('drag'); }
      d.addEventListener('pointerup', end);
      d.addEventListener('pointercancel', end);
      d.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    }

    // ---------- Solution inconnue ----------
    function newUnknown() {
      clearTimers();
      var pool = SUBS.filter(function (s) { return s !== last; });
      last = pick(pool);
      solved = false; chosenCand = null;
      fill(last);
      placePip(PIP_REST[0], PIP_REST[1], false);
      if (kind === 'identify') cands = candidates(last);
      els.q.textContent = kind === 'measure' ? 'Mesure le pH de cette solution inconnue avec le papier pH.'
        : 'Mesure le pH de cette solution inconnue, puis trouve de quelle substance il s\'agit.';
      els.ident.style.display = kind === 'identify' ? '' : 'none';
      els.next.style.display = 'none';
      closeCmp(); els.idov.style.display = 'none';
      guide();
    }
    function openIdent() {
      if (solved) return;
      if (strip !== 'colored') { say('Mesure d\'abord le pH de la solution avec le papier pH.', 'error'); return; }
      els.idrows.innerHTML = cands.map(function (s, i) {
        return '<tr class="phl-row" data-i="' + i + '"><td>' + s.n + '</td><td>' + phTxt(s.ph) + '</td></tr>';
      }).join('');
      chosenCand = null;
      els.idmsg.textContent = ''; els.idmsg.className = 'ex-feedback';
      els.idok.style.display = '';
      els.idov.style.display = 'flex';
    }
    function onIdent() {
      if (chosenCand === null) { els.idmsg.textContent = 'Touche d\'abord une substance du tableau.'; els.idmsg.className = 'ex-feedback error'; return; }
      if (cands[chosenCand] === sub) {
        els.idmsg.innerHTML = 'Bravo, c\'est bien : ' + sub.n + ' (pH ' + phTxt(sub.ph) + ').';
        els.idmsg.className = 'ex-feedback success';
        els.idok.style.display = 'none';
        win();
      } else {
        els.idmsg.textContent = 'Ce n\'est pas cette substance : compare bien le pH mesuré avec le tableau.';
        els.idmsg.className = 'ex-feedback error';
        if (hooks && hooks.onFail) hooks.onFail();
      }
    }
    function win() {
      solved = true;
      confetti(els.msg);
      say(kind === 'measure' ? 'Bravo ! Le pH de cette solution est de ' + phTxt(sub.ph) + '.' : 'Bravo ! Il s\'agissait de : ' + sub.n + '.', 'success');
      els.ident.style.display = 'none';
      if (hooks) { if (hooks.onSolved) hooks.onSolved(); }
      else els.next.style.display = '';
    }

    // ---------- Démarrage ----------
    function reset() {
      clearTimers();
      drag = null;
      sub = null; history = [];
      els.liq.setAttribute('fill', 'transparent');
      els.surf.setAttribute('opacity', '0');
      els.tag.style.display = 'none';
      strip = 'blank'; els.strip.setAttribute('fill', STRIP_BLANK);
      setFilled(false);
      els.drop.style.opacity = 0;
      placePip(PIP_REST[0], PIP_REST[1], false);
      closeCmp();
      if (els.pick) els.pick.style.display = 'none';
      if (els.idov) els.idov.style.display = 'none';
    }
    function start(k) {
      if (!root) return;
      reset();
      if (free) { guide(); return; }
      kind = k || (cfg.mode === 'test' ? (kind === 'measure' && last ? 'identify' : 'measure') : 'measure');
      newUnknown();
    }

    function init() {
      root = $(cfg.sectionId);
      if (!root) return;
      root.innerHTML = tpl();
      var g = function (s) { return $(p + '-' + s); };
      els = {
        q: g('q'), msg: g('msg'), svg: g('svg'), liq: g('liq'), surf: g('surf'), tag: g('tag'), label: g('label'), strip: g('strip'),
        pip: g('pip'), pipliq: g('pipliq'), drop: g('drop'), cmp: g('cmp'), area: g('area'), dstrip: g('dstrip'),
        help: g('help'), cmsg: g('cmsg'), cok: g('cok'), pick: g('pick'), ident: g('ident'), next: g('next'),
        idov: g('idov'), idrows: g('idrows'), idmsg: g('idmsg'), idok: g('idok')
      };
      els.wheel = els.area.querySelector('.phl-wheel');
      els.pip.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      els.pip.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
      g('box').addEventListener('click', function () { if (!busy) openCmp(); });
      g('cclose').addEventListener('click', closeCmp);
      els.cok.addEventListener('click', onAnswer);
      els.wheel.addEventListener('click', function (e) { var s = e.target.closest('.phl-sec'); if (s) onSector(s); });
      els.cmp.addEventListener('click', function (e) { if (e.target === els.cmp) closeCmp(); });
      dragStrip();
      if (free) {
        g('select').addEventListener('click', function () { if (!busy) els.pick.style.display = 'flex'; });
        g('pickclose').addEventListener('click', function () { els.pick.style.display = 'none'; });
        els.pick.addEventListener('click', function (e) {
          var b = e.target.closest('.phl-sub');
          if (b) { els.pick.style.display = 'none'; fill(SUBS[+b.getAttribute('data-i')]); guide(); }
          else if (e.target === els.pick) els.pick.style.display = 'none';
        });
      } else {
        els.ident.addEventListener('click', openIdent);
        els.next.addEventListener('click', function () { start(); });
        g('idclose').addEventListener('click', function () { els.idov.style.display = 'none'; });
        els.idok.addEventListener('click', onIdent);
        els.idrows.addEventListener('click', function (e) {
          var r = e.target.closest('.phl-row');
          if (!r) return;
          chosenCand = +r.getAttribute('data-i');
          els.idrows.querySelectorAll('.phl-row').forEach(function (x) { x.classList.toggle('on', x === r); });
        });
        els.idov.addEventListener('click', function (e) { if (e.target === els.idov) els.idov.style.display = 'none'; });
      }
      var back = g('back');
      if (back) back.addEventListener('click', function () { clearTimers(); window.App.back(); });
      reset();
    }

    document.addEventListener('DOMContentLoaded', init);
    return {
      start: start,
      hooks: hooks,
      // state() : lu par la leçon « Acides et bases »
      state: function () { return { sub: sub && sub.n, strip: strip, filled: filled, busy: busy, history: history.slice() }; },
      stop: clearTimers,
      // test() : manipulations simulées pour les essais automatiques
      test: { choose: function (i) { fill(SUBS[i]); }, dip: function () { setFilled(true); if (strip === 'colored') setStrip('blank'); }, drop: function () { tip = [STRIP_X, 190]; dropOnStrip(); } }
    };
  }

  // ---------- Illustrations du protocole (leçon) ----------
  function protocolHTML() {
    var f1 = '<svg viewBox="214 196 142 34" aria-hidden="true">' + paperSVG(222, 205, STRIP_BLANK) + '</svg>';
    var f2 = '<svg viewBox="214 110 142 120" aria-hidden="true">' + paperSVG(222, 205, colorAt(4), null) +
      '<g transform="translate(285 186)">' + pipetteSVG() + '</g><circle cx="285" cy="196" r="2.6" fill="rgba(200,230,250,.9)" stroke="#8FA3B3" stroke-width=".6"/></svg>';
    var f3 = '<div class="phl-fig3">' + wheelSVG({ cls: 'phl-fig-wheel' }) + '<span class="phl-fig-strip" style="background:' + colorAt(4) + '"></span></div>';
    function fig(n, svg, cap) { return '<figure class="phl-fig"><div class="phl-fig-img">' + svg + '</div><figcaption><b>' + n + '.</b> ' + cap + '</figcaption></figure>'; }
    return '<div class="phl-figs">' +
      fig(1, f1, 'Une bandelette de papier pH, posée sur du papier essuie-tout.') +
      fig(2, f2, 'On y dépose <b>une goutte</b> de solution avec une pipette.') +
      fig(3, f3, 'On compare la couleur avec celles de la boîte.') + '</div>';
  }

  // ============================================================
  // Bécher des ions H⁺ et HO⁻ (leçon) : 16 ions, un seul ion opposé aux extrémités
  // ============================================================
  var BEAKER = { x0: 72, x1: 228, y0: 86, y1: 226 };
  function counts(ph) { return { h: 1 + (14 - ph), ho: 1 + ph }; }
  function beakerSVG(inner, id) {
    return '<svg class="phi-svg"' + (id ? ' id="' + id + '"' : '') + ' viewBox="0 0 300 250" aria-hidden="true">' +
      '<path d="M62 70V226q0 12 12 12h152q12 0 12-12V70z" fill="rgba(120,185,235,.28)"/>' +
      '<path d="M62 70h176" stroke="#fff" stroke-width="2.5" opacity=".7"/>' + inner +
      '<path d="M52 24h12M236 24h12M62 24V226q0 12 12 12h152q12 0 12-12V24" fill="none" stroke="#7F9DB3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function ionText(x, y, isH) {
    return '<text class="phi ' + (isH ? 'phi--h' : 'phi--ho') + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '">' +
      (isH ? 'H' : 'HO') + '<tspan class="phi-sup" dy="-6">' + (isH ? '+' : '−') + '</tspan></text>';
  }
  // Bécher figé (questions à choix, fiche « À retenir »)
  function ionsSVG(nH, nHO) {
    var out = '', k = 0, n = nH + nHO;
    shuffle(Array.apply(null, { length: n }).map(function (x, i) { return i; })).forEach(function (slot) {
      var col = slot % 4, row = Math.floor(slot / 4);
      out += ionText(82 + col * 38 + Math.random() * 14, 104 + row * (120 / Math.ceil(n / 4)) + Math.random() * 12, k++ < nH);
    });
    return beakerSVG(out);
  }

  var Ions = (function () {
    var P = [], layer = null, raf = null, lastT = 0, ph = 7;
    function build(host) {
      host.innerHTML = beakerSVG('<g id="phi-layer"></g>', 'phi-live');
      layer = $('phi-layer');
      for (var i = 0; i < 16; i++) {
        var t = document.createElementNS(NS, 'text'), main = document.createTextNode(''), sup = document.createElementNS(NS, 'tspan');
        sup.setAttribute('class', 'phi-sup'); sup.setAttribute('dy', '-6');
        t.appendChild(main); t.appendChild(sup);
        layer.appendChild(t);
        var a = Math.random() * 6.283;
        P.push({ el: t, main: main, sup: sup, x: BEAKER.x0 + Math.random() * (BEAKER.x1 - BEAKER.x0), y: BEAKER.y0 + Math.random() * (BEAKER.y1 - BEAKER.y0), vx: Math.cos(a) * 18, vy: Math.sin(a) * 18 });
      }
      set(ph);
    }
    function set(v) {
      ph = v;
      if (!layer) return;
      var c = counts(v);
      P.forEach(function (p, i) {
        var isH = i < c.h;
        p.el.setAttribute('class', 'phi ' + (isH ? 'phi--h' : 'phi--ho'));
        p.main.data = isH ? 'H' : 'HO';
        p.sup.textContent = isH ? '+' : '−';
      });
    }
    function frame(t) {
      var dt = Math.min(.05, (t - lastT) / 1000 || .016); lastT = t;
      P.forEach(function (p) {
        p.vx += (Math.random() - .5) * 60 * dt; p.vy += (Math.random() - .5) * 60 * dt;
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > 26) { p.vx *= 26 / sp; p.vy *= 26 / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < BEAKER.x0) { p.x = BEAKER.x0; p.vx = Math.abs(p.vx); } else if (p.x > BEAKER.x1 - 16) { p.x = BEAKER.x1 - 16; p.vx = -Math.abs(p.vx); }
        if (p.y < BEAKER.y0) { p.y = BEAKER.y0; p.vy = Math.abs(p.vy); } else if (p.y > BEAKER.y1) { p.y = BEAKER.y1; p.vy = -Math.abs(p.vy); }
      });
      // Les ions s'écartent les uns des autres pour rester lisibles
      for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
        var a = P[i], b = P[j], dx = b.x - a.x, dy = (b.y - a.y) * 1.6, dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < 34 && dd > .01) { var m = (34 - dd) * .12 / dd; a.x -= dx * m; a.y -= dy * m / 1.6; b.x += dx * m; b.y += dy * m / 1.6; }
      }
      P.forEach(function (p) {
        p.x = Math.max(BEAKER.x0, Math.min(BEAKER.x1 - 16, p.x)); p.y = Math.max(BEAKER.y0, Math.min(BEAKER.y1, p.y));
        p.el.setAttribute('x', p.x.toFixed(1)); p.el.setAttribute('y', p.y.toFixed(1));
      });
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && layer) { lastT = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
    return { build: build, set: set, start: start, stop: stop };
  })();

  // ---------- Instances ----------
  var lesson = createPhLab({ sectionId: 'ph-lab-host', prefix: 'phn', mode: 'free', embedded: true, intro: '' });
  var bench = createPhLab({ sectionId: 'screen-phlab', prefix: 'pfl', mode: 'free', title: 'Mesurer le pH',
    intro: 'Choisis un flacon, puis mesure le pH de la solution avec le papier pH.' });
  var test = createPhLab({ sectionId: 'screen-phlab-test', prefix: 'ptr', mode: 'test', title: 'Mesurer le pH' });
  var challenge = createPhLab({ sectionId: 'screen-phlab-ch', prefix: 'pch', mode: 'expert', title: 'Le pH' });

  document.addEventListener('DOMContentLoaded', function () {
    var host = $('ph-beaker');
    if (host) Ions.build(host);
    // Le bécher des ions ne s'anime que sur l'écran de la leçon
    window.App.onShow(function (id) { if (id === 'screen-ph') Ions.start(); else Ions.stop(); });
  });

  return {
    SUBS: SUBS, COLORS: COLORS, colorAt: colorAt, phTxt: phTxt, kindOf: kindOf, counts: counts, ionsSVG: ionsSVG,
    wheelSVG: wheelSVG, protocolHTML: protocolHTML,
    Ions: Ions, lesson: lesson, bench: bench, test: test, challenge: challenge
  };
})();
