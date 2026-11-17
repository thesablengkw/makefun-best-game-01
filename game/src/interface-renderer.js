// interface-renderer.js — the heads-up display: top bar, bottom bar,
// side panel, event line, ability buttons. Also exports the button
// rectangles the input layer hit-tests against.
export const PALETTE = {
  slate: '#1b2436', stone: '#6b7280', amber: '#f59e0b', gold: '#fbbf24',
  thorn: '#3f7a44', ice: '#dbeafe', rust: '#dc2626', ink: '#0f172a',
  panel: '#232f45', line: '#3b4a63', text: '#e5e7eb', dim: '#9ca3af',
};

export function abilityButtonRect(i) {
  return { x: 220 + i * 150, y: 648, w: 140, h: 56 };
}

export function endTurnRect() {
  return { x: 840, y: 648, w: 130, h: 56 };
}

export function muteRect() {
  return { x: 1180, y: 10, w: 80, h: 36 };
}

// Shorten `text` so it fits `maxW` px at the current font, cutting only at
// a word boundary and marking the cut with a real ellipsis — never mid-word.
export function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  const words = text.split(' ');
  let out = '';
  for (const w of words) {
    const next = out ? out + ' ' + w : w;
    if (ctx.measureText(next + ' …').width > maxW) break;
    out = next;
  }
  return (out || words[0].slice(0, 8)) + ' …';
}

function button(ctx, r, label, sub, enabled) {
  ctx.fillStyle = enabled === false ? '#374151' : '#2c3a52';
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = enabled === false ? PALETTE.dim : PALETTE.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, r.x + r.w / 2, r.y + (sub ? 22 : 34));
  if (sub) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(sub, r.x + r.w / 2, r.y + 42);
  }
}

export function drawTopBar(ctx, state) {
  ctx.fillStyle = PALETTE.slate;
  ctx.fillRect(0, 0, 1280, 56);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THORNPASS  ·  Pass ' + state.pass + ' ' + state.passName, 16, 34);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Turn ' + state.turn + '  ·  ' + (state.phase === 'player' ? 'YOUR PHASE' : 'ENEMY PHASE'), 420, 33);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Wagons ' + state.wagons.length + '   Score ' + state.score + '   Best ' + state.best, 1160, 33);
  button(ctx, muteRect(), state.muted ? 'UNMUTE' : 'MUTE', '', true);
}

export function drawBottomBar(ctx, state) {
  ctx.fillStyle = PALETTE.slate;
  ctx.fillRect(0, 620, 1280, 100);
  // Warden portraits with health.
  state.wardens.forEach((w, i) => {
    const x = 16 + i * 52;
    ctx.fillStyle = w.alive ? w.color : '#374151';
    ctx.beginPath();
    ctx.roundRect(x, 632, 44, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(w.glyph, x + 22, 664);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '10px sans-serif';
    ctx.fillText(w.name, x + 22, 688);
    ctx.fillStyle = w.alive ? '#4ade80' : '#f87171';
    ctx.fillText(Math.max(0, w.hp) + '/' + w.maxHp, x + 22, 702);
    if (state.selected === w.id) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, 630, 48, 48);
    }
  });
  // Ability buttons for the selected warden.
  const sel = state.wardens.find(w => w.id === state.selected);
  if (sel && sel.alive) {
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(sel.name + ' — ' + sel.role + (state.held.has(sel.id) ? '  ·  HELD IN MUD' : ''), 220, 640);
    button(ctx, abilityButtonRect(0), sel.ability.name, 'key ' + sel.ability.key + (sel.cdLeft > 0 ? ' · ' + sel.cdLeft + ' turns' : ' · ready'), sel.cdLeft === 0 && !sel.acted);
  } else {
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Click a warden to select it. Click a lit tile to move. Click an enemy in range to attack.', 220, 640);
  }
  button(ctx, endTurnRect(), 'END TURN', 'Space', state.phase === 'player');
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Retries left: ' + state.retries + '  ·  Esc pauses  ·  M mutes', 990, 700);
}

export function drawSidePanel(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(880, 56, 400, 564);
  ctx.strokeStyle = PALETTE.line;
  ctx.strokeRect(880, 56, 400, 564);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WIN: get a wagon to the far gate', 896, 92);
  ctx.fillStyle = '#fca5a5';
  ctx.font = '15px sans-serif';
  ctx.fillText('LOSE: all wagons destroyed, or', 896, 118);
  ctx.fillText('all four wardens fall.', 896, 140);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '15px sans-serif';
  ctx.fillText('Wagons to gate: ' + (state.wagons.length ? (11 - Math.max(...state.wagons.map(w => w.x))) + ' tiles' : '—'), 896, 172);
  ctx.fillText('Enemies left: ' + state.enemies.filter(e => e.alive).length, 896, 196);
  if (state.captain && state.captain.alive) {
    const c = state.captain;
    ctx.fillStyle = c.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(fitText(ctx, 'CAPTAIN: ' + c.name + ' — ' + c.title, 368), 896, 232);
    ctx.fillStyle = '#374151';
    ctx.fillRect(896, 242, 360, 14);
    ctx.fillStyle = PALETTE.rust;
    ctx.fillRect(896, 242, 360 * Math.max(0, c.hp) / c.maxHp, 14);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '13px sans-serif';
    ctx.fillText(fitText(ctx, c.hp + '/' + c.maxHp + ' HP — ' + c.rule, 368), 896, 276);
  }
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('HOW TO WIN THIS PASS', 896, 312);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '14px sans-serif';
  const tips = ['High ground: +2 damage, +1 range.', 'Thorns wound anything ending inside.', 'Ice slides you one extra tile.', 'Mud holds a unit a turn.', 'Wind pushes attacks sideways.'];
  tips.forEach((t, i) => ctx.fillText('• ' + t, 896, 338 + i * 22));
  // Event line: last three things that happened, fitted to the panel
  // width at a word boundary — never cut mid-word at the panel edge.
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('WHAT HAPPENED', 896, 470);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '14px sans-serif';
  state.log.forEach((l, i) => ctx.fillText('• ' + fitText(ctx, l, 360), 896, 494 + i * 22));
}

export function drawComboBanner(ctx, state) {
  const b = state.comboBanner;
  if (!b) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, b.t / 40);
  ctx.fillStyle = 'rgba(15,23,42,0.82)';
  ctx.fillRect(180, 250, 560, 84);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(180, 250, 560, 84);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(b.text, 460, 300);
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(b.dmg > 0 ? '-' + b.dmg + ' damage' : 'combo!', 460, 326);
  ctx.restore();
}
