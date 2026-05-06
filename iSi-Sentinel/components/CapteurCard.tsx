import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import styles from '../styles/CapteurCardStyles';

interface Capteur {
	nom: string;
	temperature: string;
	temperatureMax: string;
	humidite: string;
	duree?: string;
	batterie?: string;
	euid?: string;
	signal?: string;
	statutMail: boolean;
}

interface CapteurCardProps {
	capteur: Capteur;
	index: number;
	metriqueCliquee: string | null;
	gererClicMetrique: (index: number, typeMetrique: string) => void;
	ouvrirModal?: (index: number) => void;
	ouvrirModalNotes?: (index: number) => void; // Nouveau prop pour les notes
	mode: 'affichage' | 'modification';
}

/**
 * Carte représentant un capteur avec ses métriques et actions associées.
 *
 * @component
 * @param {CapteurCardProps} props - Les propriétés du composant.
 * @returns {React.FC} Composant fonctionnel représentant une carte de capteur.
 *
 * @description
 * Ce composant affiche les informations d'un capteur, telles que la température, 
 * l'humidité, la durée, la batterie, et le statut email. Il permet également 
 * d'interagir avec ces métriques via des boutons cliquables.
 *
 * @remarks
 * - Les couleurs des métriques sont dynamiques et dépendent des valeurs des capteurs.
 * - Affiche des infobulles pour les métriques cliquées.
 * - Inclut des actions supplémentaires en fonction du mode (modification ou affichage).
 * - Les capteurs inactifs depuis plus de 300 minutes sont grisés et mis en évidence.
 */

const obtenirCouleurTemperature = (temp: string, seuilTemp: string): string => {
	// Extraire les valeurs numériques (éliminer les unités comme "°C")
	const valeur = parseFloat(temp.replace(/[^\d.-]/g, ''));
	const seuil = parseFloat(seuilTemp.replace(/[^\d.-]/g, ''));

	if (isNaN(valeur) || isNaN(seuil)) return '#00cc00'; // Vert par défaut si les valeurs ne sont pas des nombres

	// Comparer avec le seuil de température
	if (valeur <= seuil - 4) return '#00cc00';           // Vert - température bien en dessous du seuil
	if (valeur <= seuil - 2) return '#8BC34A';           // Vert clair - température sous le seuil mais s'en approche
	if (valeur <= seuil) return '#FFEB3B';               // Jaune - température proche du seuil
	if (valeur <= seuil + 2) return '#ff9900';           // Orange - température légèrement au-dessus du seuil
	return '#ff0000';                                    // Rouge - température bien au-dessus du seuil
};

const obtenirCouleurHumidite = (humidite: string): string => {
	const valeur = parseInt(humidite);
	if (isNaN(valeur)) return '#1e90ff'; // Bleu par défaut si la valeur n'est pas un nombre
	if (valeur <= 20) return '#87CEFA'; // Bleu très clair (SkyBlue)
	if (valeur <= 40) return '#1E90FF'; // Bleu moyen (DodgerBlue)
	if (valeur <= 60) return '#4169E1'; // Bleu royal (RoyalBlue)
	if (valeur <= 80) return '#0000CD'; // Bleu moyen foncé (MediumBlue)
	return '#00008B';                   // Bleu très foncé (DarkBlue) pour > 80%
};

const getBatteryIcon = (batterie: string): string => {
	const valeur = parseFloat(batterie.replace(/[^\d.-]/g, ''));

	if (isNaN(valeur)) return 'battery-unknown'; // Valeur non valide

	if (valeur >= 3.30) return 'battery';      // Maximum pour ces capteurs (100%)
	if (valeur >= 3.10) return 'battery-90';        // Très bonne charge (90%)
	if (valeur >= 3.00) return 'battery-70';        // Bonne charge (70%)
	if (valeur >= 2.70) return 'battery-50';        // Moyenne charge (50%)
	if (valeur >= 2.60) return 'battery-30';        // Faible charge (30%)
	if (valeur >= 2.50) return 'battery-alert';     // Très faible charge - critique (10%)
	return 'battery-unknown';                       // Tension anormalement basse ou erreur
};

const obtenirInfoSignal = (signal: string): { couleur: string; qualification: string } => {
	const valeur = parseFloat(signal.replace(/[^\d.-]/g, ''));

	if (isNaN(valeur)) return { couleur: '#999', qualification: 'inconnu' };

	if (valeur >= -85) return { couleur: '#00cc00', qualification: 'fort' };
	if (valeur >= -100) return { couleur: '#eb9534', qualification: 'moyen' };
	return { couleur: '#ff4d4d', qualification: 'faible' };
};

const estInactif = (duree?: string): boolean => {
	if (!duree) return false;
	const minutes = parseFloat(duree.replace(/[^\d.-]/g, ''));
	return !isNaN(minutes) && minutes > 300;
};

const CapteurCard: React.FC<CapteurCardProps> = ({
	capteur,
	index,
	metriqueCliquee,
	gererClicMetrique,
	ouvrirModal,
	ouvrirModalNotes,
	mode,
}) => {
	const inactif = estInactif(capteur.duree);

	return (
		<View style={[
			styles.carte,
			inactif && {
				opacity: 0.7,
				backgroundColor: '#f0f0f0',
				borderColor: '#ff4d4d',
				borderWidth: 2
			}
		]}>
			{inactif && (
				<View style={styles.avertissementContainer}>
					<MaterialIcons name="warning-amber" size={24} color="#ff4d4d" />
					<Text style={styles.avertissementTexte}>
						Capteur inactif depuis {capteur.duree}
					</Text>
				</View>
			)}
			<Text style={styles.titreCarte}>{capteur.nom}</Text>
			<View style={styles.contenuCarte}>
				<View style={styles.conteneurMetrique}>
					<TouchableOpacity
						style={[styles.metrique, { backgroundColor: obtenirCouleurTemperature(capteur.temperature, capteur.temperatureMax) }]}
						onPress={() => gererClicMetrique(index, 'temperature')}
					>
						<MaterialIcons name="thermostat" size={28} color="#fff" />
						<Text style={styles.texteMetrique}>{capteur.temperature}</Text>
					</TouchableOpacity>
					{metriqueCliquee === `${index}-temperature` && (
						<View style={[styles.infobulle, { top: -40 }]}>
							<Text style={styles.texteInfobulle}>Température</Text>
							<View style={[styles.flecheInfobulle, { bottom: -5 }]} />
						</View>
					)}
				</View>

				<View style={styles.conteneurMetrique}>
					<TouchableOpacity
						style={[styles.metrique, { backgroundColor: '#ff4d4d' }]}
						onPress={() => gererClicMetrique(index, 'temperatureMax')}
					>
						<MaterialCommunityIcons name="thermometer-alert" size={28} color="#fff" />
						<Text style={styles.texteMetrique}>{capteur.temperatureMax}</Text>
					</TouchableOpacity>
					{metriqueCliquee === `${index}-temperatureMax` && (
						<View style={[styles.infobulle, { top: -40 }]}>
							<Text style={styles.texteInfobulle}>Seuil de température</Text>
							<View style={[styles.flecheInfobulle, { bottom: -5 }]} />
						</View>
					)}
				</View>


				<View style={styles.conteneurMetrique}>
					<TouchableOpacity
						style={[styles.metrique, { backgroundColor: obtenirCouleurHumidite(capteur.humidite) }]}
						onPress={() => gererClicMetrique(index, 'humidite')}
					>
						<MaterialIcons name="water-drop" size={28} color="#fff" />
						<Text style={styles.texteMetrique}>{capteur.humidite}</Text>
					</TouchableOpacity>
					{metriqueCliquee === `${index}-humidite` && (
						<View style={[styles.infobulle, { top: -40 }]}>
							<Text style={styles.texteInfobulle}>Humidité</Text>
							<View style={[styles.flecheInfobulle, { bottom: -5 }]} />
						</View>
					)}
				</View>

				{capteur.duree && (
					<View style={styles.conteneurMetrique}>
						<TouchableOpacity
							style={[styles.metrique, {
								backgroundColor: inactif ? '#ff4d4d' : '#615f5f'
							}]}
							onPress={() => gererClicMetrique(index, 'duree')}
						>
							<MaterialIcons
								name={inactif ? "timer-off" : "timer"}
								size={28}
								color="#fff"
							/>
							<Text style={styles.texteMetrique}>{capteur.duree}</Text>
						</TouchableOpacity>
						{metriqueCliquee === `${index}-duree` && (
							<View style={[styles.infobulle, { top: -40 }]}>
								<Text style={styles.texteInfobulle}>Minutes depuis dernier relevé</Text>
								<View style={[styles.flecheInfobulle, { bottom: -5 }]} />
							</View>
						)}
					</View>
				)}

				{capteur.batterie && (
					<View style={styles.conteneurMetrique}>
						<TouchableOpacity
							style={[styles.metrique, { backgroundColor: '#ffbb00' }]}
							onPress={() => gererClicMetrique(index, 'batterie')}
						>
							<MaterialCommunityIcons
								name={getBatteryIcon(capteur.batterie)}
								size={28}
								color="#fff"
							/>
							<Text style={styles.texteMetrique}>{capteur.batterie}</Text>
						</TouchableOpacity>
						{metriqueCliquee === `${index}-batterie` && (
							<View style={[styles.infobulle, { top: -40 }]}>
								<Text style={styles.texteInfobulle}>Batterie</Text>
								<View style={[styles.flecheInfobulle, { bottom: -5 }]} />
							</View>
						)}
					</View>
				)}

				<View style={styles.conteneurMetrique}>
					<TouchableOpacity
						style={[styles.metrique, { backgroundColor: capteur.statutMail ? '#00cc00' : '#ff0000' }]}
						onPress={() => gererClicMetrique(index, 'statutMail')}
					>
						<MaterialIcons name="email" size={28} color="#fff" />
						<Text style={styles.texteMetrique}>{capteur.statutMail ? '✔' : '✖'}</Text>
					</TouchableOpacity>
					{metriqueCliquee === `${index}-statutMail` && (
						<View style={[styles.infobulle, { top: -40 }]}>
							<Text style={styles.texteInfobulle}>Email</Text>
							<View style={[styles.flecheInfobulle, { bottom: -5 }]} />
						</View>
					)}
				</View>
			</View>
			{capteur.euid && (
				<View style={styles.piedCarte}>
					<Text style={styles.textePied}>EUID : {capteur.euid}</Text>
					{capteur.signal && (
						<View style={styles.conteneurSignal}>
							<Text style={styles.textePied}>Signal : </Text>
							{(() => {
								const infoSignal = obtenirInfoSignal(capteur.signal);
								return (
									<View style={styles.signalWrapper}>
										<Text style={[styles.texteSignal, { color: infoSignal.couleur }]}>
											{capteur.signal} dBm
										</Text>
										<Text style={[styles.qualificationSignal, { color: infoSignal.couleur }]}>
											({infoSignal.qualification})
										</Text>
									</View>
								);
							})()}
						</View>
					)}
				</View>
			)}
			{mode === 'modification' && ouvrirModal && (
				<TouchableOpacity style={styles.boutonModifier} onPress={() => ouvrirModal(index)}>
					<Text style={styles.texteBoutonModifier}>Modifier</Text>
				</TouchableOpacity>
			)}

			{mode === 'affichage' && ouvrirModalNotes && (
				<TouchableOpacity style={styles.boutonAjouterNote} onPress={() => ouvrirModalNotes(index)}>
					<MaterialIcons name="note-add" size={20} color="#fff" />
					<Text style={styles.texteBoutonAjouterNote}>Ajouter une note</Text>
				</TouchableOpacity>
			)}
		</View>
	);
};

export default CapteurCard;