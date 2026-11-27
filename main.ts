// Gobble Dash: The Great Turkey Escape — the entrypoint (Node 22, standard
// library only). The game is plain static files under game/ (game/index.html
// and its ES modules, no library, no network request) and this program hands
// it in: it copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): refuse an entry the scorer
// would refuse — more than 4 screenshots, or one over 256 KiB — instead of
// handing in a dossier the gate rejects.
const shotNames = readdirSync(join(out, 'screenshots')).filter((name) => !name.startsWith('.'));
if (shotNames.length > 4) throw new Error(`too many screenshots: ${shotNames.length}`);
for (const name of shotNames) {
  if (statSync(join(out, 'screenshots', name)).size > 262144) throw new Error(`screenshot over 256 KiB: ${name}`);
}

// The same guard for the game itself: at most 993 files and 48 MiB under
// game/, so the dossier build never hands in a game the gate refuses.
function gameSize(directory) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const child = gameSize(path);
      files += child.files;
      bytes += child.bytes;
    } else {
      files += 1;
      bytes += stats.size;
    }
  }
  return { files, bytes };
}
const gameTotals = gameSize(join(out, 'game'));
if (gameTotals.files > 993 || gameTotals.bytes > 50331648) {
  throw new Error(`game too big: ${gameTotals.files} files, ${gameTotals.bytes} bytes`);
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
