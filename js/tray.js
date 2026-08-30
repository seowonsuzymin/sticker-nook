/* ============================================================
   Sticker tray — browse, buy, and drag stickers into the room
   ============================================================ */
(function (SN) {
  'use strict';

  var scroll, catsEl, countEl;
  var activeCat = 'all';

  var Tray = SN.Tray = {};

  Tray.init = function () {
    scroll = document.getElementById('trayScroll');
    catsEl = document.getElementById('trayCats');
    countEl = document.getElementById('trayCount');

    renderCats();
    Tray.render();

    // Keep affordability styling honest when the balance changes.
    SN.on('coins', Tray.render);
    SN.on('owned', Tray.render);
  };

  function renderCats() {
    catsEl.innerHTML = SN.CATEGORIES.map(function (c) {
      return '<button class="cat-chip' + (c.id === activeCat ? ' is-active' : '') +
        '" data-cat="' + c.id + '">' + c.name + '</button>';
    }).join('');

    catsEl.querySelectorAll('.cat-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        activeCat = b.dataset.cat;
        catsEl.querySelectorAll('.cat-chip').forEach(function (o) {
          o.classList.toggle('is-active', o.dataset.cat === activeCat);
        });
        Tray.render();
        scroll.scrollLeft = 0;
      });
    });
  }

  function visibleStickers() {
    return SN.STICKERS.filter(function (s) {
      return activeCat === 'all' || s.cat === activeCat;
    }).sort(function (a, b) {
      // Owned first, then cheapest-to-unlock next — the natural shopping order.
      var ao = SN.owns(a.id) ? 0 : 1, bo = SN.owns(b.id) ? 0 : 1;
      return ao !== bo ? ao - bo : a.price - b.price;
    });
  }

  Tray.render = function () {
    if (!scroll) return;
    var list = visibleStickers();

    scroll.innerHTML = list.map(function (s) {
      var owned = SN.owns(s.id);
      var afford = SN.state.coins >= s.price;
      var cls = 'tray-item' + (owned ? ' is-owned' : ' is-locked') +
        (!owned && afford ? ' is-affordable' : '');
      return '<div class="' + cls + '" data-id="' + s.id + '" title="' + s.name + '">' +
        '<div class="tray-art">' + SN.stickerSVG(s.id) +
        (owned ? '' : '<span class="tray-lock">🔒</span>') +
        '</div>' +
        '<div class="tray-name">' + s.name + '</div>' +
        (owned
          ? '<div class="tray-tag tray-tag-owned">Owned</div>'
          : '<div class="tray-tag"><span class="coin-icon coin-icon-sm"></span>' + s.price + '</div>') +
        '</div>';
    }).join('');

    var ownedCount = SN.STICKERS.filter(function (s) { return SN.owns(s.id); }).length;
    countEl.textContent = ownedCount + ' / ' + SN.STICKERS.length + ' collected';

    scroll.querySelectorAll('.tray-item').forEach(wireItem);
  };

  function wireItem(el) {
    var id = el.dataset.id;

    el.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      if (!SN.owns(id)) return;           // locked items are click-to-buy, not draggable
      SN.Room.beginTrayDrag(id, e, el);
    });

    el.addEventListener('click', function () {
      if (SN.owns(id)) return;            // owned items are handled by the drag above
      offerPurchase(id);
    });
  }

  function offerPurchase(id) {
    var s = SN.STICKER_BY_ID[id];
    if (!s) return;

    if (SN.state.coins < s.price) {
      var short = s.price - SN.state.coins;
      SN.UI.modal({
        art: SN.stickerSVG(id),
        title: 'Not quite yet!',
        body: '<b>' + s.name + '</b> costs ' + coin(s.price) + '. You need ' +
          coin(short) + ' more — play a mini-game to earn them.',
        actions: [
          { label: 'Maybe later', ghost: true },
          { label: 'Earn coins', primary: true, onClick: function () { SN.Arcade.openRandom(); } }
        ]
      });
      return;
    }

    SN.UI.modal({
      art: SN.stickerSVG(id),
      title: 'Unlock ' + s.name + '?',
      body: 'This will cost ' + coin(s.price) + '. You have ' + coin(SN.state.coins) + '.',
      actions: [
        { label: 'Cancel', ghost: true },
        {
          label: 'Unlock', primary: true, onClick: function () {
            if (!SN.spendCoins(s.price)) return;
            SN.state.owned.push(id);
            SN.save();
            SN.emit('owned');
            SN.UI.toast('✨ ' + s.name + ' unlocked! Drag it into your room.');
          }
        }
      ]
    });
  }

  function coin(n) { return '<span class="coin-inline"><span class="coin-icon coin-icon-sm"></span>' + n + '</span>'; }

})(window.SN = window.SN || {});
