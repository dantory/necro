/* **「사기」 단추가 보이는가** — 상인·대장간·트리의 값과 단추(.tipBuy)는 설명칸(.tip) 안에
   있고, 그 칸은 `overflow-y:auto` 로 **구른다.** 창이 낮으면 단추가 스크롤 아래로 밀려
   **화면에서 사라진다** — 사람은 값도 못 보고 살 수도 없다.
   node tools/v27_buyfit.mjs [--h 863]
   세는 것: 고르는 칸마다 .tipBuy 가 .tip 의 «보이는 네모» 안에 몇 %나 들어와 있나.
   ★ 문(`__NOSTICKY=1`)으로 고치기 전 상태를 그대로 잴 수 있다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const argH = (() => { const i = process.argv.indexOf("--h"); return i > 0 ? +process.argv[i + 1] : 863; })();
const NOST = process.env.NOSTICKY === "1";
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: argH, deviceScaleFactor: 1, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
if (NOST) await ev(`window.__NOSTICKY = 1`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
if (NOST) await ev(`window.__NOSTICKY = 1; document.body.classList.add("noSticky")`);

/* 한 칸을 고른 뒤 «값+단추»가 설명칸의 보이는 네모 안에 얼마나 들어왔나 */
const MEAS = `(() => {
  const tip = document.querySelector(".win.on .frame > .tip");
  if (!tip) return null;
  const buy = tip.querySelector(".tipBuy");
  if (!buy) return { none: true };
  const t = tip.getBoundingClientRect(), b = buy.getBoundingClientRect();
  const top = Math.max(t.top, b.top), bot = Math.min(t.bottom, b.bottom);
  const vis = Math.max(0, bot - top);
  return { vis: +(vis / Math.max(1, b.height)).toFixed(3), h: Math.round(b.height),
           tipH: Math.round(t.height), scrollH: tip.scrollHeight, scrollT: Math.round(tip.scrollTop) };
})()`;

const rows = [];
const run = async (label, openWhich, picks, click) => {
  await ev(`window.__openWin(${JSON.stringify(openWhich)})`); await wait(450);
  for (const p of picks) {
    await ev(click(p)); await wait(220);
    const m = await ev(MEAS);
    if (!m || m.none) { rows.push({ label, p, vis: null }); continue; }
    rows.push({ label, p, ...m });
  }
  await ev(`window.__openWin(${JSON.stringify(openWhich)})`); await wait(200);
};
/* 고를 칸의 이름은 **DOM 에서 읽는다** — `GEAR_KEYS` 는 모듈 안에만 있어
   `window.GEAR_KEYS` 는 늘 undefined 다(처음에 그렇게 적었더니 칸 하나만 쟀다). */
const keysOf = async (which, attr) => {
  await ev(`window.__openWin(${JSON.stringify(which)})`); await wait(450);
  const ks = await ev(`[...document.querySelectorAll('[${attr}]')].map(e=>e.getAttribute('${attr}'))`);
  await ev(`window.__openWin(${JSON.stringify(which)})`); await wait(200);
  return ks || [];
};
const shopKeys = await keysOf("shop", "data-pick");
const upKeys = await keysOf("forge", "data-fpick");
console.log("상인 칸", shopKeys.length, "· 대장간 칸", upKeys.length);
await run("상인", "shop", shopKeys, k => `(document.querySelector('[data-pick="${k}"]')||{}).click?.()`);
await run("대장간", "forge", upKeys, k => `(document.querySelector('[data-fpick="${k}"]')||{}).click?.()`);

const have = rows.filter(r => r.vis !== null && r.vis !== undefined);
const gone = have.filter(r => r.vis < 0.001).length;
const part = have.filter(r => r.vis >= 0.001 && r.vis < 0.999).length;
const full = have.filter(r => r.vis >= 0.999).length;
console.log(`창 높이 ${argH} · sticky ${NOST ? "끔" : "켬"}`);
for (const r of have) console.log(`  ${r.label} ${String(r.p).padEnd(7)} 보임 ${(r.vis*100).toFixed(0).padStart(3)}%  단추h${r.h} 칸h${r.tipH} 속h${r.scrollH}`);
console.log(`\n칸 ${have.length} · **아예 안 보임 ${gone}** · 일부만 ${part} · 다 보임 ${full}`);
console.log(`「사기」가 안 보이는 몫 ${((gone + part) / Math.max(1, have.length) * 100).toFixed(1)}%`);
console.log("errs", errs);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
