// 导览：箭头在建筑之间跳跃前进，镜头按固定机位飞到每一站，右侧（手机为底部）显示实拍照片与“历史 / 用途 / 看点”
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STOPS, routesFor, stopText } from './tourdata.js';

const HOP = 0.7;      // 箭头跳一站的时间（秒）
const FLY = 0.85;     // 镜头飞行时间（秒）
const $ = (id) => document.getElementById(id);

// —— 体素风格的箭头：两片十字交叉的像素箭头，尖端朝下 ——
function makeArrow() {
  const geos = [];
  const add = (x, y, w, h) => { const g = new THREE.BoxGeometry(w, h, 1); g.translate(x, y + h / 2, 0); geos.push(g); };
  add(0, 0, 1, 1); add(0, 1, 3, 1); add(0, 2, 5, 1); add(0, 3, 1.6, 3.2);
  const flat = mergeGeometries(geos);
  const cross = flat.clone(); cross.rotateY(Math.PI / 2);
  const geo = mergeGeometries([flat, cross]);
  const mat = new THREE.MeshLambertMaterial({ color: 0xe0402a, emissive: 0x6a1408 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  g.userData.mesh = mesh;
  return g;
}

function makeRing() {
  const g = new THREE.RingGeometry(0.86, 1, 64);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  const r = new THREE.Mesh(g, m);
  r.renderOrder = 6;
  return r;
}

function dashed(points, width, y, on = 3, off = 2.2) {
  const geos = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = -Math.atan2(b.z - a.z, b.x - a.x);
    for (let s = 0; s < len; s += on + off) {
      const e = Math.min(len, s + on);
      const t = (s + e) / 2 / len;
      const g = new THREE.BoxGeometry(e - s, 0.25, width);
      g.rotateY(ang);
      g.translate(a.x + (b.x - a.x) * t, y, a.z + (b.z - a.z) * t);
      geos.push(g);
    }
  }
  return geos.length ? mergeGeometries(geos) : null;
}

export class Tour {
  // hooks: { boxOf(id), nameOf(id), tagOf(id), descOf(id), labelsSet(extra, hideIds), select(id), metaNodes(), toLL(x,z), sightAt(x,z), credits(), onStart(), onEnd() }
  constructor(engine, hooks) {
    this.engine = engine;
    this.hooks = hooks;
    this.active = false;
    this.arrow = makeArrow();
    this.ring = makeRing();
    this.arrow.visible = this.ring.visible = false;
    engine.scene.add(this.arrow, this.ring);
    this.pathMesh = null; this.legMesh = null;
    this.pathMat = new THREE.MeshBasicMaterial({ color: 0xf5c242, transparent: true, opacity: 0.8, depthWrite: false });
    this.legMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95, depthWrite: false });
    this.t = 0;
    this.hop = null;
    this.dwell = 0; this.dwellMax = 0;
    this.auto = true;
    this.bindUI();
  }

  bindUI() {
    $('tcPrev').onclick = () => this.go(this.i - 1);
    $('tcNext').onclick = () => this.go(this.i + 1);
    $('tcPlay').onclick = () => this.setAuto(!this.auto);
    $('tcExit').onclick = () => this.stop();
    $('routeClose').onclick = () => $('routePick').classList.add('hide');
    $('routePick').addEventListener('click', (e) => { if (e.target === $('routePick')) $('routePick').classList.add('hide'); });
    // 照片按“站点-时期.jpg → 站点.jpg”的顺序找，都没有就显示机位说明
    const img = $('tcImg');
    img.addEventListener('load', () => { $('tcPhoto').classList.add('has'); });
    img.addEventListener('error', () => {
      const next = this.photoQueue && this.photoQueue.shift();
      if (next) { this.setCredit(next.key); img.src = next.src; } else $('tcPhoto').classList.remove('has');
    });
  }

  // —— 路线选择 ——
  openPicker(era) {
    this.era = era;
    const routes = routesFor(era, this.hooks.metaNodes());
    const list = $('routeList');
    list.innerHTML = '';
    for (const r of routes) {
      const stops = r.parts.flatMap((p) => p.stops).filter((id) => this.hooks.boxOf(id));
      const km = this.distance(stops);
      const b = document.createElement('button');
      b.className = 'route';
      b.innerHTML = `<b>${r.name}</b><span>${r.sub}</span>
        <em>${r.parts.length > 1 ? r.parts.map((p) => p.name).join(' / ') : `共 ${stops.length} 站`}</em>
        <i>${stops.length} 站 · 实地约 ${km.toFixed(1)} 公里（各站直线距离累计）</i>`;
      b.onclick = () => { $('routePick').classList.add('hide'); this.start(era, r); };
      list.appendChild(b);
    }
    $('routeEra').textContent = this.hooks.eraName(era);
    $('routePick').classList.remove('hide');
  }

  distance(ids) {
    let d = 0, prev = null;
    for (const id of ids) {
      const b = this.hooks.boxOf(id);
      if (!b) continue;
      const c = b.getCenter(new THREE.Vector3());
      const [lon, lat] = this.hooks.toLL(c.x, c.z);
      if (prev) d += Math.hypot((lon - prev[0]) * 85390, (lat - prev[1]) * 111000);
      prev = [lon, lat];
    }
    return d / 1000;
  }

  // —— 开始 / 结束 ——
  start(era, route) {
    this.stop(true);
    this.era = era;
    this.route = route;
    this.list = [];
    route.parts.forEach((p, pi) => p.stops.forEach((id) => { const box = this.hooks.boxOf(id); if (box) this.list.push({ id, part: p.name, pi, box }); }));
    if (!this.list.length) return;
    this.active = true;
    this.i = -1;
    // 路线虚线与站号
    const pts = this.list.map((s) => { const c = s.box.getCenter(new THREE.Vector3()); return new THREE.Vector3(c.x, 0, c.z); });
    this.pts = pts;
    const g = dashed(pts, 1.3, 0.45);
    if (g) { this.pathMesh = new THREE.Mesh(g, this.pathMat); this.pathMesh.renderOrder = 4; this.engine.scene.add(this.pathMesh); }
    this.stopLabels = this.list.map((s, k) => ({ text: `${k + 1} ${this.hooks.nameOf(s.id)}`, x: pts[k].x, y: s.box.max.y + 1.5, z: pts[k].z, kind: 'stop', id: s.id }));
    this.hooks.labelsSet(this.stopLabels);
    document.body.classList.add('touring');
    $('tourCard').classList.remove('hide');
    $('tcRoute').textContent = route.name;
    this.engine.setInset(...this.inset());
    this.setAuto(true);
    this.hooks.onStart && this.hooks.onStart();
    this.go(0);
  }

  stop(silent) {
    if (!this.active) return;
    this.active = false;
    this.arrow.visible = this.ring.visible = false;
    for (const m of [this.pathMesh, this.legMesh]) if (m) { this.engine.scene.remove(m); m.geometry.dispose(); }
    this.pathMesh = this.legMesh = null;
    document.body.classList.remove('touring');
    $('tourCard').classList.add('hide');
    this.engine.setInset(0, 0);
    this.engine.setGhosts(null);
    this.hooks.labelsSet(null);
    if (!silent) this.hooks.onEnd && this.hooks.onEnd();
  }

  inset() {
    const mobile = innerWidth <= 760;
    if (mobile) return [0, Math.round(innerHeight * 0.46)];
    return [Math.min(420, innerWidth * 0.34) + 24, 0];
  }

  setAuto(on) {
    this.auto = on;
    $('tcPlay').textContent = on ? '暂停' : '继续';
    $('tcPlay').classList.toggle('on', !on);
  }
  pause() { if (this.active && this.auto) this.setAuto(false); }

  // —— 前往第 k 站 ——
  go(k) {
    if (!this.active) return;
    if (k < 0) k = 0;
    if (k >= this.list.length) { this.finish(); return; }
    const prev = this.i >= 0 ? this.list[this.i] : null;
    this.i = k;
    const s = this.list[k];
    const box = s.box;
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const top = new THREE.Vector3(c.x, box.max.y + 3.2, c.z);
    // 箭头抛物线跳跃
    const from = prev ? this.arrow.position.clone() : top.clone().add(new THREE.Vector3(0, 14, 0));
    this.hop = { from, to: top, t: 0, h: prev ? 6 + from.distanceTo(top) * 0.12 : 0 };
    this.arrow.visible = true;
    // 地面光圈
    const r = Math.max(size.x, size.z) * 0.62 + 2;
    this.ring.position.set(c.x, 0.5, c.z);
    this.ring.scale.setScalar(r);
    this.ring.visible = true;
    // 当前这一段高亮
    if (this.legMesh) { this.engine.scene.remove(this.legMesh); this.legMesh.geometry.dispose(); this.legMesh = null; }
    if (k > 0) {
      const g = dashed([this.pts[k - 1], this.pts[k]], 2.0, 0.55, 100, 0);
      if (g) { this.legMesh = new THREE.Mesh(g, this.legMat); this.legMesh.renderOrder = 5; this.engine.scene.add(this.legMesh); }
    }
    // 固定机位
    const T = stopText(s.id, this.era);
    const tgt = [c.x, Math.min(box.min.y + size.y * 0.42, 14), c.z];
    const v = this.viewFor(box, s.id, T ? T.view : [0, 22, 1]);
    this.engine.setGhosts(v.ghosts);
    // 半透明建筑的名称标签暂时隐去，免得浮在目标建筑上
    this.hooks.labelsSet(this.stopLabels, new Set(v.ghosts.map((h) => h.id)));
    this.engine.flyTo(tgt, v.o, FLY);
    this.hooks.select(s.id);
    this.render(s, T);
    this.dwell = 0;
    this.dwellMax = this.readTime(T, s.id);
    // 预载下一站照片
    const n = this.list[k + 1];
    if (n && this.photoOK()) { const im = new Image(); im.src = `photos/${n.id}.jpg`; }
  }

  // 按设定的方位角、仰角取景。树木、城墙挡住视线时抬高仰角或左右偏转；
  // 重点建筑挡在前面时（示意比例下院落被压缩，实拍机位常落在前一座门楼里）改为半透明
  viewFor(box, id, [az, el, dm]) {
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const rad = Math.max(size.x, size.z, size.y * 1.4);
    const mobile = innerWidth <= 760;
    const dist0 = Math.max(30, Math.min(210, rad * 1.85 + 16)) * dm * (mobile ? 1.25 : 1);
    const lookY = Math.min(box.min.y + size.y * 0.42, 14);
    const off = (a, e, d) => {
      a = (a * Math.PI) / 180; e = (e * Math.PI) / 180;
      return [Math.sin(a) * Math.cos(e) * d, Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d];
    };
    const S = this.hooks.sightAt;
    const cur = this.engine.current;
    const heroes = cur ? cur.userData.heroes : [];
    const own = new Set(heroes.filter((h) => h.id === id).map((h) => h.idx));
    const pad = 1.5;
    const inBox = (x, z) => x > box.min.x - pad && x < box.max.x + pad && z > box.min.z - pad && z < box.max.z + pad;
    const test = (o) => {
      const cam = [c.x + o[0], lookY + o[1], c.z + o[2]];
      const hz = Math.hypot(o[0], o[2]) || 1, fx = o[0] / hz, fz = o[2] / hz;
      const ext = Math.min(Math.abs(fx) > 1e-3 ? size.x / 2 / Math.abs(fx) : 1e9, Math.abs(fz) > 1e-3 ? size.z / 2 / Math.abs(fz) : 1e9);
      // 主视线：建筑中部、屋顶、朝向镜头一面的下部；辅助视线：两侧边缘与镜头前方的地面（前景）
      const half = (Math.abs(fz) * size.x + Math.abs(fx) * size.z) / 2 * 0.9;
      const lx = -fz, lz = fx;
      const fx0 = c.x + fx * ext * 0.9, fz0 = c.z + fz * ext * 0.9;
      const midY = box.min.y + size.y * 0.45;
      const pts = [
        [c.x, lookY, c.z, 0],
        [c.x, Math.max(lookY, box.max.y - 1.5), c.z, 0],
        [fx0, box.min.y + size.y * 0.2 + 0.5, fz0, 0],
      ];
      for (const side of [-1, -0.66, -0.33, 0.33, 0.66, 1]) pts.push([fx0 + lx * half * side, midY, fz0 + lz * half * side, 1]);
      for (const f of [0.25, 0.5]) for (const side of [-1, -0.5, 0, 0.5, 1]) {
        pts.push([c.x + fx * (ext + hz * f) + lx * half * side, 1.6, c.z + fz * (ext + hz * f) + lz * half * side, 1]);
      }
      let blocked = 0, fore = 0, near = 0;
      const ghosts = new Map();
      if (!S) return { blocked, fore, ghosts, near };
      for (const [px, py, pz, isFore] of pts) {
        // 起点若落在台基、山体之类的重点建筑上，不把它当作遮挡
        const q0 = S(px, pz), base = q0 && py < q0[1] + 0.6 ? q0[2] : 0;
        const L = Math.hypot(cam[0] - px, cam[2] - pz), steps = Math.ceil(L / 0.7);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps, x = px + (cam[0] - px) * t, z = pz + (cam[2] - pz) * t;
          if (inBox(x, z)) continue;
          const q = S(x, z);
          if (!q) continue;
          const y = py + (cam[1] - py) * t;
          if (y < q[0] + 0.6) { if (isFore) fore++; else blocked++; }
          if (y < q[1] + 0.6 && q[2] && q[2] !== base && !own.has(q[2])) ghosts.set(q[2], Math.max(ghosts.get(q[2]) || 0, t));
        }
      }
      // 贴近镜头的半透明建筑会糊满画面，镜头落在建筑里更不行
      for (const t of ghosts.values()) near += t >= 0.999 ? 40 : t > 0.7 ? 10 : 0;
      return { blocked, fore, ghosts, near };
    };
    let best = null;
    for (const dEl of [0, 8, 16, 26, 36]) {
      for (const dAz of [0, -20, 20, -40, 40]) {
        for (const k of [1, 0.8]) {
          const o = off(az + dAz, Math.min(72, el + dEl), dist0 * k);
          const r = test(o);
          const cost = Math.abs(dAz) * 0.5 + dEl + (k < 1 ? 5 : 0) + r.ghosts.size * 4 + r.near + Math.min(30, r.fore * 1.5) + (r.blocked ? 1000 + r.blocked : 0);
          if (!best || cost < best.cost) best = { o, ghosts: r.ghosts, cost };
        }
      }
    }
    return { o: best.o, ghosts: heroes.filter((h) => best.ghosts.has(h.idx)) };
  }

  finish() {
    this.setAuto(false);
    $('tcNum').textContent = '全程结束';
    $('tcNext').disabled = true;
  }

  photoOK() { return this.era === 'qing' || this.era === 'modern'; }

  readTime(T, id) {
    const len = T ? (T.hist + T.use + T.look).length : (this.hooks.descOf(id) || '').length;
    return Math.max(5, Math.min(11, 3 + len / 28));
  }

  render(s, T) {
    const k = this.i;
    $('tcNum').textContent = `第 ${k + 1} / ${this.list.length} 站`;
    $('tcPart').textContent = this.route.parts.length > 1 ? s.part : '';
    $('tcName').textContent = this.hooks.nameOf(s.id);
    $('tcTag').textContent = this.hooks.tagOf(s.id) || '';
    $('tcPrev').disabled = k === 0;
    $('tcNext').disabled = false;
    $('tcNext').textContent = k === this.list.length - 1 ? '结束' : '下一站';
    const body = $('tcBody');
    if (T) {
      body.innerHTML = `<dt>历史</dt><dd>${T.hist}</dd><dt>用途</dt><dd>${T.use}</dd><dt>看点</dt><dd>${T.look}</dd>`;
    } else {
      body.innerHTML = `<dt>介绍</dt><dd>${this.hooks.descOf(s.id) || ''}</dd>`;
    }
    // 实拍照片：photos/站点.jpg，缺失时显示机位说明
    const ph = $('tcPhoto');
    ph.hidden = !this.photoOK();
    if (this.photoOK()) {
      ph.classList.remove('has');
      $('tcShot').textContent = T ? `建议机位：${T.shot}` : '';
      const keys = [`${s.id}-${this.era}`, s.id];
      this.photoQueue = keys.map((key) => ({ key, src: `photos/${key}.jpg` }));
      const first = this.photoQueue.shift();
      this.setCredit(first.key);
      $('tcImg').src = first.src;
    }
    $('tcBar').style.width = '0%';
    $('tourCard').scrollTop = 0;
  }

  setCredit(key) {
    const cr = this.hooks.credits()[key];
    $('tcCredit').textContent = cr ? `图片：${cr}` : '';
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.hop) {
      const h = this.hop;
      h.t = Math.min(1, h.t + dt / HOP);
      const k = h.t < 0.5 ? 2 * h.t * h.t : 1 - Math.pow(-2 * h.t + 2, 2) / 2;
      this.arrow.position.lerpVectors(h.from, h.to, k);
      this.arrow.position.y += 4 * h.h * k * (1 - k);
      if (h.t >= 1) this.hop = null;
    } else {
      this.arrow.position.y += Math.sin(this.t * 4) * 0.03;
    }
    this.arrow.userData.mesh.rotation.y += dt * 1.6;
    // 箭头在画面里保持大致相同的大小，不至于近看时挡住建筑
    const d = this.engine.camera.position.distanceTo(this.arrow.position);
    this.arrow.userData.mesh.scale.setScalar(Math.max(0.5, Math.min(2.6, d * 0.0125)));
    this.ring.material.opacity = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(this.t * 5));
    if (this.auto && !this.hop && !this.engine.flight) {
      this.dwell += dt;
      $('tcBar').style.width = `${Math.min(100, (this.dwell / this.dwellMax) * 100).toFixed(1)}%`;
      if (this.dwell >= this.dwellMax) {
        if (this.i < this.list.length - 1) this.go(this.i + 1);
        else this.finish();
      }
    }
  }

  onResize() { if (this.active) this.engine.setInset(...this.inset()); }
}

export { STOPS };
