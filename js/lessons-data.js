// lessons-data.js
// Contenu du mode Leçons. Une leçon se déroule sur l'écran d'un labo existant (host) :
//   start()        : remet le labo à zéro au début de la leçon
//   state()        : état du labo, transmis aux vérifications des consignes
//   steps          : consignes, de quatre sortes
//     { title, text }                          explication seule
//     { title, text, quiz: { q, choices, answer (indice dans choices), explain } }
//     { title, text, task, check(state, ctx), hold }  manipulation vérifiée automatiquement
//                                               (hold : durée en ms pendant laquelle la réussite doit durer, pour laisser observer)
//     { title, text, task, form: { fields: [{ key, label, expect(ctx) }] } }   valeurs à écrire
//   (setup(ctx) : appelé au début de la consigne ; cls : classe posée sur <body> pendant la consigne ;
//    prep(ctx) : remet le labo dans l'état de départ quand on reprend la consigne depuis la liste des étapes)
//   memo()         : fiche « À retenir » de fin de leçon
//   train          : { label, screen, start } entraînement proposé avec la leçon
// Une leçon « tuto » (tuto: true) lance un tutoriel existant qui signale lui-même sa fin (Lessons.tutoDone).
window.LessonsData = (function () {
  'use strict';

  var GROUPS = [
    { name: 'La matière', level: '4e' },
    { name: 'Molécules et transformations', level: '4e' },
    { name: 'Atomes et ions', level: '3e' }
  ];

  // ---------- Petites aides ----------
  function countsIs(c, want) {
    var a = Object.keys(c).filter(function (k) { return c[k] > 0; }), b = Object.keys(want);
    return a.length === b.length && b.every(function (k) { return c[k] === want[k]; });
  }
  function has(list, x) { return list.indexOf(x) >= 0; }
  function tested(s, ion, test, result) {
    return s.history.some(function (h) { return h.ion === ion && h.test === test && h.result === result; });
  }
  function sub(f) { return window.Molecules.formatSubscripts(f); }
  function ion(sym, c) { return sym + window.AtomKit.chargeSup(c); }
  function cell(z) { return '<div class="atom-cell lesson-cell">' + window.AtomKit.cellHTML(window.Units.getByZ(z), 0) + '</div>'; }
  // Blocs « À retenir » déjà présents dans un labo
  function blocks(sel) {
    return Array.prototype.map.call(document.querySelectorAll(sel), function (b) { return b.outerHTML; }).join('');
  }
  function memo(title, html) { return '<div class="st-memo"><h3 class="st-memo__h">' + title + '</h3>' + html + '</div>'; }
  function qcm(title, cats) {
    return { label: 'Questions sur ' + title, screen: 'screen-qcm', start: function () { window.Qcm.startTraining(title.charAt(0).toUpperCase() + title.slice(1), cats); } };
  }
  function atom() { return window.AtomCours.ctrl().getCounts(); }
  function gas() { window.PistonLab.choose('gas'); }
  function newPhrase() { window.EquationsCours.startNewReaction(); }
  function freshLab() { window.Lab.free.start(); }

  // Échelle de pH avec quelques solutions de la vie courante
  var PH_SCALE = '<div class="ph-scale ph-scale--subs">' +
    [['Citron', 2], ['Eau pure', 7], ['Savon', 10], ['Soude', 13]].map(function (s) {
      return '<span class="ph-mark" style="left:' + (s[1] / 14 * 100).toFixed(1) + '%">' + s[0] + '</span>';
    }).join('') +
    '<div class="ph-bar"></div><div class="ph-ticks"><span>0</span><span>7</span><span>14</span></div>' +
    '<div class="ph-zones"><span class="ph-z--acid">Acide</span><span class="ph-z--neutral">Neutre</span><span class="ph-z--base">Basique</span></div></div>';
  var PH_SCALE_PLAIN = '<div class="ph-scale ph-scale--memo"><div class="ph-bar"></div><div class="ph-ticks"><span>0</span><span>7</span><span>14</span></div>' +
    '<div class="ph-zones"><span class="ph-z--acid">Acide</span><span class="ph-z--neutral">Neutre</span><span class="ph-z--base">Basique</span></div></div>';

  var FIRE_SVG = '<svg class="lesson-fire" viewBox="0 0 200 150" aria-hidden="true">' +
    '<path d="M100 14L184 136H16z" fill="#FFE3D6" stroke="#D9463B" stroke-width="4" stroke-linejoin="round"/>' +
    '<text x="100" y="98" text-anchor="middle" font-size="30">🔥</text>' +
    '<text x="34" y="78" text-anchor="end" font-size="12" font-weight="800" fill="#1F2A36">Combustible</text>' +
    '<text x="166" y="78" font-size="12" font-weight="800" fill="#1F2A36">Comburant</text>' +
    '<text x="100" y="150" text-anchor="middle" font-size="12" font-weight="800" fill="#1F2A36">Source de chaleur</text></svg>';

  var L = [
    // ================= 1. Changements d'état =================
    {
      id: 'etats', group: 0, color: 'r1', title: 'Les changements d\'état', sub: 'Solide, liquide, gaz : chauffer et refroidir l\'eau',
      host: 'screen-states', start: function () { window.States.start(); }, state: function () { return window.States.state(); },
      steps: [
        { title: 'Les trois états de la matière', text: 'La matière existe sous trois états : <b>solide</b>, <b>liquide</b> et <b>gazeux</b>. Dans ce labo, on étudie l\'eau.',
          task: 'Mets de l\'eau à l\'état solide dans le bécher.',
          check: function (s) { if (s.cur && s.cur !== 'solid') { window.States.start(); return false; } return s.cur === 'solid'; } },
        { title: 'La fusion', text: 'Quand on chauffe un solide, il devient liquide : c\'est la <b class="st-red">fusion</b>.',
          task: 'Chauffe la glace pour la faire fondre.', prep: function () { window.States.pick('solid'); }, check: function (s) { return !s.busy && s.last === 'Fusion'; } },
        { title: 'La vaporisation', text: 'Quand on chauffe un liquide, il devient gazeux : c\'est la <b class="st-red">vaporisation</b>.',
          task: 'Continue de chauffer pour obtenir de la vapeur d\'eau.', prep: function () { window.States.pick('liquid'); }, check: function (s) { return !s.busy && s.last === 'Vaporisation'; } },
        { title: 'La liquéfaction', text: 'Quand on refroidit un gaz, il redevient liquide : c\'est la <b class="st-blue">liquéfaction</b>.',
          task: 'Refroidis la vapeur d\'eau.', prep: function () { window.States.pick('gas'); }, check: function (s) { return !s.busy && s.last === 'Liquéfaction'; } },
        { title: 'La solidification', text: 'Quand on refroidit un liquide, il devient solide : c\'est la <b class="st-blue">solidification</b>.',
          task: 'Refroidis l\'eau liquide pour obtenir de la glace.', prep: function () { window.States.pick('liquid'); }, check: function (s) { return !s.busy && s.last === 'Solidification'; } },
        { title: 'La représentation microscopique', text: 'Pour représenter la matière à l\'échelle microscopique, on utilise des symboles simples : ici, <b>un triangle représente une molécule d\'eau</b>. Un corps pur n\'utilise qu\'un seul type de symbole, et la disposition des symboles dépend de l\'état de la matière.',
          task: 'Passe en mode microscopique et observe les molécules de la glace.', hold: 3000, prep: function () { window.States.pick('solid'); },
          check: function (s) { return s.micro && s.cur === 'solid' && !s.busy; } },
        { title: 'L\'état solide', text: 'Tu viens d\'observer les molécules de la glace.',
          quiz: { q: 'À l\'état solide, les molécules sont :', choices: ['serrées et rangées', 'serrées mais désordonnées', 'très écartées et agitées'], answer: 0 } },
        { title: 'Observer le liquide', text: 'Reste en mode microscopique pendant la fusion.',
          task: 'Chauffe la glace et observe les molécules de l\'eau liquide.', hold: 3000, prep: function () { window.States.pick('solid'); },
          check: function (s) { return s.micro && s.cur === 'liquid' && !s.busy; } },
        { title: 'L\'état liquide', text: 'Tu viens d\'observer les molécules de l\'eau liquide.',
          quiz: { q: 'À l\'état liquide, les molécules sont :', choices: ['serrées et rangées', 'serrées mais désordonnées', 'très écartées et agitées'], answer: 1 } },
        { title: 'Observer le gaz', text: 'Reste en mode microscopique pendant la vaporisation.',
          task: 'Chauffe l\'eau liquide et observe les molécules de la vapeur d\'eau.', hold: 3000, prep: function () { window.States.pick('liquid'); },
          check: function (s) { return s.micro && s.cur === 'gas' && !s.busy; } },
        { title: 'L\'état gazeux', text: 'Tu viens d\'observer les molécules de la vapeur d\'eau.',
          quiz: { q: 'À l\'état gazeux, les molécules sont :', choices: ['serrées et rangées', 'serrées mais désordonnées', 'très écartées et agitées'], answer: 2 } },
        { title: 'Le nombre de molécules', text: 'Compare le nombre de triangles dans les trois états.',
          quiz: { q: 'Pendant un changement d\'état, le nombre de molécules :', choices: ['augmente', 'reste le même', 'diminue'], answer: 1,
            explain: 'Les molécules ne disparaissent pas et n\'apparaissent pas : elles changent seulement de disposition.' } }
      ],
      memo: function () { return blocks('#st-overlay .st-memo'); },
      train: qcm('les changements d\'état', ['etats', 'micro'])
    },

    // ================= 2. Températures de changement d'état =================
    {
      id: 'temperatures', group: 0, color: 'r2', title: 'Températures de changement d\'état', sub: 'Le palier du corps pur, la courbe d\'un mélange',
      host: 'screen-temp', start: function () { window.TempLab.start('free'); }, state: function () { return window.TempLab.state(); },
      steps: [
        { title: 'Le labo des températures', text: 'Dans ce labo, tu chauffes ou refroidis une substance avec le curseur, et le graphique trace l\'évolution de sa température.',
          task: 'Appuie sur « Choisir une substance » et choisis l\'eau dans les corps purs.', check: function (s) { return s.sub === 'Eau'; } },
        { title: 'Refroidir l\'eau', text: 'Glisse le curseur côté bleu pour refroidir. Observe bien la courbe pendant que l\'eau se transforme en glace.',
          task: 'Refroidis l\'eau jusqu\'à ce qu\'elle soit entièrement solide.', prep: function () { window.TempLab.choose('Eau'); }, check: function (s) { return s.sub === 'Eau' && has(s.labs, 'Solidification'); } },
        { title: 'Le palier', text: 'Pendant la solidification, la courbe devient horizontale : on appelle cela un <b>palier</b>.',
          quiz: { q: 'Pendant la solidification de l\'eau pure, la température :', choices: ['continue de baisser', 'reste constante, à 0 °C', 'augmente'], answer: 1 } },
        { title: 'Chauffer l\'eau', text: 'Glisse maintenant le curseur côté rouge pour chauffer.',
          task: 'Chauffe l\'eau jusqu\'à ce qu\'elle se vaporise.', prep: function () { window.TempLab.choose('Eau'); }, check: function (s) { return s.sub === 'Eau' && has(s.labs, 'Vaporisation'); } },
        { title: 'L\'ébullition de l\'eau', text: 'Regarde la hauteur du deuxième palier sur la courbe.',
          quiz: { q: 'À quelle température l\'eau pure se vaporise-t-elle ?', choices: ['0 °C', '50 °C', '100 °C'], answer: 2 } },
        { title: 'Un mélange', text: 'L\'eau salée est un <b>mélange</b> : elle contient plusieurs types de molécules.',
          task: 'Choisis l\'eau salée dans les mélanges, puis refroidis-la jusqu\'à ce qu\'elle devienne solide.',
          check: function (s) { return s.mix && has(s.labs, 'Solidification'); } },
        { title: 'La courbe du mélange', text: 'Compare cette courbe avec celle de l\'eau pure.',
          quiz: { q: 'Pendant la solidification de l\'eau salée, la température :', choices: ['reste constante', 'continue de baisser : il n\'y a pas de palier', 'augmente'], answer: 1 } },
        { title: 'Reconnaître un corps pur', text: 'Tu as observé un corps pur et un mélange.',
          quiz: { q: 'Un palier sur la courbe de température permet de reconnaître :', choices: ['un corps pur', 'un mélange', 'un gaz'], answer: 0 } }
      ],
      memo: function () { return blocks('#tp-memo .st-memo'); },
      train: { label: 'Identifier une substance inconnue', screen: 'screen-temp', start: function () { window.TempLab.start('exp'); } }
    },

    // ================= 3. Propriétés des gaz =================
    {
      id: 'gaz', group: 0, color: 'r3', title: 'Les propriétés des gaz', sub: 'Compressibilité, extensibilité, dilatation et contraction thermique',
      host: 'screen-piston', start: function () { window.PistonLab.start(); }, state: function () { return window.PistonLab.state(); },
      steps: [
        { title: 'Le cylindre à piston', text: 'Ce cylindre est fermé par un piston que l\'on peut pousser ou tirer. Le curseur à gauche chauffe (en haut) ou refroidit (en bas).',
          task: 'Remplis le cylindre de gaz.', check: function (s) { return s.sub === 'gas'; } },
        { title: 'La compressibilité', text: 'Une matière est <b>compressible</b> si l\'on peut diminuer son volume en appuyant dessus.',
          task: 'Pousse le piston vers le bas pour comprimer le gaz.', prep: gas, check: function (s) { return s.sub === 'gas' && !s.cond && s.ph < s.ref - 20; } },
        { title: 'L\'extensibilité', text: 'Une matière est <b>extensible</b> si l\'on peut augmenter son volume en tirant dessus.',
          task: 'Tire le piston vers le haut pour étendre le gaz.', prep: gas, check: function (s) { return s.sub === 'gas' && s.ph > s.ref + 20; } },
        { title: 'La dilatation thermique', text: 'Une matière se <b>dilate</b> quand son volume augmente sous l\'effet de la chaleur.',
          task: 'Lâche le piston, puis chauffe le gaz et observe le piston.', prep: gas, check: function (s) { return s.sub === 'gas' && !s.drag && s.tau > .65 && s.ph > s.ref + 10; } },
        { title: 'La contraction thermique', text: 'Une matière se <b>contracte</b> quand son volume diminue parce qu\'elle refroidit.',
          task: 'Refroidis le gaz et observe le piston.', prep: gas, check: function (s) { return s.sub === 'gas' && !s.drag && s.tau < .2 && s.ph < s.ref - 8; } },
        { title: 'Liquéfier un gaz', text: 'Si l\'on rapproche assez les molécules d\'un gaz, il devient liquide : c\'est la <b>liquéfaction</b>.',
          task: 'Refroidis encore le gaz, ou comprime-le très fort, jusqu\'à ce qu\'il devienne liquide.', prep: gas, check: function (s) { return s.sub === 'gas' && s.cond; } },
        { title: 'Et les liquides ?', text: 'Voyons si un liquide se comporte comme un gaz.',
          task: 'Remplis le cylindre de liquide et essaie de pousser le piston.', check: function (s) { return s.sub === 'liquid' && s.tried; } },
        { title: 'Le liquide', text: 'Le piston n\'a pas bougé.',
          quiz: { q: 'Un liquide est-il compressible ?', choices: ['Oui', 'Non'], answer: 1,
            explain: 'Les molécules d\'un liquide sont déjà serrées les unes contre les autres : on ne peut pas les rapprocher.' } },
        { title: 'Le solide', text: 'Pense à la disposition des molécules dans un solide.',
          quiz: { q: 'Un solide est :', choices: ['compressible', 'extensible', 'ni compressible ni extensible'], answer: 2 } }
      ],
      memo: function () { return document.getElementById('pi-memo-body').innerHTML; },
      train: qcm('les propriétés des gaz', ['gaz'])
    },

    // ================= 4. Atomes et molécules =================
    {
      id: 'molecules', group: 1, color: 'b2', title: 'Atomes et molécules', sub: 'Construire des molécules et écrire leur formule chimique',
      host: 'screen-mode1-1', start: function () { window.App.sandbox().clearAll(); }, state: function () { return window.App.sandbox().getCounts(); },
      steps: [
        { title: 'Molécules et atomes', text: 'Une <b>molécule</b> est une particule microscopique qui constitue la matière. Chaque molécule est faite d\'<b>atomes</b> liés entre eux.<br><br>Un <b>atome</b> est indivisible. Les atomes sont classés dans le <b>tableau périodique</b> : chaque atome a un nom et un <b>symbole</b> (H pour l\'hydrogène, O pour l\'oxygène…).' },
        { title: 'La molécule d\'eau', text: 'Fais glisser (ou touche) les atomes du tableau pour les poser dans la zone de construction.',
          task: 'Construis une molécule d\'eau : 2 atomes d\'hydrogène et 1 atome d\'oxygène.',
          setup: function () { window.App.sandbox().clearAll(); }, check: function (c) { return countsIs(c, { H: 2, O: 1 }); } },
        { title: 'La formule chimique', text: 'Pour écrire la <b>formule chimique</b> d\'une molécule, on écrit le symbole de chaque atome et, en bas à droite, le nombre de fois où il est présent (on n\'écrit rien s\'il n\'y en a qu\'un). La molécule d\'eau s\'écrit donc <b>H' + '₂' + 'O</b>.',
          quiz: { q: 'Dans la molécule de formule CO' + '₂' + ', combien y a-t-il d\'atomes d\'oxygène ?', choices: ['1', '2', '3'], answer: 1 } },
        { title: 'Le dioxyde de carbone', text: 'Utilise la formule pour savoir quels atomes poser.',
          task: 'Construis la molécule de dioxyde de carbone, de formule CO' + '₂' + '.',
          setup: function () { window.App.sandbox().clearAll(); }, check: function (c) { return countsIs(c, { C: 1, O: 2 }); } },
        { title: 'Le méthane', text: 'Le méthane est le gaz utilisé dans les cuisinières.',
          task: 'Construis la molécule de méthane, de formule CH' + '₄' + '.',
          setup: function () { window.App.sandbox().clearAll(); }, check: function (c) { return countsIs(c, { C: 1, H: 4 }); } },
        { title: 'Attention à l\'écriture', text: 'Une formule s\'écrit avec précision : la moindre modification change son sens.',
          quiz: { q: 'Que désigne l\'écriture <b>Co</b> ?', choices: ['l\'atome de cobalt', 'une molécule faite d\'un carbone et d\'un oxygène', 'deux atomes de carbone'], answer: 0,
            explain: 'Co (une majuscule puis une minuscule) est le symbole du cobalt. CO (deux majuscules) est une molécule : 1 atome de carbone et 1 atome d\'oxygène.' } },
        { title: 'Corps pur et mélange', text: 'Un <b>corps pur</b> ne contient qu\'un seul type de molécule. Un <b>mélange</b> contient plusieurs types de molécules.',
          quiz: { q: 'L\'air contient du diazote, du dioxygène et du dioxyde de carbone. C\'est :', choices: ['un corps pur', 'un mélange'], answer: 1 } }
      ],
      memo: function () {
        return memo('Molécules et atomes', '<p>Une <b>molécule</b> est une particule microscopique qui constitue la matière : elle est faite d\'<b>atomes</b> liés entre eux.</p><p>Un <b>atome</b> est indivisible. Les atomes sont classés dans le tableau périodique ; chacun a un nom et un symbole.</p>') +
          memo('La formule chimique', '<p>On écrit les symboles des atomes de la molécule et, en bas à droite de chacun, le nombre de fois où il est présent (rien s\'il n\'y en a qu\'un).</p><p>Exemples : H' + '₂' + 'O (eau), CO' + '₂' + ' (dioxyde de carbone), CH' + '₄' + ' (méthane).</p><p class="st-memo__note">Attention aux majuscules : Co est l\'atome de cobalt, CO est une molécule.</p>') +
          memo('Corps pur et mélange', '<p>Un <b>corps pur</b> contient un seul type de molécule ; un <b>mélange</b> en contient plusieurs.</p>');
      },
      train: { label: 'Identifier et construire des molécules', screen: 'screen-exercise1-2', start: function () { window.Exercise.startTraining(); } }
    },

    // ================= 5. La transformation chimique =================
    {
      id: 'transformation', group: 1, color: 'b3', title: 'La transformation chimique', sub: 'Réactifs, produits, équation chimique et combustion',
      host: 'screen-equations-cours', start: function () { window.EquationsCours.startNewReaction(); }, state: function () { return window.EquationsCours.state(); },
      steps: [
        { title: 'Transformation chimique', text: 'Il y a une <b>transformation chimique</b> lorsqu\'on ne retrouve pas les mêmes molécules entre l\'<b>état initial</b> et l\'<b>état final</b>. On parle aussi de réaction chimique.<br><br>Exemple : le sucre chauffé donne du carbone et de l\'eau.<br>Contre-exemple : la glace qui fond reste de l\'eau, c\'est une transformation physique.' },
        { title: 'Physique ou chimique ?', text: 'Applique la définition.',
          quiz: { q: 'Du bicarbonate de soude versé dans du vinaigre fait apparaître un gaz. C\'est une transformation :', choices: ['physique', 'chimique'], answer: 1 } },
        { title: 'Les réactifs', text: 'Les <b class="eq-hl-green">réactifs</b> sont les substances présentes à l\'état initial : on les mélange pour démarrer la transformation.',
          task: 'Clique sur les réactifs dans la phrase.', prep: newPhrase, check: function (s) { return s.step > 1 || s.reactifs; } },
        { title: 'Les produits', text: 'Les <b class="eq-hl-red">produits</b> sont les substances obtenues à l\'état final.',
          task: 'Appuie sur « Suivant », puis clique sur les produits.', prep: newPhrase, check: function (s) { return s.step > 2 || (s.step === 2 && s.produits); } },
        { title: 'L\'équation chimique', text: 'Une transformation s\'écrit avec une <b>équation chimique</b> : réactifs → produits. On remplace les noms par les formules chimiques ; le catalogue des substances t\'aide à les trouver.',
          task: 'Appuie sur « Suivant », écris les formules des substances, puis valide.', prep: newPhrase, check: function (s) { return s.solved; } },
        { title: 'La conservation des atomes', text: 'Pendant une transformation chimique, les atomes des réactifs se réarrangent pour former les produits, mais ils sont <b>conservés</b> : on retrouve les mêmes atomes des deux côtés de l\'équation.<br><br>C\'est le principe de Lavoisier : « Rien ne se perd, rien ne se crée, tout se transforme ».' },
        { title: 'La combustion', text: 'Une <b>combustion</b> est une transformation chimique qui libère beaucoup de chaleur. Il lui faut trois éléments, réunis dans le <b>triangle du feu</b> :<br>• un <b>combustible</b>, la matière qui brûle ;<br>• un <b>comburant</b>, le dioxygène de l\'air ;<br>• une <b>source de chaleur</b>, pour démarrer la réaction.' + FIRE_SVG },
        { title: 'Le comburant', text: 'Le méthane brûle dans une cuisinière.',
          quiz: { q: 'Dans la combustion du méthane, le dioxygène est :', choices: ['le combustible', 'le comburant', 'la source de chaleur'], answer: 1 } },
        { title: 'Éteindre un feu', text: 'Pour arrêter une combustion, on supprime l\'un des trois éléments du triangle du feu.',
          quiz: { q: 'Étouffer un feu avec une couverture le prive :', choices: ['du combustible', 'du comburant (l\'air)', 'de la chaleur'], answer: 1 } }
      ],
      memo: function () {
        return memo('La transformation chimique', '<p>Il y a transformation chimique lorsqu\'on ne retrouve pas les mêmes molécules entre l\'<b>état initial</b> et l\'<b>état final</b>.</p><p>Les <b class="eq-hl-green">réactifs</b> sont consommés, les <b class="eq-hl-red">produits</b> sont formés.</p>') +
          memo('L\'équation chimique', '<p class="lesson-eq">Réactif 1 + Réactif 2 → Produit 1 + Produit 2</p><p>Les atomes sont <b>conservés</b> : rien ne se perd, rien ne se crée, tout se transforme (Lavoisier).</p>') +
          memo('La combustion', '<p>Transformation chimique qui libère beaucoup de chaleur. Il faut un <b>combustible</b>, un <b>comburant</b> (le dioxygène) et une <b>source de chaleur</b> : c\'est le triangle du feu.</p>');
      },
      train: { label: 'Écrire des équations chimiques', screen: 'screen-equations-exercice', start: function () { window.EquationsExercice.start(); } }
    },

    // ================= 6. Équilibrer une équation (tutoriel existant) =================
    {
      id: 'equilibrer', group: 1, color: 'b4', title: 'Équilibrer une équation', sub: 'Les coefficients et la conservation des atomes',
      tuto: true, host: 'screen-balance', start: function () { window.Balance.start(); },
      memo: function () {
        return memo('Équilibrer une équation', '<p>On place des <b>coefficients</b> devant les formules pour avoir, <b>au total</b>, les mêmes atomes dans l\'état initial et dans l\'état final.</p><p class="lesson-eq">2 H' + '₂' + ' + O' + '₂' + ' → 2 H' + '₂' + 'O</p><p class="st-memo__note">Le coefficient 1 ne s\'écrit pas. On utilise les plus petits coefficients possibles.</p>');
      },
      train: { label: 'Équilibrer des équations', screen: 'screen-balance-exercice', start: function () { window.BalanceExercise.start(); } }
    },

    // ================= 7. L'atome =================
    {
      id: 'atome', group: 2, color: 'k1', title: 'L\'atome', sub: 'Protons, neutrons, électrons et écriture conventionnelle',
      host: 'screen-atom-cours', start: function () { window.AtomCours.reset(); }, state: atom,
      steps: [
        { title: 'L\'atome', text: 'Un <b>atome</b> est une particule microscopique qui constitue les molécules. Il est indivisible. On connaît aujourd\'hui <b>118 types d\'atomes</b>, classés dans le <b>tableau périodique des éléments</b>.' },
        { title: 'Le noyau et les protons', text: 'Au centre de l\'atome se trouve le <b>noyau</b>. Il contient des <b>protons</b>, des particules de charge <span class="ion-pos">positive (+)</span>.',
          task: 'Ajoute un proton.', setup: function () { window.AtomCours.reset(); }, check: function (c) { return c.protons === 1; } },
        { title: 'Le nom de l\'atome', text: 'Avec un seul proton, c\'est un atome d\'hydrogène ! Un atome est nommé en fonction de son <b>nombre de protons</b>.',
          task: 'Ajoute des protons jusqu\'à obtenir un atome d\'oxygène.', prep: function () { window.AtomCours.ctrl().setCounts(1, 0, 0); }, check: function (c) { return c.protons === 8; } },
        { title: 'Les neutrons', text: 'Le noyau contient aussi des <b>neutrons</b>, des particules neutres (sans charge). Tant que le noyau n\'a pas le bon nombre de neutrons, il tremble.<br><br>Les protons et les neutrons du noyau s\'appellent les <b>nucléons</b>.',
          task: 'Ajoute des neutrons jusqu\'à ce que le noyau de l\'atome d\'oxygène ne tremble plus.', prep: function () { window.AtomCours.ctrl().setCounts(8, 0, 0); }, check: function (c) { return c.protons === 8 && c.neutrons === 8; } },
        { title: 'Les électrons', text: 'Autour du noyau se trouvent les <b>électrons</b>, des particules de charge <span class="ion-neg">négative (−)</span>.<br><br>Un atome est <b>électriquement neutre</b> : il a autant de charges positives que de charges négatives, donc <b>autant de protons que d\'électrons</b>.',
          task: 'Ajoute des électrons pour que l\'atome d\'oxygène soit neutre.', prep: function () { window.AtomCours.ctrl().setCounts(8, 8, 0); }, check: function (c) { return c.protons === 8 && c.neutrons === 8 && c.electrons === 8; } },
        { title: 'L\'écriture conventionnelle', text: 'Chaque case du tableau périodique donne l\'<b>écriture conventionnelle</b> d\'un atome : son nom, son <b>symbole</b>, le nombre de <b>nucléons</b> en haut et le nombre de <b>protons</b> en bas (c\'est aussi son <b>numéro atomique</b>).' + cell(8) +
          'Pour l\'oxygène : 16 nucléons et 8 protons.' },
        { title: 'L\'atome de lithium', text: 'Voici l\'écriture conventionnelle du lithium :' + cell(3) +
          '• protons : le nombre du bas ;<br>• électrons : autant que de protons, car l\'atome est neutre ;<br>• neutrons : les nucléons sans les protons (nombre du haut − nombre du bas).',
          task: 'Construis l\'atome de lithium d\'après son écriture conventionnelle.', setup: function () { window.AtomCours.reset(); },
          check: function (c) { return c.protons === 3 && c.neutrons === 4 && c.electrons === 3; } },
        { title: 'Le sens inverse', text: 'Cette fois, l\'atome est déjà construit : compte ses particules pour trouver son écriture conventionnelle. Le tableau périodique t\'aide à trouver son symbole.',
          task: 'Écris l\'écriture conventionnelle de l\'atome construit.', cls: 'lesson-atom-hidden',
          setup: function (ctx) {
            var el = window.Units.getByZ([5, 6, 7, 9, 10, 11, 12, 13][Math.floor(Math.random() * 8)]);
            ctx.el = el;
            window.AtomCours.ctrl().setCounts(el.z, el.mass - el.z, el.z);
          },
          form: { table: true, fields: [
            { key: 'sym', label: 'Symbole', expect: function (ctx) { return ctx.el.symbol; } },
            { key: 'a', label: 'Nombre du haut (nucléons)', expect: function (ctx) { return String(ctx.el.mass); }, num: true },
            { key: 'z', label: 'Nombre du bas (protons)', expect: function (ctx) { return String(ctx.el.z); }, num: true }
          ] } }
      ],
      memo: function () {
        return memo('L\'atome', '<p>Particule microscopique qui constitue les molécules. Il est indivisible ; on en connaît 118 types, classés dans le tableau périodique.</p>') +
          memo('Sa composition', '<p>Un <b>noyau</b> qui contient des <b>protons</b> (charge <span class="ion-pos">+</span>) et des <b>neutrons</b> (neutres) : ce sont les <b>nucléons</b>.</p><p>Des <b>électrons</b> (charge <span class="ion-neg">−</span>) autour du noyau.</p>') +
          memo('Ses propriétés', '<p>Un atome est <b>électriquement neutre</b> : autant de protons que d\'électrons.</p><p>Un atome est nommé en fonction de son <b>nombre de protons</b>.</p>') +
          memo('L\'écriture conventionnelle', '<div class="lesson-memo-row">' + cell(3) + '<p>En haut : le nombre de <b>nucléons</b>.<br>En bas : le nombre de <b>protons</b> (numéro atomique).<br>Électrons = protons.<br>Neutrons = nucléons − protons.</p></div>');
      },
      train: { label: 'Construire et identifier des atomes', screen: 'screen-atom-exercice', start: function () { window.Ions.atomExercice.start(); } }
    },

    // ================= 8. Les ions (tutoriel existant) =================
    {
      id: 'ions', group: 2, color: 'k2', title: 'Les ions', sub: 'Un atome qui a gagné ou perdu des électrons',
      tuto: true, host: 'screen-ion-cours', start: function () { window.Ions.cours.start(); },
      train: { label: 'Construire et identifier des ions', screen: 'screen-ion-exercice', start: function () { window.Ions.exercice.start(); } }
    },

    // ================= 9. Identifier les ions =================
    {
      id: 'tests', group: 2, color: 'k3', title: 'Identifier les ions', sub: 'Soude, nitrate d\'argent et test à la flamme',
      host: 'screen-lab', start: function () { window.Lab.free.start(); }, state: function () { return window.Lab.free.state(); },
      steps: [
        { title: 'Les tests chimiques', text: 'Les ions dissous dans une solution sont invisibles. Pour les identifier, on verse quelques gouttes d\'un <b>réactif</b> : avec certains ions, il se forme un <b>précipité</b>, un solide coloré qui apparaît dans le tube.' },
        { title: 'La soude et l\'ion cuivre', text: 'Appuie sur « Sélectionner un ion », puis clique sur le flacon de soude pour en verser dans le tube.',
          setup: freshLab, task: 'Teste l\'ion ' + 'Cu' + '<sup class="ion-charge ion-pos">2+</sup>' + ' avec la soude.', check: function (s) { return tested(s, 'Cu2+', 'naoh', 'bleu'); } },
        { title: 'Le précipité bleu', text: 'Observe la couleur du précipité.',
          quiz: { q: 'Avec la soude, l\'ion cuivre Cu<sup class="ion-charge ion-pos">2+</sup> forme un précipité :', choices: ['vert', 'bleu', 'blanc'], answer: 1 } },
        { title: 'Les ions fer', text: 'Il existe deux ions fer. Pour faire un nouveau test, vide d\'abord le tube.',
          setup: freshLab, task: 'Teste l\'ion Fe<sup class="ion-charge ion-pos">2+</sup> puis l\'ion Fe<sup class="ion-charge ion-pos">3+</sup> avec la soude.',
          check: function (s) { return tested(s, 'Fe2+', 'naoh', 'vert') && tested(s, 'Fe3+', 'naoh', 'rouille'); } },
        { title: 'Le nitrate d\'argent', text: 'Le nitrate d\'argent révèle l\'ion chlorure.',
          setup: freshLab, task: 'Teste l\'ion Cl<sup class="ion-charge ion-neg">−</sup> avec le nitrate d\'argent.', check: function (s) { return tested(s, 'Cl-', 'ag', 'blanc'); } },
        { title: 'Le test à la flamme', text: 'Certains ions colorent la flamme d\'un bec : c\'est le <b>test à la flamme</b>. Clique sur le bec pour l\'allumer, puis à nouveau pour y tester l\'échantillon.',
          setup: freshLab, task: 'Teste l\'ion Na<sup class="ion-charge ion-pos">+</sup> à la flamme.', check: function (s) { return tested(s, 'Na+', 'flame', 'jaune'); } },
        { title: 'Retenir les couleurs', text: 'Le tableau de données résume tous les tests.',
          quiz: { q: 'Avec la soude, un précipité vert révèle l\'ion :', choices: ['Fe<sup class="ion-charge ion-pos">2+</sup>', 'Fe<sup class="ion-charge ion-pos">3+</sup>', 'Cu<sup class="ion-charge ion-pos">2+</sup>'], answer: 0 } },
        { title: 'Le bon réactif', text: 'Chaque réactif révèle certains ions seulement.',
          quiz: { q: 'Quel réactif permet d\'identifier l\'ion Cl<sup class="ion-charge ion-neg">−</sup> ?', choices: ['la soude', 'le nitrate d\'argent', 'la flamme'], answer: 1 } }
      ],
      memo: function () {
        return memo('Identifier un ion', '<p>On verse quelques gouttes d\'un réactif dans la solution : la couleur du <b>précipité</b> formé révèle l\'ion présent. Certains ions colorent aussi la flamme.</p>') +
          '<div class="lesson-memo-table">' + window.Lab.dataHTML() + '</div>';
      },
      train: { label: 'Identifier un ion inconnu', screen: 'screen-lab-test', start: function () { window.Lab.test.start(); } }
    },

    // ================= 10. Acides et bases =================
    {
      id: 'ph', group: 2, color: 'k4', title: 'Acides et bases', sub: 'Le pH et les ions H⁺ et HO⁻',
      host: 'screen-ph',
      start: function () { window.Lessons.setPh(7); window.PhLab.lesson.start(); },
      state: function () { return { v: +document.getElementById('ph-range').value, lab: window.PhLab.lesson.state() }; },
      steps: [
        { title: 'Le pH', text: 'Le <b>pH</b> (potentiel Hydrogène) mesure l\'<b>acidité</b> ou la <b>basicité</b> d\'une solution. Il varie de <b>0 à 14</b> :' + PH_SCALE +
          'de 0 à 7, la solution est <b>acide</b> ; à 7, elle est <b>neutre</b> ; de 7 à 14, elle est <b>basique</b>.' },
        { title: 'Une solution acide', text: 'Ce bécher contient des ions ' + ion('H', 1) + ' et des ions ' + ion('HO', -1) + '. Dans une solution <b>acide</b>, il y a une <b>majorité d\'ions ' + ion('H', 1) + '</b>.',
          task: 'Déplace le curseur pour obtenir une solution acide, et observe les ions du bécher.', hold: 3000, check: function (s) { return s.v < 7; } },
        { title: 'Une solution basique', text: 'Dans une solution <b>basique</b>, il y a une <b>majorité d\'ions ' + ion('HO', -1) + '</b>.',
          task: 'Déplace le curseur pour obtenir une solution basique, et observe les ions du bécher.', hold: 3000, check: function (s) { return s.v > 7; } },
        { title: 'Une solution neutre', text: 'Dans une solution <b>neutre</b>, comme l\'eau pure, il y a <b>autant d\'ions ' + ion('H', 1) + ' que d\'ions ' + ion('HO', -1) + '</b>.',
          task: 'Déplace le curseur pour obtenir une solution neutre, et observe les ions du bécher.', hold: 3000,
          prep: function () { window.Lessons.setPh(12); }, check: function (s) { return s.v === 7; } },
        { title: 'Mesurer le pH', cls: 'ph-lab-on', text: 'Au laboratoire, on mesure le pH avec du <b>papier pH</b> :' + window.PhLab.protocolHTML() },
        { title: 'Mesurer le pH d\'une solution', cls: 'ph-lab-on', text: 'Choisis un flacon. Fais glisser la pipette dans le bécher pour prélever la solution, puis au-dessus de la bandelette pour y déposer une goutte. La boîte s\'ouvre alors : fais glisser la bandelette sur le cercle et touche la couleur qui correspond.',
          task: 'Choisis une solution et mesure son pH avec le papier pH.', check: function (s) { return s.lab.history.some(function (h) { return h.ok; }); } }
      ],
      memo: function () {
        var cases = [[7, 2, 'acide', 'Majorité d\'ions ' + ion('H', 1)], [4, 4, 'neutre', 'Autant d\'ions ' + ion('H', 1) + ' que d\'ions ' + ion('HO', -1)], [2, 7, 'basique', 'Majorité d\'ions ' + ion('HO', -1)]];
        return memo('Le pH', '<p>Le pH mesure l\'acidité ou la basicité d\'une solution. Il varie de 0 à 14.</p>' + PH_SCALE_PLAIN) +
          memo('Les ions responsables', '<div class="ph-cases">' + cases.map(function (c) {
            return '<div class="ph-case"><div class="ph-case__img">' + window.PhLab.ionsSVG(c[0], c[1]) + '</div><b class="ph-z--' + (c[2] === 'acide' ? 'acid' : c[2] === 'neutre' ? 'neutral' : 'base') + '">Solution ' + c[2] + '</b><span>' + c[3] + '</span></div>';
          }).join('') + '</div>') +
          memo('Mesurer le pH', '<p>On dépose une goutte de solution sur une bandelette de <b>papier pH</b>, puis on compare sa couleur avec celles de la boîte.</p>');
      },
      train: { label: 'Mesurer le pH et identifier des solutions inconnues', screen: 'screen-phlab-test', start: function () { window.PhLab.test.start(); } }
    }
  ];

  L.GROUPS = GROUPS;
  return L;
})();
