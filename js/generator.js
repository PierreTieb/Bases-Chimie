window.Generator = (function () {
  'use strict';

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Génère une question de quiz à partir d'un pool [{name, formula}, ...]
  function generateQuestion(pool, optionsCount) {
    optionsCount = optionsCount || 4;
    var correct = pickRandom(pool);
    var distractorPool = pool.filter(function (m) { return m.name !== correct.name; });
    var distractors = shuffle(distractorPool).slice(0, optionsCount - 1);
    var options = shuffle([correct].concat(distractors));

    return {
      formula: correct.formula,
      correctName: correct.name,
      options: options.map(function (o) { return o.name; })
    };
  }

  return {
    shuffle: shuffle,
    pickRandom: pickRandom,
    generateQuestion: generateQuestion
  };
})();
