# Docker 部署文档

本目录已提供可直接使用的容器化部署：`Dockerfile` 多阶段构建应用镜像，`docker-compose.yml` 一次拉起应用与 MariaDB。适用于快速验证与中小规模单机部署。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `Dockerfile` | 多阶段构建：`node:22-alpine` 下安装依赖并 `nuxt build`，运行期仅携带 `.output` |
| `docker-compose.yml` | 编排 `db`（MariaDB 11）与 `app` 两个服务，及持久化数据卷 |
| `.dockerignore` | 剔除本地产物与敏感配置，避免打入镜像 |
| `.env.example` | Compose 环境变量模板 |

## 使用步骤

### 1. 准备环境变量

```bash
cp .env.example .env
# 编辑 .env，务必设置强随机的 NUXT_SESSION_PASSWORD（部署文档有生成命令）
```

### 2. 启动

```bash
docker compose up -d --build
```

首次会构建镜像并拉取 MariaDB。应用等待数据库健康后再启动。

### 3. 完成开箱向导

访问 `http://<主机>:3000` 进入开箱向导。数据库配置中主机填服务名 `db`、端口 `3306`，账号为仓库中 MariaDB 初始化的账号（默认可用 root 与 `.env` 中 `MARIADB_ROOT_PASSWORD`）。向导在创建超管时自动建库建表。

### 4. 数据与配置持久化

- 数据库数据存于命名卷 `db-data`，删除容器不丢数据；数据卷内数据库首次初始化后不再受 `.env` 的密码变量影响。
- 应用配置挂载自宿主机 `./config.json`（若不存在，应用启动时会自动生成模板）。容器内与宿主机共享同一文件，因此可直接在宿主机查看或维护。

## 常用操作

```bash
docker compose up -d        # 仅启动
docker compose down         # 停止（保留数据卷）
docker compose down -v      # 停止并删除数据卷（会清库）
docker compose logs -f app  # 查看应用日志
docker compose build --no-cache app  # 强制重建镜像
```

## 反向代理

容器内应用监听 3000，`docker-compose.yml` 已映射到宿主机。对外提供 HTTP/HTTPS 时，在宿主机或宿主机外的 Nginx 反向代理到 `127.0.0.1:3000`（或映射端口）即可，参考 [DEPLOYMENT.md](DEPLOYMENT.md) 的 Nginx 配置。此时同样需要把 `config.json` 的 `isReverseProxy` 开启，并正确配置 site URL。

## 安全提示

- `NUXT_SESSION_PASSWORD` 缺失时应用会拒绝启动，请保证 `.env` 中已写入强口令。
- `./config.json` 含数据库口令与 OIDC 私钥，勿提交到版本库，并限制宿主文件权限。
- 生产对外请务必加 HTTPS 与 WebAuthn 域名绑定，详见 [DEPLOYMENT.md](DEPLOYMENT.md)。