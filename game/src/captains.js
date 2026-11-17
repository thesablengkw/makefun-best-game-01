// captains.js — the five named captains: titles, health bars,
// one special rule each.
export const CAPTAIN_DEFS = [
  { id: 'rookfrost', name: 'Rookfrost', title: 'The Frozen Gate', hp: 22, move: 2, range: 1, dmg: 4,
    color: '#bae6fd', glyph: '♛',
    rule: 'Freezes the tile it stands on to ice.' },
  { id: 'thornmother', name: 'Thornmother', title: 'Mother of Hedges', hp: 24, move: 2, range: 1, dmg: 4,
    color: '#4ade80', glyph: '♛',
    rule: 'Calls two chargers when she falls below half health.' },
  { id: 'mudking', name: 'Mudking', title: 'King of the Mire', hp: 26, move: 2, range: 1, dmg: 5,
    color: '#a16207', glyph: '♛',
    rule: 'Mud spreads around him every turn.' },
  { id: 'galequeen', name: 'Galequeen', title: 'Queen of the Cut', hp: 24, move: 3, range: 2, dmg: 4,
    color: '#c7d2fe', glyph: '♛',
    rule: 'Her attacks shove the target one tile sideways.' },
  { id: 'stormlord', name: 'Stormlord', title: 'Lord of the Fifth Pass', hp: 30, move: 2, range: 2, dmg: 5,
    color: '#fca5a5', glyph: '♛',
    rule: 'Strikes twice when attacked from low ground.' },
];

export function createCaptain(id, x, y) {
  const d = CAPTAIN_DEFS.find(c => c.id === id);
  return {
    id: 'cap-' + id, kind: 'captain', captainId: id, name: d.name, title: d.title,
    x, y, prevX: x, prevY: y, hp: d.hp, maxHp: d.hp, move: d.move,
    range: d.range, dmg: d.dmg, color: d.color, glyph: d.glyph,
    rule: d.rule, alive: true, called: false, surfacing: null,
  };
}

// The captain's special rule, applied at the start of the enemy phase.
// Returns a log line when it fires, or null.
export function captainRule(state, cap) {
  if (cap.captainId === 'rookfrost') {
    state.terrain[cap.y][cap.x] = 'ice';
    return cap.name + ' freezes the ground beneath her feet.';
  }
  if (cap.captainId === 'thornmother' && cap.hp <= cap.maxHp / 2 && !cap.called) {
    cap.called = true;
    return 'CALL';
  }
  if (cap.captainId === 'mudking') {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cap.x + dx, ny = cap.y + dy;
      // The mire never claims the caravan road itself.
      if (ny === 3) continue;
      if (nx >= 0 && nx < 12 && ny >= 0 && ny < 8 && state.terrain[ny][nx] === 'stone') {
        state.terrain[ny][nx] = 'mud';
      }
    }
    return cap.name + ' spreads the mire.';
  }
  return null;
}
