from flask import Blueprint, render_template, redirect, url_for, flash, current_app, request, jsonify, abort
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

wrkplace = Blueprint('wrkplace', __name__)

@wrkplace.route('/workplace/<int:workplace_id>')
@login_required
def adminWorkplace(workplace_id):
    workplace = Workplace.query.filter_by(id=workplace_id).first()
    employees = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
    organization = Organization.query.filter_by(id=workplace.organization_id).first()
    projects = Project.query.filter_by(workplace_id=workplace_id).all()
    
    workplace_users = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
    workplace_user_ids = {uw.user_id for uw in workplace_users}
    all_employees = Employee_Info.query.filter_by(organization_id=organization.id).all()
    non_employees = [employee for employee in all_employees if employee.user_id not in workplace_user_ids]


    if current_user.id != organization.admin_id:
        abort(403)  

    return render_template('adminWorkplace.html', workplace=workplace, employees=employees, organization=organization, projects=projects, non_employees=non_employees)

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

        db.session.commit()

        return redirect(url_for('wrkplace.adminWorkplace', workplace_id=workplace_id))