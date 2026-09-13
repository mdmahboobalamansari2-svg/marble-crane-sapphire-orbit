import { B, BLOCKS } from "../blocks";
import { getItem, I, type Slot, emptySlot, cloneSlot } from "../items";
import type { Input } from "../input";
import { moveBody, type Body, aabbHits } from "../world/collision";
import type { World } from "../world/World";
import { voxelRaycast, type Hit } from "../world/raycast";
import * as THREE from "three";

const WALK = 4.4;
const SPRINT = 6.6;
const CROUCH = 1.9;
const SWIM = 2.6;
const GRAVITY = 28;
const JUMP = 8.6;
const PLAYER_W = 0.6;
const PLAYER_H = 1.8;
const EYE = 1.62;

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  hunger: number;
  stamina: number;
  xp: number;
  hotbar: number;
  inv: Slot[];
  armor: Slot[];
  spawn: [number, number, number];
}

export class Player {
  body: Body = {
    x: 0,
    y: 80,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    d: PLAYER_W,
    onGround: false,
    inWater: false,
  };
  yaw = 0;
  pitch = 0;
  health = 20;
  maxHealth = 20;
  hunger = 20;
  stamina = 100;
  xp = 0;
  hotbar = 0;
  inv: Slot[] = Array.from({ length: 36 }, emptySlot);
  armor: Slot[] = [emptySlot(), emptySlot(), emptySlot(), emptySlot()];
  spawn: [number, number, number] = [0, 80, 0];
  thirdPerson = false;
  crouching = false;
  flying = false;
  hit: Hit | null = null;
  mineProgress = 0;
  mineTarget: Hit | null = null;
  iFrames = 0;
  attackCd = 0;
  bowDraw = 0;
  blocking = false;
  bob = 0;
  trauma = 0;
  hurtFlash = 0;
  name = "Wanderer";
  private hungerAcc = 0;
  private stepAcc = 0;

  get cx(): number {
    return this.body.x + this.body.w * 0.5;
  }
  get cy(): number {
    return this.body.y;
  }
  get cz(): number {
    return this.body.z + this.body.d * 0.5;
  }
  get eyeY(): number {
    return this.body.y + (this.crouching ? 1.2 : EYE);
  }
  get speed(): number {
    return Math.hypot(this.body.vx, this.body.vz);
  }

  selected(): Slot {
    return this.inv[this.hotbar] ?? emptySlot();
  }

  armorPoints(): number {
    let a = 0;
    for (const s of this.armor) {
      const d = getItem(s.id);
      if (d?.armor) a += d.armor;
    }
    return a;
  }

  level(): number {
    return Math.floor(Math.sqrt(this.xp / 12));
  }

  give(id: number, n: number, dur?: number): number {
    const def = getItem(id);
    const stack = def?.stack ?? 64;
    let left = n;
    if (stack > 1) {
      for (const s of this.inv) {
        if (s.id === id && s.n < stack && s.dur === undefined) {
          const add = Math.min(stack - s.n, left);
          s.n += add;
          left -= add;
          if (!left) return 0;
        }
      }
    }
    for (const s of this.inv) {
      if (!s.id) {
        const add = Math.min(stack, left);
        s.id = id;
        s.n = add;
        s.dur = dur ?? def?.durability;
        left -= add;
        if (!left) return 0;
      }
    }
    return left;
  }

  consumeSelected(n = 1): void {
    const s = this.selected();
    if (!s.id) return;
    s.n -= n;
    if (s.n <= 0) {
      s.id = 0;
      s.n = 0;
      s.dur = undefined;
    }
  }

  damageTool(amount = 1): void {
    const s = this.selected();
    const def = getItem(s.id);
    if (!def?.durability || s.dur === undefined) return;
    s.dur -= amount;
    if (s.dur <= 0) {
      s.id = 0;
      s.n = 0;
      s.dur = undefined;
    }
  }

  hurt(amount: number, fromX?: number, fromZ?: number): void {
    if (this.iFrames > 0) return;
    const mit = this.armorPoints() * 0.04;
    const dmg = Math.max(0.5, amount * (1 - mit) * (this.blocking ? 0.45 : 1));
    this.health -= dmg;
    this.iFrames = 0.6;
    this.trauma = Math.min(1, this.trauma + 0.35);
    this.hurtFlash = 0.25;
    if (fromX !== undefined && fromZ !== undefined) {
      const dx = this.cx - fromX;
      const dz = this.cz - fromZ;
      const len = Math.hypot(dx, dz) || 1;
      this.body.vx += (dx / len) * 6;
      this.body.vz += (dz / len) * 6;
      this.body.vy += 3;
    }
    if (this.health <= 0) this.die();
  }

  die(): void {
    // drop inventory
    this.health = this.maxHealth;
    this.hunger = 10;
    this.body.x = this.spawn[0];
    this.body.y = this.spawn[1];
    this.body.z = this.spawn[2];
    this.body.vx = 0;
    this.body.vy = 0;
    this.body.vz = 0;
  }

  eat(): boolean {
    const s = this.selected();
    const def = getItem(s.id);
    if (!def?.food) return false;
    if (this.hunger >= 20) return false;
    this.hunger = Math.min(20, this.hunger + def.food);
    this.health = Math.min(this.maxHealth, this.health + def.food * 0.25);
    this.consumeSelected(1);
    return true;
  }

  serialize(): PlayerState {
    return {
      x: this.body.x,
      y: this.body.y,
      z: this.body.z,
      yaw: this.yaw,
      pitch: this.pitch,
      health: this.health,
      hunger: this.hunger,
      stamina: this.stamina,
      xp: this.xp,
      hotbar: this.hotbar,
      inv: this.inv.map(cloneSlot),
      armor: this.armor.map(cloneSlot),
      spawn: [...this.spawn] as [number, number, number],
    };
  }

  deserialize(s: PlayerState) {
    this.body.x = s.x;
    this.body.y = s.y;
    this.body.z = s.z;
    this.yaw = s.yaw;
    this.pitch = s.pitch;
    this.health = s.health;
    this.hunger = s.hunger;
    this.stamina = s.stamina;
    this.xp = s.xp;
    this.hotbar = s.hotbar;
    this.inv = s.inv.map(cloneSlot);
    this.armor = s.armor.map(cloneSlot);
    this.spawn = s.spawn;
  }

  update(
    dt: number,
    input: Input,
    world: World,
    cam: THREE.Camera,
    uiOpen: boolean,
    lookSens: number,
  ): { stepped: boolean; mined: boolean; placed: boolean; jumped: boolean } {
    const flags = { stepped: false, mined: false, placed: false, jumped: false };
    if (this.iFrames > 0) this.iFrames -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    if (!uiOpen) {
      const look = input.consumeLook();
      this.yaw -= look.dx * lookSens;
      this.pitch -= look.dy * lookSens;
      const lim = Math.PI / 2 - 0.02;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));

      const wheel = input.consumeWheel();
      if (wheel) this.hotbar = (this.hotbar + wheel + 9) % 9;
      for (let i = 0; i < 9; i++) {
        if (input.has("Digit" + (i + 1))) this.hotbar = i;
      }
      if (input.has("KeyV")) {
        /* toggle handled in Game to debounce */
      }
    }

    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);

    this.crouching = !uiOpen && (input.has("ControlLeft") || input.has("ControlRight") || input.has("KeyC"));
    this.body.h = this.crouching ? 1.5 : PLAYER_H;

    let wishX = 0;
    let wishZ = 0;
    if (!uiOpen) {
      if (input.has("KeyW") || input.has("ArrowUp")) {
        wishX += fx;
        wishZ += fz;
      }
      if (input.has("KeyS") || input.has("ArrowDown")) {
        wishX -= fx;
        wishZ -= fz;
      }
      if (input.has("KeyD") || input.has("ArrowRight")) {
        wishX += rx;
        wishZ += rz;
      }
      if (input.has("KeyA") || input.has("ArrowLeft")) {
        wishX -= rx;
        wishZ -= rz;
      }
      if (input.touchLeft.active) {
        wishX += -input.touchLeft.y * fx + input.touchLeft.x * rx;
        wishZ += -input.touchLeft.y * fz + input.touchLeft.x * rz;
      }
    }
    const wlen = Math.hypot(wishX, wishZ);
    if (wlen > 1) {
      wishX /= wlen;
      wishZ /= wlen;
    }

    const sprinting =
      !uiOpen &&
      (input.has("ShiftLeft") || input.has("ShiftRight")) &&
      this.stamina > 0 &&
      !this.crouching &&
      wlen > 0;
    if (sprinting) this.stamina = Math.max(0, this.stamina - 18 * dt);
    else this.stamina = Math.min(100, this.stamina + 22 * dt);

    this.blocking = !uiOpen && input.has("KeyR");
    let speed = this.crouching ? CROUCH : sprinting ? SPRINT : WALK;
    if (this.body.inWater) speed = SWIM;
    if (this.hunger <= 0) speed *= 0.7;

    const accel = this.body.onGround ? 40 : 12;
    const targetVx = wishX * speed;
    const targetVz = wishZ * speed;
    this.body.vx += (targetVx - this.body.vx) * Math.min(1, accel * dt);
    this.body.vz += (targetVz - this.body.vz) * Math.min(1, accel * dt);

    if (this.body.inWater) {
      this.body.vy += (input.has("Space") ? 14 : -6) * dt;
      this.body.vy *= Math.pow(0.3, dt * 4);
    } else {
      this.body.vy -= GRAVITY * dt;
      if (!uiOpen && this.body.onGround && input.has("Space")) {
        this.body.vy = JUMP;
        this.body.onGround = false;
        flags.jumped = true;
      }
    }

    // climb vines
    const feet = world.getBlock(Math.floor(this.cx), Math.floor(this.body.y), Math.floor(this.cz));
    if (feet === B.VINE && input.has("KeyW")) {
      this.body.vy = 3.2;
    }

    moveBody(world, this.body, dt);

    if (this.speed > 1 && this.body.onGround) {
      this.bob += dt * this.speed * 1.8;
      this.stepAcc += dt * this.speed;
      if (this.stepAcc > 1.4) {
        this.stepAcc = 0;
        flags.stepped = true;
      }
    }

    this.hungerAcc += dt * (sprinting ? 0.12 : 0.035);
    if (this.hungerAcc > 1) {
      this.hungerAcc = 0;
      this.hunger = Math.max(0, this.hunger - 0.15);
      if (this.hunger > 16 && this.health < this.maxHealth) this.health = Math.min(this.maxHealth, this.health + 0.4);
      if (this.hunger <= 0) this.health = Math.max(1, this.health - 0.3);
    }

    // look ray
    const eyeX = this.cx;
    const eyeY = this.eyeY;
    const eyeZ = this.cz;
    const ly = Math.sin(this.pitch);
    const lh = Math.cos(this.pitch);
    const ldx = fx * lh;
    const ldy = ly;
    const ldz = fz * lh;
    this.hit = voxelRaycast(world, eyeX, eyeY, eyeZ, ldx, ldy, ldz, 6);

    if (!uiOpen) {
      const sel = this.selected();
      const def = getItem(sel.id);
      if (input.mining && this.hit && def?.tool !== "sword" && def?.tool !== "bow") {
        flags.mined = this.tickMine(dt, world);
      } else {
        this.mineProgress = 0;
        this.mineTarget = null;
      }
      if (input.placing && this.hit) {
        flags.placed = this.tryPlace(world);
        input.placing = false;
      }
    }

    this.updateCamera(cam, dt);
    return flags;
  }

  private tickMine(dt: number, world: World): boolean {
    const hit = this.hit!;
    const id = world.getBlock(hit.x, hit.y, hit.z);
    if (id === B.AIR || id === B.BEDROCK) return false;
    if (
      !this.mineTarget ||
      this.mineTarget.x !== hit.x ||
      this.mineTarget.y !== hit.y ||
      this.mineTarget.z !== hit.z
    ) {
      this.mineTarget = hit;
      this.mineProgress = 0;
    }
    const def = BLOCKS[id];
    const tool = getItem(this.selected().id);
    let speed = 1;
    if (def) {
      if (tool?.tool && tool.tool === def.tool) speed = tool.power ?? 2;
      else if (def.tool === "hand") speed = 1.4;
      else speed = 0.35;
      this.mineProgress += (dt * speed) / Math.max(0.15, def.hardness);
    } else this.mineProgress += dt;
    if (this.mineProgress >= 1) {
      const drop = def?.drop ?? id;
      if (drop) this.give(drop, 1);
      world.setBlock(hit.x, hit.y, hit.z, B.AIR);
      this.mineProgress = 0;
      this.mineTarget = null;
      this.damageTool(1);
      this.xp += 0.4;
      return true;
    }
    return false;
  }

  private tryPlace(world: World): boolean {
    const hit = this.hit!;
    const sel = this.selected();
    const def = getItem(sel.id);
    if (!def) return false;
    if (def.tool === "hoe") {
      const id = world.getBlock(hit.x, hit.y, hit.z);
      if (id === B.DIRT || id === B.GRASS) {
        world.setBlock(hit.x, hit.y, hit.z, B.FARMLAND);
        this.damageTool(1);
        return true;
      }
    }
    if (sel.id === I.BUCKET && world.getBlock(hit.x, hit.y, hit.z) === B.WATER) {
      world.setBlock(hit.x, hit.y, hit.z, B.AIR);
      sel.id = I.WATER_BUCKET;
      sel.n = 1;
      return true;
    }
    if (!def.place || !sel.n) return false;
    const px = hit.x + hit.nx;
    const py = hit.y + hit.ny;
    const pz = hit.z + hit.nz;
    if (world.getBlock(px, py, pz) !== B.AIR && world.getBlock(px, py, pz) !== B.TALLGRASS && world.getBlock(px, py, pz) !== B.WATER)
      return false;
    if (
      aabbHits(
        this.body.x,
        this.body.y,
        this.body.z,
        this.body.w,
        this.body.h,
        this.body.d,
        px,
        py,
        pz,
        1,
        1,
        1,
      )
    )
      return false;
    if (def.place === B.CROP && world.getBlock(px, py - 1, pz) !== B.FARMLAND) return false;
    world.setBlock(px, py, pz, def.place);
    this.consumeSelected(1);
    this.xp += 0.1;
    return true;
  }

  updateCamera(cam: THREE.Camera, dt: number) {
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const eyeY = this.eyeY + Math.sin(this.bob * 2) * 0.04 * (this.speed > 0.4 ? 1 : 0);
    const shake = this.trauma * this.trauma;
    const sx = (Math.random() * 2 - 1) * shake * 0.12;
    const sy = (Math.random() * 2 - 1) * shake * 0.12;
    if (this.thirdPerson) {
      const dist = 4.2;
      const tx = this.cx - fx * dist;
      const ty = this.eyeY + 1.1;
      const tz = this.cz - fz * dist;
      cam.position.x += (tx - cam.position.x) * (1 - Math.exp(-8 * dt));
      cam.position.y += (ty - cam.position.y) * (1 - Math.exp(-8 * dt));
      cam.position.z += (tz - cam.position.z) * (1 - Math.exp(-8 * dt));
      cam.lookAt(this.cx, this.eyeY, this.cz);
    } else {
      cam.position.set(this.cx + sx, eyeY + sy, this.cz);
      cam.rotation.order = "YXZ";
      cam.rotation.y = this.yaw;
      cam.rotation.x = this.pitch;
    }
  }

  lookDir(): THREE.Vector3 {
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const ly = Math.sin(this.pitch);
    const lh = Math.cos(this.pitch);
    return new THREE.Vector3(fx * lh, ly, fz * lh);
  }
}
