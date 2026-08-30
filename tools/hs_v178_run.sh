#!/bin/bash
# V-178 — `dust` 를 «밝기»가 아니라 «꼴»로 고쳐 굽는다.
# V-176 이 증명: 배경 어둡기(darker) 한 손잡이로는 평균과 봉우리를 같이 못 잡는다.
#   dust 가 「흩뿌린 점」이라 어둡게 할수록 속 대비가 오히려 커진다(13.5 → 24.7).
# 그래서 통과한 `stain`(뭉친 덩어리)의 꼴로 말을 바꾸고, 배경은 0.62 에서 출발한다.
# 곁들여 `pebble`·`grass` 도 같은 자에 걸리는지 화면 밖 자로 확인한다(V-176 남은 항목).
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1

PY=tools/pixellab/decal.py
cp "$PY" tmp/decal.py.v178bak

# ── 꼴을 바꾼다: "pale ... scattered" (점 뿌리기) → stain 처럼 «뭉친 덩어리»
python3 - <<'PYEOF'
import re, pathlib
p = pathlib.Path("tools/pixellab/decal.py")
s = p.read_text()
old = '"dust":   (f"{BASE}, a patch of pale grey dust and grit scattered on a stone floor", 96, 96),'
new = ('  # ★ V-178 — V-176 이 밝기 손잡이로 두 판을 태우고 낸 결론: dust 는 «흩뿌린 점»이라\n'
       '  #   어둡게 할수록 속 대비가 커져 밝기 축으로는 영영 안 들어온다. 통과한 `stain` 과\n'
       '  #   같은 «뭉친 덩어리» 꼴로 말한다 — "pale"·"scattered"·"grit" 을 전부 뺐다.\n'
       '  "dust":   (f"{BASE}, a soft dark smudge of settled dust ground into the stone, "\n'
       '             "one connected patch, darker in the middle, fading softly at the edges", 96, 96),')
assert old in s, "dust 조리법을 못 찾았다"
s = s.replace("  " + old, new)
p.write_text(s)
print("조리법 바꿈: dust → 뭉친 덩어리")
PYEOF
[ $? -ne 0 ] && { echo "!! 조리법 수정 실패 — 중단"; exit 1; }

echo "=== 굽기: dust @ darker=0.62 → assets/decalbake_v178 ==="
DECAL_OUT="decalbake_v178" python3 "$PY" dust --maskbg --force --darker=0.62 2>&1

echo "=== 자: 새 dust ==="
python3 tools/hs_decalcheck.py assets/decalbake_v178 2>&1 | tail -6

echo "=== 자: 지금 살아 있는 판(회귀 확인) ==="
python3 tools/hs_decalcheck.py assets/decal 2>&1 | tail -8

# 조리법은 되돌리지 않는다 — 통과하면 그대로 쓰고, 떨어지면 다음 판의 출발점이다.
echo "=== 조리법 백업: tmp/decal.py.v178bak ==="
echo "DONE V-178 bake"
