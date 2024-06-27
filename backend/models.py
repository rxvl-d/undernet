from app import db
from werkzeug.security import generate_password_hash, check_password_hash

user_tasks = db.Table('user_tasks',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('task_id', db.Integer, db.ForeignKey('task.id'), primary_key=True)
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(500), nullable=False, unique=True)
    password_hash = db.Column(db.String(500), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_tasks(self):
        return Task.query.join(user_tasks).filter(user_tasks.c.user_id == self.id).all()

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False)
    question = db.Column(db.String(500), nullable=False)
    next_task_id = db.Column(db.Integer, db.ForeignKey('task.id'))
    next_task = db.relationship('Task', remote_side=[id], uselist=False, backref='previous_task')
    users = db.relationship('User', secondary=user_tasks, backref=db.backref('tasks', lazy='dynamic'))

    def get_users(self):
        return User.query.join(user_tasks).filter(user_tasks.c.task_id == self.id).all()

class Annotation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    annotation = db.Column(db.Text, nullable=False)
