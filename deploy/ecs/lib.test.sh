#!/usr/bin/env bash
# deploy/ecs/lib.sh 的测试。用假的 node 与假的 systemctl 跑通三条关键路径:
# 预检拦截启不来的构建、成功后留存可回滚版本、健康检查失败时自动回滚。
#
# 运行: bash deploy/ecs/lib.test.sh
set -uo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
# 各用例跑在子 shell 里,计数写文件累计,否则加出来的数回不到父进程。
TALLY=$(mktemp)

check() { # <描述> <期望> <实际>
  if [ "$2" = "$3" ]; then
    printf '  ok   %s\n' "$1"
    printf 'P\n' >>"$TALLY"
  else
    printf '  FAIL %s (期望 %s,实际 %s)\n' "$1" "$2" "$3"
    printf 'F\n' >>"$TALLY"
  fi
}

# 搭一个最小的部署目录:starters/operator/{dist,.voyant,.env} + 假 node/systemctl。
setup_fixture() { # <模式: healthy|crash>
  FIX=$(mktemp -d)
  export APP_DIR="$FIX/app"
  export NODE_BIN="$FIX/bin"
  export RELEASES_DIR="$FIX/releases"
  export PREFLIGHT_PORT=$((20000 + RANDOM % 20000))
  export SERVICE_PORT="$PREFLIGHT_PORT"
  mkdir -p "$APP_DIR/starters/operator/dist/server" "$APP_DIR/starters/operator/.voyant" "$NODE_BIN"
  echo 'DASH_BASE_URL="https://example.test"' >"$APP_DIR/starters/operator/.env"
  echo "第 1 版" >"$APP_DIR/starters/operator/dist/server/server.js"
  echo "产物 v1" >"$APP_DIR/starters/operator/.voyant/marker.txt"

  # 假 node:healthy 模式监听端口并对 /healthz 回 200;crash 模式直接退出 1。
  if [ "$1" = "healthy" ]; then
    cat >"$NODE_BIN/node" <<EOF
#!/usr/bin/env bash
exec python3 -c '
import http.server, os, sys
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200 if self.path == "/healthz" else 404)
        self.end_headers()
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(os.environ["PORT"])), H).serve_forever()
'
EOF
  else
    cat >"$NODE_BIN/node" <<'EOF'
#!/usr/bin/env bash
echo "Error: deployment graph providers.storage=filesystem is not supported" >&2
exit 1
EOF
  fi
  chmod +x "$NODE_BIN/node"

  # 假 sudo/systemctl:重启时记录当前 dist 的版本号,并真的把假服务拉起来,
  # 这样 restore_last_good 里的健康检查才是在检真实的监听端口。
  cat >"$NODE_BIN/sudo" <<EOF
#!/usr/bin/env bash
if [ "\$1" = "systemctl" ]; then
  cat "$APP_DIR/starters/operator/dist/server/server.js" >"$FIX/SERVED"
  [ -f "$FIX/server.pid" ] && kill "\$(cat "$FIX/server.pid")" 2>/dev/null
  PORT="$SERVICE_PORT" "$NODE_BIN/node" >/dev/null 2>&1 &
  echo \$! >"$FIX/server.pid"
fi
exit 0
EOF
  chmod +x "$NODE_BIN/sudo"
  export PATH="$NODE_BIN:$PATH"

  # shellcheck source=deploy/ecs/lib.sh
  . "$ROOT/deploy/ecs/lib.sh"
}

teardown() {
  [ -f "$FIX/server.pid" ] && kill "$(cat "$FIX/server.pid")" 2>/dev/null
  rm -rf "$FIX"
}

echo "预检:新构建起不来时应拦下,且不碰线上服务"
(
  setup_fixture crash
  out=$(preflight_boot 2>&1)
  rc=$?
  check "预检返回失败" "1" "$rc"
  case "$out" in
    *"线上服务未被改动"*) check "提示线上未受影响" "yes" "yes" ;;
    *) check "提示线上未受影响" "yes" "no" ;;
  esac
  case "$out" in
    *"not supported"*) check "输出新构建的启动日志" "yes" "yes" ;;
    *) check "输出新构建的启动日志" "yes" "no" ;;
  esac
  teardown
)

echo "预检:新构建能起来时应通过,且不残留进程"
(
  setup_fixture healthy
  preflight_boot >/dev/null 2>&1
  check "预检返回成功" "0" "$?"
  sleep 1
  if curl -sf -o /dev/null "http://127.0.0.1:$PREFLIGHT_PORT/healthz"; then
    check "预检进程已退出" "stopped" "still-running"
  else
    check "预检进程已退出" "stopped" "stopped"
  fi
  teardown
)

echo "回滚:失败时应还原上一个可用版本"
(
  setup_fixture healthy
  save_last_good
  check "留存了可回滚版本" "yes" "$([ -f "$RELEASES_DIR/last-good/dist/server/server.js" ] && echo yes || echo no)"

  # 模拟新版本已覆盖产物,且该版本有问题。
  echo "第 2 版" >"$APP_DIR/starters/operator/dist/server/server.js"
  echo "产物 v2" >"$APP_DIR/starters/operator/.voyant/marker.txt"

  restore_last_good >/dev/null 2>&1
  check "回滚后健康检查通过" "0" "$?"
  check "dist 已还原" "第 1 版" "$(cat "$APP_DIR/starters/operator/dist/server/server.js")"
  check "生成产物一并还原" "产物 v1" "$(cat "$APP_DIR/starters/operator/.voyant/marker.txt")"
  check "服务确实以旧版本重启" "第 1 版" "$(cat "$FIX/SERVED")"
  teardown
)

echo "回滚:没有可回滚版本时应明确报错而非静默成功"
(
  setup_fixture healthy
  out=$(restore_last_good 2>&1)
  rc=$?
  check "返回失败" "1" "$rc"
  case "$out" in
    *"无可回滚的版本"*) check "说明原因" "yes" "yes" ;;
    *) check "说明原因" "yes" "no" ;;
  esac
  teardown
)

PASS=$(grep -c '^P$' "$TALLY" || true)
FAIL=$(grep -c '^F$' "$TALLY" || true)
rm -f "$TALLY"
echo
echo "通过 $PASS,失败 $FAIL"
[ "$FAIL" -eq 0 ]
