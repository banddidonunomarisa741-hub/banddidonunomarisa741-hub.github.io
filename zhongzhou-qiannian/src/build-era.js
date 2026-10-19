// 生成某一场景（总图或朝代）的体素世界并网格化（纯数据，可在 Worker 中运行）
import { World } from './world.js';
import { meshWorld } from './mesher.js';
import { bakeGround } from './ground.js';
import { BOUNDS, autoBridges } from './eras/common.js';
import { buildMQM } from './eras/mqm.js';
import { buildYuan } from './eras/yuan.js';
import { buildJin, JIN_BOUNDS } from './eras/jin.js';
import { buildMap } from './eras/map.js';
import { MAP } from './geo.js';
import { setStyle } from './style.js';
import { refineHero } from './refine.js';
import { HERO_MASK, HERO_SHIFT } from './palette.js';

export const SCENES = {
  map: { bounds: MAP.bounds, h: 22, build: buildMap, bridges: false, shimmer: 0.35, slab: 0x7a6a58, edge: 0xa9b98a },
  jin: { bounds: JIN_BOUNDS, h: 40, build: buildJin, edge: 0x7c9a52 },
  yuan: { bounds: BOUNDS, h: 40, build: buildYuan },
  ming: { bounds: BOUNDS, h: 40, build: (w) => buildMQM(w, 'ming') },
  qing: { bounds: BOUNDS, h: 40, build: (w) => buildMQM(w, 'qing') },
  modern: { bounds: BOUNDS, h: 40, build: (w) => buildMQM(w, 'modern') },
};

const worlds = new Map();
function worldFor(sc) {
  const k = JSON.stringify(sc.bounds) + sc.h;
  let w = worlds.get(k);
  if (!w) { w = new World({ ...sc.bounds, h: sc.h }); worlds.set(k, w); }
  else w.reset();
  return w;
}

// 细模所需的重点建筑资料留在 Worker 内
const heroStore = {};

export function buildEra(key) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const sc = SCENES[key];
  const t0 = now();
  const w = worldFor(sc);
  setStyle(key);
  try {
    sc.build(w);
    if (sc.bridges !== false) autoBridges(w);
  } finally { setStyle('qing'); }
  const t1 = now();
  const { geoms, heroGeoms, faces } = meshWorld(w, 64);
  const t2 = now();
  const ground = bakeGround(w);
  const t3 = now();
  heroStore[key] = w.heroes.slice();
  return {
    key,
    bounds: sc.bounds,
    shimmer: sc.shimmer, slab: sc.slab, edge: sc.edge,
    geoms,
    heroGeoms,
    heroes: w.heroes.map((h) => ({ idx: h.idx, id: h.id, tag: h.tag || null, noFine: !!h.noFine })),
    faces,
    ground,
    sight: sightMaps(w),
    items: w.items.slice(),
    labels: w.labels.slice(),
    nodes: w.axisNodes.slice(),
    timing: { build: Math.round(t1 - t0), mesh: Math.round(t2 - t1), ground: Math.round(t3 - t2) },
  };
}

// 视线遮挡用的高度图：每列最高的普通体素（树木、城墙、地形），以及最高的重点建筑体素和它的编号。
// 导览取景时普通体素挡住视线就换机位，重点建筑挡住就改为半透明
function sightMaps(w) {
  const L = w.NX * w.NZ;
  const top = new Uint8Array(L), heroTop = new Uint8Array(L), heroIdx = new Uint8Array(L);
  for (let y = 0; y < w.NY; y++) {
    const off = L * y;
    for (let i = 0; i < L; i++) {
      const v = w.vox[off + i];
      if (!v) continue;
      if (v & HERO_MASK) { heroTop[i] = y + 1; heroIdx[i] = (v & HERO_MASK) >> HERO_SHIFT; }
      else top[i] = y + 1;
    }
  }
  return { top, heroTop, heroIdx };
}

export function buildFine(key, idx) {
  const h = (heroStore[key] || []).find((q) => q.idx === idx);
  if (!h) return null;
  return refineHero(h);
}

export function transferables(r) {
  const list = [];
  const add = (g) => list.push(g.position.buffer, g.normal.buffer, g.color.buffer, g.flag.buffer, g.index.buffer);
  for (const g of r.geoms || []) add(g);
  for (const h of r.heroGeoms || []) add(h.geom);
  if (r.ground) list.push(r.ground.color.buffer, r.ground.ao.buffer);
  if (r.sight) list.push(r.sight.top.buffer, r.sight.heroTop.buffer, r.sight.heroIdx.buffer);
  if (r.position) add(r);
  return list;
}
