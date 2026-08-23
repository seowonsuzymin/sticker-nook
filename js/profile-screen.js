/* ============================================================
   The "choose your nook" screen shown before the game starts
   ============================================================ */
(function (SN) {
  'use strict';

  var screenEl, slotsEl, dlgEl, nameEl, colorsEl;
  var pendingColor = 'pink';

  var PS = SN.ProfileScreen = {};

  PS.init = function () {
    screenEl = document.getElementById('profileScreen');
    slotsEl = document.getElementById('psSlots');
    dlgEl = document.getElementById('newProfileOverlay');
    nameEl = document.getElementById('npName');
    colorsEl = document.getElementById('npColors');

    document.getElementById('npCancel').addEventListener('click', closeDialog);
    document.getElementById('npCreate').addEventListener('click', createFromDialog);
    nameEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') createFromDialog();
      if (e.key === 'Escape') closeDialog();
    });
    dlgEl.addEventListener('pointerdown', function (e) {
      if (e.target === dlgEl) closeDialog();
    });
  };

  PS.show = function () {
    screenEl.hidden = false;
    document.getElementById('app').hidden = true;
    PS.render();
  };

  PS.hide = function () {
    screenEl.hidden = true;
    document.getElementById('app').hidden = false;
  };

  /* ── Slot cards ────────────────────────────────────────── */

  PS.render = function () {
    var profiles = SN.Profiles.all();
    var cards = profiles.map(filledCard);

    for (var i = profiles.length; i < SN.MAX_PROFILES; i++) cards.push(emptyCard());
    slotsEl.innerHTML = cards.join('');

    slotsEl.querySelectorAll('.ps-slot.is-filled').forEach(function (el) {
      el.addEventListener('click', function () { SN.enterGame(el.dataset.id); });
      el.querySelector('.ps-del').addEventListener('click', function (e) {
        e.stopPropagation();
        confirmDelete(el.dataset.id);
      });
    });
    slotsEl.querySelectorAll('.ps-slot.is-empty').forEach(function (el) {
      el.addEventListener('click', openDialog);
    });
  };

  function filledCard(p) {
    var c = SN.Profiles.colorFor(p.color);
    var s = SN.Profiles.summary(p.id);
    return '<div class="ps-slot is-filled" data-id="' + p.id + '" style="--chip:' + c.chip + '">' +
      '<button class="ps-del" title="Delete this nook" aria-label="Delete ' + esc(p.name) + '">✕</button>' +
      '<div class="ps-avatar">' + SN.avatarSVG(c) + '</div>' +
      '<div class="ps-name">' + esc(p.name) + '</div>' +
      '<div class="ps-stats">' +
      '<span><span class="coin-icon coin-icon-sm"></span>' + s.coins + '</span>' +
      '<span>' + s.owned + '/' + SN.STICKERS.length + ' stickers</span>' +
      '<span>' + s.rooms + '/' + SN.ROOMS.length + ' rooms</span>' +
      '</div>' +
      '<div class="ps-last">' + SN.Profiles.lastPlayedLabel(p) + '</div>' +
      '<div class="ps-play">Play</div>' +
      '</div>';
  }

  function emptyCard() {
    return '<button class="ps-slot is-empty">' +
      '<span class="ps-plus">+</span>' +
      '<span class="ps-empty-label">New Nook</span>' +
      '<span class="ps-empty-sub">Start a fresh save</span>' +
      '</button>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  /* ── New-profile dialog ────────────────────────────────── */

  function openDialog() {
    pendingColor = SN.PROFILE_COLORS[SN.Profiles.count() % SN.PROFILE_COLORS.length].id;
    nameEl.value = '';
    nameEl.placeholder = 'My Nook';
    renderColors();
    dlgEl.hidden = false;
    setTimeout(function () { nameEl.focus(); }, 30);
  }

  function closeDialog() { dlgEl.hidden = true; }

  function renderColors() {
    colorsEl.innerHTML = SN.PROFILE_COLORS.map(function (c) {
      return '<button class="np-color' + (c.id === pendingColor ? ' is-active' : '') +
        '" data-color="' + c.id + '" title="' + c.name + '" aria-label="' + c.name + '" ' +
        'style="--chip:' + c.chip + '"></button>';
    }).join('');
    colorsEl.querySelectorAll('.np-color').forEach(function (b) {
      b.addEventListener('click', function () {
        pendingColor = b.dataset.color;
        renderColors();
      });
    });
  }

  function createFromDialog() {
    var p = SN.Profiles.create(nameEl.value, pendingColor);
    if (!p) return;
    closeDialog();
    SN.enterGame(p.id);
  }

  /* ── Deleting ──────────────────────────────────────────── */

  function confirmDelete(id) {
    var p = SN.Profiles.get(id);
    if (!p) return;
    var s = SN.Profiles.summary(id);
    SN.UI.modal({
      art: SN.avatarSVG(SN.Profiles.colorFor(p.color)),
      title: 'Delete ' + p.name + '?',
      body: 'This nook has ' + s.coins + ' coins, ' + s.owned + ' stickers and ' +
        s.placed + ' placed decorations. Deleting it cannot be undone — your other nooks are unaffected.',
      actions: [
        { label: 'Keep it', ghost: true },
        {
          label: 'Delete', danger: true, onClick: function () {
            SN.Profiles.remove(id);
            PS.render();
            SN.UI.toast('Nook deleted.');
          }
        }
      ]
    });
  }

})(window.SN = window.SN || {});
