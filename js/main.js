import { $, num, CORPSE_TINT, GEAR, GEAR_KEYS, MOB_H, gearNext, gearTier, gearShow, gearNum, gearDelta, equipped, equipFromBag, mkItem, nameOf, rarityOf, RARITY, afText, scoreOf, AFFIX, hpMaxOf, isGate, META, MINIONS, mpMaxOf, mpRegenOf, goldMulOf, depthMul, selfDmgMul, minionDmgMul, S, saveMeta, SKILLS, armyCap, autoForge, autoForgeOn, buyReforge, upCost, reforgeCost, reforgeStep, UPS, xpNeed, mpCost, cdMul, spLeft, syncSkills, feedMul, unitH, armyN, thrallN, armyCapEff, CAP_MERGE_OF, RAISE_SPILL_OF, BURN_MANA_OF, BURN_KEEP, BAG_MAX, BAG_COLS, BAG_ROWS, bagPack, bagUsed, LASTRUN, digCost, digDraw, dropTierCap, ilMul, zoneOf, canRebirth, rebirth, rebirthPreview, neverDove, relicMul, REBIRTH_MIN, applyOffline, OFFLINE_CAP_MIN, bootSeen, autoSpend,
 diveMax, diveAt, DIVE_STEP, DIVE_BACK, DIVE_MIN_DEEPEST, ZONES, MOB_N, clanOf, startFloor, wipeSave, UNIQUE, UNIQ_BY_ID, mkUnique, uniqOf, QUESTS, questProg, questDone, DOCTRINE, DOCTRINE_DEF, DOCTRINE_IDS, doctrineId, doctrineWants, doctrineWantsOf, TACTIC, TACTIC_IDS, tacticId, tacticOf, docCorpseOf } from "./core.js";
import { gulpOf, durOf, KILL_BY, KILL_DMG, KILL_AT, TAINT, NOVA, RAISE_TALLY, RAISE_CHOKE, LOST_BY, LOST_DMG, LOST_HITS, LOST_KINDS, HERO_TALLY, TOUCH_K_DEF, registerAutoTick, rushOn, say, retreat, ARRIVE_T, BOSSRING_T, bossH, mobKindsFor, cast, corpseNeedOf, slotYield, CORE_R, CORPSE_FADE, CORPSE_MAX, DEATH_T, DEATHLOG, die, IMPACT_AT, newRun, PILE_FADE, RING_HOLD, RING_SPAWN, RISE_T, sayReset, step, SWING_T } from "./battle.js";
import { SQUASH_VIEW as SQUASH_VIEW_C, gripMul, GRIP } from "./core.js";
/* V-124 — 대장간 툴팁의 「지금 / 한 단계 더」. 트리(V-123)와 **같은 함수·같은 꼴**이다. */
import { upStats, treeShow, gearStats, gearStatShow, mulShow } from "./core.js";
/* V-127 — 오프라인 창고의 상한과 「차는 데 걸리는 분」. 식은 core 에만 산다. */
import { CORPSE_BANK_MAX, OFFLINE_EFF, offlineCorpseFillMin } from "./core.js";
/* V-125 — 운용 툴팁이 적는 「몇 구·몇 기」. 식은 core 한 곳뿐이고 auto() 도 같은 것을 부른다. */
import { novaNeedOf, tacticStats } from "./core.js";
import { dirName, drawSprite8, footMetrics, frameCount, LOAD, loadManifest, preload, swingGain } from "./sprite8.js";
import { drawOrb } from "./orb.js";
import { watchPlate } from "./hudplate.js";
import { drawTree, fitTree, markSp } from "./tree.js";

/* ══ 판에서 터지는 그림 ══ **kind 하나에 그림 하나.** 여기 없는 kind 는 그림이 없는
   것이고, 그리는 쪽은 작은 `hit` 으로 떨어뜨린다 — 그 떨어짐이 조용해서 오래 못 봤다.
   `img` 는 assets 경로, `h` 는 화면 높이(px), `grow` 는 작게 시작해 커지며 옅어지는 것,
   `flat` 은 **바닥에 깔리는 그림**(위에서 내려다본 고리 · 판과 같이 눌러 그린다).
   ★ 새 스킬을 넣으면 **여기 한 줄부터** 늘린다(docs/checklist.md 「스킬을 새로 넣을 때」).
     자(tools/fx_art.mjs)가 이 표를 읽어 **두 스킬이 같은 그림을 쓰면 실패**를 낸다. */
export const FX_ART = {
  hit:   { img: "fx/hit",     h: 28 },
  nova:  { img: "fx/nova",    h: 190, grow: true, life: 0.35, flat: true },
  /* ★ 210 은 **너무 컸다** — 판을 찍어 보니 보라 고리가 화면 네 귀 중 하나를 통째로
     덮고 가장자리로 잘려 나갔다(2026-08-15 저녁 스샷). 적 무리를 덮되 판을 안 먹는 크기로. */
  curse: { img: "fx/curse",   h: 132, grow: true, life: 0.6, flat: true },
  burn:  { img: "fx/burnfx",  h: 78 },
  offer: { img: "fx/offerfx", h: 108 },
  /* ★ `rise`(시체를 쓴 자리)는 **고리 + 그림 둘 다**다. 고리만 있던 동안 소환 셋은
     화면에서 여덟 중 셋이 같은 얼굴이었다 — 30px 짜리 흙고리 하나로는 「일으켰다」가
     안 읽힌다. `raise.png`(땅에서 솟는 푸른 혼)를 고리 위에 얹는다. 고리는 남긴다 —
     그림은 「무엇이 섰나」를, 고리는 「여기 것을 썼다」를 말한다. */
  rise:  { img: "fx/raise",   h: 72, grow: true, life: 0.55 },
  /* ↓ **코드로 그리는 것들**(위쪽 가지에서 그리고 `continue` 한다). 그림이 없는 게 아니라
     그림이 필요 없는 것이라, 자가 「빠졌다」로 오해하지 않게 여기에 적어 둔다. */
  gib:       { code: true }, bossring:  { code: true },
  warn_pool: { code: true }, warn_add:  { code: true }, warn_curse:{ code: true },
  warn_charge: { code: true },
};

/* 값 표기(`num`)는 **core.js 로 내렸다**(08-17) — 일지(battle.js)도 같은 자를 써야 해서다.
   여기서 쓰는 자리는 그대로고, 정의만 밑바닥에 있다. */

/* 배수 표기 — 위 띠에서 `×19.50` 이 자리를 먹어 「남은 적 11」이 **말없이 잘렸다.**
   자리를 더 짜내는 대신 **값이 자랄수록 소수를 버린다**: 10 미만은 두 자리(초반엔
   ×1.12 처럼 자라는 게 소수에만 보인다), 100 미만은 한 자리(×19.5), 그 위는 정수,
   네 자리부터는 `num()` 과 **같은 자**로 줄인다(×1.2k) — 자가 둘이면 같은 값이 달라 보인다. */
/* ★ 자릿수 규칙은 **core.mulShow 하나**다 — 견줌 줄(gearStatShow)도 그것을 쓴다.
   여기 베껴 두면 한쪽만 고쳐져 같은 수가 둘로 읽힌다(V-133). */
const mul = mulShow;

/** ══ 캔버스 글자는 **9 의 배수**로만 ══
 *  Galmuri9 는 **9px 격자**의 픽셀 글꼴이라, 그 배수를 벗어난 크기로 그리면 획이
 *  뭉개진다 — style.css 와 hud.css 는 이미 그 규칙을 지키는데(18=9×2) **판 위에
 *  그리는 글자만 안 옮겨져 있었다**(2026-08-24 V-18). 떠오르는 피해 숫자가
 *  `round(13 * us)` = 22px 로 나와, 몸 위에 얹힌 「6」이 글자가 아니라 **흙빛 덩어리**로
 *  읽혔다. 가까운 배수로 물려서 획이 픽셀에 딱 떨어지게 한다.
 *  ★ 캔버스에 Galmuri9 을 새로 쓰는 자리는 **반드시 이 자를 거친다**. */
const G9 = 9;
const g9 = (px) => Math.max(G9, Math.round(px / G9) * G9);

/* 구슬 안 숫자가 **테를 밟지 않게** 맞춘다. 글꼴 폭은 짐작하지 말고 canvas 로 잰다. */
const _mm = document.createElement("canvas").getContext("2d");
/* ★ 픽셀 글꼴은 글자마다 폭이 다르다(`1` 이 좁다) — 제일 넓은 숫자와 단위를 한 번 재 둔다. */
const [FAT, UNIT] = (() => {
  _mm.font = '27px "Galmuri9", monospace';
  const widest = (set) => [...set].reduce((a, b) => _mm.measureText(b).width > _mm.measureText(a).width ? b : a);
  return [widest("0123456789"), widest("kM")];
})();

/** 이 판에서 **나올 수 있는 제일 넓은 글자**. 크기를 지금 값으로 정하면 체력이
 *  닳는 동안 27 ↔ 18 로 깜빡이고, 「최대치/최대치」로 정해도 모자란다 —
 *  `num()` 은 값마다 길이가 달라서(6k 인데 4.4k) **최대치가 제일 긴 글자가 아니다.**
 *  그래서 자릿수를 **만들어서** 잰다: 현재값은 최대치 이하 어디든 올 수 있다. */
function widestNum(max) {
  const cur = max < 1000 ? FAT.repeat(String(Math.round(max)).length)
                         : FAT + "." + FAT + UNIT;
  return (cur + "/" + num(max)).replace(/\d/g, FAT);
}

/* ★★ 「현재값/최대치」를 한 줄로 27px 에 넣으려니 **어떤 값이든 유리(102px)를 넘어**
   전부 18px 로 떨어졌다 — 키운 의미가 사라진다. 한 줄에 다 넣으려 한 것이 잘못이었다.
   **현재값을 크게, 최대치를 그 아래 작게** 두 줄로 나눈다:
     · 현재값은 길어야 네 글자(9.9M) — 27px 로도 유리 안에 넉넉히 들어간다
     · 최대치는 곁다리이므로 작아도 되고, 두 줄이라 서로 폭을 안 뺏는다
     · 크기가 값에 따라 안 바뀌니 **깜빡임도 없다**(그래서 잴 것도 없어졌다) */
function fitNum(el, cur, max) {
  const a = num(cur), b = "/" + num(max);
  if (el._a !== a) { el._a = a; el.children[0].textContent = a; }
  if (el._b !== b) { el._b = b; el.children[1].textContent = b; }
}

/** ══ 매 틱 도는 판은 «바뀐 것만» 쓴다 ══ (2026-08-17 · 렉 항목)
 *  `hud` 는 틱마다 도는데(옆 패널을 채우던 `sideRail` 도 그랬다 — 2026-08-17 에 없앴다), 같은 글자를 다시 넣어도 브라우저는 그때마다
 *  글자판을 새로 세우고(innerHTML 이면 파서까지 돈다) 레이아웃을 더럽힌다.
 *  `beltState` 를 고칠 때와 같은 길 — **값이 그대로면 손대지 않는다.** 넣는 글자가
 *  같으니 나오는 그림도 같다(그래서 되돌려 볼 것도 픽셀로 댈 수 있다).
 *  이 결은 이미 이 파일에 셋 있다(`setLeft`·`setDepth`·`fitNum`) — 나머지를 여기에 맞춘다.
 *  ★ id 도 **한 번만 찾아 둔다.** `$` 는 getElementById 라 싸지만 한 프레임에 스무 번이면
 *    싼 것도 쌓인다. 아직 없는 칸은 적어 두지 않는다(null 이면 다음 틱에 다시 찾는다) —
 *    그래야 나중에 생기는 칸을 영영 놓치지 않는다. */
const _nodes = Object.create(null);
const $$ = (id) => _nodes[id] || (_nodes[id] = $(id));
const setTxt  = (el, v) => { if (el && el.__t !== v) { el.__t = v; el.textContent = v; } };
const setHTML = (el, v) => { if (el && el.__h !== v) { el.__h = v; el.innerHTML  = v; } };
import { drawSlot, drawBar, watch } from "./frame.js";
import { drawGlows, drawGround, drawHoldRing, loadDecals, loadFloor, loadWang, loadDecor, pxDashEllipse, pxDashLine, rebuildWang, setAnchors, useFloor, useLayout } from "./ground.js";
import { drawTown, drawTownLabels, loadTown, setTownHover, townBreath, townGaze, townHitAt, townHits } from "./town.js";

/* 전장은 캔버스, 판(UI)은 DOM. **섞지 않는다** — 앞 프로토타입에서 백여 개 DOM 을
   매 프레임 옮기다 렉을 만들었고, 반대로 장식이 많은 UI 를 캔버스로 그리면 손이 열 배 든다.
   움직이는 것은 캔버스, 읽는 것은 DOM. */
const cv = $("stage"), ctx = cv.getContext("2d");
let dpr = 1;
/* ══ 성능 모드 ══ **여기(맥)에서는 렉이 재현이 안 된다** — 병수님 기기에서만 걸린다
   (2026-08-15 여러 번). 그래서 값을 짐작으로 깎는 대신 **판이 제 프레임을 재서 스스로
   내려가게** 한다. 제일 크게 먹는 것은 **칠하는 픽셀 수**이고, 그건 dpr 하나로 정해진다:
   414 CSS 폭에서 dpr 2 면 828×1792 ≈ **148만 px**, dpr 1.35 면 **67만 px**(55% 감소).
   ★ 한 번 내려가면 그대로 둔다(오르내리면 화면이 계속 흔들려 더 거슬린다).
   ★ 사람이 고를 수도 있어야 한다 — `?perf=1`(강제 저해상도) · `?perf=0`(강제 원해상도).
   ★ 고른 것은 기억한다(다음에 켤 때 또 느려질 때까지 기다리지 않게). */
const PERF_KEY = "necro.perf.v1";
const qs = new URLSearchParams(location.search);
let perfLow = qs.has("perf") ? qs.get("perf") === "1" : localStorage.getItem(PERF_KEY) === "1";
/* ★ **손으로 고른 것은 판이 뒤엎지 않는다**(2026-08-17). 위 주석은 `?perf=0` 을
   「강제 원해상도」라고 적어 놨는데 실제로는 **강제가 아니었다** — 자동 판정(아래
   watchFrame)이 느린 기기에서 곧바로 setPerfLow(true) 를 불러 되돌려 놨다.
   자로 두 팔(성능모드 켬/끔)을 견주려 해도 **끈 팔이 재는 도중에 켜져** 둘이 같아졌다
   (실측 ×6 에서 perf=0 팔도 dpr 1.35 로 끝났다). 명시로 고른 판은 고른 대로 둔다. */
const PERF_PINNED = qs.has("perf");
export function setPerfLow(v) {
  if (perfLow === !!v) return;
  perfLow = !!v;
  try { localStorage.setItem(PERF_KEY, perfLow ? "1" : "0"); } catch {}
  fit();
}
/* ★ 판 크기는 **여기서만** 읽는다(2026-08-16). `clientWidth/Height` 는 **읽는 순간
   레이아웃을 강제로 다시 계산**시킨다 — `draw()` 첫 줄에서 매 프레임 읽고 있었고,
   CPU 프로파일에서 그 한 줄이 `draw` 자기시간의 **29.5%** 였다(폰 속도 ×6 에서 1위 줄).
   크기가 바뀌는 자리는 여기뿐이니(resize · 화질 토글 · 시작) 재 두고 쓴다. */
let cvW = 0, cvH = 0;
function fit() {
  dpr = Math.min(perfLow ? 1.35 : 2, devicePixelRatio || 1);
  cvW = cv.clientWidth; cvH = cv.clientHeight;
  cv.width = cvW * dpr; cv.height = cvH * dpr;
  _hbKey = "";                 /* 띠 높이는 창 폭(@media)에 따라 40↔48 로 바뀐다 — 다시 잰다 */
}
addEventListener("resize", () => { railLayout(); menuH(); fit(); });

/* ══ 옆 패널에 물건을 «넣는다» ══ (2026-08-16 19:30, 병수님 「PC UI 개판인데」)
 *  로그와 단추 넷은 여태 `position:fixed` + **무대 식을 베낀 좌표**로 서 있었다. 그래서
 *  8px 어긋남 · 패널 밑에 깔린 단추 · 626px 짜리 기둥이 차례로 났고, 고칠 때마다 자리가
 *  하나씩 늘었다. 좌표를 버리고 **패널 안 슬롯으로 옮긴다** — flex 가 세로를 나눠 가지므로
 *  창이 어떤 크기든 저절로 맞는다.
 *  ★ 좁은 창에서는 **원래 자리(body 직속)로 돌려놓는다** — 패널이 안 뜨는 폭에서 로그가
 *    패널 안에 갇히면 화면에서 통째로 사라진다. 옮긴 자리를 기억해 두었다가 되돌린다. */
/* ══ 옆 패널을 없앴다 ══ (병수님 2026-08-17 23:16 「좌우 메뉴 없애라니까,, 필요없음」)
   ★ 21:26 에 이미 「좌우 UI는 없애」라고 하셨는데, 뒤에 붙은 「아니면 플로팅으로…」를
     내가 골랐다. 그건 **내 아쉬움**(정보를 잃기 싫었다)이지 병수님 뜻이 아니었다.
     「A. 아니면 B」에서 **A 를 두 번 말하면 A** 다.
   ★ 이 함수는 남는다 — 로그·나가기·환생을 **패널이 생기기 전 자리**(body 직속)에 두는
     일을 계속 한다. 옮길 곳이 없어졌으니 늘 되돌리기만 하면 된다. 함수를 지우고
     호출만 없애면 「어디로 갔는지」가 코드에서 사라진다. */
function railLayout() {
  document.body.classList.remove("rails");
  for (const id of ["log", "hLeave", "hReborn", "hDoctrine", "hTactic"]) {
    const el = $(id);
    /* 편성·운용은 아래 판 메뉴가 가져간다(menuLayout) — 여기서는 안 만진다. */
    if (el && id !== "hDoctrine" && id !== "hTactic" && el.parentElement !== document.body)
      document.body.appendChild(el);
  }
}
railLayout();

/* ══ 아래 판으로 메뉴를 내린다 ══ (병수님 2026-08-17 20:33 「하단에 메뉴로 빼줘」)
   위 띠의 「능력치」·「스킬」을 **아래 판 벨트 밑**으로 옮긴다. 옆 패널과 **같은 방법**이다 —
   새로 만들지 않고 **있던 것을 옮긴다**(제목·툴팁·여는 길이 두 벌이 되면 한쪽만 고치게 된다).
   ★ 금(`.coin`)은 안 옮긴다 — 그건 누르는 것이 아니라 **읽는 값**이라 위 띠가 제자리다. */
function menuLayout() {
  const slot = $("hudMenu"); if (!slot) return;
  /* ★★ **두 개로는 「메뉴」로 안 읽힌다**(병수님 2026-08-17 21:05 「디아블로는 하단에
     메뉴가 있다고」 — 아래로 내린 뒤에도 다시 지적받았다). D2 의 아래 판은 캐릭터·
     인벤토리·스킬·퀘스트가 **줄지어 선** 한 줄이다. 「아래에 있다」가 아니라
     **「메뉴처럼 서 있다」**여야 한다. 그래서 창을 여는 것을 **전부** 여기로 모은다.
     ★ 나가기·환생은 안 옮긴다 — 그건 **메뉴가 아니라 행동**이고, 옆 패널 발치가 제자리다
       (`rail_qa` 가 그 자리를 지킨다). */
  /* ★ **아이콘 타일로 갈아입힌다**(병수님 21:23 「아이콘 형태로」). 단추 자체는 그대로
     옮기고(여는 길·툴팁이 하나로 남는다), 안에 그림을 하나 얹는다.
     ★ 그림이 아직 안 구워졌을 수 있다 — 그때는 `onerror` 로 그림만 숨고 **글자가 대신
       선다**(빈 네모를 세우지 않는다 · 벨트 칸과 같은 규칙). */
  const ART = { hName: "stat", hBag: "bag", hLv: "tree", hDoctrine: "doctrine", hTactic: "tactic" };
  /* ★★ **이름을 칸 안에 적는다**(2026-08-24 · V-29). 여태 「이름은 툴팁이 말한다」였는데,
     이 띠는 창을 여는 **유일한 길**이라 그 말이 제일 안 통하는 자리였다 — 툴팁은
     마우스를 **얹어야** 뜨고, 얹어야 뜨는 이름은 「무엇이 있는지 모르는 사람」에게는
     없는 것과 같다. 상인 「사기」(V-27) · 편성 칸(V-28)에서 이미 두 번 고친 결을
     정작 **띠 자신에게는 안 옮기고 있었다**([[carry-fixes-forward]]).
     ★ 그림은 **안 뺀다** — 병수님이 「아이콘 형태로」라 하신 것 그대로다. 그림 위 ·
       이름 아래로 나눈다(V-28 의 칸과 같은 결).
     ★ **키는 한 톨도 안 키운다.** 이 띠의 윗금은 `overlayTop` 이 읽어 무대 높이를
       정하는 값이라(V-16 이 88px 을 두고 싸운 그 자리), 1px 만 커져도 싸우는 자리가
       그만큼 준다. 그래서 늘리는 것은 **폭**이고, 세로는 그림을 34 → 28 로 줄여 낸다. */
  const NAME = { hName: "능력치", hBag: "가방", hLv: "스킬", hDoctrine: "편성", hTactic: "운용" };
  /* V-32 의 문 — 배지 자리를 고치기 «전»으로 되돌린다(자가 같은 판을 두 번 재게).
     고치는 것이 CSS 뿐이라 문도 CSS 로 열어야 한다. */
  if (globalThis.__NOBADGEFIX) document.body.classList.add("noBadgeFix");
  for (const id of ["hName", "hBag", "hLv", "hDoctrine", "hTactic"]) {
    const el = $(id); if (!el) continue;
    if (!el.querySelector(".mIco")) {
      const img = document.createElement("img");
      img.className = "mIco"; img.alt = "";
      img.src = `assets/ui/menu/${ART[id]}.png`;
      img.onerror = () => { img.remove(); el.classList.add("noArt"); };
      img.onload = () => el.classList.add("hasArt");
      el.prepend(img);
    }
    /* 이름 조각. `pointer-events:none` 은 CSS 가 준다 — 이름 위를 눌러도 단추가 받는다
       (그러지 않으면 여는 길이 이름 자리에서만 죽는다 · `v29_menuname` 이 그것을 잰다). */
    if (!globalThis.__NOMENUNAME && !el.querySelector(".mNm")) {
      const nm = document.createElement("span");
      nm.className = "mNm"; nm.textContent = NAME[id] || "";
      el.appendChild(nm);
    }
    slot.appendChild(el);
  }
  menuH();
}
/* ══ V-77 — **메뉴 띠의 키를 CSS 에게 알려 준다.** ══ (2026-08-26)
   `#hudMenu` 는 아래 판 «위»에 얹힌 51px 짜리 제 영역인데(2026-08-17 에 새로 생겼다),
   **도킹 창(능력치·가방)은 그것이 있는 줄을 모르고** 아래를 `--panelH` 까지만 비웠다.
   그래서 창의 발치 43px 이 띠 밑(z 25 대 29)으로 들어가고, 발치에 선 「초기화」·「나가기」가
   **반쯤 안 눌렸다**(84.8% · 97% · `tools/v77_hit.mjs`).
   무대 캔버스는 이 구덩이를 V-16 에서 이미 메웠다(`overlayTop` 이 `#hudMenu` 윗금을 읽는다) —
   **그 «왜»를 창에 안 옮겨 적은 것**이 이 결함이다([[carry-fixes-forward]]).
   ★ 51 을 CSS 에 적지 않는다 — 띠의 키는 그림·이름·창 폭이 정하므로 **DOM 에서 잰다**
     ([[seam-not-values]]). 띠가 없거나 숨으면 0 이라, 띠를 안 쓰는 창은 예전 그대로다. */
/* 문 — `__NOMENUH=true` 면 **고치기 «전»**이다(띠를 0 으로 친다). 자가 한 판에서 전/후를
   견주고, 되돌려 **먼저 울려 보는** 데 쓴다([[pixel-verification-calibration]]). */
function menuH() {
  if (globalThis.__NOMENUH) { document.documentElement.style.setProperty("--menuH", "0px"); return; }
  const el = $("hudMenu");
  const r = el && getComputedStyle(el).display !== "none" ? el.getBoundingClientRect() : null;
  document.documentElement.style.setProperty("--menuH", Math.round(r && r.height > 0 ? r.height : 0) + "px");
}
menuLayout();

/* ══ 그림 ══ PixelLab 으로 구운 스프라이트(assets/). **아직 안 온 것은 색 덩어리로 낸다** —
   그림 한 장이 없다고 판이 멈추면 에셋 굽는 동안 아무것도 못 본다. 오면 그때부터 그림이 뜬다. */
const COL = {
  skel: "#d8d2c4", ghoul: "#8fae76", golem: "#8a6b45",
  mob: "#9a3b3b", boss: "#d05353", necro: "#2b2338",
  thrall: "#a06ad0",      // 지배한 적 — 그림이 없을 때의 대체 색만 여기서 쓴다
};
/* ══ 프레임 묶음 ══ `assets/<종류>/attack/0.png…`
   **지금은 아무도 이걸 부르지 않는다** — 그리는 것은 부위 리깅(js/rig.js)이다.
   그래도 남겨 둔다: 공격 프레임은 쓸 만한 것이 이미 굽혀 있어서 언제든 붙일 수 있다.

   PixelLab 은 두 갈래인데 **한쪽만 쓸 수 있다**(네 마리를 받아서 눈으로 대 보고 알았다):
     · `animate_with_text` — 가진 그림을 그대로 움직인다. 옆모습도 생김새도 남는다.
       공격 5장(몹 4종 + 소환수 3종)과 해골 걷기 4장이 이쪽이고, 다 멀쩡하다.
     · `create_character` 8방향 — 참조를 사실상 무시하고 **제 골격(정면)으로 다시 세운다.**
       옆모습으로 구운 몹이 전부 정면으로 돌아섰고 걸음도 안 읽혀서 받은 걷기 4장×4종은
       지웠다. rtd 에서 막혔던 그 벽이 같은 것이다 — 탑다운 탓이 아니었다.
   그래서 걷기는 굽지 않고 리깅으로 만든다. 다시 이 API 로 걷기를 걸지 말 것.

   프레임 수를 미리 모르니 0 번부터 **끊길 때까지** 물어보고 그 수를 기억한다.
   **없으면 조용히 한 장짜리로 돌아간다.** */
const SEQ = {};
function frames(path) {
  let f = SEQ[path];
  if (!f) {
    f = SEQ[path] = { list: [], probing: 0, done: false };
    probe(path, f, 0);
  }
  return f.list.length ? f.list : null;
}
function probe(path, f, i) {
  if (f.done || i > 15) { f.done = true; return; }
  const im = new Image();
  im.onload  = () => { f.list[i] = im; probe(path, f, i + 1); };
  im.onerror = () => { f.done = true; };
  im.src = `assets/${path}/${i}.png`;
}

const IMG = {};
function sprite(path) {
  if (IMG[path] !== undefined) return IMG[path] || null;
  const im = new Image();
  im.onload  = () => { IMG[path] = im; };
  im.onerror = () => { IMG[path] = null; };   // 없으면 영영 안 묻는다
  IMG[path] = null;
  im.src = "assets/" + path + ".png";
  return null;
}
/* ══ 물들인 시체 사본 ══ 개체마다 색을 흔들되 **매 프레임 칠하지는 않는다** —
   백 구를 그릴 때마다 합성하면 그리기가 통째로 무거워진다. (그림 × 색) 조합은 많아야
   열여덟 개뿐이니 **한 번 만들어 두고 계속 쓴다.**
   ★ 아직 원본이 안 왔으면 **캐시에 넣지 않는다** — null 을 굳혀 두면 그림이 온 뒤에도
     영영 얼룩으로만 남는다. */
const TINTED = {};
function corpseArt(sort, ti) {
  /* ★ `__CORPSEOLD` 는 자가 **옛 그림으로 되돌려** 같은 프레임을 두 번 찍는 문이다
     (V-46 · `__BAROLD`·`__GIBOLD` 와 같은 결). 판을 세우고 이 값만 갈면 시체 한 구까지
     같은 자리에 있는 두 장이 나온다 — 이어 찍으면 다른 시체를 재게 된다
     ([[same-seed-is-not-same-run]]). 켜지 않으면 옛 그림은 **받아오지도 않는다.** */
  const oldArt = !!globalThis.__CORPSEOLD && sort === "bones";
  const key = sort + ":" + ti + (oldArt ? ":old" : "");
  if (TINTED[key]) return TINTED[key];
  const im = sprite("fx/corpse_" + sort + (oldArt ? "_old" : ""));
  if (!im) return null;
  const t = CORPSE_TINT[ti | 0];
  if (!t) return (TINTED[key] = im);
  const c = document.createElement("canvas");
  c.width = im.width; c.height = im.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(im, 0, 0);
  /* source-atop 이라 **원래 그려진 자리에만** 얹힌다 — 투명한 배경은 안 물든다
     (예전에 배경째 칠해 네모난 얼룩이 생긴 적이 있다). */
  g.globalCompositeOperation = "source-atop";
  g.globalAlpha = t[1]; g.fillStyle = t[0];
  g.fillRect(0, 0, c.width, c.height);
  return (TINTED[key] = c);
}
/* ══ 걸음·공격 ══ **8방향 스프라이트를 재생한다**(js/sprite8.js).
   전에는 한 장을 부위로 잘라 흔들었다(js/rig.js) — PixelLab 8방향 프레임이 못 쓸 것이라
   여겼기 때문이다. 이제 걷기 6프레임·공격 6프레임이 8방향 전부로 실제로 구워져 있어
   그것을 그대로 튼다. 방향이 그림에 들어 있으니 **좌우 뒤집기는 하지 않는다.** */
/** 휘두름 진행도(p 0→1)를 **프레임 번호**로. 들었다가(느리게) · 후려치고(빠르게) ·
 *  거둔다(느리게) — 그 결이 비율에 있다.
 *
 *  ★★ 예전엔 이 결을 **여섯 칸으로 못박고** 종의 프레임 수에 나눠 맞췄다:
 *      `idx = round(k * (nf-1) / 5)`.
 *      6장짜리는 맞았지만 **7장짜리는 3번이 영영 안 나왔다**(0,1,2,4,5,6).
 *      해골·구울·해골궁수가 다 7장이라, 셋 다 휘두름 한가운데가 빠진 채 돌고 있었다.
 *      결을 칸이 아니라 **곡선**으로 두고 프레임 수만큼 다시 뽑는다 — 몇 장이든
 *      한 장도 안 빠지고, 타격 칸에 오래 머무는 성질은 그대로다. */
const SWING_SHAPE = [0, 0.18, 0.36, 0.50, 0.72, 0.86];   // 여섯 점을 지나는 곡선
export function swingFrame(p, nf) {
  if (nf <= 1) return 0;
  let idx = 0;
  for (let j = 1; j < nf; j++) {
    const x = j / (nf - 1) * (SWING_SHAPE.length - 1);   // 곡선 위의 자리
    const i = Math.min(SWING_SHAPE.length - 2, Math.floor(x)), t = x - i;
    const start = SWING_SHAPE[i] + (SWING_SHAPE[i + 1] - SWING_SHAPE[i]) * t;
    if (p >= start) idx = j;
  }
  return idx;
}

/** 소환수가 쓰는 그림 경로 — 지배한 놈은 원래 적의 그림을 그대로 쓴다. */
const ubase0 = (u) => u.art || ("minion/" + u.kind);

/** 걷기 한 바퀴에 가는 거리 = **제 몸 폭의 이만큼.** 짧으면 발만 동동거리고(미끄러짐),
 *  길면 성큼성큼 뛴다. 고치기 전 값은 0.84 였다. */
const WALK_PER_BODY = 1.8;
/** 걷는 동안 **적어도 이만큼은** 프레임을 넘긴다(초당). 거리로만 세면 몸에 견줘 느리게
 *  걷는 놈은 한 바퀴에 4초가 걸려 다리가 멎고 **떠다니는 것처럼** 보인다(병수님 2026-08-13
 *  06:27). 7장 기준 한 바퀴 ≈1.1초 — 사람 눈이 걷는 것으로 읽는 박자다.
 *  ★ 거리 박자를 **버리지 않고 둘 중 빠른 쪽**을 쓴다. 빨리 달릴 땐 거리가 이겨서 발이
 *    땅을 놓치지 않고, 느릴 때만 이 바닥이 받쳐 준다(느린 골렘도 걷기는 한다). */
const MIN_STEP_FPS = 6.5;

/** **배어 나오는 알파** — 몸도 바도 이 하나를 쓴다. 따로 쓰면 또 갈린다
 *  (V-65: 바가 이 값을 안 봐서 빈 땅에 임자 없는 막대가 떴다 — [[carry-fixes-forward]]).
 *
 *  ★★ **V-82 — 배어 나오는 시간이 «그 놈이 사는 시간»보다 길었다.**
 *  관문 주인의 `born0` 은 2.6초인데, 4분을 재니(tools/v82_lord_alpha.mjs) 주인 열여섯이
 *  **다 합쳐 12.0초**를 살았고 그중 **9.5초(79%)를 흐린 채**로 보냈다. 최고 알파가
 *  0.9 에 못 미친 채 치워진 주인이 **7/16 기** — 켜서 보는 사람은 관문의 주인을
 *  **온전한 몸으로 한 번도 못 봤다.** 사진에서 보스 몸 너머로 바닥 무늬가 비친 것이
 *  그것이다.
 *  `born0` 은 **못 건드린다** — 수법 시계와 걸음 보정을 갚는 저울이라(battle.js 의
 *  「따로 갚는다」) 줄이면 관문 난이도가 통째로 움직인다. 그러니 **보는 것과 세는 것을
 *  가른다**: 흐림은 `BORN_FADE` 만큼만 쓰고, `born` 은 예전 그대로 2.6초를 센다.
 *  ★ 졸개(`born0` 0.4)는 **글자 그대로 예전과 같다** — 0.4 < 0.55 라 상한에 안 걸린다.
 *  ★ `__BORNFADE_OFF` 는 자가 옛 그림으로 되돌려 같은 판을 두 번 재는 문이다
 *    (`__BAROLD` · `__V81_OLD` 와 같은 결). */
/** ══ 수의 **자릿점** ══ (V-97)
 *  이 게임에는 수를 적는 결이 둘 있다. `num()`(core.js)은 「1.7k」로 줄여 **좁은 자리**에
 *  놓고, `toLocaleString()`은 「1,720」으로 **정확한 값**을 놓는다. 값·가격처럼
 *  «세어 볼 수 있어야 하는 수»는 뒤쪽이다 — V-95 가 정산에서 내린 판정이 그것이다.
 *  그런데 그 못이 정산에만 박혀서, 상인·대장간·무덤 파기의 **가격**과 늘 떠 있는
 *  **경험치 분수**는 날것으로 남아 있었다([[carry-fixes-forward]]).
 *  ★ `__NFMT_OLD` 는 자가 **옛 결로 되돌려** 같은 화면을 두 번 재는 문이다
 *    (`__BAROLD` · `__BORNFADE_OFF` 와 같은 결 · tools/v97_digits.mjs). */
export const gnum = (v) => globalThis.__NFMT_OLD ? String(v | 0) : (v | 0).toLocaleString();

/** ══ 짝은 **한 낱개로** 꺾인다 ══ (V-99)
 *  「신발 +0」이 「신발」과 「+0」으로 갈려 다른 줄에 앉는다 — 병수님이 2026-08-12 에
 *  「어중간하게 꺾인다」고 하신 그 결함이다. 그때 못은 **정산(drawEnd)에만** 박혔고
 *  같은 꼴로 적히는 툴팁 줄에는 안 옮겨졌다([[carry-fixes-forward]]).
 *  이름과 값을 한 낱개(`.u` · `white-space:nowrap`)로 싸면 그 사이가 안 꺾인다.
 *  가르는 「·」는 **앞 낱개에 붙여** 둔다 — 꺾여도 「·」가 홀로 줄머리에 안 선다
 *  (정산은 「·」를 빼고 칸 사이를 벌렸는데, 여기는 짝이 열 개라 가르는 표가 있어야 읽힌다).
 *  ★ `__PAIROLD` 는 자가 **옛 결로 되돌려** 같은 화면을 두 번 재는 문이다
 *    (`__NFMT_OLD` 와 같은 결 · tools/v99_wrap.mjs). */
export const pairs = (list) => globalThis.__PAIROLD ? list.join(" · ")
  : list.map((s, i) => `<span class="u">${s}${i < list.length - 1 ? " ·" : ""}</span>`).join(" ");

export const BORN_FADE = 0.55;
export const bornAlpha = (e) => {
  if (!(e && e.born > 0)) return 1;
  const bd = e.born0 || 0.4;
  const fade = globalThis.__BORNFADE_OFF ? bd
             : Math.min(bd, globalThis.__BORNFADE != null ? +globalThis.__BORNFADE : BORN_FADE);
  /* **선 지 얼마나 됐나**로 잰다(남은 시간이 아니라). 남은 시간을 짧은 자로 나누면
     0.05 에 눌러앉았다가 마지막에 튀어오른다 — 방향이 거꾸로다. */
  const el = bd - e.born;
  return Math.max(0.05, Math.min(1, el / fade));
};

function drawOne(base, x, gy, h, fallback, e) {
  /* **막 나타난 놈은 어둠에서 배어 나온다.** 시차만 두고 툭 세우면 여전히 갑작스럽다 —
     배어 나오는 내내 흐리게 시작해 짙어진다. 그림자도 같이 옅어야 발밑만 먼저 뜨지 않는다.
     ★ 배어 나오는 시간은 개체마다 다르다(관문 보스 0.8 · 졸개 0.4) — born0 로 잰다.
     예전엔 0.4 를 박아 둬서 보스를 길게 배어 나오게 해도 앞 절반이 통째로 옅게 눌렸다. */
  const born = bornAlpha(e);
  if (born < 1) { ctx.save(); ctx.globalAlpha = born; }

  // 상태: 휘두르는 중 > 걷는 중 > 서 있음. 방향은 dx,dy(공격 땐 내지르는 sdx,sdy).
  let state = "idle", dir = "south", frameIdx = 0;
  if (e) {
    if (e.swing > 0) {
      state = "attack";
      /* 공격 프레임은 **swing 진행도**로. swing 은 SWING_T 에서 0 으로 준다.
         ★ 예전엔 6프레임에 **똑같이** 나눴다. 그런데 실제 휘두름은 고르지 않다 —
         **들었다가(느리게) · 후려치고(빠르게) · 거둔다(느리게).** 균등 배분하면 팔이
         일정한 속도로 도는 기계가 된다. 타격 칸(3)에 제일 오래 머물게 나눈다. */
      const p = 1 - e.swing / SWING_T;                 // 0 → 1
      /* 구간 비율은 그대로 두고 **프레임 수만 종에 맞춘다** — 6장짜리와 7장짜리가
         섞여 있어서(v3 애니는 종마다 다르다) 숫자를 박으면 한쪽이 어긋난다.
         타격 칸이 제일 길다는 성질은 비율에 있으므로 장수가 늘어도 유지된다. */
      const nf = frameCount(base, "attack");
      frameIdx = swingFrame(p, nf);
      dir = e.sdx !== undefined ? dirName(e.sdx, e.sdy) : dirName(e.dx ?? 0, e.dy ?? 1);
    } else if (e.moving > 0) {
      state = "walk";
      /* 걷기 프레임은 **지나온 거리**로(시간 아님) — 느린 골렘은 저절로 느리게 딛는다.
         ★★ 그런데 **한 바퀴에 가는 거리가 너무 짧았다.** 옛 값(h*0.14*2π)은 예전
         리깅의 박자를 물려받은 것인데, 재 보니 한 바퀴에 **제 몸 폭의 0.84배**밖에
         못 갔다 — 사람이 걸으면 두 걸음에 몸 폭의 두 배쯤 간다. 그래서 다리는
         분주한데 몸은 안 나가는, 곧 **미끄러지는** 그림이 됐다(병수님이 여러 번
         말한 「이동이 부자연스럽다」의 정체).
         이제 **제 몸 폭에서 뽑는다** — 종이 달라도, 판 배율이 달라도 저절로 맞는다. */
      const nf = frameCount(base, "walk");
      const fmw = footMetrics(base), G = window.__geo;
      /* h 는 화면 픽셀, walked 는 월드 거리 → 몸 폭을 월드로 되돌려서 견준다 */
      const bodyW = G && G.sc ? h * (fmw ? fmw.bodyWidthFrac : 0.5) / G.sc : h;
      const stride = bodyW * WALK_PER_BODY / nf;
      /* 둘 다 **한 방향으로만 는다** — max 를 써도 뒤로 튀지 않는다. */
      const byDist = (e.walked || 0) / stride, byTime = (e.moveT || 0) * MIN_STEP_FPS;
      frameIdx = Math.floor(Math.max(byDist, byTime)) % nf;
      dir = dirName(e.dx ?? 0, e.dy ?? 1);
    } else {
      dir = dirName(e.dx ?? 0, e.dy ?? 1);
    }
  }

  /* ★ 검수 훅 — `window.__ANIM` 이 배열일 때만 적는다(평소엔 조건 하나로 끝난다).
     움직임이 어색한지는 **그려진 상태**를 봐야 안다: 걷는데 서 있는 그림인지,
     휘두르는데 한 칸만 스치는지, 방향이 튀는지. 밖에서는 볼 길이 없어서 여기서 낸다. */
  if (window.__ANIM && e) window.__ANIM.push({ id: e.id, base, state, f: frameIdx, dir,
                                               mv: +(e.moving || 0).toFixed(2), sw: +(e.swing || 0).toFixed(2),
                                               bob: +(e.bob || 0), sway: +(+(e.sway || 0)).toFixed(2),
                                               /* 그 프레임에 적이 몇이었나 — 「적이 없을 때 둘러보는가」는
                                                  적이 있던 프레임을 빼고 세어야 답이 나온다(자를 쓸어도
                                                  다음 적이 그 사이에 서므로 방향이 저절로 돌아 버린다). */
                                               mobs: (window.__ANIM_MOBS ? (S.mobs ? S.mobs.length : 0) : undefined) });

  /* 맞은 순간엔 **뒤로 밀린다**(기존 그대로). 흰 번쩍임은 예전에 뺐다 — 밀림 + 닿는 자리의
     불꽃(fx)으로 충분하다. */
  let fx2 = 0, fy2 = 0;

  /* **때리는 놈도 움직인다.** 붙어 서서 팔만 흔들면 그림이 제자리를 맴돈다 —
     뒤로 몸을 빼며 들었다가(–) 타격 칸에서 앞으로 내지르고(+) 다시 돌아온다.
     맞는 놈이 뒤로 밀리는 것과 **반대 방향**이라 둘이 합쳐져 부딪힌 느낌이 난다. */
  /* **그림이 안 움직이면 코드가 대신 움직인다.** 골렘 공격 다섯 장은 거의 같은 자세라
     (실루엣 변화 0.30 — 해골 0.75 · 졸개 1.2) 프레임을 어떻게 태워도 때리는 것이
     안 읽혔다. 종 이름을 박는 대신 **그림에서 굳은 정도를 재서**(swingGain) 그만큼
     몸짓을 키운다 — 잘 움직이는 놈은 1.0 이라 화면이 하나도 안 바뀌고, 굳은 놈만
     크게 쓴다. 새로 구운 놈이 또 굳게 나와도 저절로 걸린다. */
  let tilt = 0, stretch = 0, swx = 0, swy = 0;
  if (e && e.swing > 0 && e.sdx !== undefined) {
    const p = 1 - e.swing / SWING_T;
    const push = p < 0.5 ? -0.05 * (p / 0.5)                    // 들면서 뒤로
               : p < 0.62 ? -0.05 + 0.23 * ((p - 0.5) / 0.12)   // 후려치며 앞으로
               : 0.18 * (1 - (p - 0.62) / 0.38);                // 거두며 제자리로
    const gain = swingGain(base);
    swx = e.sdx * h * push * gain;
    swy = e.sdy * h * push * gain * 0.55;                       // 세로는 눌린 만큼 덜
    fx2 += swx; fy2 += swy;
    /* 내지르기만 키우면 **미끄러진다** — 자세가 그대로인 채 통째로 움직이니까.
       굳은 만큼 **뒤로 젖혔다가 앞으로 찍는다**: 기울기(몸통) + 눌림(무게).
       셋이 같이 가야 「들었다 → 내리쳤다」로 읽힌다. 굳지 않은 종은 extra=0 이라 없다. */
    const extra = gain - 1;
    if (extra > 0.02) {
      const lean = p < 0.5 ? -0.08 * (p / 0.5)                    // 젖히며 뒤로
                 : p < 0.62 ? -0.08 + 0.28 * ((p - 0.5) / 0.12)   // 찍으며 앞으로
                 : 0.20 * (1 - (p - 0.62) / 0.38);
      tilt = e.sdx * extra * lean;                                // 치는 쪽으로 기운다
      stretch = extra * (p < 0.5 ? 0.07 * (p / 0.5)               // 들며 솟았다가
                       : p < 0.62 ? 0.07 - 0.19 * ((p - 0.5) / 0.12)   // 내리찍으며 눌리고
                       : -0.12 * (1 - (p - 0.62) / 0.38));        // 제자리로
      /* ★★ **정면이 제일 안 읽힌다** — 병수님이 본 것이 이 각도다. 옆으로 칠 때는
         기울기가 다 말해 주지만(sdx 가 1), 아래로 칠 때는 sdx≈0 이라 기울기가 없고
         내지르기마저 눌린 세로(×0.55)로 줄어 **거의 제자리**가 된다.
         그래서 정면일수록 **눌림을 대신 키운다** — 옆에서 몸을 젖히는 대신
         정면에서는 무게를 아래로 떨군다. 두 각도가 같은 크기로 읽히게 하는 몫이다. */
      stretch *= 1 + (1 - Math.min(1, Math.abs(e.sdx))) * 0.9;
    }
  }
  if (e && e.flinch > 0) {
    const t = e.flinch / 0.18;
    /* ★ 밀리는 양은 **한 방이 제 몸에서 차지하는 몫**만큼(battle 의 knockOf).
       예전엔 누구나 키의 14% 였고, 여섯 기가 붙으면 움찔이 끝나기 전에 새로 걸려
       큰 놈이 톱니처럼 앞뒤로 떨었다(병수님: "맞으면 뒤로 물러나고 ... 쭉 와야"). */
    const k = e.knock ?? 1;
    fx2 = -(e.kx || 0) * h * 0.14 * t * k; fy2 = -(e.ky || 0) * h * 0.07 * t * k;
  }
  /* **서 있는 그림이 한 장뿐인 놈은 코드가 대신 숨을 쉰다**(e.bob, 화면 픽셀).
     몸만 내리고 **그림자는 두고 간다** — 그림자까지 같이 오르내리면 발이 땅에서
     떨어져 통째로 들썩이는 것으로 보인다(모닥불은 떠도 되지만 사람은 땅을 딛는다).
     그래서 밀림(flinch)과 같은 자리에 얹는다 — 그쪽도 몸만 움직이는 몫이다. */
  if (e && e.bob) fy2 += e.bob;
  /* **좌우 무게 이동**(e.sway, 화면 픽셀) — bob 과 같은 자리, 같은 규칙(몸만·그림자는 땅에).
     걷기 프레임을 안 틀고 살아 있게 하는 유일한 길이다. 그림자까지 같이 움직이면
     다리가 안 도는 채로 미끄러져서 그게 곧 「떠다닌다」가 된다(08-13 에 배운 자리). */
  if (e && e.sway) fx2 += e.sway;

  /* 접지 그림자 — 스프라이트보다 **먼저**, 발밑에 깐다(그림이 그 위에 온다). 밀림(flinch)과
     무관하게 바닥에 고정한다 — 몸만 뒤로 밀리고 그림자는 제자리라야 맞은 티가 난다.
     폭은 발 폭(footWidthFrac)에 맞춘다 — 골렘은 넓게, 해골은 좁게. */
  /* **땅을 뚫고 올라오는 중**이면 아직 반쯤 묻혀 있다 — 그림자도 그만큼 작다.
     (시체를 써서 세운 것이므로 그 자리에는 먼지도 같이 인다 — fx "rise") */
  const rise = e && e.rise > 0 ? 1 - e.rise / RISE_T : 1;
  const fm = footMetrics(base);
  const shr = (fm ? h * fm.footWidthFrac * 0.55 : h * 0.3) * (0.35 + 0.65 * rise);
  /* ★ **내지를 때는 그림자도 따라간다**(밀릴 때는 아니다 — 위 규칙 그대로).
     내지르기를 키우고 나니 골렘이 제 그림자를 통째로 두고 나가 **떠 보였다**.
     내지르기는 제가 밟고 나가는 것이라 발이 옮겨 가고, 밀림은 몸만 젖혀지는 것이다 —
     그래서 앞의 것만 그림자를 데려간다. 70%만 따라가 발이 끌리는 맛을 남긴다. */
  const shdx = e && e.flinch > 0 ? 0 : swx * 0.7, shdy = e && e.flinch > 0 ? 0 : swy * 0.7;
  ctx.fillStyle = "rgba(0,0,0,.42)";
  ctx.beginPath(); ctx.ellipse(x + shdx, gy + shdy, shr, shr * 0.34, 0, 0, 6.284); ctx.fill();

  ctx.save();
  if (rise < 1) {
    /* **바닥선 아래를 잘라 내고** 몸을 그만큼 내려 그린다 — 땅에서 솟는 것으로 보인다.
       툭 나타나는 것과의 차이는 이 반 초뿐인데, 그 반 초가 「내가 불러냈다」를 만든다. */
    ctx.beginPath(); ctx.rect(x - h, gy - h * 1.8, h * 2, h * 1.8); ctx.clip();
    ctx.translate(0, h * (1 - rise) * 0.95);
    ctx.globalAlpha *= 0.5 + 0.5 * rise;
  }
  ctx.translate(fx2, fy2);
  /* 기울임·눌림은 **발밑을 축으로** 준다 — 그림 한가운데를 축으로 돌리면 발이 땅에서
     떠서 미끄러진다. 접지 그림자는 이 save 바깥(위)에서 이미 그렸으므로 같이 안 기운다. */
  if (tilt || stretch) {
    ctx.translate(x, gy); ctx.rotate(tilt);
    ctx.scale(1 - stretch * 0.35, 1 + stretch);                 // 커지면 홀쭉, 눌리면 퍼진다
    ctx.translate(-x, -gy);
  }
  /* 갈래(V-7) — 적만 vr 을 달고 온다. 아군·마을 사람은 undefined 라 원본 그대로다. */
  const drew = drawSprite8(ctx, base, dir, state, frameIdx, x, gy, h, e && e.vr ? clanOf(e).f : null);
  /* ★ V-25 자 — **몸 네모도 그리는 자리에서 모은다**(바 네모와 같은 규칙).
     바가 「제 몸 위」에 있는지 「남의 몸 위」에 있는지는 몸의 자리를 알아야 갈린다.
     식은 barAt 과 **같은 것**을 쓴다(머리끝·몸 폭) — 밖에서 다시 쓰면 갈린다. */
  if (window.__RECTS && window.__RECTS.bodies) {
    const bw = h * (fm ? fm.bodyWidthFrac : 0.5);
    const hy = gy - h * (1 - (fm ? fm.headFrac : 0)) + (fm ? h * fm.footFrac : 0);
    window.__RECTS.bodies.push([Math.round(x - bw / 2), Math.round(hy), Math.round(bw), Math.round(gy - hy), x, gy]);
  }
  ctx.restore();
  if (!drew) {
    // 그림이 아직 하나도 없으면 색 덩어리로 — 판이 멈추지 않게(기존 폴백 그대로)
    ctx.fillStyle = fallback;
    ctx.beginPath(); ctx.ellipse(x, gy - h * 0.4, h * 0.26, h * 0.4, 0, 0, 6.284); ctx.fill();
  }
  if (born < 1) ctx.restore();
}

/* ══ 네크로멘서의 **표식** ══ 발밑 소환진(웅덩이 + 이중 고리) + 몸 뒤의 보랏빛.
   ──────────────────────────────────────────────────────────────
   ★ **마을과 던전이 같은 함수를 쓴다.** 던전에만 이 표식이 있어서 병수님이
     「네크로멘서 색이 마을과 던전에서 다르다(마을 파랑 · 던전 보라)」고 하셨다.
     화소를 재 보니 **로브 색은 두 화면이 한 톨도 안 다르다**((59,49,96)·(54,42,93)
     둘 다 같다) — 다른 것은 옷이 아니라 **그가 딛고 선 빛**이었다. 던전에서는
     보랏빛 웅덩이 안에 서 있고, 마을에서는 모닥불의 누런 흙 위에 서 있으니
     같은 보라가 한쪽에서는 남색으로 읽힌 것이다.
     그래서 **색을 칠하지 않고 표식을 옮긴다** — 마을에도 같은 진을 깔되 세기만 낮춘다
     (쉬는 중이니 옅고 느리게). 값을 베껴 적으면 한쪽만 고치게 되므로 함수 하나다.
   opt: gain 세기(마을 0.45) · danger 위태로움(붉게) · cast 시전 진행도 · R 반지름 상한 */
function necroSigil(ctx, x, gy, hh, t, squash, us, opt = {}) {
  const gain   = opt.gain ?? 1;
  const danger = !!opt.danger, cast = opt.cast || 0;
  const RGB    = danger ? "214,58,44" : "150,96,232";   // 위태로우면 붉게 물든다
  const spin   = danger ? 5.0 : 1.6;                    // 위태로우면 맥동이 빨라진다
  const pulse  = 0.5 + 0.5 * Math.sin(t * spin);
  const hot    = (0.55 + 0.45 * pulse) * gain;
  const boost  = (cast > 0 ? 0.5 : 0) * gain;           // 시전하는 동안 소환진이 밝아진다
  const R      = opt.R ?? hh * 0.62;

  ctx.save();
  ctx.translate(x, gy); ctx.scale(1, squash);   // 바닥면으로 눕혀 회전이 SQUASH 를 안 깬다
  /* 땅에서 배어 나오는 보라 웅덩이 */
  const pool = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.18);
  pool.addColorStop(0, `rgba(${RGB},${0.32 * hot + boost * 0.34})`);
  pool.addColorStop(0.6, `rgba(${RGB},${0.13 * hot})`);
  pool.addColorStop(1, `rgba(${RGB},0)`);
  ctx.fillStyle = pool;
  ctx.beginPath(); ctx.arc(0, 0, R * 1.18, 0, 6.2832); ctx.fill();
  /* 이중 고리 — 조각난 호로 그려야 회전이 눈에 보인다(민 원은 돌아도 안 보인다).
     바깥은 느리게 시계방향, 안쪽은 반대로 조금 빠르게 — 조각 수도 달라 둘이 갈린다. */
  const arcRing = (rad, rot, segs, lw, a) => {
    ctx.strokeStyle = `rgba(${RGB},${a})`; ctx.lineWidth = lw; ctx.lineCap = "round";
    const st = 6.2832 / segs;
    for (let i = 0; i < segs; i++) { const g0 = rot + i * st;
      ctx.beginPath(); ctx.arc(0, 0, rad, g0, g0 + st * 0.55); ctx.stroke(); }
  };
  const lw = Math.max(1.2, us * 1.3);
  arcRing(R,        t * 0.35, 10, lw,       0.5 * hot + boost * 0.4);
  arcRing(R * 0.64, -t * 0.52, 7, lw * 0.9, 0.55 * hot + boost * 0.4);
  /* 시전한 순간이 발밑에 온다 — 고리 하나가 바깥으로 퍼지며 사라진다(pswing 이 사는 동안). */
  if (cast > 0) {
    const cp = 1 - cast;                           // 0 → 1
    ctx.globalAlpha = 0.55 * (1 - cp) * gain;
    ctx.strokeStyle = `rgba(${RGB},0.9)`;
    ctx.lineWidth = Math.max(1.5, us * 1.8 * (1 - cp * 0.5));
    ctx.beginPath(); ctx.arc(0, 0, R * (1 + 1.4 * cp), 0, 6.2832); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  /* 어둠에서 떼어낸다 — 몸 **뒤로** 은은한 보랏빛을 얹어 어두운 바닥과 가른다.
     덧칠이 아니라 뒷광이라(몸은 이 다음에 그린다) 실루엣을 뭉개지 않는다. */
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const aura = ctx.createRadialGradient(x, gy - hh * 0.35, 2, x, gy - hh * 0.35, hh * 0.72);
  aura.addColorStop(0, `rgba(${RGB},${0.16 * hot + boost * 0.2})`);
  aura.addColorStop(1, `rgba(${RGB},0)`);
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.ellipse(x, gy - hh * 0.35, hh * 0.42, hh * 0.72, 0, 0, 6.2832); ctx.fill();
  ctx.restore();
}

/* ══ 판을 **위에서 비스듬히** 본다 ══
   사방에서 오는 판이라 옆에서 보면 앞뒤가 겹쳐 아무것도 안 읽힌다. 그렇다고 정확히
   위에서 보면 **옆모습으로 구운 스프라이트**가 누워 버린다(디아블로 2 도 같은 이유로
   비스듬히 본다). y 를 눌러(SQUASH) 바닥을 눕히고, 그림은 세워서 세운 채로 얹는다 —
   흔히 쓰는 2.5D 다. 그리는 순서는 **y 가 작은 것부터**라야 앞의 것이 뒤를 가린다. */

/* **무대 위로 겹쳐 있는 것들의 맨 윗금**(V-16 · 2026-08-24). 판(HUD)의 키만 빼면
   로그 띠·메뉴 줄이 셈에서 빠져, 거기 서는 몸이 허리에서 잘린다.
   `draw` 는 매 프레임 도는 자리라 **모양이 바뀔 때만** 다시 잰다(창 크기·판 키).
   창이 떠 있는 동안 로그는 `display:none` 이라 키가 0 이 되는데, 그때 띠가 늘어나면
   **가방을 열 때마다 무대가 출렁인다** — 그래서 마지막으로 잰 값을 그대로 쓴다. */
let _ovKey = "", _ovTop = 0;
/* ★★ V-75 — **떠오르는 숫자가 위 띠(`#top`)를 타고 올라가 「60층」·「금 81k」 위에
   겹쳐 그려진다.** 무대는 `position:fixed; top:0` 이라 캔버스가 띠 **밑까지** 깔려
   있는데, 숫자는 `py(y) - lift` 로 **위로 자라기만** 해서 화면 꼭대기에 몸이 서면
   글자가 띠 안으로 들어간다. 판 위 숫자가 머리말 위에 얹히면 둘 다 안 읽힌다.
   띠의 밑금은 **DOM 에서 읽는다** — 40/48 을 여기 다시 적으면 CSS 와 갈린다
   ([[seam-not-values]] · `overlayTop` 과 같은 결로 재 두고 쓴다). */
let _hbKey = "", _hbBot = 0;
function headBot(h) {
  const key = String(h);
  if (key === _hbKey && _hbBot > 0) return _hbBot;
  const el = document.getElementById("top");
  const r = el && el.getBoundingClientRect();
  if (r && r.height > 0) { _hbKey = key; _hbBot = r.bottom; }
  return _hbBot;
}
function overlayTop(h, panelH) {
  const key = h + "x" + panelH;
  if (key === _ovKey && _ovTop > 0) return _ovTop;
  let top = h - panelH;
  for (const id of ["log", "hudMenu"]) {
    const el = document.getElementById(id); if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top > 0) top = Math.min(top, r.top);
  }
  if (top > 0 && top < h - panelH) { _ovKey = key; _ovTop = top; }
  return _ovTop > 0 ? _ovTop : (h - panelH);
}

function draw(dt) {
  const w = cvW, h = cvH;   /* ← fit() 이 재 둔 값. 여기서 읽으면 매 프레임 레이아웃이 강제된다 */
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  /* ══ 판 흔들림 ══ 관문 보스가 서는 순간(S.shake) **캔버스 전체를** 아주 짧게 흔든다.
     ★ 여기 draw 초입에서 translate 로 **한 번만** 준다 — px()/py() 를 쓰는 자리를
     각각 고치면 소환진·체력바·숫자가 따로 놀아 어긋난다. HUD·벨트는 DOM 이라 저절로
     안 흔들린다(캔버스만). 명패 오버레이는 아래 drawArrive 가 좌표계를 다시 고정해 뺀다. */
  if (S.shake > 0) {
    const s = S.shake / 0.25;                       // 1 → 0 으로 잦아든다
    const amp = 4 * s;                              // 최대 4px(스크린), 끝에서 0
    ctx.translate(Math.cos(S.t * 90) * amp, Math.sin(S.t * 118) * amp);
  }

  /* ══ 화면을 꽉 채우는 스케일 ══ 세로 화면에서는 **폭이 스케일을 묶는다**(판이 가로로 먼저
     꽉 찬다). 그러면 세로가 통째로 남아 인물이 가운데 눌리고 위아래가 검다 — 병수님이 본 그것.
     남는 세로를 쓰려면 바닥의 눌림(SQUASH)을 화면비에 맞춰 **키운다**: 세로가 길수록 판을 더
     둥글게 펴서 세로를 먹는다. 다만 스프라이트는 세운 채(2.5D)라 SQUASH 는 상한을 둔다 —
     1 에 가까우면 바닥이 정면(탑다운)이 되어 옆모습 그림이 누워 버린다. */
  /* ══ **실제 맵은 정해진 폭까지만** ══ (병수님 2026-08-17 23:37
     「게임화면이 좌우로 무한정 늘어나는거 말고, 어느정도 너비만 실제 맵으로 채우고,
       나머지는 패턴이나 단순한 타일을 까는 방법 있지 않나?」)
     ★ 08-16 에 내가 무대에 상한(1120px)을 두었다가 「화면이 작다」는 말을 듣고 걷었는데,
       걷고 나니 이번엔 **끝없이 퍼졌다.** 둘 다 옳다 — 걸린 것은 **무대**가 아니라
       **맵**이었다. 무대(칠하는 넓이)는 화면 전체로 두고, **싸움이 벌어지는 띠**만 묶는다.
     ★ 배율(`scByW`)도 **맵 폭**으로 잰다. 창 폭으로 재면 창을 늘릴수록 판이 커져서
       (SC_MAX 에 닿기 전까지) 「무한정 늘어난다」가 그대로 돌아온다.
     ★ 판(HUD)이 이제 무대 위에 겹치므로 **세로도 판만큼 뺀 넓이**로 잰다 — 안 그러면
       눌림(squash)이 판 밑에 깔린 자리까지 세어 인물이 위로 몰린다. */
  const MAP_MAX = 1180;                                  // 맵 띠의 최대 폭(스크린 px)
  const mapW = Math.min(w, MAP_MAX);
  const panelH = parseFloat(getComputedStyle(document.documentElement)
                   .getPropertyValue("--panelH")) || 184;
  /* ★★ **「빈 띠」는 판(HUD)만이 아니다** (V-16 · 2026-08-24). `h - panelH` 로 잡으면
     657 이 나오는데, 그 안에 **무대 위로 겹쳐 있는 것이 둘 더** 있다 — `#log`(z 15)와
     `#hudMenu`(z 29). 1512×863 에서 로그의 윗금이 **569** 라, 셈한 띠의 아래 88px 은
     실제로는 가려진 자리였다. 나타나는 둘레의 밑이 626 이니 거기 서는 몸은
     **허리 아래가 통째로 로그 밑으로 들어갔다**(`tmp/v16_crop.png`).
     그래서 띠의 끝을 **겹치는 것의 맨 윗금**으로 잡는다 — 재는 자리와 보이는 자리를
     맞춘다([[threshold-and-ruler-must-match]]). */
  const freeH = Math.max(240, Math.min(h - panelH, overlayTop(h, panelH)));
  const MARGIN = 0.05;                                   // 바깥 여백(양쪽 각 5%)
  const scByW = (mapW * (1 - MARGIN * 2)) / (RING_SPAWN * 2);
  /* ★★ 병수님: "좌우 화면 넓어졌을때도 고려해라 모바일도 좋은데 PC로 했을때도".
     예전엔 화면이 커진 만큼 **배율만 커졌다**(1440 폭에서 sc 2.07 — 모바일의 세 배).
     그래서 PC 에서는 바닥 타일이 거대해지고 조명 계단이 뭉텅이가 되고, 보이는 넓이는
     모바일과 똑같았다. **화면이 넓어지면 확대할 게 아니라 더 넓게 보여야 한다** —
     디아블로도 그렇다. 그래서 배율에 상한을 둔다. 남는 폭은 시야가 가져간다.
     상한 1.05 는 인물 배율(us)이 상한 1.85 에 닿는 지점 언저리라, 더 키워도
     인물은 안 커지고 바닥만 성겨진다. */
  /* ★ PC 기준으로 다시 잡는다. 시야는 넓게 두되(끝없는 맵) 인물이 콩알이 되면
     무엇이 싸우는지 안 보인다 — 1.05 는 모바일에서 넘어온 값이었다. */
  /* ★★ **W-2 (2026-08-24) — 싸움이 «붉은 덩어리» 하나로 보인다.**
     1512 폭 PC 로 찍어 보니 sc 도 us 도 **둘 다 상한에 붙어 있었다**(1.05 / 1.35).
     414 폭 휴대폰에서도 scByW 가 0.98 이라 **같은 값**이 나온다 — 즉 싸움터는
     PC 든 폰이든 **똑같이 400px** 로 그려지고, PC 에서는 그 둘레에 빈 돌바닥만
     3.6 배 더 깔렸다. 「보이는 넓이는 모바일과 똑같았다」를 08-16 에 고쳤다고
     적어 두었는데, 고쳐진 것은 **시야**뿐이고 **싸움 자체**는 폰 크기 그대로였다.
     싸움터(RING_SPAWN 190 → 지름 380)가 맵 띠(1180)의 **27%** 밖에 안 됐다.
     ★ 겹침은 손대지 않는다 — 병수님이 두 번 「더 겹쳐도 될듯」이라 하셨고
       (TOUCH_K 0.8→0.6→0.5 · FOOT_R 0.62→0.40) 그 값들은 재서 얻은 것이다.
       손대는 것은 **몸집 대비 화면 배율** 하나뿐이다.
     ★ 값은 **네 후보를 같은 씨앗·같은 15초로 찍어 놓고 눈으로 골랐다**
       (`tools/w2_scale_shot.mjs 1.05 1.5 1.72 2.0` · tmp/w2_sheet.png):
       1.05 는 콩알, 1.5 는 아직 덩어리, **1.9 부터 누가 내 편인지 읽힌다.**
       제일 큰 것(관문 주인 149)도 같이 봤다(`tools/w2_boss_shot.mjs 50 …`) —
       201px → 373px 로 커지지만 넘치지 않는다.
     ★ 남는 흠: 둘레 **맨 위**에 서는 괴물(h 62)은 머리끝이 화면 위로 40~90px 나간다
       (지금 값에서도 관문 주인은 -18px 로 아슬아슬했다). 관문 주인은 늘 **오른쪽**
       ±23° 에서 서므로(spawnMob 의 a, n=1) 거기엔 안 걸린다. ROADMAP W-2b 에 적어 둔다. */
  const SC_MAX = (globalThis.__SC_MAX != null ? +globalThis.__SC_MAX : 1.90);
  /* ★★ **W-2b (2026-08-24) — 세로 맞춤에 «몸의 키»를 넣는다.**
     여태 세로는 **바닥 타원**만 보고 맞췄다(`freeH*0.9 / (RING_SPAWN*2*squash)`).
     그런데 그림은 발밑에서 **위로** 자란다 — 타원이 꼭 맞으면 머리는 **반드시** 넘친다.
     W-2 로 배율을 1.05 → 1.90 으로 올리자 그 넘침이 눈에 보일 만큼 커졌다.
     `tools/w2b_top_probe.mjs 50` 이 잰 고침 전 머리끝(0 이 화면 위끝, 음수면 잘림):
       1512x863 졸개 -78 · 정예 -103 · **관문주인 -135** · 골렘 -120
       1512x760 은 -130 · -154 · 주인 -187 · -172 / 1920x1080 은 -52 · -73 · -59 · -76
       폰 414x896 만 +55 로 멀쩡했다 — 깨지는 것은 늘 넓은 화면이다.
     ★ **제일 나쁜 것은 둘레 맨 위의 졸개가 아니라 «관문의 주인»이었다.** 주인은 늘
       오른쪽 ±23° 라 세로로는 덜 오르지만, 키가 149 로 졸개의 두 배가 넘는다.
       그래서 「제일 높이 오르는 머리끝」은 **자리 하나가 아니라 몇 자리를 대 보고
       제일 나쁜 것**으로 잡아야 한다([[cause-written-in-the-item-is-a-guess]]).
     ★ 값을 손으로 고르지 않는다 — 키는 전부 **데이터에서 끌어온다**(MOB_H · MINIONS).
       새 몸이 늘면 자리도 저절로 따라온다([[carry-fixes-forward]]). */
  /* ★ **눌림(squash)은 «남는 세로를 채우는 손잡이»다.** 예전 식은 `scByW`(창 폭)로
     나눴는데, 세로 맞춤에 몸의 키가 들어오자 그 폭 의존이 **배율로 새어 나갔다** —
     창을 500px 넓히면 배율이 1.76 → 1.86 으로 커져 「맵이 창을 따라 늘어난다」
     (`arena_qa` ③, 병수님 2026-08-17 「좌우로 무한정 늘어나는거 말고」).
     그래서 **폭을 아예 안 본다**: 폭·상한이 정한 배율(sc0)에서 그림이 세로를 꼭
     채우도록 눌림을 **거꾸로 푼다**. 못 채우면(0.56 바닥) 그때 배율이 줄어든다.
     폰(sc0 0.98)에서는 0.86 상한에 그대로 붙어 예전과 같다. */
  const RMAX = RING_SPAWN + 50;                       // 등장 둘레의 바깥 (spawnMob 의 rad 상한)
  const CHAMP_UP = 1.22;                              // 정예 몸집(battle.js CHAMP_SIZE)
  const BIG_MOB = Math.max(...Object.entries(MOB_H).filter(([k]) => k !== "boss").map(([, v]) => v));
  const BOSS_H = Math.max(MOB_H.boss, Math.round(BIG_MOB * 2.4));   // battle.js bossH 의 상한
  const BIG_MIN = Math.max(...Object.values(MINIONS).map(m => m.h || 0)) * CHAMP_UP;
  /* ★★ **V-13 (2026-08-24) — 세로 맞춤이 «아무도 안 서는 띠»를 재고 있었다.**
     여태 세로는 **등장 둘레의 바깥**(RMAX 240)을 기준으로 맞췄다. 그런데 적은 거기
     **잠깐 나타났다 전부 안으로 들어와** 버티는 둘레(RING_HOLD 150) 언저리에서 싸운다 —
     즉 세로 예산의 한참을 **평생 아무도 안 서는 띠**에 쓰고 있었다.
     그 대가로 배율이 W-2 에서 **눈으로 고른 상한 1.90** 에서 1.70 으로 깎여 있었다
     (1512×863). 그래서 「싸움이 텅 빈 돌바닥 한가운데 손톱만 한 덩어리」로 보였다
     (`tools/v12_crowd_probe.mjs` 1층 20초: 덩어리 379×266 · 넓이몫 14.3%).
     ★ 자리 잡은 것들의 바깥은 **골렘 자리**(RING_HOLD*1.25)다 — 거기를 기준으로 잰다.
       둘레를 도는 적도 RING_HOLD*1.15 안쪽으로 묶여 있다(battle.js 의 rad 상한).
     ★ 다만 **나타나는 순간의 자리(RMAX)는 버리지 않고** 위쪽 경우에 그대로 남긴다 —
       재 보니 그 경우는 안 걸린다(골렘 쪽이 더 높이 오른다). 공짜로 안전하다.
     ★ 싸움 규칙(둘레·마중·겹침)은 손대지 않는다 — D 계열은 잠겼다. 바뀌는 것은 **배율뿐**이다. */
  const R_REST = RING_HOLD * 1.25;                    // 자리 잡은 것들의 바깥 (흙 골렘 자리)
  /* 아래쪽은 **아래 판(HUD) 뒤로 발이 숨어서는 안 된다** — 위와 달리 어둠이 아니라
     판이라, 나타나는 순간도 보여야 한다. 그래서 아래만 등장 둘레를 절반쯤 센다. */
  const BOT_R = (R_REST + RMAX) / 2;
  /* [세로로 오르는 거리, 그 자리에 서는 몸의 키] — 실제로 그 자리에 서는 것들만.
     ① 진 둘레 맨 위의 정예 졸개 ② 진 바깥의 흙 골렘 ③ **막 나타난 정예 졸개**(등장 둘레, 잠깐)
     ★ **관문의 주인은 «관문 층에서만» 센다.** 키가 149 로 졸개의 두 배가 넘어
       세로 예산의 **절반 이상**을 혼자 먹는데, 다섯 층 중 넷에는 **아예 없다**
       (`isGate(f) = f%5===0` · battle.js 772 이 관문에서만 세운다).
       여태는 없는 놈의 자리를 1층에서도 비워 두고 있었다([[floor-erases-the-ramp]] 의 결).
       층이 바뀔 때만 값이 갈리므로 판이 도중에 흔들릴 일은 없다.
     ★ 주인만은 **등장 둘레(RMAX)** 로 잰다 — 나타나는 순간이 제일 높이 오르고
       (`w2b_top_probe` 가 재는 자리도 거기다) 그때 머리가 잘리면 바로 보인다. */
  const TOP_CASES = [[R_REST, BIG_MOB * CHAMP_UP], [R_REST, BIG_MIN], [RMAX, BIG_MOB * CHAMP_UP]];
  if (MODE.at !== "town" && isGate(S.floor | 0)) TOP_CASES.push([Math.sin(0.4) * RMAX, BOSS_H]);
  const US_PER_SC = 1.286;                            // 아래 「몸집은 판 배율에 매단다」와 같은 값
  const VPAD = 6;                                     // 위아래로 남기는 최소 여백(스크린 px)
  const sc0 = Math.min(SC_MAX, scByW);                // 폭과 상한만 본 배율
  const room = (freeH - VPAD * 2) / sc0;              // 그 배율에서 쓸 수 있는 세로(판 단위)
  /* ★ 바닥을 0.56 → **0.50** 으로 내린다(V-16). 위에서 세로를 88px 뺐는데 눌림이
     바닥에 붙어 있으면 그 손해가 **그대로 배율로** 넘어가 싸움이 작아진다. 폭은
     아직 한참 남아 있으므로(scByW 2.795 대 sc 1.81) 타원을 더 눕혀 되받는다 —
     디아블로의 시점도 세로가 가로의 절반쯤이다. */
  const squash = Math.max(0.50, Math.min(0.86,
    Math.min(...TOP_CASES.map(([y, hh]) => (room - hh * US_PER_SC) / (y + BOT_R)))));
  const TOP_K = Math.max(...TOP_CASES.map(([y, hh]) => y * squash + hh * US_PER_SC));
  const BOT_K = BOT_R * squash;                       // 아래쪽은 발이 끝이라 몸의 키가 안 붙는다
  const scByH = Math.max(0.2, (freeH - VPAD * 2) / (TOP_K + BOT_K));
  const sc = Math.min(sc0, scByH);
  const SQUASH = squash;
  /* 인물 크기(개체가 든 h)는 스크린 픽셀 고정값이라, 판이 커져도 콩알이었다. 스케일에 비례해 키우되
     서로 겹치지 않게 상한(1.85)·하한(1)을 둔다. 0.44 는 옛 460 판의 대략적 기준 스케일. */
  /* ★ 인물 배율 상한 1.85 도 모바일에서 넘어온 값이다. 판을 키우고 시야를 넓혔는데
     인물만 작으면 **무엇이 싸우는지** 안 보인다. PC 는 크게 봐도 되는 화면이다. */
  /* ★★ **몸집은 판 배율에 매단다**(W-2 · 2026-08-24). 예전 식
     `min(1.35, sc/0.44)` 은 어느 화면에서나 **상한 1.35 에 붙어** 있어서, 배율만
     올리면 몸은 그대로인 채 **간격만 벌어졌다** — 겹침이 재서 얻은 값(TOUCH_K 0.5 ·
     FOOT_R 0.40)에서 벗어난다. 그래서 여태 실제로 화면에 서던 비(1.35/1.05 = 1.286)를
     **그대로 상수로 굳혀** 곱한다: 배율을 어떻게 바꾸든 **겹치는 정도는 안 변하고**
     몸과 간격이 같이 커진다. 폰(sc 0.98)에서는 us 1.26 으로 지금과 거의 같다. */
  const us = Math.max(1, sc * US_PER_SC);

  /* ★★ **가운데는 «보이는 넓이»의 가운데다.** 무대가 화면 전체를 얻은 순간
     `h * 0.5` 는 판(HUD) 뒤로 내려간다 — 인물이 구슬 밑에 숨는다.
     판에 안 가리는 띠(freeH)의 한가운데로 잡는다. */
  /* ★ W-2b — 가운데는 **타원의 가운데가 아니라 «그림 전체»의 가운데**다.
     위로 자라는 몸까지 세면 무게중심이 위에 있으므로, 타원을 그만큼 내려 걸어야
     머리와 발이 둘 다 들어간다. 남는 여유는 위아래로 나눈다. */
  const cx = w / 2;
  const cy = (freeH - (TOP_K + BOT_K) * sc) / 2 + TOP_K * sc;
  const px = (x) => cx + x * sc;
  const py = (y) => cy + y * sc * SQUASH;
  /* 검수용 — 마지막으로 그린 판의 실제 기하(반지름·눌림·인물배율). 자(headless)가 화면 대비
     판이 얼마나 찼는지 재려면 그림값 자체가 필요하다. RING_SPAWN 은 battle.js 상수(300). */
  const BAND = { x0: (w - mapW) / 2, w: mapW };
  window.__S = S;          // 검수용 — 자(headless)가 실제 개체 위치를 읽어야 겹침을 잰다
  window.__geo = { w, h, mapW, mapX0: (w - mapW) / 2, freeH, panelH, cx, cy, sc, squash: SQUASH, us,
                   ringW: 2 * RING_SPAWN * sc, ringH: 2 * RING_SPAWN * sc * SQUASH };

  /* 던전 바닥 — **돌 타일 위에 횃불빛 한 점.** 예전엔 검은 바탕 + 매끈한
     라디얼 그라디언트였다. 화면을 전부 픽셀로 갈아 놓고 **제일 넓은 면만**
     매끈하게 남아 있었고, 그래서 캐릭터가 허공에 떠 보였다(js/ground.js). */
  /* ★ 빛 반경을 싸움터(RING_SPAWN)에만 맞췄더니 세로로 긴 화면에서는 위아래가
     통째로 검게 남고 **벽도 소품도 안 보였다.** 방 전체가 어렴풋이라도 보이도록
     화면 크기에도 맞춘다 — 둘 중 큰 쪽. */
  /* ★ 배율을 1.05 로 낮췄더니 **빛이 화면을 다 덮어 어둠이 사라졌다** — 반경을
     화면 크기에 비례로 잡아 뒀기 때문이다(0.72). 배율을 건드리면 조명도 같이
     움직인다는 것을 잊었다. 어둠이 이 게임의 절반이므로 다시 조인다. */
  if (MODE.at === "town") {
    /* 마을 — 바닥만 흙으로 바꾸고 나머지는 던전과 같은 길을 탄다.
       빛은 모닥불이라 조금 더 넓고, 싸움 둘레는 그리지 않는다. */
    /* 마을도 **끝없는 맵의 한 조각**이다 — 같은 격자에 뿌리되 밀도를 낮추고(사람이
       사는 곳이라 잡동사니가 덜하다) 뼈무더기는 뺀다(마을에 해골이 쌓여 있으면
       마을로 안 읽힌다). 가운데는 넓게 비운다: 장소 셋이 거기 선다. */
    /* ★ 마을의 **목적지**를 바닥에 알려 준다 — 길과 소품 무리가 여기서 나온다.
       자리는 town.js 의 PLACES 와 같은 비율식(화면 반너비/반높이의 몇 배). */
    {
      const hw = (w / 2) / sc, hh = (h / 2) / (sc * SQUASH);
      const R = { x: hw * 0.92, y: hh * 0.62 };
      setAnchors([[0, -0.55 * R.y], [-0.62 * R.x, -0.05 * R.y],
                  [0.62 * R.x, -0.05 * R.y], [0, 0.30 * R.y]]);
    }
    drawGround(ctx, w, h, cx, cy, 0, SQUASH, sc,
               /* ★ 빈 자리 300 은 **장소 넷을 다 삼키고도 남았다** — 아래로 300 이면
                  모닥불 밑이 통째로 맨땅이라 화면의 아랫동이 비었다. 장소는 위쪽에
                  몰려 있는데 원은 가운데를 중심으로 둥그니, 남는 것은 늘 **아래**다.
                  모닥불(반경 150)과 본인 발치만 지키면 되므로 210 으로 조인다. */
               { clear: 210, density: 26, town: true, decal: 2.4,
                 /* ★ 통·상자·수레만 뿌리면 **창고 앞마당**이다. 야영지로 읽히려면
                    경계(wall_a)·불(torch)·지붕(shed)이 섞여야 한다.
                    **개수로 무게를 준다** — set 에서 고르는 것은 균등 추첨이라
                    같은 이름을 두 번 적으면 두 배로 나온다. 헛간은 224x168 로 크니
                    열둘에 하나만(흔하면 마을이 헛간 밭이 된다), 횃불은 곧 조명이라
                    둘을 준다. */
                 /* ★★ 2차 — 천막·모닥불·수레가 들어왔다. **큰 것일수록 드물게.**
                    셈으로 무게를 준다(37 칸 중 몇 칸을 차지하느냐가 곧 빈도다):
                      · 잔 것(통·상자·자루·통나무·덤불·바위·그루터기) 16 — 바닥을 채운다
                      · 중간(담·수레·구유·목책·우물)              9
                      · 불(횃불·모닥불)                          5 — 조명이라 넉넉히
                      · 큰 것(천막 넷·짐수레·죽은나무·헛간)        7 ≈ 19%
                    천막 넷은 일부러다 — **자는 자리가 보여야 야영지로 읽힌다.**
                    죽은나무(160x200)·헛간(224x168)은 하나씩만: 흔하면 밭이 된다. */
                 /* ★★★ 3차 — **사람이 산 흔적**을 넣는다. 천막이 잠자리라면
                    솥·건조대는 **살림**이고, 무기걸이는 여기가 누구의 야영지인지를
                    말한다. 셋 다 사람 키만 하니 잔 것과 큰 것 사이로 둔다:
                      · cookpot·dryrack 둘씩 — 살림은 눈에 자주 밟혀야 산 곳이다
                      · wrack 하나        — 흔하면 무기고지 야영지가 아니다
                      · boulder 둘        — 마른 흙에 박힌 자연물, 바닥을 채운다
                      · banner 하나       — **표식은 드물어야 표식이다**(80x176 로
                                            세로가 길어 흔하면 깃발밭이 된다)
                    51 칸 중 큰 것 여덟(천막 넷·짐수레·죽은나무·헛간·깃발) ≈ 16%.
                    ★★★★ 4차 — 세 번 만에 나온 짚·잠자리를 넣는다. **잠자리는
                    천막 다음으로 센 신호다**(사람이 여기서 잔다) — 둘씩 준다.
                    숫돌·덮개짐은 하나씩: 있으면 반갑고 흔하면 지겹다. */
                 set: ["barrel", "barrel", "barrel", "crate", "crate", "crate",
                       "sacks", "sacks", "logs", "logs", "shrub", "shrub",
                       "rock", "rock", "stump", "stump", "boulder", "boulder",
                       "hay", "hay", "bedroll", "bedroll",
                       "wall_a", "wall_a", "wall_b", "cart", "cart", "trough",
                       "palisade", "palisade", "well", "grindstone", "tarp",
                       "cookpot", "cookpot", "dryrack", "dryrack", "wrack",
                       /* ★ 51 칸에 횃불 셋이면 한 화면에 하나 뜰까 말까라 **빛웅덩이가
                          안 보인다** — 어젯밤 화면이 오히려 밋밋해진 이유다. 야영지에서
                          불은 소품이 아니라 **조명**이니 개수를 따로 잡는다(3 → 8). */
                       "torch", "torch", "torch", "torch",
                       "torch", "torch", "torch", "torch", "firepit", "firepit",
                       "tent_a", "tent_a", "tent_b", "tent_b",
                       "wagon", "tree", "shed", "banner"],
                 /* ★ **야영지 바깥** — 앵커에서 420 을 넘어가면 여기 것을 뿌린다.
                    살림(통·상자·천막)은 안 나온다: 야영지에서 멀리 떨어진 들판에
                    솥이 놓여 있으면 마을이 어디까지인지가 흐려진다. 자연만 둔다 —
                    덤불·바위·그루터기·통나무, 그리고 죽은 나무 하나(멀리 선 나무는
                    **깊이를 만든다**). 칸마다 세 번 굴려 화면 끝까지 깔리게 한다. */
                 /* ★ `dens: 24` 는 **코드가 읽지도 않던 값**이었다(drawScatter 가 95 로
                    박아 쓰고 있었다). 이제 실제로 읽으므로 재서 넣는다 — 바깥은
                    칸당 1.80(=0.60×3)이 되어 안쪽(2.34)보다 조금 성기다. */
                 /* ★★ 08-17 00:3x — **`>>>` 를 고치자 실제로 그려지는 것이 두 배**가 됐다.
                    위 값들은 전부 **절반이 새던 시절**에 「그래도 비어 보인다」고 올려 잡은
                    것이라, 고친 뒤에는 띠가 14~22 로 **고르게** 깔려 「가운데는 빽빽하고
                    바깥은 성기다」가 흐려졌다(안팎 비 1.56). 바깥만 도로 내린다 —
                    안(2.34)은 그대로 두고 바깥을 칸당 1.80 → **1.02**(=0.34×3)로. */
                 wild: { dens: 46, rolls: 3,
                         set: ["shrub", "shrub", "shrub", "rock", "rock", "rock",
                               "stump", "stump", "boulder", "boulder", "logs", "tree"] } },
               BAND);
    drawTown(ctx, w, h, cx, cy, sc, SQUASH, (townT += (dt || 0.016)), diveMax() > 0);
    /* ★ 마을의 불빛은 drawTown 이 자리를 적어 준 **뒤에** 얹어야 그 프레임에 보인다
       (먼저 부르면 한 프레임 늦게, 그것도 소품 밑에 깔린다). */
    drawGlows(ctx, SQUASH);
    /* ★ 여기 서 있는 네크로멘서가 **완전히 멎어 있었다**(e 를 null 로 넘겨 방향은 정면에
       박히고 숨도 없었다) — 마을은 켜자마자 보는 첫 화면인데, 거기 선 것이 한 프레임도
       안 바뀌면 배경 그림과 다를 게 없다. 모닥불에는 이미 숨을 넣어 두고 **정작 사람에게
       안 옮긴 것**이 잘못이었다(memory/carry-fixes-forward).
       자: `tools/town_alive_probe.mjs` — 갓 켠 마을에 그냥 서서 한 바퀴를 지켜본다. */
    const [gdx, gdy] = townGaze(townT);
    /* ★ 던전에만 있던 **소환진을 마을에도** 깐다 — 병수님 「네크로멘서 색이 마을과
       던전에서 다르다」. 로브 화소는 두 화면이 똑같았고(재 봤다), 다른 것은
       **발밑의 빛**이었다: 던전은 보랏빛 웅덩이, 마을은 모닥불의 누런 흙.
       세기는 던전의 6할(gain 0.6)로 — 마을은 싸우는 자리가 아니라 쉬는 자리다.
       ★ 처음에 0.45 로 놓고 **크게 잘라 본 그림에서만** 확인했더니 통과로 보였는데,
         화면 전체로 보니 거의 안 보였다 — 안 보이는 표식은 표식이 아니다
         ([[play-it-before-measuring-it]]). */
    const tny = cy + 6 * sc * SQUASH, tnh = 54 * us;
    necroSigil(ctx, cx, tny, tnh, townT, SQUASH, us, { gain: 0.6 });
    drawOne("char/necro", cx, tny, tnh, COL.necro,
            { id: "necro", dx: gdx, dy: gdy, bob: townBreath(townT) });
    drawTownLabels(ctx);
    return;
  }
  setAnchors([]);      // 던전은 목적지가 없다 — 마을 배치가 새면 안 된다
  /* 소환진의 회전·맥동은 **경과 시간**으로 돈다(프레임 수 아님) — 30fps 와 60fps 가
     달라 보이면 안 된다. 마을 시계(townT)와 따로 두어 던전에서만 흐른다. */
  battleT += (dt || 0.016);
  /* ★★ **V-10 (2026-08-24) — 34 은 「칸마다 한 번 굴리던 시절」의 값이다.**
     ground.js 가 던전에서도 칸마다 **세 번** 굴리게 되면서(야영지가 08-12 에 배운 것을
     그제야 옮겼다) 같은 34 는 너무 성기다. 후보 넷을 같은 씨앗·같은 시각으로 찍어
     놓고 눈으로 골랐다(`tools/v10_dens_sheet.mjs 1x34 3x34 3x50 3x66` · tmp/v10_sheet.png):
     1x34 는 캄캄한 주차장, 3x34 는 살아나고, **3x50 부터 「여기가 어디」가 읽힌다**,
     3x66 은 화로가 줄지어 서서 기계 같다.
     ★ 소품이 늘면 **빛도 는다**(화로·횃불이 addGlow 를 부른다) — 어두워서 비어 보이던
       위쪽 띠가 같이 채워진다. 틀 값은 그대로 8.3ms(중앙값) · p95 8.6→8.8 로
       A/A 흔들림 안이다(`/tmp/v10_perf.mjs`, 1x34 와 3x50 을 번갈아 두 번씩). */
  if (window.__RECTS) { window.__RECTS.bars = []; window.__RECTS.nums = []; window.__RECTS.bodies = []; window.__RECTS.frames++; }
  drawGround(ctx, w, h, cx, cy, 0, SQUASH, sc, { clear: 190, density: 50 }, BAND);
  /* 소환수가 진을 치는 둘레 — 여기가 뚫리면 본인이 맞는다는 걸 화면이 말해 준다.
     ★ **진과 함께 밀려 나간다**(battle.js 「진이 적 쪽으로 기운다」). 그림만 본인 자리에
       두었더니 군대가 제 고리 밖에 서 있어, 밀고 나가는 것이 「대열이 흐트러진 것」으로
       보였다. 둘레가 앞으로 나가면 「저기까지가 내 편이 지키는 데」로 읽힌다. */
  drawHoldRing(ctx, cx + S.push.x * sc, cy + S.push.y * sc * SQUASH, RING_HOLD * 1.2 * sc, SQUASH);

  /* ══ 체력바 ══ **몸에 붙여 놓는다.**
     ★★ 병수님: "전투화면 처음부터 다시 재검토". 화면을 3배로 늘려 보고서야 알았다 —
     바를 `y - 그림높이` 에 놓고 있었는데, PixelLab 캔버스는 **머리 위에도 투명 여백**이
     있어서(종마다 6~20%) 바가 몸에서 한참 떠올라 있었다. 여럿이 섞이면 어느 바가
     누구 것인지 못 읽는다(허공에 막대만 떠 있는 것으로 보인다).
     이제 알파로 잰 **진짜 머리끝** 바로 위에 놓고, 폭도 **몸 폭**에 맞춘다. */
  /* ★★ V-25 — **붐비면 바가 임자를 잃는다.** 위 규칙(머리끝 위 6px)은 몸이 하나일 때
     맞는 말인데, 사방에서 몰려오는 판에서는 그 6px 자리에 **뒷줄 몸의 가슴팍**이 있다.
     자로 재니(45초 · `tools/v25_barmix.mjs`) 바의 **69.9%가 남의 몸 위**에 얹혀 있고,
     **23.2%는 주인이 8할 넘게 가려져** 화면에는 임자 없는 막대만 남는다.
     ★ 고치는 결은 V-23(숫자)에서 배운 것 그대로다 — **자리를 더 만들 수는 없다.**
       위로 쌓으면 더 먼 몸의 가슴에 얹히고, 옆으로 밀면 제 몸을 떠난다.
       그래서 **제 몸 위로 내린다.** 제 가슴팍은 누구와도 안 다투는 제 자리고,
       무엇보다 **주인과 같은 운명을 진다** — 앞의 몸이 주인을 덮으면 바도 같이 덮인다
       (몸→바 차례로 그리므로 저절로 그렇게 된다). 가려진 놈의 바가 저 혼자 뜨는 일이 없어진다.
     ※ 값·균형은 한 톨도 안 건드린다 — 그리는 자리만 바뀐다. */
  const placedBars = [];   // 이 틀에 이미 놓인 바(그린 차례 = 뒤에서 앞으로)
  /* **띄운 틈** — 6 이었다. 자로 골랐다(40초 · 임자 없는 막대 · 제 몸에 닿은 바):
       6(옛것) 14.0% · 13.4%   |   4  14.0% · 13.4%   |   **1  8.3% · 100%**   |   -1  거의 같고 머리를 더 먹는다
     1 이면 바 아랫자락이 머리끝을 **2px 물어** 「이 몸의 것」이 되고, 머리는 거의 안 가린다. */
  const BAR_LIFT  = globalThis.__BARLIFT  != null ? +globalThis.__BARLIFT  : 1;
  const BAR_STACK = globalThis.__BARSTACK != null ? +globalThis.__BARSTACK : 1;   // 0 = 옛 방식(안 내림)
  /* ══ V-44 — **빈 칸이 불투명해서 다친 놈일수록 새까매졌다.** ══════════════════
     열셋이 한 자리에 서면 눈에 먼저 드는 것이 몸이 아니라 **검은 막대 열셋**이다.
     빈 칸(`#1a1410`)이 불투명한 탓에 반쯤 깎인 놈은 「붉은 조각 + 긴 검은 막대」로
     그려진다 — 즉 **다칠수록 화면이 검어진다.** 뜻은 거꾸로여야 한다(다친 것은
     붉은 쪽이 말한다). 그래서 빈 칸을 **비치는 어둠**으로 내린다.
     ★ **테는 그대로 불투명하게 둔다** — 테가 없으면 「이만큼 «중에» 이만큼」이
       사라져 남은 몫을 못 읽는다(어두운 바닥 위에서 빈 칸이 통째로 증발한다).
       테는 1px 고리라 넓이가 빈 칸의 3분의 1이고, 잉크의 대부분은 빈 칸이다.
     ★ **폭도 몸에 맞춘다**(0.9 → 0.78) — 바가 몸보다 넓으면 제 임자를 넘어간다.
     ★ `__BAROLD` 는 자가 **옛 그림으로 되돌려** 같은 판을 두 번 재는 문이다
       (`__NECRO_STILL` 과 같은 결). 고친 뒤에만 재면 그 자가 무엇을 잡는지 모른다. */
  const BAR_OLD   = !!globalThis.__BAROLD;
  const BAR_WFRAC = BAR_OLD ? 0.9 : (globalThis.__BARWF != null ? +globalThis.__BARWF : 0.78);
  const BAR_DIMA  = BAR_OLD ? 1   : (globalThis.__BARDIM != null ? +globalThis.__BARDIM : 0.42);
  /* ══ V-65 — **바는 몸보다 먼저 오면 안 된다.** ══════════════════════════════
     관문의 주인은 2.6초에 걸쳐 어둠에서 배어 나오는데(`born0`), 바는 그 알파를
     한 번도 안 보고 **처음부터 또렷하게** 그려졌다. 화면에는 빈 땅에 임자 없는
     넓은 붉은 막대만 남는다(20층 사진에서 잡았다). 같은 자리의 이웃 둘(둘레
     붉은 물듦 · 우두머리 금 고리)은 `!(m.born > 0)` 로 이미 막아 놨는데 **바에만
     안 옮겼다** — [[carry-fixes-forward]].
     ★ `__BARBORN_OFF` 는 자가 **옛 그림으로 되돌려** 같은 판을 두 번 재는 문이다
       (`__BAROLD` 와 같은 결 · tools/v65_bornbar.mjs). */
  const barAt = (base, x, y, hh, pct, col, e) => {
    const bornA = globalThis.__BARBORN_OFF ? 1 : bornAlpha(e);
    if (bornA < 1) { ctx.save(); ctx.globalAlpha = bornA; }
    const fm = footMetrics(base);
    const headY = y - hh * (1 - (fm ? fm.headFrac : 0)) + (fm ? hh * fm.footFrac : 0);
    const wdt = Math.max(BAR_OLD ? 14 : 11, hh * (fm ? fm.bodyWidthFrac : 0.5) * BAR_WFRAC);
    const h = Math.max(3, Math.round(3 * us));
    /* 띄운 틈 — `__BARLIFT` 로 열어 두고 자로 골랐다(아래 표) */
    let top = Math.round(headY - BAR_LIFT * us);
    const x0 = Math.round(x - wdt / 2) - 1, w0 = Math.round(wdt) + 2;
    /* 겹치면 **제 몸 위로** 한 칸씩 내린다. 바닥은 제 키의 45% — 그 아래는 가슴이 아니라
       배라 무엇이 서 있는지가 안 읽힌다. 다섯 칸이면 한 자리에 여섯이 서도 갈린다. */
    const floorY = headY + hh * 0.45, step = h + 3;
    for (let g = 0; BAR_STACK && g < 5 && top + step <= floorY; g++) {
      let hit = false;
      for (const b of placedBars)
        if (x0 < b[0] + b[2] && x0 + w0 > b[0] && top - 1 < b[1] + b[3] && top + h + 1 > b[1]) { hit = true; break; }
      if (!hit) break;
      top += step;
    }
    placedBars.push([x0, top - 1, w0, h + 2]);
    const bw = Math.round(wdt), bx = Math.round(x - wdt / 2), fw = Math.round(bw * Math.max(0, Math.min(1, pct)));
    /* ★★ **테가 «테»가 아니라 판때기였다.** 옛 코드는 `#000c` 를 바 전체에 꽉 채우고
       그 위에 빈 칸을 덮었다 — 그래서 빈 칸만 비치게 만들어도 **밑에 깔린 검정이
       그대로 비친다**(처음 고쳤을 때 잉크가 안 줄어든 까닭이 이것이다. 자도 테를
       고리 넓이로 세고 있어 그림과 갈렸다 — [[threshold-and-ruler-must-match]]).
       이제 테는 **1px 고리 넷**으로만 두른다. 옛 그림은 판때기 그대로 둔다. */
    ctx.fillStyle = "#000c";
    if (BAR_OLD) ctx.fillRect(bx - 1, top - 1, bw + 2, h + 2);
    else { ctx.fillRect(bx - 1, top - 1, bw + 2, 1); ctx.fillRect(bx - 1, top + h, bw + 2, 1);
           ctx.fillRect(bx - 1, top, 1, h);         ctx.fillRect(bx + bw, top, 1, h); }
    /* 빈 칸 — 옛것은 불투명(`#1a1410`), 지금은 **비치는 어둠**. 채운 몫 아래는
       어차피 색이 덮으므로 **빈 자리에만** 칠한다(겹칠하면 잉크가 두 번 든다). */
    if (fw < bw) { ctx.fillStyle = BAR_OLD ? "#1a1410" : `rgba(12,8,6,${BAR_DIMA})`;
                   ctx.fillRect(bx + fw, top, bw - fw, h); }
    ctx.fillStyle = col;
    ctx.fillRect(bx, top, fw, h);
    /* ★ V-20 자 — **그리는 자리에서 바로 모은다.** 바깥에서 식을 다시 쓰면 판정이
       그림과 갈린다([[threshold-and-ruler-must-match]]). 기본은 꺼져 있다. */
    /* ★ V-44 자 — **그린 잉크를 그리는 자리에서 센다.** 「화소 × 불투명도」라
       옛 그림과 새 그림을 **같은 눈금**으로 잰다(테 0.8 + 빈 칸 alpha). */
    if (window.__RECTS) window.__RECTS.bars.push([bx - 1, top - 1, bw + 2, h + 2, x, y,
      (BAR_OLD ? (bw + 2) * (h + 2) : (bw + 2) * (h + 2) - bw * h) * 0.8
      + (bw - fw) * h * (BAR_OLD ? 1 : BAR_DIMA)]);
    if (bornA < 1) ctx.restore();
  };

  /* ══ 내 편 표시 ══ **이 게임은 아군과 적이 같은 종족이다.**
     내 해골 전사와 적 해골 궁수가 둘 다 해골이고, 내 구울과 적 좀비가 둘 다 썩은
     인간형이다. 그림만 보면 누가 내 편인지 알 수가 없다 — 체력바 색은 **다쳐야**
     보이므로 답이 못 된다. 그래서 **아군 발밑에 룬 고리**를 깐다(적에게는 없다).
     지배한 놈은 보라 — 원래 적이었다는 것이 색으로 남는다. */
  const RUNE = { skel: "#6fa8d8", ghoul: "#6fa8d8", golem: "#6fa8d8" };
  /** ★★ **룬이 겹쳐서 「캐릭터가 겹친다」로 읽혔다.** 병수님이 겹침을 또 지적해
   *  자로 재 보니 몸은 안 겹치는데(중심 간격 64.4 · 몸 폭 54.4, 화면 단위 sc 배수)
   *  **룬 지름이 71 이라 간격보다 컸다.** 즉 몸이 아니라 **바닥 표시가** 겹치고 있었다.
   *  크기를 눈대중으로 줄이지 않고 **그림자와 같은 자로 맞춘다** — 그림자는 이미
   *  발 폭(footWidthFrac)에 맞춰 두었으므로, 룬이 그림자를 그대로 따르면 발에
   *  붙어 있으면서 이웃과 안 닿는다(지름 58.6 < 간격 64.4). */
  /* ★★ **그러데이션을 몸마다 매 프레임 새로 만들고 있었다.** 판에 쉰 몸이면 초당
     3천 개다 — 이 맥에서는 안 티 나지만(57몸에서 fps 57) 약한 기기에서는 여기부터 샌다
     (병수님 2026-08-15: "그리고 렉걸림"). 캔버스 그러데이션은 **자리에 매여** 있어
     그대로는 못 쓰므로, **원점에 만들어 두고 ctx 를 옮겨** 쓴다. 크기는 종마다 몇 가지뿐이라
     반올림해 열쇠로 삼으면 캐시가 몇 개로 수렴한다. */
  const gradCache = window.__GRADC || (window.__GRADC = new Map());
  const radial = (rx, stops) => {
    const key = Math.round(rx) + "|" + stops;
    let g = gradCache.get(key);
    if (!g) {
      g = ctx.createRadialGradient(0, 0, Math.max(0.01, rx * 0.15), 0, 0, Math.max(0.02, rx));
      for (const s2 of stops.split(";")) { const [at, c] = s2.split("@"); g.addColorStop(+at, c); }
      gradCache.set(key, g);
      if (gradCache.size > 400) gradCache.clear();      // 판 크기가 바뀌면 열쇠가 늘어난다
    }
    return g;
  };
  const footRune = (x, y, hh, col, fm) => {
    /* ★ 처음엔 진한 파란 테를 둘렀더니 **요즘 게임의 선택 표시**처럼 보였다(디아블로 2
       라기보다 RTS 다). 테는 아주 얇게 낮추고 **땅에서 배어 나오는 빛** 쪽으로 옮긴다 —
       「내 것」이 읽히기만 하면 되지, 눈을 끌 필요는 없다. */
    const rx = (fm ? hh * fm.footWidthFrac * 0.55 : hh * 0.26), ry = rx * SQUASH;
    /* ★ 좌표계를 옮겨 **원점 그러데이션**을 쓴다. 되돌릴 때 setTransform 을 쓰면
       흔들림(draw 초입의 translate)까지 지워지므로 반드시 save/restore 로 되돌린다. */
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = radial(rx, `0@${col}3a;0.7@${col}1c;1@${col}00`);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 0.30; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, us * 0.7);
    ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.88, ry * 0.88, 0, 0, 6.2832); ctx.stroke();
    ctx.restore();
  };
  /* 그림 높이는 이제 **개체가 들고 있다**(core.js 의 MINIONS.h · MOB_H).
     예전엔 적 크기를 충돌 반경에서 뽑아 썼는데, 반경을 그림에 맞추려 하면
     그림이 따라 커지는 고리에 걸려서 갈라 뒀다. */

  /* ══ 바닥에 누운 시체 ══ **몸들보다 먼저** 그린다 — 산 것이 시체를 밟고 선다.
     자원이 판 위에 쌓이는 것이 보여야 「시체가 자원」이 말이 아니라 그림이 된다.
     ★ 그림이 아직 안 왔으면 **어두운 얼룩**으로 대신한다 — 한 장이 없다고 자원이
       통째로 안 보이면 안 된다(에셋을 굽는 동안에도 굴러가야 한다). */
  for (const p of S.piles) {
    const x = px(p.x), y = py(p.y);
    /* 갓 생긴 것은 스르르 나타난다 — **쓰러지는 몸이 옅어지는 만큼**(CORPSE_FADE 는
       DEATH_T 와 같은 값) 짙어져, 몸이 시체로 바뀌는 한 동작이 된다. */
    const grow = p.born > 0 ? 1 - p.born / CORPSE_FADE : 1;
    /* 층이 넘어가면 앞 층 그림이 **어둠에 잠긴다** — 개수는 그대로, 그림만(enterFloor 가
       fade 를 걸고 step 이 다 잠기면 뺀다). 새 층 시체는 fade 가 없어 그대로 짙다. */
    const fade = p.fade !== undefined ? Math.max(0, p.fade / PILE_FADE) : 1;
    /* 밟고 다니는 것이므로 산 것보다 확실히 작게 — 거기에 **개체마다 ±15%** 를 준다 */
    const ph = 26 * us * (p.sc || 1);
    const im = corpseArt(p.sort, p.tint);
    ctx.save();
    // 바닥에 스며든 만큼 · 걷히는 만큼 눌러 둔다 · 개체마다 잠긴 깊이(dim)만큼 더
    ctx.globalAlpha = (0.34 + 0.44 * grow) * fade * (p.dim || 1);
    if (im) {
      ctx.imageSmoothingEnabled = false;
      const w = ph * (im.width / im.height);
      /* 좌우 뒤집기까지 넣으면 같은 각도라도 다른 놈으로 보인다 — 세로 SQUASH 는 그대로 */
      ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(p.flip || 1, SQUASH);
      ctx.drawImage(im, -w / 2, -ph * 0.5, w, ph);
    } else {
      ctx.fillStyle = "#100a08";
      ctx.beginPath(); ctx.ellipse(x, y, ph * 0.42, ph * 0.42 * SQUASH, p.rot, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  }

  /* ══ 누가 누구를 노리는가 ══ **휘두름이 시작되고 닿기 전까지**(pending 이 살아 있는
     동안) 때리는 놈과 맞을 놈을 가느다란 선으로 잇는다. 닿는 순간 pending 이 null 이 되며
     선이 저절로 사라지므로 — **선은 예고, 숫자는 결과**다. 원인 → 결과가 화면 순서로 읽힌다.
     편은 색으로 가른다: 소환수가 노리면 푸른빛, 적이 노리면 붉은빛. 본인을 노리는 것(core)은
     **가장 굵고 붉게** — 판 가운데로 붉은 선이 모이면 「뚫렸다」가 한눈에 온다.
     타격이 가까울수록 또렷해진다(진행도로 알파·굵기를 올린다) — 그게 「온다」는 신호다.
     맞을 놈 발밑엔 **얇은 표적 고리**를 얹는다(아군 룬은 은은한 빛, 이건 얇은 선이라 안 헷갈린다).
     ★ 좌표는 반드시 px()/py() 를 거친다 — 세로가 SQUASH 로 눌려 있어 직접 계산하면 어긋난다. */
  const aimLine = (ax, ay, bx, by, prog, col, wide) => {
    const x0 = px(ax), y0 = py(ay), x1 = px(bx), y1 = py(by);
    ctx.save();
    ctx.strokeStyle = col; ctx.lineCap = "round";
    ctx.globalAlpha = 0.15 + 0.5 * prog;
    ctx.lineWidth = Math.max(1, wide * us * (0.5 + 0.5 * prog));
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const rr = 9 * us * (0.7 + 0.5 * prog);
    ctx.globalAlpha = 0.2 + 0.55 * prog; ctx.lineWidth = Math.max(1, us);
    ctx.beginPath(); ctx.ellipse(x1, y1, rr, rr * SQUASH, 0, 0, 6.2832); ctx.stroke();
    ctx.restore();
  };
  for (const u of S.minions) {
    if (!u.pending || !u.pending.tgt) continue;
    const t = u.pending.tgt, prog = Math.min(1, (1 - u.swing / SWING_T) / IMPACT_AT);
    aimLine(u.x, u.y, t.x, t.y, prog, "#6fb2ff", 1.6);
  }
  for (const m of S.mobs) {
    if (!m.pending) continue;
    const prog = Math.min(1, (1 - m.swing / SWING_T) / IMPACT_AT);
    if (m.pending.core) aimLine(m.x, m.y, 0, 0, prog, "#ff3030", 2.8);
    else if (m.pending.tgt) aimLine(m.x, m.y, m.pending.tgt.x, m.pending.tgt.y, prog, "#e05a5a", 1.5);
  }

  /* **뒤에 있는 것부터 그린다.** 안 그러면 위쪽(먼) 적이 아래쪽(가까운) 소환수를 덮어
     앞뒤가 뒤집힌 그림이 된다. */
  const all = [];
  all.push({ y: 0, kind: "necro" });
  for (const u of S.minions) all.push({ y: u.y, u });
  for (const m of S.mobs)    all.push({ y: m.y, m });
  /* 쓰러지는 중인 몸도 **같은 줄에 세워 정렬한다** — 따로 그리면 앞뒤가 뒤집힌다 */
  for (const g of S.falling)  all.push({ y: g.y, g });
  all.sort((a, b) => a.y - b.y);

  for (const it of all) {
    if (it.g) {
      /* ══ 무너지는 몸 ══ **때린 쪽에서 밀려 넘어간다.**
         발끝을 축으로 기울이고(넘어짐), 가라앉히고(작아짐), 옅어진다. 그 아래에서
         시체가 같은 속도로 짙어지므로 눈에는 「몸이 시체가 되었다」 한 동작이다. */
      const g = it.g, p = 1 - g.t / DEATH_T;                 // 0 → 1
      const hh = g.hh * us, x = px(g.x), y = py(g.y);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p * p);              // 끝에서 빠르게 사라진다
      ctx.translate(x, y);
      /* 넘어지는 각도: 처음이 빠르고 끝은 눕는다. 밀린 방향을 모르면 오른쪽으로. */
      const side = (g.kx || 0) < 0 ? -1 : 1;
      ctx.rotate(side * 1.25 * Math.min(1, Math.pow(p * 1.4, 0.65)));
      ctx.scale(1, 1 - 0.28 * p);                            // 눕는 만큼 눌린다
      if (!drawSprite8(ctx, g.base, dirName(g.dx, g.dy), "idle", 0, 0, 0, hh)) {
        ctx.fillStyle = "#1a1210";
        ctx.beginPath(); ctx.ellipse(0, -hh * 0.4, hh * 0.26, hh * 0.4, 0, 0, 6.284); ctx.fill();
      }
      ctx.restore();
      continue;
    }
    if (it.kind === "necro") {
      /* 네크로는 원점(0,0)에 **고정** — 이동이 없으니 걷지 않는다. 가장 가까운 적을 보는
         idle 로 세우고, **뼈를 던지는 순간(S.pswing)** 만 attack 으로 바꾼다. 바라보는
         방향은 그 적 쪽(공격 방향 sdx,sdy 도 같은 방향으로 준다). */
      let nx = 0, ny = 1, nd = Infinity;
      for (const m of S.mobs) { const d = m.x * m.x + m.y * m.y; if (d < nd) { nd = d; nx = m.x; ny = m.y; } }
      /* ★ **적이 없으면 남쪽에 박혀 있었다.** 뒷정리·층 이동 구간이 판의 3분의 1인데
         그동안 인물이 한 프레임도 안 바뀐다. 마을에서 쓴 처방(둘러본다)을 그대로 옮긴다 —
         네 방향을 느리게 돈다(마을은 건물을 보고, 여기는 볼 것이 없으니 등속). */
      if (!S.mobs.length && !globalThis.__NECRO_STILL) {
        const g = (battleT * 0.22) % 4;
        const G4 = [[0, 1], [1, 0.35], [0, -1], [-1, 0.35]][Math.floor(g)];
        nx = G4[0]; ny = G4[1];
      }
      /* ★★ **여기를 정규화 안 하고 있었다.** 방향만 쓸 때는 크기가 상관없어서
         적의 좌표를 그대로 넘겼는데, 나중에 **내지르기**(drawOne 의 lunge)를 넣으면서
         그 값에 길이가 곱해졌다 — 적이 300 만큼 떨어져 있으면 본체가 300배로 튕겨
         **화면 밖으로 날아갔다.** 소환수·적은 battle.js 에서 이미 정규화해 넘긴다.
         **새 기능이 기존 호출자의 가정을 깬 것** — 방향 벡터는 언제나 길이 1 로 준다. */
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;

      /* ══ 소환진 ══ **「이 판의 주인이 저기 있다」를 그림만으로.** 네크로는 어두운 색
         (COL.necro)이라 어두운 바닥에 묻히고, 크기(58)로도 소환수와 잘 안 갈렸다.
         발밑에 소환수 룬(footRune, hh*0.30)보다 확실히 큰 **이중 고리**를 깐다 —
         그림 자체는 `necroSigil` 하나에 있다(마을도 같은 것을 옅게 쓴다).
         ★ 진의 둘레 RING_HOLD(=105, 화면엔 RING_HOLD*1.2*sc 로 그린다)와 겹치면 안 된다 —
           반경을 RING_HOLD*0.72*sc 로 상한 잡아 확실히 안쪽에 둔다. */
      const ncx = px(0), ncy = py(0), nhh = 70 * us;   // 판의 인간형 중 제일 크게
      const hpFrac = S.hpMax ? Math.max(0, Math.min(1, S.hp / S.hpMax)) : 1;
      const danger = hpFrac < 0.3;                     // ④의 core 숫자는 맞는 순간만 뜬다 —
      /* ★ 발밑 고리는 **시전(pcast)** 이 켠다 — 팔 자세(pswing)와 갈라 뒀다(battle.js).
         소환하면서 뼈를 던져도 팔은 던지기, 발밑은 소환으로 따로 읽힌다. */
      const cast = Math.max(0, Math.min(1, (S.pcast || 0) / SWING_T));
      necroSigil(ctx, ncx, ncy, nhh, battleT, SQUASH, us,
                 { danger, cast, R: Math.min(nhh * 0.62, RING_HOLD * 0.72 * sc) });

      /* 맞으면 본인도 움찔한다 — 소환수·적은 되는데 본인만 안 되면 「내가 맞았다」가
         숫자로만 온다(그리는 쪽은 flinch 하나로 셋 다 같은 안무를 쓴다). */
      /* ★ **가운데 고정은 셈의 규칙이라 안 건드린다** — 뼈의 원점도 소환 자리도 (0,0)이다.
         그림만 살린다(병수님 2026-08-15: "중앙으로 위치 유지하는건 좋은데, 아예 움직이지
         않는건 좀 이상한듯"). 마을에 이미 넣어 둔 숨을 **던전에 안 옮긴 것**이 잘못이었다.
         숨은 마을과 같은 처방(아래로만 눌렸다 펴진다), 거기에 좌우 무게 이동을 더한다 —
         둘 다 몸만 움직이고 그림자는 땅에 둔다. 던지는 동안(pswing)은 둘 다 끈다:
         내지르기와 겹치면 팔이 흔들려 타격이 뭉갠다. */
      /* `__NECRO_STILL` — 자가 **옛 상태(멎어 있음)로 되돌려** 스스로를 시험하는 문.
         고친 뒤에만 돌려 보고 「통과」라고 하면, 그 자가 무엇을 잡는지 아무도 모른다. */
      const busy = (S.pswing || 0) > 0 || globalThis.__NECRO_STILL;
      const sway = busy ? 0 : Math.sin(battleT * 0.62) * 2.2 + Math.sin(battleT * 0.37 + 1.1) * 1.3;
      drawOne("char/necro", ncx, ncy, nhh, COL.necro,
              { id: "necro", dx: nx, dy: ny, sdx: nx, sdy: ny, swing: S.pswing || 0, moving: 0, walked: 0,
                bob: busy ? 0 : townBreath(battleT), sway,
                flinch: S.hurt || 0, kx: S.hkx, ky: S.hky, knock: S.hknock ?? 1 });
      continue;
    }
    if (it.u) {
      /* 먹어서 커진 만큼 **그림도 커진다** — 셈만 커지면 병수님 눈엔 아무 일도 안 난다.
         지배한 놈은 원래 적의 그림을 그대로 쓴다(u.art) — 「저 브루트가 내 편이다」가
         한눈에 읽히는 게 이 노드의 전부다. */
      const u = it.u, hh = unitH(u, 40) * us, x = px(u.x), y = py(u.y);
      /* ★ 지배한 놈은 **적과 그림이 똑같다** — 화면만 보면 내 편인지 알 수가 없다
         (첫 판을 찍어 보고 알았다: 붉은 타락자가 사방에 섞여 누가 누군지 안 읽혔다).
         발밑에 보라 테를 둘러 「이건 내 것」을 그림 없이 말한다. */
      footRune(x, y, hh, u.own ? COL.thrall : (RUNE[u.kind] || "#9fd7ff"), footMetrics(ubase0(u)));
      const ubase = ubase0(u);
      drawOne(ubase, x, y, hh, COL[u.kind] || COL.thrall, u);
      /* ★ **아군 바는 늘 보인다**(병수님 2026-08-15: "아군 체력바 안뜨는애들이 많네,
         해골만 뜨는듯"). 예전엔 `hp < hpMax` 일 때만 그렸는데, 종마다 다치는 정도가
         달라서 **바가 종을 가리는 것처럼 보였다** — 실측(14층 30초): 해골 70.5% ·
         골렘 60.5% · **구울 45.7%**(물어뜯을 때마다 35% 회복이라 늘 만피에 가깝다).
         적은 그대로 다쳐야만 뜬다 — 적까지 늘 켜면 화면이 막대밭이 된다. */
      barAt(ubase, x, y, hh, u.hp / u.hpMax, "#7fb069", u);
      continue;
    }
    const m = it.m, hh = (m.h || 48) * us, x = px(m.x), y = py(m.y);
    const mbase = m.kind ? "mob/" + m.kind : "mob/fallen";
    /* ══ 둘레를 지난 놈 ══ **왜 내가 맞고 있는지**가 화면에 없었다. 사방에서 오는 판이라
       적이 여럿인데, 그중 **본인에게 닿을 놈**과 소환수에 붙들린 놈이 똑같아 보였다.
       진을 지나 안쪽으로 들어온 놈의 발밑만 붉게 물들인다 — 「저기가 뚫렸다」가 읽힌다. */
    /* ★ V-82: 문턱을 `born` 이 아니라 **몸이 여문 때**(bornAlpha)에 맞춘다 — 몸은 벌써
       또렷한데 발밑만 2.6초를 비어 있으면 「임자 없는 몸」이 된다(V-65 의 거울상). */
    if (Math.hypot(m.x, m.y * SQUASH_VIEW_C) < RING_HOLD * 0.92 && bornAlpha(m) >= 1) {
      const rr = hh * 0.30;
      ctx.save();
      ctx.translate(x, y);                                   // 원점 그러데이션(위 radial 캐시)
      ctx.fillStyle = radial(rr, "0@#c8323244;0.7@#c8323222;1@#c8323200");
      ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * SQUASH, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    /* ══ 우두머리 무리 ══ **평지에서 군대를 쓸어내는 놈**이라 한눈에 갈려야 한다
       (battle.js CHAMP 문). 관문 주인의 붉은 고리와 달리 금빛이고, 발밑에만 두른다 —
       크기(×1.22)만으로는 「좀 큰 졸개」로 읽힌다. */
    if (m.champ && bornAlpha(m) >= 1) {   // ★ V-82: 위와 같은 자
      const rr = hh * 0.34;
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha = 0.75; ctx.strokeStyle = m.col || "#e0b44a"; ctx.lineWidth = Math.max(1.5, 2 * us);
      ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * SQUASH, 0, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = 0.18; ctx.fillStyle = m.col || "#e0b44a";
      ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * SQUASH, 0, 0, 6.2832); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }
    drawOne(mbase, x, y, hh, m.boss ? COL.boss : COL.mob, m);
    /* 관문의 주인은 **다치기 전부터** 바를 보인다 — 얼마나 남았는지가 관문의 전부다 */
    /* ★ **적 바가 안 보여서 화면이 통째로 초록으로 읽혔다**(병수님: "아군과 적의 체력바가
       같은 초록"). 색이 같았던 게 아니라 **적의 붉음이 바닥에 묻혀 사라졌다** — 10층
       화면을 재 보니 아군 초록 5,721px 대 적 붉음 304px 이고, 옛 `#8b1a1a` 의 바닥대비는
       1.35:1 로 **제 빈 칸(#1a1410, 1.45:1)보다도 낮았다.** 즉 꽉 찬 적 바가 **빈 바처럼**
       보였고, 눈에 남는 바는 초록뿐이라 「다 같은 초록」이 된다.
       밝기를 올려 바닥에서 떼어 놓는다 — 적 3.43:1(×2.5) · 주인 4.47:1. 주인이 잡몹보다
       **더 뜨겁다**(둘 사이 1.30:1 로 갈린다).
       ※ 초록/붉음은 색각이상에 약한 짝이라 **색만으로 편을 말하지 않는다** — 아군은
         발밑 룬 고리가 따로 있다(지배한 놈은 보라). 색은 거드는 채널이다. */
    if (m.hp < m.hpMax || m.boss || m.champ) barAt(mbase, x, y, hh, m.hp / m.hpMax, m.boss ? "#ff6b52" : m.champ ? "#e0b44a" : "#e05a4a", m);
  }

  /* ══ 떨어진 전리품 ══ **잠깐 놓였다가 빨려 온다.** 방치형이라 주우러 가지 않으므로,
     「떨어졌다」가 보이는 그 반 초가 전부다 — 등급 색으로 빛나고 위아래로 까딱인다.
     등급 색은 상점·정산과 **같은 표**를 쓴다(TIER_CLS 와 짝). */
  const TIER_HEX = ["#8c8c8c", "#cfcfcf", "#6f8fd8", "#c8aa6e", "#d08a3a"];
  for (const d of S.drops) {
    const x = px(d.x), y = py(d.y) - (6 + Math.sin(d.t * 6) * 3) * us;
    const col = TIER_HEX[d.tier] || "#cfcfcf", rr = 7 * us;
    ctx.save();
    /* 바닥에 깔리는 빛 — 어두운 판에서 작은 점은 그냥 안 보인다 */
    const g = ctx.createRadialGradient(px(d.x), py(d.y), 0, px(d.x), py(d.y), rr * 3);
    g.addColorStop(0, col + "55"); g.addColorStop(1, col + "00");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(px(d.x), py(d.y), rr * 3, rr * 3 * SQUASH, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = col; ctx.strokeStyle = "#0b0806"; ctx.lineWidth = Math.max(1, us);
    ctx.beginPath();                                  // 마름모 — 픽셀 판에서 점보다 읽힌다
    ctx.moveTo(x, y - rr); ctx.lineTo(x + rr * 0.7, y); ctx.lineTo(x, y + rr); ctx.lineTo(x - rr * 0.7, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* ══ 떠오르는 피해 숫자 ══ **몸보다 위에** 그린다 — 가려지면 없는 것과 같다.
     색으로 **누가 아픈지**를 가른다: 적이 맞음 = 뼈빛, 내 편이 맞음 = 탁한 주홍,
     본인이 맞음 = 진한 빨강(제일 큼 — 곧 게임이 끝난다는 뜻이다), 회복 = 초록, 폭발 = 주황.
     ★ 폰에서도, 밝은 불꽃 위에서도 읽히게 **검은 외곽선**을 두른다(어두운 바닥에 얇은 글자는 묻힌다). */
  /* ★ V-19: `hurt` 가 **나무 소품과 같은 색**이었다 — α0.5 에서 `#82573d`(2.46:1) 다.
     바닥에서 떼어 놓는 붉은 살빛으로 옮긴다(α0.85 에서 5.45:1). */
  const NUMC = { dmg: ["#f2e9d0", "#000"], hurt: ["#ff9a70", "#180804"],
                 core: ["#ff2d2d", "#1a0000"], heal: ["#7fe07f", "#04160a"],
                 nova: ["#ffa53c", "#180c02"] };
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  /* ★★★ V-51: **합칠 수 없는 둘이 «붙어서» 한 수로 읽힌다.** 「16」 옆에 「16」이 서면
     사람은 **1616** 을 읽는다 — Lv.1 에게 없는 수다. 화면이 거짓말을 한다.
     · V-23(같은 몸)·V-26(한 방)이 합칠 수 있는 것은 이미 다 합쳤고, 남은 것은
       **저마다 다른 몸이 같은 피해로 맞은 것**이라 합치면 거짓말이 된다(V-26 이 적었다).
       그러니 합치지 말고 **떼어 놓는다.**
     · 까닭은 **자가 둘**이었다 — 붙는지 마는지는 «글자 폭»(픽셀)으로 정해지는데,
       판단은 `popNum` 의 `NUM_MERGE_R = 18` **세계 단위**로만 했다. 무대 배율이나
       글자 크기가 바뀌면 그 문턱은 소리 없이 어긋난다([[threshold-and-ruler-must-match]]).
       그래서 여기 — **그리는 자리, 진짜 잰 네모** — 에서 정한다.
     · V-23 이 접은 「줄(lane)」과 다른 점 둘: ① **붙은 것만** 민다(전부가 아니다)
       ② 미는 양은 고른 상수가 아니라 **모자란 틈만큼**이다. 그래서 V-20(체력바를 덮는
       숫자)이 되돌아오지 않는다 — 아래 자로 확인했다.
     · 한 번 정한 밀기(`n.sep`)는 **수명 내내 안 바꾼다.** 틀마다 다시 풀면 글자가 떤다. */
  const placed = [];
  for (const n of S.nums) {
    const p = 1 - Math.max(0, n.t) / 0.9;                 // 0 → 1
    /* ★ 픽셀 글꼴은 **정수 자리**에 놓여야 획이 안 번진다 — 소수 자리에 그리면
       9 의 배수로 맞춘 크기도 소용이 없다(같은 V-18). */
    /* ★★ V-20: 숫자가 **발밑 기준**으로 떠서 몸을 타고 올라가고 있었다(16→46 세계단위).
       몸이 48 이면 머리끝이 그 사이라, 숫자는 **수명 내내 몸 위에 얹혀** 있다가 끝에서
       체력바(머리끝 +6)와 정확히 겹쳤다 — 첫 판 그림에서 「12」가 붉은 바를 가로질러
       그어져 둘 다 못 읽었다. 이제 **제 몸 높이 위**에서 시작한다(popNum 이 unitH 를
       실어 보낸다). 바 꼭대기는 머리끝 위 6 인데 캔버스 위 여백(headFrac)이 그보다
       두꺼울 수 있으므로, 여백이 0 이어도 안 닿게 **+8** 을 둔다. */
    const lift = n.h ? n.h + 13 + 16 * p : 16 + 30 * p;
    let x = Math.round(px(n.x) + n.vx * p * us);
    const [fg, bg] = NUMC[n.kind] || NUMC.dmg;
    const base = n.kind === "core" ? 19 : n.kind === "nova" ? 15 : 13;   // 본인은 1.5배
    const size = g9(base * us);                       // ★ 9 의 배수로 물린다(위 g9)
    /* ★★ V-75 — **위 띠 밑으로 묶는다.** `y` 는 글자의 **밑금**이고 윗금은 `y - size`
       이므로, 윗금이 띠 밑금에 닿는 자리가 제일 위다. 위로 올라가려던 만큼은 그냥
       버린다 — 숫자는 「잠깐 보였다 사라지는 것」이라, 못 올라가도 알파가 제 몫을
       한다(V-19). 아래 겹침 밀기(V-51·V-69)는 가로로만 미니 이 묶임과 안 싸운다. */
    let y = Math.round(py(n.y) - lift * us);
    if (!globalThis.__NOTOPCAP) y = Math.max(y, Math.round(headBot(cvH)) + size);
    /* ★ 50층이면 피해가 **398123**(여섯 자리)로 찍혀 스프라이트를 통째로 가렸다.
       구슬은 이미 k/M 로 줄여 적는데(`num()`) 떠오르는 숫자만 날것이라 **자가 둘**이었다 —
       같은 자로 맞춘다. 숫자가 불어나는 맛은 자릿수가 아니라 **단위가 바뀌는 데**서 온다. */
    const txt = n.kind === "heal" ? "+" + num(n.v) : num(n.v);   // 회복은 깎임과 반대라 + 를 앞에
    ctx.save();
    /* ★★ V-19: 알파가 **수명 내내** 내려가고 있었다 — 0.9초 중 절반을 50% 아래에서
       보낸다(평균 0.50). 떠오르는 숫자는 「잠깐 보였다 사라지는 것」이라 **읽히는 시간이
       곧 전부**인데, 그 절반을 바닥색과 섞여 보내니 흙빛 덩어리로 읽혔다(V-18 의 나머지
       절반은 모양이 아니라 이것이었다). **끝에서만** 내린다 — 평균 0.81. */
    ctx.globalAlpha = p < 0.08 ? p / 0.08 : p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
    ctx.font = `${size}px "Galmuri9", monospace`;
    /* ★ 외곽선이 **획만큼 굵으면** 「6」의 구멍이 메워져 덩어리가 된다 — 22px 글자에
       3.4px 테를 둘렀던 것이 흙빛 블록의 나머지 절반이다. 글자 크기에 매달되 정수로. */
    ctx.lineWidth = Math.max(2, Math.round(size / 9)); ctx.strokeStyle = bg; ctx.lineJoin = "round";
    /* ── 붙어 있으면 떼어 놓는다(위 V-51) ── 재는 자와 미는 자가 **같은 픽셀**이다 */
    const wpx = ctx.measureText(txt).width, cw = wpx / Math.max(1, txt.length);
    if (n.sep === undefined) n.sep = 0;
    if (!globalThis.__NOGLUE) {
      /* ★ 밀기는 **커지기만 한다.** 틀마다 새로 풀면 글자가 떨고, 첫 틀에 얼려 두면
         `vx` 로 떠다니다 **나중에 다시 붙는다**(첫 판에서 0.8% → 0.5% 까지밖에 안 줄었다).
         커지기만 하면 떨지도 않고 다시 붙지도 않는다. */
      const box = [x + n.sep - wpx / 2, y - size, wpx, size];
      for (const q of placed) {
        const vo = Math.min(box[1] + box[3], q.y + q.h) - Math.max(box[1], q.y);
        const gap = Math.max(box[0], q.x) - Math.min(box[0] + box[2], q.x + q.w);
        let want;
        if (q.kind === n.kind) {
          if (vo < 0.6 * Math.min(box[3], q.h)) continue;      // 같은 띠가 아니다
          want = 0.5 * Math.min(cw, q.cw);                     // 한 수 «안»의 틈은 0 이다
        } else {
          /* ★★ V-69: **「빛깔이 다르면 둘로 읽힌다」는 «나란히 설 때»만 맞다.**
             V-51 은 여기서 다른 빛깔을 통째로 건너뛰었는데, 깊은 층 그림에서 주황
             「714k」가 붉은 「851」 **위에 그대로 얹혀** 둘 다 못 읽었다 — 획이 획을
             덮으면 색은 못 구한다(실측 그려진 글자의 12.6%가 덮였고, 최악은 한 수가
             다른 수 안에 100% 들어앉았다 · `tools/v69_numlap.mjs`).
             그러니 같은 빛깔처럼 «붙는 것»을 막지는 않고 — 나란한 둘은 그대로 둔다 —
             **진짜 겹칠 때만**(세로도 가로도 물릴 때) **겨우 떨어질 만큼만** 민다. */
          if (globalThis.__NOXLAP) continue;                   // 자가 «고치기 전»을 재는 문
          if (vo <= 0 || gap >= 0) continue;                   // 안 겹친다 — 이웃은 그냥 이웃이다
          want = 0.25 * Math.min(cw, q.cw);
          /* ★ 틈을 0.6(같은 빛깔과 같은 값)까지 넓혀 봤다가 **되돌렸다** — 덮인 글자는
             1.3% 로 똑같은데 덮인 넓이는 오히려 0.06 → 0.16% 로 늘었다. 남은 겹침은
             「덜 밀어서」가 아니라 **아래 `cap`(세 글자)에 막혀서**다(「725k」처럼 넓은
             수끼리는 세 글자로 못 비킨다). 틈만 넓히면 밀 데 없는 것을 더 밀 뿐이다. */
        }
        if (gap >= want) continue;
        /* 방향은 **한 번만** 정한다 — 이미 민 쪽이 있으면 그쪽으로 더 민다 */
        const dir = n.sep !== 0 ? Math.sign(n.sep)
                  : ((box[0] + box[2] / 2) >= (q.x + q.w / 2) ? 1 : -1);
        /* 모자란 만큼만 민다 — 통틀어 세 글자까지(더 밀면 제 몸을 떠난다) */
        const cap = 3 * cw;
        const next = Math.max(-cap, Math.min(cap, n.sep + (want - gap) * dir));
        if (Math.abs(next) > Math.abs(n.sep)) { n.sep = next; box[0] = x + n.sep - wpx / 2; }
      }
    }
    x = Math.round(x + n.sep);
    placed.push({ x: x - wpx / 2, y: y - size, w: wpx, h: size, cw, kind: n.kind });
    ctx.strokeText(txt, x, y); ctx.fillStyle = fg; ctx.fillText(txt, x, y);
    if (window.__RECTS) { const w = wpx;
      /* ★ V-26: 뒤에 **글자와 묶음 표**를 붙인다 — 자가 「같은 수가 몇 개나 동시에
         떠 있나」를 세려면 네모만으로는 못 센다. */
      /* ★ V-51: **빛깔(kind)** 도 같이 싣는다 — 「둘이 한 수로 읽히는가」는 색이 같을
         때만 뜻이 있다(주황 옆에 회색이 붙으면 사람은 둘로 읽는다). */
      window.__RECTS.nums.push([Math.round(x - w / 2), y - size, Math.round(w), size, txt, n.g | 0, n.kind,
        /* ★ V-51: **알파**도 싣는다 — 다 사그라든 글자를 「붙었다」고 세면 위양성이다
           (사람 눈에는 없는 것이다 · [[pixel-verification-calibration]]). */
        +ctx.globalAlpha.toFixed(3)]); }
    ctx.restore();
  }

  /* ── 날아가는 뼈 ── 본인의 기본공격. **꼬리를 남긴다** — 작은 점 하나는 30fps 에서
     그냥 깜빡이는 것으로 보인다. 진행 방향으로 늘린 선이 있어야 "날아간다"로 읽힌다. */
  for (const b of S.bolts) {
    const x = px(b.x), y = py(b.y);
    const tx = px(b.x - b.dx * 26), ty = py(b.y - b.dy * 26);
    const g = ctx.createLinearGradient(tx, ty, x, y);
    g.addColorStop(0, "rgba(150,190,230,0)"); g.addColorStop(1, "#cfe2f5");
    ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = "#e8f2ff";
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.284); ctx.fill();
  }

  /* ══ 장판 ══ 발밑에 남아 머무는 것(pool 주인). 바닥에 옅게 깔리고 사라질 때 옅어진다.
     ★ 개체(S.fx)가 아니라 판 위의 지속 위험이라 fx 고리 앞에 그린다 — 유닛 아래처럼 보이게. */
  for (const pl of S.pools || []) {
    const x = px(pl.x), y = py(pl.y), rr = pl.r * us, a = Math.min(1, pl.t / 0.6);
    ctx.save();
    ctx.globalAlpha = 0.26 * a; ctx.fillStyle = pl.col || "#7ab04a";
    ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH, 0, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = pl.col || "#7ab04a"; ctx.lineWidth = 2 * us;
    ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH, 0, 0, 6.2832); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  /* ══ 뼈 벽 ══ 길목을 막는 시체 무더기(⑥). 솟은 뼈 무더기로 그리고 수명 끝 1.2초에 옅어진다. */
  for (const w of S.walls || []) {
    const x = px(w.x), y = py(w.y), rr = w.r * us, a = Math.min(1, w.t / 1.2);
    ctx.save();
    /* ★ 그림이 있으면 **뼈 무더기**로 그린다. 없던 동안은 아래 회색 타원이 전부였다 —
       「백골 벽」이라 이름 붙여 놓고 화면에는 회색 동그라미가 떴다. 그림자는 땅에 남기고
       무더기만 얹는다(다른 것들과 같은 규칙 — 그림자까지 뜨면 떠 보인다). */
    const wim = sprite("fx/bonewall");
    ctx.globalAlpha = 0.5 * a; ctx.fillStyle = "#120c08";
    ctx.beginPath(); ctx.ellipse(x, y, rr * 0.95, rr * SQUASH * 0.8, 0, 0, 6.2832); ctx.fill();
    if (wim) {
      ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false;
      const hh = rr * 2.1;
      ctx.drawImage(wim, x - hh / 2, y - hh * 0.78, hh, hh);
    } else {
      ctx.globalAlpha = 0.85 * a; ctx.fillStyle = "#b8b0a0";
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH, 0, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = "#6a6458"; ctx.lineWidth = 2 * us;
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH, 0, 0, 6.2832); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  for (const f of S.fx) {
    /* ══ 관문 주인의 예고 ══ 수법이 터지기 전 **어디에 온다**를 깜빡이는 점선으로 보인다 —
       예고 없이 터지면 「불공평」이다(battle.js GATELORDS). 색은 주인 고유색(f.col). */
    if (f.kind === "warn_charge") {                        // 돌진 겨냥선 — 보스에서 중앙으로
      const x = px(f.x || 0), y = py(f.y || 0);
      const ex = px((f.x || 0) + (f.tx || 0)), ey = py((f.y || 0) + (f.ty || 0));
      const blink = 0.35 + 0.4 * Math.abs(Math.sin(f.t * 12));
      ctx.save(); ctx.globalAlpha = blink;
      if (vecDash()) {                                   // 자를 위한 옛 꼴(매끈한 벡터)
        ctx.strokeStyle = f.col || "#d0702c"; ctx.lineWidth = 3 * us; ctx.setLineDash([8 * us, 6 * us]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = f.col || "#d0702c";
        pxDashLine(ctx, x, y, ex, ey, 3 * us, { on: 3, off: 2 });
      }
      ctx.restore(); ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === "warn_pool" || f.kind === "warn_curse" || f.kind === "warn_add") {
      const x = px(f.x || 0), y = py(f.y || 0), rr = (f.r || 80) * us;
      const blink = 0.3 + 0.35 * Math.abs(Math.sin(f.t * 12));
      ctx.save(); ctx.globalAlpha = blink;
      if (vecDash()) {                                   // 자를 위한 옛 꼴(매끈한 벡터)
        ctx.strokeStyle = f.col || "#c8aa6e"; ctx.lineWidth = 2.5 * us; ctx.setLineDash([7 * us, 5 * us]);
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH, 0, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
      } else {
        /* ★ **예고는 바닥에 그린 자국이다** — 획을 픽셀로 찍어야 스프라이트와 한 결이 된다.
           고리가 넓어 점이 성기면 「선」으로 안 읽히므로 세 찍고 둘 비운다. */
        ctx.fillStyle = f.col || "#c8aa6e";
        pxDashEllipse(ctx, x, y, rr, rr * SQUASH, 2.5 * us, { on: 3, off: 2 });
      }
      ctx.restore(); ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === "bossring") {
      /* ══ 관문 보스가 서는 자리 ══ **여긴 다르다.** 관문은 색이 다른 글줄 하나 말고는
         졸개 층과 똑같이 생겼다 — 보스가 배어 나오기 직전 그 자리 바닥에 붉은 고리를
         크게 퍼뜨렸다가 조여든다(전반은 커지고 후반은 조인다). 「저기 주인이 선다」. */
      const p = 1 - Math.max(0, f.t) / BOSSRING_T;          // 0 → 1
      const x = px(f.x || 0), y = py(f.y || 0);
      const rr = 96 * us * (p < 0.5 ? p * 2 : 1 - (p - 0.5) * 1.5);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.6 * (1 - p * p));
      ctx.strokeStyle = f.col || "#c83232"; ctx.lineWidth = Math.max(1.5, 3 * us * (1 - p * 0.5));
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH, 0, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = Math.max(0, 0.2 * (1 - p));
      ctx.fillStyle = "#5a1010";
      ctx.beginPath(); ctx.ellipse(x, y, rr * 0.8, rr * 0.8 * SQUASH, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === "rise") {
      /* ══ 시체를 쓴 자리 ══ **땅이 터지며 먼지가 일고, 그 위로 혼이 솟는다.**
         고리만 그리던 동안 소환 셋(해골·구울·골렘)은 판에서 **같은 얼굴**이었다 —
         30px 흙고리는 12기가 붙어 있는 화면에서 사실상 안 보인다. 두 겹으로 나눈다:
           · 고리(아래) — 「여기 시체를 썼다」. 퍼지며 옅어진다.
           · 혼(위)     — 「무엇이 섰다」. `assets/fx/raise.png`, 작게 시작해 커지며 뜬다.
         ★ 혼은 몸이 땅에서 올라오는 것과 **같은 시간**(RISE_T)을 쓴다 — 유닛의 e.rise
           가 다 도는 순간 그림도 걷힌다(둘이 어긋나면 남남으로 보인다). */
      const p = 1 - Math.max(0, f.t) / RISE_T;               // 0 → 1
      const x = px(f.x || 0), y = py(f.y || 0), rr = 30 * us * (0.35 + 0.9 * p);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.55 * (1 - p));
      ctx.strokeStyle = "#6f5a3c"; ctx.lineWidth = Math.max(1, 2.4 * us * (1 - p * 0.7));
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * SQUASH * 0.9, 0, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = Math.max(0, 0.30 * (1 - p));
      ctx.fillStyle = "#2a2018";
      ctx.beginPath(); ctx.ellipse(x, y, rr * 0.75, rr * 0.75 * SQUASH, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
      const art = FX_ART.rise, im = sprite(art.img);
      if (im) {
        /* 앞머리는 또렷하게 들어왔다가 뒤로 갈수록 걷힌다 — 솟는 동안 살짝 떠오른다. */
        const hh = art.h * (0.62 + 0.5 * p);   // h 는 표대로 **화면 px**(us 를 곱하지 않는다)
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p * 5)) * (1 - p * p * 0.85);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(im, x - hh / 2, y - hh * 0.82 - hh * 0.18 * p, hh, hh);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    /* ── 뼛조각 ── 시체가 터진 자리에서 튀어 올랐다 떨어진다(battle.js gib).
       ★ **높이(z)는 그림자와 몸을 갈라 그린다** — 그림자는 땅에 붙어 작아지고 몸만
         떠오른다. 둘이 같이 뜨면 발이 땅에서 떨어져 통째로 들썩여 보인다
         (마을 네크로멘서 숨쉬기에서 배운 것과 같은 자리다). */
    if (f.kind === "gib") {
      const gx = px(f.x), gy = py(f.y), sc2 = (window.__geo && window.__geo.sc) || 1;
      const z = f.z * sc2, sz = (f.big ? 4 : 2.6) * Math.max(1, sc2 * 2.2);
      const fade = Math.min(1, f.t * 4);
      ctx.save();
      /* 땅 그림자 — 높이 오를수록 작고 옅게 */
      ctx.globalAlpha = 0.32 * fade * Math.max(0.15, 1 - f.z / 90);
      ctx.fillStyle = "#120c08";
      ctx.beginPath(); ctx.ellipse(gx, gy, sz * 0.9, sz * 0.45, 0, 0, 6.2832); ctx.fill();
      /* 조각 — 누운 것은 안 돌고 바닥에 붙는다(자국처럼 남는다) */
      ctx.globalAlpha = fade;
      ctx.translate(gx, gy - z - (f.landed ? 0 : sz * 0.4));
      if (!f.landed) ctx.rotate(f.spin);
      /* ★ **네모가 아니라 조각이다.** 처음엔 정사각형으로 그렸더니 「흰 네모가 날아간다」로
         보였다 — 뼛조각은 **길쭉하다.** 가로 대 세로를 1:0.42 로 두고 도는 각도를 주면
         같은 픽셀 수로도 「부러진 뼈」로 읽힌다. 색도 한 톤 낮췄다(#d9cdb4 는 이 판에서
         제일 밝은 축이라 눈이 그리로만 갔다).
         ★★ **그래도 판때기였다**(V-45). 길쭉한 네모는 여전히 «종잇조각»이다 — 누운 것은
         돌지도 않아 **가로 막대가 줄줄이** 눕는다. 같은 픽셀 수로 **양 끝에 마디가 붙은
         뼈**를 그리고 **어두운 테**를 먼저 깔면(밝은 면적이 그만큼 준다) 갈색 바닥에서
         떠오르지 않으면서 「부러진 뼈」로 읽힌다. 누운 것에는 각도를 다시 준다 —
         바닥에 붙는 것과 **안 도는 것**은 다른 말이다(옛 그림은 둘을 한 줄로 묶었다). */
      if (globalThis.__GIBOLD) {
        ctx.fillStyle = f.landed ? "#5e5344" : "#bfb298";
        ctx.fillRect(-sz, -sz * 0.21, sz * 2, sz * 0.42);
      } else {
        if (f.landed) ctx.rotate(f.lie !== undefined ? f.lie : (f.lie = f.spin));
        const col = f.landed ? "#655a48" : "#bfb298";
        const dk  = f.landed ? "#2b241c" : "#5a5140";
        /* 뼈 한 대 — 대(shaft) 하나 + 마디 넷. `g` 만큼 바깥으로 부풀려 테를 만든다.
           마디는 **작게** 둔다 — 크면 아령으로 읽힌다(처음 판이 그랬다). */
        const bone = (c, g) => {
          ctx.fillStyle = c;
          ctx.fillRect(-sz * 0.80 - g, -sz * 0.13 - g, sz * 1.60 + g * 2, sz * 0.26 + g * 2);
          const k = sz * 0.24 + g * 2;
          for (const sx of [-1, 1]) for (const sy of [-1, 1])
            ctx.fillRect(sx * sz * 0.80 - k / 2, sy * sz * 0.21 - k / 2, k, k);
        };
        bone(dk, Math.max(0.8, sz * 0.13));
        bone(col, 0);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
    /* ★★ **어느 그림을 쓰는지는 표 하나가 답한다**(FX_ART). 예전엔 이 줄이
       `f.kind === "nova" ? "nova" : "hit"` 였다 — 모르는 kind 가 전부 조용히 `hit` 으로
       떨어져서, 태우기는 **소환 그림**, 제물은 **폭발 그림**으로 나가고 저주는 아무것도
       안 떴는데 **404 가 안 나서** 아무도 몰랐다(병수님 2026-08-15: "또 스킬 이펙트 에셋
       제대로 안만든거 있네"). 게다가 `raise.png` 는 만들어 놓고 **한 번도 안 쓰였다** —
       소환이 28px 짜리 hit 한 점으로 반짝이고 말았다.
       표로 모으면 자(tools/fx_art.mjs)가 「이 스킬이 무슨 그림을 쓰나」를 물어볼 곳이 생긴다. */
    const art = FX_ART[f.kind];
    const im = sprite(art ? art.img : "fx/hit");
    ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 3));
    /* ★ 폭발은 **작게 시작해 커지며** 옅어진다. 예전엔 크기가 붙박이라 알파만 오르내려
       「원이 깜빡」였다 — 터지는 것은 퍼져 나가야 터진 것으로 읽힌다.
       f.t 는 남은 시간이라 0.35→0 으로 준다. 시작 0.55배 → 끝 1.18배. */
    const grow = art && art.grow ? 0.55 + 0.63 * (1 - Math.max(0, Math.min(1, f.t / (art.life || 0.35)))) : 1;
    const hh = (art ? art.h : 28) * grow;
    const x = px(f.x || 0), y = py(f.y || 0);
    /* ★ V-4 · **저주가 셋이 되니 그림 한 장으로는 «어느 것»인지가 안 보인다.** 셋 다 같은
       curse.png 를 쓰되, 걸린 저주의 빛깔로 **발밑 고리**를 같이 깐다(약화 초록 · 쇠약 금빛 ·
       피해 증폭은 그림 그대로). 그림을 새로 굽기 전까지의 자리표가 아니라, 고리 자체가
       「판 전체에 걸렸다」를 뜻해서 저주와 결이 맞는다. */
    if (f.col) {
      ctx.save();
      ctx.strokeStyle = f.col; ctx.lineWidth = 3;
      ctx.globalAlpha *= 0.85;
      /* ★ V-70 · **여기도 바닥에 그린 고리다** — 눌림은 `SQUASH_VIEW_C`(셈에 쓰는 붙박이
         0.78)가 아니라 **판이 지금 쓰는 `SQUASH`** 여야 한다(1512×863 에서 0.50).
         붙박이로 그리면 저주 고리만 판보다 1.5 배 서 있어 같은 자리에 겹친 그림과
         테두리가 어긋난다 — 위 바닥 그림과 같은 흠이라 같이 옮긴다
         ([[carry-fixes-forward]]). 셈(1216 줄의 사거리)은 그대로 붙박이를 쓴다. */
      ctx.beginPath(); ctx.ellipse(x, y, hh * 0.62, hh * 0.62 * SQUASH, 0, 0, 6.284); ctx.stroke();
      ctx.restore();
    }
    /* ★ V-70 · **바닥에 깔리는 그림은 판과 같이 눌러 그린다.** `curse.png`·`nova.png` 는
       위에서 내려다본 고리(바닥에 그린 진 · 퍼지는 충격파)인데, 세운 그림과 똑같이
       정사각으로 찍고 있었다 — 판 위의 모든 둘레는 `SQUASH` 로 눌려 있는데 이 둘만
       **동그라미**라, 바닥의 진이 아니라 **세워 놓은 굴렁쇠**로 읽혔다(19층 그림
       tmp/look_deep.png 왼쪽 아래). 세우는 그림(rise·burn·offer)은 그대로 둔다 —
       raise.png 는 제 발치에 눌린 고리를 이미 달고 있다.
       ★ 눌린 그림은 **발치가 곧 한가운데**다(세운 그림의 0.72 오프셋은 발을 땅에
         맞추려던 것이라 여기서는 그림을 위로 띄운다). */
    const flat = art && art.flat && !noFlatFx();
    if (im) { ctx.imageSmoothingEnabled = false;
      if (flat) ctx.drawImage(im, x - hh / 2, y - hh * SQUASH / 2, hh, hh * SQUASH);
      else      ctx.drawImage(im, x - hh / 2, y - hh * 0.72, hh, hh); }
    else { ctx.fillStyle = f.kind === "nova" ? "#ff8000" : "#e8dcc2";
      ctx.beginPath(); ctx.arc(x, y - 14, f.kind === "nova" ? 70 : 5, 0, 6.284); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  /* ══ 들어섰다 ══ 판 위의 모든 것(①~⑤) 위에 마지막으로 얹는다 — 층이 바뀌는 순간·
     관문에 들어선 순간을 화면에 남긴다. 흔들림 밖에서 그리므로(drawArrive 가 좌표계를
     다시 고정한다) 명패는 떨지 않는다. */
  drawArrive(w, h);
}

/* ══ 층이 바뀌는 순간 · 관문에 들어서는 순간 ══
   층이 바뀌는 일이 로그 글줄 하나로만 지나갔다(enterFloor 의 say 한 줄). 방치형은
   **보는 게임**인데, 판에서 가장 큰 사건(내려간다·관문이다)이 화면에 아무 흔적도
   안 남겼다. 세 겹을 얹어 「지금 뭔가 달라졌다」를 판에 만든다:
     · 비네트 — 가장자리가 잠깐 어두워졌다 걷힌다(관문은 검붉게, 걷힌 뒤에도 옅게 남는다)
     · 명패   — 위쪽 가운데에 층수가 내려앉는다(관문은 두 줄 + 이중 테두리)
     · 빛의 띠 — 판을 위→아래로 한 번 훑는다(「내려가고 있다」)
   상태는 둘로 나뉜다: S.arrive(한 번 켜지고 step 이 끄는 것 — 걷히는 연출)와,
   「지금이 관문 층인가」(isGate — 층 내내 상시로 남는 옅은 비네트).
   ★ 흔들림(draw 초입 translate) 밖에 둔다 — 명패가 떨면 못 읽는다. setTransform 으로
     좌표계를 화면에 다시 고정해 캔버스 흔들림을 무른다. */
const vigCache = new Map();
function drawArrive(w, h) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = w / 2;
  /* ★★ **화면 전체 그러데이션을 매 프레임 새로 만들고 칠했다.** 관문 층에서는 이게
     내내 돈다(isGate 상시 비네트) — 폰에서 제일 비싼 축이다(전면 채우기 + 그러데이션
     생성). 그림은 **크기와 색에만** 달렸으니 구워 두고 알파만 바꿔 얹는다.
     ★ 알파를 열쇠에 안 넣는다 — 들어설 때 알파가 프레임마다 바뀌므로 넣으면 캐시가
       매 프레임 새로 구워져 **되레 느려진다.** 알파 1 로 굽고 globalAlpha 로 조절한다. */
  const vignette = (alpha, rgb) => {
    if (alpha <= 0) return;
    const key = `${w}x${h}|${rgb}`;
    let t = vigCache.get(key);
    if (!t) {
      t = document.createElement("canvas"); t.width = w; t.height = h;
      const g2 = t.getContext("2d");
      const g = g2.createRadialGradient(cx, h / 2, Math.min(w, h) * 0.32,
                                        cx, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},1)`);
      g2.fillStyle = g; g2.fillRect(0, 0, w, h);
      vigCache.set(key, t);
      if (vigCache.size > 8) vigCache.clear();
    }
    ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.drawImage(t, 0, 0); ctx.restore();
  };

  /* 관문 층 **내내** — 옅은 검붉은 비네트가 상시로 남는다. arrive 와 무관하게 isGate 로
     걸어야 층이 넘어가는 순간 저절로 사라진다(「여긴 다르다」가 상시로 읽혀야 한다). */
  if (isGate(S.floor)) vignette(0.12, "78,10,12");

  const a = S.arrive;
  if (!a) return;
  const e = ARRIVE_T - a.t;                           // 경과(0 → ARRIVE_T)

  /* 들어선 순간의 비네트 — 0.2초 안에 가장 어둡고 1.4초에 걸쳐 걷힌다. 관문은 더
     무겁고 검붉다(위 상시 비네트에 겹쳐 더 짙어진다). */
  const vig = e < 0.2 ? e / 0.2 : Math.max(0, 1 - (e - 0.2) / 1.4);
  if (vig > 0) vignette((a.gate ? 0.52 : 0.42) * vig, a.gate ? "52,6,8" : "0,0,0");

  /* 빛의 띠 — 위→아래로 한 번 훑는다. 조금 일찍 끝나(0.8배) 명패만 남는다.
     과하면 안 된다 — 알파 0.15 언저리에서 끝으로 갈수록 옅어진다. */
  const sweep = e / (ARRIVE_T * 0.8);
  if (sweep < 1) {
    const by = sweep * (h * 1.1) - h * 0.05, bh = h * 0.13;
    const g = ctx.createLinearGradient(0, by - bh, 0, by + bh);
    g.addColorStop(0, "rgba(210,188,128,0)");
    g.addColorStop(0.5, `rgba(214,192,132,${0.15 * (1 - sweep * 0.4)})`);
    g.addColorStop(1, "rgba(210,188,128,0)");
    ctx.fillStyle = g; ctx.fillRect(0, by - bh, w, bh * 2);
  }

  /* 층 명패 — 살짝 위에서 내려앉아 멈췄다가 사라진다. D2 금색(#c8aa6e — 관문 로그·
     상점 유니크와 같은 색), 캔버스에 이미 쓰는 픽셀 글꼴(Galmuri9)로 판과 결을 맞춘다. */
  const drop = Math.min(1, e / 0.35), yoff = -20 * (1 - drop) * (1 - drop);   // ease-out
  const alpha = Math.max(0, Math.min(1, e < 0.2 ? e / 0.2 : (a.t < 0.45 ? a.t / 0.45 : 1)));
  const k = Math.max(1, Math.min(1.7, w / 420));      // 넓은 화면에서 명패도 같이 큰다
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.lineJoin = "round";
  const topY = h * 0.15 + yoff;

  if (a.gate) {
    /* ★ 아랫줄은 **본문 글자보다 작아지지 않게** 바닥을 둔다 — 세로 화면(k=1)에서
       g9(12) 은 9px 이라 본문(18=9×2)의 절반이 된다. */
    const big = g9(28 * k), sub = g9(Math.max(18, 12 * k));
    const padX = 20 * k, padY = 12 * k, gap = 7 * k;
    const l1 = `${a.f}층`, l2 = "관문 · 층의 주인";
    ctx.font = `${big}px "Galmuri9", monospace`; const wbig = ctx.measureText(l1).width;
    ctx.font = `${sub}px "Galmuri9", monospace`; const wsub = ctx.measureText(l2).width;
    const boxW = Math.max(wbig, wsub) + padX * 2, boxH = big + gap + sub + padY * 2;
    const bx = cx - boxW / 2;
    /* 검붉은 판 위에 **얇은 이중 테두리**(금선 둘) — 관문임을 테두리로도 말한다. */
    ctx.fillStyle = "rgba(20,8,8,0.62)"; ctx.fillRect(bx, topY, boxW, boxH);
    ctx.strokeStyle = "#c8aa6e"; ctx.lineWidth = Math.max(1, 1.4 * k);
    ctx.strokeRect(bx, topY, boxW, boxH);
    ctx.save(); ctx.globalAlpha = alpha * 0.6; ctx.lineWidth = Math.max(1, k);
    ctx.strokeRect(bx + 4 * k, topY + 4 * k, boxW - 8 * k, boxH - 8 * k); ctx.restore();
    const y1 = topY + padY + big, y2 = y1 + gap + sub;
    ctx.strokeStyle = "#1a0c06"; ctx.lineWidth = Math.max(2, 2 * k);
    ctx.font = `${big}px "Galmuri9", monospace`; ctx.fillStyle = "#e6c988";
    ctx.strokeText(l1, cx, y1); ctx.fillText(l1, cx, y1);
    ctx.font = `${sub}px "Galmuri9", monospace`; ctx.fillStyle = "#c8aa6e";
    ctx.strokeText(l2, cx, y2); ctx.fillText(l2, cx, y2);
  } else {
    const big = g9(30 * k), txt = `${a.f}층`;
    ctx.font = `${big}px "Galmuri9", monospace`;
    ctx.strokeStyle = "#160f04"; ctx.lineWidth = Math.max(2, 2.4 * k);
    ctx.fillStyle = "#c8aa6e";
    const y1 = topY + big;
    ctx.strokeText(txt, cx, y1); ctx.fillText(txt, cx, y1);
  }
  ctx.restore();
}

/* ══ 벨트 ══ D2 의 그 띠. 쓸 수 있으면 금테가 살고, 못 쓰면 죽는다 —
   **왜 못 쓰는지**(마나냐 시체냐)는 아래 글줄이 말한다. */
/* ★★ 디아블로 4 의 스킬바는 **여섯 칸이 늘 있고** 안 배운 자리는 빈 칸으로 남는다
   (병수님: "이거 디아4인데 하단 UI 보이지? 이거 최대한 비슷하게 구현해봐").
   칸 수가 스킬 수에 따라 늘었다 줄었다 하면 **띠의 폭이 흔들려** 판이 안 잡힌다 —
   자리를 먼저 만들어 두고 채워 넣는 쪽이 맞다. 빈 칸은 「아직 없는 것」이라는
   정보이기도 하다. */
const BELT_SLOTS = 6;

/* 벨트 칸을 찾아 둔 자리 — belt() 가 채우고 beltState() 가 매 프레임 읽는다. */
let beltEls = [];

/** **칸에 손을 얹으면 뜨는 글** — 이 판에서 스킬 값을 말하는 **유일한 자리**다(V-131).
 *  여태 `${s.n} — ${s.d}` 뿐이라 셋이 틀렸다:
 *  ㉠ 표의 글월을 그대로 적어 **「시체 1 → 주위 광역 피해」**라 했는데 폭발은 16구를 문다.
 *  ㉡ 글월 안의 `<b>` 가 **날것으로 떴다** — title 은 평문이라 태그가 글자로 보인다
 *     (「일정 시간 적이 <b>받는</b> 피해 증가」).
 *  ㉢ **마나·재사용이 아예 없었다** — 칸이 죽어도(`beltState`) 왜인지 알 길이 없다.
 *  ★ 값은 **판이 쓰는 그 함수에서** 뽑는다(`mpCost` · `cdMul` · `gulpOf`) — 손으로 적으면
 *    트리(값싼 죽음 −10%/급 · 신속)를 찍는 순간 칸만 옛말을 한다
 *    ([[threshold-and-ruler-must-match]]). 띠는 `treeChanged` 마다 다시 그려진다.
 *  ★ 여기서 느는 것은 **적는 것뿐**이다 — 마나도 재사용도 시체도 한 톨 안 건드렸다. */
const skTip = (s) => {
  /* 문 — 고치기 «전» 글월을 그대로 세운다(`node tools/v131_skilltip.mjs old`).
     안 울면 자가 스스로 진다([[silent-zero-is-not-an-observation]]). */
  if (globalThis.__TIPOLD) return `${s.n} — ${s.dOld || s.d}`;
  const g = gulpOf(s);
  const cd = s.cd * cdMul();
  /* 저주 셋은 「일정 시간」이라 적혀 있었다(V-131c) — 「깊은 저주」를 급마다 찍어도
     늘어난 초가 화면에 안 떴다. 초도 판이 쓰는 그 식(`durOf` = 거는 자리와 같은 자리)에서
     뽑는다. 저주가 아닌 칸은 0 이라 줄이 안 는다. */
  const dur = durOf(s);
  const cost = [
    s.mp ? `마나 ${mpCost(s)}` : "",
    `재사용 ${cd < 10 ? (Math.round(cd * 10) / 10) : Math.round(cd)}초`,
    g.n ? `시체 ${g.upto ? "최대 " : ""}${g.n}구` : "",
    dur ? `지속 ${dur}초` : "",
  ].filter(Boolean).join(" · ");
  /* 태그는 **떼고** 적는다(㉡). `<b>` 는 글월을 쓴 사람이 창(트리)을 보고 넣은 것이라
     지우지 않고, 평문으로 흘러가는 이 길에서만 벗긴다 — 진실은 여전히 한 자리다. */
  return `${s.n} — ${s.d.replace(/<[^>]*>/g, "")}&#10;${cost}`;
};
function belt() {
  const empty = Array.from({ length: Math.max(0, BELT_SLOTS - SKILLS.length) }, (_, j) =>
    `<div class="slot empty"><canvas class="fr"></canvas><span class="k">${SKILLS.length + j + 1}</span></div>`).join("");
  $("belt").innerHTML = SKILLS.map((s, i) =>
    /* ★ 아이콘은 **그림**이다. 예전엔 유니코드 기호(☠ ✦ ◆ ✹ ✜)를 넣었는데, 주위가
       전부 픽셀아트라 매끈한 시스템 폰트 글리프 하나가 통째로 튀었다(병수님: "UI스타일이
       별로"). 아직 안 구워진 것은 background 가 안 뜰 뿐이라 칸이 깨지지 않는다. */
    /* ★ 칸의 **테두리도 캔버스가 그린다**(js/frame.js). `border:1px solid` 는 언제나
       정확히 1px 이라 픽셀아트 옆에서 매끈하게 튄다. */
    `<div class="slot" data-sk="${s.id}" title="${skTip(s)}"><canvas class="fr"></canvas><i style="background-image:url(assets/ui/icon/${s.id}.png)"></i><span class="k">${i + 1}</span>
      <div class="cd" data-cd="${s.id}" style="height:0"></div></div>`).join("") + empty;
  /* ★ 칸을 **한 번만 찾아 둔다**(아래 beltState 의 ★ 참고). 띠를 다시 그리면
     옛 노드는 버려지므로 여기서 같이 갈아 끼운다. */
  beltEls = SKILLS.map((s) => {
    const el = $("belt").querySelector(`[data-sk="${s.id}"]`);
    /* ★ `ok: null` = **아직 한 번도 안 정했다.** beltState 가 「바뀔 때만」 손대는데
       그 견줌을 `classList` 로 하면 **처음부터 못 쓰는 칸**이 영영 안 죽는다(V-36) —
       갓 만든 칸에는 `on` 도 `off` 도 없어서 `contains("on") !== false` 가 거짓이다.
       여기 적어 두는 이 값은 첫 판정이 「못 씀」이어도 `null !== false` 라 반드시 한 번 지나간다. */
    return el && { s, el, cd: el.querySelector("[data-cd]"), h: -1, cw: 0, ch: 0, ok: null };
  }).filter(Boolean);
  /* 칸은 화면 폭 따라 30~68px 로 변한다 — 크기가 바뀌면 다시 그린다.
     ★ 그때 잰 크기를 **적어 둔다.** beltState 가 다시 그릴 때마다 `clientWidth` 를
     읽으면 그 한 줄이 브라우저에게 **판을 다시 재게 시킨다**(강제 리플로우). */
  for (const el of document.querySelectorAll("#belt .slot"))
    watch(el, (cv, w, h) => {
      const b = beltEls.find((x) => x.el === el);
      if (b) { b.cw = w; b.ch = h; }
      drawSlot(cv, w, h, el.classList.contains("on"), el.classList.contains("empty"));
    });
  $("belt").onclick = (e) => {
    const el = e.target.closest("[data-sk]");
    if (el) cast(el.dataset.sk);
  };
}
/* ★ 이 함수는 **매 프레임** 돈다 — 그래서 여기서 하는 일은 프레임 수만큼 곱해진다.
   예전엔 칸마다 `document.querySelector` 를 **두 번**(칸 하나 · 쿨다운 막대 하나)
   돌렸다. 여섯 칸이면 한 프레임에 문서 전체 훑기 12번이고, CPU 프로파일에서
   `beltState` 가 JS 자기시간 **2위(8초에 198ms)** 였다 — draw 보다 컸다.
   이 맥에서는 안 티 나도 폰에서는 이런 자리부터 무너진다(2026-08-15 「그리고 렉걸림」).
   → 노드는 belt() 에서 한 번 찾아 두고, 높이는 **바뀐 값일 때만** 쓴다
     (같은 문자열을 다시 넣어도 브라우저는 스타일을 다시 셈한다). */
function beltState() {
  for (const b of beltEls) {
    const { s, el } = b;
    const ok = (S.cd[s.id] || 0) <= 0 && S.mp >= mpCost(s) && S.corpses >= corpseNeedOf(s, false);
    /* ★★ V-36 — **견줌은 `classList` 가 아니라 «내가 마지막에 정한 값»으로.** 예전엔
       `el.classList.contains("on") !== ok` 였는데, 칸을 갓 만들면 `on` 도 `off` 도 없어
       첫 판정이 「못 씀」인 칸은 `false !== false` 로 걸러져 **`off` 가 한 번도 안 붙었다.**
       처음 켠 사람의 벨트에서 시체 스킬 셋(태우기·백골 벽·제물)이 22초 내내 그 꼴이었다 —
       금테가 살아 있어 **쓸 수 있는 칸으로 보였다.** `ok: null` 로 시작하니 첫 프레임에
       반드시 한 번 지나간다(그 뒤로는 값이 바뀔 때만 — 아낀 것은 그대로다). */
    if (b.ok !== ok) {                                 // **바뀔 때만** 다시 그린다
      b.ok = ok;
      el.classList.toggle("on", ok);
      el.classList.toggle("off", !ok);
      const cv = el.querySelector("canvas.fr");
      const w = b.cw || Math.round(el.clientWidth), h2 = b.ch || Math.round(el.clientHeight);
      if (cv) drawSlot(cv, w, h2, ok);
    }
    /* 0.1% 아래로는 눈이 못 보니 그 단위로 끊어 견준다 — 안 그러면 부동소수 끝자리가
       매 프레임 달라져 「바뀐 값일 때만」이 늘 참이 된다. */
    const h = Math.round(Math.max(0, Math.min(1, (S.cd[s.id] || 0) / s.cd)) * 1000);
    if (h !== b.h) { b.h = h; b.cd.style.height = h / 10 + "%"; }
  }
}

/** 층 옆의 깊이 배수. hud() 는 매 프레임 도는데 textContent 를 매번 쓰면 애니메이션이
 *  계속 처음으로 되돌아가 **한 번도 안 보인다** — 값이 바뀐 순간에만 손댄다.
 *  밝히는 것은 **자랐을 때만**(마을로 돌아와 ×1.00 이 되는 것은 상이 아니다).
 *  ★ 자란 것을 **글자로 비교하지 않는다** — 줄인 표기에서는 `×1.2k` 의 parseFloat 이
 *  1.2 라 ×999 → ×1.2k 가 **줄어든 것으로 읽힌다**. 값 자체를 들고 비교한다. */
/** ══ 구역을 화면에 세운다 ══ (ROADMAP G-b) `S.zone`(battle.js 가 적는다)만 보고
 *  **한 방향으로** 움직인다 — 바닥을 갈아 끼우고, 머리말에 이름을 적는다.
 *  ★ hud() 는 매 프레임 도는데 `useFloor` 는 바닥을 다시 굽게 만든다(캐시 열쇠에
 *    tile·tint 가 들어 있다). 그래서 **바뀐 순간에만** 부른다 — 매 프레임 부르면
 *    화면 전체를 매 프레임 다시 칠하는 꼴이 된다(그 값은 rtd 에서 한 번 치렀다).
 *  ★ 마을에서는 안 부른다 — hud() 의 이 갈래가 던전일 때만 도는 자리다. */
let _zone = null, _lfloor = null;
function syncZone() {
  /* ★ **방은 구역이 아니라 «층»마다 바뀐다**(V-17). 구역 바닥은 다섯 층에 한 번
     갈리는데, 소품 배치까지 거기 묶어 두면 한 구역을 지나는 내내 같은 방이다 —
     실제로 1층과 2층이 픽셀 단위로 같았다. 배치 씨앗만 층에서 뽑는다(싸다: 바닥
     캐시가 층이 바뀔 때 한 번 다시 구워지고, 그 값은 이미 구역이 갈릴 때 치르던 것이다). */
  const f = S.floor | 0;
  if (_lfloor !== f) { _lfloor = f; useLayout(f); }
  const z = zoneOf(S.floor | 0);
  if (_zone === z.n) return;
  _zone = z.n;
  useFloor(z.tile, z.tint);
  setTxt($$("hZone"), z.n);
}
/** 마을로 나가면 구역 기억을 지운다 — 안 지우면 다시 내려왔을 때 같은 구역으로 보고
 *  마을 흙바닥(useFloor("town"))을 그대로 깔고 있는다. */
export const zoneForget = () => { _zone = null; _lfloor = null; };

let _depthV = 0;
function setDepth(txt, v = 0) {
  const el = $("hDepth");
  if (el.textContent === txt) { _depthV = v; return; }
  /* ★ V-101 — 「빈 칸에서 처음 뜰 때」도 자란 것이다. 옛 셈은 `el.textContent` 가
     비면 무조건 아니라고 했는데, 1층을 비우고 나니 **2층에서 깊이가 처음 붙는 순간**
     (사람이 이 표시를 처음 보는 바로 그 순간)이 조용해졌다. 마을(_depthV = 0)에서
     내려오는 길은 그대로 조용하다 — 굴러온 값이 있을 때만 튄다. */
  const grew = txt && _depthV > 0 && v > _depthV;
  el.textContent = txt;
  _depthV = v;
  if (!grew) return;
  el.classList.remove("up");
  void el.offsetWidth;   /* 리플로우를 강제하지 않으면 같은 애니메이션이 다시 안 돈다 */
  el.classList.add("up");
}

/** 「남은 적 NN」 자리. 잰 것: 폰 폭(414)에서 이 줄은 **배수를 줄여도 7px 이 모자라다.**
 *  자리를 또 짜내는 것은 두 번 해 보고 두 번 다시 깨졌다(hud.css 의 두 ★). 그래서
 *  **무엇을 버릴지 여기서 정한다 — 말을 버리고 수를 지킨다**(좁은 화면: 「적 24」).
 *  ellipsis 에 맡기면 하필 **끝에 있는 수**가 먹혀 숫자가 거짓말을 한다.
 *  hud() 는 매 프레임 도니 글자가 바뀐 순간에만 innerHTML 을 손댄다. */
function setLeft(html) {
  const el = $("hLeft");
  if (el.dataset.h === html) return;
  el.dataset.h = html;
  el.innerHTML = html;
}

/* 열려 있는 능력치 창을 **따라 살게 한다** — 예전엔 여는 순간의 값으로 굳어서, 구슬은
   242 인데 창은 172 를 붙들고 있었다(PC 에서는 창을 켜 둔 채 보게 되니 더 티가 난다).
   매 번 다시 그리면 고른 칸이 깜빡이므로 **값이 실제로 바뀐 때만** 다시 그린다. */
let statSig = "";
function refreshOpenStat() {
  const open = $("winStat").classList.contains("on"), openBag = $("winBag").classList.contains("on");
  if (!open && !openBag) { statSig = ""; return; }
  const sig = [hpMaxOf(), mpMaxOf(), armyCap(), META.gold, META.bag.length, META.lv,
               GEAR_KEYS.map((k) => scoreOf(equipped(k))).join()].join("|");
  if (sig === statSig) return;
  statSig = sig; if (open) drawStat(); if (openBag) drawBag();
}

/** ★ V-116 — **마을은 «내려갈 때의 몸»을 보여야 한다.**
 *  `toTown` 은 이미 그 약속을 글로 적어 뒀다 — 「내려갈 때의 몸이 지금 보이는 몸이다」.
 *  그런데 몸의 크기(`hpMaxOf`·`armyCap`)는 **서 있는 층**에서 나오는데, 마을은 판에서
 *  나올 때의 `S.floor` 를 그대로 들고 있다. 그래서 4층에서 나온 사람의 마을 구슬이
 *  140/140 인데 다시 1층에 서면 93/93 이다(잰 값 · 레벨·장비·강화 한 톨도 안 바뀜).
 *  **2026-08-13 에 세운 「마을에서는 마을의 말만 한다」가 시체·군세에만 옮겨졌고
 *  구슬에는 안 옮겨진 것**이다([[carry-fixes-forward]]) — 화면에서 가장 큰 수가
 *  가장 크게 거짓말한다(V-101·V-105·V-106·V-107·V-108 과 같은 자리).
 *  ★ **값도 규칙도 안 건드린다.** 마을에서는 판이 안 돌고, 새 판은 `newRun` 이
 *    `startFloor()` 로 층을 다시 박고 `enterFloor` 가 몸을 그 층에 맞춘다 —
 *    여기서 미리 맞춰 두는 것은 **보여 주는 층**뿐이다.
 *  ★ 한 곳에만 적는다 — `toTown` 과 `hud` 두 곳에 베끼면 웨이포인트를 고른 순간
 *    둘이 갈린다([[seam-not-values]]). 문은 `__TOWNBODYOLD`. */
function townFloorSync() {
  if (MODE.at !== "town" || window.__TOWNBODYOLD) return false;
  const f = startFloor();
  if (S.floor === f) return false;
  S.floor = f;
  zoneForget();   // 다음에 내려갈 때 바닥·배치를 다시 고르게 한다(_lfloor 도 같이 비운다)
  return true;
}

function hud() {
  refreshOpenStat();
  /* ★ V-116 — 마을에 선 층을 «다음에 내려갈 층»으로 맞춘다(위 townFloorSync).
     매 프레임 보는 까닭은 «어디부터» 창에서 표를 고르면 그 자리에서 몸이 갈리기 때문이다. */
  townFloorSync();
  /* ★ **마을에서도 상한을 지킨다.** 넘친 것을 걷는 자리는 battle.step 안인데 마을에서는
     판이 안 돈다 — 그래서 장비를 갈아 끼워 최대치가 내려가면 「1.2k/398」이 그대로
     떠 있었다(2026-08-13 스샷). 그리기 직전에 한 번 더 맞춘다. */
  { const hm = hpMaxOf(), mm = mpMaxOf();
    S.hpMax = hm; if (S.hp > hm) S.hp = hm;
    S.mpMax = mm; if (S.mp > mm) S.mp = mm;
    /* ★ V-116 — **마을은 쉬는 곳이다**(toTown 의 그 규칙). 표를 더 깊은 층으로 옮기면
       상한이 «올라가는데», 위 자르기는 내려가는 쪽만 본다 — 그러면 마을에 반쯤 빈
       구슬이 선다. 마을에서만 가득 채운다(판이 안 도니 깎을 것도 없다). */
    if (MODE.at === "town" && !window.__TOWNBODYOLD) { S.hp = hm; S.mp = mm; } }
  /* 마을에서는 층이 아니라 **여기가 어디인지**를 적는다. 「1층 정리 중」이 마을 위에
     떠 있으면 화면이 무슨 장면인지 헷갈린다. */
  if (MODE.at === "town") {
    setTxt($$("hFloor"), "마을");
    /* 좁은 화면에서 「가장 깊이…」로 잘려 **정작 층수가 먹혔다**(2026-08-13, 나가기
       단추를 넣고 눈으로 보다 발견). 아래 「남은 적」과 같은 규칙을 쓴다 —
       .lw 로 감싼 말은 좁으면 사라지고 **수는 남는다**(「깊이 15층」). */
    /* ★ V-108 — **처음 켠 사람은 아직 한 층도 안 걸었다.** `META.deepest` 밑값이 1 이라
       던전 문 앞에 선 사람에게 「가장 깊이 1층」이라고 말하고 있었다(V-99b 에서 적어 둠).
       V-101 「×1.00」· V-105 「0/0」· V-106 「밝은 0」· V-107 「▲ 14」와 같은 자리다
       ([[carry-fixes-forward]]) — **뜻 없는 수가 화면에서 가장 크게 거짓말하는 것**.
       규칙은 안 건드린다(core.js `neverDove` 주석) — 글월만 가른다.
       `.lw` 는 좁으면 사라지는 말이라, 360px 에서는 「안 내려감」만 남는다. */
    setLeft(!window.__DEEPOLD && neverDove()
      ? `<span class="lw">아직 </span>안 내려감`
      : `<span class="lw">가장 </span>깊이 ${META.deepest}층`);
    /* 마을에는 깊이가 없다(1층 = ×1.00). 빈 글자로 두면 :empty 가 자리까지 지운다. */
    setDepth("");
    setTxt($$("hZone"), "");      // 마을은 구역이 아니다
  } else {
  setTxt($$("hFloor"), S.floor + "층");
  syncZone();
  /* ★ V-101 — **1층의 「×1.00」은 아무 말도 안 한다.** 마을에서는 이미 지웠는데
     (바로 위 `setDepth("")` · 「마을에는 깊이가 없다(1층 = ×1.00)」) 정작 **처음 켠
     사람이 맨 처음 들어가는 1층**에는 그 못이 안 옮겨졌다([[carry-fixes-forward]]).
     능력치 창도 같은 규칙을 쓴다 — 「값이 붙었을 때만 적는다」(아래 `depthMul` 줄).
     `:empty{display:none}`(style.css) 이 빈 글자면 자리까지 거둔다. */
  const dm = mul(depthMul());
  setDepth(!window.__DEP1OLD && dm === mul(1) ? "" : dm, depthMul());
  /* **얼마나 남았는지**가 없으면 층이 바뀌는 순간이 그냥 툭 온다. 남은 수를 적고
     띠로도 보인다 — 방치형은 보는 게임이라 진행이 눈에 보여야 한다. */
  const left = S.mobs.length;
  setLeft(left ? `<span class="lw">남은 </span>적 ${left}` : "다음 층 준비 중");
  }
  /* ★ 예전엔 `$("hLv").firstChild.nodeValue` 였다. 단추로 바꾸면서 앞에 그림을 넣자
     firstChild 가 글자가 아니라 <i> 가 되어 **레벨이 Lv.1 에서 굳었다**(조용히).
     자리를 이름으로 잡는다 — 안쪽 차림이 바뀌어도 안 깨진다. */
  setTxt($$("hLvT"), "Lv." + META.lv);
  markSp();
  /* ★ 위 띠의 금은 **줄인 표기**(num)로 적는다 — `toLocaleString()` 은 자릿수가 자랄수록
     넓어지는데(1,234,567 은 아홉 글자), 이 줄에서 줄어들 수 있는 칸은 `overflow:hidden` 이
     걸린 왼쪽 하나뿐이라 **금이 불어난 만큼 「깊이 137층」·「적 25」가 먹혔다**.
     그래서 자가 「가끔」 울었다 — 금은 판마다 다르니 되풀이가 안 됐던 것이다
     (tools/topbar_stress.mjs 로 360px·금 9,528 부터 8px 씩 밀리는 것을 잼).
     낱수는 상인·대장간·능력치 창이 그대로 보여 준다(거기는 자리가 넉넉하다) —
     위 띠는 **어림수**면 족하고, title 에 낱수를 남겨 둔다. */
  /* 금은 **낱수가 바뀔 때만** 손댄다 — 줄인 표기(num)가 같아도 title 의 낱수는 다르다. */
  { const g = META.gold | 0, el = $$("hGold");
    if (el.__g !== g) { el.__g = g; el.textContent = num(g); el.title = g.toLocaleString() + " 금"; } }
  /* 채움을 **세로(height)와 가로(--pct) 양쪽으로** 알려 준다. 구슬은 세로로 차오르고
     띠는 가로로 차오르는데, 어느 쪽을 쓸지는 판의 결(테마)이 정한다 — 여기서는 둘 다 준다. */
  /* 구슬은 **캔버스에 픽셀로** 그린다(js/orb.js) — CSS 원은 가장자리가 매끄러워
     픽셀 화면에서 거기만 튄다. 값이 바뀔 때만 다시 그린다(매 프레임 30x30 을 두 번
     훑을 이유가 없다). */
  const hpPct = Math.max(0, Math.min(1, S.hp / hpMaxOf())),
        mpPct = Math.max(0, Math.min(1, S.mp / mpMaxOf()));
  const hq = Math.round(hpPct * 30), mq = Math.round(mpPct * 30);
  if (hq !== hud._hq) { hud._hq = hq; drawOrb($("hpOrb"), "hp", hpPct); }
  if (mq !== hud._mq) { hud._mq = mq; drawOrb($("mpOrb"), "mp", mpPct); }
  /* ★ 값이 커지면 「2280/2280」 이 구슬 폭을 넘는다(병수님 지적). 글꼴은 11px 격자가
     최소라 더 못 줄이므로 **값 쪽을 줄인다** — 네 자리부터 k 로 적는다.
     1000 미만은 그대로 둔다(초반에 굳이 1.0k 로 적으면 오히려 안 읽힌다). */
  /* ★ 자가 **지금 값만** 보면 나중에 값이 커질 때 또 넘친다. 나올 수 있는 최악의
     표기를 재 보니 「1280k/1280k」(104px)만 구슬(112px)을 넘겼다 — 백만을 넘으면
     **단계를 하나 더** 올린다(1.3M). 「지금 안 넘친다」와 「앞으로도 안 넘친다」는 다르다. */
  /* ★ 글자를 넣고 **넘치면 한 격자 내린다**(27 → 18px). 둘 다 9격자의 배수라
     어느 쪽이든 선명하다. 구슬을 넓혀서 자리를 만들려던 것이 모양을 망친
     원인이었으니(원 → 타원 → 네모), 이제 **그릇은 그대로 두고 글자가 맞춘다.**
     길이는 짐작하지 않고 canvas 로 **잰다** — 값이 커져도 규칙이 그대로 산다. */
  fitNum($("hpNum"), S.hp, hpMaxOf());
  fitNum($("mpNum"), S.mp, mpMaxOf());
  /* 시체·군세는 **로그에서 뺐다.** 흘러가는 글줄에 섞어 두면 늘 봐야 하는 값이
     지나간 사건에 밀려 사라진다. 판의 게이지 칸으로 옮겼다(벨트 아래 빈자리). */
  /* ★ **상한을 같이 적는다.** 그냥 「시체 1277」이면 그게 많은 건지 모자란 건지 알 수가
     없다 — 자원은 **천장이 보여야** 아까워진다(140/140 이면 지금 버리고 있다는 뜻). */
  /* ★ **마을에서는 마을의 말만 한다**(병수님 2026-08-13). 「시체 3/140」은 판의 자원인데
     갓 켠 마을에도 떠 있었다(newRun 이 먼저 돌아 3 을 넣어 둔 그 값이다) — 마을에서는
     쓸 데가 없으니 **뜻 없는 수**다. 같은 자리에 마을에서 쓰는 값을 넣는다:
     가방은 상점·무덤·대장간이 채우는 칸이고, 군세는 **다음 판에 데려갈 상한**이다
     (마릿수 N/M 이 아니라 상한 하나 — 마을에는 서 있는 하수인이 없다). */
  if (MODE.at === "town") {
    setTxt($$("gCorpse"), `가방 ${bagUsed()}/${BAG_MAX}`);
    setTxt($$("gArmy"), `군세 ${armyCap()}`);   // 「최대」는 뺀다 — 좁은 줄에서 수를 밀어낸다(실측 22px)
  } else {
  setTxt($$("gCorpse"), `시체 ${S.corpses}/${CORPSE_MAX}`);
  /* 상한에 붙으면 색이 달라진다 — 쌓기만 하면 손해다. 전투 중에는 시체가 문턱을
     넘나들어 이 켜짐이 자주 뒤집히므로 **바뀔 때만** 손댄다(`beltState` 와 같은 병). */
  { const full = S.corpses >= CORPSE_MAX, el = $$("gCorpse");
    if (el.__full !== full) { el.__full = full; el.classList.toggle("full", full); } }
  /* 지배한 놈은 상한 밖이라 **따로 적는다** — 한 칸에 섞으면 「6/6 인데 왜 더 서 있지」가 된다 */
  setTxt($$("gArmy"), `군세 ${armyN()}/${armyCap()}` + (thrallN() ? ` +${thrallN()}` : ""));
  }
  const need = xpNeed(META.lv);
  /* 막대는 **0.1% 눈금으로 바뀐 때만** 쓴다 — 매 프레임 같은 문자열을 style 에 넣으면
     그때마다 스타일을 다시 셈한다(눈에 보이는 폭은 0.1% 아래로 안 갈린다). */
  { const w = Math.min(100, (META.xp / need) * 100), el = $$("xpFill"), k = Math.round(w * 10);
    if (el.__w !== k) { el.__w = k; el.style.width = w + "%"; } }
  /* ★ 경험치 분수에도 **자릿점**을 찍는다 — 늘 떠 있는 줄인데 여기만 날것이었다
     (V-95 가 정산에서 고친 그 못을 여기엔 안 박았다). `num()` 의 「1.7k」가 아니라
     자릿점인 까닭은 **한 판이 이 수를 얼마나 밀었는지**를 보는 자리이기 때문이다 —
     1.7k 로 줄이면 오늘 번 800 이 안 보인다.
     ★ 감싸던 `xpNumFrac` 은 걷어냈다 — 폰에서 이 줄을 숨기려고 둔 껍데기인데
     「모바일을 걷어낸다」(521f501)가 **규칙만 지우고 껍데기와 그 까닭을 적은 주석은
     남겼다.** 읽는 곳이 한 곳도 없었다(V-96 의 rail 예외와 같은 병). */
  setHTML($$("xpNum"), `Lv.${META.lv} ${gnum(META.xp)}/${gnum(need)}`);
  /* 서른 줄 넘게 낸다 — 좁은 창에서는 hud.css 가 높이로 세 줄만 남기고 자른다(overflow).
     넓은 창에서는 왼쪽 패널이 그 열넉 줄을 다 세운다(「일지」). */
  /* ★ 이 한 줄이 `hud` 에서 제일 비쌌다 — 서른네 줄을 **매 프레임** 파서에 다시 물렸다.
     로그는 사건이 있을 때만 바뀌므로 글자가 같으면 통째로 건너뛴다. */
  setHTML($$("log"), S.log.slice(0, 34).map(l => `<div>${l}</div>`).join(""));
  beltState();
}

/** ══ 옆 패널 채우기는 **없앴다** ══ (병수님 2026-08-17 23:16 「필요없음」)
 *  군세·몸·낀 것·의뢰·채비·지난 판이 여기서 만들어졌다. 패널이 사라졌으니 만들 자리도
 *  없다 — **빈 함수를 남기지 않고 부르는 쪽에서도 지운다**(안 그러면 매 틱 도는 고리에
 *  「아무 일도 안 하는 호출」이 남고, 다음 사람이 그게 뭘 하는지 찾아 헤맨다).
 *  그 값들이 사라져도 화면은 안 비어 있다: 군세·시체·레벨은 **아래 판**이 말하고,
 *  낀 것·수치·의뢰는 **능력치/가방 창**이 말한다. */


/** **자동으로 소환한다.** 방치형이므로 사람이 안 눌러도 군대는 선다 —
 *  사람이 하는 건 "언제 시체를 아껴 폭발로 쓸까" 같은 판단이지 잔손질이 아니다. */
/* ⑧-f **되짚기 빨리 감기 안에서도 이 머리가 돈다**(battle.js registerAutoTick).
   여태 auto 는 아래 그리는 고리에서만 불렸다 — 그래서 되짚는 층을 ×3 으로 감는 동안
   머리는 셋에 한 번만 돌았다(ROADMAP J 가 S.speed 에서 이미 고친 그 결함이다). */
/** ══ V-117 (2026-08-27) ══ **금이 저절로 타는데 판은 한 줄도 안 적었다.**
 *  마을에서 「금 1.8M」이던 것이 던전에 들어선 지 20초 만에 「44k」다 — 사람은 아무것도
 *  안 눌렀다(`tools/v117_forge.mjs`). 판의 다른 사건은 전부 한 줄을 남긴다 — 소환 ·
 *  시체 폭발 · 전리품 · 「가방이 차서 … → 금 158」 · 레벨업. **금을 태우는 것만 조용했다**
 *  ([[carry-fixes-forward]]). `autoForge()` 는 산 것을 돌려주는데 부르는 쪽이 `.length`
 *  만 보고 버렸다 — 말할 재료는 여태 있었다.
 *  ★ 처음 켠 사람에게는 **안 보이던 흠**이다. 금이 세 자리라 한 번 사고 마는데,
 *    오래 논 사람은 모아 둔 은행이 몇 초에 사라진다([[knob-that-does-nothing]] 의 반대 —
 *    손잡이는 도는데 아무도 그걸 안 알려 준다).
 *  ★ **묶어서 적는다** — 한 틱에 여덟까지 사므로 낱개로 적으면 로그가 강화로 덮인다.
 *  ★ 묶는 자는 **게임초**(S.t)다. 벽시계로 묶으면 같은 판이 실행마다 다른 줄을 낸다
 *    ([[same-seed-is-not-same-run]]). 판이 새로 시작하면(S.t 가 되감기면) 자도 되감는다.
 *  ★ **값도 규칙도 안 건드린다** — 무엇을 얼마에 사는지는 한 톨도 그대로고, 여기서 느는
 *    것은 적는 것뿐이다. D 계열 잠금 밖이다. 옛 결은 `__FORGESAYOLD`. */
/*  ★★ **처음 쓴 글월은 타일에 먹혔다.** 산 것을 이름으로 세어(「방패 재련 ×7 · 허리띠
 *     재련 ×7 · 신발 재련 ×7 · 외 8 — 금 591k」) 적었더니 1280 에서 **꼬리(금값)가
 *     메뉴 타일 밑으로 들어갔다** — V-114 가 레벨업 줄에서 고친 바로 그 자리인데
 *     새 줄에 안 옮겼다([[carry-fixes-forward]]). 이름을 세지 말고 **두 갈래**로만 센다:
 *     강화(대장간 넷)와 재련(슬롯 여섯). 길이가 값과 무관하게 늘 짧고, 사람이 묻는
 *     것(「금이 어디로 갔나」)에는 그대로 답한다 — 어느 축인지는 능력치·대장간 창이 말한다. */
const FORGE_SAY_GAP = 2;                       /* 게임초 — 이 사이에 산 것은 한 줄로 묶는다 */
const forgeSay = { gold: 0, up: 0, re: 0, at: -Infinity };
function forgeTally(bought) {
  if (window.__FORGESAYOLD) return;            // 자가 «고치기 전»을 재는 문
  for (const b of bought) {
    forgeSay.gold += b.cost | 0;
    if (b.reforge) forgeSay.re++; else forgeSay.up++;
  }
  const t = +S.t || 0;
  if (t < forgeSay.at) forgeSay.at = -Infinity; // 새 판 — 게임초가 되감겼다
  if (t - forgeSay.at < FORGE_SAY_GAP) return;
  forgeSay.at = t;
  const n = (w, c) => (c ? [c > 1 ? `${w} ×${c}` : w] : []);
  const head = [...n("강화", forgeSay.up), ...n("재련", forgeSay.re)];
  say(`<b>대장간</b> 저절로 ${head.join(" · ")} — 금 <b>${num(forgeSay.gold)}</b>`);
  forgeSay.gold = 0; forgeSay.up = 0; forgeSay.re = 0;
}

function auto() {
  if (S.dead) return;
  /* ★ **금을 저절로 태운다**(core.js autoForge). 여기 둔 이유 — 마을은 들르는 곳이고
     방치형의 시간은 던전에서 흐른다. 상점 몫은 남기므로 손으로 할 축은 그대로다. */
  { const bought = autoForge(); if (bought.length) { saveMeta(); forgeTally(bought); } }
  /* ── 군세는 **셋의 결로** 나눠 세운다(core.js: 해골 수 · 구울 몸 · 골렘 벽) ──
     예전엔 「골렘 한 마리 세워 두고, 시체 2 이상이면 무조건 구울」이라 상한이 통째로
     구울로 찼다(30분 머릿수 구울 79%·해골 13%·골렘 5마리뿐, tmp/ap_baseline.json).
     그건 결이 아니라 사고다 — 셋이 다른 일을 하는데 하나만 뽑혔다. 이제 **상한을
     셋이 나눠 갖는다**: 벽 몇 · 몸 얼마 · 나머지는 전부 수. */
  const cap = armyCap(), mine = S.minions.filter(m => !m.own);
  const nGolem = mine.filter(m => m.kind === "golem").length;
  const nGhoul = mine.filter(m => m.kind === "ghoul").length;
  /* 벽 몇 · 몸 얼마는 이제 **사람이 고른 편성(core.js DOCTRINE)에서 뽑는다** — 예전엔
     여기 숫자로 박혀 있었다(벽 max(1,min(3,floor(cap/4))) · 몸 0.35). 기본값 `balance` 는
     그 식과 정확히 같은 산수라, 편성을 안 건드린 판은 손대기 전과 한 톨도 안 다르다.
     채우는 차례(벽→몸→수)와 「못 세우면 다음 결로 샌다」 사슬은 아래 그대로 둔다. */
  const { golem: wantGolem, ghoul: wantGhoul } = doctrineWants(cap);
  /* ㉧ **골렘이 원하는 만큼 안 서면 제일 약한 해골에게 자리를 물린다**(__SLOT_YIELD · 기본 꺼짐).
     자가 답한 자리다(ab_golem.sh 08-17 19:0x): 나무를 당겨 해금을 85초 앞당겼는데 **선 기수는
     1.2 그대로**였고, 미해금에서 뺀 15% 를 **꽉참이 그대로 받아먹었다**(33→40%). 열렸을 땐
     이미 해골이 칸을 다 차지한 뒤라, 고칠 것은 값도 해금 시각도 아니라 **채우는 차례**다.
     꺼져 있으면 slotYield 가 첫 줄에서 false 라 아래 사슬이 예전과 비트까지 같다. */
  if (nGolem < wantGolem) slotYield("golem", ["skel"]);
  /* ㉡㉢ 상한 위(over)·꽉 참(merge) 이 켜지면 상한에 닿아도 소환을 시도한다 — cast() 가
     초과 세우기/머지를 스스로 판단한다(못 하면 side-effect 없이 false 라 이 사슬이 안전).
     둘 다 꺼졌으면 armyCapEff()==cap · CAP_MERGE_OF()≤1 이라 조건이 예전 `armyN() < cap` 과 같다. */
  /* ★ D-48 · **시도조차 못 한 초를 여기서 센다.** 상한이 차 있으면 아래 사슬을 통째로
     건너뛰므로 cast 가 안 불리고, 그러면 RAISE_TALLY 에 아무 자국도 안 남는다 —
     「상한이 벽이다」가 장부에서 조용한 0 으로 사라지던 자리다(battle.js RAISE_TALLY 머리말).
     세기만 한다 — 아래 조건식은 한 글자도 안 바뀌었다. */
  if (!(armyN() < armyCapEff() || CAP_MERGE_OF() > 1)) RAISE_TALLY.capskip++;
  if (armyN() < armyCapEff() || CAP_MERGE_OF() > 1) {
    /* 벽 → 몸 → 수 차례로 채우되, 못 세우면(마나·재사용·시체) **다음 결로 샌다** —
       cast 는 못 쓰면 side-effect 없이 false 라(battle.js) 이 한 줄 사슬이 안전하다. */
    if (!(nGolem < wantGolem && cast("golem")) &&
        !(nGhoul < wantGhoul && S.corpses >= 2 && cast("ghoul")))
      /* ㉥ **해골이 제 재사용에만 막혔으면 다른 결로 샌다**(core.js RAISE_SPILL_OF · 기본 0).
         여기까지 왔다는 것은 자리도 자원도 있다는 뜻이다(위 armyCapEff/merge 검사를 지났고
         cast 는 못 쓰면 side-effect 없이 false 다). 그런데 S.cd 는 스킬마다 따로라, 해골이
         쿨인 그 순간 구울 손은 비어 있을 수 있다 — 검수기로 재 보니 merge 판에서 그 초의
         **42~51%** 가 그랬다. 편성 몫(wantGhoul)을 넘겨 세우는 것이 이 팔의 전부고,
         재사용 초·마나·시체 값은 한 톨도 안 건드린다.
         ★ 시체 2 이상일 때만 구울로 샌다 — 위 편성 사슬과 **같은 문턱**이다(해골 몫을
           굶기지 않는다). 꺼져 있으면 && 가 앞에서 끊어 cast 를 안 부른다(RNG 도 그대로). */
      if (!cast("raise") && RAISE_SPILL_OF() > 0 && (S.cd.raise || 0) > 0) {
        if (!(S.corpses >= 2 && cast("ghoul"))) cast("golem");
      }
  }
  /* **저주도 자동이다.** 벽은 관문이었고(죽기 직전 5초 피해의 100%가 「층의 주인」)
     셈이 답을 말한다 — 군대가 보스를 잡는 데 35초가 걸리는데 군대는 19초면 지워진다.
     머릿수(재소환 두 배)도 마중(BOSS_CALL)도 그 셈을 못 바꿨다. 바꾸는 건 **화력**이고,
     저주는 소환수 피해에도 곱해진다(ampMul). 값은 마나인데 죽을 때 마나가 82% 남아
     있었다 — **노는 자원을 화력으로 바꾸는 자리**다.
     ★ 재 보고 고른 모양이다(tools/ab_fire.sh, 씨앗 3·9·5 · 12분):
       그대로 15.0층 · RAISE_DMG 0.09 는 15.0(제자리) · **이것이 18.0층**.
       관문에서만 걸기(15.7) · 마나 45% 위에서만 걸기(16.7) 도 대 봤지만 둘 다 못 미쳤다 —
       저주는 관문뿐 아니라 **평지를 빨리 쓸어** 더 깊이 내려가게 한다.
     ★★ 그런데 저주가 **소환보다 먼저** 마나를 먹어 군대가 못 섰다(죽을 때 마나 2%·군세 17%).
       고칠 것은 값이 아니라 **차례**다 — 재 봤다(tools/ab_mana.sh, 씨앗 3·9·5 · 12분, 최고층 합):
       그대로 45(15/15/15) · 저주를 소환 뒤로 48(17/16/15) · **군세가 상한일 때만 51(15/18/18)**.
       군대를 먼저 채우고 남는 마나로 저주한다. 씨앗 3 만 15 에 머무니 그쪽은 다른 벽이다. */
  /* ★ 저주·폭발의 「언제」는 이제 **사람이 고른 운용(core.js TACTIC)에서 뽑는다** — 예전엔
     여기 문턱이 박혀 있었다(저주 군세 상한 · 폭발 시체 20%). 기본값 `steady` 는 그 문턱과
     정확히 같은 식이라, 운용을 안 건드린 판은 손대기 전과 한 톨도 안 다르다(RNG 소비도).
     ★ **차례는 그대로다** — 소환 → 저주 → (offer·wall) → 폭발 → burn. 마나를 누가 먼저
       먹느냐는 재 보고 정한 순서다(ab_mana.sh). 표에서 뽑는 건 조건뿐, 자리는 안 옮긴다. */
  const tac = tacticOf(), boss = S.mobs.some(m => m.boss);
  if (S.mobs.length && (!tac.ampCapped || armyN() >= armyCap()) && (!tac.ampBossOnly || boss)) cast("amp");
  /* ★ V-4 · **저주 둘은 «언제»가 amp 와 다르다.** amp 는 화력이라 늘 걸수록 이득이지만,
     아래 둘은 **목숨을 사는 저주**다 — 편할 때 걸면 마나만 태우고 정작 위험한 순간에
     재사용이 돌고 있다. 그래서 「지금 위험한가」를 조건으로 둔다:
       · 약화 — 몸이 70% 아래로 내려갔거나 관문(보스)일 때. 적이 «주는» 피해를 깎으므로
         맞고 있을 때가 아니면 아무 일도 안 한다.
       · 쇠약 — 더 비싸고(22) 더 길게 도니(14초) 더 급할 때만: 몸 50% 아래 또는 보스.
     둘 다 해금 전에는 SKILLS 에 없어 cast 가 곧장 false 다(castOnce 첫 줄) — 안 찍은
     판은 이 두 줄이 없는 것과 같다. */
  const hurtFrac = S.hp / (S.hpMax || 1);
  if (S.mobs.length && (boss || hurtFrac < 0.70)) cast("weaken");
  if (S.mobs.length && (boss || hurtFrac < 0.50)) cast("decrep");
  /* ★ **넘치기 직전의 시체는 터뜨린다.** 상한을 두는 것만으로는 「버려진다」가 될 뿐이라
     자원이 되지 않는다 — 남는 몫을 화력으로 바꾸는 자리를 낸다(저주를 마나에 낸 것과 같은
     이치다). **맨 끝에** 둔 것이 중요하다: 소환이 먼저 마나를 가져가고, 군대를 다 세우고도
     남을 때만 터진다. 문턱을 상한의 3/4 로 둬서 **아직 모자란 구간은 사람의 몫으로** 남긴다
     — 아껴 뒀다 쓰는 판단은 그 아래에서만 뜻이 있다. */
  /* ⑥ 시체 소비처 셋 — 소환·폭발뿐이던 시체를 쓰는 길을 넓힌다. 소환·저주가 먼저 마나를
     가져간 뒤라(위) 군대를 안 굶긴다. offer·wall 은 **폭발보다 먼저** 둔다 — 폭발의 한 입
     (gulp)이 쌓인 시체를 통째로 삼켜 버리면 뒤에 남는 게 없어 관문·길목에서 못 쓴다. 대신
     진짜 쌓일 때만(문턱 높게) 돌아 평소엔 폭발이 그대로 주 소비처다. __NOSINK 는
     검수기(corpse_probe)가 같은 빌드로 before/after 를 가르는 스위치다. */
  if (!globalThis.__NOSINK) {
    if (S.corpses >= CORPSE_MAX * 0.85 && S.mobs.some(m => m.boss)) cast("offer");
    if (S.mobs.length >= 5 && S.corpses >= CORPSE_MAX * 0.85) cast("wall");
  }
  /* ★ D-47 · **편성마다 폭발의 문턱이 다르다**(core.js `__DOC_CORPSE` · 기본 꺼짐).
     꺼져 있으면 dc = {novaMul:1, keep:0} 이라 이 줄은 예전 식과 **한 톨도 안 다르다**.
     켜면 해골·구울 편성은 문턱이 높아지고 남길 몫(keep)이 생겨, 그 시체를 auto() **앞줄의
     소환**이 먼저 가져간다 — 값이 아니라 차례가 답을 만든다. */
  /* ★ V-125 · 문턱을 **core 의 `novaNeedOf` 한 곳**에서 뽑는다 — 창(운용 툴팁)이 「몇 구에서
     터지나」를 적으려면 같은 식을 봐야 하는데, 두 벌로 적으면 언젠가 갈린다
     ([[threshold-and-ruler-must-match]]). `corpses - keep >= max×nc×mul` 과 **같은 판정**이다
     (시체는 정수라 올림해도 갈림이 없다) — 즉 이 줄로 바뀌는 값은 한 톨도 없다. */
  if (S.mobs.length && S.corpses >= novaNeedOf(tacticId(), CORPSE_MAX) && (!tac.novaBossOnly || boss)) cast("nova");
  if (!globalThis.__NOSINK && S.corpses >= CORPSE_MAX * 0.85 && S.mp < mpMaxOf() * 0.90) cast("burn");
  /* ㉤ **마른 마나에 문을 연다** (__BURN_MANA · 기본 0 = 꺼짐). 위 줄은 「시체가 넘칠 때」만
     연다 — 140 중 119구다. 그래서 마나가 벽인데 시체는 중간(46~72구)인 판에서는 이 출구가
     통째로 닫혀 있었다(㉣ 이 만든 판이 정확히 그랬다: 마나부족 40% · 시체는 안 넘침).
     여기서는 문턱을 **마나 쪽으로** 돌린다 — 태우는 양도 얻는 마나도 그대로고, 바뀌는
     것은 「언제 열리는가」뿐이다. 소환에 쓸 몫(BURN_KEEP)은 남긴다.
     ★ 꺼짐이면 `bm > 0` 이 앞에서 끊어 cast 를 안 부른다 — RNG 도 안 쓴다. */
  { const bm = BURN_MANA_OF();
    if (!globalThis.__NOSINK && bm > 0 && S.mp < mpMaxOf() * bm && S.corpses >= BURN_KEEP) cast("burn"); }
}

/* ══ 마을과 던전 ══ 병수님: "마을에서 던전으로 진입하는거고".
   **한 화면을 두 장면으로 쓴다** — 같은 캔버스·같은 렌더 규칙. 다른 것은 무엇을
   그리느냐와 시간이 흐르느냐뿐이다(마을에서는 싸움이 멈춘다). */
export const MODE = { at: "town" };

/* ══ 마을의 창 ══ **한 줄에 한 가지 결정**만 담는다. 값이 여럿이면 표가 되고,
   표는 방치형이 아니라 숙제가 된다. */
const WINS = ["winShop", "winForge", "winTree", "winStat", "winBag", "winEnd", "winReborn", "winOffline", "winDoctrine", "winTactic", "winDive", "winWipe"];
/* 창이 뜨면 **뒤의 로그를 죽인다** — 정산 창이 떠 있는데 그 밖에 「전멸 · 20층에서
   쓰러짐」이 붉게 남아 시선이 갈렸다(병수님 2026-08-12). 창은 지금 읽을 것 하나만
   남겨야 창이다. 어느 창이든 하나라도 열려 있으면 끈다(hud.css 의 body.winopen). */
/* ★ 열 때 **다시 잰다** — 그리는 것(drawStat/drawBag)이 창을 열기 **전에** 돌아서,
   그 자리에서는 아직 숨은 칸이라 clientHeight 가 0 이다(넘침 판정이 못 선다). */
/* ⑦ 떠 있는 툴팁(#ftip)이 붙박인 칸 · 지금 마우스가 올라와 있는 칸. win() 이 닫힐 때
   상자를 거두므로 여기(win 위)서 미리 선언해 둔다(안 그러면 참조가 앞서 터진다). */
let ftipPin = null, ftipHover = null;
const win = (id, on) => { $(id).classList.toggle("on", on); syncWinOpen();
  if (on) { fitDoll(); if (id === "winTree") fitTree();   /* ★ 트리도 같은 까닭으로 여기서 — 위 주석 참고 */
            for (const el of $(id).querySelectorAll(".wScroll")) markMore(el); }
  else if (id === "winBag" || id === "winStat") ftipClose(); };   // 닫으면 떠 있는 상자도 거둔다
/* ★★ `winover` — **띠를 덮는 창**만 따로 센다(V-85, 2026-08-26).
   V-81 이 편성·운용·환생의 z 를 35 로 올려 「띠가 발치를 밟던 것」을 뒤집었는데,
   뒤집힌 자리에 흠이 남았다: 이 창들은 짧아서 띠에 **걸치기만** 하므로 창틀이 단추의
   윗동만 덮고(1366×700 에서 87% · 환생 30%) 아랫동은 그대로 남는다. 그리고 겉판이
   화면을 통째로 덮는 z 35 라, **모든 크기에서 다섯 칸이 안 눌린다**(1512 에서는
   온전히 보이는데 죽어 있었다 · [[knob-that-does-nothing]]).
   그래서 덮는 창이 열려 있는 동안은 **띠를 통째로 숨긴다** — 이미 죽어 있으므로
   잃는 것이 없고, 상인·대장간·「어디부터」·트리가 하던 것(통째로 가림)과 같아진다.
   ★ 능력치·가방(도킹 한 벌)은 **뺀다** — 띠와 안 겹치고 살아 있어서, 그 둘을 오가는
     유일한 길이다(`tools/v85_bandcut.mjs` 가 그쪽을 지킨다). */
const COVERWINS = WINS.filter(w => w !== "winStat" && w !== "winBag");
const syncWinOpen = () => {
  document.body.classList.toggle("winopen", WINS.some(w => $(w).classList.contains("on")));
  document.body.classList.toggle("winover", COVERWINS.some(w => $(w).classList.contains("on")));
};
/* ★ `charOpen`(능력치+가방 한 벌)도 여기서 걷는다 — 창만 닫고 표식을 남기면 다음에
   다른 창을 열 때 그 창이 반쪽에 붙어 버린다(표식은 창보다 오래 산다). */
const closeAll = () => { for (const w of WINS) win(w, false); document.body.classList.remove("charOpen"); charWhich = null; };
/** ══ V-115 ══ 능력치+가방 한 벌 중 **사람이 부른 쪽.** 도킹은 열 때 한 번만 판정하는데
 *  창 크기는 그 뒤에도 바뀐다 — 좁아져 한 장만 서게 되면 «어느 장을 남길지»를 이 값이 정한다. */
let charWhich = null;
/* 환생 단추는 **마을에서, 임계 층을 넘겼을 때만** 뜬다(나가기가 던전에서만 뜨는 것과 짝).
   자동으로 강제하지 않으므로 단추가 곧 「열렸다」의 유일한 신호다. */
const syncReborn = () =>
  $("hReborn").classList.toggle("on", MODE.at === "town" && canRebirth());

/** 상인 — **장비 등급을 산다.** 한 번 사면 다음 등급이 열린다(반복 구매가 아니다).
 *  그래서 상점에 갈 이유가 「다음 것이 열렸다」로 분명해진다. */
/* ══ 디아블로식 상점 ══ 병수님: "디아블로 스타일 모르냐고,,"
   ──────────────────────────────────────────────────────────────
   **내가 만든 것은 「설정 목록」이었다.** 이름·설명·단추가 세로로 늘어선 표.
   디아블로의 상점은 그렇게 생기지 않았다:

     · 물건이 **격자 칸**에 놓여 있다. 목록이 아니라 **좌판**이다
     · 고르면 **툴팁**이 뜬다 — 검은 판에 이름 한 줄, 그 아래 능력치 줄들
     · **이름의 색이 곧 등급**이다. 흰 → 파랑(매직) → 노랑(레어) → 금갈(유니크).
       D2 를 해 본 사람은 색만 보고 안다. 이 한 가지가 「디아블로답다」의 절반이다

   그래서 격자 + 툴팁으로 다시 짠다. 좁은 화면에서 마우스 호버가 없으므로
   **누르면 아래에 툴팁이 선다**(고른 것이 무엇인지 칸에도 표시된다). */

/** 등급 색 — D2 의 규칙 그대로. */
const TIER_CLS = ["t0", "t1", "t2", "t3", "t4"];
/** ★ 이름 색 = **희귀도**다(2026-08-23 · V-2). 등급은 15층이면 꼭대기라 그 뒤로 주운 것이
 *  전부 같은 빛깔이었다 — D2 처럼 «옵션이 몇 개 붙었나»로 가른다:
 *  흰(r0 일반) · 파랑(r1 매직) · 노랑(r2 희귀) · 주황(uniq). 등급 숫자는 칸 배지에 남는다. */
const RAR_CLS = { norm:"r0", magic:"r1", rare:"r2", uniq:"uniq" };
const clsOf = (it) => RAR_CLS[rarityOf(it)];
/** 툴팁 첫 줄에 붙는 말 — 색만으로는 처음 보는 사람이 못 읽는다. */
const rarWord = (it) => RARITY[rarityOf(it)].n;
/** 유니크면 규칙 한 줄(d) — 「이게 나오면 판이 달라진다」를 말로 보인다. */
const ruleHtml = (it) => { const u = uniqOf(it); return u ? `<div class="tipRule">${u.d}</div>` : ""; };

let shopPick = "wand";                       // 좌판에서 고른 것
let lastDig = null;                           // 직전에 무덤을 판 결과(takeDrop 반환) — 툴팁 한 줄로 남긴다

/** 무덤 파기 결과 한 줄. **금만 빠지고 아무 일도 안 난 것처럼 읽히지 않게** 네 갈래를
 *  가려 적는다 — 갈아 끼움 · 가방으로 · 합쳐짐 · 그 자리서 녹음. battle.js 의 주움 로그와
 *  같은 판정(pickedFused)이고, 이름 색은 TIER_CLS 로 등급을 그대로 보인다. */
const digFateHtml = (r) => {
  if (!r) return "";
  const cls = clsOf(r.ref), nm = nameOf(r.ref);
  const fused = r.fused.find((f) => f.mats.includes(r.ref));
  let line;
  if (r.worn)       line = `<b class="${cls}">${nm}</b> 갈아 끼움`;
  else if (r.bagged) line = `<b class="${cls}">${nm}</b> → 가방 (${bagUsed()}/${BAG_MAX})`;
  else if (fused)   line = `셋이 하나로 — <b class="${TIER_CLS[fused.tier]}">${fused.n}</b>`;
  else              line = `<b class="${cls}">${nm}</b> → 금 ${gnum(r.melted[0].gold)}`;
  return `<div class="tipDig">방금 · ${line}</div>`;
};

function drawDigTip() {
  const cap = dropTierCap(META.deepest), cost = digCost(), can = META.gold >= cost;
  $("shopTip").innerHTML =
    `<div class="tipName t4">무덤 파기</div>
     <div class="tipKind">금을 전리품으로 · 가방 ${bagUsed()}/${BAG_MAX}</div>
     <div class="tipStat">지금 깊이 <b>${META.deepest}층</b> — 최고 <b class="${TIER_CLS[cap]}">${cap}등급</b>까지 · 깊이 <b>×${ilMul(META.deepest).toFixed(2)}</b></div>
     <div class="tipNote sm">깊이를 따라 값이 오른다 — 벌이와 같은 결로 매달아 두었다</div>
     <div class="tipBuy"><span class="cost${can ? "" : " no"}">${gnum(cost)} 금</span>
       <button class="btn" data-dig ${can ? "" : "disabled"}>파기</button></div>` +
    digFateHtml(lastDig);
}

/** ══ 상인 창에서도 **「사면 내 몸이 어떻게 되는가」** ══ (V-134 · 2026-08-27)
 *  V-133 이 가방 툴팁에 박은 못을 **돈이 오가는 자리**로 옮긴다([[carry-fixes-forward]]).
 *  이 창은 3,200 금을 낼지 말지를 정하는 자리인데, 여태 적힌 것은 **물건에 적힌 수**
 *  하나뿐이었다(「최대 체력 924 → 1,120」). 그 수는 `bodyHp` 안쪽 값이라 사람이 보는
 *  체력은 천장을 지나 나온다 — V-133 실측으로 「+369」가 몸에서는 +233 이었다.
 *  ★ 식을 여기 다시 적지 않는다 — **살 때 손에 들어오는 바로 그 물건**을 잠깐 끼워 보고
 *    판이 쓰는 함수에서 앞뒤를 읽는다(`core.gearStats` · 끝나면 곧바로 되돌린다 ·
 *    `saveMeta` 를 안 부르므로 저장도 값도 규칙도 한 톨 안 바뀐다 · D 계열 잠금 밖이다).
 *  ★ 위의 「다음 · 녹슨 홀」 줄은 **그대로 둔다** — 그것은 «이 물건이 무엇인가»이고
 *    여기는 «내가 어떻게 되는가»다(V-133 이 옵션 줄을 남겨 둔 것과 같은 까닭).
 *  ★ 문은 `__SHOPFX_OLD`. */
/* ★ 문(`__SHOPFX_OLD`)은 **null** 을 낸다 — 「블록도 없고 밑의 말도 없던」 옛 화면 그대로다.
   빈 배열([])은 「봤는데 움직이는 수가 없다」라는 **다른 말**이라 그 자리에 한 줄을 적는다
   ([[silent-zero-is-not-an-observation]]). */
const shopFx = (k, nx) =>
  (nx === null || (typeof globalThis !== "undefined" && globalThis.__SHOPFX_OLD)) ? null
  /* 상점 것은 **옵션 없는 바닥**이고 깊이(il)도 안 붙는다 — `data-buy` 가 부르는
     `mkItem(k, nx, true)` 와 같은 물건이다. 얼굴(v)만 0 으로 세운다(mkItem 은 거기서
     난수를 먹는데, 그리는 자리에서 난수를 먹으면 안 된다 · 값에는 안 쓰인다). */
  : gearStats({ k, tier: nx, af: [], v: 0, il: 0 });
/* ★ 새 줄을 얹었으면 **그 값을 이 툴팁 안에서 갚는다**([[floor-erases-the-ramp]]) —
   트리(V-123)가 좁은 창에서 한 그것과 같다. 갚는 자리는 ① 촘촘한 판(.tFx · 트리·대장간이
   쓰는 그것) ② 「상인이 파는 것엔 옵션이 없다」 한 줄 — 이 줄은 «이 물건을 살까»와 상관이
   없는 일반 지식이라, 둘 중 접을 것은 이쪽이다. 잰 값은 V-134 항목의 표에 있다. */
const shopFxHtml = (fx) =>
  !fx?.length ? "" :
  `<div class="tipCmp tFx"><div class="tipKind fxK">사면 <b>내 몸</b>이 이렇게 된다</div>` +
  fx.map((r) => `<div class="tipStat ${r.up ? "up" : "down"}"><span class="sN">${r.n}</span>` +
    `<b>${gearStatShow(r.k, r.now)} <span class="tFxA">→</span> ${gearStatShow(r.k, r.next)}</b></div>`).join("") +
  `</div>`;

function drawShop() {
  /* ① 좌판 — 파는 물건이 칸에 놓여 있다 */
  $("shopGrid").innerHTML = Object.entries(GEAR).map(([k, g]) => {
    const t = gearTier(k), n = (equipped(k)?.af || []).length;
    /* 칸에 **붙은 것의 개수**를 점으로 찍는다 — 등급만 보면 같은 4등급 둘이 구분이
       안 되고, 랜덤 옵션을 넣은 뜻이 좌판에서 사라진다. */
    return `<div class="cell${k === shopPick ? " sel" : ""}" data-pick="${k}">
      <i class="gear-${k}"></i><span class="q ${qCls(t, TIER_CLS[t])}">${t}</span>
      ${n ? `<span class="afd">${"•".repeat(n)}</span>` : ""}</div>`;
  }).join("") +
    /* 파는 것 옆에 **금을 쓰는 자리** 하나 — 무덤을 파 전리품을 뽑는다(반복 구매).
       칸의 등급 배지는 지금 깊이에서 나올 수 있는 최고 등급(dropTierCap).
       ★ V-34 — 여기만 **유니코드 글리프**(⚰ · 24px)였다. 옆 열 칸이 다 픽셀아트라
         시스템 폰트가 그린 그 한 글자는 칸 안에서 「가늘고 흰 조각」으로 나왔다.
         자로 재니 잉크가 살 것 열 칸의 **14%**(2.1 대 14.8). 좌판에서 제일 안 보이는
         것이 하필 **금을 쓰는 자리**였다. 띠 아이콘 때 이미 배운 것과 같은 자리다
         (belt() 위 ★ 주석) — 그때 고친 규칙을 여기로 안 옮겼다. */
    `<div class="cell dig${shopPick === "dig" ? " sel" : ""}" data-pick="dig">
      <i class="gear-grave"></i>
      <span class="q ${TIER_CLS[dropTierCap(META.deepest)]}">${dropTierCap(META.deepest)}</span>
    </div>` +
    '<div class="cell empty"></div>'.repeat((4 - (GEAR_KEYS.length + 1) % 4) % 4);
  $("shopGold").textContent = (META.gold | 0).toLocaleString();

  /* ② 무덤 파기는 장비와 **다른 툴팁** — 값이 깊이를 따르고, 직전에 뽑은 결과를 남긴다 */
  if (shopPick === "dig") { drawDigTip(); return; }

  /* ③ 장비 툴팁 — 고른 것의 이름과 능력치. **이름 색이 등급**이다 */
  const k = shopPick, g = GEAR[k];
  const it = equipped(k), t = gearTier(k), nx = gearNext(k), max = g.tiers.length - 1;
  const fmt = (v) => gearShow(k, v);
  const cost = nx === null ? 0 : g.cost[nx], can = META.gold >= cost;
  /* ★★ **「다음」 줄의 빛깔을 «방향»으로 정한다**(V-122 · 2026-08-27). 여태는 늘
     `tipStat up` — **언제나 초록**이었다. 그런데 낀 것에는 깊이 곱(`ilMul`)이 붙고
     상인이 파는 것에는 안 붙으므로, 깊이 들어간 사람에게는 **다음 등급이 더 나쁘다.**
     34층(×1.65)에서 다섯 줄, 50층(×1.96)에서 열네 줄이 그렇다 — 예컨대 반지는
     「금 획득 +53%」 아래에 「+50%」를 **초록으로** 적어 두고 3,200 금을 부른다.
     사면 낀 것이 가방으로 빠지므로 **돈을 내고 약해진다.** 가방 창의 견줌 줄은
     이미 오르면 `up` · 내리면 `down` 으로 가르는데(V-121) **그 규칙이 이 창에만
     안 왔다**([[carry-fixes-forward]]).
     · 셈은 **화면에 적히는 수**(gearNum)로 한다 — 날값으로 세면 눈에 같아 보이는 두
       줄이 「올랐다」가 된다([[threshold-and-ruler-must-match]]).
     · **값도 규칙도 안 건드린다** — 단추는 그대로 살아 있고(사고 싶으면 산다) 여기서
       느는 것은 **적는 것**뿐이다. D 계열 잠금 밖이다.
     · 문은 `__SHOPUPOLD` — 늘 초록이던 옛 결을 그 자리서 되세운다. */
  const dir = (nx === null) ? 0 : __SHOPUPOLD() ? 1
    : Math.sign(gearNum(k, g.val[nx]) - gearNum(k, g.val[t] * ilMul(it?.il)));
  /* ★ **빈 칸에는 등급을 붙이지 않는다** (V-102). 처음 켠 사람은 열 칸이 전부 비어 있는데
     첫 줄이 흰색(`--t0`) 「없음」 + 등급표 「일반」이었다 — D2 에서 그 빛깔과 그 낱말은
     **가진 물건**의 표시라, 아무것도 없는 칸이 「일반 등급 물건을 낀 칸」으로 읽혔다.
     같은 못이 능력치 툴팁에는 이미 박혀 있다(`statTipHtml` 의 `if(!it) … "빈 칸"`) —
     여기로만 안 옮겨졌다([[carry-fixes-forward]]). 줄 자체는 남긴다 — 아래 「다음 · 녹슨 홀」
     과 견주는 자리라 없애면 무엇과 견주는지가 사라진다. */
  const 빈칸 = !it && !window.__SHOPNONEOLD;
  const fx = shopFx(k, nx);
  $("shopTip").innerHTML =
    `<div class="tipName ${빈칸 ? "none" : clsOf(it)}">${nameOf(it)}${빈칸 ? "" : ` <span class="rarTag">${rarWord(it)}</span>`}</div>
     <div class="tipKind">${g.n}${it ? ` · 점수 ${Math.round(scoreOf(it))}` : ""} · 가방 ${bagUsed()}/${BAG_MAX}</div>
     <div class="tipStat">${g.d} <b>${fmt(g.val[t] * ilMul(it?.il))}</b></div>` +
    (it?.il > 0 ? `<div class="tipNote sm">${it.il}층에서 나온 것 · 깊이 <b>×${ilMul(it.il).toFixed(2)}</b></div>` : "") +
    ruleHtml(it) +
    /* 붙은 것 — 이 줄이 「같은 등급인데 더 좋다」의 전부다. */
    ((it?.af || []).map((a) => `<div class="tipAf">${afText(a)}</div>`).join("")) +
    (nx !== null && !fx?.length ? `<div class="tipNote sm">상인이 파는 것엔 <b>옵션이 없다</b> — 붙은 건 던전에서</div>` : "") +
    /* ★ 등급 점(`tipPips`)을 **값·단추보다 먼저** 적는다 — 단추가 칸 아래에 붙박이므로
       (hud.css `.win .tip .tipBuy`) 뒤에 오는 것은 그 밑에 깔려 안 보인다. */
    `<div class="tipPips">${Array.from({ length: max }, (_, i) =>
        `<i class="pip${i < t ? " on" : ""}"></i>`).join("")}</div>` +
    (nx === null
      ? `<div class="tipNote">최고 등급 · 더 살 것 없음</div>`
      : `<div class="tipNext ${TIER_CLS[nx]}">다음 · ${g.tiers[nx]}</div>
         <div class="tipStat ${dir > 0 ? "up" : dir < 0 ? "down" : ""}">${g.d} <b>${fmt(g.val[nx])}</b></div>` +
        (dir > 0 || __SHOPUPOLD() ? "" :
          `<div class="tipNote sm">${dir < 0 ? "지금 낀 것보다 <b>못하다</b>" : "지금 낀 것과 <b>같다</b>"}` +
          (it?.il > 0 ? ` — ${it.il}층에서 주운 것이라 깊이 <b>×${ilMul(it.il).toFixed(2)}</b>가 붙어 있다` : "") +
          ` · 상인 것엔 깊이가 안 붙는다</div>`) +
        shopFxHtml(fx) +
        (fx && !fx.length ? `<div class="tipNote sm">사도 능력치 창의 수는 <b>한 줄도 안 움직인다</b></div>` : "") +
        `<div class="tipBuy"><span class="cost${can ? "" : " no"}">${gnum(cost)} 금</span>
           <button class="btn" data-buy="${k}" ${can ? "" : "disabled"}>사기</button></div>`);
}

let forgePick = "hp";

/** ★★ **「지금 얼마이고, 한 단계 더 올리면 얼마가 되는가」**(V-124 · 2026-08-27).
 *  여태 대장간 툴팁의 「지금」 줄은 **네 칸이 전부 똑같았다** — 체력·마나·군세 셋을
 *  늘 그대로 찍어서, 제일 비싼 「어둠의 힘」(10,164 금)을 골라도 그 칸이 움직이는 수가
 *  화면에 **한 줄도 없었다.** 사고 나서 무엇이 달라졌는지도 알 길이 없다
 *  ([[knob-that-does-nothing]]). 상인 창(V-122)·가방 툴팁(V-121)·트리(V-123)가 이미
 *  「지금 / 다음」을 나란히 적으므로 **같은 못을 이 창에도 박는다**([[carry-fixes-forward]]).
 *  · 수는 전부 `core.upStats` 에서 나온다 — 이 파일에는 식이 한 줄도 없다. 화면이 식을
 *    다시 쓰면 판과 갈릴 자리가 생긴다([[threshold-and-ruler-must-match]]).
 *  · **배수(mul)는 절대값으로 안 적는다** — 소환수 피해에는 깊이·레벨·장비가 다 곱해져
 *    있어 그 수는 **어느 칸을 골라도 똑같다.** 그래서 **이 강화의 몫**(단계 0 대비)으로
 *    적는다(트리와 같은 규칙 · `treeShow`). 체력·마나·상한은 사람이 세는 수라 그대로다. */
/** 「한 단계 더」 · 「두 단계 뒤」 — 제자리인 단계를 건너뛴 만큼 그대로 적는다. */
const stepWord = (n) => n <= 1 ? "한 단계 더" : `${n} 단계 뒤`;
const upFxHtml = (k) => {
  /* ★ **문은 옛 꼴을 그대로 다시 세운다** — 없애는 것이 아니라 되돌린다. 안 그러면 나란히
     찍은 그림이 「없던 자리」를 보여 주고, 자도 옛 결을 덜 세게 잰다
     ([[silent-zero-is-not-an-observation]]). 네 칸이 다 똑같던 그 한 줄이 이것이다. */
  if (typeof globalThis !== "undefined" && globalThis.__FORGEFX_OLD)
    return `<div class="tipStat up">${pairs(["지금", `체력 <b>${num(hpMaxOf())}</b>`,
      `마나 <b>${num(mpMaxOf())}</b>`, `군세 <b>${num(armyCap())}</b>`])}</div>`;
  const rows = upStats(k);
  if (!rows.length) return "";                       // 아무 수치도 안 움직이는 강화(있으면 그게 결함이다)
  return `<div class="tipCmp tFx">` + rows.map((r) => {
    /* 아직 한 단계도 안 올린 칸의 「이 강화가 **+0%**」는 뜻이 없다 — 그런 0 이 이 게임에서
       가장 밝은 글자가 되곤 했다(V-102·V-112·V-123). 그 줄은 「한 단계 더」만 적는다. */
    const born = r.k !== "mul" || r.now !== r.base;
    const now = born ? `${r.k === "mul" ? "이 강화가" : "지금"} <b>${treeShow(r.k, r.now, r.base)}</b>` : "";
    const nxt = r.next == null ? ""
      : `${born ? ` <span class="tFxA">→ ${stepWord(r.steps)}</span>` : `<span class="tFxA">${stepWord(r.steps)}</span>`} <b>${treeShow(r.k, r.next, r.base)}</b>`;
    return `<div class="tipStat"><span class="sN">${r.n}</span> ${now}${nxt}</div>`;
  }).join("") + `</div>`;
};

function drawForge() {
  /* 대장간도 같은 결 — **칸에 놓고 고르면 툴팁**.
     ★★ 예전엔 칸에 그림 대신 **이름을 적었다**(생명력·기력·어둠의 힘·군세). 칸이
     41×41 인데 「어둠의 힘」이 18px 로 세 줄(41×81)이 되어 **위로 41px 삐져나가
     제목·부제와 겹치고** 가운데 숫자와도 겹쳤다. 병수님이 「제대로 그려지는지 봐줘」
     라고 해서 열어 보고 알았다 — DOM 넘침 자는 0 을 냈다(뷰포트 밖으로 나간 것만
     보고 **서로 겹치는 것**은 안 쟀다).
     이름을 빼고 **상인 창과 똑같이 아이콘 + 오른쪽 아래 숫자**로 간다. 이름과 설명은
     이미 툴팁에 있으므로 잃는 것이 없고, 글자가 없으니 넘칠 일도 없다.
     그림은 트리에 이미 구워 둔 것을 쓴다(새로 굽지 않는다). */
  $("forgeGrid").innerHTML = Object.entries(UPS).map(([k, u]) => {
    const lv = META.up[k] | 0;
    return `<div class="cell${k === forgePick ? " sel" : ""}" data-fpick="${k}">
      <i class="up-${k}"></i><span class="q ${qCls(lv, "t2")}">${lv}</span></div>`;
  }).join("")
  /* ★ V-57 — 여기 있던 `.repeat(4)` 는 **빈 칸 넷**을 뒤에 붙였다. 격자가 여섯 칸짜리라
     그 넷이 「첫 줄 뒤 둘 + 둘째 줄에 홀로 둘」로 앉아, 강화할 것은 넷뿐인데 판에는
     **구멍 넷**이 보였다. V-28 이 편성·운용에서 이미 정한 규칙이 있다 —
     「고를 것이 넷이면 칸도 넷 · 빈 칸은 «아직 못 여는 것»으로 읽힌다」. 그 규칙을
     이 창에 안 옮긴 것뿐이다([[carry-fixes-forward]]). 격자는 hud.css 에서 넷으로
     좁힌다. 빈 칸은 **자를 위한 문**(noPickName)에서만 되살아난다. */
    + (pickDoor() ? '<div class="cell empty"></div>'.repeat(4) : "");

  /* ★ V-141 — 재련은 슬롯 여섯을 **각각** 고른다(강화 넷과 다른 격자). 칸 꼴은 상인 좌판과
     같게 아이콘 + 오른쪽 아래 배지(지금 +N) · 고른 칸에 sel. 고르기는 기존 `data-fpick`
     길을 그대로 쓰되 `re:` 를 붙여 강화 칸과 가른다(누름 처리는 아래 fpick 하나가 쥔다). */
  $("forgeReGrid").innerHTML = GEAR_KEYS.map((k) => {
    const pl = META.plus[k] | 0;
    return `<div class="cell${forgePick === `re:${k}` ? " sel" : ""}" data-fpick="re:${k}">
      <i class="gear-${k}"></i><span class="q ${qCls(pl, "t2")}">+${pl}</span></div>`;
  }).join("");

  /* 고른 것이 재련 슬롯이면 **재련 설명**을 그린다 — 강화 칸을 고른 때의 아래 툴팁과 다른 결.
     한 단계당 얼마나 오르는가는 그 슬롯의 단위(gearDelta)로 적고, 값·단추는 재련(data-re). */
  if (forgePick.startsWith("re:")) {
    const rk = forgePick.slice(3), g = GEAR[rk], pl = META.plus[rk] | 0;
    const cost = reforgeCost(rk), can = META.gold >= cost;
    $("forgeTip").innerHTML =
      `<div class="tipName t2">${g.n} <span class="lv">+${pl}</span></div>
       <div class="tipKind">재련</div>
       <div class="tipStat tD">${g.d} <span class="lv">— 한 단계당</span> <b>${gearDelta(rk, reforgeStep(rk))}</b></div>
       <div class="tipBuy"><span class="cost${can ? "" : " no"}">${gnum(cost)} 금</span>
         <button class="btn" data-re="${rk}" ${can ? "" : "disabled"}>재련</button></div>`;
    $("forgeGold").textContent = (META.gold | 0).toLocaleString();
    return;
  }

  const k = forgePick, u = UPS[k], lv = META.up[k] | 0;
  const cost = upCost(k), can = META.gold >= cost;
  const pl = META.plus, reNext = GEAR_KEYS.reduce((a, b) => reforgeCost(b) < reforgeCost(a) ? b : a, GEAR_KEYS[0]);
  /* ★ **재련 줄은 «오른 것»만 적는다.** 처음 켠 사람에겐 열 자리가 전부 `+0` 이라, 창
     안에서 **가장 긴 줄(두 줄로 접힌다)이 가장 뜻이 없었다** — V-102 「없음」·
     V-105 「0 · 0/0」· V-106 「밝은 0」· V-107 「▲ 14」· V-108 「가장 깊이 1층」·
     V-110 「10→10층」· V-111 「×1.00」과 같은 자리다.
     · **가라앉히지 않고 접는다 — 여기서 V-111 과 갈린다.** V-111 의 「소환수 피해」에는
       강화 단추가 달려 있어 줄을 지우면 사는 길이 같이 사라졌지만, 이 줄에는 단추가
       없고 **「재련이라는 것이 있다」는 바로 아래 줄이 그대로 말해 준다**
       (「다음 재련 N 금 — 저절로 산다」). 그래서 접어도 잃는 것이 없다.
     · 능력치 창이 유해·깊이·금 획득에 **이미 쓰는 규칙**을 이 창에 옮긴 것뿐이다
       ([[carry-fixes-forward]]).
     · 문(`__REFOLD`)은 옛 결(열 자리 전부)을 되돌려 자를 보정하는 자리다. */
  const reLit = (globalThis.__REFOLD ? GEAR_KEYS : GEAR_KEYS.filter((g) => (pl[g] | 0) > 0));
  const reRow = reLit.length
    ? `<div class="tipStat">${pairs(["재련"].concat(reLit.map((g) => `${GEAR[g].n} <b>+${pl[g] | 0}</b>`)))}</div>`
    : "";
  $("forgeTip").innerHTML =
    `<div class="tipName t2">${u.n} <span class="lv">+${lv}</span></div>
     <div class="tipKind">대장간</div>
     <div class="tipStat tD">${upText(k)} <span class="lv">— 한 단계당</span></div>
     ${upFxHtml(k)}
     ${reRow}
     <div class="tipStat">다음 재련 <b>${reforgeCost(reNext).toLocaleString()} 금</b>${autoForgeOn() ? ` <span class="lv">— 저절로 산다</span>` : ""}</div>
     <div class="tipBuy"><span class="cost${can ? "" : " no"}">${gnum(cost)} 금</span>
       <button class="btn" data-up="${k}" ${can ? "" : "disabled"}>강화</button></div>`;
  $("forgeGold").textContent = (META.gold | 0).toLocaleString();
}

/** ══ 강화가 실제로 무엇을 얼마나 올리는가 ══ (V-132)
 *  여태 강화 단추는 표에 **손으로 적어 둔 몫**(「+25」·「+8%」)을 그대로 보였다. 그런데 그
 *  몫은 `bodyHp`·`dmgMulOf` **안쪽**의 값이라, 화면의 수가 그만큼 오르지 않는다 — 실측으로
 *  체력은 25 가 아니라 **16**, 소환수 피해는 8% 가 아니라 **3.4%** 였다.
 *  그래서 몫을 손으로 안 적고 **그 줄을 그리는 바로 그 함수**에서 뽑아 「지금 → 다음」으로
 *  보인다([[threshold-and-ruler-must-match]]) — 레벨·장비·트리가 바뀌면 이 글도 따라온다.
 *  ★ 상점의 장비가 이미 쓰는 결이다(`gearCmpHtml` 의 「지금↔다음」) — 새 꼴이 아니다
 *    ([[carry-fixes-forward]]).
 *  ★ 「다음」은 **META.up 을 한 급 올려 같은 함수를 부르고 곧바로 되돌려** 얻는다. 저장은
 *    안 건드린다(`saveMeta` 를 안 부른다) — 값도 규칙도 한 톨 안 바뀐다. */
const UP_ROW = {
  hp:   () => num(hpMaxOf()),
  mp:   () => num(mpMaxOf()),
  dmg:  () => mul(minionDmgMul()),
  army: () => String(armyCap()),
};
/** 「한 급 더 사면 이 수가 어떻게 되는가」 — `META.up` 을 잠깐 올려 보고 되돌린다. */
const previewOf = (k, f) => {
  const now = f(), o = META.up[k] | 0;
  META.up[k] = o + 1;
  let next; try { next = f(); } finally { META.up[k] = o; }
  return now === next ? now : `${now} → ${next}`;
};
const upPreview = (k) => { const f = UP_ROW[k]; return f ? previewOf(k, f) : ""; };
/** ★ V-139 — **한 칸이 두 수를 올리는 자리**. 기력은 최대 마나«와» 회복을 같이 올리는데
 *  칸의 글월은 최대 마나만 적었다(회복이 바닥에 삼켜져 안 움직였으니 여태는 맞는 말이었다).
 *  이제 움직이므로 적는다 — `v132_upgrade` 의 ㉡ 이 바로 이 「말 안 하고 같이 올린 줄」을
 *  잡는 자다. 화살(`175 → 183`)을 앞에 두어 그 자가 읽는 몫은 그대로 둔다. */
const UP_MORE = { mp: () => `마나 회복 ${previewOf("mp", () => mpRegenOf().toFixed(2))}/초` };
/** 자를 위한 **문** — `__UPDOLD` 면 V-132 전의 손으로 적은 몫으로 되돌아간다. */
const upText = (k) => globalThis.__UPDOLD ? UPS[k].dOld
  : [`${UPS[k].d} ${upPreview(k)}`.trim(), UP_MORE[k] && UP_MORE[k]()].filter(Boolean).join(" · ");

/** 자를 위한 **문** — `__SHOPUPOLD` 가 켜져 있으면 상인 창의 「다음」 줄이 V-122 **전**의
 *  **언제나 초록**(`tipStat up`)으로 되돌아가고 「못하다」 알림도 안 뜬다. 「초록인데 내려가는
 *  줄이 몇이냐」를 고치기 전 값과 나란히 재려면 옛 꼴을 그 자리서 다시 세울 수 있어야 한다
 *  ([[silent-zero-is-not-an-observation]] · V-120 의 `__WAYOLD` 와 같은 결). */
const __SHOPUPOLD = () => typeof globalThis !== "undefined" && globalThis.__SHOPUPOLD === 1;
/** 자를 위한 **문** — `body.noPickName` 이 붙어 있으면 칸이 이름을 안 대고 빈 칸을 채우던
 *  옛 모습으로 그린다(V-28 전). 고치기 전과 후를 **같은 자**로 재려면 이것이 있어야 한다
 *  — 상인 창의 `body.noSticky`(V-27)와 같은 결이다. 사람이 켜는 길에는 안 붙는다. */
const pickDoor = () => document.body.classList.contains("noPickName");
/** 자를 위한 **문** — `__PICKGLYPH` 가 켜져 있으면 고르는 칸이 V-37 **전**의 유니코드
 *  글리프로 되돌아간다. 「그림이 얼마나 나타나나」를 **고치기 전 값과 나란히** 재려면
 *  옛 꼴을 그 자리에서 다시 세울 수 있어야 한다(V-34 의 `__DIGICO` 와 같은 결). */
const pickGlyph = () => typeof globalThis !== "undefined" && globalThis.__PICKGLYPH === 1;
/** 자를 위한 **문** — `__VECDASH` 가 켜져 있으면 예고 점선이 V-38 **전**의 매끈한
 *  `setLineDash` 로 되돌아간다. 「획이 얼마나 픽셀인가」를 고치기 전 값과 나란히 재려면
 *  옛 꼴을 그 자리에서 다시 세울 수 있어야 한다(V-37 의 `__PICKGLYPH` 와 같은 결). */
const vecDash = () => typeof globalThis !== "undefined" && globalThis.__VECDASH === 1;
/** 자를 위한 **문** — `__NOFLATFX` 가 켜져 있으면 바닥 그림(curse·nova)이 V-70 **전**의
 *  정사각(동그라미)으로 되돌아간다. 「얼마나 눌렸나」를 고치기 전 값과 나란히 재려면
 *  옛 꼴을 그 자리에서 다시 세울 수 있어야 한다(V-38 의 `__VECDASH` 와 같은 결). */
const noFlatFx = () => typeof globalThis !== "undefined" && globalThis.__NOFLATFX === 1;
const pickIco = (kind, id, ico) => pickGlyph()
  ? `<span class="lvl">${ico}</span>` : `<i class="pk-${kind}-${id}"></i>`;

/** 편성 — **군대의 결을 고른다.** 상인·대장간과 같은 격자+툴팁이되, 사는 것이 아니라
 *  고르는 것이라 값이 없고 즉시 적용된다(확인 창 없음 · 되돌릴 수 있다). 지금 고른 것은
 *  칸의 금테(.sel)와 발치(docNow)로 보이고, 툴팁은 그 편성이 이번 상한에서 세우는
 *  벽·몸·수를 그대로 계산해 보여 준다(doctrineWants — auto() 가 읽는 바로 그 함수). */
/** 자를 위한 **문** — `__DOCLOCKOLD` 가 켜져 있으면 편성 창이 V-104 **전**으로 돌아간다
 *  (못 세우는 몸도 멀쩡한 칸으로 세우고, 그 수를 밝은 값으로 적는다). */
const docLockOld = () => typeof globalThis !== "undefined" && globalThis.__DOCLOCKOLD === 1;

/** 자를 위한 **문** — `__ZEROQOLD` 가 켜져 있으면 좌판·대장간의 배지가 V-106 **전**으로
    돌아간다(0 도 등급 빛깔 그대로). 자가 정말 우는지 먼저 보정하려고 둔다
    ([[silent-zero-is-not-an-observation]]). `node tools/v106_zeroq.mjs old` */
const zeroQOld = () => typeof globalThis !== "undefined" && globalThis.__ZEROQOLD === 1;
/** 배지 값이 0 이면 «가라앉은» 표식을 준다 — 안 가진 칸이 좌판에서 가장 밝으면 안 된다. */
const qCls = (v, cls) => `${cls}${v || zeroQOld() ? "" : " off"}`;
/** 지금 **못 세우는 몸** — 구울·골렘은 트리에서 찍어야 `SKILLS` 에 든다(core.js syncSkills).
 *  ★ 편성 창은 여태 이것을 안 봤다. 처음 켠 사람에게 「구울 위주」·「골렘 벽」은 고를 수는
 *    있으나 **한 마리도 안 서는 칸**이고([[knob-that-does-nothing]]), 기본값 「균형」의 셈줄은
 *    「벽(골렘) 1 · 몸(구울) 1」을 **가장 밝은 값**으로 적는다 — V-101 의 「×1.00」·V-102 의
 *    「+0%」와 같은 꼴이다([[carry-fixes-forward]]). 규칙은 한 톨도 안 건드린다 — 고르는 것도
 *    그대로 되고 auto() 의 사슬도 그대로다(못 세우면 그 몫은 해골이 받는다 · main.js auto).
 *    **말만 바로잡는다.** */
const docLocked = () => docLockOld() ? {} : {
  ghoul: !SKILLS.some((s) => s.id === "ghoul"),
  golem: !SKILLS.some((s) => s.id === "golem"),
};
/** 편성 칸이 «앞세우는 몸» — 칸 하나에 하나. 균형·해골 위주는 해골이라 늘 열려 있다. */
const DOC_PRIME = { flesh: "ghoul", wall: "golem" };
/** 지금 **보고 있는** 칸 — 상인·대장간의 `shopPick`/`forgePick` 과 같은 자리(V-113).
 *  여태 편성 창에는 이것이 없어 「보는 것」과 「세우는 것」이 한 낱말이었다: 「아직」이
 *  붙은 칸을 눌러도 그대로 **지금 편성이 되어**, 골렘이 한 마리도 못 서는 판에서 발치가
 *  「지금 · 골렘 벽」이라고 적었다([[knob-that-does-nothing]] · V-104 가 셈줄만 고치고
 *  이 줄에 안 옮긴 자리 · [[carry-fixes-forward]]). 잠긴 칸은 **보여만 준다.** */
let docPick = null;
/** 자를 위한 **문** — `__DOCPICKOLD` 가 켜져 있으면 편성 창이 V-113 **전**으로 돌아간다
 *  (「아직」이 붙은 칸도 누르면 그대로 지금 편성이 되고, 「결과가 같다」를 안 적는다).
 *  `__DOCLOCKOLD`(V-104 전 · 배지 자체가 없다)와는 **다른 문**이다 — 여기서 되돌릴 것은
 *  배지가 아니라 «누르면 골라진다» 쪽이다. */
const docPickOld = () => typeof globalThis !== "undefined" && globalThis.__DOCPICKOLD === 1;
function drawDoctrine() {
  const cur = doctrineId(), cap = armyCap(), door = pickDoor();
  const lk = docLocked();
  const shutOf = (id) => { const need = DOC_PRIME[id]; return !!(need && lk[need]); };
  /* 보는 칸이 없거나 잠금이 풀려 사라진 칸이면 지금 것으로 떨어진다. */
  const view = (docPick && DOCTRINE[docPick]) ? docPick : cur;
  $("docGrid").innerHTML = DOCTRINE_IDS.map((id) => {
    const d = DOCTRINE[id];
    const shut = shutOf(id);
    /* ★ 칸의 그림은 **픽셀아트**다(assets/ui/pick) — 여기 있던 유니코드 글리프(⚖ ☠ ✦ ◆)는
       판에서 유일하게 시스템 폰트가 그리는 칸이었고, ✦ 와 ◆ 는 모양만으로 못 갈랐다
       (V-34 가 상인 좌판에서 고친 그것을 이 창에 안 옮겼다 · V-37). */
    return `<div class="cell${door ? "" : " pick"}${id === cur ? " sel" : ""}${!door && !docPickOld() && id === view && id !== cur ? " pv" : ""}${shut ? " lock" : ""}" data-doc="${id}">${pickIco("doc", id, d.ico)}` +
           (shut && !door ? `<span class="docLock">아직</span>` : "") +
           (door ? "" : `<span class="cn">${d.n}</span>`) + `</div>`;
  }).join("") + (door ? '<div class="cell empty"></div>'.repeat(Math.max(0, 6 - DOCTRINE_IDS.length)) : "");

  const d = DOCTRINE[view], w = doctrineWantsOf(view, cap);
  /* ★ 못 세우는 몫은 **해골이 받는다** — auto() 의 사슬이 그렇다(벽→몸→수 · 못 세우면 샌다).
     그래서 잠긴 것은 「―」로 눕히고 그 수를 해골에 얹는다. 예전 셈줄은 잠겨 있어도
     골렘 1 · 구울 1 을 밝게 적어 **합이 상한을 넘었다.** */
  const gN = lk.golem ? 0 : w.golem, hN = lk.ghoul ? 0 : w.ghoul;
  const dash = (v, off) => off ? `<b class="off">―</b>` : `<b>${v}</b>`;
  const shutList = ["golem", "ghoul"].filter((k) => lk[k]).map((k) => MINIONS[k].n);
  /* 발치는 늘 **지금 세우는 것**을 적는다 — 보고 있는 칸이 아니다. */
  $("docNow").textContent = DOCTRINE[cur].n;
  const shut = shutOf(view);
  /* 넷이 **결과가 같아지는** 동안 그렇게 적는다 — 잠긴 몸의 몫이 전부 해골로 새므로
     처음 켠 사람에게는 「균형」과 「해골 위주」가 **같은 군대**다(5기 전부 해골). 견주는
     자리는 «지금 고른 것»이 아니라 늘 **기본(균형)** 이다 — 고르고 나면 view === cur 이
     되어 견줌이 사라지던 자리([[knob-that-does-nothing]] 를 하나 더 만들 뻔했다). */
  const wDef = doctrineWantsOf(DOCTRINE_DEF, cap);
  const seen = (x) => [lk.golem ? 0 : x.golem, lk.ghoul ? 0 : x.ghoul].join("/");
  const same = !docPickOld() && view !== DOCTRINE_DEF && !shut && seen(w) === seen(wDef);
  $("docTip").innerHTML =
    `<div class="tipName t2">${d.n}</div>
     <div class="tipKind">편성 · 지금 상한 ${cap} 기준</div>
     <div class="tipStat">${d.d}</div>
     <div class="tipStat up">벽(골렘) ${dash(w.golem, lk.golem)} · 몸(구울) ${dash(w.ghoul, lk.ghoul)} · 나머지 수(해골) <b>${Math.max(0, cap - gN - hN)}</b></div>` +
    (shutList.length
      ? `<div class="tipNote lockNote">${shutList.join(" · ")}은 <b>스킬 트리</b>에서 찍어야 선다 — 그때까지 그 몫은 해골이 받는다</div>`
      : "") +
    (shut && !docPickOld()
      ? `<div class="tipNote lockNote">아직 <b>고를 수 없다</b> — ${MINIONS[DOC_PRIME[view]].n}을 찍으면 열린다</div>`
      : same
        ? `<div class="tipNote lockNote">지금은 <b>${DOCTRINE[DOCTRINE_DEF].n}</b>과 결과가 같다 — 갈리는 몸이 아직 안 섰다</div>`
        : "") +
    (shut && !docPickOld() ? "" : `<div class="tipNote sm">고르면 바로 바뀐다 — 이미 선 군대는 그대로, 다음 소환부터 새 비율로 찬다</div>`);
}

/* 운용 — **주술을 언제 쓸지 고른다.** 편성 창과 같은 격자+툴팁이되, 여기서 고르는 것은
 *  auto() 의 폭발·저주 조건(core.js TACTIC)이다. 툴팁은 그 운용이 폭발·저주를 어느 문턱에서
 *  쓰는지를 사람 말로 풀어 보여 준다(편성이 벽·몸·수를 계산해 보여 주는 것과 같은 결). */
function drawTactic() {
  const cur = tacticId(), door = pickDoor();
  $("tacGrid").innerHTML = TACTIC_IDS.map((id) => {
    const t = TACTIC[id];
    /* 편성 창과 같은 결 — 글리프(☯ ⚑ ⬢ ✷) 를 픽셀 그림으로 갈았다(V-37). */
    return `<div class="cell${door ? "" : " pick"}${id === cur ? " sel" : ""}" data-tac="${id}">${pickIco("tac", id, t.ico)}` +
           (door ? "" : `<span class="cn">${t.n}</span>`) + `</div>`;
  }).join("") + (door ? '<div class="cell empty"></div>'.repeat(Math.max(0, 6 - TACTIC_IDS.length)) : "");

  const t = TACTIC[cur];
  /* ★ V-125 · 수는 전부 `core.tacticStats` 에서 나온다 — 이 파일에는 식이 한 줄도 없고,
     auto() 도 같은 `novaNeedOf` 를 부른다(트리 V-123 · 대장간 V-124 와 같은 규칙).
     `__TACFX_OLD` 는 고치기 **전** 결(「시체 20% 이상 · 저주 군세가 상한일 때」)을 그대로
     다시 내는 문이다 — 없애지 않고 세워 둬야 자가 옛 결을 제대로 잰다
     ([[silent-zero-is-not-an-observation]]). */
  const st = tacticStats(cur, CORPSE_MAX), old = globalThis.__TACFX_OLD === 1;
  /* **몇 %가 아니라 몇 구다.** 상한 140 은 화면 어디에도 없는 수라, 「20%」와 「85%」를
     견주려면 사람이 볼 수 없는 값을 알아야 했다([[knob-that-does-nothing]] 의 이웃 —
     손잡이는 도는데 눈금이 없던 자리). 상한도 같이 적어 둘을 이어 준다. */
  const nova = old ? `시체 ${Math.round(t.novaCorpse * 100)}% 이상${t.novaBossOnly ? " · 보스 있을 때만" : ""}`
    : `시체 <b>${st.novaNeed}구</b> 이상<span class="tacOf"> / ${st.corpseMax}</span>${st.novaBossOnly ? " · <b>관문에서만</b>" : ""}`;
  /* 「군세가 상한일 때」도 세어 준다 — 상한은 트리·강화·정예 갈래가 다 곱해 놓은 수라
     사람이 머리로 못 센다. 없으면 「몇 기부터 저주가 도나」를 알 길이 없다. */
  const amp  = old ? `${t.ampBossOnly ? "보스 있을 때 · " : ""}${t.ampCapped ? "군세가 상한일 때" : "상한을 안 기다림"}`
    : `${st.ampBossOnly ? "<b>관문에서만</b> · " : ""}${st.ampCapped ? `군세 <b>${st.ampCap}기</b>가 다 서면` : "<b>군세를 안 기다린다</b>"}`;
  /* ★ **운용이 쥐는 저주는 «피해 증폭» 하나다.** V-4 가 약화·쇠약을 들이면서 그 둘의 「언제」를
     몸 상태에 걸었는데(auto() — 몸 70%/50% 아래 또는 관문), 이 창은 여태 뭉뚱그려 「저주」라
     적고 있었다. 그래서 「관문에서만」을 골라도 평지에서 약화가 도는 것이 **글월과 어긋났다**
     ([[carry-fixes-forward]]). 찍은 사람에게만 한 줄로 덧붙인다 — 안 찍었으면 없는 얘기다. */
  const selfCurse = SKILLS.filter((k) => k.id === "weaken" || k.id === "decrep").map((k) => k.n);
  $("tacNow").textContent = t.n;
  $("tacTip").innerHTML =
    `<div class="tipName t2">${t.n}</div>
     <div class="tipKind">운용 · 주술을 언제 쓰나</div>
     <div class="tipStat">${old ? (t.dOld || t.d) : t.d}</div>` +
    (old
      ? `<div class="tipStat up">폭발 <b>${nova}</b> · 저주 <b>${amp}</b></div>`
      : `<div class="tFx tacFx">
           <div class="tipStat up"><span class="sN">시체 폭발</span> <span>${nova}</span></div>
           <div class="tipStat up"><span class="sN">피해 증폭</span> <span>${amp}</span></div>
         </div>` +
        (selfCurse.length
          ? `<div class="tipNote lockNote">${selfCurse.join(" · ")}은 <b>운용이 쥐지 않는다</b> — 몸이 다치거나 관문일 때 저절로 걸린다</div>`
          : "")) +
    `<div class="tipNote sm">고르면 바로 바뀐다 — 되돌릴 수 있다(확인 창 없음)</div>`;
}

/* ══ 상태창 ══ 병수님: "왼쪽에 낀 것 셋, 오른쪽에 가방, 아래에 합쳐진 수치."
   상인 좌판과 **같은 돌**로 짠다 — 같은 .cell·.grid·.tip 클래스, 같은 TIER_CLS 색.
   ★ 방치형이라 격자·드래그는 만들지 않는다(②의 규칙): 고르면 뜯어보고, 가방 것은
     「끼기」 한 번으로 낀다. 파는 것·버리는 것은 여기 없다(그건 자동이거나 상인 몫). */
let statSel = null;                           // 고른 칸 — {src:"eq",k} 또는 {src:"bag",i}

/** 한 칸을 상점 좌판과 같은 모양으로 — 그림·등급 숫자(색)·옵션 점. */
const gearCell = (it, attr, sel, plus = 0) => {
  const n = it.af.length, uq = !!it.uid;
  return `<div class="cell rar-${clsOf(it)}${sel ? " sel" : ""}${uq ? " uniq" : ""}" ${attr}>
    <i class="gear-${it.k}"></i><span class="q ${uq ? "uniq" : TIER_CLS[it.tier]}">${uq ? "★" : it.tier}</span>
    ${plus ? `<span class="plusBadge">+${plus}</span>` : ""}
    ${n ? `<span class="afd">${"•".repeat(n)}</span>` : ""}</div>`;
};

/** 합쳐진 수치 — **「등급 기본값 + 붙은 옵션」의 합**은 전부 core.js 함수가 읽는다.
 *  화면에서 다시 계산하지 않는다(같은 식이 두 곳이면 갈라진다). */
const statNumbers = () => {
  /* ★ 줄의 셋째 칸은 **그 줄을 키우는 강화**(core.js UPS)다 — 병수님 「능력치 창이 읽기
     전용이다」. 「지금 이 몸이 무엇을 할 수 있는가」를 읽는 자리인데 손댈 데가 없어
     대장간까지 갔다 와야 했다. 값을 읽는 그 줄에서 바로 키운다.
     ★ **새 길이 아니다** — 사는 셈은 대장간 단추와 **같은 `data-up` 한 곳**이 쥔다
       (같은 식이 두 곳이면 갈라진다). 그러니 값·차례·저장이 한 톨도 안 달라진다.
     ★ 균형도 안 건드린다 — 금은 이미 판 안에서 `autoForge()` 가 저절로 태우고 있다
       (auto() 안, 던전에서도 돈다). 여기서 느는 것은 **어느 축에 쓸지 고르는 것**뿐이다. */
  const rows = [
    /* ★ 유해(환생 배수)는 **한 구라도 있을 때만** 뜬다 — 0 이면 갓 시작한 사람에게 뜻 없는
       줄이다. 예전엔 「환생을 했을 때만」이었는데, ⑦ 일지가 환생 전에도 유해를 줄 수 있어
       판단을 relics>0 으로 옮겼다(유해는 환생이든 일지든 「되풀이한 자국」이라 그림이 안 어긋난다). */
    ...((META.relics | 0) ? [["유해", `${META.relics}구 · ${mul(relicMul())}`]] : []),
    /* 구슬과 **같은 자**로 적는다 — 구슬은 2.3k 인데 여기만 2280 이면 같은 값이 달라 보인다. */
    ["체력",      num(hpMaxOf()), "hp"],
    ["마나",      num(mpMaxOf()), "mp"],
    ["군세",      armyCap(), "army"],            // 군세는 상한이 두 자리라 줄일 것이 없다
    /* ★ 피해 배수 안에서 **깊이 몫을 갈라 적는다.** 20층이면 ×3.2 가 이 안에 들어
       있는데, 뭉쳐 놓으면 「장비를 갈아 낀 덕」과 구별이 안 된다 — 제일 크게
       불어나는 것이 어디서 왔는지 보여야 한다. */
    /* 띠와 **같은 자**(`mul()`)로 줄인다 — 50층에서 본인 피해가 ×1234.56 이면
       여기도 자리를 넘긴다. 한 군데만 고치면 띠는 ×19.5 인데 창은 ×19.50 이 된다. */
    /* ★ 「깊이 ×1.00」은 마을·1층에서 **늘** 뜨는데 아무 말도 안 한다(depthMul 은
       floor 로만 정해진다). 유해와 같은 규칙으로 **값이 붙었을 때만** 적는다 —
       아무 뜻 없는 줄이 늘 서 있으면 그 옆의 진짜 값까지 안 읽힌다. */
    ...(mul(depthMul()) !== mul(1) ? [["깊이", mul(depthMul())]] : []),
    ["본인 피해",   mul(selfDmgMul())],
    ["소환수 피해", mul(minionDmgMul()), "dmg"],
    ["마나 회복",   `${mpRegenOf().toFixed(1)}/초`],
    /* 금 획득도 같다 — 반지(GEAR.ring)나 `gold` 옵션이 붙기 전에는 언제나 +0% 다. */
    ...((() => { const p = Math.round((goldMulOf() - 1) * 100);
      return p ? [["금 획득", `+${p}%`]] : []; })()),
  ];
  /* 강화 없는 줄에도 **같은 폭의 빈 칸**을 둔다 — 안 그러면 단추가 붙은 줄만 값이
     왼쪽으로 밀려 일곱 줄의 숫자가 층계처럼 어긋난다(읽는 자리인데 눈이 흔들린다). */
  /* ★ 단추에 적히는 것은 **값이 아니라 값어치**다 — 「금」을 붙인다.
     여태 「▲ 14」였는데, 그 자리가 값(`<b>56</b>`) 바로 오른쪽이라 **「체력 56, 14 오른다」**
     로 읽힌다(▲ 는 이 게임에서 「오른다」의 표다 — `.tipStat.up`). 정작 14 는 **금값**이고,
     오르는 몫은 25% 다. 게임의 다른 값어치는 **어디서나 「N 금」**으로 적는다
     (좌판 · 대장간 · 「다음 재련 20 금」 — `.tipBuy .cost`). 여기만 낱말을 빼고 ▲ 를 달았다
     ([[carry-fixes-forward]]). 값은 한 톨도 안 바뀐다 — **낱말 하나가 붙을 뿐이다.**
     ★ ▲ 는 남긴다 — 「누르면 오른다」는 것까지 지우면 단추가 값표로 보인다.
     ★ 폭은 58 → 68px(hud.css) — 「999k 금」이 상자를 안 넘게. 옛 결은 `__UPCOSTOLD`. */
  const 옛값 = !!globalThis.__UPCOSTOLD;
  document.body.classList.toggle("upcostOld", 옛값);
  /* ★ **중립인 배수는 가라앉힌다**(V-111). 처음 켠 사람의 「본인 피해 ×1.00 · 소환수
     피해 ×1.00」은 마을에서 depthMul=1 · 강화 0 · 레벨 1 · 옵션 없음이라 **한 번도 뜻을
     가진 적이 없는 수**인데, 빛깔이 「체력 56」과 똑같아 그 옆의 진짜 값까지 안 읽힌다.
     이 창은 유해·깊이·금 획득 셋을 이미 「값이 붙었을 때만」으로 걸러 두었다 — **피해
     두 줄에만 안 옮겨진 못이다**([[carry-fixes-forward]] · V-101 이 1층 머리글에서
     지운 바로 그 「×1.00」).
     ★ **지우지 않고 가라앉힌다** — 소환수 피해 줄에는 강화 단추가 달려 있어 줄을 없애면
       사는 길까지 사라지고, 「배수라는 것이 있다」는 것 자체를 모른다. V-106 이 배지 0 에
       쓴 `.off`(#8a7c60)를 그대로 옮긴다(V-104 lockNote · V-105 purse 와 같은 결).
     ★ 중립인지는 **`mul(1)` 과 견줘서** 안다 — 「×1.00」을 손으로 안 적는다(자릿수 규칙이
       바뀌면 같이 따라간다). 옛 결은 `__NEUTOLD`. */
  const 옛중립 = globalThis.__NEUTOLD === 1, 중립값 = mul(1);
  return `<div class="sStat">${rows.map(([n, v, up]) => {
    const c = up ? upCost(up) : 0, can = up && META.gold >= c;
    const 눕힘 = !옛중립 && v === 중립값 ? " class=\"off\"" : "";
    return `<div class="tipStat"><span class="sN">${n}</span><b${눕힘}>${v}</b>` +
      (up
        ? `<button class="upBtn${can ? "" : " no"}" data-up="${up}"${can ? "" : " disabled"}
             title="${UPS[up].n} 강화 — ${upText(up)} · ${c.toLocaleString()} 금">▲ ${num(c)}${옛값 ? "" : " 금"}</button>`
        : `<span class="upBtn none"></span>`) +
      `</div>`;
  }).join("")}</div>`;
};

/** 지금↔다음 견줌 — 가방 것을 고르면 **같은 슬롯의 낀 것 대비 차이**를 함께 보인다
 *  (오르면 초록 up · 내리면 붉게 down). 주 능력치 하나와 옵션들을 슬롯별로 모아 뺀다.
 *  뜻·단위는 core.js(GEAR·AFFIX)가 쥐므로 화면은 라벨만 읽는다(같은 식이 두 곳이면 갈라진다). */
const gearCmpHtml = (bag) => {
  const cur = equipped(bag.k), g = GEAR[bag.k];
  const sgn = (d) => d > 0 ? "+" : "−";
  const primDelta = (d) => gearDelta(bag.k, d);
  const sum = (arr, id) => (arr || []).filter((a) => a.id === id).reduce((s, a) => s + a.v, 0);
  const rows = [];
  /* ★★ **깊이 곱을 넣고 견준다**(V-121 · 2026-08-27). 여태는 «등급의 밑값»만 뺐는데,
     바로 위 두 줄(낀 것의 대표 수 · 가방 것의 대표 수)은 둘 다 `× ilMul(il)` 을 곱해
     적는다 — 그래서 **같은 창 안에서 세 줄이 서로 다른 말**을 했다(34층 투구가
     「+52」라고 적히지만 두 줄의 차이는 +114). 여섯 슬롯 **전부** 어긋나 있었고
     늘 «적게» 말했다. 이 줄 하나로 물건을 바꿀지 정하므로 손해가 그대로 결정에 간다
     ([[threshold-and-ruler-must-match]]).
     ★ 재련(META.plus)은 **슬롯에 남는다** — 물건을 바꿔도 안 따라가므로 차이에서 뺀다
       (대표 수 두 줄도 같은 까닭으로 안 세고 있다). 문은 `__NUMOLD`. */
  /* ★ 뺄셈을 **화면에 적힌 수**로 한다 — 두 대표 줄은 반올림해서 서고(gearShow) 차이만
     날값으로 세면 「924 − 319 인데 604」 같은 한 칸짜리 어긋남이 남는다. 눈으로 셈이
     맞아떨어져야 세 줄이 한 말을 한다. */
  const pv = (it) => {
    const v = g.val[it.tier] * (globalThis.__NUMOLD ? 1 : ilMul(it.il));
    return globalThis.__NUMOLD ? v
         : g.u === "pct" ? Math.round(v * 100) / 100 : g.u === "rate" ? +v.toFixed(1) : Math.round(v);
  };
  const dPrim = pv(bag) - (cur ? pv(cur) : 0);
  if (Math.abs(dPrim) > 1e-9) rows.push([g.d, dPrim, primDelta(dPrim)]);
  const ids = [...new Set([...(cur?.af || []).map((a) => a.id), ...bag.af.map((a) => a.id)])];
  for (const id of ids) {
    const d = sum(bag.af, id) - sum(cur?.af, id);
    if (Math.abs(d) < 1e-9) continue;
    const av = id === "mp" ? Math.abs(d).toFixed(1) : Math.abs(d);
    rows.push([AFFIX[id].n, d, `${sgn(d)}${av}${AFFIX[id].u}`]);
  }
  /* ★★ **여기서 뺀 수는 «물건에 적힌 수»였다 — 사람이 보는 수가 아니다**(V-133).
     「최대 체력 +120」의 120 은 `bodyHp` 안쪽 수이고, 화면의 체력은 거기서 천장을 지나
     나온다 — 실측 620 → 695 = **+75**. 그래서 뺄셈을 그만두고 **물건을 잠깐 끼워 보고**
     판이 쓰는 함수에서 앞뒤를 읽는다(core.gearStats). 트리(V-123)·강화(V-124·V-132)가
     이미 쓰는 그 결이다([[carry-fixes-forward]] · [[probe-must-walk-the-real-path]]).
     ★ 옵션 줄(`tipAf` · 「최대 체력 +120」)은 **그대로 둔다** — 그것은 «이 물건이 무엇인가»
       이고, 여기는 «끼면 내가 어떻게 되는가»다. 두 자리는 서로 다른 것을 말한다.
     ★ 문은 `__GEARFX_OLD`(gearStats 가 빈 줄을 내면 옛 뺄셈으로 떨어진다). */
  const fx = gearStats(bag);
  /* ★ 머리글도 바꾼다 — 새 줄은 «물건끼리의 차이»가 아니라 **내 몸이 어떻게 되는가**다.
     바로 위 옵션 줄(「최대 체력 +924」)과 수가 다르므로, 무엇을 재는 줄인지 말해야
     둘이 어긋난 것으로 안 읽힌다. */
  const head = `<div class="tipKind">${fx.length ? "끼면 이렇게 된다" : cur ? "지금 낀 것과 견줌" : "빈 슬롯 — 끼면 새로 걸린다"}</div>`;
  if (fx.length)
    return `<div class="tipCmp">${head}` + fx.map((r) =>
      `<div class="tipStat ${r.up ? "up" : "down"}"><span class="sN">${r.n}</span>` +
      `<b>${gearStatShow(r.k, r.now)} <span class="tFxA">→</span> ${gearStatShow(r.k, r.next)}</b></div>`).join("") +
      `</div>`;
  return `<div class="tipCmp">${head}` +
    (rows.length
      ? rows.map(([n, d, t]) => `<div class="tipStat ${d > 0 ? "up" : "down"}">${n} <b>${t}</b></div>`).join("")
      : `<div class="tipStat">셈은 그대로다</div>`) +
    `</div>`;
};

/** 고른 것의 옵션 — 상점 툴팁과 **같은 모양**(tipName 색=등급 · tipKind · tipStat · tipAf).
 *  가방 것이면 「지금 낀 것과의 차이」 + 「끼기」. 낀 것을 고르면 그대로 보여 준다.
 *  ★ ⑦ 떠 있는 툴팁이 이 **하나**를 쓴다 — 새 생성기를 또 만들지 않는다(같은 식이 두 곳이면
 *    갈라진다). `sel` 은 고른 칸(기본은 statSel), `pinned` 은 「끼기」 단추를 붙일지다:
 *    올려 보기(hover)는 pinned:false 로 「끼기」 없이, 눌러 붙박으면 pinned:true 로 단추를 단다. */
const statTipHtml = (sel = statSel, { pinned = true } = {}) => {
  if (!sel) return `<div class="tipKind">칸을 고르면 뜯어본다 · 가방 것은 「끼기」로 낀다</div>`;
  const it = sel.src === "bag" ? META.bag[sel.i] : equipped(sel.k);
  if (!it) return `<div class="tipKind">빈 칸</div>`;
  const g = GEAR[it.k];
  const fmt = (v) => gearShow(it.k, v);
  const pl = sel.src === "eq" ? (META.plus[it.k] | 0) : 0;
  return `<div class="tipName ${clsOf(it)}">${nameOf(it)}${pl ? ` <span class="plus">+${pl}</span>` : ""} <span class="rarTag">${rarWord(it)}</span></div>
    <div class="tipKind">${g.n} · 점수 ${Math.round(scoreOf(it))}${sel.src === "eq" ? " · 낀 것" : ""}</div>
    <div class="tipStat">${g.d} <b>${fmt(g.val[it.tier] * ilMul(it.il))}</b></div>` +
    /* 물건 레벨 — 「같은 등급인데 왜 더 좋지?」의 답이 이 한 줄이다(깊이가 곱한다). */
    (it.il > 0 ? `<div class="tipNote sm">${it.il}층에서 나온 것 · 깊이 <b>×${ilMul(it.il).toFixed(2)}</b></div>` : "") +
    ruleHtml(it) +
    it.af.map((a) => `<div class="tipAf">${afText(a)}</div>`).join("") +
    (sel.src === "bag" ? gearCmpHtml(it) : "") +
    (sel.src === "bag" && pinned
      ? `<div class="tipBuy"><button class="btn" data-bagwear="${sel.i}">끼기</button></div>`
      : "");
};

/** ⑦ 일지 — 능력치 창 **안**에 붙인다(새 창을 만들지 않는다 · 수치 아래 자리). 수치와 같은
 *  검은 판(.sStat)·같은 줄(.tipStat)을 재사용한다. 깬 것은 눌린 상태(.on)로, 아직인 것은
 *  진행도(3/5)를 보인다 — 보상 유해는 등급 금색(t3)으로. 화면은 이 목록만 읽고 판정은
 *  전부 core.js(questProg/questDone)가 한다(같은 식이 두 곳이면 갈라진다). */
const questListHtml = () =>
  `<div class="sStat jList"><div class="tipKind">일지 <span class="dim">— 다르게 놀 이유 · 보상은 유해로</span></div>` +
  QUESTS.map((q) => {
    const done = questDone(q), prog = questProg(q);
    return `<div class="jRow${done ? " on" : ""}">
      <div class="jL"><b class="jN">${q.n}</b><span class="jD">${q.d}</span></div>
      <div class="jR"><span class="jP">${done ? "달성" : `${prog}/${q.goal}`}</span>
        <span class="jRew t3">유해 +${q.reward}</span></div></div>`;
  }).join("") + `</div>`;

/** 「아래에 더 있다」 — 구르는 칸(.wScroll)이 **멈춰 있을 때** 아무 말도 안 하는 것을 고친다
 *  (병수님 「일지가 창 아래로 잘리는데 더 있다는 표시가 없다」). 여기서는 **남았는가**만
 *  판정하고 그늘·▾ 는 CSS(.wScroll.more::after)가 그린다 — 같은 판단이 두 곳에 있으면 갈라진다.
 *  ★ 창이 닫혀 있으면 clientHeight 가 0 이라 판정이 못 선다. 그래서 **열 때도** 부른다. */
function markMore(el) {
  if (!el) return;
  /* ★ 「읽을 수 있는 바닥」은 네모의 바닥이 아니다(V-83 · 2026-08-26). 상인·대장간의
     설명칸은 값·단추(.tipBuy)가 `position:sticky` 로 못박혀 그 아래 글을 **덮는다** —
     1366×700 에서 「다음 · 왕의 홀」이 반 잘리고 그 상승치는 통째로 가려져 있었다.
     띠를 발치 «위»로 올릴 만큼을 여기서 재서 넘긴다(CSS 에 또 적으면 둘이 갈린다). */
  const cs = getComputedStyle(el);
  const foot = el.lastElementChild;
  let bot = 0;
  if (foot && getComputedStyle(foot).position === "sticky") {
    const r = el.getBoundingClientRect();
    bot = Math.max(0, Math.round(r.top + el.clientTop + el.clientHeight - foot.getBoundingClientRect().top));
  }
  /* ★ **아래 여백만큼 더 내린다.** 못박힌(sticky) 상자는 제 «내용칸» 밖으로 못 나가서,
     `bottom:0` 이면 아래 여백(.tip 은 11px)이 **안 덮인 채로 남는다** — 켜서 보니 띠가
     한가운데 서고 마지막 줄이 그 «밑»으로 삐져나왔다(2026-08-26 · tmp/v83_crop_doctrine.png).
     여백은 창마다 다르므로 여기서 읽는다 — 여백 없는 칸(일지·가방·「어디부터」)은 0 이라
     예전 그대로다. */
  bot -= parseFloat(cs.paddingBottom) || 0;
  el.style.setProperty("--moreBot", bot + "px");
  el.classList.toggle("more", el.scrollHeight - el.scrollTop - el.clientHeight > 2);
}
/* 굴림은 **이름이 아니라 결로** 듣는다(V-80 · 2026-08-26). 예전엔 `["statBody","bagBody"]`
   두 이름에 낱개로 매달았더니, 뒤에 생긴 구르는 칸(건너뛰기 창의 `.wayList`)이 그 목록에
   안 들어 「아래에 더 있다」가 **한 번도 안 켜졌다** — 63%(772→286px)가 말없이 잘렸다
   ([[carry-fixes-forward]]). 문서 하나에서 캡처로 받아 **`.wScroll` 이면 무엇이든** 잰다:
   새 칸에 클래스만 붙이면 따라온다(굴림 이벤트는 거품이 안 올라와 캡처라야 한다). */
addEventListener("scroll", (e) => {
  const el = e.target;
  if (el instanceof Element && el.classList.contains("wScroll")) markMore(el);
}, true);
const markAllMore = () => { for (const el of document.querySelectorAll(".wScroll")) markMore(el); };
/* **글이 바뀌면 다시 잰다**(V-83 · 2026-08-26). 여태는 창을 «열 때»와 창 크기가 바뀔 때만
   쟀는데, 상인·대장간·편성·운용의 설명칸은 **열린 뒤에 칸을 누를 때마다** 다시 그려진다 —
   그 글이 길어져 넘쳐도 띠가 안 켜졌다. 어느 함수 끝에 한 줄씩 붙이면 새로 생기는
   그리기마다 또 빠뜨리므로([[carry-fixes-forward]]), **바뀐 것을 보고** 그 칸을 되짚는다.
   ★ 한 프레임에 한 번만 판정한다 — 일지는 싸움 내내 줄이 붙는 칸이라, 붙을 때마다
     scrollHeight 를 읽으면 그 자리에서 배치를 다시 계산하게 만든다(렉). */
let moreDue = null;
new MutationObserver((muts) => {
  const hit = moreDue || (moreDue = new Set());
  for (const m of muts) {
    const n = m.target instanceof Element ? m.target : m.target.parentElement;
    const box = n && n.closest(".wScroll");
    if (box) hit.add(box);
  }
  if (hit.size && !moreDue.__q) {
    moreDue.__q = true;
    requestAnimationFrame(() => { const s = moreDue; moreDue = null; for (const el of s) markMore(el); });
  }
}).observe(document.body, { childList: true, subtree: true, characterData: true });
addEventListener("resize", () => { fitDoll(); markAllMore(); if (ftipPin) ftipReflow(); });

/** 페이퍼 돌을 **창 높이에 맞춘다** — 칸을 46px 로 못박아 두었더니 여섯 줄이 316px 가 되어
 *  아래 두 줄(신발·반지)이 창 밖으로 나갔다(08-17, 넘침 94px @1512×863).
 *  ★ 「아래에 더 있다」 표시로 덮을 일이 아니다 — **인물 하나가 다 보여야** 페이퍼 돌이다.
 *  자리(여섯 줄)는 그대로 두고 **칸 크기만** 남는 높이에서 되짚는다. 창이 커지면 46px 로
 *  돌아온다 — 한 번 줄고 마는 값이 아니라 늘 다시 잰다(그래서 46 부터 내려온다).
 *  ★ 남는 높이를 **셈으로 맞히지 않는다** — 「여섯 줄 + 제목」으로 어림잡았더니 6px 이
 *    남아 그대로 잘렸다(제목 여백·판 사이가 셈에 안 들어온다). 한 칸 줄일 때마다
 *    **실제로 넘치는지 다시 읽는다**(scrollHeight). 보통 첫 판에 끝난다. */
/* ══ 인물을 «몸» 기준으로 축에 세운다 ══ (V-71 · 2026-08-26)
   `doll_necro.png` 는 오른쪽으로 가는 **꼬리**(지팡이)를 달고 있다 — 34칸 중 여덟 칸이
   두께 2~7px 뿐인 그 꼬리다. 그림 상자를 칸 한가운데 놓으면 **꼬리까지 한가운데**가 되어
   몸은 왼쪽으로 밀린다(실측 −13.9px · 슬롯 축은 좌우 기둥과 0.0px 로 맞는데 몸만 어긋났다).
   ★ 미루는 양을 **못박지 않는다** — 그림에서 직접 잰다. 에셋을 다시 구우면 값도 따라온다
     ([[knob-that-does-nothing]] — 손잡이가 도는데 미는 데가 없는 일을 막는다).
   ★ `window.__NOPDMID=1` 이면 옛 꼴로 되돌린다(자가 「전」을 같은 판에서 세울 때 쓴다). */
let pdMidPct = null;                                   /* 그림 하나뿐이라 한 번만 잰다 */
function dollArtMid(im) {
  if (pdMidPct !== null) return pdMidPct;
  const w = im.naturalWidth, h = im.naturalHeight;
  if (!w || !h) return null;                           /* 아직 안 왔다 — 오면 다시 부른다 */
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0);
  let d; try { d = g.getImageData(0, 0, w, h).data; } catch (e) { return null; }  /* file:// 이면 못 읽는다 */
  const col = new Array(w).fill(0);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (d[((y * w + x) << 2) + 3] > 40) col[x]++;
  const mx = Math.max.apply(null, col); if (!mx) return null;
  let a = -1, b = -1;                                  /* 「제일 두꺼운 줄의 40% 이상」만 몸으로 본다 */
  for (let x = 0; x < w; x++) if (col[x] >= mx * 0.4) { if (a < 0) a = x; b = x; }
  if (a < 0) return null;
  return (pdMidPct = ((w / 2) - (a + b + 1) / 2) / w * 100);   /* 분모는 그림 폭 — translateX(%) 가 쓰는 그것 */
}
function centerDollArt() {
  for (const im of document.querySelectorAll(".pdChar img")) {
    if (window.__NOPDMID) { im.style.removeProperty("--pdMid"); continue; }
    const set = () => { const p = dollArtMid(im); if (p !== null) im.style.setProperty("--pdMid", p.toFixed(2) + "%"); };
    if (im.complete && im.naturalWidth) set(); else im.addEventListener("load", set, { once: true });
  }
}

function fitDoll() { centerDollArt(); fitDollBag(); fitDollStat(); fitBagGrid(); }

/** ══ V-59 (2026-08-25) ══ **가방 격자의 높이를 «폭 하나»가 정하고 있었다.**
 *  `.sSec.bag .grid` 는 `width:100%` + `aspect-ratio:10/4` 라 칸 크기가 **패널 폭**만
 *  따라간다. 도킹 패널은 폭이 반쯤 고정인데 **높이는 창을 따라 줄어든다** — 그 높이가
 *  셈에 한 번도 안 들어왔다. 1280×620 에서 격자가 상자보다 35px 길고, 그 위에 밑자락
 *  그늘 34px 이 덮여 **아랫줄이 절반만** 남았다(V-57b 훑개가 `bag` 3/6 으로 찍은 그것).
 *  자리(10×4)는 그대로 두고 **폭 상한**만 남는 높이에서 되짚는다 — 칸이 정사각이므로
 *  높이 h 를 꼭 채우는 폭은 h×(10/4) 다. 창이 커지면 상한이 풀려 예전 크기로 돌아온다
 *  (`fitDoll`·`fitTree` 와 같은 결 — 값을 못박지 않고 늘 다시 잰다).
 *  ★ 콩알로 만들지는 않는다 — 칸 34px 이 바닥이다(`bagfit_qa` 가 「읽을 만한 크기」로
 *    쓰는 바로 그 문턱 · 여기 34 를 따로 적으면 둘이 갈린다는 뜻에서 이름을 나눠 둔다).
 *    바닥에서도 안 들어가면 **굴려 보는 자리로 남긴다** — 잘라 없애는 것보다 낫다. */
const BAG_CELL_FLOOR = 34;
function fitBagGrid() {
  const body = $("bagBody"), grid = body && body.querySelector(".sSec.bag .grid");
  if (!grid || !body.clientHeight || !grid.getClientRects().length) return;
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  const fadeH = parseFloat(getComputedStyle(body, "::after").height) || 0;
  /* 바닥은 **폭으로** 잰다 — 칸 하나가 34px 이 되는 격자 폭이다. 높이로 잡았더니
     칸이 34×32.7 로 나왔다(가로 틈이 아홉, 세로가 셋이라 같은 폭이 안 된다). */
  const floorW = BAG_CELL_FLOOR * BAG_COLS + gap * (BAG_COLS - 1);
  grid.style.maxWidth = "";                          /* 늘 «다 편 채»로 되짚는다 */
  /* ★ 그늘은 **넘칠 때만** 켜진다(`.wScroll.more::after`) — 넘침이 그늘을 부르고 그늘이
     다시 넘침을 키운다. 그래서 먼저 **그늘 없이** 좁혀 보고, 그래도 넘치면 그때 그늘
     몫을 뺀다. 두 판이면 멎는다(좁히면 넘침은 늘지 않는다). */
  for (let pass = 0; pass < 2; pass++) {
    const over = body.scrollHeight > body.clientHeight + 1;
    const br = body.getBoundingClientRect(), gr = grid.getBoundingClientRect();
    /* 굴린 만큼 되돌린다 — 안 그러면 굴려 내려갈수록 격자가 자꾸 좁아진다 */
    const top = gr.top - br.top + body.scrollTop;
    const avail = body.clientHeight - (over ? fadeH : 0) - top;
    if (gr.height <= avail + 0.5) break;             /* 다 들어간다 */
    const w = Math.round(Math.max(avail * (BAG_COLS / BAG_ROWS), floorW));
    if (w >= gr.width - 0.5) break;                  /* 바닥이다 — 더 줄이면 안 읽힌다 */
    grid.style.maxWidth = w + "px";
  }
}
/* 검수용 — 자가 **같은 셈**으로 전/후를 잰다(`tools/v59_bagfoot.mjs`). 상한을 지우면
   「전」이고, 이것을 부르면 「후」다. 자가 제 손으로 되돌릴 수 있어야 한 판에 견준다. */
window.__fitBagGrid = fitBagGrid;


/** 가방창 안에 선 인물(도킹 안 한 좁은 창) — 넘침이 **가방 쪽**이면 안 깎는다. */
function fitDollBag() {
  const body = $("bagBody"), doll = body && body.querySelector(".pdoll");
  if (!doll || !body.clientHeight || !doll.offsetHeight) return;  // 닫혔거나 CSS 가 감췄으면 잴 것이 없다
  const eq = doll.parentElement, bag = eq.nextElementSibling;
  for (let s = 46; ; s--) {
    doll.style.setProperty("--pdS", s + "px");
    doll.style.setProperty("--pdG", (s >= 44 ? 8 : 6) + "px");
    if (s <= 30) break;                                     // 여기보다 작으면 칸이 안 읽힌다
    if (body.scrollHeight <= body.clientHeight) break;      // 다 들어갔다
    /* 넘치는 것이 **가방 쪽**이면 돌을 줄여도 소용없다 — 애먼 것을 깎지 않는다. */
    if (bag && eq.offsetHeight <= bag.offsetHeight) break;
  }
}

/** ══ 도킹한 「능력치」 패널의 인물 ══ (V-24 · 2026-08-24)
 *  ★ **자가 애먼 것을 재고 있었다.** `fitDoll` 은 `#bagBody` 의 인물만 되짚었는데,
 *    도킹(`body.charOpen`)하면 인물은 `#statBody` 로 오고 가방 쪽 것은 CSS 가 감춘다
 *    (`#winBag .sSec.eq{display:none}`). 그래서 **보이는 인물에는 --pdS 가 한 번도 안
 *    붙었고**, CSS 기본값 46px 으로 서서 틀(476px)의 78%를 먹었다 — 능력치 일곱 줄 중
 *    두 줄만 남았다([[knob-that-does-nothing]] · 손잡이는 있는데 딴 데를 돌리고 있었다).
 *  ★ 끝 조건이 가방 쪽과 **다르다**: 여기서 다 들어가야 하는 것은 창 전체가 아니라
 *    **수치판**이다. 그 아래 ⑦ 일지는 431px 라 무엇을 깎아도 안 들어가고, 원래
 *    굴려 보는 목록이다. 창 이름이 「능력치」이므로 **능력치가 먼저 보여야** 한다. */
/** ══ V-56 (2026-08-25) ══ **바닥에 닿으면 «그대로 포기»하고 있었다.**
 *  30px 바닥에서 인물은 246px 이다. 낮은 창에서는 상자가 233~313px 뿐이라 수치판
 *  176px 이 들어갈 자리가 없는데, 자는 바닥에서 `break` 하고 **잘린 채로 두었다** —
 *  1280×620 에서 여섯 줄이 **전부** 숨고 「능력치」 창에 능력치가 한 줄도 없었다
 *  ([[floor-far-from-threshold]] · 바닥이 문턱에서 멀면 그 수는 눈금이 아니라 상수다).
 *  고친 것 둘:
 *    ① 바닥을 30 → **22** 로 내린다. 스킬트리(V-55)가 쓰는 것과 같은 바닥이다 —
 *       칸 22px 이면 그림이 19px 이라 아직 읽힌다. 이것만으로 세 크기가 산다.
 *    ② **22 로도 안 들어가면 수치가 인물 «위»로 올라선다.** 창 이름이 「능력치」이므로
 *       능력치가 먼저다 — 인물은 바로 아래에서 굴려 보면 된다.
 *       ★ 처음엔 인물을 **가방 창으로 돌려보냈는데**(`body.dollFold`), `bagfit_qa` 가
 *         바로 울었다 — 1280×800 에서 가방 칸이 20px 로 찌그러졌다(문턱 34px).
 *         한쪽을 밀면 반대쪽이 따라 온다([[equilibrium-pushes-back]]). 자리를 옮기지
 *         말고 **차례만 바꾸면** 아무 데도 안 밀린다. 장비를 만질 곳도 그대로 있다. */
/** ══ V-73 (2026-08-26) ══ **가로가 남는데 세로로만 쌓고 있었다.**
 *  반쪽 도킹한 상자는 폭 548~664px 인데 인물 덩어리는 250px 에 못박혀 있어
 *  (`hud.css` `max-width:250px`) **55~62%가 빈 채**로 남았다. 그런데 그 밑의 수치판이
 *  세로를 먹으니 아래 되짚기가 칸을 46 → 26~38px 까지 깎는다 — 남는 쪽을 안 쓰고
 *  모자란 쪽을 깎고 있었다. 그래서 **넓으면 먼저 «옆»에 세워 본다.**
 *  ★ 차례가 뜻이다: ① 옆에 세우기(칸이 크게 남는다) ② 위아래로 깎기 ③ 수치 먼저(V-56).
 *    ①이 안 되는 것은 **폭이 모자랄 때**뿐이고, 그 판정은 CSS 의 gap 과 인물의 실제
 *    폭을 읽어서 한다 — 250·14 를 여기 또 적으면 둘이 갈린다([[seam-not-values]]).
 *  ★ 옆에 세우면 **인물이 수치를 밀어내지 못한다** — 아래로 넘치는 것이 수치가 아니라
 *    인물일 수 있으니 `fits()` 가 둘 다 물어야 한다. 하나만 물으면 「넘침 0」이라 하고
 *    인물 다리가 잘린 채 통과한다([[silent-zero-is-not-an-observation]]). */
const PDS_FLOOR = 22;
const SBS_NUMS_MIN = 240;   /* 수치판이 「유해 12구 · ×1.96」을 한 줄에 담는 최소 폭 */
const SBS_FLOOR = 30;       /* 옆에 세워도 칸이 이보다 작아지면 값어치가 없다 — 위아래로 되돌린다 */
function fitDollStat() {
  const body = $("statBody"), doll = body && body.querySelector(".pdoll");
  if (!body || !body.clientHeight) return;
  /* 창이 다시 커졌는데 접힌 채로 남으면 안 된다 — 매번 **펴고** 시작한다 */
  body.classList.remove("numsFirst");
  body.classList.remove("sideBySide"); body.classList.remove("jSide");
  if (!doll) return;
  const nums = body.querySelector(".sStat:not(.jList)");
  /* ★ **「아래에 더 있다」 그늘까지 자리를 비워 둔다.** 처음 고쳤을 때 자는 「넘침 0」
     이라 했는데 켜서 보니 마지막 줄이 그대로 안 읽혔다 — `.wScroll::after` 가 밑자락
     34px 를 검게 덮고 있었고, 그 아래(일지)가 늘 있으니 그늘도 늘 켜져 있다.
     네모만 재면 통과, 사람 눈에는 잘림 — 문턱과 자가 어긋난 자리다
     ([[threshold-and-ruler-must-match]] · [[silent-zero-is-not-an-observation]]).
     높이는 **CSS 에서 읽는다** — 여기 34 를 또 적으면 둘이 갈린다. */
  const moreH = () => parseFloat(getComputedStyle(body, "::after").height) || 34;
  const lim = () => body.getBoundingClientRect().bottom - moreH() + 0.5;
  const fits = () => {
    const ok = nums ? nums.getBoundingClientRect().bottom <= lim()
                    : body.scrollHeight <= body.clientHeight;
    /* 옆에 세운 동안에는 인물이 제 줄에서 따로 넘칠 수 있다 — 둘 다 물어야 한다 */
    return ok && (!body.classList.contains("sideBySide")
                  || doll.getBoundingClientRect().bottom <= lim());
  };
  /* ★ 줄 사이도 **칸에 매단다**(V-52 의 `--cs` 결). 바닥 근처에서 6px 를 고집하면
     1366×768 에서 **3px 가 모자라** 인물을 통째로 잃는다 — 접기 전에 접을 수 있는
     것을 먼저 접는다([[seam-not-values.md]] · 이음매를 값 하나로 때우지 않는다). */
  const setS = (s) => { doll.style.setProperty("--pdS", s + "px");
                        doll.style.setProperty("--pdG", (s >= 44 ? 8 : s >= 30 ? 6 : 5) + "px"); };
  /* ── ① 옆에 세워 본다(V-73). `__NOSBS` 면 옛 꼴 — 자가 같은 판에서 전/후를 견준다. ── */
  if (nums && !window.__NOSBS) {
    body.classList.add("sideBySide");
    /* V-74 — 일지는 수치 아래 «빈틈»으로 간다(인물이 두 줄을 걸친다). 자리만 옮기는
       일이라 `fits()` 가 묻는 두 가지(수치·인물 밑자락)는 한 톨도 안 움직인다. */
    if (!window.__NOJSIDE) body.classList.add("jSide");
    setS(46);
    const gap = parseFloat(getComputedStyle(body).columnGap) || 0;
    const wide = body.clientWidth >= doll.getBoundingClientRect().width + gap + SBS_NUMS_MIN;
    if (wide) for (let s = 46; s >= SBS_FLOOR; s--) { setS(s); if (fits()) return; }
    body.classList.remove("sideBySide"); body.classList.remove("jSide");
  }
  /* ── ② 위아래로 쌓고 칸을 깎는다(V-24) ── */
  for (let s = 46; s >= PDS_FLOOR; s--) { setS(s); if (fits()) return; }
  /* ══ V-58 (2026-08-25) ══ **접고 나서도 «쥐어짠 채»로 두고 있었다.**
     위 되짚기가 바닥까지 갔다는 것은 **깎아서는 안 들어간다**는 뜻이다. 그런데 그때
     인물에는 마지막으로 시험한 22px 이 그대로 남고, `numsFirst` 가 인물을 **접힌 자리
     아래**로 내린다 — 굴려서 보는 자리인데 22px 로 찌그러진 채다. 1280×620 에서
     켜서 보니 인물이 «26px 짜리 스티커 둘»로 보였다(제 몫 583px 중 44px 만 얼굴을 내민다).
     깎는 까닭은 **수치를 살리려는 것**이었는데, 수치는 이미 위로 올라와 살았다 —
     그러니 깎을 까닭도 같이 사라진다. 접었으면 **도로 편다.**
     ([[knob-that-does-nothing]] · 손잡이를 돌린 값이 쓰이지 않는 자리에 남아 있었다) */
  body.classList.add("numsFirst");                          // 바닥에서도 안 들어간다 — 수치가 먼저 선다
  setS(46);                                                 // 굴려서 보는 자리다 — 쥐어짤 까닭이 없다
}

/** 능력치 — **수치만.** 물건은 가방 창이 맡는다(병수님 2026-08-13 "능력치랑 인벤토리가
 *  합쳐져있는데 추후을 위해 분리필요"). 그 아래에 ⑦ 일지가 붙는다. */
function drawStat() {
  /* ★ **도킹하면 인물이 이쪽으로 온다**(병수님 2026-08-17 「여전히 이상해」).
     D2 의 왼쪽 패널은 **인물 + 수치**고, 오른쪽이 인벤토리다. 처음 도킹했을 때
     가방창의 「낀 것」만 감췄더니 **인물이 통째로 사라졌다** — 페이퍼 돌은 거기에만
     있었기 때문이다(찍어 보고 알았다). 감추기 전에 **어디로 가는지**를 먼저 정해야 한다. */
  const docked = document.body.classList.contains("charOpen");
  $("statBody").innerHTML = (docked ? dollHtml() : "") + statNumbers() + questListHtml();
  $("statGold").textContent = (META.gold | 0).toLocaleString();
  /* ★ 다시 그리면 인라인 --pdS 가 같이 날아간다 — 여기서 되짚어야 레벨업·강화 뒤에도
     인물이 46px 으로 되돌아가지 않는다(V-24). */
  fitDollStat();
  markMore($("statBody"));
  ftipReflow();                  /* 도킹하면 인물이 이 창에 산다 — 붙박인 상자를 새 칸에 다시 붙인다(⑦) */
}

/** 가방 — 낀 것 셋 + 가방 열둘 + 고른 것의 설명. 물건을 만지는 곳은 여기 하나다. */
/** ══ 페이퍼 돌 ══ **인물 하나에 열 칸.** 여기 하나에서만 만든다 —
 *  D2 처럼 도킹하면 이것이 **왼쪽(능력치) 패널**로 가고, 좁은 창에서는 예전처럼
 *  가방창 안에 선다. 같은 것을 두 곳에서 만들면 한쪽만 고치게 된다. */
function dollHtml() {
  const gearSlot = (k) => {
    const it = equipped(k);
    return it
      ? gearCell(it, `data-spick="${k}"`, statSel && statSel.src === "eq" && statSel.k === k, META.plus[k] | 0)
      : `<div class="cell empty"><i class="gear-${k}"></i></div>`;
  };
  return `<div class="pdoll">
          <div class="pdChar"><img src="assets/ui/doll_necro.png" alt="네크로맨서"></div>
          <div class="pdSlot pd-helm">${gearSlot("helm")}</div>
          <div class="pdSlot pd-charm">${gearSlot("charm")}</div>
          <div class="pdSlot pd-wand">${gearSlot("wand")}</div>
          <div class="pdSlot pd-robe">${gearSlot("robe")}</div>
          <div class="pdSlot pd-glove">${gearSlot("glove")}</div>
          <div class="pdSlot pd-ring">${gearSlot("ring")}</div>
          <div class="pdSlot pd-shield">${gearSlot("shield")}</div>
          <div class="pdSlot pd-belt">${gearSlot("belt")}</div>
          <div class="pdSlot pd-boots">${gearSlot("boots")}</div>
          <div class="pdSlot pd-ring2">${gearSlot("ring2")}</div>
        </div>`;
}

function drawBag() {
  /* 가방 — 10×4 격자. 자리는 bagPack 하나가 잡는다(화면·검수가 같은 셈). 물건 칸은 그
     자리로 명시 배치하고(grid-area), 남는 자리마다 빈 칸(.cell.empty)을 하나씩 놓는다. */
  const { placed, used } = bagPack(META.bag);
  const occ = new Uint8Array(BAG_COLS * BAG_ROWS);
  const itemCells = placed.map((p) => {
    for (let y = p.r; y < p.r + p.h; y++) for (let x = p.c; x < p.c + p.w; x++) occ[y * BAG_COLS + x] = 1;
    const area = `grid-area:${p.r + 1}/${p.c + 1}/span ${p.h}/span ${p.w}`;
    return gearCell(p.it, `data-bpick="${p.i}" style="${area}"`,
      statSel && statSel.src === "bag" && statSel.i === p.i);
  }).join("");
  let emptyCells = "";
  for (let r = 0; r < BAG_ROWS; r++) for (let c = 0; c < BAG_COLS; c++)
    if (!occ[r * BAG_COLS + c]) emptyCells += `<div class="cell empty" style="grid-area:${r + 1}/${c + 1}"></div>`;

  $("bagBody").innerHTML =
    `<div class="sCols">
      <div class="sSec eq"><h3>낀 것</h3>
        ${/* ★ **여기서 다시 짜지 않는다** — 인물은 dollHtml() 하나에서만 만든다.
             베껴 둔 한 벌이 여기 있어서, 슬롯 모양을 고쳐도 가방창 쪽은 안 바뀔 뻔했다
             (2026-08-18 · 바로 위 dollHtml 의 주석이 경고하던 그 일이 이미 일어나 있었다). */
          dollHtml()}</div>
      <div class="sSec bag"><h3>가방 ${used}/${BAG_MAX}</h3>
        <div class="sFuse">같은 슬롯·같은 등급 셋이 모이면 저절로 한 단계 위로 합쳐진다</div>
        <div class="grid">${itemCells}${emptyCells}</div></div>
    </div>`;
  $("bagGold").textContent = (META.gold | 0).toLocaleString();
  fitDoll();                     /* ★ 넘침을 재기 **전에** 맞춘다 — 순서가 바뀌면 한 판 늦는다 */
  markMore($("bagBody"));
  ftipReflow();                  /* 다시 그리면 칸이 새로 생긴다 — 붙박인 상자를 그 새 칸에 다시 붙인다(⑦) */
}

/* ══════════════════════════════════════════════════════════════
   ⑦ 떠 있는 툴팁 — D2 처럼 칸 «옆»에 검은 상자가 뜬다(붙박이 한 칸이 아니라).
   ────────────────────────────────────────────────────────────
   · 내용은 statTipHtml() **하나**가 만든다(같은 식이 두 곳이면 갈라진다).
   · 자리잡기는 ftipPlace() **하나**가 한다 — 순수함수라 화면과 검수기가 같은 셈을 읽는다
     (window.__ftipPlace 로 열어 둔다).
   · 대상 칸: 가방 격자([data-bpick])와 페이퍼 돌([data-spick]) 둘 다. 도킹(charOpen)에서
     인물이 능력치 창으로 가도 보이는 것만 잡는다(display:none 이면 offsetParent 가 null).
   ══════════════════════════════════════════════════════════════ */
const FTIP_GAP = 8, FTIP_PAD = 8;   // 칸에서 띄우는 틈 · 화면 가장자리 여백
/* 칸·상자·화면 크기만 받아 자리를 낸다 — 오른쪽에 8px 띄우되 안 들어가면 왼쪽으로 뒤집고,
   넘치면 밀어 언제나 화면 안(여백 8px)에 둔다. 순수함수라 검수기가 같은 셈을 부른다. */
function ftipPlace(cell, tip, vw, vh) {
  let flip = false;
  let left = cell.right + FTIP_GAP;                               // 칸 오른쪽에 8px 띄운다
  if (left + tip.w > vw - FTIP_PAD) { left = cell.left - FTIP_GAP - tip.w; flip = true; }  // 안 들어가면 왼쪽으로
  left = Math.max(FTIP_PAD, Math.min(left, vw - FTIP_PAD - tip.w));  // 그래도 넘치면 화면 안으로 당긴다
  let top = Math.max(FTIP_PAD, Math.min(cell.top, vh - FTIP_PAD - tip.h));  // 세로는 칸 위에 맞추되 위·아래로 안 나가게
  return { left, top, flip };
}
window.__ftipPlace = ftipPlace;    // 검수용(tools/tip_probe.mjs) — 화면과 같은 자리 셈을 CDP 에서 잰다

const ftipSel = (cell) => cell.hasAttribute("data-bpick")
  ? { src: "bag", i: +cell.getAttribute("data-bpick") }
  : { src: "eq",  k: cell.getAttribute("data-spick") };

/* 붙박인 칸을 지금 화면에서 찾는다 — 다시 그리면 칸이 새로 생기고, 도킹하면 인물이 옮겨
   간다. 보이는 창에서 보이는 칸만(offsetParent 가 null 이면 숨은 것). */
function ftipCellFor(sel) {
  if (!sel) return null;
  const q = sel.src === "bag" ? `[data-bpick="${sel.i}"]` : `[data-spick="${sel.k}"]`;
  for (const w of document.querySelectorAll(".win.on")) {
    const el = w.querySelector(q);
    if (el && el.offsetParent !== null) return el;
  }
  return null;
}
/* 상자를 칸 옆에 붙인다 — 켠 뒤에 잰다(꺼진 채로는 크기가 0 이라 자리를 못 낸다). */
function ftipAnchor(sel, cell, pinned) {
  const f = $("ftip");
  f.innerHTML = statTipHtml(sel, { pinned });
  f.classList.toggle("pin", pinned);
  f.classList.add("on");
  const c = cell.getBoundingClientRect(), t = f.getBoundingClientRect();
  const p = ftipPlace({ left: c.left, right: c.right, top: c.top, bottom: c.bottom },
                      { w: t.width, h: t.height }, innerWidth, innerHeight);
  f.style.left = p.left + "px"; f.style.top = p.top + "px";
}
function ftipHide()  { const f = $("ftip"); if (f) f.classList.remove("on", "pin"); ftipHover = null; }  // 감추기만(붙박이는 안 건드림)
function ftipClose() { ftipPin = null; ftipHide(); }                                                     // 붙박이까지 푼다
/* 붙박인 상자를 새 칸에 다시 붙인다 — 칸이 사라졌으면(끼워져 가방을 떠났거나 굴려 사라졌으면) 거둔다. */
function ftipReflow() {
  if (!ftipPin) return;
  const cell = ftipCellFor(ftipPin);
  if (cell) ftipAnchor(ftipPin, cell, true); else ftipClose();
}
/* 칸을 누르면 그 칸에 붙박는다 — .sel 표식도 같이 켜고(statSel), 열린 창을 다시 그리면
   그 안의 ftipReflow 가 상자를 새 칸에 붙인다. */
function ftipPinCell(cell) {
  ftipPin = ftipSel(cell); statSel = ftipPin;
  if ($("winStat").classList.contains("on")) drawStat();
  if ($("winBag").classList.contains("on")) drawBag();
  ftipReflow();
}

/* 올리면 뜨고 벗어나면 사라진다 — 마우스만(터치는 눌러 붙박는다). 붙박인 동안은 안 바뀐다.
   같은 칸 안에서의 이동엔 다시 그리지 않는다(ftipHover 로 막는다). */
document.addEventListener("mouseover", (e) => {
  if (ftipPin) return;
  const cell = e.target.closest && e.target.closest("[data-bpick],[data-spick]");
  if (!cell || cell.offsetParent === null || cell === ftipHover) return;
  ftipHover = cell;
  ftipAnchor(ftipSel(cell), cell, false);            // 보기만 — 「끼기」 없음(pointer-events:none)
});
document.addEventListener("mouseout", (e) => {
  if (ftipPin) return;
  const cell = e.target.closest && e.target.closest("[data-bpick],[data-spick]");
  if (!cell) return;
  if (e.relatedTarget && cell.contains(e.relatedTarget)) return;   // 칸 안 이동은 안 지운다
  ftipHide();
});
/* 누르면 붙박는다(마우스·터치·검수기 .click() 모두 click 으로 온다). 칸도 상자도 아닌 곳을
   누르면 풀린다. 상자 안(「끼기」)은 위 click 핸들러가 처리하므로 여기선 건너뛴다. */
document.addEventListener("click", (e) => {
  if (e.target.closest && e.target.closest("#ftip")) return;
  const cell = e.target.closest && e.target.closest("[data-bpick],[data-spick]");
  if (cell && cell.offsetParent !== null) { ftipPinCell(cell); return; }
  if (ftipPin) ftipClose();
});
/* 굴림·창 크기 변경에 자리를 다시 잡는다 — 상자가 칸을 떠나 허공에 남으면 안 된다.
   굴림은 안쪽 칸(.wScroll)에서 나므로 캡처로 받는다. */
addEventListener("scroll", () => { if (ftipPin) ftipReflow(); else ftipHide(); }, true);

/* ══ 정산 ══ 판이 끝나면 「이번 판에 얻은 것」을 상점 좌판과 **같은 칸**(.cell·.grid)으로
   세운다 — 등급 색은 TIER_CLS 그대로. 판을 되살려 다시 재지 않고 die() 가 굳혀 둔 LASTRUN
   만 읽는다(S.loot 는 다음 던전 입장이 비운다). 칸마다 낀 것·가방행·금 중 무엇이었는지
   작은 표식으로 가른다(금으로 녹은 것은 흐리게 — 남지 않았다). */
function drawEnd() {
  const r = LASTRUN;
  /* 부제는 **두 줄로 짜 둔다**(병수님 2026-08-12 "어중간하게 꺾인다") — 한 줄로 흘리면
     남는 폭에 따라 「경험치 +0」의 **「+0」만** 다음 줄로 떨어졌다. 첫 줄은 「어디서
     끝났나」, 둘째 줄은 셈. 셈의 낱개는 저마다 한 칸(span)이라 줄이 모자라면 **낱개와
     낱개 사이에서만** 꺾인다. 가르는 「·」는 뺐다 — 꺾이는 자리에 홀로 남으면 그게 또
     어중간해서, 대신 칸 사이를 벌려 갈랐다. 자는 tools/run_end.mjs ⑧. */
  const u = (label, val, cls) =>
    `<span data-u>${label ? label + " " : ""}<b${cls ? ` class="${cls}"` : ""}>${val}</b></span>`;
  $("endSub").innerHTML =
    `<div class="eWhere" data-u>${r.floor}층에서 ${r.dead === false ? "발길을 돌림" : "쓰러짐"}</div><div class="eTally">`
    + u("잡은 수", (r.killed | 0).toLocaleString()) + u("금", "+" + r.gold.toLocaleString())
    + u("경험치", "+" + (r.xp | 0).toLocaleString())
    + (r.leveled ? u("", "레벨 업!", "t2") : "") + `</div>`;
  const cell = (it) => {
    const fate = it.made ? ["made", "합침"] : it.mat ? ["mat", "재료"]
               : it.worn ? ["wear", "착용"] : it.bagged ? ["bag", "가방"] : ["gone", "금"];
    const n = (it.af || []).length, uq = !!it.uid;
    /* ★ 배지는 **숫자가 tier 면 색도 tier** 다(V-96 · 2026-08-26). 여기만 `clsOf(it)`
       (희귀도)를 쓰고 있었다 — 유니크에 ★ 를 넣던 f00d57f 가 `uniq` 클래스를 얻으려고
       클래스를 통째로 희귀도로 바꾸면서, **숫자는 tier 인데 색만 희귀도**가 됐다.
       hud.css 가 r0/r1/r2 를 t0/t1/t2 색으로 되쓰는 탓에 tier 4 짜리 매직이
       가방에서는 초록(t4), 정산에서는 파랑(r1) — **같은 물건의 같은 숫자가 두 빛깔**이었다.
       위 `gearCell`(2429줄)이 처음부터 옳게 하던 그대로 맞춘다 — 유니크만 `uniq`,
       나머지는 `TIER_CLS[tier]`([[carry-fixes-forward]] · 한 문에만 박힌 못이었다).
       희귀도는 이름·툴팁·칸 테두리(`rar-`)가 말한다 — 배지가 겹쳐 말할 자리가 아니다. */
    return `<div class="cell ${fate[0]}${uq ? " uniq" : ""}"><span class="eFate">${fate[1]}</span>
      <i class="gear-${it.k}"></i><span class="q ${uq ? "uniq" : TIER_CLS[it.tier]}">${uq ? "★" : it.tier}</span>
      ${n ? `<span class="afd">${"•".repeat(n)}</span>` : ""}</div>`;
  };
  /* 빈손이어도 **한 일은 있다** — 예전엔 「빈손으로 돌아왔다」 한 줄만 남아 창의
     절반이 통째로 비었다(병수님 2026-08-12). 좌판이 설 자리에 **이번 판의 자취** 넉
     장을 같은 격자(.grid)로 세운다 — 부제와 겹치지 않는 것들로 골랐다(부제는 쓰러진
     층·잡은 수·금·경험치). 내려간 깊이는 시작 층이 있을 때만 「n→m층」으로, 1층에서
     시작했으면 그냥 「m층」. */
  const mmss = (s) => `${Math.floor((s | 0) / 60)}:${String((s | 0) % 60).padStart(2, "0")}`;
  const runCell = (label, val) =>
    `<div class="cell run"><span class="rVal">${val}</span><span class="rLbl">${label}</span></div>`;
  /* ★ V-110 — **「10→10층」은 «내려간 깊이»가 아니다.** 건너뛰기가 열린 뒤로는 판이
     10층·23층에서 시작하는데, 거기서 **한 층도 못 내려가고** 끝나면 이 칸이
     `10→10층` 이라고 적었다 — 화살표는 「여기서 저기로 갔다」는 말인데 간 데가 없다.
     처음 판이 8초 만에 끝나는 자리(V-14b)라 **자주 보이는 거짓말**이다.
     V-101 「×1.00」· V-102 「없음」· V-105 「0/0」· V-108 「가장 깊이 1층」과 같은 못이다
     ([[carry-fixes-forward]]) — 뜻 없는 수가 가장 크게 거짓말하는 자리.
     ★ 자리를 비우지 않는다(V-108 에서 배운 것) — 수는 그대로 두고 **딱지가 참말을
     한다.** 시작 층은 `from<=1` 일 때와 똑같이 «끝난 층» 하나만 적는다. */
  /* 옛 결로 되돌리는 문 — 자가 **같은 판을 두 번** 재도록(`body.headold` 와 같은 결). */
  const 내려감 = window.__DEPTHOLD ? 1 : (r.floor | 0) - Math.max(1, r.from | 0);
  const depth = 내려감 > 0 && (r.from | 0) > 1 ? `${r.from}→${r.floor}층` : `${r.floor}층`;
  const depthLbl = 내려감 > 0 ? "내려간 깊이" : "한 층도 못 내려감";
  $("endBody").innerHTML = r.loot.length
    ? `<div class="grid">${r.loot.map(cell).join("")}</div>`
    : `<div class="eEmpty">빈손으로 돌아왔다</div>
       <div class="grid runGrid">`
       + runCell(depthLbl, depth)
       + runCell("불러낸 하수인", (r.summoned | 0).toLocaleString())
       + runCell("쓴 시체", (r.used | 0).toLocaleString())
       + runCell("버틴 시간", mmss(r.secs))
       + `</div>`;
  /* ★ **문이 열린 날 한 번은 말해 준다**(ROADMAP D-15 ㉮). 이제 고르지 않아도 저절로
     깊은 데서 시작하므로, **말없이 그렇게 되면** 사람은 자기 판이 왜 65층에서 열리는지
     모른다. 정산 창은 죽은 직후 반드시 보는 자리라 여기서 한 번만 적는다. */
  /* ★ V-130 — **이름은 «화면에 서 있는 것»의 이름이어야 한다.** 이 줄은 한 생에 딱
     한 번 나가는 **유일한 안내**인데, 여기서만 「건너뛰기」라고 불렀다 — 그 낱말은
     게임 화면 어디에도 없다(코드 주석에만 있다). 정작 그 기능은 마을에 **「웨이포인트」**
     라는 이름표를 달고 서 있고, 창을 열면 스스로를 「표」라 부른다. 한 물건에 이름이 셋이라
     안내를 읽은 사람이 무엇을 찾아야 하는지 모른다(V-114 「어둠의 길」과 같은 못
     [[carry-fixes-forward]]). 아래 「마을 문」도 같은 결이다 — 문으로도 열리지만
     **이름표가 붙은 물건**을 가리키는 편이 찾을 수 있는 말이다.
     ★ 값도 규칙도 한 톨 안 건드린다(diveMax·diveTold·여는 문턱 그대로) — 낱말만 바뀐다.
     문은 `__WAYNAME_OLD` — 자가 옛 이름을 그대로 다시 내게 한다. */
  if (diveMax() > 0 && !(META.diveTold | 0)) {
    META.diveTold = 1; saveMeta();
    const 옛이름 = !!globalThis.__WAYNAME_OLD;
    $("endSub").innerHTML +=
      `<div class="eWhere" style="color:#c8aa6e">`
      + (옛이름 ? `건너뛰기가 열렸다` : `마을에 <b>웨이포인트</b>가 섰다`)
      + ` — 다음 판은 <b>${diveMax()}층</b>에서 시작한다`
      + `<br><span style="opacity:.75;font-size:.9em">`
      + (옛이름 ? `마을 문에서 바꿀 수 있다` : `거기서 바꿀 수 있다`)
      + `(처음부터도 고를 수 있다)</span></div>`;
  }
  $("endGold").textContent = (META.gold | 0).toLocaleString();
}

/* ══ 환생 확인 창 ══ **되돌릴 수 없으므로 먼저 보여 주고 확인을 받는다.** 자동으로
   강제하지 않는다 — 사람이 「환생」을 눌러야 실행된다. 상인·정산과 같은 돌(winFoot·tip). */
/* ══ 웨이포인트 판 ══ (ROADMAP V-3 · 옛 「건너뛰기 창」)
   ──────────────────────────────────────────────────────────────
   여태 이 창은 **층 번호만 스물 몇 개** 늘어놓았다 — 「20층」과 「25층」이 무엇이
   다른지 화면 어디에도 없으니, 사람은 그냥 **제일 큰 수**를 눌렀다. 고를 것이
   있는데 고를 «까닭»이 없으면 그건 선택이 아니라 슬라이더다.

   구역이 갈린 뒤로는(G-b) 까닭이 이미 판 안에 있다 — **구역마다 잘 나오는 물건이
   다르다**(ZONES.bias). 장갑이 필요하면 잿빛 야영터로 되돌아가는 것이 이 창의 뜻이고,
   그게 D2 의 웨이포인트가 하는 일이다. 그래서 층 목록을 **구역 카드**로 바꾼다:
   이름·빛깔(tint)·층 범위·거기 서는 적·잘 나오는 슬롯을 한 칸에 담고, 층 눈금은
   그 안에 칩으로 넣는다.

   ★ **고를 수 있는 폭은 한 톨도 안 줄인다.** 구역 첫 층(z.from)은 5의 배수가 아닌
     것이 많은데(4·9·16·26), 옛 창은 5눈금만 줬다. 이제 **구역 첫 층 + 그 구역 안의
     5눈금**을 다 준다 — 늘어난 쪽이다(16층에 서려고 20층을 고를 일이 없어진다).
   ★ 깊이 200 이면 심연 한 구역에 칩이 서른 개가 된다 — **여섯 개로 자르되 제일
     깊은 것들을 남긴다**(맨 앞 하나 + 뒤에서 다섯). 지금 고른 칩은 잘려도 되살린다.
   ★ 아직 못 여는 구역도 **회색으로 보여 준다.** 안 보이면 「더 있다」를 모르고,
     보이면 그게 다음 목표가 된다(D2 의 회색 웨이포인트가 그 일을 한다). */
/** ★ V-130 — **이 판에서 이 물건의 이름은 하나다.** 마을에 선 것의 이름표가
 *  「웨이포인트」(town.js PLACES)이므로, 그것을 가리키는 모든 글월이 같은 낱말을 쓴다.
 *  이름을 여기 한 자리에 둔 까닭은 이름표와 글월이 따로 늙지 않게 하려는 것이다.
 *  문(`__WAYNAME_OLD`)은 옛 낱말(「표」)을 그대로 다시 낸다 — 자의 보정용. */
const WAYN = () => (globalThis.__WAYNAME_OLD ? "표" : "웨이포인트");
const zoneTo = (i) => (ZONES[i + 1] ? ZONES[i + 1].from - 1 : 0);
/** 그 구역이 열리는 데 필요한 깊이 — diveMax() 를 거꾸로 푼 것(5눈금 + 두 관문). */
const zoneNeed = (z) => DIVE_BACK + Math.ceil(z.from / DIVE_STEP) * DIVE_STEP;
/** 카드 하나가 주는 층 칩들. 값은 「고른 층」(0 = 처음부터). */
function zoneMarks(z, i, max, cur) {
  const to = zoneTo(i) || Infinity;
  const m = [];
  if (z.from <= max) m.push(z.from);
  for (let f = Math.ceil(z.from / DIVE_STEP) * DIVE_STEP; f <= Math.min(to, max); f += DIVE_STEP)
    if (f !== z.from) m.push(f);
  let out = m.length > 6 ? [m[0], ...m.slice(-5)] : m;
  const c = cur || 1;                                  // 처음부터(0)는 1층 칩이다
  if (c >= z.from && c <= to && c <= max && !out.includes(c)) out = [...out, c].sort((a, b) => a - b);
  return out;
}
function drawDive() {
  const max = Math.max(1, diveMax()), cur = diveAt();
  const here = zoneOf(cur || 1).n;                      // 지금 고른 층이 선 구역
  const cards = ZONES.map((z, i) => {
    const to = zoneTo(i);
    const span = to ? (z.from === to ? `${z.from}층` : `${z.from}~${to}층`) : `${z.from}층~`;
    const tint = z.tint || "#c8aa6e";
    const head = `<div class="wayHead"><span class="wayN" style="color:${tint}">${z.n}</span>`
               + `<span class="wayF">${span}</span></div>`;
    /* ══ V-120 ══ **자기가 지금 걷고 있는 구역이 「아직 못 온 곳」처럼 적혀 있었다.**
       표는 가장 깊이보다 `DIVE_BACK`(10)층 뒤에 서므로, 26~39층 구역은 **40층까지**
       내려가야 열린다 — 그런데 그 구역에 서 있는 34층 사람에게도 같은 줄이 나갔다:
       「26~39층 · 40층까지 내려가면 열린다」. 내가 지금 싸우는 자리를 두고 「내려가면」
       이라 하니, 사람이 아는 사실과 판이 적은 사실이 어긋난다(V-119 와 같은 결).
       ★ 잠깐 스치는 자리가 아니다 — **구역에 발을 들인 순간부터 열릴 때까지 내내**
       이 줄이다(어둠의 성소는 26~39층 열넷 전부, 잿빛 야영터는 16~29층 열넷).
       ★ 값도 규칙도 안 건드린다 — 여는 문턱(`zoneNeed`)은 한 톨도 그대로고, 여기서
       느는 것은 **적는 것**뿐이다. 이미 걸어 본 구역에는 「왜 아직 안 서는가」를 적는다
       — 그 «왜»(가장 깊이보다 열 층 뒤)는 이 판 어디에도 없던 말이다.
       문은 `__WAYOLD` — 자가 옛 줄을 그대로 다시 내게 한다. */
    if (z.from > max) {                                 // 아직 안 열린 구역 — 회색으로 남겨 둔다
      const been = (META.deepest | 0) >= z.from;        // 걸어는 봤는데 표가 안 선 구역
      const say = (!globalThis.__WAYOLD && been)
        ? `걸어는 봤다 — ${WAYN()}는 <b>가장 깊이보다 ${DIVE_BACK}층 뒤</b>에 선다(<b>${zoneNeed(z)}층</b>부터)`
        : `<b>${zoneNeed(z)}층</b>까지 내려가면 열린다`;
      return `<div class="wayZ lock${(!globalThis.__WAYOLD && been) ? " been" : ""}">${head}`
           + `<div class="wayLock">${say}</div></div>`;
    }
    const who = [...new Set(z.kinds)].map((k) => MOB_N[k] || k).join(" · ");
    const drop = Object.entries(z.bias || {}).filter(([, v]) => v > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => `<b>${(GEAR[k] || {}).n || k}</b>`).join(" · ");
    const chips = zoneMarks(z, i, max, cur).map((f) => {
      const v = f <= 1 ? 0 : f;                         // 1층은 옛 값 그대로 0(처음부터)
      return `<button class="btn diveOpt${v === cur ? " on" : ""}" data-dive="${v}">`
           + `${v ? v + "층" : "처음부터"}</button>`;
    }).join("");
    return `<div class="wayZ${z.n === here ? " on" : ""}">${head}`
         + `<div class="wayWho">${who}</div>`
         + (drop ? `<div class="wayDrop">잘 나오는 것 ${drop}</div>` : "")
         + `<div class="wayChips">${chips}</div></div>`;
  }).join("");
  $("diveBody").innerHTML =
    /* ★ V-108 — 처음 켠 사람에게는 **두 쪽이 다 거짓말**이다: 한 층도 안 걸었는데
       「가장 깊이 1층」이고, 표를 하나도 안 세웠는데 「표를 세운 데까지 1층」이다. */
    (!window.__DEEPOLD && neverDove()
      ? `<div class="tipStat" style="margin-bottom:6px">아직 안 내려갔다 · 세워 둔 ${WAYN()} <b>없음</b></div>`
      : `<div class="tipStat" style="margin-bottom:6px">가장 깊이 <b>${META.deepest | 0}층</b> · ${WAYN()}를 세운 데까지 <b>${max}층</b></div>`) +
    `<div class="wayList wScroll">${cards}</div>` +
    `<div class="tipStat" style="margin-top:8px;opacity:.75">건너뛴 층의 전리품·경험치는 없다 — 걷지 않은 길이므로.` +
    ((META.diveSet | 0) ? "" : `<br>고르지 않으면 <b>${max}층</b>부터 시작한다.`) + `</div>`;
  /* ★ **지금 고른 구역이 보이게 굴려 둔다.** 카드가 일곱 장이라 낮은 창에서는 아래
     둘셋이 접힌다 — 그런데 기본값은 **제일 깊은 구역**이라(diveAt), 열자마자 보이는
     것은 늘 1층짜리 「무너진 묘지」였다. 고른 것이 안 보이면 고른 줄도 모르고,
     누르려면 굴려야 한다(자도 그래서 칸을 못 눌렀다 · dive_qa).
     목록의 scrollTop 만 만진다 — scrollIntoView 는 창 바깥까지 굴린다. */
  requestAnimationFrame(() => {
    const list = $("diveBody").querySelector(".wayList");
    const on = list && list.querySelector(".wayZ.on");
    if (on) list.scrollTop = Math.max(0, on.offsetTop - list.offsetTop - 6);
    /* ★ 굴린 **뒤에** 다시 잰다 — win() 의 판정은 이 rAF 보다 먼저 돌아서, 아래로
       굴려 놓고도 「아래에 더 있다」가 켜진 채(또는 꺼진 채) 굳는다. */
    markMore(list);
  });
}
function drawReborn() {
  const p = rebirthPreview();
  const from = mul(relicMul()), to = mul(p.mul);
  $("rebornBody").innerHTML =
    `<div class="tip">
       <div class="tipStat">이번 회차 최고 <b>${META.deepest}층</b></div>
       <div class="tipStat">유해 <b class="t3">+${p.gain}</b> <span class="dim">(총 ${p.relics})</span></div>
       <div class="tipStat">금·경험치·시체 획득 <b class="t3">${from} → ${to}</b></div>
       <div class="tipStat">회차 <b>${(META.rebirths | 0) + 1}회째</b></div>
     </div>
     <div class="rebornWarn">층·레벨·금·가방·트리·장비가 <b>처음으로</b> 되돌아간다.
       유해와 최고 기록만 남는다 — <b>되돌릴 수 없다.</b></div>`;
}

/** ══ 초기화 확인 ══ (병수님 2026-08-17 「초기화 기능 좀 만들어줘」)
 *  **환생과 무엇이 다른지를 이 자리에서 말한다.** 둘 다 「처음으로」인데 하나는 지고 가고
 *  하나는 안 지고 간다 — 그 차이를 모르고 누르면 유해 수십 구가 소리 없이 사라진다.
 *  그래서 지금 **지워질 것을 수로** 적는다(빈 판에서 눌러도 0 이 뜨는 게 낫다 —
 *  「무엇이 사라지는지」를 늘 같은 자리에서 읽게 된다). */
function drawWipe() {
  const rel = META.relics | 0, rb = META.rebirths | 0;
  const done = QUESTS.filter((q) => questDone(q)).length;
  $("wipeBody").innerHTML =
    `<div class="tip">
       ${!window.__DEEPOLD && neverDove()
         ? `<div class="tipStat">가장 깊이 <b>아직 안 내려감</b></div>`
         : `<div class="tipStat">가장 깊이 <b>${META.deepest}층</b> <span class="dim">(최고 ${Math.max(META.best | 0, META.deepest | 0)}층)</span></div>`}
       <div class="tipStat">레벨 <b>Lv.${META.lv}</b> · 금 <b>${num(META.gold)}</b> · 가방 <b>${META.bag.length}</b></div>
       <div class="tipStat">유해 <b class="t3">${rel}구</b> · 회차 <b>${rb}회</b> · 일지 <b>${done}/${QUESTS.length}</b></div>
     </div>
     <div class="rebornWarn">환생은 <b>유해·회차·일지·최고 기록을 지고</b> 다시 걷는다.
       초기화는 <b>그것까지 전부</b> 지운다 — 아무것도 없던 자리로 돌아간다.
       <b>되돌릴 수 없다.</b></div>`;
}

/* ══ 오프라인 정산 패널 ② ══ 껐다 켠 사이의 벌이를 「그동안 N분 · 금 X · 시체 Y」로 보여
   준다. 상한(8시간)에 걸렸으면 그것도 알린다. 정산·환생과 같은 돌(winFoot·tip). */
function drawOffline(off) {
  /* ★ 「8시간 0분」 — 상한(OFFLINE_CAP_MIN)에 걸린 판은 **언제나** 분이 0 이라
     밤새 껐다 켠 사람이 늘 보는 줄이 이것이다. 분이 0 이면 시만 적는다.
     ══ V-119 ══ **그 줄이 거짓말이었다.** 여기 쓰던 `off.min` 은 상한(8시간)을 씌운
     **정산** 분이라, 사흘을 비우고 돌아온 사람에게도 「그동안 8시간 자리를 비웠다」고
     적었다 — 자로 재니 상한을 넘긴 판 3/3 이 전부 틀렸다. 사람이 아는 사실(「어제
     저녁에 껐다」)과 판이 적은 사실이 어긋나면, 바로 아래 「8시간까지만 쌓인다」도
     무슨 말인지 모르게 된다. **비운 시간은 `awayMin`(상한 없는 실제 경과)으로 적고,
     쌓인 몫이 8시간치라는 것은 상한 줄이 따로 말한다.**
     ★ 값도 규칙도 안 건드린다 — 금·시체는 여전히 `off.min`(상한 씌운 것)으로 셈했다.
     ★ 날을 넘기면 시간만으로는 못 읽는다(「77시간」) — 하루 위는 **일**로 적는다. */
  const awayMin = (globalThis.__AWAYOLD ? off.min : (off.awayMin ?? off.min)) | 0;
  const days = Math.floor(awayMin / 1440);
  const hrs = Math.floor((awayMin % 1440) / 60), mins = awayMin % 60;
  const dur = days ? (hrs ? `${days}일 ${hrs}시간` : `${days}일`)
            : hrs  ? (mins ? `${hrs}시간 ${mins}분` : `${hrs}시간`)
            : `${mins}분`;
  /* ══ V-127 ══ **이 창의 시체 줄은 시간이 얼마든 늘 같은 수였다.**
     켜서 셋을 찍어 보니(`tools/v127_look.mjs`) 30분·9시간·사흘이 **전부 「+140」** 이다 —
     창고 상한(CORPSE_BANK_MAX)에 30분이면 이미 닿기 때문이다([[knob-that-does-nothing]]).
     그런데 창은 ① 그 상한을 **「한 짐」이라는 크기 없는 말**로만 부르고(V-125 가 운용 창에서
     거둔 바로 그 못 · [[carry-fixes-forward]]), ② 대신 **줄 수 없는 큰 수**(「12,000구를
     벌었다」)를 가장 굵게 적고, ③ 「8시간까지만 쌓인다」를 시체 줄 **바로 밑**에 놓아
     그 상한이 시체에도 걸리는 것처럼 읽혔다(시체는 8시간이 아니라 **몇 분**이면 찬다).
     ★ **값도 규칙도 한 톨 안 건드린다** — 금·시체·상한은 그대로다. 느는 것은 말할 재료뿐이다
       (V-117·V-119·V-125 와 같은 결). 상한은 `CORPSE_BANK_MAX`, 차는 시간은
       `offlineCorpseFillMin` 으로 **core 에서 읽어** 온다([[threshold-and-ruler-must-match]]).
     ★ 문은 `__OFFOLD` — 옛 글월을 그대로 다시 세운다(없애면 나란히 찍은 그림이
       「없던 자리」를 보여 준다 · [[silent-zero-is-not-an-observation]]). */
  /* 효율(OFFLINE_EFF)도 판 어디에도 안 적혀 있었다 — 금이 왜 「한 층 수입 × 분」보다
     적은지 사람이 알 길이 없다. **상수에서 읽어** 적는다(0.5 가 아니게 되면 %로 적힌다). */
  const EFF_WORD = OFFLINE_EFF === 0.5 ? "절반" : Math.round(OFFLINE_EFF * 100) + "%";
  const cIn   = (off.corpsesIn ?? off.corpses) | 0;
  const fillM = offlineCorpseFillMin(META);
  const fill  = fillM >= 60 ? `${Math.round(fillM / 60)}시간` : `${fillM}분`;
  $("offBody").innerHTML = globalThis.__OFFOLD ?
    `<div class="tip">
       <div class="tipStat">그동안 <b>${dur}</b> 자리를 비웠다</div>
       <div class="tipStat">금 <b class="t3">+${off.gold.toLocaleString()}</b></div>
       <div class="tipStat">시체 <b class="t3">+${cIn.toLocaleString()}</b> <span class="dim">다음 던전에 함께 내려간다</span></div>
       ${off.corpseFull ? `<div class="tipStat dim">시체는 <b>한 짐</b>까지만 지고 간다 — ${off.corpses.toLocaleString()}구를 벌었다</div>` : ""}
       ${off.capped ? `<div class="tipStat dim">${OFFLINE_CAP_MIN / 60}시간까지만 쌓인다</div>` : ""}
     </div>` :
    `<div class="tip">
       <div class="tipStat">그동안 <b>${dur}</b> 자리를 비웠다</div>
       <div class="tipStat">금 <b class="t3">+${off.gold.toLocaleString()}</b> <span class="dim">지켜보는 것의 ${EFF_WORD}씩${off.capped ? ` · ${OFFLINE_CAP_MIN / 60}시간까지만` : ""}</span></div>
       <div class="tipStat">시체 <b class="t3">+${cIn.toLocaleString()}</b> <span class="dim">/ ${CORPSE_BANK_MAX} · 다음 던전에 함께 내려간다</span></div>
       ${off.corpseFull ? `<div class="tipStat dim">창고가 <b>찼다</b> — 시체는 <b>${CORPSE_BANK_MAX}구</b>까지만 지고 간다. 이 깊이면 <b>${fill}</b>이면 찬다</div>` : ""}
     </div>`;
  $("offGold").textContent = (META.gold | 0).toLocaleString();
}

/* ══ 창 밖을 누르면 닫힌다 ══ 병수님 2026-08-13: "UI 창 외에 다른 곳 클릭하면 자동으로
   닫히면 좋겠는데 (물론 변경사항이 있으면 적용할거냐고 물어보고)".
   ★ **물어볼 것이 없다.** 이 창들은 누르는 순간 이미 적용된다 — 상점의 구매는 그 자리에서
     금이 나가고(drawShop 위 buy), 트리의 점도 찍는 즉시 saveMeta 한다(core.take).
     그래서 확인 창을 세우면 「예」밖에 못 누르는 물음이 된다. 미확정 상태를 쥐는 창이
     생기면 바로 여기 dirty 검사를 끼운다.
   ★ 다만 **정산은 뺀다** — 한 판의 셈은 다시 못 여는 보고라서, 손가락이 스친 한 번에
     사라지면 안 된다. 그건 「마을로」로만 닫는다.
   ★ 잡는 단계는 **capture** 다. 여기서 안 삼키면 같은 한 번의 누름이 마을 건물까지
     닿아, 창을 닫자마자 다른 창이 열린다. */
const softWins = () => WINS.filter((w) => w !== "winEnd" && w !== "winOffline" && $(w).classList.contains("on"));
document.addEventListener("click", (e) => {
  if (!softWins().length) return;
  const t = e.target;
  if (t.closest && (t.closest(".frame") || t.closest(".hBtn") || t.closest("#ftip"))) return;   // 창 안 · 여는 단추 · 떠 있는 툴팁(⑦)은 제 일을
  closeAll(); e.stopPropagation(); e.preventDefault();
}, true);
/* ══ 단축키 ══ (병수님 2026-08-17 21:06 「그리고 단축키도 있어야함」)
   ──────────────────────────────────────────────────────────────
   PC 전용 게임인데 키는 `Esc` 하나뿐이었다 — 창을 열려면 매번 손이 아래 판까지 내려간다.
   ★★ **벨트 칸에는 이미 1~8 이 «적혀» 있었다**(belt() 의 `<span class="k">`). 적어 놓고
     안 먹으면 그건 장식이 아니라 **거짓말**이다 — 눌러 보고서야 안 도는 걸 안다.
     그래서 숫자키부터 진짜로 잇는다.
   자리는 D2 를 따른다: C 캐릭터 · I 인벤토리 · T 스킬트리 · Esc 닫기.
   우리 것 둘도 마을에서만: O 편성 · P 운용.
   ★ **글쇠는 화면에도 적는다** — 안 적힌 단축키는 없는 것과 같다(단추 title 에 넣는다).
   ★ 조합키(⌘·Ctrl·Alt)가 눌린 것은 **건너뛴다** — ⌘R(새로고침)·⌘I(검사)를 뺏으면 안 된다.
     한글 자판이어도 `e.code`(KeyC 등)는 그대로라 그걸 본다(`e.key` 는 「ㅊ」가 된다). */
const HOTKEY = {
  KeyC: () => window.__openWin("stat"),
  KeyA: () => window.__openWin("stat"),      // 「능력치」의 ㄱ자 — C 와 같은 자리
  KeyI: () => window.__openWin("bag"),
  KeyB: () => window.__openWin("bag"),
  KeyT: () => window.__openWin("tree"),
  KeyS: () => window.__openWin("tree"),
  KeyO: () => { if (MODE.at === "town") window.__openWin("doctrine"); },
  KeyP: () => { if (MODE.at === "town") window.__openWin("tactic"); },
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (softWins().length) closeAll(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;      // 브라우저 몫은 브라우저에게
  /* 숫자 1~8 = 벨트 — **칸에 적힌 그 수**다. 쓸 수 있는 스킬만 돈다(cast 가 판단한다). */
  const n = e.code.startsWith("Digit") ? +e.code.slice(5) : 0;
  if (n >= 1 && n <= SKILLS.length) { cast(SKILLS[n - 1].id); e.preventDefault(); return; }
  const fn = HOTKEY[e.code];
  if (fn) { fn(); e.preventDefault(); }
});

/* 누르는 것 하나로 셋을 다 받는다 — 창 안의 단추와 나가기. */
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.hasAttribute && t.hasAttribute("data-close")) { closeAll(); return; }
  /* ══ 환생 실행 ══ 확인 창의 「환생」 하나만이 여기로 온다 — 되돌릴 수 없다. */
  if (t.hasAttribute && t.hasAttribute("data-dive")) {
    /* ★ **고른 적이 있다**를 같이 적는다(core.js DIVE_DEF) — 「처음부터」를 고른 것도
       고른 것이라, 그 뒤로는 기본값이 그 위를 안 덮는다. */
    META.dive = +t.getAttribute("data-dive") | 0; META.diveSet = 1; saveMeta(); drawDive(); return;
  }
  if (t.hasAttribute && t.hasAttribute("data-dive-go")) { closeAll(); toDungeon(); return; }
  /* 초기화 — **저장을 지우고 판을 새로 연다.** 값을 하나씩 되돌리지 않는 까닭은
     core.js wipeSave 주석에 있다(새 필드를 더할 때마다 여기를 같이 고쳐야 하고,
     한 번 빠뜨리면 그 값만 살아남는다). 새로고침이 가장 확실한 「처음」이다. */
  if (t.hasAttribute && t.hasAttribute("data-wipe")) {
    if (wipeSave()) location.reload();
    return;
  }
  if (t.hasAttribute && t.hasAttribute("data-reborn")) {
    if (rebirth()) { closeAll(); syncReborn(); belt(); hud(); markSp(); }
    return;
  }
  /* ★ 능력치 ↔ 가방은 **형제 창**이라 서로에게서 바로 건너간다. 위 띠에 단추를 하나 더
     늘려 봤더니 360px 에서 왼쪽 「가장 깊이 37층」이 말줄임에 먹혔다 — 그 줄은 여유가
     원래 0 이다(오늘 나가기 때도 같은 자리에서 밀렸다). 자리를 짜내는 대신 길을 잇는다. */
  if (t.hasAttribute && t.hasAttribute("data-go")) { window.__openWin(t.getAttribute("data-go")); return; }
  const pick = t.closest && t.closest("[data-pick]");
  if (pick) { shopPick = pick.getAttribute("data-pick"); drawShop(); return; }
  const fpick = t.closest && t.closest("[data-fpick]");
  if (fpick) { forgePick = fpick.getAttribute("data-fpick"); drawForge(); return; }
  /* 편성 칸 — 고르는 즉시 META 에 쓰고 저장한다(사는 것이 아니라 고르는 것 · 확인 없음). */
  const dpick = t.closest && t.closest("[data-doc]");
  if (dpick) {
    const id = dpick.getAttribute("data-doc");
    docPick = id;
    /* 잠긴 칸은 **보여만 준다** — 누른다고 지금 편성이 되지 않는다(V-113). 「아직」이
       붙었는데 고를 수는 있으면 그 배지는 그림일 뿐이다. */
    if (docPickOld() || !dpick.classList.contains("lock")) { META.doctrine = id; saveMeta(); }
    drawDoctrine(); return;
  }
  const tpick = t.closest && t.closest("[data-tac]");
  if (tpick) { META.tactic = tpick.getAttribute("data-tac"); saveMeta(); drawTactic(); return; }
  /* 칸을 고르고 붙박는 일은 «떠 있는 상자»(⑦)의 ftip 리스너가 쥔다 — 여기(전역 click)는
     상자 안 「끼기」만 받는다. 칸 고르기 갈래를 여기 두면 자리 셈이 두 곳으로 갈라진다. */
  const bwear = t.getAttribute && t.getAttribute("data-bagwear");
  if (bwear) {
    const it = META.bag[+bwear];                   // 낀 뒤 가방 index 는 밀리므로 지금 붙잡는다
    equipFromBag(+bwear);
    statSel = it ? { src: "eq", k: it.k } : null;  // 방금 낀 그 슬롯을 골라 둔다(상자 내용이 바뀐다)
    ftipPin = statSel;                             // 붙박이를 방금 낀 슬롯으로 옮긴다(가방 칸은 사라졌다)
    saveMeta();
    if ($("winStat").classList.contains("on")) drawStat();   // 도킹 시 인물 쪽 .sel·재배치
    drawBag(); hud();                              // drawBag 의 ftipReflow 가 새 칸에 상자를 다시 붙인다
    return;
  }
  if (t.hasAttribute && t.hasAttribute("data-dig")) {
    const r = digDraw();                           // 금이 모자라면 null — 아무 일도 안 난다
    if (r) lastDig = r;                            // 뽑았으면 결과를 기억해 툴팁에 남긴다
    drawShop(); hud();                             // 연타가 되게 — 창·고른 칸은 그대로다
    return;
  }
  const buy = t.getAttribute && t.getAttribute("data-buy");
  if (buy) {
    const nx = gearNext(buy); if (nx === null) return;
    const cost = GEAR[buy].cost[nx];
    if (META.gold < cost) return;
    /* 산 것은 **옵션 없는 물건**(상점은 바닥, 던전이 천장이다). 끼고 있던 것은
       버리지 않고 가방으로 — 옵션이 좋은 낮은 등급을 사다가 잃으면 안 된다. */
    const old = equipped(buy);
    if (old) META.bag.push(old);
    META.gold -= cost; META.equip[buy] = mkItem(buy, nx, true); saveMeta();
    S.hp = Math.min(hpMaxOf(), S.hp + 0);          // 최대치가 늘면 비율이 아니라 여유가 는다
    drawShop(); hud();
    return;
  }
  const up = t.getAttribute && t.getAttribute("data-up");
  if (up) {
    const cost = upCost(up);
    if (META.gold < cost) return;
    META.gold -= cost; META.up[up] = (META.up[up] | 0) + 1; saveMeta();
    /* 강화 단추는 이제 **두 곳**에 산다(대장간 · 능력치 창) — 셈은 여기 하나가 쥐되
       다시 그리는 것은 **누른 그 창**이다. 대장간만 그리면 능력치 창에서 누를 때
       값이 그대로라 「안 눌린다」로 보인다(눌리긴 눌렸다 — 그림만 안 왔다). */
    if ($("winStat").classList.contains("on")) drawStat(); else drawForge();
    hud();
  }
  /* ★ V-141 — 손으로 사는 재련. 셈은 core(buyReforge) 하나가 쥐고, 여기는 저장·다시 그리기만
     — 강화 단추(data-up)와 같은 결. 재련은 대장간 창에만 있으므로 drawForge 만 그린다. */
  const re = t.getAttribute && t.getAttribute("data-re");
  if (re) {
    if (buyReforge(re)) { saveMeta(); drawForge(); hud(); }
  }
});

/* 마을에서 **화면 안의 것을 눌러** 움직인다. 큰 단추를 따로 두는 것보다
   「거기 있는 곳」으로 읽힌다. */
/* 검수용 — 자가 마을 건물 좌표를 못 맞춰서 창을 못 열었다. 여는 길을 하나 내준다. */
/* 검수용 — 자가 창을 닫을 길. `bagfit_qa` 가 폭마다 `window.__closeAll()` 을 부르고
   있었는데 **그런 것이 없었다**(조용히 아무 일도 안 났다). 그래서 다음 폭에서 이미 열린
   창을 다시 열어 **토글로 닫히고**, 자는 「인물이 없다」로 울었다 — 1440 에서만 났다.
   여는 길이 하나로 모여 있듯 **닫는 길도 하나** 있어야 밖에서 검수할 수 있다. */
window.__closeAll = () => closeAll();
/** 자를 위한 **참값 창구**(V-111) — 능력치 창의 배수가 정말 중립인지를 **화면 글자가
 *  아니라 core.js 함수**에서 읽게 한다. 화면에서 되읽으면 자가 제 고침을 되읽는다
 *  ([[silent-zero-is-not-an-observation]]). 값도 그림도 안 건드리는 읽기 전용 창구다. */
window.__STATTRUTH = () => ({ self: selfDmgMul(), minion: minionDmgMul(), depth: depthMul() });
window.__openWin = (which) => {
  /* 같은 단추를 다시 누르면 **닫힌다** — 열기만 되면 「어떻게 닫지」를 또 찾게 된다. */
  const idOf = { shop:"winShop", forge:"winForge", stat:"winStat", bag:"winBag", tree:"winTree", end:"winEnd", reborn:"winReborn", offline:"winOffline", doctrine:"winDoctrine", tactic:"winTactic", wipe:"winWipe" }[which];
  if (idOf && idOf !== "winEnd" && $(idOf).classList.contains("on")) { closeAll(); return; }
  /* 창 하나를 열면 나머지는 **먼저 닫는다**(closeAll) — 스킬 트리·상태창과 같은 결.
     상인/대장간만 손으로 토글하다 상태창을 못 닫아 두 장이 겹쳤다(closeAll 에 winStat 를
     더해도, 여는 길이 closeAll 을 안 거치면 소용없다). 여는 길을 하나로 모은다. */
  if (which === "shop")  { closeAll(); drawShop();  win("winShop", true); }
  if (which === "forge") { closeAll(); drawForge(); win("winForge", true); }
  /* 건너뛰기 창은 마을 **문**을 눌러야 열린다(townHitAt) — 자가 그 자리를 못 짚으므로
     여기에도 길을 둔다(D-15 · 창의 글월을 눈으로 보려면 열 수 있어야 한다). */
  if (which === "dive")  { closeAll(); drawDive();  win("winDive", true); }
  /* ★ **능력치와 가방은 한 벌이다**(병수님 2026-08-17 「여전히 이상해」). D2 는 왼쪽에
     능력치, 오른쪽에 인벤토리가 **동시에** 선다 — 오가는 단추로 갈아 끼우는 것이 아니다.
     넓은 창에서는 둘을 같이 열고 `body.charOpen` 을 붙여 반씩 도킹한다(hud.css).
     좁은 창(<1200)에서는 붙일 자리가 없으므로 **예전처럼 하나만** 연다. */
  if (which === "stat" || which === "bag") {
    closeAll();
    /* ★★ **표식을 «그리기 전에» 붙인다.** `drawStat` 이 `charOpen` 을 보고 인물을 넣을지
       정하는데, 그리고 나서 붙였더니 **첫 번째로 여는 판에는 인물이 아예 없었다**
       (가방 쪽 인물은 CSS 가 감추고, 능력치 쪽은 아직 안 그렸으니 어느 창에도 없다).
       두 번째부터는 지난번 표식이 남아 있어 멀쩡해 보였다 — 자가 1440 에서만 울어
       잡혔다(1512 는 앞 차례의 표식을 물려받았다). 순서가 곧 버그였다. */
    charWhich = which;
    const both = matchMedia("(min-width: 1200px)").matches;
    document.body.classList.toggle("charOpen", both);
    drawStat(); drawBag();
    if (both) { win("winStat", true); win("winBag", true); }
    else win(which === "stat" ? "winStat" : "winBag", true);
  }
  /* ★ 트리가 여기 없었다 — 검수기가 `__openWin("tree")` 를 부르고 **아무 일도 안 난
     채** 마을 화면을 찍어 「이상 없음」을 냈다. 여는 길은 전부 여기 모여 있어야
     밖에서 검수할 수 있다. */
  if (which === "tree")  { closeAll(); drawTree();  win("winTree", true); }
  /* 정산도 같은 자리에 — 자가 LASTRUN 을 손수 채워 넣고 **그 값 그대로** 다시 그리게
     한다(줄바꿈은 값 길이에 달렸으므로 판을 한 번 죽여 나온 한 벌로는 못 잰다). */
  if (which === "end")   { closeAll(); drawEnd();   win("winEnd", true); }
  if (which === "reborn"){ closeAll(); drawReborn(); win("winReborn", true); }
  if (which === "wipe")  { closeAll(); drawWipe();   win("winWipe",  true); }
  if (which === "doctrine"){ closeAll(); docPick = null; drawDoctrine(); win("winDoctrine", true); }
  if (which === "tactic")  { closeAll(); drawTactic();   win("winTactic", true); }
  if (which === "offline" && window.__lastOffline) { closeAll(); drawOffline(window.__lastOffline); win("winOffline", true); }
};
/** ══ V-115 ══ **도킹은 «열 때» 한 번만 정해졌다 — 창은 그 뒤에도 커지고 작아진다.**
 *  1200px 위에서 능력치를 열면 둘이 반씩 도킹하는데(`body.charOpen`), 창을 그 아래로
 *  줄이면 도킹 CSS(@media)만 꺼지고 표식은 남는다. 그러면 두 장이 **똑같은 자리에
 *  통째로 겹쳐** 서고(실측 겹침 100%), 뒤에 깔린 능력치는 화면에서 사라진다 —
 *  사람은 C 를 눌러 능력치를 열어 놓고 가방을 보고 있게 된다(페이퍼 돌도 둘이 된다).
 *  ★ 표식과 CSS 가 **같은 문턱**을 봐야 한다([[threshold-and-ruler-must-match]]) —
 *    문턱은 hud.css 의 `@media (min-width: 1200px)` 와 한 글자도 다르면 안 된다.
 *  ★ 좁아지면 **사람이 부른 쪽**(charWhich)을 남긴다 — 무엇을 열었는지는 그것만 안다.
 *  ★ 값도 규칙도 안 건드린다. 다시 그리는 것은 도킹 여부가 바뀐 **그 순간 한 번**뿐이라
 *    굴리는 동안 판을 다시 그리지 않는다. */
function syncCharDock() {
  if (globalThis.__DOCKOLD) return;                    // 자가 «고치기 전»을 재는 문
  if (!charWhich) return;
  if (!$("winStat").classList.contains("on") && !$("winBag").classList.contains("on")) return;
  const both = matchMedia("(min-width: 1200px)").matches;
  if (both === document.body.classList.contains("charOpen")) return;   // 안 바뀌었다
  ftipClose();                                         // 판을 다시 그리면 붙박인 툴팁은 남의 칸을 가리킨다
  document.body.classList.toggle("charOpen", both);
  drawStat(); drawBag();                               // ★ 표식을 **붙이고 나서** 그린다(__openWin 의 ★★)
  win("winStat", both || charWhich === "stat");
  win("winBag",  both || charWhich === "bag");
}
addEventListener("resize", syncCharDock);

$("stage").addEventListener("click", (e) => {
  if (MODE.at !== "town") return;
  const r = $("stage").getBoundingClientRect();
  const id = townHitAt(e.clientX - r.left, e.clientY - r.top);
  /* ★ 건너뛸 수 있게 된 뒤에는 **묻고 나서** 내려간다. 아직 못 고르면 예전 그대로 —
     조건이 안 됐는데 창부터 뜨면 초반이 한 번 더 눌러야 하는 판이 된다. */
  if (id === "gate")  { closeAll(); if (diveMax() > 0) { drawDive(); win("winDive", true); } else toDungeon(); }
  /* ★ **표를 누르면 어디로 갈지 고른다**(ROADMAP V-3). 아직 안 열렸으면 창을 여는 대신
     **왜 안 열렸는지**를 마을 로그 한 줄로 말한다 — 눌렀는데 아무 일도 안 일어나면
     그건 고장으로 읽힌다(누를 수 있는 것은 언제나 무슨 말이든 해야 한다). */
  if (id === "way") {
    closeAll();
    if (diveMax() > 0) { drawDive(); win("winDive", true); }
    else { S.log.push(`${WAYN()}가 아직 잠들어 있다 — <b>${DIVE_MIN_DEEPEST}층</b>까지 내려가면 깨어난다`); }
    return;
  }
  if (id === "shop")  { closeAll(); drawShop();  win("winShop", true); }
  if (id === "forge") { closeAll(); drawForge(); win("winForge", true); }
});
/* 가리킨 곳을 이름표에 알려 준다 — **누를 수 있다는 말**을 손 모양으로도 한다.
   판정은 누를 때와 **같은 자리**(townHitAt)에서 나온다: 밝아지는 곳과 눌리는 곳이
   어긋나면 이름표가 거짓말을 하는 셈이다. */
$("stage").addEventListener("mousemove", (e) => {
  if (MODE.at !== "town") { setTownHover(null); return; }
  const r = $("stage").getBoundingClientRect();
  const id = townHitAt(e.clientX - r.left, e.clientY - r.top);
  setTownHover(id);
  $("stage").style.cursor = id ? "pointer" : "";
});
$("stage").addEventListener("mouseleave", () => { setTownHover(null); $("stage").style.cursor = ""; });

export function toTown(why) {
  MODE.at = "town";
  useFloor("town");      // 마을은 흙길
  useLayout(0);          // 마을 배치는 앵커(상인·대장간)에 맞춰 놓은 것이라 안 옮긴다
  zoneForget();          // 다시 내려올 때 구역 바닥을 새로 깔게(안 지우면 흙길이 남는다)
  document.body.classList.add("in-town");
  /* ★ **마을은 쉬는 곳이다 — 몸을 추스른다.**(병수님 2026-08-17 19:59
     「던전에서 사망하고 마을로 돌아왔을때, 체력이 0 임」)
     쓰러진 자리의 `S.hp = 0` 이 그대로 남아 마을에서 **빈 구슬**로 서 있었다.
     그런데 실제로는 다음 판이 `newRun()` 에서 어차피 가득 채운다 — 즉 화면만
     「죽은 채로 서 있다」고 말하고 있었던 것이다. **없는 위험을 그리는 UI** 다.
     여기서 채우면 구슬이 곧 사실이 된다(내려갈 때의 몸이 지금 보이는 몸이다).
     ★ 물러남(retreat)도 같다 — 반쯤 깎인 채 마을에 서 있을 까닭이 없다.
     ★ 상한도 같이 잡는다. 판 밖에서 레벨·장비가 바뀌면 hpMax 가 옛 판 것이라
       「4300/3800」 같은 넘치는 구슬이 한 틱 떠 버린다. */
  townFloorSync();   // ★ V-116 — **몸을 재기 «전»에** 층부터 옮긴다(안 그러면 옛 층의 몸으로 채워진다)
  S.hpMax = hpMaxOf(); S.hp = S.hpMax;
  S.mpMax = mpMaxOf(); S.mp = S.mpMax;
  saveMeta();
  /* ★ **판의 기록은 판에 두고 온다.** 예전엔 why 를 앞에 얹기만 해서 그 뒤로 「8층 진입」
     「해골 전사 소환 ×6」이 마을 하늘에 그대로 떠 있었다 — 마을이 무슨 장면인지 흐려진다.
     여기서 비우고 **마을의 줄만** 세운다: 돌아온 사연(why) 한 줄과, 다음에 할 일 한 줄.
     newRun() 도 log 를 비우므로 반대 방향(마을→던전)은 이미 새 판의 줄로 시작한다. */
  S.log.length = 0;
  if (why) S.log.push(why);
  S.log.push("마을 · 채비가 끝나면 입구로");
  sayReset();   // 장면이 바뀌었으니 접힘(×N)을 다시 센다
  syncReborn();
}
export function toDungeon() {
  closeAll();
  MODE.at = "dungeon";
  useFloor("crypt");   // 던전은 돌바닥 — 곧 syncZone 이 그 층의 구역 바닥으로 갈아 끼운다
  document.body.classList.remove("in-town");
  newRun();
  syncReborn();
}
/* 검수용 — 자(headless)가 던전 화면을 보려면 입구를 눌러야 하는데, 그 자리는 판을
   다시 그릴 때마다 움직인다. 좌표를 맞히려다 흰 마을 사진만 찍는 일이 있어 길을 뚫어 둔다
   (window.__S · window.__geo 와 같은 부류). */
window.__toDungeon = toDungeon;
/* ★ 검수용 — **자가 판과 같은 자를 쓰게** 한다(D-43 · [[threshold-and-ruler-must-match]]).
   `d42_walk` 는 「적이 자유인가」를 제 손으로 `90`·`130` 을 적어 셌는데, 판이 실제로 쓰는
   둘레는 `90 * gripMul()` 이고 **뒷정리(몰려옴)에서는 아예 1e9** 다. 문을 켠 팔에서 그
   어긋남은 「문이 놓아 준 적」을 자가 도로 «붙잡힘»으로 닫아 토막을 잘라 버린다 —
   문이 무는지 안 무는지를 **볼 수 없게** 만드는 어긋남이다. 그래서 판이 쓰는 그 수를
   그대로 내준다(값은 안 바꾼다 · 읽기만 하는 창구다). */
window.__gripMul = gripMul;                 // 지금 붙잡는 둘레에 곱하는 몫(문 꺼짐이면 1)
window.__GRIPST  = GRIP;                    // 문의 자 — hi · mul · 문 초(sec) · 몫의 초가중 합(mulSum)
window.__rushNow = () => rushOn() && !(S.spawnQ && S.spawnQ.length);   // 뒷정리면 상한이 풀린다(lim=1e9)
/* ★ D-45 · **무엇이 적을 죽이나** 장부(js/battle.js 의 KILL_BY 머리말). 검수용 창구다 —
   `tools/d45_who.mjs` 가 막타 갈래·깎은 몫·죽은 자리를 여기서 읽는다. 판은 안 건드린다. */
window.__KILLBY = KILL_BY; window.__KILLDMG = KILL_DMG; window.__KILLAT = KILL_AT;
window.__TAINT = TAINT;                                  // ★ D-52 · 오염 장부(읽기 전용 · 판 산수와 무관)
window.__NOVA = NOVA;                                    // ★ D-53 · 폭발이 판을 덮는 몫(읽기 전용)
/* ★ D-47 · **켠 문이 정말 박혔는지** 검수기가 눈으로 보는 창구(core.js `docCorpseOf`).
   판은 안 건드린다 — 읽기만 한다. 꺼져 있으면 {novaMul:1, keep:0} 이 그대로 나온다. */
window.__docCorpse = docCorpseOf;
/* ★ D-48 · **소환이 왜 안 섰나** 장부(js/battle.js 의 RAISE_TALLY 머리말). 검수용 창구다 —
   `tools/d46_forks.mjs` 가 편성마다 마나·재사용·시체·상한 중 무엇이 막았는지를 여기서 읽는다. */
window.__RAISETALLY = RAISE_TALLY;
/* ★ D-57 · **되세우는 손을 잠근 자국**(js/battle.js 의 RAISE_CHOKE 머리말 · D-30 이 붙였다).
   `start_probe` 만 보던 것을 `d46_forks` 도 보게 낸 창구다 — 문을 켜 놓고 `blk` 가 0 이면
   손잡이가 도는 게 아니라 이미 쿨이던 것을 더 민 것뿐이다([[knob-that-does-nothing]]).
   판은 안 건드린다 — 읽기만 한다. */
window.__RAISECHOKEST = RAISE_CHOKE;
/* ★ D-49 · **무엇이 소환수를 죽이나** 장부(js/battle.js 의 LOST_BY 머리말 · D-20 이 붙이고
   D-49 가 횟수 칸을 더했다). 검수용 창구다 — `tools/d46_forks.mjs` 가 갈래별 막타·깎은 몫·
   맞은 횟수와 본인이 맞은 몫을 여기서 읽어 「많이 맞아서」와 「한 방이 커서」를 가른다.
   판은 안 건드린다 — 읽기만 한다. */
window.__LOSTBY = LOST_BY; window.__LOSTDMG = LOST_DMG; window.__LOSTHITS = LOST_HITS;
window.__LOSTKINDS = LOST_KINDS; window.__HEROTALLY = HERO_TALLY;
window.__die = die;      // 검수용 — 정산 화면(tools/run_end.mjs)이 판을 강제로 끝내 스냅샷을 연다
window.__rebirth = rebirth; window.__canRebirth = canRebirth;   // 검수용 — rebirth_qa.mjs 가 회차를 넘긴다
window.__MODE = MODE; window.__LASTRUN = LASTRUN;   // 검수용 — 마을/던전 상태와 이번 판 스냅샷을 읽는다
/* ★ 검수용 — 저장 자체를 들여다보는 자(tools/save_probe.mjs)가 **거른 뒤의 META** 를 읽는다.
   ★★ 여태 `META` 는 어디에도 안 걸려 있었는데 leave_qa.mjs 가 `window.META.deepest = 37`
   을 쓰고 있었다 — **그 줄은 조용히 터졌고**, 자는 「깊이 37」이 아니라 기본값으로 폭을
   재고 통과를 냈다(자가 사람이 지나는 길을 안 지난 셈 · [[probe-must-walk-the-real-path]]).
   이름을 `window.META` 로 거는 것으로 그 구멍까지 같이 막는다. */
window.META = META; window.saveMeta = saveMeta;
window.__UP_KEYS = Object.keys(UPS);   // 강화 칸 이름 — 자가 손으로 안 적게(GEAR_KEYS 와 같은 뜻)
window.__bossH = bossH; window.__mobKinds = mobKindsFor; window.__MOB_H_OF = (k) => MOB_H[k] || 48;      // 관문 보스 크기 검수(tools/boss_probe.mjs)가 실제 값을 읽는다
/* 검수용 — tools/unique_probe.mjs 가 유니크 하나를 강제로 껴 A/B 를 한다. id 를 주면 그 슬롯에
   유니크를 껴 저장하고, 인자가 없으면 유니크를 전부 벗는다(base 팔). */
window.__UNIQUE_IDS = UNIQUE.map((u) => u.id);
window.__forceUnique = (id) => {
  const u = id && UNIQ_BY_ID[id];
  for (const k of GEAR_KEYS) if (META.equip[k] && META.equip[k].uid) META.equip[k] = null;
  if (u) META.equip[u.k] = mkUnique(u);
  saveMeta();
  return u ? u.id : null;
};
window.__deathLog = DEATHLOG;   // 죽은 원인 누계 — tools/gatelord_probe.mjs 가 주인별 사인 분포를 읽는다
window.__GEAR_KEYS = GEAR_KEYS;   // 검수용 — 자가 가방을 채울 때 슬롯 이름을 손으로 적지 않게(winscroll_qa 의 "amul" 사고)

/* ══ 로딩 ══ **다 올 때까지 덮는다.**
   ★ 진행률을 「내가 부른 횟수」로 세면 실제와 어긋난다 — 받는 곳(sprite8 의 img)에서
   센 값(LOAD)만 쓴다. 실패도 「끝난 것」으로 센다: 없는 파일을 기다리며 99% 에
   멈춰 있는 것이 제일 나쁘다.
   ★ 다 받아도 **최소 0.7초는 보여 준다.** 번쩍 지나가면 무엇이 있었는지 모르고,
   빠른 기기에서만 화면이 덜컥거린다. */
const LOAD_MIN = 0.7;
let loadT = 0, loadDone = false;
function loading(dt) {
  if (loadDone) return true;
  loadT += dt;
  const p = LOAD.total ? LOAD.done / LOAD.total : 0;
  $("lFill").style.width = Math.round(p * 100) + "%";
  $("lTxt").textContent = p < 1 ? `뼈를 맞추는 중… ${LOAD.done}/${LOAD.total}`
                                : "준비됨";
  if (p >= 1 && loadT >= LOAD_MIN && LOAD.total > 0) {
    loadDone = true;
    $("loading").classList.add("gone");
    /* 다 사라진 뒤에 치운다 — display:none 을 바로 걸면 사라지는 것이 안 보인다. */
    setTimeout(() => { const el = $("loading"); if (el) el.style.display = "none"; }, 500);
  }
  return loadDone;
}

let townT = 0, battleT = 0;
/* ⑧-f 되짚는 층을 빨리 감는 동안 battle.step 이 이 머리를 직접 부른다.
   바깥(아래 loop)은 제 dt 만 세므로 둘을 합치면 「게임초 ÷ 0.35」로 옳다. */
registerAutoTick(auto);

let last = 0, autoT = 0, hudT = 0;
/* 프레임을 **판이 스스로 잰다** — 밖에서 재면(헤드리스 rAF) 병수님 화면과 무관한 값이
   나온다는 것을 오늘 배웠다. 최근 90프레임에서 **긴 프레임(>28ms)이 셋 중 하나를 넘으면**
   한 번 내려간다. 처음 1.5초는 안 센다(로딩·첫 그림이 늦는 건 렉이 아니다). */
const FR = { gaps: [], long: 0, t0: 0, checked: false, fps: 0, last: 0, n: 0, acc: 0,
  /* ── 여기서부터는 **병수님 기기가 스스로 대답하게** 하는 칸이다. 자 다섯(JS·2D 호출·
     래스터·Commit·레이아웃)이 모두 이 맥에서 「아니다」라고만 말했다 — 그 다음 한 걸음은
     기계를 더 재는 게 아니라 **진짜 기기 한 번**이다(ROADMAP A 항목의 「남은 길」). */
  frames: 0, js: 0, jsWorst: 0,                    // JS 가 태운 시간(프레임 안쪽)
  longAll: 0, worst: 0, worstAt: null,             // 누계 긴 프레임 · 최악 한 장과 그때의 판
  byScene: {},                                     // 어느 화면에서 걸렸나 (마을/던전)
};
/* 걸린 그 순간의 **판**을 적어 둔다 — 「어느 기기·어느 화면에서 걸리나」가 있어야
   무엇을 줄일지 정한다(없으면 또 짐작으로 값을 만진다). */
function scene() {
  return MODE.at === "dungeon"
    ? `던전 ${S.floor}층 · 몸${(S.minions || []).length} 적${(S.mobs || []).length} 시체${S.corpses | 0}`
    : "마을";
}
function watchFrame(t) {
  if (!FR.t0) FR.t0 = t;
  if (FR.last) { const g = t - FR.last;
    FR.acc += g; if (++FR.n >= 30) { FR.fps = Math.round(1000 / (FR.acc / FR.n)); FR.acc = 0; FR.n = 0; }
    if (t - FR.t0 > 1500) {
      FR.warm = true;                              // 여기부터 센다 — JS 몫도 같은 문을 지나야
      FR.gaps.push(g); if (FR.gaps.length > 90) FR.gaps.shift();
      FR.frames++;
      if (g > 28) {
        FR.longAll++;
        const k = MODE.at === "dungeon" ? "던전" : "마을";
        FR.byScene[k] = (FR.byScene[k] || 0) + 1;
        if (g > FR.worst) { FR.worst = g; FR.worstAt = scene(); }
      }
    }
  }
  FR.last = t;
  /* PERF_PINNED = `?perf=` 로 사람이(또는 자가) 못을 박은 판 — 여기서 안 뒤엎는다. */
  if (!FR.checked && !perfLow && !PERF_PINNED && FR.gaps.length >= 90) {
    const long = FR.gaps.filter(g => g > 28).length;
    if (long / FR.gaps.length > 0.33) { setPerfLow(true); FR.checked = true; say(`<b>성능 모드</b> 켜짐 · 화면을 가볍게`); }
    else if (t - FR.t0 > 12000) FR.checked = true;         // 12초 멀쩡했으면 더 안 본다
  }
  if (fpsEl) {
    const pct = FR.frames ? (FR.longAll / FR.frames * 100) : 0;
    fpsEl.textContent = `${FR.fps}fps · 긴프레임 ${pct.toFixed(1)}% · JS ${(FR.frames ? FR.js / FR.frames : 0).toFixed(1)}ms${perfLow ? " · 저" : ""}`;
  }
}
/* 기기가 스스로 낸 **한 장의 보고서**. 프레임 시간과 그중 JS 몫을 같이 적는 것이 핵심이다 —
   둘의 차가 크면 남는 것은 그리기·합성 쪽이고, 그건 코드를 줄여서 될 일이 아니다. */
function perfReport() {
  const fr = FR.frames || 1;
  const avgGap = FR.gaps.length ? FR.gaps.reduce((a, b) => a + b, 0) / FR.gaps.length : 0;
  const sorted = [...FR.gaps].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const scenes = Object.entries(FR.byScene).map(([k, v]) => `${k} ${v}`).join(" · ") || "없음";
  return [
    `[necro 성능] ${new Date().toLocaleString("ko-KR")}`,
    `기기 ${innerWidth}×${innerHeight}·dpr${(devicePixelRatio || 1).toFixed(2)}·코어${navigator.hardwareConcurrency || "?"}${perfLow ? " · 성능모드ON" : ""}`,
    `프레임 ${FR.frames}장 · 최근 평균 ${avgGap.toFixed(1)}ms(${FR.fps}fps) · 상위5% ${p95.toFixed(1)}ms`,
    `긴프레임(>28ms) ${FR.longAll}장 = ${(FR.longAll / fr * 100).toFixed(1)}% · 최악 ${FR.worst.toFixed(0)}ms`,
    `최악의 자리: ${FR.worstAt || "없음"}`,
    `걸린 화면: ${scenes}`,
    `JS 몫 프레임당 ${(FR.js / fr).toFixed(2)}ms (최악 ${FR.jsWorst.toFixed(1)}ms) — 프레임 시간에서 이만큼 빼면 그리기·합성`,
    `지금 자리: ${scene()}`,
  ].join("\n");
}
/* `?fps=1` — 화면 구석에 프레임을 띄운다. **병수님 기기의 숫자를 알아야** 무엇을 줄일지
   정할 수 있는데, 여기서는 그 숫자가 안 나온다.
   ★ 눌러서 **보고서를 복사**한다(폰에서 그대로 붙여 보낼 수 있게). 복사가 막힌 브라우저면
     글을 화면에 띄워 손으로 고를 수 있게 한다 — 못 보내면 잰 보람이 없다. */
let fpsEl = null;
if (qs.get("fps") === "1") {
  fpsEl = document.createElement("div");
  fpsEl.style.cssText = "position:fixed;left:4px;bottom:2px;z-index:99;font:12px monospace;color:#9f8;background:#000a;padding:2px 5px;border:1px solid #9f84;border-radius:3px";
  fpsEl.title = "눌러서 성능 보고서 복사";
  fpsEl.addEventListener("click", async () => {
    const txt = perfReport();
    try { await navigator.clipboard.writeText(txt); say("<b>성능 보고서</b> 복사됨 — 붙여 넣어 보내 주세요"); }
    catch {
      const pre = document.createElement("pre");
      pre.style.cssText = "position:fixed;inset:8% 5%;z-index:100;overflow:auto;white-space:pre-wrap;font:12px monospace;color:#dcd;background:#000e;border:1px solid #9f8;padding:8px;user-select:text;-webkit-user-select:text";
      pre.textContent = txt + "\n\n(눌러서 닫기)";
      pre.addEventListener("click", () => pre.remove());
      document.body.appendChild(pre);
    }
  });
  document.body.appendChild(fpsEl);
}
window.__perfReport = perfReport;                  // 자가 볼 수 있게
/* ══ ★ D-59 · 판을 «되풀이되게» 만드는 창구 셋 — **검수기 전용이고, 안 켜면 한 톨도 안 달라진다.**
   D-58 이 못박은 것: 같은 씨앗이 같은 판을 안 준다(한 씨앗이 13.8%p 까지 갈림 · A/A 바닥 3.80%p).
   벽시계가 판에 스미는 자리가 셋이라 셋을 다 막는다 —
     ① tick 의 dt 수열(`__FIXEDDT`)          ② 자가 «벽시계 200ms»로 표본을 뜨는 것(`__gsampleOn`)
     ③ 죽은 뒤 마을에 머무는 «벽시계 초»(`__AUTORETURN`).
   ①만 막으면 ②③ 이 남아 A/A 바닥이 0 이 안 된다 — 셋이 한 벌이다. */
const FIXEDDT = { n: 0, s: 0 };            // 증인 — 못박은 dt 로 밟은 틱 수와 그 게임초 합
window.__FIXEDDTST = FIXEDDT;
/* 표본을 **판의 초로** 뜬다. 자가 바깥에서 200ms 마다 찍으면 그 시각이 실행마다 어긋나
   같은 판이라도 다른 수가 나온다([[threshold-and-ruler-must-match]]). 판 안에서 뜨면
   `every` 게임초마다 «똑같은 자리»가 찍힌다. 안 켜면 every 가 0 이라 이 함수는 즉시 돌아온다. */
const STOPFLOOR = () => +(globalThis.__STOPFLOOR || 0);
const GS = { every: 0, buf: [], cap: 20000, next: 0, resets: 0 };
window.__GSAMPLE = GS;
window.__gsampleOn = (every = 0.2, cap = 20000) => {
  GS.every = +every || 0.2; GS.cap = cap | 0; GS.buf.length = 0; GS.next = +(S.t || 0); GS.resets = 0;
  return { every: GS.every, cap: GS.cap };
};
window.__gsampleRead = () => GS.buf;
function gsample() {
  if (!GS.every) return;
  const t = +(S.t || 0);
  /* 죽으면 newRun 이 S.t 를 0 으로 되돌린다 — 되돌아간 것을 못 보면 다음 표본까지 수십 초를 건너뛴다. */
  if (t < GS.next - GS.every) { GS.next = t; GS.resets++; }
  while (t + 1e-9 >= GS.next) {
    if (GS.buf.length < GS.cap) {
      const M = S.minions || [];
      let hs = 0; for (const u of M) hs += u.hpMax || 0;
      GS.buf.push({ f: S.floor, at: MODE.at, dead: !!S.dead, n: M.length, mob: (S.mobs || []).length,
                    mhp: +(M.length ? hs / M.length : 0).toFixed(1),
                    hhp: +(S.hp || 0).toFixed(1), hhpMax: +(S.hpMax || 0).toFixed(1), t: +t.toFixed(3) });
    }
    GS.next += GS.every;
  }
}
function loop(t) {
  const j0 = performance.now();
  tick(t);
  const j = performance.now() - j0;
  /* 로딩·첫 그림은 안 센다 — 프레임 수와 **같은 문**을 지나야 나눗셈이 맞는다
     (안 그러면 분자에만 예열이 섞여 JS 몫이 부풀어 보인다). */
  if (FR.warm) { FR.js += j; if (j > FR.jsWorst) FR.jsWorst = j; }
}
function tick(t) {
  watchFrame(t);
  /* ★ D-59 · **못박은 dt**(위 창구 ①). 기본 0 이면 예전 그대로 벽시계를 센다. */
  const fx = +(globalThis.__FIXEDDT || 0);
  const dt = fx > 0 ? fx : Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
  if (fx > 0) { FIXEDDT.n++; FIXEDDT.s += fx; }
  /* 다 받기 전에는 **시간도 멈춘다.** 덮어 놓고 뒤에서 싸움이 진행되면, 걷어냈을 때
     이미 벌어진 판을 보게 된다 — 「시작」이 아니라 「중간부터」가 된다. */
  /* ★ 로딩 중에는 **연출 시간도 멈춘다.** 예전엔 draw(dt) 를 그대로 돌려 모닥불이
     로딩 화면 뒤에서 계속 흔들렸고, 걷히는 순간 이미 한창 떨고 있었다. */
  if (!loading(dt)) { draw(0); requestAnimationFrame(loop); return; }
  if (MODE.at === "dungeon") {
    /* ★ auto() 는 **판의 시간**을 따라야 한다 — 예전엔 이 고리 «밖»에서 벽시계 dt 로만
       셌다. 그래서 배수를 올리면 판만 빨라지고 **머리는 그대로**였다: ×3 은 군세를 셋에
       하나만큼 채우고 ×8 은 여덟에 하나다. 같은 24 게임초인데 ×1 은 한 대도 안 맞고
       ×3 은 죽어서 마을로 갔다(docs/ROADMAP.md J).
       검수기(corpse_probe · loop_health)는 처음부터 0.35 «게임»초마다 불러 왔으니,
       어긋나 있던 것은 자가 아니라 **진짜 판** 쪽이다 — 자를 판에 맞춘 게 아니라
       판을 자에 맞춘다. S.speed 가 1 인 지금 판은 한 톨도 안 달라진다(같은 차례·같은 난수). */
    /* ★ D-59 · 창구 ④ — **판 «안»에서 멈춰 선다.** 자가 바깥에서 「21층에 닿았네」를
       알아채는 데 걸리는 벽시계 초가 실행마다 달라 **재기 시작하는 자리**가 갈렸다.
       여기서 멈추면 그 자리는 언제나 같은 틱이다(자가 __STOPFLOOR 를 0 으로 돌리고 잇는다).
       ★ S.speed 는 «몇 걸음을 한 프레임에 몰아 밟나»일 뿐이라, 걸음의 «차례»는 안 바꾼다 —
         그래서 언제 빨리 감든 판의 자취는 같다. 0 이면 아예 안 밟는다(얼어붙는다). */
    if (STOPFLOOR() && S.floor >= STOPFLOOR()) { S.speed = 0; globalThis.__STOPPED = 1; }
    for (let i = 0; i < S.speed; i++) {
      step(dt);
      if ((autoT += dt) > 0.35) { autoT = 0; auto(); }
      gsample();                     // ★ D-59 · 표본은 «판의 초»로 뜬다(위 창구 ②). 안 켜면 즉시 돌아온다.
    }
    /* 죽으면 **마을로 돌아온다.** 예전엔 그 자리에 멈춰 서서 아무 데도 못 갔다 —
       방치형은 죽는 것이 끝이 아니라 **한 바퀴의 끝**이라야 다시 들어갈 마음이 든다. */
    if (S.dead) {
      META.runs++;
      /* 쓰러진 것과 **스스로 물러난 것**은 다른 말이어야 한다 — 같은 붉은 글이면
         물러난 사람에게도 「졌다」로 읽힌다(battle.js 의 endRun 참조). */
      toTown(LASTRUN.dead === false
        ? `<b style="color:#c8aa6e">물러남</b> — 얻은 것을 지고 마을로`
        : `<b style="color:#8b1a1a">쓰러짐</b> — 마을로 돌아옴`);
      /* 정산 창을 연다 — **closeAll 먼저** 거쳐(상인·상태창과 겹치면 안 된다). */
      closeAll(); drawEnd(); win("winEnd", true);
      /* ★ D-59 · **그 자리에서 바로 다시 내려간다**(위 창구 ③). 예전엔 자가 바깥에서
         「마을에 있네」를 보고 __toDungeon 을 불렀는데, 그 «알아채기까지의 벽시계 초»가
         실행마다 달라 판이 갈렸다. 마을에서는 step 이 안 돌아 판의 시간이 멈춰 있으므로,
         여기서 바로 내려가는 것은 **판으로 보면 같은 일**이다(S.speed 도 newRun 이 안 지운다). */
      if (+(globalThis.__AUTORETURN || 0)) { closeAll(); toDungeon(); }
    }
  }
  draw(dt);
  if ((hudT += dt) > 0.1) { hudT = 0; hud(); }
  requestAnimationFrame(loop);
}

/* **판이 열릴 때 그림을 미리 받아 둔다.** 안 그러면 처음 보는 방향의 공격 프레임이
   그 순간에야 요청되어, 로드될 때까지 idle 자세로 폴백된다 — 그게 병수님이 본
   「타격 시 깜빡임」이었다. 방향이 여덟이라 몸을 틀 때마다 되풀이됐다. */
/* ★ 목록을 **먼저** 받는다 — 몇 장인지 알고 나서 불러야 없는 파일을 안 두드린다.
   못 받아도 preload 는 그대로 돈다(옛 방식으로 되돌아간다). */
await loadManifest();
preload(["char/necro", "minion/skel", "minion/ghoul", "minion/golem",
         "mob/fallen", "mob/shaman", "mob/zombie", "mob/skelarch", "mob/brute", "mob/boss"]);
/* ★ 조명을 걷었으니 **바닥 밝기가 그대로 화면 밝기**다. 던전은 어둡게(1.55),
   마을은 원본이 이미 밝아 오히려 낮춘다(0.72) — 어둠은 조명이 아니라 여기서 만든다. */
loadFloor("assets/floor/crypt_tile.png", 0.95, "crypt");
/* ★ 구역 바닥 둘을 더 굽는다(ROADMAP G-b). 원본 밝기가 제각각이라(crypt 42 · bone 62 ·
   camp 117) boost 로 **화면 밝기를 40~50 에 맞춘다** — 재료가 밝다고 화면까지 밝아지면
   깊은 층이 되레 환해져 「내려간다」가 깨진다. 구역을 가르는 것은 밝기가 아니라
   **무늬와 색 기운**(ZONES.tint)이다. */
/* ★★ V-6: 이 둘은 **밝기가 아니라 색상(hue)** 으로 갈라 놓는다. 4·9·16 층 세 구역이
   전부 색상 20~40°(갈색 띠)에 몰려 있어 이웃 색 거리가 6.6·5.9 밖에 안 됐다 —
   재질은 갈리는데(젖은 흙 · 뼛조각 · 마른 풀) 화면에서는 한 동네로 읽혔다.
   뼈의 회랑은 **채도를 걷어 창백한 찬빛**으로(sat 0.9 → 0.30 · 원본이 색상 20°/채도 0.25
   짜리 «따뜻한» 뼈였다), 잿빛 야영터는 반대로 **채도를 올려 호박빛**으로 민다. */
loadFloor("assets/floor/bone_tile.png", 0.96, "bone", 0.30);  // 창백한 뼛빛 · 화면 52
loadFloor("assets/floor/camp_tile.png", 0.39, "camp", 1.15, 2.16);  // 호박빛 야영터 · 화면 48
/* ★ V-47 — 자가 **옛 바닥으로 되돌려** 같은 판 같은 프레임을 두 번 찍는 문
   (`__CORPSEOLD`·`__BAROLD`·`__GIBOLD` 와 같은 결). 바닥은 캐시에 구워 두므로
   갈아 끼운 뒤 `__gbust` 를 올려 **다시 굽게** 한다(V-4c 가 겪은 그 결).
   ★ `loadFloor` 는 같은 이름이면 **덮지 않고 이어 붙인다**(마을의 풀+흙이 그렇다) —
     그래서 옛 타일은 반드시 **다른 이름**으로 굽는다. 켜지 않으면 받아오지도 않는다.
   ★ **두 번 불러야 한다.** 첫 부름은 굽기를 «시작»만 하고(그림은 비동기로 온다),
     그 사이 캐시 열쇠는 `wanted` 만 바뀐 채 **타일 수가 12 로 같아** 다시 안 구워진다.
     자는 첫 부름 뒤 그림이 오기를 기다렸다가 **한 번 더 부른다**(tools/v47_shot.mjs). */
let campOldBaked = false;
window.__campOld = (on) => {
  if (on && !campOldBaked) {
    loadFloor("assets/floor/camp_tile_old.png", 0.39, "camp_old", 1.15);
    campOldBaked = true;
  }
  useFloor(on ? "camp_old" : "camp", zoneOf(S.floor | 0).tint);
  globalThis.__gbust = (globalThis.__gbust | 0) + 1;
  return on ? "camp_old" : "camp";
};
/* ★★ 구역 바닥 **넉 장**을 더 굽는다(ROADMAP V-5). 여태 일곱 구역이 타일 셋을 **색만
   바꿔** 돌려 썼다 — 색 곱하기는 값싸게 「달라 보이게」 하지만 **무늬는 그대로**라
   4층에서 9층으로 내려가도 발밑의 돌 이음새가 한 톨도 안 바뀐다. 내려가는 맛은
   색이 아니라 **재질**이 낸다.
   ★ 밝기를 고르는 자는 **평균이 아니라 최대채널**이다(V-5 에서 두 번 놓쳤다). 평균은
     RGB(69,5,32) 처럼 **한 채널만 서 있는 색**을 못 본다 — 평균을 맞춰 놓고도 화면에서는
     혼자 새빨갛다. 일곱 구역의 최대채널을 42~55 에 모으고, 채도가 튀는 것은 sat 로 눌렀다. */
/* ★★ V-62 — 다섯째 값은 **대비**다. 밝기를 맞추려 곱한 boost 가 무늬의 높낮이까지
   같이 깎아, camp·sanctum·blood 세 구역이 「무늬 없는 색판」이 돼 있었다(결이 crypt 의
   46%·44%·61%). 축을 **제 평균**에 두고 높낮이만 되돌리므로 화면 밝기는 안 움직인다.
   값은 `node tools/v62_grain.mjs` 로 crypt(=1층, 사람이 「돌바닥으로 읽힌다」고 본 유일한
   자리) 에 맞춘 것이다 — 손으로 고른 수가 아니라 잰 수다. */
loadFloor("assets/floor/rot_tile.png",     0.98, "rot",  0.72); // 썩은 시체 굴 4층
loadFloor("assets/floor/sanctum_tile.png", 0.73, "sanctum", 0.9, 2.25); // 어둠의 성소 26층 · 60 × 0.73 ≈ 44
loadFloor("assets/floor/blood_tile.png",   0.68, "blood", 0.9, 1.63);   // 마른 피의 골 40층
loadFloor("assets/floor/abyss_tile.png",   0.95, "abyss");      // 심연 60층
/* ★ 마을 바닥을 **야영지 마른 풀**로 바꾼다(병수님이 준 D2 로그 야영지 화면).
   갈색 흙 한 가지는 「공터」로 읽혔다 — 마른 풀빛이라야 야영지가 된다.
   원본 평균 110 이라 0.70 을 곱해 70 안팎 — 던전(40~60)보다 밝고 눈이 안 시리다. */
/* ★ 참고 화면은 **밤**이다(밝기 0.25). 우리는 0.37 로 대낮처럼 밝아서 횃불 빛이
   묻혔다 — 불이 조명 노릇을 하려면 바닥이 먼저 어두워야 한다. 0.70 → 0.45. */
/* ★★ 세 번 만에 **초록**이 나왔다. 앞의 둘이 흙만 준 이유는 두 가지였다:
   ① 프롬프트에서 초록을 「마른 풀·카키」로 눌러 적었다(청록이 튈까 봐 막아 온 습관)
   ② 타일 고르기를 **밝기·분산**으로 했더니 두 번 다 흙 칸을 집었다 — 이번엔
      **초록 비율이 제일 높은 칸**을 고른다(100%).
   밝기는 원본 89 에 0.55 를 곱해 참고 화면(0.25)에 맞춘다. */
loadFloor("assets/floor/meadow_tile.png", 0.55, "town");
/* 마을은 **Wang 16장**으로 깐다 — 풀과 흙이 한 바닥에서 섞이고 길 가장자리가
   너덜너덜해진다(위 loadFloor 는 Wang 이 안 뜰 때의 대비책). */
loadWang("assets/floor/meadow2.png", "assets/floor/meadow2_wang.json", 0.55, "town");
/* 검수 훅 — 자가 `__wangRough` 를 껐다 켜며 **같은 판**에서 전/후를 견준다(V-68). */
window.__rebuildWang = () => { const ok = rebuildWang(); globalThis.__gbust = (globalThis.__gbust || 0) + 1; return ok; };
/* ★ 흙 타일을 통째로 갈아 끼우니 **네모 덩어리**로 떴다 — 두 타일은 Wang 전이가
   아니라서 경계가 직각이 된다. 타일은 풀 하나로 두고, 흙은 **얼룩(decal)** 으로
   얹는다 — 얼룩은 알파 모양이라 경계가 원래 너덜너덜하다. */
loadDecor();
loadDecals();                   // 바닥 얼룩 — 격자를 끊는다(js/ground.js)
loadTown();
watch($("xpWrap"), drawBar);
watchPlate($("hudPlate"), $("panel"));   // 구슬~띠~구슬을 한 덩어리로 잇는다
fit(); belt(); newRun(); hud(); markSp();

/* ══ 스킬 트리를 여는 곳 ══ **레벨 옆이다.** 점수가 레벨에서 나오므로 거기가
   제자리이고, 마을이 아니어도 열려야 한다 — 층을 내려가다 레벨이 올랐는데
   마을까지 돌아와야 찍을 수 있으면 그건 벌이다. */
$("hLv").addEventListener("click", () => {
  const on = !$("winTree").classList.contains("on");
  closeAll(); if (on) { drawTree(); win("winTree", true); }
});
/* ══ 상태창을 여는 곳 ══ **이름이다.** 능력치가 나오는 자리가 곧 그 값을 뜯어보는
   입구다(트리가 레벨 옆인 것과 같은 뜻). 마을이 아니어도 열려야 한다 — 층을 내려가다
   주운 것을 보려고 마을까지 돌아오게 하면 그건 벌이다. hLv 와 같이 토글이고 먼저 닫는다. */
/* ══ 나가기 ══ 「여기까지」를 사람이 정할 수 있어야 한다(병수님 2026-08-13).
   묻지 않고 바로 나간다 — **잃는 것이 없으므로**(금·경험치는 이미 들어가 있고
   전리품도 그대로다) 확인 창은 성가심만 는다. 죽음과 같은 길을 지나 정산이 뜬다. */
$("hLeave").addEventListener("click", () => { if (MODE.at === "dungeon") retreat(); });
/* ══ 환생 ══ 마을에서 임계 층을 넘겼을 때만 뜨는 단추 — 누르면 **확인 창**을 연다
   (되돌릴 수 없으므로 바로 실행하지 않는다). */
$("hReborn").addEventListener("click", () => { if (canRebirth()) window.__openWin("reborn"); });
$("hName").addEventListener("click", () => window.__openWin("stat"));
/* 가방 — 능력치와 **같은 한 벌**을 연다(도킹하면 둘이 같이 선다). D2 도 캐릭터와
   인벤토리가 각각 아이콘을 갖되 같은 화면을 이룬다. 좁은 창에서는 가방 쪽만 뜬다. */
$("hBag").addEventListener("click", () => window.__openWin("bag"));
$("hDoctrine").addEventListener("click", () => window.__openWin("doctrine"));
$("hTactic").addEventListener("click", () => window.__openWin("tactic"));
/* 트리를 찍으면 **벨트가 바뀔 수 있다**(구울·골렘이 열린다) — 다시 짓는다. */
document.addEventListener("treeChanged", () => { belt(); hud(); });
/* ★ 자가 **본보기 빌드**로 굴러 들어올 때만 밀린 점을 쓴다(`__AUTO_TREE=1`) —
   사람에겐 0 이라 아무 일도 없다(core.js autoSpend 머리말). */
if (autoSpend()) { belt(); }
toTown();                       // **마을에서 시작한다** — 들어갈지는 사람이 정한다
/* ② 오프라인 진행 — 껐다 켠 사이 쌓인 금·시체를 정산해 마을에서 맞는다. 1분 미만이거나
   옛 저장(lastSeen 없음)·시계 되돌림이면 applyOffline 이 null 을 줘 패널이 안 뜬다. */
window.__lastOffline = applyOffline(Date.now(), bootSeen);
if (window.__lastOffline) { closeAll(); drawOffline(window.__lastOffline); win("winOffline", true); belt(); hud(); }
requestAnimationFrame(loop);

// 자가 안을 들여다볼 수 있게 — 못 보는 것은 못 잰다
Object.assign(window, { syncTest: () => { syncSkills(); drawTree(); belt(); }, S, META, SKILLS, MINIONS, step, cast, newRun, saveMeta, armyCap, auto, spLeft, drawTree, frames, sprite, dirName, footMetrics, MODE, toTown, toDungeon, __townHits: townHits, LOAD, FX_ART, TOUCH_K_DEF });
