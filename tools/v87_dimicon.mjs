/* **V-87 — 트리 칸 하나가 «빈칸»으로 보인다.**
   1366×700 저주나무를 켜서 크게 키워 보니 「구울 되살리기」가 **그림 없는 새까만
   네모**로 서 있었다(`tmp/v80_tree.png`). 파일은 스물일곱이 다 있고 `onerror` 로
   숨은 것도 아니다 — **그려 놓고 안 보이는** 것이다.

   ★ 자를 두 번 고쳐 세웠다. 처음엔 「그림칸의 p95 − 그림칸의 중앙값」으로 쟀는데,
     그 자는 **어둠의 장막**(커튼이 칸을 꽉 채우는 그림)을 구울보다 더 나쁘게 매겼다 —
     제 중앙값이 높으니 차가 작아진 것이다. 눈으로는 장막이 훨씬 잘 보인다.
     자와 눈이 갈리면 **자가 틀린 것**이다([[threshold-and-ruler-must-match]]).

   그래서 지금은 **정말 빈칸과 견준다**:
   ① 칸을 있는 그대로 한 번 찍는다.
   ② `.tIco` 를 통째로 `visibility:hidden` 으로 지우고 **한 번 더** 찍는다 —
      자리는 그대로라 칸틀·바탕·랭크가 한 톨도 안 움직인다. 이것이 «진짜 빈칸»이다.
   ③ 칸마다 두 장의 차를 센다: **뜸**(mean |Δ|) 과 **봉우리**(p99 |Δ|).
   이러면 상태(open/lock/xlock)도 저절로 공평해진다 — 잠긴 칸은 잠긴 채로 제 빈칸과
   견주기 때문이다. 원본 png 로 재면 안 되는 까닭도 같다: 흠은 `opacity`·`filter` 를
   지나온 **뒤에** 생긴다([[probe-must-walk-the-real-path]]).

   문: **뜸 < 5.5 이고 봉우리 < 70** 이면 빈칸이다.
   캘리브레이션(1366×700 · 잰 칸 27): 고치기 전 구울은 **뜸 4.9 · 봉우리 56** 으로
   혼자 운다. 스물여섯 이웃 중 봉우리가 85 아래인 칸이 **하나도 없고**, 뜸이 6 아래인
   칸도 없다 — 문이 그 틈에 선다. 눈으로 「어둡지만 보인다」고 고른 어둠의 장막
   (뜸 12 · 봉우리 85)과 어둠의 지배(뜸 6.1 · 봉우리 108)가 통과하는 것이 요점이다.

   node tools/v87_dimicon.mjs [W] [H]      (문: DIM_OLD=1 로 옛 그림을 되돌려 잰다) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const W = +(process.argv[2] || 1366), H = +(process.argv[3] || 700);
const AVG_MIN = 5.5, PEAK_MIN = 70;
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
bws.addEventListener("error", () => {});
await new Promise(r => bws.addEventListener("open", r));

/* ── PNG 를 손으로 푼다(v22_spdot 과 같은 셈 — 의존성을 안 늘린다) ── */
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
/* look_shots · v80_look · v85_bandcut · v86_roomcut 과 **같은 몸** */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
/* ★ **옛 어둠으로 되돌려 재는 문** — 고침이 정말 이 흠을 잡는지 보려면 필요하다.
   옛 «파일»을 두고 쓰지 못한다: 떨어진 그림은 `_rejected/` 로 가는데 그 자리는
   `.gitignore` 라 **다른 자리에서 받으면 없다**. 그래서 파일이 아니라 **어둠 자체**를
   되돌린다 — 잠긴 칸의 결(`grayscale(1) … contrast(1.06)`)을 그대로 두고 밝기만
   0.235 로 눌러, 옛 그림의 자리(평균 22 · p90 75)로 내린다. */
if (process.env.DIM_OLD === "1") {
  await ev(`(()=>{let s=document.getElementById("__dimold");
    if(!s){s=document.createElement("style");s.id="__dimold";document.head.appendChild(s);}
    s.textContent='#winTree .tNode[data-tn="ghoul"] .tIco{filter:grayscale(1) brightness(.235) contrast(1.06) !important}';
    return 1})()`);
  console.log("  (DIM_OLD — 옛 구울의 어둠으로 되돌려 잰다)");
}

await ev(`window.__openWin("tree")`); await wait(600);
const box = await ev(`(()=>{const b=document.getElementById("treeCols");
  return b ? { sh: b.scrollHeight, ch: b.clientHeight } : null})()`);
if (!box) { console.log("판정: 실패 — 트리 칸이 없다"); process.exit(1); }

const HIDE = `(()=>{let s=document.getElementById("__dimhide");
  if(!s){s=document.createElement("style");s.id="__dimhide";document.head.appendChild(s);}
  s.textContent='#winTree .tIco{visibility:hidden}';return 1})()`;
const SHOW = `(()=>{const s=document.getElementById("__dimhide"); if(s) s.textContent=""; return 1})()`;

const seen = new Map();
/* 접힌 자리의 칸은 **화면에 없다** — 위/아래로 두 번 훑어 합친다 */
const passes = box.sh > box.ch ? [0, box.sh - box.ch] : [0];
for (const top of passes) {
  await ev(`document.getElementById("treeCols").scrollTop=${top}`); await wait(300);
  const nodes = await ev(`(()=>[...document.querySelectorAll("#winTree .tNode")].map(n=>{
    const R=n.querySelector(".tIco").getBoundingClientRect();
    return { id:n.dataset.tn, nm:n.querySelector(".tn").textContent.trim(),
      st:["full","some","xlock","lock","open"].find(c=>n.classList.contains(c))||"?",
      x:R.x, y:R.y, w:R.width, h:R.height };
  }))()`);
  await ev(SHOW); await wait(120);
  const a = decode(Buffer.from((await S("Page.captureScreenshot", { format: "png" })).data, "base64"));
  await ev(HIDE); await wait(180);
  const b = decode(Buffer.from((await S("Page.captureScreenshot", { format: "png" })).data, "base64"));
  await ev(SHOW);
  if (a.W !== b.W || a.H !== b.H) { console.log("판정: 실패 — 두 장의 크기가 다르다"); process.exit(1); }
  const D = a.W / W;
  const L = (im, px, py) => { const o = (py * im.W + px) * im.BPP;
    return 0.299 * im.img[o] + 0.587 * im.img[o + 1] + 0.114 * im.img[o + 2]; };
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    if (n.y < 2 || n.y + n.h > H - 2) continue;          // 반쯤 걸친 칸은 이 판에서 안 센다
    const X0 = Math.round(n.x * D), Y0 = Math.round(n.y * D);
    const X1 = Math.round((n.x + n.w) * D), Y1 = Math.round((n.y + n.h) * D);
    if (X0 < 0 || Y0 < 0 || X1 > a.W || Y1 > a.H) continue;
    const d = [];
    for (let py = Y0; py < Y1; py++) for (let px = X0; px < X1; px++)
      d.push(Math.abs(L(a, px, py) - L(b, px, py)));
    if (!d.length) continue;
    const avg = d.reduce((s, v) => s + v, 0) / d.length;
    const srt = [...d].sort((x, y) => x - y);
    seen.set(n.id, { ...n, avg: +avg.toFixed(1), peak: Math.round(srt[Math.floor(srt.length * .99)]) });
  }
}

const all = [...seen.values()];
if (all.length < 20) { console.log(`판정: 실패 — 잰 칸이 ${all.length}개뿐이다(자가 칸을 못 봤다)`); process.exit(1); }
const bad = all.filter((n) => n.avg < AVG_MIN && n.peak < PEAK_MIN);
console.log(`${W}x${H} · 칸 ${all.length}개 (문: 뜸<${AVG_MIN} 이고 봉우리<${PEAK_MIN} 이면 빈칸)`);
console.log("  칸                     상태     뜸  봉우리");
for (const n of all.sort((x, y) => x.avg - y.avg))
  console.log(`  ${(n.id + " " + n.nm).padEnd(24)} ${n.st.padEnd(6)} ${String(n.avg).padStart(5)} ${String(n.peak).padStart(6)}${bad.includes(n) ? "   ← 빈칸" : ""}`);
console.log(bad.length ? `판정: 실패 — 빈칸 ${bad.length}개 (${bad.map((n) => n.nm).join(" · ")})` : "판정: 통과");
process.exit(bad.length ? 1 : 0);
