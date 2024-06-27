import unittest
from app import create_app, db
from models import User, Task, Annotation, UserTasks
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
            
            # Create test tasks
            task1 = Task(url='http://example.com', question={'text': 'Test question 1?', 'type': 'relevance'})
            task2 = Task(url='http://example.org', question={'text': 'Test question 2?', 'type': 'selection'})
            db.session.add(task1)
            db.session.add(task2)
            
            # Assign tasks to user with order
            db.session.add(UserTasks(user=user, task=task1, order=0))
            db.session.add(UserTasks(user=user, task=task2, order=1))
            
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
            self.assertEqual(task.question['text'], 'Test question 1?')

    def test_user_task_relationship(self):
        with self.app.app_context():
            user = User.query.filter_by(username='testuser').first()
            tasks = user.get_tasks()
            self.assertEqual(len(tasks), 2)
            self.assertEqual(tasks[0].url, 'http://example.com')
            self.assertEqual(tasks[1].url, 'http://example.org')

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
        return data['access_token']

    def test_get_task_api(self):
        token = self.test_login_api()
        
        response = self.client.get('/api/task/1', 
                                   headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['url'], 'http://example.com')
        self.assertEqual(data['question']['text'], 'Test question 1?')
        self.assertIsNone(data['prev_task_id'])
        self.assertEqual(data['next_task_id'], 2)

    def test_get_tasks_api(self):
        token = self.test_login_api()
        
        response = self.client.get('/api/task/', 
                                   headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['url'], 'http://example.com')
        self.assertEqual(data['question']['text'], 'Test question 1?')
        self.assertIsNone(data['prev_task_id'])
        self.assertEqual(data['next_task_id'], 2)

    def test_submit_annotation_api(self):
        token = self.test_login_api()

        response = self.client.post('/api/annotation', 
                                    data=json.dumps({
                                        'taskId': 1,
                                        'annotation': {'type': 'relevance', 'value': 'relevant'}
                                    }),
                                    headers={'Authorization': f'Bearer {token}'},
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])

        with self.app.app_context():
            user = User.query.filter_by(username='testuser').first()
            annotation = Annotation.query.filter_by(user_id=user.id, task_id=1).first()
            self.assertIsNotNone(annotation)
            self.assertEqual(annotation.annotation['type'], 'relevance')
            self.assertEqual(annotation.annotation['value'], 'relevant')

    def test_get_annotation_api(self):
        token = self.test_login_api()

        # First, submit an annotation
        self.client.post('/api/annotation', 
                         data=json.dumps({
                             'taskId': 1,
                             'annotation': {'type': 'relevance', 'value': 'relevant'}
                         }),
                         headers={'Authorization': f'Bearer {token}'},
                         content_type='application/json')

        # Then, get the annotation
        response = self.client.get('/api/annotation/1', 
                                   headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['annotation']['type'], 'relevance')
        self.assertEqual(data['annotation']['value'], 'relevant')

if __name__ == '__main__':
    unittest.main()