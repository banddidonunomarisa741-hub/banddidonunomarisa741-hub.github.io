// 渲染引擎：场景、灯光、材质、相机、时段、朝代切换动画
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeGroundMaterial } from './ground-material.js';

THREE.ColorManagement.enabled = false;

const VOXEL_VERT_HEAD = `
attribute float aFlag;
varying float vFlag;
uniform float uFront;
uniform float uDir;
uniform float uTime;
`;
const VOXEL_VERT_BODY = `
vFlag = aFlag;
{
  vec4 wp0 = modelMatrix * vec4(transformed, 1.0);
  float k = clamp((wp0.z - uFront) * uDir / 18.0 + 0.5, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  transformed.y = transformed.y * k - (1.0 - k) * 0.6;
}
`;

export const TIMES = {
  morning: {
    name: '晨',
    sun: [0xfff6ea, 2.1], sunDir: [180, 260, 150],
    hemi: [0xeef3ff, 0x7e7a66, 1.2],
    night: 0, water: 0x9ccbe6,
    bg: 'linear-gradient(180deg, #f6c9a8 0%, #f3b896 45%, #eea98a 100%)',
  },
  dusk: {
    name: '昏',
    sun: [0xffb07a, 2.5], sunDir: [-200, 150, 120],
    hemi: [0xffcdb5, 0x6a5470, 1.45],
    night: 0.3, water: 0xf3b08a,
    bg: 'linear-gradient(180deg, #7b6aa6 0%, #d98c8c 45%, #f2a46e 100%)',
  },
  night: {
    name: '夜',
    sun: [0xa9c1ff, 1.05], sunDir: [-120, 260, 160],
    hemi: [0x7484bd, 0x262840, 1.05],
    night: 1, water: 0x2f5486,
    bg: 'linear-gradient(180deg, #0d1330 0%, #1b2450 55%, #2c3260 100%)',
  },
};

export class Engine {
  constructor(container, bounds) {
    this.container = container;
    this.bounds = bounds || { x0: -100, x1: 100, z0: -100, z1: 100 }; // 当前场景范围
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600;
    this.isMobile = isMobile;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const qp = new URLSearchParams(location.search);
    renderer.shadowMap.enabled = !qp.has('noshadow');
    renderer.shadowMap.type = qp.has('pcf') || isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 2, 4000);
    this.camera = camera;

    // 统一的 uniforms
    this.U = {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uMode: { value: 0 },
      uFront: { value: -1e5 },
      uWaterCol: { value: new THREE.Color(0x8cc6e6) },
    };

    // 灯光
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x887766, 1.1);
    scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = true;
    const sm = +(qp.get('sm') || (isMobile ? 2048 : 4096));
    sun.shadow.mapSize.set(sm, sm);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    sun.shadow.radius = 2;
    this.sun = sun;
    scene.add(sun);
    scene.add(sun.target);

    this.eraGroups = {};
    this.current = null;
    this.outgoing = null;
    this.trans = null;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = 1.38;
    controls.minDistance = 18;
    controls.maxDistance = 1100;
    controls.screenSpacePanning = false;
    controls.zoomSpeed = 1.1;
    controls.autoRotateSpeed = 0.6;
    this.controls = controls;

    this.flight = null;
    this.clock = new THREE.Clock();
    this.onFrame = [];
    this.fps = 0; this._fc = 0; this._ft = 0;
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.applyInset();
  }

  // 画面焦点让出右侧（或底部）面板的位置：用视口偏移把画面中心移到空白区域
  setInset(right = 0, bottom = 0) {
    this.insetTo = { right, bottom };
    if (!this.inset) this.inset = { right: 0, bottom: 0 };
  }
  applyInset() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const i = this.inset || { right: 0, bottom: 0 };
    if (Math.abs(i.right) < 0.5 && Math.abs(i.bottom) < 0.5) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, i.right / 2, i.bottom / 2, w, h);
    this.camera.updateProjectionMatrix();
  }

  makeVoxelMaterial(dir, ghostOf = null) {
    const U = this.U;
    const uDir = ghostOf ? ghostOf.userData.uDir : { value: dir };
    // ghost：导览时挡在镜头与目标之间的重点建筑改用的半透明材质
    const mat = new THREE.MeshLambertMaterial(ghostOf ? { vertexColors: true, transparent: true, opacity: 0.2, depthWrite: false } : { vertexColors: true });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uFront = U.uFront; sh.uniforms.uDir = uDir; sh.uniforms.uTime = U.uTime;
      sh.uniforms.uNight = U.uNight; sh.uniforms.uMode = U.uMode;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + VOXEL_VERT_HEAD)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VOXEL_VERT_BODY);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying float vFlag; uniform float uNight; uniform float uMode; uniform float uTime;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
float fF = floor(vFlag + 0.5);
float fGlow = mod(fF, 2.0);
float fAxis = mod(floor(fF / 2.0 + 0.01), 2.0);
float fChg = mod(floor(fF / 4.0 + 0.01), 2.0);
if (uMode > 0.5) {
  float keep = uMode < 1.5 ? fAxis : fChg;
  float l = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
  vec3 ghost = vec3(l) * 0.55 + vec3(0.42, 0.40, 0.40);
  diffuseColor.rgb = mix(ghost, diffuseColor.rgb, keep);
}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vColor.rgb * fGlow * (0.15 + uNight * 1.25);
if (uMode > 1.5) totalEmissiveRadiance += vec3(0.35, 0.2, 0.05) * fChg * (0.5 + 0.5 * sin(uTime * 3.0));`);
    };
    mat.userData.uDir = uDir;
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = (sh) => {
      sh.uniforms.uFront = U.uFront; sh.uniforms.uDir = uDir; sh.uniforms.uTime = U.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + VOXEL_VERT_HEAD)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VOXEL_VERT_BODY);
    };
    return { mat, depth, uDir };
  }

  geomFrom(c) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(c.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(c.normal, 3, true));
    g.setAttribute('color', new THREE.BufferAttribute(c.color, 3, true));
    g.setAttribute('aFlag', new THREE.BufferAttribute(c.flag, 1, false));
    g.setIndex(new THREE.BufferAttribute(c.index, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    // 上传显存后释放内存里的顶点数组
    for (const a of Object.values(g.attributes)) a.onUpload(function () { this.array = null; });
    g.index.onUpload(function () { this.array = null; });
    return g;
  }

  // 登记一个场景：geoms 为纯数据区块，heroGeoms 为重点建筑粗模，ground 为 RGBA 数组
  addEra(key, data) {
    const group = new THREE.Group();
    const { mat, depth, uDir } = this.makeVoxelMaterial(1);
    const ghost = this.makeVoxelMaterial(1, mat).mat;
    const addMesh = (c) => {
      const m = new THREE.Mesh(this.geomFrom(c), mat);
      m.castShadow = true; m.receiveShadow = true;
      m.customDepthMaterial = depth;
      group.add(m);
      return m;
    };
    for (const c of data.geoms) addMesh(c);
    const heroes = [];
    for (const h of data.heroGeoms || []) {
      const m = addMesh(h.geom);
      const bb = m.geometry.boundingBox;
      const center = bb.getCenter(new THREE.Vector3());
      const size = bb.getSize(new THREE.Vector3());
      const meta = (data.heroes || []).find((q) => q.idx === h.idx) || {};
      heroes.push({ idx: h.idx, id: meta.id, tag: meta.tag, coarse: m, fine: null, pending: false, failed: !!meta.noFine, hidden: false, ghost: false, box: bb.clone(), center, radius: Math.max(size.x, size.z) / 2, near: false, used: 0 });
    }
    const mk = (arr, nearest) => {
      const t = new THREE.DataTexture(arr, data.ground.width, data.ground.height, THREE.RGBAFormat);
      t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
      t.minFilter = nearest ? THREE.NearestMipmapLinearFilter : THREE.LinearFilter;
      t.generateMipmaps = !!nearest;
      t.anisotropy = 4;
      t.needsUpdate = true;
      return t;
    };
    const groundTex = { color: mk(data.ground.color, true), ao: mk(data.ground.ao, false) };
    const b = data.bounds;
    const W = b.x1 - b.x0 + 1, D = b.z1 - b.z0 + 1;
    const gGeo = new THREE.PlaneGeometry(W, D);
    gGeo.rotateX(-Math.PI / 2);
    const gMat = makeGroundMaterial(this.U, groundTex.color, groundTex.ao, { shimmer: data.shimmer ?? 1 });
    const ground = new THREE.Mesh(gGeo, gMat);
    ground.position.set(b.x0 + W / 2, 0, b.z0 + D / 2);
    ground.receiveShadow = true;
    group.add(ground);
    // 底座：顶面压低到地面以下，远看不与地面争深度；侧面露出一条草皮
    const slabC = data.slab ?? 0x6b5340;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 2, 6, D + 2), new THREE.MeshLambertMaterial({ color: slabC }));
    slab.position.set(b.x0 + W / 2, -3.6, b.z0 + D / 2);
    slab.receiveShadow = true;
    group.add(slab);
    const band = new THREE.Mesh(new THREE.BoxGeometry(W + 2.2, 0.9, D + 2.2), new THREE.MeshLambertMaterial({ color: data.edge ?? 0x6f9a4a }));
    band.position.set(b.x0 + W / 2, -1.05, b.z0 + D / 2);
    group.add(band);
    group.visible = false;
    group.userData = { uDir, groundTex, mat, ghost, depth, bounds: b, heroes, extra: [ghost, gMat, slab.material, band.material, gGeo, slab.geometry, band.geometry] };
    this.scene.add(group);
    this.eraGroups[key] = group;
    return group;
  }

  // 细模到达：替换对应重点建筑
  addFine(key, idx, c) {
    const g = this.eraGroups[key];
    if (!g) return;
    const h = g.userData.heroes.find((q) => q.idx === idx);
    if (!h) return;
    h.pending = false;
    if (!c) { h.failed = true; return; }
    const m = new THREE.Mesh(this.geomFrom(c), g.userData.mat);
    m.castShadow = true; m.receiveShadow = true;
    m.customDepthMaterial = g.userData.depth;
    m.visible = false;
    g.add(m);
    h.fine = m;
    this.applyLOD(h);
  }

  applyLOD(h) {
    if (h.hidden) { h.coarse.visible = false; if (h.fine) h.fine.visible = false; return; }
    const useFine = h.near && h.fine;
    h.coarse.visible = !useFine;
    if (h.fine) h.fine.visible = !!useFine;
    const ud = h.coarse.parent && h.coarse.parent.userData;
    if (ud && ud.ghost) {
      h.coarse.material = h.ghost ? ud.ghost : ud.mat;
      if (h.fine) h.fine.material = h.ghost ? ud.ghost : ud.mat;
    }
  }

  // 导览：把挡住视线的重点建筑设为半透明（list 为 hero 对象数组，空则全部恢复）
  setGhosts(list) {
    const on = new Set(list || []);
    for (const g of Object.values(this.eraGroups)) {
      for (const h of g.userData.heroes) {
        const v = on.has(h);
        if (v !== h.ghost) { h.ghost = v; this.applyLOD(h); }
      }
    }
  }

  // 每隔一小段时间调用：近处的重点建筑换细模，远了换回；返回需要请求细模的编号
  lodTick(maxFine = 10) {
    const g = this.current;
    if (!g || !g.userData.heroes.length) return [];
    const cam = this.camera.position;
    const dist = cam.distanceTo(this.controls.target);
    const want = [];
    const now = performance.now();
    for (const h of g.userData.heroes) {
      const d = cam.distanceTo(h.center);
      const near = dist < 170 && d < h.radius * 2.2 + 70;
      if (near !== h.near) { h.near = near; this.applyLOD(h); }
      if (near) {
        h.used = now;
        if (!h.fine && !h.pending && !h.failed) want.push(h);
      }
    }
    // 细模太多时，释放最久未用的
    const loaded = g.userData.heroes.filter((h) => h.fine);
    if (loaded.length > maxFine) {
      loaded.sort((a, b) => a.used - b.used);
      for (const h of loaded.slice(0, loaded.length - maxFine)) {
        if (h.near) continue;
        g.remove(h.fine);
        h.fine.geometry.dispose();
        h.fine = null;
        this.applyLOD(h);
      }
    }
    want.sort((a, b) => cam.distanceTo(a.center) - cam.distanceTo(b.center));
    return want.map((h) => { h.pending = true; return h.idx; });
  }

  hasEra(key) { return !!this.eraGroups[key]; }

  disposeEra(key) {
    const g = this.eraGroups[key];
    if (!g || g === this.current || (this.trans && (this.trans.prev === g || this.trans.next === g))) return false;
    g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    g.userData.mat.dispose(); g.userData.depth.dispose();
    for (const t of Object.values(g.userData.groundTex)) t.dispose && t.dispose();
    for (const e of g.userData.extra) e.dispose && e.dispose();
    this.scene.remove(g);
    delete this.eraGroups[key];
    return true;
  }

  // 切换场景：上一场景直接隐藏（由界面上的淡入淡出遮住），新场景从南向北“生长”出来
  showEra(key, animate = true) {
    const next = this.eraGroups[key];
    if (!next) return;
    for (const g of Object.values(this.eraGroups)) if (g !== next) g.visible = false;
    this.current = next;
    next.visible = true;
    this.bounds = next.userData.bounds;
    next.userData.uDir.value = 1;
    if (!animate) { this.U.uFront.value = -1e5; this.trans = null; return; }
    this.trans = { next, t: 0, dur: 1.1 };
    this.U.uFront.value = this.bounds.z1 + 30;
  }

  setTime(key, instant) {
    const T = TIMES[key];
    this.timeKey = key;
    const from = this._timeState || null;
    const to = {
      sunC: new THREE.Color(T.sun[0]), sunI: T.sun[1],
      sunDir: new THREE.Vector3(...T.sunDir),
      hemiS: new THREE.Color(T.hemi[0]), hemiG: new THREE.Color(T.hemi[1]), hemiI: T.hemi[2],
      night: T.night, water: new THREE.Color(T.water),
    };
    if (!from || instant) { this._timeState = to; this._applyTime(to); this._timeAnim = null; }
    else this._timeAnim = { from: { ...from, sunC: from.sunC.clone(), hemiS: from.hemiS.clone(), hemiG: from.hemiG.clone(), sunDir: from.sunDir.clone(), water: from.water.clone() }, to, t: 0 };
    document.documentElement.style.setProperty('--sky', T.bg);
  }

  _applyTime(s) {
    this.sun.color.copy(s.sunC); this.sun.intensity = s.sunI;
    this.hemi.color.copy(s.hemiS); this.hemi.groundColor.copy(s.hemiG); this.hemi.intensity = s.hemiI;
    this.U.uNight.value = s.night;
    this.U.uWaterCol.value.copy(s.water);
    this._sunDir = s.sunDir.clone().normalize();
    this._timeState = s;
    this.updateShadowCam();
  }

  // 阴影相机：按当前画面在地面上的可见范围精确取景，并对齐阴影贴图像素，旋转时不闪烁
  updateShadowCam() {
    const b = this.bounds;
    const cam = this.camera;
    cam.updateMatrixWorld();
    const pts = this._shPts || (this._shPts = Array.from({ length: 32 }, () => new THREE.Vector3()));
    const v = this._shV || (this._shV = new THREE.Vector3());
    const dir = this._shD || (this._shD = new THREE.Vector3());
    let n = 0;
    // 远处的阴影在屏幕上很小，取景只到相机距离的约三倍，保证近处阴影清晰
    const maxT = cam.position.distanceTo(this.controls.target) * 3 + 150;
    const clampPt = (p) => {
      p.x = Math.min(b.x1 + 12, Math.max(b.x0 - 12, p.x));
      p.z = Math.min(b.z1 + 12, Math.max(b.z0 - 12, p.z));
    };
    for (let i = 0; i < 9; i++) {
      const nx = (i % 3) - 1, ny = Math.floor(i / 3) - 1;
      v.set(nx, ny, 0.5).unproject(cam);
      dir.copy(v).sub(cam.position).normalize();
      for (const h of [0, 38]) {
        let t;
        if (dir.y < -1e-3) t = (h - cam.position.y) / dir.y;
        else t = maxT;
        t = Math.max(0, Math.min(t, maxT));
        const p = pts[n++];
        p.copy(cam.position).addScaledVector(dir, t);
        p.y = h;
        clampPt(p);
      }
    }
    const d = this._sunDir || new THREE.Vector3(1, 2, 1).normalize();
    const sc = this.sun.shadow.camera;
    // 以世界原点为基准的固定光源视图，便于像素对齐
    sc.position.copy(d).multiplyScalar(900);
    sc.lookAt(0, 0, 0);
    sc.updateMatrixWorld();
    const inv = sc.matrixWorldInverse;
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity, minz = Infinity, maxz = -Infinity;
    for (let i = 0; i < n; i++) {
      v.copy(pts[i]).applyMatrix4(inv);
      minx = Math.min(minx, v.x); maxx = Math.max(maxx, v.x);
      miny = Math.min(miny, v.y); maxy = Math.max(maxy, v.y);
      minz = Math.min(minz, v.z); maxz = Math.max(maxz, v.z);
    }
    // 方形范围，边长按 1/4 倍频程量化，避免旋转时尺寸抖动
    let ext = Math.max(maxx - minx, maxy - miny) + 24;
    ext = Math.pow(2, Math.ceil(Math.log2(Math.max(ext, 60)) * 4) / 4);
    const size = this.sun.shadow.mapSize.x;
    const texel = ext / size;
    let mx = (minx + maxx) / 2, my = (miny + maxy) / 2;
    mx = Math.round(mx / texel) * texel;
    my = Math.round(my / texel) * texel;
    // 对齐后的中心换回世界坐标（位于过原点、垂直于光线的平面上）
    const right = this._shR || (this._shR = new THREE.Vector3());
    const up = this._shU || (this._shU = new THREE.Vector3());
    right.setFromMatrixColumn(sc.matrixWorld, 0);
    up.setFromMatrixColumn(sc.matrixWorld, 1);
    const center = this._shCenter || (this._shCenter = new THREE.Vector3());
    center.set(0, 0, 0).addScaledVector(right, mx).addScaledVector(up, my);
    this.sun.position.copy(center).addScaledVector(d, 900);
    this.sun.target.position.copy(center);
    this.sun.target.updateMatrixWorld();
    sc.left = -ext / 2; sc.right = ext / 2; sc.top = ext / 2; sc.bottom = -ext / 2;
    sc.near = Math.max(1, -maxz - 80);
    sc.far = -minz + 80;
    sc.updateProjectionMatrix();
  }

  // 近裁剪面随距离变化，远景时保证深度精度
  updateClip() {
    const dist = this.camera.position.distanceTo(this.controls.target);
    const near = Math.min(40, Math.max(0.8, dist * 0.025));
    const far = Math.max(1500, dist * 4 + 800);
    if (Math.abs(near - this.camera.near) > 0.05 * this.camera.near || Math.abs(far - this.camera.far) > 50) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  flyTo(target, offset, dur = 1.6) {
    const c = this.controls;
    this.flight = {
      t: 0, dur,
      p0: this.camera.position.clone(), t0: c.target.clone(),
      t1: new THREE.Vector3(...target),
      p1: new THREE.Vector3(...target).add(new THREE.Vector3(...offset)),
    };
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      const raw = Math.min(0.3, this.clock.getDelta());
      const dt = Math.min(0.05, raw);
      this.U.uTime.value += dt;
      if (this.flight) {
        const f = this.flight;
        f.t += raw / f.dur;
        const k = f.t >= 1 ? 1 : 1 - Math.pow(1 - f.t, 3);
        this.controls.target.lerpVectors(f.t0, f.t1, k);
        this.camera.position.lerpVectors(f.p0, f.p1, k);
        if (f.t >= 1) this.flight = null;
      }
      if (this.trans) {
        const tr = this.trans;
        tr.t += raw / tr.dur;
        const k = Math.min(1, tr.t);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const b = this.bounds;
        this.U.uFront.value = (b.z1 + 30) + (b.z0 - 30 - (b.z1 + 30)) * e;
        if (tr.t >= 1) { this.U.uFront.value = -1e5; this.trans = null; }
      }
      if (this._timeAnim) {
        const a = this._timeAnim;
        a.t += raw / 1.2;
        const k = Math.min(1, a.t);
        const s = {
          sunC: a.from.sunC.clone().lerp(a.to.sunC, k), sunI: a.from.sunI + (a.to.sunI - a.from.sunI) * k,
          sunDir: a.from.sunDir.clone().lerp(a.to.sunDir, k),
          hemiS: a.from.hemiS.clone().lerp(a.to.hemiS, k), hemiG: a.from.hemiG.clone().lerp(a.to.hemiG, k),
          hemiI: a.from.hemiI + (a.to.hemiI - a.from.hemiI) * k,
          night: a.from.night + (a.to.night - a.from.night) * k,
          water: a.from.water.clone().lerp(a.to.water, k),
        };
        this._applyTime(s);
        if (a.t >= 1) this._timeAnim = null;
      }
      if (this.insetTo) {
        const i = this.inset, t = this.insetTo, k = Math.min(1, raw * 8);
        i.right += (t.right - i.right) * k; i.bottom += (t.bottom - i.bottom) * k;
        if (Math.abs(t.right - i.right) < 0.5 && Math.abs(t.bottom - i.bottom) < 0.5) { i.right = t.right; i.bottom = t.bottom; this.insetTo = null; }
        this.applyInset();
      }
      this.controls.update();
      this.updateClip();
      this.updateShadowCam();
      for (const f of this.onFrame) f(dt, raw);
      this.renderer.render(this.scene, this.camera);
      this._fc++; this._ft += dt;
      if (this._ft >= 0.5) { this.fps = this._fc / this._ft; this._fc = 0; this._ft = 0; }
    };
    loop();
  }
}
