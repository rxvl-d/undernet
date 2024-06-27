from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create user table
    op.create_table('user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=500), nullable=False),
        sa.Column('password_hash', sa.String(length=500), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username')
    )

    # Create task table
    op.create_table('task',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('question_data', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create user_tasks table
    op.create_table('user_tasks',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['task.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'task_id')
    )

    # Create annotation table
    op.create_table('annotation',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('annotation_data', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['task.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('annotation')
    op.drop_table('user_tasks')
    op.drop_table('task')
    op.drop_table('user')