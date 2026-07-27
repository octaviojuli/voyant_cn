#!/usr/bin/env bash
# 部署/更新脚本(以 voyant 用户在 ECS 上执行;CI 也调用它)。
# 用法: bash deploy/ecs/deploy.sh [--skip-pull] [--seed-zh] [--prebuilt]
# --prebuilt: node_modules 与 dist 已由 CI 构建并同步到本机,跳过安装与构建。
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/voyant/app}"
NODE_BIN="${NODE_BIN:-/opt/voyant/node24/bin}"
export PATH="$NODE_BIN:$PATH"
cd "$APP_DIR"

# 部署过程中的可复用函数(可被测试单独加载)。
# shellcheck source=deploy/ecs/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

SKIP_PULL=false
SEED_ZH=false
PREBUILT=false
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=true ;;
    --seed-zh) SEED_ZH=true ;;
    --prebuilt) PREBUILT=true ;;
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
# 首次启动的容器会先 initdb 并拉起一个仅限内部的临时服务,pg_isready 在该窗口会误报就绪;
# 要求 TCP 探测连续 3 次通过,确保正式服务已监听 127.0.0.1:5432。
ready=0
for i in $(seq 1 90); do
  if docker exec voyant-postgres pg_isready -h 127.0.0.1 -U voyant -d voyant &>/dev/null; then
    ready=$((ready + 1))
    [ "$ready" -ge 3 ] && break
  else
    ready=0
  fi
  sleep 2
done
[ "$ready" -ge 3 ] || { echo "!! PostgreSQL 未在预期时间内就绪"; docker logs voyant-postgres --tail 30; exit 1; }

if [ "$PREBUILT" = false ]; then
  echo "[$(date +%H:%M:%S)] ==> 安装依赖(npmmirror)"
  pnpm config set registry https://registry.npmmirror.com
  HUSKY=0 pnpm install --frozen-lockfile

  echo "[$(date +%H:%M:%S)] ==> 构建 operator 应用"
  cd starters/operator
  NODE_OPTIONS="--import tsx --max-old-space-size=8192" npx voyant build
else
  echo "[$(date +%H:%M:%S)] ==> 预构建模式:跳过安装与构建"
  cd starters/operator
fi

# 迁移执行器从部署处解析各模块包,但部分包(db/availability 等)只是传递
# 依赖,新装环境的 node_modules 里够不到。按迁移计划补齐工作区符号链接:
# 只影响 voyant migrate 的解析,不改变应用运行时的模块图。
echo "[$(date +%H:%M:%S)] ==> 校验迁移计划包的可解析性"
node - <<'LINKEOF'
const fs = require("fs"), path = require("path")
const planPath = path.join(".voyant", "migration-plan.generated.json")
if (!fs.existsSync(planPath)) { console.log("(无迁移计划文件,跳过)"); process.exit(0) }
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"))
const migrations = Array.isArray(plan) ? plan : plan.migrations ?? []
fs.mkdirSync(path.join("node_modules", "@voyant-travel"), { recursive: true })
for (const m of migrations) {
  const src = m && m.source
  if (!src || src.kind !== "package" || typeof src.packageName !== "string") continue
  const short = src.packageName.split("/")[1]
  if (!short) continue
  const linkPath = path.join("node_modules", "@voyant-travel", short)
  if (fs.existsSync(linkPath)) continue
  if (!fs.existsSync(path.join("..", "..", "packages", short, "package.json"))) continue
  fs.symlinkSync(path.join("..", "..", "..", "..", "packages", short), linkPath)
  console.log("  linked", src.packageName)
}
LINKEOF

# 上传的图片/PDF 存在磁盘上,目录必须落在 APP_DIR 之外——部署会对仓库做
# git reset --hard,放在仓库内的文件每次发布都会被清掉。缺少该配置时应用会
# 直接拒绝启动(宁可启动失败,也不要静默写到会被清空的位置)。
STORAGE_ROOT="${STORAGE_ROOT:-/opt/voyant/storage}"
ENV_FILE="$APP_DIR/starters/operator/.env"
mkdir -p "$STORAGE_ROOT/media" "$STORAGE_ROOT/documents"
if ! grep -q '^STORAGE_FILESYSTEM_ROOT=' "$ENV_FILE" 2>/dev/null; then
  echo "[$(date +%H:%M:%S)] ==> 写入 STORAGE_FILESYSTEM_ROOT=$STORAGE_ROOT"
  printf '\nSTORAGE_FILESYSTEM_ROOT="%s"\n' "$STORAGE_ROOT" >> "$ENV_FILE"
fi

echo "[$(date +%H:%M:%S)] ==> 执行数据库迁移"
migrated=false
for i in 1 2 3; do
  if NODE_OPTIONS="--import tsx" pnpm db:migrate; then
    migrated=true
    break
  fi
  echo "[$(date +%H:%M:%S)] 迁移失败,10 秒后重试($i/3)"
  sleep 10
done
[ "$migrated" = true ]

# 种子完成与否用独立哨兵跟踪:上次部署若没种上,后续部署自动补种。
SEED_MARKER=/opt/voyant/.seed-done
if [ "$SEED_ZH" = true ] || [ ! -f "$SEED_MARKER" ]; then
  echo "[$(date +%H:%M:%S)] ==> 灌入示例数据(基线 + 中文)"
  cd "$APP_DIR/examples/operator-demo"
  set -a; . "$APP_DIR/starters/operator/.env"; set +a
  # 种子走源码解析(与运行时同款条件),避免解析到未构建的 dist
  if NODE_OPTIONS="--import tsx --conditions=development" pnpm seed -- --confirm \
    && NODE_OPTIONS="--import tsx --conditions=development" pnpm seed:zh-cn -- --confirm; then
    touch "$SEED_MARKER"
    echo "[$(date +%H:%M:%S)] ==> 示例数据灌入完成"
  else
    echo "!! 示例数据灌入失败(不阻断部署,下次部署将自动重试)"
  fi
  cd "$APP_DIR/starters/operator"
fi

echo "[$(date +%H:%M:%S)] ==> 预检:在旁路端口 $PREFLIGHT_PORT 启动新构建"
if ! preflight_boot; then
  exit 1
fi
echo "[$(date +%H:%M:%S)] ==> 预检通过"
cd "$APP_DIR/starters/operator"

echo "[$(date +%H:%M:%S)] ==> 重启服务并做健康检查"
sudo systemctl restart voyant-operator
if ! wait_healthy "$SERVICE_PORT" 30; then
  echo "!! 健康检查失败,最近日志:"
  sudo journalctl -u voyant-operator -n 50 --no-pager
  if restore_last_good; then
    echo "!! 已回滚到上一个可用版本,站点恢复服务;本次部署未生效。"
  else
    echo "!! 回滚亦失败,站点当前不可用。"
  fi
  exit 1
fi
save_last_good
echo "==> 部署成功:healthz OK"

# 首页初始化探针:在服务器本机以演示账号走一遍 setup/initialize,
# 失败时当场输出服务日志,便于远程定位(演示口令为公开种子数据)。
D=$(sed -n 's|^DASH_BASE_URL="https\?://\([^"]*\)"|\1|p' "$ENV_FILE" | head -1)
if [ -n "$D" ]; then
  JAR=$(mktemp)
  curl -s -c "$JAR" -o /dev/null -w "[probe] signin:%{http_code}\n" \
    -X POST "http://127.0.0.1:$SERVICE_PORT/api/auth/sign-in/email" \
    -H "Host: $D" -H "Origin: https://$D" -H "Content-Type: application/json" \
    -d '{"email":"owner@voyant.dev","password":"password123"}' || true
  curl -s -b "$JAR" -w "\n[probe] initialize:%{http_code}\n" \
    -X POST "http://127.0.0.1:$SERVICE_PORT/api/v1/admin/setup/initialize" \
    -H "Host: $D" -H "Origin: https://$D" -H "Content-Type: application/json" \
    -d '{"stepIds":[],"fresh":true}' | head -c 400 || true
  echo "[probe] 最近服务日志:"
  sudo journalctl -u voyant-operator -n 40 --no-pager | tail -40 || true
  rm -f "$JAR"
fi
exit 0
