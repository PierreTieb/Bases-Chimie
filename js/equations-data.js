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
    { name: "Sulfate de calcium (plâtre)", formula: 'CaSO4' },
    { name: "Glucose", formula: 'C6H12O6' }
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
,
    {
      template: "Un morceau de {0} jeté dans {1} produit {2} et {3}.",
      substances: [
        { label: "sodium", type: 'reactif', formula: 'Na' },
        { label: "l'eau", type: 'reactif', formula: 'H2O' },
        { label: "de la soude", type: 'produit', formula: 'NaOH' },
        { label: "du dihydrogène", type: 'produit', formula: 'H2' }
      ]
    },
    {
      template: "Dans un briquet, {0} brûle avec {1} pour former {2} et {3}.",
      substances: [
        { label: "le butane", type: 'reactif', formula: 'C4H10' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "Au barbecue, la combustion {0} avec {1} produit {2} et {3}.",
      substances: [
        { label: "du propane", type: 'reactif', formula: 'C3H8' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "Pendant la photosynthèse, les plantes transforment {0} et {1} en {2} et en {3}.",
      substances: [
        { label: "le dioxyde de carbone", type: 'reactif', formula: 'CO2' },
        { label: "l'eau", type: 'reactif', formula: 'H2O' },
        { label: "glucose", type: 'produit', formula: 'C6H12O6' },
        { label: "dioxygène", type: 'produit', formula: 'O2' }
      ]
    },
    {
      template: "Lors de la respiration, {0} réagit avec {1} et libère {2} et {3}.",
      substances: [
        { label: "le glucose", type: 'reactif', formula: 'C6H12O6' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "Pendant la fermentation, {0} se transforme en {1} et en {2}.",
      substances: [
        { label: "le glucose", type: 'reactif', formula: 'C6H12O6' },
        { label: "éthanol", type: 'produit', formula: 'C2H6O' },
        { label: "dioxyde de carbone", type: 'produit', formula: 'CO2' }
      ]
    },
    {
      template: "{0} se décompose en {1} et en {2}.",
      substances: [
        { label: "L'eau oxygénée", type: 'reactif', formula: 'H2O2' },
        { label: "eau", type: 'produit', formula: 'H2O' },
        { label: "dioxygène", type: 'produit', formula: 'O2' }
      ]
    },
    {
      template: "Par électrolyse, {0} se sépare en {1} et en {2}.",
      substances: [
        { label: "l'eau", type: 'reactif', formula: 'H2O' },
        { label: "dihydrogène", type: 'produit', formula: 'H2' },
        { label: "dioxygène", type: 'produit', formula: 'O2' }
      ]
    },
    {
      template: "Quand on chauffe fortement {0}, on obtient {1} et {2}.",
      substances: [
        { label: "le calcaire", type: 'reactif', formula: 'CaCO3' },
        { label: "de la chaux vive", type: 'produit', formula: 'CaO' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' }
      ]
    },
    {
      template: "Si on verse {0} sur {1}, on obtient {2}.",
      substances: [
        { label: "de l'eau", type: 'reactif', formula: 'H2O' },
        { label: "de la chaux vive", type: 'reactif', formula: 'CaO' },
        { label: "de la chaux éteinte", type: 'produit', formula: 'Ca(OH)2' }
      ]
    },
    {
      template: "{0} plongé dans {1} libère {2} et forme {3}.",
      substances: [
        { label: "Le magnésium", type: 'reactif', formula: 'Mg' },
        { label: "l'acide chlorhydrique", type: 'reactif', formula: 'HCl' },
        { label: "du dihydrogène", type: 'produit', formula: 'H2' },
        { label: "du chlorure de magnésium", type: 'produit', formula: 'MgCl2' }
      ]
    },
    {
      template: "{0} attaqué par {1} donne {2} et {3}.",
      substances: [
        { label: "L'aluminium", type: 'reactif', formula: 'Al' },
        { label: "l'acide chlorhydrique", type: 'reactif', formula: 'HCl' },
        { label: "du chlorure d'aluminium", type: 'produit', formula: 'AlCl3' },
        { label: "du dihydrogène", type: 'produit', formula: 'H2' }
      ]
    },
    {
      template: "On fait réagir {0} avec {1} : on obtient {2}.",
      substances: [
        { label: "le dihydrogène", type: 'reactif', formula: 'H2' },
        { label: "le dichlore", type: 'reactif', formula: 'Cl2' },
        { label: "du chlorure d'hydrogène", type: 'produit', formula: 'HCl' }
      ]
    },
    {
      template: "{0} brûle dans {1} en donnant {2} et {3}.",
      substances: [
        { label: "L'ammoniac", type: 'reactif', formula: 'NH3' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du monoxyde d'azote", type: 'produit', formula: 'NO' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "{0} brûle dans {1} et forme {2}.",
      substances: [
        { label: "Le monoxyde de carbone", type: 'reactif', formula: 'CO' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' }
      ]
    },
    {
      template: "{0} s'oxyde au contact {1} et devient {2}.",
      substances: [
        { label: "Le dioxyde de soufre", type: 'reactif', formula: 'SO2' },
        { label: "du dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du trioxyde de soufre", type: 'produit', formula: 'SO3' }
      ]
    },
    {
      template: "{0} chauffé dans {1} produit {2}.",
      substances: [
        { label: "Le phosphore", type: 'reactif', formula: 'P' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du pentaoxyde de diphosphore", type: 'produit', formula: 'P2O5' }
      ]
    },
    {
      template: "{0} brûle à l'air : il se combine avec {1} pour former {2}.",
      substances: [
        { label: "Le lithium", type: 'reactif', formula: 'Li' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "de l'oxyde de lithium", type: 'produit', formula: 'Li2O' }
      ]
    },
    {
      template: "Sous l'effet de la chaleur, {0} et {1} se combinent pour donner {2}.",
      substances: [
        { label: "le calcium", type: 'reactif', formula: 'Ca' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "de l'oxyde de calcium", type: 'produit', formula: 'CaO' }
      ]
    },
    {
      template: "On mélange {0} et {1} : il se forme {2} et {3}.",
      substances: [
        { label: "de la soude", type: 'reactif', formula: 'NaOH' },
        { label: "de l'acide sulfurique", type: 'reactif', formula: 'H2SO4' },
        { label: "du sulfate de sodium", type: 'produit', formula: 'Na2SO4' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "Verser {0} dans {1} donne {2} et {3}.",
      substances: [
        { label: "de la chaux éteinte", type: 'reactif', formula: 'Ca(OH)2' },
        { label: "de l'acide chlorhydrique", type: 'reactif', formula: 'HCl' },
        { label: "du chlorure de calcium", type: 'produit', formula: 'CaCl2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "En chauffant {0}, on obtient {1} et {2}.",
      substances: [
        { label: "du chlorate de potassium", type: 'reactif', formula: 'KClO3' },
        { label: "du chlorure de potassium", type: 'produit', formula: 'KCl' },
        { label: "du dioxygène", type: 'produit', formula: 'O2' }
      ]
    },
    {
      template: "La combustion de {0} avec {1} libère {2} et {3}.",
      substances: [
        { label: "l'éthanol", type: 'reactif', formula: 'C2H6O' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "Quand {0} s'enflamme dans {1}, il se forme {2} et {3}.",
      substances: [
        { label: "l'éthane", type: 'reactif', formula: 'C2H6' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "Lors d'un orage, l'éclair fait réagir {0} et {1} de l'air pour former {2}.",
      substances: [
        { label: "le diazote", type: 'reactif', formula: 'N2' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du monoxyde d'azote", type: 'produit', formula: 'NO' }
      ]
    },
    {
      template: "À haute température, {0} et {1} donnent {2}.",
      substances: [
        { label: "le silicium", type: 'reactif', formula: 'Si' },
        { label: "le dioxygène", type: 'reactif', formula: 'O2' },
        { label: "du dioxyde de silicium", type: 'produit', formula: 'SiO2' }
      ]
    },
    {
      template: "Quand le gaz {0} rencontre le gaz {1}, il apparaît une fumée blanche de {2}.",
      substances: [
        { label: "ammoniac", type: 'reactif', formula: 'NH3' },
        { label: "chlorure d'hydrogène", type: 'reactif', formula: 'HCl' },
        { label: "chlorure d'ammonium", type: 'produit', formula: 'NH4Cl' }
      ]
    },
    {
      template: "Contre les aigreurs, {0} réagit avec {1} de l'estomac pour donner {2}, {3} et {4}.",
      substances: [
        { label: "le bicarbonate de sodium", type: 'reactif', formula: 'NaHCO3' },
        { label: "l'acide chlorhydrique", type: 'reactif', formula: 'HCl' },
        { label: "du chlorure de sodium", type: 'produit', formula: 'NaCl' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' }
      ]
    },
    {
      template: "Dans un antiacide, {0} réagit avec {1} et forme {2} et {3}.",
      substances: [
        { label: "l'hydroxyde de magnésium", type: 'reactif', formula: 'Mg(OH)2' },
        { label: "l'acide chlorhydrique", type: 'reactif', formula: 'HCl' },
        { label: "du chlorure de magnésium", type: 'produit', formula: 'MgCl2' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' }
      ]
    },
    {
      template: "Dans l'atmosphère, {0} se dissout dans {1} et forme {2}.",
      substances: [
        { label: "le dioxyde de carbone", type: 'reactif', formula: 'CO2' },
        { label: "l'eau", type: 'reactif', formula: 'H2O' },
        { label: "de l'acide carbonique", type: 'produit', formula: 'H2CO3' }
      ]
    },
    {
      template: "Pluies acides : {0} réagit avec {1} pour former {2}.",
      substances: [
        { label: "le trioxyde de soufre", type: 'reactif', formula: 'SO3' },
        { label: "l'eau", type: 'reactif', formula: 'H2O' },
        { label: "de l'acide sulfurique", type: 'produit', formula: 'H2SO4' }
      ]
    },
    {
      template: "{0} et {1} réagissent : on obtient {2}, {3} et {4}.",
      substances: [
        { label: "Le carbonate de sodium", type: 'reactif', formula: 'Na2CO3' },
        { label: "l'acide chlorhydrique", type: 'reactif', formula: 'HCl' },
        { label: "du chlorure de sodium", type: 'produit', formula: 'NaCl' },
        { label: "de l'eau", type: 'produit', formula: 'H2O' },
        { label: "du dioxyde de carbone", type: 'produit', formula: 'CO2' }
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
  function getRandomReaction(channel, exclude) {
    return drawExcluding(REACTIONS, 'reaction:' + (channel || ''), function (x) { return sigOf(x.substances); }, exclude);
  }

  // Tirage sans doublon : chaque "canal" (mode) parcourt toute la banque mélangée avant de
  // recommencer, et la première carte d'un nouveau tour n'est jamais la dernière du précédent.
  var bags = {};
  function draw(list, key) {
    var b = bags[key] || (bags[key] = { queue: [], last: null });
    if (!b.queue.length) {
      b.queue = window.Generator.shuffle(list);
      var n = b.queue.length;
      if (n > 1 && b.queue[n - 1] === b.last) {
        var t = b.queue[0]; b.queue[0] = b.queue[n - 1]; b.queue[n - 1] = t;
      }
    }
    b.last = b.queue.pop();
    return b.last;
  }

  // Signature d'une équation (formules normalisées, réactifs et produits triés) : sert à
  // vérifier que deux questions ne portent jamais sur la même transformation.
  function normFormula(f) {
    var p = window.Molecules.parseFormulaInput(f);
    return p ? countsSig(p) : f;
  }
  function sigOf(subs) {
    var side = function (t) {
      return subs.filter(function (s) { return s.type === t; })
        .map(function (s) { return normFormula(s.formula); }).sort().join('+');
    };
    return side('reactif') + '>' + side('produit');
  }
  function drawExcluding(list, key, sigFn, exclude) {
    exclude = exclude || [];
    var x;
    for (var t = 0; t <= list.length; t++) {
      x = draw(list, key);
      if (exclude.indexOf(sigFn(x)) < 0) return x;
    }
    return x;
  }

  // --- Équilibrage automatique (plus petits coefficients entiers) ---
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function frac(n, d) { if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return [n / g, d / g]; }
  function fmul(a, b) { return frac(a[0] * b[0], a[1] * b[1]); }
  function fdiv(a, b) { return frac(a[0] * b[1], a[1] * b[0]); }
  function fsub(a, b) { return frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]); }

  // Renvoie les coefficients (dans l'ordre des substances) ou null si l'équation n'a pas
  // une solution unique en entiers de 1 à 9.
  function solveCoefs(subs) {
    var cs = subs.map(function (s) { return window.Molecules.parseFormulaInput(s.formula); });
    if (cs.some(function (c) { return !c; })) return null;
    var els = [];
    cs.forEach(function (c) { Object.keys(c).forEach(function (k) { if (els.indexOf(k) < 0) els.push(k); }); });
    var n = subs.length;
    var M = els.map(function (el) {
      return subs.map(function (s, j) { return frac((s.type === 'reactif' ? 1 : -1) * (cs[j][el] || 0), 1); });
    });
    var piv = [], r = 0;
    for (var c = 0; c < n && r < M.length; c++) {
      var p = -1, i;
      for (i = r; i < M.length; i++) if (M[i][c][0] !== 0) { p = i; break; }
      if (p < 0) continue;
      var tmp = M[r]; M[r] = M[p]; M[p] = tmp;
      var pv = M[r][c];
      M[r] = M[r].map(function (x) { return fdiv(x, pv); });
      for (i = 0; i < M.length; i++) {
        if (i !== r && M[i][c][0] !== 0) {
          var f = M[i][c], row = M[r];
          M[i] = M[i].map(function (x, k) { return fsub(x, fmul(f, row[k])); });
        }
      }
      piv.push(c); r++;
    }
    if (n - piv.length !== 1) return null;
    var free = -1;
    for (var k = 0; k < n; k++) if (piv.indexOf(k) < 0) free = k;
    var x = [];
    for (var j = 0; j < n; j++) x.push(frac(0, 1));
    x[free] = frac(1, 1);
    piv.forEach(function (pc, ri) { x[pc] = fmul(frac(-1, 1), M[ri][free]); });
    var L = 1;
    x.forEach(function (v) { L = L * v[1] / gcd(L, v[1]); });
    var ints = x.map(function (v) { return v[0] * (L / v[1]); });
    var g = ints.reduce(gcd, 0);
    ints = ints.map(function (v) { return v / g; });
    if (ints.every(function (v) { return v < 0; })) ints = ints.map(function (v) { return -v; });
    if (ints.some(function (v) { return v < 1 || v > 9; })) return null;
    return ints;
  }

  // Phrases de REACTIONS avec coefficients calculés, limitées à celles qu'on sait représenter
  // (toutes les substances connues du bac à sable) et qui tiennent sur une ligne (<= 4 substances).
  var solvedCache = null;
  function getSolved() {
    if (solvedCache) return solvedCache;
    solvedCache = [];
    REACTIONS.forEach(function (rx) {
      if (rx.substances.length > 4) return;
      var co = solveCoefs(rx.substances);
      if (!co) return;
      var known = rx.substances.every(function (s) {
        var nm = window.Molecules.lookupName(window.Molecules.parseFormulaInput(s.formula));
        return nm !== undefined && nm !== null;
      });
      if (!known) return;
      solvedCache.push({
        template: rx.template,
        substances: rx.substances.map(function (s, i) {
          return { label: s.label, type: s.type, formula: s.formula, coef: co[i] };
        })
      });
    });
    return solvedCache;
  }
  function getRandomSolvedReaction(channel, exclude) {
    return drawExcluding(getSolved(), 'solved:' + (channel || ''), function (x) { return sigOf(x.substances); }, exclude);
  }

  // Équation d'équilibrage aléatoire.
  function getRandomBalance(channel, exclude) {
    var toSubs = function (b) {
      var subs = [];
      b.r.forEach(function (x) { subs.push({ formula: x[0], coef: x[1], type: 'reactif' }); });
      b.p.forEach(function (x) { subs.push({ formula: x[0], coef: x[1], type: 'produit' }); });
      return subs;
    };
    var b = drawExcluding(BALANCE, 'balance:' + (channel || ''), function (x) { return sigOf(toSubs(x)); }, exclude);
    return { substances: toSubs(b) };
  }
  function getBalanceBank() { return BALANCE.slice(); }

  return {
    getCatalog: getCatalog,
    getReactions: getReactions,
    getRandomReaction: getRandomReaction,
    getRandomBalance: getRandomBalance,
    getRandomSolvedReaction: getRandomSolvedReaction,
    getSolved: getSolved,
    sigOf: sigOf,
    solveCoefs: solveCoefs,
    getBalanceBank: getBalanceBank
  };
})();
