from __future__ import annotations

from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.student import Student
from app.models.paper import Paper
from app.models.phd_system import (
    PhDSupervisionLog,
    PhDSeminar,
    PhDComprehensiveExam,
    PhDTeachingRequirement,
    PhDProgressEvaluation,
    PhDReaccreditationFolder,
)
from app.schemas.phd import (
    PhDSupervisionLogCreate,
    PhDSupervisionLogRead,
    PhDSeminarCreate,
    PhDSeminarRead,
    PhDComprehensiveExamCreate,
    PhDComprehensiveExamRead,
    PhDTeachingRequirementCreate,
    PhDTeachingRequirementRead,
    PhDProgressEvaluationCreate,
    PhDProgressEvaluationRead,
    PhDReaccreditationFolderCreate,
    PhDReaccreditationFolderRead,
    PhDStudentDossier,
)
from app.services.user_service import has_role
from app.services.notification_service import create_notification

router = APIRouter(prefix="/phd", tags=["phd"])


# 1. PhD Student Dossiers & Progress Overview
@router.get("/dossiers", response_model=list[PhDStudentDossier])
def list_phd_dossiers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDStudentDossier]:
    """Lists all PhD students with comprehensive degree progress, milestones, and 60-day inactivity alert."""
    # Find all users who are students with degree_level == 'PhD' or in PhD papers
    phd_papers = db.query(Paper).filter(
        or_(
            Paper.document_type == "doctoral_thesis",
            Paper.title.ilike("%phd%"),
            Paper.title.ilike("%doctor%"),
        )
    ).all()
    student_ids = {p.created_by_id for p in phd_papers if p.created_by_id}

    # Also include users with role student where program contains PhD or Doctorate
    phd_users = db.query(User).filter(
        or_(
            User.id.in_(student_ids),
            User.program.ilike("%phd%"),
            User.program.ilike("%doctor%"),
        )
    ).all()

    today = date.today()
    dossiers: list[PhDStudentDossier] = []

    for u in phd_users:
        # Latest paper
        paper = next((p for p in phd_papers if p.created_by_id == u.id), None)
        paper_title = paper.title if paper else None
        
        # Comprehensive Exam
        latest_exam = db.query(PhDComprehensiveExam).filter(
            PhDComprehensiveExam.student_id == u.id
        ).order_by(desc(PhDComprehensiveExam.attempt_number)).first()
        
        candidacy = "Pre-Candidacy"
        comp_result = "Not Sat"
        if latest_exam:
            comp_result = latest_exam.result
            if latest_exam.advanced_to_candidacy or latest_exam.result == "Pass":
                candidacy = "PhD Candidate"

        # Seminars
        seminars = db.query(PhDSeminar).filter(PhDSeminar.student_id == u.id).all()
        attended_count = sum(1 for s in seminars if s.attended)
        presented_count = sum(1 for s in seminars if s.is_presenter)

        # Teaching requirement
        teaching_done = db.query(PhDTeachingRequirement).filter(
            PhDTeachingRequirement.student_id == u.id,
            PhDTeachingRequirement.is_completed.is_(True),
        ).first() is not None

        # Supervision logs
        latest_log = db.query(PhDSupervisionLog).filter(
            PhDSupervisionLog.student_id == u.id
        ).order_by(desc(PhDSupervisionLog.meeting_date)).first()

        last_date = latest_log.meeting_date if latest_log else None
        days_since = None
        inactivity_alert = False
        research_stage = latest_log.research_stage if latest_log else "Proposal Preparation"

        if last_date:
            days_since = (today - last_date).days
            if days_since > 60:
                inactivity_alert = True
        else:
            inactivity_alert = True  # No meeting logged at all

        # Latest progress evaluation rating
        latest_eval = db.query(PhDProgressEvaluation).filter(
            PhDProgressEvaluation.student_id == u.id
        ).order_by(desc(PhDProgressEvaluation.created_at)).first()
        recent_eval = latest_eval.overall_rating if latest_eval else None

        # Supervisors
        supervisors = []
        if paper and paper.supervisor:
            supervisors.append(paper.supervisor.full_name or paper.supervisor.email)

        dossiers.append(
            PhDStudentDossier(
                student_id=u.id,
                student_name=u.full_name or u.email,
                student_email=u.email,
                school_id=u.school_id,
                specialization=u.department or "Business Administration",
                program=u.program or "Doctor of Philosophy in Business Administration",
                research_stage=research_stage,
                candidacy_status=candidacy,
                comprehensive_result=comp_result,
                seminars_attended_count=attended_count,
                seminars_presented_count=presented_count,
                teaching_completed=teaching_done,
                last_meeting_date=last_date,
                days_since_last_meeting=days_since,
                inactivity_alert=inactivity_alert,
                supervisors=supervisors,
                recent_eval_rating=recent_eval,
            )
        )

    return dossiers


# 2. Supervision Logs (Monthly Meeting Logs)
@router.get("/supervision-logs", response_model=list[PhDSupervisionLogRead])
def get_supervision_logs(
    student_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDSupervisionLogRead]:
    query = db.query(PhDSupervisionLog)
    if student_id:
        query = query.filter(PhDSupervisionLog.student_id == student_id)
    elif current_user.role == "student":
        query = query.filter(PhDSupervisionLog.student_id == current_user.id)
    elif current_user.role in {"lecturer", "project_supervisor"}:
        query = query.filter(PhDSupervisionLog.supervisor_id == current_user.id)

    logs = query.order_by(desc(PhDSupervisionLog.meeting_date)).all()
    results = []
    for l in logs:
        item = PhDSupervisionLogRead.model_validate(l)
        if l.student:
            item.student_name = l.student.full_name or l.student.email
            item.student_email = l.student.email
        if l.supervisor:
            item.supervisor_name = l.supervisor.full_name or l.supervisor.email
        results.append(item)
    return results


@router.post("/supervision-logs", response_model=PhDSupervisionLogRead, status_code=status.HTTP_201_CREATED)
def create_supervision_log(
    payload: PhDSupervisionLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PhDSupervisionLogRead:
    # Set supervisor_id: if supervisor/lecturer/admin, use current user or target
    supervisor_id = current_user.id
    target_student = db.query(User).filter(User.id == payload.student_id).first()
    if not target_student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student user not found")

    new_log = PhDSupervisionLog(
        student_id=payload.student_id,
        supervisor_id=supervisor_id,
        meeting_date=payload.meeting_date,
        meeting_mode=payload.meeting_mode,
        research_stage=payload.research_stage,
        work_submitted=payload.work_submitted,
        feedback_given=payload.feedback_given,
        next_task=payload.next_task,
        progress_rating=payload.progress_rating,
        supervisor_concerns=payload.supervisor_concerns,
        action_required=payload.action_required,
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    # In-app notification to student
    create_notification(
        db,
        user_id=target_student.id,
        paper_id=None,
        ntype="supervision_log",
        message=f"Supervisor {current_user.full_name or current_user.email} logged a research supervision meeting for {payload.meeting_date}.",
    )

    item = PhDSupervisionLogRead.model_validate(new_log)
    item.student_name = target_student.full_name or target_student.email
    item.supervisor_name = current_user.full_name or current_user.email
    return item


# 3. Seminars Tracker (7 Mandated Categories)
@router.get("/seminars", response_model=list[PhDSeminarRead])
def get_phd_seminars(
    student_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDSeminarRead]:
    query = db.query(PhDSeminar)
    if student_id:
        query = query.filter(PhDSeminar.student_id == student_id)
    elif current_user.role == "student":
        query = query.filter(PhDSeminar.student_id == current_user.id)

    seminars = query.order_by(desc(PhDSeminar.seminar_date)).all()
    results = []
    for s in seminars:
        item = PhDSeminarRead.model_validate(s)
        if s.student:
            item.student_name = s.student.full_name or s.student.email
        results.append(item)
    return results


@router.post("/seminars", response_model=PhDSeminarRead, status_code=status.HTTP_201_CREATED)
def record_phd_seminar(
    payload: PhDSeminarCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PhDSeminarRead:
    new_sem = PhDSeminar(**payload.model_dump())
    db.add(new_sem)
    db.commit()
    db.refresh(new_sem)

    item = PhDSeminarRead.model_validate(new_sem)
    if new_sem.student:
        item.student_name = new_sem.student.full_name or new_sem.student.email
    return item


# 4. Comprehensive Examination Tracking
@router.get("/comprehensive-exams", response_model=list[PhDComprehensiveExamRead])
def get_comprehensive_exams(
    student_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDComprehensiveExamRead]:
    query = db.query(PhDComprehensiveExam)
    if student_id:
        query = query.filter(PhDComprehensiveExam.student_id == student_id)
    elif current_user.role == "student":
        query = query.filter(PhDComprehensiveExam.student_id == current_user.id)

    exams = query.order_by(desc(PhDComprehensiveExam.exam_date)).all()
    results = []
    for e in exams:
        item = PhDComprehensiveExamRead.model_validate(e)
        if e.student:
            item.student_name = e.student.full_name or e.student.email
        results.append(item)
    return results


@router.post("/comprehensive-exams", response_model=PhDComprehensiveExamRead, status_code=status.HTTP_201_CREATED)
def record_comprehensive_exam(
    payload: PhDComprehensiveExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PhDComprehensiveExamRead:
    new_exam = PhDComprehensiveExam(**payload.model_dump())
    if payload.result == "Pass":
        new_exam.advanced_to_candidacy = True
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)

    item = PhDComprehensiveExamRead.model_validate(new_exam)
    if new_exam.student:
        item.student_name = new_exam.student.full_name or new_exam.student.email
    return item


# 5. Teaching Practice Requirement
@router.get("/teaching-requirements", response_model=list[PhDTeachingRequirementRead])
def get_teaching_requirements(
    student_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDTeachingRequirementRead]:
    query = db.query(PhDTeachingRequirement)
    if student_id:
        query = query.filter(PhDTeachingRequirement.student_id == student_id)
    elif current_user.role == "student":
        query = query.filter(PhDTeachingRequirement.student_id == current_user.id)

    records = query.order_by(desc(PhDTeachingRequirement.created_at)).all()
    results = []
    for r in records:
        item = PhDTeachingRequirementRead.model_validate(r)
        if r.student:
            item.student_name = r.student.full_name or r.student.email
        if r.supervising_faculty:
            item.supervising_faculty_name = r.supervising_faculty.full_name or r.supervising_faculty.email
        results.append(item)
    return results


@router.post("/teaching-requirements", response_model=PhDTeachingRequirementRead, status_code=status.HTTP_201_CREATED)
def record_teaching_requirement(
    payload: PhDTeachingRequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PhDTeachingRequirementRead:
    new_tr = PhDTeachingRequirement(**payload.model_dump())
    db.add(new_tr)
    db.commit()
    db.refresh(new_tr)

    item = PhDTeachingRequirementRead.model_validate(new_tr)
    if new_tr.student:
        item.student_name = new_tr.student.full_name or new_tr.student.email
    return item


# 6. Six-Month Progress Evaluations
@router.get("/progress-evaluations", response_model=list[PhDProgressEvaluationRead])
def get_progress_evaluations(
    student_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDProgressEvaluationRead]:
    query = db.query(PhDProgressEvaluation)
    if student_id:
        query = query.filter(PhDProgressEvaluation.student_id == student_id)
    elif current_user.role == "student":
        query = query.filter(PhDProgressEvaluation.student_id == current_user.id)

    evals = query.order_by(desc(PhDProgressEvaluation.evaluation_date)).all()
    results = []
    for ev in evals:
        item = PhDProgressEvaluationRead.model_validate(ev)
        if ev.student:
            item.student_name = ev.student.full_name or ev.student.email
        if ev.evaluator:
            item.evaluator_name = ev.evaluator.full_name or ev.evaluator.email
        results.append(item)
    return results


@router.post("/progress-evaluations", response_model=PhDProgressEvaluationRead, status_code=status.HTTP_201_CREATED)
def record_progress_evaluation(
    payload: PhDProgressEvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PhDProgressEvaluationRead:
    evaluator_id = current_user.id
    new_ev = PhDProgressEvaluation(
        student_id=payload.student_id,
        evaluator_id=evaluator_id,
        evaluation_period=payload.evaluation_period,
        current_stage=payload.current_stage,
        coursework_summary=payload.coursework_summary,
        research_progress_summary=payload.research_progress_summary,
        seminar_summary=payload.seminar_summary,
        teaching_summary=payload.teaching_summary,
        overall_rating=payload.overall_rating,
        action_plan=payload.action_plan,
        follow_up_date=payload.follow_up_date,
        evaluation_date=payload.evaluation_date or date.today(),
    )
    db.add(new_ev)
    db.commit()
    db.refresh(new_ev)

    item = PhDProgressEvaluationRead.model_validate(new_ev)
    if new_ev.student:
        item.student_name = new_ev.student.full_name or new_ev.student.email
    item.evaluator_name = current_user.full_name or current_user.email
    return item


# 7. 18 Reaccreditation Folders
DEFAULT_REACCREDITATION_FOLDERS = [
    (1, "Programme Approval & Accreditation Documents"),
    (2, "Curriculum, Syllabi & Course Outlines"),
    (3, "Admission Records & Interview Rubrics"),
    (4, "Enrolment & Specialization Registers"),
    (5, "Course Registration & Grade Submissions"),
    (6, "Comprehensive Examination Records"),
    (7, "Thesis Proposal Approvals & Ethics Sign-Off"),
    (8, "Supervision Meeting Logs & Workload Reports"),
    (9, "Research Seminar Registers (7 Types)"),
    (10, "Teaching Requirement Observation Reports"),
    (11, "Six-Month Student Progress Evaluation Reports"),
    (12, "Thesis Examination, Viva & Examiner Reports"),
    (13, "Graduate Output, Titles & Completions"),
    (14, "Staff Profiles, PhD Qualifications & Ranks"),
    (15, "Faculty Research Publications & Grants"),
    (16, "Library Holdings, Databases & Facility Resources"),
    (17, "Student Satisfaction & Supervision Surveys"),
    (18, "Quality Assurance Audits & Action Plans"),
]


@router.get("/reaccreditation-folders", response_model=list[PhDReaccreditationFolderRead])
def get_reaccreditation_folders(
    academic_year: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDReaccreditationFolderRead]:
    query = db.query(PhDReaccreditationFolder)
    if academic_year:
        query = query.filter(PhDReaccreditationFolder.academic_year == academic_year)
    records = query.order_by(PhDReaccreditationFolder.folder_number.asc()).all()

    results = []
    for r in records:
        item = PhDReaccreditationFolderRead.model_validate(r)
        if r.uploaded_by:
            item.uploaded_by_name = r.uploaded_by.full_name or r.uploaded_by.email
        results.append(item)
    return results


@router.post("/reaccreditation-folders", response_model=PhDReaccreditationFolderRead, status_code=status.HTTP_201_CREATED)
def upload_reaccreditation_folder_doc(
    payload: PhDReaccreditationFolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PhDReaccreditationFolderRead:
    new_doc = PhDReaccreditationFolder(
        folder_number=payload.folder_number,
        folder_name=payload.folder_name,
        academic_year=payload.academic_year,
        file_name=payload.file_name,
        file_url=payload.file_url,
        description=payload.description,
        uploaded_by_id=current_user.id,
        status=payload.status,
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    item = PhDReaccreditationFolderRead.model_validate(new_doc)
    item.uploaded_by_name = current_user.full_name or current_user.email
    return item
