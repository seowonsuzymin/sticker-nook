/* ============================================================
   Sticker catalog
   ------------------------------------------------------------
   To add a sticker: append one entry to STICKERS below.

     id     unique string (used as the localStorage key — never rename
            an existing one or players lose that sticker)
     name   display name in the tray
     price  cost in coins (0 = owned from the start)
     cat    category chip: furniture | plush | plant | food | decor | tech
     size   default width as a fraction of the room's width (0.02–0.6)
     art    SVG markup drawn inside a `viewBox="0 0 100 100"`.
            Stroke colour / width are inherited from the wrapper, so shapes
            only need a `fill`. Use fill="none" for open paths and
            stroke="none" on details that shouldn't be outlined.
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
    dark: '#6b5a78'
  };
  SN.PALETTE = C;

  var STICKERS = [

    /* ── Starter set (free) ────────────────────────────────── */
    {
      id: 'bed-cozy', name: 'Cozy Bed', price: 0, cat: 'furniture', size: 0.30,
      art:
        '<rect x="3" y="26" width="15" height="52" rx="7" fill="' + C.brown + '"/>' +
        '<rect x="82" y="42" width="15" height="36" rx="7" fill="' + C.brown + '"/>' +
        '<rect x="8" y="44" width="84" height="34" rx="11" fill="' + C.cream + '"/>' +
        '<path d="M36 50 h50 a10 10 0 0 1 10 10 v10 a8 8 0 0 1 -8 8 h-52 z" fill="' + C.pink + '"/>' +
        '<rect x="14" y="40" width="26" height="17" rx="8" fill="' + C.white + '"/>' +
        '<path d="M40 60 h54" fill="none" stroke-width="2" opacity=".45"/>'
    },
    {
      id: 'rug-round', name: 'Round Rug', price: 0, cat: 'decor', size: 0.28,
      art:
        '<ellipse cx="50" cy="52" rx="45" ry="27" fill="' + C.pinkL + '"/>' +
        '<ellipse cx="50" cy="52" rx="30" ry="17.5" fill="' + C.cream + '"/>' +
        '<ellipse cx="50" cy="52" rx="14" ry="8" fill="' + C.pink + '"/>'
    },
    {
      id: 'plant-small', name: 'Little Plant', price: 0, cat: 'plant', size: 0.11,
      art:
        '<path d="M50 66 V34" fill="none"/>' +
        '<ellipse cx="36" cy="42" rx="13" ry="8" transform="rotate(-24 36 42)" fill="' + C.green + '"/>' +
        '<ellipse cx="64" cy="38" rx="13" ry="8" transform="rotate(24 64 38)" fill="' + C.green + '"/>' +
        '<ellipse cx="50" cy="27" rx="11" ry="8" fill="' + C.greenD + '"/>' +
        '<path d="M32 64 h36 l-5 22 a5 5 0 0 1 -5 4 h-16 a5 5 0 0 1 -5 -4 z" fill="' + C.peach + '"/>' +
        '<rect x="30" y="60" width="40" height="9" rx="4" fill="' + C.peachD + '"/>'
    },
    {
      id: 'pillow-heart', name: 'Heart Pillow', price: 0, cat: 'decor', size: 0.12,
      art:
        '<path d="M50 84 C18 62 12 42 25 32 C36 24 46 30 50 39 C54 30 64 24 75 32 C88 42 82 62 50 84 Z" fill="' + C.pink + '"/>' +
        '<path d="M34 44 c2 -6 6 -8 10 -7" fill="none" stroke="' + C.white + '" stroke-width="4" opacity=".8"/>'
    },
    {
      id: 'clock-wall', name: 'Wall Clock', price: 0, cat: 'decor', size: 0.10,
      art:
        '<circle cx="50" cy="52" r="34" fill="' + C.cream + '"/>' +
        '<circle cx="50" cy="52" r="26" fill="' + C.white + '"/>' +
        '<path d="M50 52 V34 M50 52 L64 60" fill="none" stroke-width="4"/>' +
        '<circle cx="50" cy="52" r="3.5" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M43 18 a8 8 0 0 1 14 0" fill="' + C.pink + '"/>'
    },

    /* ── Plushies ──────────────────────────────────────────── */
    {
      id: 'plush-bear', name: 'Bear Plushie', price: 40, cat: 'plush', size: 0.11,
      art:
        '<circle cx="27" cy="26" r="12" fill="' + C.brown + '"/>' +
        '<circle cx="73" cy="26" r="12" fill="' + C.brown + '"/>' +
        '<path d="M22 88 a30 26 0 0 1 56 0 z" fill="' + C.brown + '"/>' +
        '<circle cx="50" cy="40" r="27" fill="' + C.brown + '"/>' +
        '<ellipse cx="50" cy="48" rx="15" ry="11" fill="' + C.cream + '"/>' +
        '<circle cx="39" cy="36" r="3.5" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="61" cy="36" r="3.5" fill="' + C.ink + '" stroke="none"/>' +
        '<ellipse cx="50" cy="44" rx="4" ry="3" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M50 47 v3 M44 54 a6 5 0 0 0 12 0" fill="none" stroke-width="2.5"/>'
    },
    {
      id: 'plush-bunny', name: 'Bunny Plushie', price: 60, cat: 'plush', size: 0.11,
      art:
        '<ellipse cx="35" cy="22" rx="9" ry="20" transform="rotate(-9 35 22)" fill="' + C.white + '"/>' +
        '<ellipse cx="65" cy="22" rx="9" ry="20" transform="rotate(9 65 22)" fill="' + C.white + '"/>' +
        '<ellipse cx="35" cy="23" rx="4" ry="13" transform="rotate(-9 35 23)" fill="' + C.pinkL + '" stroke="none"/>' +
        '<ellipse cx="65" cy="23" rx="4" ry="13" transform="rotate(9 65 23)" fill="' + C.pinkL + '" stroke="none"/>' +
        '<path d="M24 90 a28 24 0 0 1 52 0 z" fill="' + C.white + '"/>' +
        '<circle cx="50" cy="52" r="25" fill="' + C.white + '"/>' +
        '<circle cx="40" cy="49" r="3.4" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="60" cy="49" r="3.4" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="31" cy="58" r="5" fill="' + C.pinkL + '" stroke="none"/>' +
        '<circle cx="69" cy="58" r="5" fill="' + C.pinkL + '" stroke="none"/>' +
        '<path d="M46 58 h8 M50 58 v3 M45 63 a6 5 0 0 0 10 0" fill="none" stroke-width="2.5"/>'
    },
    {
      id: 'cat-loaf', name: 'Cat Loaf', price: 80, cat: 'plush', size: 0.12,
      art:
        '<path d="M18 78 c0 -24 14 -36 32 -36 s32 12 32 36 z" fill="' + C.cream + '"/>' +
        '<path d="M24 52 l-2 -18 16 8 z" fill="' + C.cream + '"/>' +
        '<path d="M76 52 l2 -18 -16 8 z" fill="' + C.cream + '"/>' +
        '<path d="M82 78 c12 0 14 -12 8 -18" fill="none" stroke-width="4"/>' +
        '<path d="M18 78 h64" fill="none" stroke-width="3"/>' +
        '<path d="M36 60 a4 3 0 0 0 8 0 M56 60 a4 3 0 0 0 8 0" fill="none" stroke-width="3"/>' +
        '<path d="M46 67 h8 M50 67 v2 M45 71 a6 4 0 0 0 10 0" fill="none" stroke-width="2.5"/>' +
        '<circle cx="31" cy="67" r="4.5" fill="' + C.pinkL + '" stroke="none"/>' +
        '<circle cx="69" cy="67" r="4.5" fill="' + C.pinkL + '" stroke="none"/>' +
        '<path d="M40 40 q10 -6 20 0" fill="none" stroke-width="2.5" opacity=".5"/>'
    },
    {
      id: 'duck-rubber', name: 'Rubber Duck', price: 25, cat: 'plush', size: 0.07,
      art:
        '<path d="M20 76 c0 -16 12 -26 28 -26 c18 0 30 10 30 26 z" fill="' + C.yellow + '"/>' +
        '<circle cx="62" cy="38" r="19" fill="' + C.yellow + '"/>' +
        '<path d="M80 36 l16 5 -16 6 z" fill="' + C.peachD + '"/>' +
        '<circle cx="64" cy="33" r="3.5" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M28 66 q10 -10 20 -2" fill="none" stroke-width="2.5" opacity=".5"/>'
    },

    /* ── Furniture ─────────────────────────────────────────── */
    {
      id: 'table-tea', name: 'Tea Table', price: 50, cat: 'furniture', size: 0.20,
      art:
        '<path d="M26 52 l-8 34 M74 52 l8 34" fill="none" stroke-width="6"/>' +
        '<ellipse cx="50" cy="46" rx="42" ry="17" fill="' + C.brown + '"/>' +
        '<ellipse cx="50" cy="42" rx="42" ry="17" fill="' + C.peach + '"/>' +
        '<ellipse cx="50" cy="42" rx="30" ry="11" fill="' + C.cream + '" stroke="none" opacity=".55"/>'
    },
    {
      id: 'chair-comfy', name: 'Comfy Chair', price: 70, cat: 'furniture', size: 0.19,
      art:
        '<path d="M22 88 l4 -12 M78 88 l-4 -12" fill="none" stroke-width="6"/>' +
        '<path d="M18 34 a32 30 0 0 1 64 0 v34 h-64 z" fill="' + C.lav + '"/>' +
        '<path d="M12 52 a10 10 0 0 1 10 -10 v28 h-10 z" fill="' + C.lavD + '"/>' +
        '<path d="M88 52 a10 10 0 0 0 -10 -10 v28 h10 z" fill="' + C.lavD + '"/>' +
        '<path d="M20 62 h60 a6 6 0 0 1 6 6 v10 h-72 v-10 a6 6 0 0 1 6 -6 z" fill="' + C.cream + '"/>' +
        '<path d="M50 22 v34" fill="none" stroke-width="2" opacity=".35"/>'
    },
    {
      id: 'bookshelf', name: 'Bookshelf', price: 90, cat: 'furniture', size: 0.20,
      art:
        '<rect x="14" y="10" width="72" height="80" rx="6" fill="' + C.brown + '"/>' +
        '<rect x="21" y="17" width="58" height="21" fill="' + C.cream + '"/>' +
        '<rect x="21" y="44" width="58" height="21" fill="' + C.cream + '"/>' +
        '<rect x="21" y="71" width="58" height="14" fill="' + C.cream + '"/>' +
        '<rect x="24" y="20" width="8" height="18" fill="' + C.pink + '"/>' +
        '<rect x="34" y="24" width="7" height="14" fill="' + C.mint + '"/>' +
        '<rect x="43" y="19" width="9" height="19" fill="' + C.blue + '"/>' +
        '<rect x="55" y="23" width="7" height="15" fill="' + C.yellow + '"/>' +
        '<rect x="25" y="49" width="7" height="16" fill="' + C.lav + '"/>' +
        '<rect x="34" y="46" width="9" height="19" fill="' + C.red + '"/>' +
        '<circle cx="62" cy="58" r="8" fill="' + C.green + '"/>' +
        '<rect x="26" y="75" width="20" height="10" rx="3" fill="' + C.pinkL + '"/>'
    },
    {
      id: 'beanbag', name: 'Bean Bag', price: 75, cat: 'furniture', size: 0.16,
      art:
        '<path d="M12 82 c-4 -22 10 -42 34 -46 c26 -4 44 12 44 30 c0 10 -6 16 -14 16 z" fill="' + C.mint + '"/>' +
        '<path d="M24 66 c8 -14 26 -20 42 -16" fill="none" stroke-width="2.5" opacity=".45"/>' +
        '<circle cx="80" cy="44" r="4" fill="' + C.mintD + '"/>'
    },
    {
      id: 'stool-mushroom', name: 'Mushroom Stool', price: 55, cat: 'furniture', size: 0.12,
      art:
        '<path d="M36 54 h28 l-4 34 h-20 z" fill="' + C.cream + '"/>' +
        '<path d="M8 54 a42 34 0 0 1 84 0 z" fill="' + C.red + '"/>' +
        '<circle cx="30" cy="38" r="7" fill="' + C.white + '" stroke="none"/>' +
        '<circle cx="58" cy="30" r="9" fill="' + C.white + '" stroke="none"/>' +
        '<circle cx="74" cy="45" r="6" fill="' + C.white + '" stroke="none"/>'
    },
    {
      id: 'piano-tiny', name: 'Tiny Piano', price: 130, cat: 'furniture', size: 0.22,
      art:
        '<rect x="14" y="18" width="72" height="46" rx="5" fill="' + C.pinkD + '"/>' +
        '<rect x="20" y="24" width="60" height="18" rx="3" fill="' + C.cream + '"/>' +
        '<rect x="12" y="60" width="76" height="14" rx="4" fill="' + C.white + '"/>' +
        '<path d="M22 60 v14 M31 60 v14 M40 60 v14 M49 60 v14 M58 60 v14 M67 60 v14 M76 60 v14" fill="none" stroke-width="2"/>' +
        '<rect x="26" y="60" width="5" height="8" fill="' + C.ink + '" stroke="none"/>' +
        '<rect x="44" y="60" width="5" height="8" fill="' + C.ink + '" stroke="none"/>' +
        '<rect x="62" y="60" width="5" height="8" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M20 74 v14 M80 74 v14" fill="none" stroke-width="6"/>'
    },

    /* ── Plants ────────────────────────────────────────────── */
    {
      id: 'cactus', name: 'Cactus Pal', price: 40, cat: 'plant', size: 0.10,
      art:
        '<path d="M40 70 v-32 a10 10 0 0 1 20 0 v32 z" fill="' + C.green + '"/>' +
        '<path d="M40 52 h-10 a7 7 0 0 0 -7 7 v6 a7 7 0 0 0 7 7 h10" fill="' + C.green + '"/>' +
        '<path d="M60 44 h9 a7 7 0 0 1 7 7 v10 a7 7 0 0 1 -7 7 h-9" fill="' + C.green + '"/>' +
        '<circle cx="50" cy="26" r="7" fill="' + C.pink + '"/>' +
        '<path d="M31 68 h38 l-4 20 a5 5 0 0 1 -5 4 h-20 a5 5 0 0 1 -5 -4 z" fill="' + C.blue + '"/>' +
        '<rect x="29" y="64" width="42" height="9" rx="4" fill="' + C.blueD + '"/>'
    },
    {
      id: 'plant-tall', name: 'Tall Plant', price: 70, cat: 'plant', size: 0.16,
      art:
        '<path d="M50 72 V30 M50 46 L30 32 M50 40 L70 26 M50 58 L28 52" fill="none" stroke-width="3"/>' +
        '<path d="M28 30 c-10 -6 -6 -18 6 -16 c10 2 12 12 6 18 z" fill="' + C.greenD + '"/>' +
        '<path d="M72 24 c10 -6 16 4 10 12 c-5 7 -14 5 -17 -2 z" fill="' + C.green + '"/>' +
        '<path d="M26 50 c-12 -2 -12 -14 0 -16 c9 -2 14 6 11 13 z" fill="' + C.green + '"/>' +
        '<path d="M50 20 c-8 -8 0 -18 8 -14 c8 4 6 14 -2 16 z" fill="' + C.greenD + '"/>' +
        '<path d="M30 70 h40 l-5 20 a5 5 0 0 1 -5 4 h-20 a5 5 0 0 1 -5 -4 z" fill="' + C.cream + '"/>' +
        '<rect x="28" y="66" width="44" height="9" rx="4" fill="' + C.peach + '"/>'
    },
    {
      id: 'vase-flowers', name: 'Flower Vase', price: 50, cat: 'plant', size: 0.11,
      art:
        '<path d="M50 62 V38 M50 50 L34 36 M50 48 L66 34" fill="none" stroke-width="3"/>' +
        '<circle cx="50" cy="30" r="9" fill="' + C.pink + '"/>' +
        '<circle cx="32" cy="30" r="8" fill="' + C.yellow + '"/>' +
        '<circle cx="68" cy="28" r="8" fill="' + C.lav + '"/>' +
        '<circle cx="50" cy="30" r="3" fill="' + C.white + '" stroke="none"/>' +
        '<circle cx="32" cy="30" r="2.6" fill="' + C.white + '" stroke="none"/>' +
        '<circle cx="68" cy="28" r="2.6" fill="' + C.white + '" stroke="none"/>' +
        '<path d="M38 60 h24 c4 12 6 20 2 26 a16 16 0 0 1 -28 0 c-4 -6 -2 -14 2 -26 z" fill="' + C.mint + '"/>'
    },

    /* ── Lighting ──────────────────────────────────────────── */
    {
      id: 'lamp-floor', name: 'Floor Lamp', price: 65, cat: 'decor', size: 0.13,
      art:
        '<path d="M50 34 V84" fill="none" stroke-width="5"/>' +
        '<ellipse cx="50" cy="88" rx="20" ry="7" fill="' + C.brownD + '"/>' +
        '<path d="M28 34 l8 -22 h28 l8 22 z" fill="' + C.cream + '"/>' +
        '<path d="M28 34 h44" fill="none" stroke-width="3"/>' +
        '<path d="M34 42 l-6 8 M50 44 v10 M66 42 l6 8" fill="none" stroke-width="3" stroke="' + C.yellowD + '" opacity=".9"/>'
    },
    {
      id: 'lamp-table', name: 'Table Lamp', price: 45, cat: 'decor', size: 0.09,
      art:
        '<path d="M50 46 V72" fill="none" stroke-width="6"/>' +
        '<path d="M32 78 h36 a5 5 0 0 0 -5 -8 h-26 a5 5 0 0 0 -5 8 z" fill="' + C.peachD + '"/>' +
        '<path d="M24 46 l9 -26 h34 l9 26 z" fill="' + C.pink + '"/>' +
        '<path d="M24 46 h52" fill="none" stroke-width="3"/>' +
        '<circle cx="50" cy="14" r="4" fill="' + C.pinkD + '"/>'
    },
    {
      id: 'moon-lamp', name: 'Moon Lamp', price: 85, cat: 'decor', size: 0.11,
      art:
        '<path d="M64 16 a36 36 0 1 0 14 56 a30 30 0 0 1 -14 -56 z" fill="' + C.yellow + '"/>' +
        '<circle cx="46" cy="42" r="3.2" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="62" cy="46" r="3.2" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M48 54 a7 6 0 0 0 12 2" fill="none" stroke-width="2.5"/>' +
        '<circle cx="37" cy="50" r="4" fill="' + C.pinkL + '" stroke="none"/>' +
        '<circle cx="70" cy="55" r="4" fill="' + C.pinkL + '" stroke="none"/>'
    },
    {
      id: 'fairy-lights', name: 'Fairy Lights', price: 50, cat: 'decor', size: 0.28,
      art:
        '<path d="M2 18 q24 26 48 8 q24 -18 48 8" fill="none" stroke-width="3"/>' +
        '<circle cx="14" cy="32" r="7" fill="' + C.yellow + '"/>' +
        '<circle cx="32" cy="35" r="7" fill="' + C.pink + '"/>' +
        '<circle cx="50" cy="26" r="7" fill="' + C.mint + '"/>' +
        '<circle cx="68" cy="21" r="7" fill="' + C.blue + '"/>' +
        '<circle cx="86" cy="30" r="7" fill="' + C.lav + '"/>'
    },

    /* ── Wall decor ────────────────────────────────────────── */
    {
      id: 'window-round', name: 'Round Window', price: 75, cat: 'decor', size: 0.17,
      art:
        '<circle cx="50" cy="50" r="42" fill="' + C.white + '"/>' +
        '<circle cx="50" cy="50" r="34" fill="' + C.blue + '"/>' +
        '<path d="M50 16 v68 M16 50 h68" fill="none" stroke-width="4"/>' +
        '<circle cx="34" cy="34" r="6" fill="' + C.white + '" stroke="none" opacity=".8"/>' +
        '<path d="M26 70 a10 6 0 0 1 20 0 a12 7 0 0 1 22 0 z" fill="' + C.white + '" stroke="none" opacity=".65"/>'
    },
    {
      id: 'curtain', name: 'Frilly Curtain', price: 55, cat: 'decor', size: 0.24,
      art:
        '<path d="M4 12 h92" fill="none" stroke-width="5"/>' +
        '<path d="M8 14 c14 10 12 40 4 72 c10 6 20 4 26 -4 c-6 -30 -4 -56 -6 -68 z" fill="' + C.pinkL + '"/>' +
        '<path d="M92 14 c-14 10 -12 40 -4 72 c-10 6 -20 4 -26 -4 c6 -30 4 -56 6 -68 z" fill="' + C.pinkL + '"/>' +
        '<path d="M18 20 q4 30 0 58 M82 20 q-4 30 0 58" fill="none" stroke-width="2" opacity=".4"/>' +
        '<circle cx="50" cy="12" r="6" fill="' + C.pink + '"/>'
    },
    {
      id: 'frame-photo', name: 'Photo Frame', price: 35, cat: 'decor', size: 0.10,
      art:
        '<rect x="14" y="18" width="72" height="64" rx="6" fill="' + C.brown + '"/>' +
        '<rect x="22" y="26" width="56" height="48" rx="3" fill="' + C.blue + '"/>' +
        '<path d="M22 62 l16 -16 12 12 10 -8 18 16 z" fill="' + C.green + '"/>' +
        '<circle cx="64" cy="38" r="6" fill="' + C.yellow + '"/>'
    },
    {
      id: 'poster-cat', name: 'Cat Poster', price: 55, cat: 'decor', size: 0.13,
      art:
        '<rect x="16" y="8" width="68" height="84" rx="4" fill="' + C.cream + '"/>' +
        '<path d="M32 44 l-2 -16 14 7 z" fill="' + C.gray + '"/>' +
        '<path d="M68 44 l2 -16 -14 7 z" fill="' + C.gray + '"/>' +
        '<circle cx="50" cy="50" r="19" fill="' + C.gray + '"/>' +
        '<circle cx="43" cy="47" r="2.8" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="57" cy="47" r="2.8" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M47 55 h6 M50 55 v2 M45 58 a6 4 0 0 0 10 0" fill="none" stroke-width="2"/>' +
        '<path d="M30 78 h40" fill="none" stroke-width="3" opacity=".4"/>'
    },
    {
      id: 'mirror-oval', name: 'Oval Mirror', price: 60, cat: 'decor', size: 0.13,
      art:
        '<ellipse cx="50" cy="50" rx="32" ry="43" fill="' + C.yellowD + '"/>' +
        '<ellipse cx="50" cy="50" rx="25" ry="36" fill="' + C.blue + '"/>' +
        '<path d="M36 68 l22 -38 M46 72 l12 -20" fill="none" stroke="' + C.white + '" stroke-width="5" opacity=".7"/>' +
        '<circle cx="50" cy="7" r="6" fill="' + C.pink + '"/>'
    },
    {
      id: 'garland-star', name: 'Star Garland', price: 45, cat: 'decor', size: 0.30,
      art: (function () {
        var star = function (x, y, r, fill) {
          var p = '', i, a, rr;
          for (i = 0; i < 10; i++) {
            a = -Math.PI / 2 + i * Math.PI / 5;
            rr = i % 2 ? r * 0.45 : r;
            p += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1);
          }
          return '<path d="' + p + 'Z" fill="' + fill + '"/>';
        };
        return '<path d="M2 14 q25 24 48 10 q23 -14 48 8" fill="none" stroke-width="3"/>' +
          star(15, 34, 11, C.yellow) + star(35, 36, 11, C.pink) +
          star(55, 28, 11, C.mint) + star(78, 26, 11, C.lav);
      })()
    },
    {
      id: 'bunting', name: 'Bunting Flags', price: 40, cat: 'decor', size: 0.30,
      art:
        '<path d="M2 12 q25 22 48 10 q23 -12 48 6" fill="none" stroke-width="3"/>' +
        '<path d="M8 19 h18 l-9 22 z" fill="' + C.pink + '"/>' +
        '<path d="M28 25 h18 l-9 22 z" fill="' + C.yellow + '"/>' +
        '<path d="M48 24 h18 l-9 22 z" fill="' + C.mint + '"/>' +
        '<path d="M68 18 h18 l-9 22 z" fill="' + C.blue + '"/>'
    },
    {
      id: 'rainbow', name: 'Rainbow', price: 65, cat: 'decor', size: 0.18,
      art:
        '<path d="M6 78 a44 44 0 0 1 88 0" fill="none" stroke="' + C.pink + '" stroke-width="12"/>' +
        '<path d="M18 78 a32 32 0 0 1 64 0" fill="none" stroke="' + C.yellow + '" stroke-width="12"/>' +
        '<path d="M30 78 a20 20 0 0 1 40 0" fill="none" stroke="' + C.mint + '" stroke-width="12"/>' +
        '<path d="M6 78 a44 44 0 0 1 88 0 M18 78 a32 32 0 0 1 64 0 M30 78 a20 20 0 0 1 40 0 M6 78 h12 M30 78 h12 M58 78 h12 M82 78 h12" fill="none" stroke-width="3"/>'
    },
    {
      id: 'cloud', name: 'Fluffy Cloud', price: 30, cat: 'decor', size: 0.15,
      art:
        '<path d="M22 72 a18 18 0 0 1 2 -35 a22 22 0 0 1 42 -6 a17 17 0 0 1 14 41 z" fill="' + C.white + '"/>' +
        '<circle cx="36" cy="52" r="3" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="58" cy="52" r="3" fill="' + C.ink + '" stroke="none"/>' +
        '<path d="M42 59 a6 5 0 0 0 10 0" fill="none" stroke-width="2.5"/>' +
        '<circle cx="28" cy="59" r="4" fill="' + C.pinkL + '" stroke="none"/>' +
        '<circle cx="66" cy="59" r="4" fill="' + C.pinkL + '" stroke="none"/>'
    },

    /* ── Food & drink ──────────────────────────────────────── */
    {
      id: 'cake-strawberry', name: 'Berry Cake', price: 35, cat: 'food', size: 0.09,
      art:
        '<path d="M20 82 V52 h60 v30 a4 4 0 0 1 -4 4 h-52 a4 4 0 0 1 -4 -4 z" fill="' + C.cream + '"/>' +
        '<path d="M20 52 h60 v-8 a30 8 0 0 0 -60 0 z" fill="' + C.pink + '"/>' +
        '<path d="M20 62 q10 8 20 0 q10 -8 20 0 q10 8 20 0" fill="none" stroke-width="3" stroke="' + C.pinkD + '"/>' +
        '<path d="M50 40 l-7 -8 h14 z" fill="' + C.red + '"/>' +
        '<path d="M43 32 q7 -6 14 0" fill="none" stroke-width="2.5" stroke="' + C.greenD + '"/>'
    },
    {
      id: 'boba', name: 'Boba Tea', price: 30, cat: 'food', size: 0.07,
      art:
        '<path d="M56 6 L44 62" fill="none" stroke-width="7" stroke="' + C.pinkD + '"/>' +
        '<path d="M28 32 h44 l-5 52 a5 5 0 0 1 -5 4 h-24 a5 5 0 0 1 -5 -4 z" fill="' + C.peach + '"/>' +
        '<path d="M26 28 h48 v8 h-48 z" fill="' + C.white + '"/>' +
        '<circle cx="40" cy="76" r="5" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="54" cy="78" r="5" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="60" cy="66" r="5" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="44" cy="64" r="5" fill="' + C.ink + '" stroke="none"/>'
    },
    {
      id: 'donut', name: 'Donut', price: 25, cat: 'food', size: 0.08,
      art:
        '<circle cx="50" cy="52" r="36" fill="' + C.peach + '"/>' +
        '<path d="M14 50 a36 36 0 0 1 72 0 c0 14 -12 12 -18 20 c-8 10 -20 4 -30 6 c-14 3 -24 -12 -24 -26 z" fill="' + C.pink + '"/>' +
        '<circle cx="50" cy="52" r="11" fill="' + C.cream + '"/>' +
        '<path d="M32 34 l6 -5 M56 28 l5 5 M70 46 l6 -3 M40 58 l5 4 M64 60 l-4 5" fill="none" stroke-width="4" stroke="' + C.white + '" stroke-linecap="round"/>'
    },
    {
      id: 'cupcake', name: 'Cupcake', price: 30, cat: 'food', size: 0.08,
      art:
        '<path d="M26 54 h48 l-6 32 a4 4 0 0 1 -4 3 h-28 a4 4 0 0 1 -4 -3 z" fill="' + C.peach + '"/>' +
        '<path d="M36 54 l-3 35 M50 54 v35 M64 54 l3 35" fill="none" stroke-width="2" opacity=".4"/>' +
        '<path d="M24 54 a26 20 0 0 1 24 -20 a20 16 0 0 1 28 20 z" fill="' + C.mint + '"/>' +
        '<circle cx="50" cy="24" r="7" fill="' + C.red + '"/>'
    },
    {
      id: 'mug-cocoa', name: 'Cocoa Mug', price: 20, cat: 'food', size: 0.07,
      art:
        '<path d="M74 46 a14 14 0 0 1 0 22" fill="none" stroke-width="6"/>' +
        '<path d="M24 40 h50 v34 a8 8 0 0 1 -8 8 h-34 a8 8 0 0 1 -8 -8 z" fill="' + C.white + '"/>' +
        '<ellipse cx="49" cy="40" rx="25" ry="7" fill="' + C.brown + '"/>' +
        '<path d="M40 26 q6 -6 0 -12 M56 26 q6 -6 0 -12" fill="none" stroke-width="3" opacity=".55"/>' +
        '<path d="M40 60 a6 5 0 0 0 12 0" fill="none" stroke-width="2.5"/>' +
        '<circle cx="36" cy="56" r="2.6" fill="' + C.ink + '" stroke="none"/>' +
        '<circle cx="56" cy="56" r="2.6" fill="' + C.ink + '" stroke="none"/>'
    },

    /* ── Tech / play ───────────────────────────────────────── */
    {
      id: 'tv-retro', name: 'Retro TV', price: 110, cat: 'tech', size: 0.16,
      art:
        '<path d="M38 24 L26 8 M62 24 L74 8" fill="none" stroke-width="3"/>' +
        '<circle cx="26" cy="7" r="4" fill="' + C.pink + '"/>' +
        '<circle cx="74" cy="7" r="4" fill="' + C.pink + '"/>' +
        '<rect x="10" y="24" width="80" height="56" rx="9" fill="' + C.peach + '"/>' +
        '<rect x="17" y="31" width="52" height="42" rx="6" fill="' + C.blue + '"/>' +
        '<path d="M17 62 l16 -14 10 10 9 -8 17 15 z" fill="' + C.mint + '" stroke="none"/>' +
        '<circle cx="79" cy="42" r="5" fill="' + C.cream + '"/>' +
        '<circle cx="79" cy="58" r="5" fill="' + C.cream + '"/>' +
        '<path d="M22 80 l-4 10 M78 80 l4 10" fill="none" stroke-width="5"/>'
    },
    {
      id: 'record-player', name: 'Record Player', price: 95, cat: 'tech', size: 0.14,
      art:
        '<rect x="10" y="30" width="80" height="52" rx="7" fill="' + C.cream + '"/>' +
        '<circle cx="45" cy="56" r="20" fill="' + C.ink + '"/>' +
        '<circle cx="45" cy="56" r="6" fill="' + C.pink + '"/>' +
        '<path d="M78 36 L64 62" fill="none" stroke-width="4"/>' +
        '<circle cx="78" cy="36" r="5" fill="' + C.gray + '"/>' +
        '<path d="M74 22 V8 l14 -4 v14" fill="none" stroke-width="3"/>' +
        '<ellipse cx="71" cy="22" rx="4.5" ry="3.5" fill="' + C.ink + '" stroke="none"/>' +
        '<ellipse cx="85" cy="18" rx="4.5" ry="3.5" fill="' + C.ink + '" stroke="none"/>'
    },
    {
      id: 'laptop', name: 'Laptop', price: 60, cat: 'tech', size: 0.13,
      art:
        '<path d="M22 24 h56 a4 4 0 0 1 4 4 v38 h-64 v-38 a4 4 0 0 1 4 -4 z" fill="' + C.lav + '"/>' +
        '<rect x="24" y="30" width="52" height="30" rx="3" fill="' + C.blue + '"/>' +
        '<path d="M8 66 h84 a6 6 0 0 1 -6 12 h-72 a6 6 0 0 1 -6 -12 z" fill="' + C.white + '"/>' +
        '<path d="M40 44 a4 3 0 0 0 8 0 M54 44 a4 3 0 0 0 8 0" fill="none" stroke-width="2.5"/>' +
        '<path d="M46 51 a5 4 0 0 0 9 0" fill="none" stroke-width="2.5"/>'
    },
    {
      id: 'console', name: 'Game Console', price: 100, cat: 'tech', size: 0.11,
      art:
        '<rect x="20" y="10" width="60" height="80" rx="10" fill="' + C.pink + '"/>' +
        '<rect x="28" y="20" width="44" height="34" rx="4" fill="' + C.cream + '"/>' +
        '<path d="M36 68 h16 M44 60 v16" fill="none" stroke-width="7" stroke-linecap="round"/>' +
        '<circle cx="66" cy="64" r="5" fill="' + C.yellow + '"/>' +
        '<circle cx="66" cy="78" r="5" fill="' + C.mint + '"/>' +
        '<path d="M36 32 h6 M50 32 h6" fill="none" stroke-width="3"/>' +
        '<path d="M38 42 q8 6 16 0" fill="none" stroke-width="3"/>'
    }
  ];

  SN.STICKERS = STICKERS;
  SN.STICKER_BY_ID = STICKERS.reduce(function (m, s) { m[s.id] = s; return m; }, {});

  SN.CATEGORIES = [
    { id: 'all', name: 'All' },
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
