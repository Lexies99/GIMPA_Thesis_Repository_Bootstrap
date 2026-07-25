from __future__ import annotations

from app.db.session import engine
from app.db.session import SessionLocal
from app.models.base import Base
from app.db import base  # noqa: F401  # Ensures models are imported
from app.models.paper import Paper, PaperAuthor


SEED_PAPERS = [
    {
        "title": "Advanced AI in Healthcare: Deep Learning Applications",
        "authors": ["Dr. Smith", "Dr. Johnson"],
        "downloads": 512,
        "views": 2341,
        "citations": 45,
        "year": 2024,
        "discipline": "Computer Science",
        "university": "MIT",
        "rating": 4.8,
        "abstract": "Exploring deep learning applications in medical diagnosis and treatment planning.",
    },
    {
        "title": "Quantum Computing Applications in Optimization",
        "authors": ["Prof. Lee"],
        "downloads": 234,
        "views": 1823,
        "citations": 28,
        "year": 2023,
        "discipline": "Physics",
        "university": "Stanford",
        "rating": 4.6,
        "abstract": "A comprehensive study of quantum algorithms for solving optimization problems.",
    },
    {
        "title": "Sustainable Energy Solutions for Urban Development",
        "authors": ["Dr. Chen", "Dr. Patel"],
        "downloads": 891,
        "views": 3452,
        "citations": 67,
        "year": 2024,
        "discipline": "Engineering",
        "university": "UC Berkeley",
        "rating": 4.9,
        "abstract": "Innovative approaches to renewable energy integration in smart cities.",
    },
    {
        "title": "Machine Learning in Financial Risk Assessment",
        "authors": ["Prof. Brown"],
        "downloads": 445,
        "views": 2156,
        "citations": 52,
        "year": 2023,
        "discipline": "Computer Science",
        "university": "Harvard",
        "rating": 4.7,
        "abstract": "Machine learning models for predicting financial risk and market trends.",
    },
    {
        "title": "Blockchain Security Analysis and Best Practices",
        "authors": ["Dr. Martinez"],
        "downloads": 234,
        "views": 1567,
        "citations": 19,
        "year": 2024,
        "discipline": "Computer Science",
        "university": "Oxford",
        "rating": 4.5,
        "abstract": "Security vulnerabilities and mitigation strategies in blockchain systems.",
    },
    {
        "title": "Climate Change Mitigation Through Carbon Capture",
        "authors": ["Prof. Wilson", "Dr. Garcia"],
        "downloads": 1023,
        "views": 4123,
        "citations": 89,
        "year": 2024,
        "discipline": "Environmental Science",
        "university": "Cambridge",
        "rating": 4.9,
        "abstract": "Advanced techniques for capturing and storing atmospheric carbon dioxide.",
    },
]


def seed_papers() -> None:
    db = SessionLocal()
    try:
        if db.query(Paper).count() > 0:
            return

        for item in SEED_PAPERS:
            paper = Paper(
                title=item["title"],
                abstract=item["abstract"],
                status="approved",
                year=item["year"],
                discipline=item["discipline"],
                university=item["university"],
                views=item["views"],
                downloads=item["downloads"],
                citations=item["citations"],
                rating=item["rating"],
                document_type="Research Paper",
                license="cc-by",
            )
            db.add(paper)
            db.flush()
            for idx, name in enumerate(item["authors"]):
                db.add(
                    PaperAuthor(
                        paper_id=paper.id,
                        name=name,
                        author_order=idx + 1,
                    )
                )
        db.commit()
    finally:
        db.close()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    seed_papers()


if __name__ == "__main__":
    main()
