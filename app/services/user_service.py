from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.core.security import hash_password, validate_password_requirements, verify_password
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.user import UserUpdate

VALID_USER_ROLES = {
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
}


ROLE_REQUIRES_SCHOOL_ID = {"student", "member", "lecturer", "staff"}


def normalize_role(role: str) -> str:
    normalized = (role or "").strip().lower()
    if normalized == "member":
        return "student"
    return normalized


def _validate_role_identity_fields(*, role: str, school_id: str | None) -> None:
    normalized_role = normalize_role(role)
    normalized_school_id = (school_id or "").strip()
    if normalized_role in ROLE_REQUIRES_SCHOOL_ID and not normalized_school_id:
        raise ValueError(f"School ID is required for role '{normalized_role}'")


def _sync_primary_role(user: User, roles: list[str]) -> None:
    if roles:
        user.role = roles[0]


def _is_admin_role_set(roles: list[str]) -> bool:
    admin_roles = {"librarian", "head_library", "system_admin"}
    return any(role in admin_roles for role in roles)


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized = email.strip().lower()
    return db.query(User).filter(User.email == normalized).first()


def get_user_by_school_id(db: Session, school_id: str) -> User | None:
    normalized = school_id.strip()
    return db.query(User).filter(User.school_id == normalized).first()


def is_allowed_institution_email(email: str) -> bool:
    normalized = (email or "").strip().lower()
    if "@" not in normalized:
        return False
    _, domain = normalized.rsplit("@", 1)
    if not domain:
        return False
    allowed = [item.strip().lower() for item in settings.allowed_email_domains.split(",") if item.strip()]
    return any(domain == base or domain.endswith(f".{base}") for base in allowed)


def get_user(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def list_users(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    email: str | None = None,
    is_active: bool | None = None,
    is_admin: bool | None = None,
    role: str | None = None,
) -> list[User]:
    query = db.query(User)
    if email:
        query = query.filter(User.email.ilike(f"%{email}%"))
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_admin is not None:
        query = query.filter(User.is_admin == is_admin)
    if role:
        normalized_role = normalize_role(role)
        query = query.join(UserRole, UserRole.user_id == User.id).filter(UserRole.role == normalized_role).distinct()
    return query.order_by(User.id.asc()).offset(skip).limit(limit).all()


def get_user_roles(db: Session, user_id: int) -> list[str]:
    rows = (
        db.query(UserRole.role)
        .filter(UserRole.user_id == user_id)
        .order_by(UserRole.created_at.asc(), UserRole.id.asc())
        .all()
    )
    roles = [row[0] for row in rows]
    return roles or ["student"]


def has_role(db: Session, user: User, role: str) -> bool:
    normalized = normalize_role(role)
    if normalize_role(user.role) == normalized:
        return True
    return (
        db.query(UserRole.id)
        .filter(UserRole.user_id == user.id, func.lower(UserRole.role) == normalized)
        .first()
        is not None
    )


def assign_role(db: Session, user: User, role: str, assigned_by_id: int | None = None) -> User:
    normalized_role = normalize_role(role)
    if normalized_role not in VALID_USER_ROLES:
        raise ValueError(f"Unsupported role: {role}")
    existing = (
        db.query(UserRole)
        .filter(UserRole.user_id == user.id, func.lower(UserRole.role) == normalized_role)
        .first()
    )
    if not existing:
        db.add(UserRole(user_id=user.id, role=normalized_role, assigned_by_id=assigned_by_id))
        db.flush()

    roles = get_user_roles(db, user.id)
    _sync_primary_role(user, roles)
    user.is_admin = _is_admin_role_set(roles)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def remove_role(db: Session, user: User, role: str) -> User:
    normalized_role = normalize_role(role)
    row = (
        db.query(UserRole)
        .filter(UserRole.user_id == user.id, func.lower(UserRole.role) == normalized_role)
        .first()
    )
    if row:
        db.delete(row)
        db.flush()

    roles = get_user_roles(db, user.id)
    if not roles:
        db.add(UserRole(user_id=user.id, role="student"))
        db.flush()
        roles = ["student"]
    _sync_primary_role(user, roles)
    user.is_admin = _is_admin_role_set(roles)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_user(
    db: Session,
    email: str,
    role: str,
    school_id: str | None,
    school: str | None,
    password: str,
    full_name: str | None,
    department: str | None = None,
    must_change_password: bool = False,
) -> User:
    normalized_email = email.strip().lower()
    normalized_role = normalize_role(role)
    if normalized_role not in VALID_USER_ROLES:
        raise ValueError(f"Unsupported role: {role}")
    _validate_role_identity_fields(role=normalized_role, school_id=school_id)
    user = User(
        email=normalized_email,
        school_id=(school_id or "").strip() or None,
        school=(school or "").strip() or None,
        full_name=full_name,
        department=(department or "").strip() or None,
        hashed_password=hash_password(password),
        is_active=False,
        is_admin=normalized_role in {"librarian", "head_library", "system_admin"},
        role=normalized_role,
        must_change_password=must_change_password,
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role=normalized_role))
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not user.is_active or not verify_password(password, user.hashed_password):
        return None
    return user


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    if payload.email is not None:
        user.email = payload.email.strip().lower()
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.school_id is not None:
        user.school_id = payload.school_id.strip() or None
    if payload.school is not None:
        user.school = payload.school.strip() or None
    if payload.department is not None:
        user.department = payload.department
    if payload.password:
        validate_password_requirements(payload.password)
        user.hashed_password = hash_password(payload.password)
        user.must_change_password = False
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
        if payload.role is None:
            user.role = "librarian" if payload.is_admin else user.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user = assign_role(db, user, payload.role)
        _validate_role_identity_fields(role=user.role, school_id=user.school_id)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    _validate_role_identity_fields(role=user.role, school_id=user.school_id)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> User:
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")
    validate_password_requirements(new_password)
    user.hashed_password = hash_password(new_password)
    user.must_change_password = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
