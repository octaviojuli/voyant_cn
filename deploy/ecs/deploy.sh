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

# 宣传册走 HTML → PDF,需要一个本机无头浏览器。装在 APP_DIR 之外,理由与
# 存储目录相同:部署会对仓库做 git reset --hard。
#
# 这一步**失败不阻断部署**。装不上只是宣传册回落到内置的纯文本排版,册子
# 难看但功能仍在;为了一个可选的排版能力把整次发布卡住是本末倒置。
BROWSERS_ROOT="${BROWSERS_ROOT:-/opt/voyant/browsers}"
mkdir -p "$BROWSERS_ROOT"

# 系统库与浏览器本体分开装,顺序也不能反。
#
# 原先一句 `playwright install --with-deps chromium` 走不通:`--with-deps`
# 内部会 `sudo apt-get`,而这个脚本是经 SSH 以 voyant 用户跑的,没有 TTY,
# 免密 sudo 也只开给了 systemctl/journalctl —— playwright 提权失败即整体退出,
# **连浏览器本体都没下**。实测日志:「sudo: a password is required / Failed to
# install browsers」。
#
# 因此:先用 `sudo -n` 试着装系统库(装不上就算了,不追问密码),再单独下载
# 浏览器本体(纯下载,不需要任何权限)。
# 逐个装,不打包成一条 apt-get:Ubuntu 24.04 把若干包改名带了 t64 后缀
# (libasound2t64 等),一条命令里混着新旧名字会整条失败,一个都装不上。
BROWSER_LIBS="libnss3 libnspr4 libatk1.0-0t64 libatk1.0-0 libatk-bridge2.0-0t64
libatk-bridge2.0-0 libcups2t64 libcups2 libdrm2 libxkbcommon0 libxcomposite1
libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2
libasound2t64 libasound2 fonts-noto-cjk"
if [ ! -f "$BROWSERS_ROOT/.deps-attempted" ] && command -v apt-get &>/dev/null; then
  echo "[$(date +%H:%M:%S)] ==> 尝试安装浏览器系统库(免密 sudo,失败不阻断)"
  installed=0
  for pkg in $BROWSER_LIBS; do
    sudo -n apt-get install -y --no-install-recommends "$pkg" &>/dev/null && installed=$((installed + 1))
  done
  echo "   装上 $installed 个;装不上多半是没有免密 sudo,下面的自检会给出结论"
  touch "$BROWSERS_ROOT/.deps-attempted" || true
fi

# 用仓库里已装的 playwright-core 下载,不走 npx 现拉:版本必然与运行时一致,
# 也少一次网络往返。刻意不加 --with-deps —— 它内部会 sudo,非交互 SSH 下提权
# 失败即整体退出,连浏览器本体都不会下(实测踩过)。
PW_CLI="$APP_DIR/packages/inventory/node_modules/playwright-core/cli.js"
if [ -z "$(ls -A "$BROWSERS_ROOT" 2>/dev/null | grep -v '^\.deps-attempted$')" ] && [ -f "$PW_CLI" ]; then
  echo "[$(date +%H:%M:%S)] ==> 下载无头浏览器(宣传册排版用)"
  # 国内直连 playwright CDN 极慢,走 npmmirror 镜像。
  PLAYWRIGHT_BROWSERS_PATH="$BROWSERS_ROOT" \
    PLAYWRIGHT_DOWNLOAD_HOST="https://cdn.npmmirror.com/binaries/playwright" \
    node "$PW_CLI" install chromium \
    || echo "!! 浏览器下载失败,宣传册将回落到纯文本排版(不影响本次部署)"
fi

if ! grep -q '^PLAYWRIGHT_BROWSERS_PATH=' "$ENV_FILE" 2>/dev/null; then
  echo "[$(date +%H:%M:%S)] ==> 写入 PLAYWRIGHT_BROWSERS_PATH=$BROWSERS_ROOT"
  printf '\nPLAYWRIGHT_BROWSERS_PATH="%s"\n' "$BROWSERS_ROOT" >> "$ENV_FILE"
fi

# 真启一次浏览器再下结论。「文件下下来了」不等于「能跑」——缺系统库时二进制
# 在、一启动就炸。结论直接打进部署日志,免得又要等到线上生成一份册子、看 PDF
# 的 Producer 才发现根本没走浏览器排版。
# 在 inventory 包内执行:pnpm 的严格布局下,运行时正是从这里解析 playwright-core。
echo "[$(date +%H:%M:%S)] ==> 自检:浏览器能否启动"
(
  cd "$APP_DIR/packages/inventory" 2>/dev/null || exit 1
  PLAYWRIGHT_BROWSERS_PATH="$BROWSERS_ROOT" node -e '
const p = require("playwright-core");
p.chromium
  .launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] })
  .then((b) => b.close())
  .then(() => console.log("   自检通过:宣传册走 HTML→PDF"))
  .catch((e) => console.log("   自检未通过,宣传册回落到纯文本排版:" + String(e.message).split("\n")[0]))
'
) || echo "   自检未能执行(playwright-core 解析不到);宣传册回落到纯文本排版"

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
