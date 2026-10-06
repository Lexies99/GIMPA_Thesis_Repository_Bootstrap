from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.paper import Paper, PaperAnnotation
from app.models.thesis_system import (
    Thesis, Proposal, Step, Correction, DocumentComment, ExaminationResult
)
from app.models.user import User

def get_supervisor_comments_report(
    db: Session,
    supervisor_id: Optional[int] = None,
    department_id: Optional[int] = None,
    school: Optional[str] = None,
    student_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 500,
) -> Dict[str, Any]:
    """
    Collects and indexes all qualitative comments, chapter reviews, and feedback notes
    made by academic supervisors and examiners across the institution.
    """
    entries = []

    # 1. Proposal Comments
    p_query = db.query(Proposal).join(Thesis, Proposal.thesis_id == Thesis.id)
    if supervisor_id:
        p_query = p_query.filter(Thesis.supervisor_id == supervisor_id)
    if student_id:
        p_query = p_query.filter(Thesis.student_id == student_id)
    
    for p in p_query.limit(200).all():
        if p.supervisor_comment and p.supervisor_comment.strip():
            th = p.thesis
            sup = th.supervisor if th else None
            student = th.student if th else None
            entries.append({
                "id": f"prop-{p.id}",
                "thesis_id": p.thesis_id,
                "thesis_title": th.topic_title if th else "Thesis Project",
                "phase_label": f"Phase 2 — Proposal (v{p.version})",
                "supervisor_id": sup.id if sup else None,
                "supervisor_name": sup.full_name if sup else "Assigned Supervisor",
                "supervisor_email": sup.email if sup else None,
                "student_id": student.id if student else None,
                "student_name": student.full_name if student else "Student Author",
                "department": th.department.name if (th and th.department) else "Computer Science and Information Systems",
                "comment_text": p.supervisor_comment.strip(),
                "decision_status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "source_type": "Proposal Review",
            })

    # 2. Step / Chapter Submissions Comments
    s_query = db.query(Step).join(Thesis, Step.thesis_id == Thesis.id)
    if supervisor_id:
        s_query = s_query.filter(Thesis.supervisor_id == supervisor_id)
    if student_id:
        s_query = s_query.filter(Thesis.student_id == student_id)
    
    for st in s_query.limit(300).all():
        if st.supervisor_comment and st.supervisor_comment.strip():
            th = st.thesis
            sup = th.supervisor if th else None
            student = th.student if th else None
            entries.append({
                "id": f"step-{st.id}",
                "thesis_id": st.thesis_id,
                "thesis_title": th.topic_title if th else "Thesis Project",
                "phase_label": f"Phase 2 — Chapter {st.step_number} ({st.title or 'Draft'})",
                "supervisor_id": sup.id if sup else None,
                "supervisor_name": sup.full_name if sup else "Assigned Supervisor",
                "supervisor_email": sup.email if sup else None,
                "student_id": student.id if student else None,
                "student_name": student.full_name if student else "Student Author",
                "department": th.department.name if (th and th.department) else "Computer Science and Information Systems",
                "comment_text": st.supervisor_comment.strip(),
                "decision_status": st.status,
                "created_at": st.created_at.isoformat() if st.created_at else None,
                "source_type": "Chapter / Step Review",
            })

    # 3. Document Inline Comments
    d_query = db.query(DocumentComment).join(Thesis, DocumentComment.thesis_id == Thesis.id)
    if supervisor_id:
        d_query = d_query.filter(DocumentComment.author_id == supervisor_id)
    if student_id:
        d_query = d_query.filter(Thesis.student_id == student_id)

    for dc in d_query.limit(200).all():
        if dc.comment_text and dc.comment_text.strip():
            th = dc.thesis
            author = dc.author
            student = th.student if th else None
            entries.append({
                "id": f"doc-{dc.id}",
                "thesis_id": dc.thesis_id,
                "thesis_title": th.topic_title if th else "Thesis Project",
                "phase_label": f"Phase {dc.phase} — Inline Manuscript Note",
                "supervisor_id": author.id if author else None,
                "supervisor_name": author.full_name if author else "Reviewer",
                "supervisor_email": author.email if author else None,
                "student_id": student.id if student else None,
                "student_name": student.full_name if student else "Student Author",
                "department": th.department.name if (th and th.department) else "Computer Science and Information Systems",
                "comment_text": dc.comment_text.strip(),
                "decision_status": "Feedback Note",
                "created_at": dc.created_at.isoformat() if dc.created_at else None,
                "source_type": "Document Inline Annotation",
            })

    # 4. Paper Level Review Comments & Annotations
    paper_query = db.query(Paper)
    if supervisor_id:
        paper_query = paper_query.filter(Paper.supervisor_id == supervisor_id)
    for pa in paper_query.limit(100).all():
        if pa.review_comments and pa.review_comments.strip():
            sup = pa.supervisor
            student = pa.created_by
            entries.append({
                "id": f"paper-{pa.id}",
                "thesis_id": pa.id,
                "thesis_title": pa.title,
                "phase_label": "Supervision & Approval Review",
                "supervisor_id": sup.id if sup else None,
                "supervisor_name": sup.full_name if sup else (pa.reviewed_by.full_name if pa.reviewed_by else "Supervisor"),
                "supervisor_email": sup.email if sup else None,
                "student_id": student.id if student else None,
                "student_name": pa.authors[0].name if pa.authors else (student.full_name if student else "Student Author"),
                "department": pa.discipline or "Computer Science and Information Systems",
                "comment_text": pa.review_comments.strip(),
                "decision_status": pa.status,
                "created_at": pa.reviewed_at.isoformat() if pa.reviewed_at else (pa.created_at.isoformat() if pa.created_at else None),
                "source_type": "Executive Supervision Note",
            })

    # Apply text search filter if provided
    if search and search.strip():
        q = search.strip().lower()
        entries = [
            e for e in entries
            if q in e["comment_text"].lower() or q in e["supervisor_name"].lower() or q in e["student_name"].lower() or q in e["thesis_title"].lower()
        ]

    # Sort newest first
    sorted_entries = sorted(entries, key=lambda x: (x["created_at"] or ""), reverse=True)[:limit]

    # Unique supervisors summary
    supervisors_summary = {}
    for e in entries:
        s_id = e["supervisor_id"]
        s_name = e["supervisor_name"]
        if s_id and s_name:
            if s_id not in supervisors_summary:
                supervisors_summary[s_id] = {
                    "supervisor_id": s_id,
                    "name": s_name,
                    "email": e["supervisor_email"],
                    "total_comments": 0,
                    "active_advisees_reviewed": set(),
                }
            supervisors_summary[s_id]["total_comments"] += 1
            if e["student_id"]:
                supervisors_summary[s_id]["active_advisees_reviewed"].add(e["student_id"])

    formatted_summary = [
        {
            "supervisor_id": k,
            "name": v["name"],
            "email": v["email"],
            "total_comments": v["total_comments"],
            "advisees_count": len(v["active_advisees_reviewed"]),
        }
        for k, v in supervisors_summary.items()
    ]

    return {
        "total_comments": len(sorted_entries),
        "entries": sorted_entries,
        "supervisors_summary": sorted(formatted_summary, key=lambda x: -x["total_comments"]),
    }
