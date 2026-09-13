import { create } from "zustand";
import type { Slot } from "./items";
import type { GraphicsSettings, SaveData } from "./save";
import { DEFAULT_GFX } from "./save";

export type Screen =
  | "menu"
  | "new"
  | "load"
  | "lan"
  | "settings"
  | "controls"
  | "loading"
  | "playing"
  | "paused";

export type Overlay = "none" | "inv" | "map" | "crate" | "pause" | "dead";

export interface HudState {
  health: number;
  hunger: number;
  stamina: number;
  xp: number;
  level: number;
  hotbar: number;
  inv: Slot[];
  armor: Slot[];
  biome: string;
  fps: number;
  x: number;
  y: number;
  z: number;
  weather: string;
  timeLabel: string;
  mine: number;
  message: string;
  peers: { id: string; name: string; state: string; rtt: number | null }[];
  debug: boolean;
}

export interface Session {
  seed: number;
  name: string;
  slot: number;
  save: SaveData | null;
  lan?: { code: string; host: boolean; playerName: string };
}

interface GameUI {
  screen: Screen;
  overlay: Overlay;
  hud: HudState;
  gfx: GraphicsSettings;
  seedInput: string;
  worldName: string;
  lanCode: string;
  lanName: string;
  slot: number;
  crateKey: string | null;
  crateItems: Slot[];
  session: Session | null;
  clickPrompt: boolean;
  setScreen: (s: Screen) => void;
  setOverlay: (o: Overlay) => void;
  setHud: (h: Partial<HudState>) => void;
  setGfx: (g: Partial<GraphicsSettings>) => void;
  startSession: (s: Session) => void;
}

const emptyHud: HudState = {
  health: 20,
  hunger: 20,
  stamina: 100,
  xp: 0,
  level: 0,
  hotbar: 0,
  inv: [],
  armor: [],
  biome: "Sage steppe",
  fps: 0,
  x: 0,
  y: 0,
  z: 0,
  weather: "Clear sky",
  timeLabel: "High sun",
  mine: 0,
  message: "",
  peers: [],
  debug: false,
};

export const useGameUI = create<GameUI>((set) => ({
  screen: "menu",
  overlay: "none",
  hud: emptyHud,
  gfx: DEFAULT_GFX,
  seedInput: "",
  worldName: "New wilderness",
  lanCode: "",
  lanName: "Wanderer",
  slot: 0,
  crateKey: null,
  crateItems: [],
  session: null,
  clickPrompt: true,
  setScreen: (screen) => set({ screen }),
  setOverlay: (overlay) => set({ overlay }),
  setHud: (h) => set((s) => ({ hud: { ...s.hud, ...h } })),
  setGfx: (g) => set((s) => ({ gfx: { ...s.gfx, ...g } })),
  startSession: (session) => set({ session, screen: "loading", overlay: "none", clickPrompt: true }),
}));
