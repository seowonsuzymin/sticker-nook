/* ============================================================
   Wallpapers and floors
   ------------------------------------------------------------
   Buy once, apply to any room, as many rooms as you like.

   To add one, append an entry below. Nothing else needs changing —
   the tray, the shop and the save file pick it up automatically.

     WALLPAPERS  id, name, price, wall, wallInk, wallPattern,
                 skirting, accent, mood
                 wallPattern: 'stripes'|'dots'|'stars'|'grid'|'plain'
                 mood: 'day' | 'night' (night dims the room's light)

     FLOORS      id, name, price, floor, floorInk, floorPattern
                 floorPattern: 'plank'|'checker'|'tile'|'plain'

   A price of 0 means every profile starts with it.
   ============================================================ */
(function (SN) {
  'use strict';

  SN.WALLPAPERS = [
    {
      id: 'wall-plain', name: 'Plain Cream', price: 0,
      wall: '#f7f2ea', wallInk: '#f7f2ea', wallPattern: 'plain',
      skirting: '#fffaf3', accent: '#c9b8a0', mood: 'day'
    },
    {
      id: 'wall-blossom', name: 'Blossom Stripes', price: 120,
      wall: '#ffe6ee', wallInk: '#ffd2e0', wallPattern: 'stripes',
      skirting: '#fff7f0', accent: '#ff9db4', mood: 'day'
    },
    {
      id: 'wall-mint', name: 'Mint Dots', price: 150,
      wall: '#dcf6ec', wallInk: '#bfe9da', wallPattern: 'dots',
      skirting: '#ffffff', accent: '#6fd6b4', mood: 'day'
    },
    {
      id: 'wall-sunny', name: 'Sunny Grid', price: 180,
      wall: '#fff2cc', wallInk: '#ffe3a1', wallPattern: 'grid',
      skirting: '#fffaf0', accent: '#ffc93c', mood: 'day'
    },
    {
      id: 'wall-lilac', name: 'Lilac Stars', price: 220,
      wall: '#eae2fb', wallInk: '#d6c8f4', wallPattern: 'stars',
      skirting: '#fdfbff', accent: '#a98fe0', mood: 'day'
    },
    {
      id: 'wall-peach', name: 'Peach Dots', price: 200,
      wall: '#ffe8dc', wallInk: '#ffd2bd', wallPattern: 'dots',
      skirting: '#fffaf6', accent: '#ff9f7a', mood: 'day'
    },
    {
      id: 'wall-sky', name: 'Sky Stripes', price: 240,
      wall: '#e2f0fd', wallInk: '#c6e2f8', wallPattern: 'stripes',
      skirting: '#fbfdff', accent: '#7bb6e8', mood: 'day'
    },
    {
      id: 'wall-midnight', name: 'Midnight Stars', price: 320,
      wall: '#3f4478', wallInk: '#6f79c9', wallPattern: 'stars',
      skirting: '#8f87c4', accent: '#7d86e0', mood: 'night'
    }
  ];

  SN.FLOORS = [
    { id: 'floor-plain',   name: 'Plain Boards',  price: 0,   floor: '#e3d5c0', floorInk: '#e3d5c0', floorPattern: 'plain' },
    { id: 'floor-warm',    name: 'Warm Planks',   price: 100, floor: '#f5d7b6', floorInk: '#e6bd92', floorPattern: 'plank' },
    { id: 'floor-honey',   name: 'Honey Planks',  price: 160, floor: '#e9d3b3', floorInk: '#d3b78e', floorPattern: 'plank' },
    { id: 'floor-cream',   name: 'Cream Checker', price: 140, floor: '#f2ece1', floorInk: '#ddd3c3', floorPattern: 'checker' },
    { id: 'floor-lilac',   name: 'Lilac Checker', price: 200, floor: '#f3e9f5', floorInk: '#dfcfe6', floorPattern: 'checker' },
    { id: 'floor-sage',    name: 'Sage Checker',  price: 210, floor: '#e8f1e6', floorInk: '#cfe0cb', floorPattern: 'checker' },
    { id: 'floor-rose',    name: 'Rose Tiles',    price: 230, floor: '#f8e6ea', floorInk: '#e7c8d0', floorPattern: 'tile' },
    { id: 'floor-deep',    name: 'Deep Tiles',    price: 280, floor: '#5a5382', floorInk: '#867dbe', floorPattern: 'tile' }
  ];

  SN.WALLPAPER_BY_ID = SN.WALLPAPERS.reduce(function (m, w) { m[w.id] = w; return m; }, {});
  SN.FLOOR_BY_ID = SN.FLOORS.reduce(function (m, f) { m[f.id] = f; return m; }, {});

  /* What each room used to look like back when rooms were themed. A save
     from before this change gets these granted and applied, so nothing a
     player already unlocked suddenly turns plain on them. */
  SN.LEGACY_ROOM_LOOKS = {
    'cozy-pink':      { wall: 'wall-blossom',  floor: 'floor-warm' },
    'minty-fresh':    { wall: 'wall-mint',     floor: 'floor-cream' },
    'sunny-yellow':   { wall: 'wall-sunny',    floor: 'floor-honey' },
    'lavender-dream': { wall: 'wall-lilac',    floor: 'floor-lilac' },
    'midnight-blue':  { wall: 'wall-midnight', floor: 'floor-deep' }
  };

})(window.SN = window.SN || {});
