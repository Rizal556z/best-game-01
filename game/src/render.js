// Emberhold — Lantern Defense: everything the player sees. One canvas, one
// draw call per frame: the meadow and road, the lantern, towers, the horde,
// the HUD and sidebar, and the title / victory / defeat screens.
import { GRID, HEART_HP, HEART_POS, HUD_H, PATH_CELLS, SIDEBAR_W, SIDEBAR_X, TOTAL_WAVES, TOWERS, TOWER_ORDER, VIEW_H, VIEW_W } from './config.js';
import { cellCentre, isBuildable, isPathCell } from './level.js';
import { UI } from './game.js';

const FONT = 'system-ui, "Segoe UI", sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 600) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function draw(ctx, game) {
  drawGround(ctx, game);
  drawRoad(ctx);
  drawLantern(ctx, game);
  drawTowers(ctx, game);
  drawEnemies(ctx, game);
  drawProjectiles(ctx, game);
  drawParticles(ctx, game);
  drawBuildGhost(ctx, game);
  drawHud(ctx, game);
  drawSidebar(ctx, game);
  drawBanner(ctx, game);
  drawHint(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  else if (game.state === 'victory') drawEnd(ctx, game, true);
  else if (game.state === 'defeat') drawEnd(ctx, game, false);
  else if (game.paused) drawPaused(ctx);
}

// ---- the field --------------------------------------------------------------

function drawGround(ctx, game) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#0d1f18');
  g.addColorStop(0.5, '#16281f');
  g.addColorStop(1, '#101f18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stars above the field.
  for (const s of game.decorations.stars) {
    const a = 0.35 + 0.35 * Math.sin(game.time * 1.4 + s.tw);
    ctx.globalAlpha = Math.max(0.1, a);
    ctx.fillStyle = '#ffeec2';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Meadow checker, faint.
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      if ((c + r) % 2 === 0) ctx.fillRect(c * GRID.cell, HUD_H + r * GRID.cell, GRID.cell, GRID.cell);
    }
  }
  // Grass tufts and pebbles.
  for (const t of game.decorations.tufts) {
    ctx.strokeStyle = t.hue;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(t.x - 3, t.y);
    ctx.lineTo(t.x - 3 + t.lean, t.y - t.size);
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + t.lean, t.y - t.size - 1);
    ctx.moveTo(t.x + 3, t.y);
    ctx.lineTo(t.x + 3 + t.lean, t.y - t.size);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a4a40';
  for (const p of game.decorations.pebbles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Drifting glow-moths.
  for (const m of game.decorations.moths) {
    const mx = m.x + Math.sin(game.time * m.speed + m.phase) * 14;
    const my = m.y + Math.cos(game.time * m.speed * 0.8 + m.phase) * 10;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(game.time * 2 + m.phase);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRoad(ctx) {
  ctx.fillStyle = '#6d5330';
  for (const [c, r] of PATH_CELLS) {
    ctx.fillRect(c * GRID.cell + 1, HUD_H + r * GRID.cell + 1, GRID.cell - 2, GRID.cell - 2);
  }
  ctx.fillStyle = '#8a6b3f';
  for (const [c, r] of PATH_CELLS) {
    ctx.fillRect(c * GRID.cell + 5, HUD_H + r * GRID.cell + 5, GRID.cell - 10, GRID.cell - 10);
  }
  ctx.fillStyle = 'rgba(255,220,150,0.13)';
  for (const [c, r] of PATH_CELLS) {
    ctx.fillRect(c * GRID.cell + 8, HUD_H + r * GRID.cell + 8, GRID.cell - 16, 10);
  }
}

function drawLantern(ctx, game) {
  const { x, y } = HEART_POS;
  const pulse = 1 + 0.06 * Math.sin(game.time * 2.2);
  const glowR = 86 * pulse;
  const glow = ctx.createRadialGradient(x, y, 8, x, y, glowR);
  const hpFrac = Math.max(0, game.heartHp / HEART_HP);
  glow.addColorStop(0, hpFrac > 0.3 ? 'rgba(255,190,90,0.55)' : 'rgba(255,90,90,0.55)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();
  // Stone plinth.
  ctx.fillStyle = '#4a4f55';
  rr(ctx, x - 26, y + 8, 52, 18, 5);
  ctx.fill();
  ctx.fillStyle = '#5d636b';
  rr(ctx, x - 22, y + 4, 44, 10, 4);
  ctx.fill();
  // Lantern body and flame.
  ctx.fillStyle = '#2b2f36';
  rr(ctx, x - 15, y - 26, 30, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.ellipse(x, y - 9, 8, 11 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 4.5, 7 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(x - 18, y - 30, 36, 5);
  ctx.fillRect(x - 3, y - 38, 6, 9);
  // Heart ring: the lantern's remaining health.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y - 8, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hpFrac > 0.3 ? '#ffb84d' : '#ff5a5a';
  ctx.beginPath();
  ctx.arc(x, y - 8, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac);
  ctx.stroke();
}

// ---- towers, enemies, projectiles -------------------------------------------

function drawTowers(ctx, game) {
  for (const t of game.towers) {
    const def = t.def;
    // Base.
    ctx.fillStyle = '#20262b';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    // Kind-specific top.
    if (t.kind === 'ember') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a2d00';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.kind === 'frost') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + game.time * 0.2;
        ctx.moveTo(t.x + Math.cos(a) * 4, t.y + Math.sin(a) * 4);
        ctx.lineTo(t.x + Math.cos(a) * 15, t.y + Math.sin(a) * 15);
        ctx.lineTo(t.x + Math.cos(a + 0.5) * 4, t.y + Math.sin(a + 0.5) * 4);
      }
      ctx.fill();
      ctx.fillStyle = '#eaf7ff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Spark coil: a ring of arcs around a core.
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 13, game.time * 1.5, game.time * 1.5 + Math.PI * 1.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(t.x, t.y, 13, game.time * 1.5 + Math.PI, game.time * 1.5 + Math.PI * 2.3);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Barrel toward the aim, for ember and spark.
    if (t.kind !== 'frost') {
      ctx.strokeStyle = '#e8e2d5';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(t.angle) * 22, t.y + Math.sin(t.angle) * 22);
      ctx.stroke();
    }
    // Level pips.
    for (let i = 0; i < t.level; i += 1) {
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(t.x - 8 + i * 8, t.y + 30, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Muzzle flash.
    if (t.flash > 0) {
      ctx.globalAlpha = t.flash / 0.08;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(t.x + Math.cos(t.angle) * 26, t.y + Math.sin(t.angle) * 26, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Selected: range ring.
    if (game.selectedTower === t) {
      ctx.strokeStyle = 'rgba(255,233,168,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    const bob = Math.sin(game.time * 6 + e.wobble) * 2;
    const x = e.x;
    const y = e.y + bob;
    const def = e.def;
    ctx.save();
    if (e.kind === 'mite') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x, y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a2d00';
      ctx.beginPath();
      ctx.arc(x - 3, y - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(x + 3, y - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'wisp') {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x, y, e.radius, Math.PI, 0);
      ctx.lineTo(x + e.radius, y + e.radius * 0.9);
      ctx.lineTo(x - e.radius, y + e.radius * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#12303f';
      ctx.beginPath();
      ctx.arc(x - 4, y - 3, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'flutter') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x - 13, y - 10 - Math.sin(game.time * 14 + e.wobble) * 5);
      ctx.lineTo(x - 6, y + 4);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 6, y + 4);
      ctx.lineTo(x + 13, y - 10 - Math.sin(game.time * 14 + e.wobble) * 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3d0f22';
      ctx.beginPath();
      ctx.arc(x - 2.5, y - 2, 1.6, 0, Math.PI * 2);
      ctx.arc(x + 2.5, y - 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'hulk') {
      ctx.fillStyle = def.color;
      rr(ctx, x - e.radius, y - e.radius, e.radius * 2, e.radius * 2, 6);
      ctx.fill();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2;
      rr(ctx, x - e.radius, y - e.radius, e.radius * 2, e.radius * 2, 6);
      ctx.stroke();
      ctx.fillStyle = '#2e3a22';
      ctx.beginPath();
      ctx.arc(x - 5, y - 3, 2.4, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 3, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // The Gloom Herald: a crowned wisp, big and slow.
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x, y, e.radius, Math.PI, 0);
      ctx.lineTo(x + e.radius, y + e.radius);
      ctx.lineTo(x - e.radius, y + e.radius);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd97a';
      ctx.beginPath();
      ctx.moveTo(x - 12, y - e.radius + 2);
      ctx.lineTo(x - 8, y - e.radius - 10);
      ctx.lineTo(x - 3, y - e.radius + 1);
      ctx.lineTo(x, y - e.radius - 12);
      ctx.lineTo(x + 3, y - e.radius + 1);
      ctx.lineTo(x + 8, y - e.radius - 10);
      ctx.lineTo(x + 12, y - e.radius + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a0a44';
      ctx.beginPath();
      ctx.arc(x - 7, y - 6, 3, 0, Math.PI * 2);
      ctx.arc(x + 7, y - 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Chill tint.
    if (e.slowFactor < 1) {
      ctx.strokeStyle = 'rgba(127,212,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, e.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Hit flash.
    if (e.flash > 0) {
      ctx.globalAlpha = e.flash / 0.12;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Health bar when hurt.
    if (e.hp < e.maxHp) {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - w / 2, y - e.radius - 10, w, 4);
      ctx.fillStyle = e.hp / e.maxHp > 0.4 ? '#7ddc7d' : '#ff7a5a';
      ctx.fillRect(x - w / 2, y - e.radius - 10, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  }
}

function drawProjectiles(ctx, game) {
  for (const p of game.projectiles) {
    if (p.kind === 'spark') {
      ctx.strokeStyle = p.def.glow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo((p.x + p.lastX) / 2 + 4, (p.y + p.lastY) / 2 - 4);
      ctx.lineTo(p.lastX, p.lastY);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.def.glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.kind === 'frost' ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.def.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles(ctx, game) {
  for (const p of game.particles.list) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const t of game.particles.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    text(ctx, t.text, t.x, t.y, 13, t.color, 'center', 700);
  }
  ctx.globalAlpha = 1;
}

function drawBuildGhost(ctx, game) {
  if (!game.selectedBuild || !game.hoverCell) return;
  const { col, row } = game.hoverCell;
  if (!isBuildable(col, row) || game.towerAt(col, row)) return;
  const c = cellCentre(col, row);
  const def = TOWERS[game.selectedBuild];
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,233,168,0.5)';
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(c.x, c.y, def.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---- HUD and sidebar --------------------------------------------------------

function drawHud(ctx, game) {
  ctx.fillStyle = '#0e1a14';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#2c4a3a';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  text(ctx, 'EMBERHOLD', 18, HUD_H / 2, 22, '#ffd97a', 'left', 800);
  text(ctx, 'Lantern Defense', 168, HUD_H / 2 + 1, 13, '#9fb8a8', 'left', 500);
  // Gold.
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.arc(330, HUD_H / 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5a00';
  text(ctx, 'g', 330, HUD_H / 2, 12, '#7a5a00', 'center', 800);
  text(ctx, String(game.gold), 346, HUD_H / 2, 18, '#ffe9a8', 'left', 700);
  // Wave.
  text(ctx, `WAVE ${Math.max(1, game.wave)} / ${TOTAL_WAVES}`, 470, HUD_H / 2, 17, '#e8f2ec', 'left', 700);
  const inWave = game.state === 'wave';
  const remaining = game.enemies.length + game.spawnQueue.length;
  text(ctx, inWave ? `foes left: ${remaining}` : game.wave === 0 ? 'build, then send wave 1' : 'between waves — build!', 470, HUD_H / 2 + 16, 11, '#9fb8a8', 'left', 500);
  // Lantern hearts: one glyph per heart, red while it burns, grey when spent.
  for (let i = 0; i < HEART_HP; i += 1) {
    text(ctx, '♥', 640 + i * 12, HUD_H / 2, 14, i < game.heartHp ? '#ff6b6b' : 'rgba(255,255,255,0.18)', 'left', 700);
  }
  text(ctx, `${game.heartHp}`, 640 + HEART_HP * 12 + 8, HUD_H / 2, 15, '#ffb3b3', 'left', 700);
  // Score and best.
  text(ctx, `SCORE ${game.score}`, 1010, HUD_H / 2 - 9, 15, '#e8f2ec', 'right', 700);
  text(ctx, `BEST ${Math.max(game.best, game.score)}`, 1010, HUD_H / 2 + 10, 11, '#9fb8a8', 'right', 500);
  // Pause / mute buttons.
  for (const [rect, label] of [[UI.pause, game.paused ? '▶' : '❚❚'], [UI.mute, game.sfx && game.sfx.muted ? '✕' : '♪']]) {
    ctx.fillStyle = '#1d3328';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#3a5a48';
    ctx.lineWidth = 1;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.stroke();
    text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 14, '#e8f2ec', 'center', 700);
  }
}

function drawSidebar(ctx, game) {
  ctx.fillStyle = '#101a16';
  ctx.fillRect(SIDEBAR_X, HUD_H, SIDEBAR_W, VIEW_H - HUD_H);
  ctx.fillStyle = '#2c4a3a';
  ctx.fillRect(SIDEBAR_X, HUD_H, 2, VIEW_H - HUD_H);
  text(ctx, 'BUILD  ·  click or press 1 / 2 / 3', SIDEBAR_X + 16, HUD_H + 22, 12, '#9fb8a8', 'left', 700);
  for (const card of UI.cards) {
    const def = TOWERS[card.kind];
    const afford = game.gold >= def.cost;
    const selected = game.selectedBuild === card.kind;
    ctx.fillStyle = selected ? '#2c4a3a' : '#1a2a22';
    rr(ctx, card.x, card.y, card.w, card.h, 8);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd97a' : '#2c4a3a';
    ctx.lineWidth = selected ? 2 : 1;
    rr(ctx, card.x, card.y, card.w, card.h, 8);
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(card.x + 22, card.y + 22, 11, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, def.name, card.x + 42, card.y + 16, 15, '#e8f2ec', 'left', 700);
    text(ctx, `${def.cost} gold  ·  [${def.key}]`, card.x + 42, card.y + 36, 12, afford ? '#ffd97a' : '#ff8a7a', 'left', 600);
    text(ctx, def.blurb, card.x + 14, card.y + 58, 11.5, '#9fb8a8', 'left', 500);
  }
  // Selected tower panel.
  const panelY = 392 + 64;
  text(ctx, 'TOWER', SIDEBAR_X + 16, panelY, 12, '#9fb8a8', 'left', 700);
  if (game.selectedTower) {
    const t = game.selectedTower;
    text(ctx, `${t.def.name}  ·  Lv ${t.level}`, SIDEBAR_X + 16, panelY + 20, 14, '#e8f2ec', 'left', 700);
    text(ctx, `damage ${Math.round(t.damage)}   range ${Math.round(t.range)}   kills ${t.kills}`, SIDEBAR_X + 16, panelY + 40, 11.5, '#9fb8a8', 'left', 500);
    drawSideButton(ctx, UI.upgrade, t.canUpgrade ? `UPGRADE ${t.nextUpgradeCost}g [U]` : 'MAX LEVEL', t.canUpgrade && game.gold >= t.nextUpgradeCost);
    drawSideButton(ctx, UI.sell, `SELL +${Math.round(t.invested * 0.7)}g [X]`, true);
  } else {
    text(ctx, 'Click one of your towers to upgrade', SIDEBAR_X + 16, panelY + 20, 11.5, '#7d9387', 'left', 500);
    text(ctx, 'or sell it for 70% of its cost.', SIDEBAR_X + 16, panelY + 38, 11.5, '#7d9387', 'left', 500);
  }
  // Send wave button.
  const sw = UI.sendWave;
  const canSend = game.state === 'build' && game.wave < TOTAL_WAVES;
  ctx.fillStyle = canSend ? '#b96a1e' : '#24352c';
  rr(ctx, sw.x, sw.y, sw.w, sw.h, 8);
  ctx.fill();
  ctx.strokeStyle = canSend ? '#ffd97a' : '#2c4a3a';
  ctx.lineWidth = 1.5;
  rr(ctx, sw.x, sw.y, sw.w, sw.h, 8);
  ctx.stroke();
  text(ctx, game.state === 'wave' ? 'WAVE IN PROGRESS…' : game.wave >= TOTAL_WAVES ? 'ALL WAVES DONE' : `SEND WAVE ${game.wave + 1}  [SPACE]`, sw.x + sw.w / 2, sw.y + sw.h / 2, 15, canSend ? '#fff3d6' : '#7d9387', 'center', 800);
  // Tips.
  text(ctx, 'Tips: build near the bends — towers', SIDEBAR_X + 16, 600, 11.5, '#7d9387', 'left', 500);
  text(ctx, 'there cover the road twice. Frost', SIDEBAR_X + 16, 618, 11.5, '#7d9387', 'left', 500);
  text(ctx, 'slows the horde for your embers.', SIDEBAR_X + 16, 636, 11.5, '#7d9387', 'left', 500);
  text(ctx, 'P pause · M mute · R restart', SIDEBAR_X + 16, 664, 11.5, '#7d9387', 'left', 500);
  text(ctx, 'Survive all 12 waves to win.', SIDEBAR_X + 16, 684, 11.5, '#7d9387', 'left', 500);
}

function drawSideButton(ctx, rect, label, enabled) {
  ctx.fillStyle = enabled ? '#2c4a3a' : '#1a2a22';
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fill();
  ctx.strokeStyle = enabled ? '#ffd97a' : '#2c4a3a';
  ctx.lineWidth = 1;
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2, 11.5, enabled ? '#ffe9a8' : '#7d9387', 'center', 700);
}

// ---- banners, hints, screens --------------------------------------------------

function drawBanner(ctx, game) {
  if (!game.banner || game.bannerTime <= 0) return;
  if (game.state === 'victory' || game.state === 'defeat' || game.state === 'title') return;
  const a = Math.min(1, game.bannerTime / 0.5, (2.2 - game.bannerTime) / 0.2 + 0.4);
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  text(ctx, game.banner.title, 512, 200, 44, '#ffd97a', 'center', 800);
  ctx.globalAlpha = Math.max(0, Math.min(1, a)) * 0.9;
  text(ctx, game.banner.sub, 512, 240, 16, '#e8f2ec', 'center', 500);
  ctx.globalAlpha = 1;
}

function drawHint(ctx, game) {
  if (!game.hint || game.hintTime <= 0) return;
  ctx.globalAlpha = Math.min(1, game.hintTime);
  text(ctx, game.hint, 512, VIEW_H - 16, 14, '#ffd97a', 'center', 600);
  ctx.globalAlpha = 1;
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(6,12,9,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitle(ctx, game) {
  dim(ctx);
  text(ctx, 'EMBERHOLD', 640, 170, 64, '#ffd97a', 'center', 800);
  text(ctx, '— Lantern Defense —', 640, 214, 20, '#9fe8ff', 'center', 600);
  text(ctx, 'Night falls on the last lantern. The gloom horde marches down the road', 640, 268, 17, '#e8f2ec', 'center', 500);
  text(ctx, 'to snuff it out. Build ember turrets, frost spires and spark coils,', 640, 292, 17, '#e8f2ec', 'center', 500);
  text(ctx, 'and hold the light through all 12 waves.', 640, 316, 17, '#e8f2ec', 'center', 500);
  text(ctx, 'MOUSE  build & select towers      1 / 2 / 3  choose a tower      SPACE  send a wave', 640, 372, 15, '#ffd97a', 'center', 600);
  text(ctx, 'U upgrade · X sell · P pause · M mute · R restart', 640, 398, 15, '#ffd97a', 'center', 600);
  if (game.best > 0) text(ctx, `Best score: ${game.best}`, 640, 442, 15, '#9fb8a8', 'center', 600);
  const pulse = 0.7 + 0.3 * Math.sin(game.time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK OR PRESS SPACE TO BEGIN', 640, 500, 22, '#ffffff', 'center', 800);
  ctx.globalAlpha = 1;
}

function drawEnd(ctx, game, won) {
  dim(ctx);
  text(ctx, won ? 'THE LANTERN STILL BURNS' : 'THE LIGHT GOES OUT', 640, 170, 44, won ? '#ffd97a' : '#ff7a7a', 'center', 800);
  text(ctx, won ? 'All 12 waves broken. Dawn belongs to Emberhold.' : `The horde broke through on wave ${Math.max(1, game.wave)}.`, 640, 216, 18, '#e8f2ec', 'center', 500);
  const rows = [
    ['Score', String(game.score)],
    ['Best score', String(Math.max(game.best, game.score))],
    ['Waves cleared', `${won ? TOTAL_WAVES : Math.max(0, game.wave - (game.state === 'defeat' ? 1 : 0))} / ${TOTAL_WAVES}`],
    ['Foes banished', String(game.kills)],
    ['Gold earned', `${game.stats.earned}g`],
    ['Towers built', String(game.stats.built)],
  ];
  rows.forEach(([label, value], i) => {
    const y = 268 + i * 30;
    text(ctx, label, 520, y, 16, '#9fb8a8', 'left', 500);
    text(ctx, value, 760, y, 16, '#ffe9a8', 'right', 700);
  });
  const pulse = 0.7 + 0.3 * Math.sin(game.time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS SPACE OR CLICK TO PLAY AGAIN', 640, 500, 20, '#ffffff', 'center', 800);
  ctx.globalAlpha = 1;
}

function drawPaused(ctx) {
  dim(ctx);
  text(ctx, 'PAUSED', 640, 330, 48, '#e8f2ec', 'center', 800);
  text(ctx, 'Press P or click ❚❚ to keep playing', 640, 380, 16, '#9fb8a8', 'center', 500);
}
