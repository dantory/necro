/* **지고 내려온 시체가 판에 눕는가** (V-43b) — 켜서 찍는다.
     node tools/v43b_shot.mjs
   V-43 을 닫고 재니 셈 116 대 그림 19 였다 — 창고 몫은 `addCorpse` 를 안 거쳐
   `S.piles` 에 한 장도 안 눕는다. `layCarried` 를 넣고, **판이 열리는 첫 프레임**을
   찍어 「셈이 말하는 수만큼 바닥에 누워 있는가」를 눈으로 본다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const ev = async (expression) => (await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
const shot = async name => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v43b_${name}.png`, Buffer.from(data, "base64")); console.log(`tmp/v43b_${name}.png`); };
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(3500);
/* 다섯 시간 논 사람 — 창고가 한 짐(140) 꽉 찬 상태로 내려간다 */
await ev(`(async()=>{ const C = await import("/js/core.js"); const M = C.META;
  M.lv = 26; M.gold = 5000; M.deepest = 34; M.corpses = 0; C.saveMeta();
  const r = JSON.parse(localStorage.getItem("necro.meta.v1"));
  r.lastSeen = Date.now() - 5*3600*1000;
  localStorage.setItem("necro.meta.v1", JSON.stringify(r)); return 1; })()`);
await S("Page.reload", { ignoreCache: true }); await wait(3500);
await ev(`window.__closeAll && window.__closeAll()`); await wait(200);
/* ★ **판이 열리는 그 프레임**을 본다 — 시간이 흐르면 폭발이 먹어 치워 원래 수를 못 본다.
   던전에 넣고 곧바로 멈춰(S.running=false) 한 장 그린 뒤 찍는다. */
const at0 = await ev(`(async()=>{ window.__toDungeon(); const S = window.__S; S.running = false;
  await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));
  const B = await import("/js/battle.js");
  return JSON.stringify({ 상한: B.CORPSE_MAX, 셈: S.corpses, 그림: S.piles.length,
    HUD: document.getElementById("gCorpse").textContent,
    발밑2칸안: S.piles.filter(p=>Math.hypot(p.x,p.y) < B.CORE_R*1.7).length }); })()`);
console.log("판 첫 프레임 " + at0);
await wait(400); await shot("1_start");
/* 멈춘 것을 풀고 12초 굴려 「싸움이 시작돼도 말이 되는가」를 본다 */
await ev(`window.__S.running = true`); await wait(12000);
const at12 = await ev(`JSON.stringify({ 셈: window.__S.corpses, 그림: window.__S.piles.length })`);
console.log("12초 뒤 " + at12);
await shot("2_12s");
console.log("콘솔오류 " + errs.length + (errs.length ? " · " + errs[0] : ""));
await raw("Target.closeTarget", { targetId });
