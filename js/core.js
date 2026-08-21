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

/* 값 표기 — 네 자리부터 k, 백만부터 M. 1000 미만은 그대로 둔다(초반에 1.0k 는 안 읽힌다).
   ★ main.js 에 있던 것을 여기로 내렸다(08-17) — 구슬·머리말은 이 자로 줄여 적는데
     **일지만 날것**이라 「시체 폭발 · 4939139」가 한 줄을 두 줄로 밀어냈다. 자가 둘이면
     같은 값이 달라 보인다. battle.js 가 main.js 를 부르면 순환이라 밑바닥으로 옮긴다. */
export const num = (v) => {
  v = Math.max(0, Math.round(v));
  return v < 1000     ? String(v)
       : v < 10000    ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "k"
       /* ★ 경계는 1,000,000 이 아니라 **999,500** 이다 — 반올림이 먼저라 999,999 가
          「1000k」로 떴다(M 자리를 코앞에 두고 네 자리 k). */
       : v < 999500   ? Math.round(v / 1000) + "k"
       : (v / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
};

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
/** 소환수 걸음 배수 — 신발이 올린다. **상한 1.6배**: 빠른 건 좋지만 순간이동은 안 된다
 *  (걸음이 그림의 박자보다 빨라지면 08-13 에 고친 「떠다닌다」가 되돌아온다). */
export const minionSpd = () => MINION_SPD * Math.min(1.6, 1 + gearVal("boots"));
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

/* ══ 편성(doctrine) ══ **사람이 「내 군대」를 짤 자리.** 여태 소환 비율은 auto() 안에
   숫자로 박혀 있어(벽 max(1,min(3,floor(cap/4))) · 몸 0.35 · 나머지 수) 사람이 고를 데가
   없었다 — 방치형에서 사람이 하는 둘 중 하나가 「무엇을 소환할지」인데(위 파일 머리 주석)
   그 손잡이가 빠져 있던 셈이다. 넷을 준다: 골고루(균형)·머릿수(해골)·자힐 몸(구울)·벽(골렘).
   ★ 값을 **한 곳(이 표)에 모은다.** auto() 에 흩어 두면 A/B(검수기가 편성별로 재는 것)를
     못 돌리고, 「균형이 예전과 한 톨도 안 달라야 한다」를 눈으로 대조할 수도 없다.
   ★ **난수 한 톨 없다.** wallMin~wallMax 사이를 floor(cap/wallDiv) 로 결정적으로 뽑는다 —
     balance 는 예전 식(max(1,min(3,floor(cap/4))) · 0.35)과 **정확히 같은 산수**라, 기본
     편성에서는 검수기의 A/B 가 그대로 성립한다(균형이 기본값이다). */
export const DOCTRINE_DEF = "balance";
export const DOCTRINE = {
  balance: { n:"균형",     ico:"⚖", d:"벽·몸·수를 고루 세운다 — 여태의 기본",          wallMin:1, wallMax:3, wallDiv:4,   body:0.35 },
  bone:    { n:"해골 위주", ico:"☠", d:"머릿수로 민다 — 벽·몸을 줄이고 거의 다 해골",     wallMin:1, wallMax:2, wallDiv:6,   body:0.15 },
  flesh:   { n:"구울 위주", ico:"✦", d:"물어뜯어 버틴다 — 자힐하는 몸(구울)을 두껍게",   wallMin:1, wallMax:2, wallDiv:6,   body:0.60 },
  wall:    { n:"골렘 벽",   ico:"◆", d:"두꺼운 벽으로 막는다 — 골렘을 여럿 앞세운다",     wallMin:2, wallMax:5, wallDiv:2.5, body:0.30 },
};
export const DOCTRINE_IDS = Object.keys(DOCTRINE);
/** 지금 세우는 편성의 **id**. 머리 없는 자(검수기)를 위한 문 — `globalThis.__DOCTRINE`
 *  이 있으면 META 보다 앞선다(gatelordFor 의 `__FORCE_LORD` 와 같은 규칙). 모르는 값이면
 *  기본값으로 떨어진다(옛 저장·오타 방어). */
export const doctrineId = () => {
  const d = (typeof globalThis !== "undefined" && globalThis.__DOCTRINE != null)
    ? globalThis.__DOCTRINE : (META && META.doctrine);
  return DOCTRINE[d] ? d : DOCTRINE_DEF;
};
export const doctrineOf = () => DOCTRINE[doctrineId()];
/** auto() 가 읽는다 — 이 편성이 원하는 **벽(골렘)·몸(구울) 수.** 나머지는 전부 수(해골)라
 *  auto() 의 채우는 차례(벽→몸→수)와 「못 세우면 다음 결로 샌다」 사슬은 그대로다. */
export const doctrineWants = (cap) => {
  const d = doctrineOf();
  return { golem: Math.max(d.wallMin, Math.min(d.wallMax, Math.floor(cap / d.wallDiv))),
           ghoul: Math.floor(cap * d.body) };
};

/* ══ 운용(tactic) ══ **사람이 「주술을 언제 쓸지」 고를 자리.** 여태 폭발·저주는 auto() 안에
   문턱 하나로만 박혀 있었다 — 저주는 「군세가 상한이면 늘」, 폭발은 「시체가 상한의 20% 를
   넘으면 늘」. 방치형에서 사람이 하는 판단이 「평지에선 아꼈다 관문에서 몰아친다」 같은
   운용인데(위 파일 머리 주석) 그 손잡이가 빠져 있던 셈이다. B-1(편성 · 군대를 어떻게 짜나)의
   짝으로 넷을 준다: 평시·관문에서만·넘칠 때만·늘.
   ★ 값을 **한 곳(이 표)에 모은다.** auto() 에 흩어 두면 검수기가 운용별로 A/B 를 못 돌리고,
     「평시가 예전과 한 톨도 안 달라야 한다」를 눈으로 대조할 수도 없다(DOCTRINE 과 같은 결).
   ★ **난수 한 톨 없다.** 전부 문턱 비교뿐이라 결정적이고, `steady`(기본) 는 예전 하드코딩
     조건(폭발 시체≥0.20 · 저주 군세 상한)과 **정확히 같은 식**이라 기본 운용에서는 검수기의
     A/B 가 그대로 성립한다. 플래그의 뜻(auto() 가 읽는다):
       novaCorpse   폭발 문턱 — 시체가 `CORPSE_MAX×이 값` 이상이면 터뜨린다
       novaBossOnly 폭발을 **보스가 있을 때만**(평지에선 시체를 쌓아 둔다)
       ampCapped    저주를 **군세가 상한일 때만**(false 면 상한을 안 기다린다)
       ampBossOnly  저주를 **보스가 있을 때만** */
export const TACTIC_DEF = "steady";
export const TACTIC = {
  steady: { n:"평시",       ico:"☯", d:"여태의 기본 — 시체가 차면 터뜨리고, 군세가 상한이면 저주한다",       novaCorpse:0.20, novaBossOnly:false, ampCapped:true,  ampBossOnly:false },
  gate:   { n:"관문에서만", ico:"⚑", d:"평지에선 아꼈다 관문에서 몰아친다 — 폭발·저주를 보스가 있을 때만",  novaCorpse:0.20, novaBossOnly:true,  ampCapped:true,  ampBossOnly:true  },
  hoard:  { n:"넘칠 때만",   ico:"⬢", d:"넘칠 때만 터뜨린다 — 폭발 문턱을 시체벽·제물과 같은 자리로(85%)",   novaCorpse:0.85, novaBossOnly:false, ampCapped:true,  ampBossOnly:false },
  always: { n:"늘",         ico:"✷", d:"쉬지 않고 몰아친다 — 시체가 조금만 있어도 터뜨리고, 상한을 안 기다려 저주한다", novaCorpse:0.05, novaBossOnly:false, ampCapped:false, ampBossOnly:false },
};
export const TACTIC_IDS = Object.keys(TACTIC);
/** 지금 세운 운용의 **id**. 머리 없는 자(검수기)를 위한 문 — `globalThis.__TACTIC` 이 있으면
 *  META 보다 앞선다(doctrineId 의 `__DOCTRINE` 과 같은 규칙). 모르는 값이면 기본값으로
 *  떨어진다(옛 저장·오타 방어). */
export const tacticId = () => {
  const t = (typeof globalThis !== "undefined" && globalThis.__TACTIC != null)
    ? globalThis.__TACTIC : (META && META.tactic);
  return TACTIC[t] ? t : TACTIC_DEF;
};
export const tacticOf = () => TACTIC[tacticId()];

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
/* ★★ **원이 그림보다 훨씬 컸다**(병수님 2026-08-16 09:32 「아직 유닛이 별로 안겹치는거
   같은데?」 — 세 번째 같은 말씀). 반경을 **키의 62%** 로 잡아서, 충돌 지름이 실제로 그려진
   몸 폭의 **2.5~4.4배**였다(자로 잼, 414×860):
     해골  몸폭 24px · 충돌지름 63px · 유지간격 32px  → 몸끼리 8px 떨어져 선다
     구울  25 / 71 / 35 · 골렘 41 / 102 / 51 · 타락자 12 / 53 / 27(몸 두 개 분량이 남는다)
   그래서 겹침 허용치(TOUCH_K)를 아무리 내려도 **그림은 안 겹친다** — 손잡이가 틀렸다.
   값은 A/B 로 정하되 문(`__FOOT_R`)을 내 둔다. */
/* **잰 값: 0.40** (씨앗 1·3·9 × 12분):
     0.62(전) 최고층 137 · 죽음 3 · 기다림 42
     0.40(넣음) **139 (101%)** · 죽음 4 · 기다림 43   ← 깊이가 공짜다
     0.30     114 (83%) · 죽음 8 — 여기서부터 무너진다(원이 몸보다 작아 서로 통과한다)
   0.40 이면 해골 충돌지름 63→41px, 유지간격 32→20px 로 **몸폭(24px)보다 좁아진다**
   — 즉 그림이 실제로 겹친다. */
export const FOOT_R_DEF = 0.40;
export const FOOT_R = 0.40;   // 옛 이름을 쓰는 자리(자·문서)를 위해 남긴다
export const footR = () => (globalThis.__FOOT_R != null ? +globalThis.__FOOT_R : FOOT_R_DEF);
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
/* ★ **마릿수**(병수님 2026-08-15 17:57 「적군 수 너무 적어, 초반부터 좀 몰아치는걸로
   바꿔라」). 1층이 5마리라 첫 몇 층은 한 마리씩 방울져 나오다 끝난다 — loop_health 의
   「기다림」(줄에 남았는데 판이 비어 있는 시간)이 그 값이다. 밑과 기울기를 문으로 낸다. */
/* **잰 값: 13 + 1.1f** (씨앗 1·3·9 · 12분, 간격 0.35배와 한 벌).
   마릿수만 늘리면 기다림이 되레 늘어난다(간격이 그대로라 줄만 길어진다) — 둘은 **한 벌**이다. */
export const SPAWN_BASE_DEF = 13, SPAWN_SLOPE_DEF = 1.1;
export const floorN    = (f) => (globalThis.__SPAWN_BASE != null ? +globalThis.__SPAWN_BASE : SPAWN_BASE_DEF)
                              + Math.floor(f * (globalThis.__SPAWN_SLOPE != null ? +globalThis.__SPAWN_SLOPE : SPAWN_SLOPE_DEF));
export const isGate    = (f) => f % 5 === 0;
export const goldFor   = (f) => Math.round(6 * Math.pow(1.12, f - 1));

/* ══ 구역(장소) ══ (ROADMAP G-b) **80층이 1층과 같은 방이었다.**
   G-a 로 깊이가 «값»을 주게 됐지만, 화면은 여전히 한 방이다 — 바닥도 적도 이름도
   1층과 80층이 같으니 「어디를 돌까」가 성립하지 않는다. D2 의 파밍은 **장소를 고르는
   것**이다(무덤·소굴·성역이 각기 다른 것을 준다). 그 자리를 여기서 연다.

   ★ **자를 둘로 늘리지 않는다.** 졸개 표(옛 `MOB_TIERS`)를 여기로 **접어 넣었다** —
     `from`·`kinds` 가 옛 표와 **글자 그대로 같아서** 적 구성은 한 톨도 안 바뀐다
     (깊은 두 구역 40·60 도 26 구역과 같은 식구다). 즉 이 판은 **이름·바닥·드랍표**만
     새로 얹는다. 난이도를 같이 흔들면 무엇이 무엇을 움직였는지 못 읽는다.

   ★ **드랍표**(bias)는 그 구역에서 잘 나오는 슬롯이다. 적지 않은 슬롯은 1.
     ── 난수를 **한 톨도 더 안 먹는다**: 옛 식 `GEAR_KEYS[floor(r*len)]` 이 뽑기 하나를
     쓰던 자리에서, 같은 뽑기 하나를 **저울에 얹어** 고른다(씨앗 재현이 산다).

   ★ **바닥**(tile)은 이미 구워 둔 타일 셋을 돌려 쓴다(원본 밝기 crypt 42 · bone 62 ·
     camp 117 — 화면 밝기가 40~50 에 서게 main.js 에서 굽는다). 밝기는 **타일의 것**이지
     구역의 것이 아니다 — 같은 타일을 쓰는 두 구역이 다른 밝기면 같은 재료가 두 얼굴이 된다.
   ★ 그것만으론 세 가지밖에 안 갈리므로 **색 기운**(tint)을 얹는다 — 바닥을 구울 때
     한 번 곱하는 것이라 매 프레임 값이 아니다(ground.js `useFloor`). */
export const ZONES = [
  { from: 1,  n: "무너진 묘지",   tile: "crypt", tint: null,
    kinds: ["fallen"],                        bias: { wand: 2.2, charm: 1.6 } },
  { from: 4,  n: "썩은 시체 굴",  tile: "crypt", tint: "#8fa07a",
    kinds: ["fallen", "zombie"],              bias: { robe: 2.2, belt: 1.8 } },
  { from: 9,  n: "뼈의 회랑",     tile: "bone",  tint: "#a4b0bc",
    kinds: ["fallen", "zombie", "skelarch"],  bias: { helm: 2.2, shield: 1.8 } },
  { from: 16, n: "잿빛 야영터",   tile: "camp",  tint: "#a8906c",
    kinds: ["zombie", "skelarch", "brute"],   bias: { glove: 2.2, boots: 1.8 } },
  { from: 26, n: "어둠의 성소",   tile: "bone",  tint: "#7d7fa8",
    kinds: ["skelarch", "brute", "brute"],    bias: { ring: 2.2, ring2: 1.8 } },
  { from: 40, n: "마른 피의 골",  tile: "camp",  tint: "#a06a62",
    kinds: ["skelarch", "brute", "brute"],    bias: { wand: 2.2, glove: 1.8 } },
  { from: 60, n: "심연",          tile: "crypt", tint: "#6a72a0",
    kinds: ["skelarch", "brute", "brute"],    bias: { charm: 2.2, ring2: 1.8 } },
];
/** 그 층이 선 구역. 표는 얕은 데서 자주 갈리고 깊은 데서 넓다 — 첫 몇 분에
 *  「바뀐다」가 자주 와야 내려가는 맛이 생긴다. */
export const zoneOf = (f) =>
  [...ZONES].reverse().find(z => (f | 0) >= z.from) || ZONES[0];
/** 구역이 바뀌는 층인가 — 알림·바닥 갈아 끼우기가 이걸로 걸린다. */
export const zoneStart = (f) => ZONES.some(z => z.from === (f | 0));
/** 그 층에 실제로 서는 졸개 종류(battle.js `mobKindFor` 와 검수기가 함께 쓴다). */
export const zoneKinds = (f) => zoneOf(f).kinds;

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
/* ══ 건너뛰기 ══ (병수님 2026-08-16 「어느정도 성장한 다음부터 스테이지 스킵」)
   ★ **저절로 깊은 데서 시작하는 길은 이미 한 번 껐다**(CHECKPOINT) — 벽은 그대로인데
     죽음이 11→30 으로 늘었다. 늘 벽에서 시작하니 튕기기만 한 것이다. 그러니 **사람이 고른다.**
   ★ 끝까지 건너뛰게 두면 판이 통째로 사라지므로, **최고 깊이보다 두 관문(10층) 아래**까지만.
   ★ 열리는 조건은 깊이 15층(관문 셋) — 「어느 정도 성장한 다음」의 값. */
export const DIVE_MIN_DEEPEST = 15;   // 이만큼 내려가 본 뒤에 열린다
export const DIVE_STEP = 5;           // 관문 간격과 같은 눈금
export const DIVE_BACK = 10;          // 최고 깊이에서 이만큼은 남긴다(관문 둘)
/* ★ **문이 열리는 자리를 A/B 로 옮겨 볼 수 있게 한다**(2026-08-16). 15·10 으로 처음
     잰 A/B 는 두 팔이 **바이트까지 같았다** — 12분 판의 죽음은 전부 3~10층에서 나는데
     그때 최고 깊이는 10 이하라 `diveMax()` 가 늘 0 이었다. 즉 건너뛰기는 **되짚기가
     생기는 그 자리에서 아예 안 열린다.** 게임 기본값은 그대로 두고 검수기만 문을 옮긴다. */
/* ★ **문을 열어 둘 것인가**(D-15 · ROADMAP D-14 ㉮). 여태 기본값은 「처음부터」였다 —
     창을 한 번도 안 연 사람은 죽을 때마다 **1층부터 예순다섯 층을 다시 걷는다.**
     D-13·D-14 가 그 두 사람을 갈라 재 보니 **판이 다른 게임**이었다:
       · 문 안 씀 — 뒤쪽 후퇴폭 79% · 되짚기 31% · 최고층 55  (④⑤ 둘 다 못 넘는다)
       · 문 씀   — 뒤쪽 후퇴폭 14% · 되짚기 17% · 최고층 65 · 25층+ 죽음 29 → **41**
     되짚기를 줄였는데 **죽음이 오히려 늘었다**(위험을 지운 D-10 과 정반대다).
   ★ **CHECKPOINT 와 헷갈리지 말 것** — 그건 「최고 깊이 아래 마지막 관문」, 곧 **죽은
     그 자리**에서 다시 세웠다(죽음 11 → 30, 벽은 그대로 · 같은 자리에서 튕기기만).
     건너뛰기는 최고 깊이보다 **두 관문(10층) 아래**라 다시 자랄 자리가 남는다 —
     그 열 층이 「튕김」과 「사건」을 가른다.
   1 = 문이 열리면 **저절로 제일 깊은 데서** 시작한다(사람이 고르면 그 값이 이긴다).
   0 = 옛 기본값(처음부터). A/B 로 되돌릴 문은 `globalThis.__DIVE_DEF`. */
export const DIVE_DEF_DEF = 1;
const DIVE_DEF = () => (typeof globalThis !== "undefined" && globalThis.__DIVE_DEF != null
  ? +globalThis.__DIVE_DEF : DIVE_DEF_DEF);
const DIVE_MIN = () => (typeof globalThis !== "undefined" && globalThis.__DIVE_MIN != null
  ? +globalThis.__DIVE_MIN : DIVE_MIN_DEEPEST);
const DIVE_BK = () => (typeof globalThis !== "undefined" && globalThis.__DIVE_BACK != null
  ? +globalThis.__DIVE_BACK : DIVE_BACK);
/** 지금 고를 수 있는 제일 깊은 시작 층. 못 고르면 0. */
export const diveMax = () => {
  const d = META.deepest | 0;
  if (d < DIVE_MIN()) return 0;
  return Math.max(0, Math.floor((d - DIVE_BK()) / DIVE_STEP) * DIVE_STEP);
};
/** 시작 층. 조건이 바뀌면 저절로 줄어든다(diveMax 로 깎는다).
    ★ **고른 적이 있으면 그 값이 이긴다**(`META.diveSet`) — 「처음부터」를 고른 것도
      고른 것이다. 한 번도 안 골랐으면 DIVE_DEF 가 정한다(위 주석).
    ★ 검수기는 `globalThis.__AUTO_DIVE` 로 「늘 제일 깊이 고르는 사람」을 흉내 낸다. */
export const diveAt = () => (
  (typeof globalThis !== "undefined" && globalThis.__AUTO_DIVE)
    ? diveMax()
    : (META.diveSet | 0)
      ? Math.min(META.dive | 0, diveMax())
      : (DIVE_DEF() ? diveMax() : 0));
/** 죽은 뒤 다시 서는 층. 여태 닿아 본 깊이 아래의 마지막 관문(5의 배수). */
export const startFloor = () =>
  Math.max(1, diveAt() || (CHECKPOINT ? Math.floor((META.deepest | 0) / 5) * 5 : 1));

/** 한 번의 내려감(run) 동안만 사는 값. **금·레벨은 여기 없다** — META 에 있다. */
export const S = {
  floor: 1, t: 0, speed: 1, running: true, dead: false,
  zone: null,                 // 지금 선 구역 이름(ROADMAP G-b) — enterFloor 가 적고 main.js 가 읽는다
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
  /** **예고를 남기고 죽은 주인의 수법** {t,mech,dmg,col,x,y}. 깊은 층의 주인은 한 번에
   *  0.8 초밖에 못 살아 수법을 한 번도 못 쓰고 치워졌다(2026-08-14 a1_gate: 50-99층
   *  관문 29/29 번이 수법 0). 예고가 이미 떴으면 **주인이 죽어도 그 수법은 예정대로
   *  터진다** — 위험이 주인의 생존에 매달려 있지 않게 하는 자리다. */
  pendMech: [],
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
                 /* 사람이 고른 시작 층(0 = 1층부터). diveAt() 이 최고 깊이에 맞춰 깎는다.
                    diveSet = **고른 적이 있는가**(0 이면 DIVE_DEF 가 정한다 — 옛 저장은
                    0 이라 「한 번도 안 고른 사람」으로 들어온다). diveTold = 문이 열렸다고
                    한 번 알렸는가(정산 창에서 한 번만 말한다). */
                 dive: 0, diveSet: 0, diveTold: 0,
                 doctrine: DOCTRINE_DEF,
                 tactic: TACTIC_DEF,
                 up: { hp:0, mp:0, dmg:0, army:0 },
                 /* 재련(reforge) — **슬롯별 강화 수치.** 물건이 아니라 슬롯에 붙여, 더 좋은
                    드랍으로 갈아 껴도 태운 금이 안 날아간다(ROADMAP ⑧-a). object 라 아래
                    merge 가 올려 주고, 옛 저장엔 없으니 0 이 남는다(손대기 전과 안 다르다). */
                 plus: { wand:0, robe:0, charm:0, helm:0, glove:0, ring:0 },
                 /* 낀 것 셋. **등급 숫자가 아니라 개체다** — {k, tier, af:[{id,v}]}.
                    옵션이 랜덤이면 같은 4등급이라도 물건마다 달라야 하므로, 슬롯에
                    숫자를 적어 두는 것으로는 표현할 수가 없다. */
                 equip: { wand:null, robe:null, charm:null, helm:null, glove:null, ring:null },
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
    /* ★★ `Object.assign(base, raw)` 는 **base 를 제자리에서 고친다** — 아래 m 과 base 는
       같은 개체다. 그걸 모르고 「나쁜 값이면 base[k] 로 되돌린다」라고 썼더니,
       되돌릴 곳에 이미 그 나쁜 값이 앉아 있어 **거르는 시늉만 했다**(gold "5000" 이
       문자열 그대로 통과 · relics -40 이 음수 그대로 통과). 기본값은 섞기 **전에**
       떠 놓는다 — tools/save_probe.mjs ③④ 가 이걸 잡았다. */
    const DEF = { ...base };
    const m = Object.assign(base, raw);
    m.up    = Object.assign({}, base.up,    raw.up    || {});
    m.plus  = Object.assign({}, base.plus,  raw.plus  || {});
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
    /* ★ **숫자 자리는 숫자여야 한다**(ROADMAP 「저장을 믿지 않는 자리를 한 곳 더」).
       문자열 레벨("12")·음수 유해·NaN 이 하나만 들어와도 그 값은 곱해지고 더해지며
       판 전체로 번진다 — `lv` 이 문자열이면 `META.lv - 1` 은 숫자지만 `(META.lv-1)*8`
       뒤에 오는 비교가 어긋나고, `relics` 가 음수면 relicMul 이 **0 이하**가 되어
       금·경험치·시체가 통째로 사라진다. 여기서 한 번 거르면 뒤는 안 봐도 된다.
       ★ 목록을 손으로 안 적는다 — `base` 에서 **number 인 자리**를 뽑아 돌린다.
         새 숫자를 base 에 더하면 저절로 따라온다(두 개의 진실을 안 만든다). */
    for (const k of Object.keys(DEF)) {
      if (typeof DEF[k] !== "number") continue;
      const v = +m[k];
      m[k] = (typeof m[k] === "number" && isFinite(v) && v >= 0) ? v : DEF[k];
    }
    /* 층·레벨·최고 기록은 **1 아래로 못 내려간다** — 0층은 없는 층이라 floorN(0) 같은
       자리가 빈 판을 만든다. quests 는 object 가 아니면 통째로 버린다. */
    for (const k of ["lv", "deepest", "best"]) m[k] = Math.max(1, Math.floor(m[k]));
    for (const k of ["relics", "rebirths", "runs", "corpses"]) m[k] = Math.floor(m[k]);
    if (!m.quests || typeof m.quests !== "object") m.quests = {};
    delete m.autoTree;   // 자동 배분은 없앴다(아래 autoSpend) — 옛 저장에 남은 값은 여기서 버린다
    if (!DOCTRINE[m.doctrine]) m.doctrine = DOCTRINE_DEF;   // 모르는 편성(옛 저장·오타)은 기본값으로 — 저장을 안 믿는 그 자리
    if (!TACTIC[m.tactic]) m.tactic = TACTIC_DEF;           // 운용도 같은 자리에서 거른다(같은 이유)
    return m;
  }
  catch { return base; }
}
export function saveMeta() {
  /* ★ 지우고 나면 **아무것도 안 쓴다.** 안 그러면 지우기와 새로고침 사이에 도는
     saveMeta(층 이동·구매·처치마다 돈다)가 방금 지운 자리에 옛 META 를 도로 써 넣어
     「초기화를 눌렀는데 그대로다」가 된다. 되돌릴 수 없는 일에는 문이 하나 더 필요하다. */
  if (wiped) return;
  /* ② lastSeen 은 **max 로만** 오른다 — 시계를 되돌려도 뒤로 안 가야 오프라인 경과가 음수가
     안 된다. 층 이동·구매마다 saveMeta 가 도므로 강제종료해도 마지막 시각이 크게 안 어긋난다. */
  META.lastSeen = Math.max(META.lastSeen || 0, Date.now());
  try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch { /* 시크릿 창 */ }
}

/* ══════════════════════════════════════════════════════════════
   ══ 초기화 ══ (병수님 2026-08-17 「초기화 기능 좀 만들어줘」)
   ──────────────────────────────────────────────────────────────
   환생과 **다른 일**이다. 환생은 유해·회차·일지·최고 기록을 지고 다시 걷는 이어달리기고,
   여기는 **아무것도 없던 자리로** 돌아간다. 화면에서도 그 차이를 말해야 한다.

   ★ **값을 하나씩 되돌리지 않는다.** rebirth() 처럼 필드를 손으로 0 으로 놓으면
     **새 필드를 더할 때마다 여기를 같이 고쳐야** 하고, 한 번 빠뜨리면 그 값만 옛 판에서
     살아남는다(초기화인데 안 지워지는 것이 남는 것보다 고약한 버그는 드물다).
     그래서 **저장 자체를 지우고 판을 새로 연다** — 다음 로드가 base 를 그대로 읽는다.
   ★ 화면 설정(성능 모드 `necro.perf.v1`)은 **안 지운다.** 그건 진행이 아니라 이 기기의
     사정이다 — 초기화했다고 사람이 고른 화질까지 되돌릴 까닭이 없다. */
let wiped = false;
export const isWiped = () => wiped;
/** **되돌릴 수 없다.** 저장을 지우고 다시 못 쓰게 잠근다. 판을 새로 여는 것은 부르는 쪽 몫
 *  (core 는 화면을 모른다). 지운 뒤 true, 이미 지웠으면 false. */
export function wipeSave() {
  if (wiped) return false;
  wiped = true;                                  // ★ 지우기 «전에» 잠근다 — 그 사이 도는 saveMeta 를 막는다
  try { localStorage.removeItem(META_KEY); } catch { /* 시크릿 창 */ }
  return true;
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
  META.plus  = {}; for (const k of GEAR_KEYS) META.plus[k]  = 0;      // 슬롯 목록은 GEAR 하나 — 늘어도 여기가 따라온다
  META.equip = {}; for (const k of GEAR_KEYS) META.equip[k] = null;
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

   ★★ **「base 안전」은 죽었다 — 실측으로 넷이 깨졌다** (2026-08-17 03:03 · 씨앗 1·3·9 · 12분).
   원래의 결은 이랬다: loop_health 는 저장을 지우고 마을 없이 자동으로만 돌리니(투자 0)
   과제가 안 깨지고, 그래서 회귀선이 유해에 안 흔들린다. **지금은 아니다.**
   세 씨앗 **모두** 같은 넷을 깨고 같은 값에 멎는다 — `army10 · offer · gate5 · feast` ·
   **유해 7구 · 배수 ×1.56** (`tmp/lhbase_{1,3,9}.json`). 첫 획득이 4·6·7분이라
   **12분 판의 뒤 절반이 ×1.16→1.48→1.56 으로 부푼 채** 굴러간다.
   relicMul 은 금·XP·시체 획득을 다 곱하므로(battle.js 680·1688·1694) **XP → 레벨 → 깊이**
   되먹임까지 탄다. 즉 회귀표 49·58·53 은 **「투자 0」이 아니라 「유해 7 을 포함한 선」**이다.
     · army10  — ✗ 깨짐. 「armyCap 은 최대 6」이라 적었으나 실측 군세가 31·36·28 이다.
     · gate5   — ✗ 깨짐. 「26층에 못 닿는다」고 적었으나 지금 base 최고층은 49~58 이다.
     · offer   — ✗ 깨짐. 「12분엔 밸브가 한 번도 안 돈다」는 ⑥ 때 실측인데, 지금은 시체가
                 5~7분부터 상한(140)에 붙박여 문턱(85%)을 늘 넘는다.
     · feast   — ✗ 깨짐. 「트리 끝 노드라 자동판엔 없다」고 적었으나 세 씨앗 다 깬다.
     · unique  — 아직 성립. **D-4 의 autoWear 로 깨질 줄 알았는데 안 깨진다** — 유니크가
                 2·3·2 번 떨어져 저절로 껴지는데도 셋 다 미달이다. 까닭은 questNote 가
                 **손으로 낀 자리에만**(1144행) 걸려 있어서다. 깨진 게 아니라 **자동으로는
                 닿을 수 없는 과제**라는 뜻 — 사람 손을 요구하는 설계면 그대로 두고,
                 아니면 autoWear 쪽에도 questNote 를 걸어야 한다(아직 안 정했다).
     · dig4    — 아직 성립. 무덤 파기는 마을에서 금을 쓴다 → 자동판은 안 판다.
     · rebirth — 아직 성립. 자동판은 환생을 안 누른다.
   즉 base 는 12점 중 **7점을 사람 없이 가져간다.** A/B 를 읽을 때: 두 팔 다 같은 넷을
   같은 무렵에 깨므로 **상수처럼 보이지만**, 더 빨리 깨는 팔은 배수를 더 오래 업고 달린다 —
   차이의 일부는 처치가 아니라 **유해 되먹임**이다. `lh_base`·`ab_xp` 의 base 합에도 그렇게 적었다.
   대신 quest_qa 가 투자를 갖춘 판에서 **하나하나 달성 가능함**을 따로 판정한다. */
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
/* ★★ **그런데 이번엔 안 꺾인다**(2026-08-15 병수님: "레벨이 너무 빨리오르는느낌인데,
   초반이라 그런가"). 12분 세 판을 분마다 재 보니 **초반 탓이 아니었다** — 씨앗 3 은
   3·5·8·11·14·18·22·25·28·31·34·37 로 **12분 내내 분당 3레벨**, 기울기가 한 번도 안 눕는다.
   까닭은 이 식과 벌이의 결이 다르기 때문이다:
     · 요구 = 17·lv^1.42          — **다항식**
     · 벌이 = (층×0.6) × 마릿수(5+0.7층) ≈ **층²**, 그 층은 시간에 거의 직선
   지수를 없애 벽을 치웠더니 이번엔 **바닥이 없어졌다.** 값은 A/B 로 정한다 —
   `__XP_K`(밑) · `__XP_P`(지수)를 자가 갈아 끼울 수 있게 문을 낸다(tools/ab_xp.sh). */
export const XP_K_DEF = 17, XP_P_DEF = 1.42;
export const xpNeed  = (lv) => Math.round(
  (globalThis.__XP_K != null ? +globalThis.__XP_K : XP_K_DEF) *
  Math.pow(lv, globalThis.__XP_P != null ? +globalThis.__XP_P : XP_P_DEF));
/** 강화는 **넷뿐이다.** 목록이 길면 방치형이 아니라 표 읽기가 된다. */
export const UPS = {
  hp:   { n:"생명력",   d:"최대 체력 +25%",    base:14 },
  mp:   { n:"기력",     d:"최대 마나 +8",      base:16 },
  dmg:  { n:"어둠의 힘", d:"소환수 피해 +8%",  base:22 },
  army: { n:"군세",     d:"소환수 상한 +1",    base:40 },
};
/* ★ **강화도 저장을 안 믿는다**(재련·장비와 같은 자리 · 같은 방식). `up` 에 모르는
 *  칸이 섞이면 `upCost` 의 `UPS[k].base` 가 그 자리서 터지고(마을 상점이 통째로
 *  멈춘다), 문자열·음수·NaN 이 들어오면 `pow` 가 NaN 을 뱉어 값이 「-」 로 뜬다.
 *  목록은 UPS 하나 — 칸 이름을 고치면 여기가 따라온다. */
if (!META.up || typeof META.up !== "object") META.up = {};
for (const k of Object.keys(META.up)) if (!UPS[k]) delete META.up[k];
for (const k of Object.keys(UPS)) {
  const v = +META.up[k];
  META.up[k] = (isFinite(v) && v > 0) ? Math.floor(v) : 0;
}
export const upCost = (k) => Math.round(UPS[k].base * Math.pow(1.55, META.up[k] || 0));

/* ══ 장비 ══ 병수님: "마을에서 아이템 구매 / 강화 등을 진행할 수 있게".
   **강화(UPS)와 겹치지 않게 축을 나눈다** — 강화는 «몸»을 키우고, 장비는 «손에 든 것»을
   바꾼다. 장비는 **등급을 사는 것**이라 한 번 사면 끝이고(반복 구매가 아니다), 그래서
   상점에 갈 이유가 「다음 등급이 열렸다」로 분명해진다.
   등급마다 값이 뛰므로 **한 번의 구매가 사건**이 된다 — 조금씩 오르는 강화와 다른 맛. */
/* ★ `u` 는 **보여 주는 단위**다(pct=%·flat=수·rate=/초). 값의 뜻이 슬롯마다 달라
   화면 셋(상점·견줌·상태창)이 저마다 `k==="wand"?…` 로 갈랐었다 — 슬롯을 늘리니
   그 셋을 다 고쳐야 했다. 진실을 여기 하나에 두고 gearShow/gearDelta 가 읽는다. */
export const GEAR = {
  wand:  { n:"지팡이", d:"본인 기본 공격력", u:"pct",
           tiers:["뼈 지팡이","녹슨 홀","흑요석 홀","심장의 홀","왕의 홀"],
           cost:[0, 90, 320, 1100, 3800], val:[0, 0.25, 0.6, 1.1, 1.9], sz:[1,3] },
  robe:  { n:"망토",   d:"최대 체력", u:"flat",
           tiers:["누더기","가죽 망토","사슬 망토","제의","왕의 제의"],
           cost:[0, 80, 300, 1000, 3500], val:[0, 40, 110, 260, 560], sz:[2,3] },
  charm: { n:"부적",   d:"마나 회복", u:"rate",
           tiers:["없음","뼛조각","은 부적","영혼석","군주의 인장"],
           cost:[0, 120, 420, 1400, 4600], val:[0, 0.6, 1.5, 3.0, 5.2], sz:[1,1] },
  /* ══ 슬롯 셋을 더 낸다 ══ (병수님 2026-08-16 「투구·장갑·반지」 · ROADMAP 757)
     페이퍼 돌에 여섯 칸을 앉히려 셋을 연다 — **새 밸런스 축을 만들지 않고** 이미 곱해지는
     자리 하나씩에만 건다: 투구=최대 마나(mpMaxOf) · 장갑=소환수 피해(dmgMulOf, UPS.dmg
     자리) · 반지=금 획득(goldMulOf, 늘 +0% 이던 「금 획득」 줄을 살린다).
     ★ **값은 기존 슬롯 하나의 6~7할**이다 — 셋이 붙어도 전체 화력이 두 배가 안 되게.
       · 투구 120 = 마나 풀(밑 40)에 매달아 robe(체력, 밑 100)의 결을 ~0.4배로 줄인 꼴.
       · 장갑 0.35 = dmgMulOf 안이라 작아야 한다(그 인수는 이미 1+여럿 — +0.35 면 후반
         총화력 ~15%·초반 ~30%, tier4 는 20층부터 나오므로 초반엔 안 뜬다).
       · 반지 0.5 = 화력이 아니라 벌이라 금 싱크(재련 1.55^n)가 되받는다.
     cost 도 같은 결(등급마다 뛰고 3~4가 사건)로 기존 셋의 ~65% 에 둔다. */
  helm:  { n:"투구",   d:"최대 마나", u:"flat",
           tiers:["맨머리","해골 투구","수의 두건","무덤지기 투구","재의 왕관"],
           cost:[0, 60, 210, 720, 2500], val:[0, 12, 32, 68, 120], sz:[2,2] },
  glove: { n:"장갑",   d:"소환수 피해", u:"pct",
           tiers:["맨손","뼈 장갑","수의 장갑","도굴꾼 장갑","재의 장갑"],
           cost:[0, 60, 210, 720, 2500], val:[0, 0.06, 0.14, 0.24, 0.35], sz:[2,2] },
  ring:  { n:"반지",   d:"금 획득", u:"pct",
           tiers:["없음","뼈 반지","수의 반지","무덤지기 반지","재의 인장"],
           cost:[0, 80, 280, 950, 3200], val:[0, 0.08, 0.18, 0.32, 0.50], sz:[1,1] },
  /* ══ 넷을 더 낸다 ══ (병수님 2026-08-16 17:26 「장비슬롯 더 늘려」)
     앞의 셋과 같은 규칙이다 — **새 밸런스 축을 만들지 않고** 이미 곱해지는 자리 하나씩에만.
       · 방패 = 최대 체력(bodyHp, 망토 자리) — 망토의 ~55%
       · 허리띠 = 시체 획득(harvestPct) — 「시체가 자원」인데 옵션으로만 오르던 축
       · 신발 = 소환수 걸음(MINION_SPD) — 「군대가 굼뜨다」던 그 축을 물건으로도 만진다
       · 반지 둘째 = 경험치(xpMul) — D2 도 반지가 둘이다. 첫 반지와 다른 축이라 둘이 안 겹친다
     ★ 값은 「같은 축을 이미 쥔 슬롯」의 절반 남짓이다 — 열 칸이 다 차도 화력이 두 배가 안 되게.
     ★ 걸음(신발)만은 **비율**이라 상한을 둔다(아래 minionSpd) — 빠른 건 좋지만 순간이동은 안 된다. */
  shield:{ n:"방패",   d:"최대 체력", u:"flat",
           tiers:["없음","나무 방패","뼈 방패","무덤지기 방패","재의 방패"],
           cost:[0, 70, 250, 850, 2900], val:[0, 22, 60, 145, 310], sz:[2,3] },
  belt:  { n:"허리띠", d:"시체 획득", u:"pct",
           tiers:["없음","가죽 띠","뼈 사슬","장의사 띠","재의 띠"],
           cost:[0, 60, 210, 720, 2500], val:[0, 0.05, 0.12, 0.21, 0.32], sz:[2,1] },
  boots: { n:"신발",   d:"소환수 걸음", u:"pct",
           tiers:["맨발","해진 신","무두질 신","도굴꾼 장화","재의 장화"],
           cost:[0, 60, 210, 720, 2500], val:[0, 0.05, 0.11, 0.19, 0.28], sz:[2,2] },
  ring2: { n:"반지 ②", d:"경험치", u:"pct",
           tiers:["없음","녹슨 고리","수의 고리","무덤지기 고리","재의 고리"],
           cost:[0, 80, 280, 950, 3200], val:[0, 0.06, 0.14, 0.25, 0.40], sz:[1,1] },
};

/* ══ 같은 등급의 다른 얼굴 ══ (병수님 2026-08-16 「아이템이 너무 종류가 별로 없는듯?」)
   등급 이름이 슬롯마다 다섯뿐이라, 3등급 지팡이는 **언제나** 「흑요석 홀」이었다 —
   백 번을 주워도 이름이 다섯 가지다. 값(val·cost)은 등급이 정하므로 **이름만** 갈라도
   주울 때마다 다른 물건으로 읽힌다. 셈은 한 톨도 안 바뀐다(A/B 가 그대로 성립한다).
   ★ 0등급(맨몸)은 안 가른다 — 「없음」이 세 이름이면 그게 더 이상하다. */
export const GEAR_ALT = {
  wand: [[], ["뼈 지팡이","마른 뼈 지팡이","금 간 지팡이"], ["녹슨 홀","이 빠진 홀","검게 탄 홀"],
             ["흑요석 홀","재의 홀","밤의 홀"], ["심장의 홀","고동치는 홀","산 자의 홀"],
             ["왕의 홀","무덤왕의 홀","첫 시신의 홀"]],
  robe: [[], ["누더기","해진 천","수의 자락"], ["가죽 망토","무두질한 망토","까마귀 망토"],
             ["사슬 망토","녹슨 사슬옷","상여꾼의 갑주"], ["제의","장의사의 제의","봉인된 제의"],
             ["왕의 제의","무덤왕의 제의","첫 장례의 제의"]],
  charm:[[], ["뼛조각","이빨 조각","손가락 뼈"], ["은 부적","녹슨 은패","달빛 부적"],
             ["영혼석","울음 맺힌 돌","혼이 든 돌"], ["군주의 인장","시체군주의 인장","깊은 곳의 인장"]],
};
/** 등급 안에서 몇 번째 얼굴인가 — 물건이 만들어질 때 한 번 정해져 저장된다(it.v). */
export const gearFace = (k, tier, v) => {
  const alt = (GEAR_ALT[k] || [])[tier];
  return (alt && alt.length) ? alt[(v | 0) % alt.length] : GEAR[k].tiers[tier];
};

/* ══ 재련(reforge) ══ 등급은 15층이면 꼭대기 4에 닿고(dropTierCap) 옵션 셋도 곧 차서
   장비 축은 구조적으로 ≈1500 이 천장이었다(ROADMAP ⑧-a). 그 「등급 4 위」에 층에 안 묶인
   무한 축 하나를 얹는다 — 슬롯마다 +N. 금을 무한히 먹어 ⑧-b 의 금 싱크도 같이 닫는다.
   ★ 수치를 코드에 박지 않는다: step 은 그 슬롯 **최고등급값의 비율**이라 슬롯마다 자동
     비례한다(지팡이 0.114 · 망토 33.6 · 부적 0.312). */
export const REFORGE_STEP = 0.06;
export const reforgeStep = (k) => GEAR[k].val[GEAR[k].val.length - 1] * REFORGE_STEP;
/* 값은 지수로 오른다 — 밑은 대장간(upCost 1.55)과 **같은 계열**. 기본값은 감이 아니라
   60분 금 곡선(tmp/lh_a60_s1.json)에 맞췄다: plus 30 이면 cost≈1000만 이라 후반의 분당
   수천만 금을 실제로 먹고(무한 싱크), plus 0~4 는 수백 금이라 10분 안에 천장을 뚫는다. */
export const REFORGE_BASE = 20, REFORGE_POW = 1.55;
export const reforgeCost = (k) => Math.round(REFORGE_BASE * Math.pow(REFORGE_POW, META.plus[k] | 0));
/* 자가 보는 무게 — 한 등급(100)보다 작게 두어 등급이 여전히 뼈대다. 슬롯이 같으면 모든
   물건에 **똑같이** 더해지므로 자동착용/처분 비교가 안 어긋난다(등급·옵션으로만 갈린다). */
export const PLUS_W = 35;

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
  { id:"twice",    k:"charm", n:"망자의 손아귀", d:"쓴 시체가 이따금 되돌아온다",         rule:"corpse-refund", up:true },
  { id:"blast",    k:"charm", n:"역병의 낙인",   d:"소환수가 죽으면 그 자리가 터진다",     rule:"death-nova",    up:true },
  { id:"overflow", k:"wand",  n:"범람의 홀",     d:"넘치는 마나가 적에게 쏟아진다",        rule:"mana-spill",    up:true },
  { id:"gate",     k:"wand",  n:"도살자의 인장", d:"관문에선 배로 · 평지에선 못 미친다",   rule:"gate-swing"    },
  { id:"lonely",   k:"robe",  n:"고독한 왕관",   d:"군세는 반, 소환수 한 방은 더 세게",     rule:"few-strong"    },
];
export const UNIQ_BY_ID = {};
for (const u of UNIQUE) UNIQ_BY_ID[u.id] = u;
/** 이 물건이 유니크인가 — **uid 하나로 표식한다.** 저장이 uid 를 들고 오면 gearOk 가
 *  아는 것만 통과시킨다(모르는 uid 는 옛 유니크·오타라 걸러진다). */
export const isUnique = (it) => !!(it && it.uid);
export const uniqOf   = (it) => (it && it.uid) ? (UNIQ_BY_ID[it.uid] || null) : null;
/** **저절로 껴도 되는 물건인가** (D-4). 평범한 전리품은 늘 그렇고, 유니크는 `up`
 *  (위로만 — 손해 보는 자리가 없는 것) 셋만 그렇다. `gate`·`lonely` 는 **주고받기**라
 *  저절로 껴지면 판을 망칠 수 있어(관문 밖에서 못 미치고, 군세가 반이 된다) 손으로만 낀다.
 *  방치형인데 유니크가 가방에 앉아만 있으면 「규칙을 바꾸는 물건」이 방치판엔 없는 것과
 *  같다 — 그래서 「손해 없는 것만 저절로」로 갈랐다. 자는 하나(scoreOf)를 그대로 쓴다
 *  (유니크는 +60 을 이미 받는다) — 여기서 새 자를 만들지 않는다. */
export const autoWear = (it) => !!it && (!it.uid || !!(UNIQ_BY_ID[it.uid]?.up));
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
/** ══ 물건 레벨(il) ══ D2 의 **지역 레벨(alvl)** 자리다. (ROADMAP G-a)
 *  `dropTierCap` 은 15층이면 꼭대기 4 에 닿아 **그 뒤 60~65층이 새 물건을 하나도 안 줬다**
 *  (`tools/depth_probe.mjs` 로 재니 15층→80층 「한 판 최고 점수」가 **1.00배** — 눈금이 없다).
 *  등급 이름을 더 만들어 상한을 올리는 길도 있지만, 그건 열 슬롯의 이름·값·값어치를 다
 *  새로 짜는 일이고 **끝이 또 생긴다.** D2 가 실제로 쓰는 건 그 길이 아니다 — 같은 베이스라도
 *  **어느 깊이에서 떨어졌느냐**가 값을 가른다. 그래서 물건마다 `il`(떨어진 층)을 새기고,
 *  기본 수치와 옵션 폭을 **둘 다** 이 하나로 곱한다(자가 둘이면 어디서 세는지 못 찾는다).
 *
 *  ★ 꼴은 **로그**다 — 층은 끝이 없는데(한 생에 수백 층까지 간다) 선형·지수로 매달면
 *    깊은 데서 터진다. 로그면 **영영 오르되 천천히** 오른다:
 *      15층 1.00 · 30층 1.55 · 60층 2.10 · 80층 2.33 · 200층 3.05 · 500층 3.81
 *  ★ IL_FREE(=15) 아래는 1.0 이다 — 초반 판은 지금과 **한 톨도 안 달라진다**(회귀 안전).
 *  ★ 적은 깊이에 **지수**로 세진다(depthMul). 그 옆에서 로그 2.3배는 난이도를 안 뒤집는다
 *    — 이 축은 «세짐»이 아니라 «주울 이유»를 만드는 자리다. */
export const IL_FREE = 15, IL_GAIN = 0.55;
export const ilMul = (il) => {
  const d = Math.max(0, (+il || 0) - IL_FREE);
  return 1 + IL_GAIN * Math.log2(1 + d / IL_FREE);
};
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
/* ★ 물건 레벨도 여기서 거른다 — 옛 세이브에는 `il` 이 아예 없고(→0, 곱수 1.0 이라 지금과 같다),
   문자열·음수·소수·무한이 섞여 오면 ilMul 이 NaN 을 뱉어 gearVal·scoreOf 가 통째로 썩는다. */
const ilOk = (it) => { if (it) it.il = (typeof it.il === "number" && isFinite(it.il) && it.il > 0) ? Math.floor(it.il) : 0; return it; };
META.bag = (META.bag || []).filter(gearOk).map(ilOk);
/* ★ 낀 것도 여기서 거른다 — **모르는 슬롯은 버리고, 없는 슬롯은 0등급(null)으로 채운다.**
   슬롯을 늘려도 옛 세이브(셋만 든 것)가 그대로 열리게: 새 슬롯은 null 로 서고(0등급),
   지워진 슬롯은 사라진다. 진실은 GEAR_KEYS 하나라 이름을 고치면 여기가 따라온다. */
if (!META.equip || typeof META.equip !== "object") META.equip = {};
for (const k of Object.keys(META.equip)) if (!GEAR[k]) delete META.equip[k];
for (const k of GEAR_KEYS)
  META.equip[k] = (META.equip[k] && gearOk(META.equip[k])) ? ilOk(META.equip[k]) : null;
/* ★ 재련 단계도 같은 자리에서 거른다(ROADMAP ⑧-a·382 「저장을 믿지 않는 자리를 한 곳 더」).
 *  문자열·음수·소수·모르는 슬롯이 들어오면 reforgeCost 의 pow 나 gearVal 이 NaN 을 뱉는다. */
if (!META.plus || typeof META.plus !== "object") META.plus = {};
for (const k of Object.keys(META.plus)) if (!GEAR[k]) delete META.plus[k];
for (const k of GEAR_KEYS) {
  const v = META.plus[k];
  META.plus[k] = (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
}
/** 떨어진 물건 하나를 뽑는다 — {슬롯 k, 등급 tier}. 낮은 등급이 더 흔하다.
 *  ★★ 등급 이름을 `t` 로 뒀다가 **판 위의 나이(t)와 부딪혔다** — 떨어진 물건에
 *  `{...d, t: 0}` 로 나이를 얹는 순간 등급이 0 이 되고, 나이가 흐르면 등급이
 *  1.06 같은 **소수**가 됐다(그 값으로 cost 를 읽어 금이 NaN 이 됐다).
 *  자가 「장비_후 1.0666」을 뱉어서 잡혔다 — 이름은 뜻이 다르면 달라야 한다. */
let uniqRotor = 0;
/** ══ 구역 드랍표 ══ (ROADMAP G-b) 그 구역에서 **잘 나오는 슬롯**을 저울로 얹는다.
 *  ★ **뽑기를 하나도 더 안 쓴다** — 옛 식은 `GEAR_KEYS[floor(r*len)]` 로 뽑기 하나를
 *    썼다. 여기서도 **같은 뽑기 하나**를 저울 위에 흘려 고른다. 난수 소비 개수가
 *    글자 그대로 같아야 씨앗 재현(loop_health A/B)이 산다.
 *  ★ 저울에 안 적힌 슬롯은 1 이다 — 목록을 두 벌 적으면 슬롯을 늘릴 때 한 쪽이 썩는다. */
export function dropKeyFor(f, r) {
  const bias = zoneOf(f).bias || {};
  let sum = 0;
  for (const k of GEAR_KEYS) sum += (bias[k] > 0 ? bias[k] : 1);
  let x = r * sum;
  for (const k of GEAR_KEYS) { x -= (bias[k] > 0 ? bias[k] : 1); if (x < 0) return k; }
  return GEAR_KEYS[GEAR_KEYS.length - 1];      // 부동소수 끝자락
}
export function rollDrop(f) {
  const k = dropKeyFor(f, Math.random());
  const cap = dropTierCap(f);
  /* 위쪽 등급일수록 드물게 — 제곱으로 눌러 「높은 게 나왔다」가 사건이 되게. */
  const tier = 1 + Math.floor(Math.pow(Math.random(), 2.1) * cap);
  /* ★ 유니크는 **깊이가 열쇠**(f≥10)이고 **난수를 새로 안 먹는다** — 위 두 draw 를
     그대로 소비한 뒤 결정적으로 얹는다(rotor 로 다섯을 돌려 씀). 그래서 유니크 없는
     판(base)은 난수열이 한 톨도 안 어긋나 loop_health 회귀가 정확히 성립한다(A/B).
     한 생에 f≥10 전리품을 UNIQ_DROP_EVERY 개 모아야 하나 — S.uniqCtr 는 newRun 이 0 으로. */
  if (f >= 10 && ++S.uniqCtr >= UNIQ_DROP_EVERY) {
    S.uniqCtr = 0;
    return mkUnique(UNIQUE[uniqRotor++ % UNIQUE.length], f);
  }
  /* ★ 떨어진 층을 그대로 물건 레벨로 새긴다 — 같은 4등급이라도 **더 깊은 데서 나온 것**이 낫다. */
  return mkItem(k, Math.min(cap, tier), false, f);
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
  /* ══ 넷을 더 연다 ══ (병수님 2026-08-16 「아이템이 너무 종류가 별로 없는듯?」)
     여섯이면 3등급 이상에서 **거의 다 나와** 두 물건이 같아 보인다 — 옵션 셋을 뽑는데
     고를 것이 여섯뿐이면 조합이 20가지고, 그중 좋은 것 몇 개로 수렴한다. 열이면 120가지다.
     ★ 새 축은 **이미 곱해지는 자리 하나씩**에만 건다 — 흩뿌리면 어디서 세는지 못 찾는다.
       corpse→처치 시 시체 · nova→시체 폭발 피해 · cd→재사용 · xp→경험치. */
  corpse: { n:"시체 획득", u:"%",   pre:"거두는",   w:0.6, r:[8, 25],  p:0.8 },
  nova:   { n:"폭발 피해", u:"%",   pre:"터뜨리는", w:0.5, r:[12, 35], p:0.7 },
  cd:     { n:"재사용 감소", u:"%", pre:"서두르는", w:1.4, r:[5, 14],  p:0.6 },
  xp:     { n:"경험치",    u:"%",   pre:"깨우치는", w:0.55, r:[10, 28], p:0.6 },
};
const AF_KEYS = Object.keys(AFFIX);
const afMul = (tier, il) => (0.6 + 0.35 * tier) * ilMul(il);   // 1등급 0.95 → 4등급 2.0, 여기에 깊이(il)가 곱해진다
/** 등급이 높을수록 **많이** 붙는다. 1등급 0~1 · 4등급 3(상한). */
function afCount(tier) {
  return Math.min(3, Math.max(0, tier - 1 + (Math.random() < 0.35 ? 1 : 0)));
}
function rollAffix(tier, taken, il) {
  const pool = AF_KEYS.filter((id) => !taken.includes(id));
  let tot = 0; for (const id of pool) tot += AFFIX[id].p;
  let r = Math.random() * tot, id = pool[pool.length - 1];
  for (const c of pool) { r -= AFFIX[c].p; if (r <= 0) { id = c; break; } }
  const a = AFFIX[id];
  /* ★ 군세만 등급으로 안 키운다. 처음엔 다 같이 곱했더니 4등급에서 +2 가 나왔고,
     셋을 끼면 상한이 6→12 로 **두 배**가 됐다 — 옵션 하나가 판을 통째로 바꾸면
     그건 옵션이 아니라 다른 게임이다. 뽑기가 드문 것으로 값어치를 지킨다. */
  const raw = (a.r[0] + Math.random() * (a.r[1] - a.r[0])) * (a.flat ? 1 : afMul(tier, il));
  return { id, v: id === "mp" ? Math.round(raw * 10) / 10 : Math.max(1, Math.round(raw)) };
}
/** 물건 하나를 만든다. `plain` 이면 옵션 없이 — **상점이 파는 것이 그것이다**.
 *  상점은 바닥이고 던전이 천장이어야 「한 판 더」가 산다. */
export function mkItem(k, tier, plain = false, il = 0) {
  const af = [];
  if (!plain) { const n = afCount(tier); for (let i = 0; i < n; i++) af.push(rollAffix(tier, af.map((x) => x.id), il)); }
  /* 얼굴(v) — 같은 등급 안에서 이름만 가른다. 값에는 한 톨도 안 쓰인다. */
  return { k, tier, af, v: Math.floor(Math.random() * 3), il: il | 0 };
}
/** 유니크 하나를 만든다 — **등급 4 취급**(GEAR[k] 최고 등급)에 uid 로 규칙을 표식하고,
 *  옵션은 두지 않는다(규칙이 값어치다 · 난수를 안 먹어 결정적이다). */
export function mkUnique(u, il = 0) {
  return { k: u.k, tier: GEAR[u.k].tiers.length - 1, af: [], uid: u.id, il: il | 0 };
}
/** 물건끼리 견주는 **하나의 자.** 자동 착용·자동 처분이 전부 이걸 본다 —
 *  자가 여럿이면 「왜 이게 안 끼워졌지」가 설명이 안 된다. */
export const scoreOf = (it) =>
  !it ? -1 : it.tier * 100 * ilMul(it.il) + (it.uid ? 60 : 0) + (META.plus[it.k] | 0) * PLUS_W
             + it.af.reduce((s, a) => s + (AFFIX[a.id]?.w || 0) * a.v, 0);
/** 이름 — 제일 센 옵션이 앞에 붙는다(디아블로의 접두사).
 *  ★ 접두사는 **「~의」로 끝내지 않는다.** 등급 이름 절반이 이미 「심장의 홀」·「왕의 제의」
 *  처럼 「의」로 끝나서 「군단의 심장의 홀」이 됐다 — 관형형(잔혹한·흐르는)으로만 쓴다. */
export function nameOf(it) {
  if (!it) return "없음";
  if (it.uid) return UNIQ_BY_ID[it.uid]?.n || GEAR[it.k].tiers[it.tier];
  const base = gearFace(it.k, it.tier, it.v);
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
/* ══ 가방 ══ 병수님: "D2 처럼 — 10×4 격자, 물건마다 차지하는 칸이 다르다."
   방치형이므로 **드래그·수동 배치를 만들지 않는다** — 자리는 저절로 잡히고(bagPack),
   안 들어가면 **점수가 제일 낮은 것부터** 저절로 녹아 자리를 낸다(bagTrim). 그래서
   가방이 넘쳐 판이 멈추는 일이 없다. 「칸 수」로 재던 것을 「들어가느냐」로 바꾼다. */
export const BAG_COLS = 10, BAG_ROWS = 4;        // D2 와 같은 10×4
/** BAG_MAX 는 **없애지 않는다** — 뜻이 「물건 개수」에서 「칸 수」(=40)로 바뀐다.
 *  머리글(가방 N/40)·검수기가 이 값을 「몇 칸까지」로 읽는다. */
export const BAG_MAX = BAG_COLS * BAG_ROWS;
/** 이 물건이 차지하는 칸 [w,h] — 진실은 GEAR[k].sz 하나. 모르는 슬롯(옛 이름·오타로 sz 가
 *  없어도)은 1×1 로 떨어져 안 죽는다. */
export const sizeOf = (it) => (it && GEAR[it.k] && GEAR[it.k].sz) || [1, 1];
/** ★ **자리잡기는 여기 하나.** 배열 순서대로 왼쪽 위부터 행 우선(row-major)으로 훑어
 *  **처음 들어가는 자리**에 놓는다. 순수 함수여야 한다(META 를 안 만진다) — 검수기가 직접
 *  부르고, 화면도 이 함수 하나를 써서 그린다(자리 셈을 두 곳에 두면 한쪽만 고쳐지는 사고가
 *  이 리포에 이미 있었다 — dollHtml 주석 참고).
 *  돌려주는 값: { placed:[{it,i,c,r,w,h}], overflow:[…들어가지 못한 물건], used:<찬 칸 수> } */
export function bagPack(list) {
  const occ = new Uint8Array(BAG_COLS * BAG_ROWS);
  const placed = [], overflow = [];
  const free = (c, r, w, h) => {
    if (c + w > BAG_COLS || r + h > BAG_ROWS) return false;
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (occ[y * BAG_COLS + x]) return false;
    return true;
  };
  for (let i = 0; i < list.length; i++) {
    const [w, h] = sizeOf(list[i]);
    let put = false;
    for (let r = 0; r <= BAG_ROWS - h && !put; r++)
      for (let c = 0; c <= BAG_COLS - w && !put; c++)
        if (free(c, r, w, h)) {
          for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) occ[y * BAG_COLS + x] = 1;
          placed.push({ it: list[i], i, c, r, w, h }); put = true;
        }
    if (!put) overflow.push(list[i]);
  }
  let used = 0; for (let i = 0; i < occ.length; i++) used += occ[i];
  return { placed, overflow, used };
}
/** 다 들어가는가 — 「칸 수」가 아니라 「들어가느냐」. */
export const bagFits = (list) => bagPack(list).overflow.length === 0;
/** 지금 가방이 **찬 칸 수** — 머리글·로그·툴팁이 「N/40」의 N 으로 쓴다(개수 아님). */
export const bagUsed = () => bagPack(META.bag).used;
/** 물건을 녹여 얻는 금. 예전엔 takeDrop 안에 `cost*0.22` 로 박혀 있던 식이다 —
 *  이제 가방(bagTrim)도 같은 값으로 녹이므로 **두 곳에 같은 식을 두지 않으려** 여기 모은다. */
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

/** 자리가 안 나면(bagFits 가 아니면) **점수가 제일 낮은 것부터** 금으로 녹인다(들어갈
 *  때까지 반복). 유니크는 규칙이 점수로 안 잡혀 건너뛴다 — 가방이 통째로 유니크뿐이라
 *  녹일 것이 없으면 넘쳐도 둔다(막다른 골목의 break). 녹인 목록을 돌려준다.
 *  ★ bagPut(주울 때)과 불러오기(옛 세이브가 40칸을 넘겨 열릴 때)가 **같은 한 벌**을 쓴다. */
export function bagTrim() {
  const melted = [];
  while (!bagFits(META.bag)) {
    let lo = -1;
    for (let i = 0; i < META.bag.length; i++) {
      if (META.bag[i].uid) continue;
      if (lo < 0 || scoreOf(META.bag[i]) < scoreOf(META.bag[lo])) lo = i;
    }
    if (lo < 0) break;
    const [gone] = META.bag.splice(lo, 1);
    const gold = meltGold(gone);
    META.gold += gold;
    melted.push({ n: nameOf(gone), gold, tier: gone.tier });
  }
  return melted;
}

/** 가방에 넣는다. 안 들어가면(bagFits 가 아니면) **점수가 제일 낮은 것부터** 금으로 녹인다.
 *  방금 넣은 그것이 제일 나쁘면 그 자리에서 녹아 없어질 수도 있다 — 그래서 「가방에 남았나」는
 *  부르는 쪽이 `META.bag.includes(it)` 로 확인한다. 녹은 금은 bagTrim 이 바로 META.gold 에 더하고,
 *  **녹인 목록**(로그가 「무엇이 얼마에 녹았는지」를 말할 수 있게)을 돌려준다. */
export function bagPut(it) {
  META.bag.push(it);
  lastFused = bagFuse();                          // ★ 녹이기 전에 합친다 — 중복은 금이 아니라 재료
  return bagTrim();
}
/* ★ 옛 세이브가 40칸을 넘겨 열리면(큰 물건 여럿) 규칙 한 벌(bagTrim)로 자리를 낸다 —
   12개 이하 옛 세이브는 대개 그대로 들어가고, 넘치면 주울 때와 같은 규칙으로 녹는다. */
bagTrim();

/** 주웠을 때 무슨 일이 일어나는가. 점수가 높으면 **그 자리에서 갈아 끼우고**(방치형이므로
 *  고르라고 세우지 않는다) 벗은 것은 가방으로, 아니면 곧장 가방으로 — 빈손으로 돌려보내지 않는다.
 *  어느 쪽이든 가방이 넘쳐 녹은 것이 있으면 그 금은 bagPut 이 이미 META.gold 에 더했고,
 *  여기서는 로그가 쓰도록 합만 돌려준다.
 *  돌려주는 값: worn(갈아 끼웠나) · gold(이번에 녹은 금의 합) · bagged(주운 그것이 가방에 남았나) ·
 *  melted(녹인 목록 {n,gold,tier}). */
export function takeDrop(d) {
  /* ★ **uid 를 같이 옮긴다.** 여기서 새 개체를 만들면서 uid 를 안 옮겼더니 rollDrop 이
     굽던 유니크가 **한 번도 손에 안 들어왔다**(30분 × 씨앗 여덟에서 유니크 0번 —
     D-1 측정이 잡았다, 2026-08-14). 아래 두 갈래가 `it.uid` 를 읽으므로 여기가 진짜 자리다. */
  const it = { k: d.k, tier: d.tier, af: d.af || [] };
  if (d.uid) it.uid = d.uid;
  let worn = false, melted = [];
  lastFused = [];                                // 이번 처리의 합성만 담기게 비운다(worn·빈손이면 bagPut 을 안 거친다)
  /* ★ **이미 가진 유니크가 또 나오면 그 자리에서 금으로.** 유니크는 합쳐지지도 녹지도
     않으므로(bagFuse·bagPut 이 건너뛴다) 중복이 쌓이면 12칸을 유니크가 다 먹어 평범한
     전리품이 들어오는 족족 녹는다 — 합성 고리가 통째로 죽는다. 중복만 막으면 가방에
     남는 유니크는 많아야 다섯(UNIQUE 의 수)이다. */
  if (it.uid && (hasUnique(it.uid) || META.bag.some((b) => b && b.uid === it.uid))) {
    const gold = meltGold(it);
    META.gold += gold;
    return { worn: false, gold, bagged: false,
             melted: [{ n: nameOf(it), gold, tier: it.tier }], fused: [], ref: it };
  }
  /* ★ **손해 없는 것만 저절로 껴진다**(D-4, 2026-08-15). 예전엔 유니크를 전부 안 끼웠는데
     (주고받기가 자동으로 껴져 판을 망지면 안 된다는 결정) 방치로 두면 유니크가 **가방에
     앉아만 있어** 「규칙을 바꾸는 물건」이 방치판엔 없는 것과 같았다. 그래서 `autoWear`
     로 갈랐다 — 위로만인 셋(twice·blast·overflow)은 자가 높으면 저절로, 주고받기 둘
     (gate·lonely)은 손으로만. **낀 유니크는 여전히 자동 교체하지 않는다**(손으로 벗는다) —
     저절로 낀 규칙이 저절로 사라지면 판이 왜 달라졌는지 설명이 안 된다. */
  if (autoWear(it) && !isUnique(equipped(d.k)) && scoreOf(it) > scoreOf(equipped(d.k))) {
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
/** ★ 낀 물건의 **물건 레벨**이 기본 수치를 곱한다(ilMul) — 재련(plus)은 금이 주는 몫이라
 *  곱수 밖에 둔다(깊이의 몫과 금의 몫이 섞이면 어느 쪽이 올렸는지 못 읽는다). */
export const gearVal = (k) => GEAR[k].val[gearTier(k)] * ilMul(equipped(k)?.il)
                            + (META.plus[k] | 0) * reforgeStep(k);
/** 값을 **보여 주는 꼴** — 단위(GEAR[k].u)에 맞춰 %·수·/초 로. 화면 셋(상점·상태창·견줌)이
 *  같은 자를 쓰게 한 곳에 둔다(예전엔 저마다 `k` 로 갈라, 슬롯을 늘릴 때마다 셋을 다 고쳤다). */
export const gearShow = (k, v) => {
  const u = GEAR[k].u;
  return u === "pct" ? `+${Math.round(v * 100)}%` : u === "rate" ? `+${v.toFixed(1)}/초` : `+${v}`;
};
/** 견줌용 — 부호를 앞에(오르면 + · 내리면 −) 두고 절댓값을 같은 단위로. */
export const gearDelta = (k, d) => {
  const s = d > 0 ? "+" : "−", a = Math.abs(d), u = GEAR[k].u;
  return u === "pct" ? `${s}${Math.round(a * 100)}%` : u === "rate" ? `${s}${a.toFixed(1)}/초` : `${s}${a}`;
};

/* ══ 금은 저절로 쓰인다 ══ 방치형인데 **마을에 들러 손으로 눌러야만** 금이 줄었다.
   60분 곡선(ROADMAP ⑧)에서 금만 혼자 지수로 뛰어 1.4~5.2억이 쌓였고 군세 상한은
   6~8 에 박혀 있었다 — 상한이 «못» 자란 게 아니라 **아무도 안 산 것**이다.
   그래서 셋 중 «대장간(강화)»만 저절로 산다:
     · 강화 = 「조금씩 오르는 몸」 — 고를 것이 없다. 손이 할 일이 아니다.
     · 상점(장비) = 「한 번이 사건」 · 트리 = 되돌릴 수 없는 갈림길 → **손에 남긴다.**
   ★ 다음에 살 수 있는 **장비 한 벌 값은 남겨 둔다**(forgeReserve). 안 그러면 상점에
     갈 때마다 금이 0 이라 「살 것이 없는 가게」가 되고, 손으로 하는 축이 통째로 죽는다.

   ══ **「제일 싼 것부터」를 버린다** ══ (병수님 2026-08-21 17:40 「① 자동 구매 규칙을 바꾼다」)
   여태는 `upCost` 최소를 샀다. 그런데 밑값이 14/16/22/40 이고 **곱이 넷 다 1.55** 라,
   그 규칙은 계급을 **고정 간격에 못 박는다** — 금을 1천에서 1억까지(10만 배) 부어도
   폭이 **2** 였다(3·3·2·1 → 28·28·27·26, `tools/forge_mix.mjs` 로 실측).
   그건 축 넷이 아니라 **금 하나에 붙은 눈금 넷**이다. 등급·문턱을 얹어도 시간이
   알아서 넘으므로, **값이 아니라 규칙**을 바꿔야 풀린다(밑값·곱을 축마다 달리 해도
   간격만 바뀌고 여전히 묶인다 — 그것도 재 봤다).

   새 규칙: **몫(weight) 대비 제일 뒤처진 축**을 산다. `(계급+1) / 몫` 이 최소인 것.
     · 그러면 계급 비가 **몫에 수렴**한다 — 몫이 2:1 이면 계급도 대략 2:1 이 된다.
     · 그리고 **몫을 편성(doctrine)과 트리 갈래가 정한다** → 빌드마다 다른 몸이 된다.
       여태 「무엇을 소환할지」만 갈리고 **몸은 누구나 똑같았다.**
   ★ **마나에는 바닥을 둔다.** 08-21 에 죽음 일곱을 뜯어 보니 **전부 마나 0~6** 이었다
     (체력이 모자라 죽은 것은 하나도 없었다). 마나를 굶기는 몫은 **앞 6분의 죽음을
     늘린다** — 어느 편성에서도 mp 몫을 0.85 아래로 두지 않는다.
   ★ **재련은 규칙을 안 바꾼다.** 뒤처진 축의 값과 **제일 싼 재련**을 견줘 싼 쪽을 산다 —
     여태와 같은 자리다. 무한 축이라 여기가 굶으면 후반에 금이 갈 데가 없어진다
     (`forge_mix` 의 ㉣ 가 그걸 지킨다). */

/** 축마다의 **몫.** 편성이 고르고, 트리 갈래가 그 위에 곱한다.
 *  ★ 균형(기본)은 **넷 다 1** — 지난 측정의 축이 그대로 성립해야 A/B 를 이어서 읽는다.
 *  ★ 어느 칸도 0 이 아니다. 0 이면 그 축은 **영영 안 사지고**, 「고른다」가 아니라
 *    「없앤다」가 된다(트리 갈래는 잠그는 게 맞지만 몸은 그렇지 않다). */
const FORGE_W = {
  balance: { hp:1.0, mp:1.0, dmg:1.0, army:1.0 },  // 균형 — 여태의 몸
  bone:    { hp:0.7, mp:1.3, dmg:0.9, army:2.0 },  // 머릿수: 상한과, 그걸 세울 마나
  flesh:   { hp:1.9, mp:0.9, dmg:1.4, army:0.8 },  // 자힐 몸: 두껍고 세게, 수는 적게
  wall:    { hp:1.7, mp:1.0, dmg:0.8, army:1.4 },  // 골렘 벽: 버티는 몸 + 벽 수
};
/** 트리 갈래가 몫에 **곱한다** — 찍은 쪽으로 몸이 따라간다. 안 찍었으면 1(안 건드림). */
const FORK_W = {
  legion: { army:1.30, mp:1.15 },                  // 군단 — 머릿수, 그리고 세울 마나
  elite:  { army:0.55, dmg:1.40, hp:1.20 },        // 소수 정예 — 수를 줄이고 하나를 세게
  fury:   { dmg:1.25, hp:0.90 },                   // 광포 — 주는 만큼 뺏는다(트리와 같은 결)
  stone:  { hp:1.25, dmg:0.90 },                   // 석화
  glut:   { army:1.15, hp:1.10 },                  // 탐식 — 시체를 몸으로
  pyro:   { dmg:1.25, mp:1.10 },                   // 불꽃 장례 — 터뜨리는 쪽
  drain:  { mp:1.30 },                             // 영혼 착취 — 마나 축
  haste:  { dmg:1.15, mp:1.10 },                   // 신속
};
const MP_FLOOR = 0.85;      // ★ 마나 바닥 — 위 주석의 「죽음 일곱이 전부 마나 0~6」
/** 지금 빌드가 각 축에 두는 몫. 편성 × (찍은 갈래들). */
export function forgeWeights() {
  const base = FORGE_W[doctrineId()] || FORGE_W[DOCTRINE_DEF];
  const w = { ...base };
  const tree = (META && META.tree) || {};
  for (const id in FORK_W) {
    if (!(tree[id] > 0)) continue;
    for (const k in FORK_W[id]) w[k] = (w[k] || 1) * FORK_W[id][k];
  }
  w.mp = Math.max(w.mp || 1, MP_FLOOR);
  return w;
}
function forgeReserve() {
  let r = 0;
  for (const k of GEAR_KEYS) { const nx = gearNext(k); if (nx !== null) r = Math.max(r, GEAR[k].cost[nx]); }
  return r;
}
/** 살 수 있는 만큼 산다(한 번에 `max` 개까지 — 후반에 금이 폭주해도 한 틱이 안 길어진다).
 *  돌려주는 값: 이번에 산 것의 키 목록(비면 아무것도 안 샀다).
 *  ★ 대장간(UPS)과 재련(reforge)을 **한 저울에** 올려 매번 제일 싼 것을 산다 — 둘 다 밑이
 *    1.55 라 저절로 번갈아 오르고, 재련이 무한 축이라 대장간이 다 차도 금이 계속 쓰인다.
 *    forgeReserve() 를 그대로 존중해 상점(손으로 사는 축) 몫은 남긴다. */
export function autoForge(max = 8) {
  const bought = [], keep = forgeReserve(), W = forgeWeights();
  for (let i = 0; i < max; i++) {
    /* ① 강화 넷 중 **몫 대비 제일 뒤처진** 것. 값이 아니라 «얼마나 밀렸나»로 고른다.
       같으면 싼 쪽(결정적이어야 검수기의 A/B 가 성립한다 — 난수 한 톨 없다). */
    let pick = null, lo = Infinity, reforge = false, need = Infinity;
    for (const k in UPS) {
      const n = ((META.up[k] | 0) + 1) / (W[k] || 1), c = upCost(k);
      if (n < need || (n === need && c < lo)) { need = n; lo = c; pick = k; reforge = false; }
    }
    /* ② 재련은 **여태와 같은 자리** — 뒤처진 축의 값보다 싸면 그쪽을 산다.
       무한 축이라 여기가 굶으면 후반에 금이 갈 데가 없다. */
    for (const k of GEAR_KEYS) { const c = reforgeCost(k); if (c < lo) { lo = c; pick = k; reforge = true;  } }
    if (!pick || META.gold - lo < keep) break;
    META.gold -= lo;
    if (reforge) META.plus[pick] = (META.plus[pick] | 0) + 1;
    else         META.up[pick]   = (META.up[pick]   | 0) + 1;
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
/* ══ 레벨이 쥔 셋을 가른다 ══ (ROADMAP 4막 · 병수님 2026-08-15 17:06 「레벨이 너무 빨리 오른다」)
   「빨리 오른다」를 **값으로** 눕히려던 여덟 팔이 전부 실패했다(요구 1.7·1.9 · 벌이 깊이
   0.5·0 · 관문 한 벌까지). 매번 노린 것(12분 Lv 15 아래)은 됐는데 **최고층이 같은 만큼
   죽었다**(72% · 64%, 문턱 80%). 까닭은 레벨 하나가 셋을 쥐고 있어서다:
     ① 스킬 점수 `spTotal` — 사람이 **고르는** 몫(모자라야 빌드가 된다)
     ② 군세 상한 `armyBase` · ③ 체력·마나 `bodyHp`·`mpMaxOf` — **깊이를 미는** 몫
   ②③을 층에 매달면 레벨을 늦춰도 깊이가 안 죽는다 — ①만 레벨에 남긴다.
   ★ 매다는 값은 `META.deepest`(최고 도달 층)다. `S.floor` 를 쓰면 층을 되짚어(위로
     올라감) 내려올 때 상한·체력이 **줄어 판이 무너진다** — deepest 는 안 줄어드는 유일한 값.
   ★ 얕은 층은 기본값이 커서 한 톨도 안 바뀐다(1층: (D-1)*8=0, 예전 Lv.1 과 같다).
   SPLIT = 1 이면 ②③을 층에 매단다. **0 이면 지금 그대로** — 검수기가 `__SPLIT` 로 쓴다
   (다른 손잡이 `__ARMY_WALL`·`__XP_K`·`__GATE_S` 와 같은 꼴). */
export const SPLIT_DEF = 0;
const SPLIT_OF = () => (typeof globalThis !== "undefined" && globalThis.__SPLIT != null)
  ? +globalThis.__SPLIT : SPLIT_DEF;
/** 깊이를 미는 몫이 매달리는 층수 — 되짚어도 안 줄어드는 최고 도달 층. */
const splitLv = () => SPLIT_OF() ? Math.max(1, META.deepest | 0) : META.lv;
/** 맨몸 — 아무것도 안 키운 몸. 바닥(층의 격)과 견주는 것도, 「몇 배 키웠나」의 분모도 이것이다. */
const bodyBase = () => 100 + (splitLv() - 1) * 8;
/** 키운 것으로 쌓는 체력 — 얕은 층에서는 이쪽이 크다. */
const bodyHp = () => bodyBase() + (META.up.hp | 0) * 25
                   + gearVal("robe") + gearVal("shield") + afSum("hp");   // 방패 = 최대 체력(망토와 같은 축)
/* ══ 키운 몫은 **바닥 위에도 얹힌다** ══ (2026-08-21 · ROADMAP C-㉡)
   예전 식은 `max(bodyHp, 층피해×5)` 였다. 바닥을 깔아 준다는 뜻은 옳았는데, 깊이가
   붙으면 뒤엣것이 이겨서 **강화가 키운 것이 통째로 무시**됐다 — 생명력 강화는
   맨몸 14층 · 계급 40 이어도 29층부터 «없는 축»이 됐고(20분 판은 75~79층까지 간다),
   그 죽은 축이 강화 금의 23~28% 를 먹고 있었다([[knob-that-does-nothing]]).
   그래서 **바닥은 바닥으로 되돌리고, 키운 몫은 «맨몸 대비 배수»로 그 위에 곱한다.**
     · **맨몸(계급 0 · 맨손)은 어느 층에서도 한 톨도 안 바뀐다** — 배수가 1 이라
       바닥이 그대로 나온다. 바닥이 맨몸보다 작은 얕은 층도 `bodyBase × 배수 = bodyHp`
       라 예전 값과 완전히 같다(계급 20 이면 1~10층 600 그대로).
     · 바뀌는 자리는 **바닥이 이기기 시작하는 층부터**다(계급 20 · 20층 600 → 1,860).
     · 깊은 층에서는 「다섯 대」가 「다섯 대 × 키운 배수」가 된다 — 손잡이가 깊이와
       **무관하게** 같은 일을 한다.
     · 장비·부적의 체력도 같은 배수를 탄다(예전엔 그것들도 같이 먹혔다). */
/* HPGROW = 1 이면 위의 꼴(바닥 × 키운 배수). **0 이면 예전 그대로** `max(몸, 바닥)` —
   검수기가 `__HPGROW` 로 쓴다(다른 손잡이 `__SPLIT`·`__ARMY_WALL` 과 같은 꼴).
   D 에서 「깊은 층이 통째로 세진 것」이 20분 판의 죽음·최고층을 어디로 옮겼는지
   재려면 **되돌린 팔**이 있어야 한다 — 없으면 견줄 것이 없다.
   ★ **2 = 바닥만 grow 를 안 탄다**(2026-08-22 · D-7). 0 으로 재 보니 깊은 띠에 처음으로
     위험이 섰지만(절반아래 0초 → 65~87초) **앞 6분 죽음이 52 → 72 로 같이 늘었다.**
     늘어난 자리는 바닥이 아니라 **천장**이다 — 0 은 `floorDmg×EARLY_HITS` 천장에서도
     grow 를 뺏어 초반 여유를 한 번 더 깎는다(1-9층 손놓고 죽는데 66초 → 45초).
     2 는 **천장은 그대로 grow 를 태우고 바닥만 안 태운다** = 초반은 한 톨도 안 바뀌고
     깊은 층만 움직인다([[knob-that-does-nothing]] 을 안 밟는 쪽으로 쪼갠 것). */
/* ★ **2 로 켰다(2026-08-22 01:4x · D-7 · 재고 나서 정했다).** 20분 × 씨앗 여섯 × 편성 둘:
     깊은 띠 절반아래 **0초 → 65·74초**(처음 생겼다) · 초당 최대체력의 0.23% → **0.50%** ·
     그러면서 **앞 6분은 바이트까지 그대로**(1-9층 받은 피해 7544 동일 · 죽음 61/앞 52/뒤 9 동일) ·
     최고층 중앙 72 그대로. 0(되돌림)은 같은 깊이를 사는 대신 앞 6분 죽음을 52 → 72 로 물렸다. */
/* ★ **3 으로 옮겼다(2026-08-22 04:1x · D-11 · 재고 나서 정했다).** 2 는 바닥에서 grow 를
     통째로 뺀 탓에 **깊은 층에 「내가 만든 몸」이 없었다**(45층 죽음 열여덟이 최대체력
     11340 «하나»). 3 은 바닥이 grow 의 일부(`FLOOR_P_DEF` = 0.5)만 타게 해 몸을 되돌리고,
     그러면서 위협은 `GATE_VOW_LIFT` 가 **같은 배수**로 따라 올려 몫을 지킨다.
     셋을 한꺼번에 켠 팔(p=0.5 · q=1.0)을 20분 × 씨앗 여섯 × 편성 둘로 재니 네 조건 모두 통과 —
     자세한 표는 ROADMAP 「D-12」 절. 셋 중 하나만 켜면 배타에 걸린다(몸 아니면 위험). */
export const HPGROW_DEF = 3;
const HPGROW_OF = () => (typeof globalThis !== "undefined" && globalThis.__HPGROW != null)
  ? +globalThis.__HPGROW : HPGROW_DEF;
const hpGrow = () => bodyHp() / bodyBase();
/* ══ 초반에만 걸리는 문 — 몸의 여유가 «스물다섯 대»였다 ══ (2026-08-21 · ROADMAP H-2)
   바닥(`floorDmg × SURVIVE_HITS`)은 **깊은 층**을 지키는 장치라 1층에서는 20 밖에 안 되고,
   그 자리는 맨몸 100 이 이긴다 — 그래서 1층이 **25대**, 5층 20대다(설계값 다섯 대에는
   12층쯤 가야 닿는다). D2 의 Lv.1 네크로는 여덟~아홉 대다.
   `bodyBase` 를 낮추거나 `floorDmg` 밑값을 올리는 길은 **모든 깊이**를 흔든다(전자는
   `hpGrow` 의 분모, 후자는 소환수가 맞는 피해까지). 그래서 **천장을 따로 낸다** —
   `floorDmg(f) × EARLY_HITS`. 이 천장은 층을 따라 저절로 자라서 바닥과 만나는 순간
   **스스로 사라진다**(9 로 두면 1~8층에만 걸리고 9층부터는 한 톨도 안 다르다).
   ★ 천장도 **키운 배수(`hpGrow`)를 탄다** — 강화·장비를 얹으면 초반에도 더 버틴다.
     여유를 깎는 것이지 성장을 지우는 것이 아니다([[knob-that-does-nothing]]).
   0 이면 문 없음(옛 그대로) — 검수기가 `__EARLY_HITS` 로 쓴다.
   ★ **9 로 켰다(2026-08-21 21:3x · 재고 나서 정했다).** 3분 × 씨앗 1·3·7 네 팔:
     45초 버틸대수 **25 → 9**(설계값 · D2 Lv.1 네크로와 같은 자리) · 3분 최저체력비
     0.2 → **0.04** · 그런데 3분 **층은 4.33 → 5.33(옛의 123%)** 이고 마나마름 30 → 31%
     로 **한 자리에 머물지 않는다** — 위험이 늘었을 뿐 «멎음»이 아니다.
     7 은 넘어간다(층 54% · 마나마름 42% · 죽음 3.67) — H-1 의 상한 3 과 같은 멎음이다. */
export const EARLY_HITS_DEF = 9;
const EARLY_HITS_OF = () => (typeof globalThis !== "undefined" && globalThis.__EARLY_HITS != null)
  ? +globalThis.__EARLY_HITS : EARLY_HITS_DEF;
/* ══ 깊은 층에는 «내가 만든 몸»이 없다 ══ (2026-08-22 · ROADMAP D ㉠·㉡ · `6872185`)
   HPGROW=2 는 바닥에서 grow 를 뺐다 — 그래서 바닥이 이기는 깊이부터 `hpMaxOf` 가
   **`floorDmg × 5` 하나**가 된다. 실측(`wall_probe` · 열두 판 83죽음): 45층 죽음
   **열여덟이 최대체력 11340 하나로 전부 같았다**(=2268×5). 씨앗 여섯도 편성 둘도
   레벨도 안 가린다 — 20분 판이 77층까지 가니 **판의 뒤 4분의 3 에서 생명력은 없는 축**이다
   ([[floor-erases-the-ramp]] · [[knob-that-does-nothing]]).
   그런데 바닥에 grow 를 통째로 얹는 옛 꼴(HPGROW=1)은 반대쪽으로 샌다 — 60층에서
   「다섯 대」가 「서른 대」가 되어 D 가 겨우 세운 깊은 층 위험이 도로 없어진다.
   ★ 그래서 **바닥이 grow 의 «일부»만 타게** 한다: `floor × grow^p`.
     · p = 0 이면 HPGROW=2 와 **한 톨도 안 다르고**, p = 1 이면 옛 HPGROW=1 과 같다
       (mode 1 은 `max(bodyBase, floor) × grow` = `max(bodyHp, floor × grow)`).
     · 곧 이 손잡이 하나가 두 끝을 잇는다 — 값은 **재고 나서** 정한다.
     · 맨몸(계급 0 · 맨손)은 grow = 1 이라 p 가 몇이든 한 톨도 안 바뀐다. */
export const FLOOR_P_DEF = 0.5;
const FLOOR_P_OF = () => (typeof globalThis !== "undefined" && globalThis.__FLOOR_P != null)
  ? +globalThis.__FLOOR_P : FLOOR_P_DEF;
/* p 를 밖에서 넣어 볼 수 있게 갈라 둔다 — `hpFloorLift` 가 «p=0 이었다면» 을 물어야 한다. */
const hpMaxWith = (pOver) => {
  const f = S.floor | 0, floor = floorDmg(f) * SURVIVE_HITS, eh = EARLY_HITS_OF();
  const hg = HPGROW_OF(), grow = hg ? hpGrow() : 1;
  if (hg === 3) {                       // 바닥이 grow 의 일부(p)만 탄다 · 천장은 그대로
    let v = Math.max(bodyHp(), floor * Math.pow(grow, pOver != null ? pOver : FLOOR_P_OF()));
    if (eh > 0) v = Math.min(v, floorDmg(f) * eh * grow);
    return Math.round(v);
  }
  if (hg === 2) {                       // 바닥은 안전망으로만 · 천장은 grow 를 탄다
    let v = Math.max(bodyHp(), floor);
    if (eh > 0) v = Math.min(v, floorDmg(f) * eh * grow);
    return Math.round(v);
  }
  let base = hg ? Math.max(bodyBase(), floor) : Math.max(bodyHp(), floor);
  if (eh > 0) base = Math.min(base, floorDmg(f) * eh);
  return Math.round(base * grow);
};
export const hpMaxOf = () => hpMaxWith();
/* ══ **이 수정이 내 몸을 몇 배로 부풀렸는가** — 위협이 그만큼 따라 커지라고 있는 자다 ══
   (2026-08-22 · ROADMAP D-11) `__FLOOR_P` 로 깊은 층에 「내가 만든 몸」을 되돌리면
   몸만 커지고 위협은 제자리라 **45·65층 죽음이 통째로 0** 이 됐다(D-10). 위협에 이 배수를
   그대로 곱하면 두 끝이 같이 선다 — 몸은 보이고, 몫은 그대로다.
     · **p = 0 이면 어느 층에서도 정확히 1** 이다(지금 기본값) — 곱해도 한 톨도 안 바뀐다.
     · 얕은 층은 p 가 몇이든 1 이다(거기선 바닥이 안 이겨서 `__FLOOR_P` 가 안 닿는다) —
       그래서 이 자는 **앞 6분을 건드릴 수가 없다**(「몫 바닥」 꼴이 진 자리가 여기다). */
export const hpFloorLift = () => { const a = hpMaxWith(0); return a > 0 ? hpMaxWith() / a : 1; };
export const mpMaxOf  = () => 40  + (META.up.mp | 0) * 8  + (splitLv() - 1) * 3 + gearVal("helm");   // 투구 = 최대 마나
/* ══ 초반의 벽 · 막는 것은 상한이 아니라 **마나**였다 ══
   ARMY_WALL(그 층 적 수를 군세 상한의 바닥으로) 은 상한을 3 → 6~7 로 올렸는데도
   죽은 층 중앙값을 5 에서 **한 톨도 못 옮겼다**(2026-08-14 13:38 · 네 팔 전부).
   진 이유가 그 판의 죽는 순간 사진에 그대로 있다 — 네 팔 스무 번의 죽음이 전부:
     **시체 26~32(넉넉) · 상한 6~7(넉넉) · 그런데 군세는 0~2 · 마나 0~5 / 43~54**
   자리를 열어 줘도 **채울 마나가 없다.** 해골 하나가 6 인데 회복이 2.2/초라
   한 마리에 2.7초 · 상한까지 채우는 데 16초다. 관문 주인은 그 사이에 벽을 지운다.
   ★ 그래서 이미 세 번 통한 방법을 그대로 쓴다(「몸도 층을 따라 큰다」 ·
     「주인 체력을 내 군대로 매긴다」 · 「군세 바닥을 그 층의 적 수에」):
     **바닥을 「초당 소환 몇 마리를 감당하는가」에 둔다.**
     max() 라 부적·강화로 회복이 그 바닥을 넘어서면 **저절로 손을 뗀다** —
     초반만 건드리고 중반 이후는 한 톨도 안 달라진다(조건 ② 보호).
   MANA_WALL = 초당 되살리기 몇 번 몫을 바닥으로 삼는가. **0 이면 손 안 댐** —
   검수기가 `globalThis.__MANA_WALL` 로 쓴다. */
export const MANA_WALL_DEF = 0.75;
const MANA_WALL_OF = () => (typeof globalThis !== "undefined" && globalThis.__MANA_WALL != null)
  ? +globalThis.__MANA_WALL : MANA_WALL_DEF;
const RAISE_MP = ALL_SKILLS.find(s => s.id === "raise").mp;
/** 마나가 차는 속도 — 부적이 올린다. */
export const mpRegenOf = () => {
  const base = 2.2 + (META.up.mp | 0) * 0.25 + gearVal("charm") + afSum("mp");
  const w = MANA_WALL_OF();
  return w ? Math.max(base, RAISE_MP * w) : base;
};
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
                            * (1 + (META.up.dmg | 0) * 0.08 + (META.lv - 1) * 0.03 + gearVal("glove"))   // 장갑 = 소환수 피해(UPS.dmg 자리)
                            * (1 + rank("bone") * 0.10)
                            * gateFactor();
/* dmgMulOf 는 **둘 다에게 걸리는 바탕**이다(레벨·강화·뼈 트리). 옵션은 그 위에서
   갈라진다 — 안 그러면 「본인 피해」가 소환수까지 올려서 이름이 거짓말이 된다. */
export const selfMulOf   = () => 1 + afSum("dmg") / 100;
/** 소환수 피해는 본인과 **다른 옵션**이 올린다 — 빌드가 갈리는 자리다. */
/* ★ 새 칸(골수·광포·석화)도 **여기로 들어온다** — 소환수 피해를 올리는 자리는
   이 한 줄뿐이라야 한다. 석화는 「체력을 주고 피해를 뺏는」 갈래라 **음수**로 들어간다.
   바닥을 0.2 로 막는다: 석화만 다섯 단계면 -0.20 이라 아직 양수지만, 뒷날 값이
   바뀌어도 0 이나 음수로 뒤집혀 소환수가 **적을 치료하는** 일은 없어야 한다. */
export const minionMulOf = () => Math.max(0.2,
                                  1 + afSum("mdmg") / 100 + (hasUnique("lonely") ? LONELY_POW : 0)
                                + rank("elite") * ELITE_POW
                                + rank("marrow") * 0.08 + rank("fury") * 0.12 - rank("stone") * 0.04);
export const goldMulOf   = () => 1 + afSum("gold") / 100 + gearVal("ring");   // 반지 = 금 획득
/** ③ 상태창이 읽는 **합친 피해 배수.** 판에서 본인은 `dmgMulOf()×selfMulOf()`,
 *  소환수는 `dmgMulOf()×minionMulOf()` 로 맞으므로(battle.js), 화면이 그 식을 다시
 *  쓰지 않게 여기 한 곳에 모은다 — 같은 식이 두 곳에 있으면 언젠가 갈라진다. */
export const selfDmgMul   = () => dmgMulOf() * selfMulOf();
export const minionDmgMul = () => dmgMulOf() * minionMulOf();
/* ★ 군세 상한은 **자라야 보인다.** 예전엔 Lv.1 부터 6 이라 10초 만에 꽉 차고
   그 뒤로는 아무 일도 안 일어났다 — 방치형에서 제일 눈에 띄는 성장이 시작부터
   끝나 있었던 셈이다. 셋으로 시작해 세 레벨마다 하나씩, Lv.10 에 예전의 6 이 된다
   (그 뒤는 강화·트리·옵션이 이어받으므로 중반 이후는 그대로다). */
/* ══ 초반의 벽 ══ 60분 곡선(2026-08-14 12:35)에서 씨앗 셋이 **전부** 층 5 · 분 2 와 분 3 에
   두 번씩 죽었다. 씨앗이 다른데 층·분이 겹치면 그건 확률이 아니라 **산수**다 —
   죽는 순간의 판이 셋 다 같은 모양이었다: **군세 상한 3 인데 적이 6~8**(floorN(5)=8).
   벽이 셋인데 적이 여덟이라 벽을 못 세우고 **전부 네크로에게 들어온다.**
   깊은 층의 「관문이 수법을 못 쓴다」와 정반대의, 그러나 같은 종류의 구조 결함이다.
   ★ 레벨로만 자라는 상한은 그 자리에 **닿지 못한다** — 분 2·3 은 아직 Lv.1~4 다.
     그래서 이미 두 번 통한 방법을 그대로 쓴다(「몸도 층을 따라 큰다」 ·
     「주인 체력을 내 군대로 매긴다」): **바닥을 그 층의 적 수에 둔다.**
     위는 예전의 6 으로 막으므로 이 손잡이는 **초반을 앞당길 뿐 천장을 안 올린다** —
     Lv.10 뒤로는 레벨 쪽이 크거나 같아 저절로 손을 뗀다(깊은 층은 한 톨도 안 달라진다).
   ARMY_WALL = 그 층 적 수의 몇 곱을 바닥으로 삼는가. **0 이면 손 안 댐**(예전 그대로) —
   검수기가 `globalThis.__ARMY_WALL` 로 쓴다.
   ★★ **끄기로 했다 — 이 손잡이가 바로 위 「자라야 보인다」를 지우고 있었다**
     (2026-08-21 · 병수님 「캐릭터가 초반부터 너무 쎔」). floorN(1)=14 라
     `min(6, round(14×0.5))` 가 **1층에서 이미 6** 이다. 그래서 「셋으로 시작해 Lv.10 에 6」
     이라 적어 둔 성장 축이 **한 번도 안 돌았다**([[knob-that-does-nothing]]) — 실측으로도
     판을 연 지 15초에 상한 6·군세 2, 45초까지 맞은 횟수 1 이다(tools/start_probe.mjs).
     그러면서 원래 노린 것(죽은 층 중앙값 5)은 **네 팔 전부 실패**했다(위 문단) —
     값을 치른 자리는 초반의 손맛인데 산 것은 없다. 게다가 그때는 죽으면 1층부터
     되짚었지만 지금은 **표식(startFloor)** 이 있어 죽음의 값도 그때보다 싸다.
   ★★★ **끄지는 않았다 — 0 은 판을 멈춰 세웠다.** 다섯 팔을 3분 × 씨앗 셋으로 재 보니
     상한 3 과 4 사이에 벼랑이 있다(tools/start_probe.mjs):
       벽 0 / 0.2 (1층 상한 3) — 마나마름 **50%** · 3분에 **3.7층** · 죽음 1.7
       벽 0.25   (1층 상한 4) — 마나마름 13~30% · 3분에 **4.3~6층** · 죽음 1.3
       벽 0.5(옛)(1층 상한 6) — 마나마름 5~22% · 3분에 **8.7층** · 죽음 **0**
     상한이 셋이면 벽이 곧 지워지고 남은 마나를 전부 되세우는 데 쓴다 — 위험이 아니라
     **멎음**이다([[floor-far-from-threshold]] 의 반대편). 그래서 **0.25** 로 낮춘다:
     1층 상한 4 → 12층에 6. 위험은 생기고(최저 체력비 0.51 → **0.20** · 죽음 0 → 1.3)
     판은 계속 굴러간다. */
export const ARMY_WALL_DEF = 0.25;
const ARMY_WALL_OF = () => (typeof globalThis !== "undefined" && globalThis.__ARMY_WALL != null)
  ? +globalThis.__ARMY_WALL : ARMY_WALL_DEF;
/* ══ 자라는 축의 «시작»과 «걸음» ══ 벽을 걷어도 시작이 3 이면 첫 층에 벌써 절반이다.
   D2 의 네크로는 해골 **하나**로 시작해 점을 찍어 늘린다 — 그 결로 **걸음을 좁힌다**
   (셋에서 **두 층마다** 하나 · deepest 9 에 예전의 6. 예전은 세 층마다였다).
   ★ 시작을 2 로 더 낮춘 팔도 재 봤는데 **벽 쪽 벼랑에 걸린다**(아래 ★★★) — 3 이다.
   ★ **천장(6)은 한 톨도 안 건드린다** — 중반 이후는 예전과 같은 판이어야
     무엇이 무엇을 움직였는지 읽을 수 있다. 검수기가 `__ARMY_START`·`__ARMY_STEP` 으로
     옛 값(3·3)을 도로 끼워 A/B 한다. */
export const ARMY_START_DEF = 3, ARMY_STEP_DEF = 2;
export const armyBase = () => {
  const st = globalThis.__ARMY_START != null ? +globalThis.__ARMY_START : ARMY_START_DEF;
  const sp = globalThis.__ARMY_STEP  != null ? +globalThis.__ARMY_STEP  : ARMY_STEP_DEF;
  const lv = Math.min(6, st + Math.floor((splitLv() - 1) / sp));   // 갈랐으면 층(deepest), 아니면 레벨
  const w  = ARMY_WALL_OF();
  return w ? Math.max(lv, Math.min(6, Math.round(floorN(S.floor) * w))) : lv;
};
/* ══ 「소수 정예」의 값 ══ (ROADMAP B · 2026-08-18)
   끝 조건이 수로 적혀 있었다 — **20분 판에서 군세 40 대신 12~16.**
   그래서 상한을 **빼기가 아니라 곱하기**로 깎는다: 빼기는 초반(상한 3~6)에서 군세를
   0 으로 만들고 후반(40)에서는 아무 일도 안 한다.
   ★ 세기 쪽은 **머릿수가 준 만큼**을 되갚되 조금 모자라게 둔다. 한 대의 총합은 살짝
     밑이고, 대신 개체가 1.9 배 두꺼워 **오래 서 있는다** — 「소수의 하수인이지만
     하수인 자체가 강해지는」(병수님)이 뜻하는 결이 이쪽이다.
   ★★ **곱을 두 번 골랐다 — 첫 번째는 틀린 자로 골랐다**(2026-08-18 05:3x).
     처음엔 「군세 40」을 넣고 되짚어 0.70³=0.343 → 14 를 얻었다. 그런데 그 40 은
     **어디서도 안 나오는 수**였다 — 20분 판을 네 씨앗으로 굴려 보니 뒤 10분의 군세는
     **31.3** 이다(그리고 군세는 내내 상한에 붙어 있다: 31.3/31.3). 40 으로 맞춘 곱을
     31.3 에 걸었으니 실제로는 **10.2 기** — 끝 조건 12~16 아래로 샜다.
     끝 조건이 「20분 판」인데 고를 때 쓴 분모는 「계산상 상한」이었던 것이다
     ([[threshold-and-ruler-must-match]]).
     그래서 **실측 31.3 을 넣고 다시 되짚었다**: 0.75³ → 13.2 · **0.77³ = 0.457 → 14.3**
     (한가운데) · 0.80³ → 16.0(끝). 0.77 이다.
   ★ 이 수는 `tools/ab_fork.sh` 가 20분 × 씨앗 넷으로 다시 잰다 — ①선 머릿수가
     12~16 인지 ②정예가 군단보다 **못 살지도 낫지도 않은지**(둘 다 갈래를 망친다). */
export const ELITE_CUT = 0.77;   // 단계마다 군세 상한 ×0.77 (3단계 = 0.457)
export const ELITE_POW = 0.55;   // 단계마다 소환수 피해 +55%
export const ELITE_HP  = 0.30;   // 단계마다 소환수 체력 +30%
export const armyCap  = () => {
  const c = armyBase() + (META.up.army | 0) + rank("legion") + afSum("army");
  /* 상한을 깎는 것이 **둘(정예·고독한 왕관)** 이라 곱해서 겹친다 — 어느 쪽도 상대를
     지우지 않는다. 바닥은 1 — 0 이 되면 판에 아무도 안 서서 게임이 멈춘다. */
  const cut = Math.pow(ELITE_CUT, rank("elite")) * (hasUnique("lonely") ? 0.5 : 1);
  return cut === 1 ? c : Math.max(1, Math.ceil(c * cut));
};
/* 지배한 놈은 **상한 밖에 선다.** 처음엔 상한 안에 넣었더니 자동 소환이 자리를
   먼저 채워서 90초를 굴려도 한 마리밖에 안 섰다 — 찍고도 안 보이면 없는 것과 같다.
   따로 넷까지 두면 층마다 「이번엔 무엇을 부리나」가 눈에 보인다. */
export const thrallCap = () => rank("dark") * 4;
/** 상한에 세는 것은 **내가 소환한 것만.** 지배한 놈까지 세면 자리를 빼앗아
 *  「지배할수록 해골을 못 세운다」가 된다 — 상을 벌로 만들면 안 된다. */
export const armyN    = () => S.minions.reduce((a, u) => a + (u.own ? 0 : 1), 0);
export const thrallN  = () => S.minions.reduce((a, u) => a + (u.own ? 1 : 0), 0);

/* ══ 상한 위는 시체로 산다 ══ (㉡ __CAP_OVER) 상한 «값»은 이미 두 팔이 졌다(first·depth,
   ROADMAP ⑧-d): +15% 올렸더니 군세는 +8% 만 늘고 마나부족이 통만 옮겨 앉았으며 최고층은
   되레 깎였다. 그래서 이건 값이 아니라 **출구**다 — armyCap() 은 한 톨도 안 건드리고, 그 위로
   최대 __CAP_OVER 기까지 더 세우되 **초과분은 비싸다**(시체 3배·마나 2배 — battle.js cast()).
   **0 이면 손 안 댐**(예전 그대로) — 검수기가 globalThis.__CAP_OVER 로 쓴다(ARMY_WALL 과 같은 길). */
export const CAP_OVER_DEF = 0;
export const CAP_OVER_OF = () => (typeof globalThis !== "undefined" && globalThis.__CAP_OVER != null)
  ? +globalThis.__CAP_OVER : CAP_OVER_DEF;
/** 초과분까지 포함한 **실효 상한**. armyCap() 자체는 안 바뀐다 — 이건 「어디까지 세울 수 있나」다. */
export const armyCapEff = () => armyCap() + CAP_OVER_OF();

/* ══ 꽉 차면 세기로 간다 ══ (㉢ __CAP_MERGE) 자리가 없어서만 못 세울 때 소환을 버리지 않고
   이미 선 **같은 종 중 제일 약한 하나를 한 단계 키운다**(hp·hpMax·dmg × __CAP_MERGE, 한
   개체당 최대 MERGE_MAX 단계). 자원(시체·마나)·재사용은 평소 소환과 똑같이 쓴다 — 자리가
   없어도 자원이 계속 돈다(「상한참」을 통째로 없애는 팔). **0(또는 1 이하)이면 손 안 댐.**
   battle.js cast() 가 쓴다 — 검수기가 globalThis.__CAP_MERGE 로 켠다. */
/* (08-17 11:3x) **켰다 — 0 → 1.25.** 세 팔(㉢ merge · ㉤ burn · ㉥ spill)을 끝까지 돌려 본
   뒤의 판정이다. 이 항목의 끝 조건(상한참 30% 아래 · 최고층 합 씨앗 폭 ±6 안 · qa_all)을
   merge 는 **17% · −6 · 통과**로 넘는다. 못 켜게 막고 있던 ④(재사용이 대신 커진다)는
   ㉥ 이 그 손을 실제로 써 보고 **깊이가 오히려 −11** 인 것으로 「재사용도 벽이 아니다」가
   되어 없어졌다. 되돌리려면 이 한 줄을 0 으로. */
export const CAP_MERGE_DEF = 1.25;
export const CAP_MERGE_OF = () => (typeof globalThis !== "undefined" && globalThis.__CAP_MERGE != null)
  ? +globalThis.__CAP_MERGE : CAP_MERGE_DEF;
export const MERGE_MAX = 4;

/* ══ 자리를 내준다 ══ (㉧ __SLOT_YIELD · 기본 0 = 꺼짐) 「골렘이 왜 안 서나」를 잰 자
   (tools/ab_golem.sh)가 남긴 마지막 벽이다 — 나무를 Lv.16 → Lv.10 으로 당겨 해금을 85초
   앞당겼더니 **미해금에서 뺀 15% 를 꽉참이 고스란히 받아먹었다**(33→40%). 즉 벽은 하나가
   아니라 **사슬**이고, 남은 고리는 「열렸을 땐 이미 해골이 칸을 다 차지했다」는 것이다.
   그래서 값이 아니라 **채우는 차례**를 고친다: 편성이 골렘을 더 원하는데 자리가 없으면
   **제일 약한 해골 하나를 물러나게 해** 그 칸을 내준다(㉢ merge 는 같은 종만 키우므로
   골렘이 0 기일 때는 아무 일도 못 한다 — 이 팔이 그 빈 자리를 연다).
   ★ 물러난 해골은 **시체를 안 남긴다** — 남기면 그 시체로 골렘을 세우는 셈이라
     「차례를 고쳤다」가 아니라 「자원을 얹었다」가 된다(재는 것이 흐려진다).
   ★ 0 = 손 안 댐 · 1 = 켬. 켜도 **몇 번이고 물리지는 않는다** — 부족한 기수(want − 선 것)와
     골렘 재사용(6초)이 스스로 상한이다. 골렘이 다 서면 그 자리에서 멈춘다.
   battle.js slotYield() 가 쓴다 — 검수기가 globalThis.__SLOT_YIELD 로 켠다. */
export const SLOT_YIELD_DEF = 0;
export const SLOT_YIELD_OF = () => (typeof globalThis !== "undefined" && globalThis.__SLOT_YIELD != null)
  ? +globalThis.__SLOT_YIELD : SLOT_YIELD_DEF;

/* ══ 기다림 대신 자원으로 ══ (㉣ __RAISE_BATCH) 「재사용」이 막는 시간을 **값으로 깎지 않고**
   한 손짓에 여럿을 세워 없앤다 — 재사용 초는 한 톨도 안 건드리고, 이어 세우는 몸마다
   시체·마나를 **평소대로 그대로** 낸다. 그래서 벽이 「기다림」에서 **「자원」**으로 옮겨
   간다(이 게임의 뜻: 시체가 자원). ⑧-d 에서 재사용을 **값으로** 깎는 팔은 이미 졌으므로
   여기서는 값을 안 쓴다. **1 이하이면 손 안 댐**(예전과 비트까지 같다).
   battle.js cast() 가 쓴다 — 검수기가 globalThis.__RAISE_BATCH 로 켠다. */
export const RAISE_BATCH_DEF = 1;
export const RAISE_BATCH_OF = () => (typeof globalThis !== "undefined" && globalThis.__RAISE_BATCH != null)
  ? +globalThis.__RAISE_BATCH : RAISE_BATCH_DEF;

/* ══ 막힌 결에서 다른 결로 샌다 ══ (㉥ __RAISE_SPILL) 「재사용」이 막는 시간의 **절반은
   손이 노는 시간이었다.** S.cd 는 **스킬마다 따로**인데(해골 1.2초 · 구울 2.0초 · 골렘 6.0초)
   자동 진행(main.js auto)은 편성 몫을 채우고 나면 **오직 해골만** 두드린다 — 그래서 해골이
   쿨인 동안 구울 손이 비어 있어도 안 쓴다.
   ★ **재 보고 낸 팔이다**(08-17 11:1x · 검수기 `재사용속`): merge 판에서 「재사용」인 초 중
     **구울을 쓸 수 있었던 초가 42~51%** 였다(골렘은 2~6% — 마나 30·쿨 6초라 원래 드물다).
     판 전체로 치면 약 29% 다. base 판은 14~24%(판 전체 7%) — 즉 **상한을 풀수록 이 손이
     더 논다.** ⑧-h 가 좁힌 물음 「재사용 61% 는 진짜 벽인가」의 답이 여기 있다: 절반은
     벽이 아니라 **안 쓴 손**이다.
   ★ 값을 한 톨도 안 만진다 — 재사용 초·마나·시체·편성 몫 전부 그대로다. 바뀌는 것은
     **해골이 제 재사용에만 막혔을 때 누가 그 자리를 채우는가** 뿐이다(㉣ 이 «같은 손에
     같은 일을 더» 시켜 마나를 말려 죽인 것과 반대로, 여기서는 **다른 손**에 준다).
   **0(꺼짐)이면 손 안 댐** — auto() 에서 && 가 앞에서 끊어 cast 를 아예 안 부른다. */
export const RAISE_SPILL_DEF = 0;
export const RAISE_SPILL_OF = () => (typeof globalThis !== "undefined" && globalThis.__RAISE_SPILL != null)
  ? +globalThis.__RAISE_SPILL : RAISE_SPILL_DEF;

/* ══ 자리가 빈 만큼 손이 빨라진다 ══ (⑨ __RAISE_HASTE) ⑧ 이 「벽은 화력이 아니라 **층당
   초**」로 닫히면서 제일 비싼 띠가 **1~10층**(판의 41% · 층당 14.8초)으로 나왔다. 그 띠를
   3분 자로 다시 보니(08-17 13:0x · 씨앗3 · merge 켠 지금 판) 왜 비싼지가 한 줄이었다 —
   **뒷정리 79%** 인데 그 안은 때림 **71%**(다가감 24%)다. 곧 「걸어가느라」가 아니라
   **「때리는데 안 죽어서」**이고, 그 까닭은 그 시간 동안 **군세가 2.6기 / 상한 6.0**,
   자리가 빈 채로 있는 시간의 **61% 가 재사용**이기 때문이다(그 판의 「다른 손 있었음」은
   **0%** — 얕은 층에서는 구울·골렘이 아직 안 열려 ㉥ 의 길이 없다).
   ★ ⑧-d 의 진 팔(재사용을 **값으로** 깎기)과 다른 점은 **어디서 듣느냐**다. 그 팔은
     꽉 찬 판에서도 똑같이 깎아 깊은 층의 화력을 같이 올렸다. 이 팔은 **빈 자리에만**
     듣는다 — 꽉 차면 곱이 정확히 1 이라 깊은 층은 한 톨도 안 바뀌고, 죽어서 1층부터
     다시 세우는 그 구간(⑧-i 의 41%)에서만 손이 빨라진다.
   ★ 새 축을 안 만든다 — 이미 곱해지는 자리(`cdMul`) 옆에 곱 하나를 더할 뿐이고,
     소환 계열에만 붙는다(폭발·저주의 재사용은 그대로).
   **0 이면 손 안 댐** — 곱이 정확히 1 이라 예전과 비트까지 같다.
   battle.js castOnce() 가 쓴다 — 검수기가 globalThis.__RAISE_HASTE 로 켠다. */
export const RAISE_HASTE_DEF = 0;
export const RAISE_HASTE_OF = () => (typeof globalThis !== "undefined" && globalThis.__RAISE_HASTE != null)
  ? +globalThis.__RAISE_HASTE : RAISE_HASTE_DEF;
/** 소환 재사용에 곱하는 값. 꽉 차면 **1**(손 안 댐) · 텅 비면 `1-H`. 상한 아래로만 잰다
 *  (㉢ merge 로 실효 상한이 위로 열려 있어도 여기서는 armyCap() 을 쓴다 — 「빈 자리」의
 *  뜻은 여전히 정원이지 초과분이 아니다). 바닥 0.05 는 0 으로 나눠 «즉시 재소환»이
 *  되는 것을 막는 안전선이다. */
export const raiseHasteMul = () => {
  const h = RAISE_HASTE_OF();
  if (!(h > 0)) return 1;
  const empty = Math.max(0, Math.min(1, 1 - armyN() / Math.max(1, armyCap())));
  return Math.max(0.05, 1 - h * empty);
};

/* ══ 마른 마나에 문을 연다 ══ (㉤ __BURN_MANA) 「시체 태우기」(시체 4 → 마나)는 이 게임이
   이미 가진 **마나 쪽 구조 출구**인데, 자동 진행에서 열리는 조건이 **「시체가 넘칠 때」**
   뿐이었다(`S.corpses >= CORPSE_MAX*0.85` = 140 중 119구). 그래서 ㉣ 이 만든 판
   — 마나가 40% 를 막는데 시체는 46~72구로 «중간»인 판 — 에서는 **문이 닫혀 있었다.**
   벽이 마나인 자리에서 마나로 나가는 길이 안 열리면 그건 손잡이가 아니라 벽이다
   ([[knob-that-does-nothing]]).
   이 팔은 문턱을 **마나 쪽으로** 돌린다: 마나가 이 몫 아래로 마르면, 소환에 쓸 시체를
   BURN_KEEP 구 남겨 둘 수 있는 한 태운다. **값을 안 만진다** — 태우는 양도 얻는 마나도
   그대로고, 바뀌는 것은 「언제 열리는가」뿐이다.
   **0 이면 손 안 댐**(예전과 비트까지 같다 — && 가 앞에서 끊어 RNG 도 안 쓴다).
   main.js auto() 가 쓴다 — 검수기가 globalThis.__BURN_MANA 로 켠다. */
export const BURN_MANA_DEF = 0;
export const BURN_MANA_OF = () => (typeof globalThis !== "undefined" && globalThis.__BURN_MANA != null)
  ? +globalThis.__BURN_MANA : BURN_MANA_DEF;
/** 태우고도 소환에 남겨 두는 시체. 이 아래로는 마나가 말라도 안 태운다 —
 *  시체를 다 태워 군대를 못 세우면 「마나를 얻고 판을 잃는」 팔이 된다. */
export const BURN_KEEP = 12;


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
/* ══ **점이 남아돌면 무엇을 찍어도 같다** ══ (ROADMAP A-ⓐ · 2026-08-18)
   자로 재고 고쳤다(`node tools/tree_points.mjs`) — 고치기 전:

     레벨 |  점 | 쓸자리 | 남는점
       52 |  51 |     51 |      0     ← 여기서 트리가 **다 찬다**
       98 |  97 |     51 |     46     ← 20분 판의 절반이 갈 곳 없는 점

   Lv.52 에 나무가 만렙이니 20분 판의 뒤쪽 절반은 **성장이 아예 없다.** 그러니
   ③「스킬이 단순하다」는 낱말 수의 문제가 아니라 **고를 자리가 0** 이라는 뜻이었다.

   두 가지를 같이 한다 — 한쪽만 하면 병수님 말씀 중 하나를 어긴다:
     · **자리를 늘린다**(칸·단계) — 안 그러면 점이 계속 남는다
     · **갈래를 늘린다**(`excl`) — 「수가 아니라 질」(B). 단계만 올리면 그냥 숫자놀음이다
   갈래가 넷이 됐다: 군세(군단↔정예) · 군세 심화(광포↔석화) · 시체(탐식↔불꽃) ·
   주술(착취↔신속). **넷을 고르는 순서와 조합이 곧 빌드다.**

   ★ 새 칸은 **하나도 빠짐없이 이미 있는 식에 꽂았다**([[knob-that-does-nothing]]) —
     아래 「트리가 판에 미치는 값들」 한 곳에서 다 읽힌다. 새 손잡이를 만들고 아무도
     안 읽는 일이 이 리포에서 이미 두 번 났다.
   ★ 키가 자란다 — 칸이 늘면 창 밖으로 밀린다. `tools/tree_fit.mjs` 로 재고 CSS 를
     같이 줄였다(줄 간격·칸 크기). 재지 않고 늘리면 「연쇄 폭발 아래가 안 보인다」가
     그대로 재발한다. */
export const TREE = [
  { k:"army", n:"군 세", nodes:[
    { id:"bone",   n:"뼈의 힘",    max:8, lv:1,  d:"소환수 피해 +10%" },
    { id:"armor",  n:"뼈 갑주",    max:8, lv:3,  req:"bone",   d:"소환수 체력 +12%" },
    { id:"ghoul",  n:"구울 되살리기", max:1, lv:6,  req:"armor",  d:"구울 소환 해금 · 물어뜯을 때마다 체력 회복", big:1 },
    /* ★ **골렘과 군단의 차례를 바꿨다**(2026-08-17 · ROADMAP 「골렘 해금이 판의 절반을
       잡아먹는다」). 골렘은 `legion` 세 단계 뒤 Lv.16 에 있었고, 자동 진행에서 **396초에야**
       열렸다 — 12분 판의 **55% 를 골렘 없이 산다**는 뜻이고, 「골렘 벽」 편성이 원한 기수의
       33% 밖에 못 세운 제일 큰 까닭(미해금 60%)이 그것이었다.
       고친 것은 **값이 아니라 차례다**: 종을 여는 두 칸(구울·골렘)을 앞에 붙여 놓고,
       머릿수를 늘리는 `legion` 을 그 뒤로 보냈다. 줄기의 뜻도 이쪽이 곧다 —
       「군세를 파면 **먼저 종이 열리고**, 그 다음에 머릿수가 는다」. */
    { id:"golem",  n:"흙 골렘",    max:1, lv:10, req:"ghoul",  d:"흙 골렘 소환 해금 · 느린 대신 두꺼운 벽", big:1 },
    /* ══ 여기서 **길이 갈린다** ══ (ROADMAP A-ⓑ · B · 2026-08-18)
       병수님: 「소수의 하수인이지만 하수인 자체가 강해지는 형태로」.
       그 축은 이미 유니크 `lonely` 안에 있었는데, 유니크는 **주울 때까지 없는 것**이라
       빌드가 못 된다. 트리의 한 줄로 세워 **고르는 자리**로 만든다.
       둘은 `excl:"army"` 로 **서로 잠근다** — 하나를 찍는 순간 다른 하나가 닫힌다.
       이것이 배타 선택의 첫 사례다(점이 남아돌아도 «둘 다»는 못 가진다). */
    { id:"legion", n:"군단",      max:3, lv:12, req:"golem",  excl:"army", d:"소환수 상한 +1" },
    { id:"elite",  n:"소수 정예",  max:3, lv:12, req:"golem",  excl:"army", alt:1,
      d:"소환수 상한 -23% · 소환수 피해 +55% · 소환수 체력 +30%" },
    /* 갈래 뒤의 **공통 줄기** — 어느 쪽을 골랐든 여기로 내려온다. 갈래 바로 밑을
       양쪽 전용으로만 채우면 잘못 고른 판이 길이 아예 막힌 것처럼 보인다. */
    { id:"marrow", n:"골수 단련",  max:6, lv:16, req:"golem",  d:"소환수 피해 +8%" },
    /* ══ **두 번째 갈래** ══ 같은 「군세」 안에서도 결이 갈린다: 세게 때리다 빨리
       죽느냐, 오래 서서 벽이 되느냐. 둘 다 **주는 만큼 뺏는다** — 안 그러면 고르는
       게 아니라 「더 좋은 쪽」이 하나 있는 것뿐이다. */
    { id:"fury",   n:"광포",      max:5, lv:22, req:"marrow", excl:"army2",
      d:"소환수 피해 +12% · 소환수 체력 -6%" },
    { id:"stone",  n:"석화",      max:5, lv:22, req:"marrow", excl:"army2", alt:1,
      d:"소환수 체력 +16% · 소환수 피해 -4%" },
  ]},
  { k:"corpse", n:"시 체", nodes:[
    { id:"rot",     n:"부패",      max:8, lv:1,  d:"시체 폭발 피해 +15%" },
    { id:"harvest", n:"시체 수확",  max:8, lv:4,  req:"rot",     d:"적 처치 시 12% 확률로 시체 1 추가" },
    { id:"cheap",   n:"값싼 죽음",  max:6, lv:8,  req:"harvest", d:"모든 스킬 마나 소모 -10%" },
    { id:"chain",   n:"연쇄 폭발",  max:5, lv:12, req:"cheap",   d:"시체 폭발 범위 +25%" },
    { id:"pyre",    n:"화장 더미",  max:6, lv:14, req:"chain",   d:"시체 폭발 피해 +14%" },
    /* 시체 줄기의 갈래 — 「더 많이 줍기」와 「더 넓게 터뜨리기」. 시체가 자원인
       게임이라 이 둘은 서로 다른 놀이가 된다(모아서 크게 vs 계속 터뜨리며). */
    { id:"glut",    n:"탐식",      max:5, lv:20, req:"pyre",    excl:"corpse",
      d:"적 처치 시 시체 획득 +9%" },
    { id:"pyro",    n:"불꽃 장례",  max:5, lv:20, req:"pyre",    excl:"corpse", alt:1,
      d:"시체 폭발 범위 +20%" },
    { id:"feast",   n:"시체 잔치",  max:1, lv:24, req:"pyre",    d:"시체 폭발이 소환수 체력 회복 · 먹을수록 <b>몸집 성장</b>(최대 +40%)", big:1 },
  ]},
  { k:"hex", n:"주 술", nodes:[
    { id:"wand",   n:"뼈 다루기",  max:8, lv:1,  d:"본인 기본 공격력 +12%" },
    { id:"swift",  n:"빠른 손",    max:7, lv:5,  req:"wand",   d:"모든 스킬 재사용 -7%" },
    { id:"deep",   n:"깊은 저주",  max:6, lv:9,  req:"swift",  d:"저주 지속 +3초 · 증폭 +8%" },
    { id:"veil",   n:"어둠의 장막", max:6, lv:15, req:"deep",   d:"저주 증폭 +7%" },
    { id:"spirit", n:"영혼 흡수",  max:5, lv:18, req:"veil",   d:"적 처치 시 마나 +2" },
    /* 주술의 갈래 — 마나로 버티느냐, 손을 더 빨리 놀리느냐. 저주가 축인 빌드라
       둘 다 「더 자주 쓴다」로 가지만 길이 다르다(연료 vs 시계). */
    { id:"drain",  n:"영혼 착취",  max:5, lv:22, req:"spirit", excl:"hex",
      d:"적 처치 시 마나 +2" },
    { id:"haste",  n:"신속",      max:5, lv:22, req:"spirit", excl:"hex", alt:1,
      d:"모든 스킬 재사용 -5%" },
    { id:"dark",   n:"어둠의 지배", max:1, lv:26, req:"spirit", d:"적 처치 시 30% 확률로 <b>아군화</b> · 상한 밖 최대 4기", big:1 },
  ]},
];
/* ★ **관문은 벌이와 한 벌로 움직인다**(2026-08-15 · ROADMAP 4막). 벌이에서 깊이를
   덜어내면(`__XP_DEPTH`) 12분 레벨이 31 → 13 으로 내려앉는데, 구울이 Lv.6 · 골렘이
   Lv.10 뒤에 있어서 **그대로 켜면 골렘이 영영 안 선다** — 오늘 아침에 「세 종이 다
   선다」로 닫은 항목이 조용히 깨진다. 그래서 관문 레벨에 **하나의 배율**을 걸어,
   벌이를 늦추는 만큼 나무를 같이 내린다(0.65 면 구울 4 · 골렘 7 · 군단 8).
   ★ 값을 노드마다 손으로 고치지 않는 것은, 그러면 A/B 마다 다섯 줄씩 갈아 끼우다
     세 갈래의 균형(선행·요구·big)이 어긋나기 때문이다. 배율 하나면 결이 안 바뀐다. */
export const GATE_S_DEF = 1;
{
  const g = globalThis.__GATE_S != null ? +globalThis.__GATE_S : GATE_S_DEF;
  if (isFinite(g) && g > 0 && g !== 1)
    for (const c of TREE) for (const nd of c.nodes) nd.lv = Math.max(1, Math.round(nd.lv * g));
}
const NODE = {};
for (const c of TREE) for (const nd of c.nodes) NODE[nd.id] = nd;
export const nodeOf = (id) => NODE[id];

/** ★ **트리도 저장을 안 믿는다** — 여기가 「저장을 믿지 않는 자리」의 마지막 한 곳
 *  (장비·재련·강화·숫자에 이어 · ROADMAP 2026-08-13). 트리는 특히 위험하다:
 *  ① 모르는 노드가 남아 있으면 `spUsed` 가 **없는 노드에 쓴 점수까지 세어**, 찍을
 *     수 있는 점수가 사라진다(노드 이름을 한 번 고치면 그 뒤 사용자 전부).
 *  ② 랭크가 max 를 넘으면 `rank("legion")` 같은 값이 그대로 상한·배수에 들어가
 *     소환수 상한이 튄다 — 저장을 손으로 고친 판이 정상 판으로 보인다.
 *  ③ 문자열·음수·소수면 `| 0` 이 조용히 0 이나 엉뚱한 값으로 접어 버린다.
 *  ★ 여기여야 하는 이유: NODE 가 선 **바로 다음**. load() 안에서는 TREE 가 아직
 *    없어 TDZ 로 죽는다(GEAR 를 거르는 자리와 같은 사정).
 *  ★ 레벨 관문(nd.lv)으로는 안 지운다 — lv 이 깎여 들어온 저장에서 **정당하게 찍은
 *    것까지** 날아간다. 여기서 보는 것은 「있는 노드인가 · 단계가 범위 안인가」뿐. */
if (!META.tree || typeof META.tree !== "object") META.tree = {};
for (const id of Object.keys(META.tree)) {
  const nd = NODE[id];
  const v = +META.tree[id];
  if (!nd || !isFinite(v) || v < 1) { delete META.tree[id]; continue; }
  META.tree[id] = Math.min(nd.max, Math.floor(v));
}

export const rank = (id) => META.tree[id] | 0;
/** 점수는 **레벨에서 나온다** — 레벨 2부터 한 점씩. */
export const spTotal = () => Math.max(0, META.lv - 1);
export const spUsed  = () => Object.values(META.tree).reduce((a, b) => a + (b | 0), 0);
export const spLeft  = () => spTotal() - spUsed();

/** ★ **배타 선택** — 같은 `excl` 패에서 **이미 찍은 다른 칸**을 돌려준다(없으면 null).
 *  「점이 모자라서 못 찍는다」와 「골랐으므로 닫혔다」는 **다른 일**이라 자리를 나눈다:
 *  앞엣것은 기다리면 풀리지만 뒤엣것은 **초기화 전에는 안 풀린다.** 화면도 그렇게
 *  갈라 그려야(tree.js `xlock`) 사람이 「왜 안 눌리지」로 헤매지 않는다. */
export const exclLockedBy = (id) => {
  const nd = NODE[id]; if (!nd || !nd.excl) return null;
  for (const o of Object.values(NODE))
    if (o.excl === nd.excl && o.id !== id && rank(o.id) > 0) return o;
  return null;
};
/** 찍을 수 있나. 못 찍으면 **왜 못 찍는지**를 돌려준다 — 회색으로만 두면 답답하다. */
export function takeWhy(id) {
  const nd = NODE[id]; if (!nd) return "없는 것";
  if (rank(id) >= nd.max) return "최대 단계";
  /* 레벨·선행보다 **먼저** 본다 — 이미 길이 갈린 뒤에 「레벨 12 필요」라고 하면
     기다리면 열리는 줄 안다. 닫힌 까닭 중 **제일 무거운 것**을 말해야 한다. */
  const by = exclLockedBy(id);
  if (by) return `갈래가 갈렸다 · 「${by.n}」`;
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

/* ══ 점은 **저절로 쓰인다** ══ 안 그러면 갈래가 하나뿐인 게임이 된다.
   ──────────────────────────────────────────────────────────────
   구울은 Lv.6 `armor`→`ghoul` 뒤에, 골렘은 Lv.10 `ghoul`→`golem` 뒤에 있는데
   **자동 진행은 점을 한 번도 안 썼다.** 소환 자체는 이미 셋을 나눠 세울 줄 안다
   (main.js auto · doctrineWants) — 막고 있던 것은 오직 트리였다. 그래서 12분을
   돌려도 판에 서는 것은 **해골뿐**이었다(ROADMAP 4막 A-1, 2026-08-15).

   고칠 방법 셋 중(①깊이로 저절로 열림 ②점을 자동으로 쓰되 사람이 바꿈 ③나무에서 뗌)
   **②**를 골랐다 — ①은 트리를 장식으로 만들고, ③은 「군세를 파면 종이 열린다」는
   축을 통째로 버린다. ②만이 방치로 둔 사람에게 셋을 다 주면서, 창을 여는 사람에겐
   여전히 제 빌드를 남긴다(끄면 그 자리에서 점이 쌓이고, 초기화로 다시 판다).

   차례는 **두 관문에 늦지 않게** 짰다: Lv.6 에 구울 · Lv.10 에 골렘이 정확히 열린다
   (점수는 레벨-1 이므로 Lv.6=5점 · Lv.10=9점 — 아래 목록의 5번째·9번째가 그 둘).
   ★ **골렘을 9번째로 당겼다**(2026-08-17). 15번째에 있던 동안 골렘은 396초에야 섰다 —
     쓸 수 있는 판의 절반이 지난 뒤다. 목록에 담긴 **낱말은 하나도 안 바뀌었고**(단계 수
     그대로) **차례만 바뀌었다** — `legion` 셋이 9·12·16 에서 11·15·16 으로 밀린 것이
     그 값이다. 값을 만지지 않은 것은, 손잡이 다섯이 이미 다 졌기 때문이다(ROADMAP ⑧-d). */
/* ★ **갈래가 넷이 된 뒤로는 이 목록이 「한 빌드」다**(2026-08-18 · A-ⓐ). 자가 고르는
   길은 군단(물량) → 광포(공격) → 탐식(시체) 쪽이다. 지난 측정과 이어지려면 이 길이
   흔들리면 안 되므로, 갈래에서 **어느 쪽을 고르는지 여기에 못박아 둔다** — 반대쪽
   빌드를 재려면 목록을 갈아 끼우지 말고 `__AUTO_TREE` 처럼 팔을 따로 만들 것. */
export const AUTO_PLAN = [
  "bone", "armor", "bone", "rot", "ghoul",          // Lv.6 — 구울이 열린다
  "armor", "bone", "rot", "golem", "armor",         // Lv.10 — 골렘이 열린다
  "legion", "bone", "harvest", "armor", "legion",
  "legion", "rot", "harvest", "marrow", "rot",      // Lv.20 — 골수(Lv.16)가 열려 있다
  "harvest", "marrow", "cheap", "marrow", "chain",
  "pyre", "marrow", "pyre", "fury", "fury",         // Lv.31 — 화장 더미(14)·광포(22)
];
/** 목록을 다 쓴 뒤에도 레벨은 오른다 — 남는 점은 이 차례로 계속 붓는다.
 *  ★ 갈래의 **반대쪽**(정예·석화·불꽃·신속)은 여기 넣지 않는다 — take() 가 막으므로
 *    넣어도 해는 없지만, 목록을 읽는 사람이 「둘 다 찍히나?」로 헷갈린다. */
const AUTO_FILL = ["bone", "armor", "rot", "harvest", "marrow", "pyre", "fury", "cheap", "chain",
                   "glut", "wand", "swift", "deep", "veil", "spirit", "drain", "feast", "dark"];

/** 남은 점을 계획대로 쓴다. **쓴 개수**를 돌려준다(0 이면 화면을 안 건드려도 된다).
 *  ★ 목록을 **앞에서부터 집어 쓰지 않는다** — 그렇게 짜면 Lv.6 에 남은 한 점이
 *    목록 첫 칸(`bone`)으로 새어 구울이 한 레벨씩 밀린다(관문마다 어긋난다).
 *    총 점수만큼의 **앞 토막이 곧 목표 랭크**이고, 여기서는 그 목표까지만 채운다. */
/* ══ 이제 **사람은 이 길로 안 온다** ══ (ROADMAP ③ · 2026-08-18)
   병수님이 D2 사진을 놓고 말씀하셨다 — 저쪽 트리에는 「자동 배분」이 없다. 그리고
   그것이 「고를 자리가 0」의 뿌리였다: 레벨이 오르는 그 자리에서 점이 저절로 쓰여
   창을 열면 **남은 점수가 늘 0** 이었다. 이 게임의 첫 줄이 "내가 직접 스킬트리를
   찍어서 나만의 빌드를 구성하는거지" 인데 그 문장을 코드가 스스로 지우고 있었다.

   그래서 **손잡이를 끄는 것이 아니라 길을 없앤다** — 단추도, 저장의 플래그도 뺐다.
   방치형 걱정(창을 안 열면 구울·골렘이 안 열린다)은 **점 배지**(spDot)와 단축키 `T` 로
   갚는다. 열 것이 있으면 레벨 옆에 수가 뜨고, 한 글쇠면 창이 열린다.

   함수는 남긴다 — **자(檢)가 「본보기 빌드」로 굴러야** 지난 측정과 이어진다.
   자만 `globalThis.__AUTO_TREE = 1` 을 박고 들어온다(loop_health 등). 사람에겐 0. */
/* ══ **갈래의 반대쪽을 재는 팔** ══ (ROADMAP B · 2026-08-18)
   위 목록은 갈래에서 어느 쪽을 고를지 못박아 두었다(군단·광포·탐식·착취). 그래서
   「소수 정예」 빌드는 **자로 잴 길이 아예 없었다** — 사람이 손으로 찍어야만 보이는
   빌드다. 목록을 갈아 끼우면 지난 측정과 이어지지 않으므로, `__AUTO_TREE` 와 같은
   방식으로 **팔을 따로** 낸다: `__AUTO_FORK="elite"` 를 박고 들어오면 그 자리에서
   **이름만 바꿔** 집는다(`legion` → `elite`). 사람 쪽 길은 안 건드린다.
   여럿을 한꺼번에 바꿀 수도 있으나(`"elite,stone"`), **한 번에 하나만** 바꾸는 것이
   원칙이다 — 넷을 같이 바꾸면 무엇이 들었는지 못 본다. */
function forkSwap() {
  const raw = globalThis.__AUTO_FORK;
  if (!raw) return null;
  const want = new Set(String(raw).split(/[,\s]+/).filter(Boolean));
  const m = {};
  for (const g of TREE) for (const nd of g.nodes) {
    if (!nd.excl || !want.has(nd.id)) continue;
    /* 같은 패의 **나머지 전부**가 이 칸으로 온다(패에 셋이 서는 날을 위해). */
    for (const o of g.nodes) if (o.excl === nd.excl && o.id !== nd.id) m[o.id] = nd.id;
  }
  return Object.keys(m).length ? m : null;
}

export function autoSpend() {
  if (globalThis.__AUTO_TREE !== 1) return 0;
  let used = 0;
  const M = forkSwap(), sw = M ? (id => M[id] || id) : (id => id);
  const PLAN = M ? AUTO_PLAN.map(sw) : AUTO_PLAN;
  const FILL = M ? AUTO_FILL.map(sw) : AUTO_FILL;
  const want = {}, n = Math.min(PLAN.length, spTotal());
  for (let i = 0; i < n; i++) want[PLAN[i]] = (want[PLAN[i]] | 0) + 1;
  /* 차례는 목록 그대로 — 선행이 먼저 서야 뒤가 열린다(`bone`→`armor`→`ghoul`). */
  for (const id of PLAN) while (rank(id) < (want[id] | 0) && spLeft() > 0 && take(id)) used++;
  if (spTotal() <= PLAN.length) return used;
  /* 목록이 끝났으면 **더 못 쓸 때까지** 채운다 — 한 바퀴에 하나도 못 쓰면 멈춘다
     (레벨이 모자라 잠긴 것뿐이면 무한히 돌 자리다). */
  while (spLeft() > 0) {
    let any = false;
    for (const id of FILL) if (spLeft() > 0 && take(id)) { any = true; used++; }
    if (!any) break;
  }
  return used;
}

/* ── 트리가 판에 미치는 값들 ── **한 곳에 모아 둔다.** 흩어 놓으면 노드를 더할 때마다
   어디를 고쳐야 하는지 찾아다니게 된다. */
/* ★ 석화는 여기로, 광포는 **음수로** 들어온다(위 minionMulOf 와 짝). 바닥 0.2 도 같은
   까닭 — 체력 배수가 0 이 되면 소환수가 서자마자 죽어 판이 멈춘다. */
export const minionHpMul = () => Math.max(0.2,
                                  1 + rank("armor") * 0.12 + rank("elite") * ELITE_HP
                                + rank("stone") * 0.16 - rank("fury") * 0.06);

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
export const novaDmgMul  = () => (1 + rank("rot") * 0.15 + rank("pyre") * 0.14) * (1 + afSum("nova") / 100);
export const novaRadMul  = () => 1 + rank("chain") * 0.25 + rank("pyro") * 0.20;
export const mpCostMul   = () => Math.pow(0.90, rank("cheap"));
/** 스킬 한 번의 **실제** 마나. 쓸 수 있는지 보는 곳(벨트)과 빼는 곳(cast)이
 *  반드시 같은 식을 봐야 한다 — 어긋나면 「눌리는데 안 나감」이 된다. */
export const mpCost = (sk) => Math.round(sk.mp * mpCostMul());
/* 재사용 감소는 **곱으로 깎는다**(빼면 0 아래로 내려가 즉시 시전이 된다). 옵션 상한 14%
   셋이면 0.64 배까지만 — 트리(swift)와 곱해져도 바닥이 있다. */
/* ★ 「신속」도 **곱으로** 얹는다 — 빠른 손과 더해서 빼면 둘을 다 파는 판에서 0 아래로
   내려간다. 곱이면 몇을 곱해도 0 에 닿지 않는다(0.93^7 × 0.95^5 = 0.46). */
export const cdMul       = () => Math.pow(0.93, rank("swift")) * Math.pow(0.95, rank("haste"))
                               * Math.max(0.35, 1 - afSum("cd") / 100);
export const wandMul     = () => 1 + rank("wand") * 0.12;
export const ampSecs     = () => 8 + rank("deep") * 3;
export const ampPower    = () => 1.4 + rank("deep") * 0.08 + rank("veil") * 0.07;   // 저주가 올리는 피해 배수
export const harvestPct  = () => rank("harvest") * 0.12 + rank("glut") * 0.09 + afSum("corpse") / 100 + gearVal("belt");   // 허리띠 = 시체 획득
/** 경험치 배수 — 옵션 xp. 곱해지는 자리는 battle.js 의 xpGain 하나뿐이다. */
export const xpMul       = () => 1 + afSum("xp") / 100 + gearVal("ring2");   // 반지 ② = 경험치
export const spiritMp    = () => (rank("spirit") + rank("drain")) * 2;
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
