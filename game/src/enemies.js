// enemies.js — the five enemy kinds and their movement and attack
// rules, including the telegraph each enemy shows before it acts.
import { manhattan, inBounds } from './grid-board.js';
import { unitAt } from './terrain-rules.js';

export const ENEMY_DEFS = {
  charger:  { name: 'Charger',  hp: 8,  move: 3, range: 1, dmg: 3, color: '#dc2626', glyph: '▲', rule: 'Runs straight at the nearest wagon.' },
  stalker:  { name: 'Stalker',  hp: 7,  move: 3, range: 1, dmg: 3, color: '#b45309', glyph: '◆', rule: 'Hunts the weakest warden.' },
  spitter:  { name: 'Spitter',  hp: 6,  move: 1, range: 3, dmg: 2, color: '#7c3aed', glyph: '●', rule: 'Shoots from range, never moves closer.' },
  burrower: { name: 'Burrower', hp: 9,  move: 2, range: 1, dmg: 4, color: '#92400e', glyph: '✦', rule: 'Surfaces under a telegraphed tile.' },
};

let enemySeq = 0;

export function createEnemy(kind, x, y) {
  const d = ENEMY_DEFS[kind];
  enemySeq += 1;
  return {
    id: 'e' + enemySeq, kind, name: d.name, x, y, prevX: x, prevY: y,
    hp: d.hp, maxHp: d.hp, move: d.move, range: d.range, dmg: d.dmg,
    color: d.color, glyph: d.glyph, alive: true, surfacing: null,
  };
}

// Where this enemy will go and what it will hit: shown as a telegraph
// during the player phase, resolved in the enemy phase.
export function enemyIntent(state, e) {
  const wagons = state.wagons;
  const wardens = state.wardens.filter(w => w.alive);
  if (e.kind === 'spitter') {
    const t = nearestUnit(e, [...wardens, ...wagons]);
    return { tx: e.x, ty: e.y, target: t, label: t ? 'SPIT ' + targetName(t) : 'AIM' };
  }
  if (e.kind === 'burrower') {
    if (e.surfacing) return { tx: e.surfacing.x, ty: e.surfacing.y, target: null, label: 'SURFACE!' };
    const t = nearestUnit(e, [...wardens, ...wagons]);
    if (!t) return { tx: e.x, ty: e.y, target: null, label: 'BURROW' };
    return { tx: t.x, ty: t.y, target: t, label: 'DIG ' + targetName(t) };
  }
  if (e.kind === 'stalker') {
    const t = wardens.slice().sort((a, b) => a.hp - b.hp)[0] || wagons[0];
    return { tx: t ? t.x : e.x, ty: t ? t.y : e.y, target: t || null, label: t ? 'HUNT ' + targetName(t) : 'HUNT' };
  }
  // charger: nearest wagon
  const t = nearestUnit(e, wagons) || wardens[0];
  return { tx: t ? t.x : e.x, ty: t ? t.y : e.y, target: t || null, label: t ? 'CHARGE ' + targetName(t) : 'CHARGE' };
}

export function targetName(u) {
  return u.name || 'Wagon';
}

function nearestUnit(e, units) {
  let best = null, bestD = 99;
  for (const u of units) {
    if (u.alive === false || u.hp <= 0) continue;
    const d = manhattan(e.x, e.y, u.x, u.y);
    if (d < bestD) { bestD = d; best = u; }
  }
  return best;
}

// Step one tile toward (tx, ty) if the tile is free.
export function stepToward(state, e, tx, ty) {
  const dx = Math.sign(tx - e.x), dy = Math.sign(ty - e.y);
  const options = [];
  if (dx) options.push([e.x + dx, e.y]);
  if (dy) options.push([e.x, e.y + dy]);
  if (!dx) options.push([e.x + 1, e.y], [e.x - 1, e.y]);
  if (!dy) options.push([e.x, e.y + 1], [e.x, e.y - 1]);
  for (const [nx, ny] of options) {
    if (inBounds(nx, ny) && !unitAt(state, nx, ny)) {
      e.prevX = e.x; e.prevY = e.y; e.x = nx; e.y = ny;
      return true;
    }
  }
  return false;
}
