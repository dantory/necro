#!/bin/bash
# V-179 — `pebble` 을 V-178 이 낸 «꼴» 교훈으로 다시 굽는다.
#
# V-178 이 증명한 것: 밝기 손잡이(darker)로는 «흩뿌린 점»을 띠 안으로 못 넣는다.
#   어둡게 할수록 점 하나하나는 밝은 픽셀로 남아 봉우리−평균이 오히려 커진다.
#   고침은 조리법의 **꼴 낱말**이었다 — "pale"·"scattered"·"grit" 을 빼고
#   "one connected patch, darker in the middle" 로 말하니 한 판에 들어왔다.
#
# `pebble` 은 지금 조리법이 **정확히 그 실패꼴**이다:
#   "a faint scatter of fine grit and stone dust ... tiny specks, no volume"
#   → 봉우리 +16.2 (띠 +14 밖). 같은 처방을 그대로 옮긴다. ★ [[carry-fixes-forward]]
#
# 다만 `dust` 와 **같은 그림이 되면 안 된다** — dust 는 「번진 얼룩」이니
#   pebble 은 「바닥에 박힌 자갈이 뭉친 자국」으로 갈라 둔다(꼴은 뭉치되 결이 거칠게).
#
# grass·path·mud 는 **안 굽는다.** hs/ 에 마을이 없어 셋 다 화면에 안 나온다
#   (`DEC_IMG` 는 crypt 셋뿐, `DECOR_PRELOAD` 에만 이름이 있다).
#   화면에 없는 그림을 고치는 것이 ★ [[knob-that-does-nothing]] 이다 — 자에서 뺀다.
. "$(dirname "$0")/ab_guard.sh"
cd "$(dirname "$0")/.." || exit 1

PY=tools/pixellab/decal.py
cp "$PY" tmp/decal.py.v179bak

python3 - <<'PYEOF'
import pathlib
p = pathlib.Path("tools/pixellab/decal.py")
s = p.read_text()
old = ('  "pebble": (f"{BASE}, a faint scatter of fine grit and stone dust marking the flat floor, "\n'
       '             "tiny specks, no volume", 96, 80),')
new = ('  # ★ V-179 — V-178 이 dust 에서 낸 처방을 그대로 옮긴다. 여기 조리법이 정확히\n'
       '  #   그 실패꼴이었다("faint scatter ... tiny specks") — 봉우리 +16.2 로 띠 밖.\n'
       '  #   "faint"·"scatter"·"specks" 를 빼고 «뭉친 한 자국» 으로 말한다. dust 와\n'
       '  #   갈라 두려고 결만 거칠게 남긴다(dust 는 번진 것, pebble 은 박힌 것).\n'
       '  "pebble": (f"{BASE}, a dark patch of coarse gravel worn into the stone floor, "\n'
       '             "one connected patch with a rough grainy texture, "\n'
       '             "darker in the middle, fading softly at the edges", 96, 80),')
assert old in s, "pebble 조리법을 못 찾았다"
p.write_text(s.replace(old, new))
print("조리법 바꿈: pebble → 뭉친 자갈 자국")
PYEOF
[ $? -ne 0 ] && { echo "!! 조리법 수정 실패 — 중단"; exit 1; }

echo "=== 굽기: pebble @ darker=0.62 → assets/decalbake_v179 ==="
DECAL_OUT="decalbake_v179" python3 "$PY" pebble --maskbg --force --darker=0.62 2>&1

echo ""
echo "=== 자① 밝기(깃털 전) — 새 pebble ==="
python3 tools/hs_decalcheck.py assets/decalbake_v179 2>&1 | tail -6

echo ""
echo "=== 자② 꼴(깃털 전 — V-175 의 덫: 깃털이 comp 를 되돌린다) ==="
python3 tools/hs_decalshape.py assets/decalbake_v179 2>&1 | tail -6

echo ""
echo "=== 깃털 → assets/decalbake_v179_soft ==="
python3 tools/pixellab/decal_extract.py assets/decalbake_v179 2>&1 | tail -8

echo ""
echo "=== 자③ 밝기(깃털 후) — 화면 판정은 이것으로 한다 ==="
python3 tools/hs_decalcheck.py assets/decalbake_v179_soft 2>&1 | tail -6

echo ""
echo "=== 자④ 지금 살아 있는 판(회귀 확인) ==="
python3 tools/hs_decalcheck.py assets/decal 2>&1 | tail -10

echo ""
echo "=== 조리법 백업: tmp/decal.py.v179bak ==="
echo "DONE V-179 bake"
