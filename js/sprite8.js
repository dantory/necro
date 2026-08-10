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

/** 8방향 한 장을 발밑 중앙(x,gy)·높이 h 로 그린다.
 *  state: "idle" | "walk" | "attack".
 *    idle        → assets/<base>/<dir>.png
 *    walk/attack → assets/<base>/<state>/<dir>/<frameIdx>.png
 *  프레임이 아직 안 왔으면 idle 한 장으로 폴백, idle 도 없으면 false 를 돌려
 *  부르는 쪽이 색 덩어리를 그리게 한다. */
export function drawSprite8(ctx, base, dir, state, frameIdx, x, gy, h) {
  const path = state === "idle"
    ? `assets/${base}/${dir}.png`
    : `assets/${base}/${state}/${dir}/${frameIdx}.png`;
  let im = img(path);
  if (!im && state !== "idle") im = img(`assets/${base}/${dir}.png`);   // 프레임 없으면 idle 로
  if (!im) return false;                                                // idle 도 없으면 폴백은 호출자가

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
