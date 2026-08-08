import { $, hpMaxOf, META, MINIONS, mpMaxOf, S, saveMeta, SKILLS, armyCap } from "./core.js";
import { cast, CORE_R, newRun, RING_HOLD, RING_SPAWN, step } from "./battle.js";
import { drawRigged } from "./rig.js";

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
/* ══ 프레임 묶음 ══ `assets/<종류>/walk/0.png…` · `…/attack/0.png…`
   PixelLab 로 구운 진짜 애니메이션이다. **없으면 조용히 한 장짜리로 돌아간다** —
   굽는 데 몇십 분이 걸리므로, 오는 대로 하나씩 살아나야지 다 올 때까지 못 보면 안 된다.
   프레임 수를 미리 모르니 0 번부터 **끊길 때까지** 물어보고 그 수를 기억한다. */
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
/* ══ 걸음·공격 ══ **부위를 잘라 따로 움직인다**(js/rig.js).
   PixelLab 의 걷기 프레임은 못 썼다 — `create_character` 가 참조를 무시하고 제 골격
   (정면 8방향)으로 다시 세워, 옆모습으로 구운 우리 그림이 정면으로 돌아 버렸다.
   그래서 프레임을 받는 대신 **가진 한 장을 머리·몸통·다리로 잘라** 각자 움직인다.
   통째로 흔드는 것과 다른 점 하나: **부위마다 위상이 다르다.** 그게 걸음으로 읽히는 조건. */
function drawOne(path, x, gy, h, fallback, e, kindKey) {
  const walking = e && e.moving > 0 && !(e.swing > 0);
  const im = sprite(path);
  const swing = e && e.swing > 0 ? 1 - e.swing / 0.26 : 0;

  /* 맞은 순간엔 **뒤로 밀린다.** 흰 번쩍임도 넣었다가 뺐다 — `source-atop` 으로 실루엣
     안에만 칠하려 했는데, 리깅이 부위마다 save/restore 를 하는 바람에 그 합성 모드가
     실루엣이 아니라 **사각형 전체**에 걸려 네모가 번쩍였다(병수님이 바로 잡아냈다).
     맞은 표시는 밀림 + 닿는 자리의 불꽃(fx)으로 충분하다. */
  let fx2 = 0, fy2 = 0;
  if (e && e.flinch > 0) {
    const t = e.flinch / 0.18;
    fx2 = -(e.kx || 0) * h * 0.14 * t; fy2 = -(e.ky || 0) * h * 0.07 * t;
  }

  if (im) {
    ctx.save();
    ctx.translate(fx2, fy2);
    drawRigged(ctx, im, x, gy, h, kindKey, {
      /* **보폭.** 지나온 거리를 이 값으로 나눈 것이 걸음 위상이다 — 작을수록 자주 딛는다.
         0.30 으로 뒀더니 한 걸음 주기가 2.9초였다. 다리는 분명히 움직이는데 화면에서는
         그냥 미끄러지는 걸로 읽혀 병수님이 "적용 안 된 거냐"고 물었다. 사람 눈은 걸음을
         **박자**로 읽지 각도로 읽지 않는다. 0.14 면 1.3초에 한 바퀴 — 걷는 것으로 보인다.
         속도로 나누지 않고 거리로 나누므로, 느린 골렘은 저절로 느리게 딛는다. */
      walkPh: ((e && e.walked) || 0) / (h * 0.14),
      walking, swing, flip: (e && e.face === -1) ? -1 : 1,
    });
    ctx.restore();
  } else {
    ctx.fillStyle = fallback;
    ctx.beginPath(); ctx.ellipse(x, gy - h * 0.4, h * 0.26, h * 0.4, 0, 0, 6.284); ctx.fill();
  }
  // 접지 그림자 — 이게 없으면 무엇을 그리든 바닥에서 떠 보인다
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath(); ctx.ellipse(x, gy, h * 0.3, h * 0.09, 0, 0, 6.284); ctx.fill();
}

/* ══ 판을 **위에서 비스듬히** 본다 ══
   사방에서 오는 판이라 옆에서 보면 앞뒤가 겹쳐 아무것도 안 읽힌다. 그렇다고 정확히
   위에서 보면 **옆모습으로 구운 스프라이트**가 누워 버린다(디아블로 2 도 같은 이유로
   비스듬히 본다). y 를 눌러(SQUASH) 바닥을 눕히고, 그림은 세워서 세운 채로 얹는다 —
   흔히 쓰는 2.5D 다. 그리는 순서는 **y 가 작은 것부터**라야 앞의 것이 뒤를 가린다. */
const SQUASH = 0.56;

function draw() {
  const w = cv.clientWidth, h = cv.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h * 0.52;
  /* **판이 화면에 꽉 차야 한다.** 바깥 여백을 조금만 남기고 맞춘다 — 여백이 크면
     인물이 콩알이 되고, 그러면 어떤 에셋을 구워도 안 보인다. */
  const sc = Math.min(w / (RING_SPAWN * 2.16), h / (RING_SPAWN * 2.16 * SQUASH));
  const px = (x) => cx + x * sc;
  const py = (y) => cy + y * sc * SQUASH;

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
    if (it.kind === "necro") { drawOne("char/necro", px(0), py(0), 58, COL.necro, null, "necro"); continue; }
    if (it.u) {
      const u = it.u, hh = HGT[u.kind] || 40, x = px(u.x), y = py(u.y);
      drawOne("minion/" + u.kind, x, y, hh, COL[u.kind], u, u.kind);
      if (u.hp < u.hpMax) bar(x, y - hh - 6, hh * 0.62, u.hp / u.hpMax, "#7fb069");
      continue;
    }
    const m = it.m, hh = m.boss ? 104 : 48 + (m.r - 10) * 2.6, x = px(m.x), y = py(m.y);
    drawOne(m.kind ? "mob/" + m.kind : "mob/fallen", x, y, hh, m.boss ? COL.boss : COL.mob, m, m.kind);
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
  $("hpNum").textContent = `${Math.max(0, Math.round(S.hp))} / ${hpMaxOf()}`;
  $("mpNum").textContent = `${Math.round(S.mp)} / ${mpMaxOf()}`;
  $("log").innerHTML =
    `<div>시체 <b style="color:#c8aa6e">${S.corpses}</b> · 군세 <b>${S.minions.length}</b>/${armyCap()}</div>` +
    S.log.slice(0, 3).map(l => `<div>${l}</div>`).join("");
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
Object.assign(window, { S, META, SKILLS, MINIONS, step, cast, newRun, saveMeta, armyCap, auto, frames, sprite, drawRigged });
