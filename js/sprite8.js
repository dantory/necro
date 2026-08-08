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
  ctx.drawImage(im, x - w / 2, gy - h, w, h);   // (x,gy) 가 발밑 중앙
  return true;
}
