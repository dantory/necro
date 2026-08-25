/* V-73 전/후 한 장 — 위가 「전」(수치가 아래), 아래가 「후」(수치가 옆).
     node tools/v73_shot.mjs [폭 높이]   → tmp/v73_cmp.png */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1366), H = +(process.argv[3] || 768);
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
const wait = ms => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
await wait(4200);
await ev(`(()=>{const M=window.META; M.lv=40; M.bag=[];
  for(const k of (window.__GEAR_KEYS||[])) M.equip[k]={k, tier:2, af:[{id:"dmg",v:12}]};
  window.saveMeta();})()`);
const shot = async (old, out) => {
  await ev(`window.__NOSBS=${old}; window.__closeAll&&window.__closeAll(); window.__openWin("stat");`);
  await wait(800);
  const s = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(s.data, "base64")); console.log("wrote", out);
};
await shot(true,  "tmp/v73_before.png");
await shot(false, "tmp/v73_after.png");
await raw("Target.closeTarget", { targetId });
process.exit(0);
