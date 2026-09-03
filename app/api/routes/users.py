from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user, get_db
from app.schemas.notification import NotificationRead
from app.schemas.student import ImportAccountsSummary, StudentRead
from app.schemas.user import (
    AdminUserCreate,
    AdminUserCreateResult,
    PasswordChangeRequest,
    UserRead,
    UserRole,
    UserRoleAssign,
    UserRoleUpdate,
    UserUpdate,
)
from app.models.student import Student
from app.models.department import Department
from app.models.institution import Institution
from app.services.import_service import import_staff_accounts, import_students, load_rows_from_upload
from app.services.email_service import send_notification_email
from app.services.notification_service import create_notification, get_notification, list_notifications, mark_notification_read
from app.services.import_service import generate_default_password
from app.services.user_service import (
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
    if current_user.id != user_id and not current_user.is_admin:
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

    if (payload.is_admin is not None or payload.is_active is not None or payload.role is not None) and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    if payload.password and current_user.id == user_id and not current_user.is_admin:
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
        message="Your account has been activated by the librarian. You can now sign in to Gimpa Research Repository.",
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
        db.add(created)
        db.commit()
        db.refresh(created)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    email_sent = send_notification_email(
        to_email=created.email,
        to_name=created.full_name,
        subject="Welcome to Gimpa Research Repository - Account Created",
        message=(
            "Your account has been created successfully in Gimpa Research Repository by an administrator.\n\n"
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

    return AdminUserCreateResult(user=_to_user_read(db, created), email_sent=email_sent)


@router.get("/users/students-template")
def download_students_template(
    format: str = Query("csv"),
):
    templates_dir = Path(__file__).resolve().parents[3] / "frontend" / "public" / "templates"
    if format == "xlsx":
        file_path = templates_dir / "students_template.xlsx"
        if file_path.exists():
            return FileResponse(file_path, filename="students_template.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    file_path = templates_dir / "students_template.csv"
    if file_path.exists():
        return FileResponse(file_path, filename="students_template.csv", media_type="text/csv")
    csv_content = "Student Name,Student ID,School Email,School,Department,Certification Type,Block Code,Year\nKwame Mensah,2210045678,kwame.mensah@st.gimpa.edu.gh,School of Technology and Social Sciences,Computer Science,Degree,A1,2026\n"
    return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=students_template.csv"})


@router.get("/users/lecturers-template")
def download_lecturers_template(
    format: str = Query("csv"),
):
    templates_dir = Path(__file__).resolve().parents[3] / "frontend" / "public" / "templates"
    if format == "xlsx":
        file_path = templates_dir / "lecturers_template.xlsx"
        if file_path.exists():
            return FileResponse(file_path, filename="lecturers_template.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    file_path = templates_dir / "lecturers_template.csv"
    if file_path.exists():
        return FileResponse(file_path, filename="lecturers_template.csv", media_type="text/csv")
    csv_content = "Lecturer Name,Lecturer ID,Lecturer Email,Adjunct Email,School,Department,Year\nDr. Abena Osei,STF-9021,abena.osei@gimpa.edu.gh,,School of Technology and Social Sciences,Computer Science,2026\n"
    return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=lecturers_template.csv"})


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
        subject="Welcome to Gimpa Research Repository - External Examiner Account Created",
        message=(
            "Your External Examiner account has been created successfully in Gimpa Research Repository.\n\n"
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

    return AdminUserCreateResult(user=_to_user_read(db, created), email_sent=email_sent)



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
    students_file: UploadFile | None = File(default=None),
    lecturers_file: UploadFile | None = File(default=None),
    library_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
) -> ImportAccountsSummary:
    summary = ImportAccountsSummary()
    if not students_file and not lecturers_file and not library_file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload at least one file")

    try:
        if students_file:
            student_rows = load_rows_from_upload(students_file.filename or "", await students_file.read())
            summary.students = import_students(db, student_rows)

        if lecturers_file:
            lecturer_rows = load_rows_from_upload(lecturers_file.filename or "", await lecturers_file.read())
            summary.lecturers = import_staff_accounts(
                db,
                lecturer_rows,
                default_role="lecturer",
            )

        if library_file:
            library_rows = load_rows_from_upload(library_file.filename or "", await library_file.read())
            summary.library = import_staff_accounts(
                db,
                library_rows,
                default_role="librarian",
            )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return summary


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


@router.get("/students-template")
def download_students_template(
    format: str = Query("csv"),
):
    from fastapi.responses import FileResponse
    ext = "xlsx" if format.lower() == "xlsx" else "csv"
    filename = f"students_template.{ext}"
    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if ext == "xlsx" else "text/csv"
    templates_dir = Path(__file__).resolve().parents[3] / "frontend" / "public" / "templates"
    file_path = templates_dir / filename
    if not file_path.exists():
        templates_dir = Path(__file__).resolve().parents[2] / "frontend" / "public" / "templates"
        file_path = templates_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template {filename} not found")
    return FileResponse(path=str(file_path), media_type=media_type, filename=filename)


@router.get("/lecturers-template")
def download_lecturers_template(
    format: str = Query("csv"),
):
    from fastapi.responses import FileResponse
    ext = "xlsx" if format.lower() == "xlsx" else "csv"
    filename = f"lecturers_template.{ext}"
    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if ext == "xlsx" else "text/csv"
    templates_dir = Path(__file__).resolve().parents[3] / "frontend" / "public" / "templates"
    file_path = templates_dir / filename
    if not file_path.exists():
        templates_dir = Path(__file__).resolve().parents[2] / "frontend" / "public" / "templates"
        file_path = templates_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template {filename} not found")
    return FileResponse(path=str(file_path), media_type=media_type, filename=filename)

