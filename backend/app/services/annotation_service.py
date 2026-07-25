from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.paper import PaperAnnotation, Paper, PaperSupervisor
from app.models.user import User


def create_annotation(
    db: Session,
    paper_id: int,
    author_id: int,
    text: str,
    location: str | None = None,
) -> PaperAnnotation:
    """Create a new annotation on a paper."""
    annotation = PaperAnnotation(
        paper_id=paper_id,
        author_id=author_id,
        text=text.strip(),
        location=(location or "").strip() or None,
        resolved=False,
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


def get_annotation(db: Session, annotation_id: int) -> PaperAnnotation | None:
    """Get an annotation by ID."""
    return db.query(PaperAnnotation).filter(PaperAnnotation.id == annotation_id).first()


def update_annotation(
    db: Session,
    annotation: PaperAnnotation,
    text: str | None = None,
    resolved: bool | None = None,
) -> PaperAnnotation:
    """Update an annotation."""
    if text is not None:
        annotation.text = text.strip()
    if resolved is not None:
        annotation.resolved = resolved
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


def delete_annotation(db: Session, annotation_id: int) -> None:
    """Delete an annotation."""
    annotation = get_annotation(db, annotation_id)
    if annotation:
        db.delete(annotation)
        db.commit()


def get_paper_annotations(db: Session, paper_id: int, resolved_only: bool = False) -> list[PaperAnnotation]:
    """Get all annotations for a paper."""
    query = db.query(PaperAnnotation).filter(PaperAnnotation.paper_id == paper_id)
    if resolved_only:
        query = query.filter(PaperAnnotation.resolved.is_(True))
    return query.order_by(PaperAnnotation.created_at.desc()).all()


def assign_supervisors_to_paper(
    db: Session,
    paper_id: int,
    supervisor_user_ids: list[int],
    assigned_by_id: int | None = None,
) -> list[PaperSupervisor]:
    """Assign supervisors to a paper."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise ValueError(f"Paper {paper_id} not found")
    
    # Remove existing supervisors
    db.query(PaperSupervisor).filter(PaperSupervisor.paper_id == paper_id).delete()
    db.flush()
    
    supervisors = []
    for supervisor_id in supervisor_user_ids:
        user = db.query(User).filter(User.id == supervisor_id).first()
        if not user:
            raise ValueError(f"User {supervisor_id} not found")
        
        supervisor = PaperSupervisor(
            paper_id=paper_id,
            user_id=supervisor_id,
            assigned_by_id=assigned_by_id,
        )
        db.add(supervisor)
        supervisors.append(supervisor)
    
    db.commit()
    for supervisor in supervisors:
        db.refresh(supervisor)
    
    return supervisors


def get_paper_supervisors(db: Session, paper_id: int) -> list[PaperSupervisor]:
    """Get supervisors for a paper."""
    return db.query(PaperSupervisor).filter(PaperSupervisor.paper_id == paper_id).all()


def compile_comments_to_docx(paper_file_path: str, annotations: list[PaperAnnotation]) -> str:
    """
    Injects annotations as native Word comments into a DOCX file and returns the path to the annotated file.
    If the file is not a DOCX or does not exist, returns the original path.
    """
    from pathlib import Path
    try:
        from docx import Document
    except ImportError:
        return paper_file_path

    orig_path = Path(paper_file_path)
    if not orig_path.exists() or orig_path.suffix.lower() != ".docx":
        return paper_file_path
        
    try:
        doc = Document(str(orig_path))
        modified = False
        
        for a in annotations:
            if not a.location or not a.text:
                continue
            
            location_lower = a.location.lower()
            author_name = a.author.full_name if a.author else "Supervisor"
            initials = "".join([part[0] for part in author_name.split() if part]).upper()[:3] or "SV"
            
            # Find the location string in the document's paragraphs
            for p in doc.paragraphs:
                p_text_lower = p.text.lower()
                if location_lower in p_text_lower:
                    anchored = False
                    for run in p.runs:
                        if location_lower in run.text.lower():
                            doc.add_comment(
                                runs=[run],
                                text=a.text,
                                author=author_name,
                                initials=initials
                            )
                            anchored = True
                            modified = True
                            break
                    
                    if not anchored and p.runs:
                        doc.add_comment(
                            runs=p.runs,
                            text=a.text,
                            author=author_name,
                            initials=initials
                        )
                        modified = True
                        break
        
        if modified:
            temp_dir = orig_path.parent / "temp_reviewed"
            temp_dir.mkdir(exist_ok=True)
            temp_file = temp_dir / f"reviewed_{orig_path.name}"
            doc.save(str(temp_file))
            return str(temp_file)
            
    except Exception:
        # Fall back to original file if anything fails
        pass
        
    return paper_file_path

