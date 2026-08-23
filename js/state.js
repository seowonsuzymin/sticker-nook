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

  /** localStorage key for the profile currently being played. */
  function saveKey() { return SN.Profiles.saveKey(); }

  /** Freshly-installed state. */
  function freshState() {
    var owned = SN.STICKERS.filter(function (s) { return s.price === 0; })
      .map(function (s) { return s.id; });
    var unlocked = SN.ROOMS.filter(function (r) { return r.price === 0; })
      .map(function (r) { return r.id; });
    var layouts = {};
    SN.ROOMS.forEach(function (r) { layouts[r.id] = []; });

    return {
      version: 1,
      coins: STARTING_COINS,
      owned: owned,
      unlockedRooms: unlocked,
      activeRoom: unlocked[0] || SN.ROOMS[0].id,
      layouts: layouts,
      nextUid: 1,
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
    if (Array.isArray(raw.unlockedRooms)) {
      raw.unlockedRooms.forEach(function (id) {
        if (SN.ROOM_BY_ID[id] && base.unlockedRooms.indexOf(id) === -1) base.unlockedRooms.push(id);
      });
    }
    if (base.unlockedRooms.indexOf(raw.activeRoom) !== -1) base.activeRoom = raw.activeRoom;

    // Layouts: keep only stickers/rooms that still exist in the catalog.
    var maxUid = 0;
    if (raw.layouts && typeof raw.layouts === 'object') {
      Object.keys(raw.layouts).forEach(function (roomId) {
        if (!SN.ROOM_BY_ID[roomId] || !Array.isArray(raw.layouts[roomId])) return;
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
  SN.roomUnlocked = function (roomId) { return SN.state.unlockedRooms.indexOf(roomId) !== -1; };
  SN.currentLayout = function () { return SN.state.layouts[SN.state.activeRoom]; };

  SN.addCoins = function (n) {
    SN.state.coins = Math.max(0, SN.state.coins + n);
    SN.save();
    SN.emit('coins');
  };

  SN.spendCoins = function (n) {
    if (SN.state.coins < n) return false;
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
