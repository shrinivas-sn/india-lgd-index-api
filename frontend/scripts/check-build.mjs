import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const docs = fs.readFileSync(path.join(dist, 'docs', 'index.html'), 'utf8');
const guides = fs.readFileSync(path.join(dist, 'guides', 'index.html'), 'utf8');
const spa = fs.readFileSync(path.join(dist, 'spa.html'), 'utf8');
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const preview = process.env.VERCEL_ENV === 'preview';
const localApi = /(?:localhost|127\.0\.0\.1):3000/;
for (const file of fs.readdirSync(path.join(dist, 'assets')).filter((name) => name.endsWith('.js'))) {
  assert.ok(!localApi.test(fs.readFileSync(path.join(dist, 'assets', file), 'utf8')), `${file} contains a local API URL`);
}

for (const [name, html] of [['home', home], ['docs', docs], ['guides', guides]]) {
  assert.ok(!localApi.test(html), `${name} contains a local API URL`);
  assert.match(html, /<div id="root"><[\s\S]*<h1[ >]/, `${name} needs rendered HTML`);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<script type="module" crossorigin src="\/assets\//);
  if (preview) assert.match(html, /name="robots" content="noindex, nofollow"/);
  else assert.match(html, /rel="canonical" href="https:\/\/[^\"]+"/);
}
assert.notEqual(home.match(/<title>(.*?)<\/title>/)?.[1], docs.match(/<title>(.*?)<\/title>/)?.[1]);
assert.notEqual(docs.match(/<title>(.*?)<\/title>/)?.[1], guides.match(/<title>(.*?)<\/title>/)?.[1]);
assert.match(spa, /name="robots" content="noindex, nofollow"/);
assert.doesNotMatch(spa, /<h1[ >]/);
assert.deepEqual(config.rewrites.map((entry) => entry.source).sort(), ['/docs', '/guides', '/guides/:id', '/playground', '/status']);
assert.ok(config.rewrites.filter((entry) => entry.source === '/docs' || entry.source === '/guides' || entry.source === '/guides/:id').every((entry) => entry.destination.endsWith('/index.html')));
assert.ok(config.rewrites.filter((entry) => entry.source !== '/docs' && entry.source !== '/guides' && entry.source !== '/guides/:id').every((entry) => entry.destination === '/spa.html'));
if (preview) {
  assert.match(robots, /Disallow: \//);
  assert.equal(fs.existsSync(path.join(dist, 'sitemap.xml')), false);
} else {
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\//);
  assert.equal((sitemap.match(/<url>/g) || []).length, 6);
  assert.match(sitemap, /<loc>https:\/\/[^<]+\/docs<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/[^<]+\/guides<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/[^<]+\/guides\/why-india-needs-free-lgd-api<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/[^<]+\/guides\/census-2011-vs-lgd-codes-mapping<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/[^<]+\/guides\/address-normalization-cascading-dropdowns-react<\/loc>/);
  assert.doesNotMatch(sitemap, /playground|status/);
  const guideHtml = fs.readFileSync(path.join(dist, 'guides', 'why-india-needs-free-lgd-api', 'index.html'), 'utf8');
  assert.match(guideHtml, /Why India Needs an Open LGD API/);
}
console.log('Built HTML, SEO metadata, sitemap, and route fallbacks verified.');
