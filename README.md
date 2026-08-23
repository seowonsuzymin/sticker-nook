# Sticker Nook

A cozy pastel room-decoration game. Runs entirely in the browser — no backend, no build
step, no accounts. Progress saves to `localStorage` automatically.

**To play:** double-click `index.html`. That's it. (It also works served over http if you
prefer: `python3 -m http.server` then open `localhost:8000`.)

## Save profiles

The game opens on a picker with **3 save slots**. Each nook is completely
independent — its own coins, unlocked stickers, unlocked rooms and per-room
layouts — so you can start over in a fresh slot without touching an existing one.
Name each nook and pick an outfit colour; the character wears it in-game, so you
can tell your saves apart at a glance.

Switch nooks any time via ⚙ → **Switch nook**. "Reset progress" only wipes the nook
you're currently in. Deleting a nook from the picker removes just that slot's save.

## The loop

1. Drag stickers from the tray into the isometric room. Drag to move, corner handles to
   resize / rotate / flip, ✕ to delete. `Delete` and `Esc` work on the selected sticker too.
2. Most stickers and rooms are locked behind coins.
3. Coins come only from **Sticker Catch** — the "Earn Coins" button. 40 seconds of tapping
   falling stars, hearts, ribbons and flowers. Combos raise your multiplier up to ×5; tapping
   a void blob costs 5 coins and resets the combo.
4. Spend coins on stickers and new room themes. Each room keeps its own independent layout.

Reset progress lives behind the ⚙ button, alongside a per-room "clear" and your run stats.

## Files

```
index.html            page shell — HUD, room tabs, stage, tray, overlays
css/style.css         all styling and the pastel design tokens
js/
  data/stickers.js    the sticker catalog          ← add stickers here
  data/rooms.js       the room themes              ← add rooms here
  profiles.js         save slots: index, per-profile keys, outfit colours
  state.js            state shape + localStorage save/load/reset + event bus
  art.js              isometric room renderer, the girl character, avatars
  room.js             placed stickers: drag, resize, rotate, flip, delete, z-order
  tray.js             sticker tray, category filters, purchase flow
  minigame.js         Sticker Catch
  ui.js               coin HUD, room switcher, modals, toasts, settings
  profile-screen.js   the "choose your nook" picker
  main.js             boot + profile switching
```

### Storage keys

| key | holds |
| --- | --- |
| `stickerNook.profiles.v1` | the list of save slots + which was last active |
| `stickerNook.save.v1.<profileId>` | one slot's full game state |

A save written before profiles existed (`stickerNook.save.v1`, no suffix) is
migrated into the first slot on load rather than discarded.

## Adding a sticker

Append one entry to `STICKERS` in `js/data/stickers.js`. Nothing else needs to change —
the tray, categories, save file and shop all pick it up automatically.

```js
{
  id: 'lava-lamp',          // unique; never rename an existing id or players lose it
  name: 'Lava Lamp',
  price: 70,                // 0 = owned from the start
  cat: 'decor',             // furniture | plush | plant | decor | food | tech
  size: 0.10,               // default width as a fraction of the room width
  art: '<ellipse cx="50" cy="40" r="20" fill="' + C.pink + '"/>' + ...
}
```

`art` is SVG markup drawn inside a `viewBox="0 0 100 100"`. The dark outline stroke is
inherited from the wrapper, so shapes only need a `fill` — use `stroke="none"` on small
details you don't want outlined, and `fill="none"` on open paths. `C` is the shared pastel
palette defined at the top of the file; sticking to it keeps everything looking like one set.

## Adding a room

Append one entry to `ROOMS` in `js/data/rooms.js`:

```js
{
  id: 'peachy', name: 'Peachy Keen', price: 650,
  wall: '#ffe8dc', wallInk: '#ffd2bd', wallPattern: 'dots',   // stripes|dots|stars|grid|plain
  floor: '#f0dcc4', floorInk: '#d9bd9c', floorPattern: 'plank', // plank|checker|tile
  skirting: '#fffaf6', accent: '#ff9f7a', mood: 'day'          // day|night
}
```

Existing saves are migrated forward on load, so new stickers and rooms appear for players
already mid-game without wiping their progress.

## Tuning the economy

In `js/minigame.js`: `DURATION` (run length), `BAD_PENALTY`, `MAX_MULT`, and each type's
`value` / `weight` in `TYPES`. A strong 40-second run currently earns roughly 400–500 coins;
unlocking all 40 stickers and all 5 rooms costs about 3,800.
