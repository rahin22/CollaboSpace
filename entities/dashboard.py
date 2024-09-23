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
    
    return render_template('admindash.html', organization=organization, workplaces=workplaces)


@dashboard.route('/add_workplace/<int:organization_id>', methods=['GET','POST'])
@login_required
def add_workplace(organization_id):
    if request.method == 'POST':
        workplace_name = request.form['workplaceName']
        new_workplace = Workplace(workplace_name=workplace_name, organization_id=organization_id)
        db.session.add(new_workplace)
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
