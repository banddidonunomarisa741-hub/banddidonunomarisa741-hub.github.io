// 体素世界：稠密网格 + 地面类型图 + 可点选建筑登记 + 标注点
import { COLOR_MASK } from './palette.js';
import { ST } from './style.js';

export class World {
  constructor({ x0, x1, z0, z1, h }) {
    this.x0 = x0; this.z0 = z0;
    this.x1 = x1; this.z1 = z1;
    this.NX = x1 - x0 + 1;
    this.NZ = z1 - z0 + 1;
    this.NY = h;
    this.vox = new Uint16Array(this.NX * this.NY * this.NZ);
    this.top = new Uint8Array(this.NX * this.NZ);
    this.ground = new Uint8Array(this.NX * this.NZ);
    this.flags = 0;
    this.items = [];
    this.labels = [];
    this.axisNodes = [];
    this.heroes = [];
    this.gates = [];
  }

  reset() {
    this.vox.fill(0);
    this.top.fill(0);
    this.ground.fill(0);
    this.flags = 0;
    this.items = [];
    this.labels = [];
    this.axisNodes = [];
    this.heroes = [];
    this.gates = [];
  }

  inside(x, y, z) {
    return x >= this.x0 && x <= this.x1 && z >= this.z0 && z <= this.z1 && y >= 0 && y < this.NY;
  }

  set(x, y, z, c) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (!this.inside(x, y, z)) return;
    const ix = x - this.x0, iz = z - this.z0;
    const i = ix + this.NX * (iz + this.NZ * y);
    if (!c) { this.vox[i] = 0; return; }
    this.vox[i] = ST.cur.remap[c] | this.flags;
    const ci = ix + this.NX * iz;
    if (y + 1 > this.top[ci]) this.top[ci] = y + 1;
  }

  // 不做朝代瓦色映射、直接写入（细模用）
  setRaw(x, y, z, c) {
    if (!this.inside(x, y, z)) return;
    const ix = x - this.x0, iz = z - this.z0;
    this.vox[ix + this.NX * (iz + this.NZ * y)] = c ? (c | this.flags) : 0;
    if (c) { const ci = ix + this.NX * iz; if (y + 1 > this.top[ci]) this.top[ci] = y + 1; }
  }

  get(x, y, z) {
    if (!this.inside(x, y, z)) return 0;
    return this.vox[(x - this.x0) + this.NX * ((z - this.z0) + this.NZ * y)] & COLOR_MASK;
  }

  box(ax, ay, az, bx, by, bz, c) {
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
    const y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    const z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) this.set(x, y, z, c);
  }

  // 列最高体素（无则 -1）
  height(x, z) {
    if (x < this.x0 || x > this.x1 || z < this.z0 || z > this.z1) return -1;
    return this.top[(x - this.x0) + this.NX * (z - this.z0)] - 1;
  }

  // ---------- 地面 ----------
  g(x, z, t) {
    x = Math.floor(x); z = Math.floor(z);
    if (x < this.x0 || x > this.x1 || z < this.z0 || z > this.z1) return;
    this.ground[(x - this.x0) + this.NX * (z - this.z0)] = t;
  }
  gAt(x, z) {
    if (x < this.x0 || x > this.x1 || z < this.z0 || z > this.z1) return 0;
    return this.ground[(x - this.x0) + this.NX * (z - this.z0)];
  }
  gRect(ax, az, bx, bz, t) {
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
    const z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.g(x, z, t);
  }
  gPoly(pts, t, only) {
    let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
    for (const [x, z] of pts) {
      minx = Math.min(minx, x); maxx = Math.max(maxx, x);
      minz = Math.min(minz, z); maxz = Math.max(maxz, z);
    }
    for (let z = Math.floor(minz); z <= Math.ceil(maxz); z++)
      for (let x = Math.floor(minx); x <= Math.ceil(maxx); x++)
        if (pointInPoly(x + 0.5, z + 0.5, pts) && (!only || only(this.gAt(x, z)))) this.g(x, z, t);
  }
  gEllipse(cx, cz, rx, rz, t) {
    for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz;
        if (dx * dx + dz * dz <= 1) this.g(x, z, t);
      }
  }
  // 折线（河道、道路），w 为宽度
  gLine(pts, w, t) {
    const r = w / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const minx = Math.floor(Math.min(ax, bx) - r - 1), maxx = Math.ceil(Math.max(ax, bx) + r + 1);
      const minz = Math.floor(Math.min(az, bz) - r - 1), maxz = Math.ceil(Math.max(az, bz) + r + 1);
      for (let z = minz; z <= maxz; z++)
        for (let x = minx; x <= maxx; x++)
          if (distSeg(x + 0.5, z + 0.5, ax, az, bx, bz) <= r) this.g(x, z, t);
    }
  }

  // ---------- 登记 ----------
  item(id, ax, ay, az, bx, by, bz) {
    this.items.push({
      id,
      box: [Math.min(ax, bx), Math.min(ay, by), Math.min(az, bz), Math.max(ax, bx) + 1, Math.max(ay, by) + 1, Math.max(az, bz) + 1],
    });
  }
  label(text, x, y, z, kind = 'bld', id = null) {
    this.labels.push({ text, x, y, z, kind, id });
  }
}

export function pointInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx - px, qz = az + t * dz - pz;
  return Math.sqrt(qx * qx + qz * qz);
}

// 确定性哈希随机
export function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
