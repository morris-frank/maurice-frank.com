import { describe, expect, it } from "vitest";
import { sixteenth, swingOffset } from "./clock";
import { createConductor } from "./conductor";
import { swingAmount, type DriftView } from "./engine";
import { actionAt, leds } from "./grid";
import { address, cellOf, detect, frameMessages, ledIndex, parse, programmerMode } from "./launchpad";
import { clap, hats, kick, VOICES, type VoiceId } from "./patterns";
import { euclid, mulberry } from "./rng";
import { SCENES } from "./scenes";
import { karplus } from "./synth";
import { degree, motif, progression } from "./theory";

const steps = (hits: { step: number }[]) => hits.map((h) => h.step).sort((a, b) => a - b);

describe("rhythm", () => {
  it("spreads Euclidean onsets evenly", () => {
    expect(euclid(4, 16).flatMap((h, i) => (h ? [i] : []))).toEqual([0, 4, 8, 12]);
    expect(euclid(3, 8).filter(Boolean)).toHaveLength(3);
    expect(euclid(0, 16).some(Boolean)).toBe(false);
  });

  it("swings only the off sixteenths, by a tempo-scaled amount", () => {
    expect(swingOffset(0, 120, 1)).toBe(0);
    expect(swingOffset(1, 120, 1)).toBeCloseTo(sixteenth(120) / 3);
    // 54 % + 0.4 %/BPM: more swing at 117 than at 104, and always within MPC 50-66 %.
    expect(swingAmount(117, 0.5)).toBeGreaterThan(swingAmount(104, 0.5));
    expect(swingAmount(200, 1)).toBeCloseTo(0.96); // 66 % MPC, just under a triplet
    expect(swingAmount(60, 0)).toBe(0);
  });
});

describe("theory", () => {
  it("walks the scale across octaves", () => {
    expect(degree(57, "aeolian", 0)).toBe(57);
    expect(degree(57, "aeolian", 2)).toBe(60);
    expect(degree(57, "aeolian", 7)).toBe(69);
    expect(degree(57, "aeolian", -1)).toBe(55);
    expect(degree(57, "hijaz", 1)).toBe(58);
  });

  it("starts every loop on the tonic and is seed-stable", () => {
    for (const mode of ["aeolian", "dorian", "phrygian", "hijaz"] as const) {
      const p = progression(mulberry(3), mode);
      expect(p[0]).toBe(0);
      expect(p).toEqual(progression(mulberry(3), mode));
    }
  });

  it("keeps the motif inside its bars and range", () => {
    const m = motif(mulberry(9), 8, 0.6, [0, 9]);
    expect(m.length).toBeGreaterThan(0);
    for (const n of m) {
      expect(n.step).toBeGreaterThanOrEqual(0);
      expect(n.step + n.len).toBeLessThanOrEqual(8 * 16);
      expect(n.d).toBeGreaterThanOrEqual(0);
      expect(n.d).toBeLessThanOrEqual(9);
    }
  });
});

describe("conductor", () => {
  it("opens fresh, then plays the groove at default energy in a bloom", () => {
    const c = createConductor(1);
    expect(c.next()).toMatchObject({ bar: 0, section: "arrive", fresh: true, scene: 2 });
    c.jump("bloom");
    const b = c.next();
    expect(b).toMatchObject({ section: "bloom", at: 0, fresh: true });
    const r = mulberry(1);
    const feel = SCENES[b.scene]!.feel;
    expect(steps(kick(feel, b.levels.kick, r))).toEqual(expect.arrayContaining([0, 4, 8, 12]));
    expect(steps(clap(feel, b.levels.clap, r))).toEqual(expect.arrayContaining([4, 12]));
    expect(hats(feel, b.levels.hats, r).some((h) => h.alt === 1 && h.step === 2)).toBe(true);
  });

  it("holds a pin for two phrases under auto, then lets go", () => {
    const c = createConductor(2);
    c.next();
    c.pin("bass", 6);
    for (let i = 0; i < 15; i++) expect(c.next().levels.bass).toBe(6);
    c.next();
    expect(c.state.pins.bass).toBeUndefined();
  });

  it("drifts only between neighbouring scenes", () => {
    const c = createConductor(5);
    let last = c.next().scene;
    for (let i = 0; i < 2000; i++) {
      const s = c.next().scene;
      expect(Math.abs(s - last)).toBeLessThanOrEqual(1);
      last = s;
    }
  });
});

describe("launchpad", () => {
  it("round-trips every cell through its MIDI address", () => {
    for (let y = -1; y < 8; y++)
      for (let x = 0; x <= 8; x++) {
        if (y === -1 && x === 8) continue; // the logo is output only
        const a = address({ x, y });
        expect(cellOf(a.cc, a.n)).toEqual({ x, y });
      }
    expect(address({ x: 0, y: 7 })).toEqual({ cc: false, n: 11 });
    expect(address({ x: 8, y: 0 })).toEqual({ cc: true, n: 89 });
    expect(ledIndex({ x: 8, y: -1 })).toBe(99);
  });

  it("parses pads, buttons and pressure", () => {
    expect(parse([0x90, 81, 100])).toEqual({ kind: "down", cell: { x: 0, y: 0 }, vel: 100 });
    expect(parse([0x90, 81, 0])).toEqual({ kind: "up", cell: { x: 0, y: 0 } });
    expect(parse([0xb0, 91, 127])).toEqual({ kind: "down", cell: { x: 0, y: -1 }, vel: 127 });
    expect(parse([0xa0, 11, 64])).toEqual({ kind: "pressure", cell: { x: 0, y: 7 }, value: 64 });
    expect(parse([0xf8])).toBeNull();
  });

  it("picks the MIDI port and skips DAW and DIN ports", () => {
    expect(detect("Launchpad Mini MK3 LPMiniMK3 MIDI")).toBe("mini-mk3");
    expect(detect("LPMiniMK3 DAW")).toBeNull();
    expect(detect("Launchpad X LPX MIDI")).toBe("x");
    expect(detect("LPProMK3 MIDI")).toBe("pro-mk3");
    expect(detect("LPProMK3 DIN")).toBeNull();
    expect(detect("IAC Driver Bus 1")).toBeNull();
  });

  it("writes Programmer mode and batched RGB SysEx", () => {
    expect(programmerMode("x", true)).toEqual([0xf0, 0x00, 0x20, 0x29, 0x02, 0x0c, 0x0e, 0x01, 0xf7]);
    const msgs = frameMessages(
      "mini-mk3",
      new Map([
        [11, { rgb: [127, 0, 200] as const }],
        [89, { rgb: [0, 127, 0] as const, mode: "pulse" as const }],
      ]),
    );
    expect(msgs[0]).toEqual([0xf0, 0x00, 0x20, 0x29, 0x02, 0x0d, 0x03, 3, 11, 127, 0, 127, 0xf7]);
    expect(msgs[1]).toEqual([0xb2, 89, 21]);
  });
});

describe("grid", () => {
  it("maps the surface", () => {
    expect(actionAt({ x: 2, y: -1 }, false)).toEqual({ kind: "scene", index: 2 });
    expect(actionAt({ x: 6, y: -1 }, false)).toEqual({ kind: "auto" });
    expect(actionAt({ x: 0, y: 0 }, false)).toEqual({ kind: "level", voice: "kick", level: 6 });
    expect(actionAt({ x: 1, y: 6 }, false)).toEqual({ kind: "reroll", voice: "perc" });
    expect(actionAt({ x: 7, y: 7 }, false)).toEqual({ kind: "mute", voice: "voice" });
    expect(actionAt({ x: 0, y: 0 }, true)).toMatchObject({ kind: "macro", value: 1 });
    expect(actionAt({ x: 8, y: 3 }, true)).toEqual({ kind: "side", index: 3 });
  });

  it("lights only levels at or below each voice's level", () => {
    const zero = Object.fromEntries(VOICES.map((v) => [v, 0])) as Record<VoiceId, number>;
    const off = Object.fromEntries(VOICES.map((v) => [v, false])) as Record<VoiceId, boolean>;
    const v = {
      scene: 2,
      auto: true,
      holding: false,
      running: true,
      levels: { ...zero, kick: 3 },
      pinned: off,
      mutes: off,
      solo: null,
      macros: {},
    } as unknown as DriftView;
    const out = leds(v, zero, 0, false, new Set(), ledIndex);
    expect(out.has(ledIndex({ x: 0, y: 3 }))).toBe(true); // level 3
    expect(out.has(ledIndex({ x: 0, y: 2 }))).toBe(false); // level 4
    expect(out.has(ledIndex({ x: 1, y: 5 }))).toBe(false); // perc is silent
  });
});

describe("karplus", () => {
  it("renders the asked length at the asked pitch", () => {
    const sr = 44100;
    const f0 = 220;
    const out = karplus(sr, f0, 0.5, 0.5);
    expect(out.length).toBe(sr / 2);
    // The autocorrelation peaks within a sample of the period.
    let best = 0;
    let lag = 0;
    for (let k = 150; k < 260; k++) {
      let s = 0;
      for (let i = 2000; i < 12000; i++) s += out[i]! * out[i + k]!;
      if (s > best) [best, lag] = [s, k];
    }
    expect(Math.abs(lag - sr / f0)).toBeLessThanOrEqual(1);
  });
});
