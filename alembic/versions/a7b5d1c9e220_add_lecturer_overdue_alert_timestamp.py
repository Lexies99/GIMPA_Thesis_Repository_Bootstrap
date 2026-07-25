"""add_lecturer_overdue_alert_timestamp

Revision ID: a7b5d1c9e220
Revises: f6c2b7d91a10
Create Date: 2026-03-04 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "a7b5d1c9e220"
down_revision = "f6c2b7d91a10"
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
    if not _column_exists("papers", "lecturer_overdue_alert_sent_at"):
        op.add_column("papers", sa.Column("lecturer_overdue_alert_sent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    if _table_exists("papers") and _column_exists("papers", "lecturer_overdue_alert_sent_at"):
        op.drop_column("papers", "lecturer_overdue_alert_sent_at")
