/* V-52 — 고친 「낀 것」 칸을 켜서 찍는다(문 `qold` 로 옛 그림도 같은 판에서).
     node tools/v52_shot.mjs */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
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
const { writeFileSync } = await import("node:fs");
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2500);
await ev(`localStorage.clear()`); await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`(() => { const M = window.META;
  const K = ["wand","robe","charm","helm","glove","ring","shield","belt","boots","ring2"];
  for (const k of K) M.equip[k] = { k, tier: 2, af: [{id:"dmg",v:12},{id:"hp",v:60}] };
  M.plus = {}; for (const k of K) M.plus[k] = 1;
  M.bag = K.map((k,i) => ({ k, tier: (i%4)+1, af: [{id:"dmg",v:9}] }));
  window.saveMeta(); })()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`window.__openWin("bag")`); await wait(800);
const box = await ev(`(() => { let best = null;
  for (const d of document.querySelectorAll('.pdoll')) { const r = d.getBoundingClientRect();
    if (r.width > 20 && r.height > 20 && (!best || r.width * r.height > best[2] * best[3]))
      best = [Math.round(r.left)-8, Math.round(r.top)-8, Math.round(r.width)+16, Math.round(r.height)+16]; }
  return best; })()`);
console.log("돌 자리", JSON.stringify(box));
const shot = async (n) => { const { data } = await S("Page.captureScreenshot", { format: "png",
  clip: { x: box[0], y: box[1], width: box[2], height: box[3], scale: 3 } });
  writeFileSync(`tmp/v52_${n}.png`, Buffer.from(data, "base64")); console.log(`tmp/v52_${n}.png`); };
await ev(`document.body.classList.add("qold")`); await wait(300); await shot("doll_old");
await ev(`document.body.classList.remove("qold")`); await wait(300); await shot("doll_new");
await raw("Target.closeTarget", { targetId });
process.exit(0);
