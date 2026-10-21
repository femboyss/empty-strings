# empty.string

Music app prototype for a design course. Full-length songs, live radio and synced lyrics, loaded live from free public APIs. No account, no API key.

- Live app: https://femboyss.github.io/empty-strings/
- Wireframes, user flow and API map: https://femboyss.github.io/empty-strings/wireframes.html

On a phone it runs full screen like an app. On a desktop (window 900px+) it switches to a full website layout with sidebar and player bar; small desktop windows get a scaled phone preview.

## Sources

| Source | Used for | Docs |
| --- | --- | --- |
| Audius | Full songs, charts, artists, playlists | https://docs.audius.org/ |
| Internet Archive | Full netlabel albums (Creative Commons) | https://archive.org/developers/ |
| Radio Browser | Live radio stations worldwide | https://docs.radio-browser.info/ |
| LRCLIB | Time-synced lyrics | https://lrclib.net/docs |

All four allow browser requests (CORS) and need no key. Each extra source can be switched off in Settings -> Sources, which also shows a live latency check.

## Features (v2.0)

- Home: trending hero, genre chips, running playlists, underground, live radio, Archive releases
- Search: songs (with filters), albums (Audius + Archive), artists, radio stations
- Radio tab: trending stations, country and genre filters
- Player: queue, shuffle/repeat, 5-band equalizer with presets, synced lyrics, sleep timer with fade-out
- Library on the device: liked songs, saved albums, followed artists, own playlists (drag to reorder)
- Keyboard shortcuts on desktop: Space, arrows, N, P, L, Y, Q, /, Esc

Radio streams that do not allow audio processing play on a second audio element, so they work, but the EQ is bypassed for them.
