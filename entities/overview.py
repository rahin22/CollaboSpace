from flask import Blueprint, render_template, redirect, url_for, flash, current_app, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, DateField, SelectField, EmailField
from wtforms.validators import InputRequired, Length, Regexp, EqualTo, ValidationError
from passlib.hash import pbkdf2_sha256
from datetime import date
from dateutil.relativedelta import relativedelta
from database.models import db, User, Role, Organization, Workplace, User_Workplace, Project, Task, EmployeeInfo, Salary, Message, FileAttachment
import os, random
from authlib.integrations.flask_client import OAuth

overview = Blueprint('overview', __name__)

@overview.route('/entry')
@login_required
def entry():
    username = current_user.username
    return render_template('entry.html' , username=username)

