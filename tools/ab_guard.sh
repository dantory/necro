#!/usr/bin/env bash
# ── 긴 측정은 **저절로 떨어져 나간다** ──────────────────────────────────────
#
# 병수님이 「⚠️ Heartbeat check failed」를 오늘만 여러 번 봤다. 원인은 늘 같다 —
# 감시가 하트비트 턴 **안에서** A/B 를 통째로 돌려 600초 상한에 잘린다.
# 08:52 에 AGENTS.md 에 「하트비트 턴에서 긴 일을 하지 않는다」라고 적었는데,
# 그 뒤로도 **네 번 더 잘렸다**(로그의 600s 타임아웃 누계 14 → 18).
# 글로 적은 규칙은 안 지켜졌다. 그래서 **기계로** 막는다.
#
# 쓰는 법 — 긴 스크립트 맨 위에 이 한 줄:
#     . "$(dirname "$0")/ab_guard.sh"
# 그러면 그 스크립트는 자기 자신을 detached 로 다시 띄우고 **즉시 돌아온다**.
# 로그와 `.done` 마커 경로를 찍어 주므로 다음 깨우기가 그걸 보고 이어받는다.
# 정말로 이 자리에서 기다려야 할 때만 `AB_INLINE=1` 을 붙인다(사람이 보고 있을 때).

if [ -z "$AB_INLINE" ] && [ -z "$AB_CHILD" ]; then
  _name="$(basename "$0" .sh)"
  _log="/Users/lbs/.openclaw/workspace/tmp/necro_${_name}.log"
  AB_CHILD=1 python3 /Users/lbs/.openclaw/workspace/tools/run_detached.py \
    "$_log" env AB_CHILD=1 bash "$0" "$@"
  echo "── 떨어져 나갔다(detached) ──"
  echo "  로그   : $_log"
  echo "  끝나면 : ${_log}.done  (내용이 종료 코드)"
  echo "  이 턴은 여기서 끝낸다 — 다음 깨우기가 마커를 보고 이어받는다."
  exit 0
fi
