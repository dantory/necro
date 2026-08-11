// ④ 정산 검수기 — 판을 끝내고 「이번 판에 얻은 것」 창을 잰다.
//   node tools/run_end.mjs <out.png>
// stat_ui.mjs 와 **같은 뼈대**(CDP 9333 + 127.0.0.1:8774/index.html). 각 줄을
// PASS/FAIL 로 찍고, 하나라도 FAIL 이면 exit code 1 로 나가 커밋을 막는다.
const [, , OUT = "tmp/run_end.png"] = process.argv;
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errors = [];
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown")
    errors.push("EXC " + (m.params.exceptionDetails?.exception?.description || "?"));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    errors.push("CON " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" "));
});
await new Promise(r => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (expression) => {
  const r = await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4000));

/* ① 던전에 들어가 몇 층 돌린다 — 전리품이 실제로 S.loot 에 쌓이는지 파이프라인을 태운다. */
await ev(`window.__toDungeon()`);
await ev(`window.__S.speed = 8`);
await new Promise(r => setTimeout(r, 3500));

/* ② 스냅샷을 결정론적으로 굳힌다 — 실제로 쌓인 것 대신 **아는 것 셋**으로 덮어(등급/갈림을
   대조하려면 값을 알아야 한다) 강제로 죽인다. 낀 것(wand t4)·금(robe t1)·가방(charm t3). */
const R = await ev(`(function(){
  const S = window.__S;
  const real = S.loot.length;                       // 실제로 쌓인 개수(정보용)
  S.loot = [
    { k:"wand",  tier:4, af:[{id:"dmg",v:10}], worn:true,  gold:0, bagged:false, n:"x", slot:"지팡이" },
    { k:"robe",  tier:1, af:[],                worn:false, gold:9, bagged:false, n:"y", slot:"망토" },
    { k:"charm", tier:3, af:[{id:"mp",v:1}],   worn:false, gold:0, bagged:true,  n:"z", slot:"부적" },
  ];
  S.floor = 9; S.killed = 20;
  window.__die();
  return { real };
})()`);

await new Promise(r => setTimeout(r, 300));          // rAF 의 사망 갈래가 정산 창을 연다

/* ③ 정산 창이 떴고, 그 순간 다른 창은 하나도 안 떠 있는가. 칸 수 == 스냅샷 loot 길이.
   칸 하나(wand t4)를 골라 등급 클래스가 tier 와 맞는지 대조. */
const O = await ev(`(function(){
  const q = s => [...document.querySelectorAll(s)];
  const on = q(".win.on").map(w => w.id);
  const cells = q("#winEnd #endBody .grid .cell");
  const lootLen = window.__LASTRUN ? window.__LASTRUN.loot.length : -1;
  // 등급 클래스 대조 — wand(t4) 칸을 찾아 .q 가 t4 이고 숫자도 4 인가
  let tierOk = false, tierDetail = "no cell";
  const wandCell = cells.find(c => c.querySelector("i.gear-wand"));
  if (wandCell) {
    const g = wandCell.querySelector(".q");
    tierOk = !!g && g.classList.contains("t4") && g.textContent.trim() === "4";
    tierDetail = g ? (g.className + " / " + g.textContent.trim()) : "no .q";
  }
  // 갈림 표식 — 세 칸이 착용·금·가방으로 갈렸는가
  const fates = cells.map(c => (c.querySelector(".eFate")||{}).textContent || "?");
  return { on, endOn: on.includes("winEnd"), nCells: cells.length, lootLen, tierOk, tierDetail, fates,
           modeTown: window.__MODE ? window.__MODE.at === "town" : null };
})()`);

/* ④ 닫으면 정산이 사라지고 마을에 있다. */
const C = await ev(`(function(){
  document.querySelector("#winEnd [data-close]").click();
  return { endOn: document.getElementById("winEnd").classList.contains("on"),
           modeTown: window.__MODE ? window.__MODE.at === "town" : null };
})()`);

/* ⑤ 다시 던전에 들어가면 창이 닫혀 있고 이번 판 전리품이 비어 있다. */
const D = await ev(`(function(){
  window.__toDungeon();
  return { endOn: document.getElementById("winEnd").classList.contains("on"),
           lootLen: window.__S.loot.length };
})()`);

/* 스크린샷은 **채워진** 정산 창으로 찍는다(재입장이 loot 를 비웠으므로 다시 심어 죽인다)
   — 빈손 화면이 아니라 잰 그 화면(등급 색·갈림 표식)이 남아야 눈으로도 대조된다. */
await ev(`(function(){
  const S = window.__S;
  S.loot = [
    { k:"wand",  tier:4, af:[{id:"dmg",v:10}], worn:true,  gold:0, bagged:false, n:"x", slot:"지팡이" },
    { k:"robe",  tier:1, af:[],                worn:false, gold:9, bagged:false, n:"y", slot:"망토" },
    { k:"charm", tier:3, af:[{id:"mp",v:1}],   worn:false, gold:0, bagged:true,  n:"z", slot:"부적" },
  ];
  S.floor = 9; S.killed = 20; window.__die();
})()`);
await new Promise(r => setTimeout(r, 300));
const { data } = await S("Page.captureScreenshot", { format: "png" });
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(data, "base64"));

/* ── 판정 ── 각 줄 PASS/FAIL, 하나라도 FAIL 이면 exit 1 ── */
const wearBagGold = O.fates.includes("착용") && O.fates.includes("가방") && O.fates.includes("금");
const lines = [
  ["① 정산만 떴다(다른 창 0)", O.endOn && O.on.length === 1, `열린창=[${O.on.join(",")}]`],
  ["② 칸 수 == 스냅샷 loot", O.nCells === O.lootLen && O.lootLen === 3, `칸=${O.nCells} loot=${O.lootLen} (실제쌓임=${R.real})`],
  ["③ 등급 클래스 = tier", O.tierOk, O.tierDetail],
  ["④ 갈림 표식(착용·가방·금)", wearBagGold, `[${O.fates.join(",")}]`],
  ["⑤ 닫으면 town", !C.endOn && C.modeTown, `endOn=${C.endOn} town=${C.modeTown}`],
  ["⑥ 재입장 — 창 닫힘·loot 0", !D.endOn && D.lootLen === 0, `endOn=${D.endOn} loot=${D.lootLen}`],
  ["⑦ 콘솔 오류 0", errors.length === 0, errors.slice(0, 3).join(" | ") || "없음"],
];
let ok = true;
for (const [name, pass, detail] of lines) {
  if (!pass) ok = false;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  — ${detail}`);
}
console.log(`saved ${OUT}`);

await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(ok ? 0 : 1);
