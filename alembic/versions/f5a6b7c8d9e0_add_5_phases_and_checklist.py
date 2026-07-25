"""add_5_phases_and_checklist

Revision ID: f5a6b7c8d9e0
Revises: c3a8f9e2d411
Create Date: 2026-06-17 11:12:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "f5a6b7c8d9e0"
down_revision = "c3a8f9e2d411"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    # Adding new columns using plain op.add_column conditionally
    if not _column_exists("papers", "project_coordinator_id"):
        op.add_column("papers", sa.Column("project_coordinator_id", sa.Integer(), nullable=True))
    if not _column_exists("papers", "internal_examiner_id"):
        op.add_column("papers", sa.Column("internal_examiner_id", sa.Integer(), nullable=True))
    if not _column_exists("papers", "external_examiner_id"):
        op.add_column("papers", sa.Column("external_examiner_id", sa.Integer(), nullable=True))
    
    # Checklist columns
    for i in range(1, 6):
        col_name = f"ch{i}_student_done"
        if not _column_exists("papers", col_name):
            op.add_column("papers", sa.Column(col_name, sa.Boolean(), nullable=False, server_default=sa.text("false")))
            
        col_app = f"ch{i}_supervisor_approved"
        if not _column_exists("papers", col_app):
            op.add_column("papers", sa.Column(col_app, sa.Boolean(), nullable=False, server_default=sa.text("false")))
    
    # Examiner scores and feedback
    if not _column_exists("papers", "internal_score"):
        op.add_column("papers", sa.Column("internal_score", sa.Float(), nullable=True))
    if not _column_exists("papers", "external_score"):
        op.add_column("papers", sa.Column("external_score", sa.Float(), nullable=True))
    if not _column_exists("papers", "examiner_corrections"):
        op.add_column("papers", sa.Column("examiner_corrections", sa.Text(), nullable=True))
    if not _column_exists("papers", "examiner_result_file_path"):
        op.add_column("papers", sa.Column("examiner_result_file_path", sa.String(length=1024), nullable=True))
    if not _column_exists("papers", "examiner_result_file_name"):
        op.add_column("papers", sa.Column("examiner_result_file_name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    # SQLite does not support dropping columns in older versions easily, 
    # but we can implement it or leave it as drop_column since it's development.
    op.drop_column("papers", "examiner_result_file_name")
    op.drop_column("papers", "examiner_result_file_path")
    op.drop_column("papers", "examiner_corrections")
    op.drop_column("papers", "external_score")
    op.drop_column("papers", "internal_score")
    
    op.drop_column("papers", "ch5_supervisor_approved")
    op.drop_column("papers", "ch4_supervisor_approved")
    op.drop_column("papers", "ch3_supervisor_approved")
    op.drop_column("papers", "ch2_supervisor_approved")
    op.drop_column("papers", "ch1_supervisor_approved")
    
    op.drop_column("papers", "ch5_student_done")
    op.drop_column("papers", "ch4_student_done")
    op.drop_column("papers", "ch3_student_done")
    op.drop_column("papers", "ch2_student_done")
    op.drop_column("papers", "ch1_student_done")
    
    op.drop_column("papers", "external_examiner_id")
    op.drop_column("papers", "internal_examiner_id")
    op.drop_column("papers", "project_coordinator_id")
