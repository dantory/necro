/* V-122 탐색 — **켜서 본다.** V-121 이 가방 툴팁을 뜯었으니, 이번엔 **금을 쓰는 두 창**
   (상인 · 대장간)을 오래 논 사람으로 연다. 사는 것을 정하는 자리라 틀린 수는 그대로
   **잘못 산 물건**이 된다([[play-it-before-measuring-it]]). */
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
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v122_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

/* 오래 논 사람 — 34층까지 내려갔고 낀 것도 거기서 주웠다(깊이 곱이 붙어 있다). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.xp=200;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;M.relics=7;M.rebirths=2;
  M.up={hp:12,mp:9,dmg:14,army:6};M.plus={wand:9,robe:7,charm:5,helm:6,glove:4,ring:8};
  const ks=Object.keys(C.GEAR);
  ks.forEach(k=>{M.equip[k]=C.mkItem(k,C.GEAR[k].tiers.length-2,false,34)});
  M.bag=[];C.saveMeta();return ks.join(',')})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
console.log("씨앗", await ev(SEED));
await S("Page.reload", { ignoreCache: true }); await wait(2600);

/* 창을 연다 — 열렸는지 **자가 스스로 확인**한다(V-120 에서 배운 자리: __openWin 은 토글이다) */
const open = async (name, winId) => {
  const r = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    window.__openWin(${JSON.stringify(name)});
    const w=document.getElementById(${JSON.stringify(winId)});
    if(!w||!w.classList.contains('on')) throw new Error('창이 안 섰다: '+${JSON.stringify(winId)});
    return 'ok'})()`);
  await wait(700); return r;
};
const pick = async (label, sel, tipId) => {
  const info = await ev(`(()=>{const c=document.querySelector(${JSON.stringify(sel)});
    if(!c) return 'no cell'; if(c.offsetParent===null) return 'hidden';
    c.click();
    const f=document.getElementById(${JSON.stringify(tipId)});
    return f? f.innerText.replace(/\\n/g,' | ') : 'no tip';})()`);
  await wait(350); await shot(label);
  console.log("  " + label + " → " + info);
};

console.log("상인", await open("shop", "winShop"));
await shot("shop_open");
for (const k of ["wand", "helm", "robe", "ring"]) await pick("shop_" + k, `[data-pick="${k}"]`, "shopTip");
await pick("shop_dig", `[data-pick="dig"]`, "shopTip");

console.log("대장간", await open("forge", "winForge"));
await shot("forge_open");
for (const k of ["hp", "mp", "dmg", "army"]) await pick("forge_" + k, `[data-fpick="${k}"]`, "forgeTip");

await S("Target.closeTarget", { targetId });
process.exit(0);
