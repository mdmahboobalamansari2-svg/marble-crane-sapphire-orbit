import { useEffect, useRef, useState } from "react";
import { useGameUI } from "@/game/store";
import { loadGfx } from "@/game/save";
import { Overlay } from "./Overlay";
import type { Game } from "@/game/Game";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const session = useGameUI((s) => s.session);
  const screen = useGameUI((s) => s.screen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    useGameUI.getState().setGfx(loadGfx());
  }, []);

  useEffect(() => {
    if (!session || !canvasRef.current) return;
    let cancelled = false;
    let game: Game | null = null;
    void import("@/game/Game").then(({ Game: GameCtor }) => {
      if (cancelled || !canvasRef.current) return;
      game = new GameCtor(canvasRef.current, {
        seed: session.seed,
        name: session.name,
        slot: session.slot,
        save: session.save,
        lan: session.lan,
      });
      gameRef.current = game;
      game.start();
    });
    return () => {
      cancelled = true;
      game?.dispose();
      gameRef.current = null;
    };
  }, [session]);

  const showCanvas = Boolean(session);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-fg">
        <p className="font-display text-2xl tracking-tight">Everlight</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ display: showCanvas ? "block" : "none" }}
      />
      <Overlay gameRef={gameRef} screen={screen} />
    </div>
  );
}
