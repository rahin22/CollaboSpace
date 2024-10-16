from flask import Blueprint, render_template, redirect, url_for, flash, current_app, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, DateField, SelectField, EmailField
from wtforms.validators import InputRequired, Length, Regexp, EqualTo, ValidationError
from passlib.hash import pbkdf2_sha256
from datetime import date
from dateutil.relativedelta import relativedelta
from database.models import db, User, Role, Organization, Workplace, User_Workplace, Project, Task, Employee_Info, Salary, Message, FileAttachment
import os, random
from authlib.integrations.flask_client import OAuth
from sqlalchemy import func


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
    
    return render_template('admindash.html', organization=organization, workplaces=workplaces, employees=employees)


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
        
        return redirect(url_for('dashboard.admin_dashboard', organization_id=organization_id))


@dashboard.route('/check_workplace/<work_name>/<org_id>')
@login_required
def check_code(work_name, org_id):
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
    
