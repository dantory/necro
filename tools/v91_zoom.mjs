/* v91 이 짚은 자리를 **눈으로 보려고** 그 요소만 도려내 크게 찍는다.
     node tools/v91_zoom.mjs <창> <선택자> <out.png> [W] [H] [pad] */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const [which, sel, out] = process.argv.slice(2);
const W = +(process.argv[5] || 1366), H = +(process.argv[6] || 700), PAD = +(process.argv[7] || 10);
/* `old` 를 붙이면 옛 그늘·옛 흐림으로 되돌려 같은 자리를 찍는다 — 전후를 견주려고. */
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
bws.addEventListener("error", () => {});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 4, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
if (process.argv.includes("old")) { await ev(`document.documentElement.classList.add("inkOld")`); await wait(120); }
if (which !== "town") { await ev(`window.__openWin(${JSON.stringify(which)})`); await wait(450); }
const box = await ev(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]
  .map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
  if (!els.length) return null;
  return { x: Math.min(...els.map(r => r.left)), y: Math.min(...els.map(r => r.top)),
           r: Math.max(...els.map(r => r.right)), b: Math.max(...els.map(r => r.bottom)) };})()`);
if (!box) { console.log("못 찾음:", sel); await fetch(`${CDP}/json/close/${targetId}`); process.exit(1); }
const clip = { x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD),
               width: Math.min(W, box.r - box.x + PAD * 2), height: Math.min(H, box.b - box.y + PAD * 2), scale: 1 };
const s = await S("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: false });
fs.writeFileSync(out, Buffer.from(s.data, "base64"));
console.log(out, `${Math.round(clip.width)}x${Math.round(clip.height)} @4x`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
