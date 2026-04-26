"""
Minder — 导出模块

支持将知识条目、知识图谱、搜索结果导出为多种格式。
"""

import json
import csv
import io
from datetime import datetime
from typing import Optional
from dataclasses import dataclass


class Exporter:
    """
    导出引擎

    支持格式：
    - JSON / JSONL
    - Markdown
    - CSV
    - HTML
    - 纯文本
    """

    @staticmethod
    def to_json(data, pretty: bool = True) -> str:
        """导出为JSON"""
        return json.dumps(data, ensure_ascii=False, indent=2 if pretty else None)

    @staticmethod
    def to_jsonl(items: list[dict]) -> str:
        """导出为JSON Lines"""
        lines = []
        for item in items:
            lines.append(json.dumps(item, ensure_ascii=False))
        return "\n".join(lines)

    @staticmethod
    def to_markdown(items: list[dict], title: str = "知识导出") -> str:
        """导出为Markdown"""
        lines = [
            f"# {title}",
            f"\n导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            f"条目数量: {len(items)}\n",
            "---\n",
        ]

        for i, item in enumerate(items, 1):
            item_title = item.get("title", f"条目 {i}")
            lines.append(f"## {i}. {item_title}\n")

            if item.get("item_type"):
                lines.append(f"**类型**: {item['item_type']}\n")
            if item.get("tags"):
                lines.append(f"**标签**: {', '.join(item['tags'])}\n")
            if item.get("content"):
                lines.append(f"{item['content']}\n")
            if item.get("summary"):
                lines.append(f"> **摘要**: {item['summary']}\n")
            if item.get("created_at"):
                lines.append(f"*创建时间: {item['created_at']}*\n")

            lines.append("---\n")

        return "\n".join(lines)

    @staticmethod
    def to_csv(items: list[dict]) -> str:
        """导出为CSV"""
        if not items:
            return ""

        # 收集所有字段
        all_fields = set()
        for item in items:
            all_fields.update(item.keys())

        # 排序字段，优先常用字段
        priority = ["id", "title", "item_type", "content", "summary", "tags", "created_at"]
        fields = [f for f in priority if f in all_fields]
        fields.extend(sorted(all_fields - set(fields)))

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()

        for item in items:
            row = {}
            for f in fields:
                val = item.get(f, "")
                if isinstance(val, (list, dict)):
                    val = json.dumps(val, ensure_ascii=False)
                row[f] = val
            writer.writerow(row)

        return output.getvalue()

    @staticmethod
    def to_html(items: list[dict], title: str = "知识导出") -> str:
        """导出为HTML"""
        rows = ""
        for i, item in enumerate(items, 1):
            tags_html = ""
            if item.get("tags"):
                tags_html = " ".join([f'<span class="tag">{t}</span>' for t in item["tags"]])

            rows += f"""
            <div class="card">
                <h3>{i}. {item.get('title', '未命名')}</h3>
                <div class="meta">
                    <span class="type">{item.get('item_type', '')}</span>
                    {tags_html}
                    <span class="date">{item.get('created_at', '')}</span>
                </div>
                <div class="content">{item.get('content', '')}</div>
                {f'<div class="summary"><em>摘要: {item["summary"]}</em></div>' if item.get('summary') else ''}
            </div>"""

        return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>
body {{ font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;
       background: #f8f9fa; color: #333; }}
h1 {{ text-align: center; color: #2c3e50; }}
.card {{ background: white; border-radius: 8px; padding: 20px; margin: 15px 0;
         box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
.card h3 {{ margin-top: 0; color: #2c3e50; }}
.meta {{ margin: 10px 0; font-size: 0.85em; color: #888; }}
.tag {{ background: #4A90D9; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-right: 5px; }}
.type {{ background: #27AE60; color: white; padding: 2px 8px; border-radius: 12px; margin-right: 5px; }}
.content {{ margin: 10px 0; line-height: 1.6; }}
.summary {{ color: #666; font-style: italic; border-left: 3px solid #4A90D9; padding-left: 10px; }}
.footer {{ text-align: center; color: #aaa; margin-top: 30px; font-size: 0.85em; }}
</style>
</head>
<body>
<h1>🏛️ {title}</h1>
<p style="text-align:center;color:#888;">导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M')} | 共 {len(items)} 条</p>
{rows}
<div class="footer">由 Minder 导出</div>
</body>
</html>"""

    @staticmethod
    def to_plaintext(items: list[dict]) -> str:
        """导出为纯文本"""
        lines = [
            f"知识导出 - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            f"共 {len(items)} 条",
            "=" * 50,
            "",
        ]

        for i, item in enumerate(items, 1):
            lines.append(f"[{i}] {item.get('title', '未命名')}")
            if item.get("item_type"):
                lines.append(f"    类型: {item['item_type']}")
            if item.get("tags"):
                lines.append(f"    标签: {', '.join(item['tags'])}")
            if item.get("content"):
                # 截断长内容
                content = item["content"]
                if len(content) > 200:
                    content = content[:200] + "..."
                lines.append(f"    内容: {content}")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def export_knowledge_graph(kg, fmt: str = "json") -> str:
        """导出知识图谱"""
        data = {
            "exported_at": datetime.now().isoformat(),
            "stats": kg.get_stats() if hasattr(kg, 'get_stats') else {},
            "nodes": [n.to_dict() for n in kg.nodes.values()] if hasattr(kg, 'nodes') else [],
            "edges": [e.to_dict() for e in kg.edges] if hasattr(kg, 'edges') else [],
        }

        if fmt == "json":
            return json.dumps(data, ensure_ascii=False, indent=2)
        elif fmt == "gexf":
            return Exporter._to_gexf(data)
        elif fmt == "graphml":
            return Exporter._to_graphml(data)
        return json.dumps(data, ensure_ascii=False)

    @staticmethod
    def _to_gexf(data: dict) -> str:
        """导出为GEXF格式（Gephi兼容）"""
        nodes_xml = ""
        for n in data.get("nodes", []):
            props = "".join([f'<attvalue for="{k}" value="{v}"/>'
                             for k, v in n.get("properties", {}).items()])
            nodes_xml += f'<node id="{n["id"]}" label="{n.get("label", "")}"><attvalues>{props}</attvalues></node>\n'

        edges_xml = ""
        for i, e in enumerate(data.get("edges", [])):
            edges_xml += f'<edge id="{i}" source="{e["source"]}" target="{e["target"]}" label="{e.get("relation", "")}" weight="{e.get("weight", 1)}"/>\n'

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
<meta lastmodifieddate="{datetime.now().strftime('%Y-%m-%d')}">
<creator>Minder</creator>
</meta>
<graph defaultedgetype="directed">
<nodes>{nodes_xml}</nodes>
<edges>{edges_xml}</edges>
</graph>
</gexf>"""

    @staticmethod
    def _to_graphml(data: dict) -> str:
        """导出为GraphML格式"""
        nodes_xml = ""
        for n in data.get("nodes", []):
            nodes_xml += f'<node id="{n["id"]}"><data key="label">{n.get("label", "")}</data><data key="type">{n.get("node_type", "")}</data></node>\n'

        edges_xml = ""
        for i, e in enumerate(data.get("edges", [])):
            edges_xml += f'<edge id="e{i}" source="{e["source"]}" target="{e["target"]}"><data key="relation">{e.get("relation", "")}</data></edge>\n'

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphstruct.org/xmlns">
<key id="label" for="node" attr.name="label" attr.type="string"/>
<key id="type" for="node" attr.name="type" attr.type="string"/>
<key id="relation" for="edge" attr.name="relation" attr.type="string"/>
<graph id="G" edgedefault="directed">
{nodes_xml}{edges_xml}
</graph>
</graphml>"""

    @classmethod
    def export(cls, data, fmt: str = "json", **kwargs) -> str:
        """通用导出入口"""
        if isinstance(data, list):
            exporters = {
                "json": lambda: cls.to_json(data),
                "jsonl": lambda: cls.to_jsonl(data),
                "markdown": lambda: cls.to_markdown(data, kwargs.get("title", "知识导出")),
                "csv": lambda: cls.to_csv(data),
                "html": lambda: cls.to_html(data, kwargs.get("title", "知识导出")),
                "text": lambda: cls.to_plaintext(data),
            }
        else:
            # 假设是知识图谱对象
            exporters = {
                "json": lambda: cls.export_knowledge_graph(data, "json"),
                "gexf": lambda: cls.export_knowledge_graph(data, "gexf"),
                "graphml": lambda: cls.export_knowledge_graph(data, "graphml"),
            }

        exporter = exporters.get(fmt)
        if not exporter:
            raise ValueError(f"不支持的格式: {fmt}。可选: {list(exporters.keys())}")
        return exporter()
