/* PC 전용으로 방향이 바뀐 뒤(병수님 2026-08-16 17:32)의 **눈으로 보는 자**.
   여태 자는 전부 414×860 폰으로 고정해 재고 있었다 — 그 자로는 「옆이 비었다」가 안 보인다.
   여기서는 **데스크톱 창(1512×900 @2x)** 으로 찍는다. 사람이 보는 그 화면이다.

     node tools/pc_shots.mjs            마을·던전·능력치·가방  (tmp/pc_*.png)
     node tools/pc_shots.mjs --deep     45초 굴린 깊은 층까지 (오래 걸린다)

   찍고 나면 **png 를 직접 열어 본다.** 자가 통과라고 해도 눈으로 안 보면 모른다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const DEEP = process.argv.includes("--deep");
const fs = await import("node:fs");
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
await S("Page.enable"); await S("Runtime.enable");
/* ★ mobile:false — 폰 에뮬이 아니라 진짜 데스크톱 창이다. */
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 900, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); console.log("wrote", out); };
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

/* 몇 시간 논 사람의 세이브 — 갓 시작한 빈 화면을 보면 「옆이 비었다」를 못 본다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);

await shot("tmp/pc_town.png");
await ev(`window.__openWin && window.__openWin("stat")`); await wait(400);
await shot("tmp/pc_stat.png");
await ev(`window.__closeWin ? window.__closeWin() : (window.__openWin && window.__openWin(null))`); await wait(300);
await ev(`window.toDungeon && window.toDungeon()`);
await wait(6000); await shot("tmp/pc_f1.png");
if (DEEP) { await wait(45000); await shot("tmp/pc_deep.png"); }

/* 무대가 창 안에서 어디에 서는지 — 남는 여백이 얼마인지 숫자로도 남긴다.
   2단계(옆 패널)는 이 여백에 세우는 일이다. */
const box = await ev(`(()=>{const st=document.querySelector("#stage");if(!st)return null;
  const r=st.getBoundingClientRect();
  return {win:[innerWidth,innerHeight],stage:[Math.round(r.width),Math.round(r.height)],
    left:Math.round(r.left),right:Math.round(innerWidth-r.right),top:Math.round(r.top)};})()`);
console.log("무대", JSON.stringify(box));
console.log("errs", errs);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
