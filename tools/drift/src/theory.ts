/**
 * Harmony for the generator: modes, a roman-numeral progression grammar and a
 * motif-memory melody walk. The style claims behind these defaults, and how sure
 * each one is, are in RESEARCH.md; the chord grammar and
 * the "desert" palette are design choices, not sourced facts.
 */
import { type Rng, weighted } from "./rng";

export const MODES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  /** Phrygian dominant (Hijaz): 5th mode of harmonic minor. */
  hijaz: [0, 1, 4, 5, 7, 8, 10],
} as const;
export type Mode = keyof typeof MODES;

/** MIDI note → Hz, A4 = 440. */
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Pitch of scale degree `d` (0-based, may be negative or past 7) above `root`. */
export function degree(root: number, mode: Mode, d: number): number {
  const s = MODES[mode];
  const oct = Math.floor(d / 7);
  return root + 12 * oct + s[((d % 7) + 7) % 7]!;
}

/**
 * Chord-to-chord weights by scale degree (0 = i), per mode. Minor-key loops
 * in this style sit on few chords and repeat them. Design choice: no
 * progression data was found for the artist or the labels around him.
 */
type Table = Record<number, number[]>;
//            to:  i    ii   III  iv   v    VI   VII
const AEOLIAN: Table = {
  0: [0.1, 0, 0.1, 0.25, 0.1, 0.25, 0.2],
  2: [0.2, 0, 0, 0.2, 0, 0.3, 0.3],
  3: [0.3, 0, 0.15, 0, 0.15, 0.15, 0.25],
  4: [0.5, 0, 0, 0.2, 0, 0.3, 0],
  5: [0.25, 0, 0.2, 0.2, 0, 0, 0.35],
  6: [0.45, 0, 0.2, 0.2, 0, 0.15, 0],
};
const DORIAN: Table = {
  0: [0.1, 0.1, 0, 0.45, 0.1, 0, 0.25],
  1: [0.4, 0, 0, 0.3, 0, 0, 0.3],
  3: [0.55, 0.1, 0, 0, 0.1, 0, 0.25],
  4: [0.5, 0, 0, 0.3, 0, 0, 0.2],
  6: [0.45, 0.2, 0, 0.35, 0, 0, 0],
};
/** Phrygian dominant: I, ♭II, iv, ♭vii. */
const HIJAZ: Table = {
  0: [0.15, 0.45, 0, 0.25, 0, 0, 0.15],
  1: [0.7, 0, 0, 0.1, 0, 0, 0.2],
  3: [0.4, 0.4, 0, 0, 0, 0, 0.2],
  6: [0.5, 0.5, 0, 0, 0, 0, 0],
};
/** Phrygian: the Aeolian table with ♭II where v was. */
const PHRYGIAN: Table = Object.fromEntries(
  Object.entries(AEOLIAN).map(([k, row]) => [
    k === "4" ? 1 : k,
    [row[0]!, row[4]!, row[2]!, row[3]!, 0, row[5]!, row[6]!],
  ]),
);
const TABLES: Record<Mode, Table> = {
  aeolian: AEOLIAN,
  dorian: DORIAN,
  phrygian: PHRYGIAN,
  harmonicMinor: AEOLIAN,
  hijaz: HIJAZ,
};

/** A loop of `n` chord roots (scale degrees), starting on the tonic. */
export function progression(r: Rng, mode: Mode, n = 4): number[] {
  const t = TABLES[mode];
  const out = [0];
  while (out.length < n) out.push(weighted(r, t[out[out.length - 1]!] ?? t[0]!));
  return out;
}

/** Chord tones as scale degrees: triad, plus 7th and 9th by `colour` 0..1 (pads like added tones). */
export function chordDegrees(root: number, colour: number): number[] {
  const tones = [root, root + 2, root + 4];
  if (colour > 0.3) tones.push(root + 6);
  if (colour > 0.7) tones.push(root + 8);
  return tones;
}

/** Voice-led chord: each tone moved by octaves to sit nearest the `centre` MIDI note. */
export function voice(root: number, mode: Mode, degrees: number[], centre: number): number[] {
  return degrees
    .map((d) => {
      let m = degree(root, mode, d);
      while (m < centre - 7) m += 12;
      while (m > centre + 6) m -= 12;
      return m;
    })
    .sort((a, b) => a - b);
}

export interface MotifNote {
  step: number;
  /** Scale degree relative to the tonic. */
  d: number;
  len: number;
  vel: number;
}

/**
 * A one- or two-bar motif: a weighted walk over scale degrees that favours
 * steps, lands on chord tones on strong beats and leaves room (rests).
 * `density` 0..1 sets how many of the 16th slots can start a note.
 */
export function motif(r: Rng, bars: number, density: number, span: [number, number] = [0, 9]): MotifNote[] {
  const notes: MotifNote[] = [];
  let d = 4 + Math.floor(r() * 3);
  for (let step = 0; step < bars * 16; step++) {
    const strong = step % 4 === 0;
    const p = density * (strong ? 0.8 : step % 2 === 0 ? 0.4 : 0.18);
    if (r() > p) continue;
    const move = [-3, -2, -1, 0, 1, 2, 3][weighted(r, [0.4, 1.2, 3, 0.8, 3, 1.2, 0.4])]!;
    d = Math.max(span[0], Math.min(span[1], d + move));
    if (strong && r() < 0.6) d = Math.min(span[1], Math.round(d / 2) * 2); // lean to triad tones of i on strong beats
    const len = [1, 2, 3, 4, 6][weighted(r, [1, 3, 2, 2, 1])]!;
    notes.push({ step, d, len, vel: strong ? 0.9 : 0.6 + r() * 0.25 });
  }
  // Notes never overlap: a mono line.
  for (let i = 0; i < notes.length - 1; i++) {
    const n = notes[i]!;
    n.len = Math.max(1, Math.min(n.len, notes[i + 1]!.step - n.step));
  }
  return notes;
}

/** Repeat with small edits: the answer phrase keeps rhythm, nudges a few pitches. */
export function vary(r: Rng, m: MotifNote[], amount: number): MotifNote[] {
  return m
    .filter(() => r() > amount * 0.25)
    .map((n) => (r() < amount ? { ...n, d: n.d + (r() < 0.5 ? -1 : 1) } : n));
}
