/* V-121 탐색 — **켜서 본다.** 창을 열고 끝나는 게 아니라, 사람이 제일 많이 읽는
   «물건 툴팁»(#ftip)을 오래 논 사람으로 하나씩 뜯어본다 — 낀 것 · 가방 것 ·
   유니크 · 빈 칸. 자가 아니라 «눈»이다([[play-it-before-measuring-it]]). */
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
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v121_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.xp=200;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;M.relics=7;M.rebirths=2;
  M.up={hp:12,mp:9,dmg:14,army:6};M.plus={wand:9,robe:7,charm:5,helm:6,glove:4,ring:8};
  const ks=["wand","robe","charm","helm","glove","ring"];
  ks.forEach((k,i)=>{M.equip[k]=C.mkItem(k,(C.GEAR[k].tiers.length-1)-(i%2),false,30)});
  M.bag=[];
  M.bag.push(C.mkItem("wand",C.GEAR.wand.tiers.length-1,true,34));   // 유니크
  M.bag.push(C.mkItem("helm",C.GEAR.helm.tiers.length-1,false,34));  // 더 좋은 것
  M.bag.push(C.mkItem("robe",1,false,3));                            // 훨씬 나쁜 것
  for(let i=0;i<9;i++){const k=ks[i%6];M.bag.push(C.mkItem(k,1+(i%(C.GEAR[k].tiers.length-1)),false,20+i))}
  C.saveMeta();return M.bag.length})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
console.log("씨앗 가방", await ev(SEED));
await S("Page.reload", { ignoreCache: true }); await wait(2600);

/* 능력치+가방 한 벌을 연다 — 툴팁은 이 두 창의 칸에서만 뜬다. */
console.log("창", await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
  window.__openWin('bag');
  const on=[...document.querySelectorAll('.win.on')].map(e=>e.id);return on.join(',')||'none'})()`));
await wait(800);
await shot("bag_open");

/* 칸을 «누른다» — 붙박이(pin) 툴팁이 화면에 뜬다(사람이 하는 그대로). */
const pick = async (label, sel) => {
  const info = await ev(`(()=>{const c=document.querySelector(${JSON.stringify(sel)});
    if(!c) return 'no cell';
    if(c.offsetParent===null) return 'hidden';
    c.click();
    const f=document.getElementById('ftip');
    if(!f||!f.classList.contains('on')) return 'no tip';
    const r=f.getBoundingClientRect();
    return JSON.stringify({txt:f.innerText.replace(/\\n/g,' | '),w:Math.round(r.width),h:Math.round(r.height),
      top:Math.round(r.top),bot:Math.round(r.bottom),vh:innerHeight});})()`);
  await wait(400);
  await shot(label);
  console.log("  " + label + " → " + info);
};
await pick("eq_wand", '[data-spick="wand"]');
await pick("bag_uniq", '[data-bpick="0"]');
await pick("bag_better", '[data-bpick="1"]');
await pick("bag_worse", '[data-bpick="2"]');
await S("Target.closeTarget", { targetId });
process.exit(0);
