import * as THREE from "three";
import { B, BIOME, SOLID } from "../blocks";
import { ATLAS_TILES, CHUNK_H, CHUNK_W, chunkKey, idx, localCoord, worldToChunk } from "./constants";
import type { MeshArrays } from "./mesher";
import { meshChunk } from "./mesher";
import type { Poi } from "./gen";
import { terrainFrag, terrainVert, waterFrag, waterVert } from "../textures";

export interface Chunk {
  cx: number;
  cz: number;
  voxels: Uint8Array;
  height?: Uint8Array;
  biome?: Uint8Array;
  pois: Poi[];
  solidMesh?: THREE.Mesh;
  waterMesh?: THREE.Mesh;
  dirty: boolean;
  ready: boolean;
}

interface BuiltMsg {
  op: "built";
  id: number;
  cx: number;
  cz: number;
  voxels: Uint8Array;
  height?: Uint8Array;
  biome?: Uint8Array;
  pois: Poi[];
  solid: MeshArrays;
  water: MeshArrays;
}

export class World {
  readonly chunks = new Map<string, Chunk>();
  readonly edits = new Map<string, Uint8Array>();
  readonly group = new THREE.Group();
  readonly discovered = new Map<string, number>();
  seed: number;
  renderDist = 6;
  private worker: Worker;
  private jobId = 1;
  private inflight = 0;
  private maxInflight = 2;
  private queue: { cx: number; cz: number; pri: number }[] = [];
  private queued = new Set<string>();
  private terrainMat: THREE.ShaderMaterial;
  private waterMat: THREE.ShaderMaterial;
  private pending = new Map<number, { cx: number; cz: number }>();
  private onPoi?: (p: Poi) => void;
  private atlas: THREE.Texture;

  constructor(seed: number, atlas: THREE.Texture, onPoi?: (p: Poi) => void) {
    this.seed = seed;
    this.atlas = atlas;
    this.onPoi = onPoi;
    this.terrainMat = new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: atlas },
        fogColor: { value: new THREE.Color("#c5d6df") },
        fogCenter: { value: new THREE.Vector3() },
        fogNear: { value: 40 },
        fogFar: { value: 140 },
        sunDir: { value: new THREE.Vector3(0.35, 0.82, 0.4) },
        wetness: { value: 0 },
        tilesPerRow: { value: ATLAS_TILES },
      },
      vertexShader: terrainVert,
      fragmentShader: terrainFrag,
      vertexColors: false,
    });
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        fogColor: { value: new THREE.Color("#c5d6df") },
        fogCenter: { value: new THREE.Vector3() },
        fogNear: { value: 40 },
        fogFar: { value: 140 },
        sunDir: { value: new THREE.Vector3(0.35, 0.82, 0.4) },
        waterColor: { value: new THREE.Color("#1f6b72") },
        time: { value: 0 },
      },
      vertexShader: waterVert,
      fragmentShader: waterFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.postMessage({ op: "init", seed });
    this.worker.onmessage = (e: MessageEvent<BuiltMsg>) => this.onBuilt(e.data);
  }

  setFog(near: number, far: number, color: THREE.Color) {
    this.terrainMat.uniforms.fogNear!.value = near;
    this.terrainMat.uniforms.fogFar!.value = far;
    this.terrainMat.uniforms.fogColor!.value.copy(color);
    this.waterMat.uniforms.fogNear!.value = near;
    this.waterMat.uniforms.fogFar!.value = far;
    this.waterMat.uniforms.fogColor!.value.copy(color);
  }

  setSun(dir: THREE.Vector3, wetness: number, time: number) {
    this.terrainMat.uniforms.sunDir!.value.copy(dir);
    this.terrainMat.uniforms.wetness!.value = wetness;
    this.waterMat.uniforms.sunDir!.value.copy(dir);
    this.waterMat.uniforms.time!.value = time;
  }

  setCenter(x: number, y: number, z: number) {
    this.terrainMat.uniforms.fogCenter!.value.set(x, y, z);
    this.waterMat.uniforms.fogCenter!.value.set(x, y, z);
  }

  getBlock(wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= CHUNK_H) return wy < 0 ? B.BEDROCK : B.AIR;
    const cx = worldToChunk(wx);
    const cz = worldToChunk(wz);
    const ch = this.chunks.get(chunkKey(cx, cz));
    if (!ch || !ch.voxels) return B.AIR;
    return ch.voxels[idx(localCoord(wx), wy, localCoord(wz))] ?? B.AIR;
  }

  setBlock(wx: number, wy: number, wz: number, id: number): boolean {
    if (wy < 1 || wy >= CHUNK_H - 1) return false;
    const cx = worldToChunk(wx);
    const cz = worldToChunk(wz);
    const ch = this.chunks.get(chunkKey(cx, cz));
    if (!ch || !ch.voxels) return false;
    const lx = localCoord(wx);
    const lz = localCoord(wz);
    const i = idx(lx, wy, lz);
    if (ch.voxels[i] === id) return false;
    if (ch.voxels[i] === B.BEDROCK && id === B.AIR) return false;
    ch.voxels[i] = id;
    let ev = this.edits.get(chunkKey(cx, cz));
    if (!ev) {
      ev = ch.voxels.slice();
      this.edits.set(chunkKey(cx, cz), ev);
    }
    ev[i] = id;
    this.remeshLocal(cx, cz);
    if (lx === 0) this.remeshLocal(cx - 1, cz);
    if (lx === CHUNK_W - 1) this.remeshLocal(cx + 1, cz);
    if (lz === 0) this.remeshLocal(cx, cz - 1);
    if (lz === CHUNK_W - 1) this.remeshLocal(cx, cz + 1);
    return true;
  }

  private remeshLocal(cx: number, cz: number) {
    const ch = this.chunks.get(chunkKey(cx, cz));
    if (!ch || !ch.voxels) return;
    const n = {
      nx: this.chunks.get(chunkKey(cx - 1, cz))?.voxels,
      px: this.chunks.get(chunkKey(cx + 1, cz))?.voxels,
      nz: this.chunks.get(chunkKey(cx, cz - 1))?.voxels,
      pz: this.chunks.get(chunkKey(cx, cz + 1))?.voxels,
    };
    this.applyMesh(ch, meshChunk(ch.voxels, n, false), meshChunk(ch.voxels, n, true));
  }

  surfaceY(wx: number, wz: number): number {
    for (let y = CHUNK_H - 2; y > 0; y--) {
      if (SOLID[this.getBlock(wx, y, wz)]) return y + 1;
    }
    return 80;
  }

  biomeAt(wx: number, wz: number): number {
    const cx = worldToChunk(wx);
    const cz = worldToChunk(wz);
    const ch = this.chunks.get(chunkKey(cx, cz));
    if (!ch?.biome) return BIOME.GRASS;
    return ch.biome[localCoord(wx) + localCoord(wz) * CHUNK_W] ?? BIOME.GRASS;
  }

  stream(px: number, pz: number) {
    const ccx = worldToChunk(px);
    const ccz = worldToChunk(pz);
    const r = this.renderDist;
    const needed = new Set<string>();
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r + 2) continue;
        const cx = ccx + dx;
        const cz = ccz + dz;
        const k = chunkKey(cx, cz);
        needed.add(k);
        if (!this.chunks.has(k) && !this.queued.has(k)) {
          this.queue.push({ cx, cz, pri: dx * dx + dz * dz });
          this.queued.add(k);
        }
      }
    }
    this.queue.sort((a, b) => a.pri - b.pri);
    this.flushQueue();

    for (const [k, ch] of this.chunks) {
      if (!needed.has(k)) {
        this.disposeChunk(ch);
        this.chunks.delete(k);
      }
    }
  }

  private flushQueue() {
    while (this.inflight < this.maxInflight && this.queue.length) {
      const job = this.queue.shift()!;
      const k = chunkKey(job.cx, job.cz);
      this.queued.delete(k);
      if (this.chunks.has(k)) continue;
      this.chunks.set(k, {
        cx: job.cx,
        cz: job.cz,
        voxels: new Uint8Array(0),
        pois: [],
        dirty: false,
        ready: false,
      });
      const id = this.jobId++;
      this.pending.set(id, { cx: job.cx, cz: job.cz });
      this.inflight++;
      const edits = this.edits.get(k);
      this.worker.postMessage({
        op: "build",
        id,
        cx: job.cx,
        cz: job.cz,
        edits,
        nx: this.chunks.get(chunkKey(job.cx - 1, job.cz))?.voxels,
        px: this.chunks.get(chunkKey(job.cx + 1, job.cz))?.voxels,
        nz: this.chunks.get(chunkKey(job.cx, job.cz - 1))?.voxels,
        pz: this.chunks.get(chunkKey(job.cx, job.cz + 1))?.voxels,
      });
    }
  }

  private onBuilt(msg: BuiltMsg) {
    this.inflight = Math.max(0, this.inflight - 1);
    this.pending.delete(msg.id);
    const k = chunkKey(msg.cx, msg.cz);
    let ch = this.chunks.get(k);
    if (!ch) {
      this.flushQueue();
      return;
    }
    ch.voxels = msg.voxels;
    ch.height = msg.height;
    ch.biome = msg.biome;
    ch.pois = msg.pois ?? [];
    ch.ready = true;
    this.discovered.set(k, ch.biome?.[136] ?? BIOME.GRASS);
    if (this.edits.has(k)) ch.voxels.set(this.edits.get(k)!);
    this.applyMesh(ch, msg.solid, msg.water);
    for (const p of ch.pois) this.onPoi?.(p);
    // remesh neighbors that were waiting for this border
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const n = this.chunks.get(chunkKey(msg.cx + dx, msg.cz + dz));
      if (n?.ready && n.voxels.length) this.remeshLocal(n.cx, n.cz);
    }
    this.flushQueue();
  }

  private applyMesh(ch: Chunk, solid: MeshArrays, water: MeshArrays) {
    if (ch.solidMesh) {
      this.group.remove(ch.solidMesh);
      ch.solidMesh.geometry.dispose();
      ch.solidMesh = undefined;
    }
    if (ch.waterMesh) {
      this.group.remove(ch.waterMesh);
      ch.waterMesh.geometry.dispose();
      ch.waterMesh = undefined;
    }
    const ox = ch.cx * CHUNK_W;
    const oz = ch.cz * CHUNK_W;
    if (solid.indices.length) {
      const geo = this.geoFrom(solid);
      ch.solidMesh = new THREE.Mesh(geo, this.terrainMat);
      ch.solidMesh.position.set(ox, 0, oz);
      ch.solidMesh.matrixAutoUpdate = false;
      ch.solidMesh.updateMatrix();
      ch.solidMesh.frustumCulled = true;
      this.group.add(ch.solidMesh);
    }
    if (water.indices.length) {
      const geo = this.geoFrom(water);
      ch.waterMesh = new THREE.Mesh(geo, this.waterMat);
      ch.waterMesh.position.set(ox, 0, oz);
      ch.waterMesh.matrixAutoUpdate = false;
      ch.waterMesh.updateMatrix();
      ch.waterMesh.renderOrder = 2;
      this.group.add(ch.waterMesh);
    }
  }

  private geoFrom(m: MeshArrays): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(m.normals, 3));
    geo.setAttribute("aWuv", new THREE.BufferAttribute(m.wuv, 2));
    geo.setAttribute("aTile", new THREE.BufferAttribute(m.tiles, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(m.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }

  private disposeChunk(ch: Chunk) {
    if (ch.solidMesh) {
      this.group.remove(ch.solidMesh);
      ch.solidMesh.geometry.dispose();
    }
    if (ch.waterMesh) {
      this.group.remove(ch.waterMesh);
      ch.waterMesh.geometry.dispose();
    }
  }

  applyEdits(edits: Record<string, number[]>): void {
    for (const [k, packed] of Object.entries(edits)) {
      const arr = new Uint8Array(CHUNK_W * CHUNK_W * CHUNK_H);
      // packed as [index, id, index, id...] if length != volume, else full
      if (packed.length === arr.length) {
        arr.set(packed);
      } else {
        for (let i = 0; i < packed.length; i += 2) arr[packed[i]!] = packed[i + 1]!;
      }
      this.edits.set(k, arr);
    }
  }

  serializeEdits(): Record<string, number[]> {
    const out: Record<string, number[]> = {};
    for (const [k, v] of this.edits) {
      const packed: number[] = [];
      for (let i = 0; i < v.length; i++) {
        // store sparse
        // We don't have original; store full if many changes, else skip zeros that match air... store all non-zero diffs as index,id
        packed.push(i, v[i]!);
      }
      // compress: only store pairs where we actually wrote. Keep as index,id for all, too big.
      // Better: store the whole typed array as numbers only for changed chunks — 32k is OK per edited chunk.
      out[k] = Array.from(v);
    }
    return out;
  }

  readyCount(): number {
    let n = 0;
    for (const c of this.chunks.values()) if (c.ready) n++;
    return n;
  }

  dispose() {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    this.worker.terminate();
    this.terrainMat.dispose();
    this.waterMat.dispose();
    this.atlas.dispose();
  }
}
