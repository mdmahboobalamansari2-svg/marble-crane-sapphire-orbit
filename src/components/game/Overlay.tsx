import { useEffect, useMemo, useState, type MutableRefObject, type ReactNode } from "react";
import {
  Compass,
  Map as MapIcon,
  Pause,
  Settings,
  Sun,
} from "lucide-react";
import { useGameUI } from "@/game/store";
import { applyPreset, listSlots, saveGfx, type SaveData } from "@/game/save";
import { seedFromString } from "@/game/rng";
import { getItem, type Slot } from "@/game/items";
import { matchRecipe, consumeRecipe, RECIPES } from "@/game/crafting";
import { BIOME_MAP_COLOR } from "@/game/blocks";
import type { Game } from "@/game/Game";

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        "rounded-xl border border-border bg-surface/92 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.45)] " + className
      }
    >
      {children}
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "secondary",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "bg-fg text-bg hover:opacity-90"
      : "bg-elevated text-fg border border-border hover:bg-surface";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 w-full rounded-md px-4 py-2.5 text-sm font-medium transition-opacity duration-150 disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/40";

export function Overlay({
  gameRef,
  screen,
}: {
  gameRef: MutableRefObject<Game | null>;
  screen: string;
}) {
  const overlay = useGameUI((s) => s.overlay);
  const hud = useGameUI((s) => s.hud);
  const clickPrompt = useGameUI((s) => s.clickPrompt);

  return (
    <div className="pointer-events-none absolute inset-0">
      {screen === "menu" && <MainMenu />}
      {screen === "new" && <NewWorld />}
      {screen === "load" && <LoadWorld />}
      {screen === "lan" && <LanMenu />}
      {screen === "settings" && <SettingsMenu gameRef={gameRef} />}
      {screen === "controls" && <ControlsMenu />}
      {(screen === "loading" || screen === "playing") && clickPrompt && screen !== "menu" && (
        <ClickPrompt gameRef={gameRef} />
      )}
      {screen === "playing" && overlay === "none" && !clickPrompt && <HUD />}
      {overlay === "inv" && <Inventory game={gameRef.current} />}
      {overlay === "crate" && <Inventory game={gameRef.current} crate />}
      {overlay === "map" && <WorldMap />}
      {overlay === "pause" && <PauseMenu gameRef={gameRef} />}
      {hud.message && screen === "playing" && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 rounded-md bg-bg/80 px-3 py-1.5 text-sm text-fg">
          {hud.message}
        </div>
      )}
      <TouchPad />
    </div>
  );
}

function MainMenu() {
  return (
    <div className="pointer-events-auto flex h-full w-full flex-col justify-between bg-bg px-8 py-10 md:px-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Eternal day</p>
        <h1 className="font-display mt-3 text-5xl font-medium tracking-tight md:text-7xl">Everlight</h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          A sunlit voxel wilderness. Explore forests, dunes and deep stone. Gather, craft, build, and survive —
          the sun never sets.
        </p>
      </div>
      <div className="grid max-w-sm gap-2">
        <Btn variant="primary" onClick={() => useGameUI.getState().setScreen("new")}>
          New world
        </Btn>
        <Btn onClick={() => useGameUI.getState().setScreen("load")}>Load world</Btn>
        <Btn onClick={() => useGameUI.getState().setScreen("lan")}>Join a friend</Btn>
        <Btn onClick={() => useGameUI.getState().setScreen("settings")}>Settings</Btn>
        <Btn onClick={() => useGameUI.getState().setScreen("controls")}>Controls</Btn>
      </div>
    </div>
  );
}

function NewWorld() {
  const name = useGameUI((s) => s.worldName);
  const seed = useGameUI((s) => s.seedInput);
  const slot = useGameUI((s) => s.slot);
  return (
    <div className="pointer-events-auto flex h-full items-center justify-center px-4">
      <Panel className="w-full max-w-md">
        <h2 className="font-display text-2xl tracking-tight">New wilderness</h2>
        <p className="mt-1 text-sm text-muted">Every seed is a different continent.</p>
        <div className="mt-5 grid gap-4">
          <Field label="World name">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => useGameUI.setState({ worldName: e.target.value })}
            />
          </Field>
          <Field label="Seed (optional)">
            <input
              className={inputCls}
              value={seed}
              placeholder="Leave blank for a surprise"
              onChange={(e) => useGameUI.setState({ seedInput: e.target.value })}
            />
          </Field>
          <Field label="Save slot">
            <select
              className={inputCls}
              value={slot}
              onChange={(e) => useGameUI.setState({ slot: Number(e.target.value) })}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <option key={i} value={i}>
                  Slot {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <Btn
            variant="primary"
            onClick={() => {
              const s = seed.trim() ? seedFromString(seed.trim()) : (Math.random() * 0xffffffff) >>> 0;
              useGameUI.getState().startSession({
                seed: s,
                name: name || "Wilderness",
                slot,
                save: null,
              });
            }}
          >
            Enter the wild
          </Btn>
          <Btn onClick={() => useGameUI.getState().setScreen("menu")}>Back</Btn>
        </div>
      </Panel>
    </div>
  );
}

function LoadWorld() {
  const [slots, setSlots] = useState<{ slot: number; data: SaveData | null }[]>([]);
  useEffect(() => {
    void listSlots().then(setSlots);
  }, []);
  return (
    <div className="pointer-events-auto flex h-full items-center justify-center px-4">
      <Panel className="w-full max-w-md">
        <h2 className="font-display text-2xl tracking-tight">Load world</h2>
        <div className="mt-4 grid gap-2">
          {slots.map(({ slot, data }) => (
            <button
              key={slot}
              type="button"
              disabled={!data}
              onClick={() => {
                if (!data) return;
                useGameUI.getState().startSession({
                  seed: data.seed,
                  name: data.name,
                  slot,
                  save: data,
                });
              }}
              className="rounded-md border border-border bg-elevated px-4 py-3 text-left disabled:opacity-40"
            >
              <div className="text-sm font-medium">{data?.name ?? `Empty slot ${slot + 1}`}</div>
              {data && (
                <div className="text-xs text-muted">
                  Seed {data.seed} · {new Date(data.updatedAt).toLocaleString()}
                </div>
              )}
            </button>
          ))}
          <Btn onClick={() => useGameUI.getState().setScreen("menu")}>Back</Btn>
        </div>
      </Panel>
    </div>
  );
}

function LanMenu() {
  const code = useGameUI((s) => s.lanCode);
  const name = useGameUI((s) => s.lanName);
  const seed = useGameUI((s) => s.seedInput);
  return (
    <div className="pointer-events-auto flex h-full items-center justify-center px-4">
      <Panel className="w-full max-w-md">
        <h2 className="font-display text-2xl tracking-tight">Play together</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Two browsers on the same network (or anywhere with STUN) share a world through a direct peer
          connection. Host creates a room code; a friend joins it. World edits and movement stay in sync.
        </p>
        <div className="mt-5 grid gap-4">
          <Field label="Your name">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => useGameUI.setState({ lanName: e.target.value })}
            />
          </Field>
          <Field label="Room code">
            <input
              className={inputCls}
              value={code}
              placeholder="e.g. SUNLIT"
              onChange={(e) => useGameUI.setState({ lanCode: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Host seed (host only)">
            <input
              className={inputCls}
              value={seed}
              onChange={(e) => useGameUI.setState({ seedInput: e.target.value })}
            />
          </Field>
          <Btn
            variant="primary"
            onClick={() => {
              const c = (code || Math.random().toString(36).slice(2, 8)).replace(/[^a-zA-Z0-9_]/g, "");
              const s = seed.trim() ? seedFromString(seed.trim()) : (Math.random() * 0xffffffff) >>> 0;
              useGameUI.setState({ lanCode: c });
              useGameUI.getState().startSession({
                seed: s,
                name: "Shared wild",
                slot: 0,
                save: null,
                lan: { code: c, host: true, playerName: name || "Wanderer" },
              });
            }}
          >
            Host world
          </Btn>
          <Btn
            onClick={() => {
              const c = code.replace(/[^a-zA-Z0-9_]/g, "");
              if (!c) return;
              const s = seed.trim() ? seedFromString(seed.trim()) : 1;
              useGameUI.getState().startSession({
                seed: s,
                name: "Shared wild",
                slot: 0,
                save: null,
                lan: { code: c, host: false, playerName: name || "Wanderer" },
              });
            }}
          >
            Join room
          </Btn>
          <p className="text-xs text-subtle">
            Guests should enter the same seed the host used so terrain matches before edits arrive.
          </p>
          <Btn onClick={() => useGameUI.getState().setScreen("menu")}>Back</Btn>
        </div>
      </Panel>
    </div>
  );
}

function SettingsMenu({ gameRef }: { gameRef: MutableRefObject<Game | null> }) {
  const gfx = useGameUI((s) => s.gfx);
  const apply = (partial: Partial<typeof gfx>) => {
    const next = { ...gfx, ...partial };
    useGameUI.getState().setGfx(next);
    saveGfx(next);
    gameRef.current?.applyGfx(next);
  };
  return (
    <div className="pointer-events-auto flex h-full items-center justify-center overflow-auto px-4 py-8">
      <Panel className="w-full max-w-lg">
        <h2 className="font-display flex items-center gap-2 text-2xl tracking-tight">
          <Settings className="size-5" /> Settings
        </h2>
        <div className="mt-5 grid gap-4">
          <Field label="Preset">
            <div className="grid grid-cols-4 gap-2">
              {(["low", "medium", "high", "ultra"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => apply(applyPreset(p))}
                  className={`h-11 rounded-md text-xs font-medium capitalize ${gfx.preset === p ? "bg-fg text-bg" : "bg-elevated border border-border"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label={`Render distance (${gfx.renderDist})`}>
            <input
              type="range"
              min={3}
              max={12}
              value={gfx.renderDist}
              onChange={(e) => apply({ renderDist: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label={`FOV (${gfx.fov})`}>
            <input
              type="range"
              min={60}
              max={100}
              value={gfx.fov}
              onChange={(e) => apply({ fov: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label={`Look sensitivity`}>
            <input
              type="range"
              min={8}
              max={40}
              value={Math.round(gfx.sensitivity * 10000)}
              onChange={(e) => apply({ sensitivity: Number(e.target.value) / 10000 })}
              className="w-full"
            />
          </Field>
          <Field label="Resolution scale">
            <input
              type="range"
              min={50}
              max={150}
              value={Math.round(gfx.dpr * 100)}
              onChange={(e) => apply({ dpr: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gfx.particles} onChange={(e) => apply({ particles: e.target.checked })} />
            Particles & weather
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gfx.shake} onChange={(e) => apply({ shake: e.target.checked })} />
            Screen shake
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gfx.invertY} onChange={(e) => apply({ invertY: e.target.checked })} />
            Invert look Y
          </label>
          <p className="text-xs text-subtle">
            Hardware ray tracing, DLSS, FSR and XeSS are not available in the browser. Resolution scale is the
            supported alternative.
          </p>
          <Btn onClick={() => useGameUI.getState().setScreen(gameRef.current ? "playing" : "menu")}>Back</Btn>
        </div>
      </Panel>
    </div>
  );
}

function ControlsMenu() {
  const rows = [
    ["WASD / arrows", "Move"],
    ["Mouse / drag", "Look"],
    ["Shift", "Sprint"],
    ["Space", "Jump / swim up"],
    ["Ctrl", "Crouch"],
    ["Left click", "Mine / attack"],
    ["Right click", "Place / interact"],
    ["1–9 / wheel", "Hotbar"],
    ["E", "Inventory"],
    ["M", "Map"],
    ["V", "Third person"],
    ["R", "Block"],
    ["F", "Dodge"],
    ["Q", "Drop one"],
    ["Esc", "Pause"],
    ["F3", "Surveyor"],
  ];
  return (
    <div className="pointer-events-auto flex h-full items-center justify-center px-4">
      <Panel className="w-full max-w-md">
        <h2 className="font-display text-2xl tracking-tight">Controls</h2>
        <ul className="mt-4 grid gap-1.5 text-sm">
          {rows.map(([k, v]) => (
            <li key={k} className="flex justify-between gap-4 border-b border-border/60 py-1.5">
              <span className="font-mono text-xs text-accent">{k}</span>
              <span className="text-muted">{v}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Btn onClick={() => useGameUI.getState().setScreen("menu")}>Back</Btn>
        </div>
      </Panel>
    </div>
  );
}

function ClickPrompt({ gameRef }: { gameRef: MutableRefObject<Game | null> }) {
  const screen = useGameUI((s) => s.screen);
  const hud = useGameUI((s) => s.hud);
  return (
    <button
      type="button"
      className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-bg/35"
      onClick={() => {
        gameRef.current?.clickToPlay();
        useGameUI.setState({ clickPrompt: false, screen: "playing" });
      }}
    >
      <p className="font-display text-3xl tracking-tight">
        {screen === "loading" && hud.fps === 0 ? "Raising the land…" : "Click to enter"}
      </p>
      <p className="mt-2 text-sm text-muted">Pointer lock captures the mouse. Esc releases it.</p>
    </button>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 w-36 overflow-hidden rounded-full bg-elevated">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

function HUD() {
  const hud = useGameUI((s) => s.hud);
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-fg/80" />
        <div className="absolute top-1/2 left-0 h-px w-4 -translate-y-1/2 bg-fg/80" />
      </div>
      <div className="absolute left-4 top-4 max-w-xs">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sun className="size-3.5" />
          {hud.timeLabel} · {hud.weather}
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <Compass className="size-3.5 text-accent" />
          {hud.biome}
        </div>
        {hud.debug && (
          <pre className="mt-2 font-mono text-[11px] text-muted">
            {hud.fps} fps{"\n"}
            {hud.x.toFixed(1)} {hud.y.toFixed(1)} {hud.z.toFixed(1)}
            {"\n"}lv {hud.level}
          </pre>
        )}
      </div>
      <div className="absolute right-4 top-4 text-right text-xs text-muted">
        {hud.peers.length > 0 &&
          hud.peers.map((p) => (
            <div key={p.id}>
              {p.name} · {p.state}
              {p.rtt != null ? ` · ${p.rtt}ms` : ""}
            </div>
          ))}
      </div>
      <div className="absolute bottom-24 left-4 grid gap-1.5">
        <Bar value={hud.health} max={20} color="var(--color-health)" />
        <Bar value={hud.hunger} max={20} color="var(--color-hunger)" />
        <Bar value={hud.stamina} max={100} color="var(--color-stamina)" />
        <Bar value={hud.xp % 40} max={40} color="var(--color-xp)" />
      </div>
      {hud.mine > 0 && (
        <div className="absolute left-1/2 top-[58%] h-1 w-32 -translate-x-1/2 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-fg" style={{ width: `${hud.mine * 100}%` }} />
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1">
        {Array.from({ length: 9 }, (_, i) => {
          const s = hud.inv[i];
          return <HotCell key={i} slot={s} active={i === hud.hotbar} index={i} />;
        })}
      </div>
    </div>
  );
}

function HotCell({ slot, active, index }: { slot?: Slot; active: boolean; index: number }) {
  const def = slot?.id ? getItem(slot.id) : undefined;
  return (
    <div
      className={`flex size-11 flex-col items-center justify-center rounded-sm border ${active ? "border-fg bg-elevated" : "border-border bg-bg/70"}`}
    >
      {def && (
        <>
          <span className="size-4 rounded-sm" style={{ background: def.icon }} />
          {slot && slot.n > 1 && <span className="text-[9px] tabular-nums text-muted">{slot.n}</span>}
        </>
      )}
      <span className="sr-only">{index + 1}</span>
    </div>
  );
}

function SlotCell({
  slot,
  onClick,
}: {
  slot: Slot;
  onClick: () => void;
}) {
  const def = slot.id ? getItem(slot.id) : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-11 flex-col items-center justify-center rounded-sm border border-border bg-elevated"
      title={def ? `${def.name}${slot.dur ? ` (${slot.dur})` : ""}` : ""}
    >
      {def && <span className="size-4 rounded-sm" style={{ background: def.icon }} />}
      {slot.n > 1 && <span className="text-[9px] tabular-nums">{slot.n}</span>}
    </button>
  );
}

function Inventory({ game, crate }: { game: Game | null; crate?: boolean }) {
  const hud = useGameUI((s) => s.hud);
  const crateItems = useGameUI((s) => s.crateItems);
  const [held, setHeld] = useState<Slot | null>(null);
  const [craft, setCraft] = useState<Slot[]>(() => Array.from({ length: 9 }, () => ({ id: 0, n: 0 })));
  if (!game) return null;
  const player = game.player;

  const clickSlot = (arr: Slot[], i: number) => {
    const s = arr[i]!;
    if (held && held.id) {
      if (!s.id) {
        arr[i] = held;
        setHeld(null);
      } else if (s.id === held.id) {
        const cap = getItem(s.id)?.stack ?? 64;
        const add = Math.min(cap - s.n, held.n);
        s.n += add;
        held.n -= add;
        if (held.n <= 0) setHeld(null);
      } else {
        arr[i] = held;
        setHeld(s);
      }
    } else if (s.id) {
      setHeld({ ...s });
      arr[i] = { id: 0, n: 0 };
    }
    useGameUI.getState().setHud({ inv: player.inv.slice(), armor: player.armor.slice() });
  };

  const recipe = matchRecipe(craft, crate ? "bench" : "hand") ?? matchRecipe(craft, "bench");
  const takeOut = () => {
    if (!recipe) return;
    const leftover = player.give(recipe.out.id, recipe.out.n, recipe.out.dur);
    if (leftover === recipe.out.n) return;
    consumeRecipe(craft, recipe);
    setCraft(craft.map((s) => ({ ...s })));
  };

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/55 p-4">
      <Panel className="max-h-[92vh] w-full max-w-2xl overflow-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">{crate ? "Crate" : "Pack"}</h2>
            <p className="text-xs text-muted">Click to pick up and place. Crafting on the right.</p>
          </div>
          <Btn onClick={() => useGameUI.getState().setOverlay("none")}>Close</Btn>
        </div>
        {crate && (
          <div className="mt-4 grid grid-cols-9 gap-1">
            {crateItems.map((s, i) => (
              <SlotCell key={i} slot={s} onClick={() => clickSlot(crateItems, i)} />
            ))}
          </div>
        )}
        <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2 text-xs text-muted">Backpack</p>
            <div className="grid grid-cols-9 gap-1">
              {player.inv.map((s, i) => (
                <SlotCell key={i} slot={s} onClick={() => clickSlot(player.inv, i)} />
              ))}
            </div>
            <p className="mb-2 mt-4 text-xs text-muted">Armor</p>
            <div className="flex gap-1">
              {player.armor.map((s, i) => (
                <SlotCell key={i} slot={s} onClick={() => clickSlot(player.armor, i)} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted">Workbench</p>
            <div className="grid grid-cols-3 gap-1">
              {craft.map((s, i) => (
                <SlotCell key={i} slot={s} onClick={() => clickSlot(craft, i)} />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Result</p>
            <button
              type="button"
              onClick={takeOut}
              className="mt-1 flex size-11 items-center justify-center rounded-sm border border-border bg-elevated"
            >
              {recipe && <span className="size-4 rounded-sm" style={{ background: getItem(recipe.out.id)?.icon }} />}
            </button>
            {held && (
              <p className="mt-3 text-xs text-muted">
                Holding {getItem(held.id)?.name} ×{held.n}
              </p>
            )}
            <p className="mt-3 max-w-[12rem] text-[11px] leading-snug text-subtle">
              {RECIPES.length} recipes. Forge smelts ores. Hand-craft sticks and planks anywhere.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Btn
            onClick={() => {
              game.player.eat();
              useGameUI.getState().setHud({ hunger: game.player.hunger, inv: game.player.inv.slice() });
            }}
          >
            Eat selected
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

function WorldMap() {
  const hud = useGameUI((s) => s.hud);
  const tiles = useMemo(() => {
    const g = (window as unknown as { __everlight?: Game; __game?: Game }).__game;
    const disc = g?.world.discovered;
    if (!disc) return [] as { k: string; c: string; cx: number; cz: number }[];
    const out: { k: string; c: string; cx: number; cz: number }[] = [];
    for (const [k, bio] of disc) {
      const [cx, cz] = k.split(",").map(Number);
      out.push({ k, c: BIOME_MAP_COLOR[bio] ?? "#888", cx: cx ?? 0, cz: cz ?? 0 });
    }
    return out;
  }, [hud.x, hud.z]);
  const pcx = Math.floor(hud.x / 16);
  const pcz = Math.floor(hud.z / 16);
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/55 p-4">
      <Panel className="w-full max-w-lg">
        <h2 className="font-display flex items-center gap-2 text-xl">
          <MapIcon className="size-4" /> Survey
        </h2>
        <div className="relative mx-auto mt-4 aspect-square w-full max-w-md overflow-hidden rounded-md bg-bg">
          {tiles.map((t) => (
            <div
              key={t.k}
              className="absolute size-2"
              style={{
                left: `calc(50% + ${(t.cx - pcx) * 8}px)`,
                top: `calc(50% + ${(t.cz - pcz) * 8}px)`,
                background: t.c,
              }}
            />
          ))}
          <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 bg-fg" />
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          {hud.biome} · {hud.x.toFixed(0)}, {hud.z.toFixed(0)}
        </p>
        <div className="mt-4">
          <Btn onClick={() => useGameUI.getState().setOverlay("none")}>Close</Btn>
        </div>
      </Panel>
    </div>
  );
}

function PauseMenu({ gameRef }: { gameRef: MutableRefObject<Game | null> }) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/60 p-4">
      <Panel className="w-full max-w-sm">
        <h2 className="font-display flex items-center gap-2 text-2xl">
          <Pause className="size-5" /> Paused
        </h2>
        <div className="mt-5 grid gap-2">
          <Btn
            variant="primary"
            onClick={() => {
              useGameUI.getState().setOverlay("none");
              void gameRef.current?.input.requestLock();
            }}
          >
            Resume
          </Btn>
          <Btn
            onClick={() => {
              void gameRef.current?.save();
            }}
          >
            Save world
          </Btn>
          <Btn
            onClick={() => {
              useGameUI.getState().setOverlay("none");
              useGameUI.getState().setScreen("settings");
            }}
          >
            Settings
          </Btn>
          <Btn
            onClick={() => {
              void gameRef.current?.save();
              gameRef.current?.dispose();
              useGameUI.setState({ session: null, overlay: "none" });
              useGameUI.getState().setScreen("menu");
            }}
          >
            Save and quit
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

function TouchPad() {
  const screen = useGameUI((s) => s.screen);
  const overlay = useGameUI((s) => s.overlay);
  if (screen !== "playing" || overlay !== "none") return null;
  return (
    <div className="pointer-events-auto absolute bottom-20 left-0 right-0 flex justify-between px-4 md:hidden">
      <div className="size-28 rounded-full border border-border bg-bg/40" aria-hidden />
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="min-h-11 rounded-md bg-elevated px-4 text-sm"
          onClick={() => useGameUI.getState().setOverlay("inv")}
        >
          Pack
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md bg-elevated px-4 text-sm"
          onClick={() => useGameUI.getState().setOverlay("map")}
        >
          Map
        </button>
      </div>
    </div>
  );
}
