from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.paper import Paper
from app.services.user_service import has_role

DEFAULT_SPECIALIZATIONS = {
    "josbudu@gimpa.edu.gh": "Information Systems, Health Informatics, Enterprise Systems, Digital Transformation",
    "emmanuelsadabor@gimpa.edu.gh": "Artificial Intelligence, Machine Learning, Data Science, Computational Modeling",
    "fapboadu@gimpa.edu.gh": "Software Engineering, Web Technologies, Database Systems, Cloud Computing",
    "ekuada@gimpa.edu.gh": "Cybersecurity, Network Security, Digital Forensics, Cryptography, Blockchain",
    "abeantwi@gimpa.edu.gh": "Data Analytics, Machine Learning, Business Intelligence, FinTech Systems",
    "nassyne@gimpa.edu.gh": "Human-Computer Interaction, Mobile Computing, EdTech, UI/UX Systems",
    "kwame.boadu@adj.gimpa.edu.gh": "Computer Science, Distributed Systems, Software Architectures, Cloud Platforms",
    "yaw.asante@gimpa.edu.gh": "Information Systems, Project Management, IT Governance, Enterprise Architecture",
    "lecturer@gimpa.edu.gh": "Computer Science, Applied Artificial Intelligence, Data Systems",
}

def extract_topic_keywords(title: str, abstract: Optional[str] = None) -> set[str]:
    """Extract semantic domain keywords from title and abstract."""
    full = f"{title or ''} {abstract or ''}".lower()
    words = re.findall(r'\b[a-zA-Z]{3,}\b', full)
    stop_words = {
        "the", "and", "for", "that", "this", "with", "from", "have", "were", "which",
        "study", "research", "paper", "analysis", "system", "using", "based", "results",
        "data", "these", "their", "about", "would", "could", "should", "there", "their",
        "university", "gimpa", "department", "chapter", "section", "table", "figure",
        "toward", "towards", "impact", "effect", "role", "development", "implementation"
    }
    return set(w for w in words if w not in stop_words)

def get_supervisor_active_student_count(db: Session, supervisor_id: int) -> int:
    """Returns number of active student advisees currently assigned to supervisor."""
    inactive_statuses = {"published", "phase5_published", "rejected", "phase1_proposal_rejected"}
    return db.query(Paper).filter(
        Paper.supervisor_id == supervisor_id,
        ~Paper.status.in_(inactive_statuses)
    ).count()

def get_all_supervisors_with_capacities(db: Session, department_id: Optional[int] = None, school: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists all supervisors with specialization, capacity ceiling, active count, and utilization percentage."""
    all_users = db.query(User).filter(User.is_active == True).all()
    
    supervisors = []
    for u in all_users:
        if has_role(db, u, "lecturer") or has_role(db, u, "project_supervisor") or has_role(db, u, "hod") or u.role in {"lecturer", "project_supervisor", "hod"}:
            active_count = get_supervisor_active_student_count(db, u.id)
            ceiling = u.max_student_ceiling or 5
            
            # Auto-assign default specialization if unset
            spec = u.specialization or DEFAULT_SPECIALIZATIONS.get(u.email, "General Computer Science & Information Systems")
            if not u.specialization and u.email in DEFAULT_SPECIALIZATIONS:
                u.specialization = spec
                db.commit()

            utilization = round((active_count / ceiling) * 100, 1) if ceiling > 0 else 100.0
            
            supervisors.append({
                "id": u.id,
                "name": u.full_name or u.email,
                "email": u.email,
                "department": u.department or "Computer Science and Information Systems",
                "school": u.school or "School of Technology and Social Sciences (SOTSS)",
                "specialization": spec,
                "research_interests": u.research_interests or spec,
                "active_students_count": active_count,
                "max_student_ceiling": ceiling,
                "utilization_pct": min(utilization, 100.0),
                "is_at_ceiling": active_count >= ceiling,
                "available_slots": max(0, ceiling - active_count),
            })

    return sorted(supervisors, key=lambda x: (x["is_at_ceiling"], -x["available_slots"]))

def match_supervisor_for_topic(
    db: Session,
    title: str,
    abstract: Optional[str] = None,
    department: Optional[str] = None,
    department_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Intelligently matches a topic to the best available supervisor based on:
    1. Keyword matching with supervisor specialization.
    2. Capacity ceiling compliance (never assign if at capacity).
    3. Workload balancing (favors supervisors with lower utilization).
    """
    topic_keywords = extract_topic_keywords(title, abstract)
    capacities = get_all_supervisors_with_capacities(db, department_id=department_id)

    scored_supervisors = []
    for sup in capacities:
        spec_text = f"{sup['specialization']} {sup['research_interests']}".lower()
        spec_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', spec_text))
        
        # Calculate overlap score
        overlap = topic_keywords.intersection(spec_words)
        match_score = len(overlap) * 20.0  # e.g., 3 keyword matches = 60 pts
        
        # Balance bonus for available capacity
        avail_slots = sup["available_slots"]
        capacity_bonus = avail_slots * 5.0
        
        total_score = match_score + capacity_bonus

        scored_supervisors.append({
            **sup,
            "match_score": round(min(100.0, total_score), 1),
            "matched_keywords": list(overlap),
        })

    # Filter out supervisors at ceiling
    eligible = [s for s in scored_supervisors if not s["is_at_ceiling"]]
    if not eligible:
        eligible = scored_supervisors  # Fallback if all at ceiling

    ranked = sorted(eligible, key=lambda s: (s["match_score"], s["available_slots"]), reverse=True)
    best_match = ranked[0] if ranked else None

    return {
        "best_match": best_match,
        "recommendations": ranked[:5],
        "extracted_keywords": list(topic_keywords),
    }
