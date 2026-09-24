window.Molecules = (function () {
  'use strict';

  // Ordre d'écriture conventionnel des symboles dans la formule brute
  // (du plus "métallique" vers le plus "électronégatif").
  var PRIORITY = [
    'Na', 'K', 'Ca', 'Mg', 'Al', 'Li', 'Be', 'B', 'Si', 'C',
    'P', 'N', 'H', 'S', 'F', 'Cl', 'O', 'He', 'Ne', 'Ar'
  ];

  var SUBSCRIPTS = {
    '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083', '4': '\u2084',
    '5': '\u2085', '6': '\u2086', '7': '\u2087', '8': '\u2088', '9': '\u2089'
  };

  // Liste organisée d'une vingtaine de molécules courantes (V1).
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
    { counts: { N: 1, O: 2 }, name: "Dioxyde d'azote" }
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
    KNOWN_MAP[signature(entry.counts)] = entry.name;
  });

  function toSubscript(n) {
    return String(n).split('').map(function (d) {
      return SUBSCRIPTS.hasOwnProperty(d) ? SUBSCRIPTS[d] : d;
    }).join('');
  }

  // Construit la formule brute (ex: {H:2,O:1} -> "H2O" avec 2 en indice).
  function buildFormula(counts) {
    var symbols = Object.keys(counts).filter(function (s) { return counts[s] > 0; });
    symbols.sort(function (a, b) {
      var ia = PRIORITY.indexOf(a);
      var ib = PRIORITY.indexOf(b);
      if (ia === -1) ia = PRIORITY.length;
      if (ib === -1) ib = PRIORITY.length;
      return ia - ib;
    });
    return symbols.map(function (s) {
      var n = counts[s];
      return s + (n > 1 ? toSubscript(n) : '');
    }).join('');
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

    var sig = signature(counts);
    return KNOWN_MAP.hasOwnProperty(sig) ? KNOWN_MAP[sig] : undefined;
  }

  function getAllKnown() {
    return KNOWN.map(function (entry) {
      return { name: entry.name, formula: buildFormula(entry.counts) };
    });
  }

  return {
    buildFormula: buildFormula,
    lookupName: lookupName,
    getAllKnown: getAllKnown
  };
})();
