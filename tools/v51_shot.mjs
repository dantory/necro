/* V-51 을 «짝지어» 찍는다 — 판을 세워 두고 문(`__NOGLUE`)만 갈아 같은 자리를 두 번 찍는다.
   dt 가 벽시계라 두 판은 절대 같을 수 없으므로([[same-seed-is-not-same-run]]) **한 판을
   세우고** 그린 것만 바꾼다. 붙은 짝이 실제로 뜰 때까지 기다렸다가 세운다.
     node tools/v51_shot.mjs */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 120)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (n) => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v51_${n}.png`, Buffer.from(data, "base64")); return `tmp/v51_${n}.png`; };
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await ev(`localStorage.removeItem("necro.meta.v1")`);
await S("Page.reload", { ignoreCache: true }); await wait(3500);
/* ★ **문을 닫고 기다린다** — 고침이 켜져 있으면 붙은 짝이 아예 안 생겨서 「전」을 못 찍는다.
   붙은 짝을 실제로 하나 만난 뒤에 판을 세우고, 거기서 문만 연다. */
await ev(`globalThis.__NOGLUE = 1`);
await ev(`window.__toDungeon && window.__toDungeon()`); await wait(1500);
await ev(`window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 }`);
/* 「고치기 전이라면 붙었을 짝」이 뜨는 순간을 기다린다 — 밀린 뒤(sep) 말고 **밀기 전** 자리로 본다 */
const found = await ev(`new Promise(res => { const t0 = Date.now();
  (function look() {
    const N = (window.__RECTS && window.__RECTS.nums) || [];
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const a = N[i], b = N[j]; if (a[6] !== b[6]) continue;
      if (a[7] < 0.35 || b[7] < 0.35) continue;            // 사그라든 것은 사람 눈에 없다
      const vo = Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]);
      if (vo < 0.6 * Math.min(a[3], b[3])) continue;
      const gap = Math.max(a[0], b[0]) - Math.min(a[0]+a[2], b[0]+b[2]);
      const cw = Math.min(a[2]/Math.max(1,String(a[4]).length), b[2]/Math.max(1,String(b[4]).length));
      /* 자와 **똑같은 문턱**(0.33 글자)으로 고른다 — 자가 세는 것과 눈으로 보는 것이 같아야 한다 */
      if (gap < 0.33 * cw) {
        /* ★ **찾은 그 자리에서 바로 세운다.** 밖으로 나갔다 돌아와 세우면 그 사이 몇 틀이
           지나 짝이 사라진다(첫 판에서 실제로 그랬다 — 「12」 한 짝만 남았다). */
        const S3 = window.__S || window.S; if (S3) S3.speed = 0;
        return res({ x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]),
        w: Math.max(a[0]+a[2], b[0]+b[2]) - Math.min(a[0], b[0]), h: Math.max(a[3], b[3]),
        t: (a[0] <= b[0] ? a[4] + b[4] : b[4] + a[4]) }); }
    }
    if (Date.now() - t0 > 60000) return res(null);
    requestAnimationFrame(look);
  })(); })`);
console.log("붙을 뻔한 짝", JSON.stringify(found));
/* ① 고치기 «전» — 문은 이미 닫혀 있고 판은 위에서 이미 세웠다(밀기 0) */
await wait(300); console.log(await shot("cmp_before"));
/* ② 고친 «후» — 문만 연다. 판은 세워져 있으니 **몸도 소품도 한 톨도 안 움직인다** */
await ev(`globalThis.__NOGLUE = 0`);
await wait(500);
console.log("민 값(sep)", await ev(`JSON.stringify((window.__S||window.S).nums.map(n=>[n.v,Math.round(n.sep||0)]))`),
            "· 그린 틀", await ev(`(window.__RECTS||{}).frames|0`));
console.log(await shot("cmp_after"));
/* 오려 붙이는 자리를 자가 그대로 일러 준다 — 손으로 고르면 엉뚱한 데를 오린다 */
if (found) console.log("CROP " + JSON.stringify(found));
console.log("콘솔오류", errs.length, errs.slice(0, 2));
await raw("Target.closeTarget", { targetId });
process.exit(0);
