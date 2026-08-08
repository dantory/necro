/* ══════════════════════════════════════════════════════════════
   부위 리깅 — **한 장을 잘라서 따로 움직인다.**
   ※ 지금은 안 쓴다 — **8방향 스프라이트(js/sprite8.js)로 대체됨.** 되살릴 수도 있어 남겨 둔다.
   ──────────────────────────────────────────────────────────────
   PixelLab 의 걷기 프레임은 못 쓴다: `create_character` 가 무엇을 참조로 주든
   제 골격(정면 8방향)으로 다시 세워서, 옆모습으로 구운 우리 그림이 **정면으로 돌아
   버린다**(구울이 해골 비슷한 딴 놈이 되기까지 했다). rtd 에서 막혔던 것과 같은 벽인데,
   그때는 탑다운 탓인 줄 알았지만 아니었다.

   그래서 프레임을 받아 오는 대신 **가진 그림 한 장을 부위로 잘라 각자 움직인다.**
   통째로 흔드는 것(어설프다는 말을 들은 그것)과 다른 점은 하나다:
   **다리와 몸통과 팔이 서로 다른 위상으로 움직인다.** 그게 걸음으로 읽히는 조건이다.

   자르는 자리는 옆모습 인물의 통상 비례다(위에서부터):
     머리 0~28% · 몸통(팔 포함) 28~60% · 다리 60~100%
   다리는 **앞다리와 뒷다리로 한 번 더** 나눈다 — 옆모습에서 둘은 거의 겹쳐 있으므로
   같은 띠를 두 번 그리되 **엉덩이를 축으로 서로 반대로 돌린다.** 뒷다리는 어둡게 깔아
   앞뒤가 갈리게 한다(안 그러면 다리 하나가 두꺼워진 것처럼 보인다).
   ══════════════════════════════════════════════════════════ */

/** 몸의 마디. 필요하면 종류마다 덮어쓴다(골렘은 다리가 짧고 몸통이 크다). */
/* 자르는 선은 **눈으로 맞춘다.** 처음 58% 로 잘랐더니 다리를 벌릴 때 엉덩이에서 살이
   끊겨 보였다 — 골반이 잘린 것이다. 조금 내려 잡고, 몸통 띠를 다리 위로 겹쳐 덮는다
   (겹치는 몇 픽셀이 이음매를 가린다). */
export const RIG = {
  head: [0.00, 0.32],
  body: [0.26, 0.70],   // 다리 위로 겹쳐 내려와 이음매를 덮는다
  legs: [0.64, 1.00],
  hip:  0.68,          // 다리가 도는 축(스프라이트 높이 비율)
  sh:   0.36,          // 몸통이 도는 축(어깨)
};
export const RIG_BY = {
  // 골렘은 다리가 짧고 몸통이 크다 — 같은 비례로 자르면 무릎에서 잘린다
  golem: { head: [0, 0.34], body: [0.28, 0.78], legs: [0.72, 1.0], hip: 0.76, sh: 0.42 },
};

/** 한 부위를 잘라 그린다. `pivot` 을 축으로 `ang` 만큼 돌리고 `dx,dy` 만큼 민다. */
function part(ctx, im, dst, band, pivotY, ang, dx, dy, alpha) {
  const [a, b] = band;
  const sh = im.height, sw = im.width;
  const sy = a * sh, sHi = (b - a) * sh;
  const w = dst.w, h = dst.h;
  const dy0 = a * h, dHi = (b - a) * h;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.translate(dst.x + dx, dst.y + pivotY * h + dy);
  ctx.rotate(ang);
  ctx.translate(0, -(pivotY * h));
  ctx.drawImage(im, 0, sy, sw, sHi, -w / 2, dy0, w, dHi);
  ctx.restore();
}

/** **리깅해서 그린다.** `pose` 는 걸음 위상과 휘두름 진행도만 받는다 —
 *  마디를 어떻게 움직일지는 여기서 정한다(부르는 쪽이 관절을 몰라도 되게). */
export function drawRigged(ctx, im, x, gy, h, kind, pose) {
  const R = RIG_BY[kind] || RIG;
  const w = h * (im.width / im.height);
  const dst = { x, y: gy - h, w, h };
  ctx.imageSmoothingEnabled = false;

  const { walkPh = 0, walking = false, swing = 0, flip = 1 } = pose;
  // 걸음 — 다리는 서로 **반대 위상**, 몸통은 그 두 배 주기로 아주 조금
  /* 걷는 폭은 **0.3rad 이면 충분하다.** 0.42 로 벌렸더니 성큼성큼 뛰는 것처럼 보였다 —
     방치형에서 계속 보는 그림이라 과장은 금방 물린다. */
  const sw1 = walking ? Math.sin(walkPh) * 0.34 : 0;
  const sw2 = walking ? Math.sin(walkPh + Math.PI) * 0.34 : 0;
  const bob = walking ? Math.abs(Math.sin(walkPh)) * h * 0.05 : 0;
  const lean = walking ? Math.sin(walkPh * 2) * 0.035 : 0;
  // 휘두름 — 몸통만 앞으로 꺾는다(다리는 버틴다). 앞 35% 에 몰아 나가고 나머지로 회수
  /* 휘두름 — **꺾기보다 내지르기**로 낸다. 1.15rad 로 꺾었더니 몸통에 붙은 방패까지
     같이 돌아 우스워졌다(한 장에서 팔만 떼어낼 수는 없다). 각도를 줄이고 앞으로 미는
     양을 늘리면 "찌른다"로 읽히면서 방패도 얌전하다. */
  const k = swing > 0 ? (swing < 0.35 ? swing / 0.35 : 1 - (swing - 0.35) / 0.65) : 0;
  const armAng = k * 0.55;
  const lunge  = k * h * 0.16;

  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(flip, 1);
  const d = { ...dst, x: 0 };

  // 뒷다리 먼저(어둡게) → 앞다리 → 몸통 → 머리 순으로 겹친다
  part(ctx, im, d, R.legs, R.hip, sw2, 0, -bob, 0.55);
  part(ctx, im, d, R.legs, R.hip, sw1, 0, -bob, 1);
  part(ctx, im, d, R.body, R.sh, lean + armAng, lunge, -bob, 1);
  part(ctx, im, d, R.head, R.sh, lean * 0.5 + armAng * 0.5, lunge * 0.7, -bob, 1);
  ctx.restore();
}
