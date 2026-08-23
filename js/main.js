/* ============================================================
   Boot
   ============================================================ */
(function (SN) {
  'use strict';

  function start() {
    SN.load();
    SN.UI.init();
    SN.Room.init();
    SN.Tray.init();
    SN.Catch.init();

    // A returning player shouldn't need the "drag a sticker" nudge.
    if (SN.state.stats.plays === 0 && SN.currentLayout().length === 0) {
      setTimeout(function () {
        SN.UI.toast('👋 Welcome! Drag a sticker into the room, then hit <b>Earn Coins</b>.');
      }, 700);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})(window.SN = window.SN || {});
