import unittest
from app import create_app, db
from models import User, Task, Annotation
import json

class TestApp(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///test.db',
            'JWT_SECRET_KEY': 'test-secret-key'
        })
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            
            # Create test user
            user = User(username='testuser')
            user.set_password('testpassword')
            db.session.add(user)
            
            # Create test task
            task = Task(url='http://example.com', question='Test question?')
            db.session.add(task)
            
            # Assign task to user
            user.tasks.append(task)
            
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_user_model(self):
        with self.app.app_context():
            user = User.query.filter_by(username='testuser').first()
            self.assertIsNotNone(user)
            self.assertTrue(user.check_password('testpassword'))
            self.assertFalse(user.check_password('wrongpassword'))

    def test_task_model(self):
        with self.app.app_context():
            task = Task.query.filter_by(url='http://example.com').first()
            self.assertIsNotNone(task)
            self.assertEqual(task.question, 'Test question?')

    def test_user_task_relationship(self):
        with self.app.app_context():
            user = User.query.filter_by(username='testuser').first()
            tasks = user.get_tasks()
            self.assertEqual(len(tasks), 1)
            self.assertEqual(tasks[0].url, 'http://example.com')

    def test_login_api(self):
        response = self.client.post('/api/login', 
                                    data=json.dumps({
                                        'username': 'testuser',
                                        'password': 'testpassword'
                                    }),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('access_token', data)
        self.token = data['access_token']

    def test_get_task_api(self):
        # First, log in to get the JWT token
        self.test_login_api()
        
        # Then use the token to access the protected endpoint
        response = self.client.get('/api/task', 
                                   headers={'Authorization': f'Bearer {self.token}'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['url'], 'http://example.com')
        self.assertEqual(data['question'], 'Test question?')

    def test_submit_annotation_api(self):
        # First, log in to get the JWT token
        self.test_login_api()

        with self.app.app_context():
            user = User.query.filter_by(username='testuser').first()
            task = Task.query.filter_by(url='http://example.com').first()

        response = self.client.post('/api/annotation', 
                                    data=json.dumps({
                                        'taskId': task.id,
                                        'annotation': 'Test annotation'
                                    }),
                                    headers={'Authorization': f'Bearer {self.token}'},
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])

        with self.app.app_context():
            annotation = Annotation.query.filter_by(user_id=user.id, task_id=task.id).first()
            self.assertIsNotNone(annotation)
            self.assertEqual(annotation.annotation, 'Test annotation')

if __name__ == '__main__':
    unittest.main()
