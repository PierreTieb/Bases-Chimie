window.Molecules = (function () {
  'use strict';

  // Ordre d'écriture "par défaut" des symboles dans la formule brute
  // (du plus "métallique" vers le plus "électronégatif"). Sert de repli
  // générique pour toute combinaison d'atomes, connue ou non.
  var PRIORITY = [
    'Na', 'K', 'Ca', 'Mg', 'Al', 'Li', 'Be', 'B', 'Si', 'C',
    'P', 'N', 'H', 'S', 'F', 'Cl', 'O', 'He', 'Ne', 'Ar'
  ];

  var SUBSCRIPTS = {
    '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083', '4': '\u2084',
    '5': '\u2085', '6': '\u2086', '7': '\u2087', '8': '\u2088', '9': '\u2089'
  };

  // Banque de molécules connues (V2, élargie).
  // "formula" est optionnel : s'il est fourni, c'est l'écriture d'usage qui est
  // affichée telle quelle (utile pour les composés dont l'ordre "usuel" ne suit
  // pas la règle générique ci-dessus, ex: NaOH, HNO3...). Sans "formula", la
  // formule est déduite automatiquement des comptages via l'ordre générique.
  var KNOWN = [
    { counts: { H: 2 }, name: 'Dihydrogène' },
    { counts: { O: 2 }, name: 'Dioxygène' },
    { counts: { O: 3 }, name: 'Ozone' },
    { counts: { N: 2 }, name: 'Diazote' },
    { counts: { Cl: 2 }, name: 'Dichlore' },
    { counts: { F: 2 }, name: 'Difluor' },
    { counts: { H: 2, O: 1 }, name: 'Eau' },
    { counts: { H: 2, O: 2 }, name: "Peroxyde d'hydrogène" },
    { counts: { C: 1, O: 2 }, name: 'Dioxyde de carbone' },
    { counts: { C: 1, O: 1 }, name: 'Monoxyde de carbone' },
    { counts: { N: 1, H: 3 }, name: 'Ammoniac' },
    { counts: { C: 1, H: 4 }, name: 'Méthane' },
    { counts: { C: 2, H: 6 }, name: 'Éthane' },
    { counts: { C: 2, H: 4 }, name: 'Éthène (éthylène)' },
    { counts: { C: 2, H: 2 }, name: 'Éthyne (acétylène)' },
    { counts: { C: 1, H: 4, O: 1 }, name: 'Méthanol' },
    { counts: { H: 1, Cl: 1 }, name: "Chlorure d'hydrogène" },
    { counts: { H: 1, F: 1 }, name: "Fluorure d'hydrogène" },
    { counts: { Na: 1, Cl: 1 }, name: 'Chlorure de sodium' },
    { counts: { Mg: 1, O: 1 }, name: 'Oxyde de magnésium' },
    { counts: { Ca: 1, O: 1 }, name: 'Oxyde de calcium' },
    { counts: { Al: 2, O: 3 }, name: "Oxyde d'aluminium" },
    { counts: { S: 1, O: 2 }, name: 'Dioxyde de soufre' },
    { counts: { S: 1, O: 3 }, name: 'Trioxyde de soufre' },
    { counts: { N: 2, O: 1 }, name: "Protoxyde d'azote" },
    { counts: { N: 1, O: 1 }, name: "Monoxyde d'azote" },
    { counts: { N: 1, O: 2 }, name: "Dioxyde d'azote" },

    // --- Hydroxydes (l'ordre usuel place O avant H : override nécessaire) ---
    { counts: { Na: 1, O: 1, H: 1 }, name: 'Hydroxyde de sodium', formula: 'NaOH' },
    { counts: { K: 1, O: 1, H: 1 }, name: 'Hydroxyde de potassium', formula: 'KOH' },
    { counts: { Ca: 1, O: 2, H: 2 }, name: 'Hydroxyde de calcium', formula: 'Ca(OH)\u2082' },
    { counts: { Mg: 1, O: 2, H: 2 }, name: 'Hydroxyde de magnésium', formula: 'Mg(OH)\u2082' },

    // --- Carbonates (l'ordre générique convient déjà) ---
    { counts: { Ca: 1, C: 1, O: 3 }, name: 'Carbonate de calcium' },
    { counts: { Na: 2, C: 1, O: 3 }, name: 'Carbonate de sodium' },

    // --- Sulfates (l'ordre générique convient déjà) ---
    { counts: { Na: 2, S: 1, O: 4 }, name: 'Sulfate de sodium' },
    { counts: { Ca: 1, S: 1, O: 4 }, name: 'Sulfate de calcium', center: 'S' },
    { counts: { Mg: 1, S: 1, O: 4 }, name: 'Sulfate de magnésium' },

    // --- Acides usuels (certains nécessitent un override) ---
    { counts: { H: 1, N: 1, O: 3 }, name: 'Acide nitrique', formula: 'HNO\u2083' },
    { counts: { H: 2, S: 1, O: 4 }, name: 'Acide sulfurique' },
    { counts: { H: 3, P: 1, O: 4 }, name: 'Acide phosphorique', formula: 'H\u2083PO\u2084' },
    { counts: { H: 2, C: 1, O: 3 }, name: 'Acide carbonique', formula: 'H\u2082CO\u2083' }
  ];

  function signature(counts) {
    return Object.keys(counts)
      .filter(function (s) { return counts[s] > 0; })
      .sort()
      .map(function (s) { return s + ':' + counts[s]; })
      .join(',');
  }

  var KNOWN_MAP = {};
  KNOWN.forEach(function (entry) {
    KNOWN_MAP[signature(entry.counts)] = entry;
  });

  function formatSubscripts(str) {
    return String(str).replace(/\d+/g, function (m) {
      return m.split('').map(function (d) {
        return SUBSCRIPTS.hasOwnProperty(d) ? SUBSCRIPTS[d] : d;
      }).join('');
    });
  }

  // Construit la formule brute générique (ex: {H:2,O:1} -> "H₂O").
  function buildFormula(counts) {
    var symbols = Object.keys(counts).filter(function (s) { return counts[s] > 0; });
    symbols.sort(function (a, b) {
      var ia = PRIORITY.indexOf(a);
      var ib = PRIORITY.indexOf(b);
      if (ia === -1) ia = PRIORITY.length;
      if (ib === -1) ib = PRIORITY.length;
      return ia - ib;
    });
    var plain = symbols.map(function (s) {
      var n = counts[s];
      return s + (n > 1 ? String(n) : '');
    }).join('');
    return formatSubscripts(plain);
  }

  // Retourne : null si rien n'est posé, une chaîne si un nom est trouvé
  // (atome seul ou molécule connue), undefined si la combinaison est inconnue.
  function lookupName(counts) {
    var symbols = Object.keys(counts).filter(function (s) { return counts[s] > 0; });
    if (symbols.length === 0) return null;

    if (symbols.length === 1 && counts[symbols[0]] === 1) {
      var el = window.Units.getBySymbol(symbols[0]);
      return el ? el.name : undefined;
    }

    var entry = KNOWN_MAP[signature(counts)];
    return entry ? entry.name : undefined;
  }

  // Liste complète des molécules connues, avec comptage et formule d'affichage
  // (formule d'usage si définie, sinon déduite génériquement).
  function getAllKnown() {
    return KNOWN.map(function (entry) {
      return {
        name: entry.name,
        counts: Object.assign({}, entry.counts),
        formula: entry.formula || buildFormula(entry.counts)
      };
    });
  }

  // Indice de centre explicite pour les rares cas où valence + masse ne
  // suffisent pas (ex: CaSO4, où le calcium est plus massique que le soufre
  // mais où c'est bien le soufre qui doit être au centre). Usage interne
  // uniquement (calcul de placement) : jamais montré à l'utilisateur.
  function getCenterHint(counts) {
    var entry = KNOWN_MAP[signature(counts)];
    return (entry && entry.center) ? entry.center : null;
  }

  // Analyse une saisie utilisateur ("H2O", "Na2CO3"...) en comptage d'atomes.
  // La casse compte : seuls les symboles exacts (parmi les 20 premiers éléments)
  // sont reconnus. Les espaces sont ignorés. Un même symbole ne peut apparaître
  // qu'une seule fois (ex: "HHO" est invalide) — mais deux symboles distincts
  // qui partagent des lettres (ex: "C" et "Ca") restent bien indépendants.
  // Retourne null si invalide.
  function parseFormulaInput(str) {
    var s = String(str).replace(/\s+/g, '');
    if (!s) return null;

    var symbols = window.Units.getAll().map(function (e) { return e.symbol; });
    symbols.sort(function (a, b) { return b.length - a.length; });

    var i = 0;
    var counts = {};
    while (i < s.length) {
      var matched = null;
      for (var k = 0; k < symbols.length; k++) {
        var sym = symbols[k];
        if (s.substr(i, sym.length) === sym) { matched = sym; break; }
      }
      if (!matched) return null;
      if (counts.hasOwnProperty(matched)) return null; // symbole déjà utilisé plus tôt
      i += matched.length;

      var numStart = i;
      while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
      var numStr = s.slice(numStart, i);
      var n = numStr.length ? parseInt(numStr, 10) : 1;
      if (!n || n <= 0) return null;

      counts[matched] = n;
    }
    return Object.keys(counts).length ? counts : null;
  }

  return {
    buildFormula: buildFormula,
    lookupName: lookupName,
    getAllKnown: getAllKnown,
    getCenterHint: getCenterHint,
    parseFormulaInput: parseFormulaInput,
    formatSubscripts: formatSubscripts
  };
})();
