from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


PaperStatus = Literal[
    "draft",
    "pending",
    "pending_lecturer",
    "pending_coordinator",
    "pending_hod",
    "pending_hod_and_coordinator",
    "approved_for_library",
    "approved",
    "revision",
    "rejected",
    # New Phase statuses
    "phase1_proposal_submitted",
    "phase1_proposal_rejected",
    "phase2_pending_coordinator",
    "phase2_pending_supervisor",
    "phase3_chapters",
    "phase4_pending_examiners",
    "phase4_marking",
    "phase5_corrections",
    "phase5_pending_supervisor",
    "phase5_pending_coordinator",
    "phase5_pending_hod",
    "phase5_pending_hod_and_coordinator",
    "phase5_approved_for_library",
]
ReviewDecision = Literal["approve", "revision", "reject"]


class AuthorCreate(BaseModel):
    name: str
    email: str | None = None
    affiliation: str | None = None


class AuthorRead(BaseModel):
    id: int
    name: str
    email: str | None
    affiliation: str | None
    author_order: int

    class Config:
        from_attributes = True


class PaperCreate(BaseModel):
    title: str = Field(min_length=3, max_length=500)
    abstract: str | None = None
    discipline: str | None = None
    university: str | None = None
    year: int | None = None
    document_type: str | None = None
    publication_type: Literal["thesis", "dissertation", "systematic_review", "article", "other"] = "thesis"
    license: str | None = None
    file_name: str | None = None
    file_path: str | None = None
    file_size: int | None = None
    mime_type: str | None = None
    supervisor_id: int | None = None
    department_id: int | None = None
    work_mode: Literal["individual", "group"] = "individual"
    tags: list[str] = Field(default_factory=list)
    authors: list[AuthorCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_submission_rules(self) -> "PaperCreate":
        title = (self.title or "").strip()
        title_words = len(title.split())
        if title_words > 20:
            raise ValueError("Title must not exceed 20 words")

        abstract = (self.abstract or "").strip()
        words = len(abstract.split())
        if words < 20 or words > 300:
            raise ValueError("Abstract/Topic description must be between 20 and 300 words")

        clean_tags = [tag.strip() for tag in self.tags if (tag or "").strip()]
        if clean_tags:
            if len(clean_tags) < 3 or len(clean_tags) > 10:
                raise ValueError("Provide between 3 and 10 keywords")
            for keyword in clean_tags:
                if len(keyword.split()) > 5:
                    raise ValueError("Each keyword must be at most 5 words")
        self.tags = clean_tags

        if self.work_mode == "group":
            if len(self.authors) < 2:
                raise ValueError("Group work requires at least 2 authors")
        else:
            if len(self.authors) > 1:
                raise ValueError("Individual work accepts at most 1 author")
        return self


class SupervisorAssign(BaseModel):
    user_id: int


class SupervisorRead(BaseModel):
    user_id: int


class AnnotationCreate(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    location: str | None = Field(default=None, max_length=255)


class AnnotationRead(BaseModel):
    id: int
    author_id: int
    text: str
    location: str | None
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaperRead(BaseModel):
    id: int
    title: str
    abstract: str | None
    status: PaperStatus
    discipline: str | None
    university: str | None
    year: int
    document_type: str | None
    publication_type: str | None
    license: str | None
    doi: str | None = None
    file_name: str | None
    file_size: int | None
    mime_type: str | None
    views: int
    downloads: int
    citations: int
    rating: float | None
    review_comments: str | None
    supervisor_id: int | None
    department_id: int | None
    abstract_word_count: int | None
    supervisors: list[int] = Field(default_factory=list)
    work_mode: Literal["individual", "group"] = "individual"
    created_at: datetime | None
    authors: list[AuthorRead]
    tags: list[str]

    # 5-phase properties
    project_coordinator_id: int | None = None
    internal_examiner_id: int | None = None
    external_examiner_id: int | None = None
    ch1_student_done: bool = False
    ch2_student_done: bool = False
    ch3_student_done: bool = False
    ch4_student_done: bool = False
    ch5_student_done: bool = False
    ch1_supervisor_approved: bool = False
    ch2_supervisor_approved: bool = False
    ch3_supervisor_approved: bool = False
    ch4_supervisor_approved: bool = False
    ch5_supervisor_approved: bool = False
    combined_thesis_student_done: bool = False
    combined_thesis_supervisor_approved: bool = False
    internal_score: float | None = None
    external_score: float | None = None
    examiner_corrections: str | None = None
    examiner_result_file_name: str | None = None
    internal_result_file_name: str | None = None
    external_result_file_name: str | None = None
    lecturer_approved_at: datetime | None = None
    project_coordinator_approved_at: datetime | None = None
    hod_approved_at: datetime | None = None

    class Config:
        from_attributes = True


class PaperReview(BaseModel):
    decision: ReviewDecision
    comments: str | None = None


class PaperStats(BaseModel):
    total_papers: int
    total_views: int
    total_downloads: int
    pending_reviews: int


class SupervisorReviewSummary(BaseModel):
    supervisor_user_id: int
    supervisor_name: str | None
    supervisor_email: str
    department: str | None
    reviews_done: int
    approvals_done: int

    class Config:
        from_attributes = True
