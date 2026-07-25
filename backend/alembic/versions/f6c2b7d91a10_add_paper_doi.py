"""add_paper_doi

Revision ID: f6c2b7d91a10
Revises: c3a8f9e2d411
Create Date: 2026-03-04 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "f6c2b7d91a10"
down_revision = "c3a8f9e2d411"
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
    if not _table_exists("papers"):
        return
    if not _column_exists("papers", "doi"):
        op.add_column("papers", sa.Column("doi", sa.String(length=191), nullable=True))
    if not _index_exists("papers", "ix_papers_doi"):
        op.create_index("ix_papers_doi", "papers", ["doi"], unique=True)


def downgrade() -> None:
    if _table_exists("papers") and _index_exists("papers", "ix_papers_doi"):
        op.drop_index("ix_papers_doi", table_name="papers")
    if _table_exists("papers") and _column_exists("papers", "doi"):
        op.drop_column("papers", "doi")
