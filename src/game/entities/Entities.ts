import * as THREE from "three";
import { I } from "../items";
import type { World } from "../world/World";
import type { Player } from "../player/Player";
import { voxelRaycast } from "../world/raycast";
import { moveBody, type Body, aabbHits } from "../world/collision";
import { BIOME } from "../blocks";
import type { Poi } from "../world/gen";
import { worldToChunk } from "../world/constants";

export type EntKind =
  | "loamhare"
  | "sunfinch"
  | "skink"
  | "mossback"
  | "stag"
  | "bristleboar"
  | "shardmite"
  | "gloomcrawler"
  | "stormkite"
  | "auricbeetle"
  | "settler"
  | "colossus"
  | "tidewyrm"
  | "item";

export interface Ent {
  id: number;
  kind: EntKind;
  body: Body;
  hp: number;
  maxHp: number;
  yaw: number;
  state: "wander" | "flee" | "chase" | "attack" | "work" | "dead" | "idle";
  age: number;
  cd: number;
  phase: number;
  mesh: THREE.Object3D;
  hostile: boolean;
  speed: number;
  damage: number;
  drop: { id: number; n: number }[];
  name: string;
  targetYaw: number;
  lastKnown?: { x: number; z: number };
}

let nextId = 1;

function box(w: number, h: number, d: number, color: number, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.y = y;
  m.castShadow = false;
  return m;
}

function makeMesh(kind: EntKind): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case "loamhare":
      g.add(box(0.35, 0.22, 0.45, 0x8a6a48, 0.16));
      g.add(box(0.12, 0.22, 0.08, 0x8a6a48, 0.38));
      break;
    case "sunfinch":
      g.add(box(0.18, 0.12, 0.28, 0xc47a3a, 0.3));
      g.add(box(0.08, 0.08, 0.08, 0xe8c45a, 0.38));
      break;
    case "skink":
      g.add(box(0.2, 0.1, 0.5, 0xc4a06a, 0.08));
      break;
    case "mossback":
      g.add(box(0.7, 0.35, 0.8, 0x4a6a48, 0.25));
      g.add(box(0.3, 0.2, 0.3, 0x3a5a3a, 0.45));
      break;
    case "stag":
      g.add(box(0.4, 0.7, 0.7, 0x6a4a32, 0.55));
      g.add(box(0.22, 0.28, 0.22, 0x5a3a28, 1.0));
      g.add(box(0.08, 0.35, 0.08, 0x4a3220, 1.28));
      break;
    case "bristleboar":
      g.add(box(0.5, 0.45, 0.75, 0x4a3a32, 0.32));
      g.add(box(0.22, 0.22, 0.22, 0x3a2a22, 0.55));
      break;
    case "shardmite":
      g.add(box(0.4, 0.4, 0.4, 0x7ec4d4, 0.3));
      g.add(box(0.15, 0.5, 0.15, 0xa8e8f0, 0.7));
      break;
    case "gloomcrawler":
      g.add(box(0.55, 0.22, 0.7, 0x3a2a3a, 0.18));
      g.add(box(0.15, 0.08, 0.5, 0x2a1a2a, 0.08));
      break;
    case "stormkite":
      g.add(box(0.3, 0.12, 0.8, 0x5a6a72, 0.8));
      g.add(box(1.2, 0.06, 0.25, 0x8a9aa2, 0.8));
      break;
    case "auricbeetle":
      g.add(box(0.35, 0.18, 0.4, 0xd4b45a, 0.14));
      break;
    case "settler":
      g.add(box(0.35, 0.7, 0.25, 0x8b9a86, 0.7));
      g.add(box(0.28, 0.28, 0.28, 0xc4a07a, 1.15));
      g.add(box(0.4, 0.12, 0.4, 0x5c5850, 1.32));
      break;
    case "colossus":
      g.add(box(1.6, 2.4, 1.2, 0x8a8680, 1.4));
      g.add(box(0.9, 0.9, 0.9, 0x6a6660, 2.9));
      g.add(box(0.5, 1.6, 0.5, 0x7a7670, 1.4));
      break;
    case "tidewyrm":
      g.add(box(1.2, 0.8, 2.8, 0x2a6a72, 0.6));
      g.add(box(0.7, 0.6, 0.7, 0x3a8a92, 1.1));
      break;
    default:
      g.add(box(0.3, 0.3, 0.3, 0xffffff, 0.15));
  }
  return g;
}

const STATS: Record<
  EntKind,
  { hp: number; speed: number; hostile: boolean; damage: number; w: number; h: number; drop: { id: number; n: number }[]; name: string }
> = {
  loamhare: { hp: 6, speed: 3.4, hostile: false, damage: 0, w: 0.4, h: 0.4, drop: [{ id: I.RAW_HAUNCH, n: 1 }, { id: I.HIDE, n: 1 }], name: "Loamhare" },
  sunfinch: { hp: 3, speed: 5, hostile: false, damage: 0, w: 0.3, h: 0.3, drop: [{ id: I.BERRY, n: 1 }], name: "Sunfinch" },
  skink: { hp: 5, speed: 2.8, hostile: false, damage: 0, w: 0.4, h: 0.2, drop: [{ id: I.HIDE, n: 1 }], name: "Dune skink" },
  mossback: { hp: 16, speed: 1.2, hostile: false, damage: 2, w: 0.8, h: 0.5, drop: [{ id: I.HIDE, n: 2 }], name: "Mossback" },
  stag: { hp: 14, speed: 4.5, hostile: false, damage: 0, w: 0.5, h: 1.2, drop: [{ id: I.RAW_HAUNCH, n: 2 }, { id: I.HIDE, n: 2 }], name: "Grove stag" },
  bristleboar: { hp: 18, speed: 3.6, hostile: true, damage: 4, w: 0.6, h: 0.7, drop: [{ id: I.RAW_HAUNCH, n: 2 }, { id: I.HIDE, n: 1 }], name: "Bristleboar" },
  shardmite: { hp: 12, speed: 3.2, hostile: true, damage: 3, w: 0.5, h: 0.6, drop: [{ id: I.RAW_PRISMITE, n: 1 }], name: "Shardmite" },
  gloomcrawler: { hp: 14, speed: 3.8, hostile: true, damage: 5, w: 0.6, h: 0.4, drop: [{ id: I.STRING, n: 2 }], name: "Gloom crawler" },
  stormkite: { hp: 10, speed: 5.5, hostile: true, damage: 3, w: 0.8, h: 0.4, drop: [{ id: I.HIDE, n: 1 }], name: "Storm kite" },
  auricbeetle: { hp: 8, speed: 2, hostile: false, damage: 0, w: 0.4, h: 0.3, drop: [{ id: I.RAW_AURIC, n: 1 }], name: "Auric beetle" },
  settler: { hp: 20, speed: 2.4, hostile: false, damage: 3, w: 0.45, h: 1.7, drop: [{ id: I.BREAD, n: 1 }], name: "Settler" },
  colossus: { hp: 220, speed: 2.1, hostile: true, damage: 10, w: 1.8, h: 3.4, drop: [{ id: I.COLOSSUS_CORE, n: 1 }, { id: I.AURIC_INGOT, n: 6 }], name: "Hollow Colossus" },
  tidewyrm: { hp: 180, speed: 3.4, hostile: true, damage: 8, w: 1.6, h: 1.2, drop: [{ id: I.TIDE_SCALE, n: 3 }, { id: I.PRISMITE_GEM, n: 2 }], name: "Tidewyrm" },
  item: { hp: 1, speed: 0, hostile: false, damage: 0, w: 0.3, h: 0.3, drop: [], name: "Item" },
};

export class EntitySystem {
  ents: Ent[] = [];
  group = new THREE.Group();
  private spawnAcc = 0;
  private poiSeen = new Set<string>();
  killedBosses = new Set<string>();
  onHitPlayer?: (dmg: number, x: number, z: number) => void;
  onMessage?: (s: string) => void;

  spawn(kind: EntKind, x: number, y: number, z: number): Ent {
    const st = STATS[kind];
    const mesh = makeMesh(kind);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    const e: Ent = {
      id: nextId++,
      kind,
      body: {
        x: x - st.w / 2,
        y,
        z: z - st.w / 2,
        vx: 0,
        vy: 0,
        vz: 0,
        w: st.w,
        h: st.h,
        d: st.w,
        onGround: false,
        inWater: false,
      },
      hp: st.hp,
      maxHp: st.hp,
      yaw: 0,
      state: "wander",
      age: 0,
      cd: 0,
      phase: 1,
      mesh,
      hostile: st.hostile,
      speed: st.speed,
      damage: st.damage,
      drop: st.drop,
      name: st.name,
      targetYaw: Math.random() * Math.PI * 2,
    };
    this.ents.push(e);
    return e;
  }

  noticePoi(p: Poi, world: World) {
    const k = `${p.type}:${p.x}:${p.z}`;
    if (this.poiSeen.has(k)) return;
    this.poiSeen.add(k);
    if (p.type === "village" || p.type === "camp") {
      for (let i = 0; i < 4; i++) {
        this.spawn("settler", p.x + (i % 2) * 3, p.y, p.z + ((i / 2) | 0) * 3);
      }
    }
    if (p.type === "dungeon") {
      this.spawn("gloomcrawler", p.x, p.y, p.z);
      this.spawn("shardmite", p.x + 2, p.y, p.z + 2);
    }
    if (p.type === "boss_colossus" && !this.killedBosses.has("colossus")) {
      this.spawn("colossus", p.x, p.y, p.z);
    }
    if (p.type === "boss_tide" && !this.killedBosses.has("tidewyrm")) {
      this.spawn("tidewyrm", p.x, p.y, p.z);
    }
    void world;
  }

  private tryAmbientSpawn(world: World, player: Player) {
    if (this.ents.length > 48) return;
    const rng = Math.random();
    const ang = rng * Math.PI * 2;
    const dist = 18 + Math.random() * 22;
    const x = player.cx + Math.cos(ang) * dist;
    const z = player.cz + Math.sin(ang) * dist;
    const y = world.surfaceY(Math.floor(x), Math.floor(z));
    const bio = world.biomeAt(Math.floor(x), Math.floor(z));
    const cave = y < player.cy - 8 || player.cy < y - 6;
    let kind: EntKind | null = null;
    if (cave && Math.random() < 0.5) kind = Math.random() < 0.5 ? "gloomcrawler" : "shardmite";
    else if (bio === BIOME.DESERT) kind = Math.random() < 0.7 ? "skink" : "bristleboar";
    else if (bio === BIOME.FOREST) kind = Math.random() < 0.5 ? "stag" : Math.random() < 0.5 ? "loamhare" : "bristleboar";
    else if (bio === BIOME.MOUNTAIN || bio === BIOME.SNOW) kind = Math.random() < 0.4 ? "stormkite" : "loamhare";
    else if (bio === BIOME.GRASS) kind = Math.random() < 0.6 ? "loamhare" : Math.random() < 0.5 ? "sunfinch" : "bristleboar";
    else if (bio === BIOME.SWAMP) kind = "mossback";
    if (Math.random() < 0.04) kind = "auricbeetle";
    if (kind) this.spawn(kind, x, y, z);
  }

  update(dt: number, world: World, player: Player) {
    this.spawnAcc += dt;
    if (this.spawnAcc > 3.2) {
      this.spawnAcc = 0;
      this.tryAmbientSpawn(world, player);
    }

    const pcx = worldToChunk(player.cx);
    const pcz = worldToChunk(player.cz);

    for (let i = this.ents.length - 1; i >= 0; i--) {
      const e = this.ents[i]!;
      e.age += dt;
      if (e.cd > 0) e.cd -= dt;
      const ecx = worldToChunk(e.body.x);
      const ecz = worldToChunk(e.body.z);
      if (Math.abs(ecx - pcx) > 10 || Math.abs(ecz - pcz) > 10) {
        this.removeAt(i);
        continue;
      }
      if (e.state === "dead") {
        e.mesh.scale.y = Math.max(0.05, e.mesh.scale.y - dt * 2);
        if (e.age > 1.2) this.removeAt(i);
        continue;
      }

      this.think(e, dt, world, player);
      if (e.kind !== "sunfinch" && e.kind !== "stormkite") {
        e.body.vy -= 24 * dt;
        moveBody(world, e.body, dt);
      } else {
        e.body.y += e.body.vy * dt;
        e.body.x += e.body.vx * dt;
        e.body.z += e.body.vz * dt;
      }
      e.mesh.position.set(e.body.x + e.body.w / 2, e.body.y, e.body.z + e.body.d / 2);
      e.mesh.rotation.y = e.yaw;

      if (e.hostile && e.state === "attack" && e.cd <= 0) {
        const dist = Math.hypot(player.cx - (e.body.x + e.body.w / 2), player.cz - (e.body.z + e.body.d / 2));
        const reach = e.kind === "colossus" ? 3.4 : e.kind === "tidewyrm" ? 3.2 : 1.6;
        if (dist < reach && Math.abs(player.cy - e.body.y) < 3) {
          this.onHitPlayer?.(e.damage * (e.phase > 1 ? 1.25 : 1), e.body.x, e.body.z);
          e.cd = e.kind === "colossus" ? 1.6 : 0.9;
        }
      }
    }
  }

  private think(e: Ent, dt: number, world: World, player: Player) {
    const ex = e.body.x + e.body.w / 2;
    const ez = e.body.z + e.body.d / 2;
    const dx = player.cx - ex;
    const dz = player.cz - ez;
    const dist = Math.hypot(dx, dz);
    const eyeY = e.body.y + e.body.h * 0.8;
    const los =
      dist < 28 &&
      !voxelRaycast(
        world,
        ex,
        eyeY,
        ez,
        dx / (dist || 1),
        (player.eyeY - eyeY) / (dist || 1),
        dz / (dist || 1),
        dist,
      );

    if (e.kind === "settler") {
      if (dist < 10 && e.hostile === false) {
        // flee if player attacks nearby or boars
      }
      if (e.age % 6 < dt) e.targetYaw = Math.random() * Math.PI * 2;
      e.yaw += ((e.targetYaw - e.yaw + Math.PI) % (Math.PI * 2) - Math.PI) * 2 * dt;
      e.body.vx = -Math.sin(e.yaw) * e.speed * 0.4;
      e.body.vz = -Math.cos(e.yaw) * e.speed * 0.4;
      return;
    }

    if (!e.hostile) {
      if (dist < 6 && (player.speed > 3 || e.state === "flee")) {
        e.state = "flee";
        e.targetYaw = Math.atan2(-dx, -dz); // away? yaw uses -sin/-cos as forward
        // flee away from player: forward should be -player direction
        const away = Math.atan2(ex - player.cx, ez - player.cz); // not matching our yaw
        e.targetYaw = Math.atan2(-(ex - player.cx), -(ez - player.cz));
        // our forward = (-sin yaw, -cos yaw) so to go in dir (kx, kz): yaw = atan2(-kx, -kz)
        const kx = ex - player.cx;
        const kz = ez - player.cz;
        e.targetYaw = Math.atan2(-kx, -kz);
      } else if (e.age % 4 < dt) {
        e.state = "wander";
        e.targetYaw = Math.random() * Math.PI * 2;
      }
    } else {
      const detect = e.kind === "colossus" || e.kind === "tidewyrm" ? 26 : 16;
      if (dist < detect && los) {
        e.lastKnown = { x: player.cx, z: player.cz };
        e.state = dist < 2.2 ? "attack" : "chase";
        const kx = player.cx - ex;
        const kz = player.cz - ez;
        e.targetYaw = Math.atan2(-kx, -kz);
        if (e.kind === "colossus" && e.hp < e.maxHp * 0.6) e.phase = 2;
        if (e.kind === "colossus" && e.hp < e.maxHp * 0.3) e.phase = 3;
      } else if (e.lastKnown) {
        e.state = "chase";
        const kx = e.lastKnown.x - ex;
        const kz = e.lastKnown.z - ez;
        e.targetYaw = Math.atan2(-kx, -kz);
        if (Math.hypot(kx, kz) < 1.5) e.lastKnown = undefined;
      } else {
        e.state = "wander";
        if (e.age % 5 < dt) e.targetYaw += (Math.random() - 0.5) * 1.5;
      }
    }

    // group aggro
    if (e.state === "chase" || e.state === "attack") {
      for (const o of this.ents) {
        if (o.kind === e.kind && o !== e && o.hostile) {
          const d = Math.hypot(o.body.x - e.body.x, o.body.z - e.body.z);
          if (d < 10 && o.state === "wander") {
            o.state = "chase";
            o.lastKnown = { x: player.cx, z: player.cz };
          }
        }
      }
    }

    e.yaw += ((e.targetYaw - e.yaw + Math.PI) % (Math.PI * 2) - Math.PI) * 4 * dt;
    const sp = e.state === "flee" ? e.speed * 1.35 : e.state === "wander" ? e.speed * 0.45 : e.speed;
    const strafe = e.state === "chase" && e.kind !== "colossus" ? Math.sin(e.age * 2) * 0.6 : 0;
    const fx = -Math.sin(e.yaw);
    const fz = -Math.cos(e.yaw);
    const rx = Math.cos(e.yaw);
    const rz = -Math.sin(e.yaw);
    e.body.vx = fx * sp + rx * strafe;
    e.body.vz = fz * sp + rz * strafe;
    if (e.kind === "sunfinch" || e.kind === "stormkite") {
      e.body.vy = Math.sin(e.age * 1.4) * 0.8;
      e.body.y = Math.max(e.body.y, world.surfaceY(Math.floor(ex), Math.floor(ez)) + 2);
    }

    // retreat
    if (e.hostile && e.hp < e.maxHp * 0.2 && e.kind !== "colossus" && e.kind !== "tidewyrm") {
      const kx = ex - player.cx;
      const kz = ez - player.cz;
      e.targetYaw = Math.atan2(-kx, -kz);
      e.state = "flee";
    }
  }

  hitAt(x: number, y: number, z: number, dmg: number, knock: number): Ent | null {
    for (const e of this.ents) {
      if (e.state === "dead") continue;
      if (aabbHits(x - 0.3, y - 0.3, z - 0.3, 0.6, 0.6, 0.6, e.body.x, e.body.y, e.body.z, e.body.w, e.body.h, e.body.d)) {
        e.hp -= dmg;
        const dx = e.body.x - x;
        const dz = e.body.z - z;
        const len = Math.hypot(dx, dz) || 1;
        e.body.vx += (dx / len) * knock;
        e.body.vz += (dz / len) * knock;
        e.body.vy += 3;
        if (!e.hostile && e.kind !== "settler") e.state = "flee";
        if (e.kind === "settler") {
          e.hostile = true;
          e.state = "chase";
        }
        if (e.hostile) e.state = "chase";
        // flash
        e.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshLambertMaterial) {
            c.material.emissive = new THREE.Color(0xffffff);
            setTimeout(() => {
              if (c.material instanceof THREE.MeshLambertMaterial) c.material.emissive = new THREE.Color(0);
            }, 80);
          }
        });
        if (e.hp <= 0) this.kill(e);
        return e;
      }
    }
    return null;
  }

  private kill(e: Ent) {
    e.state = "dead";
    e.age = 0;
    e.body.vx = 0;
    e.body.vz = 0;
    if (e.kind === "colossus") this.killedBosses.add("colossus");
    if (e.kind === "tidewyrm") this.killedBosses.add("tidewyrm");
    this.onMessage?.(`${e.name} falls`);
  }

  harvest(e: Ent, player: Player) {
    for (const d of e.drop) player.give(d.id, d.n);
    player.xp += e.maxHp * 0.6;
  }

  interactSettler(player: Player): string | null {
    for (const e of this.ents) {
      if (e.kind !== "settler") continue;
      const d = Math.hypot(player.cx - (e.body.x + e.body.w / 2), player.cz - (e.body.z + e.body.d / 2));
      if (d < 2.4) {
        if (e.hostile) return "The settler raises a tool at you.";
        // simple trade: bread for wheat
        const slot = player.inv.find((s) => s.id === I.WHEAT && s.n >= 3);
        if (slot) {
          slot.n -= 3;
          if (slot.n <= 0) {
            slot.id = 0;
            slot.n = 0;
          }
          player.give(I.BREAD, 1);
          return "The settler trades a loaf for your wheat.";
        }
        return "A settler nods. Bring wheat if you want bread.";
      }
    }
    return null;
  }

  private removeAt(i: number) {
    const e = this.ents[i]!;
    this.group.remove(e.mesh);
    e.mesh.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else (c.material as THREE.Material).dispose();
      }
    });
    this.ents.splice(i, 1);
  }

  dispose() {
    while (this.ents.length) this.removeAt(0);
  }
}
