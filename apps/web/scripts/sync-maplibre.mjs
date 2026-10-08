// MapLibre v6 runs its tile parser in a module worker that bundlers can't resolve, so we
// serve the worker (and the shared chunk it imports) as static files from /vendor/maplibre.
// Runs before `next build`; re-run by hand after bumping maplibre-gl in dev.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('maplibre-gl/package.json'));
const out = join(here, '..', 'public', 'vendor', 'maplibre');
mkdirSync(out, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(join(pkgDir, 'dist', f), join(out, f));
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
console.log(`maplibre-gl ${version} worker synced to public/vendor/maplibre`);
