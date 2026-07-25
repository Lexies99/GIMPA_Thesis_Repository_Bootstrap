from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional


class DepartmentBase(BaseModel):
    name: str


class DepartmentRead(DepartmentBase):
    id: int
    institution_id: int
    institution_name: Optional[str] = None
    hod_user_id: Optional[int] = None
    dean_user_id: Optional[int] = None

    class Config:
        from_attributes = True


class AssignHODRequest(BaseModel):
    user_id: int = Field(..., description="User ID to assign as HOD")


class AssignDeanRequest(BaseModel):
    user_id: int = Field(..., description="User ID to assign as Dean")


class AddSupervisorRequest(BaseModel):
    supervisor_user_ids: list[int] = Field(..., description="List of user IDs to add as supervisors")


class RemoveSupervisorRequest(BaseModel):
    supervisor_user_id: int = Field(..., description="User ID to remove as supervisor")


class DepartmentSupervisorRead(BaseModel):
    id: int
    department_id: int
    supervisor_user_id: int
    active: bool

    class Config:
        from_attributes = True
