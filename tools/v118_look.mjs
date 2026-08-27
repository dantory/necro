/* V-118 탐색 — **켜서 본다.** 오래 논 사람을 심고 마을→표→던전을 걸으며 여섯 자리를 찍는다.
   자가 아니라 «눈»이다 — 결함을 찾으려고 돌린다([[play-it-before-measuring-it]]). */
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
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v118_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.xp=200;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;M.relics=7;M.rebirths=2;
  M.up={hp:12,mp:9,dmg:14,army:6};M.plus={wand:9,robe:7,charm:5,helm:6,glove:4,ring:8};
  const ks=["wand","robe","charm","helm","glove","ring"];
  ks.forEach((k,i)=>{M.equip[k]=C.mkItem(k,(C.GEAR[k].tiers.length-1)-(i%2),false,30)});
  M.bag=[];for(let i=0;i<20;i++){const k=ks[i%6];M.bag.push(C.mkItem(k,1+(i%(C.GEAR[k].tiers.length-1)),false,30))}
  C.saveMeta();return M.gold})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

await shot("1_town");
console.log("마을 " + await ev(`(()=>{const C=globalThis.__C;return JSON.stringify({floor:C.S.floor,gold:C.META.gold,lv:C.META.lv})})()`));

await ev(`(()=>{const g=document.getElementById('goGate');if(g)g.click();return 1})()`); await wait(900);
await shot("2_dive");
await ev(`(()=>{const rows=[...document.querySelectorAll('#winDive .wayRow,#winDive [data-way],#winDive .cell')].filter(r=>!r.classList.contains('lock'));const last=rows.pop();if(last)last.click();return rows.length})()`);
await wait(350);
await ev(`(()=>{const b=[...document.querySelectorAll('#winDive button')].find(x=>!/나가기|그만/.test(x.textContent));if(b)b.click();return 1})()`);
await wait(4000);
await shot("3_dun05s");
await wait(25000);
await shot("4_dun30s");
await ev(`(()=>{const b=document.getElementById('btnInv')||[...document.querySelectorAll('button')].find(x=>/가방|인벤/.test(x.textContent));if(b)b.click();return 1})()`); await wait(700);
await shot("5_inv");
await ev(`(()=>{document.querySelectorAll('.win').forEach(w=>w.classList.remove('on'));const c=globalThis.__C;return 1})()`);
await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/능력치|캐릭/.test(x.textContent));if(b)b.click();return 1})()`); await wait(700);
await shot("6_stat");
console.log("판 " + await ev(`(()=>{const C=globalThis.__C,S=C.S;return JSON.stringify({floor:S.floor,t:Math.round(S.t),hp:Math.round(S.hp),hpMax:Math.round(C.hpMaxOf?C.hpMaxOf():0),army:(S.minions||[]).length,gold:C.META.gold})})()`));
await S("Target.closeTarget", { targetId });
process.exit(0);
