from app import db
from werkzeug.security import generate_password_hash, check_password_hash
import json

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(500), nullable=False, unique=True)
    password_hash = db.Column(db.String(500), nullable=False)
    user_tasks = db.relationship('UserTasks', back_populates='user', cascade='all, delete-orphan')
    tasks = db.relationship('Task', secondary='user_tasks', back_populates='users', viewonly=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_tasks(self):
        return Task.query.join(UserTasks).filter(UserTasks.user_id == self.id).order_by(UserTasks.order).all()

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False)
    question_data = db.Column(db.Text, nullable=False)
    user_tasks = db.relationship('UserTasks', back_populates='task', cascade='all, delete-orphan')
    users = db.relationship('User', secondary='user_tasks', back_populates='tasks', viewonly=True)

    @property
    def question(self):
        return json.loads(self.question_data)

    @question.setter
    def question(self, value):
        self.question_data = json.dumps(value)

class UserTasks(db.Model):
    __tablename__ = 'user_tasks'
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), primary_key=True)
    order = db.Column(db.Integer, nullable=False)

    user = db.relationship('User', back_populates='user_tasks')
    task = db.relationship('Task', back_populates='user_tasks', overlaps="users,tasks")

class Annotation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    annotation_data = db.Column(db.Text, nullable=False)

    @property
    def annotation(self):
        return json.loads(self.annotation_data)

    @annotation.setter
    def annotation(self, value):
        self.annotation_data = json.dumps(value)