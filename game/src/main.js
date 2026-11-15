// Emberhold — Lantern Defense: the entry point. Boots the canvas, runs the
// fixed-step loop, wires mouse and keyboard to the game, and stages the
// deterministic screenshot scenes behind ?shot=start|play|end.
import { Sfx } from './audio.js';
import { VIEW_H, VIEW_W } from './config.js';
import { Game, STEP } from './game.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 20261115) || 20261115;
const shotName = params.get('shot');

const sfx = new Sfx();
const game = new Game(seed, sfx);

// A debug hook for playtests: the live state, never shown to the player.
window.__emberhold = { game, sfx };

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

canvas.addEventListener('click', (event) => {
  const p = canvasPoint(event);
  game.handleClick(p.x, p.y);
  announce();
});

canvas.addEventListener('mousemove', (event) => {
  const p = canvasPoint(event);
  game.handleMouseMove(p.x, p.y);
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key.startsWith('Arrow')) event.preventDefault();
  game.handleKey(event.key);
  announce();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && (game.state === 'wave' || game.state === 'build') && !game.paused) {
    game.paused = true;
  }
});

/** Keep the screen-reader status line in step with the game. */
function announce() {
  if (!statusEl) return;
  const s = game.snapshot();
  statusEl.textContent =
    `Emberhold, ${s.state}. Wave ${Math.max(1, s.wave)} of 12. ` +
    `${s.gold} gold, lantern ${s.heartHp} hearts, score ${s.score}, ` +
    `${s.enemies} foes on the road, ${s.towers} towers built.`;
}

function frame() {
  draw(ctx, game);
}

if (shotName) {
  // Screenshot mode: stage the scene from the real rules, draw one frame and
  // signal the screenshot driver. No animation loop, no sound, no wall clock.
  // __setShot re-stages another scene in place, so one browser launch can take
  // every screenshot without a fresh navigation.
  const stage = (name) => {
    window.__shotReady = false;
    const info = stageShot(name, game);
    window.__shotInfo = info;
    frame();
    announce();
    window.__shotReady = true;
  };
  window.__setShot = stage;
  stage(shotName);
} else {
  let last = performance.now();
  let acc = 0;
  function loop(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      game.update(STEP);
      acc -= STEP;
      steps += 1;
    }
    if (steps === 5) acc = 0;
    frame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
