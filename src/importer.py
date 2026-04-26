"""数据导入 — 多格式数据导入"""

from typing import Dict, List, Optional
import json
import csv
import io
import re


class DataImporter:
    """多格式数据导入器"""

    def __init__(self):
        self._import_history: List[dict] = []
        self._errors: List[dict] = []

    def import_json(self, data: str) -> dict:
        try:
            items = json.loads(data)
            if isinstance(items, dict):
                items = [items]
            count = len(items)
            self._log_import("json", count)
            return {"format": "json", "count": count, "items": items}
        except json.JSONDecodeError as e:
            self._log_error("json", str(e))
            return {"error": f"JSON解析失败: {e}"}

    def import_csv(self, data: str) -> dict:
        try:
            reader = csv.DictReader(io.StringIO(data))
            items = list(reader)
            count = len(items)
            self._log_import("csv", count)
            return {"format": "csv", "count": count, "items": items}
        except Exception as e:
            self._log_error("csv", str(e))
            return {"error": f"CSV解析失败: {e}"}

    def import_markdown(self, data: str) -> dict:
        items = []
        current = {}
        for line in data.split("\n"):
            line = line.strip()
            if line.startswith("# "):
                if current:
                    items.append(current)
                current = {"title": line[2:], "content": ""}
            elif line.startswith("- ") or line.startswith("* "):
                if "tags" not in current:
                    current["tags"] = []
                current["tags"].append(line[2:])
            elif line:
                current["content"] = current.get("content", "") + line + "\n"
        if current:
            items.append(current)
        count = len(items)
        self._log_import("markdown", count)
        return {"format": "markdown", "count": count, "items": items}

    def import_text(self, data: str, separator: str = "\n---\n") -> dict:
        blocks = data.split(separator)
        items = []
        for block in blocks:
            block = block.strip()
            if block:
                items.append({"content": block, "lines": block.count("\n") + 1})
        count = len(items)
        self._log_import("text", count)
        return {"format": "text", "count": count, "items": items}

    def import_bookmarks_html(self, data: str) -> dict:
        items = []
        pattern = r'<A\s+HREF="([^"]+)"[^>]*>([^<]+)</A>'
        matches = re.findall(pattern, data, re.IGNORECASE)
        for url, title in matches:
            items.append({"url": url, "title": title})
        count = len(items)
        self._log_import("bookmarks_html", count)
        return {"format": "bookmarks_html", "count": count, "items": items}

    def auto_detect_format(self, data: str) -> str:
        data_stripped = data.strip()
        if data_stripped.startswith("{") or data_stripped.startswith("["):
            return "json"
        if "<A HREF=" in data.upper() or "<!DOCTYPE" in data.upper():
            return "bookmarks_html"
        lines = data_stripped.split("\n")
        if len(lines) > 1 and "," in lines[0]:
            return "csv"
        if "# " in data:
            return "markdown"
        return "text"

    def import_auto(self, data: str) -> dict:
        fmt = self.auto_detect_format(data)
        if fmt == "json":
            return self.import_json(data)
        elif fmt == "csv":
            return self.import_csv(data)
        elif fmt == "markdown":
            return self.import_markdown(data)
        elif fmt == "bookmarks_html":
            return self.import_bookmarks_html(data)
        else:
            return self.import_text(data)

    def _log_import(self, fmt: str, count: int):
        self._import_history.append({"format": fmt, "count": count})

    def _log_error(self, fmt: str, error: str):
        self._errors.append({"format": fmt, "error": error})

    def get_history(self) -> List[dict]:
        return list(self._import_history)

    def get_errors(self) -> List[dict]:
        return list(self._errors)

    def supported_formats(self) -> List[str]:
        return ["json", "csv", "markdown", "text", "bookmarks_html"]

    def validate_import(self, data: str, expected_format: str = None) -> dict:
        fmt = expected_format or self.auto_detect_format(data)
        issues = []
        if not data.strip():
            issues.append("数据为空")
        if fmt == "json":
            try:
                json.loads(data)
            except json.JSONDecodeError as e:
                issues.append(f"JSON格式错误: {e}")
        elif fmt == "csv":
            if "\n" not in data:
                issues.append("CSV数据可能不完整")
        return {"format": fmt, "valid": len(issues) == 0, "issues": issues}

    def clear_history(self):
        self._import_history.clear()
        self._errors.clear()
