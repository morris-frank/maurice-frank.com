/**
 * Novation Launchpad over Web MIDI, in Programmer mode (Novation programmer's
 * reference guides for Launchpad Mini MK3, X and Pro MK3). Every pad, top
 * button and side button is a cell of one 9×9 grid: `x` 0..7 left to right,
 * `y` 0..7 top to bottom for the pads, `y` -1 the top row, `x` 8 the side
 * column. In Programmer mode a pad is note `10·row + col` (row 1 at the
 * bottom); top-row buttons are CC 91..98, side buttons CC 19, 29 … 89.
 */

export type Model = "mini-mk3" | "x" | "pro-mk3";
export interface Cell {
  x: number;
  y: number;
}
export type PadEvent =
  | { kind: "down"; cell: Cell; vel: number }
  | { kind: "up"; cell: Cell }
  | { kind: "pressure"; cell: Cell | null; value: number };
/** 0..127 per channel, as the RGB SysEx takes them. */
export type Rgb = readonly [number, number, number];
export type Led = { rgb: Rgb; mode?: "static" | "pulse" };

const HEAD = [0xf0, 0x00, 0x20, 0x29, 0x02];
export const DEVICE: Record<Model, number> = { "mini-mk3": 0x0d, x: 0x0c, "pro-mk3": 0x0e };

export function detect(portName: string): Model | null {
  const n = portName.toLowerCase();
  if (!n.includes("launchpad") && !n.includes("lpmini") && !n.includes("lpx") && !n.includes("lppro"))
    return null;
  // Each MK3 shows a DAW port (and the Pro a DIN port); Programmer mode lives on the MIDI one.
  if (n.includes("daw") || n.includes("din")) return null;
  if (n.includes("mini") && n.includes("mk3")) return "mini-mk3";
  if (n.includes("lpmini")) return "mini-mk3";
  if (n.includes("pro") && n.includes("mk3")) return "pro-mk3";
  if (n.includes("lppro")) return "pro-mk3";
  if (/launchpad x\b/.test(n) || n.includes("lpx")) return "x";
  return null;
}

export const programmerMode = (m: Model, on: boolean) => [...HEAD, DEVICE[m], 0x0e, on ? 1 : 0, 0xf7];
/** Launchpad X only: polyphonic aftertouch, medium threshold (the Pro MK3 sets this in its Setup menu). */
export const polyAftertouch = [...HEAD, DEVICE.x, 0x0b, 0x00, 0x01, 0xf7];

/** MIDI address of a cell: pads are notes, top and side buttons CCs. */
export function address(c: Cell): { cc: boolean; n: number } {
  if (c.y === -1) return { cc: true, n: 91 + c.x };
  const row = 8 - c.y;
  if (c.x === 8) return { cc: true, n: row * 10 + 9 };
  return { cc: false, n: row * 10 + c.x + 1 };
}

/** The LED index the RGB SysEx uses: the same number as the address. */
export const ledIndex = (c: Cell) => address(c).n;

export function cellOf(cc: boolean, n: number): Cell | null {
  if (cc && n >= 91 && n <= 98) return { x: n - 91, y: -1 };
  const row = Math.floor(n / 10);
  const col = n % 10;
  if (row < 1 || row > 8) return null;
  if (cc && col === 9) return { x: 8, y: 8 - row };
  if (!cc && col >= 1 && col <= 8) return { x: col - 1, y: 8 - row };
  return null;
}

/** One incoming MIDI message as a pad event; anything else is `null`. */
export function parse(data: ArrayLike<number>): PadEvent | null {
  const [status = 0, a = 0, b = 0] = Array.from(data);
  const type = status & 0xf0;
  if (type === 0x90 || type === 0x80) {
    const cell = cellOf(false, a);
    if (!cell) return null;
    return type === 0x90 && b > 0 ? { kind: "down", cell, vel: b } : { kind: "up", cell };
  }
  if (type === 0xb0) {
    const cell = cellOf(true, a);
    if (!cell) return null;
    return b > 0 ? { kind: "down", cell, vel: 127 } : { kind: "up", cell };
  }
  if (type === 0xa0) return { kind: "pressure", cell: cellOf(false, a), value: b };
  if (type === 0xd0) return { kind: "pressure", cell: null, value: a };
  return null;
}

/**
 * One RGB SysEx for every LED that changed (spec type 3 = RGB). Pulsing uses
 * the palette (note/CC on channel 3), since RGB has no pulse; `pulseIndex`
 * picks the palette colour nearest in spirit.
 */
export function frameMessages(m: Model, leds: Map<number, Led>): number[][] {
  const rgb: number[] = [];
  const out: number[][] = [];
  for (const [idx, led] of leds) {
    if (led.mode === "pulse") {
      const cc = idx >= 91 || idx % 10 === 9;
      out.push([cc ? 0xb2 : 0x92, idx, paletteNear(led.rgb)]);
    } else rgb.push(3, idx, ...led.rgb.map((v) => Math.max(0, Math.min(127, Math.round(v)))));
  }
  if (rgb.length) out.unshift([...HEAD, DEVICE[m], 0x03, ...rgb, 0xf7]);
  return out;
}

/** A handful of the default palette's bright hues (Novation palette, indexes 3..57). */
const PALETTE: [number, Rgb][] = [
  [3, [127, 127, 127]],
  [5, [127, 0, 0]],
  [9, [127, 60, 0]],
  [13, [127, 127, 0]],
  [21, [0, 127, 0]],
  [37, [0, 100, 127]],
  [45, [0, 0, 127]],
  [49, [80, 0, 127]],
  [57, [127, 0, 60]],
];
export function paletteNear([r, g, b]: Rgb): number {
  let best = 3;
  let d = Infinity;
  for (const [i, [pr, pg, pb]] of PALETTE) {
    const e = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (e < d) [best, d] = [i, e];
  }
  return best;
}

export interface Pad {
  model: Model;
  name: string;
  /** Mini MK3 pads always send 127 and no pressure: dynamics fall back to hold time. */
  dynamic: boolean;
  /** Sends only what changed since the last frame. */
  show(leds: Map<number, Led>): void;
  /** MIDI clock ticks (24 per beat) at `performance.now()` times, so pulsing LEDs breathe in tempo. */
  clock(atMs: number[]): void;
  close(): void;
}

const sameLed = (a: Led | undefined, b: Led) =>
  !!a && a.mode === b.mode && a.rgb[0] === b.rgb[0] && a.rgb[1] === b.rgb[1] && a.rgb[2] === b.rgb[2];

/** Finds the first Launchpad, puts it in Programmer mode and wires its events. */
export async function connect(onEvent: (e: PadEvent) => void, onChange: (p: Pad | null) => void) {
  if (!("requestMIDIAccess" in navigator))
    throw new Error("This browser has no Web MIDI (try Chrome or Edge).");
  const access = await navigator.requestMIDIAccess({ sysex: true });
  let pad: (Pad & { input: MIDIInput }) | null = null;

  function attach() {
    if (pad) return;
    for (const input of access.inputs.values()) {
      const model = detect(input.name ?? "");
      if (!model) continue;
      const output = [...access.outputs.values()].find((o) => detect(o.name ?? "") === model);
      if (!output) continue;
      output.send(programmerMode(model, true));
      if (model === "x") output.send(polyAftertouch);
      let last = new Map<number, Led>();
      input.onmidimessage = (m) => {
        const e = m.data && parse(m.data);
        if (e) onEvent(e);
      };
      pad = {
        model,
        name: input.name ?? model,
        dynamic: model !== "mini-mk3",
        input,
        show(leds) {
          const diff = new Map([...leds].filter(([i, l]) => !sameLed(last.get(i), l)));
          for (const [i] of last) if (!leds.has(i)) diff.set(i, { rgb: [0, 0, 0] });
          last = new Map(leds);
          for (const msg of frameMessages(model, diff)) output.send(msg);
        },
        clock(atMs) {
          for (const t of atMs) output.send([0xf8], t);
        },
        close() {
          input.onmidimessage = null;
          output.send(programmerMode(model, false));
        },
      };
      onChange(pad);
      return;
    }
  }

  access.onstatechange = () => {
    if (pad && pad.input.state === "disconnected") {
      pad = null;
      onChange(null);
    }
    attach();
  };
  attach();
  if (!pad) onChange(null);
  return () => {
    access.onstatechange = null;
    pad?.close();
    pad = null;
  };
}
