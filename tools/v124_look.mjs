/* V-124 탐색 — **켜서 본다.** V-122 가 「금으로 사는 창」(상인)의 수를 고쳤으니, 그 창과
   **같은 돌**이라고 스스로 적어 둔 형제 — 대장간을 같은 자로 본다([[carry-fixes-forward]]). */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v124_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;
  M.up={hp:12,mp:9,dmg:14,army:6};
  M.tree={bone:8,armor:5,ghoul:1,golem:1,elite:3,marrow:4,fury:2,rot:4,harvest:3,wand:6,swift:4,weaken:1,deep:1};
  C.syncSkills&&C.syncSkills();C.saveMeta();return M.up.dmg})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: URL }); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
console.log("씨앗 · 어둠의 힘 단계", await ev(SEED));
await S("Page.reload", { ignoreCache: true }); await wait(2600);

console.log("대장간", await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
  window.__openWin("forge");
  const w=document.getElementById("winForge");
  if(!w||!w.classList.contains('on')) throw new Error('창이 안 섰다: winForge');
  return 'ok'})()`));
await wait(600); await shot("forge_open");

for (const k of ["hp", "mp", "dmg", "army"]) {
  const info = await ev(`(()=>{const q=()=>document.querySelector('#forgeGrid [data-fpick=${JSON.stringify(k)}]');
    const c=q(); if(!c) return 'no cell'; c.click();
    if(!q()?.classList.contains('sel')) throw new Error('안 골렸다: ${k}');
    const t=document.getElementById('forgeTip');
    return t? t.innerText.replace(/\\n/g,' | ') : 'no tip';})()`);
  await wait(220);
  console.log("  " + k.padEnd(5) + " → " + info);
}
await shot("forge_dmg");
await S("Target.closeTarget", { targetId });
process.exit(0);
