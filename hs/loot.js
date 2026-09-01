// ── V-181 — 물건이 «옵션을 달고» 떨어진다 ────────────────────────────────────
// 옛 loot.js(52줄)는 이름을 굴리고 dmg/body 배수 두 개만 돌려줬다. 이제 슬롯 일곱과
// 레어도별 옵션을 굴려 { key, label, value } 로 붙이고, sumAffixes 로 합산한다.
// main.js 는 그 합을 «착용»을 지나 스탯으로 편다(밟는 순간 배수 곱하기가 아니다).

// 슬롯마다 어울리는 이름씨 — 반지에 Robe 가 나오면 안 된다.
// ★★ V-209 (2026-09-01 00:55 병수님 「아이템 영어랑 한글 섞였네」) — 바닥 이름표는 영어인데
//   HUD·조작 안내는 한글이라 한 화면에 두 말이 섞여 있었다. **전부 한글로 세운다.**
//   디아블로 2 한국어판의 결 — 「[무엇]의 [꾸밈] [물건]」(예: 죽은 자의 무쇠 반지).
const SLOT_NOUNS = {
  weapon: ["지팡이", "송곳니", "낫", "약탈자", "도살자", "홀", "장대"],
  helm:   ["투구", "해골", "왕관", "가면", "두건"],
  armor:  ["로브", "수의", "사슬갑옷", "흉갑", "제의"],
  gloves: ["건틀릿", "손아귀", "발톱", "움켜쥠"],
  boots:  ["장화", "각반", "밟는 것", "걸음"],
  ring:   ["반지", "고리", "테", "인장"],
  amulet: ["부적", "목걸이", "호부", "표식", "우상", "장식"],
};
const SLOTS = Object.keys(SLOT_NOUNS);
export const SLOT_LABEL = {
  weapon: "무기", helm: "투구", armor: "갑옷", gloves: "장갑",
  boots: "신발", ring: "반지", amulet: "부적",
};

const ADJ = ["거대한", "전투", "음침한", "무쇠", "잔혹한", "포악한", "고대의", "뼈", "공포의",
  "사나운", "텅 빈", "썩어가는", "시체", "역병의", "해골", "망령의", "피투성이", "그림자"];
const OF = ["왕", "무덤", "기예", "죽은 자", "분노", "공허", "골수", "역병",
  "군단", "파멸", "강령술사", "뼈"];

export const RARITY = [
  { key: "white", name: "평범", color: "#e6e0d0", weight: 62, affixes: [0, 0] },
  { key: "blue", name: "매직", color: "#6fa8ff", weight: 26, affixes: [1, 2] },
  { key: "yellow", name: "레어", color: "#e8cf52", weight: 10, affixes: [3, 4] },
  { key: "gold", name: "유니크", color: "#d8934a", weight: 2, affixes: [2, 3] },
];

// 붙는 옵션 일곱 — 값 범위 [lo,hi], 층수(floor)가 값을 키운다(perFloor). pct=백분율.
const AFFIX_DEFS = {
  dmg:        { label: "피해",          pct: true,  base: [4, 9],   perFloor: 0.8 },
  atkSpeed:   { label: "공격 속도",     pct: true,  base: [3, 7],   perFloor: 0.5 },
  maxHp:      { label: "최대 생명",     pct: false, base: [20, 60], perFloor: 8 },
  minionDmg:  { label: "소환수 피해",   pct: true,  base: [5, 11],  perFloor: 0.9 },
  gold:       { label: "금 획득",       pct: true,  base: [6, 14],  perFloor: 1.0 },
  moveSpeed:  { label: "이동 속도",     pct: true,  base: [2, 5],   perFloor: 0.3 },
  novaRadius: { label: "시체 폭발 범위", pct: true, base: [5, 12],  perFloor: 0.8 },
};
export const AFFIX_KEYS = Object.keys(AFFIX_DEFS);

export const UNIQUES = [
  { name: "무덤의 쌍둥이 골수", slot: "amulet", key: "doubleNova",
    note: "시체 폭발이 두 번 터진다", lore: "무덤에서 둘로 갈린 골수, 두 번 운다." },
  { name: "군단의 뼈무지 제의", slot: "armor", key: "moreSkel",
    note: "해골 자리 +4", lore: "군단의 뼈를 겹겹이 기워 만든 갑주." },
  { name: "왕의 황금손 해골", slot: "helm", key: "goldRush",
    note: "금이 두 배로 떨어진다", lore: "만지는 것마다 금이 된 왕의 두개골." },
  { name: "분노의 음침한 약탈자", slot: "weapon", key: "splitSpear",
    note: "뼈 창이 두 갈래로 갈라진다", lore: "분노가 창끝을 둘로 쪼갠다." },
];

function pick(a) { return a[(Math.random() * a.length) | 0]; }

function rollRarity(floor, lucky) {
  const tbl = RARITY.map((r) => ({ ...r }));
  tbl[3].weight += floor * 0.6 + (lucky ? 6 : 0);
  tbl[2].weight += floor * 0.9;
  const tot = tbl.reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * tot;
  for (const r of tbl) { if ((n -= r.weight) <= 0) return r; }
  return tbl[0];
}

// 옵션 하나를 굴린다 — 층이 오를수록 범위가 통째로 위로 밀린다.
function makeAffix(key, floor) {
  const d = AFFIX_DEFS[key];
  const lo = d.base[0] + d.perFloor * (floor - 1);
  const hi = d.base[1] + d.perFloor * (floor - 1);
  const value = Math.round(lo + Math.random() * (hi - lo));
  return { key, label: `${d.label} +${value}${d.pct ? "%" : ""}`, value };
}

// n 개를 «겹치지 않게» 굴린다.
function rollAffixes(n, floor) {
  const pool = [...AFFIX_KEYS], out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const k = pool.splice((Math.random() * pool.length) | 0, 1)[0];
    out.push(makeAffix(k, floor));
  }
  return out;
}

let uniquePool = [];
export function resetUniques() { uniquePool = [...UNIQUES]; }

// ── V-230 — 층 주인 넷 · 어느 주인인가는 «한 곳»에서 정한다 ─────────────────────
// map.js(스폰)·main.js(수법·유니크)가 층→주인을 각자 셈하면 어긋난다. 규칙은 여기 하나.
//   5·6~9 → 0 뼈 왕 · 10~14 → 1 역병 주술사 · 15~19 → 2 무덤 도살자 · 20~24 → 3 저주받은 사제 · 25~ 되풀이.
//   (2~4층의 이른 주인은 뼈 왕으로 — 5층 관문과 같은 첫 얼굴을 준다.)
export function bossKindFor(floor) { return Math.max(0, Math.ceil(floor / 5) - 1) % UNIQUES.length; }

// 주인을 죽이면 «그 주인의» 유니크가 확정으로 하나 떨어진다(확률 아님 · 「넘은 표」가 나게).
// 옵션은 rollItem 의 유니크 규칙과 같게 굴린다. 소진 판정(uniquePool)은 무시한다 — 주인 표는 늘 준다.
export function bossUnique(kind, floor) {
  const u = UNIQUES[((kind % UNIQUES.length) + UNIQUES.length) % UNIQUES.length];
  const [lo, hi] = RARITY[3].affixes;
  const n = lo + ((Math.random() * (hi - lo + 1)) | 0);
  return { name: u.name, slot: u.slot, rarity: RARITY[3], unique: u, affixes: rollAffixes(n, floor) };
}

export function rollBuildAffix() {
  return Math.random() < 0.5
    ? { name: "+2 소환 자리", rarity: { color: "#7fe6a0" }, build: { kind: "slot", n: 2 } }
    : { name: "소환수 피해 +30%", rarity: { color: "#e8a24a" }, build: { kind: "minionDmg", mul: 1.3 } };
}

export function rollItem(floor, lucky) {
  const r = rollRarity(floor, lucky);

  // 유니크 — 고정 규칙 + 옵션 2~3. 넷을 다 쓰면 레어로 떨어진다.
  if (r.key === "gold" && uniquePool.length) {
    const u = uniquePool.splice((Math.random() * uniquePool.length) | 0, 1)[0];
    const [lo, hi] = RARITY[3].affixes;
    const n = lo + ((Math.random() * (hi - lo + 1)) | 0);
    return { name: u.name, slot: u.slot, rarity: RARITY[3], unique: u, affixes: rollAffixes(n, floor) };
  }

  const rar = r.key === "gold" ? RARITY[2] : r;   // 유니크 소진 → 레어
  const slot = pick(SLOTS);
  // 한글 어순 — 「[무엇]의 [꾸밈] [물건]」. 영어의 「A B of C」를 그대로 옮기면
  //   「사나운 손아귀 의 죽은 자」가 되어 말이 안 된다.
  const name = `${pick(OF)}의 ${pick(ADJ)} ${pick(SLOT_NOUNS[slot])}`;
  const [l2, h2] = rar.affixes;
  const n = l2 + ((Math.random() * (h2 - l2 + 1)) | 0);
  return { name, slot, rarity: rar, unique: null, affixes: rollAffixes(n, floor) };
}

// ── 합산 — «착용»이 반드시 지나는 한 곳(V-182 가 창만 얹으면 되게) ──────────────
// items 는 착용 중인 물건 배열. 모든 옵션을 key 별로 더해 한 덩어리로 돌려준다.
export function sumAffixes(items) {
  const sum = {};
  for (const k of AFFIX_KEYS) sum[k] = 0;
  for (const it of items) {
    if (!it || !it.affixes) continue;
    for (const a of it.affixes) sum[a.key] = (sum[a.key] || 0) + a.value;
  }
  return sum;
}

// 물건의 «값어치» — 옵션 값 합. 유니크는 규칙을 지녀 살짝 얹어 준다(자동 착용 판정용).
export function itemScore(it) {
  if (!it) return -1;
  let s = 0;
  for (const a of (it.affixes || [])) s += a.value;
  return s + (it.unique ? 120 : 0);
}
