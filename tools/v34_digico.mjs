/* V-34 자 — **상인 좌판 열두 칸 가운데 그림이 있는 칸은 몇인가.**
   좌판에는 살 것 열 개와 「무덤 파기」 하나, 그리고 채움용 빈 칸 하나가 선다.
   열 개는 다 픽셀아트인데 무덤 파기만 **유니코드 글리프 하나**(⚰ · 24px)였다 —
   시스템 폰트가 그린 그것은 칸 안에서 가늘고 흰 조각으로 나온다. 금을 쓰는 자리가
   좌판에서 제일 안 보였다.

   재는 법은 V-33 그대로 — **그림을 껐다 켜서 뺀 잉크**(`tools/v33_pix.py` 를 그대로 쓴다).
   칸마다 바탕이 달라도(고른 칸은 테가 금색이다) 안 흔들린다.
   ★ 아래 눈금을 같은 사진 안에 둔다([[floor-far-from-threshold]]):
       gear  = 살 것 열 칸(진짜 그림)   ← 위 눈금
       dig   = 무덤 파기 한 칸          ← 재려는 것
       empty = 채움용 빈 칸(그림 없음)  ← 바닥(0 이어야 자가 산다)
   ★ 재는 상자는 **칸 전체**로 통일한다 — 글리프는 상자가 칸만 하고 획만 작아서,
     제 상자만 재면 「꽉 찼다」로 읽힌다.

   node tools/v34_digico.mjs               (고친 뒤)
   NODIGICO=1 node tools/v34_digico.mjs    (고치기 전 — 문을 닫아 옛 글리프로 잰다) */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, URL = "http://127.0.0.1:8774/index.html";
const OFF = process.env.NODIGICO === "1";
const fs = await import("node:fs");
const cp = await import("node:child_process");
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* `v27_panels`·`v33_treedim` 과 **같은 세이브**(몇 시간 논 사람) — 좌판이 빈 채로 찍히면
   「안 보인다」가 창 탓인지 세이브 탓인지 안 갈린다([[silent-zero-is-not-an-observation]]). */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

const SIZES = [[1512, 863], [1440, 720], [1280, 620]];
const bad = [], rows = [];

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  /* 문 — 고치기 전을 그대로 되돌린다: 그림을 지우고 글리프를 도로 세운다. */
  if (OFF) await ev(`{const s=document.createElement("style");s.id="v34off";
     s.textContent=[
       '#shopGrid .cell.dig i.gear-grave{display:none!important}',
       '#shopGrid .cell.dig::after{content:"\\26B0";position:absolute;inset:0;display:flex;' +
       'align-items:center;justify-content:center;font-size:24px;color:#c8aa6e;text-shadow:0 1px 2px #000}'
     ].join("");
     document.head.appendChild(s);1}`);
  await ev(`window.__openWin && window.__openWin("shop")`); await wait(700);
  const on = await ev(`!!document.getElementById("winShop")?.classList.contains("on")`);
  if (!on) { bad.push(`${W}×${H}: 상인 창이 안 열렸다`); continue; }

  /* 칸마다 **칸 상자**의 자리와 무리를 받는다. */
  const nodes = await ev(`(()=>{const g=document.getElementById("shopGrid");
    return [...g.querySelectorAll(".cell")].map((c,i)=>{
      const r=c.getBoundingClientRect();
      const st=c.classList.contains("dig")?"dig":c.classList.contains("empty")?"empty":"gear";
      /* ★ **칸이 격자의 창틀 안에 있나.** 낮은 창에서 좌판은 «구르는 칸»이 되는데,
         굴러 나간 칸을 그냥 재면 |ΔL| 이 0 으로 나오고 그 0 이 「그림이 없다」로
         읽힌다([[silent-zero-is-not-an-observation]]). 안 보이는 것은 «못 쟀다»로
         적고 판정에서 뺀다 — 대신 아래에서 **몇 칸이 잘렸는지**를 따로 나무란다. */
      const gr=g.getBoundingClientRect();
      const vis=Math.max(0,Math.min(r.bottom,gr.bottom)-Math.max(r.top,gr.top))
               *Math.max(0,Math.min(r.right,gr.right)-Math.max(r.left,gr.left))/(r.width*r.height);
      return {id:c.dataset.pick||("empty"+i), state:st, vis:+vis.toFixed(3),
              r:{x:r.x,y:r.y,w:r.width,h:r.height}};
    })})()`);
  const dpr = await ev(`window.devicePixelRatio`);
  const nGear = nodes.filter(n => n.state === "gear").length, nDig = nodes.filter(n => n.state === "dig").length;
  if (!nDig)  { bad.push(`${W}×${H}: 무덤 파기 칸이 없다`); continue; }
  if (nGear < 8) bad.push(`${W}×${H}: 살 것 칸이 ${nGear}개뿐 — 위 눈금이 안 선다`);

  const onPng = `tmp/v34_shop_${OFF ? "off" : "on"}_${W}.png`, hidePng = `tmp/v34_hide_${W}.png`;
  await shot(onPng);
  /* 칸 안의 **그리는 것을 다 숨긴다** — 그림(i)·글리프(.digIco)·등급 배지(.q)·옵션 점(.afd).
     배지까지 숨겨야 「그림이 보태는 잉크」만 남는다(배지는 칸마다 있으니 뺄 것이다). */
  await ev(`{const s=document.createElement("style");s.id="v34hide";
     s.textContent="#shopGrid .cell i,#shopGrid .cell .q,#shopGrid .cell .afd{visibility:hidden!important}"
       + "#shopGrid .cell.dig::after{visibility:hidden!important}";
     document.head.appendChild(s);1}`);
  await wait(250); await shot(hidePng);
  await ev(`document.getElementById("v34hide")?.remove()`);

  const job = `tmp/v34_job_${W}.json`;
  fs.writeFileSync(job, JSON.stringify({ on: onPng, off: hidePng, dpr, nodes }));
  const out = JSON.parse(cp.execFileSync("python3", ["tools/v33_pix.py", job], { encoding: "utf8" }));
  /* 굴러 나간 칸(창틀 안에 절반도 못 든 것)은 **못 쟀다**로 빼고 따로 센다. */
  const visOf = Object.fromEntries(nodes.map(n => [n.id, n.vis]));
  const cut = out.filter(o => (visOf[o.id] ?? 1) < 0.5);
  const seen = out.filter(o => (visOf[o.id] ?? 1) >= 0.5);
  const by = {}; for (const o of seen) (by[o.state] ||= []).push(o);
  const avg = (a, k) => a.length ? a.reduce((s, o) => s + (o[k] || 0), 0) / a.length : null;
  const g = {}; for (const k of ["gear", "dig", "empty"])
    g[k] = by[k] ? { n: by[k].length, ink: +avg(by[k], "ink").toFixed(1), top: +avg(by[k], "top").toFixed(1) } : null;
  /* 좌판이 **온전한 줄**을 보여 주나 — 반 줄만 보이면 물건이 아니라 「윗동강」이 보인다. */
  const gridBox = await ev(`(()=>{const g=document.getElementById("shopGrid");
      return {ch:g.clientHeight, sh:g.scrollHeight}})()`);
  const cellH = nodes[0]?.r.h || 0;
  const wholeRows = cellH ? Math.floor((gridBox.ch + 6) / (cellH + 6)) : 0;
  rows.push({ size: `${W}×${H}`, g, cut: cut.length, rows: wholeRows,
              clip: +(gridBox.sh > gridBox.ch + 2) });

  /* ── 회귀: 그림 말고 다른 것이 안 움직였나 ── */
  /* ㉮ 등급 배지가 아직 칸에 있나 */
  const hasQ = await ev(`!!document.querySelector('#shopGrid .cell.dig .q')`);
  if (!hasQ) bad.push(`${W}×${H}: 무덤 파기 칸의 등급 배지가 사라졌다`);
  /* ㉯ **눌러서 정말 무덤 파기가 골라지고 그 툴팁이 뜨나**([[probe-must-walk-the-real-path]]) */
  await ev(`document.querySelector('#shopGrid .cell.dig')?.scrollIntoView({block:"center"})`);
  await wait(300);
  const r = await ev(`(()=>{const e=document.querySelector('#shopGrid .cell.dig').getBoundingClientRect();
                      return {x:e.x,y:e.y,w:e.width,h:e.height}})()`);
  await S("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x + r.w / 2, y: r.y + r.h / 2, button: "left", clickCount: 1 });
  await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x + r.w / 2, y: r.y + r.h / 2, button: "left", clickCount: 1 });
  await wait(350);
  const sel = await ev(`document.querySelector('#shopGrid .cell.sel')?.dataset.pick`);
  if (sel !== "dig") bad.push(`${W}×${H}: 무덤 파기 칸을 눌러도 안 골라진다(${sel})`);
  const digTip = await ev(`!!document.querySelector('#shopTip .tipDig, #shopTip [data-dig]') || /무덤|파/.test(document.getElementById("shopTip")?.textContent||"")`);
  if (!digTip) bad.push(`${W}×${H}: 무덤 파기를 골랐는데 그 툴팁이 안 뜬다`);
  /* ㉰ 칸이 정사각으로 남아 있나 — 그림을 키우다 칸 모양을 흔들면 좌판이 어긋난다 */
  const sq = await ev(`(()=>{const e=document.querySelector('#shopGrid .cell.dig').getBoundingClientRect();
                       return Math.abs(e.width-e.height)})()`);
  if (sq > 2) bad.push(`${W}×${H}: 무덤 파기 칸이 정사각이 아니다(가로세로 차 ${sq.toFixed(1)}px)`);
}

console.log(`${OFF ? "【문 닫음 — 옛 글리프】" : "【지금】"}  잉크 = 칸 안의 그리는 것을 껐다 켜서 뺀 |ΔL| 평균 · top = 상위 10% 평균`);
console.log("창 크기      | 살 것(gear)  | 무덤(dig)    | 빈 칸(empty) | 온전한 줄 · 굴러나감");
for (const r of rows) {
  const c = (k) => r.g[k] ? `${String(r.g[k].ink).padStart(5)}/${String(r.g[k].top).padStart(5)}` : "  (못 잼)  ";
  console.log(`${r.size.padEnd(12)} | ${c("gear")}  | ${c("dig")}  | ${c("empty")}  | ${r.rows}줄 · ${r.cut}칸`);
}
/* ── 판정 ── 무덤 파기도 **좌판의 한 칸**이다. 옆 열 칸과 같은 결로 보여야 한다.
   ① 바닥이 바닥이어야 자가 산다: 빈 칸 ink < 1.5 (그림이 없으니 0 에 붙어야 한다)
   ② 무덤 ink ≥ 살 것 평균의 60% — 「같은 좌판의 물건」으로 읽히는 선 */
const FLOOR = 1.5, REL = 0.60; const note = [];
for (const r of rows) {
  const G = r.g.gear, D = r.g.dig, E = r.g.empty;
  if (E && E.ink >= FLOOR) bad.push(`${r.size}: 바닥이 안 눌렸다 — 빈 칸 ink ${E.ink} ≥ ${FLOOR}(자를 못 믿는다)`);
  if (!G) { bad.push(`${r.size}: 살 것 칸이 하나도 안 보인다`); continue; }
  if (!D) { note.push(`${r.size}: 무덤 파기 칸이 **굴러 나가** 못 쟀다(V-35)`); continue; }
  if (D.ink < G.ink * REL) bad.push(`${r.size}: 무덤 파기 ink ${D.ink} < 살 것 ${G.ink} 의 ${REL * 100}%`);
}
/* ★ 여기서 **나무라기만 하고 안 막는다** — 좌판이 반 줄로 눌리는 것은 V-35 의 몫이고,
   이 자는 「칸의 그림」을 재는 자다. 대신 눈에 띄게 적어 둬서 잊히지 않게 한다. */
for (const r of rows) if (r.rows < 1)
  note.push(`${r.size}: 좌판에 **온전한 줄이 하나도 없다**(칸 ${r.cut}개가 굴러 나감) — V-35`);
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
for (const n of note) console.log(`  ※ ${n}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과 (무덤 파기 칸이 옆 열 칸과 같은 결로 보인다 · 회귀 셋 그대로)"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
