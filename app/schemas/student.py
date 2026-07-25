from __future__ import annotations

from pydantic import BaseModel


class StudentRead(BaseModel):
    student_id: str
    full_name: str
    email: str
    school: str | None
    department: str | None
    program: str | None = None
    certification_type: str | None
    block_code: str | None
    year: int | None

    class Config:
        from_attributes = True


class StudentImportSummary(BaseModel):
    imported_or_updated: int
    emailed_sent: int = 0
    emailed_failed: int = 0
    errors: list[str]


class ImportAccountsSummary(BaseModel):
    students: StudentImportSummary | None = None
    lecturers: StudentImportSummary | None = None
    library: StudentImportSummary | None = None
