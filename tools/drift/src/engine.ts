/**
 * The generator: clock → conductor (once per bar) → patterns and harmony →
 * synth. Holds the player's controls and publishes what it plays, with audio
 * times, so the visuals and the Launchpad LEDs light when a note sounds.
 */
import { createClock, sixteenth } from "./clock";
import { createConductor, type Bar, type Section } from "./conductor";
import * as P from "./patterns";
import { VOICES, type Hit, type VoiceId } from "./patterns";
import { mulberry, pick, type Rng } from "./rng";
import { SCENES } from "./scenes";
import { createBus, createSynth, type Bus, type Synth } from "./synth";
import {
  chordDegrees,
  degree,
  hz,
  motif,
  progression,
  vary,
  voice,
  type Mode,
  type MotifNote,
} from "./theory";

export type MacroId = "energy" | "filter" | "space" | "swing" | "pump" | "air" | "tempo" | "colour";
export const MACROS: { id: MacroId; label: string; hint: string }[] = [
  { id: "energy", label: "Energy", hint: "How much of each scene plays" },
  { id: "filter", label: "Filter", hint: "Lowpass on chords, plucks and voice" },
  { id: "space", label: "Space", hint: "Reverb and delay sends" },
  { id: "swing", label: "Swing", hint: "Off-beat sixteenths late, straight to triplet" },
  { id: "pump", label: "Pump", hint: "How far the kick ducks the music" },
  { id: "air", label: "Air", hint: "Room tone under everything" },
  { id: "tempo", label: "Tempo", hint: "±8 BPM around the scene's tempo" },
  { id: "colour", label: "Colour", hint: "Chord extensions and timbre brightness" },
];
export const DEFAULT_MACROS: Record<MacroId, number> = {
  energy: 0.6,
  filter: 0.7,
  space: 0.5,
  swing: 0.5,
  pump: 0.35,
  air: 0.3,
  tempo: 0.5,
  colour: 0.5,
};

/**
 * How much of the swing each voice takes: kick and chords stay on the grid,
 * shakers take all of it (generator spec §1.2, a design choice).
 */
const SWING_SHARE: Record<VoiceId, number> = {
  kick: 0,
  perc: 0.8,
  hats: 1,
  clap: 0.5,
  bass: 0.5,
  keys: 0,
  pluck: 0.7,
  voice: 0.6,
};

/**
 * Swing in clock units (1 = triplet, 66 % MPC). The macro centres on a
 * tempo-scaled default: 54 % + 0.4 %/BPM above 100 (57 % at 108, 61 % at
 * 117); the 60-65 % figure is sourced only at 122-125 BPM.
 */
export function swingAmount(bpm: number, macro: number) {
  const pct = Math.max(50, Math.min(66, 54 + (bpm - 100) * 0.4 + (macro - 0.5) * 16));
  return (pct - 50) / (50 / 3);
}

export interface NoteEvent {
  /** "beat" marks each quarter note (vel 1 on a phrase's first beat). */
  voice: VoiceId | "beat";
  time: number;
  vel: number;
  /** MIDI pitch for pitched voices. */
  pitch?: number;
}

export interface DriftView {
  running: boolean;
  /** The set's seed: the same seed and the same moves give the same music (`?seed=`). */
  seed: number;
  scene: number;
  section: Section;
  bar: number;
  at: number;
  of: number;
  bpm: number;
  key: string;
  mode: Mode;
  chord: number;
  levels: Record<VoiceId, number>;
  pinned: Record<VoiceId, boolean>;
  mutes: Record<VoiceId, boolean>;
  solo: VoiceId | null;
  macros: Record<MacroId, number>;
  auto: boolean;
  holding: boolean;
}

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export const keyName = (midi: number) => NAMES[((midi % 12) + 12) % 12]!;
const ROMAN = ["i", "ii", "III", "iv", "v", "VI", "VII"];
export const roman = (d: number) => ROMAN[((d % 7) + 7) % 7]!;

const each = <T>(f: (v: VoiceId) => T) =>
  Object.fromEntries(VOICES.map((v) => [v, f(v)])) as Record<VoiceId, T>;

export function createEngine(seed = 20261010) {
  const conductor = createConductor(seed);
  let ctx: AudioContext | null = null;
  let bus: Bus | null = null;
  let synth: Synth | null = null;
  let r: Rng = mulberry(seed ^ 0x9e37);
  const macros = { ...DEFAULT_MACROS };
  const mutes = each(() => false);
  let solo: VoiceId | null = null;
  const accent = each(() => 1);
  const salt = each(() => 0);
  let expression = 0;
  let current: Bar | null = null;
  let bpm = SCENES[conductor.state.scene]!.bpm;
  let root = SCENES[conductor.state.scene]!.roots[0]!;
  let mode: Mode = SCENES[conductor.state.scene]!.modes[0]!;
  let prog = [0, 5, 3, 6];
  let lead: MotifNote[] = [];
  let answer: MotifNote[] = [];
  let bars = {} as Record<VoiceId, (Hit & { len?: number })[]>;
  let fills = {} as Record<VoiceId, (Hit & { len?: number })[]>;
  let lastBass: number | undefined;
  let lastLead: number | undefined;
  let lastScene = -1;
  let throwUntil = 0;
  const listeners = new Set<(e: NoteEvent) => void>();
  const viewers = new Set<() => void>();
  let view: DriftView = snapshot(false);

  function snapshot(running: boolean): DriftView {
    const st = conductor.state;
    const levels = current?.levels ?? each(() => 0);
    return {
      running,
      seed,
      scene: st.scene,
      section: current?.section ?? "arrive",
      bar: current?.bar ?? 0,
      at: current?.at ?? 0,
      of: current?.of ?? 16,
      bpm: Math.round(bpm),
      key: keyName(root),
      mode,
      chord: current ? prog[Math.floor(current.bar / 2) % prog.length]! : 0,
      levels,
      pinned: each((v) => !!st.pins[v]),
      mutes: { ...mutes },
      solo,
      macros: { ...macros },
      auto: st.auto,
      holding: st.holding,
    };
  }
  const publish = () => {
    view = snapshot(!!ctx && ctx.state === "running");
    viewers.forEach((f) => f());
  };

  /** The kick's tail on the tonic (or its fifth) between 41 and 62 Hz. */
  const kickTail = () => {
    const n = 24 + (((root % 12) + 12) % 12);
    return hz(n < 28 ? n + 7 : n);
  };
  const targetBpm = () => SCENES[conductor.state.scene]!.bpm + (macros.tempo - 0.5) * 16;
  const audible = (v: VoiceId) => !mutes[v] && (solo === null || solo === v);
  const emit = (e: NoteEvent) => listeners.forEach((f) => f(e));

  function reroll(b: Bar) {
    const scene = SCENES[b.scene]!;
    const rr = (v: VoiceId) => mulberry(seed + b.bar * 131 + salt[v] * 7919 + VOICES.indexOf(v));
    const L = b.levels;
    const make = (lv: Record<VoiceId, number>) => ({
      kick: P.kick(scene.feel, lv.kick, rr("kick")),
      perc: P.perc(lv.perc, rr("perc"), Math.floor(rr("perc")() * 4)),
      hats: P.hats(scene.feel, lv.hats, rr("hats")),
      clap: P.clap(scene.feel, lv.clap, rr("clap")),
      bass: P.bass(scene.feel, lv.bass, rr("bass")),
      keys: P.keys(lv.keys, rr("keys")),
      pluck: P.pluck(lv.pluck, rr("pluck"), Math.floor(rr("pluck")() * 3)),
      voice: [],
    });
    bars = make(L);
    const up = (v: VoiceId, d: number) => Math.min(6, L[v] + d);
    fills = make({
      ...L,
      perc: up("perc", 1),
      hats: up("hats", 1),
      clap: up("clap", 1),
      bass: up("bass", 1),
    });
    if (b.section === "rise") fills.kick = fills.kick.filter((h) => h.step < 12);
  }

  function newHarmony(b: Bar) {
    const scene = SCENES[b.scene]!;
    if (b.scene !== lastScene) {
      root = pick(r, scene.roots);
      mode = pick(r, scene.modes);
      lastScene = b.scene;
    } else if (r() < 0.25) mode = pick(r, scene.modes);
    prog = progression(r, mode, 4);
  }

  function newMotif(b: Bar) {
    const density = 0.25 + b.levels.voice * 0.08;
    lead = motif(r, 2, density, [0, 8]);
    answer = vary(r, lead, 0.35);
  }

  function onBar(): Bar {
    const b = conductor.next();
    const sceneChanged = b.scene !== lastScene;
    if (b.fresh) {
      if (sceneChanged || b.section === "arrive" || b.section === "settle" || r() < 0.3) newHarmony(b);
      if (sceneChanged || b.section !== "rise" || lead.length === 0) newMotif(b);
      reroll(b);
    } else if (b.at % 8 === 0) reroll(b); // levels may have moved at the phrase line
    current = b;
    applySection(b);
    return b;
  }

  /** Tone filter: the macro, closed a little in the hush, swept open through the rise. */
  function applySection(b: Bar) {
    if (!bus || !ctx) return;
    // Incommensurate slow drifts (Eno's unsynchronised loops): filter 37 s, space 89 s.
    const t = ctx.currentTime;
    const base = 300 * 2 ** (macros.filter * 5.5 + 0.35 * Math.sin((2 * Math.PI * t) / 37));
    bus.reverbSend.gain.setTargetAtTime(
      0.15 + macros.space * (0.7 + 0.2 * Math.sin((2 * Math.PI * t) / 89)),
      t,
      1,
    );
    const f =
      b.section === "hush"
        ? base * 0.45
        : b.section === "rise"
          ? base * (0.3 + (0.7 * (b.at + 1)) / b.of)
          : base;
    bus.tone.frequency.setTargetAtTime(Math.min(16000, f * (1 + expression)), t, 0.4);
  }

  function chordAt(barIndex: number) {
    const d = prog[Math.floor(barIndex / 2) % prog.length]!;
    return { d, degrees: chordDegrees(d, (SCENES[conductor.state.scene]!.colour + macros.colour) / 2 + 0.1) };
  }

  function step(n: number, grid: number, dur: number, swingS: number) {
    if (!synth || !bus) return;
    const s = n % 16;
    if (s === 0 || !current) onBar();
    const b = current!;
    if (s % 4 === 0) emit({ voice: "beat", time: grid, vel: s === 0 && b.at % 8 === 0 ? 1 : 0.5 });
    bpm += (targetBpm() - bpm) * 0.02; // glide over a few bars
    const fill = b.fill;
    const scene = SCENES[b.scene]!;
    const { d, degrees } = chordAt(b.bar);
    let time = grid;
    const pat = (v: VoiceId) => ((fill && fills[v]) || bars[v] || []).filter((h) => h.step === s);
    const vel = (v: VoiceId, h: Hit) => Math.min(1.2, h.vel * accent[v]);
    const play = (v: VoiceId, f: (h: Hit & { len?: number }) => number | undefined) => {
      if (!audible(v)) return;
      time = grid + swingS * SWING_SHARE[v];
      for (const h of pat(v)) {
        const pitch = f(h);
        emit({ voice: v, time, vel: vel(v, h), ...(pitch !== undefined ? { pitch } : {}) });
      }
    };

    play("kick", (h) => void synth!.kick(time, vel("kick", h), macros.pump * 0.7, kickTail()));
    play(
      "perc",
      (h) =>
        void synth!.perc(
          time + (Math.random() - 0.5) * 0.006,
          vel("perc", h),
          h.alt ?? 0,
          170 + b.scene * 12,
        ),
    );
    play("hats", (h) => void synth!.hats(time + (Math.random() - 0.5) * 0.008, vel("hats", h), h.alt ?? 0));
    play("clap", (h) => void synth!.clap(time - (h.step === 12 ? 0.006 : 0), vel("clap", h), h.alt ?? 0));
    play("bass", (h) => {
      const tone = degree(root, mode, d) + (h.alt === 1 ? 12 : h.alt === 2 ? 7 : 0);
      const note = tone > root + 9 ? tone - 12 : tone;
      synth!.bass(
        time,
        note,
        (h.len ?? 4) * dur,
        vel("bass", h),
        lastBass !== undefined && Math.abs(lastBass - note) <= 5 && r() < 0.3 ? lastBass : undefined,
      );
      lastBass = note;
      return note;
    });
    play("keys", (h) => {
      const notes = voice(root, mode, degrees, root + 19);
      synth!.keys(time, notes, (h.len ?? 4) * dur, vel("keys", h), macros.colour * 0.6 + expression * 0.4);
      return notes[0];
    });
    play("pluck", (h) => {
      const tones = voice(root, mode, degrees, root + 26);
      const i = h.alt ?? 0;
      const note = tones[i % tones.length]! + 12 * (Math.floor(i / tones.length) % 2);
      synth!.pluck(
        time,
        note,
        vel("pluck", h),
        scene.scale === "cell" || scene.scale === "aggregate",
        Math.sin(i * 1.7) * 0.5,
      );
      return note;
    });

    // Voice: call (bars 0-1), rest, answer (4-5), rest; busier levels sing through the rests.
    if (b.levels.voice > 0 && audible("voice")) {
      time = grid + swingS * SWING_SHARE.voice;
      const ph = b.at % 8;
      const src =
        ph < 2
          ? lead
          : ph >= 4 && ph < 6
            ? answer
            : b.levels.voice >= 4
              ? vary(mulberry(b.bar), lead, 0.6)
              : [];
      for (const m of src.filter((x) => x.step === (ph % 2) * 16 + s)) {
        const note = degree(root + 24, mode, m.d);
        const v = m.vel * accent.voice;
        // Desert palette: an upper-semitone grace into tonic arrivals (design choice, not sourced).
        if (mode === "hijaz" && ((m.d % 7) + 7) % 7 === 0 && r() < 0.35)
          synth.voice(time - 0.06, note + 1, 0.07, v * 0.7, 0.5, expression);
        synth.voice(
          time,
          note,
          m.len * dur * 1.1,
          v,
          0.5 + 0.5 * Math.sin(b.bar / 5),
          expression,
          lastLead !== undefined && r() < 0.25 ? lastLead : undefined,
        );
        lastLead = note;
        emit({ voice: "voice", time, vel: v, pitch: note });
      }
    }
    if (grid > throwUntil) bus.delaySend.gain.setTargetAtTime(0.15 + macros.space * 0.4, grid, 0.05);
    if (s === 15) publish();
  }

  const clock = createClock({
    now: () => ctx?.currentTime ?? 0,
    bpm: () => bpm,
    swing: () => swingAmount(bpm, macros.swing),
    aheadS: () => (typeof document !== "undefined" && document.hidden ? 1.2 : 0.12),
    onStep: step,
  });

  function applyMacros() {
    if (!bus || !ctx) return;
    const t = ctx.currentTime;
    bus.air.gain.setTargetAtTime(macros.air * 0.05, t, 0.3);
    bus.delay.delayTime.setTargetAtTime(sixteenth(bpm) * 3, t, 0.2); // dotted eighth
    conductor.state.energy = macros.energy;
    if (current) applySection(current);
  }

  return {
    get view() {
      return view;
    },
    get ctx() {
      return ctx;
    },
    get analyser() {
      return bus?.analyser ?? null;
    },
    subscribe(f: () => void) {
      viewers.add(f);
      return () => void viewers.delete(f);
    },
    onNote(f: (e: NoteEvent) => void) {
      listeners.add(f);
      return () => void listeners.delete(f);
    },
    /** Call from a user gesture: browsers start audio only then. */
    start() {
      if (!ctx) {
        ctx = new AudioContext({ latencyHint: "playback" });
        bus = createBus(ctx);
        synth = createSynth(bus);
        r = mulberry(seed ^ 0x9e37);
        applyMacros();
      }
      void ctx.resume().then(() => {
        clock.start();
        publish();
      });
    },
    stop() {
      clock.stop();
      void ctx?.suspend().then(publish);
    },
    macro(id: MacroId, v: number) {
      macros[id] = Math.max(0, Math.min(1, v));
      applyMacros();
      publish();
    },
    level(v: VoiceId, level: number) {
      conductor.pin(v, level);
      if (current) {
        current.levels[v] = level;
        reroll(current);
      }
      publish();
    },
    release(v: VoiceId) {
      conductor.unpin(v);
      publish();
    },
    mute(v: VoiceId) {
      mutes[v] = !mutes[v];
      publish();
    },
    solo(v: VoiceId | null) {
      solo = solo === v ? null : v;
      publish();
    },
    /** New pattern for one voice from the next bar. */
    reroll(v: VoiceId) {
      salt[v]++;
      if (v === "voice" && current) newMotif(current);
      if (current) reroll(current);
    },
    accent(v: VoiceId, a: number) {
      accent[v] = a;
    },
    /** Pressure 0..1: opens the filter, the chords and the voice. */
    expression(x: number) {
      expression = Math.max(0, Math.min(1, x));
      if (current) applySection(current);
    },
    scene(i: number) {
      conductor.scene(i);
      publish();
    },
    auto(on: boolean) {
      conductor.state.auto = on;
      publish();
    },
    hold(on: boolean) {
      conductor.state.holding = on;
      publish();
    },
    jump(s: Section) {
      conductor.jump(s);
    },
    /** Delay throw: open the delay send wide for one beat. */
    throwDelay() {
      if (!bus || !ctx) return;
      const t = ctx.currentTime;
      throwUntil = t + sixteenth(bpm) * 4;
      bus.delaySend.gain.cancelScheduledValues(t);
      bus.delaySend.gain.setTargetAtTime(1, t, 0.01);
      bus.delaySend.gain.setTargetAtTime(0.15 + macros.space * 0.4, throwUntil, 0.3);
    },
    /** A new chord loop at the next bar. */
    rechord() {
      prog = progression(r, mode, 4);
      publish();
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
