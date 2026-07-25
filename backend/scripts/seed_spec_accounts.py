from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal
from app.models.department import Department
from app.models.institution import Institution
from app.models.user import User
from app.models.student import Student
from app.models.paper import Paper, PaperAuthor
from app.services.user_service import assign_role, create_user, get_user_by_email, get_user_by_school_id, hash_password


SEED_ACCOUNTS = [
    {
        "email": "admin@gimpa.edu.gh",
        "full_name": "System Admin",
        "role": "system_admin",
        "school_id": "ADM-001",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
        "is_admin": True,
    },
    {
        "email": "librarian@gimpa.edu.gh",
        "full_name": "GIMPA Librarian",
        "role": "librarian",
        "school_id": "LIB-001",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "ama.owusu@gimpa.edu.gh",
        "full_name": "Ama Owusu",
        "role": "lecturer",
        "school_id": "LEC-001",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "kofi.mensah@gimpa.edu.gh",
        "full_name": "Kofi Mensah",
        "role": "lecturer",
        "school_id": "LEC-002",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "kwame.boadu@adj.gimpa.edu.gh",
        "full_name": "Kwame Boadu",
        "role": "lecturer",
        "school_id": "ADJ-001",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "yaw.asante@gimpa.edu.gh",
        "full_name": "Yaw Asante",
        "role": "lecturer",
        "school_id": "LEC-003",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "abena.osei@gimpa.edu.gh",
        "full_name": "Abena Osei",
        "role": "lecturer",
        "school_id": "LEC-004",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "hod.c@gimpa.edu.gh",
        "full_name": "Dr. HOD Computer Science",
        "role": "hod",
        "school_id": "HOD-001",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "coord.d@gimpa.edu.gh",
        "full_name": "Coordinator Tech",
        "role": "project_coordinator",
        "school_id": "CRD-001",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "dean.e@gimpa.edu.gh",
        "full_name": "Dean SOTSS",
        "role": "dean",
        "school_id": "DEN-001",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "john.smith@st.gimpa.edu.gh",
        "full_name": "John Smith",
        "role": "student",
        "school_id": "GIMPA-ST-001",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
    {
        "email": "sarah.jones@st.gimpa.edu.gh",
        "full_name": "Sarah Jones",
        "role": "student",
        "school_id": "GIMPA-ST-002",
        "department": "Computer Science and Information Systems",
        "school": "School of Technology and Social Sciences (SOTSS)",
    },
]


def seed_accounts() -> None:
    db = SessionLocal()
    try:
        # Ensure institution & department exist
        inst = db.query(Institution).filter(Institution.name == "School of Technology and Social Sciences (SOTSS)").first()
        if not inst:
            inst = Institution(name="School of Technology and Social Sciences (SOTSS)")
            db.add(inst)
            db.flush()

        dept = (
            db.query(Department)
            .filter(Department.name == "Computer Science and Information Systems", Department.institution_id == inst.id)
            .first()
        )
        if not dept:
            dept = Department(name="Computer Science and Information Systems", institution_id=inst.id)
            db.add(dept)
            db.flush()

        for item in SEED_ACCOUNTS:
            existing = get_user_by_email(db, item["email"]) or (get_user_by_school_id(db, item["school_id"]) if item.get("school_id") else None)
            if not existing:
                user = User(
                    email=item["email"],
                    full_name=item["full_name"],
                    role=item["role"],
                    school_id=item["school_id"],
                    department=item["department"],
                    school=item["school"],
                    hashed_password=hash_password("GimpaSecurePass123!"),
                    is_active=True,
                    is_admin=item.get("is_admin", False),
                    must_change_password=False,
                )
                db.add(user)
                db.flush()
                assign_role(db, user, item["role"])
                print(f"Seeded account: {item['email']} ({item['role']})")
            else:
                existing.email = item["email"]
                existing.full_name = item["full_name"]
                existing.role = item["role"]
                existing.school_id = item["school_id"]
                existing.department = item["department"]
                existing.school = item["school"]
                existing.hashed_password = hash_password("GimpaSecurePass123!")
                existing.is_active = True
                existing.must_change_password = False
                db.add(existing)
                db.flush()
                assign_role(db, existing, item["role"])
                print(f"Updated account: {item['email']} ({item['role']})")

            if item["role"] == "student":
                st = db.query(Student).filter(Student.student_id == item["school_id"]).first()
                if not st:
                    db.add(
                        Student(
                            student_id=item["school_id"],
                            full_name=item["full_name"],
                            email=item["email"],
                            school=item["school"],
                            department=item["department"],
                            certification_type="B.Sc. Computer Science",
                            block_code="CS-2024",
                            year=2024,
                        )
                    )

        db.commit()
        print("Spec accounts seeded successfully with default password 'GimpaSecurePass123!'")
    finally:
        db.close()


if __name__ == "__main__":
    from app.db.session import engine
    from app.models.base import Base
    import app.models.user
    import app.models.department
    import app.models.institution
    import app.models.paper
    import app.models.paper_workflow
    import app.models.user_role
    import app.models.student
    Base.metadata.create_all(bind=engine)
    seed_accounts()
