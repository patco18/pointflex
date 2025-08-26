"""Add geolocation_max_accuracy to companies"""

from alembic import op
import sqlalchemy as sa

revision = '20240312_add_geolocation_max_accuracy_to_companies'
down_revision = '20240218_add_mission_id_to_pointages'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        'companies',
        sa.Column('geolocation_max_accuracy', sa.Integer(), server_default='100', nullable=True)
    )
    op.execute("UPDATE companies SET geolocation_max_accuracy = 100 WHERE geolocation_max_accuracy IS NULL")
    op.alter_column('companies', 'geolocation_max_accuracy', server_default=None)

def downgrade():
    op.drop_column('companies', 'geolocation_max_accuracy')
