// 近景细模：把重点建筑按 2 倍精度重新体素化，并补上细部
// —— 屋面阶梯减半、檐口变薄、瓦垄、门钉、格扇、斗拱节奏、彩画金线、栏杆望柱。
import { World } from './world.js';
import { meshFine } from './mesher.js';
import { C, ROOF_TILES, TILE_DARK } from './palette.js';
import { withStyle } from './style.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const RAIL = new Set([C.MARBLE]);
const BASE = new Set([C.MARBLE, C.MARBLE_D]);

export function refineHero(h) {
  // 1) 先按原样放进一个小的粗网格（世界坐标），旋转问题交给 Stamp.place
  const b = h.bbox;
  const G = new World({ x0: b.x0 - 2, x1: b.x1 + 2, z0: b.z0 - 2, z1: b.z1 + 2, h: b.y1 + 4 });
  withStyle('qing', () => h.stamp.place(G, h.x, h.y, h.z, h.rot));
  const g = (x, y, z) => G.get(x, y, z);

  // 2) 细网格
  const F = new World({ x0: 2 * G.x0, x1: 2 * G.x1 + 1, z0: 2 * G.z0, z1: 2 * G.z1 + 1, h: 2 * G.NY });
  F.flags = h.flags;
  const style = h.style;
  const qing = style === 'qing' || style === 'modern';
  const ming = style === 'ming';
  const S = (x, y, z, a, bb, c, col) => F.setRaw(2 * x + a, 2 * y + bb, 2 * z + c, col);

  for (let y = 0; y < G.NY; y++)
    for (let z = G.z0; z <= G.z1; z++)
      for (let x = G.x0; x <= G.x1; x++) {
        const c = g(x, y, z);
        if (!c) continue;
        const above = g(x, y + 1, z);

        // —— 屋面 ——
        if (ROOF_TILES.has(c) && !above) {
          const empty = DIRS.map(([dx, dz]) => !g(x + dx, y, z + dz));
          const ex = empty[0] || empty[1], ez = empty[2] || empty[3];
          // 屋脊：前后（或左右）同时临空，且两侧下方都是屋面
          const crestZ = empty[2] && empty[3] && ROOF_TILES.has(g(x, y - 1, z + 1)) && ROOF_TILES.has(g(x, y - 1, z - 1));
          const crestX = empty[0] && empty[1] && ROOF_TILES.has(g(x + 1, y - 1, z)) && ROOF_TILES.has(g(x - 1, y - 1, z));
          const dark = TILE_DARK[c] || c;
          for (let a = 0; a < 2; a++)
            for (let cc = 0; cc < 2; cc++) {
              S(x, y, z, a, 0, cc, c);
              let carve = false;
              if (!crestZ && !crestX) {
                if (empty[0] && a === 1) carve = true;
                if (empty[1] && a === 0) carve = true;
                if (empty[2] && cc === 1) carve = true;
                if (empty[3] && cc === 0) carve = true;
              }
              // 瓦垄：沿坡向排列，隔一垄加深
              let col = c;
              if (ez && !ex && a === 1) col = dark;
              else if (ex && !ez && cc === 1) col = dark;
              if (!carve) S(x, y, z, a, 1, cc, col);
              // 下层也带瓦垄，台阶处露出来
              if (col !== c) S(x, y, z, a, 0, cc, col);
            }
          // 戗脊、垂脊：屋面阶梯的转角处（x、z 两向都临空）各加一个凸起，连成一串，近看如脊上走兽
          if (ex && ez && !crestZ && !crestX) {
            const ia = empty[0] ? 0 : 1, ic = empty[2] ? 0 : 1;
            F.setRaw(2 * x + ia, 2 * y + 2, 2 * z + ic, dark);
          }
          continue;
        }

        // —— 门、格扇 ——
        if (c === C.GATE) {
          for (let a = 0; a < 2; a++) for (let bb = 0; bb < 2; bb++) for (let cc = 0; cc < 2; cc++)
            S(x, y, z, a, bb, cc, ((a + bb + cc) & 1) === 0 ? C.GOLD : C.GATE);    // 门钉
          continue;
        }
        if (c === C.DOOR || c === C.DOOR_G) {
          const line = c === C.DOOR ? C.WOOD_D : C.WOOD;
          for (let a = 0; a < 2; a++) for (let bb = 0; bb < 2; bb++) for (let cc = 0; cc < 2; cc++)
            S(x, y, z, a, bb, cc, ((a + bb + cc) & 1) ? c : line);                 // 格扇棂条
          continue;
        }
        // —— 斗拱、彩画 ——
        if (c === C.CH_D) {
          for (let a = 0; a < 2; a++) for (let bb = 0; bb < 2; bb++) for (let cc = 0; cc < 2; cc++)
            S(x, y, z, a, bb, cc, bb === 1 && ((a + cc) & 1) ? (qing ? C.GOLD : C.CH_G) : C.CH_D);
          continue;
        }
        if (c === C.CH_B || c === C.CH_G) {
          for (let a = 0; a < 2; a++) for (let bb = 0; bb < 2; bb++) for (let cc = 0; cc < 2; cc++) {
            let col = c;
            if (bb === 1) col = qing ? (((a + cc) & 1) ? C.GOLD : c) : ming ? C.CH_D : c;   // 清和玺金线、明旋子墨线
            S(x, y, z, a, bb, cc, col);
          }
          continue;
        }
        // —— 栏杆望柱 ——
        if (RAIL.has(c) && !above && BASE.has(g(x, y - 1, z))) {
          let nb = 0;
          for (const [dx, dz] of DIRS) if (g(x + dx, y, z + dz) === c) nb++;
          if (nb <= 1) {
            for (let a = 0; a < 2; a++) for (let cc = 0; cc < 2; cc++) S(x, y, z, a, 0, cc, c);
            S(x, y, z, 0, 1, 0, C.MARBLE_D);                                        // 望柱头
            continue;
          }
        }
        // —— 陈设：铜狮、铜鹤、铜龟、鼎炉、日晷 ——
        if (c === C.DIAL) {
          // 晷盘倾斜，朝南北两面，正中立晷针
          S(x, y, z, 0, 0, 1, c); S(x, y, z, 1, 0, 1, c); S(x, y, z, 0, 1, 0, c); S(x, y, z, 1, 1, 0, c);
          F.setRaw(2 * x + 1, 2 * y + 2, 2 * z, C.GOLD_D);
          continue;
        }
        if ((c === C.BRONZE || c === C.BRONZE_D || c === C.GILT) && !above) {
          const below = g(x, y - 1, z);
          if (below === C.BRONZE_D && c === C.BRONZE) {
            // 铜鹤：细颈昂首
            S(x, y, z, 0, 0, 0, c); S(x, y, z, 0, 1, 0, c); S(x, y, z, 1, 1, 0, C.GOLD_D);
          } else if (below === C.BRONZE || below === C.GILT) {
            // 狮头：前半格高起，后半格低
            S(x, y, z, 0, 0, 0, c); S(x, y, z, 1, 0, 0, c); S(x, y, z, 0, 0, 1, c); S(x, y, z, 1, 0, 1, c);
            S(x, y, z, 0, 1, 1, c); S(x, y, z, 1, 1, 1, c);
          } else if (c === C.BRONZE_D) {
            // 鼎炉：三足、圆腹、两耳
            S(x, y, z, 0, 0, 0, c); S(x, y, z, 1, 0, 1, c);
            S(x, y, z, 0, 1, 0, c); S(x, y, z, 1, 1, 0, c); S(x, y, z, 0, 1, 1, c); S(x, y, z, 1, 1, 1, c);
            F.setRaw(2 * x, 2 * y + 2, 2 * z, C.GOLD_D);
          } else {
            // 铜龟：龟甲低平隆起
            for (let a = 0; a < 2; a++) for (let cc = 0; cc < 2; cc++) S(x, y, z, a, 0, cc, c);
            S(x, y, z, 0, 1, 0, C.BRONZE_D);
          }
          continue;
        }
        if (c === C.BRONZE_D && above === C.BRONZE) {
          // 鹤腿：两根细足
          S(x, y, z, 0, 0, 0, c); S(x, y, z, 1, 0, 1, c); S(x, y, z, 0, 1, 0, c); S(x, y, z, 1, 1, 1, c);
          continue;
        }
        // —— 城砖：错缝 ——
        if (c === C.BRICK || c === C.BRICK_D || c === C.BRICK_L || c === C.RED_WALL) {
          for (let a = 0; a < 2; a++) for (let bb = 0; bb < 2; bb++) for (let cc = 0; cc < 2; cc++) {
            const fx = 2 * x + a, fy = 2 * y + bb, fz = 2 * z + cc;
            const seam = ((fx + fz + (fy & 1) * 2) % 4 === 0) && bb === 1;
            S(x, y, z, a, bb, cc, seam ? (c === C.RED_WALL ? C.RED_D : C.BRICK_D) : c);
          }
          continue;
        }
        for (let a = 0; a < 2; a++) for (let bb = 0; bb < 2; bb++) for (let cc = 0; cc < 2; cc++) S(x, y, z, a, bb, cc, c);
      }

  // 3) 栏板：两根望柱之间补低矮栏板
  for (let y = 1; y < G.NY; y++)
    for (let z = G.z0; z <= G.z1; z++)
      for (let x = G.x0; x <= G.x1; x++) {
        if (g(x, y, z) || !BASE.has(g(x, y - 1, z))) continue;
        const ew = RAIL.has(g(x - 1, y, z)) && RAIL.has(g(x + 1, y, z)) && !g(x - 1, y + 1, z) && !g(x + 1, y + 1, z);
        const ns = RAIL.has(g(x, y, z - 1)) && RAIL.has(g(x, y, z + 1)) && !g(x, y + 1, z - 1) && !g(x, y + 1, z + 1);
        if (!ew && !ns) continue;
        for (let a = 0; a < 2; a++) for (let cc = 0; cc < 2; cc++) {
          if (ew && cc !== 0) continue;
          if (ns && a !== 0) continue;
          S(x, y, z, a, 0, cc, C.MARBLE);
        }
      }

  return meshFine(F, 0.5);
}
