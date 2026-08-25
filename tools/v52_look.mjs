/* V-52 고르기 — 아직 가까이 안 본 것: 싸우는 «사람·군세·적» 그림과 떠 있는 «설명 쪽지».
     node tools/v52_look.mjs */
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
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (n) => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v52_${n}.png`, Buffer.from(data, "base64")); console.log(`tmp/v52_${n}.png`); };
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2500);
await ev(`localStorage.clear()`);
await S("Page.reload", { ignoreCache: true }); await wait(2800);
await ev(`window.__toDungeon()`); await wait(20000);
console.log("초반", JSON.stringify(await ev(`({f:(window.S||{}).floor, lv:(window.S||{}).lv, mob:(window.MOBS||[]).length, min:(window.MINIONS||[]).length})`)));
await shot("fight_a"); await wait(40000); await shot("fight_b");
await wait(90000);
console.log("중반", JSON.stringify(await ev(`({f:(window.S||{}).floor, lv:(window.S||{}).lv})`)));
await shot("fight_c");
/* 가방을 열고 한 칸에 쪽지를 띄운다 */
await ev(`window.__openWin("bag")`); await wait(900); await shot("bag");
console.log("콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
