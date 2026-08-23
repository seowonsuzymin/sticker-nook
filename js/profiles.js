/* ============================================================
   Save profiles
   ------------------------------------------------------------
   Up to MAX independent save slots. An index of profiles lives at
   `stickerNook.profiles.v1`; each profile's game state lives at its
   own `stickerNook.save.v1.<profileId>` key, so slots never touch
   each other.

   A save from before profiles existed is migrated into slot one on
   first run rather than being thrown away.
   ============================================================ */
(function (SN) {
  'use strict';

  var INDEX_KEY = 'stickerNook.profiles.v1';
  var SAVE_PREFIX = 'stickerNook.save.v1.';
  var LEGACY_KEY = 'stickerNook.save.v1';       // the pre-profiles single save
  var MAX = 3;

  SN.MAX_PROFILES = MAX;

  /* The outfit colour picked per profile — this tints the character's
     dress in-game, so each nook is recognisable at a glance. */
  SN.PROFILE_COLORS = [
    { id: 'pink', name: 'Blossom', dress: '#ffbdd2', hi: '#ffe3ec', bow: '#ff9ab6', chip: '#ff8fb0' },
    { id: 'mint', name: 'Meadow', dress: '#8fd7a6', hi: '#c8f0d6', bow: '#ffd97a', chip: '#6fd0a2' },
    { id: 'sky', name: 'Sky', dress: '#a6ccf2', hi: '#d8ebfb', bow: '#ffd97a', chip: '#7bb6e8' },
    { id: 'lilac', name: 'Lilac', dress: '#c4aef0', hi: '#e4d9f9', bow: '#fff0a8', chip: '#ab8fe4' },
    { id: 'butter', name: 'Butter', dress: '#ffd980', hi: '#fff0c6', bow: '#ffb0c4', chip: '#f5c542' }
  ];

  var index = { profiles: [], activeId: null };

  /* ── localStorage helpers (never throw) ────────────────── */

  function read(key) {
    try {
      var t = window.localStorage.getItem(key);
      return t ? JSON.parse(t) : null;
    } catch (e) { return null; }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[Sticker Nook] could not write ' + key + ':', e);
      return false;
    }
  }

  function uid() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function colorFor(id) {
    for (var i = 0; i < SN.PROFILE_COLORS.length; i++) {
      if (SN.PROFILE_COLORS[i].id === id) return SN.PROFILE_COLORS[i];
    }
    return SN.PROFILE_COLORS[0];
  }

  function cleanName(name) {
    var n = String(name == null ? '' : name).replace(/\s+/g, ' ').trim().slice(0, 14);
    return n || 'My Nook';
  }

  /* ── Index load / save ─────────────────────────────────── */

  function saveIndex() { write(INDEX_KEY, index); }

  function byId(id) {
    for (var i = 0; i < index.profiles.length; i++) {
      if (index.profiles[i].id === id) return index.profiles[i];
    }
    return null;
  }

  /**
   * A save written before profiles existed becomes slot one, so an
   * existing player keeps their coins, stickers and rooms.
   */
  function migrateLegacy() {
    var legacy;
    try { legacy = window.localStorage.getItem(LEGACY_KEY); } catch (e) { return; }
    if (!legacy || index.profiles.length) return;

    var p = {
      id: uid(), name: 'My Nook', color: 'pink', character: 'girl',
      created: Date.now(), lastPlayed: Date.now()
    };
    try {
      window.localStorage.setItem(SAVE_PREFIX + p.id, legacy);
      window.localStorage.removeItem(LEGACY_KEY);
    } catch (e) {
      return;                                    // leave the old save untouched
    }
    index.profiles.push(p);
    index.activeId = p.id;
    saveIndex();
  }

  var Profiles = SN.Profiles = {};

  Profiles.init = function () {
    var raw = read(INDEX_KEY);
    index = { profiles: [], activeId: null };

    if (raw && Array.isArray(raw.profiles)) {
      index.profiles = raw.profiles
        .filter(function (p) { return p && p.id; })
        .slice(0, MAX)
        .map(function (p) {
          return {
            id: String(p.id),
            name: cleanName(p.name),
            color: colorFor(p.color).id,
            // Profiles made before characters existed default to the girl.
            character: SN.characterFor(p.character).id,
            created: Number(p.created) || 0,
            lastPlayed: Number(p.lastPlayed) || 0
          };
        });
      if (raw.activeId && byId(String(raw.activeId))) index.activeId = String(raw.activeId);
    }

    migrateLegacy();
    return index.profiles;
  };

  /* ── Reading ───────────────────────────────────────────── */

  Profiles.all = function () { return index.profiles.slice(); };
  Profiles.count = function () { return index.profiles.length; };
  Profiles.isFull = function () { return index.profiles.length >= MAX; };
  Profiles.get = function (id) { return byId(id); };
  Profiles.activeId = function () { return index.activeId; };
  Profiles.active = function () { return index.activeId ? byId(index.activeId) : null; };

  Profiles.activeColor = function () {
    var p = Profiles.active();
    return colorFor(p && p.color);
  };
  Profiles.colorFor = colorFor;

  Profiles.saveKey = function (id) { return SAVE_PREFIX + (id || index.activeId); };

  /** Cheap read of a slot's save, for the picker cards. */
  Profiles.summary = function (id) {
    var s = read(SAVE_PREFIX + id);
    var placed = 0;
    if (s && s.layouts && typeof s.layouts === 'object') {
      Object.keys(s.layouts).forEach(function (k) {
        if (Array.isArray(s.layouts[k])) placed += s.layouts[k].length;
      });
    }
    return {
      fresh: !s,
      coins: s && typeof s.coins === 'number' ? s.coins : 0,
      owned: s && Array.isArray(s.owned) ? s.owned.length : 0,
      rooms: s && Array.isArray(s.unlockedRooms) ? s.unlockedRooms.length : 0,
      placed: placed,
      plays: s && s.stats && typeof s.stats.plays === 'number' ? s.stats.plays : 0
    };
  };

  /* ── Writing ───────────────────────────────────────────── */

  Profiles.create = function (name, colorId, characterId) {
    if (Profiles.isFull()) return null;
    var p = {
      id: uid(),
      name: cleanName(name),
      color: colorFor(colorId).id,
      character: SN.characterFor(characterId).id,
      created: Date.now(),
      lastPlayed: 0
    };
    index.profiles.push(p);
    saveIndex();
    return p;
  };

  Profiles.setActive = function (id) {
    if (!byId(id)) return false;
    index.activeId = id;
    saveIndex();
    return true;
  };

  Profiles.touch = function (id) {
    var p = byId(id || index.activeId);
    if (!p) return;
    p.lastPlayed = Date.now();
    saveIndex();
  };

  Profiles.remove = function (id) {
    var i = index.profiles.findIndex(function (p) { return p.id === id; });
    if (i === -1) return false;
    index.profiles.splice(i, 1);
    if (index.activeId === id) index.activeId = null;
    try { window.localStorage.removeItem(SAVE_PREFIX + id); } catch (e) { /* ignore */ }
    saveIndex();
    return true;
  };

  /* ── Display helpers ───────────────────────────────────── */

  Profiles.lastPlayedLabel = function (p) {
    if (!p.lastPlayed) return 'Never played';
    var mins = Math.floor((Date.now() - p.lastPlayed) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + (mins === 1 ? ' min ago' : ' mins ago');
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    return new Date(p.lastPlayed).toLocaleDateString();
  };

})(window.SN = window.SN || {});
