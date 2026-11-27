// The screenshot scenes behind ?shot=start|play|caught|escaped. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (jump the ground obstacle ahead,
// slide under the flying knife), so the frame is what a short game really
// looks like and the same seed always gives the same frame. The caught
// scene's pilot is deliberately clumsy, so the farmer catches the turkey;
// the escaped scene starts a hair from the forest and the pilot runs it home.
import { FIELD, GOAL_METRES, STEP, TURKEY } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 24;
const CAUGHT_LIMIT_SECONDS = 600;

function nearestHazard(state) {
  let best = null;
  let bestX = Infinity;
  for (const ob of state.obstacles) {
    if (ob.falling) continue;
    if (ob.x + ob.width > state.turkey.x - 10 && ob.x < bestX) {
      best = { kind: 'ground', x: ob.x, width: ob.width, height: ob.height };
      bestX = ob.x;
    }
  }
  for (const knife of state.flyKnives) {
    if (knife.x + knife.width > state.turkey.x - 10 && knife.x < bestX) {
      best = { kind: 'fly', x: knife.x, width: knife.width };
      bestX = knife.x;
    }
  }
  return best;
}

/**
 * Jump for ground hazards, slide for flying knives, nothing otherwise.
 * The jump is timed per obstacle from the jump arc itself: jump late
 * enough that the obstacle arrives only once the turkey has risen above
 * its height, and early enough that it has passed before the turkey
 * descends back below that height.
 */
function autopilot(state, skill) {
  if (skill === 0) return { jump: false, slide: false };
  const turkey = state.turkey;
  const hazard = nearestHazard(state);
  if (!hazard) return { jump: false, slide: false };
  const gap = hazard.x - (turkey.x + turkey.width);
  if (hazard.kind === 'fly') {
    // Keep sliding until the knife has fully passed the turkey.
    return { jump: false, slide: gap < 150 * skill && gap > -130 };
  }
  const v = -TURKEY.jumpVelocity;
  const g = TURKEY.gravity;
  const disc = Math.sqrt(Math.max(0, v * v - 2 * g * hazard.height));
  const rise = (v - disc) / g;
  const descend = (v + disc) / g;
  // A step of margin: the obstacle must be clear before the turkey drops
  // back to the obstacle's height, with room for the fixed-step integration.
  const jumpAt = descend * state.speed - 56 - hazard.width - 25;
  const jumpAfter = rise * state.speed - 6;
  return { jump: gap < jumpAt * skill && gap > jumpAfter && turkey.onGround, slide: false };
}

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'caught' && name !== 'escaped') {
    // The title's backdrop is a live run, steered so the turkey survives it.
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, autopilot(world.state, 1));
    return { screen: SCREEN_TITLE, best: { distance: 640, score: 8120 } };
  }
  if (name === 'escaped') {
    // A hair from the forest: the pilot runs the last stretch home.
    world.state.distance = GOAL_METRES - 18;
    world.state.score = 11980;
    for (let i = 0; i < 60 / STEP; i += 1) {
      const events = world.step(STEP, autopilot(world.state, 1));
      if (events & EVENT_WIN) break;
    }
    return { screen: SCREEN_OVER, best: { distance: world.state.distance, score: world.state.score } };
  }
  const limit = name === 'caught' ? CAUGHT_LIMIT_SECONDS : PLAY_SECONDS;
  // The play pilot is sharp; the caught pilot never jumps or slides at all,
  // and it starts one hit from the farmer's grasp, so the scene ends caught.
  const skill = name === 'caught' ? 0 : 1;
  if (name === 'caught') {
    world.state.lives = 1;
    world.state.farmerGap = 45;
  }
  for (let i = 0; i < limit / STEP; i += 1) {
    if (world.step(STEP, autopilot(world.state, skill)) & EVENT_OVER) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: { distance: world.state.distance, score: world.state.score } };
}
