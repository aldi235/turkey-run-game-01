// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens:
// title, play, paused and game over (caught or escaped).
//
// ?seed=N fixes the farm's pattern. ?shot=start|play|caught|escaped (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot. ?selftest=1 runs a scripted
// check of the real rules in the browser and writes the results into the
// #status line and window.__testResult.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_FEATHER, EVENT_HIT, EVENT_OVER, EVENT_PICKUP, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { buttonAt, createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const selftest = params.get('selftest') === '1';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? 'null');
    if (raw && typeof raw.distance === 'number') return raw;
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
  return { distance: 0, score: 0 };
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(value));
  } catch {
    // Ignore: best score is a nicety, not the game.
  }
}

/** Scripted check of the real rules: start, jump, slide, pickup, hit, win, restart. */
function runSelftest() {
  const results = {};
  const check = (name, ok) => {
    results[name] = ok ? 'pass' : 'FAIL';
  };
  world.reset();
  check('reset-lives', world.state.lives === LIVES);
  check('reset-distance', world.state.distance === 0);
  // The turkey runs and the distance grows.
  for (let i = 0; i < 60; i += 1) world.step(STEP, { jump: false, slide: false });
  check('distance-grows', world.state.distance > 5);
  check('score-grows', world.state.score > 0);
  // A jump leaves the ground and lands again.
  world.step(STEP, { jump: true, slide: false });
  check('jump-lifts', !world.state.turkey.onGround && world.state.turkey.y < 620 - 64);
  for (let i = 0; i < 90; i += 1) world.step(STEP, { jump: false, slide: false });
  check('jump-lands', world.state.turkey.onGround);
  // Sliding shortens the turkey.
  world.step(STEP, { jump: false, slide: true });
  check('slide-shortens', world.state.turkey.height === 30);
  // A corn cob in the turkey's path is collected.
  world.state.pickups.push({ kind: 'corn', x: world.state.turkey.x + 10, y: world.state.turkey.y + 10, width: 30, height: 30, taken: false, bob: 0 });
  const before = world.state.score;
  const events = world.step(STEP, { jump: false, slide: false });
  check('corn-pickup', (events & EVENT_PICKUP) !== 0 && world.state.score >= before + 10);
  // A fence in the turkey's path costs a life.
  world.state.turkey.invulnerable = 0;
  world.state.obstacles.push({ kind: 'fence', x: world.state.turkey.x + 10, y: 620 - 74, width: 30, height: 74, passed: false, falling: false, fallY: 0, fallVy: 0 });
  const livesBefore = world.state.lives;
  const hitEvents = world.step(STEP, { jump: false, slide: false });
  check('hit-costs-life', (hitEvents & EVENT_HIT) !== 0 && world.state.lives === livesBefore - 1);
  check('hit-shakes', world.state.shake > 0);
  // The forest is the win: one metre out, the turkey escapes.
  world.reset();
  world.state.distance = 1199.5;
  let winEvents = 0;
  for (let i = 0; i < 120 && !(winEvents & EVENT_WIN); i += 1) {
    winEvents |= world.step(STEP, { jump: false, slide: false });
  }
  check('escape-wins', (winEvents & EVENT_WIN) !== 0 && world.state.won && world.state.over);
  // Losing the last life is the caught end.
  world.reset();
  world.state.lives = 1;
  world.state.turkey.invulnerable = 0;
  world.state.obstacles.push({ kind: 'fence', x: world.state.turkey.x + 10, y: 620 - 74, width: 30, height: 74, passed: false, falling: false, fallY: 0, fallVy: 0 });
  const overEvents = world.step(STEP, { jump: false, slide: false });
  check('caught-ends', (overEvents & EVENT_OVER) !== 0 && world.state.over && !world.state.won);
  // A fresh reset after the end is a clean new run.
  world.reset();
  check('restart-clean', !world.state.over && world.state.lives === LIVES && world.state.distance === 0);
  const passed = Object.values(results).every((value) => value === 'pass');
  window.__testResult = { passed, results };
  status.textContent = `SELFTEST ${passed ? 'PASS' : 'FAIL'} ${JSON.stringify(results)}`;
  document.title = `SELFTEST ${passed ? 'PASS' : 'FAIL'}`;
}

if (selftest) {
  runSelftest();
  renderer.draw(world.state, SCREEN_TITLE, readBest(), false);
  window.__shotReady = true;
} else if (shot) {
  const scene = stageShot(shot, world);
  let painted = 0;
  const paint = () => {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  runGame();
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toField(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // A handle for live play-testing (and for anyone poking at the game in
  // the console): the current screen and the world itself. It changes
  // nothing about how the game plays.
  window.__gobbleDash = { world, screen: () => screen };

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.gobble();
    announce(`Playing. ${LIVES} lives. Run ${1200} metres to the forest.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.distance > best.distance) best.distance = world.state.distance;
    if (world.state.score > best.score) best.score = world.state.score;
    saveBest(best);
    if (world.state.won) {
      audio.jingle();
      announce(`Escaped! Score ${Math.floor(world.state.score)}. Best ${Math.floor(best.score)}.`);
    } else {
      audio.caught();
      announce(`Caught! Score ${Math.floor(world.state.score)}. Best ${Math.floor(best.score)}.`);
    }
  }

  function handleClick(click) {
    if (!click) return false;
    const button = buttonAt(screen, click.x, click.y);
    if (button === 'start' || button === 'restart') {
      startGame();
      return true;
    }
    if (button === 'resume') {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return true;
    }
    if (button === 'pause') {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return true;
    }
    if (button === 'mute') {
      audio.toggleMute();
      return true;
    }
    // A click anywhere on the title or end screen starts the run.
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return true;
    }
    return false;
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const actions = input.takeActions();
    const click = input.takeClick();
    const jumpPressed = input.takeJump();
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (click) {
        handleClick(click);
      } else if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        startGame();
      }
    } else if (click) {
      handleClick(click);
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      // Jump is an edge: only the first step of this frame may take it.
      let jump = jumpPressed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, { jump, slide: input.slideHeld() });
        jump = false;
        if (events & EVENT_HIT) {
          audio.thud();
          announce(`Hit! ${world.state.lives} lives left.`);
        }
        if (events & EVENT_PICKUP) audio.cluck();
        if (events & EVENT_FEATHER) audio.cluck();
        if (events & EVENT_OVER) endGame();
      }
    }
    renderer.draw(world.state, screen, best, audio.isMuted());
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
