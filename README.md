# 🦃 Gobble Dash — The Great Turkey Escape

[![make.fun](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![Competition](https://make.fun/badge-competition/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)

A 2D side-scrolling turkey escape game, built for make.fun's
**"Make the best turkey escape game"** bounty ($250 in USDC).

Thanksgiving morning. The oven is hot, the carving knives are out, and the
farmer is right behind you with his pitchfork. Run **1,200 metres** through
the autumn farm — jump fences, hay bales and the glowing oven, slide under
flying carving knives, grab corn and golden feathers — and reach the forest
before the farmer catches you.

## How to play

- **Space / ↑ / W** — jump
- **↓ / S** — slide under flying knives (a jump also cancels a slide)
- **P / Esc** — pause · **M** — mute · **Click** the on-screen buttons
- 3 lives. Every hit costs a life and lets the farmer close in — if he
  reaches you, you're caught. Reach the forest and you escape.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no libraries — plain Canvas 2D and
synthesized WebAudio (gobbles, clucks, thuds, a escape jingle). Best distance
and score are kept in `localStorage`.

## Structure

| File | Job |
| --- | --- |
| `game/index.html` | Page shell, canvas, status line |
| `game/src/config.js` | Tuning numbers, palette, field size |
| `game/src/random.js` | Deterministic random source (seeded farm) |
| `game/src/input.js` | Keyboard + pointer input, action queue |
| `game/src/audio.js` | Synthesized WebAudio sounds, mute |
| `game/src/world.js` | Simulation: running, jumping, hazards, farmer, scoring |
| `game/src/render.js` | All drawing: turkey, farmer, farm, HUD, screens |
| `game/src/shots.js` | Screenshot scenes (title / play / caught / escaped) |
| `game/src/main.js` | Boot, game loop, screens, self-test |
| `main.ts` | Hands the game in: copies `game/` + `screenshots/` to `/output` and writes `dossier.json` |

Screenshots are real renders of the game's own code, staged with
`?shot=start|play|caught|escaped&seed=1`. A scripted rules check runs at
`?selftest=1`.
