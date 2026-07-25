"""add_multi_role_student_import_support

Revision ID: a81f6a7c29c1
Revises: 9c6b2a7a1f11
Create Date: 2026-02-23 13:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "a81f6a7c29c1"
down_revision = "9c6b2a7a1f11"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _column_exists("users", "must_change_password"):
        op.add_column(
            "users",
            sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
    if not _column_exists("papers", "work_mode"):
        op.add_column(
            "papers",
            sa.Column("work_mode", sa.String(length=16), nullable=False, server_default="individual"),
        )

    if not _table_exists("user_roles"):
        op.create_table(
            "user_roles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(length=32), nullable=False),
            sa.Column("assigned_by_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["assigned_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "role", name="uq_user_roles_user_id_role"),
        )
    if not _index_exists("user_roles", op.f("ix_user_roles_id")):
        op.create_index(op.f("ix_user_roles_id"), "user_roles", ["id"], unique=False)
    if not _index_exists("user_roles", op.f("ix_user_roles_role")):
        op.create_index(op.f("ix_user_roles_role"), "user_roles", ["role"], unique=False)
    if not _index_exists("user_roles", op.f("ix_user_roles_user_id")):
        op.create_index(op.f("ix_user_roles_user_id"), "user_roles", ["user_id"], unique=False)

    if not _table_exists("students"):
        op.create_table(
            "students",
            sa.Column("student_id", sa.String(length=64), nullable=False),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("school", sa.String(length=255), nullable=True),
            sa.Column("department", sa.String(length=255), nullable=True),
            sa.Column("year", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("student_id"),
        )
    if not _index_exists("students", op.f("ix_students_email")):
        op.create_index(op.f("ix_students_email"), "students", ["email"], unique=True)
    if not _index_exists("students", op.f("ix_students_student_id")):
        op.create_index(op.f("ix_students_student_id"), "students", ["student_id"], unique=False)

    if _table_exists("user_roles"):
        op.execute(
            """
            INSERT INTO user_roles (user_id, role)
            SELECT id, COALESCE(NULLIF(TRIM(role), ''), 'student')
            FROM users
            ON CONFLICT (user_id, role) DO NOTHING
            """
        )

    if _column_exists("users", "must_change_password"):
        op.alter_column("users", "must_change_password", server_default=None)
    if _column_exists("papers", "work_mode"):
        op.alter_column("papers", "work_mode", server_default=None)


def downgrade() -> None:
    if _index_exists("students", op.f("ix_students_student_id")):
        op.drop_index(op.f("ix_students_student_id"), table_name="students")
    if _index_exists("students", op.f("ix_students_email")):
        op.drop_index(op.f("ix_students_email"), table_name="students")
    if _table_exists("students"):
        op.drop_table("students")

    if _index_exists("user_roles", op.f("ix_user_roles_user_id")):
        op.drop_index(op.f("ix_user_roles_user_id"), table_name="user_roles")
    if _index_exists("user_roles", op.f("ix_user_roles_role")):
        op.drop_index(op.f("ix_user_roles_role"), table_name="user_roles")
    if _index_exists("user_roles", op.f("ix_user_roles_id")):
        op.drop_index(op.f("ix_user_roles_id"), table_name="user_roles")
    if _table_exists("user_roles"):
        op.drop_table("user_roles")

    if _column_exists("papers", "work_mode"):
        op.drop_column("papers", "work_mode")
    if _column_exists("users", "must_change_password"):
        op.drop_column("users", "must_change_password")
