from __future__ import annotations

"""Models package."""
from app.models.base import Base  # noqa: F401
from app.models.institution import Institution  # noqa: F401
from app.models.department import Department  # noqa: F401
from app.models.department_supervisor import DepartmentSupervisor  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_role import UserRole  # noqa: F401
from app.models.student import Student  # noqa: F401
from app.models.paper import Paper  # noqa: F401
from app.models.tag import Tag  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401
from app.models.paper_workflow import (  # noqa: F401
    PaperVersion,
    PaperReviewLog,
    PaperWorkflowEvent,
)
from app.models.thesis_system import (  # noqa: F401
    School,
    Thesis,
    Proposal,
    Step,
    StepFinalization,
    ExaminerAssignment,
    ExaminerUpload,
    HodComment,
    Correction,
    Publication,
    DocumentComment,
    AuditLog,
    ExaminationResult,
)
from app.models.phd_system import (  # noqa: F401
    PhDSupervisionLog,
    PhDSeminar,
    PhDComprehensiveExam,
    PhDTeachingRequirement,
    PhDProgressEvaluation,
    PhDReaccreditationFolder,
)
