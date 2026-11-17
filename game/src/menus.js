// menus.js — every screen that is not the board: title, briefing,
// pause, pass results, victory, defeat. Also exports the button
// rectangles the input layer hit-tests against.
import { PALETTE } from './interface-renderer.js';

export function menuButtonRects(screen) {
  if (screen === 'title') return { start: { x: 490, y: 520, w: 300, h: 64 }, mute: { x: 490, y: 600, w: 300, h: 44 } };
  if (screen === 'briefing') return { start: { x: 490, y: 520, w: 300, h: 64 } };
  if (screen === 'pause') return {
    resume: { x: 490, y: 300, w: 300, h: 56 }, restart: { x: 490, y: 370, w: 300, h: 56 },
    mute: { x: 490, y: 440, w: 300, h: 56 }, quit: { x: 490, y: 510, w: 300, h: 56 },
  };
  if (screen === 'results') return {
    up0: { x: 190, y: 420, w: 280, h: 96 }, up1: { x: 500, y: 420, w: 280, h: 96 },
    up2: { x: 810, y: 420, w: 280, h: 96 }, cont: { x: 490, y: 560, w: 300, h: 64 },
  };
  if (screen === 'victory') return { again: { x: 490, y: 520, w: 300, h: 64 } };
  if (screen === 'defeat') return { retry: { x: 490, y: 480, w: 300, h: 64 }, again: { x: 490, y: 560, w: 300, h: 44 } };
  return {};
}

// Word-wrap `text` to lines of at most `maxChars` characters.
function wrapLines(text, maxChars) {
  const words = text.split(' ');
  const lines = [''];
  for (const w of words) {
    if ((lines[lines.length - 1] + ' ' + w).trim().length > maxChars) lines.push(w);
    else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim();
  }
  return lines;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(15,23,42,0.94)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function bigButton(ctx, r, label, enabled) {
  ctx.fillStyle = enabled === false ? '#374151' : '#b45309';
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.fillStyle = '#fff7ed';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 8);
}

function duskScene(ctx) {
  // Mountain dusk backdrop: slate sky, layered ridges, far gate, caravan.
  ctx.fillStyle = '#1b2436';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(1020, 150, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c3a52';
  ctx.beginPath();
  ctx.moveTo(0, 520); ctx.lineTo(220, 260); ctx.lineTo(430, 520); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#232f45';
  ctx.beginPath();
  ctx.moveTo(300, 560); ctx.lineTo(640, 220); ctx.lineTo(980, 560); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3b4a63';
  ctx.beginPath();
  ctx.moveTo(700, 560); ctx.lineTo(1050, 300); ctx.lineTo(1280, 560); ctx.closePath();
  ctx.fill();
  // Caravan silhouette on the road.
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 560, 1280, 160);
  for (let i = 0; i < 4; i++) {
    const x = 420 + i * 120;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(x, 650, 84, 44, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 20, 700, 10, 0, Math.PI * 2);
    ctx.arc(x + 64, 700, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE FAR GATE', 1080, 460);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 4;
  ctx.strokeRect(1030, 470, 100, 70);
}

export function drawTitle(ctx, state) {
  duskScene(ctx);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 84px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THORNPASS', 640, 150);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Hold the mountain pass. The terrain is the weapon.', 640, 196);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Four wardens. Four wagons. Five passes. Best score: ' + state.best, 640, 232);
  panel(ctx, 340, 270, 600, 210);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HOW TO PLAY', 370, 304);
  ctx.font = '16px sans-serif';
  const lines = [
    'Click a warden, then a lit tile to move. Click an enemy in range to attack.',
    'Keys 1–4 use abilities. Arrow keys move the cursor, Enter selects, Space ends turn.',
    'High ground +2 damage. Thorns wound. Ice slides. Mud holds. Wind pushes.',
    'WIN: get a wagon to the far gate. LOSE: all wagons destroyed or all wardens fall.',
  ];
  lines.forEach((l, i) => ctx.fillText('•  ' + l, 370, 334 + i * 30));
  const b = menuButtonRects('title');
  bigButton(ctx, b.start, 'START THE CROSSING');
  bigButton(ctx, b.mute, state.muted ? 'SOUND: OFF' : 'SOUND: ON');
}

export function drawBriefing(ctx, state) {
  duskScene(ctx);
  panel(ctx, 290, 150, 700, 340);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PASS ' + state.pass + ' — ' + state.passName.toUpperCase(), 640, 220);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px sans-serif';
  ctx.fillText(state.passRule, 640, 270);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Escort the wagons to the far gate. Captain: ' + (state.captain ? state.captain.name + ' — ' + state.captain.title : 'none'), 640, 310);
  ctx.fillText('Retries left for the whole campaign: ' + state.retries, 640, 344);
  ctx.fillText('Enemies this pass: ' + state.enemies.filter(e => e.alive).length + '  ·  Wagons: 4', 640, 378);
  ctx.fillText('WIN: a wagon reaches the gate. LOSE: all wagons or all wardens fall.', 640, 412);
  bigButton(ctx, menuButtonRects('briefing').start, 'BEGIN PASS ' + state.pass);
}

export function drawPause(ctx, state) {
  ctx.fillStyle = 'rgba(15,23,42,0.8)';
  ctx.fillRect(0, 0, 1280, 720);
  panel(ctx, 390, 140, 500, 460);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', 640, 210);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '17px sans-serif';
  ctx.fillText('Click a warden, lit tile to move, enemy in range to attack.', 640, 252);
  ctx.fillText('Keys 1–4 abilities · Space end turn · Esc resume · M mute', 640, 282);
  const b = menuButtonRects('pause');
  bigButton(ctx, b.resume, 'RESUME');
  bigButton(ctx, b.restart, 'RESTART PASS');
  bigButton(ctx, b.mute, state.muted ? 'SOUND: OFF' : 'SOUND: ON');
  bigButton(ctx, b.quit, 'QUIT TO TITLE');
}

export function drawResults(ctx, state) {
  duskScene(ctx);
  panel(ctx, 140, 90, 1000, 500);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PASS ' + state.pass + ' CROSSED!', 640, 160);
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('★'.repeat(state.stars) + '☆'.repeat(3 - state.stars), 640, 220);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px sans-serif';
  const b = state.breakdown || { wagons: 0, enemies: 0, combos: 0, wardens: 0, passScore: 0 };
  ctx.fillText('Wagons saved: ' + b.wagons + ' × 100    Enemies routed: ' + b.enemies + ' × 25', 640, 268);
  ctx.fillText('Combos fired: ' + b.combos + ' × 15    Wardens alive: ' + b.wardens + ' × 25    Pass bonus: 200', 640, 300);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Pass score: ' + b.passScore + '   ·   Total score: ' + state.score + '   ·   Best: ' + state.best, 640, 340);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('CHOOSE ONE UPGRADE', 640, 392);
  const r = menuButtonRects('results');
  const rects = [r.up0, r.up1, r.up2];
  state.upgradeChoices.forEach((u, i) => {
    ctx.fillStyle = state.upgradePicked === i ? '#b45309' : '#2c3a52';
    ctx.beginPath();
    ctx.roundRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.stroke();
    ctx.fillStyle = '#fff7ed';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(u.name, rects[i].x + rects[i].w / 2, rects[i].y + 32);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px sans-serif';
    wrapLines(u.desc, 32).forEach((line, j) => ctx.fillText(line, rects[i].x + rects[i].w / 2, rects[i].y + 58 + j * 18));
  });
  bigButton(ctx, r.cont, 'CONTINUE', state.upgradePicked !== undefined && state.upgradePicked !== null);
}

export function drawVictory(ctx, state) {
  duskScene(ctx);
  panel(ctx, 290, 120, 700, 460);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE PASS IS HELD!', 640, 200);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '22px sans-serif';
  ctx.fillText('All five passes crossed. The caravan is through.', 640, 250);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Final score: ' + state.score + '   ·   Best: ' + state.best, 640, 300);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#4ade80';
  ctx.fillText('✓ Thornroad   ✓ Highgate   ✓ Icehold   ✓ Windcut   ✓ Stormpass', 640, 350);
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Wagons saved across the campaign: ' + (state.campaignWagonsSaved || 0), 640, 390);
  bigButton(ctx, menuButtonRects('victory').again, 'PLAY AGAIN');
}

export function drawDefeat(ctx, state) {
  duskScene(ctx);
  panel(ctx, 290, 120, 700, 480);
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE PASS IS LOST', 640, 200);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px sans-serif';
  ctx.fillText(state.loseReason || 'The caravan did not make it.', 640, 250);
  ctx.fillText('Pass reached: ' + state.pass + ' — ' + state.passName + '   ·   Score: ' + state.score + '   ·   Best: ' + state.best, 640, 290);
  ctx.fillText('Retries left: ' + state.retries, 640, 330);
  const b = menuButtonRects('defeat');
  bigButton(ctx, b.retry, state.retries > 0 ? 'RETRY THIS PASS (' + state.retries + ' LEFT)' : 'NO RETRIES LEFT', state.retries > 0);
  bigButton(ctx, b.again, 'PLAY AGAIN FROM PASS 1');
}
