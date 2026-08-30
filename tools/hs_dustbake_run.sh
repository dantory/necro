#!/bin/bash
# V-176 — `dust` 를 «봉우리» 띠 안으로 다시 굽는다. 두 어둡기를 나란히 굽고 자로 고른다.
# 낱말로 겨누지 않는다(V-172~175 가 여섯 판으로 증명) — 배경을 내려 결과를 끌어내린다.
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1
for D in 0.78 0.62; do
  OUT="decalbake_dark${D/./}"
  echo "=== dust @ darker=$D → assets/$OUT ==="
  DECAL_OUT="$OUT" python3 tools/pixellab/decal.py dust --maskbg --force --darker=$D 2>&1
done
echo "=== 자 ==="
for D in 0.78 0.62; do
  OUT="decalbake_dark${D/./}"
  echo "--- $OUT ---"
  python3 tools/hs_decalcheck.py "assets/$OUT" 2>&1 | tail -5
done
