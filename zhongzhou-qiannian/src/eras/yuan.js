// 元大都（至元二十二年迁居新城之后，约 1285—1307 年间的面貌）
import * as A from '../arch.js';
import { hall, pavilion, chengtai, redWall, paifang, huabiao, tree } from '../kit.js';
import {
  BOUNDS, Z, X, put, withFlags, AX, CH, cityFabric, fields, sprinkleTrees, lakes, referenceWaters, lotusPatch, LHC,
  river, shoreTrees, wallRun, bridge, C, TILE, G, Stamp, mulberry,
} from './common.js';

const YS = -160;   // 大都南墙
const YN = Z.yuanN; // 大都北墙（今土城）
const PW = -246;   // 宫城南墙（崇天门）
const PN = -392;   // 宫城北墙（厚载门）

export function buildYuan(w) {
  const r = mulberry(7);
  // ---------- 地面 ----------
  w.gRect(BOUNDS.x0, BOUNDS.z0, BOUNDS.x1, BOUNDS.z1, G.GRASS);
  fields(w, BOUNDS.x0, BOUNDS.z0, BOUNDS.x1, BOUNDS.z1, r);
  cityFabric(w, X.innerW, YN, X.innerE, YS, { laneStep: 7, streetStep: 24 });
  // 萧墙（皇城）内
  w.gRect(-115, -432, 62, -202, G.GRASS);
  // 中轴御道
  w.gRect(-3, YS + 40, 3, YS, G.ROAD);
  w.gRect(-12, -200, 12, YS - 2, G.PAVE);
  w.gRect(-2, -244, 2, YS, G.PAVE_L);
  w.gRect(-3, Z.wanning + 2, 3, -432, G.ROAD);
  w.gRect(-3, -470, 3, Z.wanning, G.ROAD);
  // ---------- 水系 ----------
  lakes(w, ['haizi', 'taiye']);
  referenceWaters(w);
  lotusPatch(w, -73, -428, 7, 4, 0.45, 7);
  // 通惠河（玉河）：海子 → 万宁桥 → 萧墙东侧南流 → 出城 → 通州
  river(w, [[-6, -452], [0, Z.wanning], [30, -447], [66, -440], [66, -200], [44, -170], [30, YS + 2], [30, YS + 12], [70, -120], [152, -96]], 2);
  // 金水河：自玉泉山引来，入太液池；南支经周桥
  river(w, [[BOUNDS.x0, -428], [-150, -424], [-120, -420], [-96, -416]], 2);
  river(w, [[-80, -294], [-74, -250], [-60, -214], [0, -212], [62, -214], [66, -214]], 2);
  // 高梁河 → 海子
  river(w, [[BOUNDS.x0, -505], [-170, -510], [-146, -520], [-124, -522]], 2);
  // 护城河
  w.gLine([[X.innerW - 6, YS + 6], [X.innerW - 6, YN - 6], [X.innerE + 6, YN - 6], [X.innerE + 6, YS + 6], [X.innerW - 6, YS + 6]], 3, G.WATER);
  // ---------- 城墙：夯土，十一门 ----------
  wallRun(w, 'earth', X.innerW, YS, X.innerE, YS, 'S', { thick: 6, h: 4 });
  wallRun(w, 'earth', X.innerW, YN, X.innerE, YN, 'N', { thick: 6, h: 4 });
  wallRun(w, 'earth', X.innerW, YN, X.innerW, YS, 'W', { thick: 6, h: 4 });
  wallRun(w, 'earth', X.innerE, YN, X.innerE, YS, 'E', { thick: 6, h: 4 });
  const gate = (x, z, rot, id, label, o = {}) => put(w, A.yuanGate(o), x, z, { rot, id, label, kind: o.axis ? 'axis' : 'gate', clear: true, axis: o.axis, change: o.axis, node: o.axis, gate: true });
  gate(0, YS, 0, 'lizhengmen', '丽正门', { arches: 3, pw: 12, axis: true });
  gate(-60, YS, 0, 'shunchengmen', '顺承门');
  gate(52, YS, 0, 'wenmingmen', '文明门');
  gate(-55, YN, 2, 'jiandemen', '健德门');
  gate(40, YN, 2, 'anzhenmen', '安贞门');
  gate(X.innerE, -330, 1, 'qihuamen', '齐化门');
  gate(X.innerE, -440, 1, 'chongrenmen', '崇仁门');
  gate(X.innerE, -500, 1, 'guangximen', '光熙门');
  gate(X.innerW, -330, 3, 'pingzemen', '平则门');
  gate(X.innerW, -440, 3, 'heyimen', '和义门');
  gate(X.innerW, -500, 3, 'suqingmen', '肃清门');
  for (const [x, z] of [[X.innerW, YS], [X.innerE, YS], [X.innerW, YN], [X.innerE, YN]]) {
    const s = new Stamp();
    for (let y = 0; y < 5; y++) for (let a = -4 + Math.floor(y / 2); a <= 4 - Math.floor(y / 2); a++) for (let b = -4 + Math.floor(y / 2); b <= 4 - Math.floor(y / 2); b++) s.set(a, y, b, (a + b + y) % 5 === 0 ? C.EARTH_D : C.EARTH);
    put(w, s, x, z);
  }
  w.label('大都城墙（夯土）', -110, 6, YS, 'minor', 'dadu-wall');
  w.item('dadu-wall', X.innerW - 3, 0, YS - 3, X.innerE + 3, 4, YS + 3);

  // ---------- 丽正门以北：千步廊、棂星门、周桥 ----------
  withFlags(w, AX | CH, () => {
    for (const sx of [-1, 1]) {
      const lang = new Stamp();
      hall(lang, { w: 13, d: 1, h: 2, roof: 'yingshan', tile: TILE.grey, porch: 'front', overhang: 0, wen: false, wall: C.RED_D });
      put(w, lang, sx * 9, -182, { rot: sx < 0 ? 1 : 3 });
    }
  });
  w.item('yuan-qianbulang', -11, 0, -197, 11, 4, -167);
  w.label('千步廊', 0, 5, -182, 'bld', 'yuan-qianbulang');
  // 萧墙（红门阑马墙）
  wallRun(w, 'red', -115, -202, 62, -202, 'S', { thick: 2, h: 3, gaps: [[-12, -203, 12, -200]] });
  wallRun(w, 'red', -115, -432, 62, -432, 'N', { thick: 2, h: 3 });
  wallRun(w, 'red', -115, -432, -115, -202, 'W', { thick: 2, h: 3, gaps: [[-116, -334, -112, -326]] });
  wallRun(w, 'red', 61, -432, 61, -202, 'E', { thick: 2, h: 3, gaps: [[60, -304, 64, -296]] });
  // 棂星门：三门
  const lx = new Stamp();
  for (const x of [-8, 0, 8]) {
    const g = new Stamp();
    hall(g, { w: x === 0 ? 3 : 2, d: 1, h: 3, roof: 'xieshan', tile: TILE.yuan, trim: C.G1, porch: 'none', overhang: 1 });
    for (let y = 0; y < 2; y++) for (let a = -1; a <= 1; a++) for (let z = -1; z <= 1; z++) g.set(a, y, z, 0);
    g.place(lx, x, 0, 0);
  }
  put(w, lx, 0, -202, { axis: true, change: true, id: 'lingxingmen', label: '棂星门', node: true, clear: true });
  // 周桥：白石三桥并列
  withFlags(w, AX | CH, () => { for (const x of [-4, 0, 4]) bridge(w, x, -212, 7, 3, 'z', { peak: 1 }); });
  w.item('zhouqiao', -6, 0, -216, 6, 2, -208);
  w.label('周桥', 12, 3, -212, 'axis', 'zhouqiao');
  w.axisNodes.push({ id: 'zhouqiao', x: 0, z: -212, y: 2, label: '周桥' });
  w.gRect(-40, -244, 40, -214, G.PAVE);

  // ---------- 宫城（大内） ----------
  w.gRect(-49, PN + 1, 49, PW - 1, G.PAVE);
  w.gRect(-2, PN + 1, 2, PW - 1, G.PAVE_L);
  const pwall = (ax, az, bx, bz, out, gaps) => {
    const horiz = az === bz;
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    for (let y = 0; y <= 4; y++) for (let a = 0; a < 2; a++) {
      if (horiz) for (let x = x0; x <= x1; x++) { if (gaps && gaps.some((g) => x >= g[0] && x <= g[1])) continue; w.set(x, y, z0 + a, y === 4 ? C.G2 : C.RED_WALL); }
      else for (let z = z0; z <= z1; z++) { if (gaps && gaps.some((g) => z >= g[0] && z <= g[1])) continue; w.set(x0 + a, y, z, y === 4 ? C.G2 : C.RED_WALL); }
    }
  };
  pwall(-50, PW, 50, PW, 'S', [[-22, 22]]);
  pwall(-50, PN, 50, PN, 'N', [[-13, 13]]);
  pwall(-50, PN, -50, PW, 'W', [[-306, -294]]);
  pwall(49, PN, 49, PW, 'E', [[-306, -294]]);
  put(w, A.wumen('yuan'), 0, PW, { axis: true, change: true, id: 'chongtianmen', label: '崇天门', node: true, clear: true });
  for (const [x, z] of [[-50, PW], [50, PW], [-50, PN], [50, PN]]) put(w, A.cornerTower('yuan'), x, z, { y: 5, id: 'yuan-jiaolou' });
  put(w, A.palaceGate('yuan', 5), 0, PN, { axis: true, change: true, rot: 2, id: 'houzaimen', label: '厚载门', node: true, clear: true, gate: true });
  put(w, A.palaceGate('yuan', 3), 50, -300, { rot: 1, id: 'yuan-donghuamen', label: '东华门', kind: 'minor', clear: true, gate: true });
  put(w, A.palaceGate('yuan', 3), -50, -300, { rot: 3, id: 'yuan-xihuamen', label: '西华门', kind: 'minor', clear: true, gate: true });
  // 大明门
  const dmm = new Stamp();
  hall(dmm, { w: 7, d: 2, h: 3, roof: 'xieshan', tile: TILE.yuan, trim: C.G1, porch: 'none', base: { m: 1, h: 1, rail: true }, overhang: 1 });
  put(w, dmm, 0, -264, { axis: true, change: true, id: 'yuan-damingmen', label: '大明门', node: true });
  // 大明殿周庑 + 四隅角楼
  const cloister = (x0, z0, x1, z1, gapS, gapN) => {
    for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) {
      if (z === z1 && Math.abs(x) <= gapS) continue;
      if (z === z0 && Math.abs(x) <= gapN) continue;
      w.set(x, 0, z, C.RED_D); w.set(x, 1, z, C.RED_D); w.set(x, 2, z, (x & 1) ? C.WHITE : C.MARBLE_D); w.set(x, 3, z, C.G2);
    }
    for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) { w.set(x, 0, z, C.RED_D); w.set(x, 1, z, C.RED_D); w.set(x, 2, z, (z & 1) ? C.WHITE : C.MARBLE_D); w.set(x, 3, z, C.G2); }
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      const p = new Stamp();
      pavilion(p, { shape: 'square', r: 2, h: 2, eaves: 1, tiles: [TILE.yuan], trim: C.G1, finial: 1 });
      put(w, p, x, z, { y: 2 });
    }
  };
  cloister(-32, -318, 32, -268, 4, 2);
  put(w, A.gongzi({ front: 11, frontD: 4, rear: 5, rearD: 2, corridor: 8 }), 0, -284, { axis: true, change: true, id: 'damingdian', label: '大明殿', node: true });
  // 延春门、延春阁
  const ycm = new Stamp();
  hall(ycm, { w: 5, d: 2, h: 3, roof: 'xieshan', tile: TILE.yuan, trim: C.G1, porch: 'none', base: { m: 1, h: 1 }, overhang: 1 });
  put(w, ycm, 0, -324, { axis: true, change: true, id: 'yanchunmen', label: '延春门', kind: 'minor' });
  cloister(-28, -376, 28, -328, 4, 2);
  put(w, A.gongzi({ front: 9, frontD: 4, rear: 5, rearD: 2, corridor: 6, frontTower: true }), 0, -342, { axis: true, change: true, id: 'yanchunge', label: '延春阁', node: true });
  // 宫城内东西两侧配殿
  for (const sx of [-1, 1]) for (const z of [-280, -300, -345, -365]) {
    const pd = new Stamp();
    hall(pd, { w: 5, d: 2, h: 2, roof: 'xieshan', tile: TILE.yuan, trim: C.G1, base: { m: 1, h: 1 }, overhang: 1 });
    put(w, pd, sx * 41, z, { rot: sx < 0 ? 1 : 3 });
  }
  // ---------- 御苑：花木与毡帐 ----------
  w.gRect(-60, -431, 60, PN - 3, G.PARK);
  const yr = mulberry(19);
  for (let i = 0; i < 70; i++) {
    const x = -56 + Math.floor(yr() * 112), z = -429 + Math.floor(yr() * 32);
    if (w.height(x, z) >= 0 || Math.abs(x) < 4) continue;
    tree(w, x, 0, z, yr() < 0.4 ? 'blossom' : yr() < 0.5 ? 'round' : 'pine', yr);
  }
  const yurts = [[-18, -410], [-11, -414], [-22, -419], [14, -412], [21, -417]];
  yurts.forEach(([x, z], i) => put(w, A.yurt(i === 0 ? 3 : 2, i === 0), x, z, { id: 'yuan-yurt', clear: true }));
  w.label('御苑·毡帐', -18, 8, -414, 'bld', 'yuan-yurt');
  w.item('yuan-yuyuan', -60, 0, -431, 60, 4, PN - 3);

  // ---------- 太液池、万寿山、圆坻、隆福宫、兴圣宫 ----------
  const isl = A.hill([{ x: 0, z: 0, r: 9, h: 6 }]);
  put(w, isl, -78, -392);
  w.gEllipse(-78, -392, 9.5, 9.5, G.GRASS);
  const ghd = new Stamp();
  hall(ghd, { w: 7, d: 2, h: 3, eaves: 2, roof: 'xieshan', tile: TILE.yuan, trim: C.G1, porch: 'around', overhang: 1 });
  put(w, ghd, -78, -392, { y: 7, id: 'guanghandian', label: '广寒殿' });
  for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) if (x * x + z * z <= 30) { w.set(-58 + x, 0, -353 + z, C.EARTH); w.set(-58 + x, 1, -353 + z, C.EARTH_L); }
  const yt = new Stamp();
  pavilion(yt, { shape: 'round', r: 3, h: 3, eaves: 2, tiles: [TILE.yuan, TILE.yuan], trim: C.G1, finial: 1 });
  put(w, yt, -58, -353, { y: 2, id: 'yitiandian', label: '仪天殿（圆坻）' });
  for (let x = -96; x <= -64; x++) for (let z = -354; z <= -352; z++) { w.set(x, 0, z, C.MARBLE); if (z !== -353 && (x & 1) === 0) w.set(x, 1, z, C.MARBLE); }
  for (let z = -383; z <= -359; z++) for (let x = -63; x <= -61; x++) w.set(x, 0, z, C.MARBLE);
  w.label('太液池', -84, 3, -420, 'geo', 'taiyechi');
  w.item('taiyechi', -95, 0, -437, -62, 1, -292);
  put(w, A.compound({ hw: 8, hd: 15, bays: 5, depth: 2, roof: 'wudian', tile: TILE.yuan, trim: C.G1, sideTile: TILE.yuan, gate: true, eaves: 2 }), -105, -258, { id: 'longfugong', label: '隆福宫' });
  put(w, A.compound({ hw: 8, hd: 15, bays: 5, depth: 2, roof: 'wudian', tile: TILE.yuan, trim: C.G1, sideTile: TILE.yuan, gate: true, eaves: 2 }), -105, -398, { id: 'xingshenggong', label: '兴圣宫' });
  put(w, A.yurt(2), -105, -373, {});
  put(w, A.yurt(2), -99, -378, {});

  // ---------- 北段：万宁桥、海子、中心台、钟鼓楼 ----------
  withFlags(w, AX | CH, () => bridge(w, 0, Z.wanning, 7, 7, 'z', { peak: 1 }));
  w.item('wanningqiao', -4, 0, Z.wanning - 4, 4, 2, Z.wanning + 4);
  w.label('万宁桥（海子桥）', 14, 3, Z.wanning, 'axis', 'wanningqiao');
  w.axisNodes.push({ id: 'wanningqiao', x: 0, z: Z.wanning, y: 2, label: '万宁桥' });
  put(w, A.centerPavilion(), 0, Z.drum, { axis: true, change: true, id: 'zhongxintai', label: '中心台·中心阁', node: true });
  put(w, A.drumTower('yuan'), -20, Z.drum, { id: 'qizhenglou', label: '鼓楼（齐政楼）' });
  put(w, A.bellTower('yuan'), -20, Z.bell, { id: 'yuan-zhonglou', label: '钟楼' });
  // 海子：漕船云集
  const br = mulberry(23);
  for (let i = 0; i < 26; i++) {
    const x = -10 - Math.floor(br() * 110), z = -450 - Math.floor(br() * 75);
    if (w.gAt(x, z) !== G.WATER || w.gAt(x + 3, z) !== G.WATER || w.gAt(x - 3, z) !== G.WATER) continue;
    put(w, A.boat(br() < 0.6), x, z, { rot: br() < 0.5 ? 0 : 1 });
  }
  w.label('积水潭（海子）', -70, 3, -505, 'geo', 'haizi');
  w.item('haizi', -128, 0, -530, -3, 1, -446);
  // 斜街商肆
  for (let i = 0; i < 14; i++) {
    const x = -6 - i * 2, z = -456 - i * 1.5;
    if (w.gAt(x + 3, Math.round(z) - 3) === G.WATER) continue;
    put(w, A.house(3, 3, { h: 2 }), x + 3, Math.round(z) - 4);
  }
  for (let z = Z.wanning - 8; z > Z.drum + 10; z -= 6) for (const sx of [1]) put(w, A.house(5, 3, { shop: true, h: 2 }), sx * 8, z, { rot: 3 });
  w.label('通惠河', 92, 3, -116, 'geo', 'tonghuihe');
  w.label('金水河', -160, 3, -425, 'geo', 'jinshuihe');

  // ---------- 左祖右社（元代分设于齐化门、平则门内） ----------
  put(w, A.compound({ hw: 12, hd: 12, bays: 7, depth: 2, roof: 'wudian', tile: TILE.yuan, trim: C.G1, sideTile: TILE.yuan, gate: true, eaves: 2 }), 102, -322, { id: 'yuan-taimiao', label: '太庙（齐化门内）' });
  put(w, A.shejitan(), -126, -350, { id: 'yuan-shejitan', label: '社稷坛（平则门内）' });
  put(w, A.dagoba({ big: true }), -122, -312, { id: 'miaoying-baita', label: '妙应寺白塔' });

  // ---------- 城南郊野：南郊坛、金中都旧城（南城）、莲花池 ----------
  put(w, A.yuanAltar(), 46, -64, { id: 'yuan-nanjiao', label: '南郊坛' });
  // 南城：金中都旧城墙残迹
  for (let z = -150; z <= 40; z++) for (const x of [-186, -150]) if (((z * 13) % 11) > 2) { w.set(x, 0, z, C.EARTH); if (((z * 7) % 5) > 1) w.set(x, 1, z, C.EARTH_D); }
  for (let x = -186; x <= -150; x++) for (const z of [-150]) if (((x * 13) % 11) > 2) { w.set(x, 0, z, C.EARTH); w.set(x, 1, z, C.EARTH_D); }
  w.gRect(-185, -149, -151, 40, G.DIRT);
  fields(w, -185, -149, -151, 40, mulberry(4), (t) => t === G.DIRT);
  for (const [x, z] of [[-170, -120], [-162, -100], [-175, -60], [-160, -30], [-170, 10]]) put(w, A.house(5, 3, { h: 2, tile: TILE.grey }), x, z);
  w.label('南城（金中都旧城）', -168, 5, -40, 'geo', 'jinzhongdu');
  w.item('jinzhongdu', -186, 0, -150, -150, 2, 40);
  w.label('玉渊潭', -186, 3, -297, 'geo', 'yuyuantan');
  w.item('yuyuantan', -200, 0, -303, -169, 1, -292);
  w.label('莲花池', LHC.x, 3, LHC.z, 'geo', 'lianhuachi');
  w.item('lianhuachi', LHC.x - LHC.rx, 0, LHC.z - LHC.rz, LHC.x + LHC.rx, 1, LHC.z + LHC.rz);
  w.label('护城河（今小月河一带）', -100, 3, YN - 6, 'geo', 'xiaoyuehe');
  w.item('xiaoyuehe', X.innerW - 8, 0, YN - 8, X.innerE + 8, 1, YN - 4);
  // 村落
  for (const [x, z] of [[-40, -40], [-34, -36], [80, -20], [86, -26], [-100, 10], [110, 20], [-20, 20]]) put(w, A.house(5, 3, { h: 2, tile: TILE.grey, wall: C.EARTH_L }), x, z);
  // ---------- 树木 ----------
  shoreTrees(w, 'haizi', 31, 'willow', 0.55);
  shoreTrees(w, 'taiye', 32, 'willow', 0.4);
  sprinkleTrees(w, X.innerW + 6, YN + 6, X.innerE - 6, YS - 6, 0.13, ['round', 'small', 'willow'], 201, (x, z, t) => t === G.CITY);
  sprinkleTrees(w, BOUNDS.x0 + 2, YS + 8, BOUNDS.x1 - 2, BOUNDS.z1 - 2, 0.05, ['round', 'willow'], 202, (x, z, t) => t !== G.WATER && t !== G.ROAD);
  const gr = mulberry(222);
  for (let i = 0; i < 60; i++) {
    const x = -206 + Math.floor(gr() * 42), z = -312 + Math.floor(gr() * 28);
    if (w.gAt(x, z) === G.WATER || w.height(x, z) >= 0) continue;
    tree(w, x, 0, z, gr() < 0.5 ? 'willow' : 'round', gr);
  }
}
