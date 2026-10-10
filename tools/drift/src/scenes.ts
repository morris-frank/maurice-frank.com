/**
 * The six scales of the valley as six musical scenes. Zooming in goes slower
 * to faster: landscape is the ambient-downtempo floor, profile sits on the
 * slow-house centre (~108 BPM), rhizosphere and cell on the organic-house
 * cluster (~117 BPM). Tempo clusters: RESEARCH.md §Tempo.
 * The "desert" palette on cell (Hijaz) is a design choice, not a claim about
 * any artist.
 */
type Scale = "landscape" | "field" | "profile" | "aggregate" | "rhizosphere" | "cell";
import type { Feel, VoiceId } from "./patterns";
import type { Mode } from "./theory";

export interface Scene {
  scale: Scale;
  title: string;
  /** Baked plate (public/plates/manifest.json) behind the scene. */
  plate: { recipe: string; seed: number };
  bpm: number;
  feel: Feel;
  modes: Mode[];
  /** Tonic MIDI note (bass octave). */
  roots: number[];
  /** Colour of chord voicings 0..1: higher adds 7ths and 9ths. */
  colour: number;
  /** Levels (0..6) each voice reaches at full energy. */
  ceiling: Record<VoiceId, number>;
  /** One line under the title: what the scene sounds like. */
  sound: string;
}

export const SCENES: Scene[] = [
  {
    scale: "landscape",
    title: "Valley",
    plate: { recipe: "valley", seed: 7 },
    bpm: 98,
    feel: "broken",
    modes: ["aeolian", "dorian"],
    roots: [40, 43, 45],
    colour: 0.8,
    ceiling: { kick: 3, perc: 3, hats: 2, clap: 2, bass: 2, keys: 2, pluck: 3, voice: 4 },
    sound: "Wide pads, a slow broken kick, kalimba from far away.",
  },
  {
    scale: "field",
    title: "Field",
    plate: { recipe: "field-dawn", seed: 11 },
    bpm: 104,
    feel: "broken",
    modes: ["dorian", "aeolian"],
    roots: [38, 40, 43],
    colour: 0.7,
    ceiling: { kick: 4, perc: 4, hats: 4, clap: 3, bass: 3, keys: 4, pluck: 4, voice: 3 },
    sound: "Shakers at dawn, Dorian chords, a bassline that waits.",
  },
  {
    scale: "profile",
    title: "Profile",
    plate: { recipe: "c11-pit", seed: 83 },
    bpm: 108,
    feel: "four",
    modes: ["aeolian", "phrygian"],
    roots: [40, 38, 43],
    colour: 0.6,
    ceiling: { kick: 5, perc: 4, hats: 4, clap: 4, bass: 4, keys: 4, pluck: 3, voice: 4 },
    sound: "Slow house: four on the floor, long deep bass, chords and percussion.",
  },
  {
    scale: "aggregate",
    title: "Crumb",
    plate: { recipe: "pore", seed: 37 },
    bpm: 112,
    feel: "four",
    modes: ["phrygian", "aeolian"],
    roots: [40, 42, 45],
    colour: 0.4,
    ceiling: { kick: 5, perc: 6, hats: 5, clap: 4, bass: 5, keys: 3, pluck: 5, voice: 3 },
    sound: "Darker Phrygian loop, busy hand drums in the pore spaces.",
  },
  {
    scale: "rhizosphere",
    title: "Root",
    plate: { recipe: "c7-root-tip", seed: 71 },
    bpm: 117,
    feel: "four",
    modes: ["aeolian", "dorian"],
    roots: [43, 40, 38],
    colour: 0.6,
    ceiling: { kick: 6, perc: 5, hats: 6, clap: 6, bass: 6, keys: 5, pluck: 5, voice: 4 },
    sound: "Organic house: open hats, claps on two and four, a rolling bass.",
  },
  {
    scale: "cell",
    title: "Cell",
    plate: { recipe: "c8-arbuscule", seed: 89 },
    bpm: 118,
    feel: "four",
    modes: ["hijaz", "harmonicMinor"],
    roots: [40, 45, 41],
    colour: 0.3,
    ceiling: { kick: 6, perc: 6, hats: 5, clap: 5, bass: 5, keys: 4, pluck: 6, voice: 5 },
    sound: "Marimba arpeggios in Phrygian dominant, the busiest and smallest scene.",
  },
];
