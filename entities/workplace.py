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

wrkplace = Blueprint('wrkplace', __name__)
@wrkplace.route('/workplace/<int:workplace_id>')
@login_required
def adminWorkplace(workplace_id):
    workplace = Workplace.query.filter_by(id=workplace_id).first()
    employees = User_Workplace.query.filter_by(workplace_id=workplace_id).all()
    organization = Organization.query.filter_by(id=workplace.organization_id).first()
    return render_template('adminWorkplace.html', workplace=workplace, employees=employees, organization=organization)