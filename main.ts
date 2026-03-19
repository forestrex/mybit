// ============================================================
// MICRO FIGHTERS — Real-time wireless fighting game
// BBC micro:bit V2  |  MakeCode Blocks / TypeScript
// Flash this SAME code to BOTH micro:bits.
// ============================================================

// ---------- constants ----------
const LIGHT_DMG = 1
const HEAVY_DMG = 2
const BLOCK_REDUCE = 1
const HEAL_AMOUNT = 1
const MAX_HP = 5
const MAX_HEALS = 2
const LIGHT_CD = 1000
const HEAVY_CD = 3500
const BLOCK_DURATION = 1000
const BLOCK_RECOVERY = 1500
const RADIO_GROUP = 1
const RADIO_POWER = 6
const BEACON_INTERVAL = 500
const DEAD_REPEAT = 3

// ---------- state variables ----------
let gameState = 0          // 0 PAIRING  1 COUNTDOWN  2 PLAYING  3 GAME_OVER
let myHP = MAX_HP
let enemyHP = MAX_HP
let isBlocking = false
let healsRemaining = MAX_HEALS
let lightCooldown = false
let heavyCooldown = false
let blockCooldown = false
let animPlaying = false
let won = false
let isDraw = false

// ============================================================
//  DISPLAY HELPERS
// ============================================================

function drawHealthBars(): void {
    // row 0 = my HP
    for (let x = 0; x <= 4; x++) {
        if (x < myHP) {
            led.plot(x, 0)
        } else {
            led.unplot(x, 0)
        }
    }
    // row 4 = enemy HP
    for (let x2 = 0; x2 <= 4; x2++) {
        if (x2 < enemyHP) {
            led.plot(x2, 4)
        } else {
            led.unplot(x2, 4)
        }
    }
}

function clearActionArea(): void {
    for (let y = 1; y <= 3; y++) {
        for (let x3 = 0; x3 <= 4; x3++) {
            led.unplot(x3, y)
        }
    }
}

// ---------- light attack animation (arrow →) ----------
function playLightAttackAnim(): void {
    if (animPlaying) { return }
    animPlaying = true
    // frame 1
    clearActionArea()
    led.plot(2, 1)
    led.plot(3, 2)
    led.plot(2, 3)
    basic.pause(80)
    // frame 2
    clearActionArea()
    led.plot(3, 1)
    led.plot(4, 2)
    led.plot(3, 3)
    basic.pause(80)
    clearActionArea()
    animPlaying = false
}

// ---------- heavy attack animation (X slash) ----------
function playHeavyAttackAnim(): void {
    if (animPlaying) { return }
    animPlaying = true
    // frame 1
    clearActionArea()
    led.plot(0, 1); led.plot(4, 1)
    led.plot(1, 2); led.plot(3, 2)
    led.plot(2, 3)
    basic.pause(100)
    // frame 2
    clearActionArea()
    led.plot(1, 1); led.plot(3, 1)
    led.plot(2, 2)
    led.plot(1, 3); led.plot(3, 3)
    basic.pause(100)
    // frame 3
    clearActionArea()
    led.plot(2, 1)
    led.plot(1, 2); led.plot(3, 2)
    led.plot(0, 3); led.plot(4, 3)
    basic.pause(100)
    clearActionArea()
    animPlaying = false
}

// ---------- hit received animation (flash X) ----------
function playHitAnim(): void {
    if (animPlaying) { return }
    animPlaying = true
    // frame 1 — X
    clearActionArea()
    led.plot(0, 1); led.plot(4, 1)
    led.plot(2, 2)
    led.plot(0, 3); led.plot(4, 3)
    basic.pause(100)
    // frame 2 — full flash
    for (let y2 = 1; y2 <= 3; y2++) {
        for (let x4 = 0; x4 <= 4; x4++) {
            led.plot(x4, y2)
        }
    }
    basic.pause(100)
    // frame 3 — clear
    clearActionArea()
    basic.pause(100)
    animPlaying = false
}

// ---------- block shield (sustained) ----------
function showShield(): void {
    clearActionArea()
    led.plot(1, 1); led.plot(2, 1); led.plot(3, 1)
    led.plot(1, 2); led.plot(2, 2); led.plot(3, 2)
    led.plot(2, 3)
}

// ---------- deflect flash ----------
function playDeflectAnim(): void {
    // expanded shield for one frame
    clearActionArea()
    for (let x5 = 0; x5 <= 4; x5++) { led.plot(x5, 1) }
    led.plot(1, 2); led.plot(2, 2); led.plot(3, 2)
    led.plot(2, 3)
    basic.pause(100)
    // restore normal shield if still blocking
    if (isBlocking) {
        showShield()
    } else {
        clearActionArea()
    }
}

// ---------- heal animation (mini heart) ----------
function playHealAnim(): void {
    if (animPlaying) { return }
    animPlaying = true
    // frame 1
    clearActionArea()
    led.plot(1, 1); led.plot(3, 1)
    led.plot(1, 2); led.plot(2, 2); led.plot(3, 2)
    led.plot(2, 3)
    basic.pause(150)
    // frame 2
    clearActionArea()
    led.plot(2, 2)
    basic.pause(150)
    clearActionArea()
    animPlaying = false
}

// ============================================================
//  GAME LOGIC
// ============================================================

function sendHP(): void {
    radio.sendString("HP:" + convertToText(myHP))
}

function applyDamage(baseDamage: number): void {
    let actualDamage = baseDamage
    if (isBlocking) {
        actualDamage = Math.max(0, baseDamage - BLOCK_REDUCE)
    }
    myHP = Math.max(0, myHP - actualDamage)
    sendHP()
    drawHealthBars()

    if (isBlocking && actualDamage < baseDamage) {
        // blocked (at least partially)
        music.playTone(Note.E5, music.beat(BeatFraction.Sixteenth))
        playDeflectAnim()
    } else if (actualDamage > 0) {
        music.playTone(Note.C3, music.beat(BeatFraction.Eighth))
        playHitAnim()
    }
    checkGameOver()
}

function checkGameOver(): void {
    if (myHP <= 0) {
        gameState = 3
        won = false
        // send DEAD 3× for reliability
        for (let i = 0; i < DEAD_REPEAT; i++) {
            radio.sendString("DEAD")
            if (i < DEAD_REPEAT - 1) { basic.pause(100) }
        }
        basic.clearScreen()
        basic.showIcon(IconNames.Sad)
        soundExpression.sad.play()
    }
}

function showWin(): void {
    gameState = 3
    won = true
    basic.clearScreen()
    basic.showIcon(IconNames.Happy)
    soundExpression.happy.play()
}

function showDraw(): void {
    gameState = 3
    isDraw = true
    basic.clearScreen()
    // skull pattern
    led.plot(1, 0); led.plot(2, 0); led.plot(3, 0)
    led.plot(0, 1); led.plot(2, 1); led.plot(4, 1)
    for (let x6 = 0; x6 <= 4; x6++) { led.plot(x6, 2) }
    led.plot(1, 3); led.plot(3, 3)
    led.plot(1, 4); led.plot(2, 4); led.plot(3, 4)
    music.playTone(Note.B3, 500)
}

function startCountdown(): void {
    gameState = 1
    basic.clearScreen()
    music.playTone(Note.A4, 100)
    basic.showNumber(3)
    basic.pause(1000)
    music.playTone(Note.A4, 100)
    basic.showNumber(2)
    basic.pause(1000)
    music.playTone(Note.A4, 100)
    basic.showNumber(1)
    basic.pause(1000)
    music.playTone(Note.A5, 200)
    basic.showString("GO!")
    basic.pause(500)
    basic.clearScreen()
    // enter PLAYING
    gameState = 2
    drawHealthBars()
}

function resetGame(): void {
    gameState = 0
    myHP = MAX_HP
    enemyHP = MAX_HP
    isBlocking = false
    healsRemaining = MAX_HEALS
    lightCooldown = false
    heavyCooldown = false
    blockCooldown = false
    animPlaying = false
    won = false
    isDraw = false
    basic.clearScreen()
}

// ============================================================
//  INPUT HANDLERS
// ============================================================

// --- Button A : Light Attack ---
input.onButtonPressed(Button.A, function () {
    if (gameState != 2) { return }
    if (lightCooldown) { return }
    lightCooldown = true
    radio.sendString("A")
    music.playTone(Note.C5, music.beat(BeatFraction.Sixteenth))
    control.inBackground(function () {
        playLightAttackAnim()
    })
    control.inBackground(function () {
        basic.pause(LIGHT_CD)
        lightCooldown = false
    })
})

// --- Button B : Block ---
input.onButtonPressed(Button.B, function () {
    if (gameState != 2) { return }
    if (blockCooldown) { return }
    blockCooldown = true
    isBlocking = true
    showShield()
    control.inBackground(function () {
        basic.pause(BLOCK_DURATION)
        isBlocking = false
        clearActionArea()
        basic.pause(BLOCK_RECOVERY)
        blockCooldown = false
    })
})

// --- Shake : Heavy Attack ---
input.onGesture(Gesture.Shake, function () {
    if (gameState != 2) { return }
    if (heavyCooldown) { return }
    heavyCooldown = true
    radio.sendString("H")
    music.playTone(Note.C4, music.beat(BeatFraction.Eighth))
    control.inBackground(function () {
        playHeavyAttackAnim()
    })
    control.inBackground(function () {
        basic.pause(HEAVY_CD)
        heavyCooldown = false
    })
})

// --- Touch Logo : Heal (V2 only) ---
input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    if (gameState != 2) { return }
    if (healsRemaining <= 0) { return }
    healsRemaining -= 1
    myHP = Math.min(MAX_HP, myHP + HEAL_AMOUNT)
    sendHP()
    drawHealthBars()
    music.playTone(Note.C4, music.beat(BeatFraction.Sixteenth))
    music.playTone(Note.E4, music.beat(BeatFraction.Sixteenth))
    music.playTone(Note.G4, music.beat(BeatFraction.Sixteenth))
    control.inBackground(function () {
        playHealAnim()
    })
})

// --- A+B : Reset (only in GAME_OVER) ---
input.onButtonPressed(Button.AB, function () {
    if (gameState != 3) { return }
    resetGame()
})

// ============================================================
//  RADIO HANDLER
// ============================================================

radio.onReceivedString(function (receivedString: string) {
    if (receivedString == "READY") {
        if (gameState == 0) {
            startCountdown()
        }
    } else if (receivedString == "A") {
        if (gameState == 2) {
            applyDamage(LIGHT_DMG)
        }
    } else if (receivedString == "H") {
        if (gameState == 2) {
            applyDamage(HEAVY_DMG)
        }
    } else if (receivedString.indexOf("HP:") == 0) {
        if (gameState == 2) {
            enemyHP = parseInt(receivedString.substr(3))
            drawHealthBars()
        }
    } else if (receivedString == "DEAD") {
        if (gameState == 2) {
            if (myHP <= 0) {
                showDraw()
            } else {
                showWin()
            }
        }
    }
})

// ============================================================
//  FOREVER LOOP
// ============================================================

basic.forever(function () {
    if (gameState == 0) {
        // PAIRING — send beacon and show scrolling "?"
        radio.sendString("READY")
        basic.showString("?")
    } else if (gameState == 2) {
        // PLAYING — refresh health bars
        drawHealthBars()
        basic.pause(50)
    }
})

// ============================================================
//  ON START
// ============================================================

radio.setGroup(RADIO_GROUP)
radio.setTransmitPower(RADIO_POWER)
resetGame()
