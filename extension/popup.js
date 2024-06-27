backend = 'http://127.0.0.1:5000'

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const annotationForm = document.getElementById('annotationForm');
    const taskContainer = document.getElementById('taskContainer');
    const taskQuestion = document.getElementById('taskQuestion');
    const annotationInput = document.getElementById('annotationInput');
    const loginContainer = document.getElementById('loginContainer');

    let token = '';

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        fetch(backend + '/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.access_token) {
                token = data.access_token;
                loginContainer.style.display = 'none';
                taskContainer.style.display = 'block';
                fetchTask();
            } else {
                alert('Login failed');
            }
        });
    });

    annotationForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const annotation = annotationInput.value;
        const taskId = annotationForm.getAttribute('data-task-id');

        fetch(backend + '/api/annotation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ taskId, annotation })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                annotationInput.value = '';
                fetchTask();
            } else {
                alert('Annotation submission failed');
            }
        });
    });

    function fetchTask() {
        fetch(backend + '/api/task', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                taskContainer.innerHTML = '<p>No tasks available</p>';
            } else {
                taskContainer.setAttribute('data-task-id', data.id);
                taskQuestion.textContent = data.question;
                // Update the URL of the current tab using chrome.tabs.update
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.tabs.update(tabs[0].id, { url: data.url }, function(tab) {
                        // After the tab is updated, fetch the annotation
                        fetchAnnotation(data.id);
                    });
                });
            }
        });
    }

    function fetchAnnotation(taskId) {
        fetch(backend + '/api/annotation/' + taskId, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.annotation) {
                annotationInput.value = data.annotation;
                taskQuestion.textContent = "Your previous annotation:";
            } else {
                annotationInput.value = '';
                // The question is already set in fetchTask, so we don't need to set it here
            }
        });
    }
});