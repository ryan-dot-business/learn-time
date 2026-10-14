// Builds the site into dist/: embed.js (the <learn-time> element) plus the
// standalone page, demo page and assets. GitHub Pages serves dist/.
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const sha = (process.env.GITHUB_SHA || '').slice(0, 7);
const version = pkg.version + (sha ? '+' + sha : '');

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/learn-time.js'],
  outfile: 'dist/embed.js',
  bundle: true,
  format: 'esm',
  minify: true,
  // Old Android WebViews (Chrome 64 is the first with ES modules + import.meta)
  // and iPad Safari 12+.
  target: ['chrome64', 'safari12'],
  define: { __LT_VERSION__: JSON.stringify(version) },
  banner: { js: `/* learn-time ${version} · embed contract 1 */` },
  legalComments: 'none',
});

for (const f of ['index.html', 'demo.html', 'favicon.svg', 'apple-touch-icon.png', 'og-image.png']) {
  cpSync(f, 'dist/' + f);
}
cpSync('images', 'dist/images', { recursive: true });

console.log(`built learn-time ${version}`);
