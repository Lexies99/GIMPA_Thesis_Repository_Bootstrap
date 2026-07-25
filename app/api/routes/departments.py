from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_any_role
from app.models.user import User
from app.schemas.department import (
    AssignHODRequest,
    AssignDeanRequest,
    AddSupervisorRequest,
    RemoveSupervisorRequest,
    DepartmentRead,
    DepartmentSupervisorRead,
)
from app.services.department_service import (
    assign_hod,
    assign_dean,
    add_department_supervisor,
    remove_department_supervisor,
    get_department_supervisors,
    get_department,
    list_departments,
)
from app.services.user_service import has_role

router = APIRouter(prefix="/departments", tags=["departments"])


def _to_department_read(department) -> DepartmentRead:
    return DepartmentRead(
        id=department.id,
        institution_id=department.institution_id,
        institution_name=(department.institution.name if getattr(department, "institution", None) else None),
        name=department.name,
        hod_user_id=department.hod_user_id,
        dean_user_id=department.dean_user_id,
    )


@router.get("", response_model=list[DepartmentRead])
def list_all_departments(
    institution_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[DepartmentRead]:
    """List all departments, optionally filtered by institution."""
    departments = list_departments(db, institution_id=institution_id)
    return [_to_department_read(d) for d in departments]


@router.get("/{department_id}", response_model=DepartmentRead)
def get_dept(
    department_id: int,
    db: Session = Depends(get_db),
) -> DepartmentRead:
    """Get a specific department."""
    department = get_department(db, department_id)
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return _to_department_read(department)


@router.post("/{department_id}/assign-hod", response_model=DepartmentRead)
def assign_hod_endpoint(
    department_id: int,
    payload: AssignHODRequest,
    current_user: User = Depends(require_any_role("dean", "system_admin")),
    db: Session = Depends(get_db),
) -> DepartmentRead:
    """Assign a user as HOD for a department. Requires Dean or Admin role."""
    department = get_department(db, department_id)
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    if not has_role(db, current_user, "system_admin") and not current_user.is_admin:
        if department.dean_user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned dean can set HOD for this department")
    try:
        department = assign_hod(db, department_id, payload.user_id, assigned_by_id=current_user.id)
        return _to_department_read(department)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{department_id}/assign-dean", response_model=DepartmentRead)
def assign_dean_endpoint(
    department_id: int,
    payload: AssignDeanRequest,
    current_user: User = Depends(require_any_role("system_admin")),
    db: Session = Depends(get_db),
) -> DepartmentRead:
    """Assign a user as Dean for a school (all departments). Requires Admin role."""
    try:
        department = assign_dean(db, department_id, payload.user_id, assigned_by_id=current_user.id)
        return _to_department_read(department)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{department_id}/supervisors", response_model=list[DepartmentSupervisorRead])
def add_supervisors_endpoint(
    department_id: int,
    payload: AddSupervisorRequest,
    current_user: User = Depends(require_any_role("project_coordinator", "system_admin")),
    db: Session = Depends(get_db),
) -> list[DepartmentSupervisorRead]:
    """Add project supervisors to a department. Requires Project Coordinator or Admin role."""
    department = get_department(db, department_id)
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    if not has_role(db, current_user, "system_admin") and not current_user.is_admin:
        if (current_user.department or "").strip().lower() != (department.name or "").strip().lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project coordinators in the same department can appoint supervisors for this department",
            )
    try:
        supervisors = []
        for supervisor_id in payload.supervisor_user_ids:
            supervisor = add_department_supervisor(db, department_id, supervisor_id)
            supervisors.append(supervisor)
        return [DepartmentSupervisorRead.model_validate(s) for s in supervisors]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{department_id}/supervisors/{supervisor_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_supervisor_endpoint(
    department_id: int,
    supervisor_user_id: int,
    current_user: User = Depends(require_any_role("project_coordinator", "system_admin")),
    db: Session = Depends(get_db),
) -> Response:
    """Remove a project supervisor from a department. Requires Project Coordinator or Admin role."""
    department = get_department(db, department_id)
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    if not has_role(db, current_user, "system_admin") and not current_user.is_admin:
        if (current_user.department or "").strip().lower() != (department.name or "").strip().lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project coordinators in the same department can remove supervisors for this department",
            )
    remove_department_supervisor(db, department_id, supervisor_user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{department_id}/supervisors", response_model=list[DepartmentSupervisorRead])
def get_supervisors_endpoint(
    department_id: int,
    active_only: bool = True,
    db: Session = Depends(get_db),
) -> list[DepartmentSupervisorRead]:
    """Get supervisors for a department."""
    supervisors = get_department_supervisors(db, department_id, active_only=active_only)
    return [DepartmentSupervisorRead.model_validate(s) for s in supervisors]


@router.get("/{department_id}/download-approved-zip")
def download_approved_zip(
    department_id: int,
    discipline: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk download all approved/completed works for a department in a zipped archive."""
    import io
    import zipfile
    from pathlib import Path
    from fastapi.responses import StreamingResponse
    from app.models.paper import Paper
    from app.models.department import Department
    
    is_admin = current_user.is_admin or has_role(db, current_user, "system_admin")
    department = get_department(db, department_id)
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        
    if not is_admin:
        is_dean = has_role(db, current_user, "dean")
        is_hod = has_role(db, current_user, "hod")
        is_coord = has_role(db, current_user, "project_coordinator")
        
        if not (is_dean or is_hod or is_coord):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the Dean, HOD, Project Coordinator, or Admin can download this ZIP"
            )
            
        user_dept = (current_user.department or "").strip().lower()
        dept_name = (department.name or "").strip().lower()
        if not is_dean:
            if not user_dept or not dept_name or user_dept != dept_name:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only download approved works for your own department"
                )
                
    query = (
        db.query(Paper)
        .filter(Paper.department_id == department_id)
        .filter(
            Paper.status.in_(
                [
                    "phase4_pending_examiners",
                    "phase4_marking",
                    "phase5_corrections",
                    "phase5_pending_supervisor",
                    "phase5_pending_coordinator",
                    "phase5_pending_hod",
                    "approved_for_library",
                    "approved"
                ]
            )
        )
    )
    if discipline and discipline.strip():
        query = query.filter(Paper.discipline.ilike(f"%{discipline.strip()}%"))
        
    papers = query.all()
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        added_any = False
        added_filenames = set()
        for paper in papers:
            if not paper.file_path:
                continue
            path = Path(paper.file_path)
            if not path.exists() or not path.is_file():
                continue
                
            student_id = paper.created_by.school_id if (paper.created_by and paper.created_by.school_id) else f"student-{paper.created_by_id or 'unknown'}"
            student_name = paper.created_by.full_name if (paper.created_by and paper.created_by.full_name) else "Unknown"
            
            # Clean title for filename
            title_slug = "".join(c if c.isalnum() or c in (" ", "_", "-") else "" for c in paper.title)
            title_slug = title_slug.replace(" ", "_")[:50]
            suffix = path.suffix or ".pdf"
            filename = f"{student_id}_{student_name}_{title_slug}{suffix}"
            
            # Ensure unique names in the zip archive
            counter = 1
            while filename in added_filenames:
                filename = f"{student_id}_{student_name}_{title_slug}_{counter}{suffix}"
                counter += 1
            added_filenames.add(filename)
            
            zip_file.write(path, arcname=filename)
            added_any = True
            
        if not added_any:
            zip_file.writestr("README.txt", "No approved thesis works found for this department.")
            
    zip_buffer.seek(0)
    
    headers = {
        "Content-Disposition": f'attachment; filename="department_{department_id}_approved_works.zip"'
    }
    return StreamingResponse(zip_buffer, media_type="application/zip", headers=headers)


@router.get("/{department_id}/download-examiner-results-zip")
def download_examiner_results_zip(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk download all examiner marked scripts/feedback files in a zipped archive."""
    import io
    import zipfile
    from pathlib import Path
    from fastapi.responses import StreamingResponse
    from app.models.paper import Paper
    from app.services.user_service import has_role
    from app.services.department_service import get_department
    
    is_admin = current_user.is_admin or has_role(db, current_user, "system_admin")
    department = get_department(db, department_id)
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        
    if not is_admin:
        is_dean = has_role(db, current_user, "dean")
        is_hod = has_role(db, current_user, "hod")
        is_coord = has_role(db, current_user, "project_coordinator")
        
        if not (is_dean or is_hod or is_coord):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the Dean, HOD, Project Coordinator, or Admin can download examiner results"
            )
            
        user_dept = (current_user.department or "").strip().lower()
        dept_name = (department.name or "").strip().lower()
        if not is_dean:
            if not user_dept or not dept_name or user_dept != dept_name:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only download examiner results for your own department"
                )
                
    papers = (
        db.query(Paper)
        .filter(Paper.department_id == department_id)
        .filter(
            (Paper.internal_result_file_path.isnot(None))
            | (Paper.external_result_file_path.isnot(None))
        )
        .all()
    )
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        added_any = False
        added_filenames = set()
        for paper in papers:
            student_id = paper.created_by.school_id if (paper.created_by and paper.created_by.school_id) else f"student-{paper.created_by_id or 'unknown'}"
            student_name = paper.created_by.full_name if (paper.created_by and paper.created_by.full_name) else "Unknown"
            title_slug = "".join(c if c.isalnum() or c in (" ", "_", "-") else "" for c in paper.title)
            title_slug = title_slug.replace(" ", "_")[:30]
            
            # Add internal examiner results
            if paper.internal_result_file_path:
                path = Path(paper.internal_result_file_path)
                if path.exists() and path.is_file():
                    suffix = path.suffix or ".pdf"
                    filename = f"{student_id}_{student_name}_{title_slug}_internal_marked{suffix}"
                    
                    counter = 1
                    while filename in added_filenames:
                        filename = f"{student_id}_{student_name}_{title_slug}_internal_marked_{counter}{suffix}"
                        counter += 1
                    added_filenames.add(filename)
                    zip_file.write(path, arcname=filename)
                    added_any = True
                    
            # Add external examiner results
            if paper.external_result_file_path:
                path = Path(paper.external_result_file_path)
                if path.exists() and path.is_file():
                    suffix = path.suffix or ".pdf"
                    filename = f"{student_id}_{student_name}_{title_slug}_external_marked{suffix}"
                    
                    counter = 1
                    while filename in added_filenames:
                        filename = f"{student_id}_{student_name}_{title_slug}_external_marked_{counter}{suffix}"
                        counter += 1
                    added_filenames.add(filename)
                    zip_file.write(path, arcname=filename)
                    added_any = True
                    
        if not added_any:
            zip_file.writestr("README.txt", "No examiner marked results found for this department.")
            
    zip_buffer.seek(0)
    headers = {
        "Content-Disposition": f'attachment; filename="department_{department_id}_examiner_results.zip"'
    }
    return StreamingResponse(zip_buffer, media_type="application/zip", headers=headers)
