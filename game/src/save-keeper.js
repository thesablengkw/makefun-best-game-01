// save-keeper.js — persistence: best score and settings, kept on
// the device (localStorage). Safe when storage is unavailable.
const BEST_KEY = 'thornpass.best';
const MUTE_KEY = 'thornpass.muted';

export function loadBest() {
  try {
    const v = window.localStorage.getItem(BEST_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch (e) { return 0; }
}

export function saveBest(n) {
  // The best score only ever moves up, never down.
  try {
    if (n > loadBest()) window.localStorage.setItem(BEST_KEY, String(n));
  } catch (e) {}
}

export function loadMuted() {
  try { return window.localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
}

export function saveMuted(m) {
  try { window.localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (e) {}
}
