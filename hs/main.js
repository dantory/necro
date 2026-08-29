import { dirName, drawSprite8, footMetrics, frameCount, LOAD, loadManifest, preload, tex } from "./sprite.js";
import { genFloor } from "./map.js";
import { rollItem, resetUniques, rollBuildAffix } from "./loot.js";

const cv = document.getElementById("board");
const ctx = cv.getContext("2d");
const mini = document.getElementById("mini");
const mctx = mini.getContext("2d");

const WAKE = 540;
const CULL = 1400;
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
  "decor/coffin.png", "decor/rubble.png", "decor/statue.png", "decor/brazier.png"];

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

function stepMinions(dt) {
  const p = G.player;
  for (const s of G.minions) {
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
      const dd = Math.hypot(p.x - s.x, p.y - s.y);
      if (dd > 90) { s.dx = (p.x - s.x) / dd; s.dy = (p.y - s.y) / dd; s.x += s.dx * s.spd * dt; s.y += s.dy * s.spd * dt; s.state = "walk"; s.anim += dt * 10; }
      else { s.state = "idle"; s.anim += dt * 5; }
    }
  }
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
  for (const r of rvis) northWall(r, WT, WTOP);           // 북쪽 벽면(돌 위) — 복도가 이 다음에 뚫는다
  for (const c of cvis) floorFill(c.x, c.y, c.w, c.h, "rgba(52,38,26,0.5)");   // 복도 바닥이 벽·북벽을 뚫어 문을 낸다
  for (const r of rvis) {                                 // 방 바닥이 복도를 덮어 복도는 방 사이에만 남는다
    const tint = !r.visited ? "rgba(6,5,11,0.6)" : r.cleared ? "rgba(40,70,52,0.28)" : "rgba(94,66,42,0.26)";
    floorFill(r.x, r.y, r.w, r.h, tint);
    insetShadow(r);
    doorArches(r, WT);
  }

  drawDecals();
  drawProps();
  for (const c of G.corpses) {
    if (!onScreen(c.x, c.y, 120)) continue;
    ctx.globalAlpha = 0.5; ctx.fillStyle = "#3a0d0d";
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.h * 0.28, c.h * 0.14, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    drawSprite8(ctx, c.base, c.dir, "idle", 0, c.x, c.y + 4, c.h * 0.7, "grayscale(0.6) brightness(0.5)");
  }

  drawLight();

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

  for (const sp of G.spears) {
    ctx.strokeStyle = "#dfeee0"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 0.02, sp.y - sp.vy * 0.02); ctx.stroke();
  }
  for (const p of G.parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;

  ctx.restore();

  if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = `rgb(${flashColor})`; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.42, VW / 2, VH / 2, VH * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);

  drawItems();
  drawFloats();
}

function stoneRim(x, y, w, h) {
  if (floorPat) { ctx.fillStyle = floorPat; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = "rgba(26,23,22,0.94)"; ctx.fillRect(x, y, w, h);
}
function floorFill(x, y, w, h, tint) {
  ctx.fillStyle = "#241f1b"; ctx.fillRect(x, y, w, h);
  if (floorPat) { ctx.globalAlpha = 0.55; ctx.fillStyle = floorPat; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
  ctx.fillStyle = tint; ctx.fillRect(x, y, w, h);
}
function northWall(r, WT, WTOP) {
  const y0 = r.y - WTOP, x0 = r.x - WT, w = r.w + 2 * WT;
  const g = ctx.createLinearGradient(0, y0, 0, r.y);
  g.addColorStop(0, "rgba(88,79,68,0.96)"); g.addColorStop(0.55, "rgba(54,47,40,0.94)"); g.addColorStop(1, "rgba(18,13,10,0.96)");
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, WTOP);
  ctx.fillStyle = "rgba(150,140,122,0.45)"; ctx.fillRect(x0, y0, w, 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x0, r.y - 3, w, 4);
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

function drawProps() {
  const vis = G.props.filter((pr) => onScreen(pr.x, pr.y, 200));
  vis.sort((a, b) => a.y - b.y);
  for (const pr of vis) {
    const im = tex(pr.img);
    if (!im || !im.width) continue;
    const w = pr.h * (im.width / im.height);
    ctx.globalAlpha = 0.42; ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y, w * 0.34, w * 0.13, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(im, pr.x - w / 2, pr.y - pr.h, w, pr.h);
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

function drawShadow(x, y, w, col, lw) {
  ctx.globalAlpha = 0.4; ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.4, 0, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
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
function drawPlayer() {
  const p = G.player;
  drawShadow(p.x, p.y, 34, "#e8cf52", 3);
  const st = p.state;
  if (!drawSprite8(ctx, PLAYER_BASE, actorDir(p), st, frame(p, PLAYER_BASE), p.x, p.y, PLAYER_H, p.hurt > 0 ? "brightness(2.2)" : null))
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

function drawStairs() {
  const s = G.stairs;
  ctx.fillStyle = "#0c0c10"; ctx.strokeStyle = "#4a7a5a"; ctx.lineWidth = 3;
  ctx.fillRect(s.x - 34, s.y - 24, 68, 48); ctx.strokeRect(s.x - 34, s.y - 24, 68, 48);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(120,200,150,${0.15 + i * 0.12})`; ctx.fillRect(s.x - 28 + i * 6, s.y - 18 + i * 9, 56 - i * 12, 8); }
  const near = Math.hypot(G.player.x - s.x, G.player.y - s.y) < 70;
  ctx.fillStyle = near ? "#bfe8c8" : "#6a9a7a"; ctx.font = "13px 'Times New Roman',serif"; ctx.textAlign = "center";
  ctx.fillText(near ? "▼ F — 다음 층" : "▼ 계단", s.x, s.y - 32);
}

function drawChest(ch) {
  if (ch.opened) {
    ctx.fillStyle = "#160e07"; ctx.fillRect(ch.x - 18, ch.y - 15, 36, 8);
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(ch.x - 18, ch.y - 8, 36, 15);
    return;
  }
  if (Math.hypot(G.player.x - ch.x, G.player.y - ch.y) < 60) openChest(ch);
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 320);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(ch.x, ch.y - 8, 0, ch.x, ch.y - 8, 72);
  g.addColorStop(0, `rgba(240,200,90,${0.14 + pulse * 0.16})`); g.addColorStop(1, "rgba(240,200,90,0)");
  ctx.fillStyle = g; ctx.fillRect(ch.x - 72, ch.y - 80, 144, 144);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#5a3c18"; ctx.fillRect(ch.x - 19, ch.y - 17, 38, 25);
  ctx.fillStyle = "#7a5220"; ctx.fillRect(ch.x - 19, ch.y - 17, 38, 9);
  ctx.fillStyle = "#d8b45a"; ctx.fillRect(ch.x - 19, ch.y - 9, 38, 3);
  ctx.fillStyle = "#e8c860"; ctx.fillRect(ch.x - 3, ch.y - 12, 6, 8);
  ctx.strokeStyle = "#241505"; ctx.lineWidth = 2; ctx.strokeRect(ch.x - 19, ch.y - 17, 38, 25);
  const sx = ch.x + Math.cos(performance.now() / 500) * 15, sy = ch.y - 22 + Math.sin(performance.now() / 400) * 6;
  ctx.globalAlpha = pulse; ctx.fillStyle = "#fff6d8";
  ctx.fillRect(sx - 1, sy - 3, 2, 6); ctx.fillRect(sx - 3, sy - 1, 6, 2); ctx.globalAlpha = 1;
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
  for (const ch of G.chests) if (!ch.opened) { mctx.fillStyle = "#e8c84a"; mctx.fillRect(ch.x * sx - 1.5, ch.y * sy - 1.5, 3, 3); }
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
  if (!G.dead) {
    stepPlayer(dt); handleSkills(); wakePacks();
    stepEnemies(dt); stepMinions(dt); stepSpears(dt); stepDrops(dt);
    stepParts(dt); stepFloats(dt); markVisited();
    for (const e of G.pickLog) e.t -= dt;
  } else { handleSkills(); }
  cam.shake *= 0.86; if (cam.shake < 0.4) cam.shake = 0;
  flash = Math.max(0, flash - dt * 1.4);
  drawWorld();
  updateHUD();
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
