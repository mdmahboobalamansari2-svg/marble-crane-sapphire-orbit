import * as THREE from "three";
import { Input } from "./input";
import { Player } from "./player/Player";
import { World } from "./world/World";
import { Atmosphere } from "./atmosphere";
import { EntitySystem } from "./entities/Entities";
import { Viewmodel } from "./viewmodel";
import { GameAudio } from "./audio";
import { Net } from "./net";
import { buildAtlas } from "./textures";
import { B, BIOME_NAMES, SOLID } from "./blocks";
import { getItem, I, emptySlot, type Slot } from "./items";
import { useGameUI } from "./store";
import { writeSlot, type SaveData, type GraphicsSettings } from "./save";
import { SEA_LEVEL } from "./world/constants";

export interface GameOptions {
  seed: number;
  name: string;
  slot: number;
  save?: SaveData | null;
  lan?: { code: string; host: boolean; playerName: string };
}

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, 1, 0.08, 420);
  overlayCam = new THREE.PerspectiveCamera(70, 1, 0.05, 10);
  overlayScene = new THREE.Scene();
  world!: World;
  player = new Player();
  input = new Input();
  atmos = new Atmosphere();
  ents = new EntitySystem();
  view = new Viewmodel();
  audio = new GameAudio();
  net = new Net();
  highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
    new THREE.LineBasicMaterial({ color: 0xf4f1ea }),
  );
  particles: THREE.Points | null = null;
  remoteMeshes = new Map<string, THREE.Object3D>();
  running = false;
  ready = false;
  acc = 0;
  last = 0;
  fpsAcc = 0;
  fpsFrames = 0;
  hudT = 0;
  saveT = 0;
  netT = 0;
  vToggle = 0;
  f3Toggle = 0;
  escToggle = 0;
  interactCd = 0;
  chests = new Map<string, Slot[]>();
  seed: number;
  worldName: string;
  slot: number;
  gfx: GraphicsSettings;
  canvas: HTMLCanvasElement;
  private disposed = false;
  private firstChunks = false;

  constructor(canvas: HTMLCanvasElement, opts: GameOptions) {
    this.canvas = canvas;
    this.seed = opts.seed;
    this.worldName = opts.name;
    this.slot = opts.slot;
    this.gfx = useGameUI.getState().gfx;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.gfx.preset !== "low",
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.gfx.dpr));
    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.autoClear = true;

    this.scene.fog = new THREE.Fog(0xc8d8e0, 48, 160);
    this.scene.add(this.atmos.group);
    this.scene.add(this.ents.group);
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    const atlas = buildAtlas();
    this.world = new World(this.seed, atlas, (p) => this.ents.noticePoi(p, this.world));
    this.world.renderDist = this.gfx.renderDist;
    this.scene.add(this.world.group);

    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.view.attach(this.camera);
    this.overlayScene.add(new THREE.AmbientLight(0xffffff, 0.8));
    this.overlayScene.add(new THREE.DirectionalLight(0xfff2d4, 0.6));

    this.player.name = opts.lan?.playerName ?? "Wanderer";
    if (opts.save) {
      this.player.deserialize(opts.save.player);
      this.world.applyEdits(opts.save.edits);
      this.atmos.worldTime = opts.save.time;
      this.chests = new Map(
        Object.entries(opts.save.chests ?? {}).map(([k, v]) => [k, v.map((s) => ({ ...s }))]),
      );
      for (const b of opts.save.killedBosses ?? []) this.ents.killedBosses.add(b);
      for (const [k, bio] of Object.entries(opts.save.discovered ?? {})) this.world.discovered.set(k, bio);
    } else {
      this.player.give(B.PLANKS, 16);
      this.player.give(I.WOOD_PICK, 1);
      this.player.give(I.BERRY, 6);
      this.player.give(I.STICK, 8);
    }

    this.ents.onHitPlayer = (d, x, z) => {
      this.player.hurt(d, x, z);
      this.audio.hurt();
    };
    this.ents.onMessage = (s) => useGameUI.getState().setHud({ message: s });

    this.input.attach(canvas);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);

    if (opts.lan) {
      void this.net.join(opts.lan.code, opts.lan.playerName, opts.lan.host).then(() => {
        this.net.on.add((_from, msg, ch) => {
          if (ch === "reliable" && msg.t === "edit") {
            this.world.setBlock(Number(msg.x), Number(msg.y), Number(msg.z), Number(msg.id));
          }
          if (ch === "reliable" && msg.t === "hello" && !this.net.host) {
            // guest already has seed from menu
          }
        });
        if (opts.lan?.host) this.net.sendHello(this.seed, this.worldName);
      });
    }

    this.onResize();
    this.placeSpawn(opts.save);
  }

  private placeSpawn(save?: SaveData | null) {
    if (save) {
      this.world.stream(this.player.cx, this.player.cz);
      return;
    }
    // search a grassland-ish spot near origin
    this.player.body.x = 8;
    this.player.body.y = 90;
    this.player.body.z = 8;
    this.world.stream(8, 8);
  }

  private settleSpawn() {
    if (this.firstChunks) return;
    if (this.world.readyCount() < 8) return;
    this.firstChunks = true;
    let best = { x: 8, z: 8, y: 80, score: -1e9 };
    for (let i = 0; i < 40; i++) {
      const ang = i * 1.7;
      const r = 8 + i * 6;
      const x = Math.floor(Math.cos(ang) * r);
      const z = Math.floor(Math.sin(ang) * r);
      const y = this.world.surfaceY(x, z);
      const bio = this.world.biomeAt(x, z);
      const id = this.world.getBlock(x, y - 1, z);
      let score = 0;
      if (bio === 2 || bio === 3) score += 20;
      if (id === B.GRASS) score += 10;
      if (y > SEA_LEVEL + 1 && y < SEA_LEVEL + 18) score += 8;
      if (y <= SEA_LEVEL) score -= 30;
      if (score > best.score) best = { x, z, y, score };
    }
    this.player.body.x = best.x + 0.2;
    this.player.body.y = best.y + 0.1;
    this.player.body.z = best.z + 0.2;
    this.player.spawn = [this.player.body.x, this.player.body.y, this.player.body.z];
    this.ready = true;
    useGameUI.getState().setScreen("playing");
  }

  start() {
    this.running = true;
    this.last = performance.now();
    this.renderer.setAnimationLoop(this.loop);
    this.wireControlsTest();
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    let dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const cap = this.gfx.fpsLimit;
    if (cap > 0) {
      // simple cap: skip if too soon — handled by browser vsync mostly
    }
    this.acc += dt;
    const STEP = 1 / 60;
    while (this.acc >= STEP) {
      this.fixed(STEP);
      this.acc -= STEP;
    }
    this.draw(dt);
    this.fpsFrames++;
    this.fpsAcc += dt;
    if (this.fpsAcc >= 0.4) {
      useGameUI.getState().setHud({ fps: Math.round(this.fpsFrames / this.fpsAcc) });
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }
  };

  private uiOpen(): boolean {
    const o = useGameUI.getState().overlay;
    const s = useGameUI.getState().screen;
    return s !== "playing" || o !== "none";
  }

  private fixed(dt: number) {
    this.settleSpawn();
    this.handleToggles(dt);
    const ui = this.uiOpen();
    if (!this.ready) {
      this.world.stream(this.player.cx, this.player.cz);
      return;
    }

    const flags = this.player.update(dt, this.input, this.world, this.camera, ui, this.gfx.sensitivity * (this.gfx.invertY ? -1 : 1));
    if (flags.stepped) this.audio.footstep(this.player.body.inWater);
    if (flags.mined) {
      this.audio.mine();
      this.burst(this.player.hit?.x ?? this.player.cx, this.player.hit?.y ?? this.player.cy, this.player.hit?.z ?? this.player.cz);
      this.net.sendEdit(this.player.mineTarget?.x ?? 0, this.player.mineTarget?.y ?? 0, this.player.mineTarget?.z ?? 0, B.AIR);
    }
    if (flags.placed) this.audio.place();

    if (!ui) this.combat(dt);

    this.world.stream(this.player.cx, this.player.cz);
    this.ents.update(dt, this.world, this.player);
    this.atmos.update(dt, this.player.cx, this.player.eyeY, this.player.cz, this.scene, this.gfx.particles);

    const fog = this.atmos.fogColor();
    const near = 28 + this.world.renderDist * 4;
    const far = this.world.renderDist * 18;
    this.world.setFog(near, far, fog);
    this.world.setSun(this.atmos.sunDir, this.atmos.wetness, this.atmos.worldTime);
    this.world.setCenter(this.player.cx, this.player.eyeY, this.player.cz);
    (this.scene.fog as THREE.Fog).color.copy(fog);
    (this.scene.fog as THREE.Fog).near = near;
    (this.scene.fog as THREE.Fog).far = far;
    this.renderer.setClearColor(fog, 1);

    const eyeId = this.world.getBlock(Math.floor(this.player.cx), Math.floor(this.player.eyeY), Math.floor(this.player.cz));
    const inCave = this.player.eyeY < this.world.surfaceY(Math.floor(this.player.cx), Math.floor(this.player.cz)) - 4;
    this.audio.setWeather(this.atmos.wetness, inCave);
    if (eyeId === B.WATER) {
      this.renderer.toneMappingExposure = 0.55;
    } else this.renderer.toneMappingExposure = 1.05;

    if (this.player.hit && SOLID[this.world.getBlock(this.player.hit.x, this.player.hit.y, this.player.hit.z)]) {
      this.highlight.visible = true;
      this.highlight.position.set(this.player.hit.x + 0.5, this.player.hit.y + 0.5, this.player.hit.z + 0.5);
    } else this.highlight.visible = false;

    this.view.update(dt, this.player, this.input.attacking && !ui);
    this.syncRemotes();

    this.hudT += dt;
    if (this.hudT > 0.12) {
      this.hudT = 0;
      this.pushHud();
    }
    this.saveT += dt;
    if (this.saveT > 45) {
      this.saveT = 0;
      void this.save();
    }
    this.netT += dt;
    if (this.netT > 0.05 && this.net.room) {
      this.netT = 0;
      this.net.broadcastState(this.player.cx, this.player.body.y, this.player.cz, this.player.yaw, this.player.name);
    }
    if (this.interactCd > 0) this.interactCd -= dt;
  }

  private combat(dt: number) {
    const sel = this.player.selected();
    const def = getItem(sel.id);
    if (this.input.has("KeyF") && this.player.body.onGround) {
      const dir = this.player.lookDir();
      this.player.body.vx += dir.x * 10;
      this.player.body.vz += dir.z * 10;
      this.player.stamina = Math.max(0, this.player.stamina - 18);
    }
    if (def?.tool === "bow") {
      if (this.input.mining) this.player.bowDraw = Math.min(1, this.player.bowDraw + dt);
      else if (this.player.bowDraw > 0.25) {
        const has = this.player.inv.find((s) => s.id === I.ARROW && s.n > 0);
        if (has) {
          has.n--;
          if (has.n <= 0) {
            has.id = 0;
            has.n = 0;
          }
          this.shoot(this.player.bowDraw);
        }
        this.player.bowDraw = 0;
      } else this.player.bowDraw = 0;
    } else if (this.input.attacking && this.player.attackCd <= 0) {
      this.player.attackCd = 0.38;
      this.audio.swing();
      const dir = this.player.lookDir();
      const hx = this.player.cx + dir.x * 2.2;
      const hy = this.player.eyeY + dir.y * 2.2;
      const hz = this.player.cz + dir.z * 2.2;
      const hit = this.ents.hitAt(hx, hy, hz, def?.damage ?? 1.5, 5);
      if (hit) {
        this.audio.hit();
        this.player.trauma = Math.min(1, this.player.trauma + 0.2);
        if (hit.state === "dead") this.ents.harvest(hit, this.player);
        this.player.damageTool(1);
      }
    }
    if (this.input.has("KeyE") && this.interactCd <= 0) {
      // E is inventory in Game handleToggles — skip
    }
    if (this.input.has("KeyQ") && this.interactCd <= 0) {
      this.interactCd = 0.3;
      this.player.consumeSelected(1);
    }
    if (this.input.placing && this.interactCd <= 0) {
      const talk = this.ents.interactSettler(this.player);
      if (talk) {
        useGameUI.getState().setHud({ message: talk });
        this.interactCd = 0.4;
      }
      if (this.player.hit) {
        const id = this.world.getBlock(this.player.hit.x, this.player.hit.y, this.player.hit.z);
        if (id === B.CRATE) {
          const key = `${this.player.hit.x},${this.player.hit.y},${this.player.hit.z}`;
          if (!this.chests.has(key)) this.chests.set(key, this.lootFor(key));
          useGameUI.setState({ overlay: "crate", crateKey: key, crateItems: this.chests.get(key)! });
          this.input.exitLock();
          this.interactCd = 0.4;
        }
        if (id === B.WORKBENCH || id === B.FORGE) {
          useGameUI.getState().setOverlay("inv");
          this.input.exitLock();
        }
      }
    }
    void dt;
  }

  private lootFor(key: string): Slot[] {
    const slots: Slot[] = Array.from({ length: 27 }, emptySlot);
    const h = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const table = [I.BERRY, I.STICK, B.PLANKS, I.EMBERCOAL, I.STRING, I.HIDE, I.RAW_COPPER, I.WHEAT];
    for (let i = 0; i < 4 + (h % 4); i++) {
      const id = table[(h + i * 7) % table.length]!;
      slots[i] = { id, n: 1 + ((h + i) % 4) };
    }
    return slots;
  }

  private shoot(power: number) {
    const dir = this.player.lookDir();
    const dmg = 4 + power * 6;
    const hit = this.ents.hitAt(
      this.player.cx + dir.x * 8,
      this.player.eyeY + dir.y * 8,
      this.player.cz + dir.z * 8,
      dmg,
      3,
    );
    this.audio.swing();
    if (hit && hit.state === "dead") this.ents.harvest(hit, this.player);
  }

  private burst(x: number, y: number, z: number) {
    if (!this.gfx.particles) return;
    const n = 18;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x + 0.5 + (Math.random() - 0.5);
      pos[i * 3 + 1] = y + 0.5 + (Math.random() - 0.5);
      pos[i * 3 + 2] = z + 0.5 + (Math.random() - 0.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8a7a62, size: 0.08 }));
    this.scene.add(pts);
    setTimeout(() => {
      this.scene.remove(pts);
      geo.dispose();
      (pts.material as THREE.Material).dispose();
    }, 280);
  }

  private handleToggles(dt: number) {
    this.vToggle -= dt;
    this.f3Toggle -= dt;
    this.escToggle -= dt;
    if (this.input.has("KeyV") && this.vToggle <= 0) {
      this.player.thirdPerson = !this.player.thirdPerson;
      this.vToggle = 0.3;
    }
    if (this.input.has("F3") && this.f3Toggle <= 0) {
      useGameUI.setState((s) => ({ hud: { ...s.hud, debug: !s.hud.debug } }));
      this.f3Toggle = 0.3;
    }
    if (this.input.has("KeyE") && this.interactCd <= 0 && useGameUI.getState().screen === "playing") {
      const o = useGameUI.getState().overlay;
      if (o === "inv" || o === "crate") {
        useGameUI.getState().setOverlay("none");
        void this.input.requestLock();
      } else if (o === "none") {
        useGameUI.getState().setOverlay("inv");
        this.input.exitLock();
      }
      this.interactCd = 0.25;
    }
    if (this.input.has("KeyM") && this.interactCd <= 0) {
      const o = useGameUI.getState().overlay;
      useGameUI.getState().setOverlay(o === "map" ? "none" : "map");
      if (o !== "map") this.input.exitLock();
      else void this.input.requestLock();
      this.interactCd = 0.25;
    }
    if (this.input.has("Escape") && this.escToggle <= 0) {
      const o = useGameUI.getState().overlay;
      if (o !== "none") {
        useGameUI.getState().setOverlay("none");
        void this.input.requestLock();
      } else {
        useGameUI.getState().setOverlay("pause");
        this.input.exitLock();
      }
      this.escToggle = 0.3;
    }
    if (this.input.has("KeyF") === false) {
      /* dodge is edge-triggered-ish in combat */
    }
  }

  private syncRemotes() {
    for (const [id, p] of this.net.others) {
      let m = this.remoteMeshes.get(id);
      if (!m) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 1.6, 0.4),
          new THREE.MeshLambertMaterial({ color: 0x8b9a86 }),
        );
        body.position.y = 0.8;
        g.add(body);
        this.scene.add(g);
        this.remoteMeshes.set(id, g);
        m = g;
      }
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = p.yaw;
    }
  }

  private pushHud() {
    const bio = BIOME_NAMES[this.world.biomeAt(Math.floor(this.player.cx), Math.floor(this.player.cz))] ?? "";
    useGameUI.getState().setHud({
      health: this.player.health,
      hunger: this.player.hunger,
      stamina: this.player.stamina,
      xp: this.player.xp,
      level: this.player.level(),
      hotbar: this.player.hotbar,
      inv: this.player.inv,
      armor: this.player.armor,
      biome: bio,
      x: this.player.cx,
      y: this.player.body.y,
      z: this.player.cz,
      weather: this.atmos.label(),
      timeLabel: this.atmos.timeLabel(),
      mine: this.player.mineProgress,
      peers: this.net.peers.map((p) => ({
        id: p.id,
        name: p.name,
        state: p.connectionState,
        rtt: p.rttMs,
      })),
    });
  }

  private draw(_dt: number) {
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    // viewmodel is parented to camera so it renders in the main pass;
    // depth-clear would help clip, but parenting is enough for now.
    this.renderer.autoClear = true;
  }

  clickToPlay() {
    this.audio.unlock();
    void this.input.requestLock();
  }

  async save() {
    const data: SaveData = {
      version: 1,
      name: this.worldName,
      seed: this.seed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      player: this.player.serialize(),
      edits: this.world.serializeEdits(),
      discovered: Object.fromEntries(this.world.discovered),
      time: this.atmos.worldTime,
      weather: this.atmos.weather,
      chests: Object.fromEntries(this.chests),
      killedBosses: [...this.ents.killedBosses],
    };
    await writeSlot(this.slot, data);
    useGameUI.getState().setHud({ message: "World saved" });
  }

  applyGfx(g: GraphicsSettings) {
    this.gfx = g;
    this.world.renderDist = g.renderDist;
    this.camera.fov = g.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, g.dpr));
  }

  private onResize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.fov = this.gfx.fov;
    this.camera.updateProjectionMatrix();
  };

  private onVis = () => {
    if (document.hidden) {
      void this.save();
      this.audio.ctx?.suspend();
    } else {
      this.audio.resume();
      this.last = performance.now();
    }
  };

  private wireControlsTest() {
    const self = this;
    (window as unknown as { __controlsTest: unknown }).__controlsTest = {
      getYaw: () => self.player.yaw,
      getSpeed: () => self.player.speed,
      getPosition: () => ({ x: self.player.cx, y: self.player.body.y, z: self.player.cz }),
      setKeys: (codes: string[]) => self.input.setForcedKeys(codes),
      setSteer: (v: number) => {
        self.input.setForcedKeys(v > 0 ? ["KeyW", "KeyA"] : v < 0 ? ["KeyW", "KeyD"] : ["KeyW"]);
      },
    };
    (window as unknown as { __game: Game }).__game = this;
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.input.detach();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
    this.world.dispose();
    this.ents.dispose();
    this.atmos.dispose();
    this.audio.dispose();
    this.net.close();
    this.view.dispose();
    this.renderer.dispose();
  }
}
