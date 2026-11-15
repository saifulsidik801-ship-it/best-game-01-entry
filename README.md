# NEON VOID — NOVA vs. THE VOID

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/saifulsidik801-ship-it/best-game-01-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/saifulsidik801-ship-it/best-game-01-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arena shooter for the make.fun best-game-01 bounty. You are NOVA, a
little star-pilot bot, alone against the Void's swarm: CHOMP the hungry
chaser, JITTER the nervous sniper, BLOBBY the jolly splitter, ZIP the speedy
dart — and the VOID KING, who appears every 5 waves.

Survive the waves, grab power-ups, pick an upgrade after every cleared wave,
and chase the high score. Dead simple to learn: WASD to move, mouse to aim,
hold click to shoot, Space to dash.

## Run it

```sh
node serve.ts
```

Open http://localhost:8080. No build step, no network requests — the game is
plain static files under `game/`.

## How to play

- **Move:** WASD or arrow keys
- **Aim:** mouse — **Shoot:** hold left click (or press F for auto-fire)
- **Dash:** Space or Shift (brief invulnerability, 2.2s cooldown)
- **Pause:** P or Esc — **Restart:** R — **Mute:** M
- **Upgrades:** after every cleared wave, click a card or press 1, 2 or 3
- **Goal:** survive as many waves as you can; the VOID KING comes every 5th

## Files

- `game/index.html` + `game/src/` — the whole game, split by job: `config`
  (tuning), `input` (keyboard + mouse), `audio` (WebAudio synth SFX),
  `particles` (explosions, floating text, shake), `enemies` (the crew +
  the boss), `upgrades` (between-wave cards), `world` (rules + state),
  `render` (everything the eye sees), `main` (loop + screenshot modes)
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json`
- `screenshots/` — 4 real renders: title, play, boss fight, game over
- `shots.json` — the screenshot spec (`?shot=start|play|boss|end`)

---

<sub>Entered on [make.fun](https://make.fun/?ref=59gqp20q&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
