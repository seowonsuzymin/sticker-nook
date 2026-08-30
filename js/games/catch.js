/* ============================================================
   Mini-game: "Sticker Catch"
   ------------------------------------------------------------
   Cute things fall; tap them before they reach the bottom.
   Tapping a void blob costs coins and breaks your combo.
   ============================================================ */
(function (SN) {
  'use strict';

  var BAD_PENALTY = 5;
  var MAX_MULT = 5;
  var C = SN.PALETTE;

  function starPath(cx, cy, r, inner) {
    var p = '', i, a, rr;
    for (i = 0; i < 10; i++) {
      a = -Math.PI / 2 + i * Math.PI / 5;
      rr = i % 2 ? r * (inner || 0.45) : r;
      p += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return p + 'Z';
  }
  SN.starPath = starPath;                       // shared with the other games

  var TYPES = [
    {
      key: 'star', good: true, value: 2, weight: 26,
      art: '<path d="' + starPath(50, 50, 42) + '" fill="' + C.yellow + '"/>' +
        '<circle cx="40" cy="44" r="3" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="60" cy="44" r="3" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M44 54 a7 6 0 0 0 12 0" fill="none" stroke-width="3"/>'
    },
    {
      key: 'heart', good: true, value: 2, weight: 26,
      art: '<path d="M50 88 C14 62 8 40 23 29 C36 20 46 28 50 37 C54 28 64 20 77 29 C92 40 86 62 50 88 Z" fill="' + C.pink + '"/>' +
        '<path d="M30 42 c2 -7 7 -9 12 -8" fill="none" stroke="#fff" stroke-width="5" opacity=".85"/>'
    },
    {
      key: 'ribbon', good: true, value: 2, weight: 20,
      art: '<path d="M46 50 L14 28 c-8 -6 -8 20 0 26 z" fill="' + C.lav + '"/>' +
        '<path d="M54 50 L86 28 c8 -6 8 20 0 26 z" fill="' + C.lav + '"/>' +
        '<path d="M46 52 L30 84 h16 z" fill="' + C.lavD + '"/>' +
        '<path d="M54 52 L70 84 h-16 z" fill="' + C.lavD + '"/>' +
        '<circle cx="50" cy="50" r="11" fill="' + C.pinkL + '"/>'
    },
    {
      key: 'flower', good: true, value: 2, weight: 18,
      art: '<circle cx="50" cy="20" r="17" fill="' + C.white + '"/>' +
        '<circle cx="79" cy="41" r="17" fill="' + C.white + '"/>' +
        '<circle cx="68" cy="76" r="17" fill="' + C.white + '"/>' +
        '<circle cx="32" cy="76" r="17" fill="' + C.white + '"/>' +
        '<circle cx="21" cy="41" r="17" fill="' + C.white + '"/>' +
        '<circle cx="50" cy="52" r="17" fill="' + C.yellow + '"/>'
    },
    {
      key: 'gold', good: true, value: 9, weight: 5, rare: true,
      art: '<path d="' + starPath(50, 50, 44, 0.5) + '" fill="#ffd24a"/>' +
        '<path d="' + starPath(50, 50, 27, 0.5) + '" fill="#fff0b8" stroke="none"/>' +
        '<circle cx="42" cy="46" r="3" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="58" cy="46" r="3" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M44 55 a7 7 0 0 0 12 0" fill="none" stroke-width="3"/>'
    },
    {
      key: 'blob', good: false, value: 0, weight: 16,
      art: '<path d="M50 8 c26 0 40 18 40 40 c0 26 -16 44 -40 44 c-24 0 -40 -18 -40 -44 c0 -22 14 -40 40 -40 z" fill="#5c4b73"/>' +
        '<path d="M30 40 l14 8 M70 40 l-14 8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M38 72 a10 8 0 0 1 24 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M14 22 l-8 -12 M86 22 l8 -12" fill="none" stroke="#5c4b73" stroke-width="7" stroke-linecap="round"/>'
    }
  ];
  SN.BLOB_ART = TYPES[5].art;                   // shared with the other games

  var TOTAL_WEIGHT = TYPES.reduce(function (n, t) { return n + t.weight; }, 0);

  function pickType(t01) {
    var roll = Math.random() * TOTAL_WEIGHT, i;
    for (i = 0; i < TYPES.length; i++) {
      roll -= TYPES[i].weight;
      if (roll <= 0) {
        var type = TYPES[i];
        // Blobs get more common as the run goes on; gold stays rare.
        if (type.key === 'blob' && Math.random() > 0.55 + t01 * 0.45) return TYPES[0];
        return type;
      }
    }
    return TYPES[0];
  }

  /* ── Runtime ───────────────────────────────────────────── */

  var items = [], spawnIn = 0, s = null;

  SN.Arcade.register({
    id: 'catch',
    name: 'Sticker Catch',
    tagline: 'Tap the cute stuff — dodge the grumpy blobs!',
    winTitle: 'Nice catching!',
    meter: 'Combo',
    duration: 40,

    start: function (ctx) {
      items = [];
      spawnIn = 0.3;
      s = { caught: 0, bad: 0, combo: 0, best: 0 };
      ctx.setMeter('x1');
    },

    stop: function () {
      items.forEach(function (it) { if (it.el.parentNode) it.el.parentNode.removeChild(it.el); });
      items = [];
    },

    tick: function (dt, ctx) {
      var t01 = 1 - ctx.timeLeft() / 40;

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawn(ctx, t01);
        spawnIn = 0.72 - t01 * 0.36 + Math.random() * 0.25;
      }

      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.y += it.vy * dt;
        it.sway += dt * it.swaySpeed;
        it.spin += it.spinSpeed * dt;

        it.el.style.left = ((it.x + Math.sin(it.sway) * it.swayAmp) * 100) + '%';
        it.el.style.top = (it.y * 100) + '%';
        it.el.style.transform = 'translate(-50%, -50%) rotate(' + it.spin.toFixed(1) + 'deg)';

        if (it.y > 1.12) {
          if (it.type.good) breakCombo(ctx);
          items.splice(i, 1);
          if (it.el.parentNode) it.el.parentNode.removeChild(it.el);
        }
      }
    }
  });

  function spawn(ctx, t01) {
    var type = pickType(t01);
    var r = ctx.field.getBoundingClientRect();
    var size = Math.max(46, Math.min(82, r.width * 0.11));

    var el = document.createElement('div');
    el.className = 'fall-item' + (type.good ? '' : ' is-bad') + (type.rare ? ' is-rare' : '');
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.innerHTML = '<svg viewBox="0 0 100 100" stroke="' + C.ink +
      '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" fill="none">' + type.art + '</svg>';

    var it = {
      type: type, el: el,
      x: 0.09 + Math.random() * 0.82,
      y: -0.12,
      // ~30% slower than the original pass at this speed range.
      vy: 0.14 + Math.random() * 0.11 + t01 * 0.11,
      sway: Math.random() * 6.28,
      swaySpeed: 1.1 + Math.random() * 1.4,
      swayAmp: 0.01 + Math.random() * 0.045,
      spin: (Math.random() - 0.5) * 30,
      spinSpeed: (Math.random() - 0.5) * 90,
      dead: false
    };

    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (it.dead) return;
      hit(ctx, it, e.clientX, e.clientY);
    });

    ctx.field.appendChild(el);
    items.push(it);
  }

  function kill(it, cls) {
    it.dead = true;
    var i = items.indexOf(it);
    if (i !== -1) items.splice(i, 1);
    it.el.classList.add(cls);
    setTimeout(function () { if (it.el.parentNode) it.el.parentNode.removeChild(it.el); }, 260);
  }

  function multiplier() { return Math.min(MAX_MULT, 1 + Math.floor(s.combo / 5)); }

  function breakCombo(ctx) {
    if (s.combo >= 5) ctx.breakMeter();
    s.combo = 0;
    ctx.setMeter('x1');
  }

  function hit(ctx, it, x, y) {
    if (it.type.good) {
      s.combo++;
      s.best = Math.max(s.best, s.combo);
      ctx.peakCombo(s.best);
      s.caught++;
      kill(it, 'is-caught');
      ctx.award(it.type.value * multiplier(), x, y, it.type.rare ? 'gold' : 'good');
      ctx.setMeter('x' + multiplier(), s.combo >= 5);
      if (s.combo > 1 && s.combo % 5 === 0) ctx.popText('COMBO x' + multiplier(), x, y - 34, 'combo');
    } else {
      s.bad++;
      kill(it, 'is-zapped');
      ctx.penalize(BAD_PENALTY, x, y);
      breakCombo(ctx);
    }
    report(ctx);
  }

  function report(ctx) {
    ctx.rows([
      ['Items caught', s.caught],
      ['Best combo', s.best],
      ['Oops! blobs', s.bad]
    ]);
  }

})(window.SN = window.SN || {});
