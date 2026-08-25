/* V-52 자 — 싸움 한복판에서 «누가 무엇을 덮는가»를 센다.
   ① 체력줄이 제 임자 머리에서 몇 칸이나 밀려났나
   ② 밀려난 줄이 «남의 몸» 위에 얹힌 넓이 비율
   ③ 몸끼리 겹친 넓이 비율(뭉침)
     node tools/v52_ruler.mjs [초]  */
const SEC = +(process.argv[2] || 150);
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2500);
await ev(`localStorage.clear()`); await S("Page.reload", { ignoreCache: true }); await wait(2800);
await ev(`window.__RECTS = {bars:[],nums:[],bodies:[],frames:0}`);
await ev(`window.__V52 = {n:0, bars:0, shoved:0, shoveSum:0, overOther:0, overArea:0, barArea:0,
  bodies:0, bodyOver:0, bodyArea:0, clump:0};
window.__v52tick = () => { const R = window.__RECTS; if (!R || !R.bodies.length) return; const V = window.__V52;
  const bo = R.bodies, ba = R.bars; if (!ba.length) return; V.n++;
  const inter = (a,b) => Math.max(0, Math.min(a[0]+a[2], b[0]+b[2]) - Math.max(a[0], b[0]))
                       * Math.max(0, Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]));
  for (const b of ba) { V.bars++; const area = b[2]*b[3]; V.barArea += area;
    /* 임자 = 닻(b[4],b[5])이 바닥점과 같은 몸 */
    let own = null, best = 1e9;
    for (const d of bo) { const dd = Math.abs(d[4]-b[4]) + Math.abs(d[5]-b[5]); if (dd < best) { best = dd; own = d; } }
    if (own) { const headTop = own[1]; const gap = (b[1]+b[3]) - headTop;   /* 0 이하면 머리 위 */
      if (gap > 2) { V.shoved++; V.shoveSum += gap; } }
    let ov = 0;
    for (const d of bo) { if (own && d[4]===own[4] && d[5]===own[5]) continue; ov += inter(b, d); }
    if (ov > area*0.15) V.overOther++;
    V.overArea += Math.min(ov, area); }
  for (let i=0;i<bo.length;i++) { V.bodies++; const a = bo[i]; V.bodyArea += a[2]*a[3]; let ov=0;
    for (let j=0;j<bo.length;j++) if (j!==i) ov += inter(a, bo[j]);
    V.bodyOver += Math.min(ov, a[2]*a[3]); if (ov > a[2]*a[3]*0.5) V.clump++; }
};
window.__v52timer = setInterval(window.__v52tick, 120);`);
await ev(`window.__toDungeon()`);
await wait(SEC * 1000);
const st = await ev(`({f:(window.S||{}).floor, lv:(window.S||{}).lv, V:window.__V52})`);
const V = st.V;
const pc = (a, b) => b ? (100*a/b).toFixed(1)+"%" : "-";
console.log(`층 ${st.f} · Lv ${st.lv} · 표본 ${V.n} 프레임`);
console.log(`체력줄 ${V.bars} 개 · 머리 아래로 밀린 것 ${V.shoved} (${pc(V.shoved,V.bars)}) · 평균 ${V.shoved? (V.shoveSum/V.shoved).toFixed(1):0}px`);
console.log(`남의 몸을 덮은 줄 ${V.overOther} (${pc(V.overOther,V.bars)}) · 덮은 넓이 ${pc(V.overArea,V.barArea)}`);
console.log(`몸 ${V.bodies} · 겹친 넓이 ${pc(V.bodyOver,V.bodyArea)} · 반 넘게 묻힌 몸 ${V.clump} (${pc(V.clump,V.bodies)})`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
