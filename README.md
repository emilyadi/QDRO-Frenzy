# QDRO Frenzy

A browser game: filings rain down on the intake desk, and you catch the clean
ones in the APPROVED box your drafter holds overhead. Runs on phones and
desktops, no install.

## How to play

1. Pick one of four drafters — Rhiannon, Emily, Heather, or Emma.
2. Move with touch-drag, the mouse, or the arrow keys.
3. Catch **10** good filings to qualify the order. Every catch speeds the
   docket up a little.
4. Let **3** good filings hit the floor and the order is rejected.
5. Catching a defective clause costs you one qualified catch — it never ends
   the run on its own.

Good and bad clauses wear the same manila chip, so reading the clause is the
game. A clean one reads like *"AP is the former spouse"*; a defective one reads
like *"AP is P's neighbor"* or *"Transfer the award into an IRA"*. The pools
live at the top of `assets/game.js`.

Win or lose, **Play Again** returns you to the character select screen.

## Running it

It is a static site with no build step. Open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

To publish on GitHub Pages: Settings → Pages → deploy from the branch root.

## Layout

```
index.html          full page (GitHub Pages / local)
artifact.html       body-only shell for publishing as a Claude artifact
assets/game.css     styling and design tokens
assets/game.js      game logic — both shells load this
assets/portraits/   character-select art
assets/sprites/     in-game sprites, cut from the supplied sheet
assets/audio/       background music
```

Art and music were supplied as PDFs/MP3 and extracted into `assets/`.
