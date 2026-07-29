from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class BulkAssignItem(BaseModel):
    student_id: str = Field(..., description="Student school ID, email, or thesis ID")
    internal_examiner_id: str = Field(..., description="Internal Examiner ID, staff ID, or email")
    external_examiner_id: str = Field(..., description="External Examiner ID, staff ID, or email")


class BulkAssignSummary(BaseModel):
    total_processed: int = 0
    successful: int = 0
    failed: int = 0
    errors: list[str] = []


class ExaminerQualitativeFeedback(BaseModel):
    examiner_type: str
    general_comments: str | None = None
    recommendation: str | None = None
    submitted_at: str | None = None


class StudentFeedbackResponse(BaseModel):
    """
    Response model for Students and Supervisors.
    EXCLUDES numerical marks and grade breakdowns.
    """
    thesis_id: int
    topic_title: str
    status: str
    revision_status: str | None = None
    compiled_comments: str | None = None
    qualitative_feedback: list[ExaminerQualitativeFeedback] = []
    file_path: str | None = None
    file_name: str | None = None


class ExaminerMarkDetail(BaseModel):
    id: int | None = None
    examiner_id: int
    examiner_name: str | None = None
    examiner_type: str
    score: float | None = None
    recommendation: str | None = None
    general_comments: str | None = None
    annotated_file_path: str | None = None
    is_submitted: bool = False
    submitted_at: str | None = None


class AdminMarkSheetResponse(BaseModel):
    """
    Response model for Admin roles (Coordinator, HOD, Dean, System Admin).
    INCLUDES complete numerical mark breakdown and rubric details.
    """
    thesis_id: int
    topic_title: str
    status: str
    internal_score: float | None = None
    external_score: float | None = None
    average_score: float | None = None
    final_recommendation: str | None = None
    examiner_results: list[ExaminerMarkDetail] = []


class ExaminerGradingRequest(BaseModel):
    score: float | None = Field(None, ge=0.0, le=100.0, description="Numerical mark out of 100")
    recommendation: str | None = Field(None, description="Pass, Minor Revisions, Major Revisions, or Fail")
    general_comments: str | None = Field(None, description="Qualitative feedback and general comments")
    annotated_file_path: str | None = Field(None, description="Path to annotated document")
