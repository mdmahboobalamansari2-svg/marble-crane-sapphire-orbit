export class Input {
  readonly keys = new Set<string>();
  private forced: string[] | null = null;
  mouseDX = 0;
  mouseDY = 0;
  lookX = 0;
  lookY = 0;
  mining = false;
  placing = false;
  attacking = false;
  pointerLocked = false;
  dragLook = false;
  dragging = false;
  private lastX = 0;
  private lastY = 0;
  wheel = 0;
  touchLeft = { x: 0, y: 0, active: false };
  touchLook = { dx: 0, dy: 0 };
  private el: HTMLElement | null = null;

  attach(el: HTMLElement) {
    this.el = el;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVis);
    el.addEventListener("mousedown", this.onDown);
    window.addEventListener("mouseup", this.onUp);
    window.addEventListener("mousemove", this.onMove);
    el.addEventListener("contextmenu", this.onCtx);
    el.addEventListener("wheel", this.onWheel, { passive: false });
    document.addEventListener("pointerlockchange", this.onLock);
    document.addEventListener("pointerlockerror", this.onLockErr);
    el.addEventListener("touchstart", this.onTouchStart, { passive: false });
    el.addEventListener("touchmove", this.onTouchMove, { passive: false });
    el.addEventListener("touchend", this.onTouchEnd);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVis);
    this.el?.removeEventListener("mousedown", this.onDown);
    window.removeEventListener("mouseup", this.onUp);
    window.removeEventListener("mousemove", this.onMove);
    this.el?.removeEventListener("contextmenu", this.onCtx);
    this.el?.removeEventListener("wheel", this.onWheel);
    document.removeEventListener("pointerlockchange", this.onLock);
    document.removeEventListener("pointerlockerror", this.onLockErr);
    this.el?.removeEventListener("touchstart", this.onTouchStart);
    this.el?.removeEventListener("touchmove", this.onTouchMove);
    this.el?.removeEventListener("touchend", this.onTouchEnd);
  }

  setForcedKeys(codes: string[]) {
    this.forced = codes.length ? codes : null;
  }

  has(code: string): boolean {
    if (this.forced) return this.forced.includes(code);
    return this.keys.has(code);
  }

  consumeLook(): { dx: number; dy: number } {
    const dx = this.mouseDX + this.lookX + this.touchLook.dx;
    const dy = this.mouseDY + this.lookY + this.touchLook.dy;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.touchLook.dx = 0;
    this.touchLook.dy = 0;
    return { dx, dy };
  }

  consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  async requestLock() {
    if (!this.el) return;
    try {
      const p = this.el.requestPointerLock({ unadjustedMovement: true } as PointerLockOptions);
      if (p) await p;
    } catch {
      try {
        this.el.requestPointerLock();
      } catch {
        this.dragLook = true;
      }
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === "Tab") e.preventDefault();
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => {
    this.keys.clear();
    this.mining = false;
    this.placing = false;
  };
  private onVis = () => {
    if (document.hidden) this.keys.clear();
  };
  private onDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mining = true;
      this.attacking = true;
      if (this.dragLook && !this.pointerLocked) {
        this.dragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    }
    if (e.button === 2) this.placing = true;
  };
  private onUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mining = false;
      this.attacking = false;
      this.dragging = false;
    }
    if (e.button === 2) this.placing = false;
  };
  private onMove = (e: MouseEvent) => {
    if (this.pointerLocked) {
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    } else if (this.dragging) {
      this.mouseDX += e.clientX - this.lastX;
      this.mouseDY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  };
  private onCtx = (e: Event) => e.preventDefault();
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.wheel += Math.sign(e.deltaY);
  };
  private onLock = () => {
    this.pointerLocked = document.pointerLockElement === this.el;
  };
  private onLockErr = () => {
    this.dragLook = true;
  };

  private leftId: number | null = null;
  private rightId: number | null = null;
  private rightLastX = 0;
  private rightLastY = 0;

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < window.innerWidth * 0.45 && this.leftId === null) {
        this.leftId = t.identifier;
        this.touchLeft.active = true;
        this.touchLeft.x = 0;
        this.touchLeft.y = 0;
        (this as unknown as { _lx: number; _ly: number })._lx = t.clientX;
        (this as unknown as { _ly: number })._ly = t.clientY;
      } else if (this.rightId === null) {
        this.rightId = t.identifier;
        this.rightLastX = t.clientX;
        this.rightLastY = t.clientY;
        this.mining = true;
      }
    }
  };
  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.touches)) {
      if (t.identifier === this.leftId) {
        const self = this as unknown as { _lx: number; _ly: number };
        const dx = (t.clientX - self._lx) / 50;
        const dy = (t.clientY - self._ly) / 50;
        const mag = Math.hypot(dx, dy) || 1;
        const m = Math.min(1, mag);
        this.touchLeft.x = (dx / mag) * m;
        this.touchLeft.y = (dy / mag) * m;
      } else if (t.identifier === this.rightId) {
        this.touchLook.dx += t.clientX - this.rightLastX;
        this.touchLook.dy += t.clientY - this.rightLastY;
        this.rightLastX = t.clientX;
        this.rightLastY = t.clientY;
      }
    }
  };
  private onTouchEnd = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.leftId) {
        this.leftId = null;
        this.touchLeft.active = false;
        this.touchLeft.x = 0;
        this.touchLeft.y = 0;
      }
      if (t.identifier === this.rightId) {
        this.rightId = null;
        this.mining = false;
      }
    }
  };
}
