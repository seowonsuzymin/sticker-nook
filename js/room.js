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
      '<button class="s-handle s-layer" aria-label="Change stacking order">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect class="s-layer-back"  x="3.5" y="3.5" width="13" height="13" rx="3.5"/>' +
      '<rect class="s-layer-front" x="7.5" y="7.5" width="13" height="13" rx="3.5"/>' +
      '</svg></button>' +
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
   * Pieces fall into bands, and sort by depth within their band. Walls sit
   * behind the whole room and floor coverings under everything standing on
   * them; the stacking button can lift a piece clear of the lot or tuck it
   * under. Bands are spaced wider than the depth range so one can never bleed
   * into the next.
   */
  var BAND = { back: 1000, wall: 4000, flat: 7000, stand: 10000, front: 14000 };

  function depthZ(p, surface) {
    // Books belong to their shelf, so they ride its depth rather than
    // sorting on their own — otherwise a shelf would paint over its books,
    // its base being nearer the viewer than theirs.
    if (p.on != null && !p.layer) {
      var host = findPlacement(p.on);
      if (host) return depthZ(host, surfaceAt(host.x, host.y)) + 1 + (p.slot || 0);
    }
    var drop = (SN.ISO.GY / 100 - 0.5) * (SN.GEO.W / SN.GEO.H);
    var base = p.y + p.size * drop;
    var band = p.layer > 0 ? BAND.front
      : p.layer < 0 ? BAND.back
        : surface !== 'floor' ? BAND.wall
          : (SN.STICKER_BY_ID[p.id] || {}).flat ? BAND.flat : BAND.stand;
    return band + Math.round(base * 1000);
  }

  /* ── Shelving ──────────────────────────────────────────────
     A shelved piece keeps no position of its own: `on` names its host and
     `slot` which shelf. Everything else is derived, so books follow their
     bookshelf when it's moved, resized, turned or flipped. */

  function aspect() { return SN.GEO.W / SN.GEO.H; }

  /** A point in a placement's own 100-box → stage fractions. */
  function fromLocal(host, lx, ly) {
    var ox = (host.flip ? 100 - lx : lx) - 50, oy = ly - 50;
    var a = host.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return {
      x: host.x + (ox * c - oy * s) / 100 * host.size,
      y: host.y + (ox * s + oy * c) / 100 * host.size * aspect()
    };
  }

  /** Stage fractions → a point in a placement's own 100-box. */
  function toLocal(host, x, y) {
    var dx = (x - host.x) / host.size * 100;
    var dy = (y - host.y) / (host.size * aspect()) * 100;
    var a = -host.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    var lx = dx * c - dy * s + 50, ly = dx * s + dy * c + 50;
    return { x: host.flip ? 100 - lx : lx, y: ly };
  }

  /**
   * Where a placement is actually drawn. For a shelved piece that's its
   * host's slot; for everything else it's the placement itself. Falls back
   * to the stored position if the host has gone.
   */
  function resolved(p) {
    if (p.on == null) return p;
    var host = findPlacement(p.on);
    var hd = host && SN.STICKER_BY_ID[host.id];
    var gd = SN.STICKER_BY_ID[p.id];
    var slot = hd && hd.shelves && hd.shelves[p.slot];
    if (!slot || !gd || !gd.anchor) return p;

    var scale = hd.shelfSpan / gd.span;                 // guest box / host box
    var at = fromLocal(host,
      slot[0] - (gd.anchor[0] - 50) * scale,
      slot[1] - (gd.anchor[1] - 50) * scale);

    return {
      uid: p.uid, id: p.id, on: p.on, slot: p.slot, layer: p.layer, z: p.z,
      x: at.x, y: at.y, size: host.size * scale, rot: host.rot, flip: host.flip
    };
  }

  /** Is this slot already taken by something other than `self`? */
  function slotTaken(hostUid, slot, self) {
    return SN.currentLayout().some(function (q) {
      return q.uid !== self && q.on === hostUid && q.slot === slot;
    });
  }

  /**
   * The free slot nearest to where a shelvable piece was dropped, or null.
   * Only slots on a host the drop actually landed inside are considered.
   */
  function slotUnder(p, x, y) {
    var gd = SN.STICKER_BY_ID[p.id];
    if (!gd || !gd.shelvable) return null;

    var best = null;
    SN.currentLayout().forEach(function (h) {
      if (h.uid === p.uid || h.on != null) return;
      var hd = SN.STICKER_BY_ID[h.id];
      if (!hd || !hd.shelves) return;

      var l = toLocal(h, x, y);
      if (l.x < 0 || l.x > 100 || l.y < 0 || l.y > 100) return;

      hd.shelves.forEach(function (sl, i) {
        if (slotTaken(h.uid, i, p.uid)) return;
        var d = Math.hypot(l.x - sl[0], l.y - sl[1]);
        if (!best || d < best.d) best = { uid: h.uid, slot: i, d: d };
      });
    });
    return best;
  }

  /** Settle a piece into a shelf if it was dropped on one. */
  function trySnap(live) {
    var hit = slotUnder(live, live.x, live.y);
    if (!hit) return false;
    live.on = hit.uid;
    live.slot = hit.slot;
    // Covers both snap paths — dropped from the tray and dragged across.
    SN.Audio.play('sticker.snap');
    SN.Audio.suppress('sticker.drop', 300);
    SN.Audio.suppress('sticker.place', 300);
    return true;
  }

  /** Lift a piece off its shelf, leaving it where it visually was. */
  function unshelve(live) {
    if (live.on == null) return;
    var r = resolved(live);
    live.x = r.x; live.y = r.y; live.size = r.size; live.rot = r.rot;
    live.on = null; live.slot = 0;
  }

  /** front → behind → automatic, and round again. */
  var LAYER_MODES = [
    { v: 0, cls: '', title: 'Automatic order — tap to bring to the front', toast: '↕ Back to automatic order.' },
    { v: 1, cls: 'is-front', title: 'In front of everything — tap to send behind', toast: '⬆ Brought to the front.' },
    { v: -1, cls: 'is-back', title: 'Behind everything — tap for automatic order', toast: '⬇ Sent to the back.' }
  ];
  function layerMode(p) { return LAYER_MODES[p.layer > 0 ? 1 : p.layer < 0 ? 2 : 0]; }

  // Shared with the hex-grid miniatures in art.js, so a room's thumbnail
  // orients and stacks its pieces exactly the way the real room does.
  SN.surfaceAt = surfaceAt;
  SN.stickerDepth = depthZ;
  SN.ISO_DEG = ISO_DEG;

  function applyTransform(el, placement) {
    var p = resolved(placement);
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
    el.classList.toggle('is-shelved', placement.on != null);

    var mode = layerMode(placement), btn = el.querySelector('.s-layer');
    btn.classList.toggle('is-front', mode.cls === 'is-front');
    btn.classList.toggle('is-back', mode.cls === 'is-back');
    btn.title = mode.title;

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
    SN.Audio.play('sticker.remove');
    // anything shelved here keeps its spot in the room instead of vanishing
    list.forEach(function (q) { if (q.on === uid) unshelve(q); });
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
    // Bulk clear doesn't go through Room.remove, so it needs its own sweep.
    SN.Audio.play('sticker.remove');
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
      layer: 0,
      on: null,
      slot: 0,
      z: topZ() + 1
    };
    // trySnap plays its own sound and mutes this one when it lands on a shelf.
    trySnap(p);
    SN.Audio.play('sticker.place');
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
      applyTransform(el, live);

      var r = stageRect();
      var from = resolved(live);          // a shelved piece drags from where it looks
      var grabDX = from.x - (e.clientX - r.left) / r.width;
      var grabDY = from.y - (e.clientY - r.top) / r.height;
      var moved = false;

      drag(el, e, function (ev) {
        if (!moved) {
          unshelve(live);                 // a tap selects; only a drag lifts it off
          SN.Audio.play('sticker.pick');  // the latch makes this once per drag
        }
        moved = true;
        var rr = stageRect();
        live.x = SN.clamp((ev.clientX - rr.left) / rr.width + grabDX, EDGE, 1 - EDGE);
        live.y = SN.clamp((ev.clientY - rr.top) / rr.height + grabDY, EDGE, 1 - EDGE);
        applyTransform(el, live);
      }, function () {
        if (!moved) return;
        if (!trySnap(live)) SN.Audio.play('sticker.drop');
        applyTransform(el, live);
        SN.save();
      });
    });

    // ── resize ──
    el.querySelector('.s-size').addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var live = findPlacement(p.uid);
      if (!live) return;

      var r = stageRect();
      var from = resolved(live);
      var c = centerPx(from, r);
      var startDist = Math.hypot(e.clientX - c.x, e.clientY - c.y) || 1;
      var startSize = from.size;

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
      var from = resolved(live);
      var c = centerPx(from, r);
      var startAngle = Math.atan2(e.clientY - c.y, e.clientX - c.x);
      var startRot = from.rot;

      var lastDetent = null;

      drag(el, e, function (ev) {
        var rr = stageRect();
        var cc = centerPx(live, rr);
        var a = Math.atan2(ev.clientY - cc.y, ev.clientX - cc.x);
        var deg = startRot + (a - startAngle) * 180 / Math.PI;
        if (ev.shiftKey) {
          var detent = Math.round(deg / 15);                // hold Shift to snap
          deg = detent * 15;
          // Tick when the detent changes, not on every pointermove.
          if (detent !== lastDetent) {
            if (lastDetent !== null) SN.Audio.play('sticker.detent');
            lastDetent = detent;
          }
        } else {
          lastDetent = null;
        }
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
      SN.Audio.play('sticker.flip');
      applyTransform(el, live);
      SN.save();
    });

    el.querySelector('.s-layer').addEventListener('pointerdown', stopIt);
    el.querySelector('.s-layer').addEventListener('click', function (e) {
      e.stopPropagation();
      var live = findPlacement(p.uid);
      if (!live) return;
      var next = LAYER_MODES[(LAYER_MODES.indexOf(layerMode(live)) + 1) % LAYER_MODES.length];
      live.layer = next.v;
      // Pitch says which way it went: up for front, down for back, flat for auto.
      SN.Audio.play('sticker.layer', { step: next.v * 5 });
      applyTransform(el, live);
      SN.save();
      SN.UI.toast(next.toast);
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
    var wasOver = false;      // so the drop-target tick fires on entry, not per move

    function makeGhost() {
      SN.Audio.play('sticker.pick');
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
      var over = inStage(ev);
      // Edge detection: this runs 60-120 times a second, so only speak when
      // the answer actually changes.
      if (over !== wasOver) {
        if (over) SN.Audio.play('sticker.hover');
        wasOver = over;
      }
      stage.classList.toggle('is-drop-target', over);
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
