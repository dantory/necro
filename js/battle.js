import { armyCap, MINION_SPD, CORPSE_TINT, knockOf, raiseHp, raiseDmg, raiseScale, dmgMulOf, selfMulOf, minionMulOf, goldMulOf, afText, nameOf, floorDmg, floorHp, floorN, FOOT_R, gearVal, goldFor, hpMaxOf, isGate, META, mpRegenOf, SQUASH_VIEW,
         MINIONS, MOB_H, mpMaxOf, NECRO_ATK, S, saveMeta, SKILLS, xpNeed,
         isRaise, MINION_OF, minionHpMul, novaDmgMul, novaRadMul, mpCostMul, mpCost, cdMul,
         wandMul, ampSecs, ampPower, harvestPct, spiritMp, feastOn,
         FEED_MAX, feedMul, dominatePct, thrallCap, armyN, thrallN, MOB_N,
         GATELORDS, gatelordFor, gatelordIdx,
         GEAR, dropChance, rollDrop, takeDrop, BAG_MAX, LASTRUN, startFloor, relicMul,
         hasUnique, gateFactor, TWICE_P, BLAST_MUL, BLAST_R, OVF_TRIG, OVF_MUL, OVF_R,
         questNote, registerQuestToast, autoSpend } from "./core.js";

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
export const RING_SPAWN = 190;    // 적이 나타나는 둘레
/** 소환수가 진을 치는 둘레 — 본인 앞마당.
 *  ★★ 105 였을 때 병수님이 겹침을 **또** 지적했다. 자를 화면 픽셀 하나로 통일해 재
 *  보니 몸끼리는 안 겹치는데(간격 40 · 몸 폭 32.4) **세로로 선 둘이 반드시 겹쳤다**:
 *  진의 세로 반지름이 56px 인데 **그림 키가 70px** 이라, 위에 선 놈의 몸이 아래 놈의
 *  머리를 덮는다. 즉 사람이 **설 자리가 그림보다 좁았다.**
 *  그림을 줄이면 「무엇이 싸우는지 안 보인다」로 되돌아가므로(그래서 us 를 키웠다)
 *  **자리를 넓힌다.** 150 이면 세로 반지름이 80px 로 그림 키(70)를 넘는다.
 *  덤으로 적이 걸어오는 거리가 179 → 128 로 줄어 군대가 덜 기다린다. */
export const RING_HOLD  = 150;
export const CORE_R     = 26;     // 여기까지 들어오면 본인이 맞는다
/** **부름의 거리** — 「층의 주인」이 판에 서면 군대가 구역을 버리고 그리로 간다.
 *  나타나는 둘레(300)보다 넓게 잡아 **선 순간부터** 전원이 움직이게 한다. */
export const BOSS_CALL  = 320;
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
/** 겹침을 풀 때 **한 번에 밀 수 있는 최대 속도**(화면/초). 예전엔 42(걸음 34 남짓)로
 *  묶어 두었는데, 그때는 적이 표적 한가운데로 **끊임없이** 파고들어(도착 반경이 없었다)
 *  상한이 **매 프레임 꽉 찼다** — 그래서 조금만 올려도 온 무리가 그 속도로 「쓸려」 보였다.
 *  ★ 이제 적은 **도착 반경**(approach)에서 서고 그 안쪽으론 안 파고드니, 이 상한은 겹친
 *  순간을 잠깐 푸는 데만 쓰인다 — 실측(50층 60초): 밀림이 40/초를 넘는 프레임이 전체의
 *  **3%**뿐이고 100/초 넘는 건 **2%**다(옛날엔 늘 꽉 찼다). 한 프레임 이동은 130/60≈2.2px 라
 *  「순간이동」이 아니라 두어 프레임에 걸친 비켜서기다. 그래서 130 까지 열어 깊은 층(50층
 *  40마리)의 잔겹침을 그 프레임에 떼어낸다 — 낮추면 파고든 프레임이 도로 는다. */
const SEP_CAP = 130;

/** **얼마나 겹쳐도 되는가**(닿을 거리 = (a.r+b.r) × 이 값).
 *  1.0 이면 **한 톨도 안 겹친다** — 몸끼리 어깨를 맞대고 선다. 그런데 그러면 적이
 *  표적에 닿는 껍질도 그만큼 바깥이라, 뒤에 선 놈들이 **영영 못 다가온다**
 *  (병수님 2026-08-15: "겹치기를 허용안하니까 너무 적군이 못다가오는듯,,
 *  어느정도의 겹치기는 허용해야겠네").
 *  ★ 이 값 하나가 **떼어놓기와 다가가기 둘 다**를 쥔다 — 따로 두면 「닿을 만큼 떼어 놓고
 *    닿지 않았다고 판정」하는 옛 고리가 되살아난다(아래 dist 주석의 그 사고). */
/* **잰 값: 0.8** (씨앗 1·3·9 · 12분 · reach_probe 12층 30초)
     K=1    닿은비율 78.9% · 틈중앙 1.00 · 헛걸음 73.9% · 최고층 144 · 죽음 4
     K=0.8  닿은비율 78.9% · 틈중앙 **0.84**(파고들어 붙는다) · 헛걸음 **65.6%** · 최고층 166 · 죽음 1
     K=0.65 닿은비율 40.1% · 틈중앙 1.05 · 헛걸음 59.9% — 적이 뭉쳐 쌓이기만 한다(표본 1.5배)
   더 내리면 되레 나빠진다: 떼는 힘이 약해 무리가 한 덩이가 되고 표적 배분이 무너진다. */
/* ★ **0.8 → 0.6** (병수님 2026-08-15 18:54 "더 겹쳐도 될듯, 아군/적군 모두").
   같은 자리에서 **아군도** 이 값을 쓰게 고친 뒤 다시 재니 앞의 결론이 뒤집혔다 —
   0.65 가 「무너진다」로 보였던 것은 **적만 파고들게 해 놓고 내 군대는 어깨를 맞대고
   섰기** 때문이었다(반쪽만 고친 상태로 잰 값이었다). 아군까지 붙자:
     K=0.8  닿은비율 82.6% · 틈 0.83 · 헛걸음 46.9% · 최고층 160
     K=0.7  82.3% · 0.73 · 53.6%
     K=0.6  **88.0% · 0.65 · 39.7%** · 최고층 143(89%) · 죽음 2   ← 셋 다 제일 좋다
     K=0.5  83.1% · 0.61 · **60.8%** — 더 내리면 헛걸음이 도로 는다 */
export const TOUCH_K_DEF = 0.6;
export const touchK = () => (globalThis.__TOUCH_K != null ? +globalThis.__TOUCH_K : TOUCH_K_DEF);
/** 소환수가 **제 자리에서 적을 알아보는 거리.** 진(RING_HOLD)에 비례해야 진을
 *  넓혀도 둘레 커버가 그대로다 — 숫자를 박아 두면 넓힐 때마다 사이가 뚫린다. */
const WATCH = RING_HOLD * 1.24;
/** 골렘은 **벽**이다 — 제 둘레의 적을 끌어(도발) 뒤의 해골·구울 대신 맞는다.
 *  적이 길목 소환수를 알아보는 거리는 90 인데(아래 「적」 루프), 골렘만 그보다 넓게 붙잡는다.
 *  ★ 예전에 **모든** 소환수의 인지 거리를 넓혔다가(105→129) 「적이 다 붙잡혀 본인은
 *  안 죽지만 군대가 다 갈렸다」(점유 85%→56%, 아래 「적」 루프 주석)를 봤다 — 그래서
 *  넓히는 것은 **잘 안 죽는 벽에만** 한다. 골렘은 체력 260(트리·깊이로 곱해짐)이라 도발을
 *  받아도 버티고, 그동안 해골·구울이 뒤에서 안전하게 때린다. 90 보다 조금만 넓혀(도발이
 *  90 을 덮되 온 판을 한 골렘이 독점하진 않게) 골렘이 여럿이면 둘레를 나눠 맡는다. */
const TAUNT_R = 130;
/** 진이 적 쪽으로 기우는 최대 거리 — 이보다 멀리 나가면 본인 둘레가 통째로 빈다. */
export const PUSH_MAX = RING_HOLD * 0.62;

/* ══ 몰려옴(rush) C-1 ② ══ **줄이 빈 뒤 남은 적이 제 발로 몰려온다.**
   12분을 눈금으로 쪼개 보면 제일 큰 통이 **뒷정리**(줄이 빈 뒤 남은 놈만 죽이는 시간)이고,
   그 안을 다시 갈라 보면 **걷는 시간**(다가감)이 제일 크다(tmp/wl_* 열 판: 때림 23~27% ·
   다가감 40~49% · 놀고 28~33%). 값(화력·머릿수·마나)으론 다섯 번 졌고(ROADMAP C-1),
   ab_walk 는 **소환수 쪽**(귀가·구역 해제)을 이미 대 봤다. 이번엔 **적 쪽**을 움직인다 —
   줄이 빈 뒤 남은 적이 (a) 아무 거리의 소환수에게나 붙고 (b) 아직 못 때릴 땐 더 빨리 걷는다.
   ★ **기본 켜짐**(2026-08-14) — ab_rush 씨앗 여덟×12분의 중앙값이 끝 조건을 넘겼다:
     뒷정리 29.4%→**28.0%**(30% 아래) · 최고층 42.0→**48.0**(44.8 기준 대비 안 깎임).
     다가감은 39.8%→41.1% 로 되레 조금 늘었는데, 걸음을 1.8배로 준 만큼 **빨리 붙어 더
     깊이 내려가기** 때문이다 — 뒷정리 통 자체가 줄었으니 그 안의 비율은 끝 조건이 아니다.
   ★ 문은 남겨 둔다 — `globalThis.__RUSH` 가 **정해져 있으면** 그것이 앞선다(core.js
     doctrineId 의 `__DOCTRINE` · gatelordFor 의 `__FORCE_LORD` 와 같은 규칙). `__RUSH=0`
     이면 「적」 루프가 예전 산수(상한 90 · 걸음 m.spd) 그대로 돌아 **난수 소비가 한 톨도
     안 달라진다**(A/B 유지 · ab_rush.sh 의 base 팔이 이 값을 쓴다). 세기값은 여기 한
     표(RUSH)에 모은다 — auto() 처럼 흩어 두면 검수기가 값으로 A/B 를 못 가른다. */
export const RUSH = { on: true, spd: 1.8 };   // spd: 아직 못 때릴 때의 걸음 배수
export const rushOn = () =>
  (typeof globalThis !== "undefined" && globalThis.__RUSH != null)
    ? !!globalThis.__RUSH
    : RUSH.on;

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

/** 같은 말이 이어지면 **접는다.** 소환은 판이 도는 내내 일어나므로, 접지 않으면
 *  「해골 전사 소환」 여섯 줄이 로그를 통째로 채워 다른 사건이 안 보인다.
 *  접힌 줄은 맨 위에 그대로 남고 꼬리에 배수만 붙는다 — 새 줄로 밀지 않는 게 핵심.
 *  ★ 바깥에서 S.log 를 직접 건드리면(main.js toTown) 이어짐이 끊겨야 하므로
 *    그쪽도 sayReset() 을 부른다. 안 그러면 사이에 낀 줄을 건너뛰고 접힌다. */
let lastSaid = null, lastN = 0;
export const sayReset = () => { lastSaid = null; lastN = 0; };
export const say = (s) => {
  if (s === lastSaid && S.log.length) {
    S.log[0] = `${s} <b style="color:#8a7f6a">×${++lastN}</b>`;
    return;
  }
  lastSaid = s; lastN = 1;
  S.log.unshift(s); if (S.log.length > 6) S.log.pop();
};
/* ⑦ 일지 알림은 **핵심 사건이 이미 흐르는 로그(say)를 그대로 쓴다** — 새 토스트 틀은
   안 만든다. core.js 가 say 를 직접 import 하면 순환이라, 콜백으로 건넨다. */
registerQuestToast((q) => say(`<b style="color:#ffcf5a">일지</b> 「${q.n}」 달성 · 유해 <b class="t3">+${q.reward}</b>`));

/** 적이 나오는 **간격**. 병수님: "너무 한번에 짠! 하고 나오는듯".
 *  한꺼번에 세워 놓으면 「배치된 것」으로 보이고, 하나씩 걸어 나오면 「몰려오는 것」이
 *  된다 — 방치형은 보는 게임이라 **나타나는 순간 자체가 볼거리**다.
 *  마릿수가 많은 층에서 줄이 너무 길어지지 않게 상한도 둔다. */
/* ★ **몰아치기**(병수님 2026-08-15 17:57 「적군 수 너무 적어, 초반부터 좀 몰아치는걸로」).
   마릿수를 늘려 봤더니 「기다림」이 되레 늘었다(106 → 118초) — 줄이 길어져도 **한 마리씩
   방울져** 나오니 판은 여전히 비어 있고, 깊이만 죽었다(143 → 124 → 104).
   그러니 손잡이는 수가 아니라 **간격**이다. 배수 하나로 줄이거나 늘린다. */
const SPAWN_GAP = [0.55, 0.95];
/* **잰 값: 0.35배** (마릿수 13+1.1f 와 한 벌 · 씨앗 1·3·9 × 12분):
     1.0배 · 5+0.7f  (전)  기다림 106초 · 싸움 1215 · 최고층 143 · 죽음 2
     0.5배 · 9+0.9f        기다림  72초 · 싸움 1284 · 최고층 152 · 죽음 2
     0.35배 · 13+1.1f      기다림  **42초** · 싸움 1051 · 최고층 130(91%) · 죽음 **6**  ← 넣음
   끝 조건(기다림 절반 아래 · 최고층 80% 이상)을 넘긴 것은 마지막 팔뿐이다.
   죽음이 셋 배로 는 것은 A(판에 위험이 없다)가 바라던 방향이기도 하다 — 순하게 하려면
   0.5배·9+0.9f 로 내리면 된다(그 팔은 깊이가 되레 6% 늘고 죽음은 그대로다). */
const gapMul = () => (globalThis.__SPAWN_GAP != null ? +globalThis.__SPAWN_GAP : 0.35);

/** ⑧-c **줄이 층당 시간을 정하고 있었다.** 위 주석은 「상한도 둔다」고 적어 놓고
 *  **정작 상한이 코드에 없었다** — 간격은 마릿수와 무관하게 늘 0.55~0.95 초였다.
 *  마릿수는 층마다 는다(floorN = 5 + 0.7f). 90층이면 68 마리 × 평균 0.75 초 =
 *  **51 초** — 90층대 층당 55초의 거의 전부다. 화력을 아무리 키워도 이 줄보다
 *  빨리 층을 비울 수 없다(자에서 「기다림」 = 줄은 남았는데 판 위엔 아무도 없는 시간).
 *
 *  고치는 자리는 **간격 자체가 아니라 판의 사정**이다. 간격을 통째로 줄이면 얕은 층이
 *  다시 「짠 하고」로 돌아간다(병수님이 고쳐 달라 한 바로 그것). 대신 **판이 비어 있을
 *  때만** 빨리 낸다 — 싸울 것이 이미 서 있으면 예전 그대로 느긋하게, 아무도 없으면
 *  줄줄이 쏟아진다. 군대가 셀수록 판이 빨리 비니 **저절로 빨라지고**, 버거우면 판에
 *  적이 남아 있어 **저절로 느려진다**(밀려드는 사고를 막는 자동 제동).
 *  SPAWN_FULL = 0 이면 이 장치가 통째로 꺼진다(A/B 의 base 팔). */
const SPAWN_FULL = 6;      // 이만큼 서 있으면 「판이 찼다」 — 예전 간격 그대로
const SPAWN_RUSH = 0.15;   // 텅 빈 판에서의 하한 배수(0.55~0.95 → 0.08~0.14 초)

/** 「들어섰다」 연출이 사는 시간 — main.js draw 가 이 안에서 비네트를 걷고 명패를 앉힌다.
 *  ★ 그리는 쪽도 이 값으로 진행도를 재므로 export 한다(양쪽에 숫자를 박으면 어긋난다). */
export const ARRIVE_T = 1.6;
/** 층이 넘어갈 때 **앞 층 시체 그림**이 어둠에 잠겨 걷히는 시간. 개수(S.corpses)가 아니라
 *  그림(S.piles)만 걷는 것이라, 그리는 쪽도 이 값으로 알파를 재려고 export 한다. */
export const PILE_FADE = 1.0;
/** 관문 보스 자리에 퍼졌다 조여드는 붉은 고리의 수명. 그리는 쪽(fx "bossring")도 이 값을 쓴다. */
export const BOSSRING_T = 0.7;
/** 다 서기 전(born)에 튼 수법의 세기 — 검수기가 `globalThis.__OPEN_MUL` 로 쓸어 본다. */
/* 0 · 0.12 · 0.35 를 30분 × 씨앗 1·3·9 로 쓸어 봤다(2026-08-14):
     0     50-99층 받은 피해 0 (구멍 그대로) · 최고층 합 288
     0.12  50-99층 **2,496,066** · 최고층 88/99/94 (합 281)   ← 고른 것
     0.35  50-99층 5,599,423 · 최고층 98/90/81 (합 269 · 한 씨앗이 81 로 내려온다)
   손 안 대면(1.0) 최고층 합이 292 → 125 로 반토막 난다 — 관문이 벽이 된다. */
export const OPEN_MUL_DEF = 0.12;
const OPEN_MUL_OF = () => (typeof globalThis !== "undefined" && globalThis.__OPEN_MUL != null)
  ? +globalThis.__OPEN_MUL : OPEN_MUL_DEF;

/* ══ 관문 주인은 **제 층이 아니라 내 군대**를 기준으로 선다 ══
   60분 곡선(2026-08-14 10:04)이 남긴 자리다. 구멍(수법을 못 쓰고 죽음)은 OPEN_MUL 로
   메웠는데도 깊은 띠에서 네크로에게 닿는 것이 **초당 최대체력의 0.04%**(얕은 띠 1.25%
   의 3%)였다 — 손 놓고 맞아도 2430초를 산다. 왜냐면 주인이 한 번에 **1.2초**밖에
   못 살아서(얕은 관문 16.4초) 수법이 관문당 0.8번밖에 안 터지고, 그마저 born 중이라
   OPEN_MUL 로 깎인다.
   ★ 값이 아니라 눈금이 틀렸다. 주인 체력을 `floorHp(f)×7` 로 매기는데 층 체력은
     1.19^f 로 자라고 **한 판 안의 내 화력은 장비·재련·유해가 겹쳐 그보다 빨리 큰다.**
     이미 두 번 통한 방법을 그대로 쓴다(「몸도 층을 따라 큰다」·「시체가 제 격을 기억한다」):
     **바닥을 지금 내 군대에 둔다** — 주인은 어느 깊이에서도 최소 GATE_SEC 초는 선다.
   0 이면 손 안 댐(예전 그대로) — 검수기가 `globalThis.__GATE_SEC` 로 쓸어 본다. */
export const GATE_SEC_DEF = 0;
const GATE_SEC_OF = () => (typeof globalThis !== "undefined" && globalThis.__GATE_SEC != null)
  ? +globalThis.__GATE_SEC : GATE_SEC_DEF;

/* ══ 관문 주인이 **지친다**(D-3) ══ 2026-08-14
   30분 곡선(D-1)에서 조용한 자리는 **늘 같은 한 자리**였다 — 씨앗 7 이 2:03→6:31(268초),
   씨앗 1 이 3:11→6:18(188초). 둘 다 그 사이 **층이 10 에 못 박혀** 있었다. 군대가 한 번
   무너지면 화력이 바닥으로 떨어지는데 주인 체력은 그대로라 **끝나지 않는 싸움**이 된다.
   레벨도 안 오르니(적을 못 죽이니까) 스스로 풀리지도 않는 고리다.
   ★ 값으로는 못 푼다 — 체력을 깎으면 **벽의 자리만 옮긴다**(OPEN_MUL·GATE_SEC 이 그렇게
     졌다). 그래서 축을 **시간**으로 바꾼다: 주인이 TIRE_AT 초를 넘겨 살아 있으면 그때부터
     받는 피해가 TIRE_RAMP 초마다 한 배씩 는다(이미 있는 `wk` 길을 그대로 탄다 — 제물이
     더 세게 걸려 있으면 그쪽을 안 덮는다). 화력이 0 만 아니면 **어떤 체력이든 유한한
     시간에** 끝난다 → 벽이 설 자리가 산수에서 사라진다. 평범한 관문은 수십 초에 끝나
     이 문턱에 닿지도 않으므로 잘 굴러가는 판은 한 톨도 안 바뀐다.
   ★ **기본은 꺼 둔다**(0) — GATE_SEC 이 그랬듯 축 하나를 재 보지도 않고 켜면 벽의 자리만
     옮긴다. 검수기가 `globalThis.__TIRE_AT`(= tools/ab_tire.sh) 로 쓸어 보고, 씨앗 여덟에서
     ①조용한 구간이 사라지고 ②최고층이 안 무너지면 그때 기본값을 바꾼다.
   ★★ 이것만으로는 **안 풀린다는 것을 이미 봤다** — 씨앗 7 의 10층 관문은 지침을 켜도
     249초를 살았다. 그 판의 군세는 **1** 인데 시체가 **57** 개 쌓여 있었다(금도 안 늘었다).
     곱할 피해 자체가 0 에 가까우면 21 배를 해도 0 이다. 진짜 벽은 「주인이 단단하다」가
     아니라 **군대가 다시 안 선다** 쪽이다(tools/tire_probe.mjs · ROADMAP D-3). */
export const TIRE_AT_DEF = 0, TIRE_RAMP = 10;
const TIRE_AT_OF = () => (typeof globalThis !== "undefined" && globalThis.__TIRE_AT != null)
  ? +globalThis.__TIRE_AT : TIRE_AT_DEF;

/* ══ 관문 벽의 진짜 이름은 **「졸개 벽」**이었다(ADD_CAP) ══
   2026-08-14 22:0x · tools/tire_probe.mjs · 씨앗 7 · 7분: **주인피해가 7분 내내 정확히 0**
   인데 군대 화력(armyDps)은 109~142 였다. 군대는 쉬지 않고 때리는데 **주인만 빼고** 때린다.
   왜 — 관문 주인의 `add` 가 네크로 발밑(75)에 졸개 넷을 체력 두 배로 솟게 하는데 **상한이
   없다**(1097줄). 표 끝에서 적 수가 5초마다 정확히 +4 로 늘었다(6:20 206 → 7:00 233).
   소환수는 늘 제일 가까운 적을 잡으므로 발밑에서 솟는 졸개가 언제나 먼저다 → 되먹임이
   닫힌다: **주인이 안 죽는다 → 층이 안 끝난다 → 졸개가 는다 → 더 못 닿는다.**
   ADD_CAP 은 그 고리에서 **부르는 쪽**을 끊는다 — 살아 있는 add 졸개가 상한을 넘으면
   그 수법이 쉰다. 위협 자체를 없애는 게 아니라 **쌓이는 것만** 막는다.
   ★ 기본은 꺼 둔 채 **두 자로 재고 나서** 켰다(2026-08-14 23:0x~23:34):
     ① 씨앗 7 · 7분(`ab_addcap.sh` · 상한 0/4/8/12) — 잣대인 **주인피해가 0 을 벗어났다**
        (0/84 → 4/84). 옆 칸이 더 크다: 최고층 10→27 · 관문 주인 최장생존 309→99초 ·
        7분 끝 적 수 233→3 · 내 체력 25%→100%. 상한은 **작을수록 좋다**(4 > 8 > 12).
     ② 씨앗 여덟 · 12분(`ab_lh_addcap.sh` · 0 vs 4) — D-3 원래 잣대 둘 다 통과:
        **3분 넘긴 판 2 → 0**, 최고층 합 364 → 392(**108%** · 조건 80% 이상).
        조용했던 두 판이 풀렸다 — 씨앗 7 은 268초→86초(최고층 23→50), 씨앗 1 은 188초→54초.
     ⇒ 그래서 기본을 **4** 로 켠다(값을 켜는 것은 A/B 뒤에만 · ROADMAP D-3 축 ①). */
export const ADD_CAP_DEF = 4;
const ADD_CAP_OF = () => (typeof globalThis !== "undefined" && globalThis.__ADD_CAP != null)
  ? +globalThis.__ADD_CAP : ADD_CAP_DEF;

/* ══ 관문은 **서는 순간 수법을 약속한다**(GATE_VOW) ══
   GATE_SEC(주인 체력을 내 군대로 매기기)는 2026-08-14 11:0x 에 졌다 — 조건 ①(깊은 띠에
   피해가 닿는가)은 처음으로 열렸는데, 어느 눈금(1.5·2.5·4·6·14)에서도 **최고층이
   기준선의 60~70% 로 무너졌다.** 세 씨앗이 전부 25~40층에서 죽고 되돌아오기를 반복한다.
   눈금 탓이 아니다 — 이 축은 **내 화력이 층 체력을 앞지르는 그 층**에서 갑자기 켜져
   거기에 벽을 세운다. 값을 낮춰도 벽의 자리만 조금 옮길 뿐이다(같은 자리를 두 번 고치면
   방법을 바꾼다).
   ★ 그래서 위험을 **주인의 질김에서 완전히 떼어 낸다.** 주인이 서면 그 자리에서 수법
     GATE_VOW 번을 약속하고, 그 전에 치워져도 **약속한 만큼은 예정대로 터진다**(예고 fx 를
     제 시각에 띄우므로 「예고 없이 터짐」이 아니다). 체력은 한 톨도 안 건드리니 관문이
     벽이 되지 않고, 세기는 m.dmg = floorDmg(f) 라 **깊이를 따라 저절로 큰다.**
   0 이면 손 안 댐(예전 그대로) — 검수기가 `globalThis.__GATE_VOW` 로 쓸어 본다.
   ★ **2 로 박았다**(2026-08-14 12:08 · 아래 GATE_VOW_CAP 주석의 쓸기 결과). 상한 없이는
     이 축도 벽을 세웠지만, 상한 0.18 과 같이 쓰면 조건 ①·② 가 **처음으로 동시에** 열린다. */
export const GATE_VOW_DEF = 2;
const GATE_VOW_OF = () => (typeof globalThis !== "undefined" && globalThis.__GATE_VOW != null)
  ? +globalThis.__GATE_VOW : GATE_VOW_DEF;
/* ══ 약속의 세기는 **층이 아니라 내 체력으로** 매긴다(GATE_VOW_CAP) ══════════════
   GATE_VOW 첫 쓸기(2026-08-14 11:39 · 15분 × 씨앗 1·3·9)에서 조건 ①은 넉넉히 열렸는데
   (깊은 띠 초당 1.2~1.7% 대 얕은 띠 0.8~1.1%) 조건 ②가 또 무너졌다 — 최고층 합이
   기준선의 69%(팔 2) · 50%(팔 5)이고 **세 씨앗이 전부 같은 층에서 멈춘다**
   (팔 2 → 35·35·35 · 팔 5 → 25·26·25). 씨앗이 달라도 같은 층이면 확률이 아니라 **산수**다.
   ★ 그 산수는 이렇다: 내 체력의 바닥은 `hpMaxOf = max(bodyHp, floorDmg(f) × SURVIVE_HITS)`
     이고 SURVIVE_HITS 는 5 다. 그런데 약속의 세기는 `m.dmg = floorDmg(f)` 이고 저주는
     그 **3.8배**로 닿는다 — 체력이 그 바닥에 붙는 층부터 **약속 한 번이 최대체력의 76%**,
     두 번이면 넘는다. 그 층이 곧 벽이고, 세기를 절반으로 낮춰 봐야 **벽의 자리만 옮긴다**
     (GATE_SEC 다섯 눈금이 이미 그렇게 졌다 — 같은 자리를 두 번 고치면 방법을 바꾼다).
   ★ 그래서 눈금을 바꾼다 — 약속 하나가 가져갈 수 있는 몫을 **그때 내 최대체력의 몇 %**
     로 묶는다. 깊이를 따라 자라는 성질은 그대로다(hpMaxOf 자체가 층을 따라 큰다).
     어느 깊이에서도 한 방이 나를 지우지 못하므로 **벽이 설 자리가 산수에서 사라진다.**
     묶는 것은 **약속만 남은 수법**뿐 — 주인이 제 손으로 내는 수법은 한 톨도 안 건드린다.
   0 이면 손 안 댐(상한 없음 = 예전 그대로) — 검수기가 `globalThis.__GATE_VOW_CAP` 로 쓴다.
   ★ **0.18 로 박았다**(2026-08-14 12:08 · 15분 × 씨앗 1·3·9 · `tools/a1_vowcap.sh`):

         약속 0 · 상한 0     최고층 합 153 (기준선) · 죽음 7 · 깊은 띠 0.10~0.59% (얕은 0.96~1.25)
         약속 2 · 상한 0.08  합 171 (112%) · 죽음 6 · 깊은 띠 0.43·0.58·0.75% ← ① 한 씨앗이 38%(실패)
         약속 2 · 상한 0.18  합 159 (104%) · 죽음 7 · 깊은 띠 0.74·0.85·1.29% ← ①·② **둘 다 통과**
         약속 2 · 상한 0.30  합 135 ( 88%) · 죽음 9 · 깊은 띠 1.03·1.19·1.45% ← 최고층 45·45·45(벽 조짐)

     상한이 **조건 ②를 살렸다** — 여태 세 축(OPEN_MUL·GATE_SEC·상한 없는 GATE_VOW)이 모두
     최고층을 50~70% 로 무너뜨렸는데, 여기선 기준선을 오히려 넘는다(104%). 0.30 은 ①이 제일
     세지만 씨앗 셋이 **전부 45층**에서 멈춘다 — 확률이 아니라 산수, 즉 벽이 다시 서는 자리다.
     0.08 은 ②가 제일 좋아도 깊은 띠가 얕은 띠의 38% 인 씨앗이 있어 ①을 못 넘는다. */
export const GATE_VOW_CAP_DEF = 0.18;
const GATE_VOW_CAP_OF = () => (typeof globalThis !== "undefined" && globalThis.__GATE_VOW_CAP != null)
  ? +globalThis.__GATE_VOW_CAP : GATE_VOW_CAP_DEF;
/** 수법마다 **한 방이 실제로 닿는 배수** — fireMech 안의 곱을 그대로 옮겨 적은 것이다.
 *  상한을 「최대체력의 몇 %」로 걸려면 이 배수를 나눠 줘야 눈금이 수법끼리 같아진다.
 *  add 는 졸개를 세우는 것이라 한 방이 없다(상한 대상이 아니다 — 1 로 둔다). */
const MECH_HIT = { curse: 3.8, charge: 3.0, pool: 0.85, add: 1 };
/** 「지금 군대가 내는 화력」의 기억 길이(초). 짧으면 한 방에 출렁이고, 길면 관문에
 *  들어선 뒤의 화력을 못 따라간다. */
const DPS_TAU = 4;
/** 적에게 들어간 피해가 **전부 여기를 지난다**(hurtNecro 의 반대쪽). 여섯 자리에서
 *  제각기 `m.hp -=` 하던 것을 한 길로 모아, 화력을 한 군데서 셀 수 있게 했다. */
export function hurtMob(m, dd) { m.hp -= dd; S.dealtAcc = (S.dealtAcc || 0) + dd; }

export function enterFloor(f) {
  /* ── 앞 층 시체 그림을 걷는다 ── ②는 「개수 S.corpses 와 그림 S.piles 는
     addCorpse/useCorpse 두 길로만 움직인다」가 규칙이다. **여기가 그 유일한 예외.**
     자원을 쓰는 게 아니라 **새 층으로 내려온 것**이라, 앞 층 시체가 새 판에 깔려 있으면
     「내려왔다」가 깨진다. 그래서 개수는 한 톨도 안 건드리고(가진 시체 수는 그대로),
     판 위 그림에만 fade 를 걸어 어둠에 잠기게 지운다(step 이 다 잠기면 배열에서 뺀다). */
  for (const p of S.piles) p.fade = PILE_FADE;

  S.floor = f;
  /* ★★ **몸도 층을 따라 큰다.** hpMaxOf 에 「그 층 피해 × SURVIVE_HITS」라는 바닥을
     뒀는데(core.js) 아무 일도 안 났다 — `S.hp` 는 **판을 열 때(1층) 한 번만** 정해지고
     그 뒤로 안 컸기 때문이다. 얕은 층에서는 키운 몸이 더 커서 바닥이 안 물리고,
     깊이 내려가도 그 옛 숫자를 그대로 들고 다녔다(50층에서 4,662 피해 대 410).
     여기서 **비율을 지키며** 새 최대치로 옮긴다 — 반쯤 깎인 채 내려왔으면 반쯤인 채로
     커진다. 층마다 공짜로 가득 채워 주면 그건 다른 게임이 된다. */
  { const nm = hpMaxOf(), om = S.hpMax || nm;
    S.hp = Math.max(1, Math.round(S.hp * nm / om)); S.hpMax = nm; }
  S.mobs = [];
  /* 앞 층 관문이 남긴 약속(pendMech · GATE_VOW)은 여기서 끊는다 — 내려온 뒤에 앞 층
     수법이 터지면 「어디서 온 것인지 알 수 없는 피해」가 된다(add 는 졸개까지 세운다). */
  S.pendMech.length = 0;
  S.push.x = 0; S.push.y = 0;                 // 새 층은 본인 곁에서 시작한다
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
    const lord = gatelordFor(f);
    say(`<b style="color:${lord.col}">${f}층 · 관문</b> ${lord.n} 이(가) 지키는 중`);
  } else {
    say(`<b>${f}층</b> 진입`);
  }
  S.spawnT = 0;                                // 첫 놈은 바로
  S.deepest = Math.max(S.deepest, f);
  /* ★ **닿은 그 순간에 적는다** — 예전엔 die() 에서만 META.deepest 를 올렸다. 그래서
     안 죽고 계속 내려가는 동안 머리말은 **옛 숫자에 붙박여** 있었다(25분을 굴려 18층에
     서 있는데 「가장 깊이 15층」). 「더 깊이」가 목표인 게임에서 그 숫자가 안 움직이면
     벽에 막힌 것처럼 보인다 — 실제로는 나아가고 있었다. */
  META.deepest = Math.max(META.deepest | 0, f);
  /* ⑦ 관문을 하나 지나 새 층에 들어섰다(직전 층 f-1 이 관문) — 죽으면 newRun 이 S.qrun 을
     비우니 「한 판에 다섯」이 저절로 리셋된다. f>1 은 시작(1층)의 f-1=0 이 isGate(0)=참이라
     생기는 헛계수를 막는다. 대군(열)으로 이 깊이에 닿았는지도 같은 자리에서 본다. */
  if (f > 1 && isGate(f - 1)) questNote("gate", 1);
  if (f >= 20 && armyN() >= 10) questNote("army10", 1);
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
    const lord = gatelordFor(q.f);
    m.boss = true; m.kind = "boss"; m.lord = lord;
    /* 수법 상태: mechCd 는 다음 수법까지, mstate/mtell 은 돌진 상태머신(0 대기·1 예고·2 돌진).
       ★ **첫 예고는 서는 즉시 튼다**(예전 cd×0.6 = 1.7초 뒤). 깊은 관문의 주인은 한 번에
         0.8 초밖에 못 사는데 첫 수법까지 3.3초(born 0.8 + 1.7 + tell 0.8)가 필요해
         50-99층 관문 29/29 번이 **수법을 한 번도 못 쓰고** 치워졌다(a1_gate 2026-08-14).
         기다리는 1.7초를 없애고, 예고를 남기고 죽으면 아래 pendMech 가 이어 터뜨린다. */
    m.mechCd = 0; m.mstate = 0; m.mtell = 0;
    /* ★ **바닥을 지금 내 군대에 둔다**(위 GATE_SEC 주석). 얕은 관문은 층 체력 쪽이 더 커서
       하나도 안 바뀌고, 깊은 관문만 「최소 GATE_SEC 초는 선다」로 끌어올려진다 —
       그래야 수법이 다 여문 뒤에 터진다(OPEN_MUL 로 안 깎인다). 0 이면 손 안 댐. */
    m.hp = m.hpMax = Math.max(floorHp(q.f) * 7, (S.armyDps || 0) * GATE_SEC_OF());
    /* ★ **서면서 약속한다**(위 GATE_VOW 주석) — 제가 낸 수법마다 하나씩 갚고, 갚지 못한
       채 치워지면 죽는 자리에서 남은 약속을 예정대로 걸어 둔다. */
    m.vow = GATE_VOW_OF();
    m.dmg = floorDmg(q.f) * lord.dmgMul; m.h = bossH(q.f); m.r = m.h * FOOT_R;
    /* ★ **큰 몸은 같은 속도로 걸으면 굼떠 보인다.** 병수님 2026-08-13: "특히 보스
       움직임이 부자연스럽고 굼뜬느낌이 강하네". 절대 속도로는 보스도 졸개도 22~32 로
       **똑같아서** 여태 어느 자에도 안 걸렸다 — 사람 눈은 「제 몸 폭의 몇 배/초」로 본다.
       tools/boss_qa.mjs 로 재니 보스 0.14, 졸개 0.25~0.30, 아군 0.30 이었다.
       제 몸 하나 지나는 데 **7초** — 판에서 제일 굼떴다(멈춘 비율은 4%로 제일 낮았으니
       끊김이 아니라 순전히 크기 탓이다).
       보폭을 몸 크기의 **제곱근**만큼 늘린다 — 그대로 비례시키면 졸개와 똑같이 보여
       「크고 무거운 것」이라는 느낌이 사라지고, 안 늘리면 지금처럼 굼뜬다. */
    m.spd *= Math.pow(m.r / (48 * FOOT_R), 0.35);
    /* 관문 보스는 **더 길게** 배어 나온다(0.8 — 졸개의 두 배). 서기 직전 그 자리
       바닥에 붉은 고리가 퍼졌다 조여들고(fx), 서는 순간 판이 아주 짧게 흔들린다 —
       관문이 졸개 층과 똑같이 생긴 것을 「여기 주인이 선다」로 가른다. */
    /* ★ 보폭을 키우면 **도착도 빨라진다** — 그것만으로 12분 최고층이 29→24 로 깎이고
       죽음이 1→5 회로 뛰었다(관문이 벽이 됐다). 걸음은 눈의 문제고 도착은 셈의 문제라
       **따로 갚는다** — 빨라진 만큼(약 2초) 더 오래 배어 나오게 한다.
       덤으로 관문이 더 관문 같아진다: 붉은 고리가 퍼졌다 조여드는 동안 판이 숨을 고른다. */
    m.born0 = 2.6;
    S.fx.push({ t: BOSSRING_T, x: m.x, y: m.y, kind: "bossring" });
    S.shake = 0.25;
  } else {
    m.born0 = 0.4;
  }
  m.born = m.born0;
  const [lo, hi] = SPAWN_GAP;
  /* ⑧-c 판이 비어 있는 만큼 빨리 낸다(위 SPAWN_FULL 주석). S.mobs 는 방금 세운 놈까지
     세므로 최소 1 — 즉 텅 빈 판의 배수는 1/6 이지 0 이 아니다. 배어 나오는 중(born)인
     놈도 판에 선 것으로 친다: 안 세면 0.4 초 동안 하한이 걸려 네댓이 한꺼번에 쏟아진다. */
  const mul = SPAWN_FULL > 0
    ? Math.max(SPAWN_RUSH, Math.min(1, S.mobs.length / SPAWN_FULL))
    : 1;
  S.spawnT = (lo + Math.random() * (hi - lo)) * mul * gapMul();
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

/* ══ 죽은 원인을 적는 곳 ══ 네크로가 죽는 순간(die→endRun)에 **직전 5초 최다 사인**을
   여기 쌓는다 {floor,gate,cause,lordIdx,lord}. 검수기가 window.__deathLog(main.js)로 읽어
   주인마다 죽은 원인 분포가 다른지 본다. 판을 넘어 사는 누계라 newRun 이 안 지운다. */
export const DEATHLOG = [];

/** 네크로가 피해를 입는 **한 자리로 모은다.** 근접·장판(pool)·돌진(charge)·저주(curse)가
 *  전부 여기로 와서 원인 꼬리표(cause)를 S.hurtLog 에 남긴다 — 예전엔 근접 한 방만 p.core
 *  자리에서 직접 깎았다. dx,dy 는 밀리는 방향(적→중앙). 체력·움찔·불꽃·숫자·죽음 판정을
 *  그 자리의 안무 그대로 옮겼다. */
export function hurtNecro(dmg, cause, dx = 0, dy = 0) {
  if (dmg <= 0 || S.dead) return;
  S.hp -= dmg;
  popNum(0, 0, dmg, "core");
  S.hurt = 0.18;
  const l = Math.hypot(dx, dy) || 1;
  S.hkx = dx / l; S.hky = dy / l;
  S.hknock = knockOf({ hpMax: hpMaxOf() }, dmg);
  S.fx.push({ t: 0.12, kind: "hit", x: -(dx / l) * CORE_R * 0.8, y: -(dy / l) * CORE_R * 0.8 });
  (S.hurtLog || (S.hurtLog = [])).push({ t: S.t, cause: cause || "melee", dmg });
  if (S.hp <= 0) { S.hp = 0; die(); }
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
/** **셈의 상한.** 그림과 **같은 값**으로 둔다. 재 보니 죽을 때 시체가 1,277 구였다 —
 *  판에 보이는 것은 140 인데 셈만 열 배로 올라가 있었고, 마나도 100% 로 남았다.
 *  자원이 넘치면 **그 자원으로 하는 선택이 사라진다**(「시체를 아꼈다 폭발로 쓴다」가
 *  성립하려면 모자랄 때가 있어야 한다). 넘치는 몫은 세지 않는다 — 대신 넘치기 전에
 *  화력으로 바꿀 길을 낸다(main.js auto 의 시체 폭발). */
export const CORPSE_MAX = PILE_MAX;
/** **환전** — 쌓인 만큼 크게 터진다. 재 보니 배수구(문턱을 낮춰 자주 터뜨리기)로는
 *  못 뺐다: 폭발이 한 번에 한 구를 먹으니 재사용 2.2초 = **분당 27 구**가 천장인데
 *  깊은 층의 유입이 그걸 넘어 시체가 140 에 붙박였다(문턱 1/5·문턱 없음 둘 다).
 *  그래서 버리지도 흘리지도 말고 **한 입을 크게** 한다 — 쌓인 몫의 1/DIV 를 한 번에
 *  먹고 그만큼 세게 터진다. 유입이 클수록 배수도 같이 커져 **스스로 균형이 잡히고**,
 *  「아꼈다 한 방」이라는 판단이 그때 생긴다.
 *  ★ 재서 고른 값이 **8** 이다(tools/ab_corpse3.sh · 씨앗 3·9·5 · 12분 · 0 이면 한 구).
 *  최고층 합 base 89 · 문턱만 내린 burn 86 → **gulp8 95** 로 더 깊이 갔고, 시체는
 *  140 붙박이에서 **24~63 을 오르내리다 27 언저리**로 앉았다(이제 모자랄 때가 있다).
 *  더 크게 문 gulp4 는 **84 로 되레 얕아지고 죽음도 둘** 났다 — 한 입이 너무 크면
 *  쌓일 틈이 없어 정작 필요한 순간에 빈손이다. 8 이 그 사이다. */
export const NOVA_GULP_DIV = 8;
/** 한 입의 상한. 없으면 140 을 통째로 먹어 한 방에 판이 끝난다. */
const NOVA_GULP_CAP = 32;
/** 이번 폭발이 먹을 시체 수. */
function novaGulp() {
  if (!NOVA_GULP_DIV) return 1;
  return Math.max(1, Math.min(NOVA_GULP_CAP, Math.ceil(S.corpses / NOVA_GULP_DIV)));
}

/* ⑥ 시체 소비처 셋. burn 은 시체당 마나, wall 은 길목을 막는 뼈 벽(수명 초),
   offer 는 관문 주인이 받는 피해 배수와 지속·수법 지연. */
const BURN_MP = 4;
const WALL_SEG = 3, WALL_R = 34, WALL_LIFE = 6.0;
const WALL_RAD = RING_HOLD * 1.15, WALL_SPREAD = 0.30, WALL_MAX = 9;
const OFFER_WK = 1.6, OFFER_DUR = 10, OFFER_TELL = 1.5;
/** 적이 몰린 쪽(단위벡터 합)의 길목에 뼈 벽 조각 여럿을 짧은 호로 세운다. 난수 안 먹는다. */
function buildWall() {
  if (!S.walls) S.walls = [];
  let ax = 0, ay = 0, n = 0;
  for (const m of S.mobs) { const l = Math.hypot(m.x, m.y) || 1; ax += m.x / l; ay += m.y / l; n++; }
  const base = n ? Math.atan2(ay, ax) : 0;
  for (let i = 0; i < WALL_SEG; i++) {
    const a = base + (i - (WALL_SEG - 1) / 2) * WALL_SPREAD;
    S.walls.push({ x: Math.cos(a) * WALL_RAD, y: Math.sin(a) * WALL_RAD, r: WALL_R, t: WALL_LIFE, life: WALL_LIFE });
    if (S.walls.length > WALL_MAX) S.walls.shift();
  }
}
/** @param pw 이 시체 주인의 **최대 체력.** 일어나는 놈이 이것을 물려받는다
 *  (core.js 의 「소환수는 제가 일어난 시체만큼 세다」). 0 이면 종족 기본값으로만 선다. */
export function addCorpse(x, y, sort, n = 1, pw = 0) {
  /* ★★ **바닥은 그 층이다.** 처음엔 주인의 체력만 실었더니 **내리막 고리**가 생겼다 —
     소환수가 죽으면 그 약한 주검이 시체가 되고, 그것으로 또 약한 놈이 서고, 그놈이
     또 죽는다. 30분 굴려 재 보니 20층에서 물려받은 체력이 **344 여야 할 자리에 68**
     이었다(죽은 놈 1204 구 중 대부분이 제 소환수의 주검이었다).
     그 층에 서 있는 몸은 무엇이든 **그 층의 격**은 된다 — 거기를 바닥으로 둔다.
     관문 주인은 제 체력이 더 크므로 여전히 특별하다. */
  pw = Math.max(pw | 0, floorHp(S.floor));
  /* ══ 환생 배수(유해)를 시체 획득에 건다 ══ 결정적이라야 A/B 가 성립한다 — 확률로
     한 구를 더 얹으면 Math.random 을 먹어 같은 씨앗이 다른 판이 된다. 그래서 남는 몫을
     corpseCarry 에 이어 붙여 반올림이 한쪽으로 쏠리지 않게 한다. 유해가 0 이면 mul=1 ·
     raw=n(정수) 이라 n 그대로고 carry 는 0 에 머문다 — 환생 전엔 한 톨도 안 다르다. */
  const raw = n * relicMul() + corpseCarry;
  n = Math.floor(raw);
  corpseCarry = raw - n;
  for (let i = 0; i < n; i++) {
    /* ★ 셈은 상한에서 멈추지만 **그림은 계속 눕힌다** — 죽었는데 아무것도 안 남으면
       판이 거짓말을 한다. 넘치는 몫은 「들고 갈 수 없는 것」이지 「안 죽은 것」이 아니다. */
    if (S.corpses < CORPSE_MAX) S.corpses++;
    /* 개체마다 **다르게 눕는다** — 각도는 한 바퀴 전부(위에서 내려다본 그림이라 어느
       쪽으로 누워도 말이 된다), 크기는 ±15%, 좌우도 뒤집는다. 여기에 색까지 얹으면
       세 장으로 수십 가지가 나온다(core.js 의 CORPSE_TINT). */
    S.piles.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 6,
                   sort, pw, t: 0, born: CORPSE_FADE, rot: Math.random() * 6.2832,
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
/** ══ 터진 뼛조각 ══ 쓴 시체 수만큼 조금 더 많이 튄다.
 *  값은 판을 **안 건드린다**(피해 없음) — 그림만이라 A/B 로 잰 밸런스가 그대로 유효하다.
 *  난수를 쓰긴 하지만 검수기가 씨앗을 박으므로 같은 씨앗이면 같은 조각이 튄다. */
function gib(x, y, n = 1) {
  const cnt = Math.min(18, 7 + n * 3);
  for (let i = 0; i < cnt; i++) {
    const a = Math.random() * 6.2832, sp = 40 + Math.random() * 110;
    /* 누운 조각이 곧바로 사라지면 「터진 자리」가 안 남는다 — 넉넉히 둔다(1.4~2.3초). */
    S.fx.push({ kind: "gib", t: 1.4 + Math.random() * 0.9,
      x, y, z: 6 + Math.random() * 10,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * SQUASH_VIEW, vz: 90 + Math.random() * 150,
      spin: Math.random() * 6.28, dspin: (Math.random() - 0.5) * 14,
      big: Math.random() < 0.3, landed: 0 });
  }
}

export function useCorpse(n = 1, nearX = 0, nearY = 0, why = "?") {
  let at = null, refund = 0, refPw = 0, took = 0;
  for (let i = 0; i < n; i++) {
    if (S.corpses <= 0) break;
    S.corpses--; took++;
    S.used = (S.used | 0) + 1;         // 이 판에서 자원으로 쓴 시체 — 정산이 읽는다
    /* 쓸 것은 **가까운 것부터** — 눈은 제일 가까운 시체가 사라지기를 기대한다 */
    let bi = -1, bd = 1e9;
    for (let j = 0; j < S.piles.length; j++) {
      const d = Math.hypot(S.piles[j].x - nearX, (S.piles[j].y - nearY) * SQUASH_VIEW);
      if (d < bd) { bd = d; bi = j; }
    }
    if (bi >= 0) {
      const p = S.piles.splice(bi, 1)[0];
      if (!at) at = { x: p.x, y: p.y, pw: p.pw | 0 };   // ← 격까지 함께 넘긴다
      /* 먼지는 **일어서는 내내** 인다 — 몸이 다 올라오기 전에 먼지가 걷히면
         둘이 남남으로 보인다(그리는 쪽이 RISE_T 로 진행도를 잰다). */
      S.fx.push({ t: RISE_T, x: p.x, y: p.y, kind: "rise" });
      /* ══ 유니크 twice ══ **쓴 시체의 절반이 되돌아온다** — 시체가 두 번 쓰인다.
         쓴 자리·격 그대로 되살려, 다음 소환·폭발이 곧장 다시 먹을 수 있게 한다. */
      if (hasUnique("twice") && Math.random() < TWICE_P) { refund++; refPw = Math.max(refPw, p.pw | 0); }
    }
  }
  /* 소비처별 집계는 여기 한 자리에서만 갈린다(더하고 빼는 길이 addCorpse/useCorpse 둘뿐).
     newRun 이 일부러 안 지운다 — 죽음을 건너 한 측정 전체를 누적해야 표본이 성립한다. */
  if (took) { const u = S.corpseUse || (S.corpseUse = {}); u[why] = (u[why] | 0) + took; }
  if (refund) addCorpse(at ? at.x : nearX, at ? at.y : nearY, "bones", refund, refPw);
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
  /* 반지름이 곧 역할이다. 골렘은 **바깥**(벽) — 도발로 적을 끌 때 안쪽에 있으면 적을
     본체 쪽으로 당겨 오히려 뚫린다. 벽은 앞에 서야 적을 밖에서 붙잡는다. 해골·구울은
     그 벽 뒤(안쪽)에서 안전하게 때린다. 예전엔 골렘이 안쪽(0.72)이었는데 그때는
     도발이 없어 그냥 「센 해골」이었다 — 벽의 일이 생겼으니 자리도 앞으로 옮긴다. */
  const rad = RING_HOLD * (kind === "golem" ? 1.25 : kind === "ghoul" ? 0.9 : 1.05);
  /* ★ 뼈 갑주(트리)가 체력을 올린다 — **소환되는 순간에** 정한다.
     그리고 **쓴 시체의 격**을 물려받는다(at.pw). 둘은 곱으로 쌓인다 — 트리는
     어느 시체에서 일어나든 듣고, 시체는 깊이 갈수록 좋아진다. */
  const pw  = at ? (at.pw | 0) : 0;
  const hp0 = Math.round(raiseHp(K.hp, pw) * minionHpMul());
  const dmg0 = raiseDmg(K.dmg, pw);
  const usc = raiseScale(K.hp, pw);
  /* 선 자리는 **쓴 시체의 자리**, 없으면 예전처럼 제 구역 안쪽. 어느 쪽이든 곧
     제 자리(home)로 걸어간다 — 그 걸음까지가 「불려 나왔다」로 읽힌다. */
  const sx = at ? at.x : Math.cos(best) * rad * 0.4;
  const sy = at ? at.y : Math.sin(best) * rad * 0.4;
  S.minions.push({ id: ++seq, kind, home: best, rad, h: K.h * usc,
                   x: sx, y: sy, rise: RISE_T, dmg: dmg0,
                   hp: hp0, hpMax: hp0, atk: 0, r: K.h * usc * FOOT_R });
  S.summoned = (S.summoned | 0) + 1;   // 판이 끝나면 정산이 읽는다(빈손일 때 가운데를 채운다)
  if (S.floor >= 20 && armyN() >= 10) questNote("army10", 1);   // ⑦ 대군이 층 도중 채워질 때도 잡는다(enterFloor 는 입장 순간만 봄)
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
  if (id === "offer" && (!isGate(S.floor) || !S.mobs.some(m => m.boss))) return false;

  S.mp -= mpNeed; S.cd[id] = sk.cd * cdMul();
  /* 시체를 쓰면 **판 위의 그것이 없어진다.** 어디 것을 썼는지가 보여야 자원이 된다.
     시체 폭발은 본인 둘레를 쓸므로 가운데에서, 소환은 세울 자리에서 가까운 것을 쓴다. */
  /* 폭발만 **여러 구를 한 입에** 먹는다(환전). 소환은 한 구 그대로 — 소환수 값이
     시체 수에 따라 흔들리면 군세 상한과 겹쳐 읽을 수 없게 된다. */
  const gulp = id === "nova" ? novaGulp() : sk.corpse;
  /* ★★ **어느 시체를 쓰느냐**도 스킬마다 다르다.
     소환은 **내 곁**의 시체를 쓴다(불러낸 놈이 진으로 걸어가야 하니 가까울수록 좋다).
     시체 폭발은 **적 쪽**의 시체를 쓴다 — 터지는 자리가 곧 피해가 닿는 자리이므로,
     발밑 시체를 터뜨리면 아무도 안 맞고 그림만 내 몸에서 난다(병수님이 본 그 장면).
     예전엔 둘 다 `useCorpse(gulp, 0, 0)` 으로 **내게 제일 가까운 것**을 썼다. */
  let anchorX = 0, anchorY = 0;
  if (id === "nova") {
    let bd = 1e9;
    for (const m of S.mobs) { const d = Math.hypot(m.x, m.y * SQUASH_VIEW);
      if (d < bd) { bd = d; anchorX = m.x; anchorY = m.y; } }
  }
  const why = isRaise(id) ? "summon" : id;
  const usedAt = sk.corpse ? useCorpse(gulp, anchorX, anchorY, why) : null;
  if (isRaise(id)) { summon(MINION_OF[id], usedAt); say(`<b>${MINIONS[MINION_OF[id]].n}</b> 소환`); }
  if (id === "nova") {
    /* **시체 폭발** — 이 직업의 상징. 시체 하나로 앞줄을 통째로 지운다. */
    /* 먹은 만큼 세진다 — 피해는 구당 +60%, 범위는 구당 +4%(최대 1.5배). 범위를 피해와
       같은 기울기로 올리면 한 입에 판이 통째로 지워져 층이 그냥 흘러간다. */
    const gmul = 1 + (gulp - 1) * 0.6;
    const dmg = 30 * Math.pow(1.14, S.floor) * dmgMulOf() * selfMulOf() * novaDmgMul() * gmul;
    const rad = 180 * novaRadMul() * Math.min(1.5, 1 + (gulp - 1) * 0.04);
    let hit = 0;
    /* ★★ **터지는 것은 시체다.** 예전엔 그림도 피해도 **본인 자리(0,0)** 에서 냈다 —
       쓴 시체의 자리(usedAt)를 이미 구해 놓고 소환에만 쓰고 있었다.
       병수님: "시체폭발 스킬 사용 이펙트가 왜 내주위에서 터지는거야, 폭발되는 시체에
       이펙트가 나와야지". 맞는 말이고, 이 게임의 이야기와도 그게 맞다 —
       시체가 자원이고 그 시체가 터진다. 쓴 자리를 폭심으로 삼는다. */
    const bx = usedAt ? usedAt.x : 0, by = usedAt ? usedAt.y : 0;
    for (const m of S.mobs) if (Math.hypot(m.x - bx, (m.y - by) * SQUASH_VIEW) < rad) {
      const dd = dmg * (m.wkT > 0 ? m.wk : 1); hurtMob(m, dd); hit++; popNum(m.x, m.y, dd, "nova"); }
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
        questNote("feast", e.fed);             // ⑦ 한 소환수를 여덟 번 먹이면 「시체 잔치」(max 로 최고 먹인 수를 본다)
        const grow = 1 + 0.05;                 // 이번 한 입만큼 체력 그릇도 같이 큰다
        e.hpMax = Math.round(e.hpMax * grow); e.hp = Math.round(e.hp * grow);
        e.r *= grow;                           // 몸이 크면 자리도 그만큼 차지한다
      }
    }
    S.fx.push({ t: 0.35, x: bx, y: by, kind: "nova", rad });
    gib(bx, by, gulp);                              // 터진 자리에서 뼛조각이 튄다
    say(`<b style="color:#ff8000">시체 폭발</b>${gulp > 1 ? ` 시체 ${gulp}구` : ""} · ${hit}마리 · 각 ${Math.round(dmg)} 피해`);
  }
  if (id === "burn") {
    const gain = gulp * BURN_MP;
    S.mp = Math.min(mpMaxOf(), S.mp + gain);
    /* ★ 예전엔 `kind:"rise"` 였다 — **소환 그림**으로 시체를 태웠다. 태우는 것은 불이다. */
    S.fx.push({ t: RISE_T, x: usedAt ? usedAt.x : 0, y: usedAt ? usedAt.y : 0, kind: "burn" });
    say(`<b style="color:#ff8000">시체 태우기</b> 시체 ${gulp}구 → 마나 +${Math.round(gain)}`);
  }
  if (id === "wall") {
    buildWall();
    say(`<b style="color:#c8c0b0">백골 벽</b> 시체 ${gulp}구 · 길목을 막는다`);
  }
  if (id === "offer") {
    let boss = null; for (const m of S.mobs) if (m.boss) { boss = m; break; }
    if (boss) {
      boss.wk = OFFER_WK; boss.wkT = OFFER_DUR;
      boss.mtell = (boss.mtell || 0) + OFFER_TELL; boss.mechCd = (boss.mechCd || 0) + OFFER_TELL;
      /* ★ 예전엔 `kind:"nova"` 였다 — **시체 폭발 그림**으로 제물을 바쳤다. 바치는 것은
         터지는 것이 아니라 주인에게 **빨려 올라가는** 기운이다. */
      S.fx.push({ t: 0.5, x: boss.x, y: boss.y, kind: "offer" });
      questNote("offer", 1);                          // ⑦ 관문에서 제물을 바쳤다(cast 가드가 관문·보스를 이미 보장)
      say(`<b style="color:#a06ad0">제물</b> · ${boss.lord ? boss.lord.n : "주인"}이(가) 약해진다`);
    }
  }
  if (id === "amp") {
    S.amp = ampSecs();
    /* ★ **여기 fx 가 아예 없었다.** 8초짜리 저주인데 화면에서는 아무 일도 안 났다 —
       로그 한 줄이 전부였다. 쓴 티가 안 나는 스킬은 안 쓴 것과 같다. 적 무리 한가운데에
       고리를 깐다(저주는 판 전체에 걸리므로 자리는 무리의 무게중심). */
    let cx = 0, cy = 0, n = 0;
    for (const m of S.mobs) { cx += m.x; cy += m.y; n++; }
    S.fx.push({ t: 0.6, x: n ? cx / n : 0, y: n ? cy / n : 0, kind: "curse" });
    say(`<b style="color:#6a6aff">약화의 저주</b> ${ampSecs()}초 지속`);
  }
  /* **시전하는 순간을 몸으로 보인다.** 네크로는 안 움직이니 걷기 그림이 없다 — 유일하게
     자세가 바뀌는 때가 스킬을 쓸 때다. 소환수의 휘두름과 같은 길이(SWING_T)의 창을 켜서,
     그리는 쪽(main.js)이 그 사이 공격 프레임을 튼다. */
  /* ★★ **시전은 팔 자세가 아니라 발밑 고리다.** 예전엔 소환도 던지기도 `S.pswing`
     하나를 켰다 — 같은 팔 그림을 쓰고 서로 되감아서, 겹치면 팔이 처음으로 돌아갔다
     (재 보니 25초에 11번 · 뼈가 0.54초까지 늦음). 병수님: "소환이랑 공격이랑 겹쳐서
     실행되면 부자연스러운듯".
     ★ 한 번 헛디뎠다 — 「도는 몸짓은 되감지 않는다」로 막았더니 소환이 워낙 잦아
       **던질 때 자세가 열아홉 번 다 안 떴다.** 막을 게 아니라 갈라야 했다.
     이제 시계가 둘이다: `pswing` = 던지는 팔 · `pcast` = 시전하는 발밑 고리.
     동시에 일어나도 서로 안 건드리고, 뜻에도 맞는다 — 소환은 손짓이지 타격이 아니다. */
  S.pcast = SWING_T;
  return true;
}

/** 한 걸음. `dt` 는 초. **판을 그리는 것과 완전히 갈라 둔다** — 자(funtest)가
 *  그림 없이 수천 초를 돌릴 수 있어야 재미를 잴 수 있다(앞 프로토타입의 교훈). */
export function step(dt) {
  if (S.dead) return;
  S.t += dt;
  /* 최대 체력을 **매 틱 맞춘다.** 예전엔 층을 넘을 때만 갱신해서, 판 안에서 레벨이
     오르면 최대치는 그대로인데 몸만 커져 화면에 **「824/816」** 이 떴다(2026-08-13
     스샷에서 눈으로 잡았다 — 자는 아무 말도 안 했다). 늘어난 만큼은 **채워 준다**
     (레벨을 올렸는데 비율만 같으면 오른 티가 안 난다). 줄면 그냥 깎는다. */
  { const nm = hpMaxOf();
    if (nm > S.hpMax) S.hp += nm - S.hpMax;        // 는 만큼은 채워 준다(오른 티가 나야 한다)
    S.hpMax = nm;
    /* **조건 없이** 깎는다 — 「248/240」은 레벨업이 hpMaxOf() 로 몸을 채워 놓고 상한을
       안 고친 뒤, 장비가 바뀌어 상한이 내려가서 남은 자국이었다. 어느 길로 넘치든
       여기서 한 번에 걷는다. */
    S.hp = Math.min(S.hp, nm); }
  /* **지금 군대가 내는 화력**(초당) — hurtMob 이 모아 둔 이번 틱 몫을 초당으로 고쳐
     DPS_TAU 만큼의 기억으로 고른다. 관문 주인의 체력 바닥이 이 값을 쓴다(GATE_SEC).
     읽기만 하는 셈이라 난수를 안 쓴다 — GATE_SEC=0 이면 게임은 예전 그대로다. */
  { const inst = (S.dealtAcc || 0) / Math.max(dt, 1e-3);
    S.dealtAcc = 0;
    S.armyDps = (S.armyDps || 0) + (inst - (S.armyDps || 0)) * Math.min(1, dt / DPS_TAU); }
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
      const g = GEAR[d.k], nm = nameOf(d), nc = d.uid ? "uniq" : "t" + d.tier;
      S.loot.push({ k: d.k, tier: d.tier, af: d.af || [], worn: r.worn, gold: r.gold, bagged: r.bagged, n: nm, slot: g.n, ref: r.ref, uid: d.uid });
      /* 붙은 것을 **로그에 적는다** — 안 적으면 「같은 4등급인데 왜 갈아 끼웠지」가
         화면 어디에도 없어서, 랜덤 옵션을 넣고도 없는 것과 같아진다. */
      const opts = (d.af || []).map((a) => afText(a)).join(" · ");
      const afl = opts ? ` <i class="afl">${opts}</i>` : "";
      /* 주운 그것이 간 곳을 **네 갈래로 갈라** 말한다: 착용 · 가방 · (셋이 모여) 합성 · (가방이 꽉 차 제일 나빠서) 금.
         주운 그것이 곧장 재료로 합쳐졌으면(pickedFused) 아래 합성 줄이 말하므로 여기선 조용히 넘긴다
         — 안 그러면 r.melted[0] 이 없어(재료는 녹은 것이 아니다) 금 줄에서 터진다. */
      const pickedFused = r.fused.some((f) => f.mats.includes(r.ref));
      let spill;
      if (r.worn)          { say(`<b class="${nc}">${nm}</b> 착용 — ${g.n}` + afl); spill = r.melted; }
      else if (r.bagged)   { say(`<b class="${nc}">${nm}</b> → 가방 (${META.bag.length}/${BAG_MAX})` + afl); spill = r.melted; }
      else if (pickedFused){ spill = r.melted; }
      else                 { say(`<b class="${nc}">${nm}</b> → 금 ${r.melted[0].gold}` + afl); spill = r.melted.slice(1); }
      for (const m of spill) say(`가방이 차서 <b class="t${m.tier}">${m.n}</b> → 금 ${m.gold}`);
      /* ⑤ 합성 — 같은 것 셋이 하나로. 사라진 재료는 정산에서 「재료」로 갈고(이번 판에 주운 것·중간
         산물이면 그 칸을 찾아), 생긴 것은 「합침」 칸으로 세운다. 로그는 한 줄, 등급 색은 기존과 같은 t{tier}. */
      for (const f of r.fused) {
        for (const mat of f.mats) {
          const le = S.loot.find((e) => e.ref === mat);
          if (le) { le.mat = true; le.made = false; le.worn = false; le.bagged = false; le.gold = 0; }
        }
        S.loot.push({ k: f.k, tier: f.tier, af: f.af, worn: false, gold: 0, bagged: false, n: f.n, slot: GEAR[f.k].n, made: true, ref: f.made });
        say(`같은 것 셋이 하나로 — <b class="t${f.tier}">${f.n}</b> (${f.tier}등급)` + (f.worn ? " · 착용" : ""));
      }
      S.fx.push({ t: 0.4, x: 0, y: 0, kind: "rise" });
      saveMeta();
      S.drops.splice(i, 1);
    }
  }
  for (let i = S.falling.length - 1; i >= 0; i--) if ((S.falling[i].t -= dt) <= 0) S.falling.splice(i, 1);
  /* **걷는 상태로 있는 내내** 시간을 센다(그리는 쪽 MIN_STEP_FPS 가 쓴다). 발을 실제로
     뗀 순간에만 세었더니 — 붙었다 떨어졌다 하는 사이가 빠져 박자가 절반으로 희석됐다
     (한 바퀴 2.3초). 화면이 「걷는 그림」을 내보이는 동안은 다리도 그만큼 움직여야 한다.
     병수님 2026-08-13 "하수인 걷는모션 없이 떠다님". */
  const walkT = (e) => { if (e.moving > 0) { e.moving -= dt; e.moveT = (e.moveT || 0) + dt; } };
  for (const e of S.minions) { walkT(e); if (e.swing > 0) e.swing -= dt; if (e.flinch > 0) e.flinch -= dt; if (e.rise > 0) e.rise -= dt; if (e.weak > 0) e.weak -= dt; }
  for (const e of S.mobs)    { walkT(e); if (e.swing > 0) e.swing -= dt; if (e.flinch > 0) e.flinch -= dt; if (e.born > 0) e.born -= dt; if (e.wkT > 0) e.wkT -= dt;
    /* ★ 주인이 오래 서 있으면 **지친다**(위 TIRE_AT 주석) — 끝나지 않는 싸움을 산수로 막는다. */
    if (e.boss) {
      const at = TIRE_AT_OF();
      e.age = (e.age || 0) + dt;
      if (at > 0 && e.age > at) {
        if (!e.tired) { e.tired = true;
          say(`<b style="color:#d0a06a">${e.lord ? e.lord.n : "주인"}</b>이(가) <b>지친다</b> — 받는 피해가 점점 는다`);
          S.fx.push({ t: 0.5, x: e.x, y: e.y, kind: "nova", rad: 70 }); }
        const t = 1 + (e.age - at) / TIRE_RAMP;
        if (!(e.wkT > 0) || e.wk < t) { e.wk = t; e.wkT = Math.max(e.wkT || 0, dt * 2); }   // 제물(1.6)이 더 세면 안 덮는다
      }
    }
  }

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
      /* 근접·장판·돌진·저주가 모두 hurtNecro 한 자리로 온다(원인 꼬리표를 남긴다).
         근접 한 방은 cause 가 없으면 "melee", 소환된 졸개(add)는 p.cause="add" 로 온다. */
      hurtNecro(p.dmg, p.cause || "melee", u.sdx, u.sdy);
      if (S.dead) return;
      continue;
    }
    const { tgt, dmg, heal } = p;
    if (!tgt || tgt.hp <= 0) continue;                  // 그새 죽었으면 허공을 친다
    hurtMob(tgt, dmg * (tgt.wkT > 0 ? tgt.wk : 1));     // 제물로 약해진 관문 주인은 더 크게 맞는다
    /* 맞은 쪽이 적이면 흰 숫자, 내 편이면 붉은 숫자 — **누가 아픈지**가 색으로 갈린다.
       (S.mobs 에 있으면 적이다. own 인 지배 소환수는 minions 에 있으므로 아군으로 샌다) */
    popNum(tgt.x, tgt.y, dmg, S.mobs.includes(tgt) ? "dmg" : "hurt");
    tgt.flinch = 0.18;                                   // 맞은 놈은 움찔하고 밀린다
    tgt.kx = u.sdx; tgt.ky = u.sdy;
    /* ★ **얼마나** 밀리는지는 한 방이 제 몸에서 차지하는 몫이 정한다(core 의 knockOf).
       큰 놈은 잔매에 안 밀리고 쭉 걸어온다 — 병수님이 지적한 자리다. */
    tgt.knock = knockOf(tgt, dmg);
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
  /* ── 본인의 뼈를 놓는 칸 ── 소환수·적과 **같은 몫**(IMPACT_AT)이지만 **제 시계**다. */
  if (S.pbolt && (S.pbolt.t -= dt) <= 0) {
    let t = null, td = NECRO_ATK.range;
    for (const m of S.mobs) { const d = Math.hypot(m.x, m.y); if (d < td) { td = d; t = m; } }
    if (t) { const d = Math.hypot(t.x, t.y) || 1;
      S.bolts.push({ x: 0, y: 0, dx: t.x / d, dy: t.y / d, dmg: S.pbolt.dmg, life: 2 }); }
    S.pbolt = null;                                    // 표적이 다 죽었으면 헛손질로 끝난다
  }
  if (S.pswing > 0) S.pswing -= dt;
  if (S.pcast  > 0) S.pcast  -= dt;
  /* ══ 유니크 overflow ══ **넘친 마나가 화력이 된다.** 자동 시전이 마나를 다 쓰면
     넘칠 일이 없고(약함), 스킬을 아끼면 넘쳐 쏟아진다(셈) — 남는 자원을 다른 자원으로
     바꾸는 물건이라 스스로 균형이 잡힌다. 넘친 몫을 모아 두었다가 제일 가까운 적 무리에
     한 번에 터뜨린다. 쌓임은 상한을 둬 한 방이 판을 끝내지 않게 한다. */
  const reg = dt * mpRegenOf(), mcap = mpMaxOf();
  if (hasUnique("overflow")) {
    S.overflow = Math.min((S.overflow || 0) + Math.max(0, S.mp + reg - mcap), OVF_TRIG * 2);
    if (S.overflow >= OVF_TRIG && S.mobs.length) {
      let bx = 0, by = 0, bd = 1e9;
      for (const m of S.mobs) { const d = Math.hypot(m.x, m.y * SQUASH_VIEW); if (d < bd) { bd = d; bx = m.x; by = m.y; } }
      const dmg = S.overflow * OVF_MUL * Math.pow(1.13, S.floor) * selfMulOf();
      for (const m of S.mobs) if (Math.hypot(m.x - bx, (m.y - by) * SQUASH_VIEW) < OVF_R) { const dd = dmg * (m.wkT > 0 ? m.wk : 1); hurtMob(m, dd); popNum(m.x, m.y, dd, "nova"); }
      S.fx.push({ t: 0.3, x: bx, y: by, kind: "nova", rad: OVF_R });
      S.overflow = 0;
    }
  }
  S.mp = Math.min(mcap, S.mp + reg);
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i];
    /* ★ **뼛조각은 날아가 떨어진다.** 병수님 2026-08-13: "시체폭발 스킬과 이펙트가
       안어울림, 시체가 터지는 느낌이 아닌듯?". 맞다 — 여태 그림 한 장을 띄워 알파만
       줄였을 뿐이라 「주황 원이 깜빡」이었지 **시체가 터진 것**이 아니었다.
       조각에 높이(z)와 떨어지는 힘을 준다. 바닥에 닿으면 그 자리에 눕는다 —
       터진 자리가 남아야 「무언가를 썼다」로 읽힌다. */
    if (f.kind === "gib") {
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.z += f.vz * dt; f.vz -= 620 * dt;              // 중력
      f.spin += f.dspin * dt;
      if (f.z <= 0) { f.z = 0; f.vx *= 0.25; f.vy *= 0.25; f.vz = 0; f.landed = 1; }
    }
    if ((f.t -= dt) <= 0) S.fx.splice(i, 1);
  }

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
  /** 옮기지 않고 **보는 쪽만** 돌린다 — 서 있는 그림의 방향은 dx,dy 가 정한다. */
  const face = (e, t) => {
    const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1;
    e.dx = dx / d; e.dy = dy / d;
    if (Math.abs(dx) > 0.5) e.face = dx < 0 ? -1 : 1;
  };
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
  /* ── 표적까지 **닿을 만큼만** 다가간다(도착 반경) ──
     ★★ 적끼리 겹침의 뿌리가 여기였다. 적은 아군과 달리 「진(home)」이 없어, 표적의
     **한가운데**로 매 프레임 toward 로 불렸다 — 여럿이 같은 점을 향해 파고드니, 떼어내는
     힘(아래 shove)이 안쪽으로 당기는 걸음을 못 이기고 포갠 채로 머물렀다(50층 파고든
     프레임 9%). 밀어내는 속도를 올리면 「순간이동」이 되므로(위 SEP_CAP 이력), 미는 대신
     **애초에 안 파고들게** 한다: 표적에서 `standoff`(화면 픽셀)만큼 떨어진 **껍질**까지만
     걷고, 이미 껍질 안이면 안 걷는다. 안쪽으로 당기는 힘이 사라지니 shove 가 옆으로 흩는
     것을 되돌리지 않아, 낱몸이 제 각도에 흩어져 선다. 자·거리는 「닿았나」와 같은 화면 단위. */
  const approach = (e, tx, ty, standoff, sp, dt) => {
    let ox = e.x - tx, oy = (e.y - ty) * SQUASH_VIEW;   // 표적→몸, 화면
    const od = Math.hypot(ox, oy);
    if (od <= standoff) return;                          // 이미 껍질 안 — 안 파고든다
    if (od < 0.01) { ox = 1; oy = 0; }                   // 완전히 겹쳤을 때의 방향 하나
    const u = standoff / (od || 1);
    const ax = tx + ox * u;                              // 껍질 위의 점(화면) …
    const ay = ty + (oy * u) / SQUASH_VIEW;              // … y 는 월드로 되돌린다
    toward(e, ax, ay, sp, dt);
  };

  /* ── 본인의 기본공격 ── **뼈를 던진다.**
     가만히 서서 구경만 하면 "부리는 자"가 아니라 장식이 된다. 제일 가까운 적에게
     자동으로 던지되, 화력은 해골 한 기보다 조금 위다 — 군대를 대신하면 안 된다. */
  if ((S.natk -= dt) <= 0) {
    let t = null, td = NECRO_ATK.range;
    for (const m of S.mobs) { const d = Math.hypot(m.x, m.y); if (d < td) { td = d; t = m; } }
    if (t) {
      S.natk = NECRO_ATK.cd;
      S.pswing = SWING_T;                              // 던지는 팔 자세(제 시계)
      /* ★★ **뼈는 팔이 뻗는 칸에서 손을 떠난다.** 예전엔 여기서 바로 날렸다 —
         휘두름 0 프레임, 즉 **팔을 들기도 전에** 뼈가 나갔다. 판의 다른 모든 타격은
         impactAt(55%)에서 터지는데 본인 것만 예외라, 병수님 눈에 「공격이 발사되고
         모션이 뒤늦게 발동」으로 보였다. 여기서는 **예약만** 하고 아래 impactAt 고리가
         푼다 — 소환수·적이 pending 을 쓰는 것과 같은 자리, 같은 규칙이다.
         셈(피해)은 지금 값으로 굳힌다(겨눈 순간의 힘). 방향은 놓는 순간 다시 잡는다 —
         0.33초 사이에 적이 움직이므로 그때 제일 가까운 놈에게 던지는 편이 자연스럽다. */
      /* ★★ **뼈는 제 시계를 갖는다.** 처음엔 `S.pswing` 이 impactAt 아래로 내려가기를
         기다렸는데, 그 pswing 은 **소환도 같이 쓰는 변수**라 소환이 오면 SWING_T 로
         되감긴다 — 재 보니 25초에 **11번** 되감기고 뼈가 목표 0.33 대신 **0.54초**까지
         늦었다(병수님: "소환이랑 공격이랑 겹쳐서 실행되면 부자연스러운듯").
         제 시계를 주면 무엇이 겹치든 던지는 박자는 안 흔들린다. */
      S.pbolt = { t: SWING_T * IMPACT_AT,
                  dmg: NECRO_ATK.dmg(META.lv) * dmgMulOf() * selfMulOf() * (1 + gearVal("wand")) * wandMul() };
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
      const bd = b.dmg * ampMul * (hit.wkT > 0 ? hit.wk : 1);
      hurtMob(hit, bd);
      popNum(hit.x, hit.y, bd, "dmg");
      hit.flinch = 0.18; hit.kx = b.dx; hit.ky = b.dy; hit.knock = knockOf(hit, bd);
      S.fx.push({ t: 0.12, x: hit.x, y: hit.y, kind: "hit" });
      S.bolts.splice(i, 1); continue;
    }
    if (b.life <= 0 || Math.hypot(b.x, b.y) > RING_SPAWN + 80) S.bolts.splice(i, 1);
  }

  /* ══ 진이 적 쪽으로 기운다 ══ 병수님이 두 번 말한 「소환수가 제자리에서 크게 이동
     안 한다」의 뿌리가 여기였다. 진은 **원점(본인)에 못 박힌 고리**라, 적이 걸어 들어와야
     싸움이 났다 — 걸음 속도를 올려도 갈 데가 없으니 크게 움직일 일이 없었다.
     이제 적 무리가 있는 쪽으로 **진 전체를 밀어 준다.** 군대가 마중 나가 밀어붙이고,
     판이 비면 저절로 본인 곁으로 돌아온다. 홱 돌면 군대가 미끄러지듯 보이므로 천천히. */
  {
    let n = 0, sx = 0, sy = 0, ux = 0, uy = 0;
    for (const m of S.mobs) { sx += m.x; sy += m.y; n++;
      const l = Math.hypot(m.x, m.y) || 1; ux += m.x / l; uy += m.y / l; }
    let tx = 0, ty = 0;
    if (n) {
      const ax = sx / n, ay = sy / n, L = Math.hypot(ax, ay);
      /* ★ **한쪽에 몰렸을 때만 민다.** 처음엔 무게중심만 보고 밀었더니 12분에 두 번
         죽었다(예전엔 20분에 0번) — 적이 사방에 있어도 무게중심은 한쪽을 가리키므로
         군대가 그리로 나가고 **반대편이 통째로 비었다.**
         낱낱의 방향을 단위벡터로 더해 그 길이를 머릿수로 나누면 「얼마나 한쪽이냐」가
         0~1 로 나온다(전부 한 방향이면 1, 에워쌌으면 0). 그 값을 그대로 곱한다. */
      const one = Math.hypot(ux, uy) / n;
      /* 무리가 이미 코앞이면 안 민다 — 밀면 등 뒤로 흘려보내게 된다. */
      if (L > RING_HOLD * 0.7) {
        const k = Math.min(PUSH_MAX, L - RING_HOLD * 0.7) * one / L; tx = ax * k; ty = ay * k; } }
    const e = Math.min(1, dt * 1.5);
    S.push.x += (tx - S.push.x) * e; S.push.y += (ty - S.push.y) * e;
  }
  /* ══ 관문 주인의 수법 ══ 주인 넷은 각자 **행동**으로 싸운다(core.js GATELORDS). 예고
     (warn_* fx)가 먼저 보이고 tell 초 뒤 발동한다 — 예고 없이 터지면 「불공평」이다.
     · pool   발밑(중앙)에 장판을 깔아 지속 피해 — 네크로가 못 피하는 자리라 약하게 오래
     · add    졸개 둘을 불러 둘레 압력을 늘린다(그 졸개의 근접은 cause "add")
     · charge 예고 뒤 중앙으로 돌진해 큰 한 방 — 길목 소환수도 관통하며 때린다
     · curse  중앙 넓은 원에 한 번에 피해 + 원 안 소환수 잠깐 약화(weak)
     ★ 돌진 중(mstate≠0)에는 일반 이동/근접을 건너뛴다 — 아래 「적」 루프가 mstate 를 본다. */
  const hitMinion = (u, dmg, dx, dy) => {
    if (dmg <= 0 || !u || u.hp <= 0) return;
    u.hp -= dmg; popNum(u.x, u.y, dmg, "hurt");
    u.flinch = 0.18; const l = Math.hypot(dx, dy) || 1; u.kx = dx / l; u.ky = dy / l;
    u.knock = knockOf(u, dmg);
    S.fx.push({ t: 0.12, kind: "hit", x: u.x, y: u.y });
  };
  /** 수법이 **터지는** 자리 — 주인이 살아 있든(아래 루프) 예고만 남기고 죽었든(pendMech)
   *  같은 몸을 쓴다. pool·add·curse 는 원래 중앙(네크로 발밑) 기준이라 주인의 자리가
   *  필요 없고, charge 는 이미 겨눈 방향(cvx,cvy)만 있으면 된다.
   *  S.dead 가 되면 true 를 돌려준다 — 부르는 쪽이 그 프레임을 접는다. */
  const fireMech = (mech, dmg, col, cvx = 0, cvy = -1) => {
    if (mech === "pool")
      S.pools.push({ x: 0, y: 0, r: 92, t: 4.5, dmg: dmg * 0.85, col });
    else if (mech === "add") {
      /* 졸개는 **네크로 발밑(75)에서 솟는다.** 둘레(300)나 진 밖(190)에서 걸어오면 군대가
         다 막아 네크로는 12분에 한 번도 안 죽었다(소환사의 위협이 안 산다 — gatelord_probe
         로 확인). 진(150) 안쪽 코앞에서 솟아 군대가 오기 전에 직접 문다(cause "add"). */
      /* ★ **부르는 쪽에 상한**(ADD_CAP · 기본 꺼짐) — 살아 있는 add 졸개가 상한을 넘으면
         이 수법은 **쉰다.** 씨앗 7 의 10층 관문이 7분을 버틴 이유가 여기였다: 표에서 적 수가
         5초마다 정확히 +4 로 늘고(6:20 206 → 7:00 233), 소환수는 늘 제일 가까운 적을 잡으므로
         (1246줄 `d < td`) 발밑에서 솟는 졸개가 언제나 먼저다 → **주인피해가 7분 내내 정확히 0**
         인데 화력(armyDps)은 109~142 였다. 되먹임이 닫힌다: 주인이 안 죽는다 → 층이 안 끝난다
         → 졸개가 더 는다. 상한은 그 고리의 **부르는 쪽**을 끊는다(ROADMAP D-3 축 ①).
         기본 0(꺼짐) — `globalThis.__ADD_CAP` 로 A/B 한 뒤에야 기본값을 건드린다. */
      const cap = ADD_CAP_OF();
      if (cap > 0) { let live = 0; for (const m of S.mobs) if (m.cause === "add") live++;
        if (live >= cap) return !!S.dead; }
      const cnt = 4;
      for (let i = 0; i < cnt; i++) {
        const a = spawnMob(S.floor, i, cnt); a.cause = "add"; a.born = a.born0 = 0.4;
        /* 불려 나온 졸개는 **두 배로 질기다**(hp×2) — 예전 값이면 네크로·군대가 솟자마자
           치워 12분에 한 번도 안 물었다(gatelord_probe: 죽음 0). 질겨야 살아남아 문다. */
        a.hp = a.hpMax = floorHp(S.floor) * 2;
        const ang = (i / cnt) * 6.2832 + (Math.random() - 0.5) * 0.6, rad = 75;
        a.x = Math.cos(ang) * rad; a.y = Math.sin(ang) * rad;
      }
    }
    else if (mech === "curse") {
      for (const u of S.minions)
        if (Math.hypot(u.x, u.y * SQUASH_VIEW) < 200) { hitMinion(u, dmg * 1.7 * ampMul, u.x, u.y); u.weak = 3.0; }
      hurtNecro(dmg * 3.8 * ampMul, "curse", 0, -1);
    }
    else if (mech === "charge") {
      /* 주인이 겨눈 채 죽었을 때만 여기로 온다 — 달려들 몸이 없으니 겨눈 그 한 방만
         네크로에게 닿는다(길목 소환수 관통은 살아 있는 돌진에만 있다). */
      hurtNecro(dmg * 3.0 * ampMul, "charge", cvx, cvy);
    }
    return !!S.dead;
  };
  /** 수법의 **예고**를 띄우는 자리 — 살아 있는 주인(아래 루프)과 약속만 남은 수법
   *  (pendMech · GATE_VOW)이 같은 몸을 쓴다. 예고 없이 터지면 「불공평」이다. */
  const warnFx = (mech, col, tell, cvx = 0, cvy = -1) => {
    if (mech === "charge") { S.fx.push({ t: tell, x: -cvx * 260, y: -cvy * 260, kind: "warn_charge", col, tx: cvx, ty: cvy }); return; }
    const wk = mech === "pool" ? "warn_pool" : mech === "add" ? "warn_add" : "warn_curse";
    const wr = mech === "curse" ? 200 : mech === "pool" ? 92 : 85;
    S.fx.push({ t: tell, x: 0, y: 0, kind: wk, col, r: wr });
  };
  /* ── 예고를 남기고 죽은 수법 ── 주인이 치워져도 예고한 시각에 예정대로 터진다.
     (예고 fx 는 이미 판에 떠 있으므로 「예고 없이 터졌다」가 되지 않는다.)
     ★ 약속만 남은 수법(GATE_VOW)은 아직 예고를 안 띄웠다 — 제 차례가 tell 초 앞으로
       다가오면 그때 띄운다(warnT). 그래야 「예고 → tell 초 → 발동」이 그대로 지켜진다. */
  for (let i = S.pendMech.length - 1; i >= 0; i--) {
    const p = S.pendMech[i];
    if (p.warnT != null && !p.warned && p.t - dt <= p.warnT) {
      p.warned = 1; warnFx(p.mech, p.col, p.warnT, p.cvx, p.cvy);
    }
    if ((p.t -= dt) > 0) continue;
    S.pendMech.splice(i, 1);
    /* ★ **약속만 남은 수법은 내 체력으로 묶는다**(위 GATE_VOW_CAP 주석) — 상한은 «터지는
       그 순간»의 최대체력으로 잡는다(약속할 때가 아니라). 그래야 층을 내려가며 몸이
       커진 만큼 위험도 같이 커지고, 어느 깊이에서도 한 방이 나를 지우지 못한다.
       주인이 제 손으로 내는 수법(아래 루프)은 여기를 지나지 않는다. */
    let pd = p.dmg;
    { const cap = p.vow ? GATE_VOW_CAP_OF() : 0;
      if (cap > 0) pd = Math.min(pd, hpMaxOf() * cap / (MECH_HIT[p.mech] || 1)); }
    if (fireMech(p.mech, pd, p.col, p.cvx, p.cvy)) return;
  }
  for (const m of S.mobs) {
    /* ★ **배어 나오는 중(born)에도 수법의 시계는 돈다.** 여기가 A-1 의 진짜 자리였다 —
       보스의 born 은 0.8 이 아니라 **2.6초**인데(위 「따로 갚는다」) 깊은 관문의 주인은
       한 번에 **1.0초**를 산다(a1_gate 2026-08-14). 즉 주인은 수법 루프에 **들어와 보지도
       못하고** 죽었다(첫 수법까지 실제로는 born 2.6 + 1.7 + tell 0.8 = 5.1초였다).
       예고는 판 한가운데 뜨므로(warn_* fx) 배어 나오는 동안 떠도 「예고 없이 터졌다」가
       아니다 — 붉은 고리가 조여드는 그 시간이 곧 예고다.
       돌진만은 몸이 실제로 달려들어야 하므로 다 선 뒤에 시작한다. */
    if (!m.boss || !m.lord) continue;
    const lord = m.lord;
    if (lord.mech === "charge") {
      if (m.born > 0) continue;
      if (m.mstate === 1) {                                 // 예고 — 멈춰 겨눈다
        m.swing = 0;
        if ((m.mtell -= dt) <= 0) {
          const d = Math.hypot(m.x, m.y) || 1;
          m.cvx = -m.x / d; m.cvy = -m.y / d; m.mstate = 2; m.mtell = 1.1;
          for (const u of S.minions) u.hitByCharge = 0;
        }
        continue;
      }
      if (m.mstate === 2) {                                 // 돌진 — 중앙으로 빠르게
        const sp = m.spd * 6;
        m.x += m.cvx * sp * dt; m.y += m.cvy * sp * dt;
        m.walked = (m.walked || 0) + sp * dt; m.moving = 0.12;
        m.face = m.cvx < 0 ? -1 : 1; m.dx = m.cvx; m.dy = m.cvy;
        for (const u of S.minions)                          // 길목 소환수도 관통하며 때린다(한 번씩)
          if (!u.hitByCharge && dist(m, u) < m.r + u.r) { hitMinion(u, m.dmg * 3.0 * ampMul, m.cvx, m.cvy); u.hitByCharge = 1; }
        if (Math.hypot(m.x, m.y * SQUASH_VIEW) <= CORE_R + m.r * 0.5) {
          hurtNecro(m.dmg * 3.0 * ampMul, "charge", m.cvx, m.cvy);
          m.mstate = 0; m.mechCd = lord.cd; if (S.dead) return;
        } else if ((m.mtell -= dt) <= 0) { m.mstate = 0; m.mechCd = lord.cd; }
        continue;
      }
      if ((m.mechCd -= dt) <= 0) {                           // 예고 시작
        m.mstate = 1; m.mtell = lord.tell;
        if (m.vow > 0) m.vow--;                              // 제 손으로 낸 수법은 약속에서 갚는다
        S.fx.push({ t: lord.tell, x: m.x, y: m.y, kind: "warn_charge", col: lord.col, tx: -m.x, ty: -m.y });
      }
      continue;
    }
    if (m.mtell > 0) {                                       // 예고 중 — 아직 발동 전(일반 근접은 유지)
      if ((m.mtell -= dt) <= 0 && fireMech(lord.mech, m.mdmg, lord.col)) return;
      continue;
    }
    if ((m.mechCd -= dt) <= 0) {                             // 예고 시작(pool·add·curse)
      m.mtell = lord.tell; m.mechCd = lord.cd;
      if (m.vow > 0) m.vow--;                                // 제 손으로 낸 수법은 약속에서 갚는다
      /* ★ **덜 여문 채 내는 수법은 약하다.** 예고를 배어 나오는 중에 시작하면 깊은 관문도
         수법을 한 번은 내는데(위), 그대로 온 힘을 실으면 관문이 벽이 된다 — 손 안 대고
         재니 최고층 합이 292 → 125 로 반토막 났다(2026-08-14). 그래서 **다 서기 전에
         시작한 수법만** OPEN_MUL 을 먹는다. 세기는 예고를 트는 그 순간에 못 박아
         두므로(mdmg), 주인이 그 사이 다 서든 죽든 터지는 세기는 안 달라진다. */
      m.mdmg = m.dmg * (m.born > 0 ? OPEN_MUL_OF() : 1);
      const wk = lord.mech === "pool" ? "warn_pool" : lord.mech === "add" ? "warn_add" : "warn_curse";
      const wr = lord.mech === "curse" ? 200 : lord.mech === "pool" ? 92 : 85;
      S.fx.push({ t: lord.tell, x: 0, y: 0, kind: wk, col: lord.col, r: wr });
    }
  }
  /* ── 장판 ── 발밑에 남아 머무는 것(pool 주인). 안에 선 네크로는 지속 피해(pool), 소환수는 절반. */
  for (let i = S.pools.length - 1; i >= 0; i--) {
    const pl = S.pools[i];
    if ((pl.t -= dt) <= 0) { S.pools.splice(i, 1); continue; }
    if (Math.hypot(pl.x, pl.y * SQUASH_VIEW) < pl.r) { hurtNecro(pl.dmg * dt, "pool", 0, -1); if (S.dead) return; }
    for (const u of S.minions)
      if (Math.hypot(u.x - pl.x, (u.y - pl.y) * SQUASH_VIEW) < pl.r) hitMinion(u, pl.dmg * 0.5 * dt, 0, -1);
  }
  if (S.walls) for (let i = S.walls.length - 1; i >= 0; i--) if ((S.walls[i].t -= dt) <= 0) S.walls.splice(i, 1);
  while (S.hurtLog.length && S.t - S.hurtLog[0].t > 5) S.hurtLog.shift();   // 사인 판정은 직전 5초만

  /* ── 소환수 ── **제 자리를 지키되 가까이 온 적은 마중 나간다.**
     사방 판에서 전원이 한 적에게 몰려가면 그 순간 나머지 방향이 통째로 비어 본체가 맞는다.
     그래서 "내 구역"(제 각도)에서 제일 가까운 적만 본다. */
  for (const u of S.minions) {
    /* 지배한 놈은 **제 표를 들고 다닌다**(u.own) — 원래 적이라 MINIONS 에 없다.
       한 곳에서만 갈라 두면 나머지 셈은 소환수와 완전히 같다. */
    const K = u.own || MINIONS[u.kind];
    const hx = S.push.x + Math.cos(u.home) * u.rad, hy = S.push.y + Math.sin(u.home) * u.rad;
    let tgt = null, td = 1e9;
    for (const m of S.mobs) {
      const d = Math.hypot(m.x - hx, (m.y - hy) * SQUASH_VIEW);   // ← 화면에서 잰다
      /* ★ **「층의 주인」은 제 구역 밖이라도 마중 나간다.** 구역만 지키게 두었더니
         관문에서 보스가 선 **한 각도의 한두 기**만 그를 맞았다 — 셋 맞고 눕고, 나머지
         군대는 반대편에서 졸개를 치는 동안 보스가 걸어 들어왔다. 죽기 직전 5초 피해의
         100%가 층의 주인이었던 게 이것이다(군세를 꽉 채워 봐도 그대로였다 — 모자란
         것은 머릿수가 아니라 **그를 맞으러 간 머릿수**였다).
         졸개는 그대로 구역제다 — 전원이 아무 적에게나 몰려가면 둘레가 통째로 빈다. */
      /* ✗ **「줄이 비면 구역제를 푼다」는 해 봤고 나빴다** (2026-08-13, 씨앗 3·7·13 × 12분).
         뒷정리의 「놀고」(표적 없이 서 있는 시간)가 18~22% → **1%** 로 사라졌는데,
         그것이 통째로 「다가감」이 됐다(36% → 50%). 전원이 남은 한 놈에게 몰려가고,
         그놈을 잡으면 다음 놈에게 또 전원이 이동하니 **걷는 총 거리가 되레 늘었다.**
           최고층 25→28 · 19→**15** · 32→**28** (층합 76 → 71)
           층당초 23.0→25.6 · 37.9→**53.5** · 22.5→25.7
         구역제는 「제자리를 지키는 것」이 아니라 **총 이동을 줄이는 장치**였다.
         시간을 줄이려면 표적 반경이 아니라 **거리 자체**(RING_SPAWN·마중)를 봐야 한다. */
      if (d < td && d < (m.boss ? BOSS_CALL : WATCH)) { td = d; tgt = m; }
    }
    /* ★ **휘두르는 동안엔 발이 멎는다.** 사거리 밖으로 표적이 한 발 물러나면 여기서
       바로 걷기로 넘어갔는데, 그때 `swing` 은 아직 돌고 있다 — 즉 **팔을 휘두르는
       그림 그대로 몸이 미끄러졌다.** 실제로 재 보니 적 타락자가 휘두르는 프레임의
       31~38%에서 걷고 있었다(22/70 · 15/40). 치려면 일단 서야 한다. */
    const rooted = (u.swing || 0) > 0;
    u.tgtId = tgt ? tgt.id : 0;      // 검수기가 **게임이 고른 표적**을 볼 수 있게(값이 싸다)
    if (!tgt) { if (!rooted) toward(u, hx, hy, K.spd * MINION_SPD, dt); continue; }
    /* ★ **아군도 겹침 허용치를 쓴다**(병수님 2026-08-15 18:54: "더 겹쳐도 될듯,
       아군/적군 모두"). 여기만 `u.r + tgt.r + 4` 로 굳어 있어서, 적은 파고들게 해 놓고
       **내 군대만 어깨를 맞대고** 섰다 — 앞줄이 자리를 먹으면 뒷줄이 표적에 못 닿는다.
       떼어놓기(shove)와 같은 값을 쓰는 것이 이 손잡이의 뜻이다. */
    if (dist(u, tgt) > (u.r + tgt.r) * touchK() + 4) { if (!rooted) toward(u, tgt.x, tgt.y, K.spd * MINION_SPD, dt); continue; }
    /* ★ **붙어서 차례를 기다리는 동안에도 표적을 본다.** 서 있는 그림의 방향은
       `dx,dy`(마지막으로 **걸은** 방향)로 정해지므로, 제자리에 선 뒤 옆에서 적이
       붙으면 걸어온 쪽을 그대로 보고 선다 — 재 보니 붙어 있는 프레임의 **21%**가
       90도 넘게 어긋났고 그중 116 프레임은 아예 등을 돌리고 있었다.
       휘두를 때(sdx)만 표적을 보게 해 두면 「칠 때만 홱 돌아본다」가 된다. */
    face(u, tgt);
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
    u.pending = { tgt, dmg: (u.dmg || K.dmg) * dmgMulOf() * minionMulOf() * ampMul * feedMul(u) * (u.weak > 0 ? 0.6 : 1),
                  heal: u.kind === "ghoul" && !u.own };
  }

  /* ── 적 ── **가운데를 향해 온다.** 길목에 소환수가 있으면 그것부터 친다 —
     그래서 둘레를 어떻게 덮었느냐가 곧 본인이 맞는 양이 된다. */
  /* ★ 몰려옴(rush · 위 RUSH 문) — **줄이 빈 뒤(뒷정리)에만, 문이 켜졌을 때만** 켠다.
     문이 꺼지면 rush=false 라 아래 lim·sp 가 예전 값(90·m.spd)으로 떨어져 「적」 루프가
     byte 단위로 같이 돈다(RNG 0 톨). 판단을 mob 루프 밖에서 한 번만 해 per-mob 로 난수를
     새로 먹지 않는다(rushOn·spawnQ 는 이 루프 동안 안 변한다). */
  const rush = rushOn() && !(S.spawnQ && S.spawnQ.length);
  for (const m of S.mobs) {
    let tgt = null, td = 1e9;
    /* ★ 적이 길목의 소환수를 알아보는 거리는 **90 그대로 둔다.** 진을 넓히면서
       이것도 진에 매달아 봤는데(105 시절 비율 0.857 → 129), 적이 죄다 소환수에게
       붙잡혀 본인은 한 번도 안 죽는 대신 **군대가 다 갈렸다**(씨앗 셋 평균 점유
       85% → 56% · 「거의 전멸」 0분 → 8분). 새는 놈이 조금 있는 편이 낫다.
       ★ (a) 몰려옴이 켜지면 뒷정리에선 이 상한을 **푼다**(lim=1e9) — 남은 한둘이
          아무 거리의 소환수에게나 붙어 제 발로 다가온다. 이건 관문 주인(m.boss)에게도
          적용한다(걷다 붙는 것뿐이라 돌진 안무와 무관하다). */
    let wall = null, wd = 1e9;
    const lim = rush ? 1e9 : 90;
    for (const u of S.minions) {
      const d = dist(m, u);
      if (d < td && d < lim) { td = d; tgt = u; }
      if (u.kind === "golem" && !u.own && d < wd && d < TAUNT_R) { wd = d; wall = u; }
    }
    if (wall) { tgt = wall; td = wd; }   // ★ 도발 거리 안에 벽이 있으면 벽으로 끌린다(위 TAUNT_R)
    if (tgt && td < m.r + tgt.r + 4) {
      face(m, tgt);                       // 소환수 쪽과 같은 규칙(위 주석)
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
    /* 소환수 쪽과 **같은 규칙** — 휘두르는 동안엔 발이 멎는다(위 주석 참조).
       ★ toward(한가운데) 대신 approach(도착 반경): 표적(소환수)엔 닿을 거리 m.r+tgt.r,
       가운데(본인)엔 CORE_R 껍질까지만 걷는다 — 그 안쪽으론 안 파고든다(위 approach 주석). */
    const rooted = (m.swing || 0) > 0;
    /* ★ (b) 몰려옴이 켜지면 **아직 못 때리는 동안**의 걸음만 RUSH.spd 배로 — approach 에
       넘기는 속도 자리만 바꾼다(휘두르는 중 rooted 는 위에서 이미 발이 멎어 손 안 댄다).
       관문 주인(m.boss)은 **뺀다**(a 만 준다) — 여기 속도를 건드리면 돌진 상태머신
       (mstate/mtell)의 몸놀림과 섞여 「예고 없는 돌진」이 된다. 문이 꺼지면 sp=m.spd. */
    const sp = (rush && !m.boss) ? m.spd * RUSH.spd : m.spd;
    if (tgt) { if (!rooted) approach(m, tgt.x, tgt.y, (m.r + tgt.r) * touchK(), sp, dt); continue; }
    if (!rooted) approach(m, 0, 0, CORE_R, sp, dt);
    if (Math.hypot(m.x, m.y * SQUASH_VIEW) <= CORE_R) {   // 둘레가 뚫렸다 — 본인이 맞는다
      face(m, { x: 0, y: 0 });                          // 기다리는 동안에도 본체를 본다
      if ((m.atk -= dt) > 0) continue;
      /* ★★ 소환수를 칠 때와 **똑같은 안무**를 태운다: 휘두름 · 내지르는 방향, 그리고
         팔이 뻗는 칸에서 체력·움찔·불꽃·숫자가 한꺼번에 온다. 여기서는 **예약만** 하고
         (m.pending.core), 실제 타격과 죽음 판정은 위 impactAt 루프가 푼다 — 그래야 이
         한 방도 다른 모든 타격과 같은 「원인 → 결과」 순서로 읽힌다. */
      const ml = Math.hypot(m.x, m.y) || 1;
      m.atk = MOB_CD; m.swing = SWING_T;
      m.sdx = -m.x / ml; m.sdy = -m.y / ml;          // 가운데(본인)를 향해 내지른다
      m.pending = { core: true, dmg: m.dmg * MOB_CD, cause: m.cause };
    }
  }

  /* ── 뼈 벽이 길을 막는다 ── 적을 벽 조각 바깥 껍질로 되민다(겹침과 같은 화면 거리로).
     돌진 중인 관문 주인(mstate 2)은 예고된 큰 한 방이라 관통시킨다 — 벽으로 못 막는다. */
  if (S.walls && S.walls.length) for (const m of S.mobs) {
    if (m.mstate === 2) continue;
    for (const w of S.walls) {
      const dx = m.x - w.x, dy = (m.y - w.y) * SQUASH_VIEW, d = Math.hypot(dx, dy), min = m.r + w.r;
      if (d < min && d > 0.01) { const k = (min - d) / d; m.x += dx * k; m.y += dy * k / SQUASH_VIEW; }
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
  /* ★ 상한은 **몸마다 한 프레임 치**로 건다. 처음엔 쌍마다 걸었더니 여럿에 끼인 몸이
     상한을 이웃 수만큼 여러 번 받아, 막았는데도 초속 190 이 그대로 나왔다
     (걸음은 34). 화면 단위로 이번 프레임에 밀린 양을 쌓아 두고 그 길이만 막는다 —
     세 번 도는 것은 그대로라 사슬로 낀 자리도 풀린다. */
  const cap = SEP_CAP * dt;
  for (const b of bodies) { b.spx = 0; b.spy = 0; }
  /** 화면 단위로 밀되, 이번 프레임에 밀린 총량이 cap 을 못 넘게 한다. */
  const shove = (e, sx, sy) => {
    let cx = e.spx + sx, cy = e.spy + sy;
    const L = Math.hypot(cx, cy);
    if (L > cap) { const k = cap / L; cx *= k; cy *= k; }
    e.x += cx - e.spx;                       // 이미 반영한 몫을 빼고 **차이만** 옮긴다
    e.y += (cy - e.spy) / sq;                // 세로는 월드로 되돌린다
    e.spx = cx; e.spy = cy;
  };
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];
        let dx = b.x - a.x, dy = (b.y - a.y) * sq;     // ← 화면에서 잰다
        let d = Math.hypot(dx, dy);
        const min = (a.r + b.r) * touchK();       // ← 겹침 허용치. 다가가는 껍질과 **같은 값**이어야 한다
        if (d >= min) continue;
        if (d < 0.01) {                        // 완전히 포갠 경우 — 방향을 인덱스로 정해 흔들림 없이
          const ang = (i * 2.399 + j * 0.618);
          dx = Math.cos(ang); dy = Math.sin(ang); d = 1;
        }
        /* ★ **미는 것도 걸음이다.** 겹침을 한 프레임에 통째로 풀면 몸이 걸음의
           다섯 배 속도로 옆으로 쓸린다 — 실제로 재 보니 최고 속도가 174/초였다
           (해골의 제 걸음은 34). 눈에는 「순간이동」으로 읽힌다.
           한 번에 미는 양을 **걸음 남짓**으로 막는다(위 shove). 세 번 도는 것은
           그대로라 깊이 포갠 자리도 두어 프레임이면 풀린다(겹침은 자로 확인). */
        const push = (min - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        shove(a, -nx * push, -ny * push);
        shove(b,  nx * push,  ny * push);
      }
    }
  }

  // ── 죽은 것 치우기 ── **적이 죽으면 시체가 남는다**(이 게임의 자원)
  for (let i = S.mobs.length - 1; i >= 0; i--) {
    if (S.mobs[i].hp > 0) continue;
    const m = S.mobs[i];
    /* ★ **예고를 남기고 죽으면 그 수법은 예정대로 터진다.** 깊은 관문의 주인은 한 번에
       0.8 초를 사는데(a1_gate 2026-08-14) 예고만 tell 초라 여태 전부 「예고 중 사망」으로
       사라졌다 — 50-99층에서 네크로가 받은 피해가 **50분 내내 0** 이었던 자리가 여기다.
       위험을 주인의 생존에서 떼어 낸다(값이 아니라 구조). */
    const md = Math.hypot(m.x, m.y) || 1, mcx = -m.x / md, mcy = -m.y / md;
    if (m.boss && m.lord && m.mtell > 0 && (m.lord.mech !== "charge" || m.mstate === 1))
      S.pendMech.push({ t: m.mtell, mech: m.lord.mech, dmg: (m.mdmg != null ? m.mdmg : m.dmg), col: m.lord.col,
                        cvx: mcx, cvy: mcy });
    /* ★ **갚지 못한 약속은 죽어도 남는다**(위 GATE_VOW 주석). 위험이 주인의 질김과 아무
       상관이 없어지는 자리다 — 관문이 한 대에 치워져도 약속한 수법 수는 그대로 터진다.
       세기는 **다 여문 값**(m.dmg)이다: 약속은 주인이 서면서 한 것이고 터지는 것은 그
       뒤이므로 덜 여문 수법(OPEN_MUL)이 아니다. 첫 것은 제 차례가 되면 예고부터 띄운다. */
    if (m.boss && m.lord && m.vow > 0)
      for (let k = 0; k < m.vow; k++)
        S.pendMech.push({ t: m.lord.tell + k * m.lord.cd, warnT: m.lord.tell, mech: m.lord.mech,
                          dmg: m.dmg, col: m.lord.col, cvx: mcx, cvy: mcy, vow: 1 });
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
    } else addCorpse(m.x, m.y, m.boss ? "large" : (m.h >= 58 ? "large" : "small"), 1, m.hpMax);
    /* 트리 — **시체 수확**은 시체를, **영혼 흡수**는 마나를 더 준다. 둘 다
       「죽였다」에 붙는 보상이라 판을 보고 있을 이유가 된다. */
    if (harvestPct() && Math.random() < harvestPct()) addCorpse(m.x, m.y, "small", 1, m.hpMax);
    if (spiritMp()) S.mp = Math.min(mpMaxOf(), S.mp + spiritMp());
    META.gold += Math.round(goldFor(S.floor) * goldMulOf() * relicMul() * gateFactor()) * (m.boss ? 8 : 1);
    /* ★ **벌이가 깊이에 정비례한다** — 마리당 xp 가 층×0.6 이고 마릿수도 5+0.7층 이라
       층당 총 xp 가 층² 로 큰다. 요구(lv^1.42)가 다항이라 절대 못 따라잡고, 그래서
       레벨이 **분당 3 으로 안 눕는다**(2026-08-15). 요구를 lv^1.9 까지 올려 봐도
       기울기가 되레 커졌다 — 값이 아니라 **이 축**이다. 깊이 민감도를 문으로 낸다. */
    const XPD = globalThis.__XP_DEPTH != null ? +globalThis.__XP_DEPTH : 1;
    const xpGain = Math.round((m.boss ? 9 : 1) * Math.max(1, Math.round(Math.pow(S.floor, XPD) * 0.6)) * relicMul());
    META.xp += xpGain; runXp += xpGain;              // runXp 는 정산이 읽는 누계(레벨업이 xp 를 빼가도 안 줄어든다)
    while (META.xp >= xpNeed(META.lv)) { META.xp -= xpNeed(META.lv); META.lv++;
      S.hpMax = hpMaxOf(); S.hp = S.hpMax; S.mp = mpMaxOf();   // 상한도 같이 — 안 그러면 한 틱 동안 넘쳐 보인다
      say(`<b style="color:#ffff64">레벨 ${META.lv}</b> 달성 · 체력·마나 회복`);
      /* ★ 새 점을 **그 자리에서 쓴다**(core.js autoSpend). 여기가 아니면 Lv.6·Lv.16 에
         열려야 할 구울·골렘이 「창을 열 때까지」 안 열린다 — 방치형에서 그건 영영이다.
         꺼 둔 사람에겐 autoSpend 가 0 을 돌려주므로 아래 알림도 안 뜬다. */
      const spent = autoSpend();
      if (spent) {
        /* 벨트(쓸 수 있는 스킬)가 여기서 바뀐다 — 구울·골렘이 열리는 순간이 그 자리다.
           tree.js 의 손으로 찍는 길과 **같은 신호**를 쓴다(두 개의 진실을 안 만든다). */
        document.dispatchEvent(new Event("treeChanged"));
        say(`스킬 점수 <b>${spent}</b> 자동 배분 · 트리에서 바꿀 수 있다`);
      } }
  }
  for (let i = S.minions.length - 1; i >= 0; i--) {
    if (S.minions[i].hp > 0) continue;
    const dead = S.minions[i];
    S.minions.splice(i, 1);
    fall(dead, dead.art || ("minion/" + dead.kind), (dead.h || 40) * feedMul(dead));
    /* **내 소환수도 시체가 된다** — 다시 쓴다. 뼈만 남는다(살은 이미 없었다) */
    addCorpse(dead.x, dead.y, "bones", 1, dead.hpMax);   // 내 편의 주검도 자원이다
    /* ══ 유니크 blast ══ **죽은 자리가 터진다** — 소환수의 죽음이 시체 폭발의 작은 판이
       된다. 피해는 그 소환수 한 방(dead.dmg)에 매어 깊이·빌드를 따라 자란다. */
    if (hasUnique("blast") && dead.dmg) {
      const bdmg = dead.dmg * dmgMulOf() * minionMulOf() * BLAST_MUL;
      for (const m of S.mobs) if (Math.hypot(m.x - dead.x, (m.y - dead.y) * SQUASH_VIEW) < BLAST_R) { const dd = bdmg * (m.wkT > 0 ? m.wk : 1); hurtMob(m, dd); popNum(m.x, m.y, dd, "nova"); }
      S.fx.push({ t: 0.3, x: dead.x, y: dead.y, kind: "nova", rad: BLAST_R });
    }
  }

  /* ── 층이 비면 내려간다 ──
     ★ **줄도 비어야 한다.** 판 위의 적만 보면, 첫 놈이 죽는 순간 아직 안 나온
        나머지를 두고 다음 층으로 내려가 버린다. */
  if (!S.mobs.length && !(S.spawnQ && S.spawnQ.length)) {
    saveMeta();
    enterFloor(S.floor + 1);
  }
}

/* ══ 판이 끝나는 두 가지 길 ══ 쓰러지거나, **스스로 물러나거나**.
   병수님: "전투 포기 같은게 없어, 중간에 포기하고(현재까지 보상만 받고) 마을로
   돌아가는 기능같은게 있어야 할듯". 맞다 — 방치형에서 「여기까지」를 사람이 정할 수
   없으면 죽을 때까지 지켜보는 수밖에 없다.
   둘은 **끝나는 이유만 다르고 정산은 똑같다** — 그래서 한 함수로 두고 이유만 넘긴다
   (두 벌로 만들면 언젠가 한쪽만 고친다). 금·경험치는 이미 실시간으로 META 에 들어가
   있으므로 물러나도 「지금까지의 보상」은 그대로 남는다. */
export function die() { endRun(true); }
/** 스스로 물러난다 — 얻은 것을 지고 마을로. */
export function retreat() { endRun(false); }
function endRun(dead) {
  if (S.dead) return;                       // 두 번 부르면 정산이 덮어써진다
  S.dead = true;
  LASTRUN.dead = dead;
  META.runs = (META.runs | 0) + 1;
  META.deepest = Math.max(META.deepest | 0, S.floor);
  /* 판이 끝나는 순간을 굳힌다 — loot 는 **복사본**이라야 다음 newRun 의 비우기에 안 쓸린다.
     번 금은 시작값과의 차(던전에선 금이 늘기만 한다), 경험치는 레벨업이 xp 를 빼가므로
     차가 아니라 **더한 총량**(runXp)을 쓴다. */
  LASTRUN.has = true;
  LASTRUN.loot = S.loot.map((x) => ({ ...x }));
  LASTRUN.gold = Math.max(0, META.gold - runGold0);
  LASTRUN.xp = runXp;
  LASTRUN.killed = S.killed;
  LASTRUN.floor = S.floor;
  LASTRUN.leveled = META.lv > runLv0;
  /* 전리품이 없어도 정산이 할 말이 있게 — 어디서 시작해 몇 층을 내려갔는지,
     몇을 불러냈고 시체를 몇 구 썼는지, 얼마나 버텼는지. */
  LASTRUN.from = runFloor0;
  LASTRUN.summoned = S.summoned | 0;
  LASTRUN.used = S.used | 0;
  LASTRUN.secs = Math.max(0, Math.round(S.t));
  /* ── 죽은 원인 ── 전멸일 때만, 직전 5초에 **가장 큰 몫**을 준 원인을 뽑아 층·주인과 함께
     DEATHLOG 에 적는다(검수기가 주인별 사인 분포를 본다). 물러남(retreat)은 죽음이 아니다. */
  if (dead) {
    const by = {};
    for (const e of S.hurtLog || []) if (S.t - e.t <= 5) by[e.cause] = (by[e.cause] || 0) + e.dmg;
    let cause = "melee", best = -1;
    for (const k in by) if (by[k] > best) { best = by[k]; cause = k; }
    const gate = isGate(S.floor), lord = gate ? gatelordFor(S.floor) : null;
    DEATHLOG.push({ floor: S.floor, gate, cause,
                    lordIdx: lord ? gatelordIdx(lord) : -1, lord: lord ? lord.n : null });
    if (DEATHLOG.length > 800) DEATHLOG.shift();
  }
  saveMeta();
  say(dead ? `<b style="color:#8b1a1a">전멸</b> · ${S.floor}층에서 쓰러짐`
           : `<b style="color:#c8aa6e">물러남</b> · ${S.floor}층에서 발길을 돌림`);
}

/* 정산이 「이번 판에 번 것」을 재려면 판 시작값이 있어야 한다 — S 는 newRun 이 지우므로
   판을 넘겨 사는 여기(모듈)에 둔다. runXp 는 kill 에서 더한 경험치의 누계다. */
let runGold0 = 0, runLv0 = 1, runXp = 0, runFloor0 = 1;
/** 환생 배수가 시체에 실리며 남는 소수 몫(addCorpse). 판마다 0 에서 시작한다. */
let corpseCarry = 0;

export function newRun() {
  /* ★ 1층이 아니라 **지나온 관문**에서 다시 선다(core.js 「표식」). 죽을 때마다
     1층부터 되짚어 내려오느라 시간의 35% 가 그 왕복에 들어갔다. */
  const f0 = startFloor();
  Object.assign(S, {
    floor: f0, t: 0, running: true, dead: false,
    hp: hpMaxOf(), hpMax: hpMaxOf(), mp: mpMaxOf(), mpMax: mpMaxOf(),
    corpses: 3 + (META.corpses | 0),   // 첫 시체 셋 + 오프라인 창고 — 비웠던 만큼 군대를 앞세우고 내려간다
    minions: [], mobs: [], fx: [], bolts: [], piles: [], falling: [], nums: [], pools: [], pendMech: [], hurtLog: [], walls: [],
    drops: [], loot: [], cd: {}, log: [], killed: 0, deepest: f0, summoned: 0, used: 0,
    uniqCtr: 0, overflow: 0, qrun: {},   // ⑦ 일지의 연속 조건(관문 다섯 등)은 판마다 리셋된다

    amp: 0, pswing: 0, pcast: 0, pbolt: null, natk: 0, hurt: 0, hkx: 0, hky: 0, arrive: null, shake: 0,
    dealtAcc: 0, armyDps: 0,           // 「지금 군대가 내는 화력」 — 판이 바뀌면 앞 판 기억을 안 물려받는다
  });
  META.corpses = 0;   // 창고를 판에 실었으니 비운다 — 안 그러면 판마다 같은 시체를 또 준다
  sayReset();
  runGold0 = META.gold; runLv0 = META.lv; runXp = 0; runFloor0 = f0;
  corpseCarry = 0;
  enterFloor(f0);
}
