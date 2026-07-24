# 部署到阿里云 ECS(裸 Node + Docker PostgreSQL)

本目录提供把本仓库部署到一台 ECS(Ubuntu 22.04/24.04)的完整配置:
应用以裸 Node 进程运行(systemd 托管),PostgreSQL 以 Docker 容器运行,
推送 `main` 分支后由 GitHub Actions 通过 SSH 自动更新。

## 服务器要求

- Ubuntu 22.04/24.04,建议 4 vCPU / 8GB 内存(不足 8GB 时初始化脚本会自动加 swap;
  构建阶段是内存大户,运行阶段 2GB 即可)
- 安全组放行:22(SSH)、80/443(对外);8080 仅本机(Nginx 反代)
- 能访问 npmmirror(依赖与 Node 走国内镜像,不依赖 GitHub 直连速度;
  代码拉取如遇 GitHub 不稳,见下文镜像说明)

## 零手工初始化(推荐)

配好下文的 GitHub Secrets 后,首次 push `main` 时 `deploy-ecs.yml` 会检测
空白服务器并自动执行 `bootstrap.sh`:克隆代码、运行 `setup-server.sh`、
生成随机口令的 `.env`、安装 systemd 与 Nginx,然后以 `--seed-zh` 完成首次
部署。整个过程无需登录服务器;下面的手动步骤仅在需要自定义时使用。
自动生成的配置默认用服务器 IP 做访问地址,绑定域名后请更新
`starters/operator/.env` 的 4 个 URL 项与 Nginx 的 `server_name`。

## 首次部署步骤(手动方式)

```bash
# 1. root 初始化(装 Node 24、pnpm、Docker、创建 voyant 用户、必要时加 swap)
sudo bash deploy/ecs/setup-server.sh   # 首次可先 scp 单个脚本上去

# 2. 以 voyant 用户克隆代码
sudo su - voyant
git clone https://github.com/<owner>/<repo>.git /opt/voyant/app
cd /opt/voyant/app

# 3. 配置数据库口令与应用环境
cp deploy/ecs/.env.example deploy/ecs/.env          # 填 POSTGRES_PASSWORD
cp starters/operator/.env.example starters/operator/.env
#   必填:APP_URL/DASH_BASE_URL/API_BASE_URL/CORS_ALLOWLIST 换成你的域名;
#   DATABASE_URL=postgresql://voyant:<口令>@127.0.0.1:5432/voyant
#   BETTER_AUTH_SECRET/SESSION_CLAIMS_SECRET/KMS_LOCAL_KEY: openssl rand -base64 32
#   INTERNAL_API_KEY: openssl rand -hex 32;KMS_PROVIDER=local

# 4. 安装 systemd 服务(root)
sudo cp deploy/ecs/voyant-operator.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable voyant-operator
#   并允许 voyant 免密重启该服务:
echo 'voyant ALL=(root) NOPASSWD: /usr/bin/systemctl restart voyant-operator, /usr/bin/journalctl' | sudo tee /etc/sudoers.d/voyant

# 5. 首次部署(含建库、迁移;--seed-zh 会灌基线 + 中文演示数据)
bash deploy/ecs/deploy.sh --skip-pull --seed-zh

# 6. Nginx + HTTPS
sudo apt-get install -y nginx
sudo cp deploy/ecs/nginx-voyant.conf /etc/nginx/conf.d/voyant.conf   # 改 server_name
sudo nginx -t && sudo systemctl reload nginx
# HTTPS:sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx
```

完成后访问 `https://你的域名`,用种子账号 `owner@voyant.dev / password123`
登录(生产请立即改密/换账号),右下角用户菜单切换到中文。

## 自动部署(push main 触发)

在 GitHub 仓库 Settings → Secrets and variables → Actions 配置:

| Secret | 内容 |
| --- | --- |
| `ECS_HOST` | ECS 公网 IP 或域名 |
| `ECS_USER` | 具备 sudo -iu voyant 权限的 SSH 用户(如 root 或运维账号) |
| `ECS_SSH_KEY` | 对应私钥(PEM 全文) |
| `ECS_SSH_PORT` | 可选,默认 22 |

配好后每次 push `main`,`.github/workflows/deploy-ecs.yml` 会 SSH 到服务器
执行 `deploy/ecs/deploy.sh`(拉代码 → 装依赖 → 构建 → 迁移 → 重启 → 健康检查)。
未配置 `ECS_HOST` 时工作流自动跳过,不会报错。

## 运维速查

```bash
sudo systemctl status voyant-operator        # 服务状态
sudo journalctl -u voyant-operator -f        # 实时日志
bash deploy/ecs/deploy.sh                    # 手动更新到最新 main
docker exec -it voyant-postgres psql -U voyant voyant   # 进数据库
docker exec voyant-postgres pg_dump -U voyant voyant | gzip > backup.sql.gz  # 备份
```

## 已知注意事项

- 应用以 `--conditions=development` 运行(官方 CI 同款):monorepo 里
  `dist/server/server.js` 会解析 workspace 源码,因此服务器上必须保留完整仓库
  与 node_modules,不能只拷贝 dist。
- GitHub 直连不稳时,把 origin 换成镜像代理再部署:
  `git remote set-url origin https://ghproxy.net/https://github.com/<owner>/<repo>.git`
- 构建用 `--max-old-space-size=8192`;若仍 OOM,确认 swap 已生效(`free -h`)。
- 自建 PG 无自动备份,请给上面的 pg_dump 配 cron;或后续迁移到 RDS 只需改
  `DATABASE_URL` 并停用本机容器。
