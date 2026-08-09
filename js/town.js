import { LOAD } from "./sprite8.js";
import { addGlow, ART, place } from "./ground.js";

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

/* ★ 울타리를 뺀다 — 병수님: "마을에 테두리같은건 없애라". 경계를 그리면 그것이
   **테두리**가 되고, 화면이 커질 때마다 「여기가 끝」이 보인다. 마을도 던전과 같이
   **끝없는 맵의 한 조각**이다(js/ground.js drawScatter). */
const TOWN = ["gate", "shop", "forge", "fire"];
/* 가게마다 사람 하나 — **가게에 사람이 없으면 폐허다.** */
const NPC_OF = { shop: "merchant", forge: "smith", gate: null };
const NPCS = ["merchant", "smith"];
const npc = {};
const art = {};
let left = TOWN.length, ready = false;

export function loadTown(dir = "assets/town") {
  for (const n of TOWN) {
    const im = new Image();
    LOAD.total++;
    im.onload = () => {
      /* 던전 소품과 **같은 톤 보정**을 건다(ground.js 와 같은 값). PixelLab 이 준 것은
         청회색으로 치우쳐 있어서, 한 군데서 따뜻한 회갈색으로 끌어와야 한 화면이 된다. */
      const c = document.createElement("canvas");
      c.width = im.width; c.height = im.height;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.filter = "sepia(0.42) saturate(1.05) brightness(0.80)";
      g.drawImage(im, 0, 0);
      art[n] = c;
      if (--left === 0) ready = true;
      LOAD.done++;
    };
    im.onerror = () => { if (--left === 0) ready = true; LOAD.done++; };
    im.src = `${dir}/${n}.png`;
  }
  for (const n of NPCS) {
    const im = new Image();
    LOAD.total++;
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.width; c.height = im.height;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.filter = "brightness(0.9)";
      g.drawImage(im, 0, 0);
      npc[n] = c; LOAD.done++;
    };
    im.onerror = () => { LOAD.done++; };
    im.src = `assets/npc/${n}.png`;
  }
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

  /* 모닥불 — **숨을 쉰다.** 불은 가만히 있으면 그림이 되고, 흔들리면 불이 된다.
     ★ 그런데 `sin(t*6)` 은 **초당 한 바퀴에 가까워** 프레임마다 -1/0/+1 을 오간다 —
     그게 「부들부들」로 보인다. 게다가 로딩 중에도 시간이 흘러 걷히는 순간 이미
     빠르게 떨고 있다. 주기를 늦추고(1.9), **아래로만** 1px 눌리게 한다: 위아래로
     오가면 떨림이고, 한 쪽으로만 눌렸다 펴지면 숨이다. */
  const fire = art.fire;
  if (fire) {
    const bob = Math.sin(t * 1.9) > 0.4 ? 1 : 0;
    place(ctx, fire, wx(FIRE[0]), wy(FIRE[1]) + bob, false);
    // ★ 정작 **모닥불에 빛을 안 넣고** 있었다 — 불이 있는데 안 밝으면 그림일 뿐이다
    addGlow(wx(FIRE[0]), wy(FIRE[1]) - 12 * sc * squash, 210 * sc, 1.15);
  }

  /* 장소 셋 — 그리면서 **누를 자리를 함께 적어 둔다.** 그림과 판정이 한 곳에서 나와야
     둘이 어긋나지 않는다(따로 적어 두면 배치를 고칠 때 한쪽만 고치게 된다). */
  /* ★ **place() 하나로 통일한다.** 예전엔 여기서 `y - im.height` 로 놓아
     그림 아래 투명 여백만큼 **둥둥 떠 있었다**(병수님 지적). 캐릭터에는 이미 알파
     경계로 발을 맞추고 있었는데 그 처방을 여기 안 옮긴 것이 잘못이었다. */
  for (const [id, key, rx, ry, name] of PLACES) {
    const im = art[key]; if (!im) continue;
    const gx = wx(rx), gy = wy(ry);
    place(ctx, im, gx, gy);
    // 대장간 화덕과 입구 등불은 **제 둘레를 밝힌다**
    if (id === "forge") addGlow(gx + 14 * sc, gy - 46 * sc * squash, 150 * sc, 1.0);
    if (id === "gate")  addGlow(gx, gy - 70 * sc * squash, 90 * sc, 0.7);
    /* NPC 는 가게 **앞에** 선다 — 사람이 없으면 좌판이 아니라 폐허다. */
    const npcIm = npc[NPC_OF[id]];
    if (npcIm) place(ctx, npcIm, gx + Math.round(28 * sc), gy + Math.round(10 * sc * squash));
    /* 누를 자리도 **그린 크기**로 잡는다 — 그림을 줄였는데 판정만 크면 엉뚱한 데가
       눌린다(그림과 판정은 한 곳에서 나와야 한다). */
    const f = im._foot || { cx: im.width / 2, bot: im.height, w: im.width };
    const k = ART.s;
    hits.push({ id, name, x: gx - f.cx * k, y: gy - f.bot * k,
                w: im.width * k, h: f.bot * k, lx: gx, ly: gy });
  }
}

/** 장소 이름표. **조명 뒤에** 그려야 어둠에 안 잠긴다 — 글자는 읽으라고 있는 것이다. */
export function drawTownLabels(ctx) {
  ctx.save();
  ctx.font = '18px "Galmuri9", monospace';
  ctx.textAlign = "center";
  for (const p of hits) {
    const y = p.ly + 22;
    ctx.fillStyle = "#000000cc";
    const tw = ctx.measureText(p.name).width;
    ctx.fillRect(Math.round(p.lx - tw / 2) - 5, y - 15, Math.round(tw) + 10, 21);
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
