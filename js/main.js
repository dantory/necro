import { $, hpMaxOf, META, MINIONS, mpMaxOf, S, saveMeta, SKILLS, armyCap } from "./core.js";
import { cast, CORE_R, newRun, RING_HOLD, RING_SPAWN, step } from "./battle.js";

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
/* ══ 걸음 ══ **그림 한 장을 좌표만 바꿔 밀면 걷는 게 아니라 미끄러진다**
   (병수님: "이동 모션이 하나도 없이 떠다님"). 걷기 프레임이 아직 없으므로,
   한 장으로 낼 수 있는 것을 낸다 — 앞 프로토타입에서 같은 지적을 받고 세운 처방이다:

     · 위상은 **지나온 거리**로 센다(battle.js 의 walked) — 그래야 느린 골렘은 발도
       천천히 놀리고, 붙어서 멎은 놈은 발이 멎는다
     · 발이 땅을 딛는 결이라 위아래는 |sin| 로, 몸통 기울기는 그 절반 주기로
     · 딛는 순간 **눌리고** 뜨는 순간 늘어난다 — 위아래 이동만이면 "떠오른다"로 읽힌다
     · **접지 그림자가 제일 크다.** 떠 보이는 것의 정체는 바닥에 닿은 자국이 없는 것이다.
       몸이 뜰 때 그림자도 같이 작아져야 딛는 것으로 보인다
     · 때리는 순간(swing)은 걷기를 멈추고 앞으로 한 번 내지른다 */
function drawOne(path, x, gy, h, fallback, e, sc) {
  const walking = e && e.moving > 0 && !(e.swing > 0);
  const ph = ((e && e.walked) || 0) / (h * 0.42) * Math.PI;     // 보폭은 키에 비례
  const bob  = walking ? Math.abs(Math.sin(ph)) * h * 0.075 : 0;
  const tilt = walking ? Math.sin(ph * 0.5) * 0.075 : 0;
  const sq   = walking ? Math.cos(ph * 2) * 0.055 : 0;
  /* **때리는 동작은 앞으로 확 나갔다 돌아온다.** 살짝 기울이는 정도로는 화면에서
     아무 일도 안 일어난 것처럼 보인다 — 앞의 30% 에 몰아서 튀어 나가고 남은 70% 로
     돌아온다(빠르게 치고 천천히 회수). 몸도 같이 젖혀야 "휘둘렀다"가 된다. */
  let lx = 0, ly = 0, swAng = 0;
  if (e && e.swing > 0) {
    const t = 1 - e.swing / 0.26;                       // 0 → 1
    const k = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;  // 튀어 나갔다 돌아옴
    const reach = h * 0.42 * k;
    lx = (e.sdx || 1) * reach; ly = (e.sdy || 0) * reach * 0.5;
    swAng = (e.sdx >= 0 ? 1 : -1) * 0.42 * k;
  }
  /* 맞은 순간엔 뒤로 밀리고 하얗게 튄다 — **맞았다는 것도 그림에 있어야** 때린 게 읽힌다 */
  let fx2 = 0, fy2 = 0, flash = 0;
  if (e && e.flinch > 0) {
    const t = e.flinch / 0.18;
    fx2 = -(e.kx || 0) * h * 0.14 * t; fy2 = -(e.ky || 0) * h * 0.07 * t;
    flash = t * 0.55;
  }
  /* **진짜 프레임이 있으면 그것을 쓴다.** 걷기는 지나온 거리로, 공격은 휘두름의 진행도로
     프레임을 고른다 — 시간으로 고르면 멈춘 놈도 발을 놀리고 느린 놈도 같은 박자가 된다. */
  const swSeq = (e && e.swing > 0) ? frames(path + "/attack") : null;
  const wkSeq = (!swSeq && walking) ? frames(path + "/walk") : null;
  let im;
  if (swSeq) {
    const t = Math.min(0.999, 1 - e.swing / 0.26);
    im = swSeq[Math.floor(t * swSeq.length)] || swSeq[0];
  } else if (wkSeq) {
    im = wkSeq[Math.floor(((e.walked || 0) / (h * 0.34)) % wkSeq.length)] || wkSeq[0];
  } else {
    im = sprite(path);
  }
  /* 프레임이 있으면 코드로 내던 흉내는 **줄인다** — 둘이 겹치면 과장돼 보인다. */
  const real = !!(swSeq || wkSeq);
  if (real) { lx *= 0.35; ly *= 0.35; swAng *= 0.3; }
  ctx.save();
  ctx.translate(x + lx + fx2, gy - bob * (real ? 0.3 : 1) + ly + fy2);
  ctx.rotate((real ? tilt * 0.3 : tilt) + swAng);
  ctx.scale(1 + (real ? sq * 0.3 : sq), 1 - (real ? sq * 0.3 : sq));
  if (im) {
    const w = h * (im.width / im.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, -w / 2, -h, w, h);
  } else {
    ctx.fillStyle = fallback;
    ctx.beginPath(); ctx.ellipse(0, -h * 0.4, h * 0.26, h * 0.4, 0, 0, 6.284); ctx.fill();
  }
  if (flash > 0 && im) {            // 맞은 순간의 흰 번쩍임
    const w2 = h * (im.width / im.height);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(255,240,220,${flash})`;
    ctx.fillRect(-w2 / 2, -h, w2, h);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
  // 접지 그림자 — 몸이 뜬 만큼 작아진다
  const sh = 1 - bob / (h * 0.14) * 0.28;
  ctx.fillStyle = `rgba(0,0,0,${0.45 * sh})`;
  ctx.beginPath(); ctx.ellipse(x, gy, h * 0.3 * sh, h * 0.09 * sh, 0, 0, 6.284); ctx.fill();
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
    if (it.kind === "necro") { drawOne("char/necro", px(0), py(0), 58, COL.necro, null); continue; }
    if (it.u) {
      const u = it.u, hh = HGT[u.kind] || 40, x = px(u.x), y = py(u.y);
      drawFlip("minion/" + u.kind, x, y, hh, COL[u.kind], u.face, u);
      if (u.hp < u.hpMax) bar(x, y - hh - 6, hh * 0.62, u.hp / u.hpMax, "#7fb069");
      continue;
    }
    const m = it.m, hh = m.boss ? 104 : 48 + (m.r - 10) * 2.6, x = px(m.x), y = py(m.y);
    drawFlip(m.kind ? "mob/" + m.kind : "mob/fallen", x, y, hh, m.boss ? COL.boss : COL.mob, m.face, m);
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

/** 가는 쪽을 보게 좌우를 뒤집어 그린다 — 사방으로 도는 판에서 이게 없으면
 *  절반이 뒷걸음질로 다닌다. */
function drawFlip(path, x, y, hh, fallback, face, e) {
  if (face === -1) {
    ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1);
    drawOne(path, 0, y, hh, fallback, e);
    ctx.restore();
  } else drawOne(path, x, y, hh, fallback, e);
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
Object.assign(window, { S, META, SKILLS, MINIONS, step, cast, newRun, saveMeta, armyCap, auto });
