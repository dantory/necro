import { $, hpMaxOf, META, MINIONS, mpMaxOf, S, saveMeta, SKILLS, armyCap } from "./core.js";
import { cast, LANE, newRun, step } from "./battle.js";

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
/** 그림이 있으면 그림을, 없으면 색 덩어리를. **바닥에 발을 붙여 그린다**(gy 가 접지선이다) —
 *  가운데를 맞추면 큰 놈이 공중에 뜬 것처럼 보인다. */
function drawOne(path, x, gy, h, fallback) {
  const im = sprite(path);
  if (im) {
    const w = h * (im.width / im.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, x - w / 2, gy - h, w, h);
  } else {
    ctx.fillStyle = fallback;
    ctx.beginPath(); ctx.ellipse(x, gy - h * 0.4, h * 0.26, h * 0.4, 0, 0, 6.284); ctx.fill();
  }
  // 접지 그림자 — 이게 없으면 무엇을 그리든 바닥에서 떠 보인다
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath(); ctx.ellipse(x, gy, h * 0.3, h * 0.09, 0, 0, 6.284); ctx.fill();
}

function draw() {
  const w = cv.clientWidth, h = cv.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  /* 던전 — **위가 벽, 아래가 바닥**이다. 지평선을 0.62 에 두었더니 위쪽 절반이 통째로
     까맣게 비어 "아직 안 그린 화면"으로 보였다. 벽을 세우고 지평선을 내린다. */
  const gy = h * 0.72;
  ctx.fillStyle = "#0a0806"; ctx.fillRect(0, 0, w, h);
  /* 벽 — 돌을 쌓은 결. 줄눈이 가로세로로 어긋나야 벽으로 읽힌다(한 방향이면 줄무늬다) */
  const wg = ctx.createLinearGradient(0, 0, 0, gy);
  wg.addColorStop(0, "#0b0907"); wg.addColorStop(1, "#171009");
  ctx.fillStyle = wg; ctx.fillRect(0, 0, w, gy);
  ctx.strokeStyle = "#1e150d"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = gy - 34; y > -34; y -= 34) {
    ctx.moveTo(0, y); ctx.lineTo(w, y);
    const off = ((y / 34) | 0) % 2 ? 0 : 39;
    for (let x = off; x < w; x += 78) { ctx.moveTo(x, y); ctx.lineTo(x, y + 34); }
  }
  ctx.stroke();
  const grd = ctx.createLinearGradient(0, gy - 90, 0, h);
  grd.addColorStop(0, "#0f0b08"); grd.addColorStop(1, "#191209");
  ctx.fillStyle = grd; ctx.fillRect(0, gy - 90, w, h);
  ctx.strokeStyle = "#241a10"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) { const y = gy + i * i * 3.2; ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  // 횃불 같은 은은한 빛 — D2 의 어둠은 "까만 화면"이 아니라 **한 점에서 오는 빛**이다
  const lg = ctx.createRadialGradient(w * 0.18, gy - 40, 10, w * 0.18, gy - 40, w * 0.6);
  lg.addColorStop(0, "#c8aa6e18"); lg.addColorStop(1, "transparent");
  ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);

  const sx = w / (LANE.x1 + 90);                 // 전장을 화면 폭에 맞춘다
  const px = (x) => x * sx;

  // 네크로멘서 본인 — 왼쪽 끝에 서 있다. **직접 안 싸운다**
  drawOne("char/necro", px(LANE.x0 - 14), gy, 62, COL.necro);

  const bar = (x, y, wdt, pct, col) => {
    ctx.fillStyle = "#000a"; ctx.fillRect(x - wdt / 2, y, wdt, 3);
    ctx.fillStyle = col; ctx.fillRect(x - wdt / 2, y, wdt * Math.max(0, pct), 3);
  };
  const HGT = { skel: 46, ghoul: 50, golem: 78 };
  for (const u of S.minions) {
    const x = px(u.x), hh = HGT[u.kind] || 46;
    drawOne("minion/" + u.kind, x, gy, hh, COL[u.kind]);
    if (u.hp < u.hpMax) bar(x, gy - hh - 7, hh * 0.6, u.hp / u.hpMax, "#7fb069");
  }
  /* 적은 **옆을 보고 왼쪽으로 온다** — 그림은 오른쪽을 보게 구웠으므로 좌우를 뒤집는다.
     안 뒤집으면 적이 뒷걸음질로 쳐들어온다. */
  for (const m of S.mobs) {
    const x = px(m.x);
    if (x > w + 40) continue;
    const hh = m.boss ? 96 : 44 + (m.r - 11) * 2;
    ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1);
    drawOne(m.kind ? "mob/" + m.kind : "mob/fallen", 0, gy, hh, m.boss ? COL.boss : COL.mob);
    ctx.restore();
    if (m.hp < m.hpMax) bar(x, gy - hh - 7, hh * 0.6, m.hp / m.hpMax, "#8b1a1a");
  }
  for (const f of S.fx) {
    const im = sprite("fx/" + (f.kind === "nova" ? "nova" : "hit"));
    ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 3));
    const hh = f.kind === "nova" ? 90 : 26;
    if (im) { ctx.imageSmoothingEnabled = false;
      ctx.drawImage(im, px(f.x) - hh / 2, gy - hh * 0.8, hh, hh); }
    else { ctx.fillStyle = f.kind === "nova" ? "#ff8000" : "#e8dcc2";
      ctx.beginPath(); ctx.arc(px(f.x), gy - 20, f.kind === "nova" ? 60 : 5, 0, 6.284); ctx.fill(); }
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
