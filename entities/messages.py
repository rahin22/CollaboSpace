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




messages = Blueprint('messages', __name__)

upload_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static', 'uploads')
if not os.path.exists(upload_folder):
    os.makedirs(upload_folder)

@socketio.on('send_message')
def handle_send_message(data):
    conversation_id = data['conversation_id']
    content = data['content']
    file_ids = data['file_ids']
    conversation_type = data['conversation_type']
    channel_id = data['channel_id']
    
    message = Message(conversation_id=conversation_id, content=content, sender_id=current_user.id, timestamp=datetime.now())
    db.session.add(message)
    db.session.commit()
    print(file_ids)

    if file_ids:
        for file_id in file_ids:
            file_attachment = FileAttachment.query.get(file_id)
            file_attachment.message_id = message.id

            if conversation_type == 'project':
                file_attachment.project_id = channel_id

            db.session.commit()

    
    socketio.emit('new_message', message.to_dict())



@messages.route('/upload_message_file', methods=['POST'])
def upload_message_file():
    saved_file_paths = []
    attachment_ids = []

    files = request.files.getlist('files[]')
    print(files)
    for file in files:
        safe_filename = secure_filename(file.filename)  
        file_path = os.path.join(upload_folder, safe_filename)
    
        file.save(file_path)
        saved_file_paths.append(file_path)
        file_size = os.path.getsize(file_path)
        file_attachment = FileAttachment(file_path=file_path, file_type=file.content_type, file_size=file_size, uploaded_by_id=current_user.id, filename=safe_filename, created_at=datetime.now())
        db.session.add(file_attachment)
        db.session.commit()
        attachment_ids.append(file_attachment.id)

    return jsonify({'file_ids': attachment_ids})




@socketio.on('join')
def on_join(data):
    room = data['room']  
    join_room(room)
    print(f'User has joined room: {room}')



@socketio.on('new_message')
def handle_new_message(message):
    room = message['conversation_id']  
    socketio.emit('new_message', message, room=room)


@socketio.on('delete_message')
def handle_delete_message(data):
    message_id = data['message_id']
    message = Message.query.get(message_id)
    reactions = Reply.query.filter_by(message_id=message_id, type="reaction").all()
    files = FileAttachment.query.filter_by(message_id=message_id).all()
    for reaction in reactions:
        reaction_message = Message.query.get(reaction.reply_id)
        db.session.delete(reaction_message)
        db.session.delete(reaction)

    for file in files:
        db.session.delete(file)
        all_files = FileAttachment.query.filter_by(file_path=file.file_path).all()
        if all_files == []:
            os.remove(file.file_path)

    db.session.delete(message)  
    db.session.commit()
    
    socketio.emit('message_deleted', message_id)
    print(f'Message {message_id} deleted')



@socketio.on('edit_message')
def handle_edit_message(data):
    message_id = data['message_id']
    content = data['content']
    
    message = Message.query.get(message_id)
    message.content = content
    db.session.commit()
    
    socketio.emit('message_edited', message.to_dict())
    print(f'Message {message_id} edited')


@socketio.on('react_to_message')
def handle_react_to_message(data):
    message_id = data['message_id']
    content = data['content']
    conversation_id = data['conversation_id']

    newMessage = Message(conversation_id=conversation_id, content=content, sender_id=current_user.id, timestamp=None)
    db.session.add(newMessage)
    db.session.commit()

    reply = Reply(message_id=message_id, reply_id=newMessage.id, type='reaction', reaction_type=content)
    db.session.add(reply)
    db.session.commit()

    reaction_data = reply.to_dict()
    reaction_data['sender_id'] = current_user.id
    
    socketio.emit('user_reaction_update', reaction_data, room=conversation_id)
    socketio.emit('message_reacted', reaction_data, room=conversation_id, skip_sid=request.sid)
    print(f'Message {message_id} reacted to: {reaction_data}')



@socketio.on('reaction_deleted')
def handle_reaction_delete(data):
    message_id = data['message_id']
    reaction_message_id = data['reaction_message_id']
    reply_id = data['reply_id']
    conversation_id = data['conversation_id']

    reply = Reply.query.get(reply_id)
    reaction_message = Message.query.get(reaction_message_id)
    db.session.delete(reply)
    db.session.delete(reaction_message)  
    db.session.commit()

    reaction_data = reply.to_dict()
    reaction_data['sender_id'] = current_user.id
    

    socketio.emit('message_reaction_deleted', reaction_data, room=conversation_id)
    print(f'Reaction {reply_id} deleted: {reaction_data}')


@messages.route('/get_message_data/<int:message_id>', methods=['GET'])
def get_message_data(message_id):
    message = Message.query.get(message_id)
    if message is None:
        return jsonify({'error': 'Message not found'}), 404
    return jsonify(message.to_dict())



@socketio.on('send_reply')
def handle_send_reply(data):
    message_id = data['reply_message_id']
    content = data['content']
    conversation_id = data['conversation_id']
    file_ids = data['file_ids']
    conversation_type = data['conversation_type']
    channel_id = data['channel_id']
    

    newMessage = Message(conversation_id=conversation_id, content=content, sender_id=current_user.id, timestamp=datetime.now())
    db.session.add(newMessage)
    db.session.commit()

    reply = Reply(message_id=message_id, reply_id=newMessage.id, type='reply')
    db.session.add(reply)
    db.session.commit()

    if file_ids:
        for file_id in file_ids:
            file_attachment = FileAttachment.query.get(file_id)
            file_attachment.message_id = newMessage.id

            if conversation_type == 'project':
                file_attachment.project_id = channel_id

            db.session.commit()

    reply_data = newMessage.to_dict()
    
    socketio.emit('message_replied', reply_data, room=conversation_id)
    print(f'Message {message_id} replied to')



@socketio.on('delete_reply')
def handle_delete_reply(data):
    message_id = data['message_id']
    message = Message.query.get(message_id)
    get_reply = Reply.query.filter_by(reply_id=message_id).first()
    reactions = Reply.query.filter_by(message_id=message_id, type="reaction").all()
    files = FileAttachment.query.filter_by(message_id=message_id).all()
    for reaction in reactions:
        reaction_message = Message.query.get(reaction.reply_id)
        db.session.delete(reaction_message)
        db.session.delete(reaction)

    for file in files:
        db.session.delete(file)
        all_files = FileAttachment.query.filter_by(file_path=file.file_path).all()
        if all_files == []:
            os.remove(file.file_path)

    db.session.delete(get_reply)
    db.session.delete(message)  
    db.session.commit()

    socketio.emit('message_deleted', message_id)
    print(f'Message {message_id} deleted')

