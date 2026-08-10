/* ══════════════════════════════════════════════════════════════
   **스킬 트리 창** — 병수님: "내가 직접 스킬트리를 찍어서 나만의 빌드를 구성하는거지"
   ──────────────────────────────────────────────────────────────
   디아블로 2 의 그 화면이 좋은 이유는 표가 아니라 **그림**이기 때문이다:

     · 세 줄기가 **나란히** 서 있어 「어디로 팔지」가 한눈에 보인다
     · 위에서 아래로 **선이 이어져** 무엇이 무엇을 여는지 보인다
     · 못 찍는 것은 어둡되 **사라지지 않는다** — 앞날이 보여야 계획을 세운다
     · 찍은 칸에는 **랭크 숫자**가 박힌다. 숫자가 늘어나는 맛이 여기 있다

   그래서 목록이 아니라 **판**으로 그린다. 상인·대장간과 같은 결(칸 + 툴팁)이되,
   칸이 격자가 아니라 **줄기**로 서 있는 것만 다르다.
   ══════════════════════════════════════════════════════════ */
import { $, META, TREE, nodeOf, rank, spLeft, spTotal, spUsed, take, takeWhy } from "./core.js";

let pick = "bone";                 // 고른 칸

/** 판을 다시 그린다. **상태에서 통째로 뽑는다** — 부분 갱신은 어긋날 자리를 만든다. */
export function drawTree() {
  $("treeCols").innerHTML = TREE.map((col) => {
    const cells = col.nodes.map((nd, i) => {
      const r = rank(nd.id), why = takeWhy(nd.id);
      /* 상태는 셋뿐이다: **찍음 / 찍을 수 있음 / 아직**. 색으로 갈라야 한눈에 읽힌다. */
      const cls = r >= nd.max ? "full" : r > 0 ? "some" : why ? "lock" : "open";
      /* 잇는 선은 **선행을 찍었을 때 불이 들어온다** — 어디까지 길이 뚫렸는지가
         글자를 읽지 않아도 보인다. */
      const lit = i && rank(col.nodes[i - 1].id) > 0 ? " lit" : "";
      return `${i ? `<div class="tLink${lit}"></div>` : ""}
        <div class="tNode ${cls}${nd.id === pick ? " sel" : ""}${nd.big ? " big" : ""}"
             data-tn="${nd.id}">
          <span class="tn">${nd.n}</span>
          <span class="tr">${r}<i>/${nd.max}</i></span>
        </div>`;
    }).join("");
    return `<div class="tCol"><h3>${col.n}</h3>${cells}</div>`;
  }).join("");

  /* 툴팁 — 고른 칸이 **지금 무엇을 주고 있고 한 점 더 넣으면 무엇이 되는지.**
     「+10%」만 적으면 지금 몇 %인지를 사람이 암산해야 한다. */
  const nd = nodeOf(pick), r = rank(pick), why = takeWhy(pick);
  const maxed = r >= nd.max;
  $("treeTip").innerHTML =
    `<div class="tipName ${maxed ? "t4" : r ? "t2" : "t0"}">${nd.n}
       <span class="lv">${r}/${nd.max}</span></div>
     <div class="tipKind">요구 레벨 ${nd.lv}${nd.req ? ` · 선행 ${nodeOf(nd.req).n}` : ""}</div>
     <div class="tipStat">${nd.d}</div>` +
    (maxed
      ? `<div class="tipNote">끝까지 찍었다</div>`
      : `<div class="tipBuy"><span class="cost${why ? " no" : ""}">${why || "점수 1"}</span>
           <button class="btn" data-tk="${pick}" ${why ? "disabled" : ""}>찍기</button></div>`);

  $("treeSp").textContent = spLeft();
  $("treeSpAll").textContent = `${spUsed()}/${spTotal()}`;
}

/** 남은 점수가 있으면 **레벨 옆에 점**을 띄운다 — 창을 안 열어도 알 수 있어야
 *  「찍을 게 생겼다」가 전달된다(안 그러면 레벨업이 아무 일도 아닌 게 된다). */
let lastSp = -1;
export function markSp() {
  const n = spLeft();
  if (n === lastSp) return;                 // **바뀔 때만** 손댄다 — hud 는 매 프레임 돈다
  lastSp = n;
  const el = $("spDot"); if (!el) return;
  el.classList.toggle("on", n > 0);
  el.textContent = n > 0 ? n : "";
}

document.addEventListener("click", (e) => {
  const n = e.target.closest && e.target.closest("[data-tn]");
  if (n) { pick = n.getAttribute("data-tn"); drawTree(); return; }
  const tk = e.target.getAttribute && e.target.getAttribute("data-tk");
  if (tk && take(tk)) { drawTree(); markSp(); document.dispatchEvent(new Event("treeChanged")); }
});
