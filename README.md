# QDRO Frenzy

A browser game: you work the review desk. Orders land in front of you one at a
time, each carrying three clauses. Read them, then drag the right stamp onto the
order before the clock runs out. Runs on phones and desktops, no install.

## How to play

1. Pick one of four reviewers — Rhiannon, Emily, Heather, or Emma.
2. Read every clause on the order.
   - All clauses clean → drag **Qualified** onto the order.
   - Any clause defective → drag **Rejected**.
3. Clear **8** orders correctly before the clock hits zero to win.
4. A wrong stamp costs **12 seconds**, and the order shows you what you missed —
   the defect you stamped past gets flagged in red, or you are told the order
   was clean.

Clear the desk and a line of churros dances on the victory screen. Run out the
clock and your reviewer detonates, scattering the filings across the office.

Dragging is the intended control; tapping a stamp or pressing **Q** / **R**
also works, so the game is playable by keyboard. Win or lose, **Play Again**
returns you to the reviewer select screen.

## Tuning

The knobs sit at the top of `assets/game.js`:

```js
var GOAL = 8;             // orders to clear
var PER_ORDER = 3;        // clauses on each order
var SECONDS = 75;         // on the clock
var WRONG_PENALTY = 12;   // seconds lost per mis-stamp
```

## The clause bank

`CLAUSES` in `assets/game.js` is the entire content of the game. Each entry is:

```js
{ text: "…", good: true | false, topics: ["fees"] }
```

`good: false` marks a defect, so any order containing one must be rejected.
`topics` keeps two clauses about the same subject off a single order — it is
why an order never cites two states, never carries two valuation dates, and
never pairs a clause with its own negation. Add clauses freely; give a new one
the topic of whatever it speaks to.

Orders are drawn from a shuffled queue that keeps clean and defective orders
evenly mixed, and a short recent-use list keeps the same clause from appearing
on back-to-back orders.

## Running it

A static site with no build step. Open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

To publish on GitHub Pages: Settings → Pages → deploy from the branch root.

## Layout

```
index.html          full page (GitHub Pages / local)
artifact.html       body-only shell for publishing as a Claude artifact
assets/game.css     styling and design tokens
assets/game.js      game logic and clause bank — both shells load this
assets/portraits/   reviewer select art
assets/sprites/     desk sprites, cut from the supplied sheet
assets/audio/       background music
```
