"""Add department HOD/Dean, supervisors, and paper fields.

Revision ID: b1c2d3e4f5g6
Revises: a81f6a7c29c1
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5g6'
down_revision = 'a81f6a7c29c1'
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


def _fk_exists(table_name: str, fk_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return any(fk["name"] == fk_name for fk in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    # Add HOD and Dean columns to departments
    if not _column_exists('departments', 'hod_user_id'):
        op.add_column('departments', sa.Column('hod_user_id', sa.Integer(), nullable=True))
    if not _column_exists('departments', 'dean_user_id'):
        op.add_column('departments', sa.Column('dean_user_id', sa.Integer(), nullable=True))
    if not _index_exists('departments', op.f('ix_departments_hod_user_id')):
        op.create_index(op.f('ix_departments_hod_user_id'), 'departments', ['hod_user_id'], unique=False)
    if not _index_exists('departments', op.f('ix_departments_dean_user_id')):
        op.create_index(op.f('ix_departments_dean_user_id'), 'departments', ['dean_user_id'], unique=False)
    if not _fk_exists('departments', 'fk_departments_hod_user_id'):
        op.create_foreign_key('fk_departments_hod_user_id', 'departments', 'users', ['hod_user_id'], ['id'], ondelete='SET NULL')
    if not _fk_exists('departments', 'fk_departments_dean_user_id'):
        op.create_foreign_key('fk_departments_dean_user_id', 'departments', 'users', ['dean_user_id'], ['id'], ondelete='SET NULL')

    # Create department_supervisors table
    if not _table_exists('department_supervisors'):
        op.create_table(
            'department_supervisors',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('department_id', sa.Integer(), nullable=False),
            sa.Column('supervisor_user_id', sa.Integer(), nullable=False),
            sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['supervisor_user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('department_id', 'supervisor_user_id', name='uq_dept_supervisor'),
        )
    if not _index_exists('department_supervisors', op.f('ix_department_supervisors_department_id')):
        op.create_index(op.f('ix_department_supervisors_department_id'), 'department_supervisors', ['department_id'], unique=False)
    if not _index_exists('department_supervisors', op.f('ix_department_supervisors_supervisor_user_id')):
        op.create_index(op.f('ix_department_supervisors_supervisor_user_id'), 'department_supervisors', ['supervisor_user_id'], unique=False)

    # Add columns to papers table
    if not _column_exists('papers', 'abstract_word_count'):
        op.add_column('papers', sa.Column('abstract_word_count', sa.Integer(), nullable=True))
    if not _column_exists('papers', 'publication_type'):
        op.add_column('papers', sa.Column('publication_type', sa.String(64), nullable=True, server_default='thesis'))


def downgrade() -> None:
    # Remove columns from papers
    if _column_exists('papers', 'publication_type'):
        op.drop_column('papers', 'publication_type')
    if _column_exists('papers', 'abstract_word_count'):
        op.drop_column('papers', 'abstract_word_count')

    # Drop department_supervisors table
    if _index_exists('department_supervisors', op.f('ix_department_supervisors_supervisor_user_id')):
        op.drop_index(op.f('ix_department_supervisors_supervisor_user_id'), table_name='department_supervisors')
    if _index_exists('department_supervisors', op.f('ix_department_supervisors_department_id')):
        op.drop_index(op.f('ix_department_supervisors_department_id'), table_name='department_supervisors')
    if _table_exists('department_supervisors'):
        op.drop_table('department_supervisors')

    # Remove HOD and Dean columns from departments
    if _fk_exists('departments', 'fk_departments_dean_user_id'):
        op.drop_constraint('fk_departments_dean_user_id', 'departments', type_='foreignkey')
    if _fk_exists('departments', 'fk_departments_hod_user_id'):
        op.drop_constraint('fk_departments_hod_user_id', 'departments', type_='foreignkey')
    if _index_exists('departments', op.f('ix_departments_dean_user_id')):
        op.drop_index(op.f('ix_departments_dean_user_id'), table_name='departments')
    if _index_exists('departments', op.f('ix_departments_hod_user_id')):
        op.drop_index(op.f('ix_departments_hod_user_id'), table_name='departments')
    if _column_exists('departments', 'dean_user_id'):
        op.drop_column('departments', 'dean_user_id')
    if _column_exists('departments', 'hod_user_id'):
        op.drop_column('departments', 'hod_user_id')
