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
export const MINIONS = {
  skel:  { n:"해골 전사", ico:"☠", cost:1, hp:26,  dmg:7,  spd:34, cd:0.9,
           d:"싸고 빠름 · 수로 민다" },
  ghoul: { n:"구울",     ico:"✦", cost:2, hp:64,  dmg:16, spd:30, cd:1.1,
           d:"물면 제 피가 찬다" },
  golem: { n:"흙 골렘",   ico:"◆", cost:5, hp:260, dmg:24, spd:19, cd:1.6,
           d:"느리지만 앞을 막는다" },
};
export const MINION_IDS = Object.keys(MINIONS);

/* ══ 스킬 벨트 ══ D2 의 그 띠. **시체를 쓰는 것과 안 쓰는 것**으로 갈린다 —
   시체가 자원이라는 게 벨트에서 바로 읽혀야 한다. */
export const SKILLS = [
  { id:"raise", n:"해골 되살리기", ico:"☠", mp:6,  cd:1.2, corpse:1, d:"시체 하나 → 해골 전사" },
  { id:"ghoul", n:"구울 일으키기", ico:"✦", mp:14, cd:3.0, corpse:2, d:"시체 둘 → 구울" },
  { id:"golem", n:"흙 골렘",      ico:"◆", mp:30, cd:12,  corpse:0, d:"땅에서 하나만" },
  { id:"nova",  n:"시체 폭발",    ico:"✹", mp:18, cd:2.2, corpse:1, d:"시체를 터뜨려 주위를 태움" },
  { id:"amp",   n:"약화의 저주",  ico:"✜", mp:12, cd:8,   corpse:0, d:"적이 받는 피해 ↑" },
];

/* ══ 층 ══ 깊이가 곧 난이도이자 보상이다. 5층마다 **관문**(보스). */
export const floorHp   = (f) => Math.round(30 * Math.pow(1.19, f - 1));
export const floorDmg  = (f) => Math.round(4  * Math.pow(1.155, f - 1));
export const floorN    = (f) => 5 + Math.floor(f * 0.7);
export const isGate    = (f) => f % 5 === 0;
export const goldFor   = (f) => Math.round(6 * Math.pow(1.12, f - 1));

/** 한 번의 내려감(run) 동안만 사는 값. **금·레벨은 여기 없다** — META 에 있다. */
export const S = {
  floor: 1, t: 0, speed: 1, running: true, dead: false,
  hp: 100, hpMax: 100, mp: 40, mpMax: 40,
  corpses: 0,                 // **시체가 자원이다**
  minions: [], mobs: [], fx: [],
  cd: {}, log: [], killed: 0, deepest: 1,
};

export const META_KEY = "necro.meta.v1";
export const META = load();
function load() {
  const base = { gold: 0, lv: 1, xp: 0, deepest: 1, runs: 0,
                 up: { hp:0, mp:0, dmg:0, army:0 } };
  try { return Object.assign(base, JSON.parse(localStorage.getItem(META_KEY) || "{}")); }
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
export const hpMaxOf  = () => 100 + (META.up.hp | 0) * 25 + (META.lv - 1) * 8;
export const mpMaxOf  = () => 40  + (META.up.mp | 0) * 8  + (META.lv - 1) * 3;
export const dmgMulOf = () => 1 + (META.up.dmg | 0) * 0.08 + (META.lv - 1) * 0.03;
export const armyCap  = () => 6 + (META.up.army | 0);
