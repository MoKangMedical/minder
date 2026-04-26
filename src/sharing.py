"""Sharing module for Minder — 支持笔记、书签、知识片段的分享与协作"""
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import hashlib
import logging

logger = logging.getLogger(__name__)


@dataclass
class ShareLink:
    """分享链接"""
    share_id: str
    resource_type: str  # note, bookmark, knowledge, collection
    resource_id: str
    created_by: str
    created_at: str = ""
    expires_at: Optional[str] = None
    password_hash: Optional[str] = None
    max_views: int = -1  # -1 表示无限制
    current_views: int = 0
    is_active: bool = True
    permissions: List[str] = field(default_factory=lambda: ["read"])

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ShareRequest:
    """分享请求"""
    resource_type: str
    resource_id: str
    share_with: List[str]  # 用户ID列表
    message: str = ""
    permissions: List[str] = field(default_factory=lambda: ["read"])


class SharingManager:
    """分享管理器 — 管理资源的分享、权限和访问控制"""

    def __init__(self):
        self.share_links: Dict[str, ShareLink] = {}
        self.shared_resources: Dict[str, List[Dict]] = {}  # user_id -> shared items
        self.access_log: List[Dict] = []

    def create_share_link(
        self,
        resource_type: str,
        resource_id: str,
        created_by: str,
        expires_in_hours: int = -1,
        password: Optional[str] = None,
        max_views: int = -1,
        permissions: Optional[List[str]] = None,
    ) -> ShareLink:
        """创建分享链接"""
        share_id = hashlib.md5(
            f"{resource_type}:{resource_id}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]

        expires_at = None
        if expires_in_hours > 0:
            from datetime import timedelta
            expires_at = (datetime.now() + timedelta(hours=expires_in_hours)).isoformat()

        password_hash = None
        if password:
            password_hash = hashlib.sha256(password.encode()).hexdigest()

        link = ShareLink(
            share_id=share_id,
            resource_type=resource_type,
            resource_id=resource_id,
            created_by=created_by,
            expires_at=expires_at,
            password_hash=password_hash,
            max_views=max_views,
            permissions=permissions or ["read"],
        )

        self.share_links[share_id] = link
        logger.info(f"Created share link {share_id} for {resource_type}/{resource_id}")
        return link

    def access_share(self, share_id: str, user_id: str, password: Optional[str] = None) -> Optional[Dict]:
        """访问分享链接"""
        link = self.share_links.get(share_id)
        if not link or not link.is_active:
            return None

        # 检查过期
        if link.expires_at and datetime.now().isoformat() > link.expires_at:
            link.is_active = False
            logger.warning(f"Share link {share_id} has expired")
            return None

        # 检查访问次数
        if link.max_views > 0 and link.current_views >= link.max_views:
            link.is_active = False
            logger.warning(f"Share link {share_id} max views reached")
            return None

        # 检查密码
        if link.password_hash:
            if not password or hashlib.sha256(password.encode()).hexdigest() != link.password_hash:
                return None

        # 记录访问
        link.current_views += 1
        self.access_log.append({
            "share_id": share_id,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
        })

        return link.to_dict()

    def share_with_user(self, request: ShareRequest) -> List[Dict]:
        """直接分享给指定用户"""
        results = []
        for user_id in request.share_with:
            share_info = {
                "resource_type": request.resource_type,
                "resource_id": request.resource_id,
                "shared_by": user_id,
                "message": request.message,
                "permissions": request.permissions,
                "shared_at": datetime.now().isoformat(),
            }
            if user_id not in self.shared_resources:
                self.shared_resources[user_id] = []
            self.shared_resources[user_id].append(share_info)
            results.append(share_info)
            logger.info(f"Shared {request.resource_type}/{request.resource_id} with {user_id}")
        return results

    def get_shared_with_me(self, user_id: str) -> List[Dict]:
        """获取分享给我的资源"""
        return self.shared_resources.get(user_id, [])

    def revoke_share(self, share_id: str, user_id: str) -> bool:
        """撤销分享"""
        link = self.share_links.get(share_id)
        if link and link.created_by == user_id:
            link.is_active = False
            logger.info(f"Revoked share link {share_id}")
            return True
        return False

    def get_share_stats(self) -> Dict:
        """获取分享统计"""
        active = sum(1 for l in self.share_links.values() if l.is_active)
        total_access = len(self.access_log)
        return {
            "total_links": len(self.share_links),
            "active_links": active,
            "total_access": total_access,
            "shared_users": len(self.shared_resources),
        }

    def export_shares(self, user_id: str) -> str:
        """导出用户的分享记录"""
        user_shares = [l.to_dict() for l in self.share_links.values() if l.created_by == user_id]
        return json.dumps(user_shares, ensure_ascii=False, indent=2)
