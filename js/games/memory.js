/* ============================================================
   Mini-game: "Memory Match"
   ------------------------------------------------------------
   Sixteen face-down cards, eight pairs of stickers. Flip two at a
   time to find a match. Matching back-to-back builds a streak
   multiplier; clearing the board early pays a time bonus.
   ============================================================ */
(function (SN) {
  'use strict';

  var PAIRS = 8;
  var DURATION = 50;
  var MATCH_VALUE = 20;
  var MAX_MULT = 3;
  var TIME_BONUS = 5;          // coins per whole second left after a clear
  var MAX_TIME_BONUS = 100;    // ...capped, so a very fast clear can't dwarf the other games

  /* Stickers that stay readable shrunk down onto a card. */
  var DECK = [
    'cake-strawberry', 'boba', 'donut', 'cupcake', 'mug-cocoa',
    'plush-bear', 'plush-bunny', 'cat-loaf', 'duck-rubber',
    'cactus', 'plant-small', 'vase-flowers',
    'moon-lamp', 'rainbow', 'cloud', 'clock-wall',
    'pillow-heart', 'console', 'boba', 'mirror-oval'
  ];

  var s = null, busy = false, flipTimer = null;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  SN.Arcade.register({
    id: 'memory',
    name: 'Memory Match',
    tagline: 'Find all eight pairs before the timer runs out!',
    winTitle: 'Great memory!',
    meter: 'Streak',
    duration: DURATION,

    start: function (ctx) {
      s = { found: 0, misses: 0, streak: 0, best: 0, first: null };
      busy = false;
      ctx.setMeter('x1');

      // Unique ids only, then two cards each.
      var picks = shuffle(DECK.filter(function (id, i) {
        return DECK.indexOf(id) === i && SN.STICKER_BY_ID[id];
      })).slice(0, PAIRS);

      var deck = shuffle(picks.concat(picks));

      var wrap = document.createElement('div');
      wrap.className = 'board-wrap';
      var grid = document.createElement('div');
      grid.className = 'mm-grid';
      deck.forEach(function (id, i) {
        grid.appendChild(makeCard(ctx, id, i));
      });
      wrap.appendChild(grid);
      ctx.field.appendChild(wrap);

      // A brief peek at the board makes the game feel fair rather than blind.
      setTimeout(function () {
        if (!s) return;
        grid.querySelectorAll('.mm-card').forEach(function (c) { c.classList.add('is-up'); });
        setTimeout(function () {
          if (!s) return;
          grid.querySelectorAll('.mm-card:not(.is-matched)').forEach(function (c) {
            c.classList.remove('is-up');
          });
        }, 900);
      }, 30);

      report(ctx);
    },

    stop: function () {
      if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; }
      s = null;
      busy = false;
    }
  });

  function makeCard(ctx, id, i) {
    var card = document.createElement('button');
    card.className = 'mm-card';
    card.dataset.sticker = id;
    card.innerHTML =
      '<span class="mm-inner">' +
      '<span class="mm-back"><span class="mm-back-mark">✿</span></span>' +
      '<span class="mm-face">' + SN.stickerSVG(id) + '</span>' +
      '</span>';
    card.addEventListener('click', function (e) { flip(ctx, card, e); });
    return card;
  }

  function flip(ctx, card, e) {
    if (!s || busy) return;
    if (card.classList.contains('is-up') || card.classList.contains('is-matched')) return;

    SN.Audio.play('game.flip');
    card.classList.add('is-up');

    if (!s.first) { s.first = card; return; }

    var a = s.first, b = card;
    s.first = null;
    busy = true;

    if (a.dataset.sticker === b.dataset.sticker) {
      flipTimer = setTimeout(function () {
        if (!s) return;
        a.classList.add('is-matched');
        b.classList.add('is-matched');
        busy = false;

        s.found++;
        s.streak++;
        s.best = Math.max(s.best, s.streak);
        ctx.peakCombo(s.best);

        var mult = multiplier();
        var r = b.getBoundingClientRect();
        ctx.award(MATCH_VALUE * mult, r.left + r.width / 2, r.top + r.height / 2,
          mult >= MAX_MULT ? 'gold' : 'good');
        ctx.setMeter('x' + mult, s.streak >= 2);
        report(ctx);

        if (s.found === PAIRS) {
          var left = Math.ceil(ctx.timeLeft());
          var earned = Math.min(left * TIME_BONUS, MAX_TIME_BONUS);
          ctx.bonus(earned);
          ctx.rows([
            ['Pairs found', s.found + ' / ' + PAIRS],
            ['Best streak', s.best],
            ['Wrong flips', s.misses],
            ['Time bonus', '+' + earned]
          ]);
          ctx.title('Board cleared!');
          setTimeout(function () { ctx.finish(); }, 420);
        }
      }, 260);
    } else {
      s.misses++;
      if (s.streak >= 2) ctx.breakMeter();
      s.streak = 0;
      ctx.setMeter('x1');
      report(ctx);
      flipTimer = setTimeout(function () {
        if (!s) return;
        a.classList.remove('is-up');
        b.classList.remove('is-up');
        busy = false;
      }, 720);
    }
  }

  function multiplier() { return Math.min(MAX_MULT, 1 + Math.floor(s.streak / 2)); }

  function report(ctx) {
    ctx.rows([
      ['Pairs found', s.found + ' / ' + PAIRS],
      ['Best streak', s.best],
      ['Wrong flips', s.misses]
    ]);
  }

})(window.SN = window.SN || {});
