/* ══ V-118 자 ══ 장비 인형의 **재련 딱지(+N)** 가 «제 그림 위에서» 읽히는가.
   딱지는 칸의 왼쪽 위에 앉는데 그 밑은 **물건 그림**이다 — 해골 투구·장갑처럼 밝은
   그림 위에서는 금색 글자가 그림에 먹힌다. CSS 색만 봐서는 알 수 없다(바탕이 물건마다
   갈린다). V-109 와 **같은 결**로 잰다: 같은 자리를 끄고·켜고·다시 끄고 세 장 찍어,
   두 바탕이 똑같았던 자리에서만 글자를 가려낸다.
   ★ 견주는 바탕은 «글자를 지운 장»이 아니라 **켠 장에서 글자 바로 둘레** 다 —
     그늘(text-shadow)은 글자와 함께 뜨고 함께 사라지므로, 지운 장을 쓰면 그늘이
     통째로 안 세어져 **눈이 보는 것과 다른 것**을 재게 된다.
   ★ **글자 자리는 「끄고 켜기」로 못 찾는다** — 처음에 그렇게 짰다가 투구·부적·장갑에서
     쓸 화소가 1~5 개만 나왔다. 딱지가 그림에 먹혀 «안 보이니» 켜고 꺼도 안 달라진 것이라,
     자가 **가장 나쁜 셋을 조용히 버리고** 나머지로 「우는 자리 0」을 냈다
     ([[silent-zero-is-not-an-observation]]). 그래서 자리는 **딱지 색을 잠깐 자홍으로
     바꿔** 찾는다 — 무슨 그림 위든 자홍은 잡힌다. 글꼴·자리·그늘은 한 톨도 안 바뀐다.
   ★ 낱말은 통째로 읽힌다 — 세로 토막마다 따로 견주고 **가장 나쁜 토막**을 그 딱지의
     값으로 삼는다(「+19」의 9 하나만 먹혀도 그 수는 못 읽는다).

   쓰기:  node tools/v118_plus.mjs [old]
          old → body.plusold 로 고치기 «전» 그늘을 되돌려 자가 정말 우는지 보정한다. */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv.includes("old");
const OK = 3.0;                                  /* 작지만 굵은 수 — AA large 와 같은 문턱 */
const SIZES = [[1512, 863], [1366, 700], [1280, 620]];

/* 오래 논 사람 — 열 자리가 다 차고 재련이 두 자리다(딱지가 가장 넓어지는 자리). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.gold=1823400;M.deepest=34;M.up={hp:12,mp:9,dmg:14,army:6};
  M.plus={wand:19,robe:19,charm:19,helm:19,glove:19,ring:19,shield:19,belt:19,boots:19,ring2:19};
  const ks=["wand","robe","charm","helm","glove","ring"];
  ks.forEach((k,i)=>{M.equip[k]=C.mkItem(k,(C.GEAR[k].tiers.length-1)-(i%2),false,30)});
  C.saveMeta();return 1})()`;

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

const grab = async () => {
  const b64 = (await S("Page.captureScreenshot", { format: "png" })).data;
  return await ev(`(async()=>{
    const im = new Image(); im.src = "data:image/png;base64,${b64}";
    await im.decode();
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const g = c.getContext("2d", {willReadFrequently:true}); g.drawImage(im,0,0);
    return {w:c.width, h:c.height, d:Array.from(g.getImageData(0,0,c.width,c.height).data)};
  })()`);
};

const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };

const rows = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1200);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2300);
  await ev(`(async()=>{globalThis.__C=await import('./js/core.js');return 1})()`);
  await ev(SEED);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  if (OLD) await ev(`document.body.classList.add("plusold")`);

  /* 사람이 실제로 지나는 길로 연다 — 능력치 단추를 눌러서([[probe-must-walk-the-real-path]]) */
  await ev(`(()=>{const b=[...document.querySelectorAll('button,.beltBtn,[data-win]')].find(x=>/능력치/.test(x.textContent));if(b)b.click();return 1})()`);
  await wait(800);

  /* ★ 인형은 DOM 에 **두 벌** 있고(한 벌은 크기 0), 창이 좁으면 인형이 든 판이
     **두루마리**가 되어 아래쪽 자리는 아예 안 그려진다. 안 그려진 것을 「못 쟀다」로
     세면 자가 우는 척을 한다 — 여기서 미리 «가려짐»으로 갈라 둔다. */
  const rects = await ev(`(()=>{const o=[];
    const scroller = e => { for(let p=e.parentElement;p;p=p.parentElement){
      const cs=getComputedStyle(p); if(/auto|scroll|hidden/.test(cs.overflowY+cs.overflow)&&p.scrollHeight>p.clientHeight+2) return p; } return null };
    document.querySelectorAll('.pdSlot .cell .plusBadge').forEach((e,i)=>{
      const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return;
      const slot=e.closest('.pdSlot'); const nm=[...slot.classList].find(c=>c.startsWith('pd-'))||('slot'+i);
      const sc=scroller(e); let clip=false;
      if(sc){ const sr=sc.getBoundingClientRect(); clip = r.bottom>sr.bottom-1 || r.top<sr.top+1; }
      clip = clip || r.bottom>innerHeight || r.top<0;
      o.push({nm, clip, x:Math.floor(r.left)-5, y:Math.floor(r.top)-5,
              w:Math.ceil(r.width)+10, h:Math.ceil(r.height)+10, t:e.textContent.trim()});
    }); return o})()`);
  if (!rects.length) { console.log(`(${W}) 딱지를 못 찾음 — 창이 안 열렸다`); continue; }

  const paint = c => ev(`(()=>{document.querySelectorAll('.pdSlot .cell .plusBadge').forEach(e=>e.style.color=${JSON.stringify(c)});return 1})()`);
  const setVis = v => ev(`(()=>{document.querySelectorAll('.pdSlot .cell .plusBadge').forEach(e=>e.style.visibility=${JSON.stringify(v)});return 1})()`);

  await paint("#ff00ff"); await wait(260); const M  = await grab();   /* 글자 «자리»만 찍는 장 */
  await paint("");        await wait(260); const A  = await grab();   /* 사람이 보는 장 */
  await setVis("hidden"); await wait(260); const B  = await grab();   /* 밑그림(무엇에 먹히는지) */
  await setVis("");       await wait(200); const A2 = await grab();   /* 흔들리는 화소 거르기 */

  const dpr = A.w / W;
  for (const r of rects) {
    const x0 = Math.max(0, Math.round(r.x * dpr)), x1 = Math.min(A.w - 1, Math.round((r.x + r.w) * dpr));
    const y0 = Math.max(0, Math.round(r.y * dpr)), y1 = Math.min(A.h - 1, Math.round((r.y + r.h) * dpr));
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (r.clip || bw < 4 || bh < 4) { rows.push({ W, nm: r.nm, t: r.t, n: 0, cr: null, sw: null, bg: null, clip: !!r.clip }); continue; }
    const core = new Uint8Array(bw * bh), ok = new Uint8Array(bw * bh);
    const la = new Float64Array(bw * bh), lb = new Float64Array(bw * bh);
    const cs = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = (y * A.w + x) * 4, j = (y - y0) * bw + (x - x0);
      /* 두 켠 장이 다른 자리는 움직이는 것이 지난 자리다 — 안 쓴다 */
      if (A.d[i] !== A2.d[i] || A.d[i + 1] !== A2.d[i + 1] || A.d[i + 2] !== A2.d[i + 2]) continue;
      ok[j] = 1;
      la[j] = lum(A.d[i], A.d[i + 1], A.d[i + 2]);
      lb[j] = lum(B.d[i], B.d[i + 1], B.d[i + 2]);
      /* 자홍이 «진하게» 앉은 자리만 글자 속으로 — 가장자리 반투명은 바탕과 섞인다 */
      if (M.d[i] > 150 && M.d[i + 2] > 150 && M.d[i + 1] < 110) { core[j] = 1; cs.push(j); }
    }
    if (cs.length < 8) { rows.push({ W, nm: r.nm, t: r.t, n: cs.length, cr: null, sw: null, bg: null, clip: false }); continue; }
    const R = Math.max(2, Math.round(3 * dpr));
    const near = new Uint8Array(bw * bh);
    for (const j of cs) { const cy = (j / bw) | 0, cx = j % bw;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const yy = cy + dy, xx = cx + dx; if (yy < 0 || xx < 0 || yy >= bh || xx >= bw) continue;
        const jj = yy * bw + xx; if (!core[jj] && ok[jj]) near[jj] = 1; } }
    const SL = Math.max(3, Math.round(5 * dpr));         /* 딱지가 작다 — 토막도 작게 */
    const bin = new Map(); const allC = [], allN = [], bgC = [];
    for (let j = 0; j < core.length; j++) {
      if (core[j] && ok[j]) bgC.push(lb[j]);             /* 글자 «밑»에 있는 그림 */
      if ((!core[j] && !near[j]) || !ok[j]) continue;
      const b = Math.floor((j % bw) / SL); const a = bin.get(b) || { c: [], n: [] }; (core[j] ? a.c : a.n).push(la[j]); bin.set(b, a); }
    let sw = null;
    for (const [, a] of bin) { allC.push(...a.c); allN.push(...a.n);
      if (a.c.length < 4 || a.n.length < 4) continue;
      const v = ratio(med(a.c), med(a.n)); if (sw == null || v < sw) sw = v; }
    rows.push({ W, nm: r.nm, t: r.t, n: cs.length,
                cr: allC.length && allN.length ? +ratio(med(allC), med(allN)).toFixed(2) : null,
                sw: sw == null ? null : +sw.toFixed(2),
                bg: bgC.length ? +med(bgC).toFixed(3) : null });
  }
}
await raw("Target.closeTarget", { targetId }); bws.close();

const byName = new Map();
const dropped = rows.filter(r => r.sw == null && !r.clip);
const clipped = rows.filter(r => r.clip);
for (const r of rows) { if (r.sw == null) continue; const a = byName.get(r.nm) || []; a.push(r); byName.set(r.nm, a); }
let bad = 0, worstAll = null;
console.log(`\n${OLD ? "옛 그늘(plusold)" : "지금"} · 문턱 ${OK}`);
console.log(`| 자리 | 글월 | 밑그림 밝기 | 딱지 통째 | **가장 나쁜 토막** | ${OK} 미만인 창 |`);
console.log(`|---|---|---|---|---|---|`);
for (const [nm, a] of [...byName].sort((x, y) => Math.min(...x[1].map(r => r.sw)) - Math.min(...y[1].map(r => r.sw)))) {
  const w = a.reduce((m, x) => x.sw < m.sw ? x : m);
  const under = a.filter(x => x.sw < OK).length;
  if (under) bad++;
  if (!worstAll || w.sw < worstAll.sw) worstAll = w;
  console.log(`| ${nm} | ${w.t} | ${w.bg ?? "—"} | ${w.cr}:1 | **${w.sw}:1** | ${under}/${a.length} |`);
}
if (clipped.length) console.log(`\n가려짐(창이 좁아 판이 두루마리가 된 자리) ${clipped.length} — ${[...new Set(clipped.map(c => c.W))].join(" · ")}`);
if (dropped.length) console.log(`\n★ 못 잰 딱지 ${dropped.length} — ${dropped.map(d => d.nm + "(" + d.W + "·화소" + d.n + ")").join(" · ")}`);
console.log(`\n우는 자리 ${bad}/${byName.size} · 가장 나쁜 것 ${worstAll ? worstAll.sw + ":1 (" + worstAll.nm + " · " + worstAll.W + ")" : "—"}`);
fs.writeFileSync("tmp/v118_plus" + (OLD ? "_old" : "") + ".json", JSON.stringify(rows, null, 1));
process.exit(bad || dropped.length ? 1 : 0);
