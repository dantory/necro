/* ══ V-89 자 — 「이(가)」가 화면에 그대로 뜨는 것을 잡는다 ══
   node tools/v89_josa.mjs

   여태 관문에 들어설 때마다 `저주받은 왕 이(가) 지키는 중` 이 떴다. **괄호가 답이 아니다** —
   받침으로 골라야 한다(왕이 · 역병술사가). 주인 넷 중 둘만 받침을 가져서 한쪽으로
   굳힐 수도 없다.

   자는 두 겹이다:
   ① **글자 자국** — 소스(js/*.js · *.html)에 `이(가)` 꼴이 하나라도 남아 있으면 운다.
      새로 쓰는 줄이 같은 자국을 다시 남기는 것을 막는다.
   ② **켜서 읽는다** — 주인 넷을 하나씩 세워(`__FORCE_LORD`) **관문 층(5층)에서 시작**해
      실제 일지 줄을 DOM 에서 읽는다([[probe-must-walk-the-real-path]]). 지름길로
      `josa()` 만 부르면 «부르는 자리»가 틀린 것은 영영 안 잡힌다.
   문: 자국 0 개 · 넷 다 기대한 낱말과 **정확히** 같다.
   되돌리는 문(캘리브레이션): `JOSA_OLD=1` 이면 옛 꼴(`이름 이(가)`)로 되돌려 자가 운다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const OLD = process.env.JOSA_OLD === "1";

/* ── ① 글자 자국 ── */
const MARK = /이\(가\)|가\(이\)|을\(를\)|를\(을\)|은\(는\)|는\(은\)|와\(과\)|과\(와\)|\(으\)로/;
const files = [...fs.readdirSync("js").filter(f => f.endsWith(".js")).map(f => "js/" + f),
               ...fs.readdirSync(".").filter(f => f.endsWith(".html"))];
/** 주석은 **빼고** 본다 — 이 자국을 설명하는 글(바로 이 파일·core.js 의 머리글)까지 세면
 *  자는 영영 안 그친다. 여는 자리를 따라가며 지우는 작은 기계다(정규식 한 방으로 지우면
 *  문자열 안의 `/*` 를 잘못 먹는다). */
const stripComments = (src) => {
  let out = "", blk = false;
  for (const line of src.split("\n")) {
    let s = "", i = 0;
    while (i < line.length) {
      if (blk) { const e = line.indexOf("*/", i); if (e < 0) { i = line.length; } else { blk = false; i = e + 2; } continue; }
      if (line[i] === "/" && line[i + 1] === "*") { blk = true; i += 2; continue; }
      if (line[i] === "/" && line[i + 1] === "/") break;
      s += line[i++];
    }
    out += s + "\n";
  }
  return out;
};
const marks = [];
for (const f of files) {
  const lines = stripComments(fs.readFileSync(f, "utf8")).split("\n");
  lines.forEach((l, i) => { if (MARK.test(l)) marks.push(`${f}:${i + 1}  ${l.trim().slice(0, 90)}`); });
}
if (OLD) {                       /* 되돌리는 문 — 옛 소스 한 줄을 섞어 «자국 자」가 눈을 뜨는지 본다 */
  const fake = `say(\`\${lord.n} 이(가) 지키는 중\`);`;
  if (MARK.test(fake)) marks.push(`js/__옛것__:1  ${fake}`);
}
console.log(`① 글자 자국  ${marks.length} 개`);
for (const m of marks) console.log("   " + m);

/* ── ② 켜서 읽는다 ── */
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1366, height: 700, deviceScaleFactor: 1, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

/* 관문(5층)에서 곧장 시작한다 — 표식(diveSet/dive)이 그 자리를 준다. */
const meta = { gold: 90000, lv: 26, xp: 0, deepest: 20, runs: 6, dive: 5, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 20, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);

/* 주인 이름은 **표에서** 읽는다(여기 베껴 두면 표가 바뀔 때 자만 옛말을 한다). 그리고
   시험 대상인 «그 줄»에서 되뽑지 않는다 — 줄에서 이름을 깎아 내면 붙어 있던 조사가
   그대로 기대값이 되어 **무엇을 넣어도 통과**한다([[silent-zero-is-not-an-observation]]). */
const NAMES = [...fs.readFileSync("js/core.js", "utf8")
  .split("export const GATELORDS = [")[1].split("];")[0]
  .matchAll(/n:\s*"([^"]+)"/g)].map(m => m[1]);
if (NAMES.length !== 4) throw new Error(`GATELORDS 이름을 ${NAMES.length} 개만 읽었다 — 표 모양이 바뀌었나?`);
const rows = [];
for (let k = 0; k < 4; k++) {
  await S("Page.reload", { ignoreCache: true }); await wait(1600);
  await ev(`globalThis.__FORCE_LORD = ${k}`);
  if (!(await ev(`typeof window.__toDungeon === "function"`)))
    throw new Error("window.__toDungeon 이 없다 — 자가 던전에 못 들어간다(이름이 바뀌었나?)");
  await ev(`window.__toDungeon()`);
  let line = null;
  for (let t = 0; t < 40 && !line; t++) {           /* 관문 줄이 뜰 때까지 (최대 8초) */
    await wait(200);
    /* 되돌리는 문 — **읽기 전에 DOM 을 옛 꼴로 되돌린다.** 판정만 흉내 내면 「읽는 길」이
       고장난 것을 못 잡으니, 자가 실제로 지나는 자리에 옛 글자를 놓는다. */
    if (OLD) await ev(`(()=>{for(const d of document.querySelectorAll('#log div'))
      if(/지키는 중/.test(d.textContent)) d.textContent = d.textContent.replace(/([^ ])([이가]) 지키는 중/, "$1 이(가) 지키는 중");
      return 1})()`);
    line = await ev(`(()=>{const d=[...document.querySelectorAll('#log div')].map(x=>x.textContent);
      return d.find(s=>/지키는 중/.test(s)) || null;})()`);
  }
  const floor = await ev(`(window.__S||{}).floor`);
  rows.push({ k, floor, line, name: NAMES[k] });
}
await S("Target.closeTarget", { targetId }).catch(() => {});

/* 기대값: 이름의 받침으로 고른다. 자가 스스로 셈해야 «둘 다 틀린 채 맞아 보이는» 일이 없다. */
const jong = (w) => { const c = w.charCodeAt(w.length - 1);
  return (c >= 0xac00 && c <= 0xd7a3) ? (c - 0xac00) % 28 : 0; };
let bad = 0;
console.log("② 켜서 읽은 관문 줄");
for (const r of rows) {
  if (!r.line) { console.log(`   ${r.k}  ✗ 관문 줄이 안 떴다 (층 ${r.floor})`); bad++; continue; }
  const nm = r.name || "";
  const want = `${nm}${jong(nm) ? "이" : "가"} 지키는 중`;
  const got = r.line.replace(/^.*관문\s*/, "");
  const ok = got === want;
  if (!ok) bad++;
  console.log(`   ${r.k}  ${ok ? "○" : "✗"} 층 ${r.floor} · 「${got}」  ${ok ? "" : `← 「${want}」 이어야 한다`}`);
}
const pass = marks.length === 0 && bad === 0;
console.log(`판정: ${pass ? "통과" : "미달"} (자국 ${marks.length} · 어긋난 줄 ${bad})${OLD ? "  [JOSA_OLD=1 — 울어야 정상]" : ""}`);
process.exit(pass ? 0 : 1);
