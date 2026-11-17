// combat-resolver.js — damage: how an attack's number is computed
// from height, terrain and combo, and how damage is applied.
import { manhattan } from './grid-board.js';
import { attackCombo, terrainAt } from './terrain-rules.js';
import { addFloat, addLog, addScore, showCombo } from './campaign-state.js';

// Full damage number for `attacker` hitting `target`.
export function damageFor(state, attacker, target) {
  let dmg = attacker.dmg;
  let combo = attackCombo(state, attacker, target);
  if (combo) dmg += combo.bonus;
  if (attacker.longShot) dmg += 2;
  return { dmg, combo };
}

export function inAttackRange(state, attacker, target) {
  let range = attacker.range;
  if (terrainAt(state, attacker.x, attacker.y) === 'high') range += 1;
  if (attacker.longShot) range = 5;
  return manhattan(attacker.x, attacker.y, target.x, target.y) <= range
    && manhattan(attacker.x, attacker.y, target.x, target.y) >= 1;
}

// Resolve one attack. Returns the damage dealt.
export function attackUnit(state, attacker, target) {
  const { dmg, combo } = damageFor(state, attacker, target);
  if (combo) showCombo(state, combo.name, dmg);
  dealDamage(state, target, dmg, attacker);
  if (combo && combo.push) {
    // Wind shoves the target one tile sideways to the attack line.
    const dx = Math.sign(target.x - attacker.x), dy = Math.sign(target.y - attacker.y);
    pushUnit(state, target, dy, dx);
  }
  // Stormlord's rule: struck from low ground, he strikes back once.
  if (target.alive && target.captainId === 'stormlord' && terrainAt(state, attacker.x, attacker.y) !== 'high') {
    dealDamage(state, attacker, target.dmg, target);
    addLog(state, 'Stormlord strikes back!');
  }
  attacker.acted = true;
  attacker.longShot = false;
  return dmg;
}

export function dealDamage(state, target, dmg, source) {
  if (target.planted) dmg = Math.max(1, Math.floor(dmg / 2));
  target.hp -= dmg;
  addFloat(state, target.x, target.y, '-' + dmg, '#f87171');
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    if (target.kind === 'captain' || target.captainId) {
      addScore(state, 150, 'captain routed');
      addLog(state, (target.name || 'Captain') + ' falls! +150');
    } else if (state.enemies.includes(target)) {
      addScore(state, 25, 'enemy routed');
      addLog(state, (target.name || 'Enemy') + ' routed. +25');
    } else if (target.name) {
      addLog(state, target.name + ' falls!');
    } else {
      addLog(state, 'A wagon is destroyed!');
    }
  }
  return dmg;
}

// Shove `unit` one tile sideways (wind) or in the shove direction.
export function pushUnit(state, unit, dx, dy) {
  const nx = unit.x + (dx || 0), ny = unit.y + (dy || 0);
  if (nx < 0 || nx >= 12 || ny < 0 || ny >= 8) return false;
  for (const u of [...state.wardens, ...state.enemies, ...state.wagons]) {
    if (u !== unit && u.x === nx && u.y === ny && u.hp > 0) return false;
  }
  unit.prevX = unit.x; unit.prevY = unit.y;
  unit.x = nx; unit.y = ny;
  return true;
}
