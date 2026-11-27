// Every tuning number and colour for Gobble Dash in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Metres of escape the turkey must cover to reach the forest. */
export const GOAL_METRES = 1200;
/** Pixels of scrolling that count as one metre. */
export const PX_PER_METRE = 25;

export const TURKEY = {
  x: 220,
  width: 62,
  standHeight: 64,
  slideHeight: 30,
  jumpVelocity: -950,
  gravity: 2100,
  invulnerable: 1.6,
};

export const FARMER = {
  width: 66,
  height: 96,
  startGap: 150,
  maxGap: 170,
  hitCloser: 48,
  recoverPerSecond: 12,
  recoverDelay: 4,
};

export const LIVES = 3;

export const SPEED = { start: 265, perLevel: 24, max: 560 };
export const LEVEL = { metresPerLevel: 150, max: 12 };

export const SPAWN = {
  firstDelay: 1.1,
  interval: 1.15,
  intervalScale: 0.93,
  minInterval: 0.5,
  featherChance: 0.16,
};

export const SCORE = {
  perMetre: 1,
  corn: 10,
  feather: 50,
  cleared: 5,
};

export const PALETTE = {
  backdrop: '#2b1d12',
  skyTop: '#f7b733',
  skyMid: '#fc9d6d',
  skyBottom: '#fde3a7',
  sun: '#fff3b0',
  sunCore: '#ffe066',
  hillFar: '#b98a4e',
  hillNear: '#8a5a2b',
  ground: '#7a4a21',
  groundTop: '#a06a35',
  grass: '#c98a3d',
  barn: '#a63a2e',
  barnRoof: '#6e2a20',
  barnTrim: '#f3e2c7',
  treeTrunk: '#5d3a1a',
  treeLeaf: '#c96a1e',
  treeLeaf2: '#e08a2e',
  treeLeaf3: '#a34d12',
  fence: '#8a5a2b',
  turkeyBody: '#8a5230',
  turkeyWing: '#6e3f22',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#7a3b1e', '#c96a1e'],
  head: '#e8e2d5',
  beak: '#f2a93b',
  wattle: '#e5534b',
  snood: '#d64541',
  leg: '#f2a93b',
  farmerShirt: '#4a7ab5',
  farmerOveralls: '#3b5a8a',
  farmerHat: '#d9b36c',
  farmerSkin: '#e8b98a',
  pitchfork: '#8a8f98',
  knifeBlade: '#dfe3ea',
  knifeHandle: '#3a2a1a',
  oven: '#3d3d46',
  ovenGlow: '#ff7a1a',
  ovenFire: '#ffc233',
  bale: '#e0aa4e',
  baleBand: '#b57f2a',
  corn: '#f2c94c',
  cornHusk: '#5da24a',
  feather: '#ffd94d',
  panel: '#2b1d12',
  panelEdge: '#f2c94c',
  text: '#fff6e0',
  darkText: '#2b1d12',
  muted: '#d9c9a8',
  heart: '#e5534b',
  heartEmpty: '#5a4632',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best distance / score are kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
