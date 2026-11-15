# Emberhold — Lantern Defense (best-game-01 build note)

**Game:** Emberhold — Lantern Defense. Original 2D canvas tower defense: hold the
last lantern through 12 waves of the gloom horde (mites, wisps, flutterbats,
hulks, and the Gloom Herald boss every 4th wave). Three tower kinds (Ember
Turret, Frost Spire, Spark Coil), upgrades to level 3, sell for 70%, gold
economy, wave-clear bonuses. Win by clearing wave 12; lose if the lantern
loses all 20 hearts.

**Controls:** mouse (click tower cards or press 1/2/3, click a meadow cell to
build, click a tower to upgrade/sell), Space to send a wave, P pause, M mute,
R restart, Esc deselect. HUD shows gold, wave, lantern hearts, score, best,
foes left. Procedural WebAudio sounds (shots, coins, leaks, horns, win/lose)
plus a soft lantern lullaby. No network requests; all files under game/.

**Files:** game/index.html + 11 modules under game/src/ (config, random,
level, enemies, towers, particles, audio, game, render, shots, main), main.ts,
serve.ts, vendor/makefun-game.ts (kit copy, unchanged), LICENSE (MIT),
shots.json, 3 screenshots.

**Balance (Node sim, autopilot):** wins wave 12 with 10/20 hearts left,
318 foes banished, score 7035, ~9.5 min full run. A careless player leaks
and loses; the autopilot's win is a real fight, not a walkover.

**Tested:**
- Node balance sim (autopilot, full 12 waves): victory, 10 hearts left.
- Node shot staging (all 3 scenes): start=title, play=wave 3 with 7 foes
  on the road, end=victory, score 7035.
- Headless Chrome playtest (real CDP mouse + keys, 9 checks, all PASS):
  title → click starts game → key 1 + click builds Ember Turret (gold
  140→80) → tower selectable → Space starts wave 1 → foes spawn → P
  pauses/unpauses → tower kills foes (gold/score rise) → R restarts clean.
  Console errors: none. No failed network requests.
- Screenshots: real renders via ?shot=start|play|end&seed=1 in headless
  Chromium (file:// gate redirect), 1280x720 PNG, each ≤256 KiB.
- Dossier: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` —
  schema makefun/dossier/v1, text 63,911 bytes (cap 163,840), 12 source
  files (63,073 bytes), 3 images. Two runs byte-identical (deterministic).

**Screenshots:**
- 1-start.png (146,807 bytes) — title screen over the meadow, 2 towers placed
- 2-play.png (138,388 bytes) — wave 3 in progress, HUD, towers firing
- 3-end.png (153,800 bytes) — victory screen, 12/12 waves, stats + Play again

**Repo:** https://github.com/Rizal556z/best-game-01
**Commit:** 12b4c11607576d04908d40120f8e70e12140ebbd
