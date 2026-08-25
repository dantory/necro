/* V-77b — **고른 칸의 테두리가 이름 글자를 밟나.**

     node tools/v78_selink.mjs [폭 높이]        (기본 1512×863)

   네모끼리 견주는 자로는 못 잰다 — `.tn` 은 상자가 글자보다 크고(line-height),
   테두리는 `outline` 이라 상자 밖에 있다. 그래서 **찍어서 줄(row)마다 잉크를 센다**:
     ① 테만 켠 판 − 둘 다 끈 판  → **테가 칠한 줄**
     ② 글자만 켠 판 − 둘 다 끈 판 → **글자가 칠한 줄**
     ③ 두 줄무리가 겹치는 줄 수 = 결함(px, CSS 기준)
   문턱은 **0** 이다 — 이름의 윗머리를 흰 줄이 가로지르면 안 읽힌다.
   ★ 되돌려 먼저 울려 본다([[pixel-verification-calibration]]) — `V78_OLD=1` 이면
     옛 값(margin-bottom 2px · outline-offset 3px)을 도로 넣고 잰다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
const OLD = process.env.V78_OLD === "1";
for (const t of (await (await fetch(CDP + "/json/list")).json()).filter(t => t.type === "page" && t.url.startsWith("http://127.0.0.1:8774")))
  await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId); const wait = ms => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });   /* ★ 캐시를 재지 않는다(tree_fit 의 그 사고) */
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(4200);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

await ev(`(()=>{ window.META.lv=60; window.syncTest&&window.syncTest();
  document.getElementById("winTree").classList.contains("on")||window.__openWin("tree"); })()`);
await wait(700);
if (OLD) await ev(`(()=>{ const s=document.createElement("style"); s.id="v78old";
  s.textContent=".tTile{margin-bottom:2px!important} .tNode.sel .tTile{outline-offset:3px!important}";
  document.head.appendChild(s); })()`);
await wait(250);

/* 판 넷을 같은 자리에서 찍는다 — 테/글자를 켜고 끄는 것은 **layout 을 안 흔드는** 길로만
   (`visibility` 와 `outline-color:transparent`). 자리가 흔들리면 줄을 못 견준다. */
const 판 = async (테, 글자) => {
  await ev(`(()=>{ let s=document.getElementById("v78sw"); if(!s){s=document.createElement("style");s.id="v78sw";document.head.appendChild(s);}
    s.textContent = "${테 ? "" : ".tNode.sel .tTile{outline-color:transparent!important}"} ${글자 ? "" : ".tNode.sel .tn{visibility:hidden!important}"}"; })()`);
  await wait(160);
  return (await S("Page.captureScreenshot", { format: "png" })).data;
};
const box = JSON.parse(await ev(`(()=>{ const n=document.querySelector("#treeCols .tNode.sel");
  if(!n) return JSON.stringify({없음:"sel"});
  const t=n.querySelector(".tTile").getBoundingClientRect(), s=n.querySelector(".tn").getBoundingClientRect();
  return JSON.stringify({이름:n.querySelector(".tn").textContent.trim(),
    l:Math.round(t.left)-8, w:Math.round(t.width)+16,
    y0:Math.round(t.bottom)-1, y1:Math.round(s.bottom)+2}); })()`));
if (box.없음) { console.log("고른 칸이 없다"); process.exit(1); }

const shots = { 없음: await 판(false, false), 테: await 판(true, false), 글자: await 판(false, true), 둘: await 판(true, true) };
const 줄 = JSON.parse(await ev(`(async()=>{
  const B=${JSON.stringify(box)};
  const load = async b64 => { const im=new Image(); im.src="data:image/png;base64,"+b64; await im.decode();
    const cv=document.createElement("canvas"); cv.width=im.width; cv.height=im.height;
    const cx=cv.getContext("2d"); cx.drawImage(im,0,0); return {cx, S:im.width/innerWidth}; };
  const P = {};
  for (const [k,v] of Object.entries(${JSON.stringify(shots)})) P[k]=await load(v);
  const S2 = P.없음.S;
  const grab = p => p.cx.getImageData(Math.round(B.l*S2), Math.round(B.y0*S2), Math.round(B.w*S2), Math.round((B.y1-B.y0)*S2)).data;
  const g = { 없음:grab(P.없음), 테:grab(P.테), 글자:grab(P.글자) };
  const rows = Math.round((B.y1-B.y0)*S2), cols = Math.round(B.w*S2);
  const cnt = (a,b) => { const out=[];
    for(let y=0;y<rows;y++){ let n=0;
      for(let x=0;x<cols;x++){ const i=(y*cols+x)*4;
        const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
        if(d>24) n++; }
      out.push(n); }
    return out; };
  const 테줄=cnt(g.테,g.없음), 글자줄=cnt(g.글자,g.없음);
  const px = y => +((B.y0 + y/S2) - (B.y0)).toFixed(2);
  const 겹침=[]; for(let y=0;y<rows;y++) if(테줄[y]>0 && 글자줄[y]>0) 겹침.push(y);
  const span = a => { const i=a.findIndex(v=>v>0), j=a.length-1-[...a].reverse().findIndex(v=>v>0);
    return i<0 ? null : {위:+px(i).toFixed(2), 아래:+px(j).toFixed(2)}; };
  return JSON.stringify({ S2, rows,
    테:span(테줄), 글자:span(글자줄),
    겹친줄:겹침.length, 겹침px:+(겹침.length/S2).toFixed(2),
    겹친자리:겹침.length? {위:+px(겹침[0]).toFixed(2), 아래:+px(겹침[겹침.length-1]).toFixed(2)}:null });
})()`));

const fs = await import("node:fs");
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync("tmp/v78_sel.png", Buffer.from(shots.둘, "base64"));
console.log(`창 ${W}×${H} · 고른 칸 「${box.이름}」${OLD ? "  (V78_OLD — 옛 값)" : ""}`);
console.log(`  칸 밑금부터 잰 자리(px):  테 ${줄.테 ? `${줄.테.위}~${줄.테.아래}` : "없음"}   글자 ${줄.글자 ? `${줄.글자.위}~${줄.글자.아래}` : "없음"}`);
console.log(`  겹친 줄 ${줄.겹친줄}  =  ${줄.겹침px}px${줄.겹친자리 ? `  (${줄.겹친자리.위}~${줄.겹친자리.아래})` : ""}`);
console.log(줄.겹친줄 === 0 ? "판정: ok — 테가 이름을 안 밟는다" : `판정: ✗ — 테가 이름을 ${줄.겹침px}px 밟는다 (문턱 0)`);
process.exit(줄.겹친줄 === 0 ? 0 : 1);
