from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.models.base import Base


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("institution_id", "name", name="uq_department_institution_name"),)

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    hod_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    dean_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    institution = relationship("Institution")
    hod = relationship("User", foreign_keys=[hod_user_id])
    dean = relationship("User", foreign_keys=[dean_user_id])
