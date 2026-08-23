#!/usr/bin/env bash
# ══ D-59 · 본 재기 — 끝 조건 그대로(100게임초 · 씨앗 1,3,5 · 21층) 실행을 갈라 두 번 ══ 2026-08-23
#   D-58 이 잰 A/A 바닥 3.80%p 와 **같은 자리를 같은 자로** 다시 잰다. 다른 것은 문 넷뿐이다
#   (__FIXEDDT · __gsampleOn · __AUTORETURN · __STOPFLOOR — docs/ROADMAP.md 「D-59」).
#   끝 조건(재기 «전»에 못박음): 여섯 판의 낮은몫5·끝층·죽음이 씨앗마다 **차 0**.
#   하나라도 갈리면 벽시계 자리가 또 남은 것이다 — 그것부터 찾는다.
. "$(dirname "$0")/ab_guard.sh"
cd /Users/lbs/source/personal/necro
node tools/chrome_guard.mjs || true
echo "══════ ㋐1 문 켬(__FIXEDDT=1/60) · 씨앗 1,3,5 · 21층 · 100게임초 (첫 실행) ══════"
D59_FIX=0.0166667 D46_OUT=tmp/d59_a1.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ ㋐2 같은 것을 다시(실행만 다르다 · A/A 짝) ══════"
D59_FIX=0.0166667 D46_OUT=tmp/d59_a2.json node tools/d46_forks.mjs 100 1,3,5 21 balance
echo "══════ 견주기 ══════"
python3 - <<'PY'
import json
a=json.load(open('tmp/d59_a1.json')); b=json.load(open('tmp/d59_a2.json'))
same = json.dumps(a,sort_keys=True,ensure_ascii=False)==json.dumps(b,sort_keys=True,ensure_ascii=False)
print("★ 차 0 — 두 실행이 한 바이트도 안 다르다" if same else "!! 갈렸다 — 벽시계 자리가 또 있다")
PY
echo "══════ 끝 ══════"
