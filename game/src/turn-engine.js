// turn-engine.js — turn order: player phase, enemy phase,
// end-of-turn resolution, win and lose checks.
import { manhattan } from './grid-board.js';
import { enterTerrain, terrainAt, unitAt } from './terrain-rules.js';
import { enemyIntent, stepToward, createEnemy } from './enemies.js';
import { captainRule } from './captains.js';
import { attackUnit, dealDamage, inAttackRange } from './combat-resolver.js';
import { resetWardenTurn } from './wardens.js';
import { addLog, addScore, setScreen, showCombo } from './campaign-state.js';
import { rollUpgrades } from './campaign-passes.js';
import { saveBest } from './save-keeper.js';

// Recompute every enemy's telegraph for the current player phase.
export function computeIntents(state) {
  state.intents = state.enemies.filter(e => e.alive).map(e => {
    const it = enemyIntent(state, e);
    return { id: e.id, ...it };
  });
}

// Move a warden to (x, y): terrain effects apply, combos may fire.
export function moveWarden(state, w, x, y) {
  if (w.moved || state.held.has(w.id)) return false;
  w.prevX = w.x; w.prevY = w.y;
  w.x = x; w.y = y;
  w.moved = true;
  const combo = enterTerrain(state, w, x, y);
  if (combo) showCombo(state, combo.name, combo.bonus || 0);
  if (w.hp <= 0) { w.alive = false; addLog(state, w.name + ' is wounded by the ground!'); }
  computeIntents(state);
  return true;
}

// Use the selected warden's ability. `tx, ty` is the target tile.
export function useAbility(state, w, tx, ty) {
  if (w.acted || w.cdLeft > 0) return false;
  const a = w.ability;
  if (w.id === 'bram') {
    w.planted = true; w.acted = true; w.cdLeft = a.cd;
    addLog(state, 'Bram plants his shield. Half damage, blocks the road.');
    return true;
  }
  if (w.id === 'sera') {
    w.longShot = true; w.acted = true; w.cdLeft = a.cd;
    addLog(state, 'Sera takes aim — next shot reaches range 5 for +2.');
    return true;
  }
  if (w.id === 'pike') {
    if (unitAt(state, tx, ty) || state.terrain[ty][tx] !== 'stone') return false;
    state.terrain[ty][tx] = 'thorn';
    w.acted = true; w.cdLeft = a.cd;
    addLog(state, 'Pike lays a thorn trap.');
    return true;
  }
  if (w.id === 'runa') {
    const e = state.enemies.find(e => e.alive && e.x === tx && e.y === ty);
    if (!e || manhattan(w.x, w.y, tx, ty) > 2) return false;
    const dx = Math.sign(tx - w.x), dy = Math.sign(ty - w.y);
    const nx = tx + dx, ny = ty + dy;
    if (nx < 0 || nx >= 12 || ny < 0 || ny >= 8 || unitAt(state, nx, ny)) return false;
    e.prevX = e.x; e.prevY = e.y; e.x = nx; e.y = ny;
    const landed = terrainAt(state, nx, ny);
    if (landed === 'thorn') {
      e.hp -= 3;
      showCombo(state, 'THORN AMBUSH', 3);
      if (e.hp <= 0) { e.alive = false; addScore(state, 25, 'enemy routed'); }
    } else {
      showCombo(state, 'SHOVE', 0);
    }
    w.acted = true; w.cdLeft = a.cd;
    computeIntents(state);
    return true;
  }
  return false;
}

// End the player phase: run the whole enemy phase, advance the wagons,
// then check win/lose.
export function endTurn(state) {
  if (state.screen !== 'play' || state.phase !== 'player') return;
  state.phase = 'enemy';
  addLog(state, '— Enemy phase —');
  // Captains act first.
  for (const e of state.enemies.filter(e => e.alive && e.kind === 'captain')) {
    const line = captainRule(state, e);
    if (line === 'CALL') {
      state.enemies.push(createEnemy('charger', e.x, e.y - 1));
      state.enemies.push(createEnemy('charger', e.x, e.y + 1));
      addLog(state, e.name + ' calls two chargers!');
    } else if (line) addLog(state, line);
  }
  // Each enemy moves toward its intent, then attacks if in range.
  for (const e of state.enemies.filter(e => e.alive)) {
    if (e.kind === 'burrower' && !e.surfacing) {
      const it = enemyIntent(state, e);
      if (it.target) { e.surfacing = { x: it.target.x, y: it.target.y }; addLog(state, 'A burrower will surface under ' + (it.target.name || 'a wagon') + '!'); }
      continue;
    }
    if (e.kind === 'burrower' && e.surfacing) {
      e.prevX = e.x; e.prevY = e.y;
      e.x = e.surfacing.x; e.y = e.surfacing.y; e.surfacing = null;
      const victim = [...state.wardens.filter(w => w.alive), ...state.wagons].find(u => u.x === e.x && u.y === e.y);
      if (victim) dealDamage(state, victim, e.dmg, e);
      continue;
    }
    const it = enemyIntent(state, e);
    let steps = e.move;
    while (steps-- > 0) {
      const target = it.target;
      if (!target) break;
      const d = manhattan(e.x, e.y, target.x, target.y);
      if (d <= e.range) break;
      if (!stepToward(state, e, target.x, target.y)) break;
    }
    const target = it.target;
    if (target && target.hp > 0 && manhattan(e.x, e.y, target.x, target.y) <= e.range) {
      if (e.kind === 'captain' && e.captainId === 'galequeen') {
        dealDamage(state, target, e.dmg, e);
        const dx = Math.sign(target.x - e.x) || 1;
        const nx = target.x + dx;
        if (nx >= 0 && nx < 12 && !unitAt(state, nx, target.y)) { target.x = nx; }
      } else {
        dealDamage(state, target, e.dmg, e);
      }
      if (target.hp <= 0 && state.wardens.includes(target)) addLog(state, target.name + ' falls!');
    }
    const landed = terrainAt(state, e.x, e.y);
    if (landed === 'thorn' && e.alive) {
      e.hp -= 3;
      showCombo(state, 'THORN AMBUSH', 3);
      if (e.hp <= 0) { e.alive = false; addScore(state, 25, 'enemy routed'); }
    }
    if (landed === 'mud') state.held.add(e.id);
  }
  // Wagons roll one tile toward the far gate.
  for (const w of state.wagons) { w.x += 1; w.col = w.x; }
  const saved = state.wagons.filter(w => w.x >= 11);
  for (const w of saved) { state.wagonsSaved += 1; addScore(state, 100, 'wagon saved'); }
  state.wagons = state.wagons.filter(w => w.x < 11);
  const destroyed = state.wagons.filter(w => w.hp <= 0);
  for (const w of destroyed) { state.wagonsLost += 1; addLog(state, 'A wagon is destroyed!'); }
  state.wagons = state.wagons.filter(w => w.hp > 0);
  // Reinforcements every third turn.
  if (state.turn % 3 === 0 && state.enemies.filter(e => e.alive).length < 14) {
    state.enemies.push(createEnemy('charger', 11, state.turn % 2 ? 1 : 6));
    addLog(state, 'A charger joins from the heights.');
  }
  state.turn += 1;
  state.phase = 'player';
  state.held.clear();
  for (const w of state.wardens) if (w.alive) resetWardenTurn(w);
  computeIntents(state);
  checkEnd(state);
}

export function checkEnd(state) {
  const wardensAlive = state.wardens.filter(w => w.alive).length;
  if (state.wagons.length === 0 && state.wagonsSaved === 0) return passLost(state, 'Every wagon is destroyed.');
  if (wardensAlive === 0) return passLost(state, 'Every warden has fallen.');
  if (state.wagons.length === 0 && state.wagonsSaved > 0) return passWon(state);
}

function passWon(state) {
  const alive = state.wardens.filter(w => w.alive).length;
  const passScore = state.wagonsSaved * 100 + alive * 25 + 200;
  state.passScore = passScore;
  if (alive === 4) addScore(state, 100, 'full squad bonus');
  addScore(state, 200, 'pass cleared');
  state.breakdown = {
    wagons: state.wagonsSaved, enemies: state.enemies.filter(e => !e.alive).length,
    combos: state.comboCount, wardens: alive, passScore,
  };
  state.stars = state.wagonsSaved >= 3 && alive === 4 ? 3 : state.wagonsSaved >= 2 ? 2 : 1;
  if (state.score > state.best) { state.best = state.score; saveBest(state.best); }
  rollUpgrades(state);
  setScreen(state, 'results');
  addLog(state, 'Pass ' + state.pass + ' crossed! +' + passScore);
}

function passLost(state, why) {
  addLog(state, why);
  if (state.score > state.best) { state.best = state.score; saveBest(state.best); }
  state.loseReason = why;
  setScreen(state, 'defeat');
}
