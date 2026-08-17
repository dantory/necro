#!/bin/bash
# merge(㉢) 를 켠 뒤 시체 포화가 「절반 아래」로 내려왔는지 다시 잰다.
# 06:5x 에 이 자는 「옳게 울고 있었다」로 남았고, 그 뿌리(비례해 무는 값)를
# 11:3x 에 merge 로 손봤다 — 그러니 같은 자로 다시 잰다.
set -u
cd "$(dirname "$0")/.."
node tools/chrome_guard.mjs || true
node tools/corpse_probe.mjs 12 1,3,9,13 tmp/corpse_merge.json
