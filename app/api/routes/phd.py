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
from app.models.base import Base
from app.models.phd_system import (
    PhDSupervisionLog,
    PhDSeminar,
    PhDComprehensiveExam,
    PhDTeachingRequirement,
    PhDProgressEvaluation,
    PhDReaccreditationFolder,
    PhDCourseworkRecord,
    PhDProgressionPipeline,
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
    PhDCourseworkRecordCreate,
    PhDCourseworkRecordRead,
    PhDProgressionPipelineUpdate,
    PhDProgressionPipelineRead,
    PhDStudentDossier,
)
from app.services.user_service import has_role
from app.services.notification_service import create_notification

router = APIRouter(prefix="/phd", tags=["phd"])

_TABLES_ENSURED = False


def _ensure_phd_tables(db: Session) -> None:
    global _TABLES_ENSURED
    if _TABLES_ENSURED:
        return
    try:
        Base.metadata.create_all(bind=db.get_bind())
        _TABLES_ENSURED = True
    except Exception:
        pass


def _calc_letter_grade(total: float) -> tuple[str, float]:
    if total >= 80:
        return "A", 4.0
    if total >= 75:
        return "B+", 3.5
    if total >= 70:
        return "B", 3.0
    if total >= 65:
        return "C+", 2.5
    if total >= 60:
        return "C", 2.0
    return "F", 0.0


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
    _ensure_phd_tables(db)
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

        # E. Progression pipeline where current_user is advisor, assessor, supervisor, or pre-viva examiner
        pipe_rows = db.query(PhDProgressionPipeline.student_id).filter(
            or_(
                PhDProgressionPipeline.advisor_id == current_user.id,
                PhDProgressionPipeline.assessor_id == current_user.id,
                PhDProgressionPipeline.supervisor_id == current_user.id,
                PhDProgressionPipeline.previva_examiner_id == current_user.id,
                PhDProgressionPipeline.external_examiner_id == current_user.id,
            )
        ).all()
        for pr in pipe_rows:
            supervisee_ids.add(pr[0])

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

        # Supervisors & 6-Stage Progression Pipeline
        pipe = db.query(PhDProgressionPipeline).filter(PhDProgressionPipeline.student_id == u.id).first()
        courses = db.query(PhDCourseworkRecord).filter(PhDCourseworkRecord.student_id == u.id).all()
        courses_count = len(courses)
        total_credits = sum((c.credit_hours or 3) for c in courses)
        cgpa = round(sum((c.grade_point or 0.0) * (c.credit_hours or 3) for c in courses) / total_credits, 2) if total_credits > 0 else (latest_exam.cgpa if latest_exam and latest_exam.cgpa else 0.0)

        if pipe and pipe.comp_exam_status == "Pass":
            candidacy = "PhD Candidate"
            comp_result = "Pass"
        elif pipe and pipe.comp_exam_status and pipe.comp_exam_status != "Pending" and comp_result == "Not Sat":
            comp_result = pipe.comp_exam_status

        supervisors = []
        if pipe and pipe.supervisor_name:
            supervisors.append(pipe.supervisor_name)
        if pipe and pipe.co_supervisor_name and pipe.co_supervisor_name not in supervisors:
            supervisors.append(pipe.co_supervisor_name)
        if paper and paper.supervisor:
            p_sup = paper.supervisor.full_name or paper.supervisor.email
            if p_sup not in supervisors:
                supervisors.append(p_sup)
        if latest_log and latest_log.supervisor:
            s_name = latest_log.supervisor.full_name or latest_log.supervisor.email
            if s_name not in supervisors:
                supervisors.append(s_name)

        advisor_work_done = bool(pipe.advisor_work_completed) if pipe else any(c.advisor_cleared for c in courses)
        advisor_name = (pipe.advisor_name if pipe and pipe.advisor_name else (courses[0].advisor_name if courses and courses[0].advisor_name else None))

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
                advisor_name=advisor_name,
                advisor_work_completed=advisor_work_done,
                assessor_name=pipe.assessor_name if pipe else (latest_exam.committee_members if latest_exam else None),
                comp_exam_score=pipe.comp_exam_score if (pipe and pipe.comp_exam_score is not None) else (latest_exam.cgpa if latest_exam else None),
                supervisor_name=supervisors[0] if supervisors else None,
                previva_examiner_name=pipe.previva_examiner_name if pipe else None,
                previva_status=pipe.previva_status if pipe else "Pending",
                previva_score=pipe.previva_score if pipe else None,
                external_examiner_name=pipe.external_examiner_name if pipe else None,
                viva_verdict=pipe.viva_verdict if pipe else "Pending",
                final_defense_mark=pipe.final_defense_mark if pipe else None,
                courses_count=courses_count,
                cgpa=cgpa,
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

    sem_title = (payload.seminar_title or payload.title or "Doctoral Research Seminar").strip()
    remarks_val = payload.remarks or payload.score_or_verdict or payload.evaluator_feedback or "Pass"
    new_sem = PhDSeminar(
        student_id=payload.student_id,
        seminar_title=sem_title,
        seminar_category=payload.seminar_category,
        seminar_date=payload.seminar_date,
        attended=payload.attended,
        is_presenter=payload.is_presenter,
        department=payload.department or payload.evaluator_name,
        evidence_url=payload.evidence_url or payload.venue_or_url,
        remarks=remarks_val,
    )
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

    score_val = payload.score if payload.score is not None else payload.cgpa
    assessor_str = payload.assessor_name or payload.committee_members
    new_exam = PhDComprehensiveExam(
        student_id=payload.student_id,
        coursework_completed=payload.coursework_completed,
        cgpa=score_val,
        specialization=payload.paper_part or payload.specialization or "Major Field & Research Methods",
        application_date=payload.application_date,
        exam_date=payload.exam_date or date.today(),
        attempt_number=payload.attempt_number,
        committee_members=assessor_str,
        result=payload.result,
        advanced_to_candidacy=(payload.result == "Pass" or payload.advanced_to_candidacy),
        appeal_status=payload.appeal_status,
        remarks=payload.remarks or payload.remedial_instructions,
    )
    db.add(new_exam)

    # Also sync into PhDProgressionPipeline so the 6-stage pipeline reflects the Assessor's Comprehensive Exam verdict
    pipe = db.query(PhDProgressionPipeline).filter(PhDProgressionPipeline.student_id == payload.student_id).first()
    if not pipe:
        pipe = PhDProgressionPipeline(student_id=payload.student_id)
        db.add(pipe)
    pipe.comp_exam_status = payload.result
    pipe.comp_exam_score = score_val
    pipe.comp_exam_date = payload.exam_date or date.today()
    if assessor_str:
        pipe.assessor_name = assessor_str
    if payload.remarks or payload.remedial_instructions:
        pipe.comp_exam_remarks = payload.remarks or payload.remedial_instructions
    pipe.updated_at = datetime.now(timezone.utc)

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

    course_label = payload.course_taught
    if not course_label:
        c_code = (payload.course_code or "").strip()
        c_title = (payload.course_title or "").strip()
        course_label = f"{c_code}: {c_title}" if (c_code and c_title) else (c_code or c_title or "Undergraduate Seminar")
    sem_label = f"{payload.academic_year} · {payload.semester}" if payload.academic_year and payload.academic_year not in (payload.semester or "") else payload.semester

    new_tr = PhDTeachingRequirement(
        student_id=payload.student_id,
        course_taught=course_label,
        semester=sem_label,
        department=payload.department,
        supervising_faculty_id=payload.supervising_faculty_id,
        teaching_role=payload.teaching_role or "Teaching Assistant",
        faculty_evaluation_score=payload.contact_hours if payload.contact_hours is not None else payload.faculty_evaluation_score,
        student_evaluation_score=payload.student_evaluation_score,
        feedback_summary=payload.feedback_summary or payload.faculty_feedback or payload.duties_description,
        improvement_plan=payload.improvement_plan,
        is_completed=payload.is_completed,
        completion_date=payload.completion_date or (date.today() if payload.is_completed else None),
    )
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
    _ensure_phd_tables(db)
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


# 9. Stage 1: Doctoral Enrollment, Coursework, Assignments, Exams & Grades (with Advisor)
@router.get("/coursework", response_model=list[PhDCourseworkRecordRead])
def get_phd_coursework_records(
    student_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDCourseworkRecordRead]:
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    query = db.query(PhDCourseworkRecord)

    if allowed_ids is not None:
        if len(allowed_ids) == 0:
            return []
        if student_id:
            if student_id not in allowed_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this student.")
            query = query.filter(PhDCourseworkRecord.student_id == student_id)
        else:
            query = query.filter(PhDCourseworkRecord.student_id.in_(allowed_ids))
    elif student_id:
        query = query.filter(PhDCourseworkRecord.student_id == student_id)

    rows = query.order_by(desc(PhDCourseworkRecord.created_at)).all()
    out: list[PhDCourseworkRecordRead] = []
    for r in rows:
        item = PhDCourseworkRecordRead.model_validate(r)
        if r.student:
            item.student_name = r.student.full_name or r.student.email
        if not item.advisor_name and r.advisor:
            item.advisor_name = r.advisor.full_name or r.advisor.email
        out.append(item)
    return out


@router.post("/coursework", response_model=PhDCourseworkRecordRead, status_code=status.HTTP_201_CREATED)
def record_phd_coursework(
    payload: PhDCourseworkRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PhDCourseworkRecordRead:
    if current_user.role in {"student", "member"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Coursework grades and advisor clearance must be recorded by an Academic Advisor, Coordinator, HOD, or Admin.",
        )
    _ = get_accessible_phd_student_ids(db, current_user)

    total = round(
        float(payload.assignment_score or 0.0)
        + float(payload.coursework_score or 0.0)
        + float(payload.exam_score or 0.0),
        1,
    )
    total = min(100.0, max(0.0, total))
    letter, gp = _calc_letter_grade(total)

    adv_name = payload.advisor_name
    if payload.advisor_id and not adv_name:
        adv_user = db.query(User).filter(User.id == payload.advisor_id).first()
        if adv_user:
            adv_name = adv_user.full_name or adv_user.email
    if not adv_name:
        adv_name = current_user.full_name or current_user.email

    row = PhDCourseworkRecord(
        student_id=payload.student_id,
        advisor_id=payload.advisor_id or current_user.id,
        advisor_name=adv_name,
        course_code=payload.course_code.strip().upper(),
        course_title=payload.course_title.strip(),
        academic_year=payload.academic_year.strip(),
        semester=payload.semester.strip(),
        credit_hours=payload.credit_hours or 3,
        assignment_score=payload.assignment_score,
        coursework_score=payload.coursework_score,
        exam_score=payload.exam_score,
        total_score=total,
        letter_grade=letter,
        grade_point=gp,
        advisor_cleared=payload.advisor_cleared,
        remarks=payload.remarks,
    )
    db.add(row)

    # Sync advisor info & clearance to PhDProgressionPipeline
    pipe = db.query(PhDProgressionPipeline).filter(PhDProgressionPipeline.student_id == payload.student_id).first()
    if not pipe:
        pipe = PhDProgressionPipeline(student_id=payload.student_id)
        db.add(pipe)
    pipe.advisor_id = payload.advisor_id or current_user.id
    pipe.advisor_name = adv_name
    if payload.advisor_cleared:
        pipe.advisor_work_completed = True
        pipe.advisor_clearance_date = date.today()
    pipe.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(row)

    item = PhDCourseworkRecordRead.model_validate(row)
    if row.student:
        item.student_name = row.student.full_name or row.student.email
    return item


# 10. Stages 1-6 End-to-End Doctoral Progression Pipeline (Advisor -> Assessor -> Comp Exam -> Supervisor -> Pre-Viva -> External Viva & Defense Marks)
@router.get("/progression", response_model=list[PhDProgressionPipelineRead])
def get_phd_progression_pipelines(
    student_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PhDProgressionPipelineRead]:
    allowed_ids = get_accessible_phd_student_ids(db, current_user)
    if allowed_ids is not None and len(allowed_ids) == 0:
        return []

    # Ensure every accessible PhD student has a progression pipeline record
    dossiers = list_phd_dossiers(db=db, current_user=current_user)
    if student_id:
        dossiers = [d for d in dossiers if d.student_id == student_id]

    results: list[PhDProgressionPipelineRead] = []
    for d in dossiers:
        pipe = db.query(PhDProgressionPipeline).filter(PhDProgressionPipeline.student_id == d.student_id).first()
        if not pipe:
            pipe = PhDProgressionPipeline(
                student_id=d.student_id,
                advisor_name=d.advisor_name,
                advisor_work_completed=d.advisor_work_completed,
                assessor_name=d.assessor_name,
                comp_exam_status="Pass" if d.candidacy_status == "PhD Candidate" else (d.comprehensive_result if d.comprehensive_result != "Not Sat" else "Pending"),
                comp_exam_score=d.comp_exam_score,
                supervisor_name=d.supervisor_name,
            )
            db.add(pipe)
            db.commit()
            db.refresh(pipe)

        item = PhDProgressionPipelineRead.model_validate(pipe)
        item.student_name = d.student_name
        item.student_email = d.student_email
        item.courses_count = d.courses_count
        item.cgpa = d.cgpa
        item.seminars_count = d.seminars_attended_count + d.seminars_presented_count
        results.append(item)

    return results


@router.post("/progression", response_model=PhDProgressionPipelineRead)
def update_phd_progression_pipeline(
    payload: PhDProgressionPipelineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PhDProgressionPipelineRead:
    if current_user.role in {"student", "member"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctoral progression gatekeeper actions can only be performed by faculty, assessors, coordinators, HODs, or admins.",
        )
    _ = get_accessible_phd_student_ids(db, current_user)

    student = db.query(User).filter(User.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctoral student not found.")

    pipe = db.query(PhDProgressionPipeline).filter(PhDProgressionPipeline.student_id == payload.student_id).first()
    if not pipe:
        pipe = PhDProgressionPipeline(student_id=payload.student_id)
        db.add(pipe)
        db.flush()

    action = (payload.action or "").strip().lower()

    if action == "advisor_clearance":
        if payload.advisor_id:
            pipe.advisor_id = payload.advisor_id
            adv_u = db.query(User).filter(User.id == payload.advisor_id).first()
            if adv_u:
                pipe.advisor_name = adv_u.full_name or adv_u.email
        if payload.advisor_name:
            pipe.advisor_name = payload.advisor_name.strip()
        if not pipe.advisor_name:
            pipe.advisor_name = current_user.full_name or current_user.email
        pipe.advisor_work_completed = True if payload.advisor_work_completed is None else payload.advisor_work_completed
        if pipe.advisor_work_completed:
            pipe.advisor_clearance_date = date.today()
            create_notification(
                db,
                user_id=student.id,
                ntype="phd_advisor_clearance",
                message=f"Your Academic Advisor ({pipe.advisor_name}) has certified your coursework and initial doctoral work complete. You are now eligible for Comprehensive Exam Assessor assignment.",
            )

    elif action == "assign_assessor":
        if not pipe.advisor_work_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gatekeeper Rule: The student must complete their coursework and initial work with their Academic Advisor before an Assessor can be assigned.",
            )
        if payload.assessor_id:
            pipe.assessor_id = payload.assessor_id
            ass_u = db.query(User).filter(User.id == payload.assessor_id).first()
            if ass_u:
                pipe.assessor_name = ass_u.full_name or ass_u.email
        if payload.assessor_name:
            pipe.assessor_name = payload.assessor_name.strip()
        if not pipe.assessor_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please specify the Assessor to assign.")
        pipe.assessor_assigned_date = date.today()
        if pipe.comp_exam_status == "Pending":
            pipe.comp_exam_status = "Assessor Assigned"
        create_notification(
            db,
            user_id=student.id,
            ntype="phd_assessor_assigned",
            message=f"Comprehensive Exam Assessor ({pipe.assessor_name}) has been assigned to evaluate your Comprehensive Examination.",
        )

    elif action == "grade_comp_exam":
        if not pipe.assessor_name and not payload.assessor_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gatekeeper Rule: An Assessor must be assigned before grading the Comprehensive Exam.",
            )
        if payload.assessor_name:
            pipe.assessor_name = payload.assessor_name.strip()
        status_val = payload.comp_exam_status or "Pass"
        pipe.comp_exam_status = status_val
        pipe.comp_exam_score = payload.comp_exam_score
        pipe.comp_exam_date = date.today()
        pipe.comp_exam_remarks = payload.comp_exam_remarks

        # Also record in PhDComprehensiveExam table
        new_exam = PhDComprehensiveExam(
            student_id=student.id,
            coursework_completed=True,
            cgpa=payload.comp_exam_score,
            specialization=student.department or "Doctoral Comprehensive Exam",
            exam_date=date.today(),
            attempt_number=1,
            committee_members=pipe.assessor_name,
            result=status_val,
            advanced_to_candidacy=(status_val == "Pass"),
            remarks=payload.comp_exam_remarks,
        )
        db.add(new_exam)
        create_notification(
            db,
            user_id=student.id,
            ntype="phd_comp_exam_graded",
            message=f"Comprehensive Exam Result recorded by Assessor {pipe.assessor_name}: {status_val} ({payload.comp_exam_score or 0}%). {'You have advanced to PhD Candidacy and are now eligible for Dissertation Supervisor assignment!' if status_val == 'Pass' else ''}",
        )

    elif action == "assign_supervisor":
        # Strict Gatekeeper: Only after passing the Comprehensive Exam by their Assessor can a Dissertation Supervisor be assigned!
        latest_exam = db.query(PhDComprehensiveExam).filter(
            PhDComprehensiveExam.student_id == student.id
        ).order_by(desc(PhDComprehensiveExam.attempt_number)).first()
        has_passed_comp = (pipe.comp_exam_status == "Pass") or (latest_exam is not None and (latest_exam.result == "Pass" or latest_exam.advanced_to_candidacy))
        if not has_passed_comp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gatekeeper Rule: A Dissertation Supervisor can only be assigned AFTER the student has passed the Comprehensive Exam graded by their Assessor.",
            )
        if payload.supervisor_id:
            pipe.supervisor_id = payload.supervisor_id
            sup_u = db.query(User).filter(User.id == payload.supervisor_id).first()
            if sup_u:
                pipe.supervisor_name = sup_u.full_name or sup_u.email
        if payload.supervisor_name:
            pipe.supervisor_name = payload.supervisor_name.strip()
        if payload.co_supervisor_name is not None:
            pipe.co_supervisor_name = payload.co_supervisor_name.strip() or None
        if not pipe.supervisor_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please select or enter a Dissertation Supervisor.")
        pipe.supervisor_assigned_date = date.today()

        # Also update the student's active PhD Paper supervisor_id if one exists
        phd_paper = db.query(Paper).filter(Paper.created_by_id == student.id).order_by(desc(Paper.id)).first()
        if phd_paper and pipe.supervisor_id:
            phd_paper.supervisor_id = pipe.supervisor_id
            db.add(phd_paper)

        create_notification(
            db,
            user_id=student.id,
            ntype="phd_supervisor_assigned",
            message=f"Congratulations on passing your Comprehensive Exam! {pipe.supervisor_name} has been assigned as your Doctoral Dissertation Supervisor.",
        )

    elif action in {"assign_previva", "record_previva"}:
        if payload.previva_examiner_id:
            pipe.previva_examiner_id = payload.previva_examiner_id
            pv_u = db.query(User).filter(User.id == payload.previva_examiner_id).first()
            if pv_u:
                pipe.previva_examiner_name = pv_u.full_name or pv_u.email
        if payload.previva_examiner_name:
            pipe.previva_examiner_name = payload.previva_examiner_name.strip()
        if payload.previva_date:
            pipe.previva_date = payload.previva_date
        else:
            pipe.previva_date = pipe.previva_date or date.today()
        if payload.previva_score is not None:
            pipe.previva_score = payload.previva_score
        if payload.previva_status:
            pipe.previva_status = payload.previva_status
        elif action == "assign_previva" and pipe.previva_status == "Pending":
            pipe.previva_status = "Examiner Assigned"
        if payload.previva_remarks is not None:
            pipe.previva_remarks = payload.previva_remarks

        create_notification(
            db,
            user_id=student.id,
            ntype="phd_previva_update",
            message=f"Pre-Viva Assessment Update: Examiner {pipe.previva_examiner_name or 'Assigned'} · Status: {pipe.previva_status}"
            + (f" · Score: {pipe.previva_score}%" if pipe.previva_score is not None else ""),
        )

    elif action in {"assign_external_viva", "record_defense_marks"}:
        if pipe.previva_status != "Cleared for External Viva":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gatekeeper Rule: The candidate must first pass Pre-Viva ('Cleared for External Viva') before the dissertation can be sent to the External Examiner for the Viva Voce.",
            )
        if payload.external_examiner_id:
            pipe.external_examiner_id = payload.external_examiner_id
            ext_u = db.query(User).filter(User.id == payload.external_examiner_id).first()
            if ext_u:
                pipe.external_examiner_name = ext_u.full_name or ext_u.email
        if payload.external_examiner_name:
            pipe.external_examiner_name = payload.external_examiner_name.strip()
        if payload.external_examiner_institution is not None:
            pipe.external_examiner_institution = payload.external_examiner_institution.strip() or None
        if not pipe.viva_dispatched_date:
            pipe.viva_dispatched_date = date.today()
        if payload.viva_date:
            pipe.viva_date = payload.viva_date

        if payload.internal_examiner_mark is not None:
            pipe.internal_examiner_mark = payload.internal_examiner_mark
        if payload.external_examiner_mark is not None:
            pipe.external_examiner_mark = payload.external_examiner_mark
        if payload.oral_defense_viva_mark is not None:
            pipe.oral_defense_viva_mark = payload.oral_defense_viva_mark

        marks = [
            m for m in [pipe.internal_examiner_mark, pipe.external_examiner_mark, pipe.oral_defense_viva_mark]
            if m is not None
        ]
        if marks:
            pipe.final_defense_mark = round(sum(marks) / len(marks), 1)

        if payload.viva_verdict:
            pipe.viva_verdict = payload.viva_verdict
        elif action == "assign_external_viva" and pipe.viva_verdict == "Pending":
            pipe.viva_verdict = "Dispatched to External Examiner"

        if payload.defense_remarks is not None:
            pipe.defense_remarks = payload.defense_remarks

        create_notification(
            db,
            user_id=student.id,
            ntype="phd_viva_defense_marks",
            message=f"Viva Voce & External Examination Update: External Examiner {pipe.external_examiner_name or 'Assigned'} · Verdict: {pipe.viva_verdict}"
            + (f" · Final Defense Mark: {pipe.final_defense_mark}%" if pipe.final_defense_mark is not None else ""),
        )

    pipe.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pipe)

    courses = db.query(PhDCourseworkRecord).filter(PhDCourseworkRecord.student_id == student.id).all()
    total_credits = sum((c.credit_hours or 3) for c in courses)
    cgpa = round(sum((c.grade_point or 0.0) * (c.credit_hours or 3) for c in courses) / total_credits, 2) if total_credits > 0 else 0.0
    seminars_count = db.query(PhDSeminar).filter(PhDSeminar.student_id == student.id).count()

    item = PhDProgressionPipelineRead.model_validate(pipe)
    item.student_name = student.full_name or student.email
    item.student_email = student.email
    item.courses_count = len(courses)
    item.cgpa = cgpa
    item.seminars_count = seminars_count
    return item


@router.get("/faculty")
def list_phd_faculty_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns faculty members (Advisors, Assessors, Supervisors, Internal Examiners) and External Examiners for PhD Hub dropdowns."""
    _ = get_accessible_phd_student_ids(db, current_user)
    faculty_users = db.query(User).filter(
        User.is_active.is_(True),
        User.role.notin_(["student", "member", "guest", "librarian", "head_library"]),
    ).order_by(User.full_name.asc()).all()
    return [
        {
            "id": u.id,
            "name": u.full_name or u.email,
            "email": u.email,
            "role": u.role,
            "department": u.department or "",
            "school": u.school or "",
            "specialization": u.specialization or "",
        }
        for u in faculty_users
    ]


