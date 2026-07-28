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
执行 `deploy/ecs/deploy.sh`。未配置 `ECS_HOST` 时工作流自动跳过,不会报错。

### 部署的固定次序

```
拉代码 → 装依赖 → 构建 → 迁移 → 种子(按需)
      → 预检:旁路端口启动新构建        ← 起不来就到此为止,线上分毫未动
      → 重启线上服务 → 健康检查
      → 失败则自动回滚到上一个可用版本
      → 成功则把本次产物存为"最后可用版本"
```

**预检是整套流程的关键**。它用真实 `.env` 把新构建先在 `8099` 端口启起来,
健康检查通过才动线上服务。配置缺失、部署图选了运行时不接受的提供方、依赖
装错——这几类问题都会在这一步暴露,而此时线上仍是旧版本,对外照常服务。

预检之后仍失败(例如 systemd 环境与预检不同)时,脚本自动还原
`/opt/voyant/releases/last-good` 里的产物并重启,站点先恢复,再排查。
**回滚只还原代码,不回滚数据库**——迁移是只进不退的;若某次迁移与上一版
构建不兼容,回滚救不了,只能向前修复。

### 宣传册用的无头浏览器

宣传册走 HTML → PDF,需要服务器上有一个无头 Chromium。部署脚本会在
`/opt/voyant/browsers`(可用 `BROWSERS_ROOT` 覆盖)装一次,并把
`PLAYWRIGHT_BROWSERS_PATH` 写进 `.env`;目录刻意在 `APP_DIR` 之外,理由与存储
目录相同——部署会对仓库执行 `git reset --hard`。下载走 npmmirror 镜像,直连
playwright CDN 在国内基本拉不动。

**`voyant` 用户的免密 sudo 只开了两条**,`bootstrap.sh` 写死在
`/etc/sudoers.d/voyant`:

```
voyant ALL=(root) NOPASSWD: /usr/bin/systemctl restart voyant-operator, /usr/bin/journalctl
```

装包不在其中——这就是部署脚本里 `sudo -n apt-get` 永远装不上系统库的原因,不是
写法问题。补系统库要以 root 手动跑一次(命令见部署日志的自检段落),或者自行给
sudoers 加规则。

**装不上不阻断部署**。取不到浏览器时宣传册回落到内置的 pdf-lib 纯文本排版:
册子难看,但生成不会失败。判定的是「可执行文件在不在」,所以装完不必重启就
会在下次生成时生效;想指定别的浏览器,在 `.env` 里写
`BROCHURE_CHROMIUM_PATH="/path/to/chrome"` 即可。

排查时先看这一条是不是 `null`:

```bash
# 期望输出一个存在的可执行文件路径
sudo -u voyant PLAYWRIGHT_BROWSERS_PATH=/opt/voyant/browsers \
  /opt/voyant/node24/bin/node -e \
  "import('playwright-core').then(m=>console.log(m.chromium.executablePath()))"
```

### 健康检查探哪个地址

用 **`/healthz`**,它免鉴权。不要探 `/api/healthz`:该路径需要鉴权,未登录
时返回 `401`,把它当成"没起来"会白等很久(这个坑真踩过)。

```bash
curl -sf https://<域名>/healthz     # 200 = 活着
```

### 改动部署形态时的自检清单

新增或切换 `providers.*`(存储、缓存、共享状态、限流)时,**部署图里注册了
不等于运行时能跑**。至少走完:

1. 包清单里注册提供方与其配置项(`packages/<pkg>/src/voyant.ts`);
2. `starters/operator/voyant.config.ts` 选用它;
3. **`packages/framework/src/node-provider-plan.ts` 放行该取值**,并把它需要
   的环境变量加进 `validateVoyantNodeProviderPlanEnv`——这份白名单独立于
   部署图,漏改会导致服务启动即退出;
4. `deploy/ecs/deploy.sh` 备好目录与配置项;
5. 本地跑一遍 `bash deploy/ecs/lib.test.sh`。

第 3 步就是把站点搞挂过一次的地方:部署图、提供方构造、运行时端口解析都改了,
唯独漏了那份白名单,而它不在存储包里,包级验证覆盖不到。现在预检会挡住这类
问题,但清单本身仍值得照着走一遍。

## 运维速查

```bash
sudo systemctl status voyant-operator        # 服务状态
sudo journalctl -u voyant-operator -f        # 实时日志
bash deploy/ecs/deploy.sh                    # 手动更新到最新 main
curl -sf http://127.0.0.1:8080/healthz       # 存活探针(免鉴权)
bash deploy/ecs/lib.test.sh                  # 部署脚本自测(改脚本后先跑这个)
docker exec -it voyant-postgres psql -U voyant voyant   # 进数据库
docker exec voyant-postgres pg_dump -U voyant voyant | gzip > backup.sql.gz  # 备份
```

手动回滚(自动回滚没生效或想退回上一版时):

```bash
cd /opt/voyant/app/starters/operator
cat /opt/voyant/releases/last-good/COMMIT           # 看那份产物是哪个提交
rm -rf dist .voyant
cp -a /opt/voyant/releases/last-good/dist .
cp -a /opt/voyant/releases/last-good/.voyant .
sudo systemctl restart voyant-operator
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
