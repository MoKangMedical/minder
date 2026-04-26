"""
Minder — 推荐引擎

基于知识图谱和用户行为，智能推荐相关内容。
"""

import json
import math
from datetime import datetime
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field, asdict


DATA_DIR = Path(__file__).parent.parent / "data"


@dataclass
class Recommendation:
    """推荐结果"""
    item_id: str
    title: str
    content: str
    score: float
    reason: str
    item_type: str = ""
    tags: list = field(default_factory=list)
    source: str = ""       # 推荐来源：graph / collaborative / content / trending

    def to_dict(self):
        return asdict(self)


class RecommendationEngine:
    """
    推荐引擎

    推荐策略：
    1. 基于知识图谱的关系推荐（图谱邻居）
    2. 基于内容相似度推荐（TF-IDF / 标签匹配）
    3. 基于协同过滤推荐（用户行为）
    4. 基于时间衰减的热门推荐
    5. 混合推荐（加权融合）
    """

    def __init__(self, knowledge_graph=None, items: list = None):
        self.kg = knowledge_graph
        self.items = items or []
        self.user_history: dict[str, list] = {}  # user_id -> [item_ids]
        self.item_scores: dict[str, float] = {}   # item_id -> popularity score

    def set_items(self, items: list[dict]):
        """设置知识条目列表"""
        self.items = items

    def add_user_interaction(self, user_id: str, item_id: str,
                             interaction_type: str = "view"):
        """记录用户交互"""
        if user_id not in self.user_history:
            self.user_history[user_id] = []

        score_map = {"view": 1.0, "save": 2.0, "share": 3.0, "create": 4.0}
        self.user_history[user_id].append({
            "item_id": item_id,
            "type": interaction_type,
            "score": score_map.get(interaction_type, 1.0),
            "timestamp": datetime.now().isoformat(),
        })

        # 更新条目热度
        self.item_scores[item_id] = self.item_scores.get(item_id, 0) + score_map.get(interaction_type, 1.0)

    def recommend(self, user_id: str = "", current_item_id: str = "",
                  top_k: int = 10, strategies: list = None) -> list[Recommendation]:
        """
        混合推荐

        Args:
            user_id: 用户ID（用于个性化）
            current_item_id: 当前查看的条目（用于上下文推荐）
            top_k: 返回数量
            strategies: 使用的策略列表
        """
        if strategies is None:
            strategies = ["graph", "content", "trending"]

        all_recs: dict[str, Recommendation] = {}

        for strategy in strategies:
            recs = []
            if strategy == "graph" and self.kg and current_item_id:
                recs = self._graph_based(current_item_id, top_k * 2)
            elif strategy == "content":
                recs = self._content_based(user_id, current_item_id, top_k * 2)
            elif strategy == "trending":
                recs = self._trending(top_k * 2)
            elif strategy == "collaborative":
                recs = self._collaborative(user_id, top_k * 2)

            # 加权融合
            weights = {"graph": 1.5, "content": 1.0, "trending": 0.8, "collaborative": 1.2}
            w = weights.get(strategy, 1.0)

            for rec in recs:
                if rec.item_id in all_recs:
                    all_recs[rec.item_id].score += rec.score * w
                else:
                    rec.score *= w
                    rec.source = strategy
                    all_recs[rec.item_id] = rec

        # 排序并返回
        results = sorted(all_recs.values(), key=lambda r: r.score, reverse=True)
        # 过滤掉当前条目
        results = [r for r in results if r.item_id != current_item_id]
        return results[:top_k]

    def _graph_based(self, item_id: str, limit: int) -> list[Recommendation]:
        """基于知识图谱的推荐"""
        recs = []
        if not self.kg:
            return recs

        # 获取图谱邻居
        neighbors = self.kg.get_neighbors(item_id, depth=2)
        for node in neighbors.get("nodes", []):
            if node["id"] != item_id:
                recs.append(Recommendation(
                    item_id=node["id"],
                    title=node.get("label", ""),
                    content=node.get("description", ""),
                    score=node.get("weight", 1) * 1.0,
                    reason=f"知识图谱关联: {node.get('node_type', '')}",
                    item_type=node.get("node_type", ""),
                ))

        return recs[:limit]

    def _content_based(self, user_id: str, current_item_id: str,
                       limit: int) -> list[Recommendation]:
        """基于内容相似度的推荐"""
        recs = []

        # 获取用户历史偏好标签
        user_tags = set()
        if user_id in self.user_history:
            for interaction in self.user_history[user_id]:
                item = self._find_item(interaction["item_id"])
                if item:
                    user_tags.update(item.get("tags", []))

        # 获取当前条目标签
        current_item = self._find_item(current_item_id)
        if current_item:
            user_tags.update(current_item.get("tags", []))

        if not user_tags:
            return recs

        # 计算相似度
        for item in self.items:
            if item.get("id") == current_item_id:
                continue
            item_tags = set(item.get("tags", []))
            if not item_tags:
                continue

            # Jaccard相似度
            intersection = user_tags & item_tags
            union = user_tags | item_tags
            similarity = len(intersection) / len(union) if union else 0

            if similarity > 0:
                recs.append(Recommendation(
                    item_id=item.get("id", ""),
                    title=item.get("title", ""),
                    content=item.get("content", "")[:100],
                    score=similarity * 5,
                    reason=f"内容相似 (标签: {', '.join(list(intersection)[:3])})",
                    item_type=item.get("item_type", ""),
                    tags=list(item_tags),
                ))

        recs.sort(key=lambda r: r.score, reverse=True)
        return recs[:limit]

    def _collaborative(self, user_id: str, limit: int) -> list[Recommendation]:
        """基于协同过滤的推荐"""
        recs = []
        if user_id not in self.user_history:
            return recs

        user_items = {i["item_id"] for i in self.user_history[user_id]}

        # 找到相似用户
        similar_users = []
        for other_id, other_history in self.user_history.items():
            if other_id == user_id:
                continue
            other_items = {i["item_id"] for i in other_history}
            intersection = user_items & other_items
            union = user_items | other_items
            if union:
                similarity = len(intersection) / len(union)
                if similarity > 0.1:
                    similar_users.append((other_id, similarity, other_items))

        similar_users.sort(key=lambda x: x[1], reverse=True)

        # 推荐相似用户喜欢但当前用户未看过的
        recommended_items = set()
        for _, sim, items in similar_users[:5]:
            for item_id in items - user_items:
                if item_id not in recommended_items:
                    recommended_items.add(item_id)
                    item = self._find_item(item_id)
                    if item:
                        recs.append(Recommendation(
                            item_id=item_id,
                            title=item.get("title", ""),
                            content=item.get("content", "")[:100],
                            score=sim * 3,
                            reason="相似用户推荐",
                            item_type=item.get("item_type", ""),
                        ))

        recs.sort(key=lambda r: r.score, reverse=True)
        return recs[:limit]

    def _trending(self, limit: int) -> list[Recommendation]:
        """热门推荐"""
        recs = []
        for item in self.items:
            item_id = item.get("id", "")
            score = self.item_scores.get(item_id, 0)

            # 时间衰减
            created = item.get("created_at", "")
            if created:
                try:
                    days_ago = (datetime.now() - datetime.fromisoformat(created)).days
                    decay = math.exp(-days_ago / 30)  # 30天半衰期
                    score *= decay
                except (ValueError, TypeError):
                    pass

            if score > 0:
                recs.append(Recommendation(
                    item_id=item_id,
                    title=item.get("title", ""),
                    content=item.get("content", "")[:100],
                    score=score,
                    reason="热门推荐",
                    item_type=item.get("item_type", ""),
                ))

        recs.sort(key=lambda r: r.score, reverse=True)
        return recs[:limit]

    def _find_item(self, item_id: str) -> Optional[dict]:
        """查找条目"""
        for item in self.items:
            if item.get("id") == item_id:
                return item
        return None

    def get_recommendation_stats(self) -> dict:
        """获取推荐系统统计"""
        return {
            "total_items": len(self.items),
            "total_users": len(self.user_history),
            "total_interactions": sum(len(h) for h in self.user_history.values()),
            "items_with_scores": len(self.item_scores),
        }

    def export(self) -> dict:
        """导出推荐引擎状态"""
        return {
            "item_scores": self.item_scores,
            "user_history": self.user_history,
            "stats": self.get_recommendation_stats(),
        }
