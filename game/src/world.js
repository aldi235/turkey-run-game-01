// The simulation: the turkey auto-runs right, the farm scrolls left, the
// farmer chases from behind, and hazards and pickups spawn ahead. The
// turkey's x never changes; the world moves past it. Everything here is
// pure state and numbers — drawing lives in render.js.
//
// Hazards: fences and hay bales and the glowing oven are jumped; a carving
// knife that falls from the sky sticks in the ground and is jumped too; a
// knife thrown at head height must be slid under. A hit costs a life, a
// burst of feathers, a shake, and the farmer closes in. When the farmer's
// gap reaches zero — or the lives run out — the turkey is caught. Covering
// GOAL_METRES reaches the forest and the turkey escapes.
import {
  FARMER,
  FIELD,
  GOAL_METRES,
  LEVEL,
  LIVES,
  PX_PER_METRE,
  SCORE,
  SPAWN,
  SPEED,
  TURKEY,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_FEATHER = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;
export const EVENT_CLEARED = 32;

export const KIND_FENCE = 'fence';
export const KIND_BALE = 'bale';
export const KIND_OVEN = 'oven';
export const KIND_STUCK_KNIFE = 'stuckknife';
export const KIND_FLY_KNIFE = 'flyknife';
export const KIND_CORN = 'corn';
export const KIND_FEATHER = 'feather';

/** Ground-obstacle shapes, keyed by kind: width, height above the ground. */
const GROUND_SHAPES = {
  [KIND_FENCE]: { width: 30, height: 74 },
  [KIND_BALE]: { width: 64, height: 56 },
  [KIND_OVEN]: { width: 84, height: 78 },
  [KIND_STUCK_KNIFE]: { width: 22, height: 52 },
};

function makeTurkey() {
  return {
    x: TURKEY.x,
    y: FIELD.groundY - TURKEY.standHeight,
    vy: 0,
    width: TURKEY.width,
    height: TURKEY.standHeight,
    onGround: true,
    sliding: false,
    slideTimer: 0,
    runPhase: 0,
    invulnerable: 0,
  };
}

export function createWorld(random) {
  const state = {
    score: 0,
    distance: 0,
    lives: LIVES,
    level: 1,
    speed: SPEED.start,
    elapsed: 0,
    scroll: 0,
    shake: 0,
    over: false,
    won: false,
    reason: '',
    turkey: makeTurkey(),
    farmerGap: FARMER.startGap,
    sinceHit: 99,
    spawnTimer: SPAWN.firstDelay,
    obstacles: [],
    pickups: [],
    flyKnives: [],
    fallingKnives: [],
    particles: [],
    popups: [],
    leaves: [],
  };

  function spawnLeaves() {
    state.leaves = [];
    for (let i = 0; i < 26; i += 1) {
      state.leaves.push({
        x: random.range(0, FIELD.width),
        y: random.range(-40, FIELD.height),
        size: random.range(5, 11),
        drift: random.range(12, 40),
        fall: random.range(18, 46),
        sway: random.range(0, Math.PI * 2),
        colour: random.pick(['#c96a1e', '#e08a2e', '#a34d12', '#d9b36c']),
      });
    }
  }

  function addPopup(x, y, text, colour) {
    state.popups.push({ x, y, text, colour, life: 0.9 });
  }

  function burst(x, y, colour, count, speed) {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({
        x,
        y,
        vx: random.range(-speed, speed),
        vy: random.range(-speed, -20),
        size: random.range(3, 8),
        colour,
        life: random.range(0.4, 0.8),
      });
    }
  }

  function spawnObstacle() {
    const roll = random.next();
    let kind;
    if (roll < 0.3) kind = KIND_FENCE;
    else if (roll < 0.55) kind = KIND_BALE;
    else if (roll < 0.75) kind = KIND_OVEN;
    else kind = KIND_STUCK_KNIFE;
    const shape = GROUND_SHAPES[kind];
    const x = FIELD.width + 40;
    state.obstacles.push({
      kind,
      x,
      y: FIELD.groundY - shape.height,
      width: shape.width,
      height: shape.height,
      passed: false,
      // A knife that falls from the sky first: it drops in ahead of the
      // turkey and sticks in the ground before the turkey reaches it.
      falling: kind === KIND_STUCK_KNIFE,
      fallY: kind === KIND_STUCK_KNIFE ? -60 : 0,
      fallVy: 0,
    });
    // Corn on the ground, or floating where a jump collects it.
    const cornY = random.next() < 0.45
      ? FIELD.groundY - 130
      : FIELD.groundY - 42;
    state.pickups.push({ kind: KIND_CORN, x: x + 90, y: cornY, width: 30, height: 30, taken: false, bob: random.range(0, 6) });
    if (random.next() < SPAWN.featherChance) {
      state.pickups.push({ kind: KIND_FEATHER, x: x + 190, y: FIELD.groundY - 150, width: 30, height: 30, taken: false, bob: random.range(0, 6) });
    }
  }

  function hitTurkey(events) {
    const turkey = state.turkey;
    if (turkey.invulnerable > 0 || state.over) return events;
    state.lives -= 1;
    state.sinceHit = 0;
    state.farmerGap = Math.max(0, state.farmerGap - FARMER.hitCloser);
    turkey.invulnerable = TURKEY.invulnerable;
    turkey.vy = -260;
    turkey.onGround = false;
    state.shake = 14;
    burst(turkey.x + 30, turkey.y + 30, '#e8a33c', 18, 260);
    burst(turkey.x + 30, turkey.y + 30, '#8a5230', 10, 200);
    addPopup(turkey.x + 20, turkey.y - 20, 'OUCH!', '#e5534b');
    if (state.lives <= 0 || state.farmerGap <= 0) {
      state.over = true;
      state.won = false;
      state.reason = state.farmerGap <= 0 ? 'farmer' : 'lives';
      return events | EVENT_OVER;
    }
    return events | EVENT_HIT;
  }

  function reset() {
    state.score = 0;
    state.distance = 0;
    state.lives = LIVES;
    state.level = 1;
    state.speed = SPEED.start;
    state.elapsed = 0;
    state.scroll = 0;
    state.shake = 0;
    state.over = false;
    state.won = false;
    state.reason = '';
    state.turkey = makeTurkey();
    state.farmerGap = FARMER.startGap;
    state.sinceHit = 99;
    state.spawnTimer = SPAWN.firstDelay;
    state.knifeTimer = 4.5;
    state.obstacles = [];
    state.pickups = [];
    state.flyKnives = [];
    state.fallingKnives = [];
    state.particles = [];
    state.popups = [];
    spawnLeaves();
  }

  /**
   * Advance the world one fixed step. `controls` is { jump, slide } where
   * jump is true only on the frame the key was pressed. Returns EVENT_* flags.
   */
  function step(dt, controls) {
    if (state.over) return 0;
    let events = 0;
    const turkey = state.turkey;
    state.elapsed += dt;
    state.sinceHit += dt;

    // Difficulty: speed and level grow with distance.
    state.level = Math.min(LEVEL.max, Math.floor(state.distance / LEVEL.metresPerLevel) + 1);
    state.speed = Math.min(SPEED.max, SPEED.start + (state.level - 1) * SPEED.perLevel);
    const metres = (state.speed * dt) / PX_PER_METRE;
    state.distance += metres;
    state.scroll += state.speed * dt;
    state.score += metres * SCORE.perMetre;

    // The farmer recovers ground when the turkey runs cleanly for a while.
    if (state.sinceHit > FARMER.recoverDelay && state.farmerGap < FARMER.maxGap) {
      state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + FARMER.recoverPerSecond * dt);
    }

    // Jump and slide. A jump cancels a slide, so a late call still saves
    // the turkey when a knife and a fence arrive close together.
    if (controls.jump && turkey.onGround) {
      if (turkey.sliding) {
        turkey.sliding = false;
        turkey.slideTimer = 0;
        turkey.height = TURKEY.standHeight;
        turkey.y = FIELD.groundY - TURKEY.standHeight;
      }
      turkey.vy = TURKEY.jumpVelocity;
      turkey.onGround = false;
    }
    if (controls.slide && turkey.onGround) {
      turkey.sliding = true;
      turkey.slideTimer = 0.32;
      turkey.height = TURKEY.slideHeight;
      turkey.y = FIELD.groundY - TURKEY.slideHeight;
    }
    if (turkey.slideTimer > 0) {
      turkey.slideTimer -= dt;
      if (turkey.slideTimer <= 0 && turkey.onGround) {
        turkey.sliding = false;
        turkey.height = TURKEY.standHeight;
        turkey.y = FIELD.groundY - TURKEY.standHeight;
      }
    }
    if (!turkey.onGround) {
      turkey.vy += TURKEY.gravity * dt;
      turkey.y += turkey.vy * dt;
      if (turkey.y >= FIELD.groundY - turkey.height) {
        turkey.y = FIELD.groundY - turkey.height;
        turkey.vy = 0;
        turkey.onGround = true;
        burst(turkey.x + 30, FIELD.groundY, '#c9a06a', 6, 120);
      }
    }
    turkey.runPhase += (state.speed / 60) * dt;
    if (turkey.invulnerable > 0) turkey.invulnerable -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - 40 * dt);

    // Spawn hazards and pickups.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnObstacle();
      const interval = Math.max(
        SPAWN.minInterval,
        SPAWN.interval * Math.pow(SPAWN.intervalScale, state.level - 1),
      );
      state.spawnTimer = interval * random.range(0.85, 1.2);
    }

    // Flying knives have their own timer and only ride in when no ground
    // obstacle is near, so a slide is never asked for on top of a jump.
    state.knifeTimer -= dt;
    if (state.knifeTimer <= 0) {
      state.knifeTimer = random.range(3.5, 6.5);
      const clearAhead = state.obstacles.every((ob) => ob.x < TURKEY.x || ob.x > TURKEY.x + 560);
      const clearKnives = state.flyKnives.every((knife) => knife.x < TURKEY.x || knife.x > TURKEY.x + 560);
      if (clearAhead && clearKnives) {
        state.flyKnives.push({
          x: FIELD.width + 40,
          y: FIELD.groundY - 58,
          width: 64,
          height: 18,
          spin: 0,
        });
      }
    }

    const left = state.speed * dt;
    const turkeyBox = {
      x: turkey.x + 6,
      y: turkey.y + 4,
      width: turkey.width - 12,
      height: turkey.height - 4,
    };
    const overlaps = (box) =>
      box.x < turkeyBox.x + turkeyBox.width &&
      box.x + box.width > turkeyBox.x &&
      box.y < turkeyBox.y + turkeyBox.height &&
      box.y + box.height > turkeyBox.y;

    // Ground obstacles scroll left; a stuck knife first falls from the sky.
    for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
      const ob = state.obstacles[i];
      ob.x -= left;
      if (ob.falling) {
        ob.fallVy += 1800 * dt;
        ob.fallY += ob.fallVy * dt;
        if (ob.fallY >= ob.y) {
          ob.fallY = ob.y;
          ob.falling = false;
          burst(ob.x + 10, FIELD.groundY, '#d9c9a8', 5, 100);
        }
      }
      if (ob.x + ob.width < -40) {
        state.obstacles.splice(i, 1);
        continue;
      }
      const box = { x: ob.x, y: ob.falling ? ob.fallY : ob.y, width: ob.width, height: ob.height };
      if (!ob.passed && ob.x + ob.width < turkey.x) {
        ob.passed = true;
        state.score += SCORE.cleared;
        addPopup(turkey.x + 10, turkey.y - 30, `+${SCORE.cleared}`, '#ffd94d');
        events |= EVENT_CLEARED;
      }
      if (!ob.falling && overlaps(box)) events = hitTurkey(events);
    }

    // Flying knives sweep past at head height, at the world's own speed so
    // they keep their distance behind the obstacle they rode in with: only
    // a slide ducks under one, and it never lands on top of a jump.
    for (let i = state.flyKnives.length - 1; i >= 0; i -= 1) {
      const knife = state.flyKnives[i];
      knife.x -= left;
      knife.spin += dt * 14;
      if (knife.x + knife.width < -40) {
        state.flyKnives.splice(i, 1);
        continue;
      }
      if (overlaps(knife)) events = hitTurkey(events);
    }

    // Pickups: corn for points, golden feathers for a bonus.
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const item = state.pickups[i];
      item.x -= left;
      item.bob += dt * 3;
      if (item.x + item.width < -40) {
        state.pickups.splice(i, 1);
        continue;
      }
      if (!item.taken && overlaps({ x: item.x, y: item.y, width: item.width, height: item.height })) {
        item.taken = true;
        if (item.kind === KIND_CORN) {
          state.score += SCORE.corn;
          addPopup(item.x, item.y - 14, `+${SCORE.corn}`, '#f2c94c');
          events |= EVENT_PICKUP;
        } else {
          state.score += SCORE.feather;
          addPopup(item.x, item.y - 14, `+${SCORE.feather} FEATHER!`, '#ffd94d');
          burst(item.x + 15, item.y + 15, '#ffd94d', 12, 180);
          events |= EVENT_FEATHER;
        }
        state.pickups.splice(i, 1);
      }
    }

    // Leaves drift down and across; particles and popups fade.
    for (const leaf of state.leaves) {
      leaf.sway += dt;
      leaf.x -= (state.speed * 0.12 + leaf.drift) * dt + Math.sin(leaf.sway * 2) * 12 * dt;
      leaf.y += leaf.fall * dt;
      if (leaf.y > FIELD.height + 12) {
        leaf.y = -12;
        leaf.x = random.range(0, FIELD.width);
      }
      if (leaf.x < -12) leaf.x = FIELD.width + 10;
    }
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const popup = state.popups[i];
      popup.y -= 34 * dt;
      popup.life -= dt;
      if (popup.life <= 0) state.popups.splice(i, 1);
    }

    // Reaching the forest is the win.
    if (state.distance >= GOAL_METRES) {
      state.over = true;
      state.won = true;
      state.reason = 'escaped';
      return events | EVENT_OVER | EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
