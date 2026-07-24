#!/usr/bin/env bash
# 部署/更新脚本(以 voyant 用户在 ECS 上执行;CI 也调用它)。
# 用法: bash deploy/ecs/deploy.sh [--skip-pull] [--seed-zh]
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/voyant/app}"
NODE_BIN="${NODE_BIN:-/opt/voyant/node24/bin}"
export PATH="$NODE_BIN:$PATH"
cd "$APP_DIR"

SKIP_PULL=false
SEED_ZH=false
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=true ;;
    --seed-zh) SEED_ZH=true ;;
  esac
done

if [ "$SKIP_PULL" = false ]; then
  echo "==> 拉取最新 main"
  # GitHub 直连不稳时,可提前执行:
  #   git remote set-url origin https://ghproxy.net/https://github.com/<owner>/<repo>.git
  for i in 1 2 3 4; do
    git fetch origin main && break || { echo "fetch 重试 $i..."; sleep $((2 ** i)); }
  done
  git checkout main
  git reset --hard origin/main
fi

echo "[$(date +%H:%M:%S)] ==> 启动/确认 PostgreSQL"
docker compose -f deploy/ecs/docker-compose.postgres.yml --env-file deploy/ecs/.env up -d
until docker exec voyant-postgres pg_isready -U voyant -d voyant &>/dev/null; do sleep 2; done

echo "[$(date +%H:%M:%S)] ==> 安装依赖(npmmirror)"
pnpm config set registry https://registry.npmmirror.com
HUSKY=0 pnpm install --frozen-lockfile

echo "[$(date +%H:%M:%S)] ==> 构建 operator 应用"
cd starters/operator
NODE_OPTIONS="--import tsx --max-old-space-size=8192" npx voyant build

echo "[$(date +%H:%M:%S)] ==> 执行数据库迁移"
NODE_OPTIONS="--import tsx" pnpm db:migrate

if [ "$SEED_ZH" = true ]; then
  echo "==> 灌入示例数据(基线 + 中文)"
  cd "$APP_DIR/examples/operator-demo"
  set -a; . "$APP_DIR/starters/operator/.env"; set +a
  NODE_OPTIONS="--import tsx" pnpm seed -- --confirm || true
  NODE_OPTIONS="--import tsx" pnpm seed:zh-cn -- --confirm || true
  cd "$APP_DIR/starters/operator"
fi

echo "[$(date +%H:%M:%S)] ==> 重启服务并做健康检查"
sudo systemctl restart voyant-operator
for i in $(seq 1 30); do
  if curl -sf -o /dev/null http://127.0.0.1:8080/healthz; then
    echo "==> 部署成功:healthz OK"
    exit 0
  fi
  sleep 2
done
echo "!! 健康检查失败,最近日志:"
sudo journalctl -u voyant-operator -n 50 --no-pager
exit 1
