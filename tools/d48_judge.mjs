/* ══ D-48 · 「시체를 남겨 줘도 군세가 안 는다 — 무엇이 소환을 막나」를 셋으로 가른다 ══
     node tools/d48_judge.mjs [수=tmp/d48_summon.json]

   D-47 이 남긴 ☞ 다. 해골 편성은 폭발 문턱을 두 배로 올리고 시체 6 을 떼 놨는데도
   **군세가 안 늘었다**(10.15 · 균형 11.56 아래). 남긴 시체가 소환으로 안 간다는 뜻인데,
   막은 것이 마나인지 재사용인지 군세 상한인지는 **재기 전에는 짐작이다**
   ([[cause-written-in-the-item-is-a-guess]]). 셋은 고칠 자리가 전부 다르다.

   ★ **자를 새로 만들지 않는다** — D-46/D-47 이 쓴 `tools/d46_forks.mjs` 를 그대로 돌리고
     (편성 넷 × 씨앗 1·3·5 × 층 21 × 40초 = 12판 · `__DOC_CORPSE=1`), 거기에 판이 이미
     들고 있던 장부 `RAISE_TALLY`(D-18)를 함께 읽는다. 균형 팔은 novaMul 1 · keep 0 이라
     **문이 꺼진 판과 같아야 한다** — D-47 의 수와 그대로 견줄 수 있는 자리다.
   ★ 장부에 구멍 둘을 먼저 막았다(battle.js RAISE_TALLY 머리말): `capskip`(상한이 차서
     시도조차 못 한 초) · `sole*`(그 하나만 막은 초). 없으면 「상한이 벽」이 조용한 0 으로
     사라지고, 몫의 합이 100% 를 넘어 지목이 안 된다.

   끝 조건 (재기 전에 적는다 · docs/ROADMAP.md 의 D-48 항목에도 같은 글이 있다)
     ① **옳은 화면인가** — 12판 다 마을초 5 이하 · 시작층 21 이상(D-46·D-47 과 같은 자리).
     ② **뜻 있는 표본인가** — 편성마다 소환 기회(try + capskip) **300 이상**.
     ③ **자가 안 어긋났다** — 편성마다 ㄱ 장부가 붙었고(null 아님) ㄴ 갈래의 합이 기회와
        맞는다: `ok + merge + capfull + soleCd + soleMana + soleCorpse + multi + capskip`
        이 기회의 **±2% 안**. 어긋나면 값을 읽기 전에 **자를 먼저 의심한다**
        ([[threshold-and-ruler-must-match]] · 못 센 갈래가 있다는 뜻이다).
     ④ **가르는 수** — 분모는 **기회(try + capskip)** 다. 시도만 분모로 쓰면 상한이 통째로 빠진다.
        ㄱ 상한 몫 = (capskip + capfull) ㄴ 마나만 = soleMana ㄷ 재사용만 = soleCd
        ㄹ 시체만 = soleCorpse ㅁ 섞임 = multi ㅂ 섬 = ok
     ⑤ **판정 갈래** (문턱 50% — 셋 중 하나를 지목하려면 절반은 넘어야 한다)
        ㉠ **상한이 벽** — ㄱ 이 50% 이상 → 손잡이는 `armyCap`·머지·초과 세우기다.
           시체를 남겨 줘도 놓을 자리가 없으니 안 는 것이 당연하다.
        ㉡ **마나가 벽** — ㄴ 이 50% 이상 → 손잡이는 마나 회복·소환 값·차례(저주를 뒤로)다.
        ㉢ **재사용이 벽** — ㄷ 이 50% 이상 → 손잡이는 재사용 초·raiseHaste·이어 세우기다.
        ㉣ **시체가 벽** — ㄹ 이 50% 이상 → D-47 의 keep 이 되레 굶겼다는 뜻이다(문을 되돌린다).
        ㉤ **섞였다** — 어느 것도 50% 을 못 넘음 → 제일 큰 것과 몫을 적고 **섞임 몫**도 같이
           적는다. 하나만 풀어선 안 선다는 뜻이라 손잡이를 둘 같이 잡아야 한다.
        ㉥ **안 막힌다** — ㅂ(섬) 이 50% 이상인데 군세가 D-47 의 10~13 에 머문다 → 벽은
           «세우기»가 아니라 **«지워짐»**이다(`lost` 를 같이 본다 · D-19 자리로 돌아간다).
     · 곁가지로 함께 적는다: **문이 실제로 시체를 남겼는가** — keep 을 준 해골(6)·골렘벽(8)의
       「시체만」 몫이 균형(keep 0)보다 **낮아야** 한다. 안 낮으면 문이 시체를 남긴 것이
       아니라 폭발이 더 크게 한 번에 삼킨 것뿐이다(D-47 이 본 그 그림). */
import fs from "node:fs";
const SRC = process.argv[2] || "tmp/d48_summon.json";
const 이름 = { balance: "균형", bone: "해골", flesh: "구울", wall: "골렘벽" };
const KEEP = { balance: 0, bone: 6, flesh: 4, wall: 8 };
const j = JSON.parse(fs.readFileSync(SRC, "utf8"));

const by = {};
for (const [k, o] of Object.entries(j)) {
  const d = o.편성 || k.split("/")[0];
  const a = by[d] || (by[d] = { T: {}, 군세: [], 판: 0, 마을: 0, 얕음: 0, 없음: 0 });
  a.판++;
  if ((o.마을초 ?? 0) > 5) a.마을++;
  if ((o.시작층 ?? 0) < 21) a.얕음++;
  a.군세.push(o.군세평균 ?? 0);
  const T = o.소환장부;
  if (!T) { a.없음++; continue; }
  for (const [kk, v] of Object.entries(T)) a.T[kk] = (a.T[kk] || 0) + v;
}

const 흠 = [], 줄 = [];
for (const [d, a] of Object.entries(by)) {
  const n = 이름[d] || d, T = a.T;
  if (a.마을) 흠.push(`①${n} 마을초>5 ${a.마을}판`);
  if (a.얕음) 흠.push(`①${n} 시작층<21 ${a.얕음}판`);
  if (a.없음) { 흠.push(`③${n} 소환 장부가 없다 ${a.없음}판`); continue; }
  const 기회 = (T.try || 0) + (T.capskip || 0);
  if (기회 < 300) 흠.push(`②${n} 표본 ${기회}<300`);
  const 합 = ["ok", "merge", "capfull", "soleCd", "soleMana", "soleCorpse", "multi", "capskip"]
    .reduce((s, k) => s + (T[k] || 0), 0);
  const 어긋 = Math.abs(합 - 기회) / Math.max(1, 기회);
  if (어긋 > 0.02) 흠.push(`③${n} 갈래 합 ${합} 대 기회 ${기회} (${(어긋 * 100).toFixed(1)}% 어긋)`);
  const p = v => +((v || 0) / Math.max(1, 기회) * 100).toFixed(1);
  줄.push({ d, n, 기회,
    상한: p((T.capskip || 0) + (T.capfull || 0)), 마나만: p(T.soleMana), 재사용만: p(T.soleCd),
    시체만: p(T.soleCorpse), 섞임: p(T.multi), 섬: p(T.ok), 머지: p(T.merge), 지워짐: T.lost || 0,
    군세: +(a.군세.reduce((s, v) => s + v, 0) / Math.max(1, a.군세.length)).toFixed(2) });
}

/* ★ 머지도 같이 찍는다 — 「선 것」의 한 갈래인데 표에서 빠지면 조용한 0 이 된다
   ([[silent-zero-is-not-an-observation]]). 상한이 찼을 때 머릿수 대신 세기로 도는 자리다. */
console.log(`\n│ 편성   │ 기회 │ 상한 │ 마나만 │ 재사용만 │ 시체만 │ 섞임 │ 섬 │ 머지 │ 군세 │ 지워짐 │`);
for (const r of 줄)
  console.log(`│ ${r.n.padEnd(4)} │ ${String(r.기회).padStart(4)} │ ${String(r.상한).padStart(4)}% │ ${String(r.마나만).padStart(5)}% │ ${String(r.재사용만).padStart(7)}% │ ${String(r.시체만).padStart(5)}% │ ${String(r.섞임).padStart(4)}% │ ${String(r.섬).padStart(4)}% │ ${String(r.머지).padStart(4)}% │ ${String(r.군세).padStart(5)} │ ${String(r.지워짐).padStart(5)} │`);

const 평 = k => +(줄.reduce((s, r) => s + r[k], 0) / Math.max(1, 줄.length)).toFixed(1);
const 몫 = { 상한: 평("상한"), 마나만: 평("마나만"), 재사용만: 평("재사용만"), 시체만: 평("시체만") };
const 군세평 = 평("군세"), 섬 = 평("섬");
let 판정;
if (흠.length) 판정 = `판정 미룸 — 끝 조건이 깨졌다: ${흠.join(" · ")}`;
else if (몫.상한 >= 50) 판정 = `㉠ 상한이 벽이다 (${몫.상한}%) — 손잡이는 armyCap·머지·초과 세우기`;
else if (몫.마나만 >= 50) 판정 = `㉡ 마나가 벽이다 (${몫.마나만}%) — 손잡이는 마나 회복·소환 값·차례`;
else if (몫.재사용만 >= 50) 판정 = `㉢ 재사용이 벽이다 (${몫.재사용만}%) — 손잡이는 재사용 초·raiseHaste`;
else if (몫.시체만 >= 50) 판정 = `㉣ 시체가 벽이다 (${몫.시체만}%) — D-47 의 keep 이 되레 굶겼다`;
else if (섬 >= 50 && 군세평 <= 13) 판정 = `㉥ 안 막힌다 (섬 ${섬}% · 군세 ${군세평}) — 벽은 «세우기»가 아니라 «지워짐»이다`;
else { const [k, v] = Object.entries(몫).sort((a, b) => b[1] - a[1])[0];
  판정 = `㉤ 섞였다 — 제일 큰 것은 ${k} ${v}% (문턱 50%) · 섞임 ${평("섞임")}% · 하나만 풀어선 안 선다`; }
console.log(`\n판정: ${판정}`);

const 균형 = 줄.find(r => r.d === "balance");
if (균형) for (const r of 줄) if (KEEP[r.d] > 0)
  console.log(`곁가지: ${r.n}(keep ${KEEP[r.d]}) 시체만 ${r.시체만}% ${r.시체만 < 균형.시체만 ? "<" : "≥"} 균형 ${균형.시체만}% ` +
    `— 문이 시체를 ${r.시체만 < 균형.시체만 ? "정말 남겼다" : "안 남겼다(폭발이 더 크게 삼켰을 뿐)"}`);
console.log(`(수는 ${SRC})`);
