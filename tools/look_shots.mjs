/* 로드맵을 세우기 전에 **켜서 본다**. 자가 보는 것만 보지 않으려고 화면을 그대로 찍는다.
   마을 → 던전 초반 → 45초 굴린 뒤(깊은 층) → 능력치/가방 창.
   node tools/look_shots.mjs   (tmp/look_*.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
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
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); console.log("wrote", out); };
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

/* 중반 세이브를 심는다 — 갓 시작한 판이 아니라 **몇 시간 논 사람**의 화면을 본다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1500);
await shot("tmp/look_town.png");
await ev(`window.__openWin && window.__openWin("stat")`); await wait(400);
await shot("tmp/look_stat.png");
await ev(`window.__closeWin ? window.__closeWin() : (window.__openWin && window.__openWin(null))`); await wait(300);
/* 던전으로 */
await ev(`window.toDungeon && window.toDungeon()`);
await wait(6000); await shot("tmp/look_f1.png");
await wait(45000); await shot("tmp/look_deep.png");
console.log("층", await ev(`window.S && S.floor`), "군세", await ev(`window.S && S.minions && S.minions.length`),
            "시체", await ev(`window.S && S.corpses`), "적", await ev(`window.S && S.enemies && S.enemies.length`),
            "체력", await ev(`window.S && Math.round(S.hp)`), "최대", await ev(`window.S && Math.round(S.hpMax)`));
console.log("errs", errs);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
