from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# Users Table
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

    
    organizations = db.relationship('Organization', backref='admin', lazy=True)
    user_workplaces = db.relationship('User_Workplace', backref='user', lazy=True)
    managed_projects = db.relationship('Project', backref='manager', lazy=True)
    messages_sent = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy=True)
    messages_received = db.relationship('Message', foreign_keys='Message.receiver_id', backref='receiver', lazy=True)
    uploaded_files = db.relationship('FileAttachment', backref='uploader', lazy=True)

# Roles Table
class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(50), unique=True, nullable=False)
    permissions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

    user_workplaces = db.relationship('User_Workplace', backref='role', lazy=True)

# Organizations Table
class Organization(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    organization_name = db.Column(db.String(100), unique=True, nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())


    workplaces = db.relationship('Workplace', backref='organization', lazy=True)
    employees = db.relationship('EmployeeInfo', backref='organization', lazy=True)

# Workplaces Table
class Workplace(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    workplace_name = db.Column(db.String(100), nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey('organization.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())


    user_workplaces = db.relationship('User_Workplace', backref='workplace', lazy=True)
    projects = db.relationship('Project', backref='workplace', lazy=True)

# User_Workplaces Table (Associative Table)
class User_Workplace(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    workplace_id = db.Column(db.Integer, db.ForeignKey('workplace.id'), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'), nullable=False)
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
    status = db.Column(db.String(50), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey('user.id'))
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
class EmployeeInfo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    employee_number = db.Column(db.String(50), unique=True)
    department = db.Column(db.String(100))
    position = db.Column(db.String(100))
    salary = db.Column(db.Numeric(10, 2))
    date_of_joining = db.Column(db.DateTime)
    organization_id = db.Column(db.Integer, db.ForeignKey('organization.id'), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

# Salaries Table
class Salary(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.DateTime, nullable=False)
    payment_method = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())

# Messages Table
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now())
    read_status = db.Column(db.Boolean, default=False)

# File Attachments Table
class FileAttachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now())
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())
