/* ══════════════════════════════════════════════════════════════
   **마을** — 병수님: "마을도 만들어줘, 마을에서 던전으로 진입하는거고,
   마을에서 아이템 구매 / 강화 등을 진행할 수 있게".
   ──────────────────────────────────────────────────────────────
   **던전과 같은 파이프라인을 그대로 쓴다.** 바닥 타일 → 조각 → 조명(js/ground.js).
   마을만 따로 그리면 톤이 어긋나고 코드가 두 벌이 된다 — 디아블로 2 의 로그레 야영지도
   던전과 **같은 엔진으로 그린 한 장면**일 뿐이다. 다른 것은 셋뿐:

     · 바닥이 흙(bone_tile)이고 · 빛이 모닥불이라 더 넓고 따뜻하고
     · 서 있는 것이 적이 아니라 **들어갈 수 있는 곳**이다

   자리는 던전과 같은 규칙 — **비율로 적고 화면에서 보이는 범위에 맞춘다.**
   좁은 화면에서는 세로로, 넓은 화면에서는 가로로 벌어진다.
   ══════════════════════════════════════════════════════════ */

const PLACES = [
  /* id,      그림,     비율 x,  비율 y,  이름 */
  ["gate",  "gate",   0.00, -0.55, "던전 입구"],
  ["shop",  "shop",  -0.62, -0.05, "상인"],
  ["forge", "forge",  0.62, -0.05, "대장간"],
];
const FIRE = [0.00, 0.30];

const TOWN = ["gate", "shop", "forge", "fire", "fence"];
const art = {};
let left = TOWN.length, ready = false;

export function loadTown(dir = "assets/town") {
  for (const n of TOWN) {
    const im = new Image();
    im.onload = () => {
      /* 던전 소품과 **같은 톤 보정**을 건다(ground.js 와 같은 값). PixelLab 이 준 것은
         청회색으로 치우쳐 있어서, 한 군데서 따뜻한 회갈색으로 끌어와야 한 화면이 된다. */
      const c = document.createElement("canvas");
      c.width = im.width; c.height = im.height;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.filter = "sepia(0.42) saturate(1.15) brightness(0.95)";
      g.drawImage(im, 0, 0);
      art[n] = c;
      if (--left === 0) ready = true;
    };
    im.onerror = () => { if (--left === 0) ready = true; };
    im.src = `${dir}/${n}.png`;
  }
}

/** 그림에서 **실제로 칠해진 폭**을 잰다(양옆 투명 여백을 뺀 값).
 *  한 번 재고 캔버스에 적어 둔다 — 매 프레임 픽셀을 훑을 이유가 없다. */
function fenceStep(cv) {
  if (cv._step) return cv._step;
  const g = cv.getContext("2d");
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let lo = cv.width, hi = 0;
  for (let x = 0; x < cv.width; x++)
    for (let y = 0; y < cv.height; y++)
      if (d[(y * cv.width + x) * 4 + 3] > 8) { if (x < lo) lo = x; if (x > hi) hi = x; break; }
  cv._step = Math.max(8, hi - lo + 1);
  return cv._step;
}

/** 화면에서 각 장소가 차지하는 네모(클릭 판정에 쓴다). draw 가 채운다. */
let hits = [];
export const townHits = () => hits;

/** 마을을 그린다. 반환값은 없고, 누를 수 있는 자리는 townHits() 로 가져간다. */
export function drawTown(ctx, w, h, cx, cy, sc, squash, t) {
  hits = [];
  if (!ready) return;
  const halfW = (w / 2) / sc, halfH = (h / 2) / (sc * squash);
  const R = { x: halfW * 0.92, y: halfH * 0.62 };
  const wx = (x) => Math.round(cx + x * R.x * sc);
  const wy = (y) => Math.round(cy + y * R.y * sc * squash);
  ctx.imageSmoothingEnabled = false;

  /* 울타리 — 마을의 경계. 위쪽 한 줄.
     ★ 조각 폭(128) 그대로 띄웠더니 **사이가 벌어져 세 토막으로 보였다** — 그림이
     캔버스 안에서 여백을 두고 그려져 있기 때문이다. 「이어 붙이라」고 주문해도
     여백까지 없어지지는 않는다. 그래서 **불투명한 폭만큼만** 밀어 겹쳐 놓는다. */
    const fence = art.fence;
  if (fence) {
    const step = fenceStep(fence);
    const y = wy(-0.94) - fence.height;
    for (let x = wx(-1.05); x < wx(1.05); x += step) ctx.drawImage(fence, x, y);
  }

  // 모닥불 — **숨을 쉰다.** 불은 가만히 있으면 그림이 되고, 흔들리면 불이 된다
  const fire = art.fire;
  if (fire) {
    const bob = Math.round(Math.sin(t * 6) * 1) ;
    ctx.drawImage(fire, wx(FIRE[0]) - fire.width / 2, wy(FIRE[1]) - fire.height + bob);
  }

  /* 장소 셋 — 그리면서 **누를 자리를 함께 적어 둔다.** 그림과 판정이 한 곳에서 나와야
     둘이 어긋나지 않는다(따로 적어 두면 배치를 고칠 때 한쪽만 고치게 된다). */
  for (const [id, key, rx, ry, name] of PLACES) {
    const im = art[key]; if (!im) continue;
    const px = wx(rx) - im.width / 2, py = wy(ry) - im.height;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.beginPath();
    ctx.ellipse(wx(rx), wy(ry) - 2, im.width * 0.36, im.width * 0.12, 0, 0, 6.284);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(im, px, py);
    hits.push({ id, name, x: px, y: py, w: im.width, h: im.height,
                lx: wx(rx), ly: wy(ry) });
  }
}

/** 장소 이름표. **조명 뒤에** 그려야 어둠에 안 잠긴다 — 글자는 읽으라고 있는 것이다. */
export function drawTownLabels(ctx) {
  ctx.save();
  ctx.font = '11px "Galmuri11", monospace';
  ctx.textAlign = "center";
  for (const p of hits) {
    const y = p.ly + 13;
    ctx.fillStyle = "#000000cc";
    const tw = ctx.measureText(p.name).width;
    ctx.fillRect(Math.round(p.lx - tw / 2) - 3, y - 9, Math.round(tw) + 6, 13);
    ctx.fillStyle = "#c8aa6e";
    ctx.fillText(p.name, p.lx, y);
  }
  ctx.restore();
}

/** 누른 자리가 어느 장소인가. 그림의 네모로 판정하되 **조금 넉넉하게** —
 *  손가락은 정확하지 않고, 못 눌러서 두 번 누르는 것이 제일 나쁘다. */
export function townHitAt(x, y) {
  const PAD = 8;
  for (const p of hits) {
    if (x >= p.x - PAD && x <= p.x + p.w + PAD &&
        y >= p.y - PAD && y <= p.y + p.h + PAD) return p.id;
  }
  return null;
}
