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
function img(path) {
  if (CACHE[path] !== undefined) return CACHE[path] || null;
  CACHE[path] = null;                       // 로드 전·실패 모두 null — 재요청 안 함
  const im = new Image();
  im.onload  = () => { CACHE[path] = im; };
  im.onerror = () => { CACHE[path] = null; };
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
    if (bottom < 0) { out = { footFrac: 0, footWidthFrac: 0.4 }; }   // 전부 투명(있을 리 없지만)
    else {
      const footTop = Math.max(0, bottom - Math.round(H * 0.12));    // 발 부근(아래 12%)만
      let left = W, right = -1;
      for (let y = footTop; y <= bottom; y++)
        for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 24) {
          if (x < left) left = x; if (x > right) right = x;
        }
      out = { footFrac: (H - 1 - bottom) / H,
              footWidthFrac: right >= left ? (right - left + 1) / H : 0.4 };
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
