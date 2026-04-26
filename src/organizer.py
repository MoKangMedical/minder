"""
Minder — 智能整理模块

AI驱动的知识条目自动整理：分类、标签、摘要、去重、关系发现。
"""

import json
import hashlib
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field, asdict


@dataclass
class OrganizedItem:
    """整理后的知识条目"""
    content: str
    item_type: str = "note"        # article / note / idea / question / inspiration / project
    title: str = ""
    tags: list = field(default_factory=list)
    summary: str = ""
    related_items: list = field(default_factory=list)
    is_duplicate: bool = False
    duplicate_of: str = ""
    confidence: float = 0.0
    processed_at: str = ""
    metadata: dict = field(default_factory=dict)

    def to_dict(self):
        return asdict(self)


class KnowledgeOrganizer:
    """知识整理器 — 自动分类、打标签、生成摘要"""

    # 知识类型关键词映射（本地规则引擎，无需LLM）
    TYPE_KEYWORDS = {
        "article": ["发布", "报道", "文章", "论文", "研究", "分析", "综述", "报告"],
        "note": ["笔记", "记录", "总结", "学习", "要点", "摘录"],
        "idea": ["想法", "创意", "如果", "也许", "可以试试", "灵感", "脑洞"],
        "question": ["为什么", "怎么", "如何", "是什么", "疑问", "问题", "?", "？"],
        "inspiration": ["突然想到", "灵光", "启发", "感悟", "顿悟"],
        "project": ["项目", "计划", "目标", "里程碑", "进度", "任务"],
    }

    # 常见标签自动提取规则
    TAG_PATTERNS = {
        "AI": ["人工智能", "AI", "机器学习", "深度学习", "神经网络", "LLM", "GPT"],
        "编程": ["Python", "JavaScript", "代码", "编程", "开发", "API", "框架"],
        "医疗": ["医疗", "医学", "临床", "诊断", "健康", "患者"],
        "数据": ["数据", "分析", "可视化", "数据库", "统计"],
        "设计": ["设计", "UI", "UX", "界面", "交互"],
        "商业": ["商业", "创业", "产品", "市场", "运营", "增长"],
    }

    def __init__(self, llm_client=None):
        """
        初始化整理器

        Args:
            llm_client: 可选的LLM客户端（OpenAI/DeepSeek），传入None使用本地规则
        """
        self.llm = llm_client
        self._item_hashes = {}  # 用于去重

    def process(self, content: str, title: str = "", source_url: str = "") -> OrganizedItem:
        """
        处理一条知识内容

        Args:
            content: 原始内容文本
            title: 可选标题
            source_url: 可选来源URL

        Returns:
            OrganizedItem 对象
        """
        item = OrganizedItem(
            content=content,
            title=title or self._extract_title(content),
            processed_at=datetime.now().isoformat(),
        )

        # 1. 去重检测
        item.is_duplicate, item.duplicate_of = self._check_duplicate(content)

        # 2. 分类
        item.item_type = self._classify(content)

        # 3. 标签提取
        item.tags = self._extract_tags(content)

        # 4. 摘要生成
        item.summary = self._generate_summary(content)

        # 5. 置信度评估
        item.confidence = self._estimate_confidence(content, item.item_type)

        return item

    def process_batch(self, items: list[dict]) -> list[OrganizedItem]:
        """批量处理多条内容"""
        results = []
        for item in items:
            content = item.get("content", "")
            title = item.get("title", "")
            url = item.get("source_url", "")
            results.append(self.process(content, title, url))
        return results

    def _classify(self, content: str) -> str:
        """基于关键词规则的内容分类"""
        scores = {}
        for type_id, keywords in self.TYPE_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in content)
            scores[type_id] = score

        if max(scores.values()) == 0:
            return "note"  # 默认为笔记

        return max(scores, key=scores.get)

    def _extract_tags(self, content: str) -> list[str]:
        """从内容中自动提取标签"""
        tags = []
        for tag, keywords in self.TAG_PATTERNS.items():
            if any(kw in content for kw in keywords):
                tags.append(tag)

        # 提取 #hashtag 格式的标签
        import re
        hashtags = re.findall(r"#(\w+)", content)
        tags.extend(hashtags[:5])  # 最多5个

        return list(set(tags))

    def _generate_summary(self, content: str) -> str:
        """生成内容摘要"""
        if len(content) <= 100:
            return content

        # 本地规则：取前两句作为摘要
        sentences = content.replace("。", "。\n").split("\n")
        sentences = [s.strip() for s in sentences if s.strip()]
        summary = "。".join(sentences[:2])
        if len(summary) > 200:
            summary = summary[:200] + "..."
        return summary

    def _check_duplicate(self, content: str) -> tuple[bool, str]:
        """检查内容是否重复"""
        content_hash = hashlib.md5(content.encode()).hexdigest()

        if content_hash in self._item_hashes:
            return True, self._item_hashes[content_hash]

        # 简单的相似度检查：前100字符哈希
        short_hash = hashlib.md5(content[:100].encode()).hexdigest()
        if short_hash in self._item_hashes:
            return True, self._item_hashes[short_hash]

        self._item_hashes[content_hash] = content_hash
        return False, ""

    def _extract_title(self, content: str) -> str:
        """从内容中提取标题"""
        # 取第一行作为标题
        first_line = content.split("\n")[0].strip()
        # 移除 Markdown 标记
        first_line = first_line.lstrip("#").strip()
        if len(first_line) > 80:
            first_line = first_line[:80] + "..."
        return first_line or "Untitled"

    def _estimate_confidence(self, content: str, item_type: str) -> float:
        """评估分类置信度"""
        keywords = self.TYPE_KEYWORDS.get(item_type, [])
        if not keywords:
            return 0.5

        matches = sum(1 for kw in keywords if kw in content)
        # 基于匹配比例和内容长度的简单置信度
        base = min(matches / max(len(keywords), 1), 1.0)
        length_bonus = min(len(content) / 1000, 0.2)
        return round(min(base + length_bonus, 1.0), 2)


# 使用示例
if __name__ == "__main__":
    organizer = KnowledgeOrganizer()

    samples = [
        "今天学习了Transformer架构，核心是自注意力机制。为什么注意力比RNN更好？",
        "#想法 如果把知识图谱和RAG结合起来，也许能做出更好的问答系统",
        "项目计划：下个月完成Minder的v0.3版本，里程碑包括图谱可视化和搜索优化",
    ]

    for text in samples:
        result = organizer.process(text)
        print(f"\n内容: {text[:50]}...")
        print(f"类型: {result.item_type}")
        print(f"标签: {result.tags}")
        print(f"摘要: {result.summary}")
        print(f"置信度: {result.confidence}")
