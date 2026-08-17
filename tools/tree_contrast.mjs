/* **찍은 칸이 안 찍은 칸보다 정말 밝은가** — 병수님 2026-08-17: "④ 찍은 칸과 안 찍은
   칸의 대비가 약하다 — D2 는 찍은 것이 환하게 밝다."

     node tools/tree_contrast.mjs [out.png]

   ★ 「약하다」는 느낌이므로 **자를 먼저 세운다**([[cause-written-in-the-item-is-a-guess]]).
   ★★ **첫 자는 틀린 자였다**(2026-08-18 01:0x). 상태별로 「찍은 칸들」과 「안 찍은 칸들」의
     평균 밝기를 견줬더니 1.8 배가 나와 **통과**로 떴다 — 그런데 그 1.8 은 상태가 아니라
     **그림이 서로 달라서** 난 수다(구울 그림은 어둡고 뼈 그림은 밝다). 견주는 두 무리가
     다른 칸이면 그 자는 상태를 못 잰다([[threshold-and-ruler-must-match]]).
     그래서 **같은 칸을 두 번 찍어** 견준다 — 0점 판과 찍은 판. 그림이 상수가 되므로
     남는 차이가 곧 **상태가 만든 차이**다.

   재는 것:
     ① 같은 칸의 **0점 → 1점 → 최대** 평균 밝기(WCAG 상대휘도)
     ② 칸 전체 · 그림 자리(가운데 34px) · **테두리 자리**(위 6px)를 따로.
        테두리가 갈려야 그림이 어두운 칸에서도 「찍었다」가 읽힌다.
   문턱: 같은 칸의 **찍음 대 0점**이 칸 전체 **1.35 배** 이상 · **테두리 1.25 배** 이상.
   지금 바닥은 1.0 배(똑같은 그림)이라 문턱이 멀다([[floor-far-from-threshold]]). */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || "tmp/tree_contrast.png";
const fs = await import("node:fs");
for (const t of (await (await fetch(CDP + "/json/list")).json()).filter(t => t.type === "page" && t.url.startsWith("http://127.0.0.1:8774")))
  await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId); const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await wait(4200);

/* 레벨 60 — 레벨 관문을 다 열어 **판이 세 번 다 같은 자리에 선다**(Lv 딱지가 붙었다
   말았다 하면 칸이 흔들려 같은 좌표를 못 쓴다). */
const 판 = async (tree, lv = 60) => {
  await S("Runtime.evaluate", { expression: `(()=>{
    window.META.lv = ${lv}; window.META.tree = ${JSON.stringify(tree)};
    window.syncTest && window.syncTest();
    document.getElementById("winTree").classList.contains("on") || window.__openWin("tree");
    window.drawTree && window.drawTree();
  })()` });
  await wait(450);
  const cells = JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: `(()=>{
    const out=[...document.querySelectorAll("#treeCols .tNode")].map(n=>{
      const t=n.querySelector(".tTile"), b=t.getBoundingClientRect();
      const st=["full","some","open","lock"].find(c=>n.classList.contains(c))||"?";
      return {id:n.getAttribute("data-tn"), 상태:st, sel:n.classList.contains("sel"),
        l:b.left, t:b.top, w:b.width, h:b.height};
    }).filter(c=>c.w>0 && c.t>0 && c.t<innerHeight-10);
    return JSON.stringify(out);
  })()` })).result.value);
  const shot = await S("Page.captureScreenshot", { format: "png" });
  /* 밝기는 **찍은 화면에서** 잰다 — css 값을 읽으면 겹친 것(테 그림·발광)을 놓친다 */
  const lum = JSON.parse((await S("Runtime.evaluate", { returnByValue: true, awaitPromise: true, expression: `(async()=>{
    const im = new Image(); im.src = "data:image/png;base64,${shot.data}"; await im.decode();
    const cv = document.createElement("canvas"); cv.width=im.width; cv.height=im.height;
    const cx = cv.getContext("2d"); cx.drawImage(im,0,0);
    const S2 = im.width / innerWidth;
    const lin = v => { v/=255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    function sumL(l,t,w,h){
      const d = cx.getImageData(Math.round(l*S2), Math.round(t*S2), Math.max(1,Math.round(w*S2)), Math.max(1,Math.round(h*S2))).data;
      let s=0,n=0;
      for(let i=0;i<d.length;i+=4){ s += 0.2126*lin(d[i]) + 0.7152*lin(d[i+1]) + 0.0722*lin(d[i+2]); n++; }
      return {s,n};
    }
    const meanL = (l,t,w,h) => { const {s,n}=sumL(l,t,w,h); return s/n; };
    /* 「테」는 **칸을 두르는 띠 전체**다 — 바깥 상자에서 속 상자를 뺀 도넛(네 변 모두).
       ★ 처음엔 「칸 위쪽 한 줄」로 쟀다. 그런데 뿌리 칸(뼈의 힘·부패·뼈 다루기) 위는
         **붙어 있는 머리글**이라 그 줄이 머리글 배경으로 채워졌고, 테에 불을 넣어도
         눈금이 1.06 에서 안 움직였다 — 자가 딴 데를 보고 있었다. */
    function ringL(l,t,w,h){
      const o = sumL(l-4, t-4, w+8, h+8), i = sumL(l+6, t+6, Math.max(1,w-12), Math.max(1,h-12));
      return (o.s - i.s) / Math.max(1, o.n - i.n);
    }
    return JSON.stringify(${JSON.stringify(cells)}.map(c=>({id:c.id, 상태:c.상태, sel:c.sel,
      칸:+meanL(c.l,c.t,c.w,c.h).toFixed(4),
      그림:+meanL(c.l+c.w/2-17, c.t+c.h/2-17, 34, 34).toFixed(4),
      테:+ringL(c.l, c.t, c.w, c.h).toFixed(4)})));
  })()` })).result.value);
  return { lum, shot: shot.data };
};

const MAX = { bone:5, armor:5, ghoul:1, golem:1, legion:3, rot:5, harvest:5, cheap:4, chain:3, feast:1,
              wand:5, swift:4, deep:4, spirit:4, dark:1 };
const 하나 = Object.fromEntries(Object.keys(MAX).map(k => [k, 1]));

const 영 = await 판({});                       // 아무것도 안 찍은 판 — 뿌리 셋만 열림, 나머지 잠김
const 사슬 = await 판({ bone:1, rot:1, wand:1 }); // 뿌리만 찍은 판 — 둘째 칸 셋이 **열린다**
const 일 = await 판(하나);                      // 전부 1점
const 만 = await 판(MAX);                       // 전부 최대
fs.writeFileSync(OUT, Buffer.from(만.shot, "base64"));

const 짝 = (a, b) => {                          // **같은 칸끼리** 견준다
  const B = Object.fromEntries(b.lum.map(c => [c.id, c]));
  const rows = a.lum.filter(c => B[c.id] && !c.sel && !B[c.id].sel).map(c => {
    const y = B[c.id];
    const r = (k) => +((y[k] + 0.05) / (c[k] + 0.05)).toFixed(3);
    return { id: c.id, 전: c.상태, 후: y.상태, 칸비: r("칸"), 그림비: r("그림"), 테비: r("테") };
  });
  const m = (k) => +(rows.reduce((s, x) => s + x[k], 0) / rows.length).toFixed(3);
  const lo = (k) => +Math.min(...rows.map(x => x[k])).toFixed(3);
  return { 칸수: rows.length, 칸비: m("칸비"), 그림비: m("그림비"), 테비: m("테비"),
    최저칸비: lo("칸비"), 최저테비: lo("테비"), 낱칸: rows };
};

const 한점 = 짝(영, 일), 최대 = 짝(영, 만);
/* ★★ **여기가 병수님이 보시는 자리다.** 「잠김→찍음」은 흑백이 벗겨지니 저절로 1.5 배가
   난다 — 그 수가 평균을 들어 올려 「대비 넉넉함」으로 읽혔다. 사람이 실제로 겪는 것은
   **지금 찍을 수 있는 칸(open)을 찍는 순간**이고, 그 짝만 따로 세워야 판정이 뒤집히지
   않는다([[threshold-and-ruler-must-match]]). */
const 뽑 = (p, 전) => {
  const rows = p.낱칸.filter(r => r.전 === 전); if (!rows.length) return null;
  const m = (k) => +(rows.reduce((s, x) => s + x[k], 0) / rows.length).toFixed(3);
  return { 칸수: rows.length, 칸비: m("칸비"), 그림비: m("그림비"), 테비: m("테비"),
    보기: rows.map(r => r.id).join(",") };
};
const 열림 = 뽑(한점, "open"), 잠김 = 뽑(한점, "lock");
/* 잠김 → 열림 도 본다 — 찍음 쪽 대비를 키우려고 열린 칸의 빛을 뺐으니, 그 바람에
   **열린 칸이 잠긴 칸과 같아지지는 않았는지** 같은 자로 확인해야 한다(같은 칸끼리). */
const 열기 = (() => {
  const p = 짝(영, 사슬), rows = p.낱칸.filter(r => r.전 === "lock" && r.후 === "open");
  if (!rows.length) return null;
  const m = (k) => +(rows.reduce((s, x) => s + x[k], 0) / rows.length).toFixed(3);
  return { 칸수: rows.length, 칸비: m("칸비"), 그림비: m("그림비"), 테비: m("테비"),
    보기: rows.map(r => r.id).join(",") };
})();
const 통과 = 열림 && 열기 && 열림.칸비 >= 1.35 && 열림.테비 >= 1.25
  && 잠김.칸비 >= 1.35 && 열기.칸비 >= 1.20;
console.log(JSON.stringify({
  "★ 찍을수있음→찍음": 열림,
  "잠김→찍을수있음": 열기,
  "잠김→찍음": 잠김,
  "0점→1점 전체": { 칸비: 한점.칸비, 그림비: 한점.그림비, 테비: 한점.테비, 최저칸비: 한점.최저칸비 },
  "0점→최대 전체": { 칸비: 최대.칸비, 그림비: 최대.그림비, 테비: 최대.테비 },
  문턱: { "열림→찍음 칸비": 1.35, "열림→찍음 테비": 1.25, "잠김→찍음 칸비": 1.35,
    "잠김→열림 칸비": 1.20 },
  판정: 통과 ? "통과" : "미달",
}, null, 2));
console.log("낱칸(0점→1점):", 한점.낱칸.map(r => `${r.id} ${r.전}→${r.후} 칸${r.칸비} 테${r.테비}`).join(" · "));
if (errs.length) console.log("EXC", errs);
console.log("찍음 " + OUT + " (전부 최대인 판)");
/* ★ 자만 보지 말고 **켜서 본다**([[play-it-before-measuring-it]]) — 넷이 한 화면에 서는
   실제 중반 판(Lv.14 · 뼈 5 최대 · 갑주 2 · 부패 1)을 따로 찍어 눈으로 확인한다. */
const 섞 = await 판({ bone:5, armor:2, rot:1 }, 14);
const MIX = OUT.replace(/\.png$/i, "_mixed.png");
fs.writeFileSync(MIX, Buffer.from(섞.shot, "base64"));
console.log("찍음 " + MIX + " (Lv.14 실제 판 — 눈으로 볼 것)");
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(통과 ? 0 : 1);
