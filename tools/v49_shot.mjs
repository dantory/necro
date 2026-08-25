/* **같은 프레임을 두 번 찍는다** — 빈 유리만 갈아 끼우고(`__ORBOLD`) 앞뒤를 잰다
   (`v47_shot`·`v48_shot` 과 같은 결).  node tools/v49_shot.mjs
   1층에 들어가 마나가 절반 아래로 떨어질 때까지 기다린 뒤 판을 세우고 찍는다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (f) => { const { data } = await S("Page.captureScreenshot", { format: "png" }); writeFileSync(f, Buffer.from(data, "base64")); };
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2200);
await ev(`localStorage.clear()`); await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`window.__toDungeon()`);
let mp = 1;
for (let i = 0; i < 90; i++) { await wait(1000);
  mp = await ev(`(window.S && window.S.mpMax) ? window.S.mp / window.S.mpMax : 1`);
  if (mp < 0.45) break; }
/* 판을 세운다 — 두 그림이 같은 프레임이어야 차이가 «빈 유리»만 남는다 */
await ev(`window.__S && (window.__S.speed = 0)`); await wait(400);
/* `hud` 는 모듈 안에 있어 밖에서 못 건드린다 — **구슬 두 장을 직접 다시 그린다.**
   판이 멎어 있으니 값이 안 바뀌고, 그러면 게임 쪽 다시그리기가 안 돌아 이 그림이 남는다. */
const redraw = async () => await ev(`(async () => {
  const m = await import("/js/orb.js?v=" + Math.random());
  const S = window.__S || window.S;
  m.drawOrb(document.getElementById("hpOrb"), "hp", Math.max(0, Math.min(1, S.hp / S.hpMax)));
  m.drawOrb(document.getElementById("mpOrb"), "mp", Math.max(0, Math.min(1, S.mp / S.mpMax)));
  return 1; })()`);
await ev(`globalThis.__ORBOLD = 1`); await redraw(); await wait(300); await shot("tmp/v49_orb_old.png");
await ev(`globalThis.__ORBOLD = 0`); await redraw(); await wait(300); await shot("tmp/v49_orb_new.png");
console.log(JSON.stringify({ 마나: +(mp * 100).toFixed(1) + "%", 콘솔오류: errs.length }));
await raw("Target.closeTarget", { targetId });
process.exit(0);
