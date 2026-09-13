/* ============================================================
   Isometric drawing kit
   ------------------------------------------------------------
   Chunky axonometric solids for the 100×100 sticker box. Every
   solid is cel-shaded from a single base colour into exactly
   three flat tones — top highlight, base side, shadow side —
   so the whole catalog stays one set without hand-picking a
   palette per object. No gradients, no reflections.

   The dark outline comes from the wrapper <svg> (3px, rounded
   joins), so shapes only ever set a fill. Pass stroke="none"
   on interior shading that shouldn't be outlined.
   ============================================================ */
(function (SN) {
  'use strict';

  /* How steep the isometric axes run. This is the room's own floor slope
     (135/460), so solids drawn here sit flush on the floor diamond. A classic
     30° axonometric would be 0.577 — objects read taller and more dramatic,
     but they stop lining up with the room. One constant, change it here. */
  var R = 0.293;

  var INK = '#4a3b52';
  var GY = 88;          // standard ground line: every floor piece sits here

  /* ── tones ──────────────────────────────────────────────── */

  function chan(h, i) { return parseInt(h.substr(1 + i * 2, 2), 16); }
  function hx(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
  function mix(a, b, t) {
    return '#' + hx(chan(a, 0) + (chan(b, 0) - chan(a, 0)) * t) +
      hx(chan(a, 1) + (chan(b, 1) - chan(a, 1)) * t) +
      hx(chan(a, 2) + (chan(b, 2) - chan(a, 2)) * t);
  }

  /** [highlight, base, shadow] — the only three tones an object may use. */
  function tones(base) { return [mix(base, '#ffffff', 0.30), base, mix(base, INK, 0.22)]; }
  function hi(base) { return tones(base)[0]; }
  function sh(base) { return tones(base)[2]; }

  /* ── geometry helpers ───────────────────────────────────── */

  function n(v) { return Math.round(v * 10) / 10; }

  /** Step from (cx,cy) by `da` along the right-hand axis and `db` along the left. */
  function at(cx, cy, da, db) { return [cx + da - db, cy + (da + db) * R]; }

  function poly(pts, fill, extra) {
    return '<polygon points="' + pts.map(function (p) { return n(p[0]) + ',' + n(p[1]); }).join(' ') +
      '" fill="' + fill + '"' + (extra || '') + '/>';
  }

  function arc(rx, ry, x, y, sweep, large) {
    return ' A' + n(rx) + ' ' + n(ry) + ' 0 ' + (large || 0) + ' ' + sweep + ' ' + n(x) + ' ' + n(y);
  }

  /* ── solids ─────────────────────────────────────────────── */

  /**
   * Isometric cuboid. (cx,cy) is the centre of its base diamond, `a` and `b`
   * are the half-footprints along the right and left axes, `h` its height.
   * Only the three faces a viewer can see are drawn.
   */
  function box(cx, cy, a, b, h, base) {
    var t = tones(base);
    var ux = a, uy = a * R, vx = -b, vy = b * R;
    var bk = [cx - ux - vx, cy - uy - vy];
    var rt = [cx + ux - vx, cy + uy - vy];
    var ft = [cx + ux + vx, cy + uy + vy];
    var lf = [cx - ux + vx, cy - uy + vy];
    function up(p) { return [p[0], p[1] - h]; }
    return poly([lf, ft, up(ft), up(lf)], t[1]) +
      poly([ft, rt, up(rt), up(ft)], t[2]) +
      poly([up(bk), up(rt), up(ft), up(lf)], t[0]);
  }

  /** The top face of a box on its own — for laying a panel onto another solid. */
  function top(cx, cy, a, b, base) {
    var ux = a, uy = a * R, vx = -b, vy = b * R;
    return poly([[cx - ux - vx, cy - uy - vy], [cx + ux - vx, cy + uy - vy],
      [cx + ux + vx, cy + uy + vy], [cx - ux + vx, cy - uy + vy]], base);
  }

  /**
   * Like box(), but with rounded corners and a softly curved front — for
   * mattresses, duvets and pillows, which shouldn't read as hard crates.
   * `round` is how far into each edge the corner curve starts (0–0.5).
   */
  function softSlab(cx, cy, a, b, h, base, round) {
    var t = tones(base);
    var f = round == null ? 0.28 : round;
    var ux = a, uy = a * R, vx = -b, vy = b * R;
    // counter-clockwise, so walking forward from the left corner runs
    // left → front → right: exactly the silhouette the viewer sees.
    var ring = [
      [cx - ux - vx, cy - uy - vy],   // back
      [cx - ux + vx, cy - uy + vy],   // left
      [cx + ux + vx, cy + uy + vy],   // front
      [cx + ux - vx, cy + uy - vy]    // right
    ];

    function L(p, q, k) { return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; }
    function P(p, dy) { return n(p[0]) + ' ' + n(p[1] - dy); }

    var seg = ring.map(function (c, i) {
      return { c: c, a: L(c, ring[(i + 3) % 4], f), b: L(c, ring[(i + 1) % 4], f) };
    });

    // one rounded corner, arriving along the edge and leaving around it
    function bend(i, dy) { return ' L' + P(seg[i].a, dy) + ' Q' + P(seg[i].c, dy) + ' ' + P(seg[i].b, dy); }

    var topD = 'M' + P(seg[0].b, h);
    for (var i = 1; i <= 4; i++) topD += bend(i % 4, h);
    topD += ' Z';

    // the front runs left(1) → front(2) → right(3); the side wall is that
    // silhouette raised by h, dropped to the ground, and walked back.
    var side = 'M' + P(seg[1].a, h) + ' Q' + P(ring[1], h) + ' ' + P(seg[1].b, h) +
      bend(2, h) + bend(3, h) +
      ' L' + P(seg[3].b, 0) + ' Q' + P(ring[3], 0) + ' ' + P(seg[3].a, 0) +
      ' L' + P(seg[2].b, 0) + ' Q' + P(ring[2], 0) + ' ' + P(seg[2].a, 0) +
      ' L' + P(seg[1].b, 0) + ' Q' + P(ring[1], 0) + ' ' + P(seg[1].a, 0) + ' Z';

    // the half past the front corner turns away from the light
    var dark = 'M' + P(seg[2].b, h) + bend(3, h) +
      ' L' + P(seg[3].b, 0) + ' Q' + P(ring[3], 0) + ' ' + P(seg[3].a, 0) +
      ' L' + P(seg[2].b, 0) + ' Z';

    return '<path d="' + side + '" fill="' + t[1] + '"/>' +
      '<path d="' + dark + '" fill="' + t[2] + '" stroke="none"/>' +
      '<path d="' + topD + '" fill="' + t[0] + '"/>';
  }

  /** Upright cylinder standing on (cx,cy). */
  function cyl(cx, cy, rx, h, base) {
    var t = tones(base), ry = rx * R;
    return '<path d="M' + n(cx - rx) + ' ' + n(cy - h) + ' L' + n(cx - rx) + ' ' + n(cy) +
      arc(rx, ry, cx + rx, cy, 0) + ' L' + n(cx + rx) + ' ' + n(cy - h) + '" fill="' + t[1] + '"/>' +
      '<path d="M' + n(cx + rx * 0.25) + ' ' + n(cy - h) + ' L' + n(cx + rx * 0.25) + ' ' + n(cy + ry * 0.97) +
      arc(rx, ry, cx + rx, cy, 0) + ' L' + n(cx + rx) + ' ' + n(cy - h) + ' Z" fill="' + t[2] + '" stroke="none"/>' +
      '<ellipse cx="' + n(cx) + '" cy="' + n(cy - h) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' + t[0] + '"/>';
  }

  /** Truncated cone — pots, lampshades, cupcake cases. `rt` may exceed `rb`. */
  function taper(cx, cy, rb, rt, h, base) {
    var t = tones(base), ryb = rb * R, ryt = rt * R;
    return '<path d="M' + n(cx - rb) + ' ' + n(cy) + arc(rb, ryb, cx + rb, cy, 0) +
      ' L' + n(cx + rt) + ' ' + n(cy - h) + ' L' + n(cx - rt) + ' ' + n(cy - h) + ' Z" fill="' + t[1] + '"/>' +
      '<path d="M' + n(cx + rb * 0.28) + ' ' + n(cy + ryb * 0.96) + arc(rb, ryb, cx + rb, cy, 0) +
      ' L' + n(cx + rt) + ' ' + n(cy - h) + ' L' + n(cx + rt * 0.28) + ' ' + n(cy - h) +
      ' Z" fill="' + t[2] + '" stroke="none"/>' +
      '<ellipse cx="' + n(cx) + '" cy="' + n(cy - h) + '" rx="' + n(rt) + '" ry="' + n(ryt) + '" fill="' + t[0] + '"/>';
  }

  /** Something flat lying on the floor — rugs, mats, cushions. */
  function disc(cx, cy, rx, base) {
    var t = tones(base), ry = rx * R;
    return '<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' + t[1] + '"/>' +
      '<ellipse cx="' + n(cx) + '" cy="' + n(cy + ry * 0.22) + '" rx="' + n(rx * 0.99) + '" ry="' + n(ry * 0.72) +
      '" fill="' + t[2] + '" stroke="none" opacity=".55"/>';
  }

  /** Sphere, cel-shaded: base, a crescent of shadow, one highlight dab. */
  function ball(cx, cy, r, base) {
    var t = tones(base);
    function p(deg, rad) {
      var a = deg * Math.PI / 180;
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    }
    var s = p(-22, r), e = p(112, r);
    return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="' + t[1] + '"/>' +
      '<path d="M' + n(s[0]) + ' ' + n(s[1]) + arc(r, r, e[0], e[1], 1) +
      arc(r * 1.35, r * 1.35, s[0], s[1], 0) + ' Z" fill="' + t[2] + '" stroke="none"/>' +
      '<ellipse cx="' + n(cx - r * 0.34) + '" cy="' + n(cy - r * 0.4) + '" rx="' + n(r * 0.3) + '" ry="' + n(r * 0.2) +
      '" fill="' + t[0] + '" stroke="none" transform="rotate(-32 ' + n(cx - r * 0.34) + ' ' + n(cy - r * 0.4) + ')"/>';
  }

  /** A ring lying flat — donuts, tyre shapes. */
  function ring(cx, cy, rx, inner, base) {
    var t = tones(base), ry = rx * R, iy = inner * R;
    function ell(a, b) {
      return 'M' + n(cx - a) + ' ' + n(cy) + arc(a, b, cx + a, cy, 0, 1) + arc(a, b, cx - a, cy, 0, 1) + ' Z';
    }
    return '<path d="' + ell(rx, ry) + ' ' + ell(inner, iy) + '" fill="' + t[1] + '" fill-rule="evenodd"/>';
  }

  /** The four ground corners of a box footprint, for hanging detail off. */
  function corners(cx, cy, a, b) {
    return {
      bk: [cx - a + b, cy - (a + b) * R],
      rt: [cx + a + b, cy + (a - b) * R],
      ft: [cx + a - b, cy + (a + b) * R],
      lf: [cx - a - b, cy + (b - a) * R]
    };
  }

  /** Flat detail on the down-left face: `w` runs toward the front, `h` upward. */
  function faceL(p, w, h, fill) {
    return poly([p, [p[0] + w, p[1] + w * R], [p[0] + w, p[1] + w * R - h], [p[0], p[1] - h]],
      fill, ' stroke="none"');
  }

  /** Flat detail on the down-right face: `w` runs toward the front, `h` upward. */
  function faceR(p, w, h, fill) {
    return poly([p, [p[0] - w, p[1] + w * R], [p[0] - w, p[1] + w * R - h], [p[0], p[1] - h]],
      fill, ' stroke="none"');
  }

  SN.ISO = {
    R: R, GY: GY, INK: INK,
    tones: tones, hi: hi, sh: sh, mix: mix,
    at: at, poly: poly, n: n,
    box: box, softSlab: softSlab, top: top, cyl: cyl, taper: taper, disc: disc, ball: ball, ring: ring,
    corners: corners, faceL: faceL, faceR: faceR
  };

})(window.SN = window.SN || {});
