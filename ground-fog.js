/**
 * ground-fog.js — Drifting low fog banks that follow the player (horror atmosphere).
 */
import * as THREE from "./vendor/three.module.js";

function makePuffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.22)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class GroundFog {
  constructor(scene, count = 46, radius = 55) {
    this.radius = radius;
    this.puffs = [];
    this.opacityScale = 1;
    const tex = makePuffTexture();
    this.group = new THREE.Group();
    this.group.name = "GroundFog";
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: "#0e1522",
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        fog: false,
      });
      const s = new THREE.Sprite(mat);
      const size = 18 + Math.random() * 20;
      s.scale.set(size, size * 0.45, 1);
      s.userData = {
        ox: (Math.random() * 2 - 1) * radius,
        oz: (Math.random() * 2 - 1) * radius,
        h: 0.6 + Math.random() * 2.6,
        sp: 0.25 + Math.random() * 0.6,
        ph: Math.random() * 6.28,
      };
      this.puffs.push(s);
      this.group.add(s);
    }
    scene.add(this.group);
  }

  setPreset(preset) {
    const id = preset.id;
    this.opacityScale = id === "night" ? 1.0 : id === "dusk" ? 0.75 : 0.45;
    for (const p of this.puffs) p.material.color.set(preset.fogColor);
  }

  update(dt, px, pz, groundY, time) {
    const r = this.radius;
    for (const p of this.puffs) {
      const u = p.userData;
      u.ox += Math.cos(u.ph + time * 0.05) * u.sp * dt;
      u.oz += Math.sin(u.ph + time * 0.04) * u.sp * dt;
      // wrap inside a square around the player so banks recycle at the edge
      if (u.ox > r) u.ox -= 2 * r; else if (u.ox < -r) u.ox += 2 * r;
      if (u.oz > r) u.oz -= 2 * r; else if (u.oz < -r) u.oz += 2 * r;
      p.position.set(px + u.ox, groundY + u.h + Math.sin(time * 0.3 + u.ph) * 0.25, pz + u.oz);
      const edge = 1 - Math.min(1, Math.max(Math.abs(u.ox), Math.abs(u.oz)) / r);
      p.material.opacity = 0.5 * this.opacityScale * Math.min(1, edge * 2.5);
    }
  }
}
