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
           d:"싸고 빠름 · 수로 민다" },
  /* ↓ 접어 둔 둘. 소환 스킬에서 빠져 있어 지금은 판에 안 나온다(위 SKILLS 주석).
     해골이 만족스러워지면 같은 방식으로 다시 구워 되살린다. */
  ghoul: { n:"구울",     ico:"✦", cost:2, hp:64,  dmg:26, spd:30, cd:1.8, h:58,
           d:"물면 제 피가 찬다" },
  golem: { n:"흙 골렘",   ico:"◆", cost:5, hp:260, dmg:36, spd:19, cd:2.4, h:84,
           d:"느리지만 앞을 막는다" },
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
  { id:"raise", n:"해골 되살리기", ico:"☠", mp:6,  cd:1.2, corpse:1, d:"시체 하나 → 해골 전사" },
  { id:"ghoul", n:"구울 되살리기", ico:"✦", mp:12, cd:2.0, corpse:1, d:"시체 하나 → 구울", need:"ghoul" },
  { id:"golem", n:"흙 골렘",      ico:"◆", mp:30, cd:6.0, corpse:1, d:"시체 하나 → 흙 골렘", need:"golem" },
  { id:"nova",  n:"시체 폭발",    ico:"✹", mp:18, cd:2.2, corpse:1, d:"시체를 터뜨려 주위를 태움" },
  { id:"amp",   n:"약화의 저주",  ico:"✜", mp:12, cd:8,   corpse:0, d:"적이 받는 피해 ↑" },
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
  minions: [], mobs: [], fx: [],
  bolts: [],                  // **본인이 던진 뼈** — 날아가는 중인 것
  natk: 0,                    // 다음 기본공격까지 남은 시간
  cd: {}, log: [], killed: 0, deepest: 1,
};

export const META_KEY = "necro.meta.v1";
export const META = load();
function load() {
  const base = { gold: 0, lv: 1, xp: 0, deepest: 1, runs: 0,
                 up: { hp:0, mp:0, dmg:0, army:0 },
                 gear: { wand:0, robe:0, charm:0 },
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
    m.up   = Object.assign({}, base.up,   raw.up   || {});
    m.gear = Object.assign({}, base.gear, raw.gear || {});
    m.tree = Object.assign({}, base.tree, raw.tree || {});
    return m;
  }
  catch { return base; }
}
export function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch { /* 시크릿 창 */ }
}
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
  wand:  { n:"지팡이", d:"본인 기본공격 피해",
           tiers:["뼈 지팡이","녹슨 홀","흑요석 홀","심장의 홀","왕의 홀"],
           cost:[0, 90, 320, 1100, 3800], val:[0, 0.25, 0.6, 1.1, 1.9] },
  robe:  { n:"망토",   d:"최대 체력",
           tiers:["누더기","가죽 망토","사슬 망토","제의","왕의 제의"],
           cost:[0, 80, 300, 1000, 3500], val:[0, 40, 110, 260, 560] },
  charm: { n:"부적",   d:"마나 회복",
           tiers:["없음","뼛조각","은 부적","영혼석","군주의 인장"],
           cost:[0, 120, 420, 1400, 4600], val:[0, 0.6, 1.5, 3.0, 5.2] },
};
/** 다음 등급 값. 마지막이면 null(더 살 것이 없다). */
export const gearNext = (k) => {
  const t = (META.gear[k] | 0) + 1;
  return t < GEAR[k].tiers.length ? t : null;
};
export const gearVal = (k) => GEAR[k].val[META.gear[k] | 0];
export const hpMaxOf  = () => 100 + (META.up.hp | 0) * 25 + (META.lv - 1) * 8 + gearVal("robe");
export const mpMaxOf  = () => 40  + (META.up.mp | 0) * 8  + (META.lv - 1) * 3;
/** 마나가 차는 속도 — 부적이 올린다. */
export const mpRegenOf = () => 2.2 + (META.up.mp | 0) * 0.25 + gearVal("charm");
export const dmgMulOf = () => (1 + (META.up.dmg | 0) * 0.08 + (META.lv - 1) * 0.03)
                            * (1 + rank("bone") * 0.10) * (rank("dark") ? 1.25 : 1);
export const armyCap  = () => 6 + (META.up.army | 0) + rank("legion") + rank("dark") * 2;


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
    { id:"ghoul",  n:"구울 되살리기", max:1, lv:6,  req:"armor",  d:"구울을 소환할 수 있다 — 물면 제 피가 찬다", big:1 },
    { id:"legion", n:"군단",      max:3, lv:10, req:"ghoul",  d:"소환수 상한 +1" },
    { id:"golem",  n:"흙 골렘",    max:1, lv:16, req:"legion", d:"골렘을 소환할 수 있다 — 느리지만 앞을 막는다", big:1 },
  ]},
  { k:"corpse", n:"시 체", nodes:[
    { id:"rot",     n:"부패",      max:5, lv:1,  d:"시체 폭발 피해 +15%" },
    { id:"harvest", n:"시체 수확",  max:5, lv:4,  req:"rot",     d:"처치 시 12% 확률로 시체 하나 더" },
    { id:"cheap",   n:"값싼 죽음",  max:4, lv:8,  req:"harvest", d:"모든 스킬 마나 소모 -10%" },
    { id:"chain",   n:"연쇄 폭발",  max:3, lv:12, req:"cheap",   d:"시체 폭발 범위 +25%" },
    { id:"feast",   n:"시체 잔치",  max:1, lv:18, req:"chain",   d:"시체 폭발이 소환수를 피해의 40%만큼 치유", big:1 },
  ]},
  { k:"hex", n:"주 술", nodes:[
    { id:"wand",   n:"뼈 다루기",  max:5, lv:1,  d:"본인 기본공격 피해 +12%" },
    { id:"swift",  n:"빠른 손",    max:4, lv:5,  req:"wand",   d:"모든 스킬 재사용 -7%" },
    { id:"deep",   n:"깊은 저주",  max:4, lv:9,  req:"swift",  d:"저주 지속 +3초 · 증폭 +8%" },
    { id:"spirit", n:"영혼 흡수",  max:4, lv:13, req:"deep",   d:"처치 시 마나 +2" },
    { id:"dark",   n:"어둠의 지배", max:1, lv:20, req:"spirit", d:"소환수 피해 +25% · 상한 +2", big:1 },
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
  if (rank(id) >= nd.max) return "끝까지 찍음";
  if (META.lv < nd.lv) return `레벨 ${nd.lv} 필요`;
  if (nd.req && rank(nd.req) === 0) return `먼저 「${NODE[nd.req].n}」`;
  if (spLeft() <= 0) return "점수 없음";
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

syncSkills();
