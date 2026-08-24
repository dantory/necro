/* **켜서 본다 ②** — `look_shots` 가 안 찍는 창들을 찍는다.
   상인 · 대장간 · 스킬트리 · 교리 · 전술 · (드랍을 받은) 가방.
   사람이 제일 자주 여는 화면인데 그림으로 한 번도 안 봤다.
   node tools/v27_panels.mjs   (tmp/pan_*.png)
   ★ `look_shots` 와 **같은 세이브**(몇 시간 논 사람)를 심는다 — 창이 빈 채로 찍히면
     「비었다」가 창 탓인지 세이브 탓인지 안 갈린다. */
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

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);

/* 창이 **정말 열렸는지**를 묻는다 — 안 열렸는데 찍으면 마을 사진에 「이상 없음」이 붙는다
   ([[silent-zero-is-not-an-observation]] · look_shots 의 `__toDungeon` 과 같은 사고). */
const WINS = { shop:"winShop", forge:"winForge", tree:"winTree", doctrine:"winDoctrine", tactic:"winTactic", bag:"winBag" };
const bad = [];
for (const [which, wid] of Object.entries(WINS)) {
  await ev(`window.__openWin && window.__openWin(${JSON.stringify(which)})`); await wait(600);
  const on = await ev(`!!(document.getElementById(${JSON.stringify(wid)})||{}).classList?.contains("on")`);
  await shot(`tmp/pan_${which}.png`);
  console.log(`  ${which} 열림=${on}`);
  if (!on) bad.push(`${which} 창이 안 열렸다`);
  await ev(`window.__openWin && window.__openWin(${JSON.stringify(which)})`); await wait(250);
}
console.log("errs", errs);
if (errs.length) bad.push(`콘솔오류 ${errs.length}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과 (여섯 창을 다 열어 찍었다)"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
