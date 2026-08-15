/* 화면에 **무슨 종이 서 있나**. 편성이 셋을 섞는다고 표에 적혀 있어도, 실제로 서는 것과
   그려지는 그림이 다를 수 있다(2026-08-15 로드맵 사진에서 12기가 전부 같은 해골로 보였다).
   node tools/kind_probe.mjs [초] */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 50);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const ev2 = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 2500));
await ev2(`window.toDungeon && window.toDungeon()`);
await new Promise(r => setTimeout(r, SEC * 1000));
const out = await ev2(`(()=>{const c={};for(const m of (S.minions||[])) c[m.k||m.kind||"?"]=(c[m.k||m.kind||"?"]||0)+1;
  return {층:S.floor, 상한:S.armyCap||null, 종:c, 첫:JSON.stringify(Object.keys(S.minions[0]||{}))};})()`);
console.log(JSON.stringify(out, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
