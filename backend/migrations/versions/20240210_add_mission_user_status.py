"""Add status and responded_at to mission_users"""

from alembic import op
import sqlalchemy as sa

revision = '20240210_add_mission_user_status'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    status_enum = sa.Enum('pending', 'accepted', 'declined', name='mission_user_status')
    status_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('mission_users', sa.Column('status', status_enum, nullable=False, server_default='pending'))
    op.add_column('mission_users', sa.Column('responded_at', sa.DateTime(), nullable=True))
    op.alter_column('mission_users', 'status', server_default=None)

def downgrade():
    op.drop_column('mission_users', 'responded_at')
    op.drop_column('mission_users', 'status')
    status_enum = sa.Enum(name='mission_user_status')
    status_enum.drop(op.get_bind(), checkfirst=True)
