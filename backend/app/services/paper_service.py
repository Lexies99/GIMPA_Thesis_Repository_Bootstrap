from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session, joinedload

from app.models.paper import Paper, PaperAuthor, PaperTag
from app.models.tag import Tag
from app.models.user import User
from app.schemas.paper import PaperCreate, PaperReview

# Standard abstract length for theses and dissertations
ABSTRACT_MIN_WORDS = 150
ABSTRACT_MAX_WORDS = 300
VALID_PUBLICATION_TYPES = {"thesis", "dissertation", "systematic_review", "article", "other"}


def count_words(text: str) -> int:
    """Count words in text."""
    if not text:
        return 0
    return len(text.strip().split())


def validate_abstract(abstract: str | None) -> tuple[bool, str, int]:
    """Validate abstract word count. Returns (is_valid, message, word_count)."""
    if not abstract:
        return True, "", 0
    
    word_count = count_words(abstract)
    if word_count < ABSTRACT_MIN_WORDS:
        return False, f"Abstract must have at least {ABSTRACT_MIN_WORDS} words (current: {word_count})", word_count
    if word_count > ABSTRACT_MAX_WORDS:
        return False, f"Abstract must not exceed {ABSTRACT_MAX_WORDS} words (current: {word_count})", word_count
    
    return True, "", word_count


def build_query(
    db: Session,
    *,
    q: str | None = None,
    discipline: str | None = None,
    university: str | None = None,
    year: int | None = None,
    status: str | None = None,
    publication_type: str | None = None,
    department_id: int | None = None,
    catalog_mode: bool = False,
    created_by_id: int | None = None,
    supervisor_id: int | None = None,
):
    query = db.query(Paper).options(joinedload(Paper.authors), joinedload(Paper.tags).joinedload(PaperTag.tag))
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            (Paper.title.ilike(pattern))
            | (Paper.abstract.ilike(pattern))
            | (Paper.discipline.ilike(pattern))
            | (Paper.university.ilike(pattern))
        )
    if discipline:
        query = query.filter(Paper.discipline == discipline)
    if university:
        query = query.filter(Paper.university == university)
    if year is not None:
        query = query.filter(Paper.year == year)
    if status:
        query = query.filter(Paper.status == status)
    if publication_type:
        query = query.filter(Paper.publication_type == publication_type)
    if department_id is not None:
        query = query.filter(Paper.department_id == department_id)
    if created_by_id is not None:
        query = query.filter(Paper.created_by_id == created_by_id)
    if supervisor_id is not None:
        query = query.filter(Paper.supervisor_id == supervisor_id)
    if catalog_mode and status is None:
        query = query.outerjoin(User, Paper.created_by_id == User.id).filter(
            (Paper.status == "approved") | (User.is_admin.is_(True))
        )
    return query


def list_papers(
    db: Session,
    *,
    q: str | None = None,
    discipline: str | None = None,
    university: str | None = None,
    year: int | None = None,
    status: str | None = "approved",
    publication_type: str | None = None,
    department_id: int | None = None,
    sort: str = "relevance",
    skip: int = 0,
    limit: int = 50,
    catalog_mode: bool = False,
    created_by_id: int | None = None,
    supervisor_id: int | None = None,
) -> list[Paper]:
    query = build_query(
        db,
        q=q,
        discipline=discipline,
        university=university,
        year=year,
        status=status,
        publication_type=publication_type,
        department_id=department_id,
        catalog_mode=catalog_mode,
        created_by_id=created_by_id,
        supervisor_id=supervisor_id,
    )

    if sort == "newest":
        query = query.order_by(desc(Paper.year), desc(Paper.id))
    elif sort == "citations":
        query = query.order_by(desc(Paper.citations), desc(Paper.id))
    elif sort == "downloads":
        query = query.order_by(desc(Paper.downloads), desc(Paper.id))
    elif sort == "views":
        query = query.order_by(desc(Paper.views), desc(Paper.id))
    elif sort == "highest-rated":
        query = query.order_by(desc(Paper.rating), desc(Paper.id))
    elif sort == "trending":
        query = query.order_by(desc(Paper.views + (Paper.downloads * 2)), desc(Paper.id))
    else:
        query = query.order_by(desc(Paper.created_at), desc(Paper.id))

    return query.offset(skip).limit(limit).all()


def get_paper(db: Session, paper_id: int) -> Paper | None:
    return (
        db.query(Paper)
        .options(joinedload(Paper.authors), joinedload(Paper.tags).joinedload(PaperTag.tag))
        .filter(Paper.id == paper_id)
        .first()
    )


def _resolve_tag_ids(db: Session, names: list[str]) -> list[int]:
    tag_ids: list[int] = []
    for raw in names:
        name = raw.strip().lower()
        if not name:
            continue
        existing = db.query(Tag).filter(func.lower(Tag.name) == name).first()
        if existing:
            tag_ids.append(existing.id)
            continue
        tag = Tag(name=raw.strip())
        db.add(tag)
        db.flush()
        tag_ids.append(tag.id)
    return tag_ids


def create_paper(
    db: Session,
    payload: PaperCreate,
    created_by_id: int | None,
    created_by_is_admin: bool = False,
) -> Paper:
    now = datetime.now(timezone.utc)
    initial_status = "approved" if created_by_is_admin else "phase1_proposal_submitted"
    supervisor_id = payload.supervisor_id if created_by_is_admin else None

    paper = Paper(
        title=payload.title.strip(),
        abstract=(payload.abstract or "").strip() or None,
        abstract_word_count=count_words((payload.abstract or "").strip()),
        discipline=(payload.discipline or "").strip() or None,
        university=(payload.university or "").strip() or None,
        year=payload.year or now.year,
        document_type=(payload.document_type or "").strip() or None,
        publication_type=(payload.publication_type or "thesis").strip().lower(),
        license=(payload.license or "").strip() or None,
        file_name=(payload.file_name or "").strip() or None,
        file_path=(payload.file_path or "").strip() or None,
        file_size=payload.file_size,
        mime_type=(payload.mime_type or "").strip() or None,
        status=initial_status,
        created_by_id=created_by_id,
        supervisor_id=supervisor_id,
        work_mode=payload.work_mode,
        department_id=payload.department_id,
    )
    db.add(paper)
    db.flush()

    for idx, author in enumerate(payload.authors):
        db.add(
            PaperAuthor(
                paper_id=paper.id,
                name=author.name.strip(),
                email=(author.email or "").strip() or None,
                affiliation=(author.affiliation or "").strip() or None,
                author_order=idx + 1,
            )
        )

    tag_ids = _resolve_tag_ids(db, payload.tags)
    for tag_id in tag_ids:
        db.add(PaperTag(paper_id=paper.id, tag_id=tag_id))

    from app.models.thesis_system import Thesis
    existing_thesis = db.query(Thesis).filter(Thesis.id == paper.id).first()
    if not existing_thesis and created_by_id:
        thesis = Thesis(
            id=paper.id,
            student_id=created_by_id,
            department_id=paper.department_id,
            topic_title=paper.title,
            topic_description=paper.abstract,
            topic_status="pending",
            supervisor_id=supervisor_id,
            phase=1,
        )
        db.add(thesis)

    db.commit()
    db.refresh(paper)
    return get_paper(db, paper.id) or paper


def review_paper(db: Session, paper: Paper, payload: PaperReview, reviewer_id: int, next_status: str) -> Paper:
    paper.status = next_status
    paper.review_comments = (payload.comments or "").strip() or None
    paper.reviewed_by_id = reviewer_id
    paper.reviewed_at = datetime.now(timezone.utc)
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return get_paper(db, paper.id) or paper


def increment_view(db: Session, paper: Paper) -> Paper:
    paper.views = (paper.views or 0) + 1
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


def increment_download(db: Session, paper: Paper) -> Paper:
    paper.downloads = (paper.downloads or 0) + 1
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


def get_paper_stats(db: Session) -> dict[str, int]:
    total_papers = db.query(func.count(Paper.id)).scalar() or 0
    total_views = db.query(func.coalesce(func.sum(Paper.views), 0)).scalar() or 0
    total_downloads = db.query(func.coalesce(func.sum(Paper.downloads), 0)).scalar() or 0
    pending_reviews = (
        db.query(func.count(Paper.id))
        .filter(
            Paper.status.in_(
                [
                    "pending",
                    "pending_lecturer",
                    "pending_coordinator",
                    "pending_hod",
                    "pending_hod_and_coordinator",
                    "approved_for_library",
                    # New phases
                    "phase1_proposal_submitted",
                    "phase2_pending_coordinator",
                    "phase2_pending_supervisor",
                    "phase4_pending_examiners",
                    "phase4_marking",
                    "phase5_pending_supervisor",
                    "phase5_pending_hod_and_coordinator",
                    "phase5_approved_for_library"
                ]
            )
        )
        .scalar()
        or 0
    )
    return {
        "total_papers": int(total_papers),
        "total_views": int(total_views),
        "total_downloads": int(total_downloads),
        "pending_reviews": int(pending_reviews),
    }
