from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from app.db.session import SessionLocal
from scripts.seed_spec_accounts import seed_accounts


def reset_all_data() -> None:
    db = SessionLocal()
    try:
        print("Clearing all thesis submission data, steps, reviews, and logs...")

        tables_to_clear = [
            "audit_log",
            "document_comments",
            "publications",
            "corrections",
            "hod_comments",
            "examiner_uploads",
            "examiner_assignments",
            "step_finalization",
            "steps",
            "proposals",
            "theses",
            "paper_annotations",
            "paper_workflow_events",
            "paper_reviews",
            "paper_versions",
            "paper_authors",
            "paper_supervisors",
            "paper_tags",
            "papers",
            "notifications",
            "refresh_tokens",
        ]

        for table in tables_to_clear:
            try:
                res = db.execute(text(f"DELETE FROM {table}"))
                print(f"  - Cleared table '{table}': {res.rowcount} rows deleted.")
            except Exception as e:
                print(f"  - Table '{table}': {e}")

        db.commit()

        # Clear uploads directories
        for folder in ["papers", "theses"]:
            uploads_dir = ROOT / "uploads" / folder
            if uploads_dir.exists():
                file_count = 0
                for item in uploads_dir.iterdir():
                    if item.is_file():
                        item.unlink()
                        file_count += 1
                    elif item.is_dir():
                        shutil.rmtree(item)
                        file_count += 1
                print(f"Cleared {file_count} files/directories from '{uploads_dir}'.")

        print("\nRe-seeding initial system accounts...")
        seed_accounts()

        print("\n=== SYSTEM DATA SUCCESSFULLY RESET TO FRESH STATE ===")

    finally:
        db.close()


if __name__ == "__main__":
    reset_all_data()
