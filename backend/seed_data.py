from app import create_app, db
from models import User, Task, Annotation, user_tasks

app = create_app()

def clear_data():
    with app.app_context():
        db.session.query(Annotation).delete()
        db.session.query(user_tasks).delete()
        db.session.query(Task).delete()
        db.session.query(User).delete()
        db.session.commit()

def seed_data():
    with app.app_context():
        clear_data()
        # return
        # Create users
        users = [
            User(username="user1"),
            User(username="user2")
        ]
        for user in users:
            user.set_password(f"password_{user.username}")
        db.session.add_all(users)

        # Create tasks
        tasks = []
        urls = [
            'https://example.com',
            'https://python.org',
            'https://javascript.info',
            'https://wikipedia.org',
            'https://github.com',
            'https://stackoverflow.com',
            'https://reddit.com',
            'https://news.ycombinator.com',
            'https://dev.to',
            'https://medium.com'
        ]
        for i, url in enumerate(urls):
            task = Task(
                url=url,
                question=f"Is this URL ({url}) relevant to the query 'blah'?"
            )
            tasks.append(task)
            if i > 0:
                tasks[i-1].next_task_id = task.id
        
        db.session.add_all(tasks)

        # Assign the same start task to both users
        users[0].tasks.append(tasks[0])
        users[1].tasks.append(tasks[0])

        db.session.commit()
        print(f"Seeded {len(users)} users and {len(tasks)} tasks.")

if __name__ == '__main__':
    seed_data()