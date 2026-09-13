import { P2PRoom, type PeerInfo } from "@/lib/multiplayer";

export interface NetPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

type Handler = (from: string, data: Record<string, unknown>, channel: "state" | "reliable") => void;

export class Net {
  room: P2PRoom | null = null;
  peers: PeerInfo[] = [];
  others = new Map<string, NetPlayer>();
  selfId = "";
  code = "";
  host = false;
  on = new Set<Handler>();

  async join(code: string, name: string, asHost: boolean) {
    this.code = code.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "everlight";
    this.selfId = `p-${Math.random().toString(36).slice(2, 10)}`;
    this.host = asHost;
    this.room = new P2PRoom({
      room: this.code,
      selfId: this.selfId,
      name,
      onPeersChanged: (p) => {
        this.peers = p;
        const alive = new Set(p.map((x) => x.id));
        for (const id of this.others.keys()) if (!alive.has(id)) this.others.delete(id);
      },
      onMessage: (from, data, channel) => {
        const msg = data as Record<string, unknown>;
        if (channel === "state" && msg && msg.t === "p") {
          this.others.set(from, {
            id: from,
            name: String(msg.n ?? "Wanderer"),
            x: Number(msg.x),
            y: Number(msg.y),
            z: Number(msg.z),
            yaw: Number(msg.yaw),
          });
        }
        for (const h of this.on) h(from, msg, channel);
      },
    });
    await this.room.join();
  }

  broadcastState(x: number, y: number, z: number, yaw: number, name: string) {
    this.room?.broadcast({ t: "p", x, y, z, yaw, n: name });
  }

  sendEdit(wx: number, wy: number, wz: number, id: number) {
    this.room?.send({ t: "edit", x: wx, y: wy, z: wz, id });
  }

  sendHello(seed: number, name: string) {
    this.room?.send({ t: "hello", seed, name, host: this.host });
  }

  close() {
    this.room?.close();
    this.room = null;
  }
}
