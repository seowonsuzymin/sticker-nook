/* ============================================================
   Sticker catalog
   ------------------------------------------------------------
   To add a sticker: append one entry to STICKERS below.

     id     unique string (used as the localStorage key — never rename
            an existing one or players lose that sticker)
     name   display name in the tray
     price  cost in coins (0 = owned from the start)
     cat    category chip: friend | furniture | plush | plant | food | decor | tech
            ('friend' is the standing character cast — separate from the
             profile characters in js/data/characters.js, which are avatars
             only and never appear in a room)
     size   default width as a fraction of the room's width (0.02–0.6)
     flat   optional; set 1 on floor coverings (rugs, mats) so they always
            sort beneath anything standing on them

   Shelves — a piece can hold other pieces:
     shelves    on a host: [[x, y], …] mid-points, in the host's own 100-box,
                of each slot's standing line
     shelfSpan  on a host: how wide a slot is, in the host's 100-box
     shelvable  on a guest: 1 if it can drop into a slot
     anchor     on a guest: [x, y] the point on its art that meets the slot
     span       on a guest: how wide its art is, in its own 100-box
   A guest's size is scaled by shelfSpan / span, so it always fits.
     art    SVG markup drawn inside a `viewBox="0 0 100 100"`.

   Art direction — everything in the catalog follows this:
     · Isometric. Solids are built from js/data/iso.js so they all share
       one axonometric angle and sit flush on the room's floor.
     · Exactly three flat tones per object — highlight, base, shadow —
       derived from one pastel base colour. No gradients, no reflections.
     · A 3px rounded dark outline, inherited from the wrapper <svg>, so
       shapes only set a `fill`. `stroke="none"` on interior shading.
     · Chunky and simplified: few parts, generous radii, soft palette.

   Floor pieces stand on the ground line ISO.GY (88) and are drawn facing
   the right-hand floor axis; the flip handle turns them to face the other.
   Wall pieces (posters, clocks, windows…) stay flat and front-on — the
   room shears them into the wall plane when they're dropped there.
   ============================================================ */
(function (SN) {
  'use strict';

  // Shared pastel palette so every sticker feels like one set.
  var C = {
    ink: '#4a3b52',
    pink: '#ffb7c9', pinkD: '#f58aa6', pinkL: '#ffd9e4',
    cream: '#fff3e2', white: '#fffdf8',
    mint: '#a9e5cf', mintD: '#74cfb1',
    blue: '#b7d9f5', blueD: '#87bce8',
    lav: '#cdbdf0', lavD: '#a98fe0',
    yellow: '#ffe08a', yellowD: '#f7c95c',
    peach: '#ffcaa8', peachD: '#f2a87d',
    brown: '#cf9b6f', brownD: '#a97650',
    green: '#8fd99f', greenD: '#5fb87a',
    red: '#ff8f8f', redD: '#e96b6b',
    gray: '#ded7e6', grayD: '#b8aec6',
    slate: '#9aa8c4',
    dark: '#6b5a78'
  };
  SN.PALETTE = C;

  var I = SN.ISO;
  var box = I.box, softSlab = I.softSlab, cyl = I.cyl, taper = I.taper, disc = I.disc, ball = I.ball,
    ring = I.ring, slab = I.top, at = I.at, cor = I.corners,
    faceL = I.faceL, faceR = I.faceR, T = I.tones, R = I.R, n = I.n;
  var G = I.GY;

  /* ── little local helpers ───────────────────────────────── */

  function ink(d, w) { return '<path d="' + d + '" fill="none" stroke-width="' + (w || 2.6) + '"/>'; }
  function dot(x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 2.4) + '" fill="' + C.ink + '" stroke="none"/>'; }
  function ell(x, y, rx, ry, fill, rot) {
    return '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' + fill + '"' +
      (rot ? ' transform="rotate(' + rot + ' ' + n(x) + ' ' + n(y) + ')"' : '') + '/>';
  }
  function soft(x, y, rx, ry, fill, rot) { return ell(x, y, rx, ry, fill, rot); }

  /** Soft rounded body, cel-shaded — plushies, beanbags, anything squishy. */
  function blob(cx, cy, rx, ry, base) {
    var t = T(base);
    function p(deg) { var a = deg * Math.PI / 180; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }
    var s = p(-18), e = p(114);
    return ell(cx, cy, rx, ry, t[1]) +
      '<path d="M' + n(s[0]) + ' ' + n(s[1]) + ' A' + n(rx) + ' ' + n(ry) + ' 0 0 1 ' + n(e[0]) + ' ' + n(e[1]) +
      ' A' + n(rx * 1.45) + ' ' + n(ry * 1.45) + ' 0 0 0 ' + n(s[0]) + ' ' + n(s[1]) +
      ' Z" fill="' + t[2] + '" stroke="none"/>' +
      ell(cx - rx * 0.42, cy - ry * 0.46, rx * 0.26, ry * 0.2, t[0]) .replace('/>', ' stroke="none"/>');
  }

  /* ── Friends ────────────────────────────────────────────
     A separate cast from the profile characters: these are stickers you buy
     and place, drawn standing rather than sitting. They share one body so
     they read as a set, exactly like the profile characters share theirs. */

  /** Blinking eye — reuses the .sn-eye animation from the stylesheet. */
  function fEye(x, y, r) {
    r = r || 2.9;
    return '<g class="sn-eye">' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + C.ink + '" stroke="none"/>' +
      '<circle cx="' + (x + r * 0.36) + '" cy="' + (y - r * 0.4) + '" r="' + n(r * 0.34) +
      '" fill="#fff" stroke="none"/></g>';
  }
  function fEyes(y, spread, r) { return fEye(50 - spread, y, r) + fEye(50 + spread, y, r); }
  function cheeks(y, spread, w) {
    return ell(50 - spread, y, w || 5.5, (w || 5.5) * 0.7, T(C.pink)[0]).replace('/>', ' stroke="none"/>') +
      ell(50 + spread, y, w || 5.5, (w || 5.5) * 0.7, T(C.pink)[0]).replace('/>', ' stroke="none"/>');
  }

  /**
   * The standing body every friend shares — two little feet, a rounded
   * belly and stubby arms tucked behind it. `extra` is the head and anything
   * else drawn over the body.
   */
  function friendBody(coat, belly, extra, foot) {
    var t = T(coat), f = T(foot || coat);
    return ell(37, 85, 9.5, 6, f[1]) + ell(63, 85, 9.5, 6, f[1]) +
      ell(27, 64, 7.5, 12, t[2], 18) + ell(73, 64, 7.5, 12, t[2], -18) +
      blob(50, 66, 22, 21, coat) +
      ell(50, 72, 14.5, 11.5, T(belly)[0]) +
      extra;
  }

  /** A five-pointed star, flat-filled. */
  function star(cx, cy, r, fill) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r * 0.44 : r;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return I.poly(pts, fill);
  }

  /** A row of books standing on a shelf, walking down the left-hand face. */
  function books(x, y, specs, w) {
    w = w || 4.6;
    return specs.map(function (b, i) {
      var step = i * (w + 0.8);
      return faceL([x + step, y + step * R], w, b[1], T(b[0])[1]);
    }).join('');
  }

  var STICKERS = [

    /* ── Starter set (free) ────────────────────────────────── */
    {
      id: 'bed-cozy', name: 'Cozy Bed', price: 0, cat: 'furniture', size: 0.30,
      art:
        softSlab(27, 76.3, 3, 12.5, 25, C.brownD, 0.18) +
        box(50, 88, 22, 11.5, 5, C.brown) +
        softSlab(50, 83, 24, 13, 8, C.cream, 0.13) +
        softSlab(37, 71.2, 7, 10, 6, C.white, 0.3) +
        softSlab(58, 77.3, 15, 12, 7, C.pink, 0.2)
    },
    {
      id: 'rug-round', name: 'Round Rug', price: 0, cat: 'decor', size: 0.28, flat: 1,
      art:
        ell(50, 80, 46, 13.5, T(C.pink)[2]) +
        ell(50, 80, 33, 9.7, T(C.pink)[1]).replace('/>', ' stroke="none"/>') +
        ell(50, 80, 17, 5, T(C.pink)[0]).replace('/>', ' stroke="none"/>')
    },
    {
      id: 'plant-small', name: 'Little Plant', price: 0, cat: 'plant', size: 0.11,
      art:
        taper(50, G, 12, 15, 14, C.brown) +
        ell(34, 60, 12, 7.5, T(C.green)[2], -42) +
        ell(66, 57, 12, 7.5, T(C.green)[1], 40) +
        ell(50, 46, 9.5, 14, T(C.green)[0])
    },
    {
      id: 'pillow-heart', name: 'Heart Pillow', price: 0, cat: 'decor', size: 0.12,
      art:
        '<path d="M50 88 C18 68 18 44 34 42 C43 41 49 48 50 53 C51 48 57 41 66 42 C82 44 82 68 50 88 Z" fill="' + T(C.pink)[1] + '"/>' +
        '<path d="M50 53 C51 48 57 41 66 42 C82 44 82 68 50 88 Z" fill="' + T(C.pink)[2] + '" stroke="none"/>' +
        ell(37, 56, 8, 5.5, T(C.pink)[0], -32).replace('/>', ' stroke="none"/>')
    },
    {
      id: 'clock-wall', name: 'Wall Clock', price: 0, cat: 'decor', size: 0.10,
      art:
        '<circle cx="50" cy="50" r="36" fill="' + T(C.cream)[2] + '"/>' +
        '<circle cx="50" cy="50" r="30" fill="' + T(C.cream)[1] + '"/>' +
        '<circle cx="50" cy="50" r="24" fill="' + T(C.cream)[0] + '"/>' +
        ink('M50 50 V32 M50 50 L64 57', 3) + dot(50, 50, 3.2)
    },

    /* ── Plushies ──────────────────────────────────────────── */
    {
      id: 'plush-bear', name: 'Bear Plushie', price: 40, cat: 'plush', size: 0.11,
      art:
        blob(50, 75, 21, 14, C.brown) +
        '<circle cx="32" cy="44" r="8.5" fill="' + T(C.brown)[1] + '"/>' +
        '<circle cx="68" cy="44" r="8.5" fill="' + T(C.brown)[1] + '"/>' +
        blob(50, 50, 21, 19, C.brown) +
        ell(50, 57, 11, 8, T(C.cream)[0]) +
        dot(42, 48) + dot(58, 48) +
        ell(50, 54, 3.6, 2.7, C.ink).replace('/>', ' stroke="none"/>') +
        ink('M46 60 q4 4 8 0', 2.2)
    },
    {
      id: 'plush-bunny', name: 'Bunny Plushie', price: 60, cat: 'plush', size: 0.11,
      art:
        blob(50, 77, 19, 12, C.white) +
        ell(38, 30, 6.5, 17, T(C.white)[1], -10) +
        ell(62, 30, 6.5, 17, T(C.white)[1], 10) +
        ell(38, 31, 3, 11, T(C.pink)[1], -10).replace('/>', ' stroke="none"/>') +
        ell(62, 31, 3, 11, T(C.pink)[1], 10).replace('/>', ' stroke="none"/>') +
        blob(50, 56, 19, 17, C.white) +
        dot(43, 54) + dot(57, 54) +
        ell(50, 61, 3.2, 2.4, T(C.pink)[2]).replace('/>', ' stroke="none"/>') +
        ell(36, 62, 5, 3.4, T(C.pink)[0]).replace('/>', ' stroke="none"/>') +
        ell(64, 62, 5, 3.4, T(C.pink)[0]).replace('/>', ' stroke="none"/>')
    },
    {
      id: 'cat-loaf', name: 'Cat Loaf', price: 80, cat: 'plush', size: 0.12,
      art:
        '<path d="M27 68 L25 50 L41 60 Z" fill="' + T(C.peach)[1] + '"/>' +
        '<path d="M73 68 L75 50 L59 60 Z" fill="' + T(C.peach)[1] + '"/>' +
        '<path d="M18 88 Q18 56 50 56 Q82 56 82 88 Z" fill="' + T(C.peach)[1] + '"/>' +
        '<path d="M50 56 Q82 56 82 88 L55 88 Z" fill="' + T(C.peach)[2] + '" stroke="none"/>' +
        dot(39, 71) + dot(61, 71) +
        ink('M44 79 q6 5 12 0', 2.4) +
        ell(30, 70, 6, 4, T(C.pink)[0]).replace('/>', ' stroke="none"/>')
    },
    {
      id: 'duck-rubber', name: 'Rubber Duck', price: 25, cat: 'plush', size: 0.07,
      art:
        blob(46, 74, 26, 15, C.yellow) +
        '<path d="M58 62 Q82 58 85 78 Q70 84 60 76 Z" fill="' + T(C.yellow)[1] + '"/>' +
        blob(62, 45, 17, 16, C.yellow) +
        '<path d="M77 44 l16 5 l-16 6 Z" fill="' + T(C.peach)[1] + '"/>' +
        dot(63, 40, 2.8)
    },

    /* ── Furniture ─────────────────────────────────────────── */
    {
      id: 'table-tea', name: 'Tea Table', price: 50, cat: 'furniture', size: 0.20,
      art:
        box(44, 77, 2.8, 2.8, 14, C.brownD) +
        box(26, 82.2, 2.8, 2.8, 14, C.brownD) +
        box(74, 85.8, 2.8, 2.8, 14, C.brownD) +
        box(56, 91, 2.8, 2.8, 14, C.brownD) +
        box(50, 70, 16, 10, 4.5, C.brown)
    },
    {
      id: 'chair-comfy', name: 'Comfy Chair', price: 70, cat: 'furniture', size: 0.19,
      art:
        box(37, 64.2, 2.5, 11, 21, C.pinkD) +
        box(61, 64.8, 12, 2.8, 9, C.pinkD) +
        box(48, 80.1, 2.6, 2.6, 9, C.brownD) +
        box(30, 85.4, 2.6, 2.6, 9, C.brownD) +
        box(70, 86.6, 2.6, 2.6, 9, C.brownD) +
        box(52, 91.9, 2.6, 2.6, 9, C.brownD) +
        box(50, 77, 13, 11, 9, C.pink) +
        box(39, 71.2, 12, 2.8, 9, C.pinkD)
    },
    {
      id: 'bookshelf', name: 'Bookshelf', price: 90, cat: 'furniture', size: 0.20,
      // Three evenly spaced boards, left bare — drop a book set on one to
      // fill it. `shelves` are the mid-points of each shelf's standing line
      // and `shelfSpan` how much of it a set covers; see "Shelves" below.
      shelves: [[43, 84.7], [43, 69.8], [43, 54.9]],
      shelfSpan: 26,
      art:
        box(50, 86, 17, 7, 50, C.brown) +
        faceL([29, 80.9], 28, 42, T(C.brown)[2]) +
        faceL([29, 68.6], 28, 2.6, T(C.brown)[0]) +
        faceL([29, 53.7], 28, 2.6, T(C.brown)[0])
    },
    {
      id: 'beanbag', name: 'Bean Bag', price: 75, cat: 'furniture', size: 0.16,
      art:
        '<path d="M16 86 Q12 58 38 51 Q62 45 78 60 Q90 74 80 86 Z" fill="' + T(C.lav)[1] + '"/>' +
        '<path d="M54 47 Q76 51 82 66 Q90 78 80 86 L57 86 Q64 64 54 47 Z" fill="' + T(C.lav)[2] + '" stroke="none"/>' +
        ell(33, 62, 8.5, 5, T(C.lav)[0], -24).replace('/>', ' stroke="none"/>')
    },
    {
      id: 'stool-mushroom', name: 'Mushroom Stool', price: 55, cat: 'furniture', size: 0.12,
      art:
        cyl(50, G, 9, 20, C.cream) +
        '<path d="M20 70 Q20 40 50 40 Q80 40 80 70 Z" fill="' + T(C.red)[1] + '"/>' +
        '<path d="M50 40 Q80 40 80 70 L54 70 Z" fill="' + T(C.red)[2] + '" stroke="none"/>' +
        ell(50, 70, 30, 8.8, T(C.red)[0]) +
        ell(36, 55, 7, 5, T(C.cream)[0]).replace('/>', ' stroke="none"/>') +
        ell(60, 51, 5, 3.6, T(C.cream)[0]).replace('/>', ' stroke="none"/>')
    },
    {
      id: 'piano-tiny', name: 'Tiny Piano', price: 130, cat: 'furniture', size: 0.22,
      art:
        box(50, 84, 20, 12, 18, C.dark) +
        faceL([31, 83.4], 27, 6, T(C.white)[0]) +
        ink('M35 84.6 v-5 M39 85.8 v-5 M43 87 v-5 M47 88.2 v-5 M51 89.4 v-5 M55 90.6 v-5', 1.8) +
        box(50, 66, 20, 12, 2.5, C.dark)
    },

    /* ── Plants ────────────────────────────────────────────── */
    {
      id: 'cactus', name: 'Cactus Pal', price: 40, cat: 'plant', size: 0.10,
      art:
        '<rect x="24" y="46" width="13" height="24" rx="6.5" fill="' + T(C.green)[1] + '"/>' +
        '<rect x="63" y="52" width="13" height="20" rx="6.5" fill="' + T(C.green)[1] + '"/>' +
        '<rect x="39" y="28" width="22" height="50" rx="11" fill="' + T(C.green)[1] + '"/>' +
        '<rect x="51" y="30" width="9" height="46" rx="4.5" fill="' + T(C.green)[2] + '" stroke="none"/>' +
        taper(50, G, 12, 14, 13, C.peach) +
        ell(50, 27, 6, 4.5, T(C.pink)[1])
    },
    {
      id: 'plant-tall', name: 'Tall Plant', price: 70, cat: 'plant', size: 0.16,
      art:
        ell(28, 42, 15, 9, T(C.green)[2], -40) +
        ell(72, 38, 15, 9, T(C.green)[1], 38) +
        ell(50, 26, 11, 17, T(C.green)[0]) +
        ink('M50 66 V32 M50 52 L32 44 M50 46 L68 40', 3) +
        taper(50, G, 15, 18, 20, C.brown)
    },
    {
      id: 'vase-flowers', name: 'Flower Vase', price: 50, cat: 'plant', size: 0.11,
      art:
        ink('M50 62 V38 M50 54 L34 40 M50 50 L66 38', 2.6) +
        ell(34, 36, 8, 7, T(C.pink)[1]) +
        ell(66, 34, 8, 7, T(C.yellow)[1]) +
        ell(50, 30, 9, 8, T(C.lav)[0]) +
        taper(50, G, 11, 8, 26, C.blue)
    },

    /* ── Lighting & decor ──────────────────────────────────── */
    {
      id: 'lamp-floor', name: 'Floor Lamp', price: 65, cat: 'decor', size: 0.13,
      art:
        cyl(50, G, 14, 3, C.dark) +
        '<rect x="47" y="44" width="6" height="42" rx="3" fill="' + T(C.dark)[1] + '"/>' +
        taper(50, 46, 21, 13, 21, C.yellow)
    },
    {
      id: 'lamp-table', name: 'Table Lamp', price: 45, cat: 'decor', size: 0.09,
      art:
        cyl(50, G, 13, 4, C.dark) +
        '<rect x="47" y="56" width="6" height="28" rx="3" fill="' + T(C.dark)[1] + '"/>' +
        taper(50, 58, 20, 12, 20, C.cream)
    },
    {
      id: 'moon-lamp', name: 'Moon Lamp', price: 85, cat: 'decor', size: 0.11,
      art:
        cyl(50, G, 11, 6, C.dark) +
        ball(50, 52, 27, C.cream) +
        dot(41, 50, 2.6) + dot(59, 50, 2.6) +
        ink('M45 59 q5 5 10 0', 2.4) +
        ell(35, 58, 5, 3.4, T(C.pink)[1]).replace('/>', ' stroke="none"/>') +
        ell(65, 58, 5, 3.4, T(C.pink)[1]).replace('/>', ' stroke="none"/>')
    },

    /* ── Wall pieces (flat — the room shears them onto the wall) ── */
    {
      id: 'fairy-lights', name: 'Fairy Lights', price: 50, cat: 'decor', size: 0.28,
      art:
        ink('M3 26 Q26 58 50 38 Q74 18 97 46', 3) +
        ell(14, 44, 5, 6, T(C.yellow)[1]) + ell(31, 51, 5, 6, T(C.yellow)[0]) +
        ell(50, 47, 5, 6, T(C.yellow)[1]) + ell(69, 33, 5, 6, T(C.yellow)[0]) +
        ell(86, 39, 5, 6, T(C.yellow)[1])
    },
    {
      id: 'window-round', name: 'Round Window', price: 75, cat: 'decor', size: 0.17,
      art:
        '<circle cx="50" cy="50" r="42" fill="' + T(C.cream)[2] + '"/>' +
        '<circle cx="50" cy="50" r="34" fill="' + T(C.blue)[0] + '"/>' +
        ell(38, 58, 14, 8, T(C.white)[0]).replace('/>', ' stroke="none"/>') +
        ell(60, 42, 10, 6, T(C.white)[0]).replace('/>', ' stroke="none"/>') +
        ink('M50 16 V84 M16 50 H84', 4)
    },
    {
      id: 'curtain', name: 'Frilly Curtain', price: 55, cat: 'decor', size: 0.24,
      art:
        '<path d="M10 18 Q18 50 12 86 Q26 80 34 86 Q30 50 34 18 Z" fill="' + T(C.pink)[1] + '"/>' +
        '<path d="M66 18 Q70 50 66 86 Q74 80 88 86 Q82 50 90 18 Z" fill="' + T(C.pink)[1] + '"/>' +
        '<path d="M24 18 Q22 52 26 84 Q30 80 34 86 Q30 50 34 18 Z" fill="' + T(C.pink)[2] + '" stroke="none"/>' +
        '<path d="M78 18 Q74 52 78 84 Q82 80 88 86 Q82 50 90 18 Z" fill="' + T(C.pink)[2] + '" stroke="none"/>' +
        '<rect x="4" y="10" width="92" height="9" rx="4.5" fill="' + T(C.brown)[0] + '"/>'
    },
    {
      id: 'frame-photo', name: 'Photo Frame', price: 35, cat: 'decor', size: 0.10,
      art:
        '<rect x="14" y="18" width="72" height="64" rx="8" fill="' + T(C.brown)[2] + '"/>' +
        '<rect x="22" y="26" width="56" height="48" rx="5" fill="' + T(C.cream)[0] + '"/>' +
        '<path d="M28 68 L42 48 L54 62 L64 52 L72 68 Z" fill="' + T(C.mint)[1] + '"/>' +
        '<circle cx="63" cy="37" r="6" fill="' + T(C.yellow)[0] + '"/>'
    },
    {
      id: 'poster-cat', name: 'Cat Poster', price: 55, cat: 'decor', size: 0.13,
      art:
        '<rect x="16" y="10" width="68" height="80" rx="6" fill="' + T(C.cream)[0] + '"/>' +
        '<path d="M33 48 L31 32 L45 41 Z" fill="' + T(C.lav)[1] + '"/>' +
        '<path d="M67 48 L69 32 L55 41 Z" fill="' + T(C.lav)[1] + '"/>' +
        '<path d="M28 70 Q28 42 50 42 Q72 42 72 70 Z" fill="' + T(C.lav)[1] + '"/>' +
        '<path d="M50 42 Q72 42 72 70 L54 70 Z" fill="' + T(C.lav)[2] + '" stroke="none"/>' +
        dot(42, 55, 2.2) + dot(58, 55, 2.2) + ink('M45 62 q5 4 10 0', 2.2)
    },
    {
      id: 'mirror-oval', name: 'Oval Mirror', price: 60, cat: 'decor', size: 0.13,
      art:
        ell(50, 50, 32, 42, T(C.brown)[2]) +
        ell(50, 50, 25, 35, T(C.blue)[0]) +
        ink('M38 34 L30 52 M46 32 L38 44', 4)
    },
    {
      id: 'garland-star', name: 'Star Garland', price: 45, cat: 'decor', size: 0.30,
      art:
        ink('M2 22 Q50 58 98 22', 3) +
        [[14, 42], [32, 52], [50, 56], [68, 52], [86, 42]].map(function (s, i) {
          return star(s[0], s[1], 11, T(i % 2 ? C.yellow : C.pink)[1]);
        }).join('')
    },
    {
      id: 'bunting', name: 'Bunting Flags', price: 40, cat: 'decor', size: 0.30,
      art:
        ink('M2 26 Q50 50 98 26', 3) +
        [[12, 36, C.pink], [29, 44, C.yellow], [50, 47, C.mint], [71, 44, C.blue], [88, 36, C.lav]]
          .map(function (f) {
            return '<path d="M' + (f[0] - 9) + ' ' + f[1] + ' L' + (f[0] + 9) + ' ' + f[1] +
              ' L' + f[0] + ' ' + (f[1] + 19) + ' Z" fill="' + T(f[2])[1] + '"/>';
          }).join('')
    },
    {
      id: 'rainbow', name: 'Rainbow', price: 65, cat: 'decor', size: 0.18,
      art:
        '<path d="M6 76 A44 44 0 0 1 94 76 L78 76 A28 28 0 0 0 22 76 Z" fill="' + T(C.pink)[1] + '"/>' +
        '<path d="M22 76 A28 28 0 0 1 78 76 L64 76 A14 14 0 0 0 36 76 Z" fill="' + T(C.yellow)[1] + '"/>' +
        '<path d="M36 76 A14 14 0 0 1 64 76 Z" fill="' + T(C.blue)[1] + '"/>' +
        ell(14, 80, 13, 8, T(C.white)[0]) + ell(86, 80, 13, 8, T(C.white)[0])
    },
    {
      id: 'cloud', name: 'Fluffy Cloud', price: 30, cat: 'decor', size: 0.15,
      art:
        '<path d="M22 70 Q6 70 6 56 Q6 44 20 43 Q22 26 40 26 Q54 26 59 38 Q78 36 82 50 Q94 54 90 66 Q88 70 78 70 Z" fill="' + T(C.white)[1] + '"/>' +
        '<path d="M59 38 Q78 36 82 50 Q94 54 90 66 Q88 70 78 70 L52 70 Z" fill="' + T(C.white)[2] + '" stroke="none"/>' +
        ell(26, 50, 10, 6, T(C.white)[0], -18).replace('/>', ' stroke="none"/>')
    },

    /* ── Snacks ────────────────────────────────────────────── */
    {
      id: 'cake-strawberry', name: 'Berry Cake', price: 35, cat: 'food', size: 0.09,
      art:
        cyl(50, G, 25, 20, C.cream) +
        cyl(50, 68, 25, 6, C.pink) +
        ball(50, 50, 11, C.red) +
        ink('M50 40 q5 -6 10 -5', 2.4)
    },
    {
      id: 'boba', name: 'Boba Tea', price: 30, cat: 'food', size: 0.07,
      art:
        taper(50, G, 16, 21, 46, C.brown) +
        [[43, 82], [53, 84], [48, 76], [58, 78]].map(function (b) {
          return '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="3.6" fill="' + C.ink + '" stroke="none"/>';
        }).join('') +
        cyl(50, 42, 21, 5, C.pink) +
        '<rect x="54" y="10" width="7" height="28" rx="3.5" fill="' + T(C.mint)[1] + '" transform="rotate(9 57 24)"/>'
    },
    {
      id: 'donut', name: 'Donut', price: 25, cat: 'food', size: 0.08,
      art:
        ring(50, 78, 34, 12, C.brown) +
        ring(50, 73, 32, 11, C.pink) +
        [[30, 70, C.yellow], [48, 64, C.mint], [68, 70, C.blue], [40, 82, C.lav], [62, 82, C.yellow]]
          .map(function (s) {
            return '<rect x="' + s[0] + '" y="' + s[1] + '" width="7" height="3.4" rx="1.7" fill="' +
              T(s[2])[1] + '" stroke="none"/>';
          }).join('')
    },
    {
      id: 'cupcake', name: 'Cupcake', price: 30, cat: 'food', size: 0.08,
      art:
        taper(50, G, 17, 21, 22, C.peach) +
        ball(50, 58, 21, C.pink) +
        ball(50, 42, 14, C.pink) +
        ball(50, 28, 7, C.red)
    },
    {
      id: 'mug-cocoa', name: 'Cocoa Mug', price: 20, cat: 'food', size: 0.07,
      art:
        '<path d="M68 60 q16 0 16 11 q0 11 -16 11" fill="none" stroke-width="6"/>' +
        cyl(50, G, 21, 34, C.white) +
        ell(50, 54, 16, 4.7, T(C.brown)[1]).replace('/>', ' stroke="none"/>') +
        ell(45, 53, 5, 2.6, T(C.cream)[0]).replace('/>', ' stroke="none"/>') +
        ell(55, 55, 4.4, 2.3, T(C.cream)[0]).replace('/>', ' stroke="none"/>')
    },

    /* ── Gadgets ───────────────────────────────────────────── */
    {
      id: 'tv-retro', name: 'Retro TV', price: 110, cat: 'tech', size: 0.16,
      art:
        box(39, 83, 2, 2, 6, C.brownD) +
        box(61, 88, 2, 2, 6, C.brownD) +
        box(50, 80, 16, 11, 27, C.cream) +
        faceL([27.5, 76.8], 22, 21, T(C.blue)[2]) +
        faceL([29.5, 77.4], 18, 17, T(C.blue)[0]) +
        '<circle cx="51" cy="83.5" r="2.6" fill="' + T(C.brown)[1] + '" stroke="none"/>' +
        '<circle cx="51" cy="76.5" r="2.6" fill="' + T(C.brown)[1] + '" stroke="none"/>'
    },
    {
      id: 'record-player', name: 'Record Player', price: 95, cat: 'tech', size: 0.14,
      art:
        box(50, 84, 18, 12, 8, C.brown) +
        ell(46, 75, 14, 4.1, T(C.dark)[1]) +
        ell(46, 75, 4.4, 1.3, T(C.pink)[0]).replace('/>', ' stroke="none"/>') +
        ink('M68 70 L54 76', 2.6) +
        '<circle cx="69" cy="69" r="3" fill="' + T(C.cream)[0] + '"/>'
    },
    {
      id: 'laptop', name: 'Laptop', price: 60, cat: 'tech', size: 0.13,
      art:
        box(36, 77.4, 2, 11, 20, C.gray) +
        faceR([47, 75.6], 18, 17, T(C.blue)[2]) +
        box(50, G, 15, 11, 3, C.gray) +
        slab(50, 85, 13, 9.5, T(C.gray)[0]) +
        ink('M44 85 l8 2.4 M48 82 l8 2.4 M40 88 l8 2.4', 1.8)
    },
    /* ── Book sets ─────────────────────────────────────────────
       Drawn as an isometric row so they sit straight on a shelf. All three
       share the same `anchor` and `span`, so any set drops into any slot. */
    {
      id: 'books-row', name: 'Book Row', price: 35, cat: 'decor', size: 0.09,
      shelvable: 1, anchor: [49.1, 76], span: 68.2,
      art: books(15, 66, [[C.red, 30], [C.blue, 26], [C.yellow, 29], [C.mint, 24], [C.lav, 28]], 13)
    },
    {
      id: 'books-pastel', name: 'Pastel Books', price: 40, cat: 'decor', size: 0.09,
      shelvable: 1, anchor: [49.1, 76], span: 68.2,
      art: books(15, 66, [[C.pink, 27], [C.mint, 31], [C.lav, 25], [C.blue, 29], [C.peach, 26]], 13)
    },
    {
      id: 'books-leaning', name: 'Leaning Books', price: 45, cat: 'decor', size: 0.09,
      shelvable: 1, anchor: [49.1, 76], span: 68.2,
      // no brown spines — they vanish against the shelf they sit on
      art: books(15, 66, [[C.blue, 29], [C.green, 25], [C.red, 30], [C.mint, 24]], 13) +
        // the last one tipped back against its neighbours, pivoting on its foot
        '<g transform="rotate(-10 70 82.1)">' + books(70, 82.1, [[C.yellow, 25]], 13) + '</g>'
    },

    /* ── Friends ───────────────────────────────────────────── */
    {
      id: 'friend-fox', name: 'Fox', price: 90, cat: 'friend', size: 0.13,
      art: friendBody(C.peachD, C.cream,
        '<path d="M32 23 L29 5 L46 16 Z" fill="' + T(C.peachD)[1] + '"/>' +
        '<path d="M68 23 L71 5 L54 16 Z" fill="' + T(C.peachD)[1] + '"/>' +
        blob(50, 34, 20, 18, C.peachD) +
        ell(50, 41, 12.5, 8.5, T(C.white)[0]) +
        fEyes(32, 7) + cheeks(38, 16, 5) +
        ell(50, 38, 3.6, 2.7, C.ink).replace('/>', ' stroke="none"/>') +
        ink('M46 43 q4 3.5 8 0', 2.2))
    },
    {
      id: 'friend-penguin', name: 'Penguin', price: 100, cat: 'friend', size: 0.12,
      art: friendBody(C.slate, C.white,
        blob(50, 34, 19.5, 18, C.slate) +
        ell(50, 39, 13.5, 11, T(C.white)[0]) +
        fEyes(33, 7) +
        '<path d="M45 40 L55 40 L50 48 Z" fill="' + T(C.yellow)[1] + '"/>', C.yellow)
    },
    {
      id: 'friend-frog', name: 'Frog', price: 70, cat: 'friend', size: 0.12,
      art: friendBody(C.green, C.mint,
        blob(50, 39, 20, 15, C.green) +
        '<circle cx="36" cy="22" r="10.5" fill="' + T(C.green)[0] + '"/>' +
        '<circle cx="64" cy="22" r="10.5" fill="' + T(C.green)[0] + '"/>' +
        fEye(36, 22, 4.6) + fEye(64, 22, 4.6) +
        cheeks(42, 16, 5) +
        ink('M38 42 q12 9 24 0', 2.6))
    },
    {
      id: 'friend-hamster', name: 'Hamster', price: 65, cat: 'friend', size: 0.11,
      art: friendBody(C.peach, C.cream,
        '<circle cx="36" cy="21" r="6" fill="' + T(C.peach)[1] + '"/>' +
        '<circle cx="64" cy="21" r="6" fill="' + T(C.peach)[1] + '"/>' +
        blob(50, 35, 20.5, 18, C.peach) +
        cheeks(41, 15, 6.5) + fEyes(33, 8) +
        ell(50, 38, 2.9, 2.2, C.ink).replace('/>', ' stroke="none"/>') +
        ink('M46 42 q4 3 8 0', 2.2))
    },
    {
      id: 'friend-sheep', name: 'Sheep', price: 95, cat: 'friend', size: 0.13,
      art: friendBody(C.white, C.white,
        // wool tufts around the body, then a darker face
        '<circle cx="33" cy="30" r="9.5" fill="' + T(C.white)[1] + '"/>' +
        '<circle cx="67" cy="30" r="9.5" fill="' + T(C.white)[1] + '"/>' +
        '<circle cx="40" cy="20" r="10" fill="' + T(C.white)[1] + '"/>' +
        '<circle cx="60" cy="20" r="10" fill="' + T(C.white)[1] + '"/>' +
        '<circle cx="50" cy="16" r="10" fill="' + T(C.white)[0] + '"/>' +
        ell(28, 40, 8.5, 5, T(C.gray)[1], -20) + ell(72, 40, 8.5, 5, T(C.gray)[1], 20) +
        blob(50, 39, 16.5, 14, C.gray) +
        fEyes(37, 6.5, 2.7) + cheeks(44, 11, 4) +
        ink('M46 44 q4 3 8 0', 2.2))
    },
    {
      id: 'friend-deer', name: 'Deer', price: 120, cat: 'friend', size: 0.14,
      art: friendBody(C.brown, C.cream,
        ink('M38 20 L33 4 M35 12 L25 9 M62 20 L67 4 M65 12 L75 9', 3) +
        ell(30, 33, 7.5, 5, T(C.brown)[1], -22) + ell(70, 33, 7.5, 5, T(C.brown)[1], 22) +
        blob(50, 34, 19, 18, C.brown) +
        ell(50, 42, 10, 7, T(C.cream)[0]) +
        fEyes(32, 7) + cheeks(39, 15, 4.5) +
        ell(50, 39, 3.2, 2.4, C.ink).replace('/>', ' stroke="none"/>') +
        // dappled back
        ell(40, 62, 3.4, 2.4, T(C.cream)[0]).replace('/>', ' stroke="none"/>') +
        ell(60, 59, 3, 2.1, T(C.cream)[0]).replace('/>', ' stroke="none"/>'))
    },
    {
      id: 'friend-koala', name: 'Koala', price: 110, cat: 'friend', size: 0.13,
      art: friendBody(C.gray, C.gray,
        '<circle cx="27" cy="30" r="12" fill="' + T(C.gray)[1] + '"/>' +
        '<circle cx="73" cy="30" r="12" fill="' + T(C.gray)[1] + '"/>' +
        '<circle cx="27" cy="30" r="6.5" fill="' + T(C.pink)[0] + '" stroke="none"/>' +
        '<circle cx="73" cy="30" r="6.5" fill="' + T(C.pink)[0] + '" stroke="none"/>' +
        blob(50, 34, 20, 18, C.gray) +
        fEyes(31, 8.5) +
        ell(50, 40, 7, 8.5, T(C.dark)[1]) +
        ink('M43 47 q7 4 14 0', 2.2))
    },
    {
      id: 'friend-axolotl', name: 'Axolotl', price: 130, cat: 'friend', size: 0.12,
      art: friendBody(C.pink, C.pinkL,
        // gill frills
        ell(24, 26, 7, 4, T(C.pinkD)[1], -32) + ell(21, 35, 7, 4, T(C.pinkD)[1], -8) +
        ell(76, 26, 7, 4, T(C.pinkD)[1], 32) + ell(79, 35, 7, 4, T(C.pinkD)[1], 8) +
        blob(50, 35, 20, 17, C.pink) +
        fEyes(33, 8, 2.6) + cheeks(40, 14, 5) +
        ink('M43 40 q7 5 14 0', 2.4))
    },

    {
      id: 'console', name: 'Game Console', price: 100, cat: 'tech', size: 0.11,
      art:
        box(50, G, 15, 10, 6, C.lav) +
        slab(50, 82, 9, 6.5, T(C.blue)[0]) +
        '<circle cx="66" cy="81.4" r="3" fill="' + T(C.red)[1] + '" stroke="none"/>' +
        '<circle cx="71" cy="82.8" r="3" fill="' + T(C.mint)[1] + '" stroke="none"/>' +
        ink('M31 81 h7 M34.5 78 v6', 2.4)
    }
  ];

  SN.STICKERS = STICKERS;
  SN.STICKER_BY_ID = STICKERS.reduce(function (m, s) { m[s.id] = s; return m; }, {});

  SN.CATEGORIES = [
    { id: 'all', name: 'All' },
    { id: 'walls', name: 'Walls' },
    { id: 'floors', name: 'Floors' },
    { id: 'friend', name: 'Friends' },
    { id: 'furniture', name: 'Furniture' },
    { id: 'plush', name: 'Plushies' },
    { id: 'plant', name: 'Plants' },
    { id: 'decor', name: 'Decor' },
    { id: 'food', name: 'Snacks' },
    { id: 'tech', name: 'Gadgets' }
  ];

  /** Render one sticker as a standalone <svg> string. */
  SN.stickerSVG = function (id, cls) {
    var s = SN.STICKER_BY_ID[id];
    if (!s) return '';
    return '<svg class="' + (cls || '') + '" viewBox="0 0 100 100" ' +
      'stroke="' + C.ink + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" ' +
      'fill="none" aria-hidden="true">' + s.art + '</svg>';
  };

})(window.SN = window.SN || {});
