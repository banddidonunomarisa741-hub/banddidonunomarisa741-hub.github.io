// 朝代建筑“语法”：同一套构件，按朝代换屋面坡度、出檐、斗拱、彩画、瓦色和屋脊装饰。
// 依据：宋《营造法式》“举折”平缓、斗拱硕大；清《工程做法》“举架”陡峭、斗拱缩小；
// 元代宫殿“覆以白磁瓦，碧琉璃饰其檐脊”；明代琉璃色偏深橙，清代偏明黄。
import { C } from './palette.js';

const map = (o) => {
  const r = new Uint8Array(256);
  for (let i = 0; i < 256; i++) r[i] = i;
  for (const [a, b] of Object.entries(o)) r[C[a]] = C[b];
  return r;
};

export const STYLES = {
  jin: {
    key: 'jin', name: '宋金式',
    remap: map({ Y1: 'JG1', Y2: 'JG2', Y3: 'JG3', G1: 'JG1', G2: 'JG2', G3: 'JG3' }),
    steps: (d) => (d >= 11 ? [3, 2, 2, 2] : d >= 7 ? [2, 2, 2] : [2]),
    ovAdd: 1,          // 出檐深远
    dougong: 'big',    // 斗拱硕大（两层）
    band: 'zhubai',    // 七朱八白
    wall: C.WALL_W,    // 朱柱粉壁
    ridge: 'chiwei',   // 鸱尾
    opening: 'rect',   // 过梁式门道
    upturn: false,
  },
  yuan: {
    key: 'yuan', name: '元式',
    remap: map({}),
    steps: (d) => (d >= 11 ? [2, 2, 1] : d >= 7 ? [2, 1] : [1]),
    ovAdd: 0, dougong: 'mid', band: 'yuan', wall: C.RED_D, ridge: 'wen', opening: 'rect', upturn: true,
  },
  ming: {
    key: 'ming', name: '明式',
    remap: map({ Y1: 'YM1', Y2: 'YM2', Y3: 'YM3' }),
    steps: (d) => (d >= 11 ? [2, 2, 2, 1] : d >= 7 ? [2, 2, 1] : [1]),
    ovAdd: 0, dougong: 'mid', band: 'xuanzi', wall: C.RED_D, ridge: 'wen', opening: 'arch', upturn: true,
  },
  qing: {
    key: 'qing', name: '清式',
    remap: map({}),
    steps: (d) => (d >= 7 ? [2, 1] : [1]),
    ovAdd: 0, dougong: 'small', band: 'hexi', wall: C.RED_D, ridge: 'wen2', opening: 'arch', upturn: 2,
  },
};
STYLES.modern = { ...STYLES.qing, key: 'modern' };
STYLES.map = { ...STYLES.qing, key: 'map' };

export const ST = { cur: STYLES.qing };
export function setStyle(key) { ST.cur = STYLES[key] || STYLES.qing; }
export function withStyle(key, fn) {
  const prev = ST.cur;
  setStyle(key);
  try { return fn(); } finally { ST.cur = prev; }
}
