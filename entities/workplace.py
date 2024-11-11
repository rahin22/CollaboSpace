from flask import Blueprint, render_template, redirect, url_for, flash, current_app, request, jsonify, abort
from extensions import socketio 
from flask_login import login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, DateField, SelectField, EmailField
from wtforms.validators import InputRequired, Length, Regexp, EqualTo, ValidationError
from passlib.hash import pbkdf2_sha256
from datetime import date
from dateutil.relativedelta import relativedelta
from database.models import db, User, Role, Organization, Workplace, User_Workplace, Project, Task, Employee_Info, Salary, Message, FileAttachment, Conversation, ConversationParticipants, Reply
import os, random
from authlib.integrations.flask_client import OAuth
from sqlalchemy import func
from datetime import date, datetime
from flask_socketio import SocketIO, join_room
from sqlalchemy import or_

wrkplace = Blueprint('wrkplace', __name__)


def load_js_inline(filepath):
    with current_app.open_resource(filepath) as f:
        return f.read().decode("utf-8")

@wrkplace.route('/workplace/<int:workplace_id>')
@login_required
def adminWorkplace(workplace_id):
    workplace = Workplace.query.filter_by(id=workplace_id).first()
    employees = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
    organization = Organization.query.filter_by(id=workplace.organization_id).first()
    projects = Project.query.filter_by(workplace_id=workplace_id).all()
    messages_script = load_js_inline("static/messages.js")
    files_script = load_js_inline("static/channelFiles.js")
    tasks_script = load_js_inline("static/tasks.js")
    home_script = load_js_inline("static/channelHome.js")
    
    workplace_users = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
    workplace_user_ids = {uw.user_id for uw in workplace_users}
    all_employees = Employee_Info.query.filter_by(organization_id=organization.id).all()
    non_employees = [employee for employee in all_employees if employee.user_id not in workplace_user_ids]
    
    active_tasks = Task.query.join(Project, Task.project_id == Project.id).filter( Project.workplace_id == workplace_id, Task.status == 'in_progress').all()

    admin_id = organization.admin_id
    manager_id = workplace.workplace_manager


    if current_user.id != organization.admin_id and current_user.id != workplace.workplace_manager:
        abort(403)  

    return render_template('adminWorkplace.html', workplace=workplace, employees=employees, admin_id=admin_id, manager_id=manager_id, organization=organization, projects=projects, non_employees=non_employees, messages_script=messages_script, files_script=files_script, tasks_script=tasks_script, home_script=home_script, workplace_users=workplace_users, active_tasks=active_tasks)


@wrkplace.route('/user_workplace/<int:workplace_id>')
@login_required
def workplace(workplace_id):
    workplace = Workplace.query.filter_by(id=workplace_id).first()
    employees = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
    organization = Organization.query.filter_by(id=workplace.organization_id).first()
    projects = Project.query.filter_by(workplace_id=workplace_id).all()
    messages_script = load_js_inline("static/messages.js")
    files_script = load_js_inline("static/channelFiles.js")
    tasks_script = load_js_inline("static/tasks.js")
    home_script = load_js_inline("static/channelHome.js")
    
    workplace_users = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
    workplace_user_ids = {uw.user_id for uw in workplace_users}
    all_employees = Employee_Info.query.filter_by(organization_id=organization.id).all()
    non_employees = [employee for employee in all_employees if employee.user_id not in workplace_user_ids]

    active_tasks = Task.query.join(Project, Task.project_id == Project.id).filter( Project.workplace_id == workplace_id, Task.status == 'in_progress').all()

    admin_id = organization.admin_id
    manager_id = workplace.workplace_manager


    if (current_user.id not in workplace_user_ids or current_user.id == organization.admin_id or  current_user.id == workplace.workplace_manager):
        abort(403)

    return render_template('userWorkplace.html', workplace=workplace, employees=employees, admin_id=admin_id, manager_id=manager_id, active_tasks=active_tasks, organization=organization, projects=projects, non_employees=non_employees, messages_script=messages_script, files_script=files_script, tasks_script=tasks_script, home_script=home_script, workplace_users=workplace_users)




@wrkplace.route('/check_project/<project_name>/<work_id>')
@login_required
def check_project(project_name, work_id):
    project_name_lower = project_name.lower()
    existing_project = Project.query.filter(func.lower(Project.project_name) == project_name_lower, Project.workplace_id == work_id).first()

    if existing_project:
        return jsonify({'available': False, 'message': 'Project already exists within this workplace'})
    return jsonify({'available': True, 'message': 'Project name is available'})

@wrkplace.route('/check_status/<project_id>')
@login_required
def check_status(project_id):
    project = Project.query.filter_by(id=project_id).first()
    if project.status == 'Not Started':
        return jsonify({'status': 'Not Started', 'icon': 'ri-stop-circle-line', 'color': ''})
    elif project.status == 'In Progress':
        return jsonify({'status': 'In Progress', 'icon': 'ri-loader-2-line', 'color': '#007BFF'})
    elif project.status == 'Completed':
        return jsonify({'status': 'Completed', 'icon': 'ri-checkbox-circle-line', 'color': '#28A745'})
    elif project.status == 'Cancelled':
        return jsonify({'status': 'Cancelled', 'icon': 'ri-close-circle-line', 'color': '#DC3545'})
    elif project.status == 'On Hold':
        return jsonify({'status': 'On Hold', 'icon': 'ri-pause-circle-line', 'color': '#FFC107'})
    else:
        return jsonify({'status': project.status, 'icon': 'ri-circle-line', 'color': ''})




@wrkplace.route('/workplace/create_project/<int:workplace_id>', methods=['GET','POST'])
@login_required
def create_project(workplace_id):
    if request.method == 'POST':
        project_name = request.form['projectName']
        project_description = request.form['projectDescription']
        project_status = 'Not Started'

        new_project = Project(project_name=project_name, description=project_description, status=project_status, workplace_id=workplace_id)
        db.session.add(new_project)
        db.session.commit()

        project_conversation = Conversation(title=new_project.project_name, project_id=new_project.id, workplace_id=workplace_id, conversation_type='project')
        db.session.add(project_conversation)
        db.session.commit()

        workplace_employees = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
        for employee in workplace_employees:
            participant = ConversationParticipants(conversation_id=project_conversation.id, user_id=employee.user_id,)
            db.session.add(participant)
            
        db.session.commit()

        return redirect(url_for('wrkplace.adminWorkplace', workplace_id=workplace_id))
    


@wrkplace.route('/workplace/add_employees/<int:workplace_id>', methods=['GET','POST'])
@login_required
def add_employees(workplace_id):
    if request.method == 'POST':
        employee_ids = request.form.getlist('employeeSelect')
        print(employee_ids)

        for employee_id in employee_ids:
            add_employee = User_Workplace(user_id=employee_id, workplace_id=workplace_id)
            db.session.add(add_employee)

            announcements_conversation = Conversation.query.filter_by(workplace_id=workplace_id, conversation_type='announcement').first()
            if announcements_conversation:
                participant = ConversationParticipants(conversation_id=announcements_conversation.id,user_id=employee_id,)
                db.session.add(participant)

            projects = Project.query.filter_by(workplace_id=workplace_id).all()
            for project in projects:
                project_conversation = Conversation.query.filter_by(project_id=project.id).first()
                if project_conversation: 
                    participant = ConversationParticipants(conversation_id=project_conversation.id,user_id=employee_id)
                    db.session.add(participant)

        db.session.commit()


        return redirect(url_for('wrkplace.adminWorkplace', workplace_id=workplace_id))
    

@wrkplace.route('/get_messages_for_channel/<conversation_type>/<int:channel_id>', methods=['GET'])
def get_messages_for_channel(conversation_type, channel_id):
    limit = int(request.args.get('limit', 10)) 
    last_message_id = request.args.get('last_message_id')  

    if conversation_type == 'announcement':
        conversation = Conversation.query.filter_by(workplace_id=channel_id, conversation_type='announcement').first()
    elif conversation_type == 'project':
        conversation = Conversation.query.filter_by(project_id=channel_id, conversation_type='project').first()
    elif conversation_type == 'home':
        return jsonify({'messages': [], 'conversation_id': None, 'is_first_batch': True,'date_dividers': [] })
    else:
        return jsonify({'error': 'Invalid conversation type'}), 400

    if conversation is None:
        return jsonify({'error': 'Conversation not found'}), 404
    
    reply_subquery = db.session.query(Reply.reply_id).filter(Reply.type == 'reaction').subquery()
    query = Message.query.filter(Message.conversation_id == conversation.id).filter(Message.id.notin_(reply_subquery)).order_by(Message.timestamp.desc())
    reversed_query = Message.query.filter_by(conversation_id=conversation.id).order_by(Message.timestamp.asc())

    replies_query = Message.query.join(Reply, Message.id == Reply.reply_id).filter(Message.conversation_id == conversation.id).order_by(Message.timestamp.desc())

    date_dividers = {}
    first_date = None

    for message in reversed_query:
        if Reply.query.filter_by(reply_id=message.id, type='reaction').first() is not None:
            continue 

        message_date = message.timestamp.date()
        if message_date != first_date:
            date_dividers[message.id] = message_date.strftime('%B %d, %Y')
            first_date = message_date

    if last_message_id:
        query = query.filter(Message.id < last_message_id)
        replies_query = replies_query.filter(Message.id < last_message_id)

    messages = query.limit(limit).all()
    replies = replies_query.all()
    if messages:
       min_id = min([message.id for message in query]) 
       print(min_id)

    is_first_batch = len(messages) < limit or (messages and messages[-1].id == min_id)

    print(conversation.id,'conversation id')

    return jsonify({
        'conversation_id': conversation.id,
        'messages': [message.to_dict() for message in messages],  
        'replies': [reply.to_dict() for reply in replies],
        'is_first_batch': is_first_batch,
        'date_dividers': date_dividers, 
    })


@wrkplace.route('/get_files_for_channel/<conversation_type>/<int:channel_id>', methods=['GET'])
def get_files_for_channel(conversation_type, channel_id):
    print(conversation_type, channel_id)
    if conversation_type == 'announcement':
        conversation = Conversation.query.filter_by(workplace_id=channel_id, conversation_type='announcement').first()
        files = (FileAttachment.query.join(Message, Message.id == FileAttachment.message_id).filter(Message.conversation_id == conversation.id).order_by(FileAttachment.created_at.desc()).all())
        
    elif conversation_type == 'project':
        files = FileAttachment.query.filter_by(project_id=channel_id).order_by(FileAttachment.created_at.desc()).all()

    return jsonify({'files': [file.to_dict() for file in files]})


@wrkplace.route('/get_tasks_for_project/<int:project_id>', methods=['GET'])
def get_tasks_for_project(project_id):
    tasks = Task.query.filter_by(project_id=project_id).all()
    return jsonify({'tasks': [task.to_dict() for task in tasks]})


@wrkplace.route('/check_task/<task_name>/<project_id>')
@login_required
def check_task(task_name, project_id):
    task_name_lower = task_name.lower()
    existing_task = Task.query.filter(func.lower(Task.task_name) == task_name_lower, Task.project_id == project_id).first()

    if existing_task:
        return jsonify({'available': False, 'message': 'Task already exists within this project'})
    return jsonify({'available': True, 'message': 'Task name is available'})


@wrkplace.route('/get_project_home/<int:project_id>')
def get_project_home(project_id):
    project = Project.query.filter_by(id=project_id).first()
    
    tasks = Task.query.filter_by(project_id=project_id).all()
    current_date = datetime.now()
    print('current_date',current_date)

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == 'completed'])
    in_progress_tasks = len([t for t in tasks if t.status == 'in_progress'])
    overdue_tasks = [
        {
            'id': task.id,
            'task_name': task.task_name,
            'due_date': task.due_date.strftime('%Y-%m-%d %I:%M %p'),
            'days_overdue': (current_date - task.due_date).days
        }
        for task in tasks 
        if task.due_date and task.due_date < current_date and task.status != 'completed'
    ]

    upcoming_tasks = Task.query.filter(Task.project_id == project_id,Task.status != 'completed').order_by(Task.due_date.asc()).limit(3).all()
    print('upcoming',upcoming_tasks)

    files = FileAttachment.query.filter_by(project_id=project_id).order_by(FileAttachment.created_at.desc()).limit(2).all()
    conversation = Conversation.query.filter_by(project_id=project_id).first()
    recent_messages = Message.query.filter_by(conversation_id=conversation.id).order_by(Message.timestamp.desc()).limit(2).all()
    
    assigned_tasks = Task.query.filter(Task.project_id == project_id, Task.assigned_user_id.isnot(None)).all()
    team_members = set(task.assigned_user_id for task in assigned_tasks)
    
    return jsonify({
        'project': {
            'id': project.id,
            'name': project.project_name,
            'description': project.description,
            'status': project.status,
            'created_at': project.created_at.strftime('%Y-%m-%d'),
            'start_date': project.start_date.strftime('%Y-%m-%d') if project.start_date else None,
            'end_date': project.end_date.strftime('%Y-%m-%d') if project.end_date else None
        },
        'task_stats': {
            'total': total_tasks,
            'completed': completed_tasks,
            'in_progress': in_progress_tasks,
            'pending': total_tasks - (completed_tasks + in_progress_tasks)
        },
        'overdue_tasks': overdue_tasks, 
        'upcoming_tasks': [task.to_dict() for task in upcoming_tasks],
        'recent_activity': {
            'files': [file.to_dict() for file in files],
            'messages': [msg.to_dict() for msg in recent_messages]
        },
        'team_stats': {
            'total_members': len(team_members),
            'members': list(team_members)
        }
    })
    

@socketio.on('remove_employees')
def handle_remove_employees(data):
    try:
        workplace_id = data.get('workplace_id')
        employee_ids = data.get('employee_ids', [])
        
        User_Workplace.query.filter(User_Workplace.workplace_id == workplace_id, User_Workplace.user_id.in_(employee_ids)).delete(synchronize_session=False)
        db.session.commit()
        
        socketio.emit('employees_removed', {'workplace_id': workplace_id,'removed_ids': employee_ids})
        return {'status': 'success'}
        
    except Exception as e:
        db.session.rollback()
        print(f"Error removing employees: {str(e)}")
        return {'status': 'error', 'message': str(e)}


@wrkplace.route('/api/workplace-search')
def workplace_search():
    query = request.args.get('q', '').lower()
    workplace_id = request.args.get('workplace_id')
    
    results = []
    
    messages = (Message.query
               .join(Conversation)
               .join(User, Message.sender_id == User.id)
               .filter(
                   Conversation.workplace_id == workplace_id,
                   Message.content.ilike(f'%{query}%')
               ).all())
    
    for msg in messages:
        results.append({
            'type': 'message',
            'id': msg.id,
            'title': msg.content[:100],
            'location': f'Conversation: {msg.conversation.title}',
            'timestamp': msg.timestamp.strftime('%Y-%m-%d %H:%M'),
            'author': msg.sender.username,
            'url': f'/workplace/{workplace_id}/conversation/{msg.conversation_id}#message-{msg.id}'
        })

    files = (FileAttachment.query
            .join(Message)
            .join(Conversation)
            .filter(
                Conversation.workplace_id == workplace_id,
                FileAttachment.filename.ilike(f'%{query}%')
            ).all())
    
    for file in files:
        results.append({
            'type': 'file',
            'id': file.id,
            'title': file.filename,
            'location': f'Conversation: {file.message.conversation.title}',
            'timestamp': file.created_at.strftime('%Y-%m-%d %H:%M'),
            'author': file.uploader.username,
            'url': f'/workplace/{workplace_id}/files/{file.id}'
        })

    tasks = (Task.query
            .join(Project)
            .filter(
                Project.workplace_id == workplace_id,
                or_(
                    Task.task_name.ilike(f'%{query}%'),
                    Task.description.ilike(f'%{query}%')
                )
            ).all())
    
    for task in tasks:
        results.append({
            'type': 'task', 
            'id': task.id,
            'title': task.task_name,
            'location': f'Project: {task.project.project_name}',
            'timestamp': task.created_at.strftime('%Y-%m-%d %H:%M'),
            'author': task.assigned_user.username if task.assigned_user else 'Unassigned',
            'url': f'/workplace/{workplace_id}/project/{task.project_id}/task/{task.id}'
        })

    projects = Project.query.filter(
        Project.workplace_id == workplace_id,
        or_(
            Project.project_name.ilike(f'%{query}%'),
            Project.description.ilike(f'%{query}%')
        )
    ).all()

    for project in projects:
        results.append({
            'type': 'project',
            'id': project.id,
            'title': project.project_name,
            'location': 'Projects',
            'timestamp': project.created_at.strftime('%Y-%m-%d %H:%M'),
            'url': f'/workplace/{workplace_id}/project/{project.id}'
        })

    results.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify(results)


@wrkplace.route('/workplace/<int:workplace_id>/settings')
@login_required
def workplace_settings(workplace_id):
    workplace = Workplace.query.get_or_404(workplace_id)
    organization = Organization.query.get(workplace.organization_id)
    employees = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
    
    if current_user.id != organization.admin_id and current_user.id != workplace.workplace_manager:
        abort(403)
        
    return render_template('workplacesettings.html', workplace=workplace, organization=organization, employees=employees, current_user=current_user)

@wrkplace.route('/workplace/<int:workplace_id>/update_info', methods=['POST'])
@login_required
def update_workplace_info(workplace_id):
    workplace = Workplace.query.get_or_404(workplace_id)
    organization = Organization.query.get(workplace.organization_id)
    
    if current_user.id != organization.admin_id:
        abort(403)
        
    workplace.workplace_name = request.form.get('workplace_name')
    workplace.description = request.form.get('description')
    
    db.session.commit()
    flash('Workplace information updated successfully', 'success')
    return redirect(url_for('wrkplace.workplace_settings', workplace_id=workplace_id))



@wrkplace.route('/workplace/<int:workplace_id>/update_access', methods=['POST'])
@login_required
def update_workplace_access(workplace_id):
    workplace = Workplace.query.get_or_404(workplace_id)
    organization = Organization.query.get(workplace.organization_id)
    
    if current_user.id != organization.admin_id:
        abort(403)
        
    workplace.workplace_manager = request.form.get('workplace_manager', type=int)
    
    db.session.commit()
    flash('Workplace access updated successfully', 'success')
    return redirect(url_for('wrkplace.workplace_settings', workplace_id=workplace_id))



@wrkplace.route('/workplace/<int:workplace_id>/delete', methods=['POST'])
@login_required
def delete_workplace(workplace_id):
    workplace = Workplace.query.get_or_404(workplace_id)
    organization = Organization.query.get(workplace.organization_id)
    
    if current_user.id != organization.admin_id:
        abort(403)
        
    User_Workplace.query.filter_by(workplace_id=workplace_id).delete()
    
    conversations = Conversation.query.filter_by(workplace_id=workplace_id).all()
    for conv in conversations:
        Message.query.filter_by(conversation_id=conv.id).delete()
        ConversationParticipants.query.filter_by(conversation_id=conv.id).delete()

    Conversation.query.filter_by(workplace_id=workplace_id).delete()
    
    projects = Project.query.filter_by(workplace_id=workplace_id).all()
    for project in projects:
        Task.query.filter_by(project_id=project.id).delete()
    Project.query.filter_by(workplace_id=workplace_id).delete()
    
    db.session.delete(workplace)
    db.session.commit()
    
    flash('Workplace deleted successfully', 'success')
    return redirect(url_for('dashboard.admin_dashboard', organization_id=organization.id))