const backend = 'http://127.0.0.1:5000';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const annotationForm = document.getElementById('annotationForm');
    const taskContainer = document.getElementById('taskContainer');
    const taskQuestion = document.getElementById('taskQuestion');
    const annotationInput = document.getElementById('annotationInput');
    const loginContainer = document.getElementById('loginContainer');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    let token = '';
    let currentTaskId = null;

    // Check for existing token when popup is opened
    chrome.storage.local.get(['token'], function(result) {
        if (result.token) {
            token = result.token;
            showTaskContainer();
            fetchTask();
        } else {
            showLoginContainer();
        }
    });

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
                // Store the token
                chrome.storage.local.set({token: token}, function() {
                    console.log('Token is stored in local storage');
                });
                showTaskContainer();
                fetchTask();
            } else {
                alert('Login failed');
            }
        });
    });

    annotationForm.addEventListener('submit', function(event) {
        event.preventDefault();
        let annotation;
        const taskType = taskContainer.getAttribute('data-task-type');
        
        if (taskType === 'relevance') {
            const selectedOption = document.querySelector('input[name="relevance"]:checked');
            annotation = { type: 'relevance', value: selectedOption ? selectedOption.value : null };
        } else if (taskType === 'selection') {
            const selectedOption = document.querySelector('input[name="selection"]:checked');
            annotation = { 
                type: 'selection', 
                value: selectedOption ? selectedOption.value : null,
                boundingBox: selectedOption && selectedOption.value === 'part' ? getBoundingBox() : null
            };
        }

        if (!annotation.value) {
            alert('Please select an option before submitting.');
            return;
        }

        fetch(backend + '/api/annotation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ taskId: currentTaskId, annotation: annotation })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const nextTaskId = taskContainer.getAttribute('data-next-task-id');
                if (nextTaskId) {
                    fetchTask(nextTaskId);
                } else {
                    alert('No more tasks available.');
                }
            } else {
                alert('Annotation submission failed');
            }
        });
    });

    prevButton.addEventListener('click', function() {
        const prevTaskId = taskContainer.getAttribute('data-prev-task-id');
        if (prevTaskId && prevTaskId !== 'null') {
            fetchTask(prevTaskId);
        }
    });
    
    nextButton.addEventListener('click', function() {
        const nextTaskId = taskContainer.getAttribute('data-next-task-id');
        if (nextTaskId && nextTaskId !== 'null') {
            fetchTask(nextTaskId);
        }
    });

    function fetchTask(taskId = null) {
        const url = taskId && taskId !== 'null' ? `${backend}/api/task/${taskId}` : `${backend}/api/task`;
        fetch(url, {
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
                currentTaskId = data.id;
                taskContainer.setAttribute('data-task-id', data.id);
                taskContainer.setAttribute('data-prev-task-id', data.prev_task_id);
                taskContainer.setAttribute('data-next-task-id', data.next_task_id);
                taskContainer.setAttribute('data-task-type', data.question.type);
                taskQuestion.textContent = data.question.text;
                renderAnnotationForm(data.question.type);
                updateNavigationButtons(data.prev_task_id, data.next_task_id);
                // Update the URL of the current tab using chrome.tabs.update
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.tabs.update(tabs[0].id, { url: data.url }, function(tab) {
                        // After the tab is updated, fetch the annotation
                        fetchAnnotation(data.id);
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // If there's an error (e.g., invalid token), show login form
            showLoginContainer();
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
                setAnnotationFormValue(data.annotation);
            } else {
                clearAnnotationForm();
            }
        });
    }

    function renderAnnotationForm(type) {
        let formHtml = '';
        if (type === 'relevance') {
            formHtml = `
                <div>
                    <input type="radio" id="not_relevant" name="relevance" value="not_relevant">
                    <label for="not_relevant">Not Relevant</label>
                </div>
                <div>
                    <input type="radio" id="slightly_relevant" name="relevance" value="slightly_relevant">
                    <label for="slightly_relevant">Slightly Relevant</label>
                </div>
                <div>
                    <input type="radio" id="relevant" name="relevance" value="relevant">
                    <label for="relevant">Relevant</label>
                </div>
                <div>
                    <input type="radio" id="very_relevant" name="relevance" value="very_relevant">
                    <label for="very_relevant">Very Relevant</label>
                </div>
            `;
        } else if (type === 'selection') {
            formHtml = `
                <div>
                    <input type="radio" id="all" name="selection" value="all">
                    <label for="all">All of it is relevant</label>
                </div>
                <div>
                    <input type="radio" id="part" name="selection" value="part">
                    <label for="part">Part of it is relevant</label>
                </div>
                <div id="boundingBoxContainer" style="display: none;">
                    <button id="drawBoundingBox">Draw Bounding Box</button>
                </div>
            `;
        }
        annotationInput.innerHTML = formHtml;

        if (type === 'selection') {
            const partRadio = document.getElementById('part');
            const boundingBoxContainer = document.getElementById('boundingBoxContainer');
            const drawBoundingBoxButton = document.getElementById('drawBoundingBox');

            partRadio.addEventListener('change', function() {
                boundingBoxContainer.style.display = this.checked ? 'block' : 'none';
            });

            drawBoundingBoxButton.addEventListener('click', function() {
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "drawBoundingBox"});
                });
            });
        }
    }

    function setAnnotationFormValue(annotation) {
        if (annotation.type === 'relevance') {
            const radio = document.querySelector(`input[name="relevance"][value="${annotation.value}"]`);
            if (radio) radio.checked = true;
        } else if (annotation.type === 'selection') {
            const radio = document.querySelector(`input[name="selection"][value="${annotation.value}"]`);
            if (radio) radio.checked = true;
            if (annotation.value === 'part' && annotation.boundingBox) {
                // TODO: Visualize the bounding box
            }
        }
    }

    function clearAnnotationForm() {
        const radios = document.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => radio.checked = false);
    }

    function updateNavigationButtons(prevTaskId, nextTaskId) {
        prevButton.disabled = !prevTaskId;
        nextButton.disabled = !nextTaskId;
    }

    function showTaskContainer() {
        loginContainer.style.display = 'none';
        taskContainer.style.display = 'block';
    }

    function showLoginContainer() {
        loginContainer.style.display = 'block';
        taskContainer.style.display = 'none';
    }

    function getBoundingBox() {
        // TODO: Implement bounding box retrieval
        return null;
    }
});

// ./extension/content.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "drawBoundingBox") {
        // Create a div for the overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '10000';
        document.body.appendChild(overlay);

        let startX, startY, endX, endY;
        let drawing = false;

        overlay.addEventListener('mousedown', startDrawing);
        overlay.addEventListener('mousemove', draw);
        overlay.addEventListener('mouseup', endDrawing);

        function startDrawing(e) {
            drawing = true;
            startX = e.clientX;
            startY = e.clientY;
        }

        function draw(e) {
            if (!drawing) return;
            endX = e.clientX;
            endY = e.clientY;
            drawRect();
        }

        function endDrawing() {
            drawing = false;
            const boundingBox = {
                x: Math.min(startX, endX),
                y: Math.min(startY, endY),
                width: Math.abs(endX - startX),
                height: Math.abs(endY - startY)
            };
            chrome.runtime.sendMessage({action: "boundingBoxDrawn", boundingBox: boundingBox});
            document.body.removeChild(overlay);
        }

        function drawRect() {
            const rect = document.createElement('div');
            rect.style.position = 'absolute';
            rect.style.left = `${Math.min(startX, endX)}px`;
            rect.style.top = `${Math.min(startY, endY)}px`;
            rect.style.width = `${Math.abs(endX - startX)}px`;
            rect.style.height = `${Math.abs(endY - startY)}px`;
            rect.style.border = '2px solid red';
            overlay.innerHTML = '';
            overlay.appendChild(rect);
        }
    }
});