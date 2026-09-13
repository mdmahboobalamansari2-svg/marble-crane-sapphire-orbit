import { LIQUID, SOLID, B } from "../blocks";
import type { World } from "./World";

export interface Body {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  w: number;
  h: number;
  d: number;
  onGround: boolean;
  inWater: boolean;
}

function overlapsSolid(world: World, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean {
  const minX = Math.floor(x0);
  const minY = Math.floor(y0);
  const minZ = Math.floor(z0);
  const maxX = Math.floor(x1 - 1e-6);
  const maxY = Math.floor(y1 - 1e-6);
  const maxZ = Math.floor(z1 - 1e-6);
  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (SOLID[world.getBlock(x, y, z)]) return true;
      }
    }
  }
  return false;
}

function waterOverlap(world: World, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean {
  const minX = Math.floor(x0);
  const minY = Math.floor(y0);
  const minZ = Math.floor(z0);
  const maxX = Math.floor(x1 - 1e-6);
  const maxY = Math.floor(y1 - 1e-6);
  const maxZ = Math.floor(z1 - 1e-6);
  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (LIQUID[world.getBlock(x, y, z)] || world.getBlock(x, y, z) === B.WATER) return true;
      }
    }
  }
  return false;
}

export function moveBody(world: World, b: Body, dt: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy), Math.abs(b.vz)) * dt / 0.3));
  const sdt = dt / steps;
  b.onGround = false;

  for (let s = 0; s < steps; s++) {
    // Y
    b.y += b.vy * sdt;
    if (overlapsSolid(world, b.x, b.y, b.z, b.x + b.w, b.y + b.h, b.z + b.d)) {
      if (b.vy < 0) {
        b.y = Math.ceil(b.y) + 1e-4;
        b.onGround = true;
      } else {
        b.y = Math.floor(b.y + b.h) - b.h - 1e-4;
      }
      b.vy = 0;
    }

    // X
    b.x += b.vx * sdt;
    if (overlapsSolid(world, b.x, b.y, b.z, b.x + b.w, b.y + b.h, b.z + b.d)) {
      // step up
      if (b.onGround || b.vy === 0) {
        const step = 1.05;
        if (!overlapsSolid(world, b.x, b.y + step, b.z, b.x + b.w, b.y + b.h + step, b.z + b.d)) {
          b.y += step;
        } else {
          b.x -= b.vx * sdt;
          b.vx = 0;
        }
      } else {
        b.x -= b.vx * sdt;
        b.vx = 0;
      }
    }

    // Z
    b.z += b.vz * sdt;
    if (overlapsSolid(world, b.x, b.y, b.z, b.x + b.w, b.y + b.h, b.z + b.d)) {
      if (b.onGround || b.vy === 0) {
        const step = 1.05;
        if (!overlapsSolid(world, b.x, b.y + step, b.z, b.x + b.w, b.y + b.h + step, b.z + b.d)) {
          b.y += step;
        } else {
          b.z -= b.vz * sdt;
          b.vz = 0;
        }
      } else {
        b.z -= b.vz * sdt;
        b.vz = 0;
      }
    }
  }

  b.inWater = waterOverlap(world, b.x, b.y + 0.4, b.z, b.x + b.w, b.y + b.h * 0.6, b.z + b.d);
}

export function aabbHits(
  ax: number,
  ay: number,
  az: number,
  aw: number,
  ah: number,
  ad: number,
  bx: number,
  by: number,
  bz: number,
  bw: number,
  bh: number,
  bd: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by && az < bz + bd && az + ad > bz;
}
