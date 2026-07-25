from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


UserRole = Literal[
    "student",
    "member",
    "lecturer",
    "staff",
    "project_coordinator",
    "project_supervisor",
    "hod",
    "dean",
    "system_admin",
    "librarian",
    "head_library",
    "external_examiner",
]


class UserBase(BaseModel):
    email: EmailStr
    school_id: str | None = None
    school: str | None = None
    full_name: str | None = None
    department: str | None = None
    program: str | None = None


class UserCreate(UserBase):
    role: UserRole = "student"
    school_id: str | None = None
    school: str | None = None
    department: str | None = None
    password: str

    @model_validator(mode="after")
    def validate_role_specific_fields(self) -> "UserCreate":
        role = (self.role or "").strip().lower()
        school_id = (self.school_id or "").strip()
        school = (self.school or "").strip()
        department = (self.department or "").strip()

        if role in {"student", "member"}:
            if not school:
                raise ValueError("School is required for students")
            if not school_id:
                raise ValueError("School ID is required for students")

        if role in {"lecturer", "staff", "project_coordinator", "hod"}:
            if not school:
                raise ValueError("School is required for this role")
            if not department:
                raise ValueError("Department is required for this role")

        return self


class AdminUserCreate(UserBase):
    role: UserRole = "student"
    school_id: str | None = None
    school: str | None = None
    department: str | None = None

    @model_validator(mode="after")
    def validate_role_specific_fields(self) -> "AdminUserCreate":
        role = (self.role or "").strip().lower()
        school_id = (self.school_id or "").strip()
        school = (self.school or "").strip()
        department = (self.department or "").strip()

        if role in {"student", "member"}:
            if not school:
                raise ValueError("School is required for students")
            if not school_id:
                raise ValueError("School ID is required for students")

        if role in {"lecturer", "staff", "project_coordinator", "hod"}:
            if not school:
                raise ValueError("School is required for this role")
            if not department:
                raise ValueError("Department is required for this role")

        return self


class UserRead(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    role: UserRole
    roles: list[UserRole] = Field(default_factory=list)
    must_change_password: bool = False

    class Config:
        from_attributes = True


class AdminUserCreateResult(BaseModel):
    user: UserRead
    email_sent: bool = False


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    school_id: str | None = None
    school: str | None = None
    full_name: str | None = None
    department: str | None = None
    program: str | None = None
    password: str | None = None
    is_admin: bool | None = None
    is_active: bool | None = None
    role: UserRole | None = None


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserRoleAssign(BaseModel):
    role: UserRole


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
