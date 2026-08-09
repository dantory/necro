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

   ★★★ 세 번째로 틀린 곳 — 병수님: "배경이 지금 뭔가 단단히 잘못되었어 방향이".
   준 D4 화면을 **확대해서** 다시 보니 배경의 성격이 달랐다:

     · 저쪽 띠는 **칸 줄만** 감싼다. 높이가 칸 하나 남짓이고, 그 위에 얹힌 것은
       경험치 실선 하나뿐이다
     · 글자(수치)는 띠 **밖**에 있다 — 바탕 없이 그림자로만 읽힌다
     · 구슬은 띠보다 **훨씬 커서** 위아래로 넘치고, 띠와는 조각상(받침)으로 이어진다

   나는 글자·경험치·칸을 **전부 한 상자에 담아** 두툼한 판을 만들었다. 그러면
   배경이 「띠」가 아니라 「덩어리」가 되어 화면을 누른다. 감쌀 것은 **칸 줄뿐**이다.
   ══════════════════════════════════════════════════════════ */

const K = 3;                        // 한 픽셀이 화면에서 차지하는 크기

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
  /* ★★★★ 「하단을 한 줄로」를 **잘라서** 풀었더니 병수님: "하단이 좀 잘린거 같은데?".
     맞다 — 받침 고리를 바닥선에서 썰면 그건 정렬이 아니라 **잘린 그림**이다.
     (게다가 자르기 전에도 고리가 화면 밑으로 넘쳐 캔버스에서 잘리고 있었다.)
     자르는 대신 **자리를 만든다** — 판 아래 여백을 늘려 고리가 통째로 들어오게 했다
     (hud.css 의 #panel padding-bottom). 여기서는 아무것도 안 자른다. */
  /* 띠는 **칸 줄만** 감싼다(위 ★★★). 글자와 경험치는 띠 위에 그냥 얹힌다. */
  const beltEl = panel.querySelector("#belt");
  const belt = box(beltEl || midEl);
  /* ★ 픽셀을 열마다 훑어 보니 판 자체엔 끊긴 데가 없었다(아래턱 0). 남은 것은
     **띠 밑변 874 vs 구슬 밑변 888** — 구슬이 14px 더 내려와 양옆에 턱이 진다.
     띠 밑변을 **구슬 밑변에 정확히** 맞춘다. 고리가 없으니 썰릴 것도 없고,
     띠 끝은 구슬에 가려지므로 밑변 한 줄만 남는다. */
  /* ★ 병수님: "스킬 부분 위아래 공간이 너무 딱 붙어서 좀 넓히면 좋겠고".
     ★★ 여기 단위를 틀렸다 — barT 는 **아트 픽셀**이라 `- 7` 이 화면에서는 21px 이고,
     판이 위로 올라가 **경험치 띠를 삼켰다**(판 805 · 띠 807~814). 눈에 보이는 값은
     화면 픽셀이니 **화면 기준으로 적고 K 로 나눈다.** */
  /* ★ 10/8 도 아직 붙어 보였다(병수님: "스킬 영역 위아래 간격 넣어줘~~").
     16/16 으로 벌린다 — 아래는 구슬 밑변이 고정이라 **칸 줄을 그만큼 올려서**
     맞춘다(hud.css .mid padding-bottom). 위아래가 같아야 칸이 가운데 앉는다. */
  const PAD_TOP = 16;                                // 칸 줄 위 여백(화면 px)
  const barT = belt.y - PAD_TOP / K;
  const barB = Math.max(belt.y + belt.h + 3, hp.cy + hp.r, mp.cy + mp.r);
  /* 띠는 구슬 **한가운데까지** 들어간다 — 끝이 구슬에 완전히 가려져 이음매가 안 보인다. */
  const barL = hp.cx, barR = mp.cx;
  const CH = 4;                                      // 띠 끝을 깎는다

  /* ★★★★★★ 받침 **고리를 없앤다.** 병수님: "하단에 중간에 짤린부분 있다고,,
     왜 자꾸 반복되냐 같은실수가".

     원인은 값이 아니라 **구조**였다. 띠(네모)와 고리(원)를 각각 그려서 붙이면
     둘이 만나는 자리가 늘 어긋난다 — 두께를 바꾸면 이음매가 어긋나고, 잘라내면
     썰린 자국이 남고, 여백을 늘리면 빈 자리가 생긴다. 오늘 이 자리에서만 네 번
     같은 실수를 되풀이했는데, 전부 **이음매를 손으로 맞추려 한 것**이었다.

     이음매를 **없앤다.** 띠 하나만 그리고 구슬은 그 위에 얹는다 — 띠의 양 끝은
     구슬 뒤로 들어가므로 애초에 만나는 자리가 화면에 없다.
     (디아블로도 그렇다: 띠는 조각상 뒤로 들어가고 구슬이 그 끝을 덮는다.) */
  const inside = (x, y) => {
    if (x < barL || x > barR || y < barT || y > barB) return false;
    const l = x - barL, r = barR - x, t = y - barT, b = barB - y;
    if (l + t < CH || r + t < CH || l + b < CH || r + b < CH) return false;    // 모서리 깎기
    return true;
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
