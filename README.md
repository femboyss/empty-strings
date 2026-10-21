# empty.string

Music app prototype for a design course. Full-length songs, live radio, podcasts, world charts and synced lyrics, loaded live from free public APIs. No account, no API key. Installable as an app (PWA).

- Live app: https://femboyss.github.io/empty-strings/
- Wireframes, user flow and API map: https://femboyss.github.io/empty-strings/wireframes.html

On a phone it runs full screen like an app. On a desktop (window 900px+) it switches to a full website layout with sidebar and player bar; small desktop windows get a scaled phone preview.

## Sources

| Source | Used for | Docs |
| --- | --- | --- |
| Audius | Full songs, charts, artists, playlists | https://docs.audius.org/ |
| Internet Archive | Full netlabel albums (Creative Commons) | https://archive.org/developers/ |
| Radio Browser | Live radio stations worldwide | https://docs.radio-browser.info/ |
| LRCLIB + lyrics.ovh | Time-synced lyrics, plain lyrics as fallback | https://lrclib.net/docs |
| fyyd | Podcast directory: hot podcasts, search, full episodes | https://github.com/eazyliving/fyyd-api |
| ListenBrainz | Live world charts and fresh releases | https://listenbrainz.readthedocs.io/ |
| Cover Art Archive | Covers for charts and releases | https://musicbrainz.org/doc/Cover_Art_Archive/API |
| iTunes Search | 30 s previews when a chart song has no free full version | https://performance-partners.apple.com/search-api |
| Wikipedia | Short artist bios | https://en.wikipedia.org/api/rest_v1/ |
| hearthis.at | Full tracks and DJ mixes | https://hearthis.at/api-v2/ |
| Mixcloud | DJ mixes and shows (official widget) | https://www.mixcloud.com/developers/ |
| KEXP + NTS | Live radio with now playing | https://api.kexp.org/v2/ |
| OpenStreetMap + Leaflet | Map for Garden | https://operations.osmfoundation.org/policies/tiles/ |
| oEmbed (YouTube, SoundCloud) | Play pasted links in the official players | https://oembed.com |

All of them allow browser requests (CORS) and need no key. Each extra source can be switched off in Settings -> Sources, which also shows a live latency check.

## empty.string API

Other apps and websites can use empty.string too: https://femboyss.github.io/empty-strings/api.html

- JavaScript SDK: `api/empty-string.js` (search, trending, radio, podcasts, charts, archive, mixes, lyrics, link resolving)
- JSON feeds in `api/v1/`, rebuilt every hour by `.github/workflows/api.yml` (`node scripts/build-api.mjs`)
- Embeddable player: `embed.html?url=...` or `embed.html?feed=trending&i=0`

## Install as an app

Open the site in Chrome, Edge or Safari and use "Install app" / "Add to Home Screen" (also in Settings -> App). It then runs full screen with its own icon, and the app shell works offline. Music always streams live.

## Features (v2.2)

- Home: trending hero, genre chips, running playlists, underground, live radio, Archive releases
- Search: songs (with filters), albums (Audius + Archive), artists, radio stations
- Explore tab: world charts (week / month / year), fresh releases, hot podcasts (Deutsch / English), live concerts and 78rpm records from the Internet Archive, trending Audius playlists
- Radio tab: Garden (live stations on a world map, random spot, near me), live picks with now playing (KEXP, NTS), trending stations, country and genre filters
- Mixes: hearthis.at and Mixcloud in Search and Explore; paste YouTube, SoundCloud, Mixcloud, Audius, archive.org or MP3 links into Search
- Podcasts: search and full episodes; chart songs play a free full version if one exists, otherwise the official 30 s preview
- Player: queue, shuffle/repeat, 5-band equalizer with presets, synced lyrics, sleep timer with fade-out
- Library on the device: liked songs, saved albums, followed artists, own playlists (drag to reorder)
- Keyboard shortcuts on desktop: Space, arrows, N, P, L, Y, Q, /, Esc

Radio streams that do not allow audio processing play on a second audio element, so they work, but the EQ is bypassed for them.
