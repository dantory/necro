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
/** ══ 걸음 배수 ══ 병수님: "소환수 이동 속도 너무느림".
 *  화면 픽셀로 재 보니 해골이 **초당 제 몸 폭의 0.51배** — 제 몸 하나 지나는 데 2초다.
 *  적(타락자 0.80 · 좀비 0.74 · 해골궁수 0.70)보다도 느려서 **판에서 제일 굼떴다.**
 *  사람이 걷는 느낌은 1.2~2.0배다. 종마다 따로 만지지 않고 **표의 값에 한 번 곱한다** —
 *  해골은 빠르고 골렘은 느린 결(34/30/19)을 그대로 두고 바닥만 올린다. */
export const MINION_SPD = 1.6;
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
  /* ══ 시체 소비처 셋(2단계 ⑥) ══ 소환·폭발뿐이던 시체를 쓰는 길을 넓힌다. 성격이
     겹치지 않게: burn 은 넘칠 때 마나로, wall 은 길목을 막고, offer 는 관문에서만.
     기술 틀(SKILLS) 안에 넣어 소모/재사용/마나 검사가 cast() 한 자리를 지나게 한다. */
  { id:"burn",  n:"시체 태우기", ico:"✷", mp:0,  cd:3.0, corpse:4,  d:"시체 4 → 마나 (넘칠 때만 이득)" },
  { id:"wall",  n:"백골 벽",     ico:"▤", mp:14, cd:9.0, corpse:8,  d:"시체 8 → 길목을 막는 뼈 벽(때리지 않고 막기만)" },
  { id:"offer", n:"제물",        ico:"❖", mp:20, cd:12,  corpse:16, d:"관문에서 시체 16 → 주인이 받는 피해 증가" },
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
/* ★ 처음 몇 분이 **저항이 없었다.** 병수님 2026-08-13: "초반인데 너무 강해, 강해지는
   속도도 너무 빠르고, 천천히 조금씩 성장하면서 강해지는 맛이 있어야지".
   tools/early_curve.mjs 로 재 보니 10초에 이미 군세가 상한(6)이고 화력이 적 체력의
   **두 배**였다 — 한 층이 5초에 끝나고 5분 동안 한 번도 안 죽었다.
   밑을 30→46 으로 올려 **첫 층부터 한 방에 안 죽게** 한다. 배수(1.19)는 그대로 —
   기울기를 눕히면 깊은 층이 되레 쉬워진다(그건 다른 불만이 된다). */
export const floorHp   = (f) => Math.round(46 * Math.pow(1.19, f - 1));
export const floorDmg  = (f) => Math.round(4  * Math.pow(1.155, f - 1));
export const floorN    = (f) => 5 + Math.floor(f * 0.7);
export const isGate    = (f) => f % 5 === 0;
export const goldFor   = (f) => Math.round(6 * Math.pow(1.12, f - 1));

/* ══ 관문의 주인 넷 ══ 관문(5·10·15…)은 여태 **체력만 불어난 같은 놈**이었다 — 이름도
   「층의 주인」 하나, 수법도 없다. 그래서 5·10·15 층이 그림도 싸움도 똑같아 「이 층 주인은
   이렇게 싸운다」가 없었다(ROADMAP 2단계 ④). 이름 있는 주인 넷을 관문 층 번호로 **돌려
   세우고**(gateIndex = floor/5 - 1, 넷을 돌려 씀) **수법 하나씩**을 준다:
     · 장판(pool)   — 발밑에 남아 머무는 장판이 지속 피해
     · 소환(add)    — 주기적으로 졸개를 부른다
     · 돌진(charge) — 간격을 두고 네크로 쪽으로 달려들어 큰 한 방
     · 저주(curse)  — 넓은 원 안의 아군/소환수에 한 번에 피해 + 잠깐 약화
   ★ **체력·피해 총량은 예전과 비슷하게 유지한다.** 수법을 얹은 만큼 기본 근접(예전 floorDmg×2.1)
     을 dmgMul 로 낮춰 균형을 맞춘다 — 관문이 벽이 되면 최고층이 깎인다(battle.js 관문 이력·
     ROADMAP 「관문 체력 ×7 → ×4.5 가 더 나빠졌다」). 체력은 ×7 그대로 둔다.
   ★ 수법은 **행동**이다(값만 비트는 땜질이 아니라). 그리고 터지기 전 **예고**(fx)가 보인다 —
     예고 없이 터지면 「불공평」으로 읽힌다(battle.js 가 각 수법에 warn_* fx 를 그린다).
   cd = 수법 주기(초) · tell = 예고 길이(초) · col = 고유 색(명패·고리·예고에 쓴다). */
export const GATELORDS = [
  { mech: "pool",   n: "역병술사",        col: "#7ab04a", dmgMul: 1.5, cd: 2.8, tell: 0.8 },
  { mech: "add",    n: "뼈 부리는 자",    col: "#b48be0", dmgMul: 1.3, cd: 4.5, tell: 0.7 },
  { mech: "charge", n: "짓쳐드는 파수꾼", col: "#d0702c", dmgMul: 1.5, cd: 3.8, tell: 0.9 },
  { mech: "curse",  n: "저주받은 왕",     col: "#8f6ad0", dmgMul: 1.3, cd: 5.0, tell: 1.0 },
];
/** 이 관문 층을 지키는 주인. 검수기는 `globalThis.__FORCE_LORD`(0~3)로 한 주인만 세워
 *  같은 주인을 여러 씨앗으로 재고 죽은 원인 분포를 모은다 — 없으면 층 번호로 돌려 쓴다.
 *  게임 루프에 난수를 새로 넣지 않는다(A/B 유지). */
export const gatelordFor = (f) => {
  const raw = (typeof globalThis !== "undefined" && globalThis.__FORCE_LORD != null)
    ? (globalThis.__FORCE_LORD | 0)
    : (Math.floor(f / 5) - 1);
  const i = ((raw % GATELORDS.length) + GATELORDS.length) % GATELORDS.length;
  return GATELORDS[i];
};
export const gatelordIdx = (lord) => GATELORDS.indexOf(lord);

/* ══ 표식(되짚기) ══ 죽으면 늘 1층부터 다시 내려왔다. 6분을 눈금으로 쪼개 보니
   그 왕복(되짚기)이 **35%**(124초)를 먹었고, 힘의 손잡이 여섯을 대도 벽이 안 밀린
   자리에서 아무도 손대지 않은 조각이 이것 하나였다(2026-08-12 ROADMAP).
   지나온 **관문**을 표식으로 삼아 거기서 다시 시작한다 — 0 이면 옛 방식(1층).
   ★ **1(켬)로 대 봤고 껐다** (2026-08-12 12:0x · `tools/ab_revisit.sh` · 씨앗 여덟 · 12분):
     되짚기는 **23% → 0%** 로 진짜 사라졌는데 최고층은 16.00 → 16.62 (씨앗별 +2·0·−2·+1·
     −2·+3·+3·0 = 4승 2패 2무, 잡음 폭 안) — **벽은 그대로**다. 대신 죽음이 **11 → 30 회**
     로 늘었다(씨앗 하나는 10회). 관문에서 죽고 그 관문에 다시 서니 **같은 자리에서 튕기기만**
     한다 — 벌이 사라져 판이 헐거워진다. 되짚기가 내놓은 시간은 전부 **뒷정리**(59→83%)
     가 먹었다. 켜려면 최고층이 아니라 **손맛** 쪽 근거가 있어야 한다. */
export const CHECKPOINT = 0;
/** 죽은 뒤 다시 서는 층. 여태 닿아 본 깊이 아래의 마지막 관문(5의 배수). */
export const startFloor = () =>
  CHECKPOINT ? Math.max(1, Math.floor((META.deepest | 0) / 5) * 5) : 1;

/** 한 번의 내려감(run) 동안만 사는 값. **금·레벨은 여기 없다** — META 에 있다. */
export const S = {
  floor: 1, t: 0, speed: 1, running: true, dead: false,
  spawnQ: [], spawnT: 0,          // 적이 나오려고 서 있는 줄(한 번에 짠 하고 안 나온다)
  hp: 100, hpMax: 100, mp: 40, mpMax: 40,
  corpses: 0,                 // **시체가 자원이다**
  piles: [],                  // 판 위에 실제로 누워 있는 시체들 — 개수는 corpses 와 함께 움직인다
  minions: [], mobs: [], fx: [],
  /* 진이 적 쪽으로 기운 거리(battle.js 「진이 적 쪽으로 기운다」). 판이 비면 0 으로
     돌아오므로 층을 넘을 때 손으로 지울 필요가 없지만, 새 판은 깨끗이 시작한다. */
  push: { x: 0, y: 0 },
  /** **쓰러지는 중인 몸.** 셈에서는 이미 빠졌고(그래서 때리지도 맞지도 않는다)
   *  화면에만 잠깐 남는다 — 툭 사라지는 대신 무너져 시체가 되는 그 반 초. */
  falling: [],
  /** 떠오르는 피해 숫자. **얼마나 아팠는지**가 판에 없으면 강화를 해도 똑같아 보인다. */
  nums: [],
  bolts: [],                  // **본인이 던진 뼈** — 날아가는 중인 것
  pools: [],                  // 관문 주인(장판)이 발밑에 남긴 장판 — 안에 서면 지속 피해
  hurtLog: [],                // 네크로가 입은 피해의 원인 꼬리표 {t,cause,dmg} — die() 가 최다 사인을 뽑는다
  natk: 0,                    // 다음 기본공격까지 남은 시간
  hurt: 0, hkx: 0, hky: 0,    // 본인이 맞고 움찔하는 시간·밀리는 방향
  drops: [],                  // 판에 떨어져 아직 안 빨려 들어온 전리품
  loot: [],                   // 이번 판에 얻은 것 — 정산 화면이 읽는다
  cd: {}, log: [], killed: 0, deepest: 1,
  uniqCtr: 0,                 // 이 생(生)에 f≥10 에서 주운 전리품 수 — UNIQ_DROP_EVERY 마다 유니크(rollDrop)
  overflow: 0,                // 넘친 마나가 쌓인 몫(유니크 overflow) — OVF_TRIG 을 넘으면 쏟아진다
  summoned: 0, used: 0,       // 이 판에서 불러낸 하수인 수 · 자원으로 쓴 시체 수(정산이 읽는다)
  qrun: {},                   // ⑦ 이 판의 일지 신호 — questNote 가 모으고 newRun 이 비운다(연속 조건은 판마다 리셋)
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
/* ② 부팅 순간의 lastSeen 을 **붙잡아 둔다** — 마을 진입이 saveMeta 로 lastSeen 을 now 로
   밀어내기 전의 값이라야 「그동안」을 잰다. 부팅 때 applyOffline 이 이 값을 since 로 쓴다. */
export const bootSeen = +META.lastSeen || 0;
function load() {
  const base = { gold: 0, lv: 1, xp: 0, deepest: 1, runs: 0,
                 /* ② 오프라인 진행 — **마지막으로 본 시각(ms)**·정산으로 쌓인 **시체 창고.**
                    둘 다 primitive 라 아래 Object.assign(base, raw) 가 저절로 올린다 — 옛
                    저장엔 없으니 0 이 남아 「처음 켠 사람」은 경과 0(갑자기 8시간치가 안 든다). */
                 lastSeen: 0, corpses: 0,
                 /* ══ 환생(전승) ══ **회차를 넘어 사는 값.** 초기화되는 것(층·레벨·금·
                    가방·트리)과 갈라 여기 셋만 남긴다: 유해(누적 배수)·회차 수·최고 기록.
                    전부 primitive 라 아래 Object.assign(base, raw) 가 저절로 올려 준다 —
                    옛 저장엔 없으니 base 의 0/1 이 그대로 남는다(환생 전 사용자는 유해 0). */
                 relics: 0, rebirths: 0, best: 1,
                 up: { hp:0, mp:0, dmg:0, army:0 },
                 /* 낀 것 셋. **등급 숫자가 아니라 개체다** — {k, tier, af:[{id,v}]}.
                    옵션이 랜덤이면 같은 4등급이라도 물건마다 달라야 하므로, 슬롯에
                    숫자를 적어 두는 것으로는 표현할 수가 없다. */
                 equip: { wand:null, robe:null, charm:null },
                 bag: [],
                 /* 찍은 것 — { 노드id: 랭크 }. **남은 점수는 저장하지 않는다**(아래
                    spLeft 참조): 레벨에서 나오는 총량에서 쓴 것을 빼면 되므로,
                    옛 저장에도 저절로 맞고 어긋날 여지가 없다. */
                 tree: {},
                 /* ⑦ 일지(도전 과제) — **깬 것만** { id: 1 } 로 남긴다(1회성이라 boolean 이면 족하다).
                    object 라 아래 merge 가 올려 준다 — 옛 저장엔 없으니 {} 가 남아 「한 과제도 안 깬
                    사람」의 게임은 손대기 전과 한 톨도 안 다르다(relics 는 그대로, 배수 1.0 경로 유지). */
                 quests: {} };
  /* ★ 얕은 Object.assign 이라 **중첩된 것은 통째로 덮인다** — 예전 저장에 gear 가 없으면
     통째로 사라지는 게 아니라, 있으면 통째로 옛것이 된다. up/gear 는 따로 합친다.
     안 그러면 새 항목을 더할 때마다 기존 사용자에게 undefined 가 간다. */
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) || "{}");
    const m = Object.assign(base, raw);
    m.up    = Object.assign({}, base.up,    raw.up    || {});
    m.equip = Object.assign({}, base.equip, raw.equip || {});
    m.tree  = Object.assign({}, base.tree,  raw.tree  || {});
    m.quests = Object.assign({}, base.quests, raw.quests || {});
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
  /* ② lastSeen 은 **max 로만** 오른다 — 시계를 되돌려도 뒤로 안 가야 오프라인 경과가 음수가
     안 된다. 층 이동·구매마다 saveMeta 가 도므로 강제종료해도 마지막 시각이 크게 안 어긋난다. */
  META.lastSeen = Math.max(META.lastSeen || 0, Date.now());
  try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch { /* 시크릿 창 */ }
}

/* ══════════════════════════════════════════════════════════════
   ══ 환생(전승) ══ 깊이 N층을 넘기면 **처음부터 다시**, 대신 영구 배수를 얻는다.
   ──────────────────────────────────────────────────────────────
   지금은 한 번 판 굴이 끝이라 **최고층이 곧 천장**이고, 20분에 48층을 찍고 나면 할
   일이 없다. D2 로 치면 난이도를 갈아 끼우는 자리 — 되풀이할 이유를 만든다.

   지켜야 하는 것 둘:
   ① **결정적으로(난수 없이) 짠다.** 검수기가 씨앗으로 A/B 를 하므로 게임 루프에
      Math.random 을 새로 넣으면 같은 씨앗이 다른 판이 된다. 유해·배수 계산에는 난수가
      한 톨도 없다. 그리고 유해가 0 이면 배수는 **정확히 1.0** 이라, 환생 전 게임은
      손대기 전과 한 톨도 안 다르다(A/B 가 그대로 성립한다).
   ② 배수는 **곱해지는 자리 한 곳씩**(금·경험치·시체)에만 건다 — 여기저기 흩뿌리면
      나중에 못 고친다(battle.js 의 세 자리).
   ══════════════════════════════════════════════════════════ */
export const REBIRTH_MIN = 25;                 // 이 최고층 이상이면 마을에서 환생이 열린다
/** 이번 회차 최고층으로 얻는 **유해.** REBIRTH_MIN 에서 1 로 시작해 한 층마다 하나씩 —
 *  더 깊이 갔으면 더 크게 앞선 채로 다시 시작한다. 결정적이다(난수 없음). */
export const relicGain = (deepest) => Math.max(0, (deepest | 0) - REBIRTH_MIN + 1);
/** 유해 하나가 주는 배수(+N%). tools/rebirth_qa.mjs 로 재서 잡았다(씨앗 1·7·13 · 30분).
 *  ★ **깊이 비율은 값으로 못 민다 — 벽이 구조다.** 0.08 과 0.16(두 배)을 대 봤는데 30분
 *    최고층이 거의 안 움직였다(씨1 70→72 · 씨7 72→71). 깊은 층은 층당 시간이 ~30초로
 *    평평해(depthMul 이 이미 눕혔다) 깊이가 시간에 **거의 직선**이라, 금·경험치·시체
 *    배수는 **거의 일정한 층-앞섬**(≈+8~15층)만 준다 — 값을 키우면 금·레벨만 부풀고
 *    (0.16 은 30분 금 75M·Lv89) 깊이는 그대로다. 그래서 **작은 값**을 골랐다:
 *    유해가 던전 초반(층 1~15, 클리어 시간에 묶임)에는 앞서지 않아 「처음부터 다시」의
 *    맛을 지키고, 중반부터 앞선다(회차2가 회차1의 30분 깊이에 **7~11분 일찍** 닿는다). */
export const RELIC_MUL = 0.08;
/** 금·경험치·시체 획득에 곱하는 **영구 배수.** 유해가 없으면 정확히 1.0. */
export const relicMul = () => 1 + (META.relics | 0) * RELIC_MUL;
/** 환생 버튼이 열렸는가 — 이번 회차 최고층이 임계를 넘었나. 자동으로 강제하지 않는다. */
export const canRebirth = () => (META.deepest | 0) >= REBIRTH_MIN;
/** 마을 확인 창이 실행 **전에** 읽는 미리보기 — 「지금 환생하면 유해 +N (총 M) · ×K」. */
export const rebirthPreview = () => {
  const gain = relicGain(META.deepest);
  const relics = (META.relics | 0) + gain;
  return { gain, relics, rebirths: (META.rebirths | 0) + 1, mul: 1 + relics * RELIC_MUL };
};
/** **되돌릴 수 없다.** 유해·회차·최고 기록만 남기고 나머지는 처음으로 되돌린다.
 *  판(S)은 다음 newRun 이 지우므로 여기서는 META 만 되돌린다. */
export function rebirth() {
  if (!canRebirth()) return null;
  const gain = relicGain(META.deepest);
  META.relics   = (META.relics | 0) + gain;
  META.rebirths = (META.rebirths | 0) + 1;
  META.best     = Math.max(META.best | 0, META.deepest | 0);
  META.gold = 0; META.lv = 1; META.xp = 0; META.deepest = 1; META.corpses = 0;
  META.up    = { hp: 0, mp: 0, dmg: 0, army: 0 };
  META.equip = { wand: null, robe: null, charm: null };
  META.bag   = [];
  META.tree  = {};
  syncSkills();                                // 트리가 비었으니 벨트도 해골 하나로 되돌아간다
  saveMeta();
  questNote("rebirth", 1);                      // ⑦ 되풀이의 첫 발 — META.quests 는 환생이 안 지운다(1회성)
  return { gain, relics: META.relics, rebirths: META.rebirths };
}

/* ══════════════════════════════════════════════════════════════
   ══ 일지(도전 과제) ⑦ ══ 지금 목표는 「가장 깊이」 하나뿐이라, 벽에 부딪히면 할 일이
   끝난다. **다르게 놀 이유**를 준다 — 관문을 안 죽고 답파하거나, 대군을 이끌거나,
   규칙을 바꾸는 유니크를 손에 쥐거나. 보상은 새 화폐를 만들지 않고 **유해(환생 배수)로
   이어 붙인다** — 이미 있는 축을 굵게 만든다(환생 ①·②와 같은 규칙).
   ──────────────────────────────────────────────────────────────
   지켜야 하는 것 넷:
   ① **결정적이다.** 판정·보상에 난수가 한 톨도 없다(A/B 성립). 유해가 0 이면 배수 1.0.
   ② **1회성.** 깬 것은 META.quests[id]=1 로 못 박아 다시 지급하지 않는다(누적 반복 금지).
   ③ **옛 저장 호환.** 한 과제도 안 깬 사람은 relics 가 안 붙어 손대기 전과 byte 단위로 같다.
   ④ **한 자리에서 센다.** 모든 진행은 questNote(tag, n) 하나로 들어온다(④ hurtLog·⑥ useCorpse
      의 「꼬리표 하나로 모으기」를 본떴다) — 훅을 여기저기 흩뿌리지 않는다.

   과제를 고른 결은 **base 안전**이다. loop_health 는 저장을 지우고 마을 없이 자동으로만
   돌려 12분을 굴린다(투자 0) — 그래서 다음은 그 판에서 **절대 안 깨진다**:
     · unique  — 유니크는 손으로만 낀다(takeDrop 이 자동 착용 안 함) → 자동판은 못 깬다
     · army10  — armyCap 은 대장간·트리 없이는 최대 6 → 열이 안 된다
     · dig4    — 무덤 파기는 마을에서 금을 쓴다 → 자동판은 안 판다
     · rebirth — 자동판은 환생을 안 누른다
     · offer   — 시체 소비처 밸브는 12분엔 한 번도 안 돈다(⑥ 실측)
     · feast   — 시체 잔치는 트리 끝 노드라 자동판엔 없다
     · gate    — 관문 다섯은 26층 진입이 필요한데 base 최고층은 24 → 못 닿는다
   그래서 base 24·19·10 이 회귀 없이 유지된다(⑥ 회귀표). 대신 quest_qa 가 투자를 갖춘
   판에서 **하나하나 달성 가능함**을 따로 판정한다. */
export const QUESTS = [
  { id:"unique",  n:"규칙을 쥐다",   d:"유니크 하나를 장착한다",             axis:"빌드", tag:"unique",  goal:1, mode:"max", reward:2 },
  { id:"army10",  n:"대군",         d:"군세 열 이상으로 20층에 이른다",       axis:"군세", tag:"army10",  goal:1, mode:"max", reward:2 },
  { id:"dig4",    n:"도굴꾼",       d:"무덤 파기로 4등급을 캔다",            axis:"재화", tag:"dig4",    goal:1, mode:"max", reward:1 },
  { id:"gate5",   n:"무결의 답파",   d:"한 판에 관문 다섯을 죽지 않고 지난다", axis:"관문", tag:"gate",    goal:5, mode:"sum", reward:3 },
  { id:"rebirth", n:"윤회",         d:"환생을 한 번 한다",                  axis:"환생", tag:"rebirth", goal:1, mode:"max", reward:2 },
  { id:"offer",   n:"제물",         d:"관문에서 제물을 바친다",              axis:"시체", tag:"offer",   goal:1, mode:"max", reward:1 },
  { id:"feast",   n:"시체 잔치",     d:"시체 잔치로 소환수를 여덟 번 먹인다",  axis:"시체", tag:"feast",   goal:8, mode:"max", reward:1 },
];
/* tag → 과제. 진행은 tag 로 들어오고(꼬리표), 저장·판정은 id 로 한다. */
const QUEST_BY_TAG = {};
for (const q of QUESTS) QUEST_BY_TAG[q.tag] = q;
/** 유해 총합 — 초반 환생(REBIRTH_MIN 25 → 유해 1)보다 과하지 않게 10~14 안에 든다(지금 12). */
export const questRelicTotal = () => QUESTS.reduce((s, q) => s + q.reward, 0);

/** 깨는 순간 화면에 짧게 알리는 자리 — 로그 함수(say)를 battle.js 가 끼워 준다. core.js 는
 *  say 를 import 하지 않는다(순환). 자동판·검수기엔 없을 수 있어 부르기 전에 있는지 본다. */
let questToast = null;
export const registerQuestToast = (fn) => { questToast = fn; };

export const questDone = (q) => !!(META.quests && META.quests[q.id]);
/** 진행도 — 깬 것은 목표값, 아닌 것은 이 판의 신호(연속 조건)를 목표에서 클램프해 보인다. */
export const questProg = (q) => questDone(q) ? q.goal : Math.min(q.goal, (S.qrun && S.qrun[q.tag]) | 0);

/** ══ 일지의 **유일한 진입점** ══ tag 로 신호를 넣으면 이 판의 신호(S.qrun)에 모으고
 *  (sum=누적 · max=최댓값), 목표에 닿으면 그 자리에서 깬 것으로 못 박아 **유해를 더한다.**
 *  ★ 이미 깬 것은 곧장 물러난다 — 1회성이라 두 번 주지 않는다(중복 지급 없음). 난수 0 톨. */
export function questNote(tag, n = 1) {
  const q = QUEST_BY_TAG[tag];
  if (!q || questDone(q)) return false;
  const r = S.qrun || (S.qrun = {});
  r[tag] = q.mode === "sum" ? (r[tag] | 0) + n : Math.max(r[tag] | 0, n | 0);
  if (r[tag] < q.goal) return false;
  (META.quests || (META.quests = {}))[q.id] = 1;
  META.relics = (META.relics | 0) + q.reward;   // ← 유해로 이어 붙인다(환생 축을 굵게 · 결정적)
  saveMeta();
  if (questToast) questToast(q);
  return true;
}

/* ══════════════════════════════════════════════════════════════
   ══ 오프라인 진행 ② ══ 껐다 켜면 「그동안 N분 · 금 X · 시체 Y」를 정산으로 준다.
   ──────────────────────────────────────────────────────────────
   환생과 같은 원칙 넷:
   ① **난수 없음.** 검수기가 씨앗으로 A/B 를 하므로 게임 루프에 Math.random 을 한 톨도
      넣지 않는다 — 획득량은 최근 실력(deepest)에서 결정적으로 뽑는다.
   ② **경과 0 이면 손대기 전과 한 톨도 안 다르다.** 옛 저장(lastSeen 없음=0)도 경과 0.
   ③ **상한 8시간·효율 50%** — 12시간 비웠어도 8시간치의 절반만.
   ④ **시계 되돌림 방어** — now < lastSeen 이면 경과 0(saveMeta 가 lastSeen 을 max 로만 올린다).
   유해 배수(relicMul)는 금·시체 획득의 그 규칙과 **일관되게 여기 한 곳에서만** 곱한다. */
export const OFFLINE_CAP_MIN = 480;    // 상한 — 8시간(480분)까지만 쌓인다
export const OFFLINE_EFF = 0.5;        // 효율 — 지켜보는 것의 절반
/** 분당 금 — 최근 실력의 한 층 금 수입(goldFor)에 매단다. 결정적(난수 없음). */
export const offlineGoldPerMin   = (meta) => goldFor(Math.max(1, meta.deepest | 0));
/** 분당 시체 — 그 깊이 한 층의 마릿수(floorN)만큼. 결정적. */
export const offlineCorpsePerMin = (meta) => floorN(Math.max(1, meta.deepest | 0));
/** ms 경과와 meta 만으로 정산을 뽑는 **순수 함수**(검수기가 직접 부른다).
 *  돌려주는 값 {min, gold, corpses, capped} — min 은 상한을 씌운 뒤의 정산 분이다. */
export function offlineGain(ms, meta) {
  const rawMin = Math.floor(Math.max(0, ms) / 60000);   // 음수·소수 분은 버린다(시계 되돌림 방어)
  const capped = rawMin > OFFLINE_CAP_MIN;
  const min = Math.min(rawMin, OFFLINE_CAP_MIN);
  const mul = relicMul();
  const gold    = Math.round(min * offlineGoldPerMin(meta)   * OFFLINE_EFF * mul);
  const corpses = Math.round(min * offlineCorpsePerMin(meta) * OFFLINE_EFF * mul);
  return { min, gold, corpses, capped };
}
/** lastSeen 을 읽어 경과를 정산해 META 에 넣는다. now(ms)는 밖에서 준다 — 함수 안에 시계가
 *  없어야 검수기가 시각을 밀어 넣어 검사할 수 있다. 1분 미만이면 정산할 것이 없어 null 을
 *  돌려준다(부르는 쪽이 패널을 안 띄운다). 반영한 뒤 saveMeta 가 lastSeen 을 now 로 전진시킨다. */
export function applyOffline(now, since = META.lastSeen) {
  const last = +since || 0;                             // ms 라 |0(32비트)로 자르면 깨진다
  const g = offlineGain(last > 0 ? now - last : 0, META); // lastSeen 없으면 경과 0
  META.lastSeen = Math.max(+META.lastSeen || 0, now);
  if (g.min < 1) { saveMeta(); return null; }
  META.gold += g.gold;
  META.corpses = (META.corpses | 0) + g.corpses;
  saveMeta();
  return g;
}

/* ══ 이번 판의 스냅샷 ══ ④ 정산 화면이 읽는다. **S 가 아니라 여기에 굳힌다** —
   S.loot 는 다음 던전 입장(newRun)이 [] 로 비우므로, 판이 끝나는 순간(die) 복사해
   두지 않으면 「이번 판에 얻은 것」이 통째로 사라진다. META 처럼 판을 넘어 산다. */
/* ★ 전리품이 없는 판도 **한 일은 있다** — 빈손이면 정산 가운데가 통째로 비어
   「아무 일도 없었다」로 읽혔다. 그 자리를 채우는 넉 장: 내려간 깊이(from→floor)·
   소환한 하수인(summoned)·쓴 시체(used)·버틴 시간(secs). 전리품이 있을 때는
   좌판이 차므로 안 쓴다. */
export const LASTRUN = { has: false, loot: [], gold: 0, xp: 0, killed: 0, floor: 1, leveled: false,
                         from: 1, summoned: 0, used: 0, secs: 0 };

/* ══ 경험치 ══ **지수는 선형을 못 이긴다.**
   벌이는 층에 «비례»할 뿐인데(마리당 0.6×층) 요구치가 1.35^lv 로 자라면 레벨은
   어디선가 반드시 멎는다 — 30분 굴려 54층에서 Lv.21, 다음 레벨까지 8,085 였다.
   레벨이 멎으면 «스킬 점수»(lv-1)와 그 아래 «군세 상한»도 같이 멎어 **성장 축 셋 중
   하나가 죽는다**(트리 51점을 다 찍으려면 옛 곡선으로 2억 5천만 xp 가 든다).
   그래서 1.35 를 **밑에서 지수로 옮긴다** — 누적이 lv^2.35 라 층에 대해 거의 직선으로
   오른다. 실측 벌이(2026-08-12 30분 씨앗9)에 대면 초반은 옛 곡선과 거의 같고
   (12층 lv7 · 19층 lv12 · 21층 lv13) 그 뒤로 안 멎는다 — 54층 lv38, 트리는 75층 언저리. */
/* ★ 5분에 Lv.10 은 너무 빨랐다(위 floorHp 주석과 같은 자리에서 잰 것) — 레벨이
   쏟아지면 「조금씩 강해지는」 자리가 없다. 밑을 12→17, 지수를 1.35→1.42 로 올려
   초반 레벨을 **두 배쯤 느리게** 한다. 지수를 크게 안 건드린 것은 깊은 층에서 레벨이
   멎으면 트리가 닫히기 때문이다(그 이유는 바로 위 주석). */
export const xpNeed  = (lv) => Math.round(17 * Math.pow(lv, 1.42));
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

/* ══════════════════════════════════════════════════════════════
   ══ 유니크 ══ **옵션이 아니라 규칙을 바꾸는 물건.** (ROADMAP 2단계 ⑤)
   ──────────────────────────────────────────────────────────────
   등급×접두는 「좋고 나쁨」뿐이다 — %가 몇 오른다. 뽑기의 맛은 「이게 나오면 판이
   달라진다」에서 온다. 그래서 유니크는 **새 다섯 번째 축이 아니라** 기존 슬롯
   (wand/robe/charm)을 채우는 개체다 — 슬롯이 늘면 화면·상점·자동착용이 다 는다.
   유니크는 **등급 4 취급**(gearTier 가 4 라 GEAR[k].val[4] 를 그대로 받는다)이고,
   그 위에 **규칙 하나**를 얹는다. 옵션(af)은 두지 않는다 — 규칙이 곧 값어치다.

   다섯 중 셋은 **위로만**(더 셈), 둘은 **주고받기**다. 다 좋은 물건이면 「끼울까」가
   사라지고 그냥 다음 등급이 된다.
     · twice    (위)   시체를 쓰면 절반이 되돌아온다 — 시체가 두 번 쓰인다
     · blast    (위)   소환수가 죽으면 그 자리가 터진다 — 죽음이 광역 피해가 된다
     · overflow (위)   마나가 넘치면 넘친 만큼 적에게 쏟아진다 — 남는 자원을 화력으로
     · gate    (주고받기) 관문에선 피해·금이 배로, 평지에선 못 미친다
     · lonely  (주고받기) 군세는 반, 소환수 한 방은 갑절 — 축을 통째로 맞바꾼다
   ★ **규칙 효과는 한 자리에서 읽는다** — hasUnique(id) 하나만 battle.js 가 본다.
     효과 코드를 여기저기 흩지 않는다. */
export const UNIQUE = [
  { id:"twice",    k:"charm", n:"망자의 손아귀", d:"쓴 시체가 이따금 되돌아온다",         rule:"corpse-refund" },
  { id:"blast",    k:"charm", n:"역병의 낙인",   d:"소환수가 죽으면 그 자리가 터진다",     rule:"death-nova"    },
  { id:"overflow", k:"wand",  n:"범람의 홀",     d:"넘치는 마나가 적에게 쏟아진다",        rule:"mana-spill"    },
  { id:"gate",     k:"wand",  n:"도살자의 인장", d:"관문에선 배로 · 평지에선 못 미친다",   rule:"gate-swing"    },
  { id:"lonely",   k:"robe",  n:"고독한 왕관",   d:"군세는 반, 소환수 한 방은 더 세게",     rule:"few-strong"    },
];
export const UNIQ_BY_ID = {};
for (const u of UNIQUE) UNIQ_BY_ID[u.id] = u;
/** 이 물건이 유니크인가 — **uid 하나로 표식한다.** 저장이 uid 를 들고 오면 gearOk 가
 *  아는 것만 통과시킨다(모르는 uid 는 옛 유니크·오타라 걸러진다). */
export const isUnique = (it) => !!(it && it.uid);
export const uniqOf   = (it) => (it && it.uid) ? (UNIQ_BY_ID[it.uid] || null) : null;
/** 낀 것 셋 중에 이 규칙의 유니크가 있는가 — battle.js 가 규칙을 읽는 **유일한 물음**. */
export function hasUnique(id) {
  for (const k of GEAR_KEYS) { const it = META.equip[k]; if (it && it.uid === id) return true; }
  return false;
}
/* ── 규칙 값 ── **감이 아니라 잰 값이다**(tools/unique_probe.mjs · 씨앗 1·3·9 · 8분).
   판정선은 base 대비 +8%~+60%(위로 유니크) — 아래는 장식, 위는 「유니크 없으면 못 하는
   게임」. twice/blast 는 첫 측정에서 +84/86% 로 과열이라 내렸고, lonely 는 +59% 로 붙어
   있어 소환수 배수를 낮췄다. overflow(+45%)·gate(+30%)는 그대로 뒀다. */
export const UNIQ_DROP_EVERY = 12;   // 한 생(生)에 f≥10 전리품 이만큼마다 유니크 하나(깊이가 열쇠)
const GATE_UP = 1.8, GATE_DOWN = 0.7;
export const TWICE_P    = 0.11;      // 시체를 쓰면 이 확률로 한 구 되돌아온다(0.18=+66% 아직 과열 → 0.11)
export const LONELY_POW = 0.5;       // 소수정예 — 소환수 한 방 +50%(0.9→0.5, 과열 내림)
export const BLAST_MUL  = 1.4;       // 소환수 죽음 폭발 — 그 소환수 한 방의 이만큼(3.0→1.4, 과열 내림)
export const BLAST_R    = 95;
export const OVF_TRIG   = 10;        // 넘친 마나가 이만큼 쌓이면 쏟아진다
export const OVF_MUL    = 3.0;
export const OVF_R      = 110;
/** 관문 배수 — hasUnique("gate") 일 때만. 관문 층에서 크게 오르고 평지에서 손해다.
 *  dmgMulOf(피해)와 goldFor(금) **두 곳**에서 이 하나를 곱한다(정의는 여기 한 곳). */
export const gateFactor = () => hasUnique("gate") ? (isGate(S.floor | 0) ? GATE_UP : GATE_DOWN) : 1;

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

/** ★ **저장이 들고 온 물건을 여기서 한 번 거른다.** `GEAR` 에 없는 슬롯(k)이나 없는
 *  등급(tier)이 섞여 오면 `meltGold` 의 `GEAR[it.k].cost[it.tier]` 가 그 자리서 터진다 —
 *  그런데 그 자리가 하필 **가방이 넘칠 때(bagPut)** 라서, 판을 접는 순간에 맞는다
 *  (2026-08-13 `leave_qa`: 「물러남」이 정산부터 통째로 멈췄다).
 *  슬롯 이름은 언제든 바뀔 수 있는 것(옛 이름·오타·지워진 슬롯)이라 **저장을 믿지 않는다.**
 *  ★ `load()` 안에서 못 거른다 — META 는 GEAR 보다 **먼저** 만들어져(183행) 거기서
 *    GEAR 를 보면 TDZ 로 죽는다. 그래서 GEAR 가 선 **바로 다음**인 여기가 자리다.
 *  ★ 목록을 새로 적지 않는다 — 진실은 GEAR 하나여야 이름을 고칠 때 같이 따라온다. */
const gearOk = (it) => !!(it && GEAR[it.k] && GEAR[it.k].cost[it.tier] != null
                          && (!it.uid || UNIQ_BY_ID[it.uid]));
META.bag = (META.bag || []).filter(gearOk);
for (const k of Object.keys(META.equip || {}))
  if (META.equip[k] && !gearOk(META.equip[k])) META.equip[k] = null;
/** 떨어진 물건 하나를 뽑는다 — {슬롯 k, 등급 tier}. 낮은 등급이 더 흔하다.
 *  ★★ 등급 이름을 `t` 로 뒀다가 **판 위의 나이(t)와 부딪혔다** — 떨어진 물건에
 *  `{...d, t: 0}` 로 나이를 얹는 순간 등급이 0 이 되고, 나이가 흐르면 등급이
 *  1.06 같은 **소수**가 됐다(그 값으로 cost 를 읽어 금이 NaN 이 됐다).
 *  자가 「장비_후 1.0666」을 뱉어서 잡혔다 — 이름은 뜻이 다르면 달라야 한다. */
let uniqRotor = 0;
export function rollDrop(f) {
  const k = GEAR_KEYS[Math.floor(Math.random() * GEAR_KEYS.length)];
  const cap = dropTierCap(f);
  /* 위쪽 등급일수록 드물게 — 제곱으로 눌러 「높은 게 나왔다」가 사건이 되게. */
  const tier = 1 + Math.floor(Math.pow(Math.random(), 2.1) * cap);
  /* ★ 유니크는 **깊이가 열쇠**(f≥10)이고 **난수를 새로 안 먹는다** — 위 두 draw 를
     그대로 소비한 뒤 결정적으로 얹는다(rotor 로 다섯을 돌려 씀). 그래서 유니크 없는
     판(base)은 난수열이 한 톨도 안 어긋나 loop_health 회귀가 정확히 성립한다(A/B).
     한 생에 f≥10 전리품을 UNIQ_DROP_EVERY 개 모아야 하나 — S.uniqCtr 는 newRun 이 0 으로. */
  if (f >= 10 && ++S.uniqCtr >= UNIQ_DROP_EVERY) {
    S.uniqCtr = 0;
    return mkUnique(UNIQUE[uniqRotor++ % UNIQUE.length]);
  }
  return mkItem(k, Math.min(cap, tier));
}

/** ══ 「무덤 파기」의 값 ══ 금 수입(goldFor)은 층에 1.12 로 붙지만, **한 판 벌이**에는
 *  거기에 「그 층 마릿수」(floorN=5+0.7f)라는 **선형 배수**가 더 얹힌다. 그래서 값도
 *  같은 1.12 로 매달면 밑이 상쇄돼 비율이 영영 안 잠기고, 마릿수만큼 깊이마다 살 수 있는
 *  횟수가 늘어 금이 쌓였다(30분 1.6M · 깊이 54 에서 67번, ROADMAP 「금이 여전히 쌓인다」).
 *  → 값의 밑을 벌이보다 가파른 DIG_BASE 로 올려 그 선형 배수를 되받는다.
 *  1.16 은 감이 아니라 잰 값이다(tools/dig_probe.mjs ⑦): 한 판 누적 벌이(Σ_{f≤d} goldFor·마릿수)
 *  ÷ digCost 가 깊이 10·25·40·55 에서 **3~8 안에 머문다**. 1.16 보다 낮으면 깊은 데서 8 을
 *  넘고(다시 쌓임), 높으면 얕은 데서 3 밑으로 떨어져 초반이 조인다. d=1 은 지수가 0 이라
 *  값이 60 그대로 — 1~5층은 지금과 거의 같다(5층 94→109). deepest 를 쓰므로 파는 물건
 *  (rollDrop)과 값이 같은 깊이에 함께 매달린다. */
export const DIG_BASE = 1.16;
export const digCost = () => Math.round(60 * Math.pow(DIG_BASE, Math.max(1, META.deepest) - 1));

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
/** 유니크 하나를 만든다 — **등급 4 취급**(GEAR[k] 최고 등급)에 uid 로 규칙을 표식하고,
 *  옵션은 두지 않는다(규칙이 값어치다 · 난수를 안 먹어 결정적이다). */
export function mkUnique(u) {
  return { k: u.k, tier: GEAR[u.k].tiers.length - 1, af: [], uid: u.id };
}
/** 물건끼리 견주는 **하나의 자.** 자동 착용·자동 처분이 전부 이걸 본다 —
 *  자가 여럿이면 「왜 이게 안 끼워졌지」가 설명이 안 된다. */
export const scoreOf = (it) =>
  !it ? -1 : it.tier * 100 + (it.uid ? 60 : 0) + it.af.reduce((s, a) => s + (AFFIX[a.id]?.w || 0) * a.v, 0);
/** 이름 — 제일 센 옵션이 앞에 붙는다(디아블로의 접두사).
 *  ★ 접두사는 **「~의」로 끝내지 않는다.** 등급 이름 절반이 이미 「심장의 홀」·「왕의 제의」
 *  처럼 「의」로 끝나서 「군단의 심장의 홀」이 됐다 — 관형형(잔혹한·흐르는)으로만 쓴다. */
export function nameOf(it) {
  if (!it) return "없음";
  if (it.uid) return UNIQ_BY_ID[it.uid]?.n || GEAR[it.k].tiers[it.tier];
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

/* ══ 합성 ══ 병수님: "중복은 금이 아니라 **재료**로 — 셋을 합치면 한 단계 위(병수님 취향의 합성)".
   ②가 12칸을 넘으면 제일 나쁜 것부터 녹였다 — 그래서 같은 슬롯·같은 등급의 중복이 모이지
   못하고 전부 금이 됐다. **녹이기 전에 합쳐** 그 자리를 낸다.
   ★ 새 화폐·새 화면·격자·드래그를 만들지 않는다 — ②가 저절로 녹듯 **조건이 차면 저절로**
     일어난다(방치형). 재료는 새 종류가 아니라 **이미 있는 장비 개체 그 자체**다. */
/** 가방에서 **같은 슬롯(k)·같은 등급(tier)** 셋이 모이면 셋을 빼고 `mkItem(k, tier+1)` 하나를
 *  만든다. 옵션은 등급이 올랐으니 **새로 굴린다** — 등급이 오르면 scoreOf 가 +100 이라 재료보다
 *  반드시 좋다(물려받기 규칙을 따로 두지 않는다).
 *  · **꼭대기 등급은 안 합쳐진다**(tier+1 이 없으면) — 그 셋은 넘칠 때 녹는 길로 간다.
 *  · **연쇄** — 합쳐 생긴 것 때문에 또 셋이 되면 그것도 합친다(같은 것 9개 → tier+1 셋 → tier+2 하나).
 *  · 합쳐 만든 것이 지금 낀 것보다 좋으면 **그 자리서 갈아 끼우고**(방치형) 벗은 것은 가방으로.
 *  돌려주는 값: 로그·정산이 읽게 `[{k, tier, n(이름), af, worn(갈아 끼웠나), mats(재료 셋)}]`. */
export function bagFuse() {
  const fused = [];
  for (;;) {
    /* 같은 슬롯·같은 등급끼리 자리(index)를 모아 셋 이상인 것을 찾는다. 꼭대기 등급은 건너뛴다. */
    const groups = {};
    for (let i = 0; i < META.bag.length; i++) {
      const it = META.bag[i];
      if (it.uid) continue;                                   // 유니크는 합치지 않는다 — 손으로만 다룬다
      const key = it.k + ":" + it.tier;
      (groups[key] = groups[key] || []).push(i);
    }
    let hit = null;
    for (const key in groups) {
      const idxs = groups[key];
      if (idxs.length < 3) continue;
      const it = META.bag[idxs[0]];
      if (it.tier + 1 >= GEAR[it.k].tiers.length) continue;   // 꼭대기 등급은 안 합쳐진다
      hit = idxs.slice(0, 3);
      break;
    }
    if (!hit) break;
    /* 셋을 빼낸다 — **큰 자리부터** 지워야 남은 자리가 안 밀린다. 뺀 것이 재료다. */
    const mats = [];
    for (const i of hit.slice().sort((a, b) => b - a)) mats.push(META.bag.splice(i, 1)[0]);
    const src = mats[0];
    const made = mkItem(src.k, src.tier + 1);                 // 옵션은 등급이 올랐으니 새로 굴린다
    let worn = false;
    if (!isUnique(equipped(src.k)) && scoreOf(made) > scoreOf(equipped(src.k))) {  // 낀 것보다 좋으면 갈아 끼운다(낀 유니크는 손으로만 벗는다)
      const old = equipped(src.k);
      META.equip[src.k] = made; worn = true;
      if (old) META.bag.push(old);                            // 벗은 것은 가방으로(또 셋이 되면 연쇄가 잡는다)
    } else {
      META.bag.push(made);
    }
    fused.push({ k: made.k, tier: made.tier, n: nameOf(made), af: made.af, worn, mats, made });
  }
  return fused;
}

/** 직전 bagPut 이 부른 bagFuse 의 결과 — takeDrop 이 로그·정산으로 읽어 간다. bagPut 이
 *  이미 돌려주던 `melted` 계약을 **바꾸지 않으려**(②·④ 검수기가 본다) 여기 잠깐 둔다. */
let lastFused = [];

/** 가방에 넣는다. 12칸을 넘으면 **점수가 제일 낮은 것부터** 금으로 녹인다(넘친 만큼 반복).
 *  방금 넣은 그것이 제일 나쁘면 그 자리에서 녹아 없어질 수도 있다 — 그래서 「가방에 남았나」는
 *  부르는 쪽이 `META.bag.includes(it)` 로 확인한다. 녹은 금은 여기서 바로 META.gold 에 더하고,
 *  **녹인 목록**(로그가 「무엇이 얼마에 녹았는지」를 말할 수 있게)을 돌려준다. */
export function bagPut(it) {
  META.bag.push(it);
  lastFused = bagFuse();                          // ★ 녹이기 전에 합친다 — 중복은 금이 아니라 재료
  const melted = [];
  while (META.bag.length > BAG_MAX) {
    let lo = -1;                                  // 점수가 제일 낮은 칸을 찾아 녹인다 — 단 유니크는 건너뛴다
    for (let i = 0; i < META.bag.length; i++) {
      if (META.bag[i].uid) continue;              // 유니크는 규칙이 점수로 안 잡혀 저절로 녹으면 안 된다
      if (lo < 0 || scoreOf(META.bag[i]) < scoreOf(META.bag[lo])) lo = i;
    }
    if (lo < 0) break;                            // 가방이 통째로 유니크뿐 — 녹일 것이 없다(넘쳐도 둔다)
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
  lastFused = [];                                // 이번 처리의 합성만 담기게 비운다(worn·빈손이면 bagPut 을 안 거친다)
  /* ★ 유니크는 **저절로 껴지지 않는다** — 주고받기 유니크(관문·소수정예)가 자동으로
     껴져 판을 망치면 안 되고, 낀 유니크도 자동 교체하지 않는다(손으로만 벗는다).
     그래서 유니크가 걸리는 두 자리(주운 것이 유니크 · 낀 것이 유니크)는 곧장 가방으로. */
  if (!it.uid && !isUnique(equipped(d.k)) && scoreOf(it) > scoreOf(equipped(d.k))) {
    const old = equipped(d.k);
    META.equip[d.k] = it; worn = true;
    if (old) melted = bagPut(old);               // 벗은 것을 가방으로(빈손이면 안 넣는다)
  } else {
    melted = bagPut(it);                          // 가방으로 — 넘치면 제일 나쁜 것부터 녹는다
  }
  const gold = melted.reduce((s, m) => s + m.gold, 0);
  return { worn, gold, bagged: META.bag.includes(it), melted, fused: lastFused, ref: it };
}

/** 「무덤 파기」 — 금을 내고 rollDrop(deepest) 으로 하나 뽑아 **기존 takeDrop 에 그대로
 *  태운다**(갈아 끼움·가방·합성·녹음 네 갈래가 저절로 처리된다 — 새 길을 만들지 않는다).
 *  금이 모자라면 `null`(금도 안 빠지고 아무 일도 안 난다). takeDrop 의 결과
 *  (worn·bagged·melted·fused·ref)를 **그대로 돌려준다** — 부르는 쪽이 네 갈래를 가려 말하게. */
export function digDraw() {
  const cost = digCost();
  if (META.gold < cost) return null;
  META.gold -= cost;
  const r = takeDrop(rollDrop(META.deepest));
  if (r && r.ref && (r.ref.uid || (r.ref.tier | 0) >= 4)) questNote("dig4", 1);   // ⑦ 스스로 파서 4등급(또는 유니크)을 캤다
  saveMeta();
  return r;
}

/** 가방의 i번을 끼고 벗은 것을 가방에 넣는다. ③ 상태창이 쓸 손잡이 하나 —
 *  **화면·격자·드래그는 여기서 만들지 않는다**(방치형이라 기본은 자동, 손은 선택이다). */
export function equipFromBag(i) {
  const it = META.bag[i];
  if (!it) return false;
  META.bag.splice(i, 1);
  const old = equipped(it.k);
  META.equip[it.k] = it;
  if (isUnique(it)) questNote("unique", 1);      // ⑦ 유니크는 손으로만 낀다 — 낀 그 순간이 「규칙을 쥐다」
  if (old) META.bag.push(old);                   // 벗은 것은 가방으로(빈손이면 안 넣는다)
  bagFuse();                                     // 손으로 끼운 뒤에도 가방에 셋이 남으면 저절로 합쳐진다
  saveMeta();
  return true;
}

/** 다음 등급 값. 마지막이면 null(더 살 것이 없다). */
export const gearNext = (k) => {
  const t = gearTier(k) + 1;
  return t < GEAR[k].tiers.length ? t : null;
};
export const gearVal = (k) => GEAR[k].val[gearTier(k)];

/* ══ 금은 저절로 쓰인다 ══ 방치형인데 **마을에 들러 손으로 눌러야만** 금이 줄었다.
   60분 곡선(ROADMAP ⑧)에서 금만 혼자 지수로 뛰어 1.4~5.2억이 쌓였고 군세 상한은
   6~8 에 박혀 있었다 — 상한이 «못» 자란 게 아니라 **아무도 안 산 것**이다.
   그래서 셋 중 «대장간(강화)»만 저절로 산다:
     · 강화 = 「조금씩 오르는 몸」 — 고를 것이 없다. 손이 할 일이 아니다.
     · 상점(장비) = 「한 번이 사건」 · 트리 = 되돌릴 수 없는 갈림길 → **손에 남긴다.**
   ★ 다음에 살 수 있는 **장비 한 벌 값은 남겨 둔다**(forgeReserve). 안 그러면 상점에
     갈 때마다 금이 0 이라 「살 것이 없는 가게」가 되고, 손으로 하는 축이 통째로 죽는다.
   제일 싼 것부터 사므로 넷이 고르게 오르고, 값이 1.55^n 이라 저절로 느려진다 —
   상한을 새로 두지 않아도 곡선이 알아서 눕는다. */
function forgeReserve() {
  let r = 0;
  for (const k of GEAR_KEYS) { const nx = gearNext(k); if (nx !== null) r = Math.max(r, GEAR[k].cost[nx]); }
  return r;
}
/** 살 수 있는 만큼 산다(한 번에 `max` 개까지 — 후반에 금이 폭주해도 한 틱이 안 길어진다).
 *  돌려주는 값: 이번에 산 강화의 키 목록(비면 아무것도 안 샀다). */
export function autoForge(max = 8) {
  const bought = [], keep = forgeReserve();
  for (let i = 0; i < max; i++) {
    let pick = null, lo = Infinity;
    for (const k in UPS) { const c = upCost(k); if (c < lo) { lo = c; pick = k; } }
    if (!pick || META.gold - lo < keep) break;
    META.gold -= lo; META.up[pick] = (META.up[pick] | 0) + 1;
    bought.push(pick);
  }
  return bought;
}

/* ══ 본인도 **그 층의 격**만큼은 버틴다 ══
   깊이 배수(depthMul)를 넣을 때 **공격에만** 걸고 체력에는 안 걸었다. 그래서 50층에서
   층 피해 4,662 대 최대 체력 410 — **0.09대**, 스치면 즉사였다(자의 판정도 「벽은 본인
   체력」으로 옮겨 갔다). 층 피해는 1.155^층 으로 자라는데 배수는 1.0625^층 이라,
   배수를 체력에 그대로 곱해도 **깊이마다 1.087 배씩 계속 벌어진다** — 곱셈으로는 못 잡는다.

   그래서 소환수 때 통한 방법을 그대로 쓴다(「시체가 제 격을 기억한다」):
   **바닥을 그 층에 둔다.** 어느 깊이에서도 최소 SURVIVE_HITS 대는 버틴다.
     · 얕은 층은 기본값이 더 커서 **하나도 안 바뀐다**(1층 100 > 4×5=20)
     · 깊은 층은 층 피해를 따라가므로 「맞고 버팀」이 깊이와 무관하게 평평해진다
     · 층 표를 고쳐도 저절로 따라온다 — 층 수를 코드에 안 박았다
   ★ 이것은 **죽지 않게** 만드는 것이 아니다. 다섯 대는 여전히 몇 초다 —
     군대가 무너지고 여럿이 본체에 닿으면 그대로 죽는다. 바뀌는 것은 「스치면 끝」이
     「버티는 동안 군대를 다시 세울 수 있다」가 되는 것뿐이다. */
export const SURVIVE_HITS = 5;
/** 키운 것으로 쌓는 체력 — 얕은 층에서는 이쪽이 크다. */
const bodyHp = () => 100 + (META.up.hp | 0) * 25 + (META.lv - 1) * 8
                   + gearVal("robe") + afSum("hp");
export const hpMaxOf = () => Math.max(bodyHp(), floorDmg(S.floor | 0) * SURVIVE_HITS);
export const mpMaxOf  = () => 40  + (META.up.mp | 0) * 8  + (META.lv - 1) * 3;
/** 마나가 차는 속도 — 부적이 올린다. */
export const mpRegenOf = () => 2.2 + (META.up.mp | 0) * 0.25 + gearVal("charm") + afSum("mp");
/** ══ 깊이가 힘이다 ══ 적 체력은 `floorHp` 로 층마다 **1.19배**씩 자라는데 한 판 안에서
 *  내 힘은 그만큼 안 자랐다. 그래서 층마다 쓰는 시간이 곱절로 커지고
 *  **최고층 ≈ log(굴린 시간)** 이 된다 — 손잡이 열 개(머릿수·마중·소환수 화력·적 체력·
 *  방울·되짚기·귀가·구역풀기)가 전부 「시간을 몇 % 아끼는」 것이라 로그 한 조각
 *  (+0.5~0.75층)밖에 못 준 이유다. 벽은 값이 아니라 **기울기**였다.
 *  깊이 한 층마다 이만큼 세지면 적의 기울기와 몫이 맞는다(1.19 / 1.12 = 1.0625).
 *  실측(씨앗 여덟 · 12분 · 2026-08-12 14:06): 손 안 댐 16.00 · 적을 덜 자라게 21.00 ·
 *  **이것 27.00**. 20층대에서 층당 시간이 30초 안팎으로 평평해진다(더는 안 큰다). */
export const DEPTH_MUL = 1.0625;
export const depthMul = () => Math.pow(DEPTH_MUL, Math.max(0, (S.floor | 0) - 1));
export const dmgMulOf = () => depthMul()
                            * (1 + (META.up.dmg | 0) * 0.08 + (META.lv - 1) * 0.03)
                            * (1 + rank("bone") * 0.10)
                            * gateFactor();
/* dmgMulOf 는 **둘 다에게 걸리는 바탕**이다(레벨·강화·뼈 트리). 옵션은 그 위에서
   갈라진다 — 안 그러면 「본인 피해」가 소환수까지 올려서 이름이 거짓말이 된다. */
export const selfMulOf   = () => 1 + afSum("dmg") / 100;
/** 소환수 피해는 본인과 **다른 옵션**이 올린다 — 빌드가 갈리는 자리다. */
export const minionMulOf = () => 1 + afSum("mdmg") / 100 + (hasUnique("lonely") ? LONELY_POW : 0);
export const goldMulOf   = () => 1 + afSum("gold") / 100;
/** ③ 상태창이 읽는 **합친 피해 배수.** 판에서 본인은 `dmgMulOf()×selfMulOf()`,
 *  소환수는 `dmgMulOf()×minionMulOf()` 로 맞으므로(battle.js), 화면이 그 식을 다시
 *  쓰지 않게 여기 한 곳에 모은다 — 같은 식이 두 곳에 있으면 언젠가 갈라진다. */
export const selfDmgMul   = () => dmgMulOf() * selfMulOf();
export const minionDmgMul = () => dmgMulOf() * minionMulOf();
/* ★ 군세 상한은 **자라야 보인다.** 예전엔 Lv.1 부터 6 이라 10초 만에 꽉 차고
   그 뒤로는 아무 일도 안 일어났다 — 방치형에서 제일 눈에 띄는 성장이 시작부터
   끝나 있었던 셈이다. 셋으로 시작해 세 레벨마다 하나씩, Lv.10 에 예전의 6 이 된다
   (그 뒤는 강화·트리·옵션이 이어받으므로 중반 이후는 그대로다). */
export const armyBase = () => Math.min(6, 3 + Math.floor((META.lv - 1) / 3));
export const armyCap  = () => {
  const c = armyBase() + (META.up.army | 0) + rank("legion") + afSum("army");
  return hasUnique("lonely") ? Math.max(1, Math.ceil(c / 2)) : c;   // 소수정예 — 군세는 반(대신 minionMulOf 가 갑절)
};
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

/* ══ 소환수는 **제가 일어난 시체만큼 세다** ══
   여기가 이 게임에서 제일 크게 어긋나 있던 자리다. 해골 체력이 26(트리를 다 찍어도
   42)으로 **고정**인데 층 피해는 층마다 15.5%씩 오른다 — 20층이면 한 대에 죽는다.
   그래서 깊이 들어가면 군대가 소멸하고 네크로멘서가 혼자 싸웠다. 25분 굴려 재 보니
   11분부터 20분까지 **열 번 연속 군세 1/7** 이었다. 「직접 안 싸운다」가 전제인
   게임에서 깊은 층이 통째로 다른 게임이 되어 있었다.

   고치는 방법이 여럿인데(층으로 곱하기 · 레벨로 곱하기), **시체를 자원으로 둔 설계와
   맞아떨어지는 것**을 골랐다 — 시체가 제 주인의 격을 기억하고, 일어난 놈이 그것을
   물려받는다. 그래서:
     · 깊은 층의 시체가 **좋은 시체**다 — 「깊이 들어갈 이유」가 하나 더 는다
     · 관문 주인의 시체로 세운 놈은 눈에 띄게 세다 — 사건이 된다
     · 층 표를 고쳐도 저절로 따라온다 — 층 수를 코드에 안 박았다
   바닥은 지금 값이라 **초반은 하나도 안 바뀐다**(1층 시체 30 → 물려받아도 13 < 26). */
/* ══ 맞아도 안 밀리는 놈이 있다 ══
   병수님: "보스같은애가 걸어오면서 맞으면 뒤로 물러나고 그러다가 다시 걸어오다가
   맞으면서 물러나고 이러네, 일반적으로 맞는거 상관없이 쭉 와서 공격해야하는거 아니냐"

   밀림은 **그리기만** 하는데(실제 x,y 는 안 움직인다) 양이 **누구나 똑같이 키의 14%**
   였다. 소환수 여섯이 붙으면 0.18초짜리 움찔이 끝나기 전에 새로 걸려 **톱니처럼**
   앞뒤로 떨고, 큰 놈일수록 밀리는 픽셀이 커서 더 눈에 띈다.

   「보스면 안 밀린다」로 박지 않는다 — 그러면 다음에 큰 놈을 넣을 때 또 어긋난다.
   **한 방이 제 몸에서 차지하는 몫**으로 정한다: 제 최대 체력의 KNOCK_FULL 만큼을
   한 번에 맞으면 온전히 밀리고, 그보다 작으면 그 비율만큼만 밀린다.
     15층 보스(체력 2401) · 해골 한 방 17 → 0.7% → **밀림 3%**(사실상 안 밀림)
     해골(체력 102) · 졸개 한 방 26 → 25% → **밀림 100%**(제대로 나뒹군다)
   덩치가 아니라 **비율**이라, 층이 깊어져 보스가 세져도 저절로 따라온다. */
export const KNOCK_FULL = 0.22;
export const knockOf = (e, dmg) =>
  Math.min(1, (dmg / Math.max(1, e.hpMax || 1)) / KNOCK_FULL);

export const RAISE_HP  = 0.42;   // 시체 주인 최대체력의 이만큼을 체력으로
export const RAISE_DMG = 0.05;   // 그리고 이만큼을 한 방으로
/** 시체 하나가 가진 「격」(주인의 최대 체력)으로 세우는 몸. 바닥은 종족 기본값이다. */
export const raiseHp  = (base, pw) => Math.round(Math.max(base, (pw | 0) * RAISE_HP));
export const raiseDmg = (base, pw) => Math.max(base, (pw | 0) * RAISE_DMG);
/** 센 시체에서 일어난 놈은 **조금 더 크다** — 숫자를 안 읽어도 눈이 먼저 안다.
 *  최대 +22% 로 막는다(관문 주인 시체가 판을 가리면 안 된다). */
export const raiseScale = (base, pw) => 1 + Math.min(0.22, Math.max(0, ((pw | 0) * RAISE_HP) / base - 1) * 0.06);
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
