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
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import string
from authlib.integrations.flask_client import OAuth




authorise = Blueprint('authorise', __name__)



def generate_pfp(first_name):
    background_color = tuple(random.choices(range(256), k=3))
    image_size = (200, 200)
    
    img = Image.new('RGB', image_size, color=background_color)
    letter = first_name[0].upper()
    draw = ImageDraw.Draw(img)   
    font = ImageFont.truetype("arial.ttf", 100)
    
    text_bbox = draw.textbbox((0, 0), letter, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    vertical_offset = 12

    text_position = ((image_size[0] - text_width) // 2, (image_size[1] - text_height) // 2 - vertical_offset)

    
    draw.text(text_position, letter, fill=(255, 255, 255), font=font)
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return img_io

@authorise.route('/register', methods=['GET', 'POST'])
def register():
    logout_user()
    if request.method == 'POST':
        email = request.form['email']
        first_name = request.form['first_name']
        last_name = request.form['last_name']
        username = request.form['username']
        password = request.form['password']

        pword_hash = pbkdf2_sha256.hash(password)
        pfp = generate_pfp(first_name)
        new_user = User(email=email, first_name=first_name, last_name=last_name, username=username, password_hash=pword_hash, pfp=pfp.read())
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return redirect(url_for('overview.entry'))

    return render_template('register.html')

@authorise.route('/login', methods=['GET', 'POST'])
def login():
    logout_user()
    if request.method == 'POST':
        email_or_username = request.form['email_or_username']
        password = request.form['password']

        if '@' in email_or_username:
            get_user = User.query.filter_by(email=email_or_username).first()
        else:
            get_user = User.query.filter_by(username=email_or_username).first()

        if get_user and pbkdf2_sha256.verify(password, get_user.password_hash):
            login_user(get_user)
            return jsonify({'success': True, 'redirect': url_for('overview.entry')})
        else:
            return jsonify({'success': False, 'message': 'Invalid username or password'})

    return render_template('login.html')




def generate_username(first_name, last_name):
    username_base = f"{first_name[:3].lower()}{last_name[:3].lower()}"
    username = username_base
    
    random_number = random.randint(100, 999)
    username = f"{username}{random_number}"
    
    while User.query.filter_by(username=username).first():
        random_number = random.randint(100, 999)  
        username = f"{username_base}{random_number}"
    return username


@authorise.route('/google_auth')
def google_auth():
    from app import oauth
    redirect_uri = url_for('authorise.google_auth_callback', _external=True)  
    return oauth.google.authorize_redirect(redirect_uri)   


@authorise.route('/google_auth/callback')
def google_auth_callback():
    from app import oauth
    token = oauth.google.authorize_access_token()
    user_info = oauth.google.get('userinfo').json()
    
    email = user_info['email']
    first_name = user_info['given_name']
    last_name = user_info['family_name']
    
    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        login_user(existing_user)  
    else:
        username = generate_username(first_name, last_name)
        pfp = generate_pfp(first_name)
        default_pfp = pfp.read()
        print(default_pfp)

        new_user = User(email=email, first_name=first_name, last_name=last_name, username=username, pfp=default_pfp)
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)  

    return redirect(url_for('overview.entry')) 

@authorise.route('/check_username/<username>')
def check_username(username):
    user = User.query.filter_by(username=username).first()
    if user:
        return jsonify({'available': False})
    else:
        return jsonify({'available': True})
    
@authorise.route('/check_email/<email>')
def check_email(email):
    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({'available': False})
    else:
        return jsonify({'available': True})
    


@authorise.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('authorise.login'))
