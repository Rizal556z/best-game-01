// Emberhold — Lantern Defense: the horde. Each enemy walks the road waypoint by
// waypoint; `dist` is how far along the road it has come, which is also how towers
// choose their target (the furthest along is the most dangerous).
import { ENEMIES, waveHpScale } from './config.js';

let nextId = 1;

export class Enemy {
  constructor(kind, wave, waypoints) {
    const def = ENEMIES[kind];
    this.id = nextId;
    nextId += 1;
    this.kind = kind;
    this.def = def;
    this.maxHp = Math.round(def.hp * waveHpScale(wave));
    this.hp = this.maxHp;
    this.baseSpeed = def.speed * Math.min(1.25, 1 + 0.02 * (wave - 1));
    this.waypoints = waypoints;
    this.wp = 1;
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    this.dist = 0;
    this.radius = def.radius;
    this.reward = def.reward;
    this.leak = def.leak;
    this.score = def.score;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.dead = false;
    this.escaped = false;
    this.flash = 0;
    this.wobble = this.id * 1.7; // fixed per enemy, so a seeded run renders the same
  }

  get speed() {
    return this.baseSpeed * this.slowFactor;
  }

  /** Chill this enemy: it moves at (1 - amount) speed until `now + dur`. */
  applySlow(amount, dur, now) {
    this.slowFactor = Math.min(this.slowFactor, 1 - amount);
    this.slowUntil = Math.max(this.slowUntil, now + dur);
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.flash = 0.12;
    if (this.hp <= 0) this.dead = true;
  }

  update(dt, now) {
    if (this.flash > 0) this.flash -= dt;
    if (now > this.slowUntil && this.slowFactor < 1) this.slowFactor = 1;
    if (this.wp >= this.waypoints.length) {
      this.escaped = true;
      return;
    }
    const target = this.waypoints[this.wp];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step) {
      this.x = target.x;
      this.y = target.y;
      this.dist += d;
      this.wp += 1;
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      this.dist += step;
    }
  }
}
