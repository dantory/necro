/* **구슬을 «채운 정도»별로 굽어 낸다** (V-49 · 2026-08-25)
     node tools/v49_orb.mjs [out_dir]
   판을 굴리지 않는다 — `js/orb.js` 의 `drawOrb` 를 빈 페이지에서 직접 불러 64×64 를
   그대로 받아 온다(잡음 0 · [[same-seed-is-not-same-run]]). 물을 것은 「빈 유리가
   무슨 색으로 읽히는가」라 그림 파일이면 답이 나온다.
   문 `__ORBOLD=1` 이면 옛 빈 유리(공용 갈색)로 되돌려 **같은 자로 앞뒤를 잰다.** */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || "tmp/orb";
const OLD = process.env.ORBOLD === "1";
const PCTS = [1.0, 0.75, 0.5, 0.25, 0.08];
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
await S("Runtime.enable"); await S("Page.enable");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(1800);
const ev = async (e) => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval 실패"); return r.result?.value; };
const { mkdirSync, writeFileSync } = await import("node:fs");
mkdirSync(OUT, { recursive: true });
if (OLD) await ev(`globalThis.__ORBOLD = 1`);
const outs = await ev(`(async () => {
  const m = await import("/js/orb.js?v=" + Math.random());
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64;
  const out = {};
  for (const kind of ["hp", "mp"]) for (const p of ${JSON.stringify(PCTS)}) {
    m.drawOrb(cv, kind, p);
    out[kind + "_" + String(Math.round(p * 100)).padStart(3, "0")] = cv.toDataURL("image/png").slice(22);
  }
  return out;
})()`);
for (const [k, b64] of Object.entries(outs)) { writeFileSync(`${OUT}/${k}.png`, Buffer.from(b64, "base64")); }
console.log(Object.keys(outs).length, "장 →", OUT, OLD ? "(옛 빈 유리)" : "");
await raw("Target.closeTarget", { targetId });
process.exit(0);
