/**
 * character.js — Playable 3D survivor (Three.js "Soldier" rig: Idle / Walk / Run clips)
 * with a procedural hooded-figure fallback if the GLB cannot be loaded.
 */
import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const MODEL_URL = new URL("./Soldier.glb", import.meta.url).href;
const TARGET_HEIGHT_M = 1.85;

export class Character {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = "PlayableCharacter";
    scene.add(this.root);

    this.mixer = null;
    this.actions = {};
    this.current = null;
    this.fallback = null;
    this._facing = 0;
    this._walkPhase = 0;
    this.ready = false;

    this._buildFallback();
    this._loadModel();
  }

  _loadModel() {
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const h = Math.max(0.01, box.max.y - box.min.y);
        model.scale.setScalar(TARGET_HEIGHT_M / h);
        model.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = false;
            o.frustumCulled = false;
            if (o.material) o.material.envMapIntensity = 0.4;
          }
        });
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) {
          if (["Idle", "Walk", "Run"].includes(clip.name)) {
            this.actions[clip.name] = this.mixer.clipAction(clip);
          }
        }
        this.root.add(model);
        if (this.fallback) this.fallback.visible = false;
        this._play("Idle", 0);
        this.ready = true;
      },
      undefined,
      () => {
        console.warn("[Character] GLB missing, using procedural fallback.");
        this.ready = true;
      }
    );
  }

  _buildFallback() {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: "#14171d", roughness: 0.8 });
    const glow = new THREE.MeshStandardMaterial({ color: "#7dd3fc", emissive: "#7dd3fc", emissiveIntensity: 1.6 });
    const mk = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    mk(new THREE.CapsuleGeometry(0.28, 0.7, 4, 10), dark, 0, 1.1, 0);
    mk(new THREE.SphereGeometry(0.22, 14, 12), dark, 0, 1.72, 0);
    mk(new THREE.BoxGeometry(0.3, 0.06, 0.1), glow, 0, 1.74, 0.17);
    this.legL = mk(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), dark, -0.14, 0.4, 0);
    this.legR = mk(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), dark, 0.14, 0.4, 0);
    this.fallback = g;
    this.root.add(g);
  }

  _play(name, fade = 0.25) {
    const next = this.actions[name];
    if (!next || next === this.current) return;
    next.reset().fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = next;
  }

  /** x,z: world pos; groundY: terrain height; vx,vz: velocity (m/s); speed: |v|. */
  update(dt, x, z, groundY, vx, vz, speed, sprinting) {
    this.root.position.set(x, groundY, z);

    if (speed > 0.3) {
      const target = Math.atan2(vx, vz); // model faces +Z
      let d = target - this._facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this._facing += d * (1 - Math.exp(-12 * dt));
      this.root.rotation.y = this._facing;
    }

    if (this.mixer) {
      this._play(speed < 0.3 ? "Idle" : sprinting ? "Run" : "Walk");
      if (this.current && speed > 0.3) this.current.timeScale = THREE.MathUtils.clamp(speed / (sprinting ? 7 : 3.6), 0.6, 1.4);
      else if (this.current) this.current.timeScale = 1;
      this.mixer.update(dt);
    } else if (this.fallback && this.fallback.visible) {
      this._walkPhase += dt * speed * 2.2;
      const s = Math.sin(this._walkPhase) * Math.min(1, speed / 3) * 0.6;
      this.legL.rotation.x = s;
      this.legR.rotation.x = -s;
    }
  }

  get shadowCasters() {
    return [this.root];
  }
}
