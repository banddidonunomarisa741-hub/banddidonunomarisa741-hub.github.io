// 生成 photos/README.md：每一站的照片文件名与建议机位（node tools/photo-list.mjs）
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { STOPS, routesFor } from '../src/tourdata.js';
import { nameOf } from '../src/info.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ids = [];
for (const era of ['qing', 'modern']) for (const r of routesFor(era, [])) for (const p of r.parts) for (const id of p.stops) if (!ids.includes(id)) ids.push(id);

const rows = ids.map((id) => {
  const eras = ['qing', 'modern'].filter((e) => routesFor(e, []).some((r) => r.parts.some((p) => p.stops.includes(id))));
  const name = nameOf(id, eras.includes('qing') ? 'qing' : 'modern') || id;
  const used = eras.map((e) => (e === 'qing' ? '清' : '今')).join('、');
  return `| ${name} | \`${id}.jpg\` | ${STOPS[id].shot} | ${used} |`;
});

const md = `# 实拍照片

导览走到每一站时，右侧卡片（手机为底部）显示这一站的实拍照片。照片放在本文件夹，按站点名命名即可，不用改代码。

## 规则

- 文件名：\`站点名.jpg\`，见下表。清代与今天要用不同照片时，另放 \`站点名-qing.jpg\` 或 \`站点名-modern.jpg\`，会优先使用。
- 画面：按“建议机位”拍摄或挑选，与网页里的固定视角大体一致。横幅（约 16:10），宽 1600 像素左右，JPG，每张最好不超过 500 KB。
- 署名：在 \`credits.js\` 里写上作者、来源与授权，卡片下方会显示。例如：
  \`\`\`js
  window.PHOTO_CREDITS = { taihedian: '故宫博物院', qiniandian: '张三 · CC BY-SA 4.0 · Wikimedia Commons' };
  \`\`\`
- 缺照片的站点显示“实拍照片待补充”和建议机位，网页照常运行。
- 已拆除的建筑（天桥原桥、大清门、千步廊、清代地安门）请用历史老照片，并注明出处。

## 版权

故宫博物院、天坛公园等官方网站上的照片有版权。课堂展示一般属于教学使用；如果网页要公开发布，请改用自己拍的照片、Wikimedia Commons 等允许转载的照片（按要求署名），或先取得授权。

## 照片清单（${ids.length} 张）

| 站点 | 文件名 | 建议机位 | 用于 |
| --- | --- | --- | --- |
${rows.join('\n')}
`;
await writeFile(path.join(root, 'photos/README.md'), md);
console.log('photos/README.md', ids.length, 'stops');
