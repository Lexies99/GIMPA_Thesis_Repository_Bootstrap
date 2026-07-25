"""add_combined_thesis_checklist_columns

Revision ID: c9af4a8c7ab5
Revises: 725ab16bfad1
Create Date: 2026-07-23 03:09:06.303661
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c9af4a8c7ab5'
down_revision = '725ab16bfad1'
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
    if not _table_exists("papers"):
        return
    if not _column_exists("papers", "combined_thesis_student_done"):
        op.add_column("papers", sa.Column("combined_thesis_student_done", sa.Boolean(), nullable=False, server_default=sa.text('false')))
    if not _column_exists("papers", "combined_thesis_supervisor_approved"):
        op.add_column("papers", sa.Column("combined_thesis_supervisor_approved", sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    if _table_exists("papers"):
        if _column_exists("papers", "combined_thesis_student_done"):
            op.drop_column("papers", "combined_thesis_student_done")
        if _column_exists("papers", "combined_thesis_supervisor_approved"):
            op.drop_column("papers", "combined_thesis_supervisor_approved")

