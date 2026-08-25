/* V-77b/V-78b — **칸에 두른 테가 이름 글자를 밟나.**

     node tools/v78_selink.mjs [폭 높이] [sel|some|full|all]     (기본 1512×863 · all)

   네모끼리 견주는 자로는 못 잰다 — `.tn` 은 상자가 글자보다 크고(line-height),
   테두리는 `outline`/`box-shadow` 라 **상자 밖**에 있다. 그래서 **찍어서 줄(row)마다
   잉크를 센다**:
     ① 테만 켠 판 − 둘 다 끈 판  → **테가 칠한 줄**
     ② 글자만 켠 판 − 둘 다 끈 판 → **글자가 칠한 줄**
     ③ 두 줄무리가 겹치는 줄 수 = 결함(px, CSS 기준)

   ★ 테가 둘이다 — **고름(sel)의 흰 outline** 과 **찍음(some/full)의 금 box-shadow**.
     둘은 성질이 다르다: 흰 테는 단단한 줄 하나뿐이라 「닿으면 곧 결함」이지만,
     금테는 단단한 줄(0 0 0 2~3px) 위에 **번짐(0 0 12~16px)** 이 얹혀 있어 아래로
     길게 흐른다. 번짐이 이름에 닿는 것은 후광이라 읽는 데 지장이 없다 —
     **가로로 칸을 꽉 채우는 줄**(단단한 줄)만 결함으로 센다(`강함` = 그 줄의 40% 이상).
     그래서 판정은 sel 은 「닿은 줄 0」, some/full 은 「단단한 줄이 겹침 0」이다.

   ★ 되돌려 먼저 울려 본다([[pixel-verification-calibration]]) — `V78_OLD=1` 이면
     옛 값(margin-bottom 2px · outline-offset 3px · full 테 3px 겹)을 도로 넣고 잰다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const 인자 = process.argv.slice(2);
const 모드칸 = 인자.find(a => /^(sel|some|full|all)$/.test(a)) || "all";
const 수 = 인자.filter(a => /^\d+$/.test(a));
const W = +(수[0] || 1512), H = +(수[1] || 863);
const OLDV = process.env.V78_OLD || "";
const OLD = OLDV === "1";            /* 칸↔이름 여백과 고름 테를 옛 값으로 */
const OLDFULL = OLD || OLDV === "full";  /* 찍음(full) 테만 옛 값으로 — 여백은 지금 것 */
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

/* 레벨 60 — 레벨 관문을 다 열어 **판이 매번 같은 자리에 선다**(Lv 딱지가 붙었다 말았다
   하면 칸이 흔들려 같은 좌표를 못 쓴다 · tree_contrast 와 같은 까닭). */
const MAX = { bone:5, armor:5, ghoul:1, golem:1, legion:3, rot:5, harvest:5, cheap:4, chain:3, feast:1,
              wand:5, swift:4, deep:4, spirit:4, dark:1 };
const 하나 = Object.fromEntries(Object.keys(MAX).map(k => [k, 1]));
const 세운다 = async tree => {
  await ev(`(()=>{ window.META.lv=60; window.META.tree=${JSON.stringify(tree)};
    window.syncTest&&window.syncTest();
    document.getElementById("winTree").classList.contains("on")||window.__openWin("tree");
    window.drawTree&&window.drawTree(); })()`);
  await wait(700);
};
if (OLD || OLDFULL) {
  await 세운다({});
  await ev(`(()=>{ const s=document.createElement("style"); s.id="v78old"; s.textContent=
    ${JSON.stringify(OLD ? ".tTile{margin-bottom:2px!important} .tNode.sel .tTile{outline-offset:3px!important}" : "")}
    /* V-78b 전의 찍음 테 — 밝은 2px 위에 어두운 금 3px 을 한 겹 더 둘렀다 */
    + ${JSON.stringify(OLDFULL ? ".tNode.full .tTile{box-shadow:0 0 0 2px #ffe6a8cc, 0 0 0 3px color-mix(in srgb, var(--br, #c8aa6e) 60%, #2a2010), 0 0 16px 2px color-mix(in srgb, var(--br, #c8aa6e) 55%, transparent)!important}" : "")};
    document.head.appendChild(s); })()`);
  await wait(250);
}

/* ※ 판 넷을 같은 자리에서 찍는다 — 테/글자를 켜고 끄는 것은 **layout 을 안 흔드는** 길로만
   (`visibility` · `outline-color:transparent` · `box-shadow:none` — 셋 다 자리를 안 옮긴다).
   자리가 흔들리면 줄을 못 견준다. */
/* 한 칸을 잰다.

   ★ **번짐과 심을 갈라야 한다.** 금테는 `box-shadow` 층이 둘이다 — 칸을 두르는
     **심**(blur 0 · `0 0 0 2~3px`)과 아래로 흐르는 **번짐**(blur 12~16px). 번짐이
     이름에 닿는 것은 후광이라 읽는 데 지장이 없고, 이름을 자르는 것은 심이다.
     「가로로 넓게 칠했나」로는 못 가른다 — 번짐도 칸 폭을 다 덮는다(실측: 심 2px 인
     칸에서 「넓은 줄」이 9.5px 까지 나왔다). 그래서 **심만 남긴 판을 따로 찍는다** —
     computed box-shadow 를 층으로 쪼개 blur 0 인 층만 도로 넣는다(색을 손으로 안 적는다).
   `테모드`: "off"(테 없음) · "on"(그대로) · "hard"(심만). */
const 재기 = async (칸, 종, 끄기) => {
  const box = JSON.parse(await ev(`(()=>{ const n=document.querySelector('#treeCols [data-tn="${칸}"]');
    if(!n) return JSON.stringify({없음:"${칸}"});
    const t=n.querySelector(".tTile").getBoundingClientRect(), s=n.querySelector(".tn").getBoundingClientRect();
    /* box-shadow 를 층으로 쪼갠다 — 괄호 밖의 쉼표에서만 자른다(rgb(...) 안에도 쉼표가 있다) */
    const cs=getComputedStyle(n.querySelector(".tTile")).boxShadow||"none";
    let d=0, cur="", 층=[];
    for(const ch of cs){ if(ch==="(") d++; else if(ch===")") d--;
      if(ch==="," && d===0){ 층.push(cur.trim()); cur=""; } else cur+=ch; }
    if(cur.trim()) 층.push(cur.trim());
    /* 길이가 넷이면 <x y blur spread>, 셋이면 <x y blur> — blur 는 늘 셋째 길이다 */
    const 심 = 층.filter(L=>{ const m=L.match(/(-?[\\d.]+)px/g)||[]; return m.length>=3 && parseFloat(m[2])===0; });
    return JSON.stringify({이름:n.querySelector(".tn").textContent.trim(),
      l:Math.round(t.left)-8, w:Math.round(t.width)+16, 칸폭:Math.round(t.width),
      y0:Math.round(t.bottom)-1, y1:Math.round(s.bottom)+2, 위:Math.round(t.top)-4,
      층수:층.length, 심: 심.length? 심.join(", ") : "none"}); })()`));
  if (box.없음) return { 없음: 칸 };
  const 스위치 = async (테모드, 글자) => {
    const 테CSS = 테모드 === "off" ? 끄기
                : 테모드 === "hard" ? (종 === "sel" ? "" : `#treeCols [data-tn="${칸}"] .tTile{box-shadow:${box.심}!important}`)
                : "";
    await ev(`(()=>{ let s=document.getElementById("v78sw"); if(!s){s=document.createElement("style");s.id="v78sw";document.head.appendChild(s);}
      s.textContent = ${JSON.stringify(테CSS)} + (${글자} ? "" : ' [data-tn="${칸}"] .tn{visibility:hidden!important} '); })()`);
    await wait(160);
    return (await S("Page.captureScreenshot", { format: "png" })).data;
  };
  const shots = { 없음: await 스위치("off", false), 테: await 스위치("on", false),
                  심: await 스위치("hard", false), 글자: await 스위치("off", true),
                  둘: await 스위치("on", true) };
  const 줄 = JSON.parse(await ev(`(async()=>{
    const B=${JSON.stringify(box)};
    const load = async b64 => { const im=new Image(); im.src="data:image/png;base64,"+b64; await im.decode();
      const cv=document.createElement("canvas"); cv.width=im.width; cv.height=im.height;
      const cx=cv.getContext("2d"); cx.drawImage(im,0,0); return {cx, S:im.width/innerWidth}; };
    const P = {};
    for (const [k,v] of Object.entries(${JSON.stringify(shots)})) P[k]=await load(v);
    const S2 = P.없음.S;
    const grab = p => p.cx.getImageData(Math.round(B.l*S2), Math.round(B.y0*S2), Math.round(B.w*S2), Math.round((B.y1-B.y0)*S2)).data;
    const g = { 없음:grab(P.없음), 테:grab(P.테), 심:grab(P.심), 글자:grab(P.글자) };
    const rows = Math.round((B.y1-B.y0)*S2), cols = Math.round(B.w*S2);
    const cnt = (a,b) => { const out=[];
      for(let y=0;y<rows;y++){ let n=0;
        for(let x=0;x<cols;x++){ const i=(y*cols+x)*4;
          const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
          if(d>24) n++; }
        out.push(n); }
      return out; };
    const 테줄=cnt(g.테,g.없음), 심줄=cnt(g.심,g.없음), 글자줄=cnt(g.글자,g.없음);
    const px = y => +(y/S2).toFixed(2);
    const 겹침=[], 심겹침=[];
    for(let y=0;y<rows;y++){ if(글자줄[y]>0){ if(테줄[y]>0) 겹침.push(y); if(심줄[y]>0) 심겹침.push(y); } }
    const span = a => { const i=a.findIndex(v=>v>0), j=a.length-1-[...a].reverse().findIndex(v=>v>0);
      return i<0 ? null : {위:+px(i).toFixed(2), 아래:+px(j).toFixed(2)}; };
    return JSON.stringify({ S2, 층수:B.층수, 심CSS:B.심,
      테:span(테줄), 심:span(심줄), 글자:span(글자줄),
      겹친줄:겹침.length, 겹침px:+(겹침.length/S2).toFixed(2),
      심겹침줄:심겹침.length, 심겹침px:+(심겹침.length/S2).toFixed(2) });
  })()`));
  /* ★ 조용한 0 을 막는다 — 글자를 껐는데 아무 줄도 안 갈렸으면 **잰 것이 아니라
     스위치가 안 먹은 것**이다([[silent-zero-is-not-an-observation]] · 실제로 한 번 겪었다). */
  if (!줄.글자) throw new Error(`${칸}: 글자 판이 안 갈렸다 — 스위치가 안 먹었다(잰 값을 믿지 말 것)`);
  /* ★ 자만 보지 말고 **켜서 본다** — `V78_CROP=1` 이면 그 칸만 4배로 도려 낸다 */
  let crop = null;
  if (process.env.V78_CROP === "1") crop = await ev(`(async()=>{
    const B=${JSON.stringify(box)};
    const im=new Image(); im.src="data:image/png;base64,${shots.둘}"; await im.decode();
    const S2=im.width/innerWidth, Z=4;
    const w=Math.round(B.w*S2), h=Math.round((B.y1-B.위)*S2);
    const cv=document.createElement("canvas"); cv.width=w*Z; cv.height=h*Z;
    const cx=cv.getContext("2d"); cx.imageSmoothingEnabled=false;
    cx.drawImage(im, Math.round(B.l*S2), Math.round(B.위*S2), w, h, 0,0, w*Z, h*Z);
    return cv.toDataURL("image/png").split(",")[1]; })()`);
  return { 칸, 이름: box.이름, 종류: 종, 줄, shot: shots.둘, crop };
};

const fs = await import("node:fs");
fs.mkdirSync("tmp", { recursive: true });
const 할것 = 모드칸 === "all" ? ["sel", "some", "full"] : [모드칸];
let 나쁨 = 0;
console.log(`창 ${W}×${H}${OLDV ? `   (V78_OLD=${OLDV} — 옛 값)` : ""}`);
for (const 종 of 할것) {
  if (종 === "sel") { if (!(OLD || OLDFULL)) await 세운다({}); }
  else await 세운다(종 === "some" ? 하나 : MAX);
  /* 잴 칸을 고른다 — **고름(sel)이 겹친 칸은 뺀다.** 흰 테와 금테가 같이 나오면
     어느 쪽이 이름을 밟았는지 못 가른다. */
  const 칸 = await ev(`(()=>{ const n=[...document.querySelectorAll("#treeCols .tNode.${종}")]
    .filter(n=>${종 === "sel" ? "true" : "!n.classList.contains('sel')"} && n.querySelector(".tn") && n.getBoundingClientRect().width>0
              && n.getBoundingClientRect().top>0 && n.getBoundingClientRect().bottom<innerHeight-4)[0];
    return n ? n.getAttribute("data-tn") : ""; })()`);
  if (!칸) { console.log(`  ${종}: 그런 칸이 없다`); 나쁨++; continue; }
  const 끄기 = 종 === "sel"
    ? `#treeCols [data-tn="${칸}"] .tTile{outline-color:transparent!important}`
    : `#treeCols [data-tn="${칸}"] .tTile{box-shadow:none!important}`;
  const r = await 재기(칸, 종, 끄기);
  if (r.없음) { console.log(`  ${종}: 칸 ${r.없음} 을 못 찾았다`); 나쁨++; continue; }
  fs.writeFileSync(`tmp/v78_${종}.png`, Buffer.from(r.shot, "base64"));
  if (r.crop) fs.writeFileSync(`tmp/v78_${종}_crop${OLDV ? "_old" : ""}.png`, Buffer.from(r.crop, "base64"));
  const z = r.줄;
  /* 판정은 **심**으로 한다 — sel 은 심이 곧 테(outline)라 예전 값과 같은 수가 나온다. */
  const 문턱 = z.심겹침줄, 값 = z.심겹침px;
  if (문턱 > 0) 나쁨++;
  console.log(`  ${종.padEnd(4)} 「${r.이름}」 (${칸})   그림자 ${z.층수}층 · 심 ${z.심CSS === "none" ? "없음(outline)" : z.심CSS}`);
  console.log(`      칸 밑금부터(px):  테 전부 ${z.테 ? `${z.테.위}~${z.테.아래}` : "없음"}` +
              `  ·  그 중 심 ${z.심 ? `${z.심.위}~${z.심.아래}` : "없음"}` +
              `   글자 ${z.글자.위}~${z.글자.아래}`);
  console.log(`      이름에 닿음:  전부 ${z.겹침px}px  ·  **심 ${z.심겹침px}px**`);
  console.log(`      ${문턱 === 0 ? "ok — 심이 이름을 안 밟는다" : `✗ — 심이 이름을 ${값}px 밟는다 (문턱 0)`}`);
}
console.log(나쁨 === 0 ? "판정: ok — 어느 테도 이름을 안 밟는다" : `판정: ✗ — ${나쁨} 곳에서 테가 이름을 밟는다`);
process.exit(나쁨 === 0 ? 0 : 1);
