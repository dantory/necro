/* 새 칸이 **정말 판의 수를 움직이는가** — 손잡이가 도는지 본다([[knob-that-does-nothing]]).
   브라우저 없이 core.js 를 그대로 불러 식을 두드린다. */
const C = await import("../js/core.js");
const read = () => ({
  소환수피해: +C.minionDmgMul().toFixed(3), 소환수체력: +C.minionHpMul().toFixed(3),
  상한: C.armyCap(), 폭발피해: +C.novaDmgMul().toFixed(3), 폭발범위: +C.novaRadMul().toFixed(3),
  재사용: +C.cdMul().toFixed(3), 저주증폭: +C.ampPower().toFixed(3),
  시체획득: +C.harvestPct().toFixed(3), 마나회수: C.spiritMp(),
});
const set = (t) => { for (const k of Object.keys(C.META.tree)) delete C.META.tree[k]; Object.assign(C.META.tree, t); };
set({}); const base = read();
const CASES = { "골수6":{marrow:6}, "광포5":{marrow:1,fury:5}, "석화5":{marrow:1,stone:5},
  "화장6":{pyre:6}, "탐식5":{glut:5}, "불꽃5":{pyro:5},
  "장막6":{veil:6}, "착취5":{drain:5}, "신속5":{haste:5} };
console.log("빈 트리 ", JSON.stringify(base));
let dead = [];
for (const [k, t] of Object.entries(CASES)) {
  set(t); const v = read();
  const moved = Object.keys(v).filter((x) => v[x] !== base[x]);
  if (!moved.length) dead.push(k);
  console.log(k.padEnd(7), moved.length ? moved.map((x) => `${x} ${base[x]}→${v[x]}`).join(" · ") : "★ 아무것도 안 움직임");
}
set({});
console.log(dead.length ? `\n안 도는 손잡이: ${dead.join(", ")}` : "\n아홉 칸 모두 판의 수를 움직인다");
process.exit(dead.length ? 1 : 0);
