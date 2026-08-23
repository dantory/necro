/* ══════════════════════════════════════════════════════════════
   8방향 스프라이트 재생기 — PixelLab 로 구운 걷기·공격 프레임을 그대로 튼다.
   ──────────────────────────────────────────────────────────────
   부위 리깅(js/rig.js)이 하던 일을 대신한다. 리깅은 **한 장을 잘라 흔들어** 걸음을
   흉내냈지만, 이제 8방향 × (서기·걷기 6·공격 6)이 실제로 구워져 있으므로 골라 그리기만
   하면 된다. 방향이 이미 그림에 들어 있으니 **좌우 뒤집기(flip)는 하지 않는다** —
   뒤집으면 명암과 든 장비가 좌우로 뒤집혀 어색해진다.
   ══════════════════════════════════════════════════════════ */

/* 8방향 이름. 각도(atan2(dy,dx)) 를 45° 씩 8등분한 순서다.
   화면이 SQUASH 로 눌려 있어도 **방향 판정은 월드 dx,dy** 로 한다 —
   스프라이트가 이미 비스듬히 내려다본 그림으로 구워져 있어서, 그림의 방향은
   눌리기 전 월드 좌표를 따른다. 월드 +y = 화면 아래 = south, +x = east. */
const DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

export function dirName(dx, dy) {
  // atan2 → 8등분. 0=east, π/2=south(+y 아래), -π/2=north, ±π=west.
  const oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  return DIRS[oct];
}

/* 경로별 lazy 이미지 캐시. **없으면 조용히 null** — 한 장이 없다고 판이 멈추면 안 된다
   (main.js 의 sprite() 와 같은 태도). 실패한 경로는 다시 묻지 않는다:
   요청하는 순간 캐시를 null 로 박아 두므로(undefined 가 아니게) 두 번 묻지 않고,
   onload 로 그림이 오면 그때부터 그 그림을 돌려준다. */
const CACHE = {};
export const MAX_FRAMES = 10;

/* ══ 목록 ══ **몇 장인지는 구운 쪽이 안다.**
   전에는 브라우저가 0,1,2… 로 두드려 보고 404 가 나면 거기가 끝인 줄 알았다.
   종마다 프레임 수가 달라서(해골 7 · 골렘 공격 5) 코드에 박을 수도 없었기 때문인데,
   그 대가로 판을 한 번 열 때 **404 가 수백 번** 났다. 이제 `assets/sprites.json`
   에 적어 두고 그대로 부른다 — 없는 파일은 아예 안 부른다.
   ★ 에셋을 새로 구우면 `python3 tools/make_manifest.py` 를 다시 돌려야 한다.
   목록이 없거나 못 받으면 **옛 방식(두드려 보기)으로 되돌아간다** — 목록 하나 때문에
   그림이 통째로 안 나오면 안 된다. */
let SHEET = null;
export async function loadManifest(url = "assets/sprites.json") {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (r.ok) SHEET = await r.json();
  } catch (e) { SHEET = null; }
  return !!SHEET;
}
/** 목록이 아는 프레임 수. 모르면 -1(=두드려 보라). */
function listed(base, state, dir) {
  const e = SHEET && SHEET[base] && SHEET[base][state];
  if (e === undefined || e === null) return -1;
  return typeof e === "number" ? e : (e[dir] ?? -1);
}

/** 다음 프레임을 **앞 장이 왔을 때만** 이어 부른다.
 *  없는 것을 미리 다 두드리면 404 만 쌓이고 로딩이 길어진다. */
function chain(base, state, dir, f) {
  if (f >= MAX_FRAMES) return;
  const path = `assets/${base}/${state}/${dir}/${f}.png`;
  if (CACHE[path] !== undefined) return;
  LOAD.total++;
  const im = new Image();
  im.onload  = () => { CACHE[path] = im; LOAD.done++; chain(base, state, dir, f + 1); };
  im.onerror = () => { CACHE[path] = null; LOAD.done++; };   // 여기서 끝. 더 안 두드린다
  CACHE[path] = null;
  im.src = path;
}

/** 이 종·이 동작이 **몇 프레임인가.** 파일이 있는 데까지 센다 —
 *  프레임 수를 코드에 박으면 종마다 다른 애니를 못 쓴다(6장짜리와 7장짜리가 섞인다).
 *  한 번 세고 적어 둔다. 아직 다 안 받아졌으면 0 을 주지 않고 6 으로 버틴다. */
const COUNT = {};
export function frameCount(base, state, dir = "south") {
  const k = `${base}/${state}`;
  if (COUNT[k]) return COUNT[k];
  const l = listed(base, state, dir);          // 목록이 알면 세지 않는다
  if (l > 0) { COUNT[k] = l; return l; }
  let n = 0;
  while (n < MAX_FRAMES && CACHE[`assets/${base}/${state}/${dir}/${n}.png`]) n++;
  if (n > 0) COUNT[k] = n;
  return n || 6;
}

/* ══ 얼마나 받았나 ══ 병수님: "에셋 불러올때 시간이 좀 필요할거 같으니 로딩화면도".
   **요청한 수와 끝난 수를 여기서 센다.** 로딩 막대는 이 둘의 비다 — 화면 쪽에서
   따로 세면 실제로 받는 곳과 어긋난다(받는 곳이 하나뿐이므로 세는 곳도 하나여야 한다).
   실패도 「끝난 것」이다. 없는 파일을 기다리며 영원히 99%에 멈추는 것이 제일 나쁘다. */
export const LOAD = { total: 0, done: 0 };

function img(path) {
  if (CACHE[path] !== undefined) return CACHE[path] || null;
  CACHE[path] = null;                       // 로드 전·실패 모두 null — 재요청 안 함
  LOAD.total++;
  const im = new Image();
  im.onload  = () => { CACHE[path] = im; LOAD.done++; };
  im.onerror = () => { CACHE[path] = null; LOAD.done++; };
  im.src = path;
  return null;
}

/* ══ 발바닥 재기 ══ PixelLab 스프라이트는 캔버스 **아래에 투명 여백**이 있다(해골 13%,
   골렘 15%…). 이미지 바닥을 발밑으로 잡고 그리면 그만큼 떠 보인다 — 접지 그림자 위로.
   그래서 종류마다 **한 번만**, idle(south) 한 장을 오프스크린에 그려 알파 바운딩박스의
   아래끝(발바닥)과 그 부근의 가로 폭(발 폭)을 재서 담아 둔다. 걷기 프레임마다 따로 재면
   프레임 간 발높이 차로 걸을 때 위아래로 덜덜 뛰므로, **idle 값 하나를 그 종류 전부에** 쓴다.
     footFrac      : 이미지 아래 투명 여백의 비율(h 대비) — 이만큼 더 내려 그린다
     footWidthFrac : 발 폭 / 이미지높이 — 접지 그림자를 이 폭에 맞춘다(넓은 놈은 넓게) */
const FOOT = new Map();                      // base → {footFrac, footWidthFrac} | null(아직)
export function footMetrics(base) {
  if (FOOT.has(base)) return FOOT.get(base);
  const im = img(`assets/${base}/south.png`);
  if (!im || !im.width) return null;         // idle 이 아직 안 왔다 — 다음 프레임에 다시
  let out;
  try {
    const c = document.createElement("canvas");
    c.width = im.width; c.height = im.height;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(im, 0, 0);
    const W = im.width, H = im.height, data = g.getImageData(0, 0, W, H).data;
    let bottom = -1;
    for (let y = H - 1; y >= 0 && bottom < 0; y--)
      for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 24) { bottom = y; break; }
    /* 머리끝도 잰다 — **체력바를 그림 상자가 아니라 머리 위에** 놓으려면 위쪽
       투명 여백을 알아야 한다. 상자 기준으로 놓으면 바가 몸에서 멀찍이 떠서
       누구 것인지 안 읽힌다(병수님이 본 「허공에 뜬 막대」가 이것이다). */
    let top = -1;
    for (let y = 0; y < H && top < 0; y++)
      for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 24) { top = y; break; }
    if (bottom < 0) { out = { footFrac: 0, footWidthFrac: 0.4, headFrac: 0, bodyWidthFrac: 0.4 }; }
    else {
      const footTop = Math.max(0, bottom - Math.round(H * 0.12));    // 발 부근(아래 12%)만
      let left = W, right = -1;
      for (let y = footTop; y <= bottom; y++)
        for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 24) {
          if (x < left) left = x; if (x > right) right = x;
        }
      let bl = W, br = -1;                                           // 몸 전체 가로폭
      for (let y = Math.max(0, top); y <= bottom; y++)
        for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 24) {
          if (x < bl) bl = x; if (x > br) br = x;
        }
      out = { footFrac: (H - 1 - bottom) / H,
              footWidthFrac: right >= left ? (right - left + 1) / H : 0.4,
              headFrac: Math.max(0, top) / H,                          // 위 투명 여백
              bodyWidthFrac: br >= bl ? (br - bl + 1) / H : 0.5 };
    }
  } catch (e) { out = null; }                // 오염(taint) 등 — 재지 못하면 기존대로
  FOOT.set(base, out);
  return out;
}

/* ══ 이 종의 공격은 **얼마나 움직이나** ══ 병수님: 골렘 공격이 정면에서 안 읽힌다.
   재 보니 다섯 장이 거의 같은 자세다 — 실루엣이 프레임 사이에 **30%** 밖에 안 바뀐다
   (해골 75% · 구울 90% · 졸개 120~124%). 팔이 뻗는 칸이 아예 없으니 프레임을 어떻게
   나눠 태워도 때리는 것이 안 보인다.

   다시 굽는 건 **세 판을 태운 자리**라(pixellab 공격 애니는 뒤 프레임이 무너진다)
   싸게 갈 수 있는 쪽은 코드다. 다만 「골렘만 2배」처럼 종 이름을 박으면 새로 굽는
   놈이 또 굳게 나왔을 때 아무도 모른다 — **얼마나 안 움직이는지를 그림에서 직접 재서**
   그만큼만 코드가 대신 움직인다.

   재는 법: attack/south 프레임들의 **알파 실루엣**을 서로 겹쳐 다른 칸을 세고,
   작은 쪽 실루엣 넓이로 나눈다(0=완전히 같은 자세). 색·명암은 안 본다 — 자세가
   바뀌었는지는 **윤곽**이 말한다(색까지 넣으면 골렘 0.81 대 해골 1.08 로 안 갈린다).
   footMetrics 와 같이 **종마다 한 번만** 재고 담아 둔다. */
const SPREAD = new Map();                    // base → 0~ | null(아직 못 잼)
const cached = (path) => CACHE[path] || null;   // 요청은 안 한다 — chain 을 끊지 않으려고
export function poseSpread(base) {
  if (SPREAD.has(base)) return SPREAD.get(base);
  const n = listed(base, "attack", "south");
  if (n < 2) return null;                    // 목록이 모른다/한 장뿐 — 손대지 않는다
  const ims = [];
  for (let i = 0; i < n; i++) {
    const im = cached(`assets/${base}/attack/south/${i}.png`);
    if (!im || !im.width) return null;        // 아직 안 왔다 — 다음 프레임에 다시
    ims.push(im);
  }
  let out = null;
  try {
    const W = ims[0].width, H = ims[0].height;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    const masks = ims.map((im) => {
      g.clearRect(0, 0, W, H); g.drawImage(im, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      const m = new Uint8Array(W * H);
      let area = 0;
      for (let j = 0; j < W * H; j++) if (d[j * 4 + 3] > 24) { m[j] = 1; area++; }
      return { m, area };
    });
    let best = 0;
    for (let a = 0; a < masks.length; a++)
      for (let b = a + 1; b < masks.length; b++) {
        let diff = 0;
        for (let j = 0; j < W * H; j++) if (masks[a].m[j] !== masks[b].m[j]) diff++;
        const denom = Math.max(1, Math.min(masks[a].area, masks[b].area));
        if (diff / denom > best) best = diff / denom;
      }
    out = best;
  } catch (e) { out = null; }                 // 오염(taint) 등 — 재지 못하면 기존대로
  SPREAD.set(base, out);
  return out;
}

/** **그림이 안 움직인 만큼 코드가 대신 움직인다.** 1 = 손대지 않음(그림이 충분히 움직인다),
 *  2 = 몸짓을 두 배로. 잘 구운 놈(구울·졸개·보스)은 1 이라 지금 화면이 그대로 남고,
 *  굳은 놈(골렘 0.30 → 1.9)만 크게 내지른다. 못 쟀으면 1 — **모르면 안 건드린다.** */
export function swingGain(base) {
  const s = poseSpread(base);
  if (s === null) return 1;
  return Math.max(1, Math.min(2, 1 + (0.85 - s) * 1.7));
}

/** 8방향 한 장을 발밑 중앙(x,gy)·높이 h 로 그린다.
 *  state: "idle" | "walk" | "attack".
 *    idle        → assets/<base>/<dir>.png
 *    walk/attack → assets/<base>/<state>/<dir>/<frameIdx>.png
 *  프레임이 아직 안 왔으면 idle 한 장으로 폴백, idle 도 없으면 false 를 돌려
 *  부르는 쪽이 색 덩어리를 그리게 한다. */
/* ══ 갈래로 물들인 프레임 ══ (2026-08-24 · V-7 · core.js `MOB_CLAN`)
   `ctx.filter` 는 그릴 때마다 다시 도는 셈이라, 한 프레임에 열넷을 그리면 그만큼 값이 든다.
   (그림 × 갈래) 는 많아야 (8방향 + 걷기 48 + 공격 48) × 두 갈래뿐이니 **한 번 만들어 두고 쓴다**
   — 시체 얼룩(main.js `corpseArt`)과 같은 수법이다.
   ★ 아직 안 온 그림은 **굳히지 않는다** — null 을 캐시에 박아 두면 그림이 온 뒤에도 영영 안 나온다
     (그 자리에도 같은 주의가 적혀 있다). */
const FILTERED = new Map();
function filtered(im, path, filter) {
  const key = path + "|" + filter;
  const hit = FILTERED.get(key);
  if (hit) return hit;
  if (!im.width || !im.height) return im;          // 아직 안 왔다 — 이번 판만 원본으로 그린다
  const c = document.createElement("canvas");
  c.width = im.width; c.height = im.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.filter = filter;
  g.drawImage(im, 0, 0);
  FILTERED.set(key, c);
  return c;
}

export function drawSprite8(ctx, base, dir, state, frameIdx, x, gy, h, filter) {
  const path = state === "idle"
    ? `assets/${base}/${dir}.png`
    : `assets/${base}/${state}/${dir}/${frameIdx}.png`;
  let im = img(path), used = path;
  if (!im && state !== "idle") { used = `assets/${base}/${dir}.png`; im = img(used); }   // 프레임 없으면 idle 로
  if (!im) return false;                                                // idle 도 없으면 폴백은 호출자가
  if (filter) im = filtered(im, used, filter);

  ctx.imageSmoothingEnabled = false;        // 픽셀아트 — 뭉개지 않는다
  const w = h * (im.width / im.height);     // 가로세로비 유지
  /* 이미지 아래 투명 여백(footFrac)만큼 **더 내려** 그린다 — 그래야 그림의 바닥이 아니라
     발바닥이 (x,gy) 에 온다. 아직 못 잰 종류는 0(기존처럼 이미지 바닥을 발밑으로). */
  const fm = footMetrics(base);
  const drop = fm ? h * fm.footFrac : 0;
  ctx.drawImage(im, x - w / 2, gy - h + drop, w, h);
  return true;
}

/* ══ 미리 받아 둔다 ══ **깜빡임의 정체가 이것이었다.**
   프레임은 처음 그려지는 순간에야 요청된다. 그런데 로드는 즉시 끝나지 않으므로
   그 프레임은 `idle` 한 장으로 폴백된다 — 공격은 0.26초뿐이라 여섯 장이 통째로
   idle 로 나가고, 자세가 확 달라서 **번쩍 하고 튄 것처럼 보인다.**
   방향이 여덟이라 놈이 몸을 틀 때마다 그 방향에서 또 겪는다(그래서 계속 깜빡였다).

   그래서 판이 열릴 때 **쓸 그림을 미리 다 받아 둔다.** 로컬 서버라 한 장이 1~2KB,
   9종 × (회전8 + 걷기48 + 공격48) ≈ 900장이지만 브라우저가 알아서 몇 개씩 나눠 받는다.
   받아 두면 CACHE 에 들어가므로 그리는 쪽 코드는 그대로다. */
export function preload(bases) {
  for (const base of bases) {
    for (const d of DIRS) {
      img(`assets/${base}/${d}.png`);
      /* ★ 6장으로 박아 뒀는데 새로 구운 해골은 **7장**이다(v3 애니는 프레임 수가
         종마다 다르다). 그렇다고 MAX_FRAMES 까지 다 부르면 **없는 파일을 552번**
         요청하게 된다(404 가 그만큼 나고 로딩이 그만큼 느려진다).
         그래서 **여섯 장은 그냥 부르고, 그다음은 앞 장이 실제로 왔을 때만 이어 부른다** —
         있는 데까지만 두드린다. */
      for (const st of ["walk", "attack"]) {
        const n = listed(base, st, d);
        if (n >= 0) {                                   // 목록이 안다 — 있는 만큼만 부른다
          for (let f = 0; f < n; f++) img(`assets/${base}/${st}/${d}/${f}.png`);
        } else {                                        // 목록에 없는 종 — 옛 방식
          for (let f = 0; f < 6; f++) img(`assets/${base}/${st}/${d}/${f}.png`);
          chain(base, st, d, 6);
        }
      }
    }
  }
}
