import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GOLDEN_ANGLE = 2.399963229728653;
const GALAXY_COUNT = 60000;
const SPACING = 5.2;

const MERSENNE_EXPONENTS = [
  2, 3, 5, 7, 13, 17, 19, 31, 61, 89, 107, 127, 521, 607, 1279, 2203, 2281,
  3217, 4253, 4423, 9689, 9941, 11213, 19937, 21701, 23209, 44497, 86243,
  110503, 132049, 216091, 756839, 859433, 1257787, 1398269, 2976221,
  3021377, 6972593, 13466917, 20996011, 24036583, 25964951, 30402457,
  32582657, 37156667, 42643801, 43112609, 57885161, 74207281, 77232917,
  82589933, 136279841
];

function sievePrimes(limit) {
  const isPrime = new Uint8Array(limit + 1).fill(1);
  isPrime[0] = isPrime[1] = 0;
  for (let i = 2; i * i <= limit; i++) {
    if (isPrime[i]) {
      for (let j = i * i; j <= limit; j += i) isPrime[j] = 0;
    }
  }
  return isPrime;
}

function digitsOfMersenne(p) {
  return Math.floor(p * Math.log10(2)) + 1;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function buildGalaxy() {
  const isPrime = sievePrimes(GALAXY_COUNT + 1);
  const positions = new Float32Array(GALAXY_COUNT * 3);
  const colors = new Float32Array(GALAXY_COUNT * 3);
  const bright = new THREE.Color('#9fd8ff');
  const dim = new THREE.Color('#4a2a6e');
  let primeCount = 0;
  for (let i = 0; i < GALAXY_COUNT; i++) {
    const n = i + 2;
    const r = SPACING * Math.sqrt(i);
    const theta = i * GOLDEN_ANGLE;
    const wave = Math.sin(i * 0.018) * 2.6 + Math.cos(i * 0.004) * 3.4;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = wave;
    positions[i * 3 + 2] = Math.sin(theta) * r;
    const c = isPrime[n] ? bright : dim;
    const f = isPrime[n] ? 1.0 : 0.22;
    colors[i * 3] = c.r * f;
    colors[i * 3 + 1] = c.g * f;
    colors[i * 3 + 2] = c.b * f;
    if (isPrime[n]) primeCount++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    map: makeGlowTexture()
  });
  return { points: new THREE.Points(geo, mat), primeCount };
}

function buildStarfield() {
  const COUNT = 5000;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const r = 2600 + Math.random() * 2200;
    const t = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(ph) * Math.cos(t);
    positions[i * 3 + 1] = r * Math.cos(ph);
    positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(t);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 6, color: 0xbfd4ff, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, map: makeGlowTexture()
  });
  return new THREE.Points(geo, mat);
}

function buildStairway(scene, pickables) {
  const group = new THREE.Group();
  const glow = makeGlowTexture();
  const info = [];
  const waypoints = [];
  MERSENNE_EXPONENTS.forEach((p, k) => {
    const r = SPACING * Math.sqrt(k * 12 + 40);
    const theta = k * GOLDEN_ANGLE + 1.2;
    const y = 26 + k * 1.35;
    const pos = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
    const digits = digitsOfMersenne(p);
    const isLast = k === MERSENNE_EXPONENTS.length - 1;
    const size = 3.2 + Math.min(6, 2.2 * Math.log10(digits) - 2);
    const color = new THREE.Color(isLast ? '#ffcf6b' : (k === 50 ? '#ffc7e0' : '#7dd4ff'));

    const mat = new THREE.SpriteMaterial({ map: glow, color, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.scale.setScalar(size * 3.4);
    sprite.userData = { p, digits, ordinal: k + 1, kind: 'mersenne', baseScale: size * 3.4 };
    group.add(sprite);
    pickables.push(sprite);
    waypoints.push({ position: pos, sprite });
    info.push({ p, digits, ordinal: k + 1, isLast });
  });

  const railPositions = new Float32Array((waypoints.length - 1) * 6);
  waypoints.forEach((wp, k) => {
    if (k === 0) return;
    const a = waypoints[k - 1].position;
    const b = wp.position;
    railPositions.set([a.x, a.y, a.z, b.x, b.y, b.z], (k - 1) * 6);
  });
  const railGeo = new THREE.BufferGeometry();
  railGeo.setAttribute('position', new THREE.BufferAttribute(railPositions, 3));
  const rail = new THREE.Line(
    railGeo,
    new THREE.LineBasicMaterial({
      color: 0x5f8fd8, transparent: true, opacity: 0.28,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  scene.add(rail);

  scene.add(group);
  return { group, rail, info, waypoints };
}

const app = {
  camera: null, renderer: null, scene: null, composer: null, controls: null,
  galaxy: null, mersenne: null, raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(), pointerDown: null,
  clock: new THREE.Clock(),
  tour: { active: false, index: -1, holdUntil: 0 }
};

function showStarInfo(d) {
  document.getElementById('info-title').textContent =
    `M${d.p} — the ${d.ordinal}${ordinalSuffix(d.ordinal)} Mersenne prime`;
  document.getElementById('info-body').textContent =
    `2^${d.p} − 1 has ${d.digits.toLocaleString('en-US')} digits.` +
    (d.ordinal === MERSENNE_EXPONENTS.length
      ? ' The largest known prime on Earth, verified by GIMPS in 2024.'
      : '');
  document.getElementById('info-box').classList.add('visible');
}

function hideStarInfo() {
  document.getElementById('info-box').classList.remove('visible');
}

function startTour() {
  app.tour.active = true;
  app.tour.index = -1;
  app.controls.autoRotate = false;
  document.getElementById('tour-btn').classList.add('active');
  document.getElementById('tour-btn').textContent = '◦ Stop tour';
  advanceTour();
}

function stopTour() {
  app.tour.active = false;
  app.tour.index = -1;
  app.controls.autoRotate = true;
  hideStarInfo();
  const btn = document.getElementById('tour-btn');
  btn.classList.remove('active');
  btn.textContent = '▶ Tour the stairway';
}

function advanceTour() {
  const wps = app.mersenne ? app.mersenne.waypoints : [];
  app.tour.index += 1;
  if (!wps.length || app.tour.index >= wps.length) {
    stopTour();
    return;
  }
  const wp = wps[app.tour.index];
  app.tour.waypoint = wp;
  app.tour.holdUntil = 0;
  showStarInfo(wp.sprite.userData);
}

function init() {
  const canvas = document.getElementById('scene');
  app.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  app.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  app.renderer.setSize(window.innerWidth, window.innerHeight);

  app.scene = new THREE.Scene();
  app.scene.fog = new THREE.FogExp2(0x04060f, 0.00055);

  app.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 9000);
  app.camera.position.set(0, 340, 560);

  app.controls = new OrbitControls(app.camera, app.renderer.domElement);
  app.controls.enableDamping = true;
  app.controls.dampingFactor = 0.04;
  app.controls.autoRotate = true;
  app.controls.autoRotateSpeed = 0.45;
  app.controls.maxDistance = 2400;
  app.controls.minDistance = 20;
  app.controls.target.set(0, 26, 0);

  app.composer = new EffectComposer(app.renderer);
  app.composer.addPass(new RenderPass(app.scene, app.camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 1.15, 0.72, 0.12
  );
  app.composer.addPass(bloom);
  app.composer.addPass(new OutputPass());

  const starfield = buildStarfield();
  app.scene.add(starfield);

  const g = buildGalaxy();
  app.galaxy = g.points;
  app.scene.add(app.galaxy);
  document.getElementById('prime-count').textContent = g.primeCount.toLocaleString('en-US');

  const pickables = [];
  const sw = buildStairway(app.scene, pickables);
  app.mersenne = sw;
  document.getElementById('mersenne-count').textContent = String(MERSENNE_EXPONENTS.length);

  canvas.addEventListener('pointerdown', (e) => {
    app.pointerDown = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!app.pointerDown) return;
    const dx = e.clientX - app.pointerDown.x;
    const dy = e.clientY - app.pointerDown.y;
    app.pointerDown = null;
    if (Math.hypot(dx, dy) > 6) {
      if (app.tour.active) stopTour();
      return;
    }
    app.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    app.raycaster.setFromCamera(app.pointer, app.camera);
    app.raycaster.params.Points = { threshold: 8 };
    const hits = app.raycaster.intersectObjects(pickables, false);
    const box = document.getElementById('info-box');
    if (hits.length > 0) {
      showStarInfo(hits[0].object.userData);
    } else {
      hideStarInfo();
    }
  });

  document.getElementById('tour-btn').addEventListener('click', () => {
    if (app.tour.active) { stopTour(); } else { startTour(); }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && app.tour.active) stopTour();
    if (e.key === ' ') {
      e.preventDefault();
      if (app.tour.active) advanceTour(); else startTour();
    }
  });

  window.addEventListener('resize', () => {
    app.camera.aspect = window.innerWidth / window.innerHeight;
    app.camera.updateProjectionMatrix();
    app.renderer.setSize(window.innerWidth, window.innerHeight);
    app.composer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function animate() {
  requestAnimationFrame(animate);
  const t = app.clock.getElapsedTime();
  if (app.mersenne) {
    app.mersenne.group.children.forEach((sprite, k) => {
      const pulse = 1 + 0.14 * Math.sin(t * 2.2 + k * 0.7);
      sprite.scale.setScalar(sprite.userData.baseScale * pulse);
    });
  }
  if (app.tour.active && app.tour.waypoint) {
    const wp = app.tour.waypoint;
    const camGoal = wp.position.clone().add(new THREE.Vector3(18, 6, 18));
    app.camera.position.lerp(camGoal, 0.035);
    app.controls.target.lerp(wp.position, 0.05);
    const dist = app.camera.position.distanceTo(camGoal);
    if (dist < 2.5) {
      if (!app.tour.holdUntil) {
        app.tour.holdUntil = t + (app.tour.index === app.mersenne.waypoints.length - 1 ? 6 : 1.6);
      } else if (t > app.tour.holdUntil) {
        advanceTour();
      }
    }
  }
  app.controls.update();
  app.composer.render();
}

init();
