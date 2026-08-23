/* ══ D-50 · 「자를 고친 값」을 읽는다 — ARMY_PURE 문 A/B ══ 2026-08-23
     node tools/d50_judge.mjs tmp/d50_p0.json tmp/d50_p1.json

   D-49 가 찾은 것: 적이 내 소환수를 문 한 방이 `hurtMob(tgt,…,"근접")` 로도 갔다.
   그 한 줄이 둘을 망쳤다 — ㉠ 막타 꼬리표(문 없이 고쳤다) ㉡ **우리 편 화력 장부**
   (`KILL_DMG["근접"]` · `S.dealtAcc` → `S.armyDps`). ㉡ 은 판이 움직일까 봐 문으로 냈다
   (`ARMY_PURE_DEF = 0` · 켜면 그 몫이 빠진다).

   ★ **재기 전에 코드로 본 것**(그래도 재는 까닭은 짐작이기 때문이다
     [[cause-written-in-the-item-is-a-guess]]): `S.armyDps` 를 판이 읽는 자리는
     `battle.js` 의 관문 주인 체력 한 줄뿐이고(`Math.max(floorHp(f)*7, armyDps*GATE_SEC)`),
     `GATE_SEC_DEF = 0` 이다(A-1 에서 진 축이다). 그러면 문을 켜도 **판은 안 움직이고
     장부만 깨끗해진다** — 그것이 참이면 문을 그냥 박아도 된다.

   끝 조건 (재기 전에 적는다 · ROADMAP 의 D-50 항목에도 같은 글이 있다)
     ① **옳은 화면인가** — 판마다 마을에 있던 초 5 이하 · 시작층이 목표층 이상.
     ② **뜻 있는 표본인가** — 팔마다 적의 죽음 30 마리 이상([[floor-far-from-threshold]]).
     ③ **씨앗 셋 × 두 팔 = 6 판**([[seed-the-probe]]).
     ④ **가르는 수** ㄱ 씨앗마다 **막타 표·끝층·죽음·군세평균**이 두 팔에서 같은가
        ㄴ `깎은몫["근접"]` 의 몫%가 두 팔에서 얼마나 갈리나(= 오염의 크기)
        ㄷ 소환수 쪽 `잃음막타` 표도 같은가.
     ⑤ **판정 갈래** (하나만 찍고 닫지 않는다 — 켜진 것을 다 적는다)
        ㉠ **문이 판을 안 움직인다** → ARMY_PURE 는 **장부만 고치는 문**이다.
        ㉡ **문이 판을 움직인다** → 값을 정하기 전에 **왜** 움직이는지부터 본다.
        ㉢ **오염이 크다** — 끈 팔의 근접 몫%가 켠 팔보다 **5%p 이상** 큼
           → D-45/D-46/D-47 의 «깎은 몫» 칸에 각주를 단다.
        ㉣ **오염이 작다** — 5%p 미만 → 그 표들은 그대로 둔다.

   ★★ **D-51 이 ㉠·㉡ 의 끝 조건을 고쳤다 — 「한 톨도 안 다름」은 이 자에 못 쓰는 말이다**
     (2026-08-23 15:2x · [[floor-far-from-threshold]]). 판은 실제 벽시계로 돈다
     (`js/main.js` 의 `dt = (t-last)/1000`) — 씨앗은 `Math.random` 만 고정하고 **틱의
     개수·길이는 안 고정한다.** 그래서 **문을 끄고 두 번 돌려도**(A/A) 끝층·죽음·군세는
     갈린다. ㉠ 은 도달 불가능한 갈래였고 ㉡ 은 켜질 수밖에 없었다.
     → 이제 **A/A 짝을 같이 준다.** 칸마다 바닥(A/A 의 |차|)을 재고, A/B 의 |차| 가 그
       **바닥의 2 배를 넘긴 칸만** ㉡ 의 근거로 센다. 바닥이 참으로 0 인 칸만이
       「한 톨도 안 다름」을 물을 자격이 있다.
       쓰기: node tools/d50_judge.mjs <끈> <켠> [A/A-0] [A/A-1]
       A/A 짝을 안 주면 ㉡ 을 찍되 **「바닥을 안 쟀다」고 함께 적는다** — 그 판정은 근거가 아니다. */
const fs = await import("node:fs");
const KINDS = ["본인", "근접", "지배", "시체폭발", "넘침", "죽음폭발", "etc"];
const [A, B, F0, F1] = process.argv.slice(2);
if (!A || !B) { console.error("쓰기: node tools/d50_judge.mjs <끈 팔.json> <켠 팔.json> [A/A-0] [A/A-1]"); process.exit(2); }
const 읽 = p => JSON.parse(fs.readFileSync(p, "utf8"));
const p0 = 읽(A), p1 = 읽(B);
/* ★ 바닥(A/A) — 두 팔이 참으로 같은 짝. 칸마다 |차| 의 평균이 이 자의 잡음이다. */
const 바닥 = (F0 && F1) ? (() => {
  const [f0, f1] = [읽(F0), 읽(F1)], 통 = {};
  const 담 = (n, v) => { (통[n] ||= []).push(Math.abs(v)); };
  for (const k of Object.keys(f0).filter(k => f1[k])) {
    담("끝층", f1[k].끝층 - f0[k].끝층); 담("죽음", f1[k].죽음 - f0[k].죽음);
    담("군세", f1[k].군세평균 - f0[k].군세평균);
    for (const kk of KINDS) 담(`막타[${kk}]`, (f1[k].막타?.[kk] || 0) - (f0[k].막타?.[kk] || 0));
    const 몫 = o => { const s = KINDS.reduce((x, y) => x + (o.깎은몫[y] || 0), 0);
      return s > 0 ? (o.깎은몫["근접"] || 0) / s * 100 : 0; };
    담("근접몫%", 몫(f1[k]) - 몫(f0[k]));
  }
  return Object.fromEntries(Object.entries(통).map(([n, v]) => [n, v.reduce((a, b) => a + b, 0) / v.length]));
})() : null;
/* 바닥의 2 배를 넘겼나 — 바닥이 없으면(A/A 를 안 줬으면) 옛 방식대로 「다르면 다르다」 */
const 솟았나 = (n, d) => !바닥 ? d !== 0 : Math.abs(d) > 2 * (바닥[n] ?? 0);
const 키 = Object.keys(p0).filter(k => p1[k]);
const 흠 = [], 갈래 = [], 줄 = [];
if (키.length < 3) 흠.push(`③ 짝이 맞는 판 ${키.length}<3`);

let 판움직임 = [];
let 오염합0 = 0, 오염합1 = 0, 깎음합0 = 0, 깎음합1 = 0;
for (const k of 키) {
  const a = p0[k], b = p1[k];
  for (const [이름, o] of [["끈", a], ["켠", b]]) {
    if (o.마을초 > 5) 흠.push(`① ${이름}/${k} 마을초 ${o.마을초}>5`);
    if (o.시작층 < (o.목표층 ?? o.시작층)) 흠.push(`① ${이름}/${k} 시작층 모자람`);
    if (o.죽음 < 30) 흠.push(`② ${이름}/${k} 표본 ${o.죽음}<30`);
  }
  /* ㄱ 판이 움직였나 — 막타 표·끝층·죽음·군세평균 */
  const 다름 = [];
  const 재 = (n, x, y) => { if (솟았나(n, y - x)) 다름.push(`${n} ${x}≠${y}` +
    (바닥 ? ` (바닥 ${(바닥[n] ?? 0).toFixed(2)})` : "")); };
  재("끝층", a.끝층, b.끝층); 재("죽음", a.죽음, b.죽음); 재("군세", a.군세평균, b.군세평균);
  for (const kk of KINDS) 재(`막타[${kk}]`, a.막타[kk] || 0, b.막타[kk] || 0);
  /* 잃음막타는 A/A 바닥을 아직 안 쟀다 — 바닥을 준 판에서는 근거로 세지 않고 곁가지로만 적는다 */
  const LA = a.잃음장부?.잃음막타, LB = b.잃음장부?.잃음막타;
  if (LA && LB && !바닥) for (const kk of Object.keys(LA)) if ((LA[kk] || 0) !== (LB[kk] || 0))
    다름.push(`잃음막타[${kk}] ${LA[kk]}≠${LB[kk]}`);
  if (다름.length) 판움직임.push(`${k}: ${다름.slice(0, 4).join(" · ")}`);
  /* ㄴ 오염의 크기 — 깎은몫 기준 근접 몫% */
  const 합 = o => KINDS.reduce((s, kk) => s + (o.깎은몫[kk] || 0), 0);
  const s0 = 합(a), s1 = 합(b);
  깎음합0 += s0; 깎음합1 += s1;
  오염합0 += a.깎은몫["근접"] || 0; 오염합1 += b.깎은몫["근접"] || 0;
  const m0 = (a.깎은몫["근접"] || 0) / Math.max(1, s0) * 100;
  const m1 = (b.깎은몫["근접"] || 0) / Math.max(1, s1) * 100;
  줄.push(`   · ${k.padEnd(14)} 근접몫 끈 ${m0.toFixed(1).padStart(5)}% → 켠 ${m1.toFixed(1).padStart(5)}%` +
    ` (몫 합 ${Math.round(s0)}→${Math.round(s1)} · 근접 ${Math.round(a.깎은몫["근접"] || 0)}→${Math.round(b.깎은몫["근접"] || 0)})` +
    ` · 끝층 ${a.끝층}/${b.끝층} · 죽음 ${a.죽음}/${b.죽음}`);
}
const M0 = 오염합0 / Math.max(1, 깎음합0) * 100, M1 = 오염합1 / Math.max(1, 깎음합1) * 100;
const 차 = M0 - M1;
const 바닥말 = 바닥 ? "바닥(A/A)의 2 배를 넘긴 칸만 셌다" : "**⚠ 바닥을 안 쟀다 — 이 판정은 근거가 아니다**(A/A 짝을 같이 줄 것)";
if (판움직임.length) 갈래.push(`㉡ **문이 판을 움직인다** [${바닥말}] — ${판움직임.join(" / ")}`);
else 갈래.push(`㉠ **문이 판을 안 움직인다** — 씨앗 ${키.length} 다 ${바닥 ? "바닥 위로 솟은 칸이 없다" : "한 톨도 안 다르다"}`);
/* 오염도 바닥과 견준다 — 근접몫% 의 A/A 폭보다 작으면 그 수는 잡음이다 */
const 몫바닥 = 바닥?.["근접몫%"] ?? 0;
const 잡음 = 바닥 && Math.abs(차) <= 2 * 몫바닥
  ? ` · **잡음이다**(A/A 바닥 ${몫바닥.toFixed(1)}%p 의 ${(Math.abs(차) / Math.max(1e-9, 몫바닥)).toFixed(1)}배)` : "";
if (차 >= 5) 갈래.push(`㉢ **오염이 크다** — 근접 몫 ${M0.toFixed(1)}% → ${M1.toFixed(1)}% (${차.toFixed(1)}%p · 문턱 5)${잡음}`);
else 갈래.push(`㉣ **오염이 작다** — 근접 몫 ${M0.toFixed(1)}% → ${M1.toFixed(1)}% (${차.toFixed(1)}%p · 문턱 5)${잡음}`);
console.log("\n══ D-50 판정 ══");
console.log((흠.length ? `⚠ ${흠.join(" · ")}\n` : "") + 갈래.join("\n"));
console.log(줄.join("\n"));
console.log(`\n합: 깎은 몫 ${Math.round(깎음합0)} → ${Math.round(깎음합1)}` +
  ` (적에게 안 간 몫 ${Math.round(깎음합0 - 깎음합1)} = ${((깎음합0 - 깎음합1) / Math.max(1, 깎음합0) * 100).toFixed(1)}%)`);
