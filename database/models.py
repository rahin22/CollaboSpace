from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin
import base64
from sqlalchemy.ext.hybrid import hybrid_property

db = SQLAlchemy()



# Roles Table
class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(50), unique=True, nullable=False)
    permissions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

# Organizations Table
class Organization(db.Model):
    __tablename__ = 'organization' 
    id = db.Column(db.Integer, primary_key=True)
    organization_name = db.Column(db.String(100), unique=True, nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    description = db.Column(db.Text, nullable=True)
    join_code = db.Column(db.String(6), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())


    workplaces = db.relationship('Workplace', backref='organization', lazy=True)
    employees = db.relationship('Employee_Info', backref='organization', lazy=True)

# Workplaces Table
class Workplace(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    workplace_name = db.Column(db.String(100), nullable=False)
    workplace_manager = db.Column(db.Integer, db.ForeignKey('user.id'))
    organization_id = db.Column(db.Integer, db.ForeignKey('organization.id'), nullable=False)
    workplace_image = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

    manager = db.relationship('User', foreign_keys=[workplace_manager], backref='managed_workplaces')
    user_workplaces = db.relationship('User_Workplace', backref='workplace', lazy=True)
    projects = db.relationship('Project', backref='workplace', lazy=True)
    conversations = db.relationship('Conversation', backref='workplace', lazy=True)

# User_Workplaces Table (Associative Table)
class User_Workplace(db.Model):
    __tablename__ = 'user_workplace' 
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    workplace_id = db.Column(db.Integer, db.ForeignKey('workplace.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.now())
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())


# Projects Table
class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    status = db.Column(db.String(50))
    workplace_id = db.Column(db.Integer, db.ForeignKey('workplace.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())


    tasks = db.relationship('Task', backref='project', lazy=True)
    files = db.relationship('FileAttachment', backref='project', lazy=True)

# Tasks Table
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    status = db.Column(db.String(50), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    assigned_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now())

    files = db.relationship('FileAttachment', backref='task', lazy=True)
    def to_dict(self):
        return {
            'id': self.id,
            'task_name': self.task_name,
            'description': self.description,
            'due_date': self.due_date.strftime('%Y-%m-%d %H:%M:%S'),
            'status': self.status,
            'project_id': self.project_id,
            'assigned_user_id': self.assigned_user_id,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            'files': [file.to_dict() for file in self.files]
        }

# Employee Info Table
class Employee_Info(db.Model):
    __tablename__ = 'employee_info' 
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    position = db.Column(db.String(100))
    salary = db.Column(db.Numeric(10, 2))
    date_of_joining = db.Column(db.DateTime, default=datetime.now())
    organization_id = db.Column(db.Integer, db.ForeignKey('organization.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

    user = db.relationship('User', back_populates='employees', foreign_keys=[user_id], lazy='joined')
    


# Salaries Table
class Salary(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.DateTime, nullable=False)
    payment_method = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())


# Conversation Table
class Conversation(db.Model):
    __tablename__ = 'conversation'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=True)
    workplace_id = db.Column(db.Integer, db.ForeignKey('workplace.id'), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=True, unique=True)
    conversation_type = db.Column(db.String(50), nullable=False)  
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Indices for optimization
    __table_args__ = (
        db.Index('idx_conversation_type', 'conversation_type'),
    )

    messages = db.relationship('Message', backref='conversation', lazy=True)
    participants = db.relationship('User', secondary='conversation_participants', backref='conversations', lazy=True)


# Conversation Participants Table
class ConversationParticipants(db.Model):
    __tablename__ = 'conversation_participants'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.now)


# Messages Table
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'), nullable=False)
    content = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.now())
    read_status = db.Column(db.Boolean, default=False)

    replies = db.relationship('Reply', backref='original_message', lazy=True, foreign_keys='Reply.message_id')
    replies_made = db.relationship('Reply', backref='reply_message', lazy=True, foreign_keys='Reply.reply_id')
    attachments = db.relationship('FileAttachment', backref='message', lazy=True)
    
    __table_args__ = (
        db.Index('idx_conversation_id', 'conversation_id'),
    )

    def get_reaction_count(self, reaction_type):
        return sum(1 for reply in self.replies if reply.reaction_type == reaction_type)
    
    @hybrid_property
    def is_reply(self):
        return any(reply.type == 'reply' for reply in self.replies_made)
    

    def to_dict(self):
        replied_to_message = None
        if self.is_reply:
            original_reply = self.replies_made[0]
            
            if original_reply.original_message:
                replied_to_message = {
                    'id': original_reply.message_id,
                    'content': original_reply.original_message.content,
                    'timestamp': original_reply.original_message.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    'user': {
                        'username': original_reply.original_message.sender.username,
                        'pfp': base64.b64encode(original_reply.original_message.sender.pfp).decode('utf-8')
                    }
                }
            else:
                replied_to_message = {
                    'id': None,
                    'content': "The original message has been deleted.",
                    'timestamp': None,
                    'user': {
                        'username': None,
                        'pfp': None
                    }
                }
        
        file_attachments = [
        {
            'id': attachment.id,
            'filename': attachment.filename,
            'file_path': attachment.file_path,
            'file_type': attachment.file_type,
            'file_size': attachment.file_size,
            'uploaded_by_id': attachment.uploaded_by_id,
            'project_id': attachment.project_id,
            'task_id': attachment.task_id,
            'created_at': attachment.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': attachment.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        } for attachment in self.attachments
    ]
        
        return {
            'id': self.id,
            'content': self.content,
            'conversation_id': self.conversation_id,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'is_reply': self.is_reply, 
            'user': {
                'username': self.sender.username,
                'pfp': base64.b64encode(self.sender.pfp).decode('utf-8')
            },
            'replied_to': replied_to_message, 
            'replies': [
                {
                    'id': reply.id,
                    'message_id': reply.message_id,
                    'reply_id': reply.reply_id,
                    'type': reply.type,
                    'reaction_type': reply.reaction_type,
                    'reaction_counts': {
                        reaction: sum(1 for r in self.replies if r.reaction_type == reaction)
                        for reaction in set(r.reaction_type for r in self.replies if r.reaction_type)
                    },
                    'user': {
                        'user_id': reply.reply_message.sender.id,
                    }
                } for reply in self.replies
            ],
            'file_attachments': file_attachments
        }
    
    
class Reply(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'))
    reply_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False) 
    reaction_type = db.Column(db.String(20), nullable=True)  

    __table_args__ = (
        db.Index('idx_message_reply', 'message_id', 'reply_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'reply_id': self.reply_id,
            'type': self.type,
            'reaction_type': self.reaction_type
        }


# File Attachments Table
class FileAttachment(db.Model):
    __tablename__ = 'file_attachment'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    file_size = db.Column(db.Integer)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'uploaded_by_id': self.uploaded_by_id,
            'project_id': self.project_id,
            'task_id': self.task_id,
            'message_id': self.message_id,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            'user': {
                'username': self.uploader.username,
            }
        }




# Users Table
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    pfp = db.Column(db.LargeBinary)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

    
    organizations = db.relationship('Organization', backref='admin', lazy=True)
    user_workplaces = db.relationship('User_Workplace', backref='user', lazy=True)
    messages_sent = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy=True)
    uploaded_files = db.relationship('FileAttachment', backref='uploader', lazy=True)
    employees = db.relationship('Employee_Info', back_populates='user', foreign_keys=[Employee_Info.user_id], lazy='dynamic')