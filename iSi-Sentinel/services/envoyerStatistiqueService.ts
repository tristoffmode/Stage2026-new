import axios, { AxiosResponse } from 'axios';
import { Alert } from 'react-native';
import { CapteurService } from './capteurService';
import { getApiMessage, isApiSuccess } from './apiResponse';

/**
 * Service pour l'envoi des statistiques par email aux utilisateurs.
 * 
 * @class
 * @exports EnvoyerStatistiquesService
 * 
 * @description
 * Ce service permet d'envoyer par email les données statistiques d'un capteur
 * sur une période définie. Il utilise l'instance axios du CapteurService pour
 * communiquer avec l'API.
 * 
 * @remarks
 * - Réutilise l'instance axios du CapteurService pour les requêtes HTTP
 * - Gère les différents cas d'erreur et retourne des messages appropriés
 * - Vérifie si des données sont disponibles pour la période sélectionnée
 */

export class EnvoyerStatistiquesService {
	private static axiosInstance = CapteurService.axiosInstance;

	static async envoyerStatistiquesParEmail(params: {
		capteur_id: number | string;
		site_id: number;
		start_date: string;
		end_date: string;
		email: string;
	}): Promise<{ success: boolean; message: string }> {
		try {
			console.log('Envoi des statistiques par email:', params);

			const response: AxiosResponse = await this.axiosInstance.post(
				'/api/send_stats_email',
				params
			);

			console.log('Réponse du serveur:', response.data);

			const message = getApiMessage(response.data) || 'Une erreur est survenue lors de l\'envoi des statistiques par email.';

			if (message.includes('Aucune donnée disponible')) {
				return {
					success: false,
					message: "Aucune donnée disponible pour cette période. Veuillez sélectionner une autre plage de dates."
				};
			}

			if (response.status === 200 && isApiSuccess(response.data)) {
				return {
					success: true,
					message: message || "Les statistiques ont été envoyées par email avec succès."
				};
			}

			return {
				success: false,
				message: message
			};
		} catch (error: any) {
			console.error("Erreur lors de l'envoi des statistiques par email:", error);

			if (error.response) {
				console.error('Réponse d\'erreur:', error.response.data);
				return {
					success: false,
					message: getApiMessage(error.response.data) || `Erreur serveur: ${error.response.status}`
				};
			} else if (error.request) {
				return {
					success: false,
					message: "Aucune réponse du serveur. Veuillez vérifier votre connexion réseau."
				};
			} else {
				return {
					success: false,
					message: error.message || "Une erreur est survenue lors de la préparation de la requête."
				};
			}
		}
	}
}