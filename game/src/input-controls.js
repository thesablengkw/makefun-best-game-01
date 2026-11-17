// input-controls.js — mouse and keyboard: selection, movement
// clicks, ability keys, end turn, pause, the controls listing.
import { tileAtPixel, tilesInRange, inBounds } from './grid-board.js';
import { unitAt } from './terrain-rules.js';
import { endTurn, moveWarden, useAbility, computeIntents } from './turn-engine.js';
import { attackUnit, inAttackRange } from './combat-resolver.js';
import { abilityButtonRect, endTurnRect, muteRect } from './interface-renderer.js';
import { menuButtonRects } from './menus.js';
import { buildPass, applyUpgrade } from './campaign-passes.js';
import { setScreen, addLog } from './campaign-state.js';
import { saveMuted } from './save-keeper.js';

export const CONTROLS_TEXT = [
  'Mouse: click a warden, then a lit tile to move; click an enemy in range to attack.',
  'Keys 1-4: abilities. Arrows: move cursor. Enter: select. Space: end turn.',
  'Esc: pause. M: mute.',
];

function inside(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function attachInput(canvas, state, sound) {
  function toggleMute() {
    state.muted = !state.muted;
    sound.setMuted(state.muted);
    saveMuted(state.muted);
  }

  function selectWardenAt(t) {
    const w = state.wardens.find(w => w.alive && w.x === t.x && w.y === t.y);
    if (w) {
      state.selected = w.id;
      state.cursor = { x: t.x, y: t.y };
      state.moveTiles = w.moved || state.held.has(w.id) ? [] : tilesInRange(w.x, w.y, w.move, (x, y) => !!unitAt(state, x, y));
      sound.play('select');
      return true;
    }
    return false;
  }

  function clickPlay(x, y) {
    // HUD buttons first.
    if (inside(muteRect(), x, y)) { toggleMute(); return; }
    if (inside(endTurnRect(), x, y)) { endTurn(state); sound.play('click'); return; }
    const sel = state.wardens.find(w => w.id === state.selected);
    if (sel && sel.alive && inside(abilityButtonRect(0), x, y)) {
      if (sel.id === 'pike' || sel.id === 'runa') {
        // Targeted abilities: the next board click picks the target tile.
        state.abilityTargeting = sel.id;
        addLog(state, sel.id === 'pike' ? 'Choose a tile for the thorn trap.' : 'Choose an enemy to shove.');
      } else if (useAbility(state, sel, state.cursor.x, state.cursor.y)) sound.play('combo');
      return;
    }
    const t = tileAtPixel(x, y);
    if (!t) { state.selected = null; state.moveTiles = []; return; }
    state.cursor = { x: t.x, y: t.y };
    // An ability is waiting for a target tile.
    if (state.abilityTargeting) {
      const w = state.wardens.find(w => w.id === state.abilityTargeting);
      state.abilityTargeting = null;
      if (w && w.alive && useAbility(state, w, t.x, t.y)) sound.play('combo');
      return;
    }
    // Attack an enemy in range.
    const enemy = state.enemies.find(e => e.alive && e.x === t.x && e.y === t.y);
    if (enemy && sel && sel.alive && !sel.acted && inAttackRange(state, sel, enemy)) {
      attackUnit(state, sel, enemy);
      sound.play('attack');
      computeIntents(state);
      return;
    }
    // Move the selected warden.
    if (sel && sel.alive && state.moveTiles.some(m => m.x === t.x && m.y === t.y)) {
      if (moveWarden(state, sel, t.x, t.y)) sound.play('move');
      state.moveTiles = [];
      return;
    }
    selectWardenAt(t);
  }

  function clickMenu(x, y) {
    const r = menuButtonRects(state.screen);
    const hit = name => r[name] && inside(r[name], x, y);
    if (state.screen === 'title') {
      if (hit('start')) { sound.ensure(); sound.play('click'); buildPass(state, 1); setScreen(state, 'briefing'); }
      if (hit('mute')) toggleMute();
    } else if (state.screen === 'briefing') {
      if (hit('start')) { sound.ensure(); sound.play('click'); sound.startDrone(state.pass); computeIntents(state); setScreen(state, 'play'); }
    } else if (state.screen === 'pause') {
      if (hit('resume')) setScreen(state, 'play');
      if (hit('restart')) { buildPass(state, state.pass); setScreen(state, 'play'); }
      if (hit('mute')) toggleMute();
      if (hit('quit')) { state.wardens = []; state.score = 0; state.retries = 3; state.pass = 1; setScreen(state, 'title'); }
    } else if (state.screen === 'results') {
      if (hit('up0')) state.upgradePicked = 0;
      if (hit('up1')) state.upgradePicked = 1;
      if (hit('up2')) state.upgradePicked = 2;
      if (hit('cont') && state.upgradePicked !== undefined && state.upgradePicked !== null) {
        applyUpgrade(state, state.upgradePicked);
        state.upgradePicked = null;
        sound.play('click');
        if (state.pass >= 5) { state.campaignWagonsSaved = (state.campaignWagonsSaved || 0) + state.wagonsSaved; setScreen(state, 'victory'); }
        else { state.campaignWagonsSaved = (state.campaignWagonsSaved || 0) + state.wagonsSaved; buildPass(state, state.pass + 1); setScreen(state, 'briefing'); }
      }
    } else if (state.screen === 'victory') {
      if (hit('again')) { state.wardens = []; state.score = 0; state.retries = 3; state.pass = 1; state.campaignWagonsSaved = 0; setScreen(state, 'title'); }
    } else if (state.screen === 'defeat') {
      if (hit('retry') && state.retries > 0) {
        state.retries -= 1;
        buildPass(state, state.pass);
        setScreen(state, 'briefing');
      }
      if (hit('again')) { state.wardens = []; state.score = 0; state.retries = 3; state.pass = 1; state.campaignWagonsSaved = 0; setScreen(state, 'title'); }
    }
  }

  canvas.addEventListener('click', ev => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    if (state.screen === 'play') clickPlay(x, y);
    else clickMenu(x, y);
  });

  window.addEventListener('keydown', ev => {
    const k = ev.key;
    if (k === 'm' || k === 'M') { toggleMute(); return; }
    if (state.screen === 'play') {
      if (k === 'Escape') { setScreen(state, 'pause'); return; }
      if (k === ' ') { ev.preventDefault(); endTurn(state); return; }
      if (k >= '1' && k <= '4') {
        // Key N selects warden N; pressing it again uses that warden's ability.
        const w = state.wardens[parseInt(k, 10) - 1];
        if (!w || !w.alive) return;
        if (state.selected === w.id) {
          if (w.id === 'pike' || w.id === 'runa') {
            state.abilityTargeting = w.id;
            addLog(state, w.id === 'pike' ? 'Choose a tile for the thorn trap.' : 'Choose an enemy to shove.');
          } else if (useAbility(state, w, state.cursor.x, state.cursor.y)) sound.play('combo');
        } else {
          state.selected = w.id;
          state.cursor = { x: w.x, y: w.y };
          state.moveTiles = w.moved || state.held.has(w.id) ? [] : tilesInRange(w.x, w.y, w.move, (x, y) => !!unitAt(state, x, y));
          sound.play('select');
        }
        return;
      }
      if (k.startsWith('Arrow')) {
        ev.preventDefault();
        const c = state.cursor;
        if (k === 'ArrowLeft') c.x = Math.max(0, c.x - 1);
        if (k === 'ArrowRight') c.x = Math.min(11, c.x + 1);
        if (k === 'ArrowUp') c.y = Math.max(0, c.y - 1);
        if (k === 'ArrowDown') c.y = Math.min(7, c.y + 1);
        return;
      }
      if (k === 'Enter') {
        const t = state.cursor;
        if (state.abilityTargeting) {
          const w = state.wardens.find(w => w.id === state.abilityTargeting);
          state.abilityTargeting = null;
          if (w && w.alive && useAbility(state, w, t.x, t.y)) sound.play('combo');
          return;
        }
        const enemy = state.enemies.find(e => e.alive && e.x === t.x && e.y === t.y);
        const sel = state.wardens.find(w => w.id === state.selected);
        if (enemy && sel && sel.alive && !sel.acted && inAttackRange(state, sel, enemy)) {
          attackUnit(state, sel, enemy);
          sound.play('attack');
          computeIntents(state);
        } else if (sel && sel.alive && state.moveTiles.some(m => m.x === t.x && m.y === t.y)) {
          if (moveWarden(state, sel, t.x, t.y)) sound.play('move');
          state.moveTiles = [];
        } else {
          selectWardenAt(t);
        }
        return;
      }
    } else if (state.screen === 'pause' && k === 'Escape') {
      setScreen(state, 'play');
    } else if (state.screen === 'title' && k === 'Enter') {
      buildPass(state, 1);
      setScreen(state, 'briefing');
    }
  });
}
