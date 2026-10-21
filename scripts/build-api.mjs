// Builds the static empty.string API feeds in api/v1/*.json.
// Runs every hour in GitHub Actions (.github/workflows/api.yml) and can be run locally: node scripts/build-api.mjs
// Uses the same SDK as the app (api/empty-string.js) so the data shape is identical.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ES = require('../api/empty-string.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'api', 'v1');
const BASE = 'https://femboyss.github.io/empty-strings/api/v1/';

const FEEDS = {
  'trending': ['Trending full songs on Audius this week', () => ES.trending()],
  'trending-electronic': ['Trending electronic songs on Audius', () => ES.trending({ genre: 'Electronic' })],
  'trending-hiphop': ['Trending hip-hop songs on Audius', () => ES.trending({ genre: 'Hip-Hop/Rap' })],
  'trending-lofi': ['Trending lo-fi songs on Audius', () => ES.trending({ genre: 'Lo-Fi' })],
  'radio-austria': ['Most listened live radio stations in Austria', () => ES.radio({ country: 'AT', limit: 40 })],
  'radio-germany': ['Most listened live radio stations in Germany', () => ES.radio({ country: 'DE', limit: 40 })],
  'radio-trending': ['Live radio stations rising worldwide today', () => ES.radio({ order: 'clicktrend', limit: 40 })],
  'charts-week': ['World charts this week from real listens (ListenBrainz), metadata only', () => ES.charts({ range: 'week' })],
  'podcasts-hot-de': ['Hot German podcasts (fyyd)', () => ES.podcasts.hot({ lang: 'de' })],
  'podcasts-hot-en': ['Hot English podcasts (fyyd)', () => ES.podcasts.hot({ lang: 'en' })],
  'mixes-hearthis': ['Popular full tracks and DJ mixes on hearthis.at', () => ES.mixes.hearthis('popular')],
  'archive-netlabels': ['Most downloaded netlabel albums on the Internet Archive', () => ES.archive.search('', { collection: 'netlabels', rows: 30 })],
  'archive-concerts': ['Most downloaded live concert recordings on the Internet Archive', () => ES.archive.search('', { collection: 'concerts', rows: 30 })]
};

await mkdir(out, { recursive: true });
const generated = new Date().toISOString();
const index = { name: 'empty.string API', version: ES.version, generated, docs: 'https://femboyss.github.io/empty-strings/api.html', sdk: 'https://femboyss.github.io/empty-strings/api/empty-string.js', feeds: [] };
let failed = 0;

for (const [name, [description, fn]] of Object.entries(FEEDS)) {
  try {
    const items = await fn();
    await writeFile(join(out, name + '.json'), JSON.stringify({ feed: name, description, generated, count: items.length, items }, null, 1));
    index.feeds.push({ name, description, url: BASE + name + '.json', count: items.length });
    console.log('ok  ', name, items.length);
  } catch (e) {
    failed++;
    console.log('FAIL', name, e.message);   // keep the previous file if a source is down
    index.feeds.push({ name, description, url: BASE + name + '.json', error: 'last update failed, older data kept' });
  }
}
await writeFile(join(out, 'index.json'), JSON.stringify(index, null, 1));
console.log(`done, ${failed} failed`);
