/* **오프라인 시체 창고가 판의 시체 상한을 지키는가** (V-43)
     node tools/v43_bank.mjs
   `CORPSE_MAX`(140)은 「자원이 넘치면 그 자원으로 하는 선택이 사라진다」고 못 박은 상한이고
   `addCorpse` 는 그 앞에서 멈춘다. 그런데 `newRun` 은 오프라인 창고를 **상한 밖에서**
   판에 붓는다 — 다섯 시간 비우면 9천 구가 들어간다. 그 값을 잰다.
   재는 것: ① 창고에 쌓인 수 ② 판에 들어간 S.corpses ③ 화면에 눕힌 그림 S.piles
            ④ HUD 글자 ⑤ 상한 아래로 내려오기까지 걸린 초. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const HOURS = +(process.env.V43_HOURS || 5);
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
const ev = async expression => (await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE });
await wait(3500);
/* 「몇 시간 논 사람」을 심는다 — deepest 는 오프라인 벌이의 밑이라 반드시 넣는다. */
await ev(`(async()=>{ const C = await import("/js/core.js"); const M = C.META;
  M.lv = 26; M.gold = 5000; M.deepest = 34; M.corpses = 0; C.saveMeta();
  const r = JSON.parse(localStorage.getItem("necro.meta.v1"));
  r.lastSeen = Date.now() - ${HOURS}*3600*1000;
  localStorage.setItem("necro.meta.v1", JSON.stringify(r)); return 1; })()`);
await S("Page.reload", { ignoreCache: true }); await wait(3500);
const bank = await ev(`(async()=>{ const C = await import("/js/core.js");
  return JSON.stringify({ 창고: C.META.corpses|0, 패널: (window.__lastOffline||{}) }); })()`);
console.log("① 창고 " + bank);
await ev(`window.__closeAll && window.__closeAll()`); await wait(200);
await ev(`window.__toDungeon()`); await wait(900);
const t0 = await ev(`(async()=>{ const B = await import("/js/battle.js"); const S = window.__S;
  return JSON.stringify({ 상한: B.CORPSE_MAX, 판에실린시체: S.corpses, 눕힌그림: S.piles.length,
    HUD: document.getElementById("gCorpse").textContent,
    빨강: document.getElementById("gCorpse").classList.contains("full"),
    창고나머지: (await import("/js/core.js")).META.corpses|0 }); })()`);
console.log("② 판 " + t0);
/* ⑤ 상한 아래로 내려오기까지 — 3초마다 90초까지 본다 */
let below = null;
for (let i = 1; i <= 30; i++) {
  await wait(3000);
  const c = await ev(`(async()=>{ const B = await import("/js/battle.js"); return window.__S.corpses <= B.CORPSE_MAX; })()`);
  if (c) { below = i * 3; break; }
}
const cnow = await ev(`window.__S.corpses`);
console.log(`③ 상한 아래로 ${below === null ? "90초 안에 못 내려옴(지금 " + cnow + "구)" : below + "초"}`);
console.log("콘솔오류 " + errs.length);
await raw("Target.closeTarget", { targetId });
