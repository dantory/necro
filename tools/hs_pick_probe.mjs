/* 바닥 아이템이 «사람이 지나가면» 실제로 손에 들어오는가 (V-147).
   입력 주입 없이 — 아이템을 플레이어 둘레에 깔고 판을 그냥 돌린 뒤 G.picks 를 센다.
   node tools/hs_pick_probe.mjs */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/hs/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const done = async (code) => { try { await S("Target.closeTarget", { targetId }); } catch {} process.exit(code); };
process.on("uncaughtException", async e => { console.log("BAIL:", e.message); await done(3); });
setTimeout(async () => { console.log("BAIL: 90s 넘김"); await done(3); }, 90000);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await wait(2500);
if (!await ev("!!(window.G && G.player)")) { console.log("BAIL: 부팅 실패"); await done(3); }

// 플레이어 둘레 40~95px 에 아이템 10개를 깐다 (팩을 잡았을 때 흩어지는 그 거리).
const setup = await ev(`(async () => {
  const M = await import("http://127.0.0.1:8774/hs/loot.js");
  const p = G.player; G.items.length = 0; G.picks = 0;
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * 6.283, r = 40 + (i % 6) * 11;
    G.items.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, vx: 0, vy: 0, t: 0, item: M.rollItem(1) });
  }
  return { laid: G.items.length, name: G.items[0].item.name };
})()`);
console.log("깔았다:", JSON.stringify(setup));
await wait(3000);
const r = await ev("({ picks: G.picks, left: G.items.length })");
console.log(`3초 서 있기 → 주움 ${r.picks} / 남은 것 ${r.left}   (오류 ${errs.length})`);
console.log(r.picks >= 8 ? "PASS — 바닥템이 손에 들어온다" : "FAIL — 아직 안 줍는다");
await done(r.picks >= 8 ? 0 : 1);
