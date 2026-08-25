/* V-72 「켜서 본다」 — 1280×800 「능력치」 창의 인물을 바닥 없음(전)·바닥 20px(후)로 찍는다.
   자가 통과해도 사람 눈으로 한 번 본다([[play-it-before-measuring-it]]).
   node tools/v72_shot.mjs   → tmp/v72_before.png · tmp/v72_after.png */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
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
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);

for (const [old, out] of [[1, "tmp/v72_before.png"], [0, "tmp/v72_after.png"]]) {
  await S("Page.reload", { ignoreCache: true }); await wait(1600);
  if (old) await ev(`document.documentElement.style.setProperty("--pdBeltMin","0px")`);
  await ev(`window.__openWin("stat")`); await wait(700);
  /* 인물 칸 둘레만 잘라 찍는다 — 「축에 서 있나」를 보려면 위아래 슬롯이 같이 보여야 한다. */
  const b = await ev(`(()=>{const e=document.querySelector(".pdoll");const r=e.getBoundingClientRect();
                       return {x:Math.round(r.x-8),y:Math.round(r.y-8),width:Math.round(r.width+16),height:Math.round(r.height+16)};})()`);
  const s = await S("Page.captureScreenshot", { format: "png", clip: { ...b, scale: 2 } });
  fs.writeFileSync(out, Buffer.from(s.data, "base64"));
  console.log("wrote", out, JSON.stringify(b));
}
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
