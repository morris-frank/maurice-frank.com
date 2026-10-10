/**
 * Input dynamics: turns presses from the Launchpad or the screen into engine
 * calls. Velocity sets the voice's accent; pressure (Launchpad X/Pro) or, on
 * pads without it, how long a level pad is held swells the expression. Pressing
 * a pinned voice's lit level again hands it back to auto. A mute pad is tap =
 * mute, double-tap = solo, hold = mute only while held.
 */
import type { Engine } from "./engine";
import { actionAt } from "./grid";
import type { Cell, PadEvent } from "./launchpad";

const DOUBLE_MS = 300;
const LONG_MS = 550;
const SWELL_MS = 2000;

const key = (c: Cell) => `${c.x},${c.y}`;

export function createController(engine: Engine, now: () => number = () => performance.now()) {
  const down = new Map<string, { at: number; cell: Cell }>();
  const lastTap = new Map<string, number>();
  let shift = false;
  let dipFrom: number | null = null;
  let pressure = 0;
  let swelling = false;
  const changed = new Set<() => void>();
  const notify = () => changed.forEach((f) => f());

  function press(cell: Cell, vel: number, dynamic: boolean) {
    const k = key(cell);
    down.set(k, { at: now(), cell });
    if (cell.x === 8 && cell.y === 7) {
      shift = true;
      notify();
      return;
    }
    const a = actionAt(cell, shift);
    if (!a) return;
    switch (a.kind) {
      case "level":
        if (dynamic) engine.accent(a.voice, 0.6 + (vel / 127) * 0.6);
        if (engine.view.pinned[a.voice] && engine.view.levels[a.voice] === a.level) engine.release(a.voice);
        else engine.level(a.voice, a.level);
        swelling = true;
        break;
      case "reroll":
        engine.reroll(a.voice);
        break;
      case "mute": {
        const prev = lastTap.get(k) ?? -Infinity;
        if (now() - prev < DOUBLE_MS) {
          engine.mute(a.voice); // undo the first tap's mute
          engine.solo(a.voice);
          lastTap.delete(k);
        } else {
          engine.mute(a.voice);
          lastTap.set(k, now());
        }
        break;
      }
      case "macro":
        engine.macro(a.id, a.value);
        break;
      case "scene":
        engine.scene(a.index);
        break;
      case "auto":
        engine.auto(!engine.view.auto);
        break;
      case "hold":
        engine.hold(true);
        break;
      case "side":
        side(a.index);
        break;
    }
    notify();
  }

  function side(i: number) {
    if (i === 0) engine.throwDelay();
    else if (i === 1) engine.rechord();
    else if (i === 2) engine.jump("rise");
    else if (i === 3) engine.jump("bloom");
    else if (i === 4) engine.jump("hush");
    else if (i === 5) {
      dipFrom = engine.view.macros.filter;
      engine.macro("filter", 0.15);
    } else if (i === 6) {
      if (engine.view.running) engine.stop();
      else engine.start();
    }
  }

  function release(cell: Cell) {
    const k = key(cell);
    const d = down.get(k);
    down.delete(k);
    if (cell.x === 8 && cell.y === 7) shift = false;
    if (cell.x === 8 && cell.y === 5 && dipFrom !== null) {
      engine.macro("filter", dipFrom);
      dipFrom = null;
    }
    if (cell.y === -1 && cell.x === 7) engine.hold(false);
    const a = actionAt(cell, shift);
    // A held mute pad was momentary: undo it on release.
    if (a?.kind === "mute" && d && now() - d.at > LONG_MS) engine.mute(a.voice);
    if (![...down.values()].some((x) => x.cell.y >= 0 && x.cell.y <= 5 && x.cell.x < 8)) {
      swelling = false;
      pressure = 0;
      engine.expression(0);
    }
    notify();
  }

  return {
    get shift() {
      return shift;
    },
    /** Cells held right now, for the LEDs. */
    held: () => [...down.values()].map((d) => d.cell),
    onChange(f: () => void) {
      changed.add(f);
      return () => void changed.delete(f);
    },
    handle(e: PadEvent, dynamic: boolean) {
      if (e.kind === "down") press(e.cell, e.vel, dynamic);
      else if (e.kind === "up") release(e.cell);
      else {
        pressure = e.value / 127;
        engine.expression(pressure);
      }
    },
    /** Per frame: a held level pad without pressure swells the expression over two seconds. */
    tick() {
      if (!swelling || pressure > 0) return;
      const held = [...down.values()].filter((x) => x.cell.y >= 0 && x.cell.y <= 5 && x.cell.x < 8);
      if (!held.length) return;
      const t = Math.min(1, (now() - Math.min(...held.map((h) => h.at)) - 250) / SWELL_MS);
      if (t > 0) engine.expression(t);
    },
  };
}

export type Controller = ReturnType<typeof createController>;
