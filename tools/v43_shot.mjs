/* **판이 끝난 뒤·다시 켤 때 보는 네 창을 켜서 찍는다** (V-43 고르기)
     node tools/v43_shot.mjs
   winReborn(환생) · winWipe(초기화) · winOffline(그동안) · winEnd(정산) —
   네 창은 QA 자(rebirth_qa·wipe_qa·offline_qa·run_end)는 있는데 **눈으로 본 적이 없다.**
   숫자가 아니라 그림을 모으는 것이 목적이다(first_look 과 같은 결). */
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
  writeFileSync(`tmp/v43_${name}.png`, Buffer.from(data, "base64")); console.log(`tmp/v43_${name}.png`); };
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(3500);

/* ① **몇 시간 논 사람의 저장**을 심는다 — 빈 저장으로 열면 네 창이 다 «0» 이라 무엇이
   이상한지 안 보인다. lastSeen 을 5시간 뒤로 밀어 두면 다시 켤 때 「그동안」이 뜬다. */
const seeded = await ev(`(async()=>{ const C = await import("/js/core.js");
  const M = C.META; M.lv = 26; M.xp = 120; M.gold = 182000; M.deepest = 34; M.corpses = 41;
  M.relics = (M.relics|0) || 3; C.saveMeta();
  const raw = JSON.parse(localStorage.getItem("necro.meta.v1"));
  raw.lastSeen = Date.now() - 5*3600*1000;   // 다섯 시간 전에 껐다
  localStorage.setItem("necro.meta.v1", JSON.stringify(raw));
  return JSON.stringify({lv:M.lv, gold:M.gold, deepest:M.deepest, relics:M.relics}); })()`);
console.log("심은 저장 " + seeded);
await S("Page.reload", { ignoreCache: true }); await wait(3500);
await shot("1_offline");                                   // ① 다시 켠 순간 — 「그동안」

await ev(`window.__closeAll && window.__closeAll()`); await wait(300);
await ev(`window.__openWin("reborn")`); await wait(600); await shot("2_reborn");   // ② 환생
await ev(`window.__closeAll()`); await wait(200);
await ev(`window.__openWin("wipe")`); await wait(600); await shot("3_wipe");       // ③ 초기화

/* ④ 정산 — 실제로 한 판을 굴려 죽인다(심은 값으로 그리면 줄바꿈이 진짜와 다르다). */
await ev(`window.__closeAll()`); await wait(200);
await ev(`window.__toDungeon()`); await wait(1500);
const runInfo = await ev(`(async()=>{ const S = window.__S; return JSON.stringify({floor:S.floor, hp:S.hp}); })()`);
console.log("던전 " + runInfo);
await wait(30000);                                          // 30초 굴린다(전리품이 쌓이게)
await ev(`(()=>{ const S = window.__S; S.hp = 1; return 1; })()`);
for (let i = 0; i < 40 && !(await ev(`document.getElementById("winEnd").classList.contains("on")`)); i++) await wait(1000);
await wait(700); await shot("4_end");                       // ④ 정산

console.log("콘솔오류 " + errs.length + (errs.length ? " · " + errs.slice(0,3).join(" | ") : ""));
await raw("Target.closeTarget", { targetId });
