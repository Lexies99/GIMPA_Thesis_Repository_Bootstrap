"""add_supervisor_and_notifications

Revision ID: 9c6b2a7a1f11
Revises: 4a2df8d72cb1
Create Date: 2026-02-13 15:35:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "9c6b2a7a1f11"
down_revision = "4a2df8d72cb1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("papers", sa.Column("supervisor_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_papers_supervisor_id_users",
        "papers",
        "users",
        ["supervisor_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("paper_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["paper_id"], ["papers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)
    op.create_index(op.f("ix_notifications_paper_id"), "notifications", ["paper_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_paper_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")

    op.drop_constraint("fk_papers_supervisor_id_users", "papers", type_="foreignkey")
    op.drop_column("papers", "supervisor_id")

