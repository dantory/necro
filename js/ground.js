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
        g.filter = `brightness(${boost * tone}) saturate(0.9)`;
        g.translate(sx < 0 ? t : 0, sy < 0 ? t : 0);
        g.scale(sx, sy);
        g.drawImage(im, 0, 0);
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
function dirtAt(vx, vy) {
  const blob = (hash2(vx >> 2, vy >> 2) % 100) < 30;
  const edge = hash2(vx * 3 + 11, vy * 5 + 7) % 100;
  return blob ? edge < 86 : edge < 7;
}

/** Wang 바닥을 깐다. 못 쓰면 false 를 돌려주고 기존 타일 방식으로 넘어간다. */
function drawWang(ctx, w, h, cx, cy) {
  if (!wang || !wangTiles) return false;
  const t = wangTiles[0].width;
  ctx.imageSmoothingEnabled = false;
  const ox = Math.floor(cx) % t - t, oy = Math.floor(cy) % t - t;
  for (let y = oy, gy = 0; y < h + t; y += t, gy++) {
    for (let x = ox, gx = 0; x < w + t; x += t, gx++) {
      const key = (dirtAt(gx, gy) ? "1" : "0") + (dirtAt(gx + 1, gy) ? "1" : "0") +
                  (dirtAt(gx, gy + 1) ? "1" : "0") + (dirtAt(gx + 1, gy + 1) ? "1" : "0");
      const pos = wang[key];
      if (!pos) continue;
      ctx.drawImage(wangTiles[pos[1] * 4 + pos[0]], x, y);
    }
  }
  return true;
}

/** 전장 바닥 한 판. **타일 → 빛** 순서로 얹는다. */
export function drawGround(ctx, w, h, cx, cy, radius, squash, sc, scatter) {
  ctx.fillStyle = "#070504"; ctx.fillRect(0, 0, w, h);

  /* ① 돌바닥 — 타일을 격자로 깐다. **정수 좌표로만** 놓는다(소수면 가장자리가 흐려진다).
     자리마다 네 변형 중 하나를 고르는데, **좌표로 정한다**(난수가 아니다) —
     난수면 매 프레임 무늬가 바뀌어 바닥이 끓는다. */
  if (wangTiles && wang && wanted === "town" && drawWang(ctx, w, h, cx, cy)) {
    drawDecals(ctx, cx, cy, sc, squash, w, h, (scatter && scatter.decal) || 1);
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
        const mat = mats > 1 && (hash2(gx >> 3, gy >> 3) % 10) < 4 ? 1 : 0;
        ctx.drawImage(tiles[mat * 12 + (hash2(gx >> 2, gy >> 2) % 3) * 4 + (hash2(gx, gy) % 4)], x, y);
      }

    /* ②' 얼룩 — **격자를 가로질러** 놓이는 것들. 타일을 아무리 늘려도 경계는 남는데,
       경계를 넘어 걸치는 것이 하나 있으면 거기서 격자가 끊긴다(디아블로 1 트리스트람의
       바닥이 그렇다: 같은 흙인데 밟아 닳은 길과 자국이 격자를 지운다). */
    drawDecals(ctx, cx, cy, sc, squash, w, h, (scatter && scatter.decal) || 1);
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


/* ══ 바닥 얼룩 ══ 타일 위에 **평평하게** 얹는다(서 있는 물건이 아니므로 그림자도
   접지도 없다). 자리는 소품과 같은 규칙 — 좌표로 정해서 늘 같고, 끝이 없다. */
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
      const hsh = hash2(gx * 7 + 13, gy * 11 + 5);
      if ((hsh % 100) >= 42 * mul) continue;            // 칸 열에 넷 정도만(mul 로 조절)
      const name = set[(hsh >> 7) % set.length];
      const im = decalArt[name]; if (!im) continue;
      const wx = (gx + 0.5) * DCELL + ((hsh >> 11) % 90) - 45;
      const wy = (gy + 0.5) * DCELL + ((hsh >> 17) % 90) - 45;
      const px = Math.round(cx + wx * sc), py = Math.round(cy + wy * sc * squash);
      const k = ART.s * (0.8 + ((hsh >> 23) % 5) * 0.1);
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
const DECOR = ["pillar", "coffin", "bones", "brazier", "rubble"];
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
