/* V-82 그림 — **관문의 주인이 선 순간을 잡아 찍는다.** 한 마리가 1초를 못 사니
   look_shots 로는 좀처럼 안 걸린다(두 번 돌려 한 번 걸렸다).
   node tools/v82_shot.mjs <out.png> [old]   — old 면 옛 그림(흐림 = born0)으로 찍는다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || "tmp/v82_new.png", OLD = process.argv[3] === "old";
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
await S_("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S_("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S_("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S_("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`globalThis.__BORNFADE_OFF = ${OLD ? 1 : 0}`);
await ev(`window.__toDungeon()`);
/* ★ 두 팔을 **같은 나이**에서 찍는다 — 알파로 고르면 두 팔이 서로 다른 순간을 찍어
   그림이 아무것도 못 말한다. 「선 지 0.45초」는 주인 절반이 아직 살아 있는 자리다
   (v82_lord_alpha 중앙 산시간 0.75~0.84s). 옛 팔은 여기서 알파 0.17, 새 팔은 0.82 다. */
const AGE = +(process.env.V82_AGE || 0.45);
let hit = null;
for (let i = 0; i < 900; i++) {
  const r = await ev(`(async()=>{const mod=await import("/js/main.js");const S=window.S;
    if(!S||!S.mobs)return null;const m=S.mobs.find(x=>x.boss);if(!m)return null;
    return {a:+mod.bornAlpha(m).toFixed(2), age:+((m.born0||0.4)-m.born).toFixed(2), f:S.floor, n:(m.lord||{}).n||"?"};})()`);
  if (r && r.age >= AGE && r.age <= AGE + 0.16) { hit = r; break; }
  if (await ev(`(window.MODE||{}).at !== "dungeon" || !!(window.S&&S.dead)`)) await ev(`window.__toDungeon()`);
}
if (!hit) { console.log("주인을 못 잡았다"); process.exit(1); }
const s = await S_("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(OUT, Buffer.from(s.data, "base64"));
console.log(`${OLD ? "옛" : "새"} · ${hit.f}층 ${hit.n} · 선 지 ${hit.age}s · 알파 ${hit.a} → ${OUT}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
