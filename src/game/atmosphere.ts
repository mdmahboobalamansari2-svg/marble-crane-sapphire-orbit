import * as THREE from "three";
import { skyFrag, skyVert } from "./textures";

export type WeatherKind = "clear" | "clouds" | "rain" | "storm" | "fog";

export class Atmosphere {
  sky: THREE.Mesh;
  sun: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  clouds: THREE.Mesh;
  rain: THREE.Points | null = null;
  group = new THREE.Group();
  weather: WeatherKind = "clear";
  weatherT = 0;
  worldTime = 0;
  wetness = 0;
  fogDensity = 0;
  sunDir = new THREE.Vector3(0.4, 0.8, 0.3);
  private skyMat: THREE.ShaderMaterial;
  private cloudMat: THREE.ShaderMaterial;
  private rainGeo: THREE.BufferGeometry | null = null;
  private nextWeather = 40 + Math.random() * 50;

  constructor() {
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDir: { value: this.sunDir.clone() },
        zenith: { value: new THREE.Color("#6eb4d4") },
        horizon: { value: new THREE.Color("#f0d8b0") },
        turbidity: { value: 1 },
      },
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), this.skyMat);
    this.sky.frustumCulled = false;

    const sunGeo = new THREE.SphereGeometry(8, 16, 12);
    this.sun = new THREE.Mesh(sunGeo, new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));

    this.sunLight = new THREE.DirectionalLight(0xfff2d4, 1.35);
    this.sunLight.castShadow = false;

    this.hemi = new THREE.HemisphereLight(0xb8d4e8, 0x6b5a42, 0.55);

    this.cloudMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cover: { value: 0.35 },
        color: { value: new THREE.Color("#f4f1ea") },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float time;
        uniform float cover;
        uniform vec3 color;
        varying vec2 vUv;
        float n(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float vnoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          float a = n(i); float b = n(i + vec2(1.0, 0.0));
          float c = n(i + vec2(0.0, 1.0)); float d = n(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float fbm(vec2 p) {
          float s = 0.0; float a = 0.5;
          for (int i = 0; i < 5; i++) { s += vnoise(p) * a; p *= 2.03; a *= 0.5; }
          return s;
        }
        void main() {
          vec2 uv = vUv * 8.0 + vec2(time * 0.015, time * 0.008);
          float c = fbm(uv);
          float a = smoothstep(1.0 - cover, 1.0 - cover + 0.25, c);
          gl_FragColor = vec4(color, a * 0.72);
        }
      `,
    });
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 1, 1), this.cloudMat);
    this.clouds.rotation.x = -Math.PI / 2;
    this.clouds.position.y = 92;
    this.clouds.renderOrder = 1;

    this.group.add(this.sky, this.sun, this.sunLight, this.hemi, this.clouds);
  }

  enableRain(scene: THREE.Scene, on: boolean) {
    if (on && !this.rain) {
      const count = 1400;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 40;
        pos[i * 3 + 1] = Math.random() * 24;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
      this.rainGeo = new THREE.BufferGeometry();
      this.rainGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.rain = new THREE.Points(
        this.rainGeo,
        new THREE.PointsMaterial({ color: 0xa8c4d0, size: 0.08, transparent: true, opacity: 0.55 }),
      );
      scene.add(this.rain);
    }
    if (!on && this.rain) {
      scene.remove(this.rain);
      this.rain.geometry.dispose();
      (this.rain.material as THREE.Material).dispose();
      this.rain = null;
    }
  }

  update(dt: number, px: number, py: number, pz: number, scene: THREE.Scene, gfxParticles: boolean) {
    this.worldTime += dt;
    this.weatherT += dt;
    if (this.weatherT > this.nextWeather) {
      this.weatherT = 0;
      this.nextWeather = 35 + Math.random() * 70;
      const r = Math.random();
      this.weather = r < 0.4 ? "clear" : r < 0.6 ? "clouds" : r < 0.78 ? "rain" : r < 0.9 ? "fog" : "storm";
    }

    // Sun never sets — elevation stays between ~25° and ~70°
    const elev = 0.55 + 0.35 * Math.sin(this.worldTime * 0.015);
    const azim = this.worldTime * 0.012;
    this.sunDir.set(Math.cos(azim) * Math.cos(elev), Math.sin(elev), Math.sin(azim) * Math.cos(elev)).normalize();

    this.sky.position.set(px, py, pz);
    this.sun.position.copy(this.sunDir).multiplyScalar(180).add(new THREE.Vector3(px, py, pz));
    this.sunLight.position.copy(this.sun.position);
    this.sunLight.target.position.set(px, py, pz);
    this.sunLight.target.updateMatrixWorld();
    this.clouds.position.set(px, py + 70, pz);

    const cover =
      this.weather === "clear" ? 0.22 : this.weather === "clouds" ? 0.5 : this.weather === "fog" ? 0.55 : 0.78;
    this.wetness += ((this.weather === "rain" || this.weather === "storm" ? 1 : 0) - this.wetness) * (1 - Math.exp(-0.4 * dt));
    this.fogDensity =
      this.weather === "fog" ? 0.7 : this.weather === "storm" ? 0.45 : this.weather === "rain" ? 0.25 : 0.05;

    this.skyMat.uniforms.sunDir!.value.copy(this.sunDir);
    this.skyMat.uniforms.turbidity!.value = 0.8 + this.wetness * 0.8;
    const noon = this.sunDir.y;
    (this.skyMat.uniforms.zenith!.value as THREE.Color).setRGB(0.38 + noon * 0.1, 0.66, 0.82);
    (this.skyMat.uniforms.horizon!.value as THREE.Color).setRGB(0.94, 0.82 + noon * 0.05, 0.62);
    this.cloudMat.uniforms.time!.value = this.worldTime;
    this.cloudMat.uniforms.cover!.value = cover;
    this.sunLight.intensity = 1.15 + noon * 0.4 - this.wetness * 0.45;
    if (this.weather === "storm" && Math.random() < dt * 0.08) {
      this.sunLight.intensity = 3.2;
    }

    this.enableRain(scene, gfxParticles && (this.weather === "rain" || this.weather === "storm"));
    if (this.rain && this.rainGeo) {
      this.rain.position.set(px, py, pz);
      const arr = this.rainGeo.attributes.position!.array as Float32Array;
      const spd = this.weather === "storm" ? 28 : 18;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1]! -= spd * dt;
        if (arr[i + 1]! < -2) arr[i + 1] = 22;
        arr[i]! += dt * (this.weather === "storm" ? 4 : 1);
        if (arr[i]! > 20) arr[i] = -20;
      }
      this.rainGeo.attributes.position!.needsUpdate = true;
    }
  }

  fogColor(): THREE.Color {
    if (this.weather === "fog") return new THREE.Color("#c8d2d6");
    if (this.weather === "storm") return new THREE.Color("#9aada8");
    if (this.weather === "rain") return new THREE.Color("#b4c6c8");
    return new THREE.Color("#c8d8e0");
  }

  label(): string {
    return { clear: "Clear sky", clouds: "Scattered cloud", rain: "Rain", storm: "Storm", fog: "Haze" }[this.weather];
  }

  timeLabel(): string {
    const e = this.sunDir.y;
    if (e > 0.85) return "High sun";
    if (e > 0.65) return "Late morning";
    return "Golden hours";
  }

  dispose() {
    this.sky.geometry.dispose();
    this.skyMat.dispose();
    this.sun.geometry.dispose();
    (this.sun.material as THREE.Material).dispose();
    this.clouds.geometry.dispose();
    this.cloudMat.dispose();
  }
}
