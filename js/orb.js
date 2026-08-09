/* ══════════════════════════════════════════════════════════════
   구슬을 **픽셀로 그린다.**
   ──────────────────────────────────────────────────────────────
   CSS 로 만든 구슬은 `border-radius:50%` 라 가장자리에 안티에일리어싱이 먹고,
   `linear-gradient` 라 색이 매끄럽게 흐른다. 그 매끈함 하나가 픽셀 화면에서
   **제일 튄다** — 캐릭터도 아이콘도 글꼴도 계단으로 서 있는데 구슬만 매끄러우니
   거기만 다른 세계다.

   그래서 30x30 캔버스에 **한 픽셀씩** 그려서 화면에 크게 늘린다:
     · 원은 **계단**이다(x²+y² 로 안팎만 가른다. 중간값 없음)
     · 색은 **네 단계뿐**이다. 픽셀아트에 그라디언트는 없다
     · 표면의 빛도 점 몇 개로 찍는다
   ══════════════════════════════════════════════════════════ */

const R = 15;                      // 30x30 캔버스의 반지름
/** 색을 **몇 단계로 자른다.** 픽셀아트가 픽셀아트인 이유의 절반이 이것이다 —
 *  부드럽게 흐르는 색은 아무리 잘 골라도 사진처럼 보인다. */
const RAMP = {
  hp: ["#e05050", "#b02424", "#7a1010", "#3a0606"],
  mp: ["#5a86e8", "#2f4fb8", "#1a2a7a", "#0a1030"],
};
const EMPTY = ["#241c16", "#181210", "#0e0a08"];   // 안 찬 부분(빈 유리)

export function drawOrb(cv, kind, pct) {
  const g = cv.getContext("2d");
  const ramp = RAMP[kind] || RAMP.hp;
  g.clearRect(0, 0, 30, 30);
  const fillTop = 30 - Math.round(pct * 30);       // 여기서부터 아래가 채워져 있다

  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < 30; x++) {
      const dx = x - R + 0.5, dy = y - R + 0.5;
      const d2 = dx * dx + dy * dy;
      if (d2 > R * R) continue;                    // **원 밖은 안 찍는다** — 이 판정이 계단을 만든다
      const d = Math.sqrt(d2) / R;                 // 0(가운데) ~ 1(가장자리)

      let col;
      if (y >= fillTop) {
        /* 찬 곳 — 가운데가 밝고 가장자리로 갈수록 어둡다. **네 단계로 끊는다.** */
        const i = d < 0.42 ? 0 : d < 0.7 ? 1 : d < 0.9 ? 2 : 3;
        col = ramp[i];
      } else {
        const i = d < 0.6 ? 0 : d < 0.88 ? 1 : 2;
        col = EMPTY[i];
      }
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
  }
  /* 표면의 빛 — **점 몇 개로 찍는다.** 번지는 빛은 유리가 아니라 플라스틱이 된다.
     왼쪽 위 한 덩이(반사)와 아래쪽 한 줄(되비침), 그게 전부다. */
  g.fillStyle = "#ffffff";
  g.fillRect(8, 6, 2, 1); g.fillRect(7, 7, 3, 1); g.fillRect(7, 8, 2, 1);
  g.fillStyle = "#ffffff55";
  g.fillRect(10, 6, 1, 1); g.fillRect(6, 9, 1, 1); g.fillRect(9, 9, 1, 1);
  g.fillStyle = "#ffffff2a";
  g.fillRect(12, 25, 6, 1); g.fillRect(11, 24, 8, 1);

  /* 테두리 한 겹 — 원의 바깥 계단을 어둡게 눌러 유리 두께를 만든다 */
  g.fillStyle = "#00000066";
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) {
    const dx = x - R + 0.5, dy = y - R + 0.5, d2 = dx * dx + dy * dy;
    if (d2 <= R * R && d2 > (R - 1.2) * (R - 1.2)) g.fillRect(x, y, 1, 1);
  }
}
