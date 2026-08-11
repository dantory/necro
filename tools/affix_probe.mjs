/* 붙는 옵션이 **뜻대로 붙는가** — 판을 굴리지 않고 물건만 수천 개 뽑아서 잰다.
   눈으로 보는 검수(drop_probe)와 짝이다. 저건 「보이나」, 이건 「값이 맞나」.

   재는 것 넷:
     ① 등급별 옵션 개수 — 높을수록 많아야 한다(1등급 0~1 … 4등급 3)
     ② 같은 등급 안에서 점수가 **갈리는가** — 안 갈리면 랜덤을 넣은 뜻이 없다
     ③ 등급이 여전히 뼈대인가 — 옵션 셋(≈90)이 한 등급(100)을 넘으면 안 된다
     ④ **옛 세이브가 올라오는가** — 등급 숫자만 있던 저장이 개체가 되어야 한다

     node tools/affix_probe.mjs [out.png] */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || ""));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");

/* ★ 옛 세이브를 **먼저 심는다** — 페이지가 뜨기 전에 넣어야 load() 가 그것을 읽는다.
   등급 숫자만 있고 equip 이 없는, 지난 판까지의 저장 그대로다. */
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1500));
await S("Runtime.evaluate", { expression:
  `localStorage.setItem("necro.meta.v1", JSON.stringify({gold:5000,lv:9,deepest:12,up:{hp:2,mp:1,dmg:3,army:0},gear:{wand:3,robe:2,charm:1},tree:{}}))` });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 3, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  const out = {};
  // ④ 옛 세이브가 올라왔나
  out.옛세이브 = { equip: ["wand","robe","charm"].map(k=>C.gearTier(k)).join(","),
                   gear지워짐: C.META.gear === undefined,
                   체력: C.hpMaxOf(), 마나회복: +C.mpRegenOf().toFixed(2) };
  // ①②③ 물건을 많이 뽑아 본다 — 층은 20층(모든 등급이 나오는 깊이)
  const by = {1:[],2:[],3:[],4:[]}, afn = {1:[],2:[],3:[],4:[]}, seen = {};
  for (let i=0;i<4000;i++){
    const it = C.rollDrop(20);
    by[it.tier].push(C.scoreOf(it)); afn[it.tier].push(it.af.length);
    for (const a of it.af) seen[a.id] = (seen[a.id]||0)+1;
  }
  const st = (a)=>({ n:a.length, 최소:Math.round(Math.min(...a)), 최대:Math.round(Math.max(...a)),
                     평균:Math.round(a.reduce((x,y)=>x+y,0)/a.length) });
  out.등급별점수 = {}; out.등급별옵션수 = {};
  for (const t of [1,2,3,4]) if (by[t].length) {
    out.등급별점수[t] = st(by[t]);
    out.등급별옵션수[t] = +(afn[t].reduce((x,y)=>x+y,0)/afn[t].length).toFixed(2);
  }
  out.옵션분포 = seen;
  // ③ 옵션이 등급을 뒤집는가 — 3등급 최대가 4등급 최소를 넘으면 「등급이 뼈대」가 깨진다
  out.등급뒤집힘 = Math.max(...by[3]) > Math.min(...by[4]);
  out.옵션몫_최대 = Math.round(Math.max(...by[4]) - 400);       // 4등급 바탕 400 위로 얼마나
  // ② 같은 등급 안에서 갈리나 — 4등급 점수의 최대/최소 비
  out.같은등급_점수폭 = +(Math.max(...by[4]) / Math.min(...by[4])).toFixed(2);
  // 이름이 붙나
  const s = C.mkItem("wand",4); out.보기 = { 이름: C.nameOf(s), 옵션: s.af.map(a=>C.afText(a)), 점수: Math.round(C.scoreOf(s)) };
  out.군세최대 = Math.max(...Array.from({length:3000},()=>{const x=C.mkItem("robe",4);return (x.af.find(a=>a.id==="army")?.v)||0;}));
  // 자동 착용이 **점수로** 판단하나 — 옵션 좋은 3등급 vs 맨 4등급
  C.META.equip.wand = C.mkItem("wand", 4, true);
  const rich = { k:"wand", tier:3, af:[{id:"dmg",v:36},{id:"mdmg",v:44},{id:"army",v:1}] };
  const before = C.scoreOf(C.equipped("wand"));
  const r = C.takeDrop(rich);
  out.점수로판단 = { 맨4등급: Math.round(before), 좋은3등급: Math.round(C.scoreOf(rich)),
                     갈아낌: r.worn };
  return JSON.stringify(out);
})()`;
const r = await S("Runtime.evaluate", { expression: ex, awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(JSON.parse(r.result.value), null, 1));

/* 상점을 열어 **붙은 것이 화면에 보이는지** 찍는다 */
await S("Runtime.evaluate", { expression:
  `(async()=>{const C=await import("/js/core.js");
    C.META.equip.wand=C.mkItem("wand",3); C.META.equip.robe=C.mkItem("robe",4);
    C.META.equip.charm=C.mkItem("charm",2); C.META.gold=9000; C.saveMeta();
    window.__openWin && window.__openWin("shop");})()`, awaitPromise: true });
await new Promise(r => setTimeout(r, 800));
const shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(process.argv[2] || "/tmp/affix_probe.png", Buffer.from(shot.data, "base64"));
console.log("errors:", errs.slice(0, 4), "netfail:", netfail.slice(0, 4));
await raw("Target.closeTarget", { targetId }); bws.close();
