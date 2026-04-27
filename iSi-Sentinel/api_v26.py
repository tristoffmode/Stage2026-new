from flask import Flask, request, jsonify, redirect, url_for, render_template, Response, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from datetime import datetime, timedelta
import traceback
import logging
import requests
from jinja2.exceptions import TemplateNotFound
from functools import wraps


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

@server.before_request
def check_api_auth():
    if request.path.startswith('/api/') and not request.path == '/api/login':
        if not current_user.is_authenticated:
            if request.content_type == 'application/json' or request.headers.get('Accept') == 'application/json':
                return jsonify({'error': 'Not authenticated', 'code': 'AUTH_REQUIRED'}), 401

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
        return jsonify({"error": "Nom d'utilisateur et mot de passe requis"}), 400
        
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
            'user': {'id': user.id, 'username': user.Nom_Personne},
            'token': token,
            'expiresAt': expiry.isoformat()
        })
        
        return response, 200
    
    logging.warning(f"Échec de connexion API pour {username}")
    return jsonify({"error": "Nom d'utilisateur ou mot de passe incorrect"}), 401


@server.route('/api/verify-session', methods=['GET'])
@login_required
def verify_session():
    # Prolonger la session si l'utilisateur est authentifié
    if current_user.is_authenticated:
        # Marquer la session comme modifiée pour renouveler son cookie
        session.modified = True
        
    return jsonify({
        'valid': True, 
        'user': {
            'id': current_user.id, 
            'username': current_user.Nom_Personne
        },
        'sessionExpires': (datetime.now() + server.config['PERMANENT_SESSION_LIFETIME']).isoformat()
    }), 200
    
    
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
@login_required
def get_releves():
    capteur_id = request.args.get('capteur_id')
    if not capteur_id:
        return jsonify({'error': 'Capteur ID is required'}), 400
    site_id = request.args.get('site_id')
    if not site_id:
        return jsonify({'error': 'Site ID is required'}), 400
    
    # Récupérer les dates de début et de fin des paramètres
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    try:
        # Convertir les dates en objets datetime
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        else:
            start_date = datetime.now() - timedelta(days=7)  # Par défaut: 7 jours en arrière

        if end_date_str:
            # Accepter un datetime complet (ISO) ou une date seule
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%dT%H:%M:%S')
            except ValueError:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)
        else:
            end_date = datetime.now()  # Par défaut: maintenant (pas de données futures)
            
        # Filtrer les relevés par capteur, site ET dates
        releves = RelevesIoT.query.filter(
            RelevesIoT.ID_Capteur == capteur_id,
            RelevesIoT.ID_Site == site_id,
            RelevesIoT.Date_Time >= start_date,
            RelevesIoT.Date_Time < end_date
        ).all()
        
        # Si aucun relevé n'est trouvé, retourner un tableau vide au lieu de chercher 
        # des données dans une autre période
        if not releves:
            logging.info(f"Aucun relevé trouvé pour la période {start_date} à {end_date}")
            return jsonify([])
            
        data = [
            {
                'Date_Time': releve.Date_Time.strftime('%Y-%m-%d %H:%M:%S'),
                'Temperature': float(releve.Temperature),
                'TX_Humidite': float(releve.TX_Humidite) if releve.TX_Humidite else None,
                'Batterie': float(releve.Batterie) if releve.Batterie else None
            }
            for releve in releves
        ]
        return jsonify(data)
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des relevés: {str(e)}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/sites', methods=['GET'])
@login_required
def get_sites():
    try:
        user_name = current_user.Nom_Personne
        sites = db.session.query(Site).join(User, Site.id == User.ID_Site).filter(User.Nom_Personne == user_name).all()
        data = [{'id': site.id, 'name': site.Nom_Site} for site in sites]
        return jsonify(data)
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des sites: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
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
@login_required
def get_capteurs():
    try:
        user_name = current_user.Nom_Personne
        capteurs_query = db.session.query(CapteurIoT).join(User, CapteurIoT.ID_Site == User.ID_Site).filter(User.Nom_Personne == user_name)
        
        # Vérifier si un ID spécifique est demandé
        capteur_id = request.args.get('id')
        if capteur_id:
            capteurs_query = capteurs_query.filter(CapteurIoT.id == int(capteur_id))
            logging.info(f"Filtrage des capteurs par ID: {capteur_id}")
        
        site_id = request.args.get('site_id')
        if site_id:
            capteurs_query = capteurs_query.filter(CapteurIoT.ID_Site == site_id)
            
        capteurs = capteurs_query.all()
        data = []
        for capteur in capteurs:
            last_releve = RelevesIoT.query.filter_by(ID_Capteur=capteur.id).order_by(RelevesIoT.Date_Time.desc()).first()
            releve_info = {
                'id': capteur.id,
                'name': capteur.Nom_Capteur,
                'notif': capteur.notif,
                'last_temperature': float(last_releve.Temperature) if last_releve else None,
                'last_humidity': float(last_releve.TX_Humidite) if last_releve and last_releve.TX_Humidite else None,
                'last_date': last_releve.Date_Time.strftime('%Y-%m-%d %H:%M:%S') if last_releve else None,
                'last_minutes_ago': int((datetime.now() - last_releve.Date_Time).total_seconds() // 60) if last_releve else None,
                'site_name': db.session.get(Site, capteur.ID_Site).Nom_Site,
                'battery_level': float(last_releve.Batterie) if last_releve and last_releve.Batterie else None,
                'rssi': float(last_releve.rssi) if last_releve and last_releve.rssi else None,
                'seuil_temperature': float(capteur.seuil_temperature) if capteur.seuil_temperature else None,
                'euid': capteur.ID_EUI
            }
            data.append(releve_info)
        return jsonify(data)
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des capteurs: {str(e)}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/toggle_monitoring', methods=['POST'])
@login_required
def toggle_monitoring():
    try:
        capteur_id = request.form.get('capteur_id')
        if not capteur_id:
            return jsonify({'error': 'Capteur ID is required'}), 400
        capteur = CapteurIoT.query.get(capteur_id)
        if not capteur:
            return jsonify({'error': 'Capteur not found'}), 404
        capteur.notif = not capteur.notif
        db.session.commit()
        return jsonify({'success': True, 'notif': capteur.notif})
    except Exception as e:
        logging.error(f"Erreur lors du toggle monitoring: {e}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/update_capteur', methods=['POST'])
@login_required
def update_capteur():
    try:
        capteur_id = request.json.get('capteur_id')
        name = request.json.get('name')
        seuil_temperature = request.json.get('seuil_temperature')
        notif = request.json.get('notif')
        days = request.json.get('days', [])
        start_time = request.json.get('start_time')
        end_time = request.json.get('end_time')
        if not capteur_id:
            return jsonify({'error': 'ID du capteur requis'}), 400
        capteur = db.session.get(CapteurIoT, capteur_id)
        if not capteur:
            return jsonify({'error': 'Capteur introuvable'}), 404
        if name:
            capteur.Nom_Capteur = name
        if seuil_temperature:
            capteur.seuil_temperature = float(seuil_temperature)
        if notif is not None:
            capteur.notif = (notif.lower() == 'true')
        db.session.commit()
        if days and start_time and end_time:
            for day in days:
                existing_schedule = NotificationSchedule.query.filter_by(capteur_id=capteur_id, day_of_week=day).first()
                if existing_schedule:
                    existing_schedule.start_time = start_time
                    existing_schedule.end_time = end_time
                else:
                    new_schedule = NotificationSchedule(
                        capteur_id=capteur_id,
                        day_of_week=day,
                        start_time=start_time,
                        end_time=end_time
                    )
                    db.session.add(new_schedule)
            db.session.commit()
        return jsonify({'success': True, 'message': 'Capteur et plages horaires mis à jour avec succès'})
    except Exception as e:
        db.session.rollback()
        logging.error(f"Erreur lors de la mise à jour du capteur: {e}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/update_schedule', methods=['POST'])
@login_required
def update_schedule():
    try:
        capteur_id = request.form.get('capteur_id')
        day_of_week = request.form.get('day_of_week')
        start_time = request.form.get('start_time')
        end_time = request.form.get('end_time')
        if not all([capteur_id, day_of_week, start_time, end_time]):
            return jsonify({'error': 'Tous les champs sont requis'}), 400
        schedule = NotificationSchedule.query.filter_by(capteur_id=capteur_id, day_of_week=day_of_week).first()
        if schedule:
            schedule.start_time = datetime.strptime(start_time, "%H:%M").time()
            schedule.end_time = datetime.strptime(end_time, "%H:%M").time()
        else:
            new_schedule = NotificationSchedule(
                capteur_id=capteur_id,
                day_of_week=day_of_week,
                start_time=datetime.strptime(start_time, "%H:%M").time(),
                end_time=datetime.strptime(end_time, "%H:%M").time()
            )
            db.session.add(new_schedule)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Erreur lors de la mise à jour du planning: {e}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/update_all_schedules', methods=['POST'])
@login_required
def update_all_schedules():
    try:
        data = request.json
        capteur_id = data.get('capteur_id')
        schedules = data.get('schedules')
        if not capteur_id:
            return jsonify({'error': 'ID du capteur requis'}), 400
        if schedules is None:
            return jsonify({'error': 'Liste de planifications requise'}), 400
        NotificationSchedule.query.filter_by(capteur_id=capteur_id).delete()
        for schedule in schedules:
            jour = schedule.get('jour')
            debut = schedule.get('debut')
            fin = schedule.get('fin')
            if jour and debut and fin:
                new_schedule = NotificationSchedule(
                    capteur_id=capteur_id,
                    day_of_week=jour,
                    start_time=datetime.strptime(debut, "%H:%M").time(),
                    end_time=datetime.strptime(fin, "%H:%M").time()
                )
                db.session.add(new_schedule)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Toutes les planifications ont été mises à jour'})
    except Exception as e:
        db.session.rollback()
        logging.error(f"Erreur lors de la mise à jour des planifications: {e}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/get_schedules', methods=['GET'])
def get_schedules():
    try:
        capteur_id = request.args.get('capteur_id')
        if not capteur_id:
            return jsonify({'error': 'Capteur ID requis'}), 400
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
        return jsonify(data)
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des plannings: {e}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/delete_schedule', methods=['POST'])
def delete_schedule():
    try:
        schedule_id = request.json.get('schedule_id')
        if not schedule_id:
            return jsonify({'error': 'Schedule ID is required'}), 400
        schedule = NotificationSchedule.query.get(schedule_id)
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Schedule deleted successfully'})
    except Exception as e:
        logging.error(f"Erreur lors de la suppression du planning: {e}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/capteur/notes', methods=['GET'])
def get_notes():
    capteur_id = request.args.get('capteur_id')
    if not capteur_id:
        return jsonify({'error': 'Capteur ID requis'}), 400
    notes = CapteurNotes.query.filter_by(capteur_id=capteur_id).order_by(CapteurNotes.timestamp.desc()).all()
    return jsonify([
        {
            'id': note.id,
            'timestamp': note.timestamp.strftime('%Y-%m-%d %H:%M'),
            'note': note.note
        }
        for note in notes
    ])

@server.route('/api/capteur/notes', methods=['POST'])
def add_note():
    data = request.json
    capteur_id = data.get('capteur_id')
    timestamp = data.get('timestamp')
    note_text = data.get('note')
    if not capteur_id or not note_text:
        return jsonify({'error': 'Données incomplètes'}), 400
    note = CapteurNotes(capteur_id=capteur_id, timestamp=datetime.strptime(timestamp, '%Y-%m-%d %H:%M'), note=note_text)
    db.session.add(note)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Note ajoutée avec succès'})

@server.route('/api/capteur/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    data = request.json
    note_text = data.get('note')
    note = CapteurNotes.query.get(note_id)
    if not note:
        return jsonify({'error': 'Note introuvable'}), 404
    note.note = note_text
    db.session.commit()
    return jsonify({'success': True, 'message': 'Note mise à jour'})

@server.route('/api/capteur/notes/<int:note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    try:
        note = CapteurNotes.query.get(note_id)
        if not note:
            return jsonify({'error': 'Note introuvable'}), 404
        db.session.delete(note)
        db.session.commit()
        logging.info(f"Note {note_id} supprimée avec succès")
        return jsonify({'success': True, 'message': 'Note supprimée avec succès'})
    except Exception as e:
        db.session.rollback()
        logging.error(f"Erreur lors de la suppression de la note {note_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@server.route('/api/send_stats_email', methods=['POST'])
@login_required
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
        return jsonify({'error': str(e)}), 500

@server.errorhandler(Exception)
def handle_exception(e):
    error_traceback = traceback.format_exc()
    logging.error(f"🚨 ERREUR 500 🚨\n{error_traceback}")
    return jsonify({
        "error": str(e),
        "traceback": error_traceback.split("\n")
    }), 500

if __name__ == '__main__':
    context = ('/etc/letsencrypt/live/iot.is-informatiques.fr/fullchain.pem', '/etc/letsencrypt/live/iot.is-informatiques.fr/privkey.pem')
    logging.info("Démarrage du serveur Flask sur 0.0.0.0:5001")
    server.run(debug=True, host='::', port=5001, ssl_context=context)
    #server.run(debug=True, host='0.0.0.0', port=5001)