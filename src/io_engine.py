"""Import/Export engine for Minder — 支持多格式数据导入导出"""
from typing import Dict, List, Optional, Any, IO
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import csv
import io
import hashlib
import logging

logger = logging.getLogger(__name__)


@dataclass
class ImportJob:
    """导入任务"""
    job_id: str
    source_format: str  # json, csv, markdown, notion, evernote, obsidian
    source_file: str
    status: str = "pending"  # pending, processing, completed, failed
    total_items: int = 0
    imported_items: int = 0
    skipped_items: int = 0
    errors: List[str] = field(default_factory=list)
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ExportJob:
    """导出任务"""
    job_id: str
    target_format: str  # json, csv, markdown, html, pdf
    target_file: str
    resource_type: str  # notes, bookmarks, knowledge, all
    status: str = "pending"
    total_items: int = 0
    exported_items: int = 0
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return asdict(self)


class DataFormatHandler:
    """数据格式处理器基类"""
    
    @staticmethod
    def parse_json(content: str) -> List[Dict]:
        """解析JSON格式"""
        data = json.loads(content)
        if isinstance(data, list):
            return data
        return [data]

    @staticmethod
    def parse_csv(content: str) -> List[Dict]:
        """解析CSV格式"""
        reader = csv.DictReader(io.StringIO(content))
        return [row for row in reader]

    @staticmethod
    def parse_markdown(content: str) -> List[Dict]:
        """解析Markdown格式"""
        items = []
        current = None
        for line in content.split("\n"):
            if line.startswith("# ") and not line.startswith("## "):
                if current:
                    items.append(current)
                current = {"title": line[2:].strip(), "content": ""}
            elif current is not None:
                current["content"] += line + "\n"
        if current:
            items.append(current)
        return items

    @staticmethod
    def to_json(items: List[Dict], indent: int = 2) -> str:
        return json.dumps(items, ensure_ascii=False, indent=indent)

    @staticmethod
    def to_csv(items: List[Dict]) -> str:
        if not items:
            return ""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=items[0].keys())
        writer.writeheader()
        writer.writerows(items)
        return output.getvalue()

    @staticmethod
    def to_markdown(items: List[Dict]) -> str:
        lines = []
        for item in items:
            title = item.get("title", "Untitled")
            lines.append(f"# {title}\n")
            if "content" in item:
                lines.append(item["content"])
            lines.append("\n---\n")
        return "\n".join(lines)


class ImportExportManager:
    """导入导出管理器"""

    def __init__(self):
        self.import_jobs: Dict[str, ImportJob] = {}
        self.export_jobs: Dict[str, ExportJob] = {}
        self.formats = DataFormatHandler()
        self._id_counter = 0

    def _generate_id(self) -> str:
        self._id_counter += 1
        return f"job_{datetime.now().strftime('%Y%m%d')}_{self._id_counter:06d}"

    def create_import_job(self, source_format: str, source_file: str) -> ImportJob:
        """创建导入任务"""
        job = ImportJob(
            job_id=self._generate_id(),
            source_format=source_format,
            source_file=source_file,
        )
        self.import_jobs[job.job_id] = job
        return job

    def import_data(self, job_id: str, content: str) -> Dict:
        """执行导入"""
        job = self.import_jobs.get(job_id)
        if not job:
            return {"error": "Job not found"}

        job.status = "processing"

        try:
            parser_map = {
                "json": self.formats.parse_json,
                "csv": self.formats.parse_csv,
                "markdown": self.formats.parse_markdown,
            }

            parser = parser_map.get(job.source_format)
            if not parser:
                job.status = "failed"
                job.errors.append(f"Unsupported format: {job.source_format}")
                return {"error": f"Unsupported format: {job.source_format}"}

            items = parser(content)
            job.total_items = len(items)
            job.imported_items = len(items)
            job.status = "completed"

            return {
                "job_id": job_id,
                "total": job.total_items,
                "imported": job.imported_items,
                "items": items,
            }
        except Exception as e:
            job.status = "failed"
            job.errors.append(str(e))
            return {"error": str(e)}

    def create_export_job(self, target_format: str, target_file: str, resource_type: str = "all") -> ExportJob:
        """创建导出任务"""
        job = ExportJob(
            job_id=self._generate_id(),
            target_format=target_format,
            target_file=target_file,
            resource_type=resource_type,
        )
        self.export_jobs[job.job_id] = job
        return job

    def export_data(self, job_id: str, items: List[Dict]) -> Dict:
        """执行导出"""
        job = self.export_jobs.get(job_id)
        if not job:
            return {"error": "Job not found"}

        job.status = "processing"

        try:
            formatter_map = {
                "json": self.formats.to_json,
                "csv": self.formats.to_csv,
                "markdown": self.formats.to_markdown,
            }

            formatter = formatter_map.get(job.target_format)
            if not formatter:
                job.status = "failed"
                return {"error": f"Unsupported format: {job.target_format}"}

            content = formatter(items)
            job.total_items = len(items)
            job.exported_items = len(items)
            job.status = "completed"

            return {
                "job_id": job_id,
                "format": job.target_format,
                "total": job.total_items,
                "content": content,
            }
        except Exception as e:
            job.status = "failed"
            return {"error": str(e)}

    def get_job_status(self, job_id: str) -> Optional[Dict]:
        """获取任务状态"""
        if job_id in self.import_jobs:
            return self.import_jobs[job_id].to_dict()
        if job_id in self.export_jobs:
            return self.export_jobs[job_id].to_dict()
        return None

    def list_jobs(self, job_type: Optional[str] = None) -> List[Dict]:
        """列出所有任务"""
        jobs = []
        if job_type in (None, "import"):
            jobs.extend(j.to_dict() for j in self.import_jobs.values())
        if job_type in (None, "export"):
            jobs.extend(j.to_dict() for j in self.export_jobs.values())
        return sorted(jobs, key=lambda x: x["created_at"], reverse=True)

    def get_supported_formats(self) -> Dict[str, List[str]]:
        """获取支持的格式"""
        return {
            "import": ["json", "csv", "markdown"],
            "export": ["json", "csv", "markdown"],
        }
