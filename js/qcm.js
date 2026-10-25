// qcm.js
// Questions à choix (une seule bonne réponse parmi 3 au plus, ou vrai / faux), générées au hasard
// par thème. Utilisées par le Challenge (1 point chacune) et par les entraînements de certaines leçons.
// Une question : { q (énoncé HTML), visual (illustration HTML ou ''), choices: [HTML], answer (indice),
//                  explain (HTML, montré en cas d'erreur), pt (true : bouton « Tableau périodique ») }
window.Qcm = (function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var MINUS = '−';

  // ---------- Outils ----------
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // good : bonne réponse ; bads : mauvaises réponses (les 2 premières différentes sont gardées)
  // o.fixed : garder l'ordre (vrai / faux, acide / neutre / basique…)
  function mk(q, good, bads, o) {
    o = o || {};
    var others = [];
    bads.forEach(function (b) { if (b !== good && others.indexOf(b) < 0 && others.length < 2) others.push(b); });
    var choices = o.fixed ? o.fixed : shuffle([good].concat(others));
    return { q: q, visual: o.visual || '', choices: choices, answer: choices.indexOf(good), explain: o.explain || '', pt: !!o.pt };
  }
  function trueFalse(q, isTrue, explain) { return mk(q, isTrue ? 'Vrai' : 'Faux', [], { fixed: ['Vrai', 'Faux'], explain: explain }); }
  function de(name) { var n = name.toLowerCase(); return (/^[aeiouyhéèêâîô]/.test(n) ? "d'" : 'de ') + n; }
  function plural(n, w) { return n + ' ' + w + (n > 1 ? 's' : ''); }
  function sub(f) { return window.Molecules.formatSubscripts(f); }
  function big(html) { return '<div class="qcm-formula">' + html + '</div>'; }
  function ionTxt(sym, charge) { return sym + window.AtomKit.chargeSup(charge); }
  // Deux valeurs numériques différentes de good, proches d'elle
  function nearBads(good, list) {
    var out = [];
    list.concat([good + 1, good + 2, good - 1, good + 3]).forEach(function (v) {
      if (v >= 0 && v !== good && out.indexOf(v) < 0) out.push(v);
    });
    return out.slice(0, 2);
  }

  // ---------- Illustrations ----------
  // Représentation microscopique : triangles serrés et rangés, serrés en vrac, ou très écartés
  function microSVG(kind) {
    var seed = 7 + rnd(90), out = '';
    function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function tri(x, y, a) { return '<polygon class="st-tri" points="0,-5.2 -4.5,2.6 4.5,2.6" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + a.toFixed(0) + ')"/>'; }
    var row, col;
    if (kind === 'solid') {
      for (row = 0; row < 4; row++) for (col = 0; col < 8; col++) {
        var up = (row + col) % 2 === 0;
        out += tri(31 + col * 5.4, 53 - row * 6.2 + (up ? 0 : -1.6), up ? 0 : 180);
      }
    } else if (kind === 'liquid') {
      for (row = 0; row < 2; row++) for (col = 0; col < 13; col++) out += tri(8 + col * 7 + (r() - .5) * 2.4, 53 - row * 7.5 + (r() - .5) * 2, r() * 360);
    } else {
      for (var i = 0; i < 12; i++) out += tri(8 + (i % 4) * 26 + r() * 10, 8 + Math.floor(i / 4) * 19 + r() * 9, r() * 360);
    }
    return '<svg class="qcm-svg" viewBox="0 0 100 60" aria-hidden="true"><rect x="2" y="2" width="96" height="58" rx="6" class="qcm-beaker"/>' + out + '</svg>';
  }
  // Courbe de température d'un changement d'état : palier (corps pur) ou pente (mélange)
  function curveSVG(pure, cooling) {
    var d = pure ? 'M14 50L40 30H66L92 10' : 'M14 50L36 34L70 22L92 10';
    if (cooling) d = pure ? 'M14 10L40 30H66L92 50' : 'M14 10L36 22L70 34L92 50';
    return '<svg class="qcm-svg" viewBox="0 0 100 62" aria-hidden="true">' +
      '<path d="M10 4V56H96" fill="none" stroke="#3B4652" stroke-width="1.4"/>' +
      '<text x="12" y="9" font-size="5.5" fill="#3B4652">T (°C)</text><text x="96" y="61" font-size="5.5" text-anchor="end" fill="#3B4652">temps</text>' +
      '<path d="' + d + '" fill="none" stroke="#1F2E48" stroke-width="2.6" stroke-linejoin="round"/></svg>';
  }

  // ================= Questions de 4e =================
  var CHG = [
    { n: 'Fusion', a: 'solide', b: 'liquide', heat: true },
    { n: 'Solidification', a: 'liquide', b: 'solide', heat: false },
    { n: 'Vaporisation', a: 'liquide', b: 'gazeux', heat: true },
    { n: 'Liquéfaction', a: 'gazeux', b: 'liquide', heat: false }
  ];
  function etats() {
    var c = pick(CHG), others = shuffle(CHG.filter(function (x) { return x !== c; }));
    var k = rnd(4);
    if (k === 0) return mk('Comment s\'appelle le passage de l\'état ' + c.a + ' à l\'état ' + c.b + ' ?', c.n, others.map(function (x) { return x.n; }));
    if (k === 1) return mk('La <b>' + c.n.toLowerCase() + '</b> est le passage :', 'de l\'état ' + c.a + ' à l\'état ' + c.b,
      others.map(function (x) { return 'de l\'état ' + x.a + ' à l\'état ' + x.b; }));
    if (k === 2) return mk('Pour réaliser une <b>' + c.n.toLowerCase() + '</b>, il faut :', c.heat ? 'chauffer' : 'refroidir', [], { fixed: ['chauffer', 'refroidir'] });
    return mk('Pendant un changement d\'état, le nombre de molécules :', 'reste le même', ['augmente', 'diminue']);
  }

  var MICRO = [
    { k: 'solid', n: 'solide', d: 'serrées et rangées' },
    { k: 'liquid', n: 'liquide', d: 'serrées mais désordonnées' },
    { k: 'gas', n: 'gazeux', d: 'très écartées et désordonnées' }
  ];
  function micro() {
    var m = pick(MICRO), others = MICRO.filter(function (x) { return x !== m; });
    if (rnd(2)) {
      return mk('Cette représentation microscopique montre une matière à l\'état :', m.n, [], {
        visual: microSVG(m.k), fixed: ['solide', 'liquide', 'gazeux'], explain: 'Un triangle représente une molécule.'
      });
    }
    return mk('À l\'état ' + m.n + ', les molécules sont :', m.d, others.map(function (x) { return x.d; }));
  }

  var GAZ = [
    ['Un gaz est compressible.', true],
    ['Un gaz est extensible.', true],
    ['Un liquide est compressible.', false],
    ['Un solide est compressible.', false],
    ['Un liquide est extensible.', false],
    ['Un gaz se dilate quand on le chauffe.', true],
    ['Un gaz se contracte quand on le refroidit.', true],
    ['Un gaz se contracte quand on le chauffe.', false],
    ['Les molécules d\'un gaz sont serrées les unes contre les autres.', false],
    ['Un gaz occupe tout le volume disponible.', true],
    ['On peut liquéfier un gaz en le comprimant.', true],
    ['On peut liquéfier un gaz en le chauffant.', false],
    ['Un solide n\'est ni compressible ni extensible.', true]
  ];
  function gaz() {
    var g = pick(GAZ);
    return trueFalse(g[0], g[1], 'Seul le gaz est compressible et extensible : ses molécules sont très écartées les unes des autres.');
  }

  function palier() {
    var k = rnd(3), pure = !!rnd(2);
    if (k === 0) {
      return mk('Cette courbe de température a été obtenue pendant un changement d\'état. Il s\'agit :', pure ? 'd\'un corps pur' : 'd\'un mélange', [], {
        visual: curveSVG(pure, !!rnd(2)), fixed: ['d\'un corps pur', 'd\'un mélange'], explain: 'Un corps pur change d\'état à température constante : sa courbe présente un palier.'
      });
    }
    if (k === 1) return mk('Pendant le changement d\'état d\'un <b>corps pur</b>, la température :', 'reste constante', ['augmente', 'diminue']);
    return mk('Pendant le changement d\'état d\'un <b>mélange</b>, la température :', 'continue de varier', ['reste constante', 'devient nulle']);
  }

  // Molécules dont la formule suit la règle générique (les variantes fausses ont alors la même allure)
  var molCache = null;
  function molecules() {
    if (molCache) return molCache;
    var M = window.Molecules;
    molCache = M.getAllKnown().filter(function (m) {
      var syms = Object.keys(m.counts);
      return sub(m.formula) === M.buildFormula(m.counts) && (syms.length > 1 || m.counts[syms[0]] > 1);
    });
    return molCache;
  }
  function elName(sym) { return window.Units.getBySymbol(sym).name; }
  function composition(counts) {
    var parts = Object.keys(counts).map(function (s) { return plural(counts[s], 'atome') + ' ' + de(elName(s)); });
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1] : parts[0];
  }
  function formule() {
    var k = rnd(5);
    if (k === 3) return mk('Que désigne l\'écriture <b>Co</b> ?', 'l\'atome de cobalt',
      ['une molécule faite d\'un atome de carbone et d\'un atome d\'oxygène', 'deux atomes de carbone'],
      { explain: 'Co (C majuscule, o minuscule) est le symbole du cobalt. CO est une molécule : 1 carbone et 1 oxygène.' });
    if (k === 4) return mk('Dans la formule CO' + sub('2') + ', le petit 2 indique :', '2 atomes d\'oxygène', ['2 atomes de carbone', '2 molécules de CO']);
    var m = pick(molecules()), M = window.Molecules, syms = Object.keys(m.counts);
    if (k <= 1) {
      var s = pick(syms), n = m.counts[s];
      return mk('Combien d\'atomes ' + de(elName(s)) + ' y a-t-il dans une molécule de formule ' + sub(m.formula) + ' ?', String(n),
        nearBads(n, []).filter(function (v) { return v > 0; }).map(String), { visual: big(sub(m.formula)) });
    }
    var good = M.buildFormula(m.counts), bads = [];
    function variant(fn) { var c = {}; syms.forEach(function (x) { c[x] = m.counts[x]; }); fn(c); var f = M.buildFormula(c); if (f !== good) bads.push(f); }
    if (syms.length > 1) variant(function (c) { var t = c[syms[0]]; c[syms[0]] = c[syms[1]]; c[syms[1]] = t; });
    variant(function (c) { c[syms[syms.length - 1]] += 1; });
    variant(function (c) { var x = syms[0]; c[x] = c[x] > 1 ? c[x] - 1 : c[x] + 2; });
    return mk('Quelle est la formule de la molécule composée de ' + composition(m.counts) + ' ?', good, shuffle(bads));
  }

  // Nom courant d'une substance (catalogue), sinon l'étiquette de l'énoncé sans son article
  function subName(s) {
    var c = window.Equations.getCatalog().filter(function (x) { return x.formula === s.formula; })[0];
    if (c) return c.name;
    return s.label.replace(/^(de l'|de la |du |des |de |d'|l'|le |la |les )/i, '');
  }
  function reaction() {
    var r = pick(window.Equations.getReactions()), wantR = !!rnd(2);
    var want = r.substances.filter(function (s) { return (s.type === 'reactif') === wantR; });
    var other = r.substances.filter(function (s) { return (s.type === 'reactif') !== wantR; });
    var phrase = r.template.replace(/\{(\d+)\}/g, function (_, i) { return '<b>' + r.substances[+i].label + '</b>'; });
    return mk('Quel est ' + (wantR ? 'un réactif' : 'un produit') + ' de cette transformation ?', subName(pick(want)),
      shuffle(other).map(subName), {
        visual: '<p class="qcm-phrase">' + phrase + '</p>',
        explain: 'Les réactifs sont les substances de départ (état initial), les produits celles obtenues à la fin (état final).'
      });
  }

  function balanced(subs) {
    var t = {};
    subs.forEach(function (s) {
      var c = window.Molecules.parseFormulaInput(s.f);
      Object.keys(c).forEach(function (k) { t[k] = (t[k] || 0) + c[k] * s.c * (s.r ? 1 : -1); });
    });
    return Object.keys(t).every(function (k) { return t[k] === 0; });
  }
  function equationHTML(subs) {
    function side(r) {
      return subs.filter(function (s) { return s.r === r; }).map(function (s) { return (s.c > 1 ? s.c + ' ' : '') + sub(s.f); }).join(' + ');
    }
    return big(side(true) + ' → ' + side(false));
  }
  function equation() {
    var k = rnd(4);
    if (k === 2) return mk('Lors d\'une transformation chimique, les atomes :', 'sont conservés', ['disparaissent', 'se transforment en d\'autres atomes'],
      { explain: 'Principe de Lavoisier : rien ne se perd, rien ne se crée, tout se transforme.' });
    if (k === 3) return mk('Dans une équation chimique, les réactifs s\'écrivent :', 'avant la flèche', [], { fixed: ['avant la flèche', 'après la flèche'] });
    var b = pick(window.Equations.getBalanceBank()), subs = [];
    b.r.forEach(function (x) { subs.push({ f: x[0], c: x[1], r: true }); });
    b.p.forEach(function (x) { subs.push({ f: x[0], c: x[1], r: false }); });
    var ok = !!rnd(2);
    if (!ok) {
      var cand = shuffle(subs);
      for (var i = 0; i < cand.length; i++) {
        var old = cand[i].c;
        cand[i].c = old > 1 ? 1 : 2;
        if (!balanced(subs)) break;
        cand[i].c = old;
      }
    }
    var isBal = balanced(subs);
    return mk('Cette équation chimique est-elle équilibrée ?', isBal ? 'Oui' : 'Non', [], {
      visual: equationHTML(subs), fixed: ['Oui', 'Non'],
      explain: 'Compte les atomes de chaque sorte de chaque côté de la flèche : ils doivent être les mêmes.'
    });
  }

  var TRANSFO = [
    ['Un glaçon qui fond', false], ['De l\'eau qui bout dans une casserole', false], ['De la buée sur une vitre froide', false],
    ['Du sel qui se dissout dans l\'eau', false], ['Du chocolat qui fond au soleil', false],
    ['Du bicarbonate de soude versé dans du vinaigre : des bulles de gaz apparaissent', true],
    ['La combustion du bois dans une cheminée', true], ['Un clou en fer qui rouille', true],
    ['Du zinc plongé dans de l\'acide chlorhydrique : un gaz se dégage', true],
    ['Du sucre chauffé qui devient noir (carbone) en dégageant de l\'eau', true]
  ];
  function transfo() {
    if (!rnd(4)) return mk('Il y a une transformation chimique lorsque :', 'de nouvelles molécules apparaissent',
      ['la matière change d\'état', 'les molécules restent les mêmes']);
    var t = pick(TRANSFO);
    return mk('« ' + t[0] + ' » est une transformation :', t[1] ? 'chimique' : 'physique', [], {
      fixed: ['physique', 'chimique'],
      explain: 'Transformation chimique : on ne retrouve pas les mêmes molécules entre l\'état initial et l\'état final.'
    });
  }

  var ROLES = ['le combustible', 'le comburant', 'la source de chaleur'];
  function feu() {
    var k = rnd(5), fuel = pick(['du méthane', 'du butane', 'du bois', 'du charbon']);
    if (k === 0) return mk('Dans la combustion ' + fuel + ', le dioxygène de l\'air est :', 'le comburant', ROLES);
    if (k === 1) return mk('Dans la combustion ' + fuel + ', ' + fuel.replace(/^du /, 'le ') + ' est :', 'le combustible', ROLES);
    if (k === 2) return mk('L\'allumette qui démarre une combustion joue le rôle :', 'de la source de chaleur', ['du combustible', 'du comburant']);
    if (k === 3) return mk('Pour qu\'une combustion se produise, il faut :', 'un combustible, un comburant et une source de chaleur',
      ['un combustible et de l\'eau', 'un comburant et du froid']);
    var w = pick([
      ['Étouffer un feu avec une couverture le prive :', 'du comburant (l\'air)'],
      ['Arroser un feu avec de l\'eau le prive :', 'de la chaleur'],
      ['Retirer les arbres autour d\'un feu de forêt (pare-feu) le prive :', 'du combustible']
    ]);
    return mk(w[0], w[1], ['du comburant (l\'air)', 'de la chaleur', 'du combustible']);
  }

  // ================= Questions de 3e =================
  var PART = [
    ['Le proton a une charge électrique :', 'positive', ['négative', 'nulle (il est neutre)']],
    ['Le neutron a une charge électrique :', 'nulle (il est neutre)', ['positive', 'négative']],
    ['L\'électron a une charge électrique :', 'négative', ['positive', 'nulle (il est neutre)']],
    ['Les électrons se trouvent :', 'autour du noyau', ['dans le noyau', 'collés aux neutrons']],
    ['Le noyau d\'un atome contient :', 'des protons et des neutrons', ['des protons et des électrons', 'uniquement des électrons']],
    ['Un atome est électriquement :', 'neutre', ['positif', 'négatif']],
    ['Un atome possède toujours autant :', 'de protons que d\'électrons', ['de protons que de neutrons', 'de neutrons que d\'électrons']],
    ['Le nom d\'un atome dépend de son nombre :', 'de protons', ['de neutrons', 'd\'électrons']],
    ['Les nucléons sont :', 'les protons et les neutrons', ['les protons et les électrons', 'les neutrons et les électrons']],
    ['On connaît aujourd\'hui environ :', '118 types d\'atomes', ['20 types d\'atomes', 'un million de types d\'atomes']]
  ];
  function particules() { var p = pick(PART); return mk(p[0], p[1], p[2]); }

  function ecriture() {
    // Atomes 1 à 18, comme le tableau périodique affiché par l'appli
    var els = window.Units.getAll().filter(function (e) { return e.z <= 18; }), el = pick(els), A = el.mass, Z = el.z, N = A - Z;
    if (!rnd(4)) {
      var near = els.filter(function (e) { return Math.abs(e.z - Z) <= 3 && e !== el; });
      var lab = function (e) { return e.name + ' (' + e.symbol + ')'; };
      return mk('Quel atome possède ' + plural(Z, 'proton') + ' ?', lab(el), shuffle(near).map(lab), { pt: true });
    }
    var w = pick([['protons', Z, [A, N]], ['neutrons', N, [A, Z]], ['électrons', Z, [N, A]], ['nucléons', A, [Z, N]]]);
    return mk('D\'après son écriture conventionnelle, combien de <b>' + w[0] + '</b> possède cet atome ?', String(w[1]),
      nearBads(w[1], w[2]).map(String), {
        visual: '<div class="atom-cell qcm-cell">' + window.AtomKit.cellHTML(el, 0) + '</div>',
        explain: 'En haut : les nucléons. En bas : les protons (le numéro atomique). Électrons = protons ; neutrons = nucléons − protons.'
      });
  }

  function ion() {
    var k = rnd(5);
    if (k === 4) {
      var p = !!rnd(2);
      return mk('Un ion ' + (p ? 'positif' : 'négatif') + ' est un atome qui a :', p ? 'perdu des électrons' : 'gagné des électrons',
        [p ? 'gagné des électrons' : 'perdu des électrons', p ? 'gagné des protons' : 'perdu des protons']);
    }
    var it = pick(window.Ions.pools.ions), el = window.Units.getByZ(it.z), c = it.charge, n = Math.abs(c), t = ionTxt(el.symbol, c);
    if (k === 0) {
      var v = c > 0 ? 'perdu ' : 'gagné ', o = c > 0 ? 'gagné ' : 'perdu ';
      return mk('L\'ion ' + t + ' est un atome ' + de(el.name) + ' qui a :', v + plural(n, 'électron'),
        [o + plural(n, 'électron'), v + plural(n + 1, 'électron')]);
    }
    if (k === 1) return mk('L\'ion ' + t + ' est :', c > 0 ? 'un ion positif' : 'un ion négatif', [], { fixed: ['un ion positif', 'un ion négatif'] });
    var e = it.z - c;
    return mk('Combien d\'électrons possède l\'ion ' + t + ' ?', String(e), nearBads(e, [it.z, it.z + c]).map(String), {
      pt: true, explain: 'L\'atome ' + de(el.name) + ' a ' + plural(it.z, 'électron') + ' ; l\'ion en a ' + (c > 0 ? 'perdu ' : 'gagné ') + n + '.'
    });
  }

  function tests() {
    var L = window.Lab, T = L.data.tests;
    function ionK(key) { return L.ionHTML(L.data.ions.filter(function (i) { return i.key === key; })[0]); }
    var k = rnd(5);
    if (k === 0) {
      var key = pick(['Cu2+', 'Fe2+', 'Fe3+']);
      return mk('Avec la soude, un précipité <b>' + T.naoh[key] + '</b> révèle la présence de l\'ion :', ionK(key),
        ['Cu2+', 'Fe2+', 'Fe3+'].filter(function (x) { return x !== key; }).map(ionK));
    }
    if (k === 1) {
      var key2 = pick(Object.keys(T.naoh));
      return mk('Avec la soude, l\'ion ' + ionK(key2) + ' forme un précipité :', T.naoh[key2],
        shuffle(['bleu', 'vert', 'rouille', 'blanc'].filter(function (x) { return x !== T.naoh[key2]; })));
    }
    if (k === 2) return mk('Le nitrate d\'argent forme un précipité blanc avec l\'ion :', ionK('Cl-'), shuffle(['Na+', 'Cu2+', 'Fe2+', 'Zn2+']).map(ionK));
    if (k === 3) {
      var fk = pick(Object.keys(T.flame));
      return mk('Au test à la flamme, une flamme <b>' + T.flame[fk].name + '</b> révèle la présence de l\'ion :', ionK(fk),
        shuffle(Object.keys(T.flame).filter(function (x) { return x !== fk; })).map(ionK));
    }
    return mk('Quel réactif permet de mettre en évidence l\'ion ' + ionK('Cl-') + ' ?', 'le nitrate d\'argent', ['la soude', 'l\'eau']);
  }

  // Bandelette de papier pH colorée, avec la gamme de la boîte
  function stripHTML(v) {
    var P = window.PhLab;
    return '<div class="qcm-strip">' + P.wheelSVG({ cls: 'qcm-wheel' }) + '<div class="qcm-strip__paper" style="background:' + P.colorAt(v) + '"></div></div>';
  }
  function ph() {
    var k = rnd(9), P = window.PhLab, KIND = ['acide', 'neutre', 'basique'];
    if (k === 6) {
      // Comparaison de deux solutions dont le pH est donné
      var two = shuffle(P.SUBS).filter(function (s, i, a) { return a.findIndex(function (x) { return x.ph === s.ph; }) === i; }).slice(0, 2);
      var more = !!rnd(2), a = two[0], b = two[1];
      var isTrue = more ? a.ph < b.ph : a.ph > b.ph;
      var art = function (n) {
        var l = n.charAt(0).toLowerCase() + n.slice(1);
        if (/^[aeiou]/.test(l)) return 'l\'' + l;
        return (l === 'soude' ? 'la ' : 'le ') + l;
      };
      var A = art(a.n);
      return trueFalse(A.charAt(0).toUpperCase() + A.slice(1) + ' (pH = ' + P.phTxt(a.ph) + ') est plus ' + (more ? 'acide' : 'basique') + ' que ' + art(b.n) + ' (pH = ' + P.phTxt(b.ph) + ').',
        isTrue, 'Plus le pH est petit, plus la solution est acide ; plus il est grand, plus elle est basique.');
    }
    if (k === 7) {
      var sv = pick([1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13]);
      return mk('Une goutte de solution a coloré cette bandelette de papier pH. La solution est :', P.kindOf(sv), [], {
        visual: stripHTML(sv), fixed: KIND, explain: 'La couleur de la bandelette correspond à un pH de ' + sv + '.'
      });
    }
    if (k === 8) {
      var iv = pick([1, 3, 5, 7, 7, 9, 11, 13]), n = P.counts(iv), half = function (x) { return Math.max(1, Math.round(x / 2)); };
      return mk('Ce bécher représente les ions ' + ionTxt('H', 1) + ' et ' + ionTxt('HO', -1) + ' d\'une solution. Elle est :', P.kindOf(iv), [], {
        visual: '<div class="qcm-beaker-ions">' + P.ionsSVG(half(n.h), half(n.ho)) + '</div>', fixed: KIND,
        explain: 'Plus d\'ions H⁺ : acide ; plus d\'ions HO⁻ : basique ; autant des deux : neutre.'
      });
    }
    if (k === 0) {
      var v = rnd(15);
      return mk('Une solution de <b>pH = ' + v + '</b> est :', v < 7 ? 'acide' : (v === 7 ? 'neutre' : 'basique'), [], {
        fixed: ['acide', 'neutre', 'basique'], explain: 'pH inférieur à 7 : acide ; égal à 7 : neutre ; supérieur à 7 : basique.'
      });
    }
    var H = ionTxt('H', 1), HO = ionTxt('HO', -1);
    if (k === 1) return mk('Les ions responsables du caractère <b>acide</b> d\'une solution sont les ions :', H, [HO, ionTxt('Na', 1)]);
    if (k === 2) return mk('Les ions responsables du caractère <b>basique</b> d\'une solution sont les ions :', HO, [H, ionTxt('Cl', -1)]);
    if (k === 3) return mk('Le pH d\'une solution se mesure avec :', 'du papier pH ou un pH-mètre', ['un thermomètre', 'une balance']);
    if (k === 4) {
      var vals = shuffle([1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13]).slice(0, 3), min = Math.min.apply(null, vals);
      return mk('Quelle solution est la plus acide ?', 'pH = ' + min, vals.filter(function (x) { return x !== min; }).map(function (x) { return 'pH = ' + x; }),
        { explain: 'Plus le pH est petit, plus la solution est acide.' });
    }
    return mk('Une solution qui contient autant d\'ions ' + H + ' que d\'ions ' + HO + ' est :', 'neutre', [], { fixed: ['acide', 'neutre', 'basique'] });
  }

  var GEN = {
    etats: etats, micro: micro, gaz: gaz, palier: palier, formule: formule, reaction: reaction, equation: equation, transfo: transfo, feu: feu,
    particules: particules, ecriture: ecriture, ion: ion, tests: tests, ph: ph
  };
  var CATS = {
    '4e': ['etats', 'micro', 'gaz', 'palier', 'formule', 'reaction', 'equation', 'transfo', 'feu'],
    '3e': ['particules', 'ecriture', 'ion', 'tests', 'ph']
  };

  // Une question d'un des thèmes donnés (pas deux fois de suite le même thème, ni le même énoncé)
  var lastCat = null, lastQ = null;
  function make(cats) {
    var pool = cats.length > 1 ? cats.filter(function (c) { return c !== lastCat; }) : cats, q;
    lastCat = pick(pool);
    for (var t = 0; t < 6; t++) { q = GEN[lastCat](); if (q.q + q.visual !== lastQ) break; }
    lastQ = q.q + q.visual;
    return q;
  }

  // ---------- Affichage d'une question ----------
  // onAnswer(ok) est appelé dès le choix ; la bonne réponse est alors mise en évidence.
  function render(host, item, onAnswer) {
    host.innerHTML = '<div class="qcm-card">' +
      '<p class="qcm-q">' + item.q + '</p>' +
      (item.visual ? '<div class="qcm-visual">' + item.visual + '</div>' : '') +
      '<div class="qcm-choices' + (item.choices.length === 2 ? ' qcm-choices--2' : '') + '">' + item.choices.map(function (c, i) {
        return '<button type="button" class="qcm-choice" data-i="' + i + '">' + c + '</button>';
      }).join('') + '</div>' +
      (item.pt ? '<div class="ex-actions"><button type="button" class="btn-secondary qcm-pt">Tableau périodique</button></div>' : '') +
      '<p class="qcm-explain" hidden></p></div>';
    var done = false;
    host.querySelector('.qcm-choices').addEventListener('click', function (e) {
      var b = e.target.closest('.qcm-choice');
      if (!b || done) return;
      done = true;
      var i = +b.getAttribute('data-i'), ok = i === item.answer, btns = host.querySelectorAll('.qcm-choice');
      btns.forEach(function (x) { x.disabled = true; });
      btns[item.answer].classList.add('qcm-choice--ok');
      if (!ok) {
        b.classList.add('qcm-choice--bad');
        if (item.explain) { var ex = host.querySelector('.qcm-explain'); ex.innerHTML = item.explain; ex.hidden = false; }
      }
      onAnswer(ok);
    });
    var ptb = host.querySelector('.qcm-pt');
    if (ptb) ptb.addEventListener('click', showTable);
  }

  function showTable() {
    window.Pop.open('<h2 class="eq-catalog-title">Tableau périodique</h2><div class="pt-scroll" id="qcm-pt"></div>' +
      '<button type="button" class="btn-primary" data-pop="close">Fermer</button>');
    window.PeriodicTable.renderView($('qcm-pt'), 18);
  }

  // ---------- Entraînement (écran « screen-qcm ») ----------
  var train = { cats: null, score: { ok: 0, total: 0 } };
  function trainNext() {
    $('btn-qcm-next').style.display = 'none';
    render($('qcm-host'), make(train.cats), function (ok) {
      train.score.total++;
      if (ok) {
        train.score.ok++;
        var b = $('qcm-host').querySelector('.qcm-choice--ok');
        if (window.Confetti && b) { try { var r = b.getBoundingClientRect(); window.Confetti.burst($('confetti-canvas'), r.left + r.width / 2, r.top); } catch (e) { /* décoratif */ } }
      }
      $('qcm-score').textContent = 'Score : ' + train.score.ok + ' / ' + train.score.total;
      $('btn-qcm-next').style.display = '';
    });
  }
  function startTraining(title, cats) {
    train = { cats: cats, score: { ok: 0, total: 0 } };
    $('qcm-title').textContent = title;
    $('qcm-score').textContent = 'Score : 0 / 0';
    trainNext();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('btn-qcm-next').addEventListener('click', trainNext);
  });

  return { CATS: CATS, make: make, render: render, startTraining: startTraining, microSVG: microSVG };
})();
