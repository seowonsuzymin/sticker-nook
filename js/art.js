/* ============================================================
   Room + character artwork
   ------------------------------------------------------------
   The room is one SVG drawn in a fixed 1000x760 coordinate space
   (see GEO below). Stickers live in a separate HTML layer stacked
   on top, positioned in fractions of the stage so everything
   scales together on resize.
   ============================================================ */
(function (SN) {
  'use strict';

  var INK = '#4a3b52';

  // Isometric "dollhouse": two walls meeting at a vertical corner,
  // with a diamond floor. All values are in viewBox units.
  var GEO = {
    W: 1000, H: 760,
    C: [500, 430],   // inner corner, where both walls meet the floor
    CT: [500, 40],   // inner corner, at the top of the walls
    L: [40, 565],    // left floor corner
    LT: [40, 175],   // left wall, top outer corner
    R: [960, 565],   // right floor corner
    RT: [960, 175],  // right wall, top outer corner
    B: [500, 700]    // front floor corner (closest to viewer)
  };
  SN.GEO = GEO;

  function pts() {
    return Array.prototype.slice.call(arguments)
      .map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
  }

  /* ── Floor pattern helpers ─────────────────────────────── */

  // Point at (i, j) on the floor grid, where i runs C→L and j runs C→R.
  function floorPt(i, j, n) {
    var C = GEO.C, ux = GEO.L[0] - C[0], uy = GEO.L[1] - C[1],
      vx = GEO.R[0] - C[0], vy = GEO.R[1] - C[1];
    return [C[0] + ux * i / n + vx * j / n, C[1] + uy * i / n + vy * j / n];
  }

  function floorPattern(theme) {
    var out = '', i, j, n;

    if (theme.floorPattern === 'plain') return '';

    if (theme.floorPattern === 'checker') {
      n = 6;
      for (i = 0; i < n; i++) {
        for (j = 0; j < n; j++) {
          if ((i + j) % 2 === 0) continue;
          out += '<polygon points="' + pts(
            floorPt(i, j, n), floorPt(i + 1, j, n),
            floorPt(i + 1, j + 1, n), floorPt(i, j + 1, n)
          ) + '" fill="' + theme.floorInk + '"/>';
        }
      }
      return out;
    }

    if (theme.floorPattern === 'tile') {
      n = 6;
      for (i = 1; i < n; i++) {
        out += '<line x1="' + floorPt(i, 0, n)[0] + '" y1="' + floorPt(i, 0, n)[1] +
          '" x2="' + floorPt(i, n, n)[0] + '" y2="' + floorPt(i, n, n)[1] + '"/>';
        out += '<line x1="' + floorPt(0, i, n)[0] + '" y1="' + floorPt(0, i, n)[1] +
          '" x2="' + floorPt(n, i, n)[0] + '" y2="' + floorPt(n, i, n)[1] + '"/>';
      }
      return '<g stroke="' + theme.floorInk + '" stroke-width="3" opacity=".9">' + out + '</g>';
    }

    // 'plank' — long boards running one way only
    n = 9;
    for (i = 1; i < n; i++) {
      out += '<line x1="' + floorPt(0, i, n)[0] + '" y1="' + floorPt(0, i, n)[1] +
        '" x2="' + floorPt(n, i, n)[0] + '" y2="' + floorPt(n, i, n)[1] + '"/>';
    }
    return '<g stroke="' + theme.floorInk + '" stroke-width="3.5" opacity=".85">' + out + '</g>';
  }

  /* ── Wall pattern helpers ──────────────────────────────── */

  function starPath(cx, cy, r) {
    var p = '', i, a, rr;
    for (i = 0; i < 10; i++) {
      a = -Math.PI / 2 + i * Math.PI / 5;
      rr = i % 2 ? r * 0.45 : r;
      p += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return p + 'Z';
  }

  function wallPatternDef(theme, id) {
    var ink = theme.wallInk, body;
    // NOTE: pattern contents sit inside <defs> but still inherit the root
    // stroke, so everything in here is wrapped in stroke="none".
    switch (theme.wallPattern) {
      case 'stripes':
        body = '<rect x="0" y="0" width="42" height="20" fill="' + ink + '"/>';
        body = tile(id, 84, 20, body);
        break;
      case 'dots':
        body = tile(id, 58, 58,
          '<circle cx="15" cy="15" r="7" fill="' + ink + '"/>' +
          '<circle cx="44" cy="44" r="7" fill="' + ink + '"/>');
        break;
      case 'stars':
        body = tile(id, 76, 76,
          '<path d="' + starPath(20, 20, 11) + '" fill="' + ink + '"/>' +
          '<path d="' + starPath(55, 53, 7) + '" fill="' + ink + '"/>');
        break;
      case 'grid':
        body = tile(id, 62, 62,
          '<path d="M0 0 H62 M0 0 V62" stroke="' + ink + '" stroke-width="5" fill="none"/>');
        break;
      default:
        return { def: '', fill: null };
    }
    return { def: body, fill: 'url(#' + id + ')' };
  }

  function tile(id, w, h, content) {
    return '<pattern id="' + id + '" width="' + w + '" height="' + h + '" ' +
      'patternUnits="userSpaceOnUse"><g stroke="none">' + content + '</g></pattern>';
  }

  /* ── The character ─────────────────────────────────────── */

  /**
   * The sitting body, shared by every character. Only the head differs —
   * that comes from the character catalog in js/data/characters.js.
   * Limb colour and outfit colour both come from the active profile.
   */
  function characterBody(ch, pc, extraClass) {
    var limb = ch.limb, paw = ch.paw;

    return '' +
      // crossed legs + socks/paws
      '<path d="M17 116 q33 -15 66 0 q6 15 -9 20 h-48 q-15 -5 -9 -20 z" fill="' + limb + '"/>' +
      '<ellipse cx="27" cy="130" rx="12" ry="7.5" fill="' + paw + '"/>' +
      '<ellipse cx="73" cy="130" rx="12" ry="7.5" fill="' + paw + '"/>' +
      '<path d="M34 120 q16 7 32 0" fill="none" stroke-width="2.2" opacity=".35"/>' +

      // pinafore dress in the profile's colour
      '<path d="M50 62 c-16 0 -22 10 -25 25 c-3 15 -7 25 -8 29 q33 12 66 0 c-1 -4 -5 -14 -8 -29 c-3 -15 -9 -25 -25 -25 z" fill="' + pc.dress + '"/>' +
      '<path d="M25 106 q25 10 50 0" fill="none" stroke-width="2.2" opacity=".3"/>' +
      '<path d="M39 65 q11 9 22 0" fill="none" stroke-width="2.6"/>' +
      '<circle cx="50" cy="80" r="3.6" fill="' + pc.hi + '"/>' +

      // arms resting in the lap — drawn over the dress so they stay visible.
      // Dark pass first for the outline, then the limb fill on top.
      '<path d="M28 78 q-7 20 11 27" fill="none" stroke="' + INK + '" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M72 78 q7 20 -11 27" fill="none" stroke="' + INK + '" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M28 78 q-7 20 11 27" fill="none" stroke="' + limb + '" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M72 78 q7 20 -11 27" fill="none" stroke="' + limb + '" stroke-width="10" stroke-linecap="round"/>' +
      '<circle cx="40" cy="105" r="6.5" fill="' + limb + '"/>' +
      '<circle cx="60" cy="105" r="6.5" fill="' + limb + '"/>' +

      ch.head(pc);
  }

  function character(theme) {
    // Outfit colour and species both come from the active profile, so each
    // save slot is recognisable at a glance.
    var p = SN.Profiles ? SN.Profiles.active() : null;
    var pc = SN.Profiles ? SN.Profiles.activeColor() : SN.PROFILE_COLORS[0];
    var ch = SN.characterFor(p && p.character);

    return '' +
      '<g class="sn-girl" transform="translate(272,396) scale(1.46)" stroke-width="3">' +
      '<ellipse cx="50" cy="137" rx="43" ry="10" fill="#000" opacity=".13" stroke="none"/>' +
      '<g class="sn-girl-bob">' +
      characterBody(ch, pc) +
      '</g></g>';
  }

  /* ── Full room ─────────────────────────────────────────── */

  SN.buildRoom = function (theme) {
    var g = GEO;
    var pid = 'wp-' + theme.id;
    var wp = wallPatternDef(theme, pid);
    var night = theme.mood === 'night';

    var leftWall = pts(g.CT, g.C, g.L, g.LT);
    var rightWall = pts(g.CT, g.C, g.R, g.RT);
    var floor = pts(g.C, g.L, g.B, g.R);

    var SK = 18; // skirting height
    var skirtL = pts(g.C, g.L, [g.L[0], g.L[1] - SK], [g.C[0], g.C[1] - SK]);
    var skirtR = pts(g.C, g.R, [g.R[0], g.R[1] - SK], [g.C[0], g.C[1] - SK]);

    return '' +
      '<svg class="room-svg" viewBox="0 0 ' + g.W + ' ' + g.H + '" ' +
      'stroke="' + INK + '" stroke-width="4" stroke-linejoin="round" fill="none" aria-hidden="true">' +

      '<defs>' +
      wp.def +
      '<linearGradient id="shL-' + theme.id + '" gradientUnits="userSpaceOnUse" x1="500" y1="0" x2="40" y2="0">' +
      '<stop offset="0" stop-color="#000" stop-opacity=".16"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="shR-' + theme.id + '" gradientUnits="userSpaceOnUse" x1="500" y1="0" x2="960" y2="0">' +
      '<stop offset="0" stop-color="#000" stop-opacity=".07"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="pool-' + theme.id + '" gradientUnits="userSpaceOnUse" cx="500" cy="540" r="330">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="' + (night ? '.10' : '.30') + '"/>' +
      '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="floorClip-' + theme.id + '"><polygon points="' + floor + '"/></clipPath>' +
      '</defs>' +

      // ── floor ──
      '<polygon points="' + floor + '" fill="' + theme.floor + '" stroke="none"/>' +
      '<g clip-path="url(#floorClip-' + theme.id + ')">' + floorPattern(theme) + '</g>' +
      '<polygon points="' + floor + '" fill="url(#pool-' + theme.id + ')" stroke="none"/>' +

      // ── walls ──
      '<polygon points="' + leftWall + '" fill="' + theme.wall + '" stroke="none"/>' +
      (wp.fill ? '<polygon points="' + leftWall + '" fill="' + wp.fill + '" stroke="none" opacity=".9"/>' : '') +
      '<polygon points="' + leftWall + '" fill="url(#shL-' + theme.id + ')" stroke="none"/>' +

      '<polygon points="' + rightWall + '" fill="' + theme.wall + '" stroke="none"/>' +
      (wp.fill ? '<polygon points="' + rightWall + '" fill="' + wp.fill + '" stroke="none" opacity=".9"/>' : '') +
      '<polygon points="' + rightWall + '" fill="url(#shR-' + theme.id + ')" stroke="none"/>' +

      // ── skirting boards ──
      '<polygon points="' + skirtL + '" fill="' + theme.skirting + '" stroke="none"/>' +
      '<polygon points="' + skirtR + '" fill="' + theme.skirting + '" stroke="none"/>' +

      // ── outlines ──
      '<polygon points="' + leftWall + '"/>' +
      '<polygon points="' + rightWall + '"/>' +
      '<polygon points="' + floor + '"/>' +
      '<line x1="' + g.C[0] + '" y1="' + (g.C[1] - SK) + '" x2="' + g.L[0] + '" y2="' + (g.L[1] - SK) + '" stroke-width="3"/>' +
      '<line x1="' + g.C[0] + '" y1="' + (g.C[1] - SK) + '" x2="' + g.R[0] + '" y2="' + (g.R[1] - SK) + '" stroke-width="3"/>' +
      '<line x1="' + g.CT[0] + '" y1="' + g.CT[1] + '" x2="' + g.C[0] + '" y2="' + g.C[1] + '" stroke-width="4"/>' +

      character(theme) +
      '</svg>';
  };

  /* ── Hex tiles for the room-select grid ────────────────── */

  /* A pointy-top hexagon, deliberately squashed (height < the 1.155x a
     regular hex would need) so it reads as a tile tilted away from you. */
  var HEX_W = 200, HEX_H = 140;
  SN.HEX_W = HEX_W;
  SN.HEX_H = HEX_H;

  function hexPoints() {
    return '100,0 200,35 200,105 100,140 0,105 0,35';
  }

  /**
   * One tile on the room-select grid.
   *   locked  → the room's accent colour, flat, for a lock + LEVEL label
   *   unlocked→ a miniature of the real room, furniture and all
   */
  SN.hexRoom = function (theme, layout, locked) {
    var uid = 'hex-' + theme.id;
    var inner = locked ? lockedFill(theme) : dioramaFill(theme, layout || [], uid);

    return '<svg class="hex-svg" viewBox="0 0 ' + HEX_W + ' ' + HEX_H + '" aria-hidden="true">' +
      '<defs><clipPath id="clip-' + uid + '">' +
      '<polygon points="' + hexPoints() + '"/></clipPath></defs>' +
      '<g clip-path="url(#clip-' + uid + ')">' + inner + '</g>' +
      '<polygon points="' + hexPoints() + '" fill="none" stroke="' + INK + '" stroke-width="6" ' +
      'stroke-linejoin="round"/>' +
      '</svg>';
  };

  function lockedFill(theme) {
    return '<polygon points="' + hexPoints() + '" fill="' + theme.accent + '"/>' +
      '<polygon points="' + hexPoints() + '" fill="#000" opacity=".12"/>';
  }

  /**
   * The room shrunk into the tile: the same two walls and floor as the real
   * thing, with the player's own furniture sitting in it.
   */
  function dioramaFill(theme, layout, uid) {
    var g = GEO;
    // Frame the interesting band — lower walls through the front of the floor.
    var vx = 40, vy = 120, vw = 920, vh = 600;
    var s = Math.max(HEX_W / vw, HEX_H / vh);
    var tx = -vx * s + (HEX_W - vw * s) / 2;
    var ty = -vy * s + (HEX_H - vh * s) / 2;

    var leftWall = pts(g.CT, g.C, g.L, g.LT);
    var rightWall = pts(g.CT, g.C, g.R, g.RT);
    var floor = pts(g.C, g.L, g.B, g.R);
    var wp = wallPatternDef(theme, 'wpx-' + uid);

    var furniture = layout.slice()
      .sort(function (a, b) { return a.z - b.z; })
      .map(function (p) {
        var size = p.size * g.W;
        var cx = p.x * g.W, cy = p.y * g.H;
        var art = SN.stickerSVG(p.id).replace('<svg ',
          '<svg x="' + (cx - size / 2) + '" y="' + (cy - size / 2) + '" ' +
          'width="' + size + '" height="' + size + '" ');
        var t = 'rotate(' + p.rot + ' ' + cx + ' ' + cy + ')' +
          (p.flip ? ' translate(' + (2 * cx) + ' 0) scale(-1 1)' : '');
        return '<g transform="' + t + '">' + art + '</g>';
      }).join('');

    return '<g transform="translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') scale(' + s.toFixed(4) + ')" ' +
      'stroke="' + INK + '" stroke-width="4" stroke-linejoin="round" fill="none">' +
      '<defs>' + wp.def + '</defs>' +
      '<polygon points="' + leftWall + '" fill="' + theme.wall + '" stroke="none"/>' +
      '<polygon points="' + rightWall + '" fill="' + theme.wall + '" stroke="none"/>' +
      (wp.fill ? '<polygon points="' + leftWall + '" fill="' + wp.fill + '" stroke="none" opacity=".9"/>' +
        '<polygon points="' + rightWall + '" fill="' + wp.fill + '" stroke="none" opacity=".9"/>' : '') +
      '<polygon points="' + leftWall + '" fill="#000" opacity=".08" stroke="none"/>' +
      '<polygon points="' + floor + '" fill="' + theme.floor + '" stroke="none"/>' +
      '<g clip-path="url(#fclip-' + uid + ')">' + floorPattern(theme) + '</g>' +
      '<defs><clipPath id="fclip-' + uid + '"><polygon points="' + floor + '"/></clipPath></defs>' +
      '<polygon points="' + leftWall + '"/>' +
      '<polygon points="' + rightWall + '"/>' +
      '<polygon points="' + floor + '"/>' +
      furniture +
      '</g>';
  }

  /**
   * Portrait of a character in a profile's outfit colour, for the save-slot
   * cards and the character picker. The blink class is stripped so a wall of
   * avatars doesn't blink in unison.
   */
  SN.avatarSVG = function (c, charId) {
    var ch = SN.characterFor(charId);
    var head = ch.head(c).replace(/class="sn-eye"/g, '');
    return '<svg viewBox="0 0 100 100" stroke="' + INK + '" stroke-width="3.4" ' +
      'stroke-linejoin="round" fill="none" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="45" fill="' + c.chip + '"/>' +
      '<g transform="translate(50 56) scale(0.86) translate(-50 -40)">' + head + '</g>' +
      '</svg>';
  };

  /**
   * A compact room preview — same walls and floor as the real thing, no
   * character or furniture. Used as the swatch on wallpaper / floor items,
   * so what you see in the tray is literally what the room will look like.
   */
  SN.roomPreview = function (theme) {
    var g = GEO;
    var wp = wallPatternDef(theme, 'pv-' + theme.id);
    var leftWall = pts(g.CT, g.C, g.L, g.LT);
    var rightWall = pts(g.CT, g.C, g.R, g.RT);
    var floor = pts(g.C, g.L, g.B, g.R);

    return '<svg viewBox="40 150 920 570" preserveAspectRatio="xMidYMid slice" ' +
      'stroke="' + INK + '" stroke-width="6" stroke-linejoin="round" fill="none" aria-hidden="true">' +
      '<defs>' + wp.def +
      '<clipPath id="pvf-' + theme.id + '"><polygon points="' + floor + '"/></clipPath></defs>' +
      '<polygon points="' + leftWall + '" fill="' + theme.wall + '" stroke="none"/>' +
      '<polygon points="' + rightWall + '" fill="' + theme.wall + '" stroke="none"/>' +
      (wp.fill
        ? '<polygon points="' + leftWall + '" fill="' + wp.fill + '" stroke="none" opacity=".9"/>' +
          '<polygon points="' + rightWall + '" fill="' + wp.fill + '" stroke="none" opacity=".9"/>'
        : '') +
      '<polygon points="' + leftWall + '" fill="#000" opacity=".09" stroke="none"/>' +
      '<polygon points="' + floor + '" fill="' + theme.floor + '" stroke="none"/>' +
      '<g clip-path="url(#pvf-' + theme.id + ')">' + floorPattern(theme) + '</g>' +
      '<polygon points="' + leftWall + '"/><polygon points="' + rightWall + '"/>' +
      '<polygon points="' + floor + '"/>' +
      '</svg>';
  };

  /** Preview of one surface on an otherwise plain room. */
  SN.surfaceSwatch = function (surface, kind) {
    var theme = Object.assign({}, SN.BLANK_ROOM_THEME, { id: 'sw-' + surface.id });
    if (kind === 'wall') {
      Object.assign(theme, {
        wall: surface.wall, wallInk: surface.wallInk, wallPattern: surface.wallPattern,
        skirting: surface.skirting, mood: surface.mood
      });
    } else {
      Object.assign(theme, {
        floor: surface.floor, floorInk: surface.floorInk, floorPattern: surface.floorPattern
      });
    }
    return SN.roomPreview(theme);
  };

  /** Small swatch used on the room-switcher tabs. */
  SN.roomSwatch = function (theme) {
    return '<svg viewBox="0 0 40 34" aria-hidden="true">' +
      '<polygon points="20,2 20,20 2,26 2,8" fill="' + theme.wall + '"/>' +
      '<polygon points="20,2 20,20 38,26 38,8" fill="' + theme.wallInk + '"/>' +
      '<polygon points="20,20 2,26 20,32 38,26" fill="' + theme.floor + '"/>' +
      '</svg>';
  };

})(window.SN = window.SN || {});
