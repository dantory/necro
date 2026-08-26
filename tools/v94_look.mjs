/* V-94 — **떠 있는 툴팁(#ftip)을 켜서 본다.** ARPG 에서 가장 많이 읽는 상자인데
   V-29·V-33 이 「칸」을 고치는 동안 상자 자체를 한 벌로 찍어 본 적이 없다.
   가방 칸 · 낀 칸 · 상인 좌판 셋을 눌러 붙박고 찍는다([[play-it-before-measuring-it]]).
   node tools/v94_look.mjs [width] [height]   (tmp/v94_*.png) */
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

const it = (k, tier, af) => ({ k, tier, af });
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: it("wand", 3, [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }]),
           robe: it("robe", 3, [{ id: "hp", v: 88 }]),
           charm: it("charm", 2, [{ id: "mdmg", v: 18 }]) },
  bag: [it("wand", 4, [{ id: "dmg", v: 31 }, { id: "mp", v: 2.1 }, { id: "mdmg", v: 12 }]),
        it("robe", 2, [{ id: "hp", v: 51 }]),
        it("charm", 3, [{ id: "mdmg", v: 24 }, { id: "mp", v: 0.9 }]),
        it("wand", 1, [{ id: "dmg", v: 7 }])],
  tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);

/* 칸을 «누른다» — 붙박이 툴팁은 click 으로만 선다. 눌린 뒤 상자가 정말 떴는지 묻는다
   ([[silent-zero-is-not-an-observation]]) — 안 떴는데 찍으면 「이상 없음」이 된다. */
const pick = async (sel, name) => {
  const r = await ev(`(()=>{const c=document.querySelector(${JSON.stringify(sel)});
    if(!c) return "no-cell"; if(c.offsetParent===null) return "hidden"; c.click(); return "ok";})()`);
  if (r !== "ok") { console.log(name.padEnd(12), r); return false; }
  await wait(400);
  const on = await ev(`(()=>{const f=document.getElementById("ftip");
    if(!f||!f.classList.contains("on")) return "closed";
    const b=f.getBoundingClientRect();
    return Math.round(b.width)+"x"+Math.round(b.height)+" @"+Math.round(b.left)+","+Math.round(b.top)
      +" · 글자 "+(f.textContent||"").trim().length
      +(b.left<0||b.top<0||b.right>innerWidth||b.bottom>innerHeight ? " ★밖으로 나감" : "");})()`);
  console.log(name.padEnd(12), on);
  return on !== "closed";
};

await ev(`window.__openWin("stat")`); await wait(600);
if (await pick("#winBag [data-bpick]", "가방 첫칸")) await shot(`tmp/v94_bag_${W}.png`);
if (await pick("#winStat [data-spick]", "낀 칸")) await shot(`tmp/v94_equip_${W}.png`);
await ev(`window.__closeWin && window.__closeWin()`); await wait(300);
await ev(`window.__openWin("shop")`); await wait(600);
if (await pick("#winShop [data-pick]", "상인 좌판")) await shot(`tmp/v94_shop_${W}.png`);
if (errs.length) console.log("errs", errs.slice(0, 5));
console.log(`창 ${W}x${H} · tmp/v94_*_${W}.png`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
