// Emberhold — Lantern Defense: deterministic screenshot scenes for ?shot=.
// Each scene plays the real rules forward from a fresh game for a fixed number of
// steps, steered by the game's own autopilot, so the frame is what a short game
// really looks like — and the same seed always gives the same frame.
import { STEP } from './game.js';

const PLAY_TARGET_WAVE = 3;
const END_LIMIT_SECONDS = 900;

/** Advance the game `seconds` of fixed steps. */
function simulate(game, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) game.update(STEP);
}

/** Play waves until `wave` is cleared (or the game ends), spending gold between waves. */
function playThrough(game, wave) {
  while (game.wave < wave && game.state !== 'victory' && game.state !== 'defeat') {
    game.autoSpend();
    if (!game.startWave()) break;
    let guard = 0;
    while (game.state === 'wave' && guard < 3600 * 10) {
      game.update(STEP);
      guard += 1;
    }
    if (game.state !== 'build') break;
  }
}

/** A few towers on the meadow so the title screen shows the game, not an empty field. */
function dressTitle(game) {
  game.autoSpend();
  game.state = 'title';
}

/**
 * Set the game to the named scene (start, play or end; any other name is start)
 * and return the state the frame shows.
 */
export function stageShot(name, game) {
  game.reset();
  // The autopilot plays from the build phase, not the title screen.
  game.state = 'build';
  if (name !== 'play' && name !== 'end') {
    dressTitle(game);
    simulate(game, 4);
    game.state = 'title';
    return { scene: 'start', state: game.state };
  }
  if (name === 'play') {
    playThrough(game, PLAY_TARGET_WAVE - 1);
    game.autoSpend();
    game.startWave();
    // Run wave 3 until the road is busy and the horde is spread along it:
    // at least 6 foes out and 4 of them past the first bend, or 30 seconds in.
    let guard = 0;
    while (guard < 30 / STEP) {
      game.update(STEP);
      guard += 1;
      const spread = game.enemies.filter((e) => e.dist > 600).length;
      if (game.enemies.length >= 6 && spread >= 4) break;
      if (game.state !== 'wave') break;
    }
    return { scene: 'play', state: game.state, wave: game.wave };
  }
  // end: play the whole game with the autopilot, then show how it finished.
  playThrough(game, 12);
  let guard = 0;
  while (game.state === 'wave' && guard < END_LIMIT_SECONDS / STEP) {
    game.update(STEP);
    guard += 1;
  }
  return { scene: 'end', state: game.state, wave: game.wave, score: game.score };
}
