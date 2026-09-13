export const CHUNK_W = 16;
export const CHUNK_H = 128;
export const CHUNK_AREA = CHUNK_W * CHUNK_W;
export const CHUNK_VOLUME = CHUNK_AREA * CHUNK_H;
export const SEA_LEVEL = 42;
export const BEDROCK_Y = 1;

export const TILE_PX = 16;
export const ATLAS_TILES = 16;
export const ATLAS_PX = TILE_PX * ATLAS_TILES;

export function idx(x: number, y: number, z: number): number {
  return x + z * CHUNK_W + y * CHUNK_AREA;
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function worldToChunk(wx: number): number {
  return Math.floor(wx / CHUNK_W);
}

export function localCoord(w: number): number {
  return ((w % CHUNK_W) + CHUNK_W) % CHUNK_W;
}
