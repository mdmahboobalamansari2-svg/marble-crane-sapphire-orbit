import { B, Face, OPAQUE, PLANT, hidesFace, tileForFace } from "../blocks";
import { CHUNK_H, CHUNK_W, idx } from "./constants";

export interface MeshArrays {
  positions: Float32Array;
  normals: Float32Array;
  wuv: Float32Array;
  tiles: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

export interface Neighbors {
  nx?: Uint8Array;
  px?: Uint8Array;
  nz?: Uint8Array;
  pz?: Uint8Array;
}

const FACE_SHADE = [0.72, 0.72, 1.0, 0.52, 0.82, 0.64];

function getBlock(v: Uint8Array, n: Neighbors, x: number, y: number, z: number): number {
  if (y < 0) return B.BEDROCK;
  if (y >= CHUNK_H) return B.AIR;
  if (x < 0) return n.nx ? n.nx[idx(CHUNK_W - 1, y, z)]! : B.AIR;
  if (x >= CHUNK_W) return n.px ? n.px[idx(0, y, z)]! : B.AIR;
  if (z < 0) return n.nz ? n.nz[idx(x, y, CHUNK_W - 1)]! : B.AIR;
  if (z >= CHUNK_W) return n.pz ? n.pz[idx(x, y, 0)]! : B.AIR;
  return v[idx(x, y, z)]!;
}

interface QuadBuf {
  pos: number[];
  nor: number[];
  wuv: number[];
  tile: number[];
  col: number[];
  idx: number[];
}

function emitQuad(
  b: QuadBuf,
  verts: number[],
  uvs: number[],
  nx: number,
  ny: number,
  nz: number,
  tile: number,
  shade: number,
  ao: number[],
) {
  const base = b.pos.length / 3;
  for (let i = 0; i < 4; i++) {
    b.pos.push(verts[i * 3]!, verts[i * 3 + 1]!, verts[i * 3 + 2]!);
    b.nor.push(nx, ny, nz);
    b.wuv.push(uvs[i * 2]!, uvs[i * 2 + 1]!);
    b.tile.push(tile);
    const s = shade * ao[i]!;
    b.col.push(s, s, s);
  }
  // flip winding if needed so normal points out
  const flip = nx + ny + nz < 0;
  if (flip) {
    b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  } else {
    b.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
}

function vertexAO(s1: boolean, s2: boolean, c: boolean): number {
  const corners = (s1 ? 1 : 0) + (s2 ? 1 : 0) + (c ? 1 : 0);
  if (s1 && s2) return 0.55;
  return [1, 0.8, 0.65, 0.5][corners]!;
}

function isSolidOcc(id: number): boolean {
  return OPAQUE[id] === 1;
}

export function meshChunk(voxels: Uint8Array, neighbors: Neighbors, waterPass: boolean): MeshArrays {
  const buf: QuadBuf = { pos: [], nor: [], wuv: [], tile: [], col: [], idx: [] };

  const dirs = [
    { face: Face.PX, dx: 1, dy: 0, dz: 0 },
    { face: Face.NX, dx: -1, dy: 0, dz: 0 },
    { face: Face.PY, dx: 0, dy: 1, dz: 0 },
    { face: Face.NY, dx: 0, dy: -1, dz: 0 },
    { face: Face.PZ, dx: 0, dy: 0, dz: 1 },
    { face: Face.NZ, dx: 0, dy: 0, dz: -1 },
  ];

  for (let y = 0; y < CHUNK_H; y++) {
    for (let z = 0; z < CHUNK_W; z++) {
      for (let x = 0; x < CHUNK_W; x++) {
        const id = voxels[idx(x, y, z)]!;
        if (id === B.AIR) continue;
        const isWater = id === B.WATER;
        if (waterPass !== isWater) continue;
        if (PLANT[id] && !isWater) {
          emitPlant(buf, x, y, z, id);
          continue;
        }
        for (const d of dirs) {
          const nid = getBlock(voxels, neighbors, x + d.dx, y + d.dy, z + d.dz);
          if (hidesFace(id, nid)) continue;
          const tile = tileForFace(id, d.face);
          const shade = FACE_SHADE[d.face]!;
          addFace(buf, x, y, z, d.face, tile, shade, voxels, neighbors);
        }
      }
    }
  }

  return {
    positions: new Float32Array(buf.pos),
    normals: new Float32Array(buf.nor),
    wuv: new Float32Array(buf.wuv),
    tiles: new Float32Array(buf.tile),
    colors: new Float32Array(buf.col),
    indices: new Uint32Array(buf.idx),
  };
}

function addFace(
  buf: QuadBuf,
  x: number,
  y: number,
  z: number,
  face: number,
  tile: number,
  shade: number,
  v: Uint8Array,
  n: Neighbors,
) {
  let verts: number[];
  let uvs: number[];
  let nx = 0,
    ny = 0,
    nz = 0;
  const ao = [1, 1, 1, 1];

  const occ = (ox: number, oy: number, oz: number) => isSolidOcc(getBlock(v, n, ox, oy, oz));

  switch (face) {
    case Face.PY:
      nx = 0;
      ny = 1;
      nz = 0;
      verts = [x, y + 1, z, x + 1, y + 1, z, x + 1, y + 1, z + 1, x, y + 1, z + 1];
      uvs = [x, z, x + 1, z, x + 1, z + 1, x, z + 1];
      ao[0] = vertexAO(occ(x - 1, y + 1, z), occ(x, y + 1, z - 1), occ(x - 1, y + 1, z - 1));
      ao[1] = vertexAO(occ(x + 1, y + 1, z), occ(x, y + 1, z - 1), occ(x + 1, y + 1, z - 1));
      ao[2] = vertexAO(occ(x + 1, y + 1, z), occ(x, y + 1, z + 1), occ(x + 1, y + 1, z + 1));
      ao[3] = vertexAO(occ(x - 1, y + 1, z), occ(x, y + 1, z + 1), occ(x - 1, y + 1, z + 1));
      break;
    case Face.NY:
      nx = 0;
      ny = -1;
      nz = 0;
      verts = [x, y, z + 1, x + 1, y, z + 1, x + 1, y, z, x, y, z];
      uvs = [x, z + 1, x + 1, z + 1, x + 1, z, x, z];
      break;
    case Face.PX:
      nx = 1;
      ny = 0;
      nz = 0;
      verts = [x + 1, y, z, x + 1, y, z + 1, x + 1, y + 1, z + 1, x + 1, y + 1, z];
      uvs = [z, y, z + 1, y, z + 1, y + 1, z, y + 1];
      ao[0] = vertexAO(occ(x + 1, y - 1, z), occ(x + 1, y, z - 1), occ(x + 1, y - 1, z - 1));
      ao[1] = vertexAO(occ(x + 1, y - 1, z), occ(x + 1, y, z + 1), occ(x + 1, y - 1, z + 1));
      ao[2] = vertexAO(occ(x + 1, y + 1, z), occ(x + 1, y, z + 1), occ(x + 1, y + 1, z + 1));
      ao[3] = vertexAO(occ(x + 1, y + 1, z), occ(x + 1, y, z - 1), occ(x + 1, y + 1, z - 1));
      break;
    case Face.NX:
      nx = -1;
      ny = 0;
      nz = 0;
      verts = [x, y, z + 1, x, y, z, x, y + 1, z, x, y + 1, z + 1];
      uvs = [z + 1, y, z, y, z, y + 1, z + 1, y + 1];
      ao[0] = vertexAO(occ(x - 1, y - 1, z), occ(x - 1, y, z + 1), occ(x - 1, y - 1, z + 1));
      ao[1] = vertexAO(occ(x - 1, y - 1, z), occ(x - 1, y, z - 1), occ(x - 1, y - 1, z - 1));
      ao[2] = vertexAO(occ(x - 1, y + 1, z), occ(x - 1, y, z - 1), occ(x - 1, y + 1, z - 1));
      ao[3] = vertexAO(occ(x - 1, y + 1, z), occ(x - 1, y, z + 1), occ(x - 1, y + 1, z + 1));
      break;
    case Face.PZ:
      nx = 0;
      ny = 0;
      nz = 1;
      verts = [x + 1, y, z + 1, x, y, z + 1, x, y + 1, z + 1, x + 1, y + 1, z + 1];
      uvs = [x + 1, y, x, y, x, y + 1, x + 1, y + 1];
      ao[0] = vertexAO(occ(x + 1, y - 1, z + 1), occ(x, y - 1, z + 1), occ(x + 1, y - 1, z + 1));
      ao[1] = vertexAO(occ(x - 1, y - 1, z + 1), occ(x, y - 1, z + 1), occ(x - 1, y - 1, z + 1));
      ao[2] = vertexAO(occ(x - 1, y + 1, z + 1), occ(x, y + 1, z + 1), occ(x - 1, y + 1, z + 1));
      ao[3] = vertexAO(occ(x + 1, y + 1, z + 1), occ(x, y + 1, z + 1), occ(x + 1, y + 1, z + 1));
      break;
    default:
      nx = 0;
      ny = 0;
      nz = -1;
      verts = [x, y, z, x + 1, y, z, x + 1, y + 1, z, x, y + 1, z];
      uvs = [x, y, x + 1, y, x + 1, y + 1, x, y + 1];
      ao[0] = vertexAO(occ(x - 1, y - 1, z - 1), occ(x, y - 1, z - 1), occ(x - 1, y - 1, z - 1));
      ao[1] = vertexAO(occ(x + 1, y - 1, z - 1), occ(x, y - 1, z - 1), occ(x + 1, y - 1, z - 1));
      ao[2] = vertexAO(occ(x + 1, y + 1, z - 1), occ(x, y + 1, z - 1), occ(x + 1, y + 1, z - 1));
      ao[3] = vertexAO(occ(x - 1, y + 1, z - 1), occ(x, y + 1, z - 1), occ(x - 1, y + 1, z - 1));
  }

  emitQuad(buf, verts, uvs, nx, ny, nz, tile, shade, ao);
}

function emitPlant(buf: QuadBuf, x: number, y: number, z: number, id: number) {
  const tile = tileForFace(id, Face.PX);
  const shade = 0.95;
  const ao = [1, 1, 1, 1];
  const inset = 0.1;
  // two crossed quads
  emitQuad(
    buf,
    [x + inset, y, z + inset, x + 1 - inset, y, z + 1 - inset, x + 1 - inset, y + 1, z + 1 - inset, x + inset, y + 1, z + inset],
    [0, 0, 1, 0, 1, 1, 0, 1],
    0.7,
    0.4,
    0.7,
    tile,
    shade,
    ao,
  );
  emitQuad(
    buf,
    [x + 1 - inset, y, z + inset, x + inset, y, z + 1 - inset, x + inset, y + 1, z + 1 - inset, x + 1 - inset, y + 1, z + inset],
    [0, 0, 1, 0, 1, 1, 0, 1],
    -0.7,
    0.4,
    0.7,
    tile,
    shade,
    ao,
  );
}

export function emptyMesh(): MeshArrays {
  return {
    positions: new Float32Array(0),
    normals: new Float32Array(0),
    wuv: new Float32Array(0),
    tiles: new Float32Array(0),
    colors: new Float32Array(0),
    indices: new Uint32Array(0),
  };
}
