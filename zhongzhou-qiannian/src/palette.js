// 体素调色板：编号 → 颜色。颜色直接按 sRGB 数值使用（渲染端关闭了色彩管理）。
// n：每个体素的随机明度扰动幅度；glow：夜间自发光。

const DEFS = [
  // 名称          颜色        扰动   夜间发光
  ['RED',        '#b5392b', 0.035],
  ['RED_D',      '#8f2c22', 0.035],
  ['RED_WALL',   '#ad3a2c', 0.03],
  ['DOOR',       '#6f2b1f', 0.03],
  ['DOOR_G',     '#c8963c', 0.03],
  ['GOLD',       '#e9bb3f', 0.04],
  ['GOLD_D',     '#b98a26', 0.04],

  ['Y1',         '#f0b330', 0.025],   // 黄琉璃瓦
  ['Y2',         '#d8951f', 0.025],
  ['Y3',         '#bf7d18', 0.025],
  ['G1',         '#3f9a63', 0.025],   // 绿琉璃瓦
  ['G2',         '#2f7d4f', 0.025],
  ['G3',         '#256a42', 0.025],
  ['B1',         '#3366b5', 0.025],   // 蓝琉璃瓦（天坛）
  ['B2',         '#26519a', 0.025],
  ['B3',         '#1d3f7a', 0.025],
  ['GR1',        '#6d727b', 0.03],    // 灰筒瓦
  ['GR2',        '#5a5f68', 0.03],
  ['GR3',        '#474b53', 0.03],
  ['BK1',        '#3e4149', 0.03],    // 黑琉璃瓦
  ['BK2',        '#30333a', 0.03],
  ['PURPLE',     '#7b4a86', 0.03],
  ['TEAL',       '#2c8c94', 0.025],   // 孔雀蓝琉璃
  // 明代黄琉璃：色偏深、偏橙
  ['YM1',        '#e09a2a', 0.025],
  ['YM2',        '#c47f1c', 0.025],
  ['YM3',        '#a46714', 0.025],
  // 金代绿琉璃：偏青、偏深
  ['JG1',        '#3e8f78', 0.025],
  ['JG2',        '#2e735f', 0.025],
  ['JG3',        '#22594a', 0.025],
  ['CHIWEI',     '#2c4f45', 0.02],    // 金代鸱尾
  // 元代白琉璃（“覆以白磁瓦”）
  ['WT1',        '#f1efe8', 0.02],
  ['WT2',        '#dcd8cc', 0.02],
  ['WALL_W',     '#ece4d2', 0.03],    // 宋金粉壁
  ['GATE',       '#922d22', 0.03],    // 城门门扇（细部加门钉）
  ['BRIDGE',     '#c9c3b5', 0.03],    // 石桥桥面

  ['CH_B',       '#2f6c90', 0.03],    // 彩画 青
  ['CH_G',       '#2f8a72', 0.03],    // 彩画 绿
  ['CH_D',       '#243a4c', 0.03],    // 斗拱阴影

  ['MARBLE',     '#efebe1', 0.02],    // 汉白玉
  ['MARBLE_D',   '#d6d0c2', 0.02],
  ['BRICK',      '#908d87', 0.05],    // 城砖
  ['BRICK_D',    '#7a7771', 0.05],
  ['BRICK_L',    '#a7a49d', 0.05],
  ['PAVE',       '#aaa69d', 0.04],
  ['EARTH',      '#bb9b6b', 0.07],    // 夯土
  ['EARTH_D',    '#a1835a', 0.07],
  ['EARTH_L',    '#cdb084', 0.06],
  ['WOOD',       '#8b5a3c', 0.04],
  ['WOOD_D',     '#6a432b', 0.04],
  ['WOOD_L',     '#a8744c', 0.04],

  ['LEAF1',      '#3e7c48', 0.04],
  ['LEAF2',      '#4a8b50', 0.04],
  ['LEAF3',      '#5b9b58', 0.04],
  ['CYP1',       '#35684b', 0.04],    // 柏
  ['CYP2',       '#2b5840', 0.04],
  ['WILLOW',     '#7fb467', 0.04],
  ['WILLOW2',    '#6ba65b', 0.04],
  ['TRUNK',      '#5e4131', 0.05],
  ['BLOSSOM',    '#f2aac0', 0.04],
  ['GINKGO',     '#e7c449', 0.07],

  ['WHITE',      '#f4f1e9', 0.02],
  ['FELT',       '#ede6d4', 0.03],    // 毡帐
  ['FELT_B',     '#3b6fa8', 0.03],
  ['DARK',       '#2b2521', 0.02],    // 门洞、箭窗
  ['WATER_V',    '#4d8fb8', 0.02],

  ['GRANITE',    '#cfc8ba', 0.025],
  ['GRANITE_D',  '#b5ad9d', 0.025],
  ['CONCRETE',   '#d8d2c6', 0.02],
  ['GLASS',      '#7f9cb2', 0.02],
  ['GLASS_D',    '#5d7a91', 0.02],
  ['FLAG',       '#d62b1f', 0.02],
  ['STEEL',      '#9aa1a8', 0.02],
  ['LOTUS_P',    '#f07fa8', 0.04],   // 荷花
  ['LOTUS_L',    '#4f9a5a', 0.04],   // 荷叶
  ['BOAT',       '#7a5234', 0.04],
  ['SAIL',       '#ebe3cf', 0.03],
  ['BUS',        '#c8462e', 0.02],
  ['BRONZE',     '#5e6a52', 0.03],   // 铜狮、铜龟、铜鹤、鼎炉（铜绿）
  ['BRONZE_D',   '#46503f', 0.03],
  ['GILT',       '#d9a93a', 0.03],   // 鎏金铜狮
  ['DIAL',       '#e4ded1', 0.01],   // 日晷晷盘

  ['LAMP',       '#ffd27a', 0.0, true],   // 灯（夜间发光）
  ['LANTERN',    '#e8452c', 0.0, true],   // 红灯笼
  ['WINDOW',     '#ffc76b', 0.0, true],   // 亮窗
  ['ROOF_LIGHT', '#fff1c4', 0.0, true],
];

export const C = {};          // 名称 → 编号
export const COLORS = [[0, 0, 0]]; // 编号 → [r,g,b] 0..1
export const NOISE = [0];
export const GLOW = [0];

DEFS.forEach(([name, hex, n, glow], i) => {
  const id = i + 1;
  C[name] = id;
  const v = parseInt(hex.slice(1), 16);
  COLORS[id] = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  NOISE[id] = n;
  GLOW[id] = glow ? 1 : 0;
});

// 屋面瓦色组：[主色, 间色, 脊色]
export const TILE = {
  yellow: [C.Y1, C.Y2, C.Y3],
  green: [C.G1, C.G2, C.G3],
  blue: [C.B1, C.B2, C.B3],
  grey: [C.GR1, C.GR2, C.GR3],
  black: [C.BK1, C.BK2, C.BK2],
  teal: [C.TEAL, C.B2, C.B3],
  felt: [C.FELT, C.WHITE, C.FELT_B],
  // 元代宫殿：“覆以白磁瓦，碧琉璃饰其檐脊”（《南村辍耕录·宫阙制度》）
  yuan: [C.WT1, C.WT2, C.G2],
  ming: [C.YM1, C.YM2, C.YM3],
  jin: [C.JG1, C.JG2, C.JG3],
  greyGreen: [C.GR1, C.GR2, C.G2],
  blackGreen: [C.BK1, C.BK2, C.G2],
};

// 体素标记位（与颜色编号一起存进 Uint16）
export const F_AXIS = 1 << 8;     // 中轴线上的建筑
export const F_CHANGE = 1 << 9;   // 本时期新建/改建
export const COLOR_MASK = 0xff;
export const HERO_SHIFT = 10;      // 第 10—15 位：重点建筑编号（近景细模）
export const HERO_MASK = 0x3f << HERO_SHIFT;

// 屋面瓦色（用于细模的屋面平滑与瓦垄）
export const ROOF_TILES = new Set([
  C.Y1, C.Y2, C.Y3, C.YM1, C.YM2, C.YM3, C.G1, C.G2, C.G3, C.JG1, C.JG2, C.JG3,
  C.B1, C.B2, C.B3, C.GR1, C.GR2, C.GR3, C.BK1, C.BK2, C.TEAL, C.WT1, C.WT2,
]);
// 瓦垄暗色：主色 → 间色 → 脊色
export const TILE_DARK = {};
for (const t of [[C.Y1, C.Y2, C.Y3], [C.YM1, C.YM2, C.YM3], [C.G1, C.G2, C.G3], [C.JG1, C.JG2, C.JG3], [C.B1, C.B2, C.B3],
  [C.GR1, C.GR2, C.GR3], [C.BK1, C.BK2, C.BK2], [C.WT1, C.WT2, C.MARBLE_D], [C.TEAL, C.B2, C.B3]]) {
  TILE_DARK[t[0]] = t[1];
  TILE_DARK[t[1]] = t[2];
}
