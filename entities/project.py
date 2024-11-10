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

projects = Blueprint('projects', __name__)


@socketio.on('update_project_status')
def handle_update_project_status(data):
    project_id = data['project_id']
    new_status = data['status']
    project = Project.query.get(project_id)

    if new_status == 'In Progress' and not project.start_date:
        project.start_date = datetime.now()

    if new_status == 'Completed':
        tasks = Task.query.filter_by(project_id=project_id).all()
        for task in tasks:
            task.status = 'completed'
            socketio.emit('task_status_updated', {
                'task_id': task.id,
                'new_status': 'completed'
            })

    
    project.status = new_status
    db.session.commit()
    
    socketio.emit('project_status_updated', {
        'project_id': project_id, 
        'new_status': new_status
    })
    
    print(f'Project {project_id} status updated to {new_status}')


@projects.route('/get_project/<int:project_id>')
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    return jsonify({
        'id': project.id,
        'name': project.project_name,
        'description': project.description,
        'status': project.status,
        'start_date': project.start_date,
        'end_date': project.end_date
    })


@socketio.on('update_project_settings')
def handle_project_settings_update(data):
    try:
        project_id = data.get('project_id')
        project = Project.query.get_or_404(project_id)
        
        project.project_name = data.get('name')
        project.description = data.get('description')
        project.end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d') if data.get('end_date') else None
        
        db.session.commit()
        
    except Exception as e:
        print(f"Error updating project settings: {str(e)}")
        db.session.rollback()
        return {'status': 'error', 'message': str(e)}
    


@socketio.on('delete_project')
def handle_project_deletion(data):
    try:
        project_id = data.get('project_id')
        project = Project.query.get_or_404(project_id)
        workplace_id = project.workplace_id
        
        conversations = Conversation.query.filter_by(project_id=project_id).all()
        for conversation in conversations:
            ConversationParticipants.query.filter_by(conversation_id=conversation.id).delete()
            
            messages = Message.query.filter_by(conversation_id=conversation.id).all()
            for message in messages:
                Reply.query.filter_by(message_id=message.id).delete()
                Reply.query.filter_by(reply_id=message.id).delete()
            
            Message.query.filter_by(conversation_id=conversation.id).delete()
            
        db.session.delete(project)
        db.session.commit()
        
        socketio.emit('project_deleted', {'project_id': project_id, 'workplace_id': workplace_id })
        return {'status': 'success'}
        
    except Exception as e:
        print(f"Error deleting project: {str(e)}")
        db.session.rollback()
        return {'status': 'error', 'message': str(e)}


