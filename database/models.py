from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin
import base64

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
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

    
    files = db.relationship('FileAttachment', backref='task', lazy=True)

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
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now())
    read_status = db.Column(db.Boolean, default=False)

    attachments = db.relationship('FileAttachment', backref='message', lazy=True)
    
    __table_args__ = (
        db.Index('idx_conversation_id', 'conversation_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'conversation_id': self.conversation_id,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'user': {
                'username': self.sender.username,
                'pfp': base64.b64encode(self.sender.pfp).decode('utf-8')  
            }
        }
    

class Reply(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
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
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)




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