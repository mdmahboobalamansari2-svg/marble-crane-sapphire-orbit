import { createNoise2D, createNoise3D } from "simplex-noise";
import { B, BIOME } from "../blocks";
import { hash2, hash3, mulberry32 } from "../rng";
import { CHUNK_AREA, CHUNK_H, CHUNK_VOLUME, CHUNK_W, SEA_LEVEL, idx } from "./constants";

export interface Poi {
  type: "village" | "ruin" | "dungeon" | "chest" | "boss_colossus" | "boss_tide" | "camp";
  x: number;
  y: number;
  z: number;
}

export interface ChunkGen {
  voxels: Uint8Array;
  height: Uint8Array;
  biome: Uint8Array;
  pois: Poi[];
}

type N2 = (x: number, y: number) => number;
type N3 = (x: number, y: number, z: number) => number;

export interface NoiseSet {
  cont: N2;
  hill: N2;
  detail: N2;
  ridge: N2;
  temp: N2;
  moist: N2;
  warp: N2;
  river: N2;
  cave: N3;
  cave2: N3;
}

export function makeNoise(seed: number): NoiseSet {
  const s = (k: number) => mulberry32(seed ^ k);
  return {
    cont: createNoise2D(s(0x11)),
    hill: createNoise2D(s(0x22)),
    detail: createNoise2D(s(0x33)),
    ridge: createNoise2D(s(0x44)),
    temp: createNoise2D(s(0x55)),
    moist: createNoise2D(s(0x66)),
    warp: createNoise2D(s(0x77)),
    river: createNoise2D(s(0x88)),
    cave: createNoise3D(s(0x99)),
    cave2: createNoise3D(s(0xaa)),
  };
}

function fbm2(n: N2, x: number, z: number, oct: number, persist = 0.5, lac = 2): number {
  let a = 1;
  let f = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += n(x * f, z * f) * a;
    norm += a;
    a *= persist;
    f *= lac;
  }
  return sum / norm;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function sampleHeight(n: NoiseSet, wx: number, wz: number): { h: number; biome: number } {
  const wxw = wx + n.warp(wx * 0.002, wz * 0.002) * 24;
  const wzw = wz + n.warp(wx * 0.002 + 40, wz * 0.002 + 40) * 24;
  const continent = fbm2(n.cont, wxw * 0.0018, wzw * 0.0018, 5);
  const hill = fbm2(n.hill, wx * 0.01, wz * 0.01, 4);
  const detail = fbm2(n.detail, wx * 0.04, wz * 0.04, 3);
  const ridgeRaw = 1 - Math.abs(fbm2(n.ridge, wx * 0.0022, wz * 0.0022, 4));
  const ridge = Math.pow(ridgeRaw, 2.4);
  const temp = fbm2(n.temp, wx * 0.0015, wz * 0.0015, 4);
  const moist = fbm2(n.moist, wx * 0.0016 + 80, wz * 0.0016, 4);
  const river = Math.abs(fbm2(n.river, wx * 0.0035, wz * 0.0035, 3));

  let h = SEA_LEVEL + continent * 16 + hill * 7 + detail * 2.4;
  const mountain = ridge * 48 * smooth(clamp01((continent + 0.15) * 1.4));
  h += mountain;

  let biome: number;
  if (continent < -0.22 && h < SEA_LEVEL + 1) {
    biome = BIOME.OCEAN;
    h = SEA_LEVEL - 8 + continent * 10 + detail * 2;
  } else if (h < SEA_LEVEL + 2 && continent < 0.05) {
    biome = BIOME.BEACH;
    h = SEA_LEVEL + hill * 1.5;
  } else if (river < 0.045 && h < SEA_LEVEL + 18 && continent > -0.1) {
    biome = BIOME.RIVER;
    h = Math.min(h, SEA_LEVEL - 1);
  } else if (temp < -0.28 && h > SEA_LEVEL + 22) {
    biome = BIOME.SNOW;
  } else if (h > SEA_LEVEL + 28 && ridge > 0.55) {
    biome = BIOME.MOUNTAIN;
  } else if (temp > 0.32 && moist < -0.1) {
    biome = h > SEA_LEVEL + 16 ? BIOME.MESA : BIOME.DESERT;
  } else if (moist > 0.28 && temp > -0.05 && h < SEA_LEVEL + 10) {
    biome = BIOME.SWAMP;
    h = SEA_LEVEL + 1 + hill * 2;
  } else if (moist > 0.12 && temp > -0.15) {
    biome = BIOME.FOREST;
  } else {
    biome = BIOME.GRASS;
  }

  if (biome === BIOME.DESERT) h = SEA_LEVEL + 4 + hill * 5 + detail * 1.5;
  if (biome === BIOME.MESA) h = SEA_LEVEL + 12 + hill * 10 + ridge * 8;

  h = Math.max(2, Math.min(CHUNK_H - 6, h));
  return { h, biome };
}

function oreAt(wx: number, y: number, wz: number, seed: number): number {
  const h = hash3(wx, y, wz, seed);
  if (y < 12 && (h % 1400) === 0) return B.PRISMITE;
  if (y < 22 && (h % 900) === 1) return B.AURIC;
  if (y < 40 && (h % 420) === 2) return B.FERRITE;
  if (y < 56 && (h % 280) === 3) return B.COPPER;
  if (y < 70 && (h % 160) === 4) return B.COAL;
  if (y < 18 && (h % 600) === 5) return B.CRYSTAL;
  return 0;
}

function setV(v: Uint8Array, x: number, y: number, z: number, id: number) {
  if (x < 0 || z < 0 || y < 0 || x >= CHUNK_W || z >= CHUNK_W || y >= CHUNK_H) return;
  v[idx(x, y, z)] = id;
}

function getV(v: Uint8Array, x: number, y: number, z: number): number {
  if (x < 0 || z < 0 || y < 0 || x >= CHUNK_W || z >= CHUNK_W || y >= CHUNK_H) return 0;
  return v[idx(x, y, z)]!;
}

function stampTree(
  v: Uint8Array,
  lx: number,
  y: number,
  lz: number,
  snow: boolean,
  rng: () => number,
) {
  const log = snow ? B.FROSTLOG : B.LOG;
  const leaf = snow ? B.FROSTLEAVES : B.LEAVES;
  const h = snow ? 6 + (rng() * 4) | 0 : 5 + (rng() * 3) | 0;
  for (let i = 0; i < h; i++) setV(v, lx, y + i, lz, log);
  const top = y + h;
  const r = snow ? 2 : 2;
  for (let dy = -1; dy <= 2; dy++) {
    const rad = dy === 2 ? 1 : r;
    for (let dx = -rad; dx <= rad; dx++) {
      for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && rng() < 0.5) continue;
        if (dx === 0 && dz === 0 && dy < 1) continue;
        const id = getV(v, lx + dx, top + dy, lz + dz);
        if (id === 0 || id === B.TALLGRASS || id === B.FLOWER) {
          setV(v, lx + dx, top + dy, lz + dz, leaf);
        }
      }
    }
  }
}

function stampHouse(v: Uint8Array, ox: number, oy: number, oz: number, rng: () => number, pois: Poi[], cx: number, cz: number) {
  const w = 5 + (rng() * 3) | 0;
  const d = 5 + (rng() * 3) | 0;
  const wall = rng() < 0.5 ? B.TERRACOTTA : B.PLANKS;
  const floor = B.PLANKS;
  const roof = rng() < 0.4 ? B.THATCH : B.TERRACOTTA;
  for (let x = 0; x <= w; x++) {
    for (let z = 0; z <= d; z++) {
      setV(v, ox + x, oy, oz + z, floor);
      const edge = x === 0 || z === 0 || x === w || z === d;
      for (let y = 1; y <= 3; y++) {
        if (edge) setV(v, ox + x, oy + y, oz + z, wall);
        else setV(v, ox + x, oy + y, oz + z, 0);
      }
      setV(v, ox + x, oy + 4, oz + z, roof);
    }
  }
  // door
  const dx = ox + ((w / 2) | 0);
  setV(v, dx, oy + 1, oz, 0);
  setV(v, dx, oy + 2, oz, 0);
  setV(v, ox + 1, oy + 2, oz + 1, B.CRATE);
  const wx = cx * CHUNK_W + ox + 1;
  const wz = cz * CHUNK_W + oz + 1;
  pois.push({ type: "chest", x: wx, y: oy + 2, z: wz });
  if (rng() < 0.5) setV(v, ox + w - 1, oy + 2, oz + 1, B.LANTERN);
}

function stampRuin(v: Uint8Array, ox: number, oy: number, oz: number, rng: () => number) {
  const w = 6;
  for (let x = 0; x <= w; x++) {
    for (let z = 0; z <= w; z++) {
      if (rng() < 0.7) setV(v, ox + x, oy, oz + z, B.COBBLE);
      const edge = x === 0 || z === 0 || x === w || z === w;
      if (edge) {
        const hh = 1 + (rng() * 4) | 0;
        for (let y = 1; y <= hh; y++) {
          if (rng() < 0.7) setV(v, ox + x, oy + y, oz + z, rng() < 0.3 ? B.MOSS : B.COBBLE);
        }
      }
    }
  }
  setV(v, ox + 3, oy + 1, oz + 3, B.CRATE);
}

function stampDungeon(v: Uint8Array, ox: number, oy: number, oz: number, rng: () => number) {
  const w = 8;
  const h = 4;
  for (let x = 0; x <= w; x++) {
    for (let z = 0; z <= w; z++) {
      for (let y = 0; y <= h; y++) {
        const edge = x === 0 || z === 0 || x === w || z === w || y === 0 || y === h;
        setV(v, ox + x, oy + y, oz + z, edge ? B.COBBLE : 0);
      }
    }
  }
  setV(v, ox + 4, oy + 1, oz + 4, B.CRATE);
  setV(v, ox + 2, oy + 1, oz + 2, B.LANTERN);
  setV(v, ox + 6, oy + 1, oz + 6, B.CRYSTAL);
  // entrance shaft
  for (let y = oy + h; y < Math.min(CHUNK_H - 1, oy + 18); y++) {
    setV(v, ox + 4, y, oz, 0);
    setV(v, ox + 4, y, oz + 1, B.VINE);
  }
}

export function generateChunk(seed: number, cx: number, cz: number, noise: NoiseSet): ChunkGen {
  const voxels = new Uint8Array(CHUNK_VOLUME);
  const height = new Uint8Array(CHUNK_AREA);
  const biome = new Uint8Array(CHUNK_AREA);
  const pois: Poi[] = [];
  const ox = cx * CHUNK_W;
  const oz = cz * CHUNK_W;

  for (let z = 0; z < CHUNK_W; z++) {
    for (let x = 0; x < CHUNK_W; x++) {
      const wx = ox + x;
      const wz = oz + z;
      const s = sampleHeight(noise, wx, wz);
      const h = Math.floor(s.h);
      height[x + z * CHUNK_W] = h;
      biome[x + z * CHUNK_W] = s.biome;
      const bio = s.biome;

      for (let y = 0; y < CHUNK_H; y++) {
        let id = B.AIR;
        if (y === 0) id = B.BEDROCK;
        else if (y <= 2 && hash3(wx, y, wz, seed) % 3 !== 0) id = B.BEDROCK;
        else if (y <= h) {
          const depth = h - y;
          if (bio === BIOME.DESERT || bio === BIOME.BEACH) {
            id = depth < 4 ? B.SAND : depth < 7 ? B.SANDSTONE : B.STONE;
          } else if (bio === BIOME.MESA) {
            id = depth === 0 ? B.TERRACOTTA : depth < 6 ? (y % 3 === 0 ? B.CLAY : B.TERRACOTTA) : B.STONE;
          } else if (bio === BIOME.OCEAN) {
            id = depth < 2 ? B.SAND : depth < 5 ? B.GRAVEL : B.STONE;
          } else if (bio === BIOME.SNOW) {
            id = depth === 0 ? B.SNOW_DIRT : depth < 4 ? B.DIRT : y < 20 ? B.GRANITE : B.STONE;
          } else if (bio === BIOME.MOUNTAIN) {
            id = depth === 0 ? (h > SEA_LEVEL + 40 ? B.SNOW : B.STONE) : depth < 3 ? B.GRAVEL : B.STONE;
          } else if (bio === BIOME.SWAMP || bio === BIOME.RIVER) {
            id = depth === 0 ? B.DIRT : depth < 3 ? B.CLAY : B.STONE;
          } else {
            id = depth === 0 ? B.GRASS : depth < 4 ? B.DIRT : y < 18 ? B.GRANITE : B.STONE;
          }
          if (y < 8) id = B.SHALE;
          const ore = oreAt(wx, y, wz, seed);
          if (ore && (id === B.STONE || id === B.GRANITE || id === B.SHALE)) id = ore;
        } else if (y <= SEA_LEVEL && (bio === BIOME.OCEAN || bio === BIOME.BEACH || bio === BIOME.RIVER || bio === BIOME.SWAMP || h < SEA_LEVEL)) {
          id = B.WATER;
        }
        voxels[idx(x, y, z)] = id;
      }
    }
  }

  // caves
  for (let z = 0; z < CHUNK_W; z++) {
    for (let x = 0; x < CHUNK_W; x++) {
      const wx = ox + x;
      const wz = oz + z;
      const h = height[x + z * CHUNK_W]!;
      for (let y = 4; y < h - 2; y++) {
        const c1 = noise.cave(wx * 0.05, y * 0.07, wz * 0.05);
        const c2 = noise.cave2(wx * 0.03, y * 0.05, wz * 0.03);
        if (c1 > 0.52 && c2 > 0.12) {
          const i = idx(x, y, z);
          const cur = voxels[i]!;
          if (cur !== B.BEDROCK && cur !== B.WATER) {
            voxels[i] = B.AIR;
            if (c1 > 0.72 && y < 20 && hash3(wx, y, wz, seed ^ 7) % 40 === 0) voxels[i] = B.CRYSTAL;
            if (c2 > 0.55 && hash3(wx, y, wz, seed ^ 9) % 50 === 0) voxels[i] = B.MUSHROOM;
            if (hash3(wx, y, wz, seed ^ 3) % 80 === 0) voxels[i] = B.MOSS;
          }
        }
      }
    }
  }

  // surface plants / trees — also stamp from neighboring origins so canopies cross chunks
  for (let lz = -3; lz < CHUNK_W + 3; lz++) {
    for (let lx = -3; lx < CHUNK_W + 3; lx++) {
      const wx = ox + lx;
      const wz = oz + lz;
      const s = sampleHeight(noise, wx, wz);
      const h = Math.floor(s.h);
      const bio = s.biome;
      const hv = hash2(wx, wz, seed);
      const rng = mulberry32(hv);

      if (lx >= 0 && lz >= 0 && lx < CHUNK_W && lz < CHUNK_W && h >= 1 && h < CHUNK_H - 2) {
        const below = getV(voxels, lx, h, lz);
        if (below === B.GRASS) {
          if (hv % 6 === 0) setV(voxels, lx, h + 1, lz, B.TALLGRASS);
          else if (hv % 37 === 0) setV(voxels, lx, h + 1, lz, B.FLOWER);
        }
        if (below === B.SAND && bio === BIOME.DESERT && hv % 28 === 0) {
          const ch = 2 + (hv % 3);
          for (let i = 1; i <= ch; i++) setV(voxels, lx, h + i, lz, B.CACTUS);
        }
        if ((bio === BIOME.SWAMP || bio === BIOME.RIVER || bio === BIOME.BEACH) && (below === B.DIRT || below === B.SAND)) {
          if (hv % 14 === 0 && h <= SEA_LEVEL + 1) setV(voxels, lx, h + 1, lz, B.REED);
        }
      }

      const treeChance =
        bio === BIOME.FOREST ? 9 : bio === BIOME.GRASS ? 42 : bio === BIOME.SNOW ? 22 : bio === BIOME.SWAMP ? 28 : 0;
      if (treeChance && hv % treeChance === 0 && h > SEA_LEVEL && h < CHUNK_H - 12) {
        stampTree(voxels, lx, h + 1, lz, bio === BIOME.SNOW, rng);
      }
    }
  }

  // structures by region
  const region = 20;
  const rx = Math.floor(cx / region);
  const rz = Math.floor(cz / region);
  const rh = hash2(rx, rz, seed ^ 0x51);
  const localCx = ((cx % region) + region) % region;
  const localCz = ((cz % region) + region) % region;
  const villageCx = rh % region;
  const villageCz = (rh >>> 8) % region;
  const ruinCx = (rh >>> 4) % region;
  const ruinCz = (rh >>> 12) % region;
  const dungCx = (rh >>> 6) % region;
  const dungCz = (rh >>> 14) % region;

  const centerX = 4;
  const centerZ = 4;
  const ground = height[centerX + centerZ * CHUNK_W] ?? SEA_LEVEL;
  const bio0 = biome[centerX + centerZ * CHUNK_W] ?? BIOME.GRASS;

  if (localCx === villageCx && localCz === villageCz && rh % 5 < 3) {
    if (bio0 === BIOME.GRASS || bio0 === BIOME.FOREST || bio0 === BIOME.DESERT) {
      const rng = mulberry32(rh ^ (cx * 17 + cz));
      const nHouses = 3 + (rng() * 4) | 0;
      for (let i = 0; i < nHouses; i++) {
        const hx = 1 + ((rng() * 8) | 0);
        const hz = 1 + ((rng() * 8) | 0);
        const hy = height[Math.min(15, hx) + Math.min(15, hz) * CHUNK_W] ?? ground;
        if (hy > 3 && hy < CHUNK_H - 10) stampHouse(voxels, hx, hy, hz, rng, pois, cx, cz);
      }
      pois.push({
        type: "village",
        x: ox + 8,
        y: ground + 1,
        z: oz + 8,
      });
      pois.push({ type: "camp", x: ox + 8, y: ground + 1, z: oz + 8 });
    }
  }

  if (localCx === ruinCx && localCz === ruinCz && (rh >>> 3) % 7 === 0) {
    const rng = mulberry32(rh ^ 0xabc);
    stampRuin(voxels, 4, ground, 4, rng);
    pois.push({ type: "ruin", x: ox + 7, y: ground + 1, z: oz + 7 });
    pois.push({ type: "chest", x: ox + 7, y: ground + 1, z: oz + 7 });
  }

  if (localCx === dungCx && localCz === dungCz && (rh >>> 5) % 9 === 0) {
    const rng = mulberry32(rh ^ 0xdef);
    const dy = Math.max(6, ground - 18);
    stampDungeon(voxels, 3, dy, 3, rng);
    pois.push({ type: "dungeon", x: ox + 7, y: dy + 1, z: oz + 7 });
    pois.push({ type: "chest", x: ox + 7, y: dy + 1, z: oz + 7 });
  }

  // rare bosses — one colossus per 48-chunk region, tidewyrm near ocean
  const br = 48;
  const bx = Math.floor(cx / br);
  const bz = Math.floor(cz / br);
  const bh = hash2(bx, bz, seed ^ 0x777);
  if (cx === bx * br + (bh % br) && cz === bz * br + ((bh >>> 8) % br)) {
    if (bio0 === BIOME.MOUNTAIN || bio0 === BIOME.SNOW) {
      pois.push({ type: "boss_colossus", x: ox + 8, y: ground + 1, z: oz + 8 });
      // shrine
      for (let x = 5; x <= 10; x++) for (let z = 5; z <= 10; z++) setV(voxels, x, ground, z, B.MARBLE);
    } else if (bio0 === BIOME.OCEAN || bio0 === BIOME.BEACH) {
      pois.push({ type: "boss_tide", x: ox + 8, y: Math.max(ground, SEA_LEVEL) + 1, z: oz + 8 });
    }
  }

  return { voxels, height, biome, pois };
}
