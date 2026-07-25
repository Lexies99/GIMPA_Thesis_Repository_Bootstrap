"""add student program column

Revision ID: d4c8e7b9e0f1
Revises: c9af4a8c7ab5
Create Date: 2026-07-23 03:52:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = 'd4c8e7b9e0f1'
down_revision = 'c9af4a8c7ab5'
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


def upgrade() -> None:
    if _table_exists("students"):
        if not _column_exists("students", "program"):
            op.add_column("students", sa.Column("program", sa.String(255), nullable=True))
            op.create_index("ix_students_program", "students", ["program"])
            
    if _table_exists("users"):
        if not _column_exists("users", "program"):
            op.add_column("users", sa.Column("program", sa.String(255), nullable=True))
            op.create_index("ix_users_program", "users", ["program"])


def downgrade() -> None:
    if _table_exists("students"):
        if _column_exists("students", "program"):
            op.drop_index("ix_students_program", table_name="students")
            op.drop_column("students", "program")
            
    if _table_exists("users"):
        if _column_exists("users", "program"):
            op.drop_index("ix_users_program", table_name="users")
            op.drop_column("users", "program")
