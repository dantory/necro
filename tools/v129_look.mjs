/* V-129 탐색 — **일지(⑦)를 켜서 본다.** 지금까지 창은 다 「마을에 선 사람」으로만 찍었다.
   일지의 진행도(questProg)는 **이 판의 신호(S.qrun)** 라 마을에서는 늘 0 이다 —
   그 줄이 판 안에서는 무엇으로 읽히는지를 같은 판에서 본다([[play-it-before-measuring-it]]). */
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
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v129_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

/* 심는 사람 — 몇 시간 논 사람(Lv.46 · 최고 34층). 일지는 **한 칸도 안 건드린다**(전부 아직). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.xp=200;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;M.relics=0;M.rebirths=0;
  M.up={hp:12,mp:9,dmg:14,army:6};M.plus={wand:9,robe:7,charm:5,helm:6,glove:4,ring:8};
  const ks=["wand","robe","charm","helm","glove","ring"];
  ks.forEach((k,i)=>{M.equip[k]=C.mkItem(k,(C.GEAR[k].tiers.length-1)-(i%2),false,30)});
  M.bag=[];C.saveMeta();return M.deepest})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

const readJ = `(()=>{const l=document.querySelector('.jList');if(!l)return {없음:1};
  return {글:l.innerText, 줄:[...l.querySelectorAll('.jRow')].map(r=>({이름:r.querySelector('.jN').textContent,진행:r.querySelector('.jP').textContent,깸:r.classList.contains('on')}))}})()`;

/* ① 마을에서 */
await ev(`window.__openWin('stat')`); await wait(800);
await shot("town"); const a = await ev(readJ);
console.log("① 마을  " + a.줄.map(r => r.이름 + " " + r.진행).join(" · "));
await ev(`window.__closeAll&&window.__closeAll()`); await ev(`document.querySelectorAll('.win.on').forEach(e=>e.classList.remove('on'))`);

/* ② 판 안에서 — 40초 걷고 나서 같은 창을 연다 */
await ev(`window.__toDungeon()`); await wait(40000);
const floor = await ev(`(()=>{const C=globalThis.__C;return {층:C.S.floor,qrun:JSON.stringify(C.S.qrun||{})}})()`);
await ev(`window.__openWin('stat')`); await wait(900);
await shot("run"); const b = await ev(readJ);
console.log("② 판안(" + floor.층 + "층 · qrun " + floor.qrun + ")  " + b.줄.map(r => r.이름 + " " + r.진행).join(" · "));

await raw("Target.closeTarget", { targetId }); bws.close(); process.exit(0);
