"""add_paper_file_metadata

Revision ID: 4a2df8d72cb1
Revises: e3b9a9a2d1f4
Create Date: 2026-02-13 15:10:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "4a2df8d72cb1"
down_revision = "e3b9a9a2d1f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("papers", sa.Column("file_path", sa.String(length=1024), nullable=True))
    op.add_column("papers", sa.Column("file_size", sa.Integer(), nullable=True))
    op.add_column("papers", sa.Column("mime_type", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("papers", "mime_type")
    op.drop_column("papers", "file_size")
    op.drop_column("papers", "file_path")

