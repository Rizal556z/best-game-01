// Emberhold — Lantern Defense: towers and their projectiles. A tower picks the
// enemy furthest along the road inside its range, turns toward it and fires homing
// shots; frost chills, spark splashes, ember burns steady.
import { MAX_TOWER_LEVEL, TOWERS, levelDamageMul, levelRangeBonus, upgradeCost } from './config.js';

export class Tower {
  constructor(kind, col, row, x, y) {
    this.kind = kind;
    this.def = TOWERS[kind];
    this.col = col;
    this.row = row;
    this.x = x;
    this.y = y;
    this.level = 1;
    this.invested = this.def.cost;
    this.cooldown = 0;
    this.angle = -Math.PI / 2;
    this.flash = 0;
    this.kills = 0;
  }

  get range() { return this.def.range + levelRangeBonus(this.level); }
  get damage() { return this.def.damage * levelDamageMul(this.level); }
  get rate() { return this.def.rate * (1 + 0.08 * (this.level - 1)); }
  get canUpgrade() { return this.level < MAX_TOWER_LEVEL; }
  get nextUpgradeCost() { return upgradeCost(this.kind, this.level); }

  upgrade() {
    if (!this.canUpgrade) return false;
    this.invested += this.nextUpgradeCost;
    this.level += 1;
    return true;
  }

  /** The enemy furthest along the road within range, or null. */
  acquire(enemies) {
    let best = null;
    for (const e of enemies) {
      if (e.dead || e.escaped) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= this.range + e.radius && (best === null || e.dist > best.dist)) best = e;
    }
    return best;
  }

  update(dt, enemies, projectiles, sfx) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.flash > 0) this.flash -= dt;
    const target = this.acquire(enemies);
    if (target) this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (target && this.cooldown <= 0) {
      this.cooldown = 1 / this.rate;
      this.flash = 0.08;
      projectiles.push(new Projectile(this, target));
      if (sfx) sfx.shoot(this.kind);
    }
  }
}

export class Projectile {
  constructor(tower, target) {
    this.kind = tower.kind;
    this.def = tower.def;
    this.damage = tower.damage;
    this.speed = tower.def.projSpeed;
    this.splash = tower.def.splash;
    this.slow = tower.def.slow;
    this.slowDur = tower.def.slowDur || 0;
    this.target = target;
    this.x = tower.x + Math.cos(tower.angle) * 20;
    this.y = tower.y + Math.sin(tower.angle) * 20;
    this.lastX = target.x;
    this.lastY = target.y;
    this.spent = false;
    this.tower = tower;
  }

  /** Move toward the target; returns true when the shot has landed. */
  update(dt) {
    if (!this.target.dead && !this.target.escaped) {
      this.lastX = this.target.x;
      this.lastY = this.target.y;
    }
    const dx = this.lastX - this.x;
    const dy = this.lastY - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step + 6) {
      this.x = this.lastX;
      this.y = this.lastY;
      this.spent = true;
      return true;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    return false;
  }

  /** Apply the hit to the target (and its neighbours for splash). Returns the enemies hit. */
  land(enemies, now) {
    const hit = [];
    if (this.splash > 0) {
      for (const e of enemies) {
        if (e.dead || e.escaped) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) <= this.splash + e.radius) {
          e.takeDamage(this.damage);
          hit.push(e);
        }
      }
    } else if (!this.target.dead && !this.target.escaped) {
      this.target.takeDamage(this.damage);
      if (this.slow > 0) this.target.applySlow(this.slow, this.slowDur, now);
      hit.push(this.target);
    }
    return hit;
  }
}
