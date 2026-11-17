// game-entry.js — opens the game in the browser, creates the canvas
// context, wires input and rendering, starts the game. Nothing else.
import { createCampaign, setScreen, addLog } from './campaign-state.js';
import { buildPass, rollUpgrades } from './campaign-passes.js';
import { computeIntents } from './turn-engine.js';
import { drawBoard } from './board-renderer.js';
import { drawTopBar, drawBottomBar, drawSidePanel, drawComboBanner } from './interface-renderer.js';
import { drawTitle, drawBriefing, drawPause, drawResults, drawVictory, drawDefeat } from './menus.js';
import { attachInput } from './input-controls.js';
import { SoundMaker } from './sound-maker.js';
import { loadMuted } from './save-keeper.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createCampaign();
const sound = new SoundMaker();
state.muted = loadMuted();
sound.setMuted(state.muted);

attachInput(canvas, state, sound);

// Deterministic setup hook for scripted screenshots and tests:
// ?setup=cover|title|results|victory&seed=N — every state it builds is
// reachable by real play through the same functions the game uses.
function applySetup() {
  const q = new URLSearchParams(window.location.search);
  if (q.get('seed')) state.seed = parseInt(q.get('seed'), 10) || 101;
  const setup = q.get('setup');
  if (!setup) return;
  state.frozen = true;
  if (setup === 'title') {
    state.best = 2400;
    return;
  }
  if (setup === 'cover') {
    buildPass(state, 3);
    state.score = 1250;
    state.best = 2400;
    state.turn = 4;
    // No combo banner: the cover shows the decision BEFORE it is made,
    // not the damage after it. Runa (5,2) stands beside a charger (6,2)
    // that will hit the lead wagon (6,3 — 3/9 HP) next turn; one tile
    // past the charger is a thorn hedge (7,2), so Runa's Shove (key 4,
    // range 2) throws it into the thorns for -3 and off the wagon.
    // Sera waits on high ground (3,1) for the +2 shot. All positions
    // are reachable by real play: wagons advance one tile per turn,
    // wardens move three, the charger walked in from the right.
    state.selected = 'runa';
    state.abilityTargeting = 'runa';
    state.cursor = { x: 6, y: 2 };
    const runa = state.wardens.find(w => w.id === 'runa');
    if (runa) { runa.x = 5; runa.y = 2; runa.prevX = 5; runa.prevY = 2; }
    const sera = state.wardens.find(w => w.id === 'sera');
    if (sera) { sera.x = 3; sera.y = 1; sera.prevX = 3; sera.prevY = 1; }
    const bram = state.wardens.find(w => w.id === 'bram');
    if (bram) { bram.x = 4; bram.y = 4; bram.prevX = 4; bram.prevY = 4; }
    const pike = state.wardens.find(w => w.id === 'pike');
    if (pike) { pike.x = 2; pike.y = 4; pike.prevX = 2; pike.prevY = 4; }
    state.terrain[2][7] = 'thorn';
    state.terrain[1][3] = 'high';
    state.terrain[1][10] = 'high';
    state.wagons.forEach((w, i) => { w.x = 3 + i; w.y = 3; });
    state.wagons[3].hp = 3;
    const spots = [{ x: 6, y: 2 }, { x: 9, y: 1 }, { x: 9, y: 4 }, { x: 8, y: 5 }, { x: 10, y: 5 }, { x: 10, y: 2 }, { x: 8, y: 6 }, { x: 10, y: 6 }, { x: 9, y: 3 }, { x: 8, y: 0 }];
    const foes = state.enemies.filter(e => e.alive && e.kind !== 'captain');
    foes.forEach((e, i) => {
      const s = spots[i % spots.length];
      e.x = s.x; e.y = s.y; e.prevX = s.x; e.prevY = s.y;
    });
    if (state.captain) { state.captain.x = 10; state.captain.y = 1; state.captain.prevX = 10; state.captain.prevY = 1; }
    computeIntents(state);
    addLog(state, 'Pass 3 — Icehold. Shove, slide, strike from high ground.');
    addLog(state, 'The charger will hit the lead wagon (3/9) next turn.');
    addLog(state, 'Runa can shove the charger into the thorns: -3.');
    setScreen(state, 'play');
    return;
  }
  if (setup === 'results') {
    buildPass(state, 2);
    state.score = 860;
    state.best = 2400;
    state.stars = 3;
    state.breakdown = { wagons: 4, enemies: 9, combos: 4, wardens: 4, passScore: 860 };
    rollUpgrades(state);
    state.upgradePicked = 0;
    setScreen(state, 'results');
    return;
  }
  if (setup === 'victory') {
    state.score = 4860;
    state.best = 4860;
    state.campaignWagonsSaved = 17;
    setScreen(state, 'victory');
  }
}

applySetup();
computeIntents(state);

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'briefing') drawBriefing(ctx, state);
  else if (state.screen === 'pause') {
    drawBoard(ctx, state);
    drawTopBar(ctx, state);
    drawBottomBar(ctx, state);
    drawSidePanel(ctx, state);
    drawPause(ctx, state);
  } else if (state.screen === 'results') drawResults(ctx, state);
  else if (state.screen === 'victory') drawVictory(ctx, state);
  else if (state.screen === 'defeat') drawDefeat(ctx, state);
  else {
    drawBoard(ctx, state);
    drawTopBar(ctx, state);
    drawBottomBar(ctx, state);
    drawSidePanel(ctx, state);
    drawComboBanner(ctx, state);
  }
}

function tick() {
  if (!state.frozen) {
    if (state.comboBanner) {
      state.comboBanner.t -= 1;
      if (state.comboBanner.t <= 0) state.comboBanner = null;
    }
    for (const f of state.floats) f.t -= 1;
    state.floats = state.floats.filter(f => f.t > 0);
  }
  render();
  requestAnimationFrame(tick);
}

tick();
// Expose the live state for scripted playtests (not part of the game).
window.__thornpass = state;
