// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the
// margin filled with the backdrop colour. All art is flat canvas shapes
// drawn in code: a running turkey, a farmer with a pitchfork, the autumn
// farm scrolling past in parallax layers, the glowing oven, falling and
// flying carving knives, corn and golden feathers.
import { FIELD, FONT, GOAL_METRES, LIVES, PALETTE } from './config.js';
import {
  KIND_BALE,
  KIND_CORN,
  KIND_FEATHER,
  KIND_FENCE,
  KIND_OVEN,
  KIND_STUCK_KNIFE,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** On-screen buttons, in playfield coordinates, by screen. */
export const BUTTONS = {
  title: [{ id: 'start', x: 490, y: 580, width: 300, height: 72, label: '▶  START THE ESCAPE' }],
  play: [
    { id: 'pause', x: 1156, y: 14, width: 52, height: 40, label: 'II' },
    { id: 'mute', x: 1096, y: 14, width: 52, height: 40, label: '♪' },
  ],
  paused: [{ id: 'resume', x: 490, y: 440, width: 300, height: 64, label: '▶  RESUME' }],
  over: [{ id: 'restart', x: 490, y: 500, width: 300, height: 72, label: '↻  RUN AGAIN' }],
};

/** Which button (if any) sits at playfield point x, y on this screen. */
export function buttonAt(screen, x, y) {
  const list = BUTTONS[screen] || [];
  for (const button of list) {
    if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
      return button.id;
    }
  }
  return null;
}

const PANEL = { width: 640, top: 120, line: 36, bottom: 64 };

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  /** Convert a client pixel into playfield coordinates. */
  function toField(clientX, clientY) {
    return {
      x: (clientX * (window.devicePixelRatio || 1) - view.x) / view.scale,
      y: (clientY * (window.devicePixelRatio || 1) - view.y) / view.scale,
    };
  }

  function text(value, x, y, size, color, align = 'left', weight = 700) {
    if (!fonts.has(size + weight)) fonts.set(size + weight, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(size + weight);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'top';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function drawButton(button, pressed) {
    context.fillStyle = pressed ? '#c98a1e' : '#f2c94c';
    roundRect(button.x, button.y, button.width, button.height, 12);
    context.fill();
    context.strokeStyle = '#7a4a21';
    context.lineWidth = 3;
    context.stroke();
    text(button.label, button.x + button.width / 2, button.y + button.height / 2 - 13, 22, PALETTE.darkText, 'center');
  }

  function drawSky(scroll) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // Low Thanksgiving sun.
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(1050, 110, 58, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.sunCore;
    context.beginPath();
    context.arc(1050, 110, 42, 0, Math.PI * 2);
    context.fill();
    // Slow clouds.
    context.fillStyle = 'rgba(255, 246, 224, 0.85)';
    for (let i = 0; i < 4; i += 1) {
      const cx = (((i * 340 - scroll * 0.05) % (FIELD.width + 300)) + FIELD.width + 300) % (FIELD.width + 300) - 150;
      const cy = 70 + i * 42;
      context.beginPath();
      context.ellipse(cx, cy, 70, 20, 0, 0, Math.PI * 2);
      context.ellipse(cx + 44, cy + 6, 52, 16, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawBarn(x, baseY, scale) {
    context.fillStyle = PALETTE.barn;
    context.fillRect(x, baseY - 150 * scale, 190 * scale, 150 * scale);
    context.fillStyle = PALETTE.barnRoof;
    context.beginPath();
    context.moveTo(x - 12 * scale, baseY - 150 * scale);
    context.lineTo(x + 95 * scale, baseY - 215 * scale);
    context.lineTo(x + 202 * scale, baseY - 150 * scale);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.barnTrim;
    context.fillRect(x + 70 * scale, baseY - 96 * scale, 50 * scale, 96 * scale);
    context.strokeStyle = PALETTE.barnTrim;
    context.lineWidth = 4 * scale;
    context.beginPath();
    context.moveTo(x + 70 * scale, baseY - 96 * scale);
    context.lineTo(x + 120 * scale, baseY);
    context.moveTo(x + 120 * scale, baseY - 96 * scale);
    context.lineTo(x + 70 * scale, baseY);
    context.stroke();
    context.fillStyle = PALETTE.barnTrim;
    context.fillRect(x + 78 * scale, baseY - 138 * scale, 34 * scale, 26 * scale);
  }

  function drawTree(x, baseY, scale, phase) {
    context.fillStyle = PALETTE.treeTrunk;
    context.fillRect(x - 7 * scale, baseY - 90 * scale, 14 * scale, 90 * scale);
    const colours = [PALETTE.treeLeaf, PALETTE.treeLeaf2, PALETTE.treeLeaf3];
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = colours[(i + phase) % 3];
      context.beginPath();
      context.arc(x + (i - 1) * 26 * scale, baseY - (100 + i * 22) * scale, 34 * scale, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawFenceRun(x, baseY, length) {
    context.fillStyle = PALETTE.fence;
    for (let px = x; px < x + length; px += 46) {
      context.fillRect(px, baseY - 44, 8, 44);
    }
    context.fillRect(x, baseY - 40, length, 6);
    context.fillRect(x, baseY - 22, length, 6);
  }

  function drawField(state) {
    const scroll = state.scroll;
    drawSky(scroll);
    // Far hills.
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      const wx = x + scroll * 0.1;
      context.lineTo(x, FIELD.groundY - 90 - Math.sin(wx * 0.004) * 46);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    // A red barn and autumn trees drift past slowly (parallax 0.25).
    const barnX = 980 - ((scroll * 0.25) % 1900);
    drawBarn(barnX, FIELD.groundY, 0.9);
    for (let i = 0; i < 5; i += 1) {
      const treeX = ((i * 330 + 120 - scroll * 0.25) % 1500 + 1500) % 1500 - 110;
      drawTree(treeX, FIELD.groundY, 0.9 + (i % 2) * 0.25, i);
    }
    // Near fence line (parallax 0.6).
    const fenceOffset = (scroll * 0.6) % 92;
    drawFenceRun(-fenceOffset, FIELD.groundY, FIELD.width + 92);
    // Ground.
    context.fillStyle = PALETTE.groundTop;
    context.fillRect(0, FIELD.groundY, FIELD.width, 10);
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY + 10, FIELD.width, FIELD.height - FIELD.groundY - 10);
    context.fillStyle = PALETTE.grass;
    const grassOffset = scroll % 64;
    for (let x = -grassOffset; x < FIELD.width; x += 64) {
      context.beginPath();
      context.moveTo(x, FIELD.groundY + 10);
      context.lineTo(x + 8, FIELD.groundY + 2);
      context.lineTo(x + 16, FIELD.groundY + 10);
      context.closePath();
      context.fill();
    }
  }

  /** The turkey: a fan of tail feathers, a plump brown body, flapping wing, running legs. */
  function drawTurkey(turkey) {
    const cx = turkey.x + turkey.width / 2;
    const base = turkey.y + turkey.height;
    const run = turkey.runPhase;
    const legSwing = turkey.onGround ? Math.sin(run * 10) * 12 : 6;
    const bob = turkey.onGround ? Math.abs(Math.sin(run * 10)) * 3 : 0;
    const bodyY = base - turkey.height / 2 - bob;
    if (turkey.sliding) {
      // Low and long: beak forward, tail tucked.
      context.fillStyle = PALETTE.turkeyBody;
      context.beginPath();
      context.ellipse(cx, base - 14, 34, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.head;
      context.beginPath();
      context.arc(cx + 32, base - 18, 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.beak;
      context.beginPath();
      context.moveTo(cx + 40, base - 20);
      context.lineTo(cx + 54, base - 16);
      context.lineTo(cx + 40, base - 12);
      context.closePath();
      context.fill();
      return;
    }
    // Tail fan, fanned behind.
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.PI + (i - 2) * 0.34;
      context.fillStyle = PALETTE.tail[i];
      context.beginPath();
      context.ellipse(cx - 26 + Math.cos(angle) * 26, bodyY - 6 + Math.sin(angle) * 26, 12, 26, angle - Math.PI / 2, 0, Math.PI * 2);
      context.fill();
    }
    // Legs.
    context.strokeStyle = PALETTE.leg;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(cx - 8, base - 12);
    context.lineTo(cx - 8 + legSwing, base);
    context.moveTo(cx + 8, base - 12);
    context.lineTo(cx + 8 - legSwing, base);
    context.stroke();
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(cx, bodyY, 26, 24, 0, 0, Math.PI * 2);
    context.fill();
    // Wing, flapping as it runs.
    const flap = turkey.onGround ? Math.sin(run * 10) * 5 : -8;
    context.fillStyle = PALETTE.turkeyWing;
    context.beginPath();
    context.ellipse(cx - 4, bodyY + 2 + flap, 15, 11, -0.4, 0, Math.PI * 2);
    context.fill();
    // Head, beak, wattle, snood.
    context.fillStyle = PALETTE.head;
    context.beginPath();
    context.arc(cx + 16, bodyY - 30, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(cx + 26, bodyY - 32);
    context.lineTo(cx + 40, bodyY - 28);
    context.lineTo(cx + 26, bodyY - 24);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(cx + 24, bodyY - 18, 5, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.snood;
    context.fillRect(cx + 20, bodyY - 44, 4, 10);
    context.fillStyle = '#2b1d12';
    context.beginPath();
    context.arc(cx + 20, bodyY - 33, 2.5, 0, Math.PI * 2);
    context.fill();
  }

  /** The farmer, chasing from behind with a pitchfork and a very red face. */
  function drawFarmer(state) {
    const turkey = state.turkey;
    const gap = state.farmerGap;
    const x = turkey.x - gap - 30;
    if (x + 66 < -20) return;
    const base = FIELD.groundY;
    const run = turkey.runPhase * 1.1;
    const legSwing = Math.sin(run * 10) * 14;
    const bob = Math.abs(Math.sin(run * 10)) * 3;
    // Legs (overalls).
    context.strokeStyle = PALETTE.farmerOveralls;
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(x + 22, base - 44);
    context.lineTo(x + 22 + legSwing, base);
    context.moveTo(x + 38, base - 44);
    context.lineTo(x + 38 - legSwing, base);
    context.stroke();
    // Body: shirt and overalls.
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(x + 12, base - 78 - bob, 36, 38);
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(x + 12, base - 52 - bob, 36, 14);
    // Arm reaching forward with the pitchfork.
    context.strokeStyle = PALETTE.farmerSkin;
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(x + 44, base - 66 - bob);
    context.lineTo(x + 66, base - 58 - bob);
    context.stroke();
    context.strokeStyle = PALETTE.pitchfork;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x + 66, base - 84 - bob);
    context.lineTo(x + 66, base - 34 - bob);
    context.stroke();
    context.beginPath();
    context.moveTo(x + 60, base - 84 - bob);
    context.lineTo(x + 60, base - 66 - bob);
    context.moveTo(x + 66, base - 84 - bob);
    context.lineTo(x + 66, base - 66 - bob);
    context.moveTo(x + 72, base - 84 - bob);
    context.lineTo(x + 72, base - 66 - bob);
    context.stroke();
    // Head and straw hat.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(x + 30, base - 88 - bob, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(x + 30, base - 96 - bob, 24, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(x + 18, base - 108 - bob, 24, 12);
    // Angry moustache.
    context.fillStyle = '#5d3a1a';
    context.fillRect(x + 34, base - 84 - bob, 12, 4);
  }

  function drawKnifeBlade(x, y, width, height, angle) {
    context.save();
    context.translate(x + width / 2, y + height / 2);
    context.rotate(angle);
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(-width / 2, -height / 2, width * 0.32, height * 0.3);
    context.fillStyle = PALETTE.knifeBlade;
    context.beginPath();
    context.moveTo(-width / 2 + width * 0.32, -height / 2);
    context.lineTo(width / 2, -height * 0.1);
    context.lineTo(width / 2 - 8, height / 2);
    context.lineTo(-width / 2 + width * 0.32, height / 2);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawObstacle(ob) {
    const y = ob.falling ? ob.fallY : ob.y;
    if (ob.kind === KIND_FENCE) {
      context.fillStyle = PALETTE.fence;
      context.fillRect(ob.x, y + 8, 6, ob.height - 8);
      context.fillRect(ob.x + ob.width - 6, y + 8, 6, ob.height - 8);
      context.fillRect(ob.x - 4, y + 14, ob.width + 8, 7);
      context.fillRect(ob.x - 4, y + 38, ob.width + 8, 7);
    } else if (ob.kind === KIND_BALE) {
      context.fillStyle = PALETTE.bale;
      context.beginPath();
      context.ellipse(ob.x + ob.width / 2, y + ob.height / 2, ob.width / 2, ob.height / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.baleBand;
      context.lineWidth = 4;
      context.beginPath();
      context.ellipse(ob.x + ob.width / 2, y + ob.height / 2, ob.width / 2 - 8, ob.height / 2 - 8, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = 'rgba(122, 74, 33, 0.6)';
      context.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) {
        context.beginPath();
        context.moveTo(ob.x + ob.width / 2 + i * 10, y + 8);
        context.lineTo(ob.x + ob.width / 2 + i * 8, y + ob.height - 8);
        context.stroke();
      }
    } else if (ob.kind === KIND_OVEN) {
      // The glowing oven: the thing the turkey is running from.
      const glow = 0.6 + Math.sin(performance.now() / 180) * 0.25;
      context.fillStyle = `rgba(255, 122, 26, ${glow * 0.35})`;
      context.beginPath();
      context.arc(ob.x + ob.width / 2, y + ob.height / 2, ob.width * 0.75, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.oven;
      roundRect(ob.x, y, ob.width, ob.height, 8);
      context.fill();
      context.fillStyle = '#11141b';
      roundRect(ob.x + 12, y + 14, ob.width - 24, ob.height - 30, 6);
      context.fill();
      context.fillStyle = PALETTE.ovenGlow;
      context.beginPath();
      context.moveTo(ob.x + 22, y + ob.height - 18);
      context.quadraticCurveTo(ob.x + ob.width / 2, y + 8, ob.x + ob.width - 22, y + ob.height - 18);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.ovenFire;
      context.beginPath();
      context.moveTo(ob.x + 32, y + ob.height - 18);
      context.quadraticCurveTo(ob.x + ob.width / 2, y + 26, ob.x + ob.width - 32, y + ob.height - 18);
      context.closePath();
      context.fill();
      context.fillStyle = '#dfe3ea';
      context.fillRect(ob.x + 18, y - 8, ob.width - 36, 8);
    } else if (ob.kind === KIND_STUCK_KNIFE) {
      if (ob.falling) {
        drawKnifeBlade(ob.x - 14, y - 10, 52, 58, 0.5);
      } else {
        context.save();
        context.translate(ob.x + ob.width / 2, y + ob.height / 2);
        context.rotate(0.5);
        context.fillStyle = PALETTE.knifeBlade;
        context.beginPath();
        context.moveTo(-6, -26);
        context.lineTo(10, -26);
        context.lineTo(2, 26);
        context.closePath();
        context.fill();
        context.restore();
        context.fillStyle = PALETTE.knifeHandle;
        context.fillRect(ob.x + 2, y - 16, 16, 18);
      }
    }
  }

  function drawPickup(item, time) {
    const bobY = Math.sin(item.bob + time / 300) * 4;
    if (item.kind === KIND_CORN) {
      context.fillStyle = PALETTE.cornHusk;
      context.beginPath();
      context.moveTo(item.x, item.y + 24 + bobY);
      context.lineTo(item.x + 15, item.y + 6 + bobY);
      context.lineTo(item.x + 30, item.y + 24 + bobY);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.corn;
      context.beginPath();
      context.ellipse(item.x + 15, item.y + 14 + bobY, 11, 15, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#d9a41e';
      context.lineWidth = 1.5;
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.moveTo(item.x + 15 + i * 6, item.y + 2 + bobY);
        context.lineTo(item.x + 15 + i * 6, item.y + 26 + bobY);
        context.stroke();
      }
    } else if (item.kind === KIND_FEATHER) {
      const glow = 0.5 + Math.sin(time / 200) * 0.3;
      context.fillStyle = `rgba(255, 217, 77, ${glow * 0.4})`;
      context.beginPath();
      context.arc(item.x + 15, item.y + 15 + bobY, 26, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.feather;
      context.beginPath();
      context.ellipse(item.x + 15, item.y + 15 + bobY, 7, 16, 0.5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#b57f2a';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(item.x + 15, item.y + 2 + bobY);
      context.lineTo(item.x + 15, item.y + 30 + bobY);
      context.stroke();
    }
  }

  function drawLeaves(state) {
    for (const leaf of state.leaves) {
      context.save();
      context.translate(leaf.x, leaf.y);
      context.rotate(leaf.sway);
      context.fillStyle = leaf.colour;
      context.beginPath();
      context.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      context.globalAlpha = Math.max(0, p.life * 1.6);
      context.fillStyle = p.colour;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawPopups(state) {
    for (const popup of state.popups) {
      context.globalAlpha = Math.max(0, Math.min(1, popup.life * 1.8));
      text(popup.text, popup.x, popup.y, 24, popup.colour, 'left');
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, muted, screen) {
    // Top bar.
    context.fillStyle = 'rgba(43, 29, 18, 0.72)';
    roundRect(12, 12, 1060, 52, 12);
    context.fill();
    text(`SCORE ${Math.floor(state.score)}`, 28, 26, 26, PALETTE.text, 'left');
    text(`DISTANCE ${Math.floor(state.distance)} m / ${GOAL_METRES} m`, 330, 26, 26, PALETTE.text, 'left');
    text(`LEVEL ${state.level}`, 700, 26, 26, PALETTE.text, 'left');
    // Lives as hearts.
    for (let i = 0; i < LIVES; i += 1) {
      const hx = 880 + i * 40;
      const hy = 38;
      context.fillStyle = i < state.lives ? PALETTE.heart : PALETTE.heartEmpty;
      context.beginPath();
      context.arc(hx - 6, hy - 4, 9, 0, Math.PI * 2);
      context.arc(hx + 6, hy - 4, 9, 0, Math.PI * 2);
      context.moveTo(hx - 13, hy - 2);
      context.lineTo(hx, hy + 12);
      context.lineTo(hx + 13, hy - 2);
      context.closePath();
      context.fill();
    }
    // Progress to the forest.
    context.fillStyle = 'rgba(43, 29, 18, 0.72)';
    roundRect(12, 72, 360, 20, 10);
    context.fill();
    context.fillStyle = '#5da24a';
    const progress = Math.min(1, state.distance / GOAL_METRES);
    roundRect(14, 74, 356 * progress, 16, 8);
    context.fill();
    text('🌲 FOREST', 376, 72, 18, PALETTE.text, 'left');
    // Pause and mute buttons.
    for (const button of BUTTONS.play) {
      const label = button.id === 'mute' && muted ? '✕' : button.label;
      context.fillStyle = 'rgba(43, 29, 18, 0.72)';
      roundRect(button.x, button.y, button.width, button.height, 10);
      context.fill();
      text(label, button.x + button.width / 2, button.y + 10, 22, PALETTE.text, 'center');
    }
    // "The farmer is close!" warning when the gap is small.
    if (screen === SCREEN_PLAY && state.farmerGap < 60 && !state.over) {
      const blink = Math.floor(performance.now() / 300) % 2 === 0;
      if (blink) text('⚠ THE FARMER IS RIGHT BEHIND YOU!', FIELD.width / 2, 110, 26, PALETTE.danger, 'center');
    }
  }

  function drawPanel(lines, prompt, promptColour) {
    // Each line gets room for its own size, so a big title never crowds
    // the line under it.
    const lineHeight = (line) => line.size + 12;
    const height = 24 + lines.reduce((sum, line) => sum + lineHeight(line), 0) + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    context.fillStyle = 'rgba(43, 29, 18, 0.88)';
    roundRect(x, PANEL.top, PANEL.width, height, 18);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.stroke();
    let y = PANEL.top + 24;
    for (const line of lines) {
      text(line.text, FIELD.width / 2, y, line.size, line.colour, 'center');
      y += lineHeight(line);
    }
    if (prompt) {
      const blink = Math.floor(performance.now() / 450) % 2 === 0;
      if (blink) text(prompt, FIELD.width / 2, y + 8, 22, promptColour || PALETTE.panelEdge, 'center');
    }
    return { x, y: PANEL.top, width: PANEL.width, height };
  }

  function drawTitle(state, best) {
    drawField(state);
    // The hero turkey, big, centre-left of the panel.
    const hero = { x: 180, y: FIELD.groundY - 150, width: 120, height: 130, onGround: true, runPhase: 0.6, sliding: false, invulnerable: 0 };
    drawTurkey(hero);
    drawFarmer({ ...state, farmerGap: 60, turkey: { ...state.turkey, x: 330, runPhase: 0.6 } });
    drawPanel([
      { text: 'GOBBLE DASH', size: 56, colour: PALETTE.panelEdge },
      { text: 'The Great Turkey Escape', size: 30, colour: PALETTE.text },
      { text: 'Thanksgiving morning. The oven is hot, the knives are out,', size: 20, colour: PALETTE.muted },
      { text: 'and the farmer is right behind you. Run 1,200 m to the forest!', size: 20, colour: PALETTE.muted },
      { text: 'SPACE / ↑ / W — jump     ↓ / S — slide under knives', size: 20, colour: PALETTE.text },
      { text: 'P — pause     M — mute     Click the buttons to play', size: 20, colour: PALETTE.text },
      { text: `Best escape: ${Math.floor(best.distance)} m   •   Best score: ${Math.floor(best.score)}`, size: 20, colour: PALETTE.panelEdge },
    ], 'PRESS SPACE OR CLICK START');
    drawButton(BUTTONS.title[0], false);
  }

  function drawPaused(state) {
    drawField(state);
    drawPanel([
      { text: 'PAUSED', size: 48, colour: PALETTE.panelEdge },
      { text: `Score ${Math.floor(state.score)}  •  ${Math.floor(state.distance)} m of ${GOAL_METRES} m`, size: 22, colour: PALETTE.text },
      { text: 'The farmer waits for no turkey. Take a breath, then run!', size: 20, colour: PALETTE.muted },
    ], 'PRESS P TO KEEP RUNNING');
    drawButton(BUTTONS.paused[0], false);
  }

  function drawOver(state, best) {
    drawField(state);
    if (state.won) {
      // The forest: the turkey free in a clearing between the trees.
      context.fillStyle = '#2e5a2e';
      context.fillRect(0, 0, FIELD.width, FIELD.groundY);
      for (const tx of [70, 250, 1010, 1190]) drawTree(tx, FIELD.groundY, 1.4, tx % 3);
      const hero = { x: 130, y: FIELD.groundY - 150, width: 120, height: 130, onGround: true, runPhase: 0.6, sliding: false, invulnerable: 0 };
      drawTurkey(hero);
      drawPanel([
        { text: 'ESCAPED!', size: 56, colour: '#7ee787' },
        { text: 'The turkey made it to the forest. No dinner today!', size: 24, colour: PALETTE.text },
        { text: `Final score ${Math.floor(state.score)}  •  Distance ${Math.floor(state.distance)} m`, size: 24, colour: PALETTE.text },
        { text: `Best escape: ${Math.floor(best.distance)} m   •   Best score: ${Math.floor(best.score)}`, size: 20, colour: PALETTE.panelEdge },
      ], 'PRESS SPACE TO RUN AGAIN');
    } else {
      // The farmer holds the turkey by the legs, oven glowing behind,
      // on the left, clear of the restart button.
      drawFarmer({ ...state, farmerGap: 10, turkey: { ...state.turkey, x: 330, runPhase: 0 } });
      const caught = { x: 380, y: FIELD.groundY - 130, width: 110, height: 120, onGround: true, runPhase: 0, sliding: false, invulnerable: 0 };
      context.save();
      context.translate(caught.x + 55, caught.y + 60);
      context.rotate(Math.PI);
      context.translate(-(caught.x + 55), -(caught.y + 60));
      drawTurkey(caught);
      context.restore();
      drawPanel([
        { text: 'CAUGHT!', size: 56, colour: PALETTE.danger },
        { text: state.reason === 'farmer' ? 'The farmer grabbed you by the legs!' : 'Out of lives — the oven wins this time.', size: 24, colour: PALETTE.text },
        { text: `Final score ${Math.floor(state.score)}  •  Distance ${Math.floor(state.distance)} m`, size: 24, colour: PALETTE.text },
        { text: `Best escape: ${Math.floor(best.distance)} m   •   Best score: ${Math.floor(best.score)}`, size: 20, colour: PALETTE.panelEdge },
      ], 'PRESS SPACE TO RUN AGAIN');
    }
    drawButton(BUTTONS.over[0], false);
  }

  function draw(state, screen, best, muted) {
    const time = performance.now();
    resize();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Screen shake on a hit.
    if (state.shake > 0) {
      context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    if (screen === SCREEN_OVER) {
      drawOver(state, best);
      return;
    }
    drawField(state);
    for (const ob of state.obstacles) drawObstacle(ob);
    for (const knife of state.flyKnives) drawKnifeBlade(knife.x, knife.y, knife.width, knife.height, knife.spin % (Math.PI * 2));
    for (const item of state.pickups) drawPickup(item, time);
    drawLeaves(state);
    drawFarmer(state);
    const turkey = state.turkey;
    if (turkey.invulnerable === 0 || Math.floor(turkey.invulnerable * 10) % 2 === 1) drawTurkey(turkey);
    drawParticles(state);
    drawPopups(state);
    drawHud(state, muted, screen);
    if (screen === SCREEN_PAUSED) {
      context.fillStyle = 'rgba(43, 29, 18, 0.55)';
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      drawPaused(state);
    }
  }

  return { draw, toField };
}
