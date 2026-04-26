# Minder API 文档

> 🧠 AI驱动的个人知识管理平台 — API接口参考

---

## 概述

Minder API 提供了完整的知识管理功能，包括知识条目的增删改查、语义搜索、知识图谱操作和多源采集。

- **Base URL**: `http://localhost:8000/api/v1`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **认证方式**: Bearer Token (JWT)

---

## 认证

### 登录获取Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

**响应：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### 使用Token

所有后续请求需要在Header中携带：

```
Authorization: Bearer <access_token>
```

---

## 知识条目 API

### 创建知识条目

```http
POST /api/v1/items
Content-Type: application/json

{
  "content": "今天学习了Transformer架构，核心是自注意力机制...",
  "title": "Transformer学习笔记",
  "type": "note",
  "tags": ["AI", "深度学习", "Transformer"],
  "source_url": "https://example.com/article"
}
```

**响应 (201)：**
```json
{
  "success": true,
  "data": {
    "id": "item_abc123",
    "title": "Transformer学习笔记",
    "content": "今天学习了Transformer架构...",
    "type": "note",
    "tags": ["AI", "深度学习", "Transformer"],
    "source_url": "https://example.com/article",
    "added_at": "2024-01-15T10:30:00Z",
    "auto_summary": "Transformer架构学习笔记，涵盖自注意力机制核心原理",
    "related_items": ["item_xyz789"]
  }
}
```

### 获取知识列表

```http
GET /api/v1/items?page=1&per_page=20&type=note&tag=AI
```

**查询参数：**

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `page` | int | 页码 | 1 |
| `per_page` | int | 每页数量 | 20 |
| `type` | string | 知识类型过滤 | 全部 |
| `tag` | string | 标签过滤 | 全部 |
| `sort` | string | 排序字段 (added_at/updated_at/title) | added_at |
| `order` | string | 排序方向 (asc/desc) | desc |
| `q` | string | 标题/内容关键词搜索 | - |

**响应 (200)：**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_abc123",
      "title": "Transformer学习笔记",
      "type": "note",
      "tags": ["AI", "深度学习"],
      "summary": "Transformer架构学习笔记",
      "added_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 获取单条知识

```http
GET /api/v1/items/{item_id}
```

**响应 (200)：**
```json
{
  "success": true,
  "data": {
    "id": "item_abc123",
    "title": "Transformer学习笔记",
    "content": "完整内容...",
    "type": "note",
    "tags": ["AI", "深度学习"],
    "source_url": "https://example.com",
    "added_at": "2024-01-15T10:30:00Z",
    "related_items": [
      { "id": "item_xyz", "title": "注意力机制详解", "score": 0.85 }
    ]
  }
}
```

### 更新知识条目

```http
PUT /api/v1/items/{item_id}
Content-Type: application/json

{
  "title": "更新后的标题",
  "tags": ["AI", "Transformer", "新标签"]
}
```

### 删除知识条目

```http
DELETE /api/v1/items/{item_id}
```

**响应 (200)：**
```json
{ "success": true, "message": "已删除" }
```

### 批量操作

```http
POST /api/v1/items/batch
Content-Type: application/json

{
  "action": "delete",
  "item_ids": ["item_1", "item_2", "item_3"]
}
```

支持的批量操作：`delete` / `tag` / `move`

---

## 搜索 API

### 语义搜索

```http
POST /api/v1/search
Content-Type: application/json

{
  "query": "深度学习在医疗影像中的应用",
  "limit": 10,
  "filters": {
    "type": "article",
    "tags": ["AI", "医疗"],
    "date_from": "2024-01-01",
    "date_to": "2024-12-31"
  }
}
```

**响应 (200)：**
```json
{
  "success": true,
  "data": [
    {
      "item_id": "item_abc",
      "title": "医疗影像AI综述",
      "content": "完整内容...",
      "score": 0.92,
      "type": "article",
      "tags": ["AI", "医疗", "计算机视觉"],
      "snippet": "...深度学习在X光、CT、MRI的自动分析中取得了显著进展..."
    }
  ],
  "meta": {
    "query": "深度学习在医疗影像中的应用",
    "total_results": 5,
    "search_time_ms": 23
  }
}
```

### 关联推荐

```http
GET /api/v1/items/{item_id}/related?limit=5
```

返回与指定知识条目语义最相关的其他条目。

---

## 知识图谱 API

### 获取图谱数据

```http
GET /api/v1/graph?depth=2&center={node_id}&limit=50
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `center` | string | 中心节点ID（可选） |
| `depth` | int | 展开深度（默认2） |
| `limit` | int | 最大节点数（默认50） |
| `type` | string | 节点类型过滤 |

**响应 (200)：**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "item_abc",
        "label": "Transformer",
        "type": "concept",
        "tags": ["AI"],
        "size": 10
      }
    ],
    "edges": [
      {
        "source": "item_abc",
        "target": "item_xyz",
        "relation": "包含",
        "weight": 0.95
      }
    ]
  }
}
```

### 添加关系

```http
POST /api/v1/graph/edges
Content-Type: application/json

{
  "source": "item_1",
  "target": "item_2",
  "relation": "相关",
  "weight": 0.8,
  "description": "两个概念有密切关联"
}
```

### 删除关系

```http
DELETE /api/v1/graph/edges?source=item_1&target=item_2
```

---

## 采集 API

### 网页采集

```http
POST /api/v1/crawl
Content-Type: application/json

{
  "url": "https://example.com/article",
  "extract_mode": "full"
}
```

`extract_mode` 可选值：
- `full` — 提取完整正文
- `summary` — 提取摘要（前500字）
- `metadata` — 仅提取元数据

**响应 (200)：**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com/article",
    "title": "文章标题",
    "content": "正文内容...",
    "author": "作者",
    "published_at": "2024-01-15",
    "word_count": 2500,
    "crawled_at": "2024-01-15T10:30:00Z"
  }
}
```

### 批量采集

```http
POST /api/v1/crawl/batch
Content-Type: application/json

{
  "urls": [
    "https://url1.com/article",
    "https://url2.com/article"
  ],
  "extract_mode": "full",
  "auto_save": true
}
```

设置 `auto_save: true` 会自动将采集内容保存到知识库。

---

## 统计 API

### 知识库概览

```http
GET /api/v1/stats/overview
```

**响应 (200)：**
```json
{
  "success": true,
  "data": {
    "total_items": 150,
    "total_words": 125000,
    "total_tags": 45,
    "type_distribution": {
      "article": 50,
      "note": 60,
      "idea": 20,
      "question": 15,
      "inspiration": 5
    },
    "recent_activity": {
      "today": 3,
      "this_week": 12,
      "this_month": 45
    }
  }
}
```

### 每日趋势

```http
GET /api/v1/stats/trend?days=30
```

---

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数无效",
    "details": [
      { "field": "content", "reason": "内容不能为空" }
    ]
  }
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 已创建 |
| 400 | 请求参数错误 |
| 401 | 未认证（Token缺失或过期） |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突（如重复内容） |
| 429 | 请求过多（触发限流） |
| 500 | 服务器内部错误 |

---

## Python SDK 示例

```python
import requests

class MinderClient:
    def __init__(self, base_url="http://localhost:8000", token=None):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {token}"} if token else {}

    def create_item(self, content, title="", item_type="note", tags=None):
        resp = requests.post(
            f"{self.base_url}/api/v1/items",
            json={"content": content, "title": title, "type": item_type, "tags": tags or []},
            headers=self.headers,
        )
        return resp.json()

    def search(self, query, limit=10, filters=None):
        resp = requests.post(
            f"{self.base_url}/api/v1/search",
            json={"query": query, "limit": limit, "filters": filters or {}},
            headers=self.headers,
        )
        return resp.json()

    def crawl(self, url, mode="full"):
        resp = requests.post(
            f"{self.base_url}/api/v1/crawl",
            json={"url": url, "extract_mode": mode},
            headers=self.headers,
        )
        return resp.json()

# 使用
client = MinderClient(token="your-token")
client.create_item("今天学到了...", title="学习笔记", tags=["学习"])
results = client.search("注意力机制")
```

---

## 更新日志

请查看 [CHANGELOG.md](../CHANGELOG.md) 获取最新更新信息。

---

*Minder API — 让知识管理更简单 🧠*
