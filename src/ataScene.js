import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const BASE = import.meta.env.BASE_URL;

/**
 * ATA device viewer — contained WebGL canvas.
 * Click cycles the device through 4 view states
 * (top → front → back → isometric), matching the Spline mouse-down behavior.
 */
export function initAtaScene(canvas, container) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  function size() {
    const r = container.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }
  let { w, h } = size();
  renderer.setSize(w, h);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
  camera.position.set(0, 0, 6);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x2997ff, 1.6);
  rim.position.set(-4, 2, -4);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const pivot = new THREE.Group();
  scene.add(pivot);

  let model = null;

  const D = Math.PI / 180;
  // 4 states the device cycles through on click
  const states = [
    { rx: -25 * D, ry:   0 * D }, // top
    { rx:   0 * D, ry:   0 * D }, // front
    { rx:   0 * D, ry: 180 * D }, // back
    { rx:  20 * D, ry: 315 * D }, // isometric
  ];
  let stateIndex = 0;

  const cur = { rx: states[0].rx, ry: states[0].ry };
  const target = { rx: states[0].rx, ry: states[0].ry };

  const loader = new GLTFLoader();
  loader.load(
    BASE + 'fax_edge_ata_device.glb',
    (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const sz = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const maxDim = Math.max(sz.x, sz.y, sz.z);
      model.scale.setScalar(2.6 / maxDim);
      pivot.add(model);
    },
    undefined,
    (err) => console.error('ATA GLB failed to load:', err)
  );

  // Click → advance to next state. Keep an absolute target that only grows,
  // so the device always rotates forward and never snaps backward.
  let absTarget = states[0].ry;
  function advance() {
    stateIndex = (stateIndex + 1) % states.length;
    target.rx = states[stateIndex].rx;
    // move forward by the delta needed to reach the next state's facing
    const want = states[stateIndex].ry;
    const curMod = ((absTarget % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = want - curMod;
    if (delta <= 0) delta += Math.PI * 2;
    absTarget += delta;
    target.ry = absTarget;
  }

  container.addEventListener('click', advance);
  container.addEventListener('touchend', (e) => { advance(); }, { passive: true });

  function lerp(a, b, n) { return a + (b - a) * n; }
  function animate() {
    requestAnimationFrame(animate);
    cur.rx = lerp(cur.rx, target.rx, 0.08);
    cur.ry = lerp(cur.ry, target.ry, 0.08);
    pivot.rotation.set(cur.rx, cur.ry, 0);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const s = size();
    w = s.w; h = s.h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}
