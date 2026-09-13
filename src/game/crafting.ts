import { B } from "./blocks";
import { I, type Slot } from "./items";

export interface Recipe {
  id: string;
  station: "hand" | "bench" | "forge";
  /** 3x3 row-major, 0 empty. Length 4 = 2x2. */
  shape?: number[];
  shapeless?: { id: number; n: number }[];
  out: Slot;
}

export const RECIPES: Recipe[] = [
  {
    id: "sticks",
    station: "hand",
    shapeless: [{ id: B.PLANKS, n: 1 }],
    out: { id: I.STICK, n: 4 },
  },
  { id: "planks", station: "hand", shapeless: [{ id: B.LOG, n: 1 }], out: { id: B.PLANKS, n: 4 } },
  {
    id: "planks-frost",
    station: "hand",
    shapeless: [{ id: B.FROSTLOG, n: 1 }],
    out: { id: B.PLANKS, n: 4 },
  },
  {
    id: "workbench",
    station: "hand",
    shape: [B.PLANKS, B.PLANKS, B.PLANKS, B.PLANKS],
    out: { id: B.WORKBENCH, n: 1 },
  },
  {
    id: "wood-pick",
    station: "hand",
    shape: [B.PLANKS, B.PLANKS, B.PLANKS, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.WOOD_PICK, n: 1 },
  },
  {
    id: "wood-axe",
    station: "hand",
    shape: [B.PLANKS, B.PLANKS, 0, B.PLANKS, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.WOOD_AXE, n: 1 },
  },
  {
    id: "wood-shovel",
    station: "hand",
    shape: [0, B.PLANKS, 0, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.WOOD_SHOVEL, n: 1 },
  },
  {
    id: "wood-hoe",
    station: "hand",
    shape: [B.PLANKS, B.PLANKS, 0, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.WOOD_HOE, n: 1 },
  },
  {
    id: "wood-sword",
    station: "hand",
    shape: [0, B.PLANKS, 0, 0, B.PLANKS, 0, 0, I.STICK, 0],
    out: { id: I.WOOD_SWORD, n: 1 },
  },
  {
    id: "stone-pick",
    station: "bench",
    shape: [B.COBBLE, B.COBBLE, B.COBBLE, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.STONE_PICK, n: 1 },
  },
  {
    id: "stone-axe",
    station: "bench",
    shape: [B.COBBLE, B.COBBLE, 0, B.COBBLE, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.STONE_AXE, n: 1 },
  },
  {
    id: "stone-shovel",
    station: "bench",
    shape: [0, B.COBBLE, 0, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.STONE_SHOVEL, n: 1 },
  },
  {
    id: "stone-hoe",
    station: "bench",
    shape: [B.COBBLE, B.COBBLE, 0, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.STONE_HOE, n: 1 },
  },
  {
    id: "stone-sword",
    station: "bench",
    shape: [0, B.COBBLE, 0, 0, B.COBBLE, 0, 0, I.STICK, 0],
    out: { id: I.STONE_SWORD, n: 1 },
  },
  {
    id: "ferrite-pick",
    station: "bench",
    shape: [I.FERRITE_INGOT, I.FERRITE_INGOT, I.FERRITE_INGOT, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.FERRITE_PICK, n: 1 },
  },
  {
    id: "ferrite-axe",
    station: "bench",
    shape: [I.FERRITE_INGOT, I.FERRITE_INGOT, 0, I.FERRITE_INGOT, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.FERRITE_AXE, n: 1 },
  },
  {
    id: "ferrite-shovel",
    station: "bench",
    shape: [0, I.FERRITE_INGOT, 0, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.FERRITE_SHOVEL, n: 1 },
  },
  {
    id: "ferrite-hoe",
    station: "bench",
    shape: [I.FERRITE_INGOT, I.FERRITE_INGOT, 0, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.FERRITE_HOE, n: 1 },
  },
  {
    id: "ferrite-sword",
    station: "bench",
    shape: [0, I.FERRITE_INGOT, 0, 0, I.FERRITE_INGOT, 0, 0, I.STICK, 0],
    out: { id: I.FERRITE_SWORD, n: 1 },
  },
  {
    id: "auric-pick",
    station: "bench",
    shape: [I.AURIC_INGOT, I.AURIC_INGOT, I.AURIC_INGOT, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.AURIC_PICK, n: 1 },
  },
  {
    id: "auric-axe",
    station: "bench",
    shape: [I.AURIC_INGOT, I.AURIC_INGOT, 0, I.AURIC_INGOT, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.AURIC_AXE, n: 1 },
  },
  {
    id: "auric-shovel",
    station: "bench",
    shape: [0, I.AURIC_INGOT, 0, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.AURIC_SHOVEL, n: 1 },
  },
  {
    id: "auric-sword",
    station: "bench",
    shape: [0, I.AURIC_INGOT, 0, 0, I.AURIC_INGOT, 0, 0, I.STICK, 0],
    out: { id: I.AURIC_SWORD, n: 1 },
  },
  {
    id: "prismite-pick",
    station: "bench",
    shape: [I.PRISMITE_GEM, I.PRISMITE_GEM, I.PRISMITE_GEM, 0, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.PRISMITE_PICK, n: 1 },
  },
  {
    id: "prismite-axe",
    station: "bench",
    shape: [I.PRISMITE_GEM, I.PRISMITE_GEM, 0, I.PRISMITE_GEM, I.STICK, 0, 0, I.STICK, 0],
    out: { id: I.PRISMITE_AXE, n: 1 },
  },
  {
    id: "prismite-sword",
    station: "bench",
    shape: [0, I.PRISMITE_GEM, 0, 0, I.PRISMITE_GEM, 0, 0, I.STICK, 0],
    out: { id: I.PRISMITE_SWORD, n: 1 },
  },
  {
    id: "forge",
    station: "bench",
    shape: [B.COBBLE, B.COBBLE, B.COBBLE, B.COBBLE, I.EMBERCOAL, B.COBBLE, B.COBBLE, B.COBBLE, B.COBBLE],
    out: { id: B.FORGE, n: 1 },
  },
  {
    id: "crate",
    station: "bench",
    shape: [B.PLANKS, B.PLANKS, B.PLANKS, B.PLANKS, 0, B.PLANKS, B.PLANKS, B.PLANKS, B.PLANKS],
    out: { id: B.CRATE, n: 1 },
  },
  {
    id: "lantern",
    station: "bench",
    shapeless: [
      { id: I.EMBERCOAL, n: 1 },
      { id: I.STICK, n: 1 },
    ],
    out: { id: B.LANTERN, n: 4 },
  },
  {
    id: "glass",
    station: "forge",
    shapeless: [{ id: B.SAND, n: 1 }],
    out: { id: B.GLASS, n: 1 },
  },
  {
    id: "brick",
    station: "forge",
    shapeless: [{ id: B.CLAY, n: 1 }],
    out: { id: B.BRICK, n: 1 },
  },
  {
    id: "copper-ingot",
    station: "forge",
    shapeless: [{ id: I.RAW_COPPER, n: 1 }],
    out: { id: I.COPPER_INGOT, n: 1 },
  },
  {
    id: "ferrite-ingot",
    station: "forge",
    shapeless: [{ id: I.RAW_FERRITE, n: 1 }],
    out: { id: I.FERRITE_INGOT, n: 1 },
  },
  {
    id: "auric-ingot",
    station: "forge",
    shapeless: [{ id: I.RAW_AURIC, n: 1 }],
    out: { id: I.AURIC_INGOT, n: 1 },
  },
  {
    id: "prismite-gem",
    station: "forge",
    shapeless: [{ id: I.RAW_PRISMITE, n: 1 }],
    out: { id: I.PRISMITE_GEM, n: 1 },
  },
  {
    id: "cooked-haunch",
    station: "forge",
    shapeless: [{ id: I.RAW_HAUNCH, n: 1 }],
    out: { id: I.COOKED_HAUNCH, n: 1 },
  },
  {
    id: "bread",
    station: "bench",
    shapeless: [{ id: I.WHEAT, n: 3 }],
    out: { id: I.BREAD, n: 1 },
  },
  {
    id: "stew",
    station: "bench",
    shapeless: [
      { id: I.WHEAT, n: 1 },
      { id: I.BERRY, n: 1 },
      { id: I.COOKED_HAUNCH, n: 1 },
    ],
    out: { id: I.STEW, n: 1 },
  },
  {
    id: "bow",
    station: "bench",
    shape: [0, I.STICK, I.STRING, I.STICK, 0, I.STRING, 0, I.STICK, I.STRING],
    out: { id: I.BOW, n: 1 },
  },
  {
    id: "arrow",
    station: "hand",
    shapeless: [
      { id: I.STICK, n: 1 },
      { id: B.COBBLE, n: 1 },
      { id: B.FLOWER, n: 1 },
    ],
    out: { id: I.ARROW, n: 4 },
  },
  {
    id: "hide-helm",
    station: "bench",
    shape: [I.HIDE, I.HIDE, I.HIDE, I.HIDE, 0, I.HIDE, 0, 0, 0],
    out: { id: I.HIDE_HELM, n: 1 },
  },
  {
    id: "hide-vest",
    station: "bench",
    shape: [I.HIDE, 0, I.HIDE, I.HIDE, I.HIDE, I.HIDE, I.HIDE, I.HIDE, I.HIDE],
    out: { id: I.HIDE_VEST, n: 1 },
  },
  {
    id: "hide-legs",
    station: "bench",
    shape: [I.HIDE, I.HIDE, I.HIDE, I.HIDE, 0, I.HIDE, I.HIDE, 0, I.HIDE],
    out: { id: I.HIDE_LEGS, n: 1 },
  },
  {
    id: "hide-boots",
    station: "bench",
    shape: [0, 0, 0, I.HIDE, 0, I.HIDE, I.HIDE, 0, I.HIDE],
    out: { id: I.HIDE_BOOTS, n: 1 },
  },
  {
    id: "ferrite-helm",
    station: "bench",
    shape: [I.FERRITE_INGOT, I.FERRITE_INGOT, I.FERRITE_INGOT, I.FERRITE_INGOT, 0, I.FERRITE_INGOT, 0, 0, 0],
    out: { id: I.FERRITE_HELM, n: 1 },
  },
  {
    id: "ferrite-chest",
    station: "bench",
    shape: [
      I.FERRITE_INGOT,
      0,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
    ],
    out: { id: I.FERRITE_CHEST, n: 1 },
  },
  {
    id: "ferrite-legs",
    station: "bench",
    shape: [
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      0,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      0,
      I.FERRITE_INGOT,
    ],
    out: { id: I.FERRITE_LEGS, n: 1 },
  },
  {
    id: "ferrite-boots",
    station: "bench",
    shape: [0, 0, 0, I.FERRITE_INGOT, 0, I.FERRITE_INGOT, I.FERRITE_INGOT, 0, I.FERRITE_INGOT],
    out: { id: I.FERRITE_BOOTS, n: 1 },
  },
  {
    id: "auric-helm",
    station: "bench",
    shape: [I.AURIC_INGOT, I.AURIC_INGOT, I.AURIC_INGOT, I.AURIC_INGOT, 0, I.AURIC_INGOT, 0, 0, 0],
    out: { id: I.AURIC_HELM, n: 1 },
  },
  {
    id: "auric-chest",
    station: "bench",
    shape: [
      I.AURIC_INGOT,
      0,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
    ],
    out: { id: I.AURIC_CHEST, n: 1 },
  },
  {
    id: "prismite-chest",
    station: "bench",
    shape: [
      I.PRISMITE_GEM,
      0,
      I.PRISMITE_GEM,
      I.PRISMITE_GEM,
      I.COLOSSUS_CORE,
      I.PRISMITE_GEM,
      I.PRISMITE_GEM,
      I.PRISMITE_GEM,
      I.PRISMITE_GEM,
    ],
    out: { id: I.PRISMITE_CHEST, n: 1 },
  },
  {
    id: "bucket",
    station: "bench",
    shape: [I.COPPER_INGOT, 0, I.COPPER_INGOT, 0, I.COPPER_INGOT, 0, 0, 0, 0],
    out: { id: I.BUCKET, n: 1 },
  },
  {
    id: "copper-block",
    station: "bench",
    shape: [
      I.COPPER_INGOT,
      I.COPPER_INGOT,
      I.COPPER_INGOT,
      I.COPPER_INGOT,
      I.COPPER_INGOT,
      I.COPPER_INGOT,
      I.COPPER_INGOT,
      I.COPPER_INGOT,
      I.COPPER_INGOT,
    ],
    out: { id: B.COPPER_BLOCK, n: 1 },
  },
  {
    id: "ferrite-block",
    station: "bench",
    shape: [
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
      I.FERRITE_INGOT,
    ],
    out: { id: B.FERRITE_BLOCK, n: 1 },
  },
  {
    id: "auric-block",
    station: "bench",
    shape: [
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
      I.AURIC_INGOT,
    ],
    out: { id: B.AURIC_BLOCK, n: 1 },
  },
  {
    id: "thatch",
    station: "hand",
    shapeless: [{ id: B.REED, n: 4 }],
    out: { id: B.THATCH, n: 1 },
  },
  {
    id: "terracotta",
    station: "forge",
    shapeless: [{ id: B.CLAY, n: 1 }],
    out: { id: B.TERRACOTTA, n: 1 },
  },
];

function countsOf(slots: Slot[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const s of slots) {
    if (!s.id) continue;
    m.set(s.id, (m.get(s.id) ?? 0) + s.n);
  }
  return m;
}

export function matchRecipe(grid: Slot[], station: "hand" | "bench" | "forge"): Recipe | null {
  const n = grid.length;
  const ids = grid.map((s) => (s.n > 0 ? s.id : 0));
  for (const r of RECIPES) {
    if (r.station === "bench" && station === "hand") continue;
    if (r.station === "forge" && station !== "forge") continue;
    if (r.station === "hand" && station === "forge") continue;
    if (r.shapeless) {
      const have = countsOf(grid);
      let ok = true;
      for (const need of r.shapeless) {
        if ((have.get(need.id) ?? 0) < need.n) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      // no extras
      let extra = 0;
      const needed = new Set(r.shapeless.map((x) => x.id));
      for (const [id, c] of have) {
        if (!needed.has(id) && c > 0) extra++;
      }
      if (extra) continue;
      return r;
    }
    if (r.shape) {
      const shape = r.shape;
      if (shape.length === 4 && n === 4) {
        if (ids.every((id, i) => id === shape[i])) return r;
      } else if (shape.length === 9 && n === 9) {
        if (ids.every((id, i) => id === (shape[i] ?? 0))) return r;
      } else if (shape.length === 4 && n === 9) {
        // 2x2 pattern anywhere in 3x3
        for (let y = 0; y < 2; y++) {
          for (let x = 0; x < 2; x++) {
            let match = true;
            for (let i = 0; i < 9; i++) {
              const gx = i % 3;
              const gy = (i / 3) | 0;
              const inPat = gx >= x && gx < x + 2 && gy >= y && gy < y + 2;
              const want = inPat ? shape[(gy - y) * 2 + (gx - x)]! : 0;
              if (ids[i] !== want) {
                match = false;
                break;
              }
            }
            if (match) return r;
          }
        }
      }
    }
  }
  return null;
}

export function consumeRecipe(grid: Slot[], recipe: Recipe): void {
  if (recipe.shapeless) {
    for (const need of recipe.shapeless) {
      let left = need.n;
      for (const s of grid) {
        if (s.id === need.id && s.n > 0 && left > 0) {
          const take = Math.min(s.n, left);
          s.n -= take;
          left -= take;
          if (s.n <= 0) {
            s.id = 0;
            s.n = 0;
            s.dur = undefined;
          }
        }
      }
    }
    return;
  }
  for (const s of grid) {
    if (s.id && s.n > 0) {
      s.n -= 1;
      if (s.n <= 0) {
        s.id = 0;
        s.n = 0;
        s.dur = undefined;
      }
    }
  }
}
