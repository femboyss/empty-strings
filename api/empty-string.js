/*!
 * empty.string API v1
 * One small JavaScript interface for free, legal music sources that work straight from the browser.
 * No account, no key, no server. Every call goes directly to the original source.
 *
 * Docs:   https://femboyss.github.io/empty-strings/api.html
 * Usage:  <script src="https://femboyss.github.io/empty-strings/api/empty-string.js"></script>
 *         const tracks = await EmptyString.search('lofi');
 *
 * Please respect the rules of every source (attribution, rate limits, app_name for Audius).
 */
(function (root) {
  'use strict';
  const VERSION = '1.0.0';
  const APP = 'empty.string';
  const BASE = 'https://femboyss.github.io/empty-strings/';

  /* ---------- helpers ---------- */
  const qs = o => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  async function getJSON(url, ms = 10000) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(url, { signal: c.signal });
      if (!r.ok) throw new Error(new URL(url).host + ' answered ' + r.status);
      return await r.json();
    } catch (e) { if (e.name === 'AbortError') throw new Error(new URL(url).host + ' timed out'); throw e; }
    finally { clearTimeout(t); }
  }
  const cache = new Map();
  async function cached(key, ms, fn) { const c = cache.get(key); if (c && Date.now() - c.t < ms) return c.v; const v = await fn(); cache.set(key, { t: Date.now(), v }); return v; }
  const trim = v => String(v || '').replace(/\s+/g, ' ').trim();
  const https = u => /^https:/.test(u || '') ? u : '';
  const one = v => Array.isArray(v) ? v.join(', ') : (v || '');

  /**
   * Every result is a plain object in this shape:
   * { id, source, kind:'track'|'station'|'episode'|'album'|'podcast'|'playlist',
   *   title, artist, artwork, duration (s, 0 if unknown), stream (https audio URL or null),
   *   embed (official player URL or null), link (page on the source), live (bool), license }
   */
  const T = o => Object.assign({ kind: 'track', artwork: '', duration: 0, stream: null, embed: null, link: '', live: false, license: '' }, o);

  /* ---------- Audius (full songs) ---------- */
  let audiusHost = null;
  async function audiusBase() {
    if (audiusHost) return audiusHost;
    try { const j = await getJSON('https://api.audius.co', 5000); audiusHost = j.data[Math.floor(Math.random() * j.data.length)]; }
    catch { audiusHost = 'https://api.audius.co'; }
    return audiusHost;
  }
  async function audius(path, params = {}) { const h = await audiusBase(); return (await getJSON(h + '/v1' + path + '?' + qs({ ...params, app_name: APP }))).data; }
  const okA = t => t && t.is_streamable !== false && !t.is_delete && !t.stream_conditions && t.is_available !== false;
  const mapA = t => T({ id: 'audius:' + t.id, source: 'audius', title: t.title, artist: t.user?.name || '', artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '', duration: t.duration || 0, stream: `https://api.audius.co/v1/tracks/${encodeURIComponent(t.id)}/stream?app_name=${APP}`, link: t.permalink ? 'https://audius.co' + t.permalink : '' });
  const tracksA = a => (a || []).filter(okA).map(mapA);

  /* ---------- Internet Archive (full albums, live concerts, 78s, audiobooks) ---------- */
  const IA_COLLECTIONS = {
    netlabels: '(collection:netlabels OR collection:opensource_audio)',
    concerts: 'collection:etree',
    '78rpm': 'collection:georgeblood',
    mixtapes: 'collection:hiphopmixtapes',
    oldtimeradio: 'collection:oldtimeradio',
    audiobooks: 'collection:librivoxaudio'
  };
  const MP3 = 'format:("VBR MP3" OR "MP3" OR "64Kbps MP3" OR "128Kbps MP3" OR "192Kbps MP3" OR "256Kbps MP3" OR "320Kbps MP3")';
  async function archiveSearch(q = '', { collection = 'netlabels', rows = 24 } = {}) {
    const query = `${q ? '(' + q + ') AND ' : ''}mediatype:(audio OR etree) AND ${IA_COLLECTIONS[collection] || IA_COLLECTIONS.netlabels} AND ${MP3}`;
    const j = await getJSON('https://archive.org/advancedsearch.php?' + qs({ q: query, rows, output: 'json' }) + '&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year' + (q ? '' : '&sort[]=downloads+desc'));
    return (j.response?.docs || []).map(d => ({ kind: 'album', id: 'archive:' + d.identifier, source: 'archive', title: one(d.title) || d.identifier, artist: one(d.creator), artwork: `https://archive.org/services/img/${d.identifier}`, year: String(d.year || ''), link: 'https://archive.org/details/' + d.identifier }));
  }
  async function archiveAlbum(identifier) {
    const id = identifier.replace(/^archive:/, '');
    const j = await getJSON('https://archive.org/metadata/' + encodeURIComponent(id));
    const m = j.metadata || {}; const files = (j.files || []).filter(f => /\.mp3$/i.test(f.name));
    const orig = files.filter(f => f.source === 'original'); const vbr = files.filter(f => f.format === 'VBR MP3');
    const use = orig.length ? orig : vbr.length ? vbr : files;
    const n = f => parseInt(String(f.track || '').split('/')[0]) || 0;
    use.sort((a, b) => (n(a) - n(b)) || a.name.localeCompare(b.name, undefined, { numeric: true }));
    const secs = v => { const s = String(v || ''); return s.includes(':') ? s.split(':').reduce((a, x) => a * 60 + (+x || 0), 0) : Math.round(+s || 0); };
    return use.map(f => T({ id: `archive:${id}/${f.name}`, source: 'archive', title: f.title || f.name.replace(/\.mp3$/i, ''), artist: f.artist || f.creator || one(m.creator), artwork: `https://archive.org/services/img/${id}`, duration: secs(f.length), stream: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split('/').map(encodeURIComponent).join('/')}`, link: 'https://archive.org/details/' + id, license: m.licenseurl || '' }));
  }

  /* ---------- hearthis.at (full tracks and DJ mixes) ---------- */
  const mapH = t => T({ id: 'hearthis:' + t.id, source: 'hearthis', title: trim(t.title).replace(/_/g, ' '), artist: trim(t.user?.username), artwork: https(t.artwork_url) || https(t.thumb), duration: +t.duration || 0, stream: t.stream_url, link: t.permalink_url || '' });
  const hearthis = async (path, params) => ((await getJSON('https://api-v2.hearthis.at' + path + '?' + qs(params))) || []).filter(t => t.stream_url && t.private !== '1').map(mapH);

  /* ---------- Mixcloud (official player only) ---------- */
  const mcEmbed = key => { let k = key; try { k = decodeURIComponent(key); } catch { } return 'https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&autoplay=1&feed=' + encodeURIComponent(k); };
  const mapM = c => T({ id: 'mixcloud:' + c.key, source: 'mixcloud', title: trim(c.name), artist: c.user?.name || '', artwork: c.pictures?.extra_large || c.pictures?.large || '', duration: +c.audio_length || 0, embed: mcEmbed(c.key), link: c.url });

  /* ---------- Radio Browser (live radio) ---------- */
  const RB = ['de1', 'fi1', 'de2', 'all'].map(h => `https://${h}.api.radio-browser.info`);
  async function rb(path, params) { let err; for (const h of RB) { try { return await getJSON(h + path + '?' + qs(params), 8000); } catch (e) { err = e; } } throw err; }
  const okR = s => s.url_resolved && /^https:/.test(s.url_resolved) && !s.hls && !/somafm\.com/i.test(s.url_resolved);
  const mapR = s => T({ kind: 'station', id: 'radio:' + s.stationuuid, source: 'radio-browser', title: trim(s.name), artist: [s.state || s.country, (s.tags || '').split(',').slice(0, 2).join(', ')].filter(Boolean).join(' · '), artwork: https(s.favicon), stream: s.url_resolved, link: s.homepage || '', live: true, geo: s.geo_lat != null ? [+s.geo_lat, +s.geo_long] : null, codec: s.codec, bitrate: s.bitrate });

  /* ---------- fyyd (podcasts) ---------- */
  const fyyd = async (path, params) => (await getJSON('https://api.fyyd.de/0.2' + path + '?' + qs(params))).data;
  const mapPod = p => ({ kind: 'podcast', id: 'fyyd:' + p.id, source: 'fyyd', title: trim(p.title), artist: trim(p.author), artwork: https(p.layoutImageURL) || https(p.imgURL), episodes: +p.episode_count || 0, link: https(p.htmlURL) });

  /* ---------- ListenBrainz (charts) ---------- */
  const caa = mbid => mbid ? `https://coverartarchive.org/release/${mbid}/front-250` : '';

  /* ---------- public API ---------- */
  const API = {
    version: VERSION,
    sources: ['audius', 'archive', 'hearthis', 'mixcloud', 'radio-browser', 'fyyd', 'listenbrainz', 'itunes', 'lrclib'],

    /** Search songs across sources. options.sources limits which ones (default: audius, hearthis). */
    async search(q, { sources = ['audius', 'hearthis'], limit = 30 } = {}) {
      const jobs = [];
      if (sources.includes('audius')) jobs.push(audius('/tracks/search', { query: q, limit }).then(tracksA).catch(() => []));
      if (sources.includes('hearthis')) jobs.push(hearthis('/search', { t: q, page: 1, count: limit }).catch(() => []));
      if (sources.includes('mixcloud')) jobs.push(getJSON('https://api.mixcloud.com/search/?' + qs({ q, type: 'cloudcast', limit })).then(j => (j.data || []).map(mapM)).catch(() => []));
      if (sources.includes('archive')) jobs.push(archiveSearch(q, { rows: limit }).catch(() => []));
      if (sources.includes('radio-browser')) jobs.push(rb('/json/stations/search', { name: q, limit, hidebroken: true, is_https: true, order: 'clickcount', reverse: true }).then(l => l.filter(okR).map(mapR)).catch(() => []));
      if (sources.includes('fyyd')) jobs.push(fyyd('/search/podcast', { title: q, count: limit }).then(l => (l || []).map(mapPod)).catch(() => []));
      return (await Promise.all(jobs)).flat();
    },

    /** Trending full songs on Audius. genre e.g. 'Electronic', 'Hip-Hop/Rap', 'Lo-Fi'. */
    trending: ({ genre = '', time = 'week' } = {}) => cached('tr' + genre + time, 120e3, async () => tracksA(await audius('/tracks/trending', { genre, time }))),

    /** Live radio. { country:'AT', tag:'jazz', near:{lat,lon,km}, limit } */
    async radio({ country = '', tag = '', near = null, limit = 50, order = 'clickcount' } = {}) {
      const p = { countrycode: country, tag, hidebroken: true, is_https: true, order, reverse: true, limit };
      if (near) Object.assign(p, { geo_lat: near.lat, geo_long: near.lon, geo_distance: Math.round((near.km || 100) * 1000) });
      return (await rb('/json/stations/search', p)).filter(okR).map(mapR);
    },

    archive: { search: archiveSearch, album: archiveAlbum, collections: Object.keys(IA_COLLECTIONS) },

    mixes: {
      hearthis: (type = 'popular') => hearthis('/feed/', { type, page: 1, count: 30 }),
      async mixcloud(tag = 'house') { return ((await getJSON(`https://api.mixcloud.com/discover/${encodeURIComponent(tag)}/popular/?limit=20`)).data || []).map(mapM); }
    },

    podcasts: {
      hot: ({ lang = '' } = {}) => fyyd('/feature/podcast/hot', { count: 24, language: lang }).then(l => (l || []).map(mapPod)),
      search: q => fyyd('/search/podcast', { title: q, count: 30 }).then(l => (l || []).map(mapPod)),
      async episodes(id) {
        const d = await fyyd('/podcast/episodes', { podcast_id: String(id).replace(/^fyyd:/, ''), count: 40 });
        return (d.episodes || []).filter(e => /^https:/.test(e.enclosure || '')).map(e => T({ kind: 'episode', id: 'fyyd-episode:' + e.id, source: 'fyyd', title: trim(e.title), artist: trim(d.title), artwork: https(e.imgURL) || https(d.layoutImageURL), duration: +e.duration || 0, stream: e.enclosure, link: https(e.url), date: e.pubdate }));
      }
    },

    /** World charts from real listens (ListenBrainz). range: week | month | year. No audio: use findPlayable(). */
    async charts({ range = 'week', limit = 50 } = {}) {
      const r = (await getJSON(`https://api.listenbrainz.org/1/stats/sitewide/recordings?count=${limit}&range=${range}`)).payload.recordings || [];
      return r.map((x, i) => T({ id: 'listenbrainz:' + (x.recording_mbid || i), source: 'listenbrainz', rank: i + 1, title: x.track_name, artist: x.artist_name, artwork: caa(x.caa_release_mbid), plays: x.listen_count, link: x.recording_mbid ? 'https://musicbrainz.org/recording/' + x.recording_mbid : '' }));
    },

    /** Find something playable for any {title, artist}: free full version on Audius first, else the official iTunes 30 s preview. */
    async findPlayable({ title, artist }) {
      const norm = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]|feat\..*$/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
      const same = (t, a) => { const nt = norm(title), na = norm(artist), rt = norm(t), ra = norm(a); return !!rt && !!ra && (rt.includes(nt) || nt.includes(rt)) && (ra.includes(na) || na.includes(ra)) && !/cover|remix|karaoke|instrumental|tribute/.test(rt.replace(nt, '')); };
      try { const m = tracksA(await audius('/tracks/search', { query: `${artist} ${title}`, limit: 10 })).find(t => same(t.title, t.artist)); if (m) return m; } catch { }
      const u = 'https://itunes.apple.com/search?' + qs({ term: `${artist} ${title}`, media: 'music', entity: 'song', limit: 8 });
      let j; try { j = await getJSON(u); } catch { await new Promise(r => setTimeout(r, 900)); j = await getJSON(u); } // the API rate-limits bursts
      const r = (j.results || []).find(x => x.previewUrl && same(x.trackName, x.artistName));
      return r ? T({ id: 'itunes:' + r.trackId, source: 'itunes', title: r.trackName, artist: r.artistName, artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'), duration: 30, stream: r.previewUrl, link: r.trackViewUrl, preview: true }) : null;
    },

    /** Lyrics from LRCLIB (synced if available). */
    async lyrics({ title, artist, duration }) {
      try { return await getJSON('https://lrclib.net/api/get?' + qs({ track_name: title, artist_name: artist, duration: duration ? Math.round(duration) : '' })); }
      catch { const r = await getJSON('https://lrclib.net/api/search?' + qs({ track_name: title, artist_name: artist })); return r[0] || null; }
    },

    /** Turn a link into something playable: YouTube, SoundCloud, Mixcloud (official embeds), Audius, direct https audio. */
    async resolve(link) {
      const u = new URL(link); const h = u.hostname.replace(/^www\.|^m\./, '');
      const yt = link.match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([\w-]{11})/);
      if (yt && /youtu/.test(h)) return T({ id: 'youtube:' + yt[1], source: 'youtube', title: 'YouTube video', artist: 'YouTube', artwork: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`, embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1`, link });
      if (h === 'soundcloud.com') { const o = await getJSON('https://soundcloud.com/oembed?format=json&url=' + encodeURIComponent(link)); const src = (o.html.match(/src="([^"]+)"/) || [])[1]; return T({ id: 'soundcloud:' + u.pathname, source: 'soundcloud', title: o.title, artist: o.author_name, artwork: https(o.thumbnail_url), embed: src && src.replace(/&amp;/g, '&'), link }); }
      if (h === 'mixcloud.com') return mapM(await getJSON('https://api.mixcloud.com' + (u.pathname.endsWith('/') ? u.pathname : u.pathname + '/')));
      if (h === 'audius.co') { const r = await audius('/resolve', { url: link }); return r && r.title ? mapA(r) : null; }
      if (u.protocol === 'https:') return T({ id: 'url:' + link, source: 'link', title: decodeURIComponent(u.pathname.split('/').pop() || h), artist: h, stream: link, link });
      return null;
    },

    /** Ready-made iframe player for any result (or any link). */
    embedUrl(item) {
      if (typeof item === 'string') return BASE + 'embed.html?url=' + encodeURIComponent(item);
      return BASE + 'embed.html?t=' + encodeURIComponent(JSON.stringify({ title: item.title, artist: item.artist, artwork: item.artwork, stream: item.stream, embed: item.embed, link: item.link, live: item.live, source: item.source }));
    },

    /** Pre-built JSON feeds, refreshed every hour by a GitHub Action (CORS enabled via GitHub Pages). */
    feeds: {
      index: BASE + 'api/v1/index.json',
      get: name => getJSON(BASE + 'api/v1/' + name + '.json')
    },

    /** Minimal player helper: play(result) returns the HTMLAudioElement used. */
    _audio: null,
    play(item) {
      if (!item || !item.stream) throw new Error('This result has no direct stream. Use item.embed in an iframe instead.');
      const a = API._audio || (API._audio = new Audio()); a.src = item.stream; a.play(); return a;
    },
    pause() { API._audio && API._audio.pause(); }
  };

  if (typeof module === 'object' && module.exports) module.exports = API;
  root.EmptyString = API;
})(typeof window !== 'undefined' ? window : globalThis);
