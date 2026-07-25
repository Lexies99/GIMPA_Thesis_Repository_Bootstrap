from __future__ import annotations

import argparse
from pathlib import Path

from app.db.session import SessionLocal
from app.schemas.student import ImportAccountsSummary
from app.services.import_service import import_staff_accounts, import_students, load_rows_from_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Import students and staff accounts from CSV/XLSX")
    parser.add_argument("--students", type=Path, help="Path to students CSV/XLSX file")
    parser.add_argument("--lecturers", type=Path, help="Path to lecturers CSV/XLSX file")
    parser.add_argument("--library", type=Path, help="Path to library staff CSV/XLSX file")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        summary = ImportAccountsSummary()

        if args.students and args.students.exists():
            summary.students = import_students(db, load_rows_from_path(args.students))
        if args.lecturers and args.lecturers.exists():
            summary.lecturers = import_staff_accounts(
                db,
                load_rows_from_path(args.lecturers),
                default_role="lecturer",
            )
        if args.library and args.library.exists():
            summary.library = import_staff_accounts(
                db,
                load_rows_from_path(args.library),
                default_role="librarian",
            )

        if summary.students:
            print(
                f"Students imported/updated: {summary.students.imported_or_updated}, "
                f"emailed: {summary.students.emailed_sent}, email failed: {summary.students.emailed_failed}"
            )
            for err in summary.students.errors:
                print(f" - {err}")
        if summary.lecturers:
            print(f"Lecturers imported/updated: {summary.lecturers.imported_or_updated}")
            for err in summary.lecturers.errors:
                print(f" - {err}")
        if summary.library:
            print(f"Library imported/updated: {summary.library.imported_or_updated}")
            for err in summary.library.errors:
                print(f" - {err}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
