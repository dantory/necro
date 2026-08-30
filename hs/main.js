import { dirName, drawSprite8, footMetrics, frameCount, LOAD, loadManifest, preload, tex } from "./sprite.js";
import { genFloor } from "./map.js";
import { rollItem, resetUniques, rollBuildAffix } from "./loot.js";

const cv = document.getElementById("board");
const ctx = cv.getContext("2d");
const mini = document.getElementById("mini");
const mctx = mini.getContext("2d");

const WAKE = 540;
const CULL = 1400;
const CHEST_OPEN_R = 78;
const Z = 1.5;               // 월드→화면 배율. 방을 화면에 채운다 (V-148 A)
const PLAYER_BASE = "char/necro";
// ★ 2026-08-30 02:32 병수님: 「내 캐릭터가 너무 크다, 작아도 될 듯」.
//   146 × Z(1.5) = 화면 219px — 863 짜리 화면의 25% 였다(레퍼런스 히어로시즈는 8~10%).
//   주변 잡몹(≈100px)·해골(96)보다 혼자 1.5 배라 「사람만 확대된」 그림이었다.
//   104 로 내린다 — 해골보다 살짝 크되 무리 속에 같이 서는 크기.
const PLAYER_H = 104;
const SKEL_BASE = "minion/skel";
const SKEL_H = 96;
// 칸(자리) 저울 (V-146) — 해골 1칸 · 거대 해골 3칸 · 뼈 거인 6칸.
// 등급이 오르면 «칸당» 효율이 살짝 손해다(hpMul/dmgMul 이 slot 배보다 작다). 대신 하나로
// 뭉쳐 안 죽고 안 흩어진다. atkMul>1(느린 손) · spdMul<1(무거운 발) · shake(때릴 때 흔들림).
// 수치는 tools/hs_p4.mjs 로 재서 정했다(ROADMAP V-149). ring=발밑 링 굵기.
const SKEL_TIERS = [
  { key: "skel",   scale: 1.00, slot: 1, hpMul: 1.00, dmgMul: 1.00, atkMul: 1.00, spdMul: 1.00, cleave: 0,   ring: 2.5, ringCol: "#3d78c8", shake: 0, label: "해골",      filt: null },
  { key: "giant",  scale: 1.55, slot: 3, hpMul: 3.00, dmgMul: 2.15, atkMul: 1.22, spdMul: 0.84, cleave: 60, ring: 4.0, ringCol: "#5fa0e6", shake: 4, label: "거대 해골", filt: "brightness(0.9) saturate(1.4) sepia(0.3) hue-rotate(-10deg)" },
  { key: "titan",  scale: 2.20, slot: 6, hpMul: 6.20, dmgMul: 4.30, atkMul: 1.45, spdMul: 0.74, cleave: 96, ring: 5.5, ringCol: "#8fd0ff", shake: 8, label: "뼈 거인",   filt: "brightness(0.82) saturate(1.8) sepia(0.5) hue-rotate(-18deg)" },
];
const DECOR_PRELOAD = ["decal/stain.png", "decal/crack.png", "decal/pebble.png", "decal/mud.png",
  "decor/pillar.png", "decor/column2.png", "decor/bones.png", "decor/bones2.png", "decor/urn.png",
  "decor/coffin.png", "decor/rubble.png", "decor/statue.png", "decor/brazier.png", "decor/chest.png", "decor/stairs.png"];

let VW = 0, VH = 0;
function resize() {
  VW = cv.width = window.innerWidth;
  VH = cv.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const keys = new Set();
const mouse = { x: VW / 2, y: VH / 2, down: false };
addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (["q", "e", "r", "f", " "].includes(e.key.toLowerCase())) e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
cv.addEventListener("mousemove", (e) => { const b = cv.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; });
cv.addEventListener("mousedown", (e) => { if (e.button === 0) mouse.down = true; });
addEventListener("mouseup", (e) => { if (e.button === 0) mouse.down = false; });
cv.addEventListener("contextmenu", (e) => e.preventDefault());

const cam = { x: 0, y: 0, shake: 0 };
let flash = 0, flashColor = "255,255,255";
let G = null;

// ── 프레임 프로파일러 (V-154 C) ─────────────────────────────────────────────
// fp95 가 «어디서» 드는지 재려는 계기다 — 짐작으로 손대지 않기 위해서. 단계마다
// performance.now() 를 몇 번 부를 뿐이라 오버헤드는 무시할 수준. hs_p6_run 이
// 층 끝에 window.__prof.summary() 를 함께 적어, 프레임 시간을 sim/draw/hud 와
// 그리기 하위 단계로 갈라 본다.
const PROF = {
  buf: { total: [], sim: [], draw: [], hud: [] },
  sub: {},
  mark: 0,
  seg(name) { const t = performance.now(); (this.sub[name] ||= []).push(t - this.mark); this.mark = t; },
  push(k, v) { const a = this.buf[k]; a.push(v); if (a.length > 2000) a.shift(); },
  pct(a, p) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2); },
  summary() {
    const o = { n: this.buf.total.length, phase: {}, drawSub: {} };
    for (const k of ["total", "sim", "draw", "hud"]) o.phase[k] = { p50: this.pct(this.buf[k], 0.5), p95: this.pct(this.buf[k], 0.95) };
    for (const k in this.sub) o.drawSub[k] = { p50: this.pct(this.sub[k], 0.5), p95: this.pct(this.sub[k], 0.95) };
    return o;
  },
  reset() { for (const k in this.buf) this.buf[k] = []; this.sub = {}; },
};
window.__prof = PROF;

function fresh(floor, carry) {
  const f = genFloor(floor);
  const p = carry ? carry.player : {
    maxhp: 3315, hp: 3315, maxmana: 2286, mana: 2286, spd: 268, level: 1,
    mult: { dmg: 1, body: 1, minionDmg: 1 }, uniques: new Set(), slots: 8,
    grade: 0, maxGrade: 0, levelPoints: 0,
  };
  p.x = f.startX; p.y = f.startY; p.dx = 0; p.dy = 1; p.anim = 0; p.state = "idle";
  p.spearCd = 0; p.hurt = 0;
  return {
    floor, ...f, player: p,
    minions: carry ? carry.minions.map((m) => ({ ...m, x: f.startX + (Math.random() * 80 - 40), y: f.startY + (Math.random() * 80 - 40) })) : [],
    spears: [], golds: [], items: [], corpses: [], parts: [], floats: [],
    pickLog: carry ? carry.pickLog : [], kills: carry ? carry.kills : 0, picks: carry ? carry.picks : 0,
    gold: carry ? carry.gold : 0, xp: carry ? carry.xp : 0,
    dead: false, cleared: 0, packsTotal: f.packs.length,
  };
}

function start(floor, carry) {
  G = fresh(floor, carry);
  window.G = G; window.cam = cam; window.HSZ = Z; window.SKEL_TIERS = SKEL_TIERS;
  cam.x = G.player.x - VW / (2 * Z); cam.y = G.player.y - VH / (2 * Z);
  document.getElementById("dead").style.display = "none";
}

function stepPlayer(dt) {
  const p = G.player;
  let mx = 0, my = 0;
  if (keys.has("a") || keys.has("arrowleft")) mx -= 1;
  if (keys.has("d") || keys.has("arrowright")) mx += 1;
  if (keys.has("w") || keys.has("arrowup")) my -= 1;
  if (keys.has("s") || keys.has("arrowdown")) my += 1;
  if (mx || my) {
    const l = Math.hypot(mx, my);
    mx /= l; my /= l;
    p.x = Math.max(40, Math.min(G.W - 40, p.x + mx * p.spd * dt));
    p.y = Math.max(40, Math.min(G.H - 40, p.y + my * p.spd * dt));
    p.dx = mx; p.dy = my; p.state = "walk"; p.anim += dt * 11;
  } else { p.state = "idle"; p.anim += dt * 6; }

  const tx = cam.x + mouse.x / Z, ty = cam.y + mouse.y / Z;
  p.spearCd -= dt;
  if (mouse.down && p.spearCd <= 0) {
    fireSpear(p, tx, ty);
    p.spearCd = 0.16;
  }
  if (p.mana < p.maxmana) p.mana = Math.min(p.maxmana, p.mana + 60 * dt);
  if (p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + 22 * dt);

  cam.x += (p.x - VW / (2 * Z) - cam.x) * Math.min(1, dt * 8);
  cam.y += (p.y - VH / (2 * Z) - cam.y) * Math.min(1, dt * 8);
  cam.x = Math.max(0, Math.min(G.W - VW / Z, cam.x));
  cam.y = Math.max(0, Math.min(G.H - VH / Z, cam.y));
}

function fireSpear(p, tx, ty) {
  const a = Math.atan2(ty - p.y, tx - p.x);
  const dmg = 42 * p.mult.dmg;
  const split = p.uniques.has("splitSpear");
  const angs = split ? [a - 0.16, a + 0.16] : [a];
  for (const ang of angs)
    G.spears.push({ x: p.x, y: p.y - 34, vx: Math.cos(ang) * 720, vy: Math.sin(ang) * 720, life: 1.1, dmg });
  p.dx = Math.cos(a); p.dy = Math.sin(a);
}

function handleSkills() {
  const p = G.player;
  if (keys.has("q") && !p._q) { p._q = true; raiseSkeleton(); } if (!keys.has("q")) p._q = false;
  for (let i = 0; i < 3; i++) {
    const k = "" + (i + 1);
    if (keys.has(k) && !p["_g" + k]) { p["_g" + k] = true; selectGrade(i); } if (!keys.has(k)) p["_g" + k] = false;
  }
  if (keys.has("e") && !p._e) { p._e = true; corpseNova(); } if (!keys.has("e")) p._e = false;
  if (keys.has("z") && !p._z) { p._z = true; spendPoint("slot"); } if (!keys.has("z")) p._z = false;
  if (keys.has("x") && !p._x) { p._x = true; spendPoint("grade"); } if (!keys.has("x")) p._x = false;
  if (keys.has("f") && !p._f) { p._f = true; tryStairs(); } if (!keys.has("f")) p._f = false;
  if (G.dead && keys.has("r")) start(1, null);
}

function nearestCorpse(x, y, rad) {
  let best = -1, bd = rad * rad;
  for (let i = 0; i < G.corpses.length; i++) {
    const c = G.corpses[i];
    if (c.used) continue;
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function slotsUsed() { let s = 0; for (const m of G.minions) s += m.slot; return s; }

function selectGrade(i) {
  const p = G.player;
  if (i > p.maxGrade) {
    G.floats.push({ x: p.x, y: p.y - 100, t: 1.2, txt: SKEL_TIERS[i].label + " — 아직 잠김 (X로 해금)", col: "#e0663c" });
    return;
  }
  p.grade = i;
  raiseSkeleton();
}

function raiseSkeleton() {
  const p = G.player;
  const tier = Math.min(p.grade, p.maxGrade, SKEL_TIERS.length - 1);
  const T = SKEL_TIERS[tier];
  if (slotsUsed() + T.slot > p.slots) {
    G.floats.push({ x: p.x, y: p.y - 100, t: 1.2, txt: `자리가 부족하다 (${T.label} ${T.slot}칸)`, col: "#e0663c" });
    return;
  }
  const ci = nearestCorpse(p.x, p.y, 300);
  if (ci < 0) {
    G.floats.push({ x: p.x, y: p.y - 100, t: 1.0, txt: "가까운 시체가 없다", col: "#c8a04a" });
    return;
  }
  const c = G.corpses[ci]; c.used = true;
  const hp = (200 + G.floor * 40) * T.hpMul;
  G.minions.push({ base: SKEL_BASE, x: c.x, y: c.y, hp, maxhp: hp,
    dmg: (22 + G.floor * 8) * T.dmgMul * p.mult.minionDmg, spd: 250 * T.spdMul, atkCd: 0.6 * T.atkMul,
    r: 15 * T.scale, h: SKEL_H * T.scale, tier, slot: T.slot, cleave: T.cleave, ring: T.ring, ringCol: T.ringCol, shake: T.shake,
    filt: T.filt, dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1 });
  const col = tier === 0 ? "#9fe6c8" : tier === 1 ? "#bfe08a" : "#e0b060";
  for (let i = 0; i < 12 + tier * 6; i++) burst(c.x, c.y - 20, col, 120 + tier * 50);
  if (T.shake) cam.shake = Math.max(cam.shake, T.shake);
}

function spendPoint(kind) {
  const p = G.player;
  if (p.levelPoints <= 0) {
    G.floats.push({ x: p.x, y: p.y - 100, t: 1.0, txt: "레벨업 점수가 없다", col: "#c8a04a" });
    return;
  }
  if (kind === "slot") {
    p.levelPoints--; p.slots += 1;
    G.floats.push({ x: p.x, y: p.y - 100, t: 1.4, txt: "자리 +1", col: "#7fe6a0" });
  } else if (p.maxGrade < SKEL_TIERS.length - 1) {
    p.levelPoints--; p.maxGrade++; p.grade = p.maxGrade;
    G.floats.push({ x: p.x, y: p.y - 100, t: 1.6, txt: SKEL_TIERS[p.maxGrade].label + " 해금", col: "#e8a24a" });
  } else {
    p.levelPoints--; p.mult.minionDmg *= 1.08;
    G.floats.push({ x: p.x, y: p.y - 100, t: 1.4, txt: "소환수 피해 +8%", col: "#e8a24a" });
  }
}

function corpseNova() {
  const p = G.player;
  if (p.mana < 30) return;
  const tx = cam.x + mouse.x / Z, ty = cam.y + mouse.y / Z;
  const ci = nearestCorpse(tx, ty, 200);
  if (ci < 0) return;
  p.mana -= 30;
  const c = G.corpses[ci]; c.used = true;
  const times = p.uniques.has("doubleNova") ? 2 : 1;
  for (let t = 0; t < times; t++) explode(c.x, c.y, 150 * p.mult.dmg, 150, t * 0.09);
}

function explode(x, y, dmg, rad, delay) {
  setTimeout(() => {
    if (!G) return;
    cam.shake = Math.max(cam.shake, 14);
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * 6.283, s = 60 + Math.random() * 260;
      G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, col: "#ff7a3c", r: 3 + Math.random() * 3 });
    }
    G.floats.push({ x, y: y - 30, t: 0.9, txt: "", ring: rad });
    forEachEnemy((m) => {
      if ((m.x - x) ** 2 + (m.y - y) ** 2 < rad * rad) hurtEnemy(m, dmg, (m.x - x), (m.y - y));
    });
  }, (delay || 0) * 1000);
}

function forEachEnemy(fn) {
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) fn(m, pk);
}

function wakePacks() {
  const p = G.player;
  for (const pk of G.packs) {
    if (pk.awake) continue;
    if ((pk.x - p.x) ** 2 + (pk.y - p.y) ** 2 < WAKE * WAKE) pk.awake = true;
  }
}

function stepEnemies(dt) {
  const p = G.player;
  for (const pk of G.packs) {
    if (!pk.awake) continue;
    let live = 0;
    for (const m of pk.enemies) {
      if (!m.alive) continue;
      live++;
      if (m.stun > 0) { m.stun -= dt; m.hit = Math.max(0, m.hit - dt); continue; }
      let tx = p.x, ty = p.y, td = (p.x - m.x) ** 2 + (p.y - m.y) ** 2;
      for (const s of G.minions) {
        const d = (s.x - m.x) ** 2 + (s.y - m.y) ** 2;
        if (d < td) { td = d; tx = s.x; ty = s.y; }
      }
      const dist = Math.sqrt(td) || 1;
      m.dx = (tx - m.x) / dist; m.dy = (ty - m.y) / dist;
      m.atk -= dt; m.hit = Math.max(0, m.hit - dt);
      if (dist > m.r + 30) {
        m.x += m.dx * m.spd * dt; m.y += m.dy * m.spd * dt;
        m.state = "walk"; m.anim += dt * 9;
      } else {
        m.state = "attack"; m.anim += dt * 9;
        if (m.atk <= 0) {
          m.atk = 0.9;
          if (tx === p.x && ty === p.y) hurtPlayer(m.dmg);
          else { const s = G.minions.find((s) => s.x === tx && s.y === ty); if (s) { s.hp -= m.dmg; if (s.hp <= 0) killMinion(s); } }
        }
      }
      if (m.kb.x || m.kb.y) { m.x += m.kb.x * dt; m.y += m.kb.y * dt; m.kb.x *= 0.86; m.kb.y *= 0.86; if (Math.abs(m.kb.x) < 4) m.kb.x = 0; if (Math.abs(m.kb.y) < 4) m.kb.y = 0; }
    }
    if (live === 0 && !pk.done) { pk.done = true; G.cleared++; markRoomCleared(pk.room); }
  }
}

function markRoomCleared(ri) {
  const any = G.packs.some((pk) => pk.room === ri && !pk.done);
  if (!any && G.rooms[ri]) G.rooms[ri].cleared = true;
}

// ── 소환수 대형 (V-154 A) ───────────────────────────────────────────────────
// 옛 로직은 적이 없으면 소환수를 «플레이어 90px 안»으로만 몰아, 21마리가 발밑에
// 겹쳐 «군세»가 아니라 «얼룩»으로 보였다(run_end 컷). 이제 각자 «제자리»가 있다 —
// 플레이어 뒤·둘레의 여러 겹 줄. 뒤부터 채워 플레이어가 선두에 서고, 수가 늘면
// 반경이 커져 무리가 퍼진다. 세로는 눌러(0.64) 위에서 내려다본 결을 맞춘다. 마지막에
// 서로 밀어내(separation) 완전히 포개지지 않게 한다.
let formAng = Math.PI / 2;
function angTo(target, cur) { let d = (target - cur) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }
function minionRingRadius(r) { return 34 + r * 40; }
function minionRingCap(r) { return Math.max(3, Math.floor(2 * Math.PI * minionRingRadius(r) / 40)); }
function formSpot(p, i, backAng) {
  let r = 1, base = 0, cap = minionRingCap(1);
  while (i >= base + cap) { base += cap; r++; cap = minionRingCap(r); }
  const k = i - base;
  const rad = minionRingRadius(r);
  const ang = backAng + ((k + (r % 2) * 0.5) / cap) * Math.PI * 2;
  return { x: p.x + Math.cos(ang) * rad, y: p.y + Math.sin(ang) * rad * 0.64 };
}
function separateMinions() {
  const a = G.minions, n = a.length, MIN = 34;
  for (let i = 0; i < n; i++) {
    const s = a[i];
    for (let j = i + 1; j < n; j++) {
      const t = a[j];
      const dx = t.x - s.x, dy = t.y - s.y, d2 = dx * dx + dy * dy;
      if (d2 === 0) { t.x += 0.5; continue; }
      if (d2 >= MIN * MIN) continue;
      const d = Math.sqrt(d2), push = (MIN - d) * 0.5 / d;
      s.x -= dx * push; s.y -= dy * push; t.x += dx * push; t.y += dy * push;
    }
  }
}
function stepMinions(dt) {
  const p = G.player;
  if (p.state === "walk" && (p.dx || p.dy)) formAng += angTo(Math.atan2(p.dy, p.dx), formAng) * Math.min(1, dt * 6);
  const backAng = formAng + Math.PI;
  const N = G.minions.length;
  for (let i = 0; i < N; i++) {
    const s = G.minions[i];
    let target = null, bd = 520 * 520;
    forEachEnemy((m) => { const d = (m.x - s.x) ** 2 + (m.y - s.y) ** 2; if (d < bd) { bd = d; target = m; } });
    s.atk = Math.max(0, s.atk - dt);
    if (target) {
      const d = Math.sqrt(bd) || 1;
      s.dx = (target.x - s.x) / d; s.dy = (target.y - s.y) / d;
      if (d > s.r + target.r + 6) { s.x += s.dx * s.spd * dt; s.y += s.dy * s.spd * dt; s.state = "walk"; s.anim += dt * 10; }
      else {
        s.state = "attack"; s.anim += dt * 10;
        if (s.atk <= 0) {
          s.atk = s.atkCd || 0.6;
          if (s.cleave) forEachEnemy((m) => { if ((m.x - s.x) ** 2 + (m.y - s.y) ** 2 < s.cleave * s.cleave) hurtEnemy(m, s.dmg, m.x - s.x, m.y - s.y); });
          else hurtEnemy(target, s.dmg, s.dx, s.dy);
          if (s.shake) cam.shake = Math.max(cam.shake, s.shake);
        }
      }
    } else {
      const spot = formSpot(p, i, backAng);
      const dx = spot.x - s.x, dy = spot.y - s.y, dd = Math.hypot(dx, dy);
      if (dd > 12) { s.dx = dx / dd; s.dy = dy / dd; const step = Math.min(dd, s.spd * dt); s.x += s.dx * step; s.y += s.dy * step; s.state = "walk"; s.anim += dt * 10; }
      else { s.state = "idle"; s.anim += dt * 5; }
    }
  }
  separateMinions();
}

function killMinion(s) { const i = G.minions.indexOf(s); if (i >= 0) G.minions.splice(i, 1); }

function stepSpears(dt) {
  for (const sp of G.spears) {
    sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.life -= dt;
    if (sp.life <= 0) { sp.dead = true; continue; }
    forEachEnemy((m) => {
      if (sp.dead) return;
      if ((m.x - sp.x) ** 2 + (m.y - (sp.y)) ** 2 < (m.r + 10) ** 2) {
        hurtEnemy(m, sp.dmg, sp.vx, sp.vy);
        sp.dead = true;
      }
    });
  }
  G.spears = G.spears.filter((s) => !s.dead);
}

function hurtEnemy(m, dmg, dx, dy) {
  m.hp -= dmg; m.hit = 0.18; m.stun = 0.05;
  const l = Math.hypot(dx, dy) || 1;
  m.kb.x += (dx / l) * 240; m.kb.y += (dy / l) * 240;
  floatDmg(m.x, m.y - m.h * 0.7, Math.round(dmg), m.elite ? "#ffd060" : "#ffffff");
  for (let i = 0; i < 4; i++) burst(m.x, m.y - m.h * 0.4, "#c0303a", 90);
  if (m.hp <= 0) killEnemy(m);
}

function killEnemy(m) {
  m.alive = false;
  G.kills++;
  G.xp += m.elite ? 40 : 10;
  if (G.xp >= G.player.level * 500) {
    G.player.level++; G.player.levelPoints++;
    G.floats.push({ x: G.player.x, y: G.player.y - 108, t: 1.8, txt: `레벨 ${G.player.level} — Z 자리 / X 등급`, col: "#e8cf52" });
  }
  cam.shake = Math.max(cam.shake, m.elite ? 10 : 5);
  for (let i = 0; i < (m.elite ? 16 : 9); i++) burst(m.x, m.y - m.h * 0.4, "#e8e2d2", 150);
  addCorpse(m);
  dropLoot(m);
}

function addCorpse(m) {
  G.corpses.push({ x: m.x, y: m.y, base: m.base, dir: dirName(m.dx, m.dy), h: m.h, used: false, t: 0 });
  if (G.corpses.length > 200) G.corpses.shift();
  for (let i = 0; i < 3; i++) burst(m.x, m.y, "#5a1414", 40);
}

function dropLoot(m) {
  const goldMul = G.player.uniques.has("goldRush") ? 2 : 1;
  const gn = (m.gold[0] + ((Math.random() * (m.gold[1] - m.gold[0] + 1)) | 0)) * goldMul;
  const grains = Math.min(15, Math.max(5, Math.round(gn / 3)));
  for (let i = 0; i < grains; i++) {
    const a = Math.random() * 6.283, s = 40 + Math.random() * 90;
    G.golds.push({ x: m.x, y: m.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, val: Math.max(1, Math.round(gn / grains)), t: 0 });
  }
  const chance = m.elite ? 1 : 0.55;
  const rolls = m.elite ? 3 : 1;
  for (let i = 0; i < rolls; i++) if (Math.random() < chance || (m.elite)) spawnItem(m.x, m.y, m.elite);
  if (m.elite || Math.random() < 0.16) dropBuild(m.x, m.y);
}

function dropBuild(x, y) {
  const item = rollBuildAffix();
  const a = Math.random() * 6.283, s = 40 + Math.random() * 70;
  G.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, item, t: 0 });
}

function spawnItem(x, y, lucky) {
  const it = rollItem(G.floor, lucky);
  const a = Math.random() * 6.283, s = 30 + Math.random() * 70;
  G.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, item: it, t: 0 });
}

function stepDrops(dt) {
  const p = G.player;
  for (const g of G.golds) {
    g.t += dt; g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= 0.86; g.vy *= 0.86;
    const d = Math.hypot(p.x - g.x, p.y - g.y);
    if (d < 60) { g.x += (p.x - g.x) * Math.min(1, dt * 14); g.y += (p.y - g.y) * Math.min(1, dt * 14); }
    if (d < 24) { g.got = true; G.gold += g.val; }
  }
  G.golds = G.golds.filter((g) => !g.got);
  for (const it of G.items) {
    it.t += dt; it.x += it.vx * dt; it.y += it.vy * dt; it.vx *= 0.8; it.vy *= 0.8;
    // 금과 같은 «자석» — 밟아서 닿기엔 30px 가 좁아 한 판에 하나도 못 줍던 것(V-147)
    const d = Math.hypot(p.x - it.x, p.y - it.y);
    if (it.t > 0.35 && d < 110) { it.x += (p.x - it.x) * Math.min(1, dt * 9); it.y += (p.y - it.y) * Math.min(1, dt * 9); }
    if (d < 46) pickItem(it);
  }
  G.items = G.items.filter((it) => !it.got);
}

function pickItem(it) {
  it.got = true;
  const p = G.player;
  if (it.item.build) {
    if (it.item.build.kind === "slot") p.slots += it.item.build.n || 1;
    else p.mult.minionDmg *= it.item.build.mul || 1.3;
    G.picks++;
    G.pickLog.unshift({ name: it.item.name, color: it.item.rarity.color, t: 3 });
    if (G.pickLog.length > 6) G.pickLog.pop();
    flash = Math.max(flash, 0.18); flashColor = it.item.build.kind === "slot" ? "127,230,160" : "232,162,74";
    G.floats.push({ x: it.x, y: it.y - 46, t: 1.6, txt: it.item.name, col: it.item.rarity.color });
    return;
  }
  p.mult.dmg *= it.item.dmg; p.mult.body *= it.item.body;
  p.maxhp = Math.round(3315 * p.mult.body); p.maxmana = Math.round(2286 * p.mult.body);
  p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.06);
  G.picks++;
  G.pickLog.unshift({ name: it.item.name, color: it.item.rarity.color, t: 3 });
  if (G.pickLog.length > 6) G.pickLog.pop();
  if (it.item.unique) {
    p.uniques.add(it.item.unique.key);
    if (it.item.unique.key === "moreSkel") p.slots += 4;
    flash = 0.5; flashColor = "216,147,74";
    G.floats.push({ x: it.x, y: it.y - 60, t: 2.2, txt: it.item.name, big: true, col: "#e8a24a" });
    G.floats.push({ x: it.x, y: it.y - 34, t: 2.2, txt: it.item.unique.note, big: false, col: "#d8b45a" });
  } else {
    G.floats.push({ x: it.x, y: it.y - 40, t: 1.0, txt: it.item.name, col: it.item.rarity.color });
  }
}

function hurtPlayer(dmg) {
  const p = G.player;
  p.hp -= dmg; p.hurt = 0.18; cam.shake = Math.max(cam.shake, 8);
  flash = Math.max(flash, 0.14); flashColor = "180,40,40";
  if (p.hp <= 0 && !G.dead) die();
}

function die() {
  G.dead = true;
  const d = document.getElementById("dead");
  d.querySelector(".dstat").textContent = `B${G.floor}층까지 · 처치 ${G.kills} · 주운 것 ${G.picks}`;
  d.style.display = "flex";
}

function tryStairs() {
  const p = G.player;
  if (Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) < 70) {
    start(G.floor + 1, {
      player: G.player, minions: G.minions, pickLog: G.pickLog,
      kills: G.kills, picks: G.picks, gold: G.gold, xp: G.xp,
    });
  }
}

function burst(x, y, col, spd) {
  if (G.parts.length > 400) return;
  const a = Math.random() * 6.283, s = spd * (0.4 + Math.random());
  G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, col, r: 2 + Math.random() * 2 });
}
function stepParts(dt) {
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; }
  G.parts = G.parts.filter((p) => p.life > 0);
}
function floatDmg(x, y, n, col) {
  if (G.floats.filter((f) => f.txt).length > 60) return;
  G.floats.push({ x: x + (Math.random() * 20 - 10), y, t: 0.8, txt: "" + n, col });
}
function stepFloats(dt) {
  for (const f of G.floats) { f.t -= dt; f.y -= (f.big ? 14 : 34) * dt; if (f.ring !== undefined) f.ring += 300 * dt; }
  G.floats = G.floats.filter((f) => f.t > 0);
}

let floorPat = null;
function onScreen(x, y, pad) { return !(x - cam.x < -pad || x - cam.x > VW / Z + pad || y - cam.y < -pad || y - cam.y > VH / Z + pad); }

function drawWorld() {
  PROF.mark = performance.now();
  ctx.fillStyle = "#050307";
  ctx.fillRect(0, 0, VW, VH);
  const shx = cam.shake ? (Math.random() * 2 - 1) * cam.shake : 0;
  const shy = cam.shake ? (Math.random() * 2 - 1) * cam.shake : 0;
  ctx.save();
  ctx.setTransform(Z, 0, 0, Z, (-cam.x + shx) * Z, (-cam.y + shy) * Z);

  const tile = tex("floor/crypt_tile.png");
  if (tile && tile.width && !floorPat) floorPat = ctx.createPattern(tile, "repeat");

  // ── 던전을 «던전으로» 그린다 — 방·복도만 바닥, 나머지는 벽/공허 (V-151 B) ──────
  // 옛 판은 화면 전체를 바닥으로 깔아 방·복도·공허가 다 같은 갈색이었다. 이제 걷는
  // 칸(방+복도)에만 바닥을 깔고 둘레에 돌벽을 세운다. 위쪽 벽은 두껍게 그려 «높이»를
  // 준다. 복도 바닥이 벽을 뚫고 지나가 문이 저절로 뚫린다. 안 밝힌 방은 어둡게 물들여
  // 「여기는 안 훑었다」가 판 위에서도 보인다(미니맵에만 있던 정보를 판에 올린다).
  const WT = 15, WTOP = 30;
  const vx = cam.x, vy = cam.y, vw = VW / Z, vh = VH / Z;
  const seen = (o, pad) => !(o.x - vx > vw + pad || o.x + o.w - vx < -pad || o.y - vy > vh + pad || o.y + o.h - vy < -pad);
  const cvis = G.corridors.filter((c) => seen(c, WT + 6));
  const rvis = G.rooms.filter((r) => seen(r, WTOP + 6));
  for (const c of cvis) stoneRim(c.x - WT, c.y - WT, c.w + 2 * WT, c.h + 2 * WT);
  for (const r of rvis) stoneRim(r.x - WT, r.y - WTOP, r.w + 2 * WT, r.h + WT + WTOP);
  for (const r of rvis) { northWall(r, WT, WTOP); sideWalls(r, WT, WTOP); }  // 네 면 다 벽 — 복도가 이 다음에 뚫는다
  for (const c of cvis) floorFill(c.x, c.y, c.w, c.h, "rgba(52,38,26,0.5)");   // 복도 바닥이 벽·북벽을 뚫어 문을 낸다
  // 방 바닥이 복도를 덮어 복도는 방 사이에만 남는다. ★ V-165 — 물들이기는 **얼룩 뒤로**
  // 미룬다(위 floorBase/floorTint 주석). 얼룩은 방 안에만 뿌려지므로(map.js `scatter`)
  // 방 바닥칠과 물들이기 사이가 정확히 그 자리다. 안 밝힌 방이 어두워질 때 얼룩도 같이
  // 잠기는 것 또한 이 순서라야 맞다 — 전에는 어둠 위에 얼룩만 훤히 떠 있었다.
  for (const r of rvis) floorBase(r.x, r.y, r.w, r.h);
  drawDecals();
  for (const r of rvis) {
    const tint = !r.visited ? "rgba(6,5,11,0.6)" : r.cleared ? "rgba(40,70,52,0.28)" : "rgba(94,66,42,0.26)";
    floorTint(r.x, r.y, r.w, r.h, tint);
    insetShadow(r);
    doorArches(r, WT);
  }
  PROF.seg("terrain");

  drawProps();
  PROF.seg("props");
  for (const c of G.corpses) {
    if (!onScreen(c.x, c.y, 120)) continue;
    ctx.globalAlpha = 0.5; ctx.fillStyle = "#3a0d0d";
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.h * 0.28, c.h * 0.14, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    drawSprite8(ctx, c.base, c.dir, "idle", 0, c.x, c.y + 4, c.h * 0.7, "grayscale(0.6) brightness(0.5)");
  }
  PROF.seg("corpses");

  drawLight();
  PROF.seg("light");

  for (const g of G.golds) { ctx.beginPath(); ctx.arc(g.x, g.y, 3, 0, 6.283); ctx.fillStyle = "#e8c84a"; ctx.fill(); }
  drawStairs();
  for (const ch of G.chests) drawChest(ch);

  const drawList = [];
  for (const s of G.minions) drawList.push({ y: s.y, fn: () => drawActor(s, SKEL_BASE), near: nearPlayer(s) });
  forEachEnemy((m) => drawList.push({ y: m.y, fn: () => drawEnemy(m), near: false }));
  drawList.sort((a, b) => a.y - b.y);
  for (const d of drawList) {
    if (d.near) ctx.globalAlpha = 0.45;   // 내 앞을 가리는 소환수는 비쳐 보이게
    d.fn();
    ctx.globalAlpha = 1;
  }
  drawPlayer();                            // 주인공은 언제나 맨 위 — 무리 속에서도 읽힌다
  for (const ch of G.chests) drawChestBeacon(ch);
  PROF.seg("actors");

  for (const sp of G.spears) {
    ctx.strokeStyle = "#dfeee0"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 0.02, sp.y - sp.vy * 0.02); ctx.stroke();
  }
  for (const p of G.parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  PROF.seg("fx");

  ctx.restore();

  if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = `rgb(${flashColor})`; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.42, VW / 2, VH / 2, VH * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);

  drawItems();
  drawFloats();
  PROF.seg("overlay");
}

function stoneRim(x, y, w, h) {
  if (floorPat) { ctx.fillStyle = floorPat; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = "rgba(26,23,22,0.94)"; ctx.fillRect(x, y, w, h);
}
// ★ V-165 — 얼룩이 «딴 데서 온 판»으로 뜨던 진짜 까닭은 색이 아니라 **층**이었다.
//   바닥은 `#241f1b` + 무늬 + **물들이기**(방마다 rgba(94,66,42,0.26) 따위) 세 겹인데,
//   `drawDecals()` 가 그 **위**에 그려져 물들이기를 혼자만 안 받았다. 그래서 바닥은
//   화면에서 R−B +22~+40 인데 얼룩만 +11~+13 — 재 보면 차이가 그대로 나온다.
//   에셋을 다시 굽거나 ctx.filter 로 덧칠할 일이 아니다(그건 분칠). **얼룩은 바닥의
//   일부이니 바닥의 물들이기 «아래»에 있어야 한다.** 그래서 바닥칠을 둘로 쪼갠다.
function floorBase(x, y, w, h) {
  ctx.fillStyle = "#241f1b"; ctx.fillRect(x, y, w, h);
  if (floorPat) { ctx.globalAlpha = 0.55; ctx.fillStyle = floorPat; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
}
function floorTint(x, y, w, h, tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
function floorFill(x, y, w, h, tint) { floorBase(x, y, w, h); floorTint(x, y, w, h, tint); }
function northWall(r, WT, WTOP) {
  const y0 = r.y - WTOP, x0 = r.x - WT, w = r.w + 2 * WT;
  const g = ctx.createLinearGradient(0, y0, 0, r.y);
  g.addColorStop(0, "rgba(88,79,68,0.96)"); g.addColorStop(0.55, "rgba(54,47,40,0.94)"); g.addColorStop(1, "rgba(18,13,10,0.96)");
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, WTOP);
  ctx.fillStyle = "rgba(150,140,122,0.45)"; ctx.fillRect(x0, y0, w, 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x0, r.y - 3, w, 4);
}
// ★ V-157 — 북쪽만 벽면이 있어서 방이 «검정 위에 뜬 바닥 섬»으로 보였다. 디아블로의 방은
//   네 면이 다 벽으로 닫혀 있어 「안에 있다」가 읽힌다. 왼쪽·오른쪽·아래도 돌 면을 세운다.
//   빛은 위에서 오므로 바깥 모서리가 밝고 방 안쪽으로 갈수록 어두워진다(북벽과 같은 결).
//   남쪽 벽은 위에서 내려다보면 «윗면»만 보이므로 안쪽이 밝고 바깥이 어둡다 — 반대로 준다.
function sideWalls(r, WT, WTOP) {
  const yTop = r.y, hh = r.h;
  for (const [x0, inner] of [[r.x - WT, r.x], [r.x + r.w, r.x + r.w + WT]]) {
    const g = ctx.createLinearGradient(x0 < r.x ? x0 : inner, 0, x0 < r.x ? inner : x0, 0);
    g.addColorStop(0, "rgba(84,76,65,0.96)"); g.addColorStop(0.6, "rgba(46,40,34,0.95)");
    g.addColorStop(1, "rgba(16,12,10,0.96)");
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, inner), yTop, WT, hh);
  }
  // 남쪽 — 벽의 윗면. 방 쪽 모서리에 밝은 선을 얹어 「여기서 벽이 시작한다」를 보인다.
  const sy = r.y + r.h, sx = r.x - WT, sw = r.w + 2 * WT;
  const gs = ctx.createLinearGradient(0, sy, 0, sy + WT);
  gs.addColorStop(0, "rgba(74,67,57,0.96)"); gs.addColorStop(1, "rgba(20,15,12,0.96)");
  ctx.fillStyle = gs; ctx.fillRect(sx, sy, sw, WT);
  ctx.fillStyle = "rgba(150,140,122,0.38)"; ctx.fillRect(sx, sy, sw, 2);
  // 좌·우 벽의 바깥 모서리에도 같은 밝은 선 — 벽 두께가 눈에 잡힌다.
  ctx.fillStyle = "rgba(150,140,122,0.30)";
  ctx.fillRect(r.x - WT, yTop, 2, hh); ctx.fillRect(r.x + r.w + WT - 2, yTop, 2, hh);
}
// 방 벽을 지나는 복도마다 입구에 돌기둥 한 쌍(문틀)을 세운다 — 「방에 들어왔다」가 느껴지게.
function doorArches(r, WT) {
  for (const c of G.corridors) {
    const cyMid = c.y + c.h / 2, cxMid = c.x + c.w / 2;
    const hitsV = cxMid > r.x - WT && cxMid < r.x + r.w + WT;
    const hitsH = cyMid > r.y - WT && cyMid < r.y + r.h + WT;
    if (c.horiz && hitsH) {
      if (Math.abs(c.x - r.x) < WT + 8 || (c.x < r.x && c.x + c.w > r.x)) post(r.x, cyMid, c.h);
      if (Math.abs(c.x + c.w - (r.x + r.w)) < WT + 8 || (c.x < r.x + r.w && c.x + c.w > r.x + r.w)) post(r.x + r.w, cyMid, c.h);
    } else if (!c.horiz && hitsV) {
      if (c.y < r.y && c.y + c.h > r.y) postH(cxMid, r.y, c.w);
      if (c.y < r.y + r.h && c.y + c.h > r.y + r.h) postH(cxMid, r.y + r.h, c.w);
    }
  }
}
function post(edgeX, cy, gap) {
  for (const s of [-1, 1]) {
    const py = cy + s * (gap / 2 + 3);
    ctx.fillStyle = "rgba(78,70,60,0.95)"; ctx.fillRect(edgeX - 5, py - 5, 10, 10);
    ctx.fillStyle = "rgba(140,130,112,0.5)"; ctx.fillRect(edgeX - 5, py - 5, 10, 2);
  }
}
function postH(cx, edgeY, gap) {
  for (const s of [-1, 1]) {
    const px = cx + s * (gap / 2 + 3);
    ctx.fillStyle = "rgba(78,70,60,0.95)"; ctx.fillRect(px - 5, edgeY - 5, 10, 10);
    ctx.fillStyle = "rgba(140,130,112,0.5)"; ctx.fillRect(px - 5, edgeY - 5, 10, 2);
  }
}
function insetShadow(r) {
  const d = 26;
  let g = ctx.createLinearGradient(0, r.y, 0, r.y + d);
  g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, d);
  g = ctx.createLinearGradient(0, r.y + r.h, 0, r.y + r.h - d);
  g.addColorStop(0, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(r.x, r.y + r.h - d, r.w, d);
  g = ctx.createLinearGradient(r.x, 0, r.x + d, 0);
  g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(r.x, r.y, d, r.h);
  g = ctx.createLinearGradient(r.x + r.w, 0, r.x + r.w - d, 0);
  g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(r.x + r.w - d, r.y, d, r.h);
}

function drawDecals() {
  for (const d of G.decals) {
    if (!onScreen(d.x, d.y, 120)) continue;
    const im = tex(d.img);
    if (!im || !im.width) continue;
    const w = d.s, h = d.s * (im.height / im.width);
    ctx.globalAlpha = d.a;
    ctx.drawImage(im, d.x - w / 2, d.y - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

// ★ V-158 — 넘어진 기둥 밑에 «검은 웅덩이»가 떠 있었다. 그림자를 그림 «파일»의 크기로
//   재고 있었는데, 구운 PNG 는 투명 여백을 달고 온다 — 여백까지 세니 폭이 부풀고,
//   바닥선(pr.y)이 실제 그림 밑동보다 아래라 그림자가 물체에서 떨어져 나갔다.
//   그림이 «실제로 찬 자리»(불투명 픽셀의 경계)를 한 번 재서 캐시하고 거기에 맞춘다.
// ★ V-160 — V-158 이 «최하단 불투명 픽셀»(y1)을 접지선으로 삼았는데, 그 자리가 실제
//   발밑보다 아래였다(넘어진 기둥 38px · 화로·항아리 ~20px). 까닭 둘, 화면에서 잰 것:
//   ① column2 는 부러진 끝이 원근으로 오른쪽-아래로 삐죽 내려가, 최하단 픽셀이 몸통이
//   아니라 그 얇은 꼬리 밑에 찍힌다. ② 화로 다리·항아리 굽 끝의 «어두운 돌»(밝기 19~44)은
//   어두운 바닥에 묻혀 눈엔 안 보이는데 알파로는 세어진다. 둘 다 그림자를 아래로 끌었다.
//   → 접지선을 «실루엣(불투명 픽셀)»의 밑변으로 잡는다. (V-163 에서 밝기 조건을 걷어냈다)
//   행별 그런 픽셀이 FOOT_VIS 개 이상인 마지막 행이 발밑. 얇은 원근 꼬리(픽셀 수 부족)와
//   어두워 안 보이는 굽(밝기 부족)이 같이 걸러진다. 화로 다리는 가장자리에 빛을 받아
//   밝은 픽셀이 발끝까지 남으므로 살아난다. 중심·폭은 그 발밑 띠(맨 아래 15%)의 보이는
//   픽셀 x 범위로 재, 원근 꼬리가 중심을 옆으로 못 끌게 한다.
//   실측(minN=4·LUM50): 기둥 -3.4px · 화로 화면에서 다리 밑 · 항아리 +2.2px (다 ≤4px).
const _footCache = new Map();
// ★★ V-163 (2026-08-30 10:08 병수님 「붕 떠 있는 건 아직도 그런 듯?」) — **밝기로 밑변을
//   잡던 것이 뜨게 만든 범인이었다.** FOOT_LUM=50 은 「어두운 픽셀은 안 보이는 것」으로 쳤는데,
//   던전 소품의 **밑동은 원래 어둡다**(화로 다리 밑 밝기 30~45). 그래서 밑변이 다리 중간으로
//   잡히고, 그림을 그 자리에 맞춰 올리니 **그림만 위로 뜨고 그림자는 제자리**에 남았다.
//   ★ 두 번 「고쳤다」고 적고도 안 고쳐진 까닭이 이것이다 — 고친 곳은 그림자였고,
//     틀린 곳은 **밑변을 정하는 자**였다([[cause-written-in-the-item-is-a-guess]]).
//   이제 밑변도 **실루엣(알파)** 으로 잡는다. 얇은 꼬리는 FOOT_VIS 개수 문턱이 거른다.
const FOOT_VIS = 4;
function spriteFoot(im, key) {
  if (_footCache.has(key)) return _footCache.get(key);
  let box = null;
  try {
    const cv = document.createElement("canvas");
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const W = im.width, H = im.height, d = g.getImageData(0, 0, W, H).data;
    const vis = new Array(H).fill(0);
    let yAlpha = -1;
    for (let y = 0; y < H; y++) {
      let v = 0;
      for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 24) { if (y > yAlpha) yAlpha = y; v++; } }
      vis[y] = v;
    }
    if (yAlpha >= 0) {
      let yb = H - 1;
      while (yb > 0 && vis[yb] < FOOT_VIS) yb--;
      if (vis[yb] < FOOT_VIS) yb = yAlpha;
      // ★ V-162 — 발밑 띠의 «폭·중심»은 **알파로** 잰다. 밝기로 거르면 어두운 다리 하나가
      //   통째로 빠져 중심이 옆으로 끌린다(화로: 다리 셋 중 왼쪽이 빠져 cx 0.625 · 폭 0.42 —
      //   그림자가 오른쪽으로 20px 밀렸다). 밝기 문턱은 «어디가 밑변인가»(yb)를 정할 때만
      //   쓰고, «얼마나 넓게 딛고 있나»는 실루엣이 답이다.
      const band = Math.max(1, Math.round(H * 0.15)), y0 = Math.max(0, yb - band + 1);
      let x0 = W, x1 = -1;
      for (let y = y0; y <= yb; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
      if (x1 >= x0) box = { cx: (x0 + x1 + 1) / 2 / W, w: (x1 + 1 - x0) / W, b: (yb + 1) / H };
    }
  } catch (e) { box = null; }
  _footCache.set(key, box);
  return box;
}

// ★★ V-160 — `PROP_WARM` 필터를 **지웠다**. 병수님 2026-08-30 08:33:
//   「에셋 픽셀랩 써서 제대로 뽑아라」. 여태 소품 아홉 장을 **찬 회색으로 굽고**
//   화면에서 sepia 로 덧칠해 왔다 — 그건 고침이 아니라 분칠이고, 밝기까지 눌러 탁해진다.
//   이제 `decor.py --warm` 이 그 색으로 **처음부터 굽는다**(구운 뒤 R−B: 기둥 −13.9→+31.1 ·
//   항아리 −27.5→+31.5 · 관 −23.2→+22.2 · 잡석 −21.0→+39.5 — 바닥 띠 +4~+32 안).
//   판정은 `tools/hs_warmcheck.py`(따뜻함 띠 · 바닥 대비 · 분홍 가드) 가 9/9 로 했다.
function drawProps() {
  const vis = G.props.filter((pr) => onScreen(pr.x, pr.y, 200));
  vis.sort((a, b) => a.y - b.y);
  for (const pr of vis) {
    const im = tex(pr.img);
    if (!im || !im.width) continue;
    const w = pr.h * (im.width / im.height);
    const fo = spriteFoot(im, pr.img);
    // ★★ V-162 — **방법을 뒤집었다.** V-158·V-160 은 그림을 파일 그대로 놓고 «그림자를
    //   그림에 맞춰 옮기는» 쪽이었다 — 그래서 잰 값이 조금만 어긋나도 그림자가 따로 논다
    //   (두 번 고치고도 화로가 20px 밀려 떠 있었다). 이제 반대다: **그림의 «보이는 밑변»을
    //   월드 바닥선(pr.y)에 맞춰 놓고**, 그림자는 그 자리(pr.x, pr.y)에 그린다.
    //   그러면 그림자는 어긋날 자리가 없다 — 정의상 발밑이다. ★ [[seam-not-values]]
    const dx = pr.x - (fo ? fo.cx * w : w / 2);          // 보이는 가로중심 → pr.x
    const dy = pr.y - (fo ? fo.b * pr.h : pr.h);         // 보이는 밑변     → pr.y
    const rx = (fo ? fo.w * w : w) * 0.34;
    // ★ V-163 — 어두운 바닥 위에서 42% 검정은 **안 보인다**(항아리는 그림자가 없는 줄 알았다).
    //   진하게 하되 번지지 않게 — 안쪽은 짙고 가장자리는 사라지는 결로.
    groundMark(pr.x, pr.y, rx, Math.max(4, Math.min(rx * 0.42, pr.h * 0.2)));
    ctx.globalAlpha = 1;
    ctx.drawImage(im, dx, dy, w, pr.h);
  }
}

function drawLight() {
  const p = G.player;
  const lg = ctx.createRadialGradient(p.x, p.y - 20, 110 / Z, p.x, p.y - 20, 520 / Z);
  lg.addColorStop(0, "rgba(0,0,0,0)");
  lg.addColorStop(0.55, "rgba(4,2,3,0.16)");
  lg.addColorStop(1, "rgba(2,1,2,0.52)");
  ctx.fillStyle = lg;
  ctx.fillRect(cam.x - 40, cam.y - 40, VW / Z + 80, VH / Z + 80);
  ctx.globalCompositeOperation = "lighter";
  warmGlow(p.x, p.y - 20, 320, 0.11);
  for (const pr of G.props) {
    if (!pr.brazier || !onScreen(pr.x, pr.y, 120)) continue;
    warmGlow(pr.x, pr.y - pr.h * 0.5, 150, 0.22);
  }
  ctx.globalCompositeOperation = "source-over";
}
function warmGlow(x, y, r, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(240,150,60,${a})`); g.addColorStop(1, "rgba(240,150,60,0)");
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function actorDir(a) { return dirName(a.dx ?? 0, a.dy ?? 1); }
function frame(a, base) { const st = a.state === "idle" ? "idle" : a.state; const n = frameCount(base, st === "attack" ? "attack" : "walk"); return st === "idle" ? 0 : Math.floor(a.anim) % n; }

// ── V-150: 편(팀)을 «스프라이트 색»으로 가른다 — 링에 기대지 않는다 ──────────
// 아군 소환수는 차가운 뼈-푸름, 적은 붉은/재빛으로 통째 물들인다. 같은 원본(해골)이
// 양쪽에 서도 멀리서 갈린다. CSS filter 한 줄을 sprite.js 의 filtered() 가 캐시하므로
// 매 프레임 값이 새로 들지 않는다. hs_p5.mjs 가 앞뒤를 같은 자로 잰다.
const ALLY_TINT  = "grayscale(0.42) sepia(0.5) hue-rotate(178deg) saturate(1.8) brightness(1.14)"; // 차가운 뼈-푸름
const FOE_TINT   = "grayscale(0.32) sepia(0.6) hue-rotate(-26deg) saturate(2) brightness(0.86)";   // 붉은 재빛
const ELITE_TINT = "grayscale(0.14) sepia(0.62) hue-rotate(-14deg) saturate(2.3) brightness(1.08)"; // 밝은 핏빛(챔피언)
const teamTintOn = () => window.__teamTint !== false;   // hs_p5 의 앞/뒤 토글
const ringsOn = () => window.__rings !== false;         // 링을 끄고 «스프라이트만으로» 갈리나 확인

// 등급 셋의 실루엣을 뼈로 덧그려 가른다(뿔·뿔관·큰 뼈도끼). 새 에셋 없이 코드로만.
// 거대 해골(tier 1) = 뿔 한 쌍 · 뼈 거인(tier 2) = 뿔관 + 큰 뼈도끼. 크기에 비례(sc).
function drawTierCrest(s, base) {
  const fm = footMetrics(base);
  const top = s.y - s.h + (fm ? s.h * fm.footFrac : 0);        // 그린 이미지의 위끝
  const headY = top + (fm ? s.h * fm.headFrac : s.h * 0.06);   // 두개골 꼭대기
  const cx = s.x, sc = s.h / SKEL_H, bone = "#ece5d2", edge = "#221a12";
  ctx.lineJoin = "round";
  if (s.tier === 1) {
    horn(cx - 6 * sc, headY + 4 * sc, -1, 15 * sc, bone, edge);
    horn(cx + 6 * sc, headY + 4 * sc, 1, 15 * sc, bone, edge);
  } else if (s.tier >= 2) {
    horn(cx - 12 * sc, headY + 3 * sc, -1, 16 * sc, bone, edge);
    horn(cx - 5 * sc, headY - 2 * sc, -0.5, 19 * sc, bone, edge);
    horn(cx + 5 * sc, headY - 2 * sc, 0.5, 19 * sc, bone, edge);
    horn(cx + 12 * sc, headY + 3 * sc, 1, 16 * sc, bone, edge);
    const shY = top + s.h * 0.32;
    horn(cx - s.h * 0.17, shY, -1, 13 * sc, bone, edge);
    horn(cx + s.h * 0.17, shY, 1, 13 * sc, bone, edge);
  }
}
function horn(x, y, dir, len, bone, edge) {
  ctx.beginPath();
  ctx.moveTo(x - 2.4, y);
  ctx.quadraticCurveTo(x + dir * 3.5, y - len * 0.6, x + dir * 3, y - len);
  ctx.quadraticCurveTo(x + dir * 5.5, y - len * 0.46, x + 2.4, y);
  ctx.closePath();
  ctx.fillStyle = bone; ctx.fill();
  ctx.lineWidth = 1.3; ctx.strokeStyle = edge; ctx.stroke();
}

/* ★★ V-163 — **어두운 바닥 위에서 「검정 그림자」는 보이지 않는다.** 컷을 다시 찍어 보니
   항아리·기둥·석상에 그림자가 «없는» 줄 알았는데, 있는데 안 보이는 것이었다(바닥이 이미
   검정에 가까워 검정을 얹어도 차이가 없다). 그래서 접지를 **두 겹**으로 그린다:
     ① 어두운 코어 — 빛이 닿는 자리에서 그림자 노릇을 한다
     ② 그 **위 가장자리의 얇은 밝은 접촉선** — 물체와 바닥의 «경계»라 **빛과 무관하게** 읽힌다
   ②가 있어야 횃불 밖 어둠에서도 「땅에 닿았다」가 보인다.
   ★ 소품·사람·소환수·적 **전부** 이 하나를 쓴다 — 한쪽만 고쳐 두 번 어긋난 자리다
     ([[carry-fixes-forward]]). */
function groundMark(x, y, rx, ry) {
  ry = ry || rx * 0.4;
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, "rgba(0,0,0,0.58)"); g.addColorStop(0.68, "rgba(0,0,0,0.30)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.283); ctx.fill();
  // 접촉선 — 위 반원만. ★ 0.30/1.2px 로는 어둠에서 여전히 안 보였다(컷으로 확인).
  //   빛(drawLight)이 이 위를 덮으므로 **덮이고도 남을 만큼** 진해야 한다.
  ctx.strokeStyle = "rgba(226,198,146,0.55)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, rx * 0.92, ry * 0.92, 0, Math.PI, 0); ctx.stroke();
}

function drawShadow(x, y, w, col, lw) {
  groundMark(x, y, w);
  if (col) {
    ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = lw || 2.5;
    ctx.beginPath(); ctx.ellipse(x, y, w + 2, w * 0.4 + 1.5, 0, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// 플레이어 몸통을 가리는 자리(앞·근접)인지
function nearPlayer(s) {
  const p = G.player;
  return s.y > p.y - 6 && Math.abs(s.x - p.x) < 46 && s.y - p.y < 74;
}
// ★ V-157 — 21 마리 속에서 주인공을 찾는 근거가 «금빛 고리 하나»뿐이었다. 로브의 보라가
//   해골의 푸른빛과 명도가 비슷해 실루엣이 안 섰다. 사람에게만 얇은 밝은 테를 두른다 —
//   같은 그림을 여덟 방향으로 1.5px 밀어 흰 실루엣으로 깔고 그 위에 진짜 그림을 얹는다.
//   `filtered` 가 실루엣 한 장을 캐시하므로 프레임마다 새로 만들지 않는다.
//   순백은 스티커처럼 떠서, 발밑 고리와 같은 금빛으로 맞춘다(테가 아니라 「빛」으로 읽히게).
const RIM_OFF = [[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4], [-1, -1], [1, -1], [-1, 1], [1, 1]];
// ★ V-158 — 「금빛으로 맞췄다」고 적었지만 화면에서는 흰 스티커로 왔다. sepia 를 «흰색»에
//   먹이면 R 이 1.0 을 넘겨 잘려 나가 색이 안 남는다(1.35→1.0). 먼저 어둡게 눌러
//   여유를 준 뒤 sepia 를 태워야 금빛이 선다 — 결과 ≒ #ffd45d, 발밑 고리(#e8cf52)와 같은 급.
const RIM_FILTER = "brightness(0) invert(1) brightness(0.7) sepia(1) saturate(2.5)";
function drawPlayer() {
  const p = G.player;
  drawShadow(p.x, p.y, 34, "#e8cf52", 3);
  const st = p.state, dir = actorDir(p), fr = frame(p, PLAYER_BASE);
  ctx.globalAlpha = 0.62;
  for (const [dx, dy] of RIM_OFF)
    drawSprite8(ctx, PLAYER_BASE, dir, st, fr, p.x + dx, p.y + dy, PLAYER_H, RIM_FILTER);
  ctx.globalAlpha = 1;
  if (!drawSprite8(ctx, PLAYER_BASE, dir, st, fr, p.x, p.y, PLAYER_H, p.hurt > 0 ? "brightness(2.2)" : null))
    fallbackBlob(p.x, p.y, 146, "#cfc7b0");
}
function drawActor(s, base) {
  drawShadow(s.x, s.y, s.r, ringsOn() ? (s.ringCol || "#3d78c8") : null, s.ring || 2.5);
  const filt = teamTintOn() ? ALLY_TINT : (s.filt || null);
  if (!drawSprite8(ctx, base, actorDir(s), s.state, frame(s, base), s.x, s.y, s.h, filt))
    fallbackBlob(s.x, s.y, s.h, "#d8e8d0");
  if (teamTintOn() && s.tier > 0) drawTierCrest(s, base);
}
function drawEnemy(m) {
  drawShadow(m.x, m.y, m.r, ringsOn() ? (m.elite ? "#f0902a" : "#c0342c") : null);
  const rest = teamTintOn() ? (m.elite ? ELITE_TINT : FOE_TINT)
    : (m.elite ? "brightness(1.15) saturate(1.4) hue-rotate(-15deg)" : null);
  const filt = m.hit > 0 ? "brightness(3)" : rest;
  if (!drawSprite8(ctx, m.base, actorDir(m), m.state, frame(m, m.base), m.x, m.y, m.h, filt))
    fallbackBlob(m.x, m.y, m.h, "#8a5a5a");
  const bw = m.r * 2.2, hpf = Math.max(0, m.hp / m.maxhp);
  const by = m.y - m.h - 8;
  if (hpf < 1) {
    ctx.fillStyle = "#000a"; ctx.fillRect(m.x - bw / 2 - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = m.elite ? "#e8cf52" : "#b0342e"; ctx.fillRect(m.x - bw / 2, by, bw * hpf, 4);
  }
  if (m.elite) {
    ctx.save(); ctx.translate(m.x, by - 5); ctx.scale(1 / Z, 1 / Z);
    ctx.fillStyle = "#8ac06a"; ctx.font = "10px 'Times New Roman',serif"; ctx.textAlign = "center";
    ctx.fillText("CHAMPION", 0, 0); ctx.restore();
  }
}
function fallbackBlob(x, y, h, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y - h * 0.35, h * 0.18, h * 0.35, 0, 0, 6.283); ctx.fill(); }

// ★★ V-164 (2026-08-30) — **코드로 그리던 계단을 구운 그림으로 되돌린다.**
//   병수님 08:33: 「에셋 픽셀랩 써서 제대로 뽑아라 … fillRect 로 그리거나 로컬로 만들어
//   바로 적용 금지」. V-160·V-162 는 굽기가 네 번 실패하자 **코드 사다리꼴**로 도망쳤는데,
//   컷을 열어 보면 그것이 문제였다 — 벡터로 그린 매끈한 사다리꼴이 **픽셀 바닥 위에서
//   혼자 안티에일리어싱**돼 딴 그림처럼 뜬다. 「구멍으로 읽히나」이전에 **결이 다르다.**
//
//   굽기가 실패한 까닭은 프롬프트였다: 길고 부정어가 열두 개 ([[pixellab-side-attack-failures]]).
//   낱말을 줄이고 결을 넷으로 갈라 한꺼번에 구우니(`tmp/stair_bake.py`) 넷 다 나왔고,
//   그중 **「A BLACK PIT in warm brown stone floor」**(= 어둠을 주어로 맨 앞에 세운 것)가
//   따뜻한 돌 테두리를 두른 검은 구멍 + 내려가는 디딤판으로 왔다. R−B +24 — 바닥 띠
//   (+3.7~+31.7) 안이라 **필터가 필요 없다.**
//
//   ★ 계단은 **바닥에 뚫린 구멍**이다. 소품처럼 발밑을 맞추지 않고(서 있는 것이 아니다)
//     그림 한가운데를 s.x,s.y 에 놓는다. 그림자도 없다 — 구멍은 그늘을 지지 않는다.
const STAIR_H = 104;
function drawStairs() {
  const s = G.stairs;
  const im = tex("decor/stairs.png");
  if (im && im.width) {
    const w = STAIR_H * (im.width / im.height);
    ctx.drawImage(im, s.x - w / 2, s.y - STAIR_H / 2, w, STAIR_H);
  }
  const near = Math.hypot(G.player.x - s.x, G.player.y - s.y) < 70;
  ctx.fillStyle = near ? "#bfe8c8" : "#6a9a7a"; ctx.font = "13px 'Times New Roman',serif"; ctx.textAlign = "center";
  // V-166: 그림이 «계단»이 아니라 뚜껑문이라 이름을 그림에 맞춘다(픽셀랩이 위에서 본
  // 내려가는 계단을 여덟 번 못 그렸다 — 그릴 수 있는 물건으로 바꾼 것).
  ctx.fillText(near ? "▼ F — 다음 층" : "▼ 아래로", s.x, s.y - STAIR_H / 2 - 10);
}

// 궤짝은 «바닥에» 그려져 유닛에 가린다(V-154 B: 좀비 몸에 묻혀 동전만 했다). 몸통을
// 키우고(반너비 28·높이 34), 빛무리를 넓혀 밝힌다. 위치 표식(빛기둥·마름모)은 유닛을
// 다 그린 뒤 drawChestBeacon 이 얹어, 무엇에 가려도 어디 있는지 보인다.
function drawChest(ch) {
  if (ch.opened) {
    ctx.fillStyle = "#160e07"; ctx.fillRect(ch.x - 26, ch.y - 16, 52, 9);
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(ch.x - 26, ch.y - 8, 52, 16);
    return;
  }
  if (Math.hypot(G.player.x - ch.x, G.player.y - ch.y) < CHEST_OPEN_R) openChest(ch);
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 320);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(ch.x, ch.y - 12, 0, ch.x, ch.y - 12, 130);
  g.addColorStop(0, `rgba(248,210,110,${0.22 + pulse * 0.22})`);
  g.addColorStop(0.5, `rgba(232,150,60,${0.10 + pulse * 0.10})`);
  g.addColorStop(1, "rgba(240,200,90,0)");
  ctx.fillStyle = g; ctx.fillRect(ch.x - 130, ch.y - 142, 260, 260);
  ctx.globalCompositeOperation = "source-over";
  // 옆에 선 화로·관·항아리는 전부 구운 픽셀아트인데 **상자만 fillRect** 여서, 던전에서
  // 제일 눈에 띄어야 할 것이 제일 싸구려로 보였다(V-155). 소품과 같은 길로 그린다.
  // 그림이 아직 없으면 옛 네모로 떨어진다 — 에셋 하나 때문에 상자가 사라지면 안 된다.
  const bh = 34;
  const im = tex("decor/chest.png");
  if (im && im.width) {
    const h = 62, w = h * (im.width / im.height);
    // ★★ V-170 — 상자만 «그림 밑변»을 바닥선에 놓고 있었다. `chest.png` 는 아래에 투명
    //   여백이 8px(14.3%) 있어서, 그림자는 ch.y 에 찍히는데 궤짝은 그 위 **8.9px 에 떠
    //   있었다.** 소품은 V-162 에 이미 «보이는 밑변»으로 고쳤는데 상자에 안 옮겼다.
    //   ★ [[carry-fixes-forward]] — 소품·상자 둘 다 같은 `spriteFoot` 길로 그린다.
    const fo = spriteFoot(im, "decor/chest.png");
    const dx = ch.x - (fo ? fo.cx * w : w / 2);
    const dy = ch.y - (fo ? fo.b * h : h);
    const rx = (fo ? fo.w * w : w) * 0.34;
    groundMark(ch.x, ch.y, rx, Math.max(4, Math.min(rx * 0.42, h * 0.2)));
    ctx.globalAlpha = 1;
    ctx.drawImage(im, dx, dy, w, h);
    return;
  }
  const bw = 28;
  ctx.fillStyle = "#4a3113"; ctx.fillRect(ch.x - bw, ch.y - bh, bw * 2, bh);
  ctx.fillStyle = "#7a5220"; ctx.fillRect(ch.x - bw, ch.y - bh, bw * 2, bh * 0.4);
  ctx.fillStyle = "#5a3c18"; ctx.fillRect(ch.x - bw, ch.y - bh * 0.6, bw * 2, bh * 0.6);
  ctx.fillStyle = "#d8b45a"; ctx.fillRect(ch.x - bw, ch.y - bh, bw * 2, 3);
  ctx.fillStyle = "#d8b45a"; ctx.fillRect(ch.x - bw, ch.y - bh * 0.62, bw * 2, 4);
  ctx.fillStyle = "#e8c860"; ctx.fillRect(ch.x - 5, ch.y - bh * 0.6 - 3, 10, 12);
  ctx.fillStyle = "#3a2405"; ctx.fillRect(ch.x - 2, ch.y - bh * 0.6 + 1, 4, 4);
  ctx.strokeStyle = "#241505"; ctx.lineWidth = 2.5; ctx.strokeRect(ch.x - bw, ch.y - bh, bw * 2, bh);
}
function drawChestBeacon(ch) {
  if (ch.opened || !onScreen(ch.x, ch.y, 180)) return;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 320);
  ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createLinearGradient(0, ch.y - 170, 0, ch.y - 6);
  beam.addColorStop(0, "rgba(248,214,120,0)");
  beam.addColorStop(1, `rgba(248,210,120,${0.10 + pulse * 0.13})`);
  ctx.fillStyle = beam;
  const bw = 13 + pulse * 5;
  ctx.fillRect(ch.x - bw, ch.y - 170, bw * 2, 164);
  ctx.globalCompositeOperation = "source-over";
  const by = ch.y - 104 - Math.sin(performance.now() / 300) * 6;
  ctx.save(); ctx.translate(ch.x, by); ctx.rotate(Math.PI / 4);
  const s = 8;
  ctx.fillStyle = `rgba(255,242,190,${0.72 + pulse * 0.28})`; ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.strokeStyle = "#7a4e10"; ctx.lineWidth = 1.6; ctx.strokeRect(-s, -s, s * 2, s * 2);
  ctx.restore();
}
function openChest(ch) {
  ch.opened = true;
  const n = 3 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) spawnItem(ch.x, ch.y - 6, Math.random() < 0.3);
  for (let i = 0; i < 8; i++) G.golds.push({ x: ch.x, y: ch.y, vx: (Math.random() * 2 - 1) * 90, vy: (Math.random() * 2 - 1) * 90, val: 8, t: 0 });
  flash = Math.max(flash, 0.12); flashColor = "216,180,90";
}

function drawItems() {
  ctx.textAlign = "center";
  const sorted = [...G.items].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed = [];
  for (const it of sorted) {
    const sx = (it.x - cam.x) * Z, sy = (it.y - cam.y) * Z;
    if (sx < -40 || sx > VW + 40 || sy < -20 || sy > VH + 20) continue;
    let ly = sy, moved = true, guard = 0;
    while (moved && guard++ < 24) {
      moved = false;
      for (const q of placed) {
        if (Math.abs(q.x - sx) < 104 && Math.abs(q.ly - ly) < 18) { ly = q.ly - 18; moved = true; }
      }
    }
    if (ly < sy - 18 * 8) continue;
    placed.push({ x: sx, ly });
    drawItemLabel(it, sx, sy, ly);
  }
}
function drawItemLabel(it, sx, sy, ly) {
  const r = it.item.rarity;
  ctx.font = "13px 'Times New Roman',serif";
  const w = ctx.measureText(it.item.name).width + 16;
  if (ly < sy - 2) {
    ctx.strokeStyle = r.color + "44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sy + 4); ctx.lineTo(sx, ly + 6); ctx.stroke();
  }
  ctx.fillStyle = "rgba(6,4,4,0.86)"; ctx.fillRect(sx - w / 2, ly - 10, w, 16);
  ctx.strokeStyle = r.color + "88"; ctx.lineWidth = 1; ctx.strokeRect(sx - w / 2, ly - 10, w, 16);
  ctx.fillStyle = "#e8c84a"; ctx.beginPath(); ctx.arc(sx, sy + 8, 3, 0, 6.283); ctx.fill();
  ctx.fillStyle = r.color; ctx.fillText(it.item.name, sx, ly + 2);
}
function drawFloats() {
  ctx.textAlign = "center";
  for (const f of G.floats) {
    const sx = (f.x - cam.x) * Z, sy = (f.y - cam.y) * Z;
    if (f.ring !== undefined) { ctx.globalAlpha = Math.max(0, f.t); ctx.strokeStyle = "#ff7a3c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(sx, sy + 30 * Z, f.ring * Z, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
    if (!f.txt) continue;
    ctx.globalAlpha = Math.min(1, f.t * 1.5);
    ctx.font = (f.big ? "bold 26px " : "16px ") + "'Times New Roman',serif";
    ctx.fillStyle = "#000"; ctx.fillText(f.txt, sx + 1, sy + 1);
    ctx.fillStyle = f.col || "#fff"; ctx.fillText(f.txt, sx, sy);
    ctx.globalAlpha = 1;
  }
}

const el = (id) => document.getElementById(id);
function buildBelt() {
  const rows = [["Q", "raise"], ["E", "nova"], ["R", "decrep"], ["V", ""], null,
    ["1", ""], ["2", ""], ["3", ""], ["4", ""], ["U", ""], ["T", ""], ["C", ""]];
  const belt = el("belt");
  belt.innerHTML = "";
  let row = document.createElement("div"); row.className = "beltrow"; belt.appendChild(row);
  for (const c of rows) {
    if (c === null) { row = document.createElement("div"); row.className = "beltrow"; belt.appendChild(row); continue; }
    const cell = document.createElement("div"); cell.className = "scell";
    if (c[1]) { const im = document.createElement("img"); im.src = `../assets/ui/icon/${c[1]}.png`; im.onerror = () => im.remove(); cell.appendChild(im); }
    const k = document.createElement("span"); k.className = "k"; k.textContent = c[0]; cell.appendChild(k);
    row.appendChild(cell);
  }
}
function comma(n) { return ("" + Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function updateHUD() {
  const p = G.player;
  el("hpbar").style.width = (100 * p.hp / p.maxhp) + "%";
  el("hptxt").textContent = `${Math.round(p.hp)} / ${p.maxhp}`;
  el("mpbar").style.width = (100 * p.mana / p.maxmana) + "%";
  el("mptxt").textContent = `${Math.round(p.mana)} / ${p.maxmana}`;
  el("lvl").textContent = p.level;
  el("gold").textContent = comma(G.gold);
  el("xp").textContent = comma(G.xp);
  el("xpbar").style.width = ((G.xp % 500) / 5) + "%";
  el("mult").innerHTML = `피해 <b>×${p.mult.dmg.toFixed(2)}</b> · 몸 <b>×${p.mult.body.toFixed(2)}</b>`;
  el("region1").textContent = "Crypt of the Dead";
  el("region2").textContent = `Level B${G.floor}`;
  el("region3").textContent = G.floor < 2 ? "Nightmare" : "Hell";
  el("region4").textContent = `Zone Level ${G.floor * 40 + 42}`;
  el("cleared").textContent = `방 ${G.cleared} / ${G.rooms.length - 1} · 처치 ${G.kills}`;
  const used = slotsUsed();
  const slotsEl = el("slots");
  slotsEl.textContent = `자리 ${used} / ${p.slots}`;
  slotsEl.classList.toggle("full", used >= p.slots);
  const gnames = SKEL_TIERS.slice(0, p.maxGrade + 1).map((t, i) => (i === p.grade ? "▸" : "") + t.label).join(" · ");
  el("enh").textContent = `등급 ${gnames}` + (p.mult.minionDmg > 1.001 ? ` · 피해 ×${p.mult.minionDmg.toFixed(2)}` : "") + (p.levelPoints ? ` · 점수 ${p.levelPoints}` : "");
  const log = el("picklog");
  log.innerHTML = "";
  for (const e of G.pickLog) { if (e.t <= 0) continue; const d = document.createElement("div"); d.style.color = e.color; d.textContent = e.name; d.style.opacity = Math.min(1, e.t); log.appendChild(d); }
  drawMini();
}
function drawMini() {
  const w = mini.width, h = mini.height;
  mctx.clearRect(0, 0, w, h);
  const sx = w / G.W, sy = h / G.H;
  mctx.strokeStyle = "#3a2a1a"; mctx.lineWidth = 1;
  for (const r of G.rooms) {
    mctx.fillStyle = r.visited ? (r.cleared ? "rgba(90,150,110,0.5)" : "rgba(150,120,70,0.45)") : "rgba(60,50,40,0.25)";
    mctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
    mctx.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  }
  for (const pk of G.packs) if (!pk.done && pk.enemies.some((e) => e.alive)) { mctx.fillStyle = "#c8443a"; mctx.beginPath(); mctx.arc(pk.x * sx, pk.y * sy, 2, 0, 6.283); mctx.fill(); }
  for (const ch of G.chests) if (!ch.opened) {
    const pr = 0.5 + 0.5 * Math.sin(performance.now() / 320), d = 2.2 + pr;
    mctx.save(); mctx.translate(ch.x * sx, ch.y * sy); mctx.rotate(Math.PI / 4);
    mctx.fillStyle = "#ffd24a"; mctx.fillRect(-d, -d, d * 2, d * 2);
    mctx.restore();
  }
  mctx.fillStyle = "#7fe6a0"; mctx.beginPath(); mctx.arc(G.stairs.x * sx, G.stairs.y * sy, 3, 0, 6.283); mctx.fill();
  mctx.fillStyle = "#fff"; mctx.beginPath(); mctx.arc(G.player.x * sx, G.player.y * sy, 2.5, 0, 6.283); mctx.fill();
}

function markVisited() {
  const p = G.player;
  for (const r of G.rooms) if (p.x > r.x - 80 && p.x < r.x + r.w + 80 && p.y > r.y - 80 && p.y < r.y + r.h + 80) r.visited = true;
}

let last = performance.now();
let loadingDone = false;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!loadingDone) {
    const pct = LOAD.total ? Math.round(100 * LOAD.done / LOAD.total) : 0;
    el("loadbar").style.width = pct + "%";
    if (LOAD.total > 20 && LOAD.done >= LOAD.total) { loadingDone = true; el("loading").style.display = "none"; }
    requestAnimationFrame(loop); return;
  }
  const _t0 = performance.now();
  if (!G.dead) {
    stepPlayer(dt); handleSkills(); wakePacks();
    stepEnemies(dt); stepMinions(dt); stepSpears(dt); stepDrops(dt);
    stepParts(dt); stepFloats(dt); markVisited();
    for (const e of G.pickLog) e.t -= dt;
  } else { handleSkills(); }
  cam.shake *= 0.86; if (cam.shake < 0.4) cam.shake = 0;
  flash = Math.max(0, flash - dt * 1.4);
  const _t1 = performance.now();
  drawWorld();
  const _t2 = performance.now();
  updateHUD();
  const _t3 = performance.now();
  PROF.push("sim", _t1 - _t0); PROF.push("draw", _t2 - _t1); PROF.push("hud", _t3 - _t2); PROF.push("total", _t3 - _t0);
  requestAnimationFrame(loop);
}

(async function boot() {
  await loadManifest();
  resetUniques();
  preload([PLAYER_BASE, SKEL_BASE, "mob/fallen", "mob/zombie", "mob/skelarch", "mob/shaman", "mob/brute", "mob/boss"]);
  tex("floor/crypt_tile.png");
  for (const im of DECOR_PRELOAD) tex(im);
  buildBelt();
  start(1, null);
  requestAnimationFrame(loop);
})();
