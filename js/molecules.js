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
    { counts: { H: 2, C: 1, O: 3 }, name: 'Acide carbonique', formula: 'H\u2082CO\u2083' },

    // --- Halogénures ---
    { counts: { Ca: 1, Cl: 2 }, name: 'Chlorure de calcium' },
    { counts: { Mg: 1, Cl: 2 }, name: 'Chlorure de magnésium' },
    { counts: { K: 1, Cl: 1 }, name: 'Chlorure de potassium' },
    { counts: { Li: 1, Cl: 1 }, name: 'Chlorure de lithium' },
    { counts: { Al: 1, Cl: 3 }, name: "Chlorure d'aluminium" },
    { counts: { Be: 1, Cl: 2 }, name: 'Chlorure de béryllium' },
    { counts: { Na: 1, F: 1 }, name: 'Fluorure de sodium' },
    { counts: { Li: 1, F: 1 }, name: 'Fluorure de lithium' },
    { counts: { Ca: 1, F: 2 }, name: 'Fluorure de calcium' },

    // --- Oxydes ---
    { counts: { Na: 2, O: 1 }, name: 'Oxyde de sodium' },
    { counts: { K: 2, O: 1 }, name: 'Oxyde de potassium' },
    { counts: { Li: 2, O: 1 }, name: 'Oxyde de lithium' },
    { counts: { Be: 1, O: 1 }, name: 'Oxyde de béryllium' },
    { counts: { B: 2, O: 3 }, name: 'Trioxyde de dibore' },
    { counts: { Si: 1, O: 2 }, name: 'Dioxyde de silicium' },
    { counts: { P: 2, O: 5 }, name: 'Pentaoxyde de diphosphore' },
    { counts: { Cl: 2, O: 1 }, name: 'Monoxyde de dichlore' },

    // --- Phosphore, azote, silicium, bore ---
    { counts: { P: 1, Cl: 3 }, name: 'Trichlorure de phosphore' },
    { counts: { P: 1, Cl: 5 }, name: 'Pentachlorure de phosphore' },
    { counts: { P: 1, H: 3 }, name: 'Phosphine' },
    { counts: { N: 2, H: 4 }, name: 'Hydrazine' },
    { counts: { N: 1, F: 3 }, name: "Trifluorure d'azote" },
    { counts: { N: 1, H: 4, Cl: 1 }, name: "Chlorure d'ammonium" },
    { counts: { Si: 1, H: 4 }, name: 'Silane' },
    { counts: { Si: 1, Cl: 4 }, name: 'Tétrachlorure de silicium' },
    { counts: { Si: 1, C: 1 }, name: 'Carbure de silicium' },
    { counts: { B: 1, F: 3 }, name: 'Trifluorure de bore' },
    { counts: { B: 1, Cl: 3 }, name: 'Trichlorure de bore' },

    // --- Sulfures, nitrures, hydrures, carbures ---
    { counts: { H: 2, S: 1 }, name: "Sulfure d'hydrogène" },
    { counts: { C: 1, S: 2 }, name: 'Disulfure de carbone' },
    { counts: { Na: 2, S: 1 }, name: 'Sulfure de sodium' },
    { counts: { Mg: 1, S: 1 }, name: 'Sulfure de magnésium' },
    { counts: { Ca: 1, S: 1 }, name: 'Sulfure de calcium' },
    { counts: { Al: 2, S: 3 }, name: "Sulfure d'aluminium" },
    { counts: { Mg: 3, N: 2 }, name: 'Nitrure de magnésium' },
    { counts: { Al: 1, N: 1 }, name: "Nitrure d'aluminium" },
    { counts: { Ca: 1, C: 2 }, name: 'Carbure de calcium' },
    { counts: { Li: 1, H: 1 }, name: 'Hydrure de lithium' },
    { counts: { Na: 1, H: 1 }, name: 'Hydrure de sodium' },
    { counts: { Ca: 1, H: 2 }, name: 'Hydrure de calcium' },

    // --- Chimie organique simple ---
    { counts: { C: 3, H: 8 }, name: 'Propane' },
    { counts: { C: 4, H: 10 }, name: 'Butane' },
    { counts: { C: 3, H: 6 }, name: 'Propène' },
    { counts: { C: 6, H: 6 }, name: 'Benzène' },
    { counts: { C: 2, H: 6, O: 1 }, name: 'Éthanol' },
    { counts: { C: 1, H: 2, O: 1 }, name: 'Méthanal (formaldéhyde)' },
    { counts: { C: 2, H: 4, O: 2 }, name: 'Acide éthanoïque (acide acétique)' },
    { counts: { C: 1, H: 3, Cl: 1 }, name: 'Chlorométhane' },
    { counts: { C: 1, H: 2, Cl: 2 }, name: 'Dichlorométhane' },
    { counts: { C: 1, H: 1, Cl: 3 }, name: 'Trichlorométhane (chloroforme)' },
    { counts: { C: 1, Cl: 4 }, name: 'Tétrachlorométhane' },
    { counts: { C: 1, F: 4 }, name: 'Tétrafluorométhane' },
    { counts: { H: 1, C: 1, N: 1 }, name: "Cyanure d'hydrogène", formula: 'HCN' },

    // --- Acides supplémentaires ---
    { counts: { H: 1, Cl: 1, O: 1 }, name: 'Acide hypochloreux' },
    { counts: { H: 1, Cl: 1, O: 4 }, name: 'Acide perchlorique' },
    { counts: { H: 2, S: 1, O: 3 }, name: 'Acide sulfureux' },
    { counts: { H: 1, N: 1, O: 2 }, name: 'Acide nitreux', formula: 'HNO\u2082' },

    // --- Bases et sels supplémentaires ---
    { counts: { Li: 1, O: 1, H: 1 }, name: 'Hydroxyde de lithium', formula: 'LiOH' },
    { counts: { Al: 1, O: 3, H: 3 }, name: "Hydroxyde d'aluminium", formula: 'Al(OH)\u2083' },
    { counts: { Na: 1, H: 1, C: 1, O: 3 }, name: 'Hydrogénocarbonate de sodium', formula: 'NaHCO\u2083' },
    { counts: { K: 1, N: 1, O: 3 }, name: 'Nitrate de potassium' },
    { counts: { Na: 1, N: 1, O: 3 }, name: 'Nitrate de sodium' },
    { counts: { Ca: 1, N: 2, O: 6 }, name: 'Nitrate de calcium', formula: 'Ca(NO\u2083)\u2082' },
    { counts: { K: 2, S: 1, O: 4 }, name: 'Sulfate de potassium' },
    { counts: { K: 2, C: 1, O: 3 }, name: 'Carbonate de potassium' },
    { counts: { Mg: 1, C: 1, O: 3 }, name: 'Carbonate de magnésium' },
    { counts: { Na: 3, P: 1, O: 4 }, name: 'Phosphate de sodium' },
    { counts: { Na: 1, Cl: 1, O: 1 }, name: 'Hypochlorite de sodium' },
    { counts: { K: 1, Cl: 1, O: 3 }, name: 'Chlorate de potassium' }
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
    var s = String(str).replace(/\s+/g, '').replace(/[\u2080-\u2089]/g, function (d) {
      return String(d.charCodeAt(0) - 0x2080);
    });
    if (!s) return null;

    var symbols = window.Units.getAll().map(function (e) { return e.symbol; });
    symbols.sort(function (a, b) { return b.length - a.length; });

    var pos = 0;

    function readNumber() {
      var start = pos;
      while (pos < s.length && s[pos] >= '0' && s[pos] <= '9') pos++;
      if (pos === start) return 1;
      return parseInt(s.slice(start, pos), 10);
    }

    // Lit une suite de symboles / groupes entre parenthèses jusqu'à ')' ou la fin.
    // Un même symbole ne peut apparaître qu'une fois (ex: "HHO" est invalide).
    function parseGroup() {
      var counts = {};
      while (pos < s.length && s[pos] !== ')') {
        var part = {};
        if (s[pos] === '(') {
          pos++;
          var inner = parseGroup();
          if (!inner || s[pos] !== ')') return null;
          pos++;
          var m = readNumber();
          if (!m || m <= 0) return null;
          Object.keys(inner).forEach(function (k) { part[k] = inner[k] * m; });
        } else {
          var matched = null;
          for (var k = 0; k < symbols.length; k++) {
            if (s.substr(pos, symbols[k].length) === symbols[k]) { matched = symbols[k]; break; }
          }
          if (!matched) return null;
          pos += matched.length;
          var n = readNumber();
          if (!n || n <= 0) return null;
          part[matched] = n;
        }
        var keys = Object.keys(part);
        for (var i = 0; i < keys.length; i++) {
          if (counts.hasOwnProperty(keys[i])) return null;
          counts[keys[i]] = part[keys[i]];
        }
      }
      return counts;
    }

    var result = parseGroup();
    if (!result || pos !== s.length) return null;
    return Object.keys(result).length ? result : null;
  }

  // Transforme en indices (H2O -> H₂O) les chiffres tapés dans un <input>, en gardant le curseur.
  // parseFormulaInput comprend déjà les indices Unicode : la validation ne change pas.
  function subscriptInput(inp) {
    var v = inp.value;
    var nv = v.replace(/[0-9]/g, function (d) { return SUBSCRIPTS[d]; });
    if (nv === v) return;
    var s = inp.selectionStart, e = inp.selectionEnd;
    inp.value = nv;                                   // même longueur : le curseur ne bouge pas
    try { inp.setSelectionRange(s, e); } catch (x) { /* ignoré */ }
  }

  return {
    buildFormula: buildFormula,
    lookupName: lookupName,
    getAllKnown: getAllKnown,
    getCenterHint: getCenterHint,
    parseFormulaInput: parseFormulaInput,
    formatSubscripts: formatSubscripts,
    subscriptInput: subscriptInput
  };
})();
