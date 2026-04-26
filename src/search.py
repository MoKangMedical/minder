"""
Minder — 语义搜索模块

基于向量嵌入的语义搜索，支持自然语言查询和关联推荐。
"""

import json
import hashlib
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class SearchResult:
    """搜索结果"""
    item_id: str
    title: str
    content: str
    score: float
    item_type: str = ""
    tags: list = field(default_factory=list)
    snippet: str = ""
    metadata: dict = field(default_factory=dict)


class SemanticSearch:
    """语义搜索引擎"""

    def __init__(self, embedding_model: str = "local"):
        """
        初始化搜索引擎

        Args:
            embedding_model: 嵌入模型 — "local"(TF-IDF) / "openai" / "bge"
        """
        self.model_type = embedding_model
        self._documents = []  # 存储所有文档
        self._embeddings = []  # 存储嵌入向量
        self._index_built = False

        # TF-IDF本地模型（无需API）
        self._tfidf_matrix = None
        self._vectorizer = None

    def add_document(self, doc_id: str, title: str, content: str,
                     item_type: str = "", tags: list = None, metadata: dict = None):
        """
        添加文档到搜索索引

        Args:
            doc_id: 文档唯一ID
            title: 标题
            content: 内容文本
            item_type: 知识类型
            tags: 标签列表
            metadata: 额外元数据
        """
        doc = {
            "id": doc_id,
            "title": title,
            "content": content,
            "type": item_type,
            "tags": tags or [],
            "metadata": metadata or {},
            "added_at": datetime.now().isoformat(),
        }
        self._documents.append(doc)
        self._index_built = False  # 标记索引需要重建

    def add_documents_batch(self, docs: list[dict]):
        """批量添加文档"""
        for doc in docs:
            self.add_document(
                doc_id=doc.get("id", hashlib.md5(doc["content"].encode()).hexdigest()[:12]),
                title=doc.get("title", ""),
                content=doc.get("content", ""),
                item_type=doc.get("type", ""),
                tags=doc.get("tags", []),
                metadata=doc.get("metadata", {}),
            )

    def query(self, query_text: str, limit: int = 10,
              filters: dict = None) -> list[SearchResult]:
        """
        语义搜索查询

        Args:
            query_text: 查询文本（自然语言）
            limit: 返回结果数量
            filters: 过滤条件 { "type": "article", "tags": ["AI"] }

        Returns:
            SearchResult 列表，按相关度排序
        """
        if not self._documents:
            return []

        # 确保索引已构建
        if not self._index_built:
            self._build_index()

        # 使用TF-IDF进行搜索（本地模式）
        results = self._search_tfidf(query_text, limit, filters)

        return results

    def find_related(self, doc_id: str, limit: int = 5) -> list[SearchResult]:
        """
        查找与指定文档相关的知识条目

        Args:
            doc_id: 文档ID
            limit: 返回数量

        Returns:
            相关文档列表
        """
        # 找到目标文档
        target = None
        for doc in self._documents:
            if doc["id"] == doc_id:
                target = doc
                break

        if not target:
            return []

        # 用文档内容作为查询
        query_text = f"{target['title']} {target['content'][:200]}"
        results = self._search_tfidf(query_text, limit + 1)

        # 排除自身
        return [r for r in results if r.item_id != doc_id][:limit]

    def _build_index(self):
        """构建搜索索引"""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            corpus = [f"{d['title']} {d['content']}" for d in self._documents]
            self._vectorizer = TfidfVectorizer(
                max_features=10000,
                stop_words=None,  # 中文需要自定义停用词
                ngram_range=(1, 2),
            )
            self._tfidf_matrix = self._vectorizer.fit_transform(corpus)
            self._index_built = True

        except ImportError:
            print("[WARN] scikit-learn not installed. Using keyword search fallback.")
            self._index_built = True  # 标记为已构建，使用回退搜索

    def _search_tfidf(self, query: str, limit: int,
                      filters: dict = None) -> list[SearchResult]:
        """TF-IDF搜索实现"""
        # 如果有TF-IDF模型
        if self._vectorizer and self._tfidf_matrix is not None:
            try:
                from sklearn.metrics.pairwise import cosine_similarity
                import numpy as np

                query_vec = self._vectorizer.transform([query])
                scores = cosine_similarity(query_vec, self._tfidf_matrix).flatten()

                # 获取Top-K
                top_indices = np.argsort(scores)[::-1][:limit * 2]

                results = []
                for idx in top_indices:
                    if scores[idx] < 0.01:
                        break
                    doc = self._documents[idx]

                    # 应用过滤器
                    if filters and not self._match_filters(doc, filters):
                        continue

                    results.append(SearchResult(
                        item_id=doc["id"],
                        title=doc["title"],
                        content=doc["content"],
                        score=float(scores[idx]),
                        item_type=doc["type"],
                        tags=doc["tags"],
                        snippet=self._make_snippet(doc["content"], query),
                    ))

                    if len(results) >= limit:
                        break

                return results

            except Exception as e:
                print(f"[WARN] TF-IDF search failed: {e}")

        # 回退：关键词搜索
        return self._search_keyword(query, limit, filters)

    def _search_keyword(self, query: str, limit: int,
                        filters: dict = None) -> list[SearchResult]:
        """关键词搜索回退方案"""
        query_lower = query.lower()
        keywords = query_lower.split()

        scored_docs = []
        for doc in self._documents:
            text = f"{doc['title']} {doc['content']}".lower()
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                if filters and not self._match_filters(doc, filters):
                    continue
                scored_docs.append((doc, score / len(keywords)))

        scored_docs.sort(key=lambda x: x[1], reverse=True)

        return [
            SearchResult(
                item_id=doc["id"],
                title=doc["title"],
                content=doc["content"],
                score=score,
                item_type=doc["type"],
                tags=doc["tags"],
                snippet=self._make_snippet(doc["content"], query),
            )
            for doc, score in scored_docs[:limit]
        ]

    def _match_filters(self, doc: dict, filters: dict) -> bool:
        """检查文档是否匹配过滤条件"""
        if "type" in filters and doc["type"] != filters["type"]:
            return False
        if "tags" in filters:
            if not any(t in doc["tags"] for t in filters["tags"]):
                return False
        if "date_from" in filters:
            if doc.get("added_at", "") < filters["date_from"]:
                return False
        return True

    def _make_snippet(self, content: str, query: str, context_chars: int = 100) -> str:
        """生成搜索结果摘要片段"""
        query_lower = query.lower()
        content_lower = content.lower()

        # 找到第一个匹配位置
        pos = content_lower.find(query_lower.split()[0]) if query_lower.split() else 0
        if pos == -1:
            pos = 0

        start = max(0, pos - context_chars // 2)
        end = min(len(content), pos + context_chars)
        snippet = content[start:end]

        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."

        return snippet

    def get_stats(self) -> dict:
        """获取搜索索引统计"""
        return {
            "total_documents": len(self._documents),
            "index_built": self._index_built,
            "model_type": self.model_type,
            "type_distribution": self._type_distribution(),
        }

    def _type_distribution(self) -> dict:
        """统计各类型文档数量"""
        dist = {}
        for doc in self._documents:
            t = doc.get("type", "unknown")
            dist[t] = dist.get(t, 0) + 1
        return dist


# 使用示例
if __name__ == "__main__":
    search = SemanticSearch()

    # 添加示例文档
    docs = [
        {"id": "1", "title": "Transformer架构详解", "content": "Transformer是Google在2017年提出的基于自注意力机制的神经网络架构", "type": "article", "tags": ["AI", "深度学习"]},
        {"id": "2", "title": "知识图谱入门", "content": "知识图谱用图结构表示实体及其关系，广泛应用于搜索引擎和问答系统", "type": "note", "tags": ["知识管理", "图数据库"]},
        {"id": "3", "title": "RAG技术实践", "content": "检索增强生成RAG将外部知识检索与大语言模型生成相结合", "type": "article", "tags": ["AI", "LLM"]},
    ]

    search.add_documents_batch(docs)

    # 搜索
    results = search.query("深度学习注意力机制")
    for r in results:
        print(f"[{r.score:.2f}] {r.title}")
        print(f"  类型: {r.item_type} | 标签: {r.tags}")
        print(f"  摘要: {r.snippet}")
        print()

    # 关联推荐
    related = search.find_related("1", limit=2)
    print("与「Transformer架构详解」相关的知识：")
    for r in related:
        print(f"  - {r.title} (相关度: {r.score:.2f})")
