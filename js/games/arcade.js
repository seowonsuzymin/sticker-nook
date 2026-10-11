/* ============================================================
   The arcade — shared shell for every mini-game
   ------------------------------------------------------------
   Owns the overlay, HUD, countdown, timer bar and results screen, so
   a game only has to draw its own play area and say what it's worth.
   "Earn Coins" picks a registered game at random.

   To add a game, call SN.Arcade.register(...) from its own file in
   js/games/ and add a <script> tag for it:

     SN.Arcade.register({
       id: 'my-game',                  // unique
       name: 'My Game',                // shown during the countdown
       tagline: 'Do the thing!',       // one line of instructions
       winTitle: 'Well played!',       // heading on the results card
       meter: 'Combo',                 // label for the third HUD cell
       duration: 40,                   // seconds (0 = untimed)
       start: function (ctx) {},       // build into ctx.field
       tick: function (dt, ctx) {},    // optional, once per frame
       stop: function () {}            // cancel timers, clear the field
     });

   The ctx handed to start/tick is documented at makeCtx() below.
   ============================================================ */
(function (SN) {
  'use strict';

  var games = [];

  var overlay, field, elTime, elCoins, elMeter, elMeterLabel, elBar,
    elCountdown, elName, elTag, elNum,
    elResults, elResultCoins, elResultRows, elResultTitle;

  var game = null, run = null, ctx = null;
  var raf = null, lastT = 0, countdownTimer = null, running = false;
  var lastPlayedId = null;

  var Arcade = SN.Arcade = {};

  Arcade.register = function (g) { games.push(g); };
  Arcade.all = function () { return games.slice(); };

  Arcade.init = function () {
    overlay = document.getElementById('arcadeOverlay');
    field = document.getElementById('arcField');
    elTime = document.getElementById('arcTime');
    elCoins = document.getElementById('arcCoins');
    elMeter = document.getElementById('arcMeter');
    elMeterLabel = document.getElementById('arcMeterLabel');
    elBar = document.getElementById('arcTimebar');
    elCountdown = document.getElementById('arcCountdown');
    elName = document.getElementById('arcName');
    elTag = document.getElementById('arcTag');
    elNum = document.getElementById('arcNum');
    elResults = document.getElementById('arcResults');
    elResultCoins = document.getElementById('arcResultCoins');
    elResultRows = document.getElementById('arcResultRows');
    elResultTitle = document.getElementById('arcResultTitle');

    document.getElementById('btnPlay').addEventListener('click', Arcade.openRandom);
    // Quit and Collect share a handler but not a mood, so they get their own
    // listeners for the sound.
    document.getElementById('arcQuit').addEventListener('click', function () {
      SN.Audio.play('game.quit');
      Arcade.close();
    });
    document.getElementById('btnCollect').addEventListener('click', function () {
      SN.Audio.play('coin.gain');
      Arcade.close();
    });
    document.getElementById('btnAgain').addEventListener('click', function () {
      elResults.hidden = true;
      begin(game);
    });
  };

  /* ── Opening ───────────────────────────────────────────── */

  /** Pick a game at random, avoiding an immediate repeat. */
  Arcade.openRandom = function () {
    if (!games.length) return;
    var pool = games;
    if (games.length > 1 && lastPlayedId) {
      pool = games.filter(function (g) { return g.id !== lastPlayedId; });
    }
    Arcade.open(pool[Math.floor(Math.random() * pool.length)]);
  };

  Arcade.open = function (g) {
    if (!g) return;
    SN.UI.closeModal();
    overlay.hidden = false;
    elResults.hidden = true;
    begin(g);
  };

  Arcade.close = function () {
    teardown();
    overlay.hidden = true;
    elResults.hidden = true;
  };

  /* ── Lifecycle ─────────────────────────────────────────── */

  function begin(g) {
    teardown();
    game = g;
    lastPlayedId = g.id;

    run = { coins: 0, timeLeft: g.duration || 0, rows: [], peakCombo: 0, title: null };
    ctx = makeCtx();

    field.innerHTML = '';
    elMeterLabel.textContent = g.meter || 'Combo';
    elMeter.textContent = '—';
    elMeter.classList.remove('is-hot', 'is-broken');
    updateHud();

    // Countdown, with the game's name and tagline so the player knows
    // what they just got dealt.
    elName.textContent = g.name;
    elTag.textContent = g.tagline || '';
    elCountdown.hidden = false;

    var n = 3;
    elNum.textContent = n;
    elNum.classList.remove('go');
    SN.Audio.play('game.count');     // the "3" is painted here, outside the interval
    countdownTimer = setInterval(function () {
      n--;
      if (n > 0) {
        elNum.textContent = n;
        SN.Audio.play('game.count', { step: (3 - n) * 2 });
        restartAnim(elNum);
      } else if (n === 0) {
        elNum.textContent = 'Go!';
        elNum.classList.add('go');
        SN.Audio.play('game.go');
        restartAnim(elNum);
      } else {
        clearInterval(countdownTimer);
        countdownTimer = null;
        elCountdown.hidden = true;
        launch();
      }
    }, 700);
  }

  function launch() {
    running = true;
    lastT = 0;
    if (game.start) game.start(ctx);
    raf = requestAnimationFrame(loop);
  }

  function loop(t) {
    if (!running) return;
    if (!lastT) lastT = t;
    var dt = Math.min((t - lastT) / 1000, 0.05);   // a background tab must not teleport things
    lastT = t;

    if (game.duration) {
      run.timeLeft -= dt;
      if (run.timeLeft <= 0) {
        run.timeLeft = 0;
        updateHud();
        finish();
        return;
      }
    }

    if (game.tick) game.tick(dt, ctx);
    updateHud();
    raf = requestAnimationFrame(loop);
  }

  /** Stop everything without showing results (quit, or starting another game). */
  function teardown() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    elCountdown.hidden = true;
    if (game && game.stop) game.stop();
    field.innerHTML = '';
  }

  function finish() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (game.stop) game.stop();

    // The fanfare is the sound of the run ending; addCoins below would
    // otherwise chime over the top of it in the same tick.
    SN.Audio.play('game.finish');
    SN.Audio.suppress('coin.gain', 1400);
    SN.addCoins(run.coins);
    var st = SN.state.stats;
    st.plays++;
    st.totalEarned += run.coins;
    st.bestRun = Math.max(st.bestRun, run.coins);
    st.bestCombo = Math.max(st.bestCombo, run.peakCombo);
    SN.save();

    elResultTitle.textContent = run.title || game.winTitle || 'Nice work!';
    elResultCoins.textContent = run.coins;
    elResultRows.innerHTML = run.rows.map(function (r) {
      return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');
    elResults.hidden = false;
  }

  /* ── HUD ───────────────────────────────────────────────── */

  function updateHud() {
    if (!run) return;
    elTime.textContent = game.duration ? Math.ceil(run.timeLeft) : '∞';
    elCoins.textContent = run.coins;
    elBar.style.width = game.duration
      ? (Math.max(0, run.timeLeft) / game.duration * 100) + '%'
      : '100%';
  }

  function restartAnim(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  /* ── What games get to work with ───────────────────────── */

  function makeCtx() {
    /* Every hit nudges the pitch up a semitone, so a hot streak climbs and a
       miss drops you back to the bottom. All three games get it from here. */
    var streak = 0;

    return {
      /** The play area to build into. Cleared automatically between runs. */
      field: field,

      /** Seconds remaining (0 for untimed games). */
      timeLeft: function () { return run.timeLeft; },

      /** Award coins, with a floating "+n" at the given screen position. */
      award: function (n, clientX, clientY, kind) {
        if (kind === 'gold') SN.Audio.play('game.gold');
        else SN.Audio.play('game.hit', { step: Math.min(streak, 12) });
        streak++;
        run.coins += n;
        if (clientX != null) popText('+' + n, clientX, clientY, kind || 'good');
        updateHud();
      },

      /** Take coins away, with a floating "-n" and a screen shake. */
      penalize: function (n, clientX, clientY) {
        // Only here — penalize calls popText and shake itself, so hooking
        // those too would fire three sounds for one mistake.
        SN.Audio.play('game.miss');
        streak = 0;
        run.coins = Math.max(0, run.coins - n);
        if (clientX != null) popText('-' + n, clientX, clientY, 'bad');
        shake();
        updateHud();
      },

      /** Silent coins, e.g. an end-of-round bonus. */
      bonus: function (n) { SN.Audio.play('game.bonus'); run.coins += n; updateHud(); },

      popText: function (text, x, y, kind) {
        // Games call this directly for combo milestones; the award/penalize
        // routes above have already spoken for their own pops.
        if (kind === 'combo') SN.Audio.play('game.combo');
        popText(text, x, y, kind);
      },
      shake: shake,

      /** Third HUD cell: the text, and whether to make it glow. */
      setMeter: function (text, hot) {
        elMeter.textContent = text;
        elMeter.classList.toggle('is-hot', !!hot);
      },

      /** Flash the meter red — for a broken streak. */
      breakMeter: function () {
        SN.Audio.play('game.break');
        streak = 0;
        elMeter.classList.add('is-broken');
        setTimeout(function () { elMeter.classList.remove('is-broken'); }, 300);
      },

      /** Report a streak length so "best combo" in settings stays meaningful. */
      peakCombo: function (n) { run.peakCombo = Math.max(run.peakCombo, n); },

      /** Rows on the results card: [['Items caught', 12], ...] */
      rows: function (arr) { run.rows = arr; },

      /** Override the results heading (e.g. when the board is cleared). */
      title: function (t) { run.title = t; },

      /** End the run early — the board was cleared, say. */
      finish: function () { if (running) finish(); }
    };
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

  function shake() {
    field.classList.add('is-shaking');
    setTimeout(function () { field.classList.remove('is-shaking'); }, 320);
  }

})(window.SN = window.SN || {});
