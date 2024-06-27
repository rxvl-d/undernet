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
        from models import User, Task, Annotation
        
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

    @app.route('/api/task', methods=['GET'])
    @jwt_required()
    def get_task():
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        task = current_user.get_tasks()[0] if current_user.get_tasks() else None
        
        if task:
            return jsonify({'id': task.id, 'url': task.url, 'question': task.question})
        else:
            return jsonify({'error': 'No tasks available'}), 404
                
    @app.route('/api/annotation', methods=['POST'])
    @jwt_required()
    def submit_annotation():
        data = request.json
        task_id = data.get('taskId')
        annotation_text = data.get('annotation')
        
        if not task_id or not annotation_text:
            return jsonify({'error': 'Missing taskId or annotation'}), 400
        
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        
        annotation = Annotation(task_id=task_id, user_id=current_user.id, annotation=annotation_text)
        db.session.add(annotation)
        db.session.commit()
        
        return jsonify({'success': True})

    return app
