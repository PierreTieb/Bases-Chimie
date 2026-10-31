// challenge.js
// Mode Challenge : 2 minutes pour marquer un maximum de points.
// Avant de commencer, on choisit ses questions : de 4e (matière, molécules, transformations),
// de 3e (atomes, ions, pH) ou « La totale ! ». Barème : 1 point par question à choix, 3 points pour
// construire ou identifier un atome, un ion ou une molécule, 5 points pour une question de labo.
// Chaque validation fausse retire 1 point à la question en cours ; passer une question coûte 5 secondes.
// Les questions s'affichent sur les écrans des modules existants, sous un bandeau fixe (chrono, score).
// Mode Duel : un code de 4 caractères (qui contient aussi le choix des questions) fixe le tirage au sort ;
// deux élèves qui tapent le même code ont exactement les mêmes questions. Pas de serveur : l'appli
// n'annonce pas de vainqueur, les élèves comparent leurs scores. Un duel ne compte pas dans les meilleurs scores.
window.Challenge = (function () {
  'use strict';

  var DURATION = 120000, PASS_COST = 5000, KEY = 'chimie-challenge-best', KEY_LVL = 'chimie-challenge-level';
  // Seuils provisoires des médailles : à ajuster après un essai en classe
  var MEDALS = [
    { min: 30, id: 'platine', name: 'de platine' },
    { min: 24, id: 'or', name: 'd\'or' },
    { min: 17, id: 'argent', name: 'd\'argent' },
    { min: 10, id: 'bronze', name: 'de bronze' }
  ];
  var LEVELS = [
    { id: '4e', name: 'Questions de 4e', desc: 'États de la matière, molécules, transformations et équations chimiques' },
    { id: '3e', name: 'Questions de 3e', desc: 'Atomes, ions, tests d\'identification et pH' },
    { id: 'all', name: 'La totale !', desc: 'Toutes les questions mélangées' }
  ];
  // Part des questions à 1, 3 et 5 points dans le tirage
  var TIER_WEIGHT = { 1: .5, 3: .3, 5: .2 };

  var $ = function (id) { return document.getElementById(id); };
  function quiz(spec, h) {
    var Q = window.Ions.expert, P = window.Ions.pools;
    Q.hooks.onSolved = h.onSolved; Q.hooks.onFail = h.onFail; Q.hooks.onNext = h.onNext;
    Q.startExpert({ type: spec.type, ions: spec.ions, pool: spec.ions ? P.ions : P.atoms, shake: false });
  }
  function phLab(kind, h) {
    var X = window.PhLab.challenge;
    X.hooks.onSolved = h.onSolved; X.hooks.onFail = h.onFail;
    X.start(kind);
  }
  var KINDS = [
    { id: 'qcm4', lvl: '4e', pts: 1, label: 'Question à choix', screen: 'screen-ch-qcm', qcm: '4e' },
    { id: 'qcm3', lvl: '3e', pts: 1, label: 'Question à choix', screen: 'screen-ch-qcm', qcm: '3e' },
    { id: 'molId', lvl: '4e', pts: 3, label: 'Identifier une molécule', screen: 'screen-exercise1-2', run: function (h) { window.Exercise.startChallenge('identify', h); } },
    { id: 'molBuild', lvl: '4e', pts: 3, label: 'Construire une molécule', screen: 'screen-exercise1-2', run: function (h) { window.Exercise.startChallenge('build', h); } },
    { id: 'atomBuild', lvl: '3e', pts: 3, label: 'Construire un atome', screen: 'screen-atom-expert-q', run: function (h) { quiz({ type: 'construct', ions: false }, h); } },
    { id: 'atomId', lvl: '3e', pts: 3, label: 'Identifier un atome', screen: 'screen-atom-expert-q', run: function (h) { quiz({ type: 'identify', ions: false }, h); } },
    { id: 'ionBuild', lvl: '3e', pts: 3, label: 'Construire un ion', screen: 'screen-atom-expert-q', run: function (h) { quiz({ type: 'construct', ions: true }, h); } },
    { id: 'ionId', lvl: '3e', pts: 3, label: 'Identifier un ion', screen: 'screen-atom-expert-q', run: function (h) { quiz({ type: 'identify', ions: true }, h); } },
    { id: 'eqWrite', lvl: '4e', pts: 5, label: 'Écrire une équation', screen: 'screen-expert', run: function (h) { window.Expert.startOne('write', h, game.sigs); } },
    { id: 'eqBalance', lvl: '4e', pts: 5, label: 'Équilibrer une équation', screen: 'screen-expert', run: function (h) { window.Expert.startOne('balance', h, game.sigs); } },
    { id: 'substance', lvl: '4e', pts: 5, label: 'Identifier une substance', screen: 'screen-temp', run: function (h) { window.TempLab.start('exp', h); } },
    { id: 'ionLab', lvl: '3e', pts: 5, label: 'Identifier un ion au labo', screen: 'screen-atom-expert-lab',
      run: function (h) { var X = window.Lab.expert; X.hooks.onSolved = h.onSolved; X.hooks.onFail = h.onFail; X.hooks.onNext = h.onNext; X.hooks.nextLabel = 'Question suivante'; X.start(); } },
    { id: 'phMeasure', lvl: '3e', pts: 5, label: 'Mesurer un pH', screen: 'screen-phlab-ch', run: function (h) { phLab('measure', h); } },
    { id: 'phIdentify', lvl: '3e', pts: 5, label: 'Identifier une solution par son pH', screen: 'screen-phlab-ch', run: function (h) { phLab('identify', h); } }
  ];

  var game = null, q = null, token = 0, tick = 0, popT = 0, lastLevel = null;

  /* ---------- Duel : code et tirage au sort commun ---------- */
  // 32 caractères faciles à lire et à taper (ni O/0, ni I/1) ; 4 caractères = un peu plus d'un million de codes.
  // Le nombre n que représente le code donne le tirage ; n % 3 donne les questions (rang dans LEVELS).
  var ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', NCODES = 32 * 32 * 32 * 32, KEY_DUEL = 'chimie-duel-launch';
  var nativeRandom = Math.random;
  function codeToNum(c) {
    c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 4) return -1;
    var n = 0;
    for (var i = 0; i < 4; i++) { var d = ABC.indexOf(c[i]); if (d < 0) return -1; n = n * 32 + d; }
    return n;
  }
  function numToCode(n) { var s = ''; for (var i = 0; i < 4; i++) { s = ABC[n % 32] + s; n = Math.floor(n / 32); } return s; }
  function duelLevel(code) { return LEVELS[codeToNum(code) % 3].id; }
  // Code au hasard dont le reste par 3 désigne les questions choisies
  function newCode(lvl) {
    var r = LEVELS.map(function (l) { return l.id; }).indexOf(lvl), n = Math.floor(nativeRandom() * NCODES);
    n = n - n % 3 + r;
    return numToCode(n >= NCODES ? n - 3 : n);
  }
  // Revanche : code suivant calculé à partir du précédent, le même chez les deux joueurs, mêmes questions choisies
  function rematchCode(code) {
    var n = codeToNum(code), r = n % 3, m = (n * 7919 + 104729) % NCODES;
    m = m - m % 3 + r;
    return numToCode(m >= NCODES ? m - 3 : m);
  }
  // Générateur pseudo-aléatoire (mulberry32), re-semé à chaque question à partir du code et du numéro de la question :
  // une erreur, un confetti ou une animation chez un joueur ne décale pas la suite des questions de l'autre.
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedQuestion(n) { Math.random = seeded(Math.imul(codeToNum(game.duel) + 1, 2654435761) ^ Math.imul(n + 1, 40503)); }

  /* ---------- Meilleurs scores, mémorisés dans le navigateur ---------- */
  function readBest() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function writeBest(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  function medal(score) { for (var i = 0; i < MEDALS.length; i++) if (score >= MEDALS[i].min) return MEDALS[i]; return null; }
  function pts(n) { return n + ' point' + (Math.abs(n) > 1 ? 's' : ''); }
  function levelOf(id) { return LEVELS.filter(function (l) { return l.id === id; })[0]; }

  function medalHtml(md, cls) {
    if (!md) return '<div class="ch-nomedal' + (cls === 'medal--mini' ? ' medal--mini' : '') + '" aria-hidden="true">🎗️</div>';
    return '<div class="medal medal--' + md.id + (cls ? ' ' + cls : '') + '" role="img" aria-label="Médaille ' + md.name + '">' +
      '<span class="medal__ribbon"></span><span class="medal__disc"><span class="medal__ring"></span><span class="medal__star">★</span><span class="medal__shine"></span></span>' +
      '<i class="medal__spark"></i><i class="medal__spark"></i><i class="medal__spark"></i></div>';
  }

  function renderBests() {
    var b = readBest();
    $('ch-bests').innerHTML = '<h2 class="ch-bests__title">Mes meilleurs scores</h2><div class="ch-bests__list">' + LEVELS.map(function (l) {
      var r = b[l.id];
      return '<div class="ch-best">' + (r ? medalHtml(medal(r.score), 'medal--mini') : '<div class="ch-best__none" aria-hidden="true">—</div>') +
        '<span class="ch-best__name">' + l.name + '</span><b class="ch-best__score">' + (r ? pts(r.score) : 'pas encore joué') + '</b></div>';
    }).join('') + '</div>';
    var top = LEVELS.reduce(function (m, l) { return b[l.id] && b[l.id].score > m ? b[l.id].score : m; }, -1);
    var hb = $('home-best');
    hb.textContent = top >= 0 ? 'Meilleur score : ' + pts(top) : '';
    hb.hidden = top < 0;
  }

  function openPage() {
    renderBests();
    window.App.showScreen('screen-challenge');
  }

  /* ---------- Choix des questions (duel : avant de créer le code) ---------- */
  function openLevels(duel) {
    try { lastLevel = localStorage.getItem(KEY_LVL) || lastLevel; } catch (e) { /* stockage indisponible */ }
    var html = '<h2 class="eq-catalog-title">Quelles questions ?</h2><p class="pop-text">' +
      (duel ? 'Coche les questions du duel : ton adversaire aura exactement les mêmes.' : 'Coche les questions de ta partie de 2 minutes.') + '</p>' +
      '<div class="ch-levels" role="radiogroup">' + LEVELS.map(function (l) {
        return '<button type="button" class="ch-level' + (l.id === lastLevel ? ' on' : '') + '" role="radio" aria-checked="' + (l.id === lastLevel) + '" data-pop="lvl" data-lvl="' + l.id + '">' +
          '<span class="ch-level__box" aria-hidden="true"></span><span><b>' + l.name + '</b><small>' + l.desc + '</small></span></button>';
      }).join('') + '</div>' +
      '<div class="ex-actions"><button type="button" class="btn-secondary" data-pop="close">Annuler</button>' +
      '<button type="button" class="btn-primary ch-go" data-pop="go"' + (lastLevel ? '' : ' disabled') + '>' + (duel ? 'Créer le code' : 'C\'est parti !') + '</button></div>';
    window.Pop.open(html, function (a, b) {
      if (a === 'lvl') {
        lastLevel = b.getAttribute('data-lvl');
        document.querySelectorAll('.ch-level').forEach(function (x) {
          var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on);
        });
        document.querySelector('.ch-go[data-pop="go"]').disabled = false;
      } else if (a === 'go' && lastLevel) {
        try { localStorage.setItem(KEY_LVL, lastLevel); } catch (e) { /* stockage indisponible */ }
        if (duel) { showCode(newCode(lastLevel), 'create'); return; }
        window.Pop.close();
        startGame(lastLevel);
      }
    });
  }

  /* ---------- Duel : créer, rejoindre, lancer ---------- */
  var DUO_SVG = '<svg class="ch-duo" viewBox="0 0 120 56" aria-hidden="true"><circle cx="24" cy="15" r="9" fill="currentColor"/><path d="M8 54v-8a16 16 0 0 1 32 0v8z" fill="currentColor"/>' +
    '<path d="M64 4L50 30h10l-6 22 18-30H61l7-18z" fill="#FFD84D" stroke="#B8860B" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="96" cy="15" r="9" fill="currentColor"/><path d="M80 54v-8a16 16 0 0 1 32 0v8z" fill="currentColor"/></svg>';
  function openDuel() {
    window.Pop.open('<h2 class="eq-catalog-title">Mode Duel</h2>' + DUO_SVG +
      '<p class="pop-text">Un joueur crée le duel et donne le code à l\'autre : vous aurez exactement les mêmes questions. À la fin, comparez vos scores !</p>' +
      '<div class="pop-choices">' +
      '<button type="button" class="mode-btn mode-btn--yellow" data-pop="create"><span class="mode-btn__title">Créer un duel</span><span class="mode-btn__subtitle">Choisis les questions et obtiens un code</span></button>' +
      '<button type="button" class="mode-btn mode-btn--orange" data-pop="join"><span class="mode-btn__title">Rejoindre un duel</span><span class="mode-btn__subtitle">Tape le code de ton adversaire</span></button>' +
      '</div><button type="button" class="btn-secondary" data-pop="close">Annuler</button>', function (a) {
      if (a === 'create') openLevels(true);
      else if (a === 'join') openJoin();
    });
  }
  function openJoin(err) {
    window.Pop.open('<h2 class="eq-catalog-title">Rejoindre un duel</h2><p class="pop-text">Tape le code à 4 caractères de ton adversaire.</p>' +
      '<input class="ch-code-in" id="ch-code-in" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Code du duel">' +
      (err ? '<p class="ch-code-err">' + err + '</p>' : '') +
      '<div class="ex-actions"><button type="button" class="btn-secondary" data-pop="close">Annuler</button>' +
      '<button type="button" class="btn-primary ch-go" data-pop="ok">Valider</button></div>', function (a) {
      if (a !== 'ok') return;
      var c = $('ch-code-in').value;
      if (codeToNum(c) < 0) openJoin('Ce code n\'existe pas : vérifie les 4 caractères avec ton adversaire.');
      else showCode(c.toUpperCase().replace(/[^A-Z0-9]/g, ''), 'join');
    }, { lock: true });
    var inp = $('ch-code-in');
    inp.addEventListener('input', function () { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') document.querySelector('[data-pop="ok"]').click(); });
    setTimeout(function () { inp.focus(); }, 50);
  }
  // mode : 'create' (code créé), 'join' (code tapé) ou 'rematch' (code de la revanche)
  function showCode(code, mode) {
    var created = mode === 'create';
    window.Pop.open('<h2 class="eq-catalog-title">' + ({ create: 'Ton code de duel', join: 'Duel trouvé !', rematch: 'Revanche !' })[mode] + '</h2>' +
      '<p class="ch-code">' + code + '</p><p class="ch-code-lvl">' + levelOf(duelLevel(code)).name + '</p>' +
      '<p class="pop-text">' + (created ? 'Donne ce code à ton adversaire. Quand vous êtes prêts tous les deux, lancez la partie en même temps !'
        : 'Quand vous êtes prêts tous les deux, lancez la partie en même temps !') + '</p>' +
      '<div class="ex-actions"><button type="button" class="btn-secondary" data-pop="close">Annuler</button>' +
      '<button type="button" class="btn-primary ch-go" data-pop="launch">Lancer la partie</button></div>', function (a) {
      if (a === 'launch') launchDuel(code);
    }, { lock: true });
  }
  // La page est rechargée avant un duel : les modules repartent de zéro (ils évitent de reposer leurs derniers tirages),
  // et les deux joueurs ont alors les mêmes questions, quoi qu'ils aient fait avant.
  function launchDuel(code) {
    try { sessionStorage.setItem(KEY_DUEL, code); } catch (e) { window.Pop.close(); return startGame(duelLevel(code), code); }
    location.reload();
  }
  function resumeDuel() {
    var code = null;
    try { code = sessionStorage.getItem(KEY_DUEL); sessionStorage.removeItem(KEY_DUEL); } catch (e) { /* stockage indisponible */ }
    if (codeToNum(code) < 0) return;
    window.App.showScreen('screen-challenge');
    var n = 3;
    (function count() {
      window.Pop.open('<p class="pop-kicker">Duel ' + code + ' · ' + levelOf(duelLevel(code)).name + '</p><p class="ch-count">' + (n || 'Partez !') + '</p>', null, { lock: true });
      if (n-- > 0) setTimeout(count, 800);
      else setTimeout(function () { window.Pop.close(); startGame(duelLevel(code), code); }, 600);
    })();
  }

  /* ---------- Partie ---------- */
  function startGame(lvl, duel) {
    game = { lvl: lvl, duel: duel || null, n: 0, score: 0, endAt: Date.now() + DURATION, log: [], sigs: [], last: null, over: false };
    document.body.classList.add('ch-run');
    $('ch-hud').hidden = false;
    $('ch-score').textContent = '0';
    clearInterval(tick);
    tick = setInterval(updateTime, 200);
    updateTime();
    nextQuestion();
  }
  function remaining() { return Math.max(0, game.endAt - Date.now()); }
  function updateTime() {
    if (!game || game.over) return;
    var ms = remaining(), s = Math.ceil(ms / 1000);
    $('ch-time').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    $('ch-time').classList.toggle('ch-hud__time--end', s <= 20);
    if (ms <= 0) endGame();
  }

  function pickKind() {
    var pool = KINDS.filter(function (k) { return game.lvl === 'all' || k.lvl === game.lvl; });
    var r = Math.random(), tier = r < TIER_WEIGHT[1] ? 1 : (r < TIER_WEIGHT[1] + TIER_WEIGHT[3] ? 3 : 5);
    var list = pool.filter(function (k) { return k.pts === tier && k.id !== game.last; });
    if (!list.length) list = pool.filter(function (k) { return k.id !== game.last; });
    return list[Math.floor(Math.random() * list.length)];
  }

  function nextQuestion() {
    cleanup();
    if (!game || game.over) return;
    if (game.duel) seedQuestion(game.n++);
    var k = pickKind(), t = ++token;
    game.last = k.id;
    q = { kind: k, stake: k.pts, token: t, done: false };
    updateStake();
    window.Pop.close();
    window.App.showScreen(k.screen);
    if (k.qcm) {
      var cats = game.lvl === 'all' ? window.Qcm.CATS['4e'].concat(window.Qcm.CATS['3e']) : window.Qcm.CATS[k.qcm];
      var host = $('ch-qcm-host');
      host.innerHTML = '';
      var head = document.createElement('p');
      head.className = 'ch-qhead';
      head.textContent = k.label + ' · 1 point';
      var body = document.createElement('div');
      host.appendChild(head); host.appendChild(body);
      window.Qcm.render(body, window.Qcm.make(cats), function (ok) {
        if (t !== token) return;
        if (ok) solved(t);
        else { q.stake = 0; updateStake(); finishQuestion(t, 'fail', 1900); }
      });
      return;
    }
    k.run({
      onSolved: function () { solved(t); },
      onFail: function () { failed(t); },
      onNext: function () { if (t === token && q.done) nextQuestion(); }
    });
  }

  function updateStake() {
    var s = $('ch-stake');
    s.textContent = q.stake + ' pt' + (q.stake > 1 ? 's' : '');
    s.classList.toggle('ch-hud__stake--zero', q.stake === 0);
  }
  function popMsg(text, good) {
    var p = $('ch-pop');
    p.textContent = text;
    p.className = 'ch-hud__pop ' + (good ? 'ch-hud__pop--good' : 'ch-hud__pop--bad');
    void p.offsetWidth;
    p.classList.add('show');
    clearTimeout(popT);
    popT = setTimeout(function () { p.classList.remove('show'); }, 1100);
  }

  function solved(t) {
    if (!q || t !== token || q.done) return;
    game.score += q.stake;
    $('ch-score').textContent = game.score;
    popMsg('+' + q.stake, true);
    finishQuestion(t, 'ok', 1400);
  }
  function failed(t) {
    if (!q || t !== token || q.done || q.stake === 0) return;
    q.stake--;
    updateStake();
    popMsg('−1', false);
  }
  // Fin d'une question : on la note dans le récapitulatif puis on enchaîne
  function finishQuestion(t, status, delay) {
    q.done = true;
    game.log.push({ label: q.kind.label, max: q.kind.pts, got: status === 'ok' ? q.stake : 0, status: status });
    setTimeout(function () { if (t === token && game && !game.over) nextQuestion(); }, delay);
  }
  function pass() {
    if (!game || game.over || !q || q.done) return;
    q.done = true;
    game.log.push({ label: q.kind.label, max: q.kind.pts, got: 0, status: 'pass' });
    game.endAt -= PASS_COST;
    popMsg('−5 s', false);
    updateTime();
    if (!game.over) nextQuestion();
  }

  // Arrête ce qui tourne encore sur l'écran de la question précédente
  function cleanup() {
    if (q && q.kind.id === 'substance' && window.TempLab) window.TempLab.stop();
    if (q && /^ph/.test(q.kind.id)) window.PhLab.challenge.stop();
  }

  function stopGame() {
    clearInterval(tick);
    Math.random = nativeRandom;
    if (game) game.over = true;
    token++;
    cleanup();
    q = null;
    document.body.classList.remove('ch-run');
    $('ch-hud').hidden = true;
    window.Pop.close();
  }

  /* ---------- Fin de partie : médaille, record, récapitulatif ---------- */
  function endGame() {
    if (!game || game.over) return;
    if (q && !q.done) game.log.push({ label: q.kind.label, max: q.kind.pts, got: 0, status: 'time' });
    stopGame();
    if (game.duel) return duelResults();
    var sc = game.score, md = medal(sc), all = readBest(), prev = all[game.lvl], record = !prev || sc > prev.score;
    if (record) { all[game.lvl] = { score: sc, medal: md ? md.id : null, date: new Date().toISOString() }; writeBest(all); }
    var nextMd = MEDALS.slice().reverse().filter(function (m) { return m.min > sc; })[0];
    var ok = game.log.filter(function (r) { return r.status === 'ok'; }).length;
    $('ch-results').innerHTML =
      (md && md.id === 'platine' ? '<div class="ch-banner"><span>Champion de la chimie !</span></div>' : '') +
      medalHtml(md, 'medal--big') +
      '<h1 class="app-title ch-res__title">' + (md ? 'Médaille ' + md.name + ' !' : 'Pas de médaille cette fois') + '</h1>' +
      '<p class="ch-res__score"><b>' + sc + '</b> ' + (sc > 1 ? 'points' : 'point') + '</p>' +
      '<p class="ch-res__lvl">' + levelOf(game.lvl).name + ' · ' + ok + ' question' + (ok > 1 ? 's' : '') + ' réussie' + (ok > 1 ? 's' : '') + '</p>' +
      '<p class="app-subtitle ch-res__msg">' + (!md ? 'Il te manque ' + pts(nextMd.min - sc) + ' pour la médaille de bronze. Entraîne-toi avec les leçons et retente ta chance !'
        : (nextMd ? 'Bravo ! Encore ' + pts(nextMd.min - sc) + ' et tu décroches la médaille suivante.' : 'Score exceptionnel ! Félicitations !')) + '</p>' +
      (record ? '<p class="ch-record">🏆 Nouveau meilleur score !</p>' : '<p class="ch-res__best">Meilleur score : ' + pts(prev.score) + '</p>') +
      '<div class="ch-res__card"><h2>Récapitulatif</h2>' + recapHtml(game.log) + '</div>' +
      '<div class="ex-actions"><button type="button" class="btn-secondary" data-do="home">Accueil</button>' +
      '<button type="button" class="btn-primary ch-go" data-do="again">Rejouer</button></div>';
    window.App.showScreen('screen-ch-results');
    renderBests();
    if (md) setTimeout(function () { burst(); if (md.id === 'platine') setTimeout(burst, 700); }, 400);
  }
  // Fin d'un duel : le score et le code, sans vainqueur (l'appli ne connaît pas le score de l'adversaire) ni record
  function duelResults() {
    var sc = game.score, ok = game.log.filter(function (r) { return r.status === 'ok'; }).length;
    $('ch-results').innerHTML =
      '<div class="ch-res__duel">' + DUO_SVG + '</div>' +
      '<h1 class="app-title ch-res__title">Fin du duel !</h1>' +
      '<p class="ch-res__score"><b>' + sc + '</b> ' + (sc > 1 ? 'points' : 'point') + '</p>' +
      '<p class="ch-res__lvl">Duel ' + game.duel + ' · ' + levelOf(game.lvl).name + ' · ' + ok + ' question' + (ok > 1 ? 's' : '') + ' réussie' + (ok > 1 ? 's' : '') + '</p>' +
      '<p class="app-subtitle ch-res__msg">Compare ton score avec celui de ton adversaire : le plus grand score gagne le duel !</p>' +
      '<div class="ch-res__card"><h2>Récapitulatif</h2>' + recapHtml(game.log) + '</div>' +
      '<div class="ex-actions"><button type="button" class="btn-secondary" data-do="home">Accueil</button>' +
      '<button type="button" class="btn-primary ch-go" data-do="rematch">Revanche</button></div>' +
      '<p class="ch-res__hint">Revanche : de nouvelles questions, les mêmes pour vous deux si vous la lancez tous les deux.</p>';
    window.App.showScreen('screen-ch-results');
  }
  function recapHtml(log) {
    if (!log.length) return '<p class="muted">Aucune question.</p>';
    var STATUS = { ok: '', fail: 'ratée', pass: 'passée', time: 'temps écoulé' };
    return '<table class="ch-recap"><tbody>' + log.map(function (r, i) {
      return '<tr class="ch-recap--' + r.status + '"><th><span class="ch-recap__n">' + (i + 1) + '</span>' + r.label +
        (STATUS[r.status] ? ' <small>' + STATUS[r.status] + '</small>' : '') + '</th>' +
        '<td class="ch-recap__pts">' + (r.got > 0 ? '+' + r.got : '0') + '<small>/' + r.max + '</small></td></tr>';
    }).join('') + '</tbody></table>';
  }
  function burst() {
    if (!window.Confetti || !$('confetti-canvas')) return;
    try { window.Confetti.burst($('confetti-canvas')); } catch (e) { /* décoratif */ }
  }

  function askQuit() {
    window.Pop.open('<h2 class="eq-catalog-title">Quitter la partie ?</h2><p class="pop-text">Ta partie en cours sera perdue et ton score ne sera pas enregistré.</p>' +
      '<div class="ex-actions"><button type="button" class="btn-secondary ch-danger" data-pop="quit">Quitter</button>' +
      '<button type="button" class="btn-primary" data-pop="close">Continuer la partie</button></div>', function (a) {
      if (a === 'quit') { stopGame(); game = null; openPage(); }
    });
  }

  function init() {
    renderBests();
    $('btn-ch-solo').addEventListener('click', function () { openLevels(false); });
    $('btn-ch-duel').addEventListener('click', openDuel);
    $('btn-back-challenge').addEventListener('click', function () { window.App.showScreen('screen-home'); });
    $('ch-quit').addEventListener('click', askQuit);
    $('ch-pass').addEventListener('click', pass);
    $('ch-results').addEventListener('click', function (e) {
      var b = e.target.closest('[data-do]');
      if (!b) return;
      var d = b.getAttribute('data-do');
      if (d === 'again') { openPage(); openLevels(false); }
      else if (d === 'rematch') { var c = rematchCode(game.duel); openPage(); showCode(c, 'rematch'); }
      else window.App.showScreen('screen-home');
    });
    // Après le rechargement qui lance un duel (après les autres initialisations de la page)
    setTimeout(resumeDuel, 0);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { openPage: openPage };
})();
