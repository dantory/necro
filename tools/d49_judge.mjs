/* ══ D-49 · 「소환수가 왜 13초 만에 죽나」를 셋으로 가른다 ══
     node tools/d49_judge.mjs tmp/d49_f05.json tmp/d49_f13.json tmp/d49_f21.json

   D-48 이 남긴 ☞ 다. 군세가 10~12 에 머무는 것은 **못 세워서가 아니라 세운 것이 13초 만에
   죽어서**였다(세움 0.99/초 · 지워짐 0.91/초 · 수명 13.2초). 고칠 자리가 셋으로 갈리는데
   **재기 전에는 짐작이다**([[cause-written-in-the-item-is-a-guess]]):
     ① 맞는 양(누가 얼마나 때리나) ② 버티는 힘(몸이 층을 따라 자라나) ③ 어그로(누가 받나).

   ★ **자를 새로 만들지 않는다** — D-46/D-47/D-48 이 쓴 `tools/d46_forks.mjs` 를 그대로 돌리고
     (편성 **균형** 하나 × 씨앗 1·3·5 × 40초), 판이 이미 들고 있던 장부 `LOST_BY`/`LOST_DMG`(D-20)를
     함께 읽는다. 더한 것은 **세는 칸 둘**뿐이다 — `LOST_HITS`(맞은 횟수)·`HERO_TALLY`(본인 몫).
     횟수가 없으면 「많이 맞아서」와 「한 방이 커서」가 한 수에 뭉쳐 손잡이가 안 갈린다.
   ★ **층을 셋 돈다(5 · 13 · 21).** 수명이 깊이를 따라 무너지는지가 ②의 유일한 증거다 —
     한 층에서만 재면 「13초」가 설계된 평형인지 자란 것이 안 자란 탓인지 **영영 못 가른다**
     ([[floor-erases-the-ramp]]).

   ★★ **문턱 옆에 «바닥»을 나란히 적는다**(D-48 이 ㉢ 을 못 읽고 배운 것 · [[floor-far-from-threshold]]).
     아무 일이 없을 때 그 수가 얼마인지를 **재기 전에** 계산해 둔다:
       · 소환수 몫(어그로)의 바닥 = **군세/(군세+1)** — 적이 몸을 고르게 고른다면 12 마리 곁의
         네크로는 1/13 만 맞는다. 즉 「소환수가 92% 를 받는다」는 **신호가 아니라 바닥**이다.
       · 버틸 대수의 바닥 = 몸과 적 한 방이 같은 비로 자라면 층이 깊어져도 **안 변한다**(변화 0%).
         그래서 ㉠ 은 「층 5 → 21 에서 몇 % 무너지나」로 본다.
       · 기제 갈래(charge/curse/howl/pool/add/blast)의 바닥은 **0** 이다(안 돌면 0회) —
         25% 문턱이 그대로 유효하다. 반대로 `melee` 은 늘 붙어 있어 바닥이 높다 —
         지목되어도 손잡이가 아니라 **적 수·적 힘**(D 의 난이도 축)으로 넘긴다.

   끝 조건 (재기 전에 적는다 · docs/ROADMAP.md 의 D-49 항목에도 같은 글이 있다)
     ① **옳은 화면인가** — 판마다 마을초 5 이하 · 시작층이 그 팔의 목표층 이상.
     ② **뜻 있는 표본인가** — 층마다 소환수 죽음 **30 이상**.
     ③ **자가 안 어긋났다** — ㄱ 소환수 장부가 붙었고(null 아님) ㄴ 갈래별 막타의 합이
        소환 장부의 `lost`(D-48 이 쓴 그 수)와 **±10% 안** ㄷ 층 21 · 균형 팔의 수명이
        D-48 의 **13.2초에서 ±4초 안**. 어긋나면 값을 읽기 전에 **자를 먼저 의심한다**
        ([[threshold-and-ruler-must-match]]).
     ④ **가르는 수** — 층마다: 한 방 = 깎인몫/맞은횟수 · 버틸대수 = 소환수 몸/한 방 ·
        수명 = 몸 ÷ (마리당 초당 맞는 양) · 소환수 몫 = 깎인몫/(깎인몫 + 본인 맞은 몫) ·
        갈래별 깎인 몫(%).
     ⑤ **판정 갈래**
        ㉠ **몸이 층을 안 따라간다** — 버틸대수가 층 5 → 21 에서 **40% 이상** 무너짐(바닥 0%)
           → 손잡이는 **소환수 체력·방어의 성장 축**이다([[floor-erases-the-ramp]] 의 그 자리).
        ㉡ **어그로가 소환수에 몰린다** — 소환수 몫이 **균등 바닥 + 5%p 이상**
           → 손잡이는 **적이 고르는 자리**(네크로가 제 몫을 받게 · 소환수가 앞을 덜 막게).
        ㉢ **한 기제가 때린다** — 기제 갈래 하나가 깎인 몫의 **25% 이상**(바닥 0)
           → 그 수법의 값·주기가 손잡이다.
        ㉣ **평지의 이빨이다** — 위 셋이 다 아니고 `melee` 이 깎인 몫의 **50% 이상**
           → 소환수 쪽 손잡이가 아니라 **적 수·적 힘**이다(D 의 난이도 축으로 넘긴다).
        ㉤ **섞였다** — 어느 것도 문턱을 못 넘음 → 제일 큰 것과 몫을 적고, 손잡이를 둘 같이 잡는다.
     · 곁가지: **넘치게 때렸는가** — 죽음 하나당 깎인 몫이 소환수 몸보다 크게 넘으면
       「오래 갈아 죽인」 것이 아니라 **한 방에 지워지는** 것이다(그러면 ㉠ 이 더 급하다). */
import fs from "node:fs";
const SRCS = process.argv.slice(2).filter(a => a.endsWith(".json"));
if (!SRCS.length) { console.log("수 파일을 하나 이상 달라 — node tools/d49_judge.mjs tmp/d49_f*.json"); process.exit(1); }
const 기제 = ["add", "lord", "howl", "curse", "charge", "pool", "blast"];
const D48_수명 = 13.2;                    // D-48 이 같은 자리(층 21 · 균형)에서 낸 수 — ③ㄷ 이 견줄 기준

const 층별 = {};
for (const SRC of SRCS) {
  const j = JSON.parse(fs.readFileSync(SRC, "utf8"));
  for (const [k, o] of Object.entries(j)) {
    const f = Math.round(o.시작층 ?? 0);
    const a = 층별[f] || (층별[f] = { 판: 0, 마을: 0, 없음: 0, 초: 0, 몸: [], 군세: [], 본인몸: [],
                                      막타: {}, 몫: {}, 횟수: {}, 본인몫: 0, 본인횟수: 0, lost: 0, 얕음: 0 });
    a.판++; a.초 += o.ff != null ? 0 : 0;
    if ((o.마을초 ?? 0) > 5) a.마을++;
    a.몸.push(o.소환수몸 ?? 0); a.군세.push(o.군세평균 ?? 0); a.본인몸.push(o.본인몸최대 ?? 0);
    a.lost += o.소환장부?.lost ?? 0;
    const L = o.잃음장부;
    if (!L) { a.없음++; continue; }
    for (const [kk, v] of Object.entries(L.잃음막타)) a.막타[kk] = (a.막타[kk] || 0) + v;
    for (const [kk, v] of Object.entries(L.잃음몫)) a.몫[kk] = (a.몫[kk] || 0) + v;
    for (const [kk, v] of Object.entries(L.잃음횟수)) a.횟수[kk] = (a.횟수[kk] || 0) + v;
    a.본인몫 += L.본인.맞은몫 || 0; a.본인횟수 += L.본인.맞은수 || 0;
  }
}
const SEC = +(process.env.D49_SEC || 40);          // 잰 창의 길이(자를 돌린 그 수와 같아야 한다)

const 흠 = [], 줄 = [];
for (const f of Object.keys(층별).map(Number).sort((a, b) => a - b)) {
  const a = 층별[f];
  if (a.마을) 흠.push(`①층${f} 마을초>5 ${a.마을}판`);
  if (a.없음) { 흠.push(`③층${f} 소환수 장부가 없다 ${a.없음}판`); continue; }
  const 죽음 = Object.values(a.막타).reduce((s, v) => s + v, 0);
  const 깎임 = Object.values(a.몫).reduce((s, v) => s + v, 0);
  const 횟수 = Object.values(a.횟수).reduce((s, v) => s + v, 0);
  if (죽음 < 30) 흠.push(`②층${f} 표본 ${죽음}<30`);
  if (a.lost && Math.abs(죽음 - a.lost) / Math.max(1, a.lost) > 0.10)
    흠.push(`③층${f} 막타 합 ${죽음} 대 소환 장부 lost ${a.lost} (${((죽음 - a.lost) / Math.max(1, a.lost) * 100).toFixed(0)}% 어긋)`);
  const 평 = v => v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
  const 몸 = 평(a.몸), 군세 = 평(a.군세);
  const 한방 = 깎임 / Math.max(1, 횟수);
  const 버틸 = 몸 / Math.max(0.01, 한방);
  const 마리당초당 = 깎임 / Math.max(1, a.판 * SEC) / Math.max(0.01, 군세);
  const 수명 = 몸 / Math.max(0.001, 마리당초당);
  const 소환수몫 = 깎임 / Math.max(0.01, 깎임 + a.본인몫) * 100;
  const 균등바닥 = 군세 / (군세 + 1) * 100;
  const 기제몫 = {}; for (const k of 기제) 기제몫[k] = (a.몫[k] || 0) / Math.max(0.01, 깎임) * 100;
  const melee = (a.몫.melee || 0) / Math.max(0.01, 깎임) * 100;
  줄.push({ f, 판: a.판, 죽음, 깎임, 횟수, 몸: +몸.toFixed(1), 군세: +군세.toFixed(2),
    한방: +한방.toFixed(1), 버틸: +버틸.toFixed(1), 수명: +수명.toFixed(1),
    소환수몫: +소환수몫.toFixed(1), 균등바닥: +균등바닥.toFixed(1), melee: +melee.toFixed(1),
    기제몫, 본인몸: +평(a.본인몸).toFixed(0), 본인몫: +a.본인몫.toFixed(0),
    죽음당깎임: +(깎임 / Math.max(1, 죽음)).toFixed(1) });
}

console.log(`\n│ 층 │ 판 │ 죽음 │ 소환수몸 │ 한 방 │ 버틸대수 │ 수명 │ 군세 │ 소환수몫(바닥) │ melee │`);
for (const r of 줄)
  console.log(`│ ${String(r.f).padStart(2)} │ ${r.판} │ ${String(r.죽음).padStart(4)} │ ${String(r.몸).padStart(8)} │ ${String(r.한방).padStart(5)} │ ${String(r.버틸).padStart(8)} │ ${String(r.수명).padStart(4)}초 │ ${String(r.군세).padStart(5)} │ ${String(r.소환수몫).padStart(6)}% (${r.균등바닥}%) │ ${String(r.melee).padStart(5)}% │`);

console.log(`\n자의 바닥: 어그로의 바닥은 «군세/(군세+1)» 다 — 적이 몸을 고르게 골라도 소환수가 그만큼 받는다.`);
console.log(`           버틸대수의 바닥은 «층이 깊어져도 안 변함(0%)» 이다 — 몸과 한 방이 같은 비로 자라면 그렇다.`);
console.log(`           기제 갈래(${기제.join("·")})의 바닥은 0 이라 문턱 25% 가 그대로 유효하다.`);

const 얕 = 줄[0], 깊 = 줄.at(-1);
if (얕 && 깊 && 얕.f !== 깊.f) {
  const 무너짐 = (얕.버틸 - 깊.버틸) / Math.max(0.01, 얕.버틸) * 100;
  console.log(`\n층 ${얕.f} → ${깊.f}: 버틸대수 ${얕.버틸} → ${깊.버틸} (${무너짐 >= 0 ? "-" : "+"}${Math.abs(무너짐).toFixed(0)}%)` +
              ` · 수명 ${얕.수명}초 → ${깊.수명}초 · 몸 ${얕.몸} → ${깊.몸} · 한 방 ${얕.한방} → ${깊.한방}`);
}
const 깊21 = 줄.find(r => r.f >= 21);
if (깊21 && Math.abs(깊21.수명 - D48_수명) > 4)
  흠.push(`③층${깊21.f} 수명 ${깊21.수명}초 가 D-48 의 ${D48_수명}초 에서 4초 넘게 벗어남 — 자를 먼저 의심한다`);

let 판정;
const 무너짐 = 얕 && 깊 && 얕.f !== 깊.f ? (얕.버틸 - 깊.버틸) / Math.max(0.01, 얕.버틸) * 100 : 0;
const 기 = 깊 ? Object.entries(깊.기제몫).sort((a, b) => b[1] - a[1])[0] : ["-", 0];
if (흠.length) 판정 = `판정 미룸 — 끝 조건이 깨졌다: ${흠.join(" · ")}`;
else if (무너짐 >= 40) 판정 = `㉠ 몸이 층을 안 따라간다 (버틸대수 ${무너짐.toFixed(0)}% 무너짐 · 바닥 0%) — 손잡이는 소환수 체력·방어의 성장 축`;
else if (깊 && 깊.소환수몫 >= 깊.균등바닥 + 5) 판정 = `㉡ 어그로가 소환수에 몰린다 (${깊.소환수몫}% · 균등 바닥 ${깊.균등바닥}%) — 손잡이는 적이 고르는 자리`;
else if (기[1] >= 25) 판정 = `㉢ 한 기제가 때린다 (${기[0]} ${기[1].toFixed(1)}% · 바닥 0%) — 그 수법의 값·주기가 손잡이`;
else if (깊 && 깊.melee >= 50) 판정 = `㉣ 평지의 이빨이다 (melee ${깊.melee}%) — 소환수 쪽 손잡이가 아니라 적 수·적 힘(D 로 넘긴다)`;
else { const 최 = [["버틸 무너짐", 무너짐], ["어그로 초과", 깊 ? 깊.소환수몫 - 깊.균등바닥 : 0], [`기제 ${기[0]}`, 기[1]]]
    .sort((a, b) => b[1] - a[1])[0];
  판정 = `㉤ 섞였다 — 제일 큰 것은 ${최[0]} ${(+최[1]).toFixed(1)} · 하나만 잡아선 안 선다`; }
console.log(`\n판정: ${판정}`);
if (깊) console.log(`곁가지: 죽음 하나당 깎인 몫 ${깊.죽음당깎임} 대 몸 ${깊.몸} — ` +
  (깊.죽음당깎임 > 깊.몸 * 1.3 ? `**넘치게 때린다**(한 방에 지워진다 — ㉠ 이 더 급하다)` : `갈아서 죽인다(넘침 작음)`));
if (깊) console.log(`곁가지: 갈래별 깎인 몫 — ` + Object.entries(깊.기제몫).filter(([, v]) => v >= 1)
  .map(([k, v]) => `${k} ${v.toFixed(1)}%`).join(" · ") + ` · melee ${깊.melee}%`);
console.log(`(수는 ${SRCS.join(" · ")})`);
