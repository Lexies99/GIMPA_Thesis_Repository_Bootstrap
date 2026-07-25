"""add_paper_workflow_audit_tables

Revision ID: c3a8f9e2d411
Revises: b1c2d3e4f5g6
Create Date: 2026-02-26 14:30:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "c3a8f9e2d411"
down_revision = "b1c2d3e4f5g6"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _index_exists(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _table_exists("paper_versions"):
        op.create_table(
            "paper_versions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("paper_id", sa.Integer(), nullable=False),
            sa.Column("version_no", sa.Integer(), nullable=False),
            sa.Column("source", sa.String(length=32), nullable=False),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("file_path", sa.String(length=1024), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=True),
            sa.Column("mime_type", sa.String(length=128), nullable=True),
            sa.Column("file_sha256", sa.String(length=64), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("uploaded_by_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["paper_id"], ["papers.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("paper_versions", op.f("ix_paper_versions_id")):
        op.create_index(op.f("ix_paper_versions_id"), "paper_versions", ["id"], unique=False)
    if not _index_exists("paper_versions", op.f("ix_paper_versions_paper_id")):
        op.create_index(op.f("ix_paper_versions_paper_id"), "paper_versions", ["paper_id"], unique=False)
    if not _index_exists("paper_versions", op.f("ix_paper_versions_uploaded_by_id")):
        op.create_index(op.f("ix_paper_versions_uploaded_by_id"), "paper_versions", ["uploaded_by_id"], unique=False)
    if not _index_exists("paper_versions", "ix_paper_versions_paper_version_no"):
        op.create_index("ix_paper_versions_paper_version_no", "paper_versions", ["paper_id", "version_no"], unique=True)

    if not _table_exists("paper_reviews"):
        op.create_table(
            "paper_reviews",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("paper_id", sa.Integer(), nullable=False),
            sa.Column("reviewer_id", sa.Integer(), nullable=True),
            sa.Column("reviewer_role", sa.String(length=32), nullable=True),
            sa.Column("decision", sa.String(length=32), nullable=False),
            sa.Column("comments", sa.Text(), nullable=True),
            sa.Column("from_status", sa.String(length=32), nullable=True),
            sa.Column("to_status", sa.String(length=32), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["paper_id"], ["papers.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("paper_reviews", op.f("ix_paper_reviews_id")):
        op.create_index(op.f("ix_paper_reviews_id"), "paper_reviews", ["id"], unique=False)
    if not _index_exists("paper_reviews", op.f("ix_paper_reviews_paper_id")):
        op.create_index(op.f("ix_paper_reviews_paper_id"), "paper_reviews", ["paper_id"], unique=False)
    if not _index_exists("paper_reviews", op.f("ix_paper_reviews_reviewer_id")):
        op.create_index(op.f("ix_paper_reviews_reviewer_id"), "paper_reviews", ["reviewer_id"], unique=False)

    if not _table_exists("paper_workflow_events"):
        op.create_table(
            "paper_workflow_events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("paper_id", sa.Integer(), nullable=False),
            sa.Column("event_type", sa.String(length=64), nullable=False),
            sa.Column("from_status", sa.String(length=32), nullable=True),
            sa.Column("to_status", sa.String(length=32), nullable=True),
            sa.Column("actor_id", sa.Integer(), nullable=True),
            sa.Column("actor_role", sa.String(length=32), nullable=True),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["paper_id"], ["papers.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("paper_workflow_events", op.f("ix_paper_workflow_events_id")):
        op.create_index(op.f("ix_paper_workflow_events_id"), "paper_workflow_events", ["id"], unique=False)
    if not _index_exists("paper_workflow_events", op.f("ix_paper_workflow_events_paper_id")):
        op.create_index(op.f("ix_paper_workflow_events_paper_id"), "paper_workflow_events", ["paper_id"], unique=False)
    if not _index_exists("paper_workflow_events", op.f("ix_paper_workflow_events_actor_id")):
        op.create_index(op.f("ix_paper_workflow_events_actor_id"), "paper_workflow_events", ["actor_id"], unique=False)


def downgrade() -> None:
    if _index_exists("paper_workflow_events", op.f("ix_paper_workflow_events_actor_id")):
        op.drop_index(op.f("ix_paper_workflow_events_actor_id"), table_name="paper_workflow_events")
    if _index_exists("paper_workflow_events", op.f("ix_paper_workflow_events_paper_id")):
        op.drop_index(op.f("ix_paper_workflow_events_paper_id"), table_name="paper_workflow_events")
    if _index_exists("paper_workflow_events", op.f("ix_paper_workflow_events_id")):
        op.drop_index(op.f("ix_paper_workflow_events_id"), table_name="paper_workflow_events")
    if _table_exists("paper_workflow_events"):
        op.drop_table("paper_workflow_events")

    if _index_exists("paper_reviews", op.f("ix_paper_reviews_reviewer_id")):
        op.drop_index(op.f("ix_paper_reviews_reviewer_id"), table_name="paper_reviews")
    if _index_exists("paper_reviews", op.f("ix_paper_reviews_paper_id")):
        op.drop_index(op.f("ix_paper_reviews_paper_id"), table_name="paper_reviews")
    if _index_exists("paper_reviews", op.f("ix_paper_reviews_id")):
        op.drop_index(op.f("ix_paper_reviews_id"), table_name="paper_reviews")
    if _table_exists("paper_reviews"):
        op.drop_table("paper_reviews")

    if _index_exists("paper_versions", "ix_paper_versions_paper_version_no"):
        op.drop_index("ix_paper_versions_paper_version_no", table_name="paper_versions")
    if _index_exists("paper_versions", op.f("ix_paper_versions_uploaded_by_id")):
        op.drop_index(op.f("ix_paper_versions_uploaded_by_id"), table_name="paper_versions")
    if _index_exists("paper_versions", op.f("ix_paper_versions_paper_id")):
        op.drop_index(op.f("ix_paper_versions_paper_id"), table_name="paper_versions")
    if _index_exists("paper_versions", op.f("ix_paper_versions_id")):
        op.drop_index(op.f("ix_paper_versions_id"), table_name="paper_versions")
    if _table_exists("paper_versions"):
        op.drop_table("paper_versions")
