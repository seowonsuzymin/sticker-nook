/* ============================================================
   Room select — the honeycomb of rooms you pick from
   ------------------------------------------------------------
   A fixed top bar (home / coins / settings) over a vertically
   scrolling hex grid. Locked rooms are a flat coloured hex with a
   lock and a LEVEL label; unlocked ones show a miniature of the
   real room — walls, floor and the furniture actually in it — with
   a round decorate button hanging off the bottom edge.

   Tiles are laid out as a proper honeycomb: rows of 3, offset rows
   of 2 tucked between them, so 5 rooms make one tidy block.
   ============================================================ */
(function (SN) {
  'use strict';

  var PER_BLOCK = 5;          // 3 on the even row + 2 on the offset row
  var screenEl, gridEl, coinEl;

  var RS = SN.RoomSelect = {};

  RS.init = function () {
    screenEl = document.getElementById('roomSelect');
    gridEl = document.getElementById('hexGrid');
    coinEl = document.getElementById('rsCoins');

    document.getElementById('rsHome').addEventListener('click', function () {
      SN.leaveGame();
    });
    document.getElementById('rsSettings').addEventListener('click', function () {
      SN.UI.openSettings();
    });
    document.getElementById('rsCoinPill').addEventListener('click', function () {
      SN.Arcade.openRandom();
    });

    SN.on('coins', RS.renderCoins);
  };

  RS.show = function () {
    screenEl.hidden = false;
    document.getElementById('app').hidden = true;
    RS.render();
  };

  RS.hide = function () {
    screenEl.hidden = true;
    document.getElementById('app').hidden = false;
  };

  RS.renderCoins = function () {
    if (coinEl && SN.state) coinEl.textContent = SN.state.coins;
  };

  /** Where tile `i` sits in the honeycomb: row, column, half-step offset. */
  function slot(i) {
    var block = Math.floor(i / PER_BLOCK), rem = i % PER_BLOCK;
    return rem < 3
      ? { row: block * 2, col: rem, off: 0 }
      : { row: block * 2 + 1, col: rem - 3, off: 1 };
  }

  RS.render = function () {
    if (!SN.state) return;
    RS.renderCoins();

    var ids = SN.state.roomOrder;
    var tiles = ids.map(function (id, i) {
      var def = SN.roomDef(id);
      if (!def) return '';
      var unlocked = SN.roomUnlocked(id);
      var layout = SN.state.layouts[id] || [];
      var s = slot(i);

      return '<div class="hex' + (unlocked ? '' : ' is-locked') + '" ' +
        'data-room="' + esc(id) + '" ' +
        'style="--row:' + s.row + ';--col:' + s.col + ';--off:' + s.off + '">' +
        SN.hexRoom(def, layout, !unlocked) +
        (unlocked
          ? '<div class="hex-name">' + esc(def.name) + '</div>' +
            '<button class="hex-go" data-go="' + esc(id) + '" ' +
            'title="Decorate ' + esc(def.name) + '" aria-label="Decorate ' + esc(def.name) + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M4 20 L4.6 16 L15.4 5.2 L18.8 8.6 L8 19.4 Z M14 6.6 L17.4 10" ' +
            'fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg></button>'
          : '<div class="hex-lock">🔒</div>' +
            '<div class="hex-level">LEVEL ' + (i + 1) + '</div>') +
        '</div>';
    });

    // One more tile on the end for buying a brand new blank room.
    var addIdx = ids.length, as = slot(addIdx);
    tiles.push('<button class="hex is-add" data-add="1" ' +
      'style="--row:' + as.row + ';--col:' + as.col + ';--off:' + as.off + '">' +
      '<svg class="hex-svg" viewBox="0 0 ' + SN.HEX_W + ' ' + SN.HEX_H + '" aria-hidden="true">' +
      '<polygon points="100,0 200,35 200,105 100,140 0,105 0,35" fill="#fff" fill-opacity=".55" ' +
      'stroke="#7a6a86" stroke-width="6" stroke-linejoin="round" stroke-dasharray="20 14"/>' +
      '</svg>' +
      '<div class="hex-plus">+</div>' +
      '<div class="hex-level is-add">NEW ROOM</div>' +
      '</button>');

    gridEl.innerHTML = tiles.join('');
    // Rows overlap by a quarter of a tile, so height is 3/4 per row plus one.
    var rows = slot(addIdx).row + 1;
    gridEl.style.setProperty('--rows', rows);

    gridEl.querySelectorAll('.hex[data-room]').forEach(function (el) {
      el.addEventListener('click', function () { pick(el.dataset.room); });
    });
    gridEl.querySelectorAll('.hex-go').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        enter(b.dataset.go);
      });
    });
    gridEl.querySelectorAll('.hex.is-add').forEach(function (b) {
      b.addEventListener('click', function () { SN.UI.offerNewRoom(); });
    });
  };

  function pick(id) {
    if (SN.roomUnlocked(id)) enter(id);
    else SN.UI.offerRoom(id);
  }

  /** Open a room for decorating. */
  function enter(id) {
    if (!SN.roomUnlocked(id)) return;
    SN.state.activeRoom = id;
    SN.save();
    RS.hide();
    SN.Room.render();
    SN.UI.renderRoomBar();
  }
  RS.enter = enter;

  function esc(v) {
    return String(v).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

})(window.SN = window.SN || {});
