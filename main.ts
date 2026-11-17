// THORNPASS — program entrypoint for make.fun best-game-01.
// Copies the game and screenshots into the output directory and writes
// the dossier. Deterministic: no clock, no unseeded randomness, no network.
import { cpSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
const shots = join(here, 'screenshots');
if (existsSync(shots)) {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  cpSync(shots, join(outDir, 'screenshots'), { recursive: true });
}

// Caps are the kit's own limits: text under the 160 KiB cap, at most four
// screenshots of at most 256 KiB each, game under 993 entries / 48 MiB,
// every game path under 1000 UTF-8 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game: { max_entries: 993, max_bytes: 50331648, max_path_bytes: 1000 },
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
