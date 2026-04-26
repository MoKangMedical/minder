"""
Minder — 知识图谱构建模块

基于知识条目自动构建知识图谱，支持实体抽取、关系发现、图谱查询。
"""

import json
import hashlib
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field, asdict


DATA_DIR = Path(__file__).parent.parent / "data"


@dataclass
class KGNode:
    """知识图谱节点"""
    id: str
    label: str
    node_type: str       # concept / person / event / tool / method / topic
    description: str = ""
    properties: dict = field(default_factory=dict)
    weight: int = 1
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.id:
            self.id = hashlib.md5(f"{self.label}:{self.node_type}".encode()).hexdigest()[:12]

    def to_dict(self):
        return asdict(self)


@dataclass
class KGEdge:
    """知识图谱边"""
    source: str          # 源节点ID
    target: str          # 目标节点ID
    relation: str        # 关系类型
    weight: float = 1.0
    properties: dict = field(default_factory=dict)
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

    def to_dict(self):
        return asdict(self)


class KnowledgeGraph:
    """
    知识图谱

    功能：
    - 构建和管理知识图谱
    - 从文本/条目中抽取实体和关系
    - 图谱查询（邻居、路径、子图）
    - 导入/导出
    """

    # 预定义关系类型
    RELATION_TYPES = [
        "属于", "包含", "相关", "依赖", "对立",
        "导致", "属于领域", "使用", "创建", "影响",
        "同义", "因果", "时序", "部分", "实例",
    ]

    # 实体类型
    ENTITY_TYPES = ["concept", "person", "event", "tool", "method", "topic", "document"]

    def __init__(self):
        self.nodes: dict[str, KGNode] = {}
        self.edges: list[KGEdge] = []
        self._load_sample_data()

    def _load_sample_data(self):
        """加载示例知识图谱数据"""
        path = DATA_DIR / "sample-kg.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for n in data.get("nodes", []):
                    node = KGNode(**n)
                    self.nodes[node.id] = node
                for e in data.get("edges", []):
                    self.edges.append(KGEdge(**e))

    def add_node(self, label: str, node_type: str = "concept",
                 description: str = "", **kwargs) -> KGNode:
        """添加节点"""
        node_id = kwargs.pop("id", hashlib.md5(f"{label}:{node_type}".encode()).hexdigest()[:12])

        if node_id in self.nodes:
            self.nodes[node_id].weight += 1
            return self.nodes[node_id]

        node = KGNode(
            id=node_id,
            label=label,
            node_type=node_type,
            description=description,
            properties=kwargs,
        )
        self.nodes[node_id] = node
        return node

    def add_edge(self, source: str, target: str, relation: str,
                 weight: float = 1.0, **kwargs) -> Optional[KGEdge]:
        """添加边"""
        if source not in self.nodes or target not in self.nodes:
            return None

        # 检查是否已存在
        for e in self.edges:
            if e.source == source and e.target == target and e.relation == relation:
                e.weight += weight
                return e

        edge = KGEdge(
            source=source,
            target=target,
            relation=relation,
            weight=weight,
            properties=kwargs,
        )
        self.edges.append(edge)
        return edge

    def extract_from_text(self, text: str, source_item_id: str = "") -> dict:
        """
        从文本中抽取实体和关系

        使用简单的规则引擎（可扩展为NLP模型）
        """
        extracted = {"nodes": [], "edges": [], "text_length": len(text)}

        # 简单实体抽取：中文关键词
        concept_patterns = [
            (r'[\u4e00-\u9fff]{2,6}(?:理论|学说|方法|技术|框架|模型|算法|系统|体系)', "concept"),
            (r'[\u4e00-\u9fff]{2,4}(?:定律|法则|原理|定理|公式)', "concept"),
            (r'[\u4e00-\u9fff]{2,6}(?:学|科|术)', "topic"),
        ]

        found_entities = set()
        for pattern, etype in concept_patterns:
            matches = re.findall(pattern, text)
            for m in matches:
                if m not in found_entities:
                    found_entities.add(m)
                    node = self.add_node(m, node_type=etype)
                    extracted["nodes"].append(node.to_dict())

        # 关系抽取：基于共现
        entity_list = list(found_entities)
        for i in range(len(entity_list)):
            for j in range(i + 1, len(entity_list)):
                # 如果两个实体在同一句中出现，建立关系
                for sent in re.split(r'[。！？\n]', text):
                    if entity_list[i] in sent and entity_list[j] in sent:
                        n1 = self.add_node(entity_list[i])
                        n2 = self.add_node(entity_list[j])
                        edge = self.add_edge(n1.id, n2.id, "相关")
                        if edge:
                            extracted["edges"].append(edge.to_dict())
                        break

        return extracted

    def get_neighbors(self, node_id: str, depth: int = 1) -> dict:
        """获取节点的邻居（支持多跳）"""
        visited = set()
        result_nodes = []
        result_edges = []

        def _bfs(current_id: str, current_depth: int):
            if current_depth > depth or current_id in visited:
                return
            visited.add(current_id)

            if current_id in self.nodes:
                result_nodes.append(self.nodes[current_id].to_dict())

            for edge in self.edges:
                neighbor = None
                if edge.source == current_id:
                    neighbor = edge.target
                elif edge.target == current_id:
                    neighbor = edge.source

                if neighbor and neighbor not in visited:
                    result_edges.append(edge.to_dict())
                    _bfs(neighbor, current_depth + 1)

        _bfs(node_id, 0)
        return {"nodes": result_nodes, "edges": result_edges}

    def find_path(self, source_id: str, target_id: str,
                  max_depth: int = 5) -> Optional[list]:
        """BFS查找两节点间最短路径"""
        if source_id not in self.nodes or target_id not in self.nodes:
            return None

        from collections import deque
        queue = deque([(source_id, [source_id])])
        visited = {source_id}

        while queue:
            current, path = queue.popleft()
            if current == target_id:
                return [{"node": self.nodes[nid].to_dict(), "step": i}
                        for i, nid in enumerate(path)]

            if len(path) > max_depth:
                continue

            for edge in self.edges:
                neighbor = None
                if edge.source == current:
                    neighbor = edge.target
                elif edge.target == current:
                    neighbor = edge.source

                if neighbor and neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

        return None

    def get_subgraph(self, node_ids: list) -> dict:
        """获取子图"""
        node_set = set(node_ids)
        sub_nodes = [self.nodes[nid].to_dict() for nid in node_ids if nid in self.nodes]
        sub_edges = [e.to_dict() for e in self.edges
                     if e.source in node_set and e.target in node_set]
        return {"nodes": sub_nodes, "edges": sub_edges}

    def search_nodes(self, query: str, node_type: str = "") -> list[dict]:
        """搜索节点"""
        results = []
        query_lower = query.lower()
        for nid, node in self.nodes.items():
            if node_type and node.node_type != node_type:
                continue
            score = 0
            if query_lower in node.label.lower():
                score += 3
            if query_lower in node.description.lower():
                score += 1
            if score > 0:
                results.append({**node.to_dict(), "relevance": score})
        return sorted(results, key=lambda x: x["relevance"], reverse=True)

    def get_stats(self) -> dict:
        """获取图谱统计"""
        node_types = {}
        for n in self.nodes.values():
            node_types[n.node_type] = node_types.get(n.node_type, 0) + 1

        relation_types = {}
        for e in self.edges:
            relation_types[e.relation] = relation_types.get(e.relation, 0) + 1

        return {
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges),
            "node_types": node_types,
            "relation_types": relation_types,
            "density": len(self.edges) / max(1, len(self.nodes) * (len(self.nodes) - 1) / 2),
        }

    def export(self, fmt: str = "json") -> str:
        """导出图谱"""
        data = {
            "version": "1.0",
            "exported_at": datetime.now().isoformat(),
            "stats": self.get_stats(),
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges],
        }
        if fmt == "json":
            return json.dumps(data, ensure_ascii=False, indent=2)
        return json.dumps(data, ensure_ascii=False)

    def import_from_json(self, json_data: dict) -> int:
        """从JSON导入图谱"""
        count = 0
        for n in json_data.get("nodes", []):
            self.add_node(**n)
            count += 1
        for e in json_data.get("edges", []):
            self.add_edge(**e)
        return count
