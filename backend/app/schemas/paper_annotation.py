from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional


class PaperAnnotationCreate(BaseModel):
    location: Optional[str] = Field(None, description="Location in document (page, section, etc.)")
    text: str = Field(..., description="Annotation text")


class PaperAnnotationRead(BaseModel):
    id: int
    paper_id: int
    author_id: int
    location: Optional[str]
    text: str
    resolved: bool
    created_at: str

    class Config:
        from_attributes = True


class PaperAnnotationUpdate(BaseModel):
    text: Optional[str] = None
    resolved: Optional[bool] = None


class AssignSupervisorRequest(BaseModel):
    supervisor_user_ids: list[int] = Field(..., description="List of supervisor user IDs")


class PaperStatusUpdate(BaseModel):
    status: str = Field(..., description="New status (e.g., submitted, under_review, revisions_required, approved)")
    comments: Optional[str] = None
