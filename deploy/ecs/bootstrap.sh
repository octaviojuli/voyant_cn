#!/usr/bin/env bash
# 零手工初始化 + 部署入口(root 执行;由 GitHub Actions SSH 调用,也可手动执行)。
# 首次运行:自动完成 setup-server.sh、生成 .env(随机口令)、安装 systemd 与
# Nginx,然后以 --seed-zh 做首次部署。服务器已初始化时直接转入常规部署,
# 可安全重复执行。
# 用法: sudo APP_HOST=<公网IP或域名> bash deploy/ecs/bootstrap.sh
set -euo pipefail

APP_DIR=/opt/voyant/app
APP_HOST="${APP_HOST:-$(hostname -I | awk '{print $1}')}"

first_run=false
if ! id -u voyant &>/dev/null || [ ! -f "$APP_DIR/starters/operator/.env" ]; then
  first_run=true
  echo "==> 检测到未初始化服务器,开始自动初始化(APP_HOST=$APP_HOST)"
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
    nginx -t && systemctl reload nginx
  fi
fi

if [ "$first_run" = true ]; then
  echo "==> 首次部署(--skip-pull --seed-zh)"
  sudo -iu voyant bash "$APP_DIR/deploy/ecs/deploy.sh" --skip-pull --seed-zh
else
  sudo -iu voyant bash "$APP_DIR/deploy/ecs/deploy.sh"
fi
