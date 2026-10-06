from __future__ import annotations

from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.user_role import UserRole
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


def get_accessible_phd_student_ids(db: Session, current_user: User) -> set[int] | None:
    """
    Computes authorized student IDs for the PhD Programme Hub according to strict RBAC:
    - System Administrator: None (unrestricted institutional oversight).
    - Dean: students enrolled in current_user's school.
    - HOD / Project Coordinator: students enrolled in current_user's department.
    - Project Supervisor / Lecturer: ONLY students actively supervised by current_user.
    - PhD Student: ONLY current_user.id (own dossier and records). Non-PhD students are forbidden.
    - Other roles (Librarian, Guest, etc.): 403 Forbidden.
    """
    user_roles = {current_user.role}
    sec_roles = db.query(UserRole.role).filter(UserRole.user_id == current_user.id).all()
    for r in sec_roles:
        user_roles.add(r[0])

    # 1. System Administrator
    if "system_admin" in user_roles:
        return None

    # 2. Dean (School-level oversight)
    if "dean" in user_roles:
        if current_user.school:
            school_students = db.query(User.id).filter(
                User.role.in_(["student", "member"]),
                func.lower(User.school) == func.lower(current_user.school)
            ).all()
            return {s[0] for s in school_students}
        # Fallback if school unset: institutional leadership
        return None

    # 3. HOD or Project Coordinator (Department-level oversight)
    if "hod" in user_roles or "project_coordinator" in user_roles:
        if current_user.department:
            dept_students = db.query(User.id).filter(
                User.role.in_(["student", "member"]),
                func.lower(User.department) == func.lower(current_user.department)
            ).all()
            return {s[0] for s in dept_students}
        if current_user.school:
            school_students = db.query(User.id).filter(
                User.role.in_(["student", "member"]),
                func.lower(User.school) == func.lower(current_user.school)
            ).all()
            return {s[0] for s in school_students}
        return set()

    # 4. Project Supervisor or Lecturer (ONLY supervisees)
    if "project_supervisor" in user_roles or "lecturer" in user_roles:
        supervisee_ids: set[int] = set()

        # A. Papers where current_user is assigned supervisor
        paper_student_ids = db.query(Paper.created_by_id).filter(
            Paper.supervisor_id == current_user.id,
            Paper.created_by_id.isnot(None),
        ).all()
        for p in paper_student_ids:
            supervisee_ids.add(p[0])

        # B. PhD supervision meeting logs where current_user is supervisor
        log_student_ids = db.query(PhDSupervisionLog.student_id).filter(
            PhDSupervisionLog.supervisor_id == current_user.id,
            PhDSupervisionLog.student_id.isnot(None),
        ).all()
        for l in log_student_ids:
            supervisee_ids.add(l[0])

        # C. Teaching requirements where current_user is supervising faculty
        teach_student_ids = db.query(PhDTeachingRequirement.student_id).filter(
            PhDTeachingRequirement.supervising_faculty_id == current_user.id,
            PhDTeachingRequirement.student_id.isnot(None),
        ).all()
        for t in teach_student_ids:
            supervisee_ids.add(t[0])

        # D. Progress evaluations where current_user is evaluator
        eval_student_ids = db.query(PhDProgressEvaluation.student_id).filter(
            PhDProgressEvaluation.evaluator_id == current_user.id,
            PhDProgressEvaluation.student_id.isnot(None),
        ).all()
        for ev in eval_student_ids:
            supervisee_ids.add(ev[0])

        return supervisee_ids

    # 5. Student / Member (Self-only access, validated for PhD enrolment)
    if "student" in user_roles or "member" in user_roles:
        has_phd_program = bool(current_user.program and any(k in current_user.program.lower() for k in ["phd", "doctor"]))
        has_phd_paper = db.query(Paper.id).filter(
            Paper.created_by_id == current_user.id,
            or_(
                Paper.document_type == "doctoral_thesis",
                Paper.title.ilike("%phd%"),
                Paper.title.ilike("%doctor%"),
            )
        ).first() is not None
        has_phd_log = db.query(PhDSupervisionLog.id).filter(
            PhDSupervisionLog.student_id == current_user.id
        ).first() is not None

        if not (has_phd_program or has_phd_paper or has_phd_log):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to PhD Hub is restricted to registered PhD and Doctoral students.",
            )
        return {current_user.id}

    # 6. Any other role (Librarian, etc.) is forbidden
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access to the PhD Programme Hub is restricted to doctoral students, supervisors, and academic leadership.",
    )


# 1. PhD Student Dossiers & Progress Overview
@router.get("/dossiers", response_model=list[PhDStudentDossier])
def list_phd_dossiers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDStudentDossier]:
    """Lists PhD students with comprehensive degree progress, milestones, and 60-day inactivity alert.
    Strictly role-scoped:
    - Supervisor: only students under their research supervision.
    - PhD Student: only their own single dossier.
    - HOD / Coordinator: all PhD students in their department.
    - Dean: all PhD students in their school.
    - System Admin: all PhD students across the institution.
    """
    allowed_student_ids = get_accessible_phd_student_ids(db, current_user)
    if allowed_student_ids is not None and len(allowed_student_ids) == 0:
        return []

    phd_papers = db.query(Paper).filter(
        or_(
            Paper.document_type == "doctoral_thesis",
            Paper.title.ilike("%phd%"),
            Paper.title.ilike("%doctor%"),
        )
    ).all()
    paper_student_ids = {p.created_by_id for p in phd_papers if p.created_by_id}

    log_students = db.query(PhDSupervisionLog.student_id).all()
    log_student_ids = {l[0] for l in log_students if l[0]}

    # Only include actual student accounts
    query = db.query(User).filter(
        User.role.in_(["student", "member"]),
        or_(
            User.id.in_(paper_student_ids),
            User.id.in_(log_student_ids),
            User.program.ilike("%phd%"),
            User.program.ilike("%doctor%"),
        ),
    )

    if allowed_student_ids is not None:
        query = query.filter(User.id.in_(allowed_student_ids))

    phd_users = query.all()
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
        if latest_log and latest_log.supervisor:
            s_name = latest_log.supervisor.full_name or latest_log.supervisor.email
            if s_name not in supervisors:
                supervisors.append(s_name)

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
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    query = db.query(PhDSupervisionLog)

    if allowed_ids is not None:
        if len(allowed_ids) == 0:
            return []
        if student_id:
            if student_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view supervision records for this student.",
                )
            query = query.filter(PhDSupervisionLog.student_id == student_id)
        else:
            query = query.filter(PhDSupervisionLog.student_id.in_(allowed_ids))
    else:
        if student_id:
            query = query.filter(PhDSupervisionLog.student_id == student_id)

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
    if current_user.role in {"student", "member"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctoral students cannot create supervision meeting logs. This must be recorded by the supervisor.",
        )

    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    if allowed_ids is not None and payload.student_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to log supervision meetings for this doctoral student.",
        )

    target_student = db.query(User).filter(User.id == payload.student_id).first()
    if not target_student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student user not found")

    new_log = PhDSupervisionLog(
        student_id=payload.student_id,
        supervisor_id=current_user.id,
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
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    query = db.query(PhDSeminar)

    if allowed_ids is not None:
        if len(allowed_ids) == 0:
            return []
        if student_id:
            if student_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view seminar records for this student.",
                )
            query = query.filter(PhDSeminar.student_id == student_id)
        else:
            query = query.filter(PhDSeminar.student_id.in_(allowed_ids))
    else:
        if student_id:
            query = query.filter(PhDSeminar.student_id == student_id)

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
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    if current_user.role in {"student", "member"}:
        payload.student_id = current_user.id
    elif allowed_ids is not None and payload.student_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to record seminars for this doctoral student.",
        )

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
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    query = db.query(PhDComprehensiveExam)

    if allowed_ids is not None:
        if len(allowed_ids) == 0:
            return []
        if student_id:
            if student_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view examination records for this student.",
                )
            query = query.filter(PhDComprehensiveExam.student_id == student_id)
        else:
            query = query.filter(PhDComprehensiveExam.student_id.in_(allowed_ids))
    else:
        if student_id:
            query = query.filter(PhDComprehensiveExam.student_id == student_id)

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
    if current_user.role in {"student", "member"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctoral students cannot enter comprehensive exam results.",
        )

    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    if allowed_ids is not None and payload.student_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to record comprehensive exams for this student.",
        )

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
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    query = db.query(PhDTeachingRequirement)

    if allowed_ids is not None:
        if len(allowed_ids) == 0:
            return []
        if student_id:
            if student_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view teaching requirements for this student.",
                )
            query = query.filter(PhDTeachingRequirement.student_id == student_id)
        else:
            query = query.filter(PhDTeachingRequirement.student_id.in_(allowed_ids))
    else:
        if student_id:
            query = query.filter(PhDTeachingRequirement.student_id == student_id)

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
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    if current_user.role in {"student", "member"}:
        payload.student_id = current_user.id
    elif allowed_ids is not None and payload.student_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to record teaching requirements for this student.",
        )

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
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    query = db.query(PhDProgressEvaluation)

    if allowed_ids is not None:
        if len(allowed_ids) == 0:
            return []
        if student_id:
            if student_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view progress evaluations for this student.",
                )
            query = query.filter(PhDProgressEvaluation.student_id == student_id)
        else:
            query = query.filter(PhDProgressEvaluation.student_id.in_(allowed_ids))
    else:
        if student_id:
            query = query.filter(PhDProgressEvaluation.student_id == student_id)

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
    if current_user.role in {"student", "member"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctoral students cannot conduct progress evaluations for themselves.",
        )

    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    if allowed_ids is not None and payload.student_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to conduct progress evaluations for this student.",
        )

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
    # Check access to PhD Hub
    _ = get_accessible_phd_student_ids(db, current_user)

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
    if current_user.role in {"student", "member"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctoral candidates cannot upload accreditation evidence.",
        )

    # Check access to PhD Hub
    _ = get_accessible_phd_student_ids(db, current_user)

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


# 8. Regulatory Early-Warning Reminders Dispatch
@router.post("/regulatory-reminders")
def send_regulatory_inactivity_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sends official GIMPA regulatory early-warning email reminders to PhD students
    and their assigned supervisors when research supervision has stalled for > 60 days
    (or no meeting has been recorded).
    Strictly scoped according to the caller's role (supervisor, HOD, coordinator, dean, admin).
    """
    user_roles = {current_user.role}
    sec_roles = db.query(UserRole.role).filter(UserRole.user_id == current_user.id).all()
    for r in sec_roles:
        user_roles.add(r[0])

    allowed_roles = {"system_admin", "dean", "hod", "project_coordinator", "project_supervisor", "lecturer"}
    if not (user_roles & allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to dispatch regulatory supervision reminders.",
        )

    accessible_student_ids = get_accessible_phd_student_ids(db, current_user)
    if accessible_student_ids is not None and len(accessible_student_ids) == 0:
        return {
            "success": True,
            "message": "No candidates in your assigned scope.",
            "candidates_evaluated": 0,
            "inactive_candidates_found": 0,
            "students_notified": 0,
            "supervisors_notified": 0,
            "details": [],
        }

    q = db.query(User).filter(
        User.role.in_(["student", "member"]),
        or_(
            func.lower(User.program).like("%phd%"),
            func.lower(User.program).like("%doctor%"),
            User.id.in_(db.query(PhDSupervisionLog.student_id)),
        )
    )
    if accessible_student_ids is not None:
        q = q.filter(User.id.in_(accessible_student_ids))

    candidates = q.all()
    today = date.today()

    students_notified = 0
    supervisors_notified = 0
    details = []

    for st in candidates:
        latest_log = db.query(PhDSupervisionLog).filter(
            PhDSupervisionLog.student_id == st.id
        ).order_by(desc(PhDSupervisionLog.meeting_date)).first()

        last_date = latest_log.meeting_date if latest_log else None
        days_since = (today - last_date).days if last_date else None
        is_inactive = (days_since is None) or (days_since > 60)

        if not is_inactive:
            continue

        days_text = f"{days_since} days" if days_since is not None else "no recorded session since admission"
        last_date_str = last_date.strftime("%d %b %Y") if last_date else "None on record"

        # A. Notify Student
        st_name = st.full_name or "Doctoral Candidate"
        st_msg = (
            f"Regulatory Early-Warning: Inactive Research Supervision Notice\n\n"
            f"Dear {st_name},\n\n"
            f"Our academic records indicate that you have had no research supervision session logged "
            f"in the GIMPA PhD Hub for {days_text} (last recorded: {last_date_str}).\n\n"
            f"Under GIMPA doctoral regulations and accreditation quality assurance standards:\n"
            f"• All doctoral candidates must participate in regular research supervision meetings at least once every month.\n"
            f"• Each supervisory session, milestone progress, and target deliverable must be formally logged in the 12-Stage Supervision portal.\n"
            f"• Sustained dormancy without recorded supervisory guidance compromises your academic standing and degree progression.\n\n"
            f"Required Immediate Action:\n"
            f"1. Contact your assigned research supervisor immediately to schedule your monthly supervision session.\n"
            f"2. Ensure the supervisory meeting notes and progress milestones are recorded in the GIMPA PhD Hub.\n\n"
            f"If you are encountering extenuating circumstances or administrative challenges, please notify your Department Project Coordinator or HOD."
        )

        create_notification(
            db=db,
            user_id=st.id,
            message=st_msg,
            ntype="phd_supervision_inactivity_student",
        )
        students_notified += 1

        # B. Notify Assigned Supervisor(s)
        supervisor_ids = set()
        paper = db.query(Paper).filter(Paper.created_by_id == st.id).first()
        if paper and paper.supervisor_id:
            supervisor_ids.add(paper.supervisor_id)
        if latest_log and latest_log.supervisor_id:
            supervisor_ids.add(latest_log.supervisor_id)


        all_logs = db.query(PhDSupervisionLog.supervisor_id).filter(PhDSupervisionLog.student_id == st.id).distinct().all()
        for log_row in all_logs:
            if log_row[0]:
                supervisor_ids.add(log_row[0])

        for sup_id in supervisor_ids:
            sup_user = db.query(User).filter(User.id == sup_id).first()
            if sup_user:
                sup_name = sup_user.full_name or "Supervisor"
                sup_msg = (
                    f"Doctoral Supervision Alert: Candidate Inactivity Warning\n\n"
                    f"Dear {sup_name},\n\n"
                    f"This is an automated regulatory notification regarding your doctoral supervisee:\n"
                    f"• Candidate: {st_name} ({st.email})\n"
                    f"• Programme: {st.program or 'Doctor of Philosophy'}\n"
                    f"• Department: {st.department or 'N/A'}\n"
                    f"• School: {st.school or 'N/A'}\n"
                    f"• Supervision Status: Inactive ({days_text}, last recorded: {last_date_str})\n\n"
                    f"In compliance with GIMPA postgraduate guidelines and regulatory accreditation standards, "
                    f"monthly supervisory interactions are mandatory to prevent candidate stalling or abandonment.\n\n"
                    f"Action Requested:\n"
                    f"Please arrange a research consultation with {st_name} at your earliest convenience and log the meeting details, "
                    f"stage progress, and action items in the GIMPA PhD Hub (12-Stage Supervision Logs)."
                )

                create_notification(
                    db=db,
                    user_id=sup_user.id,
                    message=sup_msg,
                    ntype="phd_supervision_inactivity_supervisor",
                )
                supervisors_notified += 1

        details.append({
            "student_id": st.id,
            "student_name": st_name,
            "student_email": st.email,
            "days_since_last_meeting": days_since,
            "supervisors_contacted": len(supervisor_ids),
        })

    return {
        "success": True,
        "message": f"Dispatched regulatory reminders for {len(details)} inactive doctoral candidate(s).",
        "candidates_evaluated": len(candidates),
        "inactive_candidates_found": len(details),
        "students_notified": students_notified,
        "supervisors_notified": supervisors_notified,
        "details": details,
    }

