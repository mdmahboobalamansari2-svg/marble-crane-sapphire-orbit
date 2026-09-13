import { B } from "./blocks";

export interface ItemDef {
  id: number;
  name: string;
  stack: number;
  place?: number;
  tool?: "pick" | "axe" | "shovel" | "hoe" | "sword" | "bow";
  power?: number;
  damage?: number;
  durability?: number;
  armor?: number;
  slot?: "head" | "chest" | "legs" | "feet";
  food?: number;
  fuel?: number;
  icon: string; // CSS color for HUD fallback
  kind: "block" | "tool" | "weapon" | "armor" | "food" | "material" | "seed";
}

export const I = {
  // materials 200+
  EMBERCOAL: 200,
  RAW_COPPER: 201,
  RAW_FERRITE: 202,
  RAW_AURIC: 203,
  RAW_PRISMITE: 204,
  COPPER_INGOT: 205,
  FERRITE_INGOT: 206,
  AURIC_INGOT: 207,
  PRISMITE_GEM: 208,
  STICK: 209,
  WHEAT: 210,
  SEEDS: 211,
  BERRY: 212,
  BREAD: 213,
  RAW_HAUNCH: 214,
  COOKED_HAUNCH: 215,
  STEW: 216,
  HIDE: 217,
  STRING: 218,
  ARROW: 219,
  BOW: 220,
  // tools 230+
  WOOD_PICK: 230,
  WOOD_AXE: 231,
  WOOD_SHOVEL: 232,
  WOOD_HOE: 233,
  WOOD_SWORD: 234,
  STONE_PICK: 235,
  STONE_AXE: 236,
  STONE_SHOVEL: 237,
  STONE_HOE: 238,
  STONE_SWORD: 239,
  FERRITE_PICK: 240,
  FERRITE_AXE: 241,
  FERRITE_SHOVEL: 242,
  FERRITE_HOE: 243,
  FERRITE_SWORD: 244,
  AURIC_PICK: 245,
  AURIC_AXE: 246,
  AURIC_SHOVEL: 247,
  AURIC_SWORD: 248,
  PRISMITE_PICK: 249,
  PRISMITE_SWORD: 250,
  PRISMITE_AXE: 251,
  // armor 260+
  HIDE_HELM: 260,
  HIDE_VEST: 261,
  HIDE_LEGS: 262,
  HIDE_BOOTS: 263,
  FERRITE_HELM: 264,
  FERRITE_CHEST: 265,
  FERRITE_LEGS: 266,
  FERRITE_BOOTS: 267,
  AURIC_HELM: 268,
  AURIC_CHEST: 269,
  PRISMITE_CHEST: 270,
  // special
  COLOSSUS_CORE: 280,
  TIDE_SCALE: 281,
  BUCKET: 282,
  WATER_BUCKET: 283,
} as const;

export const ITEMS: Record<number, ItemDef> = {};

function item(d: ItemDef) {
  ITEMS[d.id] = d;
}

function blockItem(id: number, name: string, icon: string) {
  item({ id, name, stack: 64, place: id, icon, kind: "block" });
}

blockItem(B.GRASS, "Sage turf", "#6b8f5e");
blockItem(B.DIRT, "Loam", "#6b4a32");
blockItem(B.STONE, "Granite", "#7a7670");
blockItem(B.SAND, "Drift sand", "#d4c49a");
blockItem(B.SANDSTONE, "Dune stone", "#c4a878");
blockItem(B.SNOW, "Rime", "#e8eef2");
blockItem(B.ICE, "Glacier ice", "#a8d4e0");
blockItem(B.LOG, "Amberwood", "#8a5a32");
blockItem(B.LEAVES, "Canopy", "#4a7a48");
blockItem(B.PLANKS, "Amber planks", "#b07a42");
blockItem(B.GLASS, "Clearpane", "#c8e4e8");
blockItem(B.CLAY, "River clay", "#8a6a5a");
blockItem(B.BRICK, "Adobe brick", "#b06a4a");
blockItem(B.COBBLE, "Rubble", "#6a6660");
blockItem(B.GRAVEL, "Shingle", "#8a8680");
blockItem(B.CACTUS, "Sunspine", "#5a8a52");
blockItem(B.MOSS, "Cave moss", "#4a6a48");
blockItem(B.TERRACOTTA, "Fired clay", "#c47a4a");
blockItem(B.LANTERN, "Glow lantern", "#e8d48a");
blockItem(B.CRATE, "Crate", "#8a6238");
blockItem(B.WORKBENCH, "Workbench", "#a07040");
blockItem(B.FORGE, "Forge", "#5a5854");
blockItem(B.REED, "River reed", "#7a9a5a");
blockItem(B.VINE, "Climbvine", "#4a7a42");
blockItem(B.THATCH, "Thatch", "#c4a45a");
blockItem(B.MARBLE, "Pale marble", "#d8d4cc");
blockItem(B.COPPER_BLOCK, "Copperlite block", "#c47a4a");
blockItem(B.FERRITE_BLOCK, "Ferrite block", "#8a9098");
blockItem(B.AURIC_BLOCK, "Auric block", "#d4b45a");
blockItem(B.PRISMITE_BLOCK, "Prismite block", "#7ec4d4");
blockItem(B.MUSHROOM, "Glowcap", "#c45a8a");
blockItem(B.PATH, "Packed earth", "#6a5240");
blockItem(B.FROSTLOG, "Frostpine", "#5a4a3a");
blockItem(B.FROSTLEAVES, "Rime needles", "#8ab0a8");
blockItem(B.GRANITE, "Deep granite", "#5a5854");
blockItem(B.SHALE, "Shale", "#4a4e52");
blockItem(B.CRYSTAL, "Cave crystal", "#8ad4e0");
blockItem(B.FLOWER, "Sunbloom", "#e8c45a");

item({ id: I.EMBERCOAL, name: "Embercoal", stack: 64, icon: "#2a2a28", kind: "material", fuel: 8 });
item({ id: I.RAW_COPPER, name: "Raw copperlite", stack: 64, icon: "#c47a4a", kind: "material" });
item({ id: I.RAW_FERRITE, name: "Raw ferrite", stack: 64, icon: "#8a8e92", kind: "material" });
item({ id: I.RAW_AURIC, name: "Raw auric", stack: 64, icon: "#d4b45a", kind: "material" });
item({ id: I.RAW_PRISMITE, name: "Raw prismite", stack: 64, icon: "#7ec4d4", kind: "material" });
item({ id: I.COPPER_INGOT, name: "Copperlite ingot", stack: 64, icon: "#d48a52", kind: "material" });
item({ id: I.FERRITE_INGOT, name: "Ferrite ingot", stack: 64, icon: "#b0b4b8", kind: "material" });
item({ id: I.AURIC_INGOT, name: "Auric ingot", stack: 64, icon: "#e8c86a", kind: "material" });
item({ id: I.PRISMITE_GEM, name: "Prismite gem", stack: 64, icon: "#a8e8f0", kind: "material" });
item({ id: I.STICK, name: "Stick", stack: 64, icon: "#8a6238", kind: "material" });
item({ id: I.WHEAT, name: "Wheat", stack: 64, icon: "#d4c06a", kind: "material" });
item({ id: I.SEEDS, name: "Seeds", stack: 64, icon: "#8a9a5a", kind: "seed", place: B.CROP });
item({ id: I.BERRY, name: "Sunberry", stack: 16, icon: "#c45a4a", kind: "food", food: 2 });
item({ id: I.BREAD, name: "Loaf", stack: 16, icon: "#c4a06a", kind: "food", food: 5 });
item({ id: I.RAW_HAUNCH, name: "Raw haunch", stack: 16, icon: "#c47a6a", kind: "food", food: 2 });
item({ id: I.COOKED_HAUNCH, name: "Seared haunch", stack: 16, icon: "#8a4a32", kind: "food", food: 8 });
item({ id: I.STEW, name: "Sage stew", stack: 8, icon: "#6a8a4a", kind: "food", food: 12 });
item({ id: I.HIDE, name: "Hide", stack: 64, icon: "#8a6a4a", kind: "material" });
item({ id: I.STRING, name: "Twine", stack: 64, icon: "#d4c8b0", kind: "material" });
item({ id: I.ARROW, name: "Bolt", stack: 64, icon: "#8a8680", kind: "material" });
item({
  id: I.BOW,
  name: "Amber bow",
  stack: 1,
  icon: "#8a6238",
  kind: "weapon",
  tool: "bow",
  damage: 6,
  durability: 180,
});

function tool(
  id: number,
  name: string,
  tool: ItemDef["tool"],
  power: number,
  damage: number,
  dur: number,
  icon: string,
) {
  item({
    id,
    name,
    stack: 1,
    tool,
    power,
    damage,
    durability: dur,
    icon,
    kind: tool === "sword" || tool === "bow" ? "weapon" : "tool",
  });
}

tool(I.WOOD_PICK, "Amber pick", "pick", 2, 2, 80, "#b07a42");
tool(I.WOOD_AXE, "Amber hatchet", "axe", 2, 3, 80, "#b07a42");
tool(I.WOOD_SHOVEL, "Amber spade", "shovel", 2, 1, 80, "#b07a42");
tool(I.WOOD_HOE, "Amber hoe", "hoe", 1, 1, 80, "#b07a42");
tool(I.WOOD_SWORD, "Amber blade", "sword", 1, 4, 80, "#b07a42");
tool(I.STONE_PICK, "Rubble pick", "pick", 4, 3, 180, "#6a6660");
tool(I.STONE_AXE, "Rubble hatchet", "axe", 4, 4, 180, "#6a6660");
tool(I.STONE_SHOVEL, "Rubble spade", "shovel", 4, 2, 180, "#6a6660");
tool(I.STONE_HOE, "Rubble hoe", "hoe", 2, 1, 180, "#6a6660");
tool(I.STONE_SWORD, "Rubble blade", "sword", 1, 5, 180, "#6a6660");
tool(I.FERRITE_PICK, "Ferrite pick", "pick", 6, 4, 400, "#b0b4b8");
tool(I.FERRITE_AXE, "Ferrite hatchet", "axe", 6, 5, 400, "#b0b4b8");
tool(I.FERRITE_SHOVEL, "Ferrite spade", "shovel", 6, 3, 400, "#b0b4b8");
tool(I.FERRITE_HOE, "Ferrite hoe", "hoe", 3, 1, 400, "#b0b4b8");
tool(I.FERRITE_SWORD, "Ferrite blade", "sword", 1, 7, 400, "#b0b4b8");
tool(I.AURIC_PICK, "Auric pick", "pick", 8, 5, 800, "#e8c86a");
tool(I.AURIC_AXE, "Auric hatchet", "axe", 8, 6, 800, "#e8c86a");
tool(I.AURIC_SHOVEL, "Auric spade", "shovel", 8, 4, 800, "#e8c86a");
tool(I.AURIC_SWORD, "Auric blade", "sword", 1, 9, 800, "#e8c86a");
tool(I.PRISMITE_PICK, "Prismite pick", "pick", 10, 6, 1600, "#a8e8f0");
tool(I.PRISMITE_AXE, "Prismite hatchet", "axe", 10, 7, 1600, "#a8e8f0");
tool(I.PRISMITE_SWORD, "Prismite edge", "sword", 1, 12, 1600, "#a8e8f0");

function armor(id: number, name: string, slot: ItemDef["slot"], armor: number, icon: string) {
  item({ id, name, stack: 1, slot, armor, durability: 200 + armor * 40, icon, kind: "armor" });
}

armor(I.HIDE_HELM, "Hide cap", "head", 1, "#8a6a4a");
armor(I.HIDE_VEST, "Hide vest", "chest", 2, "#8a6a4a");
armor(I.HIDE_LEGS, "Hide wraps", "legs", 1, "#8a6a4a");
armor(I.HIDE_BOOTS, "Hide boots", "feet", 1, "#8a6a4a");
armor(I.FERRITE_HELM, "Ferrite helm", "head", 2, "#b0b4b8");
armor(I.FERRITE_CHEST, "Ferrite plate", "chest", 5, "#b0b4b8");
armor(I.FERRITE_LEGS, "Ferrite greaves", "legs", 3, "#b0b4b8");
armor(I.FERRITE_BOOTS, "Ferrite sabatons", "feet", 2, "#b0b4b8");
armor(I.AURIC_HELM, "Auric helm", "head", 3, "#e8c86a");
armor(I.AURIC_CHEST, "Auric plate", "chest", 6, "#e8c86a");
armor(I.PRISMITE_CHEST, "Prismite mail", "chest", 8, "#a8e8f0");

item({ id: I.COLOSSUS_CORE, name: "Hollow core", stack: 8, icon: "#c8c4bc", kind: "material" });
item({ id: I.TIDE_SCALE, name: "Tide scale", stack: 16, icon: "#3a8a92", kind: "material" });
item({ id: I.BUCKET, name: "Copper bucket", stack: 16, icon: "#c47a4a", kind: "tool" });
item({
  id: I.WATER_BUCKET,
  name: "Tide bucket",
  stack: 1,
  icon: "#2a6a72",
  kind: "tool",
  place: B.WATER,
});

export function getItem(id: number): ItemDef | undefined {
  return ITEMS[id];
}

export function itemName(id: number): string {
  return ITEMS[id]?.name ?? `Unknown (${id})`;
}

export interface Slot {
  id: number;
  n: number;
  dur?: number;
}

export function emptySlot(): Slot {
  return { id: 0, n: 0 };
}

export function cloneSlot(s: Slot): Slot {
  return { id: s.id, n: s.n, dur: s.dur };
}

export function canStack(a: Slot, b: Slot): boolean {
  if (!a.id || a.id !== b.id) return false;
  const def = ITEMS[a.id];
  if (!def || def.stack <= 1) return false;
  return a.n + b.n <= def.stack && a.dur === undefined && b.dur === undefined;
}
