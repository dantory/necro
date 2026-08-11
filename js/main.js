import { $, CORPSE_TINT, GEAR, MOB_H, gearNext, hpMaxOf, isGate, META, MINIONS, mpMaxOf, S, saveMeta, SKILLS, armyCap, upCost, UPS, xpNeed, mpCost, spLeft, syncSkills, feedMul, armyN, thrallN } from "./core.js";
import { ARRIVE_T, BOSSRING_T, bossH, mobKindsFor, cast, CORE_R, CORPSE_FADE, DEATH_T, IMPACT_AT, newRun, PILE_FADE, RING_HOLD, RING_SPAWN, RISE_T, step, SWING_T } from "./battle.js";
import { SQUASH_VIEW as SQUASH_VIEW_C } from "./core.js";
import { dirName, drawSprite8, footMetrics, frameCount, LOAD, loadManifest, preload, swingGain } from "./sprite8.js";
import { drawOrb } from "./orb.js";
import { watchPlate } from "./hudplate.js";
import { drawTree, markSp } from "./tree.js";

/* 값 표기 — 네 자리부터 k, 백만부터 M. 1000 미만은 그대로 둔다(초반에 1.0k 는 안 읽힌다). */
const num = (v) => {
  v = Math.max(0, Math.round(v));
  return v < 1000     ? String(v)
       : v < 10000    ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "k"
       : v < 1000000  ? Math.round(v / 1000) + "k"
       : (v / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
};

/* 구슬 안 숫자가 **테를 밟지 않게** 맞춘다. 글꼴 폭은 짐작하지 말고 canvas 로 잰다. */
const _mm = document.createElement("canvas").getContext("2d");
/* ★ 픽셀 글꼴은 글자마다 폭이 다르다(`1` 이 좁다) — 제일 넓은 숫자와 단위를 한 번 재 둔다. */
const [FAT, UNIT] = (() => {
  _mm.font = '27px "Galmuri9", monospace';
  const widest = (set) => [...set].reduce((a, b) => _mm.measureText(b).width > _mm.measureText(a).width ? b : a);
  return [widest("0123456789"), widest("kM")];
})();

/** 이 판에서 **나올 수 있는 제일 넓은 글자**. 크기를 지금 값으로 정하면 체력이
 *  닳는 동안 27 ↔ 18 로 깜빡이고, 「최대치/최대치」로 정해도 모자란다 —
 *  `num()` 은 값마다 길이가 달라서(6k 인데 4.4k) **최대치가 제일 긴 글자가 아니다.**
 *  그래서 자릿수를 **만들어서** 잰다: 현재값은 최대치 이하 어디든 올 수 있다. */
function widestNum(max) {
  const cur = max < 1000 ? FAT.repeat(String(Math.round(max)).length)
                         : FAT + "." + FAT + UNIT;
  return (cur + "/" + num(max)).replace(/\d/g, FAT);
}

/* ★★ 「현재값/최대치」를 한 줄로 27px 에 넣으려니 **어떤 값이든 유리(102px)를 넘어**
   전부 18px 로 떨어졌다 — 키운 의미가 사라진다. 한 줄에 다 넣으려 한 것이 잘못이었다.
   **현재값을 크게, 최대치를 그 아래 작게** 두 줄로 나눈다:
     · 현재값은 길어야 네 글자(9.9M) — 27px 로도 유리 안에 넉넉히 들어간다
     · 최대치는 곁다리이므로 작아도 되고, 두 줄이라 서로 폭을 안 뺏는다
     · 크기가 값에 따라 안 바뀌니 **깜빡임도 없다**(그래서 잴 것도 없어졌다) */
function fitNum(el, cur, max) {
  const a = num(cur), b = "/" + num(max);
  if (el._a !== a) { el._a = a; el.children[0].textContent = a; }
  if (el._b !== b) { el._b = b; el.children[1].textContent = b; }
}
import { drawSlot, drawBar, watch } from "./frame.js";
import { drawGlows, drawGround, drawHoldRing, loadDecals, loadFloor, loadWang, loadDecor, setAnchors, useFloor } from "./ground.js";
import { drawTown, drawTownLabels, loadTown, townHitAt, townHits } from "./town.js";

/* 전장은 캔버스, 판(UI)은 DOM. **섞지 않는다** — 앞 프로토타입에서 백여 개 DOM 을
   매 프레임 옮기다 렉을 만들었고, 반대로 장식이 많은 UI 를 캔버스로 그리면 손이 열 배 든다.
   움직이는 것은 캔버스, 읽는 것은 DOM. */
const cv = $("stage"), ctx = cv.getContext("2d");
let dpr = 1;
function fit() {
  dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
}
addEventListener("resize", fit);

/* ══ 그림 ══ PixelLab 으로 구운 스프라이트(assets/). **아직 안 온 것은 색 덩어리로 낸다** —
   그림 한 장이 없다고 판이 멈추면 에셋 굽는 동안 아무것도 못 본다. 오면 그때부터 그림이 뜬다. */
const COL = {
  skel: "#d8d2c4", ghoul: "#8fae76", golem: "#8a6b45",
  mob: "#9a3b3b", boss: "#d05353", necro: "#2b2338",
  thrall: "#a06ad0",      // 지배한 적 — 그림이 없을 때의 대체 색만 여기서 쓴다
};
/* ══ 프레임 묶음 ══ `assets/<종류>/attack/0.png…`
   **지금은 아무도 이걸 부르지 않는다** — 그리는 것은 부위 리깅(js/rig.js)이다.
   그래도 남겨 둔다: 공격 프레임은 쓸 만한 것이 이미 굽혀 있어서 언제든 붙일 수 있다.

   PixelLab 은 두 갈래인데 **한쪽만 쓸 수 있다**(네 마리를 받아서 눈으로 대 보고 알았다):
     · `animate_with_text` — 가진 그림을 그대로 움직인다. 옆모습도 생김새도 남는다.
       공격 5장(몹 4종 + 소환수 3종)과 해골 걷기 4장이 이쪽이고, 다 멀쩡하다.
     · `create_character` 8방향 — 참조를 사실상 무시하고 **제 골격(정면)으로 다시 세운다.**
       옆모습으로 구운 몹이 전부 정면으로 돌아섰고 걸음도 안 읽혀서 받은 걷기 4장×4종은
       지웠다. rtd 에서 막혔던 그 벽이 같은 것이다 — 탑다운 탓이 아니었다.
   그래서 걷기는 굽지 않고 리깅으로 만든다. 다시 이 API 로 걷기를 걸지 말 것.

   프레임 수를 미리 모르니 0 번부터 **끊길 때까지** 물어보고 그 수를 기억한다.
   **없으면 조용히 한 장짜리로 돌아간다.** */
const SEQ = {};
function frames(path) {
  let f = SEQ[path];
  if (!f) {
    f = SEQ[path] = { list: [], probing: 0, done: false };
    probe(path, f, 0);
  }
  return f.list.length ? f.list : null;
}
function probe(path, f, i) {
  if (f.done || i > 15) { f.done = true; return; }
  const im = new Image();
  im.onload  = () => { f.list[i] = im; probe(path, f, i + 1); };
  im.onerror = () => { f.done = true; };
  im.src = `assets/${path}/${i}.png`;
}

const IMG = {};
function sprite(path) {
  if (IMG[path] !== undefined) return IMG[path] || null;
  const im = new Image();
  im.onload  = () => { IMG[path] = im; };
  im.onerror = () => { IMG[path] = null; };   // 없으면 영영 안 묻는다
  IMG[path] = null;
  im.src = "assets/" + path + ".png";
  return null;
}
/* ══ 물들인 시체 사본 ══ 개체마다 색을 흔들되 **매 프레임 칠하지는 않는다** —
   백 구를 그릴 때마다 합성하면 그리기가 통째로 무거워진다. (그림 × 색) 조합은 많아야
   열여덟 개뿐이니 **한 번 만들어 두고 계속 쓴다.**
   ★ 아직 원본이 안 왔으면 **캐시에 넣지 않는다** — null 을 굳혀 두면 그림이 온 뒤에도
     영영 얼룩으로만 남는다. */
const TINTED = {};
function corpseArt(sort, ti) {
  const key = sort + ":" + ti;
  if (TINTED[key]) return TINTED[key];
  const im = sprite("fx/corpse_" + sort);
  if (!im) return null;
  const t = CORPSE_TINT[ti | 0];
  if (!t) return (TINTED[key] = im);
  const c = document.createElement("canvas");
  c.width = im.width; c.height = im.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(im, 0, 0);
  /* source-atop 이라 **원래 그려진 자리에만** 얹힌다 — 투명한 배경은 안 물든다
     (예전에 배경째 칠해 네모난 얼룩이 생긴 적이 있다). */
  g.globalCompositeOperation = "source-atop";
  g.globalAlpha = t[1]; g.fillStyle = t[0];
  g.fillRect(0, 0, c.width, c.height);
  return (TINTED[key] = c);
}
/* ══ 걸음·공격 ══ **8방향 스프라이트를 재생한다**(js/sprite8.js).
   전에는 한 장을 부위로 잘라 흔들었다(js/rig.js) — PixelLab 8방향 프레임이 못 쓸 것이라
   여겼기 때문이다. 이제 걷기 6프레임·공격 6프레임이 8방향 전부로 실제로 구워져 있어
   그것을 그대로 튼다. 방향이 그림에 들어 있으니 **좌우 뒤집기는 하지 않는다.** */
/** 휘두름 진행도(p 0→1)를 **프레임 번호**로. 들었다가(느리게) · 후려치고(빠르게) ·
 *  거둔다(느리게) — 그 결이 비율에 있다.
 *
 *  ★★ 예전엔 이 결을 **여섯 칸으로 못박고** 종의 프레임 수에 나눠 맞췄다:
 *      `idx = round(k * (nf-1) / 5)`.
 *      6장짜리는 맞았지만 **7장짜리는 3번이 영영 안 나왔다**(0,1,2,4,5,6).
 *      해골·구울·해골궁수가 다 7장이라, 셋 다 휘두름 한가운데가 빠진 채 돌고 있었다.
 *      결을 칸이 아니라 **곡선**으로 두고 프레임 수만큼 다시 뽑는다 — 몇 장이든
 *      한 장도 안 빠지고, 타격 칸에 오래 머무는 성질은 그대로다. */
const SWING_SHAPE = [0, 0.18, 0.36, 0.50, 0.72, 0.86];   // 여섯 점을 지나는 곡선
export function swingFrame(p, nf) {
  if (nf <= 1) return 0;
  let idx = 0;
  for (let j = 1; j < nf; j++) {
    const x = j / (nf - 1) * (SWING_SHAPE.length - 1);   // 곡선 위의 자리
    const i = Math.min(SWING_SHAPE.length - 2, Math.floor(x)), t = x - i;
    const start = SWING_SHAPE[i] + (SWING_SHAPE[i + 1] - SWING_SHAPE[i]) * t;
    if (p >= start) idx = j;
  }
  return idx;
}

function drawOne(base, x, gy, h, fallback, e) {
  /* **막 나타난 놈은 어둠에서 배어 나온다.** 시차만 두고 툭 세우면 여전히 갑작스럽다 —
     배어 나오는 내내 흐리게 시작해 짙어진다. 그림자도 같이 옅어야 발밑만 먼저 뜨지 않는다.
     ★ 배어 나오는 시간은 개체마다 다르다(관문 보스 0.8 · 졸개 0.4) — born0 로 잰다.
     예전엔 0.4 를 박아 둬서 보스를 길게 배어 나오게 해도 앞 절반이 통째로 옅게 눌렸다. */
  const bd = (e && e.born0) || 0.4;
  const born = e && e.born > 0 ? 1 - e.born / bd : 1;
  if (born < 1) { ctx.save(); ctx.globalAlpha = Math.max(0.05, born); }

  // 상태: 휘두르는 중 > 걷는 중 > 서 있음. 방향은 dx,dy(공격 땐 내지르는 sdx,sdy).
  let state = "idle", dir = "south", frameIdx = 0;
  if (e) {
    if (e.swing > 0) {
      state = "attack";
      /* 공격 프레임은 **swing 진행도**로. swing 은 SWING_T 에서 0 으로 준다.
         ★ 예전엔 6프레임에 **똑같이** 나눴다. 그런데 실제 휘두름은 고르지 않다 —
         **들었다가(느리게) · 후려치고(빠르게) · 거둔다(느리게).** 균등 배분하면 팔이
         일정한 속도로 도는 기계가 된다. 타격 칸(3)에 제일 오래 머물게 나눈다. */
      const p = 1 - e.swing / SWING_T;                 // 0 → 1
      /* 구간 비율은 그대로 두고 **프레임 수만 종에 맞춘다** — 6장짜리와 7장짜리가
         섞여 있어서(v3 애니는 종마다 다르다) 숫자를 박으면 한쪽이 어긋난다.
         타격 칸이 제일 길다는 성질은 비율에 있으므로 장수가 늘어도 유지된다. */
      const nf = frameCount(base, "attack");
      frameIdx = swingFrame(p, nf);
      dir = e.sdx !== undefined ? dirName(e.sdx, e.sdy) : dirName(e.dx ?? 0, e.dy ?? 1);
    } else if (e.moving > 0) {
      state = "walk";
      /* 걷기 프레임은 **지나온 거리**로(시간 아님) — 느린 골렘은 저절로 느리게 딛는다.
         한 주기 거리는 기존 리깅의 walkPh(=walked/(h*0.14)) 한 바퀴(2π)와 같게 잡아 박자
         (≈1.3초)를 그대로 물려받고, 그 한 바퀴를 6프레임에 나눈다. */
      const nf = frameCount(base, "walk");
      const stride = h * 0.14 * 2 * Math.PI / nf;
      frameIdx = Math.floor((e.walked || 0) / stride) % nf;
      dir = dirName(e.dx ?? 0, e.dy ?? 1);
    } else {
      dir = dirName(e.dx ?? 0, e.dy ?? 1);
    }
  }

  /* 맞은 순간엔 **뒤로 밀린다**(기존 그대로). 흰 번쩍임은 예전에 뺐다 — 밀림 + 닿는 자리의
     불꽃(fx)으로 충분하다. */
  let fx2 = 0, fy2 = 0;

  /* **때리는 놈도 움직인다.** 붙어 서서 팔만 흔들면 그림이 제자리를 맴돈다 —
     뒤로 몸을 빼며 들었다가(–) 타격 칸에서 앞으로 내지르고(+) 다시 돌아온다.
     맞는 놈이 뒤로 밀리는 것과 **반대 방향**이라 둘이 합쳐져 부딪힌 느낌이 난다. */
  /* **그림이 안 움직이면 코드가 대신 움직인다.** 골렘 공격 다섯 장은 거의 같은 자세라
     (실루엣 변화 0.30 — 해골 0.75 · 졸개 1.2) 프레임을 어떻게 태워도 때리는 것이
     안 읽혔다. 종 이름을 박는 대신 **그림에서 굳은 정도를 재서**(swingGain) 그만큼
     몸짓을 키운다 — 잘 움직이는 놈은 1.0 이라 화면이 하나도 안 바뀌고, 굳은 놈만
     크게 쓴다. 새로 구운 놈이 또 굳게 나와도 저절로 걸린다. */
  let tilt = 0, stretch = 0, swx = 0, swy = 0;
  if (e && e.swing > 0 && e.sdx !== undefined) {
    const p = 1 - e.swing / SWING_T;
    const push = p < 0.5 ? -0.05 * (p / 0.5)                    // 들면서 뒤로
               : p < 0.62 ? -0.05 + 0.23 * ((p - 0.5) / 0.12)   // 후려치며 앞으로
               : 0.18 * (1 - (p - 0.62) / 0.38);                // 거두며 제자리로
    const gain = swingGain(base);
    swx = e.sdx * h * push * gain;
    swy = e.sdy * h * push * gain * 0.55;                       // 세로는 눌린 만큼 덜
    fx2 += swx; fy2 += swy;
    /* 내지르기만 키우면 **미끄러진다** — 자세가 그대로인 채 통째로 움직이니까.
       굳은 만큼 **뒤로 젖혔다가 앞으로 찍는다**: 기울기(몸통) + 눌림(무게).
       셋이 같이 가야 「들었다 → 내리쳤다」로 읽힌다. 굳지 않은 종은 extra=0 이라 없다. */
    const extra = gain - 1;
    if (extra > 0.02) {
      const lean = p < 0.5 ? -0.08 * (p / 0.5)                    // 젖히며 뒤로
                 : p < 0.62 ? -0.08 + 0.28 * ((p - 0.5) / 0.12)   // 찍으며 앞으로
                 : 0.20 * (1 - (p - 0.62) / 0.38);
      tilt = e.sdx * extra * lean;                                // 치는 쪽으로 기운다
      stretch = extra * (p < 0.5 ? 0.07 * (p / 0.5)               // 들며 솟았다가
                       : p < 0.62 ? 0.07 - 0.19 * ((p - 0.5) / 0.12)   // 내리찍으며 눌리고
                       : -0.12 * (1 - (p - 0.62) / 0.38));        // 제자리로
      /* ★★ **정면이 제일 안 읽힌다** — 병수님이 본 것이 이 각도다. 옆으로 칠 때는
         기울기가 다 말해 주지만(sdx 가 1), 아래로 칠 때는 sdx≈0 이라 기울기가 없고
         내지르기마저 눌린 세로(×0.55)로 줄어 **거의 제자리**가 된다.
         그래서 정면일수록 **눌림을 대신 키운다** — 옆에서 몸을 젖히는 대신
         정면에서는 무게를 아래로 떨군다. 두 각도가 같은 크기로 읽히게 하는 몫이다. */
      stretch *= 1 + (1 - Math.min(1, Math.abs(e.sdx))) * 0.9;
    }
  }
  if (e && e.flinch > 0) {
    const t = e.flinch / 0.18;
    fx2 = -(e.kx || 0) * h * 0.14 * t; fy2 = -(e.ky || 0) * h * 0.07 * t;
  }

  /* 접지 그림자 — 스프라이트보다 **먼저**, 발밑에 깐다(그림이 그 위에 온다). 밀림(flinch)과
     무관하게 바닥에 고정한다 — 몸만 뒤로 밀리고 그림자는 제자리라야 맞은 티가 난다.
     폭은 발 폭(footWidthFrac)에 맞춘다 — 골렘은 넓게, 해골은 좁게. */
  /* **땅을 뚫고 올라오는 중**이면 아직 반쯤 묻혀 있다 — 그림자도 그만큼 작다.
     (시체를 써서 세운 것이므로 그 자리에는 먼지도 같이 인다 — fx "rise") */
  const rise = e && e.rise > 0 ? 1 - e.rise / RISE_T : 1;
  const fm = footMetrics(base);
  const shr = (fm ? h * fm.footWidthFrac * 0.55 : h * 0.3) * (0.35 + 0.65 * rise);
  /* ★ **내지를 때는 그림자도 따라간다**(밀릴 때는 아니다 — 위 규칙 그대로).
     내지르기를 키우고 나니 골렘이 제 그림자를 통째로 두고 나가 **떠 보였다**.
     내지르기는 제가 밟고 나가는 것이라 발이 옮겨 가고, 밀림은 몸만 젖혀지는 것이다 —
     그래서 앞의 것만 그림자를 데려간다. 70%만 따라가 발이 끌리는 맛을 남긴다. */
  const shdx = e && e.flinch > 0 ? 0 : swx * 0.7, shdy = e && e.flinch > 0 ? 0 : swy * 0.7;
  ctx.fillStyle = "rgba(0,0,0,.42)";
  ctx.beginPath(); ctx.ellipse(x + shdx, gy + shdy, shr, shr * 0.34, 0, 0, 6.284); ctx.fill();

  ctx.save();
  if (rise < 1) {
    /* **바닥선 아래를 잘라 내고** 몸을 그만큼 내려 그린다 — 땅에서 솟는 것으로 보인다.
       툭 나타나는 것과의 차이는 이 반 초뿐인데, 그 반 초가 「내가 불러냈다」를 만든다. */
    ctx.beginPath(); ctx.rect(x - h, gy - h * 1.8, h * 2, h * 1.8); ctx.clip();
    ctx.translate(0, h * (1 - rise) * 0.95);
    ctx.globalAlpha *= 0.5 + 0.5 * rise;
  }
  ctx.translate(fx2, fy2);
  /* 기울임·눌림은 **발밑을 축으로** 준다 — 그림 한가운데를 축으로 돌리면 발이 땅에서
     떠서 미끄러진다. 접지 그림자는 이 save 바깥(위)에서 이미 그렸으므로 같이 안 기운다. */
  if (tilt || stretch) {
    ctx.translate(x, gy); ctx.rotate(tilt);
    ctx.scale(1 - stretch * 0.35, 1 + stretch);                 // 커지면 홀쭉, 눌리면 퍼진다
    ctx.translate(-x, -gy);
  }
  const drew = drawSprite8(ctx, base, dir, state, frameIdx, x, gy, h);
  ctx.restore();
  if (!drew) {
    // 그림이 아직 하나도 없으면 색 덩어리로 — 판이 멈추지 않게(기존 폴백 그대로)
    ctx.fillStyle = fallback;
    ctx.beginPath(); ctx.ellipse(x, gy - h * 0.4, h * 0.26, h * 0.4, 0, 0, 6.284); ctx.fill();
  }
  if (born < 1) ctx.restore();
}

/* ══ 판을 **위에서 비스듬히** 본다 ══
   사방에서 오는 판이라 옆에서 보면 앞뒤가 겹쳐 아무것도 안 읽힌다. 그렇다고 정확히
   위에서 보면 **옆모습으로 구운 스프라이트**가 누워 버린다(디아블로 2 도 같은 이유로
   비스듬히 본다). y 를 눌러(SQUASH) 바닥을 눕히고, 그림은 세워서 세운 채로 얹는다 —
   흔히 쓰는 2.5D 다. 그리는 순서는 **y 가 작은 것부터**라야 앞의 것이 뒤를 가린다. */

function draw(dt) {
  const w = cv.clientWidth, h = cv.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  /* ══ 판 흔들림 ══ 관문 보스가 서는 순간(S.shake) **캔버스 전체를** 아주 짧게 흔든다.
     ★ 여기 draw 초입에서 translate 로 **한 번만** 준다 — px()/py() 를 쓰는 자리를
     각각 고치면 소환진·체력바·숫자가 따로 놀아 어긋난다. HUD·벨트는 DOM 이라 저절로
     안 흔들린다(캔버스만). 명패 오버레이는 아래 drawArrive 가 좌표계를 다시 고정해 뺀다. */
  if (S.shake > 0) {
    const s = S.shake / 0.25;                       // 1 → 0 으로 잦아든다
    const amp = 4 * s;                              // 최대 4px(스크린), 끝에서 0
    ctx.translate(Math.cos(S.t * 90) * amp, Math.sin(S.t * 118) * amp);
  }

  /* ══ 화면을 꽉 채우는 스케일 ══ 세로 화면에서는 **폭이 스케일을 묶는다**(판이 가로로 먼저
     꽉 찬다). 그러면 세로가 통째로 남아 인물이 가운데 눌리고 위아래가 검다 — 병수님이 본 그것.
     남는 세로를 쓰려면 바닥의 눌림(SQUASH)을 화면비에 맞춰 **키운다**: 세로가 길수록 판을 더
     둥글게 펴서 세로를 먹는다. 다만 스프라이트는 세운 채(2.5D)라 SQUASH 는 상한을 둔다 —
     1 에 가까우면 바닥이 정면(탑다운)이 되어 옆모습 그림이 누워 버린다. */
  const MARGIN = 0.05;                                   // 바깥 여백(양쪽 각 5%)
  const scByW = (w * (1 - MARGIN * 2)) / (RING_SPAWN * 2);
  const squash = Math.max(0.56, Math.min(0.86,
                   (h * (1 - MARGIN * 2)) / (RING_SPAWN * 2 * scByW)));
  /* ★★ 병수님: "좌우 화면 넓어졌을때도 고려해라 모바일도 좋은데 PC로 했을때도".
     예전엔 화면이 커진 만큼 **배율만 커졌다**(1440 폭에서 sc 2.07 — 모바일의 세 배).
     그래서 PC 에서는 바닥 타일이 거대해지고 조명 계단이 뭉텅이가 되고, 보이는 넓이는
     모바일과 똑같았다. **화면이 넓어지면 확대할 게 아니라 더 넓게 보여야 한다** —
     디아블로도 그렇다. 그래서 배율에 상한을 둔다. 남는 폭은 시야가 가져간다.
     상한 1.05 는 인물 배율(us)이 상한 1.85 에 닿는 지점 언저리라, 더 키워도
     인물은 안 커지고 바닥만 성겨진다. */
  /* ★ PC 기준으로 다시 잡는다. 시야는 넓게 두되(끝없는 맵) 인물이 콩알이 되면
     무엇이 싸우는지 안 보인다 — 1.05 는 모바일에서 넘어온 값이었다. */
  const SC_MAX = 1.05;
  const sc = Math.min(SC_MAX, scByW, (h * (1 - MARGIN * 2)) / (RING_SPAWN * 2 * squash));
  const SQUASH = squash;
  /* 인물 크기(개체가 든 h)는 스크린 픽셀 고정값이라, 판이 커져도 콩알이었다. 스케일에 비례해 키우되
     서로 겹치지 않게 상한(1.85)·하한(1)을 둔다. 0.44 는 옛 460 판의 대략적 기준 스케일. */
  /* ★ 인물 배율 상한 1.85 도 모바일에서 넘어온 값이다. 판을 키우고 시야를 넓혔는데
     인물만 작으면 **무엇이 싸우는지** 안 보인다. PC 는 크게 봐도 되는 화면이다. */
  const us = Math.max(1, Math.min(1.35, sc / 0.44));

  const cx = w / 2, cy = h * 0.5;
  const px = (x) => cx + x * sc;
  const py = (y) => cy + y * sc * SQUASH;
  /* 검수용 — 마지막으로 그린 판의 실제 기하(반지름·눌림·인물배율). 자(headless)가 화면 대비
     판이 얼마나 찼는지 재려면 그림값 자체가 필요하다. RING_SPAWN 은 battle.js 상수(300). */
  window.__S = S;          // 검수용 — 자(headless)가 실제 개체 위치를 읽어야 겹침을 잰다
  window.__geo = { w, h, cx, cy, sc, squash: SQUASH, us,
                   ringW: 2 * RING_SPAWN * sc, ringH: 2 * RING_SPAWN * sc * SQUASH };

  /* 던전 바닥 — **돌 타일 위에 횃불빛 한 점.** 예전엔 검은 바탕 + 매끈한
     라디얼 그라디언트였다. 화면을 전부 픽셀로 갈아 놓고 **제일 넓은 면만**
     매끈하게 남아 있었고, 그래서 캐릭터가 허공에 떠 보였다(js/ground.js). */
  /* ★ 빛 반경을 싸움터(RING_SPAWN)에만 맞췄더니 세로로 긴 화면에서는 위아래가
     통째로 검게 남고 **벽도 소품도 안 보였다.** 방 전체가 어렴풋이라도 보이도록
     화면 크기에도 맞춘다 — 둘 중 큰 쪽. */
  /* ★ 배율을 1.05 로 낮췄더니 **빛이 화면을 다 덮어 어둠이 사라졌다** — 반경을
     화면 크기에 비례로 잡아 뒀기 때문이다(0.72). 배율을 건드리면 조명도 같이
     움직인다는 것을 잊었다. 어둠이 이 게임의 절반이므로 다시 조인다. */
  if (MODE.at === "town") {
    /* 마을 — 바닥만 흙으로 바꾸고 나머지는 던전과 같은 길을 탄다.
       빛은 모닥불이라 조금 더 넓고, 싸움 둘레는 그리지 않는다. */
    /* 마을도 **끝없는 맵의 한 조각**이다 — 같은 격자에 뿌리되 밀도를 낮추고(사람이
       사는 곳이라 잡동사니가 덜하다) 뼈무더기는 뺀다(마을에 해골이 쌓여 있으면
       마을로 안 읽힌다). 가운데는 넓게 비운다: 장소 셋이 거기 선다. */
    /* ★ 마을의 **목적지**를 바닥에 알려 준다 — 길과 소품 무리가 여기서 나온다.
       자리는 town.js 의 PLACES 와 같은 비율식(화면 반너비/반높이의 몇 배). */
    {
      const hw = (w / 2) / sc, hh = (h / 2) / (sc * SQUASH);
      const R = { x: hw * 0.92, y: hh * 0.62 };
      setAnchors([[0, -0.55 * R.y], [-0.62 * R.x, -0.05 * R.y],
                  [0.62 * R.x, -0.05 * R.y], [0, 0.30 * R.y]]);
    }
    drawGround(ctx, w, h, cx, cy, 0, SQUASH, sc,
               { clear: 300, density: 26, town: true, decal: 2.4,
                 /* ★ 통·상자·수레만 뿌리면 **창고 앞마당**이다. 야영지로 읽히려면
                    경계(wall_a)·불(torch)·지붕(shed)이 섞여야 한다.
                    **개수로 무게를 준다** — set 에서 고르는 것은 균등 추첨이라
                    같은 이름을 두 번 적으면 두 배로 나온다. 헛간은 224x168 로 크니
                    열둘에 하나만(흔하면 마을이 헛간 밭이 된다), 횃불은 곧 조명이라
                    둘을 준다. */
                 /* ★★ 2차 — 천막·모닥불·수레가 들어왔다. **큰 것일수록 드물게.**
                    셈으로 무게를 준다(37 칸 중 몇 칸을 차지하느냐가 곧 빈도다):
                      · 잔 것(통·상자·자루·통나무·덤불·바위·그루터기) 16 — 바닥을 채운다
                      · 중간(담·수레·구유·목책·우물)              9
                      · 불(횃불·모닥불)                          5 — 조명이라 넉넉히
                      · 큰 것(천막 넷·짐수레·죽은나무·헛간)        7 ≈ 19%
                    천막 넷은 일부러다 — **자는 자리가 보여야 야영지로 읽힌다.**
                    죽은나무(160x200)·헛간(224x168)은 하나씩만: 흔하면 밭이 된다. */
                 /* ★★★ 3차 — **사람이 산 흔적**을 넣는다. 천막이 잠자리라면
                    솥·건조대는 **살림**이고, 무기걸이는 여기가 누구의 야영지인지를
                    말한다. 셋 다 사람 키만 하니 잔 것과 큰 것 사이로 둔다:
                      · cookpot·dryrack 둘씩 — 살림은 눈에 자주 밟혀야 산 곳이다
                      · wrack 하나        — 흔하면 무기고지 야영지가 아니다
                      · boulder 둘        — 마른 흙에 박힌 자연물, 바닥을 채운다
                      · banner 하나       — **표식은 드물어야 표식이다**(80x176 로
                                            세로가 길어 흔하면 깃발밭이 된다)
                    51 칸 중 큰 것 여덟(천막 넷·짐수레·죽은나무·헛간·깃발) ≈ 16%.
                    ★★★★ 4차 — 세 번 만에 나온 짚·잠자리를 넣는다. **잠자리는
                    천막 다음으로 센 신호다**(사람이 여기서 잔다) — 둘씩 준다.
                    숫돌·덮개짐은 하나씩: 있으면 반갑고 흔하면 지겹다. */
                 set: ["barrel", "barrel", "barrel", "crate", "crate", "crate",
                       "sacks", "sacks", "logs", "logs", "shrub", "shrub",
                       "rock", "rock", "stump", "stump", "boulder", "boulder",
                       "hay", "hay", "bedroll", "bedroll",
                       "wall_a", "wall_a", "wall_b", "cart", "cart", "trough",
                       "palisade", "palisade", "well", "grindstone", "tarp",
                       "cookpot", "cookpot", "dryrack", "dryrack", "wrack",
                       /* ★ 51 칸에 횃불 셋이면 한 화면에 하나 뜰까 말까라 **빛웅덩이가
                          안 보인다** — 어젯밤 화면이 오히려 밋밋해진 이유다. 야영지에서
                          불은 소품이 아니라 **조명**이니 개수를 따로 잡는다(3 → 8). */
                       "torch", "torch", "torch", "torch",
                       "torch", "torch", "torch", "torch", "firepit", "firepit",
                       "tent_a", "tent_a", "tent_b", "tent_b",
                       "wagon", "tree", "shed", "banner"] });
    drawTown(ctx, w, h, cx, cy, sc, SQUASH, (townT += (dt || 0.016)));
    /* ★ 마을의 불빛은 drawTown 이 자리를 적어 준 **뒤에** 얹어야 그 프레임에 보인다
       (먼저 부르면 한 프레임 늦게, 그것도 소품 밑에 깔린다). */
    drawGlows(ctx, SQUASH);
    drawOne("char/necro", cx, cy + 6 * sc * SQUASH, 54 * us, "#2b2b52", null);
    drawTownLabels(ctx);
    return;
  }
  setAnchors([]);      // 던전은 목적지가 없다 — 마을 배치가 새면 안 된다
  /* 소환진의 회전·맥동은 **경과 시간**으로 돈다(프레임 수 아님) — 30fps 와 60fps 가
     달라 보이면 안 된다. 마을 시계(townT)와 따로 두어 던전에서만 흐른다. */
  battleT += (dt || 0.016);
  drawGround(ctx, w, h, cx, cy, 0, SQUASH, sc, { clear: 190, density: 34 });
  // 소환수가 진을 치는 둘레 — 여기가 뚫리면 본인이 맞는다는 걸 화면이 말해 준다
  drawHoldRing(ctx, cx, cy, RING_HOLD * 1.2 * sc, SQUASH);

  /* ══ 체력바 ══ **몸에 붙여 놓는다.**
     ★★ 병수님: "전투화면 처음부터 다시 재검토". 화면을 3배로 늘려 보고서야 알았다 —
     바를 `y - 그림높이` 에 놓고 있었는데, PixelLab 캔버스는 **머리 위에도 투명 여백**이
     있어서(종마다 6~20%) 바가 몸에서 한참 떠올라 있었다. 여럿이 섞이면 어느 바가
     누구 것인지 못 읽는다(허공에 막대만 떠 있는 것으로 보인다).
     이제 알파로 잰 **진짜 머리끝** 바로 위에 놓고, 폭도 **몸 폭**에 맞춘다. */
  const barAt = (base, x, y, hh, pct, col) => {
    const fm = footMetrics(base);
    const headY = y - hh * (1 - (fm ? fm.headFrac : 0)) + (fm ? hh * fm.footFrac : 0);
    const wdt = Math.max(14, hh * (fm ? fm.bodyWidthFrac : 0.5) * 0.9);
    const top = Math.round(headY - 6 * us);
    const h = Math.max(3, Math.round(3 * us));
    ctx.fillStyle = "#000c"; ctx.fillRect(Math.round(x - wdt / 2) - 1, top - 1, Math.round(wdt) + 2, h + 2);
    ctx.fillStyle = "#1a1410"; ctx.fillRect(Math.round(x - wdt / 2), top, Math.round(wdt), h);
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x - wdt / 2), top, Math.round(wdt * Math.max(0, Math.min(1, pct))), h);
  };

  /* ══ 내 편 표시 ══ **이 게임은 아군과 적이 같은 종족이다.**
     내 해골 전사와 적 해골 궁수가 둘 다 해골이고, 내 구울과 적 좀비가 둘 다 썩은
     인간형이다. 그림만 보면 누가 내 편인지 알 수가 없다 — 체력바 색은 **다쳐야**
     보이므로 답이 못 된다. 그래서 **아군 발밑에 룬 고리**를 깐다(적에게는 없다).
     지배한 놈은 보라 — 원래 적이었다는 것이 색으로 남는다. */
  const RUNE = { skel: "#6fa8d8", ghoul: "#6fa8d8", golem: "#6fa8d8" };
  const footRune = (x, y, hh, col) => {
    /* ★ 처음엔 진한 파란 테를 둘렀더니 **요즘 게임의 선택 표시**처럼 보였다(디아블로 2
       라기보다 RTS 다). 테는 아주 얇게 낮추고 **땅에서 배어 나오는 빛** 쪽으로 옮긴다 —
       「내 것」이 읽히기만 하면 되지, 눈을 끌 필요는 없다. */
    const rx = hh * 0.30, ry = rx * SQUASH;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, rx * 0.15, x, y, rx);
    g.addColorStop(0, col + "3a"); g.addColorStop(0.70, col + "1c"); g.addColorStop(1, col + "00");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 0.30; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, us * 0.7);
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.88, ry * 0.88, 0, 0, 6.2832); ctx.stroke();
    ctx.restore();
  };
  /* 그림 높이는 이제 **개체가 들고 있다**(core.js 의 MINIONS.h · MOB_H).
     예전엔 적 크기를 충돌 반경에서 뽑아 썼는데, 반경을 그림에 맞추려 하면
     그림이 따라 커지는 고리에 걸려서 갈라 뒀다. */

  /* ══ 바닥에 누운 시체 ══ **몸들보다 먼저** 그린다 — 산 것이 시체를 밟고 선다.
     자원이 판 위에 쌓이는 것이 보여야 「시체가 자원」이 말이 아니라 그림이 된다.
     ★ 그림이 아직 안 왔으면 **어두운 얼룩**으로 대신한다 — 한 장이 없다고 자원이
       통째로 안 보이면 안 된다(에셋을 굽는 동안에도 굴러가야 한다). */
  for (const p of S.piles) {
    const x = px(p.x), y = py(p.y);
    /* 갓 생긴 것은 스르르 나타난다 — **쓰러지는 몸이 옅어지는 만큼**(CORPSE_FADE 는
       DEATH_T 와 같은 값) 짙어져, 몸이 시체로 바뀌는 한 동작이 된다. */
    const grow = p.born > 0 ? 1 - p.born / CORPSE_FADE : 1;
    /* 층이 넘어가면 앞 층 그림이 **어둠에 잠긴다** — 개수는 그대로, 그림만(enterFloor 가
       fade 를 걸고 step 이 다 잠기면 뺀다). 새 층 시체는 fade 가 없어 그대로 짙다. */
    const fade = p.fade !== undefined ? Math.max(0, p.fade / PILE_FADE) : 1;
    /* 밟고 다니는 것이므로 산 것보다 확실히 작게 — 거기에 **개체마다 ±15%** 를 준다 */
    const ph = 26 * us * (p.sc || 1);
    const im = corpseArt(p.sort, p.tint);
    ctx.save();
    // 바닥에 스며든 만큼 · 걷히는 만큼 눌러 둔다 · 개체마다 잠긴 깊이(dim)만큼 더
    ctx.globalAlpha = (0.34 + 0.44 * grow) * fade * (p.dim || 1);
    if (im) {
      ctx.imageSmoothingEnabled = false;
      const w = ph * (im.width / im.height);
      /* 좌우 뒤집기까지 넣으면 같은 각도라도 다른 놈으로 보인다 — 세로 SQUASH 는 그대로 */
      ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(p.flip || 1, SQUASH);
      ctx.drawImage(im, -w / 2, -ph * 0.5, w, ph);
    } else {
      ctx.fillStyle = "#100a08";
      ctx.beginPath(); ctx.ellipse(x, y, ph * 0.42, ph * 0.42 * SQUASH, p.rot, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  }

  /* ══ 누가 누구를 노리는가 ══ **휘두름이 시작되고 닿기 전까지**(pending 이 살아 있는
     동안) 때리는 놈과 맞을 놈을 가느다란 선으로 잇는다. 닿는 순간 pending 이 null 이 되며
     선이 저절로 사라지므로 — **선은 예고, 숫자는 결과**다. 원인 → 결과가 화면 순서로 읽힌다.
     편은 색으로 가른다: 소환수가 노리면 푸른빛, 적이 노리면 붉은빛. 본인을 노리는 것(core)은
     **가장 굵고 붉게** — 판 가운데로 붉은 선이 모이면 「뚫렸다」가 한눈에 온다.
     타격이 가까울수록 또렷해진다(진행도로 알파·굵기를 올린다) — 그게 「온다」는 신호다.
     맞을 놈 발밑엔 **얇은 표적 고리**를 얹는다(아군 룬은 은은한 빛, 이건 얇은 선이라 안 헷갈린다).
     ★ 좌표는 반드시 px()/py() 를 거친다 — 세로가 SQUASH 로 눌려 있어 직접 계산하면 어긋난다. */
  const aimLine = (ax, ay, bx, by, prog, col, wide) => {
    const x0 = px(ax), y0 = py(ay), x1 = px(bx), y1 = py(by);
    ctx.save();
    ctx.strokeStyle = col; ctx.lineCap = "round";
    ctx.globalAlpha = 0.15 + 0.5 * prog;
    ctx.lineWidth = Math.max(1, wide * us * (0.5 + 0.5 * prog));
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const rr = 9 * us * (0.7 + 0.5 * prog);
    ctx.globalAlpha = 0.2 + 0.55 * prog; ctx.lineWidth = Math.max(1, us);
    ctx.beginPath(); ctx.ellipse(x1, y1, rr, rr * SQUASH, 0, 0, 6.2832); ctx.stroke();
    ctx.restore();
  };
  for (const u of S.minions) {
    if (!u.pending || !u.pending.tgt) continue;
    const t = u.pending.tgt, prog = Math.min(1, (1 - u.swing / SWING_T) / IMPACT_AT);
    aimLine(u.x, u.y, t.x, t.y, prog, "#6fb2ff", 1.6);
  }
  for (const m of S.mobs) {
    if (!m.pending) continue;
    const prog = Math.min(1, (1 - m.swing / SWING_T) / IMPACT_AT);
    if (m.pending.core) aimLine(m.x, m.y, 0, 0, prog, "#ff3030", 2.8);
    else if (m.pending.tgt) aimLine(m.x, m.y, m.pending.tgt.x, m.pending.tgt.y, prog, "#e05a5a", 1.5);
  }

  /* **뒤에 있는 것부터 그린다.** 안 그러면 위쪽(먼) 적이 아래쪽(가까운) 소환수를 덮어
     앞뒤가 뒤집힌 그림이 된다. */
  const all = [];
  all.push({ y: 0, kind: "necro" });
  for (const u of S.minions) all.push({ y: u.y, u });
  for (const m of S.mobs)    all.push({ y: m.y, m });
  /* 쓰러지는 중인 몸도 **같은 줄에 세워 정렬한다** — 따로 그리면 앞뒤가 뒤집힌다 */
  for (const g of S.falling)  all.push({ y: g.y, g });
  all.sort((a, b) => a.y - b.y);

  for (const it of all) {
    if (it.g) {
      /* ══ 무너지는 몸 ══ **때린 쪽에서 밀려 넘어간다.**
         발끝을 축으로 기울이고(넘어짐), 가라앉히고(작아짐), 옅어진다. 그 아래에서
         시체가 같은 속도로 짙어지므로 눈에는 「몸이 시체가 되었다」 한 동작이다. */
      const g = it.g, p = 1 - g.t / DEATH_T;                 // 0 → 1
      const hh = g.hh * us, x = px(g.x), y = py(g.y);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p * p);              // 끝에서 빠르게 사라진다
      ctx.translate(x, y);
      /* 넘어지는 각도: 처음이 빠르고 끝은 눕는다. 밀린 방향을 모르면 오른쪽으로. */
      const side = (g.kx || 0) < 0 ? -1 : 1;
      ctx.rotate(side * 1.25 * Math.min(1, Math.pow(p * 1.4, 0.65)));
      ctx.scale(1, 1 - 0.28 * p);                            // 눕는 만큼 눌린다
      if (!drawSprite8(ctx, g.base, dirName(g.dx, g.dy), "idle", 0, 0, 0, hh)) {
        ctx.fillStyle = "#1a1210";
        ctx.beginPath(); ctx.ellipse(0, -hh * 0.4, hh * 0.26, hh * 0.4, 0, 0, 6.284); ctx.fill();
      }
      ctx.restore();
      continue;
    }
    if (it.kind === "necro") {
      /* 네크로는 원점(0,0)에 **고정** — 이동이 없으니 걷지 않는다. 가장 가까운 적을 보는
         idle 로 세우고, 스킬을 시전한 순간(S.pswing)만 attack 으로 바꾼다. 바라보는
         방향은 그 적 쪽(공격 방향 sdx,sdy 도 같은 방향으로 준다). */
      let nx = 0, ny = 1, nd = Infinity;
      for (const m of S.mobs) { const d = m.x * m.x + m.y * m.y; if (d < nd) { nd = d; nx = m.x; ny = m.y; } }
      /* ★★ **여기를 정규화 안 하고 있었다.** 방향만 쓸 때는 크기가 상관없어서
         적의 좌표를 그대로 넘겼는데, 나중에 **내지르기**(drawOne 의 lunge)를 넣으면서
         그 값에 길이가 곱해졌다 — 적이 300 만큼 떨어져 있으면 본체가 300배로 튕겨
         **화면 밖으로 날아갔다.** 소환수·적은 battle.js 에서 이미 정규화해 넘긴다.
         **새 기능이 기존 호출자의 가정을 깬 것** — 방향 벡터는 언제나 길이 1 로 준다. */
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;

      /* ══ 소환진 ══ **「이 판의 주인이 저기 있다」를 그림만으로.** 네크로는 어두운 색
         (COL.necro)이라 어두운 바닥에 묻히고, 크기(58)로도 소환수와 잘 안 갈렸다.
         발밑에 소환수 룬(footRune, hh*0.30)보다 확실히 큰 **이중 고리**를 깐다 —
         바깥·안쪽이 서로 반대로 아주 느리게 돌고(등속·경과 시간), 땅에서 배어 나온다.
         색만 다른 같은 고리면 뜻이 없으므로 **크기와 겹**으로 주인 것임을 드러낸다.
         ★ 진의 둘레 RING_HOLD(=105, 화면엔 RING_HOLD*1.2*sc 로 그린다)와 겹치면 안 된다 —
           반경을 RING_HOLD*0.72*sc 로 상한 잡아 확실히 안쪽에 둔다. */
      const ncx = px(0), ncy = py(0), nhh = 70 * us;   // 판의 인간형 중 제일 크게
      const hpFrac = S.hpMax ? Math.max(0, Math.min(1, S.hp / S.hpMax)) : 1;
      const danger = hpFrac < 0.3;                     // ④의 core 숫자는 맞는 순간만 뜬다 —
      const cast   = Math.max(0, Math.min(1, (S.pswing || 0) / SWING_T));   // 「지금 위태롭다」를 상시로
      const RGB    = danger ? "214,58,44" : "150,96,232";   // 위태로우면 붉게 물든다
      const spin   = danger ? 5.0 : 1.6;               // 위태로우면 맥동이 빨라진다
      const pulse  = 0.5 + 0.5 * Math.sin(battleT * spin);
      const hot    = 0.55 + 0.45 * pulse;
      const boost  = cast > 0 ? 0.5 : 0;               // 시전하는 동안 소환진이 밝아진다
      const R      = Math.min(nhh * 0.62, RING_HOLD * 0.72 * sc);

      ctx.save();
      ctx.translate(ncx, ncy); ctx.scale(1, SQUASH);   // 바닥면으로 눕혀 회전이 SQUASH 를 안 깬다
      /* 땅에서 배어 나오는 보라 웅덩이 */
      const pool = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.18);
      pool.addColorStop(0, `rgba(${RGB},${0.32 * hot + boost * 0.34})`);
      pool.addColorStop(0.6, `rgba(${RGB},${0.13 * hot})`);
      pool.addColorStop(1, `rgba(${RGB},0)`);
      ctx.fillStyle = pool;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.18, 0, 6.2832); ctx.fill();
      /* 이중 고리 — 조각난 호로 그려야 회전이 눈에 보인다(민 원은 돌아도 안 보인다).
         바깥은 느리게 시계방향, 안쪽은 반대로 조금 빠르게 — 조각 수도 달라 둘이 갈린다. */
      const arcRing = (rad, rot, segs, lw, a) => {
        ctx.strokeStyle = `rgba(${RGB},${a})`; ctx.lineWidth = lw; ctx.lineCap = "round";
        const st = 6.2832 / segs;
        for (let i = 0; i < segs; i++) { const g0 = rot + i * st;
          ctx.beginPath(); ctx.arc(0, 0, rad, g0, g0 + st * 0.55); ctx.stroke(); }
      };
      const lw = Math.max(1.2, us * 1.3);
      arcRing(R,        battleT * 0.35, 10, lw,       0.5 * hot + boost * 0.4);
      arcRing(R * 0.64, -battleT * 0.52, 7, lw * 0.9, 0.55 * hot + boost * 0.4);
      /* 시전한 순간이 발밑에 온다 — 고리 하나가 바깥으로 퍼지며 사라진다(pswing 이 사는 동안). */
      if (cast > 0) {
        const cp = 1 - cast;                           // 0 → 1
        ctx.globalAlpha = 0.55 * (1 - cp);
        ctx.strokeStyle = `rgba(${RGB},0.9)`;
        ctx.lineWidth = Math.max(1.5, us * 1.8 * (1 - cp * 0.5));
        ctx.beginPath(); ctx.arc(0, 0, R * (1 + 1.4 * cp), 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      /* 어둠에서 떼어낸다 — 몸 **뒤로** 은은한 보랏빛을 얹어 어두운 바닥과 가른다.
         덧칠이 아니라 뒷광이라(몸은 이 다음에 그린다) 실루엣을 뭉개지 않는다. */
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const aura = ctx.createRadialGradient(ncx, ncy - nhh * 0.35, 2, ncx, ncy - nhh * 0.35, nhh * 0.72);
      aura.addColorStop(0, `rgba(${RGB},${0.16 * hot + boost * 0.2})`);
      aura.addColorStop(1, `rgba(${RGB},0)`);
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.ellipse(ncx, ncy - nhh * 0.35, nhh * 0.42, nhh * 0.72, 0, 0, 6.2832); ctx.fill();
      ctx.restore();

      /* 맞으면 본인도 움찔한다 — 소환수·적은 되는데 본인만 안 되면 「내가 맞았다」가
         숫자로만 온다(그리는 쪽은 flinch 하나로 셋 다 같은 안무를 쓴다). */
      drawOne("char/necro", ncx, ncy, nhh, COL.necro,
              { dx: nx, dy: ny, sdx: nx, sdy: ny, swing: S.pswing || 0, moving: 0, walked: 0,
                flinch: S.hurt || 0, kx: S.hkx, ky: S.hky });
      continue;
    }
    if (it.u) {
      /* 먹어서 커진 만큼 **그림도 커진다** — 셈만 커지면 병수님 눈엔 아무 일도 안 난다.
         지배한 놈은 원래 적의 그림을 그대로 쓴다(u.art) — 「저 브루트가 내 편이다」가
         한눈에 읽히는 게 이 노드의 전부다. */
      const u = it.u, hh = (u.h || 40) * us * feedMul(u), x = px(u.x), y = py(u.y);
      /* ★ 지배한 놈은 **적과 그림이 똑같다** — 화면만 보면 내 편인지 알 수가 없다
         (첫 판을 찍어 보고 알았다: 붉은 타락자가 사방에 섞여 누가 누군지 안 읽혔다).
         발밑에 보라 테를 둘러 「이건 내 것」을 그림 없이 말한다. */
      footRune(x, y, hh, u.own ? COL.thrall : (RUNE[u.kind] || "#9fd7ff"));
      const ubase = u.art || ("minion/" + u.kind);
      drawOne(ubase, x, y, hh, COL[u.kind] || COL.thrall, u);
      if (u.hp < u.hpMax) barAt(ubase, x, y, hh, u.hp / u.hpMax, "#7fb069");
      continue;
    }
    const m = it.m, hh = (m.h || 48) * us, x = px(m.x), y = py(m.y);
    const mbase = m.kind ? "mob/" + m.kind : "mob/fallen";
    /* ══ 둘레를 지난 놈 ══ **왜 내가 맞고 있는지**가 화면에 없었다. 사방에서 오는 판이라
       적이 여럿인데, 그중 **본인에게 닿을 놈**과 소환수에 붙들린 놈이 똑같아 보였다.
       진을 지나 안쪽으로 들어온 놈의 발밑만 붉게 물들인다 — 「저기가 뚫렸다」가 읽힌다. */
    if (Math.hypot(m.x, m.y * SQUASH_VIEW_C) < RING_HOLD * 0.92 && !m.born) {
      const rr = hh * 0.30;
      ctx.save();
      const g2 = ctx.createRadialGradient(x, y, rr * 0.15, x, y, rr);
      g2.addColorStop(0, "#c8323244"); g2.addColorStop(0.7, "#c8323222"); g2.addColorStop(1, "#c8323200");
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    drawOne(mbase, x, y, hh, m.boss ? COL.boss : COL.mob, m);
    /* 관문의 주인은 **다치기 전부터** 바를 보인다 — 얼마나 남았는지가 관문의 전부다 */
    if (m.hp < m.hpMax || m.boss) barAt(mbase, x, y, hh, m.hp / m.hpMax, m.boss ? "#d05353" : "#8b1a1a");
  }

  /* ══ 떠오르는 피해 숫자 ══ **몸보다 위에** 그린다 — 가려지면 없는 것과 같다.
     색으로 **누가 아픈지**를 가른다: 적이 맞음 = 뼈빛, 내 편이 맞음 = 탁한 주홍,
     본인이 맞음 = 진한 빨강(제일 큼 — 곧 게임이 끝난다는 뜻이다), 회복 = 초록, 폭발 = 주황.
     ★ 폰에서도, 밝은 불꽃 위에서도 읽히게 **검은 외곽선**을 두른다(어두운 바닥에 얇은 글자는 묻힌다). */
  const NUMC = { dmg: ["#f2e9d0", "#000"], hurt: ["#d98a5a", "#160804"],
                 core: ["#ff2d2d", "#1a0000"], heal: ["#7fe07f", "#04160a"],
                 nova: ["#ffa53c", "#180c02"] };
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  for (const n of S.nums) {
    const p = 1 - Math.max(0, n.t) / 0.9;                 // 0 → 1
    const x = px(n.x) + n.vx * p * us, y = py(n.y) - (16 + 30 * p) * us;
    const [fg, bg] = NUMC[n.kind] || NUMC.dmg;
    const base = n.kind === "core" ? 19 : n.kind === "nova" ? 15 : 13;   // 본인은 1.5배
    const size = Math.round(base * us);
    const txt = n.kind === "heal" ? "+" + n.v : "" + n.v;    // 회복은 깎임과 반대라 + 를 앞에
    ctx.save();
    ctx.globalAlpha = p < 0.12 ? p / 0.12 : Math.max(0, 1 - (p - 0.12) / 0.88);
    ctx.font = `${size}px "Galmuri9", monospace`;
    ctx.lineWidth = Math.max(2, us * 2); ctx.strokeStyle = bg; ctx.lineJoin = "round";
    ctx.strokeText(txt, x, y); ctx.fillStyle = fg; ctx.fillText(txt, x, y);
    ctx.restore();
  }

  /* ── 날아가는 뼈 ── 본인의 기본공격. **꼬리를 남긴다** — 작은 점 하나는 30fps 에서
     그냥 깜빡이는 것으로 보인다. 진행 방향으로 늘린 선이 있어야 "날아간다"로 읽힌다. */
  for (const b of S.bolts) {
    const x = px(b.x), y = py(b.y);
    const tx = px(b.x - b.dx * 26), ty = py(b.y - b.dy * 26);
    const g = ctx.createLinearGradient(tx, ty, x, y);
    g.addColorStop(0, "rgba(150,190,230,0)"); g.addColorStop(1, "#cfe2f5");
    ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = "#e8f2ff";
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.284); ctx.fill();
  }

  for (const f of S.fx) {
    if (f.kind === "bossring") {
      /* ══ 관문 보스가 서는 자리 ══ **여긴 다르다.** 관문은 색이 다른 글줄 하나 말고는
         졸개 층과 똑같이 생겼다 — 보스가 배어 나오기 직전 그 자리 바닥에 붉은 고리를
         크게 퍼뜨렸다가 조여든다(전반은 커지고 후반은 조인다). 「저기 주인이 선다」. */
      const p = 1 - Math.max(0, f.t) / BOSSRING_T;          // 0 → 1
      const x = px(f.x || 0), y = py(f.y || 0);
      const rr = 96 * us * (p < 0.5 ? p * 2 : 1 - (p - 0.5) * 1.5);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.6 * (1 - p * p));
      ctx.strokeStyle = "#c83232"; ctx.lineWidth = Math.max(1.5, 3 * us * (1 - p * 0.5));
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH, 0, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = Math.max(0, 0.2 * (1 - p));
      ctx.fillStyle = "#5a1010";
      ctx.beginPath(); ctx.ellipse(x, y, rr * 0.8, rr * 0.8 * SQUASH, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === "rise") {
      /* ══ 시체를 쓴 자리 ══ **땅이 터지며 먼지가 인다.** 예전엔 이걸 타격 불꽃 그림으로
         그리고 있었다 — 시체가 없어진 자리에서 「맞았다」가 번쩍이니 뜻이 반대였다.
         바닥에 퍼지는 고리 하나면 「여기 것을 썼다」가 읽힌다. */
      const p = 1 - Math.max(0, f.t) / RISE_T;               // 0 → 1
      const x = px(f.x || 0), y = py(f.y || 0), rr = 30 * us * (0.35 + 0.9 * p);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.55 * (1 - p));
      ctx.strokeStyle = "#6f5a3c"; ctx.lineWidth = Math.max(1, 2.4 * us * (1 - p * 0.7));
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH * 0.9, 0, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = Math.max(0, 0.30 * (1 - p));
      ctx.fillStyle = "#2a2018";
      ctx.beginPath(); ctx.ellipse(x, y, rr * 0.75, rr * 0.75 * SQUASH, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
    const im = sprite("fx/" + (f.kind === "nova" ? "nova" : "hit"));
    ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 3));
    const hh = f.kind === "nova" ? 190 : 28;
    const x = px(f.x || 0), y = py(f.y || 0);
    if (im) { ctx.imageSmoothingEnabled = false; ctx.drawImage(im, x - hh / 2, y - hh * 0.72, hh, hh); }
    else { ctx.fillStyle = f.kind === "nova" ? "#ff8000" : "#e8dcc2";
      ctx.beginPath(); ctx.arc(x, y - 14, f.kind === "nova" ? 70 : 5, 0, 6.284); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  /* ══ 들어섰다 ══ 판 위의 모든 것(①~⑤) 위에 마지막으로 얹는다 — 층이 바뀌는 순간·
     관문에 들어선 순간을 화면에 남긴다. 흔들림 밖에서 그리므로(drawArrive 가 좌표계를
     다시 고정한다) 명패는 떨지 않는다. */
  drawArrive(w, h);
}

/* ══ 층이 바뀌는 순간 · 관문에 들어서는 순간 ══
   층이 바뀌는 일이 로그 글줄 하나로만 지나갔다(enterFloor 의 say 한 줄). 방치형은
   **보는 게임**인데, 판에서 가장 큰 사건(내려간다·관문이다)이 화면에 아무 흔적도
   안 남겼다. 세 겹을 얹어 「지금 뭔가 달라졌다」를 판에 만든다:
     · 비네트 — 가장자리가 잠깐 어두워졌다 걷힌다(관문은 검붉게, 걷힌 뒤에도 옅게 남는다)
     · 명패   — 위쪽 가운데에 층수가 내려앉는다(관문은 두 줄 + 이중 테두리)
     · 빛의 띠 — 판을 위→아래로 한 번 훑는다(「내려가고 있다」)
   상태는 둘로 나뉜다: S.arrive(한 번 켜지고 step 이 끄는 것 — 걷히는 연출)와,
   「지금이 관문 층인가」(isGate — 층 내내 상시로 남는 옅은 비네트).
   ★ 흔들림(draw 초입 translate) 밖에 둔다 — 명패가 떨면 못 읽는다. setTransform 으로
     좌표계를 화면에 다시 고정해 캔버스 흔들림을 무른다. */
function drawArrive(w, h) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = w / 2;
  const vignette = (alpha, rgb) => {
    const g = ctx.createRadialGradient(cx, h / 2, Math.min(w, h) * 0.32,
                                       cx, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${alpha})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  };

  /* 관문 층 **내내** — 옅은 검붉은 비네트가 상시로 남는다. arrive 와 무관하게 isGate 로
     걸어야 층이 넘어가는 순간 저절로 사라진다(「여긴 다르다」가 상시로 읽혀야 한다). */
  if (isGate(S.floor)) vignette(0.12, "78,10,12");

  const a = S.arrive;
  if (!a) return;
  const e = ARRIVE_T - a.t;                           // 경과(0 → ARRIVE_T)

  /* 들어선 순간의 비네트 — 0.2초 안에 가장 어둡고 1.4초에 걸쳐 걷힌다. 관문은 더
     무겁고 검붉다(위 상시 비네트에 겹쳐 더 짙어진다). */
  const vig = e < 0.2 ? e / 0.2 : Math.max(0, 1 - (e - 0.2) / 1.4);
  if (vig > 0) vignette((a.gate ? 0.52 : 0.42) * vig, a.gate ? "52,6,8" : "0,0,0");

  /* 빛의 띠 — 위→아래로 한 번 훑는다. 조금 일찍 끝나(0.8배) 명패만 남는다.
     과하면 안 된다 — 알파 0.15 언저리에서 끝으로 갈수록 옅어진다. */
  const sweep = e / (ARRIVE_T * 0.8);
  if (sweep < 1) {
    const by = sweep * (h * 1.1) - h * 0.05, bh = h * 0.13;
    const g = ctx.createLinearGradient(0, by - bh, 0, by + bh);
    g.addColorStop(0, "rgba(210,188,128,0)");
    g.addColorStop(0.5, `rgba(214,192,132,${0.15 * (1 - sweep * 0.4)})`);
    g.addColorStop(1, "rgba(210,188,128,0)");
    ctx.fillStyle = g; ctx.fillRect(0, by - bh, w, bh * 2);
  }

  /* 층 명패 — 살짝 위에서 내려앉아 멈췄다가 사라진다. D2 금색(#c8aa6e — 관문 로그·
     상점 유니크와 같은 색), 캔버스에 이미 쓰는 픽셀 글꼴(Galmuri9)로 판과 결을 맞춘다. */
  const drop = Math.min(1, e / 0.35), yoff = -20 * (1 - drop) * (1 - drop);   // ease-out
  const alpha = Math.max(0, Math.min(1, e < 0.2 ? e / 0.2 : (a.t < 0.45 ? a.t / 0.45 : 1)));
  const k = Math.max(1, Math.min(1.7, w / 420));      // 넓은 화면에서 명패도 같이 큰다
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.lineJoin = "round";
  const topY = h * 0.15 + yoff;

  if (a.gate) {
    const big = Math.round(28 * k), sub = Math.round(12 * k);
    const padX = 20 * k, padY = 12 * k, gap = 7 * k;
    const l1 = `${a.f}층`, l2 = "관문 · 층의 주인";
    ctx.font = `${big}px "Galmuri9", monospace`; const wbig = ctx.measureText(l1).width;
    ctx.font = `${sub}px "Galmuri9", monospace`; const wsub = ctx.measureText(l2).width;
    const boxW = Math.max(wbig, wsub) + padX * 2, boxH = big + gap + sub + padY * 2;
    const bx = cx - boxW / 2;
    /* 검붉은 판 위에 **얇은 이중 테두리**(금선 둘) — 관문임을 테두리로도 말한다. */
    ctx.fillStyle = "rgba(20,8,8,0.62)"; ctx.fillRect(bx, topY, boxW, boxH);
    ctx.strokeStyle = "#c8aa6e"; ctx.lineWidth = Math.max(1, 1.4 * k);
    ctx.strokeRect(bx, topY, boxW, boxH);
    ctx.save(); ctx.globalAlpha = alpha * 0.6; ctx.lineWidth = Math.max(1, k);
    ctx.strokeRect(bx + 4 * k, topY + 4 * k, boxW - 8 * k, boxH - 8 * k); ctx.restore();
    const y1 = topY + padY + big, y2 = y1 + gap + sub;
    ctx.strokeStyle = "#1a0c06"; ctx.lineWidth = Math.max(2, 2 * k);
    ctx.font = `${big}px "Galmuri9", monospace`; ctx.fillStyle = "#e6c988";
    ctx.strokeText(l1, cx, y1); ctx.fillText(l1, cx, y1);
    ctx.font = `${sub}px "Galmuri9", monospace`; ctx.fillStyle = "#c8aa6e";
    ctx.strokeText(l2, cx, y2); ctx.fillText(l2, cx, y2);
  } else {
    const big = Math.round(30 * k), txt = `${a.f}층`;
    ctx.font = `${big}px "Galmuri9", monospace`;
    ctx.strokeStyle = "#160f04"; ctx.lineWidth = Math.max(2, 2.4 * k);
    ctx.fillStyle = "#c8aa6e";
    const y1 = topY + big;
    ctx.strokeText(txt, cx, y1); ctx.fillText(txt, cx, y1);
  }
  ctx.restore();
}

/* ══ 벨트 ══ D2 의 그 띠. 쓸 수 있으면 금테가 살고, 못 쓰면 죽는다 —
   **왜 못 쓰는지**(마나냐 시체냐)는 아래 글줄이 말한다. */
/* ★★ 디아블로 4 의 스킬바는 **여섯 칸이 늘 있고** 안 배운 자리는 빈 칸으로 남는다
   (병수님: "이거 디아4인데 하단 UI 보이지? 이거 최대한 비슷하게 구현해봐").
   칸 수가 스킬 수에 따라 늘었다 줄었다 하면 **띠의 폭이 흔들려** 판이 안 잡힌다 —
   자리를 먼저 만들어 두고 채워 넣는 쪽이 맞다. 빈 칸은 「아직 없는 것」이라는
   정보이기도 하다. */
const BELT_SLOTS = 6;

function belt() {
  const empty = Array.from({ length: Math.max(0, BELT_SLOTS - SKILLS.length) }, (_, j) =>
    `<div class="slot empty"><canvas class="fr"></canvas><span class="k">${SKILLS.length + j + 1}</span></div>`).join("");
  $("belt").innerHTML = SKILLS.map((s, i) =>
    /* ★ 아이콘은 **그림**이다. 예전엔 유니코드 기호(☠ ✦ ◆ ✹ ✜)를 넣었는데, 주위가
       전부 픽셀아트라 매끈한 시스템 폰트 글리프 하나가 통째로 튀었다(병수님: "UI스타일이
       별로"). 아직 안 구워진 것은 background 가 안 뜰 뿐이라 칸이 깨지지 않는다. */
    /* ★ 칸의 **테두리도 캔버스가 그린다**(js/frame.js). `border:1px solid` 는 언제나
       정확히 1px 이라 픽셀아트 옆에서 매끈하게 튄다. */
    `<div class="slot" data-sk="${s.id}" title="${s.n} — ${s.d}"><canvas class="fr"></canvas><i style="background-image:url(assets/ui/icon/${s.id}.png)"></i><span class="k">${i + 1}</span>
      <div class="cd" data-cd="${s.id}" style="height:0"></div></div>`).join("") + empty;
  /* 칸은 화면 폭 따라 30~68px 로 변한다 — 크기가 바뀌면 다시 그린다. */
  for (const el of document.querySelectorAll("#belt .slot"))
    watch(el, (cv, w, h) => drawSlot(cv, w, h, el.classList.contains("on")));
  $("belt").onclick = (e) => {
    const el = e.target.closest("[data-sk]");
    if (el) cast(el.dataset.sk);
  };
}
function beltState() {
  for (const s of SKILLS) {
    const el = document.querySelector(`[data-sk="${s.id}"]`);
    if (!el) continue;
    const ok = (S.cd[s.id] || 0) <= 0 && S.mp >= mpCost(s) && S.corpses >= s.corpse;
    if (el.classList.contains("on") !== ok) {          // **바뀔 때만** 다시 그린다
      el.classList.toggle("on", ok);
      el.classList.toggle("off", !ok);
      const cv = el.querySelector("canvas.fr");
      if (cv) drawSlot(cv, Math.round(el.clientWidth), Math.round(el.clientHeight), ok);
    }
    const cd = el.querySelector("[data-cd]");
    cd.style.height = Math.max(0, Math.min(1, (S.cd[s.id] || 0) / s.cd)) * 100 + "%";
  }
}

function hud() {
  /* 마을에서는 층이 아니라 **여기가 어디인지**를 적는다. 「1층 정리 중」이 마을 위에
     떠 있으면 화면이 무슨 장면인지 헷갈린다. */
  if (MODE.at === "town") {
    $("hFloor").textContent = "마을";
    $("hLeft").textContent  = `가장 깊이 ${META.deepest}층`;
  } else {
  $("hFloor").textContent = S.floor + "층";
  /* **얼마나 남았는지**가 없으면 층이 바뀌는 순간이 그냥 툭 온다. 남은 수를 적고
     띠로도 보인다 — 방치형은 보는 게임이라 진행이 눈에 보여야 한다. */
  const left = S.mobs.length;
  $("hLeft").textContent = left ? `남은 적 ${left}` : "다음 층 준비 중";
  }
  $("hLv").firstChild.nodeValue = "Lv." + META.lv;
  markSp();
  $("hGold").textContent = (META.gold | 0).toLocaleString();
  /* 채움을 **세로(height)와 가로(--pct) 양쪽으로** 알려 준다. 구슬은 세로로 차오르고
     띠는 가로로 차오르는데, 어느 쪽을 쓸지는 판의 결(테마)이 정한다 — 여기서는 둘 다 준다. */
  /* 구슬은 **캔버스에 픽셀로** 그린다(js/orb.js) — CSS 원은 가장자리가 매끄러워
     픽셀 화면에서 거기만 튄다. 값이 바뀔 때만 다시 그린다(매 프레임 30x30 을 두 번
     훑을 이유가 없다). */
  const hpPct = Math.max(0, Math.min(1, S.hp / hpMaxOf())),
        mpPct = Math.max(0, Math.min(1, S.mp / mpMaxOf()));
  const hq = Math.round(hpPct * 30), mq = Math.round(mpPct * 30);
  if (hq !== hud._hq) { hud._hq = hq; drawOrb($("hpOrb"), "hp", hpPct); }
  if (mq !== hud._mq) { hud._mq = mq; drawOrb($("mpOrb"), "mp", mpPct); }
  /* ★ 값이 커지면 「2280/2280」 이 구슬 폭을 넘는다(병수님 지적). 글꼴은 11px 격자가
     최소라 더 못 줄이므로 **값 쪽을 줄인다** — 네 자리부터 k 로 적는다.
     1000 미만은 그대로 둔다(초반에 굳이 1.0k 로 적으면 오히려 안 읽힌다). */
  /* ★ 자가 **지금 값만** 보면 나중에 값이 커질 때 또 넘친다. 나올 수 있는 최악의
     표기를 재 보니 「1280k/1280k」(104px)만 구슬(112px)을 넘겼다 — 백만을 넘으면
     **단계를 하나 더** 올린다(1.3M). 「지금 안 넘친다」와 「앞으로도 안 넘친다」는 다르다. */
  /* ★ 글자를 넣고 **넘치면 한 격자 내린다**(27 → 18px). 둘 다 9격자의 배수라
     어느 쪽이든 선명하다. 구슬을 넓혀서 자리를 만들려던 것이 모양을 망친
     원인이었으니(원 → 타원 → 네모), 이제 **그릇은 그대로 두고 글자가 맞춘다.**
     길이는 짐작하지 않고 canvas 로 **잰다** — 값이 커져도 규칙이 그대로 산다. */
  fitNum($("hpNum"), S.hp, hpMaxOf());
  fitNum($("mpNum"), S.mp, mpMaxOf());
  /* 시체·군세는 **로그에서 뺐다.** 흘러가는 글줄에 섞어 두면 늘 봐야 하는 값이
     지나간 사건에 밀려 사라진다. 판의 게이지 칸으로 옮겼다(벨트 아래 빈자리). */
  $("gCorpse").textContent = `시체 ${S.corpses}`;
  /* 지배한 놈은 상한 밖이라 **따로 적는다** — 한 칸에 섞으면 「6/6 인데 왜 더 서 있지」가 된다 */
  $("gArmy").textContent   = `군세 ${armyN()}/${armyCap()}` + (thrallN() ? ` +${thrallN()}` : "");
  const need = xpNeed(META.lv);
  $("xpFill").style.width = Math.min(100, (META.xp / need) * 100) + "%";
  /* ★ 경험치 **분수**는 따로 감싼다 — 폰에서는 이 한 줄이 「시체·레벨·군세」를
     두 줄로 접어 버린다(129/120423 처럼 길어질수록 심해진다). 숨길 수 있으려면
     따로 있어야 한다(hud.css 의 좁은 화면 규칙). 막대가 이미 진행을 보여 준다. */
  $("xpNum").innerHTML = `Lv.${META.lv} <span class="xpNumFrac">${META.xp | 0}/${need}</span>`;
  $("log").innerHTML = S.log.slice(0, 3).map(l => `<div>${l}</div>`).join("");
  beltState();
}

/** **자동으로 소환한다.** 방치형이므로 사람이 안 눌러도 군대는 선다 —
 *  사람이 하는 건 "언제 시체를 아껴 폭발로 쓸까" 같은 판단이지 잔손질이 아니다. */
function auto() {
  if (S.dead) return;
  if (!S.minions.some(m => m.kind === "golem")) cast("golem");
  if (S.corpses >= 2 && armyN() < armyCap()) cast("ghoul");
  if (S.corpses >= 1 && armyN() < armyCap()) cast("raise");
}

/* ══ 마을과 던전 ══ 병수님: "마을에서 던전으로 진입하는거고".
   **한 화면을 두 장면으로 쓴다** — 같은 캔버스·같은 렌더 규칙. 다른 것은 무엇을
   그리느냐와 시간이 흐르느냐뿐이다(마을에서는 싸움이 멈춘다). */
export const MODE = { at: "town" };

/* ══ 마을의 창 ══ **한 줄에 한 가지 결정**만 담는다. 값이 여럿이면 표가 되고,
   표는 방치형이 아니라 숙제가 된다. */
const win = (id, on) => $(id).classList.toggle("on", on);
const closeAll = () => { win("winShop", false); win("winForge", false); win("winTree", false); };

/** 상인 — **장비 등급을 산다.** 한 번 사면 다음 등급이 열린다(반복 구매가 아니다).
 *  그래서 상점에 갈 이유가 「다음 것이 열렸다」로 분명해진다. */
/* ══ 디아블로식 상점 ══ 병수님: "디아블로 스타일 모르냐고,,"
   ──────────────────────────────────────────────────────────────
   **내가 만든 것은 「설정 목록」이었다.** 이름·설명·단추가 세로로 늘어선 표.
   디아블로의 상점은 그렇게 생기지 않았다:

     · 물건이 **격자 칸**에 놓여 있다. 목록이 아니라 **좌판**이다
     · 고르면 **툴팁**이 뜬다 — 검은 판에 이름 한 줄, 그 아래 능력치 줄들
     · **이름의 색이 곧 등급**이다. 흰 → 파랑(매직) → 노랑(레어) → 금갈(유니크).
       D2 를 해 본 사람은 색만 보고 안다. 이 한 가지가 「디아블로답다」의 절반이다

   그래서 격자 + 툴팁으로 다시 짠다. 좁은 화면에서 마우스 호버가 없으므로
   **누르면 아래에 툴팁이 선다**(고른 것이 무엇인지 칸에도 표시된다). */

/** 등급 색 — D2 의 규칙 그대로. */
const TIER_CLS = ["t0", "t1", "t2", "t3", "t4"];

let shopPick = "wand";                       // 좌판에서 고른 것

function drawShop() {
  /* ① 좌판 — 파는 물건이 칸에 놓여 있다 */
  $("shopGrid").innerHTML = Object.entries(GEAR).map(([k, g]) => {
    const t = META.gear[k] | 0;
    return `<div class="cell${k === shopPick ? " sel" : ""}" data-pick="${k}">
      <i class="gear-${k}"></i><span class="q ${TIER_CLS[t]}">${t}</span></div>`;
  }).join("") + '<div class="cell empty"></div>'.repeat(5);

  /* ② 툴팁 — 고른 것의 이름과 능력치. **이름 색이 등급**이다 */
  const k = shopPick, g = GEAR[k];
  const t = META.gear[k] | 0, nx = gearNext(k), max = g.tiers.length - 1;
  const fmt = (v) => k === "wand" ? `+${Math.round(v * 100)}%`
            : k === "robe" ? `+${v}` : `+${v.toFixed(1)}/초`;
  const cost = nx === null ? 0 : g.cost[nx], can = META.gold >= cost;
  $("shopTip").innerHTML =
    `<div class="tipName ${TIER_CLS[t]}">${g.tiers[t]}</div>
     <div class="tipKind">${g.n}</div>
     <div class="tipStat">${g.d} <b>${fmt(g.val[t])}</b></div>` +
    (nx === null
      ? `<div class="tipNote">최고 등급 · 더 살 것 없음</div>`
      : `<div class="tipNext ${TIER_CLS[nx]}">다음 · ${g.tiers[nx]}</div>
         <div class="tipStat up">${g.d} <b>${fmt(g.val[nx])}</b></div>
         <div class="tipBuy"><span class="cost${can ? "" : " no"}">${cost} 금</span>
           <button class="btn" data-buy="${k}" ${can ? "" : "disabled"}>사기</button></div>`) +
    `<div class="tipPips">${Array.from({ length: max }, (_, i) =>
        `<i class="pip${i < t ? " on" : ""}"></i>`).join("")}</div>`;
  $("shopGold").textContent = (META.gold | 0).toLocaleString();
}

let forgePick = "hp";

function drawForge() {
  /* 대장간도 같은 결 — **칸에 놓고 고르면 툴팁**. 다만 파는 물건이 아니라 «몸»이라
     칸에 그림 대신 **지금 단계**를 적는다. */
  $("forgeGrid").innerHTML = Object.entries(UPS).map(([k, u]) => {
    const lv = META.up[k] | 0;
    return `<div class="cell${k === forgePick ? " sel" : ""}" data-fpick="${k}">
      <b class="lvl">${lv}</b><span class="cn">${u.n}</span></div>`;
  }).join("") + '<div class="cell empty"></div>'.repeat(4);

  const k = forgePick, u = UPS[k], lv = META.up[k] | 0;
  const cost = upCost(k), can = META.gold >= cost;
  $("forgeTip").innerHTML =
    `<div class="tipName t2">${u.n} <span class="lv">+${lv}</span></div>
     <div class="tipKind">대장간</div>
     <div class="tipStat">${u.d}</div>
     <div class="tipStat up">지금 · 체력 <b>${hpMaxOf()}</b> · 마나 <b>${mpMaxOf()}</b>
       · 군세 <b>${armyCap()}</b></div>
     <div class="tipBuy"><span class="cost${can ? "" : " no"}">${cost} 금</span>
       <button class="btn" data-up="${k}" ${can ? "" : "disabled"}>강화</button></div>`;
  $("forgeGold").textContent = (META.gold | 0).toLocaleString();
}

/* 누르는 것 하나로 셋을 다 받는다 — 창 안의 단추와 나가기. */
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.hasAttribute && t.hasAttribute("data-close")) { closeAll(); return; }
  const pick = t.closest && t.closest("[data-pick]");
  if (pick) { shopPick = pick.getAttribute("data-pick"); drawShop(); return; }
  const fpick = t.closest && t.closest("[data-fpick]");
  if (fpick) { forgePick = fpick.getAttribute("data-fpick"); drawForge(); return; }
  const buy = t.getAttribute && t.getAttribute("data-buy");
  if (buy) {
    const nx = gearNext(buy); if (nx === null) return;
    const cost = GEAR[buy].cost[nx];
    if (META.gold < cost) return;
    META.gold -= cost; META.gear[buy] = nx; saveMeta();
    S.hp = Math.min(hpMaxOf(), S.hp + 0);          // 최대치가 늘면 비율이 아니라 여유가 는다
    drawShop(); hud();
    return;
  }
  const up = t.getAttribute && t.getAttribute("data-up");
  if (up) {
    const cost = upCost(up);
    if (META.gold < cost) return;
    META.gold -= cost; META.up[up] = (META.up[up] | 0) + 1; saveMeta();
    drawForge(); hud();
  }
});

/* 마을에서 **화면 안의 것을 눌러** 움직인다. 큰 단추를 따로 두는 것보다
   「거기 있는 곳」으로 읽힌다. */
/* 검수용 — 자가 마을 건물 좌표를 못 맞춰서 창을 못 열었다. 여는 길을 하나 내준다. */
window.__openWin = (which) => {
  if (which === "shop")  { drawShop();  win("winShop", true);  win("winForge", false); }
  if (which === "forge") { drawForge(); win("winForge", true); win("winShop", false); }
};
$("stage").addEventListener("click", (e) => {
  if (MODE.at !== "town") return;
  const r = $("stage").getBoundingClientRect();
  const id = townHitAt(e.clientX - r.left, e.clientY - r.top);
  if (id === "gate")  { closeAll(); toDungeon(); }
  if (id === "shop")  { drawShop();  win("winShop", true);  win("winForge", false); }
  if (id === "forge") { drawForge(); win("winForge", true); win("winShop", false); }
});

export function toTown(why) {
  MODE.at = "town";
  useFloor("town");      // 마을은 흙길
  document.body.classList.add("in-town");
  saveMeta();
  if (why) S.log.unshift(why);
}
export function toDungeon() {
  closeAll();
  MODE.at = "dungeon";
  useFloor("crypt");   // 던전은 돌바닥
  document.body.classList.remove("in-town");
  newRun();
}
/* 검수용 — 자(headless)가 던전 화면을 보려면 입구를 눌러야 하는데, 그 자리는 판을
   다시 그릴 때마다 움직인다. 좌표를 맞히려다 흰 마을 사진만 찍는 일이 있어 길을 뚫어 둔다
   (window.__S · window.__geo 와 같은 부류). */
window.__toDungeon = toDungeon;
window.__bossH = bossH; window.__mobKinds = mobKindsFor; window.__MOB_H_OF = (k) => MOB_H[k] || 48;      // 관문 보스 크기 검수(tools/boss_probe.mjs)가 실제 값을 읽는다

/* ══ 로딩 ══ **다 올 때까지 덮는다.**
   ★ 진행률을 「내가 부른 횟수」로 세면 실제와 어긋난다 — 받는 곳(sprite8 의 img)에서
   센 값(LOAD)만 쓴다. 실패도 「끝난 것」으로 센다: 없는 파일을 기다리며 99% 에
   멈춰 있는 것이 제일 나쁘다.
   ★ 다 받아도 **최소 0.7초는 보여 준다.** 번쩍 지나가면 무엇이 있었는지 모르고,
   빠른 기기에서만 화면이 덜컥거린다. */
const LOAD_MIN = 0.7;
let loadT = 0, loadDone = false;
function loading(dt) {
  if (loadDone) return true;
  loadT += dt;
  const p = LOAD.total ? LOAD.done / LOAD.total : 0;
  $("lFill").style.width = Math.round(p * 100) + "%";
  $("lTxt").textContent = p < 1 ? `뼈를 맞추는 중… ${LOAD.done}/${LOAD.total}`
                                : "준비됨";
  if (p >= 1 && loadT >= LOAD_MIN && LOAD.total > 0) {
    loadDone = true;
    $("loading").classList.add("gone");
    /* 다 사라진 뒤에 치운다 — display:none 을 바로 걸면 사라지는 것이 안 보인다. */
    setTimeout(() => { const el = $("loading"); if (el) el.style.display = "none"; }, 500);
  }
  return loadDone;
}

let townT = 0, battleT = 0;
let last = 0, autoT = 0, hudT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
  /* 다 받기 전에는 **시간도 멈춘다.** 덮어 놓고 뒤에서 싸움이 진행되면, 걷어냈을 때
     이미 벌어진 판을 보게 된다 — 「시작」이 아니라 「중간부터」가 된다. */
  /* ★ 로딩 중에는 **연출 시간도 멈춘다.** 예전엔 draw(dt) 를 그대로 돌려 모닥불이
     로딩 화면 뒤에서 계속 흔들렸고, 걷히는 순간 이미 한창 떨고 있었다. */
  if (!loading(dt)) { draw(0); requestAnimationFrame(loop); return; }
  if (MODE.at === "dungeon") {
    for (let i = 0; i < S.speed; i++) step(dt);
    if ((autoT += dt) > 0.35) { autoT = 0; auto(); }
    /* 죽으면 **마을로 돌아온다.** 예전엔 그 자리에 멈춰 서서 아무 데도 못 갔다 —
       방치형은 죽는 것이 끝이 아니라 **한 바퀴의 끝**이라야 다시 들어갈 마음이 든다. */
    if (S.dead) { META.runs++; toTown(`<b style="color:#8b1a1a">쓰러짐</b> — 마을로 돌아옴`); }
  }
  draw(dt);
  if ((hudT += dt) > 0.1) { hudT = 0; hud(); }
  requestAnimationFrame(loop);
}

/* **판이 열릴 때 그림을 미리 받아 둔다.** 안 그러면 처음 보는 방향의 공격 프레임이
   그 순간에야 요청되어, 로드될 때까지 idle 자세로 폴백된다 — 그게 병수님이 본
   「타격 시 깜빡임」이었다. 방향이 여덟이라 몸을 틀 때마다 되풀이됐다. */
/* ★ 목록을 **먼저** 받는다 — 몇 장인지 알고 나서 불러야 없는 파일을 안 두드린다.
   못 받아도 preload 는 그대로 돈다(옛 방식으로 되돌아간다). */
await loadManifest();
preload(["char/necro", "minion/skel", "minion/ghoul", "minion/golem",
         "mob/fallen", "mob/zombie", "mob/skelarch", "mob/brute", "mob/boss"]);
/* ★ 조명을 걷었으니 **바닥 밝기가 그대로 화면 밝기**다. 던전은 어둡게(1.55),
   마을은 원본이 이미 밝아 오히려 낮춘다(0.72) — 어둠은 조명이 아니라 여기서 만든다. */
loadFloor("assets/floor/crypt_tile.png", 0.95, "crypt");
/* ★ 마을 바닥을 **야영지 마른 풀**로 바꾼다(병수님이 준 D2 로그 야영지 화면).
   갈색 흙 한 가지는 「공터」로 읽혔다 — 마른 풀빛이라야 야영지가 된다.
   원본 평균 110 이라 0.70 을 곱해 70 안팎 — 던전(40~60)보다 밝고 눈이 안 시리다. */
/* ★ 참고 화면은 **밤**이다(밝기 0.25). 우리는 0.37 로 대낮처럼 밝아서 횃불 빛이
   묻혔다 — 불이 조명 노릇을 하려면 바닥이 먼저 어두워야 한다. 0.70 → 0.45. */
/* ★★ 세 번 만에 **초록**이 나왔다. 앞의 둘이 흙만 준 이유는 두 가지였다:
   ① 프롬프트에서 초록을 「마른 풀·카키」로 눌러 적었다(청록이 튈까 봐 막아 온 습관)
   ② 타일 고르기를 **밝기·분산**으로 했더니 두 번 다 흙 칸을 집었다 — 이번엔
      **초록 비율이 제일 높은 칸**을 고른다(100%).
   밝기는 원본 89 에 0.55 를 곱해 참고 화면(0.25)에 맞춘다. */
loadFloor("assets/floor/meadow_tile.png", 0.55, "town");
/* 마을은 **Wang 16장**으로 깐다 — 풀과 흙이 한 바닥에서 섞이고 길 가장자리가
   너덜너덜해진다(위 loadFloor 는 Wang 이 안 뜰 때의 대비책). */
loadWang("assets/floor/meadow2.png", "assets/floor/meadow2_wang.json", 0.55, "town");
/* ★ 흙 타일을 통째로 갈아 끼우니 **네모 덩어리**로 떴다 — 두 타일은 Wang 전이가
   아니라서 경계가 직각이 된다. 타일은 풀 하나로 두고, 흙은 **얼룩(decal)** 으로
   얹는다 — 얼룩은 알파 모양이라 경계가 원래 너덜너덜하다. */
loadDecor();
loadDecals();                   // 바닥 얼룩 — 격자를 끊는다(js/ground.js)
loadTown();
watch($("xpWrap"), drawBar);
watchPlate($("hudPlate"), $("panel"));   // 구슬~띠~구슬을 한 덩어리로 잇는다
fit(); belt(); newRun(); hud(); markSp();

/* ══ 스킬 트리를 여는 곳 ══ **레벨 옆이다.** 점수가 레벨에서 나오므로 거기가
   제자리이고, 마을이 아니어도 열려야 한다 — 층을 내려가다 레벨이 올랐는데
   마을까지 돌아와야 찍을 수 있으면 그건 벌이다. */
$("hLv").addEventListener("click", () => {
  const on = !$("winTree").classList.contains("on");
  closeAll(); if (on) { drawTree(); win("winTree", true); }
});
/* 트리를 찍으면 **벨트가 바뀔 수 있다**(구울·골렘이 열린다) — 다시 짓는다. */
document.addEventListener("treeChanged", () => { belt(); hud(); });
toTown();                       // **마을에서 시작한다** — 들어갈지는 사람이 정한다
requestAnimationFrame(loop);

// 자가 안을 들여다볼 수 있게 — 못 보는 것은 못 잰다
Object.assign(window, { syncTest: () => { syncSkills(); drawTree(); belt(); }, S, META, SKILLS, MINIONS, step, cast, newRun, saveMeta, armyCap, auto, spLeft, drawTree, frames, sprite, dirName, footMetrics, MODE, toTown, toDungeon, __townHits: townHits, LOAD });
