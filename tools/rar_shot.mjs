/* **희귀도 빛깔을 눈으로 본다** (V-2) — 가방에 일반·매직·희귀·유니크를 한 벌 담고 찍는다.
     node tools/rar_shot.mjs [out=tmp/rar.png] */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || "tmp/rar.png";
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
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2000);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
const ev = async (x) => { const r = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: x });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return typeof r.result.value === "string" ? JSON.parse(r.result.value) : r.result.value; };
const out = await ev(`(async()=>{ const C = await import("/js/core.js");
  const M = C.META; M.bag.length = 0; M.gold = 5000;
  const put = (k, tier, ids) => { const it = C.mkItem(k, tier, 20); it.af = ids.map(id => ({ id, v: Math.round(C.AFFIX[id].r[1]) })); M.bag.push(it); return it; };
  put("wand", 2, []); put("robe", 3, []);                       // 일반(흰)
  put("helm", 3, ["mp"]); put("glove", 2, ["dmg"]);             // 매직(파랑)
  put("ring", 4, ["mdmg", "hp"]); put("charm", 4, ["nova","cd","army"]);  // 희귀(노랑)
  M.bag.push(C.mkUnique(C.UNIQUE[0], 30));                      // 유니크(주황)
  C.saveMeta();
  return JSON.stringify(M.bag.map(x => C.nameOf(x) + " [" + C.rarityOf(x) + "]"));
})()`);
console.log(out.join("\n"));
await S("Runtime.evaluate", { expression: `window.__toTown && window.__toTown()` }); await wait(500);
await S("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyI", key: "i", windowsVirtualKeyCode: 73 });
await S("Input.dispatchKeyEvent", { type: "keyUp",   code: "KeyI", key: "i", windowsVirtualKeyCode: 73 });
await wait(900);
const { data } = await S("Page.captureScreenshot", { format: "png" });
const { writeFileSync } = await import("node:fs");
writeFileSync(OUT, Buffer.from(data, "base64"));
console.log(`\n${OUT} · 콘솔오류 ${errs.length}${errs.length ? " → " + errs[0] : ""}`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
