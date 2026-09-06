/* ============================================================
   Room slots
   ------------------------------------------------------------
   Rooms no longer carry a look of their own — every room starts
   plain, and its walls and floor come from surfaces the player
   buys (see js/data/surfaces.js). A slot here is just an id, a
   default name, what it costs to unlock, and a tile colour.

     id      unique string (localStorage key — don't rename; the
             ids below are kept from when these were themed rooms
             so existing saves keep their layouts)
     name    default name — the player can rename any room
     price   coins to unlock (0 = unlocked from the start)
     accent  colour of this room's tile on the select grid while
             it's still locked
   ============================================================ */
(function (SN) {
  'use strict';

  SN.ROOMS = [
    { id: 'cozy-pink',      name: 'Room 1', price: 0,   accent: '#ff9db4' },
    { id: 'minty-fresh',    name: 'Room 2', price: 150, accent: '#6fd6b4' },
    { id: 'sunny-yellow',   name: 'Room 3', price: 300, accent: '#ffc93c' },
    { id: 'lavender-dream', name: 'Room 4', price: 500, accent: '#a98fe0' },
    { id: 'midnight-blue',  name: 'Room 5', price: 800, accent: '#7d86e0' }
  ];

  SN.ROOM_BY_ID = SN.ROOMS.reduce(function (m, r) { m[r.id] = r; return m; }, {});

  /** What a room looks like before any wallpaper or floor is applied. */
  SN.BLANK_ROOM_THEME = {
    wall: '#f7f2ea', wallInk: '#f7f2ea', wallPattern: 'plain',
    floor: '#e3d5c0', floorInk: '#e3d5c0', floorPattern: 'plain',
    skirting: '#fffaf3', accent: '#c9b8a0', mood: 'day'
  };

})(window.SN = window.SN || {});
