/* ══════════════════════════════════════════════════════════════
   necro — **네크로멘서는 직접 안 싸운다.**
   ──────────────────────────────────────────────────────────────
   디아블로 2 의 그 직업이 재미있는 이유는 화력이 아니라 **군대**다.
   시체가 자원이고, 시체에서 뼈다귀가 서고, 뼈다귀가 다음 시체를 만든다.
   방치형으로 옮기면 그 고리가 그대로 엔진이 된다:

     층에 들어간다 → 소환수가 자동으로 싸운다 → 시체가 남는다
     → 시체로 더 소환한다 → 군대가 커져 다음 층을 뚫는다 → 벽에서 죽는다
     → 금·경험치로 영구히 세지고 다시 내려간다

   사람이 하는 건 **무엇을 소환할지**와 **언제 쓸지** 둘뿐이다 — 그게 방치형이다.
   ══════════════════════════════════════════════════════════ */

export const $ = (id) => document.getElementById(id);

/* ══ 소환수 ══ **셋이면 충분하다.** 종류가 많은 게 아니라 결이 달라야 군대가 된다.
   스켈레톤은 수, 구울은 몸, 골렘은 벽 — 이 셋이 서로 다른 일을 한다. */
/* **때리는 주기.** 병수님: "파파팟~ 이렇게 치는거 같은데, 파악~ 이런식으로 천천히".
   휘두름만 늘려서는 소용이 없었다 — 0.9초마다 또 치면 연타로 보이는 건 그대로다.
   주기를 1.6배 늘리고 **한 방을 그만큼 세게** 했다. 초당 피해는 그대로다:
     해골 7/0.9 = 7.8 → 12/1.5 = 8.0 · 구울 14.5 → 14.4 · 골렘 15 → 15
   즉 강해지지도 약해지지도 않고 **손맛만 무거워진다.** */
export const MINIONS = {
  skel:  { n:"해골 전사", ico:"☠", cost:1, hp:26,  dmg:12, spd:34, cd:1.5, h:52,
           d:"가장 싸고 빠름 · 머릿수로 미는 병력" },
  /* ↓ 접어 둔 둘. 소환 스킬에서 빠져 있어 지금은 판에 안 나온다(위 SKILLS 주석).
     해골이 만족스러워지면 같은 방식으로 다시 구워 되살린다. */
  ghoul: { n:"구울",     ico:"✦", cost:2, hp:64,  dmg:26, spd:30, cd:1.8, h:58,
           d:"물어뜯을 때마다 피해량의 35% 회복" },
  golem: { n:"흙 골렘",   ico:"◆", cost:5, hp:260, dmg:36, spd:19, cd:2.4, h:84,
           d:"느린 대신 두꺼움 · 앞을 막는 벽" },
};
export const MINION_IDS = Object.keys(MINIONS);

/** **적의 그림 높이.** 예전엔 `48 + (r-10)*2.6` 으로 충돌 반경에서 크기를 뽑아 썼다.
 *  그래서 반경을 그림에 맞추려 하면 그림이 따라 커지는 고리에 걸린다 — 갈라 둔다. */
/** ══ 본인의 기본공격 ══ 병수님: "중앙 네크로멘서는 기본공격이 원거리고
 *  공격스킬을 사용하는 형태로".
 *
 *  **직접 싸우게 하되 주역은 여전히 군대다.** 디아블로 2 의 네크로멘서도 뼈를 던지지만
 *  그것으로 판을 뒤집지는 않는다 — 초당 피해를 해골 한 기(8)보다 조금 위에 둔다.
 *  손이 심심하지 않을 만큼만, 군대를 대신하지는 않을 만큼만. */
export const NECRO_ATK = {
  cd: 1.2,          // 던지는 주기
  range: 270,       // 사거리 — 적이 나타나는 둘레(300)보다 조금 안쪽
  speed: 340,       // 뼈가 날아가는 속도
  dmg: (lv) => 10 + lv * 1.5,
};

export const MOB_H = { fallen: 44, zombie: 50, skelarch: 50, brute: 62, boss: 104 };
/** 적 이름 — 「어둠의 지배」로 내 편이 되면 로그에 이름이 뜬다. 그때까지는
 *  화면에 이름이 나올 일이 없어서 없었다. */
export const MOB_N = { fallen: "타락자", zombie: "좀비", skelarch: "해골 궁수", brute: "괴물", boss: "층의 주인" };
/** 그림 높이 → **발자국 반경**(월드 단위). 화면에서 스프라이트 폭의 대략 절반이
 *  발이 닿는 자리다. 충돌 반경이 10 이던 시절엔 보이는 크기(24)의 2.4분의 1이라
 *  코드는 "안 겹쳤다" 하는데 눈에는 겹쳐 보였다(병수님: "유닛 겹치는것좀 해결해라"). */
/** ★★ 여기가 세 번 지적받은 겹침의 **진짜 뿌리**였다 — **단위가 안 맞았다.**
 *  `h` 는 **화면 픽셀**(그릴 때 us 를 곱해 쓴다)인데 `x,y` 는 **월드 좌표**다.
 *  `r = h * FOOT_R` 로 만든 반경을 월드 거리와 바로 비교했으니, 화면에서 보면
 *  반경이 그림 폭의 **1/3** 밖에 안 됐다(월드→화면 환산 sc≈0.44 를 빠뜨린 것).
 *  값을 그 환산분만큼 키워 **그림 폭과 반경이 맞도록** 한다. 겹침 자로 잰다. */
export const FOOT_R = 0.62;
/** 화면이 세로로 눌리는 비율(main.js 가 0.56~0.86 사이에서 정한다)의 **대표값**.
 *  겹침 판정은 눈이 보는 화면에서 해야 하므로 전투 쪽도 이 값을 알아야 한다.
 *  가장 눌리는 쪽(0.56)에 가깝게 잡아 두면 어느 화면에서도 덜 겹친다 — 남는 건
 *  「조금 더 떨어져 있다」뿐이고, 모자라면 「겹쳐 보인다」가 된다. */
export const SQUASH_VIEW = 0.78;

/* ══ 시체는 **한 구 한 구 달라 보여야 한다** ══
   그림이 세 장(small · large · bones)뿐이라, 깊은 층에서 백 구가 쌓이면 **같은 그림이
   격자처럼 반복**돼 자원 더미가 아니라 무늬로 보인다. 그림을 더 굽는 건 비싸고 위험하니
   (골렘 애니에서 세 판을 태웠다) **개체마다 흔들어** 반복을 깬다 — 색·각도·크기·좌우.
   그중 색이 제일 크게 먹는다: 같은 실루엣도 얼룩이 다르면 눈이 다른 놈으로 센다.
   ★ 알파는 낮게(0.14~0.26) — 세게 물들이면 픽셀 그림의 명암이 뭉개져 얼룩만 남는다. */
export const CORPSE_TINT = [
  null,                  // 원본 그대로 — 기준이 하나는 있어야 나머지가 「변주」로 읽힌다
  ["#3a1f14", 0.24],     // 마른 피 · 흙빛
  ["#1d2740", 0.22],     // 식어 푸르뎅뎅한 것
  ["#2f3a1c", 0.20],     // 삭아 이끼 낀 것
  ["#5a4a34", 0.18],     // 먼지를 뒤집어쓴 것
  ["#0e0a0c", 0.26],     // 오래돼 검게 잠긴 것
];

/* ══ 스킬 벨트 ══ D2 의 그 띠. **시체를 쓰는 것과 안 쓰는 것**으로 갈린다 —
   시체가 자원이라는 게 벨트에서 바로 읽혀야 한다. */
/* ★ 병수님: "해골만 제대로 만들고, **해골소환만 가능하도록** 해줘 — 한번에 여러개 다
   만족스럽게 만들기 어려우니 하나만 제대로 만들고, 나머지도 잘만든 케이스를 참고하게".
   구울·골렘 소환을 **뺀다.** 지운 게 아니라 접어 둔 것이다 — 해골이 만족스러워지면
   그 방식(v3 8방향 · 무기를 든 채 휘두르는 공격 애니)을 그대로 따라 되살린다.
   MINIONS 표의 ghoul/golem 도 남겨 둔다. 되살릴 때 수치를 다시 정하지 않아도 되게. */
/* ★★ 병수님: "레벨이 오르면서 더 좋은 소환수를 뽑을 수 있게 (스킬트리 형태로)
   ... 내가 직접 스킬트리를 찍어서 나만의 빌드를 구성하는거지".

   구울·골렘은 **지우지 않고 접어 뒀던 것**이라 여기서 그대로 되살아난다 —
   스프라이트 8방향도 아이콘도 이미 구워져 있다. 벨트에 나오는 스킬은 이제
   **찍은 것만**이다(syncSkills). 배열을 바꿔 끼우지 않고 **속을 갈아 끼운다** —
   여기저기서 `SKILLS` 를 import 해 두었으므로 참조가 살아 있어야 한다. */
const ALL_SKILLS = [
  { id:"raise", n:"해골 되살리기", ico:"☠", mp:6,  cd:1.2, corpse:1, d:"시체 1 → 해골 전사 1" },
  { id:"ghoul", n:"구울 되살리기", ico:"✦", mp:12, cd:2.0, corpse:1, d:"시체 1 → 구울 1", need:"ghoul" },
  { id:"golem", n:"흙 골렘",      ico:"◆", mp:30, cd:6.0, corpse:1, d:"시체 1 → 흙 골렘 1", need:"golem" },
  { id:"nova",  n:"시체 폭발",    ico:"✹", mp:18, cd:2.2, corpse:1, d:"시체 1 → 주위 광역 피해" },
  { id:"amp",   n:"약화의 저주",  ico:"✜", mp:12, cd:8,   corpse:0, d:"일정 시간 적이 받는 피해 증가" },
];
export const SKILLS = [];
export function syncSkills() {
  SKILLS.length = 0;
  for (const s of ALL_SKILLS) if (!s.need || rank(s.need) > 0) SKILLS.push(s);
}
/** 소환 스킬인가 — 군세 상한을 보는 것들. */
export const isRaise = (id) => id === "raise" || id === "ghoul" || id === "golem";
export const MINION_OF = { raise:"skel", ghoul:"ghoul", golem:"golem" };

/* ══ 층 ══ 깊이가 곧 난이도이자 보상이다. 5층마다 **관문**(보스). */
export const floorHp   = (f) => Math.round(30 * Math.pow(1.19, f - 1));
export const floorDmg  = (f) => Math.round(4  * Math.pow(1.155, f - 1));
export const floorN    = (f) => 5 + Math.floor(f * 0.7);
export const isGate    = (f) => f % 5 === 0;
export const goldFor   = (f) => Math.round(6 * Math.pow(1.12, f - 1));

/** 한 번의 내려감(run) 동안만 사는 값. **금·레벨은 여기 없다** — META 에 있다. */
export const S = {
  floor: 1, t: 0, speed: 1, running: true, dead: false,
  spawnQ: [], spawnT: 0,          // 적이 나오려고 서 있는 줄(한 번에 짠 하고 안 나온다)
  hp: 100, hpMax: 100, mp: 40, mpMax: 40,
  corpses: 0,                 // **시체가 자원이다**
  piles: [],                  // 판 위에 실제로 누워 있는 시체들 — 개수는 corpses 와 함께 움직인다
  minions: [], mobs: [], fx: [],
  /** **쓰러지는 중인 몸.** 셈에서는 이미 빠졌고(그래서 때리지도 맞지도 않는다)
   *  화면에만 잠깐 남는다 — 툭 사라지는 대신 무너져 시체가 되는 그 반 초. */
  falling: [],
  /** 떠오르는 피해 숫자. **얼마나 아팠는지**가 판에 없으면 강화를 해도 똑같아 보인다. */
  nums: [],
  bolts: [],                  // **본인이 던진 뼈** — 날아가는 중인 것
  natk: 0,                    // 다음 기본공격까지 남은 시간
  hurt: 0, hkx: 0, hky: 0,    // 본인이 맞고 움찔하는 시간·밀리는 방향
  drops: [],                  // 판에 떨어져 아직 안 빨려 들어온 전리품
  loot: [],                   // 이번 판에 얻은 것 — 정산 화면이 읽는다
  cd: {}, log: [], killed: 0, deepest: 1,
  /** ══ 「들어섰다」 ══ **한 번 켜지고 스스로 꺼지는 상태.** 층이 바뀌는 가장 큰
   *  사건(내려간다·관문이다)이 로그 글줄 하나로만 지나갔다 — 방치형은 보는 게임이라
   *  판에 흔적이 남아야 한다. enterFloor 가 켜고(= {t,f,gate}), step 이 t 를 줄여
   *  0 이 되면 스스로 null 로 꺼진다. main.js draw 마지막이 이걸 보고 비네트·명패·
   *  빛의 띠를 얹는다. */
  arrive: null,
  /** 관문 보스가 서는 순간 판이 아주 짧게 흔들리는 시간(캔버스만 — HUD·벨트는 DOM). */
  shake: 0,
};

export const META_KEY = "necro.meta.v1";
export const META = load();
function load() {
  const base = { gold: 0, lv: 1, xp: 0, deepest: 1, runs: 0,
                 up: { hp:0, mp:0, dmg:0, army:0 },
                 /* 낀 것 셋. **등급 숫자가 아니라 개체다** — {k, tier, af:[{id,v}]}.
                    옵션이 랜덤이면 같은 4등급이라도 물건마다 달라야 하므로, 슬롯에
                    숫자를 적어 두는 것으로는 표현할 수가 없다. */
                 equip: { wand:null, robe:null, charm:null },
                 bag: [],
                 /* 찍은 것 — { 노드id: 랭크 }. **남은 점수는 저장하지 않는다**(아래
                    spLeft 참조): 레벨에서 나오는 총량에서 쓴 것을 빼면 되므로,
                    옛 저장에도 저절로 맞고 어긋날 여지가 없다. */
                 tree: {} };
  /* ★ 얕은 Object.assign 이라 **중첩된 것은 통째로 덮인다** — 예전 저장에 gear 가 없으면
     통째로 사라지는 게 아니라, 있으면 통째로 옛것이 된다. up/gear 는 따로 합친다.
     안 그러면 새 항목을 더할 때마다 기존 사용자에게 undefined 가 간다. */
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) || "{}");
    const m = Object.assign(base, raw);
    m.up    = Object.assign({}, base.up,    raw.up    || {});
    m.equip = Object.assign({}, base.equip, raw.equip || {});
    m.tree  = Object.assign({}, base.tree,  raw.tree  || {});
    m.bag   = Array.isArray(raw.bag) ? raw.bag : [];
    /* ★ 옛 저장은 `gear: {wand:2,…}` 라는 **등급 숫자**를 갖고 있다. 그것을 옵션 없는
       개체로 올려 준다 — 세이브를 깨면 지금까지 굴린 것이 통째로 사라진다.
       raw.equip 이 이미 있으면 손대지 않는다(두 번 올리면 안 된다). */
    if (!raw.equip && raw.gear) {
      for (const k of ["wand", "robe", "charm"]) {
        const t = raw.gear[k] | 0;
        if (t > 0) m.equip[k] = { k, tier: t, af: [] };
      }
    }
    delete m.gear;                   // 두 개의 진실을 남기지 않는다 — 거울은 어긋난다
    return m;
  }
  catch { return base; }
}
export function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch { /* 시크릿 창 */ }
}

/* ══ 이번 판의 스냅샷 ══ ④ 정산 화면이 읽는다. **S 가 아니라 여기에 굳힌다** —
   S.loot 는 다음 던전 입장(newRun)이 [] 로 비우므로, 판이 끝나는 순간(die) 복사해
   두지 않으면 「이번 판에 얻은 것」이 통째로 사라진다. META 처럼 판을 넘어 산다. */
export const LASTRUN = { has: false, loot: [], gold: 0, xp: 0, killed: 0, floor: 1, leveled: false };

export const xpNeed  = (lv) => Math.round(20 * Math.pow(1.35, lv - 1));
/** 강화는 **넷뿐이다.** 목록이 길면 방치형이 아니라 표 읽기가 된다. */
export const UPS = {
  hp:   { n:"생명력",   d:"최대 체력 +25",     base:14 },
  mp:   { n:"기력",     d:"최대 마나 +8",      base:16 },
  dmg:  { n:"어둠의 힘", d:"소환수 피해 +8%",  base:22 },
  army: { n:"군세",     d:"소환수 상한 +1",    base:40 },
};
export const upCost = (k) => Math.round(UPS[k].base * Math.pow(1.55, META.up[k] || 0));

/* ══ 장비 ══ 병수님: "마을에서 아이템 구매 / 강화 등을 진행할 수 있게".
   **강화(UPS)와 겹치지 않게 축을 나눈다** — 강화는 «몸»을 키우고, 장비는 «손에 든 것»을
   바꾼다. 장비는 **등급을 사는 것**이라 한 번 사면 끝이고(반복 구매가 아니다), 그래서
   상점에 갈 이유가 「다음 등급이 열렸다」로 분명해진다.
   등급마다 값이 뛰므로 **한 번의 구매가 사건**이 된다 — 조금씩 오르는 강화와 다른 맛. */
export const GEAR = {
  wand:  { n:"지팡이", d:"본인 기본 공격력",
           tiers:["뼈 지팡이","녹슨 홀","흑요석 홀","심장의 홀","왕의 홀"],
           cost:[0, 90, 320, 1100, 3800], val:[0, 0.25, 0.6, 1.1, 1.9] },
  robe:  { n:"망토",   d:"최대 체력",
           tiers:["누더기","가죽 망토","사슬 망토","제의","왕의 제의"],
           cost:[0, 80, 300, 1000, 3500], val:[0, 40, 110, 260, 560] },
  charm: { n:"부적",   d:"마나 회복",
           tiers:["없음","뼛조각","은 부적","영혼석","군주의 인장"],
           cost:[0, 120, 420, 1400, 4600], val:[0, 0.6, 1.5, 3.0, 5.2] },
};

/* ══ 던전에서 떨어지는 것 ══ 병수님 취향의 한가운데(뽑기·숫자가 불어나는 맛)인데
   지금 판에서 얻는 건 금·경험치 **숫자뿐**이었다. 장비는 상점에서 등급을 사는
   사다리라 평생 열두 번 누르면 끝이고, 「한 판 더」를 만드는 것이 없었다.

   **새 화폐를 만들지 않는다** — 이미 있는 장비(GEAR) 등급을 드랍으로 얻게 한다.
   그러면 등급 색·이름·능력치가 전부 그대로 재사용되고, 상점은 「못 만난 것을 사는 곳」
   으로 뜻이 오히려 분명해진다.

   ★ 드랍률을 **처치당 확률**로 두면 마릿수와 함께 움직인다 — rtd 에서 밀도를 올리자
     전리품이 같이 늘어 난이도를 올리려던 것이 되레 쉬워진 적이 있다. 그래서 여기서는
     **층당 기대값**으로 잡고(층에 몇 마리가 서든 한 층에서 기대 DROP_PER_FLOOR 개),
     처치 확률은 그 층의 마릿수로 나눠 정한다. */
export const DROP_PER_FLOOR = 0.55;         // 한 층에서 기대되는 전리품 개수
export const dropChance = (f) => DROP_PER_FLOOR / Math.max(1, floorN(f));
/** 이 층에서 나올 수 있는 **제일 높은 등급.** 깊이가 곧 좋은 물건이다.
 *  5층마다 한 단계 — 20층이면 마지막 등급까지 나온다. */
export const dropTierCap = (f) => Math.min(4, 1 + Math.floor(f / 5));
export const GEAR_KEYS = Object.keys(GEAR);
/** 떨어진 물건 하나를 뽑는다 — {슬롯 k, 등급 tier}. 낮은 등급이 더 흔하다.
 *  ★★ 등급 이름을 `t` 로 뒀다가 **판 위의 나이(t)와 부딪혔다** — 떨어진 물건에
 *  `{...d, t: 0}` 로 나이를 얹는 순간 등급이 0 이 되고, 나이가 흐르면 등급이
 *  1.06 같은 **소수**가 됐다(그 값으로 cost 를 읽어 금이 NaN 이 됐다).
 *  자가 「장비_후 1.0666」을 뱉어서 잡혔다 — 이름은 뜻이 다르면 달라야 한다. */
export function rollDrop(f) {
  const k = GEAR_KEYS[Math.floor(Math.random() * GEAR_KEYS.length)];
  const cap = dropTierCap(f);
  /* 위쪽 등급일수록 드물게 — 제곱으로 눌러 「높은 게 나왔다」가 사건이 되게. */
  const tier = 1 + Math.floor(Math.pow(Math.random(), 2.1) * cap);
  return mkItem(k, Math.min(cap, tier));
}

/* ══ 붙는 것(옵션) ══ 병수님: "디아블로처럼 아이템의 등급과 능력치가 랜덤하게 붙는"
   등급만 있으면 얻을 수 있는 것이 **슬롯 3 × 4단계 = 열두 번**뿐이라 30분이면 천장에
   닿고 그 뒤로 떨어지는 건 전부 금이었다(20분 재 보니 주운 22개 중 15개가 이미 금).
   디아블로 2 가 등급 **위에** 옵션을 얹은 자리가 여기다 — 같은 4등급이라도 붙은 것이
   달라서 **더 좋은 4등급**이 나올 수 있으면 파밍에 끝이 없다.

   ★ 옵션은 **이미 있는 수치에만** 붙인다. 새 수치를 만들면 그것을 보여 줄 새 화면이
     또 필요해진다 — 여섯 개 전부 hpMaxOf/mpRegenOf/dmgMulOf/armyCap/goldFor 로 들어간다.
   r 은 **1등급 기준 폭**이고 등급이 오르면 같이 커진다(afMul). w 는 점수 무게 —
   좋은 옵션 셋(≈90)이 **한 등급(100)보다 살짝 모자라게** 맞췄다. 그래야 등급이
   여전히 뼈대이고, 옵션은 **같은 등급끼리를 가르는** 눈금이 된다. */
export const AFFIX = {
  dmg:  { n:"본인 피해",   u:"%",   pre:"잔혹한", w:0.9,  r:[6, 18],   p:1 },
  mdmg: { n:"소환수 피해", u:"%",   pre:"호령하는", w:0.75, r:[8, 22],   p:1 },
  hp:   { n:"최대 체력",   u:"",    pre:"단단한", w:0.15, r:[30, 90],  p:1 },
  mp:   { n:"마나 회복",   u:"/초", pre:"흐르는", w:11,   r:[0.5, 1.6],p:1 },
  gold: { n:"금 획득",     u:"%",   pre:"탐욕스런", w:0.5,  r:[10, 30],  p:0.9 },
  /* 군세 +1 은 판이 눈에 띄게 바뀌므로 **드물게**, 그리고 등급이 올라도 1 그대로(flat). */
  army: { n:"군세 상한",   u:"",    pre:"거느리는", w:38,   r:[1, 1],    p:0.28, flat:true },
};
const AF_KEYS = Object.keys(AFFIX);
const afMul = (tier) => 0.6 + 0.35 * tier;            // 1등급 0.95 → 4등급 2.0
/** 등급이 높을수록 **많이** 붙는다. 1등급 0~1 · 4등급 3(상한). */
function afCount(tier) {
  return Math.min(3, Math.max(0, tier - 1 + (Math.random() < 0.35 ? 1 : 0)));
}
function rollAffix(tier, taken) {
  const pool = AF_KEYS.filter((id) => !taken.includes(id));
  let tot = 0; for (const id of pool) tot += AFFIX[id].p;
  let r = Math.random() * tot, id = pool[pool.length - 1];
  for (const c of pool) { r -= AFFIX[c].p; if (r <= 0) { id = c; break; } }
  const a = AFFIX[id];
  /* ★ 군세만 등급으로 안 키운다. 처음엔 다 같이 곱했더니 4등급에서 +2 가 나왔고,
     셋을 끼면 상한이 6→12 로 **두 배**가 됐다 — 옵션 하나가 판을 통째로 바꾸면
     그건 옵션이 아니라 다른 게임이다. 뽑기가 드문 것으로 값어치를 지킨다. */
  const raw = (a.r[0] + Math.random() * (a.r[1] - a.r[0])) * (a.flat ? 1 : afMul(tier));
  return { id, v: id === "mp" ? Math.round(raw * 10) / 10 : Math.max(1, Math.round(raw)) };
}
/** 물건 하나를 만든다. `plain` 이면 옵션 없이 — **상점이 파는 것이 그것이다**.
 *  상점은 바닥이고 던전이 천장이어야 「한 판 더」가 산다. */
export function mkItem(k, tier, plain = false) {
  const af = [];
  if (!plain) { const n = afCount(tier); for (let i = 0; i < n; i++) af.push(rollAffix(tier, af.map((x) => x.id))); }
  return { k, tier, af };
}
/** 물건끼리 견주는 **하나의 자.** 자동 착용·자동 처분이 전부 이걸 본다 —
 *  자가 여럿이면 「왜 이게 안 끼워졌지」가 설명이 안 된다. */
export const scoreOf = (it) =>
  !it ? -1 : it.tier * 100 + it.af.reduce((s, a) => s + (AFFIX[a.id]?.w || 0) * a.v, 0);
/** 이름 — 제일 센 옵션이 앞에 붙는다(디아블로의 접두사).
 *  ★ 접두사는 **「~의」로 끝내지 않는다.** 등급 이름 절반이 이미 「심장의 홀」·「왕의 제의」
 *  처럼 「의」로 끝나서 「군단의 심장의 홀」이 됐다 — 관형형(잔혹한·흐르는)으로만 쓴다. */
export function nameOf(it) {
  if (!it) return "없음";
  const base = GEAR[it.k].tiers[it.tier];
  if (!it.af.length) return base;
  const top = it.af.slice().sort((a, b) => (AFFIX[b.id].w * b.v) - (AFFIX[a.id].w * a.v))[0];
  return `${AFFIX[top.id].pre} ${base}`;
}
export const afText = (a) =>
  `${AFFIX[a.id].n} +${a.v}${AFFIX[a.id].u}`;

export const equipped = (k) => META.equip[k] || null;
export const gearTier = (k) => (equipped(k)?.tier) | 0;
/** 낀 것 셋에 붙은 같은 옵션을 모두 더한다. */
export function afSum(id) {
  let s = 0;
  for (const k of GEAR_KEYS) for (const a of (equipped(k)?.af || [])) if (a.id === id) s += a.v;
  return s;
}
/* ══ 가방 ══ 병수님: "12칸. 차면 **점수가 제일 낮은 것부터** 저절로 금이 된다."
   방치형이므로 **격자·드래그를 만들지 않는다** — 기본은 자동이고 손은 선택이다.
   차면 스스로 제일 나쁜 것을 녹여 자리를 낸다. 그래서 가방이 넘쳐 판이 멈추는 일이 없다. */
export const BAG_MAX = 12;
/** 물건을 녹여 얻는 금. 예전엔 takeDrop 안에 `cost*0.22` 로 박혀 있던 식이다 —
 *  이제 가방(bagPut)도 같은 값으로 녹이므로 **두 곳에 같은 식을 두지 않으려** 여기 모은다. */
export const meltGold = (it) => Math.round(GEAR[it.k].cost[it.tier] * 0.22);

/** 가방에 넣는다. 12칸을 넘으면 **점수가 제일 낮은 것부터** 금으로 녹인다(넘친 만큼 반복).
 *  방금 넣은 그것이 제일 나쁘면 그 자리에서 녹아 없어질 수도 있다 — 그래서 「가방에 남았나」는
 *  부르는 쪽이 `META.bag.includes(it)` 로 확인한다. 녹은 금은 여기서 바로 META.gold 에 더하고,
 *  **녹인 목록**(로그가 「무엇이 얼마에 녹았는지」를 말할 수 있게)을 돌려준다. */
export function bagPut(it) {
  META.bag.push(it);
  const melted = [];
  while (META.bag.length > BAG_MAX) {
    let lo = 0;                                   // 점수가 제일 낮은 칸을 찾아 녹인다
    for (let i = 1; i < META.bag.length; i++)
      if (scoreOf(META.bag[i]) < scoreOf(META.bag[lo])) lo = i;
    const [gone] = META.bag.splice(lo, 1);
    const gold = meltGold(gone);
    META.gold += gold;
    melted.push({ n: nameOf(gone), gold, tier: gone.tier });
  }
  return melted;
}

/** 주웠을 때 무슨 일이 일어나는가. 점수가 높으면 **그 자리에서 갈아 끼우고**(방치형이므로
 *  고르라고 세우지 않는다) 벗은 것은 가방으로, 아니면 곧장 가방으로 — 빈손으로 돌려보내지 않는다.
 *  어느 쪽이든 가방이 넘쳐 녹은 것이 있으면 그 금은 bagPut 이 이미 META.gold 에 더했고,
 *  여기서는 로그가 쓰도록 합만 돌려준다.
 *  돌려주는 값: worn(갈아 끼웠나) · gold(이번에 녹은 금의 합) · bagged(주운 그것이 가방에 남았나) ·
 *  melted(녹인 목록 {n,gold,tier}). */
export function takeDrop(d) {
  const it = { k: d.k, tier: d.tier, af: d.af || [] };
  let worn = false, melted = [];
  if (scoreOf(it) > scoreOf(equipped(d.k))) {
    const old = equipped(d.k);
    META.equip[d.k] = it; worn = true;
    if (old) melted = bagPut(old);               // 벗은 것을 가방으로(빈손이면 안 넣는다)
  } else {
    melted = bagPut(it);                          // 가방으로 — 넘치면 제일 나쁜 것부터 녹는다
  }
  const gold = melted.reduce((s, m) => s + m.gold, 0);
  return { worn, gold, bagged: META.bag.includes(it), melted };
}

/** 가방의 i번을 끼고 벗은 것을 가방에 넣는다. ③ 상태창이 쓸 손잡이 하나 —
 *  **화면·격자·드래그는 여기서 만들지 않는다**(방치형이라 기본은 자동, 손은 선택이다). */
export function equipFromBag(i) {
  const it = META.bag[i];
  if (!it) return false;
  META.bag.splice(i, 1);
  const old = equipped(it.k);
  META.equip[it.k] = it;
  if (old) META.bag.push(old);                   // 벗은 것은 가방으로(빈손이면 안 넣는다)
  saveMeta();
  return true;
}

/** 다음 등급 값. 마지막이면 null(더 살 것이 없다). */
export const gearNext = (k) => {
  const t = gearTier(k) + 1;
  return t < GEAR[k].tiers.length ? t : null;
};
export const gearVal = (k) => GEAR[k].val[gearTier(k)];
export const hpMaxOf  = () => 100 + (META.up.hp | 0) * 25 + (META.lv - 1) * 8
                            + gearVal("robe") + afSum("hp");
export const mpMaxOf  = () => 40  + (META.up.mp | 0) * 8  + (META.lv - 1) * 3;
/** 마나가 차는 속도 — 부적이 올린다. */
export const mpRegenOf = () => 2.2 + (META.up.mp | 0) * 0.25 + gearVal("charm") + afSum("mp");
export const dmgMulOf = () => (1 + (META.up.dmg | 0) * 0.08 + (META.lv - 1) * 0.03)
                            * (1 + rank("bone") * 0.10);
/* dmgMulOf 는 **둘 다에게 걸리는 바탕**이다(레벨·강화·뼈 트리). 옵션은 그 위에서
   갈라진다 — 안 그러면 「본인 피해」가 소환수까지 올려서 이름이 거짓말이 된다. */
export const selfMulOf   = () => 1 + afSum("dmg") / 100;
/** 소환수 피해는 본인과 **다른 옵션**이 올린다 — 빌드가 갈리는 자리다. */
export const minionMulOf = () => 1 + afSum("mdmg") / 100;
export const goldMulOf   = () => 1 + afSum("gold") / 100;
/** ③ 상태창이 읽는 **합친 피해 배수.** 판에서 본인은 `dmgMulOf()×selfMulOf()`,
 *  소환수는 `dmgMulOf()×minionMulOf()` 로 맞으므로(battle.js), 화면이 그 식을 다시
 *  쓰지 않게 여기 한 곳에 모은다 — 같은 식이 두 곳에 있으면 언젠가 갈라진다. */
export const selfDmgMul   = () => dmgMulOf() * selfMulOf();
export const minionDmgMul = () => dmgMulOf() * minionMulOf();
export const armyCap  = () => 6 + (META.up.army | 0) + rank("legion") + afSum("army");
/* 지배한 놈은 **상한 밖에 선다.** 처음엔 상한 안에 넣었더니 자동 소환이 자리를
   먼저 채워서 90초를 굴려도 한 마리밖에 안 섰다 — 찍고도 안 보이면 없는 것과 같다.
   따로 넷까지 두면 층마다 「이번엔 무엇을 부리나」가 눈에 보인다. */
export const thrallCap = () => rank("dark") * 4;
/** 상한에 세는 것은 **내가 소환한 것만.** 지배한 놈까지 세면 자리를 빼앗아
 *  「지배할수록 해골을 못 세운다」가 된다 — 상을 벌로 만들면 안 된다. */
export const armyN    = () => S.minions.reduce((a, u) => a + (u.own ? 0 : 1), 0);
export const thrallN  = () => S.minions.reduce((a, u) => a + (u.own ? 1 : 0), 0);


/* ══════════════════════════════════════════════════════════════
   ══ 스킬 트리 ══ 병수님: "레벨이 오르면서 더 좋은 소환수를 뽑을 수 있게
   (스킬트리 형태로) ... 내가 직접 스킬트리를 찍어서 나만의 빌드를 구성하는거지"
   ──────────────────────────────────────────────────────────────
   **강화(대장간)·장비(상인)와 축이 겹치면 안 된다.** 셋을 이렇게 나눈다:

     대장간 = «몸»을 키운다 (금, 무한, 조금씩)
     상인   = «손에 든 것»을 바꾼다 (금, 다섯 등급, 한 번이 사건)
     트리   = «무엇을 할 수 있는가»를 정한다 (레벨, **되돌릴 수 없음**, 갈림길)

   되돌릴 수 없어야 빌드다. 금으로 사는 것은 결국 다 사게 되지만, 레벨에서 나오는
   점수는 **모자라므로 골라야 한다** — 그 모자람이 「나만의 빌드」를 만든다.
   세 줄기를 서로 다른 놀이로 잡았다:

     군세 — 소환수를 늘리고 종류를 연다(구울·골렘). 물량으로 미는 빌드
     시체 — 시체를 더 얻고 더 크게 터뜨린다. 시체가 자원이라는 축을 끝까지 민다
     주술 — 본인이 싸우고 저주로 판을 흔든다. 손이 바쁜 빌드

   요구 레벨과 선행이 걸려 있어 **아래로 파려면 위를 찍어야** 한다 — 그래서 셋 다
   반쯤 찍는 것보다 하나를 깊게 파는 쪽이 세다. 그게 선택이 되는 조건이다.
   ══════════════════════════════════════════════════════════ */
export const TREE = [
  { k:"army", n:"군 세", nodes:[
    { id:"bone",   n:"뼈의 힘",    max:5, lv:1,  d:"소환수 피해 +10%" },
    { id:"armor",  n:"뼈 갑주",    max:5, lv:3,  req:"bone",   d:"소환수 체력 +12%" },
    { id:"ghoul",  n:"구울 되살리기", max:1, lv:6,  req:"armor",  d:"구울 소환 해금 · 물어뜯을 때마다 체력 회복", big:1 },
    { id:"legion", n:"군단",      max:3, lv:10, req:"ghoul",  d:"소환수 상한 +1" },
    { id:"golem",  n:"흙 골렘",    max:1, lv:16, req:"legion", d:"흙 골렘 소환 해금 · 느린 대신 두꺼운 벽", big:1 },
  ]},
  { k:"corpse", n:"시 체", nodes:[
    { id:"rot",     n:"부패",      max:5, lv:1,  d:"시체 폭발 피해 +15%" },
    { id:"harvest", n:"시체 수확",  max:5, lv:4,  req:"rot",     d:"적 처치 시 12% 확률로 시체 1 추가" },
    { id:"cheap",   n:"값싼 죽음",  max:4, lv:8,  req:"harvest", d:"모든 스킬 마나 소모 -10%" },
    { id:"chain",   n:"연쇄 폭발",  max:3, lv:12, req:"cheap",   d:"시체 폭발 범위 +25%" },
    { id:"feast",   n:"시체 잔치",  max:1, lv:18, req:"chain",   d:"시체 폭발이 소환수 체력 회복 · 먹을수록 <b>몸집 성장</b>(최대 +40%)", big:1 },
  ]},
  { k:"hex", n:"주 술", nodes:[
    { id:"wand",   n:"뼈 다루기",  max:5, lv:1,  d:"본인 기본 공격력 +12%" },
    { id:"swift",  n:"빠른 손",    max:4, lv:5,  req:"wand",   d:"모든 스킬 재사용 -7%" },
    { id:"deep",   n:"깊은 저주",  max:4, lv:9,  req:"swift",  d:"저주 지속 +3초 · 증폭 +8%" },
    { id:"spirit", n:"영혼 흡수",  max:4, lv:13, req:"deep",   d:"적 처치 시 마나 +2" },
    { id:"dark",   n:"어둠의 지배", max:1, lv:20, req:"spirit", d:"적 처치 시 30% 확률로 <b>아군화</b> · 상한 밖 최대 4기", big:1 },
  ]},
];
const NODE = {};
for (const c of TREE) for (const nd of c.nodes) NODE[nd.id] = nd;
export const nodeOf = (id) => NODE[id];

export const rank = (id) => META.tree[id] | 0;
/** 점수는 **레벨에서 나온다** — 레벨 2부터 한 점씩. */
export const spTotal = () => Math.max(0, META.lv - 1);
export const spUsed  = () => Object.values(META.tree).reduce((a, b) => a + (b | 0), 0);
export const spLeft  = () => spTotal() - spUsed();

/** 찍을 수 있나. 못 찍으면 **왜 못 찍는지**를 돌려준다 — 회색으로만 두면 답답하다. */
export function takeWhy(id) {
  const nd = NODE[id]; if (!nd) return "없는 것";
  if (rank(id) >= nd.max) return "최대 단계";
  if (META.lv < nd.lv) return `레벨 ${nd.lv} 이상 필요`;
  if (nd.req && rank(nd.req) === 0) return `선행 필요 · ${NODE[nd.req].n}`;
  if (spLeft() <= 0) return "남은 점수 없음";
  return null;
}
export function take(id) {
  if (takeWhy(id)) return false;
  META.tree[id] = rank(id) + 1;
  syncSkills(); saveMeta();
  return true;
}

/* ── 트리가 판에 미치는 값들 ── **한 곳에 모아 둔다.** 흩어 놓으면 노드를 더할 때마다
   어디를 고쳐야 하는지 찾아다니게 된다. */
export const minionHpMul = () => 1 + rank("armor") * 0.12;
export const novaDmgMul  = () => 1 + rank("rot") * 0.15;
export const novaRadMul  = () => 1 + rank("chain") * 0.25;
export const mpCostMul   = () => Math.pow(0.90, rank("cheap"));
/** 스킬 한 번의 **실제** 마나. 쓸 수 있는지 보는 곳(벨트)과 빼는 곳(cast)이
 *  반드시 같은 식을 봐야 한다 — 어긋나면 「눌리는데 안 나감」이 된다. */
export const mpCost = (sk) => Math.round(sk.mp * mpCostMul());
export const cdMul       = () => Math.pow(0.93, rank("swift"));
export const wandMul     = () => 1 + rank("wand") * 0.12;
export const ampSecs     = () => 8 + rank("deep") * 3;
export const ampPower    = () => 1.4 + rank("deep") * 0.08;   // 저주가 올리는 피해 배수
export const harvestPct  = () => rank("harvest") * 0.12;
export const spiritMp    = () => rank("spirit") * 2;
export const feastOn     = () => rank("feast") > 0;

/* ══ 두 줄기의 끝을 «숫자»에서 «생김새»로 옮긴다 ══
   군세 줄기만 끝에서 새것(구울·골렘)이 열리고 나머지 둘은 끝까지 파도 배수만 커졌다.
   그러면 트리가 셋처럼 보여도 정답은 하나다. 끝 노드는 **판 위의 군대가 눈에 띄게
   달라지는 것**이어야 「내 빌드」가 된다.

   시체 잔치 — 폭발로 먹인 소환수가 **커진다.** 시체를 어디에 쓸지가 회복이자 성장이 된다.
   어둠의 지배 — 쓰러진 적이 **그 자리에서 내 편으로 선다.** 군대의 구성 자체가 층마다
                 달라진다(브루트를 부리는 판과 궁수를 부리는 판이 다르다).
   ★ 지배한 놈은 **시체를 남기지 않는다** — 시체를 써서 세운 것이므로. */
export const FEED_MAX   = 8;                    // 여덟 번까지만 먹는다(끝없이 크면 화면을 덮는다)
export const feedStep   = 0.05;                 // 한 번에 몸 +5% (여덟이면 +40%)
export const feedMul    = (u) => 1 + Math.min(FEED_MAX, u.fed | 0) * feedStep;
export const dominatePct = () => rank("dark") ? 0.30 : 0;

syncSkills();
