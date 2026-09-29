window.Equations = (function () {
  'use strict';

  // Catalogue des substances (noms usuels + formule brute), pour le mode
  // Équations Chimiques. Volontairement séparé de la banque du Mode 1-1
  // (Molecules.js) : les noms y sont adaptés au langage courant des énoncés
  // ("la soude" plutôt que "hydroxyde de sodium"), pas aux noms officiels.
  var CATALOG = [
    { name: "Acide chlorhydrique", formula: 'HCl' },
    { name: "Soude (hydroxyde de sodium)", formula: 'NaOH' },
    { name: "Eau", formula: 'H2O' },
    { name: "Sel (chlorure de sodium)", formula: 'NaCl' },
    { name: "Carbone", formula: 'C' },
    { name: "Dioxygène", formula: 'O2' },
    { name: "Dioxyde de carbone", formula: 'CO2' },
    { name: "Méthane", formula: 'CH4' },
    { name: "Magnésium", formula: 'Mg' },
    { name: "Oxyde de magnésium", formula: 'MgO' },
    { name: "Sodium", formula: 'Na' },
    { name: "Dichlore", formula: 'Cl2' },
    { name: "Dihydrogène", formula: 'H2' },
    { name: "Calcaire (carbonate de calcium)", formula: 'CaCO3' },
    { name: "Chlorure de calcium", formula: 'CaCl2' },
    { name: "Diazote", formula: 'N2' },
    { name: "Ammoniac", formula: 'NH3' },
    { name: "Soufre", formula: 'S' },
    { name: "Dioxyde de soufre", formula: 'SO2' },
    { name: "Aluminium", formula: 'Al' },
    { name: "Oxyde d'aluminium (alumine)", formula: 'Al2O3' },
    { name: "Oxygène (atome)", formula: 'O' },
    { name: "Hydrogène (atome)", formula: 'H' },
    { name: "Azote (atome)", formula: 'N' },
    { name: "Chlore (atome)", formula: 'Cl' },
    { name: "Potassium", formula: 'K' },
    { name: "Calcium", formula: 'Ca' },
    { name: "Silicium", formula: 'Si' },
    { name: "Silice (dioxyde de silicium)", formula: 'SiO2' },
    { name: "Phosphore", formula: 'P' },
    { name: "Trichlorure de phosphore", formula: 'PCl3' },
    { name: "Acide sulfurique", formula: 'H2SO4' },
    { name: "Acide nitrique", formula: 'HNO3' },
    { name: "Acide phosphorique", formula: 'H3PO4' },
    { name: "Chaux éteinte (hydroxyde de calcium)", formula: 'Ca(OH)2' },
    { name: "Chaux vive (oxyde de calcium)", formula: 'CaO' },
    { name: "Sulfate de sodium", formula: 'Na2SO4' },
    { name: "Eau oxygénée (peroxyde d'hydrogène)", formula: 'H2O2' },
    { name: "Monoxyde de carbone", formula: 'CO' },
    { name: "Ozone", formula: 'O3' },
    { name: "Fluor (atome)", formula: 'F' },
    { name: "Fluorure d'hydrogène", formula: 'HF' },
    { name: "Néon", formula: 'Ne' },
    { name: "Hélium", formula: 'He' },
    { name: "Argon", formula: 'Ar' },
    { name: "Lithium", formula: 'Li' },
    { name: "Béryllium", formula: 'Be' },
    { name: "Bore", formula: 'B' },
    { name: "Alcool (éthanol)", formula: 'C2H6O' },
    { name: "Sulfate de magnésium", formula: 'MgSO4' },
    { name: "Sulfate de calcium (plâtre)", formula: 'CaSO4' }
  ];

  // Réactions (non-équilibrées, comme convenu). "template" utilise {0},{1}...
  // comme repères de position, remplacés par des segments cliquables dans le
  // texte de l'énoncé. "substances" liste, dans l'ordre, réactifs puis produits.
  var REACTIONS = [
    {
      template: "Si on mélange de {0} avec {1}, on obtient {2} et {3}.",
      substances: [
        { label: "l'acide chlorhydrique", type: 'reactif', formula: 'HCl' },
        { label: "de la soude", type: 'reactif', formula: 'NaOH' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' },
        { label: "du sel", type: 'produit', formula: 'NaCl' }
      ]
    },
    {
      template: "Lorsque {0} brûle dans {1}, il se forme {2}.",
      substances: [
        { label: "le carbone", type: 'reactif', formula: 'C' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' }
      ]
    },
    {
      template: "La combustion {0} dans {1} produit {2} et {3}.",
      substances: [
        { label: "du méthane", type: 'reactif', formula: 'CH4' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "Quand on chauffe {0} dans {1}, il se forme {2}.",
      substances: [
        { label: "du magnésium", type: 'reactif', formula: 'Mg' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "de l'oxyde de magnésium", type: 'produit', formula: 'MgO' }
      ]
    },
    {
      template: "{0} réagit avec {1} pour former {2}.",
      substances: [
        { label: "Le sodium", type: 'reactif', formula: 'Na' },
        { label: "le dichlore", type: 'reactif', formula: 'Cl2' },
        { label: "du chlorure de sodium", type: 'produit', formula: 'NaCl' }
      ]
    },
    {
      template: "La combustion {0} dans {1} produit {2}.",
      substances: [
        { label: "du dihydrogène", type: 'reactif', formula: 'H2' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "{0} réagit avec {1} pour donner {2}, {3} et {4}.",
      substances: [
        { label: "Le carbonate de calcium", type: 'reactif', formula: 'CaCO3' },
        { label: "l'acide chlorhydrique", type: 'reactif', formula: 'HCl' },
        { label: "du chlorure de calcium", type: 'produit', formula: 'CaCl2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' }
      ]
    },
    {
      template: "En combinant {0} et {1}, on obtient {2}.",
      substances: [
        { label: "du diazote", type: 'reactif', formula: 'N2' },
        { label: "du dihydrogène", type: 'reactif', formula: 'H2' },
        { label: "de l'ammoniac", type: 'produit', formula: 'NH3' }
      ]
    },
    {
      template: "{0} brûlé dans {1} donne {2}.",
      substances: [
        { label: "Le soufre", type: 'reactif', formula: 'S' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de soufre", type: 'produit', formula: 'SO2' }
      ]
    },
    {
      template: "{0} réagit avec {1} pour former {2}.",
      substances: [
        { label: "L'aluminium", type: 'reactif', formula: 'Al' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "de l'oxyde d'aluminium", type: 'produit', formula: 'Al2O3' }
      ]
    }
  ];

  // Banque du Niveau 2 (équilibrage) : [formule, coefficient attendu]. Coefficients <= 9.
  // "r" = réactifs, "p" = produits. Chaque équation est vérifiée équilibrée.
  var BALANCE = [
    { r: [['H2', 2], ['O2', 1]], p: [['H2O', 2]] },
    { r: [['C', 1], ['O2', 1]], p: [['CO2', 1]] },
    { r: [['CH4', 1], ['O2', 2]], p: [['CO2', 1], ['H2O', 2]] },
    { r: [['Mg', 2], ['O2', 1]], p: [['MgO', 2]] },
    { r: [['Na', 2], ['Cl2', 1]], p: [['NaCl', 2]] },
    { r: [['CaCO3', 1], ['HCl', 2]], p: [['CaCl2', 1], ['H2O', 1], ['CO2', 1]] },
    { r: [['N2', 1], ['H2', 3]], p: [['NH3', 2]] },
    { r: [['S', 1], ['O2', 1]], p: [['SO2', 1]] },
    { r: [['Al', 4], ['O2', 3]], p: [['Al2O3', 2]] },
    { r: [['C3H8', 1], ['O2', 5]], p: [['CO2', 3], ['H2O', 4]] },
    { r: [['C2H6O', 1], ['O2', 3]], p: [['CO2', 2], ['H2O', 3]] },
    { r: [['H2O2', 2]], p: [['H2O', 2], ['O2', 1]] },
    { r: [['Al', 2], ['HCl', 6]], p: [['AlCl3', 2], ['H2', 3]] },
    { r: [['Ca(OH)2', 1], ['HCl', 2]], p: [['CaCl2', 1], ['H2O', 2]] },
    { r: [['NaOH', 2], ['H2SO4', 1]], p: [['Na2SO4', 1], ['H2O', 2]] },
    { r: [['NH3', 4], ['O2', 5]], p: [['NO', 4], ['H2O', 6]] },
    { r: [['KClO3', 2]], p: [['KCl', 2], ['O2', 3]] },
    { r: [['C2H6', 2], ['O2', 7]], p: [['CO2', 4], ['H2O', 6]] },
    { r: [['CO', 2], ['O2', 1]], p: [['CO2', 2]] },
    { r: [['H2', 1], ['Cl2', 1]], p: [['HCl', 2]] },
    { r: [['Li', 4], ['O2', 1]], p: [['Li2O', 2]] },
    { r: [['Na', 2], ['H2O', 2]], p: [['NaOH', 2], ['H2', 1]] },
    { r: [['Mg', 1], ['HCl', 2]], p: [['MgCl2', 1], ['H2', 1]] },
    { r: [['N2', 1], ['O2', 1]], p: [['NO', 2]] },
    { r: [['P', 4], ['O2', 5]], p: [['P2O5', 2]] },
    { r: [['SO2', 2], ['O2', 1]], p: [['SO3', 2]] },
    { r: [['Ca', 2], ['O2', 1]], p: [['CaO', 2]] }
  ];
  var lastBalance = -1;

  function countsSig(c) {
    return Object.keys(c).filter(function (k) { return c[k] > 0; }).sort()
      .map(function (k) { return k + ':' + c[k]; }).join(',');
  }

  // Catalogue = liste d'usage ci-dessus + toutes les molécules connues du
  // bac à sable (Molecules) qui n'y figurent pas encore : les deux bases
  // restent ainsi toujours cohérentes.
  function getCatalog() {
    var list = CATALOG.slice();
    if (window.Molecules && window.Molecules.getAllKnown) {
      var seen = {};
      CATALOG.forEach(function (c) {
        var p = window.Molecules.parseFormulaInput(c.formula);
        if (p) seen[countsSig(p)] = true;
      });
      window.Molecules.getAllKnown().forEach(function (m) {
        var sig = countsSig(m.counts);
        if (seen[sig]) return;
        seen[sig] = true;
        list.push({
          name: m.name,
          formula: m.formula.replace(/[\u2080-\u2089]/g, function (d) { return String(d.charCodeAt(0) - 0x2080); })
        });
      });
    }
    return list;
  }
  function getReactions() { return REACTIONS.slice(); }
  function getRandomReaction() { return window.Generator.pickRandom(REACTIONS); }

  // Équation d'équilibrage aléatoire (jamais deux fois de suite la même).
  function getRandomBalance() {
    var i;
    do { i = Math.floor(Math.random() * BALANCE.length); } while (BALANCE.length > 1 && i === lastBalance);
    lastBalance = i;
    var b = BALANCE[i];
    var subs = [];
    b.r.forEach(function (x) { subs.push({ formula: x[0], coef: x[1], type: 'reactif' }); });
    b.p.forEach(function (x) { subs.push({ formula: x[0], coef: x[1], type: 'produit' }); });
    return { substances: subs };
  }
  function getBalanceBank() { return BALANCE.slice(); }

  return {
    getCatalog: getCatalog,
    getReactions: getReactions,
    getRandomReaction: getRandomReaction,
    getRandomBalance: getRandomBalance,
    getBalanceBank: getBalanceBank
  };
})();
