// ions-app.js
// Mode "Ions" du module Atomes et Ions :
//  - IonCours  : tuto "Découvrir les ions" (2 étapes + réussite + écran "À retenir")
//  - Quiz      : moteur construire / identifier en alternance, utilisé par
//                "Exerce-toi avec les ions", Challenge niveau 1 (atomes) et niveau 2 (ions)
// Code couleur des textes : rouge = positif (+, perdu, positif), bleu foncé = négatif (−, gagné, négatif).
(function () {
  'use strict';

  var K = window.AtomKit, U = window.Units;
  var MINUS = '\u2212';
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Banques d'ions (z, charge) ----------
  var TUTO_IONS = [
    { z: 3, charge: 1 }, { z: 4, charge: 2 }, { z: 5, charge: 3 },
    { z: 7, charge: -3 }, { z: 8, charge: -2 }
  ];
  var EX_IONS = [
    { z: 1, charge: 1 }, { z: 3, charge: 1 }, { z: 4, charge: 2 }, { z: 7, charge: -3 },
    { z: 8, charge: -2 }, { z: 9, charge: -1 }, { z: 11, charge: 1 }, { z: 12, charge: 2 },
    { z: 13, charge: 3 }, { z: 15, charge: -3 }, { z: 16, charge: -2 }, { z: 17, charge: -1 }
  ];
  var CH2_IONS = EX_IONS.concat([{ z: 5, charge: 3 }, { z: 1, charge: -1 }]);
  var ATOMS = [];
  for (var zz = 1; zz <= 18; zz++) ATOMS.push({ z: zz, charge: 0 });

  // ---------- Outils de texte ----------
  function pos(t) { return '<span class="ion-pos">' + t + '</span>'; }
  function neg(t) { return '<span class="ion-neg">' + t + '</span>'; }
  function ionHTML(el, charge) { return el.symbol + K.chargeSup(charge); }
  function deName(el) {
    var n = el.name.toLowerCase();
    return (/^[aeiouyhéèêâîô]/.test(n) ? "d'" : 'de ') + n;
  }
  function plural(n) { return n + ' électron' + (n > 1 ? 's' : ''); }
  // "perdu 2 électrons" / "gagné 1 électron" (verbe coloré)
  function changeHTML(charge) {
    var n = Math.abs(charge);
    return (charge > 0 ? pos('perdu') : neg('gagné')) + ' ' + plural(n);
  }
  function expected(ion) {
    var el = U.getByZ(ion.z);
    return { el: el, p: ion.z, n: el.mass - ion.z, e: ion.z - ion.charge };
  }
  function keyOf(ion) { return ion.z + ':' + ion.charge; }
  function pickNew(list, lastKey) {
    var pool = list.filter(function (i) { return keyOf(i) !== lastKey; });
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function confetti(anchor) {
    var canvas = $('confetti-canvas');
    if (!window.Confetti || !canvas) return;
    try {
      var r = anchor.getBoundingClientRect();
      window.Confetti.burst(canvas, r.left + r.width / 2, r.top + r.height / 2);
    } catch (e) { /* décoratif */ }
  }
  function show(el, on, disp) { if (el) el.style.display = on ? (disp || '') : 'none'; }

  // ============================================================
  // Tuto : Découvrir les ions
  // ============================================================
  var IonCours = (function () {
    var els = {}, ctrl = null, ion = null, info = null, step = 1, lastKey = null;

    function state() {
      var c = ctrl.getCounts(), x = info;
      var nucleusOK = c.protons === x.p && c.neutrons === x.n;
      return { c: c, nucleusOK: nucleusOK, atomOK: nucleusOK && c.electrons === x.p, ionOK: nucleusOK && c.electrons === x.e };
    }

    function setFeedback(html, cls) {
      els.feedback.innerHTML = html;
      els.feedback.className = 'ex-feedback' + (cls ? ' ' + cls : '');
    }

    function refresh() {
      if (!ion) return;
      var st = state(), el = info.el;

      // Étiquette de l'atome construit : la charge apparaît à l'étape 2
      var e = U.getByZ(st.c.protons);
      if (e && step === 2) els.symbol.innerHTML = e.symbol + K.chargeSup(st.c.protons - st.c.electrons);

      if (step === 1) {
        els.text.innerHTML = "Un ion est avant tout un <strong>atome</strong>. Pour commencer, construisons donc un atome !";
        els.instr.innerHTML = "Construis l'atome " + deName(el) + " (neutre) :";
        els.tip.textContent = '';
        show(els.target, true);
        els.target.innerHTML = K.cellHTML(el, 0);
        show(els.prev, false);
        els.next.textContent = 'Suivant';
        els.next.disabled = !st.atomOK;
        if (st.atomOK) setFeedback("Bravo, c'est bien un atome " + deName(el) + ", il est neutre !", 'success');
        else setFeedback('', '');
      } else {
        var n = Math.abs(ion.charge), sign = ion.charge > 0;
        els.text.innerHTML = 'Un ion est un atome qui a ' + neg('gagné') + ' ou ' + pos('perdu') + ' des électrons. ' +
          'Un atome ' + pos('positif') + ' aura donc ' + pos('perdu') + ' des électrons, ' +
          'un atome ' + neg('négatif') + ' aura ' + neg('gagné') + ' des électrons.';
        els.instr.innerHTML = (sign ? 'Retire ' : 'Ajoute ') + plural(n) + (sign ? " de l'atome " : " à l'atome ") + deName(el) +
          " pour fabriquer l'ion " + (sign ? pos('positif') : neg('négatif')) + ' ' + ionHTML(el, ion.charge) + '.';
        els.tip.textContent = sign ? "Pour retirer un électron, clique sur la zone des électrons de l'atome." : '';
        show(els.target, false);
        show(els.prev, true);
        els.next.textContent = 'À retenir';
        els.next.disabled = !st.ionOK;
        if (st.ionOK) {
          setFeedback("Tu as fabriqué l'ion " + ionHTML(el, ion.charge) + " ! C'est l'atome " + deName(el) +
            ' qui a ' + changeHTML(ion.charge) + '.', 'success');
        } else if (!st.nucleusOK) {
          setFeedback("Le noyau ne doit pas changer : on garde le même atome.", 'error');
        } else setFeedback('', '');
      }
    }

    function newIon() {
      ion = pickNew(TUTO_IONS, lastKey);
      lastKey = keyOf(ion);
      info = expected(ion);
      step = 1;
      show(els.main, true);
      show(els.recap, false);
      ctrl.setNeutralVisible(true);
      ctrl.reset();
      refresh();
    }

    function onNext() {
      if (step === 1) {
        if (!state().atomOK) return;
        step = 2;
        ctrl.setNeutralVisible(false);
        refresh();
      } else if (state().ionOK) {
        confetti(els.next);
        show(els.main, false);
        show(els.recap, true);
        window.scrollTo(0, 0);
      }
    }

    function onPrev() {
      if (step !== 2) return;
      step = 1;
      ctrl.setNeutralVisible(true);
      ctrl.setCounts(info.p, info.n, info.p);   // retour à l'atome neutre
      refresh();
    }

    function init() {
      els.main = $('ionc-main'); els.recap = $('ionc-recap');
      if (!els.main) return;
      els.text = $('ionc-text'); els.instr = $('ionc-instruction'); els.tip = $('ionc-tip');
      els.target = $('ionc-target'); els.feedback = $('ionc-feedback');
      els.symbol = $('ionc-info-symbol');
      els.prev = $('btn-ionc-prev'); els.next = $('btn-ionc-next');

      ctrl = K.createAtomController({
        nucleusEl: $('ionc-nucleus-wrap'), electronsEl: $('ionc-electrons-wrap'),
        symbolEl: els.symbol, nameEl: $('ionc-info-name'),
        massEl: $('ionc-info-mass'), numberEl: $('ionc-info-number'),
        protonBtn: $('btn-ionc-add-proton'), neutronBtn: $('btn-ionc-add-neutron'),
        electronBtn: $('btn-ionc-add-electron'),
        neutralMsgEl: $('ionc-neutral'), limitMsgEl: $('ionc-limit'),
        showHelpers: true, onChange: refresh
      });
      $('btn-ionc-add-proton').addEventListener('click', function () { ctrl.add('proton'); });
      $('btn-ionc-add-neutron').addEventListener('click', function () { ctrl.add('neutron'); });
      $('btn-ionc-add-electron').addEventListener('click', function () { ctrl.add('electron'); });
      $('btn-ionc-clear').addEventListener('click', function () { ctrl.reset(); });
      els.next.addEventListener('click', onNext);
      els.prev.addEventListener('click', onPrev);
      $('btn-ionc-menu').addEventListener('click', function () { window.App.showScreen('screen-mode2'); });
      $('btn-ionc-again').addEventListener('click', function () { newIon(); window.scrollTo(0, 0); });
    }

    document.addEventListener('DOMContentLoaded', init);
    return { start: function () { if (els.main) newIon(); } };
  })();

  // ============================================================
  // Moteur de questions : construire / identifier en alternance
  // ============================================================
  function createQuiz(cfg) {
    var p = cfg.prefix, root = null, els = {}, ctrl = null;
    var ions = !!cfg.ions, curPool = cfg.pool, forced = null, failed = false;   // forced : question imposée (mode Expert)
    var item = null, type = null, lastType = null, lastKey = null;
    var score = { correct: 0, total: 0 };
    var solved = false, revealing = false, timer = null;

    function tpl() {
      var ions = cfg.ions || !!cfg.expert;
      return '' +
        '<button type="button" class="btn-back" id="' + p + '-back">← Retour</button>' +
        '<h1 class="app-title app-title--small">' + cfg.title + '</h1>' +
        '<div class="exercise-topbar"><span class="ex-score" id="' + p + '-score">Score : 0 / 0</span></div>' +
        '<p class="app-subtitle" id="' + p + '-instruction"></p>' +

        '<div id="' + p + '-build">' +
          '<div class="ion-target-row">' +
            '<div class="atom-cell atom-cell--target" id="' + p + '-target"></div>' +
            '<p class="ion-sentence" id="' + p + '-sentence"></p>' +
          '</div>' +
          '<div class="atom-layout atom-layout--compact"><div class="atom-schema atom-schema--compact"><div class="atom-spin">' +
            '<div class="atom-nucleus-wrap" id="' + p + '-nucleus"></div><div class="atom-electrons-wrap" id="' + p + '-electrons"></div></div>' +
            '<button type="button" class="btn-clear btn-clear--mini" id="' + p + '-clear">Effacer</button></div></div>' +
          '<p class="atom-limit-msg" id="' + p + '-limit"></p>' +
          '<div class="atom-particle-bar">' +
            '<button type="button" class="atom-particle-btn atom-particle-btn--proton" id="' + p + '-bp">+ Proton (0)</button>' +
            '<button type="button" class="atom-particle-btn atom-particle-btn--neutron" id="' + p + '-bn">+ Neutron (0)</button>' +
            '<button type="button" class="atom-particle-btn atom-particle-btn--electron" id="' + p + '-be">+ Électron (0)</button>' +
          '</div>' +
        '</div>' +

        '<div id="' + p + '-identify" style="display:none;">' +
          '<div class="atom-schema atom-schema--compact atom-schema--static"><div class="atom-spin">' +
            '<div class="atom-nucleus-wrap" id="' + p + '-inucleus"></div><div class="atom-electrons-wrap" id="' + p + '-ielectrons"></div></div></div>' +
          '<div class="atom-cell atom-cell--answer">' +
            '<span class="element-mass" id="' + p + '-amass"></span>' +
            '<span class="element-number" id="' + p + '-az"></span>' +
            '<input type="text" class="ion-symbol-input" id="' + p + '-sym" maxlength="2" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Symbole de l\'atome" placeholder="?">' +
            (ions ? '<input type="text" class="ion-charge-input" id="' + p + '-chg" readonly inputmode="none" aria-label="Charge de l\'ion" placeholder="±">' : '') +
          '</div>' +
          (ions ? '<div class="ion-keypad" id="' + p + '-keypad">' +
            '1234567890'.split('').map(function (d) { return '<button type="button" class="ion-key" data-k="' + d + '">' + d + '</button>'; }).join('') +
            '<button type="button" class="ion-key ion-key--pos" data-k="+">+</button>' +
            '<button type="button" class="ion-key ion-key--neg" data-k="-">' + MINUS + '</button>' +
            '<button type="button" class="ion-key" data-k="del" aria-label="Effacer">⌫</button></div>' : '') +
          '<div class="ex-actions"><button type="button" class="btn-secondary" id="' + p + '-ptbtn">Tableau périodique</button></div>' +
        '</div>' +

        '<div class="ion-built" id="' + p + '-built"></div>' +
        '<p class="ex-feedback" id="' + p + '-feedback"></p>' +
        '<div class="ex-actions">' +
          '<button type="button" class="btn-primary" id="' + p + '-validate">Valider</button>' +
          '<button type="button" class="btn-primary btn-primary--alt" id="' + p + '-skip">Résoudre et passer</button>' +
        '</div>' +

        '<div class="eq-catalog-overlay" id="' + p + '-ptover"><div class="eq-catalog-panel atom-picker-panel">' +
          '<h2 class="eq-catalog-title">Tableau périodique</h2><div class="pt-scroll" id="' + p + '-ptview"></div>' +
          '<button type="button" class="btn-primary" id="' + p + '-ptclose">Fermer</button></div></div>';
    }

    function updateScore() { els.score.textContent = 'Score : ' + score.correct + ' / ' + score.total; }
    function setFeedback(html, cls) {
      els.feedback.innerHTML = html;
      els.feedback.className = 'ex-feedback' + (cls ? ' ' + cls : '');
    }
    function clearBuilt() { els.built.innerHTML = ''; }

    // ---------- Question ----------
    function next() {
      clearTimeout(timer);
      solved = false; revealing = false;
      failed = false;
      if (forced) {
        type = forced.type; ions = forced.ions; curPool = forced.pool;
        ctrl.setShake(forced.shake);
      } else {
        type = lastType ? (lastType === 'construct' ? 'identify' : 'construct') : (Math.random() < 0.5 ? 'construct' : 'identify');
      }
      lastType = type;
      item = pickNew(curPool, lastKey);
      lastKey = keyOf(item);
      var x = expected(item);
      if (els.chg) { show(els.chg, ions); show(els.keypad, ions); }

      setFeedback('', ''); clearBuilt();
      els.ptover.style.display = 'none';
      els.validate.disabled = false; els.skip.disabled = false;
      els.skip.textContent = 'Résoudre et passer';
      show(els.skip, !!cfg.skipAlways);

      if (type === 'construct') {
        els.instr.textContent = ions ? "Construis l'ion suivant :" : "Construis l'atome suivant :";
        show(els.build, true); show(els.identify, false);
        els.target.innerHTML = K.cellHTML(x.el, item.charge);
        els.sentence.innerHTML = (cfg.sentence && item.charge)
          ? "Il s'agit de l'atome " + deName(x.el) + ' qui a ' + changeHTML(item.charge) + '.' : '';
        ctrl.reset();
        clearBuilt();
      } else {
        els.instr.textContent = ions ? "Quel est cet ion ? Écris son symbole et sa charge." : 'Quel est cet atome ? Écris son symbole.';
        show(els.build, false); show(els.identify, true);
        K.renderNucleus(els.inuc, x.p, x.n);
        K.renderElectrons(els.iel, x.e);
        els.sym.value = ''; els.sym.disabled = false;
        if (els.chg) { els.chg.value = ''; paintCharge(); }
        onSymbolInput();
      }
    }

    // ---------- Identification : saisie ----------
    function onSymbolInput() {
      var v = els.sym.value.replace(/[^A-Za-z]/g, '').slice(0, 2);
      if (v !== els.sym.value) els.sym.value = v;
      var el = U.getBySymbol(v);
      els.amass.textContent = el ? el.mass : '';
      els.az.textContent = el ? el.z : '';
    }
    function paintCharge() {
      var v = els.chg.value;
      els.chg.classList.toggle('ion-pos', /\+$/.test(v));
      els.chg.classList.toggle('ion-neg', /[\u2212-]$/.test(v));
    }
    // Un chiffre seul, puis un signe ; rien après le signe.
    function keyPress(k) {
      if (!els.chg || solved || revealing) return;
      var v = els.chg.value;
      if (k === 'del') v = v.slice(0, -1);
      else if (k === '+' || k === '-') { if (/[+\u2212]$/.test(v)) return; v += (k === '+' ? '+' : MINUS); }
      else { if (v !== '') return; v = k; }
      els.chg.value = v;
      paintCharge();
    }
    function parseCharge(v) {
      if (v === '') return { ok: true, value: 0 };
      var m = /^([1-9])?([+\u2212-])$/.exec(v);
      if (!m) return { ok: false };
      var n = m[1] ? parseInt(m[1], 10) : 1;
      return { ok: true, value: m[2] === '+' ? n : -n };
    }

    // Mode S'exercer avec les atomes : retour selon ce qui a été écrit
    function atomIdentifyMsg(it) {
      var raw = els.sym.value, low = raw.toLowerCase();
      var same = U.getAll().filter(function (e) { return e.symbol.toLowerCase() === low; })[0];
      if (!same) return "Écris le symbole d'un atome du tableau périodique.";
      if (same.z === it.z) return 'Fais attention à la manière dont un atome est symbolisé (majuscule/minuscule) c\'est important.';
      return 'Pour identifier un atome on compte ses protons, et on lit ce nombre en bas de la case de l\'atome correspondant. Ressaye !';
    }

    // ---------- Validation ----------
    function onValidate() {
      if (solved || revealing) return;
      clearBuilt();
      var x = expected(item), ok = false, msg = '';
      var generic = "Ce n'est pas la bonne réponse, réessaie.";

      if (type === 'construct') {
        var c = ctrl.getCounts();
        var nucleusOK = c.protons === x.p && c.neutrons === x.n;
        ok = nucleusOK && c.electrons === x.e;
        if (!ok) {
          if (!cfg.detailed) msg = generic;
          else if (!nucleusOK) {
            msg = "Ce n'est pas le bon atome de départ : revois le nombre de nucléons (protons et neutrons) dans le noyau.";
          } else {
            var built = c.protons - c.electrons;
            els.built.innerHTML = '<p class="ion-built-caption">Voici l\'ion que tu as construit :</p>' +
              '<div class="atom-cell">' + K.cellHTML(x.el, built) + '</div>';
            msg = "Le noyau est le bon, mais pas le nombre d'électrons. Regarde bien la charge en exposant : un « " + pos('+') +
              ' » indique un ion ' + pos('positif') + ' qui a ' + pos('perdu') + ' des électrons, un « ' + neg(MINUS) +
              ' » indique un ion ' + neg('négatif') + ' qui a ' + neg('gagné') + ' des électrons.';
          }
        }
      } else {
        var el = U.getBySymbol(els.sym.value);
        var ch = (ions && els.chg) ? parseCharge(els.chg.value) : { ok: true, value: 0 };
        ok = !!el && el.z === item.z && ch.ok && ch.value === item.charge;
        if (!ok) {
          if (cfg.atomFeedback) msg = atomIdentifyMsg(item);
          else if (!cfg.detailed) msg = generic;
          else if (!el) msg = "Écris le symbole d'un atome du tableau périodique (attention aux majuscules et aux minuscules).";
          else if (el.z !== item.z) msg = "Ce n'est pas le bon atome : le nombre de protons du noyau donne le numéro atomique.";
          else if (!ch.ok) msg = "Écris la charge avec le chiffre puis le signe, par exemple 2" + pos('+') + " (ou juste le signe pour une charge de 1).";
          else msg = "L'atome est le bon, mais pas la charge. Compare les protons et les électrons : moins d'électrons que de protons, l'ion est " +
            pos('positif') + ' ; plus d\'électrons que de protons, il est ' + neg('négatif') + '.';
        }
      }

      if (ok) {
        solved = true; score.correct++; score.total++; updateScore();
        if (cfg.atomFeedback) {
          var lbl = "l'atome " + deName(x.el) + ' (' + x.el.symbol + ')';
          if (type === 'identify') setFeedback('Il s\'agit bien de ' + lbl + ' car il a bien ' + x.p + ' proton' + (x.p > 1 ? 's' : '') + '.', 'success');
          else setFeedback('Bravo, tu as construit ' + lbl + ' !', 'success');
        } else if (!ions) setFeedback('Bravo, bonne réponse !', 'success');
        else if (type === 'construct') setFeedback("Bravo, tu as construit l'ion " + ionHTML(x.el, item.charge) + ' !', 'success');
        else setFeedback("Bravo, c'est bien l'ion " + ionHTML(x.el, item.charge) + " : l'atome " + deName(x.el) +
          ' qui a ' + changeHTML(item.charge) + '.', 'success');
        confetti(els.validate);
        els.validate.disabled = true;
        if (els.sym) els.sym.disabled = true;
        els.skip.textContent = 'Question suivante';
        show(els.skip, true, 'inline-block');
        if (cfg.expert) {
          els.skip.textContent = cfg.expert.nextLabel || 'Question suivante';
          if (cfg.expert.onSolved) cfg.expert.onSolved(!failed);
        }
      } else {
        failed = true;
        setFeedback(msg, 'error');
        if (cfg.expert) els.skip.textContent = 'Autre question';
        show(els.skip, true, 'inline-block');
      }
    }

    function onSkip() {
      if (revealing) return;
      if (cfg.expert) {                          // Expert : pas de solution, seulement une autre question du même type
        if (solved) { if (cfg.expert.onNext) cfg.expert.onNext(); } else next();
        return;
      }
      if (solved) { next(); return; }
      revealing = true;
      score.total++; updateScore();
      els.validate.disabled = true; els.skip.disabled = true;
      var x = expected(item);
      clearBuilt();
      if (type === 'construct') ctrl.setCounts(x.p, x.n, x.e);
      else {
        els.sym.value = x.el.symbol; onSymbolInput(); els.sym.disabled = true;
        if (els.chg) {
          els.chg.value = item.charge ? (Math.abs(item.charge) > 1 ? Math.abs(item.charge) : '') + (item.charge > 0 ? '+' : MINUS) : '';
          paintCharge();
        }
      }
      setFeedback('Voici la bonne réponse : ' + (ions ? ionHTML(x.el, item.charge) : x.el.symbol) + '.', 'reveal');
      timer = setTimeout(next, 3000);
    }

    function init() {
      root = $(cfg.sectionId);
      if (!root) return;
      root.innerHTML = tpl();
      var g = function (s) { return $(p + '-' + s); };
      els = {
        score: g('score'), instr: g('instruction'), build: g('build'), identify: g('identify'),
        target: g('target'), sentence: g('sentence'), inuc: g('inucleus'), iel: g('ielectrons'),
        sym: g('sym'), chg: g('chg'), keypad: g('keypad'), amass: g('amass'), az: g('az'), built: g('built'),
        feedback: g('feedback'), validate: g('validate'), skip: g('skip'), ptover: g('ptover')
      };

      ctrl = K.createAtomController({
        nucleusEl: g('nucleus'), electronsEl: g('electrons'),
        protonBtn: g('bp'), neutronBtn: g('bn'), electronBtn: g('be'),
        limitMsgEl: g('limit'), showHelpers: !!cfg.shake, onChange: clearBuilt
      });
      g('bp').addEventListener('click', function () { ctrl.add('proton'); });
      g('bn').addEventListener('click', function () { ctrl.add('neutron'); });
      g('be').addEventListener('click', function () { ctrl.add('electron'); });
      g('clear').addEventListener('click', function () { ctrl.reset(); });

      els.sym.addEventListener('input', onSymbolInput);
      if (els.chg) {
        g('keypad').addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('[data-k]') : null;
          if (b) keyPress(b.getAttribute('data-k'));
        });
        els.chg.addEventListener('keydown', function (e) {    // clavier physique
          var k = e.key;
          if (/^[0-9]$/.test(k) || k === '+') keyPress(k);
          else if (k === '-' || k === MINUS) keyPress('-');
          else if (k === 'Backspace') keyPress('del');
          else return;
          e.preventDefault();
        });
      }

      g('ptbtn').addEventListener('click', function () {
        window.PeriodicTable.renderView(g('ptview'), 18);
        els.ptover.style.display = 'flex';
      });
      g('ptclose').addEventListener('click', function () { els.ptover.style.display = 'none'; });
      window.PeriodicTable.wireOverlay(els.ptover);

      els.validate.addEventListener('click', onValidate);
      els.skip.addEventListener('click', onSkip);
      g('back').addEventListener('click', function () { clearTimeout(timer); window.App.showScreen(cfg.backTo); });
      updateScore();
    }

    document.addEventListener('DOMContentLoaded', init);
    return {
      start: function () { if (root) next(); },
      startExpert: function (spec) { if (root) { forced = spec; lastType = null; next(); } },
      setTop: function (t) { if (els.score) els.score.textContent = t; },
      hooks: cfg.expert || null
    };
  }

  var ionEx = createQuiz({
    sectionId: 'screen-ion-exercice', prefix: 'ionx', title: "S'exercer avec les ions", backTo: 'screen-mode2',
    pool: EX_IONS, ions: true, shake: true, detailed: true, sentence: true, skipAlways: false
  });
  var atomEx = createQuiz({
    sectionId: 'screen-atom-exercice', prefix: 'atx', title: "S'exercer avec les atomes", backTo: 'screen-mode2',
    pool: ATOMS, ions: false, shake: true, detailed: false, atomFeedback: true, sentence: false, skipAlways: false
  });
  var expertQuiz = createQuiz({
    sectionId: 'screen-atom-expert-q', prefix: 'axq', title: 'Mode Expert', backTo: 'screen-atom-challenge',
    pool: ATOMS, ions: false, shake: false, detailed: false, sentence: false, skipAlways: false, expert: {}
  });
  var ch1 = createQuiz({
    sectionId: 'screen-atom-ch1', prefix: 'ch1', title: 'Challenge : atomes neutres', backTo: 'screen-atom-challenge',
    pool: ATOMS, ions: false, shake: true, detailed: false, sentence: false, skipAlways: false
  });
  var ch2 = createQuiz({
    sectionId: 'screen-atom-ch2', prefix: 'ch2', title: 'Challenge : les ions', backTo: 'screen-atom-challenge',
    pool: CH2_IONS, ions: true, shake: false, detailed: false, sentence: false, skipAlways: false
  });

  // ---------- Navigation ----------
  function go(btnId, screenId, startFn) {
    var b = $(btnId);
    if (b) b.addEventListener('click', function () { window.App.showScreen(screenId); if (startFn) startFn(); });
  }
  document.addEventListener('DOMContentLoaded', function () {
    go('btn-atom-exercice-nav', 'screen-atom-exercice', atomEx.start);
    go('btn-ion-cours-nav', 'screen-ion-cours', IonCours.start);
    go('btn-ion-exercice-nav', 'screen-ion-exercice', ionEx.start);
    go('btn-atom-challenge', 'screen-atom-challenge');
    go('btn-ach-lvl1', 'screen-atom-ch1', ch1.start);
    go('btn-ach-lvl2', 'screen-atom-ch2', ch2.start);
    go('btn-back-to-mode2-ion', 'screen-mode2');
    go('btn-back-to-mode2-ch', 'screen-mode2');
  });

  window.Ions = { expert: expertQuiz, pools: { atoms: ATOMS, ions: CH2_IONS }, atomExercice: atomEx, cours: IonCours, exercice: ionEx, challenge1: ch1, challenge2: ch2 };
})();
