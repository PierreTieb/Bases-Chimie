window.Units = (function () {
  'use strict';

  // Les 20 premiers éléments du tableau périodique.
  // mass = nombre de nucléons (A) de l'isotope le plus courant, arrondi.
  var ELEMENTS = [
    { z: 1,  symbol: 'H',  name: 'Hydrogène',   mass: 1,  color: '#f2f2f0' },
    { z: 2,  symbol: 'He', name: 'Hélium',      mass: 4,  color: '#8fe3e0' },
    { z: 3,  symbol: 'Li', name: 'Lithium',     mass: 7,  color: '#b98af0' },
    { z: 4,  symbol: 'Be', name: 'Béryllium',   mass: 9,  color: '#7fbf7f' },
    { z: 5,  symbol: 'B',  name: 'Bore',        mass: 11, color: '#f0b98a' },
    { z: 6,  symbol: 'C',  name: 'Carbone',     mass: 12, color: '#2b2b2b' },
    { z: 7,  symbol: 'N',  name: 'Azote',       mass: 14, color: '#f2d94e' },
    { z: 8,  symbol: 'O',  name: 'Oxygène',     mass: 16, color: '#e0554f' },
    { z: 9,  symbol: 'F',  name: 'Fluor',       mass: 19, color: '#9fe6a0' },
    { z: 10, symbol: 'Ne', name: 'Néon',        mass: 20, color: '#7fd6f2' },
    { z: 11, symbol: 'Na', name: 'Sodium',      mass: 23, color: '#a58af0' },
    { z: 12, symbol: 'Mg', name: 'Magnésium',   mass: 24, color: '#5fa86a' },
    { z: 13, symbol: 'Al', name: 'Aluminium',   mass: 27, color: '#b8bfc4' },
    { z: 14, symbol: 'Si', name: 'Silicium',    mass: 28, color: '#d8c07a' },
    { z: 15, symbol: 'P',  name: 'Phosphore',   mass: 31, color: '#f0954a' },
    { z: 16, symbol: 'S',  name: 'Soufre',      mass: 32, color: '#e8c93a' },
    { z: 17, symbol: 'Cl', name: 'Chlore',      mass: 35, color: '#5bbf5b' },
    { z: 18, symbol: 'Ar', name: 'Argon',       mass: 40, color: '#6fd6e6' },
    { z: 19, symbol: 'K',  name: 'Potassium',   mass: 39, color: '#c98af0' },
    { z: 20, symbol: 'Ca', name: 'Calcium',     mass: 40, color: '#7a9e7a' }
  ];

  var MIN_Z = ELEMENTS[0].z;
  var MAX_Z = ELEMENTS[ELEMENTS.length - 1].z;
  var MIN_RADIUS = 15;
  var MAX_RADIUS = 32;

  // Valence simplifiée (nombre de liaisons "normales") pour guider l'accrochage automatique.
  var VALENCE = {
    H: 1, He: 0, Li: 1, Be: 2, B: 3, C: 4, N: 3, O: 2, F: 1, Ne: 0,
    Na: 1, Mg: 2, Al: 3, Si: 4, P: 3, S: 2, Cl: 1, Ar: 0, K: 1, Ca: 2
  };

  function getValence(symbol) {
    return VALENCE.hasOwnProperty(symbol) ? VALENCE[symbol] : 1;
  }

  function getAll() {
    return ELEMENTS.slice();
  }

  function getBySymbol(symbol) {
    for (var i = 0; i < ELEMENTS.length; i++) {
      if (ELEMENTS[i].symbol === symbol) return ELEMENTS[i];
    }
    return null;
  }

  function getByZ(z) {
    for (var i = 0; i < ELEMENTS.length; i++) {
      if (ELEMENTS[i].z === z) return ELEMENTS[i];
    }
    return null;
  }

  // Rayon croissant avec le numéro atomique (interpolation linéaire simple).
  function radiusFor(z) {
    var ratio = (z - MIN_Z) / (MAX_Z - MIN_Z);
    return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
  }

  return {
    getAll: getAll,
    getBySymbol: getBySymbol,
    getByZ: getByZ,
    radiusFor: radiusFor,
    getValence: getValence
  };
})();
