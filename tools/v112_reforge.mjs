/* ══ V-112 자 ══ 대장간 설명칸의 **「재련」 줄이 처음 켠 사람에게 전부 `+0`** 이다.
   열 자리(지팡이·망토·부적·투구·장갑·반지·방패·허리띠·신발·반지②)를 조건 없이 적어서,
   창 안에서 **가장 긴 줄(두 줄로 접힌다)이 가장 뜻이 없다.**

   ★ **오른 것만 적고, 하나도 없으면 줄째 접는다.** 지워도 「재련이 있다」는 바로 아래
     줄(「다음 재련 N 금 — 저절로 산다」)이 말해 주므로 사는 길이 안 사라진다.
   ★ **세 사람을 잰다** — 처음 켠 사람(열 자리 전부 0) · 셋만 오른 사람 · 열 자리가 다
     오른 사람. 뒤엣둘이 **과잉 수정 막이**다: 오른 자리는 한 톨도 안 사라져야 한다.
   ★ **값은 화면이 아니라 `META.plus` 에서 읽는다** — 화면에서 되읽으면 자가 제 고침을
     되읽는다([[silent-zero-is-not-an-observation]]). 심은 값과 적힌 값을 견준다.
   ★ **같은 창 안의 막이** — 「다음 재련 N 금」 줄 · 「지금 · 체력/마나/군세」 줄 · 격자 칸
     수 · 단추가 그대로여야 한다. 줄을 접다가 옆줄을 데려가면 여기서 운다.

   쓰기:  node tools/v112_reforge.mjs [old]
          old → window.__REFOLD 로 옛 결(열 자리 전부)을 되돌려 자가 정말 우는지 보정한다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv.includes("old");

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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });

/* 설명칸의 줄을 그대로 읽는다. 「재련 줄」은 첫 낱말이 `재련` 인 줄 — 낱말 자리로 찾고
   글월을 손으로 안 적는다. 접힌 줄 수는 **글자 높이로 나눠** 센다(값 길이에 달렸으므로). */
const MEASURE = `(()=>{
  const t=document.getElementById("forgeTip"); if(!t) return {오류:"대장간 설명칸이 없다"};
  const 줄들=[...t.querySelectorAll(":scope > .tipStat")].map(r=>{
    const cs=getComputedStyle(r), lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.4;
    return { 글:r.innerText.trim(), 높이:r.getBoundingClientRect().height,
             접힌줄:Math.max(1,Math.round(r.getBoundingClientRect().height/lh)),
             값들:[...r.querySelectorAll("b")].map(b=>b.textContent.trim()) };
  });
  const 재련=줄들.find(r=>r.글.startsWith("재련"));
  const 다음=줄들.find(r=>r.글.startsWith("다음 재련"));
  const 지금=줄들.find(r=>r.글.startsWith("지금"));
  return { 줄수:줄들.length, 재련:재련||null, 다음있나:!!다음, 지금있나:!!지금,
           글줄합:줄들.reduce((a,r)=>a+r.접힌줄,0),
           설명칸높이:Math.round(t.getBoundingClientRect().height),
           칸수:document.querySelectorAll("#forgeGrid .cell").length,
           단추수:document.querySelectorAll("#forgeTip button").length };
})()`;

const 재기 = async (name, seed, 심은몫) => {
  await S("Page.reload", { ignoreCache: true }); await wait(1500);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  if (OLD) await ev(`window.__REFOLD=1`);
  if (seed) { await ev(seed); await wait(150); }
  await ev(`window.__openWin("forge")`); await wait(600);
  const m = await ev(MEASURE);
  if (m?.오류) { console.log(`── ${name}: ${m.오류}`); return null; }
  /* 참값 — 화면이 아니라 META.plus 에서 읽는다. */
  const 참 = await ev(`(()=>{const M=window.META;return M?Object.fromEntries(Object.entries(M.plus).map(([k,v])=>[k,v|0])):null})()`);
  const 참오른자리 = 참 ? Object.values(참).filter(v => v > 0).length : -1;
  const 적힌값 = m.재련 ? m.재련.값들 : [];
  const 적힌0 = 적힌값.filter(v => v === "+0").length;
  const 적힌오른자리 = 적힌값.filter(v => v !== "+0").length;
  console.log(`── ${name}   (설명칸 ${m.줄수}칸 · 글 ${m.글줄합}줄 · 칸 ${m.칸수} · 단추 ${m.단추수})`);
  console.log(`   재련 줄: ${m.재련 ? `있다 (${m.재련.접힌줄}줄 접힘) → ${m.재련.글.replace(/\s+/g, " ")}` : "없다(접힘)"}`);
  console.log(`   ★ 뜻 없는 「+0」: ${적힌0}   적힌 오른 자리: ${적힌오른자리} (참값 ${참오른자리})` +
              `   막이: 다음재련줄=${m.다음있나} 지금줄=${m.지금있나}`);
  return { 적힌0, 적힌오른자리, 참오른자리, 줄수: m.줄수, 접힌줄: m.재련 ? m.재련.접힌줄 : 0,
           글줄: m.글줄합, 칸수: m.칸수, 단추수: m.단추수, 다음있나: m.다음있나, 지금있나: m.지금있나 };
};

const 심기 = (o) => `(()=>{const M=window.META;${Object.entries(o).map(([k, v]) => `M.plus.${k}=${v};`).join("")}return 1})()`;
const a = await 재기("처음 켠 사람 (아무 자리도 안 올랐다)", null);
/* 과잉 수정 막이 ① — 셋만 오른 사람. 그 셋은 반드시 남아야 한다. */
const b = await 재기("셋만 오른 사람 (지팡이+2 · 투구+1 · 신발+3 · 막이)", 심기({ wand: 2, helm: 1, boots: 3 }));
/* 과잉 수정 막이 ② — 열 자리가 다 오른 사람. 옛 결과 **똑같아야** 한다. */
const c = await 재기("열 자리가 다 오른 사람 (전부 +1 · 막이)",
  `(()=>{const M=window.META;Object.keys(M.plus).forEach(k=>M.plus[k]=1);return 1})()`);

const 통과 = a && b && c &&
  a.적힌0 === 0 && a.적힌오른자리 === 0 &&                   /* 처음 켠 사람 — 줄이 접혀 있다 */
  b.적힌0 === 0 && b.적힌오른자리 === b.참오른자리 &&        /* 셋은 그대로 · 0 은 안 적는다 */
  c.적힌0 === 0 && c.적힌오른자리 === c.참오른자리 &&        /* 열 자리 다 남는다 */
  a.다음있나 && b.다음있나 && c.다음있나 &&                  /* 사는 길이 안 사라졌다 */
  a.지금있나 && b.지금있나 && c.지금있나 &&                  /* 옆줄을 안 데려갔다 */
  a.칸수 === b.칸수 && b.칸수 === c.칸수 &&
  a.단추수 === b.단추수 && b.단추수 === c.단추수 &&
  a.접힌줄 === 0 && c.접힌줄 >= 2 &&                         /* 접혔다 · 다 오른 사람은 그대로 두 줄 */
  a.글줄 < c.글줄;                        /* ★ 설명칸 상자는 높이가 못박혀 있다 — 줄어드는 것은 «글줄» 이다 */
console.log(`\n판정: ${통과 ? "통과" : "★ 미달"}   (처음 켠 사람 「+0」 ${a?.적힌0} · 글 ${a?.글줄}줄 ↔ 다 오른 사람 ${c?.글줄}줄 · ` +
            `셋 오른 사람 적힘 ${b?.적힌오른자리}/${b?.참오른자리} · 칸 ${a?.칸수} · 단추 ${a?.단추수})`);
await S("Target.closeTarget", { targetId });
process.exit(통과 ? 0 : 1);
