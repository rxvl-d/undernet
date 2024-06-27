from app import create_app, db
from models import User, Task, Annotation, UserTasks

app = create_app()

def clear_data():
    with app.app_context():
        db.session.query(Annotation).delete()
        db.session.query(UserTasks).delete()
        db.session.query(Task).delete()
        db.session.query(User).delete()
        db.session.commit()

def seed_data():
    with app.app_context():
        clear_data()
        # Create users
        users = [
            User(username="user1"),
            User(username="user2")
        ]
        for user in users:
            user.set_password(f"{user.username}")
        db.session.add_all(users)

        # Create tasks
        tasks = []
        urls = [
            'https://example.com',
            'https://python.org',
            'https://javascript.info',
            'https://wikipedia.org',
            'https://github.com'
        ]
        for i, url in enumerate(urls):
            if i % 2 == 0:
                question = {
                    'type': 'relevance',
                    'text': f"Is this URL ({url}) relevant to the query 'programming'?"
                }
            else:
                question = {
                    'type': 'selection',
                    'text': f"Which part of the web page at {url} is relevant to 'programming', or is all of it relevant?"
                }
            task = Task(url=url, question=question)
            tasks.append(task)
        
        db.session.add_all(tasks)

        # Assign all tasks to both users with order
        for user in users:
            for i, task in enumerate(tasks):
                user_task = UserTasks(user=user, task=task, order=i)
                db.session.add(user_task)

        db.session.commit()
        print(f"Seeded {len(users)} users and {len(tasks)} tasks.")

if __name__ == '__main__':
    seed_data()