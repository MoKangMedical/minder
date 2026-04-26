<div align="center">

# 🧠 Minder

### AI驱动的个人知识管理平台

**让你的知识不再碎片化，AI帮你整理、连接、应用**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-green.svg)](https://python.org)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28+-red.svg)](https://streamlit.io)

[快速开始](#-快速开始) · [核心功能](#-核心功能) · [技术架构](#-技术架构) · [API文档](#-api文档) · [用户指南](docs/user-guide.md)

</div>

---

## 📖 项目简介

Minder 是一个开源的 AI 驱动个人知识管理平台。它解决了现代人面临的核心问题：**信息过载但知识碎片化**。

你每天从网页、PDF、播客、视频中获取大量信息，但这些信息散落在各个角落，无法形成系统化的知识。Minder 用 AI 帮你完成从**采集 → 整理 → 连接 → 检索 → 输出**的完整知识生命周期管理。

### 一句话总结

> **把碎片化的信息变成结构化的知识，把孤立的知识点变成互联的知识网络。**

---

## ✨ 核心功能

### 1. 📥 多源采集

从多种来源一键采集内容，统一纳入知识库：

| 来源 | 方式 | 支持格式 |
|------|------|----------|
| 网页 | URL粘贴 / 浏览器插件 | HTML → Markdown |
| PDF | 文件上传 / 文件夹监控 | PDF全文+元数据 |
| 笔记 | 直接输入 / API导入 | Markdown / 纯文本 |
| 播客 | RSS订阅 / 音频上传 | 音频 → 文字转录 |
| 视频 | YouTube/Bilibili链接 | 字幕提取 + 摘要 |
| 微信 | 公众号文章链接 | HTML → Markdown |

```python
from src.crawler import WebCrawler

crawler = WebCrawler()
article = crawler.crawl("https://example.com/article")
# 返回: { title, content, author, tags, summary }
```

### 2. 🏷️ 智能整理

AI 自动完成知识的结构化处理：

- **自动标签**：基于内容语义生成标签，而非简单关键词匹配
- **智能分类**：按知识类型（文章/笔记/想法/问题/灵感/项目）自动归类
- **自动摘要**：生成简洁准确的内容摘要
- **去重检测**：识别重复或高度相似的内容
- **关系发现**：自动发现与已有知识的关联

```python
from src.organizer import KnowledgeOrganizer

organizer = KnowledgeOrganizer()
result = organizer.process(raw_content)
# 返回: { type, tags, summary, related_items, duplicate_check }
```

### 3. 🕸️ 知识图谱

自动构建知识关联网络，让知识不再是孤岛：

- **节点**：每个知识点是一个节点（文章、概念、人物、项目...）
- **边**：AI 发现的知识关联（引用、相似、因果、时序...）
- **可视化**：交互式图谱浏览，支持缩放、筛选、聚焦
- **自动扩展**：新知识入库时自动更新图谱

```json
{
  "nodes": [
    { "id": "k1", "label": "Transformer架构", "type": "concept" },
    { "id": "k2", "label": "注意力机制", "type": "concept" }
  ],
  "edges": [
    { "source": "k1", "target": "k2", "relation": "包含", "weight": 0.95 }
  ]
}
```

### 4. 🔍 智能检索

超越关键词搜索的语义检索：

- **语义搜索**：理解查询意图，而非字面匹配
- **关联推荐**：搜索一个知识点时，自动推荐相关知识
- **时间线**：按时间维度浏览知识获取历程
- **过滤器**：按类型、标签、来源、日期多维筛选
- **自然语言查询**：用日常语言提问，如"上周看的那篇关于AI的文章"

```python
from src.search import SemanticSearch

search = SemanticSearch()
results = search.query("深度学习在医疗影像中的应用")
# 返回语义最相关的知识条目，按相关度排序
```

### 5. ✍️ 知识输出

将知识转化为有价值的输出物：

- **AI辅助写作**：基于知识库内容辅助撰写文章
- **知识卡片**：自动生成精美的知识摘要卡片
- **思维导图**：将知识结构转化为思维导图
- **周报/月报**：自动生成知识获取周报
- **分享链接**：一键生成可分享的知识页面

### 6. 🔄 回顾提醒

基于间隔重复原理，让知识保持鲜活：

- **智能复习**：根据遗忘曲线安排复习时间
- **知识保鲜**：定期推送旧知识的关联新内容
- **学习统计**：可视化你的知识增长曲线
- **目标追踪**：设定学习目标并追踪进度

### 7. 👥 团队协作

知识不只是个人的事：

- **共享知识库**：团队成员共享知识空间
- **权限管理**：精细的读写权限控制
- **协作标注**：多人对同一内容添加笔记
- **知识评审**：团队评审和讨论机制

### 8. 🔌 API集成

与你常用的工具互通：

| 工具 | 集成方式 | 功能 |
|------|----------|------|
| Notion | API双向同步 | 笔记导入/导出 |
| Obsidian | 本地文件同步 | Markdown文件互通 |
| Readwise | API导入 | 高亮和笔记同步 |
| Pocket | API导入 | 稍后读列表同步 |
| Hypothesis | API导入 | 网页标注同步 |
| 浏览器 | Chrome/Firefox插件 | 一键采集 |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    前端层 (Frontend)                  │
│  Streamlit 原型 ─── React WebApp ─── 移动端 (规划中)   │
└──────────────────────┬──────────────────────────────┘
                       │ REST API / WebSocket
┌──────────────────────┴──────────────────────────────┐
│                   后端层 (Backend)                    │
│  FastAPI Server ─── 认证 ─── 限流 ─── 日志            │
├─────────────────────────────────────────────────────┤
│                  核心服务层 (Services)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 采集服务  │ │ 整理服务  │ │ 搜索服务  │ │ 图谱服务 │ │
│  │ Crawler  │ │Organizer │ │ Search   │ │  Graph  │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
├─────────────────────────────────────────────────────┤
│                  AI 引擎层 (AI Engine)                │
│  Embedding (BGE/ADA) ─── LLM (GPT/DeepSeek/本地)     │
├─────────────────────────────────────────────────────┤
│                  数据层 (Data Layer)                  │
│  PostgreSQL ─── Milvus/Chroma ─── Redis ─── MinIO    │
│  (结构化数据)    (向量存储)       (缓存)    (文件存储)   │
└─────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | Streamlit / React | 原型用Streamlit，正式版用React |
| 后端 | FastAPI | 高性能异步Python框架 |
| AI引擎 | OpenAI / DeepSeek / 本地LLM | 可切换，支持离线部署 |
| 向量库 | Chroma / Milvus | 语义搜索核心 |
| 关系库 | PostgreSQL + JSONB | 结构化数据+灵活存储 |
| 缓存 | Redis | 热点数据和会话缓存 |
| 对象存储 | MinIO / S3 | 文件和媒体存储 |
| 容器化 | Docker + Compose | 一键部署 |

---

## 🚀 快速开始

### 前置条件

- Python 3.9+
- pip 或 poetry
- （可选）Docker 和 Docker Compose

### 方式一：本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/MoKangMedical/minder.git
cd minder

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API Key

# 4. 启动 Streamlit 原型
streamlit run src/app.py

# 浏览器自动打开 http://localhost:8501
```

### 方式二：Docker 部署

```bash
# 一键启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问 http://localhost:8501
```

### 方式三：仅体验核心功能

```python
# 快速体验采集功能
from src.crawler import WebCrawler
crawler = WebCrawler()
result = crawler.crawl("https://example.com")
print(result)

# 快速体验搜索功能
from src.search import SemanticSearch
search = SemanticSearch()
results = search.query("你的问题")
for r in results:
    print(f"[{r['score']:.2f}] {r['title']}")
```

---

## 📁 项目结构

```
minder/
├── src/                    # 核心源码
│   ├── app.py             # Streamlit 原型入口
│   ├── crawler.py         # 多源采集模块
│   ├── organizer.py       # 智能整理模块
│   └── search.py          # 语义搜索模块
├── data/                   # 数据文件
│   ├── knowledge-types.json  # 知识类型定义
│   └── sample-kg.json        # 示例知识图谱
├── docs/                   # 文档
│   ├── user-guide.md      # 用户指南
│   └── README.md          # API文档
├── tests/                  # 测试
├── scripts/                # 部署脚本
├── docker-compose.yml      # Docker编排
├── Dockerfile              # 容器构建
└── .env.example            # 环境变量模板
```

---

## 📡 API文档

### 基础信息

- **Base URL**: `http://localhost:8000/api/v1`
- **认证方式**: Bearer Token (JWT)
- **请求格式**: JSON
- **响应格式**: JSON

### 核心接口

#### 知识条目

```http
# 创建知识条目
POST /api/v1/items
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "今天学到了...",
  "type": "note",
  "tags": ["学习", "AI"],
  "source_url": "https://example.com"
}

# 获取知识列表
GET /api/v1/items?type=article&tag=AI&page=1&per_page=20

# 获取单条知识
GET /api/v1/items/{item_id}

# 更新知识
PUT /api/v1/items/{item_id}

# 删除知识
DELETE /api/v1/items/{item_id}
```

#### 搜索

```http
# 语义搜索
POST /api/v1/search
Content-Type: application/json

{
  "query": "深度学习在医疗中的应用",
  "limit": 10,
  "filters": {
    "type": "article",
    "date_from": "2024-01-01"
  }
}

# 关联推荐
GET /api/v1/items/{item_id}/related?limit=5
```

#### 知识图谱

```http
# 获取图谱数据
GET /api/v1/graph?depth=2&center={node_id}

# 添加关系
POST /api/v1/graph/edges
{
  "source": "item_1",
  "target": "item_2",
  "relation": "相关",
  "weight": 0.8
}
```

#### 采集

```http
# 网页采集
POST /api/v1/crawl
{
  "url": "https://example.com/article",
  "extract_mode": "full"
}

# 批量采集
POST /api/v1/crawl/batch
{
  "urls": ["url1", "url2", "url3"]
}
```

### 响应格式

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

### 错误码

| 状态码 | 含义 | 说明 |
|--------|------|------|
| 200 | 成功 | 请求正常完成 |
| 201 | 已创建 | 资源创建成功 |
| 400 | 请求错误 | 参数校验失败 |
| 401 | 未认证 | Token缺失或无效 |
| 403 | 无权限 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 429 | 请求过多 | 触发限流，请稍后重试 |
| 500 | 服务器错误 | 内部错误 |

---

## 🎯 使用场景

### 场景一：研究者

> 每天阅读大量论文和文章，需要系统化管理文献和想法

- 采集论文PDF → AI提取摘要和关键发现
- 自动构建研究领域的知识图谱
- 语义搜索快速找到相关研究
- 自动生成文献综述草稿

### 场景二：内容创作者

> 需要从各种来源收集素材和灵感

- 网页/播客/视频一键采集
- AI自动打标签和分类
- 写作时智能推荐相关素材
- 生成知识卡片用于社交媒体

### 场景三：学习者

> 正在系统学习某个领域

- 按主题组织学习笔记
- 知识图谱可视化学习进度
- 间隔重复巩固知识点
- AI问答检验学习效果

### 场景四：团队

> 团队需要共享和管理项目知识

- 团队共享知识库
- 新成员快速了解项目背景
- 知识评审和讨论
- 自动生成团队知识周报

---

## 🗺️ 路线图

- [x] **v0.1** — 基础采集和整理功能
- [x] **v0.2** — Streamlit 原型 + 语义搜索
- [ ] **v0.3** — 知识图谱可视化
- [ ] **v0.4** — 回顾提醒系统
- [ ] **v0.5** — 团队协作功能
- [ ] **v1.0** — 正式发布（React前端 + 完整API）
- [ ] **v1.1** — 移动端App
- [ ] **v1.2** — 浏览器插件
- [ ] **v2.0** — 本地LLM完整支持，完全离线运行

---

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

### 贡献方式

- 🐛 提交Bug报告
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码PR
- ⭐ Star这个项目

### 开发环境

```bash
# 克隆并安装开发依赖
git clone https://github.com/MoKangMedical/minder.git
cd minder
pip install -r requirements.txt -r requirements-dev.txt

# 运行测试
pytest tests/ -v

# 代码格式化
black src/ tests/
isort src/ tests/
```

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

- [Streamlit](https://streamlit.io) — 快速原型框架
- [LangChain](https://langchain.com) — AI应用开发框架
- [Chroma](https://www.trychroma.com) — 向量数据库
- [FastAPI](https://fastapi.tiangolo.com) — 高性能Web框架

---

<div align="center">

**如果 Minder 对你有帮助，请给个 ⭐ Star 支持一下！**

[![Star History Chart](https://api.star-history.com/svg?repos=MoKangMedical/minder&type=Date)](https://star-history.com/#MoKangMedical/minder&Date)

</div>
