import csv
from pathlib import Path
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.models.paper import Paper
from app.models.thesis_system import Thesis
from app.services.user_service import create_user, get_user_by_email, update_user
from app.schemas.user import UserUpdate
from app.services.import_service import generate_default_password

def sync_student_supervisor_allocations(csv_path: str = "csv_uploads/student_supervisor_allocation.csv"):
    db: Session = SessionLocal()
    try:
        path = Path(csv_path)
        if not path.exists():
            print(f"File not found: {csv_path}")
            return

        with open(path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Loaded {len(rows)} allocation rows from {csv_path}")

        updated_students = 0
        theses_created = 0
        papers_created = 0

        for row in rows:
            st_id = (row.get("Student_ID") or row.get("student_id") or "").strip()
            st_name = (row.get("Student_Name") or row.get("student_name") or "").strip()
            programme = (row.get("Programme") or row.get("programme") or row.get("Program") or "").strip()
            st_email = (row.get("Student_Email") or row.get("student_email") or "").strip().lower()
            sup_name = (row.get("Supervisor_Name") or row.get("supervisor_name") or row.get("Supervisor") or "").strip()
            sup_email = (row.get("Supervisor_Email") or row.get("supervisor_email") or "").strip().lower()

            if not st_email or not st_name:
                continue

            # 1. Find or create supervisor
            sup_user = None
            if sup_email:
                sup_user = db.query(User).filter(User.email.ilike(sup_email)).first()
            if not sup_user and sup_name:
                sup_user = db.query(User).filter(User.full_name.ilike(f"%{sup_name}%")).first()

            # 2. Find or create student user
            st_user = db.query(User).filter(User.email.ilike(st_email)).first()
            if not st_user and st_id:
                st_user = db.query(User).filter(User.school_id == st_id).first()

            if not st_user:
                temp_pwd = generate_default_password()
                st_user = create_user(
                    db=db,
                    email=st_email,
                    role="student",
                    school_id=st_id or None,
                    school="School of Technology",
                    password=temp_pwd,
                    full_name=st_name,
                    department="Computer Science",
                    must_change_password=True,
                )
                st_user.program = programme or "MSc. Digital Forensics and Cybersecurity"
                st_user.is_active = True
                db.add(st_user)
                db.commit()
                db.refresh(st_user)
            else:
                st_user.full_name = st_name or st_user.full_name
                st_user.school_id = st_id or st_user.school_id
                st_user.program = programme or st_user.program
                if not st_user.department:
                    st_user.department = "Computer Science"
                st_user.is_active = True
                db.add(st_user)
                db.commit()

            updated_students += 1

            # 3. Create or update Thesis record
            thesis = db.query(Thesis).filter(Thesis.student_id == st_user.id).first()
            if not thesis:
                thesis = Thesis(
                    student_id=st_user.id,
                    supervisor_id=sup_user.id if sup_user else None,
                    topic_title=f"{programme or 'Master Thesis'} Research Project — {st_name}",
                    topic_description=f"Master thesis research project for {st_name} enrolled in {programme}.",
                    topic_status="accepted",
                    phase=2,
                )
                db.add(thesis)
                db.commit()
                theses_created += 1
            else:
                if sup_user and not thesis.supervisor_id:
                    thesis.supervisor_id = sup_user.id
                if not thesis.topic_title or "Untitled" in thesis.topic_title:
                    thesis.topic_title = f"{programme or 'Master Thesis'} Research Project — {st_name}"
                db.add(thesis)
                db.commit()

            # 4. Create or update Paper record
            paper = db.query(Paper).filter(Paper.created_by_id == st_user.id).first()
            if not paper:
                paper = Paper(
                    title=f"{programme or 'Master Thesis'} Research Project — {st_name}",
                    abstract=f"Academic thesis project submitted by {st_name} under the discipline of {programme}.",
                    discipline=programme or "MSc. Digital Forensics and Cybersecurity",
                    degree_level="Masters",
                    document_type="master_thesis",
                    status="phase2_proposal_submitted",
                    created_by_id=st_user.id,
                    supervisor_id=sup_user.id if sup_user else None,
                    is_public=False,
                )
                db.add(paper)
                db.commit()
                papers_created += 1
            else:
                if sup_user and not paper.supervisor_id:
                    paper.supervisor_id = sup_user.id
                if programme and not paper.discipline:
                    paper.discipline = programme
                db.add(paper)
                db.commit()

        print(f"Summary: Processed {updated_students} students, created {theses_created} theses, created {papers_created} papers.")
    finally:
        db.close()

if __name__ == "__main__":
    sync_student_supervisor_allocations()
