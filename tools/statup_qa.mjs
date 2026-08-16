// 능력치 창의 **강화 단추** 검수 — 읽기만 하던 창에서 그 자리로 몸을 키우는가.
//   node tools/statup_qa.mjs [out.png]
// statrow_qa.mjs 와 같은 뼈대(CDP 9333 · 1512×863).
//
// ★ 이 자가 무엇을 막는가 — 「단추가 있다」만 재면 **아무것도 안 막는다**(있는데 안
//   먹히거나, 먹히는데 그림이 안 오는 것이 실제로 났다). 그래서 셋을 한 판에 잰다:
//     ⓐ 어디에 서는가(값을 키우는 줄 넷에만) · ⓑ 눌러서 **실제로 값이 오르는가** ·
//     ⓒ 누른 자리가 **그 자리서 다시 그려지는가**(대장간만 그리면 「안 눌린다」로 보인다).
// ★ 그리고 **정렬**을 잰다 — 단추가 붙은 줄만 값이 밀리면 일곱 줄 숫자가 층계가 된다.
//   눈으로는 8px 어긋남을 못 잡으므로 <b> 의 오른쪽 끝 x 를 재서 갈린다면 FAIL.
const [, , OUT = "tmp/statup.png"] = process.argv;
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4000));

/* 줄 한 벌을 통째로 읽는다 — 이름 · 값 · 단추가 있나 · 눌리나 · <b> 오른쪽 끝. */
const READ = `(() => [...document.querySelectorAll("#statBody .sStat:not(.jList) .tipStat")].map(d => {
  const b = d.querySelector("b"), u = d.querySelector("button.upBtn");
  return { n: d.querySelector(".sN")?.textContent.trim() ?? "",
           v: b ? b.textContent.trim() : "",
           up: u ? u.getAttribute("data-up") : null,
           off: u ? u.disabled : null,
           bR: b ? Math.round(b.getBoundingClientRect().right) : 0,
           /* ★ 판은 **두 칸 격자**다(05:4x 에 접었다) — 오른쪽 끝은 칸마다 다르다.
              그래서 「끝이 하나」로 재면 멀쩡한 화면에 FAIL 이 난다(실제로 났다).
              줄이 어느 칸에 앉았는지(left)를 같이 들고 나와 **칸 안에서** 견준다. */
           L: Math.round(d.getBoundingClientRect().left),
           h: Math.round(d.getBoundingClientRect().height) };
}))()`;

/* ⓐ 넉넉한 금으로 연다 — 강화 넷이 다 살아 있어야 한다.
   ★ 판이 도는 동안 `autoForge()` 가 금을 저절로 태워 값이 자꾸 바뀐다. 자가 재는
     동안만 **판을 멈춘다**(S.dead 로 auto() 를 재운다) — 안 그러면 「눌렀는데 금이
     더 줄었다」가 나와 자가 헛운다. 재는 것은 단추이지 자동구매가 아니다. */
const A = await ev(`(function(){
  window.__S.dead = true;                       // auto() → autoForge() 를 재운다
  window.META.gold = 500000;
  window.__openWin("stat");
  const p = document.querySelector("#winStat .winFoot .purse");
  return { rows: ${READ}, gold: window.META.gold|0, up: JSON.parse(JSON.stringify(window.META.up)),
           /* 값이 적힌 창에 **가진 금**이 보이는가 — 안 보이면 「살 수 있나」를 위 띠로
              눈을 옮겨 맞춰 봐야 한다(발의 금은 폰 폭 때문에 숨겨 뒀던 것이다). */
           purse: !!(p && p.getClientRects().length && document.getElementById("statGold").textContent.trim()),
           purseTxt: document.getElementById("statGold").textContent.trim() };
})()`);

/* ⓑ 눌러 본다 — 군세 단추. 값(상한)이 오르고 금이 값만큼 준다. */
const B = await ev(`(function(){
  const before = { cap: window.__armyCap ? 0 : 0, gold: window.META.gold|0, lv: window.META.up.army|0 };
  const btn = document.querySelector('#statBody button.upBtn[data-up="army"]');
  const capBefore = [...document.querySelectorAll("#statBody .tipStat")]
    .find(d => d.querySelector(".sN")?.textContent.trim() === "군세")?.querySelector("b").textContent.trim();
  btn.click();
  const capAfter = [...document.querySelectorAll("#statBody .tipStat")]
    .find(d => d.querySelector(".sN")?.textContent.trim() === "군세")?.querySelector("b").textContent.trim();
  return { lvBefore: before.lv, lvAfter: window.META.up.army|0,
           goldBefore: before.gold, goldAfter: window.META.gold|0,
           capBefore, capAfter, open: document.getElementById("winStat").classList.contains("on") };
})()`);

/* ⓒ 금이 모자라면 죽는다 — 눌러도 아무 일이 안 나야 한다(조용히 무시가 아니라 disabled). */
const C = await ev(`(function(){
  window.META.gold = 0;
  window.__openWin("stat"); window.__openWin("stat");   // ★ 토글이다 — 두 번 불러야 다시 그린다
  const rows = ${READ};
  const btn = document.querySelector('#statBody button.upBtn[data-up="hp"]');
  const lv = window.META.up.hp|0; btn.click();
  return { rows, lvSame: (window.META.up.hp|0) === lv, gold: window.META.gold|0 };
})()`);

/* ⓓ 대장간은 그대로인가 — 같은 `data-up` 을 두 창이 쓰므로 회귀를 같이 잰다. */
const D = await ev(`(function(){
  window.META.gold = 500000;
  window.__openWin("forge");
  const lv = window.META.up.dmg|0;
  document.querySelector('#forgeTip button[data-up]').click();
  return { grew: Object.values(window.META.up).reduce((a,b)=>a+b,0) > 0,
           open: document.getElementById("winForge").classList.contains("on"),
           tip: !!document.querySelector('#forgeTip button[data-up]') };
})()`);

/* 찍는 것은 **금이 넉넉한 능력치 창** — 눈으로 볼 것은 여기다. */
await ev(`(function(){ window.META.gold = 500000; window.__openWin("forge");
  window.__openWin("stat"); })()`);
await new Promise(r => setTimeout(r, 400));
const shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));

const WANT = ["hp", "mp", "army", "dmg"];
const upsA = A.rows.filter(r => r.up).map(r => r.up);
/* 칸(left)마다 모아 **그 칸 안에서** 값의 오른쪽 끝이 하나인지 본다. */
const cols = new Map();
for (const r of A.rows) (cols.get(r.L) ?? cols.set(r.L, []).get(r.L)).push(r.bR);
const colEnds = [...cols.entries()].map(([L, xs]) => [L, [...new Set(xs)]]);
const aligned = colEnds.every(([, xs]) => xs.length === 1);
const T = [
  ["ⓐ 강화가 값을 키우는 줄 넷에만 선다",
    WANT.every(k => upsA.includes(k)) && upsA.length === WANT.length,
    `단추=${upsA.join("·") || "없음"}`],
  ["ⓑ 금이 넉넉하면 넷 다 살아 있다",
    A.rows.filter(r => r.up).every(r => r.off === false),
    `죽은 것=${A.rows.filter(r => r.up && r.off).map(r => r.up).join("·") || "없음"}`],
  ["ⓒ 한 칸 안에서 값의 오른쪽 끝이 한 줄로 선다 — 단추 있는 줄만 밀리지 않는다",
    aligned && colEnds.length >= 1,
    colEnds.map(([L, xs]) => `칸${L}: ${xs.join("/")}`).join(" · ")],
  ["ⓓ 줄이 안 꺾인다(한 줄 높이)",
    new Set(A.rows.map(r => r.h)).size === 1 && A.rows[0].h <= 30, `높이=${[...new Set(A.rows.map(r => r.h))].join("·")}`],
  ["ⓔ 누르면 실제로 오른다 — 등급 +1 · 금이 값만큼 준다",
    B.lvAfter === B.lvBefore + 1 && B.goldAfter < B.goldBefore,
    `강화 ${B.lvBefore}→${B.lvAfter} · 금 ${B.goldBefore}→${B.goldAfter}`],
  ["ⓕ 누른 자리가 그 자리서 다시 그려진다 — 군세 값이 바뀐다",
    B.capBefore !== B.capAfter && B.open,
    `군세 ${B.capBefore}→${B.capAfter} · 창 ${B.open ? "열림" : "닫힘"}`],
  ["ⓖ 금이 없으면 죽고, 눌러도 안 오른다",
    C.rows.filter(r => r.up).every(r => r.off === true) && C.lvSame,
    `죽은 것=${C.rows.filter(r => r.up && r.off).length}/4 · 등급 그대로=${C.lvSame}`],
  ["ⓗ 대장간 강화도 그대로 먹는다(회귀)",
    D.grew && D.open && D.tip, `창=${D.open} · 툴팁 단추=${D.tip}`],
  ["ⓘ 값을 적었으면 가진 금도 적는다 — 창 발에 금이 선다",
    A.purse === true, `발의 금=${A.purseTxt || "없음"}`],
  ["ⓙ 콘솔 오류 0", errors.length === 0, errors.join(" | ") || "없음"],
];
let bad = 0;
for (const [n, ok, d] of T) { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}  — ${d}`); }
console.log("saved " + OUT);
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(bad ? 1 : 0);
