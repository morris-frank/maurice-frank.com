/** Seeded randomness for the generator: same seed, same set. */
export type Rng = () => number;

export function mulberry(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;

/** Index drawn by weight; weights need not sum to 1. */
export function weighted(r: Rng, weights: readonly number[]): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  let x = r() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= Math.max(0, weights[i]!);
    if (x < 0) return i;
  }
  return weights.length - 1;
}

/** Bjorklund/Toussaint Euclidean rhythm: `k` onsets spread over `n` steps, rotated by `rot`. */
export function euclid(k: number, n: number, rot = 0): boolean[] {
  return Array.from({ length: n }, (_, i) => {
    const j = (((i - rot) % n) + n) % n;
    return k > 0 && Math.floor((j * k) / n) !== Math.floor(((j - 1) * k) / n);
  });
}
