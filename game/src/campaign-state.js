// campaign-state.js — the single record of the campaign: pass, turn,
// phase, score, retries, best score, and the screen-flow rules.
import { loadBest } from './save-keeper.js';

export const SCREENS = ['title', 'briefing', 'play', 'results', 'victory', 'defeat', 'pause'];

export function createCampaign() {
  return {
    screen: 'title',
    prevScreen: 'title',
    pass: 1,
    turn: 1,
    phase: 'player', // 'player' | 'enemy'
    score: 0,
    best: loadBest(),
    retries: 3,
    wagons: [],          // {col, row, hp, maxHp}
    wagonsSaved: 0,
    wagonsLost: 0,
    wardens: [],
    enemies: [],
    terrain: [],         // ROWS x COLS of terrain keys
    log: [],
    comboBanner: null,  // {text, dmg, t}
    floats: [],          // {x, y, text, color, t}
    selected: null,      // selected warden id
    cursor: { x: 5, y: 3 },
    moveTiles: [],
    intents: [],         // enemy telegraphs for this turn
    passRule: '',
    passName: '',
    captain: null,
    upgradeChoices: [],
    breakdown: null,
    stars: 0,
    passScore: 0,
    muted: false,
    frozen: false,       // screenshot setup: freeze banner/float timers
    seed: 101,
    held: new Set(),     // unit ids held by mud this turn
    comboCount: 0,       // combos fired this campaign (results screen)
    abilityTargeting: null, // warden id waiting for an ability target tile
    upgradePicked: null,
    campaignWagonsSaved: 0,
    loseReason: '',
  };
}

export function addScore(state, n, why) {
  state.score += n;
  if (why) addLog(state, '+' + n + ' ' + why);
}

export function addLog(state, text) {
  state.log.unshift(text);
  if (state.log.length > 3) state.log.length = 3;
}

export function setScreen(state, screen) {
  state.prevScreen = state.screen;
  state.screen = screen;
}

export function showCombo(state, text, dmg) {
  state.comboBanner = { text, dmg, t: 150 };
  state.comboCount += 1;
  addScore(state, 15, text);
  addLog(state, text + ' +' + dmg);
}

export function addFloat(state, x, y, text, color) {
  state.floats.push({ x, y, text, color, t: 90 });
}
