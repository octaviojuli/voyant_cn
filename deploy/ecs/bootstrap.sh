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

  FIRST_RUN=true
else
  FIRST_RUN=false
fi

# 自动 HTTPS:裸 IP 场景用 <IP>.sslip.io 免费域名申请 Let's Encrypt 证书。
# 纯 HTTP 下浏览器会丢弃 Secure 会话 Cookie,登录无法保持,HTTPS 是必需项。
# 已有证书时跳过;签发失败(如 sslip.io 触发 LE 频率限制)只告警不阻断。
if [[ "$APP_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && command -v nginx &>/dev/null; then
  HTTPS_DOMAIN="${APP_HOST}.sslip.io"
  if [ ! -f "/etc/letsencrypt/live/${HTTPS_DOMAIN}/fullchain.pem" ]; then
    echo "==> 启用 HTTPS(${HTTPS_DOMAIN})"
    export DEBIAN_FRONTEND=noninteractive
    command -v certbot &>/dev/null || apt-get install -y certbot python3-certbot-nginx
    sed -i "s/server_name .*/server_name ${HTTPS_DOMAIN};/" /etc/nginx/conf.d/voyant.conf
    nginx -t && systemctl reload nginx
    if certbot --nginx -d "$HTTPS_DOMAIN" --non-interactive --agree-tos \
         --register-unsafely-without-email --redirect; then
      sed -i \
        -e "s|^APP_URL=.*|APP_URL=\"https://${HTTPS_DOMAIN}/api\"|" \
        -e "s|^API_BASE_URL=.*|API_BASE_URL=\"https://${HTTPS_DOMAIN}/api\"|" \
        -e "s|^DASH_BASE_URL=.*|DASH_BASE_URL=\"https://${HTTPS_DOMAIN}\"|" \
        -e "s|^CORS_ALLOWLIST=.*|CORS_ALLOWLIST=\"https://${HTTPS_DOMAIN}\"|" \
        "$APP_DIR/starters/operator/.env"
      echo "==> HTTPS 已启用:https://${HTTPS_DOMAIN}"
    else
      echo "!! 证书签发失败,暂以 HTTP 运行;可稍后重试或绑定自有域名"
    fi
  fi

  # 证书就绪后,用确定性模板重写 Nginx 配置(幂等,替代 certbot 的就地改写):
  # - 80 端口的 /api/ 直接反代:应用的服务端函数会用 http 自我回调,若被 301
  #   跳转到 https,Node fetch 会按规范丢弃 Cookie 头,导致会话判定失败;
  # - 其余 http 流量(含裸 IP 访问)一律 301 到正式 https 域名。
  if [ -f "/etc/letsencrypt/live/${HTTPS_DOMAIN}/fullchain.pem" ]; then
    cat > /etc/nginx/conf.d/voyant.conf <<NGINXEOF
server {
    listen 80 default_server;
    server_name ${HTTPS_DOMAIN} ${APP_HOST};
    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location / {
        return 301 https://${HTTPS_DOMAIN}\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name ${HTTPS_DOMAIN};
    ssl_certificate /etc/letsencrypt/live/${HTTPS_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${HTTPS_DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
NGINXEOF
    nginx -t && systemctl reload nginx && echo "==> Nginx 配置已更新(API 自我回调直通)"
  fi
fi

if [ "$FIRST_RUN" = true ]; then
  echo "==> 首次部署(--skip-pull --seed-zh $*)"
  sudo -iu voyant bash "$APP_DIR/deploy/ecs/deploy.sh" --skip-pull --seed-zh "$@"
  touch "$MARKER"
else
  sudo -iu voyant bash "$APP_DIR/deploy/ecs/deploy.sh" --skip-pull "$@"
fi
