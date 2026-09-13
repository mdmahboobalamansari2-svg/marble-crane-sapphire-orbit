/** Original block palette — not a Minecraft copy. */

export const B = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  SANDSTONE: 5,
  SNOW: 6,
  ICE: 7,
  WATER: 8,
  LOG: 9,
  LEAVES: 10,
  PLANKS: 11,
  GLASS: 12,
  COAL: 13,
  COPPER: 14,
  FERRITE: 15,
  AURIC: 16,
  PRISMITE: 17,
  CLAY: 18,
  BRICK: 19,
  COBBLE: 20,
  GRAVEL: 21,
  BEDROCK: 22,
  CACTUS: 23,
  MOSS: 24,
  TERRACOTTA: 25,
  LANTERN: 26,
  CRATE: 27,
  WORKBENCH: 28,
  FORGE: 29,
  FARMLAND: 30,
  CROP: 31,
  REED: 32,
  VINE: 33,
  THATCH: 34,
  MARBLE: 35,
  COPPER_BLOCK: 36,
  FERRITE_BLOCK: 37,
  AURIC_BLOCK: 38,
  PRISMITE_BLOCK: 39,
  MUSHROOM: 40,
  PATH: 41,
  FROSTLOG: 42,
  FROSTLEAVES: 43,
  GRANITE: 44,
  SHALE: 45,
  CRYSTAL: 46,
  TALLGRASS: 47,
  FLOWER: 48,
  SNOW_DIRT: 49,
} as const;

export type BlockId = (typeof B)[keyof typeof B] | number;

export const enum Face {
  PX = 0,
  NX = 1,
  PY = 2,
  NY = 3,
  PZ = 4,
  NZ = 5,
}

export interface BlockDef {
  id: number;
  name: string;
  solid: boolean;
  opaque: boolean;
  liquid: boolean;
  plant: boolean;
  light: number;
  hardness: number;
  tool: "hand" | "pick" | "axe" | "shovel" | "hoe";
  drop: number; // item id, 0 = self as item using same id
  tile: number | [number, number, number]; // all | [top, side, bottom]
}

/** Atlas tile indices (row-major, 16 per row). */
export const T = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  SANDSTONE: 5,
  SNOW: 6,
  ICE: 7,
  WATER: 8,
  LOG_TOP: 9,
  LOG_SIDE: 10,
  LEAVES: 11,
  PLANKS: 12,
  GLASS: 13,
  COAL: 14,
  COPPER: 15,
  FERRITE: 16,
  AURIC: 17,
  PRISMITE: 18,
  CLAY: 19,
  BRICK: 20,
  COBBLE: 21,
  GRAVEL: 22,
  BEDROCK: 23,
  CACTUS: 24,
  MOSS: 25,
  TERRACOTTA: 26,
  LANTERN: 27,
  CRATE: 28,
  WORKBENCH_TOP: 29,
  WORKBENCH_SIDE: 30,
  FORGE_SIDE: 31,
  FORGE_TOP: 32,
  FARMLAND: 33,
  CROP: 34,
  REED: 35,
  VINE: 36,
  THATCH: 37,
  MARBLE: 38,
  COPPER_BLK: 39,
  FERRITE_BLK: 40,
  AURIC_BLK: 41,
  PRISMITE_BLK: 42,
  MUSHROOM: 43,
  PATH: 44,
  FROSTLOG_SIDE: 45,
  FROSTLEAVES: 46,
  GRANITE: 47,
  SHALE: 48,
  CRYSTAL: 49,
  TALLGRASS: 50,
  FLOWER: 51,
  SNOW_SIDE: 52,
  BREAK0: 53,
  BREAK1: 54,
  BREAK2: 55,
} as const;

export const BLOCKS: BlockDef[] = [];

function def(d: BlockDef) {
  BLOCKS[d.id] = d;
}

def({
  id: B.AIR,
  name: "Air",
  solid: false,
  opaque: false,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0,
  tool: "hand",
  drop: 0,
  tile: 0,
});
def({
  id: B.GRASS,
  name: "Sage turf",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.6,
  tool: "shovel",
  drop: B.DIRT,
  tile: [T.GRASS_TOP, T.GRASS_SIDE, T.DIRT],
});
def({
  id: B.DIRT,
  name: "Loam",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.5,
  tool: "shovel",
  drop: B.DIRT,
  tile: T.DIRT,
});
def({
  id: B.STONE,
  name: "Granite",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.5,
  tool: "pick",
  drop: B.COBBLE,
  tile: T.STONE,
});
def({
  id: B.SAND,
  name: "Drift sand",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.5,
  tool: "shovel",
  drop: B.SAND,
  tile: T.SAND,
});
def({
  id: B.SANDSTONE,
  name: "Dune stone",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.8,
  tool: "pick",
  drop: B.SANDSTONE,
  tile: T.SANDSTONE,
});
def({
  id: B.SNOW,
  name: "Rime",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.3,
  tool: "shovel",
  drop: B.SNOW,
  tile: T.SNOW,
});
def({
  id: B.ICE,
  name: "Glacier ice",
  solid: true,
  opaque: false,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.5,
  tool: "pick",
  drop: B.ICE,
  tile: T.ICE,
});
def({
  id: B.WATER,
  name: "Tidewater",
  solid: false,
  opaque: false,
  liquid: true,
  plant: false,
  light: 0,
  hardness: 0,
  tool: "hand",
  drop: 0,
  tile: T.WATER,
});
def({
  id: B.LOG,
  name: "Amberwood",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.0,
  tool: "axe",
  drop: B.LOG,
  tile: [T.LOG_TOP, T.LOG_SIDE, T.LOG_TOP],
});
def({
  id: B.LEAVES,
  name: "Canopy",
  solid: true,
  opaque: false,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.2,
  tool: "axe",
  drop: B.LEAVES,
  tile: T.LEAVES,
});
def({
  id: B.PLANKS,
  name: "Amber planks",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.0,
  tool: "axe",
  drop: B.PLANKS,
  tile: T.PLANKS,
});
def({
  id: B.GLASS,
  name: "Clearpane",
  solid: true,
  opaque: false,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.3,
  tool: "hand",
  drop: B.GLASS,
  tile: T.GLASS,
});
def({
  id: B.COAL,
  name: "Embercoal ore",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 2.0,
  tool: "pick",
  drop: 200,
  tile: T.COAL,
});
def({
  id: B.COPPER,
  name: "Copperlite ore",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 2.2,
  tool: "pick",
  drop: 201,
  tile: T.COPPER,
});
def({
  id: B.FERRITE,
  name: "Ferrite ore",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 2.8,
  tool: "pick",
  drop: 202,
  tile: T.FERRITE,
});
def({
  id: B.AURIC,
  name: "Auric ore",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 3.2,
  tool: "pick",
  drop: 203,
  tile: T.AURIC,
});
def({
  id: B.PRISMITE,
  name: "Prismite ore",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 4.0,
  tool: "pick",
  drop: 204,
  tile: T.PRISMITE,
});
def({
  id: B.CLAY,
  name: "River clay",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.6,
  tool: "shovel",
  drop: B.CLAY,
  tile: T.CLAY,
});
def({
  id: B.BRICK,
  name: "Adobe brick",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.4,
  tool: "pick",
  drop: B.BRICK,
  tile: T.BRICK,
});
def({
  id: B.COBBLE,
  name: "Rubble",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.5,
  tool: "pick",
  drop: B.COBBLE,
  tile: T.COBBLE,
});
def({
  id: B.GRAVEL,
  name: "Shingle",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.6,
  tool: "shovel",
  drop: B.GRAVEL,
  tile: T.GRAVEL,
});
def({
  id: B.BEDROCK,
  name: "Deepstone",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 100,
  tool: "pick",
  drop: 0,
  tile: T.BEDROCK,
});
def({
  id: B.CACTUS,
  name: "Sunspine",
  solid: true,
  opaque: false,
  liquid: false,
  plant: true,
  light: 0,
  hardness: 0.4,
  tool: "hand",
  drop: B.CACTUS,
  tile: T.CACTUS,
});
def({
  id: B.MOSS,
  name: "Cave moss",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.4,
  tool: "shovel",
  drop: B.MOSS,
  tile: T.MOSS,
});
def({
  id: B.TERRACOTTA,
  name: "Fired clay",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.2,
  tool: "pick",
  drop: B.TERRACOTTA,
  tile: T.TERRACOTTA,
});
def({
  id: B.LANTERN,
  name: "Glow lantern",
  solid: true,
  opaque: false,
  liquid: false,
  plant: false,
  light: 14,
  hardness: 0.3,
  tool: "hand",
  drop: B.LANTERN,
  tile: T.LANTERN,
});
def({
  id: B.CRATE,
  name: "Crate",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.5,
  tool: "axe",
  drop: B.CRATE,
  tile: T.CRATE,
});
def({
  id: B.WORKBENCH,
  name: "Workbench",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.5,
  tool: "axe",
  drop: B.WORKBENCH,
  tile: [T.WORKBENCH_TOP, T.WORKBENCH_SIDE, T.PLANKS],
});
def({
  id: B.FORGE,
  name: "Forge",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 8,
  hardness: 2.5,
  tool: "pick",
  drop: B.FORGE,
  tile: [T.FORGE_TOP, T.FORGE_SIDE, T.COBBLE],
});
def({
  id: B.FARMLAND,
  name: "Tilled loam",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.5,
  tool: "shovel",
  drop: B.DIRT,
  tile: T.FARMLAND,
});
def({
  id: B.CROP,
  name: "Wheat",
  solid: false,
  opaque: false,
  liquid: false,
  plant: true,
  light: 0,
  hardness: 0.1,
  tool: "hand",
  drop: 210,
  tile: T.CROP,
});
def({
  id: B.REED,
  name: "River reed",
  solid: false,
  opaque: false,
  liquid: false,
  plant: true,
  light: 0,
  hardness: 0.1,
  tool: "hand",
  drop: B.REED,
  tile: T.REED,
});
def({
  id: B.VINE,
  name: "Climbvine",
  solid: false,
  opaque: false,
  liquid: false,
  plant: true,
  light: 0,
  hardness: 0.2,
  tool: "hand",
  drop: B.VINE,
  tile: T.VINE,
});
def({
  id: B.THATCH,
  name: "Thatch",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.5,
  tool: "axe",
  drop: B.THATCH,
  tile: T.THATCH,
});
def({
  id: B.MARBLE,
  name: "Pale marble",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.8,
  tool: "pick",
  drop: B.MARBLE,
  tile: T.MARBLE,
});
def({
  id: B.COPPER_BLOCK,
  name: "Copperlite block",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 3,
  tool: "pick",
  drop: B.COPPER_BLOCK,
  tile: T.COPPER_BLK,
});
def({
  id: B.FERRITE_BLOCK,
  name: "Ferrite block",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 4,
  tool: "pick",
  drop: B.FERRITE_BLOCK,
  tile: T.FERRITE_BLK,
});
def({
  id: B.AURIC_BLOCK,
  name: "Auric block",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 4,
  tool: "pick",
  drop: B.AURIC_BLOCK,
  tile: T.AURIC_BLK,
});
def({
  id: B.PRISMITE_BLOCK,
  name: "Prismite block",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 5,
  tool: "pick",
  drop: B.PRISMITE_BLOCK,
  tile: T.PRISMITE_BLK,
});
def({
  id: B.MUSHROOM,
  name: "Glowcap",
  solid: true,
  opaque: false,
  liquid: false,
  plant: false,
  light: 6,
  hardness: 0.3,
  tool: "hand",
  drop: B.MUSHROOM,
  tile: T.MUSHROOM,
});
def({
  id: B.PATH,
  name: "Packed earth",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.5,
  tool: "shovel",
  drop: B.DIRT,
  tile: T.PATH,
});
def({
  id: B.FROSTLOG,
  name: "Frostpine",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.0,
  tool: "axe",
  drop: B.FROSTLOG,
  tile: [T.LOG_TOP, T.FROSTLOG_SIDE, T.LOG_TOP],
});
def({
  id: B.FROSTLEAVES,
  name: "Rime needles",
  solid: true,
  opaque: false,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.2,
  tool: "axe",
  drop: B.FROSTLEAVES,
  tile: T.FROSTLEAVES,
});
def({
  id: B.GRANITE,
  name: "Deep granite",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.6,
  tool: "pick",
  drop: B.GRANITE,
  tile: T.GRANITE,
});
def({
  id: B.SHALE,
  name: "Shale",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 1.2,
  tool: "pick",
  drop: B.SHALE,
  tile: T.SHALE,
});
def({
  id: B.CRYSTAL,
  name: "Cave crystal",
  solid: true,
  opaque: false,
  liquid: false,
  plant: false,
  light: 10,
  hardness: 2.5,
  tool: "pick",
  drop: B.CRYSTAL,
  tile: T.CRYSTAL,
});
def({
  id: B.TALLGRASS,
  name: "Wildgrass",
  solid: false,
  opaque: false,
  liquid: false,
  plant: true,
  light: 0,
  hardness: 0.05,
  tool: "hand",
  drop: 211,
  tile: T.TALLGRASS,
});
def({
  id: B.FLOWER,
  name: "Sunbloom",
  solid: false,
  opaque: false,
  liquid: false,
  plant: true,
  light: 0,
  hardness: 0.05,
  tool: "hand",
  drop: B.FLOWER,
  tile: T.FLOWER,
});
def({
  id: B.SNOW_DIRT,
  name: "Rime turf",
  solid: true,
  opaque: true,
  liquid: false,
  plant: false,
  light: 0,
  hardness: 0.5,
  tool: "shovel",
  drop: B.DIRT,
  tile: [T.SNOW, T.SNOW_SIDE, T.DIRT],
});

export const SOLID = new Uint8Array(256);
export const OPAQUE = new Uint8Array(256);
export const LIQUID = new Uint8Array(256);
export const PLANT = new Uint8Array(256);
export const LIGHT = new Uint8Array(256);
export const TILE_TOP = new Uint8Array(256);
export const TILE_SIDE = new Uint8Array(256);
export const TILE_BOT = new Uint8Array(256);

for (const b of BLOCKS) {
  if (!b) continue;
  SOLID[b.id] = b.solid ? 1 : 0;
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  LIQUID[b.id] = b.liquid ? 1 : 0;
  PLANT[b.id] = b.plant ? 1 : 0;
  LIGHT[b.id] = b.light;
  if (typeof b.tile === "number") {
    TILE_TOP[b.id] = b.tile;
    TILE_SIDE[b.id] = b.tile;
    TILE_BOT[b.id] = b.tile;
  } else {
    TILE_TOP[b.id] = b.tile[0];
    TILE_SIDE[b.id] = b.tile[1];
    TILE_BOT[b.id] = b.tile[2];
  }
}

export function tileForFace(id: number, face: number): number {
  if (face === Face.PY) return TILE_TOP[id]!;
  if (face === Face.NY) return TILE_BOT[id]!;
  return TILE_SIDE[id]!;
}

export function hidesFace(self: number, neighbor: number): boolean {
  if (self === B.AIR) return true;
  if (OPAQUE[neighbor]) return true;
  if (self === neighbor && (self === B.LEAVES || self === B.FROSTLEAVES || self === B.WATER || self === B.GLASS || self === B.ICE))
    return true;
  if (LIQUID[self] && LIQUID[neighbor]) return true;
  return false;
}

export const BIOME = {
  OCEAN: 0,
  BEACH: 1,
  GRASS: 2,
  FOREST: 3,
  DESERT: 4,
  MOUNTAIN: 5,
  SNOW: 6,
  SWAMP: 7,
  MESA: 8,
  RIVER: 9,
} as const;

export const BIOME_NAMES: Record<number, string> = {
  [BIOME.OCEAN]: "Open tide",
  [BIOME.BEACH]: "Pearl shore",
  [BIOME.GRASS]: "Sage steppe",
  [BIOME.FOREST]: "Amberwood",
  [BIOME.DESERT]: "Copper dunes",
  [BIOME.MOUNTAIN]: "Stone spires",
  [BIOME.SNOW]: "Rime peaks",
  [BIOME.SWAMP]: "Reedfen",
  [BIOME.MESA]: "Claybluff",
  [BIOME.RIVER]: "Runnel",
};

export const BIOME_MAP_COLOR: Record<number, string> = {
  [BIOME.OCEAN]: "#2a6a72",
  [BIOME.BEACH]: "#d4c49a",
  [BIOME.GRASS]: "#6b8f5e",
  [BIOME.FOREST]: "#3d6a48",
  [BIOME.DESERT]: "#c4a06a",
  [BIOME.MOUNTAIN]: "#8a8680",
  [BIOME.SNOW]: "#e8eef2",
  [BIOME.SWAMP]: "#4a6a52",
  [BIOME.MESA]: "#b06a4a",
  [BIOME.RIVER]: "#3a8a92",
};
