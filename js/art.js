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

  /* ── The girl ──────────────────────────────────────────── */

  var HAIR = '#8a5c46', HAIR_HI = '#a97158', SKIN = '#ffe2ce', SKIN_SH = '#f3c4a8';

  function girl(theme) {
    // Her outfit is the active profile's colour, so each save slot is
    // recognisable at a glance.
    var pc = SN.Profiles ? SN.Profiles.activeColor() : SN.PROFILE_COLORS[0];
    var dress = pc.dress, dressHi = pc.hi, bow = pc.bow;

    return '' +
      '<g class="sn-girl" transform="translate(272,396) scale(1.46)" stroke-width="3">' +
      '<ellipse cx="50" cy="137" rx="43" ry="10" fill="#000" opacity=".13" stroke="none"/>' +
      '<g class="sn-girl-bob">' +

      // crossed legs + socks
      '<path d="M17 116 q33 -15 66 0 q6 15 -9 20 h-48 q-15 -5 -9 -20 z" fill="' + SKIN + '"/>' +
      '<ellipse cx="27" cy="130" rx="12" ry="7.5" fill="#fffdf8"/>' +
      '<ellipse cx="73" cy="130" rx="12" ry="7.5" fill="#fffdf8"/>' +
      '<path d="M34 120 q16 7 32 0" fill="none" stroke-width="2.2" opacity=".35"/>' +

      // pinafore dress
      '<path d="M50 62 c-16 0 -22 10 -25 25 c-3 15 -7 25 -8 29 q33 12 66 0 c-1 -4 -5 -14 -8 -29 c-3 -15 -9 -25 -25 -25 z" fill="' + dress + '"/>' +
      '<path d="M25 106 q25 10 50 0" fill="none" stroke-width="2.2" opacity=".3"/>' +
      '<path d="M39 65 q11 9 22 0" fill="none" stroke-width="2.6"/>' +
      '<circle cx="50" cy="80" r="3.6" fill="' + dressHi + '"/>' +

      // arms resting in her lap — drawn over the dress so they stay visible.
      // Dark pass first for the outline, then the skin fill on top.
      '<path d="M28 78 q-7 20 11 27" fill="none" stroke="' + INK + '" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M72 78 q7 20 -11 27" fill="none" stroke="' + INK + '" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M28 78 q-7 20 11 27" fill="none" stroke="' + SKIN + '" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M72 78 q7 20 -11 27" fill="none" stroke="' + SKIN + '" stroke-width="10" stroke-linecap="round"/>' +
      '<circle cx="40" cy="105" r="6.5" fill="' + SKIN + '"/>' +
      '<circle cx="60" cy="105" r="6.5" fill="' + SKIN + '"/>' +

      // hair behind the head
      '<path d="M50 6 c-25 0 -32 18 -32 36 c0 15 1 25 -2 32 q34 10 68 0 c-3 -7 -2 -17 -2 -32 c0 -18 -7 -36 -32 -36 z" fill="' + HAIR + '"/>' +

      // face
      '<circle cx="50" cy="40" r="26" fill="' + SKIN + '"/>' +

      // fringe + side buns
      '<path d="M24 38 c-1 -19 11 -32 26 -32 c15 0 27 13 26 32 c-4 -9 -8 -15 -12 -18 c-6 9 -20 15 -40 18 z" fill="' + HAIR + '"/>' +
      '<circle cx="16" cy="29" r="12" fill="' + HAIR + '"/>' +
      '<circle cx="84" cy="29" r="12" fill="' + HAIR + '"/>' +
      '<path d="M10 24 a9 9 0 0 1 9 -3" fill="none" stroke="' + HAIR_HI + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M81 21 a9 9 0 0 1 9 3" fill="none" stroke="' + HAIR_HI + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M84 41 a6 6 0 0 1 -9 4 a6 6 0 0 1 9 -4 z" fill="' + bow + '"/>' +

      // face details
      '<g class="sn-eye"><ellipse cx="39" cy="44" rx="4.4" ry="5.8" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="40.7" cy="42" r="1.7" fill="#fff" stroke="none"/></g>' +
      '<g class="sn-eye"><ellipse cx="61" cy="44" rx="4.4" ry="5.8" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="62.7" cy="42" r="1.7" fill="#fff" stroke="none"/></g>' +
      '<ellipse cx="28" cy="51" rx="6.5" ry="4" fill="#ffa8bf" stroke="none" opacity=".8"/>' +
      '<ellipse cx="72" cy="51" rx="6.5" ry="4" fill="#ffa8bf" stroke="none" opacity=".8"/>' +
      '<path d="M45 53 q5 5.5 10 0" fill="none" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M32 36 q6 -4 11 -1 M57 35 q5 -3 11 1" fill="none" stroke-width="2" stroke="' + SKIN_SH + '"/>' +

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

      girl(theme) +
      '</svg>';
  };

  /** Portrait of the girl in a profile's outfit colour, for the save-slot cards. */
  SN.avatarSVG = function (c) {
    return '<svg viewBox="0 0 100 100" stroke="' + INK + '" stroke-width="4" ' +
      'stroke-linejoin="round" fill="none" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="45" fill="' + c.chip + '"/>' +
      '<path d="M50 18 c-21 0 -27 15 -27 30 c0 12 1 20 -2 26 q29 9 58 0 c-3 -6 -2 -14 -2 -26 c0 -15 -6 -30 -27 -30 z" fill="' + HAIR + '"/>' +
      '<circle cx="50" cy="48" r="22" fill="' + SKIN + '"/>' +
      '<path d="M28 46 c-1 -16 10 -27 22 -27 c12 0 23 11 22 27 c-4 -8 -7 -13 -11 -15 c-5 8 -17 13 -33 15 z" fill="' + HAIR + '"/>' +
      '<circle cx="22" cy="41" r="10" fill="' + HAIR + '"/>' +
      '<circle cx="78" cy="41" r="10" fill="' + HAIR + '"/>' +
      '<path d="M78 56 a5 5 0 0 1 -8 3 a5 5 0 0 1 8 -3 z" fill="' + c.bow + '"/>' +
      '<ellipse cx="42" cy="51" rx="3.6" ry="4.8" fill="' + INK + '" stroke="none"/>' +
      '<ellipse cx="58" cy="51" rx="3.6" ry="4.8" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="43.3" cy="49.4" r="1.4" fill="#fff" stroke="none"/>' +
      '<circle cx="59.3" cy="49.4" r="1.4" fill="#fff" stroke="none"/>' +
      '<ellipse cx="33" cy="57" rx="5" ry="3.2" fill="#ffa8bf" stroke="none" opacity=".8"/>' +
      '<ellipse cx="67" cy="57" rx="5" ry="3.2" fill="#ffa8bf" stroke="none" opacity=".8"/>' +
      '<path d="M46 59 q4 4.5 8 0" fill="none" stroke-width="2.4" stroke-linecap="round"/>' +
      '</svg>';
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
