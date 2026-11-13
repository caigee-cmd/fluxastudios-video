# Fluxa Studios 运维速查

这是 **Fluxa Studios**，基于「影策 / open-ai-canvas」的品牌分支，当前上游基线 `v1.8.4.1`。生产在 **SGP3**，目录 `/opt/open-ai-canvas`，主站 https://fluxastudios.com，预览 https://preview.fluxastudios.com；www 跳转主站。

## 1. 镜像与发布

生产前端、后端必须来自本仓库，不再使用 `ghcr.io/ddcat-ai/open-ai-canvas-web/backend`：官方镜像没有本分支的品牌与字体修改。PostgreSQL、Redis 不改；独立 Agent 保留已验证的官方 digest，其协议标识不是产品品牌。

| 服务 | 本仓库 GHCR 镜像 |
| --- | --- |
| web | `ghcr.io/caigee-cmd/fluxastudios-web` |
| backend / migrate | `ghcr.io/caigee-cmd/fluxastudios-backend` |
| 可选 Agent（当前生产不切换） | `ghcr.io/caigee-cmd/fluxastudios-agent` |

每个通过检查的提交有不可变操作约定的 `sha-<完整或前7位提交>` 标签；main 还发布 `latest`、`1.8.4.1-fluxa`（版本以 VERSION 为准）。生产优先固定 digest；不要直接部署可变 `latest`。真正不可变的是 digest，SHA 标签也不要手工覆盖。

推荐：PR 通过 Quality checks 后合并 main，等待 **Publish Fluxa Studios images** 成功。该流程以仓库自带 Dockerfile 构建双架构镜像，用 GitHub Actions 的 packages:write 推至 GHCR，不需要把 Token 放进源码。也可手动执行 `gh workflow run publish-images.yml --ref <分支>`；必须确认整轮质量检查成功再部署其 SHA。

有 Docker Buildx 的构建机上可手动构建（不要在 2 核 / 4GB 的 SGP3 上重编译）：

```bash
sha=$(git rev-parse HEAD)
for part in web backend; do
  file=Dockerfile; [ "$part" = backend ] && file=backend/Dockerfile
  docker buildx build --platform linux/amd64 -f "$file" \
    --build-arg BUILD_VERSION="$(tr -d '\r\n' < VERSION)" \
    --build-arg BUILD_COMMIT="$sha" \
    --label org.opencontainers.image.source=https://github.com/caigee-cmd/fluxastudios-video \
    -t "ghcr.io/caigee-cmd/fluxastudios-$part:sha-$sha" --push .
done
```

先用有 `write:packages` 的账号登录 GHCR，Token 只能经密码标准输入或凭据管理器，不能写进命令、文档或 Git。发布不等于自动部署。Quality checks 固定 Ubuntu 24.04；Redis 测试二进制来自官方 `redis:7.4-bookworm`，不用 apt 源，所有依赖测试仍须通过。

### SGP3 部署 / 回滚

1. 备份数据库与数据卷。本分支后端要求 schema **99**（`site_traffic_events`，相对官方 `v1.8.4.1` 的 98 多一张访问统计表，迁移是加表，不改已有业务数据）。部署脚本会在启动新后端前执行 `migrate-schema up`；已是 99 时该步骤是幂等的。不要在仍运行官方 1.8.4.1 后端时先升到 99，否则旧后端会因结构过新而拒绝启动。
2. 拉取目标 web/backend 的固定 SHA 或 digest。新 GHCR 包可能是私有：若服务器无读取权限，**不要复制个人 Token**；下载成功发布流程的 `fluxastudios-web-amd64`、`fluxastudios-backend-amd64` 制品，核对运行提交，然后 `gunzip -c *.tar.gz | docker load`（每个文件分别执行）。制品仅保留 3 天，镜像长期在 GHCR；有权限时使用 `docker pull` 即可。
3. 把仓库 `scripts/deploy-fluxa.sh` 复制到 SGP3，以 root 运行：

```bash
bash deploy-fluxa.sh \
  ghcr.io/caigee-cmd/fluxastudios-web:sha-<完整提交> \
  ghcr.io/caigee-cmd/fluxastudios-backend:sha-<完整提交>
```

脚本只改 `.env` 的两个镜像项，原文件及 Compose 备份在 `/root/fluxa-studios-ops/backups/<时间>/`（勿公开备份）。它先要求镜像已在本机、注册关闭、邮件开启、协议存在、web 绑定 localhost，再停止并 mask 官方更新器，**先停止 backend 并运行 migrate**，再重建 backend 和 web；backend 重建后**立即**重建 SMTP bridge，不等 cron。

回滚优先传入上一版**同样支持当前 schema 的自建镜像** SHA/digest，运行同一脚本。生产库升到 99 之后，不要把后端退回官方 `v1.8.4.1`（它只支持到 98，会拒绝连接）。不要恢复官方更新器。只回滚镜像时不恢复数据库或整个 `.env`，避免覆盖后续邮件、站点配置。

### 验收（在 SGP3 上执行）

- `curl --resolve fluxastudios.com:443:127.0.0.1 -s -o /dev/null -w '%{http_code}\n' https://fluxastudios.com/` 应为 200；同验 preview。不要把构建机出网代理的 500 当作源站故障。
- `/api/auth/settings`：`registrationEnabled=false`、`emailEnabled=true`，服务协议仍存在且与部署前一致；数据库 `registration` 设置若存在，`enabled` 也必须 false。
- 欢迎页开场 Fluxa、国际化故事标签/默认作者、片尾署名不再把产品叫影策。官方包格式、上游作者和许可证仍可出现影策。
- `docker port open-ai-canvas-web-1` 必须只见 `127.0.0.1:3000`，不是 `0.0.0.0` 或 `[::]`。
- web/backend healthy；`fluxa-smtp-bridge` running，网络命名空间跟随**当前** backend 容器；backend 内 `127.0.0.1:1025` 可建立 TCP 连接。此检查不发送邮件、不等同于真实送达测试。
- `/api/public/appearance` 的品牌、黑白皮肤、logo/登录视频与部署前一致。

## 2. 防止官方更新器覆盖

SGP3 的 Host Updater 是 systemd 服务 `open-ai-canvas-updater.service`，程序 `/usr/local/bin/open-ai-canvas-host-updater`，环境文件 `/etc/open-ai-canvas-updater.env`，socket 在 `/run/open-ai-canvas-updater/`。

自建部署脚本执行 `systemctl disable --now`，把原 `/etc/systemd/system/` 单元放入本轮备份，然后 `systemctl mask`（单元路径成为 `/dev/null` 链接）及 `daemon-reload`。验证 `systemctl is-enabled` 为 **masked**、`is-active` 为 **inactive**。后台「系统更新」不能继续用来升级，socket 即使残留也没有更新器监听。

**不要 unmask，不运行官方一键安装/升级脚本。** mask 防止 systemd 启动，不会阻止 root 手动执行更新器二进制或安装脚本；以后升级走本仓库 PR → 自建镜像 → 上述验收流程。更新上游时先合并、审查品牌与运维差异，再发布。

## 3. 网络、邮件与注册不变量

- `/opt/open-ai-canvas/docker-compose.deploy.yml` 的 web 必须是 `127.0.0.1:${CANVAS_HTTP_PORT:-3000}:3000`。Nginx 负责 LE HTTPS、主站/preview 代理到本机 3000。
- 保留 `/etc/nginx/snippets/fluxa-brand-subfilter.conf`（主站及 preview 引用），作为历史静态资源的兜底；新镜像不依赖它替换品牌。web 容器把 `open-ai-canvas_web-data` 挂到 `/usr/share/nginx/html`，旧哈希的 JS 可能仍留在卷里，但首页会引用本次构建的文件；验收看当前 index 引用的 welcome/i18n，必要时强制刷新。
- 端口守护 `/root/fluxa-studios-ops/watchdog.py`：root cron 每 2 分钟，仅在 web 绑定错误时修复并重建 web，不动 backend。
- 邮件桥目录 `/root/fluxa-smtp-bridge`，容器及 Compose service 均为 `fluxa-smtp-bridge`，`network_mode: container:open-ai-canvas-backend-1`；守护 `/root/fluxa-smtp-bridge/watchdog.sh` 每 2 分钟运行。
- **任何 backend recreate 后立刻执行** `cd /root/fluxa-smtp-bridge && docker compose up -d --no-deps --force-recreate fluxa-smtp-bridge`。旧 namespace 会断邮件，不能等守护。
- `CANVAS_PUBLIC_BASE_URL=https://fluxastudios.com`；`CANVAS_CORS_ORIGINS` 保留主站、www、preview 现有明确白名单，不能用 `*`。
- **注册故意关闭**：`CANVAS_REGISTRATION_ENABLED=false`，数据库 `registration.enabled=false`。只有站主明确同意才能打开；出现 emailRegistration=true 不代表 registrationEnabled=true。
- 发件地址暂时保持 **noreply@caiaiu.com**，等 Resend 验证 fluxastudios.com 后另行授权切换。不改 MX/SPF/DKIM，不在日志/仓库粘贴 SMTP/Resend/账号/密钥。
- `supabase.fluxastudios.com` 是另外一套自建隧道服务，尚未暂停；`proxy.fluxastudios.com` 也不属于本次部署，**不要改这两条 DNS**。

## 4. 品牌在哪里改

- 管理后台 **站点及外观**：Fluxa Studios 名称、SEO、footer、logo、登录视频、黑白电影感皮肤（`fluxa-studios`）。现有数据库配置优先于源码默认值；不要点「恢复默认」来修复皮肤。
- 源码：`web/src/i18n/messages/areas/`、欢迎页、`use-appearance-store.ts`、助手默认称呼/创作提示词；后端默认品牌、登录提示及短剧导出标题。改源码需重建对应镜像，Nginx 不是长期替代方案。
- 字体：通过 Fontsource 随镜像本地提供 **DM Sans** 正文、**Space Grotesk** 标题；中文保留系统字体回退，JetBrains Mono 保留给代码；没有新增 Google Fonts 外部依赖。两套字体的 OFL 授权随镜像发布在 `/licenses/DM-Sans-OFL.txt` 与 `/licenses/Space-Grotesk-OFL.txt`。
- 助手：目前仅支持 orb / live2d / bundle；生产已有 bundle 配置原样保留，默认名字 Fluxa。不把静态 logo 硬塞为头像。要替换形象需可用且有授权的完整 bundle/Live2D 资源，单独验收。
- 保留官方资产包/姿势包格式名、请求 User-Agent、内部 `yingce` 标识、上游技能原文/作者、社区插件作者、贡献者与第三方影片授权，避免破坏导入兼容或冒领署名。

## 5. 积分说明与配置维护

用户可见的兑换说明、生成估价和流水文案见 [fluxa-credit-explanation.md](./fluxa-credit-explanation.md)。那份文档列出了未公布的有效期/提现/充值退款政策，以及上架积分套餐时如何与默认 1 元 1 积分对齐。不要在未公布政策前把它写成永久有效或一概不退。

后台改价格、时长、清晰度展示、套餐和支付开关的入口，以及当前已落地的模型/套餐状态、只更新前端的原则，见可单独公开的 [fluxa-admin-and-releases.md](./fluxa-admin-and-releases.md)。
