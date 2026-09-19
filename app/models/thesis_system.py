from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.models.base import Base


class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    dean_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dean = relationship("User", foreign_keys=[dean_user_id])


class Thesis(Base):
    __tablename__ = "theses"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    topic_title = Column(String(500), nullable=False)
    topic_description = Column(Text, nullable=True)
    topic_status = Column(String(32), nullable=False, default="pending")  # pending, accepted, rejected
    phase = Column(Integer, nullable=False, default=1)  # 1 to 5
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    student = relationship("User", foreign_keys=[student_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    department = relationship("Department")

    proposals = relationship("Proposal", cascade="all, delete-orphan", back_populates="thesis")
    steps = relationship("Step", cascade="all, delete-orphan", back_populates="thesis")
    step_finalizations = relationship("StepFinalization", cascade="all, delete-orphan", back_populates="thesis")
    examiner_assignments = relationship("ExaminerAssignment", cascade="all, delete-orphan", back_populates="thesis")
    hod_comments = relationship("HodComment", cascade="all, delete-orphan", back_populates="thesis")
    corrections = relationship("Correction", cascade="all, delete-orphan", back_populates="thesis")
    examination_results = relationship("ExaminationResult", cascade="all, delete-orphan", back_populates="thesis")
    publication = relationship("Publication", uselist=False, back_populates="thesis")
    document_comments = relationship("DocumentComment", cascade="all, delete-orphan", back_populates="thesis")
    audit_logs = relationship("AuditLog", cascade="all, delete-orphan", back_populates="thesis")


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url = Column(String(1024), nullable=False)
    status = Column(String(32), nullable=False, default="pending")  # pending, accepted, revise
    supervisor_comment = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    thesis = relationship("Thesis", back_populates="proposals")


class Step(Base):
    __tablename__ = "steps"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    file_url = Column(String(1024), nullable=False)
    status = Column(String(32), nullable=False, default="submitted")  # submitted, approved, revise
    supervisor_comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    thesis = relationship("Thesis", back_populates="steps")


class StepFinalization(Base):
    __tablename__ = "step_finalization"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    finished_by_supervisor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    finished_at = Column(DateTime(timezone=True), server_default=func.now())

    thesis = relationship("Thesis", back_populates="step_finalizations")
    finished_by_supervisor = relationship("User")


class ExaminerAssignment(Base):
    __tablename__ = "examiner_assignments"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    examiner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    examiner_type = Column(String(16), nullable=False, default="internal")  # internal, external
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    zip_generated_at = Column(DateTime(timezone=True), nullable=True)

    thesis = relationship("Thesis", back_populates="examiner_assignments")
    examiner = relationship("User")
    uploads = relationship("ExaminerUpload", cascade="all, delete-orphan", back_populates="assignment")


class ExaminerUpload(Base):
    __tablename__ = "examiner_uploads"

    id = Column(Integer, primary_key=True, index=True)
    examiner_assignment_id = Column(Integer, ForeignKey("examiner_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    excel_file_url = Column(String(1024), nullable=False)
    score = Column(Float, nullable=True)
    comment = Column(Text, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("ExaminerAssignment", back_populates="uploads")


class HodComment(Base):
    __tablename__ = "hod_comments"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    compiled_comment = Column(Text, nullable=False)
    sent_to_student_at = Column(DateTime(timezone=True), server_default=func.now())

    thesis = relationship("Thesis", back_populates="hod_comments")


class Correction(Base):
    __tablename__ = "corrections"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url = Column(String(1024), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    supervisor_status = Column(String(32), nullable=False, default="pending")  # pending, approved, revise
    coordinator_status = Column(String(32), nullable=False, default="pending")  # pending, approved, revise
    hod_status = Column(String(32), nullable=False, default="pending")  # pending, approved, revise
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    thesis = relationship("Thesis", back_populates="corrections")


class Publication(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    published_by_librarian_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    public_file_url = Column(String(1024), nullable=False)
    abstract = Column(Text, nullable=True)
    is_public = Column(Boolean, nullable=False, default=True)

    thesis = relationship("Thesis", back_populates="publication")
    published_by_librarian = relationship("User")


class DocumentComment(Base):
    __tablename__ = "document_comments"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    phase = Column(Integer, nullable=False, default=2)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    comment_text = Column(Text, nullable=False)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    thesis = relationship("Thesis", back_populates="document_comments")
    author = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(64), nullable=False)
    from_phase = Column(Integer, nullable=True)
    to_phase = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    thesis = relationship("Thesis", back_populates="audit_logs")
    actor = relationship("User")


class ExaminationResult(Base):
    __tablename__ = "examination_results"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    examiner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    examiner_type = Column(String(32), nullable=False, default="internal")  # internal, external
    score = Column(Float, nullable=True)
    recommendation = Column(String(64), nullable=True)  # Pass, Minor Revisions, Major Revisions, Fail
    general_comments = Column(Text, nullable=True)
    annotated_file_path = Column(String(1024), nullable=True)
    is_submitted = Column(Boolean, nullable=False, default=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    thesis = relationship("Thesis", back_populates="examination_results")
    examiner = relationship("User")

