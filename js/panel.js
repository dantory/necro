/* ══════════════════════════════════════════════════════════════
   아래 **판을 깎은 돌로** 그린다.
   ──────────────────────────────────────────────────────────────
   병수님이 보내 주신 D2R 화면과 나란히 놓고 보면, 구슬보다 먼저 눈에 걸리는 것이
   **판 그 자체**였다. 저쪽은 손으로 깎은 석재 벨트에 쇠를 박아 놓았고, 이쪽은
   **까만 띠 하나**였다. 구슬을 아무리 잘 그려도 그것이 놓인 자리가 검은 종이면
   구슬만 붕 뜬다 — 물건은 **놓인 자리와 함께** 보인다.

   돌이 돌로 보이는 조건 넷:
     · **결(noise)** — 고른 색은 종이다. 다만 결이 보이면 시끄러우니 세 단계만
     · **켜(course)** — 가로로 층이 지고, 층마다 세로 이음매가 어긋난다(벽돌 쌓기)
     · **깎인 면** — 이음매 위쪽은 밝고 아래쪽은 어둡다. 그것만으로 홈이 파인다
     · **쇠 난간** — 판이 시작되는 자리에 한 겹. 여기가 경계라는 표시

   ★ 픽셀로 보이게 **1/4 크기로 그려서 4배로 늘린다.** 화면 크기 그대로 그리면
   결이 1px 이라 안 보이고, 안티에일리어싱과 섞여 흐려진다.
   ══════════════════════════════════════════════════════════ */

const K = 4;                       // 한 픽셀이 화면에서 차지하는 크기

/* 좌표에서 값을 만든다 — **난수가 아니다.** 난수면 다시 그릴 때마다 결이 바뀌어
   판이 끓는다(바닥 타일에서 겪은 것과 같다). */
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/* ★ 처음 고른 색이 갈색이고 밝아서 **벽돌담**이 됐다 — 판이 전장보다 먼저 눈에
   들어오면 안 된다. 판은 배경이고 볼 것은 화면 위쪽이다. 회색으로 내리고
   단계 차이도 좁힌다(결은 있되 무늬로 읽히지 않게). */
const STONE = ["#242220", "#1f1d1b", "#1a1917", "#151413"];
const SEAM  = "#0d0c0b";           // 이음매(그늘)
const LIP   = "#2c2a27";           // 이음매 위쪽 깎인 면(빛 받는 쪽)

/** 판 바탕을 그린다. w,h 는 **화면 픽셀**. */
export function drawPanel(cv, w, h) {
  const pw = Math.ceil(w / K), ph = Math.ceil(h / K);
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  const g = cv.getContext("2d");
  g.clearRect(0, 0, pw, ph);

  /* ★ 켜를 8(화면 32px)로 잡았더니 판 하나에 네 층이 쌓여 담벼락이 됐다.
     판은 **한 덩어리의 석재 벨트**여야 한다 — 층을 크게 잡아 두 켜만 보이게. */
  const COURSE = 14;               // 켜 하나의 높이(픽셀 단위 → 화면 56px)
  const TOP = 3;                   // 위쪽 쇠 난간

  for (let y = 0; y < ph; y++) {
    const cy = Math.floor((y - TOP) / COURSE);          // 몇 번째 켜인가
    const inCourse = (y - TOP) - cy * COURSE;
    for (let x = 0; x < pw; x++) {
      /* 켜마다 **세로 이음매를 어긋나게** — 안 어긋나면 격자무늬가 되어 벽지가 된다. */
      const off = (cy & 1) ? 16 : 0;
      const bx = Math.floor((x + off) / 32);
      let col;
      if (inCourse === 0) col = SEAM;                    // 가로 이음매
      else if (inCourse === 1) col = LIP;                // 그 아래 깎인 면(밝다)
      else if (((x + off) % 32) === 0) col = SEAM;       // 세로 이음매
      else {
        const n = hash2(bx * 31 + x, cy * 17 + y) % 100;
        /* 아래로 갈수록 어둡다 — 판이 바닥에 눌려 있는 것으로 읽힌다. */
        const deep = y > ph * 0.72 ? 1 : 0;
        col = STONE[Math.min(3, (n < 46 ? 0 : n < 78 ? 1 : 2) + deep)];
      }
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
  }

  /* ── 쇠 난간 ── 판이 **시작되는 자리**. 위 두 줄은 쇠, 그 아래 한 줄이 금 실선.
     경계를 안 그으면 어디부터가 판인지 눈이 못 잡는다. */
  g.fillStyle = "#0a0806"; g.fillRect(0, 0, pw, 1);
  g.fillStyle = "#3a332a"; g.fillRect(0, 1, pw, 1);
  g.fillStyle = "#6b5730"; g.fillRect(0, 2, pw, 1);
  g.fillStyle = "#0e0b09"; g.fillRect(0, 3, pw, 1);

  /* ── 못 ── 난간에 일정 간격으로. 「박아 놓은 판」이라는 표시다. */
  for (let x = 8; x < pw; x += 40) {
    g.fillStyle = "#a98d58"; g.fillRect(x, 1, 2, 2);
    g.fillStyle = "#4a3a22"; g.fillRect(x, 3, 2, 1);
  }
}

/** 창 크기가 바뀌면 다시 그린다. 판은 늘 화면 폭을 꽉 채운다. */
export function watchPanel(cv, el) {
  const redraw = () => drawPanel(cv, el.clientWidth, el.clientHeight);
  redraw();
  new ResizeObserver(redraw).observe(el);
}
