/* **군세가 꽉 찼을 때 겹치는가** — 겹침은 소환수가 두엇일 땐 절대 안 보인다.
   진(RING_HOLD)을 넓힌 것이 실제로 자리를 만들었는지는 **자리가 모자란 상태**,
   곧 군세 상한까지 채운 판에서만 드러난다.

     node tools/pack_probe.mjs [초] [층]

   ★★★ **이제 세 무리를 따로 잰다.** 아침에는 아군(army)만 쟀고 적은 한 번도 안 쟀다 —
   50층에서 적 열한 마리가 오른쪽 아래에 몰려 겹친 사진이 나왔는데, 자가 적을 안 봤으니
   「코드가 적을 뺐다」가 아니라 **자가 적을 안 쟀다**가 사실이었다. 세 무리:
     ① army — 아군끼리 (아래 「진(home)」 판정. 지금 것 그대로, 판정 기준도 그대로).
     ② foe  — **적끼리** (S.mobs × S.mobs). **이쪽이 이제 통과/실패를 가른다.**
     ③ mix  — 적 × 아군 (참고값).

   ★★ 재는 자리가 둘인데 **뜻이 다르다.**
   ① **진(home)** — 적이 없을 때 전원이 서는 자리. 이건 기하라 판이 달라도 값이 안 흔들린다.
      → **아군 판정은 이쪽으로 한다.**
   ② **싸우는 중** — 표적을 쫓느라 흩어진다. 참고만.
   ★ **적은 「진」이 없다** — 쫓아오는 몸이라 제자리가 없다. 그래서 적은 **싸우는 중 실제
     위치**로 재되, 한 순간의 최솟값(스칠 수도 있다) 말고 **파고든 프레임의 비율**
     (bodyRatio<1 인 쌍이 하나라도 있던 프레임 수 / 잰 프레임 수)을 같이 낸다 —
     **얼마나 오래 겹쳐 있었나**가 병수님이 본 사진에 가깝다.

   ★ 화면으로 되돌리는 자: 위치는 `x*sc`, `y*sc*squash` 다. **us 는 위치에 안 곱한다** —
     us 는 그림 키에만 붙는다(아군 `u.h*us`, 적 `m.h*us`). 적의 아트 키는 `"mob/"+m.kind`,
     키는 `m.h`(그림에선 `(m.h||48)*us`). 종 그림을 못 재면 아군과 같은 기본값(0.5)으로
     떨어지되 그 사실을 `foe.metricsMissing:true` 로 적는다.

   ★ **깊은 층에서 잰다.** 사진은 50층이다. 층을 인자로 받아 hp_probe 처럼 그 층의 정상
     스폰 경로(enterFloor)를 돌린다 — 몹을 손으로 놓지 않는다. 층 0(기본)이면 자연 진행.
   ★ **씨앗을 박는다.** loop_health 의 결정론 RNG 주입을 그대로 가져와 씨앗 셋(1·2·3)으로
     돌리고 씨앗별 값과 중앙값을 낸다. 한 판은 표본 하나다.
   ★ **표본 0쌍(적 2마리 미만)은 통과가 아니라 무효다** — foe INVALID → exit 2. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 60);
const FLOOR = +(process.argv[3] || 0);        // 0 = 자연 진행(1층부터)
const SEEDS = [1, 2, 3];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length;
  return !n ? null : n % 2 ? s[(n - 1) / 2] : +(((s[n / 2 - 1] + s[n / 2]) / 2)).toFixed(3); };

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown")
    errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?");
});
await new Promise(r => bws.addEventListener("open", r));

/* ★ 씨앗은 **페이지가 뜨기 전에** 심는다 — 게임 코드는 손 안 대고 Math.random 만 간다.
   같은 씨앗이면 같은 판이라 씨앗별 비교가 성립한다(loop_health 46행과 같은 식). */
const seedSrc = (seed) =>
  `Math.random = (() => { let s = (${seed} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

const waitLoad = `new Promise(r => { const w = () => (window.LOAD && window.LOAD.done) ? r(1) : setTimeout(w, 200); w(); })`;

/* 한 씨앗의 측정식 — 씨앗을 다시 심고(빨리 감기가 유일한 시간이 되게 rAF 는 밖에서 끊는다)
   판을 새로 연 뒤 그 층으로 내려가 SEC 초를 빨리 감으며 세 무리를 잰다. */
const measure = (seed, floor, sec) => `(async()=>{
  const BAT = await import("/js/battle.js");
  /* rAF 를 끊었으므로 이 재-심기 이후가 진짜 0분 — 로딩이 퍼 간 난수와 무관해진다 */
  Math.random = (() => { let s = (${seed} >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  BAT.newRun();
  ${floor ? `BAT.enterFloor(${floor});` : ``}

  const G = window.__geo, mm = {};
  const met = (u) => (mm[u.id] || (mm[u.id] = window.footMetrics(u.art || ("minion/" + u.kind)) || null));
  const hOf = (u) => (u.h || 40) * G.us;
  /* 적 그림값은 종마다 한 번만 — 못 재면 null 로 두고 foeMiss 를 켠다(기본값 0.5 로 떨어진다) */
  const mmM = {}; let foeMiss = false;
  const metM = (m) => { const k = "mob/" + m.kind;
    if (!(k in mmM)) mmM[k] = window.footMetrics(k) || null;
    if (!mmM[k]) foeMiss = true; return mmM[k]; };
  const hMob = (m) => (m.h || 48) * G.us;
  const bwf = (mt) => mt ? mt.bodyWidthFrac : 0.5;
  /* 화면 픽셀 간격 — us 는 위치에 안 붙는다 */
  const gapPx = (ax, ay, bx, by) => ({ dx: Math.abs(ax - bx) * G.sc,
                                       dy: Math.abs(ay - by) * G.sc * G.squash });

  let peak = 0, liveBody = 1e9, liveTall = 1e9, pairs = 0;
  let homeBody = 1e9, homeTall = 1e9, homePairs = 0, homeAtN = 0;
  /* ── 적끼리(foe) ── 진이 없다 → 실제 위치로 매 프레임 */
  let foeBody = 1e9, foeMeas = 0, foePenet = 0, foePairs = 0, foePeak = 0;
  /* ── 적×아군(mix) 참고 ── */
  let mixBody = 1e9, mixPairs = 0;
  let floorStart = window.S.floor, floorEnd = window.S.floor, deaths = 0;

  for (let i = 0; i < ${sec} * 60; i++) {
    BAT.step(1 / 60);
    /* 죽으면 사람이 「다시」를 누르는 몫 — 다시 그 층으로 내려가 계속 잰다 */
    if (window.S.dead) { deaths++; BAT.newRun(); ${floor ? `BAT.enterFloor(${floor});` : ``} continue; }
    /* ★ 소환은 **그리는 고리**가 0.35초마다 auto() 를 불러 일어난다. 빨리 감을 때
       이걸 안 부르면 군대가 한 기도 안 선다(예전엔 0쌍이 PASS 로 새어 나갔다). */
    if (i % 21 === 0) window.auto();
    floorEnd = window.S.floor;
    const U = window.S.minions, M = window.S.mobs;
    if (U.length > peak) peak = U.length;
    if (M.length > foePeak) foePeak = M.length;

    /* ── ① 진(home) — 지금 살아 있는 전원이 **제 자리에 섰다면** 어떻게 되는가 (원본 그대로) */
    if (U.length >= peak && U.length > homeAtN) {
      homeAtN = U.length; homeBody = 1e9; homeTall = 1e9; homePairs = 0;
      for (let a = 0; a < U.length; a++) for (let b = a + 1; b < U.length; b++) {
        const A = U[a], B = U[b];
        const ax = Math.cos(A.home) * A.rad, ay = Math.sin(A.home) * A.rad;
        const bx = Math.cos(B.home) * B.rad, by = Math.sin(B.home) * B.rad;
        const g = gapPx(ax, ay, bx, by), hA = hOf(A), hB = hOf(B);
        const bw = (bwf(met(A)) * hA + bwf(met(B)) * hB) / 2;
        const tall = (hA + hB) / 2;
        const d = Math.hypot(g.dx, g.dy);
        if (d / bw < homeBody) homeBody = d / bw;
        if (g.dx < bw && g.dy / tall < homeTall) homeTall = g.dy / tall;
        homePairs++;
      }
    }

    /* ── ② 적끼리(foe) — 매 프레임, 실제 위치. 최솟값 + 파고든 프레임 비율 */
    if (M.length >= 2) {
      foeMeas++; let penetFrame = false;
      for (let a = 0; a < M.length; a++) for (let b = a + 1; b < M.length; b++) {
        const A = M[a], B = M[b];
        const g = gapPx(A.x, A.y, B.x, B.y), hA = hMob(A), hB = hMob(B);
        const bw = (bwf(metM(A)) * hA + bwf(metM(B)) * hB) / 2;
        const d = Math.hypot(g.dx, g.dy), br = d / bw;
        if (br < foeBody) foeBody = br;
        /* ★ 「파고들었다」의 금은 **허용치(TOUCH_K)** 다. 예전엔 1 로 박혀 있었는데,
           2026-08-15 에 겹침을 얼마쯤 허용하기로 하면서(적이 못 다가오던 문제) 그 금이
           낡았다 — 그대로 두면 **의도한 겹침을 결함으로 운다.** 판이 쓰는 값을 그대로 쓴다. */
        const LINE = (globalThis.__TOUCH_K != null ? +globalThis.__TOUCH_K : (window.TOUCH_K_DEF ?? 0.8));
        if (br < LINE) penetFrame = true;
        foePairs++;
      }
      if (penetFrame) foePenet++;
    }

    /* ── ③ 적×아군(mix) 참고 — 원본 「싸우는 중」과 같은 6프레임 박자 */
    if (i % 6 === 0 && U.length && M.length) {
      for (const u of U) for (const m of M) {
        const g = gapPx(u.x, u.y, m.x, m.y);
        const bw = (bwf(met(u)) * hOf(u) + bwf(metM(m)) * hMob(m)) / 2;
        const d = Math.hypot(g.dx, g.dy), br = d / bw;
        if (br < mixBody) mixBody = br;
        mixPairs++;
      }
    }

    /* ── 아군 싸우는 중(참고) — 원본 그대로, i%6 */
    if (i % 6) continue;
    for (let a = 0; a < U.length; a++) for (let b = a + 1; b < U.length; b++) {
      const A = U[a], B = U[b];
      const g = gapPx(A.x, A.y, B.x, B.y), hA = hOf(A), hB = hOf(B);
      const bw = (bwf(met(A)) * hA + bwf(met(B)) * hB) / 2;
      const tall = (hA + hB) / 2;
      const d = Math.hypot(g.dx, g.dy);
      if (d / bw < liveBody) liveBody = d / bw;
      if (g.dx < bw && g.dy / tall < liveTall) liveTall = g.dy / tall;
      pairs++;
    }
  }
  const f = (v) => v === 1e9 ? null : +v.toFixed(3);
  return JSON.stringify({ seed: ${seed}, floorStart, floorEnd, deaths,
    peak, cap: window.armyCap(), alive: window.S.minions.length,
    army: { n: homeAtN, pairs: homePairs, bodyRatio: f(homeBody), tallRatio: f(homeTall) },
    armyLive: { pairs, bodyRatio: f(liveBody), tallRatio: f(liveTall) },
    foe: { mobsPeak: foePeak, measFrames: foeMeas, pairs: foePairs,
           bodyRatio: f(foeBody), penetFrames: foePenet,
           penetRatio: foeMeas ? +(foePenet / foeMeas).toFixed(3) : null, metricsMissing: foeMiss },
    mix: { pairs: mixPairs, bodyRatio: f(mixBody) } });
})()`;

async function runSeed(seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
  await S("Page.navigate", { url: PAGE });
  await sleep(2000);
  await S("Runtime.evaluate", { awaitPromise: true, expression: waitLoad });
  /* **처음부터** 시작한다 — 저장된 강화가 판을 흔들면 씨앗이 같아도 판이 달라진다 */
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await S("Page.reload", { ignoreCache: true });
  await sleep(2500);
  await S("Runtime.evaluate", { awaitPromise: true, expression: waitLoad });
  await S("Runtime.evaluate", { expression: `window.__toDungeon && window.__toDungeon()` });
  await sleep(600);
  /* 빨리 감기만이 유일한 시간이 되게 rAF 를 끊는다 — 벽시계 고리가 같은 난수열을 같이
     퍼 쓰면 씨앗을 박아도 판이 매번 다르다(loop_health 71행과 같은 이유). */
  await S("Runtime.evaluate", { expression: `window.requestAnimationFrame = () => 0` });
  await sleep(200);
  const r = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: measure(seed, FLOOR, SEC) });
  const out = JSON.parse(r.result.value);
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return out;
}

const results = [];
for (const seed of SEEDS) {
  const o = await runSeed(seed);
  results.push(o);
  const pr = o.foe.penetRatio != null ? `${Math.round(o.foe.penetRatio * 100)}%` : "-";
  console.log(`씨앗 ${o.seed}  층 ${o.floorStart}→${o.floorEnd}` +
    ` · 적peak ${o.foe.mobsPeak} · foe 몸 ${o.foe.bodyRatio} · 파고든프레임 ${pr}(${o.foe.penetFrames}/${o.foe.measFrames})` +
    ` · foe쌍 ${o.foe.pairs} · mix 몸 ${o.mix.bodyRatio} · army 몸(진) ${o.army.bodyRatio}(${o.army.n}기)`);
}

/* ★ 표본이 없으면 통과가 아니라 무효다 — 적이 두 마리 미만이면 잰 쌍이 없다. */
const validFoe = results.filter(o => o.foe.mobsPeak >= 2 && o.foe.bodyRatio != null);
const foeBodyMed = median(validFoe.map(o => o.foe.bodyRatio));
const foePenetMed = median(validFoe.map(o => o.foe.penetRatio).filter(v => v != null));
const armyBodyMed = median(results.map(o => o.army.bodyRatio).filter(v => v != null));

console.log("\n" + JSON.stringify({
  floor: FLOOR, sec: SEC, seeds: SEEDS,
  perSeed: results.map(o => ({ seed: o.seed, floor: [o.floorStart, o.floorEnd],
    foe: o.foe, mix: o.mix, army: o.army })),
  median: { foeBody: foeBodyMed, foePenetRatio: foePenetMed, armyBody: armyBodyMed },
}, null, 2));
console.log("errors:", errs.slice(0, 3));

if (!validFoe.length) {
  console.log("INVALID 적 2마리 미만 — 잰 쌍이 없다(층을 세웠는지·spawn 이 도는지 보라)");
  process.exitCode = 2;
} else {
  /* ★★ **판정은 몸(bodyRatio) 중앙값으로만 한다.** foe 는 진이 없으니 싸우는 중 실제
     위치의 최솟값을 씨앗별로 내고 그 중앙값을 본다 — 1 이상이면 어느 순간에도 안 파고든 것. */
  const ok = foeBodyMed >= 1;
  console.log(`\nfoe 몸 중앙값 ${foeBodyMed}${ok ? " ≥1 안 파고든다" : " <1 파고든다"}` +
    ` · 파고든 프레임 중앙값 ${foePenetMed != null ? Math.round(foePenetMed * 100) + "%" : "-"}` +
    ` · (참고) army 진 몸 중앙값 ${armyBodyMed}`);
  console.log(ok ? "PASS" : "FAIL 적끼리 겹친다");
  if (!ok) process.exitCode = 1;
}
await bws.close();
