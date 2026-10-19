// 地面：每格一种地面类型，烘焙成像素贴图（最近邻采样保持体素感），另烘一张 AO 贴图和水面遮罩
import { hash3 } from './world.js';

export const G = {};
const GDEF = [
  // 名称        颜色       扰动  花点
  ['GRASS',     '#78a653', 0.05, 0.012],
  ['GRASS_D',   '#689a4c', 0.05, 0.0],
  ['PARK',      '#84b35d', 0.05, 0.03],
  ['MEADOW',    '#8db162', 0.05, 0.004],
  ['FIELD_A',   '#a4b664', 0.04, 0],
  ['FIELD_B',   '#90ae5b', 0.04, 0],
  ['FIELD_C',   '#bfb683', 0.04, 0],
  ['DIRT',      '#bcab88', 0.05, 0],
  ['ROAD',      '#cfc09f', 0.03, 0],     // 土路
  ['PAVE',      '#bebab1', 0.035, 0],    // 石板
  ['PAVE_L',    '#d3cec3', 0.03, 0],     // 宫殿金砖/甬路
  ['PAVE_D',    '#9a958b', 0.04, 0],
  ['ASPHALT',   '#6b6d70', 0.03, 0],
  ['WATER',     '#5aa3c9', 0.02, 0],
  ['WATER_D',   '#4a89b3', 0.02, 0],
  ['BANK',      '#cfc7b4', 0.04, 0],
  ['PLAZA',     '#d3cdc0', 0.025, 0],    // 广场花岗岩
  ['CITY',      '#c7bfae', 0.035, 0],    // 城区街坊
  ['LANE',      '#d6cebd', 0.025, 0],
  ['MARBLE',    '#ece7dc', 0.02, 0],
  ['FLOWER',    '#7ea74e', 0.06, 0.35],
  ['SAND',      '#d8c79d', 0.05, 0],
  ['RUIN',      '#a99470', 0.08, 0],
  ['LINE',      '#f2efe6', 0.0, 0],
  ['RAIL',      '#7c736a', 0.0, 0],
  ['CITY_N',    '#b5b1a7', 0.035, 0],    // 当代城区
  ['ICE',       '#cfe3ee', 0.02, 0],
  ['LOTUS',     '#55a060', 0.07, 0.035],   // 荷叶覆盖的水面，点缀荷花
  // 总图（真实比例地图）用
  ['MAPLAND',   '#e6e2cf', 0.025, 0],
  ['MAPFIELD',  '#dfe3c6', 0.03, 0],
  ['MAPPARK',   '#b9cf96', 0.04, 0],
  ['MAPGRID',   '#c9c2ab', 0.0, 0],
  ['MAPGRID2',  '#b3aa8f', 0.0, 0],
  ['RING2',     '#6b6458', 0.0, 0],
  ['RING3',     '#9a917f', 0.0, 0],
  ['STREET',    '#d0c8b4', 0.0, 0],
  ['MAPCITY',   '#ddd6c2', 0.02, 0],
];
const GC = [[0, 0, 0]], GN = [0], GF = [0];
GDEF.forEach(([n, hex, noise, fl], i) => {
  G[n] = i + 1;
  const v = parseInt(hex.slice(1), 16);
  GC[i + 1] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  GN[i + 1] = noise; GF[i + 1] = fl;
});
export const isWater = (t) => t === G.WATER || t === G.WATER_D;

const FLOWERS = [[240, 168, 186], [246, 220, 120], [250, 250, 245], [200, 160, 230]];
const LOTUS_FLOWERS = [[240, 128, 168], [246, 160, 190], [252, 210, 224]];

export function bakeGround(world) {
  const { NX, NZ, ground } = world;
  const color = new Uint8Array(NX * NZ * 4);
  const ao = new Uint8Array(NX * NZ * 4);
  const occ = (x, y, z) => (x < 0 || z < 0 || x >= NX || z >= NZ) ? 0 : (world.vox[x + NX * (z + NZ * y)] ? 1 : 0);
  for (let z = 0; z < NZ; z++) {
    const row = NZ - 1 - z;
    for (let x = 0; x < NX; x++) {
      const i = x + NX * z;
      const t = ground[i] || G.GRASS;
      const c = GC[t];
      const n = GN[t];
      const j = 1 + (hash3(x, 7, z) - 0.5) * 2 * n;
      let r = c[0] * j, g = c[1] * j, b = c[2] * j;
      if (GF[t] && hash3(x, 3, z) < GF[t]) {
        const pal = t === G.LOTUS ? LOTUS_FLOWERS : FLOWERS;
        const f = pal[Math.floor(hash3(z, 5, x) * pal.length)];
        r = f[0]; g = f[1]; b = f[2];
      }
      const wat = isWater(t);
      if (wat) {
        let shore = 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const tt = ground[Math.min(NX - 1, Math.max(0, x + dx)) + NX * Math.min(NZ - 1, Math.max(0, z + dz))] || G.GRASS;
          if (!isWater(tt)) shore++;
        }
        if (shore) { r *= 1.12; g *= 1.08; b *= 1.02; }
      }
      const o = (x + NX * row) * 4;
      color[o] = Math.min(255, r); color[o + 1] = Math.min(255, g); color[o + 2] = Math.min(255, b); color[o + 3] = 255;
      let a = 0;
      if (world.top[i]) a = 3;
      else for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) a += occ(x + dx, 0, z + dz) * (dx && dz ? 0.5 : 1);
      const av = Math.max(0.5, 1 - a * 0.11) * 255;
      ao[o] = av; ao[o + 1] = wat ? 255 : 0; ao[o + 2] = av; ao[o + 3] = 255;
    }
  }
  return { color, ao, width: NX, height: NZ };
}

