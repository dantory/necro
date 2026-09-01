import { dirName, drawSprite8, footMetrics, frameCount, LOAD, loadManifest, preload, tex } from "./sprite.js";
import { genFloor } from "./map.js";
import { rollItem, resetUniques, rollBuildAffix, sumAffixes, SLOT_LABEL, bossUnique } from "./loot.js";
import { GRID_COLS, GRID_ROWS, layoutBag, bagFits, equipOp, unequipOp } from "./bag.js";

const cv = document.getElementById("board");
const ctx = cv.getContext("2d");
const mini = document.getElementById("mini");
const mctx = mini.getContext("2d");

// ★ V-183 — 깨우는 반경 540 → 900. 화면(가로 1008 월드)보다 좁던 반경을 넓혀,
//   한 방에 든 팩(V-183 map.js 에서 2~3개)이 함께 깨어나 한 자리로 몰려들게 한다.
//   한 팩만 깨면 화면이 빈다 — V-183 자로 재니 깬 팩 8인데 화면 안은 p50 0 이었다.
// ★ V-192 — 850 에선 화면 안 적 p50 이 1 이었다(자 hs_v192_dense · 카메라 사각 · 죽음형 3분).
//   봉우리(p95 32)는 넉넉한데 팩과 팩 사이 이동 구간이 통째로 비어 중앙값을 1 로 끌어내렸다.
//   1600 으로 넓혔더니 mean 은 11~14 로 올랐지만 p50 은 3 뿐 — 컷 넷 중 셋이 적 0 이었다.
//   까닭은 «플레이어가 제 무리를 앞질러» 달아나기 때문이다(플레이어 268 vs 적 138~178).
//   앞쪽 팩이 깨어도 이동이 빨라 사이가 벌어진다. 프레임은 p95 1.5ms 로 예산(16.7) 11배
//   남으니, 반경을 층 크기 언저리(3000)로 키워 온 층이 곧 깨어 «늘» 무리가 몰려들게 한다 —
//   뒤에 처진 무리도 카메라가 플레이어를 좇아 화면 뒤쪽에 남아 골(중앙값)을 메운다.
// ★★ V-207 (2026-09-01 00:18 병수님 「음,, 뭔가 잘못된 거 같다,,?」) — **깨우는 반경이
//   화면의 세 배였다.** 3000 은 층(3400×2200)의 **절반 넘는 범위**다. 방 하나에 들어서면
//   층의 거의 모든 무리가 한꺼번에 깨어나 몰려왔고, 컷에서 사람이 적 마흔에 파묻혔다.
//   ★ 그러면 V-145 에서 병수님이 못박은 것이 통째로 무너진다 —
//     「무리가 «자리에 잠들어» 있고 가까이 가야 깨어난다 · 화면 밖에서 계속 밀려오지 않는다」.
//     밸런스를 아무리 잡아도(V-202b·V-203b) 판은 **웨이브 방어**로 되돌아간다.
//   화면에 보이는 범위는 대략 1000×575 월드 단위(1512×863 ÷ Z 1.5)다.
//   ★ V-207 — 820 을 걸어서 재니(tools/hs_v207_walk) 아직 동시 무리 p95 3·적 32 로 떼거리였다
//     (방 하나가 팩 2~3 인데 820 이 방 전체+옆방을 덮었다). **화면 반폭(~500)** 으로 내려
//     동시 무리 p95 2·적 22 로 잡았다 — 「이 방의 무리」만, 그것도 화면에 들어올 때 깨어난다.
//     팩 크기 10~14 가 고정(V-202b)이라 「동시 적 ≤18」은 팩 둘이면 원리상 못 맞춘다(2×11≒22);
//     묶는 자는 「동시 무리 ≤2」이고 그게 맞았다.
const WAKE = 500;
const CULL = 1400;
const CHEST_OPEN_R = 78;
// ★★ V-208 (2026-09-01 00:18 병수님 「아군/적군 캐릭터 크기부터 너무 과한데」) —
//   재 보니 **온 판이 두 배**였다(화면 863 기준): 사람 18.1% · 해골 16.7% · brute 20.5% ·
//   보스 26.1%. 레퍼런스(히어로시즈)는 **8~10%** 다.
//   ★ 8-30 에 사람만 146→104 로 줄이고 **적·소환수는 안 건드렸다** — 한 번 고친 규칙을
//     옆으로 안 옮긴 그 버릇이다([[carry-fixes-forward]]).
//   두 곳을 같이 내린다: **배율 1.5→1.15** (시야가 1008×575 → 1315×750 으로 30% 넓어져
//   「무리를 보고 다가간다」가 생긴다) + **모든 몸 ×0.72**. 사람이 화면의 10% 가 된다.
//   V-148 이 이 배율로 막았던 「새까만 여백」은 V-206 의 카메라 클램프가 이미 막는다.
const Z = 1.15;               // 월드→화면 배율. 방을 화면에 채운다 (V-148 A)
const BASE_HP = 3315, BASE_MANA = 2286, BASE_SPD = 268, SPEAR_CD = 0.16;
const BASE_SLOTS = 8;   // V-186 — 자리 밑값. 위로 「군세」 스킬 자리 노드가 쌓인다.
// ★★ V-202b — 저울에 «천장»을 세운다. 여태 빌드 방울(바닥에 떨어지는 «자리 +2»·«소환수 피해 ×1.3»)이
//   상한 없이 쌓여, 자(tools/hs_v202b_shape.mjs)로 재니 소환 자리가 8→58·소환수 한 방 피해가
//   710→1,256,036(빌드 곱 ×705)까지 불었다(tmp/hs_v202b_before.json · 씨앗 다섯 × 층 다섯).
//   상한이 없으면 ⑴「무엇을 소환할까」가 선택이 아니라 «다 채우기»가 되고 ⑵피해가 여섯·일곱
//   자리로 뜻을 잃는다([[floor-erases-the-ramp]]). 곱셈으로만 쌓이던 성장에 천장을 준다.
const SLOT_CAP_MAX = 24;        // 소환 자리 상한의 천장 — 해골 24 · 거대 8 · 뼈거인 4. 무엇으로 채울지 고르게 한다.
const BUILD_SLOTS_CAP = 16;     // 빌드 방울로 더 얻는 자리의 천장(밑 8 + 스킬 8 + 빌드 ≤16 → SLOT_CAP_MAX 안에서 논다).
const MINION_MUL_CAP = 4;       // 빌드 방울 «소환수 피해» 곱의 천장 — ×705 → ×4. 스킬·지능(각각 ×2.4·×1.4)은 그대로.
// ★★ V-203 — 긴장 실험용 «세 팔». 전부 globalThis 손잡이 · 기본값 꺼짐이라, 켜지 않으면 판이 한 톨도 안
//   달라진다(자 tools/hs_v203_arms.mjs 가 off 행으로 확인). 아래 값은 손잡이가 켜졌을 때만 읽힌다.
//   ① __ENEMY_REACH — 적 근접 피해·사거리를 키운다(가장 단순 · 소환수가 다 막으면 그대로 0 일 수 있다).
//   ② __RANGED_MOB  — 일부 적을 원거리로(뒤에서 쏜다). 화살이 소환수 벽을 «넘어» 사람에게 닿는다.
//   ③ __CHARGER_MOB — 일부 적을 돌진형으로(사람을 못박아 벽을 뚫고 문다).
//   ★ 병수님이 표를 보고 고른다 — 자기가 하나를 골라 기본값으로 켜지 않는다(작업지시 D).
const REACH_DMG_MUL = 3, REACH_ADD = 130;                                  // 팔①: 근접 피해 곱·사거리 덧셈
const RANGED_RANGE = 470, RANGED_CD = 1.4, RANGED_SPD = 520;               // 팔②: 사거리·재장전초·화살 속도
const CHARGE_CD = 2.6, CHARGE_RANGE = 620, CHARGE_SPD_MUL = 3.4, CHARGE_DUR = 0.6, CHARGE_BITE = 1.6;  // 팔③
// ★★ V-203b — 병수님 8-31 17:34 「알아서 해라」 → V-203 표대로 **닿게 하는 팔 + 아프게 하는 팔**을 둘 다 켠다.
//   ㉠ __RANGED_MOB 을 기본 켬으로. 원거리 화살만 소환수 벽을 «원리로» 넘어 사람에게 닿는다(V-203: 맞은수/초 0.8).
//      끄는 손잡이는 남긴다 — `globalThis.__RANGED_MOB = false` 로 되돌린다.
if (globalThis.__RANGED_MOB === undefined) globalThis.__RANGED_MOB = true;
//   ㉡ 적 피해를 사람 hp(≈4,515) 규격에 맞춘다. base 6~18 × scale(1+층×0.35) 는 hp 의 0.1% — 한 대가 안 아프다.
//      층 깊이 성장 축(scale)은 그대로 두고, 그 위에 **사람에게 닿는 피해에만** 곱을 얹는다(m.dmg 자체는 안 건드려
//      소환수 vs 적 밸런스는 유지 — hurtPlayer 한 곳에서만 곱한다). 되돌리려면 `globalThis.__FOE_DMG = 1`.
const FOE_DMG_MUL = globalThis.__FOE_DMG ?? 16;
const PLAYER_BASE = "char/necro";
// ★ 2026-08-30 02:32 병수님: 「내 캐릭터가 너무 크다, 작아도 될 듯」.
//   146 × Z(1.5) = 화면 219px — 863 짜리 화면의 25% 였다(레퍼런스 히어로시즈는 8~10%).
//   주변 잡몹(≈100px)·해골(96)보다 혼자 1.5 배라 「사람만 확대된」 그림이었다.
//   104 로 내린다 — 해골보다 살짝 크되 무리 속에 같이 서는 크기.
const PLAYER_H = 75;    // V-208 — 화면의 10%(레퍼런스와 같은 급)
const SPEAR_LEN = PLAYER_H * 0.42;   // 뼈창 발사체 길이 — 시전자 키에 견줘 정한다(매직 픽셀 아님)
const SPEARHIT_H = PLAYER_H * 0.5;   // 뼈창 명중 임팩트 크기 — 시전자 키에 견줘 정한다(매직 픽셀 아님)
const GOLD_W = PLAYER_H * 0.2;   // V-217 — 금 스프라이트 폭. 시전자 키에 견줘 정한다(높이는 에셋 비율에서)
const FOESHOT_W = PLAYER_H * 0.3;   // V-218 — 적 화살 스프라이트 길이(옛 fillRect 막대 ~22px 자리). 키에 견줘 정한다(매직 픽셀 아님)
const GOLD_CAP = 10;   // V-217 — 화면 동시 금 개체 상한. 넘으면 가장 오래된 톨에 합친다(값 보존)
const BOOM_CAP = 24, HIT_CAP = 48;   // 동시 연출 개수 상한(parts 400·floats 60 과 같은 결) — 프레임을 먹지 않게
// ── V-230 — 층 주인 넷의 «수법» 손잡이 ──────────────────────────────────────
// 자를 안 건드리는 판이라 값은 눈으로 잡는다. 주인은 평소엔 쫓아와 때리고(근접), 재충전(skillCd)이
// 차면 «예고(붉은 자리·번쩍임) → 터짐»을 한 번 쓴다. 예고 사이에 피하면 「넘었다」가 된다.
const BOSS_CD = [7.0, 3.6, 3.8, 8.5];          // 뼈왕 · 역병 · 도살자 · 사제 — 수법 재충전(초)
const BOSS_WARN = [0.8, 0.7, 0.7, 0.9];        // 예고가 떠 있는 시간 — 이 사이에 피한다
const BOSS_TINT = [                             // 새 에셋 없이 색조로 넷을 가른다(창백한 뼈·초록·핏빛·보라)
  "brightness(1.4) saturate(0.3) sepia(0.25) hue-rotate(-8deg)",
  "brightness(1.05) saturate(2.2) hue-rotate(60deg)",
  "brightness(1.05) saturate(2.4) hue-rotate(-28deg)",
  "brightness(1.12) saturate(2.4) hue-rotate(268deg)",
];
const BOSS_LABEL_COL = ["#e8ecf0", "#8ce06a", "#ff7a5a", "#c89bff"];
const CAGE_R = 150, CAGE_SEG = 11, CAGE_LIFE = 6.0;   // 뼈 왕 — 우리 반경·뼈 토막 수·유지 시간(초)
const POOL_LIFE = 4.5;                                 // 역병 — 독 장판 지속(초)
const CURSE_DUR = 4.0;                                 // 사제 — 저주(내 피해 반) 지속(초)
const SKEL_BASE = "minion/skel";
const SKEL_H = 69;      // V-208
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
  "decor/coffin.png", "decor/rubble.png", "decor/statue.png", "decor/brazier.png", "decor/chest.png", "decor/stairs.png"];

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
let killStreak = 0, lastKillT = 0;   // V-183 처치 연쇄 — 짧은 시간 안에 몰살하면 연출이 커진다
let G = null;
// ── V-205 측정용 고정 dt ──────────────────────────────────────────────────
// 평소엔 벽시계(performance.now)로 굴러가지만, 측정 때는 `globalThis.__FIXED_DT`(초, 예 1/60)
// 가 양수면 매 프레임 dt 를 그 값으로 «고정»해 헤드리스 프레임 간격의 잡음을 뿌리에서 없앤다.
// 연출의 sin(performance.now/…) 도 고정 dt 일 땐 «누적 게임시간»(nowMs)을 써야 결정성이 온전하다 —
// 안 그러면 연출만 벽시계로 남는다. gameTime 은 판이 새로 서도(fresh) 안 지워진다.
// 평소 플레이 동작은 한 글자도 안 바뀐다(__FIXED_DT 가 없거나 0 이면 전부 벽시계 그대로).
let gameTime = 0;   // 초, loop 가 매 프레임 dt 만큼 쌓는다
function nowMs() { const fd = globalThis.__FIXED_DT; return fd > 0 ? gameTime * 1000 : performance.now(); }
window.__gameSec = () => gameTime;   // 자가 벽시계 대신 이 게임시간을 읽는다
let invOpen = false;
let charOpen = false;
let hoverItem = null, hoverRect = null;   // 창 안에서 마우스를 얹은 물건 — 툴팁·비교가 쓴다

// ── 프레임 프로파일러 (V-154 C) ─────────────────────────────────────────────
// fp95 가 «어디서» 드는지 재려는 계기다 — 짐작으로 손대지 않기 위해서. 단계마다
// performance.now() 를 몇 번 부를 뿐이라 오버헤드는 무시할 수준. hs_p6_run 이
// 층 끝에 window.__prof.summary() 를 함께 적어, 프레임 시간을 sim/draw/hud 와
// 그리기 하위 단계로 갈라 본다.
const PROF = {
  buf: { total: [], sim: [], draw: [], hud: [] },
  sub: {},
  mark: 0,
  seg(name) { const t = performance.now(); (this.sub[name] ||= []).push(t - this.mark); this.mark = t; },
  push(k, v) { const a = this.buf[k]; a.push(v); if (a.length > 2000) a.shift(); },
  pct(a, p) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2); },
  summary() {
    const o = { n: this.buf.total.length, phase: {}, drawSub: {} };
    for (const k of ["total", "sim", "draw", "hud"]) o.phase[k] = { p50: this.pct(this.buf[k], 0.5), p95: this.pct(this.buf[k], 0.95) };
    for (const k in this.sub) o.drawSub[k] = { p50: this.pct(this.sub[k], 0.5), p95: this.pct(this.sub[k], 0.95) };
    return o;
  },
  reset() { for (const k in this.buf) this.buf[k] = []; this.sub = {}; },
};
window.__prof = PROF;

// ── V-189 계측 — 「다르게 찍으면 다르게 놀리는가」를 수로 재려 출처별 낸 피해를 쌓는다.
// window 에 붙여 판이 새로 서도(죽어 R) 안 지워진다. 자(probe)가 재기 전에 Object.assign 으로
// 제자리에서 0 으로 비운다(재대입하면 아래 const 참조가 옛 것을 가리켜 못 비운다).
const METRIC = (window.__hsMetric = window.__hsMetric ||
  { spear: 0, nova: 0, minion: 0, taken: 0, deaths: 0, kills: 0, grains: 0, foeShot: 0, foeHit: 0 });

// ── V-205 ㉢ 프레임정확 층 기록 (METRIC 과 같은 관찰 전용 계기 · 게임 로직/연출 불변).
// 벽시계 250ms 표본으로 층 경계 지표를 읽으면 같은 씨앗이라도 프레임이 어긋나 kills·hitN 이 센다.
// 그래서 층 전환 프레임에 «정확히» 스냅샷을 박아, 결정성 비교가 표본 타이밍에 안 흔들리게 한다.
const FLOORLOG = (window.__floorLog = []);
let flFloor = 0, flKills0 = 0, flHit0 = 0, flDeath0 = 0, flG0 = 0, flHpMin = 100;
// V-226 계기 — «깊이 곡선이 사람보다 가파른가»를 재려면 층마다 두 수가 같이 있어야 한다:
//   사람 maxhp(그 층에서 본 최대) 와 적 dmg 중앙(층에 들어선 순간). 지표만 늘리고 게임 값은 안 건드린다.
let flMaxhp = 0, flFoeDmg = 0;
function foeDmgMedian() {
  const ds = [];
  for (const pk of (G && G.packs) || []) for (const m of pk.enemies) if (m.alive) ds.push(m.dmg);
  if (!ds.length) return 0;
  ds.sort((a, b) => a - b);
  return Math.round(ds[ds.length >> 1]);
}
function floorLogTick() {
  if (!G || !G.player) return;
  if (G.floor !== flFloor) {
    if (flFloor > 0) FLOORLOG.push({ floor: flFloor, kills: METRIC.kills - flKills0,
      hitN: (METRIC.hitN || 0) - flHit0, died: ((METRIC.deaths || 0) - flDeath0) > 0 ? 1 : 0,
      hpMin: flHpMin, maxhp: flMaxhp, foeDmg: flFoeDmg, sec: Math.round((gameTime - flG0) * 1000) / 1000 });
    flFloor = G.floor; flKills0 = METRIC.kills; flHit0 = METRIC.hitN || 0;
    flDeath0 = METRIC.deaths || 0; flG0 = gameTime; flHpMin = 100;
    flMaxhp = Math.round(G.player.maxhp); flFoeDmg = foeDmgMedian();
  }
  const hpP = Math.round(100 * G.player.hp / G.player.maxhp);
  if (hpP < flHpMin) flHpMin = hpP;
  if (G.player.maxhp > flMaxhp) flMaxhp = Math.round(G.player.maxhp);
  if (!flFoeDmg) flFoeDmg = foeDmgMedian();
}
window.__floorLogReset = () => { FLOORLOG.length = 0; flFloor = (G && G.floor) || 0;
  flKills0 = METRIC.kills; flHit0 = METRIC.hitN || 0; flDeath0 = METRIC.deaths || 0;
  flG0 = gameTime; flHpMin = 100; flMaxhp = (G && G.player) ? Math.round(G.player.maxhp) : 0; flFoeDmg = foeDmgMedian(); };
// 측정 시작점을 프레임에 안 매이게 — 부팅 동안 흐른 프레임 수만큼 RNG·배치가 달라져 씨앗을 고정해도
// 두 판이 갈렸다. 자가 여기서 «갓 지은 1층»으로 되돌려 측정을 같은 상태에서 연다(RNG 는 자가 다시 심는다).
window.__restart = (fl) => start(fl || 1, null);
// ── V-230 컷용 개발 손잡이 — 주인을 깨워 «수법 쓰는 순간»으로 세운다(측정 자가 아니다) ──
// 첫 시전을 끝까지 진행해 실제 결과(뼈 우리·독 장판·소환)를 만든 뒤, 새 예고를 다시 띄워
// 한 컷에 「예고 + 방금 터진 것」이 같이 잡히게 한다. 사람이 열어 넷을 눈으로 가르려는 것.
window.__bossPose = () => {
  let boss = null, bpk = null;
  for (const pk of G.packs) for (const m of pk.enemies) if (m.boss) { boss = m; bpk = pk; }
  if (!boss) return null;
  bpk.awake = true;
  const p = G.player;
  p.x = boss.x + 165; p.y = boss.y + 8; unstick(p, p.r);
  boss.skillCd = 0; boss.cast = null;
  startCast(boss, p);
  for (let i = 0; i < 240 && boss.cast; i++) advanceCast(boss, p, 1 / 60, bpk);
  boss.skillCd = 0; startCast(boss, p);
  G.bossBanner = { name: boss.name, kind: boss.bossKind, t: 0.35 };
  cam.x = (boss.x + p.x) / 2 - VW / (2 * Z); cam.y = boss.y - VH / (2 * Z) + 30;
  return { x: boss.x, y: boss.y, kind: boss.bossKind, name: boss.name };
};

function fresh(floor, carry) {
  const f = genFloor(floor);
  const p = carry ? carry.player : {
    maxhp: BASE_HP, hp: BASE_HP, maxmana: BASE_MANA, mana: BASE_MANA, spd: BASE_SPD, level: 1,
    mult: { dmg: 1, body: 1, minionDmg: 1 }, uniques: new Set(), slots: BASE_SLOTS,
    grade: 0, maxGrade: 0,
    attr: { str: 0, dex: 0, int: 0, sta: 0, def: 0, vit: 0 },
    skill: { slot: 0, grade: 0, mdmg: 0, mhp: 0, spear: 0, nova: 0, curse: 0 },
    attrPts: 0, sklPts: 0, buildSlots: 0,
    bag: [], equipped: {},
    dmgMul: 1, spearMul: 1, novaDmgMul: 1, minionMul: 1, minionHpMul: 1,
    atkCd: SPEAR_CD, goldMul: 1, novaMul: 1, dr: 0,
  };
  p.x = f.startX; p.y = f.startY; p.dx = 0; p.dy = 1; p.anim = 0; p.state = "idle";
  p.spearCd = 0; p.hurt = 0; p.iframe = 0; p.r = PLAYER_R;
  return {
    floor, ...f, player: p,
    minions: carry ? carry.minions.map((m) => ({ ...m, x: f.startX + (Math.random() * 80 - 40), y: f.startY + (Math.random() * 80 - 40) })) : [],
    spears: [], golds: [], items: [], corpses: [], parts: [], floats: [], booms: [], hits: [], foeShots: [],
    hazards: [], bones: [], bossBanner: null,
    pickLog: carry ? carry.pickLog : [], kills: carry ? carry.kills : 0, picks: carry ? carry.picks : 0,
    gold: carry ? carry.gold : 0, xp: carry ? carry.xp : 0,
    dead: false, cleared: 0, packsTotal: f.packs.length,
  };
}

function start(floor, carry) {
  G = fresh(floor, carry);
  G.blockProps = G.props.filter((pr) => BLOCK_IMGS.has(pr.img));
  window.G = G; window.cam = cam; window.HSZ = Z; window.SKEL_TIERS = SKEL_TIERS;
  window.recalc = recalc;   // 검수기가 «실제 문»으로 스탯을 다시 세우게 (V-182b)
  window.toggleChar = toggleChar;   // 검수기가 창을 열게(찍기는 창의 + 단추 실클릭으로)
  window.spendAttr = spendAttr; window.spendSkill = spendSkill;   // V-226 자가 «번 점수»를 실제 문으로 쓰게
  window.__walkable = (x, y, r = PLAYER_R) => walkable(x, y, r);   // V-201 자가 «실제 문»으로 재게
  window.__blockers = () => G.blockProps.map((pr) => ({ x: pr.x, y: pr.y, r: propBlockR(pr) }));
  const p = G.player;
  unstick(p, p.r);
  for (const m of G.minions) unstick(m, m.r || 15);
  cam.x = p.x - VW / (2 * Z); cam.y = p.y - VH / (2 * Z);
  recalc();
  document.getElementById("dead").style.display = "none";
}

// ── V-201 충돌 판정 — 걸을 수 있는 자리 = 방 ∪ 복도, 밖은 암반 ──────────────
// 여태 사람을 움직이는 코드는 «맵 바깥 테두리»(40..W-40)만 막고 방·복도·벽·소품을
// 다 무시했다(V-201). 이제 map.js 가 이미 만드는 rooms·corridors(둘 다 사각형)의
// 합집합만 걷는다. 새로 지을 것은 없다 — 그 사각형들에 «몸 반지름»을 먹여 판정한다.
const PLAYER_R = 22;   // 사람 발밑 반지름. 답답하면 여기(또는 미끄러짐)를 손댄다(V-201 주의).
// ★ V-206 ㉡ — 발사체(뼈창·적 화살) 벽 판정 반지름. 작게 둔다 — 문틀·복도를 지나는 창이 억울하게
//   안 죽게(6~8 사이). 벽 판정은 inFree(방∪복도)만 본다 — 소품(기둥·상자)까지 막으면 방 안에서 못 싸운다.
const PROJ_R = 7;
// 서 있는 물건 — 통과하면 안 된다(몸으로 막는다). 잔해·뼈·항아리·얼룩은 «바닥 그림»이라 뺀다.
// 계단(stairs)은 «구멍»이라 애초에 props 가 아니고, 여기서도 막지 않는다 — 밟아야 내려간다.
const BLOCK_IMGS = new Set(["decor/pillar.png", "decor/column2.png", "decor/statue.png",
  "decor/coffin.png", "decor/brazier.png"]);

// 막는 크기는 매직넘버가 아니라 spriteFoot 이 낸 «발밑 폭»에서 낸다(이미 있는 함수). 그림이
// 아직 안 왔으면 임시로 키에서 짐작하되 캐시하지 않는다 — 로드되면 다음에 실측으로 굳는다.
function propBlockR(pr) {
  if (pr._br != null) return pr._br;
  const im = tex(pr.img);
  if (im && im.width) {
    const wpx = pr.h * (im.width / im.height);
    const fo = spriteFoot(im, pr.img);
    return (pr._br = fo ? Math.max(10, fo.w * wpx / 2) : wpx * 0.22);
  }
  return pr.h * 0.22;
}

// 그 점이 어느 방/복도 안인가 — 몸 반지름 r 만큼 사각형을 안으로 줄여 판정한다(벽에 안 낀다).
function inFree(x, y, r) {
  for (const rm of G.rooms) if (x >= rm.x + r && x <= rm.x + rm.w - r && y >= rm.y + r && y <= rm.y + rm.h - r) return true;
  for (const c of G.corridors) if (x >= c.x + r && x <= c.x + c.w - r && y >= c.y + r && y <= c.y + c.h - r) return true;
  return false;
}
// 서 있는 소품·상자에 몸이 겹치나. y(깊이)는 0.62 눌러 «발자국»만 막는다(위로 솟은 부분은 원근으로 겹쳐도 됨).
function blockedByProp(x, y, r) {
  for (const pr of G.blockProps) {
    const br = propBlockR(pr) + r, dx = x - pr.x, dy = (y - pr.y) / 0.62;
    if (dx * dx + dy * dy < br * br) return true;
  }
  for (const ch of G.chests) {
    const br = (ch.r || 26) + r, dx = x - ch.x, dy = (y - ch.y) / 0.62;
    if (dx * dx + dy * dy < br * br) return true;
  }
  return false;
}
function walkable(x, y, r) { return inFree(x, y, r) && !blockedByProp(x, y, r); }

// 미끄러진다 — 벽에 부딪히면 멈추는 게 아니라 축을 나눠 민다(x 되면 x, y 되면 y). 그래야
// 벽을 따라 걷고 모서리에서 안 낀다. 이게 없으면 조작이 답답해진다(V-201 주의).
function stepTo(e, nx, ny, r) {
  if (nx !== e.x && walkable(nx, e.y, r)) e.x = nx;
  if (ny !== e.y && walkable(e.x, ny, r)) e.y = ny;
}
// 끼면 빼낸다 — 걸을 수 없는 자리에 서면(층 생성·순간이동·밀림) 가장 가까운 걸을 수 있는 자리로.
function unstick(e, r) {
  if (walkable(e.x, e.y, r)) return;
  for (let step = 10; step <= 700; step += 10)
    for (let a = 0; a < 12; a++) {
      const ang = a / 12 * 6.2832;
      const x = e.x + Math.cos(ang) * step, y = e.y + Math.sin(ang) * step;
      if (walkable(x, y, r)) { e.x = x; e.y = y; return; }
    }
}

// ── V-206 ㉠ 카메라를 «보이는 것이 있는 쪽»으로 물린다 ───────────────────────
// V-201 때는 방·복도 밖이 검은 «공허»라, 카메라를 사람이 든 방 사각 안으로 clamp 해 공허를
// 안 비추게 했다(localBounds). 그런데 V-212 가 밖을 전부 «암반»으로 채워 공허가 사라졌고,
// V-213 자로 재니 그 clamp 가 사람을 화면 가로 30%(둘 다 켜짐)로 밀고 있었다 — 핵앤슬래시는
// 사람이 늘 화면 한가운데다. 그래서 두 clamp 를 기본 «끔»으로 돌려 카메라가 사람을 그대로
// 따라가게 한다(가로·세로 50%). 두 손잡이는 before 재현·되돌리기용으로 남긴다:
//   __CAM_CLAMP===true → localBounds 지역 clamp 켬 · __CAM_MAPCLAMP===true → 맵-전체 clamp 켬.
const CAM_MARGIN = 48;   // (지역 clamp 를 켰을 때) 걸을 수 있는 덩어리 밖으로 더 보여 주는 여유.
// 사람 중심 화면과 겹치는 방·복도의 bbox. 카메라를 이 안으로만 물리는 게 핵심 불변식이다 —
// 화면에 이미 보이는 walkable 은 절대 안 잘리므로(공허가 늘 수 없다) «항상 같거나 덜 공허»하고,
// 벽 붙음처럼 덩어리 «너머»가 암반일 때만 그 암반을 덜 비춘다. 겹치는 게 없으면 null(사람 중심 그대로).
function localBounds(vx, vy, vw, vh) {
  const vx1 = vx + vw, vy1 = vy + vh;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, hit = false;
  const acc = (r) => {
    if (r.x < vx1 && r.x + r.w > vx && r.y < vy1 && r.y + r.h > vy) {
      hit = true;
      if (r.x < x0) x0 = r.x; if (r.y < y0) y0 = r.y;
      if (r.x + r.w > x1) x1 = r.x + r.w; if (r.y + r.h > y1) y1 = r.y + r.h;
    }
  };
  for (const rm of G.rooms) acc(rm);
  for (const c of G.corridors) acc(c);
  return hit ? { x0, y0, x1, y1 } : null;
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
    stepToP(p, p.x + mx * p.spd * dt, p.y + my * p.spd * dt, p.r);
    p.dx = mx; p.dy = my; p.state = "walk"; p.anim += dt * 11;
  } else { p.state = "idle"; p.anim += dt * 6; }

  const tx = cam.x + mouse.x / Z, ty = cam.y + mouse.y / Z;
  p.spearCd -= dt;
  if (mouse.down && p.spearCd <= 0 && !invOpen && !charOpen) {
    fireSpear(p, tx, ty);
    p.spearCd = p.atkCd;
  }
  if (p.mana < p.maxmana) p.mana = Math.min(p.maxmana, p.mana + 60 * dt);
  if (p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + 22 * dt);
  if (p.iframe > 0) p.iframe -= dt;
  if (p.curse > 0) p.curse -= dt;   // V-230 사제의 저주 — 남은 동안 내 피해가 반(curseF)

  const vw = VW / Z, vh = VH / Z;
  let tcx = p.x - vw / 2, tcy = p.y - vh / 2;
  const reg = (globalThis.__CAM_CLAMP === true && G.rooms) ? localBounds(tcx, tcy, vw, vh) : null;
  if (reg) {
    const x0 = reg.x0 - CAM_MARGIN, y0 = reg.y0 - CAM_MARGIN, x1 = reg.x1 + CAM_MARGIN, y1 = reg.y1 + CAM_MARGIN;
    tcx = (x1 - x0 <= vw) ? (x0 + x1) / 2 - vw / 2 : Math.max(x0, Math.min(x1 - vw, tcx));
    tcy = (y1 - y0 <= vh) ? (y0 + y1) / 2 - vh / 2 : Math.max(y0, Math.min(y1 - vh, tcy));
  }
  cam.x += (tcx - cam.x) * Math.min(1, dt * 8);
  cam.y += (tcy - cam.y) * Math.min(1, dt * 8);
  if (globalThis.__CAM_MAPCLAMP === true) {
    cam.x = Math.max(0, Math.min(G.W - vw, cam.x));
    cam.y = Math.max(0, Math.min(G.H - vh, cam.y));
  }
}

function curseF() { return G.player.curse > 0 ? 0.5 : 1; }   // V-230 — 사제의 저주가 걸린 동안 내 피해 반

function fireSpear(p, tx, ty) {
  const a = Math.atan2(ty - p.y, tx - p.x);
  const dmg = 42 * p.dmgMul * p.spearMul * curseF();
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
  if (keys.has("i") && !p._i) { p._i = true; toggleInv(); } if (!keys.has("i")) p._i = false;
  if (keys.has("c") && !p._c) { p._c = true; toggleChar(); } if (!keys.has("c")) p._c = false;
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
function slotCap() { const p = G.player; return Math.min(SLOT_CAP_MAX, p.slots + (p.uniques.has("moreSkel") ? 4 : 0)); }

function selectGrade(i) {
  const p = G.player;
  if (i > p.maxGrade) {
    floatNote(SKEL_TIERS[i].label + " — 아직 잠김 (X로 해금)", "#e0663c", 1.2);
    return;
  }
  p.grade = i;
  raiseSkeleton();
}

function raiseSkeleton() {
  const p = G.player;
  const tier = Math.min(p.grade, p.maxGrade, SKEL_TIERS.length - 1);
  const T = SKEL_TIERS[tier];
  if (slotsUsed() + T.slot > slotCap()) {
    floatNote(`자리가 부족하다 (${T.label} ${T.slot}칸)`, "#e0663c", 1.2);
    return;
  }
  const ci = nearestCorpse(p.x, p.y, 300);
  if (ci < 0) {
    floatNote("가까운 시체가 없다", "#c8a04a", 1.0);
    return;
  }
  const c = G.corpses[ci]; c.used = true;
  const hp = (200 + G.floor * 40) * T.hpMul * p.minionHpMul;
  G.minions.push({ base: SKEL_BASE, x: c.x, y: c.y, hp, maxhp: hp,
    dmg: (34 + G.floor * 10) * T.dmgMul * p.minionMul, spd: 250 * T.spdMul, atkCd: 0.6 * T.atkMul,
    r: 15 * T.scale, h: SKEL_H * T.scale, tier, slot: T.slot, cleave: T.cleave, ring: T.ring, ringCol: T.ringCol, shake: T.shake,
    filt: T.filt, dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1 });
  const col = tier === 0 ? "#9fe6c8" : tier === 1 ? "#bfe08a" : "#e0b060";
  for (let i = 0; i < 12 + tier * 6; i++) burst(c.x, c.y - 20, col, 120 + tier * 50);
  if (T.shake) cam.shake = Math.max(cam.shake, T.shake);
}

// ── V-186 성장 자료 (HS_STYLE ⑤) ────────────────────────────────────────────
// 스탯 여섯 → 실제 수를 움직이는 표. recalc() 한 문이 이 표를 편다.
//   힘 str  → dmgMul   (뼈창·시체폭발 기본 피해)  +3%/pt
//   민첩 dex → atkCd    (공격 속도, 낮을수록 빠름)  +2%/pt
//   지능 int → minionMul(소환수 피해)             +2%/pt
//   기력 sta → maxmana                            +40/pt
//   방어 def → dr       (받는 피해 감소, 상한 75%) +1.2%/pt
//   활력 vit → maxhp                              +120/pt
// per: 한 점의 몫(단일 출처) · unit: "%"면 배수 계열(칸에 +N%), ""면 더하기 계열(+N) ·
// cap: 상한 퍼센트(방어만). recalc() 도 attrLive() 도 이 수를 읽는다 — 두 자리에 안 적는다
// (V-187: 스탯 칸이 통합 배수를 물어 지능 1점에 ×553 이 떴다 → 칸엔 «그 스탯의 순수 몫»만).
const ATTRS = [
  { key: "str", name: "힘",   col: "#d86a5a", moves: "뼈창·시체폭발 피해 +3%", field: "dmgMul",    per: 3,   unit: "%" },
  { key: "dex", name: "민첩", col: "#6fd0a0", moves: "공격 속도 +2%",          field: "atkCd",     per: 2,   unit: "%" },
  { key: "int", name: "지능", col: "#6fa8ff", moves: "소환수 피해 +2%",        field: "minionMul", per: 2,   unit: "%" },
  { key: "sta", name: "기력", col: "#c89be6", moves: "최대 마나 +40",          field: "maxmana",   per: 40,  unit: "" },
  { key: "def", name: "방어", col: "#c8b06a", moves: "받는 피해 -1.2% (≤75%)", field: "dr",        per: 1.2, unit: "%", cap: 75 },
  { key: "vit", name: "활력", col: "#e0664c", moves: "최대 생명 +120",         field: "maxhp",     per: 120, unit: "" },
];
const ATTR = Object.fromEntries(ATTRS.map((a) => [a.key, a]));
// 스킬트리 두 갈래. prereq: 앞 칸을 한 점이라도 안 찍으면 뒤 칸이 잠긴다.
// syn: 「Receives Bonuses From:」 시너지 목록(초록 제목 · 항목마다 +N% per level).
const SKILL_TREES = {
  army: { title: "군세", col: "#6fa8ff", nodes: [
    { key: "slot",  name: "소환 자리",   max: 8,  per: "자리 +1",         field: "slots",       syn: [] },
    { key: "grade", name: "소환 등급",   max: 2,  per: "상위 소환 해금",   field: "maxGrade",    prereq: "slot", syn: [{ from: "소환 자리", pct: 0 }] },
    { key: "mdmg",  name: "소환수 피해", max: 20, per: "소환수 피해 +14%", field: "minionMul",   prereq: "grade", syn: [{ from: "지능", pct: 2 }] },
    { key: "mhp",   name: "소환수 생명", max: 20, per: "소환수 생명 +10%", field: "minionHpMul", prereq: "mdmg", syn: [{ from: "활력", pct: 3 }] },
  ] },
  death: { title: "죽음", col: "#d86a5a", nodes: [
    { key: "spear", name: "뼈창",       max: 20, per: "뼈창 피해 +14%",   field: "spearMul",   syn: [{ from: "힘", pct: 3 }] },
    { key: "nova",  name: "시체폭발",   max: 20, per: "시체폭발 피해 +18%", field: "novaDmgMul", prereq: "spear", syn: [{ from: "힘", pct: 3 }] },
    { key: "curse", name: "저주",       max: 10, per: "모든 피해 +4%",    field: "dmgMul",     prereq: "nova", syn: [{ from: "지능", pct: 2 }] },
  ] },
};
const SKILL_ICON = { slot: "raise", grade: "grade", mdmg: "mdmg", mhp: "mhp", spear: "spear", nova: "nova", curse: "amp" };
function skillNode(key) { for (const t of Object.values(SKILL_TREES)) for (const n of t.nodes) if (n.key === key) return n; return null; }
function skillLocked(node) { return !!node.prereq && G.player.skill[node.prereq] < 1; }

function spendAttr(key) {
  const p = G.player;
  if (p.attrPts <= 0) { floatNote("스탯 점수가 없다", "#c8a04a", 1.0); return false; }
  p.attrPts--; p.attr[key]++; recalc();
  return true;
}
function spendSkill(key) {
  const p = G.player, node = skillNode(key);
  if (p.sklPts <= 0) { floatNote("스킬 점수가 없다", "#c8a04a", 1.0); return false; }
  if (skillLocked(node)) { floatNote(node.name + " — 앞 칸을 먼저 찍어라", "#e0663c", 1.2); return false; }
  if (p.skill[key] >= node.max) { floatNote(node.name + " — 최대", "#c8a04a", 1.0); return false; }
  p.sklPts--; p.skill[key]++;
  if (key === "grade") p.grade = p.skill.grade;
  recalc();
  return true;
}
function resetAttrs() {
  const p = G.player; let back = 0;
  for (const k in p.attr) { back += p.attr[k]; p.attr[k] = 0; }
  p.attrPts += back; recalc();
}
function resetSkills() {
  const p = G.player; let back = 0;
  for (const k in p.skill) { back += p.skill[k]; p.skill[k] = 0; }
  p.sklPts += back; p.grade = 0; recalc();
}
// 빠른 손(Z/X) — 창과 «같은 자료»를 고친다. Z: 군세 자리 · X: 등급(다 열면 소환수 피해).
function spendPoint(kind) {
  if (kind === "slot") { if (spendSkill("slot")) floatNote("자리 +1", "#7fe6a0", 1.4); return; }
  const p = G.player;
  if (p.skill.grade < 2) { if (spendSkill("grade")) floatNote(SKEL_TIERS[p.grade].label + " 해금", "#e8a24a", 1.6); }
  else if (spendSkill("mdmg")) floatNote("소환수 피해 +8%", "#e8a24a", 1.4);
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
  for (let t = 0; t < times; t++) explode(c.x, c.y, 18 * p.dmgMul * p.novaDmgMul * curseF(), 150 * p.novaMul, t * 0.09);
}

function explode(x, y, dmg, rad, delay) {
  setTimeout(() => {
    if (!G) return;
    cam.shake = Math.max(cam.shake, 14);
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * 6.283, s = 60 + Math.random() * 260;
      G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, col: "#ff7a3c", r: 3 + Math.random() * 3 });
    }
    // ㉠ V-199 — 폭발 임팩트를 픽셀랩 스프라이트(fx/boom.png)로 그린다(drawWorld). 반경 rad 에 맞춰 커지며 사그라든다.
    //   동시 개수 상한(BOOM_CAP)을 넘으면 옛 주황 고리 float 로 폴백한다 — 연출이 프레임을 먹지 않게.
    if (G.booms.length < BOOM_CAP) G.booms.push({ x, y, t: 0, life: 0.55, rad });
    else G.floats.push({ x, y: y - 30, t: 0.9, txt: "", ring: rad });
    forEachEnemy((m) => {
      if ((m.x - x) ** 2 + (m.y - y) ** 2 < rad * rad) hurtEnemy(m, dmg, (m.x - x), (m.y - y), "nova");
    });
    for (const b of G.bones) if ((b.x - x) ** 2 + (b.y - y) ** 2 < rad * rad) b.hp -= dmg;   // V-230 — 폭발도 뼈 우리를 부순다
  }, (delay || 0) * 1000);
}

function forEachEnemy(fn) {
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) fn(m, pk);
}

function wakePacks() {
  const p = G.player;
  // 측정용 손잡이 — globalThis.__WAKE 가 숫자면 그 반경으로 깨운다(기본은 WAKE 상수).
  //   V-207 자가 3000 vs 500 을 나란히 재려고 켰다. 안 켜면 평소 플레이와 byte-동일.
  const R = typeof globalThis.__WAKE === "number" ? globalThis.__WAKE : WAKE;
  for (const pk of G.packs) {
    if (pk.awake) continue;
    if ((pk.x - p.x) ** 2 + (pk.y - p.y) ** 2 < R * R) {
      pk.awake = true;
      if (pk.boss) { const b = pk.enemies.find((m) => m.boss); if (b) G.bossBanner = { name: b.name, kind: b.bossKind, t: 0 }; }
    }
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
      unstick(m, m.r);   // 밀림(separation)·순간이동으로 벽 밖에 나가면 매 프레임 도로 끌어들인다
      if (m.stun > 0) { m.stun -= dt; m.hit = Math.max(0, m.hit - dt); continue; }
      if (m.boss) { stepBoss(m, p, dt, pk); continue; }
      if (m.ranged && globalThis.__RANGED_MOB) { stepRanged(m, p, dt); continue; }
      if (m.charger && globalThis.__CHARGER_MOB) { stepCharger(m, p, dt); continue; }
      let tx = p.x, ty = p.y, td = (p.x - m.x) ** 2 + (p.y - m.y) ** 2;
      for (const s of G.minions) {
        const d = (s.x - m.x) ** 2 + (s.y - m.y) ** 2;
        if (d < td) { td = d; tx = s.x; ty = s.y; }
      }
      const dist = Math.sqrt(td) || 1;
      m.dx = (tx - m.x) / dist; m.dy = (ty - m.y) / dist;
      m.atk -= dt; m.hit = Math.max(0, m.hit - dt);
      const reach = globalThis.__ENEMY_REACH ? m.r + 30 + REACH_ADD : m.r + 30;
      const dmg = globalThis.__ENEMY_REACH ? m.dmg * REACH_DMG_MUL : m.dmg;
      if (dist > reach) {
        stepTo(m, m.x + m.dx * m.spd * dt, m.y + m.dy * m.spd * dt, m.r);
        m.state = "walk"; m.anim += dt * 9;
      } else {
        m.state = "attack"; m.anim += dt * 9;
        if (m.atk <= 0) {
          m.atk = 0.9;
          if (tx === p.x && ty === p.y) hurtPlayer(dmg);
          else { const s = G.minions.find((s) => s.x === tx && s.y === ty); if (s) { s.hp -= dmg; if (s.hp <= 0) killMinion(s); } }
        }
      }
      if (m.kb.x || m.kb.y) { stepTo(m, m.x + m.kb.x * dt, m.y + m.kb.y * dt, m.r); m.kb.x *= 0.86; m.kb.y *= 0.86; if (Math.abs(m.kb.x) < 4) m.kb.x = 0; if (Math.abs(m.kb.y) < 4) m.kb.y = 0; }
    }
    if (live === 0 && !pk.done) { pk.done = true; G.cleared++; markRoomCleared(pk.room); }
  }
  separateEnemies();
}

// ★ V-203 팔② — 원거리 적. 타깃을 «사람»으로 못박고 사거리 밖이면 다가가고 너무 붙으면 뒤로 뺀다(카이팅).
//   재장전이 차면 사람에게 화살(G.foeShots)을 쏜다 — 그 화살은 소환수를 무시하고 날아 «소환수 벽»을 넘는다
//   (V-206 부터 지형 벽은 못 넘는다 — stepFoeShots 가 inFree 밖에서 죽인다).
function stepRanged(m, p, dt) {
  m.hit = Math.max(0, m.hit - dt);
  m.shootCd = (m.shootCd || 0) - dt;
  const dx = p.x - m.x, dy = p.y - m.y, dist = Math.hypot(dx, dy) || 1;
  m.dx = dx / dist; m.dy = dy / dist;
  if (dist > RANGED_RANGE) {
    stepTo(m, m.x + m.dx * m.spd * dt, m.y + m.dy * m.spd * dt, m.r);
    m.state = "walk"; m.anim += dt * 9;
  } else if (dist < RANGED_RANGE * 0.5) {
    stepTo(m, m.x - m.dx * m.spd * 0.6 * dt, m.y - m.dy * m.spd * 0.6 * dt, m.r);
    m.state = "walk"; m.anim += dt * 9;
  } else { m.state = "idle"; m.anim += dt * 6; }
  if (dist <= RANGED_RANGE && m.shootCd <= 0) {
    m.shootCd = RANGED_CD;
    const a = Math.atan2(dy, dx);
    G.foeShots.push({ x: m.x, y: m.y - m.h * 0.4, vx: Math.cos(a) * RANGED_SPD, vy: Math.sin(a) * RANGED_SPD, life: 2.4, dmg: m.dmg });
    METRIC.foeShot = (METRIC.foeShot || 0) + 1;
    m.state = "attack";
  }
  if (m.kb.x || m.kb.y) { stepTo(m, m.x + m.kb.x * dt, m.y + m.kb.y * dt, m.r); m.kb.x *= 0.86; m.kb.y *= 0.86; if (Math.abs(m.kb.x) < 4) m.kb.x = 0; if (Math.abs(m.kb.y) < 4) m.kb.y = 0; }
}

// ★ V-203 팔③ — 돌진 적. 타깃을 «사람»으로 못박아 소환수 사이를 지나 좁히다가, 재충전이 차고 사거리 안이면
//   짧게 «돌진»한다(속도 ×CHARGE_SPD_MUL). 벽을 뚫고 들어와 사람에 닿으면 문다(피해 ×CHARGE_BITE).
function stepCharger(m, p, dt) {
  m.hit = Math.max(0, m.hit - dt);
  m.chargeCd = (m.chargeCd || 0) - dt;
  const dx = p.x - m.x, dy = p.y - m.y, dist = Math.hypot(dx, dy) || 1;
  m.dx = dx / dist; m.dy = dy / dist;
  if (m.charging > 0) {
    m.charging -= dt;
    stepTo(m, m.x + m.dx * m.spd * CHARGE_SPD_MUL * dt, m.y + m.dy * m.spd * CHARGE_SPD_MUL * dt, m.r);
    m.state = "walk"; m.anim += dt * 14;
    if (dist < p.r + m.r + 8) { hurtPlayer(m.dmg * CHARGE_BITE); m.charging = 0; m.chargeCd = CHARGE_CD; }
    else if (m.charging <= 0) m.chargeCd = CHARGE_CD;
  } else if (m.chargeCd <= 0 && dist < CHARGE_RANGE) {
    m.charging = CHARGE_DUR; m.state = "attack";
  } else {
    stepTo(m, m.x + m.dx * m.spd * dt, m.y + m.dy * m.spd * dt, m.r);
    m.state = "walk"; m.anim += dt * 9;
  }
  if (m.kb.x || m.kb.y) { stepTo(m, m.x + m.kb.x * dt, m.y + m.kb.y * dt, m.r); m.kb.x *= 0.86; m.kb.y *= 0.86; if (Math.abs(m.kb.x) < 4) m.kb.x = 0; if (Math.abs(m.kb.y) < 4) m.kb.y = 0; }
}

// ★ V-203 팔② — 적 화살. 사람만 맞히고 소환수는 통과한다(소환수 벽을 넘는 팔이다). 손잡이가 꺼지면 배열이 비어 no-op.
//   ★ V-206 — 다만 «지형 벽»(방·복도 밖)은 못 넘는다 — inFree 밖이면 그 자리에서 죽고 튐을 남긴다(stepFoeShots).
// ── V-230 층 주인 넷 — 「예고 → 터짐」의 수법 ─────────────────────────────────
// 주인은 평소엔 가장 가까운 표적(사람·소환수)을 쫓아 때린다. skillCd 가 차면 startCast 로
// «시전»에 들어가고, 그동안 advanceCast 가 예고(붉은 자리·번쩍임)를 든 채 대기하다 터뜨린다.
// 예고는 drawBossTele 가 m.cast 를 읽어 그린다 — 두 자리에 상태를 안 둔다.
let addId = -1000;   // 소환된 해골(add)의 id — 본디 팩 id(양수)와 안 겹치게 음수로
function stepBoss(m, p, dt, pk) {
  m.hit = Math.max(0, m.hit - dt);
  if (m.skillCd == null) m.skillCd = BOSS_CD[m.bossKind] * 0.6;
  if (m.cast) { advanceCast(m, p, dt, pk); bossKb(m, dt); return; }
  m.skillCd -= dt;
  let tx = p.x, ty = p.y, td = (p.x - m.x) ** 2 + (p.y - m.y) ** 2, onP = true;
  for (const s of G.minions) { const d = (s.x - m.x) ** 2 + (s.y - m.y) ** 2; if (d < td) { td = d; tx = s.x; ty = s.y; onP = false; } }
  const dist = Math.sqrt(td) || 1;
  m.dx = (tx - m.x) / dist; m.dy = (ty - m.y) / dist;
  m.atk -= dt;
  const reach = m.r + 44;
  if (dist > reach) { stepTo(m, m.x + m.dx * m.spd * dt, m.y + m.dy * m.spd * dt, m.r); m.state = "walk"; m.anim += dt * 9; }
  else {
    m.state = "attack"; m.anim += dt * 9;
    if (m.atk <= 0) { m.atk = 0.9; if (onP) hurtPlayer(m.dmg); else { const s = G.minions.find((s) => s.x === tx && s.y === ty); if (s) { s.hp -= m.dmg; if (s.hp <= 0) killMinion(s); } } }
  }
  if (m.skillCd <= 0) startCast(m, p);
  bossKb(m, dt);
}
function bossKb(m, dt) {
  if (m.kb.x || m.kb.y) { stepTo(m, m.x + m.kb.x * dt, m.y + m.kb.y * dt, m.r); m.kb.x *= 0.86; m.kb.y *= 0.86; if (Math.abs(m.kb.x) < 4) m.kb.x = 0; if (Math.abs(m.kb.y) < 4) m.kb.y = 0; }
}
function startCast(m, p) {
  const k = m.bossKind;
  m.state = "attack";
  m.cast = { k, phase: "warn", t: BOSS_WARN[k], warn: BOSS_WARN[k], cx: p.x, cy: p.y, dir: Math.atan2(p.y - m.y, p.x - m.x) };
  cam.shake = Math.max(cam.shake, 6);
}
function advanceCast(m, p, dt, pk) {
  const c = m.cast; c.t -= dt; m.anim += dt * 6;
  if (c.phase === "warn") {
    if (m.bossKind === 1) { c.cx = p.x; c.cy = p.y; }   // 역병은 예고 내내 사람 발밑을 겨눈다
    if (c.t <= 0) fireCast(m, p, pk);
    return;
  }
  if (c.phase === "dash") {                              // 도살자 — 겨눈 방향으로 들이받는다
    stepTo(m, m.x + Math.cos(c.dir) * m.spd * 3.4 * dt, m.y + Math.sin(c.dir) * m.spd * 3.4 * dt, m.r);
    m.state = "walk";
    if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < (p.r + m.r + 12) ** 2) hurtPlayer(m.dmg * 1.4);
    if (c.t <= 0) { c.phase = "sweepWarn"; c.t = 0.42; c.cx = m.x; c.cy = m.y; c.r = m.r + 150; }
    return;
  }
  if (c.phase === "sweepWarn") {                         // 도살자 — 멈춘 자리에서 광역 후려치기
    if (c.t <= 0) {
      cam.shake = Math.max(cam.shake, 16);
      if ((p.x - c.cx) ** 2 + (p.y - c.cy) ** 2 < c.r * c.r) hurtPlayer(m.dmg * 1.2);
      for (let i = 0; i < 20; i++) burst(c.cx, c.cy, "#c0303a", 200);
      endCast(m);
    }
  }
}
function fireCast(m, p, pk) {
  const k = m.bossKind, c = m.cast;
  cam.shake = Math.max(cam.shake, 12);
  if (k === 0) {                                         // 뼈 왕 — 뼈 우리로 가두고 해골을 부른다
    for (let i = 0; i < CAGE_SEG; i++) {
      const a = i / CAGE_SEG * 6.2832, hp = 120 + G.floor * 20;
      G.bones.push({ x: c.cx + Math.cos(a) * CAGE_R, y: c.cy + Math.sin(a) * CAGE_R, r: 20, hp, maxhp: hp, life: CAGE_LIFE });
    }
    for (let i = 0; i < 3; i++) { const a = Math.random() * 6.2832; spawnAdd(pk, m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60); }
    for (let i = 0; i < 24; i++) burst(c.cx, c.cy, "#e8ecf0", 180);
    endCast(m);
  } else if (k === 1) {                                  // 역병 주술사 — 독 장판을 깐다
    G.hazards.push({ x: c.cx, y: c.cy, r: 120, warn: 0, life: POOL_LIFE, dmg: 10 + G.floor * 2 });
    for (let i = 0; i < 16; i++) burst(c.cx, c.cy, "#7ad04a", 120);
    endCast(m);
  } else if (k === 2) {                                  // 무덤 도살자 — 돌진에 들어간다
    c.phase = "dash"; c.t = 0.42; c.dir = Math.atan2(p.y - m.y, p.x - m.x);
    cam.shake = Math.max(cam.shake, 10);
  } else {                                               // 저주받은 사제 — 광역 저주 + 소환
    p.curse = CURSE_DUR;
    for (let i = 0; i < 3; i++) { const a = Math.random() * 6.2832; spawnAdd(pk, m.x + Math.cos(a) * 70, m.y + Math.sin(a) * 70); }
    floatNote("저주 — 내 피해가 반이 된다", "#c89bff", 1.4, { sz: 13 });
    for (let i = 0; i < 24; i++) burst(m.x, m.y - m.h * 0.4, "#b070ff", 180);
    endCast(m);
  }
}
function endCast(m) { m.cast = null; m.skillCd = BOSS_CD[m.bossKind]; m.atk = 0.6; }
function spawnAdd(pk, x, y) {
  const f = G.floor, hp = 60 + f * 12;
  pk.enemies.push({ id: addId--, base: "mob/skelarch", x, y, hp, maxhp: hp, dmg: 12 + f * 3, spd: 172,
    h: 82, r: 18, gold: [4, 9], dx: 0, dy: 1, elite: false, hit: 0, kb: { x: 0, y: 0 }, atk: 0,
    anim: (Math.random() * 6) | 0, alive: true, tb: 1, name: null, add: true });
  for (let i = 0; i < 8; i++) burst(x, y, "#cfe0ef", 120);
}

// 독 장판의 지속 피해 — 무적(iframe)을 지나지 않는다(장판은 «서 있으면» 계속 아파야 한다).
//   곱(FOE_DMG_MUL)·방어(dr)는 사람이 맞는 다른 피해와 같은 규격을 쓴다.
function dotPlayer(dmg) {
  const p = G.player;
  const eff = dmg * FOE_DMG_MUL * (1 - p.dr);
  METRIC.taken += eff; p.hp -= eff;
  if (p.hp <= 0 && !G.dead) die();
}
function stepHazards(dt) {
  if (!G.hazards.length) return;
  const p = G.player;
  for (const h of G.hazards) {
    if (h.warn > 0) { h.warn -= dt; continue; }
    h.life -= dt;
    if ((p.x - h.x) ** 2 + (p.y - h.y) ** 2 < h.r * h.r) {
      dotPlayer(h.dmg * dt); p.hurt = Math.max(p.hurt, 0.1);
      if (G.parts.length < 380 && Math.random() < 0.3) burst(p.x, p.y - 10, "#7ad04a", 60);
    }
  }
  G.hazards = G.hazards.filter((h) => h.warn > 0 || h.life > 0);
}
function stepBones(dt) {
  if (!G.bones.length) return;
  for (const b of G.bones) b.life -= dt;
  G.bones = G.bones.filter((b) => b.life > 0 && b.hp > 0);
}
// 뼈 우리는 사람만 막는다(가두는 함정) — 적·소환수는 지난다. 사람 이동만 walkableP 로 판정한다.
function bonesBlock(x, y, r) {
  for (const b of G.bones) { const rr = b.r + r, dx = x - b.x, dy = y - b.y; if (dx * dx + dy * dy < rr * rr) return true; }
  return false;
}
function walkableP(x, y, r) { return walkable(x, y, r) && !bonesBlock(x, y, r); }
function stepToP(e, nx, ny, r) {
  if (nx !== e.x && walkableP(nx, e.y, r)) e.x = nx;
  if (ny !== e.y && walkableP(e.x, ny, r)) e.y = ny;
}

function stepFoeShots(dt) {
  if (!G.foeShots.length) return;
  const p = G.player;
  for (const sh of G.foeShots) {
    sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
    if (sh.life <= 0) { sh.dead = true; continue; }
    if (globalThis.__PROJ_WALL !== false && !inFree(sh.x, sh.y, PROJ_R)) { sh.dead = true; projSpark(sh.x, sh.y, "#ff9a4a"); continue; }
    if ((sh.x - p.x) ** 2 + (sh.y - p.y) ** 2 < (p.r + 16) ** 2) { hurtPlayer(sh.dmg); sh.dead = true; METRIC.foeHit = (METRIC.foeHit || 0) + 1; }
  }
  G.foeShots = G.foeShots.filter((s) => !s.dead);
}

// ★ V-183 — 적끼리 밀어낸다. 소환수엔 이미 있었지만(separateMinions) 적엔 없어, 밀도를
//   올리면 스무 마리가 한 자리에 포개져 「수십 마리」가 아니라 한 마리로 보인다. 깨어 있는
//   산 적을 한 번 모아 반지름 합보다 가까운 쌍만 반씩 밀어낸다(minion 판과 같은 싼 셈).
function separateEnemies() {
  const arr = [];
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) arr.push(m);
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    const s = arr[i];
    for (let j = i + 1; j < n; j++) {
      const t = arr[j], min = s.r + t.r;
      const dx = t.x - s.x, dy = t.y - s.y, d2 = dx * dx + dy * dy;
      if (d2 === 0) { t.x += 0.5; continue; }
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2), push = (min - d) * 0.5 / d;
      s.x -= dx * push; s.y -= dy * push; t.x += dx * push; t.y += dy * push;
    }
  }
}

function markRoomCleared(ri) {
  const any = G.packs.some((pk) => pk.room === ri && !pk.done);
  if (!any && G.rooms[ri]) G.rooms[ri].cleared = true;
}

// ── 소환수 대형 (V-154 A) ───────────────────────────────────────────────────
// 옛 로직은 적이 없으면 소환수를 «플레이어 90px 안»으로만 몰아, 21마리가 발밑에
// 겹쳐 «군세»가 아니라 «얼룩»으로 보였다(run_end 컷). 이제 각자 «제자리»가 있다 —
// 플레이어 뒤·둘레의 여러 겹 줄. 뒤부터 채워 플레이어가 선두에 서고, 수가 늘면
// 반경이 커져 무리가 퍼진다. 세로는 눌러(0.64) 위에서 내려다본 결을 맞춘다. 마지막에
// 서로 밀어내(separation) 완전히 포개지지 않게 한다.
let formAng = Math.PI / 2;
function angTo(target, cur) { let d = (target - cur) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }
function minionRingRadius(r) { return 34 + r * 40; }
function minionRingCap(r) { return Math.max(3, Math.floor(2 * Math.PI * minionRingRadius(r) / 40)); }
function formSpot(p, i, backAng) {
  let r = 1, base = 0, cap = minionRingCap(1);
  while (i >= base + cap) { base += cap; r++; cap = minionRingCap(r); }
  const k = i - base;
  const rad = minionRingRadius(r);
  const ang = backAng + ((k + (r % 2) * 0.5) / cap) * Math.PI * 2;
  return { x: p.x + Math.cos(ang) * rad, y: p.y + Math.sin(ang) * rad * 0.64 };
}
function separateMinions() {
  const a = G.minions, n = a.length, MIN = 34;
  for (let i = 0; i < n; i++) {
    const s = a[i];
    for (let j = i + 1; j < n; j++) {
      const t = a[j];
      const dx = t.x - s.x, dy = t.y - s.y, d2 = dx * dx + dy * dy;
      if (d2 === 0) { t.x += 0.5; continue; }
      if (d2 >= MIN * MIN) continue;
      const d = Math.sqrt(d2), push = (MIN - d) * 0.5 / d;
      s.x -= dx * push; s.y -= dy * push; t.x += dx * push; t.y += dy * push;
    }
  }
}
function stepMinions(dt) {
  const p = G.player;
  if (p.state === "walk" && (p.dx || p.dy)) formAng += angTo(Math.atan2(p.dy, p.dx), formAng) * Math.min(1, dt * 6);
  const backAng = formAng + Math.PI;
  const N = G.minions.length;
  for (let i = 0; i < N; i++) {
    const s = G.minions[i];
    unstick(s, s.r);
    let target = null, bd = 520 * 520;
    forEachEnemy((m) => { const d = (m.x - s.x) ** 2 + (m.y - s.y) ** 2; if (d < bd) { bd = d; target = m; } });
    s.atk = Math.max(0, s.atk - dt);
    if (target) {
      const d = Math.sqrt(bd) || 1;
      s.dx = (target.x - s.x) / d; s.dy = (target.y - s.y) / d;
      if (d > s.r + target.r + 6) { stepTo(s, s.x + s.dx * s.spd * dt, s.y + s.dy * s.spd * dt, s.r); s.state = "walk"; s.anim += dt * 10; }
      else {
        s.state = "attack"; s.anim += dt * 10;
        if (s.atk <= 0) {
          s.atk = s.atkCd || 0.6;
          if (s.cleave) forEachEnemy((m) => { if ((m.x - s.x) ** 2 + (m.y - s.y) ** 2 < s.cleave * s.cleave) hurtEnemy(m, s.dmg, m.x - s.x, m.y - s.y, "minion"); });
          else hurtEnemy(target, s.dmg, s.dx, s.dy, "minion");
          if (s.shake) cam.shake = Math.max(cam.shake, s.shake);
        }
      }
    } else {
      const spot = formSpot(p, i, backAng);
      const dx = spot.x - s.x, dy = spot.y - s.y, dd = Math.hypot(dx, dy);
      if (dd > 12) { s.dx = dx / dd; s.dy = dy / dd; const step = Math.min(dd, s.spd * dt); stepTo(s, s.x + s.dx * step, s.y + s.dy * step, s.r); s.state = "walk"; s.anim += dt * 10; }
      else { s.state = "idle"; s.anim += dt * 5; }
    }
  }
  separateMinions();
}

function killMinion(s) { const i = G.minions.indexOf(s); if (i >= 0) G.minions.splice(i, 1); }

// ★ V-206 ㉡ — 발사체가 벽에 맞아 죽을 때 남기는 작은 튐. 그냥 사라지면 「먹혔다」로 보인다.
//   새 배열 없이 기존 파티클(burst→G.parts)만 재활용한다. 색은 부르는 쪽이 준다(창=파랑·화살=주황).
function projSpark(x, y, col) { for (let i = 0; i < 4; i++) burst(x, y, col, 70); }

function stepSpears(dt) {
  for (const sp of G.spears) {
    sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.life -= dt;
    if (sp.life <= 0) { sp.dead = true; continue; }
    if (globalThis.__PROJ_WALL !== false && !inFree(sp.x, sp.y, PROJ_R)) { sp.dead = true; projSpark(sp.x, sp.y, "#cfe0ef"); continue; }
    forEachEnemy((m) => {
      if (sp.dead) return;
      if ((m.x - sp.x) ** 2 + (m.y - (sp.y)) ** 2 < (m.r + 10) ** 2) {
        hurtEnemy(m, sp.dmg, sp.vx, sp.vy, "spear");
        sp.dead = true;
      }
    });
    if (!sp.dead) for (const b of G.bones) {   // V-230 — 뼈 창이 뼈 우리를 부순다(갇힌 데서 나가게)
      if ((b.x - sp.x) ** 2 + (b.y - sp.y) ** 2 < (b.r + 9) ** 2) { b.hp -= sp.dmg; sp.dead = true; for (let i = 0; i < 5; i++) burst(b.x, b.y, "#e8ecf0", 120); break; }
    }
  }
  G.spears = G.spears.filter((s) => !s.dead);
}

function hurtEnemy(m, dmg, dx, dy, src) {
  if (src) METRIC[src] += Math.min(dmg, Math.max(0, m.hp));
  m.hp -= dmg; m.hit = 0.18; m.stun = 0.05;
  const l = Math.hypot(dx, dy) || 1;
  m.kb.x += (dx / l) * 240; m.kb.y += (dy / l) * 240;
  floatDmg(m, Math.round(dmg), m.elite ? "#ffd060" : "#ffffff");
  for (let i = 0; i < 4; i++) burst(m.x, m.y - m.h * 0.4, "#c0303a", 90);
  // ㉡ V-199 — 뼈창 명중에 임팩트 스프라이트(fx/spearhit.png)를 짧게 띄운다(drawWorld). 미로드면 위 붉은 파티클로 폴백.
  //   자(hs_v199_read)가 명중 이벤트 대비 임팩트 «그려진 비율»을 읽도록 두 counter 를 노출한다.
  if (src === "spear") {
    window.__spearHitN = (window.__spearHitN || 0) + 1;
    if (tex("fx/spearhit.png")?.width && G.hits.length < HIT_CAP) {
      G.hits.push({ x: m.x, y: m.y - m.h * 0.4, t: 0, life: 0.2, h: m.h });
      window.__hitDrawnN = (window.__hitDrawnN || 0) + 1;
    }
  }
  if (m.hp <= 0) killEnemy(m);
}

// ── V-190 — 레벨 문턱 «단일 출처». 누적 XP 곡선을 초선형으로.
//   레벨 k→k+1 비용 = 500×k ⇒ Lv n 도달 누적 = 250·n·(n-1).
//   Lv2=500(옛 선형과 «동일» — 초반 안 답답) · Lv10=22500(옛 4500 의 5배) · Lv20=95000(옛 9500 의 10배).
//   옛 문턱 `level*500` 은 누적 (n-1)·500 로 레벨당 500 «고정»이라 평생 안 느려졌다.
//   ★ 레벨업 판정·xp 바·HUD 가 «전부» 이 한 문을 읽는다 — 규칙을 새 자리에 안 옮기면 또 어긋난다(작업지시 ③).
function xpForLevel(n) { return 250 * n * (n - 1); }

function killEnemy(m) {
  m.alive = false;
  G.kills++; METRIC.kills++;
  // V-190 ㉡ — 처치 XP 에 «층 깊이» 보람. B1 은 +0(초반 곡선을 그대로 두려), 상한 10층까지만 완만히 증가.
  const depth = Math.min(G.floor - 1, 10);
  G.xp += (m.elite ? 40 : 10) + depth * (m.elite ? 8 : 2);
  // V-190 ㉢ — `while`. 레벨 비용이 어떤 한 방 XP(최대 elite×깊은층 ≈ 120)보다 늘 커서 실제론 한 번만
  //   도는데, 곡선을 바꿔도 안전하게 여러 레벨을 판정하려 if→while 로 둔다.
  while (G.xp >= xpForLevel(G.player.level + 1)) {
    G.player.level++; G.player.attrPts++; G.player.sklPts++;
    floatNote(`레벨 ${G.player.level} — C 창 · 스탯/스킬 점수 +1`, "#e8cf52", 0.9, { sz: 12 });
  }
  // ★ V-183 — 처치 연쇄. 350ms 안에 잇달아 죽을수록 흔들림이 커지고, 다섯 이상이면
  //   흰 번쩍임이 얹힌다(몰살감). 상한 있음(chain ≤ 14 · flash ≤ 0.32) — 파티클은 burst
  //   가 400개, 떠오르는 숫자는 floatDmg 가 60개로 이미 막혀 있어 연출이 프레임을 못 먹는다.
  const now = nowMs();
  killStreak = now - lastKillT < 350 ? killStreak + 1 : 1;
  lastKillT = now;
  const chain = Math.min(killStreak, 14);
  cam.shake = Math.max(cam.shake, (m.elite ? 10 : 5) + chain * 1.1);
  if (killStreak >= 5) { flash = Math.max(flash, Math.min(0.32, 0.04 + chain * 0.02)); flashColor = "232,224,205"; }
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
  if (m.boss) {   // V-230 — 층 주인은 «그 주인의» 유니크를 확정으로 하나 떨군다(「넘은 표」)
    const it = bossUnique(m.bossKind, G.floor);
    const a = Math.random() * 6.283, s = 40 + Math.random() * 60;
    G.items.push({ x: m.x, y: m.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, item: it, t: 0 });
  }
  const goldMul = (G.player.uniques.has("goldRush") ? 2 : 1) * G.player.goldMul;
  const gn = Math.round((m.gold[0] + ((Math.random() * (m.gold[1] - m.gold[0] + 1)) | 0)) * goldMul);
  const grains = Math.min(3, Math.max(1, Math.round(gn / 30)));
  METRIC.grains += grains;   // V-192 계측 — 처치당 알갱이(㉢). 연출 아닌 순수 계수(V-189 METRIC 결).
  METRIC.goldGen = (METRIC.goldGen || 0) + gn;   // V-217 계측 — 뿌린 금 총액(회귀: 전후 동일해야).
  for (let i = 0; i < grains; i++) {
    const a = Math.random() * 6.283, s = 40 + Math.random() * 90;
    G.golds.push({ x: m.x, y: m.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, val: Math.max(1, Math.round(gn / grains)), t: 0 });
  }
  while (G.golds.length > GOLD_CAP) { const extra = G.golds.pop(); G.golds[0].val += extra.val; }
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
    if (d < 420) { g.x += (p.x - g.x) * Math.min(1, dt * 16); g.y += (p.y - g.y) * Math.min(1, dt * 16); }
    if (d < 30 || g.t > 1.5) { g.got = true; G.gold += g.val; METRIC.goldGot = (METRIC.goldGot || 0) + g.val; (window.__goldDwell || (window.__goldDwell = [])).push(g.t); }
  }
  G.golds = G.golds.filter((g) => !g.got);
  for (const it of G.items) {
    it.t += dt; it.x += it.vx * dt; it.y += it.vy * dt; it.vx *= 0.8; it.vy *= 0.8;
    // 금과 같은 «자석» — 밟아서 닿기엔 30px 가 좁아 한 판에 하나도 못 줍던 것(V-147)
    const d = Math.hypot(p.x - it.x, p.y - it.y);
    if (it.t > 0.35 && d < 110) { it.x += (p.x - it.x) * Math.min(1, dt * 9); it.y += (p.y - it.y) * Math.min(1, dt * 9); }
    if (d < 46 && (!it.drop || it.t > 0.6)) pickItem(it);
  }
  G.items = G.items.filter((it) => !it.got);
}

// ★ V-181 — 착용에서 스탯으로 가는 한 문. equipped 일곱 슬롯을 sumAffixes 로 합쳐
//   파생 배수를 다시 편다. 빌드 옵션(p.mult)·유니크·레벨 강화가 바뀔 때도 이 문을 지난다.
function recalc() {
  const p = G.player;
  const eq = Object.values(p.equipped).filter(Boolean);
  // 유니크 규칙(뼈창 갈라짐·시체폭발 두 번·해골 자리·금 두 배)도 이 문을 지난다 —
  // 착용 중인 것만 켜지고 벗으면 꺼진다(V-181 은 집는 순간 켜 다시 못 껐다 → 누수).
  p.uniques = new Set();
  for (const it of eq) if (it.unique) p.uniques.add(it.unique.key);
  const g = sumAffixes(eq);
  p.gear = g;
  // V-186 — 스탯·스킬도 이 문을 지난다(표는 ATTRS / SKILL_TREES 정의부에).
  const a = p.attr, s = p.skill;
  const curse = 1 + s.curse * 0.04;
  p.dmgMul = p.mult.dmg * (1 + g.dmg / 100) * (1 + a.str * ATTR.str.per / 100) * curse;
  p.spearMul = 1 + s.spear * 0.14;
  p.novaDmgMul = 1 + s.nova * 0.18;
  p.minionMul = p.mult.minionDmg * (1 + g.minionDmg / 100) * (1 + a.int * ATTR.int.per / 100) * (1 + s.mdmg * 0.14) * curse;
  p.minionHpMul = 1 + s.mhp * 0.10;
  p.slots = BASE_SLOTS + s.slot + p.buildSlots;
  p.maxGrade = s.grade;
  if (p.grade > p.maxGrade) p.grade = p.maxGrade;
  p.spd = BASE_SPD * (1 + g.moveSpeed / 100);
  p.atkCd = SPEAR_CD / (1 + g.atkSpeed / 100) / (1 + a.dex * ATTR.dex.per / 100);
  p.goldMul = 1 + g.gold / 100;
  p.novaMul = 1 + g.novaRadius / 100;
  p.dr = Math.min(ATTR.def.cap / 100, a.def * ATTR.def.per / 100);
  p.maxhp = Math.round((BASE_HP + g.maxHp + a.vit * ATTR.vit.per) * p.mult.body);
  p.maxmana = Math.round((BASE_MANA + a.sta * ATTR.sta.per) * p.mult.body);
  if (p.hp > p.maxhp) p.hp = p.maxhp;
  if (p.mana > p.maxmana) p.mana = p.maxmana;
}

function pickItem(it) {
  const p = G.player;

  // 빌드 옵션(초록/주황)은 지금 판 그대로 «집는 순간» 켜진다(가방 물건이 아니다).
  if (it.item.build) {
    it.got = true;
    G.picks++;
    G.pickLog.unshift({ name: it.item.name, color: it.item.rarity.color, t: 3 });
    if (G.pickLog.length > 6) G.pickLog.pop();
    if (it.item.build.kind === "slot") p.buildSlots = Math.min(BUILD_SLOTS_CAP, p.buildSlots + (it.item.build.n || 1));
    else p.mult.minionDmg = Math.min(MINION_MUL_CAP, p.mult.minionDmg * (it.item.build.mul || 1.3));
    recalc();
    flash = Math.max(flash, 0.18); flashColor = it.item.build.kind === "slot" ? "127,230,160" : "232,162,74";
    // 빌드 알림은 화면 번쩍임 + 좌측 pickLog(초록/주황 그대로)로 이미 크게 알린다 —
    // 몰살판에서 바닥에 겹쳐 뜨던 넓은 글은 걷는다(V-185, 정보 손실 없음).
    return;
  }

  // 장비는 «가방»에 들어간다. 격자에 자리가 없으면 못 줍고 바닥에 남는다.
  const gear = it.item;
  if (!bagFits(p.bag, gear)) {
    // 가방 꽉참은 «사건»이 아니라 «상태»다 — 1.5초 재우침으로는 파밍 내내 계속 외친다(자로
    // 세니 40초에 16번, 최신 3줄을 혼자 차지했다). 가방이 실제로 바뀐 뒤에만 다시 알리고,
    // 글은 좌측 pickLog 에도 남겨 한복판을 비워도 정보를 잃지 않게 한다.
    if (G.bagFullAt !== p.bag.length) {
      G.bagFullAt = p.bag.length;
      floatNote("가방이 가득 찼다", "#e0663c", 1.2);
      G.pickLog.unshift({ name: "가방이 가득 찼다", color: "#e0663c", t: 3 });
      if (G.pickLog.length > 6) G.pickLog.pop();
    }
    return;
  }
  G.bagFullAt = -1;   // 하나라도 들어갔다 = 자리가 생겼다, 다음 꽉참은 다시 알린다
  it.got = true;
  G.picks++;
  G.pickLog.unshift({ name: gear.name, color: gear.rarity.color, t: 3 });
  if (G.pickLog.length > 6) G.pickLog.pop();
  const wasEmpty = p.bag.length === 0;
  p.bag.push(gear);
  p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.04);
  // 첫 물건(가방이 비어 있었다)만 편의로 자동 착용 — 그 뒤론 사람이 창에서 고른다.
  if (wasEmpty && !p.equipped[gear.slot]) equipFromBag(gear);
  else if (invOpen) renderInv();
  if (gear.unique) {
    // 유니크만 바닥에 크게 띄운다(금빛·읽을 시간 2.2s) — 실패 조건: 유니크 줍기는 반드시 보여야.
    // 그 아래 등급(흰·파랑·노랑)은 이름을 좌측 pickLog(레어도 색·V-184) + 줍기 전 바닥
    // 이름표(V-184)에 남기고 바닥 위 뜨는 글은 걷는다 — 몰살판에서 사람 위를 덮던 주범(V-185).
    flash = 0.5; flashColor = "216,147,74";
    G.floats.push({ x: it.x, y: it.y - 60, t: 2.2, txt: gear.name, big: true, col: "#d8934a" });
    G.floats.push({ x: it.x, y: it.y - 34, t: 2.2, txt: gear.unique.note, big: false, col: "#d8934a" });
  }
}

function hurtPlayer(dmg) {
  const p = G.player;
  // ★ V-221 — 맞은 뒤 짧은 무적(iframe)으로 「연쇄」를 끊는다. 자로 잰 죽음(hs_v221_forensic)은 단발도 한프레임
  //   몰림도 아닌 ~7 대 × ~7%maxhp 가 ~0.42s 간격으로 쌓인 것이라, 촘촘한 절반(≤0.4s)을 흘리면 하강이 가운데
  //   띠에서 멎는다. __V221=false 면 창 0 = 옛 동작(byte-동일) · __V221_IFR 로 창(초)을 잰다(기본 0.4).
  const ifr = globalThis.__V221 === false ? 0 : (globalThis.__V221_IFR ?? 0.4);
  if (ifr > 0 && p.iframe > 0) return;
  dmg *= FOE_DMG_MUL;   // ★ V-203b — 사람에게 닿는 피해만 hp 규격으로 키운다(근접·화살·돌진 세 경로가 다 여기로 온다).
  const eff = dmg * (1 - p.dr);
  METRIC.hitN = (METRIC.hitN || 0) + 1;
  METRIC.taken += eff;
  p.hp -= eff; p.hurt = 0.18; cam.shake = Math.max(cam.shake, 8);
  flash = Math.max(flash, 0.14); flashColor = "180,40,40";
  if (ifr > 0) p.iframe = ifr;
  // ★ V-221 관찰 전용 — __DEATH_FORENSIC 면 「죽기 직전 몇 대·얼마씩 맞았나」를 링버퍼에 남긴다.
  //   die() 가 죽는 순간 마지막 3초를 __deathForensic 에 스냅샷한다. 기본 미설정 → 옛 그대로(byte-동일).
  if (globalThis.__DEATH_FORENSIC) {
    const ring = window.__hitRing || (window.__hitRing = []);
    ring.push({ t: gameTime, eff, hpAfter: p.hp, maxhp: p.maxhp, floor: G.floor });
    const cut = gameTime - 3.2; while (ring.length && ring[0].t < cut) ring.shift();
  }
  if (p.hp <= 0 && !G.dead) die();
}

function die() {
  METRIC.deaths++;
  // ★ V-221 관찰 전용 — 죽는 순간 마지막 3초의 타격열을 __deathForensic 에 스냅샷한다(단발·연쇄·hp곡선을 수로 가르려고).
  if (globalThis.__DEATH_FORENSIC) {
    const ring = window.__hitRing || [], t = gameTime;
    const hits = ring.filter((h) => h.t >= t - 3).map((h) => ({
      dt: Math.round((t - h.t) * 1000) / 1000, eff: Math.round(h.eff),
      fracMax: Math.round(1000 * h.eff / h.maxhp) / 1000,
      hpAfterPct: Math.round(100 * h.hpAfter / h.maxhp) }));
    (window.__deathForensic || (window.__deathForensic = [])).push({
      floor: G.floor, maxhp: Math.round(G.player.maxhp), hits });
    if (window.__hitRing) window.__hitRing.length = 0;
  }
  // ★ V-220 관찰 전용 — __MEASURE_REVIVE 면 리셋 없이 제자리 만생명(층 1→5 를 죽어도 이어 걷게).
  //   죽음은 METRIC.deaths·__floorLog.died 로 센다. 기본 미설정 → 옛 그대로 판을 끝낸다(byte-동일).
  if (globalThis.__MEASURE_REVIVE) { G.player.hp = G.player.maxhp; return; }
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
function stepFx(dt) {
  for (const b of G.booms) b.t += dt;
  G.booms = G.booms.filter((b) => b.t < b.life);
  for (const h of G.hits) h.t += dt;
  G.hits = G.hits.filter((h) => h.t < h.life);
}
// ★ V-185 — 떠오르는 글이 화면 한복판을 덮던 것을 판다. 고치기 전엔 피해 숫자 상한이
//   60 이고, 같은 적을 때릴 때마다 새 숫자가 사람 위에 통째로 쌓였다(컷에서 「6603」이
//   열두 개 겹쳐 사람을 묻었다). 세 가지로 막는다:
//   ① 상한을 14 로 확 내리고, 넘치면 큰 값이 제일 작은 값을 «밀어낸다»(작은 수가 큰 한 방을 못 가린다).
//   ② 같은 적에 연달아 든 피해는 그 적의 «살아있는 숫자»에 누적한다 — 개수를 가장 크게 줄인다.
//   ③ 숫자를 적 위에서 띄우되 사람 바깥쪽으로 밀어 흩는다(지금껏 ±10px 만 흔들어 한복판에 겹쳤다).
//   글자 크기는 그대로 16px(굵게 키우면 되레 더 덮는다). 큰 한 방은 «수명»을 늘려 읽게 한다.
const DMG_CAP = 14;
/* 같은 알림이 잇달아 뜨면 «줄을 늘리지 않고» 이미 뜬 것의 시간만 되살린다.
 * 왜: 자로 세니 40초에 뜬 알림 72개 중 56개가 «가방이 가득 찼다»(24)·«자리가 부족하다»(32)
 * 뿐이었다 — 실패는 사람이 같은 짓을 반복하는 동안 매번 뜨므로, 최신 3줄(stepFloats ④)이
 * 늘 이 둘로 차서 한복판을 덮는다. 같은 글은 한 줄로 묶어야 «새 소식»이 자리를 얻는다.
 * 되살릴 때 자리도 지금 사람 머리 위로 옮긴다 — 걸어간 뒤 옛 자리에 남으면 딴 데서 뜬다. */
function floatNote(txt, col, t, extra) {
  const p = G.player;
  let live = 0;
  for (const f of G.floats) {
    if (f.dmg || f.big || !f.txt) continue;
    // 같은 글이면 줄을 늘리지 않고 시간만 되살린다. ★ 자리는 옮기지 않는다 — 옮기면
    // 그 사이 뜬 «다른» 알림과 같은 화소에 겹쳐 글자가 서로를 뭉갠다(컷에서 「거대 해골
    // 해금」과 「뼈 거인 해금」이 한 덩어리로 읽혔다). 1.2초 사는 글이라 밀리는 거리는 작다.
    if (f.txt === txt) { f.t = Math.max(f.t, t); f.col = col; return f; }
    live++;
  }
  // 새 알림은 살아 있는 알림 «위로» 한 줄씩 쌓는다 — 한자리에 찍으면 겹쳐서 못 읽는다.
  const f = Object.assign({ x: p.x, y: p.y - 100 - live * 22, t, txt, col }, extra || {});
  G.floats.push(f);
  return f;
}
/* 큰 피해는 «줄여» 쓴다 — 253318 처럼 여섯 자리가 되면 글자 사각이 두 배로 넓어져
 * 열넷이 뜨는 몰살판에서 사람·적을 덮는다(자로 재니 p95 덮음률의 대부분이 이 숫자였다).
 * 자릿수가 아니라 «규모»를 읽는 게 핵앤슬래시의 쓸모라 K/M 이 정보를 잃지 않는다. */
function dmgTxt(n) {
  if (n < 10000) return "" + n;
  if (n < 1e6) return (n / 1000).toFixed(n < 1e5 ? 1 : 0) + "K";
  return (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + "M";
}
// 피해 배수처럼 커지는 스탯은 «날것 소수»(×2403409.25)를 그대로 찍지 않는다 — 1000 이상이면
// 피해 숫자와 «같은» 축약(dmgTxt: 정수·K·M)을 지나 소수점을 없앤다. 작은 배수만 ×2.40 로 남긴다.
function mulTxt(x) { return "×" + (x >= 1000 ? dmgTxt(Math.round(x)) : x.toFixed(2)); }
function floatDmg(m, n, col) {
  n = Math.round(n);
  // ② 이 적의 숫자가 아직 살아있으면(t>0) 새로 만들지 말고 누적한다.
  const f0 = m._dmgFloat;
  if (f0 && f0.t > 0) {
    f0.acc += n; f0.txt = dmgTxt(Math.round(f0.acc)); f0.col = col;
    f0.t = Math.min(1.2, Math.max(f0.t, 0.6 + Math.log10(Math.max(1, f0.acc)) * 0.12));
    return;
  }
  // ① 상한을 넘으면 제일 작은 숫자를 밀어내고 큰 값을 넣는다(새 값이 제일 작으면 안 띄운다).
  let cnt = 0, sm = null, smi = -1;
  for (let i = 0; i < G.floats.length; i++) { const f = G.floats[i];
    if (!f.dmg) continue; cnt++; if (!sm || f.acc < sm.acc) { sm = f; smi = i; } }
  if (cnt >= DMG_CAP) {
    if (!sm || n <= sm.acc) return;
    sm.t = 0; G.floats.splice(smi, 1);          // 밀려난 것의 주인은 다음 타에 새로 뜬다
  }
  // ③ 적 위 · 사람 바깥쪽으로 흩는다.
  const p = G.player, ox = m.x - p.x, oy = m.y - p.y, ol = Math.hypot(ox, oy) || 1;
  const f = { dmg: true, acc: n, col, txt: dmgTxt(n),
    x: m.x + (ox / ol) * 20 + (Math.random() * 2 - 1) * 14,
    y: m.y - m.h * 0.7 + (oy / ol) * 8 - Math.random() * 6,
    t: Math.min(1.1, 0.6 + Math.log10(Math.max(1, n)) * 0.12) };  // 큰 한 방일수록 오래 남는다
  m._dmgFloat = f;
  G.floats.push(f);
}
function stepFloats(dt) {
  for (const f of G.floats) { f.t -= dt; f.y -= (f.big ? 14 : 34) * dt; if (f.ring !== undefined) f.ring += 300 * dt; }
  // ④ 알림 글(피해 숫자·링·유니크 이름 아님)은 최신 3줄만 — 뒤에서부터 세 오래된 것을 버린다.
  //   유니크 이름표(big)는 늘 읽히게 남긴다(줍기가 반드시 보여야 하는 실패 조건).
  let notes = 0;
  for (let i = G.floats.length - 1; i >= 0; i--) { const f = G.floats[i];
    if (f.txt && !f.dmg && !f.big) { notes++; if (notes > 3) G.floats.splice(i, 1); } }
  G.floats = G.floats.filter((f) => f.t > 0);
}

let floorPat = null;              // (남겨 둠 — 옛 이름 참조 방지) V-204: 층별 바닥/벽은 아래 캐시로.
let curFPat = null;               // 이번 프레임의 바닥 무늬(G.floor 로 고른다)
const FLOOR_PATS = new Map();     // 바닥 타일 이름 → CanvasPattern (한 번 굽고 재활용)
let wallPatN = null, wallPatS = null, wallPatL = null;  // 벽: 북(정면)·남(윗면)·옆(세로)
let bedrockPat = null;            // V-212 — 방·복도 밖의 «암반». 빈 검정 대신 화면 전체에 깐다.
let itemLabels = [];   // V-181: 바닥 이름표의 «화면» 사각들 — 툴팁 마우스 판정이 쓴다
function onScreen(x, y, pad) { return !(x - cam.x < -pad || x - cam.x > VW / Z + pad || y - cam.y < -pad || y - cam.y > VH / Z + pad); }

function drawWorld() {
  PROF.mark = performance.now();
  ctx.fillStyle = "#050307";
  ctx.fillRect(0, 0, VW, VH);
  const shx = cam.shake ? (Math.random() * 2 - 1) * cam.shake : 0;
  const shy = cam.shake ? (Math.random() * 2 - 1) * cam.shake : 0;
  ctx.save();
  ctx.setTransform(Z, 0, 0, Z, (-cam.x + shx) * Z, (-cam.y + shy) * Z);

  curFPat = floorPatFor(G.floor);          // V-204 ㉡ — 층마다 바닥이 갈린다
  if (!wallPatN) buildWallPats();           // V-204 ㉠ — 벽을 wall.png 로 (한 번만 굽는다)
  if (bedrockPat) { ctx.fillStyle = bedrockPat; ctx.fillRect(cam.x - 64, cam.y - 64, VW / Z + 128, VH / Z + 128); }

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
  for (const r of rvis) { northWall(r, WT, WTOP); sideWalls(r, WT, WTOP); }  // 네 면 다 벽 — 복도가 이 다음에 뚫는다
  for (const c of cvis) floorFill(c.x, c.y, c.w, c.h, "rgba(52,38,26,0.5)");   // 복도 바닥이 벽·북벽을 뚫어 문을 낸다
  // 방 바닥이 복도를 덮어 복도는 방 사이에만 남는다. ★ V-165 — 물들이기는 **얼룩 뒤로**
  // 미룬다(위 floorBase/floorTint 주석). 얼룩은 방 안에만 뿌려지므로(map.js `scatter`)
  // 방 바닥칠과 물들이기 사이가 정확히 그 자리다. 안 밝힌 방이 어두워질 때 얼룩도 같이
  // 잠기는 것 또한 이 순서라야 맞다 — 전에는 어둠 위에 얼룩만 훤히 떠 있었다.
  for (const r of rvis) floorBase(r.x, r.y, r.w, r.h);
  drawDecals();
  for (const r of rvis) {
    const tint = !r.visited ? "rgba(18,15,24,0.26)" : r.cleared ? "rgba(40,70,52,0.28)" : "rgba(94,66,42,0.26)";
    floorTint(r.x, r.y, r.w, r.h, tint);
    insetShadow(r);
    doorArches(r, WT);
  }
  drawHazards();   // V-230 — 독 장판·예고는 바닥 위, 배우 밑
  drawBossTele();
  PROF.seg("terrain");

  drawProps();
  PROF.seg("props");
  for (const c of G.corpses) {
    if (!onScreen(c.x, c.y, 120)) continue;
    ctx.globalAlpha = 0.5; ctx.fillStyle = "#3a0d0d";
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.h * 0.28, c.h * 0.14, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    drawSprite8(ctx, c.base, c.dir, "idle", 0, c.x, c.y + 4, c.h * 0.7, "grayscale(0.6) brightness(0.5)");
  }
  PROF.seg("corpses");

  drawLight();
  PROF.seg("light");

  const goldRects = [];
  const goldIm = tex("fx/gold.png");
  const goldDrawn = goldIm && goldIm.width;
  const gw = GOLD_W, gh = goldDrawn ? GOLD_W * (goldIm.height / goldIm.width) : GOLD_W;
  if (goldDrawn) ctx.imageSmoothingEnabled = false;
  for (const g of G.golds) {
    if (goldDrawn) ctx.drawImage(goldIm, g.x - gw / 2, g.y - gh / 2, gw, gh);
    else { ctx.beginPath(); ctx.arc(g.x, g.y, 3, 0, 6.283); ctx.fillStyle = "#e8c84a"; ctx.fill(); }
    const hx = (goldDrawn ? gw / 2 : 3) * Z, hy = (goldDrawn ? gh / 2 : 3) * Z;
    goldRects.push({ x0: (g.x - cam.x) * Z - hx, y0: (g.y - cam.y) * Z - hy, x1: (g.x - cam.x) * Z + hx, y1: (g.y - cam.y) * Z + hy });
  }
  window.__goldRects = goldRects;
  drawStairs();
  for (const ch of G.chests) drawChest(ch);
  drawBones();   // V-230 — 뼈 우리는 배우와 같은 층에 서지만 y정렬 밖(짧게 뜨는 함정)

  // ★ V-183 — 화면 밖 배우는 그리지 않는다. 밀도를 올리면 지도 곳곳의 깬 적을 다 그려
  //   프레임이 샌다 — 그림자·체력바까지 화면 밖에서 헛돈다. 그리는 목록에 넣기 전에 자른다.
  const drawList = [];
  barRects = [];
  silRects = [];
  ringRects = [];
  eliteLabels = [];
  for (const s of G.minions) if (onScreen(s.x, s.y, 80)) drawList.push({ y: s.y, fn: () => drawActor(s, SKEL_BASE), near: nearPlayer(s) });
  forEachEnemy((m) => { if (onScreen(m.x, m.y, 80)) drawList.push({ y: m.y, fn: () => drawEnemy(m), near: false }); });
  drawList.sort((a, b) => a.y - b.y);
  for (const d of drawList) {
    if (d.near) ctx.globalAlpha = 0.45;   // 내 앞을 가리는 소환수는 비쳐 보이게
    d.fn();
    ctx.globalAlpha = 1;
  }
  window.__barRects = barRects;
  drawPlayer();                            // 주인공은 언제나 맨 위 — 무리 속에서도 읽힌다
  window.__silRects = silRects;
  window.__ringRects = ringRects;
  window.__eliteLabels = eliteLabels;
  for (const ch of G.chests) drawChestBeacon(ch);
  PROF.seg("actors");

  spearRects = [];
  const spearIm = tex("fx/spear.png");
  for (const sp of G.spears) {
    const ang = Math.atan2(sp.vy, sp.vx);
    const drawn = spearIm && spearIm.width;
    const dw = SPEAR_LEN, dh = drawn ? SPEAR_LEN * (spearIm.height / spearIm.width) : SPEAR_LEN * 0.5;
    if (drawn) {
      ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(ang); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spearIm, -dw / 2, -dh / 2, dw, dh); ctx.restore();
    } else {
      ctx.strokeStyle = "#dfeee0"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 0.02, sp.y - sp.vy * 0.02); ctx.stroke();
    }
    const c = Math.abs(Math.cos(ang)), sn = Math.abs(Math.sin(ang));
    const ex = (dw / 2) * c + (dh / 2) * sn, ey = (dw / 2) * sn + (dh / 2) * c;
    spearRects.push({ x0: (sp.x - ex - cam.x) * Z, y0: (sp.y - ey - cam.y) * Z, x1: (sp.x + ex - cam.x) * Z, y1: (sp.y + ey - cam.y) * Z });
  }
  window.__spearRects = spearRects;
  const foeShotRects = [];
  const foeIm = tex("fx/foeshot.png");
  const foeDrawn = globalThis.__FOESHOT_ASSET !== false && foeIm && foeIm.width;
  const fw = FOESHOT_W, fh = foeDrawn ? FOESHOT_W * (foeIm.height / foeIm.width) : FOESHOT_W * 0.24;
  let foeAsset = 0, foeBar = 0;
  if (foeDrawn) ctx.imageSmoothingEnabled = false;
  for (const sh of G.foeShots) {
    const ang = Math.atan2(sh.vy, sh.vx);
    ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(ang);
    if (foeDrawn) { ctx.drawImage(foeIm, -fw / 2, -fh / 2, fw, fh); foeAsset++; }
    else {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#ff5140"; ctx.fillRect(-8, -1.6, 14, 3.2);
      ctx.fillStyle = "#ffd8a0"; ctx.fillRect(4, -1.6, 4, 3.2);
      foeBar++;
    }
    ctx.restore();
    const c = Math.abs(Math.cos(ang)), sn = Math.abs(Math.sin(ang));
    const ex = (fw / 2) * c + (fh / 2) * sn, ey = (fw / 2) * sn + (fh / 2) * c;
    foeShotRects.push({ x0: (sh.x - ex - cam.x) * Z, y0: (sh.y - ey - cam.y) * Z, x1: (sh.x + ex - cam.x) * Z, y1: (sh.y + ey - cam.y) * Z });
  }
  window.__foeShotRects = foeShotRects;
  window.__foeShotDraw = { asset: foeAsset, bar: foeBar, n: G.foeShots.length, imw: foeIm ? (foeIm.width || 0) : 0 };
  for (const p of G.parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;

  // ㉠ 시체폭발 임팩트 — 구운 스프라이트를 반경에 맞춰 키우며 사그라뜨린다. 미로드면 옛 주황 고리로 폴백.
  const boomRects = [];
  const boomIm = tex("fx/boom.png");
  ctx.imageSmoothingEnabled = false;
  for (const b of G.booms) {
    const k = b.t / b.life;
    const d = b.rad * (1.3 + 0.7 * k);
    ctx.globalAlpha = Math.min(1, (1 - k) * 1.8);
    if (boomIm && boomIm.width) ctx.drawImage(boomIm, b.x - d / 2, b.y - d / 2, d, d);
    else { ctx.strokeStyle = "#ff7a3c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, b.rad * (0.5 + k), 0, 6.283); ctx.stroke(); }
    const hx = (d / 2) * Z;
    boomRects.push({ x0: (b.x - cam.x) * Z - hx, y0: (b.y - cam.y) * Z - hx, x1: (b.x - cam.x) * Z + hx, y1: (b.y - cam.y) * Z + hx });
  }
  window.__boomRects = boomRects;

  // ㉡ 뼈창 명중 임팩트 — 짧게 띄운다. 미로드면 hurtEnemy 의 붉은 파티클이 폴백이다.
  const hitRects = [];
  const hitIm = tex("fx/spearhit.png");
  for (const h of G.hits) {
    const k = h.t / h.life;
    const s = SPEARHIT_H * (0.8 + 0.4 * k);
    ctx.globalAlpha = Math.min(1, (1 - k) * 2);
    if (hitIm && hitIm.width) ctx.drawImage(hitIm, h.x - s / 2, h.y - s / 2, s, s);
    const hs = (s / 2) * Z;
    hitRects.push({ x0: (h.x - cam.x) * Z - hs, y0: (h.y - cam.y) * Z - hs, x1: (h.x - cam.x) * Z + hs, y1: (h.y - cam.y) * Z + hs });
  }
  window.__hitRects = hitRects;
  ctx.globalAlpha = 1;
  PROF.seg("fx");

  ctx.restore();

  if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = `rgb(${flashColor})`; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.42, VW / 2, VH / 2, VH * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);

  drawItems();
  drawFloats();
  drawBossBanner();   // V-230 — 주인 이름은 창·연출보다 위(들어설 때 한 번)
  PROF.seg("overlay");
}

// ── V-230 층 주인 연출 — 장판·예고·뼈 우리·등장 배너 ─────────────────────────
function drawHazards() {   // 역병 독 장판 (바닥에 깔려 배우 밑)
  for (const h of G.hazards) {
    if (!onScreen(h.x, h.y, h.r + 40)) continue;
    if (h.warn > 0) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(nowMs() / 90));
      ctx.strokeStyle = "#ff4030"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1; continue;
    }
    const a = Math.min(1, h.life / 0.6);
    ctx.globalAlpha = 0.55 * a;
    const g = ctx.createRadialGradient(h.x, h.y, h.r * 0.2, h.x, h.y, h.r);
    g.addColorStop(0, "rgba(130,225,85,0.9)"); g.addColorStop(0.7, "rgba(70,150,40,0.6)"); g.addColorStop(1, "rgba(40,90,25,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#aef066";
    for (let i = 0; i < 5; i++) { const an = nowMs() / 300 + i * 1.3, rr = h.r * 0.7 * ((i * 37) % 100) / 100; ctx.beginPath(); ctx.arc(h.x + Math.cos(an) * rr, h.y + Math.sin(an * 1.3) * rr, 2.5, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
function drawBossTele() {   // 큰 수법의 예고 — 붉은 자리·번쩍임(피할 시간을 준다)
  for (const pk of G.packs) {
    if (!pk.awake || !pk.boss) continue;
    for (const m of pk.enemies) {
      if (!m.boss || !m.cast) continue;
      const c = m.cast, k = m.bossKind;
      if (c.phase === "warn") {
        const prog = 1 - c.t / c.warn;
        ctx.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(nowMs() / 80));
        ctx.strokeStyle = "#ff3828"; ctx.lineWidth = 4;
        if (k === 0) { ctx.beginPath(); ctx.arc(c.cx, c.cy, CAGE_R, 0, 6.283); ctx.stroke(); }
        else if (k === 1) { ctx.beginPath(); ctx.arc(c.cx, c.cy, 120, 0, 6.283); ctx.stroke(); }
        else if (k === 2) {
          ctx.lineWidth = 26; ctx.strokeStyle = `rgba(255,50,40,${0.22 + 0.4 * prog})`;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(c.dir) * 640, m.y + Math.sin(c.dir) * 640); ctx.stroke();
        } else { ctx.beginPath(); ctx.arc(m.x, m.y - m.h * 0.35, 60 + 130 * prog, 0, 6.283); ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else if (c.phase === "sweepWarn") {
        ctx.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(nowMs() / 70));
        ctx.fillStyle = "rgba(200,40,40,0.28)"; ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, 6.283); ctx.fill();
        ctx.strokeStyle = "#ff3828"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
}
function drawBones() {   // 뼈 왕의 우리 — 창백한 뼈 기둥, 금 갈수록 어두워진다(부술 수 있다는 표)
  for (const b of G.bones) {
    if (!onScreen(b.x, b.y, 60)) continue;
    const hpf = Math.max(0, b.hp / b.maxhp), h = 46;
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.globalAlpha = 0.4; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 4, b.r * 0.9, b.r * 0.4, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(${(150 + 90 * hpf) | 0},${(145 + 90 * hpf) | 0},${(125 + 80 * hpf) | 0})`;
    ctx.fillRect(-b.r * 0.55, -h, b.r * 1.1, h);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 1; i < 4; i++) ctx.fillRect(-b.r * 0.55, -h * i / 4, b.r * 1.1, 2);
    ctx.fillStyle = `rgb(${(175 + 80 * hpf) | 0},${(170 + 80 * hpf) | 0},${(150 + 70 * hpf) | 0})`;
    ctx.beginPath(); ctx.moveTo(-b.r * 0.55, -h); ctx.lineTo(0, -h - 14); ctx.lineTo(b.r * 0.55, -h); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
function drawBossBanner() {   // 들어설 때 한 번 — 이름을 화면 가운데 크게
  const bn = G.bossBanner; if (!bn) return;
  const a = bn.t < 0.3 ? bn.t / 0.3 : bn.t > 2.2 ? Math.max(0, (3.0 - bn.t) / 0.8) : 1;
  ctx.globalAlpha = a; ctx.textAlign = "center";
  const col = BOSS_LABEL_COL[bn.kind] || "#fff", cy = VH * 0.26;
  ctx.font = "bold 46px 'Times New Roman',serif";
  ctx.fillStyle = "#000"; ctx.fillText(bn.name, VW / 2 + 2, cy + 2);
  ctx.fillStyle = col; ctx.fillText(bn.name, VW / 2, cy);
  ctx.font = "16px 'Times New Roman',serif"; ctx.fillStyle = "#c8b8a0";
  ctx.fillText("이 층의 주인", VW / 2, cy + 30);
  ctx.globalAlpha = 1;
}

function stoneRim(x, y, w, h) {
  if (curFPat) { ctx.fillStyle = curFPat; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = "rgba(26,23,22,0.94)"; ctx.fillRect(x, y, w, h);
}
// ★ V-165 — 얼룩이 «딴 데서 온 판»으로 뜨던 진짜 까닭은 색이 아니라 **층**이었다.
//   바닥은 `#241f1b` + 무늬 + **물들이기**(방마다 rgba(94,66,42,0.26) 따위) 세 겹인데,
//   `drawDecals()` 가 그 **위**에 그려져 물들이기를 혼자만 안 받았다. 그래서 바닥은
//   화면에서 R−B +22~+40 인데 얼룩만 +11~+13 — 재 보면 차이가 그대로 나온다.
//   에셋을 다시 굽거나 ctx.filter 로 덧칠할 일이 아니다(그건 분칠). **얼룩은 바닥의
//   일부이니 바닥의 물들이기 «아래»에 있어야 한다.** 그래서 바닥칠을 둘로 쪼갠다.
// ★★ V-176 — 「바닥이 밋밋하다」의 정체는 «잡티가 모자란 것»이 아니라 **벽지**였다.
//   32px 타일 하나를 `createPattern(tile,"repeat")` 로 깔았으니 화면 48px(×Z 1.5)마다
//   **똑같은 그림**이 온다. 자로 재니 한 칸 민 자기 자신과 상관 **0.92** — 92% 벽지다.
//   얼룩은 그 격자를 끊으라고 있는 것인데 방을 통틀어 덮는 넓이가 **0.6%** 뿐이라
//   끊을 수가 없었다(`tools/hs_flatruler.py`).
//   그래서 무늬 자체를 바꾼다 — 4×4 칸짜리 판을 한 번 구워, 칸마다 타일을 **돌리고
//   뒤집어** 놓고 그걸 되풀이한다. 되풀이 주기가 32 → 128 로 늘고 이웃한 칸이 서로
//   다르다. **에셋을 새로 굽지 않고 색도 안 건드린다**(V-175 가 맞춰 둔 띠를 지켜야 한다).
//   씨앗은 못박는다 — 판마다 바닥이 달라지면 컷을 견줄 수가 없다.
//   ★ [[cause-written-in-the-item-is-a-guess]] — 항목엔 「덮는 넓이를 키운다」고 적혀 있었다.
function buildFloorPat(tile) {
  const N = 4, T = tile.width;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N * T;
  const c2 = cv.getContext("2d");
  c2.imageSmoothingEnabled = false;
  let sd = 0x9e3779b9;
  const rnd = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const o = (rnd() * 8) | 0;                    // 90° 넷 × 좌우뒤집기 둘
    c2.save();
    c2.translate(i * T + T / 2, j * T + T / 2);
    c2.rotate((o & 3) * Math.PI / 2);
    if (o & 4) c2.scale(-1, 1);
    c2.drawImage(tile, -T / 2, -T / 2);
    c2.restore();
  }
  return ctx.createPattern(cv, "repeat");
}
// V-204 ㉡ — 층 깊이에 따라 바닥 타일을 갈아 낀다(있는 15종 중 결이 다른 것들). 어느 층을 가도
//   같은 회색이던 것을 층으로 물들인다. 무늬 자체는 buildFloorPat 이 4×4 로 돌려 벽지를 끊는다.
const FLOOR_TILES = ["crypt_tile", "crypt_tile", "bone_tile", "bone_tile", "rot_tile", "rot_tile", "blood_tile", "blood_tile", "abyss_tile", "abyss_tile", "sanctum_tile"];
function floorTileName(f) { const i = Math.max(0, ((f | 0) - 1)); return FLOOR_TILES[Math.min(i, FLOOR_TILES.length - 1)]; }
function floorPatFor(f) {
  const name = floorTileName(f);
  let pat = FLOOR_PATS.get(name);
  if (pat) return pat;
  const tile = tex(`floor/${name}.png`);
  if (!tile || !tile.width) return FLOOR_PATS.get("crypt_tile") || curFPat || null;  // 아직 안 왔으면 옛 무늬로 버틴다
  pat = buildFloorPat(tile);
  FLOOR_PATS.set(name, pat);
  return pat;
}
// V-204 ㉠ — 벽을 wall.png(128×64, 돌벽돌) 로 편다. 북=정면 그대로, 옆=90° 돌려 세로 벽돌,
//   남=윗면(어둡게). 오프스크린에 한 번 구워 CanvasPattern 으로 재활용한다(프레임을 안 잡아먹게).
//   그림 위에 «빛만» 그라디언트로 얹어 위가 밝고 아래로 어두워지는 결을 남긴다(V-157).
function bakeCanvas(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false; draw(g); return c;
}
function shadeV(g, w, h, top, bot) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgba(0,0,0,${top})`); grad.addColorStop(1, `rgba(0,0,0,${bot})`);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
}
function buildWallPats() {
  const im = tex("decor/wall.png");
  if (!im || !im.width) return false;
  wallPatN = ctx.createPattern(bakeCanvas(64, 30, g => { g.drawImage(im, 0, 0, 64, 30); shadeV(g, 64, 30, 0.0, 0.58); }), "repeat");
  wallPatS = ctx.createPattern(bakeCanvas(64, 15, g => { g.drawImage(im, 0, 0, 64, 15); shadeV(g, 64, 15, 0.5, 0.5); }), "repeat");
  wallPatL = ctx.createPattern(bakeCanvas(15, 64, g => { g.translate(15, 0); g.rotate(Math.PI / 2); g.drawImage(im, 0, 0, 64, 15); g.setTransform(1, 0, 0, 1, 0, 0); shadeV(g, 15, 64, 0.12, 0.34); }), "repeat");
  // ★ V-215 — 옛 암반은 벽 그림을 48×32 로 2×3 격자에 «그대로» 찍어(돌림·뒤집기 없음, 주기 96px)
  //   자로 재니 한 칸 민 자기 자신과 상관 0.93·이음매 봉우리 0.96 — 92% 벽지였다(hs_v215_rock.mjs).
  //   V-176 이 **바닥**에서 잡은 것과 같은 병. 그 고침(buildFloorPat)을 암반으로 옮긴다 —
  //   정사각 칸을 4×4 로, 칸마다 90°×좌우뒤집기(buildFloorPat 과 같은 rnd)로 돌려 주기를 96→C·N 로 늘리고,
  //   칸을 흔들고(jx/jy) 키워 겹쳐(OV) 벽 그림의 어두운 가장자리가 «줄»로 안 서게 이음매를 흩는다.
  //   판을 무한히 깐 것처럼 3×3 로 둘러 그려 가장자리가 맞물린다(되풀이해도 판 경계에 새 이음매 없음).
  //   밝기·색은 그대로 — 정사각 크롭이라 벽 평균밝기가 유지되고 아래 두 겹 어둠칠도 그대로(V-212 어둠 42.8% 지킴).
  //   에셋을 새로 굽지 않고 있는 벽 그림 하나로 판만 다시 짠다. 매직넘버 없이 벽 그림 크기에서 끌어낸다.
  const C = im.height, N = 4, OV = C >> 1, P = N * C, s = C + 2 * OV, sc = (im.width - im.height) / 2;
  let sd = 0x9e3779b9;
  const rnd = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const cells = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++)
    cells.push({ i, j, o: (rnd() * 8) | 0, jx: ((rnd() - 0.5) * OV * 2) | 0, jy: ((rnd() - 0.5) * OV * 2) | 0 });
  bedrockPat = ctx.createPattern(bakeCanvas(P, P, g => {
    g.imageSmoothingEnabled = false;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (const c of cells) {
      g.save();
      g.translate(ox * P + c.i * C + C / 2 + c.jx, oy * P + c.j * C + C / 2 + c.jy);
      g.rotate((c.o & 3) * Math.PI / 2);
      if (c.o & 4) g.scale(-1, 1);
      g.drawImage(im, sc, 0, C, C, -s / 2, -s / 2, s, s);   // 정사각 크롭 → 왜곡·평균밝기 변화 없음
      g.restore();
    }
    g.fillStyle = "rgba(9,7,12,0.24)"; g.fillRect(0, 0, P, P);
    g.fillStyle = "rgba(40,36,46,0.26)"; g.fillRect(0, 0, P, P);
    g.fillStyle = "rgba(6,5,9,0.46)"; g.fillRect(0, 0, P, P);   // V-215 — 겹침이 어두운 이음매(mortar)를 덮어 밝아진 만큼 고르게 되어둡혀 V-212 어둠 42.8% 를 되찾는다(회귀로 맞춤)
  }), "repeat");
  return true;
}
function floorBase(x, y, w, h) {
  ctx.fillStyle = "#241f1b"; ctx.fillRect(x, y, w, h);
  if (curFPat) { ctx.globalAlpha = 0.55; ctx.fillStyle = curFPat; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
}
function floorTint(x, y, w, h, tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
function floorFill(x, y, w, h, tint) { floorBase(x, y, w, h); floorTint(x, y, w, h, tint); }
function northWall(r, WT, WTOP) {
  const y0 = r.y - WTOP, x0 = r.x - WT, w = r.w + 2 * WT;
  if (wallPatN) { ctx.fillStyle = wallPatN; ctx.fillRect(x0, y0, w, WTOP); }   // V-204 ㉠ — 벽은 그림(빛은 무늬에 구워 넣음)
  else {                                                             // 에셋 로드 전 폴백(옛 그라디언트)
    const g = ctx.createLinearGradient(0, y0, 0, r.y);
    g.addColorStop(0, "rgba(88,79,68,0.96)"); g.addColorStop(0.55, "rgba(54,47,40,0.94)"); g.addColorStop(1, "rgba(18,13,10,0.96)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, WTOP);
  }
  ctx.fillStyle = "rgba(150,140,122,0.45)"; ctx.fillRect(x0, y0, w, 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x0, r.y - 3, w, 4);
}
// ★ V-157 — 북쪽만 벽면이 있어서 방이 «검정 위에 뜬 바닥 섬»으로 보였다. 디아블로의 방은
//   네 면이 다 벽으로 닫혀 있어 「안에 있다」가 읽힌다. 왼쪽·오른쪽·아래도 돌 면을 세운다.
//   빛은 위에서 오므로 바깥 모서리가 밝고 방 안쪽으로 갈수록 어두워진다(북벽과 같은 결).
//   남쪽 벽은 위에서 내려다보면 «윗면»만 보이므로 안쪽이 밝고 바깥이 어둡다 — 반대로 준다.
function sideWalls(r, WT, WTOP) {
  const yTop = r.y, hh = r.h;
  for (const [x0, inner] of [[r.x - WT, r.x], [r.x + r.w, r.x + r.w + WT]]) {
    const wx = Math.min(x0, inner);
    if (wallPatL) { ctx.fillStyle = wallPatL; ctx.fillRect(wx, yTop, WT, hh); }   // V-204 ㉠
    else {
      const g = ctx.createLinearGradient(x0 < r.x ? x0 : inner, 0, x0 < r.x ? inner : x0, 0);
      g.addColorStop(0, "rgba(84,76,65,0.96)"); g.addColorStop(0.6, "rgba(46,40,34,0.95)"); g.addColorStop(1, "rgba(16,12,10,0.96)");
      ctx.fillStyle = g; ctx.fillRect(wx, yTop, WT, hh);
    }
  }
  // 남쪽 — 벽의 윗면. 방 쪽 모서리에 밝은 선을 얹어 「여기서 벽이 시작한다」를 보인다.
  const sy = r.y + r.h, sx = r.x - WT, sw = r.w + 2 * WT;
  if (wallPatS) { ctx.fillStyle = wallPatS; ctx.fillRect(sx, sy, sw, WT); }        // V-204 ㉠ — 윗면
  else {
    const gs = ctx.createLinearGradient(0, sy, 0, sy + WT);
    gs.addColorStop(0, "rgba(74,67,57,0.96)"); gs.addColorStop(1, "rgba(20,15,12,0.96)");
    ctx.fillStyle = gs; ctx.fillRect(sx, sy, sw, WT);
  }
  ctx.fillStyle = "rgba(150,140,122,0.38)"; ctx.fillRect(sx, sy, sw, 2);
  // 좌·우 벽의 바깥 모서리에도 같은 밝은 선 — 벽 두께가 눈에 잡힌다.
  ctx.fillStyle = "rgba(150,140,122,0.30)";
  ctx.fillRect(r.x - WT, yTop, 2, hh); ctx.fillRect(r.x + r.w + WT - 2, yTop, 2, hh);
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
// V-204 ㉢ — 문설주를 decor/pillar.png 로 세운다(코드 사각 → 그림). 미로드면 옛 돌기둥으로 폴백.
function jamb(cx, cy) {
  const im = tex("decor/pillar.png");
  if (im && im.width) {
    ctx.imageSmoothingEnabled = false;
    const h = 30, w = h * (im.width / im.height);
    ctx.drawImage(im, cx - w / 2, cy - h * 0.72, w, h);
  } else {
    ctx.fillStyle = "rgba(78,70,60,0.95)"; ctx.fillRect(cx - 5, cy - 5, 10, 10);
    ctx.fillStyle = "rgba(140,130,112,0.5)"; ctx.fillRect(cx - 5, cy - 5, 10, 2);
  }
}
function post(edgeX, cy, gap) { for (const s of [-1, 1]) jamb(edgeX, cy + s * (gap / 2 + 3)); }
function postH(cx, edgeY, gap) { for (const s of [-1, 1]) jamb(cx + s * (gap / 2 + 3), edgeY); }
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

// ★ V-158 — 넘어진 기둥 밑에 «검은 웅덩이»가 떠 있었다. 그림자를 그림 «파일»의 크기로
//   재고 있었는데, 구운 PNG 는 투명 여백을 달고 온다 — 여백까지 세니 폭이 부풀고,
//   바닥선(pr.y)이 실제 그림 밑동보다 아래라 그림자가 물체에서 떨어져 나갔다.
//   그림이 «실제로 찬 자리»(불투명 픽셀의 경계)를 한 번 재서 캐시하고 거기에 맞춘다.
// ★ V-160 — V-158 이 «최하단 불투명 픽셀»(y1)을 접지선으로 삼았는데, 그 자리가 실제
//   발밑보다 아래였다(넘어진 기둥 38px · 화로·항아리 ~20px). 까닭 둘, 화면에서 잰 것:
//   ① column2 는 부러진 끝이 원근으로 오른쪽-아래로 삐죽 내려가, 최하단 픽셀이 몸통이
//   아니라 그 얇은 꼬리 밑에 찍힌다. ② 화로 다리·항아리 굽 끝의 «어두운 돌»(밝기 19~44)은
//   어두운 바닥에 묻혀 눈엔 안 보이는데 알파로는 세어진다. 둘 다 그림자를 아래로 끌었다.
//   → 접지선을 «실루엣(불투명 픽셀)»의 밑변으로 잡는다. (V-163 에서 밝기 조건을 걷어냈다)
//   행별 그런 픽셀이 FOOT_VIS 개 이상인 마지막 행이 발밑. 얇은 원근 꼬리(픽셀 수 부족)와
//   어두워 안 보이는 굽(밝기 부족)이 같이 걸러진다. 화로 다리는 가장자리에 빛을 받아
//   밝은 픽셀이 발끝까지 남으므로 살아난다. 중심·폭은 그 발밑 띠(맨 아래 15%)의 보이는
//   픽셀 x 범위로 재, 원근 꼬리가 중심을 옆으로 못 끌게 한다.
//   실측(minN=4·LUM50): 기둥 -3.4px · 화로 화면에서 다리 밑 · 항아리 +2.2px (다 ≤4px).
const _footCache = new Map();
// ★★ V-163 (2026-08-30 10:08 병수님 「붕 떠 있는 건 아직도 그런 듯?」) — **밝기로 밑변을
//   잡던 것이 뜨게 만든 범인이었다.** FOOT_LUM=50 은 「어두운 픽셀은 안 보이는 것」으로 쳤는데,
//   던전 소품의 **밑동은 원래 어둡다**(화로 다리 밑 밝기 30~45). 그래서 밑변이 다리 중간으로
//   잡히고, 그림을 그 자리에 맞춰 올리니 **그림만 위로 뜨고 그림자는 제자리**에 남았다.
//   ★ 두 번 「고쳤다」고 적고도 안 고쳐진 까닭이 이것이다 — 고친 곳은 그림자였고,
//     틀린 곳은 **밑변을 정하는 자**였다([[cause-written-in-the-item-is-a-guess]]).
//   이제 밑변도 **실루엣(알파)** 으로 잡는다. 얇은 꼬리는 FOOT_VIS 개수 문턱이 거른다.
const FOOT_VIS = 4;
function spriteFoot(im, key) {
  if (_footCache.has(key)) return _footCache.get(key);
  let box = null;
  try {
    const cv = document.createElement("canvas");
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const W = im.width, H = im.height, d = g.getImageData(0, 0, W, H).data;
    const vis = new Array(H).fill(0);
    let yAlpha = -1;
    for (let y = 0; y < H; y++) {
      let v = 0;
      for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 24) { if (y > yAlpha) yAlpha = y; v++; } }
      vis[y] = v;
    }
    if (yAlpha >= 0) {
      let yb = H - 1;
      while (yb > 0 && vis[yb] < FOOT_VIS) yb--;
      if (vis[yb] < FOOT_VIS) yb = yAlpha;
      // ★ V-162 — 발밑 띠의 «폭·중심»은 **알파로** 잰다. 밝기로 거르면 어두운 다리 하나가
      //   통째로 빠져 중심이 옆으로 끌린다(화로: 다리 셋 중 왼쪽이 빠져 cx 0.625 · 폭 0.42 —
      //   그림자가 오른쪽으로 20px 밀렸다). 밝기 문턱은 «어디가 밑변인가»(yb)를 정할 때만
      //   쓰고, «얼마나 넓게 딛고 있나»는 실루엣이 답이다.
      const band = Math.max(1, Math.round(H * 0.15)), y0 = Math.max(0, yb - band + 1);
      let x0 = W, x1 = -1;
      for (let y = y0; y <= yb; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
      if (x1 >= x0) box = { cx: (x0 + x1 + 1) / 2 / W, w: (x1 + 1 - x0) / W, b: (yb + 1) / H };
    }
  } catch (e) { box = null; }
  _footCache.set(key, box);
  return box;
}

// ★★ V-160 — `PROP_WARM` 필터를 **지웠다**. 병수님 2026-08-30 08:33:
//   「에셋 픽셀랩 써서 제대로 뽑아라」. 여태 소품 아홉 장을 **찬 회색으로 굽고**
//   화면에서 sepia 로 덧칠해 왔다 — 그건 고침이 아니라 분칠이고, 밝기까지 눌러 탁해진다.
//   이제 `decor.py --warm` 이 그 색으로 **처음부터 굽는다**(구운 뒤 R−B: 기둥 −13.9→+31.1 ·
//   항아리 −27.5→+31.5 · 관 −23.2→+22.2 · 잡석 −21.0→+39.5 — 바닥 띠 +4~+32 안).
//   판정은 `tools/hs_warmcheck.py`(따뜻함 띠 · 바닥 대비 · 분홍 가드) 가 9/9 로 했다.
function drawProps() {
  const vis = G.props.filter((pr) => onScreen(pr.x, pr.y, 200));
  vis.sort((a, b) => a.y - b.y);
  for (const pr of vis) {
    const im = tex(pr.img);
    if (!im || !im.width) continue;
    const w = pr.h * (im.width / im.height);
    const fo = spriteFoot(im, pr.img);
    // ★★ V-162 — **방법을 뒤집었다.** V-158·V-160 은 그림을 파일 그대로 놓고 «그림자를
    //   그림에 맞춰 옮기는» 쪽이었다 — 그래서 잰 값이 조금만 어긋나도 그림자가 따로 논다
    //   (두 번 고치고도 화로가 20px 밀려 떠 있었다). 이제 반대다: **그림의 «보이는 밑변»을
    //   월드 바닥선(pr.y)에 맞춰 놓고**, 그림자는 그 자리(pr.x, pr.y)에 그린다.
    //   그러면 그림자는 어긋날 자리가 없다 — 정의상 발밑이다. ★ [[seam-not-values]]
    const dx = pr.x - (fo ? fo.cx * w : w / 2);          // 보이는 가로중심 → pr.x
    const dy = pr.y - (fo ? fo.b * pr.h : pr.h);         // 보이는 밑변     → pr.y
    const rx = (fo ? fo.w * w : w) * 0.34;
    // ★ V-163 — 어두운 바닥 위에서 42% 검정은 **안 보인다**(항아리는 그림자가 없는 줄 알았다).
    //   진하게 하되 번지지 않게 — 안쪽은 짙고 가장자리는 사라지는 결로.
    groundMark(pr.x, pr.y, rx, Math.max(4, Math.min(rx * 0.42, pr.h * 0.2)));
    ctx.globalAlpha = 1;
    ctx.drawImage(im, dx, dy, w, pr.h);
  }
}

function drawLight() {
  const p = G.player;
  const lg = ctx.createRadialGradient(p.x, p.y - 20, 110 / Z, p.x, p.y - 20, 720 / Z);
  lg.addColorStop(0, "rgba(0,0,0,0)");
  lg.addColorStop(0.55, "rgba(4,2,3,0.06)");
  lg.addColorStop(1, "rgba(2,1,2,0.2)");
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
// V-196 — 같은 그림의 벽을 지운다: 개체마다 이 넷 중 하나로 미세히 흔든다(m.tb=id&3). 새 에셋
// 없이 이미 있는 스프라이트에 거는 tint 라 허용(무지개 금지 — 명도 0.80~0.92·색상 ±6° 안).
const FOE_TINTS = [
  FOE_TINT,
  "grayscale(0.30) sepia(0.58) hue-rotate(-20deg) saturate(1.9) brightness(0.92)",
  "grayscale(0.34) sepia(0.62) hue-rotate(-32deg) saturate(2.1) brightness(0.80)",
  "grayscale(0.32) sepia(0.6) hue-rotate(-28deg) saturate(2.05) brightness(0.88)",
];
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

/* ★★ V-163 — **어두운 바닥 위에서 「검정 그림자」는 보이지 않는다.** 컷을 다시 찍어 보니
   항아리·기둥·석상에 그림자가 «없는» 줄 알았는데, 있는데 안 보이는 것이었다(바닥이 이미
   검정에 가까워 검정을 얹어도 차이가 없다). 그래서 접지를 **두 겹**으로 그린다:
     ① 어두운 코어 — 빛이 닿는 자리에서 그림자 노릇을 한다
     ② 그 **위 가장자리의 얇은 밝은 접촉선** — 물체와 바닥의 «경계»라 **빛과 무관하게** 읽힌다
   ②가 있어야 횃불 밖 어둠에서도 「땅에 닿았다」가 보인다.
   ★ 소품·사람·소환수·적 **전부** 이 하나를 쓴다 — 한쪽만 고쳐 두 번 어긋난 자리다
     ([[carry-fixes-forward]]). */
function groundMark(x, y, rx, ry) {
  ry = ry || rx * 0.4;
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, "rgba(0,0,0,0.58)"); g.addColorStop(0.68, "rgba(0,0,0,0.30)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.283); ctx.fill();
  // 접촉선 — 위 반원만. ★ 0.30/1.2px 로는 어둠에서 여전히 안 보였다(컷으로 확인).
  //   빛(drawLight)이 이 위를 덮으므로 **덮이고도 남을 만큼** 진해야 한다.
  ctx.strokeStyle = "rgba(226,198,146,0.55)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, rx * 0.92, ry * 0.92, 0, Math.PI, 0); ctx.stroke();
}

function drawShadow(x, y, w, col, lw, a) {
  groundMark(x, y, w);
  if (col) {
    ctx.globalAlpha = a || 0.9; ctx.strokeStyle = col; ctx.lineWidth = lw || 2.5;
    ctx.beginPath(); ctx.ellipse(x, y, w + 2, w * 0.4 + 1.5, 0, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 1;
    ringRects.push({ cx: (x - cam.x) * Z, cy: (y - cam.y) * Z, rx: (w + 2) * Z, ry: (w * 0.4 + 1.5) * Z, col });
  }
}

// 플레이어 몸통을 가리는 자리(앞·근접)인지
function nearPlayer(s) {
  const p = G.player;
  return s.y > p.y - 6 && Math.abs(s.x - p.x) < 46 && s.y - p.y < 74;
}
// ★ V-157 — 21 마리 속에서 주인공을 찾는 근거가 «금빛 고리 하나»뿐이었다. 로브의 보라가
//   해골의 푸른빛과 명도가 비슷해 실루엣이 안 섰다. 사람에게만 얇은 밝은 테를 두른다 —
//   같은 그림을 여덟 방향으로 1.5px 밀어 흰 실루엣으로 깔고 그 위에 진짜 그림을 얹는다.
//   `filtered` 가 실루엣 한 장을 캐시하므로 프레임마다 새로 만들지 않는다.
//   순백은 스티커처럼 떠서, 발밑 고리와 같은 금빛으로 맞춘다(테가 아니라 「빛」으로 읽히게).
const RIM_OFF = [[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4], [-1, -1], [1, -1], [-1, 1], [1, 1]];
// ★ V-158 — 「금빛으로 맞췄다」고 적었지만 화면에서는 흰 스티커로 왔다. sepia 를 «흰색»에
//   먹이면 R 이 1.0 을 넘겨 잘려 나가 색이 안 남는다(1.35→1.0). 먼저 어둡게 눌러
//   여유를 준 뒤 sepia 를 태워야 금빛이 선다 — 결과 ≒ #ffd45d, 발밑 고리(#e8cf52)와 같은 급.
const RIM_FILTER = "brightness(0) invert(1) brightness(0.7) sepia(1) saturate(2.5)";
function drawPlayer() {
  const p = G.player;
  drawShadow(p.x, p.y, 34, "#e8cf52", 3);
  const st = p.state, dir = actorDir(p), fr = frame(p, PLAYER_BASE);
  ctx.globalAlpha = 0.62;
  for (const [dx, dy] of RIM_OFF)
    drawSprite8(ctx, PLAYER_BASE, dir, st, fr, p.x + dx, p.y + dy, PLAYER_H, RIM_FILTER);
  ctx.globalAlpha = 1;
  if (!drawSprite8(ctx, PLAYER_BASE, dir, st, fr, p.x, p.y, PLAYER_H, p.hurt > 0 ? "brightness(2.2)" : null))
    fallbackBlob(p.x, p.y, 146, "#cfc7b0");
  recordSil("player", PLAYER_BASE, p.x, p.y, PLAYER_H);
}
// ── V-196 — 머리 위 체력바를 «그려진 실루엣의 불투명 위끝»에 건다 ─────────────────
// spriteFoot 이 발밑에 한 일을 머리 위에 그대로: footMetrics 의 (footFrac+headFrac)로
// 그려진 이미지의 불투명 머리끝을 구한다([[sprite-brings-its-own-ground]]). m.h(이름값)에
// 걸면 투명 여백만큼 바가 허공에 뜬다. 자(hs_v196_bars)는 barRects «실제로 그린 사각»만 읽는다.
let barRects = [];   // V-196: 이 프레임에 실제로 그린 체력바 사각(월드좌표) + 그 몹의 불투명 위끝
let ringRects = [];  // V-198 ㉡: 이 프레임에 실제로 그린 발밑 색 고리(화면좌표 타원 + 색)
let spearRects = []; // V-198 ㉠: 이 프레임에 실제로 그린 뼈창 발사체 화면사각
function opaqueHeadTop(base, y, h) {
  const fm = footMetrics(base);
  // 그려진 이미지 위끝 = y - h + h*footFrac, 그 안 불투명 위끝은 + h*headFrac.
  return y - h + (fm ? h * (fm.footFrac + fm.headFrac) : 0);
}
// 겹치는 바는 위로 어긋낸다(drawFloats 의 세로 밀어내기와 같은 결 · 물리 아님). top 을 돌려준다.
function pushBarUp(x, halfW, top, totalH) {
  for (let g = 0; g < 40; g++) {
    const x0 = x - halfW, x1 = x + halfW;
    const hit = barRects.find((q) => x0 < q.x1 && x1 > q.x0 && top < q.y1 && top + totalH > q.y0);
    if (!hit) break;
    top = hit.y0 - totalH - 1;   // 겹친 바 바로 위로 올린다
  }
  return top;
}
// 그린 바 사각을 기록한다. anchorBottom = 밀어내기 전 «머리에 건» 바 아래끝(㉠ 눈금이 읽는다).
function recordBar(m, halfW, top, totalH, headTop, anchorBottom, dir) {
  barRects.push({ x0: m.x - halfW, y0: top, x1: m.x + halfW, y1: top + totalH,
    headTop, anchorBottom, base: m.base, dir, tb: m.__tb, elite: !!m.elite });
}
// ── V-197 — 살아있는 것의 «화면» 실루엣 사각 ─────────────────────────────────
// opaqueHeadTop(머리끝)·footMetrics(가로 불투명 경계 leftFrac/rightFrac)로 그려진 몸의
// 사각을 구해 화면좌표로 낸다. 바닥 이름표가 이 사각을 덮으면(주인공은 특히) 위로 밀어낸다.
let silRects = [];
let eliteLabels = [];   // V-211 ㉢: 이 프레임에 그린 정예 이름표의 «화면» 사각 + 그렸는지(폭발과 겹치면 접는다)
// V-211 손잡이 — 세 고침(㉠피해수 가로회피·㉡같은이름표 ×N·㉢폭발 위 이름표 접기)을 한 번에
//   되돌린다. `globalThis.__V211=false` 면 옛 동작(자가 before 를 이 한 손잡이로 잰다).
const V211 = () => globalThis.__V211 !== false;
function silScreenRect(base, x, y, h) {
  const fm = footMetrics(base);
  const w = h * (fm ? fm.aspect : 0.6);
  const left = x - w / 2 + (fm ? fm.leftFrac * w : 0);
  const right = x - w / 2 + (fm ? fm.rightFrac * w : w);
  const top = opaqueHeadTop(base, y, h);
  return { x0: (left - cam.x) * Z, y0: (top - cam.y) * Z, x1: (right - cam.x) * Z, y1: (y - cam.y) * Z };
}
function recordSil(who, base, x, y, h) { const r = silScreenRect(base, x, y, h); r.who = who; silRects.push(r); }

function drawActor(s, base) {
  drawShadow(s.x, s.y, s.r, ringsOn() ? (s.ringCol || "#3d78c8") : null, s.ring || 2.5);
  const filt = teamTintOn() ? ALLY_TINT : (s.filt || null);
  if (!drawSprite8(ctx, base, actorDir(s), s.state, frame(s, base), s.x, s.y, s.h, filt))
    fallbackBlob(s.x, s.y, s.h, "#d8e8d0");
  if (teamTintOn() && s.tier > 0) drawTierCrest(s, base);
}
function drawEnemy(m) {
  // ★ V-207 — 잡몹 발밑 붉은 고리를 얇고 옅게(1.6px·α0.4). 팩 10~14 가 뭉치면 0.9 짜리
  //   고리가 겹쳐 바닥이 «붉은 그물»이 됐다(컷으로 봄). 정예는 눈에 띄어야 하니 굵게 둔다.
  drawShadow(m.x, m.y, m.r, ringsOn() ? (m.elite ? "#f0902a" : "#c0342c") : null,
    m.elite ? 2.5 : 1.6, m.elite ? 0.85 : 0.4);
  const tb = m.tb & 3;
  let rest = teamTintOn() ? (m.elite ? ELITE_TINT : FOE_TINTS[tb])
    : (m.elite ? "brightness(1.15) saturate(1.4) hue-rotate(-15deg)" : null);
  if (m.ranged) rest = "brightness(1.1) saturate(1.8) hue-rotate(150deg)";
  else if (m.charger) rest = "brightness(1.15) saturate(2) hue-rotate(-40deg)";
  if (m.boss) rest = BOSS_TINT[m.bossKind];   // V-230 — 주인 넷을 색조로 가른다(뼈·초록·핏·보라)
  m.__tb = m.elite ? "E" : tb;
  const filt = m.hit > 0 ? "brightness(3)" : rest;
  if (!drawSprite8(ctx, m.base, actorDir(m), m.state, frame(m, m.base), m.x, m.y, m.h, filt))
    fallbackBlob(m.x, m.y, m.h, "#8a5a5a");
  recordSil("mob", m.base, m.x, m.y, m.h);
  const hpf = Math.max(0, m.hp / m.maxhp);
  // ★ V-196 — 바를 «불투명 위끝»에 건다(m.h 이름값 아님). GAP=2 월드만큼 위, 겹치면 밀어낸다.
  const headTop = opaqueHeadTop(m.base, m.y, m.h);
  const dir = actorDir(m);
  const BAR_GAP = 2;
  // ★ V-183 — 네임드는 머리 위에 **굴린 이름표(초록 대문자) + 늘 보이는 체력바**(HS_STYLE ③).
  //   잡몹은 다칠 때만 붉은 바. 이름은 map.js 가 굴린 m.name, 색은 HS 의 초록.
  if (m.elite) {
    const bw = m.r * 2.8, halfW = bw / 2 + 1, totalH = 7;
    const top = pushBarUp(m.x, halfW, headTop - BAR_GAP - totalH, totalH), by = top + 1;
    ctx.fillStyle = "#000a"; ctx.fillRect(m.x - bw / 2 - 1, by - 1, bw + 2, totalH);
    ctx.fillStyle = "#e8cf52"; ctx.fillRect(m.x - bw / 2, by, bw * hpf, 5);
    const nm = m.name || "정예";
    const lsx = (m.x - cam.x) * Z, lsy = (by - 6 - cam.y) * Z;
    const bossN = !!m.boss;   // V-230 — 주인 이름은 늘 머리 위에 크게(잡정예보다 큼·주인색)
    ctx.font = (bossN ? "bold 16px" : "bold 11px") + " 'Times New Roman',serif"; ctx.textAlign = "center";
    const lhw = ctx.measureText(nm).width / 2 + 2;
    const onBoom = V211() && labelOverBoom(lsx, lsy, lhw);
    if (!onBoom) {
      ctx.save(); ctx.translate(m.x, by - 6); ctx.scale(1 / Z, 1 / Z);
      ctx.fillStyle = "#000"; ctx.fillText(nm, 0.8, 0.8);
      ctx.fillStyle = bossN ? BOSS_LABEL_COL[m.bossKind] : "#8ac06a"; ctx.fillText(nm, 0, 0);
      ctx.restore();
    }
    eliteLabels.push({ x0: lsx - lhw, y0: lsy - 13, x1: lsx + lhw, y1: lsy, drawn: !onBoom });
    recordBar(m, halfW, top, totalH, headTop, headTop - BAR_GAP, dir);
  } else if (hpf < 1) {
    const bw = m.r * 2.2, halfW = bw / 2 + 1, totalH = 6;
    const top = pushBarUp(m.x, halfW, headTop - BAR_GAP - totalH, totalH), by = top + 1;
    ctx.fillStyle = "#000a"; ctx.fillRect(m.x - bw / 2 - 1, by - 1, bw + 2, totalH);
    ctx.fillStyle = "#b0342e"; ctx.fillRect(m.x - bw / 2, by, bw * hpf, 4);
    recordBar(m, halfW, top, totalH, headTop, headTop - BAR_GAP, dir);
  }
}
function fallbackBlob(x, y, h, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y - h * 0.35, h * 0.18, h * 0.35, 0, 0, 6.283); ctx.fill(); }
// 정예 이름표 화면사각이 «살아있는 시체폭발»의 화면사각과 겹치나(폭발 반경은 drawWorld 와 같은 식).
function labelOverBoom(lsx, lsy, lhw) {
  for (const b of G.booms) {
    const hx = (b.rad * (1.3 + 0.7 * (b.t / b.life)) / 2) * Z;
    const bx = (b.x - cam.x) * Z, by = (b.y - cam.y) * Z;
    if (lsx - lhw < bx + hx && lsx + lhw > bx - hx && lsy - 13 < by + hx && lsy > by - hx) return true;
  }
  return false;
}

// ★★ V-164 (2026-08-30) — **코드로 그리던 계단을 구운 그림으로 되돌린다.**
//   병수님 08:33: 「에셋 픽셀랩 써서 제대로 뽑아라 … fillRect 로 그리거나 로컬로 만들어
//   바로 적용 금지」. V-160·V-162 는 굽기가 네 번 실패하자 **코드 사다리꼴**로 도망쳤는데,
//   컷을 열어 보면 그것이 문제였다 — 벡터로 그린 매끈한 사다리꼴이 **픽셀 바닥 위에서
//   혼자 안티에일리어싱**돼 딴 그림처럼 뜬다. 「구멍으로 읽히나」이전에 **결이 다르다.**
//
//   굽기가 실패한 까닭은 프롬프트였다: 길고 부정어가 열두 개 ([[pixellab-side-attack-failures]]).
//   낱말을 줄이고 결을 넷으로 갈라 한꺼번에 구우니(`tmp/stair_bake.py`) 넷 다 나왔고,
//   그중 **「A BLACK PIT in warm brown stone floor」**(= 어둠을 주어로 맨 앞에 세운 것)가
//   따뜻한 돌 테두리를 두른 검은 구멍 + 내려가는 디딤판으로 왔다. R−B +24 — 바닥 띠
//   (+3.7~+31.7) 안이라 **필터가 필요 없다.**
//
//   ★ 계단은 **바닥에 뚫린 구멍**이다. 소품처럼 발밑을 맞추지 않고(서 있는 것이 아니다)
//     그림 한가운데를 s.x,s.y 에 놓는다. 그림자도 없다 — 구멍은 그늘을 지지 않는다.
const STAIR_H = 104;
function drawStairs() {
  const s = G.stairs;
  const im = tex("decor/stairs.png");
  if (im && im.width) {
    const w = STAIR_H * (im.width / im.height);
    ctx.drawImage(im, s.x - w / 2, s.y - STAIR_H / 2, w, STAIR_H);
  }
  const near = Math.hypot(G.player.x - s.x, G.player.y - s.y) < 70;
  ctx.fillStyle = near ? "#bfe8c8" : "#6a9a7a"; ctx.font = "13px 'Times New Roman',serif"; ctx.textAlign = "center";
  // V-166: 그림이 «계단»이 아니라 뚜껑문이라 이름을 그림에 맞춘다(픽셀랩이 위에서 본
  // 내려가는 계단을 여덟 번 못 그렸다 — 그릴 수 있는 물건으로 바꾼 것).
  ctx.fillText(near ? "▼ F — 다음 층" : "▼ 아래로", s.x, s.y - STAIR_H / 2 - 10);
}

// 궤짝은 «바닥에» 그려져 유닛에 가린다(V-154 B: 좀비 몸에 묻혀 동전만 했다). 몸통을
// 키우고(반너비 28·높이 34), 빛무리를 넓혀 밝힌다. 위치 표식(빛기둥·마름모)은 유닛을
// 다 그린 뒤 drawChestBeacon 이 얹어, 무엇에 가려도 어디 있는지 보인다.
function drawChest(ch) {
  if (ch.opened) {
    ctx.fillStyle = "#160e07"; ctx.fillRect(ch.x - 26, ch.y - 16, 52, 9);
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(ch.x - 26, ch.y - 8, 52, 16);
    return;
  }
  if (Math.hypot(G.player.x - ch.x, G.player.y - ch.y) < CHEST_OPEN_R) openChest(ch);
  const pulse = 0.5 + 0.5 * Math.sin(nowMs() / 320);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(ch.x, ch.y - 12, 0, ch.x, ch.y - 12, 130);
  g.addColorStop(0, `rgba(248,210,110,${0.22 + pulse * 0.22})`);
  g.addColorStop(0.5, `rgba(232,150,60,${0.10 + pulse * 0.10})`);
  g.addColorStop(1, "rgba(240,200,90,0)");
  ctx.fillStyle = g; ctx.fillRect(ch.x - 130, ch.y - 142, 260, 260);
  ctx.globalCompositeOperation = "source-over";
  // 옆에 선 화로·관·항아리는 전부 구운 픽셀아트인데 **상자만 fillRect** 여서, 던전에서
  // 제일 눈에 띄어야 할 것이 제일 싸구려로 보였다(V-155). 소품과 같은 길로 그린다.
  // 그림이 아직 없으면 옛 네모로 떨어진다 — 에셋 하나 때문에 상자가 사라지면 안 된다.
  const bh = 34;
  const im = tex("decor/chest.png");
  if (im && im.width) {
    const h = 62, w = h * (im.width / im.height);
    // ★★ V-170 — 상자만 «그림 밑변»을 바닥선에 놓고 있었다. `chest.png` 는 아래에 투명
    //   여백이 8px(14.3%) 있어서, 그림자는 ch.y 에 찍히는데 궤짝은 그 위 **8.9px 에 떠
    //   있었다.** 소품은 V-162 에 이미 «보이는 밑변»으로 고쳤는데 상자에 안 옮겼다.
    //   ★ [[carry-fixes-forward]] — 소품·상자 둘 다 같은 `spriteFoot` 길로 그린다.
    const fo = spriteFoot(im, "decor/chest.png");
    const dx = ch.x - (fo ? fo.cx * w : w / 2);
    const dy = ch.y - (fo ? fo.b * h : h);
    const rx = (fo ? fo.w * w : w) * 0.34;
    groundMark(ch.x, ch.y, rx, Math.max(4, Math.min(rx * 0.42, h * 0.2)));
    ctx.globalAlpha = 1;
    ctx.drawImage(im, dx, dy, w, h);
    return;
  }
  const bw = 28;
  ctx.fillStyle = "#4a3113"; ctx.fillRect(ch.x - bw, ch.y - bh, bw * 2, bh);
  ctx.fillStyle = "#7a5220"; ctx.fillRect(ch.x - bw, ch.y - bh, bw * 2, bh * 0.4);
  ctx.fillStyle = "#5a3c18"; ctx.fillRect(ch.x - bw, ch.y - bh * 0.6, bw * 2, bh * 0.6);
  ctx.fillStyle = "#d8b45a"; ctx.fillRect(ch.x - bw, ch.y - bh, bw * 2, 3);
  ctx.fillStyle = "#d8b45a"; ctx.fillRect(ch.x - bw, ch.y - bh * 0.62, bw * 2, 4);
  ctx.fillStyle = "#e8c860"; ctx.fillRect(ch.x - 5, ch.y - bh * 0.6 - 3, 10, 12);
  ctx.fillStyle = "#3a2405"; ctx.fillRect(ch.x - 2, ch.y - bh * 0.6 + 1, 4, 4);
  ctx.strokeStyle = "#241505"; ctx.lineWidth = 2.5; ctx.strokeRect(ch.x - bw, ch.y - bh, bw * 2, bh);
}
function drawChestBeacon(ch) {
  if (ch.opened || !onScreen(ch.x, ch.y, 180)) return;
  const pulse = 0.5 + 0.5 * Math.sin(nowMs() / 320);
  ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createLinearGradient(0, ch.y - 170, 0, ch.y - 6);
  beam.addColorStop(0, "rgba(248,214,120,0)");
  beam.addColorStop(1, `rgba(248,210,120,${0.10 + pulse * 0.13})`);
  ctx.fillStyle = beam;
  const bw = 13 + pulse * 5;
  ctx.fillRect(ch.x - bw, ch.y - 170, bw * 2, 164);
  ctx.globalCompositeOperation = "source-over";
  const by = ch.y - 104 - Math.sin(nowMs() / 300) * 6;
  ctx.save(); ctx.translate(ch.x, by); ctx.rotate(Math.PI / 4);
  const s = 8;
  ctx.fillStyle = `rgba(255,242,190,${0.72 + pulse * 0.28})`; ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.strokeStyle = "#7a4e10"; ctx.lineWidth = 1.6; ctx.strokeRect(-s, -s, s * 2, s * 2);
  ctx.restore();
}
function openChest(ch) {
  ch.opened = true;
  const n = 3 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) spawnItem(ch.x, ch.y - 6, Math.random() < 0.3);
  for (let i = 0; i < 8; i++) G.golds.push({ x: ch.x, y: ch.y, vx: (Math.random() * 2 - 1) * 90, vy: (Math.random() * 2 - 1) * 90, val: 8, t: 0 });
  flash = Math.max(flash, 0.12); flashColor = "216,180,90";
}

// ── V-184 바닥 이름표 — D2 결: 평소엔 «점»만, ALT 로 다 보이고, 늘 하나는 보인다 ──────
// V-183 이 밀도를 재다 찍어 보고 찾았다: 이름표가 모든 물건에 늘 뜨고 겹치면 8층까지
// 위로 밀어 쌓아 화면 한복판을 덮었다(자로 재니 덮음률 p50 14%·최대 44개·8층). D2 처럼
// 기본은 감추고 표시(점)만 남긴다 · ALT 누르는 동안만 다 보인다 · 늘 하나(마우스가 얹힌
// 것, 없으면 가장 가까운 것)는 보인다 · 켜도 개수 상한(12)·쌓임 상한(3층)을 둔다.
const LABEL_CAP = 12;
const DEFAULT_CAP = 6;   // V-192 — ALT 안 눌러도 늘 보이는 등급1+ 이름표 상한(레퍼런스 ②의 여섯).
const LABEL_STACK = 3;
const COMMON_FADE = 8;
function itemRank(it) {
  if (it.item.build || it.item.unique) return 3;
  const k = it.item.rarity.key;
  return k === "yellow" ? 2 : k === "blue" ? 1 : 0;
}
function drawItems() {
  ctx.textAlign = "center";
  itemLabels = [];
  window.__labels = itemLabels;
  const p = G.player;
  const showAll = keys.has("alt");
  const vis = [];
  for (const it of G.items) {
    const sx = (it.x - cam.x) * Z, sy = (it.y - cam.y) * Z;
    if (sx < -40 || sx > VW + 40 || sy < -20 || sy > VH + 20) continue;
    const rank = itemRank(it), col = it.item.rarity.color;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sx, sy + 8, rank >= 2 ? 4 : 3, 0, 6.283); ctx.fill();
    if (rank >= 2) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy + 8, rank >= 3 ? 7 : 5.5, 0, 6.283); ctx.stroke(); }
    vis.push({ it, sx, sy, rank, d: Math.hypot(it.x - p.x, it.y - p.y), dm: Math.hypot(sx - mouse.x, sy + 8 - mouse.y) });
  }
  let picks;
  if (invOpen) picks = [];
  else if (showAll) {
    picks = vis.filter((o) => !(o.rank === 0 && o.it.t > COMMON_FADE));
    picks.sort((a, b) => b.rank - a.rank || a.d - b.d);
    picks = picks.slice(0, LABEL_CAP);
  } else {
    // ★ V-192 — 레퍼런스 ②는 바닥 이름표 «여섯»을 늘 보여 준다(HS_STYLE). V-184 가 기본을
    //   하나로 줄여 놓아(자 hs_v192_dense: p50 1·max 1) 「바닥이 곧 루팅」이 안 읽혔다 —
    //   화면엔 물건이 p50 126·등급1+ 49 나 쌓이는데 이름표는 하나뿐이었다. 등급 있는 것
    //   (파랑+)을 가까운 순으로 DEFAULT_CAP 개까지 늘 세우고, 마우스 얹은 것 하나를 끼운다.
    //   흔한 것(흰)은 여전히 점만 — 개수 상한·겹침 상한(LABEL_STACK)이 V-184 의 난장을 막는다.
    const named = vis.filter((o) => o.rank >= 1);
    named.sort((a, b) => b.rank - a.rank || a.d - b.d);
    picks = named.slice(0, DEFAULT_CAP);
    let hover = null, bm = 44;
    for (const o of vis) if (o.dm < bm) { bm = o.dm; hover = o; }
    if (hover && !picks.includes(hover)) picks.push(hover);
    if (!picks.length) { let bd = 1e18, one = null; for (const o of vis) if (o.d < bd) { bd = o.d; one = o; } if (one) picks = [one]; }
  }
  // ㉡ V-211 — 같은 이름의 바닥 물건이 여럿이면(빌드 방울 «+2 소환 자리»가 무리째 떨어진다)
  //   초록 글이 예닐곱 겹으로 쌓여 툴팁을 덮었다. 한 이름당 가장 좋은/가까운 하나만 그리고,
  //   화면 안 같은 이름 물건 수(vis 로 셈)를 «×N» 으로 붙인다. picks 는 이미 등급·거리순.
  if (V211()) {
    const nameCount = new Map();
    for (const o of vis) nameCount.set(o.it.item.name, (nameCount.get(o.it.item.name) || 0) + 1);
    const seenName = new Set(), merged = [];
    for (const o of picks) {
      const nm = o.it.item.name;
      if (seenName.has(nm)) continue;
      seenName.add(nm);
      o.count = nameCount.get(nm) || 1;
      merged.push(o);
    }
    picks = merged;
  }
  const placed = [];
  let drawn = 0;
  for (let pi = 0; pi < picks.length; pi++) {
    const o = picks[pi];
    let ly = o.sy, moved = true, guard = 0;
    while (moved && guard++ < 12) { moved = false;
      for (const q of placed) if (Math.abs(q.x - o.sx) < 104 && Math.abs(q.ly - ly) < 18) { ly = q.ly - 18; moved = true; } }
    if (ly < o.sy - 18 * LABEL_STACK) continue;
    ly = liftLabelAboveLiving(o.it, o.sx, ly);
    // V-197 — 붐벼서 밀어내도 몹을 덮으면 «점»으로 접는다(V-184 의 점 모드·밑 색점은 이미 그렸다).
    //   늘 하나(마지막 남은 하나)는 접지 않는다 — V-184/V-192 의 「늘 하나는 보인다」.
    const lastOne = drawn === 0 && pi === picks.length - 1;
    if (!lastOne && labelHitsMob(o.it, o.sx, ly)) continue;
    placed.push({ x: o.sx, ly });
    drawItemLabel(o.it, o.sx, o.sy, ly, o.count);
    drawn++;
  }
}
function labelHitsMob(it, sx, ly) {
  ctx.font = "13px 'Times New Roman',serif";
  const hw = (ctx.measureText(it.item.name).width + 16) / 2, x0 = sx - hw, x1 = sx + hw;
  for (const s of silRects)
    if (s.who === "mob" && x0 < s.x1 && x1 > s.x0 && ly - 10 < s.y1 && ly + 6 > s.y0) return true;
  return false;
}
// ── V-197 — 이름표를 살아있는 것(주인공·몹) 위로 밀어낸다 ─────────────────────────
// drawFloats 세로 밀어내기·pushBarUp 과 같은 결: 이름표 사각(밑 ly+6)이 실루엣 위끝(silRects)을
// 덮으면 그 위로 올린다. 주인공은 특히(못 보면 못 피한다). 상한 없이 clear 될 때까지 — 늘 하나
// 보인다는 V-184 규칙은 pick 이 이미 지키므로, 여기선 «덮는 것보다 뜨는 게 낫다»가 우선.
function liftLabelAboveLiving(it, sx, ly) {
  ctx.font = "13px 'Times New Roman',serif";
  const hw = (ctx.measureText(it.item.name).width + 16) / 2, x0 = sx - hw, x1 = sx + hw;
  for (let g = 0; g < 40; g++) {
    let top = null;
    for (const s of silRects) if (x0 < s.x1 && x1 > s.x0 && ly - 10 < s.y1 && ly + 6 > s.y0)
      if (top === null || s.y0 < top) top = s.y0;
    if (top === null) break;
    const nly = top - 8;                       // 이름표 밑(ly+6)을 실루엣 위끝 위로(간격 2)
    if (nly >= ly) break;
    ly = nly;
    if (ly - 10 < FLOAT_MARGIN) { ly = FLOAT_MARGIN + 10; break; }   // 천장에 닿으면 멈춘다
  }
  return ly;
}
function drawItemLabel(it, sx, sy, ly, count) {
  const r = it.item.rarity;
  const label = count > 1 ? it.item.name + "  ×" + count : it.item.name;
  ctx.font = "13px 'Times New Roman',serif";
  const w = ctx.measureText(label).width + 16;
  if (ly < sy - 2) {
    ctx.strokeStyle = r.color + "44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sy + 4); ctx.lineTo(sx, ly + 6); ctx.stroke();
  }
  ctx.fillStyle = "rgba(6,4,4,0.86)"; ctx.fillRect(sx - w / 2, ly - 10, w, 16);
  ctx.strokeStyle = r.color + "88"; ctx.lineWidth = 1; ctx.strokeRect(sx - w / 2, ly - 10, w, 16);
  ctx.fillStyle = r.color; ctx.fillText(label, sx, ly + 2);
  itemLabels.push({ x0: sx - w / 2, y0: ly - 10, x1: sx + w / 2, y1: ly + 6, it, sy, layer: Math.round((sy - ly) / 18) });
}
const FLOAT_MARGIN = 4;   // 떠오르는 글자를 캔버스 안으로 밀 때의 여백(좌우·상하 공통)
// 하단 UI 예약 띠 — 스킬바 기둥(#bl)과 도움말(#hint)이 차지하는 화면 아래 사각의 합집합.
// 떠오르는 글자가 이 사각에 들면 위로 밀어낸다. 자(hs_v195_hud)도 같은 두 요소를 본다 —
// 한 곳에서만 정의해 매직넘버가 흩어지지 않게.
function hudBandRect() {
  let r = null;
  for (const id of ["bl", "hint"]) {
    const e = el(id); if (!e) continue;
    const b = e.getBoundingClientRect();
    if (!(b.width && b.height)) continue;
    r = r ? { x0: Math.min(r.x0, b.left), y0: Math.min(r.y0, b.top), x1: Math.max(r.x1, b.right), y1: Math.max(r.y1, b.bottom) }
          : { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom };
  }
  return r;
}
function drawFloats() {
  ctx.textAlign = "center";
  const rects = [];   // V-195: «실제로 그린» 사각을 남긴다 — 자(hs_v195_hud)가 이 배열만 읽는다.
  const M = FLOAT_MARGIN, band = hudBandRect();
  for (const f of G.floats) {
    const rx = (f.x - cam.x) * Z, ry = (f.y - cam.y) * Z;
    if (f.ring !== undefined) { ctx.globalAlpha = Math.max(0, f.t); ctx.strokeStyle = "#ff7a3c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(rx, ry + 30 * Z, f.ring * Z, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
    if (!f.txt) continue;
    ctx.globalAlpha = Math.min(1, f.t * 1.5);
    const fs = f.big ? 26 : (f.sz || 16);
    ctx.font = (f.big ? "bold 26px " : fs + "px ") + "'Times New Roman',serif";
    const hw = ctx.measureText(f.txt).width / 2;
    // 캔버스 안으로 민다 — 좌우·상하 모두. 사각은 (sx-hw, sy-fs)~(sx+hw, sy).
    let sx = Math.max(M + hw, Math.min(VW - M - hw, rx));
    let sy = Math.max(M + fs, Math.min(VH - M, ry));
    // 하단 UI 띠에 «들면»(가로가 겹치고 글자 밑이 띠 위끝을 넘으면) 위로 밀어낸다.
    if (band && sx + hw > band.x0 && sx - hw < band.x1 && sy > band.y0 - M)
      sy = Math.max(M + fs, band.y0 - M);
    // 같은 시각에 뜬 글자끼리 어긋나게 — 겹치면 위로 올려 쌓고, 천장에 닿으면 옆으로 비킨다.
    // ㉠ V-211: 위로만 밀던 옛 방식은 화면 위쪽에서 피해수 여럿이 한 줄에 겹쳐 «10.1K17.1K…»로
    //   뭉갰다(가로 회피가 없었다). 천장에선 겹친 사각의 좌·우 중 캔버스에 남는 쪽으로 옮긴다.
    for (let g = 0; g < 40; g++) {
      const hit = rects.find((q) => sx - hw < q.x1 && sx + hw > q.x0 && sy - fs < q.y1 && sy > q.y0);
      if (!hit) break;
      const up = hit.y0 - 2;
      if (up - fs >= M) { sy = up; continue; }
      if (!V211()) break;
      const right = hit.x1 + hw + 1, left = hit.x0 - hw - 1;
      if (right + hw <= VW - M && (sx <= hit.x1 || left - hw < M)) sx = right;
      else if (left - hw >= M) sx = left;
      else break;
    }
    ctx.fillStyle = "#000"; ctx.fillText(f.txt, sx + 1, sy + 1);
    ctx.fillStyle = f.col || "#fff"; ctx.fillText(f.txt, sx, sy);
    ctx.globalAlpha = 1;
    rects.push({ x0: sx - hw, y0: sy - fs, x1: sx + hw, y1: sy, txt: f.txt, dmg: !!f.dmg });
  }
  window.__floatRects = rects;
  window.__floatBand = band;   // 자는 «글자를 앉힌 그 순간의» 띠로 겹침을 재야 한 프레임 어긋남이 안 샌다.
}

const el = (id) => document.getElementById(id);

// ── V-181 툴팁 — 바닥 이름표에 마우스를 얹으면 뜬다 ──────────────────────────
// 이름표 사각(itemLabels)은 이미 «화면» 좌표라 mouse(x,y)와 곧장 견준다. 창은 커서
// 오른쪽에 두고, 화면 밖으로 나면 왼쪽으로 뒤집는다. HTML 은 물건이 바뀔 때만 다시 짠다.
const SLOT_ORDER = ["weapon", "helm", "armor", "gloves", "boots", "ring", "amulet"];
function esc(s) { return ("" + s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function tooltipHTML(it, cmp) {
  if (it.build) return `<div class="tipname">${esc(it.name)}</div><div class="tipmod">즉시 적용 — 집으면 켜진다</div>`;
  const nameClass = it.unique ? "unique" : it.rarity.key === "yellow" ? "rare" : "";
  const rows = [`<div class="tipname ${nameClass}">${esc(it.name)}</div>`];
  rows.push(`<div class="tipsub">${it.rarity.name} · ${SLOT_LABEL[it.slot] || ""}</div>`);
  rows.push(`<div class="tiprule"></div>`);
  if (it.affixes && it.affixes.length) {
    const cmpMap = {};
    if (cmp) for (const a of (cmp.affixes || [])) cmpMap[a.key] = (cmpMap[a.key] || 0) + a.value;
    for (const a of it.affixes) {
      let diff = "";
      if (cmp && a.key in cmpMap) {
        const d = a.value - cmpMap[a.key];
        if (d !== 0) diff = ` <span class="tipdiff ${d > 0 ? "up" : "down"}">(${d > 0 ? "+" : "−"}${Math.abs(d)})</span>`;
      }
      rows.push(`<div class="tipaffix">${esc(a.label)}${diff}</div>`);
    }
  } else rows.push(`<div class="tipbase">옵션 없음</div>`);
  if (it.unique) {
    rows.push(`<div class="tipmod">${esc(it.unique.note)}</div>`);
    rows.push(`<div class="tiprule"></div>`);
    rows.push(`<div class="tiplore">"${esc(it.unique.lore)}"</div>`);
  }
  return rows.join("");
}
let tipItem = null;
function updateTooltip() {
  const tip = el("tooltip");
  if (!tip) return;
  if (invOpen) return;
  let hit = null;
  for (const b of itemLabels)
    if (mouse.x >= b.x0 && mouse.x <= b.x1 && mouse.y >= b.y0 && mouse.y <= b.y1) { hit = b; break; }
  if (!hit || G.dead) { if (tipItem) { tip.style.display = "none"; tipItem = null; } return; }
  if (hit.it.item !== tipItem) { tip.innerHTML = tooltipHTML(hit.it.item); tipItem = hit.it.item; tip.style.display = "block"; }
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = mouse.x + 18, y = mouse.y + 16;
  if (x + w > VW - 6) x = mouse.x - 18 - w;
  if (y + h > VH - 6) y = VH - 6 - h;
  if (y < 6) y = 6;
  tip.style.left = Math.max(6, x) + "px";
  tip.style.top = y + "px";
}

// ── V-182 격자 인벤토리 창 (I) ───────────────────────────────────────────────
// 왼쪽 사람모양 착용 일곱 칸 · 오른쪽 10×4 격자(D2 결). 담기·착용·해제는 bag.js 의
// 순수 셈을 부르고, 스탯은 전부 recalc() 한 문을 지난다. 창이 열려 있어도 게임은 돈다.
const DOLL = {
  helm: [2, 1], amulet: [3, 1],
  weapon: [1, 2], armor: [2, 2], ring: [3, 2],
  gloves: [1, 3], boots: [3, 3],
};
const CELL = 34;

function toggleInv() {
  invOpen = !invOpen;
  el("inv").classList.toggle("on", invOpen);
  hoverItem = null; hoverRect = null; _prevHover = null;
  el("tooltip").style.display = "none"; el("tooltip2").style.display = "none"; tipItem = null;
  if (invOpen) renderInv();
}

function cellDiv(it, w, h, onClick) {
  const d = document.createElement("div");
  d.className = "icell";
  d.style.width = (w * CELL) + "px";
  d.style.height = (h * CELL) + "px";
  d.style.color = it.rarity.color;
  d.style.borderColor = it.rarity.color;
  d.style.background = it.rarity.color + "22";
  d.textContent = SLOT_LABEL[it.slot] || it.slot;
  d.addEventListener("mouseenter", () => { hoverItem = it; hoverRect = d.getBoundingClientRect(); });
  d.addEventListener("mouseleave", () => { if (hoverItem === it) { hoverItem = null; hoverRect = null; } });
  d.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
  d.addEventListener("contextmenu", (e) => { e.preventDefault(); if (e.ctrlKey) dropItemFromBag(it); });
  return d;
}

function renderInv() {
  const p = G.player;
  const doll = el("paperdoll");
  doll.innerHTML = "";
  for (const slot of SLOT_ORDER) {
    const [col, row] = DOLL[slot];
    const cell = document.createElement("div");
    cell.className = "dollcell";
    cell.style.gridColumn = col; cell.style.gridRow = row;
    const it = p.equipped[slot];
    if (it) cell.appendChild(cellDiv(it, 1, 1, () => unequip(slot)));
    else { cell.classList.add("empty"); cell.textContent = SLOT_LABEL[slot]; }
    doll.appendChild(cell);
  }
  const grid = el("baggrid");
  grid.innerHTML = "";
  grid.style.width = (GRID_COLS * CELL) + "px";
  grid.style.height = (GRID_ROWS * CELL) + "px";
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    const bg = document.createElement("div"); bg.className = "gcell";
    bg.style.left = ((i % GRID_COLS) * CELL) + "px"; bg.style.top = (((i / GRID_COLS) | 0) * CELL) + "px";
    grid.appendChild(bg);
  }
  for (const pl of layoutBag(p.bag).placements) {
    const d = cellDiv(pl.item, pl.w, pl.h, () => equipFromBag(pl.item));
    d.style.left = (pl.col * CELL) + "px"; d.style.top = (pl.row * CELL) + "px";
    grid.appendChild(d);
  }
}

function equipFromBag(gear) {
  if (!equipOp(G.player.bag, G.player.equipped, gear)) return;
  recalc();
  if (invOpen) renderInv();
}
function unequip(slot) {
  const p = G.player;
  if (!unequipOp(p.bag, p.equipped, slot)) {
    floatNote("가방이 가득 찼다", "#e0663c", 1.2);
    return;
  }
  recalc();
  if (invOpen) renderInv();
}
function dropItemFromBag(gear) {
  const p = G.player;
  const i = p.bag.indexOf(gear);
  if (i < 0) return;
  p.bag.splice(i, 1);
  const a = Math.random() * 6.283, s = 90;
  G.items.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, item: gear, t: 0, drop: true });
  if (invOpen) renderInv();
}

// ── V-186 스킬·스탯 창 (C) — HS_STYLE ⑤ ─────────────────────────────────────
// 좌: 스탯 여섯(오각별) + Points Left. 우: 스킬트리 두 갈래(선으로 이음·앞칸 잠금).
// 스탯/스킬 찍기는 전부 spendAttr/spendSkill → recalc() 한 문을 지난다. 창이 열려도 게임은 돈다.
function toggleChar() {
  charOpen = !charOpen;
  el("char").classList.toggle("on", charOpen);
  el("chartip").style.display = "none";
  if (charOpen) renderChar(); else invReleaseTips();
}
function invReleaseTips() { el("chartip").style.display = "none"; }
let charName = "네크로맨서";   // V-209 — 한글로
function renameChar() {
  const nm = (window.prompt("소환사 이름", charName) || "").trim();
  if (!nm) return;
  charName = nm;
  const c = document.querySelector(".cls"); if (c) c.textContent = charName;
}
function star(col) { return `<span class="star" style="background:${col}"></span>`; }
function attrTrim(v) { return Number.isInteger(v) ? String(v) : String(+v.toFixed(2)); }
function attrLive(p, key) {
  const a = ATTR[key], lv = p.attr[key];
  if (a.unit === "%") {
    const v = lv * a.per;
    if (a.cap != null && v >= a.cap) return `+${a.cap}% (상한)`;
    return `+${attrTrim(v)}%`;
  }
  return `+${attrTrim(lv * a.per)}`;
}
function attrTotal(p, key) {
  if (key === "str") return mulTxt(p.dmgMul);
  if (key === "dex") return `${(1 / p.atkCd).toFixed(1)}/s`;
  if (key === "int") return mulTxt(p.minionMul);
  if (key === "sta") return `${p.maxmana}`;
  if (key === "def") return `${Math.round(p.dr * 100)}%`;
  if (key === "vit") return `${p.maxhp}`;
  return "";
}
function statTipHTML(a) {
  const p = G.player;
  return `<div class="tipname">${a.name}</div><div class="tipsub">lv ${p.attr[a.key]}</div>` +
    `<div class="tiprule"></div><div class="tipaffix">이 스탯: ${attrLive(p, a.key)}</div>` +
    `<div class="tipmod">합계: ${attrTotal(p, a.key)}</div>`;
}
function renderChar() {
  const p = G.player;
  let h = `<div class="invtitle">성장</div><div class="charcols">`;
  h += `<div class="statcol"><div class="ptsleft">Points Left: <b>${p.attrPts}</b></div>`;
  for (const a of ATTRS) {
    h += `<div class="statrow" data-stip="${a.key}"><span class="starw">${star(a.col)}</span>` +
      `<span class="statname">${a.name}</span><span class="statlv">${p.attr[a.key]}</span>` +
      `<span class="statval">${attrLive(p, a.key)}</span>` +
      `<button class="plus" data-a="${a.key}">+</button></div>`;
  }
  h += `</div><div class="treecols">`;
  for (const tk of ["army", "death"]) {
    const t = SKILL_TREES[tk];
    h += `<div class="treecol"><div class="treetitle" style="color:${t.col}">${t.title}</div><div class="treenodes">`;
    t.nodes.forEach((n, i) => {
      const lv = p.skill[n.key], locked = skillLocked(n);
      h += `${i ? `<div class="sconn ${locked ? "off" : ""}"></div>` : ""}` +
        `<div class="snode ${locked ? "locked" : ""}" data-tip="${n.key}">` +
        `<img class="sicon" src="../assets/ui/icon/${SKILL_ICON[n.key]}.png" onerror="this.remove()">` +
        `<div class="scount">${lv}<span class="smax">/${n.max}</span></div>` +
        `<div class="sname">${n.name}</div>` +
        `<button class="splus" data-s="${n.key}">+</button>` +
        `${locked ? `<div class="slock">🔒</div>` : ""}</div>`;
    });
    h += `</div></div>`;
  }
  h += `</div></div><div class="skpts">Skill Points: <b>${p.sklPts}</b></div>`;
  h += `<div class="charbtns">` +
    `<button data-reset="skill">Reset Skills</button>` +
    `<button data-reset="attr">Reset Attributes</button>` +
    `<button data-rename="1">Rename</button>` +
    `<button data-close="1">Close</button></div>`;
  el("char").innerHTML = h;
}
function skillTipHTML(n) {
  const p = G.player, lv = p.skill[n.key];
  let h = `<div class="tipname">${n.name}</div><div class="tipsub">lv ${lv} / ${n.max}</div>` +
    `<div class="tiprule"></div><div class="tipaffix">${n.per}</div>`;
  if (n.prereq) h += `<div class="tipmod">앞: ${skillNode(n.prereq).name} (1점 이상)</div>`;
  if (n.syn && n.syn.length) {
    h += `<div class="tiprule"></div><div class="synhead">Receives Bonuses From:</div>`;
    for (const s of n.syn) h += `<div class="synrow">${s.from} — +${s.pct}% per level</div>`;
  }
  return h;
}
function rectsHit(x, y, w, h, b) { return x < b.right && x + w > b.left && y < b.bottom && y + h > b.top; }
function unionRect(nodes) {
  let r = null;
  for (const e of nodes) {
    const b = e.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) }
          : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
  }
  return r;
}
function placeCharTip(tip, r) {
  const gap = 8, w = tip.offsetWidth, h = tip.offsetHeight;
  let x = r.right + gap;
  if (x + w > VW - 6) x = r.left - gap - w;
  x = Math.max(6, Math.min(x, VW - 6 - w));
  let y = Math.max(6, Math.min(r.top, VH - 6 - h));
  const btns = unionRect(el("char").querySelectorAll(".charbtns button"));
  if (btns && rectsHit(x, y, w, h, btns)) {
    const up = btns.top - gap - h;
    if (up >= 6) y = up;
    else if (btns.left - gap - w >= 6) x = btns.left - gap - w;
    else if (btns.right + gap + w <= VW - 6) x = btns.right + gap;
    else y = Math.max(6, up);
  }
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
function bindChar() {
  const root = el("char");
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    e.stopPropagation();
    if (b.dataset.a) spendAttr(b.dataset.a);
    else if (b.dataset.s) spendSkill(b.dataset.s);
    else if (b.dataset.reset === "attr") resetAttrs();
    else if (b.dataset.reset === "skill") resetSkills();
    else if (b.dataset.rename) renameChar();
    else if (b.dataset.close) toggleChar();
    if (charOpen) renderChar();
  });
  root.addEventListener("mouseover", (e) => {
    const tip = el("chartip");
    const sk = e.target.closest("[data-tip]"), st = e.target.closest("[data-stip]");
    const anchor = sk || st;
    if (!anchor) { tip.style.display = "none"; return; }
    tip.innerHTML = sk ? skillTipHTML(skillNode(sk.dataset.tip)) : statTipHTML(ATTR[st.dataset.stip]);
    tip.style.display = "block";
    placeCharTip(tip, anchor.getBoundingClientRect());
  });
  root.addEventListener("mouseout", (e) => { if (!e.relatedTarget || !el("char").contains(e.relatedTarget)) el("chartip").style.display = "none"; });
}

let _prevHover = null, _prevShift = false;
function updateInvTip() {
  const t1 = el("tooltip"), t2 = el("tooltip2");
  if (!invOpen || !hoverItem || G.dead) {
    if (_prevHover) { t1.style.display = "none"; t2.style.display = "none"; _prevHover = null; }
    return;
  }
  const shift = keys.has("shift");
  let cmp = shift ? (G.player.equipped[hoverItem.slot] || null) : null;
  if (cmp === hoverItem) cmp = null;
  if (hoverItem !== _prevHover || shift !== _prevShift) {
    _prevHover = hoverItem; _prevShift = shift;
    t1.innerHTML = tooltipHTML(hoverItem, cmp);
    t1.style.display = "block";
    if (cmp) { t2.innerHTML = tooltipHTML(cmp); t2.style.display = "block"; }
    else t2.style.display = "none";
    positionInvTips();
  }
}
function positionInvTips() {
  const t1 = el("tooltip"), t2 = el("tooltip2");
  const r = hoverRect; if (!r) return;
  const gap = 8, w = t1.offsetWidth, h = t1.offsetHeight;
  let x = r.right + gap, y = r.top;
  if (x + w > VW - 6) x = r.left - gap - w;
  if (y + h > VH - 6) y = VH - 6 - h;
  if (y < 6) y = 6;
  x = Math.max(6, x);
  t1.style.left = x + "px"; t1.style.top = y + "px";
  if (t2.style.display === "block") {
    let x2 = x - gap - t2.offsetWidth;
    if (x2 < 6) x2 = x + w + gap;
    t2.style.left = x2 + "px"; t2.style.top = y + "px";
  }
}

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
  const lvBase = xpForLevel(p.level), lvSpan = xpForLevel(p.level + 1) - lvBase;
  el("xp").textContent = `${comma(G.xp - lvBase)} / ${comma(lvSpan)}`;
  el("xpbar").style.width = (100 * (G.xp - lvBase) / lvSpan) + "%";
  el("mult").innerHTML = `피해 <b>${mulTxt(p.dmgMul)}</b> · 생명 <b>${comma(p.maxhp)}</b>`;
  // ★ V-209 — 지역 넉 줄도 한글로(병수님 「영어랑 한글 섞였네」). HUD·조작 안내가 한글인데
  //   여기만 영어라 한 화면에 두 말이 섞여 있었다.
  el("region1").textContent = "죽은 자의 묘지";
  el("region2").textContent = `지하 ${G.floor}층`;
  el("region3").textContent = G.floor < 2 ? "악몽" : "지옥";
  el("region4").textContent = `지역 등급 ${G.floor * 40 + 42}`;
  el("cleared").textContent = `방 ${G.cleared} / ${G.rooms.length - 1} · 처치 ${G.kills}`;
  const used = slotsUsed();
  const cap = slotCap();
  const slotsEl = el("slots");
  slotsEl.textContent = `자리 ${used} / ${cap}`;
  slotsEl.classList.toggle("full", used >= cap);
  const gnames = SKEL_TIERS.slice(0, p.maxGrade + 1).map((t, i) => (i === p.grade ? "▸" : "") + t.label).join(" · ");
  const pts = p.attrPts + p.sklPts;
  el("enh").textContent = `등급 ${gnames}` + (p.mult.minionDmg > 1.001 ? ` · 피해 ${mulTxt(p.mult.minionDmg)}` : "") + (pts ? ` · 점수 ${pts} (C)` : "");
  const log = el("picklog");
  log.innerHTML = "";
  for (const e of G.pickLog) { if (e.t <= 0) continue; const d = document.createElement("div"); d.style.color = e.color; d.textContent = e.name; d.style.opacity = Math.min(1, e.t); log.appendChild(d); }
  renderGear();
  drawMini();
}
function renderGear() {
  const g = el("gear"); if (!g) return;
  const eq = G.player.equipped;
  g.innerHTML = "";
  for (const s of SLOT_ORDER) {
    const it = eq[s];
    const span = document.createElement("span");
    span.textContent = SLOT_LABEL[s];
    if (it) { span.style.color = it.rarity.color; span.title = it.name; }
    g.appendChild(span);
  }
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
  for (const ch of G.chests) if (!ch.opened) {
    const pr = 0.5 + 0.5 * Math.sin(nowMs() / 320), d = 2.2 + pr;
    mctx.save(); mctx.translate(ch.x * sx, ch.y * sy); mctx.rotate(Math.PI / 4);
    mctx.fillStyle = "#ffd24a"; mctx.fillRect(-d, -d, d * 2, d * 2);
    mctx.restore();
  }
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
  const fd = globalThis.__FIXED_DT;
  const dt = fd > 0 ? fd : Math.min(0.05, (now - last) / 1000); last = now;
  gameTime += dt;
  if (!loadingDone) {
    const pct = LOAD.total ? Math.round(100 * LOAD.done / LOAD.total) : 0;
    el("loadbar").style.width = pct + "%";
    if (LOAD.total > 20 && LOAD.done >= LOAD.total) { loadingDone = true; el("loading").style.display = "none"; }
    requestAnimationFrame(loop); return;
  }
  const _t0 = performance.now();
  if (window.__botStep) window.__botStep(dt);
  if (!G.dead) {
    stepPlayer(dt); handleSkills(); wakePacks();
    stepEnemies(dt); stepMinions(dt); stepSpears(dt); stepFoeShots(dt); stepDrops(dt);
    stepHazards(dt); stepBones(dt);
    stepParts(dt); stepFx(dt); stepFloats(dt); markVisited();
    if (G.bossBanner) { G.bossBanner.t += dt; if (G.bossBanner.t > 3.0) G.bossBanner = null; }
    for (const e of G.pickLog) e.t -= dt;
  } else { handleSkills(); }
  cam.shake *= 0.86; if (cam.shake < 0.4) cam.shake = 0;
  flash = Math.max(0, flash - dt * 1.4);
  floorLogTick();
  const _t1 = performance.now();
  drawWorld();
  const _t2 = performance.now();
  updateHUD();
  updateTooltip();
  updateInvTip();
  const _t3 = performance.now();
  PROF.push("sim", _t1 - _t0); PROF.push("draw", _t2 - _t1); PROF.push("hud", _t3 - _t2); PROF.push("total", _t3 - _t0);
  requestAnimationFrame(loop);
}

(async function boot() {
  await loadManifest();
  resetUniques();
    preload([PLAYER_BASE, SKEL_BASE, "mob/fallen", "mob/zombie", "mob/skelarch", "mob/shaman", "mob/brute", "mob/boss"]);
    tex("floor/crypt_tile.png");
    tex("decor/wall.png"); tex("decor/pillar.png");   // V-204 — 벽·문틀 에셋 미리 받기
    for (const t of ["bone_tile", "rot_tile", "blood_tile", "abyss_tile", "sanctum_tile"]) tex(`floor/${t}.png`);  // V-204 — 층별 바닥
  tex("fx/spear.png"); tex("fx/spearhit.png"); tex("fx/boom.png"); tex("fx/gold.png"); tex("fx/foeshot.png");
  for (const im of DECOR_PRELOAD) tex(im);
  buildBelt();
  bindChar();
  start(1, null);
  requestAnimationFrame(loop);
})();
