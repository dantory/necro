import { armyCap, dmgMulOf, floorDmg, floorHp, floorN, goldFor, hpMaxOf, isGate, META,
         MINIONS, mpMaxOf, S, saveMeta, SKILLS, xpNeed } from "./core.js";

/* 전장은 **가로 한 줄**이다. 네크로멘서가 왼쪽 끝에 서 있고 적은 오른쪽에서 온다.
   방치형에서 진짜로 읽혀야 하는 건 위치가 아니라 **누가 앞에 서 있나**다 —
   골렘이 앞을 막고 해골이 그 뒤에서 때리는 그림이 한 줄이면 바로 읽힌다. */
export const LANE = { x0: 60, x1: 980, y: 0 };
/** **소환수는 진을 치고 기다린다.** 처음엔 적을 향해 판 끝까지 진격하게 뒀더니 싸움이
 *  화면 오른쪽 밖에서 벌어지고, 네크로멘서만 왼쪽에 덩그러니 남았다 — 방치형은 **보는
 *  게임**인데 볼 것이 화면 밖에 있으면 그건 아무것도 아니다. 이 선까지만 나간다. */
export const HOLD = 400;

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

function spawnMob(f, i, n) {
  const kind = mobKindFor(f);
  const m = { id: ++seq, kind, x: LANE.x1 + 40 + i * 46, hp: floorHp(f), hpMax: floorHp(f),
              dmg: floorDmg(f), spd: 22 + Math.random() * 10,
              r: kind === "brute" ? 15 : kind === "fallen" ? 10 : 12, atk: 0, boss: false };
  S.mobs.push(m);
  return m;
}

export function summon(kind) {
  const K = MINIONS[kind];
  if (S.minions.length >= armyCap()) return false;
  /* **줄을 세운다.** 다 같은 자리에서 멈추면 여섯이 한 덩어리로 겹쳐 군대가 아니라 얼룩이
     된다. 골렘이 제일 앞(벽), 구울이 그다음, 해골이 뒤 — 자리가 곧 그 종류의 역할이다. */
  const rank = kind === "golem" ? 0 : kind === "ghoul" ? 1 : 2;
  const same = S.minions.filter(m => m.kind === kind).length;
  S.minions.push({ id: ++seq, kind, x: LANE.x0 + 30 + Math.random() * 30,
                   gap: 10 + rank * 26 + same * 15,
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
    for (const m of S.mobs) if (m.x < LANE.x0 + 420) { m.hp -= dmg; hit++; }
    S.fx.push({ t: 0.35, x: LANE.x0 + 260, kind: "nova" });
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
  for (const k in S.cd) if (S.cd[k] > 0) S.cd[k] -= dt;
  if (S.amp > 0) S.amp -= dt;
  S.mp = Math.min(mpMaxOf(), S.mp + dt * (2.2 + (META.up.mp | 0) * 0.25));
  for (let i = S.fx.length - 1; i >= 0; i--) if ((S.fx[i].t -= dt) <= 0) S.fx.splice(i, 1);

  const ampMul = S.amp > 0 ? 1.5 : 1;

  // ── 소환수 ── 앞으로 나아가 제일 가까운 적을 친다
  for (const u of S.minions) {
    const K = MINIONS[u.kind];
    let tgt = null, td = 1e9;
    for (const m of S.mobs) { const d = m.x - u.x; if (d >= 0 && d < td) { td = d; tgt = m; } }
    /* **자기 자리**로 간다. 모두 같은 선에서 멈추면 여섯이 한 점에 겹쳐 다시 얼룩이 된다 —
       골렘이 맨 앞, 구울이 그 뒤, 해골이 뒤쪽. 앞뒤가 곧 역할이다. */
    const hold = HOLD - Math.max(0, (u.gap || 10) - 10);
    if (!tgt) { u.x = Math.min(hold, u.x + K.spd * dt); continue; }
    if (td > u.r + tgt.r + 6) { u.x = Math.min(hold, u.x + K.spd * dt); continue; }
    if ((u.atk -= dt) > 0) continue;
    u.atk = K.cd;
    const d = K.dmg * dmgMulOf() * ampMul;
    tgt.hp -= d;
    if (u.kind === "ghoul") u.hp = Math.min(u.hpMax, u.hp + d * 0.35);   // 물면 제 피가 찬다
    S.fx.push({ t: 0.12, x: tgt.x, kind: "hit" });
  }

  // ── 적 ── 앞으로 오다 소환수를 만나면 친다. 없으면 **네크로멘서를 친다**
  for (const m of S.mobs) {
    let tgt = null, td = 1e9;
    for (const u of S.minions) { const d = m.x - u.x; if (d >= 0 && d < td) { td = d; tgt = u; } }
    if (tgt && td < m.r + tgt.r + 4) {
      if ((m.atk -= dt) > 0) continue;
      m.atk = 1.0; tgt.hp -= m.dmg;
      continue;
    }
    m.x -= m.spd * dt;
    if (m.x <= LANE.x0) {                    // 앞이 뚫렸다 — 본체가 맞는다
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
