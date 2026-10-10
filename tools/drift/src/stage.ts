/**
 * Drift's picture: the baked plates of the six scales, stacked as layers that
 * breathe with the music, and a particle layer that answers each note. Notes
 * arrive with audio-clock times and are drawn when they sound, not when they
 * were booked. Visual metaphor only: nothing here is a soil fact.
 */
import { W } from "./palette";
import { loadManifest, pickBaked, plateUrl } from "./plates";
import type { NoteEvent } from "./engine";
import type { VoiceId } from "./patterns";
import { SCENES } from "./scenes";

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  grow: number;
  life: number;
  age: number;
  colour: string;
  ring: boolean;
}

const COLOUR: Record<VoiceId, string> = {
  kick: W.oxide,
  perc: W.sand,
  hats: W.pale,
  clap: W.pale,
  bass: W.clay,
  keys: W.water,
  pluck: W.film,
  voice: W.skyLow,
};

export interface Features {
  /** 0..1 envelopes that jump on a hit and decay. */
  flash: Record<VoiceId, number>;
  beat: number;
  /** Overall loudness 0..1 from the analyser. */
  level: number;
}

export function createStage(host: HTMLElement, opts: { still: boolean }) {
  const plates = SCENES.map(() => {
    const el = document.createElement("div");
    el.className = "drift-plate";
    host.appendChild(el);
    return el;
  });
  const canvas = document.createElement("canvas");
  canvas.className = "drift-motes";
  host.appendChild(canvas);
  const g = canvas.getContext("2d");
  const layers: HTMLImageElement[][] = SCENES.map(() => []);
  const motes: Mote[] = [];
  const pending: NoteEvent[] = [];
  let shown = -1;

  async function load(i: number) {
    if (layers[i]!.length) return;
    const m = await loadManifest();
    const s = SCENES[i]!;
    const plate = m && pickBaked(m, s.plate.recipe, s.plate.seed, innerWidth, innerHeight);
    if (!plate) return;
    plates[i]!.style.background = plate.ground;
    layers[i] = plate.layers.map((l) => {
      const img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.src = plateUrl(l.file);
      plates[i]!.appendChild(img);
      return img;
    });
  }

  function show(i: number) {
    if (i === shown) return;
    shown = i;
    void load(i).then(() => {
      // Warm the neighbours so a drift in or out never waits on the network.
      if (i > 0) void load(i - 1);
      if (i < SCENES.length - 1) void load(i + 1);
    });
    plates.forEach((p, k) => p.classList.toggle("on", k === i));
  }

  function spawn(e: NoteEvent, w: number, h: number) {
    if (e.voice === "beat") return;
    const c = COLOUR[e.voice];
    const at = (pitch: number | undefined, lo: number, hi: number) =>
      ((pitch ?? (lo + hi) / 2) - lo) / (hi - lo);
    const add = (m: Partial<Mote> & Pick<Mote, "x" | "y">) =>
      motes.push({ vx: 0, vy: 0, r: 3, grow: 0, life: 1.5, age: 0, colour: c, ring: false, ...m });
    switch (e.voice) {
      case "kick":
        add({ x: w / 2, y: h * 0.92, r: 20, grow: 260, life: 1.1, ring: true });
        break;
      case "perc":
      case "hats":
        for (let i = 0; i < (e.voice === "perc" ? 3 : 1); i++)
          add({
            x: Math.random() * w,
            y: h * (0.75 + Math.random() * 0.25),
            vy: -20 - Math.random() * 30,
            vx: (Math.random() - 0.5) * 10,
            r: 1 + e.vel * 2,
            life: 2.2,
          });
        break;
      case "clap":
        add({ x: w * (0.3 + Math.random() * 0.4), y: h * 0.55, r: 8, grow: 90, life: 0.6, ring: true });
        break;
      case "bass":
        add({ x: w * at(e.pitch, 30, 60), y: h * 0.85, r: 40, grow: 30, life: 2.5 });
        break;
      case "keys":
        add({
          x: w * (0.2 + Math.random() * 0.6),
          y: h * (0.3 + Math.random() * 0.3),
          r: 70,
          grow: 40,
          life: 4,
        });
        break;
      case "pluck":
        add({
          x: w * at(e.pitch, 55, 90),
          y: h * (0.15 + Math.random() * 0.5),
          r: 2 + e.vel * 2,
          grow: 6,
          vy: -6,
          life: 2.4,
        });
        break;
      case "voice":
        add({
          x: w * at(e.pitch, 60, 84),
          y: h * (0.25 + Math.random() * 0.2),
          r: 10,
          grow: 55,
          vy: -4,
          life: 3.2,
          ring: true,
        });
        break;
    }
    if (motes.length > 400) motes.splice(0, motes.length - 400);
  }

  function frame(now: number, dt: number, f: Features, energy: number, filter: number) {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (canvas.width !== w || canvas.height !== h) [canvas.width, canvas.height] = [w, h];
    while (pending.length && pending[0]!.time <= now) spawn(pending.shift()!, w, h);
    // Breathing plates: deeper layers sway more, the kick nudges, the mix's loudness swells.
    const ls = layers[shown] ?? [];
    ls.forEach((img, k) => {
      const depth = ls.length > 1 ? k / (ls.length - 1) : 0;
      const sway = Math.sin(now * 0.07 + k * 1.3) * 10 * depth;
      const lift = f.flash.kick * 3 * depth;
      const scale = 1.03 + 0.012 * f.flash.kick * depth + 0.015 * f.level;
      img.style.transform = `translate3d(${sway.toFixed(2)}px, ${lift.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    });
    host.style.setProperty("--drift-bright", (0.62 + 0.3 * filter + 0.12 * f.level).toFixed(3));
    host.style.setProperty("--drift-sat", (0.7 + 0.45 * energy).toFixed(3));
    if (!g) return;
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = "screen";
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]!;
      m.age += dt;
      if (m.age >= m.life) {
        motes.splice(i, 1);
        continue;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const p = m.age / m.life;
      const r = m.r + m.grow * p;
      const a = (1 - p) * (m.ring ? 0.35 : 0.5);
      g.globalAlpha = a;
      if (m.ring) {
        g.strokeStyle = m.colour;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(m.x, m.y, r, 0, Math.PI * 2);
        g.stroke();
      } else {
        const grad = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        grad.addColorStop(0, m.colour);
        grad.addColorStop(1, "transparent");
        g.fillStyle = grad;
        g.fillRect(m.x - r, m.y - r, r * 2, r * 2);
      }
    }
    g.globalAlpha = 1;
  }

  return {
    show,
    note(e: NoteEvent) {
      if (opts.still) return;
      pending.push(e);
      pending.sort((a, b) => a.time - b.time);
    },
    frame: opts.still ? () => undefined : frame,
  };
}
