// campaign-passes.js — the five passes: terrain mix, enemy list,
// captain, new rule, and the after-pass upgrade choice.
import { COLS, ROWS, makeRng } from './grid-board.js';
import { createWardens, WARDEN_START_SPOTS } from './wardens.js';
import { createEnemy } from './enemies.js';
import { createCaptain } from './captains.js';
import { addLog } from './campaign-state.js';

export const PASS_DEFS = [
  { num: 1, name: 'Thornroad', rule: 'NEW RULE: thorn hedges wound anything that ends its move inside them.',
    terrain: { thorn: 8 }, enemies: { charger: 4, stalker: 2 }, captain: 'rookfrost' },
  { num: 2, name: 'Highgate', rule: 'NEW RULE: high ground gives +2 damage and +1 range to attacks from it.',
    terrain: { high: 10, thorn: 6 }, enemies: { charger: 4, stalker: 2, spitter: 2 }, captain: 'thornmother' },
  { num: 3, name: 'Icehold', rule: 'NEW RULE: ice slides you one extra tile; mud holds you in place a turn.',
    terrain: { ice: 9, mud: 7, thorn: 5, high: 4 }, enemies: { charger: 3, stalker: 2, spitter: 2, burrower: 1 }, captain: 'mudking' },
  // Density cut (charger 4→3, stalker 3→2) is load-bearing, measured
  // 2026-11-17: with original density the loadout run on pass 3 was
  // 0–0 for both policies; with this cut terrain wins pass 3 saving 2
  // wagons vs basic's 1. One fewer wagon-hunter each is what lets
  // terrain's extra kills convert into a saved wagon.
  // Pass 4, experiment E2 (2026-11-17): charger 5→4 (keeps burrower 2→1
  // from E1). E1 bought one extra turn (last wagon died turn 9, not 8)
  // but the survivor is the trailing wagon, which needs 11 turns to the
  // gate. Chargers are the largest wagon-DPS source (5 × 3/turn once
  // adjacent); one fewer stretches every wagon's time-to-kill toward
  // the crossing the lead wagon needs.
  { num: 4, name: 'Windcut', rule: 'NEW RULE: wind channels push attacks one tile sideways.',
    terrain: { wind: 9, ice: 5, mud: 4, high: 6, thorn: 5 }, enemies: { charger: 4, stalker: 3, spitter: 3, burrower: 1 }, captain: 'galequeen' },
  // Pass 5, experiment E2 (2026-11-17): burrower 2→1, spitter 3→2.
  // Probe (probe-p5.mjs) attribution: both burrowers target the SAME
  // lead wagon and surface on its tile for 4+4 = 8 unavoidable damage
  // per cycle — no counterplay exists (wagon cannot move, tile cannot
  // be blocked, burrower has 9 HP = 3 warden hits to kill before it
  // surfaces). Spitters add 6/turn of ranged tax no body-block can
  // answer. One burrower keeps the telegraphed SURFACE! threat real
  // and answerable; two spitters keep the Sera/high-ground answer live.
  { num: 5, name: 'Stormpass', rule: 'FINAL PASS: every terrain at once — and TWO captains guard the gate.',
    terrain: { wind: 7, ice: 7, mud: 6, high: 7, thorn: 7 }, enemies: { charger: 3, stalker: 3, spitter: 2, burrower: 1 }, captain: 'stormlord', secondCaptain: 'galequeen' },
];

export const UPGRADE_POOL = [
  { name: '+4 health for Bram', desc: 'Bram the shield-bearer gains 4 max health.', apply: s => { const w = s.wardens[0]; w.maxHp += 4; w.hp += 4; } },
  { name: '+4 health for Sera', desc: 'Sera the hunter gains 4 max health.', apply: s => { const w = s.wardens[1]; w.maxHp += 4; w.hp += 4; } },
  { name: 'Shorter cooldowns', desc: 'Every ability recharges 1 turn faster.', apply: s => { for (const w of s.wardens) w.ability.cd = Math.max(1, w.ability.cd - 1); } },
  { name: '+1 damage for Pike', desc: 'Pike the sapper hits 1 harder.', apply: s => { s.wardens[2].dmg += 1; } },
  { name: '+1 move for Runa', desc: 'Runa the caller moves 1 tile further.', apply: s => { s.wardens[3].move += 1; } },
  { name: 'Wagon plating', desc: 'Every wagon gains 3 health.', apply: s => { for (const w of s.wagons) { w.maxHp += 3; w.hp += 3; } } },
  { name: '+1 damage for Sera', desc: 'Sera the hunter hits 1 harder.', apply: s => { s.wardens[1].dmg += 1; } },
  { name: '+2 health for all', desc: 'Every warden gains 2 max health.', apply: s => { for (const w of s.wardens) { w.maxHp += 2; w.hp += 2; } } },
];

// Build pass `num` into the state: terrain, wagons, wardens, enemies.
export function buildPass(state, num) {
  const def = PASS_DEFS[num - 1];
  const rng = makeRng(state.seed + num * 977);
  state.pass = num;
  state.passName = def.name;
  state.passRule = def.rule;
  state.turn = 1;
  state.phase = 'player';
  state.wagonsSaved = 0;
  state.wagonsLost = 0;
  state.terrain = [];
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) row.push(y === 3 ? 'road' : 'stone');
    state.terrain.push(row);
  }
  // Scatter the pass terrain mix, never on the road row or the gate column.
  for (const [kind, count] of Object.entries(def.terrain)) {
    let placed = 0, guard = 0;
    while (placed < count && guard++ < 200) {
      const x = 2 + Math.floor(rng() * 9);
      const y = Math.floor(rng() * ROWS);
      if (y === 3 || state.terrain[y][x] !== 'stone') continue;
      state.terrain[y][x] = kind;
      placed += 1;
    }
  }
  // Wagons are the escort objective: 9 HP takes three charger hits
  // (3 dmg) to destroy instead of two, so a focused lead wagon survives
  // one full enemy phase — the window terrain play needs to matter.
  // Measured 2026-11-17: at 6 HP both policies lost exactly one wagon
  // per turn from turn 3 on both passes 3 and 5, so no policy could
  // ever save a wagon and terrain use could not separate from basic.
  state.wagons = [0, 1, 2, 3].map(i => ({ x: i, y: 3, col: i, row: 3, hp: 9, maxHp: 9 }));
  if (!state.wardens.length) state.wardens = createWardens();
  for (const w of state.wardens) {
    w.alive = true;
    if (w.hp <= 0) w.hp = Math.max(1, Math.floor(w.maxHp / 2));
    w.moved = false; w.acted = false; w.cdLeft = 0; w.planted = false;
  }
  // Re-place wardens beside the wagons.
  state.wardens.forEach((w, i) => { w.x = WARDEN_START_SPOTS[i].x; w.y = WARDEN_START_SPOTS[i].y; w.prevX = w.x; w.prevY = w.y; });
  // Enemies arrive from the right half of the board.
  state.enemies = [];
  const spawnRows = [0, 1, 2, 4, 5, 6, 7];
  let si = 0;
  for (const [kind, count] of Object.entries(def.enemies)) {
    for (let i = 0; i < count; i++) {
      const x = 7 + Math.floor(rng() * 4);
      const y = spawnRows[(si++) % spawnRows.length];
      state.enemies.push(createEnemy(kind, x, y));
    }
  }
  state.captain = createCaptain(def.captain, 10, 1);
  state.enemies.push(state.captain);
  if (def.secondCaptain) state.enemies.push(createCaptain(def.secondCaptain, 10, 6));
  state.intents = [];
  state.log = [];
  addLog(state, 'Pass ' + num + ' — ' + def.name + '. Escort the wagons to the far gate.');
  addLog(state, def.rule);
}

export function rollUpgrades(state) {
  const rng = makeRng(state.seed * 31 + state.pass * 17 + state.score);
  const pool = UPGRADE_POOL.slice();
  const picks = [];
  while (picks.length < 3 && pool.length) {
    picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  state.upgradeChoices = picks;
  return picks;
}

export function applyUpgrade(state, idx) {
  const up = state.upgradeChoices[idx];
  if (!up) return;
  up.apply(state);
  addLog(state, 'Upgrade: ' + up.name);
}
