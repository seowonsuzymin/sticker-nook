/* ============================================================
   HUD, room switcher, modals, toasts, settings
   ============================================================ */
(function (SN) {
  'use strict';

  var UI = SN.UI = {};

  var coinAmount, coinPill, modalOverlay, modalEl, settingsOverlay, toastStack;

  UI.init = function () {
    coinAmount = document.getElementById('coinAmount');
    coinPill = document.getElementById('coinPill');
    modalOverlay = document.getElementById('modalOverlay');
    modalEl = document.getElementById('modal');
    settingsOverlay = document.getElementById('settingsOverlay');
    toastStack = document.getElementById('toastStack');

    UI.renderCoins();

    SN.on('coins', function () { UI.renderCoins(true); });

    document.getElementById('btnBackToRooms').addEventListener('click', function () {
      SN.RoomSelect.show();
    });

    document.getElementById('roomTitle').addEventListener('click', function () {
      if (SN.state) UI.offerRename(SN.state.activeRoom);
    });

    // TEMPORARY dev helper — delete this listener with the button.
    document.getElementById('btnDevCoins').addEventListener('click', function () {
      if (!SN.state) return;
      SN.addCoins(1000);
      UI.toast('+1000 coins (dev)');
    });

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

  /** The title in the decorate view's top bar. */
  UI.renderRoomBar = function () {
    var r = SN.roomDef(SN.state.activeRoom);
    document.getElementById('roomTitleText').textContent = r ? r.name : 'Room';
  };

  /** Rename the room you're in. Clearing the field restores its original name. */
  UI.offerRename = function (roomId) {
    var r = SN.roomDef(roomId);
    if (!r) return;
    var fallback = SN.roomDefaultName(roomId);

    UI.modal({
      title: 'Rename room',
      body: 'What would you like to call this room?' +
        '<input class="np-name rename-input" id="renameInput" type="text" maxlength="18" ' +
        'autocomplete="off" spellcheck="false" value="' + esc(r.name) + '">' +
        '<small class="rename-hint">Leave it empty to go back to &ldquo;' + esc(fallback) + '&rdquo;.</small>',
      actions: [
        { label: 'Cancel', ghost: true },
        {
          label: 'Save', primary: true, onClick: function () {
            var el = document.getElementById('renameInput');
            SN.renameRoom(roomId, el ? el.value : '');
            UI.renderRoomBar();
            UI.toast('Renamed to ' + SN.roomDef(roomId).name);
          }
        }
      ]
    });

    var input = document.getElementById('renameInput');
    if (!input) return;
    setTimeout(function () { input.focus(); input.select(); }, 30);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.querySelector('#modalActions .btn-play').click();
      }
    });
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /** Tapping the "new room" tile at the end of the grid. */
  UI.offerNewRoom = function () {
    var price = SN.customRoomPrice();

    if (SN.state.coins < price) {
      UI.modal({
        title: 'Not quite yet!',
        body: 'A new room costs ' + coin(price) + '. You have ' + coin(SN.state.coins) +
          ' — play a mini-game to make up the difference.',
        actions: [
          { label: 'Maybe later', ghost: true },
          { label: 'Earn coins', primary: true, onClick: function () { SN.Arcade.openRandom(); } }
        ]
      });
      return;
    }

    UI.modal({
      title: 'Add a new room?',
      body: 'A brand new, empty room — plain walls, nothing placed — for ' + coin(price) +
        '. You decide what goes in it.',
      actions: [
        { label: 'Cancel', ghost: true },
        {
          label: 'Add room', primary: true, onClick: function () {
            if (!SN.spendCoins(price)) return;
            var id = SN.addCustomRoom();
            SN.RoomSelect.render();
            UI.toast('🏠 New room added!');
            SN.RoomSelect.enter(id);
          }
        }
      ]
    });
  };

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
        // The button's own sound stands in for the panel closing behind it.
        SN.Audio.play(a.primary ? 'ui.confirm' : a.danger ? 'ui.danger' : 'ui.cancel');
        SN.Audio.suppress('ui.close', 400);
        UI.closeModal();
        if (a.onClick) a.onClick();
      });
      actions.appendChild(b);
    });

    SN.Audio.play('ui.open');
    modalOverlay.hidden = false;
    modalEl.classList.remove('is-in');
    void modalEl.offsetWidth;
    modalEl.classList.add('is-in');
  };

  UI.closeModal = function () {
    if (!modalOverlay.hidden) SN.Audio.play('ui.close');
    modalOverlay.hidden = true;
  };

  /* ── Toasts ────────────────────────────────────────────── */

  UI.toast = function (msg) {
    SN.Audio.play('ui.toast');
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    toastStack.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); }, 2400);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2900);
  };

  /* ── Settings ──────────────────────────────────────────── */

  function wireSettings() {
    // `input` rather than `change`, so the volume follows the thumb live.
    document.getElementById('volMusic').addEventListener('input', function () {
      SN.Audio.setMusic(this.value / 100);
    });
    document.getElementById('volSfx').addEventListener('input', function () {
      SN.Audio.setSfx(this.value / 100);
      // A drag fires this dozens of times; ui.preview's own 110ms floor turns
      // that into a comfortable stream of blips rather than a buzzsaw.
      SN.Audio.play('ui.preview');
    });

    document.getElementById('btnSettings').addEventListener('click', UI.openSettings);
    document.getElementById('btnCloseSettings').addEventListener('click', UI.closeSettings);

    document.getElementById('btnSwitchProfile').addEventListener('click', function () {
      UI.closeSettings();
      SN.leaveGame();
    });

    document.getElementById('btnClearRoom').addEventListener('click', function () {
      var r = SN.roomDef(SN.state.activeRoom);
      UI.closeSettings();
      UI.modal({
        title: 'Clear ' + r.name + '?',
        body: 'Every sticker in this room will be removed. Your stickers stay unlocked, and your other rooms are untouched.',
        actions: [
          { label: 'Cancel', ghost: true },
          {
            label: 'Clear room', danger: true, onClick: function () {
              SN.Room.clearRoom();
              SN.RoomSelect.render();
              UI.toast('🧹 Room cleared.');
            }
          }
        ]
      });
    });

    document.getElementById('btnDeleteRoom').addEventListener('click', function () {
      var id = SN.state.activeRoom;
      var r = SN.roomDef(id);
      UI.closeSettings();
      if (!r) return;

      if (!SN.canDeleteRoom()) {
        UI.modal({
          title: 'This is your last room',
          body: 'You need somewhere to put things! Add another room first if you want to get rid of this one.',
          actions: [{ label: 'OK', primary: true }]
        });
        return;
      }

      var placed = (SN.state.layouts[id] || []).length;
      UI.modal({
        title: 'Delete ' + r.name + '?',
        body: 'This removes the room and ' +
          (placed ? 'the <b>' + placed + '</b> thing' + (placed === 1 ? '' : 's') + ' in it' : 'everything in it') +
          '. Wallpapers and floors you bought stay yours. This cannot be undone.',
        actions: [
          { label: 'Keep it', ghost: true },
          {
            label: 'Delete room', danger: true, onClick: function () {
              SN.deleteRoom(id);
              SN.RoomSelect.show();
              UI.toast('🗑 ' + r.name + ' deleted.');
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
              UI.renderRoomBar();
              SN.Tray.render();
              SN.RoomSelect.show();
              UI.toast('↺ Fresh start!');
            }
          }
        ]
      });
    });
  }

  UI.openSettings = function () {
    SN.Audio.play('ui.open');

    // Settings opens from the room grid too, where "this room" means nothing.
    var inRoom = !document.getElementById('app').hidden;
    document.getElementById('btnClearRoom').hidden = !inRoom;
    document.getElementById('btnDeleteRoom').hidden = !inRoom;

    // Keep the sliders honest — volume can have changed from anywhere.
    var vol = SN.Audio.get();
    document.getElementById('volMusic').value = Math.round(vol.music * 100);
    document.getElementById('volSfx').value = Math.round(vol.sfx * 100);

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

  UI.closeSettings = function () {
    if (!settingsOverlay.hidden) SN.Audio.play('ui.close');
    settingsOverlay.hidden = true;
  };

  function stat(label, value) {
    return '<div class="stat-cell"><b>' + value + '</b><span>' + label + '</span></div>';
  }

  function coin(n) {
    return '<span class="coin-inline"><span class="coin-icon coin-icon-sm"></span>' + n + '</span>';
  }

})(window.SN = window.SN || {});
