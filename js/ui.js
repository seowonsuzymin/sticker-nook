/* ============================================================
   HUD, room switcher, modals, toasts, settings
   ============================================================ */
(function (SN) {
  'use strict';

  var UI = SN.UI = {};

  var coinAmount, coinPill, tabsEl, modalOverlay, modalEl, settingsOverlay, toastStack;

  UI.init = function () {
    coinAmount = document.getElementById('coinAmount');
    coinPill = document.getElementById('coinPill');
    tabsEl = document.getElementById('roomTabs');
    modalOverlay = document.getElementById('modalOverlay');
    modalEl = document.getElementById('modal');
    settingsOverlay = document.getElementById('settingsOverlay');
    toastStack = document.getElementById('toastStack');

    UI.renderCoins();
    UI.renderTabs();

    SN.on('coins', function () { UI.renderCoins(true); UI.renderTabs(); });
    SN.on('layout', UI.renderTabs);

    // Dismiss the modal by clicking the backdrop.
    modalOverlay.addEventListener('pointerdown', function (e) {
      if (e.target === modalOverlay) UI.closeModal();
    });
    settingsOverlay.addEventListener('pointerdown', function (e) {
      if (e.target === settingsOverlay) UI.closeSettings();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!modalOverlay.hidden) UI.closeModal();
      else if (!settingsOverlay.hidden) UI.closeSettings();
    });

    wireSettings();
  };

  /* ── Coin counter ──────────────────────────────────────── */

  UI.renderCoins = function (bump) {
    if (!SN.state) return;                 // still on the profile picker
    coinAmount.textContent = SN.state.coins;
    if (bump) {
      coinPill.classList.remove('is-bump');
      void coinPill.offsetWidth;               // restart the animation
      coinPill.classList.add('is-bump');
    }
  };

  /* ── Room switcher ─────────────────────────────────────── */

  UI.renderTabs = function () {
    if (!SN.state) return;                 // still on the profile picker
    tabsEl.innerHTML = SN.ROOMS.map(function (r) {
      var unlocked = SN.roomUnlocked(r.id);
      var active = SN.state.activeRoom === r.id;
      var afford = SN.state.coins >= r.price;
      return '<button class="room-tab' +
        (active ? ' is-active' : '') +
        (unlocked ? '' : ' is-locked') +
        (!unlocked && afford ? ' is-affordable' : '') +
        '" data-room="' + r.id + '" style="--accent:' + r.accent + '">' +
        '<span class="room-tab-swatch">' + SN.roomSwatch(r) +
        (unlocked ? '' : '<span class="room-tab-lock">🔒</span>') + '</span>' +
        '<span class="room-tab-text">' +
        '<b>' + r.name + '</b>' +
        (unlocked
          ? '<small>' + SN.state.layouts[r.id].length + ' stickers</small>'
          : '<small class="room-tab-price"><span class="coin-icon coin-icon-sm"></span>' + r.price + '</small>') +
        '</span></button>';
    }).join('');

    tabsEl.querySelectorAll('.room-tab').forEach(function (b) {
      b.addEventListener('click', function () { pickRoom(b.dataset.room); });
    });
  };

  function pickRoom(roomId) {
    var r = SN.ROOM_BY_ID[roomId];
    if (!r) return;

    if (SN.roomUnlocked(roomId)) {
      if (SN.state.activeRoom === roomId) return;
      SN.state.activeRoom = roomId;
      SN.save();
      SN.Room.render();
      UI.renderTabs();
      return;
    }

    if (SN.state.coins < r.price) {
      UI.modal({
        art: '<div class="modal-room">' + SN.roomSwatch(r) + '</div>',
        title: r.name + ' is locked',
        body: 'This room unlocks for ' + coin(r.price) + '. You have ' + coin(SN.state.coins) +
          ' — play a mini-game to make up the difference.',
        actions: [
          { label: 'Maybe later', ghost: true },
          { label: 'Earn coins', primary: true, onClick: function () { SN.Arcade.openRandom(); } }
        ]
      });
      return;
    }

    UI.modal({
      art: '<div class="modal-room">' + SN.roomSwatch(r) + '</div>',
      title: 'Unlock ' + r.name + '?',
      body: 'A brand new room to decorate, for ' + coin(r.price) + '.',
      actions: [
        { label: 'Cancel', ghost: true },
        {
          label: 'Unlock', primary: true, onClick: function () {
            if (!SN.spendCoins(r.price)) return;
            SN.state.unlockedRooms.push(r.id);
            SN.state.activeRoom = r.id;
            SN.save();
            SN.Room.render();
            UI.renderTabs();
            UI.toast('🏠 ' + r.name + ' unlocked!');
          }
        }
      ]
    });
  }

  /* ── Modal ─────────────────────────────────────────────── */

  UI.modal = function (opts) {
    document.getElementById('modalArt').innerHTML = opts.art || '';
    document.getElementById('modalArt').hidden = !opts.art;
    document.getElementById('modalTitle').textContent = opts.title || '';
    document.getElementById('modalBody').innerHTML = opts.body || '';

    var actions = document.getElementById('modalActions');
    actions.innerHTML = '';
    (opts.actions || [{ label: 'OK', primary: true }]).forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn ' + (a.primary ? 'btn-play' : a.danger ? 'btn-danger' : 'btn-ghost');
      b.textContent = a.label;
      b.addEventListener('click', function () {
        UI.closeModal();
        if (a.onClick) a.onClick();
      });
      actions.appendChild(b);
    });

    modalOverlay.hidden = false;
    modalEl.classList.remove('is-in');
    void modalEl.offsetWidth;
    modalEl.classList.add('is-in');
  };

  UI.closeModal = function () { modalOverlay.hidden = true; };

  /* ── Toasts ────────────────────────────────────────────── */

  UI.toast = function (msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    toastStack.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); }, 2400);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2900);
  };

  /* ── Settings ──────────────────────────────────────────── */

  function wireSettings() {
    document.getElementById('btnSettings').addEventListener('click', UI.openSettings);
    document.getElementById('btnCloseSettings').addEventListener('click', UI.closeSettings);

    document.getElementById('btnSwitchProfile').addEventListener('click', function () {
      UI.closeSettings();
      SN.leaveGame();
    });

    document.getElementById('btnClearRoom').addEventListener('click', function () {
      var r = SN.ROOM_BY_ID[SN.state.activeRoom];
      UI.closeSettings();
      UI.modal({
        title: 'Clear ' + r.name + '?',
        body: 'Every sticker in this room will be removed. Your stickers stay unlocked, and your other rooms are untouched.',
        actions: [
          { label: 'Cancel', ghost: true },
          {
            label: 'Clear room', danger: true, onClick: function () {
              SN.Room.clearRoom();
              UI.renderTabs();
              UI.toast('🧹 Room cleared.');
            }
          }
        ]
      });
    });

    document.getElementById('btnReset').addEventListener('click', function () {
      UI.closeSettings();
      var who = SN.Profiles.active();
      UI.modal({
        title: 'Reset ' + who.name + '?',
        body: 'This wipes the coins, stickers, rooms and layouts in <b>this nook only</b> — ' +
          'your other nooks are untouched. It cannot be undone.',
        actions: [
          { label: 'Keep my nook', ghost: true },
          {
            label: 'Reset progress', danger: true, onClick: function () {
              SN.resetProgress();
              SN.Room.render();
              UI.renderCoins();
              UI.renderTabs();
              SN.Tray.render();
              UI.toast('↺ Fresh start!');
            }
          }
        ]
      });
    });
  }

  UI.openSettings = function () {
    var p = SN.Profiles.active();
    var c = SN.Profiles.colorFor(p.color);
    document.getElementById('settingsWho').innerHTML =
      '<span class="settings-who-avatar">' + SN.avatarSVG(c, p.character) + '</span>' +
      '<span>Playing as <b>' + p.name + '</b></span>';

    var s = SN.state.stats;
    document.getElementById('settingsStats').innerHTML =
      stat('Coins earned', s.totalEarned) +
      stat('Games played', s.plays) +
      stat('Best run', s.bestRun) +
      stat('Best combo', s.bestCombo);
    settingsOverlay.hidden = false;
  };

  UI.closeSettings = function () { settingsOverlay.hidden = true; };

  function stat(label, value) {
    return '<div class="stat-cell"><b>' + value + '</b><span>' + label + '</span></div>';
  }

  function coin(n) {
    return '<span class="coin-inline"><span class="coin-icon coin-icon-sm"></span>' + n + '</span>';
  }

})(window.SN = window.SN || {});
