// board-renderer.js — drawing the board: tiles, terrain, units,
// wagons, telegraphs, damage numbers, combo names.
import { BOARD_X, BOARD_Y, COLS, ROWS, TILE, tileCenter } from './grid-board.js';
import { TERRAINS, terrainAt } from './terrain-rules.js';
import { PALETTE } from './interface-renderer.js';

export function drawBoard(ctx, state) {
  ctx.fillStyle = '#141c2c';
  ctx.fillRect(0, 56, 880, 564);
  // Tiles.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = terrainAt(state, x, y);
      const def = TERRAINS[t];
      const px = BOARD_X + x * TILE, py = BOARD_Y + y * TILE;
      ctx.fillStyle = def.color;
      ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = def.edge;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      if (t === 'high') ctx.fillText('HIGH', px + 6, py + 16);
      if (t === 'thorn') { ctx.fillText('THORN', px + 6, py + 16); drawThorn(ctx, px, py); }
      if (t === 'ice') ctx.fillText('ICE', px + 6, py + 16);
      if (t === 'mud') ctx.fillText('MUD', px + 6, py + 16);
      if (t === 'wind') { ctx.fillText('WIND', px + 6, py + 16); drawWind(ctx, px, py); }
      if (y === 3) { ctx.fillStyle = '#d9a441'; ctx.fillText('ROAD', px + 6, py + 16); }
    }
  }
  // Far gate at the right end of the road.
  const gate = tileCenter(11, 3);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GATE', gate.px, gate.py - 24);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 4;
  ctx.strokeRect(gate.px - 26, gate.py - 20, 52, 44);
  // Move-range highlight.
  if (state.selected) {
    ctx.fillStyle = 'rgba(251,191,36,0.35)';
    for (const t of state.moveTiles) {
      ctx.fillRect(BOARD_X + t.x * TILE + 4, BOARD_Y + t.y * TILE + 4, TILE - 8, TILE - 8);
    }
  }
  // Enemies the selected warden can hit get a red ring.
  const sel = state.wardens.find(w => w.id === state.selected);
  if (sel && sel.alive && !sel.acted) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      let range = sel.range;
      if (terrainAt(state, sel.x, sel.y) === 'high') range += 1;
      if (sel.longShot) range = 5;
      const d = Math.abs(e.x - sel.x) + Math.abs(e.y - sel.y);
      if (d >= 1 && d <= range) {
        const c = tileCenter(e.x, e.y);
        ctx.beginPath();
        ctx.arc(c.px, c.py, 32, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  // Cursor for keyboard play.
  const cur = tileCenter(state.cursor.x, state.cursor.y);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(cur.px - 30, cur.py - 30, 60, 60);
  // Wagons.
  for (const w of state.wagons) drawWagon(ctx, w);
  // Enemies with telegraphs: draw the dashed lines first, then the
  // labels in one de-collided pass so no two labels ever overlap.
  const labelBoxes = [];
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const box = drawTelegraphLine(ctx, state, e);
    if (box) labelBoxes.push(box);
    drawUnit(ctx, e);
  }
  drawIntentLabels(ctx, labelBoxes);
  // Wardens on top.
  for (const w of state.wardens) {
    if (!w.alive) continue;
    drawUnit(ctx, w);
  }
  // Damage floats.
  ctx.textAlign = 'center';
  for (const f of state.floats) {
    const c = tileCenter(f.x, f.y);
    ctx.globalAlpha = Math.min(1, f.t / 30);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(f.text, c.px, c.py - 34 - (90 - f.t) / 3);
    ctx.globalAlpha = 1;
  }
}

function drawThorn(ctx, px, py) {
  ctx.strokeStyle = '#1d4a22';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(px + 10 + i * 20, py + TILE - 8);
    ctx.lineTo(px + 20 + i * 20, py + 22);
    ctx.lineTo(px + 30 + i * 20, py + TILE - 8);
    ctx.stroke();
  }
}

function drawWind(ctx, px, py) {
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 28 + i * 16);
    ctx.lineTo(px + TILE - 14, py + 28 + i * 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + TILE - 14, py + 28 + i * 16);
    ctx.lineTo(px + TILE - 24, py + 20 + i * 16);
    ctx.lineTo(px + TILE - 24, py + 36 + i * 16);
    ctx.closePath();
    ctx.fillStyle = '#4f46e5';
    ctx.fill();
  }
}

function drawWagon(ctx, w) {
  const c = tileCenter(w.x, w.y);
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.roundRect(c.px - 28, c.py - 14, 56, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(c.px - 18, c.py + 16, 7, 0, Math.PI * 2);
  ctx.arc(c.px + 18, c.py + 16, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  // Short label on a dark pill, clamped inside the board so the leftmost
  // wagon is never cut by the board edge and neighbours never overlap.
  const label = 'WGN ' + w.hp + '/' + w.maxHp;
  const lw = ctx.measureText(label).width + 10;
  const lx = Math.max(BOARD_X + lw / 2 + 2, Math.min(BOARD_X + COLS * TILE - lw / 2 - 2, c.px));
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.beginPath();
  ctx.roundRect(lx - lw / 2, c.py - 34, lw, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.fillText(label, lx, c.py - 22);
  ctx.fillStyle = '#374151';
  ctx.fillRect(c.px - 24, c.py + 24, 48, 5);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(c.px - 24, c.py + 24, 48 * Math.max(0, w.hp) / w.maxHp, 5);
}

function drawUnit(ctx, u) {
  const c = tileCenter(u.x, u.y);
  const isCaptain = u.kind === 'captain';
  const r = isCaptain ? 30 : 24;
  // Body: distinct silhouette per kind.
  ctx.fillStyle = u.color;
  ctx.beginPath();
  if (u.glyph === '▲') { ctx.moveTo(c.px, c.py - r); ctx.lineTo(c.px + r, c.py + r); ctx.lineTo(c.px - r, c.py + r); }
  else if (u.glyph === '◆') { ctx.moveTo(c.px, c.py - r); ctx.lineTo(c.px + r, c.py); ctx.lineTo(c.px, c.py + r); ctx.lineTo(c.px - r, c.py); }
  else if (u.glyph === '●' || u.glyph === '✦') { ctx.arc(c.px, c.py, r, 0, Math.PI * 2); }
  else if (u.glyph === '♛') { ctx.moveTo(c.px - r, c.py + r); ctx.lineTo(c.px - r, c.py - r + 8); ctx.lineTo(c.px, c.py - r - 6); ctx.lineTo(c.px + r, c.py - r + 8); ctx.lineTo(c.px + r, c.py + r); }
  else { ctx.arc(c.px, c.py, r, 0, Math.PI * 2); }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(u.glyph, c.px, c.py + 7);
  // Health bar.
  const w = isCaptain ? 60 : 44;
  ctx.fillStyle = '#111827';
  ctx.fillRect(c.px - w / 2, c.py + r + 2, w, 6);
  ctx.fillStyle = u.kind === 'captain' || u.color === '#dc2626' ? '#ef4444' : '#22c55e';
  if (u.id && u.id.startsWith('cap')) ctx.fillStyle = '#f59e0b';
  ctx.fillRect(c.px - w / 2, c.py + r + 2, w * Math.max(0, u.hp) / u.maxHp, 6);
  if (isCaptain) {
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(u.name.toUpperCase(), c.px, c.py - r - 8);
  }
  if (u.planted) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.strokeRect(c.px - r - 4, c.py - r - 4, (r + 4) * 2, (r + 4) * 2);
  }
}

function drawTelegraphLine(ctx, state, e) {
  const it = state.intents.find(i => i.id === e.id);
  if (!it || !it.target) return null;
  const from = tileCenter(e.x, e.y);
  const to = tileCenter(it.target.x, it.target.y);
  ctx.strokeStyle = 'rgba(220,38,38,0.85)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(from.px, from.py);
  ctx.lineTo(to.px, to.py);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = 'bold 12px sans-serif';
  const w = ctx.measureText(it.label).width + 12;
  // Anchor the label a third of the way from the enemy toward its
  // target (not at the midpoint), so the pill sits beside the attacker
  // instead of on top of the wagon or warden being threatened.
  return { label: it.label, x: from.px + (to.px - from.px) * 0.35, y: from.py + (to.py - from.py) * 0.35 - 14, w, h: 18 };
}

// Draw intent labels on dark pills, pushing overlapping labels apart
// vertically (and clamping them inside the board) before drawing any.
function drawIntentLabels(ctx, boxes) {
  if (!boxes.length) return;
  const left = BOARD_X + 4, right = BOARD_X + COLS * TILE - 4;
  const top = BOARD_Y + 10, bottom = BOARD_Y + ROWS * TILE - 8;
  for (const b of boxes) {
    b.x = Math.max(left + b.w / 2, Math.min(right - b.w / 2, b.x));
    b.y = Math.max(top + b.h / 2, Math.min(bottom - b.h / 2, b.y));
  }
  // Sort by row, then push any label whose pill overlaps the previous
  // one's pill down (or up, when the board bottom leaves no room).
  boxes.sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 1; i < boxes.length; i++) {
    const p = boxes[i - 1], b = boxes[i];
    const overlapX = Math.abs(b.x - p.x) < (b.w + p.w) / 2;
    if (overlapX && b.y - p.y < 20) {
      b.y = p.y + 20;
      if (b.y + b.h / 2 > bottom) { b.y = p.y - 20; p.y = Math.max(top + p.h / 2, p.y); }
    }
  }
  // A second sweep catches chains pushed into a neighbour below.
  for (let i = boxes.length - 1; i >= 1; i--) {
    const p = boxes[i - 1], b = boxes[i];
    const overlapX = Math.abs(b.x - p.x) < (b.w + p.w) / 2;
    if (overlapX && b.y - p.y < 20 && b.y - 20 >= top + b.h / 2) b.y = p.y + 20;
  }
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  for (const b of boxes) {
    ctx.fillStyle = 'rgba(127,29,29,0.92)';
    ctx.beginPath();
    ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b.label, b.x, b.y + 4);
  }
}
