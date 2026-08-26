/* **V-88 — 정산 칸의 «갈림 표식»이 그림 밑에 깔려 먹힌다.**
   정산 창 칸마다 왼쪽 위에 「착용 · 가방 · 재료 · 합침 · 금」 한 낱말이 앉는다 —
   **이 판에서 주운 것이 어떻게 됐는지**를 말하는 유일한 글이다. 그런데 `.eFate`
   (top:1px · 줄상자 15px)와 물건 그림(`.cell i`, inset 6px)이 **10px 겹치고**,
   그림이 DOM 에서 뒤라 **글자 위를 덮는다**(둘 다 z-index:auto). 덮이는 몫은
   물건마다 다르다 — 투구는 뿔 사이가 비어 반쯤 남고, 장갑·허리띠는 통째로 먹힌다.

   ★ 자는 «뜸/봉우리» 가 아니라 **살아남은 몫**으로 잰다 — 흠이 「어둡다」가 아니라
     「가려졌다」이기 때문이다([[threshold-and-ruler-must-match]]).
     ① A: 있는 그대로            ② B: `.eFate` 만 숨김
     ③ C: 그림(`i`)만 숨김        ④ D: 둘 다 숨김
     글자가 실제로 닿은 점 = |A−B| 가 T 넘는 점수. 안 가렸을 때 닿을 점 = |C−D|.
     **몫 = 실제/온전**. 100% 면 한 톨도 안 가렸고, 0% 면 통째로 먹혔다.
     자리는 한 톨도 안 움직이므로 칸틀·바탕·등급수가 셈에 안 낀다.
     원본 png 를 세면 안 되는 까닭도 같다 — 가림은 `opacity` 를 지나온 **뒤에** 생긴다
     ([[probe-must-walk-the-real-path]]).

   문: **몫 ≥ 85%**. 캘리브레이션(1366×700 · 여섯 칸): 고치기 전 25~74%(넷이 미달),
   고친 뒤 100%. `FATE_OLD=1` 이면 옛 자리(그림 inset 6px · z 없음)로 되돌려 **운다**.

   node tools/v88_fatecover.mjs [W] [H] */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1366), H = +(process.argv[3] || 700);
const MIN = 0.85, T = 12;             // T = 「글자가 닿았다」로 치는 밝기 차
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
bws.addEventListener("error", () => {});
await new Promise(r => bws.addEventListener("open", r));

const zlib = await import("node:zlib");
function decode(buf) {
  let w = 0, h = 0, ctype = 2, p = 8; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), tag = buf.toString("ascii", p + 4, p + 8);
    if (tag === "IHDR") { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); ctype = buf[p + 17]; }
    if (tag === "IDAT") idat.push(buf.subarray(p + 8, p + 8 + len)); p += len + 12; }
  const BPP = ctype === 6 ? 4 : ctype === 2 ? 3 : 0;
  if (!BPP) throw new Error("colorType " + ctype);
  const rawpx = zlib.inflateSync(Buffer.concat(idat)), stride = w * BPP, img = Buffer.alloc(h * stride);
  for (let y = 0, o = 0; y < h; y++) { const f = rawpx[o++];
    for (let x = 0; x < stride; x++) { const cur = rawpx[o + x],
        a = x >= BPP ? img[y * stride + x - BPP] : 0, b = y ? img[(y - 1) * stride + x] : 0,
        c = (x >= BPP && y) ? img[(y - 1) * stride + x - BPP] : 0;
      let v = cur;
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, da = Math.abs(q - a), db = Math.abs(q - b), dc = Math.abs(q - c);
                          v += (da <= db && da <= dc) ? a : (db <= dc ? b : c); }
      img[y * stride + x] = v & 255; } o += stride; }
  return { W: w, H: h, BPP, img };
}

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
/* look_shots · v80_look · v87_dimicon · v88_look3 과 **같은 몸** */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
/* ★ **옛 자리로 되돌려 재는 문** — 고침이 정말 이 흠을 잡는지 보려면 필요하다.
   그림을 내리기 전 자리(inset 6px)와 z 없음으로 되돌린다. */
if (process.env.FATE_OLD === "1") {
  await ev(`(()=>{let s=document.getElementById("__fateold");
    if(!s){s=document.createElement("style");s.id="__fateold";document.head.appendChild(s);}
    s.textContent='#endBody .grid .cell i{inset:clamp(1px,6%,6px) !important} #endBody .eFate{z-index:auto !important;text-shadow:none !important}';
    return 1})()`);
  console.log("  (FATE_OLD — 그림이 표식을 덮던 옛 자리로 되돌려 잰다)");
}

const LOOT = [
  { k: "helm",  tier: 4, af: [{ id: "hp", v: 120 }],                worn: true },
  { k: "glove", tier: 3, af: [{ id: "dmg", v: 14 }, { id: "mp", v: 2.1 }], bagged: true },
  { k: "boots", tier: 2, af: [],                                    made: true },
  { k: "ring",  tier: 5, af: [{ id: "mdmg", v: 31 }, { id: "hp", v: 66 }], uid: "grip", worn: true },
  { k: "belt",  tier: 1, af: [],                                    mat: true },
  { k: "robe",  tier: 2, af: [{ id: "hp", v: 41 }],                 bagged: true },
];
const RUN = { has: true, loot: LOOT, gold: 13640, xp: 1820, killed: 337, floor: 23, leveled: true,
              from: 16, summoned: 412, used: 288, secs: 731 };
await ev(`Object.assign(window.__LASTRUN, ${JSON.stringify(RUN)})`);
await ev(`window.__openWin("end")`); await wait(500);

const cells = await ev(`(()=>[...document.querySelectorAll("#endBody .grid .cell")].map((c,i)=>{
  const f=c.querySelector(".eFate"); if(!f) return null;
  const R=f.getBoundingClientRect();
  return { i, txt:f.textContent.trim(), kind:(c.className.match(/cell (\\w+)/)||[])[1]||"?",
           x:R.x, y:R.y, w:R.width, h:R.height };
}).filter(Boolean))()`);
if (!cells || cells.length < 4) { console.log(`판정: 실패 — 잰 칸이 ${cells ? cells.length : 0}개뿐이다`); process.exit(1); }

const CSS = (txt) => `(()=>{let s=document.getElementById("__fatep");
  if(!s){s=document.createElement("style");s.id="__fatep";document.head.appendChild(s);}
  s.textContent=${JSON.stringify(txt)};return 1})()`;
const snap = async (css) => { await ev(CSS(css)); await wait(160);
  return decode(Buffer.from((await S("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const A = await snap("");                                            // 있는 그대로
const B = await snap("#endBody .eFate{visibility:hidden}");           // 글자만 숨김
const C = await snap("#endBody .grid .cell i{visibility:hidden}");    // 그림만 숨김
const D = await snap("#endBody .grid .cell i,#endBody .eFate{visibility:hidden}");
await ev(CSS(""));
if (new Set([A, B, C, D].map(z => z.W + "x" + z.H)).size !== 1) { console.log("판정: 실패 — 넉 장의 크기가 다르다"); process.exit(1); }
const S2 = A.W / W;
const L = (im, px, py) => { const o = (py * im.W + px) * im.BPP;
  return 0.299 * im.img[o] + 0.587 * im.img[o + 1] + 0.114 * im.img[o + 2]; };
const ink = (p, q, c) => { let n = 0;
  const X0 = Math.round(c.x * S2), Y0 = Math.round(c.y * S2);
  const X1 = Math.round((c.x + c.w) * S2), Y1 = Math.round((c.y + c.h) * S2);
  for (let py = Y0; py < Y1; py++) for (let px = X0; px < X1; px++)
    if (Math.abs(L(p, px, py) - L(q, px, py)) > T) n++;
  return n; };

const rows = cells.map(c => { const real = ink(A, B, c), ideal = ink(C, D, c);
  return { ...c, real, ideal, keep: ideal ? real / ideal : 0 }; });
const bad = rows.filter(r => r.keep < MIN);
console.log(`${W}x${H} · 칸 ${rows.length}개 (문: 살아남은 몫 ≥ ${Math.round(MIN * 100)}%)`);
console.log("  칸        표식    온전  실제   몫");
for (const r of rows)
  console.log(`  ${String(r.i + 1).padStart(2)} ${r.kind.padEnd(6)} ${r.txt.padEnd(5)} ${String(r.ideal).padStart(5)} ${String(r.real).padStart(5)} ${String(Math.round(r.keep * 100)).padStart(4)}%${bad.includes(r) ? "   ← 먹혔다" : ""}`);
console.log(bad.length ? `판정: 실패 — 먹힌 표식 ${bad.length}개 (${bad.map(r => r.txt + "/" + r.kind).join(" · ")})` : "판정: 통과");
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
