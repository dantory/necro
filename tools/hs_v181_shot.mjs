/* V-181 — 툴팁이 «떠 있는» 컷을 남긴다. 유니크 하나를 조용한 바닥에 두고, 그 이름표
   위로 마우스를 옮겨(직접 이벤트) 툴팁을 띄운 뒤 tmp/v181_tooltip.png 로 찍는다.
   네 색이 다 보이게 유니크를 쓴다(주황 이름·파랑 옵션·주황 규칙·회색 이야기).
   콘솔 오류 0 도 함께 잰다.  node tools/hs_v181_shot.mjs */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG 120s"); process.exit(9); }, 120000);
const VW = 1512, VH = 863;

await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 9000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?"));
  if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "assert")) errs.push("CON " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" ")); });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: URL });
for (let i = 0; i < 30; i++) { await wait(300); if (await ev("!!(window.G && G.player && window.HSZ)")) break; }
await wait(800);

/* 조용한 바닥 + 유니크 하나를 사람 오른쪽 300px(자석 밖·화면 안)에 둔다. */
await ev(`(async () => {
  const L = await import('${URL.replace("index.html", "loot.js")}');
  const G = window.G, cam = window.cam, Z = window.HSZ, p = G.player;
  G.packs = []; G.golds = []; G.parts = []; G.floats = []; G.spears = [];
  const u = L.UNIQUES[0];
  const item = { name: u.name, slot: u.slot, rarity: L.RARITY[3], unique: u,
    affixes: [ {key:'dmg',label:'피해 +18%',value:18},
               {key:'minionDmg',label:'소환수 피해 +24%',value:24},
               {key:'maxHp',label:'최대 생명 +80',value:80} ] };
  G.items = [{ x: p.x + 300, y: p.y, vx: 0, vy: 0, t: 1, item }];
  return true;
})()`);
await wait(300);

/* 이름표 위로 마우스를 쏜다 — 화면 좌표는 (it - cam) * Z. */
const at = JSON.parse(await ev(`(() => {
  const G = window.G, cam = window.cam, Z = window.HSZ, it = G.items[0];
  const sx = (it.x - cam.x) * Z, sy = (it.y - cam.y) * Z;
  document.getElementById('board').dispatchEvent(new MouseEvent('mousemove', { clientX: sx, clientY: sy - 2, bubbles: true }));
  return JSON.stringify({ sx: Math.round(sx), sy: Math.round(sy) });
})()`));
await wait(250);

const tip = JSON.parse(await ev(`(() => {
  const t = document.getElementById('tooltip');
  return JSON.stringify({ disp: getComputedStyle(t).display, w: t.offsetWidth, h: t.offsetHeight, txt: t.textContent.replace(/\\s+/g,' ').slice(0, 80) });
})()`));

log(`이름표 화면좌표 ${JSON.stringify(at)}`);
log(`툴팁 display=${tip.disp} ${tip.w}×${tip.h}  내용="${tip.txt}"`);

const shot = await S("Page.captureScreenshot", { format: "png" });
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync("tmp/v181_tooltip.png", Buffer.from(shot.data, "base64"));
log("saved tmp/v181_tooltip.png");

const visible = tip.disp === "block" && tip.w > 0 && tip.txt.includes("Marrow");
log(errs.length ? "콘솔 오류:\n  " + errs.slice(0, 6).join("\n  ") : "콘솔 오류 0");
log(visible && !errs.length ? "\n✓ 툴팁이 떠 있고 콘솔 오류 0" : "\n✗ 실패");
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(visible && !errs.length ? 0 : 1);
