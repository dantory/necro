/* ══════════════════════════════════════════════════════════════
   **테두리도 픽셀로 그린다.** — 병수님: "다른 테두리도 픽셀스타일로 바꾸면?"
   ──────────────────────────────────────────────────────────────
   구슬을 캔버스로 옮기고 나니 이번엔 **칸과 띠의 테두리**가 매끈하게 남았다.
   `border:1px solid` 는 언제나 정확히 1px 이고 모서리가 딱 떨어진다 — 픽셀아트의
   테두리는 그렇지 않다. **두껍고, 색이 몇 단계고, 모서리가 깎여 있다.**

   ★ 여기서 함정 하나. 칸은 `flex:1 1 0` 이라 폭이 30·41·68px 로 **화면마다 다르다.**
   작은 캔버스를 CSS 로 늘리면(구슬처럼) 배율이 2.05배 같은 소수가 되어 **픽셀이
   들쭉날쭉해진다** — 어떤 줄은 두 칸, 어떤 줄은 세 칸. 그래서 칸은 **실제 크기와
   1:1 로** 그리고, 픽셀아트다움은 배율이 아니라 **선의 두께와 색 단계**로 낸다.
   크기가 바뀌면 ResizeObserver 가 다시 그린다.
   ══════════════════════════════════════════════════════════ */

/** 모서리를 몇 칸 깎을지. 픽셀아트의 네모는 직각으로 안 끝난다. */
const CHAMFER = 2;

function px(g, x, y, w = 1, h = 1) { g.fillRect(x, y, w, h); }

/** 테두리 한 겹을 두른다 — 모서리를 깎아서. `i` 는 바깥에서 몇 번째 겹인가. */
function ring(g, w, h, i, top, bottom, side) {
  const c = Math.max(0, CHAMFER - i);            // 안쪽 겹일수록 덜 깎는다
  g.fillStyle = top;    px(g, i + c, i, w - 2 * (i + c), 1);
  g.fillStyle = bottom; px(g, i + c, h - 1 - i, w - 2 * (i + c), 1);
  g.fillStyle = side;
  px(g, i, i + c, 1, h - 2 * (i + c));
  px(g, w - 1 - i, i + c, 1, h - 2 * (i + c));
  /* 깎인 모서리를 **계단으로** 메운다. 대각선을 그리는 게 아니라 한 칸씩 밀어 찍는다. */
  for (let k = 0; k < c; k++) {
    const y1 = i + c - 1 - k, y2 = h - 1 - (i + c - 1 - k);
    g.fillStyle = k === 0 ? side : top;    px(g, i + k, y1);
    g.fillStyle = k === 0 ? side : top;    px(g, w - 1 - i - k, y1);
    g.fillStyle = k === 0 ? side : bottom; px(g, i + k, y2);
    g.fillStyle = k === 0 ? side : bottom; px(g, w - 1 - i - k, y2);
  }
}

/** 스킬 칸 하나. **바깥은 어두운 쇠, 안쪽은 파인 홈.**
 *  위가 밝고 아래가 어두우면 **튀어나온 것**, 반대면 **파인 것**으로 읽힌다 —
 *  테두리는 튀어나오게, 속은 파이게 해야 「아이콘이 홈에 앉은 것」이 된다.
 *
 *  ★ `locked` — **아직 안 배운 자리.** 예전엔 같은 칸을 그려 놓고 CSS `opacity:.5`
 *  로만 죽였는데, 그러면 **테두리·못·번호가 전부 같은 비율로만 옅어져** 빈 칸 셋이
 *  쓸 수 있는 칸 셋과 같은 무게로 눈에 들어왔다(병수님: "숫자만 덩그러니 있다").
 *  옅게 하는 것과 **잠긴 것**은 다르다 — 잠긴 칸은 홈이 아니라 **메워진 자리**다:
 *  속의 단계를 없애 납작하게 하고, 테두리의 밝은 면을 죽이고, 못을 뺀다. */
/* ★ 이 그림은 **정해진 것**이다 — 폭·높이·켜짐·잠김 넷만으로 완전히 결정된다.
   그런데 전투 중에는 마나와 시체가 문턱을 넘나들어 칸이 **매 프레임 켜졌다 꺼진다**.
   CPU 프로파일에서 `beltState` 자기시간의 **98.7%** 가 이 함수를 부르는 한 줄이었다
   (여섯 칸 × 매 프레임 × 작은 사각형 스무 개). 그래서 빛(`glowTile`)과 같은 길로 —
   **한 번 구워 두고 얹는다.** 크기는 두어 가지뿐이라 판이 몇 장 안 쌓인다. */
const slotTiles = new Map();
function slotTile(w, h, on, locked) {
  const k = `${w}|${h}|${on ? 1 : 0}|${locked ? 1 : 0}`;
  const hit = slotTiles.get(k);
  if (hit) return hit;
  const t = document.createElement("canvas");
  t.width = w; t.height = h;
  paintSlot(t.getContext("2d"), w, h, on, locked);
  if (slotTiles.size > 32) slotTiles.clear();   /* 창을 계속 끌면 늘어나는 것만 막는다 */
  slotTiles.set(k, t);
  return t;
}
export function drawSlot(cv, w, h, on, locked = false) {
  if (w < 8 || h < 8) return;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext("2d");
  g.clearRect(0, 0, w, h);
  g.drawImage(slotTile(w, h, on, locked), 0, 0);
}
/** 실제로 칠하는 자리. 판 하나당 **한 번만** 돈다. */
function paintSlot(g, w, h, on, locked) {
  const inset = 3;
  if (locked) {
    /* 속 — **한 색으로 납작하게.** 단계를 주면 홈으로 읽혀 「쓸 수 있는 칸」이 된다. */
    g.fillStyle = "#0a0605"; px(g, inset, inset, w - 2 * inset, h - 2 * inset);
    /* 테두리 — 밝은 면 없이 어두운 쇠 두 겹만. 못도 안 박는다. */
    ring(g, w, h, 0, "#080605", "#080605", "#080605");
    ring(g, w, h, 1, "#221a12", "#150f0a", "#1a1410");
    ring(g, w, h, 2, "#000000", "#0e0a07", "#080605");
    return;
  }

  /* 속 — 세 단계로 끊는다. 위가 어둡고 아래가 조금 밝으면 파인 것으로 보인다. */
  g.fillStyle = "#0e0806"; px(g, inset, inset, w - 2 * inset, h - 2 * inset);
  g.fillStyle = "#150c08"; px(g, inset, inset + Math.round(h * 0.42), w - 2 * inset, Math.round(h * 0.3));
  g.fillStyle = "#1c1109"; px(g, inset, h - inset - Math.round(h * 0.2), w - 2 * inset, Math.round(h * 0.2));

  /* 테두리 세 겹 — 바깥 어두운 쇠 · 가운데 밝은 면 · 안쪽 그늘 */
  ring(g, w, h, 0, "#0a0806", "#0a0806", "#0a0806");
  ring(g, w, h, 1, on ? "#e0c890" : "#5a4a34", on ? "#6b5730" : "#2a2016", on ? "#a08a58" : "#3e3324");
  ring(g, w, h, 2, "#000000", "#241810", "#120c08");

  /* 못 넷 — 네 모서리 안쪽에 점 하나씩. 있으면 「짜여진 것」으로 읽힌다. */
  g.fillStyle = on ? "#c8aa6e" : "#4a3e2c";
  for (const [rx, ry] of [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]]) px(g, rx, ry);
}

/** 경험치 띠. 선 두 줄만 있으면 **어디서 끝나는지**가 안 읽힌다 —
 *  양 끝에 마개를 두고, 위아래 선을 두 단계로 나눈다. */
export function drawBar(cv, w, h) {
  if (w < 8 || h < 4) return;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext("2d");
  g.clearRect(0, 0, w, h);
  g.fillStyle = "#6b5730"; px(g, 1, 0, w - 2, 1); px(g, 1, h - 1, w - 2, 1);
  g.fillStyle = "#3e3218"; px(g, 1, 1, w - 2, 1); px(g, 1, h - 2, w - 2, 1);
  /* 양 끝 마개 — 세로로 꽉 찬 두 칸. 띠가 여기서 끝난다고 말한다. */
  g.fillStyle = "#8a7448"; px(g, 0, 0, 2, h); px(g, w - 2, 0, 2, h);
  g.fillStyle = "#2a2016"; px(g, 2, 1, 1, h - 2); px(g, w - 3, 1, 1, h - 2);
}

/** 크기가 바뀌면 다시 그린다. 칸은 **화면 폭 따라 30~68px 로 변한다.** */
export function watch(el, draw) {
  const cv = el.querySelector("canvas.fr");
  if (!cv) return;
  const run = () => draw(cv, Math.round(el.clientWidth), Math.round(el.clientHeight));
  new ResizeObserver(run).observe(el);
  run();
}
