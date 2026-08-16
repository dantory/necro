// necro UI 검수기 — CDP 9333 에 전용 탭을 새로 열어 세로 414x860@2x 로 재고 스크린샷을 남긴다.
//   node tools/cdp_verify.mjs <out.png> <mode>   mode: ui | inv | foot
const [,, OUT, MODE = "ui"] = process.argv;
if (!OUT || !/\.png$/i.test(OUT)) {
  // 예전에 `cdp_verify.mjs ui` 로 불러 리포 뿌리에 `ui` 라는 PNG 가 생긴 적이 있다.
  console.error("사용법: node tools/cdp_verify.mjs <out.png> <mode>   mode: ui | inv | foot");
  console.error("  첫 인자는 .png 로 끝나야 한다 (받은 값: " + JSON.stringify(OUT ?? null) + ")");
  process.exit(2);
}
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errors = [], netfail = [];
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  const M = m.method, P = m.params || {};
  if (M === "Runtime.exceptionThrown") errors.push("EXC " + (P.exceptionDetails?.exception?.description || P.exceptionDetails?.text || "?"));
  if (M === "Runtime.consoleAPICalled" && (P.type === "error" || P.type === "assert"))
    errors.push("CON " + (P.args || []).map(a => a.value ?? a.description ?? "").join(" "));
  if (M === "Log.entryAdded" && P.entry?.level === "error")
    errors.push("LOG " + P.entry.source + " " + P.entry.text + " " + (P.entry.url || ""));
  if (M === "Network.loadingFailed") netfail.push("FAIL " + P.errorText);
  if (M === "Network.responseReceived" && P.response?.status >= 400)
    netfail.push("HTTP " + P.response.status + " " + P.response.url);
});
await new Promise(r => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Log.enable"); await S("Network.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.bringToFront");
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 3500));

if (MODE === "foot") { await S("Runtime.evaluate", { expression: "window.S.speed=0; window.S.mobs.length=0; window.S.minions.length=0; window.S.fx.length=0;" }); await new Promise(r => setTimeout(r, 500)); }
if (MODE === "inv") { await S("Runtime.evaluate", { expression: "document.getElementById('winStat').classList.add('on')" }); await new Promise(r => setTimeout(r, 400)); }

const MEAS = `(function(){
  const q=s=>[...document.querySelectorAll(s)];
  const rr=el=>{const b=el.getBoundingClientRect();return {l:+b.left.toFixed(1),t:+b.top.toFixed(1),r:+b.right.toFixed(1),b:+b.bottom.toFixed(1),w:+b.width.toFixed(1),h:+b.height.toFixed(1)}};
  const orbs=q('.orb').map(rr), slots=q('.slot').map(rr);
  let overlap=false;
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){const a=slots[i],b=slots[j];
    if(Math.min(a.r,b.r)-Math.max(a.l,b.l)>1 && Math.min(a.b,b.b)-Math.max(a.t,b.t)>1)overlap=true;}
  const iw=innerWidth,ih=innerHeight;
  let g=window.__geo||null, gsrc='live';
  if(!g){const cv=document.getElementById('stage');const w=cv.clientWidth,h=cv.clientHeight;
    const RS=300,M=0.05,scByW=(w*(1-M*2))/(RS*2);
    const sq=Math.max(0.56,Math.min(0.86,(h*(1-M*2))/(RS*2*scByW)));
    const sc=Math.min(scByW,(h*(1-M*2))/(RS*2*sq));
    g={w,h,cx:w/2,cy:h*0.5,sc,squash:sq,us:Math.max(1,Math.min(1.85,sc/0.44)),ringW:2*RS*sc,ringH:2*RS*sc*sq};gsrc='formula';}
  let foot=null;
  try{const cv=document.getElementById('stage'),dpr=cv.width/cv.clientWidth,ctx=cv.getContext('2d');
    const cx=Math.round(g.cx*dpr), cy=Math.round(g.cy*dpr);
    const hnec=(58*g.us)*dpr, top=Math.round(cy-hnec), H=Math.round(hnec*1.25);
    const im=ctx.getImageData(cx-3,top,7,H),d=im.data,W=7; let low=-1;
    for(let y=H-1;y>=0&&low<0;y--)for(let x=0;x<W;x++){const p=(y*W+x)*4;
      if(d[p]>90||d[p+2]>45||d[p+1]>82){low=y;break;}}
    const footY=top+low;
    foot={footY,cy,hnec:+hnec.toFixed(1),distPx:Math.abs(footY-cy),distFracOfH:+(Math.abs(footY-cy)/hnec).toFixed(4),
      necroFootFrac:window.footMetrics?window.footMetrics('char/necro'):null,
      skelFootFrac:window.footMetrics?window.footMetrics('minion/skel'):null,
      golemFootFrac:window.footMetrics?window.footMetrics('minion/golem'):null};
  }catch(e){foot={err:String(e)}}
  return {iw,ih,orbCount:orbs.length,orbs,slotCount:slots.length,overlap,
    orbsInside:orbs.every(o=>o.b<=ih+0.5),
    slotsInside:slots.every(s=>s.b<=ih+0.5&&s.t>=-0.5&&s.l>=-0.5&&s.r<=iw+0.5),
    geoSource:gsrc,geo:g,ringWpct:+(g.ringW/g.w).toFixed(3),ringHpct:+(g.ringH/g.h).toFixed(3),foot};
})()`;
const ev = await S("Runtime.evaluate", { expression: MEAS, returnByValue: true });

let clip;
if (MODE === "foot") { const g = ev.result.value.geo; clip = { x: g.cx - 58, y: g.cy - 96, width: 116, height: 116, scale: 3 }; }
const shot = await S("Page.captureScreenshot", clip ? { format: "png", clip } : { format: "png" });
fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));

/* ══ 목록이 낡았나 ══ `assets/sprites.json` 은 손으로 다시 만들어야 하는 파일이라
   **에셋을 갈아 끼우고 잊으면 조용히 어긋난다** — 프레임이 늘었는데 안 불러오거나,
   줄었는데 404 가 다시 난다. 화면으로는 「좀 뻣뻣하네」 정도로만 보여서 못 잡는다.
   그래서 잴 때마다 디스크와 맞춰 본다. 어긋나면 `python3 tools/make_manifest.py`. */
const DIRS8 = ["east","south-east","south","south-west","west","north-west","north","north-east"];
const stale = [];
try {
  // ★ 이 파일 맨 위에서 URL 을 상수로 덮어써서 new URL() 이 안 된다 — dirname 을 쓴다
  const root = import.meta.dirname + "/../";
  const sheet = JSON.parse(fs.readFileSync(root + "assets/sprites.json", "utf8"));
  for (const [base, states] of Object.entries(sheet))
    for (const [state, c] of Object.entries(states))
      for (const d of DIRS8) {
        const want = typeof c === "number" ? c : (c[d] ?? 0);
        let n = 0;
        while (fs.existsSync(`${root}assets/${base}/${state}/${d}/${n}.png`)) n++;
        if (n !== want) stale.push(`${base}/${state}/${d}: 목록 ${want} · 디스크 ${n}`);
      }
} catch (e) { stale.push("목록을 못 읽음 — " + e.message); }

console.log(JSON.stringify({ mode: MODE, errors, netfail, manifestStale: stale, measure: ev.result.value }, null, 2));
await raw("Target.closeTarget", { targetId });
bws.close();
