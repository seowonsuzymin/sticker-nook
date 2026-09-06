/* ============================================================
   Room select — the honeycomb of rooms you pick from
   ------------------------------------------------------------
   A fixed top bar (home / coins / settings) over a vertically
   scrolling hex grid. Every tile is a miniature of the real room —
   walls, floor and the furniture actually in it — with a round
   decorate button hanging off the bottom edge. Nothing is locked:
   coins buy what goes in a room, and extra rooms past the first five.

   Tiles can be rearranged by dragging one onto another, which swaps
   their places. Swapping rather than inserting keeps the honeycomb
   stable — an insert would reflow every row after it. On touch a drag
   starts with a short hold, so an ordinary swipe still scrolls the
   grid; with a mouse a few pixels of movement is enough.

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
      var layout = SN.state.layouts[id] || [];
      var s = slot(i);

      return '<div class="hex" data-room="' + esc(id) + '" ' +
        'style="--row:' + s.row + ';--col:' + s.col + ';--off:' + s.off + '">' +
        SN.hexRoom(def, layout) +
        '<div class="hex-name">' + esc(def.name) + '</div>' +
        '<button class="hex-go" data-go="' + esc(id) + '" ' +
        'title="Decorate ' + esc(def.name) + '" aria-label="Decorate ' + esc(def.name) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M4 20 L4.6 16 L15.4 5.2 L18.8 8.6 L8 19.4 Z M14 6.6 L17.4 10" ' +
        'fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg></button>' +
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
      el.addEventListener('pointerdown', function (e) { beginTileDrag(e, el); });
    });
    gridEl.querySelectorAll('.hex-go').forEach(function (b) {
      // Must not start a tile drag — this button has its own job.
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        enter(b.dataset.go);
      });
    });

    // Give the two tiles that just traded places a little nudge.
    swapped.forEach(function (id) {
      var el = gridEl.querySelector('.hex[data-room="' + esc(id) + '"]');
      if (el) el.classList.add('is-swapped');
    });
    swapped = [];
    gridEl.querySelectorAll('.hex.is-add').forEach(function (b) {
      b.addEventListener('click', function () { SN.UI.offerNewRoom(); });
    });
  };

  /* ── Dragging a tile onto another to swap them ─────────── */

  var swapped = [];
  var TAP_SLOP = 8;        // movement below this is still a tap, not a drag
  var HOLD_MS = 380;       // touch: hold this long to pick a tile up

  function beginTileDrag(e, el) {
    if (e.button != null && e.button !== 0) return;
    var id = el.dataset.room;
    var touch = e.pointerType === 'touch';
    var pid = e.pointerId;
    var startX = e.clientX, startY = e.clientY;
    var started = false, abandoned = false, maxDist = 0;
    var holdTimer = touch ? setTimeout(start, HOLD_MS) : null;

    function start() {
      holdTimer = null;
      if (abandoned) return;
      started = true;
      try { el.setPointerCapture(pid); } catch (err) { /* ignore */ }
      el.classList.add('is-dragging');
      document.body.classList.add('is-dragging');
    }

    function move(ev) {
      if (ev.pointerId !== pid) return;
      var dx = ev.clientX - startX, dy = ev.clientY - startY;
      maxDist = Math.max(maxDist, Math.hypot(dx, dy));

      if (!started) {
        // On touch, moving before the hold completes means they meant to
        // scroll the grid — let the browser have it.
        if (touch) {
          if (maxDist > 10) { clearTimeout(holdTimer); abandoned = true; }
          return;
        }
        if (maxDist < 6) return;
        start();
      }

      ev.preventDefault();
      el.style.setProperty('--dx', dx + 'px');
      el.style.setProperty('--dy', dy + 'px');

      var over = tileAt(ev.clientX, ev.clientY, id);
      gridEl.querySelectorAll('.hex.is-drop-target').forEach(function (t) {
        t.classList.remove('is-drop-target');
      });
      if (over) over.classList.add('is-drop-target');
    }

    function finish(ev) {
      if (ev.pointerId !== pid) return;
      cleanup();
      if (abandoned) return;

      // A hold that never moved is still just a tap.
      if (!started || maxDist < TAP_SLOP) { enter(id); return; }

      var over = tileAt(ev.clientX, ev.clientY, id);
      if (over) {
        swapped = [id, over.dataset.room];
        SN.swapRooms(id, over.dataset.room);
      }
      RS.render();
    }

    function cancel(ev) {
      if (ev.pointerId !== pid) return;
      abandoned = true;
      cleanup();
      RS.render();
    }

    function cleanup() {
      if (holdTimer) clearTimeout(holdTimer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      document.body.classList.remove('is-dragging');
      el.classList.remove('is-dragging');
      el.style.removeProperty('--dx');
      el.style.removeProperty('--dy');
      gridEl.querySelectorAll('.hex.is-drop-target').forEach(function (t) {
        t.classList.remove('is-drop-target');
      });
    }

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
  }

  /**
   * The tile under a point. Hex bounding boxes overlap, so this picks the
   * nearest centre rather than trusting elementFromPoint.
   */
  function tileAt(x, y, exceptId) {
    var best = null, bestD = Infinity;
    gridEl.querySelectorAll('.hex[data-room]').forEach(function (el) {
      if (el.dataset.room === exceptId) return;
      var r = el.getBoundingClientRect();
      var d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < bestD) { bestD = d; best = el; }
    });
    // Only count it if the pointer is actually over that tile, roughly.
    if (!best) return null;
    var w = best.getBoundingClientRect().width;
    return bestD < w * 0.55 ? best : null;
  }

  /** Open a room for decorating. */
  function enter(id) {
    if (!SN.roomDef(id)) return;
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
