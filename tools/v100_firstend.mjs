/* V-100 — **처음 켠 사람의 «첫 판이 끝나는 자리»를 처음으로 본다.**
   V-99 는 처음 켠 사람이 마을에서 보는 것 여덟 장을 찍었다. 그런데 판을 한 번 돌리고
   나면 **반드시 보는** 화면이 하나 더 있다 — 정산이다. 여태 그 창을 찍은 자(run_end)는
   언제나 **물건 셋을 심어** 찍었다. 빈손으로 돌아온 사람이 보는 결(`.eEmpty` + runGrid)은
   한 번도 안 찍혔다([[play-it-before-measuring-it]]).
   node tools/v100_firstend.mjs [width] [height] [old]        (tmp/v100_*.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
const OLD = process.argv[4] === "old";
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
const ev = async (e) => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)); return r.result?.value; };
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* 심지 않는다 — 지운다. 처음 켠 사람의 자리로 되돌린다. */
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
if (OLD) await ev(`document.body.classList.add("v100old")`);

/* ★ 같은 못이 다른 창에도 빠져 있는지 **먼저** 본다([[carry-fixes-forward]]).
   `.grid` 를 쓰는 창은 넷 더 있다(상인·대장간·편성·운용). 대장간은 이미
   `justify-content:center` 로 못이 박혀 있고(hud.css 1966), 나머지는 칸 수가 줄에
   딱 맞는지 **재서** 안다 — 「맞겠지」로 넘기면 그게 안 옮긴 못이 된다. */
const OTHERGRID = `(()=>{
  const out=[];
  for (const [w,sel] of [["shop","#shopGrid"],["forge","#forgeGrid"],["doctrine","#docGrid"],["tactic","#tacGrid"]]) {
    window.__openWin(w);
    const g=document.querySelector(sel); if(!g){out.push(w+" 없다"); continue;}
    const cs=[...g.children].filter(c=>c.getBoundingClientRect().width>1);
    const gs=getComputedStyle(g), gb=g.getBoundingClientRect();
    const gl=gb.left+parseFloat(gs.paddingLeft||0), gr=gb.right-parseFloat(gs.paddingRight||0);
    const rows=new Map();
    cs.forEach(c=>{const r=c.getBoundingClientRect(); const k=Math.round(r.top); (rows.get(k)||rows.set(k,[]).get(k)).push(r);});
    let off=0; for(const [,rr] of rows){ const l=Math.min(...rr.map(r=>r.left)), r2=Math.max(...rr.map(r=>r.right));
      off=Math.max(off, Math.round(Math.abs((l+r2)/2-(gl+gr)/2))); }
    out.push(w+" 칸"+cs.length+" "+rows.size+"줄 밀림"+off+"px");
    window.__closeAll();
  }
  return out;})()`;
console.log("   다른 창의 좌판: " + (await ev(OTHERGRID)).join(" | "));
await wait(200);

/* 첫 판을 실제로 돌린다 — 심지 않고, 빈손으로 끝나는 그 판 그대로. */
await ev(`window.__toDungeon(); window.__S.speed = 8; 1`);
await wait(6000);
const before = await ev(`({floor:window.__S.floor, killed:window.__S.killed|0, loot:window.__S.loot.length})`);
await ev(`window.__die(); 1`); await wait(500);

/* 정산 창을 **글자가 그려진 자리**로 잰다 — 꼴이 아니라 줄이다. */
const LOOK = `(()=>{
  const R=e=>{const b=e.getBoundingClientRect();return {l:Math.round(b.left),t:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)};};
  const vis=e=>{const b=e.getBoundingClientRect(); if(b.width<1||b.height<1) return false;
    const cs=getComputedStyle(e); return !(cs.visibility==="hidden"||cs.display==="none"||cs.opacity==="0");};
  const out={};
  out.on=[...document.querySelectorAll(".win.on")].map(w=>w.id);
  const fr=document.querySelector("#winEnd .frame");
  out.frame=fr?R(fr):null;
  /* ① 창이 화면 밖으로 나가는가 · 속이 넘치는가 */
  const off=[],sp=[];
  document.querySelectorAll("#winEnd *").forEach(e=>{ if(!vis(e))return; const b=e.getBoundingClientRect();
    if(b.right>innerWidth+1||b.bottom>innerHeight+1||b.left<-1||b.top<-1) off.push((e.id||e.className||e.tagName)+" "+JSON.stringify(R(e)));
    if(e.scrollHeight>e.clientHeight+1&&e.clientHeight>0&&getComputedStyle(e).overflowY!=="visible") sp.push((e.id||e.className)+" ↕"+e.scrollHeight+">"+e.clientHeight);
    if(e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&getComputedStyle(e).overflowX!=="visible") sp.push((e.id||e.className)+" ↔"+e.scrollWidth+">"+e.clientWidth);});
  out.off=off.slice(0,8); out.spill=sp.slice(0,8);
  /* ② 「빈손」 결이 정말 섰는가 — 자취 넉 장 */
  out.empty=!!document.querySelector("#winEnd .eEmpty");
  out.runCells=[...document.querySelectorAll("#winEnd .cell.run")].map(c=>
    ((c.querySelector(".rLbl")||{}).textContent||"?")+" "+((c.querySelector(".rVal")||{}).textContent||"?"));
  /* ③ 자취 칸의 «값»이 칸 밖으로 삐져나오거나 이름과 갈라지는가 —
        값과 이름은 한 칸 안에서 서로 다른 줄이어야 옳고, 칸 밖은 틀렸다. */
  const bad=[];
  document.querySelectorAll("#winEnd .cell.run").forEach(c=>{
    const cb=c.getBoundingClientRect();
    [".rVal",".rLbl"].forEach(s=>{const e=c.querySelector(s); if(!e)return; const b=e.getBoundingClientRect();
      if(b.left<cb.left-.5||b.right>cb.right+.5||b.top<cb.top-.5||b.bottom>cb.bottom+.5)
        bad.push(s+" \\""+e.textContent.trim()+"\\" 칸밖 "+JSON.stringify(R(e))+" ⊄ "+JSON.stringify({l:Math.round(cb.left),t:Math.round(cb.top),w:Math.round(cb.width),h:Math.round(cb.height)}));
      if(e.scrollWidth>e.clientWidth+1) bad.push(s+" \\""+e.textContent.trim()+"\\" 잘림 "+e.scrollWidth+">"+e.clientWidth);});
  });
  out.cellBad=bad;
  /* ④ 부제 짝(label <b>값</b>)이 줄로 갈리는가 — V-99 의 자와 같은 물음 */
  const split=[];
  document.querySelectorAll("#endSub .eTally > span").forEach(s=>{
    const b=s.querySelector("b"), fc=s.firstChild;
    if(!b||!fc||fc.nodeType!==3||!(fc.textContent||"").trim())return;   /* 이름 없는 짝(「레벨 업!」)은 갈릴 수 없다 */
    const rg=document.createRange(); rg.setStart(fc,0); rg.setEnd(fc,Math.max(1,fc.textContent.length-1));
    const a=rg.getBoundingClientRect(), c=b.getBoundingClientRect();
    if(Math.abs(a.top-c.top)>2) split.push(s.textContent.trim());});
  out.split=split;
  out.sub=(document.getElementById("endSub").textContent||"").trim().replace(/\\s+/g," ");
  out.gold=(document.getElementById("endGold")||{}).textContent;
  const t=[]; document.querySelectorAll("#winEnd *").forEach(e=>{ if(!vis(e)||e.children.length)return;
    const s=(e.textContent||"").trim(); if(s)t.push(s);});
  out.text=t;
  return out;})()`;

/* ★ 자 — **좌판이 창 가운데에서 몇 px 밀렸는가.** 얻은 개수는 판마다 갈리므로
   (같은 씨앗도 같은 판이 아니다 [[same-seed-is-not-same-run]]) 여기서만 **개수를 심어**
   1·2·3·4·6·7 개를 차례로 세운다 — 여섯 칸 격자에서 몇 칸이 남느냐가 곧 밀림이다.
   칸 폭도 같이 재서 **고침이 칸을 안 건드렸음**을 같은 자로 보인다. */
const CENTER = (n) => `(()=>{
  const L=[];
  for(let i=0;i<${n};i++) L.push({k:"wand",tier:1,af:[],worn:true,gold:0,bagged:false,n:"x"+i,slot:"지팡이"});
  /* ★ __die() 를 다시 부르면 안 된다 — endRun 은 if(S.dead) return 이라 **아무 일도
     안 일어나고**, 자는 앞 판의 격자를 그대로 다시 잰다(0 이 나오는데 관찰이 아니다
     [[silent-zero-is-not-an-observation]]). 스냅샷만 갈아 끼우고 창을 다시 그린다. */
  window.__LASTRUN.loot=L; window.__openWin("end");
  const g=document.querySelector("#winEnd #endBody .grid");
  const cs=[...document.querySelectorAll("#winEnd #endBody .grid > .cell")];
  if(!g||!cs.length) return {n:${n},err:"없다"};
  const b=cs.map(c=>c.getBoundingClientRect());
  /* ★ 견주는 자리는 **틀이 아니라 좌판 제 그릇**이다 — 틀로 재면 창이 세로로 넘쳐
     두루마리 막대가 서는 자리(1280)에서 막대 폭의 절반이 「밀림」으로 새어 들어온다.
     그릇으로 재도 옛 결은 안 봐준다: 옛 결은 빈 칸을 «안 그려» 칸들이 왼쪽 몇
     칸에만 서고, 그릇은 늘 폭을 다 쓴다. */
  const gs=getComputedStyle(g), gb=g.getBoundingClientRect();
  const gl=gb.left+parseFloat(gs.paddingLeft||0), gr=gb.right-parseFloat(gs.paddingRight||0);
  /* ★ **줄마다** 잰다 — 한 덩어리로 재면 여섯이 넘어 꺾일 때(7개) 첫 줄이 폭을 다 써서
     둘째 줄의 외톨이가 왼끝에 붙어도 **가운데로 읽힌다**(옛 결이 0 을 받았다). */
  const rows=new Map();
  b.forEach(r=>{const k=Math.round(r.top); (rows.get(k)||rows.set(k,[]).get(k)).push(r);});
  let off=0;
  for(const [,rr] of rows){ const l=Math.min(...rr.map(r=>r.left)), r2=Math.max(...rr.map(r=>r.right));
    off=Math.max(off, Math.round(Math.abs((l+r2)/2-(gl+gr)/2))); }
  return {n:${n}, off, cellW:+b[0].width.toFixed(1), rows:rows.size};
})()`;
const cen = [];
for (const n of [1,2,3,4,6,7]) { cen.push(await ev(CENTER(n))); await wait(120); }
console.log("   좌판 밀림(px) · 칸폭 · 줄수: " + cen.map(c=>`${c.n}개 ${c.off}px/${c.cellW}px/${c.rows}줄`).join(" | "));
const offMax = Math.max(...cen.map(c=>c.off|0));

/* 눈으로 볼 한 장 — 처음 켠 사람이 흔히 받는 **셋**으로 찍는다(자가 아니라 그림이다). */
await ev(CENTER(3)); await wait(250);
await shot(`tmp/v100_loot3_${W}${OLD ? "_old" : ""}.png`);

/* 자를 잰 뒤 **빈손·전리품 그대로의 판**으로 되돌려 눈으로 볼 화면을 다시 세운다 */
await ev(`window.__LASTRUN.loot=[]; window.__openWin("end"); 1`); await wait(300);

const r = await ev(LOOK);
await shot(`tmp/v100_end_${W}${OLD ? "_old" : ""}.png`);
console.log(`── ${W}×${H}${OLD ? " (옛 결)" : ""} · 판: ${before.floor}층 · 잡은 수 ${before.killed} · 전리품 ${before.loot}`);
console.log("   뜬 창: " + (r.on || []).join(",") + " · 틀 " + JSON.stringify(r.frame));
console.log("   빈손 결: " + r.empty + " · 자취: " + (r.runCells || []).join(" | "));
console.log("   부제: " + r.sub + " · 가진 금 " + r.gold);
console.log("   화면밖 " + (r.off || []).length + (r.off?.length ? ": " + r.off.join(" | ") : ""));
console.log("   넘침 " + (r.spill || []).length + (r.spill?.length ? ": " + r.spill.join(" | ") : ""));
console.log("   칸밖·잘림 " + (r.cellBad || []).length + (r.cellBad?.length ? ": " + r.cellBad.join(" | ") : ""));
console.log("   갈린 짝 " + (r.split || []).length + (r.split?.length ? ": " + r.split.join(" | ") : ""));
console.log("   글: " + (r.text || []).join(" · ").slice(0, 600));
console.log("예외: " + (errs.length ? errs.join(" | ") : "없음"));
/* 판정은 **이 항목의 자**(밀림)로만 낸다 — 나머지 넷은 곁들여 본 것이라 따로 적는다.
   한 자에 여러 물음을 묶으면 어느 것이 울었는지 안 보인다. */
const other = (r.off || []).length + (r.spill || []).length + (r.cellBad || []).length + (r.split || []).length;
const fail = offMax > 1 ? 1 : 0;
console.log("   좌판 밀림 최대 " + offMax + "px (문턱 1px) · 곁들여 본 것 " + other + "건");
console.log(fail ? `판정: 미달 ${fail}` : "판정: 통과(문턱 0)");
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(fail ? 1 : 0);
