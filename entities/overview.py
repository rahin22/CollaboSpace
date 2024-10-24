from flask import Blueprint, render_template, redirect, url_for, flash, current_app, request, jsonify
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

overview = Blueprint('overview', __name__)

@overview.route('/entry')
@login_required
def entry():
    userID = current_user.id

    user_employment = Employee_Info.query.filter_by(user_id=userID).all()
    organization_ids = {employment.organization_id for employment in user_employment}
    organizations = Organization.query.filter(Organization.id.in_(organization_ids)).all()
    user_admins = Organization.query.filter_by(admin_id=userID).all()

    return render_template('entry.html', organizations=organizations, user_admins=user_admins)

@overview.route('/create_organization', methods=['GET', 'POST'])
@login_required
def create_organization():
    if request.method == 'POST':
        organization_name = request.form['orgName']
        organization_description = request.form['orgDescription']
        join_code = ''.join(random.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))
        new_organization = Organization(organization_name=organization_name, admin_id=current_user.id, description=organization_description, join_code=join_code)
        db.session.add(new_organization)
        db.session.commit()
    return redirect(url_for('dashboard.admin_dashboard', organization_id=new_organization.id))


@overview.route('/check_organization/<organization_name>')
@login_required
def check_organization(organization_name):
    organization_name = organization_name.lower()
    existing_organization = Organization.query.filter(db.func.lower(Organization.organization_name) == organization_name,Organization.admin_id == current_user.id).first()
     
    if existing_organization:
        return jsonify({'available': False})
    else:
        return jsonify({'available': True})
    

@overview.route('/join_organization', methods=['GET', 'POST'])
@login_required
def join_organization():
    if request.method == 'POST':
        join_code = request.form['joiningCode']
        organization = Organization.query.filter_by(join_code=join_code).first()
        if organization:
           new_employee = Employee_Info(user_id=current_user.id, organization_id=organization.id)
           db.session.add(new_employee)
           db.session.commit()
    return redirect(url_for('overview.entry'))


@overview.route('/check_code/<join_code>')
@login_required
def check_code(join_code):
    get_organization = Organization.query.filter_by(join_code=join_code).first()

    if not get_organization:
        return jsonify({'available': False, 'message': 'Invalid join code'})

    if get_organization.admin_id == current_user.id:
        return jsonify({'available': False, 'message': 'You are the admin of this organization'})

    employee_record = Employee_Info.query.filter_by(user_id=current_user.id, organization_id=get_organization.id).first()
    if employee_record:
        return jsonify({'available': False, 'message': 'You are already a part of this organization'})

    return jsonify({'available': True, 'message': 'Joining code is valid'})

    


