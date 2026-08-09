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

   ★★ **횃불빛은 걷어냈다**(병수님: "지도 내 주위로 광원? 같은거 없애면 안됨?").
   어둠은 분위기를 만들지만 **볼 것을 가린다** — 소품을 아무리 뿌려도 빛 밖이면 없는
   것과 같았고, 배율을 건드릴 때마다 빛 반경이 같이 흔들려 화면이 밝아졌다 어두워졌다
   했다. **규칙이 하나 줄면 어긋날 곳도 하나 준다.**
   어두운 결은 **바닥 밝기 자체**로 지킨다(loadFloor 의 boost).
   ══════════════════════════════════════════════════════════ */

const tileSets = {};       // 이름 → 네 가지 변형
let tiles = [], floorReady = false;
/* ★★ **마을에 던전 돌바닥이 깔려 있었다**(병수님: "마을과 던전 타일도 구분이 필요").
   타일은 확실히 다른데(던전 평균밝기 41 회색돌 · 마을 96 갈색흙) 화면에는 던전 것이
   나왔다 — `loadFloor` 는 **비동기**라 처음 `useFloor("town")` 을 부를 때 아직
   아무것도 안 왔고, 나중에 먼저 도착한 crypt 가 기본으로 눌러앉았기 때문이다.
   그래서 **원하는 이름을 적어 두고**, 그 이름이 도착할 때 그때 갈아 끼운다. */
let wanted = "crypt";

export function useFloor(name) {
  wanted = name;
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
    if (name === wanted || !tiles.length) { tiles = made; floorReady = true; }
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
  /* 빛은 **소품을 다 놓은 뒤** 한 번에 얹는다(더하기라 순서가 결과를 안 바꾸지만,
     한 곳에서 부르면 빠뜨릴 일이 없다). */
  drawGlows(ctx, squash);

  /* ★★ 병수님: "지도 내 주위로 광원? 같은거 없애면 안됨?"
     **횃불빛을 걷는다.** 어둠은 분위기를 만들지만 **볼 것을 가린다** — 소품을 뿌려도
     빛 밖이면 없는 것과 같았고, 배율을 건드릴 때마다 빛 반경도 같이 흔들려 화면이
     밝아졌다 어두워졌다 했다. 규칙이 하나 줄면 어긋날 곳도 하나 준다.
     대신 **바닥 밝기 자체를 낮춰** 어두운 결은 지킨다(loadFloor 의 boost). */
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
    g.filter = "sepia(0.42) saturate(1.05) brightness(0.72)";
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
/* ★ 화로를 일곱에 하나만 뿌렸더니 **한 화면에 한두 개**뿐이라 던전이 여전히 캄캄했다.
   불이 곧 조명이니 **불의 밀도가 곧 밝기**다 — 둘로 늘린다. */
const SCATTER = ["coffin", "bones", "brazier", "rubble", "pillar", "brazier", "rubble"];

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

/* ══ 불빛 ══ 병수님: "조명이 너무 없으니까 허전하긴하네".
   ★★ 앞서 **화면 전체를 덮는 어둠**을 걷어냈다 — 그건 볼 것을 가렸기 때문이다.
   그렇다고 아무 빛도 없으면 평평한 그림이 된다. **답은 반대쪽에 있다:
   어둠을 덮지 말고, 불이 있는 자리에서 빛이 「나오게」 한다.**
     · 가리는 게 아니라 **더하는** 것이라(lighter) 어두워지는 곳이 없다
     · 불이 있는 곳에만 있으니 **왜 밝은지**가 화면에 보인다(모닥불·화로·화덕)
     · 계단으로 그린다 — 부드러운 원은 이 화면에서 유일한 매끈함이 된다 */
/* ★ 8px 칸에 세 단계로 그렸더니 **경계가 네모로 각졌다**. 칸을 줄이고(6) 단계를
   늘려(다섯) 가장자리를 완만하게 — 계단은 남기되 「덩어리」로는 안 보이게. */
const GLOW_PX = 6;                    // 빛 한 칸(화면 픽셀)
let glows = [];                       // 이번 프레임에 빛날 자리

export function addGlow(gx, gy, r, warm = 1) { glows.push([gx, gy, r, warm]); }

/** 쌓인 빛을 한 번에 얹는다. **부르는 시점이 중요하다** — addGlow 를 부른 뒤에
 *  불러야 그 프레임에 그려진다(마을은 drawTown 이 끝난 뒤 main 이 부른다). */
export function drawGlows(ctx, squash) {
  if (!glows.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [gx, gy, r, warm] of glows) {
    /* 저해상도 격자에 **계단으로** 찍는다. 가운데가 제일 밝고 네 단계로 떨어진다. */
    const n = Math.ceil(r / GLOW_PX);
    for (let iy = -n; iy <= n; iy++) {
      /* ★ 높이를 `ceil(GLOW_PX*squash)` 로 잡았더니 **줄마다 1px 씩 겹쳤다.**
         더하기 합성이라 겹친 줄만 두 배로 밝아져 **가로줄무늬**가 보였다.
         칸의 위/아래를 각각 반올림해서 잡으면 위칸의 끝과 아랫칸의 시작이
         정확히 맞물린다 — 겹침도 틈도 없다. */
      const y0 = Math.round(gy + iy * GLOW_PX * squash);
      const y1 = Math.round(gy + (iy + 1) * GLOW_PX * squash);
      if (y1 === y0) continue;
      for (let ix = -n; ix <= n; ix++) {
        /* 화면에서의 세로 거리는 이미 squash 가 곱해져 있다(y0). 그러니 여기서
           또 나누면 **두 번 눌린 타원**이 된다 — r 로만 나눈다. */
        const dx = (ix * GLOW_PX) / r, dy = (iy * GLOW_PX) / r;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        const step = d < 0.28 ? 5 : d < 0.45 ? 4 : d < 0.62 ? 3 : d < 0.78 ? 2 : d < 0.92 ? 1 : 0;
        if (!step) continue;
        const a = [0, 0.022, 0.042, 0.068, 0.10, 0.14][step] * warm;
        ctx.fillStyle = `rgba(255,180,90,${a})`;
        ctx.fillRect(Math.round(gx + ix * GLOW_PX), y0, GLOW_PX, y1 - y0);
      }
    }
  }
  ctx.restore();
  glows = [];
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
      const px2 = cx + wxw * sc, py2 = cy + wyw * sc * squash;
      place(ctx, im, px2, py2);
      // 불이 든 것은 **제 둘레를 밝힌다** — 왜 밝은지가 화면에 보여야 한다
      if (name === "brazier") addGlow(px2, py2 - 12 * ART.s, 190 * sc, 1.05);
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
