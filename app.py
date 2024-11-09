from flask import Flask, render_template, request
from extensions import socketio
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_socketio import SocketIO, join_room
import os, base64
from authlib.integrations.flask_client import OAuth
from database.models import db, User, Role, Organization, Workplace, User_Workplace, Project, Task, Employee_Info, Salary, Message, FileAttachment, Conversation, ConversationParticipants
from entities.authorise import authorise as auth_bp
from entities.overview import overview as over_bp
from entities.dashboard import dashboard as dash_bp
from entities.workplace import wrkplace as wrk_bp
from entities.messages import messages as msg_bp
from entities.tasks import tasks as task_bp
from datetime import datetime


# Initialize Flask app
app = Flask(__name__)
folderPath = os.path.dirname(os.path.abspath(__file__))
app.config["FOLDER_PATH"] = folderPath
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + folderPath + "/master.db"
app.config["SECRET_KEY"] = 'zR11b652Ue6tMD8SavPNvxk9EFJ5i7jZ'
app.config['GOOGLE_CLIENT_ID'] = '252762485167-mfkbhptap3qmf9ca7p6ld92mvpmpv4ou.apps.googleusercontent.com'
app.config['GOOGLE_CLIENT_SECRET'] = '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'
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True


# Initialize extensions
db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'authorise.login'
socketio.init_app(app) 
oauth = OAuth(app)


# Register OAuth providers
google = oauth.register(
    name='google',
    client_id=app.config['GOOGLE_CLIENT_ID'],
    client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    access_token_url='https://oauth2.googleapis.com/token',
    access_token_params=None,
    refresh_token_url='https://oauth2.googleapis.com/token',
    redirect_uri=None,
    client_kwargs={'scope': 'openid email profile'},
    api_base_url='https://www.googleapis.com/oauth2/v3/', 
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',  
)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.template_filter('b64encode')
def b64encode_filter(s):
    return base64.b64encode(s).decode('utf-8')

@app.route('/')
def index():
    logout_user()
    return render_template('index.html')

@app.route('/aboutus')
def aboutus():
    logout_user()
    return render_template('aboutus.html')

@app.route('/home')
def home():
    logout_user()
    return render_template('index.html')


# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(over_bp)
app.register_blueprint(dash_bp)
app.register_blueprint(wrk_bp)
app.register_blueprint(msg_bp)
app.register_blueprint(task_bp)

# Run the app
if __name__ == '__main__':
    socketio.run(app, debug=True)
