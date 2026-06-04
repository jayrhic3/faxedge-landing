import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const BASE = import.meta.env.BASE_URL;

/**
 * Hero MacBook scene — fixed full-viewport WebGL background.
 * The model rotates/moves through 5 keyframe "states" driven by scroll,
 * mirroring the Spline scrollytelling (base + 4 states across 5 scenes).
 */
export function initHeroScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();

  // Navy radial-ish ambience via environment + lights
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 6);

  // Lights
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x2997ff, 1.4);
  rim.position.set(-4, 1, -3);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  // Group we transform (so model centering stays independent)
  const pivot = new THREE.Group();
  scene.add(pivot);

  let model = null;

  // ── Keyframe poses per scene (rotX, rotY, rotZ in radians; posY; scale) ──
  // Tweak these to taste once you see the model orient on screen.
  const D = Math.PI / 180;
  const states = [
    { rx: -20 * D, ry:   0 * D, rz: 0, y:  0.0, s: 1.00 }, // Scene 0 — top-down hero
    { rx:   0 * D, ry:  25 * D, rz: 0, y:  0.2, s: 1.05 }, // Scene 1 — front
    { rx:   5 * D, ry: 200 * D, rz: 0, y: -0.1, s: 1.00 }, // Scene 2 — back
    { rx:  15 * D, ry: 320 * D, rz: 0, y:  0.1, s: 1.08 }, // Scene 3 — isometric
    { rx:  10 * D, ry: 360 * D, rz: 0, y:  0.0, s: 1.00 }, // Scene 4 — settle
  ];

  // Smoothed current pose
  const cur = { rx: states[0].rx, ry: states[0].ry, rz: 0, y: states[0].y, s: states[0].s };

  const SCENE_COUNT = 5;
  const SPLINE_STEPS = 5000; // matches the 5000px scroll stage

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Interpolate target pose from continuous scroll progress (0..1)
  function targetPose(progress) {
    const raw = progress * (SCENE_COUNT - 1); // 0..4
    const i = Math.min(Math.floor(raw), SCENE_COUNT - 2);
    const t = easeInOut(raw - i);
    const a = states[i];
    const b = states[i + 1];
    return {
      rx: a.rx + (b.rx - a.rx) * t,
      ry: a.ry + (b.ry - a.ry) * t,
      rz: a.rz + (b.rz - a.rz) * t,
      y: a.y + (b.y - a.y) * t,
      s: a.s + (b.s - a.s) * t,
    };
  }

  let targetProgress = 0;
  function onScroll() {
    targetProgress = Math.max(0, Math.min(1, window.scrollY / SPLINE_STEPS));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Load model
  const loader = new GLTFLoader();
  loader.load(
    BASE + 'free_macbook_mockup.glb',
    (gltf) => {
      model = gltf.scene;

      // Center & normalize scale to a consistent size
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center); // center at origin
      const maxDim = Math.max(size.x, size.y, size.z);
      const fit = 3.2 / maxDim; // target world size
      model.scale.setScalar(fit);

      pivot.add(model);
    },
    undefined,
    (err) => console.error('MacBook GLB failed to load:', err)
  );

  // Render loop with smooth lerp toward target pose
  function lerp(a, b, n) { return a + (b - a) * n; }

  function animate() {
    requestAnimationFrame(animate);
    const tp = targetPose(targetProgress);
    const k = 0.06; // smoothing
    cur.rx = lerp(cur.rx, tp.rx, k);
    cur.ry = lerp(cur.ry, tp.ry, k);
    cur.rz = lerp(cur.rz, tp.rz, k);
    cur.y  = lerp(cur.y,  tp.y,  k);
    cur.s  = lerp(cur.s,  tp.s,  k);

    pivot.rotation.set(cur.rx, cur.ry, cur.rz);
    pivot.position.y = cur.y;
    pivot.scale.setScalar(cur.s);

    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
