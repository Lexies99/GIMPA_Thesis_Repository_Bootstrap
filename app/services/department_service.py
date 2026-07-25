from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.department_supervisor import DepartmentSupervisor
from app.models.user import User
from app.services.user_service import assign_role, has_role


def assign_hod(db: Session, department_id: int, user_id: int, assigned_by_id: int | None = None) -> Department:
    """Assign a user as HOD for a department."""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise ValueError(f"Department {department_id} not found")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    
    # Ensure user has HOD role
    if not has_role(db, user, "hod"):
        assign_role(db, user, "hod", assigned_by_id=assigned_by_id)
    
    department.hod_user_id = user_id
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


def assign_dean(db: Session, department_id: int, user_id: int, assigned_by_id: int | None = None) -> Department:
    """Assign a user as Dean for a school (all departments in the institution)."""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise ValueError(f"Department {department_id} not found")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    
    # Ensure user has dean role
    if not has_role(db, user, "dean"):
        assign_role(db, user, "dean", assigned_by_id=assigned_by_id)

    # Enforce one dean per school by updating all departments in the same institution.
    school_departments = (
        db.query(Department)
        .filter(Department.institution_id == department.institution_id)
        .all()
    )
    for school_department in school_departments:
        school_department.dean_user_id = user_id
        db.add(school_department)

    db.commit()
    db.refresh(department)
    return department


def add_department_supervisor(db: Session, department_id: int, supervisor_user_id: int) -> DepartmentSupervisor:
    """Add a project supervisor to a department."""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise ValueError(f"Department {department_id} not found")
    
    user = db.query(User).filter(User.id == supervisor_user_id).first()
    if not user:
        raise ValueError(f"User {supervisor_user_id} not found")
    
    # Ensure user has project_supervisor role
    if not has_role(db, user, "project_supervisor"):
        assign_role(db, user, "project_supervisor")
    
    # Check if already exists
    existing = (
        db.query(DepartmentSupervisor)
        .filter(
            DepartmentSupervisor.department_id == department_id,
            DepartmentSupervisor.supervisor_user_id == supervisor_user_id,
        )
        .first()
    )
    
    if existing:
        if not existing.active:
            existing.active = True
            db.add(existing)
            db.commit()
            db.refresh(existing)
        return existing
    
    supervisor = DepartmentSupervisor(
        department_id=department_id,
        supervisor_user_id=supervisor_user_id,
        active=True,
    )
    db.add(supervisor)
    db.commit()
    db.refresh(supervisor)
    return supervisor


def remove_department_supervisor(db: Session, department_id: int, supervisor_user_id: int) -> None:
    """Remove a project supervisor from a department."""
    supervisor = (
        db.query(DepartmentSupervisor)
        .filter(
            DepartmentSupervisor.department_id == department_id,
            DepartmentSupervisor.supervisor_user_id == supervisor_user_id,
        )
        .first()
    )
    
    if supervisor:
        supervisor.active = False
        db.add(supervisor)
        db.commit()


def get_department_supervisors(db: Session, department_id: int, active_only: bool = True) -> list[DepartmentSupervisor]:
    """Get supervisors for a department."""
    query = db.query(DepartmentSupervisor).filter(DepartmentSupervisor.department_id == department_id)
    if active_only:
        query = query.filter(DepartmentSupervisor.active.is_(True))
    return query.all()


def get_department(db: Session, department_id: int) -> Department | None:
    """Get a department by ID."""
    return db.query(Department).filter(Department.id == department_id).first()


def list_departments(db: Session, institution_id: int | None = None) -> list[Department]:
    """List departments, optionally filtered by institution."""
    query = db.query(Department)
    if institution_id is not None:
        query = query.filter(Department.institution_id == institution_id)
    return query.order_by(Department.name).all()
