// grid-board.js — the board: tiles, coordinates, distances, move range.
export const COLS = 12;
export const ROWS = 8;
export const TILE = 70;
export const BOARD_X = 20;
export const BOARD_Y = 60;

// Deterministic seeded random generator (mulberry32). Same seed, same board.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

export function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function tileKey(x, y) {
  return y * COLS + x;
}

// All tiles reachable within `range` steps (4-way moves, no diagonals).
export function tilesInRange(x, y, range, blocked) {
  const out = [];
  const seen = new Set([tileKey(x, y)]);
  let frontier = [{ x, y, d: 0 }];
  while (frontier.length) {
    const next = [];
    for (const t of frontier) {
      if (t.d > 0) out.push({ x: t.x, y: t.y });
      if (t.d === range) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = t.x + dx, ny = t.y + dy;
        if (!inBounds(nx, ny) || seen.has(tileKey(nx, ny))) continue;
        if (blocked && blocked(nx, ny)) continue;
        seen.add(tileKey(nx, ny));
        next.push({ x: nx, y: ny, d: t.d + 1 });
      }
    }
    frontier = next;
  }
  // Deterministic order: nearest tiles first, so highlights render stably.
  out.sort((a, b) => manhattan(x, y, a.x, a.y) - manhattan(x, y, b.x, b.y) || a.y - b.y || a.x - b.x);
  return out;
}

// Pixel centre of a tile, for drawing.
export function tileCenter(x, y) {
  return { px: BOARD_X + x * TILE + TILE / 2, py: BOARD_Y + y * TILE + TILE / 2 };
}

// Tile under a canvas pixel, or null when off the board.
export function tileAtPixel(px, py) {
  const x = Math.floor((px - BOARD_X) / TILE);
  const y = Math.floor((py - BOARD_Y) / TILE);
  return inBounds(x, y) ? { x, y } : null;
}
