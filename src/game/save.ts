import type { PlayerState } from "./player/Player";
import type { Slot } from "./items";

export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  name: string;
  seed: number;
  createdAt: number;
  updatedAt: number;
  player: PlayerState;
  edits: Record<string, number[]>;
  discovered: Record<string, number>;
  time: number;
  weather: string;
  chests: Record<string, Slot[]>;
  killedBosses: string[];
}

const DB = "everlight";
const STORE = "slots";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function writeSlot(slot: number, data: SaveData): Promise<void> {
  data.version = SAVE_VERSION;
  data.updatedAt = Date.now();
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, `slot-${slot}`);
      tx.objectStore(STORE).put(data, `slot-${slot}-bak`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    try {
      localStorage.setItem(`everlight-slot-${slot}`, JSON.stringify(data));
    } catch {
      /* quota */
    }
  }
}

export async function readSlot(slot: number): Promise<SaveData | null> {
  try {
    const db = await openDb();
    const data = await new Promise<SaveData | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(`slot-${slot}`);
      req.onsuccess = () => resolve(req.result as SaveData | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (data) return migrate(data);
  } catch {
    /* fall through */
  }
  try {
    const raw = localStorage.getItem(`everlight-slot-${slot}`);
    if (raw) return migrate(JSON.parse(raw) as SaveData);
  } catch {
    /* ignore */
  }
  return null;
}

export async function listSlots(): Promise<{ slot: number; data: SaveData | null }[]> {
  const out: { slot: number; data: SaveData | null }[] = [];
  for (let i = 0; i < 5; i++) out.push({ slot: i, data: await readSlot(i) });
  return out;
}

export async function deleteSlot(slot: number): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(`slot-${slot}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    localStorage.removeItem(`everlight-slot-${slot}`);
  }
}

function migrate(s: SaveData): SaveData {
  if (!s.version) s.version = 1;
  s.chests ??= {};
  s.killedBosses ??= [];
  s.discovered ??= {};
  s.edits ??= {};
  return s;
}

export interface GraphicsSettings {
  preset: "low" | "medium" | "high" | "ultra";
  renderDist: number;
  shadows: boolean;
  fov: number;
  fpsLimit: number;
  dpr: number;
  ao: boolean;
  particles: boolean;
  shake: boolean;
  sensitivity: number;
  invertY: boolean;
}

export const DEFAULT_GFX: GraphicsSettings = {
  preset: "high",
  renderDist: 7,
  shadows: false,
  fov: 75,
  fpsLimit: 0,
  dpr: 1,
  ao: true,
  particles: true,
  shake: true,
  sensitivity: 0.0022,
  invertY: false,
};

export function loadGfx(): GraphicsSettings {
  try {
    const raw = localStorage.getItem("everlight-gfx");
    if (raw) return { ...DEFAULT_GFX, ...(JSON.parse(raw) as GraphicsSettings) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_GFX };
}

export function saveGfx(g: GraphicsSettings) {
  try {
    localStorage.setItem("everlight-gfx", JSON.stringify(g));
  } catch {
    /* ignore */
  }
}

export function applyPreset(p: GraphicsSettings["preset"]): Partial<GraphicsSettings> {
  switch (p) {
    case "low":
      return { preset: p, renderDist: 4, shadows: false, dpr: 0.7, particles: false, ao: false };
    case "medium":
      return { preset: p, renderDist: 6, shadows: false, dpr: 0.9, particles: true, ao: true };
    case "high":
      return { preset: p, renderDist: 8, shadows: false, dpr: 1, particles: true, ao: true };
    case "ultra":
      return { preset: p, renderDist: 10, shadows: true, dpr: 1.25, particles: true, ao: true };
  }
}
