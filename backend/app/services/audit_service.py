"""
Audit logging service:
Records all critical mutations (status changes, cash collections, reschedules).
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import AuditLog

class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        actor_id: Optional[str],
        action: str,
        entity: str,
        entity_id: str,
        before_value: Optional[str] = None,
        after_value: Optional[str] = None
    ) -> AuditLog:
        """Appends an immutable audit log record to the database."""
        log_entry = AuditLog(
            actor_id=actor_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            before_value=before_value,
            after_value=after_value
        )
        db.add(log_entry)
        await db.flush()
        return log_entry

audit_service = AuditService()
