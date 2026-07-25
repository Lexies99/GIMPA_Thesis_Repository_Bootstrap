from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    school_id = Column(String(64), unique=True, nullable=True, index=True)
    school = Column(String(255), nullable=True, index=True)
    full_name = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    program = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    role = Column(String(32), nullable=False, default="student")
    must_change_password = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
