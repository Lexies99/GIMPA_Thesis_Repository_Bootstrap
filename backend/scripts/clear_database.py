from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from app.db.session import SessionLocal


def clear_database() -> None:
    db = SessionLocal()
    try:
        print("Starting database cleanup...")

        # Find all admin user IDs
        admin_rows = db.execute(text("SELECT id, email FROM users WHERE is_admin = true")).fetchall()
        admin_ids = [row[0] for row in admin_rows]
        print(f"Found {len(admin_rows)} admin accounts to preserve:")
        for admin_id, email in admin_rows:
            print(f"  - ID: {admin_id}, Email: {email}")

        if not admin_ids:
            print("ERROR: No admin users found! Aborting to prevent deleting all users.")
            return

        admin_ids_str = ", ".join(str(i) for i in admin_ids)

        # Deletion order respecting Foreign Key constraints
        tables_to_empty = [
            "paper_workflow_events",
            "paper_reviews",
            "paper_versions",
            "paper_authors",
            "paper_tags",
            "papers",
            "students",
            "notifications",
            "refresh_tokens",
        ]

        for table in tables_to_empty:
            result = db.execute(text(f"DELETE FROM {table}"))
            print(f"Cleared table '{table}': {result.rowcount} rows deleted.")

        # Delete non-admin roles
        res_roles = db.execute(text(f"DELETE FROM user_roles WHERE user_id NOT IN ({admin_ids_str})"))
        print(f"Cleared non-admin roles from 'user_roles': {res_roles.rowcount} rows deleted.")

        # Delete non-admin users
        res_users = db.execute(text(f"DELETE FROM users WHERE is_admin = false"))
        print(f"Cleared non-admin users from 'users': {res_users.rowcount} rows deleted.")

        db.commit()
        print("Database cleanup committed successfully.")

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
            print(f"Cleared {file_count} files/directories from '{uploads_dir}'.")
        else:
            print(f"Uploads directory '{uploads_dir}' does not exist.")

        # Report final table counts
        print("\n--- Final Database Table Counts ---")
        all_tables = [
            "institutions",
            "departments",
            "users",
            "user_roles",
            "students",
            "papers",
            "paper_authors",
            "paper_tags",
            "tags",
            "refresh_tokens",
            "notifications",
            "department_supervisors",
            "paper_versions",
            "paper_workflow_events",
            "paper_reviews",
        ]

        for table in all_tables:
            count = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"  {table}: {count}")

    except Exception as e:
        db.rollback()
        print(f"An error occurred during database cleanup: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    clear_database()
