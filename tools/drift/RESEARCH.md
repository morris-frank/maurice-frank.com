# Drift: a best-estimate model of slow house and organic downtempo

Research note, 2026-10-10. This note backs `drift.html` (`src/drift/`), an endless generator that runs in the valley's six scales and is played from a Novation Launchpad or the screen. A research pass looked at one Berlin slow-house and downtempo producer, the wider organic-house scene, the Web Audio literature and Novation's programmer manuals. This note keeps what the generator uses, says how sure each part is, and marks design choices as choices.

It is a study of a style. It does not model, imitate or speak for any artist. Nothing in Drift is a soil fact.

**Confidence labels.**

| Label | Meaning |
|---|---|
| firm | Stated in a primary source that was read. |
| estimate | From secondary or second-hand sources, small samples or inference. |
| contested | Sources disagree, or the evidence is absent. |
| design choice | No source. Picked by ear or by analogy, to be tuned. |

## Tempo

| Claim | Confidence | Basis | Where in code |
|---|---|---|---|
| The reference producer's tracks cluster at about 104–110 BPM and 117–118 BPM. | estimate | n = 7, from automatic BPM detection on a DJ database. One 162 BPM reading looks like a double-time error. | `scenes.ts`: the six scenes span 98–118 BPM. |
| Downtempo sits at roughly 90–110 BPM, and organic house at 115–122 BPM. | estimate | [Wikipedia: Downtempo](https://en.wikipedia.org/wiki/Downtempo); [mixgraph genre BPM](https://www.mixgraph.io/bpm-for/downtempo); [NI organic house guide](https://blog.native-instruments.com/organic-house-music/) | Scene BPMs. |
| Six of the seven tracks are in minor keys. | estimate | Automatic key detection, n = 7. | Every mode pool in `theory.ts` is minor. |
| A tempo change glides instead of jumping. | design choice | — | `engine.ts`, BPM glide. |

## Groove

| Claim | Confidence | Basis | Where in code |
|---|---|---|---|
| In the slow-house form the kick is four on the floor, claps fall on 2 and 4, the open hat sits on the offbeat and a 16th shaker runs underneath. | firm for one tutorial; estimate for the genre | [Attack: Beat dissected, organic house](https://www.attackmagazine.com/technique/beat-dissected/organic-house/) (122–125 BPM) | `patterns.ts`, the `four` feel. |
| Swing of 60–65 % (MPC style). | estimate | The same tutorial. Sourced only at 122–125 BPM. | — |
| Swing scales with tempo: 54 % plus 0.4 % per BPM above 100. | design choice | Extrapolated down from the 60–65 % figure. | `engine.ts` `swingAmount`. |
| Each voice takes its own share of the swing; the kick and the chords stay straight. | design choice | — | `engine.ts` `SWING_SHARE`. |
| The kick stays dry, and the percussion and melodic parts go into the reverb. | estimate | Practitioner tutorials ([Magnetic, organic house percussion](https://magneticmag.com/2023/07/tutorials-for-making-better-organic-house-percussions/); [Mode Audio](https://modeaudio.com/magazine/ableton-live-tutorial-adding-percussion-spice)). | `synth.ts`, bus routing. |
| Hand percussion follows Euclidean patterns. | design choice; the method is firm | [Toussaint 2005](https://cgm.cs.mcgill.ca/~godfried/publications/banff.pdf) | `rng.ts` `euclid`, `patterns.ts` `perc`, `pluck`. |
| The broken downtempo kick (beat 1 plus the "and" of 2–3). | design choice | — | `patterns.ts`, the `broken` feel. |

## Synthesis

Every sound is synthesised in the browser. Drift uses no samples.

| Claim | Confidence | Basis | Where in code |
|---|---|---|---|
| Schedule against `AudioContext.currentTime` with a short timer and a lookahead. Never start sounds from timers. | firm | [Wilson, "A Tale of Two Clocks"](https://web.dev/articles/audio-scheduling); [MDN, Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) | `clock.ts` |
| A cyclic `DelayNode` loop is clamped to at least one 128-frame render quantum, so a live Karplus-Strong pluck cannot go above about 375 Hz. Plucks are rendered offline. | firm | Web Audio API specification | `synth.ts` `karplus` |
| Plucks are tuned with an allpass fractional delay. | firm | [Karplus & Strong 1983; Jaffe & Smith 1983, via J. O. Smith, PASP](https://ccrma.stanford.edu/~jos/pasp/Karplus_Strong_Algorithms.html) | `synth.ts` `karplus` |
| The kick is a sine with a downward pitch sweep and a short click. | firm, as a method | [Reid, Synth Secrets: practical bass drum synthesis](https://www.soundonsound.com/techniques/practical-bass-drum-synthesis) | `synth.ts` `kick` |
| The genre leans on deep, long bass notes. | estimate | Fan descriptions and one tutorial | `patterns.ts` `bass` |
| Kalimba and marimba are typical genre timbres. | estimate | One tutorial | `synth.ts` `pluck` |
| A wordless formant voice stands in for the live vocals the scene often uses. It is a texture and not a person. | design choice | Fan descriptions of live sets | `synth.ts` `voice` |
| The duck depth, the delay throw and the reverb impulse shape. | design choice | — | `synth.ts` |
| `cancelAndHoldAtTime` is missing in Firefox, so the code feature-detects it. | firm | MDN | `synth.ts` `kick` |

## Arrangement

| Claim | Confidence | Basis | Where in code |
|---|---|---|---|
| The music works in 8-bar phrases, with sections of 16–64 bars and gradual change. | estimate | House practice ([Mixed In Key: arranging](https://mixedinkey.com/captain-plugins/wiki/how-to-arrange-a-dance-music-track/); [Lost Stories: DJ-friendly tracks](https://loststoriesacademy.com/blogs-and-tutorials/what-makes-a-track-dj-friendly)) | `conductor.ts` |
| Tracks are built loop-first: kick, bass, chords, then percussion. | estimate | Second-hand summary of one interview | Patterns repeat for each section and re-roll only on a fresh section. |
| The section machine (arrive, settle, bloom, hush, rise), the energy shape and the drift between scenes. | design choice | — | `conductor.ts` |
| Slow LFOs with periods that never line up (filter 37 s, space 89 s). | design choice; the principle is firm | [Eno 1996, "Generative Music"](https://inmotionmagazine.com/eno1.html) | `engine.ts`, `synth.ts` |
| Chord transition tables, the extensions, and the call-and-answer motif. | design choice | No progressions are documented for the reference producer or for the scene's labels. | `theory.ts` |
| The "desert" palette (Hijaz, harmonic minor) in the Cell scene. | contested | Nothing in the reference producer's work shows it. It reaches this scene only through remixes and the wider organic-house genre ([Wikipedia: Phrygian dominant](https://en.wikipedia.org/wiki/Phrygian_dominant_scale)). Offered as a palette, not as anyone's sound. | `scenes.ts`, `theory.ts` |

## Launchpad

| Claim | Confidence | Basis |
|---|---|---|
| Programmer mode, the note and CC layout, and RGB LED SysEx for the Launchpad X, Mini MK3 and Pro MK3. | firm | Novation programmer's reference manuals |
| Per-pad pressure in Programmer mode and LED sync to MIDI clock. | estimate | Untested on hardware. Must be checked on a device. |
| `requestMIDIAccess({ sysex: true })` needs a secure context and a permission prompt. Safari has no Web MIDI. | firm | [MDN requestMIDIAccess](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMIDIAccess); [Chrome: Web MIDI permission](https://developer.chrome.com/blog/web-midi-permission-prompt) |

## What is not known

The research could not establish the reference producer's:

- gear or DAW;
- tempo and key spread beyond the seven auto-analysed tracks;
- chord vocabulary or swing settings;
- mix or master chain;
- whether they use Middle-Eastern scales or instruments;
- how their live sets are structured.

## Open decisions

1. **Naming the reference.** Should the artist's name appear anywhere in this public repo or UI? This note and the code leave it out, and the recommendation is to keep it out. The on-screen copy says "Inspired by Berlin slow house and organic downtempo".
2. **Where Drift lives.** Does Drift ship in the `public` profile, which would bring it under golden rules 2 and 6? The other option is a separate, internal experiment.
3. **SysEx permission.** How should the UX handle it? At the moment the browser prompts on "Link a Launchpad".
4. **Hardware.** Pressure, clock sync and the Pro MK3 have not been tested on a device.
