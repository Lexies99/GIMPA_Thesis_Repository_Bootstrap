from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.user import User


def classify_degree_level(
    thesis: Any = None,
    paper: Any = None,
    student_user: User | None = None,
    db: Session | None = None,
) -> str:
    """
    Determines the academic degree classification: 'Undergraduate', 'Masters', 'MPhil', or 'PhD'.
    """
    text_chunks: list[str] = []

    if student_user:
        if getattr(student_user, "program", None):
            text_chunks.append(str(student_user.program))
        if db and getattr(student_user, "email", None):
            stu = db.query(Student).filter(Student.email == student_user.email.lower()).first()
            if stu:
                if stu.certification_type:
                    text_chunks.append(str(stu.certification_type))
                if stu.program:
                    text_chunks.append(str(stu.program))

    if thesis:
        if getattr(thesis, "topic_description", None):
            text_chunks.append(str(thesis.topic_description))

    if paper:
        if getattr(paper, "document_type", None):
            text_chunks.append(str(paper.document_type))
        if getattr(paper, "publication_type", None):
            text_chunks.append(str(paper.publication_type))
        if getattr(paper, "discipline", None):
            text_chunks.append(str(paper.discipline))

    combined = " ".join(text_chunks).lower()

    if "phd" in combined or "doctor" in combined:
        return "PhD"
    if "mphil" in combined or "m.phil" in combined:
        return "MPhil"
    if any(k in combined for k in ["master", "msc", "mba", "ma ", "med", "mpa", "mph"]):
        return "Masters"
    if any(k in combined for k in ["undergraduate", "bsc", "ba ", "llb", "bachelor", "degree", "diploma"]):
        return "Undergraduate"

    return "Masters"


def calculate_thesis_examination_score(
    degree_level: str,
    examiner_results: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Calculates final average score based on degree level rules and 3rd examiner caveat.

    Rules:
    - Undergraduate: 1 examiner (Supervisor / Internal). Average = S1.
    - Master's: 2 Internal Examiners (or 1 Internal + 1 External). Formula: (S1 + S2) / 2.
    - MPhil: 1 Internal, 1 External. Formula: (S1 + S2) / 2.
    - Caveat: If |S1 - S2| > 20, 3rd examiner is required.
      When S3 is submitted: (S1 + S2 + S3) / 3.
    """
    s1: float | None = None
    s2: float | None = None
    s3: float | None = None
    scores: list[float] = []

    for item in examiner_results:
        sc = item.get("score")
        ex_type = str(item.get("examiner_type") or "").lower()
        if sc is not None:
            try:
                sc_val = float(sc)
                scores.append(sc_val)
                if ex_type in ("third", "3rd_examiner", "examiner_3"):
                    s3 = sc_val
                elif s1 is None:
                    s1 = sc_val
                elif s2 is None:
                    s2 = sc_val
                elif s3 is None:
                    s3 = sc_val
            except (ValueError, TypeError):
                pass

    requires_third_examiner = False
    score_difference: float | None = None
    average_score: float | None = None
    calculation_note: str | None = None

    degree_normalized = degree_level.strip()

    if degree_normalized == "Undergraduate":
        requires_third_examiner = False
        score_difference = None
        if s1 is not None:
            average_score = round(s1, 2)
            calculation_note = f"Undergraduate evaluation: Marked by Supervisor ({average_score:.2f}/100)."
        elif scores:
            average_score = round(scores[0], 2)
            calculation_note = f"Undergraduate evaluation: Score ({average_score:.2f}/100)."
        else:
            calculation_note = "Undergraduate evaluation: Awaiting Supervisor score."

    else:
        # Master's, MPhil, PhD
        if s1 is not None and s2 is not None:
            score_difference = round(abs(s1 - s2), 2)
            requires_third_examiner = score_difference > 20.0

            if s3 is not None:
                average_score = round((s1 + s2 + s3) / 3.0, 2)
                calculation_note = (
                    f"3rd Examiner score ({s3:.1f}) applied because initial difference "
                    f"({score_difference:.1f}) > 20 marks. Formula: ({s1:.1f} + {s2:.1f} + {s3:.1f}) / 3 = {average_score:.2f}"
                )
            else:
                average_score = round((s1 + s2) / 2.0, 2)
                if requires_third_examiner:
                    calculation_note = (
                        f"WARNING: Mark difference between examiners is {score_difference:.1f} > 20 marks! "
                        f"A 3rd examiner must be assigned. Preliminary 2-examiner average: ({s1:.1f} + {s2:.1f}) / 2 = {average_score:.2f}"
                    )
                else:
                    calculation_note = (
                        f"{degree_normalized} evaluation (2 Examiners, diff = {score_difference:.1f} <= 20): "
                        f"({s1:.1f} + {s2:.1f}) / 2 = {average_score:.2f}"
                    )
        elif scores:
            average_score = round(sum(scores) / len(scores), 2)
            calculation_note = f"{degree_normalized} evaluation: {len(scores)} score(s) received. Awaiting remaining examiner."
        else:
            calculation_note = f"{degree_normalized} evaluation: Awaiting examiner scores."

    return {
        "degree_level": degree_normalized,
        "requires_third_examiner": requires_third_examiner,
        "score_difference": score_difference,
        "internal_score": s1,
        "external_score": s2,
        "third_examiner_score": s3,
        "average_score": average_score,
        "calculation_note": calculation_note,
    }
