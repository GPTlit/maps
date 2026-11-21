/**
 * touch-controls.js — Low-opacity virtual joystick (left hand) + camera drag (right hand).
 * Touch: left 45% of the screen = floating joystick, right side = camera look. Both work at once.
 * Mouse: drag the faint joystick ring; mouse look stays on the canvas (pointer lock / drag).
 */
const RADIUS = 56;
const SKIP = "button, .hud-dock, .minimap-panel, a, input, select";

export class TouchControls {
  constructor({ onMove, onLook }) {
    this.onMove = onMove;
    this.onLook = onLook;
    this.moveId = null;
    this.lookId = null;
    this.origin = { x: 0, y: 0 };
    this.last = { x: 0, y: 0 };

    this.base = document.createElement("div");
    this.base.className = "joy-base";
    this.knob = document.createElement("div");
    this.knob.className = "joy-knob";
    this.base.appendChild(this.knob);
    document.body.appendChild(this.base);

    window.addEventListener("pointerdown", (e) => this._down(e), { passive: false });
    window.addEventListener("pointermove", (e) => this._move(e), { passive: false });
    window.addEventListener("pointerup", (e) => this._up(e));
    window.addEventListener("pointercancel", (e) => this._up(e));
  }

  _place(x, y) {
    this.base.style.left = `${x - RADIUS}px`;
    this.base.style.top = `${y - RADIUS}px`;
  }

  _down(e) {
    const isMouse = e.pointerType === "mouse";
    if (isMouse && e.target !== this.base && e.target !== this.knob) return;
    if (!isMouse && e.target.closest && e.target.closest(SKIP)) return;
    const leftSide = e.clientX < window.innerWidth * 0.45;

    if ((leftSide || isMouse) && this.moveId === null) {
      this.moveId = e.pointerId;
      this.origin = isMouse
        ? { x: this.base.offsetLeft + RADIUS, y: this.base.offsetTop + RADIUS }
        : { x: e.clientX, y: e.clientY };
      if (!isMouse) this._place(this.origin.x, this.origin.y);
      this.base.classList.add("is-active");
      e.preventDefault();
      this._move(e);
    } else if (!leftSide && this.lookId === null && !isMouse) {
      this.lookId = e.pointerId;
      this.last = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }

  _move(e) {
    if (e.pointerId === this.moveId) {
      let dx = e.clientX - this.origin.x;
      let dy = e.clientY - this.origin.y;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx = (dx / len) * RADIUS;
        dy = (dy / len) * RADIUS;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = 0.12;
      let nx = dx / RADIUS;
      let ny = -dy / RADIUS; // up = forward
      const m = Math.hypot(nx, ny);
      if (m < dead) { nx = 0; ny = 0; }
      this.onMove(nx, ny);
      e.preventDefault();
    } else if (e.pointerId === this.lookId) {
      this.onLook(e.clientX - this.last.x, e.clientY - this.last.y);
      this.last = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }

  _up(e) {
    if (e.pointerId === this.moveId) {
      this.moveId = null;
      this.knob.style.transform = "translate(0px, 0px)";
      this.base.classList.remove("is-active");
      this.base.style.left = "";
      this.base.style.top = "";
      this.onMove(0, 0);
    } else if (e.pointerId === this.lookId) {
      this.lookId = null;
    }
  }
}
