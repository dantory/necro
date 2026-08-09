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
 *  테두리는 튀어나오게, 속은 파이게 해야 「아이콘이 홈에 앉은 것」이 된다. */
export function drawSlot(cv, w, h, on) {
  if (w < 8 || h < 8) return;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext("2d");
  g.clearRect(0, 0, w, h);

  /* 속 — 세 단계로 끊는다. 위가 어둡고 아래가 조금 밝으면 파인 것으로 보인다. */
  const inset = 3;
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
