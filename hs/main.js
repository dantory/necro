import { dirName, drawSprite8, footMetrics, frameCount, LOAD, loadManifest, preload, tex } from "./sprite.js";
import { genFloor, genTown } from "./map.js";
import { rollItem, resetUniques, rollBuildAffix, sumAffixes, SLOT_LABEL, bossUnique, rollAffixes, itemScore, rollMythic, MYTHIC, MYTHIC_RARITY, seedBossRun } from "./loot.js";
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
// ★ V-231 — 돌진에 «예고 단계»를 붙인다(예고 없이 3.4배로 달려드는 건 부당하다). tele 동안 멈춰 서서
//   방향을 겨누다 tele 끝에 방향을 한 번 못박고(m.cdx/cdy) 달린다 — 못박은 뒤엔 사람을 다시 안 겨눈다(피할 틈).
const CHARGE_TELE = 0.45;
// ★ V-231 — 자폭병 상수. 표적(사람·소환수)에 BOMB_TRIG(m.r+BOMB_REACH) 안으로 붙으면 점화(멈춘다),
//   fuse 가 0 이면 BOMB_R 안을 깎고 자기도 죽는다(killEnemy 재사용 → 시체를 남긴다). 소환수 벽을 «깎는» 답.
const BOMB_REACH = 46, BOMB_FUSE = 0.9, BOMB_R = 150, BOMB_MINION = 2.4, BOMB_PLAYER = 1.5;
// ★★ V-203b — 병수님 8-31 17:34 「알아서 해라」 → V-203 표대로 **닿게 하는 팔 + 아프게 하는 팔**을 둘 다 켠다.
//   ㉠ __RANGED_MOB 을 기본 켬으로. 원거리 화살만 소환수 벽을 «원리로» 넘어 사람에게 닿는다(V-203: 맞은수/초 0.8).
//      끄는 손잡이는 남긴다 — `globalThis.__RANGED_MOB = false` 로 되돌린다.
if (globalThis.__RANGED_MOB === undefined) globalThis.__RANGED_MOB = true;
//   ㉢ V-231 — 돌진·자폭도 기본 켬(같은 결). 끄면 `globalThis.__CHARGER_MOB=false`·`__BOMBER_MOB=false` 로 옛 판과 byte-동일.
if (globalThis.__CHARGER_MOB === undefined) globalThis.__CHARGER_MOB = true;
if (globalThis.__BOMBER_MOB === undefined) globalThis.__BOMBER_MOB = true;
//   ㉤ V-232 — 시체를 쓰는 길 둘(뼈벽 V · 시체 제물 R). 기본 켬. 끄면 옛 판과 byte-동일:
//      globalThis.__BONEWALL=false (V 키·막힘·그리기 안 지나감) · globalThis.__FEED=false (R 제물 안 지나감).
if (globalThis.__BONEWALL === undefined) globalThis.__BONEWALL = true;
if (globalThis.__FEED === undefined) globalThis.__FEED = true;
//   ㉦ V-233 — 뼈 골렘(G): 시체 5구를 모아 큰 소환수 하나. 기본 켬. 끄면 옛 판과 byte-동일:
//      globalThis.__GOLEM=false (G 키가 아무것도 안 함).
if (globalThis.__GOLEM === undefined) globalThis.__GOLEM = true;
//   ㉦b V-244 — 군세 종류 하나의 «윗손잡이»(PLAN ③). 끄면 구울(K)·골렘(G) 소환이 다 막히고, 서 있던
//      골렘은 도발/막음/돌빛 색조를 잃어 «센 해골»로 되돌아간다(= V-240 이전). 소환은 genFloor 밖이라 지문 불변.
if (globalThis.__MINIONKIND === undefined) globalThis.__MINIONKIND = true;
//   ㉧ V-237 — 잡몹 갈래(사수·돌진꾼·자폭병·시체 도둑)를 이름표·색조로 «눈에» 가르고, 새 갈래 시체 도둑을 켠다.
//      기본 켬. 끄면 옛 판과 byte-동일: 도둑이 안 스폰되고(map.js && 단락), 이름표·도둑 색조·도둑 처치 보상이 다 꺼진다.
//      (사수·돌진·자폭 자체는 옛 손잡이 __RANGED_MOB/__CHARGER_MOB/__BOMBER_MOB 로 여전히 돈다.)
if (globalThis.__MOBKIND === undefined) globalThis.__MOBKIND = true;
//   ㉨ V-237 — 떠 있는 글/판이 서로 덮거나 화면 밖으로 잘리는 것을 고친다(구입글이 제단 판을 덮음·집는 글이 왼쪽 잘림).
//      기본 켬. 끄면 옛 동작(구입글이 제단 판 위에 겹침·바닥 이름표 왼쪽 잘림).
if (globalThis.__NOTESTACK === undefined) globalThis.__NOTESTACK = true;
//   ㉩ V-237 — 장비줄 낀 칸을 레어도 색으로, 빈 칸은 흐리게(V-235 는 둘 다 밝아 컷에서 안 갈렸다).
//      기본 켬. 끄면 V-235 동작(빈 칸 __GEARLINE 색·낀 칸 레어도 색이되 대비가 약함).
if (globalThis.__GEARCOLOR === undefined) globalThis.__GEARCOLOR = true;
// ★ 시체 도둑 — 바닥 시체를 먹어 없앤다(이 게임의 자원을 뺏는 첫 적). 재미 판정: «먹어 없앰»을 골랐다 —
//   되살리면 잡을 때 시체가 도로 생겨 자원이 결국 돌아오지만, 먹어 없애면 「서둘러 써라」는 압박이 곧고 세다(NOW.md 의 결).
//   대신 도둑을 잡으면 삼킨 넋이 시체로 돌아온다(THIEF_BACK) — 그게 도둑을 «먼저 잡을» 이유(처치 보상)다.
const THIEF_SENSE = 540;     // 시체를 느끼는 반경(월드)
const THIEF_EAT_REACH = 40;  // 이 안에 들면 삼킨다
const THIEF_HEAL = 0.5;      // 한 구 삼킬 때 자기 최대 생명의 이만큼 회복(먼저 잡을 이유)
const THIEF_EAT_CD = 0.8;    // 연달아 삼키는 사이 간격(초) — 연출이 겹치지 않게
const THIEF_SPD_MUL = 1.15;  // 시체로 달려갈 때 속도(굶주림)
const THIEF_BACK = 2;        // 도둑을 잡으면 시체로 돌아오는 넋 수
const PWALL_LIFE = 10.0;   // V-232 — 사람이 세운 뼈벽 유지 시간(초). 뼈 왕 우리(CAGE_LIFE)와 다르다.
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
const BONES2_DRAW = 0.78;   // V-241 — 서 있는 해골 소품(bones2)을 그릴 때 키 배율. PROP_H 88~104 ×0.78 = 69~81 ≈ 사람 키 75(발자국·RNG 는 안 건드림)
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
const CAGE_R = 150, CAGE_SEG = 18, CAGE_LIFE = 6.0;   // 뼈 왕 — 우리 반경·뼈 토막 수(V-244 ②b 11→18 촘촘히)·유지 시간(초)
// ── V-246 ① 정예 수식어(접두) — 팩마다 다른 놈(D2 정예 접두처럼 «한 판 한 판이 갈리는 이유»). ──
//   전부 «규칙»(%증가 아님)이라 만날 때마다 노는 법이 갈린다. genFloor 밖(fresh)에서 「층 씨앗」
//   산술 PRNG 로 굴려 전역 Math.random 을 한 톨도 안 갉는다 → genFloor 지문 불변(V-242 결).
//   __AFFIX=false 로 끄면 굴림을 통째로 건너뛰어 옛 정예와 byte-동일.
const AFFIX = {
  fire:   { name: "불꽃 두른",  col: "#ff7a3c" },   // 곁(반경 90)에 서면 초당 화상 피해 · 발밑 붉은 고리
  bolt:   { name: "번개 튀는",  col: "#7fd8ff" },   // 죽을 때 십자 번개 넷(경고 0.4s 뒤 발사)
  swift:  { name: "날랜",       col: "#b6f06a" },   // 이동 1.5배·공격 간격 0.7배 · 발이 남는 잔상
  revive: { name: "되살아나는", col: "#e8cf52" },   // 처음 죽으면 40% 체력으로 한 번 일어남(이름표에 † 표식)
  shell:  { name: "뼈 껍질",    col: "#e6e0cc" },   // 소환수 피해 60% 막음(직접 때려야 함)
};
const AFFIX_KEYS = ["fire", "bolt", "swift", "revive", "shell"];
const AFFIX_BURN_R = 90;                               // 화상 곁 반경
const AFFIX_BURN_DPS = () => 14 + (G ? G.floor : 1) * 2;   // 초당 화상 피해(층에 조금 비례) — dotPlayer 로 iframe 밖에서 tick
const AFFIX_BOLT_LEN = 220, AFFIX_BOLT_HALF = 26;     // 십자 번개 길이·반폭 · 경고 0.4s
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
const GOLEM = { need: 3, cost: 40, scale: 1.9, slot: 2, hpMul: 4.0, dmgMul: 2.6, spdMul: 0.6, atkMul: 1.5, cleave: 76, ring: 5.0, ringCol: "#8fd0ff", shake: 7, label: "뼈 골렘", filt: "brightness(0.8) saturate(1.6) sepia(0.5) hue-rotate(-16deg)" };
// ── V-240 군세 갈래 — 「해골 하나」를 셋으로 벌린다. 해골=고르게 · 구울=싸고 빠르고 물러 터지고 피를 빤다 · 골렘=느리고 두껍고 «도발»로 몸빵. ──
// ★ 값은 재서 정했다(커밋글에 근거): 구울은 «떼로 붙는 소모품». 시체 2구·마나 25(해골 0 보다 조금 비싸고 골렘 40 보다 쌈)·자리 1칸.
//   hp 0.45배(물러 터짐)·spd 1.5배(빨리 붙음)·dmg 0.55배지만 atkCd 0.30s(0.6×0.5·짧은 연타)라 초당 피해는 해골의 ~1.0배 근처.
//   피 빨기 drain 0.35: 준 피해의 35%를 제 hp 로, 제 hp 가 꽉 차면 남는 만큼 주인(p) 회복(앞에서 싸우다 죽어도 나를 살린다).
const GHOUL = { need: 2, cost: 25, scale: 0.82, slot: 1, hpMul: 0.45, dmgMul: 0.55, spdMul: 1.5, atkMul: 0.5, cleave: 0, ring: 2.2, ringCol: "#5fe08a", shake: 0, label: "구울", drain: 0.35 };
// 골렘의 «수법»(SKEL_BASE 에 filt 만 입힌 「센 해골」을 그만둔다): 도발(주변 반경 안 적의 표적을 자기로 끈다·주기)·몸으로 막음(밀어내기).
const GOLEM_TAUNT_CD = 3.5;     // 도발 재사용(초)
const GOLEM_TAUNT_DUR = 2.0;    // 한 번 도발이 붙어 있는 시간(초) — 이 동안 반경 안 적은 골렘을 문다
const GOLEM_TAUNT_R = 240;      // 도발 반경
const GOLEM_BLOCK_PAD = 4;      // 몸으로 막는 여유 — 적을 (골렘r+적r+이만큼) 밖으로 민다(딱 닿는 자리라 도발에 걸린 적은 골렘을 때릴 수 있다)
// 갈래별 물들임 — teamTintOn() 이 켜 있으면 소환수는 본디 ALLY_TINT(푸름) 하나로 물든다. 구울/골렘은 그 위로 덮어써 «눈에 갈리게».
const GHOUL_TINT = "sepia(1) saturate(2.4) hue-rotate(52deg) brightness(1.06) contrast(1.05)";   // 병색 초록(작고 빠른 것)
const GOLEM_TINT = "grayscale(0.7) sepia(0.62) hue-rotate(-14deg) saturate(1.5) brightness(0.66) contrast(1.34)"; // V-245 ②d 어두운 흙·돌빛(따뜻한 갈색조 — 해골의 푸른 상아와 색조가 갈린다)
const GOLEM_DRAW_BULK = 1.16;   // V-245 ②d — 골렘은 데이터 크기(1.9×)에 더해 그리기만 이만큼 더 부풀려 «느리고 두꺼운 것»으로 읽히게(해골과 실루엣 갈림). 발밑·충돌은 안 건드림.
// ── V-242 ② 시체 쓰는 길 둘 더 — 화장(M·시체→마나) · 제물(U·시체→주인 약화). __CORPSEUSE=false 로 둘 다 끈다. ──
// 시체는 자원인데 쓸 곳이 소환·폭발·뼈벽·먹이·골렘·구울 여섯뿐이었다. 둘을 더해 시체를 두고 다투게 한다(모자라야 고르는 맛).
const BURN_N = 2, BURN_MANA = 34;                    // 화장: 곁의 시체 최대 2구를 태워 구당 마나 +34(소환·폭발이 먹을 시체를 마나로 돌린다)
const HEX_N = 3, HEX_DUR = 6.0, HEX_DMG = 0.6, HEX_VULN = 1.35, HEX_RANGE = 520;   // 제물: 곁 주인 있을 때 시체 3구로 6초간 주인 피해 −40%·받는 피해 +35%
// ── V-235 물약(소모품) · 벨트 1~4 ──────────────────────────────────────────
// 두 종: 생명(붉은)·마나(푸른). 회복량은 최대치의 «비율»이라 층·레벨이 오르면 등급이 저절로 오른다
//   (생명 maxhp×0.35 · 마나 maxmana×0.40, 즉효). 벨트 네 칸, 칸마다 한 종이 쌓인다(칸당 상한 9).
//   드랍: 처치 시 낮은 확률(잡몹 0.09 · 정예 0.22). 제단(다 쓴 것 포함)에서 금으로도 산다(P·여러 번).
//   되돌림 __POTION=false → 옛 판(1·2·3 소환 등급 · X 등급 해금 · 드랍/벨트 없음).
const POTION = { hp: { frac: 0.35, col: "#d0362e", glow: "#ff6a5a", name: "생명 물약" },
                 mp: { frac: 0.40, col: "#2f6ad0", glow: "#5aa0ff", name: "마나 물약" } };
const POTION_DROP = 0.09, POTION_DROP_ELITE = 0.22, BELT_MAX = 9;

// ── V-236 보석 네 종 × 등급 셋 — 소켓에 박아 스탯을 올린다(디아 결). __GEM=false 면 드랍·주머니·구입·박기 다 꺼진다. ──
// 종별 옵션은 loot.js 의 AFFIX 키에 얹는다: 루비→피해% · 사파이어→최대 생명 · 토파즈→금 획득% · 에메랄드→소환수 피해%.
// 등급 셋의 값(재서 정함): 아래 GEM_VAL 이 [흠집난, 보통, 완벽] 순. 사파이어만 flat, 나머지는 %.
const GEM_TYPES = {
  ruby:     { name: "루비",     col: "#e0442f", key: "dmg",       pct: true,  label: "피해" },
  sapphire: { name: "사파이어", col: "#4a86e6", key: "maxHp",     pct: false, label: "최대 생명" },
  topaz:    { name: "토파즈",   col: "#e0b83a", key: "gold",      pct: true,  label: "금 획득" },
  emerald:  { name: "에메랄드", col: "#3fbf6a", key: "minionDmg", pct: true,  label: "소환수 피해" },
};
const GEM_GRADES = ["흠집난", "보통", "완벽"];
const GEM_VAL = { ruby: [6, 12, 20], sapphire: [40, 90, 200], topaz: [8, 16, 28], emerald: [7, 15, 26] };
const GEM_KEYS = Object.keys(GEM_TYPES);
const GEM_DROP = 0.05, GEM_DROP_ELITE = 0.14;
function gemVal(type, grade) { return GEM_VAL[type][grade]; }
function makeGem(type, grade) { return { type, grade, aff: { key: GEM_TYPES[type].key, value: gemVal(type, grade) } }; }
// 등급은 층이 오를수록 높은 게 잘 나온다(값 재서 정함): 완벽 0.03+0.02·(층-1)(0.5 상한), 보통 0.12+0.02·(층-1)(0.45 상한).
function rollGemGrade(floor) {
  const r = Math.random();
  const perfect = Math.min(0.5, 0.03 + 0.02 * (floor - 1));
  const normal = Math.min(0.45, 0.12 + 0.02 * (floor - 1));
  if (r < perfect) return 2;
  if (r < perfect + normal) return 1;
  return 0;
}
let selectedGem = null;   // 주머니에서 고른 보석 { type, grade } — 소켓 장비를 누르면 박힌다

// ── V-238 마을·상인 — 안전 지대에서 팔고 사고 낀다(핵앤슬래시 한 바퀴의 «마을 절반»). ──
// __TOWN=false 면 N 귀환·마을이 통째로 꺼진다(옛 판과 byte-동일). __MERCHANT=false 면 상인·상점창이 꺼진다.
// 값·비율은 재서 정함(커밋글): 귀환 시전 1.4s·안전반경 460 · 팔기 30% · 장물 재고 6~8칸 매 방문 재굴림 · 살 때 ×1.25.
const TOWN_CAST = 1.4, TOWN_SAFE_R = 460;
const SELL_FRAC = 0.30, BUY_MARKUP = 1.25, FENCE_MIN = 6, FENCE_MAX = 8;
let shopOpen = false, shopMerchant = null;
const townOn = () => globalThis.__TOWN !== false;
const merchOn = () => globalThis.__MERCHANT !== false;
// ── V-239 ① 회차(승천) — 마을 승천 제단에서 처음부터 다시 시작하고 영구 배수를 쌓는다. ──
// 문턱 20층(재서 정함): V-238 테스트가 몇 분에 6층·PLAN 이 20분에 48층이라 20층은 «한 번의 판»에
//   닿는 진짜 이정표다. deepest 는 승천 때 0 으로 되감아 다음 회차는 다시 내려가야 문턱이 열린다.
// 되돌림: __ASCEND=false → 제단 상호작용·패널이 꺼진다(회차 안 생김 → ascMul 늘 1 → genFloor 지문 동일).
const ASCEND_FLOOR = 20;
const ascendOn = () => globalThis.__ASCEND !== false;

// ── V-241 유니크(규칙형) · 일지(도전 과제) ─────────────────────────────────────
// 되돌림: __UNIQUE=false → rollMythic 이 null(안 떨어짐) · uniques.has(key) 는 늘 false → 규칙 안 켜짐.
//         __JOURNAL=false → 목표 안 세고 보상 안 얹고 L 판 안 열림. 둘 다 genFloor 는 안 건드림.
const uniqueOn = () => globalThis.__UNIQUE !== false;
const journalOn = () => globalThis.__JOURNAL !== false;
const MYTHIC_BOSS_CHANCE = 0.35, MYTHIC_CHEST_CHANCE = 0.15, MYTHIC_CHEST_FLOOR = 8;
const CORPSE_MANA = 6;           // corpseMana — 적 처치당 스미는 마나
const BONEBURST_R = 130;         // boneBurst — 소환수 사망 파편 반경
const BLOOD_PER_MANA = 2;        // bloodCast — 모자란 마나 1당 피 2

// 일지 상태는 판·회차·죽음·새로고침을 넘어 남는다(localStorage). 저장은 도전 진행뿐 — genFloor RNG 는 안 건드림.
const JKEY = "necro_journal_v1";
function loadJournal() {
  try { const j = JSON.parse(localStorage.getItem(JKEY)); if (j && j.done) return { done: j.done || {}, stats: j.stats || {}, slots: j.slots || 0, minionPct: j.minionPct || 0 }; } catch (e) {}
  return { done: {}, stats: {}, slots: 0, minionPct: 0 };
}
let JOURNAL = loadJournal();
function saveJournal() { try { localStorage.setItem(JKEY, JSON.stringify(JOURNAL)); } catch (e) {} }
function journalStat(name, n = 1) { if (!journalOn()) return; JOURNAL.stats[name] = (JOURNAL.stats[name] || 0) + n; saveJournal(); }
const deepestSoFar = () => Math.max(G.deepest || 0, G.floor || 0);
const GOALS = [
  { id: "f5", name: "5층에 내려서다", val: deepestSoFar, need: 5, rew: { gold: 200 } },
  { id: "f10", name: "10층에 내려서다", val: deepestSoFar, need: 10, rew: { slot: 1 } },
  { id: "f20", name: "20층에 내려서다", val: deepestSoFar, need: 20, rew: { slot: 1 } },
  { id: "k200", name: "200 처치", val: () => G.kills, need: 200, rew: { gold: 400 } },
  { id: "e25", name: "엘리트 25 처치", val: () => JOURNAL.stats.elite || 0, need: 25, rew: { minion: 10 } },
  { id: "asc1", name: "승천 1회", val: () => G.ascension || 0, need: 1, rew: { slot: 1 } },
  { id: "gh20", name: "구울 20 소환", val: () => JOURNAL.stats.ghoul || 0, need: 20, rew: { minion: 10 } },
  { id: "go5", name: "뼈 골렘 5 소환", val: () => JOURNAL.stats.golem || 0, need: 5, rew: { gold: 400 } },
  { id: "uniq", name: "유니크 하나 줍다", val: () => JOURNAL.stats.mythic || 0, need: 1, rew: { minion: 10 } },
  { id: "gold9", name: "금 9000 모으다", val: () => G.gold, need: 9000, rew: { slot: 1 } },
];
function rewText(r) { return r.slot ? `자리 +${r.slot}` : r.minion ? `소환수 +${r.minion}%` : `금 +${r.gold}`; }
function applyReward(r) {
  if (r.slot) JOURNAL.slots += r.slot;
  if (r.minion) JOURNAL.minionPct += r.minion;
  if (r.gold) G.gold += r.gold;
  recalc();
}
function journalCheck() {
  if (!journalOn()) return;
  for (const g of GOALS) {
    if (JOURNAL.done[g.id]) continue;
    if (g.val() >= g.need) {
      JOURNAL.done[g.id] = true; applyReward(g.rew); saveJournal();
      floatNote(foldNums(`일지 달성 — ${g.name}  (${rewText(g.rew)})`), "#e8cf52", 2.4, { sz: 13, note: true });
      flash = Math.max(flash, 0.18); flashColor = "232,207,82";
    }
  }
}

// ── V-243 ① 오프라인 진행 — 껐다 켜면 나갔던 시간만큼 정산해 준다(상한 8h·효율 50%·깊이 비례). ──
//   저장은 «마지막 시각·가장 깊었던 층·금»뿐 — genFloor RNG 는 안 건드린다. __OFFLINE=false 로 끈다.
//   값(재서 못박음): 분당 = 깊이 × 효율(0.5) × {금 0.5 · 시체 0.02 · 경험 0.8}. 상한 480분(8h). 음수(시계 되돌림)→0.
const OKEY = "necro_offline_v1";
const OFF_CAP_MIN = 480, OFF_EFF = 0.5;
const OFF_GOLD_PM = 0.5, OFF_CORPSE_PM = 0.02, OFF_XP_PM = 0.8;
const offlineOn = () => globalThis.__OFFLINE !== false;
function loadOffline() { try { return JSON.parse(localStorage.getItem(OKEY)); } catch (e) { return null; } }
function saveOffline() {
  if (!offlineOn() || !window.G) return;
  try { localStorage.setItem(OKEY, JSON.stringify({ t: Date.now(), deepest: deepestSoFar(), gold: G.gold | 0 })); } catch (e) {}
}
// 정산 셈 — 지난 시각(ms)·깊이로부터 {분·상한여부·되돌림여부·금·시체·경험}. 순수 함수(컷·자가 곧장 잰다).
function computeOffline(elapsedMs, deepest) {
  const rawMin = Math.floor((elapsedMs || 0) / 60000);
  const mins = Math.max(0, Math.min(OFF_CAP_MIN, rawMin));   // 음수→0 · 상한 480
  const f = mins * Math.max(1, deepest | 0) * OFF_EFF;
  return { mins, elapsedMin: Math.max(0, rawMin), capped: rawMin > OFF_CAP_MIN, neg: rawMin < 0,
    gold: Math.floor(f * OFF_GOLD_PM), corpses: Math.floor(f * OFF_CORPSE_PM), xp: Math.floor(f * OFF_XP_PM) };
}
function applyOffline(r) {
  G.gold += r.gold; G.xp += r.xp;
  const p = G.player;   // 시체는 사람 곁에 실제로 깔아 준다(곧장 자원으로 쓰게) — genFloor 뒤라 지문 불변
  for (let i = 0; i < r.corpses; i++)
    G.corpses.push({ x: p.x - 130 + (i % 10) * 28, y: p.y + 46 + Math.floor(i / 10) * 24, base: "mob/skelarch", dir: "s", h: 78, used: false, t: 0 });
}
function showOfflineModal(r, deepest) {
  const root = el("offline"); if (!root) return;
  const em = (r.elapsedMin != null ? r.elapsedMin : r.mins);   // V-244 ③ — 실제로 흐른 시간(상한에 안 깎인 값)을 적는다.
  const eh = Math.floor(em / 60), emm = em % 60;
  const tstr = eh > 0 ? `${eh}시간 ${emm}분` : `${emm}분`;
  let h = `<div class="asctitle">돌아왔다</div>`;
  h += `<div class="ascsub">그동안 <b>${tstr}</b> 이 흘렀다${r.capped ? ` <span class="offcap">· 상한 8시간까지만 쌓임</span>` : ``}.</div>`;
  h += `<div class="ascsub2">가장 깊었던 <b>B${Math.max(1, deepest | 0)}층</b> 기준 · 효율 ${(OFF_EFF * 100) | 0}%</div>`;
  h += `<div class="offrows">` +
    `<div class="offrow"><span class="offk">금</span><span class="offv">+${fmtNum(r.gold)}</span></div>` +
    `<div class="offrow"><span class="offk">시체</span><span class="offv">+${fmtNum(r.corpses)}</span></div>` +
    `<div class="offrow"><span class="offk">경험</span><span class="offv">+${fmtNum(r.xp)}</span></div>` +
    `</div>`;
  h += `<div class="offbtnwrap"><button class="offbtn" onclick="window.__offClose()">받 기</button></div>`;
  root.innerHTML = h; root.classList.add("on"); offOpen = true;
}
let offOpen = false;
function settleOffline() {
  if (!offlineOn()) return;
  try { settleOfflineInner(); } catch (e) {}
}
function settleOfflineInner() {
  const s = loadOffline();
  if (!s || typeof s.t !== "number") { saveOffline(); return; }   // 첫 실행 — 정산 없이 시각만 남긴다
  const deepest = s.deepest || 0;
  const r = computeOffline(Date.now() - s.t, deepest);
  saveOffline();   // 새 시각으로 갱신(정산은 한 번만)
  if (r.mins <= 0 || (r.gold <= 0 && r.corpses <= 0 && r.xp <= 0)) return;   // 줄 게 없으면 창 안 띄움
  applyOffline(r); recalc();
  showOfflineModal(r, deepest);
}

// 마나 값 치르기 — bloodCast 유니크면 모자란 만큼 피로 낸다(값은 늘 치러진다). 없으면 옛대로 마나만.
function canPay(cost) {
  const p = G.player;
  if (p.mana >= cost) return true;
  return p.uniques.has("bloodCast") && p.hp > (cost - p.mana) * BLOOD_PER_MANA + 1;
}
function payMana(cost) {
  const p = G.player;
  if (p.mana >= cost) { p.mana -= cost; return; }
  if (p.uniques.has("bloodCast")) {
    const hpCost = (cost - p.mana) * BLOOD_PER_MANA;
    p.mana = 0; p.hp -= hpCost; p.hurt = Math.max(p.hurt || 0, 0.1);
    for (let i = 0; i < 6; i++) burst(p.x, p.y - 40, "#c0303a", 100);
  } else { p.mana = Math.max(0, p.mana - cost); }
}
const ASC_BUFF = {
  dmg:    { name: "핏빛 각인", desc: "피해 +25%", col: "#e06b4a" },
  minion: { name: "뼈 군세",  desc: "소환 자리 +1 · 소환수 피해 +20%", col: "#6fd0a8" },
  gold:   { name: "탐욕의 손", desc: "금 +35% · 드랍 운 ↑", col: "#e8cf52" },
};
let ascOpen = false;
const RARITY_BASE = { white: 8, blue: 30, yellow: 90, gold: 260 };
function itemValue(it) {
  if (!it) return 0;
  let v = RARITY_BASE[it.rarity && it.rarity.key] || 8;
  for (const a of (it.affixes || [])) v += a.value * 2;
  if (it.sockets) for (const g of it.sockets) v += g ? gemVal(g.type, g.grade) + 20 : 12;
  return Math.round(v);
}
function buyPrice(it) { return Math.round(itemValue(it) * BUY_MARKUP); }
function sellPrice(it) { return Math.max(1, Math.round(itemValue(it) * SELL_FRAC)); }
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
// V-242 ① 컷용 — 이 층 주인을 지정한 kind 로 바꿔 세운다(넷을 한 판에서 하나씩 찍으려는 것·측정 자가 아니다).
window.__setBossKind = (k) => {
  const NM = ["뼈 왕", "역병 주술사", "무덤 도살자", "저주받은 사제"], SZ = [1.12, 0.98, 1.20, 1.06];
  for (const pk of G.packs) for (const m of pk.enemies) if (m.boss) { m.bossKind = k; m.name = NM[k]; m.cast = null; m.skillCd = 0; }
  return window.__bossPose();
};
// ── V-231 컷용 — 잡몹 수법의 «예고 뜬 순간»으로 세운다("charge"|"bomb"). 없으면 null(그 층에 그 잡몹이 없음). ──
window.__mobPose = (what) => {
  const p = G.player;
  let best = null, bpk = null, bd = Infinity;
  for (const pk of G.packs) for (const m of pk.enemies) {
    if (!m.alive || (what === "bomb" ? !m.bomber : !m.charger)) continue;
    const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
    if (d < bd) { bd = d; best = m; bpk = pk; }
  }
  if (!best) return null;
  bpk.awake = true;
  best.x = p.x + 150; best.y = p.y; unstick(best, best.r);
  best.stun = 0; best.kb.x = 0; best.kb.y = 0;
  if (what === "bomb") { best.fuse = BOMB_FUSE * 0.5; best.state = "attack"; }
  else { best.dx = -1; best.dy = 0; best.chargeCd = 0; best.charging = 0; best.tele = CHARGE_TELE * 0.5; best.state = "attack"; }
  cam.x = (best.x + p.x) / 2 - VW / (2 * Z); cam.y = best.y - VH / (2 * Z);
  return { x: best.x, y: best.y, what };
};
// ── V-232 컷용 — 시체를 쓰는 두 길을 «쓴 순간»으로 세운다("wall"|"feed"). 측정 자가 아니다. ──
window.__skillPose = (what) => {
  const p = G.player;
  if (what === "wall") {
    const wx = p.x + 200, wy = p.y;
    G.bones = G.bones.filter((b) => !b.foe);
    for (let i = 0; i < 3; i++)
      G.corpses.push({ x: wx - 30 + i * 24, y: wy + 26 + i * 10, base: "mob/skelarch", dir: "s", h: 82, used: false, t: 0 });
    cam.x = p.x - VW / (2 * Z); cam.y = p.y - VH / (2 * Z);
    mouse.x = (wx - cam.x) * Z; mouse.y = (wy - cam.y) * Z;
    p.mana = p.maxmana;
    corpseWall();
    const pk = G.packs.find((k) => k.enemies.some((e) => e.alive));
    if (pk) {
      pk.awake = true;
      const m = pk.enemies.find((e) => e.alive);
      m.x = wx + 40; m.y = wy; m.state = "walk"; m.dx = -1; m.dy = 0; m.stun = 0; m.kb.x = 0; m.kb.y = 0; unstick(m, m.r);
    }
    cam.x = (p.x + wx) / 2 - VW / (2 * Z); cam.y = wy - VH / (2 * Z);
    return { x: wx, y: wy, what };
  }
  if (what === "golem") {
    const gx = p.x + 120, gy = p.y + 10;
    G.minions.length = 0;
    for (let i = 0; i < GOLEM.need; i++)
      G.corpses.push({ x: gx - 40 + i * 20, y: gy + 20 + (i % 2) * 14, base: "mob/skelarch", dir: "s", h: 82, used: false, t: 0 });
    p.mana = p.maxmana;
    raiseGolem();
    G.minions.push({ base: SKEL_BASE, x: p.x - 96, y: gy, hp: 200, maxhp: 200, dmg: 34, spd: 250, atkCd: 0.6,
      r: 15, h: SKEL_H, tier: 0, slot: 1, cleave: 0, ring: 2.5, ringCol: "#3d78c8", shake: 0, filt: null,
      dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1, feed: 0 });
    cam.x = (p.x + gx) / 2 - VW / (2 * Z); cam.y = gy - VH / (2 * Z);
    return { x: gx, y: gy, what };
  }
  const proto = { base: SKEL_BASE, hp: 400, maxhp: 400, dmg: 50, spd: 250, atkCd: 0.6, r: 15, h: SKEL_H,
    tier: 0, slot: 1, cleave: 0, ring: 2.5, ringCol: "#3d78c8", shake: 0, filt: null,
    dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1, feed: 0 };
  const fed = { ...proto, x: p.x + 70, y: p.y + 30 };
  const plain = { ...proto, x: p.x - 70, y: p.y + 30 };
  G.minions.length = 0; G.minions.push(fed, plain);
  for (let i = 0; i < 5; i++) {
    const f = (fed.feed += 1);
    fed.dmg *= (1 + 0.20 * f) / (1 + 0.20 * (f - 1));
    fed.maxhp *= (1 + 0.15 * f) / (1 + 0.15 * (f - 1));
  }
  fed.hp = fed.maxhp;
  cam.x = p.x - VW / (2 * Z); cam.y = (p.y + 30) - VH / (2 * Z);
  return { x: p.x, y: p.y + 30, what };
};
// ── V-234 컷용 — 제단 하나를 사람 곁(반경 70 안)에 세우고 금·카메라를 맞춘다("blood"|"bone"|"ash"). 자 파일이 아니다. ──
window.__altarPose = (kind) => {
  const p = G.player;
  const ax = p.x + 110, ay = p.y + 6;
  G.altars = [{ x: ax, y: ay, r: 26, used: false, kind: kind || "blood" }];
  p.x = ax - 58; unstick(p, p.r);   // 반경 70 안 → 이름표가 뜬다
  G.gold = 5000;
  cam.x = (p.x + ax) / 2 - VW / (2 * Z); cam.y = ay - VH / (2 * Z);
  mouse.x = (ax - cam.x) * Z; mouse.y = (ay - cam.y) * Z;
  return { x: ax, y: ay, kind: kind || "blood", gold: G.gold, maxhp: G.player.maxhp, slots: slotCap() };
};
// ── V-237 컷용 — 갈래를 한 화면에 세우고(눈으로 갈림), 도둑이 시체를 먹는 전/후를 만든다. 자 파일이 아니다. ──
function poseMob(kind, x, y, extra) {
  return Object.assign({ id: (9000 + Math.random() * 1000) | 0, base: "mob/fallen", x, y, hp: 400, maxhp: 400,
    dmg: 12, spd: 160, h: 70, r: 18, gold: [4, 9], dx: -1, dy: 0, elite: false, alive: true, anim: 0, tb: 0,
    state: "idle", atk: 0, hit: 0, kb: { x: 0, y: 0 }, mobKind: kind }, extra || {});
}
window.__kindsPose = () => {
  const p = G.player;
  const cx = p.x, cy = p.y - 30;
  const shooter = poseMob("shoot", cx - 210, cy, { ranged: true, base: "mob/skelarch", h: 66, shootCd: 999 });
  const charger = poseMob("charge", cx, cy, { charger: true, base: "mob/brute", h: 82, r: 20, chargeCd: 999 });
  const thief = poseMob("thief", cx + 210, cy, { thief: true, base: "mob/shaman", h: 72, eatCd: 999 });
  G.packs = [{ x: cx, y: cy, awake: true, room: 0, enemies: [shooter, charger, thief] }];
  p.x = cx; p.y = cy + 210; unstick(p, p.r);   // 사람은 갈래 줄 아래로 물러 세운다(겹치지 않게·돌진 예고선 안 생기게)
  cam.x = cx - VW / (2 * Z); cam.y = cy - VH / (2 * Z) + 80;
  return { kinds: ["shoot", "charge", "thief"] };
};
window.__chargeTellPose = () => {
  const p = G.player;
  const m = poseMob("charge", p.x + 230, p.y, { charger: true, base: "mob/brute", h: 82, r: 20, state: "attack", dx: -1, dy: 0, tele: CHARGE_TELE * 0.6, charging: 0, chargeCd: 0 });
  G.packs = [{ x: p.x, y: p.y, awake: true, room: 0, enemies: [m] }];
  cam.x = (m.x + p.x) / 2 - VW / (2 * Z); cam.y = p.y - VH / (2 * Z);
  return { x: m.x, y: m.y, tele: m.tele };
};
window.__thiefPose = (n = 6) => {
  const p = G.player;
  const tx = p.x + 40, ty = p.y + 30;
  G.corpses = [];
  for (let i = 0; i < n; i++) G.corpses.push({ x: tx + 70 + (i % 3) * 48, y: ty + Math.floor(i / 3) * 42, base: "mob/skelarch", dir: "s", h: 80, used: false, t: 0 });
  const m = poseMob("thief", tx, ty, { thief: true, base: "mob/shaman", h: 72, hp: 99999, maxhp: 99999, spd: 240, state: "walk", dx: 1, dy: 0, eatCd: 0 });
  G.packs = [{ x: tx, y: ty, awake: true, room: 0, enemies: [m] }];
  p.x = tx - 280; p.y = ty; unstick(p, p.r);
  cam.x = tx - VW / (2 * Z) + 30; cam.y = ty - VH / (2 * Z);
  return { corpses: G.corpses.length };
};
window.__corpseN = () => G.corpses.length;

function fresh(floor, carry, town) {
  const f = town ? genTown() : genFloor(floor);
  if (!town) assignAffixes(f, floor);   // V-246 ① genFloor 뒤·전역 Math.random 밖에서 정예 수식어를 굴린다(지문 불변)
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
    altarHpMul: 1, altarSlots: 0,
    belt: [null, null, null, null],
    gems: [],
  };
  p.x = f.startX; p.y = f.startY; p.dx = 0; p.dy = 1; p.anim = 0; p.state = "idle";
  p.spearCd = 0; p.hurt = 0; p.iframe = 0; p.r = PLAYER_R;
  return {
    floor, ...f, player: p,
    minions: carry ? carry.minions.map((m) => ({ ...m, x: f.startX + (Math.random() * 80 - 40), y: f.startY + (Math.random() * 80 - 40) })) : [],
    spears: [], golds: [], items: [], potions: [], corpses: [], parts: [], floats: [], booms: [], hits: [], foeShots: [],
    hazards: [], bones: [], bossBanner: null, floorGems: [], bolts: [],
    pickLog: carry ? carry.pickLog : [], kills: carry ? carry.kills : 0, picks: carry ? carry.picks : 0,
    gold: carry ? carry.gold : 0, xp: carry ? carry.xp : 0,
    dead: false, cleared: 0, packsTotal: f.packs.length,
    town: !!town, merchants: f.merchants || [],
    deepest: Math.max((carry && carry.deepest) || 0, floor),
    returnFloor: town ? floor : ((carry && carry.returnFloor) || 0),
    ascension: (carry && carry.ascension) || 0,
    ascBuffs: (carry && carry.ascBuffs) || { dmg: 0, minion: 0, gold: 0 },
    ascendSpot: f.ascendSpot || null,
  };
}

function start(floor, carry, town) {
  globalThis.__asc = (carry && carry.ascension) || 0;   // V-239 — genFloor 가 회차 배수를 읽기 전에 심는다
  if (globalThis.__BOSSKIND !== false && floor === 1) seedBossRun(Date.now());   // V-242 ① 새 판(1층 진입)마다 주인 순서를 새로 굴린다. Date.now 는 공유 RNG 를 안 건드림 → 지문 불변.
  G = fresh(floor, carry, town);
  G.blockProps = G.props.filter((pr) => BLOCK_IMGS.has(pr.img));
  window.G = G; window.cam = cam; window.HSZ = Z; window.SKEL_TIERS = SKEL_TIERS;
  window.recalc = recalc;   // 검수기가 «실제 문»으로 스탯을 다시 세우게 (V-182b)
  window.toggleChar = toggleChar;   // 검수기가 창을 열게(찍기는 창의 + 단추 실클릭으로)
  window.spendAttr = spendAttr; window.spendSkill = spendSkill;   // V-226 자가 «번 점수»를 실제 문으로 쓰게
  window.__walkable = (x, y, r = PLAYER_R) => walkable(x, y, r);   // V-201 자가 «실제 문»으로 재게
  window.__blockers = () => G.blockProps.map((pr) => ({ x: pr.x, y: pr.y, r: propBlockR(pr) }));
  window.__buyAltar = buyAltar;   // V-234 컷용 — 「샀다」 상태를 실제 문으로 만든다(자가 아니다)
  window.__giveBelt = (arr) => { for (let i = 0; i < 4; i++) G.player.belt[i] = arr[i] ? { kind: arr[i].kind, n: arr[i].n } : null; };
  window.__spendAltar = (i) => { if (G.altars[i]) G.altars[i].used = true; };
  window.__dropPotion = (kind, dx = 30) => dropPotion(G.player.x + dx, G.player.y, kind);
  window.__drinkPotion = drinkPotion; window.__buyPotion = buyPotion;
  window.__giveGear = () => { const q = G.player; for (const s of SLOT_ORDER) { const it = rollItem(G.floor, true); it.slot = s; q.equipped[s] = it; } recalc(); };
  window.__giveGem = (type, grade = 0, n = 1) => { for (let i = 0; i < (n || 1); i++) G.player.gems.push(makeGem(type, grade)); if (invOpen) renderInv(); };
  window.__dropGem = (type, grade = 1, dx = 30) => G.floorGems.push({ x: G.player.x + dx, y: G.player.y, vx: 0, vy: 0, type, grade, t: 1 });
  window.__buyGem = buyGem;
  window.__tipFor = (it, x = 40, y = 110) => { const t = el("tooltip"); if (!it) { t.style.display = "none"; return; } t.innerHTML = tooltipHTML(it); t.style.display = "block"; t.style.left = x + "px"; t.style.top = y + "px"; };
  window.__giveSocketed = (slot, n = 2) => { const it = rollItem(G.floor, true); it.slot = slot; it.sockets = new Array(n).fill(null); G.player.equipped[slot] = it; recalc(); return it; };
  window.__socketInto = (slot, type, grade = 0) => { const it = G.player.equipped[slot]; if (!it) return null; if (!it.sockets || !it.sockets.length) it.sockets = [null]; G.player.gems.push(makeGem(type, grade)); selectedGem = { type, grade }; socketGem(it); return { dmgMul: G.player.dmgMul, maxhp: G.player.maxhp, gear: G.player.gear }; };
  const p = G.player;
  unstick(p, p.r);
  for (const m of G.minions) unstick(m, m.r || 15);
  cam.x = p.x - VW / (2 * Z); cam.y = p.y - VH / (2 * Z);
  recalc();
  document.getElementById("dead").style.display = "none";
  if (shopOpen) closeShop();   // V-238 — 층을 옮기면 상점창을 닫는다
  p.townCast = 0;
  window.__townReturn = tryTownReturn; window.__goTown = goTown;   // 컷·자용 실제 문
  window.__openShop = (kind) => { const mc = (G.merchants || []).find((m) => m.kind === kind); if (mc) { if (mc.kind === "fence" && !mc.stock) mc.stock = rollFenceStock(); shopMerchant = mc; shopOpen = true; el("shop").classList.add("on"); renderShop(); } };
  window.__sellJunk = sellJunk;
  window.__giveBagLoot = (n = 8) => { for (let i = 0; i < n; i++) G.player.bag.push(rollItem(G.deepest || G.floor, false)); if (invOpen) renderInv(); if (shopOpen) renderShop(); return G.player.bag.length; };
  window.__sellOne = () => { if (G.player.bag.length) sellBagItem(0); return G.player.bag.length; };
  window.__buyGemTown = buyGemTown; window.__buyPotionTown = buyPotionTown;
  window.__doStairs = tryStairs; window.__returnFromTown = returnFromTown;
  window.__tryAscend = tryAscend; window.__ascend = doAscend;
  window.__openAscend = () => { if (G.ascendSpot) { ascOpen = true; el("ascend").classList.add("on"); renderAscend(); } };
  window.__setDeepest = (n) => { G.deepest = n; };
  window.__offlineCalc = (ms, deepest) => computeOffline(ms, deepest);
  window.__offlineShow = (hoursAgo, deepest) => { const r = computeOffline(hoursAgo * 3600000, deepest); showOfflineModal(r, deepest); return r; };
  window.__offClose = () => { const root = el("offline"); if (root) { root.classList.remove("on"); root.innerHTML = ""; } offOpen = false; };
  window.__teleReach = (x, y, dx, dy, maxLen, r) => teleReach(x, y, dx, dy, maxLen, r);
  window.__toShrine = () => { if (G.ascendSpot) { G.player.x = G.ascendSpot.x; G.player.y = G.ascendSpot.y + 60; } };
  // V-240 컷·측정용 — 군세(해골·구울·골렘)를 세운다. 시체를 깔고 마나를 채워 실제 raise 함수를 부른다(자가 아니라 게임 함수 그대로).
  window.__armyPose = (opt) => {
    opt = opt || {}; const p = G.player;
    const nsk = opt.skel != null ? opt.skel : 3, ngh = opt.ghoul != null ? opt.ghoul : 3, ngo = opt.golem != null ? opt.golem : 1;
    G.minions.length = 0; G.corpses = [];
    const need = nsk + ngh * GHOUL.need + ngo * GOLEM.need + 8;
    for (let i = 0; i < need; i++) G.corpses.push({ x: p.x - 240 + (i % 9) * 56, y: p.y - 70 + Math.floor(i / 9) * 46, base: "mob/skelarch", dir: "s", h: 80, used: false, t: 0 });
    p.mana = 99999; p.grade = 0; p.maxGrade = 0; p.slots = 24;
    for (let i = 0; i < nsk; i++) raiseSkeleton();
    for (let i = 0; i < ngh; i++) raiseGhoul();
    for (let i = 0; i < ngo; i++) raiseGolem();
    return armyCounts();
  };
  window.__foePack = (n, cx, cy, extra) => {
    const en = [];
    for (let i = 0; i < n; i++) en.push(poseMob((extra && extra.mobKind) || "", cx - 90 + (i % 5) * 46, cy - 40 + Math.floor(i / 5) * 46, Object.assign({ hp: 99999, maxhp: 99999, spd: 150 }, extra || {})));
    G.packs.push({ x: cx, y: cy, awake: true, room: 0, enemies: en });
    return en.length;
  };
  window.__forceTaunt = () => { for (const s of G.minions) if (s.golem) { s.tauntActive = GOLEM_TAUNT_DUR; s.tauntCd = GOLEM_TAUNT_CD; } };
  window.__mythicItem = (key, n = 2) => { const u = MYTHIC.find((m) => m.key === key) || MYTHIC[0]; return { name: u.name, slot: u.slot, rarity: MYTHIC_RARITY, unique: u, mythic: true, affixes: rollAffixes(n, G.floor) }; };
  window.__giveMythic = (key) => { const it = window.__mythicItem(key, 1); G.player.equipped[it.slot] = it; recalc(); return [...G.player.uniques]; };
  window.__dropMythic = (dx = 40) => { const it = rollMythic(G.floor); dropItemAt(G.player.x + dx, G.player.y, it); return it ? it.name : null; };
  window.__seedCorpses = (n = 8) => { const p = G.player; G.corpses = []; for (let i = 0; i < n; i++) G.corpses.push({ x: p.x - 120 + (i % 6) * 44, y: p.y - 40 + Math.floor(i / 6) * 40, base: "mob/skelarch", dir: "s", h: 80, used: false, t: 0 }); return G.corpses.length; };
  window.__raiseOnce = () => { const b = G.minions.length; raiseSkeleton(); return G.minions.length - b; };
  window.__floatDmg = (m, n, c) => floatDmg(m, n, c);
  window.__floats = () => G.floats.map((f) => ({ txt: f.txt, dmg: !!f.dmg, hits: f.hits || 0, acc: Math.round(f.acc || 0) }));
  window.__bigHUD = (hp, mp, gold, xp, asc) => { const p = G.player; p.maxhp = hp; p.hp = hp; p.maxmana = mp; p.mana = mp; G.gold = gold; G.xp = xp; G.ascension = asc || 0; updateHUD(); return { hp: el("hptxt").textContent, mp: el("mptxt").textContent, gold: el("gold").textContent }; };
  window.__corpseBurn = () => { const p = G.player, c0 = G.corpses.filter((c) => !c.used).length, m0 = Math.round(p.mana); corpseBurn(); return { corpseBefore: c0, corpseAfter: G.corpses.filter((c) => !c.used).length, manaGain: Math.round(p.mana) - m0 }; };
  window.__corpseHex = () => { let boss = null; for (const pk of G.packs) for (const m of pk.enemies) if (m.boss && m.alive) boss = m; const c0 = G.corpses.filter((c) => !c.used).length; corpseHex(); return { corpseBefore: c0, corpseAfter: G.corpses.filter((c) => !c.used).length, hex: boss ? +(boss.hex || 0).toFixed(1) : null }; };
  window.__bossHere = () => { for (const pk of G.packs) { for (const m of pk.enemies) if (m.boss) { pk.awake = true; return { kind: m.bossKind, name: m.name, x: Math.round(m.x), y: Math.round(m.y) }; } } return null; };
  window.__hurtBoss = (m, dmg) => hurtEnemy(m, dmg, 1, 0, null);
  window.__seedBossRun = (s) => seedBossRun(s);
  window.__journalReset = () => { JOURNAL = { done: {}, stats: {}, slots: 0, minionPct: 0 }; saveJournal(); recalc(); };
  window.__journalState = () => ({ done: Object.keys(JOURNAL.done), slots: JOURNAL.slots, minionPct: JOURNAL.minionPct, stats: JOURNAL.stats });
  window.__journalOpen = () => { if (!journalPanelOpen) toggleJournal(); else renderJournal(); };
  window.__journalClose = () => { if (journalPanelOpen) toggleJournal(); };
  window.__journalCheck = () => { journalCheck(); return window.__journalState(); };
  window.__journalSetStat = (k, v) => { JOURNAL.stats[k] = v; };
  window.__updateHUD = () => updateHUD();
  window.__raiseGhoul = () => { const b = G.minions.filter((m) => m.ghoul).length; raiseGhoul(); return G.minions.filter((m) => m.ghoul).length - b; };
  window.__killMinion = (i = 0) => { const s = G.minions[i]; if (s) killMinion(s); return G.minions.length; };
  window.__killFoe = () => { for (const pk of G.packs) for (const m of pk.enemies) if (m.alive) { killEnemy(m); return true; } return false; };
  window.__spawnAffixElite = (key, dx = 150, dy = -18) => {   // V-246 컷용 — 지정 수식어 정예를 사람 곁에 세운다(실제 문 applyAffixes 를 지난다)
    const p = G.player;
    const m = { id: -900 - (G._afxId = (G._afxId || 0) + 1), base: "mob/brute", x: p.x + dx, y: p.y + dy,
      hp: 4000, maxhp: 4000, dmg: 40, spd: 116 * 0.9, h: 85 * 1.4 * 1.25, r: 26 * 1.15 * 1.2,
      gold: [12, 22], dx: -1, dy: 0, elite: true, hit: 0, kb: { x: 0, y: 0 }, atk: 0, anim: 0, alive: true, tb: 0, name: "정예" };
    applyAffixes(m, Array.isArray(key) ? key : [key]);
    G.packs.push({ x: m.x, y: m.y, awake: true, room: 0, enemies: [m] });
    window.__afxMob = m;
    return { name: m.name, affix: m.affix, spd: Math.round(m.spd) };
  };
  window.__afxShellTest = (dmg = 1000) => {   // V-246 컷용 — 뼈 껍질이 소환수 피해를 실제로 얼마 막는지 잰다
    const m = window.__afxMob; if (!m) return null; const before = m.hp;
    hurtEnemy(m, dmg, 1, 0, "minion"); const minionApplied = Math.round(before - m.hp); m.hp = before; m.alive = true;
    hurtEnemy(m, dmg, 1, 0, "spear"); const directApplied = Math.round(before - m.hp); m.hp = before; m.alive = true;
    return { raw: dmg, minionApplied, directApplied };
  };
  window.__pushProp = (img, dx = 90, dy = 0, h) => { const p = G.player; (G.props || (G.props = [])).push({ x: p.x + dx, y: p.y + dy, img, h: h || 74 }); return G.props.length; };
  window.__kindProfile = (fl) => {
    const base = 200 + fl * 40, bd = 34 + fl * 10;
    const prof = (T) => ({ hp: Math.round(base * T.hpMul), dmg: Math.round(bd * T.dmgMul), atkCd: +(0.6 * T.atkMul).toFixed(2), dps: Math.round(bd * T.dmgMul / (0.6 * T.atkMul)), slot: T.slot });
    return { skel: prof(SKEL_TIERS[0]), ghoul: Object.assign(prof(GHOUL), { drain: GHOUL.drain, cost: GHOUL.cost, need: GHOUL.need }), golem: Object.assign(prof(GOLEM), { cost: GOLEM.cost, need: GOLEM.need, taunt: true, block: true }) };
  };
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
  for (const a of G.altars) {   // V-234 — 제단도 상자처럼 발자국이 몸을 막는다(inFree·unstick 은 안 건드려 벽밖 0% 불변)
    const br = (a.r || 26) + r, dx = x - a.x, dy = (y - a.y) / 0.62;
    if (dx * dx + dy * dy < br * br) return true;
  }
  return false;
}
function walkable(x, y, r) { return inFree(x, y, r) && !blockedByProp(x, y, r); }

// 미끄러진다 — 벽에 부딪히면 멈추는 게 아니라 축을 나눠 민다(x 되면 x, y 되면 y). 그래야
// 벽을 따라 걷고 모서리에서 안 낀다. 이게 없으면 조작이 답답해진다(V-201 주의).
function stepTo(e, nx, ny, r) {
  if (nx !== e.x && walkable(nx, e.y, r) && !foeWallBlock(nx, e.y, r)) e.x = nx;
  if (ny !== e.y && walkable(e.x, ny, r) && !foeWallBlock(e.x, ny, r)) e.y = ny;
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
  if (mouse.down && p.spearCd <= 0 && !invOpen && !charOpen && !shopOpen) {
    fireSpear(p, tx, ty);
    p.spearCd = p.atkCd;
  }
  if (p.mana < p.maxmana) p.mana = Math.min(p.maxmana, p.mana + 60 * dt);
  if (p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + 22 * dt);
  if (p.iframe > 0) p.iframe -= dt;
  if (p.curse > 0) p.curse -= dt;   // V-230 사제의 저주 — 남은 동안 내 피해가 반(curseF)
  if (p.townCast > 0) {             // V-238 — 귀환 시전(적이 안전반경에 들면 끊긴다)
    if (enemyNear(p.x, p.y, TOWN_SAFE_R)) { p.townCast = 0; floatNote("귀환이 끊겼다", "#c8a04a", 1.0); }
    else { p.townCast -= dt; if (p.townCast <= 0) { p.townCast = 0; goTown(); return; } }
  }

  const vw = VW / Z, vh = VH / Z;
  let tcx = p.x - vw / 2, tcy = p.y - vh / 2;
  const reg = (globalThis.__CAM_CLAMP === true && G.rooms) ? localBounds(tcx, tcy, vw, vh) : null;
  if (reg) {
    const x0 = reg.x0 - CAM_MARGIN, y0 = reg.y0 - CAM_MARGIN, x1 = reg.x1 + CAM_MARGIN, y1 = reg.y1 + CAM_MARGIN;
    tcx = (x1 - x0 <= vw) ? (x0 + x1) / 2 - vw / 2 : Math.max(x0, Math.min(x1 - vw, tcx));
    tcy = (y1 - y0 <= vh) ? (y0 + y1) / 2 - vh / 2 : Math.max(y0, Math.min(y1 - vh, tcy));
  }
  if (globalThis.__holdCam !== true) {   // 컷용 — 카메라를 손으로 고정할 때만(그 외엔 늘 사람을 따라간다)
    cam.x += (tcx - cam.x) * Math.min(1, dt * 8);
    cam.y += (tcy - cam.y) * Math.min(1, dt * 8);
    if (globalThis.__CAM_MAPCLAMP === true) {
      cam.x = Math.max(0, Math.min(G.W - vw, cam.x));
      cam.y = Math.max(0, Math.min(G.H - vh, cam.y));
    }
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
  const potionOn = globalThis.__POTION !== false;
  for (let i = 0; i < (potionOn ? 4 : 3); i++) {
    const k = "" + (i + 1);
    if (keys.has(k) && !p["_g" + k]) { p["_g" + k] = true; if (potionOn) drinkPotion(i); else selectGrade(i); } if (!keys.has(k)) p["_g" + k] = false;
  }
  if (potionOn) { if (keys.has("p") && !p._p) { p._p = true; buyPotion(); } if (!keys.has("p")) p._p = false; }
  if (globalThis.__GEM !== false) { if (keys.has("j") && !p._j) { p._j = true; buyGem(); } if (!keys.has("j")) p._j = false; }
  if (keys.has("e") && !p._e) { p._e = true; corpseNova(); } if (!keys.has("e")) p._e = false;
  if (keys.has("v") && !p._v) { p._v = true; if (globalThis.__BONEWALL !== false) corpseWall(); } if (!keys.has("v")) p._v = false;
  if (keys.has("r") && !p._r) { p._r = true; if (!G.dead && globalThis.__FEED !== false) corpseFeed(); } if (!keys.has("r")) p._r = false;
  if (keys.has("g") && !p._gg) { p._gg = true; if (globalThis.__GOLEM !== false && globalThis.__MINIONKIND !== false) raiseGolem(); } if (!keys.has("g")) p._gg = false;
  if (keys.has("k") && !p._k) { p._k = true; if (globalThis.__GHOUL !== false && globalThis.__MINIONKIND !== false) raiseGhoul(); } if (!keys.has("k")) p._k = false;
  if (globalThis.__CORPSEUSE !== false) {   // V-242 ② M 화장(시체→마나) · U 제물(시체→주인 약화)
    if (keys.has("m") && !p._m) { p._m = true; corpseBurn(); } if (!keys.has("m")) p._m = false;
    if (keys.has("u") && !p._u) { p._u = true; corpseHex(); } if (!keys.has("u")) p._u = false;
  }
  if (keys.has("b") && !p._b) { p._b = true; buyAltar(); } if (!keys.has("b")) p._b = false;
  if (keys.has("h") && !p._h) { p._h = true; if (globalThis.__HINTFOLD !== false) toggleHelp(); } if (!keys.has("h")) p._h = false;
  if (keys.has("z") && !p._z) { p._z = true; spendPoint("slot"); } if (!keys.has("z")) p._z = false;
  if (keys.has("x") && !p._x) { p._x = true; if (potionOn) cycleGrade(); else spendPoint("grade"); } if (!keys.has("x")) p._x = false;
  if (keys.has("f") && !p._f) { p._f = true; tryStairs(); } if (!keys.has("f")) p._f = false;
  if (keys.has("n") && !p._n) { p._n = true; if (townOn()) tryTownReturn(); } if (!keys.has("n")) p._n = false;
  if (keys.has("t") && !p._t) { p._t = true; if (merchOn()) toggleShopNear(); } if (!keys.has("t")) p._t = false;
  if (keys.has("y") && !p._y) { p._y = true; if (ascendOn()) tryAscend(); } if (!keys.has("y")) p._y = false;
  if (keys.has("i") && !p._i) { p._i = true; toggleInv(); } if (!keys.has("i")) p._i = false;
  if (keys.has("c") && !p._c) { p._c = true; toggleChar(); } if (!keys.has("c")) p._c = false;
  if (keys.has("l") && !p._l) { p._l = true; if (journalOn()) toggleJournal(); } if (!keys.has("l")) p._l = false;
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

// ── V-235 물약 벨트 — 소환 등급은 X 순환으로 옮겼다(1~4 는 물약 마시기). ────────────
function cycleGrade() {
  const p = G.player;
  if (p.maxGrade <= 0) { floatNote("소환 등급은 C 창에서 해금", "#c8a04a", 1.1); return; }
  p.grade = (p.grade + 1) % (p.maxGrade + 1);
  floatNote("소환 등급 ▸ " + SKEL_TIERS[p.grade].label, "#e8a24a", 1.0);
}
function beltPush(kind) {
  const b = G.player.belt;
  for (const s of b) if (s && s.kind === kind && s.n < BELT_MAX) { s.n++; return true; }
  for (let i = 0; i < b.length; i++) if (!b[i]) { b[i] = { kind, n: 1 }; return true; }
  return false;
}
function drinkPotion(i) {
  const p = G.player, s = p.belt[i];
  if (!s || s.n <= 0) return;
  const P = POTION[s.kind];
  if (s.kind === "hp") {
    if (p.hp >= p.maxhp) { floatNote("생명이 가득하다", "#c8a04a", 0.9); return; }
    p.hp = Math.min(p.maxhp, p.hp + p.maxhp * P.frac);
  } else {
    if (p.mana >= p.maxmana) { floatNote("마나가 가득하다", "#c8a04a", 0.9); return; }
    p.mana = Math.min(p.maxmana, p.mana + p.maxmana * P.frac);
  }
  s.n--; if (s.n <= 0) p.belt[i] = null;
  for (let k = 0; k < 12; k++) burst(p.x, p.y - 20, P.glow, 90);
  flash = Math.max(flash, 0.12); flashColor = s.kind === "hp" ? "208,54,46" : "47,106,208";
}
function dropPotion(x, y, kind) {
  const a = Math.random() * 6.283, s = 40 + Math.random() * 70;
  G.potions.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind, t: 0 });
}
function potionPrice() { return Math.round(30 + 12 * (G.floor - 1)); }
function buyNoteExtra() { return globalThis.__BUYTEXT === false ? { sz: 14 } : { sz: 16, panel: true }; }
function buyPotion() {
  const p = G.player;
  const ai = nearestAltarAny(p.x, p.y, 90);
  if (ai < 0) return;
  const price = potionPrice();
  if (G.gold < price) { floatNote(`금이 모자라다 (${price})`, "#c8a04a", 1.1); return; }
  const kind = (p.hp / p.maxhp) <= (p.mana / p.maxmana) ? "hp" : "mp";
  if (!beltPush(kind)) { floatNote("벨트가 가득하다", "#c8a04a", 1.1); return; }
  G.gold -= price;
  floatNote(`${POTION[kind].name} 구입 (${fmtNum(price)}◈)`, POTION[kind].glow, 1.2, buyNoteExtra());
  for (let i = 0; i < 12; i++) burst(p.x, p.y - 20, POTION[kind].glow, 120);
}
function stepPotions(dt) {
  if (globalThis.__POTION === false) return;
  const p = G.player;
  for (const q of G.potions) {
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.8; q.vy *= 0.8;
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (q.t > 0.35 && d < 110) { q.x += (p.x - q.x) * Math.min(1, dt * 9); q.y += (p.y - q.y) * Math.min(1, dt * 9); }
    if (d < 44 && q.t > 0.3 && beltPush(q.kind)) {
      q.got = true;
      G.pickLog.unshift({ name: POTION[q.kind].name, color: POTION[q.kind].glow, t: 3 });
      if (G.pickLog.length > 6) G.pickLog.pop();
    }
  }
  G.potions = G.potions.filter((q) => !q.got);
}

// ── V-236 보석 — 바닥 드랍(물약 옆 길) → 밟으면 주머니에 쌓임 → 소켓에 박기 · 제단에서 J 로 구입 ──
function dropGem(x, y, floor) {
  const type = GEM_KEYS[(Math.random() * GEM_KEYS.length) | 0];
  const grade = rollGemGrade(floor);
  const a = Math.random() * 6.283, s = 40 + Math.random() * 70;
  G.floorGems.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, type, grade, t: 0 });
}
function stepGems(dt) {
  if (globalThis.__GEM === false) return;
  const p = G.player;
  for (const q of G.floorGems) {
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.8; q.vy *= 0.8;
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (q.t > 0.35 && d < 110) { q.x += (p.x - q.x) * Math.min(1, dt * 9); q.y += (p.y - q.y) * Math.min(1, dt * 9); }
    if (d < 44 && q.t > 0.3) {
      q.got = true;
      p.gems.push(makeGem(q.type, q.grade));
      G.pickLog.unshift({ name: `${GEM_GRADES[q.grade]} ${GEM_TYPES[q.type].name}`, color: GEM_TYPES[q.type].col, t: 3 });
      if (G.pickLog.length > 6) G.pickLog.pop();
      if (invOpen) renderInv();
    }
  }
  G.floorGems = G.floorGems.filter((q) => !q.got);
}
function buyGemGrade() { return G.floor >= 13 ? 2 : G.floor >= 6 ? 1 : 0; }
function gemPrice() { return Math.round((70 + 30 * (G.floor - 1)) * (buyGemGrade() + 1)); }
function buyGem() {
  if (globalThis.__GEM === false) return;
  const p = G.player;
  const ai = nearestAltarAny(p.x, p.y, 90);
  if (ai < 0) return;
  const price = gemPrice();
  if (G.gold < price) { floatNote(`금이 모자라다 (${price})`, "#c8a04a", 1.1); return; }
  const grade = buyGemGrade(), type = GEM_KEYS[(Math.random() * GEM_KEYS.length) | 0];
  G.gold -= price;
  p.gems.push(makeGem(type, grade));
  floatNote(`${GEM_GRADES[grade]} ${GEM_TYPES[type].name} 구입 (${fmtNum(price)}◈)`, GEM_TYPES[type].col, 1.3, buyNoteExtra());
  for (let i = 0; i < 12; i++) burst(p.x, p.y - 20, GEM_TYPES[type].col, 120);
  if (invOpen) renderInv();
}
// 고른 보석을 소켓 빈 장비에 박는다. 한 번 박으면 못 뺀다(디아 결). 없거나 다 찼으면 안내만.
function socketGem(it) {
  if (globalThis.__GEM === false || globalThis.__SOCKET === false || !selectedGem || !it) return;
  if (!it.sockets || !it.sockets.length) { floatNote("소켓이 없는 장비다", "#c8a04a", 1.1); return; }
  const free = it.sockets.indexOf(null);
  if (free < 0) { floatNote("소켓이 가득 찼다", "#c8a04a", 1.1); return; }
  const gi = G.player.gems.findIndex((g) => g.type === selectedGem.type && g.grade === selectedGem.grade);
  if (gi < 0) { selectedGem = null; return; }
  const gem = G.player.gems.splice(gi, 1)[0];
  it.sockets[free] = gem;
  selectedGem = null;
  recalc();
  floatNote(`${GEM_GRADES[gem.grade]} ${GEM_TYPES[gem.type].name}를 박았다`, GEM_TYPES[gem.type].col, 1.4);
  if (invOpen) renderInv();
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
    filt: T.filt, dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1, feed: 0 });
  const col = tier === 0 ? "#9fe6c8" : tier === 1 ? "#bfe08a" : "#e0b060";
  for (let i = 0; i < 12 + tier * 6; i++) burst(c.x, c.y - 20, col, 120 + tier * 50);
  if (T.shake) cam.shake = Math.max(cam.shake, T.shake);
  if (p.uniques.has("twinRaise")) raiseTwin(tier, T, col);
}

// twinRaise 유니크 — 곁의 다른 시체 하나에서 쌍둥이 해골을 함께 세운다(자리·시체가 있을 때만).
function raiseTwin(tier, T, col) {
  const p = G.player;
  if (slotsUsed() + T.slot > slotCap()) return;
  const ci = nearestCorpse(p.x, p.y, 300);
  if (ci < 0) return;
  const c = G.corpses[ci]; c.used = true;
  const hp = (200 + G.floor * 40) * T.hpMul * p.minionHpMul;
  G.minions.push({ base: SKEL_BASE, x: c.x, y: c.y, hp, maxhp: hp,
    dmg: (34 + G.floor * 10) * T.dmgMul * p.minionMul, spd: 250 * T.spdMul, atkCd: 0.6 * T.atkMul,
    r: 15 * T.scale, h: SKEL_H * T.scale, tier, slot: T.slot, cleave: T.cleave, ring: T.ring, ringCol: T.ringCol, shake: T.shake,
    filt: T.filt, dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1, feed: 0 });
  for (let i = 0; i < 10; i++) burst(c.x, c.y - 20, col, 120 + tier * 50);
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
  if (!canPay(30)) return;
  const tx = cam.x + mouse.x / Z, ty = cam.y + mouse.y / Z;
  const ci = nearestCorpse(tx, ty, 200);
  if (ci < 0) return;
  payMana(30);
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
    for (const b of G.bones) if (!b.foe && (b.x - x) ** 2 + (b.y - y) ** 2 < rad * rad) b.hp -= dmg;   // V-230 뼈 우리는 폭발이 부순다 · V-232 제 뼈벽(foe)은 안 부순다
  }, (delay || 0) * 1000);
}

function forEachEnemy(fn) {
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) fn(m, pk);
}

function corpseWall() {
  const p = G.player;
  if (!canPay(25)) return;
  const tx = cam.x + mouse.x / Z, ty = cam.y + mouse.y / Z;
  const eaten = [];
  for (let n = 0; n < 3; n++) {
    const ci = nearestCorpse(tx, ty, 220);
    if (ci < 0) break;
    G.corpses[ci].used = true; eaten.push(ci);
  }
  if (!eaten.length) { floatNote("가까운 시체가 없다", "#c8a04a", 1.0); return; }
  payMana(25);
  const cnt = eaten.length;
  const dx = tx - p.x, dy = ty - p.y, dl = Math.hypot(dx, dy) || 1;
  const nx = -dy / dl, ny = dx / dl;
  const hp = (120 + G.floor * 20) * cnt;
  for (let i = 0; i < 7; i++) {
    const t = (i / 6 - 0.5) * 170;
    G.bones.push({ x: tx + nx * t, y: ty + ny * t, r: 20, hp, maxhp: hp, life: PWALL_LIFE, foe: true });
  }
  for (let i = 0; i < 20; i++) burst(tx, ty, "#8fd0ff", 160);
  cam.shake = Math.max(cam.shake, 6);
}

function raiseGolem() {
  const p = G.player;
  if (slotsUsed() + GOLEM.slot > slotCap()) { floatNote(`자리가 부족하다 (뼈 골렘 ${GOLEM.slot}칸)`, "#e0663c", 1.2); return; }
  if (!canPay(GOLEM.cost)) { floatNote("마나가 모자라다", "#c8a04a", 1.0); return; }
  const eaten = [];
  let cx = 0, cy = 0;
  for (let n = 0; n < GOLEM.need; n++) {
    const ci = nearestCorpse(p.x, p.y, 320);
    if (ci < 0) break;
    const c = G.corpses[ci]; c.used = true; eaten.push(ci); cx += c.x; cy += c.y;
  }
  if (eaten.length < GOLEM.need) {
    for (const ci of eaten) G.corpses[ci].used = false;
    floatNote(`시체가 모자라다 (${GOLEM.need}구 필요·${eaten.length}구)`, "#c8a04a", 1.2);
    return;
  }
  payMana(GOLEM.cost); journalStat("golem");
  cx /= GOLEM.need; cy /= GOLEM.need;
  const hp = (200 + G.floor * 40) * GOLEM.hpMul * p.minionHpMul;
  G.minions.push({ base: SKEL_BASE, x: cx, y: cy, hp, maxhp: hp,
    dmg: (34 + G.floor * 10) * GOLEM.dmgMul * p.minionMul, spd: 250 * GOLEM.spdMul, atkCd: 0.6 * GOLEM.atkMul,
    r: 15 * GOLEM.scale, h: SKEL_H * GOLEM.scale, tier: 2, slot: GOLEM.slot, cleave: GOLEM.cleave,
    ring: GOLEM.ring, ringCol: GOLEM.ringCol, shake: GOLEM.shake, filt: GOLEM.filt,
    dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1, feed: 0, golem: true, tauntCd: GOLEM_TAUNT_CD, tauntActive: 0 });
  for (let i = 0; i < 30; i++) burst(cx, cy - 20, "#cfe0ef", 200);
  cam.shake = Math.max(cam.shake, GOLEM.shake);
  floatNote("뼈 골렘이 일어난다", "#bcd0e8", 1.2);
}

function raiseGhoul() {
  const p = G.player;
  if (slotsUsed() + GHOUL.slot > slotCap()) { floatNote(`자리가 부족하다 (구울 ${GHOUL.slot}칸)`, "#e0663c", 1.2); return; }
  if (!canPay(GHOUL.cost)) { floatNote("마나가 모자라다", "#c8a04a", 1.0); return; }
  const eaten = [];
  let cx = 0, cy = 0;
  for (let n = 0; n < GHOUL.need; n++) {
    const ci = nearestCorpse(p.x, p.y, 320);
    if (ci < 0) break;
    const c = G.corpses[ci]; c.used = true; eaten.push(ci); cx += c.x; cy += c.y;
  }
  if (eaten.length < GHOUL.need) {
    for (const ci of eaten) G.corpses[ci].used = false;
    floatNote(`시체가 모자라다 (${GHOUL.need}구 필요·${eaten.length}구)`, "#c8a04a", 1.2);
    return;
  }
  payMana(GHOUL.cost); journalStat("ghoul");
  cx /= GHOUL.need; cy /= GHOUL.need;
  const hp = (200 + G.floor * 40) * GHOUL.hpMul * p.minionHpMul;
  G.minions.push({ base: SKEL_BASE, x: cx, y: cy, hp, maxhp: hp,
    dmg: (34 + G.floor * 10) * GHOUL.dmgMul * p.minionMul, spd: 250 * GHOUL.spdMul, atkCd: 0.6 * GHOUL.atkMul,
    r: 15 * GHOUL.scale, h: SKEL_H * GHOUL.scale, tier: 0, slot: GHOUL.slot, cleave: GHOUL.cleave,
    ring: GHOUL.ring, ringCol: GHOUL.ringCol, shake: GHOUL.shake, filt: null,
    dx: 0, dy: 1, anim: 0, state: "idle", atk: 0, target: -1, feed: 0, ghoul: true, drain: GHOUL.drain });
  for (let i = 0; i < 16; i++) burst(cx, cy - 18, "#5fe08a", 150);
  floatNote("구울이 일어난다", "#8fe0a8", 1.1);
}

// 구울 피 빨기 — 준 피해(eff)의 drain 만큼 제 hp 로, 꽉 차면 남는 만큼 주인(p) 회복. drawActor 가 s.drainT 로 초록 깜빡임을 그린다.
function ghoulDrain(s, eff) {
  if (!(eff > 0)) return;
  const heal = eff * s.drain;
  const before = s.hp;
  s.hp = Math.min(s.maxhp, s.hp + heal);
  const overflow = heal - (s.hp - before);
  if (overflow > 0) { const p = G.player; p.hp = Math.min(p.maxhp, p.hp + overflow); }
  s.drainT = 0.18;
}

// 골렘 도발 — 반경 안 적의 표적을 자기로 끈다. stepEnemies 의 근접 표적 고르기가 tauntTargetFor 를 먼저 물어 골렘을 문다.
function golemTaunt(s) {
  s.tauntActive = GOLEM_TAUNT_DUR;
  for (let i = 0; i < 20; i++) burst(s.x, s.y - 6, "#e0b84a", 130);
}
// 반경 안에서 지금 도발 중인 골렘이 있으면 그 골렘을 표적으로 돌려준다(가장 가까운 것). 없으면 null.
function tauntTargetFor(m) {
  let best = null, bd = GOLEM_TAUNT_R * GOLEM_TAUNT_R;
  for (const s of G.minions) {
    if (!s.golem || !(s.tauntActive > 0) || globalThis.__GOLEMKIND === false || globalThis.__MINIONKIND === false) continue;
    const d = (s.x - m.x) ** 2 + (s.y - m.y) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
// 골렘이 몸으로 막는다 — 반경 안 적(주인 제외)을 r+여유 밖으로 민다. 길을 몸으로 틀어막아 앞에서 버틴다.
function golemBlock(s) {
  forEachEnemy((m) => {
    if (m.boss) return;
    const R = s.r + m.r + GOLEM_BLOCK_PAD;
    const dx = m.x - s.x, dy = m.y - s.y, d2 = dx * dx + dy * dy;
    if (d2 < R * R && d2 > 0.01) {
      const d = Math.sqrt(d2);
      stepTo(m, m.x + (dx / d) * (R - d), m.y + (dy / d) * (R - d), m.r);
    }
  });
}

// 군세 종별 수 — HUD 「자리」 곁에 적어 군세 구성이 한눈에 읽히게(어느 종도 70% 넘는지도 이 값으로 잰다).
function armyCounts() {
  let skel = 0, ghoul = 0, golem = 0;
  for (const m of G.minions) { if (m.golem) golem++; else if (m.ghoul) ghoul++; else skel++; }
  return { skel, ghoul, golem };
}

function corpseFeed() {
  const p = G.player;
  if (!canPay(20)) return;
  let best = null, bd = Infinity;
  for (const s of G.minions) { const d = (s.x - p.x) ** 2 + (s.y - p.y) ** 2; if (d < bd) { bd = d; best = s; } }
  if (!best) { floatNote("소환수가 없다", "#c8a04a", 1.0); return; }
  if ((best.feed || 0) >= 5) { floatNote("더 못 먹인다", "#c8a04a", 1.0); return; }
  const ci = nearestCorpse(best.x, best.y, 200);
  if (ci < 0) { floatNote("가까운 시체가 없다", "#c8a04a", 1.0); return; }
  G.corpses[ci].used = true;
  payMana(20);
  const f = (best.feed = (best.feed || 0) + 1);
  best.dmg *= (1 + 0.20 * f) / (1 + 0.20 * (f - 1));
  best.maxhp *= (1 + 0.15 * f) / (1 + 0.15 * (f - 1));
  best.hp = best.maxhp;
  for (let i = 0; i < 14; i++) burst(best.x, best.y - 20, "#b0202a", 160);
  floatNote("제물 — 소환수가 커진다", "#e0663c", 1.0);
}

function corpseBurn() {   // V-242 ② M — 시체 화장: 곁의 시체를 태워 마나로 돌린다(소환·폭발이 먹을 시체를 놓고 다툰다)
  const p = G.player;
  if (p.mana >= p.maxmana) { floatNote("마나가 가득하다", "#c8a04a", 1.0); return; }
  let n = 0;
  for (let k = 0; k < BURN_N; k++) {
    const ci = nearestCorpse(p.x, p.y, 300);
    if (ci < 0) break;
    const c = G.corpses[ci]; c.used = true;
    for (let i = 0; i < 12; i++) burst(c.x, c.y - 20, "#5fb0ff", 160);
    n++;
  }
  if (!n) { floatNote("가까운 시체가 없다", "#c8a04a", 1.0); return; }
  const gain = Math.min(p.maxmana - p.mana, n * BURN_MANA);
  p.mana += gain;
  cam.shake = Math.max(cam.shake, 4);
  floatNote(`화장 — 마나 +${Math.round(gain)}`, "#5fb0ff", 1.0);
}

function corpseHex() {   // V-242 ② U — 시체 제물로 곁의 주인을 약화(관문에서 시체를 걸고 소환과 다투게). 시체 부족하면 안 쓴다.
  const p = G.player;
  let boss = null, bd = HEX_RANGE * HEX_RANGE;
  for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) {
    if (!m.boss || !m.alive) continue;
    const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
    if (d < bd) { bd = d; boss = m; }
  }
  if (!boss) { floatNote("곁에 주인이 없다", "#c8a04a", 1.0); return; }
  const eaten = [];
  for (let k = 0; k < HEX_N; k++) { const ci = nearestCorpse(p.x, p.y, 320); if (ci < 0) break; G.corpses[ci].used = true; eaten.push(ci); }
  if (eaten.length < HEX_N) {
    for (const ci of eaten) G.corpses[ci].used = false;
    floatNote(`시체가 모자라다 (${HEX_N}구 필요·${eaten.length}구)`, "#c8a04a", 1.2);
    return;
  }
  boss.hex = HEX_DUR;
  for (let i = 0; i < 26; i++) burst(boss.x, boss.y - boss.h * 0.4, "#c774ff", 200);
  cam.shake = Math.max(cam.shake, 6);
  floatNote("제물 — 주인이 약해진다 (피해 −40% · 받는 피해 +35%)", "#c774ff", 1.4, { sz: 13 });
}
function hexF(m) { return m.hex > 0 ? HEX_DMG : 1; }

// ── V-234 뼈 제단 — 금을 쓰는 첫 길(피/뼈/재 셋 중 층마다 하나). B 로 산다(반경 70·한 층 한 번). ──
const ALTAR_META = {
  blood: { name: "피의 제단", col: "#e0663c", note: "최대 생명 +8%" },
  bone:  { name: "뼈의 제단", col: "#8fd0ff", note: "소환 자리 +1" },
  ash:   { name: "재의 제단", col: "#c8a04a", note: "가장 값싼 물건의 옵션을 다시 굴린다" },
};
// 값은 층에 비례 · 종류마다 ± 조금(재가 가장 쌈).
function altarPrice(kind) {
  const base = 120 + 60 * (G.floor - 1);
  const adj = kind === "ash" ? -30 : kind === "blood" ? 20 : 0;
  return Math.max(0, Math.round(base + adj));
}
function nearestAltar(x, y, rad) {
  let best = -1, bd = rad * rad;
  for (let i = 0; i < G.altars.length; i++) {
    const a = G.altars[i];
    if (a.used) continue;
    const d = (a.x - x) ** 2 + (a.y - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function nearestAltarAny(x, y, rad) {
  let best = -1, bd = rad * rad;
  for (let i = 0; i < G.altars.length; i++) {
    const a = G.altars[i];
    const d = (a.x - x) ** 2 + (a.y - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function buyAltar() {
  const p = G.player;
  const ai = nearestAltar(p.x, p.y, 70);
  if (ai < 0) return;
  const a = G.altars[ai];
  const eq = Object.values(p.equipped).filter(Boolean);
  if (a.kind === "ash" && !eq.length) { floatNote("걸친 것이 없다", "#c8a04a", 1.2); return; }
  const price = altarPrice(a.kind);
  if (G.gold < price) { floatNote(`금이 모자라다 (${price})`, "#c8a04a", 1.2); return; }
  G.gold -= price;
  a.used = true;
  applyAltar(a.kind);
  const meta = ALTAR_META[a.kind];
  for (let i = 0; i < 26; i++) burst(a.x, a.y - 20, "#f0d060", 180);
  flash = Math.max(flash, 0.2); flashColor = "240,208,96";
  cam.shake = Math.max(cam.shake, 6);
}
function applyAltar(kind) {
  const p = G.player;
  if (kind === "blood") {
    const before = p.maxhp;
    p.altarHpMul = (p.altarHpMul ?? 1) * 1.08;
    recalc();
    p.hp = Math.min(p.maxhp, p.hp + (p.maxhp - before));   // 생명·최대 생명 둘 다 올린다
    floatNote("피의 제단 — 최대 생명 +8%", ALTAR_META.blood.col, 1.6, buyNoteExtra());
  } else if (kind === "bone") {
    p.altarSlots = (p.altarSlots ?? 0) + 1;
    recalc();
    floatNote("뼈의 제단 — 소환 자리 +1", ALTAR_META.bone.col, 1.6, buyNoteExtra());
  } else {
    const eq = Object.values(p.equipped).filter(Boolean);
    let low = null; for (const it of eq) if (!low || itemScore(it) < itemScore(low)) low = it;   // 값어치 가장 낮은 하나
    const n = (low.affixes || []).length;
    low.affixes = rollAffixes(n, G.floor);   // 개수는 그대로 · 층은 현재 층(loot.js 규칙)
    recalc();
    floatNote(`재의 제단 — ${SLOT_LABEL[low.slot] || low.slot} 옵션을 다시 굴렸다`, ALTAR_META.ash.col, 1.6, buyNoteExtra());
    if (invOpen) renderInv();
  }
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

// ── V-246 ① 정예 수식어 굴림 — genFloor 밖(fresh)에서 「층 씨앗」 산술 PRNG 로 굴린다(전역 Math.random 불변). ──
function assignAffixes(f, floor) {
  if (globalThis.__AFFIX === false || !f.packs) return;
  let s = ((floor * 2654435761) ^ 0x9e3779b9) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (const pk of f.packs) {
    const lead = pk.enemies && pk.enemies.find((m) => m.elite || m.boss);
    if (!lead) continue;
    const pool = AFFIX_KEYS.slice();
    const n = rnd() < 0.35 ? 2 : 1;
    const chosen = [];
    for (let i = 0; i < n && pool.length; i++) chosen.push(pool.splice((rnd() * pool.length) | 0, 1)[0]);
    applyAffixes(lead, chosen);
  }
}
function applyAffixes(m, keys) {
  m.affix = keys;
  for (const k of keys) {
    if (k === "swift") { m.spd *= 1.5; m.swift = true; }
    else if (k === "fire") m.afxBurn = true;
    else if (k === "bolt") m.afxBolt = true;
    else if (k === "revive") m.afxRevive = true;
    else if (k === "shell") m.afxShell = true;
  }
  m.afxCol = AFFIX[keys[0]].col;
  m.name = keys.map((k) => AFFIX[k].name).join("·") + " " + (m.name || "정예");
}
// 화상 tick(iframe 밖·dotPlayer)·잔상 자취 기록 — 매 프레임 깨어난 정예마다.
function affixMobTick(m, p, dt) {
  if (m.afxBurn && (p.x - m.x) ** 2 + (p.y - m.y) ** 2 < AFFIX_BURN_R * AFFIX_BURN_R) {
    dotPlayer(AFFIX_BURN_DPS() * dt); p.hurt = Math.max(p.hurt, 0.1);
    G._burnAcc = (G._burnAcc || 0) + AFFIX_BURN_DPS() * dt;
    if (G.parts.length < 380 && Math.random() < 0.25) burst(p.x, p.y - 10, "#ff7a3c", 70);
  }
  if (m.swift) {   // 잔상은 시간 간격으로 남긴다(매 프레임이면 몸에 겹쳐 안 읽힌다) — 0.06s 마다 다섯 자국
    m.trailT = (m.trailT || 0) - dt;
    if (m.trailT <= 0) {
      m.trailT = 0.06;
      (m.trail || (m.trail = [])).unshift({ x: m.x, y: m.y, dir: actorDir(m), state: m.state, fr: frame(m, m.base) });
      if (m.trail.length > 5) m.trail.pop();
    }
  }
}
// 십자 번개 넷 — 죽는 자리에서 상·하·좌·우로. 경고 0.4s 뒤 그 선 위 사람에게 한 번 피해.
function spawnAffixBolts(x, y, dmg) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of dirs) G.bolts.push({ x, y, dx, dy, warn: 0.4, life: 0.55, dmg, fired: false });
}
function stepBolts(dt) {
  if (!G.bolts || !G.bolts.length) return;
  const p = G.player;
  for (const b of G.bolts) {
    if (b.warn > 0) { b.warn -= dt; if (b.warn <= 0) fireBolt(b, p); continue; }
    b.life -= dt;
  }
  G.bolts = G.bolts.filter((b) => b.warn > 0 || b.life > 0);
}
function fireBolt(b, p) {
  b.fired = true;
  const px = p.x - b.x, py = p.y - b.y;
  const along = px * b.dx + py * b.dy, perp = Math.abs(px * -b.dy + py * b.dx);
  if (along >= -AFFIX_BOLT_HALF && along <= AFFIX_BOLT_LEN && perp <= AFFIX_BOLT_HALF) {
    dotPlayer(b.dmg); p.hurt = Math.max(p.hurt, 0.14); cam.shake = Math.max(cam.shake, 9);
  }
  for (let i = 0; i < 10; i++) burst(b.x + b.dx * i * 22, b.y + b.dy * i * 22, "#bfeaff", 160);
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
      if (m.affix) affixMobTick(m, p, dt);   // V-246 — 화상 aura·잔상은 스턴 중에도(수동 효과)
      if (m.stun > 0) { m.stun -= dt; m.hit = Math.max(0, m.hit - dt); continue; }
      if (m.boss) { stepBoss(m, p, dt, pk); continue; }
      if (m.ranged && globalThis.__RANGED_MOB) { stepRanged(m, p, dt); continue; }
      if (m.charger && globalThis.__CHARGER_MOB) { stepCharger(m, p, dt); continue; }
      if (m.bomber && globalThis.__BOMBER_MOB) { stepBomber(m, p, dt, pk); continue; }
      if (m.thief && globalThis.__MOBKIND !== false) { stepThief(m, p, dt); continue; }
      let tx = p.x, ty = p.y, td = (p.x - m.x) ** 2 + (p.y - m.y) ** 2;
      for (const s of G.minions) {
        const d = (s.x - m.x) ** 2 + (s.y - m.y) ** 2;
        if (d < td) { td = d; tx = s.x; ty = s.y; }
      }
      const taunt = tauntTargetFor(m);
      if (taunt) { tx = taunt.x; ty = taunt.y; td = (tx - m.x) ** 2 + (ty - m.y) ** 2; }
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
          m.atk = 0.9 * (m.swift ? 0.7 : 1);   // V-246 날랜 — 공격 간격 0.7배
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
  if (m.tele > 0) {
    // V-231 예고 — 멈춰 서서 사람을 겨눈다(아직 못박지 않음). tele 끝에 방향을 한 번 못박고 달린다.
    m.tele -= dt; m.state = "attack"; m.anim += dt * 6;
    if (m.tele <= 0) { m.cdx = m.dx; m.cdy = m.dy; m.charging = CHARGE_DUR; }
  } else if (m.charging > 0) {
    // V-231 — 달리는 동안은 못박은 방향(cdx/cdy)만 쓴다. 매 프레임 다시 겨누면 피할 수가 없다.
    m.charging -= dt;
    stepTo(m, m.x + m.cdx * m.spd * CHARGE_SPD_MUL * dt, m.y + m.cdy * m.spd * CHARGE_SPD_MUL * dt, m.r);
    m.state = "walk"; m.anim += dt * 14;
    if (dist < p.r + m.r + 8) { hurtPlayer(m.dmg * CHARGE_BITE); m.charging = 0; m.chargeCd = CHARGE_CD; }
    else if (m.charging <= 0) m.chargeCd = CHARGE_CD;
  } else if (m.chargeCd <= 0 && dist < CHARGE_RANGE) {
    m.tele = CHARGE_TELE; m.state = "attack";
  } else {
    stepTo(m, m.x + m.dx * m.spd * dt, m.y + m.dy * m.spd * dt, m.r);
    m.state = "walk"; m.anim += dt * 9;
  }
  if (m.kb.x || m.kb.y) { stepTo(m, m.x + m.kb.x * dt, m.y + m.kb.y * dt, m.r); m.kb.x *= 0.86; m.kb.y *= 0.86; if (Math.abs(m.kb.x) < 4) m.kb.x = 0; if (Math.abs(m.kb.y) < 4) m.kb.y = 0; }
}

// ★ V-231 새 수법 — 자폭병. 가장 가까운 표적(사람·소환수)을 쫓다 BOMB_TRIG 안에 붙으면 점화(멈춤).
//   원거리가 벽을 «넘는» 답이라면 자폭은 벽을 «깎는» 답이다 — 사람에 못 닿아도 소환수를 지우며 길을 연다.
//   스턴 중엔 stepEnemies 가 이 함수 진입 전에 continue 한다 → fuse 정지 = 스턴이 곧 해제 수단이다.
function stepBomber(m, p, dt, pk) {
  m.hit = Math.max(0, m.hit - dt);
  if (m.fuse > 0) {
    m.fuse -= dt; m.state = "attack"; m.anim += dt * 6;
    if (m.fuse <= 0) { bombExplode(m); return; }
  } else {
    let tx = p.x, ty = p.y, td = (p.x - m.x) ** 2 + (p.y - m.y) ** 2;
    for (const s of G.minions) { const d = (s.x - m.x) ** 2 + (s.y - m.y) ** 2; if (d < td) { td = d; tx = s.x; ty = s.y; } }
    const dist = Math.sqrt(td) || 1;
    m.dx = (tx - m.x) / dist; m.dy = (ty - m.y) / dist;
    m.anim += dt * 9;
    if (dist <= m.r + BOMB_REACH) { m.fuse = BOMB_FUSE; m.state = "attack"; }
    else { stepTo(m, m.x + m.dx * m.spd * dt, m.y + m.dy * m.spd * dt, m.r); m.state = "walk"; }
  }
  if (m.kb.x || m.kb.y) { stepTo(m, m.x + m.kb.x * dt, m.y + m.kb.y * dt, m.r); m.kb.x *= 0.86; m.kb.y *= 0.86; if (Math.abs(m.kb.x) < 4) m.kb.x = 0; if (Math.abs(m.kb.y) < 4) m.kb.y = 0; }
}
// V-231 — 자폭 터짐. 반경 BOMB_R 안의 소환수·사람을 깎고, «자기도» killEnemy 로 죽는다(옛 사망 경로 그대로 → 시체·kills).
function bombExplode(m) {
  const r2 = BOMB_R * BOMB_R;
  for (let i = G.minions.length - 1; i >= 0; i--) {
    const s = G.minions[i];
    if ((s.x - m.x) ** 2 + (s.y - m.y) ** 2 <= r2) { s.hp -= m.dmg * BOMB_MINION; if (s.hp <= 0) killMinion(s); }
  }
  const p = G.player;
  if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 <= r2) hurtPlayer(m.dmg * BOMB_PLAYER);
  for (let i = 0; i < 16; i++) burst(m.x, m.y - m.h * 0.4, "#ff9030", 220);
  cam.shake = Math.max(cam.shake, 12); flash = Math.max(flash, 0.18); flashColor = "255,150,60";
  killEnemy(m);
}

// ★ V-237 시체 도둑 — 바닥의 성한 시체(안 쓴 것 = 사람의 자원)를 향해 달려가 삼켜 «없앤다». 삼킬 시체가
//   없으면 여느 잡몹처럼 사람을 쫓아 문다(방에 시체가 있는 동안만 자원 도둑, 없으면 그냥 적). 삼킬 때 보라 넋이
//   솟아 시체가 사라진 것이 눈에 보인다 — 안 그러면 사람은 「왜 시체가 없지」만 겪는다.
function stepThief(m, p, dt) {
  m.hit = Math.max(0, m.hit - dt);
  m.eatCd = Math.max(0, (m.eatCd || 0) - dt);
  m.eatGlow = Math.max(0, (m.eatGlow || 0) - dt);
  const ci = nearestCorpse(m.x, m.y, THIEF_SENSE);
  if (ci >= 0) {
    const c = G.corpses[ci];
    const dx = c.x - m.x, dy = c.y - m.y, dist = Math.hypot(dx, dy) || 1;
    m.dx = dx / dist; m.dy = dy / dist;
    if (dist > THIEF_EAT_REACH) {
      stepTo(m, m.x + m.dx * m.spd * THIEF_SPD_MUL * dt, m.y + m.dy * m.spd * THIEF_SPD_MUL * dt, m.r);
      m.state = "walk"; m.anim += dt * 10;
    } else {
      m.state = "attack"; m.anim += dt * 6;
      if (m.eatCd <= 0) thiefEat(m, ci);
    }
  } else {
    let tx = p.x, ty = p.y, td = (p.x - m.x) ** 2 + (p.y - m.y) ** 2;
    for (const s of G.minions) { const d = (s.x - m.x) ** 2 + (s.y - m.y) ** 2; if (d < td) { td = d; tx = s.x; ty = s.y; } }
    const dist = Math.sqrt(td) || 1;
    m.dx = (tx - m.x) / dist; m.dy = (ty - m.y) / dist;
    m.atk -= dt;
    if (dist > m.r + 30) { stepTo(m, m.x + m.dx * m.spd * dt, m.y + m.dy * m.spd * dt, m.r); m.state = "walk"; m.anim += dt * 9; }
    else {
      m.state = "attack"; m.anim += dt * 9;
      if (m.atk <= 0) { m.atk = 0.9; if (tx === p.x && ty === p.y) hurtPlayer(m.dmg); else { const s = G.minions.find((s) => s.x === tx && s.y === ty); if (s) { s.hp -= m.dmg; if (s.hp <= 0) killMinion(s); } } }
    }
  }
  if (m.kb.x || m.kb.y) { stepTo(m, m.x + m.kb.x * dt, m.y + m.kb.y * dt, m.r); m.kb.x *= 0.86; m.kb.y *= 0.86; if (Math.abs(m.kb.x) < 4) m.kb.x = 0; if (Math.abs(m.kb.y) < 4) m.kb.y = 0; }
}
// 시체 한 구를 삼킨다 — 배열에서 «빼서» 눈에 보이게 없애고(자원 감소), 넋이 솟는 연출을 남기고, 자기를 회복한다.
function thiefEat(m, ci) {
  const c = G.corpses[ci];
  G.corpses.splice(ci, 1);
  m.hp = Math.min(m.maxhp, m.hp + m.maxhp * THIEF_HEAL);
  m.eatCd = THIEF_EAT_CD; m.eatGlow = 0.6;
  m.stole = (m.stole || 0) + 1;
  METRIC.thiefEaten = (METRIC.thiefEaten || 0) + 1;
  for (let i = 0; i < 14; i++) { const s = 60 + Math.random() * 120; G.parts.push({ x: c.x + (Math.random() * 2 - 1) * 10, y: c.y - c.h * 0.15, vx: (Math.random() * 2 - 1) * 40, vy: -s, life: 0.5 + Math.random() * 0.4, col: i & 1 ? "#c88ae0" : "#7a3ad0", r: 2 + Math.random() * 2.4 }); }
  cam.shake = Math.max(cam.shake, 3);
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
  if (m.hex > 0) m.hex -= dt;   // V-242 ② 제물 저주 시간 경과(hexF 가 이 값으로 주인 피해를 깎는다)
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
    if (m.atk <= 0) { m.atk = 0.9; if (onP) hurtPlayer(m.dmg * hexF(m)); else { const s = G.minions.find((s) => s.x === tx && s.y === ty); if (s) { s.hp -= m.dmg * hexF(m); if (s.hp <= 0) killMinion(s); } } }
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
    if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < (p.r + m.r + 12) ** 2) hurtPlayer(m.dmg * 1.4 * hexF(m));
    if (c.t <= 0) { c.phase = "sweepWarn"; c.t = 0.42; c.cx = m.x; c.cy = m.y; c.r = m.r + 150; }
    return;
  }
  if (c.phase === "sweepWarn") {                         // 도살자 — 멈춘 자리에서 광역 후려치기
    if (c.t <= 0) {
      cam.shake = Math.max(cam.shake, 16);
      if ((p.x - c.cx) ** 2 + (p.y - c.cy) ** 2 < c.r * c.r) hurtPlayer(m.dmg * 1.2 * hexF(m));
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
    G.hazards.push({ x: c.cx, y: c.cy, r: 120, warn: 0, life: POOL_LIFE, dmg: (10 + G.floor * 2) * hexF(m) });
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
// 뼈 우리(뼈 왕)는 사람만 막는다(가두는 함정) — 적·소환수는 지난다. 사람 이동만 walkableP 로 판정한다.
//   V-232 — 사람이 세운 뼈벽(b.foe)은 그 반대다. bonesBlock 은 b.foe 를 건너뛰어 사람은 제 벽을 지나고,
//   foeWallBlock 이 stepTo(적·소환수 이동) 한 자리에서 b.foe 만 막는다. unstick(walkable)은 안 건드려
//   벽에 낀 적이 지형 벽 «밖»으로 밀려나지 않는다(hs_v207_walk 불변식).
function bonesBlock(x, y, r) {
  for (const b of G.bones) { if (b.foe) continue; const rr = b.r + r, dx = x - b.x, dy = y - b.y; if (dx * dx + dy * dy < rr * rr) return true; }
  return false;
}
function foeWallBlock(x, y, r) {
  if (globalThis.__BONEWALL === false) return false;
  for (const b of G.bones) { if (!b.foe) continue; const rr = b.r + r, dx = x - b.x, dy = y - b.y; if (dx * dx + dy * dy < rr * rr) return true; }
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
    if (s.drainT > 0) s.drainT -= dt;
    if (s.golem && globalThis.__GOLEMKIND !== false && globalThis.__MINIONKIND !== false) {
      s.tauntActive = Math.max(0, (s.tauntActive || 0) - dt);
      s.tauntCd = (s.tauntCd || 0) - dt;
      if (s.tauntCd <= 0) { s.tauntCd = GOLEM_TAUNT_CD; golemTaunt(s); }
      golemBlock(s);
    }
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
          else { const eff = hurtEnemy(target, s.dmg, s.dx, s.dy, "minion"); if (s.ghoul && s.drain) ghoulDrain(s, eff); }
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

function killMinion(s) {
  const i = G.minions.indexOf(s); if (i >= 0) G.minions.splice(i, 1);
  if (G.player.uniques.has("boneBurst")) boneShards(s);
}
// boneBurst 유니크 — 소환수가 스러진 자리에서 뼈 파편이 터져 반경 안 적을 문다(피해는 소환수 배수를 탄다).
function boneShards(s) {
  const dmg = (30 + G.floor * 8) * G.player.minionMul;
  forEachEnemy((m) => {
    const dx = m.x - s.x, dy = m.y - s.y;
    if (dx * dx + dy * dy < BONEBURST_R * BONEBURST_R) hurtEnemy(m, dmg, dx, dy);
  });
  for (let k = 0; k < 14; k++) burst(s.x, s.y - 20, "#e8ecf0", 180);
}

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
    if (!sp.dead) for (const b of G.bones) {   // V-230 뼈 창이 뼈 우리를 부순다(갇힌 데서 나가게) · V-232 제 뼈벽(foe)은 안 부순다
      if (b.foe) continue;
      if ((b.x - sp.x) ** 2 + (b.y - sp.y) ** 2 < (b.r + 9) ** 2) { b.hp -= sp.dmg; sp.dead = true; for (let i = 0; i < 5; i++) burst(b.x, b.y, "#e8ecf0", 120); break; }
    }
  }
  G.spears = G.spears.filter((s) => !s.dead);
}

function hurtEnemy(m, dmg, dx, dy, src) {
  if (m.hex > 0) dmg *= HEX_VULN;   // V-242 ② 제물 저주가 걸린 주인은 받는 피해가 늘어난다(비-주인은 m.hex undefined → 불변)
  if (m.afxShell && src === "minion") dmg *= 0.4;   // V-246 뼈 껍질 — 소환수 피해 60% 막음(직접 때려야 죽는다)
  const eff = Math.min(dmg, Math.max(0, m.hp));
  if (src) METRIC[src] += eff;
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
  if (m.hp <= 0) {
    if (m.afxRevive && !m.revived) reviveMob(m);   // V-246 되살아나는 — 처음 죽으면 40% 체력으로 한 번 일어난다
    else killEnemy(m);
  }
  return eff;
}
function reviveMob(m) {
  m.revived = true; m.hp = m.maxhp * 0.4; m.stun = 0.35; m.kb.x = 0; m.kb.y = 0;
  m.name = m.name + " (부활)";   // 이름표에 표식 — 뒤에 「(부활)」(수식어 이름과 안 겹치게)
  for (let i = 0; i < 18; i++) burst(m.x, m.y - m.h * 0.4, "#e8cf52", 170);
  cam.shake = Math.max(cam.shake, 7);
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
  if (m.afxBolt) spawnAffixBolts(m.x, m.y, m.dmg * 2);   // V-246 번개 튀는 — 죽을 때 십자 번개 넷(경고 0.4s)
  if (m.elite) journalStat("elite");
  if (G.player.uniques.has("corpseMana")) G.player.mana = Math.min(G.player.maxmana, G.player.mana + CORPSE_MANA);
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
  if (m.thief && globalThis.__MOBKIND !== false) {   // V-237 — 도둑을 잡으면 삼킨 넋이 시체로 돌아온다(먼저 잡을 이유)
    const back = Math.min(THIEF_BACK, 1 + (m.stole || 0));
    for (let i = 0; i < back; i++) {
      G.corpses.push({ x: m.x + (i + 1) * 22 * (i % 2 ? 1 : -1), y: m.y + 10 + i * 8, base: "mob/skelarch", dir: "s", h: 78, used: false, t: 0 });
      for (let k = 0; k < 6; k++) burst(m.x, m.y - m.h * 0.3, "#c89bff", 120);
    }
    if (G.corpses.length > 200) G.corpses.splice(0, G.corpses.length - 200);
  }
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
    if (uniqueOn() && Math.random() < MYTHIC_BOSS_CHANCE) dropItemAt(m.x + 54, m.y + 22, rollMythic(G.floor));   // V-241 — 주인은 규칙형 유니크도 · V-242 ③ 두 물건을 떼어 놓아 바닥 이름표가 안 겹치게
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
  if (globalThis.__POTION !== false && Math.random() < (m.elite ? POTION_DROP_ELITE : POTION_DROP))
    dropPotion(m.x, m.y, Math.random() < 0.5 ? "hp" : "mp");
  if (globalThis.__GEM !== false && Math.random() < (m.elite ? GEM_DROP_ELITE : GEM_DROP))
    dropGem(m.x, m.y, G.floor);
}

function dropItemAt(x, y, it) {
  if (!it) return;
  const a = Math.random() * 6.283, s = 40 + Math.random() * 60;
  G.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, item: it, t: 0 });
}

function dropBuild(x, y) {
  const item = rollBuildAffix();
  const a = Math.random() * 6.283, s = 40 + Math.random() * 70;
  G.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, item, t: 0 });
}

function spawnItem(x, y, lucky) {
  const it = rollItem(G.floor, lucky || !!(G.ascBuffs && G.ascBuffs.gold));   // V-239 — 탐욕의 손: 드랍 운 ↑
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
  p.slots = BASE_SLOTS + s.slot + p.buildSlots + (p.altarSlots ?? 0);   // V-234 — 뼈의 제단이 얹는 영구 소환 자리(기존 자리 셈과 같은 경로)
  p.maxGrade = s.grade;
  if (p.grade > p.maxGrade) p.grade = p.maxGrade;
  p.spd = BASE_SPD * (1 + g.moveSpeed / 100);
  p.atkCd = SPEAR_CD / (1 + g.atkSpeed / 100) / (1 + a.dex * ATTR.dex.per / 100);
  p.goldMul = 1 + g.gold / 100;
  p.novaMul = 1 + g.novaRadius / 100;
  p.dr = Math.min(ATTR.def.cap / 100, a.def * ATTR.def.per / 100);
  p.maxhp = Math.round((BASE_HP + g.maxHp + a.vit * ATTR.vit.per) * p.mult.body * (p.altarHpMul ?? 1));   // V-234 — 피의 제단 영구 배수(생명만 · 마나는 안 건드린다)
  p.maxmana = Math.round((BASE_MANA + a.sta * ATTR.sta.per) * p.mult.body);
  // V-239 ① — 회차마다 고른 영구 배수를 이 문 끝에서 얹는다(recalc 는 매번 처음부터 다시 세우므로 누수 없음).
  const ab = (G && G.ascBuffs) || { dmg: 0, minion: 0, gold: 0 };
  if (ab.dmg) { const m = 1 + 0.25 * ab.dmg; p.dmgMul *= m; p.minionMul *= m; }
  if (ab.minion) { p.slots += ab.minion; p.minionMul *= 1 + 0.20 * ab.minion; }
  if (ab.gold) p.goldMul *= 1 + 0.35 * ab.gold;
  if (journalOn()) {   // V-241 — 일지 도전 보상(영구 자리·소환수%)도 이 문 끝에서 얹는다(회차·죽음 넘어 남음)
    p.slots += JOURNAL.slots;
    if (JOURNAL.minionPct) p.minionMul *= 1 + JOURNAL.minionPct / 100;
  }
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
  if (gear.mythic) journalStat("mythic");
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

function carryState() {
  return {
    player: G.player, minions: G.minions, pickLog: G.pickLog,
    kills: G.kills, picks: G.picks, gold: G.gold, xp: G.xp,
    deepest: G.deepest, returnFloor: G.returnFloor,
    ascension: G.ascension, ascBuffs: G.ascBuffs,
  };
}
function tryStairs() {
  const p = G.player;
  if (Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) >= 70) return;
  if (G.town) { returnFromTown(); return; }   // V-238 — 마을 문은 «가장 깊었던 층»으로 돌려보낸다(내려가지 않는다)
  start(G.floor + 1, carryState());
}

// ── V-238 마을 오가기 ──────────────────────────────────────────────────────
function enemyNear(x, y, r) {
  const r2 = r * r;
  for (const pk of G.packs) {
    if (!pk.awake) continue;
    for (const m of pk.enemies) if (m.alive && (m.x - x) ** 2 + (m.y - y) ** 2 < r2) return true;
  }
  return false;
}
function tryTownReturn() {
  if (!townOn() || G.town) return;
  const p = G.player;
  if (enemyNear(p.x, p.y, TOWN_SAFE_R)) { floatNote("적이 가까이 있다 — 귀환 못 함", "#c8a04a", 1.2); return; }
  if (p.townCast > 0) return;
  p.townCast = TOWN_CAST;
  floatNote("마을로 귀환…", "#d8b45a", 1.0);
}
function goTown() {
  start(G.deepest, carryState(), true);   // floor = deepest → 문으로 곧장 그 층 복귀(진행 안 되감김)
}
function returnFromTown() {
  start(G.returnFloor || G.deepest, carryState());   // 가장 깊었던 층을 새로 편다(같은 깊이)
}

// ── V-239 ① 회차(승천) — 마을 승천 제단에서 열린다. 처음부터 다시 · 영구 배수 3택. ──
function ascendReady() { return (G.deepest || 0) >= ASCEND_FLOOR; }
function nearShrine() {
  const s = G.ascendSpot; if (!s) return false;
  const p = G.player;
  return Math.hypot(p.x - s.x, p.y - s.y) < s.r + 44;
}
function tryAscend() {
  if (!G.town || !G.ascendSpot) { floatNote("승천 제단은 마을에 있다 (N 마을귀환)", "#c8a04a", 1.2); return; }
  if (ascOpen) { closeAscend(); return; }
  if (!nearShrine()) { floatNote("승천 제단 곁으로 가서 Y", "#c8a04a", 1.0); return; }
  if (!ascendReady()) {
    const rem = ASCEND_FLOOR - (G.deepest || 0);
    floatNote(`승천은 B${ASCEND_FLOOR}층부터 — ${rem}층 더 내려가야`, "#c8a04a", 1.8);
    return;
  }
  ascOpen = true; el("ascend").classList.add("on");
  el("tooltip").style.display = "none"; el("tooltip2").style.display = "none";
  renderAscend();
}
function closeAscend() { ascOpen = false; el("ascend").classList.remove("on"); }
function doAscend(choice) {
  if (!ascendReady() || !ASC_BUFF[choice]) return;
  G.ascension = (G.ascension || 0) + 1;
  G.ascBuffs[choice] = (G.ascBuffs[choice] || 0) + 1;
  const carry = carryState();
  carry.deepest = 0; carry.returnFloor = 0;   // 다음 회차는 다시 내려가야 문턱이 열린다
  closeAscend();
  if (shopOpen) closeShop();
  start(1, carry);
  floatNote(`승천 ${G.ascension}회 — ${ASC_BUFF[choice].name}`, ASC_BUFF[choice].col, 2.4);
}
function renderAscend() {
  if (!ascOpen) return;
  const root = el("ascend");
  const b = G.ascBuffs || { dmg: 0, minion: 0, gold: 0 };
  let h = `<div class="asctitle">승  천</div>`;
  h += `<div class="ascsub">B${G.deepest}층까지 내려섰다 — 처음부터 다시 시작하고 <b>영구 배수</b> 하나를 얻는다.</div>`;
  h += `<div class="ascsub2">지금 승천 <b>${G.ascension || 0}</b>회 · 회차마다 적도 세진다(적 ×${(1 + 0.12 * (G.ascension || 0)).toFixed(2)})</div>`;
  h += `<div class="ascpicks">`;
  for (const k of ["dmg", "minion", "gold"]) {
    const u = ASC_BUFF[k];
    h += `<button class="ascpick" data-asc="${k}" style="border-color:${u.col}">` +
      `<div class="apn" style="color:${u.col}">${u.name}</div>` +
      `<div class="apd">${u.desc}</div>` +
      `<div class="aps">현재 ${b[k] || 0}겹</div></button>`;
  }
  h += `</div><div class="aschint">고르면 즉시 1층부터 · 장비·성장·금은 그대로 · Y 닫기</div>`;
  root.innerHTML = h;
}
function bindAscend() {
  el("ascend").addEventListener("click", (e) => {
    const b = e.target.closest("[data-asc]"); if (!b) return;
    e.stopPropagation();
    doAscend(b.dataset.asc);
  });
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
const DMG_MERGE_WIN = 0.25;   // V-245 ① — 같은 대상에 이 시간(초) 안에 여러 번 들어가면 한 덩이로 합친다(합계 + 타수 ×N).
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
/* V-245 ① 큰 수 표기(PLAN ⑧ · __BIGNUM) — HUD 체력/마나·금·피해 숫자·상점 값·정산창이 전부 이
 * 한 함수를 지난다. 넉 자리부터 접어(1234→1.2천·1234567→1.2백만) 글자 사각이 두 배로 넓어져 칸을
 * 밀어내던 것을 막는다(성장창·툴팁의 원수 정확값은 그대로 둔다). __BIGNUM=false 면 옛 묶음 표기로
 * 되돌린다. 순수 표기라 genFloor 지문 밖. */
const NUM_UNITS = [[1e3, "천"], [1e6, "백만"], [1e8, "억"], [1e12, "조"]];
function fmtNum(n) {
  n = Math.round(Number(n) || 0);
  if (globalThis.__BIGNUM === false) return comma(n);
  const neg = n < 0 ? "-" : ""; n = Math.abs(n);
  if (n < 1000) return neg + n;
  // V-245 흠(a) — 999,999 가 「1000천」으로 접히던 것을 막는다. 반올림이 1000 에 닿으면 다음 단위로 굴린다.
  for (let i = 0; i < NUM_UNITS.length; i++) {
    const [div, suf] = NUM_UNITS[i], next = NUM_UNITS[i + 1] ? NUM_UNITS[i + 1][0] : Infinity;
    if (n < next) {
      const v = n / div, str = v < 100 ? v.toFixed(1) : "" + Math.round(v);
      if (parseFloat(str) >= 1000 && NUM_UNITS[i + 1]) continue;   // 위 단위로 굴린다(1000천 → 1.0백만)
      return neg + str + suf;
    }
  }
  return neg + Math.round(n / 1e12) + "조";
}
window.__fmtNum = fmtNum;
// V-245 흠(a) — 분자·분모를 «같은 자»로 접는다(옛건 분자만 접혀 「5.2백만 / 500」처럼 단위가 어긋났다).
function fmtPair(a, b) {
  a = Math.round(Number(a) || 0); b = Math.round(Number(b) || 0);
  if (globalThis.__BIGNUM === false) return comma(a) + " / " + comma(b);
  const mag = Math.max(Math.abs(a), Math.abs(b));
  if (mag < 1000) return a + " / " + b;
  let div = 1e3, suf = "천";
  for (const [d, s] of NUM_UNITS) if (mag >= d) { div = d; suf = s; }
  const f = (x) => { const v = x / div; return (v < 100 ? v.toFixed(1) : "" + Math.round(v)); };
  return f(a) + " / " + f(b) + suf;
}
window.__fmtPair = fmtPair;
// V-245 흠(b) — 알림 문구 안의 큰 수(넉 자리+)도 fmtNum 을 지나게 한다(「금 9000 모으다」 → 「금 9.0천 모으다」).
function foldNums(str) { return globalThis.__BIGNUM === false ? str : str.replace(/\d{4,}/g, (d) => fmtNum(+d)); }
function dmgTxt(n) { return fmtNum(n); }
function mulTxt(x) { return "×" + (x >= 1000 ? fmtNum(Math.round(x)) : x.toFixed(2)); }
function floatDmg(m, n, col) {
  n = Math.round(n);
  // ② 이 적의 숫자가 아직 살아있으면(t>0) 새로 만들지 말고 누적한다.
  const f0 = m._dmgFloat;
  if (f0 && f0.t > 0 && f0.mw > 0) {   // V-245 ① 0.25초 창 안이면 한 덩이로 — 합계 + 타수 ×N
    f0.acc += n; f0.hits++; f0.col = col;
    f0.txt = dmgTxt(Math.round(f0.acc)) + (f0.hits > 1 ? "  ×" + f0.hits : "");
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
  const f = { dmg: true, acc: n, hits: 1, mw: DMG_MERGE_WIN, col, txt: dmgTxt(n),
    x: m.x + (ox / ol) * 20 + (Math.random() * 2 - 1) * 14,
    y: m.y - m.h * 0.7 + (oy / ol) * 8 - Math.random() * 6,
    t: Math.min(1.1, 0.6 + Math.log10(Math.max(1, n)) * 0.12) };  // 큰 한 방일수록 오래 남는다
  m._dmgFloat = f;
  G.floats.push(f);
}
function stepFloats(dt) {
  for (const f of G.floats) { f.t -= dt; f.y -= (f.big ? 14 : 34) * dt; if (f.ring !== undefined) f.ring += 300 * dt; if (f.mw > 0) f.mw -= dt; }
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
let reservedFloatRects = [];   // V-237: 이번 프레임 세계-공간 판(제단 안내판 등)의 «화면» 사각 — drawFloats 가 이 위를 피해 쌓는다
const EMPTY_RECTS = [];
function onScreen(x, y, pad) { return !(x - cam.x < -pad || x - cam.x > VW / Z + pad || y - cam.y < -pad || y - cam.y > VH / Z + pad); }

function drawWorld() {
  PROF.mark = performance.now();
  reservedFloatRects = [];   // V-237 — 세계-공간 판 사각을 이 프레임분만 모은다(drawFloats 가 읽음)
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
  drawMobTele();
  PROF.seg("terrain");

  drawProps();
  PROF.seg("props");
  for (const c of G.corpses) {
    if (!onScreen(c.x, c.y, 120)) continue;
    if (globalThis.__CORPSEART === false) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = "#3a0d0d";
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.h * 0.28, c.h * 0.14, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      drawSprite8(ctx, c.base, c.dir, "idle", 0, c.x, c.y + 4, c.h * 0.7, "grayscale(0.6) brightness(0.5)");
      continue;
    }
    drawCorpse(c);
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
  drawPotions();
  drawGems();
  drawStairs();
  for (const ch of G.chests) drawChest(ch);
  for (const a of G.altars) drawAltar(a);
  drawBones();   // V-230 — 뼈 우리는 배우와 같은 층에 서지만 y정렬 밖(짧게 뜨는 함정)
  drawBolts();   // V-246 — 십자 번개(경고 점선·발사 흰 선)는 바닥 층에

  // ★ V-183 — 화면 밖 배우는 그리지 않는다. 밀도를 올리면 지도 곳곳의 깬 적을 다 그려
  //   프레임이 샌다 — 그림자·체력바까지 화면 밖에서 헛돈다. 그리는 목록에 넣기 전에 자른다.
  const drawList = [];
  barRects = [];
  silRects = [];
  ringRects = [];
  eliteLabels = [];
  pendingEliteLabels = [];
  pendingKindLabels = [];
  for (const s of G.minions) if (onScreen(s.x, s.y, 80)) drawList.push({ y: s.y, fn: () => drawActor(s, SKEL_BASE), near: nearPlayer(s) });
  forEachEnemy((m) => { if (onScreen(m.x, m.y, 80)) drawList.push({ y: m.y, fn: () => drawEnemy(m), near: false }); });
  if (G.town) for (const mc of G.merchants) if (onScreen(mc.x, mc.y, 120)) drawList.push({ y: mc.y, fn: () => drawMerchant(mc), near: false });
  drawList.sort((a, b) => a.y - b.y);
  for (const d of drawList) {
    if (d.near) ctx.globalAlpha = 0.45;   // 내 앞을 가리는 소환수는 비쳐 보이게
    d.fn();
    ctx.globalAlpha = 1;
  }
  drawCageOverlay();   // V-245 ②b — 우리뼈를 유닛 위에 반투명으로 덧그린다(유닛이 위에 그려져 왼쪽 절반이 끊겨 보이던 것 → 「가두는 우리」로 읽힘)
  window.__barRects = barRects;
  drawPlayer();                            // 주인공은 언제나 맨 위 — 무리 속에서도 읽힌다
  drawTownChannel();                       // V-238 — 귀환 시전 고리(사람 발밑)
  window.__silRects = silRects;
  window.__ringRects = ringRects;
  window.__eliteLabels = eliteLabels;
  for (const ch of G.chests) drawChestBeacon(ch);
  for (const a of G.altars) drawAltarBeacon(a);
  if (G.town) for (const mc of G.merchants) drawMerchantBeacon(mc);   // V-238
  if (G.town && G.ascendSpot && ascendOn()) drawAscendBeacon();       // V-239
  drawFoldedKindLabels();   // V-240 — 접은 갈래 이름표를 배우 위에 한 장씩(월드 변환 안·restore 앞)
  drawEliteNames();         // V-246 ③d — 정예/주인 이름표는 맨 위(유닛 전부보다 위)
  drawStairsLabel();        // V-246 ③d — 계단 안내는 이름표를 피해 그린다
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
const CORPSE_DIR = { n: "north", s: "south", e: "east", w: "west", ne: "north-east", nw: "north-west", se: "south-east", sw: "south-west" };
function drawCorpse(c) {   // V-243 ②d — 시체를 «알아볼 상아빛 유해»로. 발밑 뼈 고리가 화장(M)·제물(U)·소환(Q)의 대상임을 눈에 준다.
  const usable = !c.used;
  ctx.globalAlpha = 0.42; ctx.fillStyle = "#4a1212";
  ctx.beginPath(); ctx.ellipse(c.x, c.y, c.h * 0.24, c.h * 0.11, 0, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
  if (usable) {
    const pl = 0.5 + 0.5 * Math.abs(Math.sin(nowMs() / 440 + c.x * 0.05));
    ctx.globalAlpha = 0.34 + 0.22 * pl; ctx.strokeStyle = "#cdbb8c"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 2, c.h * 0.30, c.h * 0.14, 0, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const bfilt = usable ? "grayscale(1) brightness(1.08) sepia(0.4) saturate(1.15) contrast(0.96)" : "grayscale(1) brightness(0.5)";
  const cdir = CORPSE_DIR[c.dir] || (c.dir && c.dir.length > 2 ? c.dir : "south");   // V-243 ②d — 시체는 짧은 방향(s)으로 저장돼 옛 코드가 스프라이트를 못 찾아 붉은 얼룩만 남았다. 온전한 이름으로 편다.
  if (globalThis.__CORPSELAY === false) {   // V-244 ②a — 되돌림: 옛 「서 있는」 시체.
    if (!drawSprite8(ctx, c.base, cdir, "idle", 0, c.x, c.y + 4, c.h * 0.7, bfilt)) drawCrossBones(c.x, c.y, c.h * 0.32, usable);
    return;
  }
  const rot = (Math.floor(c.x) & 1 ? 1 : -1) * 1.16;   // V-244 ②a — 발을 축으로 옆으로 «넘어뜨린다»(좌우 번갈아). 눕고 납작해 내 소환수 해골과 갈린다.
  const H = c.h * 0.66;
  ctx.save(); ctx.translate(c.x, c.y + 1); ctx.rotate(rot); ctx.scale(1, 0.72);
  const ok = drawSprite8(ctx, c.base, cdir, "idle", 0, 0, H * 0.5, H, bfilt);   // V-245 ②a — 발밑이 아니라 몸 한가운데를 고리 중심에 둔다(넘어뜨려도 고리 밖으로 안 삐져나가게)
  ctx.restore();
  if (!ok) drawCrossBones(c.x, c.y, c.h * 0.32, usable);
}
function drawCrossBones(x, y, s, usable) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = usable ? "#d8c79a" : "#6b6152"; ctx.lineWidth = Math.max(2, s * 0.16); ctx.lineCap = "round";
  for (const a of [0.7, -0.7]) {
    ctx.save(); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
    for (const ex of [-s, s]) for (const ey of [-s * 0.18, s * 0.18]) { ctx.beginPath(); ctx.arc(ex, ey, s * 0.2, 0, 6.283); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}
function teleReach(x, y, dx, dy, maxLen, r) {   // V-243 ②c — 벽에 닿을 때까지 나아가는 길이. 경고선을 실제 돌진이 닿는 데까지만 긋는다.
  if (globalThis.__TELLCLIP === false) return maxLen;
  const step = 12;
  for (let d = step; d <= maxLen; d += step) if (!walkable(x + dx * d, y + dy * d, r)) return Math.max(0, d - step);
  return maxLen;
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
          const reach = teleReach(m.x, m.y, Math.cos(c.dir), Math.sin(c.dir), 640, m.r || 18);   // V-243 ②c — 경고선을 벽에서 끊는다(돌진이 닿는 데까지만).
          ctx.lineWidth = 26; ctx.strokeStyle = `rgba(255,50,40,${0.22 + 0.4 * prog})`;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(c.dir) * reach, m.y + Math.sin(c.dir) * reach); ctx.stroke();
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
function drawMobTele() {   // V-231 — 잡몹 수법 예고(돌진선·자폭 고리). 상태는 m.tele / m.fuse 하나만 읽는다(두 곳에 안 둔다).
  for (const pk of G.packs) {
    if (!pk.awake) continue;
    for (const m of pk.enemies) {
      if (!m.alive) continue;
      if (m.tele > 0) {   // 돌진 예고 — 겨눈 방향(m.dx/dy)으로 붉은 띠, 남을수록 옅고 찰수록 진하게
        const prog = 1 - m.tele / CHARGE_TELE, len = teleReach(m.x, m.y, m.dx, m.dy, CHARGE_RANGE * 0.8, m.r || 18);
        ctx.lineWidth = 20; ctx.strokeStyle = `rgba(255,50,40,${0.16 + 0.42 * prog})`;
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.dx * len, m.y + m.dy * len); ctx.stroke();
      } else if (m.fuse > 0) {   // 자폭 예고 — 발밑 붉은 고리, fuse 줄수록 진하고 두껍게
        const prog = 1 - m.fuse / BOMB_FUSE;
        ctx.globalAlpha = 0.4 + 0.5 * prog;
        ctx.strokeStyle = "#ff3828"; ctx.lineWidth = 2 + 5 * prog;
        ctx.beginPath(); ctx.arc(m.x, m.y, BOMB_R, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
}
function drawBones() {   // 뼈 왕의 우리 — 창백한 뼈 기둥, 금 갈수록 어두워진다(부술 수 있다는 표)
  drawCageRails();
  for (const b of G.bones) {
    if (!onScreen(b.x, b.y, 60)) continue;
    const hpf = Math.max(0, b.hp / b.maxhp), h = 46;
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.globalAlpha = 0.4; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 4, b.r * 0.9, b.r * 0.4, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    if (b.foe || globalThis.__BONECAGE !== false) {   // V-243 ②b — 우리뼈(!foe)도 상아 뼈 기둥으로(옛 흰 무지 오각형 아님). __BONECAGE=false 로 옛 그림.
      drawBoneChunk(b.r, h, hpf, !b.foe); ctx.restore(); continue;
    }
    ctx.fillStyle = `rgb(${(150 + 90 * hpf) | 0},${(145 + 90 * hpf) | 0},${(125 + 80 * hpf) | 0})`;
    ctx.fillRect(-b.r * 0.55, -h, b.r * 1.1, h);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 1; i < 4; i++) ctx.fillRect(-b.r * 0.55, -h * i / 4, b.r * 1.1, 2);
    ctx.fillStyle = `rgb(${(175 + 80 * hpf) | 0},${(170 + 80 * hpf) | 0},${(150 + 70 * hpf) | 0})`;
    ctx.beginPath(); ctx.moveTo(-b.r * 0.55, -h); ctx.lineTo(0, -h - 14); ctx.lineTo(b.r * 0.55, -h); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
function drawCageRails() {   // V-244 ②b — 창살(뼈 토막)을 위·아래 상아 테로 이어 «가두는 우리»로 읽히게 한다(듬성한 기둥 무더기 아님).
  if (globalThis.__BONECAGE === false) return;
  let sx = 0, sy = 0, n = 0;
  for (const b of G.bones) if (!b.foe) { sx += b.x; sy += b.y; n++; }
  if (n < 3) return;
  const cx = sx / n, cy = sy / n;
  if (!onScreen(cx, cy, CAGE_R + 80)) return;
  let sr = 0; for (const b of G.bones) if (!b.foe) sr += Math.hypot(b.x - cx, b.y - cy);
  const rx = sr / n, ry = rx * 0.42;
  ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(198,180,138,0.55)";
  strokeCageRing(cx, cy, rx, ry, 0);    // V-246 ③e — 바닥 테는 벽 밖 조각을 지운다(walkable 로 잘라라)
  strokeCageRing(cx, cy, rx, ry, 40);   // 들린 테(원래 cy-40)도 같은 바닥점으로 잘라 벽 밖에 안 뜬다
  ctx.restore();
}
// 벽 밖 조각을 지운 채 테를 그린다 — 바닥점(gx,gy)이 walkable 인 구간만 이어 긋는다(lift 만큼 올려 그림).
function strokeCageRing(cx, cy, rx, ry, lift) {
  const N = 60; let drawing = false;
  for (let i = 0; i <= N; i++) {
    const a = i / N * 6.283, gx = cx + Math.cos(a) * rx, gy = cy + Math.sin(a) * ry;
    if (walkable(gx, gy, 4)) {
      if (!drawing) { ctx.beginPath(); ctx.moveTo(gx, gy - lift); drawing = true; }
      else ctx.lineTo(gx, gy - lift);
    } else if (drawing) { ctx.stroke(); drawing = false; }
  }
  if (drawing) ctx.stroke();
}
function drawCageOverlay() {   // V-245 ②b — 유닛을 다 그린 뒤 우리뼈를 반투명으로 다시 얹어 «가두는 것»으로 읽히게 한다.
  if (globalThis.__BONECAGE === false) return;
  const cage = G.bones.filter((b) => !b.foe);
  if (cage.length < 3) return;
  let cx = 0, cy = 0; for (const b of cage) { cx += b.x; cy += b.y; } cx /= cage.length; cy /= cage.length;
  if (!onScreen(cx, cy, CAGE_R + 80)) return;
  ctx.save(); ctx.globalAlpha = 0.5;
  drawCageRails();
  for (const b of cage) {
    if (!onScreen(b.x, b.y, 60)) continue;
    ctx.save(); ctx.translate(b.x, b.y); drawBoneChunk(b.r, 46, Math.max(0, b.hp / b.maxhp), true); ctx.restore();
  }
  ctx.restore();
}
function drawBoneChunk(r, h, hpf, cage) {
  const iv = (hi, lo) => (lo + (hi - lo) * hpf) | 0;
  const wr = cage ? -12 : 0, wg = cage ? -4 : 0, wb = cage ? -32 : 0;   // V-243 ②b — 우리뼈는 파랑을 더 빼 «누런 상아»로(흰색으로 안 뜨게)
  const cc = (rh, rl, gh, gl, bh, bl) => `rgb(${Math.max(0, iv(rh, rl) + wr)},${Math.max(0, iv(gh, gl) + wg)},${Math.max(0, iv(bh, bl) + wb)})`;
  const boneA = cc(228, 150, 220, 142, 196, 120);
  const boneB = cc(198, 120, 188, 112, 160, 92);
  const boneHi = cc(244, 182, 238, 174, 214, 152);
  const w = r * 0.6, knob = r * 0.5;
  if (cage) {   // V-243 ②b — 우리뼈는 어두운 테두리로 도형의 윤곽을 준다(미완성 흰 상자로 안 보이게).
    ctx.strokeStyle = "rgba(46,34,20,0.7)"; ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - 1, -h + knob, w + 2, h - knob * 2);
  }
  ctx.fillStyle = boneB; ctx.fillRect(-w / 2 - 1, -h + knob, w + 2, h - knob * 2);
  ctx.fillStyle = boneA; ctx.fillRect(-w / 2, -h + knob, w, h - knob * 2);
  for (const ky of [-h + knob * 0.7, -knob * 0.7]) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = boneB; ctx.beginPath(); ctx.arc(sx * knob * 0.5, ky, knob * 0.74, 0, 6.283); ctx.fill();
      ctx.fillStyle = boneA; ctx.beginPath(); ctx.arc(sx * knob * 0.5, ky, knob * 0.58, 0, 6.283); ctx.fill();
    }
  }
  ctx.fillStyle = boneHi; ctx.fillRect(-w * 0.3, -h + knob, Math.max(2, w * 0.2), h - knob * 2);
  ctx.fillStyle = "rgba(60,44,30,0.35)";
  for (let i = 1; i < 3; i++) ctx.fillRect(-w / 2, -h + knob + (h - knob * 2) * i / 3, w, 1.5);
}
function drawBossBanner() {   // 들어설 때 한 번 — 이름을 화면 가운데 크게
  const bn = G.bossBanner; if (!bn) return;
  if (globalThis.__BOSSNAME !== false) return;   // V-243 ②a — 큰 가운데 글 폐지. 주인 이름은 머리 위 한 자리(drawEnemy)에만.
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
    const dh = pr.img === "decor/bones2.png" ? pr.h * BONES2_DRAW : pr.h;   // V-241 — 서 있는 해골 소품은 그리기만 줄인다(발자국·RNG 는 map.js PROP_H 그대로)
    const w = dh * (im.width / im.height);
    const fo = spriteFoot(im, pr.img);
    // ★★ V-162 — **방법을 뒤집었다.** V-158·V-160 은 그림을 파일 그대로 놓고 «그림자를
    //   그림에 맞춰 옮기는» 쪽이었다 — 그래서 잰 값이 조금만 어긋나도 그림자가 따로 논다
    //   (두 번 고치고도 화로가 20px 밀려 떠 있었다). 이제 반대다: **그림의 «보이는 밑변»을
    //   월드 바닥선(pr.y)에 맞춰 놓고**, 그림자는 그 자리(pr.x, pr.y)에 그린다.
    //   그러면 그림자는 어긋날 자리가 없다 — 정의상 발밑이다. ★ [[seam-not-values]]
    const dx = pr.x - (fo ? fo.cx * w : w / 2);          // 보이는 가로중심 → pr.x
    const dy = pr.y - (fo ? fo.b * dh : dh);         // 보이는 밑변     → pr.y
    const rx = (fo ? fo.w * w : w) * 0.34;
    // ★ V-163 — 어두운 바닥 위에서 42% 검정은 **안 보인다**(항아리는 그림자가 없는 줄 알았다).
    //   진하게 하되 번지지 않게 — 안쪽은 짙고 가장자리는 사라지는 결로.
    groundMark(pr.x, pr.y, rx, Math.max(4, Math.min(rx * 0.42, dh * 0.2)));
    ctx.globalAlpha = 1;
    ctx.drawImage(im, dx, dy, w, dh);
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
let pendingEliteLabels = [];   // V-246 ③d: 배우를 다 그린 뒤 한 판으로 그리는 정예/주인 이름표(늘 유닛 위)
let eliteNameRects = [];       // V-246 ③d: 실제로 그린 이름표 «화면» 사각 — 계단 안내가 이걸 피한다
function drawEliteNames() {
  eliteNameRects = [];
  for (const q of pendingEliteLabels) {
    ctx.font = "bold " + q.bold + "px 'Times New Roman',serif"; ctx.textAlign = "center";
    ctx.save(); ctx.translate(q.wx, q.wy); ctx.scale(1 / Z, 1 / Z);
    ctx.fillStyle = "#000"; ctx.fillText(q.nm, 0.8, 0.8);
    ctx.fillStyle = q.col; ctx.fillText(q.nm, 0, 0);
    ctx.restore();
    const hw = ctx.measureText(q.nm).width / 2 + 2, sx = (q.wx - cam.x) * Z, sy = (q.wy - cam.y) * Z;
    eliteNameRects.push({ x0: sx - hw, y0: sy - q.bold, x1: sx + hw, y1: sy });
  }
}
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
  const fed = (globalThis.__FEED !== false && s.feed) ? s.feed : 0;
  drawShadow(s.x, s.y, s.r, ringsOn() ? (s.ringCol || "#3d78c8") : null, s.ring || 2.5);
  const golemKind = s.golem && globalThis.__GOLEMKIND !== false && globalThis.__MINIONKIND !== false;
  if (golemKind && s.tauntActive > 0) {   // V-240 도발 — 발밑 금빛 고리(맥동). 반경 안 적을 끄는 동안 켜진다.
    const puls = 0.5 + 0.5 * Math.abs(Math.sin(nowMs() / 130));
    ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * puls; ctx.strokeStyle = "#e8b840"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, GOLEM_TAUNT_R * 0.42 * (0.8 + 0.2 * puls), GOLEM_TAUNT_R * 0.20 * (0.8 + 0.2 * puls), 0, 0, 6.283); ctx.stroke(); ctx.restore();
  }
  let filt;
  if (fed) filt = `sepia(1) saturate(${2.4 + fed * 0.45}) hue-rotate(-24deg) brightness(${0.98 + fed * 0.015}) contrast(1.12)`;
  else if (s.ghoul) filt = GHOUL_TINT;
  else if (golemKind) filt = GOLEM_TINT;
  else filt = teamTintOn() ? ALLY_TINT : (s.filt || null);
  const dh = (fed ? s.h * (1 + 0.06 * fed) : s.h) * (golemKind ? GOLEM_DRAW_BULK : 1);
  if (fed) {
    const cy = s.y - dh * 0.42, a = 0.12 + 0.05 * fed;
    const g = ctx.createRadialGradient(s.x, cy, dh * 0.08, s.x, cy, dh * 0.62);
    g.addColorStop(0, `rgba(196,18,22,${a})`);
    g.addColorStop(0.6, `rgba(150,10,14,${a * 0.5})`);
    g.addColorStop(1, "rgba(150,10,14,0)");
    ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, cy, dh * 0.5, dh * 0.62, 0, 0, 6.283); ctx.fill(); ctx.restore();
  }
  if (s.drainT > 0) {   // V-240 피 빨기 순간 초록 후광 — 빨았음을 몸에서 읽히게
    const cy = s.y - dh * 0.42, a = 0.4 * (s.drainT / 0.18);
    ctx.save(); ctx.fillStyle = `rgba(95,224,138,${a})`; ctx.beginPath(); ctx.ellipse(s.x, cy, dh * 0.42, dh * 0.52, 0, 0, 6.283); ctx.fill(); ctx.restore();
  }
  if (!drawSprite8(ctx, base, actorDir(s), s.state, frame(s, base), s.x, s.y, dh, filt))
    fallbackBlob(s.x, s.y, dh, s.ghoul ? "#8fe0a8" : "#d8e8d0");
  if (teamTintOn() && s.tier > 0) drawTierCrest(s, base);
  if (s.ghoul || golemKind) {   // V-240 — 구울/골렘은 머리 위 이름표로 해골과 갈린다(색은 teamTint 에 묻혀도 이름은 읽힌다). __LABELFOLD 로 접힌다.
    const wtop = opaqueHeadTop(base, s.y, dh) - 2;
    if (s.ghoul) pushKindLabel(s.x, wtop, "구울", "#7fe0a0");
    else pushKindLabel(s.x, wtop, "골렘", "#bcd0e8");
  }
}
const MOBKIND_META = {   // V-237 — 갈래별 머리 위 이름표(색은 몸 색조와 한 결)
  shoot:  { label: "사수",      col: "#7fe0d8" },
  charge: { label: "돌진꾼",    col: "#ff8a6a" },
  bomb:   { label: "자폭병",    col: "#ffb060" },
  thief:  { label: "시체 도둑", col: "#c89bff" },
};
// ── V-240 이름표 접기(__LABELFOLD) — 잡몹·소환수 갈래 이름표가 떼로 겹쳐 도배되던 것을 «같은 이름끼리 묶어 ×N» 한 장으로. ──
//   __LABELFOLD===false 면 옛 동작(이름표를 그 자리에서 그대로 그린다·안 접고·안 물린다).
let pendingKindLabels = [];
function pushKindLabel(wx, wtop, text, col) {
  if (globalThis.__LABELFOLD === false) { drawKindLabel(wx, wtop - 9, text, col); return; }
  pendingKindLabels.push({ wx, wtop, text, col });
}
function drawKindLabel(wx, wy, text, col) {
  ctx.font = "bold 10px 'Times New Roman',serif"; ctx.textAlign = "center";
  ctx.save(); ctx.translate(wx, wy); ctx.scale(1 / Z, 1 / Z);
  ctx.fillStyle = "#000"; ctx.fillText(text, 0.8, 0.8);
  ctx.fillStyle = col; ctx.fillText(text, 0, 0);
  ctx.restore();
}
// 같은 이름 + 화면상 가까운(가로 54·세로 40 px) 것끼리 한 무리로 묶어 무리마다 한 장(여럿이면 「이름 ×N」)을 무리 중앙에.
//   세로는 화면 상단 안쪽(18px)으로 물려 잘리지 않게 한다. 월드 변환 안에서 부른다(actors 뒤·restore 앞).
function drawFoldedKindLabels() {
  const items = pendingKindLabels;
  if (!items.length) return;
  const used = new Array(items.length).fill(false);
  const topY = cam.y + 18 / Z;
  const placed = [];   // V-244 ②d — 이번 프레임에 이미 앉힌 부하 이름표 화면사각(다른 이름끼리도 안 뭉치게 아래로 물린다).
  for (let i = 0; i < items.length; i++) {
    if (used[i]) continue;
    const a = items[i], asx = (a.wx - cam.x) * Z, asy = (a.wtop - cam.y) * Z;
    let sumx = a.wx, top = a.wtop, n = 1;
    for (let j = i + 1; j < items.length; j++) {
      if (used[j] || items[j].text !== a.text) continue;
      const bsx = (items[j].wx - cam.x) * Z, bsy = (items[j].wtop - cam.y) * Z;
      if (Math.abs(bsx - asx) < 54 && Math.abs(bsy - asy) < 40) { used[j] = true; sumx += items[j].wx; top = Math.min(top, items[j].wtop); n++; }
    }
    used[i] = true;
    let wy = Math.max(top - 9, topY);   // V-246 ③c — 앵커를 머리 «바로 위»(몸 위·-9)로. -3 은 유닛 몸에 잘렸고 -16 은 너무 떠 모호했다. 쌓을 때만 아래 루프가 위로 민다.
    const kx = (sumx / n - cam.x) * Z;
    const label = n > 1 ? `${a.text} ×${n}` : a.text;
    if (globalThis.__LABELFOLD !== false) {   // V-244 ②d — 부하 이름표끼리(다른 갈래 포함) 겹치면 아래로 쌓는다(drawFloats·barRects 와 같은 결). 주인 이름표(eliteLabels)도 피한다.
      ctx.font = "bold 10px 'Times New Roman',serif";
      const khw = ctx.measureText(label).width / 2 + 2;
      for (let g = 0; g < 24; g++) {
        const ky = (wy - cam.y) * Z;
        const hitE = globalThis.__BOSSNAME !== false && eliteLabels.find((q) => kx - khw < q.x1 && kx + khw > q.x0 && ky - 12 < q.y1 && ky > q.y0);
        const hitK = placed.find((q) => kx - khw < q.x1 && kx + khw > q.x0 && ky - 11 < q.y1 && ky > q.y0);
        const hit = hitE || hitK;
        if (!hit) break;
        wy = (hit.y1 + (hitE ? 14 : 12)) / Z + cam.y;
      }
      const ky = (wy - cam.y) * Z;
      placed.push({ x0: kx - khw, y0: ky - 11, x1: kx + khw, y1: ky });
    }
    drawKindLabel(sumx / n, wy, label, a.col);
  }
}
// V-246 ① 수식어 시각 — 발밑 고리(화상·번개)와 날랜 잔상은 몸 뒤에, 뼈 껍질 테는 몸 앞에.
function drawAffixGround(m) {
  if (m.swift && m.trail) for (let i = m.trail.length - 1; i >= 0; i--) {
    const t = m.trail[i];
    ctx.save(); ctx.globalAlpha = 0.34 * (1 - i / (m.trail.length + 1));
    if (!drawSprite8(ctx, m.base, t.dir, t.state, t.fr, t.x, t.y, m.h, "brightness(1.5) saturate(1.6) hue-rotate(70deg)"))
      fallbackBlob(t.x, t.y, m.h, "#9de060");
    ctx.restore();
  }
  if (m.afxBurn) {
    const puls = 0.5 + 0.5 * Math.abs(Math.sin(nowMs() / 160));
    ctx.save();
    ctx.globalAlpha = 0.14 + 0.10 * puls; ctx.fillStyle = "#ff5a2a";
    ctx.beginPath(); ctx.ellipse(m.x, m.y, AFFIX_BURN_R, AFFIX_BURN_R * 0.42, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.30 + 0.22 * puls; ctx.strokeStyle = "#ff5a2a"; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  if (m.afxBolt) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = "#7fd8ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r * 1.8, m.r * 0.74, 0, 0, 6.283); ctx.stroke(); ctx.restore();
  }
}
function drawShellOutline(m) {
  const cy = m.y - m.h * 0.42, rx = m.r * 1.55, ry = m.h * 0.5;
  ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = "#e6e0cc"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.283 - 1.5708; const px = m.x + Math.cos(a) * rx, py = cy + Math.sin(a) * ry; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.stroke(); ctx.restore();
}
function drawBolts() {
  if (!G.bolts || !G.bolts.length) return;
  for (const b of G.bolts) {
    if (b.warn > 0) {
      ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(nowMs() / 60));
      ctx.strokeStyle = "#7fd8ff"; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.dx * AFFIX_BOLT_LEN, b.y + b.dy * AFFIX_BOLT_LEN); ctx.stroke();
      ctx.restore();
    } else if (b.life > 0) {
      ctx.save(); ctx.globalAlpha = Math.max(0, b.life / 0.15); ctx.strokeStyle = "#eaffff"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.dx * AFFIX_BOLT_LEN, b.y + b.dy * AFFIX_BOLT_LEN); ctx.stroke();
      ctx.restore();
    }
  }
}
function drawEnemy(m) {
  // ★ V-207 — 잡몹 발밑 붉은 고리를 얇고 옅게(1.6px·α0.4). 팩 10~14 가 뭉치면 0.9 짜리
  //   고리가 겹쳐 바닥이 «붉은 그물»이 됐다(컷으로 봄). 정예는 눈에 띄어야 하니 굵게 둔다.
  drawShadow(m.x, m.y, m.r, ringsOn() ? (m.elite ? "#f0902a" : "#c0342c") : null,
    m.elite ? 2.5 : 1.6, m.elite ? 0.85 : 0.4);
  if (m.affix) drawAffixGround(m);   // V-246 — 화상 붉은 고리·번개 청록 고리·날랜 잔상(몸 뒤)
  const tb = m.tb & 3;
  let rest = teamTintOn() ? (m.elite ? ELITE_TINT : FOE_TINTS[tb])
    : (m.elite ? "brightness(1.15) saturate(1.4) hue-rotate(-15deg)" : null);
  if (m.ranged) rest = "brightness(1.1) saturate(1.8) hue-rotate(150deg)";
  else if (m.charger) rest = "brightness(1.15) saturate(2) hue-rotate(-40deg)";
  else if (m.bomber) rest = "brightness(1.2) saturate(2.4) hue-rotate(30deg)";   // V-231 — 돌진(-40)·원거리(150)와 안 겹치는 색조
  else if (m.thief) rest = "brightness(1.05) saturate(2.2) hue-rotate(250deg)";   // V-237 — 도둑 보라(자폭 30·원거리 150·돌진 -40 과 안 겹침)
  if (m.boss) rest = BOSS_TINT[m.bossKind];   // V-230 — 주인 넷을 색조로 가른다(뼈·초록·핏·보라)
  m.__tb = m.elite ? "E" : tb;
  const filt = m.hit > 0 ? "brightness(3)" : rest;
  const drawH = (m.bomber && m.fuse > 0) ? m.h * (1 + 0.35 * (1 - m.fuse / BOMB_FUSE)) : m.h;   // V-231 — 점화 중 몸이 부푼다
  if (m.thief && m.eatGlow > 0) {   // V-237 — 삼킨 직후 보라 넋 후광(먹었음을 몸에서도 읽히게)
    const cy = m.y - m.h * 0.42, a = 0.28 * m.eatGlow;
    const g = ctx.createRadialGradient(m.x, cy, m.h * 0.06, m.x, cy, m.h * 0.6);
    g.addColorStop(0, `rgba(170,90,224,${a})`); g.addColorStop(0.6, `rgba(120,50,208,${a * 0.5})`); g.addColorStop(1, "rgba(120,50,208,0)");
    ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(m.x, cy, m.h * 0.48, m.h * 0.6, 0, 0, 6.283); ctx.fill(); ctx.restore();
  }
  if (!drawSprite8(ctx, m.base, actorDir(m), m.state, frame(m, m.base), m.x, m.y, drawH, filt))
    fallbackBlob(m.x, m.y, drawH, "#8a5a5a");
  recordSil("mob", m.base, m.x, m.y, m.h);
  if (m.afxShell) drawShellOutline(m);   // V-246 뼈 껍질 — 몸을 두른 상아빛 육각 테
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
    const bossN = !!m.boss;   // V-230 — 주인 이름은 늘 머리 위에 크게(잡정예보다 큼·주인색)
    ctx.font = (bossN ? "bold 16px" : "bold 11px") + " 'Times New Roman',serif"; ctx.textAlign = "center";
    // V-240 — 주인 이름표가 화면 상단 밖으로 잘리던 것을 안으로 물린다(글자 높이만큼 여유). __LABELFOLD 로 되돌린다.
    const nameLift = bossN ? totalH + 8 : 6;   // V-245 ②c — 주인 이름은 제 바(높이 totalH) 위로 온전히 물린다(짧은 이름이 바에 반쯤 가리던 것을 막음).
    let labelY = (globalThis.__LABELFOLD !== false) ? Math.max(by - nameLift, cam.y + (bossN ? 24 : 16) / Z) : by - nameLift;
    const lsx = (m.x - cam.x) * Z;
    const lhw = ctx.measureText(nm).width / 2 + 2;
    let lsy = (labelY - cam.y) * Z;
    if (bossN && globalThis.__BOSSNAME !== false) {   // V-243 ②a — 주인 이름을 부하 이름표·체력바 위로 «물린다»(drawFloats 쌓기와 같은 결).
      const lfs = 15;
      for (let g = 0; g < 24; g++) {
        const hitB = barRects.find((q) => q !== undefined && (m.x - lhw / Z) < q.x1 && (m.x + lhw / Z) > q.x0 && lsy - lfs < (q.y1 - cam.y) * Z && lsy > (q.y0 - cam.y) * Z);
        const hitL = eliteLabels.find((q) => lsx - lhw < q.x1 && lsx + lhw > q.x0 && lsy - lfs < q.y1 && lsy > q.y0);
        const topScr = hitB ? (hitB.y0 - cam.y) * Z : hitL ? hitL.y0 : null;
        if (topScr === null) break;
        lsy = topScr - 3;
      }
      labelY = lsy / Z + cam.y;
    }
    const onBoom = V211() && labelOverBoom(lsx, lsy, lhw);
    // V-246 ③d — 이름표 텍스트를 «배우 뒤» 한 판으로 미룬다(앞에 선 유닛이 글을 반 가리던 것 → 늘 유닛 위·수식어 색).
    if (!onBoom)
      pendingEliteLabels.push({ wx: m.x, wy: labelY, nm,
        bold: bossN ? 16 : 11, col: bossN ? BOSS_LABEL_COL[m.bossKind] : (m.afxCol || "#8ac06a") });
    eliteLabels.push({ x0: lsx - lhw, y0: lsy - 13, x1: lsx + lhw, y1: lsy, drawn: !onBoom });
    recordBar(m, halfW, top, totalH, headTop, headTop - BAR_GAP, dir);
  } else if (hpf < 1) {
    const bw = m.r * 2.2, halfW = bw / 2 + 1, totalH = 6;
    const top = pushBarUp(m.x, halfW, headTop - BAR_GAP - totalH, totalH), by = top + 1;
    ctx.fillStyle = "#000a"; ctx.fillRect(m.x - bw / 2 - 1, by - 1, bw + 2, totalH);
    ctx.fillStyle = "#b0342e"; ctx.fillRect(m.x - bw / 2, by, bw * hpf, 4);
    recordBar(m, halfW, top, totalH, headTop, headTop - BAR_GAP, dir);
  }
  if (globalThis.__MOBKIND !== false && !m.elite && !m.boss && MOBKIND_META[m.mobKind]) {
    const meta = MOBKIND_META[m.mobKind];
    pushKindLabel(m.x, headTop - BAR_GAP, meta.label, meta.col);
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
}
// V-246 ③d — 계단 안내 글은 배우·이름표를 다 그린 뒤 그린다. 주인 이름표(eliteNameRects)와 겹치면 위로 비킨다.
function drawStairsLabel() {
  const s = G.stairs;
  const near = Math.hypot(G.player.x - s.x, G.player.y - s.y) < 70;
  ctx.fillStyle = near ? "#bfe8c8" : "#6a9a7a"; ctx.font = "13px 'Times New Roman',serif"; ctx.textAlign = "center";
  const stLabel = G.town
    ? (near ? `▲ F — 던전으로 (B${G.deepest}층)` : "▲ 던전으로")
    : (near ? "▼ F — 다음 층" : "▼ 아래로");
  const sx = (s.x - cam.x) * Z, hw = ctx.measureText(stLabel).width / 2 + 2;
  let sy = (s.y - STAIR_H / 2 - 10 - cam.y) * Z;
  for (let g = 0; g < 12; g++) {
    const hit = eliteNameRects.find((q) => sx - hw < q.x1 && sx + hw > q.x0 && sy - 13 < q.y1 && sy > q.y0);
    if (!hit) break;
    sy = hit.y0 - 4;
  }
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1 / Z, 1 / Z);
  ctx.fillText(stLabel, 0, 0);
  ctx.restore();
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
// ── V-235 바닥 물약 — 새 에셋 없이 코드 도형(병). 발밑 후광이 어둠 위로 띄운다([[gauge-asks-drawn-not-seen]]). ──
function drawPotions() {
  for (const q of G.potions) {
    if (!onScreen(q.x, q.y, 40)) continue;
    const P = POTION[q.kind];
    const cx = q.x, cy = q.y - 8 + Math.sin(nowMs() / 300 + q.x) * 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 17);
    g.addColorStop(0, P.glow + "cc"); g.addColorStop(1, P.glow + "00");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, 6.283); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(cx, cy + 13, 6, 2.4, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = P.col; ctx.strokeStyle = "#f4ecd8"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 2); ctx.lineTo(cx - 6, cy + 8);
    ctx.quadraticCurveTo(cx - 6, cy + 12, cx, cy + 12);
    ctx.quadraticCurveTo(cx + 6, cy + 12, cx + 6, cy + 8); ctx.lineTo(cx + 5, cy - 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#d8c89a"; ctx.fillRect(cx - 3, cy - 8, 6, 6);
    ctx.fillStyle = P.glow; ctx.fillRect(cx - 3.5, cy + 1, 2, 5);
  }
}
// V-236 바닥 보석 — 어두운 바닥 위에 뜨게 밝은 후광 + 각진 원석. 새 에셋 없이 코드 도형+색.
function drawGems() {
  if (globalThis.__GEM === false) return;
  for (const q of G.floorGems) {
    if (!onScreen(q.x, q.y, 40)) continue;
    const gm = GEM_TYPES[q.type], col = gm.col;
    const cx = q.x, cy = q.y - 6 + Math.sin(nowMs() / 300 + q.x) * 2;
    const rr = 5 + q.grade;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 20);
    g.addColorStop(0, col + "dd"); g.addColorStop(1, col + "00");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 6.283); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(cx, cy + 11, 6, 2.4, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - rr); ctx.lineTo(cx + rr, cy); ctx.lineTo(cx, cy + rr); ctx.lineTo(cx - rr, cy);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath();
    ctx.moveTo(cx, cy - rr); ctx.lineTo(cx + rr * 0.5, cy - rr * 0.15); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  }
}
// ── V-234 제단 그리기 — 새 에셋 없이 statue.png + 발밑 금빛 룬 고리(맥동) + 머리 위 이름표로 상자·소품과 가른다. ──
// 석상은 소품·상자와 같은 spriteFoot 길로 밑변을 바닥선에 맞춘다(V-170 교훈). 다 쓴 제단은 고리를 끄고 어둡게.
const ALTAR_STATUE_H = 150;
function drawAltar(a) {
  groundMark(a.x, a.y, 30, 8);
  if (!a.used) {
    const pulse = 0.5 + 0.5 * Math.sin(nowMs() / 360);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const rr = 42 + pulse * 6;
    const g = ctx.createRadialGradient(a.x, a.y, rr * 0.35, a.x, a.y, rr);
    g.addColorStop(0, "rgba(248,210,110,0)");
    g.addColorStop(0.72, `rgba(240,200,90,${0.12 + pulse * 0.14})`);
    g.addColorStop(1, "rgba(248,214,120,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(a.x, a.y, rr, rr * 0.42, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = `rgba(248,222,150,${0.5 + pulse * 0.4})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(a.x, a.y, rr * 0.8, rr * 0.42 * 0.8, 0, 0, 6.283); ctx.stroke();
    ctx.restore();
  } else if (globalThis.__ALTARSPENT !== false) {
    const pulse = 0.4 + 0.2 * Math.sin(nowMs() / 700);
    ctx.save();
    ctx.strokeStyle = `rgba(150,140,120,${0.3 + pulse * 0.14})`; ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.ellipse(a.x, a.y, 34, 34 * 0.42, 0, 0, 6.283); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  const im = tex("decor/statue.png");
  if (im && im.width) {
    const h = ALTAR_STATUE_H, w = h * (im.width / im.height);
    const fo = spriteFoot(im, "decor/statue.png");
    const dx = a.x - (fo ? fo.cx * w : w / 2);
    const dy = a.y - (fo ? fo.b * h : h);
    ctx.globalAlpha = a.used ? 0.4 : 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, dx, dy, w, h);
    ctx.globalAlpha = 1;
  }
}
// V-236 — 제단 이름표(그리고 같은 길로 그리는 떠 있는 글)를 화면 안으로 물린다. 월드 변환 중이라
//   화면 좌우 가장자리(cam.x ~ cam.x+VW/Z)를 월드 단위로 환산해 라벨 중심을 clamp 한다.
//   __LABELCLAMP===false 면 옛 동작(a.x 그대로 · 왼쪽이 잘렸다).
function clampLabelX(cx, hw) {
  if (globalThis.__LABELCLAMP === false) return cx;
  const m = 6 / Z;
  const left = cam.x + m + hw, right = cam.x + VW / Z - m - hw;
  if (left > right) return cx;
  return Math.max(left, Math.min(right, cx));
}
// 유닛을 다 그린 뒤 얹는 머리 위 표식(상자 비콘과 같은 자리) — 빛기둥 + 반경 70 안에서 이름·값·「B/P/J」.
function drawAltarBeacon(a) {
  if (!onScreen(a.x, a.y, 220)) return;
  const near = Math.hypot(G.player.x - a.x, G.player.y - a.y) < 90;
  const potionOn = globalThis.__POTION !== false;
  if (!a.used) {
    const pulse = 0.5 + 0.5 * Math.sin(nowMs() / 360);
    const topY = a.y - ALTAR_STATUE_H - 24;
    ctx.globalCompositeOperation = "lighter";
    const beam = ctx.createLinearGradient(0, topY, 0, a.y - 6);
    beam.addColorStop(0, "rgba(248,214,120,0)");
    beam.addColorStop(1, `rgba(248,210,120,${0.08 + pulse * 0.11})`);
    ctx.fillStyle = beam;
    const bw = 12 + pulse * 4;
    ctx.fillRect(a.x - bw, topY, bw * 2, a.y - 6 - topY);
    ctx.globalCompositeOperation = "source-over";
    if (Math.hypot(G.player.x - a.x, G.player.y - a.y) < 70) {
      const meta = ALTAR_META[a.kind], price = altarPrice(a.kind);
      const gemOn = globalThis.__GEM !== false;
      const sub = [`${fmtNum(price)}◈  ·  B`, G.gold >= price, "#f2e7cf"];
      const lines = [sub];
      if (potionOn) lines.push([`물약 ${fmtNum(potionPrice())}◈  ·  P`, G.gold >= potionPrice(), "#a8d8ff"]);
      if (gemOn) lines.push([`보석 ${fmtNum(gemPrice())}◈  ·  J`, G.gold >= gemPrice(), "#c8a0e0"]);
      ctx.textAlign = "center";
      const ly = a.y - ALTAR_STATUE_H - 2;
      ctx.font = "bold 15px 'Times New Roman',serif";
      const w1 = ctx.measureText(meta.name).width;
      ctx.font = "13px 'Times New Roman',serif";
      const hw = Math.max(w1, ctx.measureText(meta.note).width, ...lines.map((l) => ctx.measureText(l[0]).width)) / 2 + 10;
      const boxH = 38 + 18 * lines.length;
      const lx = clampLabelX(a.x, hw);
      if (globalThis.__NOTESTACK !== false) reservedFloatRects.push({ x0: (lx - hw - cam.x) * Z, y0: (ly - 34 - cam.y) * Z, x1: (lx + hw - cam.x) * Z, y1: (ly - 34 + boxH - cam.y) * Z });
      ctx.fillStyle = "rgba(8,5,5,0.82)"; ctx.fillRect(lx - hw, ly - 34, hw * 2, boxH);
      ctx.strokeStyle = meta.col; ctx.lineWidth = 1.5; ctx.strokeRect(lx - hw, ly - 34, hw * 2, boxH);
      ctx.fillStyle = meta.col; ctx.font = "bold 15px 'Times New Roman',serif";
      ctx.fillText(meta.name, lx, ly - 18);
      ctx.fillStyle = "#b6a888"; ctx.font = "12px 'Times New Roman',serif";
      ctx.fillText(meta.note, lx, ly - 2);
      ctx.font = "13px 'Times New Roman',serif";
      for (let i = 0; i < lines.length; i++) { ctx.fillStyle = lines[i][1] ? lines[i][2] : "#c05a4a"; ctx.fillText(lines[i][0], lx, ly + 15 + i * 18); }
    }
    return;
  }
  const gemOn = globalThis.__GEM !== false;
  if ((potionOn || gemOn) && near) {
    ctx.textAlign = "center";
    const ly = a.y - ALTAR_STATUE_H + 10;
    ctx.font = "13px 'Times New Roman',serif";
    const l1 = "제단 (다 씀)", lines = [];
    if (potionOn) lines.push([`물약 ${fmtNum(potionPrice())}◈  ·  P`, G.gold >= potionPrice(), "#a8d8ff"]);
    if (gemOn) lines.push([`보석 ${fmtNum(gemPrice())}◈  ·  J`, G.gold >= gemPrice(), "#c8a0e0"]);
    const hw = Math.max(ctx.measureText(l1).width, ...lines.map((l) => ctx.measureText(l[0]).width)) / 2 + 10;
    const boxH = 20 + 18 * lines.length;
    const lx = clampLabelX(a.x, hw);
    if (globalThis.__NOTESTACK !== false) reservedFloatRects.push({ x0: (lx - hw - cam.x) * Z, y0: (ly - 18 - cam.y) * Z, x1: (lx + hw - cam.x) * Z, y1: (ly - 18 + boxH - cam.y) * Z });
    ctx.fillStyle = "rgba(8,5,5,0.82)"; ctx.fillRect(lx - hw, ly - 18, hw * 2, boxH);
    ctx.strokeStyle = "#7a746a"; ctx.lineWidth = 1.4; ctx.strokeRect(lx - hw, ly - 18, hw * 2, boxH);
    ctx.fillStyle = "#8f8877"; ctx.fillText(l1, lx, ly - 3);
    for (let i = 0; i < lines.length; i++) { ctx.fillStyle = lines[i][1] ? lines[i][2] : "#c05a4a"; ctx.fillText(lines[i][0], lx, ly + 14 + i * 18); }
  }
}
// ── V-238 상인 — 머리 위 이름표(색조와 한 결) + 반경 안에서 「T 거래」. drawAltarBeacon 결을 따른다. ──
const MERCH_R = 130;
function drawMerchant(mc) {
  drawShadow(mc.x, mc.y, mc.r, null, 2.5);
  if (!drawSprite8(ctx, mc.base, actorDir(mc), "idle", 0, mc.x, mc.y, mc.h, mc.filt))
    fallbackBlob(mc.x, mc.y, mc.h, mc.col);
}
function drawMerchantBeacon(mc) {
  if (!onScreen(mc.x, mc.y, 200)) return;
  const near = Math.hypot(G.player.x - mc.x, G.player.y - mc.y) < MERCH_R;
  const role = mc.kind === "fence" ? "사고 팔기" : "물약 · 보석";
  const sub = near ? `${role}  ·  T` : role;
  ctx.textAlign = "center";
  const ly = mc.y - mc.h - 6;
  ctx.font = "bold 15px 'Times New Roman',serif";
  const w1 = ctx.measureText(mc.name).width;
  ctx.font = "12px 'Times New Roman',serif";
  const hw = Math.max(w1, ctx.measureText(sub).width) / 2 + 10;
  const boxH = 40;
  const lx = clampLabelX(mc.x, hw);
  if (globalThis.__NOTESTACK !== false) reservedFloatRects.push({ x0: (lx - hw - cam.x) * Z, y0: (ly - 16 - cam.y) * Z, x1: (lx + hw - cam.x) * Z, y1: (ly - 16 + boxH - cam.y) * Z });
  ctx.fillStyle = "rgba(8,5,5,0.82)"; ctx.fillRect(lx - hw, ly - 16, hw * 2, boxH);
  ctx.strokeStyle = mc.col; ctx.lineWidth = 1.5; ctx.strokeRect(lx - hw, ly - 16, hw * 2, boxH);
  ctx.fillStyle = mc.col; ctx.font = "bold 15px 'Times New Roman',serif";
  ctx.fillText(mc.name, lx, ly);
  ctx.fillStyle = near ? "#e7dcc0" : "#b6a888"; ctx.font = "12px 'Times New Roman',serif";
  ctx.fillText(sub, lx, ly + 16);
}
function drawAscendBeacon() {
  const s = G.ascendSpot;
  if (!onScreen(s.x, s.y, 220)) return;
  const p = G.player, near = Math.hypot(p.x - s.x, p.y - s.y) < s.r + 44;
  const ready = (G.deepest || 0) >= ASCEND_FLOOR;
  const pulse = 0.5 + 0.5 * Math.sin(nowMs() / 300);
  const col = ready ? [216, 180, 90] : [126, 116, 96];
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(s.x, s.y - 10, 0, s.x, s.y - 10, 132);
  g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${0.10 + pulse * 0.16})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y - 10, 132, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.45 + pulse * 0.4})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 34, s.r, s.r * 0.46, 0, 0, 6.2832); ctx.stroke();
  if (ready) { ctx.fillStyle = `rgba(216,180,90,${0.10 + pulse * 0.12})`; ctx.fillRect(s.x - 6, s.y - 150, 12, 150); }
  ctx.restore();
  ctx.textAlign = "center";
  const ly = s.y - 118;
  ctx.font = "bold 15px 'Times New Roman',serif";
  const title = "승천 제단";
  const rem = ASCEND_FLOOR - (G.deepest || 0);
  const sub = ready ? (near ? "Y — 승천" : "준비됨") : `B${ASCEND_FLOOR}층 필요 · ${rem}층 더`;
  ctx.font = "12px 'Times New Roman',serif";
  const hw = Math.max(ctx.measureText(title).width, ctx.measureText(sub).width) / 2 + 10;
  const lx = clampLabelX(s.x, hw);
  ctx.fillStyle = "rgba(8,5,5,0.82)"; ctx.fillRect(lx - hw, ly - 16, hw * 2, 40);
  ctx.strokeStyle = ready ? "#d8b45a" : "#7e746080"; ctx.lineWidth = 1.5; ctx.strokeRect(lx - hw, ly - 16, hw * 2, 40);
  ctx.fillStyle = ready ? "#e8cf52" : "#b0a488"; ctx.font = "bold 15px 'Times New Roman',serif";
  ctx.fillText(title, lx, ly);
  ctx.fillStyle = ready ? (near ? "#f2e2b0" : "#c9b98c") : "#9a8f74"; ctx.font = "12px 'Times New Roman',serif";
  ctx.fillText(sub, lx, ly + 16);
  if (G.ascension) { ctx.fillStyle = "#c8a04a"; ctx.font = "11px 'Times New Roman',serif"; ctx.fillText(`승천 ${G.ascension}회`, lx, ly + 32); }
}
function nearestMerchant() {
  if (!G.town || !G.merchants) return null;
  let best = null, bd = MERCH_R * MERCH_R;
  const p = G.player;
  for (const mc of G.merchants) { const d = (mc.x - p.x) ** 2 + (mc.y - p.y) ** 2; if (d < bd) { bd = d; best = mc; } }
  return best;
}
function drawTownChannel() {
  const p = G.player; if (!(p.townCast > 0)) return;
  const cy = p.y + 16, rad = 30, frac = 1 - p.townCast / TOWN_CAST;
  ctx.save();
  ctx.strokeStyle = "rgba(216,180,90,0.30)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(p.x, cy, rad, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = "#f0d878"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(p.x, cy, rad, -Math.PI / 2, -Math.PI / 2 + frac * 6.283); ctx.stroke();
  ctx.restore();
}
function openChest(ch) {
  ch.opened = true;
  const n = 3 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) spawnItem(ch.x, ch.y - 6, Math.random() < 0.3);
  for (let i = 0; i < 8; i++) G.golds.push({ x: ch.x, y: ch.y, vx: (Math.random() * 2 - 1) * 90, vy: (Math.random() * 2 - 1) * 90, val: 8, t: 0 });
  if (uniqueOn() && G.floor >= MYTHIC_CHEST_FLOOR && Math.random() < MYTHIC_CHEST_CHANCE) dropItemAt(ch.x, ch.y - 6, rollMythic(G.floor));   // V-241 — 깊은 층 상자에서 규칙형 유니크
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
  // V-237 — 바닥 이름표도 화면 안으로 물린다(clampLabelX 를 제단 이름표에만 걸어 「완벽 루비」 왼쪽이 잘렸다).
  //   여긴 화면좌표(sx)라 clampLabelX(월드) 가 아니라 화면 폭으로 직접 clamp 한다. 잇는 줄은 물건→이름표로 그린다.
  const lx = globalThis.__NOTESTACK !== false ? Math.max(FLOAT_MARGIN + w / 2, Math.min(VW - FLOAT_MARGIN - w / 2, sx)) : sx;
  if (ly < sy - 2 || lx !== sx) {
    ctx.strokeStyle = r.color + "44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sy + 4); ctx.lineTo(lx, ly + 6); ctx.stroke();
  }
  ctx.fillStyle = "rgba(6,4,4,0.86)"; ctx.fillRect(lx - w / 2, ly - 10, w, 16);
  ctx.strokeStyle = r.color + "88"; ctx.lineWidth = 1; ctx.strokeRect(lx - w / 2, ly - 10, w, 16);
  ctx.fillStyle = r.color; ctx.fillText(label, lx, ly + 2);
  itemLabels.push({ x0: lx - w / 2, y0: ly - 10, x1: lx + w / 2, y1: ly + 6, it, sy, layer: Math.round((sy - ly) / 18) });
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
    // V-236 — panel 글(제단 구입 등)은 테두리 pad 까지 화면 안에 들도록 여유를 더 둔다(__LABELCLAMP 로 되돌림).
    const padX = (f.panel && globalThis.__LABELCLAMP !== false) ? 11 : 0;
    let sx = Math.max(M + hw + padX, Math.min(VW - M - hw - padX, rx));
    let sy = Math.max(M + fs, Math.min(VH - M, ry));
    // 하단 UI 띠에 «들면»(가로가 겹치고 글자 밑이 띠 위끝을 넘으면) 위로 밀어낸다.
    if (band && sx + hw > band.x0 && sx - hw < band.x1 && sy > band.y0 - M)
      sy = Math.max(M + fs, band.y0 - M);
    // 같은 시각에 뜬 글자끼리 어긋나게 — 겹치면 위로 올려 쌓고, 천장에 닿으면 옆으로 비킨다.
    // ㉠ V-211: 위로만 밀던 옛 방식은 화면 위쪽에서 피해수 여럿이 한 줄에 겹쳐 «10.1K17.1K…»로
    //   뭉갰다(가로 회피가 없었다). 천장에선 겹친 사각의 좌·우 중 캔버스에 남는 쪽으로 옮긴다.
    // V-237 — 세계-공간 판(제단 안내판)도 피한다. 옛 것은 뜬 글끼리만 어긋냈다 → 초록 구입글이 제단 판을 통째로 덮었다.
    const avoid = globalThis.__NOTESTACK !== false ? reservedFloatRects : EMPTY_RECTS;
    // V-242 ③ 유니크 이름(26px)+규칙 글이 한 자리에 뜨면 2px 로만 벌어져 서로 닿아 안 읽혔다.
    //   INF: «근접»도 겹침으로 쳐서(natural gap 이 좁은 서로 다른 물건의 이름/규칙 짝을 잡는다) FGAP 만큼 벌려 쌓는다.
    const FGAP = globalThis.__FLOATSTACK !== false ? 9 : 2, INF = globalThis.__FLOATSTACK !== false ? 9 : 0;
    for (let g = 0; g < 40; g++) {
      const q0 = (q) => sx - hw < q.x1 && sx + hw > q.x0 && sy - fs < q.y1 + INF && sy + INF > q.y0;
      const hit = rects.find(q0) || avoid.find(q0);
      if (!hit) break;
      const up = hit.y0 - FGAP;
      if (up - fs >= M) { sy = up; continue; }
      if (f.note) { const down = hit.y1 + fs + FGAP; if (down <= VH - M) { sy = down; continue; } }   // V-245 흠(b) — 천장에 닿은 일지 알림은 아래로 흘려 쌓는다(셋이 맨 위에서 뭉치던 것)
      if (!V211()) break;
      const right = hit.x1 + hw + 1, left = hit.x0 - hw - 1;
      if (right + hw <= VW - M && (sx <= hit.x1 || left - hw < M)) sx = right;
      else if (left - hw >= M) sx = left;
      else break;
    }
    if (f.panel) {
      const pad = 9;
      ctx.fillStyle = "rgba(6,4,5,0.86)"; ctx.fillRect(sx - hw - pad, sy - fs - 2, (hw + pad) * 2, fs + 8);
      ctx.strokeStyle = f.col || "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(sx - hw - pad, sy - fs - 2, (hw + pad) * 2, fs + 8);
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
  const nameClass = it.mythic ? "mythic" : it.unique ? "unique" : it.rarity.key === "yellow" ? "rare" : "";
  const rows = [`<div class="tipname ${nameClass}">${it.mythic ? "◆ " : ""}${esc(it.name)}</div>`];
  rows.push(`<div class="tipsub">${it.mythic ? "유니크 · 규칙" : it.rarity.name} · ${SLOT_LABEL[it.slot] || ""}</div>`);
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
  if (globalThis.__SOCKET !== false && it.sockets && it.sockets.length) {
    rows.push(`<div class="tipsock">${socketHTML(it)} 소켓 ${it.sockets.length}</div>`);
    for (const g of it.sockets) if (g)
      rows.push(`<div class="tipaffix">${GEM_TYPES[g.type].label} +${g.aff.value}${GEM_TYPES[g.type].pct ? "%" : ""} <span class="tipgemn">(${GEM_GRADES[g.grade]} ${GEM_TYPES[g.type].name})</span></div>`);
  }
  if (it.unique) {
    rows.push(`<div class="tipmod ${it.mythic ? "tipmythic" : ""}">${esc(it.unique.note)}</div>`);
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

// ── V-234 조작 판(H) — #inv·#char 창과 같은 결·같은 토글. 짧은 #hint 대신 전체 목록을 화면 가운데로. ──
let helpOpen = false;
function toggleHelp() {
  helpOpen = !helpOpen;
  el("help").classList.toggle("on", helpOpen);
}
// ── V-241 일지 판(L) — #help 와 같은 창 결. 도전 과제와 진행·보상을 한눈에. ──
let journalPanelOpen = false;
function toggleJournal() {
  journalPanelOpen = !journalPanelOpen;
  el("journal").classList.toggle("on", journalPanelOpen);
  if (journalPanelOpen) renderJournal();
}
function renderJournal() {
  const done = GOALS.filter((g) => JOURNAL.done[g.id]).length;
  let h = `<div class="helptitle">일지 — 도전 과제 ${done}/${GOALS.length}</div>`;
  h += `<div class="jsub">보상은 판·회차·죽음을 넘어 남는다 (지금 자리 +${JOURNAL.slots} · 소환수 +${JOURNAL.minionPct}%)</div>`;
  h += `<div class="jgrid">`;
  for (const g of GOALS) {
    const ok = !!JOURNAL.done[g.id];
    const cur = Math.min(g.val(), g.need);
    h += `<div class="jrow ${ok ? "jdone" : ""}"><span class="jmark">${ok ? "✔" : "◻"}</span>` +
      `<span class="jname">${g.name}</span><span class="jprog">${ok ? "달성" : `${Math.floor(cur)}/${g.need}`}</span>` +
      `<span class="jrew">${rewText(g.rew)}</span></div>`;
  }
  h += `</div><div class="jhint">L: 닫기</div>`;
  el("journal").innerHTML = h;
}

// 되돌림: __HINTFOLD === false 면 옛 긴 한 줄 그대로(짧은 줄·H 판 안 켠다). 아니면 짧은 줄 + H 로 전체.
function applyHintFold() {
  if (globalThis.__HINTFOLD === false) return;
  const h = el("hint");
  h.classList.add("short");
  h.textContent = "WASD 이동 · 좌클릭 뼈창 · Q 소환 · F 아래로 · H 조작 전체";
}
function toggleInv() {
  invOpen = !invOpen;
  el("inv").classList.toggle("on", invOpen);
  hoverItem = null; hoverRect = null; _prevHover = null; selectedGem = null;
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
  if (globalThis.__SOCKET !== false && it.sockets && it.sockets.length) {
    const sr = document.createElement("div"); sr.className = "cellsock";
    appendSockets(sr, it);
    d.appendChild(sr);
  }
  d.addEventListener("mouseenter", () => { hoverItem = it; hoverRect = d.getBoundingClientRect(); });
  d.addEventListener("mouseleave", () => { if (hoverItem === it) { hoverItem = null; hoverRect = null; } });
  d.addEventListener("click", (e) => { e.stopPropagation(); if (selectedGem) { socketGem(it); return; } onClick(); });
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
  renderGems();
}
// V-236 보석 주머니 — 종·등급이 같은 것끼리 묶어 개수와 함께 보인다. 눌러 고르고(sel) 소켓 장비를 누르면 박힌다.
function renderGems() {
  const pouch = el("gempouch"); if (!pouch) return;
  pouch.innerHTML = "";
  if (globalThis.__GEM === false) return;
  const p = G.player;
  const groups = {};
  for (const g of p.gems) { const k = g.type + "_" + g.grade; (groups[k] = groups[k] || { g, n: 0 }).n++; }
  const keys = Object.keys(groups);
  const label = document.createElement("div"); label.className = "pouchlabel";
  label.textContent = keys.length ? (selectedGem ? "박을 소켓 장비를 누르세요" : "보석 — 눌러 고르고 소켓 장비를 누른다") : "보석 없음";
  pouch.appendChild(label);
  const strip = document.createElement("div"); strip.className = "pouchstrip"; pouch.appendChild(strip);
  for (const k of keys) {
    const grp = groups[k], gm = GEM_TYPES[grp.g.type];
    const d = document.createElement("div"); d.className = "gemcell";
    if (selectedGem && selectedGem.type === grp.g.type && selectedGem.grade === grp.g.grade) d.classList.add("sel");
    d.style.setProperty("--gc", gm.col);
    d.innerHTML = `<span class="gdot"></span><span class="gn">${grp.n}</span>`;
    d.title = `${GEM_GRADES[grp.g.grade]} ${gm.name} — ${gm.label} +${gemVal(grp.g.type, grp.g.grade)}${gm.pct ? "%" : ""}`;
    d.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedGem = (selectedGem && selectedGem.type === grp.g.type && selectedGem.grade === grp.g.grade) ? null : { type: grp.g.type, grade: grp.g.grade };
      renderInv();
    });
    strip.appendChild(d);
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

// ── V-238 상점 (T) — #inv 결. 장물장수: 재고 사기 + 팔기(한 칸·쓰레기 한꺼번에). 잡화상: 물약·보석. ──
function rollFenceStock() {
  const f = Math.max(1, G.deepest || G.floor);
  const n = FENCE_MIN + ((Math.random() * (FENCE_MAX - FENCE_MIN + 1)) | 0);
  const out = [];
  for (let i = 0; i < n; i++) out.push(rollItem(f, true));
  return out;
}
function toggleShopNear() {
  if (shopOpen) { closeShop(); return; }
  const mc = nearestMerchant();
  if (!mc) { floatNote("상인 곁으로 가서 T", "#c8a04a", 1.0); return; }
  if (mc.kind === "fence" && !mc.stock) mc.stock = rollFenceStock();
  shopMerchant = mc; shopOpen = true;
  el("shop").classList.add("on");
  el("tooltip").style.display = "none"; el("tooltip2").style.display = "none";
  hoverItem = null; hoverRect = null; _prevHover = null;
  renderShop();
}
function closeShop() {
  shopOpen = false; shopMerchant = null;
  el("shop").classList.remove("on");
  hoverItem = null; hoverRect = null;
  el("tooltip").style.display = "none"; el("tooltip2").style.display = "none";
}
function buyStockItem(mc, idx) {
  const it = mc.stock[idx]; if (!it) return;
  const price = buyPrice(it);
  if (G.gold < price) { floatNote(`금이 모자라다 (${fmtNum(price)}◈)`, "#c8a04a", 1.1); return; }
  if (!bagFits(G.player.bag, it)) { floatNote("가방이 가득 찼다", "#e0663c", 1.2); return; }
  G.gold -= price; G.player.bag.push(it); mc.stock.splice(idx, 1);
  hoverItem = null; hoverRect = null;
  floatNote(`${it.name} 구입 (${fmtNum(price)}◈)`, it.rarity.color, 1.3, buyNoteExtra());
  if (invOpen) renderInv();
  renderShop();
}
function sellBagItem(idx) {
  const it = G.player.bag[idx]; if (!it) return;
  const gain = sellPrice(it);
  G.player.bag.splice(idx, 1); G.gold += gain;
  hoverItem = null; hoverRect = null;
  floatNote(`${it.name} 판매 (+${fmtNum(gain)}◈)`, "#e8cf52", 1.2);
  if (invOpen) renderInv();
  renderShop();
}
function sellJunk() {
  const p = G.player, junk = [], keep = [];
  for (const it of p.bag) ((it.rarity && (it.rarity.key === "white" || it.rarity.key === "blue")) ? junk : keep).push(it);
  if (!junk.length) { floatNote("팔 쓰레기가 없다(흰·매직)", "#c8a04a", 1.0); return; }
  let gain = 0; for (const it of junk) gain += sellPrice(it);
  p.bag = keep; G.gold += gain;
  hoverItem = null; hoverRect = null;
  floatNote(`쓰레기 ${junk.length}개 판매 (+${fmtNum(gain)}◈)`, "#e8cf52", 1.6, buyNoteExtra());
  if (invOpen) renderInv();
  renderShop();
}
function buyPotionTown(kind) {
  const price = potionPrice();
  if (G.gold < price) { floatNote(`금이 모자라다 (${fmtNum(price)}◈)`, "#c8a04a", 1.1); return; }
  if (!beltPush(kind)) { floatNote("벨트가 가득하다", "#c8a04a", 1.1); return; }
  G.gold -= price;
  floatNote(`${POTION[kind].name} 구입 (${fmtNum(price)}◈)`, POTION[kind].glow, 1.2, buyNoteExtra());
  renderShop();
}
function buyGemTown() {
  if (globalThis.__GEM === false) return;
  const price = gemPrice();
  if (G.gold < price) { floatNote(`금이 모자라다 (${fmtNum(price)}◈)`, "#c8a04a", 1.1); return; }
  const grade = buyGemGrade(), type = GEM_KEYS[(Math.random() * GEM_KEYS.length) | 0];
  G.gold -= price; G.player.gems.push(makeGem(type, grade));
  floatNote(`${GEM_GRADES[grade]} ${GEM_TYPES[type].name} 구입 (${fmtNum(price)}◈)`, GEM_TYPES[type].col, 1.3, buyNoteExtra());
  if (invOpen) renderInv();
  renderShop();
}
// ── V-239 ③ 소켓 표기 — 옛 ○/● 글리프가 폰트에서 「ㅇ」로 떨어져 보였다(CJK 대체 글꼴).
//   글자 대신 «색 있는 작은 네모»(빈 칸=테두리만·낀 칸=보석 색 채움)로 바꿔 눈에 소켓으로 읽힌다.
function socketHTML(it) {
  if (globalThis.__SOCKET === false || !it.sockets || !it.sockets.length) return "";
  return it.sockets.map((g) => g
    ? `<span class="sqk fill" style="background:${GEM_TYPES[g.type].col}"></span>`
    : `<span class="sqk"></span>`).join("");
}
function appendSockets(parent, it) {
  if (globalThis.__SOCKET === false || !it.sockets || !it.sockets.length) return;
  for (const g of it.sockets) {
    const b = document.createElement("span");
    b.className = g ? "sqk fill" : "sqk";
    if (g) b.style.background = GEM_TYPES[g.type].col;
    parent.appendChild(b);
  }
}
function shopItemRow(it, rightTxt, rightCol, onClick) {
  const d = document.createElement("div"); d.className = "shoprow";
  const nm = document.createElement("span"); nm.className = "srname"; nm.style.color = it.rarity.color;
  nm.textContent = it.name;
  appendSockets(nm, it);
  const pr = document.createElement("span"); pr.className = "srprice"; pr.style.color = rightCol; pr.textContent = rightTxt;
  d.appendChild(nm); d.appendChild(pr);
  d.addEventListener("mouseenter", () => { hoverItem = it; hoverRect = d.getBoundingClientRect(); });
  d.addEventListener("mouseleave", () => { if (hoverItem === it) { hoverItem = null; hoverRect = null; } });
  d.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
  return d;
}
function shopSection(txt) { const h = document.createElement("div"); h.className = "shopsec"; h.textContent = txt; return h; }
function renderShop() {
  if (!shopOpen || !shopMerchant) return;
  const mc = shopMerchant, root = el("shop");
  root.innerHTML = "";
  const title = document.createElement("div"); title.className = "shoptitle"; title.style.color = mc.col;
  title.textContent = mc.name; root.appendChild(title);
  const gr = document.createElement("div"); gr.className = "shopgold";
  gr.innerHTML = `보유 <span class="coin">◈</span> ${fmtNum(G.gold)}`; root.appendChild(gr);
  if (mc.kind === "fence") {
    root.appendChild(shopSection(`재고 — 사기 (B${G.deepest}층 기준)`));
    const stock = document.createElement("div"); stock.className = "shoplist";
    if (mc.stock.length) for (let i = 0; i < mc.stock.length; i++) {
      const it = mc.stock[i], price = buyPrice(it);
      stock.appendChild(shopItemRow(it, `${fmtNum(price)}◈`, G.gold >= price ? "#e8cf52" : "#c05a4a", () => buyStockItem(mc, i)));
    } else { const e = document.createElement("div"); e.className = "shopempty"; e.textContent = "재고 없음"; stock.appendChild(e); }
    root.appendChild(stock);
    const junkN = G.player.bag.filter((it) => it.rarity && (it.rarity.key === "white" || it.rarity.key === "blue")).length;
    const sec = shopSection("팔기 — 가방 (팔면 30%)");
    const jb = document.createElement("button"); jb.className = "shopbtn junk";
    jb.textContent = junkN ? `쓰레기 한꺼번에 팔기 (흰·매직 ${junkN}개)` : "쓰레기 없음";
    jb.disabled = !junkN; jb.addEventListener("click", (e) => { e.stopPropagation(); sellJunk(); });
    sec.appendChild(jb); root.appendChild(sec);
    const sell = document.createElement("div"); sell.className = "shoplist";
    if (G.player.bag.length) for (let i = 0; i < G.player.bag.length; i++) {
      const it = G.player.bag[i];
      sell.appendChild(shopItemRow(it, `+${fmtNum(sellPrice(it))}◈`, "#c9a24a", () => sellBagItem(i)));
    } else { const e = document.createElement("div"); e.className = "shopempty"; e.textContent = "가방이 비었다"; sell.appendChild(e); }
    root.appendChild(sell);
  } else {
    root.appendChild(shopSection("잡화 — 사기"));
    const list = document.createElement("div"); list.className = "shoplist";
    const pp = potionPrice();
    list.appendChild(shopBuyRow(`${POTION.hp.name} (벨트로)`, pp, POTION.hp.glow, () => buyPotionTown("hp")));
    list.appendChild(shopBuyRow(`${POTION.mp.name} (벨트로)`, pp, POTION.mp.glow, () => buyPotionTown("mp")));
    if (globalThis.__GEM !== false) {
      const gp = gemPrice(), grade = GEM_GRADES[buyGemGrade()];
      list.appendChild(shopBuyRow(`보석 (${grade}·무작위 종류)`, gp, "#c8a0e0", () => buyGemTown()));
    }
    root.appendChild(list);
  }
  const hint = document.createElement("div"); hint.className = "shophint";
  hint.textContent = mc.kind === "fence" ? "재고 클릭=사기 · 가방 클릭=팔기 · T 닫기" : "클릭=사기 · T 닫기";
  root.appendChild(hint);
}
function shopBuyRow(label, price, col, onClick) {
  const d = document.createElement("div"); d.className = "shoprow buy";
  const nm = document.createElement("span"); nm.className = "srname"; nm.style.color = col; nm.textContent = label;
  const pr = document.createElement("span"); pr.className = "srprice"; pr.style.color = G.gold >= price ? "#e8cf52" : "#c05a4a"; pr.textContent = `${fmtNum(price)}◈`;
  d.appendChild(nm); d.appendChild(pr);
  d.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
  return d;
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
  let h = `<div class="invtitle">성장</div>`;
  const ab = G.ascBuffs || { dmg: 0, minion: 0, gold: 0 };
  if (G.ascension || ab.dmg || ab.minion || ab.gold) {
    const parts = [];
    for (const k of ["dmg", "minion", "gold"]) if (ab[k]) parts.push(`<span style="color:${ASC_BUFF[k].col}">${ASC_BUFF[k].name} ×${ab[k]}</span>`);
    h += `<div class="ascline">승천 <b>${G.ascension || 0}</b>회 · 적 ×${(1 + 0.12 * (G.ascension || 0)).toFixed(2)} — ${parts.join(" · ") || "영구 배수 없음"}</div>`;
  }
  h += `<div class="charcols">`;
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
  if (!(invOpen || shopOpen) || !hoverItem || G.dead) {   // V-238 — 상점 칸에도 툴팁
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
  const rows = [["Q", "raise"], ["E", "nova"], ["R", "decrep"], ["V", ""], ["M", ""], null,
    ["1", ""], ["2", ""], ["3", ""], ["4", ""], ["U", ""], ["T", ""], ["C", ""]];
  const belt = el("belt");
  belt.innerHTML = "";
  let row = document.createElement("div"); row.className = "beltrow"; belt.appendChild(row);
  for (const c of rows) {
    if (c === null) { row = document.createElement("div"); row.className = "beltrow"; belt.appendChild(row); continue; }
    const cell = document.createElement("div"); cell.className = "scell";
    if (c[1]) { const im = document.createElement("img"); im.src = `../assets/ui/icon/${c[1]}.png`; im.onerror = () => im.remove(); cell.appendChild(im); }
    const k = document.createElement("span"); k.className = "k"; k.textContent = c[0]; cell.appendChild(k);
    if (/^[1-4]$/.test(c[0])) { cell.id = "belt" + c[0]; const n = document.createElement("span"); n.className = "pcount"; cell.appendChild(n); }
    row.appendChild(cell);
  }
}
function comma(n) { return ("" + Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
const barPct = (v) => Math.max(0, Math.min(100, v));   // V-241 — 막대 폭은 0~100% 로 가둔다(값이 최대를 넘어도 패널 밖으로 안 샌다)
function updateHUD() {
  const p = G.player;
  if (journalOn()) journalCheck();
  el("hpbar").style.width = barPct(100 * p.hp / p.maxhp) + "%";
  el("hptxt").textContent = fmtPair(p.hp, p.maxhp);
  el("mpbar").style.width = barPct(100 * p.mana / p.maxmana) + "%";
  el("mptxt").textContent = fmtPair(p.mana, p.maxmana);
  el("lvl").textContent = p.level;
  el("gold").textContent = fmtNum(G.gold);
  const lvBase = xpForLevel(p.level), lvSpan = xpForLevel(p.level + 1) - lvBase;
  el("xp").textContent = fmtPair(G.xp - lvBase, lvSpan);
  el("xpbar").style.width = barPct(100 * (G.xp - lvBase) / lvSpan) + "%";
  el("mult").innerHTML = `피해 <b>${mulTxt(p.dmgMul)}</b> · 생명 <b>${fmtNum(p.maxhp)}</b>`
    + (G.ascension ? ` · <b style="color:#d8b45a">승천 ${G.ascension}회</b>` : "");
  // ★ V-209 — 지역 넉 줄도 한글로(병수님 「영어랑 한글 섞였네」). HUD·조작 안내가 한글인데
  //   여기만 영어라 한 화면에 두 말이 섞여 있었다.
  if (G.town) {   // V-238 — 마을에서는 「지하 N층」이 아니라 「마을」로 읽힌다
    el("region1").textContent = "죽은 자의 묘지 — 마을";
    el("region2").textContent = "안전 지대";
    el("region3").textContent = "쉼터";
    el("region4").textContent = `던전 B${G.deepest}층`;
    el("cleared").textContent = "상인 둘 · F 던전으로";
  } else {
    el("region1").textContent = "죽은 자의 묘지";
    el("region2").textContent = `지하 ${G.floor}층`;
    el("region3").textContent = G.floor < 2 ? "악몽" : "지옥";
    el("region4").textContent = `지역 등급 ${G.floor * 40 + 42}`;
    el("cleared").textContent = `방 ${G.cleared} / ${G.rooms.length - 1} · 처치 ${G.kills}`;
  }
  const used = slotsUsed();
  const cap = slotCap();
  const slotsEl = el("slots");
  const ac = armyCounts();
  const parts = [];
  if (ac.skel) parts.push(`해골 ${ac.skel}`);
  if (ac.ghoul) parts.push(`구울 ${ac.ghoul}`);
  if (ac.golem) parts.push(`골렘 ${ac.golem}`);
  slotsEl.textContent = `자리 ${used} / ${cap}` + (parts.length ? ` · ${parts.join(" ")}` : "");
  slotsEl.classList.toggle("full", used >= cap);
  const gnames = SKEL_TIERS.slice(0, p.maxGrade + 1).map((t, i) => (i === p.grade ? "▸" : "") + t.label).join(" · ");
  const pts = p.attrPts + p.sklPts;
  const ab = G.ascBuffs || { dmg: 0, minion: 0, gold: 0 };
  const ascTxt = (ab.dmg || ab.minion || ab.gold)
    ? " · 승천 " + [ab.dmg && `핏빛${ab.dmg}`, ab.minion && `군세${ab.minion}`, ab.gold && `탐욕${ab.gold}`].filter(Boolean).join("·")
    : "";
  el("enh").textContent = `등급 ${gnames}` + (p.mult.minionDmg > 1.001 ? ` · 피해 ${mulTxt(p.mult.minionDmg)}` : "") + (pts ? ` · 점수 ${pts} (C)` : "") + ascTxt;
  document.body.classList.toggle("notestack", globalThis.__NOTESTACK !== false);   // V-237 — 집는 글 칩에 읽히는 왼쪽 테두리(어두운 바닥에서 「테두리 없이 잘린」 것처럼 보였다)
  const log = el("picklog");
  log.innerHTML = "";
  for (const e of G.pickLog) { if (e.t <= 0) continue; const d = document.createElement("div"); d.style.color = e.color; d.textContent = e.name; d.style.opacity = Math.min(1, e.t); log.appendChild(d); }
  renderGear();
  if (globalThis.__POTION !== false) updateBelt();
  drawMini();
}
function updateBelt() {
  const b = G.player.belt; if (!b) return;
  for (let i = 0; i < 4; i++) {
    const cell = el("belt" + (i + 1)); if (!cell) continue;
    const s = b[i], cnt = cell.querySelector(".pcount");
    if (s && s.n > 0) {
      cell.style.background = s.kind === "hp" ? "radial-gradient(circle at 50% 60%, #7a1a14, #2a0806)" : "radial-gradient(circle at 50% 60%, #163a7a, #06122a)";
      cell.style.borderColor = POTION[s.kind].glow;
      cell.style.boxShadow = "inset 0 0 8px #000, 0 0 7px " + POTION[s.kind].glow + "99";
      if (cnt) cnt.textContent = s.n;
    } else {
      cell.style.background = ""; cell.style.borderColor = ""; cell.style.boxShadow = "";
      if (cnt) cnt.textContent = "";
    }
  }
}
function renderGear() {
  const g = el("gear"); if (!g) return;
  g.classList.toggle("readable", globalThis.__GEARLINE !== false);
  const eq = G.player.equipped;
  const colorOn = globalThis.__GEARCOLOR !== false;   // V-237 — 낀 칸은 레어도 색+발광으로 튀게, 빈 칸은 흐리게(V-235 는 둘 다 밝아 안 갈렸다)
  g.innerHTML = "";
  for (const s of SLOT_ORDER) {
    const it = eq[s];
    const span = document.createElement("span");
    span.textContent = SLOT_LABEL[s];
    if (it) {
      span.style.color = it.rarity.color; span.title = it.name;
      if (colorOn) { span.style.fontWeight = "700"; span.style.textShadow = `0 0 6px ${it.rarity.color}99, 0 1px 0 #000`; }
    } else if (colorOn) { span.style.color = "#5b5044"; }
    if (it && globalThis.__SOCKET !== false && it.sockets && it.sockets.length) appendSockets(span, it);
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
  for (const a of G.altars) if (!a.used) { mctx.fillStyle = "#f0d060"; mctx.beginPath(); mctx.arc(a.x * sx, a.y * sy, 2.6, 0, 6.283); mctx.fill(); }   // V-234 제단(상자 마름모와 달리 금빛 원)
  mctx.fillStyle = "#7fe6a0"; mctx.beginPath(); mctx.arc(G.stairs.x * sx, G.stairs.y * sy, 3, 0, 6.283); mctx.fill();
  mctx.fillStyle = "#fff"; mctx.beginPath(); mctx.arc(G.player.x * sx, G.player.y * sy, 2.5, 0, 6.283); mctx.fill();
}

function markVisited() {
  const p = G.player;
  for (const r of G.rooms) if (p.x > r.x - 80 && p.x < r.x + r.w + 80 && p.y > r.y - 80 && p.y < r.y + r.h + 80) r.visited = true;
}

let last = performance.now();
let loadingDone = false;
let lastOffSave = 0;
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
    stepPlayer(dt); handleSkills();
    if (!G.town) { wakePacks(); stepEnemies(dt); stepFoeShots(dt); stepHazards(dt); stepBolts(dt); }   // V-238 — 마을에선 웨이브·독장판이 멈춘다 · V-246 십자 번개
    stepMinions(dt); stepSpears(dt); stepDrops(dt); stepPotions(dt); stepGems(dt);
    stepBones(dt);
    stepParts(dt); stepFx(dt); stepFloats(dt); markVisited();
    if (G.bossBanner) { G.bossBanner.t += dt; if (G.bossBanner.t > 3.0) G.bossBanner = null; }
    for (const e of G.pickLog) e.t -= dt;
  } else { handleSkills(); }
  cam.shake *= 0.86; if (cam.shake < 0.4) cam.shake = 0;
  flash = Math.max(0, flash - dt * 1.4);
  if (gameTime - lastOffSave > 5) { lastOffSave = gameTime; saveOffline(); }
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
  applyHintFold();
  bindChar();
  bindAscend();
  start(1, null);
  settleOffline();
  window.addEventListener("beforeunload", saveOffline);
  requestAnimationFrame(loop);
})();
