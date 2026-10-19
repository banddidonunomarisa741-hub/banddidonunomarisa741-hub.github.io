// 金中都建筑模型（宋金式：绿琉璃、鸱尾、斗拱硕大、屋面平缓、过梁式门道、廊院）
// 依据：范成大《揽辔录》、楼钥《北行日录》对中都宫阙的记述，及宋汴京宣德门形制。
import { Stamp } from './stamp.js';
import { C, TILE } from './palette.js';
import { hall, chengtai, pavilion, terrace, inShape } from './kit.js';
import { hash3 } from './world.js';

// 中都城门：夯土城台、过梁式门道、单檐庑殿门楼（灰瓦）
export function jinCityGate(o = {}) {
  const s = new Stamp();
  const n = o.doors ?? 1;
  const doors = n === 3 ? [{ x: 0, w: 3, h: 3 }, { x: -5, w: 3, h: 3 }, { x: 5, w: 3, h: 3 }] : [{ x: 0, w: 3, h: 3 }];
  chengtai(s, {
    x0: -(o.pw ?? 9), x1: o.pw ?? 9, z0: -5, z1: 5, h: 5, color: C.EARTH, base: C.EARTH_D, arches: doors,
    doorColor: C.RED_D, parapet: 'low', parapetColor: C.EARTH_L, topColor: C.EARTH_L,
  });
  hall(s, { y: 5, w: o.bays ?? 5, d: 2, h: 3, roof: 'wudian', tile: TILE.grey, porch: 'around', overhang: 1, base: { m: 1, h: 1, stairs: [], color: C.EARTH_L } });
  return s;
}

// 应天门：宫城正门，门楼十一间，左右朵楼，前出两阙，以飞廊相连 —— 午门“凹”字形的前身
export function yingtianmen() {
  const s = new Stamp();
  const H = 6;
  chengtai(s, {
    x0: -26, x1: 26, z0: -6, z1: 6, h: H, color: C.RED_WALL, base: C.MARBLE, topColor: C.PAVE,
    arches: [{ x: 0, w: 3, h: 4 }, { x: -6, w: 3, h: 4 }, { x: 6, w: 3, h: 4 }, { x: -12, w: 3, h: 3 }, { x: 12, w: 3, h: 3 }],
    doorColor: C.RED_D, parapet: 'low', parapetColor: C.RED,
  });
  const main = new Stamp();
  hall(main, { w: 11, d: 3, h: 3, roof: 'wudian', tile: TILE.yellow, porch: 'around', wen: 2, dougong: true });
  main.place(s, 0, H, -1);
  for (const sx of [-1, 1]) {
    // 朵楼
    const d = new Stamp();
    hall(d, { w: 3, d: 2, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'around' });
    d.place(s, sx * 21, H, -1);
    // 阙台 + 阙楼（子母阙）
    chengtai(s, { x0: sx < 0 ? -28 : 20, x1: sx < 0 ? -20 : 28, z0: 10, z1: 18, h: H, color: C.RED_WALL, base: C.MARBLE, topColor: C.PAVE, parapet: 'low', parapetColor: C.RED });
    const q = new Stamp();
    hall(q, { w: 2, d: 2, h: 3, eaves: 2, roof: 'wudian', tile: TILE.yellow, porch: 'around', upperH: 2 });
    q.place(s, sx * 24, H, 14);
    // 飞廊
    for (let z = 6; z <= 10; z++) {
      for (let k = 0; k < H; k++) s.set(sx * 24, k, z, k === 0 ? C.MARBLE : C.RED_WALL);
      s.set(sx * 23, H, z, C.RED); s.set(sx * 25, H, z, C.RED);
      for (let x = -1; x <= 1; x++) s.set(sx * 24 + x, H + 1, z, (z & 1) ? C.Y2 : C.Y1);
    }
  }
  return s;
}

// 宣阳门：皇城南门，三门道，门楼七间
export function xuanyangmen() {
  const s = new Stamp();
  chengtai(s, {
    x0: -15, x1: 15, z0: -4, z1: 4, h: 5, color: C.RED_WALL, base: C.MARBLE, topColor: C.PAVE,
    arches: [{ x: 0, w: 3, h: 3 }, { x: -6, w: 3, h: 3 }, { x: 6, w: 3, h: 3 }], doorColor: C.RED_D, parapet: 'low', parapetColor: C.RED,
  });
  hall(s, { y: 5, w: 7, d: 2, h: 3, roof: 'wudian', tile: TILE.yellow, porch: 'around', dougong: true });
  return s;
}

// 廊院：四面回廊、四隅角楼（宋金宫殿的院落形式，元代沿用）
export function cloister(s, x0, z0, x1, z1, gapS = 3, gapN = 2) {
  const set = (x, z, top) => {
    s.set(x, 0, z, C.RED); s.set(x, 1, z, C.WALL_W); s.set(x, 2, z, C.RED); s.set(x, 3, z, top);
  };
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) {
    if (z === z1 && Math.abs(x) <= gapS) continue;
    if (z === z0 && Math.abs(x) <= gapN) continue;
    set(x, z, (x & 1) ? C.Y1 : C.Y2);
  }
  for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) set(x, z, (z & 1) ? C.Y1 : C.Y2);
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    const p = new Stamp();
    hall(p, { w: 2, d: 2, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'around' });
    p.place(s, x, 0, z);
  }
}

// 大安殿：正殿十一间、重檐庑殿，左右朵殿各五间，殿前龙墀，四周廊院
export function daandian() {
  const s = new Stamp();
  cloister(s, -30, -22, 30, 16, 4, 3);
  // 台基（两层，前出龙墀）
  terrace(s, 0, [
    { x0: -26, x1: 26, z0: -14, z1: 9, h: 1 },
    { x0: -15, x1: 15, z0: -12, z1: 4, h: 1 },
  ], { rail: true, stairs: [{ x: -6, w: 3, side: 'S' }, { x: 6, w: 3, side: 'S' }] });
  const main = new Stamp();
  hall(main, { w: 11, d: 5, h: 4, eaves: 2, roof: 'wudian', tile: TILE.yellow, porch: 'front', wen: 2, dougong: true });
  main.place(s, 0, 2, -5);
  for (const sx of [-1, 1]) {
    const d = new Stamp();
    hall(d, { w: 5, d: 3, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'front' });
    d.place(s, sx * 21, 1, -6);
  }
  // 大安门
  const g = new Stamp();
  hall(g, { w: 5, d: 2, h: 3, roof: 'wudian', tile: TILE.yellow, porch: 'none', base: { m: 1, h: 1, stairs: [] } });
  g.place(s, 0, 0, 16);
  return s;
}

// 仁政殿：常朝之所，九间单檐歇山，前出抱厦，廊院
export function renzhengdian() {
  const s = new Stamp();
  cloister(s, -24, -14, 24, 12, 3, 2);
  const main = new Stamp();
  hall(main, { w: 9, d: 4, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'front', base: { m: 2, h: 1, rail: true }, wen: 2 });
  main.place(s, 0, 0, -3);
  const b = new Stamp();
  hall(b, { w: 3, d: 1, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'open' });
  b.place(s, 0, 1, 5);
  const g = new Stamp();
  hall(g, { w: 3, d: 1, h: 3, roof: 'wudian', tile: TILE.yellow, porch: 'none' });
  g.place(s, 0, 0, 12);
  return s;
}

// 后宫寝殿：工字形布局的雏形
export function jinQindian() {
  const s = new Stamp();
  const a = new Stamp();
  hall(a, { w: 7, d: 3, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'front', base: { m: 1, h: 1 } });
  a.place(s, 0, 0, 0);
  const b = new Stamp();
  hall(b, { w: 7, d: 3, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'front', base: { m: 1, h: 1 } });
  b.place(s, 0, 0, -14);
  for (let z = -10; z <= -4; z++) for (let x = -2; x <= 2; x++) {
    s.set(x, 0, z, C.MARBLE);
    if (Math.abs(x) === 2 && (z & 1)) { s.set(x, 1, z, C.RED); s.set(x, 2, z, C.RED); }
    if (Math.abs(x) <= 2) s.set(x, 3, z, Math.abs(x) === 0 ? C.Y3 : C.Y1);
  }
  return s;
}

// 千步廊：东西两列长廊，北端文楼、武楼
export function qianbulangJin(len) {
  const s = new Stamp();
  const h = new Stamp();
  hall(h, { w: Math.floor(len / 2), d: 1, h: 2, roof: 'xuanshan', tile: TILE.grey, porch: 'front', wen: false, upturn: false, dougong: false });
  h.place(s, 0, 0, 0, 0);
  return s;
}

export function wenlou() {
  const s = new Stamp();
  hall(s, { w: 3, d: 2, h: 3, eaves: 2, roof: 'xieshan', tile: TILE.yellow, porch: 'around', stories: [true], upperH: [2], base: { m: 1, h: 1 } });
  return s;
}

// 龙津桥：宣阳门外跨金水河，汉白玉三道，栏杆望柱雕狮（与卢沟桥同时代）
export function longjinqiao(len = 11) {
  const s = new Stamp();
  const hl = Math.floor(len / 2);
  for (let z = -hl; z <= hl; z++) {
    const hgt = Math.max(1, Math.round(2 * (1 - Math.abs(z) / (hl + 0.5)) + 0.4));
    for (let x = -6; x <= 6; x++) {
      for (let y = 0; y < hgt; y++) s.set(x, y, z, x === -6 || x === 6 ? C.MARBLE_D : (Math.abs(x) === 2 ? C.MARBLE_D : C.BRIDGE));
      if ((x === -6 || x === 6) && (z & 1) === 0) { s.set(x, hgt, z, C.MARBLE); s.set(x, hgt + 1, z, C.GRANITE_D); }
    }
  }
  // 桥头石狮
  for (const [x, z] of [[-7, -hl - 1], [7, -hl - 1], [-7, hl + 1], [7, hl + 1]]) { s.set(x, 0, z, C.MARBLE_D); s.set(x, 1, z, C.GRANITE_D); }
  return s;
}

// 天宁寺塔：辽代八角十三层密檐砖塔，高约 57.8 米（画面中缩矮）
export function tianningPagoda() {
  const s = new Stamp();
  // 须弥座（两层八角）
  for (const [r, y0, h, c] of [[6, 0, 1, C.BRICK_D], [5, 1, 2, C.BRICK_L], [4, 3, 1, C.MARBLE_D]])
    for (let y = y0; y < y0 + h; y++)
      for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) if (inShape('oct', x, z, r)) s.set(x, y, z, c);
  // 平座 + 莲台
  for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) if (inShape('oct', x, z, 4)) s.set(x, 4, z, C.EARTH_L);
  // 塔身（一层较高，开券门、假窗）
  for (let y = 5; y < 9; y++)
    for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) {
      if (!inShape('oct', x, z, 3)) continue;
      let c = C.BRICK_L;
      if ((Math.abs(x) === 3 && z === 0) || (Math.abs(z) === 3 && x === 0)) c = y < 8 ? C.DARK : C.BRICK_L;
      s.set(x, y, z, c);
    }
  // 十三层密檐
  let y = 9;
  for (let i = 0; i < 13; i++) {
    const r = i < 4 ? 4 : i < 9 ? 3 : 2;
    for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) if (inShape('oct', x, z, r)) s.set(x, y, z, C.GR2);
    const rb = Math.max(1, r - 1);
    for (let z = -rb; z <= rb; z++) for (let x = -rb; x <= rb; x++) if (inShape('oct', x, z, rb)) s.set(x, y + 1, z, C.BRICK_L);
    y += 2;
  }
  for (let k = 0; k < 3; k++) s.set(0, y + k, 0, k === 2 ? C.GOLD : C.GOLD_D);
  return s;
}

// 白云观（金太极宫，元长春宫）
export function baiyunguan() {
  const s = new Stamp();
  for (let z = -12; z <= 12; z++) for (let x = -7; x <= 7; x++) {
    const e = Math.abs(x) === 7 || Math.abs(z) === 12;
    if (!e || (z === 12 && Math.abs(x) <= 1)) continue;
    s.set(x, 0, z, C.RED_WALL); s.set(x, 1, z, C.GR2);
  }
  for (const [z, w] of [[8, 3], [0, 5], [-8, 5]]) {
    const h = new Stamp();
    hall(h, { w, d: 2, h: 3, roof: 'xieshan', tile: TILE.grey, porch: 'front', base: { m: 1, h: 1 }, wen: false });
    h.place(s, 0, 0, z);
  }
  return s;
}

// 鱼藻池中的鱼藻殿（同乐园）
export function yuzaodian() {
  const s = new Stamp();
  for (let z = -5; z <= 5; z++) for (let x = -6; x <= 6; x++) if ((x * x) / 40 + (z * z) / 28 <= 1) s.set(x, 0, z, C.MARBLE_D);
  const p = new Stamp();
  pavilion(p, { shape: 'square', r: 2, h: 3, eaves: 2, tiles: [TILE.yellow, TILE.yellow], upperH: 2, finial: 1 });
  p.place(s, 0, 1, 0);
  return s;
}

// 里坊：坊墙 + 坊门 + 院落
export function fang(hw, hd, seed) {
  const s = new Stamp();
  for (let z = -hd; z <= hd; z++) for (let x = -hw; x <= hw; x++) {
    const e = Math.abs(x) === hw || Math.abs(z) === hd;
    if (!e) continue;
    if ((z === hd || z === -hd) && Math.abs(x) <= 1) continue;
    if ((x === hw || x === -hw) && Math.abs(z) <= 1) continue;
    s.set(x, 0, z, C.EARTH_L);
  }
  let k = 0;
  for (let z = -hd + 3; z <= hd - 3; z += 6)
    for (let x = -hw + 4; x <= hw - 4; x += 7) {
      if (hash3(x + seed, z, seed) < 0.28) continue;
      const h = new Stamp();
      const ww = 5, dd = 3;
      for (let y = 0; y < 2; y++) for (let zz = -1; zz <= 1; zz++) for (let xx = -2; xx <= 2; xx++) {
        const edge = Math.abs(xx) === 2 || Math.abs(zz) === 1;
        h.set(xx, y, zz, !edge ? C.DARK : (zz === 1 && y === 0 && Math.abs(xx) < 2 && (xx & 1)) ? C.WOOD : C.WALL_W);
      }
      for (let zz = -2; zz <= 2; zz++) for (let xx = -3; xx <= 3; xx++) h.set(xx, 2, zz, Math.abs(zz) === 2 ? C.GR2 : (zz === 0 ? C.GR3 : C.GR1));
      for (let xx = -3; xx <= 3; xx++) h.set(xx, 3, 0, C.GR3);
      h.place(s, x, 0, z);
      k++;
      void ww; void dd;
    }
  return s;
}
