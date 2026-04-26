# Minder 用户指南

> 🧠 AI驱动的个人知识管理平台 — 完整使用手册

---

## 目录

1. [快速开始](#快速开始)
2. [核心概念](#核心概念)
3. [功能详解](#功能详解)
4. [API使用](#api使用)
5. [配置说明](#配置说明)
6. [常见问题](#常见问题)

---

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/MoKangMedical/minder.git
cd minder

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置
```

### 启动

```bash
# 启动 Streamlit 原型
streamlit run src/app.py

# 或者启动 API 服务
uvicorn src.api:app --reload --port 8000
```

浏览器访问 `http://localhost:8501` 即可使用。

---

## 核心概念

### 知识条目（Knowledge Item）

知识条目是 Minder 中的基本单位。每条知识都有：

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 唯一标识 | `kb_001` |
| `title` | 标题 | "Transformer架构详解" |
| `content` | 内容正文 | 完整文本 |
| `type` | 知识类型 | article / note / idea / question / inspiration / project |
| `tags` | 标签列表 | `["AI", "深度学习"]` |
| `source_url` | 来源URL | `https://example.com` |
| `added_at` | 添加时间 | ISO 8601格式 |

### 知识类型

| 类型 | 图标 | 用途 |
|------|------|------|
| `article` | 📄 | 从外部采集的文章 |
| `note` | 📝 | 个人笔记、学习记录 |
| `idea` | 💡 | 想法、创意、假设 |
| `question` | ❓ | 待解答的问题 |
| `inspiration` | ✨ | 灵感火花 |
| `project` | 🎯 | 项目相关知识 |

### 知识图谱

知识图谱由**节点**（知识条目）和**边**（知识关系）组成：

- **相关** — 两个知识点有语义关联
- **引用** — 一个引用了另一个
- **扩展** — 一个是另一个的深入
- **矛盾** — 两个存在观点冲突
- **灵感来源** — 一个启发了另一个

---

## 功能详解

### 1. 多源采集

#### 网页采集

```python
from src.crawler import WebCrawler

crawler = WebCrawler()

# 基础采集
result = crawler.crawl("https://example.com/article")

# 指定提取模式
result = crawler.crawl("https://example.com/article", extract_mode="summary")

# 批量采集
results = crawler.crawl_batch([
    "https://url1.com",
    "https://url2.com",
])
```

提取模式说明：
- `full` — 提取完整正文（默认）
- `summary` — 提取前500字作为摘要
- `metadata` — 仅提取标题、作者等元数据

#### PDF采集

```python
from src.crawler import PDFCrawler

pdf_crawler = PDFCrawler()
result = pdf_crawler.crawl("/path/to/paper.pdf")
```

### 2. 智能整理

```python
from src.organizer import KnowledgeOrganizer

organizer = KnowledgeOrganizer()

# 处理单条内容
result = organizer.process("今天学习了Transformer架构...")
print(f"类型: {result.item_type}")
print(f"标签: {result.tags}")
print(f"摘要: {result.summary}")

# 批量处理
items = [
    {"content": "内容1", "title": "标题1"},
    {"content": "内容2", "title": "标题2"},
]
results = organizer.process_batch(items)
```

### 3. 语义搜索

```python
from src.search import SemanticSearch

search = SemanticSearch()

# 添加文档
search.add_document(
    doc_id="doc1",
    title="Transformer详解",
    content="Transformer是基于自注意力机制的...",
    item_type="article",
    tags=["AI", "深度学习"],
)

# 搜索
results = search.query("注意力机制原理")
for r in results:
    print(f"[{r.score:.2f}] {r.title}")

# 关联推荐
related = search.find_related("doc1", limit=5)
```

### 4. 知识图谱

加载示例图谱：

```python
import json

with open("data/sample-kg.json") as f:
    kg = json.load(f)

print(f"节点数: {len(kg['nodes'])}")
print(f"关系数: {len(kg['edges'])}")

# 查看节点
for node in kg["nodes"]:
    print(f"  [{node['type']}] {node['label']}")

# 查看关系
for edge in kg["edges"]:
    print(f"  {edge['source']} --{edge['relation']}--> {edge['target']}")
```

---

## API使用

### 认证

所有API请求需要在请求头中携带JWT Token：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/items
```

### 知识条目API

```bash
# 创建
curl -X POST http://localhost:8000/api/v1/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"content": "今天学到了...", "type": "note", "tags": ["学习"]}'

# 列表
curl http://localhost:8000/api/v1/items?type=note&page=1

# 详情
curl http://localhost:8000/api/v1/items/{item_id}

# 更新
curl -X PUT http://localhost:8000/api/v1/items/{item_id} \
  -H "Content-Type: application/json" \
  -d '{"tags": ["学习", "AI"]}'

# 删除
curl -X DELETE http://localhost:8000/api/v1/items/{item_id}
```

### 搜索API

```bash
curl -X POST http://localhost:8000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "深度学习", "limit": 10}'
```

### 采集API

```bash
curl -X POST http://localhost:8000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "extract_mode": "full"}'
```

---

## 配置说明

### 环境变量

在 `.env` 文件中配置：

```bash
# LLM配置（可选，不配置则使用本地规则引擎）
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4

# 或使用 DeepSeek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_MODEL=deepseek-chat

# 向量数据库
CHROMA_PERSIST_DIR=./data/chroma

# 服务配置
API_HOST=0.0.0.0
API_PORT=8000

# 数据库（可选）
DATABASE_URL=postgresql://user:pass@localhost:5432/minder
```

### Docker配置

```yaml
# docker-compose.yml
services:
  minder:
    build: .
    ports:
      - "8501:8501"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
```

---

## 常见问题

### Q: 需要OpenAI API Key吗？

A: 不必须。Minder 设计为可以**完全离线运行**。不配置LLM时，使用本地规则引擎进行分类和标签。配置LLM后，功能会更智能。

### Q: 支持中文吗？

A: 完全支持。采集、搜索、整理都针对中文做了优化。

### Q: 数据存在哪里？

A: 默认使用本地文件存储。生产环境推荐使用 PostgreSQL + Chroma。

### Q: 如何导入已有笔记？

A: 支持多种方式：
1. 直接复制粘贴到"记录"页面
2. 使用API批量导入
3. 从Notion/Obsidian同步（规划中）

### Q: 知识图谱如何生成？

A: 新知识入库时，AI会自动分析与已有知识的关联，更新图谱。你也可以手动添加关系。

---

## 更多资源

- [README](../README.md) — 项目概览
- [API文档](README.md) — 完整API参考
- [贡献指南](../CONTRIBUTING.md) — 如何参与贡献
- [更新日志](../CHANGELOG.md) — 版本更新记录

---

*Minder — 让知识不再碎片化 🧠*
