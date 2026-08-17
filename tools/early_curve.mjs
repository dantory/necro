/* **처음 몇 분이 얼마나 빠른가** — 새 저장으로 시작해 10초마다 힘을 잰다.
     node tools/early_curve.mjs [분=5] [씨앗들=1,3,7]

   병수님 2026-08-13: "초반인데 너무 강해, 강해지는 속도도 너무 빠르고, 천천히
   조금씩 성장하면서 강해지는 맛이 있어야지".

   loop_health 는 **20분짜리 곡선**을 분 단위로 본다 — 초반 90초가 한 점으로 뭉개진다.
   여기서는 반대로 **처음 5분만** 10초 눈금으로 본다. 재는 것은 「층」 하나가 아니라
   무엇이 먼저 튀는지다:
     · 층 · 레벨 · 군세 — 눈에 보이는 성장
     · 힘비 = (내 한 방 + 소환수 화력) / 그 층 적 체력 — **1 을 크게 넘으면 「너무 강해」**
     · 층당초 — 한 층에 쓰는 시간. 이게 안 늘면 저항이 없는 것이다.

   ★ 씨앗을 박고 rAF 를 끊는다(그 이유는 tools/loop_health.mjs 머리말) — 안 그러면
     같은 코드가 판마다 다른 답을 낸다. auto() 도 손으로 불러야 군대가 선다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const MIN = +(process.argv[2] || 5);
const SEEDS = (process.argv[3] || "1,3,7").split(",").map(Number);
const STEP = 10;                                   // 눈금(판 안의 초)

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));

const rows = [];
for (const SEED of SEEDS) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  /* ★ `__AUTO_TREE` — 자는 **본보기 빌드**로 굴린다(loop_health 에 까닭을 적었다).
     2026-08-18 에 사람 쪽 자동 배분을 없앴으므로 안 켜면 스킬 0 짜리 곡선을 잰다. */
  const seedSrc = `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
     globalThis.__AUTO_TREE = 1;`;
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE });
  await wait(1500);
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });   // **처음부터**
  await S("Page.reload", { ignoreCache: true });
  await wait(4500);
  await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await wait(900);
  await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
  await wait(200);
  await S("Runtime.evaluate", { awaitPromise: true, expression:
    `(async()=>{ const B = await import("/js/battle.js"); ${seedSrc} B.newRun(); return "ok"; })()` });

  const tick = `(async()=>{
    const B = await import("/js/battle.js"), C = await import("/js/core.js");
    const S = window.__S; const n = Math.round(${STEP} / 0.05);
    const R = window.__R || (window.__R = { autoT: 0, deaths: 0, hi: 1, floorT: {}, lastF: 1 });
    for (let i = 0; i < n; i++) {
      try { B.step(0.05); } catch (e) { return JSON.stringify({ 예외: (e + "").slice(0, 140) }); }
      R.floorT[S.floor] = (R.floorT[S.floor] || 0) + 0.05;
      if (S.floor > R.hi) R.hi = S.floor;
      if ((R.autoT += 0.05) > 0.35) { R.autoT = 0; try { window.auto(); } catch {} }
      if (S.dead) { R.deaths++; C.META.runs++; B.newRun(); }
    }
    /* 힘비 — 「이 층 적 하나를 몇 초에 녹이나」가 아니라 **한 방들의 합 / 적 체력**.
       숫자가 아니라 **기울기**를 보려는 것이므로 대략치면 된다. */
    const f = S.floor, ehp = C.floorHp(f);
    const md = S.minions.reduce((a, u) => a + (u.dmg || 0), 0);
    const pd = (window.__NECRO_ATK ? 0 : 0) + (S.pbolt ? S.pbolt.dmg : 0);
    return JSON.stringify({ 층: f, 최고: R.hi, lv: C.META.lv, 군세: S.minions.length,
      금: C.META.gold, 시체: (S.corpses||[]).length, 죽음: R.deaths, 적체력: Math.round(ehp),
      군화력: Math.round(md), 힘비: +((md + pd) / Math.max(1, ehp)).toFixed(2),
      낀것: C.GEAR_KEYS.filter(k=>C.equipped(k)).length,
      층당초: +(Object.entries(R.floorT).filter(([k])=>+k<=R.hi).reduce((a,[,v])=>a+v,0) / Math.max(1,R.hi)).toFixed(1) });
  })()`;

  const pts = [];
  for (let t = STEP; t <= MIN * 60; t += STEP) {
    const r = (await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: tick })).result.value;
    const o = JSON.parse(r);
    if (o.예외) { console.log(`씨앗 ${SEED} ${t}초에 예외: ${o.예외}`); break; }
    pts.push({ 초: t, ...o });
  }
  rows.push({ SEED, pts });
  await raw("Target.closeTarget", { targetId });
}

/* 씨앗 평균으로 한 표 — 낱 씨앗은 표본 하나다([[seed-the-probe]]). */
const n = Math.min(...rows.map(r => r.pts.length));
const avg = (i, k) => +(rows.reduce((a, r) => a + r.pts[i][k], 0) / rows.length).toFixed(2);
console.log(`\n  초   층   최고  Lv  군세  힘비   적체력  군화력  금     낀것  층당초  죽음`);
for (let i = 0; i < n; i++) {
  const p = (k, w) => String(avg(i, k)).padStart(w);
  console.log(`${String(rows[0].pts[i].초).padStart(4)}${p("층",5)}${p("최고",6)}${p("lv",4)}${p("군세",6)}${p("힘비",7)}${p("적체력",8)}${p("군화력",8)}${p("금",7)}${p("낀것",6)}${p("층당초",8)}${p("죽음",6)}`);
}
console.log(`\n씨앗 ${SEEDS.join(",")} · ${MIN}분 · 예외 ${errs.length}`);
bws.close(); process.exit(0);
