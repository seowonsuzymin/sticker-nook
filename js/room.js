/* ============================================================
   The room stage: placed stickers + all direct manipulation
   ------------------------------------------------------------
   A placement is { uid, id, x, y, size, rot, flip, z } where
   x/y are fractions of the stage (0–1), size is a fraction of the
   stage width, and rot is degrees.
   ============================================================ */
(function (SN) {
  'use strict';

  var MIN_SIZE = 0.04, MAX_SIZE = 0.62;
  var EDGE = 0.02;              // keep sticker centres just inside the stage

  /* The room is drawn in orthographic isometric: both floor axes and both
     wall top/bottom edges run at the same angle, atan(135/460). A sticker
     is put onto one of those planes by shearing it to that angle — verticals
     stay vertical, horizontals follow the surface. */
  var ISO_DEG = Math.atan2(135, 460) * 180 / Math.PI;   // ≈ 16.35°

  var stage, roomLayer, layer, hint;
  var selectedUid = null;

  var Room = SN.Room = {};

  /* ── Setup ─────────────────────────────────────────────── */

  Room.init = function () {
    stage = document.getElementById('stage');
    roomLayer = document.getElementById('roomLayer');
    layer = document.getElementById('stickerLayer');
    hint = document.getElementById('stageHint');

    // Click on empty room space clears the selection.
    stage.addEventListener('pointerdown', function (e) {
      if (e.target === stage || e.target === layer || roomLayer.contains(e.target)) {
        Room.select(null);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (selectedUid == null) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        Room.remove(selectedUid);
      } else if (e.key === 'Escape') {
        Room.select(null);
      }
    });

    Room.render();
  };

  /* ── Rendering ─────────────────────────────────────────── */

  Room.render = function () {
    var theme = SN.roomDef(SN.state.activeRoom);
    roomLayer.innerHTML = SN.buildRoom(theme);
    stage.dataset.mood = theme.mood;

    layer.innerHTML = '';
    selectedUid = null;
    SN.currentLayout()
      .slice()
      .sort(function (a, b) { return a.z - b.z; })
      .forEach(function (p) { layer.appendChild(buildStickerEl(p)); });

    updateHint();
  };

  function updateHint() {
    hint.hidden = SN.currentLayout().length > 0;
  }

  function buildStickerEl(p) {
    var el = document.createElement('div');
    el.className = 'sticker';
    el.dataset.uid = p.uid;
    el.innerHTML =
      '<div class="sticker-shadow"></div>' +
      '<div class="sticker-art">' + SN.stickerSVG(p.id) + '</div>' +
      '<div class="sticker-frame">' +
      '<button class="s-handle s-del"    title="Delete"      aria-label="Delete sticker">✕</button>' +
      '<button class="s-handle s-flip"   title="Flip"        aria-label="Flip sticker">⇄</button>' +
      '<div    class="s-handle s-rot"    title="Rotate"      aria-label="Rotate sticker">⟳</div>' +
      '<div    class="s-handle s-size"   title="Resize"      aria-label="Resize sticker">⤡</div>' +
      '</div>';
    applyTransform(el, p);
    attachHandlers(el, p);
    return el;
  }

  /**
   * Which surface a point sits on, from its place in the room. Walls are
   * tested first — they sit above the floor line — and anything that isn't
   * on one is treated as floor.
   */
  function surfaceAt(x, y) {
    var g = SN.GEO;
    var gx = x * g.W, gy = y * g.H;

    // Each wall is a parallelogram hanging off the inner corner CT: `b` runs
    // out along the top edge (±460, 135), `a` down the corner edge (0, 390).
    var side = gx < g.CT[0] ? -1 : 1;
    var b = side * (gx - g.CT[0]) / 460;
    var a = (gy - g.CT[1] - 135 * b) / 390;

    // Anything within a wall's span and no lower than its skirting is on that
    // wall — including pieces hung above the wall top, like a garland strung
    // near the ceiling. Only what sits below the skirting is on the floor.
    if (b >= 0 && b <= 1 && a <= 1) return side < 0 ? 'wall-left' : 'wall-right';

    return 'floor';
  }

  /**
   * Depth for stacking: how far forward the sticker's *base* sits, not its
   * centre — that's what decides which of two overlapping pieces is nearer.
   * Sticker art stands on the ground line ISO.GY rather than the bottom of its
   * box, so the base is that far below the centre.
   *
   * Three bands keep the obvious cases right regardless of depth: walls are
   * behind the whole room, floor coverings lie under everything standing on
   * them, and standing pieces sort against each other by depth.
   */
  function depthZ(p, surface) {
    var drop = (SN.ISO.GY / 100 - 0.5) * (SN.GEO.W / SN.GEO.H);
    var base = p.y + p.size * drop;
    if (surface !== 'floor') return 100 + Math.round(base * 100);
    var st = SN.STICKER_BY_ID[p.id];
    return (st && st.flat ? 300 : 1000) + Math.round(base * 2000);
  }

  // Shared with the hex-grid miniatures in art.js, so a room's thumbnail
  // orients and stacks its pieces exactly the way the real room does.
  SN.surfaceAt = surfaceAt;
  SN.stickerDepth = depthZ;
  SN.ISO_DEG = ISO_DEG;

  function applyTransform(el, p) {
    var surface = surfaceAt(p.x, p.y);
    var onFloor = surface === 'floor';

    // Sticker art is already drawn isometric, so a piece standing on the floor
    // needs no shear — it's in the right projection as it is, and the flip
    // handle turns it between the two floor axes. Wall pieces are drawn flat
    // and front-on, so they get sheared into the plane of the wall they're on.
    var skew = surface === 'wall-left' ? -ISO_DEG
      : surface === 'wall-right' ? ISO_DEG
        : 0;

    el.style.left = (p.x * 100) + '%';
    el.style.top = (p.y * 100) + '%';
    el.style.width = (p.size * 100) + '%';
    el.style.zIndex = depthZ(p, surface);
    el.style.transform = 'translate(-50%, -50%)';
    el.classList.toggle('on-floor', onFloor);

    // Plane shear outermost, so the piece is rotated in its own plane and
    // only then laid onto the surface.
    el.querySelector('.sticker-art').style.transform =
      (skew ? 'skewY(' + skew.toFixed(3) + 'deg) ' : '') +
      'rotate(' + p.rot + 'deg)' + (p.flip ? ' scaleX(-1)' : '');
  }

  function findPlacement(uid) {
    var list = SN.currentLayout();
    for (var i = 0; i < list.length; i++) if (list[i].uid === uid) return list[i];
    return null;
  }

  function elFor(uid) { return layer.querySelector('.sticker[data-uid="' + uid + '"]'); }

  function topZ() {
    return SN.currentLayout().reduce(function (m, p) { return Math.max(m, p.z); }, 0);
  }

  /* ── Selection ─────────────────────────────────────────── */

  Room.select = function (uid) {
    if (selectedUid === uid) return;
    var prev = selectedUid != null && elFor(selectedUid);
    if (prev) prev.classList.remove('is-selected');
    selectedUid = uid;
    var next = uid != null && elFor(uid);
    if (next) next.classList.add('is-selected');
  };

  Room.remove = function (uid) {
    var list = SN.currentLayout();
    var i = list.findIndex(function (p) { return p.uid === uid; });
    if (i === -1) return;
    var el = elFor(uid);
    list.splice(i, 1);
    if (selectedUid === uid) selectedUid = null;
    if (el) {
      el.classList.add('is-poofing');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }
    SN.save();
    SN.emit('layout');
    updateHint();
  };

  Room.clearRoom = function () {
    SN.state.layouts[SN.state.activeRoom] = [];
    SN.save();
    SN.emit('layout');
    Room.render();
  };

  /* ── Adding ────────────────────────────────────────────── */

  Room.add = function (stickerId, xFrac, yFrac) {
    var def = SN.STICKER_BY_ID[stickerId];
    if (!def || !SN.owns(stickerId)) return null;

    var p = {
      uid: SN.state.nextUid++,
      id: stickerId,
      x: SN.clamp(xFrac, EDGE, 1 - EDGE),
      y: SN.clamp(yFrac, EDGE, 1 - EDGE),
      size: def.size,
      rot: 0,
      flip: 0,
      z: topZ() + 1
    };
    SN.currentLayout().push(p);
    var el = buildStickerEl(p);
    el.classList.add('is-popping');
    layer.appendChild(el);
    setTimeout(function () { el.classList.remove('is-popping'); }, 300);
    Room.select(p.uid);
    SN.save();
    SN.emit('layout');
    updateHint();
    return p;
  };

  /* ── Direct manipulation ───────────────────────────────── */

  function stageRect() { return stage.getBoundingClientRect(); }

  function centerPx(p, r) {
    return { x: r.left + p.x * r.width, y: r.top + p.y * r.height };
  }

  function attachHandlers(el, p) {
    var art = el.querySelector('.sticker-art');

    // ── move ──
    art.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      var live = findPlacement(p.uid);
      if (!live) return;

      Room.select(live.uid);
      live.z = topZ() + 1;
      el.style.zIndex = live.z;

      var r = stageRect();
      var grabDX = live.x - (e.clientX - r.left) / r.width;
      var grabDY = live.y - (e.clientY - r.top) / r.height;
      var moved = false;

      drag(el, e, function (ev) {
        var rr = stageRect();
        live.x = SN.clamp((ev.clientX - rr.left) / rr.width + grabDX, EDGE, 1 - EDGE);
        live.y = SN.clamp((ev.clientY - rr.top) / rr.height + grabDY, EDGE, 1 - EDGE);
        applyTransform(el, live);
        moved = true;
      }, function () {
        if (moved) SN.save();
      });
    });

    // ── resize ──
    el.querySelector('.s-size').addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var live = findPlacement(p.uid);
      if (!live) return;

      var r = stageRect();
      var c = centerPx(live, r);
      var startDist = Math.hypot(e.clientX - c.x, e.clientY - c.y) || 1;
      var startSize = live.size;

      drag(el, e, function (ev) {
        var rr = stageRect();
        var cc = centerPx(live, rr);
        var d = Math.hypot(ev.clientX - cc.x, ev.clientY - cc.y);
        live.size = SN.clamp(startSize * (d / startDist), MIN_SIZE, MAX_SIZE);
        applyTransform(el, live);
      }, function () { SN.save(); });
    });

    // ── rotate ──
    el.querySelector('.s-rot').addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var live = findPlacement(p.uid);
      if (!live) return;

      var r = stageRect();
      var c = centerPx(live, r);
      var startAngle = Math.atan2(e.clientY - c.y, e.clientX - c.x);
      var startRot = live.rot;

      drag(el, e, function (ev) {
        var rr = stageRect();
        var cc = centerPx(live, rr);
        var a = Math.atan2(ev.clientY - cc.y, ev.clientX - cc.x);
        var deg = startRot + (a - startAngle) * 180 / Math.PI;
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15;   // hold Shift to snap
        live.rot = Math.round(deg * 10) / 10;
        applyTransform(el, live);
      }, function () { SN.save(); });
    });

    // ── flip / delete ──
    el.querySelector('.s-flip').addEventListener('pointerdown', stopIt);
    el.querySelector('.s-flip').addEventListener('click', function (e) {
      e.stopPropagation();
      var live = findPlacement(p.uid);
      if (!live) return;
      live.flip = live.flip ? 0 : 1;
      applyTransform(el, live);
      SN.save();
    });

    el.querySelector('.s-del').addEventListener('pointerdown', stopIt);
    el.querySelector('.s-del').addEventListener('click', function (e) {
      e.stopPropagation();
      Room.remove(p.uid);
    });
  }

  function stopIt(e) { e.stopPropagation(); }

  /** Shared pointer-capture drag loop. */
  function drag(el, downEvent, onMove, onEnd) {
    var id = downEvent.pointerId;
    try { el.setPointerCapture(id); } catch (err) { /* not all browsers */ }
    document.body.classList.add('is-dragging');

    function move(ev) { if (ev.pointerId === id) onMove(ev); }
    function up(ev) {
      if (ev.pointerId !== id) return;
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      try { el.releasePointerCapture(id); } catch (err) { /* ignore */ }
      document.body.classList.remove('is-dragging');
      if (onEnd) onEnd();
    }
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /* ── Dragging a sticker out of the tray ────────────────── */

  /**
   * Called by the tray on pointerdown. Once the pointer has actually moved,
   * a ghost follows it and dropping inside the stage places the sticker there.
   * The ghost is created lazily so that a horizontal swipe still scrolls the
   * tray (the browser fires pointercancel and we bow out).
   * A plain tap drops the sticker in the middle of the room.
   */
  Room.beginTrayDrag = function (stickerId, downEvent, sourceEl) {
    var def = SN.STICKER_BY_ID[stickerId];
    if (!def) return;

    var id = downEvent.pointerId;
    var startX = downEvent.clientX, startY = downEvent.clientY;
    var ghost = null, px = 0, moved = false, cancelled = false;

    function makeGhost() {
      px = def.size * stageRect().width;
      ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.innerHTML = SN.stickerSVG(stickerId);
      ghost.style.width = px + 'px';
      ghost.style.height = px + 'px';
      document.body.appendChild(ghost);
      document.body.classList.add('is-dragging');
    }

    function place(x, y) {
      ghost.style.transform = 'translate(' + (x - px / 2) + 'px,' + (y - px / 2) + 'px)';
    }

    function move(ev) {
      if (ev.pointerId !== id) return;
      if (!moved) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) <= 6) return;
        moved = true;
        makeGhost();
      }
      place(ev.clientX, ev.clientY);
      stage.classList.toggle('is-drop-target', inStage(ev));
    }

    function up(ev) {
      if (ev.pointerId !== id) return;
      var inside = inStage(ev);
      cleanup();
      if (cancelled) return;

      if (moved && inside) {
        var rr = stageRect();
        Room.add(stickerId, (ev.clientX - rr.left) / rr.width, (ev.clientY - rr.top) / rr.height);
      } else if (!moved) {
        Room.add(stickerId, 0.5, 0.5);       // simple tap → drop in the middle
      }
    }

    function cancel(ev) {
      if (ev.pointerId !== id) return;
      cancelled = true;
      cleanup();
    }

    function inStage(ev) {
      var rr = stageRect();
      return ev.clientX >= rr.left && ev.clientX <= rr.right &&
        ev.clientY >= rr.top && ev.clientY <= rr.bottom;
    }

    function cleanup() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      document.body.classList.remove('is-dragging');
      stage.classList.remove('is-drop-target');
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };

})(window.SN = window.SN || {});
