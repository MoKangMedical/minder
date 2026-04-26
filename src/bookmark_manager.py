"""书签管理 — URL书签的存储与组织"""

from typing import Dict, List, Optional
from datetime import datetime
import json


class BookmarkManager:
    """书签管理器"""

    def __init__(self):
        self._bookmarks: Dict[str, dict] = {}
        self._folders: Dict[str, List[str]] = {"默认": [], "收藏": []}

    def add(self, url: str, title: str = "", description: str = "",
            folder: str = "默认", tags: List[str] = None) -> dict:
        bid = f"bm_{len(self._bookmarks) + 1}"
        bookmark = {
            "id": bid, "url": url, "title": title or url,
            "description": description, "folder": folder,
            "tags": tags or [], "created_at": datetime.now().isoformat(),
            "visits": 0, "favorite": False,
        }
        self._bookmarks[bid] = bookmark
        if folder not in self._folders:
            self._folders[folder] = []
        self._folders[folder].append(bid)
        return bookmark

    def get(self, bid: str) -> Optional[dict]:
        return self._bookmarks.get(bid)

    def get_all(self) -> List[dict]:
        return list(self._bookmarks.values())

    def update(self, bid: str, **kwargs) -> bool:
        if bid not in self._bookmarks:
            return False
        for key, val in kwargs.items():
            if key in self._bookmarks[bid]:
                self._bookmarks[bid][key] = val
        return True

    def delete(self, bid: str) -> bool:
        bm = self._bookmarks.pop(bid, None)
        if not bm:
            return False
        folder = bm.get("folder", "默认")
        if folder in self._folders and bid in self._folders[folder]:
            self._folders[folder].remove(bid)
        return True

    def search(self, keyword: str) -> List[dict]:
        results = []
        for bm in self._bookmarks.values():
            if any(keyword.lower() in str(v).lower() for v in bm.values()):
                results.append(bm)
        return results

    def get_by_folder(self, folder: str) -> List[dict]:
        ids = self._folders.get(folder, [])
        return [self._bookmarks[bid] for bid in ids if bid in self._bookmarks]

    def get_folders(self) -> List[dict]:
        return [{"name": k, "count": len(v)} for k, v in self._folders.items()]

    def create_folder(self, name: str) -> bool:
        if name in self._folders:
            return False
        self._folders[name] = []
        return True

    def move_to_folder(self, bid: str, new_folder: str) -> bool:
        bm = self._bookmarks.get(bid)
        if not bm:
            return False
        old_folder = bm.get("folder", "默认")
        if old_folder in self._folders and bid in self._folders[old_folder]:
            self._folders[old_folder].remove(bid)
        if new_folder not in self._folders:
            self._folders[new_folder] = []
        self._folders[new_folder].append(bid)
        bm["folder"] = new_folder
        return True

    def toggle_favorite(self, bid: str) -> bool:
        if bid not in self._bookmarks:
            return False
        self._bookmarks[bid]["favorite"] = not self._bookmarks[bid]["favorite"]
        return True

    def get_favorites(self) -> List[dict]:
        return [bm for bm in self._bookmarks.values() if bm.get("favorite")]

    def visit(self, bid: str) -> bool:
        if bid not in self._bookmarks:
            return False
        self._bookmarks[bid]["visits"] = self._bookmarks[bid].get("visits", 0) + 1
        return True

    def most_visited(self, top_n: int = 10) -> List[dict]:
        return sorted(self._bookmarks.values(), key=lambda x: x.get("visits", 0), reverse=True)[:top_n]

    def recent(self, top_n: int = 10) -> List[dict]:
        return sorted(self._bookmarks.values(), key=lambda x: x.get("created_at", ""), reverse=True)[:top_n]

    def count(self) -> int:
        return len(self._bookmarks)

    def export_json(self) -> str:
        return json.dumps(list(self._bookmarks.values()), ensure_ascii=False, indent=2)

    def import_from_json(self, data: str) -> int:
        try:
            items = json.loads(data)
            count = 0
            for item in items:
                if "url" in item:
                    self.add(item["url"], item.get("title", ""), item.get("description", ""),
                             item.get("folder", "默认"), item.get("tags", []))
                    count += 1
            return count
        except Exception:
            return 0

    def delete_folder(self, name: str) -> bool:
        if name in ("默认", "收藏") or name not in self._folders:
            return False
        for bid in self._folders[name]:
            if bid in self._bookmarks:
                self._bookmarks[bid]["folder"] = "默认"
                self._folders["默认"].append(bid)
        del self._folders[name]
        return True
