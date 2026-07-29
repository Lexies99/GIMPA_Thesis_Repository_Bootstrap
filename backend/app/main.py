from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.migrations import (
    ensure_paper_audit_tables,
    ensure_correction_columns,
    ensure_user_must_change_password_column,
    ensure_student_extended_columns,
    ensure_paper_workflow_columns,
    ensure_user_department_column,
    ensure_user_role_column,
    ensure_user_school_column,
    ensure_user_school_id_column,
)


def create_app() -> FastAPI:
    from app.db.session import engine
    from app.models.base import Base
    import app.models.user
    import app.models.department
    import app.models.institution
    import app.models.paper
    import app.models.paper_workflow
    import app.models.user_role
    import app.models.student
    import app.models.refresh_token
    import app.models.notification
    import app.models.tag
    import app.models.thesis_system

    Base.metadata.create_all(bind=engine)
    ensure_user_role_column()
    ensure_user_department_column()
    ensure_user_school_id_column()
    ensure_user_school_column()
    ensure_user_must_change_password_column()
    ensure_student_extended_columns()
    ensure_paper_workflow_columns()
    ensure_paper_audit_tables()
    ensure_correction_columns()
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
            "http://localhost:8011",
            "http://127.0.0.1:8011",
            "null",
        ],
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
