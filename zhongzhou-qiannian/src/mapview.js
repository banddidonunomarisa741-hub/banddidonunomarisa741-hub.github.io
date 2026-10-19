// 总图叠加层：各朝代城墙、宫城、中轴线、城门、变迁箭头（主线程绘制，可按朝代显隐、高亮）
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CITIES, mapXZ, mapLL, MAP } from './geo.js';

export const ERA_COLOR = { jin: 0x2f8f83, yuan: 0x3557b7, ming: 0xc8402a, qing: 0xd9a21b, modern: 0x3a3a44 };
export const ERA_CSS = { jin: '#2f8f83', yuan: '#3557b7', ming: '#c8402a', qing: '#d9a21b', modern: '#3a3a44' };
const LIFT = { jin: 1.0, yuan: 1.8, ming: 2.6, qing: 3.4, modern: 0.4 };
const P = ([lon, lat]) => mapXZ(lon, lat);

function ribbon(points, closed, width, height, y0) {
  const geos = [];
  const pts = points.map(P);
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    const g = new THREE.BoxGeometry(len + width, height, width);
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate((ax + bx) / 2, y0 + height / 2, (az + bz) / 2);
    geos.push(g);
  }
  return geos.length ? mergeGeometries(geos) : null;
}

function dashedRibbon(points, closed, width, height, y0, on = 8, off = 5) {
  const geos = [];
  const pts = points.map(P);
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const len = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < len; s += on + off) {
      const e = Math.min(len, s + on);
      const t0 = s / len, t1 = e / len;
      const g = new THREE.BoxGeometry(e - s, height, width);
      g.rotateY(-Math.atan2(bz - az, bx - ax));
      g.translate(ax + (bx - ax) * (t0 + t1) / 2, y0 + height / 2, az + (bz - az) * (t0 + t1) / 2);
      geos.push(g);
    }
  }
  return geos.length ? mergeGeometries(geos) : null;
}

function fill(points, y) {
  const shape = new THREE.Shape(points.map(P).map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

export class MapView {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group();
    this.group.visible = false;
    engine.scene.add(this.group);
    this.eras = {};
    this.arrow = null;
    this.t = 0;
    for (const key of ['jin', 'yuan', 'ming', 'qing', 'modern']) this.eras[key] = this.buildEra(key);
    this.setFocus(null);
  }

  buildEra(key) {
    const c = CITIES[key];
    const col = new THREE.Color(ERA_COLOR[key]);
    const g = new THREE.Group();
    const mats = [];
    const mat = (o = {}) => { const m = new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 1, ...o }); m.userData.base = o.opacity ?? 1; mats.push(m); return m; };
    const basic = (o = {}) => { const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1, depthWrite: false, ...o }); m.userData.base = o.opacity ?? 1; mats.push(m); return m; };
    const y = LIFT[key];
    let axis = null;
    if (key === 'modern') {
      const r2 = ribbon(c.ring2, false, 1.6, 0.6, 0.15);
      if (r2) g.add(new THREE.Mesh(r2, mat()));
      const r3 = dashedRibbon(c.ring3, false, 1.2, 0.5, 0.15);
      if (r3) g.add(new THREE.Mesh(r3, mat({ opacity: 0.7 })));
      const sq = new THREE.Mesh(fill(c.square, 0.3), basic({ opacity: 0.45, color: new THREE.Color(0xc8402a) }));
      g.add(sq);
    } else {
      const wl = ribbon(c.wall, true, key === 'qing' ? 1.3 : key === 'ming' ? 3.4 : 2.4, 1.4, y);
      g.add(new THREE.Mesh(wl, mat()));
      if (c.inner) { const il = ribbon(c.inner, false, 1.6, 1.0, y); g.add(new THREE.Mesh(il, mat({ opacity: 0.8 }))); }
      const hl = dashedRibbon(c.huang, true, 1.0, 0.8, y - 0.5, 4, 3);
      if (hl) g.add(new THREE.Mesh(hl, mat({ opacity: 0.85 })));
      g.add(new THREE.Mesh(fill(c.palace, 0.25 + y * 0.05), basic({ opacity: 0.42 })));
      const pl = ribbon(c.palace, true, 1.0, 1.2, 0.2);
      g.add(new THREE.Mesh(pl, mat()));
      // 城门
      const gg = [];
      for (const p of c.gates) {
        const [x, z] = P(p);
        const b = new THREE.BoxGeometry(4.2, 2.6, 4.2);
        b.translate(x, y + 1.3, z);
        gg.push(b);
      }
      g.add(new THREE.Mesh(mergeGeometries(gg), mat({ color: col.clone().multiplyScalar(0.8) })));
      if (c.water) g.add(new THREE.Mesh(fill(c.water, 0.35), basic({ color: new THREE.Color(0x4f8fc8), opacity: 0.5 })));
    }
    // 中轴线：发光带
    const ax = ribbon(c.axis, false, key === 'modern' ? 2.2 : 3.2, 0.3, 0.45 + y * 0.1);
    axis = new THREE.Mesh(ax, basic({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.15), opacity: key === 'modern' ? 0.7 : 0.95, blending: THREE.NormalBlending }));
    axis.renderOrder = 5;
    g.add(axis);
    this.group.add(g);
    return { group: g, mats, axis, center: P(c.center) };
  }

  setFocus(key, opts = {}) {
    this.focus = key;
    for (const [k, e] of Object.entries(this.eras)) {
      const visible = opts.only ? opts.only.includes(k) : true;
      e.group.visible = visible;
      const dim = key && k !== key;
      for (const m of e.mats) m.opacity = m.userData.base * (dim ? 0.16 : 1);
    }
  }

  // 变迁箭头：从一座城的中心指向下一座
  showArrow(from, to) {
    this.clearArrow();
    if (!from || !to || from === to) return;
    const a = this.eras[from].center, b = this.eras[to].center;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 20) return;
    const h = Math.min(90, 26 + d * 0.25);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(a[0], 6, a[1]),
      new THREE.Vector3((a[0] + b[0]) / 2, h, (a[1] + b[1]) / 2),
      new THREE.Vector3(b[0], 8, b[1]),
    );
    const tube = new THREE.TubeGeometry(curve, 48, 1.6, 8, false);
    const m = new THREE.MeshBasicMaterial({ color: ERA_COLOR[to], transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(tube, m);
    const tan = curve.getTangent(1);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 12), m);
    cone.position.copy(curve.getPoint(1));
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan.normalize());
    const grp = new THREE.Group();
    grp.add(mesh, cone);
    grp.userData = { tube, mesh, t: 0 };
    tube.setDrawRange(0, 0);
    cone.visible = false;
    this.group.add(grp);
    this.arrow = { grp, tube, cone, t: 0, count: tube.index.count };
  }
  clearArrow() {
    if (!this.arrow) return;
    this.group.remove(this.arrow.grp);
    this.arrow.tube.dispose();
    this.arrow.grp.children[0].material.dispose();
    this.arrow = null;
  }

  tick(dt, raw = dt) {
    this.t += dt;
    if (this.arrow && this.arrow.t < 1) {
      this.arrow.t = Math.min(1, this.arrow.t + raw / 1.1);
      const n = Math.floor(this.arrow.count * this.arrow.t / 3) * 3;
      this.arrow.tube.setDrawRange(0, n);
      this.arrow.cone.visible = this.arrow.t >= 1;
    }
    const pulse = 0.75 + 0.25 * Math.sin(this.t * 3);
    for (const [k, e] of Object.entries(this.eras)) {
      const base = e.axis.material.userData.base;
      const dim = this.focus && k !== this.focus;
      e.axis.material.opacity = base * (dim ? 0.16 : pulse);
    }
  }

  // 经纬度刻度标注
  coordLabels() {
    const L = [];
    const b = MAP.bounds;
    for (let lat = 39.86; lat <= 39.9951; lat += 0.01) {
      const [, z] = mapXZ(116.39, lat);
      L.push({ text: `${lat.toFixed(2)}°N`, x: b.x0 + 4, y: 1, z, kind: 'coord' });
    }
    for (let lon = 116.30; lon <= 116.461; lon += 0.02) {
      const [x] = mapXZ(lon, 39.9);
      L.push({ text: `${lon.toFixed(2)}°E`, x, y: 1, z: b.z1 - 4, kind: 'coord' });
    }
    return L;
  }
}

export { mapLL };
