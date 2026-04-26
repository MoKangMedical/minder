"""重复检测 — 内容去重与相似度检测"""

from typing import Dict, List, Optional, Set, Tuple
from collections import defaultdict
import hashlib


class DuplicateDetector:
    """重复内容检测器"""

    def __init__(self):
        self._fingerprints: Dict[str, str] = {}  # id -> hash
        self._content_index: Dict[str, str] = {}  # id -> content

    def add_document(self, doc_id: str, content: str):
        self._content_index[doc_id] = content
        self._fingerprints[doc_id] = self._fingerprint(content)

    def _fingerprint(self, text: str) -> str:
        normalized = text.strip().lower()
        return hashlib.md5(normalized.encode()).hexdigest()

    def _shingles(self, text: str, k: int = 3) -> Set[str]:
        text = text.strip().lower()
        if len(text) < k:
            return {text}
        return {text[i:i+k] for i in range(len(text) - k + 1)}

    def find_exact_duplicates(self) -> List[List[str]]:
        hash_groups = defaultdict(list)
        for doc_id, h in self._fingerprints.items():
            hash_groups[h].append(doc_id)
        return [group for group in hash_groups.values() if len(group) > 1]

    def find_near_duplicates(self, threshold: float = 0.7) -> List[dict]:
        doc_ids = list(self._content_index.keys())
        results = []
        shingle_cache = {}
        for doc_id in doc_ids:
            shingle_cache[doc_id] = self._shingles(self._content_index[doc_id])
        for i in range(len(doc_ids)):
            for j in range(i + 1, len(doc_ids)):
                id_a, id_b = doc_ids[i], doc_ids[j]
                sim = self._jaccard(shingle_cache[id_a], shingle_cache[id_b])
                if sim >= threshold:
                    results.append({"doc_a": id_a, "doc_b": id_b, "similarity": round(sim, 4)})
        return sorted(results, key=lambda x: x["similarity"], reverse=True)

    def _jaccard(self, set_a: Set[str], set_b: Set[str]) -> float:
        if not set_a and not set_b:
            return 1.0
        if not set_a or not set_b:
            return 0.0
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return intersection / union

    def similarity(self, text_a: str, text_b: str) -> float:
        shingles_a = self._shingles(text_a)
        shingles_b = self._shingles(text_b)
        return round(self._jaccard(shingles_a, shingles_b), 4)

    def check_new(self, content: str) -> dict:
        fp = self._fingerprint(content)
        exact = [did for did, h in self._fingerprints.items() if h == fp]
        shingles_new = self._shingles(content)
        near = []
        for doc_id, existing in self._content_index.items():
            sim = self._jaccard(shingles_new, self._shingles(existing))
            if sim >= 0.5:
                near.append({"doc_id": doc_id, "similarity": round(sim, 4)})
        return {"exact_matches": exact, "near_matches": sorted(near, key=lambda x: x["similarity"], reverse=True)}

    def remove_document(self, doc_id: str) -> bool:
        self._content_index.pop(doc_id, None)
        self._fingerprints.pop(doc_id, None)
        return True

    def document_count(self) -> int:
        return len(self._content_index)

    def duplicate_stats(self) -> dict:
        exact_groups = self.find_exact_duplicates()
        total_dupes = sum(len(g) - 1 for g in exact_groups)
        return {
            "total_documents": len(self._content_index),
            "exact_duplicate_groups": len(exact_groups),
            "total_duplicates": total_dupes,
            "unique_documents": len(self._content_index) - total_dupes,
        }

    def find_similar_to(self, doc_id: str, threshold: float = 0.5) -> List[dict]:
        if doc_id not in self._content_index:
            return []
        content = self._content_index[doc_id]
        shingles_a = self._shingles(content)
        results = []
        for other_id, other_content in self._content_index.items():
            if other_id == doc_id:
                continue
            sim = self._jaccard(shingles_a, self._shingles(other_content))
            if sim >= threshold:
                results.append({"doc_id": other_id, "similarity": round(sim, 4)})
        return sorted(results, key=lambda x: x["similarity"], reverse=True)

    def merge_duplicates(self, keep_id: str, remove_ids: List[str]) -> int:
        count = 0
        for rid in remove_ids:
            if rid != keep_id and rid in self._content_index:
                self.remove_document(rid)
                count += 1
        return count

    def clear(self):
        self._content_index.clear()
        self._fingerprints.clear()
