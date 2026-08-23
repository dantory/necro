/* **던전 바닥 소품 밀도 후보를 같은 판에서 찍어 붙인다** (2026-08-24 · V-10)
     node tools/v10_dens_sheet.mjs "1x34" "3x34" "3x48" "3x62"
   `<굴림>x<확률>` 을 넣으면 그만큼 찍어 tmp/v10_sheet.png 로 붙인다.
   값을 식으로 고르지 않는다 — **같은 씨앗·같은 시각으로 찍어 놓고 눈으로 고른다**(W-2 가 쓴 길). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const CASES = (process.argv.slice(2).length ? process.argv.slice(2) : ["1x34", "3x34", "3x48", "3x62"])
  .map(s => { const [r, d] = s.split("x").map(Number); return { r, d, tag: s }; });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl); let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId); const wait = ms => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
/* 씨앗을 박는다 — 한 판은 표본 하나다([[seed-the-probe]]). */
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(5000);
const ev = async e => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { console.log("못 쟀다 — 판 안에서 터졌다: " + (r.exceptionDetails.exception?.description || "").slice(0, 200)); process.exit(2); }
  return r.result.value; };
/* ★ 단추를 글자로 찾지 말 것 — 마을에도 「1층 입구로」 가 있어 **마을에 선 채로** 찍는다
   (08-24 에 넉 장을 다 마을로 찍었다). first_look 과 같은 문을 쓴다. */
await ev(`window.__toDungeon && window.__toDungeon()`);
if (!(await ev(`!!window.__toDungeon`))) { console.log("못 쟀다 — __toDungeon 이 없다"); process.exit(2); }
await wait(12000);
const files = [];
for (const c of CASES) {
  /* 손잡이를 바꾼 뒤 **캐시를 반드시 깬다** — 안 그러면 네 장이 다 같은 그림이다(V-4c). */
  await ev(`globalThis.__SCAT_ROLLS=${c.r}; globalThis.__SCAT_DENS=${c.d}; globalThis.__gbust=(globalThis.__gbust||0)+1;`);
  await wait(600);
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  const f = `tmp/v10_${c.tag}.png`; writeFileSync(f, Buffer.from(data, "base64")); files.push(f); console.log(f);
}
await S("Target.closeTarget", { targetId });
console.log("STITCH " + files.join(" "));
process.exit(0);
