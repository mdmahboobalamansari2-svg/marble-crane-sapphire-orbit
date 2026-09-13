import * as THREE from "three";
import { ATLAS_PX, ATLAS_TILES, TILE_PX } from "./world/constants";

function hash(n: number): number {
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, s: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hash(xi * 374761393 + yi * 668265263 + s);
  const n10 = hash((xi + 1) * 374761393 + yi * 668265263 + s);
  const n01 = hash(xi * 374761393 + (yi + 1) * 668265263 + s);
  const n11 = hash((xi + 1) * 374761393 + (yi + 1) * 668265263 + s);
  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function put(data: Uint8ClampedArray, x: number, y: number, ox: number, oy: number, r: number, g: number, b: number, a = 255) {
  const px = ox + x;
  const py = oy + y;
  const i = (py * ATLAS_PX + px) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function fillNoise(
  data: Uint8ClampedArray,
  ox: number,
  oy: number,
  c1: [number, number, number],
  c2: [number, number, number],
  seed: number,
  scale = 0.35,
  speck?: [number, number, number],
) {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const n = noise(x * scale, y * scale, seed);
      const n2 = noise(x * scale * 3 + 8, y * scale * 3, seed + 9);
      let c = mix(c1, c2, n * 0.7 + n2 * 0.3);
      if (speck && n2 > 0.78) c = speck;
      put(data, x, y, ox, oy, c[0], c[1], c[2], 255);
    }
  }
}

function overlayBlobs(
  data: Uint8ClampedArray,
  ox: number,
  oy: number,
  color: [number, number, number],
  seed: number,
  chance = 0.08,
) {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      if (hash(x * 13 + y * 31 + seed) < chance) {
        put(data, x, y, ox, oy, color[0], color[1], color[2]);
      }
    }
  }
}

function plantCross(
  data: Uint8ClampedArray,
  ox: number,
  oy: number,
  stem: [number, number, number],
  leaf: [number, number, number],
  flower?: [number, number, number],
) {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      put(data, x, y, ox, oy, 0, 0, 0, 0);
    }
  }
  for (let y = 2; y < TILE_PX; y++) {
    const sway = ((y / 3) | 0) % 2 === 0 ? 0 : 1;
    put(data, 7 + sway, y, ox, oy, stem[0], stem[1], stem[2]);
    put(data, 8 + sway, y, ox, oy, stem[0], stem[1], stem[2]);
    if (y < 12 && hash(y * 17) > 0.4) {
      put(data, 5 + sway, y, ox, oy, leaf[0], leaf[1], leaf[2]);
      put(data, 10 + sway, y, ox, oy, leaf[0], leaf[1], leaf[2]);
    }
  }
  if (flower) {
    put(data, 7, 2, ox, oy, flower[0], flower[1], flower[2]);
    put(data, 8, 2, ox, oy, flower[0], flower[1], flower[2]);
    put(data, 6, 3, ox, oy, flower[0], flower[1], flower[2]);
    put(data, 9, 3, ox, oy, flower[0], flower[1], flower[2]);
  }
}

function tileOrigin(t: number): [number, number] {
  return [(t % ATLAS_TILES) * TILE_PX, Math.floor(t / ATLAS_TILES) * TILE_PX];
}

export function buildAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_PX;
  canvas.height = ATLAS_PX;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(ATLAS_PX, ATLAS_PX);
  const d = img.data;

  const tiles: Record<number, () => void> = {
    0: () => fillNoise(d, ...tileOrigin(0), [92, 132, 78], [72, 110, 62], 1, 0.5),
    1: () => {
      fillNoise(d, ...tileOrigin(1), [86, 62, 42], [70, 50, 34], 2);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < TILE_PX; x++) {
          const [ox, oy] = tileOrigin(1);
          const n = noise(x * 0.4, y * 0.4, 11);
          const c = mix([92, 132, 78], [70, 108, 60], n);
          put(d, x, y, ox, oy, c[0], c[1], c[2]);
        }
      }
    },
    2: () => fillNoise(d, ...tileOrigin(2), [92, 64, 42], [72, 50, 32], 3),
    3: () => fillNoise(d, ...tileOrigin(3), [122, 118, 112], [98, 96, 90], 4, 0.4, [140, 136, 128]),
    4: () => fillNoise(d, ...tileOrigin(4), [214, 196, 150], [196, 176, 128], 5, 0.6),
    5: () => fillNoise(d, ...tileOrigin(5), [196, 168, 120], [176, 148, 100], 6, 0.3),
    6: () => fillNoise(d, ...tileOrigin(6), [236, 242, 246], [214, 224, 232], 7, 0.5),
    7: () => fillNoise(d, ...tileOrigin(7), [168, 212, 224], [140, 196, 214], 8, 0.25),
    8: () => fillNoise(d, ...tileOrigin(8), [42, 110, 118], [32, 90, 100], 9, 0.2),
    9: () => fillNoise(d, ...tileOrigin(9), [122, 82, 46], [100, 66, 36], 10, 0.5),
    10: () => {
      fillNoise(d, ...tileOrigin(10), [138, 90, 50], [110, 70, 38], 11, 0.35);
      const [ox, oy] = tileOrigin(10);
      for (let y = 0; y < TILE_PX; y++) {
        put(d, 3, y, ox, oy, 90, 58, 32);
        put(d, 12, y, ox, oy, 90, 58, 32);
      }
    },
    11: () => {
      fillNoise(d, ...tileOrigin(11), [62, 122, 68], [48, 100, 54], 12, 0.55);
      overlayBlobs(d, ...tileOrigin(11), [40, 90, 48], 12, 0.12);
      // punch holes
      const [ox, oy] = tileOrigin(11);
      for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
          if (hash(x * 19 + y * 7 + 44) > 0.82) put(d, x, y, ox, oy, 0, 0, 0, 0);
        }
      }
    },
    12: () => {
      fillNoise(d, ...tileOrigin(12), [176, 122, 66], [154, 104, 54], 13, 0.25);
      const [ox, oy] = tileOrigin(12);
      for (let y = 0; y < TILE_PX; y++) {
        if (y % 4 === 0) for (let x = 0; x < TILE_PX; x++) put(d, x, y, ox, oy, 120, 80, 42);
      }
    },
    13: () => {
      const [ox, oy] = tileOrigin(13);
      for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
          const edge = x === 0 || y === 0 || x === 15 || y === 15;
          if (edge) put(d, x, y, ox, oy, 200, 224, 228, 180);
          else put(d, x, y, ox, oy, 180, 220, 228, 50);
        }
      }
    },
    14: () => {
      fillNoise(d, ...tileOrigin(14), [122, 118, 112], [98, 96, 90], 14, 0.4);
      overlayBlobs(d, ...tileOrigin(14), [32, 30, 28], 14, 0.16);
    },
    15: () => {
      fillNoise(d, ...tileOrigin(15), [122, 118, 112], [98, 96, 90], 15, 0.4);
      overlayBlobs(d, ...tileOrigin(15), [196, 122, 74], 15, 0.14);
    },
    16: () => {
      fillNoise(d, ...tileOrigin(16), [122, 118, 112], [98, 96, 90], 16, 0.4);
      overlayBlobs(d, ...tileOrigin(16), [176, 180, 186], 16, 0.14);
    },
    17: () => {
      fillNoise(d, ...tileOrigin(17), [122, 118, 112], [98, 96, 90], 17, 0.4);
      overlayBlobs(d, ...tileOrigin(17), [220, 184, 90], 17, 0.12);
    },
    18: () => {
      fillNoise(d, ...tileOrigin(18), [122, 118, 112], [98, 96, 90], 18, 0.4);
      overlayBlobs(d, ...tileOrigin(18), [126, 220, 232], 18, 0.1);
    },
    19: () => fillNoise(d, ...tileOrigin(19), [138, 106, 90], [118, 90, 74], 19),
    20: () => {
      fillNoise(d, ...tileOrigin(20), [176, 106, 74], [154, 90, 62], 20, 0.3);
      const [ox, oy] = tileOrigin(20);
      for (let y = 0; y < TILE_PX; y++) {
        if (y % 4 === 0) for (let x = 0; x < TILE_PX; x++) put(d, x, y, ox, oy, 120, 70, 48);
      }
    },
    21: () => fillNoise(d, ...tileOrigin(21), [106, 102, 96], [86, 84, 78], 21, 0.55, [70, 68, 64]),
    22: () => fillNoise(d, ...tileOrigin(22), [138, 134, 128], [118, 114, 108], 22, 0.7),
    23: () => fillNoise(d, ...tileOrigin(23), [42, 40, 38], [28, 26, 24], 23, 0.4),
    24: () => fillNoise(d, ...tileOrigin(24), [90, 138, 82], [70, 118, 66], 24, 0.4),
    25: () => fillNoise(d, ...tileOrigin(25), [74, 106, 72], [54, 86, 56], 25, 0.6),
    26: () => fillNoise(d, ...tileOrigin(26), [196, 122, 74], [176, 106, 62], 26, 0.3),
    27: () => {
      fillNoise(d, ...tileOrigin(27), [232, 212, 138], [210, 180, 90], 27, 0.4);
      overlayBlobs(d, ...tileOrigin(27), [255, 244, 200], 27, 0.2);
    },
    28: () => {
      fillNoise(d, ...tileOrigin(28), [138, 98, 56], [118, 82, 44], 28, 0.3);
      const [ox, oy] = tileOrigin(28);
      for (let x = 2; x < 14; x++) {
        put(d, x, 4, ox, oy, 80, 56, 32);
        put(d, x, 11, ox, oy, 80, 56, 32);
      }
    },
    29: () => fillNoise(d, ...tileOrigin(29), [160, 112, 64], [130, 90, 50], 29, 0.4, [90, 62, 36]),
    30: () => fillNoise(d, ...tileOrigin(30), [150, 104, 58], [128, 88, 48], 30, 0.3),
    31: () => {
      fillNoise(d, ...tileOrigin(31), [90, 88, 84], [70, 68, 64], 31, 0.3);
      overlayBlobs(d, ...tileOrigin(31), [220, 90, 40], 31, 0.1);
    },
    32: () => fillNoise(d, ...tileOrigin(32), [70, 68, 64], [50, 48, 44], 32, 0.4, [200, 80, 30]),
    33: () => fillNoise(d, ...tileOrigin(33), [86, 60, 40], [66, 46, 30], 33, 0.4),
    34: () => plantCross(d, ...tileOrigin(34), [110, 140, 60], [150, 170, 70], [210, 180, 80]),
    35: () => plantCross(d, ...tileOrigin(35), [90, 120, 58], [70, 110, 50]),
    36: () => plantCross(d, ...tileOrigin(36), [60, 110, 52], [50, 100, 46]),
    37: () => fillNoise(d, ...tileOrigin(37), [196, 164, 90], [176, 144, 74], 37, 0.6),
    38: () => fillNoise(d, ...tileOrigin(38), [216, 212, 204], [196, 192, 184], 38, 0.3, [180, 176, 168]),
    39: () => fillNoise(d, ...tileOrigin(39), [196, 122, 74], [176, 106, 60], 39, 0.25),
    40: () => fillNoise(d, ...tileOrigin(40), [176, 180, 186], [150, 154, 160], 40, 0.25),
    41: () => fillNoise(d, ...tileOrigin(41), [220, 184, 90], [196, 160, 70], 41, 0.25),
    42: () => fillNoise(d, ...tileOrigin(42), [126, 220, 232], [90, 196, 214], 42, 0.25),
    43: () => fillNoise(d, ...tileOrigin(43), [196, 90, 138], [160, 60, 110], 43, 0.5),
    44: () => fillNoise(d, ...tileOrigin(44), [106, 82, 64], [86, 66, 50], 44, 0.4),
    45: () => {
      fillNoise(d, ...tileOrigin(45), [90, 74, 58], [70, 58, 46], 45, 0.35);
      const [ox, oy] = tileOrigin(45);
      for (let y = 0; y < TILE_PX; y++) put(d, 3, y, ox, oy, 60, 50, 40);
    },
    46: () => fillNoise(d, ...tileOrigin(46), [138, 176, 168], [110, 150, 144], 46, 0.55),
    47: () => fillNoise(d, ...tileOrigin(47), [90, 88, 84], [70, 68, 64], 47, 0.35, [110, 108, 104]),
    48: () => fillNoise(d, ...tileOrigin(48), [74, 78, 82], [54, 58, 62], 48, 0.4),
    49: () => fillNoise(d, ...tileOrigin(49), [138, 212, 224], [90, 180, 200], 49, 0.4, [220, 246, 250]),
    50: () => plantCross(d, ...tileOrigin(50), [80, 120, 62], [70, 110, 54]),
    51: () => plantCross(d, ...tileOrigin(51), [80, 120, 62], [90, 130, 60], [232, 196, 90]),
    52: () => {
      fillNoise(d, ...tileOrigin(52), [92, 64, 42], [72, 50, 32], 52);
      const [ox, oy] = tileOrigin(52);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < TILE_PX; x++) put(d, x, y, ox, oy, 230, 236, 240);
      }
    },
  };

  for (let t = 0; t <= 52; t++) {
    const fn = tiles[t];
    if (fn) fn();
    else fillNoise(d, ...tileOrigin(t), [120, 120, 120], [80, 80, 80], t + 1);
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const terrainVert = /* glsl */ `
  attribute float aTile;
  attribute vec2 aWuv;
  attribute vec3 aColor;
  varying vec2 vWuv;
  varying float vTile;
  varying vec3 vColor;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFog;
  uniform vec3 fogCenter;
  uniform float fogNear;
  uniform float fogFar;

  void main() {
    vWuv = aWuv;
    vTile = aTile;
    vColor = aColor;
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    float dist = length(wp.xyz - fogCenter);
    vFog = smoothstep(fogNear, fogFar, dist);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const terrainFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D atlas;
  uniform vec3 fogColor;
  uniform vec3 sunDir;
  uniform float wetness;
  uniform float tilesPerRow;
  varying vec2 vWuv;
  varying float vTile;
  varying vec3 vColor;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFog;

  void main() {
    float tpr = tilesPerRow;
    vec2 tileUv = vec2(mod(vTile, tpr), floor(vTile / tpr));
    vec2 local = fract(vWuv);
    local = local * 0.98 + 0.01;
    vec2 uv = (tileUv + local) / tpr;
    vec4 tex = texture2D(atlas, uv);
    if (tex.a < 0.12) discard;
    float sun = clamp(dot(normalize(vNormal), normalize(sunDir)), 0.0, 1.0);
    vec3 lit = tex.rgb * vColor * (0.55 + 0.45 * sun);
    lit = mix(lit, lit * 0.72, wetness * 0.5);
    vec3 col = mix(lit, fogColor, vFog);
    gl_FragColor = vec4(col, tex.a);
  }
`;

export const waterVert = /* glsl */ `
  attribute float aTile;
  attribute vec2 aWuv;
  attribute vec3 aColor;
  varying vec2 vWuv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFog;
  uniform float time;
  uniform vec3 fogCenter;
  uniform float fogNear;
  uniform float fogFar;

  void main() {
    vWuv = aWuv;
    vec3 p = position;
    float w1 = sin(p.x * 0.35 + time * 1.4) * 0.06;
    float w2 = cos(p.z * 0.28 + time * 1.1) * 0.05;
    if (normal.y > 0.5) p.y += w1 + w2;
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vWorldPos = wp.xyz;
    vFog = smoothstep(fogNear, fogFar, length(wp.xyz - fogCenter));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const waterFrag = /* glsl */ `
  precision highp float;
  uniform vec3 fogColor;
  uniform vec3 sunDir;
  uniform vec3 waterColor;
  uniform float time;
  varying vec2 vWuv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFog;

  void main() {
    vec3 n = normalize(vNormal);
    float sun = pow(clamp(dot(n, normalize(sunDir)), 0.0, 1.0), 4.0);
    float fres = pow(1.0 - clamp(n.y, 0.0, 1.0), 2.0);
    vec3 col = mix(waterColor, vec3(0.75, 0.9, 0.92), fres * 0.45 + sun * 0.25);
    float spark = sin(vWorldPos.x * 2.4 + time) * sin(vWorldPos.z * 2.1 + time * 0.8);
    col += vec3(0.08) * max(spark, 0.0);
    col = mix(col, fogColor, vFog);
    gl_FragColor = vec4(col, 0.62);
  }
`;

export const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vDir = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
    gl_Position.z = gl_Position.w;
  }
`;

export const skyFrag = /* glsl */ `
  precision highp float;
  uniform vec3 sunDir;
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform float turbidity;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 sky = mix(horizon, zenith, pow(h, 0.65));
    float sun = pow(max(dot(dir, normalize(sunDir)), 0.0), 256.0);
    float glow = pow(max(dot(dir, normalize(sunDir)), 0.0), 8.0);
    sky += vec3(1.0, 0.92, 0.72) * sun * 1.6;
    sky += vec3(1.0, 0.85, 0.55) * glow * 0.35 * turbidity;
    gl_FragColor = vec4(sky, 1.0);
  }
`;
