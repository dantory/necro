import { LOAD } from "./sprite8.js";
import { addGlow, ART, place, decorOf } from "./ground.js";

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

/* ══ 마을에 선 네크로멘서가 **어디를 보는가** ══
   서 있는 그림은 방향마다 한 장씩(assets/char/necro/<dir>.png) — 프레임으로는 못 살린다.
   대신 **고개를 돌린다.** 사람은 한 곳만 보고 서 있지 않다: 대부분 불을 쬐다가
   이따금 대장간·상인·입구 쪽으로 눈을 준다. 여덟 방향이 이미 다 구워져 있으니
   dx,dy 만 주면 그림은 저절로 골라진다(sprite8 의 dirName).

   자리는 **위의 상수에서 뽑는다** — 건물을 옮기면 시선도 따라 옮게(따로 적어 두면
   배치를 고칠 때 한쪽만 고치게 된다). 머무는 시간은 불이 길고 나머지는 짧다:
   둘러보는 것이 목적이지 두리번거리는 것이 아니다. */
const GAZE = [
  ["fire",  4.0], ["forge", 1.8], ["fire", 3.2],
  ["shop",  1.9], ["fire",  2.6], ["gate", 1.5],
];
const AT = { fire: FIRE, ...Object.fromEntries(PLACES.map(([id, , rx, ry]) => [id, [rx, ry]])) };
const GAZE_CYCLE = GAZE.reduce((s, g) => s + g[1], 0);
/** 마을 시계 t 초에 네크로멘서가 보는 쪽 → [dx, dy] (월드 방향, 크기는 상관없다). */
export function townGaze(t) {
  let u = ((t % GAZE_CYCLE) + GAZE_CYCLE) % GAZE_CYCLE, where = GAZE[0][0];
  for (const [id, sec] of GAZE) { if (u < sec) { where = id; break; } u -= sec; }
  const p = AT[where] || FIRE;
  /* 네크로멘서는 화면 한가운데(0,0) 조금 아래에 선다 — 거기서 그곳까지의 방향이다.
     세로는 판이 눌려 있어도 **월드 좌표로** 견준다(sprite8 주석과 같은 규칙). */
  return [p[0], p[1] - 0.03];
}

/** 서 있는 숨 — **아래로만 1px.** 위아래로 오가면 떨림이고, 한 쪽으로만 눌렸다
 *  펴지면 숨이다(모닥불에 쓴 것과 같은 처방). 불(1.9)과 박자를 달리해 둘이 같이
 *  들썩이지 않게 한다 — 한 화면에서 두 가지가 같은 박자로 뛰면 그게 더 눈에 띈다. */
export const townBreath = (t) => (Math.sin(t * 1.35) > 0.55 ? 1 : 0);

/* ══ **마당** ══ (W-3 · 병수님 「마을 한가운데가 빈 갈색 벌판이다」)
   ──────────────────────────────────────────────────────────────
   처음 켠 사람이 **제일 오래 보는 자리가 제일 허전했다.** 까닭은 코드에 있다:
   바닥 소품은 `clear: 210` 으로 한가운데를 **동그랗게 비운다**(js/main.js) —
   장소 셋이 설 자리를 지키려던 것인데, 정작 그 셋은 전부 **바깥 테두리**에 있고
   비워진 원 안에는 캐릭터와 모닥불뿐이라 화면 한복판이 통째로 맨흙이 됐다.

   그렇다고 비우기를 줄이면 안 된다 — 그건 **뿌리는 것**이라 캐릭터 발밑에도
   통이 굴러온다. 비운 자리는 **손으로 놓는다.** 흩뿌린 들판과 사람이 차린 마당은
   다른 것이고, 한가운데는 차려져 있어야 「여기가 마을」이 된다.

   놓는 어휘는 D2 로그 야영지의 한복판 그대로다: **불(장대 횃불 넷) · 우물 ·
   무기걸이 · 솥과 통나무(불 앞에 앉는 자리) · 구유 · 건조대.**
   ★ 제일 크게 달라지는 것은 물건이 아니라 **빛**이다 — 횃불 넷이 캐릭터를
     둘러싸고 빛웅덩이를 만든다. 여태 한복판의 유일한 빛은 모닥불 하나였다.
   ★ 모닥불에 **쓰임**도 같이 준다(로드맵의 「한가운데 모닥불이 뜻이 없다」):
     솥이 걸리고 통나무가 놓이면 그건 「불」이 아니라 **모이는 자리**다.

   자리는 PLACES 와 **같은 비율식**이다(화면 반너비·반높이의 몇 배). 그런데
   조각은 `place()` 가 화면 크기 그대로(ART.s) 그리므로 **좁은 화면에서는 물건이
   그대로인 채 자리만 좁아진다** — 폰에서 다 놓으면 캐릭터를 덮는다. 그래서
   항목마다 **나타날 창 폭의 문턱**을 준다: 좁으면 횃불과 불가만 남는다. */
const YARD = [
  /* 조각,      rx,     ry,   창 폭 문턱(px) */
  ["torch",   -0.42, -0.12,    0],
  ["torch",    0.42, -0.12,    0],
  ["torch",   -0.27,  0.30,    0],
  ["torch",    0.27,  0.30,    0],
  ["cookpot", -0.21,  0.20,  880],
  ["logs",     0.19,  0.25,  880],
  ["well",    -0.25, -0.34, 1000],
  ["wrack",    0.26, -0.32, 1000],
  ["trough",  -0.47,  0.13, 1180],
  ["dryrack",  0.47,  0.10, 1180],
];

/* 건물 **앞에** 걸치는 것들 — [조각, 발에서의 x, y]. 살짝 겹쳐야 겹침이 보인다
   (완전히 떨어지면 그냥 옆에 놓인 물건이고, 너무 겹치면 입구를 막는다). */
/* ★ 처음에 원본 크기로 놓았더니 **덤불이 대장간보다 컸다** — 앞에 걸치는 것은
   눈에 띄면 안 되고 「거기 원래 있던 것」이어야 하므로 크기를 따로 줄인다. */
const FRONT = {
  shop:  [["shrub", -66, -2, 0.34], ["rock", 54, 5, 0.30]],
  forge: [["shrub", 74, -2, 0.32], ["rock", -62, 3, 0.34], ["shrub", -12, 10, 0.26]],
  gate:  [["shrub", -52, 2, 0.30], ["rock", 46, -1, 0.32]],
};

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
      /* ★ 건물만 0.80 이고 소품은 0.72 라 **건물이 혼자 밝아** 떠 보였다 —
         한 화면에 있는 것은 같은 자로 눌러야 한 지역이 된다. */
      g.filter = "sepia(0.42) saturate(1.05) brightness(0.72)";
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
    /* ★ 여기 있던 **넓고 옅은 그늘**은 걷어냈다. 그건 스프라이트가 제 바닥판을
       달고 있을 때 판 가장자리를 어둠에 잠그려던 임시 처방이었는데, 이제 판 자체를
       잘라냈고(tools/cut_plate.py) place() 의 그림자가 **실루엣을 따라** 흐른다.
       덧칠할 이유가 사라졌다 — 원인을 없앴으면 처방도 걷는다. */
    place(ctx, im, gx, gy);
    /* ★★★ **아무것도 건물을 가리지 않는 것** — 이게 마지막으로 남은 「붙여 놓은 티」다.
       소품은 전부 바닥과 함께(drawGround) 먼저 그리므로 언제나 건물 **뒤**에 선다.
       그래서 건물의 아랫변이 늘 한 줄로 깨끗하게 잘려 보인다. 실제 풍경에서는 발치에
       뭔가가 **걸쳐** 있다 — 자란 풀, 굴러온 돌, 쌓아 둔 것. 그 겹침 하나가
       「같은 공간에 있다」를 만든다. 그래서 건물마다 두엇을 **앞에** 덧놓는다. */
    for (const [dn, ox, oy, dk] of FRONT[id] || []) {
      const dim = decorOf(dn); if (!dim) continue;
      place(ctx, dim, gx + Math.round(ox * sc),
            gy + Math.round(oy * sc * squash), true, dk);
    }
    // 대장간 화덕과 입구 등불은 **제 둘레를 밝힌다**
    /* ★ 대장간 그림을 **바깥에서 본 건물**로 바꾸면서(예전 것은 벽이 잘린 실내라
       마을 한복판에 방이 하나 떠 있는 꼴이었다) 불이 있는 자리가 오른쪽으로 옮겨갔다.
       빛은 **그림의 따뜻한 화소 무게중심**에 놓는다 — 그림을 바꾸면 빛도 따라 옮긴다
       (안 옮기면 창문은 캄캄한데 엉뚱한 벽이 밝다). 현재 그림 기준 발에서 +24, -46. */
    if (id === "forge") addGlow(gx + 24 * sc, gy - 46 * sc * squash, 160 * sc, 1.0);
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

  /* ── **마당** ── 위의 YARD 를 **뒤에서 앞으로** 놓는다(ry 가 작은 것부터).
     안 그러면 뒤에 선 우물이 앞의 솥을 덮는다 — 소품을 뿌리는 쪽(drawScatter)에서
     이미 겪은 것이고, 고친 방법은 여기로 옮긴다([[carry-fixes-forward]]). */
  /* ★ 자리는 비율인데 **조각 크기는 화면 그대로**(ART.s)라, 창이 넓어질수록 마당만
     벌어지고 물건은 안 커진다 — 1920 에서 찍어 보니 마당이 「둘러싼 자리」가 아니라
     그냥 넓은 들판이 됐다. 그래서 비율로 놓되 **화면 px 로 상한을 건다.**
     좁은 창에서는 원래 값이 더 작으므로 상한이 안 걸린다(폰은 한 톨도 안 변한다). */
  const YMAX = { x: 300, y: 92 };
  const yx = (rx) => cx + Math.max(-YMAX.x, Math.min(YMAX.x, Math.round(rx * R.x * sc)));
  const yy = (ry) => cy + Math.max(-YMAX.y, Math.min(YMAX.y, Math.round(ry * R.y * sc * squash)));
  for (const [key, rx, ry, minW] of [...YARD].sort((a, b) => a[2] - b[2])) {
    if (w < minW) continue;                       // 좁은 화면에서는 뺀다(위 주석)
    const im = decorOf(key); if (!im) continue;
    const px = yx(rx), py = yy(ry);
    place(ctx, im, px, py);
    /* 장대 횃불은 불이 **꼭대기**에 있다 — 발치에 빛을 두면 「바닥이 밝고 불은
       캄캄한」 그림이 된다. 높이(-101)·반경은 들판 횃불과 **같은 값**을 쓴다
       (js/ground.js drawScatter 에서 따뜻한 화소 무게중심으로 잰 것).
       그림을 바꾸면 두 곳을 같이 고쳐야 한다. */
    if (key === "torch") addGlow(px, py - 101 * ART.s, 150 * sc, 1.15);
  }
}

/** 지금 손가락(마우스)이 얹힌 장소. 없으면 null. 이름표를 밝히는 데만 쓴다. */
let hover = null;
export function setTownHover(id) { hover = id; }

/** 장소 이름표. **조명 뒤에** 그려야 어둠에 안 잠긴다 — 글자는 읽으라고 있는 것이다.
 *  ★ 병수님: 「건물 이름표가 검은 상자라 개발용 라벨처럼 보인다」(08-16).
 *  맞다 — 디아블로는 이름을 **판에 안 붙인다.** 판을 깔면 그 판이 장면 위에 얹힌
 *  UI 가 되어, 마을이 그림이 아니라 편집 화면처럼 보인다.
 *  그렇다고 판만 걷어내면 [[sprite-brings-its-own-ground]] 의 반대편으로 넘어진다 —
 *  지붕·우물 위에서 획이 먹힌다(바로 어제 「금 182k」가 그랬다).
 *  → **판 하나 대신 획마다 제 바닥을 단다**: 검은 테두리 + 옅은 그림자.
 *    글자 모양대로만 어두워지므로 장면을 안 가리고, 어떤 배경에서도 읽힌다.
 *  → 가리킨 곳만 밝힌다(D2 의 「이름이 떠오르는」 결). 안 가리킨 것은 옅게 —
 *    아주 지우지는 않는다. 누를 곳이 셋뿐인데 안 보이면 처음 온 사람이 헤맨다. */
export function drawTownLabels(ctx) {
  ctx.save();
  ctx.font = '18px "Galmuri9", monospace';
  ctx.textAlign = "center";
  ctx.lineJoin = "round";   // 획이 만나는 자리에 뿔이 서지 않게
  ctx.miterLimit = 2;
  for (const p of hits) {
    const y = p.ly + 24;
    const on = p.id === hover;
    ctx.globalAlpha = on ? 1 : 0.78;
    /* 테두리는 **글자 아래로 깔린다** — 굵기의 절반만 밖으로 나오므로 4px 이면
       사방 2px. 그림자는 그 테두리에만 걸어 두고 채우기 전에 끈다(글자가 흐려진다). */
    ctx.shadowColor = "#000000d0";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeText(p.name, p.lx, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = on ? "#ffe9b0" : "#c8aa6e";
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
