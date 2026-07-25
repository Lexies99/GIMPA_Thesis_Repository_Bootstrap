from __future__ import annotations

from sqlalchemy import inspect, text

from app.db.session import engine


def ensure_user_role_column() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "role" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'student'"))
        conn.execute(text("UPDATE users SET role = 'librarian' WHERE is_admin = true"))


def ensure_user_department_column() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "department" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(255)"))


def ensure_user_school_id_column() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "school_id" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN school_id VARCHAR(64)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_school_id ON users (school_id)"))


def ensure_user_school_column() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "school" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN school VARCHAR(255)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_school ON users (school)"))


def ensure_user_must_change_password_column() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "must_change_password" in columns:
        return

    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false")
        )


def ensure_paper_workflow_columns() -> None:
    inspector = inspect(engine)
    if "papers" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("papers")}

    statements: list[str] = []
    if "abstract_word_count" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN abstract_word_count INTEGER")
    if "publication_type" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN publication_type VARCHAR(64) DEFAULT 'thesis'")
    if "lecturer_approved_by_id" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN lecturer_approved_by_id INTEGER")
    if "lecturer_approved_at" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN lecturer_approved_at TIMESTAMP WITH TIME ZONE")
    if "project_coordinator_approved_by_id" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN project_coordinator_approved_by_id INTEGER")
    if "project_coordinator_approved_at" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN project_coordinator_approved_at TIMESTAMP WITH TIME ZONE")
    if "hod_approved_by_id" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN hod_approved_by_id INTEGER")
    if "hod_approved_at" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN hod_approved_at TIMESTAMP WITH TIME ZONE")
    if "internal_result_file_path" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN internal_result_file_path VARCHAR(1024)")
    if "internal_result_file_name" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN internal_result_file_name VARCHAR(255)")
    if "external_result_file_path" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN external_result_file_path VARCHAR(1024)")
    if "external_result_file_name" not in columns:
        statements.append("ALTER TABLE papers ADD COLUMN external_result_file_name VARCHAR(255)")

    if not statements:
        return

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def ensure_student_extended_columns() -> None:
    inspector = inspect(engine)
    if "students" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("students")}
    statements: list[str] = []
    if "certification_type" not in columns:
        statements.append("ALTER TABLE students ADD COLUMN certification_type VARCHAR(64)")
        statements.append("CREATE INDEX IF NOT EXISTS ix_students_certification_type ON students (certification_type)")
    if "block_code" not in columns:
        statements.append("ALTER TABLE students ADD COLUMN block_code VARCHAR(8)")
        statements.append("CREATE INDEX IF NOT EXISTS ix_students_block_code ON students (block_code)")

    if not statements:
        return

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def ensure_paper_audit_tables() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    
    is_sqlite = engine.dialect.name == "sqlite"
    id_type = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"
    timestamp_type = "DATETIME DEFAULT CURRENT_TIMESTAMP" if is_sqlite else "TIMESTAMPTZ DEFAULT now()"

    with engine.begin() as conn:
        if "paper_versions" not in table_names:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE paper_versions (
                        id {id_type},
                        paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
                        version_no INTEGER NOT NULL,
                        source VARCHAR(32) NOT NULL,
                        file_name VARCHAR(255) NOT NULL,
                        file_path VARCHAR(1024) NOT NULL,
                        file_size INTEGER,
                        mime_type VARCHAR(128),
                        file_sha256 VARCHAR(64),
                        note TEXT,
                        uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        created_at {timestamp_type}
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_versions_id ON paper_versions (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_versions_paper_id ON paper_versions (paper_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_versions_uploaded_by_id ON paper_versions (uploaded_by_id)"))
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_paper_versions_paper_version_no ON paper_versions (paper_id, version_no)"
                )
            )

        if "paper_reviews" not in table_names:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE paper_reviews (
                        id {id_type},
                        paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
                        reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        reviewer_role VARCHAR(32),
                        decision VARCHAR(32) NOT NULL,
                        comments TEXT,
                        from_status VARCHAR(32),
                        to_status VARCHAR(32),
                        created_at {timestamp_type}
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_reviews_id ON paper_reviews (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_reviews_paper_id ON paper_reviews (paper_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_reviews_reviewer_id ON paper_reviews (reviewer_id)"))

        if "paper_workflow_events" not in table_names:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE paper_workflow_events (
                        id {id_type},
                        paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
                        event_type VARCHAR(64) NOT NULL,
                        from_status VARCHAR(32),
                        to_status VARCHAR(32),
                        actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        actor_role VARCHAR(32),
                        message TEXT,
                        created_at {timestamp_type}
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_workflow_events_id ON paper_workflow_events (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_workflow_events_paper_id ON paper_workflow_events (paper_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_workflow_events_actor_id ON paper_workflow_events (actor_id)"))
