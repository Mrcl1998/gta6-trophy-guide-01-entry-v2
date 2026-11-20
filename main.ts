// Leonida Platinum Tracker hand-in (Node 22, standard library only): the
// tracker is this directory's app/ folder — plain static files a browser
// opens at app/index.html, offline, its trophy list and guides in
// app/data/trophies.json. This program copies app/ and screenshots/ from
// beside this file into /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to
// be byte for byte what its own copy writes.
//
// The output folder itself is never removed — only what is inside it is
// cleared, so a second run over its own output still works (the grader
// mounts /output and runs as an unprivileged user). Serve the app locally
// with `node serve.ts`, then open http://localhost:8080. Outside the
// grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Add the owner write bit through a tree so removing it cannot fail on a
// read-only copy (cpSync carries modes across, and the grader re-runs this
// program over the output it wrote last time).
function makeWritable(dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    chmodSync(p, st.mode | 0o200);
    if (st.isDirectory()) makeWritable(p);
  }
}

mkdirSync(out, { recursive: true });
for (const name of readdirSync(out)) {
  const p = join(out, name);
  const st = statSync(p);
  if (st.isDirectory()) makeWritable(p);
  else chmodSync(p, st.mode | 0o200);
  rmSync(p, { recursive: true, force: true });
}
cpSync(join(root, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of
// app files, beside /output's own 1000-entry cap). The run is deterministic:
// the same inputs write the same bytes every time, so the grader's two runs
// agree.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
console.log(`Leonida Platinum Tracker handed in to ${out}`);
