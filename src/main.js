import '../style.css';
import { initHeroScene } from './heroScene.js';
import { initAtaScene } from './ataScene.js';

// ───────────────────────────────────────────────
// 1. Hero MacBook WebGL background (fixed canvas)
// ───────────────────────────────────────────────
const heroCanvas = document.getElementById('heroCanvas');
if (heroCanvas) initHeroScene(heroCanvas);

// ───────────────────────────────────────────────
// 2. ATA device WebGL viewer (contained)
// ───────────────────────────────────────────────
const ataCanvas = document.getElementById('ataCanvas');
const ataContainer = document.getElementById('ataViewer');
if (ataCanvas && ataContainer) initAtaScene(ataCanvas, ataContainer);

// ───────────────────────────────────────────────
// 3. Scrollytelling — scene text crossfade
//    (ported from the Spline version, same timing)
// ───────────────────────────────────────────────
(function () {
  const SCENE_COUNT = 5;
  const SPLINE_STEPS = 5000;
  const scenes = [];
  for (let i = 0; i < SCENE_COUNT; i++) {
    const el = document.getElementById('scene' + i);
    if (el) scenes.push(el);
  }

  if (scenes[0]) {
    scenes[0].addEventListener(
      'animationend',
      () => { scenes[0].style.animation = 'none'; },
      { once: true }
    );
  }

  function getProgress() {
    return Math.max(0, Math.min(1, window.scrollY / SPLINE_STEPS));
  }

  let activeZone = -1;
  let pendingZone = -1;
  let switchTimer = null;
  let prevScrollY = window.scrollY;
  let scrollDir = 'down';

  function getDelay(fromZone, toZone) {
    if (scrollDir === 'up') {
      const back = Math.max(1, fromZone - toZone);
      return Math.min(800, back * 300);
    }
    return 300;
  }

  function applyZone(zoneIndex) {
    activeZone = zoneIndex;
    scenes.forEach((el, i) => {
      el.style.opacity = '';
      el.style.transform = '';
      el.classList.toggle('visible', i === zoneIndex);
    });
  }

  function update() {
    scrollDir = window.scrollY < prevScrollY ? 'up' : 'down';
    prevScrollY = window.scrollY;

    const raw = getProgress() * SCENE_COUNT;
    const zoneIndex = Math.min(Math.floor(raw), SCENE_COUNT - 1);
    if (zoneIndex === activeZone) return;
    if (zoneIndex === pendingZone) return;

    clearTimeout(switchTimer);
    pendingZone = zoneIndex;
    switchTimer = setTimeout(() => {
      applyZone(zoneIndex);
      pendingZone = -1;
    }, getDelay(activeZone, zoneIndex));
  }

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(() => { update(); ticking = false; });
        ticking = true;
      }
    },
    { passive: true }
  );
  update();
})();

// ───────────────────────────────────────────────
// 4. ATA "Click to rotate" hint — dismiss on first interaction
// ───────────────────────────────────────────────
(function () {
  const hint = document.getElementById('rotateHint');
  const viewer = document.getElementById('ataViewer');
  if (!viewer || !hint) return;
  const dismiss = () => hint.classList.add('dismissed');
  viewer.addEventListener('mousedown', dismiss, { once: true });
  viewer.addEventListener('touchstart', dismiss, { once: true, passive: true });
})();

// ───────────────────────────────────────────────
// 5. Mobile menu toggle
// ───────────────────────────────────────────────
(function () {
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  function close() {
    menu.classList.remove('open');
    burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function toggle() {
    const isOpen = menu.classList.toggle('open');
    burger.classList.toggle('active', isOpen);
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
  burger.addEventListener('click', toggle);
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
})();
