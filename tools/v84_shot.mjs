/* V-84 그림 — **갈래의 금이 이름을 뚫는가**를 전/후 같은 자리에서 찍는다.
   node tools/v84_shot.mjs <out.png> [old] [W H]   — old 면 옛 자리(못박은 26/20).
   찍는 것은 스킬트리 창의 **군세 갈래**(군단 · 소수 정예) 언저리를 잘라 3배로 키운 것.
   ★ 전/후를 **같은 창 크기 · 같은 몸**으로 찍는다 — 그래야 두 장이 견줘진다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || "tmp/v84_new.png", OLD = process.argv.includes("old");
const N = process.argv.slice(2).filter(s => /^\d+$/.test(s)).map(Number);
const W = N[0] || 1280, H = N[1] || 720;
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S_ = (m, p) => raw(m, p, sessionId);
await S_("Page.enable"); await S_("Runtime.enable");
await S_("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 3, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S_("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S_("Page.reload", { ignoreCache: true }); await wait(2000);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S_("Page.reload", { ignoreCache: true }); await wait(1700);
if (OLD) await ev(`document.body.classList.add("forkold")`);
await ev(`window.__openWin("tree")`); await wait(1400);   /* 창이 **다 밝아진 뒤에** 찍는다 — 600ms 면 전/후 두 장의 밝기가 갈린다 */
/* 자르는 자리는 **재서** 잡는다 — 창 크기가 바뀌면 갈래도 옮겨 간다. */
const box = await ev(`(()=>{const fk=document.querySelector("#treeCols .tCol[data-k='army'] .tFork");
  if(!fk) return null; const r=fk.getBoundingClientRect();
  return {x:Math.round(r.left-26), y:Math.round(r.top-30), w:Math.round(r.width+52), h:Math.round(r.height+44)};})()`);
if (!box) { console.log("갈래를 못 찾았다"); process.exit(1); }
const s = await S_("Page.captureScreenshot", { format: "png",
  clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 3 } });
fs.writeFileSync(OUT, Buffer.from(s.data, "base64"));
console.log(`${OLD ? "옛" : "새"} · ${W}x${H} · 갈래 ${box.w}x${box.h} → ${OUT}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
