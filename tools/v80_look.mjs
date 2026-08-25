/* **켜서 본다 — 마을 창 여섯 장.** look_shots 는 마을·능력치창·던전만 찍는다.
   상인·대장간·건너뛰기·저주나무·교리·운용은 **한 번도 사진으로 안 본 창**이다.
   node tools/v80_look.mjs   (tmp/v80_<창>.png)
   ★ 창이 안 열리면 **조용히 마을을 찍지 말고 던진다**(look_shots 의 그 못). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
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
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };
/* look_shots 와 **같은 몸**을 심는다 — 사진끼리 견줄 수 있어야 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
const WINS = [["shop","winShop"],["forge","winForge"],["dive","winDive"],["tree","winTree"],
              ["doctrine","winDoctrine"],["tactic","winTactic"],["reborn","winReborn"]];
const bad = [];
for (const [k, dom] of WINS) {
  await ev(`window.__openWin(${JSON.stringify(k)})`); await wait(500);
  const on = await ev(`(()=>{const e=document.getElementById(${JSON.stringify(dom)});
    if(!e) return "없다"; if(!e.classList.contains("on")) return "안 열렸다";
    const r=e.getBoundingClientRect(); return Math.round(r.width)+"x"+Math.round(r.height);})()`);
  if (typeof on === "string" && !/^\d+x\d+$/.test(on)) bad.push(`${k}: ${on}`);
  await shot(`tmp/v80_${k}.png`);
  console.log(k.padEnd(9), on);
  await ev(`window.__closeWin ? window.__closeWin() : window.__openWin(null)`); await wait(200);
}
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : `통과 (${W}x${H} · 창 ${WINS.length}장)`}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
