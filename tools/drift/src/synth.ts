/**
 * Every sound of Drift, synthesised in Web Audio: no samples ship. Recipes and
 * their confidence are in RESEARCH.md §Synthesis; the
 * numbers are tuned by ear, not measured. Envelopes start at 0 and end on
 * `setTargetAtTime` so nothing clicks (W3C spec on exponential ramps to 0).
 */
import { hz } from "./theory";

export interface Bus {
  ctx: AudioContext;
  master: GainNode;
  drums: GainNode;
  perc: GainNode;
  music: GainNode;
  duck: GainNode;
  tone: BiquadFilterNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  delay: DelayNode;
  air: GainNode;
  analyser: AnalyserNode;
}

const env = (g: AudioParam, t: number, peak: number, attack: number, decay: number) => {
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + attack);
  g.setTargetAtTime(0, t + attack, decay / 3);
};

function noiseBuffer(ctx: BaseAudioContext, seconds: number) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Stereo noise with an exponential tail that darkens as it decays (Tone.js Reverb approach, in plain TS). */
function impulse(ctx: BaseAudioContext, seconds: number) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const k = 0.6 - 0.55 * t; // one-pole lowpass closing over the tail
      lp += k * (Math.random() * 2 - 1 - lp);
      d[i] = lp * Math.exp(-5 * t) * (i < ctx.sampleRate * 0.012 ? 0 : 1);
    }
  }
  return b;
}

/** Soft tape-like saturation curve; `drive` 0..1. */
export function saturation(drive: number, n = 1024) {
  const k = 1 + drive * 6;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

/**
 * Karplus-Strong pluck rendered offline (a DelayNode loop cannot go above
 * ~375 Hz: the spec clamps cyclic delays to one 128-frame quantum).
 * `bright` 0..1 sets the loop filter; lower is woodier (kalimba), higher is a string.
 */
export function karplus(
  sampleRate: number,
  f0: number,
  seconds: number,
  bright: number,
  seed = 1,
): Float32Array {
  const n = Math.floor(sampleRate * seconds);
  const out = new Float32Array(n);
  // Loop delay = buffer + 0.5 (two-point average) + allpass fraction (Jaffe & Smith tuning).
  const P = sampleRate / f0 - 0.5;
  let L = Math.floor(P);
  let fr = P - L;
  if (fr < 0.1) {
    L -= 1;
    fr += 1;
  }
  const C = (1 - fr) / (1 + fr);
  const line = new Float32Array(Math.max(2, L));
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  // Burst through a one-pole lowpass: a softer excitation than white noise.
  let lp = 0;
  for (let i = 0; i < line.length; i++) line[i] = lp += (0.25 + bright * 0.6) * (rnd() - lp);
  const decay = 0.996 + bright * 0.003;
  let last = 0;
  let apX = 0;
  let apY = 0;
  for (let i = 0, k = 0; i < n; i++, k = (k + 1) % line.length) {
    const cur = line[k]!;
    out[i] = cur;
    const avg = 0.5 * (cur + last);
    last = cur;
    apY = C * avg + apX - C * apY;
    apX = avg;
    line[k] = apY * decay;
  }
  const fade = Math.floor(sampleRate * 0.02);
  for (let i = 0; i < fade; i++) out[n - 1 - i]! *= i / fade;
  return out;
}

export function createBus(ctx: AudioContext): Bus {
  const master = ctx.createGain();
  master.gain.value = 0.8;
  const shaper = ctx.createWaveShaper();
  shaper.curve = saturation(0.25);
  shaper.oversample = "2x";
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 6;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.2;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.8;
  master.connect(shaper).connect(limiter).connect(analyser).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 4.5);
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.5;
  const reverbBack = ctx.createGain();
  reverbBack.gain.value = 0.55;
  reverbSend.connect(reverb).connect(reverbBack).connect(master);

  const delay = ctx.createDelay(2);
  const fbFilter = ctx.createBiquadFilter();
  fbFilter.type = "lowpass";
  fbFilter.frequency.value = 2800;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.42;
  const delaySend = ctx.createGain();
  delaySend.gain.value = 0.35;
  const delayBack = ctx.createGain();
  delayBack.gain.value = 0.5;
  delaySend.connect(delay).connect(fbFilter).connect(feedback).connect(delay);
  fbFilter.connect(delayBack).connect(master);
  delayBack.connect(reverbSend);

  // The kick stays dry; percussion and music feed the space (Mode Audio, Attack: kick dry, perc in the reverb).
  const drums = ctx.createGain();
  drums.connect(master);
  const perc = ctx.createGain();
  // A gentle high shelf: hours of shaker should not tire the ear.
  const shelf = ctx.createBiquadFilter();
  shelf.type = "highshelf";
  shelf.frequency.value = 10000;
  shelf.gain.value = -3;
  perc.connect(shelf).connect(master);
  const percSend = ctx.createGain();
  percSend.gain.value = 0.35;
  perc.connect(percSend).connect(reverbSend);

  const music = ctx.createGain();
  const duck = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 9000;
  tone.Q.value = 0.8;
  music.connect(duck).connect(tone).connect(master);
  tone.connect(reverbSend);
  tone.connect(delaySend);

  // Air: a quiet looped wash with a slow band sweep, the scene's room tone.
  const air = ctx.createGain();
  air.gain.value = 0.0;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 3);
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 700;
  band.Q.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1 / 37;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 450;
  lfo.connect(lfoDepth).connect(band.frequency);
  src.connect(band).connect(air).connect(master);
  air.connect(reverbSend);
  src.start();
  lfo.start();

  return { ctx, master, drums, perc, music, duck, tone, reverbSend, delaySend, delay, air, analyser };
}

export function createSynth(bus: Bus) {
  const { ctx } = bus;
  const noise = noiseBuffer(ctx, 2);
  const plucks = new Map<string, AudioBuffer>();

  function noiseHit(
    t: number,
    dest: AudioNode,
    type: BiquadFilterType,
    f: number,
    q: number,
    peak: number,
    attack: number,
    decay: number,
  ) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = f;
    filter.Q.value = q;
    const g = ctx.createGain();
    env(g.gain, t, peak, attack, decay);
    src.connect(filter).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + attack + decay * 2 + 0.05);
  }

  function tone(
    t: number,
    dest: AudioNode,
    type: OscillatorType,
    f0: number,
    f1: number,
    bendS: number,
    peak: number,
    decay: number,
    attack = 0.002,
  ) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + bendS);
    const g = ctx.createGain();
    env(g.gain, t, peak, attack, decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + decay * 2 + 0.05);
  }

  return {
    /** Deep, soft kick: sine from 130 Hz down to `tail` (the tonic, so kick and bass do not beat), a short click. */
    kick(t: number, vel: number, duckDepth: number, tail: number) {
      tone(t, bus.drums, "sine", 130, tail, 0.09, 0.95 * vel, 0.55, 0.001);
      tone(t, bus.drums, "triangle", 900, 120, 0.012, 0.18 * vel, 0.012, 0.0005);
      const d = bus.duck.gain;
      // Firefox has no cancelAndHoldAtTime; there the duck restarts from 1, which a 12 ms glide hides.
      if (d.cancelAndHoldAtTime) d.cancelAndHoldAtTime(t);
      else d.cancelScheduledValues(t).setValueAtTime(1, t);
      d.setTargetAtTime(1 - duckDepth, t, 0.012);
      d.setTargetAtTime(1, t + 0.06, 0.12);
    },
    /** Hand drum: tuned membrane with a bend, plus a slap of band noise. `alt` 0 low, 1 high, 2 slap. */
    perc(t: number, vel: number, alt: number, pitch: number) {
      const f = [pitch, pitch * 1.5, pitch * 1.33][alt] ?? pitch;
      tone(t, bus.perc, "sine", f * 1.25, f, 0.03, 0.45 * vel, alt === 2 ? 0.08 : 0.22);
      noiseHit(
        t,
        bus.perc,
        "bandpass",
        alt === 2 ? 2400 : 1500,
        1.5,
        (alt === 2 ? 0.35 : 0.12) * vel,
        0.001,
        0.04,
      );
    },
    /** Shaker (alt 0): band noise with a soft attack. Open hat (alt 1): brighter, longer. */
    hats(t: number, vel: number, alt: number) {
      if (alt === 1) noiseHit(t, bus.perc, "highpass", 7500, 0.7, 0.12 * vel, 0.002, 0.18);
      else noiseHit(t, bus.perc, "bandpass", 6500, 1.2, 0.14 * vel, 0.006, 0.05);
    },
    /** Clap (alt 0): three bursts and a tail. Rim (alt 1): short woody tick. */
    clap(t: number, vel: number, alt: number) {
      if (alt === 1) {
        tone(t, bus.perc, "triangle", 1700, 1600, 0.01, 0.2 * vel, 0.03);
        return;
      }
      for (let i = 0; i < 3; i++)
        noiseHit(t + i * 0.011, bus.perc, "bandpass", 1300, 1.1, 0.3 * vel, 0.001, 0.02);
      noiseHit(t + 0.033, bus.perc, "bandpass", 1200, 0.9, 0.22 * vel, 0.002, 0.2);
    },
    /** Long, round, mono bass: sine sub plus a filtered triangle; glides from `from` when given. */
    bass(t: number, midi: number, dur: number, vel: number, from?: number) {
      const f = hz(midi);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.55 * vel, t + 0.012);
      g.gain.setTargetAtTime(0.42 * vel, t + 0.03, 0.2);
      g.gain.setTargetAtTime(0, t + dur, 0.04);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(f * 6, t);
      lp.frequency.setTargetAtTime(f * 2.5, t, 0.15);
      lp.connect(g).connect(bus.music);
      for (const [type, mult, level] of [
        ["sine", 1, 1],
        ["triangle", 2, 0.25],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        const og = ctx.createGain();
        og.gain.value = level;
        if (from !== undefined) {
          o.frequency.setValueAtTime(hz(from) * mult, t);
          o.frequency.exponentialRampToValueAtTime(f * mult, t + 0.06);
        } else o.frequency.setValueAtTime(f * mult, t);
        o.connect(og).connect(lp);
        o.start(t);
        o.stop(t + dur + 0.3);
      }
    },
    /** Chords: detuned saws through a lowpass that blooms and settles; `open` 0..1 is the brightness. */
    keys(t: number, notes: number[], dur: number, vel: number, open: number) {
      const g = ctx.createGain();
      const attack = dur > 1.5 ? 0.4 : 0.01;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime((0.16 * vel) / Math.sqrt(notes.length), t + attack);
      g.gain.setTargetAtTime(0, t + dur, dur > 1.5 ? 0.3 : 0.08);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 2;
      const top = 500 + open * 3500;
      lp.frequency.setValueAtTime(top * 0.4, t);
      lp.frequency.linearRampToValueAtTime(top, t + Math.min(dur * 0.4, 1.2));
      lp.frequency.setTargetAtTime(top * 0.5, t + Math.min(dur * 0.4, 1.2), dur * 0.4);
      lp.connect(g).connect(bus.music);
      const stop = t + dur + 1.6;
      for (const m of notes)
        for (const cents of [-9, 7]) {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = hz(m);
          o.detune.value = cents;
          o.connect(lp);
          o.start(t);
          o.stop(stop);
        }
    },
    /** Kalimba-ish Karplus-Strong pluck, or marimba (sine + 4th partial) when `marimba`. */
    pluck(t: number, midi: number, vel: number, marimba: boolean, pan: number) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      p.connect(bus.music);
      if (marimba) {
        tone(t, p, "sine", hz(midi), hz(midi), 0.01, 0.3 * vel, 0.35);
        tone(t, p, "sine", hz(midi) * 3.93, hz(midi) * 3.93, 0.01, 0.08 * vel, 0.05);
        return;
      }
      const key = `${midi}`;
      let buf = plucks.get(key);
      if (!buf) {
        if (plucks.size >= 40) plucks.delete(plucks.keys().next().value!);
        buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.8), ctx.sampleRate);
        buf.copyToChannel(karplus(ctx.sampleRate, hz(midi), 1.8, 0.35, midi) as Float32Array<ArrayBuffer>, 0);
        plucks.set(key, buf);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.5 * vel;
      src.connect(g).connect(p);
      src.start(t);
    },
    /**
     * Wordless voice: a pulse through vowel formants, ~5 Hz vibrato that fades
     * in, breath noise, and a scoop into the note. `vowel` 0..1 morphs oo→ah;
     * `expr` 0..1 opens it (pad pressure).
     */
    voice(t: number, midi: number, dur: number, vel: number, vowel: number, expr: number, from?: number) {
      const f = hz(midi);
      const out = ctx.createGain();
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(0.2 * vel, t + 0.09);
      out.gain.setTargetAtTime(0, t + dur, 0.12);
      out.connect(bus.music);
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(from !== undefined ? hz(from) : f * 0.975, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
      const vib = ctx.createOscillator();
      vib.frequency.value = 5;
      const vibDepth = ctx.createGain();
      vibDepth.gain.setValueAtTime(0, t);
      vibDepth.gain.linearRampToValueAtTime(f * (0.006 + expr * 0.01), t + Math.min(dur, 0.6));
      vib.connect(vibDepth).connect(o.frequency);
      // Formants (Hz): "oo" 300/870/2240 to "ah" 730/1090/2440, amplitudes falling.
      const F = [
        [300 + 430 * vowel, 1, 6],
        [870 + 220 * vowel, 0.5, 8],
        [2240 + 200 * vowel, 0.18 + expr * 0.2, 10],
      ];
      for (const [freq, amp, q] of F) {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = freq!;
        bp.Q.value = q!;
        const g = ctx.createGain();
        g.gain.value = amp! * 2.2;
        o.connect(bp).connect(g).connect(out);
      }
      noiseHit(t, out, "bandpass", f * 4, 2, 0.25 + expr * 0.2, 0.05, Math.min(dur, 0.6));
      o.start(t);
      vib.start(t);
      o.stop(t + dur + 0.6);
      vib.stop(t + dur + 0.6);
    },
  };
}

export type Synth = ReturnType<typeof createSynth>;
