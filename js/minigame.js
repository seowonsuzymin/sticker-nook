/* ============================================================
   Mini-game: "Sticker Catch"
   ------------------------------------------------------------
   Cute things fall; tap them before they reach the bottom.
   Tapping a void blob costs coins and breaks your combo.
   This is the only source of currency in the game.
   ============================================================ */
(function (SN) {
  'use strict';

  var DURATION = 40;          // seconds per run
  var BAD_PENALTY = 5;        // coins lost for tapping a blob
  var MAX_MULT = 5;

  var C = SN.PALETTE;

  /* ── Falling item types ────────────────────────────────── */

  function starPath(cx, cy, r, inner) {
    var p = '', i, a, rr;
    for (i = 0; i < 10; i++) {
      a = -Math.PI / 2 + i * Math.PI / 5;
      rr = i % 2 ? r * (inner || 0.45) : r;
      p += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return p + 'Z';
  }

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

  var TOTAL_WEIGHT = TYPES.reduce(function (n, t) { return n + t.weight; }, 0);

  function pickType(t01) {
    // Blobs get more common as the run goes on; gold stays rare.
    var roll = Math.random() * TOTAL_WEIGHT, i;
    for (i = 0; i < TYPES.length; i++) {
      roll -= TYPES[i].weight;
      if (roll <= 0) {
        var type = TYPES[i];
        if (type.key === 'blob' && Math.random() > 0.55 + t01 * 0.45) return TYPES[0];
        return type;
      }
    }
    return TYPES[0];
  }

  /* ── Runtime ───────────────────────────────────────────── */

  var overlay, field, elTime, elCoins, elCombo, elBar, elCountdown, elResults;
  var items = [], raf = null, lastT = 0;
  var timeLeft = 0, spawnIn = 0, running = false;
  var run = null;

  var Catch = SN.Catch = {};

  Catch.init = function () {
    overlay = document.getElementById('catchOverlay');
    field = document.getElementById('catchField');
    elTime = document.getElementById('catchTime');
    elCoins = document.getElementById('catchCoins');
    elCombo = document.getElementById('catchCombo');
    elBar = document.getElementById('catchTimebar');
    elCountdown = document.getElementById('catchCountdown');
    elResults = document.getElementById('catchResults');

    document.getElementById('btnPlay').addEventListener('click', Catch.open);
    document.getElementById('catchQuit').addEventListener('click', Catch.close);
    document.getElementById('btnCollect').addEventListener('click', Catch.close);
    document.getElementById('btnAgain').addEventListener('click', function () {
      elResults.hidden = true;
      startCountdown();
    });
  };

  Catch.open = function () {
    SN.UI.closeModal();
    overlay.hidden = false;
    elResults.hidden = true;
    startCountdown();
  };

  Catch.close = function () {
    stop();
    overlay.hidden = true;
    elResults.hidden = true;
  };

  function startCountdown() {
    stop();
    clearField();
    run = { coins: 0, caught: 0, bad: 0, combo: 0, bestCombo: 0 };
    timeLeft = DURATION;
    updateHud();

    var n = 3;
    elCountdown.hidden = false;
    elCountdown.innerHTML = '<span>' + n + '</span>';

    var tick = setInterval(function () {
      n--;
      if (n > 0) {
        elCountdown.innerHTML = '<span>' + n + '</span>';
      } else if (n === 0) {
        elCountdown.innerHTML = '<span class="go">Go!</span>';
      } else {
        clearInterval(tick);
        elCountdown.hidden = true;
        begin();
      }
    }, 700);

    // Bail out cleanly if the player quits mid-countdown.
    Catch._cancelCountdown = function () { clearInterval(tick); elCountdown.hidden = true; };
  }

  function begin() {
    running = true;
    spawnIn = 0.3;
    lastT = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (Catch._cancelCountdown) { Catch._cancelCountdown(); Catch._cancelCountdown = null; }
    clearField();
  }

  function clearField() {
    items.forEach(function (it) { if (it.el.parentNode) it.el.parentNode.removeChild(it.el); });
    items = [];
    field.innerHTML = '';
  }

  /* ── Main loop ─────────────────────────────────────────── */

  function frame(t) {
    if (!running) return;
    if (!lastT) lastT = t;
    var dt = Math.min((t - lastT) / 1000, 0.05);   // clamp so a background tab can't teleport items
    lastT = t;

    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; finish(); return; }

    var t01 = 1 - timeLeft / DURATION;

    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn(t01);
      spawnIn = 0.72 - t01 * 0.36 + Math.random() * 0.25;
    }

    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.y += it.vy * dt;
      it.sway += dt * it.swaySpeed;
      it.spin += it.spinSpeed * dt;

      var x = it.x + Math.sin(it.sway) * it.swayAmp;
      it.el.style.left = (x * 100) + '%';
      it.el.style.top = (it.y * 100) + '%';
      it.el.style.transform = 'translate(-50%, -50%) rotate(' + it.spin.toFixed(1) + 'deg)';

      if (it.y > 1.12) {
        if (it.type.good) breakCombo();
        removeItem(i);
      }
    }

    updateHud();
    raf = requestAnimationFrame(frame);
  }

  function spawn(t01) {
    var type = pickType(t01);
    var r = field.getBoundingClientRect();
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
      vy: 0.20 + Math.random() * 0.16 + t01 * 0.16,
      sway: Math.random() * 6.28,
      swaySpeed: 1.1 + Math.random() * 1.4,
      swayAmp: 0.01 + Math.random() * 0.045,
      spin: (Math.random() - 0.5) * 30,
      spinSpeed: (Math.random() - 0.5) * 90,
      dead: false
    };

    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (it.dead || !running) return;
      hit(it, e.clientX, e.clientY);
    });

    field.appendChild(el);
    items.push(it);
  }

  function removeItem(i) {
    var it = items[i];
    items.splice(i, 1);
    if (it.el.parentNode) it.el.parentNode.removeChild(it.el);
  }

  function killItem(it, cls) {
    it.dead = true;
    var idx = items.indexOf(it);
    if (idx !== -1) items.splice(idx, 1);
    it.el.classList.add(cls);
    setTimeout(function () { if (it.el.parentNode) it.el.parentNode.removeChild(it.el); }, 260);
  }

  function hit(it, cx, cy) {
    if (it.type.good) {
      run.combo++;
      if (run.combo > run.bestCombo) run.bestCombo = run.combo;
      var mult = multiplier();
      var gain = it.type.value * mult;
      run.coins += gain;
      run.caught++;
      killItem(it, 'is-caught');
      popText('+' + gain, cx, cy, it.type.rare ? 'gold' : 'good');
      if (run.combo > 1 && run.combo % 5 === 0) {
        popText('COMBO x' + multiplier(), cx, cy - 34, 'combo');
      }
    } else {
      run.bad++;
      run.coins = Math.max(0, run.coins - BAD_PENALTY);
      breakCombo();
      killItem(it, 'is-zapped');
      popText('-' + BAD_PENALTY, cx, cy, 'bad');
      field.classList.add('is-shaking');
      setTimeout(function () { field.classList.remove('is-shaking'); }, 320);
    }
    updateHud();
  }

  function multiplier() { return Math.min(MAX_MULT, 1 + Math.floor(run.combo / 5)); }

  function breakCombo() {
    if (run && run.combo >= 5) {
      elCombo.classList.add('is-broken');
      setTimeout(function () { elCombo.classList.remove('is-broken'); }, 300);
    }
    if (run) run.combo = 0;
  }

  function popText(text, clientX, clientY, kind) {
    var r = field.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'pop-text pop-' + kind;
    el.textContent = text;
    el.style.left = (clientX - r.left) + 'px';
    el.style.top = (clientY - r.top) + 'px';
    field.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }

  function updateHud() {
    elTime.textContent = Math.ceil(timeLeft);
    elCoins.textContent = run ? run.coins : 0;
    elCombo.textContent = 'x' + (run ? multiplier() : 1);
    elCombo.classList.toggle('is-hot', run && run.combo >= 5);
    elBar.style.width = (Math.max(0, timeLeft) / DURATION * 100) + '%';
  }

  /* ── Results ───────────────────────────────────────────── */

  function finish() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    // Sweep any stragglers off the screen.
    items.slice().forEach(function (it) { killItem(it, 'is-caught'); });

    SN.addCoins(run.coins);
    SN.state.stats.plays++;
    SN.state.stats.totalEarned += run.coins;
    SN.state.stats.bestRun = Math.max(SN.state.stats.bestRun, run.coins);
    SN.state.stats.bestCombo = Math.max(SN.state.stats.bestCombo, run.bestCombo);
    SN.save();

    document.getElementById('resultCoins').textContent = run.coins;
    document.getElementById('resultCaught').textContent = run.caught;
    document.getElementById('resultCombo').textContent = run.bestCombo;
    document.getElementById('resultBad').textContent = run.bad;
    elResults.hidden = false;
  }

})(window.SN = window.SN || {});
