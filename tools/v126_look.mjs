/* V-126 켜서 보기 — **싸움 판 위에 뜨는 글**을 처음으로 본다.
   V-99~V-113 이 창 열둘을, V-114 가 흐르는 글을, V-103 이 밑자락을 봤다. 아직 아무도 안 본
   것이 **판 한가운데** — 떠오르는 피해 수치 · 적 이름표 · 보스 띠다([[play-it-before-measuring-it]]). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OUT = "tmp/";
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
const ev = async e => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)); return r.result?.value; };
const fs = await import("node:fs");
const shot = async (name) => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(OUT + name, Buffer.from(data, "base64")); console.log("  찍음 " + OUT + name); };

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: URL }); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(`(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.gold=1820000;M.deepest=34;M.best=34;
  M.up={hp:12,mp:9,dmg:14,army:6};
  M.tree={bone:8,armor:5,ghoul:1,golem:1,elite:3,marrow:4,weaken:1,decrep:1,rot:4,wand:6};
  C.syncSkills&&C.syncSkills();C.saveMeta();return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);

/* 어디부터 → 깊은 층으로 내려간다. */
const started = await ev(`(()=>{
  const b=[...document.querySelectorAll('button,.btn')].find(e=>/내려가|시작|출발/.test(e.innerText||''));
  if(b){b.click();return 'btn:'+b.innerText.trim();}
  return 'none';})()`);
console.log("  들머리 " + started);
await wait(1500);
const st2 = await ev(`(()=>{const w=document.getElementById('winDive');
  if(w&&w.classList.contains('on')){
    const o=[...w.querySelectorAll('[data-dive]')]; const last=o[o.length-1]; if(last)last.click();
    const g=[...w.querySelectorAll('button,.btn')].find(e=>/내려가|시작/.test(e.innerText||''));
    if(g){g.click(); return '깊은 층으로';}
  }
  return '창 없음';})()`);
console.log("  " + st2);
await wait(4000);
console.log("  지금 " + await ev(`(()=>{const h=document.getElementById('hDepth')||document.querySelector('.depth');return (h?h.innerText:'?')+' | at='+(globalThis.__C&&'')})()`));
await shot("v126_fight1.png");
await wait(6000); await shot("v126_fight2.png");
await wait(8000); await shot("v126_fight3.png");
/* 판 위에 실제로 뜬 글을 그대로 받아 본다. */
const txt = await ev(`(()=>{const r=[];
  for(const sel of ['.fly','#flyLayer','.enemyName','.nameTag','#bossBar','.hpTag','.dmg','.pop']){
    document.querySelectorAll(sel).forEach(e=>r.push(sel+' :: '+(e.innerText||'').replace(/\\n/g,' ').slice(0,80)));
  }
  return r.slice(0,30);})()`);
console.log("  판 위 글 " + txt.length + "건"); txt.forEach(t=>console.log("      "+t));
await raw("Target.closeTarget", { targetId }); bws.close();
