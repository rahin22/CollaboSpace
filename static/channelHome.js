async function renderHome(data) {

    const isProjectActive = data.project.status === 'In Progress';

    console.log(data);
    const homeContainer = document.getElementById('channel-home-content');
    const today = new Date();
    let inactiveMessage = ''

    if (!isProjectActive) {
        inactiveMessage = `
            <div class="alert alert-warning mb-4" role="alert">
                <h5 class="alert-heading"><i class="ri-error-warning-line"></i> Project ${data.project.status}</h5>
                <p class="mb-0">This project is currently ${data.project.status.toLowerCase()}. Some features may be disabled.</p>
            </div>
        `;
    }

    const overdueAlert = data.overdue_tasks.length > 0 ? `
        <div class="alert alert-danger mb-4" role="alert">
            <h5 class="alert-heading"><i class="ri-alarm-warning-line"></i> Overdue Tasks</h5>
            <ul class="mb-0">
                ${data.overdue_tasks.map(task => `
                    <li>
                        ${task.task_name} - Due: ${task.due_date} 
                        <span class="badge bg-danger">${task.days_overdue} days overdue</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    ` : '';


    // Calculate task completion percentage
    const completionPercentage = Math.round((data.task_stats.completed / data.task_stats.total) * 100) || 0;
    const statusDetails = getStatusDetails(data.project.status);

    const daysUntilDeadline = data.project.end_date ? 
    Math.ceil((new Date(data.project.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    const html = `
        <div class="project-overview p-4">
            ${inactiveMessage}
            ${overdueAlert}
            
            <div class="card mb-4">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3 class="card-title mb-0">${data.project.name}</h3>
                        <span id="project-${data.project.id}-status-badge"  class="badge ${statusDetails.color}">
                            <i class="${statusDetails.icon}"></i> ${data.project.status}
                        </span>
                    </div>
                    <p class="text-muted">${data.project.description || 'No description provided'}</p>
                    <div class="row mt-3">
                        <div class="col-md-4">
                            <small class="text-muted"><i class="ri-calendar-line"></i> Start Date</small>
                            <p>${data.project.start_date || 'Not set'}</p>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted"><i class="ri-calendar-check-line"></i> End Date</small>
                            <p>${data.project.end_date || 'Not set'}</p>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted"><i class="ri-team-line"></i> Contributors</small>
                            <p>${data.team_stats.total_members} employees</p>
                        </div>
                    </div>
                </div>
            </div>

             <!-- Quick Actions Buttons -->
            <div class="quick-actions mb-4 d-flex">
                ${data.project.status === 'Not Started' ? `
                    <button class="btn btn-success me-2" id="startProjectBtn">
                        <i class="ri-play-line"></i> Start Project
                    </button>
                ` : `
                    <button class="btn btn-warning me-2" id="changeStatusBtn">
                        <i class="ri-refresh-line"></i> Change Status
                    </button>
                `}
                <button class="btn btn-secondary" id="projectSettingsBtn">
                    <i class="ri-settings-3-line"></i> Project Settings
                </button>
            </div>

            <div class="row">
                <!-- Task Statistics Card -->
                <div class="col-md-6">

                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title"><i class="ri-bar-chart-line"></i> Task Progress</h5>
                            <div class="progress mb-3">
                                <div class="progress-bar" role="progressbar" 
                                     style="width: ${completionPercentage}%" 
                                     aria-valuenow="${completionPercentage}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                    ${completionPercentage}%
                                </div>
                            </div>
                            <div class="row text-center">
                                <div class="col">
                                    <h6 class="text-success">${data.task_stats.completed}</h6>
                                    <small class="text-muted">Completed</small>
                                </div>
                                <div class="col">
                                    <h6 class="text-primary">${data.task_stats.in_progress}</h6>
                                    <small class="text-muted">In Progress</small>
                                </div>
                                <div class="col">
                                    <h6 class="text-secondary">${data.task_stats.pending}</h6>
                                    <small class="text-muted">Pending</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title"><i class="ri-calendar-todo-line"></i> Upcoming Tasks</h5>
                            <div class="upcoming-tasks">
                                ${data.upcoming_tasks.length > 0 ? `
                                    <ul class="list-group">
                                        ${data.upcoming_tasks.map(task => `
                                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                                <div>
                                                    <i class="ri-list-check-3"></i>
                                                    <span>${task.task_name}</span>
                                                </div>

                                                <span class="badge bg-primary">Due: ${new Date(task.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                ` : `
                                    <p class="text-muted">No upcoming tasks</p>
                                `}
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Recent Activity Card -->
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title"><i class="ri-history-line"></i> Recent Activity</h5>
                            <div class="activity-feed">
                                ${data.recent_activity.files.map(file => `
                                    <div class="activity-item">
                                        <i class="ri-file-line text-primary"></i>
                                        <small class="text-muted">${new Date(file.created_at).toLocaleDateString()}</small>
                                        <p style="margin-bottom: 0px;"><span class='fw-bold'>${file.filename}</span> uploaded</p>
                                    </div>
                                `).join('')}
                                ${data.recent_activity.messages.map(msg => `
                                    <div class="activity-item d-flex flex-column">
                                        <div>
                                            <i class="ri-message-2-line text-info"></i>
                                            <span>${msg.user.username}</span>
                                            <small class="text-muted">${new Date(msg.timestamp).toLocaleDateString()}</small>
                                        </div>
                                        <span class="">${msg.content}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>                       
                          
            
            </div>
        </div>
    `;

    homeContainer.innerHTML = html;

    if (data.project.status === 'Not Started') {
        document.getElementById('startProjectBtn').addEventListener('click', () => startProject());
    } else {
        document.getElementById('changeStatusBtn').addEventListener('click', () => changeProjectStatus());
    }

    document.getElementById('projectSettingsBtn').addEventListener('click', () => changeProjectSettings());
}

// Get status icon and color
const getStatusDetails = (status) => {
    const statusMap = {
        'Not Started': { icon: 'ri-stop-circle-line', color: 'text-secondary' },
        'In Progress': { icon: 'ri-loader-2-line', color: 'text-primary' },
        'Completed': { icon: 'ri-checkbox-circle-line', color: 'text-success' },
        'Cancelled': { icon: 'ri-close-circle-line', color: 'text-danger' },
        'On Hold': { icon: 'ri-pause-circle-line', color: 'text-warning' }
    };
    return statusMap[status] || { icon: 'ri-circle-line', color: 'text-secondary' };
};

function startProject() {
    socket.emit('update_project_status', { project_id: channelId, status: 'In Progress' });
}

function changeProjectStatus() {
    const statusButtons = document.querySelectorAll('#projectStatusModal .list-group-item');

    statusButtons.forEach(button => {
        button.onclick = () => {
            const newStatus = button.dataset.status;

            socket.emit('update_project_status', {project_id: channelId, status: newStatus});
            $('#projectStatusModal').modal('hide');
        };
    });
    
    showModal(projectStatusModal);
}


async function changeProjectSettings() {
    try {
        const response = await fetch(`/get_project/${channelId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch project data');
        }
        
        const tasksResponse = await fetch(`/get_tasks_for_project/${channelId}`);
        if (!tasksResponse.ok) {
            throw new Error('Failed to fetch tasks data');
        }
        
        const projectData = await response.json();
        const tasksData = await tasksResponse.json();
        console.log(projectData);

        const today = new Date().toISOString().split('T')[0];
        
        let latestDueDate = today;
        if (tasksData.length > 0) {
            const taskDueDates = tasksData
                .filter(task => task.due_date)
                .map(task => new Date(task.due_date));
            
            if (taskDueDates.length > 0) {
                const maxTaskDate = new Date(Math.max(...taskDueDates));
                maxTaskDate.setDate(maxTaskDate.getDate() + 1);
                latestDueDate = maxTaskDate.toISOString().split('T')[0];
            }
        }

        document.getElementById('projectName').value = projectData.name;
        document.getElementById('projectDescription').value = projectData.description || '';
        const endDateInput = document.getElementById('endDate');
        endDateInput.value = projectData.end_date || '';
        endDateInput.min = latestDueDate; 
        
        document.getElementById('confirmProjectName').setAttribute('data-original', projectData.name);

        showModal(projectSettingsModal);

    } catch (error) {
        console.error('Error loading project settings:', error);
        Toast.error('Failed to load project settings');
    }
}


async function submitProjectSettings(event) {
    event.preventDefault();

    const projectName = document.getElementById('projectName').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const endDate = document.getElementById('endDate').value;


    const updatedData = {
        project_id: channelId,
        name: projectName,
        description: projectDescription,
        end_date: endDate
    };

    console.log(updatedData)

    socket.emit('update_project_settings', updatedData)
    $('#projectSettingsModal').modal('hide');
    document.getElementById('channel-home').click()
}



socket.on('project_status_updated', data => {
    console.log('Project status updated:', data.new_status);
    const statusDetails = getStatusDetails(data.new_status);
    
    const statusBadge = document.getElementById(`project-${data.project_id}-status-badge`);
    statusBadge.innerHTML = `<i class="${statusDetails.icon}"></i> ${data.new_status}`;
    statusBadge.classList.remove('text-secondary', 'text-primary', 'text-success', 'text-danger', 'text-warning');
    statusBadge.classList.add(statusDetails.color);

    const existingInactiveMessage = document.querySelector('.alert-warning');
    if (data.new_status !== 'In Progress') {
        if (!existingInactiveMessage) {
            const inactiveMessage = `
                <div class="alert alert-warning mb-4" role="alert">
                    <h5 class="alert-heading"><i class="ri-error-warning-line"></i> Project ${data.new_status}</h5>
                    <p class="mb-0">This project is currently ${data.new_status.toLowerCase()}. Some features may be disabled.</p>
                </div>
            `;
            document.querySelector('.project-overview').insertAdjacentHTML('afterbegin', inactiveMessage);
        }
    } else if (existingInactiveMessage) {
        existingInactiveMessage.remove();
    }

    const quickActionsDiv = document.querySelector('.quick-actions');
    if (data.new_status === 'Not Started') {
        quickActionsDiv.innerHTML = `
            <button class="btn btn-success me-2" id="startProjectBtn">
                <i class="ri-play-line"></i> Start Project
            </button>
            <button class="btn btn-secondary" id="projectSettingsBtn">
                <i class="ri-settings-3-line"></i> Project Settings
            </button>
        `;
        document.getElementById('startProjectBtn').addEventListener('click', () => startProject());
    } else {
        quickActionsDiv.innerHTML = `
            <button class="btn btn-warning me-2" id="changeStatusBtn">
                <i class="ri-refresh-line"></i> Change Status
            </button>
            <button class="btn btn-secondary" id="projectSettingsBtn">
                <i class="ri-settings-3-line"></i> Project Settings
            </button>
        `;
        document.getElementById('changeStatusBtn').addEventListener('click', () => changeProjectStatus());
    }
    document.getElementById('projectSettingsBtn').addEventListener('click', () => changeProjectSettings());
});