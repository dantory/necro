/* V-127 켜서 보기 — **돌아온 사람이 맨 처음 보는 창**(오프라인 정산)을 처음으로 찍는다.
   v126_scan 이 훑은 여덟(stat·bag·tree·forge·shop·doctrine·tactic·dive)에 이 창은 없다.
   그런데 이건 켤 때마다 **다른 창보다 먼저** 뜬다([[play-it-before-measuring-it]]). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OUT = "tmp/";
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
const fs = await import("node:fs");
const shot = async (name) => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(OUT + name, Buffer.from(data, "base64")); console.log("  찍음 " + OUT + name); };

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: URL }); await wait(1500);

/* 사람 셋 — 「잠깐 비운 초보」·「밤새 비운 사람」·「사흘 비운 사람(창고도 찼다)」 */
const CASES = [
  { k: "n30",  lbl: "갓 시작 · 30분",       min: 30,     meta: { lv: 3,  deepest: 2,  corpses: 0 } },
  { k: "n8h",  lbl: "밤새 · 9시간(상한)",   min: 9 * 60, meta: { lv: 22, deepest: 18, corpses: 0 } },
  { k: "n3d",  lbl: "사흘 · 77시간(창고참)", min: 77 * 60, meta: { lv: 46, deepest: 34, corpses: 120 } },
];

for (const c of CASES) {
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  /* 저장을 **직접** 쓴다 — 게임이 부팅하며 applyOffline 을 부르므로 lastSeen 이 과거라야 뜬다. */
  await ev(`(()=>{const K="necro.meta.v1";
    const m=JSON.parse(localStorage.getItem(K)||"{}");
    Object.assign(m, ${JSON.stringify(c.meta)});
    m.up={hp:6,mp:4,dmg:7,army:3}; m.gold=(m.gold|0)+50000;
    m.lastSeen = Date.now() - ${c.min}*60000;
    localStorage.setItem(K, JSON.stringify(m)); return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  const seen = await ev(`(()=>{const w=document.getElementById('winOffline');
    if(!w||!w.classList.contains('on')) return {on:false};
    const b=document.getElementById('offBody');
    return {on:true, txt:(b?b.innerText:'').trim(), gold:(document.getElementById('offGold')||{}).textContent||''};})()`);
  console.log(`\n── ${c.lbl} ──`);
  if (!seen.on) { console.log("  ✗ 창이 안 떴다"); continue; }
  console.log(seen.txt.split("\n").map(s => "  | " + s).join("\n"));
  console.log("  금(머리) " + seen.gold);
  await shot(`v127_${c.k}.png`);
}
await S("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
