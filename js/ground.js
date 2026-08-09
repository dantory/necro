/* ══════════════════════════════════════════════════════════════
   **바닥을 깐다.** — 병수님: "디아블로 같은 느낌이긴한데 뭔가 부족하긴한데,,뭘까"
   ──────────────────────────────────────────────────────────────
   부족했던 것은 **바닥**이었다. 판(HUD)을 열두 번 고치는 동안 정작 화면의 80% 를
   차지하는 전장은 **검은 색 하나**였고, 캐릭터가 허공에 떠 있었다. 게다가 거기 깔린
   빛은 `createRadialGradient` — 화면을 전부 픽셀로 갈아 놓고 **제일 넓은 면만
   매끈하게** 남아 있었다.

   디아블로의 분위기는 절반이 바닥에서 온다:
     · **돌 이음새** — 바닥에 무늬가 있어야 발이 닿은 것으로 읽힌다
     · **횃불빛 한 점** — 가장자리로 갈수록 어둡고, 그 경계가 **계단**이다
     · **어둠이 대부분** — 밝은 곳은 좁아야 무섭다

   ★ 조명은 **저해상도로 그려 확대한다.** 화면 해상도로 원을 그리면 계단이 1px 이라
   눈에 안 보이고, 그러면 그라디언트와 구별이 안 된다. 1/LIGHT_PX 크기에 그려서
   pixelated 로 늘리면 **덩어리진 계단**이 생긴다 — 그게 픽셀아트의 조명이다.
   ══════════════════════════════════════════════════════════ */

const LIGHT_PX = 6;                 // 조명 한 칸의 크기(화면 픽셀)
/** 빛의 단계. **다섯 단계뿐이다** — 이 끊김이 그라디언트와 픽셀아트를 가른다.
 *  ★ 이 색은 바닥에 **곱해진다.** 그래서 「빛의 밝기」지 「빛의 색」이 아니다 —
 *  가운데가 거의 흰색이라야 바닥이 원래 색으로 보이고, 바깥이 검정이라야 잠긴다.
 *  처음엔 어두운 갈색 다섯을 넣었다가 **바닥이 통째로 안 보였다**(0.18배가 되어서). */
const LIT = ["#efe2c8", "#9a8a70", "#54483a", "#28211a", "#0c0a08"];

let lightCv = null, lightKey = "";

/** 횃불빛을 저해상도 캔버스에 굽는다. 화면 크기가 그대로면 다시 안 굽는다. */
function bakeLight(w, h, cx, cy, radius, squash) {
  const key = `${w}x${h}:${Math.round(cx)},${Math.round(cy)}:${Math.round(radius)}:${squash.toFixed(2)}`;
  if (lightKey === key && lightCv) return lightCv;
  lightKey = key;
  const lw = Math.ceil(w / LIGHT_PX), lh = Math.ceil(h / LIGHT_PX);
  if (!lightCv) lightCv = document.createElement("canvas");
  lightCv.width = lw; lightCv.height = lh;
  const g = lightCv.getContext("2d");
  const lcx = cx / LIGHT_PX, lcy = cy / LIGHT_PX, lr = radius / LIGHT_PX;
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const dx = (x + 0.5 - lcx) / lr;
    const dy = (y + 0.5 - lcy) / (lr * squash);   // 위에서 비스듬히 보므로 세로로 눌린다
    const d = Math.sqrt(dx * dx + dy * dy);
    /* 단계 경계에 **아주 작은 흔들림**을 준다. 완전한 동심원은 과녁처럼 보인다 —
       경계가 조금 우툴두툴해야 횃불빛으로 읽힌다. 값은 좌표로 정해지므로 안 깜빡인다. */
    const jitter = ((x * 7 + y * 13) % 5) * 0.012;
    const i = Math.min(LIT.length - 1, Math.floor((d + jitter) * (LIT.length - 0.2)));
    g.fillStyle = LIT[i]; g.fillRect(x, y, 1, 1);
  }
  return lightCv;
}

let tiles = [];            // 미리 구운 네 가지 변형
let floorReady = false;

/** 바닥 타일을 받아 **네 가지 변형으로 미리 구워 둔다.**
 *  ★ 한 장을 그대로 반복하면 **격자가 보인다** — 같은 얼룩이 32px 마다 되풀이되니
 *  눈이 그 주기를 금방 찾아낸다. 좌우·상하로 뒤집은 네 장을 자리마다 골라 쓰면
 *  주기가 128px 로 늘어나고 무늬가 훨씬 덜 읽힌다. 뒤집기는 **공짜**다(새로 굽지 않는다).
 *
 *  ★ 굽는 김에 **밝기도 올린다.** PixelLab 이 준 crypt 타일은 평균 밝기가 41(255 중)
 *  이라 조명을 곱하면 거의 검정이 된다. 어둠은 조명이 만들어야 하므로 재료는 밝게
 *  둔다 — 그래야 빛 안에서 살아나고 빛 밖에서 잠긴다. */
export function loadFloor(src, boost = 1.8) {
  const im = new Image();
  im.onload = () => {
    const t = im.width;
    tiles = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => {
      const c = document.createElement("canvas");
      c.width = t; c.height = t;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.filter = `brightness(${boost}) saturate(0.9)`;
      g.translate(sx < 0 ? t : 0, sy < 0 ? t : 0);
      g.scale(sx, sy);
      g.drawImage(im, 0, 0);
      return c;
    });
    floorReady = true;
  };
  im.src = src;
}

/** 전장 바닥 한 판. **타일 → 빛** 순서로 얹는다. */
export function drawGround(ctx, w, h, cx, cy, radius, squash) {
  ctx.fillStyle = "#070504"; ctx.fillRect(0, 0, w, h);

  /* ① 돌바닥 — 타일을 격자로 깐다. **정수 좌표로만** 놓는다(소수면 가장자리가 흐려진다).
     자리마다 네 변형 중 하나를 고르는데, **좌표로 정한다**(난수가 아니다) —
     난수면 매 프레임 무늬가 바뀌어 바닥이 끓는다. */
  if (floorReady) {
    const t = tiles[0].width;
    ctx.imageSmoothingEnabled = false;
    const ox = Math.floor(cx) % t - t, oy = Math.floor(cy) % t - t;
    for (let y = oy, gy = 0; y < h + t; y += t, gy++)
      for (let x = ox, gx = 0; x < w + t; x += t, gx++)
        ctx.drawImage(tiles[(gx * 3 + gy * 7 + ((gx * gy) & 1)) & 3], x, y);
  }

  /* ② 횃불빛 — 저해상도로 구워 곱하기로 덮는다. 곱하기라 바닥 무늬가 어둠 속에서
     사라졌다가 빛 안에서 살아난다. 이게 「빛이 닿았다」로 읽히는 이유다. */
  const lc = bakeLight(w, h, cx, cy, radius, squash);
  ctx.save();
  ctx.globalCompositeOperation = floorReady ? "multiply" : "source-over";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lc, 0, 0, lc.width, lc.height, 0, 0, lc.width * LIGHT_PX, lc.height * LIGHT_PX);
  ctx.restore();
  if (floorReady) {
    /* 횃불의 **따뜻한 기운**을 아주 옅게 더한다. 곱하기만 하면 회색으로 식는다.
       0.10 이 넘으면 바닥이 주황 물감을 뒤집어쓴 것처럼 보인다. */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.08;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lc, 0, 0, lc.width, lc.height, 0, 0, lc.width * LIGHT_PX, lc.height * LIGHT_PX);
    ctx.restore();
  }
}

/** 소환수가 진을 치는 둘레. **점선도 픽셀로** — 캔버스 setLineDash 는 매끈하다. */
export function drawHoldRing(ctx, cx, cy, r, squash) {
  ctx.fillStyle = "rgba(200,170,110,.22)";
  const step = 0.14;
  for (let a = 0, k = 0; a < 6.284; a += step, k++) {
    if (k % 3 === 2) continue;                       // 세 칸에 한 칸씩 비운다 = 점선
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r * squash);
    ctx.fillRect(x, y, 2, 2);                        // 점 하나가 2x2 — 1px 은 안 보인다
  }
}
