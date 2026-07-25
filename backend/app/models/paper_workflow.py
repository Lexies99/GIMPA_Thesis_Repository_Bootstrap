from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.models.base import Base


class PaperVersion(Base):
    __tablename__ = "paper_versions"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    version_no = Column(Integer, nullable=False)
    source = Column(String(32), nullable=False, default="student_upload")
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(128), nullable=True)
    file_sha256 = Column(String(64), nullable=True)
    note = Column(Text, nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    paper = relationship("Paper")
    uploaded_by = relationship("User")


class PaperReviewLog(Base):
    __tablename__ = "paper_reviews"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reviewer_role = Column(String(32), nullable=True)
    decision = Column(String(32), nullable=False)
    comments = Column(Text, nullable=True)
    from_status = Column(String(32), nullable=True)
    to_status = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    paper = relationship("Paper")
    reviewer = relationship("User")


class PaperWorkflowEvent(Base):
    __tablename__ = "paper_workflow_events"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    from_status = Column(String(32), nullable=True)
    to_status = Column(String(32), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_role = Column(String(32), nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    paper = relationship("Paper")
    actor = relationship("User")
