from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.migrations import (
    ensure_paper_audit_tables,
    ensure_user_must_change_password_column,
    ensure_student_extended_columns,
    ensure_paper_workflow_columns,
    ensure_user_department_column,
    ensure_user_role_column,
    ensure_user_school_column,
    ensure_user_school_id_column,
)


def create_app() -> FastAPI:
    ensure_user_role_column()
    ensure_user_department_column()
    ensure_user_school_id_column()
    ensure_user_school_column()
    ensure_user_must_change_password_column()
    ensure_student_extended_columns()
    ensure_paper_workflow_columns()
    ensure_paper_audit_tables()
    app = FastAPI(title=settings.app_name)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8082",
            "http://127.0.0.1:8082",
            "null",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
