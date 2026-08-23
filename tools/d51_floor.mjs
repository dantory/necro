/* ══ D-51 · 자의 «바닥» 을 잰다 — A/A 를 A/B 옆에 나란히 놓는다 ══ 2026-08-23
     node tools/d51_floor.mjs tmp/d51_a0.json tmp/d51_a1.json tmp/d50_p0.json tmp/d50_p1.json

   왜 있나 — D-50 의 판정기(`d50_judge.mjs`)는 ㉠ 의 끝 조건을 「씨앗 셋 다 한 톨도 안
   다름」으로 적었다. 그런데 이 자는 판을 **실제 벽시계**로 돌리므로
   (`js/main.js` 의 `dt = Math.min(0.05,(t-last)/1000||0.016)`), 씨앗은 `Math.random`
   만 고정하고 **틱의 개수·길이는 고정하지 않는다.** 문을 **끄고 두 번** 돌려도
   끝층·죽음·군세는 갈린다 — 즉 ㉠ 은 도달 불가능한 갈래였고, ㉡ 은 켜질 수밖에 없었다
   ([[floor-far-from-threshold]] · 바닥을 안 재고 문턱을 세웠다).

   그래서 같은 자로 A/A(두 팔 다 문 끔)를 돌리고, 여기서 **같은 수를 같은 방식으로**
   견준다. A/A 에서 나온 차이는 **정의상 전부 잡음**이므로 그것이 이 자의 바닥이다.

   판정 — A/B 폭이 바닥의 몇 배인가 (`배수 = |A/B차| / |A/A차|`)
     · 2.0 배 미만  → **못 가른다.** 그 수로는 문의 효과를 말할 수 없다.
     · 2.0 배 이상  → 바닥 위로 솟았다. 그제야 「문이 움직였다」를 말할 수 있다.
   바닥이 0 인 칸(A/A 가 참으로 같은 칸)만이 「한 톨도 안 다름」을 물을 자격이 있다. */
const fs = await import("node:fs");
const [AA0, AA1, AB0, AB1] = process.argv.slice(2);
if (!AB1) { console.error("쓰기: node tools/d51_floor.mjs <A/A 0> <A/A 1> <A/B 끈> <A/B 켠>"); process.exit(2); }
const 읽 = p => JSON.parse(fs.readFileSync(p, "utf8"));
const [aa0, aa1, ab0, ab1] = [읽(AA0), 읽(AA1), 읽(AB0), 읽(AB1)];
const KINDS = ["본인", "근접", "지배", "시체폭발", "넘침", "죽음폭발", "etc"];
const 키 = Object.keys(aa0).filter(k => aa1[k] && ab0[k] && ab1[k]);
if (!키.length) { console.error("짝이 맞는 판이 없다"); process.exit(2); }

/* 한 판에서 뽑는 수들 — 판정기가 실제로 견주는 그 칸들 */
const 몫근접 = o => { const s = Object.values(o.깎은몫 || {}).reduce((x, y) => x + y, 0);
  return s > 0 ? (o.깎은몫["근접"] || 0) / s * 100 : 0; };
const 수 = o => ({ 끝층: o.끝층, 죽음: o.죽음, 군세: o.군세평균,
  ...Object.fromEntries(KINDS.map(k => [`막타[${k}]`, o.막타?.[k] || 0])),
  "근접몫%": +몫근접(o).toFixed(1) });

const 이름들 = Object.keys(수(aa0[키[0]]));
const 모음 = new Map(이름들.map(n => [n, { aa: [], ab: [] }]));
for (const k of 키) {
  const [x0, x1, y0, y1] = [수(aa0[k]), 수(aa1[k]), 수(ab0[k]), 수(ab1[k])];
  for (const n of 이름들) {
    모음.get(n).aa.push(Math.abs(x1[n] - x0[n]));
    모음.get(n).ab.push(Math.abs(y1[n] - y0[n]));
  }
}
const 평 = v => v.reduce((a, b) => a + b, 0) / v.length;
const 최 = v => Math.max(...v);

console.log(`══ D-51 · 자의 바닥 (A/A) 대 D-50 이 문에 매긴 차이 (A/B) · 씨앗 ${키.length} ══`);
console.log(`  ※ A/A 는 두 팔이 참으로 같다 — 거기 나온 차이는 전부 잡음이다.\n`);
console.log("| 칸 | A/A 바닥 (평균/최대) | A/B 차 (평균/최대) | 배수 | 읽기 |");
console.log("| --- | --- | --- | --- | --- |");
const 판정 = [];
for (const n of 이름들) {
  const { aa, ab } = 모음.get(n);
  const [바닥, 차] = [평(aa), 평(ab)];
  const 배 = 바닥 > 0 ? 차 / 바닥 : (차 > 0 ? Infinity : NaN);
  const 읽기 = 바닥 === 0 && 차 === 0 ? "둘 다 0 — 안 갈리는 칸"
    : 바닥 === 0 ? "**바닥 0 — 이 칸만이 「한 톨도 안 다름」을 물을 자격이 있다**"
    : 배 >= 2 ? "**바닥 위로 솟았다**"
    : "못 가른다 — 잡음에 묻혔다";
  if (바닥 > 0) 판정.push({ n, 바닥, 차, 배 });
  console.log(`| ${n} | ${바닥.toFixed(2)} / ${최(aa).toFixed(2)} | ${차.toFixed(2)} / ${최(ab).toFixed(2)} | ${Number.isFinite(배) ? 배.toFixed(2) + "배" : "—"} | ${읽기} |`);
}
const 솟 = 판정.filter(x => x.배 >= 2);
console.log(`\n판정: 바닥이 있는 칸 ${판정.length} 중 **바닥의 2배를 넘긴 칸 ${솟.length}**` +
  (솟.length ? ` — ${솟.map(x => `${x.n}(${x.배.toFixed(1)}배)`).join(" · ")}` : ""));
console.log(솟.length
  ? "  ⇒ 문이 움직였다고 말할 수 있는 칸이 있다. 그 칸만 근거로 쓴다."
  : "  ⇒ **D-50 의 ㉡ 은 잡음이었다.** 이 자로는 문의 효과를 못 잰다 —\n" +
    "     「한 톨도 안 다름」이라는 끝 조건 자체가 이 자에 못 쓰는 말이다.");
