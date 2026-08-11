import { armyCap, CORPSE_TINT, dmgMulOf, selfMulOf, minionMulOf, goldMulOf, afText, nameOf, floorDmg, floorHp, floorN, FOOT_R, gearVal, goldFor, hpMaxOf, isGate, META, mpRegenOf, SQUASH_VIEW,
         MINIONS, MOB_H, mpMaxOf, NECRO_ATK, S, saveMeta, SKILLS, xpNeed,
         isRaise, MINION_OF, minionHpMul, novaDmgMul, novaRadMul, mpCostMul, mpCost, cdMul,
         wandMul, ampSecs, ampPower, harvestPct, spiritMp, feastOn,
         FEED_MAX, feedMul, dominatePct, thrallCap, armyN, thrallN, MOB_N,
         GEAR, dropChance, rollDrop, takeDrop, BAG_MAX } from "./core.js";

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
/** 한 번 휘두르는 데 걸리는 시간. **0.26초는 너무 빨랐다**(병수님: "공격 모션이 너무
 *  빠른듯") — 프레임이 여섯이라 초당 23장, 눈이 못 따라가고 그냥 번쩍하고 지나간다.
 *  0.45 로 늘렸더니 아직도 "파파팟" 이라 하셔서 0.6 까지 늘렸다(초당 10장).
 *  **휘두름만 늘려서는 소용이 없다** — 치는 주기가 짧으면 한 번이 느려져도 연타로 보인다.
 *  그래서 MINIONS 의 cd 도 1.6배 늘리고 한 방을 그만큼 세게 했다(core.js).
 *  제일 짧은 쿨다운(해골 1.5초)의 40% 라 다음 휘두름과 겹치지 않는다.
 *  ★ 그리는 쪽에서도 이 값을 쓴다 — 숫자를 양쪽에 적어 두면 한쪽만 고쳐 어긋난다. */
export const SWING_T    = 0.6;
/** 타격이 **어느 지점에서** 들어가는가(휘두름 진행도 0~1).
 *  ★★ 여기가 「공격모션이 어색하다」의 뿌리였다. 예전엔 휘두름을 **시작하는 순간**
 *  데미지·움찔·불꽃을 전부 넣었다 — 아직 팔을 들지도 않았는데 상대가 먼저 밀리고
 *  불꽃이 튀었다. **원인보다 결과가 먼저 오면** 눈은 그것을 「어색하다」로 읽는다.
 *  0.55 는 6프레임 중 **네 번째** 언저리 — 팔이 제일 뻗은 그 칸이다. */
export const IMPACT_AT  = 0.55;
/** 적이 때리는 주기. 소환수만 늦추면 **적만 연타로 보인다.** 같이 늦추되 한 방을
 *  그만큼 세게 해서(아래 `m.dmg * MOB_CD`) 받는 피해 총량은 그대로 둔다. */
const MOB_CD = 1.6;

/* ══ 죽는 순간 · 일어서는 순간 ══
   병수님: "전투화면 처음부터 다시 재검토". 화면을 늘려 보니 **죽는 게 안 보였다** —
   체력이 0 이 되는 프레임에 몸이 통째로 없어지고 다음 프레임에 시체가 놓여 있었다.
   방금 그 자리에서 무엇이 죽었는지, 내가 이겼는지가 **화면에 한 프레임도 안 남는다.**
   소환도 같다: 시체는 여기서 없어지는데 해골은 저쪽에 툭 나타났다(둘 사이가 안 이어짐).

   그래서 반 초를 준다. 죽으면 **무너지고**(기울며 가라앉고 옅어진다) 그 자리에
   시체가 배어 나온다 — 몸이 옅어지는 만큼 시체가 짙어져 하나가 다른 하나로 바뀐다.
   일어설 때는 **쓴 시체의 그 자리에서** 땅을 뚫고 올라온다.
   ★ 쓰러지는 몸은 셈에서 이미 빠져 있다(S.falling) — 때리지도 맞지도 않는다.
     그림만 남기는 것이므로 자(funtest)가 재는 숫자는 하나도 안 바뀐다. */
export const DEATH_T  = 0.5;
export const RISE_T   = 0.55;
/** 시체가 배어 나오는 시간. **죽는 시간과 같아야** 몸과 시체가 교대한다 —
 *  짧으면 몸이 아직 서 있는데 시체가 먼저 놓이고, 길면 잠깐 아무것도 없다. */
export const CORPSE_FADE = DEATH_T;

/** 쓰러진 몸을 화면에만 남긴다. 밀린 방향(kx,ky)으로 넘어간다 — 때린 쪽에서 밀려
 *  넘어져야 「저놈이 죽였다」가 읽힌다. */
function fall(e, base, hh) {
  S.falling.push({ base, hh, x: e.x, y: e.y,
                   dx: e.dx ?? 0, dy: e.dy ?? 1,
                   kx: e.kx || 0, ky: e.ky || 0, t: DEATH_T });
}

let seq = 0;
export const say = (s) => { S.log.unshift(s); if (S.log.length > 6) S.log.pop(); };

/** 적이 나오는 **간격**. 병수님: "너무 한번에 짠! 하고 나오는듯".
 *  한꺼번에 세워 놓으면 「배치된 것」으로 보이고, 하나씩 걸어 나오면 「몰려오는 것」이
 *  된다 — 방치형은 보는 게임이라 **나타나는 순간 자체가 볼거리**다.
 *  마릿수가 많은 층에서 줄이 너무 길어지지 않게 상한도 둔다. */
const SPAWN_GAP = [0.55, 0.95];

/** 「들어섰다」 연출이 사는 시간 — main.js draw 가 이 안에서 비네트를 걷고 명패를 앉힌다.
 *  ★ 그리는 쪽도 이 값으로 진행도를 재므로 export 한다(양쪽에 숫자를 박으면 어긋난다). */
export const ARRIVE_T = 1.6;
/** 층이 넘어갈 때 **앞 층 시체 그림**이 어둠에 잠겨 걷히는 시간. 개수(S.corpses)가 아니라
 *  그림(S.piles)만 걷는 것이라, 그리는 쪽도 이 값으로 알파를 재려고 export 한다. */
export const PILE_FADE = 1.0;
/** 관문 보스 자리에 퍼졌다 조여드는 붉은 고리의 수명. 그리는 쪽(fx "bossring")도 이 값을 쓴다. */
export const BOSSRING_T = 0.7;

export function enterFloor(f) {
  /* ── 앞 층 시체 그림을 걷는다 ── ②는 「개수 S.corpses 와 그림 S.piles 는
     addCorpse/useCorpse 두 길로만 움직인다」가 규칙이다. **여기가 그 유일한 예외.**
     자원을 쓰는 게 아니라 **새 층으로 내려온 것**이라, 앞 층 시체가 새 판에 깔려 있으면
     「내려왔다」가 깨진다. 그래서 개수는 한 톨도 안 건드리고(가진 시체 수는 그대로),
     판 위 그림에만 fade 를 걸어 어둠에 잠기게 지운다(step 이 다 잠기면 배열에서 뺀다). */
  for (const p of S.piles) p.fade = PILE_FADE;

  S.floor = f;
  S.mobs = [];
  const n = floorN(f);

  /* ★ 예전엔 여기서 `for` 한 줄로 **전부 한꺼번에** 세웠다. 그래서 층이 바뀌는
     순간 적 예닐곱이 동시에 나타났다. 이제 **줄을 세우고**(S.spawnQ) step 이
     하나씩 꺼낸다. 맨 앞 하나만 즉시 — 빈 판을 잠깐이라도 보면 멈춘 것 같다. */
  S.spawnQ = [];
  for (let i = 0; i < n; i++) S.spawnQ.push({ f, i, n, boss: false });
  if (isGate(f)) {
    /* 관문은 **큰 놈이 먼저** 나온다. 졸개 뒤에 붙이면 이미 싸움이 붙은 뒤라
       등장이 묻힌다. */
    S.spawnQ.unshift({ f, i: 0, n: 1, boss: true });
    say(`<b style="color:#c8aa6e">${f}층 · 관문</b> 층의 주인이 지키는 중`);
  } else {
    say(`<b>${f}층</b> 진입`);
  }
  S.spawnT = 0;                                // 첫 놈은 바로
  S.deepest = Math.max(S.deepest, f);
}

/** 줄에서 하나 꺼내 세운다. */
function popSpawn() {
  const q = S.spawnQ.shift();
  const m = spawnMob(q.f, q.i, q.n);
  /* 나타나는 데 **잠깐 걸린다.** 시차만 두고 툭 나타나면 여전히 갑작스럽다 —
     어둠에서 배어 나오게 한다(main.js 가 born 을 보고 흐리게 그린다). ★ 배어 나오는
     시간을 born0 에 함께 적어 둔다 — 그리는 쪽이 관문 보스(0.8)와 졸개(0.4)를
     같은 식으로 재려면 「얼마 동안」을 알아야 한다(예전엔 0.4 를 박아 뒀다). */
  if (q.boss) {
    m.boss = true; m.kind = "boss";
    m.hp = m.hpMax = floorHp(q.f) * 7;
    m.dmg = floorDmg(q.f) * 2.1; m.h = bossH(q.f); m.r = m.h * FOOT_R;
    /* 관문 보스는 **더 길게** 배어 나온다(0.8 — 졸개의 두 배). 서기 직전 그 자리
       바닥에 붉은 고리가 퍼졌다 조여들고(fx), 서는 순간 판이 아주 짧게 흔들린다 —
       관문이 졸개 층과 똑같이 생긴 것을 「여기 주인이 선다」로 가른다. */
    m.born0 = 0.8;
    S.fx.push({ t: BOSSRING_T, x: m.x, y: m.y, kind: "bossring" });
    S.shake = 0.25;
  } else {
    m.born0 = 0.4;
  }
  m.born = m.born0;
  const [lo, hi] = SPAWN_GAP;
  S.spawnT = lo + Math.random() * (hi - lo);
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
/** 그 층에 실제로 서는 졸개 종류. 검수기가 「같은 층 식구끼리」 세우려면 필요하다. */
export const mobKindsFor = (f) => tierOf(f).kinds;
const tierOf = (f) => [...MOB_TIERS].reverse().find(x => f >= x.from) || MOB_TIERS[0];
const mobKindFor = (f) => {
  const t = tierOf(f);
  return t.kinds[Math.floor(Math.random() * t.kinds.length)];
};

/* ══ 관문의 주인은 **한 단계 큰 놈이다** ══ 크기를 「보스 104」로 박아 두면 위층
   (타락자 44)에서만 커 보인다 — 깊은 층은 괴물(62)이 나오므로 1.7배밖에 안 돼
   **같은 크기 계열**로 읽힌다. 관문에 들어선 순간 와야 하는 건 숫자가 아니라 「크다」다.
   그래서 절대값이 아니라 **그 층에 실제로 서는 제일 큰 놈의 배수**로 잡는다 —
   종을 새로 넣거나 층 표를 고쳐도 저절로 따라온다(이름을 코드에 안 박았다).
   MOB_H.boss 는 이제 **바닥값**이다(위층에서도 이보다 작아지지 않는다). */
export const bossH = (f) => {
  const big = Math.max(...tierOf(f).kinds.map(k => MOB_H[k] || 48));
  return Math.max(MOB_H.boss, Math.round(big * BOSS_OVER));
};
/** 졸개 중 제일 큰 놈의 몇 배인가. 2.4 = 키가 두 배 반 — 발밑이 같은 줄에 있어도
 *  머리가 한참 위에 있어서 한눈에 갈린다(2.0 은 「좀 큰 놈」으로 읽혔다). */
const BOSS_OVER = 2.4;

/** **사방에서 나타난다.** 각도를 고르게 흩되 조금 흔든다 — 딱 등간격이면 톱니바퀴처럼
 *  보여서 살아 있는 무리로 안 읽힌다. */
function spawnMob(f, i, n) {
  const kind = mobKindFor(f);
  const a = (i / Math.max(1, n)) * 6.2832 + (Math.random() - 0.5) * 0.8;
  const rad = RING_SPAWN + Math.random() * 50;
  const h = MOB_H[kind] || 48;
  const m = { id: ++seq, kind, a, h,
              x: Math.cos(a) * rad, y: Math.sin(a) * rad,
              hp: floorHp(f), hpMax: floorHp(f),
              dmg: floorDmg(f), spd: 22 + Math.random() * 10,
              r: h * FOOT_R, atk: 0, boss: false };
  S.mobs.push(m);
  return m;
}



/* ══ 맞은 티 ══ **얼마나 아팠는지가 화면에 없었다.**
   불꽃은 「닿았다」만 말하고 크기를 말하지 않는다 — 해골이 12 를 넣는지 120 을 넣는지
   구분이 안 되니, 강화를 해도 트리를 파도 **판이 똑같아 보인다.** 숫자가 커지는 맛이
   이 장르의 절반인데 그 절반이 화면에 없었다.
   ★ 개수를 반드시 막는다. rtd 에서 떠오르는 글자를 안 막았다가 DOM 이 수천 개로
     불어나 판이 기어간 적이 있다(여긴 캔버스라 훨씬 싸지만 규칙은 같다). */
const NUM_MAX = 44;
export function popNum(x, y, v, kind) {
  if (v < 1) return;
  S.nums.push({ x, y, v: Math.round(v), kind, t: 0.9,
                vx: (Math.random() - 0.5) * 16, seed: Math.random() });
  if (S.nums.length > NUM_MAX) S.nums.shift();
}

/* ══ 시체는 **판 위에 실물로 남는다** ══
   병수님: "전투화면 처음부터 다시 재검토". 이 게임의 엔진은 시체인데, 화면에는 시체가
   한 구도 없고 판 아래 「시체 7」 이라는 숫자만 있었다 — 자원이 어디에 얼마나 쌓였는지
   눈에 안 보이니 「시체가 자원」이 말로만 있는 셈이었다.

   ★ 개수(S.corpses)와 그림(S.piles)이 **어긋나면 안 된다.** 둘을 따로 세면 언젠가
     반드시 벌어진다(오늘 하루에만 자가 어긋난 자리를 셋 봤다). 그래서 더하고 빼는
     길을 **여기 둘로만** 낸다 — addCorpse / useCorpse. 다른 데서 S.corpses 를
     직접 만지지 않는다. */
/* 화면에 남기는 최대 구수. ★ 40 으로 뒀다가 재 보니 깊은 층에서 시체가 109 구까지
   쌓여 **그림이 개수의 3분의 1**밖에 안 됐다 — 자원을 눈으로 세라고 그려 놓고 정작
   눈이 세는 수가 틀린다. 작은 스프라이트 백 장은 값이 싸므로 상한을 올린다. */
const PILE_MAX = 140;
export function addCorpse(x, y, sort, n = 1) {
  for (let i = 0; i < n; i++) {
    S.corpses++;
    /* 개체마다 **다르게 눕는다** — 각도는 한 바퀴 전부(위에서 내려다본 그림이라 어느
       쪽으로 누워도 말이 된다), 크기는 ±15%, 좌우도 뒤집는다. 여기에 색까지 얹으면
       세 장으로 수십 가지가 나온다(core.js 의 CORPSE_TINT). */
    S.piles.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 6,
                   sort, t: 0, born: CORPSE_FADE, rot: Math.random() * 6.2832,
                   flip: Math.random() < 0.5 ? -1 : 1,
                   sc: 0.85 + Math.random() * 0.30,
                   tint: (Math.random() * CORPSE_TINT.length) | 0,
                   /* **바닥에 잠긴 깊이**. 색보다 이게 더 크게 먹는다 — 특히 뼈처럼
                      밝은 그림은 다 똑같이 하얘서, 밝기가 갈려야 낱개로 세어진다. */
                   dim: 0.66 + Math.random() * 0.34 });
    if (S.piles.length > PILE_MAX) S.piles.shift();
  }
}
/** 시체 n 구를 쓴다. **쓴 자리**를 돌려준다(거기서 소환수가 일어서게) */
export function useCorpse(n = 1, nearX = 0, nearY = 0) {
  let at = null;
  for (let i = 0; i < n; i++) {
    if (S.corpses <= 0) break;
    S.corpses--;
    /* 쓸 것은 **가까운 것부터** — 눈은 제일 가까운 시체가 사라지기를 기대한다 */
    let bi = -1, bd = 1e9;
    for (let j = 0; j < S.piles.length; j++) {
      const d = Math.hypot(S.piles[j].x - nearX, (S.piles[j].y - nearY) * SQUASH_VIEW);
      if (d < bd) { bd = d; bi = j; }
    }
    if (bi >= 0) {
      const p = S.piles.splice(bi, 1)[0];
      if (!at) at = { x: p.x, y: p.y };
      /* 먼지는 **일어서는 내내** 인다 — 몸이 다 올라오기 전에 먼지가 걷히면
         둘이 남남으로 보인다(그리는 쪽이 RISE_T 로 진행도를 잰다). */
      S.fx.push({ t: RISE_T, x: p.x, y: p.y, kind: "rise" });
    }
  }
  return at;
}

/** @param at 쓴 시체의 자리. **거기서 일어선다** — 시체는 여기서 없어지는데 해골은
 *  저쪽에 나타나면 둘이 남남이라 「시체로 만들었다」가 안 읽힌다. */
export function summon(kind, at) {
  const K = MINIONS[kind];
  if (armyN() >= armyCap()) return false;
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
  /* ★ 뼈 갑주(트리)가 체력을 올린다 — **소환되는 순간에** 정한다. */
  const hp0 = Math.round(K.hp * minionHpMul());
  /* 선 자리는 **쓴 시체의 자리**, 없으면 예전처럼 제 구역 안쪽. 어느 쪽이든 곧
     제 자리(home)로 걸어간다 — 그 걸음까지가 「불려 나왔다」로 읽힌다. */
  const sx = at ? at.x : Math.cos(best) * rad * 0.4;
  const sy = at ? at.y : Math.sin(best) * rad * 0.4;
  S.minions.push({ id: ++seq, kind, home: best, rad, h: K.h,
                   x: sx, y: sy, rise: RISE_T,
                   hp: hp0, hpMax: hp0, atk: 0, r: K.h * FOOT_R });
  return true;
}

/** 스킬 — **시체를 쓰는가**가 전부다. 마나만 드는 것과 시체까지 드는 것이 갈려야
 *  "시체가 자원"이 손끝에서 느껴진다. */
export function cast(id) {
  const sk = SKILLS.find(s => s.id === id);
  /* ★ 값과 재사용은 **트리가 깎는다**(값싼 죽음 · 빠른 손). 쓸 수 있는지 보는 곳과
     실제로 빼는 곳이 같은 식을 봐야 한다 — 어긋나면 「눌리는데 안 나감」이 된다. */
  if (!sk) return false;
  const mpNeed = mpCost(sk);
  if ((S.cd[id] || 0) > 0 || S.mp < mpNeed || S.corpses < sk.corpse) return false;
  if (isRaise(id) && armyN() >= armyCap()) return false;

  S.mp -= mpNeed; S.cd[id] = sk.cd * cdMul();
  /* 시체를 쓰면 **판 위의 그것이 없어진다.** 어디 것을 썼는지가 보여야 자원이 된다.
     시체 폭발은 본인 둘레를 쓸므로 가운데에서, 소환은 세울 자리에서 가까운 것을 쓴다. */
  const usedAt = sk.corpse ? useCorpse(sk.corpse, 0, 0) : null;
  if (isRaise(id)) { summon(MINION_OF[id], usedAt); say(`<b>${MINIONS[MINION_OF[id]].n}</b> 소환`); }
  if (id === "nova") {
    /* **시체 폭발** — 이 직업의 상징. 시체 하나로 앞줄을 통째로 지운다. */
    const dmg = 30 * Math.pow(1.14, S.floor) * dmgMulOf() * selfMulOf() * novaDmgMul();
    const rad = 180 * novaRadMul();
    let hit = 0;
    /* 시체 폭발은 **본인 둘레**를 쓸어 낸다 — 사방 판에서는 그게 "한숨 돌리는 순간"이다 */
    for (const m of S.mobs) if (Math.hypot(m.x, m.y) < rad) { m.hp -= dmg; hit++; popNum(m.x, m.y, dmg, "nova"); }
    /* 시체 잔치(트리) — 터진 시체가 **소환수를 먹인다.** 폭발이 공격이자 회복이 되면
       시체 하나를 어디에 쓸지가 매번 다른 답이 된다. */
    /* ★ 치유만으로는 **화면에서 아무 일도 안 일어난다** — 체력바가 조금 차는 게 전부라
       끝 노드를 찍었는지 안 찍었는지 보고도 모른다. 먹인 놈은 **커진다**: 크기와
       힘이 같이 오르고, 여덟 번까지만(끝없이 크면 둘레를 몸으로 덮어 버린다). */
    if (feastOn()) for (const e of S.minions) {
      /* 먹인 만큼 **초록 숫자**로 — 폭발이 회복이기도 하다는 걸 체력바만으로는 못 읽는다.
         소환수 한 기당 하나만 뜬다(전원이라 한꺼번에 여럿이지만 상한 44 가 받아 낸다). */
      const g = Math.min(e.hpMax - e.hp, dmg * 0.4); e.hp += g; popNum(e.x, e.y, g, "heal");
      if ((e.fed | 0) < FEED_MAX) {
        e.fed = (e.fed | 0) + 1;
        const grow = 1 + 0.05;                 // 이번 한 입만큼 체력 그릇도 같이 큰다
        e.hpMax = Math.round(e.hpMax * grow); e.hp = Math.round(e.hp * grow);
        e.r *= grow;                           // 몸이 크면 자리도 그만큼 차지한다
      }
    }
    S.fx.push({ t: 0.35, x: 0, y: 0, kind: "nova", rad });
    say(`<b style="color:#ff8000">시체 폭발</b> ${hit}마리 · 각 ${Math.round(dmg)} 피해`);
  }
  if (id === "amp") { S.amp = ampSecs(); say(`<b style="color:#6a6aff">약화의 저주</b> ${ampSecs()}초 지속`); }
  /* **시전하는 순간을 몸으로 보인다.** 네크로는 안 움직이니 걷기 그림이 없다 — 유일하게
     자세가 바뀌는 때가 스킬을 쓸 때다. 소환수의 휘두름과 같은 길이(SWING_T)의 창을 켜서,
     그리는 쪽(main.js)이 그 사이 공격 프레임을 튼다. */
  S.pswing = SWING_T;
  return true;
}

/** 한 걸음. `dt` 는 초. **판을 그리는 것과 완전히 갈라 둔다** — 자(funtest)가
 *  그림 없이 수천 초를 돌릴 수 있어야 재미를 잴 수 있다(앞 프로토타입의 교훈). */
export function step(dt) {
  if (S.dead) return;
  S.t += dt;
  if (S.hurt > 0) S.hurt -= dt;                    // 본인이 맞고 움찔하는 시간
  if (S.shake > 0) S.shake -= dt;                  // 관문 보스가 설 때의 짧은 흔들림
  /* 「들어섰다」 연출이 스스로 꺼진다 — 켠 곳(enterFloor)과 끄는 곳을 한 군데로 모아,
     그리는 쪽은 S.arrive 가 있으면 그리고 없으면 안 그리기만 하면 된다. */
  if (S.arrive) { S.arrive.t -= dt; if (S.arrive.t <= 0) S.arrive = null; }
  /* 갓 생긴 시체는 스르르 나타나고(born), 앞 층 시체 그림은 어둠에 잠겨 걷힌다(fade).
     fade 가 다 되면 배열에서 뺀다 — **개수 S.corpses 는 안 건드린다**(enterFloor 의 예외). */
  for (let i = S.piles.length - 1; i >= 0; i--) {
    const p = S.piles[i];
    if (p.born > 0) p.born -= dt;
    if (p.fade !== undefined && (p.fade -= dt) <= 0) S.piles.splice(i, 1);
  }
  for (let i = S.nums.length - 1; i >= 0; i--) if ((S.nums[i].t -= dt) <= 0) S.nums.splice(i, 1);
  /* ── 전리품이 본인에게 온다 ── **방치형이므로 주우러 가지 않는다.** 잠깐 놓여
     「떨어졌다」가 보인 뒤(pull) 빨려 들어오고, 닿으면 그 자리에서 처리된다.
     ★ 좋은 것이면 **그 자리에서 갈아 끼운다** — 고르라고 판을 세우지 않는다. */
  for (let i = S.drops.length - 1; i >= 0; i--) {
    const d = S.drops[i];
    d.t += dt;
    if (d.pull > 0) { d.pull -= dt; continue; }
    const dd = Math.hypot(d.x, d.y) || 1;
    const sp = 150 + 520 * Math.min(1, d.t * 0.5);      // 갈수록 빨라진다
    d.x -= (d.x / dd) * sp * dt; d.y -= (d.y / dd) * sp * dt;
    if (dd < 16) {
      const r = takeDrop(d);
      const g = GEAR[d.k], nm = nameOf(d);
      S.loot.push({ k: d.k, tier: d.tier, af: d.af || [], worn: r.worn, gold: r.gold, bagged: r.bagged, n: nm, slot: g.n });
      /* 붙은 것을 **로그에 적는다** — 안 적으면 「같은 4등급인데 왜 갈아 끼웠지」가
         화면 어디에도 없어서, 랜덤 옵션을 넣고도 없는 것과 같아진다. */
      const opts = (d.af || []).map((a) => afText(a)).join(" · ");
      const afl = opts ? ` <i class="afl">${opts}</i>` : "";
      /* 주운 그것이 간 곳을 **세 갈래로 갈라** 말한다: 착용 · 가방 · (가방이 꽉 차 제일 나빠서) 금.
         스필오버(가방이 차서 밀려 녹은 **다른** 것)는 그 아래 「가방이 차서」 줄로 따로 말한다. */
      let spill;
      if (r.worn)       { say(`<b class="t${d.tier}">${nm}</b> 착용 — ${g.n}` + afl); spill = r.melted; }
      else if (r.bagged){ say(`<b class="t${d.tier}">${nm}</b> → 가방 (${META.bag.length}/${BAG_MAX})` + afl); spill = r.melted; }
      else              { say(`<b class="t${d.tier}">${nm}</b> → 금 ${r.melted[0].gold}` + afl); spill = r.melted.slice(1); }
      for (const m of spill) say(`가방이 차서 <b class="t${m.tier}">${m.n}</b> → 금 ${m.gold}`);
      S.fx.push({ t: 0.4, x: 0, y: 0, kind: "rise" });
      saveMeta();
      S.drops.splice(i, 1);
    }
  }
  for (let i = S.falling.length - 1; i >= 0; i--) if ((S.falling[i].t -= dt) <= 0) S.falling.splice(i, 1);
  for (const e of S.minions) { if (e.moving > 0) e.moving -= dt; if (e.swing > 0) e.swing -= dt; if (e.flinch > 0) e.flinch -= dt; if (e.rise > 0) e.rise -= dt; }
  for (const e of S.mobs)    { if (e.moving > 0) e.moving -= dt; if (e.swing > 0) e.swing -= dt; if (e.flinch > 0) e.flinch -= dt; if (e.born > 0) e.born -= dt; }

  /* ── 예약된 타격을 **팔이 뻗는 칸에서** 터뜨린다 ──
     휘두름은 SWING_T 에서 0 으로 준다. 진행도가 IMPACT_AT 을 넘는 순간(=swing 이
     SWING_T*(1-IMPACT_AT) 아래로 내려가는 순간) 데미지·움찔·불꽃이 한꺼번에 온다.
     셋이 **같은 프레임에** 와야 「맞았다」로 읽힌다 — 하나라도 어긋나면 흩어진다. */
  const impactAt = SWING_T * (1 - IMPACT_AT);
  for (const u of S.minions.concat(S.mobs)) {
    if (!u.pending || u.swing > impactAt) continue;
    const p = u.pending;
    u.pending = null;
    /* ── 본인이 맞는다 ── 표적이 따로 없다(판 가운데의 네크로다). 예전엔 이 한 방만
       적이 CORE_R 에 닿는 **그 자리에서 즉시** S.hp 를 깎고 불꽃을 뿌렸다 — 다른 모든
       타격은 pending 으로 미뤄 팔이 뻗는 칸에서 터지는데, 이 게임에서 **제일 중요한
       타격만** 아직도 「원인보다 결과가 먼저」였다(팔을 들기도 전에 체력이 닳았다).
       그래서 같은 길로 옮겨 여기서 푼다: 체력·움찔·불꽃·숫자·죽음 판정이 한 프레임에 온다.
       ★ 숫자는 "core" — 곧 게임이 끝난다는 뜻이라 다른 어떤 숫자보다 눈에 띄어야 한다. */
    if (p.core) {
      S.hp -= p.dmg;
      popNum(0, 0, p.dmg, "core");
      S.hurt = 0.18; S.hkx = u.sdx; S.hky = u.sdy;
      /* 불꽃은 본인 둘레의 **적이 선 쪽**에 — u.sdx 는 적→가운데 방향이라 반대로 민다 */
      S.fx.push({ t: 0.12, kind: "hit", x: -u.sdx * CORE_R * 0.8, y: -u.sdy * CORE_R * 0.8 });
      if (S.hp <= 0) { S.hp = 0; die(); return; }
      continue;
    }
    const { tgt, dmg, heal } = p;
    if (!tgt || tgt.hp <= 0) continue;                  // 그새 죽었으면 허공을 친다
    tgt.hp -= dmg;
    /* 맞은 쪽이 적이면 흰 숫자, 내 편이면 붉은 숫자 — **누가 아픈지**가 색으로 갈린다.
       (S.mobs 에 있으면 적이다. own 인 지배 소환수는 minions 에 있으므로 아군으로 샌다) */
    popNum(tgt.x, tgt.y, dmg, S.mobs.includes(tgt) ? "dmg" : "hurt");
    tgt.flinch = 0.18;                                   // 맞은 놈은 움찔하고 밀린다
    tgt.kx = u.sdx; tgt.ky = u.sdy;
    /* 구울의 흡혈 — **회복도 숫자로 보인다**(초록, 앞에 +). 실제로 찬 만큼만 띄운다:
       가득 찬 구울이 문 것을 큰 숫자로 띄우면 거짓말이 된다. */
    if (heal) { const g = Math.min(u.hpMax - u.hp, dmg * 0.35); u.hp += g; popNum(u.x, u.y, g, "heal"); }
    /* 불꽃은 **닿는 자리**에 — 맞은 놈의 한가운데가 아니라 둘 사이 경계다.
       가운데에 찍으면 몸에 파묻혀 안 보인다. */
    S.fx.push({ t: 0.12, kind: "hit",
                x: tgt.x - u.sdx * tgt.r * 0.8, y: tgt.y - u.sdy * tgt.r * 0.8 });
  }

  // ── 적은 **하나씩 걸어 나온다** ── 줄에 남은 것이 있으면 간격을 두고 꺼낸다
  if (S.spawnQ && S.spawnQ.length) {
    S.spawnT -= dt;
    while (S.spawnQ.length && S.spawnT <= 0) popSpawn();
  }
  for (const k in S.cd) if (S.cd[k] > 0) S.cd[k] -= dt;
  if (S.amp > 0) S.amp -= dt;
  if (S.pswing > 0) S.pswing -= dt;
  S.mp = Math.min(mpMaxOf(), S.mp + dt * mpRegenOf());
  for (let i = S.fx.length - 1; i >= 0; i--) if ((S.fx[i].t -= dt) <= 0) S.fx.splice(i, 1);

  const ampMul = S.amp > 0 ? ampPower() : 1;

  /* ══ 닿았나 ══ **떼어 놓는 자와 닿았다는 자가 같은 자를 써야 한다.**
     ★★ 병수님: "하수인들 공격 못션 안하는데". 재 보니 소환수가 휘두르는 건
     **전체 프레임의 1.9%** 뿐이었고, 적 옆에 붙어 있는데도 사거리 밖인 순간이
     사거리 안인 순간의 **6.6배**였다(8524 대 1299).
     원인은 자가 둘이었던 것이다 — 겹침을 푸는 곳은 **화면 거리**(세로에 squash 를
     곱한 것)로 떼어 놓는데, 닿았는지 보는 곳은 **월드 거리**로 쟀다. 위아래로 선 쌍은
     화면에서 딱 붙여 놔도 월드로는 1/0.78 = 1.28배 멀어서, 「닿을 만큼 떼어 놓고
     닿지 않았다고 판정」하는 고리에 갇힌다. 그래서 서로 밀치며 영영 안 때렸다.
     겹침을 화면에서 푸니(그게 눈이 보는 것이므로) **닿는 것도 화면에서 잰다.** */
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * SQUASH_VIEW);
  const toward = (e, tx, ty, sp, dt) => {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, sp * dt);
    e.x += dx / d * step; e.y += dy / d * step;
    if (Math.abs(dx) > 0.5) e.face = dx < 0 ? -1 : 1;    // 가는 쪽을 본다(다른 곳에서 아직 쓴다)
    /* **제자리 걸음은 걸음이 아니다.** 제 구역에 선 소환수는 매 프레임 toward(제 home)로
       불려도 사실상 안 움직인다(step≈0). 그걸 walk 로 치면 8방향 그림이 걷는 프레임에서
       얼어붙어 어색하다. 실제로 옮겨간 거리가 있을 때만 걷는 것으로 센다. */
    if (step > 0.05) {
      /* **걸음 위상은 시간이 아니라 지나온 거리로 센다.** 시간으로 세면 멈춘 놈도 발을
         놀리고, 느려진 놈도 같은 박자로 걷는다 — 그러면 "미끄러진다"가 그대로 남는다.
         거리로 세면 느린 골렘은 발도 천천히, 붙어서 멎은 놈은 발도 멎는다. */
      e.walked = (e.walked || 0) + step;
      e.moving = 0.12;                                   // 방금 움직였다(잠깐 유지)
      /* **바라보는 방향(dx,dy)을 8방향 그림에 그대로 넘긴다.** 매 프레임 새로 쓰면
         두 방향 경계에서 이동 벡터의 잔떨림이 그림을 덜덜 떨게 한다. 그래서 히스테리시스:
         지금 보는 방향과 새 이동 방향의 각도차가 충분히 클 때(내적<0.85, ≈32°)만 바꾼다.
         이웃 방향의 중심은 45° 떨어져 있으니, 진짜로 돌 때는 넘어가고 경계의 떨림은 무시된다. */
      const nx = dx / d, ny = dy / d;
      if (e.dx === undefined || e.dx * nx + e.dy * ny < 0.85) { e.dx = nx; e.dy = ny; }
    }
  };

  /* ── 본인의 기본공격 ── **뼈를 던진다.**
     가만히 서서 구경만 하면 "부리는 자"가 아니라 장식이 된다. 제일 가까운 적에게
     자동으로 던지되, 화력은 해골 한 기보다 조금 위다 — 군대를 대신하면 안 된다. */
  if ((S.natk -= dt) <= 0) {
    let t = null, td = NECRO_ATK.range;
    for (const m of S.mobs) { const d = Math.hypot(m.x, m.y); if (d < td) { td = d; t = m; } }
    if (t) {
      S.natk = NECRO_ATK.cd;
      S.pswing = SWING_T;                              // 던지는 자세
      const d = Math.hypot(t.x, t.y) || 1;
      S.bolts.push({ x: 0, y: 0, dx: t.x / d, dy: t.y / d,
                     dmg: NECRO_ATK.dmg(META.lv) * dmgMulOf() * selfMulOf() * (1 + gearVal("wand")) * wandMul(), life: 2 });
    }
  }
  /* 날아가는 뼈. **맞을 놈을 미리 잡아 두지 않는다** — 표적이 먼저 죽으면 허공을 쫓는다.
     날아가는 길에 걸리는 첫 놈을 맞힌다. */
  for (let i = S.bolts.length - 1; i >= 0; i--) {
    const b = S.bolts[i];
    const st = NECRO_ATK.speed * dt;
    b.x += b.dx * st; b.y += b.dy * st;
    b.life -= dt;
    let hit = null;
    for (const m of S.mobs) if (Math.hypot(m.x - b.x, m.y - b.y) < m.r * 0.7) { hit = m; break; }
    if (hit) {
      hit.hp -= b.dmg * ampMul;
      popNum(hit.x, hit.y, b.dmg * ampMul, "dmg");
      hit.flinch = 0.18; hit.kx = b.dx; hit.ky = b.dy;
      S.fx.push({ t: 0.12, x: hit.x, y: hit.y, kind: "hit" });
      S.bolts.splice(i, 1); continue;
    }
    if (b.life <= 0 || Math.hypot(b.x, b.y) > RING_SPAWN + 80) S.bolts.splice(i, 1);
  }

  /* ── 소환수 ── **제 자리를 지키되 가까이 온 적은 마중 나간다.**
     사방 판에서 전원이 한 적에게 몰려가면 그 순간 나머지 방향이 통째로 비어 본체가 맞는다.
     그래서 "내 구역"(제 각도)에서 제일 가까운 적만 본다. */
  for (const u of S.minions) {
    /* 지배한 놈은 **제 표를 들고 다닌다**(u.own) — 원래 적이라 MINIONS 에 없다.
       한 곳에서만 갈라 두면 나머지 셈은 소환수와 완전히 같다. */
    const K = u.own || MINIONS[u.kind];
    const hx = Math.cos(u.home) * u.rad, hy = Math.sin(u.home) * u.rad;
    let tgt = null, td = 1e9;
    for (const m of S.mobs) {
      const d = Math.hypot(m.x - hx, (m.y - hy) * SQUASH_VIEW);   // ← 화면에서 잰다
      if (d < td && d < 130) { td = d; tgt = m; }       // 제 구역 안에서만
    }
    if (!tgt) { toward(u, hx, hy, K.spd, dt); continue; }
    if (dist(u, tgt) > u.r + tgt.r + 4) { toward(u, tgt.x, tgt.y, K.spd, dt); continue; }
    if ((u.atk -= dt) > 0) continue;
    /* **때리는 순간을 크게 만든다.** 방금 넣은 0.22초짜리 살짝 내지르기는 화면에서
       안 읽혔다(병수님: "공격모션도 없고"). 때리는 것이 보이려면 셋이 같이 가야 한다:
       **내지르는 놈** · **밀리는 놈** · **닿는 자리의 불꽃**. 하나만 있으면 안 읽힌다. */
    u.atk = K.cd; u.swing = SWING_T;
    u.sdx = (tgt.x - u.x); u.sdy = (tgt.y - u.y);       // 내지르는 방향
    const sl = Math.hypot(u.sdx, u.sdy) || 1; u.sdx /= sl; u.sdy /= sl;
    /* **때는 아직이다.** 팔이 뻗는 칸에서 터지도록 적어만 둔다(위 IMPACT_AT). */
    /* 먹어서 커진 만큼 세다 — 몸집과 힘이 따로 놀면 「커졌는데 약함」이 된다.
       지배한 놈은 제 피를 못 빤다(구울만 문다). */
    u.pending = { tgt, dmg: K.dmg * dmgMulOf() * minionMulOf() * ampMul * feedMul(u),
                  heal: u.kind === "ghoul" && !u.own };
  }

  /* ── 적 ── **가운데를 향해 온다.** 길목에 소환수가 있으면 그것부터 친다 —
     그래서 둘레를 어떻게 덮었느냐가 곧 본인이 맞는 양이 된다. */
  for (const m of S.mobs) {
    let tgt = null, td = 1e9;
    for (const u of S.minions) { const d = dist(m, u); if (d < td && d < 90) { td = d; tgt = u; } }
    if (tgt && td < m.r + tgt.r + 4) {
      if ((m.atk -= dt) > 0) continue;
      m.atk = MOB_CD; m.swing = SWING_T;
      m.sdx = (tgt.x - m.x); m.sdy = (tgt.y - m.y);
      const ml = Math.hypot(m.sdx, m.sdy) || 1; m.sdx /= ml; m.sdy /= ml;
      m.pending = { tgt, dmg: m.dmg * MOB_CD, heal: false };
      /* ★★ 여기서 불꽃을 **바로** 뿌리고 있었다. 피해는 팔이 뻗는 칸(impactAt)에서
         들어가는데 불꽃만 0.33초 먼저 터진 것이다 — 소환수 쪽에서 고쳤던
         「원인보다 결과가 먼저」가 적 쪽에는 그대로 남아 있었다. 게다가 pending 이
         풀릴 때 또 뿌리므로 **한 번 칠 때 두 번 번쩍였다.** 예약만 하고 넘긴다. */
      continue;
    }
    if (tgt) { toward(m, tgt.x, tgt.y, m.spd, dt); continue; }
    toward(m, 0, 0, m.spd, dt);
    if (Math.hypot(m.x, m.y * SQUASH_VIEW) <= CORE_R) {   // 둘레가 뚫렸다 — 본인이 맞는다
      if ((m.atk -= dt) > 0) continue;
      /* ★★ 소환수를 칠 때와 **똑같은 안무**를 태운다: 휘두름 · 내지르는 방향, 그리고
         팔이 뻗는 칸에서 체력·움찔·불꽃·숫자가 한꺼번에 온다. 여기서는 **예약만** 하고
         (m.pending.core), 실제 타격과 죽음 판정은 위 impactAt 루프가 푼다 — 그래야 이
         한 방도 다른 모든 타격과 같은 「원인 → 결과」 순서로 읽힌다. */
      const ml = Math.hypot(m.x, m.y) || 1;
      m.atk = MOB_CD; m.swing = SWING_T;
      m.sdx = -m.x / ml; m.sdy = -m.y / ml;          // 가운데(본인)를 향해 내지른다
      m.pending = { core: true, dmg: m.dmg * MOB_CD };
    }
  }

  /* ── 서로 밀어낸다 ── **겹치면 몇 마리인지 안 읽힌다.**
     반경을 그림에 맞춘 것만으로는 부족하다 — 둘 다 같은 자리를 향해 걸으면 결국 포갠다.
     그래서 매 걸음 끝에 겹친 쌍을 **절반씩 밀어** 떼어 놓는다.
     한 번에 다 밀지 않고 60%만 미는 이유: 100% 로 밀면 서로 튕겨 부르르 떤다.
     쌍마다 도는 O(n²) 이지만 판에 서는 것이 많아야 마흔 남짓이라 값이 싸다. */
  /* ★★ 세 번째로 지적받고서야 진짜 원인을 찾았다(병수님: "캐릭 안겹치게 좀,,").
     반경도 키웠고 미는 양도 온전히 절반으로 했는데 **여전히 겹쳐 보였다.** 이유는
     **판정을 월드 좌표의 원으로 했기 때문**이다. 화면은 위에서 비스듬히 내려다보는
     그림이라 **세로가 눌린다**(squash 0.56~0.86). 월드에서 원으로 떨어뜨려 놔도
     위아래로 선 둘은 화면에서 세로 간격이 절반으로 줄어 **그대로 포개진다.**

     그래서 **화면에서 재고 화면에서 뗀다** — 세로 차이에 squash 를 곱해 거리를
     구하고, 밀어낼 때 다시 나눠 월드로 돌린다. 눈이 보는 것과 자가 재는 것이
     같아야 「안 겹친다」가 성립한다.

     한 번 돌려서는 세 마리 이상 몰린 자리가 안 풀린다(A 를 떼면 B 에 붙는다).
     **세 번 돌린다** — 마흔 남짓이라 값이 싸다. */
  const bodies = S.minions.concat(S.mobs);
  const sq = SQUASH_VIEW;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];
        let dx = b.x - a.x, dy = (b.y - a.y) * sq;     // ← 화면에서 잰다
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d >= min) continue;
        if (d < 0.01) {                        // 완전히 포갠 경우 — 방향을 인덱스로 정해 흔들림 없이
          const ang = (i * 2.399 + j * 0.618);
          dx = Math.cos(ang); dy = Math.sin(ang); d = 1;
        }
        const push = (min - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push;  a.y -= ny * push / sq;      // ← 밀 때 월드로 되돌린다
        b.x += nx * push;  b.y += ny * push / sq;
      }
    }
  }

  // ── 죽은 것 치우기 ── **적이 죽으면 시체가 남는다**(이 게임의 자원)
  for (let i = S.mobs.length - 1; i >= 0; i--) {
    if (S.mobs[i].hp > 0) continue;
    const m = S.mobs[i];
    S.mobs.splice(i, 1);
    S.killed++;
    /* ── 떨어뜨린다 ── 확률은 **층당 기대값**에서 뽑는다(마릿수가 늘어도 총량이 안 는다).
       관문의 주인은 반드시 하나 — 큰 놈을 잡고 빈손으로 가면 관문이 벽으로만 남는다. */
    if (m.boss || Math.random() < dropChance(S.floor)) {
      const d = rollDrop(S.floor);
      S.drops.push({ ...d, x: m.x, y: m.y, t: 0, pull: 0.35 });   // 잠깐 놓였다가 빨려 온다
    }
    fall(m, "mob/" + m.kind, m.h || 48);          // 몸은 반 초 더 남아 무너진다
    /* ── 어둠의 지배(트리 끝) ── **쓰러진 자리에서 일어선다.**
       시체를 써서 세우는 것이므로 이때는 시체가 안 남는다. 서는 각도도 쓰러진 각도
       그대로다 — 압력이 센 쪽에서 죽으니 그 쪽이 저절로 두꺼워진다. */
    if (dominatePct() && !m.boss && thrallN() < thrallCap() && Math.random() < dominatePct()) {
      const hp0 = Math.round(m.hpMax * 0.6);
      S.minions.push({ id: ++seq, kind: m.kind, art: "mob/" + m.kind,
                       own: { dmg: m.dmg * MOB_CD, spd: m.spd, cd: MOB_CD, h: m.h },
                       home: Math.atan2(m.y, m.x), rad: Math.min(RING_HOLD * 1.15, Math.hypot(m.x, m.y)),
                       h: m.h, x: m.x, y: m.y, hp: hp0, hpMax: hp0, atk: 0, r: m.r,
                       /* 넘어진 그 자리에서 **다시 일어선다** — 쓰러지는 몸과 겹쳐
                          올라오므로 「죽었다가 내 편으로 섰다」가 한 동작으로 읽힌다. */
                       rise: RISE_T });
      S.fx.push({ t: RISE_T, x: m.x, y: m.y, kind: "rise" });
      say(`<b style="color:#a06ad0">${MOB_N[m.kind] || "시체"}</b> 지배 · 아군 합류`);
    } else addCorpse(m.x, m.y, m.boss ? "large" : (m.h >= 58 ? "large" : "small"));
    /* 트리 — **시체 수확**은 시체를, **영혼 흡수**는 마나를 더 준다. 둘 다
       「죽였다」에 붙는 보상이라 판을 보고 있을 이유가 된다. */
    if (harvestPct() && Math.random() < harvestPct()) addCorpse(m.x, m.y, "small");
    if (spiritMp()) S.mp = Math.min(mpMaxOf(), S.mp + spiritMp());
    META.gold += Math.round(goldFor(S.floor) * goldMulOf()) * (m.boss ? 8 : 1);
    META.xp += (m.boss ? 9 : 1) * Math.max(1, Math.round(S.floor * 0.6));
    while (META.xp >= xpNeed(META.lv)) { META.xp -= xpNeed(META.lv); META.lv++;
      S.hp = hpMaxOf(); S.mp = mpMaxOf();
      say(`<b style="color:#ffff64">레벨 ${META.lv}</b> 달성 · 체력·마나 회복`); }
  }
  for (let i = S.minions.length - 1; i >= 0; i--) {
    if (S.minions[i].hp > 0) continue;
    const dead = S.minions[i];
    S.minions.splice(i, 1);
    fall(dead, dead.art || ("minion/" + dead.kind), (dead.h || 40) * feedMul(dead));
    /* **내 소환수도 시체가 된다** — 다시 쓴다. 뼈만 남는다(살은 이미 없었다) */
    addCorpse(dead.x, dead.y, "bones");
  }

  /* ── 층이 비면 내려간다 ──
     ★ **줄도 비어야 한다.** 판 위의 적만 보면, 첫 놈이 죽는 순간 아직 안 나온
        나머지를 두고 다음 층으로 내려가 버린다. */
  if (!S.mobs.length && !(S.spawnQ && S.spawnQ.length)) {
    saveMeta();
    enterFloor(S.floor + 1);
  }
}

function die() {
  S.dead = true;
  META.runs = (META.runs | 0) + 1;
  META.deepest = Math.max(META.deepest | 0, S.floor);
  saveMeta();
  say(`<b style="color:#8b1a1a">전멸</b> · ${S.floor}층에서 쓰러짐`);
}

export function newRun() {
  Object.assign(S, {
    floor: 1, t: 0, running: true, dead: false,
    hp: hpMaxOf(), hpMax: hpMaxOf(), mp: mpMaxOf(), mpMax: mpMaxOf(),
    corpses: 3,                 // 첫 시체 셋은 그냥 준다 — 빈손이면 첫 소환을 못 한다
    minions: [], mobs: [], fx: [], bolts: [], piles: [], falling: [], nums: [],
    drops: [], loot: [], cd: {}, log: [], killed: 0, deepest: 1,
    amp: 0, pswing: 0, natk: 0, hurt: 0, hkx: 0, hky: 0, arrive: null, shake: 0,
  });
  enterFloor(1);
}
