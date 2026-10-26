/* MORPHOS 3D — Particle Metamorphosis Engine */
let scene, camera, renderer, controls, group, points, geo, mat, stars;
let N = 15000;
let pos, from, to, col, delays, dirs, home, sizeScale = 0.1;
let morphing = false, t0 = 0, dur = 1700, morphDone = null;
let spin = true, autopilot = false, autoTimer = null, soundOn = false, started = false;
let actx = null, gain = null;
const PALETTES = {
  neon:  [0x00f0ff, 0xff2bd6],
  solar: [0xff8a00, 0xffee55],
  matrix:[0x00ff88, 0xb6ff00],
  vapor: [0xff2bd6, 0x7b5bff],
  ice:   [0x4d7cff, 0xe8fbff]
};
let palette = 'neon';
const SHAPES = ['sphere', 'galaxy', 'dna', 'heart', 'knot', 'wave', 'tornado', 'ring'];
let currentShape = 'sphere';
const mouseLocal = new THREE.Vector3(9999, 9999, 9999);
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let repelPower = 0;

/* ---------- INIT ---------- */
function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060d, 0.026);

  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(0, 2.2, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.getElementById('webgl').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 32;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  group = new THREE.Group();
  scene.add(group);

  makeTexture();
  buildStars();
  buildParticles(N);
  home = genShape('sphere');
  paintColors(home, false);
  for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 46;
  startMorph(home, 2400);

  addEventListener('resize', onResize);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', e => { e.target._dx = e.clientX; e.target._dy = e.clientY; });
  renderer.domElement.addEventListener('pointerup', e => {
    const dx = Math.abs(e.clientX - (e.target._dx || 0));
    const dy = Math.abs(e.clientY - (e.target._dy || 0));
    if (dx < 6 && dy < 6) burst();
  });

  loop();
}

function makeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  mat = new THREE.PointsMaterial({
    size: sizeScale, map: t, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95, sizeAttenuation: true
  });
}

function buildStars() {
  const n = 900, a = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) a[i] = (Math.random() - 0.5) * 140;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x88aaff, size: 0.28, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(stars);
}

function buildParticles(n) {
  N = n;
  if (points) { group.remove(points); geo.dispose(); }
  pos = new Float32Array(N * 3);
  from = new Float32Array(N * 3);
  to = new Float32Array(N * 3);
  col = new Float32Array(N * 3);
  delays = new Float32Array(N);
  dirs = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    delays[i] = Math.random() * 0.4;
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    dirs[i * 3] = v.x; dirs[i * 3 + 1] = v.y; dirs[i * 3 + 2] = v.z;
  }
  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  points = new THREE.Points(geo, mat);
  group.add(points);
  document.getElementById('pc').textContent = N.toLocaleString('id-ID');
}

/* ---------- SHAPES ---------- */
const R = (a, b) => a + Math.random() * (b - a);

function genShape(key) {
  const a = new Float32Array(N * 3);
  if (key === 'sphere') {
    for (let i = 0; i < N; i++) {
      const z = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z);
      const r = 4.7 * Math.pow(Math.random(), 0.34);
      a[i*3] = r * s * Math.cos(th); a[i*3+1] = r * z; a[i*3+2] = r * s * Math.sin(th);
    }
  } else if (key === 'galaxy') {
    for (let i = 0; i < N; i++) {
      const arm = i % 4, rr = Math.pow(Math.random(), 0.62) * 6 + 0.35;
      const ang = arm * (Math.PI / 2) + rr * 1.05 + R(-0.22, 0.22) * rr * 0.16;
      a[i*3] = Math.cos(ang) * rr; a[i*3+1] = R(-0.4, 0.4) * (rr / 6 + 0.3); a[i*3+2] = Math.sin(ang) * rr;
    }
  } else if (key === 'dna') {
    for (let i = 0; i < N; i++) {
      const f = i / N, strand = i % 2;
      const ang = f * Math.PI * 8 + strand * Math.PI;
      const rung = i % 6 < 2;
      const rad = rung ? R(0, 2.1) : 2.1;
      const aa = rung ? ang % Math.PI : ang;
      a[i*3] = Math.cos(aa) * rad + R(-0.09, 0.09);
      a[i*3+1] = (f - 0.5) * 10.5;
      a[i*3+2] = Math.sin(aa) * rad + R(-0.09, 0.09);
    }
  } else if (key === 'heart') {
    for (let i = 0; i < N; i++) {
      const t = Math.random() * Math.PI * 2, fill = Math.sqrt(Math.random());
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      a[i*3] = x * 0.27 * fill;
      a[i*3+1] = y * 0.27 * fill + 0.6;
      a[i*3+2] = R(-1, 1) * (1 - fill * 0.75);
    }
  } else if (key === 'knot') {
    const g = new THREE.TorusKnotGeometry(3.1, 0.85, 260, 36, 2, 3);
    sampleGeo(g, a); g.dispose();
  } else if (key === 'wave') {
    for (let i = 0; i < N; i++) {
      const x = R(-7, 7), z = R(-7, 7);
      a[i*3] = x; a[i*3+1] = Math.sin(x * 0.7) * Math.cos(z * 0.7) * 1.5 - 1.5; a[i*3+2] = z;
    }
  } else if (key === 'tornado') {
    for (let i = 0; i < N; i++) {
      const f = i / N;
      const ang = f * Math.PI * 14 + R(-0.4, 0.4);
      const rad = (1 - f) * 3.3 + 0.4 + R(-0.25, 0.25);
      a[i*3] = Math.cos(ang) * rad;
      a[i*3+1] = (f - 0.5) * 11.5;
      a[i*3+2] = Math.sin(ang) * rad;
    }
  } else if (key === 'ring') {
    for (let i = 0; i < N; i++) {
      if (i % 10 < 7) { // gas giant body
        const z = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z);
        const r = 3.1 * Math.pow(Math.random(), 0.33);
        a[i*3] = r * s * Math.cos(th); a[i*3+1] = r * z; a[i*3+2] = r * s * Math.sin(th);
      } else { // debris ring
        const th = Math.random() * Math.PI * 2;
        const r = R(4.4, 6.6);
        a[i*3] = Math.cos(th) * r;
        a[i*3+1] = R(-0.16, 0.16);
        a[i*3+2] = Math.sin(th) * r;
      }
    }
  } else if (key === 'text') {
    textPoints(a, document.getElementById('textInput').value || 'MORPHOS');
  }
  return a;
}

function sampleGeo(g, out) {
  const p = g.attributes.position.array;
  const triCount = g.index ? g.index.count / 3 : p.length / 9;
  const idx = g.index ? g.index.array : null;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const t = (Math.random() * triCount) | 0;
    let i0, i1, i2;
    if (idx) { i0 = idx[t*3]*3; i1 = idx[t*3+1]*3; i2 = idx[t*3+2]*3; }
    else { i0 = t*9; i1 = t*9+3; i2 = t*9+6; }
    A.set(p[i0], p[i0+1], p[i0+2]); B.set(p[i1], p[i1+1], p[i1+2]); C.set(p[i2], p[i2+1], p[i2+2]);
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    P.copy(A).addScaledVector(B.clone().sub(A), u).addScaledVector(C.clone().sub(A), v);
    out[i*3] = P.x; out[i*3+1] = P.y; out[i*3+2] = P.z;
  }
}

function textPoints(out, rawText) {
  const text = (rawText || 'MORPHOS').toUpperCase().slice(0, 16);
  const c = document.createElement('canvas');
  const W = 1400, H = 340;
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  let fs = 240;
  x.font = `900 ${fs}px Orbitron, Arial Black, sans-serif`;
  const w = x.measureText(text).width;
  if (w > W - 60) { fs = Math.floor(fs * (W - 60) / w); x.font = `900 ${fs}px Orbitron, Arial Black, sans-serif`; }
  x.fillStyle = '#fff';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, W / 2, H / 2);

  const data = x.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y += 3) for (let xx = 0; xx < W; xx += 3) {
    if (data[(y * W + xx) * 4 + 3] > 130) pts.push(xx, y);
  }
  const scale = 12.5 / W;
  for (let i = 0; i < N; i++) {
    let k = 0;
    if (pts.length >= 6) k = ((Math.random() * (pts.length / 2)) | 0) * 2;
    out[i*3]   = (pts[k] - W / 2) * scale;
    out[i*3+1] = -(pts[k+1] - H / 2) * scale;
    out[i*3+2] = R(-0.55, 0.55);
  }
}

function paintColors(a, isText) {
  const p0 = new THREE.Color(PALETTES[palette][0]);
  const p1 = new THREE.Color(PALETTES[palette][1]);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const x = a[i*3], y = a[i*3+1], z = a[i*3+2];
    let t;
    if (isText) t = (x + 6.5) / 13;
    else t = Math.min(Math.sqrt(x*x + y*y + z*z) / 6.2, 1);
    t = Math.max(0, Math.min(1, t + (Math.random() - 0.5) * 0.16));
    c.copy(p0).lerp(p1, t);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
}

/* ---------- MORPH ---------- */
function startMorph(target, duration) {
  from = pos.slice();
  to = target;
  for (let i = 0; i < N; i++) delays[i] = Math.random() * 0.4;
  dur = duration;
  t0 = performance.now();
  morphing = true;
}

function burst() {
  if (!started || morphing) return;
  const a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const d = 4 + Math.random() * 8;
    a[i*3] = pos[i*3] + dirs[i*3] * d;
    a[i*3+1] = pos[i*3+1] + dirs[i*3+1] * d;
    a[i*3+2] = pos[i*3+2] + dirs[i*3+2] * d;
  }
  setStatus('SHOCKWAVE DETONATED · REFORMING');
  sweep();
  morphDone = () => { startMorph(home, 1500); setStatus('PARTICLES REFORMED · ' + label(currentShape)); };
  startMorph(a, 750);
}

function morphToShape(key, isText) {
  currentShape = key;
  home = genShape(key);
  paintColors(home, isText);
  startMorph(home, 1700);
  spin = !isText;
  document.getElementById('shapeName').textContent = (isText ? 'TEXT' : key.toUpperCase());
  setStatus('MORPHING → ' + (isText ? 'TEXT: "' + document.getElementById('textInput').value.toUpperCase() + '"' : key.toUpperCase()));
  sweep();
}

function label(k) { return k === 'text' ? 'TEXT' : k.toUpperCase(); }

/* ---------- AUDIO ---------- */
function ensureAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  gain = actx.createGain(); gain.gain.value = 0.14; gain.connect(actx.destination);
}
function sweep() {
  if (!soundOn) return;
  ensureAudio();
  const t = actx.currentTime;
  [0, 0.07].forEach((d, k) => {
    const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
    o.type = k ? 'triangle' : 'sawtooth';
    o.frequency.setValueAtTime(160 + k * 60, t + d);
    o.frequency.exponentialRampToValueAtTime(760 + k * 240, t + d + 0.5);
    f.type = 'lowpass'; f.frequency.setValueAtTime(600, t + d); f.frequency.exponentialRampToValueAtTime(4200, t + d + 0.55);
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.6, t + d + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.75);
    o.connect(f); f.connect(g); g.connect(gain);
    o.start(t + d); o.stop(t + d + 0.8);
  });
}

/* ---------- INTERACTION ---------- */
function onPointerMove(e) {
  ndc.x = (e.clientX / innerWidth) * 2 - 1;
  ndc.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  plane.normal.copy(dir).negate(); plane.constant = 0;
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, hit)) {
    group.worldToLocal(hit);
    mouseLocal.copy(hit);
    repelPower = 1;
  }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function setStatus(t) { document.getElementById('status').textContent = t; }

/* ---------- LOOP ---------- */
let last = performance.now(), frames = 0, fpsT = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  frames++;
  if (now - fpsT > 500) {
    document.getElementById('fps').textContent = Math.round(frames * 1000 / (now - fpsT));
    frames = 0; fpsT = now;
  }

  if (spin) group.rotation.y += 0.0022;
  else group.rotation.y += (0 - group.rotation.y) * 0.04;
  stars.rotation.y += 0.0003;
  repelPower *= 0.94;

  const p = pos;
  if (morphing) {
    const raw = Math.min((now - t0) / dur, 1);
    const span = 1 - 0.4;
    for (let i = 0; i < N; i++) {
      let q = (raw - delays[i]) / span;
      q = q < 0 ? 0 : q > 1 ? 1 : q;
      const e = q < 0.5 ? 4*q*q*q : 1 - Math.pow(-2*q + 2, 3) / 2;
      const i3 = i * 3;
      const sw = Math.sin(q * Math.PI) * 1.35;
      p[i3]   = from[i3]   + (to[i3]   - from[i3])   * e + dirs[i3]   * sw;
      p[i3+1] = from[i3+1] + (to[i3+1] - from[i3+1]) * e + dirs[i3+1] * sw;
      p[i3+2] = from[i3+2] + (to[i3+2] - from[i3+2]) * e + dirs[i3+2] * sw;
    }
    if (raw >= 1) {
      morphing = false;
      pos.set(to);
      if (morphDone) { const cb = morphDone; morphDone = null; cb(); }
    }
  }

  // cursor repulsion (added on top of base positions)
  const mx = mouseLocal.x, my = mouseLocal.y, mz = mouseLocal.z, RAD = 3.1, R2 = RAD * RAD;
  const power = 1.05 * repelPower;
  if (power > 0.02 && mx < 9000) {
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const dx = p[i3] - mx, dy = p[i3+1] - my, dz = p[i3+2] - mz;
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < R2 && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const f = (1 - d / RAD) * power;
        p[i3] += dx / d * f; p[i3+1] += dy / d * f; p[i3+2] += dz / d * f;
      }
    }
  }

  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  controls.update();
  renderer.render(scene, camera);
}

/* ---------- UI ---------- */
document.getElementById('btn-start').addEventListener('click', () => {
  started = true;
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  setStatus('ENGINE ONLINE · MORPHING INTO SPHERE');
  sweep();
});

document.querySelectorAll('.shape-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.shape-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  morphToShape(b.dataset.shape, false);
}));

document.getElementById('btn-text').addEventListener('click', () => {
  document.querySelectorAll('.shape-btn').forEach(x => x.classList.remove('active'));
  morphToShape('text', true);
});
document.getElementById('textInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-text').click();
});

document.getElementById('btn-burst').addEventListener('click', burst);

document.getElementById('btn-auto').addEventListener('click', function () {
  autopilot = !autopilot;
  this.textContent = '⟳ AUTOPILOT: ' + (autopilot ? 'ON' : 'OFF');
  if (autopilot) {
    setStatus('AUTOPILOT ENGAGED · CYCLING FORMS');
    autoTimer = setInterval(() => {
      if (morphing) return;
      const next = SHAPES[(SHAPES.indexOf(currentShape) + 1) % SHAPES.length];
      document.querySelectorAll('.shape-btn').forEach(x => x.classList.toggle('active', x.dataset.shape === next));
      morphToShape(next, false);
    }, 3600);
  } else { clearInterval(autoTimer); setStatus('AUTOPILOT DISENGAGED'); }
});

document.getElementById('btn-sound').addEventListener('click', function () {
  soundOn = !soundOn;
  if (soundOn) { ensureAudio(); actx.resume && actx.resume(); }
  this.textContent = soundOn ? '🔊 SOUND ON' : '🔇 SOUND OFF';
  if (soundOn) sweep();
});

document.querySelectorAll('.pal').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.pal').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  palette = b.dataset.pal;
  paintColors(pos, currentShape === 'text');
  setStatus('PALETTE SHIFTED → ' + palette.toUpperCase());
  sweep();
}));

document.querySelectorAll('.den-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.den-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  buildParticles(parseInt(b.dataset.n, 10));
  home = currentShape === 'text' ? genShape('text') : genShape(currentShape);
  paintColors(home, currentShape === 'text');
  startMorph(home, 1400);
  setStatus('DENSITY RESAMPLED → ' + b.dataset.n + ' PARTICLES');
}));

const range = document.getElementById('sizeRange');
range.addEventListener('input', () => {
  sizeScale = range.value / 100;
  mat.size = sizeScale;
  document.getElementById('sizeOut').textContent = sizeScale.toFixed(2) + ' px';
});

/* ---------- KEYBOARD SHORTCUTS ---------- */
function pickShape(key) {
  const b = document.querySelector('.shape-btn[data-shape="' + key + '"]');
  if (b) b.click();
}
addEventListener('keydown', e => {
  if (!started) return;
  if (document.activeElement === document.getElementById('textInput')) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= SHAPES.length) pickShape(SHAPES[n - 1]);
  else if (e.key === 'b' || e.key === 'B') burst();
  else if (e.key === 'a' || e.key === 'A') document.getElementById('btn-auto').click();
  else if (e.key === 't' || e.key === 'T') { e.preventDefault(); document.getElementById('textInput').focus(); }
  else if (e.key === 's' || e.key === 'S') document.getElementById('btn-sound').click();
});

init();
