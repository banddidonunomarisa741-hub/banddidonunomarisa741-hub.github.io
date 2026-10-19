// 打包：worker 与主程序合并内联为单个 index.html（可直接双击打开，也可放 GitHub Pages）
import * as esbuild from 'esbuild';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist');
const minify = !process.argv.includes('--dev');

const worker = await esbuild.build({
  entryPoints: [path.join(root, 'src/worker.js')],
  bundle: true, format: 'iife', minify, write: false, target: ['es2020'], legalComments: 'none',
});
const workerCode = worker.outputFiles[0].text;

const virtualWorker = {
  name: 'virtual-worker',
  setup(b) {
    b.onResolve({ filter: /^virtual:worker$/ }, () => ({ path: 'worker', namespace: 'virtual' }));
    b.onLoad({ filter: /.*/, namespace: 'virtual' }, () => ({ contents: `export default ${JSON.stringify(workerCode)};`, loader: 'js' }));
  },
};

const app = await esbuild.build({
  entryPoints: [path.join(root, 'src/app.js')],
  bundle: true, format: 'iife', minify, write: false, target: ['es2020'], plugins: [virtualWorker], legalComments: 'none',
});
const appCode = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const tpl = await readFile(path.join(root, 'tools/index.template.html'), 'utf8');
const banner = '/* 中轴千年 · 北京中轴线体素建筑群 | 内含 three.js (MIT License, Copyright © 2010-2024 three.js authors) */\n';
const html = tpl.replace('<script>/*APP*/</script>', () => `<script>${banner}${appCode}</script>`);
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'index.html'), html);
// 实拍照片目录（photos/站点名.jpg 与署名 credits.js）随页面一起发布
if (path.resolve(out) !== root) await cp(path.join(root, 'photos'), path.join(out, 'photos'), { recursive: true });
console.log(`index.html ${(html.length / 1024).toFixed(0)} KB (worker ${(workerCode.length / 1024).toFixed(0)} KB) → ${out}`);
