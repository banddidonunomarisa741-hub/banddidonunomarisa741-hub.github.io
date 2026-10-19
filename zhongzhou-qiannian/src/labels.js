// HTML 标注层：投影、按距离与优先级筛选、避让重叠
import * as THREE from 'three';

const PRIORITY = { era: -1, stop: -0.5, axis: 0, area: 1, geo: 2, coord: 2.5, bld: 3, gate: 4, road: 5, mapicon: 5.5, minor: 6 };
const RANGE = { era: 1e9, stop: 1e9, axis: 1e9, area: 1100, geo: 1100, coord: 1e9, bld: 420, gate: 330, road: 520, mapicon: 1400, minor: 190 };

export class Labels {
  constructor(root, camera, onClick) {
    this.root = root;
    this.camera = camera;
    this.list = [];
    this.visible = true;
    this.onClick = onClick;
    this.v = new THREE.Vector3();
    this.scale = Math.min(innerWidth, innerHeight) < 600 ? 0.75 : 1;
    this.selected = null;
    this.rangeMul = 1;
  }

  set(labels, nameFn) {
    this.root.textContent = '';
    this.list = labels
      .filter((l) => l.text)
      .map((l) => {
        const el = document.createElement('div');
        el.className = 'lb ' + l.kind + (l.cls ? ' ' + l.cls : '');
        if (l.color) el.style.setProperty('--c', l.color);
        el.textContent = l.text;
        if (l.id) el.addEventListener('click', (e) => { e.stopPropagation(); this.onClick && this.onClick(l.id); });
        this.root.appendChild(el);
        return { ...l, el, w: 0, shown: false, sx: -1e4, sy: -1e4 };
      })
      .sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind]);
  }

  select(id) {
    this.selected = id;
    for (const l of this.list) l.el.classList.toggle('sel', !!id && l.id === id);
  }

  update(axisMode) {
    if (!this.visible) { for (const l of this.list) if (l.shown) { l.el.style.display = 'none'; l.shown = false; } return; }
    const cam = this.camera;
    const W = innerWidth, H = innerHeight;
    const placed = [];
    const cp = cam.position;
    for (const l of this.list) {
      let show = true;
      const d = Math.hypot(l.x - cp.x, l.y - cp.y, l.z - cp.z);
      const range = RANGE[l.kind] * this.scale * this.rangeMul;
      if (l.hidden) show = false;
      if (d > range) show = false;
      if (axisMode && l.kind !== 'axis' && l.kind !== 'geo' && l.kind !== 'area' && l.kind !== 'coord' && l.kind !== 'era') show = false;
      let sx = 0, sy = 0;
      if (show) {
        this.v.set(l.x, l.y, l.z).project(cam);
        if (this.v.z > 1 || this.v.z < -1) show = false;
        sx = (this.v.x * 0.5 + 0.5) * W;
        sy = (-this.v.y * 0.5 + 0.5) * H;
        if (sx < -40 || sx > W + 40 || sy < 10 || sy > H + 10) show = false;
      }
      if (show) {
        if (!l.w) l.w = l.el.offsetWidth || l.text.length * 13 + 14;
        const rect = [sx - l.w / 2 - 2, sy - 24, sx + l.w / 2 + 2, sy];
        for (const r of placed) {
          if (rect[0] < r[2] && rect[2] > r[0] && rect[1] < r[3] && rect[3] > r[1]) { show = l.id && l.id === this.selected; break; }
        }
        if (show) placed.push(rect);
      }
      if (show) {
        if (!l.shown) { l.el.style.display = 'block'; l.shown = true; l.w = l.el.offsetWidth || l.w; }
        if (Math.abs(l.sx - sx) > 0.3 || Math.abs(l.sy - sy) > 0.3) {
          l.el.style.transform = `translate(${(sx - l.w / 2).toFixed(1)}px, ${(sy - 26).toFixed(1)}px)`;
          l.sx = sx; l.sy = sy;
        }
      } else if (l.shown) {
        l.el.style.display = 'none';
        l.shown = false;
      }
    }
  }
}
