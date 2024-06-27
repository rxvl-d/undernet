from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(test_config=None):
    app = Flask(__name__)
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'secret'
    if test_config is None:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///undernet.db'  
    else:
        app.config.update(test_config)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    with app.app_context():
        from models import User, Task, Annotation, UserTasks
        
    @app.route('/api/login', methods=['POST'])
    def login():
        username = request.json.get('username', None)
        password = request.json.get('password', None)
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            access_token = create_access_token(identity=username)
            return jsonify(access_token=access_token), 200
        else:
            return jsonify({"msg": "Bad username or password"}), 401

    @app.route('/api/task/<int:task_id>', methods=['GET'])
    @jwt_required()
    def get_task(task_id):
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        user_task = UserTasks.query.filter_by(user_id=current_user.id, task_id=task_id).first()
        
        if user_task:
            task = user_task.task
            prev_task = UserTasks.query.filter_by(user_id=current_user.id, order=user_task.order-1).first()
            next_task = UserTasks.query.filter_by(user_id=current_user.id, order=user_task.order+1).first()
            return jsonify({
                'id': task.id,
                'url': task.url,
                'question': task.question,
                'prev_task_id': prev_task.task_id if prev_task else None,
                'next_task_id': next_task.task_id if next_task else None
            })
        else:
            return jsonify({'error': 'Task not found or not assigned to user'}), 404

    @app.route('/api/task/', methods=['GET'])
    @jwt_required()
    def get_tasks():
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        
        # Find the first unannotated task
        unannotated_task = db.session.query(Task).\
            join(UserTasks).\
            outerjoin(Annotation, (Annotation.task_id == Task.id) & (Annotation.user_id == current_user.id)).\
            filter(UserTasks.user_id == current_user.id).\
            filter(Annotation.id == None).\
            order_by(UserTasks.order).\
            first()
        
        if unannotated_task:
            user_task = UserTasks.query.filter_by(user_id=current_user.id, task_id=unannotated_task.id).first()
            next_task = UserTasks.query.filter_by(user_id=current_user.id, order=user_task.order+1).first()
            prev_task = UserTasks.query.filter_by(user_id=current_user.id, order=user_task.order-1).first()
            return jsonify({
                'id': unannotated_task.id,
                'url': unannotated_task.url,
                'question': unannotated_task.question,
                'prev_task_id': prev_task.task_id if prev_task else None,
                'next_task_id': next_task.task_id if next_task else None
            })
        else:
            return jsonify({'error': 'No unannotated tasks available'}), 404
        
    @app.route('/api/annotation', methods=['POST'])
    @jwt_required()
    def submit_annotation():
        data = request.json
        task_id = data.get('taskId')
        annotation_data = data.get('annotation')
        
        if not task_id or not annotation_data:
            return jsonify({'error': 'Missing taskId or annotation'}), 400
        
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        
        annotation = Annotation(task_id=task_id, user_id=current_user.id, annotation=annotation_data)
        db.session.add(annotation)
        db.session.commit()
        
        return jsonify({'success': True})

    @app.route('/api/annotation/<int:task_id>', methods=['GET'])
    @jwt_required()
    def get_annotation(task_id):
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        annotation = Annotation.query.filter_by(task_id=task_id, user_id=current_user.id).first()
        
        if annotation:
            return jsonify({'annotation': annotation.annotation})
        else:
            return jsonify({'annotation': None})

    return app