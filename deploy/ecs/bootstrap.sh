#!/usr/bin/env bash
# 零手工初始化 + 部署入口(root 执行;由 GitHub Actions SSH 调用,也可手动执行)。
# 首次运行:自动完成 setup-server.sh、生成 .env(随机口令)、安装 systemd 与
# Nginx,然后以 --seed-zh 做首次部署;全部完成后写入标记文件。之后的运行
# 直接转入常规部署。所有步骤均有幂等守卫,可安全重复执行。
# 用法: sudo APP_HOST=<公网IP或域名> bash deploy/ecs/bootstrap.sh [deploy.sh 附加参数,如 --prebuilt]
set -euo pipefail

APP_DIR=/opt/voyant/app
MARKER=/opt/voyant/.bootstrap-done
APP_HOST="${APP_HOST:-$(hostname -I | awk '{print $1}')}"

if [ ! -f "$MARKER" ]; then
  echo "==> 检测到未完成初始化的服务器,开始自动初始化(APP_HOST=$APP_HOST)"
  bash "$APP_DIR/deploy/ecs/setup-server.sh"
  chown -R voyant:voyant /opt/voyant

  if [ ! -f "$APP_DIR/deploy/ecs/.env" ]; then
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > "$APP_DIR/deploy/ecs/.env"
  fi
  if [ ! -f "$APP_DIR/starters/operator/.env" ]; then
    PGPASS=$(sed -n 's/^POSTGRES_PASSWORD=//p' "$APP_DIR/deploy/ecs/.env")
    cat > "$APP_DIR/starters/operator/.env" <<EOF
# 由 bootstrap.sh 自动生成;换域名/上 HTTPS 后请更新 4 个 URL 项。
APP_URL="http://${APP_HOST}/api"
DASH_BASE_URL="http://${APP_HOST}"
API_BASE_URL="http://${APP_HOST}/api"
CORS_ALLOWLIST="http://${APP_HOST}"
EMAIL_FROM="Voyant <voyant@notifications.example.com>"
DATABASE_URL="postgresql://voyant:${PGPASS}@127.0.0.1:5432/voyant"
DATABASE_URL_DIRECT="postgresql://voyant:${PGPASS}@127.0.0.1:5432/voyant"
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
SESSION_CLAIMS_SECRET="$(openssl rand -base64 32)"
INTERNAL_API_KEY="$(openssl rand -hex 32)"
VOYANT_ADMIN_AUTH_MODE="local"
KMS_PROVIDER="local"
KMS_LOCAL_KEY="$(openssl rand -base64 32)"
NETOPIA_MODE="sandbox"
EOF
  fi
  chown voyant:voyant "$APP_DIR/deploy/ecs/.env" "$APP_DIR/starters/operator/.env"
  chmod 600 "$APP_DIR/deploy/ecs/.env" "$APP_DIR/starters/operator/.env"

  cp "$APP_DIR/deploy/ecs/voyant-operator.service" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable voyant-operator
  echo 'voyant ALL=(root) NOPASSWD: /usr/bin/systemctl restart voyant-operator, /usr/bin/journalctl' > /etc/sudoers.d/voyant
  chmod 440 /etc/sudoers.d/voyant

  export DEBIAN_FRONTEND=noninteractive
  command -v nginx &>/dev/null || apt-get install -y nginx
  if [ ! -f /etc/nginx/conf.d/voyant.conf ]; then
    # server_name 置为通配,绑定域名后再改回具体域名并配 certbot
    sed 's/server_name .*/server_name _;/' "$APP_DIR/deploy/ecs/nginx-voyant.conf" > /etc/nginx/conf.d/voyant.conf
    rm -f /etc/nginx/sites-enabled/default
  fi
  # 部分 ECS 镜像预装 Apache 并占用 80 端口;若在运行则停用给 Nginx 让位
  if systemctl is-active --quiet apache2 2>/dev/null; then
    echo "==> 检测到 Apache 占用 80 端口,停用 apache2"
    systemctl disable --now apache2 || true
  fi
  systemctl enable nginx || true
  # Nginx 起不来(通常是 80 被其他程序占用)不阻断部署:应用仍监听 8080
  if nginx -t && systemctl restart nginx; then
    echo "==> Nginx 已启动"
  else
    echo "!! Nginx 启动失败,当前 80/443 端口占用情况:"
    ss -tlnp | grep -E ':(80|443)\s' || true
    echo "!! 跳过 Nginx,继续部署;可稍后处理端口冲突。"
  fi

  echo "==> 首次部署(--skip-pull --seed-zh $*)"
  sudo -iu voyant bash "$APP_DIR/deploy/ecs/deploy.sh" --skip-pull --seed-zh "$@"
  touch "$MARKER"
else
  sudo -iu voyant bash "$APP_DIR/deploy/ecs/deploy.sh" --skip-pull "$@"
fi
