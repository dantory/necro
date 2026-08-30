// ── V-182 — 격자 가방의 «순수» 셈 ────────────────────────────────────────────
// V-181 은 p.bag 을 그냥 배열로 쌓았다(자리 개념 0). D2 는 격자이고 물건마다 칸을
// 차지한다. 그 담기·비우기·착용 셈을 여기 «DOM 없이» 둔다 — main.js 의 창은 이 함수를
// 부르기만 하고, tools/hs_v182_bagcheck.mjs 가 브라우저 없이 같은 함수를 두들겨 잰다.

export const GRID_COLS = 10, GRID_ROWS = 4;

// 슬롯별 칸 크기 [w,h] — 무기·갑옷은 크고, 반지·부적은 한 칸(D2 결).
export const SLOT_SIZE = {
  weapon: [2, 3], armor: [2, 3], helm: [2, 2], gloves: [2, 2], boots: [2, 2], ring: [1, 1], amulet: [1, 1],
};
export function itemSize(it) { return SLOT_SIZE[it && it.slot] || [1, 1]; }

// ── 담기 — 왼쪽 위부터 훑어 «빈 사각»에 놓는다(겹치면 안 된다) ──────────────────
// bag(순서 있는 배열)를 격자에 편다. 들어간 것은 placements, 자리가 없어 넘친 것은
// overflow 로 돌려준다. 놓는 규칙: 행을 위에서, 각 행은 왼쪽에서 — 처음 맞는 자리.
export function layoutBag(bag, cols = GRID_COLS, rows = GRID_ROWS) {
  const occ = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const placements = [], overflow = [];
  for (const it of bag) {
    const [w, h] = itemSize(it);
    let put = null;
    for (let r = 0; r + h <= rows && !put; r++) {
      for (let c = 0; c + w <= cols && !put; c++) {
        let free = true;
        for (let dr = 0; dr < h && free; dr++)
          for (let dc = 0; dc < w; dc++) if (occ[r + dr][c + dc]) { free = false; break; }
        if (free) put = { item: it, col: c, row: r, w, h };
      }
    }
    if (put) {
      for (let dr = 0; dr < put.h; dr++) for (let dc = 0; dc < put.w; dc++) occ[put.row + dr][put.col + dc] = true;
      placements.push(put);
    } else overflow.push(it);
  }
  return { placements, overflow };
}

// bag 에 newItem 을 더 넣어도 «전부» 자리가 잡히나(꽉 찬 판정).
export function bagFits(bag, newItem, cols = GRID_COLS, rows = GRID_ROWS) {
  return layoutBag([...bag, newItem], cols, rows).overflow.length === 0;
}

// 격자가 실제로 쓰는 칸 수(겹침 없으면 = Σ w·h). 누수 시험이 이 값을 견준다.
export function usedCells(bag, cols = GRID_COLS, rows = GRID_ROWS) {
  const occ = layoutBag(bag, cols, rows).placements;
  let n = 0; for (const p of occ) n += p.w * p.h; return n;
}

// ── 착용·해제 — «자료»만 옮긴다(스탯 계산은 main.js 의 recalc 한 문이 맡는다) ────
// gear 를 가방에서 빼 그 슬롯에 끼운다. 같은 슬롯에 있던 것은 가방으로 되돌린다.
// 되돌리는 물건은 gear 와 같은 슬롯 = 같은 칸 크기라 gear 가 있던 자리에 반드시 들어간다.
export function equipOp(bag, equipped, gear) {
  const i = bag.indexOf(gear);
  if (i < 0) return false;
  bag.splice(i, 1);
  const prev = equipped[gear.slot] || null;
  equipped[gear.slot] = gear;
  if (prev) bag.push(prev);
  return true;
}

// slot 의 물건을 벗어 가방으로. 가방에 자리가 없으면 거부(false).
export function unequipOp(bag, equipped, slot, cols = GRID_COLS, rows = GRID_ROWS) {
  const it = equipped[slot];
  if (!it) return false;
  if (!bagFits(bag, it, cols, rows)) return false;
  equipped[slot] = null;
  bag.push(it);
  return true;
}
