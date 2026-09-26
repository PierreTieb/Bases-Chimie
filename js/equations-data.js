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

  function getCatalog() { return CATALOG.slice(); }
  function getReactions() { return REACTIONS.slice(); }
  function getRandomReaction() { return window.Generator.pickRandom(REACTIONS); }

  return {
    getCatalog: getCatalog,
    getReactions: getReactions,
    getRandomReaction: getRandomReaction
  };
})();
