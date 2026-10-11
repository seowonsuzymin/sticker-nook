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
    SN.Audio.init();            // reads volumes; the context waits for a gesture
    SN.UI.init();               // modal / toast / settings chrome — no state needed yet
    SN.ProfileScreen.init();
    SN.RoomSelect.init();
    SN.ProfileScreen.show();
  }

  /** Load a profile and show the room. */
  SN.enterGame = function (profileId) {
    if (!SN.Profiles.setActive(profileId)) return;
    SN.Profiles.touch();
    SN.load();

    // One arrival sound for the whole transition: RoomSelect.show() and the
    // welcome toast below would otherwise pile two more on top of it.
    SN.Audio.play('nook.enter');
    SN.Audio.suppress('room.enter', 1200);
    SN.Audio.suppress('ui.toast', 1200);

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
    SN.UI.renderRoomBar();
    SN.ProfileScreen.hide();
    SN.RoomSelect.show();       // pick a room before decorating

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
    SN.RoomSelect.hide();
    SN.ProfileScreen.show();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})(window.SN = window.SN || {});
