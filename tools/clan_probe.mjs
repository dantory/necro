/* **갈래가 정말 갈리는가** (2026-08-24 · V-7)
   ① 물들인 스프라이트의 몸빛을 재서 갈래끼리 얼마나 떨어졌는지(RGB 거리·색상)
   ② 실제 판(1·2·3층)에 선 놈들의 갈래 섞임 */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Network.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Page.navigate", { url: PAGE }); await wait(2000);
const r = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async()=>{
  const C = await import("/js/core.js");
  const im = new Image(); im.src = "assets/mob/fallen/south.png"; await im.decode();
  const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  /* 몸빛 = 불투명 화소의 **밝은 절반** 평균. 어두운 테두리·그림자를 빼야 옷 색이 나온다. */
  const body = (f) => {
    g.clearRect(0, 0, cv.width, cv.height); g.filter = f || "none";
    g.drawImage(im, 0, 0); g.filter = "none";
    const d = g.getImageData(0, 0, cv.width, cv.height).data, px = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i+1], d[i+2]]);
    px.sort((a, b) => (b[0]+b[1]+b[2]) - (a[0]+a[1]+a[2]));
    const top = px.slice(0, Math.max(1, px.length >> 1));
    const s = top.reduce((a, p) => [a[0]+p[0], a[1]+p[1], a[2]+p[2]], [0,0,0]);
    return s.map(v => Math.round(v / top.length));
  };
  const hue = ([r,gg,b]) => { const mx = Math.max(r,gg,b), mn = Math.min(r,gg,b), d = mx - mn;
    if (!d) return 0; let h = mx===r ? ((gg-b)/d)%6 : mx===gg ? (b-r)/d+2 : (r-gg)/d+4;
    return Math.round(((h*60)+360)%360); };
  const cols = C.MOB_CLAN.map(c => ({ n: c.n || "붉은", rgb: body(c.f) }));
  cols.forEach(c => c.hue = hue(c.rgb));
  const dist = [];
  for (let i = 0; i < cols.length; i++) for (let j = i+1; j < cols.length; j++) {
    const a = cols[i].rgb, b = cols[j].rgb;
    dist.push(cols[i].n + "↔" + cols[j].n + " " + Math.round(Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2])));
  }
  /* 실제 판에 설 갈래 섞임 — spawnMob 이 쓰는 그 식 그대로, 층마다 스무 마리분 */
  const mix = {};
  for (const f of [1, 2, 3]) {
    const cnt = C.MOB_CLAN.map(() => 0);
    for (let i = 1; i <= 20; i++) cnt[C.clanIdx(i + f * 20, f)]++;
    mix[f + "층"] = cnt.join("/");
  }
  return JSON.stringify({ 몸빛: cols.map(c => c.n + " rgb(" + c.rgb + ") 색상 " + c.hue + "°"), 갈래거리: dist, 섞임: mix }, null, 1);
})()` });
console.log(r.result.value);
await raw("Target.closeTarget", { targetId });
process.exit(0);
