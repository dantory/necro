/* V-35 자 — **낮은 창에서 상인·대장간 좌판이 「온전한 줄」을 몇 줄 보여 주나.**

   V-34 의 자를 세우다 나왔다: 1280×620 에서 무덤 파기 칸을 **못 쟀는데**, 그림이
   없어서가 아니라 칸이 격자의 창틀 밖으로 굴러 나가 있어서였다. 그 0 을 그냥
   뒀으면 「그림이 없다」로 읽혔을 것이다([[silent-zero-is-not-an-observation]]).

   ★ **원인을 항목에 적는 것은 짐작이다**([[cause-written-in-the-item-is-a-guess]]) —
     그래서 이 자는 「몇 줄 보이나」만이 아니라 **창의 세로를 누가 얼마나 먹었나**를
     통째로 찍는다(머리글 · 부제 · 좌판 · 설명 · 발치). 고친 뒤에도 같은 자로 잰다.

   ★ 재는 것은 **줄**이지 픽셀이 아니다. 칸 높이는 창마다 다르므로(반응형)
     「좌판이 쓸 수 있는 세로 ÷ (칸+틈)」의 정수부가 온전한 줄이다.

   node tools/v35_shopfit.mjs            (지금)
   NOSHOPFIT=1 node tools/v35_shopfit.mjs  (문 닫음 — 고치기 전 규칙으로 되돌려 잰다) */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, URL = "http://127.0.0.1:8774/index.html";
const OFF = process.env.NOSHOPFIT === "1";
const fs = await import("node:fs");
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

/* V-33·V-34 와 **같은 세이브**(몇 시간 논 사람) — 좌판이 빈 채로 찍히면 창 탓인지
   세이브 탓인지 안 갈린다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

/* 1512×863 은 병수님 화면, 1440×720·1280×620 은 노트북·작은 창.
   ★ 「낮은 창」의 문(max-height:800px)은 **아래 둘에만** 걸린다 — 위 하나는 대조군이다. */
const SIZES = [[1512, 863], [1440, 720], [1280, 620]];
const WINS = [["shop", "상인"], ["forge", "대장간"]];
const bad = [], rows = [];

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  /* 문 — 고치기 전 규칙(min-height:64px · 설명칸 46vh)으로 되돌린다. 같은 자로 앞뒤를 잰다. */
  if (OFF) await ev(`{const s=document.createElement("style");s.id="v35off";
     s.textContent="@media (max-height:800px){"
       + ".win .frame > .grid{flex:1 1 auto!important;min-height:64px!important;overflow-y:auto!important}"
       + ".win .frame > .tip{flex:0 0 auto!important;max-height:46vh!important;min-height:104px!important}}";
     document.head.appendChild(s);1}`);

  for (const [win, name] of WINS) {
    await ev(`window.__openWin && window.__openWin(${JSON.stringify(win)})`); await wait(700);
    const id2 = win === "shop" ? "winShop" : "winForge";
    const on = await ev(`!!document.getElementById(${JSON.stringify(id2)})?.classList.contains("on")`);
    if (!on) { bad.push(`${W}×${H} ${name}: 창이 안 열렸다`); continue; }

    const m = await ev(`(()=>{const w=document.getElementById(${JSON.stringify(id2)});
      const f=w.querySelector(".frame"), g=f.querySelector(".grid"), t=f.querySelector(".tip");
      const px=(e)=>e?Math.round(e.getBoundingClientRect().height):0;
      const cs=getComputedStyle(g);
      const cell=g.querySelector(".cell");
      const ch=cell?cell.getBoundingClientRect().height:0;
      const gap=parseFloat(cs.rowGap||cs.gap||"0")||0;
      const gr=g.getBoundingClientRect();
      /* 창틀 안에 **절반 넘게** 든 칸만 「보인다」로 센다 — 윗동강은 물건이 아니다. */
      let cut=0, seen=0;
      for(const c of g.querySelectorAll(".cell")){const r=c.getBoundingClientRect();
        const v=Math.max(0,Math.min(r.bottom,gr.bottom)-Math.max(r.top,gr.top))/r.height;
        if(v<0.5)cut++;else seen++;}
      /* 값·단추가 설명칸 안에 **온전히** 서 있나 — 낮은 창에서 이걸 지키려고 좌판을 굴렸다. */
      const btn=t?t.querySelector("button,.buyBtn,.wBtn"):null;
      let btnOk=null;
      if(btn){const br=btn.getBoundingClientRect(),tr=t.getBoundingClientRect();
        btnOk=(br.top>=tr.top-1 && br.bottom<=tr.bottom+1)?1:0;}
      return {frame:px(f), h2:px(f.querySelector("h2")), sub:px(f.querySelector(".wSub")),
              grid:px(g), tip:px(t), foot:px(f.querySelector(".winFoot")),
              gch:Math.round(g.clientHeight), gsh:Math.round(g.scrollHeight),
              cell:Math.round(ch), gap:Math.round(gap), cut, seen,
              tsh:t?Math.round(t.scrollHeight):0, tch:t?Math.round(t.clientHeight):0, btnOk};
    })()`);
    /* **온전한 줄** — 좌판이 실제로 보여 주는 세로를 (칸+틈)으로 나눈 정수부. */
    const whole = m.cell ? Math.floor((m.gch + m.gap) / (m.cell + m.gap)) : 0;
    const total = m.cell ? Math.ceil(m.gsh / (m.cell + m.gap)) : 0;
    rows.push({ size: `${W}×${H}`, win: name, ...m, whole, total });
    await ev(`window.__closeWin ? window.__closeWin() : document.getElementById(${JSON.stringify(id2)})?.classList.remove("on")`);
    await wait(250);
  }
  /* 제일 낮은 창은 **켜서도 찍는다** — 자만 보지 않는다([[play-it-before-measuring-it]]). */
  if (H === 620) { await ev(`window.__openWin && window.__openWin("shop")`); await wait(700);
    await shot(`tmp/v35_shop_${OFF ? "off" : "on"}_${W}.png`);
    await ev(`window.__closeWin && window.__closeWin()`); }
}

console.log(`${OFF ? "【문 닫음 — 고치기 전】" : "【지금】"}  창의 세로를 누가 먹었나 · 좌판이 보여 주는 «온전한 줄»`);
console.log("창 크기      | 창   | 머리 부제 좌판 설명 발치 | 칸  | 온전한 줄/전체 | 굴러나감 | 값·단추");
for (const r of rows)
  console.log(`${r.size.padEnd(12)} | ${r.win.padEnd(3)} | ${String(r.h2).padStart(4)}${String(r.sub).padStart(5)}${String(r.grid).padStart(5)}${String(r.tip).padStart(5)}${String(r.foot).padStart(5)} | ${String(r.cell).padStart(3)} | ${String(r.whole).padStart(6)}줄/${r.total}줄 | ${String(r.cut).padStart(5)}칸 | ${r.btnOk === null ? "  (없음)" : r.btnOk ? "   온전" : " ★잘림"}`);

/* ── 판정 ──
   ① **어느 창에서도 온전한 줄이 최소 하나**는 서야 한다. 반 줄은 물건이 아니라 윗동강이다.
   ② 낮은 창에서 좌판을 굴리기로 한 까닭은 **값·단추를 지키려던 것**이었다 —
      그 까닭이 아직 지켜지는지 같이 본다(회귀).
   ③ 굴러 나간 칸이 있어도 **구를 수 있으면** 된다(gsh > gch). 구르지도 못하는데
      잘려 있으면 그건 영영 못 보는 칸이다. */
const MIN_ROWS = 1;
for (const r of rows) {
  if (r.whole < MIN_ROWS)
    bad.push(`${r.size} ${r.win}: 온전한 줄이 ${r.whole} — 좌판이 «반 줄»로 눌렸다(칸 ${r.cell}px, 좌판 ${r.gch}px)`);
  if (r.cut > 0 && r.gsh <= r.gch + 2)
    bad.push(`${r.size} ${r.win}: 칸 ${r.cut}개가 잘렸는데 구르지도 못한다 — 영영 못 보는 칸이다`);
  if (r.btnOk === 0)
    bad.push(`${r.size} ${r.win}: 설명칸의 값·단추가 잘렸다 — 낮은 창 규칙의 까닭이 무너졌다`);
}
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : `통과 (모든 창에서 좌판이 온전한 줄을 ${MIN_ROWS}줄 이상 보여 주고, 값·단추도 그대로다)`}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
