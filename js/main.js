import { $, GEAR, gearNext, hpMaxOf, META, MINIONS, mpMaxOf, S, saveMeta, SKILLS, armyCap, upCost, UPS, xpNeed } from "./core.js";
import { cast, CORE_R, newRun, RING_HOLD, RING_SPAWN, step, SWING_T } from "./battle.js";
import { dirName, drawSprite8, footMetrics, frameCount, LOAD, preload } from "./sprite8.js";
import { drawOrb } from "./orb.js";
import { watchPanel } from "./panel.js";

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
import { drawGlows, drawGround, drawHoldRing, loadFloor, loadDecor, useFloor } from "./ground.js";
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
/* ══ 걸음·공격 ══ **8방향 스프라이트를 재생한다**(js/sprite8.js).
   전에는 한 장을 부위로 잘라 흔들었다(js/rig.js) — PixelLab 8방향 프레임이 못 쓸 것이라
   여겼기 때문이다. 이제 걷기 6프레임·공격 6프레임이 8방향 전부로 실제로 구워져 있어
   그것을 그대로 튼다. 방향이 그림에 들어 있으니 **좌우 뒤집기는 하지 않는다.** */
function drawOne(base, x, gy, h, fallback, e) {
  /* **막 나타난 놈은 어둠에서 배어 나온다.** 시차만 두고 툭 세우면 여전히 갑작스럽다 —
     0.4초 동안 흐리게 시작해 짙어진다. 그림자도 같이 옅어야 발밑만 먼저 뜨지 않는다. */
  const born = e && e.born > 0 ? 1 - e.born / 0.4 : 1;
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
      const seq = [0, 0.18, 0.36, 0.50, 0.72, 0.86];    // 여섯 구간(타격 칸 = 세 번째)
      let k = 0; while (k < 5 && p >= seq[k + 1]) k++;
      frameIdx = Math.min(nf - 1, Math.round(k * (nf - 1) / 5));
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
  if (e && e.swing > 0 && e.sdx !== undefined) {
    const p = 1 - e.swing / SWING_T;
    const push = p < 0.5 ? -0.05 * (p / 0.5)                    // 들면서 뒤로
               : p < 0.62 ? -0.05 + 0.23 * ((p - 0.5) / 0.12)   // 후려치며 앞으로
               : 0.18 * (1 - (p - 0.62) / 0.38);                // 거두며 제자리로
    fx2 += e.sdx * h * push;
    fy2 += e.sdy * h * push * 0.55;                             // 세로는 눌린 만큼 덜
  }
  if (e && e.flinch > 0) {
    const t = e.flinch / 0.18;
    fx2 = -(e.kx || 0) * h * 0.14 * t; fy2 = -(e.ky || 0) * h * 0.07 * t;
  }

  /* 접지 그림자 — 스프라이트보다 **먼저**, 발밑에 깐다(그림이 그 위에 온다). 밀림(flinch)과
     무관하게 바닥에 고정한다 — 몸만 뒤로 밀리고 그림자는 제자리라야 맞은 티가 난다.
     폭은 발 폭(footWidthFrac)에 맞춘다 — 골렘은 넓게, 해골은 좁게. */
  const fm = footMetrics(base);
  const shr = fm ? h * fm.footWidthFrac * 0.55 : h * 0.3;
  ctx.fillStyle = "rgba(0,0,0,.42)";
  ctx.beginPath(); ctx.ellipse(x, gy, shr, shr * 0.34, 0, 0, 6.284); ctx.fill();

  ctx.save();
  ctx.translate(fx2, fy2);
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
    drawGround(ctx, w, h, cx, cy, 0, SQUASH, sc,
               { clear: 300, density: 26, town: true,
                 set: ["barrel", "crate", "cart", "well", "sacks", "barrel", "crate"] });
    drawTown(ctx, w, h, cx, cy, sc, SQUASH, (townT += (dt || 0.016)));
    /* ★ 마을의 불빛은 drawTown 이 자리를 적어 준 **뒤에** 얹어야 그 프레임에 보인다
       (먼저 부르면 한 프레임 늦게, 그것도 소품 밑에 깔린다). */
    drawGlows(ctx, SQUASH);
    drawOne("char/necro", cx, cy + 6 * sc * SQUASH, 54 * us, "#2b2b52", null);
    drawTownLabels(ctx);
    return;
  }
  drawGround(ctx, w, h, cx, cy, 0, SQUASH, sc, { clear: 190, density: 34 });
  // 소환수가 진을 치는 둘레 — 여기가 뚫리면 본인이 맞는다는 걸 화면이 말해 준다
  drawHoldRing(ctx, cx, cy, RING_HOLD * 1.2 * sc, SQUASH);

  const bar = (x, y, wdt, pct, col) => {
    ctx.fillStyle = "#000a"; ctx.fillRect(x - wdt / 2, y, wdt, 3);
    ctx.fillStyle = col; ctx.fillRect(x - wdt / 2, y, wdt * Math.max(0, pct), 3);
  };
  /* 그림 높이는 이제 **개체가 들고 있다**(core.js 의 MINIONS.h · MOB_H).
     예전엔 적 크기를 충돌 반경에서 뽑아 썼는데, 반경을 그림에 맞추려 하면
     그림이 따라 커지는 고리에 걸려서 갈라 뒀다. */

  /* **뒤에 있는 것부터 그린다.** 안 그러면 위쪽(먼) 적이 아래쪽(가까운) 소환수를 덮어
     앞뒤가 뒤집힌 그림이 된다. */
  const all = [];
  all.push({ y: 0, kind: "necro" });
  for (const u of S.minions) all.push({ y: u.y, u });
  for (const m of S.mobs)    all.push({ y: m.y, m });
  all.sort((a, b) => a.y - b.y);

  for (const it of all) {
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
      drawOne("char/necro", px(0), py(0), 58 * us, COL.necro,
              { dx: nx, dy: ny, sdx: nx, sdy: ny, swing: S.pswing || 0, moving: 0, walked: 0 });
      continue;
    }
    if (it.u) {
      const u = it.u, hh = (u.h || 40) * us, x = px(u.x), y = py(u.y);
      drawOne("minion/" + u.kind, x, y, hh, COL[u.kind], u);
      if (u.hp < u.hpMax) bar(x, y - hh - 6, hh * 0.62, u.hp / u.hpMax, "#7fb069");
      continue;
    }
    const m = it.m, hh = (m.h || 48) * us, x = px(m.x), y = py(m.y);
    drawOne(m.kind ? "mob/" + m.kind : "mob/fallen", x, y, hh, m.boss ? COL.boss : COL.mob, m);
    if (m.hp < m.hpMax) bar(x, y - hh - 6, hh * 0.62, m.hp / m.hpMax, "#8b1a1a");
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
    const im = sprite("fx/" + (f.kind === "nova" ? "nova" : "hit"));
    ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 3));
    const hh = f.kind === "nova" ? 190 : 28;
    const x = px(f.x || 0), y = py(f.y || 0);
    if (im) { ctx.imageSmoothingEnabled = false; ctx.drawImage(im, x - hh / 2, y - hh * 0.72, hh, hh); }
    else { ctx.fillStyle = f.kind === "nova" ? "#ff8000" : "#e8dcc2";
      ctx.beginPath(); ctx.arc(x, y - 14, f.kind === "nova" ? 70 : 5, 0, 6.284); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

/* ══ 벨트 ══ D2 의 그 띠. 쓸 수 있으면 금테가 살고, 못 쓰면 죽는다 —
   **왜 못 쓰는지**(마나냐 시체냐)는 아래 글줄이 말한다. */
function belt() {
  $("belt").innerHTML = SKILLS.map((s, i) =>
    /* ★ 아이콘은 **그림**이다. 예전엔 유니코드 기호(☠ ✦ ◆ ✹ ✜)를 넣었는데, 주위가
       전부 픽셀아트라 매끈한 시스템 폰트 글리프 하나가 통째로 튀었다(병수님: "UI스타일이
       별로"). 아직 안 구워진 것은 background 가 안 뜰 뿐이라 칸이 깨지지 않는다. */
    /* ★ 칸의 **테두리도 캔버스가 그린다**(js/frame.js). `border:1px solid` 는 언제나
       정확히 1px 이라 픽셀아트 옆에서 매끈하게 튄다. */
    `<div class="slot" data-sk="${s.id}" title="${s.n} — ${s.d}"><canvas class="fr"></canvas><i style="background-image:url(assets/ui/icon/${s.id}.png)"></i><span class="k">${i + 1}</span>
      <div class="cd" data-cd="${s.id}" style="height:0"></div></div>`).join("");
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
    const ok = (S.cd[s.id] || 0) <= 0 && S.mp >= s.mp && S.corpses >= s.corpse;
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
  $("hLeft").textContent = left ? `남은 적 ${left}` : "정리 중";
  }
  $("hLv").textContent = "Lv." + META.lv;
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
  $("gArmy").textContent   = `군세 ${S.minions.length}/${armyCap()}`;
  const need = xpNeed(META.lv);
  $("xpFill").style.width = Math.min(100, (META.xp / need) * 100) + "%";
  $("xpNum").textContent  = `Lv.${META.lv}  ${META.xp | 0}/${need}`;
  $("log").innerHTML = S.log.slice(0, 3).map(l => `<div>${l}</div>`).join("");
  beltState();
}

/** **자동으로 소환한다.** 방치형이므로 사람이 안 눌러도 군대는 선다 —
 *  사람이 하는 건 "언제 시체를 아껴 폭발로 쓸까" 같은 판단이지 잔손질이 아니다. */
function auto() {
  if (S.dead) return;
  if (!S.minions.some(m => m.kind === "golem")) cast("golem");
  if (S.corpses >= 2 && S.minions.length < armyCap()) cast("ghoul");
  if (S.corpses >= 1 && S.minions.length < armyCap()) cast("raise");
}

/* ══ 마을과 던전 ══ 병수님: "마을에서 던전으로 진입하는거고".
   **한 화면을 두 장면으로 쓴다** — 같은 캔버스·같은 렌더 규칙. 다른 것은 무엇을
   그리느냐와 시간이 흐르느냐뿐이다(마을에서는 싸움이 멈춘다). */
export const MODE = { at: "town" };

/* ══ 마을의 창 ══ **한 줄에 한 가지 결정**만 담는다. 값이 여럿이면 표가 되고,
   표는 방치형이 아니라 숙제가 된다. */
const win = (id, on) => $(id).classList.toggle("on", on);
const closeAll = () => { win("winShop", false); win("winForge", false); };

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
      ? `<div class="tipNote">더 나은 것은 없다</div>`
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

let townT = 0;
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
preload(["char/necro", "minion/skel", "minion/ghoul", "minion/golem",
         "mob/fallen", "mob/zombie", "mob/skelarch", "mob/brute", "mob/boss"]);
/* ★ 조명을 걷었으니 **바닥 밝기가 그대로 화면 밝기**다. 던전은 어둡게(1.55),
   마을은 원본이 이미 밝아 오히려 낮춘다(0.72) — 어둠은 조명이 아니라 여기서 만든다. */
loadFloor("assets/floor/crypt_tile.png", 0.95, "crypt");
loadFloor("assets/floor/town_tile.png", 0.55, "town");
loadDecor();
loadTown();
watch($("xpWrap"), drawBar);
watchPanel($("panelBg"));       // 가운데 판을 돌로 깎는다(js/panel.js)
fit(); belt(); newRun(); hud();
toTown();                       // **마을에서 시작한다** — 들어갈지는 사람이 정한다
requestAnimationFrame(loop);

// 자가 안을 들여다볼 수 있게 — 못 보는 것은 못 잰다
Object.assign(window, { S, META, SKILLS, MINIONS, step, cast, newRun, saveMeta, armyCap, auto, frames, sprite, dirName, footMetrics, MODE, toTown, toDungeon, __townHits: townHits, LOAD });
