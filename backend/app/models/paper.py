from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.models.department import Department  # noqa: F401
from app.models.institution import Institution  # noqa: F401
from app.models.tag import Tag  # noqa: F401
from app.models.user import User  # noqa: F401


class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    abstract = Column(Text, nullable=True)
    abstract_word_count = Column(Integer, nullable=True)
    status = Column(String(32), nullable=False, default="draft")
    document_type = Column(String(64), nullable=True)
    publication_type = Column(String(64), nullable=True, default="thesis")
    license = Column(String(64), nullable=True)
    year = Column(Integer, nullable=False, default=lambda: datetime.now(timezone.utc).year)
    discipline = Column(String(255), nullable=True, index=True)
    university = Column(String(255), nullable=True, index=True)
    file_name = Column(String(255), nullable=True)
    file_path = Column(String(1024), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(128), nullable=True)
    views = Column(Integer, nullable=False, default=0)
    downloads = Column(Integer, nullable=False, default=0)
    citations = Column(Integer, nullable=False, default=0)
    rating = Column(Float, nullable=True)
    doi = Column(String(191), nullable=True, unique=True, index=True)
    review_comments = Column(Text, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    project_coordinator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    internal_examiner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    external_examiner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Chapters checklist
    ch1_student_done = Column(Boolean, nullable=False, default=False)
    ch2_student_done = Column(Boolean, nullable=False, default=False)
    ch3_student_done = Column(Boolean, nullable=False, default=False)
    ch4_student_done = Column(Boolean, nullable=False, default=False)
    ch5_student_done = Column(Boolean, nullable=False, default=False)

    ch1_supervisor_approved = Column(Boolean, nullable=False, default=False)
    ch2_supervisor_approved = Column(Boolean, nullable=False, default=False)
    ch3_supervisor_approved = Column(Boolean, nullable=False, default=False)
    ch4_supervisor_approved = Column(Boolean, nullable=False, default=False)
    ch5_supervisor_approved = Column(Boolean, nullable=False, default=False)

    combined_thesis_student_done = Column(Boolean, nullable=False, default=False)
    combined_thesis_supervisor_approved = Column(Boolean, nullable=False, default=False)

    # Grading and corrections
    internal_score = Column(Float, nullable=True)
    external_score = Column(Float, nullable=True)
    examiner_corrections = Column(Text, nullable=True)
    examiner_result_file_path = Column(String(1024), nullable=True)
    examiner_result_file_name = Column(String(255), nullable=True)
    internal_result_file_path = Column(String(1024), nullable=True)
    internal_result_file_name = Column(String(255), nullable=True)
    external_result_file_path = Column(String(1024), nullable=True)
    external_result_file_name = Column(String(255), nullable=True)

    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    lecturer_approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    lecturer_approved_at = Column(DateTime(timezone=True), nullable=True)
    project_coordinator_approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    project_coordinator_approved_at = Column(DateTime(timezone=True), nullable=True)
    hod_approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    hod_approved_at = Column(DateTime(timezone=True), nullable=True)
    lecturer_overdue_alert_sent_at = Column(DateTime(timezone=True), nullable=True)
    work_mode = Column(String(16), nullable=False, default="individual")
    is_public = Column(Boolean, nullable=False, default=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    institution = relationship("Institution")
    department = relationship("Department")
    created_by = relationship("User", foreign_keys=[created_by_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    project_coordinator = relationship("User", foreign_keys=[project_coordinator_id])
    internal_examiner = relationship("User", foreign_keys=[internal_examiner_id])
    external_examiner = relationship("User", foreign_keys=[external_examiner_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    lecturer_approved_by = relationship("User", foreign_keys=[lecturer_approved_by_id])
    project_coordinator_approved_by = relationship("User", foreign_keys=[project_coordinator_approved_by_id])
    hod_approved_by = relationship("User", foreign_keys=[hod_approved_by_id])
    authors = relationship("PaperAuthor", cascade="all, delete-orphan", back_populates="paper")
    tags = relationship("PaperTag", cascade="all, delete-orphan", back_populates="paper")
    supervisors = relationship("PaperSupervisor", cascade="all, delete-orphan", back_populates="paper")
    annotations = relationship("PaperAnnotation", cascade="all, delete-orphan", back_populates="paper")


class PaperAuthor(Base):
    __tablename__ = "paper_authors"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    affiliation = Column(String(255), nullable=True)
    author_order = Column(Integer, default=0)
    paper = relationship("Paper", back_populates="authors")


class PaperTag(Base):
    __tablename__ = "paper_tags"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    paper = relationship("Paper", back_populates="tags")
    tag = relationship("Tag")


class PaperSupervisor(Base):
    __tablename__ = "paper_supervisors"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    paper = relationship("Paper", back_populates="supervisors")
    user = relationship("User", foreign_keys=[user_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])


class PaperAnnotation(Base):
    __tablename__ = "paper_annotations"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    text = Column(Text, nullable=False)
    resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    paper = relationship("Paper", back_populates="annotations")
    author = relationship("User")
