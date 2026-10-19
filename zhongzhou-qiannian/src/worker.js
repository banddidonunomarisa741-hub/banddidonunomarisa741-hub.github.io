// 后台线程：营建体素场景、生成近景细模
import { buildEra, buildFine, transferables } from './build-era.js';

self.onmessage = (e) => {
  const { type = 'build', key, id, idx } = e.data;
  try {
    if (type === 'fine') {
      const g = buildFine(key, idx);
      self.postMessage({ id, ok: true, result: g }, g ? transferables(g) : []);
      return;
    }
    const r = buildEra(key);
    self.postMessage({ id, ok: true, result: r }, transferables(r));
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.stack) || err) });
  }
};
