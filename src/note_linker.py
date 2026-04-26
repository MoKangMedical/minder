"""笔记关联 — 笔记之间的链接与关系管理"""

from typing import Dict, List, Optional, Set
from collections import defaultdict


class NoteLinker:
    """笔记关联管理器"""

    def __init__(self):
        self._links: List[dict] = []
        self._forward: Dict[str, Set[str]] = defaultdict(set)
        self._backward: Dict[str, Set[str]] = defaultdict(set)
        self._link_types: Dict[str, str] = {}

    def add_link(self, source_id: str, target_id: str, link_type: str = "related") -> dict:
        link = {"source": source_id, "target": target_id, "type": link_type}
        self._links.append(link)
        self._forward[source_id].add(target_id)
        self._backward[target_id].add(source_id)
        return link

    def remove_link(self, source_id: str, target_id: str) -> bool:
        for i, link in enumerate(self._links):
            if link["source"] == source_id and link["target"] == target_id:
                self._links.pop(i)
                self._forward[source_id].discard(target_id)
                self._backward[target_id].discard(source_id)
                return True
        return False

    def get_outgoing(self, note_id: str) -> List[str]:
        return list(self._forward.get(note_id, set()))

    def get_incoming(self, note_id: str) -> List[str]:
        return list(self._backward.get(note_id, set()))

    def get_all_links(self, note_id: str) -> List[dict]:
        return [l for l in self._links if l["source"] == note_id or l["target"] == note_id]

    def get_links_by_type(self, link_type: str) -> List[dict]:
        return [l for l in self._links if l["type"] == link_type]

    def bidirectional(self, note_id_a: str, note_id_b: str) -> bool:
        return (note_id_b in self._forward.get(note_id_a, set()) and
                note_id_a in self._forward.get(note_id_b, set()))

    def find_path(self, start: str, end: str, max_depth: int = 5) -> List[str]:
        if start == end:
            return [start]
        visited = set()
        queue = [[start]]
        while queue:
            path = queue.pop(0)
            if len(path) > max_depth:
                continue
            node = path[-1]
            if node in visited:
                continue
            visited.add(node)
            for neighbor in self._forward.get(node, set()):
                if neighbor == end:
                    return path + [neighbor]
                if neighbor not in visited:
                    queue.append(path + [neighbor])
        return []

    def suggest_links(self, note_id: str, all_notes: List[str]) -> List[str]:
        direct = self._forward.get(note_id, set()) | self._backward.get(note_id, set())
        suggestions = set()
        for linked in direct:
            for second in self._forward.get(linked, set()) | self._backward.get(linked, set()):
                if second != note_id and second not in direct:
                    suggestions.add(second)
        return list(suggestions)

    def orphans(self, all_notes: List[str]) -> List[str]:
        linked = set()
        for l in self._links:
            linked.add(l["source"])
            linked.add(l["target"])
        return [n for n in all_notes if n not in linked]

    def most_linked(self, top_n: int = 10) -> List[dict]:
        counts = defaultdict(int)
        for l in self._links:
            counts[l["source"]] += 1
            counts[l["target"]] += 1
        sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return [{"note_id": nid, "count": c} for nid, c in sorted_items[:top_n]]

    def link_types(self) -> List[str]:
        return list(set(l["type"] for l in self._links))

    def total_links(self) -> int:
        return len(self._links)

    def cluster(self, note_ids: List[str]) -> List[List[str]]:
        visited = set()
        clusters = []
        for nid in note_ids:
            if nid in visited:
                continue
            cluster = []
            queue = [nid]
            while queue:
                current = queue.pop(0)
                if current in visited:
                    continue
                visited.add(current)
                cluster.append(current)
                for neighbor in self._forward.get(current, set()) | self._backward.get(current, set()):
                    if neighbor not in visited and neighbor in note_ids:
                        queue.append(neighbor)
            if cluster:
                clusters.append(cluster)
        return clusters

    def export_links(self) -> List[dict]:
        return list(self._links)

    def import_links(self, links: List[dict]) -> int:
        count = 0
        for l in links:
            if "source" in l and "target" in l:
                self.add_link(l["source"], l["target"], l.get("type", "related"))
                count += 1
        return count
