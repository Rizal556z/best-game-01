import { mulberry32 } from './random.js';

// Emberhold — Lantern Defense: sparks, poofs and floating gold text —
// the feedback that makes every hit, kill and leak feel answered.
export class Particles {
  constructor(seed = 1234) {
    this.rng = mulberry32(seed);
    this.list = [];
    this.texts = [];
  }

  burst(x, y, color, count, speed = 90, size = 3, life = 0.5) {
    for (let i = 0; i < count; i += 1) {
      const a = this.rng() * Math.PI * 2;
      const v = speed * (0.4 + this.rng() * 0.8);
      this.list.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20,
        life: life * (0.6 + this.rng() * 0.7), maxLife: life,
        color, size: size * (0.7 + this.rng() * 0.6),
      });
    }
  }

  ring(x, y, color, count = 14) {
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      this.list.push({
        x, y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
        life: 0.45, maxLife: 0.45, color, size: 3,
      });
    }
  }

  floatText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
  }

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
      p.vx *= 0.98;
    }
    this.list = this.list.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 26 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  clear() {
    this.list = [];
    this.texts = [];
  }
}
