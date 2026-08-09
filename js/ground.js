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
const LIT = ["#efe2c8", "#a8977c", "#5e5142", "#332a20", "#191410"];

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
export function drawGround(ctx, w, h, cx, cy, radius, squash, sc) {
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

  /* ②' 벽과 소품 — **조명보다 먼저** 그린다. 그래야 빛 밖의 것은 어둠에 잠기고
     빛이 닿은 것만 보인다. 나중에 그리면 어둠 위에 둥둥 떠서 스티커가 된다. */
  if (sc) drawRoom(ctx, cx, cy, sc, squash);

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
const DECOR = ["wall", "pillar", "coffin", "bones", "brazier", "rubble"];
const decor = {};
let decorLeft = DECOR.length, decorReady = false;

export function loadDecor(dir = "assets/decor") {
  for (const n of DECOR) {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.width; c.height = im.height;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.filter = "sepia(0.42) saturate(1.15) brightness(0.92)";
      g.drawImage(im, 0, 0);
      decor[n] = c;
      if (--decorLeft === 0) decorReady = true;
    };
    im.onerror = () => { if (--decorLeft === 0) decorReady = true; };
    im.src = `${dir}/${n}.png`;
  }
}

/** 방을 짓는다. **월드 좌표로 자리를 정하고** 화면으로 옮긴다 —
 *  화면 좌표로 박으면 폭이 바뀔 때마다 소품이 제자리를 잃는다.
 *  자리는 **고정값**이다(난수가 아니다). 매번 달라지면 같은 방으로 안 읽힌다. */
/* ★ 자리를 처음엔 x ±430 까지 벌렸다가 **소품이 화면 밖에서 잘렸다.**
   세로 화면(414x860)에서 보이는 월드 범위는 가로가 ±330, 세로가 ±690 이다 —
   **세로가 두 배 넓다.** 그러니 가로로 벌리지 말고 **세로로 늘어놓아야** 한다.
   화면 비율이 판을 정하지, 방이 화면을 정하지 않는다. */
const ROOM = { x: 300, y: 330 };
const PROPS = [
  ["coffin",  -190, -255], ["bones",    195, -240], ["brazier", -255,  -95],
  ["rubble",   250,  -35], ["bones",   -205,  215], ["coffin",   185,  250],
  ["rubble",  -100, -305], ["brazier",  250,  110], ["bones",     40,  330],
  ["rubble",  -230,  345], ["coffin",   150,  420], ["bones",   -140,  455],
];
const PILLARS = [-245, -85, 85, 245];

export function drawRoom(ctx, cx, cy, sc, squash) {
  if (!decorReady) return;
  const wx = (x) => Math.round(cx + x * sc);
  const wy = (y) => Math.round(cy + y * sc * squash);
  ctx.imageSmoothingEnabled = false;

  /* ① 위쪽 벽 — 가로로 이어 붙인다. 아래쪽 벽은 두지 않는다: 화면 아래는 판이
     가리고, 벽이 앞을 막으면 **방 안이 아니라 상자 속**을 보는 그림이 된다. */
  const wall = decor.wall;
  if (wall) {
    const y = wy(-ROOM.y) - wall.height;
    for (let x = wx(-ROOM.x); x < wx(ROOM.x); x += wall.width)
      ctx.drawImage(wall, x, y);
  }
  /* ② 기둥 — 위쪽 벽 앞에 늘어세운다. 발이 벽 아래 선에 닿아야 벽에 붙어 보인다. */
  const pil = decor.pillar;
  if (pil) for (const x of PILLARS)
    ctx.drawImage(pil, wx(x) - pil.width / 2, wy(-ROOM.y + 16) - pil.height);

  /* ③ 소품 — 자리마다 고정. 발밑 그림자를 한 겹 깔아 바닥에 **놓인 것**으로 만든다. */
  for (const [n, x, y] of PROPS) {
    const im = decor[n]; if (!im) continue;
    const px = wx(x) - im.width / 2, py = wy(y) - im.height;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.beginPath();
    ctx.ellipse(wx(x), wy(y) - 2, im.width * 0.34, im.width * 0.12, 0, 0, 6.284);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(im, px, py);
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
