/**
 * The arrangement for an endless set: sections in multiples of 8 bars (the
 * house convention, RESEARCH.md §Arrangement), elements
 * entering one at a time, a breakdown and a short rise before every bloom.
 * Pure and seeded: the engine asks it once per bar what each voice should do.
 */
import { VOICES, type VoiceId } from "./patterns";
import { mulberry, type Rng } from "./rng";
import { SCENES } from "./scenes";

export type Section = "arrive" | "settle" | "bloom" | "hush" | "rise";

/** Share of the scene's ceiling each voice plays in a section. */
const SHAPE: Record<Section, Record<VoiceId, number>> = {
  arrive: { kick: 0, perc: 0.4, hats: 0.3, clap: 0, bass: 0, keys: 0.7, pluck: 0.5, voice: 0 },
  settle: { kick: 1, perc: 0.6, hats: 0.6, clap: 0.5, bass: 0.8, keys: 0.7, pluck: 0.3, voice: 0 },
  bloom: { kick: 1, perc: 1, hats: 1, clap: 1, bass: 1, keys: 0.8, pluck: 0.8, voice: 1 },
  hush: { kick: 0, perc: 0.3, hats: 0.2, clap: 0, bass: 0.3, keys: 1, pluck: 0.6, voice: 1 },
  rise: { kick: 0.5, perc: 0.8, hats: 1, clap: 0.6, bass: 0.5, keys: 0.8, pluck: 0.8, voice: 0.4 },
};
const BARS: Record<Section, number[]> = {
  arrive: [16],
  settle: [16, 32],
  bloom: [32, 32, 16],
  hush: [16, 8],
  rise: [8, 4],
};
const AFTER: Record<Section, Section[]> = {
  arrive: ["settle"],
  settle: ["bloom", "hush"],
  bloom: ["hush", "settle", "hush"],
  hush: ["rise"],
  rise: ["bloom"],
};

export interface Pin {
  level: number;
  /** The pin lets go at this bar; Infinity while auto is off. */
  until: number;
}

export interface Bar {
  bar: number;
  section: Section;
  /** Bars into the section, and its length. */
  at: number;
  of: number;
  scene: number;
  levels: Record<VoiceId, number>;
  /** True on the first bar of a section: patterns re-roll. */
  fresh: boolean;
  /** Last bar of an 8-bar phrase: play a fill. */
  fill: boolean;
}

export interface ConductorState {
  auto: boolean;
  energy: number;
  scene: number;
  pins: Partial<Record<VoiceId, Pin>>;
  /** Held "break": stay in the hush until released. */
  holding: boolean;
}

export function createConductor(seed: number, start: Partial<ConductorState> = {}) {
  const r: Rng = mulberry(seed);
  const st: ConductorState = { auto: true, energy: 0.6, scene: 2, pins: {}, holding: false, ...start };
  let section: Section = "arrive";
  let at = 0;
  let of = 16;
  let bar = -1;
  let cycles = 0;
  let wantScene: number | null = null;
  let jumped = false;

  const pickLen = (s: Section) => BARS[s][Math.floor(r() * BARS[s].length)]!;

  function enter(s: Section) {
    section = s;
    at = 0;
    of = pickLen(s);
  }

  function levels(): Record<VoiceId, number> {
    const scene = SCENES[st.scene]!;
    const gain = 0.45 + 0.55 * st.energy;
    return Object.fromEntries(
      VOICES.map((v) => {
        const pin = st.pins[v];
        if (pin && bar < pin.until) return [v, pin.level];
        const target = scene.ceiling[v] * SHAPE[section][v] * gain;
        return [v, Math.max(0, Math.min(6, Math.round(target)))];
      }),
    ) as Record<VoiceId, number>;
  }

  return {
    state: st,
    get section() {
      return section;
    },
    /** Advance one bar and say what it holds. */
    next(): Bar {
      bar++;
      let fresh = bar === 0 || jumped;
      jumped = false;
      if (bar > 0) at++;
      if (st.holding && section !== "hush") {
        enter("hush");
        fresh = true;
      } else if (at >= of && !(st.holding && section === "hush")) {
        enter(AFTER[section][Math.floor(r() * AFTER[section].length)]!);
        if (section === "settle") cycles++;
        fresh = true;
        // Auto drift: every second return to "settle", move one scale in or out.
        if (st.auto && section === "settle" && cycles % 2 === 0) {
          const dir = st.scene === 0 ? 1 : st.scene === SCENES.length - 1 ? -1 : r() < 0.55 ? 1 : -1;
          wantScene = st.scene + dir;
        }
      }
      if (fresh && wantScene !== null) {
        st.scene = wantScene;
        wantScene = null;
      }
      for (const v of VOICES) if ((st.pins[v]?.until ?? Infinity) <= bar) delete st.pins[v];
      return { bar, section, at, of, scene: st.scene, levels: levels(), fresh, fill: at % 8 === 7 };
    },
    /** The player set a level: hold it for two phrases while auto runs, for good while it doesn't. */
    pin(v: VoiceId, level: number) {
      st.pins[v] = { level, until: st.auto ? bar + 16 : Infinity };
    },
    unpin(v: VoiceId) {
      delete st.pins[v];
    },
    /** Jump to a scene at the next bar; the arrangement goes on from where it is. */
    scene(i: number) {
      wantScene = Math.max(0, Math.min(SCENES.length - 1, i));
      at = of; // close the section so the next bar re-rolls in the new scene
    },
    /** Skip to a section now (the next bar starts it). */
    jump(s: Section) {
      enter(s);
      at = -1;
      jumped = true;
    },
  };
}

export type Conductor = ReturnType<typeof createConductor>;
