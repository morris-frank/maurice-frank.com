/**
 * Drift's shell: the stage behind, the status line, the 9×9 grid that mirrors
 * the Launchpad (and stands in for it), the macros as sliders, and the
 * keyboard. Every control is a real button or input; the canvas is aria-hidden.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createController } from "./controller";
import { createEngine, MACROS, roman, type MacroId, type NoteEvent } from "./engine";
import { actionAt, labelOf, leds, LOGO } from "./grid";
import { connect, ledIndex, type Cell, type Pad } from "./launchpad";
import { VOICES, type VoiceId } from "./patterns";
import { SCENES } from "./scenes";
import { createStage } from "./stage";

const ROWS = [-1, 0, 1, 2, 3, 4, 5, 6, 7];
const COLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MUTE_KEYS = "12345678";
const REROLL_KEYS = "qwertyui";
const SCENE_KEYS = "zxcvbn";
const SECTION: Record<string, string> = {
  arrive: "arriving",
  settle: "settling in",
  bloom: "in bloom",
  hush: "hushed",
  rise: "rising",
};

const zero = () => Object.fromEntries(VOICES.map((v) => [v, 0])) as Record<VoiceId, number>;

export function DriftApp() {
  const engine = useMemo(() => {
    const asked = Number(new URLSearchParams(location.search).get("seed"));
    return createEngine(Number.isInteger(asked) && asked > 0 ? asked : Math.floor(Math.random() * 1e6) + 1);
  }, []);
  const controller = useMemo(() => createController(engine), [engine]);
  const view = useSyncExternalStore(engine.subscribe, () => engine.view);
  const shift = useSyncExternalStore(controller.onChange, () => controller.shift);
  const still = useMemo(
    () =>
      new URLSearchParams(location.search).has("static") ||
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<number, HTMLButtonElement>());
  const padRef = useRef<Pad | null>(null);
  const unlinkRef = useRef<(() => void) | null>(null);
  const [pad, setPad] = useState<string | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [latched, setLatched] = useState(false);

  // One loop draws the stage, the screen grid and the Launchpad from the same frame.
  useEffect(() => {
    const host = stageRef.current;
    if (!host) return;
    const stage = createStage(host, { still });
    const flash = zero();
    let beat = 0;
    const queue: NoteEvent[] = [];
    const off = engine.onNote((e) => {
      stage.note(e);
      queue.push(e);
      const ctx = engine.ctx;
      // MIDI clock, 24 per beat, so pulsing LEDs breathe in tempo.
      if (e.voice === "beat" && ctx && padRef.current) {
        const at = performance.now() + (e.time - ctx.currentTime) * 1000;
        const step = 60_000 / engine.view.bpm / 24;
        padRef.current.clock(Array.from({ length: 24 }, (_, i) => at + i * step));
      }
    });
    const fft = new Float32Array(512);
    let last = performance.now();
    let raf = 0;
    let lastLeds = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const ctx = engine.ctx;
      // Draw when a note reaches the ears, not when it leaves the graph (Bluetooth adds a lot).
      const now = (ctx?.currentTime ?? 0) - (ctx ? (ctx.outputLatency ?? ctx.baseLatency ?? 0) : 0);
      const decay = Math.exp(-dt / 0.14);
      for (const v of VOICES) flash[v] *= decay;
      beat *= Math.exp(-dt / 0.1);
      queue.sort((a, b) => a.time - b.time);
      while (queue.length && queue[0]!.time <= now) {
        const e = queue.shift()!;
        if (e.voice === "beat") beat = e.vel;
        else flash[e.voice] = Math.max(flash[e.voice], Math.min(1, e.vel));
      }
      let level = 0;
      const an = engine.analyser;
      if (an) {
        an.getFloatTimeDomainData(fft);
        level = Math.min(1, Math.sqrt(fft.reduce((s, x) => s + x * x, 0) / fft.length) * 4);
      }
      const v = engine.view;
      stage.show(v.scene);
      stage.frame(now, dt, { flash, beat, level }, v.macros.energy, v.macros.filter);
      controller.tick();
      if (t - lastLeds > 33) {
        lastLeds = t;
        const held = new Set(controller.held().map(ledIndex));
        const map = leds(
          v,
          still ? zero() : flash,
          still ? 0 : beat,
          controller.shift || latchedRef.current,
          held,
          ledIndex,
        );
        padRef.current?.show(map);
        for (const [idx, el] of cellRefs.current) {
          const rgb = map.get(idx)?.rgb ?? [0, 0, 0];
          el.style.setProperty("--cell", `rgb(${rgb.map((c) => Math.min(255, c * 2)).join(" ")})`);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      off();
      host.replaceChildren();
    };
  }, [engine, controller, still]);

  const latchedRef = useRef(false);
  latchedRef.current = latched;

  // Keyboard: 1-8 mute (Shift = solo), q-i new pattern, z-n scenes, space play, a auto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const k = e.key.toLowerCase();
      const voice = (i: number) => VOICES[i]!;
      if (k === " ") {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        if (engine.view.running) engine.stop();
        else engine.start();
      } else if (MUTE_KEYS.includes(e.key) || "!@#$%^&*".includes(e.key)) {
        const i = MUTE_KEYS.includes(e.key) ? MUTE_KEYS.indexOf(e.key) : "!@#$%^&*".indexOf(e.key);
        if (e.shiftKey) engine.solo(voice(i));
        else engine.mute(voice(i));
      } else if (REROLL_KEYS.includes(k)) engine.reroll(voice(REROLL_KEYS.indexOf(k)));
      else if (SCENE_KEYS.includes(k)) engine.scene(SCENE_KEYS.indexOf(k));
      else if (k === "a") engine.auto(!engine.view.auto);
      else if (k === "d") engine.throwDelay();
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [engine]);

  // Leave Programmer mode when the page goes away, so the Launchpad is usable elsewhere.
  useEffect(() => {
    const bye = () => unlinkRef.current?.();
    addEventListener("pagehide", bye);
    return () => removeEventListener("pagehide", bye);
  }, []);

  async function linkPad() {
    setMidiError(null);
    try {
      unlinkRef.current = await connect(
        (e) => controller.handle(e, padRef.current?.dynamic ?? false),
        (p) => {
          padRef.current = p;
          if (!p)
            setMidiError("No Launchpad X, Mini MK3 or Pro MK3 found yet. Plug one in and it links itself.");
          else setMidiError(null);
          setPad(
            p
              ? `${p.name}${p.dynamic ? " · velocity and pressure" : " · no velocity: hold a level pad to swell"}`
              : null,
          );
        },
      );
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setMidiError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "MIDI with SysEx was not allowed. Drift needs it to put the Launchpad in Programmer mode; the grid on screen plays the same."
          : err instanceof Error
            ? err.message
            : String(err),
      );
    }
  }

  function unlinkPad() {
    unlinkRef.current?.();
    unlinkRef.current = null;
    padRef.current = null;
    setPad(null);
  }

  const press = (c: Cell, e: React.PointerEvent) => {
    if (c.x === 8 && c.y === 7) {
      setLatched((l) => !l); // on screen, Shift latches: one pointer cannot hold it and press a pad
      return;
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const pen = e.pointerType === "pen" && e.pressure > 0;
    if (latched) {
      const a = actionAt(c, true);
      if (a?.kind === "macro") engine.macro(a.id, a.value);
      else controller.handle({ kind: "down", cell: c, vel: 100 }, false);
      return;
    }
    controller.handle({ kind: "down", cell: c, vel: pen ? Math.round(e.pressure * 127) : 100 }, pen);
  };
  const lift = (c: Cell) => {
    if ((c.x === 8 && c.y === 7) || latched) {
      if (latched && !(c.x === 8 && c.y === 7)) controller.handle({ kind: "up", cell: c }, false);
      return;
    }
    controller.handle({ kind: "up", cell: c }, false);
  };

  const scene = SCENES[view.scene]!;
  const macroPage = shift || latched;

  return (
    <main className="drift">
      <div className="drift-stage" ref={stageRef} aria-hidden="true" />

      <header className="drift-head">
        <h1>
          Drift <span>endless downtempo</span>
        </h1>
        <p>
          An endless downtempo set that wanders through six scales of a valley, from the hillside down to a single cell. Inspired by Berlin slow house and
          organic downtempo; every sound is synthesised in your browser.
        </p>
        <div className="drift-row">
          <button
            type="button"
            className="drift-btn drift-play"
            aria-pressed={view.running}
            onClick={() => (view.running ? engine.stop() : engine.start())}
          >
            {view.running ? "Pause" : "Play"}
          </button>
          <button type="button" className="drift-btn" onClick={() => (pad ? unlinkPad() : void linkPad())}>
            {pad ? "Release Launchpad" : "Link a Launchpad"}
          </button>
          <button
            type="button"
            className="drift-btn"
            aria-pressed={view.auto}
            onClick={() => engine.auto(!view.auto)}
          >
            Auto drift {view.auto ? "on" : "off"}
          </button>
        </div>
        {(pad || midiError) && (
          <p className="drift-small" role="status">
            {pad ?? midiError}
          </p>
        )}
      </header>

      <section className="drift-now" aria-label="Now playing">
        <p className="drift-scene">
          {scene.title} <span>· {scene.scale} scale</span>
        </p>
        <p className="drift-sound">{scene.sound}</p>
        <p className="drift-meta mono" role="status" aria-live="polite" aria-atomic="true">
          {SECTION[view.section]} · bar {view.at + 1}/{view.of} · {view.key}{" "}
          {view.mode.replace("harmonicMinor", "harmonic minor").replace("hijaz", "Phrygian dominant")} ·{" "}
          {roman(view.chord)} · {view.bpm} BPM · seed {view.seed}
        </p>
      </section>

      <section className="drift-surface" aria-label="Launchpad grid">
        <div
          className="drift-grid"
          role="group"
          aria-label={
            macroPage
              ? "Macro page: column is a macro, row sets its value"
              : "Voices: column is a voice, rows set its level"
          }
        >
          {ROWS.map((y) =>
            COLS.map((x) => {
              const c = { x, y };
              const idx = ledIndex(c);
              const isLogo = x === LOGO.x && y === LOGO.y;
              if (isLogo)
                return (
                  <span
                    key={idx}
                    className="drift-cell logo"
                    ref={(el) => void (el && cellRefs.current.set(idx, el as unknown as HTMLButtonElement))}
                  />
                );
              const label = labelOf(c, macroPage, view);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`drift-cell${y === -1 ? " top" : ""}${x === 8 ? " side" : ""}`}
                  aria-label={label}
                  title={label}
                  aria-pressed={x === 8 && y === 7 ? macroPage : undefined}
                  ref={(el) => void (el ? cellRefs.current.set(idx, el) : cellRefs.current.delete(idx))}
                  onPointerDown={(e) => press(c, e)}
                  onPointerUp={() => lift(c)}
                  onPointerCancel={() => lift(c)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                      e.preventDefault();
                      if (x === 8 && y === 7) setLatched((l) => !l);
                      else controller.handle({ kind: "down", cell: c, vel: 100 }, false);
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === "Enter" || e.key === " ") controller.handle({ kind: "up", cell: c }, false);
                  }}
                />
              );
            }),
          )}
        </div>
        <div className="drift-legend mono" aria-hidden="true">
          {(macroPage ? MACROS.map((m) => m.label) : VOICES).map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </section>

      <section className="drift-macros" aria-label="Macros">
        {MACROS.map((m) => (
          <label key={m.id} title={m.hint}>
            <span>{m.label}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={view.macros[m.id]}
              onChange={(e) => engine.macro(m.id as MacroId, Number(e.target.value))}
            />
          </label>
        ))}
      </section>

      <details className="drift-help">
        <summary>How to play</summary>
        <ul>
          <li>Top row: the six scales (keys z-n), auto drift (a), hold for a break.</li>
          <li>
            Each column is a voice: kick, hand drums, shaker and hats, clap, bass, chords, kalimba, voice.
          </li>
          <li>
            Rows 1-6 set a voice&rsquo;s level and hold it for two phrases; press the lit level again to hand
            it back to auto.
          </li>
          <li>
            Row 7: a new pattern for that voice (keys q-i). Row 8: mute (1-8), double-tap or Shift+number to
            solo, hold to mute only while held.
          </li>
          <li>
            Side column: delay throw (d), new chord loop, rise, bloom, hush, filter dip, play (space), Shift
            for the macro page.
          </li>
          <li>
            On a Launchpad X or Pro, velocity sets the accent and pressure opens the filter and the voice; on
            a Mini, hold a level pad to swell.
          </li>
        </ul>
        <p className="drift-small">
          A synthesised study of a style, not a recording, a sample or an imitation of any artist. The valley
          pictures come from Terrikus, a playable soil-science textbook by Soilytix.
        </p>
      </details>
    </main>
  );
}
