// 总图：按真实经纬度绘制（1 格 = 25 米），底图为今天的水系、绿地与环路，
// 各朝代城墙、中轴线由界面叠加；地标小模型按朝代显隐。
import { mapXZ, AXIS_LON } from '../geo.js';
import { put, C, TILE, G, Stamp } from './common.js';
import { inShape, hall } from '../kit.js';

const P = (lon, lat) => mapXZ(lon, lat);
const M = (m) => m / 25;  // 米 → 格

export function buildMap(w) {
  const B = w;
  w.gRect(B.x0, B.z0, B.x1, B.z1, G.MAPLAND);
  // 老城范围（明清城墙以内）略深一点，方便辨认
  const poly = (pts, t, only) => w.gPoly(pts.map(([a, b]) => P(a, b)), t, only);
  poly([[116.3555, 39.9440], [116.3610, 39.9480], [116.4334, 39.9480], [116.4334, 39.8994], [116.4410, 39.8994], [116.4410, 39.8668],
    [116.3480, 39.8668], [116.3480, 39.8994], [116.3555, 39.8994]], G.MAPCITY);

  // ---------- 绿地 ----------
  const rect = (lon0, lat0, lon1, lat1, t) => { const [x0, z0] = P(lon0, lat1), [x1, z1] = P(lon1, lat0); w.gRect(Math.round(x0), Math.round(z0), Math.round(x1), Math.round(z1), t); };
  rect(116.3946, 39.8712, 116.4148, 39.8860, G.MAPPARK);   // 天坛
  rect(116.3790, 39.8730, 116.3876, 39.8820, G.MAPPARK);   // 先农坛
  rect(116.3880, 39.9212, 116.3942, 39.9268, G.MAPPARK);   // 景山
  rect(116.3780, 39.9200, 116.3900, 39.9330, G.MAPPARK);   // 北海公园
  rect(116.3720, 39.8710, 116.3850, 39.8800, G.MAPPARK);   // 陶然亭
  rect(116.4250, 39.8740, 116.4410, 39.8850, G.MAPPARK);   // 龙潭湖
  rect(116.3020, 39.9110, 116.3290, 39.9230, G.MAPPARK);   // 玉渊潭
  rect(116.3050, 39.9400, 116.3180, 39.9480, G.MAPPARK);   // 紫竹院
  rect(116.4090, 39.9520, 116.4180, 39.9590, G.MAPPARK);   // 地坛
  rect(116.3555, 39.9748, 116.4334, 39.9772, G.MAPPARK);   // 元大都城垣遗址公园
  rect(116.3070, 39.8900, 116.3230, 39.9010, G.MAPPARK);   // 莲花池公园
  rect(116.3860, 39.9072, 116.3960, 39.9125, G.MAPPARK);   // 中山公园、劳动人民文化宫

  // ---------- 经纬网 ----------
  for (let lon = 116.30; lon <= 116.461; lon += 0.01) {
    const [x] = P(lon, 39.9);
    const major = Math.abs(Math.round(lon * 100) % 5) === 0;
    w.gRect(Math.round(x), B.z0, Math.round(x), B.z1, major ? G.MAPGRID2 : G.MAPGRID);
  }
  for (let lat = 39.85; lat <= 40.001; lat += 0.01) {
    const [, z] = P(116.39, lat);
    const major = Math.abs(Math.round(lat * 100) % 5) === 0;
    w.gRect(B.x0, Math.round(z), B.x1, Math.round(z), major ? G.MAPGRID2 : G.MAPGRID);
  }

  // ---------- 今天的道路（参照） ----------
  const line = (pts, wd, t) => w.gLine(pts.map(([a, b]) => P(a, b)), wd, t);
  const dashed = (pts, wd, t, on = 6, off = 4) => {
    const xz = pts.map(([a, b]) => P(a, b));
    let acc = 0;
    for (let i = 0; i < xz.length - 1; i++) {
      const [ax, az] = xz[i], [bx, bz] = xz[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < len; s += 1) {
        if ((acc + s) % (on + off) < on) {
          const x = ax + (bx - ax) * (s / len), z = az + (bz - az) * (s / len);
          w.gLine([[x, z], [x + 0.01, z]], wd, t);
        }
      }
      acc += len;
    }
  };
  line([[116.295, 39.9065], [116.465, 39.9065]], 1.6, G.STREET);   // 长安街
  line([[116.295, 39.9320], [116.465, 39.9320]], 1.2, G.STREET);   // 平安大街
  line([[116.295, 39.8890], [116.465, 39.8890]], 1.2, G.STREET);   // 两广路
  line([[116.3740, 39.85], [116.3740, 40.0]], 1.0, G.STREET);       // 宣武门—西单
  line([[116.4180, 39.85], [116.4180, 40.0]], 1.0, G.STREET);       // 东单
  dashed([[116.3540, 39.9455], [116.3610, 39.9495], [116.4350, 39.9495], [116.4350, 39.8990], [116.4425, 39.8985], [116.4425, 39.8655],
    [116.3465, 39.8655], [116.3465, 39.8990], [116.3540, 39.8995], [116.3540, 39.9455]], 2.2, G.RING2);
  dashed([[116.3220, 39.9670], [116.4610, 39.9670], [116.4610, 39.8565], [116.3220, 39.8565], [116.3220, 39.9670]], 1.8, G.RING3);

  // ---------- 水系（今） ----------
  const lake = (lon, lat, rx, rz, t = G.WATER) => { const [x, z] = P(lon, lat); w.gEllipse(x, z, M(rx), M(rz), t); };
  lake(116.3150, 39.8955, 220, 260);                                  // 莲花池
  line([[116.3160, 39.8930], [116.3220, 39.8860], [116.3300, 39.8780], [116.3350, 39.8680], [116.3420, 39.8580], [116.3520, 39.8500]], 1.6, G.WATER); // 莲花河
  lake(116.3400, 39.8762, 70, 60);                                    // 青年湖（鱼藻池遗址）
  lake(116.3120, 39.9170, 520, 260); lake(116.3255, 39.9150, 330, 200); // 玉渊潭
  lake(116.3115, 39.9440, 220, 180);                                  // 紫竹院
  line([[116.2950, 39.9480], [116.3115, 39.9440], [116.3300, 39.9425], [116.3480, 39.9420], [116.3555, 39.9440]], 1.6, G.WATER); // 长河
  poly([[116.3700, 39.9500], [116.3770, 39.9505], [116.3800, 39.9470], [116.3740, 39.9450], [116.3690, 39.9470]], G.WATER);      // 西海
  poly([[116.3770, 39.9455], [116.3830, 39.9440], [116.3880, 39.9405], [116.3860, 39.9390], [116.3800, 39.9415], [116.3750, 39.9440]], G.WATER); // 后海
  poly([[116.3870, 39.9395], [116.3925, 39.9375], [116.3915, 39.9350], [116.3870, 39.9365]], G.WATER);                           // 前海
  poly([[116.3805, 39.9318], [116.3880, 39.9318], [116.3885, 39.9240], [116.3870, 39.9205], [116.3810, 39.9205], [116.3800, 39.9260]], G.WATER); // 北海
  poly([[116.3800, 39.9195], [116.3855, 39.9195], [116.3850, 39.9115], [116.3795, 39.9115]], G.WATER);                           // 中海
  poly([[116.3790, 39.9110], [116.3850, 39.9110], [116.3845, 39.9072], [116.3785, 39.9072]], G.WATER);                           // 南海
  // 筒子河
  const fc = [[116.3862, 39.9213], [116.3960, 39.9213], [116.3960, 39.9118], [116.3862, 39.9118], [116.3862, 39.9213]];
  line(fc, 1.6, G.WATER);
  // 护城河（今存北、南两段）+ 通惠河、凉水河
  line([[116.3540, 39.9500], [116.4380, 39.9500], [116.4380, 39.9020], [116.4650, 39.9050]], 1.6, G.WATER);
  line([[116.3450, 39.8640], [116.4440, 39.8640], [116.4440, 39.8990]], 1.6, G.WATER);
  line([[116.2950, 39.8620], [116.3300, 39.8560], [116.3800, 39.8545], [116.4300, 39.8580], [116.4650, 39.8620]], 1.6, G.WATER);
  lake(116.3790, 39.8760, 170, 140);                                  // 陶然亭湖
  lake(116.4330, 39.8800, 240, 160);                                  // 龙潭湖

  // ---------- 地标小模型（按朝代显隐） ----------
  const ALL = 'jin,yuan,ming,qing,modern';
  const icon = (s, lon, lat, id, tag, label) => {
    const [x, z] = P(lon, lat);
    put(w, s, Math.round(x), Math.round(z), { id, hero: true, noFine: true, tag });
    if (label) w.label(label, Math.round(x), s.height + 2, Math.round(z), 'mapicon', id);
  };
  icon(miniPagoda(), 116.3420, 39.8962, 'tianningsi', ALL, null);
  icon(miniDagoba(), 116.3582, 39.9235, 'miaoying-baita', 'yuan,ming,qing,modern', null);
  icon(miniPalace(18, 22, TILE.jin, C.WALL_W), 116.3440, 39.8826, 'jin-gongcheng', 'jin', null);
  icon(miniPavilion(TILE.jin), 116.3840, 39.9262, 'daninggong', 'jin', null);
  icon(miniPalace(16, 18, TILE.yuan, C.RED_WALL, true), 116.3911, 39.9197, 'damingdian', 'yuan', null);
  icon(miniPavilion(TILE.yuan), 116.3840, 39.9262, 'guanghandian', 'yuan', null);
  icon(miniTower(TILE.yuan), 116.3911, 39.9400, 'zhongxintai', 'yuan', null);
  icon(miniPalace(16, 20, TILE.ming, C.RED_WALL), 116.3911, 39.9165, 'zijincheng', 'ming', null);
  icon(miniPalace(16, 20, TILE.yellow, C.RED_WALL), 116.3911, 39.9165, 'zijincheng', 'qing,modern', null);
  icon(miniRound(), 116.4066, 39.8822, 'qiniandian', 'ming,qing,modern', null);
  for (const [lat, id] of [[39.8994, 'zhengyangmen'], [39.8668, 'yongdingmen'], [39.9072, 'tiananmen']])
    icon(miniGate(id === 'tiananmen' ? C.RED_WALL : C.BRICK), AXIS_LON, lat, id, 'ming,qing,modern', null);
  icon(miniTower(TILE.greyGreen), 116.3905, 39.9405, 'gulou', 'ming,qing,modern', null);
  icon(miniDagoba(), 116.3838, 39.9258, 'beihai-baita', 'qing,modern', null);
  icon(miniMonument(), AXIS_LON, 39.9031, 'jinianbei', 'modern', null);
  icon(miniStadium(), 116.3966, 39.9929, 'niaochao', 'modern', null);
  icon(miniTVTower(), 116.3003, 39.9170, 'cctv-tower', 'modern', null);
}

// —— 迷你模型（总图尺度） ——
function miniPagoda() {
  const s = new Stamp();
  for (let y = 0; y < 2; y++) for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) if (inShape('oct', x, z, 2)) s.set(x, y, z, C.BRICK_L);
  for (let y = 2; y < 9; y++) for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) if (y % 2 === 0 || (x === 0 || z === 0)) s.set(x, y, z, y % 2 ? C.BRICK_L : C.GR2);
  s.set(0, 9, 0, C.GOLD);
  return s;
}
function miniDagoba() {
  const s = new Stamp();
  for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) { s.set(x, 0, z, C.WHITE); if (Math.abs(x) + Math.abs(z) <= 3) s.set(x, 1, z, C.WHITE); }
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) { s.set(x, 2, z, C.WHITE); s.set(x, 3, z, C.WHITE); }
  s.set(0, 4, 0, C.WHITE); s.set(0, 5, 0, C.WHITE); s.set(0, 6, 0, C.GOLD);
  return s;
}
function miniPalace(hw, hd, tile, wall, gongzi) {
  const s = new Stamp();
  for (let z = -hd; z <= hd; z++) for (let x = -hw; x <= hw; x++) {
    const e = Math.abs(x) === hw || Math.abs(z) === hd;
    if (e) { s.set(x, 0, z, wall); s.set(x, 1, z, tile[1]); }
  }
  const halls = gongzi ? [[-hd * 0.3, 7, 3], [-hd * 0.6, 4, 2], [hd * 0.35, 6, 2]] : [[-hd * 0.15, 8, 3], [-hd * 0.45, 4, 2], [-hd * 0.7, 7, 2], [hd * 0.4, 6, 2], [hd * 0.85, 9, 2]];
  for (const [zc, hx, hz] of halls) {
    const z0 = Math.round(zc);
    for (let z = z0 - hz; z <= z0 + hz; z++) for (let x = -hx; x <= hx; x++) {
      s.set(x, 0, z, C.MARBLE);
      s.set(x, 1, z, C.RED);
      s.set(x, 2, z, Math.abs(z - z0) === hz || Math.abs(x) === hx ? tile[0] : tile[1]);
    }
    for (let x = -hx + 1; x <= hx - 1; x++) s.set(x, 3, z0, tile[2]);
  }
  if (gongzi) for (let z = Math.round(-hd * 0.6); z <= Math.round(-hd * 0.3); z++) { s.set(0, 0, z, C.MARBLE); s.set(0, 1, z, C.RED); s.set(0, 2, z, tile[0]); }
  return s;
}
function miniPavilion(tile) {
  const s = new Stamp();
  for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) if (x * x + z * z <= 10) s.set(x, 0, z, C.LEAF2);
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) { s.set(x, 1, z, C.RED); s.set(x, 2, z, tile[0]); }
  s.set(0, 3, 0, tile[2]);
  return s;
}
function miniTower(tile) {
  const s = new Stamp();
  for (let y = 0; y < 2; y++) for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) s.set(x, y, z, C.RED_WALL);
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) { s.set(x, 2, z, C.RED); s.set(x, 3, z, tile[0]); }
  for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) if (Math.abs(x) === 2 || Math.abs(z) === 2) s.set(x, 3, z, tile[1]);
  s.set(0, 4, 0, tile[2]);
  return s;
}
function miniGate(wall) {
  const s = new Stamp();
  for (let y = 0; y < 2; y++) for (let z = -1; z <= 1; z++) for (let x = -3; x <= 3; x++) s.set(x, y, z, wall);
  for (let z = -1; z <= 1; z++) for (let x = -2; x <= 2; x++) { s.set(x, 2, z, C.RED); s.set(x, 3, z, wall === C.BRICK ? C.GR1 : C.Y1); }
  for (let x = -1; x <= 1; x++) s.set(x, 4, 0, wall === C.BRICK ? C.G2 : C.Y3);
  return s;
}
function miniRound() {
  const s = new Stamp();
  for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) if (x * x + z * z <= 10) s.set(x, 0, z, C.MARBLE);
  for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) if (x * x + z * z <= 5) { s.set(x, 1, z, C.RED); s.set(x, 2, z, C.B1); }
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) s.set(x, 3, z, C.B2);
  s.set(0, 4, 0, C.GOLD);
  return s;
}
function miniMonument() {
  const s = new Stamp();
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) s.set(x, 0, z, C.GRANITE);
  for (let y = 1; y < 6; y++) s.set(0, y, 0, C.GRANITE);
  return s;
}
function miniStadium() {
  const s = new Stamp();
  for (let z = -6; z <= 6; z++) for (let x = -8; x <= 8; x++) {
    const d = (x * x) / 64 + (z * z) / 36;
    if (d <= 1 && d > 0.45) { s.set(x, 0, z, C.STEEL); s.set(x, 1, z, C.STEEL); if (d > 0.7) s.set(x, 2, z, C.STEEL); }
  }
  return s;
}
function miniTVTower() {
  const s = new Stamp();
  for (let y = 0; y < 14; y++) s.set(0, y, 0, C.CONCRETE);
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) { s.set(x, 10, z, C.GLASS); s.set(x, 11, z, C.GLASS); }
  return s;
}
void hall;
