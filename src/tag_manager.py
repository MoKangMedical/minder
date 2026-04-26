"""标签管理 — 知识标签系统"""

from typing import Dict, List, Optional, Set
from collections import defaultdict


class TagManager:
    """标签管理器，支持标签的创建、关联、查询"""

    def __init__(self):
        self._tags: Dict[str, dict] = {}
        self._item_tags: Dict[str, Set[str]] = defaultdict(set)
        self._tag_items: Dict[str, Set[str]] = defaultdict(set)
        self._init_sample_tags()

    def _init_sample_tags(self):
        samples = [
            {"name": "技术", "color": "#4A90D9", "category": "领域"},
            {"name": "科学", "color": "#50C878", "category": "领域"},
            {"name": "哲学", "color": "#FFD700", "category": "领域"},
            {"name": "重要", "color": "#FF6B6B", "category": "优先级"},
            {"name": "待读", "color": "#FFA500", "category": "状态"},
            {"name": "已读", "color": "#90EE90", "category": "状态"},
            {"name": "收藏", "color": "#FF69B4", "category": "状态"},
        ]
        for t in samples:
            self._tags[t["name"]] = t

    def create_tag(self, name: str, color: str = "#888888", category: str = "自定义") -> dict:
        if name in self._tags:
            return {"error": f"标签已存在: {name}"}
        tag = {"name": name, "color": color, "category": category}
        self._tags[name] = tag
        return tag

    def get_tag(self, name: str) -> Optional[dict]:
        return self._tags.get(name)

    def get_all_tags(self) -> List[dict]:
        return list(self._tags.values())

    def delete_tag(self, name: str) -> bool:
        if name not in self._tags:
            return False
        del self._tags[name]
        items_to_clean = list(self._tag_items.get(name, []))
        for item_id in items_to_clean:
            self._item_tags[item_id].discard(name)
        self._tag_items.pop(name, None)
        return True

    def add_tag_to_item(self, item_id: str, tag_name: str) -> bool:
        if tag_name not in self._tags:
            return False
        self._item_tags[item_id].add(tag_name)
        self._tag_items[tag_name].add(item_id)
        return True

    def remove_tag_from_item(self, item_id: str, tag_name: str) -> bool:
        self._item_tags[item_id].discard(tag_name)
        self._tag_items[tag_name].discard(item_id)
        return True

    def get_item_tags(self, item_id: str) -> List[str]:
        return list(self._item_tags.get(item_id, set()))

    def get_items_by_tag(self, tag_name: str) -> List[str]:
        return list(self._tag_items.get(tag_name, set()))

    def get_items_by_tags(self, tag_names: List[str], mode: str = "and") -> List[str]:
        if not tag_names:
            return []
        sets = [self._tag_items.get(t, set()) for t in tag_names]
        if mode == "and":
            result = sets[0]
            for s in sets[1:]:
                result = result & s
        else:
            result = sets[0]
            for s in sets[1:]:
                result = result | s
        return list(result)

    def get_tags_by_category(self, category: str) -> List[dict]:
        return [t for t in self._tags.values() if t.get("category") == category]

    def get_categories(self) -> List[str]:
        return list(set(t.get("category", "") for t in self._tags.values()))

    def rename_tag(self, old_name: str, new_name: str) -> bool:
        if old_name not in self._tags or new_name in self._tags:
            return False
        self._tags[new_name] = self._tags.pop(old_name)
        self._tags[new_name]["name"] = new_name
        items = self._tag_items.pop(old_name, set())
        self._tag_items[new_name] = items
        for item_id in items:
            self._item_tags[item_id].discard(old_name)
            self._item_tags[item_id].add(new_name)
        return True

    def merge_tags(self, source: str, target: str) -> bool:
        if source not in self._tags or target not in self._tags:
            return False
        items = self._tag_items.pop(source, set())
        for item_id in items:
            self._item_tags[item_id].discard(source)
            self._item_tags[item_id].add(target)
            self._tag_items[target].add(item_id)
        del self._tags[source]
        return True

    def tag_stats(self) -> dict:
        return {
            "total_tags": len(self._tags),
            "total_items": len(self._item_tags),
            "tag_usage": {t: len(items) for t, items in self._tag_items.items()},
        }

    def popular_tags(self, top_n: int = 10) -> List[dict]:
        usage = [(name, len(items)) for name, items in self._tag_items.items()]
        usage.sort(key=lambda x: x[1], reverse=True)
        return [{"name": n, "count": c} for n, c in usage[:top_n]]

    def suggest_tags(self, text: str) -> List[str]:
        suggestions = []
        for tag_name in self._tags:
            if tag_name in text:
                suggestions.append(tag_name)
        return suggestions
