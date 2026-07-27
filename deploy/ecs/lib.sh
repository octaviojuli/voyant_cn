#!/usr/bin/env bash
# 部署辅助函数。由 deploy.sh 加载,也由 lib.test.sh 单独加载用于测试。
# 调用方需先定义: APP_DIR、NODE_BIN。

# /healthz 是免鉴权的存活探针。注意不要探 /api/healthz——它需要鉴权,
# 未登录时返回 401,会被误读成"服务没起来"。
HEALTH_PATH="${HEALTH_PATH:-/healthz}"
SERVICE_PORT="${SERVICE_PORT:-8080}"
# 预检用的旁路端口:新构建先在这里启动自检,通过后才动线上服务。
PREFLIGHT_PORT="${PREFLIGHT_PORT:-8099}"
RELEASES_DIR="${RELEASES_DIR:-/opt/voyant/releases}"
LAST_GOOD="$RELEASES_DIR/last-good"
ENV_FILE="$APP_DIR/starters/operator/.env"

wait_healthy() { # <port> <次数>
  for _ in $(seq 1 "$2"); do
    curl -sf -o /dev/null "http://127.0.0.1:$1$HEALTH_PATH" && return 0
    sleep 2
  done
  return 1
}

# 用真实 .env 在旁路端口把新构建启起来。启不来就直接中止部署,线上服务
# 分毫未动,继续对外提供服务。配置缺失、提供方不被运行时接受、依赖装错
# 这几类问题都会在这里暴露,而不是等到线上已经被重启之后。
preflight_boot() {
  local log pid rc=1
  log=$(mktemp)
  cd "$APP_DIR/starters/operator"

  # 在子 shell 内加载 .env,避免把部署无关的变量泄漏进本脚本后续步骤。
  (
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    export PORT="$PREFLIGHT_PORT"
    export NODE_OPTIONS="--conditions=development --max-old-space-size=4096"
    exec "$NODE_BIN/node" dist/server/server.js
  ) >"$log" 2>&1 &
  pid=$!

  for _ in $(seq 1 45); do
    # 进程已退出说明启动失败,无须再等满超时。
    kill -0 "$pid" 2>/dev/null || break
    if curl -sf -o /dev/null "http://127.0.0.1:$PREFLIGHT_PORT$HEALTH_PATH"; then
      rc=0
      break
    fi
    sleep 2
  done

  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true

  if [ "$rc" -ne 0 ]; then
    echo "!! 预检失败:新构建无法启动。线上服务未被改动,仍在正常提供服务。"
    echo "   新构建的启动日志(末 40 行):"
    tail -40 "$log"
  fi
  rm -f "$log"
  return "$rc"
}

# 部署成功后留存"最后可用版本",供下次失败时回滚。构建产物约 40 MB。
save_last_good() {
  cd "$APP_DIR/starters/operator"
  mkdir -p "$RELEASES_DIR"
  rm -rf "$LAST_GOOD.tmp"
  mkdir -p "$LAST_GOOD.tmp"
  cp -a dist "$LAST_GOOD.tmp/dist"
  [ -d .voyant ] && cp -a .voyant "$LAST_GOOD.tmp/.voyant"
  git -C "$APP_DIR" rev-parse HEAD >"$LAST_GOOD.tmp/COMMIT" 2>/dev/null || true
  rm -rf "$LAST_GOOD"
  mv "$LAST_GOOD.tmp" "$LAST_GOOD"
}

# 回滚只还原代码产物,不回滚数据库——迁移是只进不退的。若某次部署的迁移
# 与上一版构建不兼容,回滚救不了,只能向前修复。
restore_last_good() {
  [ -d "$LAST_GOOD/dist" ] || { echo "!! 无可回滚的版本(首次部署?)"; return 1; }
  cd "$APP_DIR/starters/operator"
  echo "==> 回滚到上一个可用版本 $(cat "$LAST_GOOD/COMMIT" 2>/dev/null | cut -c1-8)"
  rm -rf dist .voyant
  cp -a "$LAST_GOOD/dist" dist
  [ -d "$LAST_GOOD/.voyant" ] && cp -a "$LAST_GOOD/.voyant" .voyant
  sudo systemctl restart voyant-operator
  wait_healthy "$SERVICE_PORT" 30
}
