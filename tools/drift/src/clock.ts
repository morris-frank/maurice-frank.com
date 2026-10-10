/**
 * Lookahead scheduler ("A Tale of Two Clocks", Wilson 2013): a coarse JS timer
 * wakes every `tickMs` and books every sixteenth that falls inside the next
 * `aheadS` seconds on the audio clock, which is the only clock that is exact.
 * Swing is handed over as an offset, so each voice can take its own share.
 */
export interface ClockOptions {
  now: () => number;
  bpm: () => number;
  /** 0 = straight, 1 = full triplet feel (the off sixteenth lands on the 3rd triplet). */
  swing: () => number;
  /** `swingS`: how late this step's off-beat sits at full swing. */
  onStep: (step: number, time: number, dur: number, swingS: number) => void;
  /** Seconds booked ahead; a function, so a hidden tab can book further (timers slow down there). */
  aheadS?: () => number;
  tickMs?: number;
}

export const sixteenth = (bpm: number) => 60 / bpm / 4;

/** Seconds to delay an off-beat sixteenth; `swing` 1 moves it a third of a sixteenth late. */
export const swingOffset = (step: number, bpm: number, swing: number) =>
  step % 2 === 1 ? (sixteenth(bpm) * swing) / 3 : 0;

export function createClock(o: ClockOptions) {
  const ahead = o.aheadS ?? (() => 0.12);
  const tick = o.tickMs ?? 25;
  let step = 0;
  let next = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function pump() {
    const until = o.now() + ahead();
    while (next < until) {
      const bpm = o.bpm();
      const dur = sixteenth(bpm);
      o.onStep(step, next, dur, swingOffset(step, bpm, o.swing()));
      next += dur;
      step++;
    }
  }

  return {
    get step() {
      return step;
    },
    start() {
      if (timer) return;
      next = o.now() + 0.05;
      pump();
      timer = setInterval(pump, tick);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    pump,
  };
}
