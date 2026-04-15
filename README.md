# 教育辅助平台

集成**文本校对**、**文档查重**、**数据分析**三大核心功能，助力教育工作者高效处理试卷和成绩数据。

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (端口 80)                        │
│              前端静态资源 + API 反向代理                    │
├─────────────┬──────────────┬────────────────────────────┤
│             │              │                            │
│  /api/proofread  /api/dedup   /api/analysis             │
│             │              │                            │
│             ▼              ▼                            │
│     ┌──────────────────────────────┐                   │
│     │   FastAPI 后端服务 (端口 8000)  │                   │
│     │  - 文本校对 (Dify 工作流)      │                   │
│     │  - 文档查重 (Dify RAG)        │                   │
│     │  - 数据分析 (Pandas/SciPy)    │                   │
│     │  - Celery 异步任务            │                   │
│     └──────┬───────┬───────┬───────┘                   │
│            │       │       │                            │
│     ┌──────┘  ┌────┘  ┌────┘                           │
│     ▼         ▼       ▼                                │
│  PostgreSQL  Redis   Dify 自托管                        │
│  (数据存储)  (缓存)  (AI 工作流引擎)                     │
│                       │                                │
│                  ┌────┴────┐                            │
│                  ▼         ▼                            │
│              Weaviate   DeepSeek                        │
│             (向量数据库)  (LLM 模型)                     │
└─────────────────────────────────────────────────────────┘
```

## ✨ 功能特性

### 📝 文本校对
- 自动检测错别字、语法错误、格式问题
- 基于 DeepSeek 大模型的智能校对
- TipTap 富文本编辑器高亮标注错误
- 支持 Word/PDF/TXT 文件上传
- 一键采纳修改建议

### 📄 文档查重
- 三级查重策略：MD5 完全一致 → 向量语义相似 → LLM 核心内容分析
- 基于 Weaviate 向量数据库的语义检索
- 支持文档库增量导入
- 可视化相似度对比

### 📊 数据分析
- 考试成绩分布分析（直方图、正态性检验）
- 题目难度系数计算
- 区分度指数分析
- 信度分析（Cronbach's Alpha、KR-20）
- 支持 CSV 上传和数据库连接
- Celery 异步处理大数据集
- 导出 PDF/PNG 分析报告

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Tailwind CSS 4 + Vite |
| UI 组件 | shadcn/ui + Radix UI + Lucide Icons |
| 图表 | ECharts 6 |
| 富文本 | TipTap |
| 后端 | FastAPI + Python 3.12 |
| AI 引擎 | Dify 自托管 + DeepSeek |
| 向量数据库 | Weaviate |
| 数据库 | PostgreSQL 16 |
| 缓存/队列 | Redis 7 + Celery |
| 对象存储 | MinIO |
| 容器化 | Docker Compose |

## 🚀 快速开始

### 前置要求

- Docker & Docker Compose
- DeepSeek API Key（[获取地址](https://platform.deepseek.com/)）

### 1. 克隆项目

```bash
git clone <repository-url>
cd edu-assistant-platform
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 DeepSeek API Key 等配置
```

### 3. 启动主应用服务

```bash
docker-compose up -d
```

这将启动：
- 前端应用（端口 80）
- 后端 API 服务（端口 8000）
- PostgreSQL（端口 5432）
- Redis（端口 6379）
- MinIO（端口 9000/9001）

### 4. 启动 Dify 服务（可选，用于 AI 校对和查重）

```bash
cd dify/docker
cp ../.env .env
docker-compose up -d
```

这将启动：
- Dify API（端口 5001）
- Dify Web 控制台（端口 3001 → 通过 Nginx 访问 3002）
- Weaviate 向量数据库（端口 8080）
- Dify 专用 PostgreSQL（端口 5433）
- Dify 专用 Redis（端口 6380）

### 5. 配置 Dify

1. 访问 Dify 控制台：`http://localhost:3002`
2. 注册管理员账号
3. 进入 **设置 → 模型提供商**，添加 DeepSeek，填入 API Key
4. 创建校对工作流（参考 `dify/workflows/proofread.yml`）
5. 创建查重工作流（参考 `dify/workflows/dedup.yml`）
6. 获取工作流 API Key，填入 `.env` 中的 `DIFY_PROOFREAD_API_KEY` 和 `DIFY_DEDUP_API_KEY`

### 6. 访问应用

- 前端应用：`http://localhost`
- 后端 API 文档：`http://localhost:8000/docs`
- Dify 控制台：`http://localhost:3002`

## 💻 本地开发

### 前端开发

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

### 后端开发

```bash
cd analysis-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Celery Worker（异步任务）

```bash
cd analysis-service
celery -A app.services.celery_tasks worker --loglevel=info
```

## 📁 项目结构

```
edu-assistant-platform/
├── frontend/                    # 前端应用
│   ├── src/
│   │   ├── components/          # 通用组件
│   │   │   ├── RichEditor.tsx   # TipTap 富文本标注组件
│   │   │   ├── FileUpload.tsx   # 文件上传组件
│   │   │   ├── Layout.tsx       # 页面布局
│   │   │   └── ui/              # shadcn/ui 基础组件
│   │   ├── pages/               # 页面组件
│   │   │   ├── Home.tsx         # 工作台首页
│   │   │   ├── Proofread.tsx    # 文本校对
│   │   │   ├── Dedup.tsx        # 文档查重
│   │   │   └── Analysis.tsx     # 数据分析
│   │   └── services/            # API 服务层
│   │       └── api.ts           # Axios API 封装
│   ├── nginx.conf               # Nginx 反向代理配置
│   └── Dockerfile
├── analysis-service/            # 后端服务
│   ├── app/
│   │   ├── api/                 # API 路由
│   │   │   ├── analysis.py      # 数据分析路由
│   │   │   ├── proofread.py     # 文本校对路由
│   │   │   └── dedup.py         # 文档查重路由
│   │   ├── services/            # 业务逻辑
│   │   │   ├── analyzer.py      # 考试数据分析器
│   │   │   ├── proofreader.py   # 校对服务
│   │   │   ├── dedup.py         # 查重服务
│   │   │   └── dify_client.py   # Dify API 客户端
│   │   └── models/              # 数据模型
│   ├── requirements.txt
│   └── Dockerfile
├── dify/                        # Dify 自托管配置
│   ├── docker/
│   │   ├── docker-compose.yml   # Dify 服务编排
│   │   └── nginx.conf           # Dify 网关配置
│   ├── workflows/               # 工作流配置参考
│   │   ├── proofread.yml        # 校对工作流
│   │   └── dedup.yml            # 查重工作流
│   └── .env                     # Dify 环境变量
├── docker-compose.yml           # 主应用服务编排
├── .env.example                 # 环境变量模板
├── pack.sh                      # 离线打包脚本（生成可移植部署包）
├── deploy.sh                    # 一键在线部署脚本
├── README.md                    # 项目文档
└── LICENSE
```

## � 一键在线部署（推荐）

在全新服务器上，只需两条命令即可完成部署。脚本会自动安装 Docker、Git 等依赖，拉取镜像并启动所有服务。

```bash
# 1. 克隆代码
git clone https://github.com/chenp0401/Learning-Analytics-Platform.git
cd Learning-Analytics-Platform

# 2. 一键部署
bash deploy.sh
```

> **部署脚本会自动完成：**
> - ✅ 检测并安装 Docker、Docker Compose、Git（如果未安装）
> - ✅ 配置环境变量（从 `.env.example` 生成 `.env`）
> - ✅ 初始化 Dify 运行环境（sandbox、plugin 目录等）
> - ✅ 拉取所有 Docker 镜像并构建前端/后端服务
> - ✅ 启动全部服务（主应用 + Dify AI 引擎）
> - ✅ 自动初始化 Dify 管理员账号
>
> **前置要求**：服务器需要能访问外网（拉取 Docker 镜像和 GitHub 代码）。

### 部署完成后

| 服务 | 地址 |
|------|------|
| 平台首页 | `http://<服务器IP>` |
| 文本校对 | `http://<服务器IP>/proofread` |
| 文档查重 | `http://<服务器IP>/dedup` |
| 数据分析 | `http://<服务器IP>/analysis` |
| 文档库入口 | `http://<服务器IP>/knowledge` |
| Dify 控制台 | `http://<服务器IP>/signin` |
| API 文档 | `http://<服务器IP>:8000/docs` |

**Dify 管理员账号**：`admin@edu-platform.com` / `Admin@123456`

### 更新代码

```bash
cd Learning-Analytics-Platform
git pull
sudo COMPOSE_PROJECT_NAME=edu-platform docker compose up -d --build
```

## 📦 离线打包部署（备选）

如果目标服务器无法联网，可使用离线打包方式：

### 在当前服务器上打包

```bash
# 运行打包脚本（会导出所有 Docker 镜像 + 源代码，约 2.3GB）
sudo bash pack.sh
```

### 在新服务器上部署

```bash
# 1. 将部署包传输到新服务器
scp release/edu-platform-*.tar.gz user@new-server:/opt/

# 2. 在新服务器上解压并部署
cd /opt && tar xzf edu-platform-*.tar.gz
cd edu-platform-* && bash deploy.sh
```

> **前置要求**：新服务器需要已安装 Docker 和 Docker Compose，无需联网。

## 📄 License

MIT License
