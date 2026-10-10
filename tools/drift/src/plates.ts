/**
 * The six valley pictures, pre-rendered as AVIF layers (from Terrikus) in
 * `plates/`: one desktop and one phone cut per scene.
 */
export interface BakedPlate {
  w: number;
  h: number;
  layers: { id: string; file: string }[];
  ground: string;
}
export interface PlateManifest {
  plates: Record<string, BakedPlate[]>;
}

let manifest: Promise<PlateManifest | null> | undefined;

export function loadManifest(): Promise<PlateManifest | null> {
  manifest ??= fetch("plates/manifest.json")
    .then((r) => (r.ok ? (r.json() as Promise<PlateManifest>) : null))
    .catch(() => null);
  return manifest;
}

/** The cut closest in shape to a `w`×`h` viewport. */
export function pickBaked(m: PlateManifest, recipe: string, seed: number, w: number, h: number) {
  const aspect = (p: { w: number; h: number }) => Math.abs(Math.log(p.w / p.h / (w / h)));
  return [...(m.plates[`${recipe}:${seed}`] ?? [])].sort((a, b) => aspect(a) - aspect(b))[0];
}

export const plateUrl = (file: string) => `plates/${file}`;
