from __future__ import annotations

import io
import zipfile
import hmac
import hashlib
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import or_, func, case, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_any_role
from app.core.config import settings
from app.models.department import Department
from app.models.paper import Paper
from app.models.thesis_system import (
    School,
    Thesis,
    Proposal,
    Step,
    StepFinalization,
    ExaminerAssignment,
    ExaminerUpload,
    ExaminationResult,
    HodComment,
    Correction,
    Publication,
    DocumentComment,
    AuditLog,
)
from app.models.user import User
from app.models.user_role import UserRole
from app.services.grading_service import calculate_thesis_examination_score, classify_degree_level
from app.schemas.examination import (
    AdminMarkSheetResponse,
    BulkAssignSummary,
    ExaminerGradingRequest,
    ExaminerMarkDetail,
    ExaminerQualitativeFeedback,
    StudentFeedbackResponse,
)
from app.services.email_service import send_notification_email
from app.services.import_service import load_rows_from_upload
from app.services.notification_service import create_notification
from app.services.user_service import get_user_roles, has_role

router = APIRouter(tags=["theses"])

UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads" / "theses"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _record_audit_log(
    db: Session,
    *,
    thesis_id: int,
    actor_id: int | None,
    action: str,
    from_phase: int | None = None,
    to_phase: int | None = None,
):
    audit = AuditLog(
        thesis_id=thesis_id,
        actor_id=actor_id,
        action=action,
        from_phase=from_phase,
        to_phase=to_phase,
    )
    db.add(audit)
    db.commit()


def _send_thesis_email(*, to_user: User | None, subject: str, body: str) -> None:
    """Fire-and-forget email wrapper for thesis workflow events."""
    if to_user and to_user.email:
        send_notification_email(
            to_email=to_user.email,
            to_name=to_user.full_name or to_user.email,
            subject=subject,
            message=body,
        )


def _to_thesis_dict(thesis: Thesis, paper: Paper | None = None, db: Session | None = None) -> dict:
    student_user = thesis.student
    supervisor_user = thesis.supervisor
    dept = thesis.department

    # Get examiners if assigned
    assignments = db.query(ExaminerAssignment).filter(ExaminerAssignment.thesis_id == thesis.id).all() if db else []
    internal_assignment = next((a for a in assignments if a.examiner_type == "internal"), None)
    external_assignment = next((a for a in assignments if a.examiner_type == "external"), None)

    latest_proposal = (
        db.query(Proposal).filter(Proposal.thesis_id == thesis.id).order_by(Proposal.version.desc()).first()
        if db else None
    )
    steps_list = (
        db.query(Step).filter(Step.thesis_id == thesis.id).order_by(Step.step_number.asc()).all()
        if db else []
    )
    latest_correction = (
        db.query(Correction).filter(Correction.thesis_id == thesis.id).order_by(Correction.version.desc()).first()
        if db else None
    )
    latest_hod_comment = (
        db.query(HodComment).filter(HodComment.thesis_id == thesis.id).order_by(HodComment.sent_to_student_at.desc()).first()
        if db else None
    )
    pub = thesis.publication if hasattr(thesis, "publication") else None

    # Sync status string for frontend compatibility
    status_str = "phase1_proposal_submitted"
    if thesis.phase == 1:
        if thesis.topic_status == "rejected":
            status_str = "phase1_topic_rejected"
        elif thesis.supervisor_id:
            status_str = "phase1_topic_accepted"
        else:
            status_str = "phase1_proposal_submitted"
    elif thesis.phase == 2:
        if latest_proposal and latest_proposal.status == "accepted":
            status_str = "phase3_chapters"
        else:
            status_str = "phase2_proposal_submitted"
    elif thesis.phase == 3:
        if internal_assignment or external_assignment:
            status_str = "phase4_marking"
        else:
            status_str = "phase4_pending_examiners"
    elif thesis.phase == 4:
        status_str = "phase5_corrections"
    elif thesis.phase == 5:
        if pub and pub.is_public:
            status_str = "phase5_published"
        else:
            status_str = "phase5_approved_for_library"

    if paper:
        status_str = paper.status

    return {
        "id": thesis.id,
        "thesis_id": thesis.id,
        "paper_id": paper.id if paper else thesis.id,
        "student_id": thesis.student_id,
        "student_name": student_user.full_name or student_user.email if student_user else None,
        "student_email": student_user.email if student_user else None,
        "supervisor_id": thesis.supervisor_id,
        "supervisor_name": supervisor_user.full_name or supervisor_user.email if supervisor_user else None,
        "department_id": thesis.department_id,
        "department_name": dept.name if dept else None,
        "topic_title": thesis.topic_title,
        "topic_description": thesis.topic_description,
        "topic_status": thesis.topic_status,
        "phase": thesis.phase,
        "status": status_str,
        "title": thesis.topic_title,
        "abstract": thesis.topic_description or (paper.abstract if paper else None),
        "created_at": thesis.created_at.isoformat() if thesis.created_at else None,
        "updated_at": thesis.updated_at.isoformat() if thesis.updated_at else None,
        "internal_examiner_id": internal_assignment.examiner_id if internal_assignment else (paper.internal_examiner_id if paper else None),
        "external_examiner_id": external_assignment.examiner_id if external_assignment else (paper.external_examiner_id if paper else None),
        "latest_proposal": {
            "id": latest_proposal.id,
            "file_url": latest_proposal.file_url,
            "status": latest_proposal.status,
            "supervisor_comment": latest_proposal.supervisor_comment,
            "version": latest_proposal.version,
        } if latest_proposal else None,
        "steps": [
            {
                "id": s.id,
                "step_number": s.step_number,
                "title": s.title,
                "file_url": s.file_url,
                "status": s.status,
                "supervisor_comment": s.supervisor_comment,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in steps_list
        ],
        "latest_correction": {
            "id": latest_correction.id,
            "file_url": latest_correction.file_url,
            "version": latest_correction.version,
            "supervisor_status": latest_correction.supervisor_status,
            "coordinator_status": getattr(latest_correction, "coordinator_status", "pending"),
            "hod_status": latest_correction.hod_status,
            "submitted_at": latest_correction.submitted_at.isoformat() if latest_correction.submitted_at else None,
        } if latest_correction else None,
        "hod_comment": {
            "id": latest_hod_comment.id,
            "compiled_comment": latest_hod_comment.compiled_comment,
            "sent_to_student_at": latest_hod_comment.sent_to_student_at.isoformat() if latest_hod_comment.sent_to_student_at else None,
        } if latest_hod_comment else None,
        "publication": {
            "id": pub.id,
            "published_at": pub.published_at.isoformat() if pub.published_at else None,
            "public_file_url": pub.public_file_url,
            "abstract": pub.abstract,
            "is_public": pub.is_public,
        } if pub else None,
    }


# ==========================================
# Admin Endpoints (Section 6)
# ==========================================

@router.post("/admin/schools", status_code=status.HTTP_201_CREATED)
def create_school(
    name: str = Form(...),
    dean_user_id: int | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("system_admin")),
):
    school = School(name=name, dean_user_id=dean_user_id)
    db.add(school)
    db.commit()
    db.refresh(school)
    return {"id": school.id, "name": school.name, "dean_user_id": school.dean_user_id}


@router.post("/admin/departments", status_code=status.HTTP_201_CREATED)
def create_department(
    name: str = Form(...),
    school_id: int | None = Form(None),
    hod_user_id: int | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("system_admin")),
):
    dept = Department(name=name, hod_user_id=hod_user_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {"id": dept.id, "name": dept.name, "hod_user_id": dept.hod_user_id}


@router.post("/dean/assign-hod")
def dean_assign_hod(
    department_id: int = Form(...),
    hod_user_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("dean", "system_admin")),
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    
    hod_user = db.query(User).filter(User.id == hod_user_id).first()
    if not hod_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD User not found")

    dept.hod_user_id = hod_user_id
    db.add(dept)
    
    # Assign hod role if missing
    if not has_role(db, hod_user, "hod"):
        db.add(UserRole(user_id=hod_user.id, role="hod"))

    db.commit()
    return {"message": f"Assigned {hod_user.email} as HOD for department {dept.name}"}


@router.get("/dean/dashboard")
def dean_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("dean", "system_admin")),
):
    total_theses = db.query(Thesis).count()
    total_papers = db.query(Paper).count()
    phase_breakdown = {
        "phase1": db.query(Thesis).filter(Thesis.phase == 1).count(),
        "phase2": db.query(Thesis).filter(Thesis.phase == 2).count(),
        "phase3": db.query(Thesis).filter(Thesis.phase == 3).count(),
        "phase4": db.query(Thesis).filter(Thesis.phase == 4).count(),
        "phase5": db.query(Thesis).filter(Thesis.phase == 5).count(),
    }
    departments = db.query(Department).all()
    dept_metrics = []
    for d in departments:
        count = db.query(Thesis).filter(Thesis.department_id == d.id).count()
        dept_metrics.append({"id": d.id, "name": d.name, "thesis_count": count})

    return {
        "total_theses": max(total_theses, total_papers),
        "phase_breakdown": phase_breakdown,
        "department_metrics": dept_metrics,
    }


@router.get("/hod/dashboard")
def hod_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "project_coordinator", "system_admin")),
):
    user_dept = current_user.department
    dept_obj = None
    if user_dept:
        dept_obj = db.query(Department).filter(func.lower(Department.name) == user_dept.strip().lower()).first()

    query = db.query(Thesis)
    if dept_obj and not current_user.is_admin:
        query = query.filter(Thesis.department_id == dept_obj.id)

    theses = query.all()
    phase_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for t in theses:
        phase_counts[t.phase] = phase_counts.get(t.phase, 0) + 1

    pending_topics = [t for t in theses if t.phase == 1 and t.topic_status == "pending"]
    pending_examiners = [t for t in theses if t.phase == 3]
    pending_dual_approvals = [
        t for t in theses if t.phase == 4
    ]

    return {
        "department_name": dept_obj.name if dept_obj else user_dept,
        "total_theses": len(theses),
        "phase_counts": phase_counts,
        "pending_topics_count": len(pending_topics),
        "pending_examiners_count": len(pending_examiners),
        "pending_dual_approvals_count": len(pending_dual_approvals),
    }


# ==========================================
# Phase 1 & Thesis Topic Endpoints
# ==========================================

@router.post("/theses/topic", status_code=status.HTTP_201_CREATED)
@router.post("/theses", status_code=status.HTTP_201_CREATED)
def submit_topic(
    topic_title: str = Form(...),
    topic_description: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dept_obj = None
    if current_user.department:
        dept_obj = db.query(Department).filter(func.lower(Department.name) == current_user.department.strip().lower()).first()

    thesis = Thesis(
        student_id=current_user.id,
        department_id=dept_obj.id if dept_obj else None,
        topic_title=topic_title,
        topic_description=topic_description,
        topic_status="pending",
        phase=1,
    )
    db.add(thesis)
    db.flush()

    # Also mirror into Paper table for frontend compatibility
    paper = Paper(
        id=thesis.id,
        title=topic_title,
        abstract=topic_description,
        status="phase1_proposal_submitted",
        document_type="thesis_topic",
        created_by_id=current_user.id,
        department_id=dept_obj.id if dept_obj else None,
    )
    db.add(paper)
    db.commit()
    db.refresh(thesis)

    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="submit_topic", from_phase=None, to_phase=1)

    # Notify HOD (in-app + email)
    if dept_obj and dept_obj.hod_user_id:
        hod_user = db.query(User).filter(User.id == dept_obj.hod_user_id).first()
        notif_msg = f"New thesis topic submitted by {current_user.full_name or current_user.email}: '{topic_title}'"
        create_notification(
            db,
            user_id=dept_obj.hod_user_id,
            paper_id=thesis.id,
            ntype="workflow_update",
            message=notif_msg,
        )
        _send_thesis_email(
            to_user=hod_user,
            subject=f"[GIMPA Thesis] New Topic Submission — {topic_title}",
            body=(
                f"A new thesis topic has been submitted and is awaiting your review.\n\n"
                f"Student: {current_user.full_name or current_user.email}\n"
                f"Topic Title: {topic_title}\n\n"
                f"Please log in to the GIMPA Thesis Repository to review and either accept or reject this topic."
            ),
        )

    return _to_thesis_dict(thesis, paper, db)


@router.post("/theses/{thesis_id}/topic/accept")
def accept_topic(
    thesis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "project_coordinator", "system_admin")),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    thesis.topic_status = "accepted"
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        paper.status = "phase1_topic_accepted"

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="accept_topic", from_phase=1, to_phase=1)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    notif_msg = f"Your thesis topic '{thesis.topic_title}' has been accepted by the HOD! A supervisor will be assigned soon."
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_msg,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Topic Accepted — {thesis.topic_title}",
        body=(
            f"Great news! Your thesis topic has been accepted by the Head of Department.\n\n"
            f"Topic Title: {thesis.topic_title}\n"
            f"Status: ACCEPTED\n\n"
            f"A supervisor will be assigned to you shortly. You will receive another notification when this happens."
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


@router.post("/theses/{thesis_id}/topic/reject")
def reject_topic(
    thesis_id: int,
    comment: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "project_coordinator", "system_admin")),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    thesis.topic_status = "rejected"
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        paper.status = "phase1_topic_rejected"
        paper.review_comments = comment

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="reject_topic", from_phase=1, to_phase=1)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    feedback = comment or "Please revise and resubmit."
    notif_msg = f"Your thesis topic '{thesis.topic_title}' was rejected by the HOD. Feedback: {feedback}"
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_msg,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Topic Rejected — {thesis.topic_title}",
        body=(
            f"Your thesis topic submission has been reviewed by the Head of Department.\n\n"
            f"Topic Title: {thesis.topic_title}\n"
            f"Decision: REJECTED\n"
            f"Feedback: {feedback}\n\n"
            f"Please log in to revise your topic and resubmit."
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


@router.post("/theses/{thesis_id}/assign-supervisor")
def assign_supervisor(
    thesis_id: int,
    supervisor_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "project_coordinator", "system_admin")),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    sup = db.query(User).filter(User.id == supervisor_id).first()
    if not sup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supervisor user not found")

    thesis.supervisor_id = supervisor_id
    thesis.phase = 2  # Advances to Phase 2 (Proposal & Steps)
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        paper.supervisor_id = supervisor_id
        paper.status = "phase1_topic_accepted"

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="assign_supervisor", from_phase=1, to_phase=2)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    # Notify student
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=f"Supervisor {sup.full_name or sup.email} has been assigned to your thesis! Please submit your proposal.",
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Supervisor Assigned — {thesis.topic_title}",
        body=(
            f"A supervisor has been assigned to your thesis. You may now proceed to Phase 2.\n\n"
            f"Thesis Title: {thesis.topic_title}\n"
            f"Assigned Supervisor: {sup.full_name or sup.email}\n\n"
            f"Please log in to upload your proposal document."
        ),
    )
    # Notify supervisor
    create_notification(
        db,
        user_id=supervisor_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=f"You have been assigned as supervisor for thesis: '{thesis.topic_title}'.",
    )
    _send_thesis_email(
        to_user=sup,
        subject=f"[GIMPA Thesis] You Have Been Assigned as Supervisor",
        body=(
            f"You have been assigned as the supervisor for the following thesis.\n\n"
            f"Student: {student.full_name if student else 'N/A'}\n"
            f"Thesis Title: {thesis.topic_title}\n\n"
            f"Please log in to the GIMPA Thesis Repository to review proposals and step submissions from your student."
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


# ==========================================
# Phase 2 — Proposal & Dynamic Steps Endpoints
# ==========================================

@router.post("/theses/{thesis_id}/proposal")
async def submit_proposal(
    thesis_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if not thesis and not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    if not thesis and paper:
        thesis = Thesis(
            id=paper.id,
            student_id=paper.created_by_id or current_user.id,
            department_id=paper.department_id,
            topic_title=paper.title,
            topic_description=paper.abstract,
            topic_status="approved",
            supervisor_id=paper.supervisor_id,
            phase=2,
        )
        db.add(thesis)
        db.flush()

    safe_name = f"{uuid4().hex}_{Path(file.filename or 'proposal.docx').name}"
    dest = UPLOADS_DIR / safe_name
    content = await file.read()
    dest.write_bytes(content)

    existing_count = db.query(Proposal).filter(Proposal.thesis_id == thesis_id).count()
    proposal = Proposal(
        thesis_id=thesis_id,
        file_url=str(dest),
        status="pending",
        version=existing_count + 1,
    )
    db.add(proposal)

    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        paper.status = "phase2_proposal_submitted"
        paper.file_path = str(dest)
        paper.file_name = file.filename

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="submit_proposal", from_phase=2, to_phase=2)

    if thesis.supervisor_id:
        sup = db.query(User).filter(User.id == thesis.supervisor_id).first()
        student = db.query(User).filter(User.id == thesis.student_id).first()
        notif_msg = f"Proposal version {proposal.version} submitted for thesis '{thesis.topic_title}'. Please review."
        create_notification(
            db,
            user_id=thesis.supervisor_id,
            paper_id=thesis.id,
            ntype="workflow_update",
            message=notif_msg,
        )
        _send_thesis_email(
            to_user=sup,
            subject=f"[GIMPA Thesis] New Proposal Submitted — {thesis.topic_title}",
            body=(
                f"A proposal document has been submitted for your review.\n\n"
                f"Student: {student.full_name if student else 'N/A'}\n"
                f"Thesis Title: {thesis.topic_title}\n"
                f"Proposal Version: {proposal.version}\n\n"
                f"Please log in to the GIMPA Thesis Repository to review this proposal."
            ),
        )

    return _to_thesis_dict(thesis, paper, db)


@router.post("/theses/{thesis_id}/proposal/decision")
def proposal_decision(
    thesis_id: int,
    decision: str = Form(...),  # accepted or revise
    comment: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    proposal = db.query(Proposal).filter(Proposal.thesis_id == thesis_id).order_by(Proposal.version.desc()).first()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No proposal found for this thesis")

    proposal.status = decision
    proposal.supervisor_comment = comment

    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        if decision == "accepted":
            paper.status = "phase3_chapters"
        else:
            paper.status = "phase2_proposal_submitted"
            paper.review_comments = comment

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action=f"proposal_decision_{decision}", from_phase=2, to_phase=2)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    feedback = comment or 'No additional feedback provided.'
    notif_msg = f"Proposal reviewed by supervisor: {decision.upper()}. Feedback: {feedback}"
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_msg,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Proposal {'Accepted' if decision == 'accepted' else 'Needs Revision'} — {thesis.topic_title}",
        body=(
            f"Your supervisor has reviewed your proposal.\n\n"
            f"Thesis Title: {thesis.topic_title}\n"
            f"Decision: {decision.upper()}\n"
            f"Feedback: {feedback}\n\n"
            + ("You may now proceed to upload your thesis steps." if decision == "accepted"
               else "Please revise your proposal and resubmit it.")
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


@router.post("/theses/{thesis_id}/steps")
async def submit_step(
    thesis_id: int,
    step_number: int = Form(...),
    title: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Primary lookup: try the Thesis table first, then fall back to Paper.
    # This bridges the gap between Thesis-centric routes and Paper-centric seeders.
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()

    if not thesis and not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    safe_name = f"{uuid4().hex}_{Path(file.filename or 'step.docx').name}"
    dest = UPLOADS_DIR / safe_name
    content = await file.read()
    dest.write_bytes(content)

    step = Step(
        thesis_id=thesis_id,
        step_number=step_number,
        title=title or f"Step {step_number}",
        file_url=str(dest),
        status="submitted",
    )
    db.add(step)

    if paper:
        if step_number == 1: paper.ch1_student_done = True
        elif step_number == 2: paper.ch2_student_done = True
        elif step_number == 3: paper.ch3_student_done = True
        elif step_number == 4: paper.ch4_student_done = True
        elif step_number == 5: paper.ch5_student_done = True
        # Advance paper status so supervisor's pending list stays in sync
        if paper.status == "phase3_chapters":
            paper.status = "phase3_steps_in_progress"

    db.commit()

    # Resolve supervisor and student for notifications (prefer Thesis, fall back to Paper)
    supervisor_id = (thesis.supervisor_id if thesis else None) or (paper.supervisor_id if paper else None)
    student_id = (thesis.student_id if thesis else None) or (paper.created_by_id if paper else None)
    topic_title = (thesis.topic_title if thesis else None) or (paper.title if paper else f"Thesis #{thesis_id}")

    if thesis:
        _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action=f"submit_step_{step_number}", from_phase=2, to_phase=2)

    if supervisor_id:
        sup = db.query(User).filter(User.id == supervisor_id).first()
        student_obj = db.query(User).filter(User.id == student_id).first() if student_id else None
        notif_msg = f"Step {step_number} ('{step.title}') submitted for thesis '{topic_title}'."
        create_notification(
            db,
            user_id=supervisor_id,
            paper_id=thesis_id,
            ntype="workflow_update",
            message=notif_msg,
        )
        _send_thesis_email(
            to_user=sup,
            subject=f"[GIMPA Thesis] Step {step_number} Submitted — {topic_title}",
            body=(
                f"A new step has been submitted and is awaiting your review.\n\n"
                f"Student: {student_obj.full_name if student_obj else 'N/A'}\n"
                f"Thesis Title: {topic_title}\n"
                f"Step Number: {step_number} — {step.title}\n\n"
                f"Please log in to the GIMPA Thesis Repository to review this step."
            ),
        )

    if thesis:
        return _to_thesis_dict(thesis, paper, db)
    # Paper-only path: return the updated PaperRead so the frontend gets steps[] populated
    from app.schemas.paper import StepRead
    raw_steps = db.query(Step).filter(Step.thesis_id == thesis_id).order_by(Step.step_number.asc()).all()
    from app.api.routes.papers import _to_paper_read  # local import to avoid circular
    return _to_paper_read(paper, db, current_user)



@router.post("/steps/{step_id}/decision")
def step_decision(
    step_id: int,
    decision: str = Form(...),  # approved or revise
    comment: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    step = db.query(Step).filter(Step.id == step_id).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    step.status = decision
    step.supervisor_comment = comment
    thesis = db.query(Thesis).filter(Thesis.id == step.thesis_id).first()

    # Always look up the Paper record (thesis may be None in paper-only path)
    paper = db.query(Paper).filter(Paper.id == step.thesis_id).first()
    if paper:
        is_app = (decision == "approved")
        if step.step_number == 1: paper.ch1_supervisor_approved = is_app
        elif step.step_number == 2: paper.ch2_supervisor_approved = is_app
        elif step.step_number == 3: paper.ch3_supervisor_approved = is_app
        elif step.step_number == 4: paper.ch4_supervisor_approved = is_app
        elif step.step_number == 5: paper.ch5_supervisor_approved = is_app

    db.commit()
    if thesis:
        _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action=f"step_{step.step_number}_decision_{decision}", from_phase=2, to_phase=2)
        student = db.query(User).filter(User.id == thesis.student_id).first()
        feedback = comment or 'No additional feedback.'
        notif_msg = f"Step {step.step_number} decision: {decision.upper()}. Feedback: {feedback}"
        create_notification(
            db,
            user_id=thesis.student_id,
            paper_id=thesis.id,
            ntype="workflow_update",
            message=notif_msg,
        )
        _send_thesis_email(
            to_user=student,
            subject=f"[GIMPA Thesis] Step {step.step_number} {'Approved' if decision == 'approved' else 'Needs Revision'} — {thesis.topic_title}",
            body=(
                f"Your supervisor has reviewed Step {step.step_number} of your thesis.\n\n"
                f"Thesis Title: {thesis.topic_title}\n"
                f"Step: {step.step_number} — {step.title}\n"
                f"Decision: {decision.upper()}\n"
                f"Feedback: {feedback}\n\n"
                + ("Well done! You may proceed to the next step." if decision == "approved"
                   else "Please revise this step and resubmit.")
            ),
        )
    elif paper:
        # Paper-only path: notify the student via paper.created_by_id
        student_id = paper.created_by_id
        if student_id:
            student = db.query(User).filter(User.id == student_id).first()
            feedback = comment or 'No additional feedback.'
            notif_msg = f"Step {step.step_number} decision: {decision.upper()}. Feedback: {feedback}"
            create_notification(
                db,
                user_id=student_id,
                paper_id=paper.id,
                ntype="workflow_update",
                message=notif_msg,
            )
            _send_thesis_email(
                to_user=student,
                subject=f"[GIMPA Thesis] Step {step.step_number} {'Approved' if decision == 'approved' else 'Needs Revision'} — {paper.title}",
                body=(
                    f"Your supervisor has reviewed Step {step.step_number} of your thesis.\n\n"
                    f"Thesis Title: {paper.title}\n"
                    f"Step: {step.step_number} — {step.title}\n"
                    f"Decision: {decision.upper()}\n"
                    f"Feedback: {feedback}\n\n"
                    + ("Well done! You may proceed to the next step." if decision == "approved"
                       else "Please revise this step and resubmit.")
                ),
            )

    # Return updated PaperRead so frontend refreshes step statuses
    if thesis:
        return _to_thesis_dict(thesis, paper, db)
    if paper:
        from app.api.routes.papers import _to_paper_read
        return _to_paper_read(paper, db, current_user)
    return {"ok": True}


@router.post("/theses/steps/{step_id}/resubmit")
def resubmit_step(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    step = db.query(Step).filter(Step.id == step_id).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    thesis = db.query(Thesis).filter(Thesis.id == step.thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == step.thesis_id).first()

    student_id = thesis.student_id if thesis else paper.created_by_id if paper else None
    if student_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the student can resubmit this step")

    if step.status == "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot resubmit an approved step")

    step.status = "submitted"
    db.commit()

    supervisor_id = (thesis.supervisor_id if thesis else None) or (paper.supervisor_id if paper else None)
    topic_title = (thesis.topic_title if thesis else None) or (paper.title if paper else f"Thesis #{step.thesis_id}")
    if supervisor_id:
        sup = db.query(User).filter(User.id == supervisor_id).first()
        student_obj = db.query(User).filter(User.id == student_id).first() if student_id else None
        notif_msg = f"Step {step.step_number} re-submitted for thesis '{topic_title}'."
        create_notification(
            db,
            user_id=supervisor_id,
            paper_id=step.thesis_id,
            ntype="workflow_update",
            message=notif_msg,
        )
        _send_thesis_email(
            to_user=sup,
            subject=f"[GIMPA Thesis] Step {step.step_number} Re-submitted — {topic_title}",
            body=(
                f"The student has re-submitted Step {step.step_number} for review.\n\n"
                f"Student: {student_obj.full_name if student_obj else 'N/A'}\n"
                f"Thesis Title: {topic_title}\n"
                f"Step: {step.step_number} — {step.title}\n\n"
                "Please log in to review this step again."
            ),
        )

    if thesis:
        return _to_thesis_dict(thesis, paper, db)
    if paper:
        from app.api.routes.papers import _to_paper_read
        return _to_paper_read(paper, db, current_user)
    return {"ok": True}
@router.api_route("/theses/steps/{step_id}/file", methods=["GET", "HEAD"])
def download_step_file(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    step = db.query(Step).filter(Step.id == step_id).first()
    if not step or not step.file_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step file not found")

    path = Path(step.file_url)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step file not found on disk")

    thesis = db.query(Thesis).filter(Thesis.id == step.thesis_id).first()
    title = thesis.topic_title if thesis else f"Thesis_{step.thesis_id}"
    download_name = f"Step_{step.step_number}_{title}.docx"
    return FileResponse(
        path=path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=download_name,
    )


@router.post("/theses/{thesis_id}/finish-steps")
def finish_steps(
    thesis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()

    if not thesis and not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    # Paper-only path: delegate to complete_phase3 in papers router
    if not thesis and paper:
        if paper.supervisor_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned supervisor can complete steps")
        paper.status = "phase4_pending_examiners"
        paper.combined_thesis_supervisor_approved = True
        db.commit()
        db.refresh(paper)
        from app.api.routes.papers import _to_paper_read
        return _to_paper_read(paper, db, current_user)

    if thesis.supervisor_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned supervisor can complete steps")

    thesis.phase = 3  # Advances to Phase 3 (Examination)
    finalization = StepFinalization(thesis_id=thesis.id, finished_by_supervisor_id=current_user.id)
    db.add(finalization)

    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        paper.status = "phase4_pending_examiners"
        paper.combined_thesis_supervisor_approved = True

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="finish_steps", from_phase=2, to_phase=3)

    student = db.query(User).filter(User.id == thesis.student_id).first()

    # Notify HOD/Coordinator
    if thesis.department_id:
        dept = db.query(Department).filter(Department.id == thesis.department_id).first()
        if dept and dept.hod_user_id:
            hod_user = db.query(User).filter(User.id == dept.hod_user_id).first()
            notif_hod = f"Supervisor finished steps for thesis '{thesis.topic_title}'. Ready for examiner assignment."
            create_notification(
                db,
                user_id=dept.hod_user_id,
                paper_id=thesis.id,
                ntype="workflow_update",
                message=notif_hod,
            )
            _send_thesis_email(
                to_user=hod_user,
                subject=f"[GIMPA Thesis] Steps Complete — Examiner Assignment Required",
                body=(
                    f"The supervisor has marked all steps as complete for the following thesis.\n\n"
                    f"Student: {student.full_name if student else 'N/A'}\n"
                    f"Thesis Title: {thesis.topic_title}\n\n"
                    f"Please log in to the GIMPA Thesis Repository to assign internal and external examiners."
                ),
            )

    notif_student = "Supervisor has marked all steps as complete! Your thesis is now advancing to Phase 3 (Examination)."
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_student,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Steps Completed — Advancing to Phase 3",
        body=(
            f"Your supervisor has marked all thesis steps as complete. Your thesis is advancing to Phase 3 (Examination).\n\n"
            f"Thesis Title: {thesis.topic_title}\n\n"
            f"Examiners will be assigned shortly. You will be notified when they are."
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


# ==========================================
# Phase 3 — Examination, Examiner ZIP & Uploads
# ==========================================

@router.post("/theses/{thesis_id}/assign-examiners")
def assign_examiners(
    thesis_id: int,
    internal_examiner_id: int = Form(...),
    external_examiner_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "project_coordinator", "system_admin")),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    int_exam = db.query(User).filter(User.id == internal_examiner_id).first()
    ext_exam = db.query(User).filter(User.id == external_examiner_id).first()
    if not int_exam or not ext_exam:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Internal or External Examiner user not found")

    # Clear old assignments
    db.query(ExaminerAssignment).filter(ExaminerAssignment.thesis_id == thesis_id).delete()

    a1 = ExaminerAssignment(thesis_id=thesis_id, examiner_id=internal_examiner_id, examiner_type="internal")
    a2 = ExaminerAssignment(thesis_id=thesis_id, examiner_id=external_examiner_id, examiner_type="external")
    db.add(a1)
    db.add(a2)

    thesis.phase = 3
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        paper.internal_examiner_id = internal_examiner_id
        paper.external_examiner_id = external_examiner_id
        paper.status = "phase4_marking"

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="assign_examiners", from_phase=3, to_phase=3)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    create_notification(db, user_id=internal_examiner_id, paper_id=thesis.id, ntype="workflow_update", message=f"Assigned as Internal Examiner for thesis: '{thesis.topic_title}'.")
    _send_thesis_email(
        to_user=int_exam,
        subject=f"[GIMPA Thesis] Examiner Assignment — {thesis.topic_title}",
        body=(
            f"You have been assigned as an Internal Examiner for the following thesis.\n\n"
            f"Student: {student.full_name if student else 'N/A'}\n"
            f"Thesis Title: {thesis.topic_title}\n\n"
            f"Please log in to the GIMPA Thesis Repository to download the thesis bundle and upload your marks."
        ),
    )
    create_notification(db, user_id=external_examiner_id, paper_id=thesis.id, ntype="workflow_update", message=f"Assigned as External Examiner for thesis: '{thesis.topic_title}'.")
    _send_thesis_email(
        to_user=ext_exam,
        subject=f"[GIMPA Thesis] Examiner Assignment — {thesis.topic_title}",
        body=(
            f"You have been assigned as an External Examiner for the following thesis.\n\n"
            f"Student: {student.full_name if student else 'N/A'}\n"
            f"Thesis Title: {thesis.topic_title}\n\n"
            f"Please log in to the GIMPA Thesis Repository to download the thesis bundle and upload your marks."
        ),
    )
    create_notification(db, user_id=thesis.student_id, paper_id=thesis.id, ntype="workflow_update", message="Examiners have been assigned to your thesis.")
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Examiners Assigned — {thesis.topic_title}",
        body=(
            f"Internal and External Examiners have been assigned to your thesis.\n\n"
            f"Thesis Title: {thesis.topic_title}\n\n"
            f"Your thesis is currently under examination. You will be notified when examiner feedback is available."
        ),
    )

    return _to_thesis_dict(thesis, paper, db)


@router.get("/examiners/{examiner_id}/download-zip")
@router.get("/examiner-assignments/{assignment_id}/download-zip")
def download_examiner_zip(
    examiner_id: int | None = None,
    assignment_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_examiner_id = current_user.id
    if examiner_id:
        target_examiner_id = examiner_id
    elif assignment_id:
        assign = db.query(ExaminerAssignment).filter(ExaminerAssignment.id == assignment_id).first()
        if assign:
            target_examiner_id = assign.examiner_id

    # Find all theses assigned to this examiner
    assignments = db.query(ExaminerAssignment).filter(ExaminerAssignment.examiner_id == target_examiner_id).all()
    if not assignments and not current_user.is_admin:
        # Fallback check paper examiner IDs
        papers = db.query(Paper).filter(or_(Paper.internal_examiner_id == target_examiner_id, Paper.external_examiner_id == target_examiner_id)).all()
        thesis_ids = [p.id for p in papers]
    else:
        thesis_ids = [a.thesis_id for a in assignments]

    if not thesis_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No thesis assignments found for this examiner")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for tid in thesis_ids:
            t = db.query(Thesis).filter(Thesis.id == tid).first()
            p = db.query(Paper).filter(Paper.id == tid).first()
            student = t.student if t else None
            student_name = student.full_name or f"Student_{student.id}" if student else f"Thesis_{tid}"
            clean_name = "".join(c for c in student_name if c.isalnum() or c in (" ", "_", "-")).strip()

            # Latest file
            latest_file = None
            if p and p.file_path and Path(p.file_path).exists():
                latest_file = Path(p.file_path)
            else:
                steps = db.query(Step).filter(Step.thesis_id == tid).order_by(Step.created_at.desc()).all()
                for st in steps:
                    if st.file_url and Path(st.file_url).exists():
                        latest_file = Path(st.file_url)
                        break

            if latest_file and latest_file.exists():
                ext = latest_file.suffix or ".docx"
                zip_file.write(latest_file, arcname=f"{clean_name}_Thesis_{tid}{ext}")
            else:
                zip_file.writestr(f"{clean_name}_Thesis_{tid}.txt", f"Thesis Title: {t.topic_title if t else p.title}\nStatus: Under Review")

    zip_buffer.seek(0)
    filename = f"Examiner_Batch_{target_examiner_id}_{datetime.now().strftime('%Y%m%d')}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/examiner-assignments/{assignment_id}/upload-marks")
@router.post("/theses/{thesis_id}/upload-marks")
async def upload_examiner_marks(
    assignment_id: int | None = None,
    thesis_id: int | None = None,
    score: float | None = Form(None),
    comment: str | None = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = None
    if assignment_id:
        assignment = db.query(ExaminerAssignment).filter(ExaminerAssignment.id == assignment_id).first()
    elif thesis_id:
        assignment = db.query(ExaminerAssignment).filter(
            ExaminerAssignment.thesis_id == thesis_id,
            ExaminerAssignment.examiner_id == current_user.id
        ).first()

    target_thesis_id = assignment.thesis_id if assignment else thesis_id
    if not target_thesis_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis assignment not found")

    file_path = None
    if file:
        safe_name = f"{uuid4().hex}_{Path(file.filename or 'marks.xlsx').name}"
        dest = UPLOADS_DIR / safe_name
        content = await file.read()
        dest.write_bytes(content)
        file_path = str(dest)

    if assignment:
        upload = ExaminerUpload(
            examiner_assignment_id=assignment.id,
            excel_file_url=file_path or "marks_submitted",
            score=score,
            comment=comment,
        )
        db.add(upload)

    paper = db.query(Paper).filter(Paper.id == target_thesis_id).first()
    if paper:
        if assignment and assignment.examiner_type == "external":
            paper.external_score = score
            if file_path: paper.external_result_file_path = file_path
        else:
            paper.internal_score = score
            if file_path: paper.internal_result_file_path = file_path
        if comment:
            paper.examiner_corrections = (paper.examiner_corrections or "") + f"\n[{current_user.full_name or current_user.email}]: {comment}"

    db.commit()

    # Notify HOD
    thesis = db.query(Thesis).filter(Thesis.id == target_thesis_id).first()
    if thesis and thesis.department_id:
        dept = db.query(Department).filter(Department.id == thesis.department_id).first()
        if dept and dept.hod_user_id:
            hod_user = db.query(User).filter(User.id == dept.hod_user_id).first()
            notif_msg = f"Examiner {current_user.full_name or current_user.email} uploaded marks for thesis '{thesis.topic_title}'."
            create_notification(
                db,
                user_id=dept.hod_user_id,
                paper_id=target_thesis_id,
                ntype="workflow_update",
                message=notif_msg,
            )
            _send_thesis_email(
                to_user=hod_user,
                subject=f"[GIMPA Thesis] Examiner Marks Uploaded — {thesis.topic_title}",
                body=(
                    f"An examiner has uploaded marks for the following thesis.\n\n"
                    f"Examiner: {current_user.full_name or current_user.email}\n"
                    f"Thesis Title: {thesis.topic_title}\n"
                    f"Score: {score if score is not None else 'Not provided'}\n"
                    f"Comments: {comment or 'None'}\n\n"
                    f"Please log in to review all examiner results and compile feedback for the student."
                ),
            )

    return {"message": "Marks uploaded successfully"}


@router.post("/theses/{thesis_id}/compile-comments")
@router.post("/theses/{thesis_id}/send-comments-to-student")
def compile_and_send_comments(
    thesis_id: int,
    compiled_comment: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "project_coordinator", "system_admin")),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    hod_c = HodComment(
        thesis_id=thesis_id,
        compiled_comment=compiled_comment,
    )
    db.add(hod_c)

    thesis.phase = 4  # Advances to Phase 4 (Corrections & Dual Signoff)
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        paper.status = "phase5_corrections"
        paper.examiner_corrections = compiled_comment

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="send_comments_to_student", from_phase=3, to_phase=4)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    notif_msg = f"Examiner comments compiled by HOD! Please view and submit corrections. Feedback: {compiled_comment}"
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_msg,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Examiner Feedback Ready — Action Required",
        body=(
            f"The HOD has compiled examiner feedback for your thesis. You are required to submit corrections.\n\n"
            f"Thesis Title: {thesis.topic_title}\n\n"
            f"Examiner Feedback:\n{compiled_comment}\n\n"
            f"Please log in to the GIMPA Thesis Repository to review the feedback and upload your corrected thesis document."
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


# ==========================================
# Phase 4 — Corrections & Dual Approval Gate
# ==========================================

@router.post("/theses/{thesis_id}/corrections")
async def submit_correction(
    thesis_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    safe_name = f"{uuid4().hex}_{Path(file.filename or 'correction.docx').name}"
    dest = UPLOADS_DIR / safe_name
    content = await file.read()
    dest.write_bytes(content)

    existing_count = db.query(Correction).filter(Correction.thesis_id == thesis_id).count()
    correction = Correction(
        thesis_id=thesis_id,
        file_url=str(dest),
        version=existing_count + 1,
        supervisor_status="pending",
        hod_status="pending",
    )
    db.add(correction)

    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if paper:
        paper.status = "phase5_pending_supervisor"
        paper.file_path = str(dest)
        paper.file_name = file.filename

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="submit_correction", from_phase=4, to_phase=4)

    if thesis.supervisor_id:
        sup = db.query(User).filter(User.id == thesis.supervisor_id).first()
        student_obj = db.query(User).filter(User.id == thesis.student_id).first()
        notif_msg = f"Corrected thesis document version {correction.version} submitted. Please review."
        create_notification(
            db,
            user_id=thesis.supervisor_id,
            paper_id=thesis.id,
            ntype="workflow_update",
            message=notif_msg,
        )
        _send_thesis_email(
            to_user=sup,
            subject=f"[GIMPA Thesis] Corrected Thesis Submitted — {thesis.topic_title}",
            body=(
                f"The student has submitted a corrected version of their thesis for your review.\n\n"
                f"Student: {student_obj.full_name if student_obj else 'N/A'}\n"
                f"Thesis Title: {thesis.topic_title}\n"
                f"Correction Version: {correction.version}\n\n"
                f"Please log in to the GIMPA Thesis Repository to review this corrected document."
            ),
        )
    return _to_thesis_dict(thesis, paper, db)


@router.post("/corrections/{correction_id}/supervisor-decision")
@router.post("/theses/{thesis_id}/corrections/supervisor-decision")
def supervisor_correction_decision(
    correction_id: int | None = None,
    thesis_id: int | None = None,
    decision: str = Form(...),  # approved or revise
    comment: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    correction = None
    if correction_id:
        correction = db.query(Correction).filter(Correction.id == correction_id).first()
    elif thesis_id:
        correction = db.query(Correction).filter(Correction.thesis_id == thesis_id).order_by(Correction.version.desc()).first()

    if not correction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correction record not found")

    target_thesis_id = correction.thesis_id
    thesis = db.query(Thesis).filter(Thesis.id == target_thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    correction.supervisor_status = decision
    paper = db.query(Paper).filter(Paper.id == target_thesis_id).first()

    if decision == "approved":
        if paper:
            paper.lecturer_approved_by_id = current_user.id
            paper.lecturer_approved_at = datetime.now(timezone.utc)

        # Check Triple Approval Gate (Supervisor + Coordinator + HOD)
        coord_app = (getattr(correction, "coordinator_status", "pending") == "approved") or (paper and paper.project_coordinator_approved_at is not None)
        hod_app = (correction.hod_status == "approved") or (paper and paper.hod_approved_at is not None)
        if coord_app and hod_app:
            thesis.phase = 5
            if paper:
                paper.status = "phase5_approved_for_library"
        else:
            if paper:
                paper.status = "phase5_pending_hod_and_coordinator"
    else:
        if paper:
            paper.status = "phase5_corrections"
            paper.review_comments = comment

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action=f"supervisor_correction_{decision}", from_phase=4, to_phase=thesis.phase)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    notif_msg = f"Supervisor reviewed your corrections: {decision.upper()}."
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_msg,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Correction Review by Supervisor — {thesis.topic_title}",
        body=(
            f"Your supervisor has reviewed your corrected thesis submission.\n\n"
            f"Thesis Title: {thesis.topic_title}\n"
            f"Supervisor Decision: {decision.upper()}\n"
            + (f"Comments: {comment}\n" if comment else "")
            + ("\nYour corrections are awaiting further review by the Project Coordinator and HOD."
               if decision == "approved" else "\nPlease revise and resubmit your corrections.")
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


@router.post("/corrections/{correction_id}/coordinator-decision")
@router.post("/theses/{thesis_id}/corrections/coordinator-decision")
def coordinator_correction_decision(
    correction_id: int | None = None,
    thesis_id: int | None = None,
    decision: str = Form(...),  # approved or revise
    comment: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("project_coordinator", "hod", "system_admin")),
):
    correction = None
    if correction_id:
        correction = db.query(Correction).filter(Correction.id == correction_id).first()
    elif thesis_id:
        correction = db.query(Correction).filter(Correction.thesis_id == thesis_id).order_by(Correction.version.desc()).first()

    if not correction:
        paper = db.query(Paper).filter(Paper.id == (thesis_id or correction_id)).first()
        if paper:
            from app.api.routes.papers import coordinator_approve_corrections
            return coordinator_approve_corrections(paper_id=paper.id, decision=decision, comment=comment, db=db, current_user=current_user)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correction record not found")

    target_thesis_id = correction.thesis_id
    thesis = db.query(Thesis).filter(Thesis.id == target_thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    correction.coordinator_status = decision
    paper = db.query(Paper).filter(Paper.id == target_thesis_id).first()

    if decision == "approved":
        if paper:
            paper.project_coordinator_approved_by_id = current_user.id
            paper.project_coordinator_approved_at = datetime.now(timezone.utc)

        sup_app = (correction.supervisor_status == "approved") or (paper and paper.lecturer_approved_at is not None)
        hod_app = (correction.hod_status == "approved") or (paper and paper.hod_approved_at is not None)
        if sup_app and hod_app:
            thesis.phase = 5
            if paper:
                paper.status = "phase5_approved_for_library"
        else:
            if paper:
                paper.status = "phase5_pending_hod"
    else:
        if paper:
            paper.status = "phase5_corrections"
            paper.review_comments = comment

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action=f"coordinator_correction_{decision}", from_phase=4, to_phase=thesis.phase)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    notif_msg = f"Project Coordinator reviewed your corrections: {decision.upper()}."
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_msg,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Correction Review by Project Coordinator — {thesis.topic_title}",
        body=(
            f"The Project Coordinator has reviewed your corrected thesis submission.\n\n"
            f"Thesis Title: {thesis.topic_title}\n"
            f"Coordinator Decision: {decision.upper()}\n"
            + (f"Comments: {comment}\n" if comment else "")
            + ("\nYour corrections are awaiting the final HOD sign-off."
               if decision == "approved" else "\nPlease revise and resubmit your corrections.")
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


@router.post("/corrections/{correction_id}/hod-decision")
@router.post("/theses/{thesis_id}/corrections/hod-decision")
def hod_correction_decision(
    correction_id: int | None = None,
    thesis_id: int | None = None,
    decision: str = Form(...),  # approved or revise
    comment: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "system_admin")),
):
    correction = None
    if correction_id:
        correction = db.query(Correction).filter(Correction.id == correction_id).first()
    elif thesis_id:
        correction = db.query(Correction).filter(Correction.thesis_id == thesis_id).order_by(Correction.version.desc()).first()

    if not correction:
        paper = db.query(Paper).filter(Paper.id == (thesis_id or correction_id)).first()
        if paper:
            from app.api.routes.papers import hod_approve_corrections
            return hod_approve_corrections(paper_id=paper.id, decision=decision, comment=comment, db=db, current_user=current_user)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correction record not found")

    target_thesis_id = correction.thesis_id
    thesis = db.query(Thesis).filter(Thesis.id == target_thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    correction.hod_status = decision
    paper = db.query(Paper).filter(Paper.id == target_thesis_id).first()

    if decision == "approved":
        if paper:
            paper.hod_approved_by_id = current_user.id
            paper.hod_approved_at = datetime.now(timezone.utc)

        sup_app = (correction.supervisor_status == "approved") or (paper and paper.lecturer_approved_at is not None)
        coord_app = (getattr(correction, "coordinator_status", "pending") == "approved") or (paper and paper.project_coordinator_approved_at is not None)
        if sup_app and coord_app:
            thesis.phase = 5
            if paper:
                paper.status = "phase5_approved_for_library"
        else:
            if paper:
                paper.status = "phase5_pending_supervisor"
    else:
        if paper:
            paper.status = "phase5_corrections"
            paper.review_comments = comment

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action=f"hod_correction_{decision}", from_phase=4, to_phase=thesis.phase)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    notif_msg = f"HOD reviewed your corrections: {decision.upper()}."
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_msg,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] HOD Sign-off {'Approved' if decision == 'approved' else 'Returned'} — {thesis.topic_title}",
        body=(
            f"The Head of Department has reviewed your corrected thesis submission.\n\n"
            f"Thesis Title: {thesis.topic_title}\n"
            f"HOD Decision: {decision.upper()}\n"
            + (f"Comments: {comment}\n" if comment else "")
            + ("\nCongratulations! All three sign-offs are complete. Your thesis will now be submitted to the library for publication."
               if thesis.phase == 5 else "\nPlease revise and resubmit your corrections.")
        ),
    )

    if thesis.phase == 5:
        # Notify librarians (in-app + email)
        librarians = db.query(User).filter(or_(User.role == "librarian", User.role == "head_library")).all()
        for lib in librarians:
            lib_msg = f"Thesis '{thesis.topic_title}' has completed all 3 signoffs (Supervisor, Project Coordinator, HOD)! Ready for library publication."
            create_notification(
                db,
                user_id=lib.id,
                paper_id=thesis.id,
                ntype="workflow_update",
                message=lib_msg,
            )
            _send_thesis_email(
                to_user=lib,
                subject=f"[GIMPA Thesis] Ready for Publication — {thesis.topic_title}",
                body=(
                    f"A thesis has received all required approvals and is ready for library publication.\n\n"
                    f"Student: {student.full_name if student else 'N/A'}\n"
                    f"Thesis Title: {thesis.topic_title}\n\n"
                    f"Please log in to the GIMPA Thesis Repository to publish this thesis to the public catalog."
                ),
            )

    return _to_thesis_dict(thesis, paper, db)


# ==========================================
# Phase 5 — Library Publication & Repository
# ==========================================

@router.post("/theses/{thesis_id}/publish")
def publish_thesis(
    thesis_id: int,
    abstract: str | None = Form(None),
    is_public: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("librarian", "head_library", "system_admin")),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    thesis.phase = 5
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()

    pub = db.query(Publication).filter(Publication.thesis_id == thesis_id).first()
    if not pub:
        pub = Publication(
            thesis_id=thesis_id,
            published_by_librarian_id=current_user.id,
            public_file_url=paper.file_path if paper and paper.file_path else "published_thesis.pdf",
            abstract=abstract or thesis.topic_description,
            is_public=is_public,
        )
        db.add(pub)
    else:
        pub.is_public = is_public
        if abstract:
            pub.abstract = abstract

    if paper:
        paper.status = "phase5_published"
        paper.is_public = is_public
        if abstract:
            paper.abstract = abstract

    db.commit()
    _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="publish_thesis", from_phase=5, to_phase=5)

    student = db.query(User).filter(User.id == thesis.student_id).first()
    notif_msg = f"Congratulations! Your thesis '{thesis.topic_title}' has been published in the GIMPA Thesis Repository!"
    create_notification(
        db,
        user_id=thesis.student_id,
        paper_id=thesis.id,
        ntype="workflow_update",
        message=notif_msg,
    )
    _send_thesis_email(
        to_user=student,
        subject=f"[GIMPA Thesis] Published in Repository — {thesis.topic_title}",
        body=(
            f"Congratulations! Your thesis has been officially published in the GIMPA Thesis Repository.\n\n"
            f"Thesis Title: {thesis.topic_title}\n"
            f"Visibility: {'Public' if is_public else 'Restricted'}\n\n"
            f"Your work is now accessible in the institutional repository. Well done!"
        ),
    )
    return _to_thesis_dict(thesis, paper, db)


@router.get("/repository")
def get_public_repository(
    department: str | None = Query(None),
    year: int | None = Query(None),
    search: str | None = Query(None),
    supervisor: str | None = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
):
    query = db.query(Paper).filter(Paper.is_public == True, Paper.status == "phase5_published")

    if department:
        query = query.filter(func.lower(Paper.discipline) == department.strip().lower())
    if year:
        query = query.filter(Paper.year == year)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(or_(func.lower(Paper.title).like(s), func.lower(Paper.abstract).like(s)))

    papers = query.offset(skip).limit(limit).all()
    results = []
    for p in papers:
        t = db.query(Thesis).filter(Thesis.id == p.id).first()
        results.append(_to_thesis_dict(t, p, db) if t else {
            "id": p.id,
            "title": p.title,
            "abstract": p.abstract,
            "department_name": p.discipline,
            "year": p.year,
            "file_name": p.file_name,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {"total": len(results), "items": results}


@router.get("/repository/{thesis_id}")
def get_public_thesis(
    thesis_id: int,
    db: Session = Depends(get_db),
):
    paper = db.query(Paper).filter(Paper.id == thesis_id, Paper.is_public == True).first()
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not paper and not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found in public repository")

    if paper:
        paper.views += 1
        db.commit()

    return _to_thesis_dict(thesis or Thesis(id=thesis_id, topic_title=paper.title), paper, db)


# ==========================================
# Comments & Notifications Channel
# ==========================================

@router.get("/theses/{thesis_id}/comments")
def get_thesis_comments(
    thesis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comments = db.query(DocumentComment).filter(DocumentComment.thesis_id == thesis_id).order_by(DocumentComment.created_at.asc()).all()
    return [
        {
            "id": c.id,
            "thesis_id": c.thesis_id,
            "phase": c.phase,
            "author_id": c.author_id,
            "author_name": c.author.full_name or c.author.email if c.author else None,
            "comment_text": c.comment_text,
            "location": c.location,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in comments
    ]


@router.post("/theses/{thesis_id}/comments", status_code=status.HTTP_201_CREATED)
def add_thesis_comment(
    thesis_id: int,
    comment_text: str = Form(...),
    phase: int = Form(2),
    location: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = DocumentComment(
        thesis_id=thesis_id,
        phase=phase,
        author_id=current_user.id,
        comment_text=comment_text,
        location=location,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "thesis_id": comment.thesis_id,
        "author_id": comment.author_id,
        "author_name": current_user.full_name or current_user.email,
        "comment_text": comment.comment_text,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
    }


@router.delete("/theses/{thesis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_thesis(
    thesis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a thesis submission.
    - Students can delete their OWN thesis if it is in Phase 1 (pending review or rejected).
    - HOD, Project Coordinator, Dean, or System Admin can delete any thesis submission.
    """
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()

    if not thesis and not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis/Paper not found")

    student_id = thesis.student_id if thesis else (paper.created_by_id if paper else None)
    is_owner = current_user.id == student_id
    is_hod_or_coord_or_admin = (
        current_user.is_admin
        or has_role(db, current_user, "system_admin")
        or has_role(db, current_user, "hod")
        or has_role(db, current_user, "project_coordinator")
        or has_role(db, current_user, "dean")
    )

    if not is_owner and not is_hod_or_coord_or_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this thesis")

    if is_owner and not is_hod_or_coord_or_admin:
        current_status = paper.status if paper else "phase1_proposal_submitted"
        if not (current_status.startswith("phase1") or (thesis and thesis.topic_status in ["submitted", "rejected"])):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Once a topic or proposal has been approved and moved beyond Phase 1, it cannot be deleted by the student. Please contact your HOD."
            )

    tables_to_delete = [
        "audit_log", "document_comments", "publications", "corrections",
        "hod_comments", "examiner_uploads", "examiner_assignments",
        "step_finalization", "steps", "proposals", "paper_annotations",
        "paper_workflow_events", "paper_reviews", "paper_versions",
        "paper_authors", "paper_supervisors", "paper_tags", "notifications"
    ]
    for tbl in tables_to_delete:
        try:
            db.execute(text(f"DELETE FROM {tbl} WHERE paper_id = :pid OR thesis_id = :pid"), {"pid": thesis_id})
        except Exception:
            pass

    if thesis:
        db.delete(thesis)
    if paper:
        db.delete(paper)

    db.commit()
    return None


@router.delete("/theses/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_step(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a step submission.
    - Students can delete steps they uploaded if not yet approved.
    - Supervisor / HOD / Admin can delete steps.
    """
    step = db.query(Step).filter(Step.id == step_id).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    thesis = db.query(Thesis).filter(Thesis.id == step.thesis_id).first()
    is_owner = thesis and thesis.student_id == current_user.id
    is_supervisor_or_admin = (
        current_user.is_admin
        or has_role(db, current_user, "system_admin")
        or has_role(db, current_user, "hod")
        or (thesis and thesis.supervisor_id == current_user.id)
    )

    if not is_owner and not is_supervisor_or_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    if is_owner and not is_supervisor_or_admin and step.status == "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Approved steps cannot be deleted by student")

    db.delete(step)
    db.commit()
    return None


# -----------------------------------------------------------------------------
# Step OnlyOffice Collaborative Editing Integrations
# -----------------------------------------------------------------------------

def _build_step_editor_token(*, step_id: int, action: str, expires_in: int = 3600) -> str:
    exp = int(datetime.now(timezone.utc).timestamp()) + max(60, expires_in)
    payload = f"{step_id}:{action}:{exp}"
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}:{signature}"


def _verify_step_editor_token(*, token: str, step_id: int, action: str) -> bool:
    try:
        token_step_id, token_action, token_exp, token_sig = token.split(":", 3)
    except ValueError:
        return False
    if token_step_id != str(step_id) or token_action != action:
        return False
    try:
        exp = int(token_exp)
    except ValueError:
        return False
    now_ts = int(datetime.now(timezone.utc).timestamp())
    if exp < now_ts:
        return False
    raw_payload = f"{token_step_id}:{token_action}:{token_exp}"
    expected_sig = hmac.new(
        settings.secret_key.encode("utf-8"),
        raw_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(token_sig, expected_sig)


@router.api_route("/theses/steps/{step_id}/file/public", methods=["GET", "HEAD"])
def download_step_file_public(
    step_id: int,
    token: str = Query(..., min_length=20),
    db: Session = Depends(get_db),
):
    if not _verify_step_editor_token(token=token, step_id=step_id, action="file"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or expired file token")

    step = db.query(Step).filter(Step.id == step_id).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")
    if not step.file_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No file attached to this step")

    path = Path(step.file_url)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file not found")

    thesis = db.query(Thesis).filter(Thesis.id == step.thesis_id).first()
    title = thesis.topic_title if thesis else f"Thesis_{step.thesis_id}"
    download_name = f"Step_{step.step_number}_{title}.docx"

    return FileResponse(
        path=path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=download_name,
    )


@router.get("/theses/steps/{step_id}/editor-config")
def get_step_editor_config(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.onlyoffice_doc_server_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OnlyOffice is not configured")

    step = db.query(Step).filter(Step.id == step_id).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")
    if not step.file_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No file attached to this step")

    thesis = db.query(Thesis).filter(Thesis.id == step.thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == step.thesis_id).first() if not thesis else None
    
    # Access check: student, supervisor, and admins/reviewers
    allowed = False
    if current_user.is_admin:
        allowed = True
    elif thesis:
        if current_user.id in {thesis.student_id, thesis.supervisor_id}:
            allowed = True
    elif paper:
        if current_user.id in {paper.created_by_id, paper.supervisor_id}:
            allowed = True
            
    # HOD, coordinator, librarian can view as well
    if not allowed:
        if has_role(db, current_user, "hod") or has_role(db, current_user, "project_coordinator") or has_role(db, current_user, "librarian"):
            allowed = True
            
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this document")

    file_token = urllib.parse.quote(_build_step_editor_token(step_id=step.id, action="file"), safe="")
    callback_token = urllib.parse.quote(_build_step_editor_token(step_id=step.id, action="callback"), safe="")
    callback_base = (settings.onlyoffice_callback_base_url or settings.public_api_base_url).rstrip("/")
    
    file_url = f"{callback_base}{settings.api_prefix}/theses/steps/{step.id}/file/public?token={file_token}"
    callback_url = f"{callback_base}{settings.api_prefix}/theses/steps/{step.id}/editor-callback?token={callback_token}"
    
    path = Path(step.file_url)
    file_name = path.name
    file_ext = (path.suffix or "").lstrip(".").lower()
    
    file_size = path.stat().st_size if path.exists() else 0
    session_key = f"step-{step.id}-{file_size}-{int(datetime.now(timezone.utc).timestamp())}"

    config = {
        "documentType": "word",
        "type": "desktop",
        "document": {
            "title": file_name,
            "url": file_url,
            "fileType": file_ext or "docx",
            "key": session_key,
        },
        "editorConfig": {
            "callbackUrl": callback_url,
            "mode": "edit",
            "lang": "en",
            "user": {
                "id": str(current_user.id),
                "name": current_user.full_name or current_user.email,
            },
        },
    }
    return {
        "document_server_url": settings.onlyoffice_doc_server_url.rstrip("/"),
        "config": config,
    }


@router.post("/theses/steps/{step_id}/editor-callback")
async def handle_step_editor_callback(
    step_id: int,
    token: str = Query(..., min_length=20),
    payload: dict | None = None,
    db: Session = Depends(get_db),
):
    if not _verify_step_editor_token(token=token, step_id=step_id, action="callback"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or expired callback token")

    step = db.query(Step).filter(Step.id == step_id).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")
    if not step.file_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No file attached to this step")

    data = payload or {}
    status_code = int(data.get("status", 0) or 0)
    download_url = data.get("url")
    if status_code in {2, 6} and isinstance(download_url, str) and download_url.strip():
        target = Path(step.file_url)
        try:
            with urllib.request.urlopen(download_url, timeout=30) as response:
                content = response.read()
            if not content:
                return {"error": 1}
            target.write_bytes(content)
            db.commit()
        except Exception:
            return {"error": 1}
    return {"error": 0}


# ==========================================
# Phase 3 & 4 — Bulk Examiner Assignment & In-System Evaluation
# ==========================================

@router.post("/theses/examiners/bulk-assign", response_model=BulkAssignSummary)
async def bulk_assign_examiners(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "project_coordinator", "system_admin")),
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")

    raw_bytes = await file.read()
    try:
        rows = load_rows_from_upload(file.filename, raw_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file contains no rows")

    summary = BulkAssignSummary(total_processed=len(rows))

    def _resolve_user(identifier: str) -> User | None:
        identifier_clean = identifier.strip()
        if not identifier_clean:
            return None
        if identifier_clean.isdigit():
            u = db.query(User).filter(User.id == int(identifier_clean)).first()
            if u:
                return u
        u = db.query(User).filter(func.lower(User.school_id) == identifier_clean.lower()).first()
        if u:
            return u
        u = db.query(User).filter(func.lower(User.email) == identifier_clean.lower()).first()
        return u

    def _map_col(row_dict: dict[str, str], candidates: list[str]) -> str:
        norm = {"".join(c for c in k.strip().lower() if c.isalnum()): v for k, v in row_dict.items()}
        for cand in candidates:
            cand_norm = "".join(c for c in cand.strip().lower() if c.isalnum())
            if cand_norm in norm and norm[cand_norm].strip():
                return norm[cand_norm].strip()
        return ""

    for idx, row in enumerate(rows, start=1):
        student_val = _map_col(row, ["student_id", "student id", "thesis_id", "thesis id", "student_email", "email"])
        int_val = _map_col(row, ["internal_examiner_id", "internal examiner id", "internal_examiner", "internal_examiner_email"])
        ext_val = _map_col(row, ["external_examiner_id", "external examiner id", "external_examiner", "external_examiner_email"])

        if not student_val or not int_val or not ext_val:
            summary.failed += 1
            summary.errors.append(f"Row {idx}: Missing student_id, internal_examiner_id, or external_examiner_id")
            continue

        thesis = None
        if student_val.isdigit():
            thesis = db.query(Thesis).filter(Thesis.id == int(student_val)).first()

        if not thesis:
            stu_user = _resolve_user(student_val)
            if stu_user:
                thesis = db.query(Thesis).filter(Thesis.student_id == stu_user.id).order_by(Thesis.created_at.desc()).first()

        if not thesis:
            summary.failed += 1
            summary.errors.append(f"Row {idx}: Thesis or Student '{student_val}' not found")
            continue

        int_user = _resolve_user(int_val)
        if not int_user:
            summary.failed += 1
            summary.errors.append(f"Row {idx}: Internal Examiner '{int_val}' not found")
            continue

        ext_user = _resolve_user(ext_val)
        if not ext_user:
            summary.failed += 1
            summary.errors.append(f"Row {idx}: External Examiner '{ext_val}' not found")
            continue

        if int_user.id == ext_user.id:
            summary.failed += 1
            summary.errors.append(f"Row {idx}: Internal and External examiners must be different users ({int_user.email})")
            continue

        db.query(ExaminerAssignment).filter(ExaminerAssignment.thesis_id == thesis.id).delete()
        a1 = ExaminerAssignment(thesis_id=thesis.id, examiner_id=int_user.id, examiner_type="internal")
        a2 = ExaminerAssignment(thesis_id=thesis.id, examiner_id=ext_user.id, examiner_type="external")
        db.add(a1)
        db.add(a2)

        thesis.phase = 3
        paper = db.query(Paper).filter(Paper.id == thesis.id).first()
        if paper:
            paper.internal_examiner_id = int_user.id
            paper.external_examiner_id = ext_user.id
            paper.status = "phase4_marking"

        db.commit()
        _record_audit_log(db, thesis_id=thesis.id, actor_id=current_user.id, action="bulk_assign_examiners", from_phase=thesis.phase, to_phase=3)

        student_user = db.query(User).filter(User.id == thesis.student_id).first()

        create_notification(db, user_id=int_user.id, paper_id=thesis.id, ntype="workflow_update", message=f"Assigned as Internal Examiner for thesis: '{thesis.topic_title}'.")
        _send_thesis_email(
            to_user=int_user,
            subject=f"[GIMPA Thesis] Examiner Assignment — {thesis.topic_title}",
            body=(
                f"You have been assigned as an Internal Examiner for the following thesis.\n\n"
                f"Student: {student_user.full_name if student_user else 'N/A'}\n"
                f"Thesis Title: {thesis.topic_title}\n\n"
                f"Please log in to the GIMPA Thesis Repository to view and evaluate the thesis draft."
            ),
        )

        create_notification(db, user_id=ext_user.id, paper_id=thesis.id, ntype="workflow_update", message=f"Assigned as External Examiner for thesis: '{thesis.topic_title}'.")
        _send_thesis_email(
            to_user=ext_user,
            subject=f"[GIMPA Thesis] Examiner Assignment — {thesis.topic_title}",
            body=(
                f"You have been assigned as an External Examiner for the following thesis.\n\n"
                f"Student: {student_user.full_name if student_user else 'N/A'}\n"
                f"Thesis Title: {thesis.topic_title}\n\n"
                f"Please log in to the GIMPA Thesis Repository to view and evaluate the thesis draft."
            ),
        )

        create_notification(db, user_id=thesis.student_id, paper_id=thesis.id, ntype="workflow_update", message="Examiners have been assigned to your thesis.")
        _send_thesis_email(
            to_user=student_user,
            subject=f"[GIMPA Thesis] Examiners Assigned — {thesis.topic_title}",
            body=(
                f"Internal and External Examiners have been assigned to your thesis.\n\n"
                f"Thesis Title: {thesis.topic_title}\n\n"
                f"Your thesis is currently under examination. You will be notified when examiner feedback is available."
            ),
        )

        summary.successful += 1

    return summary


@router.get("/theses/examiners/bulk-assign-template")
def download_bulk_assign_template():
    content = "Student_ID,Internal_Examiner_ID,External_Examiner_ID\n10928341,20491823,20491824\n"
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="Download_Examiner_Mapping_Template.csv"'},
    )


@router.get("/theses/{thesis_id}/feedback", response_model=StudentFeedbackResponse)
def get_student_feedback(
    thesis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if not thesis and not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    student_id = thesis.student_id if thesis else paper.created_by_id if paper else None
    supervisor_id = thesis.supervisor_id if thesis else paper.supervisor_id if paper else None

    is_admin_like = current_user.is_admin or has_role(db, current_user, "hod") or has_role(db, current_user, "project_coordinator") or has_role(db, current_user, "dean")
    if current_user.id not in {student_id, supervisor_id} and not is_admin_like:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    topic_title = thesis.topic_title if thesis else paper.title if paper else "Thesis"
    current_status = thesis.topic_status if thesis else paper.status if paper else "pending"

    latest_hod_comment = db.query(HodComment).filter(HodComment.thesis_id == thesis_id).order_by(HodComment.sent_to_student_at.desc()).first()
    compiled = latest_hod_comment.compiled_comment if latest_hod_comment else (paper.examiner_corrections if paper else None)

    exam_results = db.query(ExaminationResult).filter(ExaminationResult.thesis_id == thesis_id).all()
    qual_list = []
    overall_rec = None
    for res in exam_results:
        if res.is_submitted:
            qual_list.append(
                ExaminerQualitativeFeedback(
                    examiner_type=res.examiner_type,
                    general_comments=res.general_comments,
                    recommendation=res.recommendation,
                    submitted_at=res.submitted_at.isoformat() if res.submitted_at else None,
                )
            )
            if res.recommendation and not overall_rec:
                overall_rec = res.recommendation

    revision_str = overall_rec or ("Pending Revision" if current_status == "phase5_corrections" else "Under Review")

    file_path = paper.file_path if paper else None
    file_name = paper.file_name if paper else None

    return StudentFeedbackResponse(
        thesis_id=thesis_id,
        topic_title=topic_title,
        status=current_status,
        revision_status=revision_str,
        compiled_comments=compiled,
        qualitative_feedback=qual_list,
        file_path=file_path,
        file_name=file_name,
    )


@router.get("/theses/{thesis_id}/examination-marks", response_model=AdminMarkSheetResponse)
def get_examination_marks(
    thesis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role("hod", "project_coordinator", "dean", "system_admin")),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if not thesis and not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    topic_title = thesis.topic_title if thesis else paper.title if paper else "Thesis"
    current_status = thesis.topic_status if thesis else paper.status if paper else "pending"

    student_user = db.query(User).filter(User.id == thesis.student_id).first() if thesis and thesis.student_id else None
    degree_level = classify_degree_level(thesis=thesis, paper=paper, student_user=student_user, db=db)

    exam_results = db.query(ExaminationResult).filter(ExaminationResult.thesis_id == thesis_id).all()
    results_list = []
    recommendations = []
    raw_examiner_items = []

    for res in exam_results:
        exam_user = db.query(User).filter(User.id == res.examiner_id).first()
        raw_examiner_items.append({
            "score": res.score,
            "examiner_type": res.examiner_type,
        })
        if res.recommendation:
            recommendations.append(res.recommendation)

        results_list.append(
            ExaminerMarkDetail(
                id=res.id,
                examiner_id=res.examiner_id,
                examiner_name=exam_user.full_name or exam_user.email if exam_user else None,
                examiner_type=res.examiner_type,
                score=res.score,
                recommendation=res.recommendation,
                general_comments=res.general_comments,
                annotated_file_path=res.annotated_file_path,
                is_submitted=res.is_submitted,
                submitted_at=res.submitted_at.isoformat() if res.submitted_at else None,
            )
        )

    # Fallback to paper scores if no ExaminationResult objects exist yet
    if not raw_examiner_items and paper:
        if paper.internal_score is not None:
            raw_examiner_items.append({"score": paper.internal_score, "examiner_type": "internal"})
        if paper.external_score is not None:
            raw_examiner_items.append({"score": paper.external_score, "examiner_type": "external"})

    score_calc = calculate_thesis_examination_score(degree_level, raw_examiner_items)
    final_rec = recommendations[0] if recommendations else None

    return AdminMarkSheetResponse(
        thesis_id=thesis_id,
        topic_title=topic_title,
        status=current_status,
        degree_level=score_calc["degree_level"],
        requires_third_examiner=score_calc["requires_third_examiner"],
        score_difference=score_calc["score_difference"],
        internal_score=score_calc["internal_score"],
        external_score=score_calc["external_score"],
        third_examiner_score=score_calc["third_examiner_score"],
        average_score=score_calc["average_score"],
        calculation_note=score_calc["calculation_note"],
        final_recommendation=final_rec,
        examiner_results=results_list,
    )


@router.post("/theses/{thesis_id}/examination-marks")
def submit_examination_marks(
    thesis_id: int,
    score: float | None = Form(None),
    recommendation: str | None = Form(None),
    general_comments: str | None = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    paper = db.query(Paper).filter(Paper.id == thesis_id).first()
    if not thesis and not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    assignment = db.query(ExaminerAssignment).filter(
        ExaminerAssignment.thesis_id == thesis_id,
        ExaminerAssignment.examiner_id == current_user.id
    ).first()

    is_admin = current_user.is_admin or has_role(db, current_user, "hod") or has_role(db, current_user, "project_coordinator")
    if not assignment and not is_admin:
        if paper and (paper.internal_examiner_id == current_user.id or paper.external_examiner_id == current_user.id):
            examiner_type = "internal" if paper.internal_examiner_id == current_user.id else "external"
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned examiners can submit marks")
    else:
        examiner_type = assignment.examiner_type if assignment else "internal"

    annotated_path = None
    if file:
        safe_name = f"{uuid4().hex}_{Path(file.filename or 'annotated.docx').name}"
        dest = UPLOADS_DIR / safe_name
        content = file.file.read()
        dest.write_bytes(content)
        annotated_path = str(dest)

    exam_res = db.query(ExaminationResult).filter(
        ExaminationResult.thesis_id == thesis_id,
        ExaminationResult.examiner_id == current_user.id
    ).first()

    if not exam_res:
        exam_res = ExaminationResult(
            thesis_id=thesis_id,
            examiner_id=current_user.id,
            examiner_type=examiner_type,
        )
        db.add(exam_res)

    exam_res.score = score
    exam_res.recommendation = recommendation
    exam_res.general_comments = general_comments
    if annotated_path:
        exam_res.annotated_file_path = annotated_path
    exam_res.is_submitted = True
    exam_res.submitted_at = datetime.now(timezone.utc)

    if paper:
        if examiner_type == "external":
            paper.external_score = score
            if annotated_path: paper.external_result_file_path = annotated_path
        else:
            paper.internal_score = score
            if annotated_path: paper.internal_result_file_path = annotated_path
        if general_comments:
            paper.examiner_corrections = (paper.examiner_corrections or "") + f"\n[{current_user.full_name or current_user.email}]: {general_comments}"

    db.commit()

    topic_title = thesis.topic_title if thesis else paper.title if paper else "Thesis"
    target_dept_id = thesis.department_id if thesis else paper.department_id if paper else None
    if target_dept_id:
        dept = db.query(Department).filter(Department.id == target_dept_id).first()
        if dept and dept.hod_user_id:
            hod_user = db.query(User).filter(User.id == dept.hod_user_id).first()
            notif_msg = f"Examiner {current_user.full_name or current_user.email} submitted in-system evaluation for '{topic_title}'."
            create_notification(
                db,
                user_id=dept.hod_user_id,
                paper_id=thesis_id,
                ntype="workflow_update",
                message=notif_msg,
            )
            _send_thesis_email(
                to_user=hod_user,
                subject=f"[GIMPA Thesis] Examination Submitted — {topic_title}",
                body=(
                    f"An examiner has submitted their evaluation for the following thesis.\n\n"
                    f"Examiner: {current_user.full_name or current_user.email}\n"
                    f"Thesis Title: {topic_title}\n"
                    f"Recommendation: {recommendation or 'N/A'}\n\n"
                    f"Please log in to review all examiner scores and qualitative feedback."
                ),
            )

    return {"message": "Examination marks submitted successfully", "thesis_id": thesis_id}



