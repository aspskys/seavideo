

# seavideo — Seahai AI Comic Drama Workbench

An internal AI-powered tool for creating short drama / comic videos — automatically generates storyboards, characters, and scenes from novel text, then assembles them into complete videos.

[中文文档](README.md) · [Report Bug](https://github.com/aspskys/seavideo/issues)

> [!IMPORTANT]
> ⚠️ **Beta Notice**: This project is currently in its early beta stage. Some bugs and imperfections are to be expected. We are iterating rapidly — **your feedback and feature requests are highly welcome! Updates are very frequent, with many new features and optimizations on the way.**

---

## ✨ Features

- 🎬 **AI Script Analysis** — Parse novels, extract characters, scenes & plot automatically
- 🎨 **Character & Scene Generation** — Consistent AI-generated character and scene images
- 📽️ **Storyboard Video** — Auto-generate shots and compose into complete videos
- 🎙️ **AI Voiceover** — Multi-character voice synthesis
- 🌐 **Bilingual UI** — Chinese / English, switch in the top-right corner

---

## 🚀 Quick Start

**Prerequisites**: Install [Docker Desktop](https://docs.docker.com/get-docker/)

### Method 1: Pull Pre-built Image (Easiest)

No need to clone the repository. Just download and run:

```bash
# Download docker-compose.yml
curl -O https://raw.githubusercontent.com/aspskys/seavideo/main/docker-compose.yml

# Start all services
docker compose up -d
```

> ⚠️ This is a beta version. Database is not compatible between versions. To upgrade, clear old data first:

```bash
docker compose down -v
docker rmi ghcr.io/aspskys/seavideo:latest
curl -O https://raw.githubusercontent.com/aspskys/seavideo/main/docker-compose.yml
docker compose up -d
```

> After starting, please **clear your browser cache** and log in again to avoid issues caused by stale cache.

### Method 2: Clone & Docker Build (Full Control)

```bash
git clone https://github.com/aspskys/seavideo.git
cd seavideo
docker compose up -d
```

To update:

```bash
git pull
docker compose down && docker compose up -d --build
```

### Method 3: Local Development (For Developers)

```bash
git clone https://github.com/aspskys/seavideo.git
cd seavideo
npm install

# Start infrastructure only
docker compose up mysql redis minio -d

# Run database migration
npx prisma db push

# Start development server
npm run dev
```

---

Visit [http://localhost:13000](http://localhost:13000) (Method 1 & 2) or [http://localhost:3000](http://localhost:3000) (Method 3) to get started!

> The database is initialized automatically on first launch — no extra configuration needed.

> [!TIP]
> **If you experience lag**: HTTP mode may limit browser connections. Install [Caddy](https://caddyserver.com/docs/install) for HTTPS:
>
> ```bash
> caddy run --config Caddyfile
> ```
>
> Then visit [https://localhost:1443](https://localhost:1443)

---

## 🔧 API Configuration

After launching, go to **Settings** to configure your AI service API keys. A built-in guide is provided.

> 💡 **Note**: Currently only official provider APIs are recommended. Third-party compatible formats (OpenAI Compatible) are not yet fully supported and will be improved in future releases.

---

## 📦 Tech Stack

- **Framework**: Next.js 15 + React 19
- **Database**: MySQL + Prisma ORM
- **Queue**: Redis + BullMQ
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth.js

---

## 📦 Preview

 

---

## 🤝 Contributing

This project is maintained by the Seahai core team. You're welcome to contribute by:

- 🐛 Filing [Issues](https://github.com/aspskys/seavideo/issues) — report bugs
- 💡 Filing [Issues](https://github.com/aspskys/seavideo/issues) — propose features
- 🔧 Submitting Pull Requests — the team reviews every PR carefully

---

**Made with ❤️ by seavideo team**
