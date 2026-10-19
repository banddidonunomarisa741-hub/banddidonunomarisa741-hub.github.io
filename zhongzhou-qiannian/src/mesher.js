// 体素网格化：剔除隐藏面 + 顶点环境光遮蔽（AO）
// 普通体素按区块合并；重点建筑（带编号）单独成网格，便于近景时换成细模。
import { COLORS, NOISE, GLOW, COLOR_MASK, F_AXIS, F_CHANGE, HERO_MASK, HERO_SHIFT } from './palette.js';
import { hash3 } from './world.js';

const AO = [0.52, 0.7, 0.86, 1.0];

// 六个面：法线 n，切向 u、v（u × v = n）
const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

class Buf {
  constructor(n = 4096) { this.a = new Float32Array(n); this.n = 0; }
  push(v) {
    if (this.n >= this.a.length) { const b = new Float32Array(this.a.length * 2); b.set(this.a); this.a = b; }
    this.a[this.n++] = v;
  }
}

// 在 [ix0,ix1)×[iz0,iz1) 范围内生成网格；accept(raw) 决定哪些体素参与
function meshRange(world, ix0, ix1, iz0, iz1, accept, scale = 1) {
  const { NX, NY, NZ, vox, top } = world;
  const solid = (x, y, z) => {
    if (y < 0) return 1;
    if (x < 0 || x >= NX || z < 0 || z >= NZ || y >= NY) return 0;
    return vox[x + NX * (z + NZ * y)] ? 1 : 0;
  };
  const pos = new Buf(), nor = new Buf(), col = new Buf(), flg = new Buf();
  const idx = [];
  let vcount = 0, faces = 0;
  for (let z = iz0; z < iz1; z++) {
    for (let x = ix0; x < ix1; x++) {
      const th = top[x + NX * z];
      for (let y = 0; y < th; y++) {
        const raw = vox[x + NX * (z + NZ * y)];
        if (!raw || !accept(raw)) continue;
        const ci = raw & COLOR_MASK;
        const base = COLORS[ci];
        const nz = NOISE[ci];
        const jitter = nz ? 1 + (hash3(x, y, z) - 0.5) * 2 * nz : 1;
        const fl = (GLOW[ci] ? 1 : 0) | (raw & F_AXIS ? 2 : 0) | (raw & F_CHANGE ? 4 : 0);
        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          const nx = x + F.n[0], ny = y + F.n[1], nzv = z + F.n[2];
          if (solid(nx, ny, nzv)) continue;
          if (f === 3 && y === 0) continue;
          const ao = [0, 0, 0, 0];
          for (let k = 0; k < 4; k++) {
            const [su, sv] = CORNERS[k];
            const s1 = solid(nx + F.u[0] * su, ny + F.u[1] * su, nzv + F.u[2] * su);
            const s2 = solid(nx + F.v[0] * sv, ny + F.v[1] * sv, nzv + F.v[2] * sv);
            const cc = solid(nx + F.u[0] * su + F.v[0] * sv, ny + F.u[1] * su + F.v[1] * sv, nzv + F.u[2] * su + F.v[2] * sv);
            ao[k] = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
          }
          const fx = x + 0.5 + F.n[0] * 0.5, fy = y + 0.5 + F.n[1] * 0.5, fz = z + 0.5 + F.n[2] * 0.5;
          for (let k = 0; k < 4; k++) {
            const [su, sv] = CORNERS[k];
            pos.push(fx + (F.u[0] * su + F.v[0] * sv) * 0.5);
            pos.push(fy + (F.u[1] * su + F.v[1] * sv) * 0.5);
            pos.push(fz + (F.u[2] * su + F.v[2] * sv) * 0.5);
            nor.push(F.n[0]); nor.push(F.n[1]); nor.push(F.n[2]);
            const s = AO[ao[k]] * jitter;
            col.push(base[0] * s); col.push(base[1] * s); col.push(base[2] * s);
            flg.push(fl);
          }
          const v0 = vcount;
          if (ao[0] + ao[2] > ao[1] + ao[3]) idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
          else idx.push(v0 + 1, v0 + 2, v0 + 3, v0 + 1, v0 + 3, v0);
          vcount += 4;
          faces++;
        }
      }
    }
  }
  if (!vcount) return null;
  const position = pos.a.slice(0, pos.n);
  for (let i = 0; i < position.length; i += 3) {
    position[i] = (position[i] + world.x0) * scale;
    position[i + 1] *= scale;
    position[i + 2] = (position[i + 2] + world.z0) * scale;
  }
  const normal = new Int8Array(nor.n);
  for (let i = 0; i < nor.n; i++) normal[i] = nor.a[i] * 127;
  const color = new Uint8Array(col.n);
  for (let i = 0; i < col.n; i++) color[i] = Math.max(0, Math.min(255, Math.round(col.a[i] * 255)));
  const flag = new Uint8Array(flg.n);
  for (let i = 0; i < flg.n; i++) flag[i] = flg.a[i];
  const index = vcount > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  return { position, normal, color, flag, index, faces };
}

// 普通体素（不含重点建筑）按区块输出；重点建筑各自输出一个粗模
export function meshWorld(world, chunk = 64, opts = {}) {
  const { NX, NZ } = world;
  const geoms = [];
  let totalFaces = 0;
  const heroes = world.heroes || [];
  const plain = heroes.length ? (raw) => !(raw & HERO_MASK) : () => true;
  for (let cz0 = 0; cz0 < NZ; cz0 += chunk) {
    for (let cx0 = 0; cx0 < NX; cx0 += chunk) {
      const g = meshRange(world, cx0, Math.min(NX, cx0 + chunk), cz0, Math.min(NZ, cz0 + chunk), plain, opts.scale ?? 1);
      if (g) { geoms.push(g); totalFaces += g.faces; }
    }
  }
  const heroGeoms = [];
  for (const h of heroes) {
    const b = h.bbox;
    const ix0 = Math.max(0, b.x0 - world.x0 - 1), ix1 = Math.min(NX, b.x1 - world.x0 + 2);
    const iz0 = Math.max(0, b.z0 - world.z0 - 1), iz1 = Math.min(NZ, b.z1 - world.z0 + 2);
    const want = h.idx << HERO_SHIFT;
    const g = meshRange(world, ix0, ix1, iz0, iz1, (raw) => (raw & HERO_MASK) === want);
    if (g) { heroGeoms.push({ idx: h.idx, geom: g }); totalFaces += g.faces; }
  }
  return { geoms, heroGeoms, faces: totalFaces };
}

// 细模：整块网格（坐标按 scale 缩放）
export function meshFine(world, scale) {
  return meshRange(world, 0, world.NX, 0, world.NZ, () => true, scale);
}
