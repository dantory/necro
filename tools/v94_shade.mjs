/* V-93 — **덮는 창의 그늘이 바로 아래 HUD 줄을 지우는가**를 잰다.
   `.res`(가방 · Lv · 군세) 세 조각의 «보이는 글자 화소»만 골라 대비를 낸다.
   V-91 의 형광 수법을 그대로 쓴다 — CSS 를 타고 바탕을 «계산»하지 않고,
   ① 있는 그대로 ② 잉크 뺀 판 ③ 잉크를 형광으로 칠한 판 셋을 찍어 견준다
   ([[probe-must-walk-the-real-path]]).
   node tools/v94_shade.mjs [width] [height] [old]     old 면 고치기 전 결로 잰다(body.resold) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1512), H = +(process.argv[3] || 863);
const OLD = process.argv[4] === "old";
const zlib = await import("node:zlib");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

/* PNG 를 손으로 푼다(자에 그림 라이브러리를 안 들인다) */
function png(buf) {
  let p = 8, w = 0, h = 0, ctype = 6; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), typ = buf.toString("ascii", p + 4, p + 8);
    if (typ === "IHDR") { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); ctype = buf[p + 17]; }
    if (typ === "IDAT") idat.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  /* ★ colorType 을 **읽는다.** 4 로 못박았더니 크롬이 돌려준 RGB(2) 판에서 걸러내기가
     통째로 어긋나 모든 줄이 「안 그려짐」으로 나왔다 — 자가 없는 결함을 지어낸 그 결
     ([[silent-zero-is-not-an-observation]]). */
  const BPP = ctype === 6 ? 4 : ctype === 2 ? 3 : 0;
  if (!BPP) throw new Error("colorType " + ctype);
  const dat = zlib.inflateSync(Buffer.concat(idat)); const stride = w * BPP;
  const out = Buffer.alloc(h * stride);
  for (let y = 0, o = 0; y < h; y++) {
    const f = dat[o++]; const line = dat.subarray(o, o + stride); o += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= BPP ? cur[x - BPP] : 0, b = up ? up[x] : 0, c = (up && x >= BPP) ? up[x - BPP] : 0; let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { W: w, H: h, BPP, img: out };
}
const shot = async () => png(Buffer.from((await S("Page.captureScreenshot", { format: "png" })).data, "base64"));
const sl = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * sl(r) + 0.7152 * sl(g) + 0.0722 * sl(b);
const CR = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/* ★ **물러난 줄은 재지 않는다.** 형광 판은 `style.visibility="visible"` 를 인라인으로
   박으므로 CSS 로 감춘 줄까지 되살려 「보인다」로 세고, 그러면 있는 그대로의 판(A)에는
   없는 글자와 견주게 되어 **1.01:1 이라는 없는 미달**이 나온다. 먼저 물어보고 가른다. */
const RECTS = `(()=>{const o=[];for(const id of ["gCorpse","xpNum","gArmy"]){const e=document.getElementById(id);
  if(!e) continue; const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) continue;
  const cs=getComputedStyle(e), cp=e.closest(".res")?getComputedStyle(e.closest(".res")):cs;
  const gone = cs.visibility!=="visible" || cp.visibility!=="visible" || +cs.opacity===0 || +cp.opacity===0;
  o.push({id,l:r.left,t:r.top,w:r.width,h:r.height,gone,txt:(e.textContent||"").trim().slice(0,14)});}
  const f=document.querySelector(".win.on .frame");
  return {rows:o, frameBottom:f?Math.round(f.getBoundingClientRect().bottom):null};})()`;
const NOINK = `(()=>{window.__hid=[];for(const id of ["gCorpse","xpNum","gArmy"]){const e=document.getElementById(id);
  if(e){window.__hid.push([e,e.style.visibility]);e.style.visibility="hidden";}}})()`;
const MARK  = `(()=>{for(const [e] of window.__hid){e.style.visibility="visible";e.style.color="#00ff00";e.style.textShadow="none";}})()`;
const REINK = `(()=>{for(const [e,v] of window.__hid){e.style.visibility=v;e.style.color="";e.style.textShadow="";}})()`;

await S("Page.reload", { ignoreCache: true }); await wait(2200);
if (OLD) await ev(`document.body.classList.add("resold")`);
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] }, robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [{ k: "wand", tier: 2, af: [{ id: "dmg", v: 14 }] }], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);
if (OLD) await ev(`document.body.classList.add("resold")`);

const CASES = [["없음(맨 마을)", null], ["상인", "shop"], ["대장간", "forge"], ["트리", "tree"],
               ["어디부터", "dive"], ["편성", "doctrine"], ["운용", "tactic"], ["환생", "reborn"], ["능력치+가방", "stat"]];
const rowsOut = [];
for (const [ko, w] of CASES) {
  if (w) { await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(450); }
  const g = await ev(RECTS);
  const A = await shot(); await ev(NOINK); await wait(120);
  const B = await shot(); await ev(MARK); await wait(120);
  const C = await shot(); await ev(REINK); await wait(90);
  const sc = A.W / W;
  for (const r of g.rows) {
    if (r.gone) { rowsOut.push([ko, r.id, r.txt, "물러남", 0]); continue; }
    const ink = [], bg = [];
    const x0 = Math.max(0, Math.round(r.l * sc)), x1 = Math.min(A.W, Math.round((r.l + r.w) * sc));
    const y0 = Math.max(0, Math.round(r.t * sc)), y1 = Math.min(A.H, Math.round((r.t + r.h) * sc));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const o = (y * A.W + x) * A.BPP;
      const dm = Math.abs(C.img[o] - B.img[o]) + Math.abs(C.img[o + 1] - B.img[o + 1]) + Math.abs(C.img[o + 2] - B.img[o + 2]);
      if (dm < 40) continue;                                  /* 형광이 안 닿았다 = 안 보이는 화소 */
      ink.push(lum(A.img[o], A.img[o + 1], A.img[o + 2]));
      bg.push(lum(B.img[o], B.img[o + 1], B.img[o + 2]));
    }
    if (!ink.length) { rowsOut.push([ko, r.id, r.txt, "안 그려짐", 0]); continue; }
    ink.sort((a, b) => a - b); bg.sort((a, b) => a - b);
    const li = ink[Math.floor(ink.length * 0.9)], lb = bg[Math.floor(bg.length * 0.5)];
    rowsOut.push([ko, r.id, r.txt, CR(li, lb).toFixed(2), ink.length]);
  }
  rowsOut.push([ko, "—", `틀 밑 ${g.frameBottom ?? "-"} · 줄 위 ${g.rows[0] ? Math.round(g.rows[0].t) : "-"}`, "", 0]);
  if (w) { await ev(`window.__closeWin && window.__closeWin()`); await wait(220); }
}
console.log(`창 ${W}x${H}${OLD ? " · old" : ""}`);
/* ★ **「안 그려짐」은 통과다** — 틀이 통째로 덮었거나 물러난 줄이라 읽으려 들지 않는다.
   문턱을 매기는 것은 **그려진 줄**뿐이다. 다만 「그려진 줄이 하나도 없다」와 헷갈리지
   않게 둘을 따로 센다([[silent-zero-is-not-an-observation]]). */
let worst = Infinity, worstName = "", drawn = 0, hidden = 0;
for (const [ko, id, txt, cr, n] of rowsOut) {
  console.log(`  ${ko.padEnd(12)} ${String(id).padEnd(9)} ${txt.padEnd(18)} ${String(cr).padStart(8)}  ${n || ""}`);
  if (cr === "안 그려짐" || cr === "물러남") { hidden++; continue; }
  if (!cr) continue;
  drawn++;
  if (+cr < worst) { worst = +cr; worstName = ko + "/" + id; }
}
const ok = drawn > 0 && worst >= 2.2;
console.log(`  그려진 줄 ${drawn} · 물러난 줄 ${hidden}`);
console.log(`  최저 ${drawn ? worst.toFixed(2) : "—"}:1 (${worstName || "—"}) · 문턱 2.2`);
console.log(`판정: ${ok ? "통과" : "미달"}`);
if (!drawn) console.log("  ★ 그려진 줄이 하나도 없다 — 자가 아무것도 못 본 것일 수 있다");
await raw("Target.closeTarget", { targetId }); process.exit(0);
