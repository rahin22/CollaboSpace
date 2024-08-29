from flask import Flask, render_template, request
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO
import os, base64
from database.models import db, User, Role, Organization, Workplace, User_Workplace, Project, Task, EmployeeInfo, Salary, Message, FileAttachment

# Import your blueprints
from entities.auth import auth as auth_bp


# Initialize Flask app
app = Flask(__name__)
folderPath = os.path.dirname(os.path.abspath(__file__))
app.config["FOLDER_PATH"] = folderPath
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + folderPath + "/master.db"
app.config["SECRET_KEY"] = 'zR11b652Ue6tMD8SavPNvxk9EFJ5i7jZ'
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True


# Initialize extensions
db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'auth.login'
socketio = SocketIO(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return render_template('index.html')

# Register blueprints
app.register_blueprint(auth_bp)


# Run the app
if __name__ == '__main__':
    socketio.run(app, debug=True)
