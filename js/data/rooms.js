/* ============================================================
   Room themes
   ------------------------------------------------------------
   To add a room: append one entry to ROOMS below.

     id           unique string (localStorage key — don't rename)
     name         display name on the tab
     price        coins to unlock (0 = unlocked from the start)
     wall         wall base colour
     wallInk      wall pattern colour
     wallPattern  'stripes' | 'dots' | 'stars' | 'grid' | 'plain'
     floor        floor base colour
     floorInk     floor pattern colour
     floorPattern 'plank' | 'checker' | 'tile'
     skirting     baseboard colour along the bottom of the walls
     accent       used for the tab swatch + soft room glow
     mood         'day' | 'night'  (night dims the ambient light)
   ============================================================ */
(function (SN) {
  'use strict';

  SN.ROOMS = [
    {
      id: 'cozy-pink', name: 'Cozy Pink', price: 0,
      wall: '#ffe6ee', wallInk: '#ffd2e0', wallPattern: 'stripes',
      floor: '#f5d7b6', floorInk: '#e6bd92', floorPattern: 'plank',
      skirting: '#fff7f0', accent: '#ff9db4', mood: 'day'
    },
    {
      id: 'minty-fresh', name: 'Minty Fresh', price: 150,
      wall: '#dcf6ec', wallInk: '#bfe9da', wallPattern: 'dots',
      floor: '#f2ece1', floorInk: '#ddd3c3', floorPattern: 'checker',
      skirting: '#ffffff', accent: '#6fd6b4', mood: 'day'
    },
    {
      id: 'sunny-yellow', name: 'Sunny Yellow', price: 300,
      wall: '#fff2cc', wallInk: '#ffe3a1', wallPattern: 'grid',
      floor: '#e9d3b3', floorInk: '#d3b78e', floorPattern: 'plank',
      skirting: '#fffaf0', accent: '#ffc93c', mood: 'day'
    },
    {
      id: 'lavender-dream', name: 'Lavender Dream', price: 500,
      wall: '#eae2fb', wallInk: '#d6c8f4', wallPattern: 'stars',
      floor: '#f3e9f5', floorInk: '#dfcfe6', floorPattern: 'checker',
      skirting: '#fdfbff', accent: '#a98fe0', mood: 'day'
    },
    {
      id: 'midnight-blue', name: 'Midnight Blue', price: 800,
      wall: '#3f4478', wallInk: '#6f79c9', wallPattern: 'stars',
      floor: '#5a5382', floorInk: '#867dbe', floorPattern: 'tile',
      skirting: '#8f87c4', accent: '#7d86e0', mood: 'night'
    }
  ];

  SN.ROOM_BY_ID = SN.ROOMS.reduce(function (m, r) { m[r.id] = r; return m; }, {});

})(window.SN = window.SN || {});
