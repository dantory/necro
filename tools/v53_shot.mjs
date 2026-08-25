/* V-53 — 장비 칸을 켜서 찍는다. 인물도 + 가방 격자.
     node tools/v53_shot.mjs <꼬리표> [--old]
   `--old` 는 예전 여백(`inset:6px`)을 그 자리에서 되돌린다. 그림 자체를 되돌리려면
   `python3 tools/gear_trim.py --restore` 를 먼저 돌린다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const TAG = process.argv[2] || "now", OLD = process.argv.includes("--old");
const { writeFileSync } = await import("node:fs");
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
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
const errs = [];
S("Log.enable"); bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.method === "Log.entryAdded" && m.params?.entry?.level === "error") errs.push(m.params.entry.text); });
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
if (OLD) await ev(`(() => { const s = document.createElement('style');
  s.textContent = '.cell i{inset:6px}.pd-charm .cell i,.pd-ring .cell i,.pd-ring2 .cell i{inset:3px}.pd-belt .cell i{inset:2px 6px}';
  document.head.appendChild(s); })()`);
await ev(`window.__openWin("bag")`); await wait(900);
const box = async (sel, pad) => ev(`(() => { let best = null;
  for (const d of document.querySelectorAll('${sel}')) { const r = d.getBoundingClientRect();
    if (r.width > 20 && r.height > 20 && (!best || r.width*r.height > best[2]*best[3]))
      best = [Math.round(r.left)-${pad}, Math.round(r.top)-${pad}, Math.round(r.width)+${pad*2}, Math.round(r.height)+${pad*2}]; }
  return best; })()`);
const shot = async (n, b, scale) => { if (!b) return console.log("자리 없음", n);
  const { data } = await S("Page.captureScreenshot", { format: "png", clip: { x: b[0], y: b[1], width: b[2], height: b[3], scale } });
  writeFileSync(`tmp/v53_${n}.png`, Buffer.from(data, "base64")); console.log(`tmp/v53_${n}.png`); };
await shot(`doll_${TAG}`, await box('.pdoll', 8), 3);
await shot(`bag_${TAG}`, await box('.sSec.bag .grid', 6), 1);
console.log("콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
