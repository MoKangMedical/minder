"""Sync module for Minder — 多设备数据同步与冲突解决"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import hashlib
import logging

logger = logging.getLogger(__name__)


@dataclass
class SyncState:
    """同步状态"""
    device_id: str
    last_sync: str = ""
    sync_version: int = 0
    pending_changes: int = 0
    status: str = "idle"  # idle, syncing, conflict, error

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SyncChange:
    """同步变更记录"""
    change_id: str
    device_id: str
    resource_type: str
    resource_id: str
    operation: str  # create, update, delete
    timestamp: str = ""
    data: Dict = field(default_factory=dict)
    checksum: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


@dataclass
class SyncConflict:
    """同步冲突"""
    conflict_id: str
    resource_type: str
    resource_id: str
    local_change: SyncChange
    remote_change: SyncChange
    resolution: str = "pending"  # pending, local_wins, remote_wins, merged
    resolved_at: Optional[str] = None


class SyncManager:
    """同步管理器 — 管理多设备间的数据同步"""

    def __init__(self, device_id: str):
        self.device_id = device_id
        self.states: Dict[str, SyncState] = {}  # remote_device_id -> state
        self.pending_changes: List[SyncChange] = []
        self.applied_changes: List[SyncChange] = []
        self.conflicts: List[SyncConflict] = []
        self.sync_log: List[Dict] = []

    def register_device(self, device_id: str) -> SyncState:
        """注册远程设备"""
        state = SyncState(device_id=device_id)
        self.states[device_id] = state
        logger.info(f"Registered device: {device_id}")
        return state

    def record_change(
        self,
        resource_type: str,
        resource_id: str,
        operation: str,
        data: Optional[Dict] = None,
    ) -> SyncChange:
        """记录本地变更"""
        change_id = hashlib.md5(
            f"{self.device_id}:{resource_type}:{resource_id}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        change = SyncChange(
            change_id=change_id,
            device_id=self.device_id,
            resource_type=resource_type,
            resource_id=resource_id,
            operation=operation,
            data=data or {},
            checksum=hashlib.md5(json.dumps(data or {}, sort_keys=True).encode()).hexdigest(),
        )

        self.pending_changes.append(change)
        logger.info(f"Recorded change: {operation} {resource_type}/{resource_id}")
        return change

    def get_pending_export(self) -> List[Dict]:
        """导出待同步的变更"""
        return [asdict(c) for c in self.pending_changes]

    def apply_remote_changes(self, changes: List[Dict]) -> Dict:
        """应用远程变更"""
        applied = 0
        conflicts = 0

        for change_data in changes:
            change = SyncChange(**change_data)

            # 检查冲突
            local_conflict = self._check_conflict(change)
            if local_conflict:
                self.conflicts.append(local_conflict)
                conflicts += 1
            else:
                self.applied_changes.append(change)
                applied += 1

        self._log_sync("apply_remote", applied, conflicts)

        return {"applied": applied, "conflicts": conflicts}

    def _check_conflict(self, remote_change: SyncChange) -> Optional[SyncConflict]:
        """检查是否存在冲突"""
        for local in self.pending_changes:
            if (
                local.resource_type == remote_change.resource_type
                and local.resource_id == remote_change.resource_id
                and local.device_id != remote_change.device_id
            ):
                conflict_id = hashlib.md5(
                    f"{local.change_id}:{remote_change.change_id}".encode()
                ).hexdigest()[:12]
                return SyncConflict(
                    conflict_id=conflict_id,
                    resource_type=remote_change.resource_type,
                    resource_id=remote_change.resource_id,
                    local_change=local,
                    remote_change=remote_change,
                )
        return None

    def resolve_conflict(
        self, conflict_id: str, resolution: str, merged_data: Optional[Dict] = None
    ) -> bool:
        """解决同步冲突"""
        for conflict in self.conflicts:
            if conflict.conflict_id == conflict_id:
                conflict.resolution = resolution
                conflict.resolved_at = datetime.now().isoformat()
                logger.info(f"Resolved conflict {conflict_id}: {resolution}")
                return True
        return False

    def get_conflicts(self, pending_only: bool = True) -> List[Dict]:
        """获取冲突列表"""
        conflicts = self.conflicts
        if pending_only:
            conflicts = [c for c in conflicts if c.resolution == "pending"]
        return [asdict(c) for c in conflicts]

    def complete_sync(self, target_device: str):
        """完成一次同步"""
        if target_device in self.states:
            self.states[target_device].last_sync = datetime.now().isoformat()
            self.states[target_device].sync_version += 1
            self.states[target_device].status = "idle"

        # 清理已应用的变更
        self.pending_changes = []
        self._log_sync("complete", 0, 0)

    def get_sync_status(self) -> Dict:
        """获取同步状态"""
        return {
            "device_id": self.device_id,
            "pending_changes": len(self.pending_changes),
            "applied_changes": len(self.applied_changes),
            "pending_conflicts": sum(1 for c in self.conflicts if c.resolution == "pending"),
            "devices": {k: v.to_dict() for k, v in self.states.items()},
        }

    def _log_sync(self, action: str, applied: int, conflicts: int):
        self.sync_log.append({
            "action": action,
            "applied": applied,
            "conflicts": conflicts,
            "timestamp": datetime.now().isoformat(),
        })
