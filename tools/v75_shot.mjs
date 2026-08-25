/* V-75 전/후 한 장 — 위가 「전」(숫자가 위 띠를 타고 올라간다), 아래가 「후」.
     node tools/v75_shot.mjs [층] [폭 높이]   → tmp/v75_before.png · tmp/v75_after.png
   ★ 숫자는 0.9초면 사라진다 — **띠에 걸린 틀을 만날 때까지 기다렸다** 찍는다.
     아무 때나 찍으면 「전」도 깨끗하게 나와 고침이 안 보인다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const FLOOR = +(process.argv[2] || 30), W = +(process.argv[3] || 1512), H = +(process.argv[4] || 863);
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
const wait = ms => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
const shot = async (old, out) => {
  await S("Page.reload", { ignoreCache: true }); await wait(4200);
  await ev(`globalThis.__NOTOPCAP = ${old ? 1 : 0}; window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };`);
  await ev(`window.__toDungeon && window.__toDungeon()`);
  await wait(1200);
  await S("Runtime.evaluate", { expression: `(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, awaitPromise: true });
  await wait(2000);
  /* 띠에 걸린 틀이 올 때까지 — 「전」은 온다, 「후」는 안 오므로 상한에서 그냥 찍는다 */
  for (let i = 0; i < 240; i++) {
    const hit = await ev(`(()=>{const r=document.getElementById("top").getBoundingClientRect();
      return (window.__RECTS.nums||[]).some(a=>a[7]>=0.35 && a[1] < r.bottom);})()`);
    if (hit) break;
    await wait(120);
  }
  const s = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(s.data, "base64")); console.log("wrote", out);
};
await shot(true,  "tmp/v75_before.png");
await shot(false, "tmp/v75_after.png");
await raw("Target.closeTarget", { targetId }); process.exit(0);
