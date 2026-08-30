/* ============================================================
   Mini-game: "Peek-a-Boo"
   ------------------------------------------------------------
   Nine burrows. Friends pop out for a moment — tap them before
   they duck back down. Tapping a void blob costs coins.
   Reuses the character catalog, so every pop is a familiar face
   (falls back to a plain sticker face if no character catalog is
   loaded, so this game doesn't depend on the profile system).
   ============================================================ */
(function (SN) {
  'use strict';

  var HOLES = 9;
  var DURATION = 35;
  var BAD_PENALTY = 5;
  var MAX_MULT = 5;
  var C = SN.PALETTE;

  var holes = [], spawnIn = 0, s = null;

  SN.Arcade.register({
    id: 'peekaboo',
    name: 'Peek-a-Boo',
    tagline: 'Tap your friends as they pop up — not the blobs!',
    winTitle: 'Peek-a-boo!',
    meter: 'Combo',
    duration: DURATION,

    start: function (ctx) {
      s = { hit: 0, missed: 0, bad: 0, combo: 0, best: 0 };
      spawnIn = 0.4;
      ctx.setMeter('x1');

      var wrap = document.createElement('div');
      wrap.className = 'board-wrap';
      var grid = document.createElement('div');
      grid.className = 'pk-grid';
      holes = [];

      for (var i = 0; i < HOLES; i++) {
        var hole = document.createElement('div');
        hole.className = 'pk-hole';
        hole.innerHTML = '<span class="pk-mound"></span><span class="pk-critter"></span>';
        grid.appendChild(hole);
        holes.push({
          el: hole,
          critter: hole.querySelector('.pk-critter'),
          busy: false, up: false, life: 0, good: true, rare: false
        });
      }

      wrap.appendChild(grid);
      ctx.field.appendChild(wrap);
      holes.forEach(function (h) { wire(ctx, h); });
      report(ctx);
    },

    stop: function () {
      holes = [];
      s = null;
    },

    tick: function (dt, ctx) {
      var t01 = 1 - ctx.timeLeft() / DURATION;

      spawnIn -= dt;
      if (spawnIn <= 0) {
        pop(ctx, t01);
        spawnIn = 0.62 - t01 * 0.3 + Math.random() * 0.22;
      }

      holes.forEach(function (h) {
        if (!h.up) return;
        h.life -= dt;
        if (h.life <= 0) {
          if (h.good) {                       // ducked back down untapped
            s.missed++;
            breakCombo(ctx);
            report(ctx);
          }
          hide(h);
        }
      });
    }
  });

  function wire(ctx, h) {
    h.critter.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (!h.up || !s) return;
      tap(ctx, h, e.clientX, e.clientY);
    });
  }

  function pop(ctx, t01) {
    var free = holes.filter(function (h) { return !h.busy; });
    if (!free.length) return;
    var h = free[Math.floor(Math.random() * free.length)];

    var roll = Math.random();
    var badChance = 0.14 + t01 * 0.12;
    h.good = roll > badChance;
    h.rare = h.good && roll > 0.94;

    h.critter.innerHTML = h.rare ? goldArt() : h.good ? friendArt() : blobArt();
    h.critter.classList.toggle('is-bad', !h.good);
    h.critter.classList.toggle('is-rare', !!h.rare);

    h.busy = true;
    h.up = true;
    // Kept comfortably above the CSS pop transition time (0.32s) even late-game.
    h.life = 1.25 - t01 * 0.5 + Math.random() * 0.3;
    h.el.classList.add('is-up');
  }

  function hide(h) {
    h.up = false;
    h.el.classList.remove('is-up');
    setTimeout(function () { h.busy = false; }, 180);   // small gap before reuse
  }

  function tap(ctx, h, x, y) {
    if (h.good) {
      s.hit++;
      s.combo++;
      s.best = Math.max(s.best, s.combo);
      ctx.peakCombo(s.best);
      var value = h.rare ? 10 : 2;
      ctx.award(value * multiplier(), x, y, h.rare ? 'gold' : 'good');
      ctx.setMeter('x' + multiplier(), s.combo >= 5);
      if (s.combo > 1 && s.combo % 5 === 0) ctx.popText('COMBO x' + multiplier(), x, y - 34, 'combo');
      h.el.classList.add('is-bopped');
      setTimeout(function () { h.el.classList.remove('is-bopped'); }, 220);
    } else {
      s.bad++;
      ctx.penalize(BAD_PENALTY, x, y);
      breakCombo(ctx);
    }
    hide(h);
    report(ctx);
  }

  function multiplier() { return Math.min(MAX_MULT, 1 + Math.floor(s.combo / 5)); }

  function breakCombo(ctx) {
    if (s.combo >= 5) ctx.breakMeter();
    s.combo = 0;
    ctx.setMeter('x1');
  }

  function report(ctx) {
    ctx.rows([
      ['Friends found', s.hit],
      ['Best combo', s.best],
      ['Slipped away', s.missed],
      ['Oops! blobs', s.bad]
    ]);
  }

  /* ── Art ───────────────────────────────────────────────── */

  function friendArt() {
    if (SN.CHARACTERS && SN.avatarSVG && SN.PROFILE_COLORS) {
      var ch = SN.CHARACTERS[Math.floor(Math.random() * SN.CHARACTERS.length)];
      var col = SN.PROFILE_COLORS[Math.floor(Math.random() * SN.PROFILE_COLORS.length)];
      return SN.avatarSVG(col, ch.id);
    }
    // Fallback face if no character catalog is present.
    return '<svg viewBox="0 0 100 100" stroke="' + C.ink + '" stroke-width="4" ' +
      'stroke-linejoin="round" fill="none">' +
      '<circle cx="50" cy="50" r="45" fill="' + C.pink + '"/>' +
      '<circle cx="38" cy="46" r="4" fill="' + C.ink + '" stroke="none"/>' +
      '<circle cx="62" cy="46" r="4" fill="' + C.ink + '" stroke="none"/>' +
      '<path d="M42 60 a9 7 0 0 0 16 0" fill="none" stroke-width="3"/>' +
      '</svg>';
  }

  function goldArt() {
    return '<svg viewBox="0 0 100 100" stroke="' + C.ink + '" stroke-width="4" ' +
      'stroke-linejoin="round" fill="none">' +
      '<circle cx="50" cy="50" r="45" fill="#ffe9a8"/>' +
      '<path d="' + SN.starPath(50, 50, 34, 0.5) + '" fill="#ffd24a"/>' +
      '<circle cx="43" cy="46" r="3" fill="' + C.ink + '" stroke="none"/>' +
      '<circle cx="57" cy="46" r="3" fill="' + C.ink + '" stroke="none"/>' +
      '<path d="M45 55 a6 6 0 0 0 10 0" fill="none" stroke-width="3"/>' +
      '</svg>';
  }

  function blobArt() {
    return '<svg viewBox="0 0 100 100" stroke="' + C.ink + '" stroke-width="4" ' +
      'stroke-linejoin="round" stroke-linecap="round" fill="none">' + SN.BLOB_ART + '</svg>';
  }

})(window.SN = window.SN || {});
