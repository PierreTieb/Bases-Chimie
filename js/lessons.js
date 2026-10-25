// lessons.js
// Mode Leçons : menu des leçons, choix « Suivre la leçon » / « S'entraîner », déroulé des consignes
// au-dessus de l'écran du labo (bandeau), vérification automatique et fiche « À retenir ».
// Progression mémorisée dans le navigateur : leçons terminées (coche verte dans le menu) et étapes réussies,
// que l'on peut reprendre depuis la liste ouverte par le compteur d'étapes du bandeau.
window.Lessons = (function () {
  'use strict';

  var D = window.LessonsData, KEY = 'chimie-lessons-done', KEY_STEPS = 'chimie-lessons-steps';
  var cur = null, idx = 0, phase = 'idle', ctx = {}, timer = 0, bar = null, form = null, stepCls = '', doneSteps = {};
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Progression ---------- */
  function readDone() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function markDone(id) { var d = readDone(); d[id] = 1; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* stockage indisponible */ } }
  function readSteps() { try { return JSON.parse(localStorage.getItem(KEY_STEPS)) || {}; } catch (e) { return {}; } }
  // Étape courante réussie : elle reste accessible dans la liste des étapes
  function markStep() {
    if (doneSteps[idx]) return;
    doneSteps[idx] = true;
    var m = readSteps(), l = (m[cur.id] || []).filter(function (k) { return k < cur.steps.length && doneSteps[k]; });
    if (l.indexOf(idx) < 0) l.push(idx);
    m[cur.id] = l;
    try { localStorage.setItem(KEY_STEPS, JSON.stringify(m)); } catch (e) { /* stockage indisponible */ }
  }
  function byId(id) { return D.filter(function (l) { return l.id === id; })[0]; }
  function num(l) { return D.indexOf(l) + 1; }

  /* ---------- Menu ---------- */
  function buildMenu() {
    var done = readDone();
    $('lessons-list').innerHTML = D.GROUPS.map(function (g, gi) {
      return '<p class="mode-caption">' + g.name + ' <span class="lesson-level">' + g.level + '</span></p><div class="mode-list">' +
        D.filter(function (l) { return l.group === gi; }).map(function (l) {
          return '<button type="button" class="mode-btn mode-btn--' + l.color + ' mode-btn--lesson" data-id="' + l.id + '">' +
            '<span class="mode-btn__kicker">Leçon ' + num(l) + '</span>' +
            '<span class="mode-btn__title">' + l.title + '</span><span class="mode-btn__subtitle">' + l.sub + '</span>' +
            (done[l.id] ? '<span class="lesson-done" aria-label="Leçon terminée">✓</span>' : '') + '</button>';
        }).join('') + '</div>';
    }).join('');
  }
  function openMenu() {
    stop();
    window.App.showScreen('screen-lessons');           // le menu se construit à l'affichage
  }
  function openChoice(l) {
    window.Pop.open('<p class="pop-kicker">Leçon ' + num(l) + '</p><h2 class="eq-catalog-title">' + l.title + '</h2>' +
      '<p class="pop-text">' + l.sub + '</p>' +
      '<div class="pop-choices">' +
        '<button type="button" class="mode-btn mode-btn--' + l.color + '" data-pop="follow"><span class="mode-btn__title">Suivre la leçon</span><span class="mode-btn__subtitle">Découvre la notion pas à pas</span></button>' +
        '<button type="button" class="mode-btn mode-btn--yellow" data-pop="train"><span class="mode-btn__title">S\'entraîner</span><span class="mode-btn__subtitle">' + l.train.label + '</span></button>' +
      '</div><button type="button" class="btn-secondary" data-pop="close">Fermer</button>', function (a) {
      if (a === 'follow') { window.Pop.close(); start(l); }
      else if (a === 'train') { window.Pop.close(); train(l); }
    });
  }
  function train(l) { stop(); window.App.open(l.train.screen, 'screen-lessons', l.train.start); }

  /* ---------- Déroulé d'une leçon ---------- */
  function start(l) {
    stop();
    window.App.open(l.host, 'screen-lessons', l.start);
    if (l.tuto) return;                                   // le tutoriel signale lui-même sa fin
    cur = l; idx = 0; ctx = {};
    doneSteps = {};
    var saved = readSteps()[l.id] || [];
    // Une étape enregistrée au-delà de la fin : la leçon a changé depuis, sa progression repart de zéro
    if (saved.some(function (k) { return k >= l.steps.length; })) saved = [];
    saved.forEach(function (k) { doneSteps[k] = true; });
    document.body.classList.add('lesson-on');
    mountBar();
    showStep();
  }
  function step() { return cur.steps[idx]; }

  function mountBar() {
    var host = $(cur.host), title = host.querySelector('h1');
    bar = document.createElement('div');
    bar.className = 'lesson-bar';
    bar.innerHTML = '<button type="button" class="lesson-bar__step" id="lb-step" aria-haspopup="true" aria-expanded="false" aria-label="Liste des étapes"></button>' +
      '<div class="lesson-steps" id="lb-steps" hidden></div>' +
      '<button type="button" class="lesson-bar__goal" id="lb-goal" aria-label="Revoir la consigne"><span class="lesson-bar__kicker" id="lb-kicker"></span><span class="lesson-bar__text" id="lb-task"></span></button>' +
      '<button type="button" class="btn-primary lesson-bar__next" id="lb-next" hidden>Consigne suivante</button>';
    form = document.createElement('div');
    form.className = 'lesson-form';
    form.hidden = true;
    title.parentNode.insertBefore(form, title.nextSibling);
    title.parentNode.insertBefore(bar, form);
    $('lb-goal').addEventListener('click', function () { if (phase === 'doing') intro(); });
    $('lb-next').addEventListener('click', next);
    $('lb-step').addEventListener('click', function (e) { e.stopPropagation(); toggleSteps(); });
    $('lb-steps').addEventListener('click', function (e) {
      var b = e.target.closest('[data-goto]');
      if (b && !b.disabled) goTo(+b.getAttribute('data-goto'));
    });
  }

  function setStepCls(c) {
    if (stepCls) document.body.classList.remove(stepCls);
    stepCls = c || '';
    if (stepCls) document.body.classList.add(stepCls);
  }

  function showStep() {
    var s = step();
    phase = 'intro';
    clearInterval(timer);
    bar.classList.remove('done');
    toggleSteps(false);
    // Étape déjà réussie auparavant : on peut la refaire ou passer directement à la suivante
    $('lb-next').textContent = 'Consigne suivante';
    $('lb-next').hidden = !(doneSteps[idx] && idx < cur.steps.length - 1);
    $('lb-step').textContent = (idx + 1) + '/' + cur.steps.length;
    $('lb-kicker').textContent = 'Leçon ' + num(cur) + ' · ' + s.title;
    $('lb-task').innerHTML = s.task || (s.quiz ? 'Réponds à la question.' : 'Lis l\'explication.');
    form.hidden = true;
    setStepCls(s.cls);
    if (s.setup) s.setup(ctx);
    if (s.form) buildForm(s);
    intro();
  }

  // Fenêtre de la consigne : explication, puis tâche, question ou bouton « Suivant »
  function intro() {
    var s = step(), last = idx === cur.steps.length - 1;
    var html = '<p class="pop-kicker">Étape ' + (idx + 1) + ' / ' + cur.steps.length + '</p><h2 class="eq-catalog-title">' + s.title + '</h2>' +
      '<div class="pop-text">' + s.text + '</div>';
    if (s.quiz) {
      html += '<div class="lesson-quiz" id="lq"></div>';
    } else if (s.task) {
      html += '<div class="lesson-task"><span aria-hidden="true">➜</span><span>' + s.task + '</span></div>' +
        '<div class="ex-actions"><button type="button" class="btn-primary" data-pop="go">C\'est parti</button></div>';
    } else {
      html += '<div class="ex-actions"><button type="button" class="btn-primary" data-pop="next">' + (last ? 'Terminer la leçon' : 'Suivant') + '</button></div>';
    }
    window.Pop.open(html, function (a) {
      if (a === 'go') { window.Pop.close(); doing(); }
      else if (a === 'next') { window.Pop.close(); if (!step().quiz) markStep(); next(); }
    }, { lock: true });
    if (s.quiz) renderQuiz(s.quiz);
  }

  // Question : on peut se tromper, la mauvaise réponse se grise et l'explication s'affiche
  function renderQuiz(q) {
    var box = $('lq'), last = idx === cur.steps.length - 1;
    var order = q.choices.map(function (c, i) { return i; });
    if (q.choices.length > 2 && !/^(acide|Oui)$/.test(q.choices[0])) order.sort(function () { return Math.random() - .5; });
    box.innerHTML = '<p class="qcm-q">' + q.q + '</p><div class="qcm-choices' + (q.choices.length === 2 ? ' qcm-choices--2' : '') + '">' +
      order.map(function (i) { return '<button type="button" class="qcm-choice" data-i="' + i + '">' + q.choices[i] + '</button>'; }).join('') +
      '</div><p class="qcm-explain" hidden></p><div class="ex-actions" hidden><button type="button" class="btn-primary" data-pop="next">' +
      (last ? 'Terminer la leçon' : 'Consigne suivante') + '</button></div>';
    box.querySelector('.qcm-choices').addEventListener('click', function (e) {
      var b = e.target.closest('.qcm-choice');
      if (!b || b.disabled) return;
      var ok = +b.getAttribute('data-i') === q.answer, ex = box.querySelector('.qcm-explain');
      if (ok) {
        b.classList.add('qcm-choice--ok');
        box.querySelectorAll('.qcm-choice').forEach(function (x) { x.disabled = true; });
        ex.innerHTML = 'Bonne réponse !'; ex.className = 'qcm-explain qcm-explain--ok'; ex.hidden = false;
        box.querySelector('.ex-actions').hidden = false;
        markStep();
        celebrate(b);
      } else {
        b.classList.add('qcm-choice--bad'); b.disabled = true;
        ex.innerHTML = q.explain || 'Ce n\'est pas ça, essaie encore.'; ex.className = 'qcm-explain'; ex.hidden = false;
      }
    });
  }

  function doing() {
    var s = step();
    phase = 'doing';
    if (s.form) { form.hidden = false; return; }
    clearInterval(timer);
    var since = 0;                                        // début de la réussite en cours (consigne avec « hold »)
    timer = setInterval(function () {
      if (phase !== 'doing' || window.Pop.isOpen()) return;
      var ok = false;
      try { ok = !!s.check(cur.state(), ctx); } catch (e) { ok = false; }
      if (!ok) { since = 0; return; }
      if (!since) since = Date.now();
      if (Date.now() - since >= (s.hold || 0)) success();
    }, 300);
  }

  function success() {
    clearInterval(timer);
    phase = 'done';
    markStep();
    bar.classList.add('done');
    $('lb-task').innerHTML = 'Bravo, consigne réussie !';
    var nx = $('lb-next');
    nx.textContent = idx === cur.steps.length - 1 ? 'Terminer la leçon' : 'Consigne suivante';
    nx.hidden = false;
    celebrate(nx);
  }

  function next() {
    if (!cur) return;
    form.hidden = true;
    if (idx < cur.steps.length - 1) { idx++; showStep(); }
    else finish();
  }

  /* ---------- Liste des étapes : reprendre une étape déjà réussie ---------- */
  // Accessibles : les étapes réussies, la première étape pas encore réussie et l'étape en cours
  function reachable(i) {
    var first = 0;
    while (first < cur.steps.length && doneSteps[first]) first++;
    return !!doneSteps[i] || i === first || i === idx;
  }
  function toggleSteps(open) {
    var box = $('lb-steps');
    if (!box) return;
    if (open === undefined) open = box.hidden;
    if (open) {
      box.innerHTML = cur.steps.map(function (st, i) {
        var ok = reachable(i);
        return '<button type="button" data-goto="' + i + '" class="' + (doneSteps[i] ? 'done' : '') + (ok ? '' : ' locked') + '"' + (ok ? '' : ' disabled') +
          (i === idx ? ' aria-current="step"' : '') + '><span class="lesson-steps__n">' + (doneSteps[i] ? '✓' : ok ? i + 1 : '🔒') + '</span>' + st.title + '</button>';
      }).join('');
    }
    box.hidden = !open;
    $('lb-step').setAttribute('aria-expanded', open);
  }
  // Reprise d'une étape : pour une manipulation, le labo repart de l'état de départ de la consigne
  function goTo(i) {
    toggleSteps(false);
    window.Pop.close();
    var st = cur.steps[i];
    idx = i;
    if (st.task) {
      if (cur.start) cur.start();
      if (st.prep) st.prep(ctx);
    }
    showStep();
  }

  /* ---------- Valeurs à écrire (consigne « form ») ---------- */
  function buildForm(s) {
    form.innerHTML = '<div class="lesson-form__fields">' + s.form.fields.map(function (f) {
      return '<label class="lesson-field"><span>' + f.label + '</span><input type="text" data-k="' + f.key + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"' +
        (f.num ? ' inputmode="numeric"' : '') + '></label>';
    }).join('') + '</div><p class="ex-feedback" id="lf-msg"></p><div class="ex-actions">' +
      (s.form.table ? '<button type="button" class="btn-secondary" id="lf-pt">Tableau périodique</button>' : '') +
      '<button type="button" class="btn-primary" id="lf-check">Vérifier</button></div>';
    form.querySelector('#lf-check').addEventListener('click', function () { checkForm(s); });
    var pt = form.querySelector('#lf-pt');
    if (pt) pt.addEventListener('click', function () {
      window.Pop.open('<h2 class="eq-catalog-title">Tableau périodique</h2><div class="pt-scroll" id="lf-ptv"></div><button type="button" class="btn-primary" data-pop="close">Fermer</button>');
      window.PeriodicTable.renderView($('lf-ptv'), 18);
    });
  }
  function checkForm(s) {
    if (phase !== 'doing') return;
    var all = true;
    s.form.fields.forEach(function (f) {
      var inp = form.querySelector('input[data-k="' + f.key + '"]'), ok = inp.value.trim() === f.expect(ctx);
      inp.classList.toggle('lesson-field--ok', ok);
      inp.classList.toggle('lesson-field--bad', !ok);
      if (!ok) all = false;
    });
    var msg = $('lf-msg');
    if (all) { msg.textContent = ''; form.querySelectorAll('input').forEach(function (i) { i.readOnly = true; }); success(); }
    else { msg.textContent = 'Les cases en rouge ne sont pas justes (attention aux majuscules et minuscules du symbole).'; msg.className = 'ex-feedback error'; }
  }

  /* ---------- Fin de leçon ---------- */
  function finish() {
    var l = cur;
    markDone(l.id);
    setStepCls('');
    showMemo(l);
  }
  function showMemo(l) {
    window.Pop.open('<p class="pop-kicker">Leçon ' + num(l) + ' terminée</p><h2 class="eq-catalog-title">À retenir</h2>' +
      '<div class="lesson-memo">' + l.memo() + '</div>' +
      '<div class="ex-actions"><button type="button" class="btn-secondary" data-pop="menu">Retour aux leçons</button>' +
      '<button type="button" class="btn-primary" data-pop="train">S\'entraîner</button></div>', function (a) {
      if (a === 'menu') { window.Pop.close(); openMenu(); }
      else if (a === 'train') { window.Pop.close(); train(l); }
    }, { wide: true, lock: true });
    celebrate(null);
  }
  // Fin d'un tutoriel existant (équilibrer, ions)
  function tutoDone(id) {
    var l = byId(id);
    if (!l) return;
    markDone(id);
    if (l.memo) setTimeout(function () { showMemo(l); }, 900);
  }

  function celebrate(anchor) {
    if (!window.Confetti || !$('confetti-canvas')) return;
    try {
      var r = anchor ? anchor.getBoundingClientRect() : null;
      window.Confetti.burst($('confetti-canvas'), r ? r.left + r.width / 2 : undefined, r ? r.top + r.height / 2 : undefined);
    } catch (e) { /* décoratif */ }
  }

  function stop() {
    clearInterval(timer);
    phase = 'idle';
    setStepCls('');
    document.body.classList.remove('lesson-on');
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    if (form && form.parentNode) form.parentNode.removeChild(form);
    bar = form = null;
    cur = null;
  }

  /* ---------- Échelle de pH (écran de la leçon « Acides et bases ») ---------- */
  function setPh(v) {
    $('ph-range').value = v;
    $('ph-num').textContent = v;
    $('ph-kind').textContent = v < 7 ? 'Solution acide' : (v === 7 ? 'Solution neutre' : 'Solution basique');
    $('ph-kind').className = 'ph-kind ' + (v < 7 ? 'ph-z--acid' : (v === 7 ? 'ph-z--neutral' : 'ph-z--base'));
    $('ph-range').style.setProperty('--ph', v / 14);
    window.PhLab.Ions.set(v);
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('lessons-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-id]');
      if (b) openChoice(byId(b.getAttribute('data-id')));
    });
    $('ph-range').addEventListener('input', function () { setPh(+$('ph-range').value); });
    document.addEventListener('click', function (e) {
      if (bar && !e.target.closest('#lb-steps')) toggleSteps(false);
    });
    // Quitter l'écran de la leçon (bouton Retour…) arrête la leçon ; le menu se remet à jour à chaque retour
    window.App.onShow(function (id) {
      if (cur && id !== cur.host) stop();
      if (id === 'screen-lessons') buildMenu();
    });
  });

  return { openMenu: openMenu, tutoDone: tutoDone, setPh: setPh };
})();
