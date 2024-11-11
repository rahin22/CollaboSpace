from flask import Blueprint, render_template, redirect, url_for, flash, current_app, request, jsonify, abort
from flask_login import login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, DateField, SelectField, EmailField
from wtforms.validators import InputRequired, Length, Regexp, EqualTo, ValidationError
from passlib.hash import pbkdf2_sha256
from datetime import date
from dateutil.relativedelta import relativedelta
from database.models import db, User, Role, Organization, Workplace, User_Workplace, Project, Task, Employee_Info, Salary, Message, FileAttachment, Conversation, ConversationParticipants
import os, random
from authlib.integrations.flask_client import OAuth
from sqlalchemy import distinct, func
from datetime import datetime  


dashboard = Blueprint('dashboard', __name__)


@dashboard.route('/admin_dashboard/<int:organization_id>')
@login_required
def admin_dashboard(organization_id):
    organization = Organization.query.filter_by(id=organization_id).first()
    workplaces = db.session.query(
        Workplace,
        db.func.count(User_Workplace.user_id).label('employee_count')
    ).outerjoin(User_Workplace, User_Workplace.workplace_id == Workplace.id) \
     .filter(Workplace.organization_id == organization_id) \
     .group_by(Workplace.id).all()
    
    employees = Employee_Info.query.filter_by(organization_id=organization_id).all()

    if current_user.id != organization.admin_id:
        abort(403)  
    
    return render_template('admindash.html', organization=organization, workplaces=workplaces, employees=employees)


@dashboard.route('/user_dashboard/<int:organization_id>')
@login_required
def user_dashboard(organization_id):
    organization = Organization.query.filter_by(id=organization_id).first()

    workplaces = db.session.query(
        Workplace,
        db.func.count(distinct(User_Workplace.user_id)).label('employee_count')
    ).join(
        User_Workplace, User_Workplace.workplace_id == Workplace.id
    ).filter(
        Workplace.organization_id == organization_id,
        Workplace.id.in_(
            db.session.query(User_Workplace.workplace_id).filter(
                User_Workplace.user_id == current_user.id
            )
        )
    ).group_by(Workplace.id).all()
    
    employee_ids = [emp.user_id for emp in Employee_Info.query.filter_by(organization_id=organization_id).all()]
    employees = Employee_Info.query.filter_by(organization_id=organization_id).all()

    if current_user.id not in employee_ids:
        abort(403)
        
    return render_template('userDash.html', organization=organization, workplaces=workplaces, employees=employees)


@dashboard.route('/add_workplace/<int:organization_id>', methods=['GET','POST'])
@login_required
def add_workplace(organization_id):
    folderPath = current_app.config['FOLDER_PATH']

    if request.method == 'POST':
        workplace_name = request.form['workplaceName']
        workplace_manager = request.form['workplaceManager']

        file_path = os.path.join(folderPath, 'static', 'assets', 'images', 'defaultWorkplaces')
        random_image = random.choice(os.listdir(file_path))
        image_path = os.path.join('assets', 'images', 'defaultWorkplaces', random_image).replace("\\", "/")

        new_workplace = Workplace(workplace_name=workplace_name, workplace_manager=workplace_manager, organization_id=organization_id, workplace_image=image_path)
        db.session.add(new_workplace)
        db.session.commit()

        add_manager = User_Workplace(user_id=workplace_manager, workplace_id=new_workplace.id)
        db.session.add(add_manager)
        db.session.commit()

        announcements_conversation = Conversation(title='Announcements', workplace_id=new_workplace.id, conversation_type='announcement')
        db.session.add(announcements_conversation)
        db.session.commit()  

        workplace_employees = User_Workplace.query.filter_by(workplace_id=new_workplace.id).all()
        for employee in workplace_employees:
            participant = ConversationParticipants(conversation_id=announcements_conversation.id, user_id=employee.user_id)
            db.session.add(participant)
        
        db.session.commit()

        return redirect(url_for('wrkplace.adminWorkplace', workplace_id=new_workplace.id))


@dashboard.route('/check_workplace/<work_name>/<org_id>')
@login_required
def check_workplace(work_name, org_id):
    work_name_lower = work_name.lower()
    existing_workplace = Workplace.query.filter(func.lower(Workplace.workplace_name) == work_name_lower, Workplace.organization_id == org_id).first()

    if existing_workplace:
        return jsonify({'available': False, 'message': 'Workplace name already exists within this organization'})
    return jsonify({'available': True, 'message': 'Workplace name is available'})


@dashboard.route('/admin_dashboard/employee_management/<int:organization_id>')
@login_required
def employee_management(organization_id):
    organization = Organization.query.filter_by(id=organization_id).first()
    employees = Employee_Info.query.filter_by(organization_id=organization_id).all()

    if current_user.id != organization.admin_id:
        abort(403)  
    
    return render_template('employeeMgmt.html', organization=organization, employees=employees)


@dashboard.route('/admin_dashboard/employee_management/edit_employee/<int:organization_id>', methods=['GET','POST'])
@login_required
def edit_employee(organization_id):
    if request.method == 'POST':
        employee_id = request.form['employee_id']
        position = request.form['position']
        salary = request.form['salary']
        employee = Employee_Info.query.filter_by(id=employee_id).first()
        employee.position = position
        employee.salary = salary
        db.session.commit()
        
        return redirect(url_for('dashboard.employee_management', organization_id=organization_id))
    


@dashboard.route('/user_dashboard/organization_profile/<int:organization_id>')
@login_required
def organization_profile(organization_id):

    organization = Organization.query.get_or_404(organization_id)
    employee_info = Employee_Info.query.filter_by(organization_id=organization_id, user_id=current_user.id).first_or_404()
    managed_workplaces = Workplace.query.filter_by(organization_id=organization_id, workplace_manager=current_user.id).all()
    

    user_workplaces = db.session.query(Workplace)\
        .join(User_Workplace)\
        .filter(
            User_Workplace.user_id == current_user.id,
            Workplace.organization_id == organization_id
        ).all()
    

    assigned_tasks = Task.query\
        .join(Project)\
        .join(Workplace)\
        .filter(
            Workplace.organization_id == organization_id,
            Task.assigned_user_id == current_user.id,
            Task.status != 'completed'
        ).all()
    
    messages_sent = Message.query\
    .join(Conversation)\
    .join(Workplace)\
    .filter(
        Workplace.organization_id == organization_id,
        Message.sender_id == current_user.id
    ).count()

    files_uploaded = FileAttachment.query\
        .join(Message, FileAttachment.message_id == Message.id, isouter=True)\
        .join(Task, FileAttachment.task_id == Task.id, isouter=True)\
        .join(Project)\
        .join(Workplace)\
        .filter(
            Workplace.organization_id == organization_id,
            FileAttachment.uploaded_by_id == current_user.id
        ).count()

    completed_tasks = Task.query\
        .join(Project)\
        .join(Workplace)\
        .filter(
            Workplace.organization_id == organization_id,
            Task.assigned_user_id == current_user.id,
            Task.status == 'completed'
        ).count()
    
    profile_data = {
        'organization': organization,
        'employee_info': {
            'position': employee_info.position,
            'salary': employee_info.salary,
            'date_joined': employee_info.date_of_joining,
        },
        'workplaces': {
            'managed': managed_workplaces,
            'member_of': user_workplaces,
            'total_count': len(managed_workplaces) + len(user_workplaces)
        },
        'tasks': {
            'active': assigned_tasks,
            'active_count': len(assigned_tasks),
            'completed_count': completed_tasks
        },
        'contributions': {
            'messages_sent': messages_sent,
            'files_uploaded': files_uploaded,
            'completed_tasks': completed_tasks,
            'active_tasks_count': len(assigned_tasks)
        },
        'active_tasks': assigned_tasks,
        'user': {
            'name': f"{current_user.first_name} {current_user.last_name}",
            'username': current_user.username,
            'email': current_user.email,
            'pfp': current_user.pfp
        },
        'stats': {
            'days_employed': (datetime.now() - employee_info.date_of_joining).days,
            'workplaces_managed': len(managed_workplaces),
            'total_workplaces': len(user_workplaces)
        }
    }
    
    return render_template('organization_profile.html', profile=profile_data, organization=organization, now=datetime.now())
    



@dashboard.route('/settings/<int:organization_id>')
@login_required
def settings(organization_id):
    organization = Organization.query.get_or_404(organization_id)
    
    return render_template('user_settings.html',  organization=organization)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@dashboard.route('/update_profile/<int:organization_id>', methods=['POST'])
@login_required
def update_profile(organization_id):
    if request.method == 'POST':
        try:
            current_user.username = request.form['username']
            current_user.email = request.form['email']
            current_user.first_name = request.form['first_name']
            current_user.last_name = request.form['last_name']

            if 'profile_picture' in request.files:
                file = request.files['profile_picture']
                if file and allowed_file(file.filename):
                    current_user.pfp = file.read()

            db.session.commit()
            flash('Profile updated successfully', 'success')
        except Exception as e:
            db.session.rollback()
            flash('Error updating profile', 'error')
            
    return redirect(url_for('dashboard.settings', organization_id=organization_id))



@dashboard.route('/update_password/<int:organization_id>', methods=['POST'])
@login_required
def update_password(organization_id):
    if request.method == 'POST':
        if  pbkdf2_sha256.verify(request.form['current_password']):
            if request.form['new_password'] == request.form['confirm_password']:
                current_user.password_hash = pbkdf2_sha256.hash(request.form['new_password'])
                db.session.commit()
                flash('Password updated successfully', 'success')
            else:
                flash('New passwords do not match', 'error')
        else:
            flash('Current password is incorrect', 'error')
    return redirect(url_for('dashboard.settings', organization_id=organization_id))

@dashboard.route('/leave_organization/<int:org_id>', methods=['POST'])
@login_required
def leave_organization(org_id):
    org = Organization.query.get_or_404(org_id)
    if org.admin_id == current_user.id:
        return jsonify({'error': 'Administrators cannot leave their organization'}), 400
    
    employee = Employee_Info.query.filter_by(
        user_id=current_user.id,
        organization_id=org_id
    ).first()
    
    if employee:
        db.session.delete(employee)
        db.session.commit()
        return jsonify({'message': 'Successfully left organization'})
    
    return jsonify({'error': 'User is not a member of this organization'}), 404