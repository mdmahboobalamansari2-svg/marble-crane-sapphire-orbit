import * as THREE from "three";
import { getItem } from "./items";
import type { Player } from "./player/Player";

export class Viewmodel {
  group = new THREE.Group();
  private mesh: THREE.Object3D;
  private swing = 0;
  private lastId = -1;

  constructor() {
    this.mesh = this.makeTool(0xb07a42);
    this.group.add(this.mesh);
    this.group.position.set(0.32, -0.28, -0.55);
  }

  private makeTool(color: number): THREE.Group {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.42, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x6a4a2a }),
    );
    handle.rotation.z = 0.3;
    handle.position.set(0, -0.05, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), new THREE.MeshLambertMaterial({ color }));
    head.position.set(0.08, 0.16, 0);
    g.add(handle, head);
    return g;
  }

  attach(camera: THREE.Camera) {
    camera.add(this.group);
  }

  update(dt: number, player: Player, swinging: boolean) {
    const id = player.selected().id;
    if (id !== this.lastId) {
      this.lastId = id;
      this.group.remove(this.mesh);
      const def = getItem(id);
      const col = def ? parseInt(def.icon.slice(1), 16) || 0xb07a42 : 0xb07a42;
      this.mesh = this.makeTool(col);
      this.group.add(this.mesh);
    }
    if (swinging) this.swing = 1;
    this.swing = Math.max(0, this.swing - dt * 3.5);
    this.group.rotation.x = -this.swing * 0.9;
    this.group.rotation.z = this.swing * 0.3;
    const bob = Math.sin(player.bob * 2) * 0.02 * (player.speed > 0.5 ? 1 : 0);
    this.group.position.y = -0.28 + bob;
  }

  dispose() {
    this.group.removeFromParent();
  }
}
