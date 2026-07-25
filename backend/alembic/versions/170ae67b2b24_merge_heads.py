"""merge heads

Revision ID: 170ae67b2b24
Revises: a7b5d1c9e220, f5a6b7c8d9e0
Create Date: 2026-07-22 04:50:27.671996
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '170ae67b2b24'
down_revision = ('a7b5d1c9e220', 'f5a6b7c8d9e0')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
