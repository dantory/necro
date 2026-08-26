/* V-93 — **아직 한 벌로 켜서 본 적 없는 창들**을 찍는다.
   V-92 는 마을·능력치/가방·1층·깊은 층 넉 장만 봤다. 여기는 상인·대장간·스킬트리·
   교리·운용·건너뛰기·환생 여섯~일곱 장이다(V-27~V-37 에서 하나씩 고쳤지만 **한 화면씩**
   이었고, 그 뒤 V-52·53·55·90 이 칸·여백·사다리를 통째로 바꿨다).
   node tools/v93_look.mjs [width] [height]   (tmp/v93_*.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
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
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* look_shots 와 같은 중반 세이브 — 갓 시작한 판이 아니라 몇 시간 논 사람의 창을 본다.
   가방을 비워 두면 상인·대장간이 「팔 것 없음」으로 비니 물건 몇을 넣는다. */
const it = (k, tier, af) => ({ k, tier, af });
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: it("wand", 3, [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }]),
           robe: it("robe", 3, [{ id: "hp", v: 88 }]),
           charm: it("charm", 2, [{ id: "mdmg", v: 18 }]) },
  bag: [it("wand", 2, [{ id: "dmg", v: 14 }]), it("robe", 2, [{ id: "hp", v: 51 }]),
        it("charm", 3, [{ id: "mdmg", v: 24 }, { id: "mp", v: 0.9 }]), it("wand", 1, [{ id: "dmg", v: 7 }])],
  tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);

const wins = ["shop", "forge", "tree", "doctrine", "tactic", "dive", "reborn"];
for (const w of wins) {
  await ev(`window.__openWin(${JSON.stringify(w)})`);
  await wait(500);
  /* **열렸는지 짐작하지 않고 묻는다** — 안 열린 채로 마을을 찍으면 「이상 없음」이 된다. */
  const on = await ev(`(()=>{const id={shop:"winShop",forge:"winForge",tree:"winTree",doctrine:"winDoctrine",tactic:"winTactic",dive:"winDive",reborn:"winReborn"}[${JSON.stringify(w)}];
    const e=document.getElementById(id); if(!e) return "no-el";
    if(!e.classList.contains("on")) return "closed";
    const r=e.getBoundingClientRect(); return Math.round(r.width)+"x"+Math.round(r.height)+" @"+Math.round(r.left)+","+Math.round(r.top);})()`);
  console.log(w.padEnd(9), on);
  if (on === "closed" || on === "no-el") continue;
  await shot(`tmp/v93_${w}.png`);
  await ev(`window.__closeWin ? window.__closeWin() : window.__openWin(null)`); await wait(250);
}
if (errs.length) console.log("errs", errs.slice(0, 5));
console.log(`창 ${W}x${H} · tmp/v93_*.png`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
