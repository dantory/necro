/* **움직임과 공격이 자연스러운가** — 판을 빨리 감지 않고 **실제로 흐르는 화면**을
   프레임마다 기록해 본다. 지금까지의 검수기는 판을 멈추고 세워 찍었다(자세·크기·등급).
   이건 반대로 **멈추면 안 보이는 것**을 본다: 미끄러짐 · 떨림 · 순간이동 ·
   가는 쪽과 보는 쪽이 다른 것 · 때리는 그림과 피해가 어긋나는 것.

     node tools/motion_qa.mjs [초] [out.png]

   ★ 여기서는 step() 을 손으로 돌리지 않는다. 애니메이션 프레임과 방향은 **그리는
     고리**가 정하므로, 빨리 감으면 그 값이 통째로 가짜가 된다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const SEC = +(process.argv[2] || 4);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
/* 중간쯤 자란 사람으로 본다 — 1층은 적이 하나뿐이라 움직임이 안 보인다. */
await S("Runtime.evaluate", { expression:
  `localStorage.setItem("necro.meta.v1", JSON.stringify({gold:9000,lv:12,deepest:9,runs:3,
     up:{hp:3,mp:2,dmg:2,army:1}, equip:{}, bag:[], tree:{bone:2,armor:3}}))` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4500));
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await new Promise(r => setTimeout(r, 800));
/* 군대가 서고 적이 붙을 때까지 **실제 시간으로** 둔다(그려야 auto 가 돈다) */
await S("Runtime.evaluate", { expression: `window.__S.floor = 8; window.__S.speed = 1;` });
await new Promise(r => setTimeout(r, 9000));

/* ── 기록기 ── 그리는 고리에 얹어 **프레임마다** 찍는다. 그리기가 정하는 값
   (방향 dir · 애니 프레임 fr · 지금 무슨 그림인지 art)까지 같이 봐야 뜻이 있다. */
await S("Runtime.evaluate", { expression: `(()=>{
  const S = window.__S; const R = window.__M = { fr: [], t0: performance.now() };
  const snap = () => {
    const t = (performance.now() - R.t0) / 1000;
    const one = (u, side) => ({ side, id: u.id, kind: u.kind || "?",
      x: +u.x.toFixed(2), y: +u.y.toFixed(2),
      atk: +(u.atk || 0).toFixed(2), rise: +(u.rise || 0).toFixed(2),
      dx: +(u.dx ?? 0).toFixed(3), dy: +(u.dy ?? 1).toFixed(3), mv: +(u.moving || 0).toFixed(2), tid: u.tgtId | 0,
      sw: u.pending ? 1 : 0, hp: Math.round(u.hp) });
    R.fr.push({ t: +t.toFixed(3),
      u: S.minions.map(m => one(m, "아군")).concat(S.mobs.map(m => one(m, "적"))),
      necro: { hurt: +(S.hurt || 0).toFixed(2), natk: +(S.natk || 0).toFixed(2) },
      bolts: S.bolts.length, corpses: S.corpses });
    if (t < ${SEC}) requestAnimationFrame(snap);
  };
  requestAnimationFrame(snap); return "on";})()` });

/* 그러는 동안 눈으로 볼 장면도 찍는다 — 12칸이면 한 동작이 통째로 들어온다 */
const shots = [];
for (let i = 0; i < (process.env.MQ_SHOTS==="0"?0:12); i++) {
  const s = await S("Page.captureScreenshot", { format: "png" });
  shots.push(Buffer.from(s.data, "base64"));
  await new Promise(r => setTimeout(r, Math.max(0, SEC * 1000 / 12 - 180)));
}
for (let i = 0; i < shots.length; i++) fs.writeFileSync(`/tmp/mq_${i}.png`, shots[i]);

/* ★ 기록기가 **끝날 때까지** 기다린다. 사진을 안 찍는 모드로 돌렸다가 0.6초만
   기록된 파일을 그대로 분석할 뻔했다 — 사진 찍는 시간이 우연히 기다림 노릇을
   하고 있었을 뿐이다. 기다림은 우연이 아니라 **적어 둔 것**이어야 한다. */
await S("Runtime.evaluate", { awaitPromise: true, expression:
  `new Promise(r => { const w = () => (window.__M.fr.at(-1)?.t >= ${SEC} - 0.2) ? r(1) : setTimeout(w, 300); w(); })` });
const r = await S("Runtime.evaluate", { returnByValue: true, expression: `JSON.stringify(window.__M.fr)` });
fs.writeFileSync("/tmp/motion.json", r.result.value);
const fr = JSON.parse(r.result.value);
console.log(`프레임 ${fr.length}장 · ${(fr[fr.length-1].t).toFixed(1)}초 · 평균 ${(fr.length/fr[fr.length-1].t).toFixed(0)}fps`);
console.log("errors:", errs.slice(0, 3));
await raw("Target.closeTarget", { targetId }); bws.close();
