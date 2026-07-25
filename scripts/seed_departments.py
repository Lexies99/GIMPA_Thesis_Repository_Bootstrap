from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal
from app.db import base  # noqa: F401  # ensure all SQLAlchemy models are registered
from app.models.department import Department
from app.models.institution import Institution
from sqlalchemy import text


SEED_DATA: dict[str, list[str]] = {
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


def main() -> None:
    db = SessionLocal()
    try:
        # Backward-compatible bootstrap: older DBs may not have these columns yet.
        try:
            db.execute(text("ALTER TABLE departments ADD COLUMN hod_user_id INTEGER NULL"))
            db.execute(text("ALTER TABLE departments ADD COLUMN dean_user_id INTEGER NULL"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_departments_hod_user_id ON departments (hod_user_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_departments_dean_user_id ON departments (dean_user_id)"))
            db.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS department_supervisors (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
                        supervisor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uq_dept_supervisor UNIQUE (department_id, supervisor_user_id)
                    )
                    """
                )
            )
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_department_supervisors_department_id ON department_supervisors (department_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_department_supervisors_supervisor_user_id ON department_supervisors (supervisor_user_id)"))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Bootstrap SQL warning (columns or tables may already exist): {e}")

        created_institutions = 0
        created_departments = 0

        for school_name, department_names in SEED_DATA.items():
            institution = db.query(Institution).filter(Institution.name == school_name).first()
            if not institution:
                institution = Institution(name=school_name)
                db.add(institution)
                db.flush()
                created_institutions += 1

            for department_name in department_names:
                existing = (
                    db.query(Department)
                    .filter(
                        Department.institution_id == institution.id,
                        Department.name == department_name,
                    )
                    .first()
                )
                if existing:
                    continue
                db.add(
                    Department(
                        institution_id=institution.id,
                        name=department_name,
                    )
                )
                created_departments += 1

        db.commit()
        print(f"Seed complete. Institutions created: {created_institutions}, departments created: {created_departments}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
