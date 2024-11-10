async function renderTasks(tasks, channelId) {
    channelTaskContent.innerHTML = '';
    const projectResponse = await fetch(`/get_project/${channelId}`);
    if (!projectResponse.ok) {
        console.error('Error fetching project:', projectResponse.statusText);
        return;
    }

    const projectData = await projectResponse.json();
    const isProjectActive = projectData.status === 'In Progress';

    if (!isProjectActive) {
        const noTasksDiv = document.createElement('div');
        const warningDiv = document.createElement('div');
        warningDiv.classList.add('alert', 'alert-warning', 'mb-4');
        
        const icon = document.createElement('i');
        icon.classList.add('ri-error-warning-line', 'me-2');
        
        const heading = document.createElement('h5');
        heading.classList.add('alert-heading');
        heading.appendChild(icon);
        heading.appendChild(document.createTextNode(`Project ${projectData.status}`));
        
        const text = document.createElement('p');
        text.classList.add('mb-0');
        text.textContent = `Tasks cannot be created while the project is ${projectData.status.toLowerCase()}.`;
        
        warningDiv.appendChild(heading);
        warningDiv.appendChild(text);
        noTasksDiv.appendChild(warningDiv);
        channelTaskContent.appendChild(noTasksDiv);
    }else {
        if (tasks.length === 0) {
            const noTasksDiv = document.createElement('div');
            noTasksDiv.classList.add('no-tasks', 'text-center', 'mt-4');
        
            const message = document.createElement('p');
            message.classList.add('lead');
            
            if (parseInt(currentUserId) === managerId || parseInt(currentUserId) === adminId) {
                message.textContent = 'No tasks created yet, click below to get started.';
                
                const createButton = document.createElement('button');
                createButton.textContent = 'Create New Task';
                createButton.classList.add('btn', 'btn-primary', 'mt-2');
                createButton.addEventListener('click', () => {
                    const taskDeadlineInput = document.getElementById('taskDeadline');
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const formattedNow = `${year}-${month}-${day}T${hours}:${minutes}`;
                    taskDeadlineInput.min = formattedNow;
                    showModal(createTaskModal);
                });
                noTasksDiv.appendChild(message);
                noTasksDiv.appendChild(createButton);
            } else {
                message.textContent = 'No tasks have been created for this project yet.';
                noTasksDiv.appendChild(message)
            }
        
            channelTaskContent.appendChild(noTasksDiv);
        } else {
            const headerDiv = document.createElement('div');
            headerDiv.classList.add('d-flex', 'justify-content-center', 'align-items-center', 'm-2');
            const addtask = document.createElement('h5');
            addtask.classList.add('mb-3', 'text-center', 'add-task-button');
            addtask.innerHTML = 'Add Task <i class="ri-add-fill"></i>';

            addtask.onclick = () => {
                const taskDeadlineInput = document.getElementById('taskDeadline');
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const formattedNow = `${year}-${month}-${day}T${hours}:${minutes}`;
                taskDeadlineInput.min = formattedNow;
                showModal(createTaskModal);
            };

            channelTaskContent.appendChild(headerDiv);
            if (parseInt(currentUserId) === managerId || parseInt(currentUserId) === adminId) {
                headerDiv.appendChild(addtask);
            }

            // Split tasks into my tasks, urgent, regular, and completed
            const now = new Date();
            const fiveDaysFromNow = new Date();
            fiveDaysFromNow.setDate(now.getDate() + 5);

            const isManagerOrAdmin = parseInt(currentUserId) === managerId || parseInt(currentUserId) === adminId;

            // My Tasks - tasks assigned to current user
            const myTasks = tasks.filter(task => 
                task.assigned_user_id && task.assigned_user_id === parseInt(currentUserId)
            );

            const assignedTaskIds = tasks
                .filter(task => task.assigned_user_id)
                .map(task => task.id);

            // Urgent Tasks - unassigned tasks due within 5 days
            const urgentTasks = tasks.filter(task => {
                const dueDate = new Date(task.due_date);
                return dueDate <= fiveDaysFromNow && 
                    task.status !== 'completed' && 
                    (!task.assigned_user_id || (isManagerOrAdmin && task.assigned_user_id !== parseInt(currentUserId))) &&
                    !myTasks.map(t => t.id).includes(task.id);
            });

            // Other Tasks - unassigned tasks due later
            const otherTasks = tasks.filter(task => {
                const dueDate = new Date(task.due_date);
                return dueDate > fiveDaysFromNow && 
                    task.status !== 'completed' && 
                    (!task.assigned_user_id || (isManagerOrAdmin && task.assigned_user_id !== parseInt(currentUserId))) &&
                    !myTasks.map(t => t.id).includes(task.id);
            });

            // Completed Tasks - unassigned completed tasks
            const completedTasks = tasks.filter(task => 
                task.status === 'completed' && 
                (!task.assigned_user_id || (isManagerOrAdmin && task.assigned_user_id !== parseInt(currentUserId))) &&
                !myTasks.map(t => t.id).includes(task.id)
            );
            

            // Function to create accordion
            const createAccordion = (tasksList, accordionId, headerText) => {
                const accordion = document.createElement('div');
                accordion.classList.add('accordion', 'mb-4');
                accordion.id = accordionId;

                const header = document.createElement('h5');
                header.classList.add('mb-3');
                header.textContent = headerText;
                channelTaskContent.appendChild(header);

                tasksList.forEach((task, index) => {
                    const taskId = task.id || index;

                    // Accordion Item
                    const accordionItem = document.createElement('div');
                    accordionItem.classList.add('accordion-item');
                    accordionItem.id = `task-${taskId}-accordion-item`;

                    // Accordion Header
                    const accordionHeader = document.createElement('h2');
                    accordionHeader.classList.add('accordion-header');
                    accordionHeader.id = `task-${taskId}-header`;

                    const accordionButton = document.createElement('button');
                    const formattedTimestamp = formatTimestamp(task.due_date, 'MMM D, YYYY, h:mm A');
                    accordionButton.classList.add('accordion-button', 'collapsed');
                    accordionButton.type = 'button';
                    accordionButton.setAttribute('data-bs-toggle', 'collapse');
                    accordionButton.setAttribute('data-bs-target', `#task-${taskId}-collapse`);
                    accordionButton.setAttribute('aria-expanded', 'false');
                    accordionButton.setAttribute('aria-controls', `task-${taskId}-collapse`);

                    const accordionButtonInner = document.createElement('div');
                    accordionButtonInner.classList.add('d-flex', 'justify-content-between', 'align-items-center', 'w-100', 'p-1');

                    const statusIconClasses = {   
                        in_progress: 'text-primary',    
                        completed: 'text-success' 
                    };

                    const icon = document.createElement('i');
                    icon.classList.add('ri-list-check-3', statusIconClasses[task.status]);

                    const taskNameSpan = document.createElement('span');
                    taskNameSpan.classList.add('fw-bold');
                    taskNameSpan.appendChild(icon);
                    taskNameSpan.insertAdjacentText('beforeend', ` ${task.task_name}`);

                    const dueDateSpan = document.createElement('span');
                    dueDateSpan.classList.add('small');

                    const dueDate = new Date(task.due_date);
                    if (dueDate < now && task.status !== 'completed') {
                        dueDateSpan.classList.add('text-danger');
                        dueDateSpan.textContent = `Overdue: ${formattedTimestamp}`;
                    } else {
                        dueDateSpan.classList.add('text-muted');
                        dueDateSpan.textContent = `Due: ${formattedTimestamp}`;
                    }


                    accordionButton.appendChild(accordionButtonInner);
                                        
                    if (task.assigned_user_id) {
                        const assignedUserDiv = document.createElement('div');
                        assignedUserDiv.classList.add('mt-2', 'small', 'text-muted');
                        assignedUserDiv.innerHTML = `Assigned to: <span class="fw-bold">${task.user.username}</span>`;
                        taskNameSpan.appendChild(assignedUserDiv);
                    }

                    accordionButtonInner.appendChild(taskNameSpan);


                    accordionButtonInner.appendChild(dueDateSpan);

                    accordionHeader.appendChild(accordionButton);
                    accordionItem.appendChild(accordionHeader);

                    // Accordion Body
                    const accordionCollapse = document.createElement('div');
                    accordionCollapse.id = `task-${taskId}-collapse`;
                    accordionCollapse.classList.add('accordion-collapse', 'collapse');
                    accordionCollapse.setAttribute('aria-labelledby', `task-${taskId}-header`);
                    accordionCollapse.setAttribute('data-bs-parent', `#${accordionId}`);

                    const accordionBody = document.createElement('div');
                    accordionBody.classList.add('accordion-body');
                    accordionBody.style.position = 'relative';

                    // Dropdown Menu for Task Actions
                    const dropdownDiv = document.createElement('div');
                    dropdownDiv.classList.add('dropdown');
                    dropdownDiv.style.position = 'absolute';
                    dropdownDiv.style.top = '10px';
                    dropdownDiv.style.right = '10px';

                    const dropdownToggle = document.createElement('button');
                    dropdownToggle.classList.add('btn','btn-sm', 'p-1', 'fs-5');
                    dropdownToggle.setAttribute('type', 'button');
                    dropdownToggle.setAttribute('data-bs-toggle', 'dropdown');
                    dropdownToggle.setAttribute('aria-expanded', 'false');
                    dropdownToggle.innerHTML = '<i class="ri-more-2-fill"></i>'; 

                    const dropdownMenu = document.createElement('ul');
                    dropdownMenu.classList.add('dropdown-menu');


                    const deleteTaskItem = document.createElement('li');
                    const deleteTaskLink = document.createElement('a');
                    deleteTaskLink.classList.add('dropdown-item');
                    deleteTaskLink.href = '#';
                    deleteTaskLink.innerHTML = '<i class="ri-delete-bin-2-fill text-danger"></i> Delete Task';
                    
                    deleteTaskLink.onclick = () => {
                        taskIdToDelete = taskId;
                        document.getElementById('deleteTaskModalLabel').textContent = `Delete Task: ${task.task_name}`;
                        showModal(deleteTaskModal);
                    };

                    deleteTaskItem.appendChild(deleteTaskLink);
                    dropdownMenu.appendChild(deleteTaskItem);

                    dropdownDiv.appendChild(dropdownToggle);
                    dropdownDiv.appendChild(dropdownMenu);

                    if (parseInt(currentUserId) === managerId || parseInt(currentUserId) === adminId) {
                        accordionBody.appendChild(dropdownDiv);
                    }
                    

                    // Task Description
                    const taskDescriptionLabel = document.createElement('p');
                    taskDescriptionLabel.textContent = 'Description:';
                    taskDescriptionLabel.classList.add('fw-bold');
                    accordionBody.appendChild(taskDescriptionLabel);

                    const taskDescription = document.createElement('p');
                    taskDescription.textContent = task.description;
                    taskDescription.classList.add('card-text', 'text-muted');
                    accordionBody.appendChild(taskDescription);

                    // Timeline Section
                    const timelineDiv = document.createElement('div');
                    timelineDiv.id = `task-${taskId}-timeline`;
                    timelineDiv.classList.add('d-flex', 'justify-content-between', 'align-items-center', 'my-4');

                    const statuses = ['Not Started', 'In Progress', 'Completed'];
                    const statusClasses = {
                        not_started: ['bg-secondary', 'text-white'],
                        in_progress: ['bg-primary', 'text-dark'],
                        completed: ['bg-success', 'text-white']
                    };

                    const currentStatus = task.status; 

                    statuses.forEach((status, idx) => {
                        const node = document.createElement('div');
                        node.classList.add('d-flex', 'flex-column', 'align-items-center');

                        const circle = document.createElement('div');
                        circle.classList.add('rounded-circle', 'mb-2');
                        circle.style.width = '20px';
                        circle.style.height = '20px';
                        circle.classList.add('d-flex', 'justify-content-center', 'align-items-center', 'border');

                        const label = document.createElement('span');
                        label.classList.add('small');
                        label.textContent = status;

                        if (currentStatus === 'not_started' && idx === 0) {
                            circle.classList.add(...statusClasses.not_started);
                        } else if (currentStatus === 'in_progress' && idx <= 1) {
                            circle.classList.add(...statusClasses.in_progress);
                        } else if (currentStatus === 'completed' && idx <= 2) {
                            circle.classList.add(...statusClasses.completed);
                        } else {
                            circle.classList.add('bg-light', 'text-muted');
                        }

                        node.appendChild(circle);
                        node.appendChild(label);
                        timelineDiv.appendChild(node);

                        if (idx < statuses.length - 1) {
                            const connector = document.createElement('div');
                            connector.style.flexGrow = '1';
                            connector.style.height = '2px';
                            connector.classList.add('mx-2');

                            if (currentStatus === 'in_progress') {
                                if (idx === 0) {
                                    connector.classList.add('bg-primary'); 
                                } else {
                                    connector.classList.add('bg-secondary');
                                }
                            } else if (currentStatus === 'completed') {
                                connector.classList.add('bg-success');
                            } else {
                                connector.classList.add('bg-secondary'); 
                            }

                            timelineDiv.appendChild(connector);
                        }
                    });

                    accordionBody.appendChild(timelineDiv);

                    // File Upload Section
                    const fileUploadDiv = document.createElement('div');
                    fileUploadDiv.id = `task-${taskId}-file-upload`;
                    fileUploadDiv.classList.add('d-flex', 'flex-row', 'flex-wrap', 'gap-2', 'mt-3', 'mb-3', 'w-100');

                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.id = `task-${taskId}-file`; 
                    fileInput.style.display = 'none';

                    const addFileButton = document.createElement('button');
                    addFileButton.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'mt-2');
                    addFileButton.id = `task-${taskId}-add-file-button`;
                    addFileButton.textContent = 'Add Files';
                    addFileButton.onclick = () => {
                        fileInput.click();
                    };

                    if (currentStatus === 'completed') {
                        addFileButton.disabled = true;
                    }

                    fileUploadDiv.appendChild(fileInput);
                    accordionBody.appendChild(addFileButton);
                    accordionBody.appendChild(fileUploadDiv);

                    // Conditional Submit/Unsubmit Button
                    if (currentStatus === 'completed') {
                        const unsubmitButton = document.createElement('button');
                        unsubmitButton.id = `submitTaskButton-${taskId}`;
                        unsubmitButton.classList.add('btn', 'btn-warning', 'mt-2', 'w-100');
                        unsubmitButton.textContent = 'Unsubmit';
                        unsubmitButton.onclick = () => handleUnsubmitClick(taskId);
                        accordionBody.appendChild(unsubmitButton);
                    } else {
                        const submitButton = document.createElement('button');
                        submitButton.id = `submitTaskButton-${taskId}`;
                        submitButton.classList.add('btn', 'btn-success', 'mt-2', 'w-100');
                        submitButton.textContent = 'Submit';
                        submitButton.onclick = () => handleSubmitClick(taskId);
                        accordionBody.appendChild(submitButton);
                    }

                    accordionCollapse.appendChild(accordionBody);
                    accordionItem.appendChild(accordionCollapse);
                    accordion.appendChild(accordionItem);

                    fileInput.onchange = (event) => handleTaskFileSelect(event, taskId);
                });

                channelTaskContent.appendChild(accordion);
            };

            // Create My Tasks Accordion
            if (myTasks.length > 0) {
                createAccordion(myTasks, 'myTasksAccordion', 'Assigned Tasks');
            }

            // Create Urgent Tasks Accordion 
            if (urgentTasks.length > 0) {
                createAccordion(urgentTasks, 'urgentTasksAccordion', 'Urgent Tasks');
            }

            // Create Regular Tasks Accordion
            if (otherTasks.length > 0) {
                createAccordion(otherTasks, 'regularTasksAccordion', 'Regular Tasks');
            }

            // Create Completed Tasks Accordion
            if (completedTasks.length > 0) {
                createAccordion(completedTasks, 'completedTasksAccordion', 'Completed Tasks');
            }

            tasks.forEach(task => {
                if (task.files && task.files.length > 0) {
                    task.files.forEach(file => {
                        displayTaskFiles(file, task.id, task.status);
                    });
                }
            });
        }
    }
}

document.getElementById('confirmDeleteTask').onclick = () => {
    $('#deleteTaskModal').modal('hide');
    socket.emit('delete_task', {'task_id':taskIdToDelete});
    taskIdToDelete = null;
};


async function handleUnsubmitClick(taskId) {
    showModal(submitTaskModal);
    const response = await fetch(`/get_task/${taskId}`);
    if (response.ok) {
        const task = await response.json();
        updateSubmitModal(task, 'unsubmit');
    } else {
        console.error('Error fetching task:', response.statusText);
        alert('Error fetching task');
    }
}


async function handleSubmitClick(taskId) {
    showModal(submitTaskModal);
    const response = await fetch(`/get_task/${taskId}`);
    if (response.ok) {
        const task = await response.json();
        updateSubmitModal(task, 'submit'); 
    } else {
        console.error('Error fetching task:', response.statusText);
        alert('Error fetching task');
    }
}


function updateSubmitModal(task, action) {
    const isSubmit = action === 'submit';
    const modalTitle = isSubmit ? 'Confirm Task Submission' : 'Confirm Task Unsubmission';
    const confirmationText = isSubmit 
        ? 'Are you sure you want to submit this task?' 
        : 'Are you sure you want to unsubmit this task?';
    const confirmButtonText = isSubmit ? 'Submit Task' : 'Unsubmit Task';
    const newStatus = isSubmit ? 'completed' : 'in_progress';

    document.getElementById('submitTaskModalLabel').textContent = modalTitle;

    const confirmationParagraph = document.querySelector('#submitTaskModal .modal-body p');
    confirmationParagraph.textContent = confirmationText;

    const confirmButton = document.getElementById('confirmSubmitTask');
    confirmButton.textContent = confirmButtonText;
    confirmButton.classList.toggle('btn-primary', isSubmit);
    confirmButton.classList.toggle('btn-warning', !isSubmit);

    const attachedFilesList = document.getElementById('attachedFilesList');
    attachedFilesList.innerHTML = '';

    if (task.files && task.files.length > 0) {
        task.files.forEach(file => {
            const fileItem = document.createElement('li');
            fileItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

            const getIcon = getFileIconAndColor(file.file_type, file.filename);
            const fileIcon = document.createElement('i');
            fileIcon.classList.add(`${getIcon.icon}`, 'fs-3');
            fileIcon.style.color = getIcon.color;
        

            const fileInfo = document.createElement('div');
            fileInfo.classList.add('ms-2', 'me-auto');

            const fileLink = document.createElement('a');
            fileLink.href = `/static/uploads/${file.filename}`;
            fileLink.target = '_blank';
            fileLink.textContent = file.filename;
            fileLink.classList.add('fw-bold');

            fileItem.appendChild(fileIcon);
            fileInfo.appendChild(fileLink);
            fileItem.appendChild(fileInfo);
            attachedFilesList.appendChild(fileItem);
        });
    } else {
        const noFilesItem = document.createElement('li');
        noFilesItem.classList.add('list-group-item');
        noFilesItem.textContent = 'No files attached.';
        attachedFilesList.appendChild(noFilesItem);
    }


    // Handle the confirmation
    document.getElementById('confirmSubmitTask').onclick = () => {
        updateTaskStatus(task.id, newStatus);
        $('#submitTaskModal').modal('hide');
        attachedFilesList.innerHTML = '';
        socket.emit('update_task_status', { task_id: task.id, task_status: newStatus });
        changeButtons(task.id, newStatus);
    };
}

function changeButtons(taskId, status) {
    const addFileButton = document.getElementById(`task-${taskId}-add-file-button`);
    const removeFileButtons = document.querySelectorAll(`.remove-file-button-${taskId}`);
    const submitButton = document.getElementById(`submitTaskButton-${taskId}`);

    if (status === 'completed') {
        addFileButton.disabled = true;
        removeFileButtons.forEach(button => {
            button.disabled = true;
        });
        submitButton.textContent = 'Unsubmit';
        submitButton.onclick = () => handleUnsubmitClick(taskId);
        submitButton.classList.remove('btn-success');
        submitButton.classList.add('btn-warning');
    } else {
        addFileButton.disabled = false;
        removeFileButtons.forEach(button => {
            button.disabled = false;
        });
        submitButton.textContent = 'Submit';
        submitButton.onclick = () => handleSubmitClick(taskId);
        submitButton.classList.remove('btn-warning');
        submitButton.classList.add('btn-success');
    }
}


async function handleTaskFileSelect(event, taskId) {
    const MAX_FILE_SIZE = 250 * 1024 * 1024;
    const file = event.target.files[0];
    console.log('taskID',taskId)

    if (file) {
        if (file.size > MAX_FILE_SIZE) {
            alert("File exceeds the maximum size of 250 MB.");
            return;
        } else if (taskFiles.length >= 5) {
            alert("You can only attach up to 5 files at a time.");
            return;
        } else {
            const uploadedFile = await uploadTaskFiles(file, taskId, channelId);
            if (uploadedFile) {
                displayTaskFiles(uploadedFile, taskId); 
            }
            event.target.value = '';
        }
    }
}

async function uploadTaskFiles(file, taskId, channelId) {
    const formData = new FormData();
    formData.append('files[]', file); 


    try {
        const response = await fetch(`/upload_task_file/${channelId}/${taskId}`, { 
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('File upload failed: ' + response.statusText);
        }

        const uploadedFile = await response.json();
        console.log(uploadedFile);
        return uploadedFile;

    } catch (error) {
        console.error('Error uploading files:', error);
    }
}

function displayTaskFiles(file, taskId, taskStatus) {
    const fileUploadDiv = document.getElementById(`task-${taskId}-file-upload`);
    
    const fileDiv = document.createElement('div');
    fileDiv.classList.add('d-flex', 'flex-row', 'align-items-center', 'justify-content-between', 'border', 'rounded-3', 'p-2', 'w-100', 'task-file-preview');
    fileDiv.id = `task-file-${file.id}`;

    const fileHeader = document.createElement('div');
    fileHeader.classList.add('d-flex', 'flex-column', 'align-items-start', 'gap-1'); 

    const fileInfoRow = document.createElement('div');
    fileInfoRow.classList.add('d-flex', 'flex-row', 'align-items-center', 'gap-1');

    const getIcon = getFileIconAndColor(file.file_type, file.filename); 
    const fileIcon = document.createElement('i');
    fileIcon.classList.add(`${getIcon.icon}`, 'fs-3');
    fileIcon.style.color = getIcon.color;
    fileInfoRow.appendChild(fileIcon);

    const fileName = document.createElement('a');
    const fileSize = document.createElement('span');
    fileName.style.marginBottom = '0';
    fileName.style.cursor = 'pointer';
    fileName.onclick = () => showFilePreview(file);
    
    fileName.style.textDecoration = 'none';

    fileName.classList.add('small', 'text-truncate');
    fileSize.classList.add('text-muted', 'small');

    fileSize.textContent = file.file_size > 1024 * 1024 ? `${(file.file_size / (1024 * 1024)).toFixed(2)} MB` : `${(file.file_size / 1024).toFixed(2)} KB`;
    fileName.textContent = file.filename;

    fileName.appendChild(document.createElement('br'));
    fileName.appendChild(fileSize);
    fileInfoRow.appendChild(fileName);

    fileHeader.appendChild(fileInfoRow);

    const uploader = document.createElement('span');
    uploader.classList.add('text-muted', 'small');
    uploader.innerHTML = `Uploaded by: <span class="fw-bold">${file.user.username}</span>`;
    fileHeader.appendChild(uploader);

    const uploadDate = document.createElement('span');
    uploadDate.classList.add('text-muted', 'small');
    const formattedDate = formatTimestamp(file.created_at, 'MMM D, YYYY, h:mm A');
    uploadDate.innerHTML = `Uploaded on: <span class="fw-bold">${formattedDate}</span>`;
    fileHeader.appendChild(uploadDate);

    const removeFileButton = document.createElement('button');
    removeFileButton.classList.add('btn', 'btn-sm', 'btn-danger', `remove-file-button-${taskId}`);
    removeFileButton.innerHTML = '<i class="ri-close-fill"></i>';
    
    if (taskStatus === 'completed') {
        removeFileButton.disabled = true;
    }

    removeFileButton.onclick = () => {
        socket.emit('delete_file', { file_id: file.id });
    };

    fileDiv.appendChild(fileHeader);
    

    if (parseInt(currentUserId) === managerId || parseInt(currentUserId) === adminId || file.user.id === parseInt(currentUserId)) {
        fileDiv.appendChild(removeFileButton);
    }

    if (fileUploadDiv) {
        fileUploadDiv.appendChild(fileDiv);
    } else {
        console.log('fileUploadDiv not found in the DOM');
    }
}


socket.on('delete_file_response', (data) => {
    if (data.status === 'success') {
        const fileDiv = document.getElementById(`task-file-${data.file_id}`);
        if (fileDiv) {
            fileDiv.remove();
        }
    } else {
        alert(data.message || 'Failed to delete file.');
    }
});

socket.on('update_task_status_response', (data) => {
    if (data.status === 'success') {
        updateTaskStatus(data.task_id, data.task_status);
    } else {
        alert(data.message || 'Failed to update task status.');
    }
});

socket.on('delete_task_response', (data) => {
    if (data.status === 'success') {
        const accordionItem = document.getElementById(`task-${data.task_id}-accordion-item`);
        if (accordionItem) {
            accordionItem.remove();
        }
    } else {
        alert(data.message || 'Failed to delete task.');
    }
});

function updateTaskStatus(taskId, status) {
    const timelineDiv = document.getElementById(`task-${taskId}-timeline`);
    if (!timelineDiv) return;

    const statuses = ['not_started', 'in_progress', 'completed'];
    const currentStatusIndex = statuses.indexOf(status);

    const statusClasses = {
        not_started: ['bg-secondary', 'text-white'],
        in_progress: ['bg-primary', 'text-dark'],
        completed: ['bg-success', 'text-white']
    };

    const circles = timelineDiv.querySelectorAll('.rounded-circle');
    const connectors = timelineDiv.querySelectorAll('div[style*="flex-grow: 1"]');

    circles.forEach((circle, idx) => {
        if (idx <= currentStatusIndex) {
            circle.className = 'rounded-circle mb-2 d-flex justify-content-center align-items-center border ' + statusClasses[status].join(' ');
        } else {
            circle.className = 'rounded-circle mb-2 d-flex justify-content-center align-items-center border bg-light text-muted';
        }
    });

    connectors.forEach((connector, idx) => {
        if (idx < currentStatusIndex) {
            if (status === 'in_progress') {
                connector.className = 'mx-2 bg-primary';
            } else if (status === 'completed') {
                connector.className = 'mx-2 bg-success';
            }
        } else {
            connector.className = 'mx-2 bg-secondary';
        }
    });
}



$(document).ready(function() {
    $('#taskEmployeeSelect').select2({
        dropdownParent: $('#createTaskModal'),
        templateResult: function(state) {
            if (!state.id) {
                return state.text;
            }
            var $state = $(
                '<span><img src="data:image/png;base64,' + $(state.element).data('img') + '" class="rounded-circle me-2" width="20" height="20"/>' + state.text + '</span>'
            );
            return $state;
        }
    });
});

function checkTaskName() {
    const taskValue = document.getElementById('taskTitle').value;
    const taskInput = document.getElementById('taskTitle');
    const feedback = document.getElementById('task-feedback');
    const submitButton = document.getElementById('taskSubmit');

    if (taskValue.length > 0) {
        fetch(`/check_task/${taskValue}/${channelId}`)
            .then(response => response.json())
            .then(data => {
                feedback.textContent = data.message;
                if (data.available) {
                    feedback.style.color = 'green';
                    taskInput.classList.add('is-valid');
                    taskInput.classList.remove('is-invalid');
                    submitButton.disabled = false;
                } else {
                    feedback.style.color = 'red';
                    taskInput.classList.add('is-invalid');
                    taskInput.classList.remove('is-valid');
                    submitButton.disabled = true;
                }
            });
    } else {
        taskInput.classList.remove('is-valid', 'is-invalid');
        feedback.textContent = '';
    }
}

document.getElementById('createTaskForm').addEventListener('submit', function(e) {
    e.preventDefault();
   

    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const deadline = document.getElementById('taskDeadline').value;
    const assignedTo = document.getElementById('taskEmployeeSelect').value;

    socket.emit('createTask', {
        title,
        description,
        deadline,
        assignedTo: assignedTo || null,
        project_id: channelId
    });

    console.log('Form submitted');

    $('#createTaskModal').modal('hide');
    this.reset();
    setTimeout(() => {
        document.getElementById('channel-tasks').click();
    }, 500);
});

function showFilePreview(file){
    const modal = document.getElementById('filePreviewModal');
    const previewContent = document.getElementById('previewContent');
    const previewFileName = document.getElementById('previewFileName');
    const previewFileInfo = document.getElementById('previewFileInfo');
    const previewDownloadBtn = document.getElementById('previewDownloadBtn');
    const formattedTimestamp = formatTimestamp(file.created_at, 'MMM DD, YYYY h:mm A');

    previewFileName.textContent = file.filename;
    previewFileInfo.innerHTML = `Shared by <span class='fw-bold'>${file.user.username}</span> on ${formattedTimestamp}`;
    previewDownloadBtn.href = `/static/uploads/${file.filename}`;

    previewContent.innerHTML = '';
    console.log(file)

    if (file.file_type.startsWith('image')) {
        previewContent.innerHTML = `
                    <img src="/static/uploads/${file.filename}" class="img-fluid rounded" alt="${file.filename}">
                `;
    }
    else if (file.file_type.startsWith('video')) {
        previewContent.innerHTML = `
                    <video controls class="w-100 rounded">
                        <source src="/static/uploads/${file.filename}" type="${file.file_type}">
                        Your browser does not support the video tag.
                    </video>
                `;
    }
    else {
        const { icon, color } = getFileIconAndColor(file.file_type, file.filename);
        previewContent.innerHTML = `
                    <div class="text-center p-5">
                        <i class="${icon}" style="font-size: 5rem; color: ${color};"></i>
                        <h4 class="mt-3">${file.filename}</h4>
                        <p class="text-muted">File preview not available</p>
                    </div>
                `;
    }

    showModal(filePreviewModal);
};