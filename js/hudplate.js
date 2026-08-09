/* ══════════════════════════════════════════════════════════════
   하단 UI 를 **한 묶음**으로 잇는 판.
   ──────────────────────────────────────────────────────────────
   병수님: "하단 UI 방향이 좋긴한데, 내가 준 디아블로 UI처럼 어느정도 배경은 있어야
   할거 같은데? 이게 그냥 단순 배경이 아니라 UI가 한 묶음 이라는 느낌이 나와야지"

   오늘 여기서 두 번 헛돌았다:
     ① 화면 폭 띠 → 맵이 거기서 끝나 「맵 칸 + UI 칸」이 됐다
     ② 바탕을 통째로 지움 → 구슬·띠·칸이 **따로 노는 세 물건**이 됐다

   답은 가운데에 있다. **배경이 있되, 네모난 판이 아니라 이어 주는 뼈대여야 한다.**
   디아블로의 그 UI 가 한 덩어리로 보이는 이유는 배경이 깔려서가 아니라
   **구슬이 받침에 물려 있고 그 받침이 띠로 이어지기** 때문이다:

       구슬 ─ 받침(고리) ─ 띠(스킬·경험치) ─ 받침(고리) ─ 구슬

   그래서 이 판은 **하나의 실루엣**으로 그린다. 가운데는 띠, 양끝은 구슬을 감싸는
   고리, 그 둘이 붙어 있다. 반투명이라 그 밑으로 바닥이 비쳐 「떠 있음」도 지킨다.
   ══════════════════════════════════════════════════════════ */

const K = 3;                        // 한 픽셀이 화면에서 차지하는 크기
/* 받침 고리의 두께 — **한 곳에서** 정한다. 띠의 아랫변을 여기에 맞추므로
   그리는 값과 재는 값이 어긋나면 밑줄이 안 맞는다. */
const CRADLE_IN = 2.2, CRADLE_LOW = 3.4;

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/* 돌은 어둡게, 테는 무쇠에 금 실선 한 줄 — 구슬 테·칸 테와 **같은 결**이어야
   한 벌로 보인다(여기만 다른 재료를 쓰면 붙여 놓은 티가 난다). */
const STONE = ["rgba(34,31,27,.80)", "rgba(28,26,23,.80)", "rgba(23,21,19,.80)"];
const EDGE  = "rgba(8,7,6,.86)";
const IRON_U = "rgba(58,51,42,.86)", IRON_D = "rgba(20,17,14,.86)";
const GOLD_U = "rgba(169,141,88,.90)", GOLD_D = "rgba(90,74,40,.90)";

/** 판을 그린다. 자리는 **실제 요소에서 읽는다** — 배치가 바뀌어도 따라온다. */
export function drawPlate(cv, panel) {
  const hpEl = panel.querySelector(".orb.hp"), mpEl = panel.querySelector(".orb.mp"),
        midEl = panel.querySelector(".mid");
  if (!hpEl || !mpEl || !midEl) return;

  const W = panel.clientWidth, H = panel.clientHeight;
  const pw = Math.max(8, Math.ceil(W / K)), ph = Math.max(8, Math.ceil(H / K));
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  const g = cv.getContext("2d");
  g.clearRect(0, 0, pw, ph);

  const p = panel.getBoundingClientRect();
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - p.left) / K, y: (r.top - p.top) / K,
             w: r.width / K, h: r.height / K,
             cx: (r.left - p.left + r.width / 2) / K,
             cy: (r.top - p.top + r.height / 2) / K,
             r: r.width / 2 / K };
  };
  const hp = box(hpEl), mp = box(mpEl), mid = box(midEl);

  /* 띠 — 스킬 칸과 경험치를 감싼다. 위아래로 조금 물려 **여백이 테가 되게** 한다. */
  /* ★★ 병수님: "하단 UI가 상단으로 라인이 일자로 맞춰져있는데, 반대로 하단을 기준으로
     일자로 맞춰줘(상단은 라인 일자로 안맞아도 됨)". 재 보니 구슬 자리의 실루엣은
     757~898(받침 고리), 띠는 766~889 — 위아래로 9px 씩 어긋나 있었다.
     **아랫변을 받침 바닥에 맞춘다.** 물건이 놓인 것은 밑변으로 읽히니 아래가 한 줄이면
     한 덩어리로 앉아 보이고, 위는 구슬이 솟아도 그게 오히려 자연스럽다. */
  const cradleBot = (o) => o.cy + o.r + 0.6 + CRADLE_IN + CRADLE_LOW;
  const barT = mid.y - 4;
  const barB = Math.max(mid.y + mid.h + 3, cradleBot(hp), cradleBot(mp));
  const barL = hp.cx, barR = mp.cx;                  // 구슬 **속까지** 들어가야 이어진다
  const CH = 4;                                      // 띠 끝을 깎는다

  /* 받침 — 구슬을 감싸는 고리. 구슬보다 조금 크게, 아래쪽을 더 두껍게(무게가 아래에
     있어야 「받치고 있다」로 읽힌다). */
  const cradle = (o, x, y) => {
    const dx = x - o.cx, dy = y - o.cy;
    const rr = Math.sqrt(dx * dx + dy * dy);
    const thick = CRADLE_IN + (dy > 0 ? CRADLE_LOW * (dy / o.r) : 0);
    return rr > o.r + 0.6 && rr < o.r + 0.6 + thick;
  };

  const inside = (x, y) => {
    if (x >= barL && x <= barR && y >= barT && y <= barB) {
      const l = x - barL, r = barR - x, t = y - barT, b = barB - y;
      if (l + t < CH || r + t < CH || l + b < CH || r + b < CH) return false;   // 모서리 깎기
      return true;
    }
    return cradle(hp, x, y) || cradle(mp, x, y);
  };

  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      if (!inside(x, y)) continue;
      /* 테두리까지의 거리 — 이 값 하나로 바깥선·무쇠·금 실선·속을 다 정한다.
         (모양이 단순한 네모가 아니라서 **이웃을 보고** 재는 편이 확실하다.) */
      let d = 3;
      for (let k = 1; k <= 3 && d === 3; k++)
        if (!inside(x - k, y) || !inside(x + k, y) || !inside(x, y - k) || !inside(x, y + k)) d = k - 1;
      const up = y < barT + (barB - barT) * 0.5;
      let col;
      if (d === 0) col = EDGE;
      else if (d === 1) col = up ? IRON_U : IRON_D;
      else if (d === 2) col = up ? GOLD_U : GOLD_D;
      else col = STONE[hash2(x, y) % 3];
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
  }
}

/** 크기가 바뀌면 다시 그린다. 자리를 요소에서 읽으므로 **배치가 바뀌어도** 맞는다. */
export function watchPlate(cv, panel) {
  const redraw = () => drawPlate(cv, panel);
  redraw();
  new ResizeObserver(redraw).observe(panel);
  /* 글꼴이 늦게 오면 글자 크기가 변해 자리가 밀린다 — 그때 한 번 더 그린다. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  addEventListener("resize", redraw);
}
