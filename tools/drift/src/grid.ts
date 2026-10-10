/**
 * The 9×9 control surface, shared by the Launchpad and the on-screen grid:
 * what each cell does, what it says, and what colour it shows. Pure, so the
 * screen and the hardware can never disagree.
 *
 *   top row   scenes 1-6 (the six scales) · auto drift · hold for break
 *   pads      column = voice; rows 1-6 set its level (top = 6; the lit
 *             level again = back to auto); row 7 new pattern; row 8 mute and
 *             meter (double-tap solo, hold = momentary mute)
 *   logo      the beat
 *   side      throw · new chords · rise · bloom · hush · filter dip · play · shift
 *   shift+pad column = macro, row = value (top = full)
 */
import { W } from "./palette";
import { MACROS, type DriftView, type MacroId } from "./engine";
import type { Cell, Led, Rgb } from "./launchpad";
import { VOICES, type VoiceId } from "./patterns";
import { SCENES } from "./scenes";

export type Action =
  | { kind: "level"; voice: VoiceId; level: number }
  | { kind: "reroll"; voice: VoiceId }
  | { kind: "mute"; voice: VoiceId }
  | { kind: "macro"; id: MacroId; value: number }
  | { kind: "scene"; index: number }
  | { kind: "auto" }
  | { kind: "hold" }
  | { kind: "side"; index: number };

export function actionAt(c: Cell, shift: boolean): Action | null {
  if (c.y === -1) {
    if (c.x < SCENES.length) return { kind: "scene", index: c.x };
    return c.x === 6 ? { kind: "auto" } : c.x === 7 ? { kind: "hold" } : null;
  }
  if (c.x === 8) return { kind: "side", index: c.y };
  if (shift) return { kind: "macro", id: MACROS[c.x]!.id, value: (7 - c.y) / 7 };
  const voice = VOICES[c.x]!;
  if (c.y <= 5) return { kind: "level", voice, level: 6 - c.y };
  return c.y === 6 ? { kind: "reroll", voice } : { kind: "mute", voice };
}

export const SIDE = [
  "Delay throw",
  "New chord loop",
  "Rise",
  "Bloom",
  "Hush",
  "Filter dip (hold)",
  "Play / pause",
  "Shift (hold): macros",
];

export function labelOf(c: Cell, shift: boolean, v: DriftView): string {
  const a = actionAt(c, shift);
  if (!a) return "";
  switch (a.kind) {
    case "scene":
      return `Scene ${a.index + 1}: ${SCENES[a.index]!.title}${v.scene === a.index ? " (playing)" : ""}`;
    case "auto":
      return `Auto drift ${v.auto ? "on" : "off"}`;
    case "hold":
      return "Hold for a break";
    case "side":
      return SIDE[a.index]!;
    case "macro": {
      const m = MACROS.find((x) => x.id === a.id)!;
      return `${m.label} to ${Math.round(a.value * 100)} %`;
    }
    case "level":
      return `${a.voice} level ${a.level}${v.levels[a.voice] === a.level ? " (now)" : ""}`;
    case "reroll":
      return `${a.voice}: new pattern`;
    case "mute":
      return `${a.voice}: ${v.mutes[a.voice] ? "unmute" : "mute"}`;
  }
}

/** World-register pigment → LED RGB, stretched so the brightest channel is full. */
export function ledRgb(hex: string, bright = 1): Rgb {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const max = Math.max(...c, 1);
  return c.map((x) => Math.round((x / max) * 127 * bright)) as unknown as Rgb;
}

export const VOICE_PIGMENT: Record<VoiceId, string> = {
  kick: W.oxide,
  perc: W.subsoil,
  hats: W.sand,
  clap: W.pale,
  bass: W.clay,
  keys: W.water,
  pluck: W.film,
  voice: W.foliage,
};
const SCENE_PIGMENT = [W.skyHigh, W.foliage, W.subsoil, W.sand, W.oxide, W.water];
const DIM = 0.12;
/** The logo shares the top row's address space: CC 99, one past the 8th top button. */
export const LOGO: Cell = { x: 8, y: -1 };
const WHITE: Rgb = [100, 100, 100];

/** Every lit cell, keyed by LED index; `flash` 0..1 per voice brightens the column as it plays. */
export function leds(
  v: DriftView,
  flash: Record<VoiceId, number>,
  beat: number,
  shift: boolean,
  held: Set<number>,
  index: (c: Cell) => number,
): Map<number, Led> {
  const out = new Map<number, Led>();
  const set = (c: Cell, rgb: Rgb, mode?: "pulse") => out.set(index(c), mode ? { rgb, mode } : { rgb });
  set(LOGO, ledRgb(W.pale, 0.1 + 0.9 * beat));
  SCENES.forEach((s, x) =>
    set({ x, y: -1 }, x === v.scene ? [70, 127, 30] : ledRgb(SCENE_PIGMENT[x]!, 0.25)),
  );
  set({ x: 6, y: -1 }, v.auto ? [70, 127, 30] : ledRgb(W.stone1, 0.3));
  set({ x: 7, y: -1 }, v.holding ? [127, 40, 0] : ledRgb(W.oxide, 0.3));
  for (let y = 0; y < 8; y++)
    set(
      { x: 8, y },
      held.has(index({ x: 8, y })) || (y === 7 && shift)
        ? WHITE
        : ledRgb(W.stone1, y === 6 && v.running ? 0.6 : 0.2),
    );
  if (shift) {
    MACROS.forEach((m, x) => {
      const top = 7 - Math.round(v.macros[m.id] * 7);
      for (let y = 0; y < 8; y++)
        set({ x, y }, ledRgb(VOICE_PIGMENT[VOICES[x]!], y === top ? 1 : y > top ? 0.3 : 0.04));
    });
    return out;
  }
  VOICES.forEach((voice, x) => {
    const level = v.levels[voice];
    const muted = v.mutes[voice] || (v.solo !== null && v.solo !== voice);
    const f = muted ? 0 : flash[voice];
    for (let y = 0; y <= 5; y++) {
      const lv = 6 - y;
      if (lv > level) continue;
      const b = lv === level ? 0.55 + 0.45 * f : 0.18 + 0.4 * f;
      set({ x, y }, lv === level && v.pinned[voice] ? WHITE : ledRgb(VOICE_PIGMENT[voice], muted ? 0.06 : b));
    }
    set({ x, y: 6 }, ledRgb(VOICE_PIGMENT[voice], DIM));
    if (v.solo === voice) set({ x, y: 7 }, [127, 127, 0], "pulse");
    // The mute row doubles as a meter: it flashes on every hit of its voice.
    else set({ x, y: 7 }, v.mutes[voice] ? [70, 0, 0] : ledRgb(VOICE_PIGMENT[voice], 0.25 + 0.75 * f));
  });
  return out;
}
