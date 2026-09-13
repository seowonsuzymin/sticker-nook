# Sticker Nook

A cozy pastel room-decoration game. Runs entirely in the browser — no backend, no build
step, no accounts. Progress saves to `localStorage` automatically.

**To play:** double-click `index.html`. That's it. (It also works served over http if you
prefer: `python3 -m http.server` then open `localhost:8000`.)

## Save profiles

The game opens on a picker with **3 save slots**. Each nook is completely
independent — its own coins, unlocked stickers, unlocked rooms and per-room
layouts — so you can start over in a fresh slot without touching an existing one.

When you make a nook you pick a **character** (Girl, Bear, Cat, Puppy, Bunny or
Panda) and an **outfit colour**. Your character sits in the room wearing that
colour and appears on the save-slot card, so your nooks are easy to tell apart.

Switch nooks any time via ⚙ → **Switch nook**. "Reset progress" only wipes the nook
you're currently in. Deleting a nook from the picker removes just that slot's save.

## The loop

1. Pick a room from the hex grid, then decorate it: drag stickers from the tray into the
   isometric room, corner handles to resize / rotate / flip, ✕ to delete. `Delete` and `Esc`
   work on the selected sticker too. The ← button goes back to the grid.
2. Most stickers and rooms are locked behind coins.
3. Coins come only from the mini-games. **"Earn Coins" deals you one at random** (never the
   same one twice in a row) — see below.
4. Spend coins on stickers and new room themes. Each room keeps its own independent layout.

Reset progress lives behind the ⚙ button, alongside a per-room "clear" and your run stats.

## Files

```
index.html            page shell — HUD, room tabs, stage, tray, overlays
css/style.css         all styling and the pastel design tokens
js/
  data/iso.js         isometric drawing kit: box, cyl, taper, ball, ring…
  data/stickers.js    the sticker catalog          ← add stickers here
  data/rooms.js       the room themes              ← add rooms here
  data/characters.js  playable characters          ← add characters here
  profiles.js         save slots: index, per-profile keys, outfit colours
  state.js            state shape + localStorage save/load/reset + event bus
  art.js              isometric room renderer, the girl character, avatars
  room.js             placed stickers: drag, resize, rotate, flip, delete,
                      surface detection, plane shear, depth sorting
  tray.js             sticker tray, category filters, purchase flow
  games/arcade.js     shared shell: HUD, countdown, timer, results, random picker
  games/catch.js      Sticker Catch              ← add mini-games alongside these
  games/memory.js     Memory Match
  games/peekaboo.js   Peek-a-Boo
  room-select.js      the hex grid of rooms + its fixed top bar
  ui.js               coin HUD, room buy flows, modals, toasts, settings
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

## How placed stickers sit in the room

The room is drawn in orthographic isometric — no perspective, and both floor axes run at
the same angle, `atan(135/460) ≈ 16.35°`. Placed stickers are fitted to that:

- **Where it landed decides the surface.** `surfaceAt()` in `room.js` tests the drop point
  against the two wall parallelograms; anything below them is floor. It's recomputed as you
  drag, so moving a piece from the floor onto a wall re-orients it live.
- **Wall pieces are sheared into the wall.** Posters, clocks, windows and garlands are drawn
  flat and front-on, then `skewY(±16.35°)` lays them exactly in the plane of the wall they're
  on. That's an affine shear, not a 3D rotation — a CSS `perspective()` would make them
  converge and stop matching the room, which is drawn without any.
- **Floor pieces need no shear** — their art is already isometric (see below). The flip
  handle turns them between the two floor axes instead of just mirroring them.
- **Floor pieces get a soft grounding shadow.** A circle on the floor projects to an
  axis-aligned ellipse of exactly 135/460, so `.sticker-shadow` is that ratio, sitting on the
  art's ground line.
- **Overlap is resolved by depth, not by placement order.** `depthZ()` sorts on where a
  piece's *base* sits, in three bands: walls behind the whole room, floor coverings under
  anything standing on them, then standing pieces by depth. Drag something forward and it
  comes forward.

The hex-grid miniatures reuse the same `SN.surfaceAt` / `SN.stickerDepth`, so a room's
thumbnail is arranged exactly like the room itself.

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
  flat: 1,                  // optional — floor coverings that others stand on
  art: taper(50, G, 11, 8, 26, C.blue) + ball(50, 48, 13, C.pink)
}
```

`art` is SVG markup drawn inside a `viewBox="0 0 100 100"`, and the whole catalog follows
one art direction:

- **Isometric.** Build solids with the kit in `js/data/iso.js` — `box`, `cyl`, `taper`,
  `ball`, `ring`, `disc`, plus `faceL`/`faceR` for detail on a box's visible sides — so
  everything shares one axonometric angle and sits flush on the floor. Floor pieces stand on
  the ground line `ISO.GY` (88) and face the right-hand floor axis.
- **Exactly three tones per object.** `tones(base)` returns `[highlight, base, shadow]` from
  one pastel colour; the solids apply them to top / base side / shadow side. No gradients,
  no reflections.
- **One 3px rounded dark outline**, inherited from the wrapper `<svg>` — so shapes only ever
  set a `fill`. Use `stroke="none"` on interior shading and `fill="none"` on open paths.
- **Chunky and simplified**: few parts, generous radii, muted pastels from `C` at the top of
  the file.

Wall pieces (posters, clocks, windows, garlands) are the exception — draw them flat and
front-on, centred in the box. The room shears them onto the wall when they're dropped there.

The isometric angle is one constant, `R` at the top of `js/data/iso.js`. It's set to the
room's own floor slope so objects line up with it; raising it toward `0.577` gives a classic
30° axonometric — more dramatic, but it stops matching the floor.

## The room grid

After choosing a nook you land on the room-select screen: a fixed top bar (home / coins /
settings) over a vertically scrolling honeycomb of rooms.

- **Locked rooms** are a flat hexagon in the room's own accent colour, with a lock and a
  `LEVEL N` label. Tap one to buy it.
- **Unlocked rooms** render a miniature of the real thing — the same two walls and floor,
  with the furniture you've actually placed in it — plus a round pencil button on the bottom
  edge that opens the room for decorating.
- The last tile is a dashed **NEW ROOM** hex: 1000 coins for a blank room, rising 500 each
  time (1000, 1500, 2000, …).
- The coin pill in the top bar is tappable — it deals you a random mini-game.

Tiles are pointy-top hexagons squashed to 0.7 of their width so they read as tilted into the
isometric view, laid out as rows of 3 with rows of 2 tucked between them (so the 5 presets
make one tidy block). `LEVEL N` is just the room's position in `state.roomOrder`.
`SN.hexRoom()` in `art.js` draws a tile; unlocked ones reuse the real room geometry, clipped
to the hexagon.

## The mini-games

| Game | Length | How it plays |
| --- | --- | --- |
| **Sticker Catch** | 40s | Stars, hearts, ribbons and flowers fall — tap them before they land. Combo ×5 max. Void blobs cost 5 coins. |
| **Memory Match** | 50s | Sixteen cards, eight pairs. You get a one-second peek at the board, then match them from memory. Back-to-back matches build a ×3 streak; clearing the board early pays a time bonus. |
| **Peek-a-Boo** | 35s | Nine burrows, and your characters pop out of them. Tap them before they duck back down. Combo ×5 max, and the blobs are back. |

A strong run in any of them lands roughly in the 300–500 coin range, so the random pick
never feels like a bad deal.

## Adding a mini-game

Games live in `js/games/` and register themselves with the arcade, which owns the overlay,
HUD, countdown, timer bar and results card. Write the file, add a `<script>` tag for it in
`index.html`, and it joins the random rotation automatically — nothing else to wire up.

```js
SN.Arcade.register({
  id: 'my-game',                    // unique
  name: 'My Game',                  // announced during the countdown
  tagline: 'Do the thing!',         // one line of instructions
  winTitle: 'Well played!',         // heading on the results card
  meter: 'Combo',                   // label for the third HUD cell
  duration: 40,                     // seconds (0 = untimed)
  start: function (ctx) { /* build into ctx.field */ },
  tick: function (dt, ctx) { /* optional, once per frame */ },
  stop: function () { /* cancel your timers */ }
});
```

The `ctx` handed to `start`/`tick` gives you `field`, `timeLeft()`, `award(n, x, y)`,
`penalize(n, x, y)`, `bonus(n)`, `popText()`, `shake()`, `setMeter()`, `breakMeter()`,
`peakCombo(n)`, `rows([...])` for the results card, `title()` and `finish()` to end early.
Each one is documented at the top of `js/games/arcade.js`.

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

Player-added blank rooms are separate from this catalog — they're created at purchase time
and saved on the profile itself (`state.customRooms`), and `SN.roomDef(id)` resolves either
kind to the theme object the renderer needs.

Existing saves are migrated forward on load, so new stickers and rooms appear for players
already mid-game without wiping their progress.

## Adding a character

Every character shares one sitting body (drawn in `art.js`) and supplies only its
own head, which is what keeps them looking like one set. Append an entry to
`CHARACTERS` in `js/data/characters.js`:

```js
{
  id: 'fox',                    // stored on the profile — never rename
  name: 'Fox',                  // label under the picker tile
  limb: '#f0a868',              // arm and leg colour
  paw: '#fff3e2',               // sock / paw colour
  head: function (c) {          // c = the profile's outfit palette
    return '<path d="..." fill="#f0a868"/>' +   // ears
      '<circle cx="50" cy="42" r="27" fill="#f0a868"/>' +
      bow(76, 30, 1.4, c) +     // a bow in the player's chosen colour
      eyes(40, 4.2, 5.4, 12) + blush(51, 26) + smile(56, 11);
  }
}
```

The head draws into the character's local 100×140 box: the head sits at about
(50, 42) with a radius of ~27, ears go above it. `eye`/`eyes`/`blush`/`smile`/`bow`
are shared helpers at the top of the file. The picker tiles and save-slot avatars
are generated from the same `head`, so there's no second drawing to maintain.

## Tuning the economy

Each game keeps its own constants at the top of its file — run length, penalties, multiplier
caps and per-item values. A strong run earns roughly 300–500 coins; unlocking all 40 stickers
and all 5 rooms costs about 3,800.
