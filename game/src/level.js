// Emberhold — Lantern Defense: the map. The road, what can be built on, and the
// night-meadow dressing scattered around it (seeded, so the map always looks the same).
import { GRID, PATH_CELLS, WAYPOINTS } from './config.js';
import { intRange, mulberry32, range } from './random.js';

const pathSet = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));

/** True when grid cell (col, row) is part of the road. */
export function isPathCell(col, row) {
  return pathSet.has(`${col},${row}`);
}

/** True when a tower may be built on grid cell (col, row). */
export function isBuildable(col, row) {
  if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return false;
  return !isPathCell(col, row);
}

/** Centre of grid cell (col, row) in canvas pixels. */
export function cellCentre(col, row) {
  return { x: GRID.ox + col * GRID.cell + GRID.cell / 2, y: GRID.oy + row * GRID.cell + GRID.cell / 2 };
}

/** Grid cell under canvas point (x, y), or null when it is off the field. */
export function cellAt(x, y) {
  const col = Math.floor((x - GRID.ox) / GRID.cell);
  const row = Math.floor((y - GRID.oy) / GRID.cell);
  if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return null;
  return { col, row };
}

/** The road's waypoints, copied so callers cannot bend the shared road. */
export function roadWaypoints() {
  return WAYPOINTS.map((p) => ({ x: p.x, y: p.y }));
}

/**
 * Meadow dressing: grass tufts, pebbles and glow-moths on buildable ground, plus stars
 * above the field. Pure decoration — never on the road, never blocking a build.
 */
export function makeDecorations(seed) {
  const rng = mulberry32(seed);
  const tufts = [];
  const pebbles = [];
  const moths = [];
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let col = 0; col < GRID.cols; col += 1) {
      if (isPathCell(col, row)) continue;
      const cx = GRID.ox + col * GRID.cell;
      const cy = GRID.oy + row * GRID.cell;
      const rolls = intRange(rng, 0, 3);
      for (let i = 0; i < rolls; i += 1) {
        tufts.push({
          x: cx + range(rng, 8, GRID.cell - 8),
          y: cy + range(rng, 8, GRID.cell - 8),
          lean: range(rng, -0.4, 0.4),
          size: range(rng, 5, 9),
          hue: pickHue(rng),
        });
      }
      if (rng() < 0.22) {
        pebbles.push({
          x: cx + range(rng, 10, GRID.cell - 10),
          y: cy + range(rng, 10, GRID.cell - 10),
          r: range(rng, 2, 4.5),
        });
      }
    }
  }
  for (let i = 0; i < 26; i += 1) {
    moths.push({
      x: range(rng, 20, 1000), y: range(rng, 70, 680),
      phase: range(rng, 0, Math.PI * 2), speed: range(rng, 0.4, 1.1),
    });
  }
  const stars = [];
  for (let i = 0; i < 70; i += 1) {
    stars.push({ x: range(rng, 0, 1280), y: range(rng, 0, 56), r: range(rng, 0.6, 1.6), tw: range(rng, 0, Math.PI * 2) });
  }
  return { tufts, pebbles, moths, stars };
}

function pickHue(rng) {
  const hues = ['#2e5d3a', '#3a6b44', '#274d33', '#4a7a4e'];
  return hues[Math.floor(rng() * hues.length)];
}
