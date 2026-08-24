/* ══ V-37 자 — 「편성·운용 여덟 칸의 그림이 눈에 얼마나 나타나나」 ══
   이 두 창의 칸은 판에서 **마지막까지 유니코드 글리프**였다(⚖ ☠ ✦ ◆ · ☯ ⚑ ⬢ ✷).
   시스템 폰트가 그린 획은 42~56px 칸에서 가늘고, ✦/◆ 와 ⬢/✷ 는 모양만으로 안 갈렸다.

   재는 법은 V-33·V-34 그대로 — **그림을 껐다 켜서 뺀 잉크**(`tools/v33_pix.py` 를 그대로
   쓴다). 바탕이 칸마다 달라도(고른 칸은 테가 금색이다) 안 흔들린다.
   ★ 같은 사진 안에 눈금을 둔다([[floor-far-from-threshold]]):
       pick  = 재려는 여덟 칸
       belt  = 벨트 아이콘(이미 픽셀 그림인 칸) ← 위 눈금
   ★ 문 `__PICKGLYPH=1` 로 **고치기 전 꼴**을 그 자리에서 다시 세워 나란히 잰다.

   node tools/v37_pickico.mjs                (고친 뒤)
   PICKGLYPH=1 node tools/v37_pickico.mjs    (고치기 전 — 옛 글리프)                */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const URL = "http://127.0.0.1:8774/index.html";
const GLYPH = process.env.PICKGLYPH === "1";
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };
await S("Page.reload", { ignoreCache: true });
await wait(3500);
if (GLYPH) { await ev("globalThis.__PICKGLYPH=1"); }

const rows = [];
for (const win of ["doctrine", "tactic"]) {
  const kind = win === "doctrine" ? "doc" : "tac";
  const nodes = await ev(`(()=>{window.__openWin(${JSON.stringify(win)});
    const out=[];
    document.querySelectorAll('.win.on .cell.pick').forEach(c=>{
      const g=c.querySelector('i,.lvl'); if(!g)return; const b0=g.getBoundingClientRect();
      /* ★ **그림이 그려지는 네모만 잰다.** 이 칸의 상자는 170×56 으로 옆으로 길지만
         그림은 contain 이라 가운데 **56×56 정사각**으로만 앉는다 — 긴 상자를 그대로
         재면 빈 옆구리가 잉크를 3분의 1로 묽힌다([[threshold-and-ruler-must-match]]).
         벨트(정사각 칸)와 나란히 놓으려면 분모가 같아야 한다. */
      const side=Math.min(b0.width,b0.height);
      const b={left:b0.left+(b0.width-side)/2, top:b0.top+(b0.height-side)/2, width:side, height:side};
      out.push({id:${JSON.stringify(kind)}+":"+(c.dataset.doc||c.dataset.tac),
        state:c.classList.contains('sel')?'sel':'off',
        r:{x:b.left,y:b.top,w:b.width,h:b.height}});});
    /* 벨트는 창 밖에 늘 서 있다 — 같은 사진 안의 위 눈금 */
    document.querySelectorAll('#belt .bslot i, #belt i').forEach((g,i)=>{
      if(i>2)return; const b=g.getBoundingClientRect(); if(b.width<4)return;
      out.push({id:"belt:"+i,state:'ref',r:{x:b.left,y:b.top,w:b.width,h:b.height}});});
    return out;})()`);
  await wait(450);
  await shot(`tmp/v37_${kind}_on.png`);
  /* 끔 — 그림/글리프만 감춘다(테·이름은 그대로 두어 바탕이 안 흔들리게) */
  await ev(`document.querySelectorAll('.win.on .cell.pick i,.win.on .cell.pick .lvl,#belt i').forEach(e=>e.style.visibility='hidden')`);
  await wait(300);
  await shot(`tmp/v37_${kind}_off.png`);
  await ev(`document.querySelectorAll('.win.on .cell.pick i,.win.on .cell.pick .lvl,#belt i').forEach(e=>e.style.visibility='')`);
  const job = { on: `tmp/v37_${kind}_on.png`, off: `tmp/v37_${kind}_off.png`, dpr: 2, nodes };
  fs.writeFileSync(`tmp/v37_${kind}_job.json`, JSON.stringify(job));
  const r = cp.execFileSync("python3", ["tools/v37_pixwrap.py", `tmp/v37_${kind}_job.json`], { encoding: "utf8" });
  rows.push(...JSON.parse(r));
}
await raw("Target.closeTarget", { targetId }); bws.close();

const pick = rows.filter(r => !r.id.startsWith("belt")), ref = rows.filter(r => r.id.startsWith("belt"));
const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null;
/* 문턱 12 — **바닥과 위 눈금을 먼저 재고 그 사이에 놓았다**([[floor-far-from-threshold]]).
   그림 네모만 재도록 자를 고친 뒤의 값이다:
     옛 글리프 여덟 칸  잉크 2.8~15.7 (평균 7.2)   ← 바닥
     벨트의 진짜 그림 셋 잉크 10.7~19.2 (평균 15.3) ← 위 눈금
     지금(픽셀 그림)     잉크 15.2~40.0 (평균 28.0)
   ★ **잉크는 「나타나는가」만 말한다 — 「갈라지는가」는 말 못 한다.** 옛 ◆(골렘 벽)는
     속이 꽉 찬 마름모라 잉크 15.7 로 혼자 높았는데, 그게 바로 ✦ 와 안 갈리던 그 칸이다.
     그래서 이 자를 통과해도 **켜서 눈으로 본다**([[play-it-before-measuring-it]]). */
const FLOOR = 12;
const bad = pick.filter(r => (r.ink ?? 0) < FLOOR);
console.log(JSON.stringify({
  mode: GLYPH ? "옛 글리프" : "지금",
  errors: errs,
  pick: pick.map(r => ({ id: r.id, state: r.state, ink: +(r.ink ?? 0).toFixed(1), top: +(r.top ?? 0).toFixed(1) })),
  refBelt: ref.map(r => ({ id: r.id, ink: +(r.ink ?? 0).toFixed(1) })),
  pickInkAvg: avg(pick.map(r => r.ink ?? 0)), beltInkAvg: avg(ref.map(r => r.ink ?? 0)),
  문턱: FLOOR, 밑도는칸: bad.map(r => r.id),
  판정: bad.length ? "떨어짐" : "통과",
}, null, 1));
process.exit(bad.length ? 1 : 0);
