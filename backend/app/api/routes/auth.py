from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token, create_refresh_token, decode_access_token
from app.schemas.token import RefreshToken, Token, SsoVerifyRequest, SsoVerifyResponse, SsoSyncPasswordRequest
from app.schemas.user import UserCreate, UserRead
from app.services.notification_service import create_notification
from app.services.user_service import (
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_school_id,
    get_user_roles,
    is_allowed_institution_email,
    list_users,
)
from app.services.refresh_token_service import (
    create_refresh_token_record,
    get_refresh_token,
    is_refresh_token_valid,
    revoke_refresh_token,
)
from app.core.config import settings

router = APIRouter()



@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    if payload.role in {"student", "member"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Students do not need accounts. Import student records via CSV/XLSX instead.",
        )
    # Enforce configurable self-registration whitelist
    allowed = {item.strip().lower() for item in settings.self_registration_roles.split(",") if item.strip()}
    if payload.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Self-registration for role '{payload.role}' is not allowed. "
                "Please ask an administrator or import accounts via the admin import tool."
            ),
        )
    if not is_allowed_institution_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only GIMPA email addresses are allowed (@gimpa.edu.gh and subdomains)",
        )

    existing = get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if payload.school_id and get_user_by_school_id(db, payload.school_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="School ID already registered")

    try:
        user = create_user(
            db=db,
            email=payload.email,
            role=payload.role,
            school_id=payload.school_id,
            school=payload.school,
            password=payload.password,
            full_name=payload.full_name,
            department=payload.department,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    librarians = list_users(db, limit=200, is_active=True, role="librarian")
    for librarian in librarians:
        create_notification(
            db,
            user_id=librarian.id,
            ntype="account_activation_required",
            message=(
                "A new account requires activation.\n"
                f"User email: {user.email}\n"
                "Please review and activate the account from the Administration panel."
            ),
        )
    response = UserRead.model_validate(user)
    response.roles = get_user_roles(db, user.id)
    return response


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        existing_user = get_user_by_email(db, form_data.username)
        if existing_user and not existing_user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is pending librarian activation")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(subject=user.email)
    refresh_token, jti, expires_at = create_refresh_token(subject=user.email)
    create_refresh_token_record(db, user.id, jti, expires_at)
    return Token(access_token=access_token, refresh_token=refresh_token, must_change_password=bool(user.must_change_password))


@router.post("/refresh", response_model=Token)
def refresh(payload: RefreshToken, db: Session = Depends(get_db)) -> Token:
    decoded = decode_access_token(payload.refresh_token, expected_type="refresh")
    if not decoded or "sub" not in decoded or "jti" not in decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    record = get_refresh_token(db, decoded["jti"])
    if not record or not is_refresh_token_valid(record):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = get_user_by_email(db, decoded["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    revoke_refresh_token(db, record)
    access_token = create_access_token(subject=user.email)
    refresh_token, jti, expires_at = create_refresh_token(subject=user.email)
    create_refresh_token_record(db, user.id, jti, expires_at)
    return Token(access_token=access_token, refresh_token=refresh_token, must_change_password=bool(user.must_change_password))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshToken, db: Session = Depends(get_db)) -> Response:
    decoded = decode_access_token(payload.refresh_token, expected_type="refresh")
    if not decoded or "jti" not in decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    record = get_refresh_token(db, decoded["jti"])
    if record:
        revoke_refresh_token(db, record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/sso/verify-credentials", response_model=SsoVerifyResponse)
def sso_verify_credentials(payload: SsoVerifyRequest, db: Session = Depends(get_db)) -> SsoVerifyResponse:
    """
    Central Identity Provider (SSO) endpoint.
    Used by other GIMPA applications (e.g. libraryapp.manamatechnologies.com)
    to verify unified passwords and fetch authoritative user roles.
    """
    identifier = payload.identifier.strip()
    user = authenticate_user(db, identifier, payload.password)
    if not user and "@" not in identifier:
        # If user passed their staff/school ID instead of email
        u = get_user_by_school_id(db, identifier)
        if u and authenticate_user(db, u.email, payload.password):
            user = u

    if not user:
        return SsoVerifyResponse(
            authenticated=False,
            message="Invalid credentials or incorrect password.",
            user=None,
            access_token=None,
        )

    if not user.is_active:
        return SsoVerifyResponse(
            authenticated=False,
            message="Account is inactive or pending administrator activation.",
            user=None,
            access_token=None,
        )

    roles = get_user_roles(db, user.id)
    access_token = create_access_token(subject=user.email)

    return SsoVerifyResponse(
        authenticated=True,
        message="Authentication successful.",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name or user.email.split("@")[0],
            "school_id": user.school_id,
            "role": user.role,
            "roles": roles,
            "is_admin": bool(user.is_admin or "system_admin" in roles),
            "department": user.department,
            "school": user.school,
            "program": user.program,
            "must_change_password": bool(user.must_change_password),
            "password_hash": user.hashed_password,
        },
        access_token=access_token,
    )


@router.post("/sso/sync-password")
def sso_sync_password(payload: SsoSyncPasswordRequest, db: Session = Depends(get_db)):
    """
    Propagate password updates from any integrated app back into the Central Identity Provider.
    """
    from app.core.security import get_password_hash, verify_password
    from app.services.user_service import validate_password_requirements

    email = payload.email.strip().lower()
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found in Central Identity Provider.")

    if payload.old_password:
        if not verify_password(payload.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password verification failed.")

    validate_password_requirements(payload.new_password)
    user.hashed_password = get_password_hash(payload.new_password)
    user.must_change_password = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"status": "success", "message": f"Central password synchronized for {user.email}."}

