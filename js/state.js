/* ============================================================
   Game state + localStorage persistence
   ------------------------------------------------------------
   Everything the player owns lives in SN.state. Call SN.save()
   after any mutation (it's debounced, so calling it often is fine).

   State is stored per save profile — the key comes from
   SN.Profiles, so switching profiles swaps the whole game state.
   ============================================================ */
(function (SN) {
  'use strict';

  var STARTING_COINS = 50;
  var CUSTOM_ROOM_BASE_PRICE = 1000;
  var CUSTOM_ROOM_PRICE_STEP = 500;

  /** localStorage key for the profile currently being played. */
  function saveKey() { return SN.Profiles.saveKey(); }

  /** Freshly-installed state. */
  function freshState() {
    var owned = SN.STICKERS.filter(function (s) { return s.price === 0; })
      .map(function (s) { return s.id; });
    var layouts = {};
    SN.ROOMS.forEach(function (r) { layouts[r.id] = []; });

    return {
      version: 1,
      coins: STARTING_COINS,
      owned: owned,
      activeRoom: SN.ROOMS[0].id,
      layouts: layouts,
      nextUid: 1,
      // Rooms the player added, keyed by id: { name, price }. The presets
      // above aren't listed here.
      customRooms: {},
      // Wallpapers and floors are bought once and can be applied to any room.
      ownedWalls: SN.WALLPAPERS.filter(function (w) { return w.price === 0; })
        .map(function (w) { return w.id; }),
      ownedFloors: SN.FLOORS.filter(function (f) { return f.price === 0; })
        .map(function (f) { return f.id; }),
      // What each room is wearing: { roomId: { wall: id, floor: id } }.
      roomStyles: {},
      // Player-chosen room names, keyed by room id. An override here wins
      // over the catalog/default name, and lives per profile so renaming a
      // preset in one nook doesn't touch another.
      roomNames: {},
      // Preset rooms the player deleted. Without this the backfill below
      // would helpfully put them right back on the next load.
      removedRooms: [],
      // The order rooms appear on the select grid.
      roomOrder: SN.ROOMS.map(function (r) { return r.id; }),
      stats: { plays: 0, bestRun: 0, bestCombo: 0, totalEarned: 0 }
    };
  }

  /**
   * Merge a loaded save over a fresh state so that stickers/rooms added
   * in a later version show up without wiping existing progress.
   */
  function migrate(raw) {
    var base = freshState();
    if (!raw || typeof raw !== 'object') return base;

    if (typeof raw.coins === 'number' && isFinite(raw.coins)) {
      base.coins = Math.max(0, Math.floor(raw.coins));
    }

    if (Array.isArray(raw.owned)) {
      raw.owned.forEach(function (id) {
        if (SN.STICKER_BY_ID[id] && base.owned.indexOf(id) === -1) base.owned.push(id);
      });
    }
    // Player-added rooms first, so everything below can ask "is this a real room?"
    base.customRooms = {};
    if (raw.customRooms && typeof raw.customRooms === 'object') {
      Object.keys(raw.customRooms).forEach(function (id) {
        var c = raw.customRooms[id];
        if (!c || typeof c !== 'object' || SN.ROOM_BY_ID[id]) return;   // never shadow a preset
        base.customRooms[id] = {
          name: String(c.name || 'New Room').slice(0, 24),
          price: Math.max(0, Math.floor(num(c.price, CUSTOM_ROOM_BASE_PRICE)))
        };
        base.layouts[id] = [];
      });
    }
    function isKnownRoom(id) { return !!SN.ROOM_BY_ID[id] || !!base.customRooms[id]; }

    // Rooms used to be unlocked one at a time; they're all available now.
    // The old list is still read below, but only to work out which looks a
    // returning player had already earned.
    var wasUnlocked = Array.isArray(raw.unlockedRooms)
      ? raw.unlockedRooms.filter(isKnownRoom)
      : SN.ROOMS.map(function (r) { return r.id; });

    if (Array.isArray(raw.ownedWalls)) {
      raw.ownedWalls.forEach(function (id) {
        if (SN.WALLPAPER_BY_ID[id] && base.ownedWalls.indexOf(id) === -1) base.ownedWalls.push(id);
      });
    }
    if (Array.isArray(raw.ownedFloors)) {
      raw.ownedFloors.forEach(function (id) {
        if (SN.FLOOR_BY_ID[id] && base.ownedFloors.indexOf(id) === -1) base.ownedFloors.push(id);
      });
    }

    base.roomStyles = {};
    if (raw.roomStyles && typeof raw.roomStyles === 'object') {
      Object.keys(raw.roomStyles).forEach(function (id) {
        var st = raw.roomStyles[id];
        if (!isKnownRoom(id) || !st || typeof st !== 'object') return;
        var entry = {};
        if (SN.WALLPAPER_BY_ID[st.wall]) entry.wall = st.wall;
        if (SN.FLOOR_BY_ID[st.floor]) entry.floor = st.floor;
        if (entry.wall || entry.floor) base.roomStyles[id] = entry;
      });
    }

    // Upgrading a save from when rooms were themed: hand the player the
    // wallpaper and floor their unlocked rooms already had, and put them
    // back on, so nothing they'd unlocked suddenly turns plain.
    if (!raw.roomStyles) {
      wasUnlocked.forEach(function (id) {
        var look = SN.LEGACY_ROOM_LOOKS[id];
        if (!look) return;
        if (base.ownedWalls.indexOf(look.wall) === -1) base.ownedWalls.push(look.wall);
        if (base.ownedFloors.indexOf(look.floor) === -1) base.ownedFloors.push(look.floor);
        base.roomStyles[id] = { wall: look.wall, floor: look.floor };
      });
    }

    base.roomNames = {};
    if (raw.roomNames && typeof raw.roomNames === 'object') {
      Object.keys(raw.roomNames).forEach(function (id) {
        if (!isKnownRoom(id)) return;
        var n = String(raw.roomNames[id] || '').replace(/\s+/g, ' ').trim().slice(0, 18);
        if (n) base.roomNames[id] = n;
      });
    }

    base.removedRooms = Array.isArray(raw.removedRooms)
      ? raw.removedRooms.filter(function (id) { return !!SN.ROOM_BY_ID[id]; })
      : [];

    // Grid order: keep what was saved, drop anything gone, append anything
    // new — but never resurrect a preset the player deleted on purpose.
    var order = Array.isArray(raw.roomOrder) ? raw.roomOrder.filter(isKnownRoom) : [];
    var seen = {};
    order.forEach(function (id) { seen[id] = true; });
    base.removedRooms.forEach(function (id) { seen[id] = true; });
    SN.ROOMS.map(function (r) { return r.id; }).concat(Object.keys(base.customRooms))
      .forEach(function (id) { if (!seen[id]) { order.push(id); seen[id] = true; } });
    base.roomOrder = order;

    // A deleted preset shouldn't leave an empty layout behind.
    base.removedRooms.forEach(function (id) { delete base.layouts[id]; });
    if (isKnownRoom(raw.activeRoom)) base.activeRoom = raw.activeRoom;

    // Layouts: keep only stickers/rooms that still exist in the catalog.
    var maxUid = 0;
    if (raw.layouts && typeof raw.layouts === 'object') {
      Object.keys(raw.layouts).forEach(function (roomId) {
        if (!isKnownRoom(roomId) || !Array.isArray(raw.layouts[roomId])) return;
        base.layouts[roomId] = raw.layouts[roomId]
          .filter(function (p) { return p && SN.STICKER_BY_ID[p.id]; })
          .map(function (p, i) {
            var uid = Number(p.uid) || 0;
            if (uid > maxUid) maxUid = uid;
            return {
              uid: uid || 0,
              id: p.id,
              x: clamp(num(p.x, 0.5), 0, 1),
              y: clamp(num(p.y, 0.5), 0, 1),
              size: clamp(num(p.size, 0.15), 0.03, 0.7),
              rot: num(p.rot, 0),
              flip: p.flip ? 1 : 0,
              layer: p.layer > 0 ? 1 : p.layer < 0 ? -1 : 0,
              on: p.on == null ? null : Number(p.on),
              slot: Math.max(0, Number(p.slot) || 0),
              z: Number(p.z) || i + 1
            };
          });
      });
    }
    base.nextUid = Math.max(maxUid + 1, Number(raw.nextUid) || 1);
    // Backfill uids for any legacy entries missing one.
    Object.keys(base.layouts).forEach(function (roomId) {
      base.layouts[roomId].forEach(function (p) {
        if (!p.uid) p.uid = base.nextUid++;
      });
    });

    if (raw.stats && typeof raw.stats === 'object') {
      ['plays', 'bestRun', 'bestCombo', 'totalEarned'].forEach(function (k) {
        if (typeof raw.stats[k] === 'number' && isFinite(raw.stats[k])) {
          base.stats[k] = Math.max(0, Math.floor(raw.stats[k]));
        }
      });
    }
    return base;
  }

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  SN.clamp = clamp;

  /* ── Public API ─────────────────────────────────────────── */

  SN.state = null;

  SN.load = function () {
    var raw = null;
    try {
      var txt = window.localStorage.getItem(saveKey());
      if (txt) raw = JSON.parse(txt);
    } catch (e) {
      console.warn('[Sticker Nook] could not read save:', e);
    }
    SN.state = migrate(raw);
    return SN.state;
  };

  var saveTimer = null;
  SN.save = function (immediate) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (immediate) return writeNow();
    saveTimer = setTimeout(writeNow, 250);
  };

  function writeNow() {
    saveTimer = null;
    if (!SN.state || !SN.Profiles.activeId()) return;   // nothing loaded yet
    try {
      window.localStorage.setItem(saveKey(), JSON.stringify(SN.state));
    } catch (e) {
      console.warn('[Sticker Nook] could not write save:', e);
    }
  }

  /** Wipes the *current* profile only; other profiles are untouched. */
  SN.resetProgress = function () {
    try { window.localStorage.removeItem(saveKey()); } catch (e) { /* ignore */ }
    SN.state = freshState();
    SN.save(true);
  };

  // Flush any pending debounced write before the tab goes away.
  window.addEventListener('pagehide', function () { if (saveTimer) SN.save(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && saveTimer) SN.save(true);
  });

  /* ── Convenience helpers ───────────────────────────────── */

  SN.owns = function (stickerId) { return SN.state.owned.indexOf(stickerId) !== -1; };
  SN.ownsWall = function (id) { return SN.state.ownedWalls.indexOf(id) !== -1; };
  SN.ownsFloor = function (id) { return SN.state.ownedFloors.indexOf(id) !== -1; };

  /** Which wallpaper / floor a room is currently wearing (ids, may be undefined). */
  SN.roomStyle = function (roomId) { return SN.state.roomStyles[roomId] || {}; };

  /** Puts a wallpaper or floor on a room. `kind` is 'wall' or 'floor'. */
  SN.applySurface = function (roomId, kind, surfaceId) {
    var catalog = kind === 'wall' ? SN.WALLPAPER_BY_ID : SN.FLOOR_BY_ID;
    if (!catalog[surfaceId] || !SN.roomDef(roomId)) return false;
    var style = SN.state.roomStyles[roomId] || (SN.state.roomStyles[roomId] = {});
    style[kind] = surfaceId;
    SN.save();
    return true;
  };
  SN.currentLayout = function () { return SN.state.layouts[SN.state.activeRoom]; };

  /**
   * Resolves any room id — preset or player-added — to a theme object with
   * the fields the renderer needs. Null for an id that doesn't exist.
   */
  SN.roomDef = function (roomId) {
    var preset = SN.ROOM_BY_ID[roomId];
    var custom = !preset && SN.state.customRooms[roomId];
    if (!preset && !custom) return null;

    // Always a copy — the catalog is shared between profiles, so nothing
    // here may mutate it.
    var def = Object.assign({}, SN.BLANK_ROOM_THEME, preset
      ? { id: roomId, name: preset.name }
      : { id: roomId, name: custom.name, price: custom.price });

    // Whatever wallpaper and floor this room is wearing.
    var style = SN.state.roomStyles[roomId] || {};
    var w = SN.WALLPAPER_BY_ID[style.wall];
    var f = SN.FLOOR_BY_ID[style.floor];
    if (w) Object.assign(def, { wall: w.wall, wallInk: w.wallInk, wallPattern: w.wallPattern,
      skirting: w.skirting, accent: w.accent, mood: w.mood });
    if (f) Object.assign(def, { floor: f.floor, floorInk: f.floorInk, floorPattern: f.floorPattern });

    var override = SN.state.roomNames[roomId];
    if (override) def.name = override;
    return def;
  };

  /** The name a room would have with no rename applied. */
  SN.roomDefaultName = function (roomId) {
    if (SN.ROOM_BY_ID[roomId]) return SN.ROOM_BY_ID[roomId].name;
    var c = SN.state.customRooms[roomId];
    return c ? c.name : null;
  };

  /** Renames a room. An empty name clears the override and restores the default. */
  SN.renameRoom = function (roomId, name) {
    var fallback = SN.roomDefaultName(roomId);
    if (fallback == null) return false;
    var clean = String(name == null ? '' : name).replace(/\s+/g, ' ').trim().slice(0, 18);
    if (!clean || clean === fallback) delete SN.state.roomNames[roomId];
    else SN.state.roomNames[roomId] = clean;
    SN.save();
    return true;
  };

  /** What the next player-added room costs. */
  SN.customRoomPrice = function () {
    return CUSTOM_ROOM_BASE_PRICE +
      CUSTOM_ROOM_PRICE_STEP * Object.keys(SN.state.customRooms).length;
  };

  /** Exchanges two rooms' places on the grid. */
  SN.swapRooms = function (a, b) {
    var order = SN.state.roomOrder;
    var i = order.indexOf(a), j = order.indexOf(b);
    if (i === -1 || j === -1 || i === j) return false;
    order[i] = b;
    order[j] = a;
    SN.save();
    return true;
  };

  /** There must always be at least one room left to stand in. */
  SN.canDeleteRoom = function () { return SN.state.roomOrder.length > 1; };

  /**
   * Deletes a room and everything placed in it. Wallpapers and floors the
   * player bought are untouched — those are owned, not part of the room.
   */
  SN.deleteRoom = function (roomId) {
    var i = SN.state.roomOrder.indexOf(roomId);
    if (i === -1 || !SN.canDeleteRoom()) return false;

    SN.state.roomOrder.splice(i, 1);
    delete SN.state.layouts[roomId];
    delete SN.state.roomStyles[roomId];
    delete SN.state.roomNames[roomId];

    if (SN.state.customRooms[roomId]) delete SN.state.customRooms[roomId];
    else if (SN.state.removedRooms.indexOf(roomId) === -1) SN.state.removedRooms.push(roomId);

    if (SN.state.activeRoom === roomId) SN.state.activeRoom = SN.state.roomOrder[0];
    SN.save();
    return true;
  };

  /** Adds a blank room to the end of the grid. Caller spends the coins. */
  SN.addCustomRoom = function () {
    var id = 'room-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var name = 'New Room ' + (Object.keys(SN.state.customRooms).length + 1);

    SN.state.customRooms[id] = { name: name, price: SN.customRoomPrice() };
    SN.state.layouts[id] = [];
    SN.state.roomOrder.push(id);
    SN.state.activeRoom = id;
    SN.save();
    return id;
  };

  SN.addCoins = function (n) {
    // The arcade pays out even on a zero-coin run, so guard the sound or a
    // blank result card still chimes like a reward.
    if (n > 0) SN.Audio.play('coin.gain');
    SN.state.coins = Math.max(0, SN.state.coins + n);
    SN.save();
    SN.emit('coins');
  };

  SN.spendCoins = function (n) {
    if (SN.state.coins < n) return false;
    SN.Audio.play('coin.spend');
    SN.state.coins -= n;
    SN.save();
    SN.emit('coins');
    return true;
  };

  /* ── Tiny event bus (used to keep the HUD/tray in sync) ── */
  var listeners = {};
  SN.on = function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); };
  SN.emit = function (evt, data) {
    (listeners[evt] || []).forEach(function (fn) { fn(data); });
  };

})(window.SN = window.SN || {});
