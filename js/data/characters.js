/* ============================================================
   Playable characters
   ------------------------------------------------------------
   Every character shares the same sitting body (drawn in art.js) and
   supplies its own head. That keeps them consistent as a set and means
   a new character is just one entry here.

     id     unique string (stored on the profile — never rename)
     name   label under the tile in the new-nook dialog
     limb   colour of the arms and legs
     paw    colour of the socks / paws
     head   function(colors) -> SVG markup for the head

   `head` draws into the character's local 100x140 box: the head sits at
   roughly (50, 42) with a radius of ~27, and ears go above that. The
   `colors` argument is the profile's outfit palette (see PROFILE_COLORS),
   so each character can wear a bow in the player's chosen colour.

   Outline stroke and width are inherited, so shapes only need a `fill`;
   use stroke="none" on details that shouldn't be outlined.
   ============================================================ */
(function (SN) {
  'use strict';

  var INK = '#4a3b52';
  var BLUSH = '#ffa8bf';

  /* ── little shared face parts ──────────────────────────── */

  function eye(cx, cy, rx, ry) {
    return '<g class="sn-eye">' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="' + (cx + 1.6) + '" cy="' + (cy - 2) + '" r="' + (rx * 0.4).toFixed(1) + '" fill="#fff" stroke="none"/>' +
      '</g>';
  }

  function eyes(cy, rx, ry, spread) {
    var s = spread || 11;
    return eye(50 - s, cy, rx, ry) + eye(50 + s, cy, rx, ry);
  }

  function blush(cy, spread, rx) {
    var s = spread || 23, w = rx || 6.5;
    return '<ellipse cx="' + (50 - s) + '" cy="' + cy + '" rx="' + w + '" ry="4" fill="' + BLUSH + '" stroke="none" opacity=".75"/>' +
      '<ellipse cx="' + (50 + s) + '" cy="' + cy + '" rx="' + w + '" ry="4" fill="' + BLUSH + '" stroke="none" opacity=".75"/>';
  }

  function smile(y, w) {
    var h = (w || 10) / 2;
    return '<path d="M' + (50 - h) + ' ' + y + ' q' + h + ' 5.5 ' + (h * 2) + ' 0" ' +
      'fill="none" stroke-width="2.4" stroke-linecap="round"/>';
  }

  /** Bow in the profile's colour — every character wears one somewhere. */
  function bow(x, y, s, c) {
    return '<path d="M' + x + ' ' + y + ' l' + (-4 * s) + ' ' + (-3 * s) + ' v' + (6 * s) + ' z"  fill="' + c.bow + '"/>' +
      '<path d="M' + x + ' ' + y + ' l' + (4 * s) + ' ' + (-3 * s) + ' v' + (6 * s) + ' z" fill="' + c.bow + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (1.9 * s) + '" fill="' + c.hi + '"/>';
  }

  /* ── the cast ──────────────────────────────────────────── */

  var HAIR = '#8a5c46', HAIR_HI = '#a97158', SKIN = '#ffe2ce', SKIN_SH = '#f3c4a8';

  SN.CHARACTERS = [
    {
      id: 'girl', name: 'Girl', limb: SKIN, paw: '#fffdf8',
      head: function (c) {
        return '' +
          '<path d="M50 6 c-25 0 -32 18 -32 36 c0 15 1 25 -2 32 q34 10 68 0 c-3 -7 -2 -17 -2 -32 c0 -18 -7 -36 -32 -36 z" fill="' + HAIR + '"/>' +
          '<circle cx="50" cy="40" r="26" fill="' + SKIN + '"/>' +
          '<path d="M24 38 c-1 -19 11 -32 26 -32 c15 0 27 13 26 32 c-4 -9 -8 -15 -12 -18 c-6 9 -20 15 -40 18 z" fill="' + HAIR + '"/>' +
          '<circle cx="16" cy="29" r="12" fill="' + HAIR + '"/>' +
          '<circle cx="84" cy="29" r="12" fill="' + HAIR + '"/>' +
          '<path d="M10 24 a9 9 0 0 1 9 -3" fill="none" stroke="' + HAIR_HI + '" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M81 21 a9 9 0 0 1 9 3" fill="none" stroke="' + HAIR_HI + '" stroke-width="4" stroke-linecap="round"/>' +
          bow(84, 40, 1.5, c) +
          eyes(44, 4.4, 5.8) + blush(51, 22) + smile(53) +
          '<path d="M32 36 q6 -4 11 -1 M57 35 q5 -3 11 1" fill="none" stroke-width="2" stroke="' + SKIN_SH + '"/>';
      }
    },

    {
      id: 'bear', name: 'Bear', limb: '#c99368', paw: '#ffeedd',
      head: function (c) {
        var fur = '#c99368';
        return '' +
          '<circle cx="24" cy="19" r="13" fill="' + fur + '"/>' +
          '<circle cx="76" cy="19" r="13" fill="' + fur + '"/>' +
          '<circle cx="24" cy="19" r="6.5" fill="#f2bda2" stroke="none"/>' +
          '<circle cx="76" cy="19" r="6.5" fill="#f2bda2" stroke="none"/>' +
          '<circle cx="50" cy="42" r="27" fill="' + fur + '"/>' +
          '<ellipse cx="50" cy="53" rx="16" ry="12" fill="#ffeedd"/>' +
          '<ellipse cx="50" cy="47" rx="5.2" ry="4" fill="' + INK + '" stroke="none"/>' +
          '<path d="M50 51 v3" fill="none" stroke-width="2.2"/>' +
          bow(76, 33, 1.4, c) +
          eyes(39, 4, 5.2, 12) + blush(50, 26) + smile(56, 11);
      }
    },

    {
      id: 'cat', name: 'Cat', limb: '#ded7e6', paw: '#fffdf8',
      head: function (c) {
        var fur = '#ded7e6';
        return '' +
          '<path d="M31 25 L24 1 L47 13 Z" fill="' + fur + '"/>' +
          '<path d="M69 25 L76 1 L53 13 Z" fill="' + fur + '"/>' +
          '<path d="M32 21 L28 9 L40 15 Z" fill="#ffc9d8" stroke="none"/>' +
          '<path d="M68 21 L72 9 L60 15 Z" fill="#ffc9d8" stroke="none"/>' +
          '<circle cx="50" cy="42" r="27" fill="' + fur + '"/>' +
          '<path d="M19 44 l-14 -4 M19 50 l-14 3 M81 44 l14 -4 M81 50 l14 3" fill="none" stroke-width="2.2" opacity=".65"/>' +
          '<path d="M46 49 h8 l-4 4 z" fill="#ff9ab6"/>' +
          '<path d="M50 53 v2 M43 57 a7 5 0 0 0 14 0" fill="none" stroke-width="2.4" stroke-linecap="round"/>' +
          bow(74, 28, 1.4, c) +
          eyes(41, 4.2, 5.6, 12) + blush(52, 26);
      }
    },

    {
      id: 'puppy', name: 'Puppy', limb: '#f0c48a', paw: '#fff3e2',
      head: function (c) {
        var fur = '#f0c48a';
        return '' +
          '<ellipse cx="19" cy="46" rx="11" ry="22" transform="rotate(-13 19 46)" fill="#d69f5c"/>' +
          '<ellipse cx="81" cy="46" rx="11" ry="22" transform="rotate(13 81 46)" fill="#d69f5c"/>' +
          '<circle cx="50" cy="42" r="27" fill="' + fur + '"/>' +
          '<ellipse cx="38" cy="34" rx="12" ry="10" fill="#d69f5c" stroke="none" opacity=".6"/>' +
          '<ellipse cx="50" cy="54" rx="15" ry="11" fill="#fff3e2"/>' +
          '<ellipse cx="50" cy="47" rx="5.5" ry="4.2" fill="' + INK + '" stroke="none"/>' +
          '<path d="M50 51 v3" fill="none" stroke-width="2.2"/>' +
          '<path d="M43 55 a7 5 0 0 0 14 0" fill="none" stroke-width="2.4" stroke-linecap="round"/>' +
          '<path d="M46 60 a4 5 0 0 0 8 0 z" fill="#ff9ab6"/>' +
          bow(50, 15, 1.4, c) +
          eyes(39, 4.2, 5.4, 12) + blush(50, 27);
      }
    },

    {
      id: 'bunny', name: 'Bunny', limb: '#fffdf8', paw: '#ffeef4',
      head: function (c) {
        var fur = '#fffdf8';
        return '' +
          '<ellipse cx="37" cy="11" rx="9" ry="23" transform="rotate(-10 37 11)" fill="' + fur + '"/>' +
          '<ellipse cx="63" cy="11" rx="9" ry="23" transform="rotate(10 63 11)" fill="' + fur + '"/>' +
          '<ellipse cx="37" cy="12" rx="4" ry="15" transform="rotate(-10 37 12)" fill="#ffd0de" stroke="none"/>' +
          '<ellipse cx="63" cy="12" rx="4" ry="15" transform="rotate(10 63 12)" fill="#ffd0de" stroke="none"/>' +
          '<circle cx="50" cy="44" r="26" fill="' + fur + '"/>' +
          '<path d="M47 50 h6 l-3 3 z" fill="#ff9ab6"/>' +
          '<path d="M50 53 v2 M44 57 a6 5 0 0 0 12 0" fill="none" stroke-width="2.4" stroke-linecap="round"/>' +
          '<path d="M22 48 l-12 -3 M78 48 l12 -3" fill="none" stroke-width="2" opacity=".5"/>' +
          bow(70, 26, 1.4, c) +
          eyes(43, 4.2, 5.6, 12) + blush(53, 25, 7);
      }
    },

    {
      id: 'panda', name: 'Panda', limb: '#fffdf8', paw: '#4a4550',
      head: function (c) {
        var coal = '#4a4550';
        return '' +
          '<circle cx="24" cy="19" r="12" fill="' + coal + '"/>' +
          '<circle cx="76" cy="19" r="12" fill="' + coal + '"/>' +
          '<circle cx="50" cy="42" r="27" fill="#fffdf8"/>' +
          '<ellipse cx="37" cy="40" rx="9.5" ry="12" transform="rotate(-16 37 40)" fill="' + coal + '" stroke="none"/>' +
          '<ellipse cx="63" cy="40" rx="9.5" ry="12" transform="rotate(16 63 40)" fill="' + coal + '" stroke="none"/>' +
          '<g class="sn-eye">' +
          '<circle cx="38" cy="41" r="4.6" fill="#fffdf8" stroke="none"/>' +
          '<circle cx="38.6" cy="41.4" r="2.6" fill="' + INK + '" stroke="none"/>' +
          '<circle cx="62" cy="41" r="4.6" fill="#fffdf8" stroke="none"/>' +
          '<circle cx="61.4" cy="41.4" r="2.6" fill="' + INK + '" stroke="none"/>' +
          '</g>' +
          '<ellipse cx="50" cy="52" rx="5.4" ry="4.2" fill="' + coal + '" stroke="none"/>' +
          '<path d="M50 56 v2" fill="none" stroke-width="2.2"/>' +
          bow(76, 32, 1.4, c) +
          blush(55, 27) + smile(59, 11);
      }
    }
  ];

  SN.CHARACTER_BY_ID = SN.CHARACTERS.reduce(function (m, ch) { m[ch.id] = ch; return m; }, {});

  /** Always returns a character — falls back to the girl for unknown ids. */
  SN.characterFor = function (id) {
    return SN.CHARACTER_BY_ID[id] || SN.CHARACTERS[0];
  };

})(window.SN = window.SN || {});
