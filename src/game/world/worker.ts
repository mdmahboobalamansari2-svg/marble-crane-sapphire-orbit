import { generateChunk, makeNoise, type NoiseSet } from "./gen";
import { meshChunk, type Neighbors } from "./mesher";
import { chunkKey } from "./constants";

let seed = 1;
let noise: NoiseSet | null = null;
const cache = new Map<string, Uint8Array>();

function noiseOf(): NoiseSet {
  if (!noise) noise = makeNoise(seed);
  return noise;
}

type Msg =
  | { op: "init"; seed: number }
  | {
      op: "build";
      id: number;
      cx: number;
      cz: number;
      edits?: Uint8Array;
      nx?: Uint8Array;
      px?: Uint8Array;
      nz?: Uint8Array;
      pz?: Uint8Array;
    };

self.onmessage = (e: MessageEvent<Msg>) => {
  const msg = e.data;
  if (msg.op === "init") {
    seed = msg.seed;
    noise = makeNoise(seed);
    cache.clear();
    return;
  }
  if (msg.op === "build") {
    const key = chunkKey(msg.cx, msg.cz);
    let voxels = cache.get(key);
    let height: Uint8Array | undefined;
    let biome: Uint8Array | undefined;
    let pois: ReturnType<typeof generateChunk>["pois"] = [];
    if (!voxels) {
      const g = generateChunk(seed, msg.cx, msg.cz, noiseOf());
      voxels = g.voxels;
      height = g.height;
      biome = g.biome;
      pois = g.pois;
      cache.set(key, voxels);
      if (cache.size > 512) {
        const first = cache.keys().next().value;
        if (first) cache.delete(first);
      }
    }
    if (msg.edits) voxels.set(msg.edits);
    const neighbors: Neighbors = {
      nx: msg.nx,
      px: msg.px,
      nz: msg.nz,
      pz: msg.pz,
    };
    const solid = meshChunk(voxels, neighbors, false);
    const water = meshChunk(voxels, neighbors, true);
    const voxCopy = voxels.slice();
    const transfer: ArrayBuffer[] = [
      voxCopy.buffer,
      solid.positions.buffer,
      solid.normals.buffer,
      solid.wuv.buffer,
      solid.tiles.buffer,
      solid.colors.buffer,
      solid.indices.buffer,
      water.positions.buffer,
      water.normals.buffer,
      water.wuv.buffer,
      water.tiles.buffer,
      water.colors.buffer,
      water.indices.buffer,
    ];
    (self as unknown as Worker).postMessage(
      {
        op: "built",
        id: msg.id,
        cx: msg.cx,
        cz: msg.cz,
        voxels: voxCopy,
        height,
        biome,
        pois,
        solid,
        water,
      },
      transfer,
    );
  }
};
