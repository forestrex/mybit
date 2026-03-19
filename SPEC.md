# MICRO FIGHTERS — Complete Game Specification

## 1. Overview

| Field | Value |
|---|---|
| **Name** | Micro Fighters |
| **Platform** | BBC micro:bit V2 |
| **Language** | MakeCode Blocks (TypeScript backing code, 1:1 block mapping) |
| **Players** | 2 (each running identical code on their own micro:bit) |
| **Communication** | Built-in radio |
| **Genre** | Real-time wireless fighting game |

Both micro:bits are flashed with the same program. They pair over radio, count
down, then fight. Players use buttons, shaking, and the V2 touch logo to
attack, block, and heal. Health is shown on the 5×5 LED grid. Sound effects
play through the V2 speaker. Last player standing wins.

---

## 2. Hardware Used

| Hardware | Purpose |
|---|---|
| 5×5 LED display | Health bars, action animations, game state screens |
| Button A | Light attack |
| Button B | Block / defend |
| Accelerometer (shake) | Heavy attack |
| Touch Logo (V2) | Heal |
| Buttons A+B together | Reset / restart game |
| Radio | Device-to-device communication |
| Speaker (V2) | Sound effects |

---

## 3. Game Balance

### 3.1 Stats

| Stat | Value |
|---|---|
| Starting HP | 5 per player |
| Max HP | 5 |
| Light Attack damage | 1 (0 if blocked) |
| Heavy Attack damage | 2 (1 if blocked) |
| Heal amount | +1 HP (capped at 5) |
| Heal uses per game | 2 |

### 3.2 Timing

| Action | Duration / Cooldown |
|---|---|
| Light Attack cooldown | 1000 ms after press |
| Heavy Attack cooldown | 3500 ms after shake |
| Block active window | 1000 ms |
| Block total cooldown | 2500 ms (1000 ms active + 1500 ms recovery) |
| Light attack animation | 160 ms (2 frames × 80 ms) |
| Heavy attack animation | 300 ms (3 frames × 100 ms) |
| Hit received animation | 300 ms (3 frames × 100 ms) |
| Deflect animation | 100 ms (1 frame) |
| Heal animation | 300 ms (2 frames × 150 ms) |
| Pairing beacon interval | 500 ms |
| Countdown interval | 1000 ms per number |
| Display refresh (forever loop) | 50 ms |

### 3.3 DPS Analysis

| Attack Type | Damage | Cooldown | DPS (unblocked) | DPS (vs block) |
|---|---|---|---|---|
| Light (A) | 1 | 1.0 s | 1.00 | 0.00 |
| Heavy (Shake) | 2 | 3.5 s | 0.57 | 0.29 |
| Combined optimal* | — | — | ~1.43 | — |

*Combined optimal: 1 heavy + 3 lights in a 3.5 s window = 5 dmg / 3.5 s*

### 3.4 Time-to-Kill (TTK)

| Scenario | TTK |
|---|---|
| All light, no blocks | 5 hits × 1.0 s = **5.0 s** |
| Mixed (heavy + lights), no blocks | heavy(2) + light(1) + light(1) + light(1) over 3.0 s = **3.0 s** |
| With 2 heals (+2 effective HP = 7) | ~**4.2 s** minimum |
| Realistic match (some blocks + heals) | **6–15 seconds** |

### 3.5 Strategy Depth

- **Aggro style:** Spam light attacks, use heavy when available. Fast but
  predictable.
- **Defensive style:** Block on reaction, heal to extend life, counter-attack
  in cooldown windows.
- **Bait style:** Press block to bait opponent into waiting, then attack during
  their hesitation.
- **Burst style:** Save heavy + immediate light for 3 damage in 1 second.
- Blocking is a prediction/reaction game: the 1000 ms window is generous but
  the 2500 ms total cooldown punishes over-blocking.

---

## 4. State Machine

### 4.1 States

| State | Value | Description |
|---|---|---|
| `PAIRING` | 0 | Waiting for opponent. Sends "READY" beacons. |
| `COUNTDOWN` | 1 | Paired. Showing 3…2…1…GO! |
| `PLAYING` | 2 | Active combat. All inputs live. |
| `GAME_OVER` | 3 | Match ended. Show result. |

### 4.2 Transitions

```
                   ┌─────────────────────────────────────┐
                   │           (A+B pressed)              │
                   v                                      │
              [PAIRING]                             [GAME_OVER]
                   │                                      ^
                   │ receive "READY"                      │
                   v                                      │
             [COUNTDOWN]                                  │
                   │                                      │
                   │ after "3..2..1..GO!"                  │
                   v                                      │
              [PLAYING] ──── myHP<=0 or "DEAD" recv ──────┘
```

### 4.3 State Entry Actions

**PAIRING:**
- Clear display
- Show scrolling `"?"` icon
- Begin sending `"READY"` every 500 ms via `control.inBackground()`

**COUNTDOWN:**
- Stop sending beacons
- Show `3` → pause 1000 → `2` → pause 1000 → `1` → pause 1000 → `"GO!"`
  → pause 500
- Play beep on each number

**PLAYING:**
- Clear display
- Draw initial health bars (both full)
- Enable all input handlers

**GAME_OVER:**
- If `won == true`: show Happy face, play victory sound expression
- If `won == false`: show Sad face, play defeat sound expression
- If `isDraw == true`: show Skull icon, play flat tone
- Wait for A+B to reset

---

## 5. LED Display Specification

### 5.1 Coordinate System

```
         col0  col1  col2  col3  col4
row 0:  (0,0) (1,0) (2,0) (3,0) (4,0)
row 1:  (0,1) (1,1) (2,1) (3,1) (4,1)
row 2:  (0,2) (1,2) (2,2) (3,2) (4,2)
row 3:  (0,3) (1,3) (2,3) (3,3) (4,3)
row 4:  (0,4) (1,4) (2,4) (3,4) (4,4)
```

MakeCode uses `led.plot(x, y)` where x = column, y = row.

### 5.2 Layout During PLAYING State

```
Row 0 (y=0): ■ ■ ■ ■ ■   ← YOUR HP bar (LEDs lit left→right = HP remaining)
Row 1 (y=1): . . . . .   ← Action area (top)
Row 2 (y=2): . . . . .   ← Action area (center)
Row 3 (y=3): . . . . .   ← Action area (bottom)
Row 4 (y=4): ■ ■ ■ ■ ■   ← ENEMY HP bar
```

### 5.3 Health Bar Patterns

**Your HP (Row 0, y = 0):**

```
5 HP: ■ ■ ■ ■ ■    plot(0,0) through plot(4,0)
4 HP: ■ ■ ■ ■ .    plot(0,0) through plot(3,0)
3 HP: ■ ■ ■ . .    plot(0,0) through plot(2,0)
2 HP: ■ ■ . . .    plot(0,0) through plot(1,0)
1 HP: ■ . . . .    plot(0,0)
0 HP: . . . . .    (all off)
```

**Enemy HP (Row 4, y = 4):** Same pattern on row 4.

### 5.4 Animation Frames (Rows 1–3 only)

All animations play on rows 1–3 (y = 1 to y = 3). Health bars on rows 0 and 4
remain persistent.

**IDLE (no animation):**

```
y=1: . . . . .
y=2: . . . . .
y=3: . . . . .
```

**LIGHT ATTACK SENT (arrow →):**

```
Frame 1 (80 ms):              Frame 2 (80 ms):
y=1: . . ■ . .              y=1: . . . ■ .
y=2: . . . ■ .              y=2: . . . . ■
y=3: . . ■ . .              y=3: . . . ■ .
```

Then clear action area.

**HEAVY ATTACK SENT (X slash):**

```
Frame 1 (100 ms):             Frame 2 (100 ms):             Frame 3 (100 ms):
y=1: ■ . . . ■              y=1: . ■ . ■ .              y=1: . . ■ . .
y=2: . ■ . ■ .              y=2: . . ■ . .              y=2: . ■ . ■ .
y=3: . . ■ . .              y=3: . ■ . ■ .              y=3: ■ . . . ■
```

Then clear action area.

**HIT RECEIVED (flash X):**

```
Frame 1 (100 ms):             Frame 2 (100 ms):             Frame 3 (100 ms):
y=1: ■ . . . ■              y=1: ■ ■ ■ ■ ■              y=1: . . . . .
y=2: . . ■ . .              y=2: ■ ■ ■ ■ ■              y=2: . . . . .
y=3: ■ . . . ■              y=3: ■ ■ ■ ■ ■              y=3: . . . . .
```

Frame 2 is a full "flash" effect to convey impact.

**BLOCK ACTIVE (shield — sustained while blocking):**

```
y=1: . ■ ■ ■ .
y=2: . ■ ■ ■ .
y=3: . . ■ . .
```

Displayed for the entire 1000 ms block duration, then cleared.

**BLOCK DEFLECT (brief flash when block absorbs hit):**

```
Frame 1 (100 ms):
y=1: ■ ■ ■ ■ ■
y=2: . ■ ■ ■ .
y=3: . . ■ . .
```

Then revert to shield pattern (if block still active) or clear.

**HEAL (mini heart):**

```
Frame 1 (150 ms):             Frame 2 (150 ms):
y=1: . ■ . ■ .              y=1: . . . . .
y=2: . ■ ■ ■ .              y=2: . . ■ . .
y=3: . . ■ . .              y=3: . . . . .
```

Then clear action area.

### 5.5 Full-Screen Displays (non-PLAYING states)

**PAIRING — scrolling "?":**
Uses `basic.showString("?")` which scrolls across the full 5×5 grid.

**COUNTDOWN:**
Uses `basic.showNumber(3)`, `basic.showNumber(2)`, `basic.showNumber(1)`,
then `basic.showString("GO!")`.

**WIN (Happy Face) — full 5×5:**

```
. . . . .
. ■ . ■ .
. . . . .
■ . . . ■
. ■ ■ ■ .
```

**LOSE (Sad Face) — full 5×5:**

```
. . . . .
. ■ . ■ .
. . . . .
. ■ ■ ■ .
■ . . . ■
```

**DRAW (Skull) — full 5×5:**

```
. ■ ■ ■ .
■ . ■ . ■
■ ■ ■ ■ ■
. ■ . ■ .
. ■ ■ ■ .
```

---

## 6. Radio Communication Protocol

### 6.1 Setup

- **Radio Group:** `1`
- **Transmit Power:** `6` (medium range, ~10 m)
- Both micro:bits join the same group on startup.

### 6.2 Message Format

All messages are strings sent via `radio.sendString()`.

| Message | Sender Context | Meaning |
|---|---|---|
| `"READY"` | PAIRING state | "I'm here, let's fight" |
| `"A"` | PLAYING, Button A pressed | Light attack (1 damage) |
| `"H"` | PLAYING, Shake detected | Heavy attack (2 damage) |
| `"HP:X"` | PLAYING, after taking damage or healing | My HP is now X (0–5) |
| `"DEAD"` | PLAYING, HP reached 0 | I'm dead, you win (sent 3×) |

### 6.3 Message Processing Rules

| Received Message | Current State | Action |
|---|---|---|
| `"READY"` | PAIRING | Transition to COUNTDOWN |
| `"READY"` | COUNTDOWN / PLAYING / GAME_OVER | Ignore |
| `"A"` | PLAYING | Apply 1 damage (0 if blocking) |
| `"A"` | Non-PLAYING | Ignore |
| `"H"` | PLAYING | Apply 2 damage (1 if blocking) |
| `"H"` | Non-PLAYING | Ignore |
| `"HP:X"` | PLAYING | Update `enemyHP` display |
| `"HP:X"` | Non-PLAYING | Ignore |
| `"DEAD"` | PLAYING, myHP > 0 | I win! → GAME_OVER (won = true) |
| `"DEAD"` | PLAYING, myHP ≤ 0 | Draw → GAME_OVER (isDraw = true) |
| `"DEAD"` | Non-PLAYING | Ignore |

---

## 7. Message Sequence Diagrams

### 7.1 Full Game — Pairing to Victory

```
Player A                               Player B
   |                                      |
   |──── "READY" ──────────────────────>  |
   |  <──────────────────── "READY" ────  |
   |                                      |
   | [state=COUNTDOWN]                    | [state=COUNTDOWN]
   | [3...2...1...GO!]                    | [3...2...1...GO!]
   |                                      |
   | [state=PLAYING]                      | [state=PLAYING]
   |                                      |
   |──── "A" ──────────────────────────>  |  A presses Button A
   |                                      |  [HP: 5→4, hit anim]
   |  <──────────────────── "HP:4" ────  |
   | [enemyHP=4]                          |
   |                                      |
   |  <──────────────────── "A" ────────  |  B presses Button A
   | [HP: 5→4, hit anim]                  |
   |──── "HP:4" ──────────────────────>   |
   |                                      | [enemyHP=4]
   |                                      |
   | [A presses B → blocking=true]        |
   |  <──────────────────── "H" ────────  |  B shakes (heavy)
   | [blocking! 2→1 dmg, HP: 4→3]        |
   | [deflect anim]                       |
   |──── "HP:3" ──────────────────────>   |
   |                                      | [enemyHP=3]
   |                                      |
   | ... more combat ...                  |
   |                                      |
   |──── "A" ──────────────────────────>  |  lethal hit
   |                                      | [HP: 1→0]
   |  <──────────────────── "DEAD" ────  |
   |  <──────────────────── "DEAD" ────  |  (sent 3×)
   |  <──────────────────── "DEAD" ────  |
   |                                      |
   | [state=GAME_OVER, won=true]          | [state=GAME_OVER, won=false]
   | [happy face + victory sound]         | [sad face + defeat sound]
```

### 7.2 Block Absorbs Light Attack

```
Player A                               Player B
   |                                      |
   |                                      |  B presses Button B
   |                                      |  [isBlocking=true, shield anim]
   |                                      |  [1000 ms timer starts]
   |                                      |
   |──── "A" ──────────────────────────>  |  A attacks
   |                                      |  [isBlocking=true → 1−1=0 dmg]
   |                                      |  [deflect anim + sound]
   |  <──────────────────── "HP:4" ────  |  (HP unchanged, syncs anyway)
   |                                      |
   |                                      |  [timer expires → isBlocking=false]
   |                                      |  [1500 ms block cooldown starts]
```

### 7.3 Heal

```
Player A                               Player B
   |                                      |
   | A touches logo                       |
   | [healsRemaining: 2→1]               |
   | [myHP: 3→4, capped at 5]            |
   | [heart anim + heal sound]            |
   |──── "HP:4" ──────────────────────>   |
   |                                      | [enemyHP=4]
```

### 7.4 Simultaneous Death (Draw)

```
Player A                               Player B
   |                                      |
   | [both at 1 HP]                       |
   |                                      |
   |──── "A" ──────────────────────────>  |  (both press A simultaneously)
   |  <──────────────────── "A" ────────  |
   |                                      |
   | [HP: 1→0]                            | [HP: 1→0]
   |──── "DEAD" (×3) ────────────────>   |
   |  <──────────────────── "DEAD" (×3)  |
   |                                      |
   | [recv DEAD + myHP==0 → draw]         | [recv DEAD + myHP==0 → draw]
   | [skull icon]                         | [skull icon]
```

### 7.5 Reset / Rematch

```
Player A                               Player B
   |                                      |
   | [GAME_OVER]                          | [GAME_OVER]
   |                                      |
   | A presses A+B                        |
   | [resetGame() → state=PAIRING]        |
   |──── "READY" ──────────────────────>  |  (ignored, B still in GAME_OVER)
   |                                      |
   |                                      |  B presses A+B
   |                                      |  [resetGame() → state=PAIRING]
   |  <──────────────────── "READY" ────  |
   |                                      |
   | [state=COUNTDOWN]                    |
   |──── "READY" ──────────────────────>  |  (one more beacon goes out)
   |                                      | [state=COUNTDOWN]
   |                                      |
   | [3...2...1...GO!]                    | [3...2...1...GO!]
```

---

## 8. Variables Specification

### 8.1 Complete Variable Table

| Variable | Type | Initial | Range | Description |
|---|---|---|---|---|
| `gameState` | number | 0 | 0–3 | Current state (PAIRING / COUNTDOWN / PLAYING / GAME_OVER) |
| `myHP` | number | 5 | 0–5 | Player's health points |
| `enemyHP` | number | 5 | 0–5 | Opponent's health (from radio sync) |
| `isBlocking` | boolean | false | — | True during active block window |
| `healsRemaining` | number | 2 | 0–2 | Heal charges left |
| `lightCooldown` | boolean | false | — | True during light attack cooldown |
| `heavyCooldown` | boolean | false | — | True during heavy attack cooldown |
| `blockCooldown` | boolean | false | — | True during block cooldown (includes active + recovery) |
| `animPlaying` | boolean | false | — | True while animation frames are showing |
| `won` | boolean | false | — | True = victory (valid in GAME_OVER only) |
| `isDraw` | boolean | false | — | True = both died (valid in GAME_OVER only) |

### 8.2 Constants

| Constant | Value | Description |
|---|---|---|
| `LIGHT_DMG` | 1 | Light attack base damage |
| `HEAVY_DMG` | 2 | Heavy attack base damage |
| `BLOCK_REDUCE` | 1 | Damage reduced when blocking |
| `HEAL_AMOUNT` | 1 | HP restored per heal |
| `MAX_HP` | 5 | Maximum health |
| `MAX_HEALS` | 2 | Heal charges per game |
| `LIGHT_CD` | 1000 | Light attack cooldown (ms) |
| `HEAVY_CD` | 3500 | Heavy attack cooldown (ms) |
| `BLOCK_DURATION` | 1000 | Block active window (ms) |
| `BLOCK_RECOVERY` | 1500 | Block recovery after active window (ms) |
| `RADIO_GROUP` | 1 | Radio group number |
| `RADIO_POWER` | 6 | Transmit power (0–7) |
| `BEACON_INTERVAL` | 500 | READY beacon interval (ms) |
| `DEAD_REPEAT` | 3 | Number of times to send "DEAD" |

---

## 9. Function Specifications

### 9.1 Display Functions

**`drawHealthBars(): void`**

- Clears row 0 and row 4
- Plots LEDs on row 0 from col 0 to col `myHP − 1`
- Plots LEDs on row 4 from col 0 to col `enemyHP − 1`
- Called every 50 ms in the forever loop and after any HP change

**`clearActionArea(): void`**

- Unplots all LEDs on rows 1, 2, 3 (y = 1, y = 2, y = 3)
- Called after every animation completes

**`playLightAttackAnim(): void`**

- Sets `animPlaying = true`
- Draws Frame 1 (arrow tip) for 80 ms
- Draws Frame 2 (arrow moved right) for 80 ms
- Calls `clearActionArea()`
- Sets `animPlaying = false`
- Total: 160 ms

**`playHeavyAttackAnim(): void`**

- Sets `animPlaying = true`
- Draws 3 frames of X-slash at 100 ms each
- Calls `clearActionArea()`
- Sets `animPlaying = false`
- Total: 300 ms

**`playHitAnim(): void`**

- Sets `animPlaying = true`
- Frame 1: X pattern (100 ms)
- Frame 2: Full flash rows 1–3 (100 ms)
- Frame 3: Clear (100 ms)
- Calls `clearActionArea()`
- Sets `animPlaying = false`
- Total: 300 ms

**`playBlockAnim(): void`**

- Draws shield pattern on rows 1–3
- Remains drawn until `isBlocking` becomes false (managed by block timer)
- Then calls `clearActionArea()`

**`playDeflectAnim(): void`**

- Sets `animPlaying = true`
- Draws expanded shield (100 ms)
- Then restores normal shield (if still blocking)
- Sets `animPlaying = false`
- Total: 100 ms

**`playHealAnim(): void`**

- Sets `animPlaying = true`
- Frame 1: Mini heart (150 ms)
- Frame 2: Single center dot (150 ms)
- Calls `clearActionArea()`
- Sets `animPlaying = false`
- Total: 300 ms

### 9.2 Game Logic Functions

**`applyDamage(baseDamage: number): void`**

- If `isBlocking`: `actualDamage = Math.max(0, baseDamage − BLOCK_REDUCE)`
- Else: `actualDamage = baseDamage`
- `myHP = Math.max(0, myHP − actualDamage)`
- Send `"HP:" + myHP` via radio
- Call `drawHealthBars()`
- If blocking and damage was reduced: play deflect anim + deflect sound
- Else if actualDamage > 0: play hit anim + hit sound
- Call `checkGameOver()`

**`checkGameOver(): void`**

- If `myHP <= 0`:
  - `gameState = 3` (GAME_OVER)
  - `won = false`
  - Send `"DEAD"` three times with 100 ms gap
  - Show sad face, play defeat sound

**`sendHP(): void`**

- `radio.sendString("HP:" + myHP)`

**`resetGame(): void`**

- `gameState = 0`
- `myHP = 5`, `enemyHP = 5`
- `isBlocking = false`
- `healsRemaining = 2`
- `lightCooldown = false`, `heavyCooldown = false`, `blockCooldown = false`
- `animPlaying = false`
- `won = false`, `isDraw = false`
- `basic.clearScreen()`
- Begin PAIRING state behaviour

**`startCountdown(): void`**

- `gameState = 1`
- Show 3, beep, pause 1000
- Show 2, beep, pause 1000
- Show 1, beep, pause 1000
- Show "GO!", longer beep, pause 500
- Clear screen
- `gameState = 2`
- Draw initial health bars

### 9.3 Input Handlers

**`input.onButtonPressed(Button.A)` — Light Attack:**

```
if gameState != 2: return
if lightCooldown: return
lightCooldown = true
radio.sendString("A")
playLightAttackAnim()
music.playTone(Note.C5, 100)
control.inBackground(() => {
    basic.pause(LIGHT_CD)
    lightCooldown = false
})
```

**`input.onButtonPressed(Button.B)` — Block:**

```
if gameState != 2: return
if blockCooldown: return
blockCooldown = true
isBlocking = true
playBlockAnim()
control.inBackground(() => {
    basic.pause(BLOCK_DURATION)
    isBlocking = false
    clearActionArea()
    basic.pause(BLOCK_RECOVERY)
    blockCooldown = false
})
```

**`input.onGesture(Gesture.Shake)` — Heavy Attack:**

```
if gameState != 2: return
if heavyCooldown: return
heavyCooldown = true
radio.sendString("H")
playHeavyAttackAnim()
music.playTone(Note.C4, 200)
control.inBackground(() => {
    basic.pause(HEAVY_CD)
    heavyCooldown = false
})
```

**`input.onLogoEvent(TouchButtonEvent.Pressed)` — Heal:**

```
if gameState != 2: return
if healsRemaining <= 0: return
healsRemaining -= 1
myHP = Math.min(MAX_HP, myHP + HEAL_AMOUNT)
sendHP()
drawHealthBars()
playHealAnim()
music.playTone(Note.C4, 100)
music.playTone(Note.E4, 100)
music.playTone(Note.G4, 100)
```

**`input.onButtonPressed(Button.AB)` — Reset:**

```
if gameState != 3: return
resetGame()
```

### 9.4 Radio Handler

**`radio.onReceivedString(receivedString: string)`:**

```
if receivedString == "READY":
    if gameState == 0:
        startCountdown()

else if receivedString == "A":
    if gameState == 2:
        applyDamage(LIGHT_DMG)

else if receivedString == "H":
    if gameState == 2:
        applyDamage(HEAVY_DMG)

else if receivedString.indexOf("HP:") == 0:
    if gameState == 2:
        enemyHP = parseInt(receivedString.substr(3))
        drawHealthBars()

else if receivedString == "DEAD":
    if gameState == 2:
        if myHP <= 0:
            isDraw = true
            gameState = 3
            // show skull, play flat tone
        else:
            won = true
            gameState = 3
            // show happy face, play victory sound
```

### 9.5 Forever Loop

**`basic.forever()`:**

```
if gameState == 0:
    radio.sendString("READY")
    basic.showString("?")

else if gameState == 2:
    drawHealthBars()
    basic.pause(50)
```

### 9.6 On Start Block

**`on start`:**

```
radio.setGroup(RADIO_GROUP)
radio.setTransmitPower(RADIO_POWER)
resetGame()
```

---

## 10. Sound Specification (V2 Speaker)

| Event | Sound | MakeCode API |
|---|---|---|
| Light Attack sent | Short high beep | `music.playTone(Note.C5, 100)` |
| Heavy Attack sent | Lower power tone | `music.playTone(Note.C4, 200)` |
| Hit received | Low thud | `music.playTone(Note.C3, 200)` |
| Block deflect | Quick chirp | `music.playTone(Note.E5, 50)` |
| Heal | Rising triad C→E→G | 3× `music.playTone()` in sequence |
| Countdown beep | Mid beep per number | `music.playTone(Note.A4, 100)` |
| Countdown "GO!" | Higher beep | `music.playTone(Note.A5, 200)` |
| Victory | Built-in happy | `soundExpression.happy.play()` |
| Defeat | Built-in sad | `soundExpression.sad.play()` |
| Draw | Flat tone | `music.playTone(Note.B3, 500)` |

---

## 11. Edge Cases & Handling

| # | Edge Case | Handling |
|---|---|---|
| 1 | Both players die simultaneously | Each sends "DEAD". If "DEAD" received while `myHP ≤ 0`, set `isDraw = true`. Show skull icon. |
| 2 | Attack received during animation | Damage applied immediately (HP decremented + game over checked). Hit animation may interrupt current animation. |
| 3 | Button press during cooldown | Ignored silently. Cooldown flag check is the first line in every handler. |
| 4 | Input during non-PLAYING state | Ignored. State check `gameState != 2` is the first line in every combat handler. |
| 5 | Radio message during wrong state | Ignored per the message processing rules table (Section 6.3). |
| 6 | HP underflow | `Math.max(0, myHP − damage)` prevents negative HP. |
| 7 | HP overflow on heal | `Math.min(5, myHP + 1)` caps at MAX_HP. |
| 8 | Heal when at full HP | Still consumes a heal charge. Player's strategic choice. |
| 9 | Rapid shakes | 3500 ms cooldown + MakeCode's built-in ~300 ms shake debounce. |
| 10 | Radio message loss | Attacks: lost message = missed attack (acceptable). HP sync: next hit re-syncs. DEAD: sent 3× for reliability. |
| 11 | Power on at different times | Both enter PAIRING independently. Beacons run until paired. No issue. |
| 12 | Third micro:bit on same radio group | Would cause interference. Out of scope. Documented as known limitation. |
| 13 | Block pressed right as attack arrives | Block flag set synchronously (before animation). If handler runs first, block is active. Sub-ms ordering is acceptable randomness. |
| 14 | A+B pressed during PLAYING | Ignored. Reset only works in GAME_OVER state. |
| 15 | Opponent never resets | First resetter enters PAIRING and sends beacons. Waits until opponent also resets. |

---

## 12. Files to Create

| File | Description |
|---|---|
| `main.ts` | Complete MakeCode TypeScript source (~250 lines). All variables, constants, event handlers, display functions, game logic. Both micro:bits run identical code. |
| `pxt.json` | MakeCode project manifest. Dependencies: `core`, `radio`. Target: `microbit`. |
| `README.md` | Game name, rules, setup instructions, controls reference, strategy tips, known limitations. |

---

## 13. Verification Plan

| # | Step | Method |
|---|---|---|
| 1 | Code compiles | Paste `main.ts` into MakeCode TypeScript editor — zero errors |
| 2 | Blocks render | Switch to Blocks view — all code appears as blocks |
| 3 | Simulator: pairing | Two MakeCode simulator tabs — verify READY / countdown flow |
| 4 | Simulator: combat | Click Button A — verify radio message sent and received |
| 5 | Simulator: game over | Reduce HP to 0 — verify correct win / lose / draw screens |
| 6 | On-device test | Flash to 2 real V2 micro:bits — play a full match |
| 7 | Sound test | Verify V2 speaker plays distinct sounds for each event |
| 8 | Reset test | After game over, press A+B on both — verify clean rematch |

---

## 14. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Block window too strong / weak | Medium | 1000 ms window + 2500 ms total cooldown is tunable. Playtest and adjust. |
| Radio interference in classroom | Medium | Document that only 2 micro:bits should be on group 1 at a time. |
| MakeCode block rendering issues | Low | Write clean TypeScript that maps to standard blocks. Avoid advanced TS features. |
| Animation timing feels off | Low | All durations are constants — easy to tune. |
| V1 micro:bit incompatibility | Low | Touch logo and speaker are V2 only. V1 users lose heal and sound. Documented. |
