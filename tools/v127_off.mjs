/* V-127 자 — **오프라인 창이 그 사람의 수로 말하는가.**
   `node tools/v127_off.mjs`      지금 결
   `node tools/v127_off.mjs old`  문(`__OFFOLD`)으로 고치기 전을 다시 세운다 — 결함을 잡을 수
                                  있는 자인지 스스로 보인다([[silent-zero-is-not-an-observation]]).
   재는 것 ① 창고 상한(140)을 수로 말한 창 ② 시체가 상한에 닿았음을 말한 창
           ③ 「8시간」이 시체 줄 밑에 홀로 서서 시체에도 걸리는 것처럼 읽히는 창(결함)
           ④ 효율(절반)을 말한 창  ⑤ 좁은 화면 넘침(px) */
const OLD = process.argv[2] === "old";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
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
const ev = async e => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)); return r.result?.value; };

/* 사람 다섯 × 화면 셋. 「잠깐」은 창고에 여유가 있는 유일한 자리라 꼭 넣는다 —
   그 자리가 없으면 「늘 찼다」와 「제대로 센다」를 못 가른다([[floor-far-from-threshold]]). */
const CASES = [
  { k: "n5",  lbl: "갓 시작 · 5분",     min: 5,        meta: { lv: 3,  deepest: 1,  corpses: 0 } },
  { k: "n30", lbl: "갓 시작 · 30분",    min: 30,       meta: { lv: 3,  deepest: 2,  corpses: 0 } },
  { k: "n3h", lbl: "저녁 · 3시간",      min: 180,      meta: { lv: 22, deepest: 18, corpses: 0 } },
  { k: "n9h", lbl: "밤새 · 9시간",      min: 9 * 60,   meta: { lv: 22, deepest: 18, corpses: 0 } },
  { k: "n3d", lbl: "사흘 · 77시간",     min: 77 * 60,  meta: { lv: 46, deepest: 34, corpses: 120 } },
];
const SCREENS = [[1512, 863], [1366, 700], [1152, 648], [1280, 620]];

let capNamed = 0, fullSaid = 0, hourAlone = 0, effSaid = 0, over = 0, n = 0, planted = 0;
const rows = [];
for (const [w, h] of SCREENS) {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  for (const c of CASES) {
    await S("Page.navigate", { url: URL }); await wait(900);
    await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
    await ev(`(()=>{const K="necro.meta.v1";
      const m=JSON.parse(localStorage.getItem(K)||"{}");
      Object.assign(m, ${JSON.stringify(c.meta)});
      m.up={hp:6,mp:4,dmg:7,army:3}; m.gold=(m.gold|0)+50000;
      m.lastSeen = Date.now() - ${c.min}*60000;
      localStorage.setItem(K, JSON.stringify(m)); return 1})()`);
    if (OLD) await ev(`globalThis.__OFFOLD=1`);
    await S("Page.addScriptToEvaluateOnNewDocument", { source: OLD ? "globalThis.__OFFOLD=1;" : "delete globalThis.__OFFOLD;" });
    await S("Page.reload", { ignoreCache: true }); await wait(2000);
    const r = await ev(`(()=>{const wo=document.getElementById('winOffline');
      if(!wo||!wo.classList.contains('on')) return {on:false};
      const b=document.getElementById('offBody'); const t=(b?b.innerText:'').trim();
      const lines=t.split('\\n').map(s=>s.trim()).filter(Boolean);
      const cLine=lines.find(s=>s.startsWith('시체'))||'';
      const gLine=lines.find(s=>s.startsWith('금'))||'';
      /* 「8시간까지만」이 **홀로 선 줄**인가(시체 줄 밑에 붙어 시체에도 걸리는 것처럼 읽힌다) */
      const alone=lines.some(s=>/^\\d+시간까지만/.test(s));
      const card=wo.querySelector('.win,.winBox,.panel')||wo;
      const ov=Math.max(0, card.scrollHeight-card.clientHeight, wo.scrollHeight-wo.clientHeight);
      return {on:true, t, cLine, gLine, alone, ov,
              capNum: /\\/\\s*140|140구/.test(t),
              full: /창고가\\s*찼|한 짐/.test(t),
              eff: /절반|\\d+%씩/.test(gLine)};})()`);
    if (!r.on) { console.log(`  ✗ ${w}x${h} ${c.lbl} — 창이 안 떴다`); continue; }
    n++;
    if (r.capNum) capNamed++;
    if (r.full) fullSaid++;
    if (r.alone) hourAlone++;
    if (r.eff) effSaid++;
    over += r.ov;
    if (w === 1512) rows.push(`  ${c.lbl.padEnd(16)} | ${r.gLine} | ${r.cLine}`);
  }
}
/* ★ **못 잡으면 스스로 진다** — 일부러 「한 짐」을 심어 자가 그것을 결함으로 읽는지 본다. */
{
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  const t = await ev(`(()=>{const b=document.getElementById('offBody');
    if(!b) return '';
    b.innerHTML='<div class="tip"><div class="tipStat">시체는 <b>한 짐</b>까지만 지고 간다</div><div class="tipStat dim">8시간까지만 쌓인다</div></div>';
    const x=b.innerText; return x;})()`);
  const lines = t.split("\n").map(s => s.trim()).filter(Boolean);
  const caught = !/\/\s*140|140구/.test(t) && lines.some(s => /^\d+시간까지만/.test(s));
  planted = caught ? 1 : 0;
}

console.log(`\n══ V-127 오프라인 창 ${OLD ? "(옛 결)" : "(지금)"} — 사람 ${CASES.length} × 화면 ${SCREENS.length} = ${n} ══`);
for (const r of rows) console.log(r);
console.log(`\n  창고 상한(140)을 수로 말한 창      ${capNamed}/${n}`);
console.log(`  창고가 찼음을 말한 창              ${fullSaid}/${n}`);
console.log(`  「N시간까지만」이 홀로 선 창(결함)  ${hourAlone}/${n}`);
console.log(`  효율(절반)을 말한 창               ${effSaid}/${n}`);
console.log(`  좁은 화면 넘침 합계                ${over}px`);
console.log(`  심은 결함을 잡았나                 ${planted ? "예" : "아니오"}`);

let bad = 0;
if (!planted) { console.log("  ✗ 자가 심은 결함을 못 잡는다 — 판정하지 않는다"); bad = 1; }
else if (!OLD) {
  if (capNamed !== n)  { console.log("  ✗ 상한을 수로 안 적은 창이 있다"); bad = 1; }
  if (hourAlone !== 0) { console.log("  ✗ 「N시간까지만」이 아직 홀로 선다"); bad = 1; }
  if (effSaid !== n)   { console.log("  ✗ 효율을 안 적은 창이 있다"); bad = 1; }
  if (over !== 0)      { console.log("  ✗ 좁은 화면에서 넘친다"); bad = 1; }
  if (!bad) console.log("  ok  다섯 자리 다 그 사람의 수로 말한다");
}
console.log(`판정: ${bad ? "운다" : "통과"}`);
await S("Target.closeTarget", { targetId });
bws.close(); process.exit(bad);
