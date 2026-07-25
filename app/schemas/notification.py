from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class NotificationRead(BaseModel):
    id: int
    user_id: int
    paper_id: int | None
    type: str
    message: str
    is_read: bool
    created_at: datetime | None

    class Config:
        from_attributes = True

