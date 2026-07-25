"""add_paper_catalog_tables

Revision ID: e3b9a9a2d1f4
Revises: d2f43548f398
Create Date: 2026-02-13 14:20:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "e3b9a9a2d1f4"
down_revision = "d2f43548f398"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "institutions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_institutions_id"), "institutions", ["id"], unique=False)
    op.create_index(op.f("ix_institutions_name"), "institutions", ["name"], unique=True)

    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("institution_id", "name", name="uq_department_institution_name"),
    )
    op.create_index(op.f("ix_departments_id"), "departments", ["id"], unique=False)
    op.create_index(op.f("ix_departments_name"), "departments", ["name"], unique=False)

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tags_id"), "tags", ["id"], unique=False)
    op.create_index(op.f("ix_tags_name"), "tags", ["name"], unique=True)

    op.create_table(
        "papers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("abstract", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("document_type", sa.String(length=64), nullable=True),
        sa.Column("license", sa.String(length=64), nullable=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("discipline", sa.String(length=255), nullable=True),
        sa.Column("university", sa.String(length=255), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("views", sa.Integer(), nullable=False),
        sa.Column("downloads", sa.Integer(), nullable=False),
        sa.Column("citations", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column("review_comments", sa.Text(), nullable=True),
        sa.Column("reviewed_by_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=True),
        sa.Column("department_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_papers_id"), "papers", ["id"], unique=False)
    op.create_index(op.f("ix_papers_discipline"), "papers", ["discipline"], unique=False)
    op.create_index(op.f("ix_papers_university"), "papers", ["university"], unique=False)

    op.create_table(
        "paper_authors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("paper_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("affiliation", sa.String(length=255), nullable=True),
        sa.Column("author_order", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["paper_id"], ["papers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_paper_authors_id"), "paper_authors", ["id"], unique=False)

    op.create_table(
        "paper_tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("paper_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["paper_id"], ["papers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_paper_tags_id"), "paper_tags", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_paper_tags_id"), table_name="paper_tags")
    op.drop_table("paper_tags")
    op.drop_index(op.f("ix_paper_authors_id"), table_name="paper_authors")
    op.drop_table("paper_authors")
    op.drop_index(op.f("ix_papers_university"), table_name="papers")
    op.drop_index(op.f("ix_papers_discipline"), table_name="papers")
    op.drop_index(op.f("ix_papers_id"), table_name="papers")
    op.drop_table("papers")
    op.drop_index(op.f("ix_tags_name"), table_name="tags")
    op.drop_index(op.f("ix_tags_id"), table_name="tags")
    op.drop_table("tags")
    op.drop_index(op.f("ix_departments_name"), table_name="departments")
    op.drop_index(op.f("ix_departments_id"), table_name="departments")
    op.drop_table("departments")
    op.drop_index(op.f("ix_institutions_name"), table_name="institutions")
    op.drop_index(op.f("ix_institutions_id"), table_name="institutions")
    op.drop_table("institutions")

