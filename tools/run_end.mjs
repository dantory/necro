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

/* ⑧ 부제가 **어중간하게** 꺾이는가(병수님 2026-08-12) — 「경험치 +0」에서 「+0」만
   다음 줄로 떨어졌다. 값 길이에 달린 결함이라 판 한 벌로는 못 잡는다: LASTRUN 을
   손수 채워 여러 벌을 그려 보고, **토막(·으로 가른 한 덩이) 하나가 두 줄에 걸치면**
   FAIL. 자리(rect)로 재므로 markup 이 바뀌어도 그대로 쓴다.
   ★ 「글자 수로 어림잡기」는 안 쓴다 — 폭·글꼴·굵기가 다 걸린다. 그린 자리를 읽는다. */
const CASES = [
  ["병수님이 본 그 판", { floor: 20, killed: 0, gold: 0, xp: 0, leveled: false }],
  ["레벨 업까지 붙은 판", { floor: 20, killed: 7, gold: 640, xp: 120, leveled: true }],
  ["자릿수가 큰 판", { floor: 137, killed: 1284, gold: 128400, xp: 9640, leveled: true }],
  ["가장 짧은 판", { floor: 1, killed: 0, gold: 0, xp: 0, leveled: false }],
];
const wrapRuns = [];
for (const [label, vals] of CASES) {
  wrapRuns.push(await ev(`(function(){
    const L = window.__LASTRUN;
    Object.assign(L, ${JSON.stringify(vals)}, { has: true, loot: [] });
    window.__openWin("end");
    const el = document.getElementById("endSub");
    /* 글자 자리를 **Range 로** 읽는다 — <b> 로 잘려 있어도 한 줄로 이어 센다. */
    const nodes = []; let text = "";
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { nodes.push({ n, at: text.length }); text += n.nodeValue; }
    const loc = (p) => {
      for (const it of nodes) if (p >= it.at && p <= it.at + it.n.nodeValue.length) return [it.n, p - it.at];
      return null;
    };
    const rects = (s, e) => {
      const a = loc(s), b = loc(e); if (!a || !b) return [];
      const r = document.createRange(); r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]);
      return [...r.getClientRects()].filter(x => x.width > .5 && x.height > .5);
    };
    const tops = (s, e) => new Set(rects(s, e).map(x => Math.round(x.top))).size;
    /* 낱개를 무엇으로 보느냐 — markup 이 [data-u] 로 **스스로 밝히면** 그것을 쓰고,
       안 밝히면(옛날처럼 한 줄로 흘린 부제) 「·」로 가른 토막을 낱개로 본다. 뒤엣것을
       남겨 두는 이유는 되돌아갔을 때도 잡히게 하려는 것 — 실제로 고치기 전 이 자로
       네 벌 모두 FAIL 이 났다(«경험치 +0» «금 +128,400»). */
    const marked = [...el.querySelectorAll("[data-u]")];
    const segs = []; const topSet = new Set();
    if (marked.length) {
      for (const m of marked) {
        const r2 = [...m.getClientRects()].filter(x => x.width > .5 && x.height > .5);
        const t2 = new Set(r2.map(x => Math.round(x.top)));
        t2.forEach(v => topSet.add(v));
        segs.push({ t: m.textContent.trim(), lines: t2.size });
      }
    } else {
      let i = 0;
      for (const part of text.split("·")) {
        const s = i, e = i + part.length; i = e + 1;
        if (!part.trim()) continue;
        const ls = s + (part.length - part.trimStart().length);
        const le = e - (part.length - part.trimEnd().length);
        segs.push({ t: part.trim(), lines: tops(ls, le) });
      }
    }
    /* 줄 수는 **낱개가 앉은 자리**로 센다 — Range 로 통째 재면 flex 통이 rect 를 하나 더
       내어 두 줄짜리가 3줄로 잡혔다(자가 거짓말을 하면 판정을 못 믿는다). */
    return { label: ${JSON.stringify(label)}, lines: marked.length ? topSet.size : tops(0, text.length),
             split: segs.filter(x => x.lines > 1).map(x => x.t), text: text.trim() };
  })()`));
}
const wrapBad = wrapRuns.filter(x => x.split.length);

/* 잰 것만으로는 「꺾인 자리가 보기 좋은가」를 못 본다 — 제일 긴 벌(자릿수가 큰 판)의
   부제만 잘라 남긴다. 숫자는 판정에 쓰고, 이 그림은 눈으로 보는 몫이다. */
{
  const box = await ev(`(function(){
    const L = window.__LASTRUN;
    Object.assign(L, ${JSON.stringify(CASES[2][1])}, { has: true, loot: [] });
    window.__openWin("end");
    const r = document.getElementById("endSub").getBoundingClientRect();
    return { x: r.x - 8, y: r.y - 6, width: r.width + 16, height: r.height + 12 };
  })()`);
  const shot = await S("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 2 } });
  fs.mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
  fs.writeFileSync(OUT.replace(/\.png$/, "_sub_wide.png"), Buffer.from(shot.data, "base64"));
}

/* 스크린샷은 잰 화면 그대로 — 마지막 벌을 지우고 원래 스냅샷을 되살린다. */
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
  ["⑧ 부제 토막이 안 꺾인다", wrapBad.length === 0,
    wrapRuns.map(x => `${x.label}:${x.lines}줄${x.split.length ? "«" + x.split.join("/") + "»" : ""}`).join(" ")],
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
