/* hud/sideRail 이 **써 넣은 글자 그대로**를 떠낸다 — 고치기 앞뒤로 대 보려고.
 *     node tools/hud_dom_dump.mjs <나갈파일.json> [town|dungeon] [층]
 *
 * 왜 스크린샷이 아니라 DOM 인가 — `cdp_verify` 는 싸우는 판을 찍는다. 그 그림은
 * 판마다 다르므로 「픽셀 0 차이」를 물을 수가 없다(난수·시간이 섞인다). 그런데 이번
 * 고침은 **「같은 글자면 안 쓴다」**가 전부라, 물어야 할 것은 그림이 아니라
 * **써 넣은 글자**다. 그러니 그걸 직접 떠서 댄다 — 여기서 한 글자라도 다르면
 * 고침이 화면을 바꾼 것이다.
 *
 * 마을은 난수가 안 섞여 **똑같이 되풀이된다**(판이 안 돈다) — 그래서 마을을 기본으로 둔다.
 * 던전은 싸움이 도니 값이 흔들린다. 대신 **칸이 다 살아 있는지**(빈 칸·사라진 칸)를 본다.
 */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const [, , OUT, WHERE = "town", FLOOR = "30"] = process.argv;
if (!OUT || !/\.json$/i.test(OUT)) {
  console.error("사용법: node tools/hud_dom_dump.mjs <나갈파일.json> [town|dungeon] [층]");
  process.exit(2);
}
const fs = await import("node:fs");
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e, aw = false) => {
  const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw });
  if (r.exceptionDetails) throw new Error("페이지 안에서 터졌다: " +
    (r.exceptionDetails.exception?.description || r.exceptionDetails.text || "?").slice(0, 300));
  return r.result?.value;
};

/* 저장은 **못 박아 둔다** — 금·레벨·나무가 판마다 다르면 글자도 달라져 댈 수가 없다. */
await ev(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:90000,lv:40,deepest:34,runs:6,up:{hp:6,mp:6,dmg:5,army:8},equip:{},bag:[],tree:{bone:3,armor:3,ghoul:3,legion:3,golem:3,rot:2,harvest:2}}))`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
if (WHERE === "dungeon") {
  await ev(`window.toDungeon && window.toDungeon()`); await wait(700);
  await ev(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${+FLOOR});return 1;})()`, true);
  await wait(2500);
}

/* hud/sideRail 이 손대는 칸을 **전부** 떠낸다. 하나라도 빠뜨리면 그 칸의 회귀를 못 본다. */
const IDS = ["hFloor", "hLeft", "hDepth", "hLvT", "hGold", "hpNum", "mpNum", "gCorpse", "gArmy",
             "xpNum", "xpFill", "log", "rArmy", "rGear", "rBody", "rReady", "rLast", "rQuest", "spDot"];
const dump = await ev(`(() => {
  const 나온다 = {};
  for (const id of ${JSON.stringify(IDS)}) {
    const el = document.getElementById(id);
    나온다[id] = el ? { html: el.innerHTML, cls: el.className,
                       폭: id === "xpFill" ? el.style.width : undefined } : null;
  }
  나온다.__at = (window.__MODE || {}).at;
  return 나온다;
})()`);
/* 어느 칸이 **비었는지**를 따로 센다 — 「글자가 같다」보다 먼저 물을 것은 「글자가 있나」다.
   고침이 잘못되면 제일 흔한 모양이 **빈 칸**이고, 두 벌을 대기만 하면 둘 다 비어도 「같다」가 된다. */
const 빈칸 = IDS.filter(id => dump[id] && !String(dump[id].html).trim());
const 없는칸 = IDS.filter(id => !dump[id]);
const out = { 어디: dump.__at, 빈칸, 없는칸, 콘솔오류: errs, 칸: dump };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`떠냈다 → ${OUT}  (어디:${dump.__at} · 빈칸 ${빈칸.length}${빈칸.length ? " " +빈칸.join(",") : ""} · 없는칸 ${없는칸.length} · 콘솔오류 ${errs.length})`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(errs.length ? 1 : 0);
