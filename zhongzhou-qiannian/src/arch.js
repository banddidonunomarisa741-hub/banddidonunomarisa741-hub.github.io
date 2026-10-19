// 具名建筑模型。每个函数返回一个 Stamp：原点在建筑中心地面，正面朝南（+z）。
// 形制依据见 info.js 中各条目的说明。
import { Stamp } from './stamp.js';
import { C, TILE } from './palette.js';
import {
  hall, pavilion, chengtai, roof, body, eaveRing, terrace, coneRoof, roundBody, coneRing, inShape,
  archBridge, paifang, huabiao, tree, redWall, brickWall, earthWall,
} from './kit.js';
import { hash3 } from './world.js';

export const tileOf = (style) => (style === 'yuan' ? TILE.yuan : TILE.yellow);
export const trimOf = (style) => (style === 'yuan' ? C.G1 : undefined);

// ---------------------------------------------------------------------------
// 宫城正门：午门（明清）/ 崇天门（元）——凹字形墩台 + 五凤楼
// ---------------------------------------------------------------------------
export function wumen(style = 'qing') {
  const s = new Stamp();
  const yuan = style === 'yuan';
  const T = tileOf(style), trim = trimOf(style);
  const H = 5;
  const wall = yuan ? C.RED_WALL : C.RED_WALL;
  chengtai(s, {
    x0: -21, x1: 21, z0: -5, z1: 5, h: H, color: wall, base: C.MARBLE, topColor: C.PAVE,
    arches: yuan ? [{ x: 0, w: 3, h: 3 }, { x: -5, w: 3, h: 3 }, { x: 5, w: 3, h: 3 }, { x: -10, w: 3, h: 2 }, { x: 10, w: 3, h: 2 }]
      : [{ x: 0, w: 3, h: 3 }, { x: -6, w: 3, h: 3 }, { x: 6, w: 3, h: 3 }],
    doorColor: C.RED_D, parapet: 'low', parapetColor: C.RED_D,
  });
  for (const sx of [-1, 1]) {
    chengtai(s, { x0: sx < 0 ? -21 : 15, x1: sx < 0 ? -15 : 21, z0: 6, z1: 22, h: H, color: wall, base: C.MARBLE, topColor: C.PAVE, parapet: 'low', parapetColor: C.RED_D });
  }
  // 正楼：明清面阔九间重檐庑殿；元崇天门十一间
  const main = new Stamp();
  hall(main, { w: yuan ? 11 : 9, d: 4, h: 3, eaves: 2, roof: 'wudian', tile: T, trim, porch: 'around', wen: 2, dougong: !yuan, overhang: 2 });
  main.place(s, 0, H, -1);
  // 两翼雁翅楼 + 四座阙亭
  for (const sx of [-1, 1]) {
    const wing = new Stamp();
    hall(wing, { w: 6, d: 1, h: 2, roof: 'xieshan', tile: T, trim, porch: 'front', overhang: 1 });
    wing.place(s, sx * 18, H, 14, sx < 0 ? 1 : 3);
    for (const z of [7, 21]) {
      const p = new Stamp();
      hall(p, { w: 2, d: 2, h: 2, eaves: 2, roof: 'cuanjian', tile: T, trim, porch: 'around', overhang: 1, finial: 1 });
      p.place(s, sx * 18, H, z);
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// 城台式门楼：天安门 / 承天门 / 端门
// ---------------------------------------------------------------------------
export function terraceGate(o) {
  const s = new Stamp();
  const H = o.h ?? 6;
  const pw = o.pw ?? 21, pd = o.pd ?? 6;
  const n = o.arches ?? 5;
  const arches = [];
  const xs = n === 5 ? [0, -7, 7, -14, 14] : n === 3 ? [0, -7, 7] : [0];
  xs.forEach((x, i) => arches.push({ x, w: i === 0 ? 5 : 3, h: i === 0 ? 4 : 3 }));
  const yt = chengtai(s, {
    x0: -pw, x1: pw, z0: -pd, z1: pd, h: H, color: o.wall ?? C.RED_WALL, base: o.base ?? C.MARBLE,
    arches, doorColor: C.RED_D, parapet: 'low', parapetColor: o.parapetColor ?? C.RED_D, topColor: o.topColor ?? C.PAVE,
  });
  for (const x of [-4, 4, -11, 11]) s.set(x, 4, pd + 1, C.LANTERN);
  const tile = o.tile || tileOf(o.style);
  hall(s, {
    y: H, w: o.bays ?? 9, d: o.depth ?? 4, h: 3, eaves: o.eaves ?? 2, roof: o.roof ?? 'xieshan', tile, trim: o.trim ?? trimOf(o.style),
    base: { m: 1, h: 1, rail: true, stairs: [] }, porch: 'around', dougong: o.dougong ?? true, overhang: 2,
  });
  return s;
}

// ---------------------------------------------------------------------------
// 城门楼（正阳门、永定门、内九外七诸门）：砖城台 + 灰筒瓦绿剪边楼
// ---------------------------------------------------------------------------
export function cityGateTower(o = {}) {
  const s = new Stamp();
  const H = o.h ?? 5;
  const bays = o.bays ?? 5;
  const hx = bays + 3, hz = o.pd ?? 6;
  chengtai(s, {
    x0: -hx - 2, x1: hx + 2, z0: -hz, z1: hz, h: H, color: o.wall ?? C.BRICK, base: o.wall === C.EARTH ? null : C.BRICK_D,
    arches: [{ x: 0, w: 3, h: 3 }], doorColor: C.RED_D, parapet: 'crenel', outer: 'S', parapetColor: o.wall ?? C.BRICK, topColor: C.BRICK_L,
  });
  s.set(-3, 3, hz + 1, C.LANTERN); s.set(3, 3, hz + 1, C.LANTERN);
  const tile = o.tile || TILE.greyGreen;
  const stories = o.stories ?? 1;
  if (stories === 2) {
    hall(s, {
      y: H, w: bays, d: 3, h: 3, eaves: 3, roof: 'xieshan', tile, trim: o.trim ?? C.G1, porch: 'around',
      upperH: [3, 2], stories: [true, false], upperInset: [1, 1], overhang: 1, base: { m: 1, h: 1, stairs: [], color: C.BRICK_L },
    });
  } else {
    hall(s, {
      y: H, w: bays, d: 3, h: 3, eaves: o.eaves ?? 2, roof: 'xieshan', tile, trim: o.trim ?? C.G1, porch: 'around', overhang: 1,
      base: { m: 1, h: 1, stairs: [], color: C.BRICK_L },
    });
  }
  return s;
}

// 箭楼：砖砌楼身，四排箭窗，重檐歇山，后出抱厦
export function arrowTower(o = {}) {
  const s = new Stamp();
  const H = o.h ?? 5;
  const hx = o.hx ?? 11, hz = o.hz ?? 4;
  const rows = o.rows ?? 4;
  chengtai(s, {
    x0: -hx - 2, x1: hx + 2, z0: -hz - 2, z1: hz + 1, h: H, color: C.BRICK, base: C.BRICK_D,
    arches: o.arch === false ? [] : [{ x: 0, w: 3, h: 3 }], doorColor: C.RED_D, parapet: 'none', topColor: C.BRICK_L,
  });
  const bh = rows * 2;
  for (let y = H; y < H + bh; y++)
    for (let z = -hz; z <= hz; z++)
      for (let x = -hx; x <= hx; x++) {
        const edge = x === -hx || x === hx || z === -hz || z === hz;
        if (!edge) { s.set(x, y, z, C.DARK); continue; }
        const row = (y - H) % 2 === 1;
        let c = hash3(x, y, z) < 0.15 ? C.BRICK_D : C.BRICK;
        if (row) {
          if ((z === hz || z === -hz) && (x + hx) % 2 === 1 && Math.abs(x) < hx) c = C.DARK;
          if ((x === hx || x === -hx) && (z + hz) % 2 === 1 && Math.abs(z) < hz) c = C.DARK;
        }
        s.set(x, y, z, c);
      }
  const tile = o.tile || TILE.greyGreen;
  let y = H + bh;
  y = eaveRing(s, { x0: -hx - 1, x1: hx + 1, z0: -hz - 1, z1: hz + 1 }, { x0: -hx + 1, x1: hx - 1, z0: -hz + 1, z1: hz - 1 }, y, tile, C.G1);
  y = body(s, hx - 1, hz - 1, y, { h: 2, porch: 'none', wall: C.BRICK, door: C.BRICK, lattice: C.BRICK, col: C.BRICK_D });
  roof(s, { x0: -hx, x1: hx, z0: -hz, z1: hz, y, type: 'xieshan', tile, trim: C.G1, wen: 1 });
  // 抱厦
  if (o.baosha !== false) {
    const b = new Stamp();
    hall(b, { w: Math.max(3, Math.floor(hx / 2)), d: 1, h: 3, roof: 'xieshan', tile, trim: C.G1, porch: 'none', wall: C.BRICK, col: C.BRICK_D, door: C.RED_D, overhang: 1 });
    b.place(s, 0, H, -hz - 2, 2);
  }
  return s;
}

// ---------------------------------------------------------------------------
// 紫禁城角楼：三重檐、十字脊、四面抱厦
// ---------------------------------------------------------------------------
export function cornerTower(style = 'qing') {
  const s = new Stamp();
  const T = tileOf(style);
  const trim = trimOf(style);
  // 屋身（四面出抱厦的十字平面，简化为方形）
  body(s, 3, 3, 0, { h: 3, porch: 'around', bay: 2 });
  // 第一重檐（抱厦檐）
  let y = eaveRing(s, { x0: -5, x1: 5, z0: -5, z1: 5 }, { x0: -2, x1: 2, z0: -2, z1: 2 }, 3, T, trim);
  // 四面抱厦山花
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]])
    for (let a = -1; a <= 1; a++) {
      const x = dx ? dx * 4 : a, z = dz ? dz * 4 : a;
      s.set(x, 4, z, a === 0 ? C.RED_D : T[0]);
      if (a === 0) s.set(x, 5, z, T[2]);
    }
  y = body(s, 2, 2, y, { h: 1, porch: 'none' });
  // 第二重檐
  y = eaveRing(s, { x0: -4, x1: 4, z0: -4, z1: 4 }, { x0: -2, x1: 2, z0: -2, z1: 2 }, y, T, trim);
  // 顶：十字脊歇山（两道悬山相交，四面山花）
  const a1 = new Stamp();
  roof(a1, { x0: -4, x1: 4, z0: -2, z1: 2, y: 0, type: 'xuanshan', tile: T, trim, wen: false, upturn: false, steps: [1] });
  a1.place(s, 0, y, 0, 0);
  a1.place(s, 0, y, 0, 1);
  s.set(0, y + 3, 0, C.GOLD);
  return s;
}

// 紫禁城城门（神武门/东华门/西华门）：红墩台 + 重檐庑殿
export function palaceGate(style = 'qing', bays = 5) {
  const s = new Stamp();
  const T = tileOf(style), trim = trimOf(style);
  chengtai(s, {
    x0: -13, x1: 13, z0: -4, z1: 4, h: 5, color: C.RED_WALL, base: C.MARBLE, topColor: C.PAVE,
    arches: [{ x: 0, w: 3, h: 3 }, { x: -6, w: 3, h: 3 }, { x: 6, w: 3, h: 3 }], doorColor: C.RED_D, parapet: 'low', parapetColor: C.RED_D,
  });
  hall(s, { y: 5, w: bays, d: 2, h: 3, eaves: 2, roof: 'wudian', tile: T, trim, porch: 'around', overhang: 1, wen: 1 });
  s.set(-3, 3, 5, C.LANTERN); s.set(3, 3, 5, C.LANTERN);
  return s;
}

// ---------------------------------------------------------------------------
// 鼓楼 / 钟楼
// ---------------------------------------------------------------------------
export function drumTower(style = 'qing') {
  const s = new Stamp();
  const yuan = style === 'yuan';
  const H = 5;
  chengtai(s, {
    x0: -10, x1: 10, z0: -6, z1: 6, h: H, color: yuan ? C.EARTH : C.RED_WALL, base: yuan ? null : C.BRICK_D,
    arches: [{ x: 0, w: 3, h: 3 }, { x: -6, w: 3, h: 3 }, { x: 6, w: 3, h: 3 }], parapet: 'none', topColor: C.BRICK_L,
    skirt: TILE.greyGreen.slice(0, 2),
  });
  for (const x of [-3, 3]) s.set(x, 3, 7, C.LANTERN);
  hall(s, {
    y: H, w: 5, d: 3, h: 3, eaves: 2, roof: 'xieshan', tile: yuan ? TILE.grey : TILE.greyGreen, trim: yuan ? undefined : C.G1,
    porch: 'around', overhang: 2, base: { m: 1, h: 1, stairs: [], color: C.BRICK_L, rail: true, railColor: C.RED_D },
  });
  return s;
}

export function bellTower(style = 'qing') {
  const s = new Stamp();
  if (style === 'qing') {
    // 乾隆十年至十二年重建：全砖石结构
    const H = 5;
    chengtai(s, {
      x0: -7, x1: 7, z0: -7, z1: 7, h: H, color: C.BRICK_L, base: C.BRICK_D,
      arches: [{ x: 0, w: 3, h: 3 }], parapet: 'low', parapetColor: C.BRICK, topColor: C.BRICK_L,
    });
    // 十字券洞（东西向）
    for (let x = -7; x <= 7; x++) for (let y = 0; y < 3; y++) for (let dz = -1; dz <= 1; dz++) if (!(y === 2 && dz !== 0)) s.set(x, y, dz, 0);
    // 上层砖石楼身，四面券窗
    for (let y = H; y < H + 4; y++)
      for (let z = -5; z <= 5; z++)
        for (let x = -5; x <= 5; x++) {
          const edge = Math.abs(x) === 5 || Math.abs(z) === 5;
          if (!edge) { s.set(x, y, z, C.DARK); continue; }
          let c = C.BRICK_L;
          if (y === H + 3) c = ((x + z) & 1) ? C.CH_G : C.CH_B;
          const win = (y === H + 1 || y === H + 2) && ((Math.abs(z) === 5 && Math.abs(x) <= 1) || (Math.abs(x) === 5 && Math.abs(z) <= 1));
          if (win && !(y === H + 2 && (Math.abs(x) === 1 || Math.abs(z) === 1))) c = C.DARK;
          s.set(x, y, z, c);
        }
    let y = H + 4;
    y = eaveRing(s, { x0: -7, x1: 7, z0: -7, z1: 7 }, { x0: -4, x1: 4, z0: -4, z1: 4 }, y, TILE.blackGreen, C.G1);
    y = body(s, 4, 4, y, { h: 2, porch: 'none', wall: C.BRICK_L, door: C.BRICK_L, lattice: C.BRICK_L, col: C.BRICK });
    roof(s, { x0: -6, x1: 6, z0: -6, z1: 6, y, type: 'xieshan', tile: TILE.blackGreen, trim: C.G1, wen: 1 });
    return s;
  }
  // 元、明：木构钟楼
  const yuan = style === 'yuan';
  chengtai(s, {
    x0: -7, x1: 7, z0: -7, z1: 7, h: 5, color: yuan ? C.EARTH : C.RED_WALL, base: yuan ? null : C.BRICK_D,
    arches: [{ x: 0, w: 3, h: 3 }], parapet: 'none', topColor: C.BRICK_L, skirt: TILE.grey.slice(0, 2),
  });
  hall(s, { y: 5, w: 3, d: 3, h: 3, eaves: 2, roof: 'xieshan', tile: yuan ? TILE.grey : TILE.greyGreen, trim: yuan ? undefined : C.G1, porch: 'around', overhang: 2, base: { m: 1, h: 1, stairs: [], color: C.BRICK_L } });
  return s;
}

// 元 中心台 + 中心阁
export function centerPavilion() {
  const s = new Stamp();
  for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) s.set(x, 0, z, Math.abs(x) === 6 || Math.abs(z) === 6 ? C.EARTH_D : C.EARTH_L);
  for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) s.set(x, 1, z, C.EARTH_L);
  const p = new Stamp();
  pavilion(p, { shape: 'square', r: 2, h: 3, eaves: 2, tiles: [TILE.yuan, TILE.yuan], trim: C.G1, finial: 1 });
  p.place(s, 0, 2, 0);
  return s;
}

// ---------------------------------------------------------------------------
// 元代工字殿：前殿 + 柱廊 + 寝殿（大明殿、延春阁）
// ---------------------------------------------------------------------------
export function gongzi(o) {
  const s = new Stamp();
  const T = TILE.yuan, trim = C.G1;
  // 共用台基（工字形）
  const fhx = o.front * 1 + 3, fhz = o.frontD + 3;
  const rhx = o.rear + 3, rhz = o.rearD + 2;
  const gap = o.corridor;
  const zf = 0, zr = -(fhz + gap + rhz);
  const H = o.baseH ?? 2;
  const lv = [];
  for (let k = 0; k < H; k++) {
    const m = H - 1 - k;
    for (let z = zf - fhz - m; z <= zf + fhz + m; z++) for (let x = -fhx - m; x <= fhx + m; x++) s.set(x, k, z, C.MARBLE);
    for (let z = zr - rhz - m; z <= zr + rhz + m; z++) for (let x = -rhx - m; x <= rhx + m; x++) s.set(x, k, z, C.MARBLE);
    for (let z = zr; z <= zf; z++) for (let x = -3 - m; x <= 3 + m; x++) s.set(x, k, z, C.MARBLE);
    lv.push(k);
  }
  for (let k = 1; k <= H + 1; k++) for (let x = -2; x <= 2; x++) if (H - k + 1 > 0) for (let yy = 0; yy < H - k + 1; yy++) s.set(x, yy, fhz + k, C.MARBLE);
  // 前殿
  const f = new Stamp();
  if (o.frontTower) {
    // 延春阁："三檐重屋"
    hall(f, { w: o.front, d: o.frontD, h: 3, eaves: 3, roof: 'xieshan', tile: T, trim, porch: 'around', upperH: [3, 2], stories: [true, false], overhang: 2 });
  } else {
    hall(f, { w: o.front, d: o.frontD, h: 3, eaves: 2, roof: 'wudian', tile: T, trim, porch: 'front', overhang: 2, wen: 2 });
  }
  f.place(s, 0, H, zf);
  // 柱廊
  const c = new Stamp();
  hall(c, { w: Math.ceil(gap / 2) + 1, d: 1, h: 3, roof: 'xuanshan', tile: T, porch: 'open', overhang: 1, band: true });
  c.place(s, 0, H, Math.round((zf - fhz + zr + rhz) / 2), 1);
  // 寝殿 + 香阁
  const r = new Stamp();
  hall(r, { w: o.rear, d: o.rearD, h: 3, roof: 'wudian', tile: T, trim, porch: 'front', overhang: 1 });
  r.place(s, 0, H, zr);
  const x2 = new Stamp();
  hall(x2, { w: 3, d: 1, h: 3, roof: 'xieshan', tile: T, trim, porch: 'none', overhang: 1 });
  x2.place(s, 0, H, zr - rhz + 1);
  return s;
}

// 蒙古毡帐（元代宫苑中的帐殿）
export function yurt(r = 2, big = false) {
  const s = new Stamp();
  const h = big ? 3 : 2;
  for (let y = 0; y < h; y++)
    for (let z = -r; z <= r; z++)
      for (let x = -r; x <= r; x++)
        if (x * x + z * z <= (r + 0.4) ** 2) s.set(x, y, z, y === h - 1 ? C.FELT_B : C.FELT);
  for (let k = 0; k <= r; k++) {
    const rr = r - k - 0.4;
    for (let z = -r; z <= r; z++)
      for (let x = -r; x <= r; x++)
        if (x * x + z * z <= Math.max(0.3, rr) ** 2 + 0.1) s.set(x, h + k, z, k === r ? C.GOLD : C.FELT);
  }
  s.set(0, 0, r, C.WINDOW); s.set(0, 1, r, C.RED_D);
  return s;
}

// ---------------------------------------------------------------------------
// 白塔（藏式喇嘛塔）：北海白塔（清顺治八年）/ 妙应寺白塔（元至元十六年）
// ---------------------------------------------------------------------------
export function dagoba(o = {}) {
  const s = new Stamp();
  const big = o.big;
  const b = big ? 6 : 5;
  let y = 0;
  // 须弥座（亚字形，两层）
  for (let k = 0; k < 2; k++) {
    const r = b - k;
    for (let yy = 0; yy < 2; yy++, y++)
      for (let z = -r; z <= r; z++)
        for (let x = -r; x <= r; x++) {
          if (Math.abs(x) === r && Math.abs(z) === r) continue;
          s.set(x, y, z, yy === 1 ? C.MARBLE_D : C.WHITE);
        }
  }
  // 塔肚
  const R = big ? 4 : 3;
  for (let k = 0; k <= R * 2; k++) {
    const t = k / (R * 2);
    const rr = R * Math.sqrt(Math.max(0, 1 - Math.pow(t * 1.25 - 0.25, 2))) + (k === 0 ? 0.3 : 0);
    for (let z = -R; z <= R; z++)
      for (let x = -R; x <= R; x++)
        if (x * x + z * z <= rr * rr + 0.3) s.set(x, y, z, C.WHITE);
    y++;
  }
  if (o.niche) { s.set(0, y - R - 1, R, C.RED_D); s.set(0, y - R, R, C.RED_D); s.set(0, y - R, R - 0, C.GOLD); }
  // 塔脖子 + 十三天
  for (let k = 0; k < 6; k++) {
    const rr = k < 1 ? 2 : Math.max(1, 2 - Math.floor(k / 3));
    for (let z = -rr; z <= rr; z++) for (let x = -rr; x <= rr; x++) if (x * x + z * z <= rr * rr + 0.5) s.set(x, y, z, k % 2 ? C.MARBLE_D : C.WHITE);
    y++;
  }
  // 华盖 + 宝顶
  for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) if (x * x + z * z <= 4.5) s.set(x, y, z, C.GOLD_D);
  y++;
  s.set(0, y, 0, C.GOLD); s.set(0, y + 1, 0, C.GOLD);
  return s;
}

// ---------------------------------------------------------------------------
// 景山：五峰土山，可选五亭
// ---------------------------------------------------------------------------
export function hill(peaks, o = {}) {
  const s = new Stamp();
  const minx = Math.min(...peaks.map((p) => p.x - p.r)), maxx = Math.max(...peaks.map((p) => p.x + p.r));
  const minz = Math.min(...peaks.map((p) => p.z - p.r)), maxz = Math.max(...peaks.map((p) => p.z + p.r));
  const tops = new Map();
  for (let z = minz; z <= maxz; z++)
    for (let x = minx; x <= maxx; x++) {
      let h = -1;
      for (const p of peaks) {
        const d = Math.sqrt((x - p.x) ** 2 + ((z - p.z) * (p.rx ? p.r / p.rx : 1)) ** 2);
        if (d > p.r) continue;
        const k = 1 - d / p.r;
        h = Math.max(h, Math.round(p.h * Math.pow(k, 0.75)));
      }
      if (h < 0) continue;
      for (let y = 0; y <= h; y++) {
        let c = y === h ? (hash3(x, y, z) < 0.5 ? C.LEAF3 : C.LEAF2) : C.LEAF2;
        if (y < h && o.earth) c = C.EARTH_D;
        s.set(x, y, z, c);
      }
      tops.set(x + ',' + z, h);
    }
  s.tops = tops;
  return s;
}

export function jingshan(era) {
  const s = new Stamp();
  const peaks = [
    { x: 0, z: 0, r: 13, h: 13 },
    { x: -11, z: 1, r: 10, h: 9 }, { x: 11, z: 1, r: 10, h: 9 },
    { x: -21, z: 2, r: 8, h: 6 }, { x: 21, z: 2, r: 8, h: 6 },
  ];
  const h = hill(peaks);
  h.place(s, 0, 0, 0);
  const top = (x, z) => h.tops.get(x + ',' + z) ?? 0;
  // 山上松柏
  const r = mulberry(17);
  for (let i = 0; i < 70; i++) {
    const x = Math.round((r() - 0.5) * 56), z = Math.round((r() - 0.5) * 22);
    const t = top(x, z);
    if (!t || t > 11 || Math.abs(x) % 11 < 2) continue;
    tree(s, x, t + 1, z, r() < 0.6 ? 'pine' : 'cypress', r);
  }
  if (era !== 'ming' && era !== 'yuan') {
    // 乾隆十六年建五亭
    const pv = (x, o) => { const p = new Stamp(); pavilion(p, o); p.place(s, x, top(x, peaks.find((q) => q.x === x).z) + 1, peaks.find((q) => q.x === x).z); };
    pv(0, { shape: 'square', r: 2, h: 2, eaves: 3, tiles: [TILE.yellow, TILE.yellow, TILE.yellow], trims: [C.G1, C.G1, C.G1], open: true, finial: 1, upperH: 1 });
    for (const sx of [-1, 1]) {
      pv(sx * 11, { shape: 'oct', r: 2, h: 2, eaves: 2, tiles: [TILE.green, TILE.green], trims: [C.Y1, C.Y1], open: true, finial: 1, upperH: 1 });
      pv(sx * 21, { shape: 'round', r: 2, h: 2, eaves: 2, tiles: [TILE.teal, TILE.teal], trims: [C.PURPLE, C.PURPLE], open: true, finial: 1, upperH: 1 });
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// 天坛
// ---------------------------------------------------------------------------
export function huanqiu(era) {
  const s = new Stamp();
  const ming = era === 'ming';
  const radii = ming ? [6, 5, 4] : [8, 6, 4];
  const fill = ming ? C.B2 : C.MARBLE;
  const top = ming ? C.B1 : C.MARBLE;
  radii.forEach((r, k) => {
    for (let z = -r; z <= r; z++)
      for (let x = -r; x <= r; x++) {
        if (x * x + z * z > (r + 0.45) ** 2) continue;
        s.set(x, k, z, x * x + z * z > (r - 0.6) ** 2 ? fill : top);
      }
  });
  // 栏板
  radii.forEach((r, k) => {
    for (let z = -r; z <= r; z++)
      for (let x = -r; x <= r; x++) {
        const d = x * x + z * z;
        if (d > (r + 0.45) ** 2 || d <= (r - 0.6) ** 2) continue;
        if (Math.abs(x) <= 1 || Math.abs(z) <= 1) continue;
        if ((x + z) & 1) continue;
        s.set(x, k + 1, z, ming ? C.B1 : C.MARBLE);
      }
  });
  // 四出陛
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]])
    for (let d = 1; d <= radii[0] + 2; d++)
      for (let a = -1; a <= 1; a++) {
        const x = dx ? dx * d : a, z = dz ? dz * d : a;
        const h = Math.min(3, Math.max(0, radii.findIndex((r) => d > r)));
        const hh = h === -1 ? 3 : h;
        for (let y = 0; y < hh; y++) if (!s.get(x, y, z)) s.set(x, y, z, C.MARBLE_D);
      }
  s.set(0, 3, 0, C.MARBLE_D); // 天心石
  // 壝墙：内圆外方
  const ri = radii[0] + 4, ro = ri + 3;
  for (let z = -ri - 1; z <= ri + 1; z++)
    for (let x = -ri - 1; x <= ri + 1; x++) {
      const d = Math.sqrt(x * x + z * z);
      if (Math.abs(d - ri) < 0.55 && Math.abs(x) > 1 && Math.abs(z) > 1) { s.set(x, 0, z, C.RED_WALL); s.set(x, 1, z, C.B2); }
    }
  for (let z = -ro; z <= ro; z++)
    for (let x = -ro; x <= ro; x++) {
      if (Math.abs(x) !== ro && Math.abs(z) !== ro) continue;
      if (Math.abs(x) <= 2 || Math.abs(z) <= 2) continue;
      s.set(x, 0, z, C.RED_WALL); s.set(x, 1, z, C.B2);
    }
  // 棂星门（每面三座，示意为白石门柱）
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]])
    for (const rr of [ri, ro])
      for (const a of [-2, 2]) {
        const x = dx ? dx * rr : a, z = dz ? dz * rr : a;
        s.set(x, 0, z, C.WHITE); s.set(x, 1, z, C.WHITE); s.set(x, 2, z, C.WHITE);
      }
  return s;
}

export function huangqiongyu() {
  const s = new Stamp();
  // 回音壁
  const R = 7;
  for (let z = -R - 1; z <= R + 1; z++)
    for (let x = -R - 1; x <= R + 1; x++) {
      const d = Math.sqrt(x * x + z * z);
      if (Math.abs(d - R) < 0.55 && !(z > R - 2 && Math.abs(x) <= 1)) { s.set(x, 0, z, C.BRICK_L); s.set(x, 1, z, C.BRICK_L); s.set(x, 2, z, C.B2); }
    }
  const p = new Stamp();
  pavilion(p, { shape: 'round', r: 2, h: 3, eaves: 1, tiles: [TILE.blue], finial: 1, base: { m: 1, h: 1 } });
  p.place(s, 0, 0, -2);
  for (const sx of [-1, 1]) {
    const c = new Stamp();
    hall(c, { w: 2, d: 1, h: 2, roof: 'xieshan', tile: TILE.blue, porch: 'none', overhang: 0, wen: false, upturn: false });
    c.place(s, sx * 5, 0, 2, sx < 0 ? 1 : 3);
  }
  return s;
}

export function qiniandian(era) {
  const s = new Stamp();
  const ming = era === 'ming';
  // 祈谷坛：三层圆台
  const radii = [8, 7, 6];
  radii.forEach((r, k) => {
    for (let z = -r; z <= r; z++)
      for (let x = -r; x <= r; x++) if (x * x + z * z <= (r + 0.45) ** 2) s.set(x, k, z, C.MARBLE);
  });
  radii.forEach((r, k) => {
    for (let z = -r; z <= r; z++)
      for (let x = -r; x <= r; x++) {
        const d = x * x + z * z;
        if (d > (r + 0.45) ** 2 || d <= (r - 0.6) ** 2 || Math.abs(x) <= 1 || Math.abs(z) <= 1 || ((x + z) & 1)) continue;
        s.set(x, k + 1, z, C.MARBLE);
      }
  });
  for (const dz of [1, -1]) for (let d = 1; d <= 10; d++) for (let a = -1; a <= 1; a++) {
    const hh = d <= 6 ? 3 : d <= 7 ? 2 : d <= 8 ? 1 : 0;
    for (let y = 0; y < hh; y++) if (!s.get(a, y, dz * d)) s.set(a, y, dz * d, a === 0 ? C.MARBLE_D : C.MARBLE);
  }
  // 大殿：明嘉靖“大享殿”三檐上青中黄下绿；清乾隆十六年改三檐皆青，名祈年殿
  const p = new Stamp();
  pavilion(p, {
    shape: 'round', r: 4, h: 3, eaves: 3, upperH: 2,
    tiles: ming ? [TILE.green, TILE.yellow, TILE.blue] : [TILE.blue, TILE.blue, TILE.blue], finial: 2,
  });
  p.place(s, 0, 3, 0);
  return s;
}

// 明初天地坛·大祀殿（嘉靖之前）—— 此处不用；保留矩形大殿供对比说明
export function dasidian() {
  const s = new Stamp();
  hall(s, { w: 11, d: 4, h: 3, roof: 'wudian', tile: TILE.yellow, base: { m: 2, h: 2, rail: true } });
  return s;
}

// ---------------------------------------------------------------------------
// 社稷坛：方坛五色土
// ---------------------------------------------------------------------------
export function shejitan() {
  const s = new Stamp();
  const R = 5;
  for (let k = 0; k < 2; k++)
    for (let z = -R + k; z <= R - k; z++)
      for (let x = -R + k; x <= R - k; x++) s.set(x, k, z, C.MARBLE);
  // 五色土：东青、南赤、西白、北黑、中黄
  for (let z = -3; z <= 3; z++)
    for (let x = -3; x <= 3; x++) {
      let c = C.GOLD;
      if (Math.abs(x) > 1 || Math.abs(z) > 1) {
        if (Math.abs(x) >= Math.abs(z)) c = x > 0 ? C.TEAL : C.WHITE;
        else c = z > 0 ? C.RED : C.BK1;
      }
      s.set(x, 2, z, c);
    }
  // 壝墙四色
  const W = 9;
  for (let z = -W; z <= W; z++)
    for (let x = -W; x <= W; x++) {
      if (Math.abs(x) !== W && Math.abs(z) !== W) continue;
      if (Math.abs(x) <= 1 || Math.abs(z) <= 1) continue;
      let c = C.RED;
      if (Math.abs(x) === W) c = x > 0 ? C.TEAL : C.WHITE;
      else c = z > 0 ? C.RED : C.BK1;
      s.set(x, 0, z, c);
    }
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]])
    for (const a of [-2, 2]) {
      const x = dx ? dx * W : a, z = dz ? dz * W : a;
      for (let y = 0; y < 3; y++) s.set(x, y, z, C.WHITE);
    }
  return s;
}

// ---------------------------------------------------------------------------
// 天安门广场建筑（当代）
// ---------------------------------------------------------------------------
export function monument() {
  const s = new Stamp();
  for (let k = 0; k < 2; k++)
    for (let z = -6 + k * 2; z <= 6 - k * 2; z++)
      for (let x = -6 + k * 2; x <= 6 - k * 2; x++) s.set(x, k, z, k === 0 ? C.GRANITE : C.MARBLE);
  for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) {
    const e = Math.abs(x) === 6 || Math.abs(z) === 6;
    if (e && ((x + z) & 1) === 0 && !(Math.abs(x) <= 1 || Math.abs(z) <= 1)) s.set(x, 1, z, C.MARBLE);
  }
  for (let y = 2; y < 4; y++) for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) s.set(x, y, z, y === 2 ? C.GRANITE_D : C.GRANITE);
  for (let y = 4; y < 13; y++) for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) s.set(x, y, z, C.GRANITE);
  s.set(0, 13, 0, C.GRANITE_D);
  for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) s.set(x, 13, z, C.GRANITE_D);
  // 题词面朝北（面向天安门）
  s.set(0, 7, -2, C.GOLD_D); s.set(0, 8, -2, C.GOLD_D);
  return s;
}

export function mausoleum() {
  const s = new Stamp();
  for (let k = 0; k < 2; k++)
    for (let z = -9 + k; z <= 9 - k; z++)
      for (let x = -9 + k; x <= 9 - k; x++) s.set(x, k, z, k === 0 ? C.GRANITE_D : C.GRANITE);
  for (let y = 2; y < 7; y++)
    for (let z = -7; z <= 7; z++)
      for (let x = -7; x <= 7; x++) {
        const edge = Math.abs(x) === 7 || Math.abs(z) === 7;
        const inner = Math.abs(x) === 5 || Math.abs(z) === 5;
        if (edge) { if (((x + z) & 1) === 0) s.set(x, y, z, C.GRANITE); }
        else if (Math.abs(x) <= 5 && Math.abs(z) <= 5) s.set(x, y, z, inner ? (y < 5 && Math.abs(x) <= 1 && z === 5 ? C.DARK : C.CONCRETE) : C.DARK);
      }
  // 两重黄琉璃檐
  for (const [y, r] of [[7, 8], [8, 7]])
    for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
      const e = Math.abs(x) === r || Math.abs(z) === r;
      s.set(x, y, z, e ? (((x + z) & 1) ? C.Y2 : C.Y1) : C.CONCRETE);
    }
  for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) s.set(x, 9, z, Math.abs(x) === 6 || Math.abs(z) === 6 ? C.Y1 : C.CONCRETE);
  return s;
}

// 人民大会堂 / 国家博物馆：长条形，柱廊朝向广场（局部正面 +z）
export function greatBuilding(kind) {
  const s = new Stamp();
  const L = 17, D = 7;
  for (let y = 0; y < 8; y++)
    for (let z = -D; z <= D; z++)
      for (let x = -L; x <= L; x++) {
        const edge = Math.abs(x) === L || Math.abs(z) === D;
        if (y === 0) { s.set(x, y, z, C.GRANITE_D); continue; }
        if (y === 7) { s.set(x, y, z, edge ? (((x + z) & 1) ? C.Y2 : C.Y1) : C.CONCRETE); continue; }
        if (!edge) { s.set(x, y, z, C.DARK); continue; }
        let c = kind === 'museum' ? C.CONCRETE : C.GRANITE;
        if (y >= 2 && y <= 5 && (Math.abs(x) + z) % 2 === 0 && Math.abs(x) < L - 1) c = C.GLASS_D;
        s.set(x, y, z, c);
      }
  // 中央柱廊（高起）
  const pw = kind === 'museum' ? 6 : 7;
  for (let y = 0; y < 10; y++)
    for (let z = D - 3; z <= D + 2; z++)
      for (let x = -pw; x <= pw; x++) {
        const front = z === D + 2;
        if (y === 0) { s.set(x, y, z, C.GRANITE_D); continue; }
        if (y >= 8) { s.set(x, y, z, y === 9 ? C.Y1 : (((x + z) & 1) ? C.Y2 : C.Y1)); continue; }
        if (front || z === D + 1) { if (((x + pw) & 1) === 0 && front) s.set(x, y, z, C.COLUMN_M ?? C.WHITE); continue; }
        s.set(x, y, z, kind === 'museum' ? C.GLASS : C.GRANITE_D);
      }
  for (let x = -pw - 1; x <= pw + 1; x++) for (let z = D + 3; z <= D + 4; z++) s.set(x, 0, z, C.GRANITE);
  if (kind === 'hall') { s.set(0, 7, D + 2, C.GOLD); s.set(0, 6, D + 2, C.RED); }
  return s;
}

export function flagpole() {
  const s = new Stamp();
  for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) s.set(x, 0, z, Math.abs(x) === 2 || Math.abs(z) === 2 ? C.GRANITE : C.GRANITE_D);
  for (let y = 1; y <= 11; y++) s.set(0, y, 0, C.STEEL);
  for (let y = 9; y <= 11; y++) for (let x = 1; x <= 4; x++) s.set(x, y, 0, C.FLAG);
  return s;
}

// 长安街华灯
export function streetLamp() {
  const s = new Stamp();
  s.set(0, 0, 0, C.STEEL); s.set(0, 1, 0, C.STEEL); s.set(0, 2, 0, C.LAMP);
  return s;
}

// ---------------------------------------------------------------------------
// 通用小品：院落、民居、商铺、船
// ---------------------------------------------------------------------------
// 院落：围墙 + 正殿 + 东西配殿
export function compound(o) {
  const s = new Stamp();
  const hw = o.hw, hd = o.hd;
  const wallKind = o.wall ?? 'red';
  for (let z = -hd; z <= hd; z++)
    for (let x = -hw; x <= hw; x++) {
      const edge = Math.abs(x) === hw || Math.abs(z) === hd;
      if (!edge) continue;
      if (z === hd && Math.abs(x) <= 1) continue;
      if (wallKind === 'red') { s.set(x, 0, z, C.RED_WALL); s.set(x, 1, z, C.RED_WALL); s.set(x, 2, z, o.cap ?? C.Y2); }
      else if (wallKind === 'grey') { s.set(x, 0, z, C.BRICK); s.set(x, 1, z, C.GR2); }
      else if (wallKind === 'earth') { s.set(x, 0, z, C.EARTH); s.set(x, 1, z, C.EARTH_L); }
    }
  const tile = o.tile || TILE.yellow;
  const main = new Stamp();
  hall(main, { w: o.bays ?? 5, d: o.depth ?? 2, h: 3, roof: o.roof ?? 'xieshan', tile, trim: o.trim, eaves: o.eaves ?? 1, base: o.base ?? { m: 1, h: 1 }, overhang: 1 });
  main.place(s, 0, 0, o.mainZ ?? -Math.floor(hd / 3));
  if (o.side !== false && hw >= 7) {
    for (const sx of [-1, 1]) {
      const sd = new Stamp();
      hall(sd, { w: o.sideBays ?? 3, d: 1, h: 2, roof: 'yingshan', tile: o.sideTile || tile, porch: 'front', overhang: 1, wen: false });
      sd.place(s, sx * (hw - 3), 0, o.sideZ ?? Math.floor(hd / 3), sx < 0 ? 1 : 3);
    }
  }
  if (o.gate) {
    const g = new Stamp();
    hall(g, { w: 3, d: 1, h: 2, roof: 'xieshan', tile, trim: o.trim, porch: 'none', overhang: 1 });
    g.place(s, 0, 0, hd);
  }
  return s;
}

// 民居/商铺：硬山灰瓦
export function house(w = 5, d = 3, o = {}) {
  const s = new Stamp();
  const hx = Math.floor(w / 2), hz = Math.floor(d / 2);
  const h = o.h ?? 2;
  for (let y = 0; y < h; y++)
    for (let z = -hz; z <= hz; z++)
      for (let x = -hx; x <= hx; x++) {
        const edge = Math.abs(x) === hx || Math.abs(z) === hz;
        if (!edge) { s.set(x, y, z, C.DARK); continue; }
        let c = o.wall ?? C.BRICK_L;
        if (z === hz && y === 0 && Math.abs(x) < hx) c = (x & 1) ? (o.door ?? C.WOOD) : (o.win ?? C.RED_D);
        if (o.shop && z === hz && y === 1 && Math.abs(x) < hx) c = (x & 1) ? C.WINDOW : C.WOOD_D;
        s.set(x, y, z, c);
      }
  roof(s, { x0: -hx, x1: hx, z0: -hz - 1, z1: hz + 1, y: h, type: o.roof ?? 'yingshan', tile: o.tile || TILE.grey, gable: o.wall ?? C.BRICK_L, wen: false, upturn: false, steps: [1] });
  return s;
}

export function boat(sail = true) {
  const s = new Stamp();
  for (let x = -2; x <= 2; x++) s.set(x, 0, 0, C.BOAT);
  s.set(-3, 0, 0, C.WOOD_D); s.set(3, 0, 0, C.WOOD_D);
  if (sail) { s.set(0, 1, 0, C.WOOD); s.set(0, 2, 0, C.SAIL); s.set(0, 3, 0, C.SAIL); s.set(1, 2, 0, C.SAIL); s.set(-2, 1, 0, C.LANTERN); }
  else { s.set(0, 1, 0, C.WOOD_L); s.set(1, 1, 0, C.WOOD_L); }
  return s;
}

// 简洁的确定性随机
export function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 城墙角楼（明清内外城四角，砖砌箭楼式）
export function cornerTowerCity() {
  return arrowTower({ hx: 6, hz: 6, rows: 3, h: 5, arch: false, baosha: false });
}

// 元大都城门：砖甃城台 + 单檐歇山灰瓦
export function yuanGate(o = {}) {
  const s = new Stamp();
  const n = o.arches ?? 1;
  const arches = n === 3 ? [{ x: 0, w: 3, h: 3 }, { x: -6, w: 3, h: 3 }, { x: 6, w: 3, h: 3 }] : [{ x: 0, w: 3, h: 3 }];
  chengtai(s, { x0: -(o.pw ?? 10), x1: o.pw ?? 10, z0: -5, z1: 5, h: 5, color: C.BRICK_L, base: C.EARTH_D, arches, doorColor: C.WOOD_D, parapet: 'low', parapetColor: C.EARTH_L, topColor: C.EARTH_L });
  hall(s, { y: 5, w: o.bays ?? 5, d: 2, h: 3, roof: 'xieshan', tile: TILE.grey, porch: 'around', overhang: 1, base: { m: 1, h: 1, stairs: [], color: C.EARTH_L } });
  return s;
}

// 元南郊坛：三成土坛
export function yuanAltar() {
  const s = new Stamp();
  [7, 5, 3].forEach((r, k) => {
    for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) if (x * x + z * z <= (r + 0.45) ** 2) s.set(x, k, z, k === 2 ? C.EARTH_L : C.EARTH);
  });
  for (let z = -11; z <= 11; z++) for (let x = -11; x <= 11; x++) {
    const d = Math.sqrt(x * x + z * z);
    if (Math.abs(d - 10.5) < 0.6 && Math.abs(x) > 1 && Math.abs(z) > 1) s.set(x, 0, z, C.EARTH_D);
  }
  return s;
}

// 燕墩（烟墩）：方形砖台，下大上小；清乾隆十八年（1753）台顶立御碑
export function yandun(withStele = true) {
  const s = new Stamp();
  const H = 5;
  for (let y = 0; y < H; y++) {
    const r = y < 3 ? 4 : 4;
    for (let z = -r; z <= r; z++)
      for (let x = -r; x <= r; x++) {
        // 收分：上两层削去四角，形成下大上小的轮廓
        if (y >= 3 && Math.abs(x) === r && Math.abs(z) === r) continue;
        const edge = Math.abs(x) === r || Math.abs(z) === r;
        let c = y === 0 ? C.MARBLE_D : (hash3(x, y, z) < 0.18 ? C.BRICK_D : C.BRICK);
        if (y === H - 1) c = edge ? C.MARBLE_D : C.BRICK_L;
        s.set(x, y, z, c);
      }
  }
  if (withStele) {
    // 须弥座、碑身（南北两面刻满汉文《御制皇都篇》《御制帝都篇》）、碑帽
    for (let z = -1; z <= 1; z++) for (let x = -2; x <= 2; x++) s.set(x, H, z, C.MARBLE_D);
    for (let y = H + 1; y < H + 5; y++) for (let x = -1; x <= 1; x++) s.set(x, y, 0, C.MARBLE);
    for (let z = -1; z <= 1; z++) for (let x = -2; x <= 2; x++) s.set(x, H + 5, z, Math.abs(z) === 1 ? C.GR2 : C.GR3);
    s.set(0, H + 6, 0, C.GR3);
  }
  return s;
}
