/* **핵심 고리가 어디서 납작해지는가** — 오래 굴려 놓고 1분마다 재서 곡선을 본다.
   지금까지의 검수기는 「한 조각이 맞나」를 봤다(drop/affix/bag/fuse). 이건 그 조각들이
   모여 **몇 분째에 심심해지는지**를 본다 — 방치형에서 제일 중요한 건 그 시각이다.

     node tools/loop_health.mjs [분] [out.json]

   재는 것: 층 · 판수 · 레벨 · 금 · 낀 것 점수합 · 가방 · 합성 · 주운 것/녹인 것 ·
            군세 · 시체. 「무엇이 늘기를 멈추는가」가 곧 다음에 할 일이다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const MIN = +(process.argv[2] || 20);
/* ★ **판을 혼자 쓰게 한다.** 죽거나 잘린 지난 판이 탭을 남기면 그 탭이 계속 돌면서
   같은 렌더러의 프레임을 나눠 먹는다 — 씨앗이 같아도 판이 달라진다(2026-08-12: 한 시간 반
   묵은 탭 다섯 개가 떠 있었고, 같은 코드·같은 씨앗의 최고층이 18.0 → 15.0 으로 갈렸다).
   그래서 **뜨기 전에 남은 판을 쓸고**, 나갈 때는 어떻게 끝나든 내 탭을 닫는다. */
const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
if (stale.length) console.log(`(남아 있던 판 ${stale.length} 개를 닫았다)`);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 160));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
/* 잘려도(SIGTERM·예외) 탭은 두고 가지 않는다 — 비동기 CDP 는 종료 중에 못 쓰므로 curl 로 닫는다. */
{ const { execFileSync } = await import("node:child_process");
  const shut = () => { try { execFileSync("curl", ["-s", `${CDP}/json/close/${targetId}`]); } catch {} };
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(sig, () => { shut(); process.exit(1); });
  process.on("uncaughtException", (e) => { console.error(e); shut(); process.exit(1); }); }
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
/* ★★ **씨앗을 박지 않으면 이 자로는 아무것도 못 가른다.** 같은 코드로 15분을 세 번
   돌렸더니 군대 점유가 34 · 47 · 70 이었다 — 설정을 바꿔 가며 비교하던 폭(58 / 72 / 75)이
   통째로 그 흔들림 안에 들어간다. 실제로 그 잡음을 「회귀」로 읽고 되돌릴 뻔했다.
   게임 코드는 손대지 않고 **페이지가 뜨기 전에** Math.random 을 갈아 끼운다 —
   같은 씨앗이면 같은 판이 나오므로 A/B 가 성립한다.
     LH_SEED=7 node tools/loop_health.mjs 15 */
const SEED = +(process.env.LH_SEED || 1);
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
   ${process.env.LH_OPEN != null ? `globalThis.__OPEN_MUL = ${+process.env.LH_OPEN};` : ""}` });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1500));
/* **처음부터** 시작한다 — 「막 시작한 사람이 몇 분째에 심심해지나」가 알고 싶은 것이다. */
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4500));
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await new Promise(r => setTimeout(r, 900));

/* ★★★ **그리는 고리를 세운다 — 이걸 안 하면 씨앗을 박아도 판이 매번 다르다.**
   2026-08-12 확인: 같은 코드·같은 씨앗 3 으로 다섯 번 돌렸더니 최고층이
   **15 · 15 · 17 · 20 · 16** 이었다(씨앗 9 는 15·15·15·15·17). 그동안 A/B 로
   가른 폭(15.0 / 15.7 / 16.7 / 18.0)이 통째로 이 흔들림 안에 들어간다 —
   「저주가 벽을 15→18 로 밀었다」도 이 잡음 위에서 읽은 숫자였다.
   원인은 씨앗이 아니라 **두 개의 시간**이다. 빨리 감기가 12분을 10초에 밀어 넣는
   동안 페이지의 rAF 고리(main.js loop)가 **벽시계로** 계속 돌면서
     · step(dt) 를 제 몫만큼 더 돌리고
     · auto() 를 제 박자로 또 부르고
     · **같은 씨앗 난수열을 같이 퍼 쓴다**(스트림이 어긋난다)
   기계가 얼마나 빨랐느냐가 판을 바꾼다. 그래서 rAF 를 끊어 **빨리 감기만이
   유일한 시간**이 되게 한다. 죽었을 때 판수를 올리는 것도 그 고리가 하던 일이라
   아래 tick() 이 대신 센다. */
await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
await new Promise(r => setTimeout(r, 200));

/* 끊는 것만으로는 **한 판이 남는다.** 이미 예약된 콜백 하나가 더 돌 수도, 안 돌 수도
   있고(벽시계), 그 한 번이 step 을 돌리고 난수를 한 움큼 퍼 간다 — 씨앗 9 가 세 번 중
   한 번 다른 자리로 간 것이 이것이었다. 그래서 **난수를 다시 심고 판을 새로 연다** —
   여기부터가 진짜 0분이고, 앞의 로딩이 무엇을 하고 갔든 상관없어진다. */
await S("Runtime.evaluate", { awaitPromise: true, expression:
  `(async()=>{ const B = await import("/js/battle.js");
     Math.random = (() => { let s = (${SEED} >>> 0) || 1;
       return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
     B.newRun(); return "ok"; })()` });

/* 판을 **빨리 감는다.** 실제로 20분을 기다리면 20분이 걸린다 — step 을 직접 돌린다.
   ★★ 처음에 step 만 돌렸다가 **군세 0 · 2분에 얼어붙음**이 나왔다. 게임 자체가
   멈춘 줄 알았는데, 자동 소환 auto() 는 battle.step 이 아니라 **main.js 의 그리는
   고리**가 0.35초마다 부른다. 그리기를 안 돌리면 군대가 한 기도 안 선다.
   죽었을 때 다시 내려가는 것도 사람이 누르는 몫이라 여기서 대신 눌러 준다.
   → 검수기가 **게임을 그대로 흉내 내지 않으면 게임을 오진한다.** */
const tick = (sec) => `(async()=>{
  const B = await import("/js/battle.js"), C = await import("/js/core.js");
  const S = window.__S; let n = Math.round(${sec} / 0.05), at = 0, deaths = 0;
  /* 분을 넘어 이어지는 기록 — 죽음은 분 경계와 상관없이 온다 */
  const R = window.__R || (window.__R = { t: 0, ring: [], log: [] });
  /* ── **한 층에 쓰는 시간의 눈금** ──────────────────────────────────────
     힘의 손잡이(머릿수·마중·소환수 화력·적 체력) 여섯을 댔는데 하나도 최고층을 못 밀었다.
     그러면 깊이를 막는 것은 **세기가 아니라 시간**이다. 그런데 지금 자에는 시간 눈금이
     아예 없었다 — 「한 층에 몇 초를 쓰고, 그 초가 어디로 새는가」를 못 봤다.
     0.05 초마다 그 순간의 판을 보고 **네 통**에 나눠 붓는다:
       · 기다림 — 줄(spawnQ)에 남았는데 **판이 비어 있다**. 죽일 것이 없어 그냥 서 있는 시간.
         SPAWN_GAP 0.55~0.95 로 한 마리씩 방울져 나오는 탓에 층마다 박혀 있는 바닥이다.
       · 싸움  — 줄에 남았고 판에도 적이 있다(나오면서 싸우는 중).
       · 뒷정리 — 줄은 비었고 남은 놈만 죽인다. **화력을 키우면 줄어드는 유일한 통.**
       · 되짚기 — 이미 닿아 본 층(S.floor < META.deepest)을 다시 내려오는 시간.
     ★ 이 눈금은 **검수기 안에만** 있다 — 게임 코드를 건드리면 난수 소비가 달라져
       같은 씨앗도 다른 판이 된다(2026-08-12 에 그 함정을 밟았다). 그래서 예전에 잰
       base 숫자와 그대로 견줄 수 있다. */
  const T = R.time || (R.time = { 기다림: 0, 싸움: 0, 뒷정리: 0, 되짚기: 0, 층바뀜: 0, byF: {} });
  for (let i = 0; i < n; i++) {
    try {
      /* 이 0.05 초를 어느 통에 부을지 — **step 전의 판**이 그 동안의 상태다. */
      {
        const f = S.floor, q = (S.spawnQ && S.spawnQ.length) | 0, mb = S.mobs.length;
        const k = f < ((C.META.deepest | 0)) ? "되짚기" : (q > 0 ? (mb === 0 ? "기다림" : "싸움") : "뒷정리");
        T[k] += 0.05;
        const b = T.byF[f] || (T.byF[f] = { 기다림: 0, 싸움: 0, 뒷정리: 0, 되짚기: 0, 든횟수: 0 });
        b[k] += 0.05;
        if (R.lastF !== f) { R.lastF = f; T.층바뀜++; b.든횟수++; }
        /* ── ★ **「아슬아슬」이 있었나** ─────────────────────────────────
           A-2 가 대놓고 요구하는 자이면서, **A-1 이 막힌 자리를 푸는 열쇠**다.
           A-1 첫 축(소환수가 버티는 대수를 깊이와 무관하게 평평하게)은 세 팔 모두
           죽은 층 중앙값을 5 에서 한 톨도 못 옮겼다 — 그 자의 판정 ①이 말하는
           「군대 말고 다른 것이 벽을 서고 있다」이다. 그런데 우리가 여태 잰 것은
           **죽은 순간의 사진**뿐이라, 안 죽은 55분 동안 네크로가 **긁히기라도 했는지**
           를 모른다. 깊은 층에서 닿는 피해가 0 에 가깝다면 소환수 체력을 어떻게
           비틀어도 위험은 안 생긴다(무엇을 고쳐야 하는지가 아예 달라진다).
           그래서 죽음과 무관하게 **늘** 재 둔다:
             · 절반아래/사분아래 — 체력이 그 아래에 머문 초. 빠진횟수는 위→아래 넘음.
             · 반토막 — 이 층에서 가장 컸던 군세의 절반 이하로 주저앉은 횟수(4기 이상일 때만).
             · 띠 — 층을 다섯 구간으로 나눠 **머문 초 대비 받은 피해**를 본다.
           ★ 읽기만 한다 — 게임 상태를 안 건드리므로 난수 소비가 안 달라진다. */
        const V = T.위험 || (T.위험 = { 초: 0, 절반아래: 0, 사분아래: 0, 빠진횟수: 0,
                                        반토막: 0, 최저체력율: 1, 띠: {} });
        const hpm = C.hpMaxOf() || 1, hpr = S.hp / hpm;
        V.초 += 0.05;
        if (hpr < V.최저체력율) V.최저체력율 = hpr;
        if (hpr < 0.5) { V.절반아래 += 0.05; if (!R.below) { R.below = 1; V.빠진횟수++; } }
        else R.below = 0;
        if (hpr < 0.25) V.사분아래 += 0.05;
        /* 군세가 반토막 났나 — 층이 바뀌면 봉우리를 다시 센다(층마다 새로 짓는 군대다). */
        const have0 = C.armyN();
        if (R.peakF !== f) { R.peakF = f; R.peak = have0; R.halved = 0; }
        if (have0 > R.peak) { R.peak = have0; R.halved = 0; }
        if (R.peak >= 4 && have0 * 2 <= R.peak && !R.halved) { R.halved = 1; V.반토막++; }
        const 띠 = f < 10 ? "1-9" : f < 25 ? "10-24" : f < 50 ? "25-49" : f < 100 ? "50-99" : "100+";
        const Z = V.띠[띠] || (V.띠[띠] = { 초: 0, 피해: 0, 피해율: 0, 맞은횟수: 0, 절반아래: 0, 원인: {} });
        Z.초 += 0.05; R.띠 = 띠;
        if (hpr < 0.5) Z.절반아래 += 0.05;
        /* ── ★ **관문의 주인이 수법을 쓸 틈이 있었나** ────────────────────
           A-1 의 답(2026-08-14 07:41)은 「50층 아래로는 네크로에게 **한 대도 안 닿는다**」
           였다. 그리고 닿았던 피해의 정체는 얕은 띠 90% · 25-49층 100% 가 **pool**(장판)
           이다 — 장판만이 소환수 벽을 지나쳐 네크로가 선 자리를 때린다. 그런데 장판을
           까는 것은 **관문 주인 하나**뿐이고(GATELORDS 의 역병술사), 관문은 5층마다
           온다. 50-99층에도 관문이 열 번 있는데 장판이 0 이라면 셋 중 하나다:
             ① 그 띠에 관문이 안 섰다(표식·되짚기로 건너뛰었나)
             ② 주인은 섰는데 **수법을 한 번도 못 쓰고 죽는다**(born 0.8 + cd×0.6 + tell
                = 첫 장판까지 3.3초 — 그 전에 군대가 치우면 관문은 없는 것이나 같다)
             ③ 쓰기는 쓰는데 장판이 네크로에게 안 닿는다(장판은 늘 중앙 r=92 라 닿는다)
           ②를 보려면 **주인이 산 시간**과 **수법이 터진 횟수**를 띠별로 세면 된다.
           ★ 읽기만 한다 — 게임 상태를 안 건드리므로 난수 소비가 안 달라진다(A/B 유지). */
        {
          const Gt = V.관문 || (V.관문 = {});
          const gz = (k) => Gt[k] || (Gt[k] = { 관문: 0, 보스초: 0, 수법: 0, 장판: 0, 못쓰고죽음: 0, 층: [] });
          let boss = null; for (const m of S.mobs) if (m.boss) { boss = m; break; }
          if (boss) {
            if (R.bossRef !== boss) {                 // 새 주인이 섰다(같은 층 재입장도 새로 센다)
              R.bossRef = boss; R.bossFired = 0; R.bossBand = 띠; R.telling = 0;
              const g0 = gz(띠); g0.관문++; if (g0.층.length < 60) g0.층.push(f);
            }
            const g = gz(R.bossBand);
            g.보스초 += 0.05;
            /* 예고가 뜬 순간을 한 번만 센다 — mtell 은 pool·add·curse 의 예고이고
               mstate 는 charge 의 예고/돌진이다(둘 다 「수법이 돈다」는 뜻). */
            if (boss.mtell > 0 || boss.mstate) { if (!R.telling) { R.telling = 1; g.수법++; R.bossFired++; } }
            else R.telling = 0;
          } else if (R.bossRef) {                     // 주인이 죽었다 — 한 번도 못 썼나
            if (!R.bossFired) gz(R.bossBand).못쓰고죽음++;
            R.bossRef = null;
          }
          const pn = (S.pools || []).length;          // 장판이 새로 깔린 수(줄어드는 건 시간 만료)
          if (pn > (R.poolN || 0)) gz(띠).장판 += pn - R.poolN;
          R.poolN = pn;
        }
        /* ── **뒷정리 안을 다시 쪼갠다** ────────────────────────────────
           시간을 어디서 아껴 와도 뒷정리가 그대로 삼켰다(되짚기를 0 으로 만들었더니
           59%→83%). 뒷정리는 「줄이 빈 뒤 남은 놈(거의 관문 주인) 하나를 붙잡고 있는
           시간」이고 깊이를 따라 폭발한다(15층 121초). 그런데 **그 초 안에서 군대가
           실제로 그를 때리고 있었는지**를 아직 못 봤다. 소환수 피해를 두 배로 해도
           최고층이 안 움직였던 이유가 여기 있을 수 있다 — 때리는 시간이 애초에
           짧다면 한 방을 키워도 소용이 없다.
           소환수 **한 기 한 기**를 0.05 초마다 셋으로 가른다(단위: 마리·초):
             · 때림   — 표적이 있고 **사거리 안**이다(battle.js 595 와 같은 자
                        「dist > u.r+tgt.r+4」 를 그대로 쓴다). 실제로 칠 수 있는 시간.
             · 다가감 — 표적은 잡았는데 아직 멀다. 걷는 시간.
             · 놀고   — 표적이 아예 없다(WATCH/BOSS_CALL 밖) — 제자리로 돌아가는 중.
           ★ 여전히 **검수기 안에만** 둔다 — 게임 코드를 건드리면 난수 소비가 달라져
             같은 씨앗도 다른 판이 된다. u.tgtId 는 게임이 이미 적어 두는 값이라 공짜다. */
        if (k === "뒷정리") {
          const P = T.뒷 || (T.뒷 = { 때림: 0, 다가감: 0, 놀고: 0, 마리초: 0, 초: 0, 보스초: 0 });
          P.초 += 0.05;
          const byId = new Map(); for (const m of S.mobs) byId.set(m.id, m);
          if (S.mobs.length === 1 && S.mobs[0].boss) P.보스초 += 0.05;
          for (const u of S.minions) {
            P.마리초 += 0.05;
            const t = u.tgtId ? byId.get(u.tgtId) : null;
            if (!t) { P.놀고 += 0.05; continue; }
            const d = Math.hypot(u.x - t.x, (u.y - t.y) * C.SQUASH_VIEW);
            P[d > u.r + t.r + 4 ? "다가감" : "때림"] += 0.05;
          }
          /* ── **왜 그 군대가 다섯 기뿐인가** ────────────────────────────
             거리·시야 손잡이는 두 번 다 같은 답을 냈다(✗ 구역제 풀기 · ✗ RING_SPAWN
             더 줄이기) — 「놀고」를 줄인 만큼이 그대로 「다가감」이 됐다. 남은 설명은
             **머릿수**다: 뒷정리 동안 서 있는 소환수가 평균 5.3기인데 상한은 17 이다.
             둘레를 다섯으로 덮으니 남은 놈이 어디 있든 누군가는 반대편에서 걸어와야 한다.
             그래서 「자리가 비었을 때 무엇이 막고 있었나」를 통에 나눠 붓는다.
             자동 소환(main.js auto)은 **0.35 초마다 한 기**만 세우고 raise 는 재사용
             1.2 초라, 상한을 다 채우려면 셈으로만 20 초가 걸린다 — 그게 사실인지 본다.
             ★ 여기도 **검수기 안에만** 있다(읽기만 한다) — 난수 소비가 안 달라진다. */
          const A = T.군세 || (T.군세 = { 초: 0, 머릿수합: 0, 상한합: 0, 시체합: 0, 마나율합: 0,
                                          막힘: { 상한참: 0, 시체없음: 0, 마나부족: 0, 재사용: 0, 셀차례: 0 } });
          const cap = C.armyCap(), have = C.armyN();
          A.초 += 0.05; A.머릿수합 += have; A.상한합 += cap; A.시체합 += S.corpses;
          A.마나율합 += S.mp / Math.max(1, C.mpMaxOf());
          if (have >= cap) A.막힘.상한참 += 0.05;
          else {
            const sk = C.SKILLS.find(s => s.id === "raise");
            const 통 = S.corpses < sk.corpse ? "시체없음"
                     : S.mp < C.mpCost(sk)   ? "마나부족"
                     : (S.cd.raise || 0) > 0 ? "재사용"
                     : "셀차례";              /* 셀 수 있는데 안 섰다 = auto 의 0.35 초 박자 */
            A.막힘[통] += 0.05;
          }
        }
      }
      /* ── 누가 본인을 때렸나 ── 팔이 뻗는 칸(pending.core)을 **step 전에** 봐 둔다.
         체력은 step 안에서 그 pending 이 풀리며 깎이므로, 뒤에서 보면 이미 지워져 있다. */
      const hp0 = S.hp; let src = null;
      for (const m of S.mobs) if (m.pending && m.pending.core) (src = src || []).push(m.kind);
      B.step(0.05); R.t += 0.05;
      const d = hp0 - S.hp;
      if (d > 0.001) {
        if (!src) {                                            // 못 잡았으면 제일 가까운 놈으로
          let best = null, bd = 1e9;
          for (const m of S.mobs) { const q = Math.hypot(m.x, m.y); if (q < bd) { bd = q; best = m; } }
          src = [best ? best.kind : "?"];
        }
        R.ring.push({ t: R.t, d: Math.round(d * 10) / 10, from: src });
      }
      while (R.ring.length && R.ring[0] && R.t - R.ring[0].t > 5) R.ring.shift();   // 직전 5초만 남긴다
      /* ── 닿은 피해를 **원인 꼬리표째** 띠에 붓는다 ──────────────────────
         hurtNecro 가 남기는 S.hurtLog {t,cause,dmg} 를 읽는다. ★ **비우면 안 된다** —
         게임이 직전 5초만 남기게 스스로 자르고(battle.js 1010), die() 가 그걸로 사인을
         뽑는다(1284). 그래서 **본 시각까지만 표시**하고 지나간다. 판이 바뀌면 S.t 가
         0 으로 돌아가므로 뒤로 간 것을 보면 표시도 되돌린다. */
      if (S.t < (R.hurtT || 0)) R.hurtT = 0;
      /* ★ **절대값으로 띠끼리 견주면 안 된다**(2026-08-14 60분 곡선에서 밟은 함정).
         깊은 띠 「초당 94만」과 얕은 띠 「초당 2.3」을 나란히 놓고 자가 「피해는 닿고
         있다」고 찍었는데, 그 사이에 **최대체력이 몇 자릿수나 커져 있었다.** 실제로
         절반아래는 0.7% — 닿기는 닿는데 **긁힌 자국**이었다. 그래서 맞은 그 순간의
         최대체력으로 나눈 **체력 비율**을 같이 붓는다. 견주는 것은 이쪽이다. */
      const hpmNow = C.hpMaxOf() || 1;
      for (const e of S.hurtLog || []) {
        if (e.t <= (R.hurtT || 0)) continue;
        const Z = (T.위험 && T.위험.띠[R.띠]); if (!Z) continue;
        Z.피해 += e.dmg; Z.피해율 += e.dmg / hpmNow; Z.맞은횟수++;
        Z.원인[e.cause] = Math.round(((Z.원인[e.cause] || 0) + e.dmg) * 10) / 10;
      }
      R.hurtT = S.t;
      if ((at += 0.05) > 0.35) { at = 0; window.auto(); }     // main.js 의 그리는 고리가 하는 일
      if (S.dead) {
        deaths++;
        /* ── 죽은 자리의 사진 ── newRun 이 판을 지우기 **전에** 찍는다.
           「무엇이 모자라서 죽었나」는 이 네 줄로 갈린다:
             본인 체력(최대체력 대비 층피해) · 군세(군세/상한) · 마나(마나/최대) · 화력(적체력) */
        const from = {}; let took = 0, hits = 0;
        for (const e of R.ring) { took += e.d; hits++;
          for (const k of e.from) from[k] = (from[k] || 0) + e.d / e.from.length; }
        R.log.push({
          층: S.floor, 최대체력: C.hpMaxOf(), 층피해: C.floorDmg(S.floor),
          마나: Math.round(S.mp), 마나최대: C.mpMaxOf(),
          군세: S.minions.length, 상한: C.armyCap(), 시체: S.corpses,
          적: S.mobs.length, 적체력: Math.round(S.mobs.reduce((a, m) => a + Math.max(0, m.hp), 0)),
          "5초피해": Math.round(took), 맞은횟수: hits,
          출처: Object.fromEntries(Object.entries(from).map(([k, v]) => [C.MOB_N[k] || k, Math.round(v)])),
        });
        R.ring.length = 0;
        C.META.runs++;                                         // rAF 를 끊었으므로 판수도 여기서 센다
        B.newRun();                                            // 사람이 「다시」를 누르는 몫
      }
    } catch(e) { return "ERR " + e.message; }
  }
  const sc = (it) => it ? C.scoreOf(it) : 0;
  const eq = ["wand","robe","charm"].map(k => sc(C.equipped(k)));
  return JSON.stringify({
    층: S.floor, 최고층: C.META.deepest, 판수: C.META.runs, 레벨: C.META.lv,
    금: Math.round(C.META.gold),
    낀것점수: Math.round(eq.reduce((a,b)=>a+b,0)), 슬롯: eq.map(Math.round),
    가방: (C.META.bag||[]).length, 군세: S.minions.length, 상한: C.armyCap(),
    시체: S.corpses, 체력: Math.round(S.hp), 이번분죽음: deaths,
    죽음기록: R.log.splice(0),
  });})()`;

const rows = [], deaths = [];
for (let m = 1; m <= MIN; m++) {
  const r = await S("Runtime.evaluate", { expression: tick(60), awaitPromise: true, returnByValue: true });
  const v = r.result.value;
  if (typeof v === "string" && v.startsWith("ERR")) { console.log(m + "분", v); break; }
  const o = JSON.parse(v); o.분 = m;
  for (const d of o.죽음기록 || []) deaths.push({ ...d, 분: m });
  delete o.죽음기록; rows.push(o);
  console.log(`${String(m).padStart(2)}분  층 ${String(o.층).padStart(2)} (최고 ${o.최고층}) · 판 ${o.판수} · Lv ${o.레벨}` +
              ` · 금 ${String(o.금).padStart(6)} · 장비 ${String(o.낀것점수).padStart(4)} [${o.슬롯}]` +
              ` · 가방 ${o.가방} · 군세 ${o.군세}/${o.상한} · 죽음 ${o.이번분죽음}`);
}
/* **어디서 멈췄나** — 마지막 5분 동안 안 자란 것을 이름으로 뱉는다. */
if (rows.length >= 6) {
  const a = rows[rows.length - 6], b = rows[rows.length - 1], flat = [];
  for (const k of ["최고층", "레벨", "낀것점수", "상한"]) if (b[k] <= a[k]) flat.push(k);
  console.log("\n마지막 5분에 **안 자란 것**:", flat.length ? flat.join(" · ") : "없음(전부 자람)");
  console.log("금은", b.금 > a.금 * 1.5 ? "계속 불어남 — 쓸 곳이 모자란지 볼 것" : "완만");
  /* ★ **이 게임에서 제일 중요한 한 줄.** 「직접 안 싸운다」가 전제이므로, 군대가 판에
     서 있지 않으면 다른 게임을 하고 있는 것이다. 25분 재서 평균 점유와 「거의 전멸」인
     분 수를 본다 — 시체 격을 고치기 전엔 평균 48% · 전멸 12/25분이었다(고친 뒤 81% · 1/25). */
  const occ = rows.map(r => r.군세 / Math.max(1, r.상한));
  const low = occ.filter(o => o <= 0.25).length;
  console.log(`군대 점유 평균 ${Math.round(occ.reduce((x,y)=>x+y,0)/occ.length*100)}%` +
              ` · 거의 전멸(25%↓) ${low}/${occ.length}분`);
}
/* ── **왜 그 층에서 멈추나** ──────────────────────────────────────────────
   죽는 자리가 늘 같으면 「더 깊이」가 목표에서 빠진다. 죽은 자리를 전부 모아
   **무엇이 모자랐는지**를 이름으로 말한다 — 짐작이 아니라 죽을 때 찍은 사진에서. */
if (deaths.length) {
  const avg = (f) => deaths.reduce((a, d) => a + f(d), 0) / deaths.length;
  const byFloor = {};
  for (const d of deaths) byFloor[d.층] = (byFloor[d.층] || 0) + 1;
  const top = Object.entries(byFloor).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`\n죽음 ${deaths.length}회 · 자주 죽는 층 ` +
              top.map(([f, n]) => `${f}층×${n}`).join(" · "));
  /* 「몇 대 맞고 죽나」 — 이 값이 3 아래로 내려가면 본인 체력이 벽이다. */
  const 버팀 = avg((d) => d.최대체력 / Math.max(1, d.층피해));
  console.log(`죽을 때 평균  군세 ${Math.round(avg((d) => d.군세 / Math.max(1, d.상한)) * 100)}%` +
              ` · 마나 ${Math.round(avg((d) => d.마나 / Math.max(1, d.마나최대)) * 100)}%` +
              ` · 시체 ${avg((d) => d.시체).toFixed(1)}` +
              ` · 남은 적 ${avg((d) => d.적).toFixed(1)}마리(체력합 ${Math.round(avg((d) => d.적체력))})` +
              ` · 맞고 버팀 ${버팀.toFixed(1)}대`);
  const src = {};
  for (const d of deaths) for (const [k, v] of Object.entries(d.출처 || {})) src[k] = (src[k] || 0) + v;
  const tot = Object.values(src).reduce((a, b) => a + b, 0) || 1;
  console.log("죽기 직전 5초 피해 출처: " +
              Object.entries(src).sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k} ${Math.round(v / tot * 100)}%`).join(" · "));
  /* 한 줄 판정 — 셋 중 **제일 모자란 것**을 지목한다. */
  const 군세 = avg((d) => d.군세 / Math.max(1, d.상한)), 마나 = avg((d) => d.마나 / Math.max(1, d.마나최대));
  const 후보 = [["본인 체력", 버팀 / 5], ["군세", 군세], ["마나", 마나]].sort((a, b) => a[1] - b[1]);
  console.log(`→ 벽은 **${후보[0][0]}** 쪽이 제일 모자람(체력 ${(버팀 / 5).toFixed(2)} · 군세 ${군세.toFixed(2)} · 마나 ${마나.toFixed(2)}, 1.0 이 넉넉함)`);
}
/* ── **시간이 어디로 새는가** ────────────────────────────────────────────
   싸움의 세기로는 벽이 안 밀렸다. 그러면 남은 후보는 시간이다 — 한 층에 몇 초를 쓰고
   그 초가 어느 통으로 가는지 본다. **뒷정리**가 크면 화력이 답이고, **기다림**이 크면
   화력을 아무리 키워도 안 줄어드는 바닥(SPAWN_GAP)이 벽이며, **되짚기**가 크면
   죽어서 다시 내려오는 길이 벽이다. */
let 시간 = null;
try {
  const rt = await S("Runtime.evaluate", { expression: "JSON.stringify((window.__R||{}).time||null)", returnByValue: true });
  시간 = JSON.parse(rt.result.value || "null");
} catch {}
if (시간) {
  const 통 = ["기다림", "싸움", "뒷정리", "되짚기"];
  const tot = 통.reduce((a, k) => a + 시간[k], 0) || 1;
  console.log("\n한 층에 쓰는 시간 — " + 통.map(k => `${k} ${시간[k].toFixed(0)}초(${Math.round(시간[k] / tot * 100)}%)`).join(" · ") +
              ` · 층 든 횟수 ${시간.층바뀜}`);
  /* 새 땅 한 층에 실제로 몇 초가 드나 — 되짚기를 뺀 시간을 「처음 닿은 층 수」로 나눈다. */
  const 새땅 = 시간.기다림 + 시간.싸움 + 시간.뒷정리;
  const 처음 = Object.values(시간.byF).filter(b => b.되짚기 < b.기다림 + b.싸움 + b.뒷정리).length;
  console.log(`새 땅 한 층당 ${(새땅 / Math.max(1, 처음)).toFixed(1)}초` +
              ` (기다림 ${(시간.기다림 / Math.max(1, 처음)).toFixed(1)} · 싸움 ${(시간.싸움 / Math.max(1, 처음)).toFixed(1)} · 뒷정리 ${(시간.뒷정리 / Math.max(1, 처음)).toFixed(1)})`);
  /* **깊이에 비례해 자라는가** — 층마다 한 줄. 방울 바닥이 깊이를 따라 크는지 눈으로 본다. */
  const fs2 = Object.keys(시간.byF).map(Number).sort((a, b) => a - b);
  console.log("층별(초):  " + fs2.map(f => { const b = 시간.byF[f];
    return `${f}층 ${(b.기다림 + b.싸움 + b.뒷정리 + b.되짚기).toFixed(0)}[기${b.기다림.toFixed(0)}/뒤${b.뒷정리.toFixed(0)}]`;
  }).join(" · "));
  const 제일 = 통.map(k => [k, 시간[k]]).sort((a, b) => b[1] - a[1])[0];
  console.log(`→ 제일 큰 조각은 **${제일[0]}** (${Math.round(제일[1] / tot * 100)}%) — 여기부터 손댈 것`);
  /* 뒷정리 안쪽 — **때리는 시간**이 짧으면 한 방을 키워도 소용이 없다. */
  const P = 시간.뒷;
  if (P && P.마리초 > 0) {
    const pc = (v) => `${v.toFixed(0)}마리초(${Math.round(v / P.마리초 * 100)}%)`;
    console.log(`뒷정리 안 — 때림 ${pc(P.때림)} · 다가감 ${pc(P.다가감)} · 놀고 ${pc(P.놀고)}` +
                ` · 그동안 선 군대 평균 ${(P.마리초 / Math.max(0.05, P.초)).toFixed(1)}기` +
                ` · 주인 하나만 남은 시간 ${P.보스초.toFixed(0)}초(${Math.round(P.보스초 / Math.max(0.05, P.초) * 100)}%)`);
    console.log(P.때림 / P.마리초 < 0.5
      ? `→ 뒷정리의 절반 넘게가 **안 때리는 시간**이다 — 한 방을 키워도 안 움직인 이유가 여기다`
      : `→ 군대는 뒷정리 내내 때리고 있다 — 오래 걸리는 것은 **맞는 놈이 안 죽어서**다`);
  }
  /* 뒷정리의 군세 — **자리가 비었을 때 무엇이 막고 있었나.** */
  const A = 시간.군세;
  if (A && A.초 > 0) {
    const s초 = (v) => `${v.toFixed(0)}초(${Math.round(v / A.초 * 100)}%)`;
    console.log(`뒷정리 군세 — 평균 ${(A.머릿수합 / (A.초 / 0.05)).toFixed(1)}기 / 상한 ` +
                `${(A.상한합 / (A.초 / 0.05)).toFixed(1)} · 시체 ${(A.시체합 / (A.초 / 0.05)).toFixed(1)}개 · ` +
                `마나 ${Math.round(A.마나율합 / (A.초 / 0.05) * 100)}%`);
    console.log(`  자리가 빈 채로: 시체없음 ${s초(A.막힘.시체없음)} · 마나부족 ${s초(A.막힘.마나부족)} · ` +
                `재사용대기 ${s초(A.막힘.재사용)} · 셀차례기다림 ${s초(A.막힘.셀차례)} · [꽉참 ${s초(A.막힘.상한참)}]`);
    const 빈 = A.초 - A.막힘.상한참;
    const 큰 = Object.entries(A.막힘).filter(([k]) => k !== "상한참").sort((a, b) => b[1] - a[1])[0];
    console.log(빈 / A.초 < 0.15
      ? `→ 뒷정리 내내 군대는 **거의 꽉 차 있었다** — 머릿수는 뿌리가 아니다`
      : `→ 뒷정리의 ${Math.round(빈 / A.초 * 100)}% 가 **자리가 빈 시간**이고 제일 큰 이유는 **${큰[0]}** 이다`);
  }
  /* ── ★ 「아슬아슬」 ── A-2 의 끝 조건이 여기서 읽힌다(30분에 절반아래 다섯 번 이상).
     그리고 **띠**가 A-1 에 답한다 — 깊은 층에서 닿는 피해가 0 에 가까우면 소환수
     체력을 어떻게 비틀어도 위험은 안 생긴다는 뜻이다(값이 아니라 구조를 고쳐야 한다). */
  const V = 시간.위험;
  if (V && V.초 > 0) {
    const p = (v) => `${v.toFixed(0)}초(${Math.round(v / V.초 * 100)}%)`;
    console.log(`\n아슬아슬 — 체력 절반아래 ${p(V.절반아래)} · 사분아래 ${p(V.사분아래)} · ` +
                `절반 밑으로 빠진 횟수 **${V.빠진횟수}회** · 군세 반토막 ${V.반토막}회 · ` +
                `최저 체력 ${Math.round(V.최저체력율 * 100)}%`);
    const 띠s = ["1-9", "10-24", "25-49", "50-99", "100+"].filter((k) => V.띠[k] && V.띠[k].초 > 0.5);
    for (const k of 띠s) {
      const Z = V.띠[k], 원 = Object.entries(Z.원인).sort((a, b) => b[1] - a[1])
        .map(([c, v]) => `${c} ${Math.round(v)}`).join(" · ") || "없음";
      console.log(`  ${k.padStart(6)}층 · 머문 ${Z.초.toFixed(0)}초 · 받은 피해 ${Math.round(Z.피해)} ` +
                  `(초당 ${(Z.피해 / Z.초).toFixed(1)} · ${Z.맞은횟수}번) · ` +
                  `**초당 최대체력의 ${((Z.피해율 || 0) / Z.초 * 100).toFixed(2)}%** · ` +
                  `절반아래 ${Z.절반아래.toFixed(0)}초 · ${원}`);
    }
    /* 깊은 띠에서 **초당 피해**가 얕은 띠보다 낮으면 그것이 「58분 무사고」의 정체다.
       ★ 머문 시간이 짧은 띠로는 이 말을 하면 안 된다 — 3분 연습에서 10-24층에 **5초**
         머문 것을 두고 「깊어도 피해는 닿는다」는 반대 결론이 나왔다(맞은 횟수 1번).
         한 판은 표본 하나다. **60초 · 20대 이상** 모인 띠만 견준다.
       ★★ 단 **0 대는 얇은 표본이 아니라 그 자체가 답이다.** 처음 이 자를 30분으로 돌렸을 때
         50-99층에 **3018초(누적 50분) 머물러 한 대도 안 맞았는데** 「표본 얇음」으로 깔고
         뭉갤 뻔했다 — 오래 머물렀는데 0 이면 그것이 제일 강한 신호다(A-1 의 답이 거기 있었다).
         그래서 「60초 이상 머물렀고, (20대 이상 맞았거나 **아예 0 대**)」를 넉넉으로 본다. */
    /* ── ★ 관문의 주인 ── 「깊은 층에 장판이 없다」의 정체를 여기서 읽는다.
       한 번에 산 시간이 **첫 수법까지 걸리는 3.3초**(born 0.8 + cd×0.6 1.7 + tell 0.8)
       아래면 관문은 **서기만 하고 없는 것**이다 — 그러면 A-1 은 「위험을 키우는」 문제가
       아니라 「위험이 화면에 나오기도 전에 치워지는」 문제다. */
    const Gt = V.관문;
    if (Gt) {
      console.log("  ── 관문의 주인 ──");
      for (const k of ["1-9", "10-24", "25-49", "50-99", "100+"]) {
        const g = Gt[k]; if (!g || !g.관문) continue;
        console.log(`  ${k.padStart(6)}층 · 관문 ${g.관문}번 · 주인이 산 시간 ${g.보스초.toFixed(0)}초` +
                    ` (한 번에 ${(g.보스초 / g.관문).toFixed(1)}초) · 수법 ${g.수법}번` +
                    ` (관문당 ${(g.수법 / g.관문).toFixed(1)}) · 장판 ${g.장판}장` +
                    ` · **한 번도 못 쓰고 죽은 관문 ${g.못쓰고죽음}/${g.관문}번**`);
      }
      const 깊g = Gt["50-99"], 얕g = Gt["1-9"];
      if (깊g && 깊g.관문 >= 3) {
        const 산 = 깊g.보스초 / 깊g.관문;
        console.log(산 < 3.3
          ? `→ 깊은 관문의 주인은 한 번에 **${산.toFixed(1)}초**밖에 못 산다(첫 수법까지 3.3초 필요)` +
            ` — 50층 아래 장판이 0 인 이유는 **주인이 수법을 쓰기 전에 치워지기 때문**이다`
          : `→ 깊은 관문의 주인은 ${산.toFixed(1)}초를 살고 수법을 관문당 ${(깊g.수법 / 깊g.관문).toFixed(1)}번 쓴다` +
            ` — 수법은 도는데 안 닿는 것이니 **닿는 자리**(장판 반경·네크로 위치) 쪽을 볼 것`);
        if (얕g && 얕g.관문) console.log(`   (얕은 관문은 한 번에 ${(얕g.보스초 / 얕g.관문).toFixed(1)}초 · 관문당 수법 ${(얕g.수법 / 얕g.관문).toFixed(1)}번)`);
      } else if (깊g == null) {
        console.log(`→ 50-99층 띠에 **관문이 한 번도 안 섰다** — 장판 이전에 관문 자체가 없는 것이니 그 자리부터 볼 것`);
      }
    }
    const 넉넉 = (Z) => Z && Z.초 >= 60 && (Z.맞은횟수 >= 20 || Z.피해 === 0);
    const 깊띠 = [...띠s].reverse().find((k) => k !== "1-9" && 넉넉(V.띠[k]));
    const 얕 = V.띠["1-9"], 깊 = 깊띠 ? V.띠[깊띠] : null;
    if (!깊) console.log(`→ 깊은 띠에 **견줄 만큼 안 머물렀다**(60초·20대 필요) — 이 판으로는 A-1 을 판정하지 말 것`);
    if (넉넉(얕) && 깊) {
      /* ★ 견주는 것은 **체력 비율**이다(절대 피해가 아니다 — 위 hurtLog 주석 참고). */
      const a = (얕.피해율 || 0) / 얕.초 * 100, b = (깊.피해율 || 0) / 깊.초 * 100;
      console.log(b < a * 0.5
        ? `→ 깊은 띠(${깊띠})에서 닿는 것이 **초당 최대체력의 ${b.toFixed(2)}% 로 얕은 띠(${a.toFixed(2)}%)의 ` +
          `${Math.round(b / Math.max(1e-9, a) * 100)}%** 다 — 절대 피해가 커 보여도 **긁힌 자국**이다(구조를 고칠 것)`
        : `→ 깊은 띠에서도 초당 최대체력의 ${b.toFixed(2)}%(얕은 띠 ${a.toFixed(2)}%)가 깎인다 — 닿는 양은 충분하니 **다른 자리**를 볼 것`);
      /* 체력의 몇 %가 깎이는지가 「몇 초 맞으면 죽나」다 — 100 을 그 값으로 나눈다. */
      if (b > 0) console.log(`   (깊은 띠에서 손 놓고 맞기만 하면 죽는 데 **${(100 / b).toFixed(0)}초** — 얕은 띠는 ${a > 0 ? (100 / a).toFixed(0) + "초" : "—"})`);
    }
    if (V.절반아래 < V.초 * 0.02)
      console.log(`→ 체력이 절반 아래인 시간이 전체의 ${(V.절반아래 / V.초 * 100).toFixed(1)}% 뿐이다 — A-2 의 「아슬아슬」은 화면에 **없다**`);
  }
}
fs.writeFileSync(process.argv[3] || "/tmp/loop_health.json", JSON.stringify({ rows, deaths, 시간 }, null, 1));
console.log("errors:", errs.slice(0, 3), "netfail:", netfail.slice(0, 3));
await raw("Target.closeTarget", { targetId }); bws.close();
