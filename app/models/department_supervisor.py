from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Boolean, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.models.base import Base


class DepartmentSupervisor(Base):
    __tablename__ = "department_supervisors"
    __table_args__ = (UniqueConstraint("department_id", "supervisor_user_id", name="uq_dept_supervisor"),)

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    supervisor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    department = relationship("Department")
    supervisor = relationship("User")
