from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal
from app.models.department import Department
from app.models.institution import Institution
from app.models.user import User
from app.models.student import Student
from app.models.paper import Paper, PaperAuthor, PaperSupervisor
from app.services.user_service import hash_password, assign_role

def create_demo_student(db, email, full_name, student_id, dept_name, inst_name):
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=full_name,
            role="student",
            school_id=student_id,
            department=dept_name,
            school=inst_name,
            hashed_password=hash_password("GimpaSecurePass123!"),
            is_active=True,
            must_change_password=False
        )
        db.add(user)
        db.flush()
        assign_role(db, user, "student")
        
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        student = Student(
            student_id=student_id,
            full_name=full_name,
            email=email,
            school=inst_name,
            department=dept_name,
            certification_type="B.Sc. Computer Science",
            block_code="CS-2024",
            year=2024
        )
        db.add(student)
        db.flush()
    return user

def create_demo_examiner(db, email, full_name, school_id, role, dept_name, inst_name):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=full_name,
            role=role,
            school_id=school_id,
            department=dept_name,
            school=inst_name,
            hashed_password=hash_password("GimpaSecurePass123!"),
            is_active=True,
            must_change_password=False
        )
        db.add(user)
        db.flush()
        assign_role(db, user, role)
    return user

def main():
    db = SessionLocal()
    try:
        # 1. Fetch department
        inst = db.query(Institution).filter(Institution.name == "School of Technology and Social Sciences (SOTSS)").first()
        if not inst:
            inst = Institution(name="School of Technology and Social Sciences (SOTSS)")
            db.add(inst)
            db.flush()
            
        dept = db.query(Department).filter(
            Department.name == "Computer Science and Information Systems", 
            Department.institution_id == inst.id
        ).first()
        if not dept:
            dept = Department(name="Computer Science and Information Systems", institution_id=inst.id)
            db.add(dept)
            db.flush()

        # 2. Get users
        hod = create_demo_examiner(db, "hod.c@gimpa.edu.gh", "Dr. HOD Computer Science", "HOD-001", "hod", "Computer Science and Information Systems", "School of Technology and Social Sciences (SOTSS)")
        coord = create_demo_examiner(db, "coord.d@gimpa.edu.gh", "Coordinator Tech", "CRD-001", "project_coordinator", "Computer Science and Information Systems", "School of Technology and Social Sciences (SOTSS)")
        ama = create_demo_examiner(db, "ama.owusu@gimpa.edu.gh", "Ama Owusu", "LEC-001", "lecturer", "Computer Science and Information Systems", "School of Technology and Social Sciences (SOTSS)")
        kofi = create_demo_examiner(db, "kofi.mensah@gimpa.edu.gh", "Kofi Mensah", "LEC-002", "lecturer", "Computer Science and Information Systems", "School of Technology and Social Sciences (SOTSS)")
        yaw = create_demo_examiner(db, "yaw.asante@gimpa.edu.gh", "Yaw Asante", "LEC-003", "lecturer", "Computer Science and Information Systems", "School of Technology and Social Sciences (SOTSS)")
        
        # Link HOD to department
        if hod:
            dept.hod_user_id = hod.id
            db.add(dept)
            db.flush()
            
        # Create additional demo students
        john = create_demo_student(db, "john.smith@st.gimpa.edu.gh", "John Smith", "GIMPA-ST-001", "Computer Science and Information Systems", "School of Technology and Social Sciences (SOTSS)")
        sarah = create_demo_student(db, "sarah.jones@st.gimpa.edu.gh", "Sarah Jones", "GIMPA-ST-002", "Computer Science and Information Systems", "School of Technology and Social Sciences (SOTSS)")
        
        david = create_demo_student(
            db, 
            "david.mensah@st.gimpa.edu.gh", 
            "David Mensah", 
            "GIMPA-ST-003", 
            "Computer Science and Information Systems", 
            "School of Technology and Social Sciences (SOTSS)"
        )
        
        mary = create_demo_student(
            db, 
            "mary.appiah@st.gimpa.edu.gh", 
            "Mary Appiah", 
            "GIMPA-ST-004", 
            "Computer Science and Information Systems", 
            "School of Technology and Social Sciences (SOTSS)"
        )
        
        # Create external examiner
        external_ex = create_demo_examiner(
            db,
            "external.examiner@gimpa.edu.gh",
            "Dr. External Examiner",
            "EX-001",
            "external_examiner",
            "Computer Science and Information Systems",
            "School of Technology and Social Sciences (SOTSS)"
        )

        # Clear existing demo papers to avoid duplicate noise
        demo_titles = [
            "Machine Learning for Student Placement",
            "IoT Smart Irrigation System in Agriculture",
            "Blockchain based Decentralized Voting Protocol",
            "Cybersecurity Risk Analysis in Financial Institutions"
        ]
        db.query(Paper).filter(Paper.title.in_(demo_titles)).delete(synchronize_session=False)
        db.commit()

        # 3. Create demo papers in different workflow stages
        
        # Paper 1: Phase 1 (Proposal Submitted)
        # Student John has uploaded a proposal, waiting for HOD assignment.
        p1 = Paper(
            title="Machine Learning for Student Placement",
            abstract="This project proposes an automated student placement recommendation system using machine learning algorithms. We evaluate academic performance and interest profiles to maximize matching criteria and departmental success rate. Experimental results from our initial prototypes indicate high accuracy and student satisfaction.",
            abstract_word_count=50,
            status="phase1_proposal_submitted",
            document_type="proposal",
            publication_type="thesis",
            created_by_id=john.id,
            department_id=dept.id,
            institution_id=inst.id
        )
        db.add(p1)
        db.flush()
        db.add(PaperAuthor(paper_id=p1.id, name="John Smith", email=john.email, author_order=1))
        
        # Paper 2: Phase 3 (Chapter Reviews)
        # Student Sarah has an approved proposal, and Ama Owusu is assigned as supervisor.
        # Chapters 1 & 2 are fully approved, Chapter 3 is marked as student done, but supervisor hasn't approved.
        p2 = Paper(
            title="IoT Smart Irrigation System in Agriculture",
            abstract="This research investigates low-power Internet of Things (IoT) sensors for automation of drip irrigation networks. We analyze moisture levels, temperature, and local weather forecasts to compute precise water budgets, reducing consumption by 40% in test beds.",
            abstract_word_count=45,
            status="phase3_chapters",
            document_type="proposal",
            publication_type="thesis",
            created_by_id=sarah.id,
            supervisor_id=ama.id,
            department_id=dept.id,
            institution_id=inst.id,
            ch1_student_done=True,
            ch1_supervisor_approved=True,
            ch2_student_done=True,
            ch2_supervisor_approved=True,
            ch3_student_done=True,
            ch3_supervisor_approved=False
        )
        db.add(p2)
        db.flush()
        db.add(PaperAuthor(paper_id=p2.id, name="Sarah Jones", email=sarah.email, author_order=1))
        db.add(PaperSupervisor(paper_id=p2.id, user_id=ama.id, assigned_by_id=hod.id))

        # Paper 3: Phase 4 (Examination & Marking)
        # Student David has completed all chapters, and is currently being assessed.
        # Kofi Mensah is supervisor. Yaw Asante is internal examiner. Dr. External Examiner is external examiner.
        # Internal examiner has uploaded score (85.0) and marked script, external examiner has not.
        p3 = Paper(
            title="Blockchain based Decentralized Voting Protocol",
            abstract="This thesis introduces a secure, scalable decentralized voting protocol implemented on Ethereum smart contracts. We utilize zero-knowledge proofs to guarantee voter anonymity and coercion resistance, ensuring verifiable elections without trusted intermediaries.",
            abstract_word_count=43,
            status="phase4_marking",
            document_type="thesis",
            publication_type="thesis",
            created_by_id=david.id,
            supervisor_id=kofi.id,
            internal_examiner_id=yaw.id,
            external_examiner_id=external_ex.id,
            department_id=dept.id,
            institution_id=inst.id,
            ch1_student_done=True,
            ch1_supervisor_approved=True,
            ch2_student_done=True,
            ch2_supervisor_approved=True,
            ch3_student_done=True,
            ch3_supervisor_approved=True,
            ch4_student_done=True,
            ch4_supervisor_approved=True,
            ch5_student_done=True,
            ch5_supervisor_approved=True,
            file_name="blockchain_voting_thesis.pdf",
            file_path="uploads/blockchain_voting_thesis.pdf",
            file_size=10240,
            mime_type="application/pdf",
            internal_score=85.0,
            internal_result_file_name="internal_marked_voting.pdf",
            internal_result_file_path="uploads/internal_marked_voting.pdf"
        )
        db.add(p3)
        db.flush()
        db.add(PaperAuthor(paper_id=p3.id, name="David Mensah", email=david.email, author_order=1))
        db.add(PaperSupervisor(paper_id=p3.id, user_id=kofi.id, assigned_by_id=hod.id))

        # Paper 4: Approved/Published
        # Student Mary has fully completed the thesis and corrections. Approved and published.
        p4 = Paper(
            title="Cybersecurity Risk Analysis in Financial Institutions",
            abstract="This paper develops an analytical threat modeling framework for assessing vulnerability exposure in commercial banking systems. We apply empirical simulations to identify systemic risk hubs, suggesting optimal network partitioning and defense strategies.",
            abstract_word_count=42,
            status="approved",
            document_type="thesis",
            publication_type="thesis",
            created_by_id=mary.id,
            supervisor_id=kofi.id,
            department_id=dept.id,
            institution_id=inst.id,
            is_public=True,
            file_name="cybersec_banking_risk.pdf",
            file_path="uploads/cybersec_banking_risk.pdf",
            file_size=15432,
            mime_type="application/pdf"
        )
        db.add(p4)
        db.flush()
        db.add(PaperAuthor(paper_id=p4.id, name="Mary Appiah", email=mary.email, author_order=1))
        db.add(PaperSupervisor(paper_id=p4.id, user_id=kofi.id, assigned_by_id=hod.id))

        db.commit()
        print("="*60)
        print("DEMO WORKFLOW DATA SEEDED SUCCESSFULLY!")
        print("="*60)
        print("Log in to http://localhost:5173 with any of these accounts (Password: GimpaSecurePass123!):")
        print("\n1. Student John Smith (john.smith@st.gimpa.edu.gh)")
        print("   - Active proposal: 'Machine Learning for Student Placement' (Phase 1: Submitted)")
        print("\n2. Student Sarah Jones (sarah.jones@st.gimpa.edu.gh)")
        print("   - Active proposal: 'IoT Smart Irrigation System in Agriculture' (Phase 3: Chapters progress)")
        print("   - Supervisor: Ama Owusu")
        print("\n3. HOD Computer Science (hod.c@gimpa.edu.gh)")
        print("   - Can view and manage all student papers/thesis phases.")
        print("   - Action: Assign supervisor to John Smith's proposal under 'Approval' tab.")
        print("\n4. Supervisor Ama Owusu (ama.owusu@gimpa.edu.gh)")
        print("   - Action: Review Sarah Jones's Chapter 3 checklist submission under 'Approval' tab.")
        print("\n5. Student David Mensah (david.mensah@st.gimpa.edu.gh)")
        print("   - Active thesis: 'Blockchain based Decentralized Voting Protocol' (Phase 4: Marking)")
        print("   - Action: Awaiting External Examiner grading.")
        print("\n6. External Examiner (external.examiner@gimpa.edu.gh)")
        print("   - Action: Grade David Mensah's thesis (Phase 4: Upload Results).")
        print("="*60)
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
