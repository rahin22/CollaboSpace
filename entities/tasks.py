from flask import Blueprint, render_template, redirect, url_for, flash, current_app, request, jsonify
from extensions import socketio 
from flask_login import login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, DateField, SelectField, EmailField
from wtforms.validators import InputRequired, Length, Regexp, EqualTo, ValidationError
from passlib.hash import pbkdf2_sha256
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from database.models import db, User, Role, Organization, Workplace, User_Workplace, Project, Task, Employee_Info, Salary, Message, FileAttachment, Conversation, ConversationParticipants, Reply
import os, random, base64
from authlib.integrations.flask_client import OAuth
from flask_socketio import SocketIO, join_room
from werkzeug.utils import secure_filename


tasks = Blueprint('tasks', __name__)

upload_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static', 'uploads')
if not os.path.exists(upload_folder):
    os.makedirs(upload_folder)


@socketio.on('createTask')
@login_required
def handle_create_task(data):
    title = data.get('title')
    description = data.get('description')
    deadline = data.get('deadline')
    assigned_to = data.get('assignedTo')
    project_id = data.get('project_id')


    deadline_dt = datetime.strptime(deadline, '%Y-%m-%dT%H:%M')

    new_task = Task(
        task_name=title,
        description=description,
        due_date=deadline_dt,
        assigned_user_id=assigned_to if assigned_to else None,
        status='not_started',
        project_id=project_id
    )

    try:
        db.session.add(new_task)
        db.session.commit()
        socketio.emit('createTaskResponse', {'status': 'success', 'task': new_task.to_dict()})
        print('Task created successfully.')
    except Exception as e:
        db.session.rollback()
        socketio.emit('createTaskResponse', {'status': 'error', 'message': 'Failed to create task.'})
        print('Failed to create task:', e)


@tasks.route('/upload_task_file/<int:project_id>/<int:task_id>', methods=['POST'])
def upload_task_file(project_id, task_id):
    saved_file_paths = []

    files = request.files.getlist('files[]')
    print(files)
    for file in files:
        safe_filename = secure_filename(file.filename)  
        file_path = os.path.join(upload_folder, safe_filename)
    
        file.save(file_path)
        saved_file_paths.append(file_path)

        file_size = os.path.getsize(file_path)

        file_attachment = FileAttachment(file_path=file_path, file_type=file.content_type, file_size=file_size, uploaded_by_id=current_user.id, filename=safe_filename, project_id=project_id, task_id=task_id, created_at=datetime.now())
        db.session.add(file_attachment)
        db.session.commit()


    task = Task.query.get(task_id)
    if task:
        if task.status == 'not_started':
            task.status = 'in_progress'
            try:
                db.session.commit()

                socketio.emit('update_task_status_response', {
                    'status': 'success',
                    'task_id': task.id,
                    'task_status': task.status
                })
                print(f'Task {task.id} status updated to in_progress.')
            except Exception as e:
                db.session.rollback()
                print(f'Failed to update task status: {e}')

                socketio.emit('update_task_status_response', {
                    'status': 'error',
                    'message': 'Failed to update task status.'
                })
    

    return jsonify(file_attachment.to_dict())


@socketio.on('delete_file')
def handle_delete_file(data):
    file_id = data.get('file_id')
    file_attachment = FileAttachment.query.get(file_id)
    
    if not file_attachment:
        socketio.emit('delete_file_response', {'status': 'error', 'message': 'File not found.'})
        return

    try:
        file_path = file_attachment.file_path
        db.session.delete(file_attachment)
        db.session.commit()

        other_files_count = FileAttachment.query.filter_by(file_path=file_path).count()
        if other_files_count == 0:
            os.remove(file_path)

        socketio.emit('delete_file_response', {'status': 'success', 'file_id': file_id})
        print(f'File {file_id} deleted successfully.')
    except Exception as e:
        db.session.rollback()
        socketio.emit('delete_file_response', {'status': 'error', 'message': 'Failed to delete file.'})


@socketio.on('update_task_status')
def handle_update_task_status(data):
    task_id = data.get('task_id')
    new_status = data.get('task_status')

    task = Task.query.get(task_id)
    if not task:
        socketio.emit('update_task_status_response', {'status': 'error', 'message': 'Task not found.'})
        return

    task.status = new_status
    try:
        db.session.commit()
        socketio.emit('update_task_status_response', {
            'status': 'success',
            'task_id': task.id,
            'task_status': task.status
        })
        print(f'Task {task.id} status updated to {task.status}.')
    except Exception as e:
        db.session.rollback()
        print(f'Failed to update task status: {e}')
        socketio.emit('update_task_status_response', {'status': 'error', 'message': 'Failed to update task status.'})

@tasks.route('/get_task/<int:task_id>')
def get_task(task_id):
    task = Task.query.get(task_id)
    if task:
        return jsonify(task.to_dict())
    else:
        return jsonify({})
    

@socketio.on('delete_task')
def handle_delete_task(data):
    task_id = data.get('task_id')
    task = Task.query.get(task_id)
    if not task:
        socketio.emit('delete_task_response', {'status': 'error', 'message': 'Task not found.'})
        return
    try:
        task_files = FileAttachment.query.filter_by(task_id=task_id).all()
        
        for file in task_files:
            db.session.delete(file)
            if FileAttachment.query.filter_by(file_path=file.file_path).count() == 0:
                os.remove(file.file_path)

        db.session.delete(task)
        db.session.commit()
        socketio.emit('delete_task_response', {'status': 'success', 'task_id': task_id})
        print(f'Task {task_id} deleted successfully.')
    except Exception as e:
        db.session.rollback()
        socketio.emit('delete_task_response', {'status': 'error', 'message': 'Failed to delete task.'})
        print(f'Failed to delete task: {e}')