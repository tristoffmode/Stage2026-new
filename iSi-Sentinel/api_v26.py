from flask import Flask, request, jsonify, redirect, url_for, render_template, Response, session, g
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from datetime import datetime, timedelta
import traceback
import logging
import requests
import uuid
import time
from jinja2.exceptions import TemplateNotFound
from functools import wraps
from sqlalchemy import and_, func


# Configurer le logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

server = Flask(__name__)
server.config['SECRET_KEY'] = 'your_secret_key'
server.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://FLASK:iSi_2024@localhost:3306/Domotique'
server.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
server.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30) 
server.config['SESSION_COOKIE_SECURE'] = True  #HTTPS UNIQUEMENT
server.config['SESSION_COOKIE_HTTPONLY'] = True
server.config['SESSION_COOKIE_SAMESITE'] = 'None' 
server.config['SESSION_TYPE'] = 'filesystem'
server.config['SESSION_FILE_DIR'] = '/tmp/flask_session'
server.config['SESSION_KEY_PREFIX'] = 'isi_session_'
server.config['SESSION_USE_SIGNER'] = True

# Activer CORS pour React Native et navigateur
CORS(server, origins=["*"], supports_credentials=True)

db = SQLAlchemy(server)
login_manager = LoginManager(server)
bcrypt = Bcrypt(server)
login_manager.login_view = '/login'

# Modèles de la base de données
class User(UserMixin, db.Model):
    __tablename__ = 'destinataire_email'
    id = db.Column(db.Integer, primary_key=True)
    Nom_Personne = db.Column(db.String(150), nullable=False, unique=True)
    Mot_de_Passe = db.Column(db.String(150), nullable=False)
    ID_Site = db.Column(db.Integer, nullable=False)

class RelevesIoT(db.Model):
    __tablename__ = 'Releves_IoT'
    id = db.Column(db.Integer, primary_key=True)
    Date_Time = db.Column(db.DateTime, nullable=False)
    ID_Site = db.Column(db.Integer, nullable=False)
    ID_Capteur = db.Column(db.Integer, nullable=False)
    Temperature = db.Column(db.Numeric(10, 2), nullable=False)
    TX_Humidite = db.Column(db.Numeric(10, 2), nullable=True)
    Batterie = db.Column(db.Numeric(10, 2), nullable=True)
    rssi = db.Column(db.Numeric(10, 2), nullable=True)

class Site(db.Model):
    __tablename__ = 'site'
    id = db.Column(db.Integer, primary_key=True)
    Nom_Site = db.Column(db.String(150), nullable=False)

class CapteurIoT(db.Model):
    __tablename__ = 'Capteur_IoT'
    id = db.Column(db.Integer, primary_key=True)
    Nom_Capteur = db.Column(db.String(150), nullable=False)
    ID_Site = db.Column(db.Integer, nullable=False)
    ID_EUI = db.Column(db.String(150), nullable=False)
    notif = db.Column(db.Boolean, nullable=False, default=False)
    seuil_temperature = db.Column(db.Numeric(10, 2), nullable=True)

    def get_last_releve(self):
        return RelevesIoT.query.filter_by(ID_Capteur=self.id).order_by(RelevesIoT.Date_Time.desc()).first()

class NotificationSchedule(db.Model):
    __tablename__ = 'notification_schedule'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    capteur_id = db.Column(db.Integer, db.ForeignKey('Capteur_IoT.id'), nullable=False)
    day_of_week = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    capteur = db.relationship('CapteurIoT', backref='schedules')

class CapteurNotes(db.Model):
    __tablename__ = 'capteur_notes'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    capteur_id = db.Column(db.Integer, db.ForeignKey('Capteur_IoT.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    note = db.Column(db.Text, nullable=False)
    capteur = db.relationship('CapteurIoT', backref='notes')

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


class APIError(Exception):
    def __init__(self, message, code='API_ERROR', status=400, details=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.details = details


def api_success(data=None, message='OK', status=200):
    payload = {
        'success': True,
        'message': message,
        'data': data,
        'request_id': getattr(g, 'request_id', None)
    }
    return jsonify(payload), status


def api_error(message, code='API_ERROR', status=400, details=None):
    payload = {
        'success': False,
        'error': {
            'code': code,
            'message': message,
            'details': details
        },
        'request_id': getattr(g, 'request_id', None)
    }
    return jsonify(payload), status


def parse_int(value, field_name, min_value=None, max_value=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise APIError(f'{field_name} doit etre un entier valide', code='INVALID_INPUT', status=400)

    if min_value is not None and parsed < min_value:
        raise APIError(f'{field_name} doit etre >= {min_value}', code='INVALID_INPUT', status=400)
    if max_value is not None and parsed > max_value:
        raise APIError(f'{field_name} doit etre <= {max_value}', code='INVALID_INPUT', status=400)
    return parsed


def parse_time_string(value, field_name):
    try:
        return datetime.strptime(value, "%H:%M").time()
    except (TypeError, ValueError):
        raise APIError(f"{field_name} doit respecter le format HH:MM", code='INVALID_INPUT', status=400)


def get_payload():
    return request.get_json(silent=True) or {}


def get_authenticated_user():
    if current_user.is_authenticated:
        return current_user
    return getattr(g, 'auth_user', None)


def token_or_session_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if current_user.is_authenticated:
            return f(*args, **kwargs)

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return api_error('Authentification requise', code='AUTH_REQUIRED', status=401)

        token = auth_header.split(' ', 1)[1]
        import jwt

        try:
            payload = jwt.decode(token, server.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = payload.get('user_id')
            user = db.session.get(User, user_id)
            if not user:
                return api_error('Utilisateur invalide', code='AUTH_INVALID', status=401)
            g.auth_user = user
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return api_error('Token expire', code='AUTH_EXPIRED', status=401)
        except jwt.InvalidTokenError:
            return api_error('Token invalide', code='AUTH_INVALID', status=401)

    return decorated


@server.before_request
def attach_request_context():
    g.request_id = request.headers.get('X-Request-Id') or str(uuid.uuid4())
    g.request_start_time = time.perf_counter()

    if request.path.startswith('/api/'):
        logging.info(
            "[request_id=%s] %s %s remote=%s",
            g.request_id,
            request.method,
            request.path,
            request.remote_addr
        )


@server.after_request
def log_and_propagate_request_id(response):
    request_id = getattr(g, 'request_id', None)
    if request_id:
        response.headers['X-Request-Id'] = request_id

    if request.path.startswith('/api/'):
        elapsed_ms = int((time.perf_counter() - g.request_start_time) * 1000)
        logging.info(
            "[request_id=%s] completed status=%s duration_ms=%s",
            request_id,
            response.status_code,
            elapsed_ms
        )
    return response

@server.before_request
def check_inactivity():
    if current_user.is_authenticated:
        now = datetime.now()
        
        # Toujours s'assurer que la session est permanente pour les utilisateurs authentifiés
        session.permanent = True
        
        # Mettre à jour le timestamp de dernière activité
        session['last_activity'] = now.isoformat()
        
        # Actualiser le cookie de session à chaque requête pour prolonger sa durée de vie
        if session.get('remember_me', False):
            session.modified = True
            
        # Vérifier le timeout si nécessaire (actuellement commenté)
        # last_activity = session.get('last_activity')
        # if last_activity and now - datetime.fromisoformat(last_activity) > timedelta(minutes=20):
        #     logout_user()
        #     return redirect(url_for('login'))
        

# Routes d'authentification
@server.route('/login', methods=['GET', 'POST'])
def login():
    logging.debug(f"Requête reçue pour /login, méthode: {request.method}")
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        logging.debug(f"Tentative de connexion avec username: {username}")
        user = User.query.filter_by(Nom_Personne=username).first()
        if user and bcrypt.check_password_hash(user.Mot_de_Passe, password):
            login_user(user)
            logging.info(f"Connexion réussie pour {username}")
            return redirect(url_for('index'))
        else:
            logging.warning(f"Échec de connexion pour {username}")
            return render_template('login.html', error='Nom d’utilisateur ou mot de passe incorrect')
    return render_template('login.html')


@server.route('/api/login', methods=['POST'])
def api_login():
    logging.debug(f"Requête reçue pour /api/login")
    username = request.form.get('username')
    password = request.form.get('password')
    remember = request.form.get('remember', '0') == '1'  # Check if remember is '1'
    
    if not username or not password:
        logging.warning("Nom d'utilisateur ou mot de passe manquant")
        return api_error("Nom d'utilisateur et mot de passe requis", code='INVALID_INPUT', status=400)
        
    user = User.query.filter_by(Nom_Personne=username).first()
    
    if user and bcrypt.check_password_hash(user.Mot_de_Passe, password):
        login_user(user, remember=remember)
        
        # Define session expiration based on remember flag
        if remember:
            session.permanent = True
            server.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
            session['remember_me'] = True
        else:
            session.permanent = True
            server.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)
            session['remember_me'] = False
        
        # Generate JWT token with appropriate expiry
        expiry = datetime.now() + timedelta(days=30 if remember else 1)
        token = create_jwt_token(user.id, expiry)
        
        # Mark the session to ensure cookie is set/updated
        session.modified = True
        
        response = jsonify({
            'success': True,
            'message': 'Connexion reussie',
            'user': {'id': user.id, 'username': user.Nom_Personne},
            'token': token,
            'expiresAt': expiry.isoformat(),
            'request_id': getattr(g, 'request_id', None)
        })
        
        return response, 200
    
    logging.warning(f"Échec de connexion API pour {username}")
    return api_error("Nom d'utilisateur ou mot de passe incorrect", code='AUTH_INVALID', status=401)


@server.route('/api/verify-session', methods=['GET'])
@token_or_session_auth_required
def verify_session():
    user = get_authenticated_user()
    if not user:
        return api_error('Authentification requise', code='AUTH_REQUIRED', status=401)

    if current_user.is_authenticated:
        session.modified = True

    return api_success({
        'valid': True,
        'user': {
            'id': user.id,
            'username': user.Nom_Personne
        },
        'sessionExpires': (datetime.now() + server.config['PERMANENT_SESSION_LIFETIME']).isoformat()
    })
    
    
@server.route('/logout')
@login_required
def logout():
    logout_user()
    session.clear()
    return redirect(url_for('login'))

# Routes principales
@server.route('/')
@login_required
def index():
    try:
        return render_template('index.html')
    except TemplateNotFound:
        logging.error("Template index.html introuvable")
        return jsonify({'error': 'Template index.html not found'}), 500

@server.route('/api/releves', methods=['GET'])
@token_or_session_auth_required
def get_releves():
    try:
        capteur_id = parse_int(request.args.get('capteur_id'), 'capteur_id', min_value=1)
        site_id = parse_int(request.args.get('site_id'), 'site_id', min_value=1)
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        # Convertir les dates en objets datetime
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        else:
            start_date = datetime.now() - timedelta(days=7)  # Par défaut: 7 jours en arrière
            
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            # Ajouter un jour à end_date pour inclure toute la journée
            end_date = end_date + timedelta(days=1)
        else:
            end_date = datetime.now() + timedelta(days=1)  # Par défaut: maintenant
            
        # Filtrer les relevés par capteur, site ET dates
        releves = RelevesIoT.query.with_entities(
            RelevesIoT.Date_Time,
            RelevesIoT.Temperature,
            RelevesIoT.TX_Humidite,
            RelevesIoT.Batterie
        ).filter(
            RelevesIoT.ID_Capteur == capteur_id,
            RelevesIoT.ID_Site == site_id,
            RelevesIoT.Date_Time >= start_date,
            RelevesIoT.Date_Time < end_date
        ).order_by(RelevesIoT.Date_Time.asc()).all()
        
        # Si aucun relevé n'est trouvé, retourner un tableau vide au lieu de chercher 
        # des données dans une autre période
        if not releves:
            logging.info(f"Aucun relevé trouvé pour la période {start_date} à {end_date}")
            return api_success([])
            
        data = [
            {
                'Date_Time': releve.Date_Time.strftime('%Y-%m-%d %H:%M:%S'),
                'Temperature': float(releve.Temperature),
                'TX_Humidite': float(releve.TX_Humidite) if releve.TX_Humidite else None,
                'Batterie': float(releve.Batterie) if releve.Batterie else None
            }
            for releve in releves
        ]
        return api_success(data)
    except APIError as api_err:
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des relevés: {str(e)}")
        return api_error('Erreur interne lors de la recuperation des releves', code='INTERNAL_ERROR', status=500)

@server.route('/api/sites', methods=['GET'])
@token_or_session_auth_required
def get_sites():
    try:
        user = get_authenticated_user()
        if not user:
            return api_error('Authentification requise', code='AUTH_REQUIRED', status=401)

        user_name = user.Nom_Personne
        sites = db.session.query(Site).join(User, Site.id == User.ID_Site).filter(User.Nom_Personne == user_name).all()
        data = [{'id': site.id, 'name': site.Nom_Site} for site in sites]
        return api_success(data)
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des sites: {str(e)}")
        return api_error('Erreur interne lors de la recuperation des sites', code='INTERNAL_ERROR', status=500)
    
def create_jwt_token(user_id, expiry):
    # Importer les modules nécessaires
    import jwt
    
    # Créer le payload du token
    payload = {
        'user_id': user_id,
        'exp': expiry,
        'iat': datetime.now()
    }
    
    token = jwt.encode(payload, server.config['SECRET_KEY'], algorithm='HS256')
    return token

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        import jwt
        
        auth_header = request.headers.get('Authorization')
        token = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token manquant'}), 401
        
        try:
            payload = jwt.decode(token, server.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = payload['user_id']
            current_user = User.query.get(user_id)
            
            if not current_user:
                return jsonify({'error': 'Utilisateur invalide'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expiré'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

@server.route('/api/capteurs', methods=['GET'])
@token_or_session_auth_required
def get_capteurs():
    try:
        user = get_authenticated_user()
        if not user:
            return api_error('Authentification requise', code='AUTH_REQUIRED', status=401)

        user_name = user.Nom_Personne
        capteurs_query = db.session.query(CapteurIoT).join(User, CapteurIoT.ID_Site == User.ID_Site).filter(User.Nom_Personne == user_name)
        
        # Vérifier si un ID spécifique est demandé
        capteur_id = request.args.get('id')
        if capteur_id:
            capteurs_query = capteurs_query.filter(CapteurIoT.id == parse_int(capteur_id, 'id', min_value=1))
            logging.info(f"Filtrage des capteurs par ID: {capteur_id}")
        
        site_id = request.args.get('site_id')
        if site_id:
            capteurs_query = capteurs_query.filter(CapteurIoT.ID_Site == parse_int(site_id, 'site_id', min_value=1))
            
        capteurs = capteurs_query.all()
        capteur_ids = [capteur.id for capteur in capteurs]

        last_releves_by_capteur = {}
        if capteur_ids:
            latest_rows_subq = db.session.query(
                RelevesIoT.ID_Capteur.label('capteur_id'),
                func.max(RelevesIoT.Date_Time).label('max_date')
            ).filter(
                RelevesIoT.ID_Capteur.in_(capteur_ids)
            ).group_by(RelevesIoT.ID_Capteur).subquery()

            latest_rows = db.session.query(RelevesIoT).join(
                latest_rows_subq,
                and_(
                    RelevesIoT.ID_Capteur == latest_rows_subq.c.capteur_id,
                    RelevesIoT.Date_Time == latest_rows_subq.c.max_date
                )
            ).all()

            last_releves_by_capteur = {row.ID_Capteur: row for row in latest_rows}

        site_ids = {capteur.ID_Site for capteur in capteurs}
        sites_by_id = {}
        if site_ids:
            sites = db.session.query(Site.id, Site.Nom_Site).filter(Site.id.in_(site_ids)).all()
            sites_by_id = {site.id: site.Nom_Site for site in sites}

        data = []
        for capteur in capteurs:
            last_releve = last_releves_by_capteur.get(capteur.id)
            releve_info = {
                'id': capteur.id,
                'name': capteur.Nom_Capteur,
                'notif': capteur.notif,
                'last_temperature': float(last_releve.Temperature) if last_releve else None,
                'last_humidity': float(last_releve.TX_Humidite) if last_releve and last_releve.TX_Humidite else None,
                'last_date': last_releve.Date_Time.strftime('%Y-%m-%d %H:%M:%S') if last_releve else None,
                'last_minutes_ago': int((datetime.now() - last_releve.Date_Time).total_seconds() // 60) if last_releve else None,
                'site_name': sites_by_id.get(capteur.ID_Site),
                'battery_level': float(last_releve.Batterie) if last_releve and last_releve.Batterie else None,
                'rssi': float(last_releve.rssi) if last_releve and last_releve.rssi else None,
                'seuil_temperature': float(capteur.seuil_temperature) if capteur.seuil_temperature else None,
                'euid': capteur.ID_EUI
            }
            data.append(releve_info)
        return api_success(data)
    except APIError as api_err:
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des capteurs: {str(e)}")
        return api_error('Erreur interne lors de la recuperation des capteurs', code='INTERNAL_ERROR', status=500)

@server.route('/api/toggle_monitoring', methods=['POST'])
@token_or_session_auth_required
def toggle_monitoring():
    try:
        capteur_id = parse_int(request.form.get('capteur_id'), 'capteur_id', min_value=1)
        capteur = CapteurIoT.query.get(capteur_id)
        if not capteur:
            return api_error('Capteur introuvable', code='NOT_FOUND', status=404)
        capteur.notif = not capteur.notif
        db.session.commit()
        return api_success({'notif': capteur.notif}, message='Surveillance mise a jour')
    except APIError as api_err:
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except Exception as e:
        logging.error(f"Erreur lors du toggle monitoring: {e}")
        return api_error('Erreur interne lors de la mise a jour de la surveillance', code='INTERNAL_ERROR', status=500)

@server.route('/api/update_capteur', methods=['POST'])
@token_or_session_auth_required
def update_capteur():
    try:
        payload = get_payload()
        capteur_id = parse_int(payload.get('capteur_id'), 'capteur_id', min_value=1)
        name = payload.get('name')
        seuil_temperature = payload.get('seuil_temperature')
        notif = payload.get('notif')
        days = payload.get('days', [])
        start_time = payload.get('start_time')
        end_time = payload.get('end_time')

        capteur = db.session.get(CapteurIoT, capteur_id)
        if not capteur:
            return api_error('Capteur introuvable', code='NOT_FOUND', status=404)

        if name:
            if not isinstance(name, str) or len(name.strip()) < 2:
                raise APIError('name doit contenir au moins 2 caracteres', code='INVALID_INPUT', status=400)
            capteur.Nom_Capteur = name

        if seuil_temperature is not None and seuil_temperature != '':
            capteur.seuil_temperature = float(seuil_temperature)

        if notif is not None:
            if isinstance(notif, bool):
                capteur.notif = notif
            elif isinstance(notif, str):
                capteur.notif = notif.lower() == 'true'
            else:
                raise APIError('notif doit etre un booleen', code='INVALID_INPUT', status=400)

        db.session.commit()

        if days and start_time and end_time:
            if not isinstance(days, list):
                raise APIError('days doit etre une liste', code='INVALID_INPUT', status=400)
            parsed_start = parse_time_string(start_time, 'start_time')
            parsed_end = parse_time_string(end_time, 'end_time')
            if parsed_start >= parsed_end:
                raise APIError('start_time doit etre inferieur a end_time', code='INVALID_INPUT', status=400)

            for day in days:
                if not isinstance(day, str) or not day.strip():
                    raise APIError('Chaque jour doit etre une chaine non vide', code='INVALID_INPUT', status=400)
                existing_schedule = NotificationSchedule.query.filter_by(capteur_id=capteur_id, day_of_week=day).first()
                if existing_schedule:
                    existing_schedule.start_time = parsed_start
                    existing_schedule.end_time = parsed_end
                else:
                    new_schedule = NotificationSchedule(
                        capteur_id=capteur_id,
                        day_of_week=day,
                        start_time=parsed_start,
                        end_time=parsed_end
                    )
                    db.session.add(new_schedule)
            db.session.commit()

        return api_success({'capteur_id': capteur_id}, message='Capteur et plages horaires mis a jour')
    except APIError as api_err:
        db.session.rollback()
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except Exception as e:
        db.session.rollback()
        logging.error(f"Erreur lors de la mise à jour du capteur: {e}")
        return api_error('Erreur interne lors de la mise a jour du capteur', code='INTERNAL_ERROR', status=500)

@server.route('/api/update_schedule', methods=['POST'])
@token_or_session_auth_required
def update_schedule():
    try:
        capteur_id = parse_int(request.form.get('capteur_id'), 'capteur_id', min_value=1)
        day_of_week = request.form.get('day_of_week')
        start_time_raw = request.form.get('start_time')
        end_time_raw = request.form.get('end_time')
        if not all([day_of_week, start_time_raw, end_time_raw]):
            return api_error('Tous les champs sont requis', code='INVALID_INPUT', status=400)

        start_time = parse_time_string(start_time_raw, 'start_time')
        end_time = parse_time_string(end_time_raw, 'end_time')
        if start_time >= end_time:
            raise APIError('start_time doit etre inferieur a end_time', code='INVALID_INPUT', status=400)

        schedule = NotificationSchedule.query.filter_by(capteur_id=capteur_id, day_of_week=day_of_week).first()
        if schedule:
            schedule.start_time = start_time
            schedule.end_time = end_time
        else:
            new_schedule = NotificationSchedule(
                capteur_id=capteur_id,
                day_of_week=day_of_week,
                start_time=start_time,
                end_time=end_time
            )
            db.session.add(new_schedule)
        db.session.commit()
        return api_success({'capteur_id': capteur_id, 'day_of_week': day_of_week}, message='Planning mis a jour')
    except APIError as api_err:
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except Exception as e:
        logging.error(f"Erreur lors de la mise à jour du planning: {e}")
        return api_error('Erreur interne lors de la mise a jour du planning', code='INTERNAL_ERROR', status=500)

@server.route('/api/update_all_schedules', methods=['POST'])
@token_or_session_auth_required
def update_all_schedules():
    try:
        payload = get_payload()
        capteur_id = parse_int(payload.get('capteur_id'), 'capteur_id', min_value=1)
        schedules = payload.get('schedules')
        if schedules is None:
            return api_error('Liste de planifications requise', code='INVALID_INPUT', status=400)
        if not isinstance(schedules, list):
            return api_error('schedules doit etre une liste', code='INVALID_INPUT', status=400)

        NotificationSchedule.query.filter_by(capteur_id=capteur_id).delete()
        for schedule in schedules:
            jour = schedule.get('jour')
            debut = schedule.get('debut')
            fin = schedule.get('fin')
            if jour and debut and fin:
                parsed_debut = parse_time_string(debut, 'debut')
                parsed_fin = parse_time_string(fin, 'fin')
                if parsed_debut >= parsed_fin:
                    raise APIError('debut doit etre inferieur a fin', code='INVALID_INPUT', status=400)
                new_schedule = NotificationSchedule(
                    capteur_id=capteur_id,
                    day_of_week=jour,
                    start_time=parsed_debut,
                    end_time=parsed_fin
                )
                db.session.add(new_schedule)
        db.session.commit()
        return api_success({'capteur_id': capteur_id}, message='Toutes les planifications ont ete mises a jour')
    except APIError as api_err:
        db.session.rollback()
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except Exception as e:
        db.session.rollback()
        logging.error(f"Erreur lors de la mise à jour des planifications: {e}")
        return api_error('Erreur interne lors de la mise a jour des planifications', code='INTERNAL_ERROR', status=500)

@server.route('/api/get_schedules', methods=['GET'])
@token_or_session_auth_required
def get_schedules():
    try:
        capteur_id = parse_int(request.args.get('capteur_id'), 'capteur_id', min_value=1)
        schedules = NotificationSchedule.query.filter_by(capteur_id=capteur_id).all()
        all_days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        data = []
        for day in all_days:
            schedule = next((s for s in schedules if s.day_of_week == day), None)
            if schedule:
                data.append({
                    'id': schedule.id,
                    'day_of_week': schedule.day_of_week,
                    'start_time': schedule.start_time.strftime('%H:%M'),
                    'end_time': schedule.end_time.strftime('%H:%M')
                })
            else:
                data.append({
                    'day_of_week': day,
                    'start_time': None,
                    'end_time': None,
                    'message': 'Pas de notification'
                })
        return api_success(data)
    except APIError as api_err:
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des plannings: {e}")
        return api_error('Erreur interne lors de la recuperation des plannings', code='INTERNAL_ERROR', status=500)

@server.route('/api/delete_schedule', methods=['POST'])
@token_or_session_auth_required
def delete_schedule():
    try:
        payload = get_payload()
        schedule_id = parse_int(payload.get('schedule_id'), 'schedule_id', min_value=1)
        schedule = NotificationSchedule.query.get(schedule_id)
        if not schedule:
            return api_error('Schedule introuvable', code='NOT_FOUND', status=404)
        db.session.delete(schedule)
        db.session.commit()
        return api_success({'schedule_id': schedule_id}, message='Schedule supprime avec succes')
    except APIError as api_err:
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except Exception as e:
        logging.error(f"Erreur lors de la suppression du planning: {e}")
        return api_error('Erreur interne lors de la suppression du planning', code='INTERNAL_ERROR', status=500)

@server.route('/api/capteur/notes', methods=['GET'])
@token_or_session_auth_required
def get_notes():
    try:
        capteur_id = parse_int(request.args.get('capteur_id'), 'capteur_id', min_value=1)
        notes = CapteurNotes.query.filter_by(capteur_id=capteur_id).order_by(CapteurNotes.timestamp.desc()).all()
        data = [
        {
            'id': note.id,
            'timestamp': note.timestamp.strftime('%Y-%m-%d %H:%M'),
            'note': note.note
        }
        for note in notes
        ]
        return api_success(data)
    except APIError as api_err:
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)

@server.route('/api/capteur/notes', methods=['POST'])
@token_or_session_auth_required
def add_note():
    try:
        data = get_payload()
        capteur_id = parse_int(data.get('capteur_id'), 'capteur_id', min_value=1)
        timestamp = data.get('timestamp')
        note_text = data.get('note')
        if not note_text or not isinstance(note_text, str):
            return api_error('note est requise', code='INVALID_INPUT', status=400)
        if len(note_text.strip()) < 2:
            return api_error('note trop courte', code='INVALID_INPUT', status=400)
        parsed_timestamp = datetime.strptime(timestamp, '%Y-%m-%d %H:%M') if timestamp else datetime.utcnow()

        note = CapteurNotes(capteur_id=capteur_id, timestamp=parsed_timestamp, note=note_text.strip())
        db.session.add(note)
        db.session.commit()
        return api_success({'id': note.id}, message='Note ajoutee avec succes', status=201)
    except APIError as api_err:
        db.session.rollback()
        return api_error(api_err.message, code=api_err.code, status=api_err.status, details=api_err.details)
    except ValueError:
        db.session.rollback()
        return api_error('timestamp doit respecter le format YYYY-MM-DD HH:MM', code='INVALID_INPUT', status=400)
    except Exception:
        db.session.rollback()
        return api_error('Erreur interne lors de la creation de la note', code='INTERNAL_ERROR', status=500)

@server.route('/api/capteur/notes/<int:note_id>', methods=['PUT'])
@token_or_session_auth_required
def update_note(note_id):
    try:
        data = get_payload()
        note_text = data.get('note')
        if not note_text or not isinstance(note_text, str):
            return api_error('note est requise', code='INVALID_INPUT', status=400)

        note = CapteurNotes.query.get(note_id)
        if not note:
            return api_error('Note introuvable', code='NOT_FOUND', status=404)

        note.note = note_text.strip()
        db.session.commit()
        return api_success({'id': note_id}, message='Note mise a jour')
    except Exception:
        db.session.rollback()
        return api_error('Erreur interne lors de la mise a jour de la note', code='INTERNAL_ERROR', status=500)

@server.route('/api/capteur/notes/<int:note_id>', methods=['DELETE'])
@token_or_session_auth_required
def delete_note(note_id):
    try:
        note = CapteurNotes.query.get(note_id)
        if not note:
            return api_error('Note introuvable', code='NOT_FOUND', status=404)
        db.session.delete(note)
        db.session.commit()
        logging.info(f"Note {note_id} supprimée avec succès")
        return api_success({'id': note_id}, message='Note supprimee avec succes')
    except Exception as e:
        db.session.rollback()
        logging.error(f"Erreur lors de la suppression de la note {note_id}: {str(e)}")
        return api_error('Erreur interne lors de la suppression de la note', code='INTERNAL_ERROR', status=500)

@server.route('/api/send_stats_email', methods=['POST'])
@token_or_session_auth_required
def proxy_send_stats_email():
    try:
        data = request.json
        webhook_response = requests.post(
            'http://127.0.0.1:5000/api/send_stats_email',
            json=data
        )
        return Response(
            webhook_response.content,
            status=webhook_response.status_code,
            content_type=webhook_response.headers.get('Content-Type')
        )
    except Exception as e:
        logging.error(f"Erreur lors du proxy vers le webhook: {str(e)}")
        return api_error('Erreur interne lors de lenvoi dumail', code='INTERNAL_ERROR', status=500)

@server.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, APIError):
        return api_error(e.message, code=e.code, status=e.status, details=e.details)

    error_traceback = traceback.format_exc()
    logging.error(f"[request_id={getattr(g, 'request_id', '-')}] ERREUR 500\n{error_traceback}")
    return api_error('Erreur interne du serveur', code='INTERNAL_ERROR', status=500)

if __name__ == '__main__':
    context = ('/etc/letsencrypt/live/iot.is-informatiques.fr/fullchain.pem', '/etc/letsencrypt/live/iot.is-informatiques.fr/privkey.pem')
    logging.info("Démarrage du serveur Flask sur 0.0.0.0:5001")
    server.run(debug=True, host='::', port=5001, ssl_context=context)
    #server.run(debug=True, host='0.0.0.0', port=5001)