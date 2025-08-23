"""Add mission_id to pointages"""

from alembic import op
import sqlalchemy as sa

revision = '20240218_add_mission_id_to_pointages'
down_revision = '20240210_add_mission_user_status'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('pointages', sa.Column('mission_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_pointages_mission_id', 'pointages', 'missions', ['mission_id'], ['id'],
    )


def downgrade():
    op.drop_constraint('fk_pointages_mission_id', 'pointages', type_='foreignkey')
    op.drop_column('pointages', 'mission_id')
