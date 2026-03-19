# Micro Fighters

A real-time wireless fighting game for **two BBC micro:bit V2** devices.  
Both micro:bits run the exact same code. Pair up, count down, and fight!

---

## Quick Start

There are two ways to build and flash the game: the **MakeCode web editor**
(no install required) or the **command-line** (requires Node.js).

### Option A — MakeCode Web Editor

1. Open <https://makecode.microbit.org/>
2. Click **New Project**, give it any name
3. Click the **JavaScript** tab at the top of the editor
4. Select all the default code and delete it
5. Open `main.ts` from this repository and copy its entire contents
6. Paste into the MakeCode JavaScript editor
7. Click **Download** — the browser downloads a `.hex` file
8. Connect a micro:bit V2 via USB — it appears as a drive called `MICROBIT`
9. Copy the `.hex` file onto the `MICROBIT` drive
10. Repeat steps 7–9 for the second micro:bit V2

> **Tip:** Click the **Blocks** tab in MakeCode to see the visual block
> representation of the code.

### Option B — Command-Line Build

**Prerequisites:** [Node.js](https://nodejs.org/) v16 or later.

```bash
# 1. Clone the repo
git clone <repo-url> && cd mybit

# 2. Install the MakeCode micro:bit toolchain (creates package.json, node_modules/)
npx pxt target microbit

# 3. Fetch MakeCode dependencies listed in pxt.json (creates pxt_modules/)
npx pxt install

# 4. Build — compiles TypeScript and produces .hex files
npx pxt build
```

On success the `built/` directory contains:

| File | Description |
|---|---|
| `built/binary.hex` | **Universal hex** — works on both V1 and V2 (recommended) |
| `built/mbcodal-binary.hex` | V2-only (CODAL) binary |
| `built/mbdal-binary.hex` | V1-only (DAL) binary |

Copy `built/binary.hex` onto each micro:bit's `MICROBIT` USB drive.

### Play!

1. Power on both micro:bits (USB or battery pack)
2. Both show a scrolling `?` while searching for an opponent
3. Once paired, a countdown appears: **3 … 2 … 1 … GO!**
4. Fight! The last player with HP remaining wins

---

## Controls

| Input | Action | Cooldown |
|---|---|---|
| **Button A** | Light Attack (1 damage) | 1 s |
| **Button B** | Block (absorb / reduce damage) | 2.5 s total |
| **Shake** | Heavy Attack (2 damage) | 3.5 s |
| **Touch Logo** | Heal +1 HP (2 uses per game) | None |
| **A + B** | Restart (only after game over) | — |

---

## Display

During gameplay the 5x5 LED grid shows:

```
Row 0: ■ ■ ■ ■ ■   <-- YOUR health (lit LEDs = HP remaining)
Row 1: . . . . .   \
Row 2: . . . . .    | action animations
Row 3: . . . . .   /
Row 4: ■ ■ ■ ■ ■   <-- ENEMY health
```

### Animations

| Event | What you see |
|---|---|
| Light attack sent | Arrow sliding right |
| Heavy attack sent | X-slash expanding outward |
| Hit received | X flash then full-row flash |
| Block active | Shield icon (rows 1-3) |
| Block deflects hit | Shield expands briefly |
| Heal | Mini heart pulses |

### End-of-game screens

| Result | Display | Sound |
|---|---|---|
| **Win** | Happy face | Victory melody |
| **Lose** | Sad face | Defeat sound |
| **Draw** | Skull icon | Flat tone |

Press **A + B** on both micro:bits to rematch.

---

## Game Rules

- Each player starts with **5 HP**.
- **Light Attack** (Button A): deals 1 damage. Blocked = 0 damage.
- **Heavy Attack** (Shake): deals 2 damage. Blocked = 1 damage.
- **Block** (Button B): active for 1 second. Reduces incoming damage by 1.
  After the block window ends there is a 1.5 s recovery before you can block
  again (2.5 s total cooldown).
- **Heal** (Touch Logo): restores 1 HP (max 5). You get 2 heals per game.
  Healing at full HP still consumes a charge.
- First player to reach **0 HP** loses.
- If both players die at the same time, it is a **draw**.

---

## Strategy Tips

- **Burst combo**: Shake for heavy attack, then immediately follow with a
  light attack for 3 total damage before the opponent can react.
- **Bait the block**: Fake aggression to make your opponent waste their block
  cooldown, then attack during their 1.5 s recovery window.
- **Save your heals**: Don't heal at full HP. Use heals when you're at 1-2 HP
  to survive a burst.
- **Don't over-block**: The 2.5 s total cooldown leaves you vulnerable. Time
  your blocks to catch heavy attacks for maximum value.

---

## Technical Details

- **Communication**: micro:bit radio, group 1, power level 6 (~10 m range).
- **Message protocol**: simple strings (`"A"`, `"H"`, `"HP:3"`, `"DEAD"`,
  `"READY"`). See `SPEC.md` for the full protocol specification.
- **Pairing**: both devices send `"READY"` beacons every 500 ms until they
  hear each other. No manual pairing needed.
- **Reliability**: the `"DEAD"` message is sent 3 times to guard against
  radio packet loss.

---

## Known Limitations

- Only **2 micro:bits** should be on radio group 1 at the same time. A third
  device would cause interference.
- The **Touch Logo** and **Speaker** are V2-only features. On a V1 micro:bit
  you will lose the heal ability and all sound effects.
- Radio is best-effort; in rare cases a single attack message may be lost.
  HP is re-synced after every hit to self-correct.

---

## Project Files

| File | Description |
|---|---|
| `main.ts` | Complete game source (MakeCode TypeScript) |
| `pxt.json` | MakeCode project manifest (dependencies: `core`, `radio`) |
| `SPEC.md` | Full game design specification |
| `README.md` | This file |

---

## License

This project is provided as-is for educational and recreational use.
