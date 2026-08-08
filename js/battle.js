import { armyCap, dmgMulOf, floorDmg, floorHp, floorN, goldFor, hpMaxOf, isGate, META,
         MINIONS, mpMaxOf, S, saveMeta, SKILLS, xpNeed } from "./core.js";

/* ══ 전장은 **원형**이다 ══
   병수님: "내 캐릭터는 중앙에 있고, 사방에서 적군이 리스폰되었으면."

   처음엔 가로 한 줄로 짰다(왼쪽에 네크로멘서, 오른쪽에서 적). 그건 한 방향만 막으면
   되는 판이라 **군대를 부리는 맛이 없다** — 앞에 하나 세워 두면 그것으로 끝난다.
   가운데에 서고 사방에서 오면 그때부터 **어디를 두껍게 할까**가 매 순간 생긴다:
   소환수는 둘레에 흩어져 서고, 뚫린 쪽으로 달려가 막는다.

   좌표는 **본인을 원점(0,0)** 으로 잡는다. 카메라가 본인을 따라갈 것도 없고
   (안 움직인다), 거리 = 위험이 한 줄로 읽힌다. */
/* **판을 좁힌다.** 460 으로 두었더니 싸움은 반경 150 안에서만 벌어지는데 화면은 460 을
   담느라, 위아래가 통째로 검게 비고 인물이 콩알만 해졌다 — 볼 것이 화면의 6분의 1이었다.
   적이 걸어오는 시간은 남기되(그게 대비할 틈이다) 화면에 꽉 차게 줄인다. */
export const RING_SPAWN = 300;    // 적이 나타나는 둘레
export const RING_HOLD  = 105;    // 소환수가 진을 치는 둘레 — 본인 앞마당
export const CORE_R     = 26;     // 여기까지 들어오면 본인이 맞는다

let seq = 0;
export const say = (s) => { S.log.unshift(s); if (S.log.length > 6) S.log.pop(); };

export function enterFloor(f) {
  S.floor = f;
  S.mobs = [];
  const n = floorN(f);
  for (let i = 0; i < n; i++) spawnMob(f, i, n);
  if (isGate(f)) {
    const b = spawnMob(f, 0, 1);
    b.boss = true; b.kind = "boss"; b.hp = b.hpMax = floorHp(f) * 7;
    b.dmg = floorDmg(f) * 2.1; b.r = 22;
    say(`<b style="color:#c8aa6e">${f}층 — 관문</b> 큰 놈이 지키고 있음`);
  } else {
    say(`<b>${f}층</b> 내려감`);
  }
  S.deepest = Math.max(S.deepest, f);
}

/* 적의 **얼굴은 깊이가 정한다.** 위층은 작은 것들, 아래로 갈수록 험한 것이 섞인다 —
   층이 바뀐 게 숫자 말고 화면에서도 읽혀야 "내려가고 있다"가 성립한다. */
const MOB_TIERS = [
  { from: 1,  kinds: ["fallen"] },
  { from: 4,  kinds: ["fallen", "zombie"] },
  { from: 9,  kinds: ["fallen", "zombie", "skelarch"] },
  { from: 16, kinds: ["zombie", "skelarch", "brute"] },
  { from: 26, kinds: ["skelarch", "brute", "brute"] },
];
const mobKindFor = (f) => {
  const t = [...MOB_TIERS].reverse().find(x => f >= x.from) || MOB_TIERS[0];
  return t.kinds[Math.floor(Math.random() * t.kinds.length)];
};

/** **사방에서 나타난다.** 각도를 고르게 흩되 조금 흔든다 — 딱 등간격이면 톱니바퀴처럼
 *  보여서 살아 있는 무리로 안 읽힌다. */
function spawnMob(f, i, n) {
  const kind = mobKindFor(f);
  const a = (i / Math.max(1, n)) * 6.2832 + (Math.random() - 0.5) * 0.8;
  const rad = RING_SPAWN + Math.random() * 50;
  const m = { id: ++seq, kind, a,
              x: Math.cos(a) * rad, y: Math.sin(a) * rad,
              hp: floorHp(f), hpMax: floorHp(f),
              dmg: floorDmg(f), spd: 22 + Math.random() * 10,
              r: kind === "brute" ? 15 : kind === "fallen" ? 10 : 12, atk: 0, boss: false };
  S.mobs.push(m);
  return m;
}

export function summon(kind) {
  const K = MINIONS[kind];
  if (S.minions.length >= armyCap()) return false;
  /* **둘레에 고르게 세운다.** 사방에서 오는 판이므로 한쪽에 몰아 세우면 반대쪽이 그냥
     뚫린다. 서 있는 각도를 이미 선 것들 사이의 **제일 넓은 틈**에 꽂는다 —
     그러면 몇 기가 있든 알아서 사방이 덮인다. */
  const angs = S.minions.map(m => m.home).sort((p, q) => p - q);
  let best = Math.random() * 6.2832, gap = -1;
  for (let i = 0; i < angs.length; i++) {
    const a0 = angs[i], a1 = (angs[(i + 1) % angs.length] || a0) + (i === angs.length - 1 ? 6.2832 : 0);
    const g = a1 - a0;
    if (g > gap) { gap = g; best = a0 + g / 2; }
  }
  // 골렘은 안쪽(벽), 해골은 바깥(먼저 붙는다) — 반지름이 곧 역할이다
  const rad = RING_HOLD * (kind === "golem" ? 0.72 : kind === "ghoul" ? 0.95 : 1.15);
  S.minions.push({ id: ++seq, kind, home: best, rad,
                   x: Math.cos(best) * rad * 0.4, y: Math.sin(best) * rad * 0.4,
                   hp: K.hp, hpMax: K.hp, atk: 0, r: kind === "golem" ? 16 : 10 });
  return true;
}

/** 스킬 — **시체를 쓰는가**가 전부다. 마나만 드는 것과 시체까지 드는 것이 갈려야
 *  "시체가 자원"이 손끝에서 느껴진다. */
export function cast(id) {
  const sk = SKILLS.find(s => s.id === id);
  if (!sk || (S.cd[id] || 0) > 0 || S.mp < sk.mp || S.corpses < sk.corpse) return false;
  if (id === "golem" && S.minions.some(m => m.kind === "golem")) return false;   // 골렘은 하나뿐
  if ((id === "raise" || id === "ghoul" || id === "golem") && S.minions.length >= armyCap()) return false;

  S.mp -= sk.mp; S.corpses -= sk.corpse; S.cd[id] = sk.cd;
  if (id === "raise") { summon("skel");  say(`<b>해골 전사</b> 일어섬`); }
  if (id === "ghoul") { summon("ghoul"); say(`<b>구울</b> 일어섬`); }
  if (id === "golem") { summon("golem"); say(`<b>흙 골렘</b> 세움`); }
  if (id === "nova") {
    /* **시체 폭발** — 이 직업의 상징. 시체 하나로 앞줄을 통째로 지운다. */
    const dmg = 30 * Math.pow(1.14, S.floor) * dmgMulOf();
    let hit = 0;
    /* 시체 폭발은 **본인 둘레**를 쓸어 낸다 — 사방 판에서는 그게 "한숨 돌리는 순간"이다 */
    for (const m of S.mobs) if (Math.hypot(m.x, m.y) < 180) { m.hp -= dmg; hit++; }
    S.fx.push({ t: 0.35, x: 0, y: 0, kind: "nova" });
    say(`<b style="color:#ff8000">시체 폭발</b> ${hit}마리에 ${Math.round(dmg)}`);
  }
  if (id === "amp") { S.amp = 8; say(`<b style="color:#6a6aff">약화의 저주</b> 8초`); }
  return true;
}

/** 한 걸음. `dt` 는 초. **판을 그리는 것과 완전히 갈라 둔다** — 자(funtest)가
 *  그림 없이 수천 초를 돌릴 수 있어야 재미를 잴 수 있다(앞 프로토타입의 교훈). */
export function step(dt) {
  if (S.dead) return;
  S.t += dt;
  for (const e of S.minions) { if (e.moving > 0) e.moving -= dt; if (e.swing > 0) e.swing -= dt; }
  for (const e of S.mobs)    { if (e.moving > 0) e.moving -= dt; if (e.swing > 0) e.swing -= dt; }
  for (const k in S.cd) if (S.cd[k] > 0) S.cd[k] -= dt;
  if (S.amp > 0) S.amp -= dt;
  S.mp = Math.min(mpMaxOf(), S.mp + dt * (2.2 + (META.up.mp | 0) * 0.25));
  for (let i = S.fx.length - 1; i >= 0; i--) if ((S.fx[i].t -= dt) <= 0) S.fx.splice(i, 1);

  const ampMul = S.amp > 0 ? 1.5 : 1;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const toward = (e, tx, ty, sp, dt) => {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, sp * dt);
    e.x += dx / d * step; e.y += dy / d * step;
    if (Math.abs(dx) > 0.5) e.face = dx < 0 ? -1 : 1;    // 가는 쪽을 본다
    /* **걸음 위상은 시간이 아니라 지나온 거리로 센다.** 시간으로 세면 멈춘 놈도 발을
       놀리고, 느려진 놈도 같은 박자로 걷는다 — 그러면 "미끄러진다"가 그대로 남는다.
       거리로 세면 느린 골렘은 발도 천천히, 붙어서 멎은 놈은 발도 멎는다. */
    e.walked = (e.walked || 0) + step;
    e.moving = 0.12;                                     // 방금 움직였다(잠깐 유지)
  };

  /* ── 소환수 ── **제 자리를 지키되 가까이 온 적은 마중 나간다.**
     사방 판에서 전원이 한 적에게 몰려가면 그 순간 나머지 방향이 통째로 비어 본체가 맞는다.
     그래서 "내 구역"(제 각도)에서 제일 가까운 적만 본다. */
  for (const u of S.minions) {
    const K = MINIONS[u.kind];
    const hx = Math.cos(u.home) * u.rad, hy = Math.sin(u.home) * u.rad;
    let tgt = null, td = 1e9;
    for (const m of S.mobs) {
      const d = Math.hypot(m.x - hx, m.y - hy);
      if (d < td && d < 130) { td = d; tgt = m; }       // 제 구역 안에서만
    }
    if (!tgt) { toward(u, hx, hy, K.spd, dt); continue; }
    if (dist(u, tgt) > u.r + tgt.r + 4) { toward(u, tgt.x, tgt.y, K.spd, dt); continue; }
    if ((u.atk -= dt) > 0) continue;
    u.atk = K.cd; u.swing = 0.22;          // 때리는 순간 — 걷기와 갈린다
    const d = K.dmg * dmgMulOf() * ampMul;
    tgt.hp -= d;
    if (u.kind === "ghoul") u.hp = Math.min(u.hpMax, u.hp + d * 0.35);
    S.fx.push({ t: 0.12, x: tgt.x, y: tgt.y, kind: "hit" });
  }

  /* ── 적 ── **가운데를 향해 온다.** 길목에 소환수가 있으면 그것부터 친다 —
     그래서 둘레를 어떻게 덮었느냐가 곧 본인이 맞는 양이 된다. */
  for (const m of S.mobs) {
    let tgt = null, td = 1e9;
    for (const u of S.minions) { const d = dist(m, u); if (d < td && d < 90) { td = d; tgt = u; } }
    if (tgt && td < m.r + tgt.r + 4) {
      if ((m.atk -= dt) > 0) continue;
      m.atk = 1.0; m.swing = 0.22; tgt.hp -= m.dmg;
      continue;
    }
    if (tgt) { toward(m, tgt.x, tgt.y, m.spd, dt); continue; }
    toward(m, 0, 0, m.spd, dt);
    if (Math.hypot(m.x, m.y) <= CORE_R) {            // 둘레가 뚫렸다 — 본인이 맞는다
      if ((m.atk -= dt) > 0) continue;
      m.atk = 1.0; S.hp -= m.dmg;
      if (S.hp <= 0) { S.hp = 0; die(); return; }
    }
  }

  // ── 죽은 것 치우기 ── **적이 죽으면 시체가 남는다**(이 게임의 자원)
  for (let i = S.mobs.length - 1; i >= 0; i--) {
    if (S.mobs[i].hp > 0) continue;
    const m = S.mobs[i];
    S.mobs.splice(i, 1);
    S.corpses++; S.killed++;
    META.gold += goldFor(S.floor) * (m.boss ? 8 : 1);
    META.xp += (m.boss ? 9 : 1) * Math.max(1, Math.round(S.floor * 0.6));
    while (META.xp >= xpNeed(META.lv)) { META.xp -= xpNeed(META.lv); META.lv++;
      S.hp = hpMaxOf(); S.mp = mpMaxOf();
      say(`<b style="color:#ffff64">레벨 ${META.lv}</b> — 몸이 회복됨`); }
  }
  for (let i = S.minions.length - 1; i >= 0; i--) {
    if (S.minions[i].hp > 0) continue;
    S.minions.splice(i, 1);
    S.corpses++;                              // **내 소환수도 시체가 된다** — 다시 쓴다
  }

  // ── 층이 비면 내려간다 ──
  if (!S.mobs.length) {
    saveMeta();
    enterFloor(S.floor + 1);
  }
}

function die() {
  S.dead = true;
  META.runs = (META.runs | 0) + 1;
  META.deepest = Math.max(META.deepest | 0, S.floor);
  saveMeta();
  say(`<b style="color:#8b1a1a">쓰러짐</b> — ${S.floor}층`);
}

export function newRun() {
  Object.assign(S, {
    floor: 1, t: 0, running: true, dead: false,
    hp: hpMaxOf(), hpMax: hpMaxOf(), mp: mpMaxOf(), mpMax: mpMaxOf(),
    corpses: 3,                 // 첫 시체 셋은 그냥 준다 — 빈손이면 첫 소환을 못 한다
    minions: [], mobs: [], fx: [], cd: {}, log: [], killed: 0, deepest: 1, amp: 0,
  });
  enterFloor(1);
}
