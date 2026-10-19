// 应用入口：总图（真实比例）为枢纽，进入各朝代体素场景；每次切换朝代都先回到总图再飞入下一个
import * as THREE from 'three';
import { Engine, TIMES } from './engine.js';
import { ERAS, INFO, HERITAGE, STORY, nameOf, descOf, lineageOf } from './info.js';
import { Labels } from './labels.js';
import { buildEra, buildFine } from './build-era.js';
import { MapView, ERA_CSS } from './mapview.js';
import { Tour } from './tour.js';
import { MAP, mapXZ, mapLL, eraToLL, llToEra, fmtLL, nearestPlace, CITIES } from './geo.js';
import workerSrc from 'virtual:worker';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const ERA_KEYS = ERAS.map((e) => e.key);
const SCENES = ['map', ...ERA_KEYS];
const eraOf = (k) => ERAS.find((e) => e.key === k);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let engine;
try {
  engine = new Engine($('app'));
} catch (err) {
  $('loading').querySelector('p').innerHTML = '当前浏览器无法启用 WebGL 2，无法显示三维场景。<br>请使用新版 Chrome、Edge、Safari 或微信内置浏览器打开。';
  throw err;
}
const mobile = engine.isMobile;
const state = { view: null, meta: {}, mode: 0, selected: null, tour: null, busy: false, queued: null, playing: false, lastEra: null };
const mapView = new MapView(engine);

// ---------------------------------------------------------------------------
// 后台营建（Web Worker，失败时退回主线程）
// ---------------------------------------------------------------------------
let worker = null;
const pending = new Map();
let reqSeq = 0;
try {
  if (workerSrc && typeof Worker !== 'undefined' && !params.has('noworker')) {
    worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' })));
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      worker = null;
      for (const [, p] of pending) p.fallback();
      pending.clear();
    };
  }
} catch (err) { worker = null; }

function call(msg, local) {
  return new Promise((resolve, reject) => {
    const run = () => setTimeout(() => { try { resolve(local()); } catch (e) { reject(e); } }, 30);
    if (!worker) { run(); return; }
    const id = ++reqSeq;
    pending.set(id, { resolve, reject, fallback: run });
    worker.postMessage({ ...msg, id });
  });
}

const inflight = {};
function requestScene(key) {
  if (state.meta[key]) return Promise.resolve(null);
  if (inflight[key]) return inflight[key];
  inflight[key] = call({ type: 'build', key }, () => buildEra(key))
    .then((r) => { if (r) ingest(r); delete inflight[key]; markButtons(); return r; },
      (e) => { delete inflight[key]; throw e; });
  markButtons();
  return inflight[key];
}

// 近景细模：一次只请求一个，避免卡顿
const fineQueue = [];
let fineBusy = false;
function pumpFine() {
  if (fineBusy || !fineQueue.length) return;
  const { key, idx } = fineQueue.shift();
  if (!state.meta[key]) { pumpFine(); return; }
  fineBusy = true;
  call({ type: 'fine', key, idx }, () => buildFine(key, idx))
    .then((g) => engine.addFine(key, idx, g))
    .catch(() => engine.addFine(key, idx, null))
    .finally(() => { fineBusy = false; pumpFine(); });
}

const MAX_ERAS = mobile ? 3 : 5;
function evict() {
  const built = ERA_KEYS.filter((k) => state.meta[k]);
  while (built.length > MAX_ERAS) {
    const cur = ERA_KEYS.indexOf(state.view === 'map' ? state.lastEra || 'jin' : state.view);
    built.sort((a, b) => Math.abs(ERA_KEYS.indexOf(b) - cur) - Math.abs(ERA_KEYS.indexOf(a) - cur));
    const k = built.shift();
    if (k === state.view || k === state.queued) break;
    if (!engine.disposeEra(k)) break;
    delete state.meta[k];
  }
}

function ingest(r) {
  engine.addEra(r.key, r);
  const items = r.items.map((it) => ({ id: it.id, box: new THREE.Box3(new THREE.Vector3(it.box[0], it.box[1], it.box[2]), new THREE.Vector3(it.box[3], it.box[4], it.box[5])) }));
  const ids = new Set(items.map((i) => i.id));
  const nodes = r.nodes.filter((n, i, a) => a.findIndex((m) => m.id === n.id) === i).sort((a, b) => b.z - a.z);
  state.meta[r.key] = { items, ids, labels: r.labels, nodes, ground: r.ground, sight: r.sight, faces: r.faces, bounds: r.bounds, heroes: r.heroes };
  if (r.key === 'map') drawMiniBase(r.ground);
  evict();
  console.log('[营建]', r.key, r.faces, '面', JSON.stringify(r.timing));
}

// ---------------------------------------------------------------------------
// 时间轴
// ---------------------------------------------------------------------------
const track = $('track');
for (const k of SCENES) {
  const e = eraOf(k);
  const b = document.createElement('button');
  b.className = 'era-btn' + (k === 'map' ? ' map' : '');
  b.dataset.era = k;
  if (k === 'map') b.innerHTML = '<span class="n">总图</span><span class="y">城址变迁</span>';
  else if (mobile) { b.style.setProperty('--c', ERA_CSS[k]); b.innerHTML = `<span class="n">${e.name}</span><span class="y">${e.years.split('—')[0]}</span>`; }
  else if (!mobile) { b.style.setProperty('--c', ERA_CSS[k]); b.innerHTML = `<span class="n">${e.name}</span><span class="y">${e.years}</span>`; }
  b.addEventListener('click', () => go(k));
  track.appendChild(b);
}
function markButtons() {
  for (const b of track.children) {
    const k = b.dataset.era;
    b.classList.toggle('on', k === (state.queued || state.target || state.view));
    b.classList.toggle('loading', !!inflight[k] && !state.meta[k]);
  }
}
$('eraPrev').onclick = () => step(-1);
$('eraNext').onclick = () => step(1);
function step(d) {
  const cur = SCENES.indexOf(state.queued || state.view || 'map');
  go(SCENES[Math.max(0, Math.min(SCENES.length - 1, cur + d))]);
}

const labels = new Labels($('labels'), engine.camera, (id) => select(id, true));

// ---------------------------------------------------------------------------
// 工具条
// ---------------------------------------------------------------------------
for (const b of $('timeBar').querySelectorAll('[data-t]')) b.addEventListener('click', () => setTime(b.dataset.t));
function setTime(t) {
  engine.setTime(t);
  for (const b of $('timeBar').querySelectorAll('[data-t]')) b.classList.toggle('on', b.dataset.t === t);
  document.body.classList.toggle('night', t === 'night');
}
$('btnRotate').onclick = () => {
  engine.controls.autoRotate = !engine.controls.autoRotate;
  $('btnRotate').querySelector('.l').textContent = '自动环绕：' + (engine.controls.autoRotate ? '开' : '关');
  $('btnRotate').classList.toggle('on', engine.controls.autoRotate);
};
$('btnReset').onclick = () => resetView();
$('btnOverview').onclick = () => overview();
$('btnPlay').onclick = () => (state.playing ? stopStory() : playStory());
$('tgAxis').onclick = () => setMode(state.mode === 1 ? 0 : 1);
$('tgChange').onclick = () => setMode(state.mode === 2 ? 0 : 2);
function setMode(m) {
  if (state.view === 'map') m = 0;
  state.mode = m;
  engine.U.uMode.value = m;
  $('tgAxis').classList.toggle('on', m === 1);
  $('tgChange').classList.toggle('on', m === 2);
  axisLine.visible = m === 1;
  if (m === 2) openPanel('changes');
  if (m === 1) openPanel('nodes');
}
$('tgLabels').onclick = () => {
  labels.visible = !labels.visible;
  $('tgLabels').classList.toggle('on', labels.visible);
};
$('btnTour').onclick = () => { if (tour.active) tour.stop(); else if (state.view && state.view !== 'map') tour.openPicker(state.view); };
$('btnPanel').onclick = () => {
  const hidden = $('panel').classList.contains('hide');
  if (hidden) openPanel(state.tab); else closePanel();
};
$('btnAbout').onclick = () => $('about').classList.remove('hide');
$('aboutClose').onclick = () => $('about').classList.add('hide');
$('about').addEventListener('click', (e) => { if (e.target === $('about')) $('about').classList.add('hide'); });
$('infoClose').onclick = () => select(null);
$('storyGo').onclick = () => { const k = $('storyGo').dataset.era; stopStory(); if (k) go(k); };

// ---------------------------------------------------------------------------
// 侧栏
// ---------------------------------------------------------------------------
const TABS = {
  map: [['story', '变迁'], ['coords', '坐标']],
  era: [['overview', '概述'], ['nodes', '轴线'], ['changes', '变化'], ['coords', '坐标']],
};
function tabsFor() {
  const t = state.view === 'map' ? TABS.map.slice() : TABS.era.slice();
  if (state.view === 'modern') t.push(['heritage', '遗产']);
  return t;
}
function openPanel(tab) {
  const tabs = tabsFor();
  if (!tab || !tabs.some(([k]) => k === tab)) tab = tabs[0][0];
  state.tab = tab;
  if (mobile) $('info').classList.add('hide');
  $('panel').classList.remove('hide');
  $('btnPanel').classList.add('on');
  renderPanel();
}
function closePanel() {
  $('panel').classList.add('hide');
  $('btnPanel').classList.remove('on');
}
function llText(lon, lat) {
  const p = nearestPlace(lon, lat);
  return `${fmtLL(lon, lat)}${p.dist < 1600 ? ` · 今${p.name}${p.dist > 350 ? '附近' : ''}` : ''}`;
}
function renderPanel() {
  const tabs = tabsFor();
  const tab = tabs.some(([k]) => k === state.tab) ? state.tab : tabs[0][0];
  $('tabs').innerHTML = tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('');
  for (const b of $('tabs').querySelectorAll('button')) b.addEventListener('click', () => openPanel(b.dataset.tab));
  const body = $('tabBody');
  if (state.view === 'map') {
    if (tab === 'story') {
      body.innerHTML = `<h3>为什么中轴线在这里</h3><p>北京城址的迁移，归根到底是水源的选择：金中都靠莲花池，元大都改依高梁河—积水潭。中轴线随之从约东经 116.344° 移到 116.391°，此后明清在元城基础上北缩南扩，城址不再移动。</p>
        ${STORY.map((s) => `<div class="chg" style="--c:${ERA_CSS[s.era]}"><b style="background:${ERA_CSS[s.era]}">${s.year}</b><strong>${s.title}</strong>　${s.text} <button class="chip" data-go="${s.era}" style="margin-left:4px">进入</button></div>`).join('')}`;
    } else {
      const row = (n, c, axis) => {
        const lons = c.wall.map((p) => p[0]), lats = c.wall.map((p) => p[1]);
        return `<li><b style="color:${ERA_CSS[n]}">${eraOf(n).full}</b><br>城墙：东经 ${Math.min(...lons).toFixed(3)}—${Math.max(...lons).toFixed(3)}°，北纬 ${Math.min(...lats).toFixed(3)}—${Math.max(...lats).toFixed(3)}°<br>中轴线：东经 ${axis.toFixed(3)}°</li>`;
      };
      body.innerHTML = `<h3>各朝代城址坐标（WGS84，约百米精度）</h3><ul>${row('jin', CITIES.jin, CITIES.jin.axis[0][0])}${row('yuan', CITIES.yuan, CITIES.yuan.axis[0][0])}${row('ming', CITIES.ming, CITIES.ming.axis[0][0])}</ul>
        <p style="color:var(--ink-dim);margin-top:8px">清代沿用明城，城址坐标相同。今二环路大体沿明清城墙旧址修建。经纬度 0.01° 在北京约相当于东西 0.85 公里、南北 1.1 公里。</p>`;
    }
  } else {
    const E = eraOf(state.view);
    const meta = state.meta[state.view];
    if (tab === 'overview') {
      body.innerHTML = `<h3>${E.full} · ${E.years}</h3><p>${E.summary}</p>
        <h3>画面时间</h3><p>${E.scene}</p>
        <h3>中轴线</h3><p>${E.axis}</p><p style="color:var(--ink-dim)">长度：${E.length}</p>
        <h3>看点</h3><ul>${E.traits.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    } else if (tab === 'nodes') {
      const nodes = meta ? meta.nodes : [];
      body.innerHTML = `<h3>由南向北 · 共 ${nodes.length} 处</h3><ul class="node-list">${nodes.map((n) => `<li><button data-id="${n.id}"><span class="dot"></span><span class="nm">${nameOf(n.id, state.view) || n.label}</span><span class="tg">${(INFO[n.id] && INFO[n.id].tag || '').split(' · ')[0]}</span></button></li>`).join('')}</ul>`;
    } else if (tab === 'changes') {
      const prev = ERAS[ERA_KEYS.indexOf(state.view) - 1];
      body.innerHTML = `<h3>${prev ? `相较${prev.full}` : '开端'}</h3>${E.changes.map(([k, v]) => `<div class="chg"><b>${k}</b>${v}</div>`).join('')}
        <p style="color:var(--ink-dim);margin-top:10px">打开“变迁”可在场景中高亮本时期新建或改建的建筑。</p>`;
    } else if (tab === 'coords') {
      const nodes = meta ? meta.nodes : [];
      body.innerHTML = `<h3>轴线建筑的真实坐标</h3><ul class="node-list">${nodes.map((n) => {
        const [lon, lat] = eraToLL(state.view, n.x, n.z);
        return `<li><button data-id="${n.id}"><span class="dot"></span><span class="nm">${nameOf(n.id, state.view) || n.label}</span><span class="tg">${lat.toFixed(4)}°N</span></button></li>`;
      }).join('')}</ul><p style="color:var(--ink-dim);margin-top:8px">中轴线约在东经 ${(state.view === 'jin' ? 116.344 : 116.391).toFixed(3)}°。场景为示意比例，四周刻度标出真实经纬度；右下角小地图为真实比例。</p>`;
    } else if (tab === 'heritage') {
      body.innerHTML = `<h3>15 处遗产构成要素（2024）</h3><ul class="heritage">${HERITAGE.map(([id, nm], i) => `<li><button data-id="${id}"><span>${String(i + 1).padStart(2, '0')}</span>${nm}</button></li>`).join('')}</ul>
        <p style="color:var(--ink-dim);margin-top:10px">由北向南排列。点击可定位。</p>`;
    }
  }
  for (const b of body.querySelectorAll('button[data-id]')) b.addEventListener('click', () => { select(b.dataset.id, true); if (mobile) closePanel(); });
  for (const b of body.querySelectorAll('button[data-go]')) b.addEventListener('click', () => { if (mobile) closePanel(); go(b.dataset.go); });
}

// ---------------------------------------------------------------------------
// 点选与信息卡
// ---------------------------------------------------------------------------
const selBox = new THREE.Box3Helper(new THREE.Box3(), 0xffc94d);
selBox.material.depthTest = false;
selBox.material.transparent = true;
selBox.renderOrder = 999;
selBox.visible = false;
engine.scene.add(selBox);

function visibleItems() {
  const m = state.meta[state.view];
  if (!m) return [];
  if (state.view !== 'map') return m.items;
  const hidden = new Set(engine.current.userData.heroes.filter((h) => h.hidden).map((h) => h.id));
  return m.items.filter((i) => !hidden.has(i.id) || engine.current.userData.heroes.some((h) => h.id === i.id && !h.hidden));
}
function findItem(id) {
  const list = visibleItems().filter((i) => i.id === id);
  if (!list.length) return null;
  const box = new THREE.Box3();
  for (const i of list) box.union(i.box);
  return box;
}

function select(id, fly, noCard) {
  state.selected = id;
  labels.select(id);
  if (!id) { $('info').classList.add('hide'); selBox.visible = false; return; }
  const box = findItem(id);
  if (box) {
    selBox.box.copy(box).expandByScalar(0.6);
    selBox.visible = true;
    if (fly) flyToBox(box);
  } else selBox.visible = false;
  if (noCard) { $('info').classList.add('hide'); return; }
  showInfo(id, box);
}

function showInfo(id, box) {
  const it = INFO[id];
  const era = state.view === 'map' ? (state.lastEra || 'qing') : state.view;
  $('infoTag').textContent = it ? it.tag : '';
  $('infoName').textContent = (it && nameOf(id, era)) || id;
  let desc = (it && descOf(id, era)) || '';
  if (box) {
    const c = box.getCenter(new THREE.Vector3());
    const [lon, lat] = state.view === 'map' ? mapLL(c.x, c.z) : eraToLL(state.view, c.x, c.z);
    desc += `\n坐标：${llText(lon, lat)}`;
  }
  $('infoDesc').textContent = desc;
  const row = $('infoEras');
  row.innerHTML = '';
  if (box) {
    const fly = document.createElement('button');
    fly.className = 'chip fly';
    fly.textContent = '定位';
    fly.onclick = () => flyToBox(box);
    row.appendChild(fly);
  }
  // 四朝对照：同一角色的建筑，或同一座建筑在不同时期
  const lin = lineageOf(id);
  if (lin) {
    const t = document.createElement('span');
    t.className = 'lin';
    t.textContent = `四朝对照 · ${lin.role}`;
    row.appendChild(t);
  }
  for (const e of ERAS) {
    const tid = lin ? lin[e.key] : id;
    if (!tid) continue;
    const m = state.meta[e.key];
    if (!lin && !(m && m.ids.has(id))) continue;
    const c = document.createElement('button');
    c.className = 'chip' + (e.key === state.view ? ' on' : '');
    c.style.setProperty('--c', ERA_CSS[e.key]);
    c.textContent = `${e.name}·${nameOf(tid, e.key) || ''}`;
    c.onclick = () => { if (e.key !== state.view) go(e.key, { keepSel: tid }); };
    row.appendChild(c);
  }
  if (mobile) closePanel();
  $('info').classList.remove('hide');
}

function flyToBox(box, dur = 1.5) {
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.z, s.y * 1.5);
  const k = state.view === 'map' ? 3 : 1;
  const dist = Math.max(32 * k, Math.min(260 * k, r * 2.1 + 22 * k)) * (mobile ? 1.25 : 1);
  const cam = engine.camera.position.clone().sub(engine.controls.target);
  cam.y = 0;
  if (cam.lengthSq() < 1) cam.set(0.6, 0, 1);
  cam.normalize();
  const off = cam.multiplyScalar(dist * 0.72).add(new THREE.Vector3(0, dist * 0.7, 0));
  engine.flyTo([c.x, Math.min(c.y, 6), c.z], [off.x, off.y, off.z], dur);
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
const cv = engine.renderer.domElement;
cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; tour.pause(); if (state.playing) stopStory(); });
cv.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const dt = performance.now() - down.t;
  down = null;
  if (moved > 6 || dt > 600 || tour.active) return;
  pick(e.clientX, e.clientY);
});
function pick(x, y) {
  const items = visibleItems();
  if (!items.length) return;
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, engine.camera);
  let best = null, bd = Infinity, bv = Infinity;
  const p = new THREE.Vector3();
  for (const it of items) {
    const hit = ray.ray.intersectBox(it.box, p);
    if (!hit) continue;
    const d = p.distanceTo(ray.ray.origin);
    const s = it.box.getSize(new THREE.Vector3());
    const vol = s.x * s.y * s.z;
    if (d < bd - 3 || (Math.abs(d - bd) <= 3 && vol < bv)) { best = it; bd = d; bv = vol; }
  }
  if (best) select(best.id, false);
  else select(null);
}

// ---------------------------------------------------------------------------
// 中轴线光带（朝代场景）
// ---------------------------------------------------------------------------
const axisMat = new THREE.ShaderMaterial({
  transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: engine.U.uTime, uZ0: { value: 0 }, uZ1: { value: -500 }, uExt: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }',
  fragmentShader: `uniform float uTime; uniform float uZ0; uniform float uZ1; uniform float uExt; varying vec3 vP;
    void main(){
      float inside = step(uZ1, vP.z) * step(vP.z, uZ0);
      float edge = 1.0 - smoothstep(0.0, 1.0, abs(vP.x) / 1.6);
      float pulse = 0.55 + 0.45 * sin((vP.z * 0.06) + uTime * 3.0);
      float dash = step(0.5, fract(vP.z / 6.0));
      float a = inside > 0.5 ? (0.55 + 0.45 * pulse) : uExt * dash * 0.45;
      gl_FragColor = vec4(vec3(1.0, 0.72, 0.25) * a * edge, 1.0);
    }`,
});
const axisLine = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1).rotateX(-Math.PI / 2), axisMat);
axisLine.renderOrder = 998;
axisLine.visible = false;
engine.scene.add(axisLine);
function updateAxisRange() {
  const m = state.meta[state.view];
  if (!m || !m.nodes.length) return;
  const b = m.bounds;
  axisLine.scale.z = b.z1 - b.z0;
  axisLine.position.set(0, 0.3, (b.z0 + b.z1) / 2);
  const zs = m.nodes.map((n) => n.z);
  axisMat.uniforms.uZ0.value = Math.max(...zs) + 6;
  axisMat.uniforms.uZ1.value = Math.min(...zs) - 6;
  axisMat.uniforms.uExt.value = state.view === 'modern' ? 1 : 0;
}

// ---------------------------------------------------------------------------
// 小地图（真实比例总图）、指北针、坐标读数
// ---------------------------------------------------------------------------
const miniCv = $('miniCv');
const MB = MAP.bounds;
const MNX = MB.x1 - MB.x0 + 1, MNZ = MB.z1 - MB.z0 + 1;
const miniW = 120, miniH = Math.round(miniW * MNZ / MNX);
miniCv.width = miniW * 2; miniCv.height = miniH * 2;
miniCv.style.width = miniW + 'px'; miniCv.style.height = miniH + 'px';
const miniBase = document.createElement('canvas');
function drawMiniBase(g) {
  miniBase.width = g.width; miniBase.height = g.height;
  const ctx = miniBase.getContext('2d');
  const img = ctx.createImageData(g.width, g.height);
  for (let row = 0; row < g.height; row++) {
    const src = (g.height - 1 - row) * g.width * 4;
    img.data.set(g.color.subarray(src, src + g.width * 4), row * g.width * 4);
  }
  ctx.putImageData(img, 0, 0);
}
function miniPx(lon, lat) {
  const [x, z] = mapXZ(lon, lat);
  return [(x - MB.x0) / MNX * miniCv.width, (z - MB.z0) / MNZ * miniCv.height];
}
function drawMini() {
  const ctx = miniCv.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(miniBase, 0, 0, miniCv.width, miniCv.height);
  const era = state.view;
  const c = CITIES[era];
  if (c) {
    ctx.strokeStyle = ERA_CSS[era];
    ctx.lineWidth = 3;
    const poly = c.wall || c.ring2;
    ctx.beginPath();
    poly.forEach(([lo, la], i) => { const [x, y] = miniPx(lo, la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    c.axis.forEach(([lo, la], i) => { const [x, y] = miniPx(lo, la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  }
  const t = engine.controls.target;
  const [lon, lat] = eraToLL(era, t.x, t.z);
  const [px, pz] = miniPx(lon, lat);
  ctx.fillStyle = 'rgba(255, 210, 90, 0.4)';
  ctx.strokeStyle = '#ffd25a';
  ctx.lineWidth = 2;
  const dir = t.clone().sub(engine.camera.position);
  const ang = Math.atan2(dir.x, dir.z);
  const span = 14;
  ctx.beginPath();
  ctx.moveTo(px - Math.sin(ang) * span * 0.6, pz - Math.cos(ang) * span * 0.6);
  ctx.lineTo(px + Math.sin(ang + 0.6) * span, pz + Math.cos(ang + 0.6) * span);
  ctx.lineTo(px + Math.sin(ang - 0.6) * span, pz + Math.cos(ang - 0.6) * span);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(px, pz, 4, 0, Math.PI * 2); ctx.fill();
}
$('mini').addEventListener('click', (e) => {
  if (state.view === 'map' || !state.view) return;
  const r = miniCv.getBoundingClientRect();
  const x = MB.x0 + ((e.clientX - r.left) / r.width) * MNX;
  const z = MB.z0 + ((e.clientY - r.top) / r.height) * MNZ;
  const [lon, lat] = mapLL(x, z);
  const [ex, ez] = llToEra(state.view, lon, lat);
  const b = state.meta[state.view].bounds;
  const off = engine.camera.position.clone().sub(engine.controls.target);
  engine.flyTo([Math.max(b.x0, Math.min(b.x1, ex)), 0, Math.max(b.z0, Math.min(b.z1, ez))], [off.x, off.y, off.z], 1.0);
});
function placeCompass() {
  const cmp = $('compass');
  const miniShown = getComputedStyle($('mini')).display !== 'none';
  cmp.style.bottom = miniShown ? (96 + miniH + 14) + 'px' : `calc(124px + env(safe-area-inset-bottom))`;
}
addEventListener('resize', placeCompass);

function updateCoord() {
  if (!state.view) return;
  const t = engine.controls.target;
  const [lon, lat] = state.view === 'map' ? mapLL(t.x, t.z) : eraToLL(state.view, t.x, t.z);
  const p = nearestPlace(lon, lat);
  $('coordLine').innerHTML = `画面中心 ${lat.toFixed(4)}°N ${lon.toFixed(4)}°E${p.dist < 1600 ? ` · <b>今${p.name}${p.dist > 350 ? '附近' : ''}</b>` : ''}`;
}

// ---------------------------------------------------------------------------
// 标注：总图（朝代名、经纬度）与朝代场景（经纬度刻度）
// ---------------------------------------------------------------------------
function mapLabels() {
  const L = state.meta.map.labels.slice();
  const name = { jin: '金中都 1153', yuan: '元大都 1267', ming: '明北京 1420 · 1553', qing: '清北京 1644', modern: '今 · 二环路' };
  const at = { jin: [116.3300, 39.8930], yuan: [116.4150, 39.9700], ming: [116.4380, 39.9180], qing: [116.3500, 39.9180], modern: [116.4560, 39.9620] };
  for (const k of ERA_KEYS) {
    const [x, z] = mapXZ(...at[k]);
    L.push({ text: name[k], x, y: 8, z, kind: 'era', color: ERA_CSS[k], era: k });
  }
  const ref = [['莲花池', 116.3150, 39.8955], ['玉渊潭', 116.3150, 39.9170], ['什刹海', 116.3800, 39.9440], ['北海', 116.3840, 39.9290], ['中南海', 116.3820, 39.9120],
    ['陶然亭', 116.3790, 39.8760], ['龙潭湖', 116.4330, 39.8800], ['长河', 116.3300, 39.9440], ['凉水河', 116.4000, 39.8545], ['通惠河', 116.4560, 39.9045],
    ['北京西站', 116.3215, 39.8945], ['北京南站', 116.3786, 39.8652], ['中央电视塔', 116.3003, 39.9170], ['鸟巢', 116.3966, 39.9929], ['天安门', 116.3911, 39.9072],
    ['三环路', 116.4610, 39.9300], ['天宁寺塔', 116.3420, 39.8962], ['妙应寺白塔', 116.3582, 39.9235]];
  for (const [t, lo, la] of ref) {
    const [x, z] = mapXZ(lo, la);
    L.push({ text: t, x, y: 3, z, kind: t.includes('站') || t.includes('塔') || t === '鸟巢' || t === '天安门' || t === '三环路' ? 'mapicon' : 'geo', id: t === '天宁寺塔' ? 'tianningsi' : t === '妙应寺白塔' ? 'miaoying-baita' : undefined });
  }
  return L.concat(mapView.coordLabels());
}
function eraCoordLabels(era) {
  const b = state.meta[era].bounds;
  const L = [];
  const [lon0, lat1] = eraToLL(era, b.x0, b.z0), [lon1, lat0] = eraToLL(era, b.x1, b.z1);
  for (let lat = Math.ceil(lat0 / 0.005) * 0.005; lat <= lat1; lat += 0.005) {
    const [, z] = llToEra(era, 116.39, lat);
    if (z < b.z0 + 4 || z > b.z1 - 4) continue;
    L.push({ text: `${lat.toFixed(3)}°N`, x: b.x0 + 2, y: 1, z, kind: 'coord' });
  }
  for (let lon = Math.ceil(lon0 / 0.01) * 0.01; lon <= lon1; lon += 0.01) {
    const [x] = llToEra(era, lon, 39.9);
    if (x < b.x0 + 6 || x > b.x1 - 6) continue;
    L.push({ text: `${lon.toFixed(2)}°E`, x, y: 1, z: b.z1 - 2, kind: 'coord' });
  }
  return L;
}

// 总图上按朝代显示地标小模型
function setMapIcons(era) {
  const g = engine.eraGroups.map;
  if (!g) return;
  for (const h of g.userData.heroes) {
    const tags = (h.tag || '').split(',');
    let show;
    if (!era) show = h.tag && (tags.includes('modern') || h.id === 'jin-gongcheng' || h.id === 'tianningsi');
    else show = tags.includes(era);
    h.hidden = !show;
    engine.applyLOD(h);
  }
}
function setMapFocus(era) {
  mapView.setFocus(era);
  setMapIcons(era);
  for (const l of labels.list) if (l.kind === 'era') l.el.classList.toggle('dim', !!era && l.era !== era);
}

// ---------------------------------------------------------------------------
// 视角
// ---------------------------------------------------------------------------
const portrait = () => innerHeight > innerWidth;
function viewFor(key) {
  if (key === 'map') return portrait() ? { t: [-30, 0, -50], o: [0, 2050, 860] } : { t: [-36, 0, -70], o: [260, 760, 640] };
  if (key === 'jin') return portrait() ? { t: [0, 0, -20], o: [60, 330, 300] } : { t: [0, 0, -16], o: [150, 165, 205] };
  return portrait() ? { t: [0, 0, -282], o: [70, 300, 270] } : { t: [0, 0, -284], o: [150, 175, 215] };
}
function mapFocusView(era) {
  const c = CITIES[era];
  const [x, z] = mapXZ(...c.center);
  const d = { jin: 1.25, yuan: 2.0, ming: 2.0, qing: 2.0, modern: 2.7 }[era];
  const o = portrait() ? [0, 420 * d, 200 * d] : [80 * d, 200 * d, 190 * d];
  return { t: [x, 0, z], o };
}
function resetView(dur = 1.4) {
  const v = state.view === 'map' ? viewFor('map') : viewFor(state.view);
  engine.flyTo(v.t, v.o, dur);
}
function overview(dur = 1.6) {
  if (state.view === 'map') { resetView(dur); return; }
  const b = state.meta[state.view].bounds;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, D = Math.max(b.x1 - b.x0, b.z1 - b.z0);
  if (portrait()) engine.flyTo([cx, 0, cz], [0, D * 1.95, D * 0.9], dur);
  else engine.flyTo([cx, 0, cz], [D * 0.52, D * 0.88, D * 0.74], dur);
}
function setCam(v) {
  engine.flight = null;
  engine.controls.target.set(...v.t);
  engine.camera.position.set(v.t[0] + v.o[0], v.t[1] + v.o[1], v.t[2] + v.o[2]);
}

// ---------------------------------------------------------------------------
// 导览（路线、箭头、固定机位、实拍照片卡）
// ---------------------------------------------------------------------------
const tour = new Tour(engine, {
  boxOf: (id) => findItem(id),
  nameOf: (id) => nameOf(id, state.view) || (INFO[id] ? '' : id),
  tagOf: (id) => (INFO[id] ? INFO[id].tag : ''),
  descOf: (id) => descOf(id, state.view),
  eraName: (k) => eraOf(k).full,
  metaNodes: () => (state.meta[state.view] ? state.meta[state.view].nodes : []),
  toLL: (x, z) => eraToLL(state.view, x, z),
  // 视线检查：[普通体素高度, 重点建筑高度, 重点建筑编号]
  sightAt: (x, z) => {
    const m = state.meta[state.view];
    if (!m || !m.sight) return null;
    const b = m.bounds, ix = Math.floor(x) - b.x0, iz = Math.floor(z) - b.z0, nx = b.x1 - b.x0 + 1;
    if (ix < 0 || iz < 0 || ix >= nx || iz > b.z1 - b.z0) return null;
    const i = ix + nx * iz;
    return [m.sight.top[i], m.sight.heroTop[i], m.sight.heroIdx[i]];
  },
  credits: () => window.PHOTO_CREDITS || {},
  select: (id) => select(id, false, true),
  // 导览时站点标签（带序号）替换同一建筑原有的名称标签
  labelsSet: (extra, hide) => {
    if (!extra) return labels.set(state.baseLabels);
    const ids = new Set(extra.map((l) => l.id));
    labels.set(state.baseLabels.filter((l) => !ids.has(l.id) && !(hide && hide.has(l.id))).concat(extra));
  },
  onStart: () => { $('btnTour').classList.add('on'); closePanel(); setMode(0); },
  onEnd: () => { select(null); $('btnTour').classList.remove('on'); },
});
function stopTour() { tour.stop(true); $('btnTour').classList.remove('on'); }
addEventListener('resize', () => tour.onResize());

// ---------------------------------------------------------------------------
// 总图上的变迁叙述
// ---------------------------------------------------------------------------
function showStory(era, opts = {}) {
  const s = STORY.find((q) => q.era === era);
  if (!s) { $('story').classList.add('hide'); return; }
  $('story').style.setProperty('--c', ERA_CSS[era]);
  $('storyYear').textContent = s.year;
  $('storyTitle').textContent = s.title;
  $('storyText').textContent = s.text;
  $('storyGo').dataset.era = era;
  $('storyGo').textContent = opts.going ? '正在进入…' : `进入${eraOf(era).full}`;
  $('storyGo').disabled = !!opts.going;
  $('story').classList.remove('hide');
}
async function playStory() {
  if (state.view !== 'map') { await go('map'); }
  state.playing = true;
  $('btnPlay').classList.add('on');
  $('btnPlay').textContent = '停止播放';
  let prev = null;
  for (const s of STORY) {
    if (!state.playing) break;
    setMapFocus(s.era);
    mapView.showArrow(prev, s.era);
    showStory(s.era);
    const v = mapFocusView(s.era);
    engine.flyTo(v.t, v.o, 1.1);
    for (let k = 0; k < 32 && state.playing; k++) await wait(100);
    prev = s.era;
  }
  if (state.playing) {
    stopStory();
    setMapFocus(null);
    mapView.clearArrow();
    $('story').classList.add('hide');
    resetView(1.8);
  }
}
function stopStory() {
  state.playing = false;
  $('btnPlay').classList.remove('on');
  $('btnPlay').textContent = '播放变迁';
}

// ---------------------------------------------------------------------------
// 场景切换：朝代之间必经总图
// ---------------------------------------------------------------------------
function showLoading(on, name) {
  $('loading').classList.toggle('hide', !on);
  if (name) $('loadingName').textContent = name;
}
async function veil(on) {
  $('veil').classList.toggle('on', on);
  await wait(240);
}
async function ensure(key) {
  if (state.meta[key]) return;
  showLoading(true, key === 'map' ? '总图' : eraOf(key).full);
  try { await requestScene(key); } finally { showLoading(false); }
}

async function go(target, opts = {}) {
  if (!SCENES.includes(target)) return;
  if (state.busy) { state.queued = target; markButtons(); return; }
  if (target === state.view && !opts.force) return;
  state.busy = true;
  state.queued = null;
  state.target = target;
  markButtons();
  stopTour();
  if (target !== 'map') stopStory();
  try {
    const from = state.view;
    if (target === 'map') {
      await toMap(from && from !== 'map' ? from : null);
      setMapFocus(null);
      mapView.clearArrow();
      $('story').classList.add('hide');
      resetView(1.6);
    } else {
      const fromEra = from && from !== 'map' ? from : state.lastEra;
      requestScene(target).catch(() => {});
      await toMap(from && from !== 'map' ? from : null);
      // 在总图上：高亮下一座城，画出迁移方向，飞过去
      setMapFocus(target);
      mapView.showArrow(fromEra && fromEra !== target ? fromEra : null, target);
      showStory(target, { going: true });
      const v = mapFocusView(target);
      engine.flyTo(v.t, v.o, 0.95);
      await wait(1050);
      await ensure(target);
      await enterEra(target, opts);
    }
  } catch (err) {
    console.error(err);
    showLoading(true, '营建失败，请刷新重试');
  } finally {
    state.busy = false;
    state.target = null;
    markButtons();
  }
  if (state.queued && state.queued !== state.view) { const q = state.queued; state.queued = null; go(q); }
  else prefetch();
}

async function toMap(fromEra) {
  await ensure('map');
  if (state.view === 'map') return;
  if (state.view) await veil(true);
  engine.showEra('map', !state.view);
  applySceneUI('map');
  if (fromEra) setCam(mapFocusView(fromEra));
  else if (!engine.flight) setCam(viewFor('map'));
  if ($('veil').classList.contains('on')) await veil(false);
}

async function enterEra(key, opts = {}) {
  await veil(true);
  $('story').classList.add('hide');
  mapView.clearArrow();
  engine.showEra(key, true);
  setCam(viewFor(key));
  applySceneUI(key);
  state.lastEra = key;
  await veil(false);
  flash(key);
  if (opts.keepSel && state.meta[key].ids.has(opts.keepSel)) select(opts.keepSel, false);
}

let flashTimer = null;
function flash(k) {
  const E = eraOf(k);
  $('flashName').textContent = E.full;
  $('flashYears').textContent = `${E.years} · ${E.scene}`;
  $('flash').classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => $('flash').classList.remove('show'), 1600);
}

function applySceneUI(key) {
  state.view = key;
  const isMap = key === 'map';
  document.body.classList.toggle('in-map', isMap);
  mapView.group.visible = isMap;
  engine.controls.maxDistance = isMap ? 2600 : 1100;
  engine.controls.minDistance = isMap ? 50 : 12;
  const m = state.meta[key];
  if (isMap) {
    $('eraName').textContent = '总图';
    $('eraYears').textContent = '1153—2024';
    $('eraScene').textContent = '真实比例 · 1 格约 25 米';
    $('scaleNote').textContent = '按真实经纬度绘制：叠合金中都、元大都、明清北京的城墙与今天的二环、三环；细线为经纬网（0.01° ≈ 1 公里）。点时间轴进入各朝代。';
    document.title = '中轴千年 · 总图';
    labels.rangeMul = 2.6;
    state.baseLabels = mapLabels();
    labels.set(state.baseLabels);
    setMapFocus(mapView.focus);
    $('legend').classList.remove('hide');
  } else {
    const E = eraOf(key);
    $('eraName').textContent = E.full;
    $('eraYears').textContent = E.years;
    $('eraScene').textContent = E.scene;
    $('scaleNote').textContent = '示意比例：建筑放大、间距按段压缩。四周刻度为真实经纬度（间距不均即压缩所致），右下角小地图为真实比例；靠近建筑可见细部。';
    document.title = `中轴千年 · ${E.full}`;
    labels.rangeMul = 1;
    state.baseLabels = m.labels.concat(eraCoordLabels(key));
    labels.set(state.baseLabels);
    $('legend').classList.add('hide');
    updateAxisRange();
  }
  setMode(isMap ? 0 : state.mode);
  placeCompass();
  if (!$('panel').classList.contains('hide')) renderPanel();
  if (state.selected) {
    if (m.ids.has(state.selected) && !isMap) select(state.selected, false);
    else select(null);
  }
  markButtons();
  updateCoord();
}

function prefetch() {
  if (!worker) return;
  const cur = Math.max(0, ERA_KEYS.indexOf(state.view === 'map' ? (state.lastEra || 'jin') : state.view));
  const order = [...ERA_KEYS].sort((a, b) => Math.abs(ERA_KEYS.indexOf(a) - cur) - Math.abs(ERA_KEYS.indexOf(b) - cur));
  const next = order.find((k) => !state.meta[k] && !inflight[k] && (!mobile || Math.abs(ERA_KEYS.indexOf(k) - cur) <= 1));
  if (next) requestScene(next).then(() => setTimeout(prefetch, 300)).catch(() => {});
}

// ---------------------------------------------------------------------------
// 键盘
// ---------------------------------------------------------------------------
addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase();
  if (tour.active) {
    if (k === 'arrowright') { tour.go(tour.i + 1); return; }
    if (k === 'arrowleft') { tour.go(tour.i - 1); return; }
    if (k === ' ') { e.preventDefault(); tour.setAuto(!tour.auto); return; }
    if (k === 'escape') { tour.stop(); return; }
  }
  if (k === '1') setTime('morning');
  else if (k === '2') setTime('dusk');
  else if (k === '3') setTime('night');
  else if (k === 'arrowleft' || k === 'q') step(-1);
  else if (k === 'arrowright' || k === 'e') step(1);
  else if (k === 'm') go('map');
  else if (k === 'r') resetView();
  else if (k === 'o') overview();
  else if (k === 'f') $('fps').hidden = !$('fps').hidden;
  else if (k === 'escape') { select(null); $('about').classList.add('hide'); stopStory(); }
});

// ---------------------------------------------------------------------------
// 每帧
// ---------------------------------------------------------------------------
let slowTick = 0, lodTick = 0;
const needle = $('needle');
engine.onFrame.push((dt, raw) => {
  labels.update(state.mode === 1);
  tour.update(raw);
  mapView.tick(dt, raw);
  if (selBox.visible) selBox.material.opacity = 0.55 + 0.45 * Math.sin(engine.U.uTime.value * 4);
  if ((lodTick += raw) > 0.25 && state.view && state.view !== 'map') {
    lodTick = 0;
    for (const idx of engine.lodTick(mobile ? 6 : 12)) fineQueue.push({ key: state.view, idx });
    pumpFine();
  }
  if ((slowTick += raw) > 0.15) {
    slowTick = 0;
    if (miniBase.width && state.view !== 'map') drawMini();
    const dir = engine.controls.target.clone().sub(engine.camera.position);
    needle.style.transform = `rotate(${(-Math.atan2(dir.x, -dir.z) * 180 / Math.PI).toFixed(1)}deg)`;
    updateCoord();
    if (!$('fps').hidden) $('fps').textContent = `${engine.fps.toFixed(0)} fps · ${engine.renderer.info.render.triangles.toLocaleString()} 三角面`;
  }
});
engine.controls.addEventListener('start', () => { tour.pause(); if (state.playing) stopStory(); });

// ---------------------------------------------------------------------------
// 启动：先看总图，播放一遍变迁
// ---------------------------------------------------------------------------
const startTime = TIMES[params.get('time')] ? params.get('time') : 'morning';
setTime(startTime);
engine.setTime(startTime, true);
engine.start();
const startEra = SCENES.includes(params.get('era')) ? params.get('era') : 'map';
(async () => {
  await ensure('map');
  const v = viewFor('map');
  setCam({ t: v.t, o: v.o.map((n) => n * 1.35) });
  await toMap(null);
  engine.flyTo(v.t, v.o, 2.0);
  if (startEra !== 'map') {
    await ensure(startEra);
    await enterEra(startEra);
    if (params.get('cam')) {
      const c = params.get('cam').split(',').map(Number);
      setCam({ t: [c[0], c[1], c[2]], o: [c[3], c[4], c[5]] });
    }
  } else if (!params.has('noplay')) {
    setTimeout(() => { if (state.view === 'map' && !state.busy) playStory(); }, 1600);
  }
  if (params.get('panel')) openPanel(params.get('panel'));
  if (params.get('sel')) select(params.get('sel'), false);
  if (params.get('mode')) setMode(+params.get('mode'));
  prefetch();
  window.__ready = true;
})();
window.__app = { engine, state, go, select, setMode, setTime, playStory, mapView, tour };
window.__tour = tour;
