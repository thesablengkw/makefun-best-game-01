// terrain-rules.js — the ground: what each terrain does when a unit
// enters, ends or attacks from it, and how combos are detected and named.
import { inBounds } from './grid-board.js';

export const TERRAINS = {
  road:  { name: 'Road',       color: '#5d6675', edge: '#454e5e', note: 'The caravan road.' },
  stone: { name: 'Stone',      color: '#6b7280', edge: '#4b5563', note: 'Safe footing.' },
  high:  { name: 'High Ground', color: '#8a94a6', edge: '#6b7280', note: '+2 damage, +1 range from here.' },
  thorn: { name: 'Thorn Hedge', color: '#3f7a44', edge: '#2c5a30', note: 'Wounds anything that ends its move inside.' },
  ice:   { name: 'Ice Sheet',  color: '#dbeafe', edge: '#93c5fd', note: 'Slides you one extra tile.' },
  mud:   { name: 'Mud',        color: '#7a5a33', edge: '#5c4225', note: 'Holds you in place next turn.' },
  wind:  { name: 'Wind Channel', color: '#a5b4fc', edge: '#818cf8', note: 'Pushes attacks one tile sideways.' },
};

export function terrainAt(state, x, y) {
  if (!inBounds(x, y)) return 'stone';
  return state.terrain[y][x];
}

export function isPassable(state, x, y) {
  return inBounds(x, y);
}

// Resolve what happens when `unit` enters tile (x, y). Returns the combo
// that fired, if any: {name, bonus}. May slide the unit on ice.
export function enterTerrain(state, unit, x, y) {
  const t = terrainAt(state, x, y);
  if (t === 'ice') {
    // Slide one extra tile in the same direction the unit came from.
    const dx = Math.sign(x - unit.prevX);
    const dy = Math.sign(y - unit.prevY);
    const nx = x + dx, ny = y + dy;
    if ((dx || dy) && inBounds(nx, ny) && !unitAt(state, nx, ny)) {
      unit.x = nx; unit.y = ny;
      const landed = terrainAt(state, nx, ny);
      if (landed === 'thorn') return thornHit(state, unit, 'ICE SLIDE');
      if (landed === 'mud') state.held.add(unit.id);
      return { name: 'ICE SLIDE', bonus: 0 };
    }
    // No room to slide: entering ice alone is not a combo.
    return null;
  }
  if (t === 'thorn') return thornHit(state, unit, 'THORN AMBUSH');
  if (t === 'mud') state.held.add(unit.id);
  return null;
}

function thornHit(state, unit, name) {
  unit.hp -= 3;
  return { name, bonus: 3 };
}

export function unitAt(state, x, y) {
  for (const w of state.wardens) if (w.alive && w.x === x && w.y === y) return w;
  for (const e of state.enemies) if (e.alive && e.x === x && e.y === y) return e;
  for (const w of state.wagons) if (w.x === x && w.y === y) return w;
  return null;
}

// Combo bonus for an attack launched from the attacker's tile.
export function attackCombo(state, attacker, target) {
  const from = terrainAt(state, attacker.x, attacker.y);
  const at = terrainAt(state, target.x, target.y);
  if (from === 'high') return { name: 'HIGH GROUND', bonus: 2 };
  if (from === 'wind') return { name: 'WIND PUSH', bonus: 1, push: true };
  if (at === 'thorn') return { name: 'THORN AMBUSH', bonus: 3 };
  return null;
}
