/* **초반을 눈으로 본다** — 새 저장으로 1층에 서서 N 초 굴린 판을 찍는다.
     node tools/start_shot.mjs [초=25] [씨앗=3] [out=tmp/start.png]
   자가 통과해도 화면은 딴판일 수 있다([[play-it-before-measuring-it]]). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 25), SEED = +(process.argv[3] || 3), OUT = process.argv[4] || "tmp/start.png";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable");
const knobs = (process.env.NECRO_KNOBS || "").split(";").filter(Boolean)
  .map(kv => { const [k, v] = kv.split("="); return `globalThis.${k.trim()} = ${v.trim()};`; }).join(" ");
const seedSrc = `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
   return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
   globalThis.__AUTO_TREE = 1; ${knobs}`;
await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" }); await wait(900);
/* rAF 는 살려 둔다 — 그려진 화면을 봐야 하니까. 판만 손으로 앞당긴다. */
await S("Runtime.evaluate", { awaitPromise: true, expression:
  `(async()=>{ const B = await import("/js/battle.js"); B.newRun();
     for (let i = 0, a = 0; i < ${Math.round(SEC / 0.05)}; i++) { B.step(0.05);
       if ((a += 0.05) > 0.35) { a = 0; try { window.auto(); } catch {} } }
     return "ok"; })()` });
await wait(600);
const st = (await S("Runtime.evaluate", { returnByValue: true, expression:
  `(async()=>{ const C = await import("/js/core.js"); const S = window.__S;
    return JSON.stringify({ 층:S.floor, 군세:S.minions.length, 상한:C.armyCap(), 적:S.mobs.length,
      체력:Math.round(S.hp)+"/"+Math.round(S.hpMax), 마나:Math.round(S.mp)+"/"+Math.round(S.mpMax) }); })()`,
  awaitPromise: true })).result.value;
const { data } = await S("Page.captureScreenshot", { format: "png" });
const { writeFileSync } = await import("node:fs");
writeFileSync(OUT, Buffer.from(data, "base64"));
console.log(`${OUT} · ${SEC}초 · ${st}`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
