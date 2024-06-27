let currentTabId = null;

// Get the current tab when the popup opens
chrome.tabs.query({active: true, currentWindow: false}, function(tabs) {
  if (tabs[0]) {
    currentTabId = tabs[0].id;
  }
});

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
            const partRadio = document.getElementById('part');
            const boundingBoxContainer = document.getElementById('boundingBoxContainer');
            const drawBoundingBoxButton = document.getElementById('drawBoundingBox');
        
            partRadio.addEventListener('change', function() {
                boundingBoxContainer.style.display = this.checked ? 'block' : 'none';
            });
        
            drawBoundingBoxButton.addEventListener('click', function(event) {
                event.preventDefault(); // Prevent form submission
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "drawBoundingBox"}, function(response) {
                        if (response && response.boundingBox) {
                            console.log("Received bounding box:", response.boundingBox);
                            // TODO: Update the UI to show the bounding box information
                        }
                    });
                });
            });        }

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
                
                // Update the URL of the current tab using a message to the background script
                chrome.runtime.sendMessage({action: "updateTab", tabId: currentTabId, url: data.url}, (response) => {
                    if (response && response.success) {
                        // After the tab is updated, fetch the annotation
                        fetchAnnotation(data.id);
                    } else {
                        console.error('Failed to update tab:', response ? response.error : 'Unknown error');
                    }
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
