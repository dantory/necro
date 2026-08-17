/* **일지 줄이 몇 px 을 원하는가** — 폭·글자크기를 정하기 전에 «자» 부터 세운다.
     node tools/logfit_probe.mjs [초=60]

   왜 이 자가 필요한가: 「세 토막짜리 줄은 무엇을 해도 두 줄이 된다」를 닫으려는데,
   `log_shot` 이 말해 주는 것은 **지금 폭에서 몇 %가 접히느냐** 하나뿐이다(64.1%).
   그 수만 보고 폭을 220→260 으로 올리면 «올려 보고 다시 재는» 짓을 폭마다 되풀이하게 된다
   ([[knob-that-does-nothing]] 의 반대 — 손잡이는 도는데 어디까지 돌려야 하는지를 모른다).

   그래서 줄마다 **접히지 않았다면 원했을 폭**을 잰다(같은 글꼴로 nowrap 복제).
   그러면 「폭 W · 글자 F 에서 몇 %가 한 줄에 드는가」를 **판을 안 고치고** 표로 뽑는다.
   문턱(두 줄 10% 아래)이 닿는 수인지 아닌지가 여기서 갈린다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 60);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 2500));
await S("Runtime.evaluate", { awaitPromise: true, expression:
  `new Promise(r => { const w = () => (window.LOAD && window.LOAD.done) ? r(1) : setTimeout(w, 200); w(); })` });
await S("Runtime.evaluate", { expression: `window.__toDungeon(); true` });
/* 훑어 모은다 — 상자는 최근 줄만 들고 있다. html 째로 들고 와야 굵은 머리말의 폭이 산다. */
await S("Runtime.evaluate", { expression: `(()=>{ window.__fitSeen = new Map();
  window.__fitTick = setInterval(()=>{ const el=document.getElementById('log'); if(!el) return;
    for(const c of el.children){ const t=c.textContent.trim(); if(!t) continue;
      if(!window.__fitSeen.has(t)) window.__fitSeen.set(t, c.innerHTML); } }, 400); return 1 })()` });
await new Promise(r => setTimeout(r, SEC * 1000));

const FONTS = [18, 17, 16, 15, 14];
const WIDTHS = [192, 212, 232, 252, 272, 292, 332, 392];
const out = (await S("Runtime.evaluate", { returnByValue: true, expression: `(()=>{
  clearInterval(window.__fitTick);
  const el = document.getElementById('log'), cs = getComputedStyle(el);
  const 지금폭 = el.getBoundingClientRect().width;
  /* 견줌자 — 일지와 **같은 글꼴·자간·굵기 규칙**을 쓰되 nowrap 으로 두어 원하는 폭이 나오게 한다.
     일지 안에 넣어야 상속되는 값(font-family·색·굵기 규칙)이 그대로 걸린다. */
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;width:auto;left:-9999px;top:0';
  el.appendChild(ruler);
  const 줄 = [...window.__fitSeen.entries()];
  const 잰다 = f => { ruler.style.fontSize = f + 'px';
    return 줄.map(([t, h]) => { ruler.innerHTML = h; return ruler.getBoundingClientRect().width; }); };
  const FONTS = ${JSON.stringify(FONTS)}, WIDTHS = ${JSON.stringify(WIDTHS)};
  const 표 = {};
  for (const f of FONTS) { const w = 잰다(f);
    표[f] = WIDTHS.map(W => +((w.filter(x => x > W + 0.5).length) * 100 / w.length).toFixed(1)); }
  /* ── 둘째 자: **머리말은 18px 그대로 두고 딸린 말(.d)만** 줄인다 ──
     「이름은 크게, 딸린 말은 작고 옅게」가 이 일지의 뜻이다(hud.css 267). 통째로 줄이면
     그 뜻까지 같이 줄어든다. 긴 것은 어차피 딸린 말 쪽이니 거기만 재 본다. */
  const DS = [0.8, 0.74, 0.68, 0.62, 0.56];
  const st = document.createElement('style'); el.appendChild(ruler); document.head.appendChild(st);
  const 표d = {};
  for (const d of DS) { st.textContent = '#log .d{font-size:' + d + 'em}';
    const w = 잰다(18);
    표d[d] = WIDTHS.map(W => +((w.filter(x => x > W + 0.5).length) * 100 / w.length).toFixed(1)); }
  st.remove();
  /* 지금 글자(18px)에서 폭이 큰 순서로 몇 개 — 무엇이 제일 긴 줄인지 눈으로 본다 */
  ruler.style.fontSize = '18px';
  const 폭 = 줄.map(([t, h]) => { ruler.innerHTML = h; return [t, Math.round(ruler.getBoundingClientRect().width)]; })
                .sort((a, b) => b[1] - a[1]);
  ruler.remove();
  const 값 = 폭.map(x => x[1]).sort((a, b) => a - b);
  const q = p => 값[Math.min(값.length - 1, Math.floor(값.length * p))];
  return JSON.stringify({ 지금폭, 잰줄: 줄.length, 글자: cs.fontSize,
    중앙값: q(.5), p75: q(.75), p90: q(.9), 최대: 값[값.length - 1],
    표, FONTS, WIDTHS, 표d, DS,
    긴줄: 폭.slice(0, 10).map(([t, w]) => w + 'px · ' + t.slice(0, 44)) });
})()` })).result.value;
const o = JSON.parse(out);
console.log(`일지 폭 ${o.지금폭}px · 글자 ${o.글자} · 잰 줄 ${o.잰줄}개`);
console.log(`원하는 폭  중앙값 ${o.중앙값}px · 75% ${o.p75}px · 90% ${o.p90}px · 최대 ${o.최대}px\n`);
console.log('두 줄 이상이 되는 비율 (%) — 세로 글자크기 · 가로 일지 폭');
console.log('  글자 | ' + o.WIDTHS.map(w => String(w).padStart(6)).join(''));
for (const f of o.FONTS) console.log(`  ${String(f).padStart(4)} | ` + o.표[f].map(v => String(v).padStart(6)).join(''));
console.log('\n머리말 18px 고정 · 딸린 말(.d)만 줄일 때 (%)');
console.log('  .d   | ' + o.WIDTHS.map(w => String(w).padStart(6)).join(''));
for (const d of o.DS) console.log(`  ${String(d).padStart(4)} | ` + o.표d[d].map(v => String(v).padStart(6)).join(''));
console.log('\n제일 긴 줄들:'); for (const s of o.긴줄) console.log('  ' + s);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
