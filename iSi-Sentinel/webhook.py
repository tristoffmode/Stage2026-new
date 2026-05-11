from flask import Flask, request, jsonify, abort
from flask_mail import Mail, Message
from flask_sqlalchemy import SQLAlchemy
from flask_apscheduler import APScheduler
from flask_cors import CORS
import os
from datetime import datetime, timedelta
import requests
import json
import locale
import csv
import io
import pandas as pd
import logging
import traceback
from PIL import Image, ImageDraw, ImageFont
import io
import base64
from fpdf import FPDF
import tempfile
from sqlalchemy import Index, inspect, text


# Configurer le logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

# Activer CORS pour React Native et navigateur
CORS(app, supports_credentials=True)

# Configuration de la base de données MariaDB
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://FLASK:iSi_2024@localhost:3306/Domotique'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True

# Configuration de Flask-Mail
app.config['MAIL_SERVER'] = 'ssl0.ovh.net'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'alarme@is-informatiques.fr'
app.config['MAIL_PASSWORD'] = 'Alarme!iSi'
app.config['MAIL_DEFAULT_SENDER'] = 'alarme@is-informatiques.fr'

app.config['EXPECTED_HEADER_VALUE'] = 'jD5dJMHjSQ0ajqEIGFUe2NbSYpQ4wYDJMpWplxdrrkf9EcfG8AGGlNQ97cC6cH0w'

mail = Mail(app)
db = SQLAlchemy(app)

# Configuration de APScheduler pour les tâches périodiques
class Config:
    SCHEDULER_API_ENABLED = True

app.config.from_object(Config())
scheduler = APScheduler()
scheduler.init_app(app)
#scheduler.start()  # Activer le scheduler pour les alertes automatiques

# Middleware pour vérifier l'en-tête spécifique
@app.before_request
def check_for_custom_header():
    if request.endpoint == 'webhook':
        if 'X-AUTH' not in request.headers or request.headers['X-AUTH'] != app.config['EXPECTED_HEADER_VALUE']:
            logging.warning("Requête non autorisée: en-tête X-AUTH invalide ou manquant")
            return jsonify({'error': 'Unauthorized, invalid or missing custom header'}), 401

# Définir la locale pour les jours en français
try:
    locale.setlocale(locale.LC_TIME, "fr_FR.utf8")
except locale.Error:
    logging.warning("Locale fr_FR.utf8 non disponible, utilisation de la locale par défaut")
    locale.setlocale(locale.LC_TIME, "")

# Modèles de base de données
REPORT_MAX_ROWS_PER_SENSOR = 20000


class Site(db.Model):
    __tablename__ = 'site'
    id = db.Column(db.Integer, primary_key=True)
    Nom_Site = db.Column(db.String(255), nullable=False)
    Adresse_Postale = db.Column(db.String(255), nullable=False)
    CP = db.Column(db.String(5), nullable=False)
    Ville = db.Column(db.String(255), nullable=False)

class CapteurIoT(db.Model):
    __tablename__ = 'Capteur_IoT'
    __table_args__ = (
        Index('idx_capteur_site', 'ID_Site'),
    )
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ID_Site = db.Column(db.Integer, db.ForeignKey('site.id'), nullable=False)
    ID_EUI = db.Column(db.String(20), nullable=False)
    Nom_Capteur = db.Column(db.String(255), nullable=False)
    Seuil_Temperature = db.Column(db.Numeric(10, 2), nullable=True)
    notif = db.Column(db.Boolean, default=True, nullable=False)
    last_updated = db.Column(db.DateTime, nullable=False, default=datetime.now)

class RelevesIoT(db.Model):
    __tablename__ = 'Releves_IoT'
    __table_args__ = (
        Index('idx_releves_capteur_site_datetime', 'ID_Capteur', 'ID_Site', 'Date_Time'),
        Index('idx_releves_site_datetime', 'ID_Site', 'Date_Time'),
    )
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Date_Time = db.Column(db.DateTime, nullable=False)
    ID_Site = db.Column(db.Integer, db.ForeignKey('site.id'), nullable=False)
    ID_Capteur = db.Column(db.Integer, db.ForeignKey('Capteur_IoT.id'), nullable=False)
    Temperature = db.Column(db.Numeric(10, 2), nullable=False)
    TX_Humidite = db.Column(db.Numeric(10, 2), nullable=True)
    Batterie = db.Column(db.Numeric(10, 2), nullable=True)
    rssi = db.Column(db.Numeric(10, 2), nullable=True)

class DestinataireEmail(db.Model):
    __tablename__ = 'destinataire_email'
    id = db.Column(db.Integer, primary_key=True)
    ID_Site = db.Column(db.Integer, db.ForeignKey('site.id'), nullable=False)
    Nom_Personne = db.Column(db.String(255), nullable=False)
    Email = db.Column(db.String(255), nullable=False)
    Email2 = db.Column(db.String(255), nullable=True)
    Email3 = db.Column(db.String(255), nullable=True)
    Phone_Number = db.Column(db.String(15), nullable=True)
    Phone_Number2 = db.Column(db.String(15), nullable=True)
    Phone_Number3 = db.Column(db.String(15), nullable=True)

class AlertesEnvoyees(db.Model):
    __tablename__ = 'alertes_envoyees'
    id = db.Column(db.Integer, primary_key=True)
    capteur_id = db.Column(db.Integer, nullable=False)
    date_envoi = db.Column(db.DateTime, nullable=False, default=datetime.now)

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
    __table_args__ = (
        Index('idx_capteur_notes_capteur_timestamp', 'capteur_id', 'timestamp'),
    )
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    capteur_id = db.Column(db.Integer, db.ForeignKey('Capteur_IoT.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now)
    note = db.Column(db.Text, nullable=False)
    capteur = db.relationship('CapteurIoT', backref='notes')


def ensure_performance_indexes():
    required_indexes = {
        'Capteur_IoT': {
            'idx_capteur_site': 'CREATE INDEX idx_capteur_site ON Capteur_IoT (ID_Site)',
        },
        'Releves_IoT': {
            'idx_releves_capteur_site_datetime': (
                'CREATE INDEX idx_releves_capteur_site_datetime '
                'ON Releves_IoT (ID_Capteur, ID_Site, Date_Time)'
            ),
            'idx_releves_site_datetime': (
                'CREATE INDEX idx_releves_site_datetime '
                'ON Releves_IoT (ID_Site, Date_Time)'
            ),
        },
        'capteur_notes': {
            'idx_capteur_notes_capteur_timestamp': (
                'CREATE INDEX idx_capteur_notes_capteur_timestamp '
                'ON capteur_notes (capteur_id, timestamp)'
            ),
        },
    }

    try:
        inspector = inspect(db.engine)
        for table_name, indexes in required_indexes.items():
            existing = {item.get('name') for item in inspector.get_indexes(table_name)}
            for index_name, ddl in indexes.items():
                if index_name in existing:
                    continue
                db.session.execute(text(ddl))
                db.session.commit()
                logging.info('Index cree: %s sur %s', index_name, table_name)
    except Exception as e:
        db.session.rollback()
        logging.warning('Impossible de verifier/creer les indexes webhook: %s', str(e))


with app.app_context():
    ensure_performance_indexes()

# Routes
@app.route('/webhook', methods=['POST'])
def webhook():
    try:
        data = request.get_json()
        if not data:
            logging.error("Aucune donnée JSON reçue dans la requête webhook")
            return jsonify({'error': 'Aucune donnée reçue'}), 400

        # Récupérer les informations du message
        device_eui = data.get('end_device_ids', {}).get('dev_eui')
        decoded_payload = data.get('uplink_message', {}).get('decoded_payload', {})
        new_temperature = decoded_payload.get('TempC_SHT31')
        new_humidity = decoded_payload.get('Hum_SHT31')
        new_battery = decoded_payload.get('BatV')
        rx_metadata = data.get('uplink_message', {}).get('rx_metadata', [])
        new_rssi = rx_metadata[0].get('channel_rssi') if rx_metadata else None
        timestamp = datetime.now()

        if not device_eui or new_temperature is None:
            logging.error(f"Données incomplètes: device_eui={device_eui}, temperature={new_temperature}")
            return jsonify({'error': 'Données incomplètes'}), 400

        # Récupérer le capteur
        capteur = CapteurIoT.query.filter_by(ID_EUI=device_eui).first()
        if not capteur:
            logging.error(f"Capteur non trouvé pour ID_EUI={device_eui}")
            return jsonify({'error': 'Capteur non trouvé'}), 404

        # Mettre à jour la dernière réception
        capteur.last_updated = timestamp
        db.session.commit()

        # Enregistrer le relevé
        releve = RelevesIoT(
            Date_Time=timestamp,
            ID_Site=capteur.ID_Site,
            ID_Capteur=capteur.id,
            Temperature=new_temperature,
            TX_Humidite=new_humidity,
            Batterie=new_battery,
            rssi=new_rssi,
        )
        db.session.add(releve)
        db.session.commit()
        logging.info(f"Relevé enregistré pour capteur {capteur.id}: Temp={new_temperature}°C, Hum={new_humidity}%")

        # Vérifier si la température dépasse le seuil
        is_outside_range = False
        if capteur.Seuil_Temperature is not None:
            if float(new_temperature) > float(capteur.Seuil_Temperature):
                is_outside_range = True

        # Envoyer une alerte si nécessaire
        if is_outside_range and capteur.notif and is_within_schedule(capteur):
            logging.info(f"Alerte déclenchée pour capteur {capteur.id}: Temp={new_temperature}°C, Seuil={capteur.Seuil_Temperature}°C")
            send_alert_email(capteur, new_temperature, new_humidity)
            send_sms(capteur, new_temperature, new_humidity)
        else:
            logging.info(f"Aucune alerte envoyée pour capteur {capteur.id}: hors plage horaire ou notifications désactivées")

        return jsonify({'message': 'Received'}), 200

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erreur dans webhook: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
    
def sanitize_excel_sheet_name(name):
    """Remove characters that are not allowed in Excel sheet names"""
    # Replace invalid characters with underscores
    invalid_chars = ['[', ']', ':', '*', '?', '/', '\\']
    result = name
    for char in invalid_chars:
        result = result.replace(char, '_')
    return result

@app.route('/api/send_stats_email', methods=['POST'])
def send_stats_email():
    try:
        data = request.get_json()
        logging.debug(f"Données reçues pour /api/send_stats_email: {data}")

        required_keys = ['capteur_id', 'site_id', 'start_date', 'end_date', 'email']
        if not all(key in data for key in required_keys):
            logging.error("Paramètres incomplets pour l'envoi des statistiques")
            return jsonify({'success': False, 'message': 'Paramètres incomplets'}), 400

        capteur_id = data['capteur_id']
        site_id = data['site_id']
        email = data['email']

        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d')
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d') + timedelta(days=1)

        site = db.session.get(Site, site_id)
        if not site:
            logging.error(f"Site non trouvé pour ID={site_id}")
            return jsonify({'success': False, 'message': 'Site non trouvé'}), 404

        if capteur_id == 'ALL':
            return send_all_capteurs_stats(site, site_id, start_date, end_date, email)

        capteur = db.session.get(CapteurIoT, capteur_id)
        if not capteur:
            logging.error(f"Capteur non trouvé pour ID={capteur_id}")
            return jsonify({'success': False, 'message': 'Capteur non trouvé'}), 404

        releves = db.session.query(
            RelevesIoT.Date_Time,
            RelevesIoT.Temperature,
            RelevesIoT.TX_Humidite,
            RelevesIoT.Batterie,
            RelevesIoT.rssi
        ).filter(
            RelevesIoT.ID_Capteur == capteur_id,
            RelevesIoT.ID_Site == site_id,
            RelevesIoT.Date_Time >= start_date,
            RelevesIoT.Date_Time < end_date
        ).order_by(RelevesIoT.Date_Time).limit(REPORT_MAX_ROWS_PER_SENSOR + 1).all()

        releves_truncated = len(releves) > REPORT_MAX_ROWS_PER_SENSOR
        if releves_truncated:
            releves = releves[:REPORT_MAX_ROWS_PER_SENSOR]

        notes = db.session.query(
            CapteurNotes.timestamp,
            CapteurNotes.note
        ).filter(
            CapteurNotes.capteur_id == capteur_id,
            CapteurNotes.timestamp >= start_date,
            CapteurNotes.timestamp < end_date
        ).order_by(CapteurNotes.timestamp).limit(REPORT_MAX_ROWS_PER_SENSOR + 1).all()

        notes_truncated = len(notes) > REPORT_MAX_ROWS_PER_SENSOR
        if notes_truncated:
            notes = notes[:REPORT_MAX_ROWS_PER_SENSOR]

        # Générer le DataFrame pour Excel
        df_releves = pd.DataFrame([{
            'Date': r.Date_Time.strftime('%Y-%m-%d'),
            'Heure': r.Date_Time.strftime('%H:%M:%S'),
            'Température (°C)': float(r.Temperature) if r.Temperature else None,
            'Humidité (%)': float(r.TX_Humidite) if r.TX_Humidite else None,
            'Batterie (V)': float(r.Batterie) if r.Batterie else None,
            'RSSI': float(r.rssi) if r.rssi else None
        } for r in releves])

        df_notes = pd.DataFrame([{
            'Date': n.timestamp.strftime('%Y-%m-%d'),
            'Heure': n.timestamp.strftime('%H:%M:%S'),
            'Note': n.note
        } for n in notes])

        # Générer le graphique et sauvegarder temporairement
        img_data = None
        if not df_releves.empty:
            img_data = generate_temperature_plot(releves, capteur)
            img_bytes = base64.b64decode(img_data) if img_data else None

        # PDF : uniquement le graphique
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(0, 10, f"Statistiques du capteur {capteur.Nom_Capteur} - {site.Nom_Site}", ln=True)
        pdf.cell(0, 10, f"Période: {start_date.strftime('%d/%m/%Y')} au {(end_date - timedelta(days=1)).strftime('%d/%m/%Y')}", ln=True)
        pdf.ln(5)

        # Graphique uniquement
        if img_data:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_img:
                tmp_img.write(img_bytes)
                tmp_img.flush()
                pdf.image(tmp_img.name, w=150)
            pdf.ln(10)

        # Générer le fichier Excel (tableaux complets)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp_excel:
            with pd.ExcelWriter(tmp_excel.name, engine='xlsxwriter') as writer:
                df_releves.to_excel(writer, sheet_name='Releves', index=False)
                df_notes.to_excel(writer, sheet_name='Notes', index=False)
            tmp_excel.flush()
            excel_bytes = tmp_excel.read()

        # Générer le PDF en bytes
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
            pdf.output(tmp_pdf.name)
            tmp_pdf.flush()
            pdf_bytes = tmp_pdf.read()

        # Envoyer l'email
        msg = Message(
            subject=f'Statistiques du capteur {capteur.Nom_Capteur} - {site.Nom_Site}',
            recipients=[email]
        )
        truncation_notice = ""
        if releves_truncated or notes_truncated:
            truncation_notice = (
                f"\n\nNote: rapport tronque a {REPORT_MAX_ROWS_PER_SENSOR} lignes maximum "
                "par section pour garantir de bonnes performances."
            )

        msg.body = f"""Bonjour,

Veuillez trouver ci-joint les statistiques du capteur {capteur.Nom_Capteur} du site {site.Nom_Site}.
{truncation_notice}

Cordialement,
I.S. Informatiques
02 79 03 00 27
support@is-informatiques.fr
https://is-informatiques.fr
"""
        # Attacher le PDF (graphique uniquement)
        msg.attach(
            f"stats_{capteur.Nom_Capteur}_{start_date.strftime('%Y%m%d')}_au_{(end_date - timedelta(days=1)).strftime('%Y%m%d')}.pdf",
            "application/pdf",
            pdf_bytes
        )
        # Attacher l'Excel (tableaux complets)
        msg.attach(
            f"stats_{capteur.Nom_Capteur}_{start_date.strftime('%Y%m%d')}_au_{(end_date - timedelta(days=1)).strftime('%Y%m%d')}.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            excel_bytes
        )

        mail.send(msg)
        logging.info(f"Email de statistiques envoyé à {email}")
        return jsonify({'success': True, 'message': 'Statistiques envoyées avec succès'})

    except Exception as e:
        logging.error(f"Erreur dans send_stats_email: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'message': str(e)}), 500



def generate_temperature_plot(releves, capteur):
    """Génère une courbe d'évolution de température avec seuil pour un capteur en utilisant PIL"""
    try:
        if not releves:
            return None
        
        # Paramètres de l'image
        width, height = 1000, 600
        margin = 50
        plot_width = width - 2 * margin
        plot_height = height - 2 * margin
        
        # Créer une image blanche
        img = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(img)
        
        # Essayer de charger une police
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", 12)
            title_font = ImageFont.truetype("DejaVuSans.ttf", 16)
        except IOError:
            font = ImageFont.load_default()
            title_font = ImageFont.load_default()
        
        # Extraire les données
        dates = [r.Date_Time for r in releves]
        temperatures = [float(r.Temperature) for r in releves]
        
        # Calculer les min/max pour les axes
        min_temp = min(temperatures) - 1 if temperatures else 0
        max_temp = max(temperatures) + 1 if temperatures else 50
        
        # Seuil de température
        has_threshold = False
        if hasattr(capteur, 'Seuil_Temperature') and capteur.Seuil_Temperature:
            seuil = float(capteur.Seuil_Temperature)
            has_threshold = True
        elif hasattr(capteur, 'Seuil_Temperature') and capteur.Seuil_Temperature:
            seuil = float(capteur.Seuil_Temperature)
            has_threshold = True
        
        if has_threshold:
            if seuil > max_temp:
                max_temp = seuil + 1
            elif seuil < min_temp:
                min_temp = seuil - 1
        
        # Dessiner les axes
        draw.line([(margin, margin), (margin, height - margin)], fill='black', width=2)  # Axe Y
        draw.line([(margin, height - margin), (width - margin, height - margin)], fill='black', width=2)  # Axe X
        
        # Dessiner le titre
        title = f"Évolution température - {capteur.Nom_Capteur}"
        draw.text((width // 2 - 150, 20), title, font=title_font, fill='black')
        
        # Dessiner les graduations Y
        step = (max_temp - min_temp) / 10
        for i in range(11):
            y = margin + plot_height - (i * plot_height / 10)
            temp = min_temp + i * step
            draw.line([(margin - 5, y), (margin, y)], fill='black', width=1)
            draw.text((margin - 40, y - 7), f"{temp:.1f}°C", font=font, fill='black')
        
        # Dessiner les points et lignes pour chaque date
        if len(dates) > 1:
            scaled_points = []
            # Dessiner quelques repères temporels sur l'axe X
            step = max(1, len(dates) // 10)
            for i in range(0, len(dates), step):
                x = margin + (i * plot_width / (len(dates) - 1))
                y = height - margin
                draw.line([(x, y), (x, y + 5)], fill='black', width=1)
                
                date_str = dates[i].strftime('%d/%m %H:%M')
                draw.text((x - 25, y + 10), date_str, font=font, fill='black')
            
            # Calculer tous les points
            for i, (date, temp) in enumerate(zip(dates, temperatures)):
                x = margin + (i * plot_width / (len(dates) - 1))
                y = margin + plot_height - ((temp - min_temp) * plot_height / (max_temp - min_temp))
                scaled_points.append((x, y))
            
            # Tracer la courbe de température
            for i in range(len(scaled_points) - 1):
                draw.line([scaled_points[i], scaled_points[i+1]], fill='blue', width=2)
                
            # Ajouter des points sur chaque valeur
            for x, y in scaled_points:
                draw.ellipse((x-3, y-3, x+3, y+3), fill='blue', outline='blue')
        
        # Dessiner la ligne de seuil si elle existe
        if has_threshold:
            seuil_y = margin + plot_height - ((seuil - min_temp) * plot_height / (max_temp - min_temp))
            draw.line([(margin, seuil_y), (width - margin, seuil_y)], fill='red', width=2, joint='curve')
            draw.text((width - margin + 10, seuil_y - 10), f"Seuil: {seuil}°C", font=font, fill='red')
        
        # Ajouter les légendes des axes
        draw.text((width // 2, height - 20), "Date", font=font, fill='black')
        draw.text((10, height // 2), "Température (°C)", font=font, fill='black', angle=90)
        
        # Ajouter une légende
        legend_x = width - 200
        legend_y = 60
        
        # Légende pour la température
        draw.line([(legend_x, legend_y), (legend_x + 30, legend_y)], fill='blue', width=2)
        draw.ellipse((legend_x + 15 - 3, legend_y - 3, legend_x + 15 + 3, legend_y + 3), fill='blue', outline='blue')
        draw.text((legend_x + 40, legend_y - 7), "Température", font=font, fill='black')
        
        # Légende pour le seuil
        if has_threshold:
            draw.line([(legend_x, legend_y + 20), (legend_x + 30, legend_y + 20)], fill='red', width=2)
            draw.text((legend_x + 40, legend_y + 13), f"Seuil ({seuil}°C)", font=font, fill='black')
        
        # Sauvegarder l'image en mémoire
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Convertir en base64
        img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        return img_base64
        
    except Exception as e:
        logging.error(f"Erreur lors de la génération de la courbe: {str(e)}")
        return None


def send_all_capteurs_stats(site, site_id, start_date, end_date, email):
    try:
        capteurs = CapteurIoT.query.filter_by(ID_Site=site_id).all()
        if not capteurs:
            return jsonify({'success': False, 'message': 'Aucun capteur trouvé pour ce site'}), 404

        import tempfile
        from fpdf import FPDF

        # Excel multi-onglets (tableaux complets)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp_excel:
            with pd.ExcelWriter(tmp_excel.name, engine='xlsxwriter') as writer:
                # PDF
                pdf = FPDF()
                pdf.set_auto_page_break(auto=True, margin=15)
                for capteur in capteurs:
                    releves = db.session.query(
                        RelevesIoT.Date_Time,
                        RelevesIoT.Temperature,
                        RelevesIoT.TX_Humidite,
                        RelevesIoT.Batterie,
                        RelevesIoT.rssi
                    ).filter(
                        RelevesIoT.ID_Capteur == capteur.id,
                        RelevesIoT.ID_Site == site_id,
                        RelevesIoT.Date_Time >= start_date,
                        RelevesIoT.Date_Time < end_date
                    ).order_by(RelevesIoT.Date_Time).limit(REPORT_MAX_ROWS_PER_SENSOR + 1).all()

                    if len(releves) > REPORT_MAX_ROWS_PER_SENSOR:
                        releves = releves[:REPORT_MAX_ROWS_PER_SENSOR]

                    notes = db.session.query(
                        CapteurNotes.timestamp,
                        CapteurNotes.note
                    ).filter(
                        CapteurNotes.capteur_id == capteur.id,
                        CapteurNotes.timestamp >= start_date,
                        CapteurNotes.timestamp < end_date
                    ).order_by(CapteurNotes.timestamp).limit(REPORT_MAX_ROWS_PER_SENSOR + 1).all()

                    if len(notes) > REPORT_MAX_ROWS_PER_SENSOR:
                        notes = notes[:REPORT_MAX_ROWS_PER_SENSOR]

                    df_releves = pd.DataFrame([{
                        'Date': r.Date_Time.strftime('%Y-%m-%d'),
                        'Heure': r.Date_Time.strftime('%H:%M:%S'),
                        'Température (°C)': float(r.Temperature) if r.Temperature else None,
                        'Humidité (%)': float(r.TX_Humidite) if r.TX_Humidite else None,
                        'Batterie (V)': float(r.Batterie) if r.Batterie else None,
                        'RSSI': float(r.rssi) if r.rssi else None
                    } for r in releves])
                    df_notes = pd.DataFrame([{
                        'Date': n.timestamp.strftime('%Y-%m-%d'),
                        'Heure': n.timestamp.strftime('%H:%M:%S'),
                        'Note': n.note
                    } for n in notes])

                    # Excel : un onglet par capteur (avec assainissement du nom)
                    safe_name = sanitize_excel_sheet_name(capteur.Nom_Capteur[:28])
                    df_releves.to_excel(writer, sheet_name=f"{safe_name}_Releves", index=False)
                    df_notes.to_excel(writer, sheet_name=f"{safe_name}_Notes", index=False)

                    # PDF : une page par capteur, uniquement le graphique
                    pdf.add_page()
                    pdf.set_font("Arial", size=12)
                    pdf.cell(0, 10, f"Capteur : {capteur.Nom_Capteur}", ln=True)
                    pdf.cell(0, 10, f"Période: {start_date.strftime('%d/%m/%Y')} au {(end_date - timedelta(days=1)).strftime('%d/%m/%Y')}", ln=True)
                    pdf.ln(5)

                    # Graphique uniquement
                    img_data = None
                    if not df_releves.empty:
                        img_data = generate_temperature_plot(releves, capteur)
                        img_bytes = base64.b64decode(img_data) if img_data else None
                        if img_bytes:
                            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_img:
                                tmp_img.write(img_bytes)
                                tmp_img.flush()
                                pdf.image(tmp_img.name, w=150)
                            pdf.ln(10)
                    pdf.ln(10)

            tmp_excel.flush()
            excel_bytes = tmp_excel.read()

        # Générer le PDF en bytes
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
            pdf.output(tmp_pdf.name)
            tmp_pdf.flush()
            pdf_bytes = tmp_pdf.read()

        # Envoyer l'email
        msg = Message(
            subject=f'Statistiques de tous les capteurs - {site.Nom_Site}',
            recipients=[email]
        )
        msg.body = f"""Bonjour,

Veuillez trouver ci-joint les statistiques de tous les capteurs du site {site.Nom_Site}.

Cordialement,
I.S. Informatiques
02 79 03 00 27
support@is-informatiques.fr
https://is-informatiques.fr
"""
        # Attacher le PDF (graphiques uniquement)
        msg.attach(
            f"stats_tous_capteurs_{site.Nom_Site}_{start_date.strftime('%Y%m%d')}_au_{(end_date - timedelta(days=1)).strftime('%Y%m%d')}.pdf",
            "application/pdf",
            pdf_bytes
        )
        # Attacher l'Excel (tableaux complets)
        msg.attach(
            f"stats_tous_capteurs_{site.Nom_Site}_{start_date.strftime('%Y%m%d')}_au_{(end_date - timedelta(days=1)).strftime('%Y%m%d')}.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            excel_bytes
        )

        mail.send(msg)
        logging.info(f"Email avec statistiques de tous les capteurs envoyé à {email}")
        return jsonify({
            'success': True,
            'message': f'Statistiques de tous les capteurs ({len(capteurs)}) envoyées avec succès'
        })

    except Exception as e:
        logging.error(f"Erreur dans send_all_capteurs_stats: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'message': str(e)}), 500
    
    
def is_within_schedule(capteur):
    try:
        current_time = datetime.now()
        current_day = current_time.strftime('%A').capitalize()
        schedules = NotificationSchedule.query.filter_by(capteur_id=capteur.id, day_of_week=current_day).all()
        for schedule in schedules:
            if schedule.start_time <= current_time.time() <= schedule.end_time:
                logging.debug(f"Capteur {capteur.id} dans plage horaire: {schedule.day_of_week} {schedule.start_time}-{schedule.end_time}")
                return True
        logging.debug(f"Capteur {capteur.id} hors plage horaire")
        return False
    except Exception as e:
        logging.error(f"Erreur dans is_within_schedule: {str(e)}")
        return False

def send_alert_email(capteur, temperature, humidity):
    try:
        with app.app_context():
            destinataires = DestinataireEmail.query.filter_by(ID_Site=capteur.ID_Site).all()
            site = db.session.get(Site, capteur.ID_Site)
            if not site:
                logging.error(f"Site non trouvé pour capteur {capteur.id}")
                return

            recent_readings = RelevesIoT.query.filter_by(ID_Capteur=capteur.id).order_by(RelevesIoT.Date_Time.desc()).limit(10).all()
            readings_text = "\n".join([f"{r.Date_Time.strftime('%d-%m-%Y %H:%M:%S')}: {r.Temperature} °C, {r.TX_Humidite} %" for r in recent_readings])

            for destinataire in destinataires:
                recipients = [destinataire.Email]
                if destinataire.Email2:
                    recipients.append(destinataire.Email2)
                if destinataire.Email3:
                    recipients.append(destinataire.Email3)

                msg = Message(
                    subject=f'Capteur [{capteur.Nom_Capteur}] : Alerte de température hors plage',
                    recipients=recipients
                )
                msg.body = (
                    f"ALERTE CAPTEUR : [{capteur.Nom_Capteur}] - Température hors plage détectée.\n\n"
                    f"Température: {temperature} °C - Humidité: {humidity} % - {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}\n\n"
                    f"Seuil: {capteur.Seuil_Temperature} °C\n\n"
                    f"10 derniers relevés:\n{readings_text}\n\n"
                    f"https://iot.is-informatiques.fr:8050\n\n"
                    f"Capteur (ID -> {capteur.ID_EUI}) : {capteur.Nom_Capteur}\n\n"
                    f"{site.Nom_Site} ({site.Adresse_Postale} {site.CP} {site.Ville})"
                )
                mail.send(msg)
                logging.info(f"Email d'alerte envoyé pour capteur {capteur.id} à {recipients}")
    except Exception as e:
        logging.error(f"Erreur dans send_alert_email pour capteur {capteur.id}: {str(e)}\n{traceback.format_exc()}")

def send_sms(capteur, temperature, humidity):
    try:
        with app.app_context():
            destinataires = DestinataireEmail.query.filter_by(ID_Site=capteur.ID_Site).all()
            site = db.session.get(Site, capteur.ID_Site)
            if not site:
                logging.error(f"Site non trouvé pour capteur {capteur.id}")
                return

            for destinataire in destinataires:
                recipients = []
                if destinataire.Phone_Number:
                    recipients.append(destinataire.Phone_Number)
                if destinataire.Phone_Number2:
                    recipients.append(destinataire.Phone_Number2)
                if destinataire.Phone_Number3:
                    recipients.append(destinataire.Phone_Number3)

                msg_body = (
                    f"ALERTE CAPTEUR : [{capteur.Nom_Capteur}]  "
                    f"\\#Température: {temperature} °C\\#  {datetime.now().strftime('%d-%m-%Y  %H:%M:%S')}"
                )

                for phone_number in recipients:
                    try:
                        url = "http://192.168.1.28:5000/send_sms"
                        data = {'phone_number': phone_number, 'message': msg_body}
                        response = requests.post(url, json=data, timeout=10)
                        if response.status_code == 200:
                            logging.info(f"SMS envoyé à {phone_number} pour capteur {capteur.id}")
                        else:
                            logging.error(f"Échec envoi SMS à {phone_number}: {response.status_code}")
                    except Exception as e:
                        logging.error(f"Erreur envoi SMS à {phone_number}: {str(e)}")
    except Exception as e:
        logging.error(f"Erreur dans send_sms pour capteur {capteur.id}: {str(e)}\n{traceback.format_exc()}")

def send_inactivity_alert(capteur):
    try:
        with app.app_context():
            destinataires = DestinataireEmail.query.filter_by(ID_Site=capteur.ID_Site).all()
            site = db.session.get(Site, capteur.ID_Site)
            if not site:
                logging.error(f"Site non trouvé pour capteur {capteur.id}")
                return

            for destinataire in destinataires:
                recipients = [destinataire.Email]
                if destinataire.Email2:
                    recipients.append(destinataire.Email2)
                if destinataire.Email3:
                    recipients.append(destinataire.Email3)

                msg = Message(
                    subject=f'Capteur [{capteur.Nom_Capteur}] : Alerte de capteur inactif',
                    recipients=recipients
                )
                msg.body = (
                    f"ALERTE CAPTEUR : [{capteur.Nom_Capteur}] - Aucune donnée reçue depuis plus de 31 minutes.\n\n"
                    f"Capteur (ID -> {capteur.ID_EUI}) : {capteur.Nom_Capteur}\n\n"
                    f"https://iot.is-informatiques.fr:8050\n\n"
                    f"{site.Nom_Site} ({site.Adresse_Postale} {site.CP} {site.Ville})"
                )
                mail.send(msg)
                logging.info(f"Email inactivité envoyé pour capteur {capteur.id} à {recipients}")

            for destinataire in destinataires:
                recipients_sms = []
                if destinataire.Phone_Number:
                    recipients_sms.append(destinataire.Phone_Number)
                if destinataire.Phone_Number2:
                    recipients_sms.append(destinataire.Phone_Number2)
                if destinataire.Phone_Number3:
                    recipients_sms.append(destinataire.Phone_Number3)

                msg_body = (
                    f"ALERTE CAPTEUR : [{capteur.Nom_Capteur}] \\# "
                    f"Aucune donnée reçue depuis plus de 31 minutes.\\#  {datetime.now().strftime('%d-%m-%Y  %H:%M:%S')}"
                )

                for phone_number in recipients_sms:
                    try:
                        url = "https://iot.is-informatiques.fr:5000/send_sms"
                        data = {'phone_number': phone_number, 'message': msg_body}
                        response = requests.post(url, json=data, timeout=10)
                        if response.status_code == 200:
                            logging.info(f"SMS inactivité envoyé à {phone_number} pour capteur {capteur.id}")
                        else:
                            logging.error(f"Échec envoi SMS inactivité à {phone_number}: {response.status_code}")
                    except Exception as e:
                        logging.error(f"Erreur envoi SMS inactivité à {phone_number}: {str(e)}")

            nouvelle_alerte = AlertesEnvoyees(capteur_id=capteur.id)
            db.session.add(nouvelle_alerte)
            db.session.commit()
            logging.info(f"Alerte inactivité enregistrée pour capteur {capteur.id}")

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erreur dans send_inactivity_alert pour capteur {capteur.id}: {str(e)}\n{traceback.format_exc()}")

def check_inactive_sensors():
    try:
        with app.app_context():
            cutoff_time = datetime.now() - timedelta(minutes=31)
            inactive_sensors = CapteurIoT.query.filter(
                CapteurIoT.last_updated < cutoff_time,
                CapteurIoT.notif == True
            ).all()

            logging.info(f"Vérification inactivité: {len(inactive_sensors)} capteurs inactifs détectés")
            for capteur in inactive_sensors:
                recent_alert = AlertesEnvoyees.query.filter_by(capteur_id=capteur.id).order_by(
                    AlertesEnvoyees.date_envoi.desc()).first()
                if recent_alert and (datetime.now() - recent_alert.date_envoi) < timedelta(hours=1):
                    logging.debug(f"Alerte récente pour capteur {capteur.id}, ignorée")
                    continue
                logging.info(f"Envoi alerte inactivité pour capteur {capteur.id}")
                send_inactivity_alert(capteur)

    except Exception as e:
        logging.error(f"Erreur dans check_inactive_sensors: {str(e)}\n{traceback.format_exc()}")

# Planifier la vérification des capteurs inactifs toutes les 31 minutes
if not scheduler.get_job('check_inactive_sensors'):
    scheduler.add_job(
        id='check_inactive_sensors',
        func=check_inactive_sensors,
        trigger='interval',
        minutes=31
    )
    logging.info("Tâche check_inactive_sensors planifiée toutes les 31 minutes")

# Gestion des erreurs globales
@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(f"Erreur non gérée: {str(e)}\n{traceback.format_exc()}")
    return jsonify({'error': str(e), 'traceback': traceback.format_exc().split("\n")}), 500

if __name__ == '__main__':
    logging.info("Démarrage du webhook sur 0.0.0.0:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)