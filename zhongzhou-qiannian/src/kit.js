// 体素构件库：屋顶、屋身、台基、城台、城墙、树木等。
// 局部坐标约定：x 向东，z 向南，建筑正面朝 +z；目标对象 t 可以是 World 或 Stamp。
import { C, TILE } from './palette.js';
import { hash3 } from './world.js';
import { ST } from './style.js';

// ---------------------------------------------------------------------------
// 屋顶
// ---------------------------------------------------------------------------

// 生成逐层收分的矩形序列
function roofRects(r, type, steps, skirt) {
  const rects = [];
  let cur = { ...r };
  let i = 0;
  const lu = type === 'luding' ? Math.max(3, Math.round((r.z1 - r.z0 + 1) * 0.45)) : 0;
  for (;;) {
    rects.push(cur);
    const depth = cur.z1 - cur.z0 + 1;
    const width = cur.x1 - cur.x0 + 1;
    if (type === 'luding') { if (depth <= lu) break; }
    else if (type === 'cuanjian') {
      if (depth <= 1 || width <= 1) break;
    } else if (depth <= 2) break;
    let s = steps[i] ?? 1;
    s = Math.max(1, Math.min(s, Math.floor((depth - 1) / 2)));
    let sx = 0;
    if (type === 'wudian' || type === 'cuanjian' || type === 'luding') sx = s;
    else if (type === 'xieshan') sx = i < skirt ? s : 0;
    if (type === 'wudian' || type === 'luding') {
      // 推山：保持正脊不短于进深收尽后的长度
      sx = Math.min(sx, Math.floor((width - 1) / 2));
    }
    cur = { x0: cur.x0 + sx, x1: cur.x1 - sx, z0: cur.z0 + s, z1: cur.z1 - s };
    if (cur.x1 < cur.x0) { cur.x0 = cur.x1 = Math.round((cur.x0 + cur.x1) / 2); }
    i++;
  }
  return rects;
}

/**
 * 矩形屋顶
 * o: {x0,x1,z0,z1,y, type: wudian|xieshan|xuanshan|yingshan|juanpeng|cuanjian,
 *     tile:[主,间,脊], trim, steps, skirt(歇山裙层数), wen(正吻), upturn, gable, finial}
 * 返回屋顶最高 y
 */
export function roof(t, o) {
  const tile = o.tile || TILE.yellow;
  const [m1, m2, rc] = tile;
  const type = o.type || 'wudian';
  const depth = o.z1 - o.z0 + 1;
  const steps = o.steps || ST.cur.steps(depth);
  const skirt = o.skirt ?? 1;
  const rects = roofRects({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1 }, type, steps, skirt);
  const gableFrom = type === 'xieshan' ? skirt : (type === 'xuanshan' || type === 'yingshan' || type === 'juanpeng') ? 0 : 99;
  const S = ST.cur;
  const gableCol = o.gable ?? (type === 'yingshan' ? C.GR2 : C.RED_D);
  const flushGable = true;
  let y = o.y;

  for (let j = 0; j < rects.length; j++) {
    const r = rects[j];
    const n = rects[j + 1] || null;
    const isGable = j >= gableFrom;
    for (let z = r.z0; z <= r.z1; z++) {
      for (let x = r.x0; x <= r.x1; x++) {
        let c;
        let dx = 0, dz = 0;
        if (n) {
          dx = x < n.x0 ? n.x0 - x : x > n.x1 ? x - n.x1 : 0;
          dz = z < n.z0 ? n.z0 - z : z > n.z1 ? z - n.z1 : 0;
        }
        const exposed = n ? (dx > 0 || dz > 0) : true;
        const xEdge = x === r.x0 || x === r.x1;
        // 山花位置（边缘内一格、非坡面）已由边缘格写入，跳过
        if (isGable && !flushGable && (type === 'xieshan' || type === 'xuanshan' || type === 'juanpeng') &&
            (x === r.x0 + 1 || x === r.x1 - 1) && n && dz === 0) continue;
        if (isGable && xEdge && type !== 'wudian' && type !== 'cuanjian' && type !== 'luding') {
          // 山面：边缘只留博风（坡面边沿），内部退进一格作山花
          const onSlope = n ? dz > 0 : true;
          if (onSlope || (!n)) {
            c = (z & 1) ? m2 : m1;
            if (!n) c = rc;
            t.set(x, y, z, c);
          } else {
            const inner = x === r.x0 ? x + 1 : x - 1;
            const zc = Math.round((r.z0 + r.z1) / 2);
            const gc = (type !== 'yingshan' && z === zc && n && n.z1 - n.z0 >= 2) ? C.GOLD : gableCol;
            if (flushGable) t.set(x, y, z, gc);
            else t.set(inner, y, z, gc);
          }
          continue;
        }
        if (!exposed) {
          c = m1;
        } else if (!n) {
          c = m1;
        } else if (dx > 0 && dz > 0) {
          c = dx === dz ? rc : dx > dz ? ((z & 1) ? m2 : m1) : ((x & 1) ? m2 : m1);
        } else if (dz > 0) {
          c = (x & 1) ? m2 : m1;
        } else {
          c = (z & 1) ? m2 : m1;
        }
        if (j === 0 && o.trim && (x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1)) c = o.trim;
        t.set(x, y, z, c);
      }
    }
    y++;
  }
  const last = rects[rects.length - 1];
  // 正脊 / 宝顶
  if (type === 'cuanjian') {
    const cx = Math.round((last.x0 + last.x1) / 2), cz = Math.round((last.z0 + last.z1) / 2);
    const fh = o.finial ?? 1;
    for (let k = 0; k < fh; k++) t.set(cx, y + k, cz, C.GOLD);
    y += fh;
  } else if (type === 'luding') {
    // 盝顶：顶部为平台，四周围一圈脊
    y--;
    for (let z = last.z0; z <= last.z1; z++)
      for (let x = last.x0; x <= last.x1; x++) {
        const edge = x === last.x0 || x === last.x1 || z === last.z0 || z === last.z1;
        t.set(x, y, z, edge ? m1 : m2);
        if (edge) t.set(x, y + 1, z, rc);
      }
    y += 2;
  } else if (type !== 'juanpeng') {
    // 进深收到 1 格时，最后一层本身就是正脊，不再加层
    const thin = last.z1 - last.z0 === 0;
    if (thin) y--;
    for (let z = last.z0; z <= last.z1; z++)
      for (let x = last.x0; x <= last.x1; x++) t.set(x, y, z, rc);
    if (o.wen !== false && last.x1 - last.x0 >= 2) {
      const zc = Math.round((last.z0 + last.z1) / 2);
      if (S.ridge === 'chiwei' && last.x1 - last.x0 >= 4) {
        // 鸱尾：高耸、尾部向内卷
        const ch = o.wen === 2 ? 3 : 2;
        for (let k = 1; k <= ch; k++) {
          t.set(last.x0, y + k, zc, C.CHIWEI);
          t.set(last.x1, y + k, zc, C.CHIWEI);
        }
        for (let k = 1; k < ch; k++) {
          t.set(last.x0 + 1, y + k, zc, C.CHIWEI);
          t.set(last.x1 - 1, y + k, zc, C.CHIWEI);
        }
      } else {
        const wh = (o.wen === 2 ? 2 : 1) + (S.ridge === 'wen2' && o.wen === 2 ? 0 : 0);
        for (let k = 1; k <= wh; k++) {
          t.set(last.x0, y + k, zc, rc);
          t.set(last.x1, y + k, zc, rc);
        }
      }
      if (o.pearl) t.set(Math.round((last.x0 + last.x1) / 2), y + 1, zc, C.GOLD);
    }
    y++;
  } else {
    y--;
  }
  // 翼角起翘（小屋顶不做，避免显得杂乱）
  const r00 = rects[0];
  const up = o.upturn ?? (S.upturn === false ? false : undefined);
  if (up !== false && (up || (r00.x1 - r00.x0 >= 8 && r00.z1 - r00.z0 >= 6))) {
    const r0 = rects[0];
    const cc = o.trim || rc;
    const up2 = up === 2 || (up === undefined && S.upturn === 2 && r00.x1 - r00.x0 >= 14);
    for (const [x, z] of [[r0.x0, r0.z0], [r0.x1, r0.z0], [r0.x0, r0.z1], [r0.x1, r0.z1]]) {
      if (type === 'xuanshan' || type === 'yingshan' || type === 'juanpeng') break;
      t.set(x, o.y + 1, z, cc);
      if (up2) {
        const sx = x === r0.x0 ? -1 : 1, sz = z === r0.z0 ? -1 : 1;
        t.set(x + sx, o.y + 1, z + sz, cc);
      }
    }
  }
  return y;
}

// 下檐（腰檐）一圈：从外檐矩形收到内矩形
export function eaveRing(t, outer, inner, y, tile, trim, upturn = true) {
  const [m1, m2, rc] = tile;
  let r = { ...outer };
  let first = true;
  const out = [];
  while (r.x0 < inner.x0 || r.z0 < inner.z0) {
    out.push(r);
    const s = first ? 2 : 1;
    first = false;
    r = {
      x0: Math.min(r.x0 + s, inner.x0), x1: Math.max(r.x1 - s, inner.x1),
      z0: Math.min(r.z0 + s, inner.z0), z1: Math.max(r.z1 - s, inner.z1),
    };
    if (out.length > 6) break;
  }
  out.forEach((r, j) => {
    const n = out[j + 1] || inner;
    for (let z = r.z0; z <= r.z1; z++)
      for (let x = r.x0; x <= r.x1; x++) {
        const dx = x < n.x0 ? n.x0 - x : x > n.x1 ? x - n.x1 : 0;
        const dz = z < n.z0 ? n.z0 - z : z > n.z1 ? z - n.z1 : 0;
        let c;
        if (dx === 0 && dz === 0) c = C.DARK;
        else if (dx > 0 && dz > 0) c = dx === dz ? rc : dx > dz ? ((z & 1) ? m2 : m1) : ((x & 1) ? m2 : m1);
        else if (dz > 0) c = (x & 1) ? m2 : m1;
        else c = (z & 1) ? m2 : m1;
        if (j === 0 && trim && (x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1)) c = trim;
        t.set(x, y + j, z, c);
      }
  });
  if (upturn && out[0].x1 - out[0].x0 >= 8) {
    const r0 = out[0];
    for (const [x, z] of [[r0.x0, r0.z0], [r0.x1, r0.z0], [r0.x0, r0.z1], [r0.x1, r0.z1]])
      t.set(x, y + 1, z, trim || rc);
  }
  return y + out.length;
}

// ---------------------------------------------------------------------------
// 屋身
// ---------------------------------------------------------------------------

/**
 * 屋身：hx,hz 为半宽半深（柱网外沿），y 起始高度
 * o: {h, bay, porch: 'front'|'around'|'none'|'open', col, wall, door, band:true, dougong:false, lattice}
 * 返回屋身顶面 y
 */
export function body(t, hx, hz, y, o = {}) {
  const h = o.h ?? 3;
  const bay = o.bay ?? 2;
  const col = o.col ?? C.RED;
  const S = ST.cur;
  const wall = o.wall ?? S.wall;
  const door = o.door ?? C.DOOR;
  const lat = o.lattice ?? C.DOOR_G;
  const porch = o.porch ?? 'front';
  const isCol = (v, half) => ((v + half) % bay) === 0;
  const rows = h - 1;
  for (let k = 0; k < rows; k++) {
    const yy = y + k;
    const doorC = k === 0 && rows > 1 ? door : lat;
    if (porch === 'open') {
      // 亭、廊：只有柱子
      for (let x = -hx; x <= hx; x++) for (const z of [-hz, hz]) if (isCol(x, hx)) t.set(x, yy, z, col);
      for (let z = -hz; z <= hz; z++) for (const x of [-hx, hx]) if (isCol(z, hz)) t.set(x, yy, z, col);
      continue;
    }
    const ins = porch === 'around' ? 1 : 0;
    const fz = porch === 'front' || porch === 'around' ? hz - 1 : hz;
    // 柱廊外圈
    if (porch === 'front') for (let x = -hx; x <= hx; x++) if (isCol(x, hx)) t.set(x, yy, hz, col);
    if (porch === 'around') {
      for (let x = -hx; x <= hx; x++) for (const z of [-hz, hz]) if (isCol(x, hx)) t.set(x, yy, z, col);
      for (let z = -hz; z <= hz; z++) for (const x of [-hx, hx]) if (isCol(z, hz)) t.set(x, yy, z, col);
    }
    // 内圈墙体
    const ix = hx - ins, bz = -hz + ins;
    for (let z = bz; z <= fz; z++) {
      for (let x = -ix; x <= ix; x++) {
        const edgeX = x === -ix || x === ix;
        const front = z === fz, back = z === bz;
        if (!edgeX && !front && !back) { t.set(x, yy, z, C.DARK); continue; }
        let c = wall;
        if (front) c = isCol(x, hx) ? col : doorC;
        else if (back) c = isCol(x, hx) ? col : wall;
        else c = isCol(z, hz) ? col : wall;
        if (o.windowsAll && !front && k === rows - 1 && !c === col) c = lat;
        t.set(x, yy, z, c);
      }
    }
  }
  // 额枋彩画带
  const yb = y + rows;
  if (o.band !== false) {
    for (let z = -hz; z <= hz; z++)
      for (let x = -hx; x <= hx; x++) {
        const edge = x === -hx || x === hx || z === -hz || z === hz;
        if (!edge) { t.set(x, yb, z, C.DARK); continue; }
        const v = x === -hx || x === hx ? z + hz : x + hx;
        const seg = Math.floor(v / bay);
        let c = (seg & 1) ? C.CH_G : C.CH_B;
        if (S.band === 'zhubai') c = (v % 3 === 1) ? C.WALL_W : C.RED;          // 七朱八白
        else if (S.band === 'yuan') c = (seg & 1) ? C.CH_G : C.WT1;
        else if (S.band === 'hexi' && v % bay === 0) c = C.GOLD;               // 和玺：沥粉贴金
        t.set(x, yb, z, c);
      }
  } else {
    for (let z = -hz; z <= hz; z++) for (let x = -hx; x <= hx; x++) t.set(x, yb, z, wall);
  }
  let top = yb + 1;
  const dg = o.dougong === false ? 0 : S.dougong === 'big' ? ((o.dougong || hx >= 5) ? 2 : 0) : (o.dougong ? 1 : 0);
  for (let k = 0; k < dg; k++) {
    for (let z = -hz - k; z <= hz + k; z++)
      for (let x = -hx - k; x <= hx + k; x++) {
        const edge = x === -hx - k || x === hx + k || z === -hz - k || z === hz + k;
        let c = edge ? (((x + z + k) & 1) ? C.CH_D : C.CH_G) : C.DARK;
        if (edge && S.dougong === 'big') c = ((x + z + k) & 1) ? C.CH_D : (k ? C.RED : C.CH_G);
        if (edge && S.dougong === 'small' && ((x + z) % 4 === 0)) c = C.GOLD;
        t.set(x, top, z, c);
      }
    top++;
  }
  return top;
}

// ---------------------------------------------------------------------------
// 台基、栏杆、踏跺
// ---------------------------------------------------------------------------

/**
 * 多层台基
 * levels: [{x0,x1,z0,z1,h}]（自下而上），color, rail, stairs: [{x, w, side:'S'|'N'|'E'|'W', yulu}]
 * 返回顶面 y
 */
export function terrace(t, y0, levels, o = {}) {
  const color = o.color ?? C.MARBLE;
  const edge = o.edge ?? (color === C.MARBLE ? C.MARBLE_D : color);
  let y = y0;
  const tops = [];
  for (const L of levels) {
    for (let k = 0; k < L.h; k++)
      for (let z = L.z0; z <= L.z1; z++)
        for (let x = L.x0; x <= L.x1; x++) {
          const onEdge = x === L.x0 || x === L.x1 || z === L.z0 || z === L.z1;
          t.set(x, y + k, z, onEdge && k === 0 && L.h > 0 ? edge : color);
        }
    y += L.h;
    tops.push(y);
  }
  const top = y;
  const st = o.stairs || [];
  // 踏跺：从顶层边缘一路下到地面
  const topL = levels[levels.length - 1];
  for (const s of st) {
    const hw = Math.floor((s.w ?? 3) / 2);
    const H = top - y0;
    for (let k = 1; k < H + 1; k++) {
      const hh = top - k;
      for (let a = -hw; a <= hw; a++) {
        let x, z;
        if (s.side === 'S' || !s.side) { x = s.x + a; z = topL.z1 + k; }
        else if (s.side === 'N') { x = s.x + a; z = topL.z0 - k; }
        else if (s.side === 'E') { x = topL.x1 + k; z = s.x + a; }
        else { x = topL.x0 - k; z = s.x + a; }
        const c = s.yulu && a === 0 ? C.MARBLE_D : (o.stairColor ?? C.MARBLE);
        for (let yy = y0; yy < hh; yy++) if (!t.get(x, yy, z)) t.set(x, yy, z, c);
      }
    }
  }
  // 栏杆：隔格立望柱
  if (o.rail) {
    levels.forEach((L, i) => {
      const yy = tops[i];
      const inStair = (x, z) => st.some((s) => {
        const hw = Math.floor((s.w ?? 3) / 2) + 1;
        if (s.side === 'S' || !s.side) return z >= L.z1 - 0 && Math.abs(x - s.x) <= hw;
        if (s.side === 'N') return z <= L.z0 && Math.abs(x - s.x) <= hw;
        if (s.side === 'E') return x >= L.x1 && Math.abs(z - s.x) <= hw;
        return x <= L.x0 && Math.abs(z - s.x) <= hw;
      });
      for (let z = L.z0; z <= L.z1; z++)
        for (let x = L.x0; x <= L.x1; x++) {
          const onEdge = x === L.x0 || x === L.x1 || z === L.z0 || z === L.z1;
          if (!onEdge || ((x + z) & 1)) continue;
          if (inStair(x, z)) continue;
          if (!t.get(x, yy, z)) t.set(x, yy, z, o.railColor ?? C.MARBLE);
        }
    });
  }
  return top;
}

// ---------------------------------------------------------------------------
// 殿堂（单檐/重檐，带台基）
// ---------------------------------------------------------------------------

/**
 * o: {w,d 面阔/进深间数, bay, y, h 屋身高, porch, roof:type, eaves:1|2, tile, trim,
 *     base:{m,h,levels?,rail,stairs}, overhang, upperH, dougong, wen, finial}
 * 返回 {top, hx, hz, baseTop}
 */
export function hall(t, o) {
  const bay = o.bay ?? 2;
  const hx = (o.w * bay) / 2, hz = (o.d * bay) / 2;
  let y = o.y ?? 0;
  if (o.base) {
    const b = o.base;
    const levels = b.levels || [{ m: b.m ?? 2, h: b.h ?? 1 }];
    const L = levels.map((l) => ({
      x0: -hx - (l.mx ?? l.m), x1: hx + (l.mx ?? l.m),
      z0: -hz - (l.mzb ?? l.mz ?? l.m), z1: hz + (l.mz ?? l.m), h: l.h,
    }));
    const stairs = b.stairs ?? [{ x: 0, w: bay + 3, side: 'S', yulu: b.yulu }];
    y = terrace(t, y, L, { color: b.color, rail: b.rail, stairs, edge: b.edge });
  }
  const baseTop = y;
  const tile = typeof o.tile === 'string' ? TILE[o.tile] : (o.tile || TILE.yellow);
  const ov = (o.overhang ?? (o.w >= 7 ? 2 : 1)) + (o.overhang === 0 ? 0 : ST.cur.ovAdd) + (ST.cur.dougong === 'big' && (o.dougong || hx >= 5) ? 1 : 0);
  y = body(t, hx, hz, y, { h: o.h ?? 3, bay, porch: o.porch ?? 'front', dougong: o.dougong, col: o.col, wall: o.wall, door: o.door, band: o.band });
  let ux = hx, uz = hz;
  const eaves = o.eaves ?? 1;
  for (let e = 1; e < eaves; e++) {
    const inset = Array.isArray(o.upperInset) ? o.upperInset[e - 1] : (o.upperInset ?? 1);
    const nx = ux - inset, nz = uz - inset;
    y = eaveRing(t, { x0: -ux - ov, x1: ux + ov, z0: -uz - ov, z1: uz + ov }, { x0: -nx, x1: nx, z0: -nz, z1: nz }, y, tile, o.trim);
    ux = nx; uz = nz;
    // 上层屋身：楼阁层（有柱廊门窗）或走马板 + 彩画
    const uh = Array.isArray(o.upperH) ? o.upperH[e - 1] : (o.upperH ?? 2);
    const story = Array.isArray(o.stories) ? o.stories[e - 1] : false;
    if (story) y = body(t, ux, uz, y, { h: uh, bay, porch: story === true ? 'around' : story, col: o.col, wall: o.wall, door: o.door, dougong: o.dougong });
    else y = body(t, ux, uz, y, { h: uh, bay, porch: 'none', col: o.col, wall: o.upperWall ?? C.RED_D, door: o.upperWall ?? C.RED_D, lattice: o.upperWall ?? C.RED_D, dougong: o.dougong });
  }
  const rType = o.roof ?? 'wudian';
  const rov = o.roofOverhang ?? ov;
  const top = roof(t, {
    x0: -ux - rov, x1: ux + rov, z0: -uz - rov, z1: uz + rov, y,
    type: rType, tile, trim: o.trim, steps: o.steps, skirt: o.skirt, wen: o.wen, finial: o.finial,
    upturn: o.upturn, gable: o.gable, pearl: o.pearl,
  });
  return { top, hx, hz, baseTop };
}

// ---------------------------------------------------------------------------
// 圆形/八角形 攒尖（亭、祈年殿、皇穹宇）
// ---------------------------------------------------------------------------

export function inShape(shape, x, z, r) {
  if (shape === 'round') return x * x + z * z <= (r + 0.45) * (r + 0.45);
  if (shape === 'oct') return Math.abs(x) <= r && Math.abs(z) <= r && Math.abs(x) + Math.abs(z) <= Math.round(r * 1.42);
  return Math.abs(x) <= r && Math.abs(z) <= r;
}

function ringStripe(shape, x, z, m1, m2) {
  if (shape === 'round' || shape === 'oct') {
    const a = Math.atan2(z, x);
    const rr = Math.max(1, Math.round(Math.sqrt(x * x + z * z)));
    return (Math.floor(((a + Math.PI) / (2 * Math.PI)) * rr * 3) & 1) ? m2 : m1;
  }
  return Math.abs(z) >= Math.abs(x) ? ((x & 1) ? m2 : m1) : ((z & 1) ? m2 : m1);
}

// 圆/八角/方 攒尖屋顶，r 为檐口半径
export function coneRoof(t, shape, r, y, tile, o = {}) {
  const [m1, m2, rc] = tile;
  const steps = o.steps || (r >= 6 ? [2, 1] : [1]);
  let rr = r, i = 0;
  while (rr >= 0) {
    const s = steps[i] ?? 1;
    const nr = rr - s;
    for (let z = -rr - 1; z <= rr + 1; z++)
      for (let x = -rr - 1; x <= rr + 1; x++) {
        if (!inShape(shape, x, z, rr)) continue;
        const exposed = nr < 0 || !inShape(shape, x, z, nr);
        let c = exposed ? ringStripe(shape, x, z, m1, m2) : m1;
        if (shape === 'square' && exposed && Math.abs(x) === Math.abs(z)) c = rc;
        if (i === 0 && o.trim && !inShape(shape, x, z, rr - 1)) c = o.trim;
        t.set(x, y, z, c);
      }
    y++; i++;
    if (rr === 0) break;
    rr = Math.max(0, nr);
  }
  const fh = o.finial ?? 2;
  for (let k = 0; k < fh; k++) t.set(0, y + k, 0, C.GOLD);
  if (o.upturn !== false && shape !== 'round') {
    const pts = shape === 'square' ? [[r, r], [-r, r], [r, -r], [-r, -r]] : [];
    for (const [x, z] of pts) t.set(x, y - i + 1, z, o.trim || rc);
  }
  return y + fh;
}

// 圆形/八角/方 屋身
export function roundBody(t, shape, r, y, h, o = {}) {
  const col = o.col ?? C.RED, wall = o.wall ?? C.DOOR_G;
  for (let k = 0; k < h; k++) {
    const isBand = k === h - 1 && o.band !== false;
    for (let z = -r; z <= r; z++)
      for (let x = -r; x <= r; x++) {
        if (!inShape(shape, x, z, r)) continue;
        const edge = !inShape(shape, x, z, r - 1) ||
          !inShape(shape, x + 1, z, r) || !inShape(shape, x - 1, z, r) || !inShape(shape, x, z + 1, r) || !inShape(shape, x, z - 1, r);
        if (!edge) { t.set(x, y + k, z, C.DARK); continue; }
        let c;
        if (isBand) c = ((x + z) & 1) ? C.CH_G : C.CH_B;
        else if (o.open) { if (((x + z) & 1) === 0) c = col; else continue; }
        else c = ((x + z) & 1) ? wall : col;
        t.set(x, y + k, z, c);
      }
  }
  return y + h;
}

// 圆/八角/方 下檐环
export function coneRing(t, shape, rOut, rIn, y, tile, trim) {
  const [m1, m2] = tile;
  let rr = rOut, j = 0;
  while (rr > rIn) {
    const nr = Math.max(rIn, rr - (j === 0 ? 2 : 1));
    for (let z = -rr; z <= rr; z++)
      for (let x = -rr; x <= rr; x++) {
        if (!inShape(shape, x, z, rr)) continue;
        const exposed = !inShape(shape, x, z, nr);
        let c = exposed ? ringStripe(shape, x, z, m1, m2) : C.DARK;
        if (j === 0 && trim && !inShape(shape, x, z, rr - 1)) c = trim;
        t.set(x, y + j, z, c);
      }
    j++;
    rr = nr;
  }
  return y + j;
}

/**
 * 亭 / 圆殿：o {shape, r 柱网半径, y, h, eaves, tiles:[...每层瓦色], open, base}
 */
export function pavilion(t, o) {
  const shape = o.shape || 'square';
  let y = o.y ?? 0;
  const r = o.r;
  if (o.base) {
    const b = o.base;
    for (let k = 0; k < (b.h ?? 1); k++)
      for (let z = -r - b.m; z <= r + b.m; z++)
        for (let x = -r - b.m; x <= r + b.m; x++)
          if (inShape(shape === 'oct' ? 'oct' : shape, x, z, r + b.m)) t.set(x, y + k, z, b.color ?? C.MARBLE);
    y += b.h ?? 1;
  }
  const eaves = o.eaves ?? 1;
  const tiles = o.tiles || [TILE.yellow];
  let rr = r;
  y = roundBody(t, shape, rr, y, o.h ?? 3, { open: o.open, col: o.col, wall: o.wall });
  for (let e = 1; e < eaves; e++) {
    const tl = tiles[Math.min(e - 1, tiles.length - 1)];
    const nr = rr - (o.inset ?? 1);
    y = coneRing(t, shape, rr + (o.overhang ?? 1) + (e === 1 ? 0 : 0), nr, y, tl, o.trims ? o.trims[e - 1] : o.trim);
    rr = nr;
    y = roundBody(t, shape, rr, y, o.upperH ?? 2, { open: false, col: o.col, wall: o.upperWall ?? C.RED_D });
  }
  const tl = tiles[Math.min(eaves - 1, tiles.length - 1)];
  return coneRoof(t, shape, rr + (o.overhang ?? 1), y, tl, { trim: o.trims ? o.trims[eaves - 1] : o.trim, finial: o.finial, steps: o.steps });
}

// ---------------------------------------------------------------------------
// 城台（带券门）
// ---------------------------------------------------------------------------

/**
 * o: {x0,x1,z0,z1,y,h,color, base (须弥座颜色), arches:[{x,w,h}], parapet:'crenel'|'low'|'none',
 *     doorColor, axis:'z'|'x'}
 */
export function chengtai(t, o) {
  const y0 = o.y ?? 0;
  const col = o.color ?? C.RED_WALL;
  for (let y = y0; y < y0 + o.h; y++)
    for (let z = o.z0; z <= o.z1; z++)
      for (let x = o.x0; x <= o.x1; x++) {
        let c = col;
        if (o.base && y === y0) c = o.base;
        t.set(x, y, z, c);
      }
  const rectOpen = (o.opening ?? ST.cur.opening) === 'rect';
  const doorC = o.doorColor === C.RED_D ? C.GATE : o.doorColor;
  for (const a of o.arches || []) {
    const hw = Math.floor(a.w / 2);
    for (let y = y0; y < y0 + a.h; y++) {
      const narrow = !rectOpen && y === y0 + a.h - 1 && a.w >= 3 ? 1 : 0;
      for (let dx = -hw + narrow; dx <= hw - narrow; dx++) {
        if (o.axis === 'x') {
          for (let x = o.x0; x <= o.x1; x++) t.set(x, y, a.x + dx, 0);
        } else {
          for (let z = o.z0; z <= o.z1; z++) t.set(a.x + dx, y, z, 0);
        }
      }
      // 门扇
      if (doorC) {
        for (let dx = -hw + narrow; dx <= hw - narrow; dx++) {
          if (o.axis === 'x') t.set(Math.round((o.x0 + o.x1) / 2), y, a.x + dx, doorC);
          else t.set(a.x + dx, y, Math.round((o.z0 + o.z1) / 2), doorC);
        }
      }
    }
    // 过梁式门道：门洞顶部露出木过梁
    if (rectOpen) {
      for (let dx = -hw; dx <= hw; dx++) {
        if (o.axis === 'x') { if (t.get(o.x0, y0 + a.h, a.x + dx)) { t.set(o.x0, y0 + a.h, a.x + dx, C.WOOD_D); t.set(o.x1, y0 + a.h, a.x + dx, C.WOOD_D); } }
        else if (t.get(a.x + dx, y0 + a.h, o.z1)) { t.set(a.x + dx, y0 + a.h, o.z1, C.WOOD_D); t.set(a.x + dx, y0 + a.h, o.z0, C.WOOD_D); }
      }
    }
  }
  const yt = y0 + o.h;
  if (o.topColor)
    for (let z = o.z0 + 1; z < o.z1; z++)
      for (let x = o.x0 + 1; x < o.x1; x++) if (t.get(x, yt - 1, z)) t.set(x, yt - 1, z, o.topColor);
  if (o.skirt) {
    // 平座腰檐：城台顶沿外挑一圈瓦
    const [m1, m2] = o.skirt;
    for (let z = o.z0 - 1; z <= o.z1 + 1; z++)
      for (let x = o.x0 - 1; x <= o.x1 + 1; x++) {
        const edge = x === o.x0 - 1 || x === o.x1 + 1 || z === o.z0 - 1 || z === o.z1 + 1;
        if (edge) t.set(x, yt - 1, z, ((x + z) & 1) ? m2 : m1);
      }
  }
  const par = o.parapet ?? 'low';
  if (par !== 'none') {
    const pc = o.parapetColor ?? col;
    for (let z = o.z0; z <= o.z1; z++)
      for (let x = o.x0; x <= o.x1; x++) {
        const edge = x === o.x0 || x === o.x1 || z === o.z0 || z === o.z1;
        if (!edge) continue;
        if (par === 'crenel') {
          const outer = o.outer ?? 'S';
          const isOuter = (outer === 'S' && z === o.z1) || (outer === 'N' && z === o.z0) || (outer === 'E' && x === o.x1) || (outer === 'W' && x === o.x0);
          if (isOuter && ((x + z) & 1)) continue;
        }
        t.set(x, yt, z, pc);
      }
  }
  return yt;
}

// ---------------------------------------------------------------------------
// 墙体
// ---------------------------------------------------------------------------

// 直墙段（轴向），out 为外侧方向 'N'|'S'|'E'|'W'
export function brickWall(t, ax, az, bx, bz, o = {}) {
  const th = o.thick ?? 5, h = o.h ?? 4;
  const col = o.color ?? C.BRICK, top = o.top ?? C.BRICK_L;
  const horiz = az === bz;
  const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
  const half = Math.floor(th / 2);
  const X0 = horiz ? x0 : x0 - half, X1 = horiz ? x1 : x0 - half + th - 1;
  const Z0 = horiz ? z0 - half : z0, Z1 = horiz ? z0 - half + th - 1 : z1;
  for (let y = 0; y < h; y++)
    for (let z = Z0; z <= Z1; z++)
      for (let x = X0; x <= X1; x++) {
        let c = y === h - 1 ? top : col;
        if (y < h - 1 && hash3(x >> 1, y, z >> 1) < 0.12) c = o.alt ?? C.BRICK_D;
        if (!o.skip || !o.skip(x, z)) t.set(x, y, z, c);
      }
  // 垛口 + 宇墙
  if (o.crenel !== false) {
    const out = o.out;
    for (let z = Z0; z <= Z1; z++)
      for (let x = X0; x <= X1; x++) {
        if (o.skip && o.skip(x, z)) continue;
        let isOut = false, isIn = false;
        if (horiz) { isOut = (out === 'S' && z === Z1) || (out === 'N' && z === Z0); isIn = (out === 'S' && z === Z0) || (out === 'N' && z === Z1); }
        else { isOut = (out === 'E' && x === X1) || (out === 'W' && x === X0); isIn = (out === 'E' && x === X0) || (out === 'W' && x === X1); }
        if (isOut && !((x + z) & 1)) t.set(x, h, z, col);
        if (isIn && o.inner !== false && !((x + z) & 1) && hash3(x, 9, z) < 0.0) t.set(x, h, z, col);
      }
  }
  // 马面
  if (o.mamian) {
    const step = o.mamian;
    const len = horiz ? x1 - x0 : z1 - z0;
    for (let s = step / 2; s < len - 3; s += step) {
      const p = (horiz ? x0 : z0) + Math.round(s);
      for (let y = 0; y < h; y++)
        for (let a = -1; a <= 1; a++)
          for (let b = 1; b <= 2; b++) {
            let x, z;
            if (horiz) { x = p + a; z = o.out === 'S' ? Z1 + b : Z0 - b; }
            else { z = p + a; x = o.out === 'E' ? X1 + b : X0 - b; }
            if (o.skip && o.skip(x, z)) continue;
            t.set(x, y, z, y === h - 1 ? top : col);
            if (y === h - 1 && ((x + z) & 1) === 0 && b === 2) t.set(x, h, z, col);
          }
    }
  }
}

// 元大都夯土墙：梯形断面
export function earthWall(t, ax, az, bx, bz, o = {}) {
  const th = o.thick ?? 6, h = o.h ?? 4;
  const horiz = az === bz;
  const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
  const half = Math.floor(th / 2);
  for (let y = 0; y < h; y++) {
    const ins = Math.floor(y * (th - 2) / 2 / Math.max(1, h - 1));
    for (let a = -half + ins; a <= -half + th - 1 - ins; a++) {
      if (horiz) {
        for (let x = x0; x <= x1; x++) {
          if (o.skip && o.skip(x, z0 + a)) continue;
          const r = hash3(x, y, z0 + a);
          t.set(x, y, z0 + a, r < 0.2 ? C.EARTH_D : r > 0.85 ? C.EARTH_L : C.EARTH);
        }
      } else {
        for (let z = z0; z <= z1; z++) {
          if (o.skip && o.skip(x0 + a, z)) continue;
          const r = hash3(x0 + a, y, z);
          t.set(x0 + a, y, z, r < 0.2 ? C.EARTH_D : r > 0.85 ? C.EARTH_L : C.EARTH);
        }
      }
    }
  }
}

// 红色宫墙 / 皇城墙：o {h, thick, cap}
export function redWall(t, ax, az, bx, bz, o = {}) {
  const h = o.h ?? 3, th = o.thick ?? 2;
  const cap = o.cap ?? C.Y2;
  const horiz = az === bz;
  const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
  for (let y = 0; y <= h; y++)
    for (let a = 0; a < th; a++) {
      if (horiz) for (let x = x0; x <= x1; x++) { if (!o.skip || !o.skip(x, z0 + a)) t.set(x, (o.y ?? 0) + y, z0 + a, y === h ? cap : (o.color ?? C.RED_WALL)); }
      else for (let z = z0; z <= z1; z++) { if (!o.skip || !o.skip(x0 + a, z)) t.set(x0 + a, (o.y ?? 0) + y, z, y === h ? cap : (o.color ?? C.RED_WALL)); }
    }
}

// 矩形院墙
export function enclosure(t, x0, z0, x1, z1, o = {}) {
  const th = o.thick ?? 1;
  const f = o.kind === 'earth' ? earthWall : o.kind === 'brick' ? brickWall : redWall;
  const gaps = o.gaps || [];
  const skip = (x, z) => gaps.some((g) => x >= g[0] && x <= g[2] && z >= g[1] && z <= g[3]);
  const oo = { ...o, thick: th, skip };
  f(t, x0, z0, x1, z0, { ...oo, out: 'N' });
  f(t, x0, z1 - th + 1, x1, z1 - th + 1, { ...oo, out: 'S' });
  f(t, x0, z0, x0, z1, { ...oo, out: 'W' });
  f(t, x1 - th + 1, z0, x1 - th + 1, z1, { ...oo, out: 'E' });
}

// ---------------------------------------------------------------------------
// 树木
// ---------------------------------------------------------------------------

function localRng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let q = Math.imul(a ^ (a >>> 15), 1 | a);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}

export function tree(t, x, y, z, kind, r) {
  const rnd = r || localRng(x * 73856093 ^ z * 19349663 ^ y * 83492791);
  if (kind === 'cypress') {
    const h = 5 + Math.floor(rnd() * 3);
    const a = rnd() < 0.5 ? C.CYP1 : C.CYP2, b = a === C.CYP1 ? C.CYP2 : C.CYP1;
    const pick = () => (rnd() < 0.82 ? a : b);
    t.set(x, y, z, C.TRUNK);
    for (let k = 1; k <= h; k++) {
      t.set(x, y + k, z, pick());
      if (k >= 2 && k <= h - 1) {
        t.set(x + 1, y + k, z, pick());
        t.set(x - 1, y + k, z, pick());
        t.set(x, y + k, z + 1, pick());
        t.set(x, y + k, z - 1, pick());
      }
    }
    return;
  }
  if (kind === 'small') {
    t.set(x, y, z, C.TRUNK);
    t.set(x, y + 1, z, C.LEAF2);
    t.set(x + 1, y + 1, z, C.LEAF1); t.set(x - 1, y + 1, z, C.LEAF3);
    t.set(x, y + 1, z + 1, C.LEAF2); t.set(x, y + 1, z - 1, C.LEAF1);
    t.set(x, y + 2, z, C.LEAF3);
    return;
  }
  if (kind === 'pine') {
    const h = 2;
    for (let k = 0; k < h; k++) t.set(x, y + k, z, C.TRUNK);
    const layers = [2, 1, 2, 1, 0];
    layers.forEach((rr, i) => {
      for (let dz = -rr; dz <= rr; dz++)
        for (let dx = -rr; dx <= rr; dx++)
          if (Math.abs(dx) + Math.abs(dz) <= rr + (rr > 1 ? 1 : 0)) t.set(x + dx, y + h + i, z + dz, rnd() < 0.5 ? C.CYP1 : C.LEAF1);
    });
    return;
  }
  // 圆冠：round / willow / ginkgo / blossom —— 每棵树一个主色，少量邻近色
  const pal = kind === 'willow' ? [C.WILLOW, C.WILLOW2]
    : kind === 'ginkgo' ? [C.GINKGO, C.LEAF3]
      : kind === 'blossom' ? [C.BLOSSOM, C.WHITE]
        : [[C.LEAF1, C.LEAF2], [C.LEAF2, C.LEAF3], [C.LEAF2, C.LEAF1]][Math.floor(rnd() * 3)];
  const pick = () => (rnd() < 0.8 ? pal[0] : pal[1]);
  const th = kind === 'willow' ? 2 : 2 + Math.floor(rnd() * 2);
  for (let k = 0; k < th; k++) t.set(x, y + k, z, C.TRUNK);
  const R = 2;
  const cy = y + th + 1;
  for (let dy = -1; dy <= 2; dy++)
    for (let dz = -R; dz <= R; dz++)
      for (let dx = -R; dx <= R; dx++) {
        const d = dx * dx + dz * dz + (dy - 0.3) * (dy - 0.3) * 1.6;
        if (d > R * R + 0.8) continue;
        if (d > R * R - 1 && rnd() < 0.08) continue;
        t.set(x + dx, cy + dy, z + dz, pick());
      }
  if (kind === 'willow') {
    for (let dz = -R; dz <= R; dz++)
      for (let dx = -R; dx <= R; dx++)
        if (Math.abs(dx) === R || Math.abs(dz) === R) if (rnd() < 0.45) t.set(x + dx, cy - 2, z + dz, pal[1]);
  }
}

// 散布树木：在矩形内按密度随机种树，ok(x,z) 过滤
export function scatterTrees(w, x0, z0, x1, z1, density, kinds, r, ok) {
  for (let z = z0; z <= z1; z += 3)
    for (let x = x0; x <= x1; x += 3) {
      if (r() > density) continue;
      const tx = x + Math.floor(r() * 3), tz = z + Math.floor(r() * 3);
      if (ok && !ok(tx, tz)) continue;
      if (w.height(tx, tz) >= 0) continue;
      const k = kinds[Math.floor(r() * kinds.length)];
      tree(w, tx, 0, tz, k, r);
    }
}

// 行道树
export function treeRow(w, ax, az, bx, bz, step, kind, r) {
  const len = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
  for (let s = 0; s <= len; s += step) {
    const x = Math.round(ax + (bx - ax) * (s / len || 0));
    const z = Math.round(az + (bz - az) * (s / len || 0));
    if (w.height(x, z) >= 0) continue;
    tree(w, x, 0, z, kind, r);
  }
}

// ---------------------------------------------------------------------------
// 桥、华表、牌楼、石狮
// ---------------------------------------------------------------------------

// 拱桥：沿 z 方向（dir='z'）或 x 方向
export function archBridge(t, cx, cz, len, w, o = {}) {
  const dir = o.dir ?? 'z';
  const col = o.color ?? C.MARBLE;
  const hl = Math.floor(len / 2), hw = Math.floor(w / 2);
  const peak = o.peak ?? 1;
  for (let s = -hl; s <= hl; s++) {
    const hgt = Math.max(0, Math.round(peak * (1 - Math.abs(s) / (hl + 0.5)) + 0.2));
    for (let a = -hw; a <= hw; a++) {
      const x = dir === 'z' ? cx + a : cx + s;
      const z = dir === 'z' ? cz + s : cz + a;
      for (let y = 0; y <= hgt - 1; y++) t.set(x, y, z, col);
      if ((a === -hw || a === hw) && o.rail !== false && ((s & 1) === 0)) t.set(x, hgt, z, col);
      if (hgt === 0) t.set(x, 0, z, (a === -hw || a === hw) && o.rail !== false ? col : 0);
    }
  }
}

// 华表
export function huabiao(t, x, z, y = 0) {
  t.set(x, y, z, C.MARBLE_D);
  for (let k = 1; k <= 4; k++) t.set(x, y + k, z, C.MARBLE);
  t.set(x - 1, y + 4, z, C.MARBLE); t.set(x + 1, y + 4, z, C.MARBLE); // 云板
  t.set(x, y + 5, z, C.MARBLE_D);
}

// 石狮
export function lion(t, x, z, y = 0) {
  t.set(x, y, z, C.MARBLE_D);
  t.set(x, y + 1, z, C.GRANITE_D);
}

// 宫殿陈设（1 格约 2.4 米，近景细模里再细化形状）：
// lion 铜狮（gilt 为鎏金）、crane 铜鹤、turtle 铜龟、ding 鼎式铜炉、rigui 日晷、jialiang 嘉量
export function furnish(t, kind, x, z, y = 0, o = {}) {
  switch (kind) {
    case 'lion':
      t.set(x, y, z, C.MARBLE_D);
      t.set(x, y + 1, z, o.gilt ? C.GILT : C.BRONZE);
      t.set(x, y + 2, z, o.gilt ? C.GILT : C.BRONZE_D);
      break;
    case 'crane':
      t.set(x, y, z, C.MARBLE_D);
      t.set(x, y + 1, z, C.BRONZE_D);
      t.set(x, y + 2, z, C.BRONZE);
      break;
    case 'turtle':
      t.set(x, y, z, C.MARBLE_D);
      t.set(x, y + 1, z, C.BRONZE);
      break;
    case 'ding':
      t.set(x, y, z, C.BRONZE_D);
      break;
    case 'rigui':
      t.set(x, y, z, C.MARBLE);
      t.set(x, y + 1, z, C.DIAL);
      break;
    case 'jialiang':
      t.set(x, y, z, C.MARBLE);
      t.set(x, y + 1, z, C.BRONZE);
      t.set(x, y + 2, z, C.MARBLE_D);
      break;
  }
}

// 牌楼（冲天柱/庑殿顶），沿 x 展开，n 间
export function paifang(t, cx, cz, n, o = {}) {
  const span = o.span ?? 3;
  const W = n * span;
  const x0 = cx - Math.floor(W / 2);
  const h = o.h ?? 4;
  const tile = o.tile || TILE.green;
  const col = o.col ?? C.RED;
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * span;
    for (let y = 0; y < h; y++) t.set(x, y, cz, col);
    t.set(x, 0, cz - 1, C.MARBLE_D); t.set(x, 0, cz + 1, C.MARBLE_D);
  }
  for (let i = 0; i < n; i++) {
    const mid = i === Math.floor(n / 2);
    const bx0 = x0 + i * span, bx1 = bx0 + span;
    const yy = h - (mid ? 0 : 1);
    for (let x = bx0; x <= bx1; x++) t.set(x, yy - 1, cz, (x & 1) ? C.CH_B : C.CH_G);
    for (let x = bx0 - (i === 0 ? 1 : 0); x <= bx1 + (i === n - 1 ? 1 : 0); x++) {
      t.set(x, yy, cz, tile[0]);
      t.set(x, yy, cz - 1, tile[1]); t.set(x, yy, cz + 1, tile[1]);
      t.set(x, yy + 1, cz, tile[2]);
    }
  }
}

// 灯笼（夜间发光）
export function lantern(t, x, y, z) { t.set(x, y, z, C.LANTERN); }
