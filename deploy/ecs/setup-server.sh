#!/usr/bin/env bash
# ECS 一次性初始化(Ubuntu 22.04/24.04,root 或 sudo 执行)。
# 用法: sudo bash deploy/ecs/setup-server.sh
set -euo pipefail

NODE_VERSION="24.13.0"
NODE_DIST_BASE="${NODE_DIST_BASE:-https://npmmirror.com/mirrors/node}"
APP_DIR=/opt/voyant

echo "==> 创建运行用户与目录"
id -u voyant &>/dev/null || useradd -m -s /bin/bash voyant
mkdir -p "$APP_DIR"
chown voyant:voyant "$APP_DIR"

echo "==> 安装 Node ${NODE_VERSION}(默认走 npmmirror 镜像,可用 NODE_DIST_BASE 覆盖)"
if [ ! -x "$APP_DIR/node24/bin/node" ]; then
  curl -fsSL "${NODE_DIST_BASE}/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node24.tar.xz
  mkdir -p "$APP_DIR/node24"
  tar -xJf /tmp/node24.tar.xz -C "$APP_DIR/node24" --strip-components=1
  rm /tmp/node24.tar.xz
fi
"$APP_DIR/node24/bin/node" --version

echo "==> 安装 pnpm 与 git"
export PATH="$APP_DIR/node24/bin:$PATH"
command -v git &>/dev/null || apt-get install -y git
npm config set registry https://registry.npmmirror.com
corepack enable && corepack prepare pnpm@latest --activate || npm i -g pnpm

echo "==> 安装 Docker(仅用于 PostgreSQL)"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker voyant || true

echo "==> 内存检查:构建建议 >= 8GB(内存 + swap)"
TOTAL_KB=$(awk '/MemTotal/{print $2}' /proc/meminfo)
SWAP_KB=$(awk '/SwapTotal/{print $2}' /proc/meminfo)
if [ $(( (TOTAL_KB + SWAP_KB) / 1024 / 1024 )) -lt 8 ]; then
  echo "    内存+swap 不足 8GB,创建 8GB swap 文件..."
  if [ ! -f /swapfile ]; then
    fallocate -l 8G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

echo "==> 完成。接下来:"
echo "  1. su - voyant && git clone <你的仓库地址> $APP_DIR/app"
echo "  2. 参照 deploy/ecs/README.md 配置 .env 与数据库,然后运行 deploy/ecs/deploy.sh"
