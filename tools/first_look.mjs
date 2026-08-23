/* **처음 켠 사람이 보는 것을 그대로 찍는다** (2026-08-23 · 병수님 「초반 인상이 중요하다」)
     node tools/first_look.mjs
   저장을 지우고 새로 시작해서 ① 첫 화면 ② 마을 ③ 1층 진입 ④ 15초 ⑤ 40초 를 찍는다.
   숫자를 재는 것이 아니라 **눈으로 볼 그림**을 모으는 것이 목적이다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const shot = async (name) => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/first_${name}.png`, Buffer.from(data, "base64")); console.log(`tmp/first_${name}.png`); };
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true });
await wait(900);  await shot("1_loading");     // ① 켜자마자
await wait(4000); await shot("2_town");        // ② 마을(처음 서는 곳)
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(1200); await shot("3_floor1");      // ③ 1층 들어선 순간
await wait(14000); await shot("4_15s");        // ④ 15초
await wait(25000); await shot("5_40s");        // ⑤ 40초
const st = (await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression:
  `(async()=>{ const C = await import("/js/core.js"); const S = window.__S;
    return JSON.stringify({ 층:S.floor, 군세:S.minions.length+"/"+C.armyCap(), 적:S.mobs.length,
      시체:S.corpses, 바닥에떨어진것:(S.drops||[]).length, 가방:C.META.bag.length, 레벨:C.META.lv }); })()` })).result.value;
console.log(st, `· 콘솔오류 ${errs.length}`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
