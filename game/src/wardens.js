// wardens.js — the four player units: health, movement, attacks,
// named abilities with cooldowns.
export const WARDEN_DEFS = [
  { id: 'bram', name: 'Bram', role: 'Shield-bearer', hp: 16, move: 3, range: 1, dmg: 4,
    color: '#f59e0b', glyph: '▣',
    ability: { name: 'Plant Shield', key: '1', cd: 3, desc: 'Hold this tile: block the road, take half damage.' } },
  { id: 'sera', name: 'Sera', role: 'Hunter', hp: 10, move: 3, range: 3, dmg: 4,
    color: '#fbbf24', glyph: '➶',
    ability: { name: 'Long Shot', key: '2', cd: 2, desc: 'One shot at range 5 for +2 damage.' } },
  { id: 'pike', name: 'Pike', role: 'Sapper', hp: 11, move: 3, range: 1, dmg: 3,
    color: '#84cc16', glyph: '✚',
    ability: { name: 'Thorn Trap', key: '3', cd: 3, desc: 'Lay a thorn trap on any empty tile.' } },
  { id: 'runa', name: 'Runa', role: 'Caller', hp: 10, move: 3, range: 2, dmg: 3,
    color: '#38bdf8', glyph: '≋',
    ability: { name: 'Shove', key: '4', cd: 2, desc: 'Shove one enemy one tile in any direction.' } },
];

// Where the wardens stand at the start of every pass: beside the wagons.
export const WARDEN_START_SPOTS = [{ x: 1, y: 2 }, { x: 1, y: 4 }, { x: 2, y: 2 }, { x: 2, y: 4 }];

export function createWardens() {
  // Start beside the wagons on the left of the road.
  const spots = WARDEN_START_SPOTS;
  return WARDEN_DEFS.map((d, i) => ({
    ...d, ability: { ...d.ability }, x: spots[i].x, y: spots[i].y,
    prevX: spots[i].x, prevY: spots[i].y,
    maxHp: d.hp, alive: true, moved: false, acted: false, cdLeft: 0,
    planted: false, longShot: false,
  }));
}

export function wardenById(state, id) {
  return state.wardens.find(w => w.id === id) || null;
}

export function aliveWardens(state) {
  return state.wardens.filter(w => w.alive);
}

export function resetWardenTurn(w) {
  w.moved = false; w.acted = false; w.planted = false; w.longShot = false;
  if (w.cdLeft > 0) w.cdLeft -= 1;
}
