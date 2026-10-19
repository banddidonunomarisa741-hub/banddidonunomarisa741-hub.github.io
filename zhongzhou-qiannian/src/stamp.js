import { ST } from './style.js';

// 局部模型缓冲：先在局部坐标里搭建（正面朝 +z，即朝南），再旋转放进世界。
const OFF = 1024, SPAN = 2048;

export class Stamp {
  constructor() {
    this.m = new Map();
    this.minx = Infinity; this.maxx = -Infinity;
    this.miny = Infinity; this.maxy = -Infinity;
    this.minz = Infinity; this.maxz = -Infinity;
  }
  key(x, y, z) { return (x + OFF) + SPAN * ((z + OFF) + SPAN * y); }
  set(x, y, z, c) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (y < 0) return;
    const k = this.key(x, y, z);
    if (!c) { this.m.delete(k); return; }
    this.m.set(k, ST.cur.remap[c]);
    if (x < this.minx) this.minx = x; if (x > this.maxx) this.maxx = x;
    if (y < this.miny) this.miny = y; if (y > this.maxy) this.maxy = y;
    if (z < this.minz) this.minz = z; if (z > this.maxz) this.maxz = z;
  }
  get(x, y, z) {
    if (y < 0) return 0;
    return this.m.get(this.key(x, y, z)) || 0;
  }
  box(ax, ay, az, bx, by, bz, c) {
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
    const y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    const z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) this.set(x, y, z, c);
  }
  get height() { return this.maxy + 1; }

  // rot: 0 朝南, 1 朝东, 2 朝北, 3 朝西
  place(world, ox, oy, oz, rot = 0) {
    let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
    for (const [k, c] of this.m) {
      const x = (k % SPAN) - OFF;
      const rest = Math.floor(k / SPAN);
      const z = (rest % SPAN) - OFF;
      const y = Math.floor(rest / SPAN);
      let wx, wz;
      switch (rot & 3) {
        case 0: wx = x; wz = z; break;
        case 1: wx = z; wz = -x; break;
        case 2: wx = -x; wz = -z; break;
        default: wx = -z; wz = x; break;
      }
      world.set(ox + wx, oy + y, oz + wz, c);
      if (wx < bx0) bx0 = wx; if (wx > bx1) bx1 = wx;
      if (wz < bz0) bz0 = wz; if (wz > bz1) bz1 = wz;
    }
    return { x0: ox + bx0, x1: ox + bx1, y0: oy + this.miny, y1: oy + this.maxy, z0: oz + bz0, z1: oz + bz1 };
  }
}
