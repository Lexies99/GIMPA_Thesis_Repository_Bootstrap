from __future__ import annotations

from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.institution import Institution
from app.models.department import Department
from app.models.tag import Tag
from app.models.paper import Paper, PaperAuthor, PaperTag
from app.models.paper_workflow import PaperVersion, PaperReviewLog, PaperWorkflowEvent
from app.models.notification import Notification
from app.models.user_role import UserRole
from app.models.student import Student

__all__ = [
    "User",
    "RefreshToken",
    "Institution",
    "Department",
    "Tag",
    "Paper",
    "PaperAuthor",
    "PaperTag",
    "PaperVersion",
    "PaperReviewLog",
    "PaperWorkflowEvent",
    "Notification",
    "UserRole",
    "Student",
]
