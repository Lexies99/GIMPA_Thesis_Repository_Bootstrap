import csv
import io
import os
import re
import shutil
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status, Response
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, desc
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user, get_db
from app.schemas.notification import NotificationRead
from app.schemas.student import ImportAccountsSummary, StudentRead
from app.schemas.user import (
    AdminBroadcastFilter,
    AdminBroadcastPreviewResponse,
    AdminBroadcastRequest,
    AdminBroadcastResponse,
    AdminPasswordResetRequest,
    AdminPasswordResetResponse,
    AdminUserCreate,
    AdminUserCreateResult,
    BroadcastAttachmentItem,
    BroadcastCsvPreviewResponse,
    BroadcastRecipientPreview,
    PasswordChangeRequest,
    UserRead,
    UserRole,
    UserRoleAssign,
    UserRoleUpdate,
    UserUpdate,
)
from app.models.user import User
from app.models.student import Student
from app.models.department import Department
from app.models.institution import Institution
from app.models.paper import Paper
from app.models.user_role import UserRole as UserRoleModel
from app.services.import_service import import_staff_accounts, import_students, load_rows_from_upload
from app.services.email_service import send_batch_emails, send_notification_email
from app.services.notification_service import create_notification, get_notification, list_notifications, mark_notification_read
from app.services.import_service import generate_default_password
from app.services.user_service import (
    admin_reset_password,
    assign_role,
    create_user,
    change_password,
    delete_user,
    get_user,
    get_user_by_email,
    get_user_by_school_id,
    get_user_roles,
    has_role,
    is_allowed_institution_email,
    list_users,
    remove_role,
    update_user,
)

router = APIRouter()


def _to_user_read(db: Session, user) -> UserRead:
    result = UserRead.model_validate(user)
    result.roles = get_user_roles(db, user.id)
    return result


def _same_department(actor, target) -> bool:
    actor_dept = (actor.department or "").strip().lower()
    target_dept = (target.department or "").strip().lower()
    return bool(actor_dept and target_dept and actor_dept == target_dept)


def _can_assign_role(db: Session, actor, role: str, target=None) -> bool:
    normalized = (role or "").strip().lower()
    if actor.is_admin or has_role(db, actor, "system_admin"):
        return True
    if normalized == "hod":
        return has_role(db, actor, "dean") and (target is None or _same_department(actor, target))
    if normalized == "project_coordinator":
        return has_role(db, actor, "hod") and (target is None or _same_department(actor, target))
    if normalized == "project_supervisor":
        return has_role(db, actor, "project_coordinator") and (target is None or _same_department(actor, target))
    if normalized == "librarian":
        return has_role(db, actor, "head_library")
    return False


@router.get("/me", response_model=UserRead)
def read_me(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> UserRead:
    return _to_user_read(db, current_user)


@router.get("/users", response_model=list[UserRead])
def read_users(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    email: str | None = None,
    is_active: bool | None = None,
    is_admin: bool | None = None,
    role: UserRole | None = None,
    current_user=Depends(get_current_user),
) -> list[UserRead]:
    is_admin_like = (
        current_user.is_admin
        or has_role(db, current_user, "librarian")
        or has_role(db, current_user, "head_library")
        or has_role(db, current_user, "system_admin")
    )
    is_dean = has_role(db, current_user, "dean")
    is_hod = has_role(db, current_user, "hod")
    is_project_coordinator = has_role(db, current_user, "project_coordinator")

    if not is_admin_like and not is_dean and not is_hod and not is_project_coordinator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    users = list_users(db, skip=skip, limit=limit, email=email, is_active=is_active, is_admin=is_admin, role=role)
    if not is_admin_like:
        if is_dean:
            dean_school_rows = (
                db.query(Institution.name)
                .join(Department, Department.institution_id == Institution.id)
                .filter(Department.dean_user_id == current_user.id)
                .distinct()
                .all()
            )
            dean_schools = {
                (row[0] or "").strip().lower()
                for row in dean_school_rows
                if (row[0] or "").strip()
            }
            if dean_schools:
                users = [u for u in users if (u.school or "").strip().lower() in dean_schools]
            else:
                actor_school = (current_user.school or "").strip().lower()
                users = [u for u in users if (u.school or "").strip().lower() == actor_school]
        elif is_hod or is_project_coordinator:
            actor_dept = (current_user.department or "").strip().lower()
            users = [u for u in users if (u.department or "").strip().lower() == actor_dept]
    return [_to_user_read(db, user) for user in users]


@router.get("/users/{user_id}", response_model=UserRead)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserRead:
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_user_read(db, user)


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user_endpoint(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserRead:
    is_admin_actor = (
        current_user.is_admin
        or has_role(db, current_user, "system_admin")
        or has_role(db, current_user, "head_library")
        or has_role(db, current_user, "librarian")
    )
    if current_user.id != user_id and not is_admin_actor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.email:
        user_roles = get_user_roles(db, user_id)
        is_external = "external_examiner" in user_roles or user.role == "external_examiner"
        if not is_external and not is_allowed_institution_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only GIMPA email addresses are allowed (@gimpa.edu.gh and subdomains)",
            )
        existing = get_user_by_email(db, payload.email)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if payload.school_id:
        existing_school_id = get_user_by_school_id(db, payload.school_id)
        if existing_school_id and existing_school_id.id != user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="School ID already registered")

    if (
        payload.is_admin is not None
        or payload.is_active is not None
        or payload.role is not None
        or payload.roles is not None
        or payload.must_change_password is not None
        or payload.program is not None
    ) and not is_admin_actor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    if payload.password and current_user.id == user_id and not is_admin_actor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use /users/change-password to update your password",
        )

    try:
        updated = update_user(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_user_read(db, updated)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Response:
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    delete_user(db, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/users/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserRead:
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not _can_assign_role(db, current_user, payload.role, target=user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to assign this role")

    updated = update_user(db, user, UserUpdate(role=payload.role))
    return _to_user_read(db, updated)


@router.patch("/users/{user_id}/activate", response_model=UserRead)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
) -> UserRead:
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    updated = update_user(db, user, UserUpdate(is_active=True))
    create_notification(
        db,
        user_id=updated.id,
        ntype="account_activated",
        message="Your account has been activated by the librarian. You can now sign in to GIMPA Thesis Management System.",
    )
    return _to_user_read(db, updated)


@router.get("/supervisors", response_model=list[UserRead])
def read_supervisors(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[UserRead]:
    current_school = (current_user.school or "").strip().lower()
    if not current_school:
        return []

    supervisors = [
        user
        for user in list_users(db, limit=500, is_active=True)
        if (user.school or "").strip().lower() == current_school
        and (has_role(db, user, "lecturer") or has_role(db, user, "project_supervisor"))
    ]
    return [_to_user_read(db, user) for user in supervisors]


@router.post("/users/change-password", response_model=UserRead)
def change_my_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserRead:
    try:
        updated = change_password(db, current_user, payload.current_password, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_user_read(db, updated)


@router.post("/admin/users", response_model=AdminUserCreateResult, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
) -> AdminUserCreateResult:
    if not is_allowed_institution_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only GIMPA email addresses are allowed (@gimpa.edu.gh and subdomains)",
        )
    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if payload.school_id and get_user_by_school_id(db, payload.school_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="School ID already registered")

    temporary_password = generate_default_password()
    try:
        created = create_user(
            db=db,
            email=payload.email,
            role=payload.role,
            school_id=payload.school_id,
            school=payload.school,
            password=temporary_password,
            full_name=payload.full_name,
            department=payload.department,
            must_change_password=True,
        )
        created.is_active = True
        if getattr(payload, "specialization", None):
            created.specialization = payload.specialization.strip()
        if getattr(payload, "research_interests", None):
            created.research_interests = payload.research_interests.strip()
        if getattr(payload, "max_student_ceiling", None):
            created.max_student_ceiling = max(1, int(payload.max_student_ceiling))
        db.add(created)
        db.commit()
        db.refresh(created)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    email_sent = send_notification_email(
        to_email=created.email,
        to_name=created.full_name,
        subject="Welcome to GIMPA Thesis Management System - Account Created",
        message=(
            "Your account has been created successfully in GIMPA Thesis Management System by an administrator.\n\n"
            "Account details:\n"
            f"- Email: {created.email}\n"
            f"- Temporary Password: {temporary_password}\n\n"
            "Next steps:\n"
            "1. Sign in to your account.\n"
            "2. Change your temporary password immediately.\n"
            "3. Verify your profile and role information."
        ),
    )
    if not email_sent:
        create_notification(
            db,
            user_id=current_admin.id,
            message=f"Account created for {created.email}, but welcome email delivery failed.",
            ntype="system",
        )

    return AdminUserCreateResult(
        user=_to_user_read(db, created),
        email_sent=email_sent,
        temporary_password=temporary_password,
    )


@router.post("/users/external-examiner", response_model=AdminUserCreateResult, status_code=status.HTTP_201_CREATED)
def create_external_examiner_account(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AdminUserCreateResult:
    # 1. Authorize: must be HOD, Coordinator, or Admin
    is_hod = has_role(db, current_user, "hod")
    is_coord = has_role(db, current_user, "project_coordinator")
    is_admin = current_user.is_admin or has_role(db, current_user, "system_admin")
    if not (is_hod or is_coord or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HOD, Project Coordinator, or Admin can create external examiner accounts")

    # 2. For external examiners, we DO NOT enforce GIMPA institutional email check (is_allowed_institution_email).
    # 3. Check duplicate emails or school_id
    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if payload.school_id and get_user_by_school_id(db, payload.school_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="School ID already registered")

    # 4. Generate temp password
    temporary_password = generate_default_password()
    try:
        created = create_user(
            db=db,
            email=payload.email,
            role="external_examiner",
            school_id=payload.school_id,
            school=payload.school or current_user.school or "External School",
            password=temporary_password,
            full_name=payload.full_name,
            department=payload.department or current_user.department or "External Department",
            must_change_password=True,
        )
        created.is_active = True
        db.add(created)
        db.commit()
        db.refresh(created)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # 5. Send welcome/activation email
    email_sent = send_notification_email(
        to_email=created.email,
        to_name=created.full_name,
        subject="Welcome to GIMPA Thesis Management System - External Examiner Account Created",
        message=(
            "Your External Examiner account has been created successfully in GIMPA Thesis Management System.\n\n"
            "Account details:\n"
            f"- Email: {created.email}\n"
            f"- Temporary Password: {temporary_password}\n\n"
            "Next steps:\n"
            "1. Sign in to your account.\n"
            "2. Change your temporary password immediately.\n"
            "3. Access the papers assigned to you for marking."
        ),
    )
    if not email_sent:
        create_notification(
            db,
            user_id=current_user.id,
            message=f"External examiner account created for {created.email}, but welcome email delivery failed.",
            ntype="system",
        )

    return AdminUserCreateResult(
        user=_to_user_read(db, created),
        email_sent=email_sent,
        temporary_password=temporary_password,
    )



@router.post("/users/{user_id}/roles", response_model=UserRead)
def assign_user_role(
    user_id: int,
    payload: UserRoleAssign,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserRead:
    target = get_user(db, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not _can_assign_role(db, current_user, payload.role, target=target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to assign this role")
    try:
        updated = assign_role(db, target, payload.role, assigned_by_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_user_read(db, updated)


@router.delete("/users/{user_id}/roles/{role}", response_model=UserRead)
def unassign_user_role(
    user_id: int,
    role: UserRole,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserRead:
    target = get_user(db, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not _can_assign_role(db, current_user, role, target=target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to remove this role")
    updated = remove_role(db, target, role)
    return _to_user_read(db, updated)


@router.get("/students", response_model=list[StudentRead])
def read_students(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    school: str | None = None,
    department: str | None = None,
    current_admin=Depends(get_current_admin),
) -> list[StudentRead]:
    query = db.query(Student)
    if school:
        query = query.filter(Student.school == school)
    if department:
        query = query.filter(Student.department == department)
    items = query.order_by(Student.student_id.asc()).offset(skip).limit(limit).all()
    return [StudentRead.model_validate(item) for item in items]


@router.post("/admin/import-accounts", response_model=ImportAccountsSummary)
async def import_accounts_endpoint(
    background_tasks: BackgroundTasks,
    students_file: UploadFile | None = File(default=None),
    lecturers_file: UploadFile | None = File(default=None),
    library_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
) -> ImportAccountsSummary:
    summary = ImportAccountsSummary()
    if not students_file and not lecturers_file and not library_file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload at least one file")

    pending_emails: list[dict[str, str]] = []
    try:
        if students_file:
            student_rows = load_rows_from_upload(students_file.filename or "", await students_file.read())
            summary.students = import_students(db, student_rows, pending_emails=pending_emails)

        if lecturers_file:
            lecturer_rows = load_rows_from_upload(lecturers_file.filename or "", await lecturers_file.read())
            summary.lecturers = import_staff_accounts(
                db,
                lecturer_rows,
                default_role="lecturer",
                pending_emails=pending_emails,
            )

        if library_file:
            library_rows = load_rows_from_upload(library_file.filename or "", await library_file.read())
            summary.library = import_staff_accounts(
                db,
                library_rows,
                default_role="librarian",
                pending_emails=pending_emails,
            )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if pending_emails:
        background_tasks.add_task(send_batch_emails, pending_emails)

    return summary


@router.post("/admin/resend-credentials-emails")
def resend_credentials_emails(
    background_tasks: BackgroundTasks,
    role: str | None = Query(None, description="Filter by role: student, lecturer, or leave empty for all"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> dict:
    """Resend temporary password and login credentials to active imported accounts in background."""
    from app.services.import_service import generate_default_password
    from app.core.security import hash_password

    query = db.query(User).filter(User.is_active.is_(True))
    if role:
        query = query.filter(User.role == role.lower().strip())
    else:
        query = query.filter(User.role.in_(["student", "lecturer", "project_supervisor", "staff"]))

    # Exclude system admin accounts
    users = [
        u for u in query.all()
        if not u.is_admin and u.email.lower() not in ("admin@gimpa.edu.gh", "admin@murrs.edu")
    ]

    pending_emails: list[dict[str, str]] = []
    for u in users:
        temp_pass = generate_default_password()
        u.hashed_password = hash_password(temp_pass)
        u.must_change_password = True
        db.add(u)

        is_student = u.role == "student"
        subject = (
            "Welcome to GIMPA Thesis Management System - Student Account Credentials"
            if is_student
            else "Welcome to GIMPA Thesis Management System - Staff Account Credentials"
        )
        msg = (
            f"Your account credentials for the GIMPA Thesis Management System:\n\n"
            f"- Role: {u.role.replace('_', ' ').title()}\n"
            f"- Email: {u.email}\n"
            f"- School ID: {u.school_id or 'N/A'}\n"
            f"- Temporary Password: {temp_pass}\n\n"
            f"Please sign in at: https://thesis.manamatechnologies.com/login\n\n"
            f"For security purposes, you will be required to change your temporary password immediately upon first login."
        )
        pending_emails.append({
            "to_email": u.email,
            "to_name": u.full_name or u.email,
            "subject": subject,
            "message": msg,
        })

    db.commit()

    if pending_emails:
        background_tasks.add_task(send_batch_emails, pending_emails)

    return {
        "total_targeted": len(users),
        "sent_count": len(pending_emails),
        "failed_count": 0,
        "details": [f"{item['to_email']}: queued for delivery" for item in pending_emails[:30]],
    }


@router.get("/notifications", response_model=list[NotificationRead])
def read_my_notifications(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
) -> list[NotificationRead]:
    items = list_notifications(db, current_user.id, limit=limit)
    return [NotificationRead.model_validate(item) for item in items]


@router.patch("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_my_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> NotificationRead:
    notification = get_notification(db, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    updated = mark_notification_read(db, notification)
    return NotificationRead.model_validate(updated)


@router.post("/users/{user_id}/reset-password", response_model=AdminPasswordResetResponse)
def reset_user_password_endpoint(
    user_id: int,
    payload: AdminPasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AdminPasswordResetResponse:
    is_admin_actor = (
        current_user.is_admin
        or has_role(db, current_user, "system_admin")
        or has_role(db, current_user, "head_library")
        or has_role(db, current_user, "librarian")
    )
    if not is_admin_actor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_pass = (payload.new_password or "").strip()
    if not new_pass:
        new_pass = generate_default_password()

    updated = admin_reset_password(
        db=db,
        user=user,
        new_password=new_pass,
        must_change_password=payload.must_change_password,
    )

    create_notification(
        db,
        user_id=updated.id,
        ntype="account_security",
        message="Your account password was reset by a system administrator. Please sign in with your temporary credentials.",
    )

    email_sent = False
    if payload.send_email and user.email:
        subject = "GIMPA Thesis Management System - Password Reset Credentials"
        msg = (
            f"Hello {user.full_name or user.email},\n\n"
            f"An administrator has reset your password for the GIMPA Thesis Management System.\n\n"
            f"- Role: {user.role.replace('_', ' ').title()}\n"
            f"- Email: {user.email}\n"
            f"- School ID: {user.school_id or 'N/A'}\n"
            f"- Temporary Password: {new_pass}\n\n"
            f"Please sign in at: https://thesis.manamatechnologies.com/login\n\n"
            f"{'Note: You will be required to update your password immediately upon login.' if payload.must_change_password else ''}\n\n"
            f"Best regards,\nGIMPA Academic Management System"
        )
        background_tasks.add_task(
            send_batch_emails,
            [{
                "to_email": user.email,
                "to_name": user.full_name or user.email,
                "subject": subject,
                "message": msg,
            }]
        )
        email_sent = True

    return AdminPasswordResetResponse(
        user_id=updated.id,
        email=updated.email,
        new_password=new_pass,
        must_change_password=updated.must_change_password,
        email_sent=email_sent,
        message=f"Password for {updated.email} successfully reset."
    )


def _get_student_phase(db: Session, student_id: int) -> str:
    paper = db.query(Paper).filter(Paper.created_by_id == student_id).order_by(desc(Paper.id)).first()
    if not paper:
        return "Phase 1: Proposals"
    st = (paper.status or "").lower()
    if st in ["draft", "proposal_submitted", "proposal_under_review"]:
        return "Phase 1: Proposals"
    if st in ["proposal_approved", "supervisor_assigned"]:
        return "Phase 2: Allocation"
    if st in ["chapters_in_progress", "chapters_submitted", "ready_for_examination"]:
        return "Phase 3: Chapters"
    if st in ["under_examination", "examination_completed"]:
        return "Phase 4: Examination"
    if st in ["corrections_approved", "dean_signoff", "published"]:
        return "Phase 5: Sign-Off"
    return "Phase 1: Proposals"


def _resolve_broadcast_recipients(
    db: Session,
    filters: AdminBroadcastFilter | None = None,
    recipient_ids: list[int] | None = None,
) -> list[User]:
    if recipient_ids and len(recipient_ids) > 0:
        return db.query(User).filter(User.id.in_(recipient_ids)).all()

    query = db.query(User)

    if filters:
        if filters.user_ids and len(filters.user_ids) > 0:
            return query.filter(User.id.in_(filters.user_ids)).all()

        if filters.roles and len(filters.roles) > 0 and "all" not in [r.lower() for r in filters.roles]:
            norm_roles = [r.strip().lower() for r in filters.roles]
            user_ids_with_role = (
                db.query(UserRoleModel.user_id)
                .filter(func.lower(UserRoleModel.role).in_(norm_roles))
                .distinct()
                .all()
            )
            role_user_ids = {r[0] for r in user_ids_with_role}
            query = query.filter(
                or_(
                    func.lower(User.role).in_(norm_roles),
                    User.id.in_(role_user_ids),
                )
            )

        if filters.schools and len(filters.schools) > 0 and "all" not in [s.lower() for s in filters.schools]:
            norm_schools = [s.strip().lower() for s in filters.schools]
            query = query.filter(func.lower(User.school).in_(norm_schools))

        if filters.departments and len(filters.departments) > 0 and "all" not in [d.lower() for d in filters.departments]:
            norm_depts = [d.strip().lower() for d in filters.departments]
            query = query.filter(func.lower(User.department).in_(norm_depts))

        if filters.programs and len(filters.programs) > 0 and "all" not in [p.lower() for p in filters.programs]:
            prog_clauses = [User.program.ilike(f"%{p}%") for p in filters.programs]
            query = query.filter(or_(*prog_clauses))

        if filters.search and filters.search.strip():
            s = f"%{filters.search.strip()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(s),
                    User.email.ilike(s),
                    User.school_id.ilike(s),
                )
            )

    matched_users = query.all()

    # Filter by phases if specified
    if filters and filters.phases and len(filters.phases) > 0 and "all" not in [p.lower() for p in filters.phases]:
        filtered_by_phase = []
        target_phases = [p.strip().lower() for p in filters.phases]
        
        for u in matched_users:
            phase_label = _get_student_phase(db, u.id).lower()
            if any(tp in phase_label for tp in target_phases):
                filtered_by_phase.append(u)
        return filtered_by_phase

    return matched_users


@router.post("/admin/broadcast-preview", response_model=AdminBroadcastPreviewResponse)
@router.post("/users/broadcast-preview", response_model=AdminBroadcastPreviewResponse)
def preview_broadcast_recipients_endpoint(
    payload: AdminBroadcastFilter,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AdminBroadcastPreviewResponse:
    is_admin_actor = (
        current_user.is_admin
        or has_role(db, current_user, "system_admin")
        or has_role(db, current_user, "head_library")
        or has_role(db, current_user, "librarian")
        or has_role(db, current_user, "dean")
        or has_role(db, current_user, "hod")
        or has_role(db, current_user, "project_coordinator")
    )
    if not is_admin_actor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to broadcast messages")

    recipients = _resolve_broadcast_recipients(db, filters=payload)
    items = []
    for u in recipients:
        phase = _get_student_phase(db, u.id) if u.role == "student" else None
        items.append(
            BroadcastRecipientPreview(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                school_id=u.school_id,
                role=u.role,
                school=u.school,
                department=u.department,
                program=u.program,
                phase=phase,
                is_active=u.is_active,
            )
        )
    return AdminBroadcastPreviewResponse(
        total_count=len(items),
        recipients=items,
    )


BROADCAST_ATTACHMENTS_DIR = os.path.join("uploads", "broadcast_attachments")
os.makedirs(BROADCAST_ATTACHMENTS_DIR, exist_ok=True)


@router.post("/admin/broadcast-attachment", response_model=BroadcastAttachmentItem)
@router.post("/users/broadcast-attachment", response_model=BroadcastAttachmentItem)
def upload_broadcast_attachment_endpoint(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BroadcastAttachmentItem:
    is_authorized = (
        current_user.is_admin
        or has_role(db, current_user, "system_admin")
        or has_role(db, current_user, "head_library")
        or has_role(db, current_user, "librarian")
        or has_role(db, current_user, "dean")
        or has_role(db, current_user, "hod")
        or has_role(db, current_user, "project_coordinator")
        or has_role(db, current_user, "project_supervisor")
        or has_role(db, current_user, "lecturer")
    )
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to upload attachments")

    raw_filename = os.path.basename(file.filename or "attachment.dat")
    safe_prefix = uuid.uuid4().hex[:12]
    saved_filename = f"{safe_prefix}_{raw_filename}"
    file_path = os.path.join(BROADCAST_ATTACHMENTS_DIR, saved_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)
    file_url = f"/api/v1/users/broadcast-attachment/download/{saved_filename}"

    return BroadcastAttachmentItem(
        filename=raw_filename,
        file_url=file_url,
        file_size=file_size,
        content_type=file.content_type or "application/octet-stream",
    )


@router.get("/admin/broadcast-attachment/download/{filename}")
@router.get("/users/broadcast-attachment/download/{filename}")
def download_broadcast_attachment_endpoint(
    filename: str,
):
    safe_name = os.path.basename(filename)
    file_path = os.path.join(BROADCAST_ATTACHMENTS_DIR, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found")
    display_name = safe_name.split("_", 1)[1] if "_" in safe_name else safe_name
    return FileResponse(
        path=file_path,
        filename=display_name,
        media_type="application/octet-stream",
    )


@router.post("/admin/broadcast-csv-preview", response_model=BroadcastCsvPreviewResponse)
@router.post("/users/broadcast-csv-preview", response_model=BroadcastCsvPreviewResponse)
async def preview_broadcast_csv_recipients_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> BroadcastCsvPreviewResponse:
    is_authorized = (
        current_user.is_admin
        or has_role(db, current_user, "system_admin")
        or has_role(db, current_user, "head_library")
        or has_role(db, current_user, "librarian")
        or has_role(db, current_user, "dean")
        or has_role(db, current_user, "hod")
        or has_role(db, current_user, "project_coordinator")
    )
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to parse recipients")

    contents = await file.read()
    text = contents.decode("utf-8-sig", errors="ignore")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return BroadcastCsvPreviewResponse(
            total_rows_parsed=0,
            matched_count=0,
            unmatched_count=0,
            matched_recipients=[],
            unmatched_identifiers=[],
            message="Uploaded CSV file is empty.",
        )

    identifiers: set[str] = set()
    reader = csv.reader(io.StringIO(text))
    header = None
    for row in reader:
        if not row:
            continue
        if header is None:
            header = [h.strip().lower() for h in row]
            if any(k in ["email", "student_id", "school_id", "id", "index_number", "username"] for k in header):
                continue
            else:
                for cell in row:
                    val = cell.strip()
                    if val and ("@" in val or len(val) >= 3):
                        identifiers.add(val)
        else:
            for cell in row:
                val = cell.strip()
                if val and ("@" in val or len(val) >= 3):
                    identifiers.add(val)

    if not identifiers:
        for line in lines:
            parts = [p.strip() for p in re.split(r"[,;\t]", line) if p.strip()]
            for p in parts:
                if "@" in p or len(p) >= 3:
                    identifiers.add(p)

    all_users = db.query(User).all()
    id_map = {i.lower(): i for i in identifiers}
    matched_users: list[User] = []
    matched_set: set[str] = set()

    for u in all_users:
        u_email = (u.email or "").lower()
        u_school_id = (u.school_id or "").lower()
        is_match = (u_email in id_map) or (u_school_id and u_school_id in id_map)
        if is_match:
            matched_users.append(u)
            if u_email in id_map:
                matched_set.add(id_map[u_email])
            if u_school_id in id_map:
                matched_set.add(id_map[u_school_id])

    unmatched = [ident for ident in identifiers if ident not in matched_set]

    recipients = [
        BroadcastRecipientPreview(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            school_id=u.school_id,
            role=u.role,
            school=u.school,
            department=u.department,
            program=u.program,
            phase=None,
            is_active=u.is_active,
        )
        for u in matched_users
    ]

    return BroadcastCsvPreviewResponse(
        total_rows_parsed=len(identifiers),
        matched_count=len(recipients),
        unmatched_count=len(unmatched),
        matched_recipients=recipients,
        unmatched_identifiers=unmatched[:50],
        message=f"Successfully matched {len(recipients)} recipient account(s) from {len(identifiers)} parsed CSV entries.",
    )


@router.post("/admin/broadcast", response_model=AdminBroadcastResponse)
@router.post("/users/broadcast", response_model=AdminBroadcastResponse)
def send_admin_broadcast_endpoint(
    payload: AdminBroadcastRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AdminBroadcastResponse:
    is_admin_actor = (
        current_user.is_admin
        or has_role(db, current_user, "system_admin")
        or has_role(db, current_user, "head_library")
        or has_role(db, current_user, "librarian")
        or has_role(db, current_user, "dean")
        or has_role(db, current_user, "hod")
        or has_role(db, current_user, "project_coordinator")
    )
    if not is_admin_actor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to broadcast messages")

    subject = (payload.subject or "").strip()
    body = (payload.message or "").strip()
    if not subject or not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject and message are required")

    recipients = _resolve_broadcast_recipients(
        db,
        filters=payload.filters,
        recipient_ids=payload.recipient_ids,
    )

    if not recipients:
        return AdminBroadcastResponse(
            recipients_count=0,
            notifications_created=0,
            emails_queued=0,
            message="No recipients matched the specified criteria.",
        )

    sender_title = current_user.full_name or current_user.email
    notif_msg = f"[{subject}] {body}"

    attachments_text = ""
    if payload.attachments:
        attachments_text = "\n\n📎 Attached Documents:\n"
        for att in payload.attachments:
            full_url = f"https://thesis.manamatechnologies.com{att.file_url}" if att.file_url.startswith("/") else att.file_url
            size_kb = f" ({round(att.file_size / 1024, 1)} KB)" if att.file_size else ""
            attachments_text += f"• {att.filename}{size_kb}: {full_url}\n"
        notif_msg += attachments_text

    notifications_created = 0
    for u in recipients:
        create_notification(
            db,
            user_id=u.id,
            ntype=f"broadcast_{payload.announcement_type}",
            message=notif_msg,
        )
        notifications_created += 1

    emails_queued = 0
    if payload.include_email:
        email_items = []
        for u in recipients:
            if not u.email:
                continue
            email_body = (
                f"Hello {u.full_name or u.email},\n\n"
                f"You have received a message from {sender_title}:\n\n"
                f"{body}"
                f"{attachments_text}\n"
                f"----------------------------------------\n"
                f"Access the GIMPA Portal: https://thesis.manamatechnologies.com/login\n\n"
                f"Ghana Institute of Management and Public Administration (GIMPA)"
            )
            email_items.append({
                "to_email": u.email,
                "to_name": u.full_name or u.email,
                "subject": f"[GIMPA Notice] {subject}",
                "message": email_body,
            })
            emails_queued += 1

        if email_items:
            background_tasks.add_task(send_batch_emails, email_items)

    db.commit()

    return AdminBroadcastResponse(
        recipients_count=len(recipients),
        notifications_created=notifications_created,
        emails_queued=emails_queued,
        message=f"Broadcast successfully dispatched to {len(recipients)} recipient(s)."
    )

