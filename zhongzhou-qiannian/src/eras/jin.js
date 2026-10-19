// 金中都（贞元元年 1153 迁都—贞祐二年 1214 南迁），画面约为大定、明昌年间（1170—1190）
// 坐标：x 向东、z 向南，x=0 为金中都中轴线（约东经 116.344°），z=0 为应天门。比例约 1 格 18 米，宫城适度放大。
import * as A from '../arch.js';
import * as J from '../arch-jin.js';
import { hall, redWall, earthWall, tree, paifang } from '../kit.js';
import { put, withFlags, AX, CH, fields, sprinkleTrees, river, C, TILE, G, Stamp, mulberry } from './common.js';

export const JIN_BOUNDS = { x0: -176, x1: 172, z0: -182, z1: 134 };
const W = -114, E = 133, N = -136, S = 102;     // 城墙
const HW = -80, HE = 58, HN = -86, HS = 52;      // 皇城
const PW = -38, PE = 38, PN = -78, PS = 0;       // 宫城

export function buildJin(w) {
  const r = mulberry(1153);
  const B = JIN_BOUNDS;
  // ---------- 地面 ----------
  w.gRect(B.x0, B.z0, B.x1, B.z1, G.GRASS);
  fields(w, B.x0, B.z0, B.x1, B.z1, r);
  w.gRect(W, N, E, S, G.CITY);
  // 皇城内
  w.gRect(HW, HN, HE, HS, G.GRASS);
  w.gRect(PW, PN, PE, PS, G.PAVE);
  w.gRect(-3, PN, 3, PS, G.PAVE_L);
  // 街道：通各城门的大街
  const street = (ax, az, bx, bz, wd = 5) => w.gRect(Math.min(ax, bx) - (ax === bx ? wd >> 1 : 0), Math.min(az, bz) - (az === bz ? wd >> 1 : 0), Math.max(ax, bx) + (ax === bx ? wd >> 1 : 0), Math.max(az, bz) + (az === bz ? wd >> 1 : 0), G.ROAD);
  street(0, HS, 0, S, 7);                 // 丰宜门—宣阳门（御路）
  w.gRect(-1, HS, 1, S, G.PAVE_L);
  street(0, N, 0, HN, 5);                 // 拱辰门以北—通玄门
  street(W, -90, E, -90);                 // 彰义门—施仁门
  street(W, -24, HW, -24); street(HE, -24, E, -24);   // 颢华门、宣曜门
  street(W, 50, HW, 50); street(HE, 50, E, 50);       // 丽泽门、阳春门
  street(-62, N, -62, S); street(66, N, 66, S);       // 端礼门、景风门南北大街
  street(-96, N, -96, S, 3); street(100, N, 100, S, 3);
  // ---------- 水系 ----------
  // 莲花池（古西湖）：金中都的水源
  w.gEllipse(-142, -116, 15, 17, G.WATER);
  w.gEllipse(-136, -102, 7, 6, G.WATER);
  // 莲花河：入城后经同乐园（鱼藻池）、宫前金水河，向东南出城
  river(w, [[-132, -100], [-122, -84], [-114, -64], [-96, -54], [HW, -40], [-62, -26]], 3);
  w.gEllipse(-60, -20, 14, 10, G.WATER);                    // 鱼藻池（同乐园太液池）
  river(w, [[-64, -10], [-70, 20], [-70, 64], [0, 64], [90, 64], [92, 80], [92, S + 12], [100, B.z1]], 3);
  // 护城河
  w.gLine([[W - 9, N - 9], [E + 9, N - 9], [E + 9, S + 9], [W - 9, S + 9], [W - 9, N - 9]], 3, G.WATER);
  w.gLine([[W - 9, -60], [-132, -100]], 3, G.WATER);
  // ---------- 城墙与十三门 ----------
  const gaps = (pts, axis) => pts.map((p) => (axis === 'z' ? [p - 3, -9999, p + 3, 9999] : [-9999, p - 3, 9999, p + 3]));
  const skipOf = (list) => (x, z) => list.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  const wallOpt = (list) => ({ thick: 6, h: 4, skip: skipOf(list) });
  earthWall(w, W, S, E, S, wallOpt(gaps([-62, 0, 66], 'z')));
  earthWall(w, W, N, E, N, wallOpt(gaps([-70, 0, 50, 100], 'z')));
  earthWall(w, W, N, W, S, wallOpt(gaps([-90, -24, 50], 'x')));
  earthWall(w, E, N, E, S, wallOpt(gaps([-90, -24, 50], 'x')));
  // 马面
  for (let x = W + 14; x < E - 8; x += 22) for (const z of [N - 4, S + 4]) {
    if ([-70, 0, 50, 100, -62, 66].some((g) => Math.abs(g - x) < 6)) continue;
    for (let y = 0; y < 4; y++) for (let a = -1; a <= 1; a++) for (let b = 0; b < 2; b++) w.set(x + a, y, z + (z < 0 ? -b : b), C.EARTH);
  }
  for (let z = N + 14; z < S - 8; z += 22) for (const x of [W - 4, E + 4]) {
    if ([-90, -24, 50].some((g) => Math.abs(g - z) < 6)) continue;
    for (let y = 0; y < 4; y++) for (let a = -1; a <= 1; a++) for (let b = 0; b < 2; b++) w.set(x + (x < 0 ? -b : b), y, z + a, C.EARTH);
  }
  const gate = (x, z, rot, id, label, o = {}) => put(w, J.jinCityGate(o), x, z, { rot, id, label, kind: o.axis ? 'axis' : 'gate', clear: true, gate: true, axis: o.axis, change: true, node: o.node, hero: o.hero });
  gate(0, S, 0, 'fengyimen', '丰宜门', { doors: 3, pw: 11, bays: 7, axis: true, node: true });
  gate(-62, S, 0, 'duanlimen', '端礼门');
  gate(66, S, 0, 'jingfengmen', '景风门');
  gate(0, N, 2, 'tongxuanmen', '通玄门', { axis: true, node: true });
  gate(-70, N, 2, 'huichengmen', '会城门');
  gate(50, N, 2, 'chongzhimen', '崇智门');
  gate(100, N, 2, 'guangtaimen', '光泰门');
  gate(W, -90, 3, 'zhangyimen', '彰义门');
  gate(W, -24, 3, 'haohuamen', '颢华门');
  gate(W, 50, 3, 'lizemen', '丽泽门');
  gate(E, -90, 1, 'shirenmen', '施仁门');
  gate(E, -24, 1, 'xuanyaomen', '宣曜门');
  gate(E, 50, 1, 'yangchunmen', '阳春门');
  w.label('中都城墙（夯土，周约十八公里）', -150, 6, 20, 'minor', 'jin-wall');
  w.item('jin-wall', W - 4, 0, -10, W + 4, 4, 30);

  // ---------- 皇城、宫城 ----------
  const hg = (pts, axis) => pts.map((p) => (axis === 'z' ? [p - 4, -9999, p + 4, 9999] : [-9999, p - 4, 9999, p + 4]));
  redWall(w, HW, HS, HE, HS, { h: 3, thick: 2, skip: skipOf(hg([0], 'z')), cap: C.Y2 });
  redWall(w, HW, HN, HE, HN, { h: 3, thick: 2, skip: skipOf(hg([0], 'z')), cap: C.Y2 });
  redWall(w, HW, HN, HW, HS, { h: 3, thick: 2, skip: skipOf(hg([-40, -24], 'x')), cap: C.Y2 });
  redWall(w, HE - 1, HN, HE - 1, HS, { h: 3, thick: 2, skip: skipOf(hg([-24], 'x')), cap: C.Y2 });
  redWall(w, PW, PN, PE, PN, { h: 4, thick: 2, skip: skipOf(hg([0], 'z')), cap: C.Y2 });
  redWall(w, PW, PN, PW, PS, { h: 4, thick: 2, skip: skipOf(hg([-40], 'x')), cap: C.Y2 });
  redWall(w, PE - 1, PN, PE - 1, PS, { h: 4, thick: 2, skip: skipOf(hg([-40], 'x')), cap: C.Y2 });
  for (const [x, z] of [[PW, PN], [PE, PN]]) {
    const t = new Stamp();
    hall(t, { w: 2, d: 2, h: 2, roof: 'xieshan', tile: TILE.yellow, porch: 'around' });
    put(w, t, x, z, { y: 4 });
  }

  // 丰宜门内御路两侧
  for (let z = 74; z < 98; z += 7) for (const sx of [-1, 1]) {
    put(w, A.house(5, 3, { shop: true, h: 2, tile: TILE.grey, wall: C.WALL_W }), sx * 8, z, { rot: sx < 0 ? 1 : 3 });
  }
  // 龙津桥
  put(w, J.longjinqiao(9), 0, 64, { axis: true, change: true, id: 'longjinqiao', label: '龙津桥', node: true, hero: true });
  // 宣阳门
  put(w, J.xuanyangmen(), 0, HS, { axis: true, change: true, id: 'xuanyangmen', label: '宣阳门', node: true, clear: true, gate: true });
  // 千步廊、文楼武楼
  withFlags(w, AX | CH, () => {
    for (const sx of [-1, 1]) {
      const l = new Stamp();
      hall(l, { w: 11, d: 1, h: 2, roof: 'xuanshan', tile: TILE.grey, porch: 'front', wen: false, upturn: false, overhang: 0 });
      put(w, l, sx * 10, 35, { rot: sx < 0 ? 1 : 3 });
    }
  });
  w.gRect(-7, 22, 7, 47, G.PAVE);
  w.gRect(-1, 22, 1, 47, G.PAVE_L);
  w.item('jin-qianbulang', -12, 0, 23, 12, 4, 47);
  w.label('千步廊', 0, 5, 35, 'bld', 'jin-qianbulang');
  w.axisNodes.push({ id: 'jin-qianbulang', x: 0, z: 35, y: 4, label: '千步廊' });
  put(w, J.wenlou(), -18, 26, { rot: 1, id: 'jin-wenlou', label: '文楼', kind: 'minor', hero: true });
  put(w, J.wenlou(), 18, 26, { rot: 3, id: 'jin-wulou', label: '武楼', kind: 'minor', hero: true });
  // 应天门
  put(w, J.yingtianmen(), 0, PS, { axis: true, change: true, id: 'yingtianmen', label: '应天门', node: true, clear: true, gate: true });
  // 大安殿、仁政殿
  put(w, J.daandian(), 0, -26, { axis: true, change: true, id: 'daandian', label: '大安殿', node: true });
  put(w, J.renzhengdian(), 0, -62, { axis: true, change: true, id: 'renzhengdian', label: '仁政殿', node: true });
  // 拱辰门（宫城北门）
  const gc = new Stamp();
  hall(gc, { w: 5, d: 2, h: 3, roof: 'wudian', tile: TILE.yellow, porch: 'none', base: { m: 1, h: 1, stairs: [] } });
  for (let y = 1; y < 3; y++) for (let z = -2; z <= 2; z++) for (let x = -1; x <= 1; x++) gc.set(x, y, z, 0);
  put(w, gc, 0, PN, { axis: true, change: true, id: 'gongchenmen', label: '拱辰门', node: true, clear: true, gate: true });
  // 宫城东西两侧殿宇
  for (const sx of [-1, 1]) for (const z of [-50, -20, -66]) {
    const h = new Stamp();
    hall(h, { w: 3, d: 2, h: 2, roof: 'xieshan', tile: TILE.yellow, base: { m: 1, h: 1 } });
    put(w, h, sx * 32, z, { rot: sx < 0 ? 1 : 3 });
  }
  // 同乐园：鱼藻池中的鱼藻殿
  put(w, J.yuzaodian(), -60, -20, { id: 'yuzaodian', label: '鱼藻池（同乐园）', hero: true });
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, k = 1.2 + r() * 0.25;
    const x = Math.round(-60 + Math.cos(a) * 14 * k), z = Math.round(-20 + Math.sin(a) * 10 * k);
    if (x <= HW + 2 || x >= PW - 2 || w.gAt(x, z) === G.WATER || w.height(x, z) >= 0) continue;
    tree(w, x, 0, z, r() < 0.5 ? 'willow' : 'blossom', r);
  }
  w.gRect(HW + 2, -80, PW - 3, 48, G.PARK);
  w.gEllipse(-60, -20, 14, 10, G.WATER);
  // 皇城东部：尚书省等衙署（示意）
  for (const z of [-60, -30, 0, 30]) put(w, A.compound({ hw: 7, hd: 6, bays: 3, depth: 1, roof: 'xieshan', tile: TILE.grey, wall: 'grey', side: false }), 49, z);
  w.label('尚书省等衙署', 49, 5, -15, 'minor');

  // ---------- 城内：天宁寺塔、里坊 ----------
  for (let z = -124; z <= -104; z++) for (let x = -26; x <= -4; x++) {
    const e = x === -26 || x === -4 || z === -124 || z === -104;
    if (e && !(z === -104 && Math.abs(x + 15) <= 1)) { w.set(x, 0, z, C.RED_WALL); w.set(x, 1, z, C.GR2); }
  }
  put(w, J.tianningPagoda(), -15, -114, { id: 'tianningsi', label: '天宁寺塔', hero: true });
  // 里坊：以街道划分，坊墙围合，四面开坊门
  let seed = 3;
  const xs = [W, -96, -62, 0, 66, 100, E], zs = [N, -90, -24, 50, S];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < zs.length - 1; j++) {
      const bx0 = xs[i] + 6, bx1 = xs[i + 1] - 6, bz0 = zs[j] + 6, bz1 = zs[j + 1] - 6;
      if (bx1 - bx0 < 14 || bz1 - bz0 < 12) continue;
      const nx = Math.max(1, Math.round((bx1 - bx0) / 30)), nz = Math.max(1, Math.round((bz1 - bz0) / 26));
      const cw = (bx1 - bx0) / nx, cd = (bz1 - bz0) / nz;
      for (let a2 = 0; a2 < nx; a2++) for (let b2 = 0; b2 < nz; b2++) {
        const cx = Math.round(bx0 + cw * (a2 + 0.5)), cz = Math.round(bz0 + cd * (b2 + 0.5));
        const hw = Math.floor(cw / 2) - 2, hd = Math.floor(cd / 2) - 2;
        if (hw < 6 || hd < 4) continue;
        if (cx + hw > HW - 4 && cx - hw < HE + 4 && cz + hd > HN - 4 && cz - hd < HS + 4) continue;
        if (cx + hw > -30 && cx - hw < 0 && cz + hd > -128 && cz - hd < -100) continue;
        let wet = false;
        for (let dz = -hd; dz <= hd && !wet; dz += 2) for (let dx = -hw; dx <= hw; dx += 2) if (w.gAt(cx + dx, cz + dz) === G.WATER) { wet = true; break; }
        if (wet) continue;
        put(w, J.fang(hw, hd, seed++), cx, cz);
      }
    }
  sprinkleTrees(w, W + 8, N + 8, E - 8, S - 8, 0.1, ['round', 'small', 'willow'], 1153, (x, z, t) => t === G.CITY);

  // ---------- 城外 ----------
  put(w, J.baiyunguan(), -36, -160, { id: 'baiyunguan', label: '太极宫（今白云观）', hero: true });
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2, k = 1.12 + r() * 0.35;
    const x = Math.round(-142 + Math.cos(a) * 15 * k), z = Math.round(-112 + Math.sin(a) * 19 * k);
    if (x < B.x0 + 1 || w.gAt(x, z) === G.WATER || w.height(x, z) >= 0) continue;
    tree(w, x, 0, z, r() < 0.65 ? 'willow' : 'round', r);
  }
  for (const [x, z] of [[-160, 40], [-150, 70], [150, 30], [160, -60], [40, 120], [-60, 122], [150, 110], [-40, -172], [110, -168]])
    put(w, A.house(5, 3, { h: 2, tile: TILE.grey, wall: C.EARTH_L }), x, z);
  sprinkleTrees(w, B.x0 + 2, B.z0 + 2, B.x1 - 2, B.z1 - 2, 0.04, ['round', 'willow'], 1192, (x, z, t) => t !== G.WATER && t !== G.ROAD && t !== G.CITY && (x < W - 12 || x > E + 12 || z < N - 12 || z > S + 12));

  // ---------- 标注 ----------
  w.label('莲花池（金中都水源）', -142, 3, -116, 'geo', 'lianhuachi');
  w.item('lianhuachi', -157, 0, -133, -127, 1, -96);
  w.label('莲花河', -120, 3, -80, 'geo', 'lianhuahe');
  w.label('金水河', 40, 3, 64, 'geo', 'jin-jinshuihe');
  w.label('→ 东约 4 公里：日后元明清的中轴线（今天安门一线）', 150, 5, -20, 'geo', 'jin-to-yuan');
  w.label('↗ 东北约 5 公里：大宁宫（今北海琼华岛），元大都由此起建', 120, 5, -170, 'geo', 'daninggong');
  w.label('← 西南约 13 公里：卢沟桥（1192 年建成）', -150, 5, 96, 'geo', 'lugouqiao');
  w.label('里坊', 100, 4, 20, 'minor', 'jin-fang');
  w.item('jin-fang', 88, 0, 10, 112, 2, 30);
}
