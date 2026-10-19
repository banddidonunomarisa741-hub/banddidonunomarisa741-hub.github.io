// 四个时期共用：底板范围、坐标、放置/登记工具、水系、城市肌理
import { Stamp } from '../stamp.js';
import { C, TILE, F_AXIS, F_CHANGE, HERO_SHIFT } from '../palette.js';
import { ST } from '../style.js';
import { G } from '../ground.js';
import { tree, archBridge, brickWall, earthWall, redWall } from '../kit.js';
import { mulberry } from '../arch.js';

// 示意布局：南北顺序、东西方位依据官方地图；间距按段压缩，建筑适度放大。
export const BOUNDS = { x0: -212, x1: 152, z0: -568, z1: 62 };
export const HEIGHT = 40;

// 关键南北位置（z 向南为正）
export const Z = {
  outerS: 26, tiantanS: 22, tiantanN: -60, tianqiao: -62, longxu: -63,
  pailou: -85, zhengyangBridge: -90, moatS0: -95, moatS1: -92,
  jianlou: -101, zhengyang: -117, qipan: -122, daming: -128,
  changan: -162, jinshui: -169, tiananmen: -178, huangS: -182,
  duanmen: -194, wumen: -235, fcS: -232, fcN: -374,
  jingshanS: -384, jingshanC: -400, jingshanN: -430, dianmen: -440,
  wanning: -448, drum: -478, bell: -496, innerN: -515, yuanN: -545,
};
export const X = { innerW: -140, innerE: 128, outerW: -152, outerE: 140, huangW: -100, huangE: 62 };

// ---------- 放置与登记 ----------
export function put(w, s, x, z, o = {}) {
  const prev = w.flags;
  if (o.axis) w.flags |= F_AXIS;
  if (o.change) w.flags |= F_CHANGE;
  const flagBits = w.flags;
  // 重点建筑：轴线节点默认是，近景时换细模
  let hero = null;
  if ((o.node || o.hero) && o.hero !== false && w.heroes.length < 63) {
    hero = { idx: w.heroes.length + 1, id: o.id, stamp: s, x, y: o.y ?? 0, z, rot: o.rot ?? 0, flags: flagBits, style: ST.cur.key, tag: o.tag, noFine: o.noFine };
    w.heroes.push(hero);
    w.flags |= hero.idx << HERO_SHIFT;
  }
  if (o.clear) {
    const b0 = rotBounds(s, o.rot ?? 0);
    w.box(x + b0.x0, (o.y ?? 0), z + b0.z0, x + b0.x1, (o.y ?? 0) + s.maxy, z + b0.z1, 0);
  }
  const b = s.place(w, x, o.y ?? 0, z, o.rot ?? 0);
  w.flags = prev;
  if (hero) hero.bbox = b;
  if (o.gate) {
    const rot = o.rot ?? 0;
    w.gates.push({ x, z, axis: rot & 1 ? 'x' : 'z', w: o.gateW ?? 5, bbox: b });
  }
  if (o.id) w.item(o.id, b.x0, b.y0, b.z0, b.x1, b.y1, b.z1);
  if (o.label) w.label(o.label, x, b.y1 + 2, z, o.kind || (o.axis ? 'axis' : 'bld'), o.id);
  if (o.node) w.axisNodes.push({ id: o.id, x, z, y: b.y1, label: o.label });
  return b;
}

function rotBounds(s, rot) {
  const pts = [[s.minx, s.minz], [s.maxx, s.maxz]].map(([x, z]) => {
    switch (rot & 3) {
      case 0: return [x, z];
      case 1: return [z, -x];
      case 2: return [-x, -z];
      default: return [-z, x];
    }
  });
  return { x0: Math.min(pts[0][0], pts[1][0]), x1: Math.max(pts[0][0], pts[1][0]), z0: Math.min(pts[0][1], pts[1][1]), z1: Math.max(pts[0][1], pts[1][1]) };
}

export function withFlags(w, flags, fn) {
  const prev = w.flags;
  w.flags |= flags;
  fn();
  w.flags = prev;
}
export const AX = F_AXIS, CH = F_CHANGE;

// ---------- 地面 ----------
// 城市肌理：街坊 + 胡同
export function cityFabric(w, x0, z0, x1, z1, o = {}) {
  const base = o.base ?? G.CITY, lane = o.lane ?? G.LANE;
  const only = o.only;
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++) {
      const t = w.gAt(x, z);
      if (only && !only(t)) continue;
      let c = base;
      if (((z - z0) % (o.laneStep ?? 7)) === 0) c = lane;
      if (((x - x0) % (o.streetStep ?? 26)) === 0) c = o.street ?? G.ROAD;
      w.g(x, z, c);
    }
}

export function fields(w, x0, z0, x1, z1, r, only) {
  const kinds = [G.FIELD_A, G.FIELD_B, G.FIELD_C, G.MEADOW, G.FIELD_A, G.GRASS];
  for (let z = z0; z <= z1;) {
    const ph = 4 + Math.floor(r() * 5);
    for (let x = x0; x <= x1;) {
      const pw = 5 + Math.floor(r() * 7);
      const t = kinds[Math.floor(r() * kinds.length)];
      const stripe = r() < 0.4;
      for (let dz = 0; dz < ph; dz++)
        for (let dx = 0; dx < pw; dx++) {
          const xx = x + dx, zz = z + dz;
          if (xx > x1 || zz > z1) continue;
          if (only && !only(w.gAt(xx, zz))) continue;
          let c = t;
          if (dx === 0 || dz === 0) c = G.MEADOW;
          else if (stripe && t !== G.GRASS && (dz & 1)) c = t === G.FIELD_B ? G.FIELD_A : G.FIELD_B;
          w.g(xx, zz, c);
        }
      x += pw;
    }
    z += ph;
  }
}

// 散布小树（城区庭院树）
export function sprinkleTrees(w, x0, z0, x1, z1, density, kinds, seed, ok) {
  const r = mulberry(seed);
  for (let z = z0; z <= z1; z += 4)
    for (let x = x0; x <= x1; x += 4) {
      if (r() > density) continue;
      const tx = x + Math.floor(r() * 4), tz = z + Math.floor(r() * 4);
      if (ok && !ok(tx, tz, w.gAt(tx, tz))) continue;
      if (w.height(tx, tz) >= 0 || w.height(tx + 1, tz) >= 0 || w.height(tx - 1, tz) >= 0 || w.height(tx, tz + 1) >= 0 || w.height(tx, tz - 1) >= 0) continue;
      tree(w, tx, 0, tz, kinds[Math.floor(r() * kinds.length)], r);
    }
}

// ---------- 水系 ----------
export const LAKES = {
  // 什刹海（明清以后）
  qianhai: [[-6, -451], [-4, -458], [-10, -466], [-18, -471], [-26, -470], [-24, -462], [-16, -455]],
  houhai: [[-26, -472], [-34, -474], [-48, -480], [-62, -487], [-76, -492], [-80, -488], [-66, -480], [-50, -473], [-36, -469]],
  xihai: [[-82, -494], [-86, -500], [-96, -508], [-104, -506], [-102, -497], [-92, -492]],
  // 元代海子（积水潭）：范围大得多
  haizi: [[-3, -448], [-6, -458], [-18, -466], [-30, -472], [-44, -486], [-58, -500], [-76, -514], [-100, -526], [-122, -530], [-128, -516], [-110, -500], [-86, -488], [-62, -474], [-40, -462], [-22, -452], [-10, -446]],
  // 西苑三海
  beihai: [[-62, -356], [-64, -372], [-62, -392], [-64, -412], [-70, -432], [-80, -437], [-92, -434], [-95, -414], [-93, -390], [-94, -370], [-90, -356], [-76, -353]],
  zhonghai: [[-64, -292], [-66, -312], [-64, -332], [-66, -349], [-80, -351], [-90, -348], [-90, -324], [-88, -300], [-80, -290]],
  nanhai: [[-64, -192], [-62, -212], [-63, -236], [-66, -258], [-64, -282], [-78, -287], [-92, -282], [-96, -258], [-95, -228], [-92, -200], [-80, -190]],
  // 元太液池（今北海 + 中海；南海为明初开挖）
  taiye: [[-62, -296], [-64, -330], [-62, -372], [-62, -392], [-64, -412], [-70, -432], [-80, -437], [-92, -434], [-95, -414], [-93, -380], [-92, -340], [-90, -300], [-80, -292]],
  // 参照地标
  yuyuantan: null, lianhuachi: null,
};

export function lakes(w, list) {
  for (const k of list) w.gPoly(LAKES[k], G.WATER);
}

// 玉渊潭、莲花池：位于底板西缘，方位示意
export const LHC = { x: -199, z: -95, rx: 10, rz: 11 }; // 莲花池
export const YYT = { x: -186, z: -298 };                // 玉渊潭

export function referenceWaters(w) {
  // 玉渊潭（东湖、西湖两片）
  w.gEllipse(-190, -297, 10, 5.5, G.WATER);
  w.gEllipse(-176, -301, 7, 4.5, G.WATER);
  w.gRect(-184, -301, -182, -298, G.WATER);
  // 莲花池：边缘略作起伏，池中大片荷叶荷花
  for (let z = LHC.z - LHC.rz - 1; z <= LHC.z + LHC.rz + 1; z++)
    for (let x = LHC.x - LHC.rx - 1; x <= LHC.x + LHC.rx + 1; x++) {
      const a = Math.atan2(z - LHC.z, x - LHC.x);
      const wob = 1 + 0.08 * Math.sin(a * 5) + 0.05 * Math.sin(a * 3 + 1);
      const dx = (x + 0.5 - LHC.x) / (LHC.rx * wob), dz = (z + 0.5 - LHC.z) / (LHC.rz * wob);
      if (dx * dx + dz * dz <= 1) w.g(x, z, G.WATER);
    }
  lotusPatch(w, LHC.x, LHC.z, LHC.rx - 2, LHC.rz - 2, 0.5, 3);
}

// 荷叶荷花：地面铺荷叶，少量粉色花朵立在水面上
export function lotusPatch(w, cx, cz, rx, rz, density, seed = 1) {
  for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz;
      if (dx * dx + dz * dz > 1) continue;
      if (w.gAt(x, z) !== G.WATER) continue;
      const n = hash2(Math.floor(x / 3) + seed * 31, Math.floor(z / 3)) * 0.65 + hash2(x + seed, z * 7) * 0.35;
      if (n < 1 - density) continue;
      w.g(x, z, G.LOTUS);
      const f = hash2(x * 13 + seed, z * 17);
      if (f < 0.035) w.set(x, 0, z, C.LOTUS_P);
      else if (f < 0.07) w.set(x, 0, z, C.LOTUS_L);
    }
}

function hash2(x, z) {
  let h = (x * 374761393 + z * 668265263 + 1013904223) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10007) / 10007;
}

// 河道
export function river(w, pts, width, t = G.WATER) { w.gLine(pts, width, t); }

// 树丛（沿岸柳树）
export function shoreTrees(w, lakeKey, seed, kind = 'willow', density = 0.5) {
  const pts = LAKES[lakeKey];
  const r = mulberry(seed);
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const len = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < len; s += 4) {
      if (r() > density) continue;
      const x = Math.round(ax + (bx - ax) * s / len), z = Math.round(az + (bz - az) * s / len);
      // 向外推 2 格，落在岸上
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz) || 1;
      const tx = Math.round(x + dx / d * 3), tz = Math.round(z + dz / d * 3);
      if (w.gAt(tx, tz) === G.WATER || w.height(tx, tz) >= 0) continue;
      tree(w, tx, 0, tz, kind, r);
    }
  }
}

// 城墙（直段），自动在门位留口
export function wallRun(w, kind, ax, az, bx, bz, out, o = {}) {
  const gaps = o.gaps || [];
  const skip = (x, z) => gaps.some(([gx0, gz0, gx1, gz1]) => x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1);
  const opts = { out, skip, thick: o.thick, h: o.h, mamian: o.mamian };
  if (kind === 'earth') earthWall(w, ax, az, bx, bz, opts);
  else if (kind === 'red') redWall(w, ax, az, bx, bz, { ...opts, thick: o.thick ?? 2, h: o.h ?? 3 });
  else brickWall(w, ax, az, bx, bz, opts);
}

// 对角斜墙（明内城西北角“缺角”）
export function diagWall(w, ax, az, bx, bz, o = {}) {
  const n = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
  const th = o.thick ?? 5, h = o.h ?? 4;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(ax + (bx - ax) * i / n), z = Math.round(az + (bz - az) * i / n);
    for (let a = -Math.floor(th / 2); a <= Math.floor(th / 2); a++)
      for (let y = 0; y < h; y++) {
        w.set(x + a, y, z, y === h - 1 ? C.BRICK_L : C.BRICK);
      }
    if ((i & 1) === 0) w.set(x - Math.floor(th / 2), h, z, C.BRICK);
  }
}

// 长桥/小桥
export function bridge(w, x, z, len, wid, dir = 'z', o = {}) {
  archBridge(w, x, z, len, wid, { dir, peak: o.peak ?? 1, color: o.color, rail: o.rail });
}

export { C, TILE, G, Stamp, tree, mulberry };

// ---------------------------------------------------------------------------
// 自动补桥：门前有水建石桥；道路跨河建平桥。保证“出门不跳河”。
// ---------------------------------------------------------------------------
const isWaterG = (t) => t === G.WATER || t === G.WATER_D || t === G.LOTUS;
const ROADS = new Set([G.ROAD, G.PAVE, G.PAVE_L, G.ASPHALT, G.PLAZA, G.LANE]);

export function autoBridges(w) {
  const deck = new Map(); // key -> {x,z,dir}
  const key = (x, z) => x + ',' + z;
  // 1) 城门、宫门
  for (const g of w.gates) {
    const b = g.bbox;
    const half = Math.floor(g.w / 2);
    const lines = g.axis === 'z'
      ? [{ from: b.z1 + 1, step: 1 }, { from: b.z0 - 1, step: -1 }]
      : [{ from: b.x1 + 1, step: 1 }, { from: b.x0 - 1, step: -1 }];
    for (const L of lines) {
      const at = (s) => (g.axis === 'z' ? [g.x, s] : [s, g.z]);
      let s = L.from, n = 0;
      while (n < 16 && !isWaterG(w.gAt(...at(s)))) { s += L.step; n++; }
      if (n >= 16) continue;
      const start = s;
      let len = 0;
      while (len < 18 && isWaterG(w.gAt(...at(s)))) { s += L.step; len++; }
      if (len === 0 || len >= 18) continue;
      const [cx, cz] = at(start);
      if (w.height(cx, cz) >= 0) continue; // 已经有桥
      // 门到桥之间铺路
      for (let t = L.from; t !== start; t += L.step)
        for (let a = -half + 1; a <= half - 1; a++) {
          const [x, z] = g.axis === 'z' ? [g.x + a, t] : [t, g.z + a];
          if (!isWaterG(w.gAt(x, z)) && w.height(x, z) < 0) w.g(x, z, G.PAVE);
        }
      for (let t = start - L.step; t !== s + L.step; t += L.step)
        for (let a = -half; a <= half; a++) {
          const [x, z] = g.axis === 'z' ? [g.x + a, t] : [t, g.z + a];
          deck.set(key(x, z), { x, z, dir: g.axis, edge: Math.abs(a) === half });
        }
    }
  }
  // 2) 道路跨河：水面两侧都是路且路继续延伸
  const { x0, x1, z0, z1 } = w;
  const scan = (axis) => {
    const outerA = axis === 'x' ? [z0, z1] : [x0, x1];
    const innerA = axis === 'x' ? [x0, x1] : [z0, z1];
    for (let o = outerA[0]; o <= outerA[1]; o++) {
      let i = innerA[0];
      while (i <= innerA[1]) {
        const at = (k) => (axis === 'x' ? w.gAt(k, o) : w.gAt(o, k));
        if (!isWaterG(at(i))) { i++; continue; }
        const a = i;
        while (i <= innerA[1] && isWaterG(at(i))) i++;
        const bnd = i - 1, len = bnd - a + 1;
        if (len > 9) continue;
        if (!ROADS.has(at(a - 1)) || !ROADS.has(at(a - 2)) || !ROADS.has(at(bnd + 1)) || !ROADS.has(at(bnd + 2))) continue;
        for (let k = a - 1; k <= bnd + 1; k++) {
          const [x, z] = axis === 'x' ? [k, o] : [o, k];
          if (!deck.has(key(x, z))) deck.set(key(x, z), { x, z, dir: axis === 'x' ? 'x' : 'z' });
        }
      }
    }
  };
  scan('x');
  scan('z');
  // 3) 建造：桥面 + 两侧栏杆
  for (const d of deck.values()) {
    if (w.height(d.x, d.z) >= 0) continue;
    w.set(d.x, 0, d.z, isWaterG(w.gAt(d.x, d.z)) ? C.BRIDGE : C.BRICK_L);
  }
  for (const d of deck.values()) {
    if (!isWaterG(w.gAt(d.x, d.z))) continue;
    const side = d.dir === 'z' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
    for (const [dx, dz] of side) {
      const nx = d.x + dx, nz = d.z + dz;
      if (deck.has(key(nx, nz))) continue;
      if (((d.x + d.z) & 1) === 0 && w.get(d.x, 0, d.z) === C.BRIDGE && !w.get(d.x, 1, d.z)) w.set(d.x, 1, d.z, C.MARBLE);
    }
  }
  return deck.size;
}
