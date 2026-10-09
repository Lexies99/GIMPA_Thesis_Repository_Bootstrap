from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.department_supervisor import DepartmentSupervisor
from app.models.institution import Institution
from app.models.user import User
from app.services.user_service import assign_role, has_role


GIMPA_DEFAULT_SCHOOLS_AND_DEPARTMENTS: dict[str, list[str]] = {
    "GIMPA Business School": [
        "Accounting and Finance",
        "Business Management",
        "Management Science",
    ],
    "School of Public Service and Governance": [
        "Development Policy",
        "Public Management & International Relations",
    ],
    "Faculty of Law": [
        "Law",
    ],
    "School of Technology and Social Sciences (SOTSS)": [
        "Computer Science and Information Systems",
        "Economics and Applied Mathematics",
        "Liberal Arts and Hospitality Studies",
    ],
}


def ensure_default_departments(db: Session) -> list[Department]:
    """Ensures all standard GIMPA schools and departments exist in the DB, and auto-syncs deans."""
    for school_name, department_names in GIMPA_DEFAULT_SCHOOLS_AND_DEPARTMENTS.items():
        institution = db.query(Institution).filter(Institution.name.ilike(school_name.strip())).first()
        if not institution:
            institution = Institution(name=school_name.strip())
            db.add(institution)
            db.flush()

        for department_name in department_names:
            dept = (
                db.query(Department)
                .filter(
                    Department.institution_id == institution.id,
                    Department.name.ilike(department_name.strip()),
                )
                .first()
            )
            if not dept:
                dept = Department(
                    institution_id=institution.id,
                    name=department_name.strip(),
                )
                db.add(dept)
                db.flush()

    # Auto-link Deans who have role 'dean' and matching school
    deans = db.query(User).filter(User.role == "dean").all()
    for dean in deans:
        if dean.school:
            clean_school = dean.school.strip().lower()
            matching_insts = db.query(Institution).all()
            target_inst = None
            for inst in matching_insts:
                if clean_school in inst.name.lower() or inst.name.lower() in clean_school:
                    target_inst = inst
                    break
            if target_inst:
                depts = db.query(Department).filter(Department.institution_id == target_inst.id).all()
                for d in depts:
                    if d.dean_user_id is None or d.dean_user_id != dean.id:
                        d.dean_user_id = dean.id
                        db.add(d)

    db.commit()
    return db.query(Department).order_by(Department.name).all()


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
    
    # Also update user's department text field if blank
    if not user.department:
        user.department = department.name
        db.add(user)

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

    # Also update user's school text field if blank and institution exists
    if getattr(department, "institution", None) and getattr(department.institution, "name", None):
        if not user.school:
            user.school = department.institution.name
            db.add(user)

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
    """List departments, optionally filtered by institution. Auto-initializes if empty."""
    count = db.query(Department).count()
    if count == 0:
        ensure_default_departments(db)

    query = db.query(Department)
    if institution_id is not None:
        query = query.filter(Department.institution_id == institution_id)
    return query.order_by(Department.name).all()
