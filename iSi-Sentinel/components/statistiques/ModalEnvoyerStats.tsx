import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStatistiques } from '../../contexts/StatistiquesContext';
import { EnvoyerStatistiquesService } from '../../services/envoyerStatistiqueService';

interface ModalEnvoyerStatsProps {
	visible: boolean;
	setVisible: (visible: boolean) => void;
}

/**
 * Modal pour envoyer les statistiques par email.
 * 
 * @component
 * @param {ModalEnvoyerStatsProps} props - Les propriétés du composant.
 * @returns {React.FC} Composant fonctionnel représentant le modal.
 * 
 * @description
 * Ce composant affiche un modal permettant à l'utilisateur d'envoyer des statistiques
 * par email. L'utilisateur peut sélectionner un capteur, un site, une période, et saisir
 * une adresse email pour l'envoi.
 * 
 * @remarks
 * - Valide l'adresse email avant l'envoi.
 * - Utilise un service API pour envoyer les statistiques.
 * - Gère les erreurs et affiche des messages d'alerte en cas de succès ou d'échec.
 * - Inclut des animations et une gestion de chargement.
 */
const ModalEnvoyerStats: React.FC<ModalEnvoyerStatsProps> = ({ visible, setVisible }) => {
	const { selectedSite, selectedCapteur, capteurs, sites, startDate, endDate } = useStatistiques();

	const [email, setEmail] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	const [emailError, setEmailError] = useState<string | null>(null);

	// Trouver le nom du capteur et du site sélectionnés
	const capteurSelectionne = capteurs.find(c => c.value === selectedCapteur);
	const siteSelectionne = sites.find(s => s.value === selectedSite);

	const fermerModal = () => {
		setVisible(false);
		setEmail('');
		setEmailError(null);
	};

	const validateEmail = (email: string): boolean => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	const envoyerStats = async () => {
		// Valider l'email
		if (!email.trim()) {
			setEmailError('Veuillez saisir une adresse email');
			return;
		}

		if (!validateEmail(email)) {
			setEmailError('Veuillez saisir une adresse email valide');
			return;
		}

		setEmailError(null);
		setLoading(true);

		Alert.alert(
			"Information",
			"L'envoi des statistiques peut prendre plusieurs minutes. Vous pouvez continuer à utiliser l'application pendant ce temps."
		);
		try {
			const result = await EnvoyerStatistiquesService.envoyerStatistiquesParEmail({
				capteur_id: selectedCapteur,
				site_id: parseInt(selectedSite),
				start_date: format(startDate, 'yyyy-MM-dd'),
				end_date: format(endDate, 'yyyy-MM-dd'),
				email: email.trim()
			});

			if (result.success) {
				Alert.alert(
					'Succès',
					result.message,
					[{ text: 'OK', onPress: fermerModal }]
				);
			} else {
				Alert.alert(
					'Information',
					result.message
				);
			}
		} catch (error) {
			console.error("Erreur lors de l'envoi des statistiques:", error);
			Alert.alert(
				'Erreur',
				"Une erreur est survenue lors de l'envoi des statistiques."
			);
		} finally {
			setLoading(false);
		}
	};

	const capteurLabel = selectedCapteur === 'ALL' ?
		'Tous les capteurs' :
		capteurSelectionne?.label || 'Non sélectionné';

	return (
		<Modal
			animationType="slide"
			transparent={true}
			visible={visible}
			onRequestClose={fermerModal}
		>
			<View style={styles.fondModal}>
				<View style={styles.conteneurModal}>
					<TouchableOpacity style={styles.boutonFermer} onPress={fermerModal}>
						<MaterialIcons name="close" size={24} color="#333" />
					</TouchableOpacity>

					<Text style={styles.titreModal}>Envoyer les statistiques par email</Text>

					<View style={styles.conteneurInfos}>
						<Text style={styles.etiquette}>Capteur :</Text>
						<Text style={styles.texteInfo}>{capteurLabel}</Text>
					</View>

					<View style={styles.conteneurInfos}>
						<Text style={styles.etiquette}>Site :</Text>
						<Text style={styles.texteInfo}>{siteSelectionne?.label || 'Non sélectionné'}</Text>
					</View>

					<View style={styles.conteneurInfos}>
						<Text style={styles.etiquette}>Période :</Text>
						<Text style={styles.texteInfo}>
							Du {format(startDate, 'dd/MM/yyyy', { locale: fr })} au {format(endDate, 'dd/MM/yyyy', { locale: fr })}
						</Text>
					</View>

					<Text style={styles.sousTitreSection}>Adresse email</Text>
					<TextInput
						style={[styles.champSaisie, emailError ? styles.champErreur : null]}
						placeholder="Saisir l'adresse email..."
						placeholderTextColor="#8ca5ad"
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{emailError && <Text style={styles.texteErreur}>{emailError}</Text>}

					<View style={styles.boutonsModal}>
						<TouchableOpacity
							style={styles.boutonAnnuler}
							onPress={fermerModal}
							disabled={loading}
						>
							<Text style={styles.texteBouton}>Annuler</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.boutonEnvoyer}
							onPress={envoyerStats}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<Text style={styles.texteBouton}>Envoyer</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	fondModal: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	conteneurModal: {
		width: '90%',
		height: 'auto',
		backgroundColor: 'white',
		borderRadius: 15,
		padding: 20,
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	boutonFermer: {
		position: 'absolute',
		right: 10,
		top: 5,
		zIndex: 10,
	},
	titreModal: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 20,
		textAlign: 'center',
	},
	conteneurInfos: {
		marginBottom: 15,
	},
	etiquette: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 5,
	},
	texteInfo: {
		fontSize: 16,
		color: '#555',
	},
	sousTitreSection: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginTop: 15,
		marginBottom: 10,
	},
	champSaisie: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		color: '#0d0d0d',
		marginBottom: 5,
		backgroundColor: '#f9f9f9',
	},
	champErreur: {
		borderColor: '#d32f2f',
	},
	texteErreur: {
		color: '#d32f2f',
		marginBottom: 10,
		fontSize: 14,
	},
	boutonsModal: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
	},
	boutonAnnuler: {
		backgroundColor: '#ff4d4d',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
		minWidth: 100,
		alignItems: 'center',
	},
	boutonEnvoyer: {
		backgroundColor: '#0a7ea4',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
		minWidth: 100,
		alignItems: 'center',
	},
	texteBouton: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '500',
	},
});

export default ModalEnvoyerStats;