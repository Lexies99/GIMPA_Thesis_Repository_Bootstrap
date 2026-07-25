from __future__ import annotations

import sys
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from app.db.session import SessionLocal


def clear_theses_keep_accounts() -> None:
    db = SessionLocal()
    try:
        print("Clearing thesis database records while preserving all user accounts...")

        tables_to_empty = [
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

        for table in tables_to_empty:
            try:
                result = db.execute(text(f"DELETE FROM {table}"))
                print(f"  - Cleared table '{table}': {result.rowcount} rows deleted.")
            except Exception as e:
                print(f"  - Notice for '{table}': {e}")

        db.commit()

        # Clear uploaded paper files
        uploads_dir = ROOT / "uploads" / "papers"
        if uploads_dir.exists():
            file_count = 0
            for item in uploads_dir.iterdir():
                if item.is_file():
                    item.unlink()
                    file_count += 1
                elif item.is_dir():
                    shutil.rmtree(item)
                    file_count += 1
            print(f"\nCleared {file_count} uploaded files/directories from '{uploads_dir}'.")

        # Report preserved user counts
        print("\n--- Preserved Account & System Data ---")
        counts = {
            "users": db.execute(text("SELECT COUNT(*) FROM users")).scalar(),
            "user_roles": db.execute(text("SELECT COUNT(*) FROM user_roles")).scalar(),
            "students": db.execute(text("SELECT COUNT(*) FROM students")).scalar(),
            "departments": db.execute(text("SELECT COUNT(*) FROM departments")).scalar(),
            "institutions": db.execute(text("SELECT COUNT(*) FROM institutions")).scalar(),
            "papers": db.execute(text("SELECT COUNT(*) FROM papers")).scalar(),
        }
        for k, v in counts.items():
            print(f"  {k}: {v}")

        print("\nDatabase reset complete! All user account details are preserved.")

    finally:
        db.close()


if __name__ == "__main__":
    clear_theses_keep_accounts()
