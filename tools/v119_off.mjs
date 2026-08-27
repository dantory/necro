/* V-119 탐색 — **돌아온 사람이 맨 처음 보는 창**(오프라인 정산)을 켜서 본다.
   실제 길로 걷는다 — lastSeen 을 뒤로 밀고 새로 켠다([[probe-must-walk-the-real-path]]). */
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
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v119_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

const HOURS = +(process.argv[2] || 9);
const CORPSES = +(process.argv[3] || 60);
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.xp=200;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=${CORPSES};M.relics=7;M.rebirths=2;
  M.up={hp:12,mp:9,dmg:14,army:6};M.plus={wand:9,robe:7,charm:5,helm:6,glove:4,ring:8};
  const ks=["wand","robe","charm","helm","glove","ring"];
  ks.forEach((k,i)=>{M.equip[k]=C.mkItem(k,(C.GEAR[k].tiers.length-1)-(i%2),false,30)});
  C.saveMeta();
  /* saveMeta 가 lastSeen 을 now 로 올리므로 **그 뒤에** 손으로 뒤로 민다(localStorage 직접). */
  const key=Object.keys(localStorage).find(x=>/necro|meta|save/i.test(x));
  const o=JSON.parse(localStorage.getItem(key)); o.lastSeen=Date.now()-${HOURS}*3600e3;
  localStorage.setItem(key,JSON.stringify(o));
  return key+" lastSeen←-${HOURS}h"})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
console.log("  " + await ev(SEED));
await S("Page.reload", { ignoreCache: true }); await wait(2800);
await shot("off" + HOURS);
console.log("  창 " + await ev(`[...document.querySelectorAll('.win.on')].map(e=>e.id).join(',')||'none'`));
console.log("  글 " + JSON.stringify(await ev(`(document.getElementById('offBody')||{}).innerText||''`)));
await S("Target.closeTarget", { targetId });
process.exit(0);
