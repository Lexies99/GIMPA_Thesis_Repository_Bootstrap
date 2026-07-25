from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User
from app.services.user_service import get_user_by_email, has_role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(token, expected_type="access")
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = get_user_by_email(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    if user.must_change_password:
        allowed_paths = {
            f"{settings.api_prefix}/me",
            f"{settings.api_prefix}/users/change-password",
            f"{settings.api_prefix}/auth/logout",
        }
        if request.url.path not in allowed_paths:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Password change required before accessing other resources",
            )

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if (
        not current_user.is_admin
        and not has_role(db, current_user, "librarian")
        and not has_role(db, current_user, "head_library")
        and not has_role(db, current_user, "system_admin")
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def get_current_librarian(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if not has_role(db, current_user, "librarian"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Librarian access required")
    return current_user


def get_current_reviewer(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    reviewer_roles = {"lecturer", "project_supervisor", "librarian", "project_coordinator", "hod", "external_examiner"}
    if not any(has_role(db, current_user, role) for role in reviewer_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewer access required")
    return current_user


def require_role(required_role: str):
    """Dependency to require a specific role."""
    def check_role(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not has_role(db, current_user, required_role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"{required_role} access required")
        return current_user
    return check_role


def require_any_role(*roles: str):
    """Dependency to require any of the specified roles."""
    def check_roles(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not any(has_role(db, current_user, role) for role in roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return check_roles


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> User | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_access_token(token, expected_type="access")
        if not payload or "sub" not in payload:
            return None
        user = get_user_by_email(db, payload["sub"])
        if user and user.is_active:
            return user
        return None
    except Exception:
        return None
