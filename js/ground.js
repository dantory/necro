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
/* 검수기가 **구워진 것**을 그대로 읽는다(tools/v62_grain.mjs) — 원본 png 를 밖에서
   재면 boost·saturate·tone 열둘을 안 거쳐 사람이 보는 것과 다른 수가 나온다. */
globalThis.__floorTiles = tileSets;
let tiles = [], floorReady = false;
/* ★★ **마을에 던전 돌바닥이 깔려 있었다**(병수님: "마을과 던전 타일도 구분이 필요").
   타일은 확실히 다른데(던전 평균밝기 41 회색돌 · 마을 96 갈색흙) 화면에는 던전 것이
   나왔다 — `loadFloor` 는 **비동기**라 처음 `useFloor("town")` 을 부를 때 아직
   아무것도 안 왔고, 나중에 먼저 도착한 crypt 가 기본으로 눌러앉았기 때문이다.
   그래서 **원하는 이름을 적어 두고**, 그 이름이 도착할 때 그때 갈아 끼운다. */
let wanted = "crypt";
/* ══ 구역 색 기운 ══ (ROADMAP G-b) 구운 타일은 셋(crypt·bone·camp)뿐인데 구역은 일곱이다.
   타일을 넷 더 굽는 것은 반나절 일이고, 그러고도 여덟 번째 구역에서 같은 벽을 만난다.
   대신 **다 칠하고 난 바닥에 색을 한 번 곱한다** — 굽는 캔버스 안에서 한 번뿐이라
   매 프레임 값이 아니다(캐시 열쇠에 tint 를 넣어 구역이 바뀌면 다시 굽게 했다).
   ★ **곱하기**(multiply)다. 위에 반투명으로 덮으면 어두운 데가 뿌옇게 들뜬다 —
     곱하면 밝은 데만 물들고 검은 데는 검은 채로 남아 던전다움이 안 깨진다.
   ★ 빛(glow)은 이 뒤에 얹히므로 **횃불은 물들지 않는다**(drawGround 가 따로 부른다). */
let tintCol = null;
const TINT_A = 0.34;      // 색이 「필터를 끼운 것」으로 보이기 시작하는 선 바로 아래

/* ══ 층마다 다른 방 ══ (2026-08-24 · V-17)
   바닥·얼룩·소품은 전부 **칸 좌표를 섞은 값**(hash2)으로 정해진다. 그런데 이 판은
   **화면이 안 움직인다**(cx·cy 고정) — 그래서 층을 내려가도 hash2 에 들어가는 수가
   똑같아 **1층과 2층이 픽셀 단위로 같은 방**이었다. 기둥도 화로도 상자도 그 자리다.
   ★ 새 에셋도 새 배치 규칙도 필요 없다 — **같은 무늬밭의 다른 자리를 보면 된다.**
     칸 좌표에 층마다 다른 정수를 더해 「카메라가 저 멀리로 옮겨 간 것」처럼 만든다.
     소품 규칙(밀도·굴림·판 뒤 비우기)은 그대로라 새 결함이 생길 자리가 없다.
   ★ 마을은 0 이다 — 마을 배치는 앵커(상인·대장간)에 맞춰 놓은 것이라 움직이면 안 된다. */
let layoutOX = 0, layoutOY = 0;
export function useLayout(seed) {
  const n = (seed | 0);
  if (!n) { layoutOX = layoutOY = 0; return; }
  /* 두 축을 **서로 다른 소수**로 흩어 놓는다 — 같은 수를 쓰면 층이 대각선으로만
     밀려 「같은 방을 비스듬히 본 것」이 된다. 범위는 ±4000 칸(660k 월드) 로 넉넉하다. */
  const h = hash2(n * 2654435761, n * 40503 + 977);
  layoutOX = ((h >>> 3) % 8000) - 4000;
  layoutOY = ((h >>> 17) % 8000) - 4000;
}

export function useFloor(name, tint = null) {
  wanted = name; tintCol = tint || null;
  if (tileSets[name]) { tiles = tileSets[name]; floorReady = true; }
}

/** 구운 타일의 **높낮이만** con 배로 벌린다 — 축은 **제 채널 평균**이다.
 *  ★ CSS `contrast()` 는 축이 127.5 에 못 박혀 있어 어두운 타일을 더 어둡게 민다.
 *    그러면 밝기 손잡이를 다시 만져야 하고 둘이 또 엉킨다 — 축을 제 평균에 두면
 *    평균이 안 움직이므로 `boost` 는 손댈 필요가 없다.
 *  ★ 채널마다 따로 미는 이유는 색 균형을 지키기 위해서다. 밝기 하나로 밀면
 *    RGB(69,5,32) 처럼 **한 채널만 서 있는 색**이 더 새빨개진다(V-5 가 겪은 그것).
 *  타일은 32×32 한 장이고 **한 번만** 굽는다 — 프레임당 값은 0 이다. */
function grain(g, t, con) {
  const img = g.getImageData(0, 0, t, t), d = img.data, n = t * t;
  for (let c = 0; c < 3; c++) {
    let m = 0;
    for (let i = 0; i < n; i++) m += d[i * 4 + c];
    m /= n;
    for (let i = 0; i < n; i++) {
      const v = m + (d[i * 4 + c] - m) * con;
      d[i * 4 + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  g.putImageData(img, 0, 0);
}

/** 바닥 타일을 받아 **네 가지 변형으로 미리 구워 둔다.**
 *  ★ 한 장을 그대로 반복하면 **격자가 보인다** — 같은 얼룩이 32px 마다 되풀이되니
 *  눈이 그 주기를 금방 찾아낸다. 좌우·상하로 뒤집은 네 장을 자리마다 골라 쓰면
 *  주기가 128px 로 늘어나고 무늬가 훨씬 덜 읽힌다. 뒤집기는 **공짜**다(새로 굽지 않는다).
 *
 *  ★ 굽는 김에 **밝기도 올린다.** PixelLab 이 준 crypt 타일은 평균 밝기가 41(255 중)
 *  이라 조명을 곱하면 거의 검정이 된다. 어둠은 조명이 만들어야 하므로 재료는 밝게
 *  둔다 — 그래야 빛 안에서 살아나고 빛 밖에서 잠긴다. */
/*  ★★ `sat` 을 밖에서 준다(V-5). 여태 채도는 0.9 로 못 박혀 있었는데, **재질마다
 *  타고난 채도가 다르다** — 새로 구운 「마른 피의 골」은 원본이 RGB(69,5,32) 라
 *  평균밝기를 다른 구역과 똑같이 맞춰도 화면에서는 혼자 새빨갰다(최대채널 86 대 42~55).
 *  평균은 **빨강 하나만 서 있는 색**을 못 본다 — 그러니 밝기 말고 채도도 손잡이여야 한다. */
/*  ★★ `con`(대비) 도 밖에서 준다(V-62). `boost` 는 **곱하기**라 평균만 내리는 게 아니라
 *  **무늬의 높낮이도 같은 배로 깎는다.** 원본이 밝은 camp 는 화면 44 를 맞추려 0.39 를
 *  곱해야 하는데, 그러면 퍼짐 15 가 5.9 로 주저앉아 「매끈한 갈색 종이」가 된다 —
 *  원본이 이미 어두운 crypt(0.95)는 무늬가 거의 그대로다. **같은 화면 밝기인데
 *  한쪽만 무늬를 잃는다.** 그래서 밝기와 대비를 갈라, 구운 뒤 **제 평균을 축으로**
 *  높낮이만 되돌린다(평균은 안 움직이므로 밝기는 그대로다). */
export function loadFloor(src, boost = 1.8, name = "crypt", sat = 0.9, con = 1) {
  const im = new Image();
  LOAD.total++;
  im.onload = () => {
    const t = im.width;
    /* ★★ 병수님: "타일이 너무 단순 반복인거 같긴한데". 뒤집기 넷만으로는 모자랐다 —
       **뒤집어도 밝기와 얼룩이 똑같아서** 눈이 같은 조각을 알아본다. 밝기를 세 단계로
       흔든 것을 함께 구워 **열두 가지**로 늘린다. 굽는 것은 한 번뿐이라 공짜다
       (매 프레임 filter 를 거는 것은 비싸다).
       ★ 처음엔 ±12% 로 흔들고 **타일마다** 골랐더니 이번엔 **체커보드**가 됐다 —
       반복 하나를 다른 반복으로 바꾼 셈이다. 폭을 ±6% 로 줄이고, 밝기는 타일이 아니라
       **네 칸짜리 덩어리**로 고른다(아래 drawGround) — 실제 바닥의 얼룩도 타일 단위로
       지지 않는다. */
    const made = [];
    /* ★ 풀밭처럼 **고른 바닥**에서는 ±6% 도 큰 네모로 보인다(흙에서는 안 보였다).
       ±3% 로 줄인다 — 무늬가 약한 재질일수록 흔들 폭도 작아야 한다. */
    for (const tone of [0.97, 1.0, 1.03])
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const c = document.createElement("canvas");
        c.width = t; c.height = t;
        const g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        g.filter = `brightness(${boost * tone}) saturate(${sat})`;
        g.translate(sx < 0 ? t : 0, sy < 0 ? t : 0);
        g.scale(sx, sy);
        g.drawImage(im, 0, 0);
        if (con !== 1) grain(g, t, con);
        made.push(c);
      }
    /* ★ 같은 이름으로 두 번 부르면 **덮지 않고 이어 붙인다** — 풀 타일 12 + 흙 타일 12
       = 24 가지가 되어 한 바닥 안에서 풀과 흙이 섞인다(참고 화면이 그렇다:
       풀밭 29% 초록 = 나머지는 밟아 닳은 흙길). */
    tileSets[name] = (tileSets[name] || []).concat(made);
    if (name === wanted || !tiles.length) { tiles = tileSets[name]; floorReady = true; }
    LOAD.done++;
  };
  /* ★ 실패 경로에서 done 을 안 올렸더니 **1115/1116 에서 영영 멈췄다.**
     로딩 막대는 「끝난 것」을 세는 것이지 「성공한 것」을 세는 게 아니다 —
     실패도 끝난 것이다. 안 그러면 파일 하나가 없을 때 화면이 영원히 안 걷힌다. */
  im.onerror = () => { LOAD.done++; };
  im.src = src;
}

/* ══ Wang 바닥 ══ 풀과 흙을 **한 바닥 안에서** 섞는다.
   타일을 통째로 갈아 끼우면 경계가 직각이 되어 네모 덩어리로 보인다(겪었다).
   타일셋은 원래 **모서리 매칭(Wang)** 이라 16 장이 모든 모서리 조합을 갖고 있다 —
   격자의 **꼭짓점마다** 재질을 정하고, 그 네 꼭짓점에 맞는 타일을 고르면
   가장자리가 저절로 너덜너덜해진다(그게 이 16 장의 존재 이유다).

   ★ 메타의 라벨이 뒤집혀 있다 — 초록 비율로 재 보니 corners 의 `upper` 가 **풀**,
     `lower` 가 **흙**이었다. 그래서 맵을 만들 때 1=흙 으로 뒤집어 적었다
     (assets/floor/meadow_wang.json). */
let wang = null, wangTiles = null;

/* ══ 관심점(앵커) ══ 병수님: "지금 맵이 자연스럽게 하나의 지역처럼 보이냐? 뭔가 어설픈데"
   — 아니었다. 어설픈 이유는 에셋이 아니라 **배치**였다:
     ① 모든 것이 **같은 확률로** 흩어져 있다(야영지는 무리를 짓는다)
     ② 흙길이 목적지와 무관하다(길은 사람이 **다니는 자리**에 난다)
     ③ 가장자리로 갈수록 안 비어서 **중심**이 안 생긴다
   셋 다 「어디가 중요한 자리인가」를 코드가 모르기 때문이다. 그래서 **앵커**를 준다:
   입구·상인·대장간·모닥불의 월드 좌표. 길은 앵커 **사이**에 내고, 소품은 앵커
   **가까이** 모으고, 멀어지면 비운다. */
let anchors = [];
export function setAnchors(list) { anchors = list || []; }

/** 점에서 선분까지의 거리 — 길은 앵커를 잇는 **선**이라 이게 필요하다. */
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t, qy = ay + dy * t;
  return Math.hypot(px - qx, py - qy);
}

/** 앵커까지의 최단 거리(무리 짓기·비우기에 쓴다). */
function nearAnchor(x, y) {
  let m = Infinity;
  for (const a of anchors) m = Math.min(m, Math.hypot(x - a[0], y - a[1]));
  return m;
}
export function loadWang(sheetSrc, mapSrc, boost = 1, name = "town") {
  LOAD.total += 2;
  fetch(mapSrc).then((r) => r.json()).then((m) => { wang = m; LOAD.done++; })
               .catch(() => { LOAD.done++; });
  const im = new Image();
  im.onload = () => {
    const t = im.width / 4;
    wangTiles = [];
    for (let i = 0; i < 16; i++) {
      const c = document.createElement("canvas");
      c.width = t; c.height = t;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.filter = `brightness(${boost}) saturate(0.95)`;
      g.drawImage(im, (i % 4) * t, ((i / 4) | 0) * t, t, t, 0, 0, t, t);
      wangTiles.push(c);
    }
    LOAD.done++;
  };
  im.onerror = () => { LOAD.done++; };
  im.src = sheetSrc;
}

/** 꼭짓점이 흙인가.
 *  ★ 꼭짓점마다 **따로** 뽑았더니 흙이 **미로**가 됐다 — 확률이 같아도 주기가 잘면
 *  덩어리가 안 생기고 실이 된다. 두 겹으로 뽑는다:
 *    ① 네 칸짜리 **큰 덩어리**가 흙인지 정하고
 *    ② 그 안에서 칸마다 조금씩 흔들어 **가장자리를 너덜너덜하게** 한다
 *  (덩어리 밖에도 아주 가끔 흙이 나오게 두면 길이 자연스럽게 이어진다.) */
function dirtAt(vx, vy, wx, wy) {
  const edge = hash2(vx * 3 + 11, vy * 5 + 7) % 100;
  /* ★ 길은 **앵커를 잇는 선** 둘레다 — 사람이 다닌 자리가 닳는다.
     선에서 멀어질수록 확률이 떨어져 가장자리가 저절로 너덜너덜해진다. */
  if (anchors.length > 1) {
    /* ★ 처음엔 격자 인덱스에 상수를 곱해 월드 좌표로 삼았는데, **격자 인덱스는
       화면 기준**(왼쪽 끝이 0)이라 앵커와 축이 안 맞아 흙이 낱개 네모로 흩어졌다.
       월드 좌표는 부르는 쪽에서 넘겨받는다. */
    let best = Infinity;
    for (let i = 0; i < anchors.length; i++)
      for (let j = i + 1; j < anchors.length; j++)
        best = Math.min(best, distSeg(wx, wy, anchors[i][0], anchors[i][1],
                                              anchors[j][0], anchors[j][1]));
    /* ★★ 건물이 지형에서 뜬다(병수님: "건물이 지형과 너무 동떨어진 느낌"). 원인은
       **에셋이 제 바닥을 달고 있는 것**이다 — 상인은 돌바닥판, 대장간은 풀+흙 판.
       판을 잘라내면 그림이 상하니 **그 판이 놓일 땅을 만든다**: 건물 발치를 통째로
       흙으로 만들면 판이 풀과 부딪히지 않고 「닳아서 드러난 땅」으로 읽힌다. */
    if (nearAnchor(wx, wy) < 110) return true;       // 건물 발치는 맨땅
    if (nearAnchor(wx, wy) < 165) return edge < 78;  // 그 둘레는 반쯤
    if (best < 26) return edge < 92;                 // 길 한복판
    if (best < 52) return edge < 52;                 // 길가
    if (best < 80) return edge < 16;                 // 밟힌 자국
    /* ★ 들판에 3% 로 흙을 흩뿌렸더니 **낱개 네모**가 쓰레기처럼 남았다 —
       길에서 먼 곳은 그냥 풀이어야 「길」이 길로 읽힌다. */
    return false;                                    // 길에서 멀면 그냥 풀
  }
  const blob = (hash2(vx >> 2, vy >> 2) % 100) < 30;
  return blob ? edge < 86 : edge < 7;
}

/** 꼭짓점 재질에서 **낱개 섬**을 지운다.
 *  ★ 꼭짓점을 하나씩 따로 뽑으면 소금·후추가 남는다. 풀 한 칸이 흙 한복판에 혼자
 *    있으면 Wang 타일 넉 장이 둥근 모서리를 맞대어 **둥근 초록 네모**가 되고,
 *    그건 지형이 아니라 **스티커**로 읽힌다(2026-08-25 마을에서 35 덩이).
 *  ★ 이미 겪은 결함이다 — `dirtAt` 은 「들판에 3% 로 흙을 흩뿌렸더니 낱개 네모가
 *    쓰레기처럼 남았다」고 적고 **흙 쪽만** 막아 두었다. 반대쪽(흙 위의 풀)에는
 *    그 고침이 안 옮겨져 있었다([[carry-fixes-forward]]).
 *  ★ 미는 법: 이웃 넷 중 **셋 이상이 다르면** 이웃을 따른다. 두 번 민다 —
 *    한 번이면 셋이 줄지어 있을 때 가운데 한 칸이 살아남아 섬이 다시 생긴다.
 *    한 칸짜리 튀어나옴만 깎이므로 길 가장자리의 너덜너덜함은 남는다. */
function deIsland(mat, cols, rows, passes = 2) {
  for (let p = 0; p < passes; p++) {
    const src = mat.slice();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const me = src[j * cols + i];
        let diff = 0, n = 0;
        if (i > 0)        { n++; if (src[j * cols + i - 1] !== me) diff++; }
        if (i < cols - 1) { n++; if (src[j * cols + i + 1] !== me) diff++; }
        if (j > 0)        { n++; if (src[(j - 1) * cols + i] !== me) diff++; }
        if (j < rows - 1) { n++; if (src[(j + 1) * cols + i] !== me) diff++; }
        if (n >= 3 && diff >= 3) mat[j * cols + i] = me ? 0 : 1;
      }
    }
  }
  return mat;
}

/** Wang 바닥을 깐다. 못 쓰면 false 를 돌려주고 기존 타일 방식으로 넘어간다.
 *  ★ 꼭짓점 재질을 **먼저 한 판 다 뽑아 두고** 섬을 지운 뒤에 깐다. 예전에는
 *    칸마다 네 꼭짓점을 그 자리에서 뽑아 이웃을 볼 수가 없었다(같은 꼭짓점을
 *    네 번씩 뽑기도 했다 — 이제 한 번이다). */
function drawWang(ctx, w, h, cx, cy, sc, squash) {
  if (!wang || !wangTiles) return false;
  const t = wangTiles[0].width;
  ctx.imageSmoothingEnabled = false;
  const ox = Math.floor(cx) % t - t, oy = Math.floor(cy) % t - t;
  const cw = Math.ceil((w + t - ox) / t), ch = Math.ceil((h + t - oy) / t);
  const cols = cw + 1, rows = ch + 1;           // 칸이 cw×ch 면 꼭짓점은 하나씩 더
  const mat = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    /* 꼭짓점의 **월드 좌표** — 앵커와 같은 자에서 재야 길이 목적지에 닿는다. */
    const wy = (oy + j * t - cy) / (sc * squash);
    for (let i = 0; i < cols; i++) {
      const wx = (ox + i * t - cx) / sc;
      mat[j * cols + i] = dirtAt(i, j, wx, wy) ? 1 : 0;
    }
  }
  deIsland(mat, cols, rows);
  for (let gy = 0; gy < ch; gy++) {
    for (let gx = 0; gx < cw; gx++) {
      const key = mat[gy * cols + gx] + "" + mat[gy * cols + gx + 1] + "" +
                  mat[(gy + 1) * cols + gx] + "" + mat[(gy + 1) * cols + gx + 1];
      const pos = wang[key];
      if (!pos) continue;
      ctx.drawImage(wangTiles[pos[1] * 4 + pos[0]], ox + gx * t, oy + gy * t);
    }
  }
  return true;
}

/* ★★ **바닥은 매 프레임 새로 칠할 이유가 없다**(2026-08-15 병수님 「렉걸리는거좀 우선으로」).
   칠하는 횟수를 세어 보니 **한 프레임에 drawImage 565번**이었다 — 몸이 43기뿐인데도.
   대부분이 **돌바닥 타일**이다(828×1720 을 타일로 메우면 수백 장). 그런데 이 판은
   **화면이 안 움직인다**(네크로가 늘 한가운데, cx·cy 고정) — 즉 바닥·얼룩·소품은
   **어느 프레임에서나 똑같은 그림**이다. 한 번 구워 두고 통째로 얹는다(drawImage 1번).
   ★ 빛(glows)만은 밖에 둔다 — 그건 프레임마다 바뀐다.
   ★ 열쇠에 **에셋이 붙었는지**(floorReady·decorReady)까지 넣는다. 안 넣으면 그림이
     늦게 도착했을 때 **빈 바닥이 영영 굳는다**. */
let gcv = null, gctx = null, gkey = "", bakedGlows = [];
export function groundCacheKey(w, h, cx, cy, sc, squash, scatter, band) {
  return [w, h, Math.round(cx), Math.round(cy), sc.toFixed(3), squash.toFixed(3),
          band ? Math.round(band.x0) + "," + Math.round(band.w) : "-",
          floorReady, decorReady, wanted, tintCol || "-", tiles.length,
          layoutOX + ":" + layoutOY,        // ★ 층마다 다른 방(V-17) — 빼면 캐시가 옛 방을 돌려준다
          scatter ? [scatter.clear, scatter.density, scatter.decal,
                     scatter.set ? scatter.set.length : 0, scatter.wild ? 1 : 0].join(",") : "-",
          /* ★ 자가 **구워 둔 어제 것을 재는** 것을 막는다(V-4c 가 겪은 그 결). 손잡이를
             바꿔 놓고 재면 캐시가 옛 그림을 그대로 돌려줘 「아무것도 안 변했다」가 된다.
             굽기를 다시 시키려면 `__gbust` 를 올린다. 평소엔 undefined 라 열쇠가 안 변한다. */
          globalThis.__gbust || 0].join("|");
}
/** 전장 바닥 한 판. **타일 → 빛** 순서로 얹는다. */
export function drawGround(ctx, w, h, cx, cy, radius, squash, sc, scatter, band) {
  const key = groundCacheKey(w, h, cx, cy, sc, squash, scatter, band);
  /* ★★ **소품이 빛을 낸다** — drawScatter 안의 횃불이 `addGlow` 를 부른다. 바닥을 굽고
     나면 그 부름이 **굽는 그 한 프레임에만** 일어나서, 다음 프레임부터 횃불빛이
     통째로 사라진다(자로 대 보고 알았다 — 구운 길과 옛 길이 18만 픽셀 달랐다).
     그래서 굽는 동안 소품이 낸 빛을 **받아 적어 두고** 매 프레임 다시 쌓는다. */
  if (key !== gkey || !gcv) {
    if (!gcv) { gcv = document.createElement("canvas"); gctx = gcv.getContext("2d"); }
    if (gcv.width !== w || gcv.height !== h) { gcv.width = w; gcv.height = h; }
    /* ★ **상태를 통째로 되돌린다.** 굽는 캔버스는 프레임을 넘어 살아 있어서, 지난번
       칠하기가 남긴 알파·합성이 그대로 다음 그림에 얹힌다 — 실제로 자로 대 보니
       구운 길과 옛 길이 **18만 픽셀** 달랐다(최대차 91). 자가 없었으면 「같다」로 넘겼다. */
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.globalAlpha = 1; gctx.globalCompositeOperation = "source-over";
    gctx.filter = "none"; gctx.imageSmoothingEnabled = true;
    gctx.clearRect(0, 0, w, h);
    const before = glows.length;
    paintGround(gctx, w, h, cx, cy, radius, squash, sc, scatter, band);
    bakedGlows = glows.slice(before);       // 소품이 낸 빛만 따로 적어 둔다
    gkey = key;
  } else {
    for (const g of bakedGlows) glows.push(g);
  }
  ctx.drawImage(gcv, 0, 0);
  /* 빛은 **소품을 다 놓은 뒤** 한 번에 얹는다(구운 바닥 위에, 프레임마다 새로). */
  drawGlows(ctx, squash);
}

/** 맵 띠 **안에서만** 그리게 오려낸다. 띠가 없으면(창이 좁아 띠 == 화면) 그냥 그린다. */
function withBand(ctx, band, w, h, fn) {
  if (!band || band.w >= w - 1) return fn();
  ctx.save(); ctx.beginPath(); ctx.rect(band.x0, 0, band.w, h); ctx.clip();
  fn(); ctx.restore();
}

/** 굽지 않고 **그 자리에서** 칠하는 옛 길 — 자가 두 길을 픽셀로 대 보라고 남긴다
 *  (빛을 구울 때 `drawGlowsSlow` 를 남긴 것과 같은 뜻). */
export function paintGround(ctx, w, h, cx, cy, radius, squash, sc, scatter, band) {
  ctx.fillStyle = "#070504"; ctx.fillRect(0, 0, w, h);

  /* ① 돌바닥 — 타일을 격자로 깐다. **정수 좌표로만** 놓는다(소수면 가장자리가 흐려진다).
     자리마다 네 변형 중 하나를 고르는데, **좌표로 정한다**(난수가 아니다) —
     난수면 매 프레임 무늬가 바뀌어 바닥이 끓는다. */
  if (wangTiles && wang && wanted === "town" && drawWang(ctx, w, h, cx, cy, sc, squash)) {
    /* ★ V-42 — 얼룩은 **띠 안에서만**. 아래 타일 갈래는 이미 `withBand` 로 묶여 있는데
       마을(왕타일) 갈래만 빠져 있어 띠 바깥 맨땅에도 웅덩이·자국이 찍혔다. 여태
       안 보인 것은 그 자리를 **두 겹으로 덮고 있었기** 때문이고, 덮개를 걷으니 드러났다. */
    withBand(ctx, band, w, h, () =>
      drawDecals(ctx, cx, cy, sc, squash, w, h, (scatter && scatter.decal) || 1));
  } else if (floorReady) {
    const t = tiles[0].width;
    ctx.imageSmoothingEnabled = false;
    const ox = Math.floor(cx) % t - t, oy = Math.floor(cy) % t - t;
    for (let y = oy, gy = 0; y < h + t; y += t, gy++)
      for (let x = ox, gx = 0; x < w + t; x += t, gx++) {
        /* 뒤집기는 **타일마다**(무늬를 깬다), 밝기는 **덩어리로**(얼룩을 만든다).
           둘의 주기가 다르면 어느 쪽도 격자로 안 읽힌다. */
        /* ★★ 이 식이 **12 까지만** 인덱싱하고 있었다 — 흙 타일 12 장을 얹어도
           한 번도 안 뽑혀서 초록이 85% 에서 안 내려갔다(뒤늦게 알았다).
           이제 셋을 겹쳐 고른다:
             ① 재질(풀/흙) — **여덟 칸짜리 큰 덩어리**로. 그래야 흙이 「길」로 읽힌다
             ② 밝기 — 네 칸 덩어리   ③ 뒤집기 — 칸마다
           재질은 3:7 로 흙이 적게(참고 화면의 초록 29% 는 그 반대지만, 우리는
           소품이 어두워서 흙이 많으면 화면이 통째로 진창이 된다). */
        const mats = Math.max(1, Math.floor(tiles.length / 12));
        const hx = gx + layoutOX, hy = gy + layoutOY;                     // ← 층마다 다른 자리
        const mat = mats > 1 && (hash2(hx >> 3, hy >> 3) % 10) < 4 ? 1 : 0;
        ctx.drawImage(tiles[mat * 12 + (hash2(hx >> 2, hy >> 2) % 3) * 4 + (hash2(hx, hy) % 4)], x, y);
      }

    /* ②' 얼룩 — **격자를 가로질러** 놓이는 것들. 타일을 아무리 늘려도 경계는 남는데,
       경계를 넘어 걸치는 것이 하나 있으면 거기서 격자가 끊긴다(디아블로 1 트리스트람의
       바닥이 그렇다: 같은 흙인데 밟아 닳은 길과 자국이 격자를 지운다). */
    /* ★ 얼룩은 **맵 띠 안에서만** — 바깥은 「단순 타일」이라야 띠가 띠로 읽힌다. */
    withBand(ctx, band, w, h, () =>
      drawDecals(ctx, cx, cy, sc, squash, w, h, (scatter && scatter.decal) || 1));
  }

  /* ②' 소품 — **조명보다 먼저** 그린다. 그래야 빛 밖의 것은 어둠에 잠기고 빛이 닿은
     것만 보인다. 나중에 그리면 어둠 위에 둥둥 떠서 스티커가 된다.
     ★ 마을에서 이걸 밖에서 따로 부르다가 **조명 뒤로 밀려** 어둠 속 소품이 또렷하게
     보였다. 부르는 곳이 둘이면 순서도 둘이 된다 — 여기 하나로 모은다. */
  if (scatter) withBand(ctx, band, w, h, () =>
    drawScatter(ctx, cx, cy, sc, squash, w, h,
                scatter.clear, scatter.density, scatter.set, scatter.wild));

  /* ── 구역 색 기운(ROADMAP G-b) ── 소품까지 다 놓은 **뒤에** 한 번 곱한다. 바닥만
     물들이면 그 위에 선 통·뼈무더기가 다른 동네 것으로 뜬다 — 한 장면이면 같이 물든다.
     띠 바깥 가라앉힘보다는 **앞**이다(가라앉힌 데까지 물들일 까닭이 없다). */
  if (tintCol) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = TINT_A;
    ctx.fillStyle = tintCol;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* ══ **맵 띠 바깥** ══ (병수님 2026-08-17 23:37 「어느정도 너비만 실제 맵으로 채우고,
     나머지는 패턴이나 단순한 타일」). 돌바닥은 이미 화면 끝까지 깔려 있다 — 바깥에
     **없는 것**이 소품·얼룩이고, 거기에 **가라앉힘**을 더해 「여기가 판이다」를 만든다.
     ★ 어둠으로 **덮지** 않고 가라앉힌다(알파 0.55). 새까맣게 칠하면 옛날의 검은 여백이
       그대로 돌아와 「화면이 작다」는 그 말을 다시 듣는다.
     ★ 이음매는 **선이 아니라 번짐**이다 — 한 줄을 그으면 벽으로 읽히는데 벽이 아니다. */
  if (band && band.w < w - 1) {
    const L = Math.max(0, band.x0), R = Math.min(w, band.x0 + band.w);
    const F = 110, DIM = "#050403";
    ctx.save();
    /* 왼쪽: 화면 끝(짙음) → 띠(투명). 오른쪽은 그 거울. */
    for (const [x0, x1, from] of [[0, L, 0], [R, w, w]]) {
      if (x1 - x0 < 1) continue;
      const near = from === 0 ? x1 : x0;                  // 띠에 닿는 쪽
      const g = ctx.createLinearGradient(near, 0, near + (from === 0 ? -F : F), 0);
      g.addColorStop(0, DIM + "00"); g.addColorStop(1, DIM + "8c");
      /* ★★ V-42 — **번짐 너머를 한 번 더 덮지 않는다.** 예전엔 이 뒤에
         「번짐 너머(띠에서 F 이상)는 고르게 가라앉힌 채로 둔다」며 `DIM+"8c"` 를
         **평평하게 한 번 더** 칠했다. 그런데 캔버스 그라디언트는 **끝 색을 그 너머까지
         물고 늘어진다** — 이미 8c 인 자리에 8c 를 또 얹은 것이라 알파가 0.55 에서
         0.80 으로 뛰고, 덮개가 시작되는 바로 그 x 에 **딱 떨어지는 세로줄**이 생겼다.
         바로 위 주석이 금지한 그 선(「이음매는 선이 아니라 번짐이다」)을
         **가라앉힘 자신이 긋고 있었다.** 마을에서 24/24 줄 · 낙차 16(x=56·1456).
         그라디언트 한 번이면 번짐과 그 너머가 **한 붓으로** 끝난다. */
      ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, h);
    }
    ctx.restore();
  }
  /* (빛은 여기서 안 얹는다 — 구운 바닥에 굳으면 깜박임이 멈춘다. drawGround 가 위에서 부른다.) */

  /* ★★ 병수님: "지도 내 주위로 광원? 같은거 없애면 안됨?"
     **횃불빛을 걷는다.** 어둠은 분위기를 만들지만 **볼 것을 가린다** — 소품을 뿌려도
     빛 밖이면 없는 것과 같았고, 배율을 건드릴 때마다 빛 반경도 같이 흔들려 화면이
     밝아졌다 어두워졌다 했다. 규칙이 하나 줄면 어긋날 곳도 하나 준다.
     대신 **바닥 밝기 자체를 낮춰** 어두운 결은 지킨다(loadFloor 의 boost). */
}


/* ══ 바닥 얼룩 ══ 타일 위에 **평평하게** 얹는다(서 있는 물건이 아니므로 그림자도
   접지도 없다). 자리는 소품과 같은 규칙 — 좌표로 정해서 늘 같고, 끝이 없다. */
/** 얼룩에서 **입체를 걷어낸다.**
 *
 *  ★ 다시 구워 봤지만 더 나빴다(초록·청록·분홍이 섞여 나오고 웅덩이는 검은 구멍이
 *  됐다 — assets/decal_v2). 바꿔서 나아지지 않는 것은 안 바꾼다. 대신 여기서 편다.
 *
 *  「접시」로 읽히는 이유는 **밝은 쪽**에 있다 — 테두리 하이라이트와 가운데 정반사가
 *  볼록한 면을 만든다. 그래서 밝을수록 알파를 깎는다. 남는 것은 어두운 부분,
 *  곧 **땅에 스민 자국**뿐이다. */
function flatten(g, cv) {
  const img = g.getImageData(0, 0, cv.width, cv.height);
  const a = img.data;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] === 0) continue;
    const l = (a[i] * 299 + a[i + 1] * 587 + a[i + 2] * 114) / 255000;   // 0~1
    a[i + 3] = Math.round(a[i + 3] * Math.max(0, 1 - l * 1.35));
  }
  g.putImageData(img, 0, 0);
}

/** 가장자리 `n` 겹의 알파를 안쪽으로 갈수록 되살린다 — **끝이 없는 얼룩**을 만든다.
 *  경계에 붙은 픽셀부터 층을 세어 들어가고(투명 이웃이 있으면 1층), 층 수에 비례해
 *  알파를 남긴다. 외곽선처럼 경계에 딱 붙은 것은 거의 지워진다. */
function feather(g, cv, n) {
  const img = g.getImageData(0, 0, cv.width, cv.height);
  const a = img.data, W = cv.width, H = cv.height;
  const lay = new Int16Array(W * H).fill(-1);
  let cur = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (a[i * 4 + 3] === 0) continue;
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 ||
      a[(i - 1) * 4 + 3] === 0 || a[(i + 1) * 4 + 3] === 0 ||
      a[(i - W) * 4 + 3] === 0 || a[(i + W) * 4 + 3] === 0;
    if (edge) { lay[i] = 1; cur.push(i); }
  }
  for (let k = 2; k <= n && cur.length; k++) {
    const nxt = [];
    for (const i of cur) {
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= W * H || lay[j] !== -1 || a[j * 4 + 3] === 0) continue;
        lay[j] = k; nxt.push(j);
      }
    }
    cur = nxt;
  }
  for (let i = 0; i < W * H; i++) {
    if (a[i * 4 + 3] === 0) continue;
    const k = lay[i] === -1 ? n : lay[i];
    a[i * 4 + 3] = Math.round(a[i * 4 + 3] * (k / n) * (k / n));
  }
  g.putImageData(img, 0, 0);
}

const DECAL = { crypt: ["dust", "crack", "stain", "pebble"],
                town:  ["path", "grass", "mud", "pebble"] };
const decalArt = {};
export function loadDecals(dir = "assets/decal") {
  const all = [...new Set([...DECAL.crypt, ...DECAL.town])];
  for (const n of all) {
    const im = new Image();
    LOAD.total++;
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.width; c.height = im.height;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      /* ★ 받은 얼룩이 **연녹색**으로 왔다(no green 을 적었는데도 — dust 105,127,102 ·
         crack 71,108,96 · mud 32,94,84). 어두운 돌바닥 위에서 그건 이끼 반점처럼 튄다.
         **색을 통째로 빼고**(grayscale) 우리 톤으로 다시 입힌다 — 얼룩에서 필요한 것은
         색이 아니라 **모양**이고, 색은 바닥이 정해야 한다. */
      g.filter = "grayscale(1) sepia(0.45) saturate(1.1) brightness(0.5)";
      g.drawImage(im, 0, 0);
      /* ★★ 병수님: "여전히 떠있어 보이는데". 건물만의 문제가 아니었다 —
         확대해 보니 얼룩이 **검은 외곽선을 두른 접시**였다(PixelLab 이 「웅덩이」를
         입체로 그렸다). 바닥에 스민 자국은 **끝이 있으면 안 된다.** 가장자리
         몇 겹의 알파를 깎아 땅으로 흘려보낸다 — 외곽선도 여기서 같이 녹는다. */
      flatten(g, c);
      feather(g, c, 7);
      decalArt[n] = c; LOAD.done++;
    };
    im.onerror = () => { LOAD.done++; };
    im.src = `${dir}/${n}.png`;
  }
}

const DCELL = 150;                 // 얼룩 격자 — 소품(165)과 **어긋나게** 잡는다
function drawDecals(ctx, cx, cy, sc, squash, w, h, mul = 1) {
  const set = DECAL[wanted] || DECAL.crypt;
  if (!set.some((n) => decalArt[n])) return;
  const halfW = (w / 2) / sc, halfH = (h / 2) / (sc * squash);
  const gx0 = Math.floor((-halfW) / DCELL) - 1, gx1 = Math.ceil((halfW) / DCELL) + 1;
  const gy0 = Math.floor((-halfH) / DCELL) - 1, gy1 = Math.ceil((halfH) / DCELL) + 1;
  ctx.save();
  /* ★ 초록 87% 는 참고 화면(29%)보다 과하다 — 저기는 풀밭에 **흙길이 닳아** 있다.
     흙 얼룩을 진하게 얹어 풀과 흙이 섞이게 한다(0.62 → 0.85). */
  ctx.globalAlpha = 0.85;          // 바닥에 **스며든** 것이라 완전 불투명이면 스티커가 된다
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const hsh = hash2((gx + layoutOX) * 7 + 13, (gy + layoutOY) * 11 + 5);
      if ((hsh % 100) >= 42 * mul) continue;            // 칸 열에 넷 정도만(mul 로 조절)
      /* ★ 소품과 **똑같은 부호 버그**가 여기에도 있었다(drawScatter 의 `>>>` 주석 참고).
         얼룩도 절반이 안 그려졌고, 크기(23)는 음수가 되어 0.4~0.8 배로 쪼그라들었다.
         [[carry-fixes-forward]] — 한 곳을 고치면 같은 꼴을 전부 훑는다. */
      const name = set[(hsh >>> 7) % set.length];
      const im = decalArt[name]; if (!im) continue;
      const wx = (gx + 0.5) * DCELL + ((hsh >>> 11) % 90) - 45;
      const wy = (gy + 0.5) * DCELL + ((hsh >>> 17) % 90) - 45;
      const px = Math.round(cx + wx * sc), py = Math.round(cy + wy * sc * squash);
      const k = ART.s * (0.8 + ((hsh >>> 23) % 5) * 0.1);
      const dw = Math.round(im.width * k), dh = Math.round(im.height * k * squash);
      ctx.drawImage(im, 0, 0, im.width, im.height,
                    px - (dw >> 1), py - (dh >> 1), dw, dh);
    }
  }
  ctx.restore();
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
/* ★★ V-41 — **다섯 장이 화면에서 넷씩 되풀이되고 있었다.** 바닥 타일에는 이미
   고친 결함인데(loadFloor 의 「뒤집기 넷 × 밝기 셋」) 소품 쪽으로 안 옮겼다
   ([[carry-fixes-forward]]). 소품은 **뒤집을 수가 없다** — place() 가 「빛은 왼쪽
   위에서 온다」를 못 박고 그림자를 오른쪽 아래로 던지므로, 좌우로 뒤집으면 그 한
   장만 빛이 거꾸로 든다. 그래서 **종류를 늘리고**(넷을 구웠다) 뒤집기 대신
   **밝기·크기**를 흔든다. 새 넷은 실루엣이 기존 다섯과 안 겹치는 것으로 골랐다:
     · column2 — **누운** 기둥(선 기둥과 가로세로가 뒤바뀐다)
     · bones2  — 흩어진 뼈대 한 구(해골더미는 뭉친 덩어리다)
     · urn     — 유골 항아리(화로와 달리 **불이 없다**)
     · statue  — 목 없는 두건 석상 */
const DECOR = ["pillar", "coffin", "bones", "brazier", "rubble",
               "column2", "bones2", "urn", "statue"];
/* ★ 마을에 관·뼈무더기를 뿌린 것이 잘못이었다(병수님: "쓸데 없는 무덤 같은거 없애라").
   **관이 굴러다니는 곳은 마을이 아니라 공동묘지다.** 마을에는 마을 것을 둔다. */
const TOWN_DECOR = ["barrel", "crate", "cart", "well", "sacks"];
/* ★★ 야영지 소품 — 병수님이 준 D2 로그 야영지 화면의 어휘다: **낮은 야석 돌담 ·
   장대 횃불 · 지붕만 있는 헛간 · 통나무 더미 · 마른 덤불 · 바위.**
   ★ 이것들을 **둘레에 두르지 않는다.** 예전에 「마을에 테두리같은건 없애라」를
   들었고, 맵은 끝이 없는 것이 규칙이다. 그래서 담장도 **들판에 흩어진 잔해**로
   뿌린다 — 어휘는 야영지인데 경계는 안 생긴다. */
/* ★ 2차 — 담장·통나무만으로는 「폐허」지 **사람이 자는 곳**이 아니었다. 야영지가
   야영지로 읽히려면 **잠자리(천막) · 불(모닥불) · 살림(수레·구유·건초)** 이 있어야
   한다. 열두 개를 더 구워 눈으로 골랐고, 셋은 버렸다:
     · hay     — 돌벽 안에 통이 박힌 이상한 합성. 무엇인지 안 읽힌다
     · wall_c  — 조각조각 부서져 담으로 안 보인다(wall_a 가 이미 그 일을 한다)
     · boulder — 주문과 달리 **초록 풀이 붙은 돌 폐허**다. 마른 야영지 색과 안 맞고
                 바위는 rock 이 이미 제대로 한다
   로그만 보고 넣었으면 셋 다 들어갔다 — **합성 시트로 눈으로 본다.**

   ★★ 3차(01:20) — 버린 셋을 프롬프트를 고쳐 다시 구웠다. **하나만 살았다.**
     · boulder ○ 풀 붙은 폐허 → 마른 흙 위 둥근 바위. 고친 게 먹혔다
     · hay     ✗ 통이 초가집이 됐을 뿐, 여전히 **건물**이다(두 번 연속 같은 실패)
     · wall_c  ✗ 두께가 사라져 벽돌 띠 한 줄. 1차보다 더 나쁘다 — wall_c 는 접는다
   같이 구운 넷 중 셋만 받았다:
     · cookpot ○ 삼각대에 걸린 솥   · wrack ○ 창·방패 걸이   · dryrack ○ 빨래 건조대
     · bedroll ✗ 잠자리가 아니라 **돌바닥 방 한 칸**(문·궤짝까지 딸려 왔다)
   banner 는 붉은 깃발이라 야영지 표식으로 읽힌다 — 받되 드물게 뿌린다.

   **두 번 틀린 것은 값이 아니라 주문이 문제다**(hay/wall_c). 왜 틀렸는지는
   tools/pixellab/camp_night3.py 머리에 적어 뒀다.

   ★★★ 4차(01:40) — 그 진단이 맞았다. 짚과 잠자리를 망친 건 주문 본문이 아니라
   **모두가 공유하던 TONE 의 「회색 돌과 나무」** 였다(돌이 없는 물건에까지 돌을
   요구하니 모델이 옆에 돌집을 세웠다). 재질 구절을 뺀 TONE 으로 다시 구우니
   세 번 만에 hay 가 **짚 더미**로, bedroll 이 **잠자리**로 나왔다.
   같이 구운 grindstone(숫돌)·tarp(덮개 씌운 짐더미)도 받았다 — wall_c 자리다. */
const CAMP_DECOR = ["wall_a", "wall_b", "logs", "shrub", "rock", "torch", "shed",
                    "tent_a", "tent_b", "wagon", "trough", "palisade", "stump",
                    "tree", "firepit",
                    "boulder", "cookpot", "wrack", "dryrack", "banner",
                    "hay", "bedroll", "grindstone", "tarp"];
/** 싸움터 한가운데는 비운다 — 소품이 싸움을 가리면 판이 안 읽힌다. */
const RING_HOLD_CLEAR = 190;
const decor = {};
/** 이름 → **같은 그림의 밝기 변형 셋.** 던전 소품(DECOR)에만 있다 — 마을·야영지
 *  소품은 앵커에 맞춰 손으로 놓은 것이라 흔들면 안 된다.
 *  ★ 매 프레임 `ctx.filter` 를 거는 것은 비싸다(loadFloor 머리말) — **한 번 구워 둔다.** */
const decorVars = {};
/** 돌리기 **전**의 변형 셋 — 짝지어 찍는 자만 쓴다(`globalThis.__LIEROT = 0`). */
const decorFlat = {};
/** 조각 한 장을 이름으로 꺼낸다 — 건물 **앞에** 덧놓을 때 쓴다(js/town.js). */
export const decorOf = (n) => decor[n];

/** 밝기만 흔든 사본 셋. 폭은 ±6% 다 — 바닥 타일에서 배운 대로(±12% 는 체커보드가
 *  되고 ±3% 는 안 보인다), 소품은 배경보다 대비가 세서 이 폭이 「같은 돌인데 다른
 *  조각」으로 읽히는 자리다. */
function toneVars(base) {
  const out = [];
  for (const t of [0.94, 1.0, 1.07]) {
    if (t === 1.0) { out.push(base); continue; }
    const c = document.createElement("canvas");
    c.width = base.width; c.height = base.height;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.filter = `brightness(${t})`;
    g.drawImage(base, 0, 0);
    out.push(c);
  }
  return out;
}
/** ══ 눕는 것은 **방향도 흔든다** ══ (V-48)
 *  밝기 ±6% · 크기 ±12% 로 흔들어도 눈은 **같은 조각**으로 알아본다 — 자로 대면
 *  그 흔들기의 NCC 가 0.88~0.97 로, 「다른 이름끼리」(≤0.69)와 견주면 사실상 같은
 *  그림이다(`tools/v48_same.py`). 그래서 한 화면에 스물두 개가 놓이는 `column2`
 *  (누운 기둥)는 **전부 같은 방향으로 나란히** 누워 벽지가 된다.
 *  ★ **서 있는 것은 못 돌린다** — 기둥·석상·화로·항아리·관은 중력이 붙어 있어
 *    기울이면 넘어진 것으로 읽힌다. 돌리는 것은 **이미 바닥에 누운 것**뿐이다.
 *  ★ 각도는 ±17° 부터 듣는다(NCC 0.60 → 문턱 0.79 아래). 0 을 넣어 「그대로 누운 것」도
 *    남긴다 — 전부 비스듬하면 그것대로 규칙이 된다.
 *  ★ 이웃값으로 돌린다(imageSmoothingEnabled=false) — 픽셀아트는 흐려지면 안 된다. */
const LIE_ROT = { column2: [-34, -17, 0, 17, 34], bones2: [-41, -20, 0, 22, 43] };
function rotVar(base, deg) {
  if (!deg) return base;
  const r = deg * Math.PI / 180, ca = Math.abs(Math.cos(r)), sa = Math.abs(Math.sin(r));
  const w = Math.ceil(base.width * ca + base.height * sa);
  const h = Math.ceil(base.height * ca + base.width * sa);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.translate(w / 2, h / 2); g.rotate(r);
  g.drawImage(base, -base.width / 2, -base.height / 2);
  return c;
}
/** 밝기 변형 × 눕는 각 — 눕지 않는 것은 밝기 변형 그대로다. */
function lieVars(name, base) {
  const tones = toneVars(base);
  const angs = LIE_ROT[name];
  if (!angs) return tones;
  const out = [];
  for (const t of tones) for (const a of angs) { const c = rotVar(t, a); c._ang = a; out.push(c); }
  return out;
}
let decorLeft = DECOR.length, decorReady = false;

/* ★ **표식은 눈에 띄어야 표식이다.** 야영지의 색보정(sepia .42 / brightness .72)은
   소품을 흙빛으로 묶어 주는데, 깃발은 그 통일이 곧 실패다 — 붉은 천이 땅빛으로
   내려앉아 「장대 하나」로 읽혔다. 불은 원래 밝아서 보정을 뚫고 살아남지만
   중간 밝기의 빨강은 그대로 죽는다.
   그래서 **깃발만 보정을 풀어 준다** — 이 그림의 일은 섞이는 게 아니라 튀는 것이다. */
const DECOR_FILTER = { banner: "sepia(0.14) saturate(1.35) brightness(0.95)" };

function loadOne(n, dir) {
  const im = new Image();
  LOAD.total++;
  im.onload = () => {
    const c = document.createElement("canvas");
    c.width = im.width; c.height = im.height;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.filter = DECOR_FILTER[n] || "sepia(0.42) saturate(1.05) brightness(0.72)";
    g.drawImage(im, 0, 0);
    decor[n] = c; LOAD.done++;
  };
  im.onerror = () => { LOAD.done++; };
  im.src = `${dir}/${n}.png`;
}

export function loadDecor(dir = "assets/decor") {
  for (const n of TOWN_DECOR) loadOne(n, "assets/town");
  for (const n of CAMP_DECOR) loadOne(n, "assets/camp");
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
      decorVars[n] = lieVars(n, c);
      decorFlat[n] = toneVars(c);            // A/B 용 — `__LIEROT = 0` 이면 이쪽을 쓴다
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
/* 아래 UI 가 가리는 띠 — **눈대중이 아니라 hud.css 의 상자에서 뽑는다.**
   일지 `#log` 는 bottom:calc(--hudH + 5) 에 3줄(18px × 1.4) + 여백 12 = 88px 이므로
   그 윗변이 화면 아래에서 **299px**, 아랫변이 211px. 판 `#panel` 은 206px.
   → 아래 220px 은 통째로 비우고(글자·칸·구슬이 있는 자리), 그 위 80px 은
     성글어지며 잇는다(= 일지가 덮는 띠). 첫 값 250/90 은 눈대중이라 아직 훤한
     자리(y 523~) 까지 성글게 만들었다 — 자로 세니 그 띠가 16 → 10 으로 줄었다. */
const HUD_KEEP = 220, HUD_FADE = 80;
/* ★ 화로를 일곱에 하나만 뿌렸더니 **한 화면에 한두 개**뿐이라 던전이 여전히 캄캄했다.
   불이 곧 조명이니 **불의 밀도가 곧 밝기**다 — 둘로 늘린다. */
/* ★ V-41 — 다섯에서 아홉으로. 화로는 **불이 곧 조명**이라 몫을 지킨다(3/13 ≈ 23%,
   전에는 2/7 ≈ 29%). 석상은 키가 커서 자주 서면 숲이 되므로 한 몫만 준다. */
/* ★★ V-60b(2026-08-25) — **그 「몫을 지킨다」가 여기까지 왔다: 넷에 하나가 화로다.**
   1512x863 한 화면에 화로가 24 개 서고(다음이 column2 17), 저마다 addGlow 를 부르니
   **「불이 있는 자리에만 빛」이라는 뜻이 조명이 균일해지는 것으로 뒤집혔다.**
   켜서 보면 화로가 「불 밝힌 자리」가 아니라 **바닥에 뿌린 주황 점**으로 읽힌다.
   → **셋을 하나로 줄이고**, 빈 두 몫은 **가끔 보여야 할 것**(관·항아리)에 준다.
     지금 coffin·urn 은 각각 한 몫뿐이라 「가끔 만나는 것」이 없다.
   ★ 밝기는 되받는다([[equilibrium-pushes-back]]) — 수를 3분의 1로 줄이면 빛도 준다.
     그래서 **불 하나가 내는 빛을 세 배로** 키운다(아래 addGlow: r 190→270 · 1.05→1.55,
     빛무게 = r²·warm 이 2.98 배). 수는 줄고 덩이는 커지므로 **평균은 그대로, 퍼짐은
     는다** — 그것이 이 항목이 노리는 것이다(자: tools/lit_probe.mjs 의 「퍼짐」). */
const SCATTER = ["coffin", "bones", "brazier", "rubble", "pillar", "coffin", "rubble",
                 "column2", "bones2", "urn", "statue", "urn", "column2"];

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

/** **실루엣을 따라 흐르는** 접지 그림자를 한 번 구워 둔다.
 *
 *  ★★★ 병수님: "여전히 떠있어 보이는데". 타원 하나로는 안 된다 —
 *  타원은 **발이 어디에 닿는지**를 모른다. 상인은 네 기둥으로, 대장간은 벽 한 줄과
 *  앞에 놓인 통들로 땅에 닿는데, 그 전부를 한 덩이 타원으로 뭉개면 그림자가 물건과
 *  따로 논다. 게다가 스프라이트가 판을 달고 있던 동안에는 그 타원이 **판 밑에 깔려
 *  한 번도 보이지 않았다** — 그리고 있었지만 없는 것과 같았다.
 *
 *  **열마다 맨 아래 픽셀이 그 열의 접지점이다.** 그 점마다 작고 납작한 얼룩을 찍어
 *  합치면 그림자가 실루엣을 따라 흐른다 — 기둥 밑은 갈라지고, 벽 밑은 이어진다.
 *  두 겹으로 찍는다: 넓고 옅은 것(주변광이 막힌 그늘)과 좁고 짙은 것(닿은 자리). */
function shadowOf(cv) {
  if (cv._shad) return cv._shad;
  const g0 = cv.getContext("2d");
  const d = g0.getImageData(0, 0, cv.width, cv.height).data;
  const PAD = 12;
  const sh = document.createElement("canvas");
  sh.width = cv.width + PAD * 2; sh.height = cv.height + PAD * 2;
  const g = sh.getContext("2d");

  const pts = [];
  for (let x = 0; x < cv.width; x++) {
    for (let y = cv.height - 1; y >= 0; y--) {
      if (d[(y * cv.width + x) * 4 + 3] > 24) { pts.push([x, y]); break; }
    }
  }
  const base = pts.length ? Math.max(...pts.map(p => p[1])) : cv.height;
  for (const [ax, ay, aa] of [[9, 3.2, 0.16], [4.5, 1.7, 0.30]]) {
    g.fillStyle = `rgba(0,0,0,${aa})`;
    for (const [x, y] of pts) {
      /* 발보다 **한참 위**에 있는 열은 공중이다(처마·굴뚝) — 그림자를 안 만든다. */
      if (base - y > cv.height * 0.28) continue;
      g.beginPath();
      g.ellipse(x + PAD, y + PAD, ax, ay, 0, 0, 6.284);
      g.fill();
    }
  }
  cv._shad = { cv: sh, pad: PAD };
  return cv._shad;
}

/** 물건의 **검은 실루엣** 한 장. 이걸 눕히고 기울여 던지면 드리운 그림자가 된다. */
function siloOf(cv) {
  if (cv._silo) return cv._silo;
  const s = document.createElement("canvas");
  s.width = cv.width; s.height = cv.height;
  const g = s.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(cv, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#000";
  g.fillRect(0, 0, s.width, s.height);
  cv._silo = s;
  return s;
}

/* 드리운 그림자 — **빛은 왼쪽 위에서 온다**(모든 스프라이트의 명암이 그렇게 그려져
   있다). 그러니 그림자는 오른쪽 아래로 눕는다. 기울기와 납작함은 해가 낮게 걸린
   저녁의 값이다 — 너무 짧으면 발에 눌어붙고, 너무 길면 물건이 누워 보인다. */
const CAST_SKEW = 0.62, CAST_FLAT = 0.44, CAST_A = 0.30;

/** @param kMul 이 한 번만 크기를 줄이고 싶을 때(건물 앞에 걸치는 풀·돌 따위).
 *  공통 배율 ART.s 를 건드리면 화면의 모든 것이 같이 움직인다. */
export function place(ctx, cv, gx, gy, shadow = true, kMul = 1) {
  const f = footOf(cv);
  const k = ART.s * kMul;
  const w = Math.round(cv.width * k), h = Math.round(cv.height * k);
  const px = Math.round(gx - f.cx * k), py = Math.round(gy - f.bot * k);
  if (shadow) {
    /* ① **드리운 그림자** — 실루엣을 눕혀 오른쪽 아래로 던진다. 이게 있어야
       「무엇이 서 있다」가 되고, 없으면 아무리 발밑을 어둡게 해도 스티커다. */
    ctx.save();
    ctx.globalAlpha = CAST_A;
    ctx.transform(1, 0, -CAST_SKEW, CAST_FLAT, gx, gy);
    ctx.drawImage(siloOf(cv), 0, 0, cv.width, cv.height,
                  -f.cx * k, -f.bot * k, w, h);
    ctx.restore();
    /* ② **발밑 그늘** — 드리운 그림자는 물건에서 떨어져 나가므로, 닿은 자리
       자체는 따로 눌러 준다(주변광이 막힌 틈). 실루엣을 따라 흐른다. */
    const s = shadowOf(cv);
    ctx.drawImage(s.cv, 0, 0, cv._shad.cv.width, cv._shad.cv.height,
                  px - Math.round(cv._shad.pad * k), py - Math.round(cv._shad.pad * k),
                  Math.round(cv._shad.cv.width * k), Math.round(cv._shad.cv.height * k));
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

/** 빛 하나를 쌓는다. **빛깔은 기본이 모닥불색**이고, 그것 말고 다른 색이 필요한 것은
 *  지금 웨이포인트 하나뿐이다(V-3 — 찬 빛이 그 표의 정체다). 색을 인자로 받되
 *  **캐시 열쇠에 함께 넣는다**: 안 넣으면 먼저 구운 주황 타일이 파란 자리에 그대로 얹힌다. */
export const GLOW_WARM = "255,180,90";
export function addGlow(gx, gy, r, warm = 1, col = GLOW_WARM) { glows.push([gx, gy, r, warm, col]); }

/** 쌓인 빛을 한 번에 얹는다. **부르는 시점이 중요하다** — addGlow 를 부른 뒤에
 *  불러야 그 프레임에 그려진다(마을은 drawTown 이 끝난 뒤 main 이 부른다). */
/* ★★ **여기가 판에서 제일 비싼 자리였다**(2026-08-15 병수님 「렉걸림」 · CPU 프로파일에서
   JS 자기시간 1위 8.2%, draw 와 step 을 합친 것보다 컸다). 빛 하나를 6px 칸으로 채우는데,
   반지름 120 이면 **한 프레임에 fillRect 1,600 번 + 그만큼의 문자열(rgba…) 생성**이다.
   불이 여럿이면 초당 수십만 번이라, 이 맥에서는 안 티 나도 폰에서는 여기부터 무너진다.
   ★ 그림은 **결정적**이다(자리·반지름·따뜻함만으로 정해진다) → **한 번 구워 두고 얹는다.**
     열쇠는 반지름·따뜻함·눌림. 종류가 몇 개뿐이라 캐시가 금세 수렴한다. */
/* 빛의 기울기 — 옛 여섯 계단 `[0,.022,.042,.068,.10,.14]`(경계 .28/.45/.62/.78/.92)의
   **각 칸 가운데**를 멈춤점으로 삼는다.
   ★ 「가운데를 이으면 총량이 같다」는 **틀렸다** — 빛의 총량은 넓이로 재므로 바깥 고리가
     더 무겁다(∫a(d)·d dd). 그냥 이으면 **94.8%** 로 준다(가운데 평지가 .28 → .14 로
     줄어든 몫이다). 그래서 `K` 로 되돌려 **총량을 옛것과 같게** 맞춘다.
     ★★ 판(바닥)에서 재면 이 1.6% 를 못 본다 — 소품 수가 판마다 달라 밝기가 ±0.15 씩
       흔들리기 때문이다. 그래서 **타일 하나를 따로 구워 알파를 더해** 견줬다
       (`tools/glow_sum.mjs`): 총량 **1.0049 배** · 가운데 가로줄의 계단 **10 → 0**
       ([[equilibrium-pushes-back]] · [[floor-far-from-threshold]]). */
const GLOW_K = 1.0553;
const GLOW_RAMP = [[0, 0.14], [0.14, 0.14], [0.365, 0.10], [0.535, 0.068],
                   [0.70, 0.042], [0.85, 0.022], [0.92, 0], [1, 0]]
                  .map(([d, a]) => [d, a * GLOW_K]);
const glowCache = new Map();
function glowTile(r, warm, squash, col) {
  const key = Math.round(r) + "|" + warm.toFixed(2) + "|" + squash.toFixed(3) + "|" + col;
  let c = glowCache.get(key);
  if (c) return c;
  const n = Math.ceil(r / GLOW_PX);
  const half = (n + 1) * GLOW_PX, halfY = Math.ceil((n + 1) * GLOW_PX * squash) + 2;
  const cv = document.createElement("canvas");
  cv.width = half * 2; cv.height = halfY * 2;
  const g = cv.getContext("2d");
  /* ★ **계단이 아니라 이어지는 기울기로 굽는다**(V-61 · 2026-08-25).
     예전엔 6px 칸에 여섯 단계로 찍었다 — 프레임마다 다시 찍던 시절의 절약이다.
     지금은 이 타일을 **한 번 구워 캐시**하므로 계단으로 아낄 값이 없다. 그런데 V-60b 가
     빛을 세 배(r 190→270 · warm 1.05→1.55)로 키우자 그 여섯 계단이 **양파 껍질처럼**
     드러났고, 칸 격자 때문에 테두리까지 각졌다.
     멈춤점은 옛 계단의 **가운데 자리**에 놓는다 — 이러면 같은 기울기를 이어 그은 셈이라
     밝기 총량이 안 바뀐다([[equilibrium-pushes-back]] · lit_probe 로 확인). */
  g.save();
  g.translate(half, halfY);
  g.scale(1, squash);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, r);
  for (const [d, a] of GLOW_RAMP) grd.addColorStop(d, `rgba(${col},${(a * warm).toFixed(4)})`);
  g.fillStyle = grd;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.restore();
  c = { cv, half, halfY };
  glowCache.set(key, c);
  if (glowCache.size > 64) glowCache.clear();       // 판 크기가 바뀌면 열쇠가 는다
  return c;
}

export function drawGlows(ctx, squash) {
  if (!glows.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  /* 구운 것을 얹는다 — 자리를 반올림해 칸 격자가 프레임마다 안 흔들리게. */
  for (const [gx, gy, r, warm, col] of glows) {
    const t = glowTile(r, warm, squash, col || GLOW_WARM);
    ctx.drawImage(t.cv, Math.round(gx) - t.half, Math.round(gy) - t.halfY);
  }
  ctx.restore();
  glows = [];
}

/** 옛 길 — 캐시가 못 미더울 때 견주려고 남겨 둔다(자가 두 길을 대 볼 수 있어야 한다). */
export function drawGlowsSlow(ctx, squash) {
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
export function drawScatter(ctx, cx, cy, sc, squash, w, h, clear = 0, density = 58, set = SCATTER, wild = null) {
  if (!decorReady) return;
  ctx.imageSmoothingEnabled = false;
  /** 칸 하나에 조각 하나를 놓는다. 자리는 rnd 에서만 나온다 — **매 프레임 같은 자리.** */
  /* ★★★★★ **`>>` 가 소품의 절반을 먹고 있었다**(2026-08-17). hash2 는 `>>> 0` 으로
     **부호 없는 32비트**를 준다 — 그런데 그걸 `>>`(부호 있는 시프트)로 밀면 값이
     2^31 을 넘는 순간 **음수**가 된다(실측 48.8%). 음수 % 는 JS 에서 음수라
     `from[-3]` → `undefined` → `decor[undefined]` → `if (!im) return` 으로
     **아무 소리 없이 안 그린다.** 굴림 셋 중 하나 반이 허공으로 샜다.
     흔들기(11·17)도 같이 음수가 되어 소품이 제 칸 밖 1.5칸까지 밀려나
     「몰린 데는 몰리고 빈 데는 통째로 비는」 얼룩을 만들었다.
     → 전부 `>>>` 로 고친다. 값을 올려서 메울 일이 아니었다 —
     `dens` 를 아무리 올려도 절반은 그대로 샜을 것이다. */
  const put = (rnd, gx, gy, from) => {
    const name = from[(rnd >>> 7) % from.length];
    /* ★ V-41 — **같은 그림이 넷씩 서 있던 것**을 흔든다. 뽑는 자리는 이름(>>>7)·
       x(>>>11)·y(>>>17)·판뒤(>>>23)가 이미 쓰고 있으니 **안 쓰는 비트**에서 꺼낸다.
       밝기는 미리 구운 셋 중 하나, 크기는 ±12% 셋 중 하나다.
       ★ 좌우 뒤집기는 **안 쓴다** — place() 의 「빛은 왼쪽 위에서 온다」가 깨진다. */
    const vs = (globalThis.__LIEROT === 0 ? decorFlat : decorVars)[name];
    const vi = vs ? (rnd >>> 2) % vs.length : 0;
    const im = vs ? vs[vi] : decor[name]; if (!im) return;
    const sizeI = vs ? (rnd >>> 27) % 3 : 1;
    const kJit = [0.88, 1.0, 1.13][sizeI];
    /* 칸 한가운데에 딱 놓으면 **격자가 보인다.** 칸 안에서 흔들어 놓는다. */
    const wxw = gx * CELL + ((rnd >>> 11) % CELL) - CELL / 2;
    const wyw = gy * CELL + ((rnd >>> 17) % CELL) - CELL / 2;
    if (clear && Math.hypot(wxw, wyw) < clear) return;      // 싸움터는 비운다
    /* ★ 여기도 place() 로 통일한다 — 이미지 바닥을 지면으로 삼으면 그림 아래
       투명 여백만큼 뜬다(병수님: "둥둥 떠잇네"). */
    const px2 = cx + wxw * sc, py2 = cy + wyw * sc * squash;
    /* ★★ **아래 판이 서는 자리에는 소품을 놓지 않는다** (2026-08-24 · V-11).
       V-10 으로 소품이 3.1배가 되자 석관이 「시체 14/140」 위에 얹히고 기둥이 스킬
       칸 사이에 서기 시작했다 — 판이 반투명이라 그 밑이 그대로 비친다(그 반투명은
       병수님이 고른 것이다 · `js/hudplate.js` 머리말). 어둠으로 덮어 보려 했으나
       **주위 바닥이 같이 어두워져 대비가 안 줄었다** — 소품은 여전히 읽혔다.
       ★ 그래서 **덮는 대신 안 놓는다.** 판 뒤는 어차피 안 보이는 자리라
         맨바닥이 맞다(「바닥이 비쳐 떠 있음을 지킨다」가 원래 뜻이다).
       ★ 자르는 선을 하나로 두면 그 선이 **눈에 보이는 모서리**가 된다. 위로
         HUD_FADE 만큼은 확률로 성글게 만들어 사라지듯 잇는다. 확률은 rnd 에서
         꺼내므로 매 프레임 같은 자리다(이 함수의 대전제). */
    if (py2 > h - HUD_KEEP - HUD_FADE) {
      const t = (py2 - (h - HUD_KEEP - HUD_FADE)) / HUD_FADE;   // 0 위 → 1 아래
      if (t >= 1 || ((rnd >>> 23) & 255) < t * 255) return;
    }
    place(ctx, im, px2, py2, true, kJit);
    /* ★ 자(2026-08-24 V-10) — **놓인 소품을 그 자리와 함께** 센다. 총 개수만 세면
       「가운데는 빽빽하고 위아래 띠는 통째로 빈」 얼룩이 안 보인다(08-12 야영지에서
       겪은 그 결). 켤 때만 센다 — 끄면 배열이 아예 안 자란다. */
    if (globalThis.__scatterCount) (globalThis.__scatterHits ||= []).push([px2, py2, name, vi * 3 + sizeI, im._ang || 0]);
    // 불이 든 것은 **제 둘레를 밝힌다** — 왜 밝은지가 화면에 보여야 한다
    /* ★ V-60b — 화로가 넷에 하나에서 열셋에 하나로 줄었다(위 SCATTER). 수가 3분의 1이
       되었으므로 **하나가 내는 빛을 세 배로** 키워 판 전체 밝기를 지킨다. 반경만 키우면
       가장자리만 번지므로 따뜻함도 같이 올린다 — 가운데가 더 뜨거워야 「불 밝힌 자리」로
       읽힌다. 빛무게 (270/190)² x (1.55/1.05) = 2.98. */
    if (name === "brazier") addGlow(px2, py2 - 12 * ART.s * kJit, 270 * sc * kJit, 1.55);
    /* ★ 횃불은 **불이 장대 꼭대기에** 있다 — 화로와 같은 -12 를 쓰면 빛이 발치에
       고여 「바닥이 밝고 불은 캄캄한」 그림이 된다. 높이는 눈대중이 아니라
       **따뜻한 화소 무게중심**을 재서 넣는다(발에서 -101px, 72x160 원본 기준).
       그림을 바꾸면 이 값도 다시 재야 한다 — town.js 대장간에서 같은 걸 겪었다. */
    if (name === "torch") addGlow(px2, py2 - 101 * ART.s, 150 * sc, 1.15);
    /* 모닥불 — 불이 **땅에 있다.** 횃불의 -101 을 그대로 쓰면 빛이 허공에 뜬다.
       같은 자로 쟀다(따뜻한 화소 무게중심, 104x80 원본 기준 발에서 -24px).
       반경은 횃불보다 넓게 — 야영지의 불은 사람이 모이는 자리다. */
    if (name === "firepit") addGlow(px2, py2 - 24 * ART.s, 175 * sc, 1.1);
    /* ★ 여기 **횃불 빛이 하나 더** 있었다(-130, r170). 무게중심으로 -101 을 재
       넣으면서 눈대중으로 잡아 뒀던 옛 줄을 안 지운 것이다 — 그래서 횃불만
       빛을 둘 받아 혼자 허옇게 떴다. 다시 재도 -107 이라 -101 이 맞다.
       **값을 고칠 때는 그 값을 쓰던 옛 줄을 같이 지운다.** */
  };
  const halfW = (w / 2) / sc + CELL, halfH = (h / 2) / (sc * squash) + CELL;
  const gx0 = Math.floor(-halfW / CELL), gx1 = Math.ceil(halfW / CELL);
  const gy0 = Math.floor(-halfH / CELL), gy1 = Math.ceil(halfH / CELL);

  /* **뒤에 있는 것부터** 그린다(y 가 작은 칸부터) — 안 그러면 위쪽 소품이 아래쪽을 덮는다. */
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const rnd = hash2(gx + layoutOX, gy + layoutOY);
      /* ★★ 균일하게 뿌리면 「물건이 고르게 흩어진 들판」이 된다(병수님: "하나의 지역처럼
         보이냐? 뭔가 어설픈데"). 야영지는 **무리를 짓는다** — 앵커(입구·상인·대장간·
         모닥불) 가까이는 빽빽하고 멀어지면 비어야 「여기가 마을」이 생긴다.
         멀리까지 아예 0 으로 두지는 않는다 — 들판에도 바위 한둘은 있어야 자연스럽다. */
      let dens = density, rolls = 1, from = set;
      /* ★★★ **V-10 (2026-08-24) — 「칸마다 여러 번 굴린다」를 던전에도 옮긴다.**
         08-12 에 야영지에서 배운 것이 바로 아래 `if (anchors.length)` 안에만 들어갔다:
         「CELL 이 165 라 화면 끝 띠에 칸이 넷밖에 안 걸린다 — 넷 중 하나 걸릴 확률을
         쓰면 그 띠는 거의 언제나 통째로 빈다. 확률을 낮춘 게 아니라 아예 없앤 것이다.」
         **던전에는 앵커가 없어서 그 else 에도 못 닿는다** — 여태 `rolls 1 · dens 34`,
         곧 칸당 0.34 개다. 그래서 1512 폭 화면이 「소품 열 몇 개 뿌린 주차장」으로 읽힌다.
         같은 벽이고 같은 처방이다([[carry-fixes-forward]]).
         ★ 값은 눈으로 골랐다 — `tools/v10_dens_sheet.mjs` 가 네 후보를 같은 씨앗으로
           찍어 붙인다. 손잡이는 A/B 를 위해 밖에서도 돌린다. */
      const SCAT_ROLLS = (globalThis.__SCAT_ROLLS != null ? +globalThis.__SCAT_ROLLS : 3);
      const SCAT_DENS  = (globalThis.__SCAT_DENS  != null ? +globalThis.__SCAT_DENS  : null);
      if (anchors.length) {
        const d = nearAnchor(gx * CELL, gy * CELL);
        // ★ 여기 디버그 문장(DBG 주석 뒤의 `dens = 95;`)이 남아 **게임이 통째로 안 떴다**
        //   (2026-08-13 01:0x). 그 한 문장이 if 본문을 끝내 버려 다음 else 가 갈 곳을
        //   잃고 SyntaxError 가 났다 — 모듈 하나가 안 뜨면 판 전체가 선다.
        //   ★★ 고약한 건 `node --check` 가 통과시킨다는 것이다(스크립트로 파싱한다).
        //   모듈은 **모듈로** 파싱해서 봐야 한다(vm.SourceTextModule).
        //   ★★★ 그리고 이 자리를 설명하는 주석을 블록(/* */)으로 쓰면 안 된다 —
        //   본문에 든 닫는 기호가 주석을 일찍 닫아 또 깨진다(실제로 한 번 그랬다).
        // ★★★★ **칸마다 여러 번 굴리는 처방을 바깥에만 넣었다**(2026-08-12).
        //   바깥은 rolls 3 인데 안쪽은 여전히 1 이라, 세어 보니 야영지 한복판이
        //   들판보다 **여섯 배 성겼다**(칸당 0.49 대 2.85). 화면을 열 띠로 나눠
        //   재면 3·5·7 과 18·23 이 섞여 나온다 — 그게 「가운데만 차 있고
        //   위아래가 통째로 빈」 그림의 정체다. 원인은 값이 아니라 **한 번 굴려서는
        //   칸이 비거나 하나**라는 것이고, 그건 안쪽에도 똑같이 해당한다.
        //   **고친 방법은 전부에 옮긴다** — 세 구역 다 세 번 굴리고, 무리는
        //   확률로만 준다(안 2.34 · 중간 2.04 · 바깥 1.80 개/칸).
        if (d < 220) { dens = 78; rolls = 3; }
        /* ★★★★★ 08-17 00:3x — 여기가 **78 · 68 · 60 으로 사실상 평평**했다.
           칸당 2.34 · 2.04 · 1.80 이면 「가운데는 빽빽하고 바깥은 성기다」가 아니라
           그냥 고르게 깔린 들판이다(자로 재면 띠가 22·18·17·22·14.5·14.6·14.6·14.2 —
           안팎 비 1.56). 셋 다 **절반이 새던 시절**(`>>` 버그)에 「그래도 비어
           보인다」고 올려 잡은 값이라, 그 버그를 고쳐 실물이 두 배가 된 지금은
           안쪽 기준으로만 맞고 바깥은 과하다.
           → 가운데 띠는 **한 값이 아니라 기울기**로 준다: 220 에서 78 로 시작해
           420 에서 46 까지 곧게 내린다. 값 하나를 낮추면 그 자리에 또 **금**이
           생긴다(무리의 가장자리가 눈에 띈다) — 기울기면 눈이 이음매를 못 찾는다. */
        else if (d < 420) { dens = Math.round(78 - (78 - 46) * ((d - 220) / 200)); rolls = 3; }
        /* ★ 여기가 예전엔 `density * 0.45 / 0.16` 이었다 — 그리고 그것이
           **화면의 절반을 맨 풀밭**으로 만들었다(병수님 2026-08-12).
           원인은 값보다 **칸의 크기**다: CELL 이 165 라 화면 위·아래 끝 띠 하나에
           칸이 넷밖에 안 걸린다. 넷 중 하나 걸릴 확률을 0.16 배로 깎으면 그 띠는
           **거의 언제나 통째로 빈다** — 확률을 낮춘 게 아니라 아예 없앤 것이다.
           (실제로 0.16 → 0.42 로 올려 봐도 자의 값은 꿈쩍도 안 했다. 칸이 넷이면
            확률을 두 배로 해도 여전히 「없거나 하나」다.)
           그래서 바깥은 **칸마다 여러 번 굴린다** — 야영지 살림 대신 **자연**(덤불·
           바위·그루터기·통나무)을 잔뜩. 무리는 그대로다: 가운데는 살림이 빽빽하고
           바깥은 들풀과 돌이 흩어진 들판이 된다. 「비었다」와 「들판」은 다르다. */
        else if (wild) { from = wild.set; dens = wild.dens || 60; rolls = wild.rolls; }
        else dens = density * 0.45;
      } else { rolls = SCAT_ROLLS; dens = SCAT_DENS != null ? SCAT_DENS : density; }
      /* 굴림마다 **다른 씨앗**이 필요하다 — 같은 rnd 를 다시 쓰면 같은 자리에 같은
         것을 겹쳐 놓는다(그래도 화면은 안 바뀌고 그리기만 두 번 한다). */
      for (let k = 0; k < rolls; k++) {
        const r2 = k === 0 ? rnd : hash2((gx + layoutOX) * 31 + k * 7717, (gy + layoutOY) * 17 + k * 6311);
        if (r2 % 100 >= dens) continue;                      // 대부분의 칸은 빈 채로 둔다
        put(r2, gx, gy, from);
      }
    }
  }
}

/** ══ 점선은 **픽셀로 찍는다** ══ 캔버스 `setLineDash` 는 매끈한 벡터 선이라, 판에서
 *  이것만 픽셀아트가 아니다(가장자리가 반투명하게 번진다). 정수 자리에 정수 크기의
 *  네모를 찍으면 스프라이트와 같은 결이 된다.
 *  ★ 여기 하나에서만 만든다 — 진 둘레(drawHoldRing)와 관문·우두머리의 **예고 고리**가
 *    같은 몸을 쓴다. 예전엔 둘레만 픽셀이고 예고는 벡터였다([[carry-fixes-forward]]).
 *  @param dot  점 한 개의 한 변(스크린 px). 스프라이트 배율(us)에 매달아 넘긴다.
 *  @param step 각도 걸음(rad). 안 주면 **둘레 길이 ÷ dot** 으로 잡아 점이 이어 붙는다.
 *  @param on/off 점 `on` 개를 찍고 `off` 개를 비운다 = 점선의 결. */
export function pxDashEllipse(ctx, cx, cy, rx, ry, dot = 2, { step, on = 2, off = 1 } = {}) {
  const d = Math.max(1, Math.round(dot));
  if (step == null) {                                 // 라마누잔 둘레 근사 → 점이 맞물릴 걸음
    const a = Math.abs(rx), b = Math.abs(ry);
    const peri = Math.PI * (3 * (a + b) - Math.sqrt(Math.max(0, (3 * a + b) * (a + 3 * b))));
    step = 6.283185 / Math.max(8, Math.round(peri / d));
  }
  const per = on + off;
  for (let a = 0, k = 0; a < 6.283185; a += step, k++) {
    if (k % per >= on) continue;                      // 비우는 칸
    ctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), d, d);
  }
}

/** 같은 결의 **곧은** 점선(돌진 겨냥선). 길이를 dot 으로 나눠 찍는다. */
export function pxDashLine(ctx, x0, y0, x1, y1, dot = 2, { on = 2, off = 1 } = {}) {
  const d = Math.max(1, Math.round(dot));
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(len / d));
  const per = on + off;
  for (let k = 0; k <= n; k++) {
    if (k % per >= on) continue;
    const t = k / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), d, d);
  }
}

/** 소환수가 진을 치는 둘레. **점선도 픽셀로** — 캔버스 setLineDash 는 매끈하다.
 *  걸음(0.14)·점 크기(2)·결(2찍고 1비움)은 여태 화면에 서던 값 그대로다. */
export function drawHoldRing(ctx, cx, cy, r, squash) {
  ctx.fillStyle = "rgba(200,170,110,.22)";
  pxDashEllipse(ctx, cx, cy, r, r * squash, 2, { step: 0.14, on: 2, off: 1 });
}
