/* ============================================================
   Boot + profile switching
   ------------------------------------------------------------
   The page opens on the profile picker. Choosing a slot loads that
   profile's save and mounts the game; the game's own modules are
   only wired up once, and re-render on every later switch.
   ============================================================ */
(function (SN) {
  'use strict';

  var mounted = false;

  function start() {
    SN.Profiles.init();
    SN.UI.init();               // modal / toast / settings chrome — no state needed yet
    SN.ProfileScreen.init();
    SN.ProfileScreen.show();
  }

  /** Load a profile and show the room. */
  SN.enterGame = function (profileId) {
    if (!SN.Profiles.setActive(profileId)) return;
    SN.Profiles.touch();
    SN.load();

    if (!mounted) {
      SN.Room.init();
      SN.Tray.init();
      SN.Arcade.init();
      mounted = true;
    } else {
      SN.Room.render();
      SN.Tray.render();
    }
    SN.UI.renderCoins();
    SN.UI.renderTabs();
    SN.ProfileScreen.hide();

    var p = SN.Profiles.active();
    if (SN.state.stats.plays === 0 && SN.currentLayout().length === 0) {
      setTimeout(function () {
        SN.UI.toast('👋 Welcome to ' + p.name + '! Drag a sticker in, then hit <b>Earn Coins</b>.');
      }, 600);
    }
  };

  /** Back to the picker. Progress is already saved, but flush anyway. */
  SN.leaveGame = function () {
    SN.save(true);
    SN.Profiles.touch();
    SN.ProfileScreen.show();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})(window.SN = window.SN || {});
