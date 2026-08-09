import { LOAD } from "./sprite8.js";

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
/* ★ 맨 바깥을 완전한 검정에 가깝게 뒀더니 **벽과 소품이 통째로 사라졌다.**
   빛 밖은 잠겨야 하지만 **아무것도 안 보이면 없는 것과 같다** — D2 도 방 끝의 벽은
   어렴풋이 보인다. 마지막 단계를 조금 들어 올려 「어둠 속에 뭔가 있다」로 만든다. */
/* ★ 맨 바깥을 한 번 더 들었다(#191410 → #241d16). 병수님: "배경이 비어있는 부분도
   있네" — 소품을 더 뿌려도 **빛이 안 닿으면 없는 것과 같다.** 어둠은 지키되
   「저 멀리 뭔가 서 있다」가 보이는 선까지만 올린다. */
const LIT = ["#efe2c8", "#a8977c", "#5e5142", "#3a3025", "#241d16"];

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

/* ★ 마을에 **던전 돌바닥**을 그대로 깔았던 것이 잘못이었다(병수님: "그냥 바닥을
   제대로 만들어"). 실내 돌바닥 위에 천막이 서 있으면 마을이 아니라 지하 창고다.
   바닥을 **두 벌** 들고 장면마다 바꾼다 — 마을은 흙길, 던전은 돌바닥. */
const tileSets = {};       // 이름 → 네 가지 변형
let tiles = [], floorReady = false;

export function useFloor(name) {
  if (tileSets[name]) { tiles = tileSets[name]; floorReady = true; }
}

/** 바닥 타일을 받아 **네 가지 변형으로 미리 구워 둔다.**
 *  ★ 한 장을 그대로 반복하면 **격자가 보인다** — 같은 얼룩이 32px 마다 되풀이되니
 *  눈이 그 주기를 금방 찾아낸다. 좌우·상하로 뒤집은 네 장을 자리마다 골라 쓰면
 *  주기가 128px 로 늘어나고 무늬가 훨씬 덜 읽힌다. 뒤집기는 **공짜**다(새로 굽지 않는다).
 *
 *  ★ 굽는 김에 **밝기도 올린다.** PixelLab 이 준 crypt 타일은 평균 밝기가 41(255 중)
 *  이라 조명을 곱하면 거의 검정이 된다. 어둠은 조명이 만들어야 하므로 재료는 밝게
 *  둔다 — 그래야 빛 안에서 살아나고 빛 밖에서 잠긴다. */
export function loadFloor(src, boost = 1.8, name = "crypt") {
  const im = new Image();
  LOAD.total++;
  im.onload = () => {
    const t = im.width;
    const made = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => {
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
    tileSets[name] = made;
    if (!tiles.length) { tiles = made; floorReady = true; }
    LOAD.done++;
  };
  /* ★ 실패 경로에서 done 을 안 올렸더니 **1115/1116 에서 영영 멈췄다.**
     로딩 막대는 「끝난 것」을 세는 것이지 「성공한 것」을 세는 게 아니다 —
     실패도 끝난 것이다. 안 그러면 파일 하나가 없을 때 화면이 영원히 안 걷힌다. */
  im.onerror = () => { LOAD.done++; };
  im.src = src;
}

/** 전장 바닥 한 판. **타일 → 빛** 순서로 얹는다. */
export function drawGround(ctx, w, h, cx, cy, radius, squash, sc, scatter) {
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

  /* ②' 소품 — **조명보다 먼저** 그린다. 그래야 빛 밖의 것은 어둠에 잠기고 빛이 닿은
     것만 보인다. 나중에 그리면 어둠 위에 둥둥 떠서 스티커가 된다.
     ★ 마을에서 이걸 밖에서 따로 부르다가 **조명 뒤로 밀려** 어둠 속 소품이 또렷하게
     보였다. 부르는 곳이 둘이면 순서도 둘이 된다 — 여기 하나로 모은다. */
  if (scatter) drawScatter(ctx, cx, cy, sc, squash, w, h,
                           scatter.clear, scatter.density, scatter.set);

  /* ③ 횃불빛 — 저해상도로 구워 곱하기로 덮는다. 곱하기라 바닥 무늬가 어둠 속에서
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


/* ══ 던전 소품 ══ **바닥만 깔면 끝없는 벌판이다.**
   벽이 있어야 「방」이고, 세로로 선 것(기둥)이 있어야 공간에 높이가 생기고,
   관·뼈무더기·화로가 있어야 **사람이 죽었던 자리**로 읽힌다.

   ★ PixelLab 이 준 조각들이 **청회색**으로 나왔다("no blue" 를 적었는데도).
   다시 굽는 대신 여기서 톤을 맞춘다 — sepia 를 조금 섞어 바닥·구슬과 같은
   따뜻한 회갈색으로 끌어온다. 재료를 고치는 것보다 **한 군데서 톤을 잡는 편**이
   낫다(조각이 늘어도 손댈 곳은 여기 하나다). */
/* wall 은 이제 안 쓴다 — **벽이 곧 테두리**라서 뺐다. 파일은 남겨 둔다(방을 다시
   만들 일이 생기면 쓴다). */
const DECOR = ["pillar", "coffin", "bones", "brazier", "rubble"];
/* ★ 마을에 관·뼈무더기를 뿌린 것이 잘못이었다(병수님: "쓸데 없는 무덤 같은거 없애라").
   **관이 굴러다니는 곳은 마을이 아니라 공동묘지다.** 마을에는 마을 것을 둔다. */
const TOWN_DECOR = ["barrel", "crate", "cart", "well", "sacks"];
/** 싸움터 한가운데는 비운다 — 소품이 싸움을 가리면 판이 안 읽힌다. */
const RING_HOLD_CLEAR = 190;
const decor = {};
let decorLeft = DECOR.length, decorReady = false;

function loadOne(n, dir) {
  const im = new Image();
  LOAD.total++;
  im.onload = () => {
    const c = document.createElement("canvas");
    c.width = im.width; c.height = im.height;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.filter = "sepia(0.42) saturate(1.15) brightness(0.95)";
    g.drawImage(im, 0, 0);
    decor[n] = c; LOAD.done++;
  };
  im.onerror = () => { LOAD.done++; };
  im.src = `${dir}/${n}.png`;
}

export function loadDecor(dir = "assets/decor") {
  for (const n of TOWN_DECOR) loadOne(n, "assets/town");
  for (const n of DECOR) {
    const im = new Image();
    LOAD.total++;
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.width; c.height = im.height;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.filter = "sepia(0.42) saturate(1.15) brightness(0.92)";
      g.drawImage(im, 0, 0);
      decor[n] = c;
      if (--decorLeft === 0) decorReady = true;
      LOAD.done++;
    };
    im.onerror = () => { if (--decorLeft === 0) decorReady = true; LOAD.done++; };
    im.src = `${dir}/${n}.png`;
  }
}

/* ══════════════════════════════════════════════════════════════
   **맵에 끝이 없다.** — 병수님: "맵이 무한대로 큰건데, 내가 보이는 화면은 그 중에
   일부분(중앙부분)으로 만들 수 없나? (실제 무한대는 아니고, 화면을 꽉채우고
   테두리가 없는거지)"
   ──────────────────────────────────────────────────────────────
   앞서는 **방**을 지었다 — 위에 벽을 세우고 소품을 화면 안에 열두 개 박았다.
   그러면 화면이 커질 때마다 「끝」이 보이고, 벽이 곧 **테두리**가 된다.

   이제 **격자에 뿌린다.** 월드를 CELL 크기 칸으로 나누고, 칸마다 좌표를 섞은 값으로
   놓을지 말지·무엇을·어디에 놓을지를 정한다. 그래서:

     · **끝이 없다** — 화면이 넓어지면 칸이 더 보일 뿐이다. 벽도 울타리도 없다
     · **언제나 같다** — 난수가 아니라 좌표에서 나온 값이라, 같은 자리는 늘 같다
     · **공짜다** — 보이는 칸만 돈다. 맵을 미리 만들어 들고 있지 않는다

   싸움터 한가운데는 비워 둔다 — 소품이 싸움을 가리면 판이 안 읽힌다.
   ══════════════════════════════════════════════════════════ */

const CELL = 165;                      // 칸 하나의 월드 크기
const SCATTER = ["coffin", "bones", "brazier", "rubble", "pillar", "bones", "rubble"];

/* ══ 접지 ══ 병수님: "던전입구/상인/대장간 같은거또 둥둥 떠잇네".
   ★★ **캐릭터에는 이미 고쳤던 것을 소품·건물에는 안 옮겼다.** PixelLab 이 준 그림은
   캔버스 아래에 투명 여백을 두고 그려져 있어서, 이미지 **바닥**을 지면으로 삼으면
   그 여백만큼 떠 보인다. 캐릭터는 알파 경계를 재서 발을 맞췄는데(sprite8 footMetrics)
   소품은 `y - im.height` 로 그대로 놓고 있었다.

   **같은 문제의 같은 처방을 다른 곳에 옮기지 않은 것** — 이게 이번 지적의 뿌리다.
   그래서 여기 한 함수를 두고 **소품·건물·NPC 가 전부 이걸 지난다.** */
export function footOf(cv) {
  if (cv._foot) return cv._foot;
  const g = cv.getContext("2d");
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let bot = 0, lo = cv.width, hi = 0;
  for (let y = cv.height - 1; y >= 0; y--) {
    let any = false;
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 8) { any = true; if (x < lo) lo = x; if (x > hi) hi = x; }
    }
    if (any && !bot) bot = y + 1;                 // 아래에서 처음 만난 불투명 줄 = 발
  }
  cv._foot = { bot: bot || cv.height, cx: (lo + hi) / 2 || cv.width / 2,
               w: Math.max(6, hi - lo + 1) };
  return cv._foot;
}

/** 발을 지면에 맞춰 놓고, **발 폭에 맞춘 그림자**를 깐다.
 *  그림자를 이미지 폭으로 그리면 넓적한 놈은 그림자가 몸 밖으로 삐져나온다. */
/* ★★ 병수님: "좀 더 축소 시켜야 할듯,, 아직도 확대된느낌".
   **소품·건물은 배율과 무관하게 원본 크기로 그리고 있었다.** 캐릭터는 us 로 키우고
   줄였는데 건물은 176px 그대로였다 — 그래서 화면을 아무리 넓혀도 건물만 커 보였다.
   여기 공통 배율(ART)을 두고 **월드에 놓이는 모든 그림이 이걸 지난다.**
   정수 배로만 줄인다 — 소수 배로 줄이면 픽셀이 뭉개진다(0.75 는 4px 이 3px 이 되어
   그나마 규칙적이다). */
export const ART = { s: 0.75 };

export function place(ctx, cv, gx, gy, shadow = true) {
  const f = footOf(cv);
  const k = ART.s;
  const w = Math.round(cv.width * k), h = Math.round(cv.height * k);
  const px = Math.round(gx - f.cx * k), py = Math.round(gy - f.bot * k);
  if (shadow) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.beginPath();
    /* ★ 그림자를 발 폭에 **비례**로만 그렸더니 건물(176px)에 반경 74 짜리 먹구름이
       깔렸다. 큰 것일수록 비율을 줄인다 — 큰 물건은 바닥에 닿는 면이 폭만큼 넓지 않다. */
    const sk = f.w > 96 ? 0.26 : f.w > 56 ? 0.34 : 0.42;
    ctx.ellipse(Math.round(gx), Math.round(gy) - 1,
                f.w * sk * k, f.w * sk * k * 0.36, 0, 0, 6.284);
    ctx.fill();
    ctx.restore();
  }
  ctx.drawImage(cv, 0, 0, cv.width, cv.height, px, py, w, h);
}

/** 좌표를 섞어 **늘 같은 값**을 낸다(난수가 아니다 — 난수면 매 프레임 자리가 바뀐다). */
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** 보이는 칸에 소품을 뿌린다. `clear` 안쪽(싸움터)은 비워 둔다. */
export function drawScatter(ctx, cx, cy, sc, squash, w, h, clear = 0, density = 58, set = SCATTER) {
  if (!decorReady) return;
  ctx.imageSmoothingEnabled = false;
  const halfW = (w / 2) / sc + CELL, halfH = (h / 2) / (sc * squash) + CELL;
  const gx0 = Math.floor(-halfW / CELL), gx1 = Math.ceil(halfW / CELL);
  const gy0 = Math.floor(-halfH / CELL), gy1 = Math.ceil(halfH / CELL);

  /* **뒤에 있는 것부터** 그린다(y 가 작은 칸부터) — 안 그러면 위쪽 소품이 아래쪽을 덮는다. */
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const rnd = hash2(gx, gy);
      if (rnd % 100 >= density) continue;                    // 대부분의 칸은 빈 채로 둔다
      const name = set[(rnd >> 7) % set.length];
      const im = decor[name]; if (!im) continue;
      /* 칸 한가운데에 딱 놓으면 **격자가 보인다.** 칸 안에서 흔들어 놓는다. */
      const wxw = gx * CELL + ((rnd >> 11) % CELL) - CELL / 2;
      const wyw = gy * CELL + ((rnd >> 17) % CELL) - CELL / 2;
      if (clear && Math.hypot(wxw, wyw) < clear) continue;   // 싸움터는 비운다
      /* ★ 여기도 place() 로 통일한다 — 이미지 바닥을 지면으로 삼으면 그림 아래
         투명 여백만큼 뜬다(병수님: "둥둥 떠잇네"). */
      place(ctx, im, cx + wxw * sc, cy + wyw * sc * squash);
    }
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
