// 明（嘉靖—明末）、清（乾隆前后）、当代（2024 申遗成功时）三个时期的中轴线
// 三者共用同一套骨架，按时期替换建筑形制与有无。
import * as A from '../arch.js';
import { hall, pavilion, chengtai, terrace, redWall, roof, body, eaveRing, paifang, huabiao, lion, furnish, tree, treeRow, scatterTrees } from '../kit.js';
import {
  BOUNDS, Z, X, put, withFlags, AX, CH, cityFabric, fields, sprinkleTrees, lakes, referenceWaters, lotusPatch, LHC,
  river, shoreTrees, wallRun, diagWall, bridge, C, TILE, G, Stamp, mulberry,
} from './common.js';

function legacy(w, fn) {
  const prev = w.flags;
  w.flags &= ~CH;
  fn();
  w.flags = prev;
}

export function buildMQM(w, era) {
  const M = era === 'ming', Q = era === 'qing', N = era === 'modern';
  const ctx = { w, era, M, Q, N };
  // 明代：相对元大都几乎全部新建，默认整体标为“变迁”，元代遗存单独去掉
  if (M) w.flags |= CH;
  paintGround(ctx);
  waters(ctx);
  cityWalls(ctx);
  southSection(ctx);
  tiananmenSection(ctx);
  forbiddenCity(ctx);
  northSection(ctx);
  xiyuan(ctx);
  context(ctx);
  greenery(ctx);
}

// ---------------------------------------------------------------------------
// 地面
// ---------------------------------------------------------------------------
function paintGround({ w, M, Q, N }) {
  const r = mulberry(N ? 31 : M ? 11 : 21);
  w.gRect(BOUNDS.x0, BOUNDS.z0, BOUNDS.x1, BOUNDS.z1, G.GRASS);
  // 城外农田（当代为城区）
  if (!N) {
    fields(w, BOUNDS.x0, BOUNDS.z0, BOUNDS.x1, BOUNDS.z1, r);
  }
  // 内城、外城城区肌理
  if (N) {
    cityFabric(w, BOUNDS.x0, BOUNDS.z0, BOUNDS.x1, BOUNDS.z1, { base: G.CITY_N, lane: G.LANE, street: G.ASPHALT, streetStep: 30, laneStep: 8 });
  } else {
    cityFabric(w, X.innerW, Z.innerN, X.innerE, Z.zhengyang, {});
    // 外城：北部（前门一带）稠密，南部多空地、苇塘
    cityFabric(w, X.outerW, Z.zhengyang, X.outerE, Z.tiantanN, {});
    fields(w, X.outerW + 4, Z.tiantanN, X.outerE - 4, Z.outerS - 3, r);
  }
  // 皇城内：草地与铺装（此处统一为草地，宫殿区单独铺装）
  if (!N) {
    w.gRect(X.huangW, Z.dianmen, X.huangE, Z.huangS, G.GRASS);
  } else {
    w.gRect(X.huangW, Z.dianmen, X.huangE, Z.huangS, G.CITY_N);
  }
  // 中轴大街
  const road = N ? G.ASPHALT : G.ROAD;
  w.gRect(-3, Z.outerS + 16, 3, Z.zhengyang, road);
  w.gRect(-3, Z.dianmen, 3, Z.bell - 6, road);
  // 横向主街
  if (N) {
    w.gRect(BOUNDS.x0, Z.changan - 3, BOUNDS.x1, Z.changan + 3, G.ASPHALT); // 长安街
    for (let x = BOUNDS.x0; x <= BOUNDS.x1; x += 4) w.g(x, Z.changan, G.LINE);
    w.gRect(BOUNDS.x0, Z.dianmen - 6, BOUNDS.x1, Z.dianmen - 3, G.ASPHALT);   // 平安大街
    w.gRect(BOUNDS.x0, -52, BOUNDS.x1, -49, G.ASPHALT);                         // 两广大街
    // 二环路（原城墙线）
    const ring = [[X.innerW, Z.innerN + 25], [X.innerW + 25, Z.innerN], [X.innerE, Z.innerN], [X.innerE, Z.zhengyang]];
    w.gLine([[X.innerW, Z.zhengyang], [X.innerW, Z.innerN + 25], [X.innerW + 25, Z.innerN], [X.innerE, Z.innerN], [X.innerE, Z.zhengyang]], 5, G.ASPHALT);
    w.gLine([[X.outerW, Z.zhengyang], [X.outerW, Z.outerS], [X.outerE, Z.outerS], [X.outerE, Z.zhengyang]], 5, G.ASPHALT);
    w.gLine([[X.outerW, Z.zhengyang - 3], [X.outerE, Z.zhengyang - 3]], 5, G.ASPHALT); // 前三门大街
    void ring;
  } else {
    w.gRect(X.innerW, -332, X.innerE, -329, G.ROAD);  // 朝阜大街
    w.gRect(X.huangE, -445, X.innerE, -443, G.ROAD);
    w.gRect(X.innerW, -445, X.huangW, -443, G.ROAD);
    w.gRect(66, Z.innerN, 69, Z.zhengyang, G.ROAD);   // 崇文门内大街
    w.gRect(-80, Z.innerN, -77, Z.zhengyang, G.ROAD); // 宣武门内大街
    w.gRect(X.outerW, -52, X.outerE, -50, G.ROAD);
  }
}

// ---------------------------------------------------------------------------
// 水系
// ---------------------------------------------------------------------------
function waters({ w, M, Q, N }) {
  lakes(w, ['qianhai', 'houhai', 'xihai', 'beihai', 'zhonghai', 'nanhai']);
  referenceWaters(w);
  lotusPatch(w, -15, -461, 6, 4.5, 0.5, 5);   // 前海荷花
  lotusPatch(w, -73, -428, 7, 4, 0.45, 7);    // 北海北岸荷花
  // 筒子河
  w.gRect(-58, Z.fcN - 6, 58, Z.fcN - 1, G.WATER);
  w.gRect(-58, Z.fcN - 6, -53, Z.fcS + 5, G.WATER);
  w.gRect(53, Z.fcN - 6, 58, Z.fcS + 5, G.WATER);
  w.gRect(-58, Z.fcS + 1, -22, Z.fcS + 5, G.WATER);
  w.gRect(22, Z.fcS + 1, 58, Z.fcS + 5, G.WATER);
  // 外金水河
  river(w, [[-62, Z.jinshui], [-30, Z.jinshui], [30, Z.jinshui], [62, Z.jinshui - 2]], 2);
  // 内金水河（弓形）
  river(w, [[-52, -244], [-36, -252], [-20, -249], [0, -247], [20, -249], [36, -252], [52, -246]], 2);
  // 玉河：什刹海 → 万宁桥 → 皇城东侧南流
  if (!N) {
    river(w, [[-6, -452], [0, Z.wanning], [30, -447], [64, -444], [66, -420], [66, -200], [66, -170], [40, -150], [24, -118], [24, -100]], 2);
  } else {
    river(w, [[-6, -452], [0, Z.wanning], [30, -447], [48, -446]], 2); // 2013 年恢复的玉河北段
  }
  // 高梁河（长河）入城 → 积水潭
  river(w, [[BOUNDS.x0, -505], [-170, -508], [-140, -520], [-112, -514], [-100, -506]], 2);
  // 小月河（元大都北护城河故道）
  river(w, [[X.innerW - 2, -551], [X.innerE + 2, -551]], 2);
  river(w, [[X.innerW - 2, -551], [-150, -556], [-166, -568]], 2);
  // 护城河
  if (!N) {
    w.gRect(X.outerW - 1, Z.moatS0, X.outerE + 1, Z.moatS1, G.WATER);            // 前三门护城河
    w.gLine([[X.outerW - 6, Z.zhengyang], [X.outerW - 6, Z.outerS + 19], [X.outerE + 6, Z.outerS + 19], [X.outerE + 6, Z.zhengyang]], 3, G.WATER);
    w.gLine([[X.innerW - 6, Z.zhengyang - 6], [X.innerW - 6, Z.innerN + 25], [X.innerW + 25, Z.innerN - 14], [X.innerE + 6, Z.innerN - 14], [X.innerE + 6, Z.zhengyang - 6]], 3, G.WATER);
    // 龙须沟
    river(w, [[-110, Z.longxu], [-14, Z.longxu], [14, Z.longxu], [110, Z.longxu - 2]], 2);
  } else {
    // 今存：南护城河、北护城河
    w.gLine([[X.outerW - 6, Z.outerS + 19], [X.outerE + 6, Z.outerS + 19]], 3, G.WATER);
    w.gLine([[X.innerW + 25, Z.innerN - 14], [X.innerE + 6, Z.innerN - 14]], 3, G.WATER);
  }
}

// ---------------------------------------------------------------------------
// 城墙与城门：内九外七皇城四
// ---------------------------------------------------------------------------
function cityWalls(ctx) {
  const { w, N } = ctx;
  if (N) {
    // 当代：城墙大多拆除，保留正阳门、德胜门箭楼、东南角楼与明城墙遗址
    wallRun(w, 'brick', 70, Z.zhengyang, X.innerE, Z.zhengyang, 'S', { mamian: 22 });
    wallRun(w, 'brick', X.innerE, Z.zhengyang, X.innerE, Z.zhengyang - 14, 'E');
    put(w, A.cornerTowerCity(), X.innerE, Z.zhengyang, { id: 'dongnanjiaolou', label: '东南角楼', clear: true });
    // 皇城南墙（天安门两侧）
    wallRun(w, 'red', -60, Z.huangS, -22, Z.huangS, 'S', { thick: 2, h: 3 });
    wallRun(w, 'red', 22, Z.huangS, 60, Z.huangS, 'S', { thick: 2, h: 3 });
    return;
  }
  // 内城
  wallRun(w, 'brick', X.innerW, Z.zhengyang, X.innerE, Z.zhengyang, 'S', { mamian: 22 });
  wallRun(w, 'brick', X.innerE, Z.zhengyang, X.innerE, Z.innerN, 'E', { mamian: 24 });
  wallRun(w, 'brick', X.innerW + 25, Z.innerN, X.innerE, Z.innerN, 'N', { mamian: 24 });
  wallRun(w, 'brick', X.innerW, Z.zhengyang, X.innerW, Z.innerN + 25, 'W', { mamian: 24 });
  diagWall(w, X.innerW, Z.innerN + 25, X.innerW + 25, Z.innerN);
  // 外城
  wallRun(w, 'brick', X.outerW, Z.outerS, X.outerE, Z.outerS, 'S', { mamian: 22 });
  wallRun(w, 'brick', X.outerW, Z.outerS, X.outerW, Z.zhengyang, 'W', { mamian: 22 });
  wallRun(w, 'brick', X.outerE, Z.outerS, X.outerE, Z.zhengyang, 'E', { mamian: 22 });
  wallRun(w, 'brick', X.outerW, Z.zhengyang, X.innerW, Z.zhengyang, 'N');
  wallRun(w, 'brick', X.innerE, Z.zhengyang, X.outerE, Z.zhengyang, 'N');
  // 城门（次要）
  const g = (x, z, rot, id, label) => put(w, A.cityGateTower({ bays: 3, pd: 5 }), x, z, { rot, id, label, kind: 'gate', clear: true, gate: true, hero: true });
  g(70, Z.zhengyang, 0, 'chongwenmen', ctx.M || ctx.Q ? '崇文门' : null);
  g(-78, Z.zhengyang, 0, 'xuanwumen', '宣武门');
  g(X.innerE, -330, 1, 'chaoyangmen', '朝阳门');
  g(X.innerE, -440, 1, 'dongzhimen', '东直门');
  g(X.innerW, -330, 3, 'fuchengmen', '阜成门');
  g(X.innerW, -440, 3, 'xizhimen', '西直门');
  g(80, Z.outerS, 0, 'zuoanmen', '左安门');
  g(-80, Z.outerS, 0, 'youanmen', '右安门');
  g(X.outerE, -50, 1, 'guangqumen', '广渠门');
  g(X.outerW, -50, 3, 'guanganmen', '广安门');
  // 角楼
  for (const [x, z] of [[X.innerE, Z.zhengyang], [X.innerE, Z.innerN], [X.outerW, Z.outerS], [X.outerE, Z.outerS]])
    put(w, A.cornerTowerCity(), x, z, { clear: true, id: x === X.innerE && z === Z.zhengyang ? 'dongnanjiaolou' : undefined });
  // 皇城
  const hs = Z.huangS, hn = Z.dianmen;
  wallRun(w, 'red', X.huangW, hs, -22, hs, 'S');
  wallRun(w, 'red', 22, hs, X.huangE, hs, 'S');
  wallRun(w, 'red', X.huangE, hs, X.huangE, hn, 'E', { gaps: [[X.huangE - 1, -334, X.huangE + 3, -326], [X.huangE - 1, -425, X.huangE + 3, -415]] });
  wallRun(w, 'red', X.huangW, hn, X.huangE, hn, 'N', { gaps: [[-8, hn - 2, 8, hn + 3]] });
  wallRun(w, 'red', X.huangW, hs, X.huangW, hn, 'W', { gaps: [[X.huangW - 2, -334, X.huangW + 3, -326]] });
  const hg = (x, z, rot, id, label) => {
    const s = new Stamp();
    hall(s, { w: 5, d: 1, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'none', base: { m: 1, h: 1, stairs: [] }, overhang: 1 });
    put(w, s, x, z, { rot, id, label, kind: 'gate', clear: true, gate: true });
  };
  hg(X.huangE, -330, 1, 'donganmen', ctx.M ? '东安门' : '东安门');
  hg(X.huangW, -330, 3, 'xianmen', '西安门');
}

// ---------------------------------------------------------------------------
// 南段：永定门 — 天坛/先农坛 — 前门大街 — 正阳门
// ---------------------------------------------------------------------------
function southSection(ctx) {
  const { w, M, Q, N } = ctx;
  // 永定门
  const yd = A.cityGateTower({ bays: 5, stories: M ? 1 : 2, pd: 6 });
  put(w, yd, 0, Z.outerS, { axis: true, change: Q || N, id: 'yongdingmen', label: '永定门', node: true, clear: true, gate: true });
  if (!N) {
    // 瓮城 + 箭楼
    wallRun(w, 'brick', -11, Z.outerS + 3, -11, Z.outerS + 14, 'W', { thick: 3, h: 3 });
    wallRun(w, 'brick', 11, Z.outerS + 3, 11, Z.outerS + 14, 'E', { thick: 3, h: 3 });
    wallRun(w, 'brick', -11, Z.outerS + 14, 11, Z.outerS + 14, 'S', { thick: 3, h: 3 });
    put(w, A.arrowTower({ hx: 5, hz: 2, rows: 2, h: 4, baosha: false }), 0, Z.outerS + 14, { axis: true, id: 'yongdingmen-jianlou', clear: true, gate: true });
    bridge(w, 0, Z.outerS + 19, 7, 5, 'z');
  } else {
    // 永定门广场与南中轴绿带
    w.gRect(-20, Z.outerS + 4, 20, Z.outerS + 18, G.PARK);
    w.gRect(-3, Z.outerS + 4, 3, Z.outerS + 18, G.PLAZA);
  }
  // 永定门外大街（南中轴路）与燕墩：嘉靖三十二年（1553）修外城时包砖，乾隆十八年（1753）立御碑
  w.gRect(-3, Z.outerS + 21, 3, BOUNDS.z1, N ? G.ASPHALT : G.ROAD);
  w.gRect(-17, Z.outerS + 22, -6, Z.outerS + 32, N ? G.PARK : G.DIRT);
  put(w, A.yandun(!M), -11, Z.outerS + 27, { change: Q, id: 'yandun', label: '燕墩', hero: true });
  // 天坛
  tiantan(ctx);
  // 先农坛
  xiannongtan(ctx);
  // 天桥
  if (!N) {
    bridge(w, 0, Z.longxu, 7, 5, 'z', { peak: 2 });
    w.label('天桥', 0, 4, Z.longxu, 'bld', 'tianqiao');
    w.item('tianqiao', -2, 0, Z.longxu - 3, 2, 2, Z.longxu + 3);
  } else {
    withFlags(w, CH, () => bridge(w, 0, Z.longxu, 5, 3, 'z', { peak: 1 }));
    w.gRect(-12, Z.longxu - 6, 12, Z.longxu + 6, G.PLAZA);
    w.label('天桥（2013年复建）', 0, 4, Z.longxu, 'bld', 'tianqiao');
    w.item('tianqiao', -2, 0, Z.longxu - 3, 2, 2, Z.longxu + 3);
  }
  w.item('qianmendajie', -4, 0, Z.pailou + 2, 4, 1, Z.longxu - 2);
  w.label(N ? '前门大街（步行街）' : '正阳门外大街', 14, 3, Math.round((Z.pailou + Z.longxu) / 2), 'road', 'qianmendajie');
  // 前门大街两侧商铺
  const r = mulberry(5);
  for (let z = Z.longxu - 6; z > Z.pailou + 3; z -= 6) {
    for (const sx of [-1, 1]) {
      const s = A.house(5, 3, { shop: true, h: 2, tile: TILE.grey });
      put(w, s, sx * 7, z, { rot: sx < 0 ? 1 : 3 });
      if (r() < 0.5) put(w, A.house(5, 3, { h: 2 }), sx * 12, z, { rot: sx < 0 ? 1 : 3 });
    }
  }
  if (N) {
    // 前门大街：步行街 + 铛铛车轨道 + 灯笼
    w.gRect(-3, Z.pailou, 3, Z.longxu - 6, G.PLAZA);
    w.gRect(-1, Z.pailou, -1, Z.longxu - 6, G.RAIL);
    w.gRect(1, Z.pailou, 1, Z.longxu - 6, G.RAIL);
    for (let z = Z.longxu - 8; z > Z.pailou; z -= 4) { w.set(-4, 0, z, C.WOOD_D); w.set(-4, 1, z, C.LANTERN); w.set(4, 0, z, C.WOOD_D); w.set(4, 1, z, C.LANTERN); }
    const tram = new Stamp();
    for (let x = -1; x <= 1; x++) for (let z = -3; z <= 3; z++) { tram.set(x, 0, z, z === -3 || z === 3 ? C.WOOD_D : C.BUS); tram.set(x, 1, z, (z & 1) ? C.WINDOW : C.BUS); tram.set(x, 2, z, C.BUS); }
    put(w, tram, 0, -84);
  }
  // 正阳桥 + 五牌楼
  if (!N) bridge(w, 0, Z.zhengyangBridge - 2, 7, 7, 'z');
  withFlags(w, AX | (N ? CH : 0), () => paifang(w, 0, Z.pailou, 5, { span: 3, h: 4, tile: TILE.green }));
  w.item('pailou', -8, 0, Z.pailou - 1, 8, 5, Z.pailou + 1);
  w.label(N ? '正阳桥牌楼（2008年复建）' : '正阳桥·五牌楼', 0, 7, Z.pailou, 'bld', 'pailou');
  // 正阳门：城楼 + 箭楼（明清有瓮城）
  put(w, A.cityGateTower({ bays: 7, stories: 2, pd: 6 }), 0, Z.zhengyang, { axis: true, id: 'zhengyangmen', label: '正阳门', node: true, clear: true, gate: true });
  put(w, A.arrowTower({}), 0, Z.jianlou, { axis: true, id: 'zhengyang-jianlou', label: '正阳门箭楼', clear: true, gate: true, hero: true });
  if (!N) {
    wallRun(w, 'brick', -15, Z.jianlou, -15, Z.zhengyang, 'W', { thick: 3, h: 4 });
    wallRun(w, 'brick', 15, Z.jianlou, 15, Z.zhengyang, 'E', { thick: 3, h: 4 });
    // 瓮城内两座小庙（关帝庙、观音庙）
    for (const sx of [-1, 1]) {
      const s = new Stamp();
      hall(s, { w: 2, d: 1, h: 2, roof: 'xieshan', tile: TILE.grey, porch: 'none', overhang: 0, wen: false });
      put(w, s, sx * 9, Z.jianlou - 5);
    }
    w.gRect(-13, Z.zhengyang + 2, 13, Z.jianlou - 3, G.PAVE);
  } else {
    w.gRect(-20, Z.zhengyang + 3, 20, Z.jianlou + 5, G.PLAZA);
  }
}

function tiantan({ w, M, Q, N }) {
  const ax = 46;
  const S = Z.tiantanS - 10; // 相对原始设计的南移量
  // 坛墙：外坛、内坛（北圆南方）
  const roundWall = (x0, z0, x1, z1, rr, cap) => {
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) {
        const onEdge = x === x0 || x === x1 || z === z0 || z === z1;
        let inCorner = false, d = 0;
        for (const [cx, cz] of [[x0 + rr, z0 + rr], [x1 - rr, z0 + rr]]) {
          if ((x < x0 + rr && cx === x0 + rr || x > x1 - rr && cx === x1 - rr) && z < z0 + rr) { inCorner = true; d = Math.hypot(x - cx, z - cz); }
        }
        if (inCorner) { if (Math.abs(d - rr) > 0.6) continue; }
        else if (!onEdge) continue;
        if (z === z1 && Math.abs(x - ax) <= 2) continue;
        if (x === x0 && (Math.abs(z + 30 - S) <= 2)) continue;
        w.set(x, 0, z, C.RED_WALL); w.set(x, 1, z, C.RED_WALL); w.set(x, 2, z, cap);
      }
  };
  roundWall(14, Z.tiantanN, 92, Z.tiantanS, 14, C.G2);
  roundWall(28, Z.tiantanN + 3, 66, Z.tiantanS - 4, 9, C.G2);
  w.gRect(15, Z.tiantanN + 1, 91, Z.tiantanS - 1, N ? G.PARK : G.GRASS_D);
  w.gRect(ax - 2, Z.tiantanN + 4, ax + 2, Z.tiantanS - 4, G.PAVE);
  w.gRect(15, -31 + S, ax, -29 + S, G.PAVE);
  // 圜丘、皇穹宇、丹陛桥、祈年殿
  put(w, A.huanqiu(M ? 'ming' : 'qing'), ax, -8 + S, { change: Q || N, id: 'huanqiu', label: '圜丘', hero: true });
  put(w, A.huangqiongyu(), ax, -32 + S, { id: 'huangqiongyu', label: '皇穹宇', hero: true });
  for (let z = -40 + S; z >= -46 + S; z--) for (let x = ax - 2; x <= ax + 2; x++) w.set(x, 0, z, x === ax ? C.MARBLE_D : C.BRICK_L);
  w.item('danbiqiao', ax - 2, 0, -46 + S, ax + 2, 1, -40 + S);
  // 祈年殿院
  const qy = new Stamp();
  for (let z = -12; z <= 12; z++) for (let x = -13; x <= 13; x++) {
    if (Math.abs(x) !== 13 && Math.abs(z) !== 12) continue;
    if (z === 12 && Math.abs(x) <= 2) continue;
    qy.set(x, 0, z, C.RED_WALL); qy.set(x, 1, z, C.RED_WALL); qy.set(x, 2, z, C.B2);
  }
  put(w, qy, ax, -59 + S);
  put(w, A.qiniandian(M ? 'ming' : 'qing'), ax, -59 + S, { change: Q || N, id: 'qiniandian', label: M ? '大享殿' : '祈年殿', hero: true });
  const gate = new Stamp();
  hall(gate, { w: 5, d: 1, h: 2, roof: 'xieshan', tile: TILE.blue, porch: 'none', overhang: 1, base: { m: 1, h: 1 } });
  put(w, gate, ax, -47 + S);
  const hq = new Stamp();
  hall(hq, { w: 5, d: 1, h: 2, roof: 'wudian', tile: TILE.blue, porch: 'front', overhang: 1, base: { m: 1, h: 1 } });
  put(w, hq, ax, -70 + S, { id: 'huangqiandian' });
  w.label('天坛', 78, 8, -30 + S, 'area', 'tiantan');
  // 古柏
  const r = mulberry(77);
  for (let i = 0; i < 260; i++) {
    const x = 16 + Math.floor(r() * 75), z = Z.tiantanN + 2 + Math.floor(r() * 80);
    if (Math.abs(x - ax) < 16 && z > -74 + S && z < 8 + S) continue;
    if (w.height(x, z) >= 0 || w.gAt(x, z) === G.PAVE) continue;
    tree(w, x, 0, z, r() < 0.75 ? 'cypress' : 'round', r);
  }
}

function xiannongtan({ w, M, Q, N }) {
  const S = Z.tiantanS - 10;
  const x0 = -74, x1 = -14, z0 = -64 + S, z1 = 4 + S;
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) { if (Math.abs(x + 44) <= 2 && z === z1) continue; w.set(x, 0, z, C.RED_WALL); w.set(x, 1, z, C.RED_WALL); w.set(x, 2, z, C.G2); }
  for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) { if (x === x1 && Math.abs(z + 30 - S) <= 2) continue; w.set(x, 0, z, C.RED_WALL); w.set(x, 1, z, C.RED_WALL); w.set(x, 2, z, C.G2); }
  w.gRect(x0 + 1, z0 + 1, x1 - 1, z1 - 1, N ? G.PARK : G.GRASS_D);
  // 太岁殿院（黑琉璃瓦绿剪边）
  put(w, A.compound({ hw: 10, hd: 9, bays: 7, depth: 2, roof: 'xieshan', tile: TILE.blackGreen, trim: C.G1, sideTile: TILE.blackGreen, gate: true, mainZ: -3, cap: C.G2 }), -50, -44 + S, { id: 'taisuidian', label: '太岁殿' });
  // 具服殿
  const jf = new Stamp();
  hall(jf, { w: 5, d: 2, h: 3, roof: 'xieshan', tile: TILE.green, base: { m: 1, h: 1 }, overhang: 1 });
  put(w, jf, -26, -48 + S, { id: 'jufudian' });
  // 观耕台：明为木构临时台，清乾隆十九年改砖石琉璃台
  const gg = new Stamp();
  if (M) {
    for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) { gg.set(x, 0, z, (x + z) & 1 ? C.WOOD : C.WOOD_D); gg.set(x, 1, z, C.WOOD_L); }
  } else {
    for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) {
      const e = Math.abs(x) === 3 || Math.abs(z) === 3;
      gg.set(x, 0, z, e ? ((x + z) & 1 ? C.Y1 : C.G1) : C.MARBLE); gg.set(x, 1, z, e ? C.MARBLE : C.BRICK_L);
      if (e && ((x + z) & 1) === 0) gg.set(x, 2, z, C.MARBLE);
    }
  }
  for (let k = 1; k <= 2; k++) for (let x = -1; x <= 1; x++) for (let y = 0; y < 2 - k + 1; y++) gg.set(x, y, 3 + k, C.MARBLE);
  put(w, gg, -26, -36 + S, { change: Q || N, id: 'guangengtai', label: '观耕台' });
  // 一亩三分地
  w.gRect(-31, -29 + S, -21, -21 + S, G.FIELD_A);
  for (let x = -31; x <= -21; x += 2) w.gRect(x, -29 + S, x, -21 + S, G.FIELD_B);
  // 先农神坛
  for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) w.set(-50 + x, 0, -18 + S + z, C.MARBLE);
  w.item('xiannongshentan', -53, 0, -21 + S, -47, 1, -15 + S);
  w.label('先农坛', -44, 7, -10 + S, 'area', 'xiannongtan');
  const r = mulberry(91);
  for (let i = 0; i < 90; i++) {
    const x = x0 + 2 + Math.floor(r() * 57), z = z0 + 2 + Math.floor(r() * 64);
    if (w.height(x, z) >= 0 || w.gAt(x, z) === G.FIELD_A || w.gAt(x, z) === G.FIELD_B) continue;
    if (x > -62 && x < -36 && z > -56 + S && z < -32 + S) continue;
    tree(w, x, 0, z, r() < 0.6 ? 'cypress' : 'round', r);
  }
}

// ---------------------------------------------------------------------------
// 天安门一带：明清“T”形宫廷广场 / 当代天安门广场
// ---------------------------------------------------------------------------
function tiananmenSection(ctx) {
  const { w, M, Q, N } = ctx;
  if (!N) {
    w.gRect(-12, Z.qipan - 3, 12, Z.qipan + 3, G.PAVE);           // 棋盘街
    // 大明门 / 大清门：砖石门楼，三券，单檐歇山
    const dm = new Stamp();
    chengtai(dm, { x0: -9, x1: 9, z0: -2, z1: 2, h: 4, color: C.RED_WALL, base: C.MARBLE, arches: [{ x: 0, w: 3, h: 3 }, { x: -5, w: 3, h: 3 }, { x: 5, w: 3, h: 3 }], parapet: 'none', doorColor: C.RED_D });
    roof(dm, { x0: -10, x1: 10, z0: -3, z1: 3, y: 4, type: 'xieshan', tile: TILE.yellow, wen: 1 });
    put(w, dm, 0, Z.daming, { axis: true, change: Q, id: 'damingmen', label: M ? '大明门' : '大清门', node: true });
    // 千步廊“T”形宫廷广场
    w.gRect(-12, Z.daming - 3, 12, Z.changan + 3, G.PAVE);
    w.gRect(-42, Z.changan + 3, 42, Z.tiananmen + 7, G.PAVE);
    w.gRect(-2, Z.daming - 3, 2, Z.tiananmen + 7, G.PAVE_L);
    wallRun(w, 'red', -13, Z.daming - 2, -13, Z.changan + 4, 'W', { thick: 1, h: 2 });
    wallRun(w, 'red', 12, Z.daming - 2, 12, Z.changan + 4, 'E', { thick: 1, h: 2 });
    wallRun(w, 'red', -43, Z.changan + 4, -13, Z.changan + 4, 'S', { thick: 1, h: 2 });
    wallRun(w, 'red', 12, Z.changan + 4, 42, Z.changan + 4, 'S', { thick: 1, h: 2 });
    wallRun(w, 'red', -43, Z.changan + 4, -43, Z.huangS, 'W', { thick: 1, h: 2, gaps: [[-44, Z.changan - 3, -42, Z.changan + 1]] });
    wallRun(w, 'red', 42, Z.changan + 4, 42, Z.huangS, 'E', { thick: 1, h: 2, gaps: [[41, Z.changan - 3, 43, Z.changan + 1]] });
    // 千步廊（连檐通脊）
    withFlags(w, AX, () => {
      for (const sx of [-1, 1]) {
        const lang = new Stamp();
        hall(lang, { w: 12, d: 1, h: 2, roof: 'yingshan', tile: TILE.grey, porch: 'front', overhang: 0, wen: false, wall: C.RED_D });
        put(w, lang, sx * 9, (Z.daming + Z.changan) / 2 - 1, { rot: sx < 0 ? 1 : 3 });
        const lang2 = new Stamp();
        hall(lang2, { w: 6, d: 1, h: 2, roof: 'yingshan', tile: TILE.grey, porch: 'front', overhang: 0, wen: false, wall: C.RED_D });
        put(w, lang2, sx * 28, Z.changan + 1, { rot: 2 });
      }
    });
    w.item('qianbulang', -11, 0, Z.changan, 11, 4, Z.daming - 3);
    w.label('千步廊', 0, 5, -142, 'bld', 'qianbulang');
    // 长安左门、长安右门
    for (const sx of [-1, 1]) {
      const g = new Stamp();
      hall(g, { w: 3, d: 1, h: 2, roof: 'xieshan', tile: TILE.yellow, porch: 'none', overhang: 1, base: { m: 1, h: 1, stairs: [] } });
      put(w, g, sx * 42, Z.changan - 1, { rot: 1, id: sx < 0 ? 'changanyoumen' : 'changanzuomen', label: sx < 0 ? '长安右门' : '长安左门' });
    }
    // 六部衙署（示意）
    for (const [x, z] of [[-26, -134], [-26, -148], [26, -134], [26, -148]]) put(w, A.compound({ hw: 8, hd: 5, bays: 3, depth: 1, roof: 'yingshan', tile: TILE.grey, wall: 'grey', side: false }), x, z);
    w.label('六部衙署', 26, 5, -141, 'minor');
  } else {
    // 当代天安门广场
    w.gRect(-24, Z.zhengyang + 6, 24, Z.changan + 3, G.PLAZA);
    for (let z = Z.zhengyang + 8; z > Z.changan + 3; z -= 6) for (let x = -22; x <= 22; x += 1) if (Math.abs(x) > 3) w.g(x, z, G.PAVE_L);
    w.gRect(-24, Z.zhengyang + 6, -20, Z.changan + 4, G.PARK);
    w.gRect(20, Z.zhengyang + 6, 24, Z.changan + 4, G.PARK);
    put(w, A.mausoleum(), 0, -131, { axis: true, change: true, id: 'jiniantang', label: '毛主席纪念堂', node: true });
    put(w, A.monument(), 0, -147, { axis: true, change: true, id: 'jinianbei', label: '人民英雄纪念碑', node: true });
    put(w, A.flagpole(), 0, Z.changan + 5, { axis: true, change: true, id: 'guoqi', label: '国旗杆' });
    put(w, A.greatBuilding('hall'), -36, -144, { rot: 1, change: true, id: 'renmindahuitang', label: '人民大会堂' });
    put(w, A.greatBuilding('museum'), 36, -144, { rot: 3, change: true, id: 'guojiabowuguan', label: '中国国家博物馆' });
    // 长安街华灯
    for (let x = BOUNDS.x0 + 4; x <= BOUNDS.x1 - 4; x += 6) {
      if (Math.abs(x) < 4) continue;
      put(w, A.streetLamp(), x, Z.changan - 4); put(w, A.streetLamp(), x, Z.changan + 4);
    }
    w.label('长安街', 90, 3, Z.changan, 'road');
  }
  // 外金水桥、华表、石狮
  withFlags(w, AX, () => {
    for (const x of [-12, -8, -4, 0, 4, 8, 12]) bridge(w, x, Z.jinshui, 5, x === 0 ? 3 : 1, 'z', { peak: 1 });
    huabiao(w, -9, Z.jinshui + 3); huabiao(w, 9, Z.jinshui + 3);
    huabiao(w, -9, Z.tiananmen - 9); huabiao(w, 9, Z.tiananmen - 9);
    lion(w, -5, Z.tiananmen + 8); lion(w, 5, Z.tiananmen + 8);
  });
  w.item('jinshuiqiao', -13, 0, Z.jinshui - 2, 13, 2, Z.jinshui + 2);
  w.label('外金水桥', -26, 3, Z.jinshui, 'minor', 'jinshuiqiao');
  // 天安门（明称承天门，面阔五间；清顺治八年重建为面阔九间、进深五间）
  put(w, A.terraceGate({ bays: M ? 5 : 9, depth: M ? 3 : 4, pw: 20, pd: 6 }), 0, Z.tiananmen, {
    axis: true, change: Q, id: 'tiananmen', label: M ? '承天门' : '天安门', node: true,
  });
  // 端门
  put(w, A.terraceGate({ bays: 9, depth: 4, pw: 18, pd: 5 }), 0, Z.duanmen, { axis: true, id: 'duanmen', label: '端门', node: true });
  w.gRect(-12, Z.tiananmen - 7, 12, Z.wumen + 22, G.PAVE);
  w.gRect(-2, Z.tiananmen - 7, 2, Z.wumen + 22, G.PAVE_L);
  // 太庙（左祖）与社稷坛（右社）
  taimiao(ctx);
  shejitan(ctx);
}

function taimiao({ w, M, Q, N }) {
  const cx = 41, z0 = -227, z1 = -186;
  const wall = (x0, za, x1, zb, gaps) => {
    for (let x = x0; x <= x1; x++) for (const z of [za, zb]) {
      if (gaps && gaps.some((g) => Math.abs(x - g[0]) <= 1 && z === g[1])) continue;
      w.set(x, 0, z, C.RED_WALL); w.set(x, 1, z, C.RED_WALL); w.set(x, 2, z, C.Y2);
    }
    for (let z = za; z <= zb; z++) for (const x of [x0, x1]) {
      if (gaps && gaps.some((g) => g[0] === x && Math.abs(z - g[1]) <= 1)) continue;
      w.set(x, 0, z, C.RED_WALL); w.set(x, 1, z, C.RED_WALL); w.set(x, 2, z, C.Y2);
    }
  };
  wall(22, z0, 60, z1, [[22, -200], [cx, z1]]);
  wall(27, -224, 55, -192, [[cx, -192]]);
  w.gRect(23, z0 + 1, 59, z1 - 1, N ? G.PARK : G.GRASS_D);
  w.gRect(28, -223, 54, -193, G.PAVE);
  // 戟门
  const jm = new Stamp();
  hall(jm, { w: 5, d: 1, h: 2, roof: 'wudian', tile: TILE.yellow, porch: 'none', base: { m: 1, h: 1 }, overhang: 1 });
  put(w, jm, cx, -193, { id: 'taimiao-jimen' });
  // 享殿：明九间，清乾隆改十一间，重檐庑殿，三层汉白玉台基
  const xd = new Stamp();
  hall(xd, {
    w: M ? 9 : 11, d: 4, h: 3, eaves: 2, roof: 'wudian', tile: TILE.yellow, overhang: 1, dougong: true, wen: 2,
    base: { levels: [{ m: 2, h: 1 }, { m: 1, h: 1 }], rail: true, yulu: true },
  });
  put(w, xd, cx, -205, { change: Q, id: 'taimiao', label: N ? '太庙（劳动人民文化宫）' : '太庙', hero: true });
  // 寝殿、祧庙
  const qd = new Stamp();
  hall(qd, { w: 9, d: 2, h: 3, roof: 'wudian', tile: TILE.yellow, overhang: 1, base: { m: 1, h: 1 } });
  put(w, qd, cx, -218, { id: 'taimiao-qindian' });
  // 古柏
  const r = mulberry(55);
  for (let z = z1 - 2; z >= z0 + 2; z -= 3) for (const x of [24, 25, 57, 58]) if (r() < 0.8 && w.height(x, z) < 0) tree(w, x, 0, z, 'cypress', r);
}

function shejitan({ w, M, Q, N }) {
  const cx = -41, z0 = -227, z1 = -186;
  for (let x = -60; x <= -22; x++) for (const z of [z0, z1]) { if (z === z0 && Math.abs(x - cx) <= 1) continue; w.set(x, 0, z, C.RED_WALL); w.set(x, 1, z, C.RED_WALL); w.set(x, 2, z, C.Y2); }
  for (let z = z0; z <= z1; z++) for (const x of [-60, -22]) { if (x === -22 && Math.abs(z + 200) <= 1) continue; w.set(x, 0, z, C.RED_WALL); w.set(x, 1, z, C.RED_WALL); w.set(x, 2, z, C.Y2); }
  w.gRect(-59, z0 + 1, -23, z1 - 1, N ? G.PARK : G.GRASS_D);
  w.gRect(cx - 10, -210, cx + 10, -190, G.PAVE);
  put(w, A.shejitan(), cx, -200, { id: 'shejitan', label: N ? '社稷坛（中山公园）' : '社稷坛' });
  // 拜殿（今中山堂）、戟门：位于坛北
  const bd = new Stamp();
  hall(bd, { w: 5, d: 2, h: 3, roof: 'xieshan', tile: TILE.yellow, base: { m: 1, h: 1 }, overhang: 1 });
  put(w, bd, cx, -215, { id: 'shejitan-baidian', rot: 2 });
  const jm = new Stamp();
  hall(jm, { w: 5, d: 1, h: 2, roof: 'xieshan', tile: TILE.yellow, porch: 'none', base: { m: 1, h: 1 }, overhang: 1 });
  put(w, jm, cx, -222, { rot: 2 });
  const r = mulberry(66);
  for (let z = z1 - 2; z >= z0 + 2; z -= 3) for (const x of [-58, -57, -25, -24]) if (r() < 0.8 && w.height(x, z) < 0) tree(w, x, 0, z, 'cypress', r);
  for (let i = 0; i < 20; i++) { const x = -56 + Math.floor(r() * 30), z = -225 + Math.floor(r() * 12); if (w.height(x, z) < 0 && w.gAt(x, z) !== G.PAVE) tree(w, x, 0, z, 'round', r); }
}

// ---------------------------------------------------------------------------
// 紫禁城
// ---------------------------------------------------------------------------
function forbiddenCity(ctx) {
  const { w, M, Q, N } = ctx;
  const S = Z.fcS, Nn = Z.fcN;
  // 地面
  w.gRect(-51, Nn + 1, 51, S - 1, G.PAVE);
  w.gRect(-2, Nn + 1, 2, S - 1, G.PAVE_L);
  w.gRect(-50, -333, 50, -327, G.PAVE_L);  // 乾清门广场（横街）
  // 宫墙
  wallRun(w, 'red', -52, S, 52, S, 'S', { thick: 2, h: 4, gaps: [[-22, S - 1, 22, S + 2]] });
  wallRun(w, 'red', -52, Nn, 52, Nn, 'N', { thick: 2, h: 4, gaps: [[-14, Nn - 1, 14, Nn + 2]] });
  wallRun(w, 'red', -52, Nn, -52, S, 'W', { thick: 2, h: 4, gaps: [[-53, -276, -50, -248]] });
  wallRun(w, 'red', 51, Nn, 51, S, 'E', { thick: 2, h: 4, gaps: [[50, -276, 53, -248]] });
  const ax = { axis: true };
  put(w, A.wumen(M ? 'ming' : 'qing'), 0, Z.wumen, { ...ax, id: 'wumen', label: '午门', node: true, clear: true });
  // 四角楼
  for (const [x, z] of [[-52, S], [52, S], [-52, Nn], [52, Nn]]) put(w, A.cornerTower(), x, z, { y: 4, id: 'jiaolou', hero: true });
  w.label('角楼', 52, 16, Nn, 'minor', 'jiaolou');
  put(w, A.palaceGate(), 0, Nn, { ...ax, rot: 2, id: 'shenwumen', label: M ? '玄武门' : '神武门', node: true, clear: true, gate: true });
  put(w, A.palaceGate(), 52, -262, { rot: 1, id: 'donghuamen', label: '东华门', clear: true, gate: true, hero: true });
  put(w, A.palaceGate(), -52, -262, { rot: 3, id: 'xihuamen', label: '西华门', clear: true, gate: true, hero: true });
  // 内金水桥
  withFlags(w, AX, () => { for (const x of [-8, -4, 0, 4, 8]) bridge(w, x, -247, 5, x === 0 ? 3 : 1, 'z'); });
  w.item('neijinshuiqiao', -9, 0, -250, 9, 2, -244);
  // 太和门（明：奉天门→皇极门）
  const thm = new Stamp();
  hall(thm, { w: 9, d: 3, h: 3, eaves: 2, roof: 'xieshan', tile: TILE.yellow, base: { m: 1, h: 1, rail: true, yulu: true }, porch: 'around', dougong: true, overhang: 2 });
  // 门前一对铜狮，故宫六对铜狮中最大、唯一不鎏金的一对
  if (!M) for (const sx of [-1, 1]) furnish(thm, 'lion', sx * 5, 7);
  put(w, thm, 0, -259, { ...ax, id: 'taihemen', label: M ? '皇极门' : '太和门', node: true });
  for (const sx of [-1, 1]) {
    const g = new Stamp();
    hall(g, { w: 3, d: 1, h: 2, roof: 'xieshan', tile: TILE.yellow, base: { m: 1, h: 1 }, porch: 'none', overhang: 1 });
    put(w, g, sx * 17, -259, { id: sx < 0 ? 'zhendumen' : 'zhaodemen' });
  }
  // 太和殿广场东西庑与体仁阁、弘义阁
  for (const sx of [-1, 1]) {
    const lw = new Stamp();
    hall(lw, { w: 15, d: 1, h: 2, roof: 'yingshan', tile: TILE.yellow, porch: 'front', overhang: 0, wen: false });
    put(w, lw, sx * 31, -296, { rot: sx < 0 ? 1 : 3 });
    const ge = new Stamp();
    hall(ge, { w: 5, d: 2, h: 2, eaves: 2, roof: 'wudian', tile: TILE.yellow, porch: 'around', stories: [true], upperH: [2], base: { m: 1, h: 1 }, overhang: 1 });
    put(w, ge, sx * 30, -279, { rot: sx < 0 ? 1 : 3, id: sx < 0 ? 'hongyige' : 'tirenge', label: sx < 0 ? (M ? '武楼' : '弘义阁') : (M ? '文楼' : '体仁阁'), kind: 'minor' });
  }
  wallRun(w, 'red', -32, -262, -18, -262, 'S', { thick: 1, h: 3 });
  wallRun(w, 'red', 18, -262, 32, -262, 'S', { thick: 1, h: 3 });
  wallRun(w, 'red', -32, -326, 32, -326, 'N', { thick: 1, h: 3, gaps: [[-3, -327, 3, -325], [-22, -327, -18, -325], [18, -327, 22, -325]] });
  // 三台（土字形，三层汉白玉）
  const tai = (k) => [
    { x0: -19 + k, x1: 19 - k, z0: -300 + k, z1: -278 - k },
    { x0: -11 + k, x1: 11 - k, z0: -312, z1: -300 + k },
    { x0: -16 + k, x1: 16 - k, z0: -325 + k, z1: -312 },
  ];
  withFlags(w, AX, () => {
    for (let k = 0; k < 3; k++)
      for (const R of tai(k))
        for (let z = R.z0; z <= R.z1; z++) for (let x = R.x0; x <= R.x1; x++) w.set(x, k, z, k === 0 && (x === R.x0 || x === R.x1 || z === R.z0 || z === R.z1) ? C.MARBLE_D : C.MARBLE);
    // 栏杆
    for (let k = 0; k < 3; k++)
      for (const R of tai(k))
        for (let z = R.z0; z <= R.z1; z++) for (let x = R.x0; x <= R.x1; x++) {
          const e = x === R.x0 || x === R.x1 || z === R.z0 || z === R.z1;
          if (!e || ((x + z) & 1) || Math.abs(x) <= 3) continue;
          if (w.get(x, k + 1, z)) continue;
          // 不在更高一层台面内
          const up = k < 2 && tai(k + 1).some((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
          if (!up) w.set(x, k + 1, z, C.MARBLE);
        }
    // 御路踏跺（前后），中间一路为御路石
    for (let k = 0; k < 3; k++) for (let x = -3; x <= 3; x++) for (let y = 0; y <= k; y++) w.set(x, y, -277 - k, x === 0 ? C.MARBLE_D : C.MARBLE);
    for (let k = 0; k < 3; k++) for (let x = -2; x <= 2; x++) for (let y = 0; y <= k; y++) w.set(x, y, -326 + k, x === 0 ? C.MARBLE_D : C.MARBLE);
  });
  // 太和殿：清康熙三十四年重建，面阔十一间；明代奉天殿/皇极殿面阔九间
  const thd = new Stamp();
  hall(thd, { w: M ? 9 : 11, d: 5, h: 4, eaves: 2, roof: 'wudian', tile: TILE.yellow, porch: 'front', dougong: true, overhang: 2, wen: 2 });
  if (!M) {
    // 月台陈设（据故宫博物院介绍）：东南角日晷、西南角嘉量，铜龟、铜鹤各一对
    furnish(thd, 'rigui', 11, 10);
    furnish(thd, 'jialiang', -11, 10);
    for (const sx of [-1, 1]) { furnish(thd, 'turtle', sx * 5, 9); furnish(thd, 'crane', sx * 8, 9); }
    // 铜鼎实有 18 座，这里在月台前沿示意 6 座
    for (const sx of [-1, 1]) for (const x of [6, 10, 14]) furnish(thd, 'ding', sx * x, 11);
  }
  put(w, thd, 0, -292, { ...ax, y: 3, change: Q, id: 'taihedian', label: M ? '皇极殿' : '太和殿', node: true });
  if (M) {
    // 明代：斜廊连接东西庑
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x = sx * (13 + i * 2), z = -292 + i * 1.2;
        const sg = new Stamp();
        hall(sg, { w: 1, d: 1, h: 2, roof: 'xuanshan', tile: TILE.yellow, porch: 'open', overhang: 0, wen: false, upturn: false });
        put(w, sg, x, Math.round(z), { y: i < 3 ? 3 - i : 0, change: false });
      }
    }
    w.label('斜廊', 22, 6, -288, 'minor', 'xielang');
    w.item('xielang', 12, 0, -294, 30, 6, -280);
  } else {
    // 清代：改为防火卡墙
    withFlags(w, CH, () => {
      wallRun(w, 'red', -30, -292, -14, -292, 'S', { thick: 1, h: 3, gaps: [[-23, -293, -21, -291]] });
      wallRun(w, 'red', 14, -292, 30, -292, 'S', { thick: 1, h: 3, gaps: [[21, -293, 23, -291]] });
    });
    w.item('kaqiang', 13, 0, -293, 30, 4, -291);
  }
  const zhd = new Stamp();
  hall(zhd, { w: 4, d: 4, h: 3, roof: 'cuanjian', tile: TILE.yellow, porch: 'around', overhang: 1, finial: 2 });
  put(w, zhd, 0, -306, { ...ax, y: 3, id: 'zhonghedian', label: M ? '中极殿' : '中和殿', node: true });
  const bhd = new Stamp();
  hall(bhd, { w: 9, d: 4, h: 3, eaves: 2, roof: 'xieshan', tile: TILE.yellow, porch: 'front', dougong: true, overhang: 2 });
  put(w, bhd, 0, -318, { ...ax, y: 3, id: 'baohedian', label: M ? '建极殿' : '保和殿', node: true });
  // 乾清门 + 八字影壁
  const qqm = new Stamp();
  hall(qqm, { w: 5, d: 2, h: 3, roof: 'xieshan', tile: TILE.yellow, base: { m: 1, h: 1, rail: true }, porch: 'front', overhang: 1 });
  // 门前两侧铜鎏金狮子一对
  if (!M) for (const sx of [-1, 1]) furnish(qqm, 'lion', sx * 4, 5, 0, { gilt: true });
  put(w, qqm, 0, -336, { ...ax, id: 'qianqingmen', label: '乾清门', node: true });
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { w.set(sx * (8 + i), 0, -334 + i, C.RED_WALL); w.set(sx * (8 + i), 1, -334 + i, C.RED_WALL); w.set(sx * (8 + i), 2, -334 + i, C.Y1); }
  // 后三宫
  withFlags(w, AX, () => {
    for (let z = -362; z <= -339; z++) for (let x = -14; x <= 14; x++) w.set(x, 0, z, Math.abs(x) === 14 || z === -362 || z === -339 ? C.MARBLE_D : C.MARBLE);
    for (let z = -362; z <= -339; z++) for (let x = -14; x <= 14; x++) if ((Math.abs(x) === 14 || z === -362) && !((x + z) & 1)) w.set(x, 1, z, C.MARBLE);
    for (let x = -2; x <= 2; x++) w.set(x, 0, -338, C.MARBLE);
  });
  const qqg = new Stamp();
  hall(qqg, { w: 9, d: 4, h: 3, eaves: 2, roof: 'wudian', tile: TILE.yellow, porch: 'front', overhang: 2, dougong: true, wen: 2 });
  put(w, qqg, 0, -344, { ...ax, y: 1, id: 'qianqinggong', label: '乾清宫', node: true });
  const jtd = new Stamp();
  hall(jtd, { w: 3, d: 3, h: 3, roof: 'cuanjian', tile: TILE.yellow, porch: 'front', overhang: 1, finial: 1 });
  put(w, jtd, 0, -352, { ...ax, y: 1, id: 'jiaotaidian', label: '交泰殿' });
  const knn = new Stamp();
  hall(knn, { w: 9, d: 3, h: 3, eaves: 2, roof: 'wudian', tile: TILE.yellow, porch: 'front', overhang: 2, wen: 1 });
  put(w, knn, 0, -358, { ...ax, y: 1, id: 'kunninggong', label: '坤宁宫' });
  // 御花园
  w.gRect(-20, -372, 20, -364, G.PARK);
  const qad = new Stamp();
  hall(qad, { w: 5, d: 1, h: 2, roof: 'wudian', tile: TILE.yellow, base: { m: 1, h: 1 }, overhang: 1 });
  put(w, qad, 0, -368, { ...ax, id: 'yuhuayuan', label: '御花园', kind: 'minor' });
  for (const sx of [-1, 1]) {
    const p = new Stamp();
    pavilion(p, { shape: sx < 0 ? 'round' : 'square', r: 1, h: 2, eaves: 2, tiles: [TILE.green, TILE.yellow], open: true, finial: 1 });
    put(w, p, sx * 12, -367);
    tree(w, sx * 7, 0, -365, 'cypress'); tree(w, sx * 17, 0, -370, 'cypress'); tree(w, sx * 16, 0, -365, 'round');
  }
  // 两侧宫院（示意）
  const cmp = (o, x, z, id, label, change) => put(w, A.compound({ ...o, side: o.side ?? true }), x, z, { id, label, kind: 'minor', change });
  cmp({ hw: 9, hd: 10, bays: 5, depth: 2, roof: 'xieshan', gate: true }, 41, -272, 'wenhuadian', '文华殿');
  cmp({ hw: 9, hd: 10, bays: 5, depth: 2, roof: 'xieshan', gate: true }, -41, -272, 'wuyingdian', '武英殿');
  for (const sx of [-1, 1]) for (const [cx, cz] of [[22, -345], [32, -345], [22, -355], [32, -355], [22, -365], [32, -365]]) {
    put(w, A.compound({ hw: 4, hd: 4, bays: 3, depth: 1, roof: 'xieshan', side: false, base: { m: 0, h: 1 } }), sx * cx, cz);
  }
  w.label('东六宫', 27, 6, -355, 'minor', 'dongliugong');
  w.label('西六宫', -27, 6, -355, 'minor', 'xiliugong');
  w.item('dongliugong', 17, 0, -370, 37, 6, -340);
  w.item('xiliugong', -37, 0, -370, -17, 6, -340);
  // 东路：清宁寿宫 / 明仁寿宫一带
  cmp({ hw: 6, hd: 14, bays: Q || N ? 7 : 5, depth: 2, eaves: Q || N ? 2 : 1, roof: Q || N ? 'wudian' : 'xieshan', gate: true, mainZ: -4 }, 44, -318, 'ningshougong', M ? '仁寿宫' : '宁寿宫', Q);
  cmp({ hw: 6, hd: 14, bays: 5, depth: 2, eaves: 2, roof: 'xieshan', gate: true, mainZ: -4 }, -44, -318, 'cininggong', '慈宁宫');
  cmp({ hw: 9, hd: 6, bays: 5, depth: 1, roof: 'xieshan', side: false }, -27, -303, 'yangxindian', '养心殿');
  cmp({ hw: 9, hd: 6, bays: 5, depth: 1, roof: 'xieshan', side: false }, 27, -303, 'fengxiandian', '奉先殿');
  // 西北：花园与树木
  for (const [x, z] of [[-44, -360], [-46, -366], [-40, -368], [44, -362], [46, -368], [40, -366]]) tree(w, x, 0, z, 'round');
}

// ---------------------------------------------------------------------------
// 北段：景山 — 地安门 — 万宁桥 — 鼓楼 — 钟楼
// ---------------------------------------------------------------------------
function northSection(ctx) {
  const { w, M, Q, N } = ctx;
  // 北上门（明清），景山南门
  if (!N) {
    const bs = new Stamp();
    hall(bs, { w: 5, d: 1, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'none', base: { m: 1, h: 1, stairs: [] }, overhang: 1 });
    put(w, bs, 0, Z.fcN - 9, { axis: true, id: 'beishangmen', label: '北上门', kind: 'minor' });
  }
  bridge(w, 0, Z.fcN - 3, 7, 5, 'z');
  // 景山围墙
  wallRun(w, 'red', -34, Z.jingshanS, 34, Z.jingshanS, 'S', { thick: 1, h: 3, gaps: [[-3, Z.jingshanS - 1, 3, Z.jingshanS + 1]] });
  wallRun(w, 'red', -34, Z.jingshanN, 34, Z.jingshanN, 'N', { thick: 1, h: 3, gaps: [[-3, Z.jingshanN - 1, 3, Z.jingshanN + 1]] });
  wallRun(w, 'red', -34, Z.jingshanN, -34, Z.jingshanS, 'W', { thick: 1, h: 3 });
  wallRun(w, 'red', 34, Z.jingshanN, 34, Z.jingshanS, 'E', { thick: 1, h: 3 });
  w.gRect(-33, Z.jingshanN + 1, 33, Z.jingshanS - 1, N ? G.PARK : G.GRASS);
  put(w, A.jingshan(M ? 'ming' : 'qing'), 0, Z.jingshanC, { axis: true, change: Q, id: 'jingshan', label: M ? '万岁山（景山）' : '景山', node: true });
  if (Q || N) {
    // 寿皇殿：乾隆十四年移建于中轴线上
    const sh = new Stamp();
    for (let z = -8; z <= 8; z++) for (let x = -12; x <= 12; x++) {
      if (Math.abs(x) !== 12 && Math.abs(z) !== 8) continue;
      if (z === 8 && Math.abs(x) <= 2) continue;
      sh.set(x, 0, z, C.RED_WALL); sh.set(x, 1, z, C.RED_WALL); sh.set(x, 2, z, C.Y2);
    }
    const sd = new Stamp();
    hall(sd, { w: 9, d: 3, h: 3, eaves: 2, roof: 'wudian', tile: TILE.yellow, base: { m: 1, h: 1, rail: true }, overhang: 1, wen: 1 });
    sd.place(sh, 0, 0, -1);
    put(w, sh, 0, Z.jingshanN + 9, { axis: true, change: true, id: 'shouhuangdian', label: '寿皇殿', node: true });
    withFlags(w, AX | CH, () => { paifang(w, 0, Z.jingshanN + 19, 3, { span: 3, h: 4, tile: TILE.yellow }); });
  } else {
    // 明代寿皇殿位于万岁山东北，不在中轴线上
    put(w, A.compound({ hw: 7, hd: 6, bays: 5, depth: 2, roof: 'wudian', side: false }), 24, Z.jingshanN + 8, { id: 'shouhuangdian', label: '寿皇殿（明·偏东）', kind: 'minor' });
  }
  // 地安门（明称北安门）
  if (!N) {
    const dm = new Stamp();
    hall(dm, { w: 7, d: 2, h: 3, roof: 'xieshan', tile: TILE.yellow, porch: 'none', base: { m: 1, h: 1 }, overhang: 1, wall: C.RED_WALL });
    for (let y = 0; y < 2; y++) for (const x of [-4, 0, 4]) for (let z = -2; z <= 2; z++) dm.set(x, 1 + y, z, 0);
    put(w, dm, 0, Z.dianmen, { axis: true, change: Q, id: 'dianmen', label: M ? '北安门' : '地安门', node: true, clear: true, gate: true });
  } else {
    // 2014 年复建的地安门雁翅楼
    for (const sx of [-1, 1]) {
      const yc = new Stamp();
      hall(yc, { w: 8, d: 1, h: 2, eaves: 2, roof: 'xieshan', tile: TILE.yellow, porch: 'front', stories: [true], upperH: [2], overhang: 1, wall: C.RED_D });
      put(w, yc, sx * 13, Z.dianmen, { rot: sx < 0 ? 1 : 3, change: true, id: 'yanchilou', label: sx < 0 ? '地安门雁翅楼' : null, kind: 'minor' });
    }
    w.label('地安门旧址', 0, 3, Z.dianmen, 'minor', 'dianmen');
    w.item('dianmen', -3, 0, Z.dianmen - 2, 3, 1, Z.dianmen + 2);
  }
  // 万宁桥
  legacy(w, () => withFlags(w, AX, () => bridge(w, 0, Z.wanning, 7, 7, 'z', { peak: 1 })));
  w.item('wanningqiao', -4, 0, Z.wanning - 4, 4, 2, Z.wanning + 4);
  w.label('万宁桥', 10, 3, Z.wanning, 'axis', 'wanningqiao');
  w.axisNodes.push({ id: 'wanningqiao', x: 0, z: Z.wanning, y: 2, label: '万宁桥' });
  // 地安门外大街商铺
  const r = mulberry(13);
  for (let z = Z.wanning - 6; z > Z.drum + 10; z -= 6) for (const sx of [-1, 1]) {
    put(w, A.house(5, 3, { shop: true, h: 2 }), sx * 7, z, { rot: sx < 0 ? 1 : 3 });
    if (r() < 0.6) put(w, A.house(5, 3, { h: 2 }), sx * 13, z, { rot: sx < 0 ? 1 : 3 });
  }
  // 鼓楼、钟楼
  w.gRect(-16, Z.bell - 10, 16, Z.drum + 8, G.PAVE);
  put(w, A.drumTower('ming'), 0, Z.drum, { axis: true, id: 'gulou', label: '鼓楼', node: true });
  put(w, A.bellTower(M ? 'ming' : 'qing'), 0, Z.bell, { axis: true, change: Q, id: 'zhonglou', label: '钟楼', node: true });
  for (const [x, z] of [[-14, -486], [14, -486], [-12, -504], [12, -504]]) put(w, A.house(5, 3, { h: 2 }), x, z, { rot: x < 0 ? 1 : 3 });
  // 德胜门、安定门（当代仅存德胜门箭楼）
  if (!N) {
    put(w, A.cityGateTower({ bays: 5, stories: 2, pd: 6 }), -70, Z.innerN, { id: 'deshengmen', label: '德胜门', kind: 'gate', clear: true, gate: true, hero: true });
    put(w, A.cityGateTower({ bays: 5, stories: 2, pd: 6 }), 45, Z.innerN, { id: 'andingmen', label: '安定门', kind: 'gate', clear: true, gate: true, hero: true });
    for (const gx of [-70, 45]) {
      wallRun(w, 'brick', gx - 11, Z.innerN - 3, gx - 11, Z.innerN - 12, 'W', { thick: 3, h: 3 });
      wallRun(w, 'brick', gx + 11, Z.innerN - 3, gx + 11, Z.innerN - 12, 'E', { thick: 3, h: 3 });
      wallRun(w, 'brick', gx - 11, Z.innerN - 12, gx + 11, Z.innerN - 12, 'N', { thick: 3, h: 3 });
      put(w, A.arrowTower({ hx: 8, hz: 3, rows: 3 }), gx, Z.innerN - 12, { rot: 2, clear: true, gate: true });
    }
  } else {
    put(w, A.arrowTower({ hx: 8, hz: 3, rows: 3 }), -70, Z.innerN - 12, { rot: 2, id: 'deshengmen', label: '德胜门箭楼', kind: 'gate' });
  }
  // 元大都土城遗址
  const prevF = w.flags; w.flags &= ~CH;
  for (let x = X.innerW; x <= X.innerE; x++) {
    if (Math.abs(x + 55) <= 3 || Math.abs(x - 40) <= 3) continue;
    for (let a = -2; a <= 2; a++) {
      const h = 2 - Math.abs(a) + ((x * 7) % 3 === 0 ? 0 : 0);
      for (let y = 0; y < Math.max(1, h); y++) w.set(x, y, Z.yuanN + a, a === 0 && y === h - 1 ? C.LEAF3 : C.EARTH);
    }
  }
  w.flags = prevF;
  w.item('tucheng', X.innerW, 0, Z.yuanN - 3, X.innerE, 3, Z.yuanN + 3);
  w.label(N ? '元大都城垣遗址公园' : '元大都土城遗址', -100, 5, Z.yuanN, 'geo', 'tucheng');
  w.label('小月河', -150, 3, -557, 'geo', 'xiaoyuehe');
  w.item('xiaoyuehe', -170, 0, -568, -140, 1, -548);
}

// ---------------------------------------------------------------------------
// 西苑三海、什刹海
// ---------------------------------------------------------------------------
function xiyuan(ctx) {
  const { w, M, Q, N } = ctx;
  // 琼华岛
  const isl = A.hill([{ x: 0, z: 0, r: 9, h: 6 }]);
  legacy(w, () => put(w, isl, -78, -392));
  w.gEllipse(-78, -392, 9.5, 9.5, N ? G.PARK : G.GRASS);
  if (Q || N) {
    put(w, A.dagoba({ niche: true }), -78, -392, { y: 7, change: Q, id: 'beihai-baita', label: '北海白塔', hero: true });
  } else {
    const p = new Stamp();
    pavilion(p, { shape: 'square', r: 2, h: 2, eaves: 2, tiles: [TILE.green, TILE.yellow], open: true, finial: 1 });
    put(w, p, -78, -392, { y: 7, id: 'qionghuadao', label: '琼华岛' });
  }
  // 团城、北海大桥
  legacy(w, () => { for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) if (x * x + z * z <= 30) { w.set(-58 + x, 0, -353 + z, C.BRICK); w.set(-58 + x, 1, -353 + z, C.BRICK_L); } });
  const cg = new Stamp();
  hall(cg, { w: 3, d: 3, h: 2, eaves: 2, roof: 'xieshan', tile: TILE.yellow, trim: C.G1, overhang: 1 });
  put(w, cg, -58, -353, { y: 2, id: 'tuancheng', label: '团城', kind: 'minor' });
  for (let x = -96; x <= -64; x++) for (let z = -354; z <= -351; z++) { w.set(x, 0, z, C.MARBLE); if ((z === -354 || z === -351) && (x & 1) === 0) w.set(x, 1, z, C.MARBLE); }
  // 五龙亭（明万历三十年建）
  for (let i = 0; i < 5; i++) {
    const p = new Stamp();
    pavilion(p, { shape: 'square', r: i === 2 ? 2 : 1, h: 2, eaves: i === 2 ? 2 : 1, tiles: [TILE.green, TILE.green], open: true, finial: 1, trim: C.Y1 });
    put(w, p, -88 + i * 5, -434 + Math.abs(i - 2), { id: 'wulongting' });
  }
  w.label('五龙亭', -78, 6, -433, 'minor', 'wulongting');
  // 瀛台
  w.gEllipse(-80, -246, 7, 5, G.GRASS);
  const yt = new Stamp();
  hall(yt, { w: 5, d: 2, h: 2, roof: 'xieshan', tile: TILE.yellow, base: { m: 1, h: 1 }, overhang: 1 });
  put(w, yt, -80, -246, { id: 'yingtai', label: '瀛台', kind: 'minor' });
  if (N) {
    const xh = new Stamp();
    hall(xh, { w: 5, d: 2, h: 3, eaves: 2, roof: 'xieshan', tile: TILE.yellow, porch: 'around', overhang: 1, stories: [true], upperH: [2] });
    put(w, xh, -80, Z.huangS - 2, { id: 'xinhuamen', label: '新华门', kind: 'minor' });
  }
  w.label('北海', -86, 3, -415, 'geo', 'beihai');
  w.label('中海', -78, 3, -320, 'geo', 'zhonghai');
  w.label('南海', -80, 3, -270, 'geo', 'nanhai');
  w.item('beihai', -95, 0, -437, -62, 1, -356);
  w.item('zhonghai', -90, 0, -351, -64, 1, -290);
  w.item('nanhai', -96, 0, -287, -62, 1, -190);
  // 什刹海
  bridge(w, -26, -471, 5, 3, 'x');
  w.label('什刹海', -50, 3, -482, 'geo', 'shichahai');
  w.item('shichahai', -104, 0, -508, -4, 1, -451);
  w.label('银锭桥', -26, 4, -471, 'minor', 'yindingqiao');
  if (N) {
    // 后海酒吧街灯火
    const r = mulberry(8);
    for (let i = 0; i < 26; i++) {
      const x = -30 - Math.floor(r() * 50), z = -470 - Math.floor(r() * 4) - Math.floor((-30 - x) * 0.32);
      if (w.gAt(x, z) === G.WATER || w.height(x, z) >= 0) continue;
      put(w, A.house(3, 3, { shop: true, h: 1 }), x, z - 3);
    }
  }
  shoreTrees(w, 'qianhai', 3);
  shoreTrees(w, 'houhai', 4);
  shoreTrees(w, 'xihai', 5);
  shoreTrees(w, 'beihai', 6, 'willow', 0.35);
  shoreTrees(w, 'zhonghai', 7, 'willow', 0.35);
  shoreTrees(w, 'nanhai', 9, 'willow', 0.35);
}

// ---------------------------------------------------------------------------
// 参照地标与城区
// ---------------------------------------------------------------------------
function context(ctx) {
  const { w, M, Q, N } = ctx;
  // 妙应寺白塔（元代建，历代皆存）
  legacy(w, () => put(w, A.dagoba({ big: true }), -122, -312, { id: 'miaoying-baita', label: '妙应寺白塔' }));
  w.label('玉渊潭', -186, 3, -297, 'geo', 'yuyuantan');
  w.item('yuyuantan', -200, 0, -303, -169, 1, -292);
  w.label('莲花池', LHC.x, 3, LHC.z, 'geo', 'lianhuachi');
  w.item('lianhuachi', LHC.x - LHC.rx, 0, LHC.z - LHC.rz, LHC.x + LHC.rx, 1, LHC.z + LHC.rz);
  w.label('高梁河（长河）', -186, 3, -506, 'geo', 'gaolianghe');
  if (N) {
    // 中央电视塔（玉渊潭西侧）、北京西站（莲花池东侧）
    const tv = new Stamp();
    for (let y = 0; y < 30; y++) { const r = y < 2 ? 2 : y < 20 ? 1 : y < 24 ? 2 : 0; for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) tv.set(x, y, z, y >= 20 && y < 24 ? C.GLASS : C.CONCRETE); }
    put(w, tv, -204, -310, { id: 'cctv-tower', label: '中央电视塔' });
    const xz = new Stamp();
    for (let y = 0; y < 5; y++) for (let z = -4; z <= 4; z++) for (let x = -12; x <= 12; x++) { if (Math.abs(x) <= 3 && y < 4 && Math.abs(z) < 4) continue; xz.set(x, y, z, y === 4 ? C.GR1 : (x + y) & 1 ? C.CONCRETE : C.GLASS); }
    const tp = new Stamp();
    pavilion(tp, { shape: 'square', r: 2, h: 2, eaves: 2, tiles: [TILE.green, TILE.green], trim: C.Y1, open: false, finial: 1 });
    tp.place(xz, 0, 5, 0);
    put(w, xz, -186, -114, { id: 'beijingxizhan', label: '北京西站' });
  }
  // 城区里的庭院树
  sprinkleTrees(w, X.innerW + 6, Z.innerN + 6, X.innerE - 6, Z.zhengyang - 6, 0.16, ['round', 'small', 'round'], N ? 101 : 102,
    (x, z, t) => t === G.CITY || t === G.CITY_N);
  sprinkleTrees(w, X.outerW + 4, Z.zhengyang + 4, X.outerE - 4, Z.outerS - 4, 0.1, ['round', 'small', 'willow'], 103,
    (x, z, t) => t === G.CITY || t === G.FIELD_C || t === G.MEADOW || t === G.CITY_N);
  if (N) {
    // 当代城区：二环外的楼宇（示意）
    const r = mulberry(404);
    const blk = (x, z) => {
      const s = new Stamp();
      const h = 4 + Math.floor(r() * 7), wx = 2 + Math.floor(r() * 3), wz = 2 + Math.floor(r() * 3);
      for (let y = 0; y < h; y++) for (let zz = -wz; zz <= wz; zz++) for (let xx = -wx; xx <= wx; xx++) {
        const e = Math.abs(xx) === wx || Math.abs(zz) === wz;
        s.set(xx, y, zz, !e ? C.DARK : y === h - 1 ? C.CONCRETE : ((y + xx + zz) & 1) && y > 0 ? (r() < 0.25 ? C.WINDOW : C.GLASS) : C.CONCRETE);
      }
      put(w, s, x, z);
    };
    for (let z = -560; z < 40; z += 13) for (let x = BOUNDS.x0 + 8; x < BOUNDS.x1 - 6; x += 13) {
      const inside = x > X.outerW - 8 && x < X.outerE + 8 && z > Z.innerN - 18 && z < Z.outerS + 8;
      if (inside) continue;
      if (Math.abs(x + 186) < 22 && (Math.abs(z + 300) < 18 || Math.abs(z + 100) < 22)) continue;
      if (z < Z.yuanN + 8 && z > Z.yuanN - 14) continue;
      if (r() < 0.55) blk(x + Math.floor(r() * 4), z + Math.floor(r() * 4));
    }
  }
}

function greenery(ctx) {
  const { w, N } = ctx;
  // 玉渊潭、莲花池周边
  const r = mulberry(222);
  for (let i = 0; i < 70; i++) {
    const x = -206 + Math.floor(r() * 42), z = -312 + Math.floor(r() * 28);
    if (w.gAt(x, z) === G.WATER || w.height(x, z) >= 0) continue;
    tree(w, x, 0, z, N ? (r() < 0.5 ? 'blossom' : 'round') : (r() < 0.5 ? 'willow' : 'round'), r);
  }
  // 莲花池：柳树只种在池岸外圈，不挡住池面
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, k = 1.18 + r() * 0.3;
    const x = Math.round(LHC.x + Math.cos(a) * LHC.rx * k), z = Math.round(LHC.z + Math.sin(a) * LHC.rz * k);
    if (x < BOUNDS.x0 + 1 || w.gAt(x, z) === G.WATER || w.gAt(x, z) === G.LOTUS || w.height(x, z) >= 0) continue;
    tree(w, x, 0, z, r() < 0.6 ? 'willow' : 'round', r);
  }
  // 小月河、土城沿线
  for (let x = X.innerW; x <= X.innerE; x += 3) {
    if (r() < (N ? 0.85 : 0.4)) { const z = Z.yuanN + (r() < 0.5 ? -4 : 4); if (w.height(x, z) < 0) tree(w, x, 0, z, N ? 'round' : 'willow', r); }
  }
  // 景山、皇城内
  if (N) {
    for (let i = 0; i < 40; i++) {
      const x = -32 + Math.floor(r() * 64), z = Z.jingshanN + 2 + Math.floor(r() * 44);
      if (w.height(x, z) >= 0 || Math.abs(x) < 4) continue;
      tree(w, x, 0, z, 'round', r);
    }
  }
}
