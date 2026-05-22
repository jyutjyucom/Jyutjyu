# Docker Compose 部署

本项目可以用 Docker Compose 在服务器上运行 Nuxt/Nitro 生产构建。容器默认监听 `0.0.0.0:3000`。

## 准备环境变量

`compose.yaml` 已为静态 JSON 模式提供默认值，所以没有 `.env` 也可以启动。生产部署仍建议复制示例环境文件并按部署模式修改：

```bash
cp env.example .env
```

推荐显式设置存储模式，避免生产环境行为不清晰：

```env
# 使用静态 JSON，不依赖 MongoDB
NUXT_PUBLIC_USE_API=false

# 或使用 MongoDB API 模式
NUXT_PUBLIC_USE_API=true
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=jyutjyu
```

不要同时保留两行 `NUXT_PUBLIC_USE_API`，按实际模式只留一个值。

同时把站点 URL 改成你的公网域名：

```env
NUXT_PUBLIC_SITE_URL=https://your-domain.example
ENFORCE_CANONICAL_HOST_REDIRECT=false
```

如果应用前面有 Nginx、Caddy、Traefik 等反向代理，先保持 `ENFORCE_CANONICAL_HOST_REDIRECT=false`。确认公网域名、HTTPS 和代理头都正常后，再按需要开启强制 canonical host 跳转。

`NUXT_PUBLIC_*` 是客户端公开配置，会影响构建后的客户端 bundle。修改这些变量后请重新构建镜像。`compose.yaml` 会从当前目录的 `.env` 自动读取变量，并为公开配置提供默认值；没有 `.env` 时会回退到静态 JSON 模式。避免把 `docker compose config` 的完整输出贴到公开位置，因为 Compose 会展开 `.env` 里的密钥。

## 构建和启动

```bash
docker compose build
docker compose up -d
docker compose logs -f web
```

默认端口映射是：

```yaml
3000:3000
```

如果服务器上还有反向代理，通常让代理转发到 `http://127.0.0.1:3000`。

## 更新部署

拉取最新代码后重新构建并启动：

```bash
git pull
docker compose up -d --build
```

## 本地 smoke test

不依赖 MongoDB 的静态模式：

```bash
docker build -t jyutjyu:local .
docker run --rm -p 3000:3000 -e NUXT_PUBLIC_USE_API=false jyutjyu:local
```

然后访问：

- http://localhost:3000/
- http://localhost:3000/search
- http://localhost:3000/browse
- http://localhost:3000/api/dictionaries

MongoDB API 模式可用下面的方式验证搜索接口：

```bash
docker compose up --build
curl "http://localhost:3000/api/search?q=我"
```

## 说明

Docker 构建阶段会运行 `npm run build`，因此会执行字体子集、i18n、搜索索引、浏览索引和推荐数据生成脚本。镜像的 build stage 已安装 `python3-fonttools`，用于提供字体子集脚本需要的 `pyftsubset`。
