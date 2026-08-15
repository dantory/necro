/* **적이 실제로 닿아 있는가** — 「못 다가온다」는 깊이나 피해로는 안 잡힌다.
     REACH_K=0.8 node tools/reach_probe.mjs [초] [층]

   병수님 2026-08-15: "겹치기를 허용안하니까 너무 적군이 못다가오는듯". 닿을 거리가
   (a.r+b.r)×K 라 K=1 이면 몸이 어깨를 맞대고 서고, 앞줄이 자리를 다 먹으면 뒷줄은
   영영 못 붙는다. loop_health 의 「맞은횟수」는 **네크로가 맞은 것**이라 이걸 못 본다.

   0.1초마다 판을 보고, 적마다 제일 가까운 아군(소환수·네크로)까지의 **화면 거리**를
   닿을 거리로 나눈다(1.0 = 딱 붙음). 셋을 낸다:
     · 닿은비율 — 1.05 안쪽에 있는 적의 비율(때릴 수 있는 자리에 선 놈)
     · 틈중앙   — 그 비(比)의 중앙값. 1 을 크게 넘으면 둘러싸고도 못 붙는 것이다
     · 헛걸음   — 걷고 있는데 닿지도 못한 적의 비율 */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 40), FLOOR = +(process.argv[3] || 12);
const K = process.env.REACH_K != null ? +process.env.REACH_K : null;
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
if (K != null) await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__TOUCH_K = ${K};` });
await ev2(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:20,deepest:${FLOOR + 4},runs:3,up:{hp:3,mp:4,dmg:2,army:3},equip:{},bag:[],tree:{bone:2,armor:3,ghoul:1,legion:3,golem:1,rot:1,harvest:1}}))`);
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4500));
await ev2(`window.toDungeon && window.toDungeon()`);
await new Promise(r => setTimeout(r, 700));
await ev2(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
await new Promise(r => setTimeout(r, 2000));
/* ★ 층이 넘어가면 판이 비어 표본이 끊긴다 — 같은 층에 **묶어 두고** 잰다
   (깊이는 여기서 볼 것이 아니다. 그건 loop_health 가 본다). */
await ev2(`window.__REACH = setInterval(() => { if (window.S && S.floor !== ${FLOOR}) { (async()=>{
   const B = await import("/js/battle.js"); B.enterFloor(${FLOOR}); })(); } }, 300);`);
const out = await ev2(`(async () => {
  const B = await import("/js/battle.js"), C = await import("/js/core.js");
  const SQ = C.SQUASH_VIEW, K = (globalThis.__TOUCH_K != null ? +globalThis.__TOUCH_K : 1);
  const ratios = []; let near = 0, seen = 0, walking = 0, farWalk = 0;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < ${Math.round(SEC * 10)}; i++) {
    await sleep(100);
    const mobs = S.mobs || [], allies = (S.minions || []).concat([{ x: 0, y: 0, r: C.CORE_R || 30 }]);
    for (const m of mobs) {
      let best = Infinity;
      for (const a of allies) {
        /* ★★ **K 로 나누면 안 된다.** 처음에 그렇게 했더니 K 를 내릴수록 분모가 같이
           줄어 「닿은비율」이 되레 떨어졌다 — 자가 **재는 대상으로 자기 눈금을 만든** 것이다.
           팔끼리 견주려면 눈금이 고정이어야 한다: 언제나 **어깨 거리(K=1)**로 나눈다. */
        const d = Math.hypot(m.x - a.x, (m.y - a.y) * SQ) / ((m.r || 20) + (a.r || 20));
        if (d < best) best = d;
      }
      if (!isFinite(best)) continue;
      seen++; ratios.push(best);
      if (best <= 1.05) near++;
      if (m.moving > 0) { walking++; if (best > 1.05) farWalk++; }
    }
  }
  clearInterval(window.__REACH);
  ratios.sort((a, b) => a - b);
  return { 표본: seen, 닿은비율: seen ? +(near / seen * 100).toFixed(1) : 0,
           틈중앙: ratios.length ? +ratios[Math.floor(ratios.length / 2)].toFixed(2) : null,
           헛걸음: walking ? +(farWalk / walking * 100).toFixed(1) : 0, K };
})()`, true);
console.log(JSON.stringify({ 층: FLOOR, ...out, 콘솔오류: errs }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
