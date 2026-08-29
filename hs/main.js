import { dirName, drawSprite8, footMetrics, frameCount, LOAD, loadManifest, preload, tex } from "./sprite.js";
import { genFloor } from "./map.js";
import { rollItem, resetUniques } from "./loot.js";

const cv = document.getElementById("board");
const ctx = cv.getContext("2d");
const mini = document.getElementById("mini");
const mctx = mini.getContext("2d");

const WAKE = 540;
const CULL = 1400;
const PLAYER_BASE = "char/necro";
const SKEL_BASE = "minion/skel";
const SKEL_H = 96;
const SKEL_TIERS = [
  { scale: 1.00, slot: 1, hpMul: 1.0, dmgMul: 1.0, spdDrop: 0, label: "해골", filt: null },
  { scale: 1.35, slot: 2, hpMul: 2.2, dmgMul: 1.9, spdDrop: 26, label: "강화 해골", filt: "brightness(0.9) saturate(1.5) sepia(0.28) hue-rotate(-8deg)" },
  { scale: 1.70, slot: 3, hpMul: 3.6, dmgMul: 3.0, spdDrop: 52, label: "거대 해골", filt: "brightness(0.82) saturate(1.9) sepia(0.5) hue-rotate(-16deg)" },
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
    mult: { dmg: 1, body: 1 }, uniques: new Set(), slots: 8, enhance: 0,
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
  window.G = G; window.cam = cam;
  cam.x = G.player.x - VW / 2; cam.y = G.player.y - VH / 2;
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

  const tx = cam.x + mouse.x, ty = cam.y + mouse.y;
  p.spearCd -= dt;
  if (mouse.down && p.spearCd <= 0) {
    fireSpear(p, tx, ty);
    p.spearCd = 0.16;
  }
  if (p.mana < p.maxmana) p.mana = Math.min(p.maxmana, p.mana + 60 * dt);
  if (p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + 22 * dt);

  cam.x += (p.x - VW / 2 - cam.x) * Math.min(1, dt * 8);
  cam.y += (p.y - VH / 2 - cam.y) * Math.min(1, dt * 8);
  cam.x = Math.max(0, Math.min(G.W - VW, cam.x));
  cam.y = Math.max(0, Math.min(G.H - VH, cam.y));
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
  if (keys.has("e") && !p._e) { p._e = true; corpseNova(); } if (!keys.has("e")) p._e = false;
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

function raiseSkeleton() {
  const p = G.player;
  const tier = Math.min(p.enhance, SKEL_TIERS.length - 1);
  const T = SKEL_TIERS[tier];
  if (slotsUsed() + T.slot > p.slots) {
    G.floats.push({ x: p.x, y: p.y - 100, t: 1.1, txt: "자리가 없다", col: "#e0663c" });
    return;
  }
  const ci = nearestCorpse(p.x, p.y, 300);
  if (ci < 0) return;
  const c = G.corpses[ci]; c.used = true;
  const hp = (120 + G.floor * 40) * T.hpMul;
  G.minions.push({ base: SKEL_BASE, x: c.x, y: c.y, hp, maxhp: hp,
    dmg: (22 + G.floor * 8) * T.dmgMul, spd: 250 - T.spdDrop, r: 15 * T.scale, h: SKEL_H * T.scale,
    tier, slot: T.slot, filt: T.filt, dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1 });
  const col = tier === 0 ? "#9fe6c8" : tier === 1 ? "#bfe08a" : "#e0b060";
  for (let i = 0; i < 12 + tier * 5; i++) burst(c.x, c.y - 20, col, 120 + tier * 40);
}

function corpseNova() {
  const p = G.player;
  if (p.mana < 30) return;
  const tx = cam.x + mouse.x, ty = cam.y + mouse.y;
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
      else { s.state = "attack"; s.anim += dt * 10; if (s.atk <= 0) { s.atk = 0.6; hurtEnemy(target, s.dmg, s.dx, s.dy); } }
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
  m.hp -= dmg; m.hit = 0.12;
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
  if (G.xp >= G.player.level * 500) { G.player.level++; }
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
  const slot = Math.random() < 0.5;
  const item = slot
    ? { name: "+1 소환 자리", rarity: { color: "#7fe6a0" }, build: { kind: "slot" } }
    : { name: "소환수 강화 +1단계", rarity: { color: "#e8a24a" }, build: { kind: "enhance" } };
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
    if (it.item.build.kind === "slot") p.slots += 1;
    else p.enhance = Math.min(SKEL_TIERS.length - 1, p.enhance + 1);
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
function onScreen(x, y, pad) { return !(x - cam.x < -pad || x - cam.x > VW + pad || y - cam.y < -pad || y - cam.y > VH + pad); }

function drawWorld() {
  ctx.fillStyle = "#070406";
  ctx.fillRect(0, 0, VW, VH);
  const sx = -cam.x + (cam.shake ? (Math.random() * 2 - 1) * cam.shake : 0);
  const sy = -cam.y + (cam.shake ? (Math.random() * 2 - 1) * cam.shake : 0);
  ctx.save();
  ctx.translate(sx, sy);

  const tile = tex("floor/crypt_tile.png");
  if (tile && tile.width && !floorPat) floorPat = ctx.createPattern(tile, "repeat");

  ctx.fillStyle = "#241f1b"; ctx.fillRect(cam.x, cam.y, VW, VH);
  if (floorPat) { ctx.globalAlpha = 0.5; ctx.fillStyle = floorPat; ctx.fillRect(cam.x, cam.y, VW, VH); ctx.globalAlpha = 1; }
  ctx.fillStyle = "rgba(8,5,6,0.34)"; ctx.fillRect(cam.x, cam.y, VW, VH);

  for (const c of G.corridors) {
    if (c.x - cam.x > VW || c.x + c.w - cam.x < 0 || c.y - cam.y > VH || c.y + c.h - cam.y < 0) continue;
    if (floorPat) { ctx.fillStyle = floorPat; ctx.fillRect(c.x, c.y, c.w, c.h); }
    ctx.fillStyle = "rgba(78,52,32,0.36)"; ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  for (const r of G.rooms) {
    if (r.x - cam.x > VW || r.x + r.w - cam.x < 0 || r.y - cam.y > VH || r.y + r.h - cam.y < 0) continue;
    if (floorPat) { ctx.fillStyle = floorPat; ctx.fillRect(r.x, r.y, r.w, r.h); }
    ctx.fillStyle = r.cleared ? "rgba(44,74,52,0.36)" : "rgba(100,68,42,0.42)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    insetShadow(r);
    ctx.strokeStyle = "#140b08"; ctx.lineWidth = 6; ctx.strokeRect(r.x, r.y, r.w, r.h);
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
  drawList.push({ y: G.player.y, fn: drawPlayer });
  for (const s of G.minions) drawList.push({ y: s.y, fn: () => drawActor(s, SKEL_BASE) });
  forEachEnemy((m) => drawList.push({ y: m.y, fn: () => drawEnemy(m) }));
  drawList.sort((a, b) => a.y - b.y);
  for (const d of drawList) d.fn();

  for (const sp of G.spears) {
    ctx.strokeStyle = "#dfeee0"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 0.02, sp.y - sp.vy * 0.02); ctx.stroke();
  }
  for (const p of G.parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;

  drawItems();
  drawFloats();
  ctx.restore();

  if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = `rgb(${flashColor})`; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.42, VW / 2, VH / 2, VH * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
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
  const lg = ctx.createRadialGradient(p.x, p.y - 20, 110, p.x, p.y - 20, 520);
  lg.addColorStop(0, "rgba(0,0,0,0)");
  lg.addColorStop(0.55, "rgba(4,2,3,0.16)");
  lg.addColorStop(1, "rgba(2,1,2,0.52)");
  ctx.fillStyle = lg;
  ctx.fillRect(cam.x - 40, cam.y - 40, VW + 80, VH + 80);
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

function drawShadow(x, y, w) { ctx.globalAlpha = 0.4; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.4, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }

function drawPlayer() {
  const p = G.player;
  drawShadow(p.x, p.y, 34);
  const st = p.state;
  if (!drawSprite8(ctx, PLAYER_BASE, actorDir(p), st, frame(p, PLAYER_BASE), p.x, p.y, 146, p.hurt > 0 ? "brightness(2.2)" : null))
    fallbackBlob(p.x, p.y, 146, "#cfc7b0");
}
function drawActor(s, base) {
  drawShadow(s.x, s.y, s.r);
  if (!drawSprite8(ctx, base, actorDir(s), s.state, frame(s, base), s.x, s.y, s.h, s.filt || null))
    fallbackBlob(s.x, s.y, s.h, "#d8e8d0");
}
function drawEnemy(m) {
  drawShadow(m.x, m.y, m.r);
  const filt = m.hit > 0 ? "brightness(3)" : (m.elite ? "brightness(1.15) saturate(1.4) hue-rotate(-15deg)" : null);
  if (!drawSprite8(ctx, m.base, actorDir(m), m.state, frame(m, m.base), m.x, m.y, m.h, filt))
    fallbackBlob(m.x, m.y, m.h, "#8a5a5a");
  const bw = m.r * 2.2, hpf = Math.max(0, m.hp / m.maxhp);
  const by = m.y - m.h - 8;
  if (hpf < 1) {
    ctx.fillStyle = "#000a"; ctx.fillRect(m.x - bw / 2 - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = m.elite ? "#e8cf52" : "#b0342e"; ctx.fillRect(m.x - bw / 2, by, bw * hpf, 4);
  }
  if (m.elite) { ctx.fillStyle = "#8ac06a"; ctx.font = "10px 'Times New Roman',serif"; ctx.textAlign = "center"; ctx.fillText("CHAMPION", m.x, by - 5); }
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
  if (ch.opened) { ctx.fillStyle = "#2a1c10"; ctx.fillRect(ch.x - 16, ch.y - 10, 32, 18); return; }
  const near = Math.hypot(G.player.x - ch.x, G.player.y - ch.y) < 60;
  if (near && !ch.opened) openChest(ch);
  ctx.fillStyle = "#6a4a1e"; ctx.fillRect(ch.x - 18, ch.y - 16, 36, 24);
  ctx.fillStyle = "#c8a04a"; ctx.fillRect(ch.x - 18, ch.y - 8, 36, 4);
  ctx.strokeStyle = "#2a1a0c"; ctx.lineWidth = 2; ctx.strokeRect(ch.x - 18, ch.y - 16, 36, 24);
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
    if (!onScreen(it.x, it.y, 160)) continue;
    let ly = it.y, moved = true, guard = 0;
    while (moved && guard++ < 24) {
      moved = false;
      for (const q of placed) {
        if (Math.abs(q.x - it.x) < 104 && Math.abs(q.ly - ly) < 18) { ly = q.ly - 18; moved = true; }
      }
    }
    if (ly < it.y - 18 * 8) continue;
    placed.push({ x: it.x, ly });
    drawItemLabel(it, ly);
  }
}
function drawItemLabel(it, ly) {
  const r = it.item.rarity;
  ctx.font = "13px 'Times New Roman',serif";
  const w = ctx.measureText(it.item.name).width + 16;
  if (ly < it.y - 2) {
    ctx.strokeStyle = r.color + "44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(it.x, it.y + 4); ctx.lineTo(it.x, ly + 6); ctx.stroke();
  }
  ctx.fillStyle = "rgba(6,4,4,0.86)"; ctx.fillRect(it.x - w / 2, ly - 10, w, 16);
  ctx.strokeStyle = r.color + "88"; ctx.lineWidth = 1; ctx.strokeRect(it.x - w / 2, ly - 10, w, 16);
  ctx.fillStyle = "#e8c84a"; ctx.beginPath(); ctx.arc(it.x, it.y + 8, 3, 0, 6.283); ctx.fill();
  ctx.fillStyle = r.color; ctx.fillText(it.item.name, it.x, ly + 2);
}
function drawFloats() {
  ctx.textAlign = "center";
  for (const f of G.floats) {
    if (f.ring !== undefined) { ctx.globalAlpha = Math.max(0, f.t); ctx.strokeStyle = "#ff7a3c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y + 30, f.ring, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
    if (!f.txt) continue;
    ctx.globalAlpha = Math.min(1, f.t * 1.5);
    ctx.font = (f.big ? "bold 26px " : "16px ") + "'Times New Roman',serif";
    ctx.fillStyle = "#000"; ctx.fillText(f.txt, f.x + 1, f.y + 1);
    ctx.fillStyle = f.col || "#fff"; ctx.fillText(f.txt, f.x, f.y);
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
  el("enh").textContent = `강화 ${p.enhance}단계`;
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
