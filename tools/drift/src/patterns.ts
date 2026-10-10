/**
 * One bar (16 sixteenths) of hits per voice, from a density level 0..6 and the
 * feel. "four" is the slow-house four-on-the-floor (clap 2 and 4, offbeat open
 * hat, 16th shaker); "broken" is the downtempo kick. Sources and confidence:
 * RESEARCH.md §Groove. Bars are generated once per
 * phrase and repeated (loop-first), with a variation on the phrase's last bar.
 */
import { euclid, type Rng } from "./rng";

export const VOICES = ["kick", "perc", "hats", "clap", "bass", "keys", "pluck", "voice"] as const;
export type VoiceId = (typeof VOICES)[number];
export type Feel = "four" | "broken";

export interface Hit {
  step: number;
  vel: number;
  /** Which sound of the voice: hats 0 shaker / 1 open hat; perc 0 low / 1 high / 2 slap; clap 0 clap / 1 rim. */
  alt?: number;
}

const on = (steps: number[], vel = 1, alt?: number): Hit[] =>
  steps.map((step) => (alt === undefined ? { step, vel } : { step, vel, alt }));

export function kick(feel: Feel, level: number, r: Rng): Hit[] {
  if (level === 0) return [];
  if (feel === "four") {
    const hits = on([0, 4, 8, 12]);
    if (level >= 5 && r() < 0.5) hits.push({ step: 14 + (r() < 0.5 ? 1 : 0), vel: 0.45 });
    return level <= 1 ? hits.filter((h) => h.step % 8 === 0) : hits;
  }
  // Broken: 1 and the "and" of 2-3, ghosted pickups at higher levels.
  const base = level <= 1 ? [0] : level <= 3 ? [0, 10] : [0, 7, 10];
  const hits = on(base);
  if (level >= 5) hits.push({ step: r() < 0.5 ? 14 : 3, vel: 0.5 });
  return hits;
}

export function perc(level: number, r: Rng, rot: number): Hit[] {
  if (level === 0) return [];
  const k = [0, 2, 3, 5, 6, 7, 9][level]!;
  return euclid(k, 16, rot).flatMap((hit, step) =>
    hit ? [{ step, vel: 0.55 + r() * 0.4, alt: step % 4 === 0 ? 0 : r() < 0.25 ? 2 : 1 }] : [],
  );
}

export function hats(feel: Feel, level: number, r: Rng): Hit[] {
  if (level === 0) return [];
  const hits: Hit[] = [];
  // Shaker: 8ths at low levels, 16ths with velocity shape higher up; the
  // offbeat open hat comes in early in the four feel, where it carries the groove.
  const every = level <= 2 ? 2 : 1;
  for (let s = 0; s < 16; s += every) {
    const accent = s % 4 === 2 ? 1 : s % 2 === 0 ? 0.7 : 0.45;
    hits.push({ step: s, vel: accent * (0.8 + r() * 0.2), alt: 0 });
  }
  if (level >= 2 && feel === "four") hits.push(...on([2, 6, 10, 14], 0.8, 1));
  else if (level >= 4) hits.push(...on([6, 14], 0.7, 1));
  return hits;
}

export function clap(feel: Feel, level: number, r: Rng): Hit[] {
  if (level === 0) return [];
  if (feel === "broken" || level <= 1) {
    // Half-time backbeat on 3, with a rim ghost.
    const hits = on([8]);
    if (level >= 2) hits.push({ step: r() < 0.5 ? 13 : 15, vel: 0.35, alt: 1 });
    return hits;
  }
  const hits = on([4, 12]);
  if (level >= 4) hits.push({ step: 7, vel: 0.3, alt: 1 }, { step: 11, vel: 0.25, alt: 1 });
  if (level >= 6) hits.push({ step: 15, vel: 0.4 });
  return hits;
}

/**
 * Bass: long, low notes that glue the loop (NI organic-house guide); more
 * syncopated restarts at higher levels. `alt` 1 = up an octave, 2 = fifth.
 */
export function bass(feel: Feel, level: number, r: Rng): (Hit & { len: number })[] {
  if (level === 0) return [];
  if (level <= 2)
    return [
      { step: 0, vel: 1, len: level === 1 ? 16 : 8 },
      ...(level === 2 ? [{ step: 10, vel: 0.8, len: 6 }] : []),
    ];
  const grid = feel === "four" ? [0, 3, 6, 10, 11, 14] : [0, 3, 7, 10, 13];
  const keep = grid.filter((s, i) => i === 0 || r() < 0.25 + level * 0.11);
  return keep.map((step, i) => ({
    step,
    vel: step === 0 ? 1 : 0.75,
    len: Math.max(1, (keep[i + 1] ?? 16) - step - (r() < 0.5 ? 1 : 0)),
    ...(level >= 5 && r() < 0.2 ? { alt: r() < 0.5 ? 1 : 2 } : {}),
  }));
}

/** Chord stabs or pads: level 1-2 one held chord, 3-4 a push before the bar, 5-6 offbeat stabs. */
export function keys(level: number, r: Rng): (Hit & { len: number })[] {
  if (level === 0) return [];
  if (level <= 2) return [{ step: 0, vel: 0.9, len: 16 }];
  if (level <= 4)
    return [
      { step: 0, vel: 0.9, len: 10 },
      { step: 10, vel: 0.7, len: 6 },
    ];
  return euclid(level === 5 ? 3 : 5, 16, 2).flatMap((h, step) =>
    h ? [{ step, vel: 0.6 + r() * 0.3, len: 2 }] : [],
  );
}

/** Kalimba/marimba arpeggio: Euclidean onsets, chord-tone index in `alt`. */
export function pluck(level: number, r: Rng, rot: number): Hit[] {
  if (level === 0) return [];
  const k = [0, 3, 4, 5, 7, 9, 11][level]!;
  let i = 0;
  return euclid(k, 16, rot).flatMap((h, step) => (h ? [{ step, vel: 0.5 + r() * 0.45, alt: i++ }] : []));
}
