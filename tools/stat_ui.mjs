// ③ 상태창 검수기 — 낀 것 셋·가방 12칸·등급 색·끼기·closeAll 을 한 판에 잰다.
//   node tools/stat_ui.mjs <out.png>
// boss_probe.mjs 와 **같은 뼈대**(CDP 9333 + 127.0.0.1:8774/index.html). 각 줄을
// PASS/FAIL 로 찍고, 하나라도 FAIL 이면 exit code 1 로 나가 커밋을 막는다.
const [, , OUT = "tmp/stat_ui.png"] = process.argv;
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

/* ══ 판 안에서 심고·열고·잰다 ══ 등급이 다른 셋을 옵션과 함께 낀 것에 심고, 가방을
   **정확히 12개**로 채운 뒤 __openWin("stat") 로 연다. 색은 D2 표(style/hud 의 t0~t4)
   그대로여야 하므로 **바라는 rgb 를 여기 박아** 화면의 계산색과 대조한다 — 새 색표를
   몰래 끼웠으면 여기서 어긋난다. */
const R = await ev(`(function(){
  const META = window.META;
  META.equip.wand  = { k:"wand",  tier:1, af:[{id:"dmg", v:10}] };
  META.equip.robe  = { k:"robe",  tier:3, af:[{id:"hp", v:60},{id:"mp", v:1.2}] };
  META.equip.charm = { k:"charm", tier:4, af:[{id:"mp", v:1.5},{id:"gold", v:20},{id:"army", v:1}] };
  META.bag.length = 0;
  const ks = ["wand","robe","charm"];
  for (let i=0;i<12;i++) META.bag.push({ k:ks[i%3], tier:1+(i%4), af: (i%2)?[{id:"dmg",v:5}]:[] });
  window.saveMeta && window.saveMeta();
  window.__openWin("stat");

  const q = s => [...document.querySelectorAll(s)];
  const win = document.getElementById("winStat");
  const eq  = q("#statBody .sSec.eq .cell:not(.empty)");
  const bag = q("#statBody .sSec.bag .cell:not(.empty)");

  // ① 열렸는가 · 낀 칸 3 · 가방 칸 12
  const opened = win.classList.contains("on");
  const eqN = eq.length, bagN = bag.length;

  // ② 등급 색 — 칸의 .q 클래스가 t{등급} 이고, 그 계산색이 D2 표와 같은가
  const WANT = { t0:"rgb(214, 208, 196)", t1:"rgb(106, 106, 255)", t2:"rgb(255, 255, 100)",
                 t3:"rgb(191, 160, 106)", t4:"rgb(0, 192, 0)" };
  const filled = [...eq, ...bag];
  let colorBad = [];
  for (const c of filled) {
    const g = c.querySelector(".q"); if (!g) { colorBad.push("no .q"); continue; }
    const cls = "t" + g.textContent.trim();
    if (!g.classList.contains(cls)) { colorBad.push("class " + g.className + " != " + cls); continue; }
    const got = getComputedStyle(g).color;
    if (got !== WANT[cls]) colorBad.push(cls + " " + got + " != " + WANT[cls]);
  }
  // 툴팁 이름 색도 등급을 따르는가 — 낀 wand(t1) 를 골라 본다
  document.querySelector('[data-spick="wand"]').click();
  const tipName = document.querySelector("#statTip .tipName");
  const tipCls = tipName && tipName.classList.contains("t1");
  const tipColor = tipName && getComputedStyle(tipName).color === WANT.t1;

  return { opened, eqN, bagN, colorBad, tipCls: !!tipCls, tipColor: !!tipColor };
})()`);

await new Promise(r => setTimeout(r, 200));

/* ③ 끼기 — 가방 0번을 골라 「끼기」를 누른다. 낀 것이 그것으로 바뀌고, 벗은 것이
   가방으로 들어가 **가방 길이는 그대로 12** 여야 한다(누출·복제 없이 자리 교환). */
const W = await ev(`(function(){
  const META = window.META;
  const target = META.bag[0], key = target.k;
  document.querySelector('[data-bpick="0"]').click();      // 가방 0 을 고른다 → 툴팁·끼기 단추
  const hadBtn = !!document.querySelector('[data-bagwear]');
  document.querySelector('[data-bagwear]').click();        // 끼운다
  return { hadBtn, worn: META.equip[key] === target, bagLen: META.bag.length,
           redrawn: [...document.querySelectorAll('#statBody .sSec.bag .cell:not(.empty)')].length };
})()`);

/* ④ closeAll 누락 잡기 — 상태창을 연 채 상인을 열면 상태창이 닫혀야 한다. */
const C = await ev(`(function(){
  window.__openWin("stat");
  const before = document.getElementById("winStat").classList.contains("on");
  window.__openWin("shop");
  const after = document.getElementById("winStat").classList.contains("on");
  window.__openWin("stat");   // 스크린샷은 상태창으로 되돌려 찍는다
  return { before, closedAfterShop: !after };
})()`);

await new Promise(r => setTimeout(r, 300));
const { data } = await S("Page.captureScreenshot", { format: "png" });
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(data, "base64"));

/* ── 판정 ── 각 줄 PASS/FAIL, 하나라도 FAIL 이면 exit 1 ── */
const lines = [
  ["① 열림·낀 3·가방 12", R.opened && R.eqN === 3 && R.bagN === 12,
    `on=${R.opened} 낀=${R.eqN} 가방=${R.bagN}`],
  ["② 등급 색 = TIER_CLS(D2 표)", R.colorBad.length === 0 && R.tipCls && R.tipColor,
    `칸어긋남=[${R.colorBad.join(" ; ")}] 툴팁t1=${R.tipCls}/${R.tipColor}`],
  ["③ 끼기 — 교환·길이 유지", W.hadBtn && W.worn && W.bagLen === 12 && W.redrawn === 12,
    `단추=${W.hadBtn} 낌=${W.worn} 가방길이=${W.bagLen} 다시그림=${W.redrawn}`],
  ["④ 상인 열면 상태창 닫힘", C.before && C.closedAfterShop,
    `열림=${C.before} 닫힘=${C.closedAfterShop}`],
  ["⑤ 콘솔 오류 0", errors.length === 0, errors.slice(0, 3).join(" | ") || "없음"],
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
