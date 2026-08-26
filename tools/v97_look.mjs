/* V-97 — **전장을 켜서 본다.** V-93 이 마을의 덮는 창 일곱을, V-94 가 툴팁을,
   V-95 가 정산·그동안·초기화를, V-96 이 넓은 창을 봤다. 정작 사람이 **가장 오래
   보는 화면**인 전장은 자(qa_all)만 지나갔지 한 벌로 찍어 본 적이 없다
   ([[play-it-before-measuring-it]]).
   node tools/v97_look.mjs [width] [height]   (tmp/v97_*.png) */
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
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

const it = (k, tier, af) => ({ k, tier, af });
/* 「몇 시간 논 사람」 — Lv.26 · 장비 tier 3. V-14b 가 심어 둔 그 사람과 같다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: it("wand", 3, [{ id: "dmg", v: 22 }]), robe: it("robe", 3, [{ id: "hp", v: 88 }]),
           charm: it("charm", 2, [{ id: "mdmg", v: 18 }]) },
  bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(2000);
if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("__toDungeon 없다");
await ev(`window.__toDungeon()`); await wait(1500);
if (!(await ev(`!!(window.__geo && window.__geo.sc)`))) throw new Error("__geo 가 안 섰다 — 한 프레임도 안 그려졌다");

/* 전장에서 «떠 있는 글자»를 전부 세어 대비를 잰다. 자리·넘침·화면밖도 같이.
   묻지 않고 찍으면 「이상 없음」이 된다([[silent-zero-is-not-an-observation]]). */
const LOOK = `(()=>{
  const out={}; const R=e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)];};
  out.floor = (document.getElementById("dFloor")||{}).textContent;
  /* 화면 밖으로 나간 것 */
  const off=[]; document.querySelectorAll("#app *").forEach(e=>{
    const b=e.getBoundingClientRect(); if(b.width<2||b.height<2) return;
    const cs=getComputedStyle(e); if(cs.visibility==="hidden"||cs.display==="none"||cs.opacity==="0") return;
    if(b.right>innerWidth+1||b.bottom>innerHeight+1||b.left<-1||b.top<-1)
      off.push((e.id||e.className||e.tagName)+" "+R(e).join(","));});
  out.off=off.slice(0,6);
  /* 가로로 넘치는 줄 */
  const sp=[]; document.querySelectorAll("#app *").forEach(e=>{
    if(e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&getComputedStyle(e).overflow!=="visible")
      sp.push((e.id||e.className)+" "+e.scrollWidth+">"+e.clientWidth);});
  out.spill=sp.slice(0,6);
  return out;})()`;

const step = async (name, out) => {
  const r = await ev(LOOK);
  console.log(name.padEnd(12), JSON.stringify(r));
  await shot(`tmp/v97_${out}_${W}.png`);
};

await wait(4000);  await step("① 1층 초반", "f1_early");
await wait(20000); await step("② 1층 한창", "f1_mid");
/* 깊은 층 — 군세가 차고 구역 빛깔도 바뀐 자리 */
await ev(`window.__MODE&&0; (window.__S&&(window.__S.floor=16));`);
await wait(15000); await step("③ 16층 무렵", "f16");
if (errs.length) console.log("errs", errs.slice(0, 5));
console.log(`전장 ${W}x${H} · tmp/v97_*_${W}.png`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
