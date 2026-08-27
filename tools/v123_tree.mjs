/* V-123 자 — **트리 툴팁이 「지금 얼마인가」를 말하는가.**
   `node tools/v123_tree.mjs [old]` — `old` 를 주면 `__TREEFX_OLD` 문을 열어 고치기 «전»
   결을 그대로 다시 낸다([[silent-zero-is-not-an-observation]] — 자가 정말 우는지 먼저
   보정한다). 재는 것 셋:
     ① 칸을 골랐을 때 **지금 값**(또는 한 점 더의 값)을 말하는 칸 수
     ② 「한 점당」을 랭크로 **곱해 읽으면** 참값과 어긋나는 칸(곱으로 쌓이는 칸)
     ③ 막이 — 이름·랭크·요구 레벨·선행·갈래 글월·「찍기」 단추가 한 톨도 안 바뀜 */
import fs from "node:fs";
const OLD = process.argv[2] === "old";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

/* 널리 판 사람 — 세 줄기를 다 팠고 갈래 넷 중 셋을 골랐다(정예·광포·탐식). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=60;M.xp=100;M.gold=5e6;M.deepest=30;M.best=30;M.corpses=900;
  M.up={hp:10,mp:8,dmg:10,army:4};
  M.tree={bone:6,armor:4,ghoul:1,golem:1,elite:2,marrow:3,fury:3,
          rot:5,harvest:4,cheap:3,chain:2,pyre:2,glut:2,
          wand:5,swift:5,weaken:1,deep:3,decrep:1,veil:2,spirit:2};
  C.syncSkills&&C.syncSkills();C.saveMeta();return C.spLeft()+'/'+C.spTotal()})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
const sp = await ev(SEED);
if (String(sp).startsWith("-")) throw new Error("점수가 모자란 씨앗이다: " + sp);   // 자가 저를 확인한다
await ev(`(()=>{window.__TREEFX_OLD=${OLD ? 1 : 0};return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
/* ★ 문도 `__C` 도 **다시 켠 뒤에** 박는다 — reload 로 둘 다 날아간다. */
await ev(`(()=>{window.__TREEFX_OLD=${OLD ? 1 : 0};return 1})()`);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);

const r0 = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
  window.__openWin("tree");
  const w=document.getElementById("winTree");
  if(!w||!w.classList.contains('on')) throw new Error('창이 안 섰다: winTree');
  return 'ok'})()`);
console.log((OLD ? "[옛 결] " : "[지금] ") + "트리 " + r0 + " · 남은점 " + sp);

/* 칸마다 툴팁을 뜯는다. 누르면 격자가 통째로 다시 그려지므로 **다시 찾아** 확인한다. */
const one = async (nid) => await ev(`(()=>{const q=()=>document.querySelector('[data-tn=${JSON.stringify(nid)}]');
  const c=q(); if(!c) throw new Error('칸이 없다 ${nid}'); c.click();
  if(!q()?.classList.contains('sel')) throw new Error('안 골렸다 ${nid}');
  const t=document.getElementById('treeTip');
  const nd=(globalThis.__C.TREE.flatMap(c=>c.nodes)).find(n=>n.id===${JSON.stringify(nid)});
  const fx=[...t.querySelectorAll('.tFx .tipStat')].map(e=>e.innerText.replace(/\\s+/g,' ').trim());
  return { txt: t.innerText.replace(/\\n/g,' | '),
           head: t.querySelector('.tipName').innerText.replace(/\\s+/g,' ').trim(),
           kind: t.querySelector('.tipKind').innerText.replace(/\\s+/g,' ').trim(),
           fork: t.querySelector('.tipFork')?.innerText.trim() || '',
           buy:  t.querySelector('.tipBuy')?.innerText.replace(/\\s+/g,' ').trim() || '',
           fx, d: nd.d, max: nd.max, big: !!nd.big, rank: globalThis.__C.rank(${JSON.stringify(nid)}) };})()`);

const ids = await ev(`globalThis.__C.TREE.flatMap(c=>c.nodes).map(n=>n.id)`);
const rows = [];
for (const nid of ids) { rows.push([nid, await one(nid)]); await wait(60); }

/* ① 지금 값을 말하는 칸 */
const says = rows.filter(([, r]) => r.fx.length > 0);
/* ② 「한 점당 × 랭크」로 읽으면 어긋나는 칸 — 곱으로 쌓이는 둘(재사용·마나 소모)이 그렇다.
      설명줄의 첫 %를 한 점당으로 읽고, 참값(이 칸의 몫)과 견준다. */
const NAIVE = { swift: -7, cheap: -10, haste: -5 };
const skew = [];
for (const [nid, r] of rows) {
  const per = NAIVE[nid]; if (per == null || !r.rank) continue;
  const m = /([+−-])(\d+)%/.exec(r.fx[0] || "");
  const truePct = m ? (m[1] === "+" ? 1 : -1) * +m[2] : null;
  skew.push({ nid, rank: r.rank, naive: per * r.rank, real: truePct });
}
/* 판정 — **수치를 건드리는 칸은 반드시 그 수를 말해야 한다.** 무엇이 「수치 칸」인지는
   treeStats 에 안 묻는다(그것이 지금 재는 대상이다) — 트리 표의 `big`(해금 칸)으로 가른다.
   해금 칸 여섯(구울·골렘·약화·쇠약·시체 잔치·어둠의 지배)은 배수를 안 건드리니 조용한 것이 옳다. */
const mute = rows.filter(([, r]) => !r.big && r.fx.length === 0).map(([nid]) => nid);
const quiet = rows.filter(([, r]) => r.big && r.fx.length === 0).map(([nid]) => nid);
const out = {
  문: OLD ? "old" : "now",
  칸: rows.length,
  "① 지금 값을 말하는 칸": says.length + "/" + rows.length,
  "② 곱해 읽으면 어긋나는 칸": skew.map(s => `${s.nid} ${s.rank}단계 · 곱해 읽으면 ${s.naive}% · 참값 ${s.real == null ? "적힌 데 없음" : s.real + "%"}`),
  "해금 칸(조용한 것이 옳다)": quiet,
  "수치 칸인데 말 안 함": mute,
  "③ 막이": rows.map(([nid, r]) => `${nid}|${r.head}|${r.kind}|${r.fork}|${r.buy}`),
};
console.log(JSON.stringify({ ...out, "③ 막이": "칸 " + rows.length + "줄(파일로)" }, null, 1));
fs.writeFileSync("tmp/v123_" + (OLD ? "old" : "now") + ".json", JSON.stringify(out, null, 1));
console.log("적음 tmp/v123_" + (OLD ? "old" : "now") + ".json");
console.log(mute.length ? `판정 미달 — 수치를 건드리는데 말 안 하는 칸 ${mute.length}: ${mute.join(",")}`
                        : "판정 통과 — 수치 칸 전부가 지금 값을 말한다");
await S("Target.closeTarget", { targetId });
process.exit(0);
