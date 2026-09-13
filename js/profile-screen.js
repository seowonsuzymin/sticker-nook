/* ============================================================
   The "choose your nook" screen shown before the game starts
   ============================================================ */
(function (SN) {
  'use strict';

  var screenEl, slotsEl, countEl, dlgEl, nameEl, colorsEl, charsEl;
  var pendingColor = 'pink';
  var pendingChar = 'girl';

  var PS = SN.ProfileScreen = {};

  PS.init = function () {
    screenEl = document.getElementById('profileScreen');
    slotsEl = document.getElementById('psSlots');
    countEl = document.getElementById('psCount');
    dlgEl = document.getElementById('newProfileOverlay');
    nameEl = document.getElementById('npName');
    colorsEl = document.getElementById('npColors');
    charsEl = document.getElementById('npChars');

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
    // The picker sits above everything, so it takes down both game screens
    // itself rather than trusting the caller to have done it.
    screenEl.hidden = false;
    document.getElementById('app').hidden = true;
    document.getElementById('roomSelect').hidden = true;
    PS.render();
  };

  PS.hide = function () {
    screenEl.hidden = true;
    document.getElementById('app').hidden = false;
  };

  /* ── Slot cards ────────────────────────────────────────── */

  PS.render = function () {
    var profiles = SN.Profiles.all();
    // Every nook, then a single tile to add one more — there's no slot limit.
    slotsEl.innerHTML = profiles.map(filledCard).join('') + emptyCard();
    if (countEl) {
      countEl.textContent = profiles.length
        ? profiles.length + (profiles.length === 1 ? ' nook' : ' nooks')
        : '';
    }

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
      '<div class="ps-avatar">' + SN.avatarSVG(c, p.character) + '</div>' +
      '<div class="ps-name">' + esc(p.name) + '</div>' +
      '<div class="ps-stats">' +
      '<span><span class="coin-icon coin-icon-sm"></span>' + s.coins + '</span>' +
      '<span>' + s.owned + '/' + SN.STICKERS.length + ' stickers</span>' +
      '<span>' + s.rooms + ' room' + (s.rooms === 1 ? '' : 's') + '</span>' +
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
    var n = SN.Profiles.count();   // wraps, so nook six starts the palette again
    pendingColor = SN.PROFILE_COLORS[n % SN.PROFILE_COLORS.length].id;
    pendingChar = SN.CHARACTERS[n % SN.CHARACTERS.length].id;
    nameEl.value = '';
    nameEl.placeholder = 'My Nook';
    renderChars();
    renderColors();
    dlgEl.hidden = false;
    setTimeout(function () { nameEl.focus(); }, 30);
  }

  function closeDialog() { dlgEl.hidden = true; }

  function renderChars() {
    var c = SN.Profiles.colorFor(pendingColor);
    charsEl.innerHTML = SN.CHARACTERS.map(function (ch) {
      return '<button class="np-char' + (ch.id === pendingChar ? ' is-active' : '') +
        '" data-char="' + ch.id + '" aria-label="' + ch.name + '">' +
        '<span class="np-char-art">' + SN.avatarSVG(c, ch.id) + '</span>' +
        '<span class="np-char-name">' + ch.name + '</span>' +
        '</button>';
    }).join('');
    charsEl.querySelectorAll('.np-char').forEach(function (b) {
      b.addEventListener('click', function () {
        pendingChar = b.dataset.char;
        renderChars();
      });
    });
  }

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
        renderChars();          // tiles preview the newly picked colour
      });
    });
  }

  function createFromDialog() {
    var p = SN.Profiles.create(nameEl.value, pendingColor, pendingChar);
    if (!p) {
      closeDialog();
      SN.UI.modal({
        title: 'No room to save',
        body: 'This browser won\'t store another nook — its storage is full. ' +
          'Deleting a nook you\'ve finished with will make space for a new one.'
      });
      return;
    }
    closeDialog();
    SN.enterGame(p.id);
  }

  /* ── Deleting ──────────────────────────────────────────── */

  function confirmDelete(id) {
    var p = SN.Profiles.get(id);
    if (!p) return;
    var s = SN.Profiles.summary(id);
    SN.UI.modal({
      art: SN.avatarSVG(SN.Profiles.colorFor(p.color), p.character),
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
