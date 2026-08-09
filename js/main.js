import { $, hpMaxOf, META, MINIONS, mpMaxOf, S, saveMeta, SKILLS, armyCap, xpNeed } from "./core.js";
import { cast, CORE_R, newRun, RING_HOLD, RING_SPAWN, step } from "./battle.js";
import { dirName, drawSprite8, footMetrics } from "./sprite8.js";

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
  // 상태: 휘두르는 중 > 걷는 중 > 서 있음. 방향은 dx,dy(공격 땐 내지르는 sdx,sdy).
  let state = "idle", dir = "south", frameIdx = 0;
  if (e) {
    if (e.swing > 0) {
      state = "attack";
      /* 공격 프레임은 **swing 진행도**로. swing 은 0.26 에서 0 으로 준다 → 진행도(1-swing/0.26,
         0→1)를 6프레임에 선형 배분하고 끝에서 넘치지 않게 clamp. */
      frameIdx = Math.max(0, Math.min(5, Math.floor((1 - e.swing / 0.26) * 6)));
      dir = e.sdx !== undefined ? dirName(e.sdx, e.sdy) : dirName(e.dx ?? 0, e.dy ?? 1);
    } else if (e.moving > 0) {
      state = "walk";
      /* 걷기 프레임은 **지나온 거리**로(시간 아님) — 느린 골렘은 저절로 느리게 딛는다.
         한 주기 거리는 기존 리깅의 walkPh(=walked/(h*0.14)) 한 바퀴(2π)와 같게 잡아 박자
         (≈1.3초)를 그대로 물려받고, 그 한 바퀴를 6프레임에 나눈다. */
      const stride = h * 0.14 * 2 * Math.PI / 6;
      frameIdx = Math.floor((e.walked || 0) / stride) % 6;
      dir = dirName(e.dx ?? 0, e.dy ?? 1);
    } else {
      dir = dirName(e.dx ?? 0, e.dy ?? 1);
    }
  }

  /* 맞은 순간엔 **뒤로 밀린다**(기존 그대로). 흰 번쩍임은 예전에 뺐다 — 밀림 + 닿는 자리의
     불꽃(fx)으로 충분하다. */
  let fx2 = 0, fy2 = 0;
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
}

/* ══ 판을 **위에서 비스듬히** 본다 ══
   사방에서 오는 판이라 옆에서 보면 앞뒤가 겹쳐 아무것도 안 읽힌다. 그렇다고 정확히
   위에서 보면 **옆모습으로 구운 스프라이트**가 누워 버린다(디아블로 2 도 같은 이유로
   비스듬히 본다). y 를 눌러(SQUASH) 바닥을 눕히고, 그림은 세워서 세운 채로 얹는다 —
   흔히 쓰는 2.5D 다. 그리는 순서는 **y 가 작은 것부터**라야 앞의 것이 뒤를 가린다. */

function draw() {
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
  const sc = Math.min(scByW, (h * (1 - MARGIN * 2)) / (RING_SPAWN * 2 * squash));
  const SQUASH = squash;
  /* 인물 크기(HGT)는 스크린 픽셀 고정값이라, 판이 커져도 콩알이었다. 스케일에 비례해 키우되
     서로 겹치지 않게 상한(1.85)·하한(1)을 둔다. 0.44 는 옛 460 판의 대략적 기준 스케일. */
  const us = Math.max(1, Math.min(1.85, sc / 0.44));

  const cx = w / 2, cy = h * 0.5;
  const px = (x) => cx + x * sc;
  const py = (y) => cy + y * sc * SQUASH;
  /* 검수용 — 마지막으로 그린 판의 실제 기하(반지름·눌림·인물배율). 자(headless)가 화면 대비
     판이 얼마나 찼는지 재려면 그림값 자체가 필요하다. RING_SPAWN 은 battle.js 상수(300). */
  window.__geo = { w, h, cx, cy, sc, squash: SQUASH, us,
                   ringW: 2 * RING_SPAWN * sc, ringH: 2 * RING_SPAWN * sc * SQUASH };

  // 던전 바닥 — 어둡고, 빛은 가운데 한 점(본인이 든 횃불)에서만 온다
  ctx.fillStyle = "#080605"; ctx.fillRect(0, 0, w, h);
  const lg = ctx.createRadialGradient(cx, cy, 20, cx, cy, RING_SPAWN * sc * 1.15);
  lg.addColorStop(0, "#241a11"); lg.addColorStop(0.55, "#140f0a"); lg.addColorStop(1, "#080605");
  ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);

  // 바닥 돌 — 타원 고리 몇 겹이면 "둥근 방"으로 읽힌다
  ctx.strokeStyle = "#1d1610"; ctx.lineWidth = 1;
  for (let r = 70; r <= RING_SPAWN + 40; r += 70) {
    ctx.beginPath(); ctx.ellipse(cx, cy, r * sc, r * sc * SQUASH, 0, 0, 6.284); ctx.stroke();
  }
  // 소환수가 진을 치는 둘레 — 여기가 뚫리면 본인이 맞는다는 걸 화면이 말해 준다
  ctx.strokeStyle = "rgba(200,170,110,.16)"; ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, RING_HOLD * 1.2 * sc, RING_HOLD * 1.2 * sc * SQUASH, 0, 0, 6.284);
  ctx.stroke(); ctx.setLineDash([]);

  const bar = (x, y, wdt, pct, col) => {
    ctx.fillStyle = "#000a"; ctx.fillRect(x - wdt / 2, y, wdt, 3);
    ctx.fillStyle = col; ctx.fillRect(x - wdt / 2, y, wdt * Math.max(0, pct), 3);
  };
  const HGT = { skel: 52, ghoul: 58, golem: 84 };

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
      drawOne("char/necro", px(0), py(0), 58 * us, COL.necro,
              { dx: nx, dy: ny, sdx: nx, sdy: ny, swing: S.pswing || 0, moving: 0, walked: 0 });
      continue;
    }
    if (it.u) {
      const u = it.u, hh = (HGT[u.kind] || 40) * us, x = px(u.x), y = py(u.y);
      drawOne("minion/" + u.kind, x, y, hh, COL[u.kind], u);
      if (u.hp < u.hpMax) bar(x, y - hh - 6, hh * 0.62, u.hp / u.hpMax, "#7fb069");
      continue;
    }
    const m = it.m, hh = (m.boss ? 104 : 48 + (m.r - 10) * 2.6) * us, x = px(m.x), y = py(m.y);
    drawOne(m.kind ? "mob/" + m.kind : "mob/fallen", x, y, hh, m.boss ? COL.boss : COL.mob, m);
    if (m.hp < m.hpMax) bar(x, y - hh - 6, hh * 0.62, m.hp / m.hpMax, "#8b1a1a");
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
    `<div class="slot" data-sk="${s.id}" title="${s.n} — ${s.d}">${s.ico}<span class="k">${i + 1}</span>
      <div class="cd" data-cd="${s.id}" style="height:0"></div></div>`).join("");
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
    el.classList.toggle("on", ok);
    el.classList.toggle("off", !ok);
    const cd = el.querySelector("[data-cd]");
    cd.style.height = Math.max(0, Math.min(1, (S.cd[s.id] || 0) / s.cd)) * 100 + "%";
  }
}

function hud() {
  $("hFloor").textContent = S.floor + "층";
  /* **얼마나 남았는지**가 없으면 층이 바뀌는 순간이 그냥 툭 온다. 남은 수를 적고
     띠로도 보인다 — 방치형은 보는 게임이라 진행이 눈에 보여야 한다. */
  const left = S.mobs.length;
  $("hLeft").textContent = left ? `남은 적 ${left}` : "정리 중";
  $("hLv").textContent = "Lv." + META.lv;
  $("hGold").textContent = (META.gold | 0).toLocaleString();
  $("hpFill").style.height = Math.max(0, S.hp / hpMaxOf()) * 100 + "%";
  $("mpFill").style.height = Math.max(0, S.mp / mpMaxOf()) * 100 + "%";
  $("hpNum").textContent = `${Math.max(0, Math.round(S.hp))}/${hpMaxOf()}`;
  $("mpNum").textContent = `${Math.round(S.mp)}/${mpMaxOf()}`;
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

let last = 0, autoT = 0, hudT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
  for (let i = 0; i < S.speed; i++) step(dt);
  if ((autoT += dt) > 0.35) { autoT = 0; auto(); }
  draw();
  if ((hudT += dt) > 0.1) { hudT = 0; hud(); }
  requestAnimationFrame(loop);
}

fit(); belt(); newRun(); hud();
requestAnimationFrame(loop);

// 자가 안을 들여다볼 수 있게 — 못 보는 것은 못 잰다
Object.assign(window, { S, META, SKILLS, MINIONS, step, cast, newRun, saveMeta, armyCap, auto, frames, sprite, dirName, footMetrics });
