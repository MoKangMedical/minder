"""Backup module for Minder — 数据备份、恢复与同步管理"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import hashlib
import os
import logging
import shutil

logger = logging.getLogger(__name__)


@dataclass
class BackupManifest:
    """备份清单"""
    backup_id: str
    created_at: str
    backup_type: str  # full, incremental, differential
    source_path: str
    backup_path: str
    file_count: int = 0
    total_size_bytes: int = 0
    checksum: str = ""
    notes: str = ""
    status: str = "pending"  # pending, in_progress, completed, failed
    includes: List[str] = field(default_factory=lambda: ["notes", "bookmarks", "knowledge", "config"])

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RestorePoint:
    """恢复点"""
    restore_id: str
    backup_id: str
    created_at: str
    description: str
    is_verified: bool = False


class BackupManager:
    """备份管理器 — 管理数据的备份、恢复和自动同步"""

    def __init__(self, backup_dir: str = "./backups"):
        self.backup_dir = backup_dir
        self.manifests: Dict[str, BackupManifest] = {}
        self.restore_points: List[RestorePoint] = []
        self.auto_backup_enabled = False
        self.auto_backup_interval_hours = 24
        self.retention_days = 30

    def _ensure_backup_dir(self):
        """确保备份目录存在"""
        os.makedirs(self.backup_dir, exist_ok=True)

    def create_backup(
        self,
        source_path: str,
        backup_type: str = "full",
        notes: str = "",
        includes: Optional[List[str]] = None,
    ) -> BackupManifest:
        """创建备份"""
        self._ensure_backup_dir()

        backup_id = hashlib.md5(
            f"{source_path}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(self.backup_dir, f"{backup_id}_{timestamp}")

        manifest = BackupManifest(
            backup_id=backup_id,
            created_at=datetime.now().isoformat(),
            backup_type=backup_type,
            source_path=source_path,
            backup_path=backup_path,
            notes=notes,
            includes=includes or ["notes", "bookmarks", "knowledge", "config"],
        )

        try:
            manifest.status = "in_progress"
            if os.path.exists(source_path):
                if os.path.isdir(source_path):
                    shutil.copytree(source_path, backup_path, dirs_exist_ok=True)
                else:
                    shutil.copy2(source_path, backup_path)

                # 计算统计信息
                file_count = 0
                total_size = 0
                for root, _, files in os.walk(backup_path):
                    for f in files:
                        fp = os.path.join(root, f)
                        file_count += 1
                        total_size += os.path.getsize(fp)

                manifest.file_count = file_count
                manifest.total_size_bytes = total_size
                manifest.checksum = self._compute_checksum(backup_path)
                manifest.status = "completed"
            else:
                manifest.status = "failed"
                manifest.notes = f"Source path not found: {source_path}"
                logger.error(f"Backup failed: source {source_path} not found")
        except Exception as e:
            manifest.status = "failed"
            manifest.notes = str(e)
            logger.error(f"Backup failed: {e}")

        self.manifests[backup_id] = manifest
        logger.info(f"Backup {backup_id} created: {manifest.status}")
        return manifest

    def restore_backup(self, backup_id: str, target_path: Optional[str] = None) -> bool:
        """从备份恢复"""
        manifest = self.manifests.get(backup_id)
        if not manifest:
            logger.error(f"Backup {backup_id} not found")
            return False

        if manifest.status != "completed":
            logger.error(f"Backup {backup_id} is not in completed state")
            return False

        restore_target = target_path or manifest.source_path

        try:
            # 创建恢复点
            restore_point = RestorePoint(
                restore_id=hashlib.md5(f"restore:{datetime.now().isoformat()}".encode()).hexdigest()[:12],
                backup_id=backup_id,
                created_at=datetime.now().isoformat(),
                description=f"Restore from backup {backup_id}",
            )

            if os.path.isdir(manifest.backup_path):
                shutil.copytree(manifest.backup_path, restore_target, dirs_exist_ok=True)
            else:
                shutil.copy2(manifest.backup_path, restore_target)

            restore_point.is_verified = True
            self.restore_points.append(restore_point)
            logger.info(f"Restored backup {backup_id} to {restore_target}")
            return True
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return False

    def list_backups(self, backup_type: Optional[str] = None) -> List[Dict]:
        """列出所有备份"""
        backups = list(self.manifests.values())
        if backup_type:
            backups = [b for b in backups if b.backup_type == backup_type]
        return [b.to_dict() for b in sorted(backups, key=lambda x: x.created_at, reverse=True)]

    def delete_backup(self, backup_id: str) -> bool:
        """删除备份"""
        manifest = self.manifests.get(backup_id)
        if not manifest:
            return False

        try:
            if os.path.exists(manifest.backup_path):
                if os.path.isdir(manifest.backup_path):
                    shutil.rmtree(manifest.backup_path)
                else:
                    os.remove(manifest.backup_path)
            del self.manifests[backup_id]
            logger.info(f"Deleted backup {backup_id}")
            return True
        except Exception as e:
            logger.error(f"Delete failed: {e}")
            return False

    def cleanup_old_backups(self) -> int:
        """清理过期备份"""
        from datetime import timedelta
        cutoff = datetime.now() - timedelta(days=self.retention_days)
        to_delete = []

        for bid, manifest in self.manifests.items():
            created = datetime.fromisoformat(manifest.created_at)
            if created < cutoff:
                to_delete.append(bid)

        deleted = 0
        for bid in to_delete:
            if self.delete_backup(bid):
                deleted += 1

        logger.info(f"Cleaned up {deleted} old backups")
        return deleted

    def get_backup_stats(self) -> Dict:
        """获取备份统计"""
        total_size = sum(m.total_size_bytes for m in self.manifests.values())
        completed = sum(1 for m in self.manifests.values() if m.status == "completed")
        return {
            "total_backups": len(self.manifests),
            "completed": completed,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "restore_points": len(self.restore_points),
            "auto_backup_enabled": self.auto_backup_enabled,
        }

    def _compute_checksum(self, path: str) -> str:
        """计算目录/文件校验和"""
        hasher = hashlib.md5()
        if os.path.isdir(path):
            for root, _, files in sorted(os.walk(path)):
                for f in sorted(files):
                    fp = os.path.join(root, f)
                    with open(fp, "rb") as fh:
                        hasher.update(fh.read())
        else:
            with open(path, "rb") as fh:
                hasher.update(fh.read())
        return hasher.hexdigest()

    def export_manifest(self) -> str:
        """导出备份清单"""
        data = {
            "manifests": {k: v.to_dict() for k, v in self.manifests.items()},
            "restore_points": [asdict(rp) for rp in self.restore_points],
            "stats": self.get_backup_stats(),
        }
        return json.dumps(data, ensure_ascii=False, indent=2)
