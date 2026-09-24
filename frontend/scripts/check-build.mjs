import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const docs = fs.readFileSync(path.join(dist, 'docs', 'index.html'), 'utf8');
const spa = fs.readFileSync(path.join(dist, 'spa.html'), 'utf8');
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const preview = process.env.VERCEL_ENV === 'preview';

for (const [name, html] of [['home', home], ['docs', docs]]) {
  assert.match(html, /<div id="root"><[\s\S]*<h1[ >]/, `${name} needs rendered HTML`);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<script type="module" crossorigin src="\/assets\//);
  if (preview) assert.match(html, /name="robots" content="noindex, nofollow"/);
  else assert.match(html, /rel="canonical" href="https:\/\/[^\"]+"/);
}
assert.notEqual(home.match(/<title>(.*?)<\/title>/)?.[1], docs.match(/<title>(.*?)<\/title>/)?.[1]);
assert.match(spa, /name="robots" content="noindex, nofollow"/);
assert.doesNotMatch(spa, /<h1[ >]/);
assert.deepEqual(config.rewrites.map((entry) => entry.source).sort(), ['/docs', '/playground', '/status']);
assert.equal(config.rewrites.find((entry) => entry.source === '/docs').destination, '/docs/index.html');
assert.ok(config.rewrites.filter((entry) => entry.source !== '/docs').every((entry) => entry.destination === '/spa.html'));
if (preview) {
  assert.match(robots, /Disallow: \//);
  assert.equal(fs.existsSync(path.join(dist, 'sitemap.xml')), false);
} else {
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\//);
  assert.equal((sitemap.match(/<url>/g) || []).length, 2);
  assert.match(sitemap, /<loc>https:\/\/[^<]+\/docs<\/loc>/);
  assert.doesNotMatch(sitemap, /playground|status/);
}
console.log('Built HTML, SEO metadata, sitemap, and route fallbacks verified.');
