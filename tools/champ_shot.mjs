/* 로드맵을 세우기 전에 **켜서 본다**. 자가 보는 것만 보지 않으려고 화면을 그대로 찍는다.
   마을 → 던전 초반 → 45초 굴린 뒤(깊은 층) → 능력치/가방 창.
   node tools/look_shots.mjs   (tmp/look_*.png)

   ★ 2026-08-17 — **이 자는 던전을 한 번도 안 찍고 있었다.** `window.toDungeon` 은 없는
     이름이라(있는 것은 `__toDungeon` · js/main.js:2281) `&&` 뒤가 통째로 안 돌았고,
     `look_f1.png`·`look_deep.png` 는 **마을 사진**이었다. kind_probe 가 2026-08-15 에
     똑같은 이름으로 12분을 헛돈 일이 있는데(그 자에는 그때 못을 박았다) 이 자에는
     안 옮겼다 — [[carry-fixes-forward]].
     그래서 여기서는 **없으면 던진다 · 들어간 뒤 자리를 확인한다 · 아니면 미달로 끝낸다.**
     사진은 판정을 못 하지만 «어느 화면을 찍었는지»는 잴 수 있다. */
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
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

/* ── 우두머리(champion)가 **화면에서 읽히는가**를 보러 간다(D-2). 자만 보지 않는다. */
if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("__toDungeon 없다");
await ev(`window.__toDungeon()`);
await wait(1000);
/* 우두머리는 10층부터 선다 — 판이 거기 닿을 때까지 굴리고, 절규 **예고가 뜬 순간**을 찍는다. */
let ok = 0, best = null;
for (let i = 0; i < 700; i++) {
  const st = await ev(`(() => { const S = window.S; if (!S) return null;
    const c = (S.mobs||[]).filter(m => m.champ && !m.born);
    return { f: S.floor, n: c.length, tell: (S.fx||[]).some(f => f.kind === "warn_curse"), howl: S.chowl|0 }; })()`);
  if (st && st.f >= 12 && st.tell) { best = st; ok = 1; break; }
  await wait(120);
}
console.log("찍는 순간 —", JSON.stringify(best), "· ok", ok);
await shot("tmp/champ_shot.png");
console.log("errs", errs);
process.exit(0);
