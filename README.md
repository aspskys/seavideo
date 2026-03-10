

# seavideo — 星海 AI 漫剧制作工作台

星海内部使用的 AI 漫剧制作工具，基于 AI 技术支持从小说文本自动生成分镜、角色、场景，并制作成完整视频。

[English](README_en.md) · [反馈问题](https://github.com/aspskys/seavideo/issues)

> [!IMPORTANT]
> ⚠️ **测试版声明**：本项目目前处于测试初期阶段，存在部分 bug 和不完善之处。正在快速迭代更新中，**欢迎反馈问题和需求，及时关注项目更新！目前更新会非常频繁，后续会增加大量新功能以及优化效果。**

---

## ✨ 功能特性

- 🎬 **AI 剧本分析** — 自动解析小说，提取角色、场景、剧情
- 🎨 **角色 & 场景生成** — AI 生成一致性人物和场景图片
- 📽️ **分镜视频制作** — 自动生成分镜头并合成视频
- 🎙️ **AI 配音** — 多角色语音合成
- 🌐 **多语言支持** — 中文 / 英文界面，右上角一键切换

---

## 🚀 快速开始

**前提条件**：安装 [Docker Desktop](https://docs.docker.com/get-docker/)

### 方式一：拉取预构建镜像（最简单）

无需克隆仓库，下载即用：

```bash
# 下载 docker-compose.yml
curl -O https://raw.githubusercontent.com/aspskys/seavideo/main/docker-compose.yml

# 启动所有服务
docker compose up -d
```

> ⚠️ 当前为测试版，版本间数据库不兼容。升级请先清除旧数据：

```bash
docker compose down -v
docker rmi ghcr.io/aspskys/seavideo:latest
curl -O https://raw.githubusercontent.com/aspskys/seavideo/main/docker-compose.yml
docker compose up -d
```

> 启动后请**清空浏览器缓存**并重新登录，避免旧版本缓存导致异常。

### 方式二：克隆仓库 + Docker 构建（完全控制）

```bash
git clone https://github.com/aspskys/seavideo.git
cd seavideo
docker compose up -d
```

更新版本：

```bash
git pull
docker compose down && docker compose up -d --build
```

### 方式三：本地开发模式（开发者）

```bash
git clone https://github.com/aspskys/seavideo.git
cd seavideo
npm install

# 只启动基础设施
docker compose up mysql redis minio -d

# 运行数据库迁移
npx prisma db push

# 启动开发服务器
npm run dev
```

---

访问 [http://localhost:13000](http://localhost:13000)（方式一、二）或 [http://localhost:3000](http://localhost:3000)（方式三）开始使用！

> 首次启动会自动完成数据库初始化，无需任何额外配置。

> [!TIP]
> **如果遇到网页卡顿**：HTTP 模式下浏览器可能限制并发连接。可安装 [Caddy](https://caddyserver.com/docs/install) 启用 HTTPS：
>
> ```bash
> caddy run --config Caddyfile
> ```
>
> 然后访问 [https://localhost:1443](https://localhost:1443)

---

## 🔧 API 配置

启动后进入**设置中心**配置 AI 服务的 API Key，内置配置教程。

> 💡 **注意**：目前仅推荐使用各服务商官方 API，第三方兼容格式（OpenAI Compatible）尚不完善，后续版本会持续优化。

---

## 📦 技术栈

- **框架**: Next.js 15 + React 19
- **数据库**: MySQL + Prisma ORM
- **队列**: Redis + BullMQ
- **样式**: Tailwind CSS v4
- **认证**: NextAuth.js

---

## 📦 页面功能预览

 

---

## 🤝 参与方式

本项目由星海核心团队维护。欢迎通过以下方式参与：

- 🐛 提交 [Issue](https://github.com/aspskys/seavideo/issues) 反馈 Bug
- 💡 提交 [Issue](https://github.com/aspskys/seavideo/issues) 提出功能建议
- 🔧 提交 Pull Request — 团队会认真审阅每一个 PR

---

**Made with ❤️ by seavideo team**