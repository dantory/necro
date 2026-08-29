/* ══════════════════════════════════════════════════════════════
   hs/sprite.js — 8방향 스프라이트 재생기 (hs 프로토타입 전용)
   ──────────────────────────────────────────────────────────────
   necro 의 js/sprite8.js 를 읽고, 여기서 쓸 만큼만 다시 적었다.
   ★ 페이지가 /hs/index.html 이므로 에셋은 `../assets/…` 로 부른다
     (js/sprite8.js 는 루트 기준 `assets/…` 라 여기서 그대로 쓰면 404 다).
   ★ js/ 는 한 줄도 건드리지 않는다 — 이 파일은 hs/ 안에서 홀로 돈다.
   ══════════════════════════════════════════════════════════ */

const BASE = "../assets/";
const DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

export function dirName(dx, dy) {
  const oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  return DIRS[oct];
}

const CACHE = {};
const MAX_FRAMES = 10;
export const LOAD = { total: 0, done: 0 };

let SHEET = null;
export async function loadManifest(url = BASE + "sprites.json") {
  try { const r = await fetch(url, { cache: "no-cache" }); if (r.ok) SHEET = await r.json(); }
  catch { SHEET = null; }
  return !!SHEET;
}
function listed(base, state) {
  const e = SHEET && SHEET[base] && SHEET[base][state];
  return typeof e === "number" ? e : -1;
}
export function frameCount(base, state) {
  const l = listed(base, state);
  return l > 0 ? l : 6;
}

function img(path) {
  if (CACHE[path] !== undefined) return CACHE[path] || null;
  CACHE[path] = null;
  LOAD.total++;
  const im = new Image();
  im.onload = () => { CACHE[path] = im; LOAD.done++; };
  im.onerror = () => { CACHE[path] = null; LOAD.done++; };
  im.src = BASE + path;
  return null;
}

/* 발바닥 재기 — PixelLab 스프라이트는 아래에 투명 여백이 있다.
   그만큼 더 내려 그려야 발이 (x,footY) 에 온다. 종마다 한 번만 잰다. */
const FOOT = new Map();
export function footMetrics(base) {
  if (FOOT.has(base)) return FOOT.get(base);
  const im = img(`${base}/south.png`);
  if (!im || !im.width) return null;
  let out = null;
  try {
    const c = document.createElement("canvas");
    c.width = im.width; c.height = im.height;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(im, 0, 0);
    const W = im.width, H = im.height, d = g.getImageData(0, 0, W, H).data;
    let bottom = -1;
    for (let y = H - 1; y >= 0 && bottom < 0; y--)
      for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { bottom = y; break; }
    let top = -1;
    for (let y = 0; y < H && top < 0; y++)
      for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { top = y; break; }
    out = { footFrac: bottom < 0 ? 0 : (H - 1 - bottom) / H, headFrac: Math.max(0, top) / H };
  } catch { out = null; }
  FOOT.set(base, out);
  return out;
}

/* 갈래 물들임 캐시 — ctx.filter 는 그릴 때마다 값이 드니 한 번 굳혀 둔다. */
const FILTERED = new Map();
function filtered(im, path, filter) {
  const key = path + "|" + filter;
  const hit = FILTERED.get(key);
  if (hit) return hit;
  if (!im.width || !im.height) return im;
  const c = document.createElement("canvas");
  c.width = im.width; c.height = im.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.filter = filter;
  g.drawImage(im, 0, 0);
  FILTERED.set(key, c);
  return c;
}

/** 8방향 한 장을 발밑 중앙(x,footY)·높이 h 로 그린다.
 *  state: "idle" | "walk" | "attack". 프레임이 아직 안 왔으면 idle 폴백.
 *  idle 도 없으면 false → 호출자가 색 덩어리로 대신 그린다. */
export function drawSprite8(ctx, base, dir, state, frameIdx, x, footY, h, filter) {
  const path = state === "idle" ? `${base}/${dir}.png` : `${base}/${state}/${dir}/${frameIdx}.png`;
  let im = img(path), used = path;
  if (!im && state !== "idle") { used = `${base}/${dir}.png`; im = img(used); }
  if (!im) return false;
  if (filter) im = filtered(im, used, filter);
  ctx.imageSmoothingEnabled = false;
  const w = h * (im.width / im.height);
  const fm = footMetrics(base);
  const drop = fm ? h * fm.footFrac : 0;
  ctx.drawImage(im, x - w / 2, footY - h + drop, w, h);
  return true;
}

/** 판이 열릴 때 쓸 그림을 미리 받아 둔다(깜빡임 방지). */
export function preload(bases) {
  for (const base of bases) {
    for (const d of DIRS) {
      img(`${base}/${d}.png`);
      for (const st of ["walk", "attack"]) {
        const n = listed(base, st);
        const cnt = n >= 0 ? n : 6;
        for (let f = 0; f < cnt; f++) img(`${base}/${st}/${d}/${f}.png`);
      }
    }
  }
}

/** 단순 이미지 하나(장식·바닥 등). 로드 전이면 null. */
export function tex(path) { return img(path); }
