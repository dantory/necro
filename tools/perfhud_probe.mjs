/* 기기가 스스로 내는 성능 보고서를 잰다.
     node tools/perfhud_probe.mjs [초] [층]

   왜 자를 또 하나 세우나 — 자 다섯(JS · 2D 호출 · 래스터 · Commit · 레이아웃)이 전부
   **이 맥에서** 「이 코드가 무거워서는 아니다」라고만 말했다. 남은 길은 병수님 기기
   한 번인데, 그 기기에서 나올 숫자를 **받아 적을 자리**가 없었다(`?fps=1` 은 fps 하나뿐).
   그래서 판 안에 보고서를 넣었고, 이 자는 **그 보고서가 참말을 하는지**를 본다.

   판정(하나라도 어긋나면 FAIL):
     ① `?fps=1` 띠가 뜨고 fps · 긴프레임% · JS ms 를 다 적는다
     ② 보고서의 프레임 수가 0 이 아니고, 화면 이름(마을/던전 N층)이 들어 있다
     ③ **JS 몫 ≤ 프레임 시간** — 분자에 예열이 섞이면 이게 깨진다(그 버그를 막는 문)
     ④ 눌렀을 때 복사가 막힌 곳에서는 **글이 화면에 뜬다**(폰에서 못 보내면 잰 보람이 없다)
     ⑤ 콘솔 오류 0 */
const CDP = process.env.NECRO_CDP_PORT ? `http://127.0.0.1:${process.env.NECRO_CDP_PORT}` : "http://127.0.0.1:9333";
const SEC = +(process.argv[2] || 12), FLOOR = +(process.argv[3] || 14);
const PAGE = `http://127.0.0.1:8774/index.html?fps=1`;
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
/* 폰과 같은 판으로 — 414×860·dpr2 (앞의 자들이 쓴 눈금과 같아야 값을 댈 수 있다) */
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await ev2(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:24,deepest:${FLOOR + 4},runs:3,up:{hp:3,mp:4,dmg:2,army:5},equip:{},bag:[],tree:{bone:2,armor:3,ghoul:1,legion:3,golem:1,rot:1,harvest:1}}))`);
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4500));
/* 사람이 지나는 길로 간다 — 마을에서 시작해 들어간다([[probe-must-walk-the-real-path]]) */
await ev2(`window.toDungeon && window.toDungeon()`);
await new Promise(r => setTimeout(r, 700));
await ev2(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
await new Promise(r => setTimeout(r, SEC * 1000));

const hud = await ev2(`(document.querySelector("div[title='눌러서 성능 보고서 복사']")||{}).textContent||""`);
const rep = await ev2(`window.__perfReport ? window.__perfReport() : ""`);
/* ④ 눌러 본다 — 헤드리스는 클립보드 권한이 없어 fallback 으로 떨어진다. 폰의 사파리도
   사용자 제스처 밖이면 같은 자리로 떨어지므로, **이 길이 살아 있는지**가 중요하다. */
const clicked = await ev2(`(async()=>{
  const el = document.querySelector("div[title='눌러서 성능 보고서 복사']"); if(!el) return "띠없음";
  el.click(); await new Promise(r=>setTimeout(r,300));
  const pre = [...document.querySelectorAll("pre")].find(p=>p.textContent.includes("[necro 성능]"));
  const said = (document.body.innerText||"").includes("복사됨");
  return pre ? "글로떴다" : (said ? "복사됨" : "아무일도없음");
})()`, true);

const num = (re) => { const m = rep.match(re); return m ? +m[1] : null; };
const 프레임수 = num(/프레임 (\d+)장/);
const 평균 = num(/평균 ([\d.]+)ms/);
const JS몫 = num(/JS 몫 프레임당 ([\d.]+)ms/);
const 화면 = /지금 자리: (던전|마을)/.test(rep);
const fail = [];
if (!/fps/.test(hud) || !/긴프레임/.test(hud) || !/JS/.test(hud)) fail.push("띠가 셋을 다 안 적는다: " + hud);
if (!프레임수) fail.push("프레임 수가 0");
if (!화면) fail.push("보고서에 화면 이름이 없다");
if (JS몫 === null || 평균 === null) fail.push("JS 몫/평균을 못 읽었다");
else if (JS몫 > 평균) fail.push(`JS 몫(${JS몫}ms)이 프레임 시간(${평균}ms)보다 크다 — 예열이 섞였다`);
if (clicked === "아무일도없음" || clicked === "띠없음") fail.push("눌러도 보고서를 못 낸다: " + clicked);
if (errs.length) fail.push("콘솔오류 " + errs.length);

console.log(JSON.stringify({ 층: FLOOR, 초: SEC, 띠: hud, 누름: clicked, 프레임수, 평균, JS몫, 콘솔오류: errs }, null, 1));
console.log("\n" + rep);
console.log(fail.length ? "\nFAIL\n  " + fail.join("\n  ") : "\nPASS");
await S("Target.closeTarget", { targetId }).catch(() => {});
process.exit(fail.length ? 1 : 0);
