// Keyboard and pointer input. Jump is an edge (one press, one jump); slide
// is held. One-shot presses (start/restart, pause, mute) are queued as bit
// flags and taken once by the loop, so a press between two frames is never
// lost and never counted twice. Pointer clicks are queued with their
// playfield coordinates so the loop can test them against on-screen buttons.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'Enter']);
const SLIDE_KEYS = new Set(['ArrowDown', 'KeyS']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const MUTE_KEYS = new Set(['KeyM']);

export function createInput(target, toField) {
  let jumpQueued = false;
  let slideHeld = false;
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (JUMP_KEYS.has(event.code)) {
      if (!event.repeat) {
        jumpQueued = true;
        actions |= ACTION_CONFIRM;
      }
    } else if (SLIDE_KEYS.has(event.code)) {
      slideHeld = true;
    } else if (PAUSE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (SLIDE_KEYS.has(event.code)) slideHeld = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    slideHeld = false;
  });
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    click = toField(event.clientX - rect.left, event.clientY - rect.top);
    actions |= ACTION_CONFIRM;
  });

  return {
    /** True once for each jump key press since the last call. */
    takeJump() {
      const pressed = jumpQueued;
      jumpQueued = false;
      return pressed;
    },
    slideHeld() {
      return slideHeld;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last pointer click in playfield coordinates, once. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
