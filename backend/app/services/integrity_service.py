from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.paper import Paper
from app.models.thesis_system import Thesis, Step, Correction
from app.models.user import User
from app.services.email_service import send_notification_email
from app.services.notification_service import create_notification

def normalize_title(title: str) -> str:
    """Normalize title for strict and fuzzy duplication checking."""
    if not title:
        return ""
    # Remove punctuations, extra spaces, and lowercase
    cleaned = re.sub(r'[^\w\s]', '', title.lower()).strip()
    return " ".join(cleaned.split())

def check_duplicate_topic(db: Session, title: str, exclude_paper_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Checks if an identical or near-duplicate topic already exists in the system.
    Returns duplication flag, match details, and explanatory message.
    """
    if not title or not title.strip():
        return {"is_duplicate": False, "matched_title": None, "similarity_pct": 0.0, "message": "Valid topic title"}

    norm_target = normalize_title(title)
    target_words = set(norm_target.split())

    query = db.query(Paper)
    if exclude_paper_id:
        query = query.filter(Paper.id != exclude_paper_id)

    all_papers = query.all()

    for p in all_papers:
        if not p.title:
            continue
        norm_existing = normalize_title(p.title)
        
        # 1. Exact normalized match
        if norm_target == norm_existing:
            return {
                "is_duplicate": True,
                "matched_title": p.title,
                "similarity_pct": 100.0,
                "message": f"This exact topic title is already registered by student author '{p.authors[0].name if p.authors else 'another student'}' (Paper #{p.id}). Please choose a distinct title.",
            }

        # 2. High token overlap check (> 85% overlap)
        existing_words = set(norm_existing.split())
        if target_words and existing_words:
            intersection = len(target_words.intersection(existing_words))
            union = len(target_words.union(existing_words))
            jaccard = intersection / union if union > 0 else 0.0

            if jaccard >= 0.80 and len(target_words) >= 4:
                return {
                    "is_duplicate": True,
                    "matched_title": p.title,
                    "similarity_pct": round(jaccard * 100, 1),
                    "message": f"This topic title is substantially identical ({round(jaccard * 100)}% match) to an existing registered thesis: '{p.title}'. Please differentiate your research topic.",
                }

    return {
        "is_duplicate": False,
        "matched_title": None,
        "similarity_pct": 0.0,
        "message": "Topic title is unique and available for registration.",
    }

def get_overdue_reviews_list(db: Session, threshold_days: int = 5) -> List[Dict[str, Any]]:
    """
    Finds all submissions where a supervisor review has been pending for >= 5 days.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=threshold_days)

    pending_statuses = {
        "pending", "pending_lecturer", "phase1_proposal_submitted",
        "phase2_proposal_submitted", "phase2_pending_supervisor",
        "phase3_chapters", "phase3_steps_in_progress",
        "phase5_corrections", "phase5_pending_supervisor"
    }

    papers = db.query(Paper).filter(Paper.status.in_(pending_statuses)).all()

    overdue_items = []
    for p in papers:
        created_dt = p.created_at
        if not created_dt:
            continue
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)

        days_pending = (now - created_dt).days
        hours_pending = int((now - created_dt).total_seconds() // 3600)

        is_overdue = days_pending >= threshold_days

        supervisor = p.supervisor
        student = p.created_by
        student_name = p.authors[0].name if p.authors else (student.full_name if student else "Student")

        overdue_items.append({
            "paper_id": p.id,
            "title": p.title,
            "status": p.status,
            "discipline": p.discipline or (student.department if student else "N/A"),
            "student_name": student_name,
            "student_email": student.email if student else None,
            "supervisor_id": supervisor.id if supervisor else None,
            "supervisor_name": supervisor.full_name if supervisor else "Unassigned",
            "supervisor_email": supervisor.email if supervisor else None,
            "submitted_at": created_dt.isoformat(),
            "days_pending": days_pending,
            "hours_pending": hours_pending,
            "is_overdue": is_overdue,
            "alert_sent_at": p.lecturer_overdue_alert_sent_at.isoformat() if p.lecturer_overdue_alert_sent_at else None,
        })

    return sorted(overdue_items, key=lambda x: (-x["days_pending"], x["paper_id"]))

def dispatch_5day_overdue_alerts(db: Session) -> Dict[str, Any]:
    """
    Scans for 5-day overdue supervisor reviews and dispatches escalations to Supervisor, HOD, Dean, and Deputy Rector.
    """
    from app.models.notification import Notification

    overdue_items = [item for item in get_overdue_reviews_list(db, threshold_days=5) if item["is_overdue"]]
    now = datetime.now(timezone.utc)

    # Pre-fetch leadership recipients once outside loop
    hod_users = db.query(User).filter(User.role == "hod").all()
    dean_users = db.query(User).filter(User.role == "dean").all()

    dispatched_count = 0
    notifications_to_add = []

    for item in overdue_items:
        paper = db.query(Paper).filter(Paper.id == item["paper_id"]).first()
        if not paper:
            continue

        # Prevent sending more than once every 24 hours
        if paper.lecturer_overdue_alert_sent_at:
            last_alert = paper.lecturer_overdue_alert_sent_at
            if last_alert.tzinfo is None:
                last_alert = last_alert.replace(tzinfo=timezone.utc)
            if (now - last_alert).total_seconds() < 86400:
                continue

        alert_msg = (
            f"URGENT REVIEW OVERDUE (5+ Days): Student submission '{paper.title}' (#{paper.id}) "
            f"has been waiting {item['days_pending']} days for supervisor review ({item['supervisor_name']})."
        )

        # Notify supervisor
        if paper.supervisor_id:
            notifications_to_add.append(
                Notification(user_id=paper.supervisor_id, paper_id=paper.id, type="overdue_review", message=alert_msg, is_read=False)
            )

        # Notify HODs
        for h in hod_users:
            notifications_to_add.append(
                Notification(user_id=h.id, paper_id=paper.id, type="overdue_escalation", message=alert_msg, is_read=False)
            )

        # Notify Deans
        for d in dean_users:
            notifications_to_add.append(
                Notification(user_id=d.id, paper_id=paper.id, type="overdue_escalation", message=alert_msg, is_read=False)
            )

        paper.lecturer_overdue_alert_sent_at = now
        dispatched_count += 1

    if notifications_to_add:
        db.add_all(notifications_to_add)
    db.commit()

    return {
        "overdue_count": len(overdue_items),
        "dispatched_count": dispatched_count,
        "timestamp": now.isoformat(),
    }

